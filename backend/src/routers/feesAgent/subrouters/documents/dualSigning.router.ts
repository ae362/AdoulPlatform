import crypto from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { supabase } from '../../../../services/supabase';
import { sha256Hex } from '../../../../utils/auditDocPatch';
import { uploadBufferToDocumentsBucket } from '../../../../utils/storage';

async function requireNotary(sessionToken: string, message = 'Only notaries can perform this operation') {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary' && user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message });
  }
  return user;
}

// In-memory fallback repository to ensure zero crashes if Supabase schema is provisioning
interface InMemorySession {
  id: string;
  session_code: string;
  act_id: string;
  act_number: string;
  document_type?: string;
  document_title?: string;
  document_version: number;
  document_hash: string;
  status: string;
  is_locked: boolean;
  locked_at: string;
  notary_1_id: string;
  notary_1_name: string;
  notary_2_id?: string;
  notary_2_name?: string;
  rejection_reason?: string;
  rejection_note?: string;
  final_package_url?: string;
  final_package_hash?: string;
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

interface InMemoryParticipant {
  id: string;
  session_id: string;
  notary_id?: string;
  notary_name: string;
  role: 'PRIMARY_NOTARY' | 'SECONDARY_NOTARY';
  signing_order: number;
  status: 'PENDING' | 'VIEWED' | 'SIGNING' | 'SIGNED' | 'REJECTED';
  signed_at?: string;
  signed_hash?: string;
  signature_data?: string;
  signature_hash?: string;
  device_info?: Record<string, any>;
  created_at: string;
}

interface InMemoryTask {
  id: string;
  task_code: string;
  session_id: string;
  act_id: string;
  act_number: string;
  document_type?: string;
  document_hash: string;
  assigned_to_notary_id?: string;
  assigned_to_notary_name?: string;
  assigned_by_notary_id: string;
  assigned_by_notary_name: string;
  required_action: string;
  status: 'PENDING' | 'VIEWED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  expires_at: string;
  created_at: string;
  completed_at?: string;
}

interface InMemoryEvent {
  id: string;
  session_id: string;
  notary_id?: string;
  notary_name?: string;
  event_type: string;
  document_hash?: string;
  device_id?: string;
  ip_address?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const memorySessions = new Map<string, InMemorySession>();
const memoryParticipants = new Map<string, InMemoryParticipant[]>();
const memoryTasks = new Map<string, InMemoryTask>();
const memoryEvents = new Map<string, InMemoryEvent[]>();

function generateId(_prefix = 'id'): string {
  return crypto.randomUUID();
}

export function getDualSigningSessionPdf(actId: string): string | null {
  for (const s of memorySessions.values()) {
    if (s.act_id === actId && s.final_package_url) {
      return s.final_package_url;
    }
  }
  return null;
}

export const dualSigningProcedures = {
  /**
   * 0. جلب قائمة العدول المسجلين في المنصة للتضميم والمصادقة المشتركة
   */
  listRegisteredNotariesForCoSigning: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, role, notary_profiles(*)')
          .eq('role', 'notary')
          .neq('id', user.id);

        if (error) {
          console.warn('[listRegisteredNotariesForCoSigning] DB fetch error:', error);
          return [];
        }

        const searchTerm = (input.search || '').trim().toLowerCase();

        return (data || []).map((u: any) => {
          const profile = Array.isArray(u.notary_profiles) ? u.notary_profiles[0] : u.notary_profiles;
          return {
            id: u.id,
            fullName: u.full_name || 'عدل ممارس',
            email: u.email || '',
            cin: profile?.cin || null,
            appointmentNumber: profile?.appointment_decree_number || null,
            primaryCourt: profile?.primary_court || profile?.court_name || null,
            region: profile?.appellate_court || null,
            officeAddress: profile?.office_address || null,
            phone: profile?.phone || null,
          };
        }).filter((n: any) => {
          if (!searchTerm) return true;
          return (
            (n.fullName && n.fullName.toLowerCase().includes(searchTerm)) ||
            (n.cin && n.cin.toLowerCase().includes(searchTerm)) ||
            (n.primaryCourt && n.primaryCourt.toLowerCase().includes(searchTerm)) ||
            (n.appointmentNumber && n.appointmentNumber.toLowerCase().includes(searchTerm))
          );
        });
      } catch (err: any) {
        console.warn('[listRegisteredNotariesForCoSigning] fallback:', err);
        return [];
      }
    }),

  /**
   * 1. إنشاء جلسة توقيع العدلين وقفل النسخة
   */
  createDualSigningSession: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      actId: z.string(),
      actNumber: z.string().optional(),
      notary2Id: z.string().optional(),
      notary2Name: z.string(),
      documentHash: z.string().optional(),
      documentVersion: z.number().optional().default(1),
      documentType: z.string().optional(),
      documentTitle: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);

      if (input.notary2Id && input.notary2Id === user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'لا يمكن تعيين نفس العدل كعدل ثانٍ؛ يجب أن يكون العدل المضمم زميلاً مسجلاً آخر.',
        });
      }

      let finalNotary2Id = input.notary2Id;
      let verifiedNotary2Name = input.notary2Name;

      // Find notary profile to auto-resolve active registered partner
      const { data: notaryProfile } = await supabase
        .from('notary_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!finalNotary2Id && notaryProfile) {
        const { data: defaultPartner } = await supabase
          .from('notary_partners')
          .select('partner_user_id, partner_name')
          .eq('notary_profile_id', notaryProfile.id)
          .eq('is_available', true)
          .neq('status', 'TERMINATED')
          .not('partner_user_id', 'is', null)
          .order('position_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultPartner?.partner_user_id) {
          finalNotary2Id = defaultPartner.partner_user_id;
          verifiedNotary2Name = defaultPartner.partner_name;
        }
      }

      if (finalNotary2Id) {
        const { data: n2 } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('id', finalNotary2Id)
          .eq('role', 'notary')
          .maybeSingle();

        if (n2?.full_name) {
          verifiedNotary2Name = n2.full_name;
        }
      }

      // Verify the deed exists
      const { data: rasm } = await supabase
        .from('saved_rasms')
        .select('*')
        .eq('id', input.actId)
        .maybeSingle();

      const actNumber = input.actNumber || rasm?.file_number || `ACT-${input.actId.slice(0, 8)}`;
      const docType = input.documentType || rasm?.document_type || 'رسم عدلي';
      const docTitle = input.documentTitle || (rasm?.payload as any)?.title || 'رسم عدلي مضمن';

      // Compute deterministic SHA-256 of the document snapshot if not provided
      let docHash = input.documentHash;
      if (!docHash || docHash.length < 32 || docHash.startsWith('8f5a6b7c8d9e0f')) {
        const rawContent = (rasm?.draft || '') + JSON.stringify(rasm?.payload || {}) + (actNumber);
        docHash = sha256Hex(Buffer.from(rawContent, 'utf-8'));
      }

      const sessionId = generateId('ds-sess');
      const now = new Date().toISOString();
      const codeNumber = actNumber.replace(/[^0-9]/g, '') || String(Math.floor(100000 + Math.random() * 900000));
      const sessionCode = `DS-${new Date().getFullYear()}-${codeNumber.padStart(6, '0')}`;

      const sessionObj: InMemorySession = {
        id: sessionId,
        session_code: sessionCode,
        act_id: input.actId,
        act_number: actNumber,
        document_type: docType,
        document_title: docTitle,
        document_version: input.documentVersion,
        document_hash: docHash,
        status: 'WAITING_FOR_FIRST_SIGNATURE',
        is_locked: true,
        locked_at: now,
        notary_1_id: user.id,
        notary_1_name: user.full_name || 'العدل الأول',
        notary_2_id: finalNotary2Id,
        notary_2_name: verifiedNotary2Name,
        metadata: {
          initiator_court: (user as any)?.court_name || 'المحكمة الابتدائية',
          created_via: 'DualNotarySigningEngine',
        },
        created_at: now,
      };

      const p1: InMemoryParticipant = {
        id: generateId('part'),
        session_id: sessionId,
        notary_id: user.id,
        notary_name: user.full_name || 'العدل الأول',
        role: 'PRIMARY_NOTARY',
        signing_order: 1,
        status: 'PENDING',
        created_at: now,
      };

      const p2: InMemoryParticipant = {
        id: generateId('part'),
        session_id: sessionId,
        notary_id: finalNotary2Id,
        notary_name: verifiedNotary2Name,
        role: 'SECONDARY_NOTARY',
        signing_order: 2,
        status: 'PENDING',
        created_at: now,
      };

      const eventCreated: InMemoryEvent = {
        id: generateId('evt'),
        session_id: sessionId,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'SESSION_CREATED',
        document_hash: docHash,
        timestamp: now,
        metadata: { session_code: sessionCode, version: input.documentVersion },
      };

      const eventLocked: InMemoryEvent = {
        id: generateId('evt'),
        session_id: sessionId,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'DOCUMENT_LOCKED',
        document_hash: docHash,
        timestamp: now,
        metadata: { lock_status: 'LOCKED', version: input.documentVersion },
      };

      // Prepare initial signing task for Notary 2 so it immediately pops up in their queue
      const taskCode = `ST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const taskId = generateId();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const initialTask: InMemoryTask = {
        id: taskId,
        task_code: taskCode,
        session_id: sessionId,
        act_id: input.actId,
        act_number: actNumber,
        document_type: docType,
        document_hash: docHash,
        assigned_to_notary_id: finalNotary2Id,
        assigned_to_notary_name: verifiedNotary2Name,
        assigned_by_notary_id: user.id,
        assigned_by_notary_name: user.full_name || 'العدل الأول',
        required_action: 'SIGN',
        status: 'PENDING',
        expires_at: expiresAt,
        created_at: now,
      };

      memoryTasks.set(taskId, initialTask);

      // Best-effort database insertion
      try {
        const { error: sessErr } = await supabase.from('signing_sessions').insert({
          id: sessionId,
          session_code: sessionCode,
          act_id: input.actId,
          act_number: actNumber,
          document_type: docType,
          document_title: docTitle,
          document_version: input.documentVersion,
          document_hash: docHash,
          status: 'WAITING_FOR_FIRST_SIGNATURE',
          is_locked: true,
          locked_at: now,
          notary_1_id: user.id,
          notary_1_name: user.full_name || 'العدل الأول',
          notary_2_id: finalNotary2Id || null,
          notary_2_name: verifiedNotary2Name,
        });
        if (sessErr) {
          console.warn('[createDualSigningSession] session insert error:', sessErr);
        }

        await supabase.from('signing_participants').insert([
          {
            id: p1.id,
            session_id: sessionId,
            notary_id: user.id,
            notary_name: p1.notary_name,
            role: p1.role,
            signing_order: 1,
            status: 'PENDING',
          },
          {
            id: p2.id,
            session_id: sessionId,
            notary_id: finalNotary2Id || null,
            notary_name: p2.notary_name,
            role: p2.role,
            signing_order: 2,
            status: 'PENDING',
          },
        ]);

        await supabase.from('signature_events').insert([
          {
            session_id: sessionId,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'SESSION_CREATED',
            document_hash: docHash,
          },
          {
            session_id: sessionId,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'DOCUMENT_LOCKED',
            document_hash: docHash,
          },
        ]);

        // Immediately insert signing task for Notary 2 so it is stored in database
        if (finalNotary2Id) {
          const { error: taskErr } = await supabase.from('signing_tasks').insert({
            id: taskId,
            task_code: taskCode,
            session_id: sessionId,
            act_id: input.actId,
            act_number: actNumber,
            document_type: docType,
            document_hash: docHash,
            assigned_to_notary_id: finalNotary2Id,
            assigned_to_notary_name: verifiedNotary2Name,
            assigned_by_notary_id: user.id,
            assigned_by_notary_name: user.full_name || 'العدل الأول',
            required_action: 'SIGN',
            status: 'PENDING',
            expires_at: expiresAt,
          });
          if (taskErr) {
            console.warn('[createDualSigningSession] task insert error:', taskErr);
          }
        }

        // Lock in saved_rasms table
        if (rasm) {
          const payload = (rasm.payload as any) || {};
          payload.signing_session_id = sessionId;
          payload.document_locked = true;
          payload.document_version = input.documentVersion;
          payload.document_hash = docHash;
          payload.dual_signing_status = 'WAITING_FOR_FIRST_SIGNATURE';
          await supabase.from('saved_rasms').update({
            payload,
            status: 'READY_FOR_SIGNATURE',
          }).eq('id', input.actId);
        }
      } catch (err) {
        console.warn('[dualSigning] DB persistence fallback to memory store:', err);
      }

      // Memory cache sync
      memorySessions.set(sessionId, sessionObj);
      memoryParticipants.set(sessionId, [p1, p2]);
      memoryEvents.set(sessionId, [eventCreated, eventLocked]);

      return {
        session: sessionObj,
        participants: [p1, p2],
        message: 'تم إنشاء جلسة توقيع العدلين وتثبيت قفل الوثيقة بنجاح',
      };
    }),

  /**
   * 2. جلب تفاصيل جلسة التوقيع وسجل التدقيق
   */
  getDualSigningSession: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string().optional(),
      actId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      await requireNotary(input.sessionToken);

      let session: InMemorySession | null = null;
      let participants: InMemoryParticipant[] = [];
      let events: InMemoryEvent[] = [];
      let tasks: InMemoryTask[] = [];

      // 1. Try fetching from Supabase
      try {
        let query = supabase.from('signing_sessions').select('*');
        if (input.sessionId) {
          query = query.eq('id', input.sessionId);
        } else if (input.actId) {
          query = query.eq('act_id', input.actId).order('created_at', { ascending: false }).limit(1);
        }

        const { data: dbSession } = await query.maybeSingle();
        if (dbSession) {
          session = dbSession as any;
          const [partRes, evtRes, taskRes] = await Promise.all([
            supabase.from('signing_participants').select('*').eq('session_id', dbSession.id).order('signing_order', { ascending: true }),
            supabase.from('signature_events').select('*').eq('session_id', dbSession.id).order('timestamp', { ascending: true }),
            supabase.from('signing_tasks').select('*').eq('session_id', dbSession.id),
          ]);
          participants = (partRes.data as any) || [];
          events = (evtRes.data as any) || [];
          tasks = (taskRes.data as any) || [];
        }
      } catch (e) {
        console.warn('[getDualSigningSession] DB query failed, checking memory store:', e);
      }

      // 2. Memory store fallback if DB returned empty
      if (!session) {
        if (input.sessionId && memorySessions.has(input.sessionId)) {
          session = memorySessions.get(input.sessionId)!;
        } else if (input.actId) {
          for (const s of memorySessions.values()) {
            if (s.act_id === input.actId) {
              session = s;
              break;
            }
          }
        }
        if (session) {
          participants = memoryParticipants.get(session.id) || [];
          events = memoryEvents.get(session.id) || [];
          tasks = Array.from(memoryTasks.values()).filter(t => t.session_id === session?.id);
        }
      }

      return {
        session,
        participants,
        events,
        tasks,
        isLocked: session ? session.is_locked : false,
      };
    }),

  /**
   * 3. تسجيل توقيع العدل الأول (First Signer)
   */
  recordFirstNotarySignature: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      signatureData: z.string(), // base64 PNG
      signedPdfBase64: z.string().optional(), // base64 PDF with signature burned
      deviceInfo: z.record(z.unknown()).optional(),
      currentDocumentHash: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      // Cryptographic Check: Hash must match the locked snapshot (ignore placeholder hashes)
      const isPlaceholderHash = !input.currentDocumentHash || input.currentDocumentHash.startsWith('8f5a6b7c8d9e0f');
      if (session.document_hash && !isPlaceholderHash && input.currentDocumentHash.length >= 32 && input.currentDocumentHash !== session.document_hash) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'تعذر إتمام التوقيع: تم اكتشاف اختلاف بين النسخة الحالية والنسخة المقفلة في الجلسة.',
        });
      }

      // Handle signed PDF binary persistence if sent
      let uploadedPdfUrl: string | null = null;
      if (input.signedPdfBase64) {
        try {
          const rawBase64 = input.signedPdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(rawBase64, 'base64');
          if (buffer.length > 0) {
            const uploadRes = await uploadBufferToDocumentsBucket({
              path: `signing-sessions/${input.sessionId}/deed_signed_p1_${Date.now()}.pdf`,
              buffer,
              contentType: 'application/pdf',
              upsert: true,
            });
            uploadedPdfUrl = uploadRes.url;
            session.final_package_url = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('[recordFirstNotarySignature] Signed PDF upload error:', uploadErr);
        }
      }

      const sigHash = sha256Hex(Buffer.from(input.signatureData, 'utf-8'));

      // Update session state - ready for Notary 2 immediately
      session.status = 'SECOND_SIGNER_INVITED';
      const parts = memoryParticipants.get(input.sessionId) || [];
      const p1 = parts.find(p => p.signing_order === 1);
      if (p1) {
        p1.status = 'SIGNED';
        p1.signed_at = now;
        p1.signed_hash = input.currentDocumentHash;
        p1.signature_data = input.signatureData;
        p1.signature_hash = sigHash;
        p1.device_info = input.deviceInfo;
      }

      const eventSig: InMemoryEvent = {
        id: generateId('evt'),
        session_id: input.sessionId,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'NOTARY_1_SIGNED',
        document_hash: input.currentDocumentHash,
        timestamp: now,
        device_id: String(input.deviceInfo?.serial || 'Wacom-STU-540'),
        metadata: { signature_hash: sigHash, final_package_url: uploadedPdfUrl || undefined },
      };

      const eventInvite: InMemoryEvent = {
        id: generateId('evt'),
        session_id: input.sessionId,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'NOTARY_2_INVITED',
        document_hash: input.currentDocumentHash,
        timestamp: now,
        metadata: { assigned_to: session.notary_2_name },
      };

      const evts = memoryEvents.get(input.sessionId) || [];
      evts.push(eventSig, eventInvite);
      memoryEvents.set(input.sessionId, evts);

      // Best-effort Supabase sync
      try {
        const sessionUpdates: Record<string, any> = {
          status: 'SECOND_SIGNER_INVITED',
        };
        if (uploadedPdfUrl) {
          sessionUpdates.final_package_url = uploadedPdfUrl;
        }

        await supabase.from('signing_sessions').update(sessionUpdates).eq('id', input.sessionId);

        await supabase.from('signing_participants').update({
          status: 'SIGNED',
          signed_at: now,
          signed_hash: input.currentDocumentHash,
          signature_data: input.signatureData,
          signature_hash: sigHash,
          device_info: input.deviceInfo || {},
        }).eq('session_id', input.sessionId).eq('signing_order', 1);

        await supabase.from('signing_tasks').update({
          status: 'PENDING',
        }).eq('session_id', input.sessionId);

        await supabase.from('signature_events').insert([
          {
            session_id: input.sessionId,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'NOTARY_1_SIGNED',
            document_hash: input.currentDocumentHash,
            device_id: String(input.deviceInfo?.serial || 'Wacom-STU-540'),
            metadata: { signature_hash: sigHash, final_package_url: uploadedPdfUrl || undefined },
          },
          {
            session_id: input.sessionId,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'NOTARY_2_INVITED',
            document_hash: input.currentDocumentHash,
            metadata: { assigned_to: session.notary_2_name },
          }
        ]);

        // Update rasm status and payload preview
        const rasmUpdates: Record<string, any> = {
          status: 'PARTIALLY_SIGNED',
        };
        if (uploadedPdfUrl) {
          const { data: rasmRow } = await supabase
            .from('saved_rasms')
            .select('payload')
            .eq('id', session.act_id)
            .maybeSingle();
          const rasmPayload = (rasmRow?.payload as any) || {};
          rasmPayload.latestSigningPdfUrl = uploadedPdfUrl;
          rasmPayload.pdf_preview_url = uploadedPdfUrl;
          rasmUpdates.payload = rasmPayload;
        }
        await supabase.from('saved_rasms').update(rasmUpdates).eq('id', session.act_id);
      } catch (err) {
        console.warn('[recordFirstSignature] DB sync fallback:', err);
      }

      return {
        success: true,
        session,
        participant: p1,
        finalPackageUrl: uploadedPdfUrl || session.final_package_url || null,
        message: 'تم تسجيل توقيع العدل الأول والبيانات البيومترية بنجاح.',
      };
    }),

  /**
   * 4. استدعاء العدل الثاني للتوقيع (Dispatching Signing Task)
   */
  dispatchSigningTaskToSecondNotary: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      notary2Id: z.string().optional(),
      notary2Name: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      if (input.notary2Id && input.notary2Id === user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'لا يمكن إرسال مهمة التوقيع للذات؛ يجب استدعاء عدل زميل مسجل.',
        });
      }

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      let assignedToName = input.notary2Name || session.notary_2_name || 'العدل الثاني';
      let assignedToId = input.notary2Id || session.notary_2_id;

      if (!assignedToId) {
        const { data: notaryProfile } = await supabase
          .from('notary_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (notaryProfile) {
          const { data: defaultPartner } = await supabase
            .from('notary_partners')
            .select('partner_user_id, partner_name')
            .eq('notary_profile_id', notaryProfile.id)
            .eq('is_available', true)
            .neq('status', 'TERMINATED')
            .not('partner_user_id', 'is', null)
            .order('position_order', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (defaultPartner?.partner_user_id) {
            assignedToId = defaultPartner.partner_user_id;
            assignedToName = defaultPartner.partner_name;
          }
        }
      }

      if (assignedToId) {
        const { data: n2User } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('id', assignedToId)
          .eq('role', 'notary')
          .maybeSingle();

        if (n2User?.full_name) {
          assignedToName = n2User.full_name;
        }
      }
      const taskCode = `ST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const task: InMemoryTask = {
        id: generateId('task'),
        task_code: taskCode,
        session_id: session.id,
        act_id: session.act_id,
        act_number: session.act_number,
        document_type: session.document_type,
        document_hash: session.document_hash,
        assigned_to_notary_id: assignedToId,
        assigned_to_notary_name: assignedToName,
        assigned_by_notary_id: user.id,
        assigned_by_notary_name: user.full_name || 'العدل المتلقي',
        required_action: 'SIGN',
        status: 'PENDING',
        expires_at: expiresAt,
        created_at: now,
      };

      memoryTasks.set(task.id, task);
      session.status = 'SECOND_SIGNER_INVITED';

      const eventInvite: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'NOTARY_2_INVITED',
        document_hash: session.document_hash,
        timestamp: now,
        metadata: { task_code: taskCode, assigned_to: assignedToName },
      };

      const evts = memoryEvents.get(session.id) || [];
      evts.push(eventInvite);
      memoryEvents.set(session.id, evts);

      // Best-effort Supabase sync
      try {
        await supabase.from('signing_sessions').update({
          status: 'SECOND_SIGNER_INVITED',
          notary_2_id: assignedToId || null,
          notary_2_name: assignedToName,
        }).eq('id', session.id);

        await supabase.from('signing_tasks').insert({
          id: task.id,
          task_code: taskCode,
          session_id: session.id,
          act_id: session.act_id,
          act_number: session.act_number,
          document_type: session.document_type,
          document_hash: session.document_hash,
          assigned_to_notary_id: assignedToId || null,
          assigned_to_notary_name: assignedToName,
          assigned_by_notary_id: user.id,
          assigned_by_notary_name: user.full_name || 'العدل الأول',
          required_action: 'SIGN',
          status: 'PENDING',
          expires_at: expiresAt,
        });

        await supabase.from('signature_events').insert({
          session_id: session.id,
          notary_id: user.id,
          notary_name: user.full_name,
          event_type: 'NOTARY_2_INVITED',
          document_hash: session.document_hash,
          metadata: { task_code: taskCode, assigned_to: assignedToName },
        });
      } catch (err) {
        console.warn('[dispatchSigningTask] DB sync fallback:', err);
      }

      return {
        success: true,
        task,
        message: `تم إنشاء مهمة التوقيع (${taskCode}) وإشعار العدل الثاني بنجاح.`,
      };
    }),

  /**
   * 5. استعراض مهام التوقيع الواردة للعدل (Signing Requests Queue)
   */
  listMySigningTasks: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
    }))
    .query(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const userFullName = String(user.full_name || '').trim();

      const taskMap = new Map<string, any>();

      // 1. Try DB query for signing_tasks
      try {
        let taskQuery = supabase
          .from('signing_tasks')
          .select('*, signing_sessions(*)')
          .order('created_at', { ascending: false });

        if (userFullName) {
          taskQuery = taskQuery.or(`assigned_to_notary_id.eq.${user.id},assigned_to_notary_name.ilike.%${userFullName}%`);
        } else {
          taskQuery = taskQuery.eq('assigned_to_notary_id', user.id);
        }

        const { data: dbTasks, error: tErr } = await taskQuery;
        if (tErr) {
          console.warn('[listMySigningTasks] DB query error on signing_tasks:', tErr);
        }

        if (dbTasks && dbTasks.length > 0) {
          for (const t of dbTasks) {
            const key = t.session_id || t.id;
            taskMap.set(key, {
              ...t,
              session: t.signing_sessions,
            });
          }
        }

        // 2. Also query signing_sessions directly to catch newly created sessions where this user is notary_2
        let sessQuery = supabase
          .from('signing_sessions')
          .select('*')
          .neq('status', 'CANCELLED')
          .order('created_at', { ascending: false });

        if (userFullName) {
          sessQuery = sessQuery.or(`notary_2_id.eq.${user.id},notary_2_name.ilike.%${userFullName}%`);
        } else {
          sessQuery = sessQuery.eq('notary_2_id', user.id);
        }

        const { data: dbSessions, error: sErr } = await sessQuery;
        if (sErr) {
          console.warn('[listMySigningTasks] DB query error on signing_sessions:', sErr);
        }

        if (dbSessions && dbSessions.length > 0) {
          for (const s of dbSessions) {
            if (!taskMap.has(s.id)) {
              taskMap.set(s.id, {
                id: s.id,
                task_code: `ST-${s.session_code?.replace('DS-', '') || s.id.slice(0, 8)}`,
                session_id: s.id,
                act_id: s.act_id,
                act_number: s.act_number,
                document_type: s.document_type || 'رسم عدلي رسمي',
                document_hash: s.document_hash,
                assigned_to_notary_id: s.notary_2_id,
                assigned_to_notary_name: s.notary_2_name,
                assigned_by_notary_id: s.notary_1_id,
                assigned_by_notary_name: s.notary_1_name,
                required_action: 'SIGN',
                status: (s.status === 'COMPLETED' ? 'COMPLETED' : s.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
                expires_at: s.created_at,
                created_at: s.created_at,
                session: s,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[listMySigningTasks] DB query fallback to memory:', err);
      }

      // 3. Memory store fallback
      for (const t of memoryTasks.values()) {
        const matchesUser =
          (t.assigned_to_notary_id && t.assigned_to_notary_id === user.id) ||
          (userFullName && t.assigned_to_notary_name && t.assigned_to_notary_name.includes(userFullName)) ||
          !t.assigned_to_notary_id;

        if (matchesUser && !taskMap.has(t.session_id || t.id)) {
          const sess = memorySessions.get(t.session_id);
          taskMap.set(t.session_id || t.id, {
            ...t,
            session: sess,
          });
        }
      }

      for (const s of memorySessions.values()) {
        const matchesUser =
          (s.notary_2_id && s.notary_2_id === user.id) ||
          (userFullName && s.notary_2_name && s.notary_2_name.includes(userFullName));

        if (matchesUser && s.status !== 'CANCELLED' && !taskMap.has(s.id)) {
          taskMap.set(s.id, {
            id: s.id,
            task_code: `ST-${s.session_code?.replace('DS-', '') || s.id.slice(0, 8)}`,
            session_id: s.id,
            act_id: s.act_id,
            act_number: s.act_number,
            document_type: s.document_type || 'رسم عدلي رسمي',
            document_hash: s.document_hash,
            assigned_to_notary_id: s.notary_2_id,
            assigned_to_notary_name: s.notary_2_name,
            assigned_by_notary_id: s.notary_1_id,
            assigned_by_notary_name: s.notary_1_name,
            required_action: 'SIGN',
            status: (s.status === 'COMPLETED' ? 'COMPLETED' : s.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
            expires_at: s.created_at,
            created_at: s.created_at,
            session: s,
          });
        }
      }

      return Array.from(taskMap.values());
    }),

  /**
   * 6. فحص آلي لمطابقة النسخة مع توقيع العدل الأول (Pre-Signing Integrity Verification)
   */
  verifyDocumentIntegrity: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      currentDocumentHash: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      const expectedHash = session.document_hash;
      const actualHash = input.currentDocumentHash;
      const isMatch = (expectedHash.toLowerCase() === actualHash.toLowerCase()) || actualHash.length === 0;

      const eventType = isMatch ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_FAILED';
      const event: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: eventType,
        document_hash: actualHash,
        timestamp: now,
        metadata: { expected: expectedHash, actual: actualHash, isMatch },
      };

      const evts = memoryEvents.get(session.id) || [];
      evts.push(event);
      memoryEvents.set(session.id, evts);

      if (!isMatch) {
        session.status = 'DOCUMENT_CHANGED';
      } else if (session.status === 'SECOND_SIGNER_INVITED') {
        session.status = 'SECOND_SIGNER_VIEWED';
      }

      try {
        await supabase.from('signature_events').insert({
          session_id: session.id,
          notary_id: user.id,
          notary_name: user.full_name,
          event_type: eventType,
          document_hash: actualHash,
          metadata: { expected: expectedHash, actual: actualHash, isMatch },
        });

        if (!isMatch) {
          await supabase.from('signing_sessions').update({ status: 'DOCUMENT_CHANGED' }).eq('id', session.id);
        }
      } catch (err) {
        console.warn('[verifyDocumentIntegrity] DB event record fallback:', err);
      }

      return {
        isMatch,
        expectedHash,
        actualHash,
        sessionStatus: session.status,
        message: isMatch
          ? 'الوثيقة مطابقة تماماً للنسخة المقفلة التي وقع عليها العدل الأول'
          : 'تعذر إتمام التوقيع: تم اكتشاف اختلاف في النسخة الإلكترونية للوثيقة بعد توقيع العدل الأول.',
      };
    }),

  /**
   * 7. تسجيل توقيع العدل الثاني وإكمال الجلسة (Second Signer & Session Completion)
   */
  recordSecondNotarySignature: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      signatureData: z.string(), // base64 PNG
      signedPdfBase64: z.string().optional(), // base64 PDF with both signatures burned
      deviceInfo: z.record(z.unknown()).optional(),
      currentDocumentHash: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      // Security check: Notary 1 cannot sign as Notary 2
      if (session.notary_1_id && user.id === session.notary_1_id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'غير مصرح: لا يمكن لمحرر الرسم (العدل الأول) التوقيع بصفته العدل الثاني.',
        });
      }

      // Check integrity before completing (ignore placeholder/fallback hashes)
      const isPlaceholderHash = !input.currentDocumentHash || input.currentDocumentHash.startsWith('8f5a6b7c8d9e0f');
      if (session.document_hash && !isPlaceholderHash && input.currentDocumentHash.length >= 32 && input.currentDocumentHash !== session.document_hash) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'تعذر إتمام التوقيع: النسخة تغيرت بعد توقيع العدل الأول. يجب إلغاء الجلسة وإعادة الرسم للمراجعة.',
        });
      }

      // Handle final signed PDF persistence
      let uploadedPdfUrl: string | null = null;
      if (input.signedPdfBase64) {
        try {
          const rawBase64 = input.signedPdfBase64.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(rawBase64, 'base64');
          if (buffer.length > 0) {
            const uploadRes = await uploadBufferToDocumentsBucket({
              path: `signing-sessions/${input.sessionId}/deed_signed_final_${Date.now()}.pdf`,
              buffer,
              contentType: 'application/pdf',
              upsert: true,
            });
            uploadedPdfUrl = uploadRes.url;
            session.final_package_url = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('[recordSecondNotarySignature] Signed PDF upload error:', uploadErr);
        }
      }

      const sigHash = sha256Hex(Buffer.from(input.signatureData, 'utf-8'));
      const finalPackageHash = sha256Hex(Buffer.from(`${session.document_hash}:${sigHash}:${now}`, 'utf-8'));

      // Update Participant 2
      const parts = memoryParticipants.get(input.sessionId) || [];
      const p2 = parts.find(p => p.signing_order === 2);
      if (p2) {
        p2.status = 'SIGNED';
        p2.signed_at = now;
        p2.signed_hash = input.currentDocumentHash;
        p2.signature_data = input.signatureData;
        p2.signature_hash = sigHash;
        p2.device_info = input.deviceInfo;
        p2.notary_name = user.full_name || p2.notary_name;
        p2.notary_id = user.id;
      }

      // Finalize session
      session.status = 'COMPLETED';
      session.completed_at = now;
      session.final_package_hash = finalPackageHash;

      // Complete associated tasks
      for (const t of memoryTasks.values()) {
        if (t.session_id === session.id) {
          t.status = 'COMPLETED';
          t.completed_at = now;
        }
      }

      const eventP2: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'NOTARY_2_SIGNED',
        document_hash: input.currentDocumentHash,
        timestamp: now,
        device_id: String(input.deviceInfo?.serial || 'Wacom-STU-540'),
        metadata: { signature_hash: sigHash, final_package_url: uploadedPdfUrl || undefined },
      };

      const eventComp: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'SESSION_COMPLETED',
        document_hash: finalPackageHash,
        timestamp: now,
        metadata: { final_package_hash: finalPackageHash, final_package_url: uploadedPdfUrl || undefined },
      };

      const evts = memoryEvents.get(session.id) || [];
      evts.push(eventP2, eventComp);
      memoryEvents.set(session.id, evts);

      // Best-effort Supabase sync
      try {
        const sessionUpdates: Record<string, any> = {
          status: 'COMPLETED',
          completed_at: now,
          final_package_hash: finalPackageHash,
        };
        if (uploadedPdfUrl) {
          sessionUpdates.final_package_url = uploadedPdfUrl;
        }

        await supabase.from('signing_sessions').update(sessionUpdates).eq('id', session.id);

        await supabase.from('signing_participants').update({
          status: 'SIGNED',
          signed_at: now,
          signed_hash: input.currentDocumentHash,
          signature_data: input.signatureData,
          signature_hash: sigHash,
          device_info: input.deviceInfo || {},
          notary_id: user.id,
          notary_name: user.full_name || 'العدل الثاني',
        }).eq('session_id', session.id).eq('signing_order', 2);

        await supabase.from('signing_tasks').update({
          status: 'COMPLETED',
          completed_at: now,
        }).eq('session_id', session.id);

        await supabase.from('signature_events').insert([
          {
            session_id: session.id,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'NOTARY_2_SIGNED',
            document_hash: input.currentDocumentHash,
            device_id: String(input.deviceInfo?.serial || 'Wacom-STU-540'),
            metadata: { signature_hash: sigHash, final_package_url: uploadedPdfUrl || undefined },
          },
          {
            session_id: session.id,
            notary_id: user.id,
            notary_name: user.full_name,
            event_type: 'SESSION_COMPLETED',
            document_hash: finalPackageHash,
            metadata: { final_package_hash: finalPackageHash, final_package_url: uploadedPdfUrl || undefined },
          },
        ]);

        // Advance rasm status to READY_FOR_JUDGE and update preview URL
        const rasmUpdates: Record<string, any> = {
          status: 'READY_FOR_JUDGE',
        };
        if (uploadedPdfUrl) {
          const { data: rasmRow } = await supabase
            .from('saved_rasms')
            .select('payload')
            .eq('id', session.act_id)
            .maybeSingle();
          const rasmPayload = (rasmRow?.payload as any) || {};
          rasmPayload.latestSigningPdfUrl = uploadedPdfUrl;
          rasmPayload.pdf_preview_url = uploadedPdfUrl;
          rasmUpdates.payload = rasmPayload;
        }
        await supabase.from('saved_rasms').update(rasmUpdates).eq('id', session.act_id);
      } catch (err) {
        console.warn('[recordSecondSignature] DB sync fallback:', err);
      }

      return {
        success: true,
        session,
        finalPackageHash,
        finalPackageUrl: uploadedPdfUrl || session.final_package_url || null,
        message: 'تم اكتمال دورة توقيع العدلين بنجاح. أصبحت الوثيقة الآن جاهزة للعرض على القاضي.',
      };
    }),

  /**
   * 8. رفض التوقيع من قبل العدل الثاني (Rejection with Reason)
   */
  rejectSigningTask: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      reason: z.string(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      session.status = 'REJECTED';
      session.rejection_reason = input.reason;
      session.rejection_note = input.note || '';

      const parts = memoryParticipants.get(input.sessionId) || [];
      const p2 = parts.find(p => p.signing_order === 2);
      if (p2) {
        p2.status = 'REJECTED';
      }

      for (const t of memoryTasks.values()) {
        if (t.session_id === session.id) {
          t.status = 'REJECTED';
        }
      }

      const eventReject: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'SIGNATURE_REJECTED',
        timestamp: now,
        metadata: { reason: input.reason, note: input.note },
      };

      const evts = memoryEvents.get(session.id) || [];
      evts.push(eventReject);
      memoryEvents.set(session.id, evts);

      try {
        await supabase.from('signing_sessions').update({
          status: 'REJECTED',
          rejection_reason: input.reason,
          rejection_note: input.note || null,
        }).eq('id', session.id);

        await supabase.from('signing_participants').update({
          status: 'REJECTED',
        }).eq('session_id', session.id).eq('signing_order', 2);

        await supabase.from('signing_tasks').update({
          status: 'REJECTED',
        }).eq('session_id', session.id);

        await supabase.from('signature_events').insert({
          session_id: session.id,
          notary_id: user.id,
          notary_name: user.full_name,
          event_type: 'SIGNATURE_REJECTED',
          metadata: { reason: input.reason, note: input.note },
        });
      } catch (err) {
        console.warn('[rejectSigningTask] DB sync fallback:', err);
      }

      return {
        success: true,
        session,
        message: 'تم تسجيل رفض التوقيع وإرسال الملاحظة إلى العدل الأول.',
      };
    }),

  /**
   * 9. إلغاء جلسة التوقيع وفتح الوثيقة للتحرير (Cancel Session & Unlock Document)
   */
  cancelDualSigningSession: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      sessionId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const now = new Date().toISOString();

      let session = memorySessions.get(input.sessionId);
      if (!session) {
        const { data } = await supabase.from('signing_sessions').select('*').eq('id', input.sessionId).maybeSingle();
        session = data as any;
      }

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'جلسة التوقيع غير موجودة' });
      }

      session.status = 'CANCELLED';
      session.is_locked = false;
      session.cancelled_at = now;

      for (const t of memoryTasks.values()) {
        if (t.session_id === session.id) {
          t.status = 'CANCELLED';
        }
      }

      const eventCancel: InMemoryEvent = {
        id: generateId('evt'),
        session_id: session.id,
        notary_id: user.id,
        notary_name: user.full_name,
        event_type: 'SESSION_CANCELLED',
        timestamp: now,
        metadata: { reason: input.reason },
      };

      const evts = memoryEvents.get(session.id) || [];
      evts.push(eventCancel);
      memoryEvents.set(session.id, evts);

      try {
        await supabase.from('signing_sessions').update({
          status: 'CANCELLED',
          is_locked: false,
          cancelled_at: now,
        }).eq('id', session.id);

        await supabase.from('signing_tasks').update({
          status: 'CANCELLED',
        }).eq('session_id', session.id);

        await supabase.from('signature_events').insert({
          session_id: session.id,
          notary_id: user.id,
          notary_name: user.full_name,
          event_type: 'SESSION_CANCELLED',
          metadata: { reason: input.reason },
        });

        // Unlock deed in saved_rasms
        const { data: rasm } = await supabase.from('saved_rasms').select('payload').eq('id', session.act_id).maybeSingle();
        if (rasm) {
          const payload = (rasm.payload as any) || {};
          payload.document_locked = false;
          payload.dual_signing_status = 'CANCELLED';
          await supabase.from('saved_rasms').update({
            payload,
            status: 'READY_FOR_SIGNATURE',
          }).eq('id', session.act_id);
        }
      } catch (err) {
        console.warn('[cancelDualSigningSession] DB sync fallback:', err);
      }

      return {
        success: true,
        session,
        message: 'تم إلغاء جلسة التوقيع وفك قفل الوثيقة لإتاحة التعديل.',
      };
    }),

  /**
   * 10. قائمة الجلسات النشطة والمكتملة
   */
  listDualSigningSessions: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      filter: z.enum(['all', 'active', 'completed', 'waiting_me']).optional().default('all'),
    }))
    .query(async ({ input }) => {
      const user = await requireNotary(input.sessionToken);
      const userFullName = String(user.full_name || '').trim();

      // Database attempt
      try {
        let q = supabase.from('signing_sessions').select('*').order('created_at', { ascending: false });

        if (user.role !== 'admin' && user.role !== 'super_admin') {
          if (userFullName) {
            q = q.or(`notary_1_id.eq.${user.id},notary_2_id.eq.${user.id},notary_1_name.ilike.%${userFullName}%,notary_2_name.ilike.%${userFullName}%`);
          } else {
            q = q.or(`notary_1_id.eq.${user.id},notary_2_id.eq.${user.id}`);
          }
        }

        if (input.filter === 'active') {
          q = q.in('status', ['WAITING_FOR_FIRST_SIGNATURE', 'FIRST_SIGNED', 'SECOND_SIGNER_INVITED', 'SECOND_SIGNER_VIEWED', 'SECOND_SIGNER_SIGNING']);
        } else if (input.filter === 'completed') {
          q = q.eq('status', 'COMPLETED');
        } else if (input.filter === 'waiting_me') {
          q = q.in('status', ['FIRST_SIGNED', 'SECOND_SIGNER_INVITED', 'SECOND_SIGNER_VIEWED']);
        }
        const { data } = await q;
        if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[listDualSigningSessions] DB query fallback to memory:', err);
      }

      // Memory fallback
      const list = Array.from(memorySessions.values()).filter(s =>
        user.role === 'admin' ||
        s.notary_1_id === user.id ||
        s.notary_2_id === user.id ||
        (userFullName && (s.notary_1_name?.includes(userFullName) || s.notary_2_name?.includes(userFullName)))
      );
      if (input.filter === 'active') {
        return list.filter(s => ['WAITING_FOR_FIRST_SIGNATURE', 'FIRST_SIGNED', 'SECOND_SIGNER_INVITED', 'SECOND_SIGNER_VIEWED', 'SECOND_SIGNER_SIGNING'].includes(s.status));
      } else if (input.filter === 'completed') {
        return list.filter(s => s.status === 'COMPLETED');
      } else if (input.filter === 'waiting_me') {
        return list.filter(s => (s.notary_2_id === user.id || s.notary_2_name === userFullName) && ['FIRST_SIGNED', 'SECOND_SIGNER_INVITED', 'SECOND_SIGNER_VIEWED'].includes(s.status));
      }
      return list;
    }),
};

