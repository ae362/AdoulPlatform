import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';
import sanitizeHtml from 'sanitize-html';
import { sendEmail } from '../services/email';

const sessionSchema = z.object({ sessionToken: z.string() });

async function requireSession(sessionToken: string) {
  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('session_token', sessionToken)
    .single();

  if (sessionError || !session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role, full_name, email, is_active')
    .eq('id', session.user_id)
    .single();

  if (userError || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'المستخدم غير موجود' });
  }

  if (!user.is_active) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
  }

  return user as {
    id: string;
    role: 'authentication_judge' | 'notary' | 'government_authority' | 'national_notary_authority' | 'regional_adoul_council';
    full_name: string;
    email: string;
    is_active: boolean;
  };
}

function ensureMessagingRole(role: string) {
  if (role !== 'authentication_judge' && role !== 'notary' && role !== 'regional_adoul_council') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
  }
}

async function requireThreadAccess(userId: string, threadId: string) {
  const { data: thread, error } = await supabase
    .from('message_threads')
    .select('id, judge_user_id, notary_user_id, notary_partner_id, last_message_at, last_message_body, last_message_sender_id')
    .eq('id', threadId)
    .single();

  if (error || !thread) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'المحادثة غير موجودة' });
  }

  if (thread.judge_user_id !== userId && thread.notary_user_id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
  }

  return thread as any;
}

function sanitizeMessageBody(input: string) {
  const cleaned = sanitizeHtml(input, {
    allowedTags: [
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'span',
      'p',
      'br',
      'div',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'a',
    ],
    allowedAttributes: {
      span: ['style'],
      p: ['style'],
      div: ['style'],
      a: ['href', 'target', 'rel'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3}$/, /^#[0-9a-fA-F]{6}$/],
        'background-color': [/^#[0-9a-fA-F]{3}$/, /^#[0-9a-fA-F]{6}$/],
        'font-size': [/^\d{1,3}px$/],
        'text-align': [/^(right|left|center|justify)$/],
        'font-family': [/^[\w\s,'"()-]+$/],
        'font-weight': [/^(bold|bolder|[1-9]00)$/],
        'text-decoration': [/^(underline|line-through|none)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        return {
          tagName,
          attribs: {
            href,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
    },
  });

  return cleaned.trim();
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const messagingRouter = router({
  listJudges: publicProcedure
    .input(sessionSchema)
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'authentication_judge')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        fullName: row.full_name as string,
        email: row.email as string,
      }));
    }),

  listAvailableAdoul: publicProcedure
    .input(sessionSchema)
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      if (user.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }

      const { data: partners, error } = await supabase
        .from('notary_partners')
        .select('id, partner_name, position_order, is_available, notary_profile_id')
        .eq('is_available', true);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const partnerRows = (partners ?? []) as any[];
      const profileIds = Array.from(new Set(partnerRows.map((p) => p.notary_profile_id).filter(Boolean)));

      if (!profileIds.length) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('notary_profiles')
        .select('id, user_id, appellate_court, primary_court, court_name')
        .in('id', profileIds);

      if (profilesError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profilesError.message });
      }

      const profileRows = (profiles ?? []) as any[];
      const userIds = Array.from(new Set(profileRows.map((p) => p.user_id).filter(Boolean)));

      if (!userIds.length) return [];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, is_active, role')
        .in('id', userIds)
        .eq('role', 'notary')
        .eq('is_active', true);

      if (usersError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: usersError.message });
      }

      const profileById = new Map<string, any>(profileRows.map((p) => [p.id as string, p]));
      const userById = new Map<string, any>((users ?? []).map((u: any) => [u.id as string, u]));

      const rows = partnerRows
        .map((row: any) => {
          const profile = profileById.get(row.notary_profile_id as string);
          if (!profile) return null;
          const notaryUser = userById.get(profile.user_id as string);
          if (!notaryUser) return null;

          return {
            partnerId: row.id as string,
            partnerName: row.partner_name as string,
            positionOrder: row.position_order as number,
            notaryUserId: profile.user_id as string,
            notaryName: notaryUser.full_name as string,
            notaryEmail: notaryUser.email as string,
            appellateCourt: profile.appellate_court as string,
            primaryCourt: (profile.primary_court ?? null) as string | null,
            courtName: profile.court_name as string,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      rows.sort((a, b) => {
        const byName = a.notaryName.localeCompare(b.notaryName, 'ar');
        if (byName !== 0) return byName;
        return a.positionOrder - b.positionOrder;
      });

      return rows;
    }),

  createOrGetThread: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        participantUserId: z.string().uuid(),
        notaryPartnerId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      const { data: participant, error: participantError } = await supabase
        .from('users')
        .select('id, role, full_name, email, is_active')
        .eq('id', input.participantUserId)
        .single();

      if (participantError || !participant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      }
      if (!participant.is_active) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
      }

      const isJudge = user.role === 'authentication_judge';
      if (isJudge && participant.role !== 'notary') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب اختيار عدل/موثق' });
      }
      if (!isJudge && participant.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب اختيار قاضي توثيق' });
      }

      const judgeUserId = isJudge ? user.id : (participant.id as string);
      const notaryUserId = isJudge ? (participant.id as string) : user.id;
      const partnerId = isJudge ? (input.notaryPartnerId ?? null) : null;

      if (partnerId) {
        const { data: profile, error: profileError } = await supabase
          .from('notary_profiles')
          .select('id')
          .eq('user_id', notaryUserId)
          .single();

        if (profileError || !profile) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'ملف العدل غير موجود' });
        }

        const { data: partnerRow, error: partnerError } = await supabase
          .from('notary_partners')
          .select('id')
          .eq('id', partnerId)
          .eq('notary_profile_id', profile.id)
          .single();

        if (partnerError || !partnerRow) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'العدل المختار غير صالح' });
        }
      }

      let existingQuery = supabase
        .from('message_threads')
        .select('id')
        .eq('judge_user_id', judgeUserId)
        .eq('notary_user_id', notaryUserId);

      existingQuery = partnerId ? existingQuery.eq('notary_partner_id', partnerId) : existingQuery.is('notary_partner_id', null);

      const { data: existing, error: existingError } = await existingQuery.single();

      if (!existingError && existing?.id) {
        return { threadId: existing.id as string };
      }

      const { data: created, error: createError } = await supabase
        .from('message_threads')
        .insert({
          judge_user_id: judgeUserId,
          notary_user_id: notaryUserId,
          notary_partner_id: partnerId,
        })
        .select('id')
        .single();

      if (createError || !created) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: createError?.message ?? 'تعذر إنشاء المحادثة' });
      }

      return { threadId: created.id as string };
    }),

  listThreads: publicProcedure
    .input(sessionSchema)
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      const { data: threads, error } = await supabase
        .from('message_threads')
        .select(
          'id, judge_user_id, notary_user_id, notary_partner_id, last_message_at, last_message_body, last_message_sender_id, created_at, updated_at'
        )
        .or(`judge_user_id.eq.${user.id},notary_user_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const threadRows = (threads ?? []) as any[];
      const otherUserIds = Array.from(
        new Set(
          threadRows.map((t) => (user.role === 'authentication_judge' ? t.notary_user_id : t.judge_user_id)).filter(Boolean)
        )
      );
      const partnerIds = Array.from(new Set(threadRows.map((t) => t.notary_partner_id).filter(Boolean)));
      const threadIds = threadRows.map((t) => t.id as string);

      const [{ data: usersData, error: usersError }, { data: partnersData, error: partnersError }] = await Promise.all([
        otherUserIds.length
          ? supabase.from('users').select('id, full_name, email').in('id', otherUserIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
        partnerIds.length
          ? supabase.from('notary_partners').select('id, partner_name, position_order').in('id', partnerIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

      if (usersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: usersError.message });
      if (partnersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: partnersError.message });

      const otherById = new Map<string, { id: string; fullName: string; email: string }>(
        (usersData ?? []).map((u: any) => [u.id as string, { id: u.id as string, fullName: u.full_name as string, email: u.email as string }])
      );
      const partnerById = new Map<string, { id: string; partnerName: string; positionOrder: number }>(
        (partnersData ?? []).map((p: any) => [p.id as string, { id: p.id as string, partnerName: p.partner_name as string, positionOrder: p.position_order as number }])
      );

      let unreadCountsByThread = new Map<string, number>();
      if (threadIds.length) {
        const { data: unreadRows, error: unreadError } = await supabase
          .from('message_messages')
          .select('thread_id')
          .in('thread_id', threadIds)
          .is('read_at', null)
          .neq('sender_user_id', user.id);

        if (unreadError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: unreadError.message });

        unreadCountsByThread = new Map<string, number>();
        for (const r of unreadRows ?? []) {
          const id = (r as any).thread_id as string;
          unreadCountsByThread.set(id, (unreadCountsByThread.get(id) ?? 0) + 1);
        }
      }

      return threadRows.map((t) => {
        const otherId = user.role === 'authentication_judge' ? (t.notary_user_id as string) : (t.judge_user_id as string);
        const otherUser = otherById.get(otherId) ?? { id: otherId, fullName: 'مستخدم', email: '' };
        const partner = t.notary_partner_id ? partnerById.get(t.notary_partner_id as string) ?? null : null;
        const unreadCount = unreadCountsByThread.get(t.id as string) ?? 0;

        return {
          id: t.id as string,
          judgeUserId: t.judge_user_id as string,
          notaryUserId: t.notary_user_id as string,
          partner,
          otherUser,
          lastMessage: t.last_message_at
            ? {
                at: t.last_message_at as string,
                body: (t.last_message_body ?? '') as string,
                senderUserId: (t.last_message_sender_id ?? null) as string | null,
              }
            : null,
          unreadCount,
          createdAt: t.created_at as string,
          updatedAt: t.updated_at as string,
        };
      });
    }),

  getThreadMessages: publicProcedure
    .input(z.object({ sessionToken: z.string(), threadId: z.string().uuid() }))
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      const thread = await requireThreadAccess(user.id, input.threadId);

      const { data: messages, error } = await supabase
        .from('message_messages')
        .select('id, sender_user_id, body, created_at, read_at')
        .eq('thread_id', input.threadId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const now = new Date().toISOString();
      const { error: markError } = await supabase
        .from('message_messages')
        .update({ read_at: now })
        .eq('thread_id', input.threadId)
        .is('read_at', null)
        .neq('sender_user_id', user.id);

      if (markError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: markError.message });

      return {
        threadId: thread.id as string,
        messages: (messages ?? []).map((m: any) => ({
          id: m.id as string,
          senderUserId: m.sender_user_id as string,
          body: m.body as string,
          createdAt: m.created_at as string,
          readAt: (m.read_at ?? null) as string | null,
        })),
      };
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        threadId: z.string().uuid(),
        body: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      await requireThreadAccess(user.id, input.threadId);

      const safeBody = sanitizeMessageBody(input.body);
      if (!safeBody) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'نص الرسالة فارغ' });
      }

      const { data: inserted, error } = await supabase
        .from('message_messages')
        .insert({
          thread_id: input.threadId,
          sender_user_id: user.id,
          body: safeBody,
        })
        .select('id, sender_user_id, body, created_at, read_at')
        .single();

      if (error || !inserted) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'تعذر إرسال الرسالة' });
      }

      return {
        id: inserted.id as string,
        senderUserId: inserted.sender_user_id as string,
        body: inserted.body as string,
        createdAt: inserted.created_at as string,
        readAt: (inserted.read_at ?? null) as string | null,
      };
    }),

  sendEmail: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        to: z.string().email(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      ensureMessagingRole(user.role);

      const safeBody = sanitizeMessageBody(input.body);
      if (!safeBody) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'U+Oæ OU,OñO3OU,Oc U?OOñO§' });
      }

      const senderName = user.full_name || user.email || 'Adoul Platform';
      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7;">
          <div style="margin-bottom:12px;color:#334155;font-size:13px;">
            رسالة من: <strong>${senderName}</strong>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;">
            ${safeBody}
          </div>
        </div>
      `;

      const text = stripHtml(safeBody);

      try {
        const id = await sendEmail({ to: input.to, subject: input.subject, html, text });
        return {
          success: true,
          id,
          message: 'Email sent successfully',
        };
      } catch (error: any) {
        const message = String(error?.message || 'Failed to send email');
        console.error('Email send error:', { message, error });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
      }
    }),
});

export type MessagingRouter = typeof messagingRouter;
