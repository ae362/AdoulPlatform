import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { sendEmail } from '../services/email';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { TRPCError } from '@trpc/server';
import { sanitizePostgrestValue, sanitizeIlikePattern } from '../utils/inputSanitizer';

function formatSupabaseError(err: any) {
  if (!err) return '';
  const code = err.code ? ` (${err.code})` : '';
  const message = err.message ? String(err.message) : String(err);
  const details = err.details ? ` | details: ${err.details}` : '';
  const hint = err.hint ? ` | hint: ${err.hint}` : '';
  return `${message}${code}${details}${hint}`.trim();
}

const WORKFLOW_JSON_START = '--- WORKFLOW JSON START ---';
const WORKFLOW_JSON_END = '--- WORKFLOW JSON END ---';

function extractWorkflowJson(notes: string | null | undefined) {
  const text = String(notes || '');
  if (!text.includes(WORKFLOW_JSON_START) || !text.includes(WORKFLOW_JSON_END)) return null;
  try {
    const jsonPart = text.split(WORKFLOW_JSON_START)[1].split(WORKFLOW_JSON_END)[0].trim();
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

function upsertWorkflowJson(notes: string | null | undefined, workflow: any) {
  const base = String(notes || '');
  const block = `${WORKFLOW_JSON_START}\n${JSON.stringify(workflow)}\n${WORKFLOW_JSON_END}`;
  if (!base.includes(WORKFLOW_JSON_START) || !base.includes(WORKFLOW_JSON_END)) {
    return [base.trim(), block].filter(Boolean).join('\n\n');
  }
  const before = base.split(WORKFLOW_JSON_START)[0].trimEnd();
  const after = base.split(WORKFLOW_JSON_END)[1].trimStart();
  return [before, block, after].filter(Boolean).join('\n\n');
}

async function updateJudicialNotificationWithFallback({
  notificationId,
  updateData,
}: {
  notificationId: string;
  updateData: Record<string, any>;
}) {
  const attempt = async (payload: Record<string, any>) => {
    return supabase
      .from('judicial_notifications')
      .update(payload)
      .eq('id', notificationId)
      .select();
  };

  // Try once, then progressively drop/adjust optional columns that may not exist in older schemas.
  const payload = { ...updateData };
  let lastError: any = null;

  for (let i = 0; i < 4; i += 1) {
    const { data, error } = await attempt(payload);
    if (!error) return { data };
    lastError = error;

    const msg = String(error.message || error.details || '');
    const code = String(error.code || '');

    // Missing column in PostgREST schema cache (e.g. internal_notes not present).
    if (code === 'PGRST204' && msg.includes('internal_notes') && 'internal_notes' in payload) {
      delete payload.internal_notes;
      continue;
    }

    // Conditions column may not exist or may not be json/jsonb.
    if ((code === 'PGRST204' && msg.includes('conditions') && 'conditions' in payload)) {
      delete payload.conditions;
      continue;
    }

    // decision_serial_number column may not exist.
    if (code === 'PGRST204' && msg.includes('decision_serial_number') && 'decision_serial_number' in payload) {
      delete payload.decision_serial_number;
      continue;
    }

    // If conditions exists but expects text, retry with JSON string.
    if ('conditions' in payload && Array.isArray(payload.conditions)) {
      payload.conditions = JSON.stringify(payload.conditions);
      continue;
    }

    break;
  }

  throw lastError;
}

export const notificationsRouter = router({
  uploadFile: publicProcedure
    .input(z.object({
      file: fileUploadSchema
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await uploadDocument(input.file);
        return result;
      } catch (error: any) {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }),

  getDashboardStats: publicProcedure
    .input(z.object({ 
      year: z.number().optional(),
      notaryId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();

      try {
        // Query to get notification statistics
        let query = supabase
          .from('judicial_notifications')
          .select('id, status, decision_type, processing_time_hours, created_at')
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);

        if (input.notaryId) {
          const safeNotaryId = sanitizePostgrestValue(input.notaryId);
          query = query.or(`notary_id.eq.${safeNotaryId},notary_id.is.null`);
        }

        const { data: result, error } = await query;

        if (error) throw error;

        const notifications = result || [];
        const totalIncoming = notifications.length;
        const totalApproved = notifications.filter(n => 
          n.decision_type === 'موافقة' || n.decision_type === 'موافقة_مع_شروط'
        ).length;
        const totalRejected = notifications.filter(n => n.decision_type === 'رفض').length;
        const totalPostponed = notifications.filter(n => n.decision_type === 'تأجيل').length;
        
        // Calculate average processing time
        const avgProcessingTime = notifications.length > 0 
          ? Math.round(
              notifications.reduce((sum, n) => sum + (n.processing_time_hours || 0), 0) / notifications.length
            )
          : 0;

        return {
          totalIncoming,
          totalApproved,
          totalRejected,
          totalPostponed,
          averageProcessingTime: avgProcessingTime,
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Return fallback data if database query fails
        return {
          totalIncoming: 0,
          totalApproved: 0,
          totalRejected: 0,
          totalPostponed: 0,
          averageProcessingTime: 0,
        };
      }
    }),

  getMonthlyStats: publicProcedure
    .input(z.object({ 
      year: z.number().optional(),
      notaryId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      const monthLabels = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      try {
        // Query to get notifications grouped by month
        let query = supabase
          .from('judicial_notifications')
          .select('created_at, decision_type')
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);

        if (input.notaryId) {
          const safeNotaryId = sanitizePostgrestValue(input.notaryId);
          query = query.or(`notary_id.eq.${safeNotaryId},notary_id.is.null`);
        }

        const { data: result, error } = await query;

        if (error) throw error;

        const notifications = result || [];

        // Group by month
        const monthlyData = Array(12).fill(null).map((_, monthIndex) => {
          const monthNotifications = notifications.filter(n => {
            const notificationMonth = new Date(n.created_at).getMonth();
            return notificationMonth === monthIndex;
          });

          return {
            month: monthLabels[monthIndex],
            monthIndex: monthIndex + 1,
            total: monthNotifications.length,
            notifications: monthNotifications.length,
            approved: monthNotifications.filter(
              n => n.decision_type === 'موافقة' || n.decision_type === 'موافقة_مع_شروط'
            ).length,
            rejected: monthNotifications.filter(n => n.decision_type === 'رفض').length,
            postponed: monthNotifications.filter(n => n.decision_type === 'تأجيل').length,
          };
        });

        return monthlyData;
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
        return [];
      }
    }),

  createNotification: publicProcedure
    .input(z.object({
      fullName: z.string(),
      professionalNumber: z.string(),
      appointmentDecreeNumber: z.string().optional(),
      appointmentDate: z.string().optional(),
      officeNumber: z.string(),
      jurisdiction: z.string(),
      targetCourt: z.string(),
      certificateType: z.string(),
      category: z.string().optional(),
      legalArticle: z.string().optional(),
      receptionPlace: z.string().optional(),
      receptionDate: z.string().optional(),
      receptionTime: z.string().optional(),
      writingPlace: z.string().optional(),
      involvedNames: z.string().optional(),
      recipientType: z.enum(['judge', 'regional_council', 'national_council', 'both']).optional(),
      appellateCourt: z.string().optional(),
      reasonForMovement: z.string(),
      requestedDuration: z.string(),
      durationUnit: z.string(),
      notes: z.string().optional(),
      attachments: z.string().optional(),
      notaryId: z.string().optional(), // Optional notary ID from context
    }))
    .mutation(async ({ input }) => {
      try {
        // Log all input data for debugging
        console.log('📋 Input data received:', JSON.stringify(input, null, 2));

        // ID Generation Logic based on recipient and category
        let requestNumber = `REQ-${Date.now()}`;
        if (input.recipientType === 'regional_council') {
          const year = new Date().getFullYear();
          const typeCode = input.category || 'GEN';
          const randomSerial = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          requestNumber = `RJ-${year}-${typeCode}-${randomSerial}`;
        } else if (input.recipientType === 'national_council') {
          const year = new Date().getFullYear();
          const randomSerial = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          requestNumber = `HN-REQ-${year}-${randomSerial}`;
        }

        let finalNotes = input.notes || '';
        if (input.category || input.legalArticle) {
          const metadata = { 
            category: input.category, 
            legalArticle: input.legalArticle,
            source: 'legal_partitioning'
          };
          finalNotes += `\n--- METADATA START ---\n${JSON.stringify(metadata)}\n--- METADATA END ---`;
        }

        // Attempt minimal insert first
        const insertData: any = {
          request_number: requestNumber,
          notary_name: input.fullName,
          notary_professional_number: input.professionalNumber,
          notary_office_number: input.officeNumber,
          jurisdiction: input.jurisdiction,
          target_court: input.targetCourt,
          certificate_type: input.certificateType,
          appointment_decree_number: input.appointmentDecreeNumber,
          appointment_date: input.appointmentDate,
          reception_place: input.receptionPlace,
          reception_date: input.receptionDate,
          reception_time: input.receptionTime,
          writing_place: input.writingPlace,
          involved_names: input.involvedNames,
          recipient_type: input.recipientType || 'judge',
          reason_for_movement: input.reasonForMovement,
          notary_id: input.notaryId,
          status: 'قيد_المعالجة',
          notes: finalNotes,
          attachments: input.attachments,
        };

        // Add optional fields only if provided
        if (input.requestedDuration) {
          const parsed = parseInt(input.requestedDuration, 10);
          if (!isNaN(parsed)) {
            insertData.requested_duration = parsed;
          }
        }

        if (input.durationUnit) {
          insertData.duration_unit = input.durationUnit;
        }

        console.log('📝 Insert payload:', JSON.stringify(insertData, null, 2));

        const { data, error } = await supabase
          .from('judicial_notifications')
          .insert([insertData])
          .select('*');

        if (error) {
          console.error('💥 Supabase error:', JSON.stringify({
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }, null, 2));
          throw new Error(`${error.code}: ${error.message}`);
        }

        console.log('✅ Success! Inserted:', data?.[0]?.id);

        return {
          success: true,
          notification: data?.[0],
        };
      } catch (error) {
        console.error('❌ Full error:', error);
        throw error;
      }
    }),

  getRequestsList: publicProcedure
    .input(z.object({ 
      status: z.enum(['all', 'pending', 'approved', 'rejected', 'قيد_المعالجة', 'موافق_عليه', 'مرفوض', 'مؤجل', 'قيد_الدراسة', 'مسجل', 'محفوظ_دون_أثر']).optional(),
      certificateType: z.string().optional(),
      jurisdiction: z.string().optional(),
      searchTerm: z.string().optional(),
      notaryId: z.string().optional(),
      recipientType: z.enum(['judge', 'regional_council', 'national_council', 'both']).optional(),
      excludeSpecialized: z.boolean().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      try {
        console.log('📋 getRequestsList query:', input);
        
        // Fetching notifications with all fields including movement and reception details
        let query = supabase
          .from('judicial_notifications')
          .select('*');
        query = query.order('created_at', { ascending: false });

        if (input.notaryId) {
          // If a specific notaryId is provided, ONLY show their records.
          // Before it was using .or() which might show records where notary_id is null.
          query = query.eq('notary_id', input.notaryId);
        }

        if (input.recipientType) {
          if (input.recipientType === 'judge') {
            query = query.or('recipient_type.eq.judge,recipient_type.eq.both');
          } else if (input.recipientType === 'regional_council') {
            query = query.or('recipient_type.eq.regional_council,recipient_type.eq.both');
          } else {
            query = query.eq('recipient_type', input.recipientType);
          }
        }

        if (input.excludeSpecialized) {
          query = query.not('certificate_type', 'ilike', '%بوابة%');
          query = query.not('certificate_type', 'eq', 'طلب استخراج نسخ/نظائر الرسوم العدلية');
        }

        if (input.status && input.status !== 'all') {
          // Map English status filter to Arabic DB values
          let statusFilter = input.status;
          if (input.status === 'pending') {
            // Match multiple "in-progress" statuses
            query = query.or('status.eq.قيد_المعالجة,status.eq.قيد_الدراسة');
          } else if (input.status === 'approved') {
            query = query.eq('status', 'موافق_عليه');
          } else if (input.status === 'rejected') {
            query = query.eq('status', 'مرفوض');
          } else {
            query = query.eq('status', input.status);
          }
        }

        if (input.certificateType) {
          if (input.certificateType === 'MARRIAGE_ALL') {
             // Smart Permissions filter: must contain "بوابة" which is unique to the smart marriage module
             query = query.or('certificate_type.ilike.%بوابة%');
          } else if (input.certificateType === 'INDIVIDUAL_RECEPTION') {
             // Filter for individual reception permissions (covers various ways it might be labeled)
             query = query.or('certificate_type.ilike.%تلقي فردي%,certificate_type.eq.INDIVIDUAL_RECEPTION,notes.ilike.%IND-%');
          } else {
             query = query.eq('certificate_type', input.certificateType);
          }
        }

        if (input.jurisdiction) {
          query = query.eq('jurisdiction', input.jurisdiction);
        }

        if (input.searchTerm) {
          const term = sanitizeIlikePattern(input.searchTerm);
          query = query.or(`notary_name.ilike.%${term}%,request_number.ilike.%${term}%,involved_names.ilike.%${term}%,certificate_type.ilike.%${term}%`);
        }

        query = query.range(input.offset, input.offset + input.limit - 1);

        const { data: notifications, error } = await query;

        if (error) {
          console.error('❌ Query error:', error);
          throw error;
        }
        
        console.log('✅ Found notifications:', notifications?.length || 0);
        
        // Enrich notifications with notary profile data and office_movement details if missing
        let enrichedNotifications: any[] = notifications || [];
        if (enrichedNotifications.length > 0) {
          const reqNumbers = enrichedNotifications.map((n: any) => n.request_number).filter(Boolean);
          if (reqNumbers.length > 0) {
            try {
              const { data: omRows } = await supabase
                .from('office_movement_notifications')
                .select('request_number, reception_place, reception_date, reception_time, writing_place, reason_for_movement, involved_names, certificate_type, partner_name, target_court')
                .in('request_number', reqNumbers);

              if (omRows && omRows.length > 0) {
                const omMap = omRows.reduce((acc: any, row: any) => {
                  acc[row.request_number] = row;
                  return acc;
                }, {});
                enrichedNotifications = enrichedNotifications.map((n: any) => {
                  const om = omMap[n.request_number];
                  if (!om) return n;
                  return {
                    ...n,
                    reception_place: n.reception_place || om.reception_place || '',
                    reception_date: n.reception_date || om.reception_date || '',
                    reception_time: n.reception_time || om.reception_time || '',
                    writing_place: n.writing_place || om.writing_place || '',
                    reason_for_movement: n.reason_for_movement || om.reason_for_movement || '',
                    involved_names: n.involved_names || om.involved_names || '',
                    partner_name: n.partner_name || om.partner_name || '',
                    target_court: n.target_court || om.target_court || '',
                  };
                });
              }
            } catch (omErr) {
              console.warn('Optional office_movement_notifications enrichment skipped:', omErr);
            }
          }

          const notaryIds = [...new Set(enrichedNotifications.map(n => n.notary_id).filter(Boolean))];
          if (notaryIds.length > 0) {
            const { data: profiles } = await supabase
              .from('notary_profiles')
              .select('user_id, appellate_court, appointment_decree_number, cin, phone, office_address')
              .in('user_id', notaryIds);
            const profileMap = (profiles || []).reduce((acc: any, p: any) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
            
            return enrichedNotifications.map((n: any) => {
              const prof = profileMap[n.notary_id];
              return {
                ...n,
                appellate_court: n.appellate_court || prof?.appellate_court || '',
                appointment_decree_number: n.appointment_decree_number || prof?.appointment_decree_number || '',
                cin: n.cin || prof?.cin || '',
                phone: n.phone || prof?.phone || '',
                notary_phone: n.notary_phone || prof?.phone || n.phone || '',
                province: n.province || prof?.office_address || n.jurisdiction || '',
                commune: n.commune || n.jurisdiction || '',
                office_address: n.office_address || prof?.office_address || '',
              };
            });
          }
          return enrichedNotifications;
        }

        return notifications || [];
      } catch (error) {
        console.error('Error fetching requests list:', error);
        return [];
      }
    }),

  getNotificationById: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const { data: notification, error } = await supabase
          .from('judicial_notifications')
          .select('*')
          .eq('id', input)
          .single();

        if (error) throw error;
        if (!notification) return null;

        // Enrich with profile data if needed
        if (notification.notary_id) {
          const { data: profile } = await supabase
            .from('notary_profiles')
            .select('appellate_court, appointment_decree_number, cin, phone, office_address')
            .eq('user_id', notification.notary_id)
            .single();
          
          if (profile) {
            return {
              ...notification,
              appellate_court: notification.appellate_court || profile.appellate_court || '',
              appointment_decree_number: notification.appointment_decree_number || profile.appointment_decree_number || '',
              cin: notification.cin || profile.cin || '',
              phone: notification.phone || profile.phone || '',
              office_address: notification.office_address || profile.office_address || '',
            };
          }
        }

        return notification;
      } catch (error) {
        console.error('Error fetching notification:', error);
        return null;
      }
    }),

  deleteNotification: publicProcedure
    .input(z.object({
      notificationId: z.string(),
      notaryId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        let query = supabase
          .from('judicial_notifications')
          .delete()
          .eq('id', input.notificationId);

        if (input.notaryId) {
          query = query.eq('notary_id', input.notaryId);
        }

        const { error } = await query;

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: formatSupabaseError(error) || 'Failed to delete notification',
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: formatSupabaseError(error) || 'Failed to delete notification',
        });
      }
    }),

  backfillMarriagePermissionNotes: publicProcedure
    .input(z.object({
      notificationId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const baseQuery = supabase
          .from('judicial_notifications')
          .select('*')
          .eq('certificate_type', 'طلب إذن بالزواج');

        const query = input.notificationId
          ? baseQuery.eq('id', input.notificationId)
          : baseQuery.or('notes.is.null,notes.eq.');

        const { data: rows, error } = await query.limit(200);

        if (error) throw error;
        if (!rows || rows.length === 0) {
          return { success: true, updatedCount: 0 };
        }

        let updatedCount = 0;

        for (const row of rows) {
          // Only backfill when truly missing
          if (row.notes && String(row.notes).trim().length > 0) continue;

          const synthesized = [
            '🟠 تم استرجاع نص الطلب تلقائياً',
            '----------------------------------',
            `رقم الطلب: ${row.request_number || 'غير محدد'}`,
            `المحكمة: ${row.target_court || row.jurisdiction || 'غير محدد'}`,
            `الأطراف: ${row.involved_names || 'غير محدد'}`,
            `العدل: ${row.notary_name || 'غير محدد'}`,
            `سبب الطلب: ${row.reason_for_movement || 'طلب إذن بالزواج'}`,
            '',
            'ملاحظة: هذا النص مُولّد لأن الطلب أُنشئ قبل تفعيل حفظ النص الأصلي التفصيلي.',
          ].join('\n');

          const { error: updateError } = await supabase
            .from('judicial_notifications')
            .update({ notes: synthesized })
            .eq('id', row.id);

          if (!updateError) updatedCount += 1;
        }

        return { success: true, updatedCount };
      } catch (err) {
        console.error('Error backfilling marriage permission notes:', err);
        throw new Error('Failed to backfill notes');
      }
    }),

  recordDecision: publicProcedure
    .input(z.object({
      notificationId: z.string(),
      decisionType: z.enum(['موافقة', 'موافقة_مع_شروط', 'رفض', 'تأجيل', 'حفظ_دون_أثر', 'قيد_الدراسة']),
      reasoning: z.string(),
      internalNotes: z.string().optional(),
      conditions: z.array(z.string()).optional(),
      decisionSerialNumber: z.string().optional(),
      authorityName: z.string().optional(),
      authorityType: z.enum(['judge', 'regional_council']).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        let status = 'قيد_المعالجة';
        
        if (input.decisionType === 'موافقة' || input.decisionType === 'موافقة_مع_شروط') {
          status = 'موافق_عليه';
        } else if (input.decisionType === 'رفض') {
          status = 'مرفوض';
        } else if (input.decisionType === 'تأجيل') {
          status = 'مؤجل';
        } else if (input.decisionType === 'حفظ_دون_أثر') {
          status = 'محفوظ_دون_أثر';
        } else if (input.decisionType === 'قيد_الدراسة') {
          status = 'قيد_الدراسة';
        }

        // Calculate processing time if finalizing
        const updateData: any = {
          decision_type: input.decisionType,
          decision_reasoning: input.reasoning,
          decided_at: new Date().toISOString(),
          status: status,
        };

        if (input.decisionSerialNumber) {
          updateData.decision_serial_number = input.decisionSerialNumber;
        }

        if (typeof input.internalNotes === 'string') {
          updateData.internal_notes = input.internalNotes;
        }

        if (Array.isArray(input.conditions)) {
          // Prefer sending a JSON array directly to json/jsonb columns.
          updateData.conditions = input.conditions;
        }

        // If it's a final decision, calculate time
        if (['موافقة', 'موافقة_مع_شروط', 'رفض', 'حفظ_دون_أثر'].includes(input.decisionType)) {
          const { data: original } = await supabase
            .from('judicial_notifications')
            .select('created_at')
            .eq('id', input.notificationId)
            .single();
            
          if (original) {
            const start = new Date(original.created_at);
            const end = new Date();
            const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
            updateData.processing_time_hours = hours;
          }
        }

        // Update notification with decision (with schema-compat fallbacks)
        let data: any;
        try {
          const res = await updateJudicialNotificationWithFallback({
            notificationId: input.notificationId,
            updateData,
          });
          data = res.data;
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `recordDecision update failed: ${formatSupabaseError(error)}`,
          });
        }

        // --- NOTIFY NOTARY ---
        // Fetch notary email and request details
        const { data: updatedNotif } = await supabase
          .from('judicial_notifications')
          .select('notary_name, notary_id, request_number, decision_type, jurisdiction')
          .eq('id', input.notificationId)
          .maybeSingle();

        // Sync decision to office_movement_notifications if this was an office movement request
        if (updatedNotif?.request_number) {
          try {
            const { data: existingOm } = await supabase
              .from('office_movement_notifications')
              .select('*')
              .eq('request_number', updatedNotif.request_number)
              .maybeSingle();

            if (existingOm) {
              const parseJson = (raw: unknown): Record<string, any> => {
                if (!raw) return {};
                if (typeof raw === 'object' && !Array.isArray(raw)) return { ...(raw as Record<string, any>) };
                if (typeof raw === 'string') {
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...(parsed as Record<string, any>) };
                  } catch { return {}; }
                }
                return {};
              };

              const existingData = parseJson(existingOm.data);
              const councilAuthorityName = input.authorityName || 'المجلس الجهوي للعدول';
              const councilDecision = {
                decision_type: input.decisionType,
                decision_reasoning: input.reasoning,
                decision_serial_number: input.decisionSerialNumber || '',
                decided_at: new Date().toISOString(),
                authority_name: councilAuthorityName,
              };

              const updatedOmData: Record<string, any> = {
                ...existingData,
                council_decision: councilDecision,
              };

              const omUpdate: any = {
                data: updatedOmData,
              };

              if (existingOm.recipient_type === 'regional_council') {
                omUpdate.status = 'مكتمل';
                omUpdate.decision_type = input.decisionType;
                omUpdate.decision_reasoning = input.reasoning;
                omUpdate.decision_serial_number = input.decisionSerialNumber;
                omUpdate.decided_at = new Date().toISOString();
                omUpdate.judge_name = councilAuthorityName;
              } else if (existingOm.recipient_type === 'both') {
                const hasJudgeDecided = Boolean(existingOm.judge_name && existingOm.decision_type && existingOm.decision_type !== 'قيد_المعالجة');
                if (hasJudgeDecided) {
                  omUpdate.status = 'مكتمل';
                  if (!updatedOmData.judge_decision) {
                    updatedOmData.judge_decision = {
                      decision_type: existingOm.decision_type,
                      decision_reasoning: existingOm.decision_reasoning,
                      decision_serial_number: existingOm.decision_serial_number,
                      decided_at: existingOm.decided_at,
                      judge_name: existingOm.judge_name,
                    };
                  }
                } else {
                  omUpdate.status = 'قيد_المعالجة';
                  omUpdate.decision_type = input.decisionType;
                  omUpdate.decision_reasoning = input.reasoning;
                  omUpdate.decision_serial_number = input.decisionSerialNumber;
                  omUpdate.decided_at = new Date().toISOString();
                }
              } else {
                omUpdate.status = 'مكتمل';
                omUpdate.decision_type = input.decisionType;
                omUpdate.decision_reasoning = input.reasoning;
                omUpdate.decision_serial_number = input.decisionSerialNumber;
                omUpdate.decided_at = new Date().toISOString();
                if (input.authorityName) {
                  omUpdate.judge_name = input.authorityName;
                }
              }

              await supabase
                .from('office_movement_notifications')
                .update(omUpdate)
                .eq('request_number', updatedNotif.request_number);
            }
          } catch (syncErr) {
            console.error('Failed to sync decision to office_movement_notifications:', syncErr);
          }
        }

        if (updatedNotif && updatedNotif.notary_id) {
          try {
            const { data: notaryUser } = await supabase
              .from('users')
              .select('email')
              .eq('id', updatedNotif.notary_id)
              .maybeSingle();

            if (notaryUser?.email) {
              const statusLabel = 
                input.decisionType === 'موافقة' ? '✅ تمت الموافقة' :
                input.decisionType === 'رفض' ? '❌ تم الرفض' :
                input.decisionType === 'تأجيل' ? '⏳ تم التأجيل' : '📝 تحديث حالة';

              const senderAuthority = input.authorityName || (input.authorityType === 'regional_council' ? 'المجلس الجهوي للعدول' : 'المصالح القضائية');

              await sendEmail({
                to: notaryUser.email,
                subject: `إشعار من ${senderAuthority}: ${statusLabel} للطلب رقم ${updatedNotif.request_number}`,
                html: `
                  <div dir="rtl" style="font-family: sans-serif; line-height: 1.6;">
                    <h2 style="color: #450a0a;">تحديث بخصوص طلب التنقل القضائي</h2>
                    <p>السيد(ة) العدل <b>${updatedNotif.notary_name}</b>،</p>
                    <p>نحيطكم علماً بأنه قد صدر قرار من <b>${senderAuthority}</b> بخصوص طلبكم رقم <b>${updatedNotif.request_number}</b> المقدم إلى <b>${updatedNotif.jurisdiction || 'المحكمة'}</b>.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border-right: 5px solid #450a0a; margin: 20px 0;">
                      <p><b>القرار المتخذ:</b> ${input.decisionType}</p>
                      <p><b>التعليل:</b> ${input.reasoning}</p>
                    </div>
                    <p>يرجى الولوج إلى فضاءكم الرقمي بمكتب التعيين لمراجعة التفاصيل الكاملة وتحميل نسخة من الوثيقة الرسمية.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #64748b;">هذا البريد مرسل آلياً من طرف المنظومة الإلكترونية للعدول.</p>
                  </div>
                `
              });
              console.log('📧 Notification email sent to notary:', notaryUser.email);
            }
          } catch (emailErr) {
            console.warn('⚠️ Non-blocking notification email lookup/send error:', emailErr);
          }
        }

        return { success: true, updated: data };
      } catch (error) {
        console.error('Error recording decision:', error);
        if (error instanceof TRPCError) throw error;
        const message = (error as any)?.message ? String((error as any).message) : 'Unknown error';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to record decision: ${message}` });
      }
    }),

  appendWorkflowEvent: publicProcedure
    .input(
      z.object({
        notificationId: z.string(),
        stage: z.string().min(1),
        eventType: z.enum(['stage', 'assignment', 'note', 'decision', 'request_completion']),
        message: z.string().min(1),
        actorName: z.string().optional(),
        actorRole: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { data: existing, error: readError } = await supabase
        .from('judicial_notifications')
        .select('id, notes')
        .eq('id', input.notificationId)
        .single();

      if (readError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `workflow read failed: ${formatSupabaseError(readError)}`,
        });
      }

      const current = extractWorkflowJson(existing.notes) || { stage: input.stage, events: [] as any[] };
      const next = {
        ...current,
        stage: input.stage || current.stage,
        events: [
          ...(Array.isArray(current.events) ? current.events : []),
          {
            at: new Date().toISOString(),
            stage: input.stage,
            type: input.eventType,
            message: input.message,
            actorName: input.actorName || null,
            actorRole: input.actorRole || null,
          },
        ],
      };

      const nextNotes = upsertWorkflowJson(existing.notes, next);

      const { data: updated, error: updateError } = await supabase
        .from('judicial_notifications')
        .update({ notes: nextNotes })
        .eq('id', input.notificationId)
        .select('id, notes')
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `workflow update failed: ${formatSupabaseError(updateError)}`,
        });
      }

      return { success: true, workflow: next, notes: updated?.notes };
    }),

  getStatsByRegion: publicProcedure
    .input(z.object({ region: z.string().optional(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();

      try {
        let query = supabase
          .from('judicial_notifications')
          .select('jurisdiction, status, decision_type')
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);

        if (input.region) {
          query = query.eq('jurisdiction', input.region);
        }

        const { data: result, error } = await query;

        if (error) throw error;

        const notifications = result || [];

        return {
          region: input.region || 'الكل',
          total: notifications.length,
          approved: notifications.filter(n => 
            n.decision_type === 'موافقة' || n.decision_type === 'موافقة_مع_شروط'
          ).length,
          rejected: notifications.filter(n => n.decision_type === 'رفض').length,
          postponed: notifications.filter(n => n.decision_type === 'تأجيل').length,
          processing: notifications.filter(n => n.status === 'قيد_المعالجة').length,
        };
      } catch (error) {
        console.error('Error fetching stats by region:', error);
        return {
          region: input.region || 'الكل',
          total: 0,
          approved: 0,
          rejected: 0,
          postponed: 0,
          processing: 0,
        };
      }
    }),
});
