import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { supabase } from './supabase';
import { uploadBufferToDocumentsBucket } from '../utils/storage';
import { sha256Hex } from '../utils/auditDocPatch';

export const JudgeSubmissionStatusEnum = z.enum([
  'pending',
  'in_review',
  'accepted',
  'accepted_with_notes',
  'substantive_notes',
]);
export type JudgeSubmissionStatus = z.infer<typeof JudgeSubmissionStatusEnum>;

export const JudgeDecisionEnum = z.enum([
  'accepted',
  'accepted_with_notes',
  'substantive_notes',
]);
export type JudgeDecision = z.infer<typeof JudgeDecisionEnum>;

export const VALID_TRANSITIONS: Record<JudgeSubmissionStatus, JudgeSubmissionStatus[]> = {
  pending: ['in_review', 'accepted', 'accepted_with_notes', 'substantive_notes'],
  in_review: ['accepted', 'accepted_with_notes', 'substantive_notes'],
  accepted: [], // Terminal state
  accepted_with_notes: [], // Terminal state
  substantive_notes: ['pending', 'in_review'], // Re-submitted by notary
};

/**
 * State machine guard function enforcing legal state transitions.
 * Throws TRPCError with code BAD_REQUEST on invalid state jumps.
 */
export function assertValidTransition(
  currentStatus: JudgeSubmissionStatus,
  nextStatus: JudgeSubmissionStatus
): void {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `انتقال غير مسموح به في حالة الرسم من '${currentStatus}' إلى '${nextStatus}'`,
    });
  }
}

export const ListSubmissionsInputSchema = z.object({
  sessionToken: z.string(),
  status: JudgeSubmissionStatusEnum.optional(),
  document_type: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});
export type ListSubmissionsInput = z.infer<typeof ListSubmissionsInputSchema>;

export const GetSubmissionInputSchema = z.object({
  sessionToken: z.string(),
  id: z.string().uuid(),
});
export type GetSubmissionInput = z.infer<typeof GetSubmissionInputSchema>;

export const DecideSubmissionInputSchema = z.object({
  sessionToken: z.string(),
  id: z.string().uuid(),
  decision: JudgeDecisionEnum,
  notes: z.string().optional(),
  signedPdfBase64: z.string().optional(),
});
export type DecideSubmissionInput = z.infer<typeof DecideSubmissionInputSchema>;

export interface AuthUser {
  id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
  is_active?: boolean;
}

export class JudgeDeedService {
  /**
   * Queries judge_submissions with filters, pagination, and user court scoping.
   */
  static async listSubmissions(user: AuthUser, input: Omit<ListSubmissionsInput, 'sessionToken'>) {
    if (user.role !== 'authentication_judge') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح للوصول لرواق القاضي' });
    }

    let query = supabase
      .from('judge_submissions')
      .select(
        'id, notary_user_id, notary_name, file_number, document_type, summary, status, decision, judge_notes, created_at, updated_at, decided_at, judge_user_id'
      )
      .or(`judge_user_id.is.null,judge_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (input.status) {
      query = query.eq('status', input.status);
    }

    if (input.document_type) {
      query = query.ilike('document_type', `%${input.document_type}%`);
    }

    if (input.searchQuery && input.searchQuery.trim().length > 0) {
      const q = input.searchQuery.trim();
      query = query.or(`file_number.ilike.%${q}%,notary_name.ilike.%${q}%,summary.ilike.%${q}%`);
    }

    if (input.cursor) {
      query = query.lt('created_at', input.cursor);
    }

    if (input.limit) {
      query = query.limit(input.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      notaryUserId: row.notary_user_id as string,
      notaryName: row.notary_name as string,
      fileNumber: (row.file_number ?? '') as string,
      documentType: (row.document_type ?? '') as string,
      summary: (row.summary ?? '') as string,
      status: row.status as JudgeSubmissionStatus,
      decision: (row.decision ?? null) as JudgeDecision | null,
      judgeNotes: (row.judge_notes ?? null) as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      decidedAt: (row.decided_at ?? null) as string | null,
      judgeUserId: (row.judge_user_id ?? null) as string | null,
    }));
  }

  /**
   * Queries judge_submissions joined with attachments.
   * Enforces auto-advance: if fetched status is 'pending', automatically mutates to 'in_review'.
   */
  static async getSubmission(user: AuthUser, id: string) {
    if (user.role !== 'authentication_judge') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
    }

    const { data, error } = await supabase
      .from('judge_submissions')
      .select(
        'id, notary_user_id, notary_name, file_number, document_type, summary, payload, status, decision, judge_notes, created_at, updated_at, decided_at, judge_user_id'
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'الرسم القضائي غير موجود' });
    }

    // Auto-advance logic: If pending, automatically update status to 'in_review'
    let currentStatus = data.status as JudgeSubmissionStatus;
    let currentJudgeUserId = data.judge_user_id as string | null;

    if (currentStatus === 'pending') {
      const now = new Date().toISOString();
      const updateRes = await supabase
        .from('judge_submissions')
        .update({
          status: 'in_review',
          judge_user_id: user.id,
          updated_at: now,
        })
        .eq('id', id);

      if (!updateRes.error) {
        currentStatus = 'in_review';
        currentJudgeUserId = user.id;
        data.updated_at = now;
      }
    }

    // Gather Attachments and Preview URL
    let previewUrl: string | null = null;
    let previewName: string | null = null;
    let previewMimeType: string | null = null;
    let savedRasmId: string | null = null;
    let savedRasmLatestDraftVersionId: string | null = null;
    let savedRasmLatestDraftDocxUrl: string | null = null;
    let savedRasmAttachments: Array<{
      id: string;
      category: string;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      fileSize: number | null;
      metadata: Record<string, unknown> | null;
    }> = [];

    const payloadObject = ((data.payload ?? {}) as Record<string, unknown>);
    const savedRasmIdRaw = payloadObject?.savedRasmId;
    if (typeof savedRasmIdRaw === 'string' && savedRasmIdRaw) {
      savedRasmId = savedRasmIdRaw;
      const { data: savedRasmRow } = await supabase
        .from('saved_rasms')
        .select('id, state')
        .eq('id', savedRasmIdRaw)
        .maybeSingle();

      if (savedRasmRow?.state && typeof savedRasmRow.state === 'object') {
        const stateObj = savedRasmRow.state as Record<string, unknown>;
        if (typeof stateObj.latestDraftVersionId === 'string') {
          savedRasmLatestDraftVersionId = stateObj.latestDraftVersionId;
        }
        if (typeof stateObj.latestDraftDocxUrl === 'string') {
          savedRasmLatestDraftDocxUrl = stateObj.latestDraftDocxUrl;
        }
      }

      const { data: attachmentsData } = await supabase
        .from('deed_attachments')
        .select('id, category, file_name, file_url, mime_type, file_size, metadata')
        .eq('record_type', 'saved_rasm')
        .eq('record_id', savedRasmIdRaw);

      if (attachmentsData && Array.isArray(attachmentsData)) {
        savedRasmAttachments = attachmentsData.map((att: any) => ({
          id: String(att.id),
          category: String(att.category || 'document'),
          fileName: String(att.file_name || 'attachment'),
          fileUrl: String(att.file_url || ''),
          mimeType: att.mime_type ? String(att.mime_type) : null,
          fileSize: typeof att.file_size === 'number' ? att.file_size : null,
          metadata: (att.metadata ?? null) as Record<string, unknown> | null,
        }));
      }
    }

    // Check signed deed attachments if present
    const signedDeedIdRaw = payloadObject?.signedDeedId;
    const signedDeedId = typeof signedDeedIdRaw === 'string' && signedDeedIdRaw ? signedDeedIdRaw : null;
    if (signedDeedId) {
      const { data: signedAttachments } = await supabase
        .from('deed_attachments')
        .select('id, category, file_name, file_url, mime_type, file_size, metadata')
        .eq('record_type', 'signed_deed')
        .eq('record_id', signedDeedId);

      if (signedAttachments && Array.isArray(signedAttachments)) {
        signedAttachments.forEach((att: any) => {
          if (!savedRasmAttachments.some((x) => x.fileUrl === att.file_url)) {
            savedRasmAttachments.push({
              id: String(att.id),
              category: String(att.category || 'document'),
              fileName: String(att.file_name || 'attachment'),
              fileUrl: String(att.file_url || ''),
              mimeType: att.mime_type ? String(att.mime_type) : null,
              fileSize: typeof att.file_size === 'number' ? att.file_size : null,
              metadata: (att.metadata ?? null) as Record<string, unknown> | null,
            });
          }
        });
      }
    }

    // Direct attachments for this judge submission
    const { data: directSubmissionAttachments } = await supabase
      .from('deed_attachments')
      .select('id, category, file_name, file_url, mime_type, file_size, metadata')
      .eq('record_type', 'judge_submission')
      .eq('record_id', id);

    if (directSubmissionAttachments && Array.isArray(directSubmissionAttachments)) {
      directSubmissionAttachments.forEach((att: any) => {
        if (!savedRasmAttachments.some((x) => x.fileUrl === att.file_url)) {
          savedRasmAttachments.push({
            id: String(att.id),
            category: String(att.category || 'document'),
            fileName: String(att.file_name || 'attachment'),
            fileUrl: String(att.file_url || ''),
            mimeType: att.mime_type ? String(att.mime_type) : null,
            fileSize: typeof att.file_size === 'number' ? att.file_size : null,
            metadata: (att.metadata ?? null) as Record<string, unknown> | null,
          });
        }
      });
    }

    // Embedded payload attachments & files
    const payloadAttachments = Array.isArray(payloadObject?.attachments)
      ? (payloadObject.attachments as any[])
      : [];

    const extraPayloadFiles = [
      payloadObject?.attachment,
      payloadObject?.judgeAttachment,
      payloadObject?.manualRasmFile,
      payloadObject?.judgeAcceptedDoc,
      payloadObject?.baseDoc,
      ...(Array.isArray(payloadObject?.files) ? payloadObject.files : []),
      ...payloadAttachments,
    ].filter(Boolean);

    extraPayloadFiles.forEach((f: any, idx: number) => {
      const name = String(f.name || f.fileName || f.filename || `مرفق_${idx + 1}`);
      const mime = f.type || f.mimeType || f.mime_type || null;
      let url = String(f.url || f.fileUrl || f.file_url || f.publicUrl || '').trim();
      if (!url && typeof f.base64 === 'string' && f.base64.trim()) {
        const b64 = f.base64.trim();
        url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
      }

      if (url && !savedRasmAttachments.some((x) => (x.fileUrl && x.fileUrl === url) || (x.fileName === name && x.fileSize === f.size))) {
        savedRasmAttachments.push({
          id: String(f.id || `payload_att_${idx}`),
          category: String(f.category || f.field || 'attachment'),
          fileName: name,
          fileUrl: url,
          mimeType: mime ? String(mime) : null,
          fileSize: typeof f.size === 'number' ? f.size : (typeof f.fileSize === 'number' ? f.fileSize : null),
          metadata: {
            field: f.field,
            source: 'payload_submission',
            ...(f.metadata || {}),
          },
        });
      }
    });

    if (savedRasmAttachments.length > 0) {
      const pdfAttachment = savedRasmAttachments.find((att) => {
        const mime = (att.mimeType || '').toLowerCase();
        const name = (att.fileName || '').toLowerCase();
        const url = (att.fileUrl || '').toLowerCase();
        return mime.includes('pdf') || name.endsWith('.pdf') || url.includes('.pdf');
      });
      if (pdfAttachment?.fileUrl) {
        previewUrl = String(pdfAttachment.fileUrl);
        previewName = pdfAttachment.fileName || 'rasm.pdf';
        previewMimeType = pdfAttachment.mimeType || 'application/pdf';
      }
    }

    return {
      id: data.id as string,
      notaryUserId: data.notary_user_id as string,
      notaryName: data.notary_name as string,
      fileNumber: (data.file_number ?? '') as string,
      documentType: (data.document_type ?? '') as string,
      summary: (data.summary ?? '') as string,
      payload: payloadObject,
      status: currentStatus,
      decision: (data.decision ?? null) as JudgeDecision | null,
      judgeNotes: (data.judge_notes ?? null) as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      decidedAt: (data.decided_at ?? null) as string | null,
      judgeUserId: currentJudgeUserId,
      previewUrl,
      previewName,
      previewMimeType,
      savedRasmId,
      savedRasmLatestDraftVersionId,
      savedRasmLatestDraftDocxUrl,
      savedRasmAttachments,
    };
  }

  /**
   * Executes atomic decision recording with strict state transition validation.
   */
  static async decideSubmission(
    user: AuthUser,
    input: Omit<DecideSubmissionInput, 'sessionToken'>
  ) {
    if (user.role !== 'authentication_judge') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح للبت في الرسم' });
    }

    // 1. Fetch current submission
    const { data: existing, error: fetchError } = await supabase
      .from('judge_submissions')
      .select('id, status, decision, payload, file_number, judge_user_id')
      .eq('id', input.id)
      .single();

    if (fetchError || !existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'الرسم غير موجود أو تم حذفه' });
    }

    const currentStatus = existing.status as JudgeSubmissionStatus;

    // 2. Validate state machine transition guard
    assertValidTransition(currentStatus, input.decision);

    const now = new Date().toISOString();
    const nextStatus: JudgeSubmissionStatus = input.decision;

    // 3. Atomic Database Update
    const { data, error } = await supabase
      .from('judge_submissions')
      .update({
        status: nextStatus,
        decision: input.decision,
        judge_user_id: user.id,
        judge_notes: input.notes ?? null,
        decided_at: now,
        updated_at: now,
      })
      .eq('id', input.id)
      .select('id, status, decision, judge_notes, updated_at, decided_at, payload')
      .single();

    if (error || !data) {
      console.error('Supabase update error during decideSubmission:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'فشل تحديث قرار الرسم القضائي',
      });
    }

    const submissionPayload =
      data && typeof (data as any).payload === 'object'
        ? ((data as any).payload as Record<string, unknown>)
        : null;
    const signedDeedIdRaw = submissionPayload?.signedDeedId;
    const signedDeedId = typeof signedDeedIdRaw === 'string' && signedDeedIdRaw ? signedDeedIdRaw : null;
    let signedPdfUrl: string | null = null;

    if (signedDeedId) {
      if (input.signedPdfBase64) {
        try {
          const signedPdfBuffer = Buffer.from(input.signedPdfBase64, 'base64');
          const signedPdfSha = sha256Hex(signedPdfBuffer);
          const uploaded = await uploadBufferToDocumentsBucket({
            path: `judge-submissions/${input.id}/judge-signed-${signedPdfSha}.pdf`,
            buffer: signedPdfBuffer,
            contentType: 'application/pdf',
            upsert: true,
          });

          signedPdfUrl = uploaded.url;

          const signedAttachment = {
            name: `judge-signed-${input.id}.pdf`,
            fileName: `judge-signed-${input.id}.pdf`,
            url: uploaded.url,
            mimeType: 'application/pdf',
            category: 'judge_signed_pdf',
            file_url: uploaded.url,
            storagePath: uploaded.path,
            storage_path: uploaded.path,
          };

          const existingAttachments = Array.isArray(submissionPayload?.attachments)
            ? [...(submissionPayload?.attachments as any[])]
            : [];
          const filteredAttachments = existingAttachments.filter((raw: any) => {
            const category = String(raw?.category || '').toLowerCase();
            return category !== 'judge_signed_pdf';
          });

          const payloadNext = {
            ...(submissionPayload || {}),
            judgeSignedDoc: signedAttachment,
            attachments: [signedAttachment, ...filteredAttachments],
          };

          await supabase
            .from('judge_submissions')
            .update({ payload: payloadNext })
            .eq('id', input.id);

          await supabase
            .from('deed_attachments')
            .delete()
            .eq('record_type', 'signed_deed')
            .eq('record_id', signedDeedId)
            .eq('category', 'judge_signed_pdf');

          await supabase.from('deed_attachments').insert({
            record_id: signedDeedId,
            record_type: 'signed_deed',
            category: 'judge_signed_pdf',
            file_name: signedAttachment.fileName,
            file_url: uploaded.url,
            storage_path: uploaded.path,
            mime_type: 'application/pdf',
            file_size: signedPdfBuffer.length,
            metadata: {
              sha256: signedPdfSha,
              source: 'JudgeDeedService.decideSubmission',
              judgeSubmissionId: input.id,
            },
          });
        } catch (signErr: any) {
          console.error('Signed PDF error:', signErr);
        }
      }

      const nextStage =
        input.decision === 'accepted' || input.decision === 'accepted_with_notes'
          ? 'judge_endorsed'
          : 'pending_judge_endorsement';

      try {
        await supabase
          .from('final_secure_archives')
          .update({ current_stage: nextStage })
          .eq('signed_deed_id', signedDeedId);
      } catch {}

      try {
        await supabase.from('archive_operation_logs').insert({
          signed_deed_id: signedDeedId,
          action_type:
            input.decision === 'accepted' || input.decision === 'accepted_with_notes'
              ? 'JUDGE_ENDORSED'
              : 'JUDGE_REVIEW_NOTES',
          timestamp: now,
          user_id: user.id,
          device: null,
          ip: null,
          previous_hash: null,
          new_hash: null,
          metadata: {
            judgeSubmissionId: input.id,
            decision: input.decision,
            notes: input.notes ?? null,
          },
        });
      } catch {}
    }

    return {
      success: true,
      id: data.id as string,
      status: data.status as JudgeSubmissionStatus,
      decision: (data.decision ?? null) as JudgeDecision | null,
      judgeNotes: (data.judge_notes ?? null) as string | null,
      updatedAt: data.updated_at as string,
      decidedAt: (data.decided_at ?? null) as string | null,
      signedPdfUrl,
    };
  }
}
