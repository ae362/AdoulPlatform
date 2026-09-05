import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { createSignedRecordingDownloadUrl, createSignedRecordingUploadUrl, getRecordingsBucketName } from '../utils/recordingsStorage';
import { sendEmail } from '../services/email';
import { publicProcedure, router } from './trpc';

type AuthUser = { id: string; role: string; is_active: boolean };

function formatSupabaseError(err: any) {
  if (!err) return '';
  const code = err.code ? ` (${err.code})` : '';
  const message = err.message ? String(err.message) : String(err);
  const details = err.details ? ` | details: ${err.details}` : '';
  const hint = err.hint ? ` | hint: ${err.hint}` : '';
  return `${message}${code}${details}${hint}`.trim();
}

async function requireUser(sessionToken: string): Promise<AuthUser> {
  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('session_token', sessionToken)
    .single();

  if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', session.user_id)
    .single();

  if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
  return user;
}

function requireRole(user: AuthUser, allowed: string[]) {
  if (!allowed.includes(user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

function randomSessionNumber(now = new Date()) {
  const year = now.getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000);
  return `RH-${year}-${String(rand).padStart(6, '0')}`;
}

const statusSchema = z.enum(['scheduled', 'waiting_identity', 'in_progress', 'paused', 'completed', 'cancelled']);
const reminderChannelSchema = z.enum(['in_app', 'sms', 'email']);

function extensionFromMime(mimeType: string) {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('ogg')) return 'ogg';
  return 'bin';
}

async function requireSessionAccess(user: AuthUser, sessionId: string) {
  const { data: session, error } = await supabase
    .from('remote_hearing_sessions')
    .select('id, notary1_user_id, notary2_user_id, created_by_user_id, assigned_judge_user_id')
    .eq('id', sessionId)
    .single();
  if (error || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

  const isNotary =
    user.role === 'notary' && (session.notary1_user_id === user.id || session.notary2_user_id === user.id || session.created_by_user_id === user.id);
  const isJudge = user.role === 'authentication_judge' && session.assigned_judge_user_id === user.id;
  const isOversight = user.role === 'regional_adoul_council' || user.role === 'national_notary_authority';

  let isCollaborator = false;
  if (!isNotary && user.role === 'notary') {
    const { data: collab } = await supabase
      .from('remote_hearing_collaborators')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();
    isCollaborator = !!collab;
  }

  if (!isNotary && !isJudge && !isOversight && !isCollaborator) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

  return session;
}

async function requireSessionOwnerNotary(user: AuthUser, sessionId: string) {
  const { data: session, error } = await supabase
    .from('remote_hearing_sessions')
    .select('id, notary1_user_id, notary2_user_id, created_by_user_id')
    .eq('id', sessionId)
    .single();
  if (error || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
  const isOwner = user.role === 'notary' && (session.notary1_user_id === user.id || session.notary2_user_id === user.id || session.created_by_user_id === user.id);
  if (!isOwner) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
  return session;
}

export const remoteNotarialHearingRouter = router({
  meetingJoinInfo: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        meetingToken: z.string().optional().nullable(),
        joinToken: z.string().optional().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const meetingToken = (input.meetingToken || '').trim();
      const joinToken = (input.joinToken || '').trim();

      if (!meetingToken && !joinToken) {
        return { ok: false as const, reason: 'Missing token', suggestedDisplayName: null as string | null };
      }

      if (meetingToken) {
        const { data: session, error } = await supabase
          .from('remote_hearing_sessions')
          .select('id, meeting_join_enabled, meeting_join_token, meeting_join_expires_at')
          .eq('id', input.sessionId)
          .single();
        if (error || !session) return { ok: false as const, reason: 'Session not found', suggestedDisplayName: null as string | null };
        if (!session.meeting_join_enabled) return { ok: false as const, reason: 'Meeting link disabled', suggestedDisplayName: null as string | null };
        if (!session.meeting_join_token || session.meeting_join_token !== meetingToken) {
          return { ok: false as const, reason: 'Invalid meeting token', suggestedDisplayName: null as string | null };
        }
        if (session.meeting_join_expires_at && new Date(session.meeting_join_expires_at).getTime() < Date.now()) {
          return { ok: false as const, reason: 'Meeting link expired', suggestedDisplayName: null as string | null };
        }
        return { ok: true as const, reason: null as string | null, suggestedDisplayName: null as string | null };
      }

      const { data: participant, error } = await supabase
        .from('remote_hearing_participants')
        .select('id, session_id, full_name')
        .eq('join_token', joinToken)
        .single();
      if (error || !participant) return { ok: false as const, reason: 'Invalid join token', suggestedDisplayName: null as string | null };
      if (participant.session_id !== input.sessionId) return { ok: false as const, reason: 'Token session mismatch', suggestedDisplayName: null as string | null };

      return { ok: true as const, reason: null as string | null, suggestedDisplayName: participant.full_name || null };
    }),

  createSession: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        scheduledAt: z.string(), // ISO
        sessionNumber: z.string().min(3).max(64).optional(),
        assignedJudgeUserId: z.string().uuid().optional().nullable(),
        legalReference: z.string().max(1000).optional().nullable(),
        notary2UserId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const scheduledAt = new Date(input.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid scheduledAt' });
      }

      let sessionNumber = input.sessionNumber?.trim() || randomSessionNumber(scheduledAt);
      // attempt to avoid collisions
      for (let i = 0; i < 3; i += 1) {
        const { data: existing } = await supabase
          .from('remote_hearing_sessions')
          .select('id')
          .eq('session_number', sessionNumber)
          .maybeSingle();
        if (!existing) break;
        sessionNumber = randomSessionNumber(scheduledAt);
      }

      const { data, error } = await supabase
        .from('remote_hearing_sessions')
        .insert({
          session_number: sessionNumber,
          created_by_user_id: user.id,
          notary1_user_id: user.id,
          notary2_user_id: input.notary2UserId ?? null,
          assigned_judge_user_id: input.assignedJudgeUserId ?? null,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
          legal_reference: input.legalReference ?? null,
          metadata: null,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: data.id,
        actor_user_id: user.id,
        event_type: 'session_created',
        payload: { scheduledAt: data.scheduled_at },
      });

      return { session: data };
    }),

  listSessions: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        status: statusSchema.optional().nullable(),
        limit: z.number().int().min(1).max(200).optional().nullable(),
        offset: z.number().int().min(0).optional().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge', 'regional_adoul_council', 'national_notary_authority']);

      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;

      let query = supabase.from('remote_hearing_sessions').select('*').order('scheduled_at', { ascending: false });

      if (user.role === 'notary') {
        const { data: accepted } = await supabase
          .from('remote_hearing_collaborators')
          .select('session_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');
        const acceptedIds = (accepted ?? []).map((c: any) => c.session_id).filter(Boolean);
        const inClause = acceptedIds.length ? `,id.in.(${acceptedIds.join(',')})` : '';
        query = query.or(`notary1_user_id.eq.${user.id},notary2_user_id.eq.${user.id},created_by_user_id.eq.${user.id}${inClause}`);
      } else if (user.role === 'authentication_judge') {
        query = query.eq('assigned_judge_user_id', user.id);
      }

      if (input.status) query = query.eq('status', input.status);

      const { data, error } = await query.range(offset, offset + limit - 1);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { sessions: data ?? [] };
    }),

  getSession: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge', 'regional_adoul_council', 'national_notary_authority']);

      const { data: session, error } = await supabase
        .from('remote_hearing_sessions')
        .select('*')
        .eq('id', input.sessionId)
        .single();
      if (error || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (user.role === 'notary') {
        const isOwner = session.notary1_user_id === user.id || session.notary2_user_id === user.id || session.created_by_user_id === user.id;
        if (!isOwner) {
          const { data: collab } = await supabase
            .from('remote_hearing_collaborators')
            .select('id')
            .eq('session_id', input.sessionId)
            .eq('user_id', user.id)
            .eq('status', 'accepted')
            .maybeSingle();
          if (!collab) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

      const [{ data: participants }, { data: identityChecks }, { data: recordings }, { data: reminders }] = await Promise.all([
        supabase.from('remote_hearing_participants').select('*').eq('session_id', input.sessionId).order('created_at', { ascending: true }),
        supabase.from('remote_hearing_identity_checks').select('*').eq('session_id', input.sessionId).order('created_at', { ascending: true }),
        supabase.from('remote_hearing_recordings').select('*').eq('session_id', input.sessionId).order('created_at', { ascending: false }),
        supabase.from('remote_hearing_reminders').select('*').eq('session_id', input.sessionId).order('scheduled_for', { ascending: true }),
      ]);

      return {
        session,
        participants: participants ?? [],
        identityChecks: identityChecks ?? [],
        recordings: recordings ?? [],
        reminders: reminders ?? [],
      };
    }),

  listCollaborators: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge', 'regional_adoul_council', 'national_notary_authority']);
      await requireSessionAccess(user, input.sessionId);

      const { data, error } = await supabase
        .from('remote_hearing_collaborators')
        .select('id, user_id, collaborator_role, status, created_at, users:users(id, full_name, email, role)')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      const collaborators =
        (data ?? []).map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          role: c.collaborator_role,
          status: c.status,
          fullName: c.users?.full_name ?? null,
          email: c.users?.email ?? null,
        })) ?? [];

      return { collaborators };
    }),

  inviteNotaryCollaborator: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);
      await requireSessionOwnerNotary(user, input.sessionId);

      const email = input.email.trim().toLowerCase();
      const { data: target, error: uErr } = await supabase
        .from('users')
        .select('id, role, full_name, email, is_active')
        .eq('email', email)
        .single();
      if (uErr || !target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Notary not found' });
      if (target.role !== 'notary') throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is not a notary' });
      if (!target.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'Notary is inactive' });
      if (target.id === user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot invite yourself' });

      const { data: inserted, error } = await supabase
        .from('remote_hearing_collaborators')
        .upsert(
          { session_id: input.sessionId, user_id: target.id, collaborator_role: 'notary', invited_by_user_id: user.id, status: 'pending' },
          { onConflict: 'session_id,user_id' },
        )
        .select('id, session_id, user_id, collaborator_role')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'collaborator_invited',
        payload: { userId: target.id, email: target.email },
      });

      const jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
      const roomName = `rnh-${input.sessionId}`;
      const jitsiUrl = `https://${jitsiDomain}/${roomName}`;

      let emailSent = false;
      let emailError: string | null = null;
      try {
        await sendEmail({
          to: target.email,
          subject: 'دعوة للانضمام إلى جلسة التلقي عن بُعد (Jitsi)',
          text: `تمت دعوتك للانضمام إلى جلسة التلقي عن بُعد.\n\nرابط المكالمة:\n${jitsiUrl}\n\nرقم الجلسة: ${input.sessionId}\n`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7">
              <h2 style="margin:0 0 12px 0">دعوة للانضمام إلى جلسة التلقي عن بُعد</h2>
              <p>تمت دعوتك للانضمام إلى مكالمة فيديو/صوت عبر Jitsi.</p>
              <p><b>رابط المكالمة:</b></p>
              <p><a href="${jitsiUrl}" target="_blank" rel="noopener noreferrer">${jitsiUrl}</a></p>
              <p style="color:#64748b;font-size:12px">Room: ${roomName}</p>
            </div>
          `.trim(),
        });
        emailSent = true;
      } catch (e: any) {
        emailError = e?.message || String(e);
      }

      return { collaborator: inserted, jitsiUrl, emailSent, emailError };
    }),

  listMyInvitations: publicProcedure
    .input(z.object({ sessionToken: z.string(), status: z.enum(['pending', 'accepted', 'declined']).optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const status = input.status ?? 'pending';
      const { data: rows, error } = await supabase
        .from('remote_hearing_collaborators')
        .select('id, session_id, status, created_at, invited_by_user_id')
        .eq('user_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      const sessionIds = Array.from(new Set((rows ?? []).map((r: any) => r.session_id).filter(Boolean)));
      const inviterIds = Array.from(new Set((rows ?? []).map((r: any) => r.invited_by_user_id).filter(Boolean)));

      const [{ data: sessions }, { data: inviters }] = await Promise.all([
        sessionIds.length ? supabase.from('remote_hearing_sessions').select('id, session_number, scheduled_at, status').in('id', sessionIds) : Promise.resolve({ data: [] as any[] }),
        inviterIds.length ? supabase.from('users').select('id, full_name, email').in('id', inviterIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const sessionById = new Map((sessions ?? []).map((s: any) => [s.id, s]));
      const inviterById = new Map((inviters ?? []).map((u: any) => [u.id, u]));

      const invitations =
        (rows ?? []).map((row: any) => {
          const s = sessionById.get(row.session_id);
          const u = inviterById.get(row.invited_by_user_id);
          return {
            id: row.id,
            sessionId: row.session_id,
            status: row.status,
            createdAt: row.created_at,
            session: s
              ? { id: s.id, sessionNumber: s.session_number, scheduledAt: s.scheduled_at, status: s.status }
              : null,
            invitedBy: u ? { fullName: u.full_name ?? null, email: u.email ?? null } : null,
          };
        }) ?? [];

      return { invitations };
    }),

  listOutgoingInvitations: publicProcedure
    .input(z.object({ sessionToken: z.string(), limit: z.number().int().min(1).max(200).optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const limit = input.limit ?? 100;
      const { data: rows, error } = await supabase
        .from('remote_hearing_collaborators')
        .select('id, session_id, user_id, status, created_at')
        .eq('invited_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      const sessionIds = Array.from(new Set((rows ?? []).map((r: any) => r.session_id).filter(Boolean)));
      const invitedIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean)));

      const [{ data: sessions }, { data: invitedUsers }] = await Promise.all([
        sessionIds.length ? supabase.from('remote_hearing_sessions').select('id, session_number, scheduled_at, status').in('id', sessionIds) : Promise.resolve({ data: [] as any[] }),
        invitedIds.length ? supabase.from('users').select('id, full_name, email').in('id', invitedIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const sessionById = new Map((sessions ?? []).map((s: any) => [s.id, s]));
      const invitedById = new Map((invitedUsers ?? []).map((u: any) => [u.id, u]));

      const invitations =
        (rows ?? []).map((row: any) => {
          const s = sessionById.get(row.session_id);
          const u = invitedById.get(row.user_id);
          return {
            id: row.id,
            sessionId: row.session_id,
            status: row.status,
            createdAt: row.created_at,
            invitedUser: u ? { fullName: u.full_name ?? null, email: u.email ?? null, userId: row.user_id } : { fullName: null, email: null, userId: row.user_id },
            session: s
              ? { id: s.id, sessionNumber: s.session_number, scheduledAt: s.scheduled_at, status: s.status }
              : null,
          };
        }) ?? [];

      return { invitations };
    }),

  acceptInvitation: publicProcedure
    .input(z.object({ sessionToken: z.string(), invitationId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: inv, error: fetchError } = await supabase
        .from('remote_hearing_collaborators')
        .select('*')
        .eq('id', input.invitationId)
        .single();
      if (fetchError || !inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      if (inv.user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      if (inv.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation already responded' });

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('remote_hearing_collaborators')
        .update({ status: 'accepted', responded_at: now, accepted_at: now })
        .eq('id', input.invitationId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: inv.session_id,
        actor_user_id: user.id,
        event_type: 'collaborator_accepted',
        payload: { invitationId: input.invitationId, invitedByUserId: inv.invited_by_user_id },
      });

      if (inv.invited_by_user_id) {
        await supabase.from('remote_hearing_reminders').insert({
          session_id: inv.session_id,
          reminder_kind: 'collaborator_accepted',
          channel: 'in_app',
          target_user_id: inv.invited_by_user_id,
          message: 'تم قبول دعوة حضور الجلسة من قبل العدل المدعو. يمكنك الدخول إلى جلسة التلقي الآن.',
          scheduled_for: new Date().toISOString(),
          status: 'scheduled',
        });
      }

      return { ok: true, sessionId: inv.session_id, invitation: data };
    }),

  declineInvitation: publicProcedure
    .input(z.object({ sessionToken: z.string(), invitationId: z.string().uuid(), reason: z.string().max(1000).optional().nullable() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: inv, error: fetchError } = await supabase
        .from('remote_hearing_collaborators')
        .select('*')
        .eq('id', input.invitationId)
        .single();
      if (fetchError || !inv) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      if (inv.user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      if (inv.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation already responded' });

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('remote_hearing_collaborators')
        .update({ status: 'declined', responded_at: now, declined_at: now })
        .eq('id', input.invitationId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: inv.session_id,
        actor_user_id: user.id,
        event_type: 'collaborator_declined',
        payload: { invitationId: input.invitationId, invitedByUserId: inv.invited_by_user_id, reason: input.reason ?? null },
      });

      if (inv.invited_by_user_id) {
        await supabase.from('remote_hearing_reminders').insert({
          session_id: inv.session_id,
          reminder_kind: 'collaborator_declined',
          channel: 'in_app',
          target_user_id: inv.invited_by_user_id,
          message: 'تم رفض دعوة حضور الجلسة من قبل العدل المدعو. يمكنك إرسال دعوة جديدة أو التواصل معه.',
          scheduled_for: new Date().toISOString(),
          status: 'scheduled',
        });
      }

      return { ok: true, invitation: data };
    }),

  removeCollaborator: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);
      await requireSessionOwnerNotary(user, input.sessionId);

      const { error } = await supabase
        .from('remote_hearing_collaborators')
        .delete()
        .eq('session_id', input.sessionId)
        .eq('user_id', input.userId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'collaborator_removed',
        payload: { userId: input.userId },
      });

      return { ok: true };
    }),

  updateSession: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        scheduledAt: z.string().optional().nullable(),
        assignedJudgeUserId: z.string().uuid().optional().nullable(),
        legalReference: z.string().max(1000).optional().nullable(),
        notary2UserId: z.string().uuid().optional().nullable(),
        status: statusSchema.optional().nullable(),
        decisionResult: z.string().max(200).optional().nullable(),
        decisionNotes: z.string().max(5000).optional().nullable(),
        referralTargets: z.any().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data: session, error: fetchError } = await supabase
        .from('remote_hearing_sessions')
        .select('*')
        .eq('id', input.sessionId)
        .single();
      if (fetchError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (user.role === 'notary' && session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : session.scheduled_at;
      if (input.assignedJudgeUserId !== undefined) patch.assigned_judge_user_id = input.assignedJudgeUserId ?? null;
      if (input.legalReference !== undefined) patch.legal_reference = input.legalReference ?? null;
      if (input.notary2UserId !== undefined) patch.notary2_user_id = input.notary2UserId ?? null;
      if (input.status) patch.status = input.status;
      if (input.decisionResult !== undefined) patch.decision_result = input.decisionResult ?? null;
      if (input.decisionNotes !== undefined) patch.decision_notes = input.decisionNotes ?? null;
      if (input.referralTargets !== undefined) patch.referral_targets = input.referralTargets ?? null;

      if (patch.status && patch.status !== session.status) {
        if (patch.status === 'in_progress' && !session.started_at) patch.started_at = new Date().toISOString();
        if (patch.status === 'completed' && !session.ended_at) patch.ended_at = new Date().toISOString();
      }

      const { data: updated, error } = await supabase
        .from('remote_hearing_sessions')
        .update(patch)
        .eq('id', input.sessionId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      if (patch.status && patch.status !== session.status) {
        await supabase.from('remote_hearing_events').insert({
          session_id: input.sessionId,
          actor_user_id: user.id,
          event_type: 'status_changed',
          payload: { from: session.status, to: patch.status },
        });
      }

      return { session: updated };
    }),

  setScenarioPlan: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid(), plan: z.union([z.literal(1), z.literal(2)]) }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: session, error: fetchError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id, scenario_plan')
        .eq('id', input.sessionId)
        .single();
      if (fetchError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      if (session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const { data, error } = await supabase
        .from('remote_hearing_sessions')
        .update({ scenario_plan: input.plan, updated_at: new Date().toISOString() })
        .eq('id', input.sessionId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'scenario_selected',
        payload: { plan: input.plan },
      });

      return { session: data };
    }),

  upsertParticipants: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        participants: z.array(
          z.object({
            id: z.string().uuid().optional(),
            participantRole: z.string().min(2).max(32).default('party'),
            attendanceMode: z.string().min(2).max(32).default('remote'),
            fullName: z.string().min(1).max(200),
            nationalId: z.string().max(64).optional().nullable(),
            phone: z.string().max(64).optional().nullable(),
            email: z.string().max(200).optional().nullable(),
            capacity: z.string().max(100).optional().nullable(),
            isAdult: z.boolean().optional().nullable(),
            isRequired: z.boolean().optional().nullable(),
            absenceReason: z.string().max(2000).optional().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: session, error: fetchError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id')
        .eq('id', input.sessionId)
        .single();
      if (fetchError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      if (session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const toInsert: any[] = [];
      const toUpdate: Array<{ id: string; patch: any }> = [];

      for (const p of input.participants) {
        const shouldHaveJoinToken = p.attendanceMode === 'remote';
        const patch = {
          participant_role: p.participantRole,
          attendance_mode: p.attendanceMode,
          full_name: p.fullName,
          national_id: p.nationalId ?? null,
          phone: p.phone ?? null,
          email: p.email ?? null,
          capacity: p.capacity ?? null,
          is_adult: p.isAdult ?? null,
          is_required: p.isRequired ?? true,
          absence_reason: p.absenceReason ?? null,
          updated_at: new Date().toISOString(),
        };

        if (p.id) toUpdate.push({ id: p.id, patch });
        else {
          toInsert.push({
            session_id: input.sessionId,
            ...patch,
            join_token: shouldHaveJoinToken ? randomUUID() : null,
          });
        }
      }

      if (toInsert.length) {
        const { error } = await supabase.from('remote_hearing_participants').insert(toInsert);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      }

      for (const u of toUpdate) {
        const { data: current } = await supabase
          .from('remote_hearing_participants')
          .select('id, attendance_mode, join_token')
          .eq('id', u.id)
          .maybeSingle();

        const withTokenPatch = { ...u.patch };
        if (current && String(current.attendance_mode) === 'remote' && !current.join_token) {
          withTokenPatch.join_token = randomUUID();
        }

        const { error } = await supabase.from('remote_hearing_participants').update(withTokenPatch).eq('id', u.id);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      }

      const { data: participants, error: listError } = await supabase
        .from('remote_hearing_participants')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: true });
      if (listError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(listError) });

      const partiesCount = (participants ?? []).filter((p: any) => String(p.participant_role) === 'party').length;
      await supabase
        .from('remote_hearing_sessions')
        .update({ metadata: { partiesCount }, updated_at: new Date().toISOString() })
        .eq('id', input.sessionId);

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'participants_upserted',
        payload: { count: input.participants.length },
      });

      return { participants: participants ?? [] };
    }),

  listJoinLinks: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id, assigned_judge_user_id')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (user.role === 'notary' && session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const { data: participants, error } = await supabase
        .from('remote_hearing_participants')
        .select('id, full_name, participant_role, attendance_mode, join_token')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      const joinables = (participants ?? []).filter((p: any) => String(p.attendance_mode) === 'remote' && p.join_token);
      const links = joinables.map((p: any) => ({
        participantId: p.id,
        name: p.full_name,
        role: p.participant_role,
        joinToken: p.join_token,
        joinPath: `/remote-hearing/join?sessionId=${input.sessionId}&token=${p.join_token}`,
      }));

      return { links };
    }),

  enableMeetingLink: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        enabled: z.boolean(),
        rotateToken: z.boolean().optional().nullable(),
        expiresAt: z.string().optional().nullable(), // ISO
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id, assigned_judge_user_id, meeting_join_token')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (user.role === 'notary' && session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const shouldRotate = Boolean(input.rotateToken) || !session.meeting_join_token;
      const token = input.enabled ? (shouldRotate ? randomUUID() : session.meeting_join_token) : null;

      const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
      const { data: updated, error } = await supabase
        .from('remote_hearing_sessions')
        .update({
          meeting_join_enabled: input.enabled,
          meeting_join_token: token,
          meeting_join_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.sessionId)
        .select('id, meeting_join_enabled, meeting_join_token, meeting_join_expires_at')
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'meeting_link_updated',
        payload: { enabled: input.enabled, rotated: shouldRotate, expiresAt },
      });

      const joinPath = updated.meeting_join_token
        ? `/remote-hearing/join?sessionId=${input.sessionId}&meetingToken=${updated.meeting_join_token}`
        : null;

      return { enabled: updated.meeting_join_enabled, token: updated.meeting_join_token, expiresAt: updated.meeting_join_expires_at, joinPath };
    }),

  getMeetingLink: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id, assigned_judge_user_id, meeting_join_enabled, meeting_join_token, meeting_join_expires_at')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });

      if (user.role === 'notary' && session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const joinPath = session.meeting_join_token
        ? `/remote-hearing/join?sessionId=${input.sessionId}&meetingToken=${session.meeting_join_token}`
        : null;

      return {
        enabled: Boolean(session.meeting_join_enabled),
        token: session.meeting_join_token as string | null,
        expiresAt: session.meeting_join_expires_at as string | null,
        joinPath,
      };
    }),

  listParticipants: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id, assigned_judge_user_id')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      if (user.role === 'notary' && session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (user.role === 'authentication_judge' && session.assigned_judge_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const { data, error } = await supabase
        .from('remote_hearing_participants')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { participants: data ?? [] };
    }),

  upsertIdentityCheck: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        participantId: z.string().uuid(),
        idCardVerified: z.boolean().optional(),
        faceMatchVerified: z.boolean().optional(),
        voiceMatchVerified: z.boolean().optional(),
        docUpload: fileUploadSchema.optional().nullable(),
        livePhoto: fileUploadSchema.optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, notary1_user_id, created_by_user_id')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      if (session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      let docUploadUrl: string | null | undefined;
      let livePhotoUrl: string | null | undefined;

      try {
        if (input.docUpload) {
          const uploaded = await uploadDocument(input.docUpload);
          docUploadUrl = uploaded.url;
        }
        if (input.livePhoto) {
          const uploaded = await uploadDocument(input.livePhoto);
          livePhotoUrl = uploaded.url;
        }
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Upload failed: ${e?.message || String(e)}` });
      }

      const patch: any = {
        session_id: input.sessionId,
        participant_id: input.participantId,
        updated_at: new Date().toISOString(),
      };
      if (input.idCardVerified !== undefined) patch.id_card_verified = input.idCardVerified;
      if (input.faceMatchVerified !== undefined) patch.face_match_verified = input.faceMatchVerified;
      if (input.voiceMatchVerified !== undefined) patch.voice_match_verified = input.voiceMatchVerified;
      if (docUploadUrl !== undefined) patch.doc_upload_url = docUploadUrl;
      if (livePhotoUrl !== undefined) patch.live_photo_url = livePhotoUrl;
      if (input.notes !== undefined) patch.notes = input.notes ?? null;

      const { data: existing } = await supabase
        .from('remote_hearing_identity_checks')
        .select('id, result_status')
        .eq('session_id', input.sessionId)
        .eq('participant_id', input.participantId)
        .maybeSingle();

      const { data, error } = existing
        ? await supabase.from('remote_hearing_identity_checks').update(patch).eq('id', existing.id).select().single()
        : await supabase.from('remote_hearing_identity_checks').insert({ ...patch, result_status: 'pending' }).select().single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'identity_check_updated',
        payload: { participantId: input.participantId },
      });

      return { identityCheck: data };
    }),

  verifyIdentityResult: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        participantId: z.string().uuid(),
        resultStatus: z.enum(['passed', 'failed']),
        notes: z.string().max(4000).optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: check, error: fetchError } = await supabase
        .from('remote_hearing_identity_checks')
        .select('*')
        .eq('session_id', input.sessionId)
        .eq('participant_id', input.participantId)
        .single();
      if (fetchError || !check) throw new TRPCError({ code: 'NOT_FOUND', message: 'Identity check not found' });

      const { data, error } = await supabase
        .from('remote_hearing_identity_checks')
        .update({
          result_status: input.resultStatus,
          verified_by_user_id: user.id,
          verified_at: new Date().toISOString(),
          notes: input.notes ?? check.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', check.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'identity_verified',
        payload: { participantId: input.participantId, resultStatus: input.resultStatus },
      });

      return { identityCheck: data };
    }),

  listIdentityChecks: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { data, error } = await supabase
        .from('remote_hearing_identity_checks')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { identityChecks: data ?? [] };
    }),

  startRecording: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data, error } = await supabase
        .from('remote_hearing_recordings')
        .insert({
          session_id: input.sessionId,
          status: 'recording',
          created_by_user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: 'recording_started',
        payload: { recordingId: data.id },
      });

      return { recording: data };
    }),

  createRecordingUploadUrl: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        recordingId: z.string().uuid(),
        mimeType: z.string().min(3).max(128),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: recording, error: fetchError } = await supabase
        .from('remote_hearing_recordings')
        .select('*')
        .eq('id', input.recordingId)
        .single();
      if (fetchError || !recording) throw new TRPCError({ code: 'NOT_FOUND', message: 'Recording not found' });

      await requireSessionAccess(user, recording.session_id);

      const ext = extensionFromMime(input.mimeType);
      const path = `remote-hearings/${recording.session_id}/${recording.id}.${ext}`;

      let signed;
      try {
        signed = await createSignedRecordingUploadUrl(path);
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e?.message || String(e) });
      }

      // Persist the intended storage path early so we keep a legal link even if the upload finishes later.
      await supabase
        .from('remote_hearing_recordings')
        .update({
          storage_path: path,
          mime_type: input.mimeType,
        })
        .eq('id', input.recordingId);

      return { bucket: getRecordingsBucketName(), path: signed.path, signedUrl: signed.signedUrl };
    }),

  stopRecording: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        recordingId: z.string().uuid(),
        status: z.enum(['completed', 'failed']).default('completed'),
        failureReason: z.string().max(2000).optional().nullable(),
        file: fileUploadSchema.optional().nullable(),
        storagePath: z.string().max(2000).optional().nullable(),
        fileUrl: z.string().max(4000).optional().nullable(),
        mimeType: z.string().max(128).optional().nullable(),
        sizeBytes: z.number().int().nonnegative().optional().nullable(),
        sha256: z.string().max(128).optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: recording, error: fetchError } = await supabase
        .from('remote_hearing_recordings')
        .select('*')
        .eq('id', input.recordingId)
        .single();
      if (fetchError || !recording) throw new TRPCError({ code: 'NOT_FOUND', message: 'Recording not found' });

      let upload: { url: string; path: string } | null = null;
      if (input.file) {
        try {
          upload = await uploadDocument(input.file);
        } catch (e: any) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Upload failed: ${e?.message || String(e)}` });
        }
      }

      const { data, error } = await supabase
        .from('remote_hearing_recordings')
        .update({
          ended_at: new Date().toISOString(),
          status: input.status,
          failure_reason: input.failureReason ?? null,
          storage_path: input.storagePath ?? upload?.path ?? recording.storage_path ?? null,
          file_url: input.fileUrl ?? upload?.url ?? recording.file_url ?? null,
          mime_type: input.mimeType ?? input.file?.type ?? recording.mime_type ?? null,
          size_bytes: input.sizeBytes ?? input.file?.size ?? recording.size_bytes ?? null,
          sha256: input.sha256 ?? recording.sha256 ?? null,
        })
        .eq('id', input.recordingId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      await supabase.from('remote_hearing_events').insert({
        session_id: recording.session_id,
        actor_user_id: user.id,
        event_type: 'recording_stopped',
        payload: { recordingId: input.recordingId, status: input.status },
      });

      if (input.status === 'failed') {
        await supabase.from('remote_hearing_reminders').insert({
          session_id: recording.session_id,
          reminder_kind: 'after_recording_failed',
          channel: 'in_app',
          target_user_id: user.id,
          message: 'فشل تسجيل الجلسة. يرجى إعادة المحاولة أو توثيق سبب الفشل.',
          scheduled_for: new Date().toISOString(),
          status: 'scheduled',
        });
      }

      return { recording: data };
    }),

  getRecordingDownloadUrl: publicProcedure
    .input(z.object({ sessionToken: z.string(), recordingId: z.string().uuid(), expiresInSeconds: z.number().int().min(30).max(3600).optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge', 'regional_adoul_council', 'national_notary_authority']);

      const { data: recording, error } = await supabase.from('remote_hearing_recordings').select('*').eq('id', input.recordingId).single();
      if (error || !recording) throw new TRPCError({ code: 'NOT_FOUND', message: 'Recording not found' });

      await requireSessionAccess(user, recording.session_id);

      if (!recording.storage_path) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Recording has no storage path' });

      const expires = input.expiresInSeconds ?? 900;
      let signed;
      try {
        signed = await createSignedRecordingDownloadUrl(recording.storage_path, expires);
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e?.message || String(e) });
      }

      return { signedUrl: signed.signedUrl, expiresInSeconds: expires };
    }),

  listRecordings: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);
      const { data, error } = await supabase
        .from('remote_hearing_recordings')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { recordings: data ?? [] };
    }),

  logEvent: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        eventType: z.string().min(2).max(64),
        payload: z.any().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);

      const { error } = await supabase.from('remote_hearing_events').insert({
        session_id: input.sessionId,
        actor_user_id: user.id,
        event_type: input.eventType,
        payload: input.payload ?? null,
      });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { ok: true };
    }),

  listEvents: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid(), limit: z.number().int().min(1).max(500).optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);
      const limit = input.limit ?? 200;
      const { data, error } = await supabase
        .from('remote_hearing_events')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { events: data ?? [] };
    }),

  generateDefaultReminders: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.string().uuid(),
        channel: reminderChannelSchema.optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary']);

      const { data: session, error: sessionError } = await supabase
        .from('remote_hearing_sessions')
        .select('id, scheduled_at, notary1_user_id, created_by_user_id')
        .eq('id', input.sessionId)
        .single();
      if (sessionError || !session) throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      if (session.notary1_user_id !== user.id && session.created_by_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }

      const scheduledAt = new Date(session.scheduled_at);
      const channel = input.channel ?? 'in_app';

      const reminders = [
        {
          reminder_kind: 'before_24h',
          scheduled_for: new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          message: 'تذكير: جلسة التلقي عن بُعد بعد 24 ساعة. يرجى التأكد من تحميل بطاقة الهوية قبل 5 دقائق من بدء الجلسة.',
        },
        {
          reminder_kind: 'before_2h',
          scheduled_for: new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          message: 'تنبيه: جلسة التلقي عن بُعد بعد ساعتين. يرجى فحص جودة الاتصال والميكروفون والكاميرا.',
        },
        {
          reminder_kind: 'before_15m',
          scheduled_for: new Date(scheduledAt.getTime() - 15 * 60 * 1000).toISOString(),
          message: 'تنبيه: بقي 15 دقيقة على الجلسة. يرجى الدخول لإتمام التحقق من الهوية قبل البدء.',
        },
      ];

      // Avoid duplicates (same kind)
      await supabase.from('remote_hearing_reminders').delete().eq('session_id', input.sessionId).in('reminder_kind', reminders.map((r) => r.reminder_kind));

      const { error } = await supabase.from('remote_hearing_reminders').insert(
        reminders.map((r) => ({
          session_id: input.sessionId,
          reminder_kind: r.reminder_kind,
          channel,
          target_user_id: user.id,
          message: r.message,
          scheduled_for: r.scheduled_for,
          status: 'scheduled',
        })),
      );
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });

      return { ok: true };
    }),

  listReminders: publicProcedure
    .input(z.object({ sessionToken: z.string(), sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireRole(user, ['notary', 'authentication_judge']);
      const { data, error } = await supabase
        .from('remote_hearing_reminders')
        .select('*')
        .eq('session_id', input.sessionId)
        .order('scheduled_for', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: formatSupabaseError(error) });
      return { reminders: data ?? [] };
    }),
});
