import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { supabase } from '../../../../services/supabase';
import { uploadBufferToDocumentsBucket, uploadDocument, fileUploadSchema } from '../../../../utils/storage';
import { sha256Hex } from '../../../../utils/auditDocPatch';
import { convertDocxToPdfViaLibreOffice } from '../../../../services/auditDocArtifacts';
import {
  sanitizePersistedPayload,
  summarizeSavedRasmPayload,
  isTransportFetchFailure,
  removeSavedRasmStorageByCategory,
  listProtectedSavedRasmIds,
  savedRasmsSchemaState,
} from '../../helpers';
import {
  persistInclusionForSavedRasm,
  ensureSavedRasmHasJudgeAttachments,
  ensureSavedRasmHasJudgeAttachment,
  extractRasmFilesStoragePathFromPublicUrl,
  mergeLiveJudgeSubmissionSnapshot,
  toNonEmptyString,
  pickFirstString,
  pickFirstDate,
  extractPartiesFromPayload,
} from '../../extractors';
import { finalizeDirectDocxForSavedRasm, finalizeSigningVersionForUser } from './documentFinalizers';

async function requireNotary(sessionToken: string, message = 'Only notaries can perform this operation') {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message });
  return user;
}


export const savedRasmsProcedures = {
    saveRasm: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        fileNumber: z.string().optional(),
        documentType: z.string().optional(),
        draft: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
        files: z
          .array(fileUploadSchema.extend({
            category: z.string(),
            field: z.string().optional(),
          }))
          .optional(),
      }))
      .output(z.object({
        id: z.string(),
        createdAt: z.string(),
        attachmentsCount: z.number(),
        savedAttachmentId: z.string().nullable(),
        savedCategory: z.string().nullable(),
        savedUrl: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can save rasms');

        const { data: created, error: createError } = await supabase
          .from('saved_rasms')
          .insert({
            notary_user_id: user.id,
            notary_name: user.full_name,
            file_number: input.fileNumber ?? null,
            document_type: input.documentType ?? null,
            draft: input.draft ?? null,
            payload: sanitizePersistedPayload(input.payload ?? {}),
          })
          .select('id, created_at')
          .single();

        if (createError || !created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: createError?.message ?? 'Failed to save rasm',
          });
        }

        let attachmentsCount = 0;
        let savedAttachmentId: string | null = null;
        let savedCategory: string | null = null;
        let savedUrl: string | null = null;

        if (input.files?.length) {
          const nowIso = new Date().toISOString();

          const files = input.files;
          const canonicalDocument = files.find((f) => String(f.category || '').toLowerCase() === 'document');

          for (const f of files) {
            const category = String(f.category || '').toLowerCase();

            // Preferred mechanism: the current saved document is the Saved-Docs source-of-truth.
            if (canonicalDocument && f === canonicalDocument) {
              const fileBuffer = Buffer.from(f.base64, 'base64');
              const fileSha = sha256Hex(fileBuffer);
              const mimeType = f.type || 'application/octet-stream';
              const lowerName = String(f.name || '').toLowerCase();
              const extension = lowerName.endsWith('.docx')
                ? 'docx'
                : lowerName.endsWith('.doc')
                  ? 'doc'
                  : mimeType.includes('pdf')
                    ? 'pdf'
                    : 'bin';
              const uploaded = await uploadBufferToDocumentsBucket({
                path: `saved/${created.id}/${fileSha}.${extension}`,
                buffer: fileBuffer,
                contentType: mimeType,
                upsert: true,
              });

              const { data: inserted, error: insertError } = await supabase
                .from('deed_attachments')
                .insert({
                  record_id: created.id,
                  record_type: 'saved_rasm',
                  category: 'document',
                  file_name: f.name,
                  file_url: uploaded.url,
                  storage_path: uploaded.path,
                  mime_type: mimeType,
                  file_size: f.size ?? fileBuffer.length,
                  metadata: {
                    ...(f.field ? { field: f.field } : {}),
                    sha256: fileSha,
                    source: 'audit_hub_save',
                  },
                })
                .select('id, file_url, category')
                .single();

              if (insertError || !inserted) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError?.message ?? 'Failed to add attachment' });
              }

              attachmentsCount += 1;
              savedAttachmentId = inserted.id;
              savedCategory = inserted.category;
              savedUrl = inserted.file_url;

              const { error: pointerError } = await supabase
                .from('saved_rasms')
                .update({
                  payload: sanitizePersistedPayload({
                    ...(input.payload ?? {}),
                    latestDocumentUrl: uploaded.url,
                    latestDocumentMimeType: mimeType,
                    latestDocumentUpdatedAt: nowIso,
                    latestSavedAttachmentId: inserted.id,
                  }),
                })
                .eq('id', created.id);

              if (pointerError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pointerError.message });
              continue;
            }

            // Fallback: upload other files normally.
            const uploaded = await uploadDocument(f);
            const { error: insertError } = await supabase.from('deed_attachments').insert({
              record_id: created.id,
              record_type: 'saved_rasm',
              category: f.category,
              file_name: f.name,
              file_url: uploaded.url,
              storage_path: uploaded.path,
              mime_type: f.type ?? null,
              file_size: f.size ?? null,
              metadata: f.field ? { field: f.field } : null,
            });
            if (insertError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message });
            attachmentsCount += 1;
          }
        }

        // Best-effort: persist inclusion data from AuditHub payload into inclusion_registry + saved_rasms.inclusion_id.
        try {
          await persistInclusionForSavedRasm({
            savedRasmId: String(created.id),
            payload: sanitizePersistedPayload(input.payload ?? {}),
            existingInclusionId: null,
            fallbackNotaryName: user.full_name ?? null,
          });
        } catch {
          // non-fatal
        }

        return {
          id: created.id,
          createdAt: created.created_at,
          attachmentsCount,
          savedAttachmentId,
          savedCategory,
          savedUrl,
        };
      }),

    addSavedRasmAttachment: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        category: z.string(),
        field: z.string().optional(),
        file: fileUploadSchema,
      }))
      .output(z.object({
        attachmentId: z.string(),
        fileUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access this');

        const { data: row, error: fetchError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id')
          .eq('id', input.id)
          .single();

        if (fetchError || !row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
        if (row.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden' });

        const uploaded = await uploadDocument(input.file);
        const { data: inserted, error } = await supabase
          .from('deed_attachments')
          .insert({
            record_id: row.id,
            record_type: 'saved_rasm',
            category: input.category,
            file_name: input.file.name,
            file_url: uploaded.url,
            storage_path: uploaded.path,
            mime_type: input.file.type ?? null,
            file_size: input.file.size ?? null,
            metadata: input.field ? { field: input.field } : null,
          })
          .select('id, file_url')
          .single();

        if (error || !inserted) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to add attachment' });
        }

        return {
          attachmentId: inserted.id,
          fileUrl: inserted.file_url,
        };
      }),

    updateSavedRasm: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        documentType: z.string().optional(),
        draft: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
        files: z
          .array(fileUploadSchema.extend({
            category: z.string(),
            field: z.string().optional(),
          }))
          .optional(),
      }))
      .output(z.object({
        success: z.boolean(),
        savedAttachmentId: z.string().nullable(),
        savedCategory: z.string().nullable(),
        savedUrl: z.string().nullable(),
        previewPdfUrl: z.string().nullable().optional(),
        pdfPreviewUrl: z.string().nullable().optional(),
        previewDocxUrl: z.string().nullable().optional(),
        primaryDocxUrl: z.string().nullable().optional(),
        versionId: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const sessionUser = await resolveSessionUser(input.sessionToken);
        const sessionUserFullName: string | null = sessionUser.full_name ?? null;

        const { data: existing, error: existingError } = await supabase
          .from('saved_rasms')
          .select('payload, notary_user_id, notary_name, inclusion_id')
          .eq('id', input.id)
          .single();

        if (existingError || !existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
        
        const userFullName = String(sessionUserFullName || '').trim();
        const existingName = String((existing as any)?.notary_name || '').trim();
        const isOwner = existing.notary_user_id === sessionUser.id || 
                       (existing.notary_user_id === null && userFullName !== '' && existingName === userFullName) ||
                       (userFullName !== '' && existingName === userFullName);

        if (!isOwner) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });

        const patch: any = {};
        if (input.documentType !== undefined) patch.document_type = input.documentType;
        if (input.draft !== undefined) patch.draft = input.draft;
        if (input.payload !== undefined) {
          patch.payload = {
            ...(existing.payload as object || {}),
            ...sanitizePersistedPayload(input.payload),
          };
        }

        const { error: updateError } = await supabase
          .from('saved_rasms')
          .update(patch)
          .eq('id', input.id);

        if (updateError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });

        let savedAttachmentId: string | null = null;
        let savedCategory: string | null = null;
        let savedUrl: string | null = null;
        let previewPdfUrl: string | null = null;
        let previewDocxUrl: string | null = null;
        let versionId: string | null = null;

        // Handle file uploads if provided
        if (input.files?.length) {
          const nowIso = new Date().toISOString();
          const files = input.files;
          const canonicalDocument = files.find((f) => String(f.category || '').toLowerCase() === 'document');

          for (const f of files) {
            const fileBuffer = Buffer.from(f.base64, 'base64');
            const fileSha = sha256Hex(fileBuffer);
            const lowerName = String(f.name || '').toLowerCase();
            const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || String(f.type || '').includes('wordprocessingml');

            if (isDocx || (canonicalDocument && f === canonicalDocument)) {
              const mimeType = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : (f.type || 'application/octet-stream');
              const extension = isDocx ? 'docx' : (lowerName.endsWith('.pdf') ? 'pdf' : 'bin');
              
              // Extract text and HTML content from docx buffer if available
              let extractedDocxText: string | null = null;
              let extractedDocxHtml: string | null = null;
              if (isDocx) {
                try {
                  const PizZip = require('pizzip');
                  const zip = new PizZip(fileBuffer);
                  const docXml = zip.file('word/document.xml')?.asText();
                  if (docXml) {
                    extractedDocxText = docXml
                      .replace(/<w:p[^>]*>/g, '\n')
                      .replace(/<[^>]+>/g, '')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&apos;/g, "'")
                      .trim();
                    if (extractedDocxText) {
                      extractedDocxHtml = extractedDocxText
                        .split(/\r?\n/)
                        .map((l: string) => l.trim())
                        .filter(Boolean)
                        .map((l: string) => `<p>${l}</p>`)
                        .join('\n');
                    }
                  }
                } catch (extractErr) {
                  // eslint-disable-next-line no-console
                  console.warn('[updateSavedRasm] text extraction error:', extractErr);
                }
              }

              const uploaded = await uploadBufferToDocumentsBucket({
                path: `saved/${input.id}/${fileSha}.${extension}`,
                buffer: fileBuffer,
                contentType: mimeType,
                upsert: true,
              });

              let convertedPdfUrl: string | null = null;
              let pdfBuffer: Buffer | null = null;

              if (isDocx) {
                try {
                  const pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer: fileBuffer });
                  if (pdfRes?.pdfBuffer?.length) {
                    pdfBuffer = pdfRes.pdfBuffer;
                    const pdfSha = sha256Hex(pdfBuffer);
                    const uploadedPdf = await uploadBufferToDocumentsBucket({
                      path: `saved/${input.id}/${pdfSha}.pdf`,
                      buffer: pdfBuffer,
                      contentType: 'application/pdf',
                      upsert: true,
                    });
                    convertedPdfUrl = uploadedPdf.url;
                  }
                } catch (convErr) {
                  // eslint-disable-next-line no-console
                  console.warn('[updateSavedRasm] LibreOffice PDF conversion warning:', convErr);
                }
              }

              // Clean previous primary document entries to keep repository tidy
              await removeSavedRasmStorageByCategory(input.id, ['document', 'audit_final_docx', 'judge_attachment_docx']);
              await supabase
                .from('deed_attachments')
                .delete()
                .eq('record_type', 'saved_rasm')
                .eq('record_id', input.id)
                .in('category', ['document', 'audit_final_docx', 'judge_attachment_docx']);

              const { data: insertedDocx, error: insertError } = await supabase
                .from('deed_attachments')
                .insert({
                  record_id: input.id,
                  record_type: 'saved_rasm',
                  category: 'audit_final_docx',
                  file_name: f.name || 'document.docx',
                  file_url: uploaded.url,
                  storage_path: uploaded.path,
                  mime_type: mimeType,
                  file_size: f.size ?? fileBuffer.length,
                  metadata: {
                    ...(f.field ? { field: f.field } : {}),
                    sha256: fileSha,
                    source: 'audit_hub_save',
                  },
                })
                .select('id, file_url, category')
                .single();

              if (insertError || !insertedDocx) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError?.message ?? 'Failed to add attachment' });
              }

              if (convertedPdfUrl && pdfBuffer) {
                await supabase
                  .from('deed_attachments')
                  .delete()
                  .eq('record_type', 'saved_rasm')
                  .eq('record_id', input.id)
                  .eq('category', 'audit_final_pdf');

                await supabase
                  .from('deed_attachments')
                  .insert({
                    record_id: input.id,
                    record_type: 'saved_rasm',
                    category: 'audit_final_pdf',
                    file_name: f.name ? f.name.replace(/\.docx$/i, '.pdf') : 'document.pdf',
                    file_url: convertedPdfUrl,
                    storage_path: `saved/${input.id}/${sha256Hex(pdfBuffer)}.pdf`,
                    mime_type: 'application/pdf',
                    file_size: pdfBuffer.length,
                    metadata: {
                      sha256: sha256Hex(pdfBuffer),
                      source: 'audit_hub_libreoffice_pdf',
                    },
                  });
              }

              const generatedVersionId = crypto.randomUUID();
              savedAttachmentId = insertedDocx.id;
              savedCategory = insertedDocx.category;
              savedUrl = convertedPdfUrl || uploaded.url;
              previewPdfUrl = convertedPdfUrl;
              previewDocxUrl = uploaded.url;
              versionId = generatedVersionId;

              const updatedPayload = sanitizePersistedPayload({
                ...(existing.payload as object || {}),
                ...(input.payload ?? {}),
                draft: extractedDocxText || input.draft || (existing.payload as any)?.draft,
                rasmHtml: extractedDocxHtml || input.draft || (existing.payload as any)?.rasmHtml,
                primaryAttachmentUrl: uploaded.url,
                primary_docx_url: uploaded.url,
                pdf_preview_url: convertedPdfUrl || undefined,
                latestDocumentUrl: convertedPdfUrl || uploaded.url,
                latestDraftPdfUrl: convertedPdfUrl || undefined,
                latestDraftDocxUrl: uploaded.url,
                latestDocxVersionId: generatedVersionId,
                latestDocumentMimeType: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : mimeType,
                latestDocumentUpdatedAt: nowIso,
                latestSavedAttachmentId: insertedDocx.id,
              });

              const updateSavedRasmCanonical = async () => {
                const fullPatch: any = {
                  payload: updatedPayload,
                  primary_docx_url: uploaded.url,
                  pdf_preview_url: convertedPdfUrl,
                  latest_draft_docx_url: uploaded.url,
                  latest_draft_version_id: generatedVersionId,
                  latest_draft_sha256: fileSha,
                  latest_draft_updated_at: nowIso,
                  updated_at: nowIso,
                };
                if (extractedDocxText) fullPatch.draft = extractedDocxText;

                let res = await supabase.from('saved_rasms').update(fullPatch).eq('id', input.id);
                if (!res.error) return res;

                // Retry without optional columns for compatibility across schemas
                const fallbackPatch: any = {
                  payload: updatedPayload,
                  latest_draft_docx_url: uploaded.url,
                  latest_draft_version_id: generatedVersionId,
                  latest_draft_sha256: fileSha,
                  latest_draft_updated_at: nowIso,
                  updated_at: nowIso,
                };
                if (extractedDocxText) fallbackPatch.draft = extractedDocxText;

                res = await supabase.from('saved_rasms').update(fallbackPatch).eq('id', input.id);
                if (!res.error) return res;

                // Minimal payload fallback
                return await supabase.from('saved_rasms').update({ payload: updatedPayload }).eq('id', input.id);
              };

              const pointerRes = await updateSavedRasmCanonical();
              if (pointerRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pointerRes.error.message });
              continue;
            }

            const uploaded = await uploadDocument(f);
            const { error: insertError } = await supabase
              .from('deed_attachments')
              .insert({
                record_id: input.id,
                record_type: 'saved_rasm',
                category: f.category,
                file_name: f.name,
                file_url: uploaded.url,
                storage_path: uploaded.path,
                mime_type: f.type ?? null,
                file_size: f.size ?? null,
                metadata: f.field ? { field: f.field } : null,
              });
            if (insertError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message });
          }
        }

        // Best-effort: persist inclusion data from payload into inclusion_registry + saved_rasms.inclusion_id.
        try {
          const mergedPayload = (patch.payload ?? existing.payload ?? {}) as any;
          await persistInclusionForSavedRasm({
            savedRasmId: input.id,
            payload: mergedPayload,
            existingInclusionId: (existing as any).inclusion_id ? String((existing as any).inclusion_id) : null,
            fallbackNotaryName: sessionUserFullName,
          });
        } catch {
          // non-fatal
        }

        const cbTimestamp = Date.now();
        const appendCb = (u?: string | null) => {
          if (!u) return u ?? null;
          const sep = u.includes('?') ? '&' : '?';
          return `${u}${sep}cb=${cbTimestamp}`;
        };

        const finalPreviewPdfUrl = appendCb(previewPdfUrl);
        const finalPreviewDocxUrl = appendCb(previewDocxUrl);
        const finalSavedUrl = appendCb(savedUrl);

        return {
          success: true,
          savedAttachmentId,
          savedCategory,
          savedUrl: finalSavedUrl,
          previewPdfUrl: finalPreviewPdfUrl,
          pdfPreviewUrl: finalPreviewPdfUrl,
          previewDocxUrl: finalPreviewDocxUrl,
          primaryDocxUrl: finalPreviewDocxUrl,
          versionId,
        };
      }),

    listSavedRasms: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        category: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }))
      .output(z.array(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        status: z.string().nullable(),
        payload: z.record(z.unknown()).nullable(),
        judgeStatus: z.string().nullable(),
        judgeChecked: z.boolean(),
        partyNames: z.array(z.string()),
        judgeSentAt: z.string().nullable(),
        selectedJudgeName: z.string().nullable(),
        createdAt: z.string(),
        attachmentsCount: z.number(),
        notaryName: z.string().nullable(),
        baseUrl: z.string().nullable(),
        latestEditedUrl: z.string().nullable(),
        latestDraftVersionId: z.string().nullable(),
        latestDraftDocxUrl: z.string().nullable(),
        latestDraftSha256: z.string().nullable(),
        latestDraftUpdatedAt: z.string().nullable(),
        displayUrl: z.string().nullable(),
      })))
      .query(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);
        const isAdminOrJudge = user.role === 'authentication_judge' || user.role === 'admin' || user.role === 'super_admin';
        if (user.role !== 'notary' && !isAdminOrJudge) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this' });
        
        const userFullName = String((user as any)?.full_name || '').trim();

        try {
          const buildListQuery = (fieldsList: string[], ownerMode: 'user-id' | 'legacy-null-owner-name' | 'all' | 'fuzzy-name') => {
            const fields = fieldsList.join(', ');

            let q = supabase
              .from('saved_rasms')
              .select(fields)
              .order('created_at', { ascending: false });

            if (ownerMode === 'user-id') {
              q = q.eq('notary_user_id', user.id);
            } else if (ownerMode === 'legacy-null-owner-name') {
              q = q.is('notary_user_id', null).eq('notary_name', userFullName);
            } else if (ownerMode === 'fuzzy-name') {
              // Try matching by name even if notary_user_id is set (for consistency across account migrations)
              q = q.eq('notary_name', userFullName);
            }
            // 'all' mode results in no extra filters

            if (input.category) {
              q = q.eq('document_type', input.category);
            }

            if (input.limit) {
              const from = input.offset || 0;
              const to = from + input.limit - 1;
              q = q.range(from, to);
            }

            return q;
          };

          const runListAttempts = async (ownerMode: 'user-id' | 'legacy-null-owner-name' | 'all' | 'fuzzy-name') => {
            let rows: any[] | null = null;
            let error: any = null;

            const fullFields = [
              'id',
              'file_number',
              'document_type',
              'status',
              'payload',
              'created_at',
              'notary_name',
              'latest_draft_version_id',
              'latest_draft_docx_url',
              'latest_draft_sha256',
              'latest_draft_updated_at',
            ];
            const noStatusFields = fullFields.filter((field) => field !== 'status');
            const noLatestDraftFields = fullFields.filter((field) => !field.startsWith('latest_draft_'));
            const noStatusOrLatestDraftFields = noLatestDraftFields.filter((field) => field !== 'status');
            const minimalFields = ['id', 'file_number', 'document_type', 'payload', 'created_at', 'notary_name'];

            const listAttempts =
              savedRasmsSchemaState.hasStatusColumn === false
                ? [
                    { fields: noStatusFields, includeStatus: false, label: 'no-status' },
                    { fields: noStatusOrLatestDraftFields, includeStatus: false, label: 'no-status-no-latest-draft' },
                    { fields: minimalFields, includeStatus: false, label: 'minimal' },
                  ]
                : [
                    { fields: fullFields, includeStatus: true, label: 'full' },
                    { fields: noStatusFields, includeStatus: false, label: 'no-status' },
                    { fields: noLatestDraftFields, includeStatus: true, label: 'no-latest-draft' },
                    { fields: noStatusOrLatestDraftFields, includeStatus: false, label: 'no-status-no-latest-draft' },
                    { fields: minimalFields, includeStatus: false, label: 'minimal' },
                  ];

            for (const attempt of listAttempts) {
              const res = await buildListQuery(attempt.fields, ownerMode);
              rows = res.data as any[] | null;
              error = res.error;
              if (!error) {
                savedRasmsSchemaState.hasStatusColumn = attempt.includeStatus;
                break;
              }

              const msg = String(error.message || '');
              const lower = msg.toLowerCase();
              const missingStatusColumn =
                msg.includes("Could not find the 'status' column") ||
                (lower.includes('column') && lower.includes('status'));
              const missingLatestDraftColumns =
                lower.includes('latest_draft_version_id') ||
                lower.includes('latest_draft_docx_url') ||
                lower.includes('latest_draft_sha256') ||
                lower.includes('latest_draft_updated_at');

              console.error('[listSavedRasms] query attempt failed', {
                ownerMode,
                label: attempt.label,
                fields: attempt.fields,
                message: msg,
              });

              if (!missingStatusColumn && !missingLatestDraftColumns) {
                break;
              }
            }

            return { rows, error };
          };

          let { rows, error } = await runListAttempts(isAdminOrJudge ? 'all' : 'user-id');

          if (!isAdminOrJudge && (!rows || rows.length === 0) && !error && userFullName) {
            // Priority 2: Try legacy name matching (ID is null) - THIS IS THE ONLY SECURE FALLBACK
            const legacyFallback = await runListAttempts('legacy-null-owner-name');
            if (!legacyFallback.error && (legacyFallback.rows?.length || 0) > 0) {
              // Extra safety check in-memory
              const safeLegacy = (legacyFallback.rows ?? []).filter(r => 
                (r.notary_user_id === null || r.notary_user_id === undefined) && 
                String(r.notary_name || '').trim() === userFullName
              );
              if (safeLegacy.length > 0) {
                rows = safeLegacy;
                error = null;
                console.warn('[listSavedRasms] using legacy null-owner fallback', {
                  notaryName: userFullName,
                  count: safeLegacy.length,
                });
              }
            }
          }

          if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

          const ids = (rows ?? []).map((r) => r.id);
          const counts = new Map<string, number>();

          if (ids.length) {
            const { data: attRows, error: attError } = await supabase
              .from('deed_attachments')
              .select('record_id')
              .eq('record_type', 'saved_rasm')
              .in('record_id', ids);

            if (attError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attError.message });

            (attRows ?? []).forEach((r) => {
              const id = r.record_id;
              counts.set(id, (counts.get(id) ?? 0) + 1);
            });
          }

          const judgeSubmissionIds = Array.from(new Set(
            (rows ?? [])
              .map((r: any) => {
                const payload = r?.payload && typeof r.payload === 'object' ? r.payload : null;
                const raw = payload ? ((payload as any).step7JudgeSubmissionId || (payload as any).judgeSubmissionId || null) : null;
                return raw ? String(raw).trim() : null;
              })
              .filter((v): v is string => !!v)
          ));

          const judgeStatusById = new Map<string, string | null>();
          const judgeUserIdBySubmissionId = new Map<string, string | null>();
          const judgeSentAtBySubmissionId = new Map<string, string | null>();
          if (judgeSubmissionIds.length) {
            const judgeRowsRes = await supabase
              .from('judge_submissions')
              .select('id, status, judge_user_id, created_at')
              .in('id', judgeSubmissionIds);

            if (!judgeRowsRes.error) {
              (judgeRowsRes.data ?? []).forEach((row: any) => {
                const rowId = String(row.id);
                judgeStatusById.set(rowId, row.status ? String(row.status) : null);
                judgeUserIdBySubmissionId.set(rowId, row.judge_user_id ? String(row.judge_user_id) : null);
                judgeSentAtBySubmissionId.set(rowId, row.created_at ? String(row.created_at) : null);
              });
            }
          }

          const judgeIds = Array.from(
            new Set(Array.from(judgeUserIdBySubmissionId.values()).filter((v): v is string => !!v))
          );
          const judgeNamesById = new Map<string, string>();
          if (judgeIds.length) {
            const judgeUsersRes = await supabase
              .from('users')
              .select('id, full_name')
              .in('id', judgeIds);

            if (!judgeUsersRes.error) {
              (judgeUsersRes.data ?? []).forEach((row: any) => {
                judgeNamesById.set(String(row.id), String(row.full_name || '').trim());
              });
            }
          }

          const items: any[] = (rows ?? []).map((r: any) => {
            const latestEditedUrl =
              ((r as any)?.latest_draft_docx_url as string) || null;
            const latestDraftVersionId = ((r as any)?.latest_draft_version_id as string) || null;
            const latestDraftDocxUrl = ((r as any)?.latest_draft_docx_url as string) || null;
            const latestDraftSha256 = ((r as any)?.latest_draft_sha256 as string) || null;
            const latestDraftUpdatedAt =
              ((r as any)?.latest_draft_updated_at as string) || null;
            const displayUrl = latestEditedUrl || null;
            const payload = r?.payload && typeof r.payload === 'object' ? (r.payload as Record<string, unknown>) : null;
            const rowJudgeSubmissionId =
              String((payload as any)?.step7JudgeSubmissionId || (payload as any)?.judgeSubmissionId || '').trim() || null;
            const judgeStatus =
              (rowJudgeSubmissionId ? judgeStatusById.get(rowJudgeSubmissionId) : null) ??
              ((payload as any)?.judgeSubmissionStatus ? String((payload as any).judgeSubmissionStatus) : null);
            const judgeChecked = !!judgeStatus && judgeStatus !== 'pending';
            const extractedParties = extractPartiesFromPayload(payload || {});
            const payloadPartiesNames = String((payload as any)?.parties_names || '').trim();
            const partyNames = extractedParties.length
              ? extractedParties.map((party) => String(party.fullName || '').trim()).filter(Boolean)
              : payloadPartiesNames
                ? payloadPartiesNames.split(/[،,]/).map((name) => name.trim()).filter(Boolean)
                : [];
            const selectedJudgeName = rowJudgeSubmissionId
              ? (judgeNamesById.get(judgeUserIdBySubmissionId.get(rowJudgeSubmissionId) || '') || null)
              : null;
            const judgeSentAt =
              (rowJudgeSubmissionId ? judgeSentAtBySubmissionId.get(rowJudgeSubmissionId) : null) ??
              (payload && (payload as any)?.judgeDispatch?.sentAtIso ? String((payload as any).judgeDispatch.sentAtIso) : null) ??
              null;

            return {
              id: r.id,
              fileNumber: (r.file_number ?? null),
              documentType: (r.document_type ?? null),
              status: (r.status ?? null),
              payload: payload,
              judgeStatus,
              judgeChecked,
              partyNames,
              judgeSentAt,
              selectedJudgeName,
              createdAt: r.created_at,
              attachmentsCount: counts.get(r.id) ?? 0,
              notaryName: (r.notary_name ?? null),
              baseUrl: null,
              latestEditedUrl,
              latestDraftVersionId,
              latestDraftDocxUrl,
              latestDraftSha256,
              latestDraftUpdatedAt,
              displayUrl,
            };
          });

          const sortStamp = (it: any) => {
            const t =
              (it?.latestDraftUpdatedAt as string) ||
              (it?.createdAt as string) ||
              null;
            const ms = t ? Date.parse(t) : Number.NaN;
            return Number.isFinite(ms) ? ms : 0;
          };

          items.sort((a, b) => sortStamp(b) - sortStamp(a));

          return items;
        } catch (error: any) {
          if (isTransportFetchFailure(error)) {
            console.error('[listSavedRasms] transport fetch failure', {
              message: String(error?.message || error),
            });
            return [];
          }
          throw error;
        }
      }),

    getSavedRasm: publicProcedure
      .input(z.object({ sessionToken: z.string(), id: z.string().uuid() }))
      .output(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        createdAt: z.string(),
        draft: z.string().nullable(),
        canonical_approved_pdf: z.string().nullable().optional(),
        canonicalApprovedPdf: z.string().nullable().optional(),
        signed_pdf_url: z.string().nullable().optional(),
        signedPdfUrl: z.string().nullable().optional(),
        pdf_preview_url: z.string().nullable().optional(),
        pdfPreviewUrl: z.string().nullable().optional(),
        previewUrl: z.string().nullable().optional(),
        isJudgeApprovedDeed: z.boolean().optional(),
        pdfCompilationReady: z.boolean().optional(),
        payload: z.record(z.unknown()),
        latestDraftVersionId: z.string().nullable(),
        latestDraftDocxUrl: z.string().nullable(),
        latestDraftSha256: z.string().nullable(),
        latestDraftUpdatedAt: z.string().nullable(),
        attachments: z.array(z.object({
          id: z.string(),
          category: z.string(),
          fileName: z.string(),
          fileUrl: z.string(),
          mimeType: z.string().nullable(),
          fileSize: z.number().nullable(),
          metadata: z.record(z.unknown()).nullable(),
        })),
      }))
      .query(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);
        const isAdminOrJudge = user.role === 'authentication_judge' || user.role === 'admin' || user.role === 'super_admin';
        if (user.role !== 'notary' && !isAdminOrJudge) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this. User role: ' + user.role });

        const { data: row, error } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, notary_name, file_number, document_type, draft, payload, created_at, latest_draft_version_id, latest_draft_docx_url, latest_draft_sha256, latest_draft_updated_at')
          .eq('id', input.id)
          .single();

        if (error || !row) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found in database' });
        }

        const userFullName = String((user as any)?.full_name || '').trim();
        const rowNotaryName = String((row as any)?.notary_name || '').trim();

        // Check ownership: ID match OR (ID is null AND Name matches) OR (Legacy: Name matches for backwards compatibility)
        const isOwner = row.notary_user_id === user.id || 
                       (row.notary_user_id === null && userFullName !== '' && rowNotaryName === userFullName) ||
                       (userFullName !== '' && rowNotaryName === userFullName);

        if (!isAdminOrJudge && !isOwner) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'You do not own this rasm. User ID: ' + user.id + ', Rasm Owner: ' + row.notary_user_id 
          });
        }

        let { data: attachments, error: attError } = await supabase
          .from('deed_attachments')
          .select('id, category, file_name, file_url, mime_type, file_size, metadata, created_at')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', row.id)
          .order('created_at', { ascending: false });

        if (attError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attError.message });

        let finalAttachments = attachments ?? [];

        try {
          const payloadObj = (row.payload as any ?? {});
          const hasJudgePdf = finalAttachments.some((a) => a.category === 'judge_attachment');
          const hasJudgeDocx = finalAttachments.some((a) => a.category === 'judge_attachment_docx');
          if (!hasJudgePdf || !hasJudgeDocx) {
            await ensureSavedRasmHasJudgeAttachments({
              recordId: row.id,
              notaryUserId: user.id,
              payload: payloadObj,
            });
            const refetch = await supabase
              .from('deed_attachments')
              .select('id, category, file_name, file_url, mime_type, file_size, metadata, created_at')
              .eq('record_type', 'saved_rasm')
              .eq('record_id', row.id)
              .order('created_at', { ascending: false });
            if (!refetch.error && refetch.data) finalAttachments = refetch.data;
          }
        } catch (e) {
        }

        // Unify companion attachments from associated judge submissions and payload pools
        try {
          const payloadObj = (row.payload as any ?? {});
          const judgeSubId =
            payloadObj?.step7JudgeSubmissionId ||
            payloadObj?.judgeSubmissionId ||
            payloadObj?.submissionId ||
            null;

          const candidateSubmissionIds = new Set<string>();
          if (judgeSubId && typeof judgeSubId === 'string') {
            candidateSubmissionIds.add(judgeSubId);
          }

          if (row.file_number) {
            const { data: matchedSubs } = await supabase
              .from('judge_submissions')
              .select('id, payload')
              .eq('notary_user_id', user.id)
              .eq('file_number', row.file_number)
              .limit(5);
            if (matchedSubs && Array.isArray(matchedSubs)) {
              matchedSubs.forEach((sub: any) => {
                if (sub?.id) candidateSubmissionIds.add(String(sub.id));
              });
            }
          }

          // Also collect candidate signedDeedIds from payload and signed_deeds table
          const candidateSignedDeedIds = new Set<string>();
          const directSignedDeedId = String(payloadObj?.signedDeedId || payloadObj?.signed_deed_id || '').trim();
          if (directSignedDeedId) {
            candidateSignedDeedIds.add(directSignedDeedId);
          }

          try {
            const { data: matchedSignedDeeds } = await supabase
              .from('signed_deeds')
              .select('id, file_number')
              .or(`saved_rasm_id.eq.${row.id}${row.file_number ? `,file_number.eq.${row.file_number}` : ''}`)
              .limit(5);

            if (matchedSignedDeeds && Array.isArray(matchedSignedDeeds)) {
              matchedSignedDeeds.forEach((sd: any) => {
                if (sd?.id) candidateSignedDeedIds.add(String(sd.id));
              });
            }
          } catch {}

          for (const subId of candidateSubmissionIds) {
            const { data: judgeAtts } = await supabase
              .from('deed_attachments')
              .select('id, category, file_name, file_url, mime_type, file_size, metadata, created_at')
              .eq('record_type', 'judge_submission')
              .eq('record_id', subId);

            if (judgeAtts && Array.isArray(judgeAtts)) {
              for (const jAtt of judgeAtts) {
                if (jAtt.file_url && !finalAttachments.some((existing: any) => existing.file_url === jAtt.file_url)) {
                  finalAttachments.push(jAtt);
                }
              }
            }

            const { data: subRow } = await supabase
              .from('judge_submissions')
              .select('payload, created_at')
              .eq('id', subId)
              .maybeSingle();

            if (subRow?.payload && typeof subRow.payload === 'object') {
              const subPayload = subRow.payload as Record<string, unknown>;
              const subSignedDeedId = String(subPayload?.signedDeedId || subPayload?.signed_deed_id || '').trim();
              if (subSignedDeedId) {
                candidateSignedDeedIds.add(subSignedDeedId);
              }

              const extraFiles = [
                subPayload?.judgeSignedDoc,
                subPayload?.judgeCourtStampedDoc,
                subPayload?.attachment,
                subPayload?.judgeAttachment,
                subPayload?.manualRasmFile,
                subPayload?.judgeAcceptedDoc,
                subPayload?.baseDoc,
                ...(Array.isArray(subPayload?.attachments) ? subPayload.attachments : []),
                ...(Array.isArray(subPayload?.files) ? subPayload.files : []),
                ...(Array.isArray(subPayload?.supportingDocuments) ? subPayload.supportingDocuments : []),
                ...(Array.isArray(subPayload?.id_cards) ? subPayload.id_cards : []),
                ...(Array.isArray(subPayload?.fiscal_receipts) ? subPayload.fiscal_receipts : []),
              ].filter(Boolean);

              extraFiles.forEach((f: any, idx: number) => {
                const name = String(f.name || f.fileName || f.filename || f.file_name || `مرفق_قضائي_${idx + 1}`);
                const mime = f.type || f.mimeType || f.mime_type || null;
                let url = String(f.url || f.fileUrl || f.file_url || f.publicUrl || '').trim();
                if (!url && typeof f.base64 === 'string' && f.base64.trim()) {
                  const b64 = f.base64.trim();
                  url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
                }

                if (url && !finalAttachments.some((x: any) => (x.file_url && x.file_url === url) || (x.file_name === name && x.file_size === f.size))) {
                  finalAttachments.push({
                    id: String(f.id || `judge_sub_att_${subId}_${idx}`),
                    category: String(f.category || f.field || 'judge_companion_attachment'),
                    file_name: name,
                    file_url: url,
                    mime_type: mime ? String(mime) : null,
                    file_size: typeof f.size === 'number' ? f.size : (typeof f.fileSize === 'number' ? f.fileSize : null),
                    metadata: {
                      field: f.field,
                      source: 'judge_submission_payload',
                      submissionId: subId,
                      ...(f.metadata || {}),
                    },
                    created_at: String(subRow.created_at || row.created_at),
                  });
                }
              });
            }
          }

          // Fetch official signed deeds attachments (judge_signed_pdf, judge_court_stamped_pdf, signed_pdf)
          if (candidateSignedDeedIds.size > 0) {
            try {
              const { data: sdAtts } = await supabase
                .from('deed_attachments')
                .select('id, category, file_name, file_url, mime_type, file_size, metadata, created_at')
                .eq('record_type', 'signed_deed')
                .in('record_id', Array.from(candidateSignedDeedIds))
                .in('category', ['judge_signed_pdf', 'judge_court_stamped_pdf', 'signed_pdf'])
                .order('created_at', { ascending: false });

              if (sdAtts && Array.isArray(sdAtts) && sdAtts.length > 0) {
                for (const sdAtt of sdAtts) {
                  if (sdAtt.file_url && !finalAttachments.some((existing: any) => existing.file_url === sdAtt.file_url)) {
                    finalAttachments.push(sdAtt);
                  }
                }
              }
            } catch (sdAttErr) {
              console.warn('[getSavedRasm] Fetch signed_deed attachments error:', sdAttErr);
            }
          }

          const rasmExtraFiles = [
            ...(Array.isArray(payloadObj?.attachments) ? payloadObj.attachments : []),
            ...(Array.isArray(payloadObj?.files) ? payloadObj.files : []),
            ...(Array.isArray(payloadObj?.supportingDocuments) ? payloadObj.supportingDocuments : []),
            ...(Array.isArray(payloadObj?.id_cards) ? payloadObj.id_cards : []),
            ...(Array.isArray(payloadObj?.fiscal_receipts) ? payloadObj.fiscal_receipts : []),
          ].filter(Boolean);

          rasmExtraFiles.forEach((f: any, idx: number) => {
            const name = String(f.name || f.fileName || f.filename || f.file_name || `مرفق_${idx + 1}`);
            const mime = f.type || f.mimeType || f.mime_type || null;
            let url = String(f.url || f.fileUrl || f.file_url || f.publicUrl || '').trim();
            if (!url && typeof f.base64 === 'string' && f.base64.trim()) {
              const b64 = f.base64.trim();
              url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
            }

            if (url && !finalAttachments.some((x: any) => (x.file_url && x.file_url === url) || (x.file_name === name && x.file_size === f.size))) {
              finalAttachments.push({
                id: String(f.id || `rasm_payload_att_${row.id}_${idx}`),
                category: String(f.category || f.field || 'supporting_attachment'),
                file_name: name,
                file_url: url,
                mime_type: mime ? String(mime) : null,
                file_size: typeof f.size === 'number' ? f.size : (typeof f.fileSize === 'number' ? f.fileSize : null),
                metadata: {
                  field: f.field,
                  source: 'saved_rasm_payload',
                  ...(f.metadata || {}),
                },
                created_at: String(row.created_at),
              });
            }
          });
        } catch (err) {
        }

        // If there is an audit doc version (edited artifact), surface it for Saved Documents.
        // This avoids showing the immutable judge_attachment by default.
        let auditVirtualAttachments: Array<{
          id: string;
          category: string;
          file_name: string;
          file_url: string;
          mime_type: string | null;
          file_size: number | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        }> = [];

        // If audit artifacts are already stored as real deed_attachments, don't add virtual duplicates.
        const hasRealAuditArtifacts = (finalAttachments ?? []).some((a: any) => {
          const c = String(a?.category || '').toLowerCase();
          return c === 'audit_draft_pdf' || c === 'audit_draft_docx' || c === 'audit_final_pdf' || c === 'audit_final_docx';
        });

        if (!hasRealAuditArtifacts) {
          try {
            const payloadObj = (row.payload as any ?? {});
            const pinnedVersionId = (row as any)?.latest_draft_version_id
              ? String((row as any).latest_draft_version_id)
              : payloadObj?.latestDocumentVersionId
                ? String(payloadObj.latestDocumentVersionId)
                : payloadObj?.auditDocVersionId
                  ? String(payloadObj.auditDocVersionId)
                  : null;
            const pinnedUrl = (row as any)?.latest_draft_docx_url
              ? String((row as any).latest_draft_docx_url)
              : payloadObj?.latestDocumentUrl
                ? String(payloadObj.latestDocumentUrl)
                : payloadObj?.auditEditedArtifactUrl
                  ? String(payloadObj.auditEditedArtifactUrl)
                  : null;

          const fetchByPinnedId = async () => {
            if (!pinnedVersionId) return null;
            const { data } = await supabase
              .from('audit_doc_versions')
              .select('id, status, created_at, final_pdf_url, final_docx_url, patch_sha256')
              .eq('id', pinnedVersionId)
              .maybeSingle();
            return data as any;
          };

          const fetchLatest = async () => {
            const { data } = await supabase
              .from('audit_doc_versions')
              .select('id, status, created_at, final_pdf_url, final_docx_url, patch_sha256')
              .eq('saved_rasm_id', row.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            return data as any;
          };

          const v: any = (await fetchByPinnedId()) || (await fetchLatest());
          const vId = v?.id ? String(v.id) : null;
          const pdfUrl = v?.final_pdf_url ? String(v.final_pdf_url) : null;
          const docxUrl = v?.final_docx_url ? String(v.final_docx_url) : null;
          const chosenDisplayUrl = pinnedUrl || pdfUrl || docxUrl || null;

          if (vId && (pdfUrl || docxUrl)) {
            if (pdfUrl) {
              auditVirtualAttachments.push({
                id: `audit:${vId}:pdf`,
                category: 'audit_final_pdf',
                file_name: `audit-${vId}.pdf`,
                file_url: pdfUrl,
                mime_type: 'application/pdf',
                file_size: null,
                metadata: {
                  source: 'audit_doc_versions',
                  versionId: vId,
                  status: v?.status ?? null,
                  patchSha256: v?.patch_sha256 ?? null,
                },
                created_at: String(v.created_at || row.created_at),
              });
            }
            if (docxUrl) {
              auditVirtualAttachments.push({
                id: `audit:${vId}:docx`,
                category: 'audit_final_docx',
                file_name: `audit-${vId}.docx`,
                file_url: docxUrl,
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                file_size: null,
                metadata: {
                  source: 'audit_doc_versions',
                  versionId: vId,
                  status: v?.status ?? null,
                  patchSha256: v?.patch_sha256 ?? null,
                },
                created_at: String(v.created_at || row.created_at),
              });
            }
          }

          // Fallback: if the Saved Rasm payload pins a URL but the version row has no URLs yet,
          // still surface the pinned URL so Saved Documents shows the edited artifact.
          if (auditVirtualAttachments.length === 0 && pinnedUrl) {
            const lower = String(pinnedUrl).toLowerCase();
            const isPdf = lower.includes('.pdf');
            auditVirtualAttachments.push({
              id: `audit:pinned:${pinnedVersionId || row.id}`,
              category: isPdf ? 'audit_final_pdf' : 'audit_final_docx',
              file_name: isPdf
                ? `audit-pinned-${pinnedVersionId || row.id}.pdf`
                : `audit-pinned-${pinnedVersionId || row.id}.docx`,
              file_url: pinnedUrl,
              mime_type: isPdf
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              file_size: null,
              metadata: {
                source: 'saved_rasms.payload',
                pinnedVersionId: pinnedVersionId,
              },
              created_at: row.created_at,
            });
          }
          } catch (e: any) {
            // Non-fatal: SavedDocuments can still show regular attachments.
          }
        }

        // --- PDF COMPILATION GUARD ---
        // Race condition: the judge-approval step triggers async PDF stamping/upload.
        // If the notary navigates to AuditHub immediately after approval (< 2s), the PDF
        // URL may not yet be written. We poll deed_attachments up to 4×500ms so the first
        // response already contains the real compiled PDF — no client-side re-fetch needed.
        {
          const payloadCheck = (row.payload as any ?? {});
          const pendingSubId = String(
            payloadCheck?.step7JudgeSubmissionId || payloadCheck?.judgeSubmissionId || ''
          ).trim();
          const hasPdfInAttachments = (atts: any[]): boolean =>
            (atts ?? []).some((a: any) => {
              const url = String(a?.file_url || '').trim();
              const cat = String(a?.category || '').toLowerCase();
              const mime = String(a?.mime_type || '').toLowerCase();
              return (
                url.startsWith('http') &&
                (mime.includes('pdf') || url.includes('.pdf') || cat === 'judge_attachment')
              );
            });
          if (pendingSubId && !hasPdfInAttachments(finalAttachments)) {
            try {
              // Quick status check — only poll if this submission is actually judge-approved
              const { data: subStatus } = await supabase
                .from('judge_submissions')
                .select('status')
                .eq('id', pendingSubId)
                .maybeSingle();
              const approvedStatuses = ['accepted', 'accepted_with_notes', 'substantive_notes'];
              const isSubmissionApproved =
                subStatus?.status &&
                approvedStatuses.includes(String(subStatus.status));
              if (isSubmissionApproved) {
                // Poll up to 4×500ms (2 s total) for the PDF to land in storage
                for (let attempt = 0; attempt < 4; attempt++) {
                  await new Promise<void>((r) => setTimeout(r, 500));
                  const { data: freshAtts } = await supabase
                    .from('deed_attachments')
                    .select('id, category, file_name, file_url, mime_type, file_size, metadata, created_at')
                    .eq('record_type', 'saved_rasm')
                    .eq('record_id', row.id)
                    .order('created_at', { ascending: false });
                  if (freshAtts && hasPdfInAttachments(freshAtts)) {
                    // Merge the newly-uploaded PDF into finalAttachments and break early
                    for (const fa of freshAtts) {
                      if (!(finalAttachments ?? []).some((e: any) => e.file_url === fa.file_url)) {
                        finalAttachments.push(fa);
                      }
                    }
                    break;
                  }
                }
              }
            } catch {
              // Non-fatal — proceed with whatever attachments we have.
            }
          }
        }

        // --- SORT PRIORITY: prefer judge_signed_pdf, judge_court_stamped_pdf, and edited artifacts over draft/generic ---
        const combined = [...auditVirtualAttachments, ...(finalAttachments ?? [])];
        const categoryWeight = (cat: string) => {
          const c = String(cat || '').toLowerCase();
          if (c === 'judge_signed_pdf') return -2;
          if (c === 'judge_court_stamped_pdf') return -1;
          if (c.includes('audit_final_docx') || c.includes('audit_draft_docx')) return 0;
          if (c.includes('audit_final_pdf') || c.includes('audit_draft_pdf')) return 1;
          if (c === 'judge_attachment') return 1;
          if (c === 'signed_pdf') return 1.5;
          if (c.includes('primary_attachment')) return 2;
          if (c === 'document') return 3;
          if (c.includes('docx') || c.includes('word')) return 4;
          if (c.includes('pdf')) return 5;
          return 10;
        };

        const sortedAttachments = [...combined].sort((a: any, b: any) => {
          const wa = categoryWeight(a.category);
          const wb = categoryWeight(b.category);
          if (wa !== wb) return wa - wb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        let normalizedPayload: Record<string, unknown> =
          row.payload && typeof row.payload === 'object'
            ? (row.payload as Record<string, unknown>)
            : {};

        const liveJudgeSubmissionId =
          String((normalizedPayload as any)?.step7JudgeSubmissionId || (normalizedPayload as any)?.judgeSubmissionId || '').trim() || null;

        if (liveJudgeSubmissionId) {
          try {
            const timeout2s = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
            const submissionFetch = supabase
              .from('judge_submissions')
              .select('id, status, decision, judge_notes, updated_at, decided_at')
              .eq('id', liveJudgeSubmissionId)
              .maybeSingle();
            const submissionRes = await Promise.race([submissionFetch, timeout2s]);
            if (submissionRes && !('error' in submissionRes && submissionRes.error) && 'data' in submissionRes && submissionRes.data) {
              normalizedPayload = mergeLiveJudgeSubmissionSnapshot(normalizedPayload, submissionRes.data as any);
            }
          } catch {
            // Non-fatal: proceed with normalizedPayload as-is if judge lookup fails or times out.
          }
        }

        const candidateApprovedPdf = (sortedAttachments ?? []).find((a: any) => {
          const cat = String(a?.category || '').toLowerCase();
          const url = String(a?.file_url || '').trim();
          const mime = String(a?.mime_type || '').toLowerCase();
          return (
            url.startsWith('http') &&
            (cat === 'judge_signed_pdf' ||
             cat === 'judge_court_stamped_pdf' ||
             cat === 'signed_pdf' ||
             cat === 'audit_final_pdf' ||
             cat === 'judge_attachment' ||
             mime.includes('pdf') ||
             url.includes('.pdf'))
          );
        });

        const canonicalPdf =
          (row as any).canonical_approved_pdf ||
          (normalizedPayload as any).canonical_approved_pdf ||
          (normalizedPayload as any).signed_pdf_url ||
          (row as any).signed_pdf_url ||
          (row as any).pdf_preview_url ||
          (normalizedPayload as any).pdf_preview_url ||
          (normalizedPayload as any).previewUrl ||
          candidateApprovedPdf?.file_url ||
          null;

        const hasApprovedPdf =
          Boolean(canonicalPdf) ||
          (sortedAttachments ?? []).some((a: any) => {
            const url = String(a?.file_url || '').trim();
            const cat = String(a?.category || '').toLowerCase();
            const mime = String(a?.mime_type || '').toLowerCase();
            return (
              url.startsWith('http') &&
              (mime.includes('pdf') || url.includes('.pdf') || cat === 'judge_signed_pdf' || cat === 'judge_court_stamped_pdf' || cat === 'signed_pdf' || cat === 'judge_attachment' || cat === 'audit_final_pdf')
            );
          });

        const approvedStatuses = ['accepted', 'accepted_with_notes', 'substantive_notes'];
        const isApprovedStatus = (s: any) => approvedStatuses.includes(String(s || '').toLowerCase().trim());
        const isJudgeApprovedDeed =
          isApprovedStatus(normalizedPayload?.judgeStatus) ||
          isApprovedStatus(normalizedPayload?.step7JudgeStatus) ||
          isApprovedStatus((row as any)?.status) ||
          isApprovedStatus(normalizedPayload?.status) ||
          Boolean((sortedAttachments ?? []).some((a: any) => a.category === 'judge_signed_pdf' || a.category === 'judge_court_stamped_pdf'));

        (normalizedPayload as any).pdfCompilationReady = !isJudgeApprovedDeed || hasApprovedPdf;
        (normalizedPayload as any).isJudgeApprovedDeed = isJudgeApprovedDeed;
        if (canonicalPdf) {
          (normalizedPayload as any).canonical_approved_pdf = canonicalPdf;
          (normalizedPayload as any).signed_pdf_url = canonicalPdf;
          (normalizedPayload as any).pdf_preview_url = canonicalPdf;
          (normalizedPayload as any).previewUrl = canonicalPdf;
        }

        // Self-heal saved_rasms payload if canonical PDF was resolved from signed deeds
        if (canonicalPdf && (row.payload as any)?.canonical_approved_pdf !== canonicalPdf) {
          supabase
            .from('saved_rasms')
            .update({
              payload: {
                ...(row.payload && typeof row.payload === 'object' ? (row.payload as any) : {}),
                canonical_approved_pdf: canonicalPdf,
                signed_pdf_url: canonicalPdf,
                pdf_preview_url: canonicalPdf,
                previewUrl: canonicalPdf,
                pdfCompilationReady: true,
                isJudgeApprovedDeed,
              },
            })
            .eq('id', row.id)
            .then(() => {}, () => {});
        }

        // Stamp a unique revision parameter onto every HTTP PDF/DOCX attachment URL
        // so browsers bypass their disk/memory cache and always fetch the live stream.
        const revTs = Date.now();
        const stampUrl = (url: string): string => {
          if (!url) return url;
          const u = String(url).trim();
          // Only stamp absolute HTTP URLs; leave data: / blob: / storage-path strings untouched.
          if (!u.startsWith('http://') && !u.startsWith('https://')) return u;
          const sep = u.includes('?') ? '&' : '?';
          return `${u}${sep}_rev=${revTs}`;
        };

        return {
          id: row.id,
          fileNumber: (row.file_number ?? null),
          documentType: (row.document_type ?? null),
          createdAt: row.created_at,
          draft: (row.draft ?? null),
          canonical_approved_pdf: canonicalPdf,
          canonicalApprovedPdf: canonicalPdf,
          signed_pdf_url: canonicalPdf,
          signedPdfUrl: canonicalPdf,
          pdf_preview_url: canonicalPdf,
          pdfPreviewUrl: canonicalPdf,
          previewUrl: canonicalPdf,
          payload: normalizedPayload,
          latestDraftVersionId: (row.latest_draft_version_id ? String(row.latest_draft_version_id) : null) as any,
          latestDraftDocxUrl: (row.latest_draft_docx_url ? String(row.latest_draft_docx_url) : null) as any,
          latestDraftSha256: (row.latest_draft_sha256 ? String(row.latest_draft_sha256) : null) as any,
          latestDraftUpdatedAt: (row.latest_draft_updated_at ? String(row.latest_draft_updated_at) : null) as any,
          attachments: sortedAttachments.map((a) => ({
            id: a.id,
            category: a.category,
            fileName: a.file_name,
            fileUrl: stampUrl(a.file_url),
            mimeType: (a.mime_type ?? null),
            fileSize: (a.file_size ?? null),
            metadata: (a.metadata as any ?? null),
          })),
        };
      }),

    revertLatestSavedRasmEdit: publicProcedure
      .input(z.object({ sessionToken: z.string(), id: z.string().uuid() }))
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access this');

        const { data: row, error: rowError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, payload')
          .eq('id', input.id)
          .single();

        if (rowError || !row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found' });
        if (row.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });

        const payloadObj = row.payload && typeof row.payload === 'object' ? { ...(row.payload as any) } : {};
        delete payloadObj.auditDocVersionId;
        delete payloadObj.auditEditedArtifactUrl;
        delete payloadObj.auditEditedUpdatedAt;
        delete payloadObj.latestDocumentVersionId;
        delete payloadObj.latestDocumentUrl;
        delete payloadObj.latestDocumentMimeType;
        delete payloadObj.latestDocumentUpdatedAt;

        const nowIso = new Date().toISOString();
        const patchBase: any = {
          payload: payloadObj,
          latest_draft_version_id: null,
          latest_draft_docx_url: null,
          latest_draft_sha256: null,
          latest_draft_updated_at: null,
        };

        let updateRes = await supabase
          .from('saved_rasms')
          .update({ ...patchBase, updated_at: nowIso })
          .eq('id', input.id);

        if (updateRes.error) {
          updateRes = await supabase.from('saved_rasms').update(patchBase).eq('id', input.id);
        }

        if (updateRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateRes.error.message });
        }

        await removeSavedRasmStorageByCategory(input.id, ['audit_draft_pdf', 'audit_draft_docx', 'audit_final_pdf', 'audit_final_docx']);

        const { error: deleteAuditArtifactsError } = await supabase
          .from('deed_attachments')
          .delete()
          .eq('record_type', 'saved_rasm')
          .eq('record_id', input.id)
          .in('category', ['audit_draft_pdf', 'audit_draft_docx', 'audit_final_pdf', 'audit_final_docx']);

        if (deleteAuditArtifactsError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteAuditArtifactsError.message });
        }

        return { success: true };
      }),

    /**
     * Creates a saved_rasm record from a judge submission.
     * This is used when a judge approves a document and it needs to be sent back to the AuditHub for signing.
     */
    createSavedRasmFromJudgeSubmission: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        judgeSubmissionId: z.string().uuid(),
      }))
      .mutation(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);

        // 1. Get the submission
        const { data: submission, error: subError } = await supabase
          .from('judge_submissions')
          .select('*')
          .eq('id', input.judgeSubmissionId)
          .single();

        if (subError || !submission) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });
        }

        const subPayload = (submission.payload as any) || {};
        let resolvedApprovedPdfUrl: string | null =
          String(
            subPayload.canonical_approved_pdf ||
            subPayload.canonicalApprovedPdf ||
            subPayload.signed_pdf_url ||
            subPayload.signedPdfUrl ||
            subPayload.pdf_preview_url ||
            subPayload.pdfPreviewUrl ||
            subPayload.judgeCourtStamp?.url ||
            subPayload.judgeCourtStampedDoc?.url ||
            subPayload.judgeSignedDoc?.url ||
            subPayload.previewUrl ||
            subPayload.finalPdfUrl ||
            subPayload.attachment?.url ||
            subPayload.attachment?.fileUrl ||
            subPayload.attachment?.pdfUrl ||
            subPayload.judgeAttachment?.url ||
            subPayload.manualRasmFile?.url ||
            subPayload.baseDoc?.url ||
            ''
          ).trim() || null;

        if (!resolvedApprovedPdfUrl) {
          const { data: directAtts } = await supabase
            .from('deed_attachments')
            .select('file_url, category, mime_type, file_name')
            .eq('record_type', 'judge_submission')
            .eq('record_id', submission.id);

          const found = (directAtts || []).find((a: any) => {
            const u = String(a.file_url || '').toLowerCase();
            const c = String(a.category || '').toLowerCase();
            const m = String(a.mime_type || '').toLowerCase();
            const n = String(a.file_name || '').toLowerCase();
            return u.startsWith('http') && (m.includes('pdf') || u.includes('.pdf') || n.endsWith('.pdf') || c.includes('judge'));
          });
          if (found?.file_url) {
            resolvedApprovedPdfUrl = String(found.file_url).trim();
          }
        }

        if (!resolvedApprovedPdfUrl && subPayload.signedDeedId) {
          const { data: deedAtts } = await supabase
            .from('deed_attachments')
            .select('file_url, category, mime_type')
            .eq('record_type', 'signed_deed')
            .eq('record_id', subPayload.signedDeedId);

          const found = (deedAtts || []).find((a: any) => {
            const u = String(a.file_url || '').toLowerCase();
            const c = String(a.category || '').toLowerCase();
            const m = String(a.mime_type || '').toLowerCase();
            return u.startsWith('http') && (m.includes('pdf') || u.includes('.pdf') || c.includes('signed') || c.includes('judge'));
          });
          if (found?.file_url) {
            resolvedApprovedPdfUrl = String(found.file_url).trim();
          }
        }

        // 2. Check if a saved_rasm already exists for this submission / file number
        let targetRasmId: string | null = (subPayload.savedRasmId || subPayload.saved_rasm_id) as string || null;
        let existingRasm: any = null;

        if (targetRasmId) {
          const { data } = await supabase
            .from('saved_rasms')
            .select('id, payload')
            .eq('id', targetRasmId)
            .maybeSingle();
          existingRasm = data;
        }

        if (!existingRasm && submission.file_number) {
          const { data } = await supabase
            .from('saved_rasms')
            .select('id, payload')
            .eq('notary_user_id', submission.notary_user_id)
            .eq('file_number', submission.file_number)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          existingRasm = data;
        }

        const mergedPayload = {
          ...(existingRasm?.payload && typeof existingRasm.payload === 'object' ? existingRasm.payload : {}),
          ...(subPayload || {}),
          judgeSubmissionId: submission.id,
          originalApprovedJudgeUserId: submission.judge_user_id ?? null,
          originJudgeUserId: submission.judge_user_id ?? null,
          judgeStatus: submission.status,
          isJudgeApprovedDeed: true,
          pdfCompilationReady: Boolean(resolvedApprovedPdfUrl),
          canonical_approved_pdf: resolvedApprovedPdfUrl || subPayload.canonical_approved_pdf || null,
          signed_pdf_url: resolvedApprovedPdfUrl || subPayload.signed_pdf_url || null,
          pdf_preview_url: resolvedApprovedPdfUrl || subPayload.pdf_preview_url || null,
          previewUrl: resolvedApprovedPdfUrl || subPayload.previewUrl || null,
        };

        if (existingRasm) {
          targetRasmId = existingRasm.id;
          await supabase
            .from('saved_rasms')
            .update({
              payload: mergedPayload,
              canonical_approved_pdf: resolvedApprovedPdfUrl || null,
              signed_pdf_url: resolvedApprovedPdfUrl || null,
              pdf_preview_url: resolvedApprovedPdfUrl || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRasm.id);
        } else {
          const { data: created, error: createError } = await supabase
            .from('saved_rasms')
            .insert({
              notary_user_id: submission.notary_user_id,
              notary_name: submission.notary_name,
              file_number: submission.file_number,
              document_type: submission.document_type,
              draft: submission.summary || '',
              payload: mergedPayload,
              canonical_approved_pdf: resolvedApprovedPdfUrl || null,
              signed_pdf_url: resolvedApprovedPdfUrl || null,
              pdf_preview_url: resolvedApprovedPdfUrl || null,
            })
            .select('id')
            .single();

          if (createError || !created) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: createError?.message ?? 'Failed to create saved_rasm',
            });
          }
          targetRasmId = created.id;
        }

        // Keep submission payload in sync with target rasm ID
        try {
          await supabase
            .from('judge_submissions')
            .update({
              payload: {
                ...subPayload,
                savedRasmId: targetRasmId,
                saved_rasm_id: targetRasmId,
              },
            })
            .eq('id', submission.id);
        } catch {}

        // 3. Immediately link approved PDF into deed_attachments
        if (resolvedApprovedPdfUrl && targetRasmId) {
          try {
            const targetCategories = ['audit_final_pdf', 'judge_attachment'];
            for (const cat of targetCategories) {
              const { data: existingAtt } = await supabase
                .from('deed_attachments')
                .select('id')
                .eq('record_id', targetRasmId)
                .eq('record_type', 'saved_rasm')
                .eq('category', cat)
                .maybeSingle();

              if (existingAtt) {
                await supabase
                  .from('deed_attachments')
                  .update({
                    file_url: resolvedApprovedPdfUrl,
                    mime_type: 'application/pdf',
                  })
                  .eq('id', existingAtt.id);
              } else {
                await supabase.from('deed_attachments').insert({
                  record_id: targetRasmId,
                  record_type: 'saved_rasm',
                  category: cat,
                  file_name: 'المحرر القضائي المعتمد.pdf',
                  file_url: resolvedApprovedPdfUrl,
                  mime_type: 'application/pdf',
                  file_size: null,
                  metadata: {
                    source: 'createSavedRasmFromJudgeSubmission',
                    judgeSubmissionId: submission.id,
                  },
                });
              }
            }
          } catch {}
        }

        // 4. Ensure the saved_rasm has both judge PDF + base DOCX attachments (best-effort).
        if (targetRasmId) {
          try {
            await ensureSavedRasmHasJudgeAttachments({
              recordId: targetRasmId,
              notaryUserId: submission.notary_user_id,
              payload: sanitizePersistedPayload({
                ...(submission.payload as any || {}),
                judgeSubmissionId: submission.id,
              }),
            });
          } catch {}
        }

        return { id: targetRasmId, signedPdfUrl: resolvedApprovedPdfUrl };
      }),

    resolveSigningDocument: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        mode: z.enum(['pdf', 'docx']).optional(),
      }))
      .output(z.object({
        rasmId: z.string(),
        effectiveUrl: z.string().nullable(),
        source: z.enum(['edited_docx', 'saved_pdf', 'judge_attachment', 'base']).nullable(),
        versionId: z.string().nullable(),
        updatedAt: z.string().nullable(),
        attachmentId: z.string().nullable(),
      }))
      .query(async ({ input }) => {
        const mode = input.mode ?? 'pdf';

        const user = await requireNotary(input.sessionToken, 'Only notaries can access this');

        const { data: row, error } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, created_at, payload, latest_draft_version_id, latest_draft_docx_url, latest_draft_updated_at')
          .eq('id', input.id)
          .single();

        if (error || !row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found in database' });
        if (row.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });

        const payloadObj = (row.payload && typeof row.payload === 'object') ? (row.payload as any) : {};

        const baseUrl =
          (payloadObj?.judgeAcceptedDoc?.publicUrl as string) ||
          (payloadObj?.judgeAcceptedDoc?.url as string) ||
          (payloadObj?.baseDocUrl as string) ||
          null;

        const latestDraftVersionId = (row.latest_draft_version_id ? String(row.latest_draft_version_id) : null);
        const latestDraftDocxUrl = (row.latest_draft_docx_url ? String(row.latest_draft_docx_url) : null);
        const latestDraftUpdatedAt = (row.latest_draft_updated_at ? String(row.latest_draft_updated_at) : null);

        const payloadLatestDocumentUrl = (payloadObj?.latestDocumentUrl ? String(payloadObj.latestDocumentUrl) : null);
        const payloadLatestDocumentMimeType = (payloadObj?.latestDocumentMimeType ? String(payloadObj.latestDocumentMimeType) : null);
        const payloadLatestDocumentVersionId = (payloadObj?.latestDocumentVersionId ? String(payloadObj.latestDocumentVersionId) : null);
        const payloadLatestDocumentUpdatedAt = (payloadObj?.latestDocumentUpdatedAt ? String(payloadObj.latestDocumentUpdatedAt) : null);
        const payloadLatestSigningPdfUrl = (payloadObj?.latestSigningPdfUrl ? String(payloadObj.latestSigningPdfUrl) : null);

        const { data: attachments } = await supabase
          .from('deed_attachments')
          .select('id, category, file_url, file_name, mime_type, metadata, created_at')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', row.id)
          .order('created_at', { ascending: false });

        const attList = (attachments ?? []) as any[];

        const judgeAtt = attList.find((a) => String(a?.category || '') === 'judge_attachment');
        const judgeAttachmentUrl = (judgeAtt?.file_url ? String(judgeAtt.file_url) : null);
        const preferredVersionId = latestDraftVersionId || payloadLatestDocumentVersionId || null;

        const auditDraftPdfAtts = attList.filter((a) => String(a?.category || '') === 'audit_draft_pdf');
        const auditDraftDocxAtts = attList.filter((a) => String(a?.category || '') === 'audit_draft_docx');
        const auditFinalPdfAtts = attList.filter((a) => String(a?.category || '') === 'audit_final_pdf');
        const judgePrimaryPdf = attList.find((a) => {
          const category = String(a?.category || '').toLowerCase();
          const source = String(a?.metadata?.source || '').toLowerCase();
          return category === 'judge_attachment' && source === 'judge_submission';
        });
        const judgePrimaryDocx = attList.find((a) => {
          const category = String(a?.category || '').toLowerCase();
          const source = String(a?.metadata?.source || '').toLowerCase();
          return category === 'judge_attachment_docx' && source === 'judge_submission';
        });

        const pickAttachmentByVersion = (items: any[], desiredVersionId: string | null) => {
          if (!items.length) return null;
          if (desiredVersionId) {
            const matched = items.find(
              (a) => String(a?.metadata?.versionId || a?.metadata?.version_id || '') === desiredVersionId
            );
            return matched || null;
          }
          return items[0];
        };

        const chosenAuditDraftPdf = pickAttachmentByVersion(auditDraftPdfAtts, preferredVersionId);
        const chosenAuditDraftDocx = pickAttachmentByVersion(auditDraftDocxAtts, preferredVersionId);
        const auditDraftPdfUrl = chosenAuditDraftPdf?.file_url ? String(chosenAuditDraftPdf.file_url) : null;
        const auditDraftDocxUrl = chosenAuditDraftDocx?.file_url ? String(chosenAuditDraftDocx.file_url) : null;
        const auditDraftVersionId =
          preferredVersionId ||
          (chosenAuditDraftPdf?.metadata?.versionId ? String(chosenAuditDraftPdf.metadata.versionId) : null) ||
          (chosenAuditDraftDocx?.metadata?.versionId ? String(chosenAuditDraftDocx.metadata.versionId) : null);
        const auditDraftUpdatedAt =
          (chosenAuditDraftPdf?.created_at ? String(chosenAuditDraftPdf.created_at) : null) ||
          (chosenAuditDraftDocx?.created_at ? String(chosenAuditDraftDocx.created_at) : null) ||
          latestDraftUpdatedAt ||
          payloadLatestDocumentUpdatedAt ||
          null;

        const pickAuditFinalPdf = () => pickAttachmentByVersion(auditFinalPdfAtts, preferredVersionId);

        const chosenAuditFinalPdf = pickAuditFinalPdf();
        const auditFinalPdfUrl = chosenAuditFinalPdf?.file_url ? String(chosenAuditFinalPdf.file_url) : null;
        const auditFinalPdfVersionId = latestDraftVersionId || (chosenAuditFinalPdf?.metadata?.versionId ? String(chosenAuditFinalPdf.metadata.versionId) : null);
        const auditFinalPdfUpdatedAt = chosenAuditFinalPdf?.created_at ? String(chosenAuditFinalPdf.created_at) : (latestDraftUpdatedAt || null);

        // Also allow server-side version lookup if we have a versionId but no attachment yet
        let auditDocVersionPdfUrl: string | null = null;
        let auditDocVersionDocxUrl: string | null = null;
        let auditDocVersionCreatedAt: string | null = null;
        if (latestDraftVersionId) {
          const { data: v } = await supabase
            .from('audit_doc_versions')
            .select('id, created_at, final_pdf_url, final_docx_url')
            .eq('id', latestDraftVersionId)
            .maybeSingle();
          if (v) {
            auditDocVersionPdfUrl = (v.final_pdf_url ? String(v.final_pdf_url) : null);
            auditDocVersionDocxUrl = (v.final_docx_url ? String(v.final_docx_url) : null);
            auditDocVersionCreatedAt = (v.created_at ? String(v.created_at) : null);
          }
        }

        const editedDocxUrl = auditDraftDocxUrl || latestDraftDocxUrl || auditDocVersionDocxUrl || null;

        const payloadDocUrl = payloadLatestDocumentUrl || null;
        const payloadDocIsPdf = (payloadLatestDocumentMimeType === 'application/pdf') || (payloadDocUrl ? payloadDocUrl.toLowerCase().includes('.pdf') : false);
        const payloadDocIsDocx = (payloadLatestDocumentMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') || (payloadDocUrl ? payloadDocUrl.toLowerCase().includes('.docx') : false);
        const payloadVersionMatchesLatestDraft =
          !latestDraftVersionId ||
          !payloadLatestDocumentVersionId ||
          payloadLatestDocumentVersionId === latestDraftVersionId;

        const candidates = {
          mode,
          payloadLatestDocumentUrl: payloadDocUrl,
          payloadLatestSigningPdfUrl,
          payloadLatestDocumentMimeType,
          payloadLatestDocumentVersionId,
          latestDraftVersionId,
          editedDocxUrl,
          auditFinalPdfUrl,
          auditDocVersionPdfUrl,
          judgeAttachmentUrl,
          baseUrl,
        };

        let effectiveUrl: string | null = null;
        let source: 'edited_docx' | 'saved_pdf' | 'judge_attachment' | 'base' | null = null;
        let versionId: string | null = null;
        let updatedAt: string | null = null;
        let attachmentId: string | null = null;

        const pickPdf = () => {
          if (payloadLatestSigningPdfUrl && payloadVersionMatchesLatestDraft) {
            return {
              url: payloadLatestSigningPdfUrl,
              versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
              updatedAt: payloadLatestDocumentUpdatedAt || latestDraftUpdatedAt || null,
              attachmentId: null,
            };
          }

          if (payloadDocUrl && payloadDocIsPdf && payloadVersionMatchesLatestDraft) {
            return {
              url: payloadDocUrl,
              versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
              updatedAt: payloadLatestDocumentUpdatedAt || latestDraftUpdatedAt || null,
              attachmentId: null,
            };
          }

          const finalizedUrl = auditFinalPdfUrl || auditDocVersionPdfUrl || null;
          if (finalizedUrl) {
            return {
              url: finalizedUrl,
              versionId: auditFinalPdfVersionId || latestDraftVersionId || payloadLatestDocumentVersionId || null,
              updatedAt: auditFinalPdfUpdatedAt || auditDocVersionCreatedAt || latestDraftUpdatedAt || payloadLatestDocumentUpdatedAt || null,
              attachmentId: chosenAuditFinalPdf?.id ? String(chosenAuditFinalPdf.id) : null,
            };
          }

          if (auditDraftPdfUrl) {
            return {
              url: auditDraftPdfUrl,
              versionId: auditDraftVersionId,
              updatedAt: auditDraftUpdatedAt,
              attachmentId: chosenAuditDraftPdf?.id ? String(chosenAuditDraftPdf.id) : null,
            };
          }

          if (judgePrimaryPdf?.file_url) {
            const judgePrimaryUpdatedAt =
              latestDraftUpdatedAt || payloadLatestDocumentUpdatedAt || (row.created_at ? String(row.created_at) : null);
            return {
              url: String(judgePrimaryPdf.file_url),
              versionId: null,
              updatedAt: judgePrimaryUpdatedAt,
              attachmentId: judgePrimaryPdf?.id ? String(judgePrimaryPdf.id) : null,
            };
          }

          return null;
        };

        const pickDocx = () => {
          if (payloadDocUrl && payloadDocIsDocx && payloadVersionMatchesLatestDraft) {
            return {
              url: payloadDocUrl,
              versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
              updatedAt: payloadLatestDocumentUpdatedAt || latestDraftUpdatedAt || auditDocVersionCreatedAt || null,
              attachmentId: null,
            };
          }
          const url = editedDocxUrl || null;
          if (!url && !judgePrimaryDocx?.file_url) return null;
          return {
            url: url || String(judgePrimaryDocx?.file_url || ''),
            versionId: auditDraftVersionId || latestDraftVersionId || null,
            updatedAt: auditDraftUpdatedAt || latestDraftUpdatedAt || auditDocVersionCreatedAt || null,
            attachmentId:
              (chosenAuditDraftDocx?.id ? String(chosenAuditDraftDocx.id) : null) ||
              (judgePrimaryDocx?.id ? String(judgePrimaryDocx.id) : null),
          };
        };

        if (mode === 'pdf') {
          const pdf = pickPdf();
          if (pdf) {
            effectiveUrl = pdf.url;
            source = 'saved_pdf';
            versionId = pdf.versionId;
            updatedAt = pdf.updatedAt;
            attachmentId = pdf.attachmentId;
          } else {
            const docx = pickDocx();
            if (docx) {
              effectiveUrl = docx.url;
              source = 'edited_docx';
              versionId = docx.versionId;
              updatedAt = docx.updatedAt;
              attachmentId = docx.attachmentId;
            }
          }
        } else {
          const docx = pickDocx();
          if (docx) {
            effectiveUrl = docx.url;
            source = 'edited_docx';
            versionId = docx.versionId;
            updatedAt = docx.updatedAt;
            attachmentId = docx.attachmentId;
          }
        }

        if (!effectiveUrl && baseUrl) {
          effectiveUrl = baseUrl;
          source = 'base';
          versionId = null;
          updatedAt = row.created_at ? String(row.created_at) : null;
          attachmentId = null;
        }

        return {
          rasmId: row.id,
          effectiveUrl,
          source,
          versionId,
          updatedAt,
          attachmentId,
        };
      }),

    prepareSigningPortalDocument: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        forceSaveRequestId: z.string().nullable().optional(),
      }))
      .output(z.object({
        rasmId: z.string(),
        finalPdfUrl: z.string().nullable(),
        versionId: z.string().nullable(),
        source: z.enum(['saved_pdf', 'payload_pdf', 'generated_from_docx']).nullable(),
        debugJson: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access this');

        const { data: row, error } = await supabase
          .from('saved_rasms')
          .select('*')
          .eq('id', input.id)
          .single();

        if (error || !row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found in database' });
        if (row.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });

        const payloadObj = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, any>) : {};
        const requestedForceSaveRequestId = String(input.forceSaveRequestId || '').trim() || null;
        const latestDraftVersionId = row.latest_draft_version_id ? String(row.latest_draft_version_id) : null;
        const latestDraftDocxUrl = row.latest_draft_docx_url ? String(row.latest_draft_docx_url) : null;

        const { data: attachments } = await supabase
          .from('deed_attachments')
          .select('id, category, file_url, file_name, mime_type, metadata, created_at')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', row.id)
          .order('created_at', { ascending: false });

        const attList = (attachments ?? []) as any[];
        const attachmentDebug = attList.map((item: any) => ({
          id: String(item?.id || ''),
          category: String(item?.category || ''),
          fileUrl: String(item?.file_url || ''),
          fileName: String(item?.file_name || ''),
          mimeType: String(item?.mime_type || ''),
          source: String(item?.metadata?.source || ''),
          versionId: String(item?.metadata?.versionId || item?.metadata?.version_id || ''),
          forceSaveRequestId: String(item?.metadata?.forceSaveRequestId || ''),
          isMainDocument: !!item?.metadata?.isMainDocument,
          documentRole: String(item?.metadata?.documentRole || ''),
        }));

        const payloadLatestForceSaveRequestId =
          String(payloadObj?.latestForceSaveRequestId || '').trim() || null;

        const buildDebugJson = (decision: string, extra?: Record<string, unknown>) =>
          JSON.stringify({
            rasmId: row.id,
            decision,
            latestDraftVersionId,
            latestDraftDocxUrl,
            payloadPointers: {
              latestDocumentUrl: String(payloadObj?.latestDocumentUrl || ''),
              latestDocumentMimeType: String(payloadObj?.latestDocumentMimeType || ''),
              latestDocumentVersionId: String(payloadObj?.latestDocumentVersionId || ''),
              latestSigningPdfUrl: String(payloadObj?.latestSigningPdfUrl || ''),
              latestMainDocumentCategory: String(payloadObj?.latestMainDocumentCategory || ''),
              latestForceSaveRequestId: payloadLatestForceSaveRequestId || '',
              originalFileUrl: String(payloadObj?.originalFileUrl || ''),
              docUrl: String(payloadObj?.doc_url || ''),
              documentUrl: String(payloadObj?.document_url || ''),
            },
            attachments: attachmentDebug,
            ...(extra || {}),
          });

        const isPdfCandidate = (rawUrl?: string | null, rawName?: string | null, rawMime?: string | null) => {
          const url = String(rawUrl || '').toLowerCase();
          const fileName = String(rawName || '').toLowerCase();
          const mime = String(rawMime || '').toLowerCase();
          return fileName.endsWith('.pdf') || url.includes('.pdf') || mime.includes('application/pdf');
        };

        const isDocxCandidate = (rawUrl?: string | null, rawName?: string | null, rawMime?: string | null) => {
          const url = String(rawUrl || '').toLowerCase();
          const fileName = String(rawName || '').toLowerCase();
          const mime = String(rawMime || '').toLowerCase();
          return (
            fileName.endsWith('.docx') ||
            url.includes('.docx') ||
            mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          );
        };

        // 1. CANONICAL UPDATED PDF PREVIEW POINTER
        // If a direct compiled/converted PDF preview URL exists on the canonical row or payload, return it immediately!
        const canonicalPdfUrl =
          (row as any)?.pdf_preview_url ||
          payloadObj?.pdf_preview_url ||
          payloadObj?.latestDraftPdfUrl ||
          payloadObj?.latestSigningPdfUrl ||
          null;

        if (canonicalPdfUrl && isPdfCandidate(canonicalPdfUrl, null, 'application/pdf')) {
          return {
            rasmId: row.id,
            finalPdfUrl: String(canonicalPdfUrl),
            versionId: latestDraftVersionId || payloadObj?.latestDocxVersionId || payloadObj?.latestDocumentVersionId || null,
            source: 'saved_pdf' as const,
            debugJson: buildDebugJson('canonical_saved_rasms_pdf_preview', {
              canonicalPdfUrl,
            }),
          };
        }

        // 2. Freshly saved audit_final_pdf or audit_draft_pdf attachment
        const auditFinalPdf = attList.find((item: any) => {
          const category = String(item?.category || '').toLowerCase();
          return (category === 'audit_final_pdf' || category === 'audit_draft_pdf') && isPdfCandidate(item?.file_url, item?.file_name, item?.mime_type);
        });
        if (auditFinalPdf?.file_url) {
          return {
            rasmId: row.id,
            finalPdfUrl: String(auditFinalPdf.file_url),
            versionId: latestDraftVersionId || String(auditFinalPdf?.metadata?.versionId || auditFinalPdf?.metadata?.version_id || '').trim() || null,
            source: 'saved_pdf' as const,
            debugJson: buildDebugJson('audit_final_pdf_match', {
              matchedAttachmentId: String(auditFinalPdf?.id || ''),
            }),
          };
        }

        const pickAttachmentByVersion = (items: any[], desiredVersionId: string | null) => {
          if (!items.length) return null;
          if (desiredVersionId) {
            const matched = items.find((item) => {
              const versionId = String(item?.metadata?.versionId || item?.metadata?.version_id || '').trim();
              return versionId === desiredVersionId;
            });
            if (matched) return matched;
          }
          return items[0] || null;
        };

        const matchesRequestedForceSave = (item: any) => {
          if (!requestedForceSaveRequestId) return true;
          const attReq = String(item?.metadata?.forceSaveRequestId || '').trim() || null;
          return attReq === requestedForceSaveRequestId;
        };

        const payloadMatchesRequestedForceSave =
          !requestedForceSaveRequestId || payloadLatestForceSaveRequestId === requestedForceSaveRequestId;

        const mainPdfCategories = ['audit_final_pdf', 'audit_draft_pdf', 'document', 'primary_attachment'];
        for (const category of mainPdfCategories) {
          const matching = attList.filter((item: any) => {
            const normalizedCategory = String(item?.category || '').toLowerCase();
            if (normalizedCategory !== category) return false;
            if ((category === 'audit_final_pdf' || category === 'audit_draft_pdf') && !matchesRequestedForceSave(item)) {
              return false;
            }
            return true;
          });
          const picked = pickAttachmentByVersion(matching, latestDraftVersionId);
          if (picked?.file_url && isPdfCandidate(picked.file_url, picked.file_name, picked.mime_type)) {
            return {
              rasmId: row.id,
              finalPdfUrl: String(picked.file_url),
              versionId:
                String(picked?.metadata?.versionId || picked?.metadata?.version_id || latestDraftVersionId || '').trim() || null,
              source: 'saved_pdf' as const,
              debugJson: buildDebugJson('saved_pdf_category_match', {
                matchedCategory: category,
                matchedAttachmentId: String(picked?.id || ''),
              }),
            };
          }
        }

        const judgePrimaryPdf = attList.find((item: any) => {
          const category = String(item?.category || '').toLowerCase();
          const source = String(item?.metadata?.source || '').toLowerCase();
          return category === 'judge_attachment' && source === 'judge_submission' && isPdfCandidate(item?.file_url, item?.file_name, item?.mime_type);
        });
        if (judgePrimaryPdf?.file_url) {
          return {
            rasmId: row.id,
            finalPdfUrl: String(judgePrimaryPdf.file_url),
            versionId: null,
            source: 'saved_pdf' as const,
            debugJson: buildDebugJson('judge_primary_pdf_fallback', {
              matchedAttachmentId: String(judgePrimaryPdf?.id || ''),
            }),
          };
        }

        const payloadAttachment = payloadObj?.attachment;
        const payloadMainFileUrl =
          String(payloadObj?.originalFileUrl || payloadObj?.doc_url || payloadObj?.document_url || '').trim() ||
          (payloadAttachment && typeof payloadAttachment === 'object'
            ? String(
                payloadAttachment.url ||
                  payloadAttachment.fileUrl ||
                  payloadAttachment.file_url ||
                  payloadAttachment.fileURL ||
                  ''
              ).trim()
            : '') ||
          (typeof payloadAttachment === 'string' ? String(payloadAttachment).trim() : '') ||
          null;
        const payloadMainFileName =
          payloadAttachment && typeof payloadAttachment === 'object'
            ? String(payloadAttachment.name || payloadAttachment.fileName || payloadAttachment.filename || '').trim() || null
            : null;
        const payloadMainFileMime =
          payloadAttachment && typeof payloadAttachment === 'object'
            ? String(payloadAttachment.type || payloadAttachment.mimeType || payloadAttachment.mime_type || '').trim() || null
            : null;

        if (payloadMainFileUrl && isPdfCandidate(payloadMainFileUrl, payloadMainFileName, payloadMainFileMime)) {
          return {
            rasmId: row.id,
            finalPdfUrl: payloadMainFileUrl,
            versionId: latestDraftVersionId,
            source: 'payload_pdf' as const,
            debugJson: buildDebugJson('payload_main_file_pdf', {
              payloadMainFileUrl,
              payloadMainFileName,
              payloadMainFileMime,
            }),
          };
        }

        const payloadLatestDocumentUrl = payloadObj?.latestDocumentUrl ? String(payloadObj.latestDocumentUrl) : null;
        const payloadLatestDocumentMimeType = payloadObj?.latestDocumentMimeType ? String(payloadObj.latestDocumentMimeType) : null;
        const payloadLatestDocumentVersionId = payloadObj?.latestDocumentVersionId ? String(payloadObj.latestDocumentVersionId) : null;
        const payloadLatestSigningPdfUrl = payloadObj?.latestSigningPdfUrl ? String(payloadObj.latestSigningPdfUrl) : null;
        const payloadLatestMatchesLatest =
          !latestDraftVersionId ||
          !payloadLatestDocumentVersionId ||
          payloadLatestDocumentVersionId === latestDraftVersionId;

        if (
          payloadLatestSigningPdfUrl &&
          isPdfCandidate(payloadLatestSigningPdfUrl, null, 'application/pdf') &&
          payloadLatestMatchesLatest &&
          payloadMatchesRequestedForceSave
        ) {
          return {
            rasmId: row.id,
            finalPdfUrl: payloadLatestSigningPdfUrl,
            versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
            source: 'payload_pdf' as const,
            debugJson: buildDebugJson('payload_latest_signing_pdf', {
              payloadLatestSigningPdfUrl,
              payloadLatestDocumentVersionId,
              payloadLatestMatchesLatest,
            }),
          };
        }

        if (
          payloadLatestDocumentUrl &&
          isPdfCandidate(payloadLatestDocumentUrl, null, payloadLatestDocumentMimeType) &&
          payloadLatestMatchesLatest &&
          payloadMatchesRequestedForceSave
        ) {
          return {
            rasmId: row.id,
            finalPdfUrl: payloadLatestDocumentUrl,
            versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
            source: 'payload_pdf' as const,
            debugJson: buildDebugJson('payload_latest_document_pdf', {
              payloadLatestDocumentUrl,
              payloadLatestDocumentMimeType,
              payloadLatestDocumentVersionId,
              payloadLatestMatchesLatest,
            }),
          };
        }

        const mainDocxAttachments = attList.filter((item: any) =>
          ['audit_draft_docx', 'audit_final_docx'].includes(String(item?.category || '').toLowerCase()) &&
          matchesRequestedForceSave(item)
        );
        const pickedDocxAttachment = pickAttachmentByVersion(mainDocxAttachments, latestDraftVersionId);
        const judgePrimaryDocx = attList.find((item: any) => {
          const category = String(item?.category || '').toLowerCase();
          const source = String(item?.metadata?.source || '').toLowerCase();
          return category === 'judge_attachment_docx' && source === 'judge_submission' && isDocxCandidate(item?.file_url, item?.file_name, item?.mime_type);
        });

        const mainDocxCandidate =
          (latestDraftDocxUrl
            ? { url: latestDraftDocxUrl, versionId: latestDraftVersionId }
            : null) ||
          (pickedDocxAttachment?.file_url && isDocxCandidate(pickedDocxAttachment.file_url, pickedDocxAttachment.file_name, pickedDocxAttachment.mime_type)
            ? {
                url: String(pickedDocxAttachment.file_url),
                versionId:
                  String(
                    pickedDocxAttachment?.metadata?.versionId ||
                      pickedDocxAttachment?.metadata?.version_id ||
                      latestDraftVersionId ||
                      ''
                  ).trim() || null,
              }
            : null) ||
          (payloadLatestDocumentUrl && payloadLatestMatchesLatest && isDocxCandidate(payloadLatestDocumentUrl, null, payloadLatestDocumentMimeType)
            && payloadMatchesRequestedForceSave
            ? {
                url: payloadLatestDocumentUrl,
                versionId: payloadLatestDocumentVersionId || latestDraftVersionId || null,
              }
            : null) ||
          (judgePrimaryDocx?.file_url
            ? {
                url: String(judgePrimaryDocx.file_url),
                versionId:
                  String(judgePrimaryDocx?.metadata?.versionId || judgePrimaryDocx?.metadata?.version_id || '').trim() || null,
              }
            : null) ||
          (payloadMainFileUrl && isDocxCandidate(payloadMainFileUrl, payloadMainFileName, payloadMainFileMime)
            ? {
                url: payloadMainFileUrl,
                versionId: latestDraftVersionId || payloadLatestDocumentVersionId || null,
              }
            : null);

        if (!mainDocxCandidate?.versionId && !mainDocxCandidate?.url) {
          const debugJson = buildDebugJson('no_main_document_identified', {
            mainDocxCandidate: mainDocxCandidate || null,
            requestedForceSaveRequestId,
          });
          console.warn('[prepareSigningPortalDocument] no-main-document', debugJson);
          return {
            rasmId: row.id,
            finalPdfUrl: null,
            versionId: null,
            source: null,
            debugJson,
          };
        }

        if (mainDocxCandidate?.url && !mainDocxCandidate?.versionId) {
          const directFinalized = await finalizeDirectDocxForSavedRasm({
            user: { id: String(user.id), role: String(user.role) },
            savedRasmId: row.id,
            docxUrl: String(mainDocxCandidate.url),
            suppliedVersionId: latestDraftVersionId || payloadLatestDocumentVersionId || null,
            attachmentId:
              String(
                pickedDocxAttachment?.id ||
                  judgePrimaryDocx?.id ||
                  ''
              ).trim() || null,
          });

          const debugJson = buildDebugJson('generated_from_docx_without_version_id', {
            mainDocxCandidate,
            finalizedPdfUrl: String(directFinalized.finalPdfUrl || ''),
            finalizedVersionId: String(directFinalized.versionId || ''),
          });
          console.info('[prepareSigningPortalDocument] finalized-from-docx-no-version', debugJson);
          return {
            rasmId: row.id,
            finalPdfUrl: String(directFinalized.finalPdfUrl || ''),
            versionId: String(directFinalized.versionId || ''),
            source: 'generated_from_docx' as const,
            debugJson,
          };
        }

        const finalized = await finalizeSigningVersionForUser({
          user: { id: String(user.id), role: String(user.role) },
          versionId: mainDocxCandidate.versionId,
        });

        const debugJson = buildDebugJson('generated_from_docx', {
          mainDocxCandidate,
          finalizedPdfUrl: String(finalized.finalPdfUrl || ''),
        });
        console.info('[prepareSigningPortalDocument] finalized-from-docx', debugJson);
        return {
          rasmId: row.id,
          finalPdfUrl: String(finalized.finalPdfUrl || ''),
          versionId: String(finalized.versionId || ''),
          source: 'generated_from_docx' as const,
          debugJson,
        };
      }),

    deleteSavedRasm: publicProcedure
      .input(z.object({ sessionToken: z.string(), id: z.string().uuid() }))
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access this');

        const { data: row, error: fetchError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, notary_name')
          .eq('id', input.id)
          .single();

        if (fetchError || !row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
        
        const userFullName = String((user as any)?.full_name || '').trim();
        const existingName = String((row as any)?.notary_name || '').trim();
        const isOwner = row.notary_user_id === user.id || 
                       (row.notary_user_id === null && userFullName !== '' && existingName === userFullName) ||
                       (userFullName !== '' && existingName === userFullName);

        if (!isOwner) throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });

        const protectedIds = await listProtectedSavedRasmIds([row.id]);
        if (protectedIds.has(String(row.id))) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'لا يمكن حذف وثيقة مرتبطة بالأرشيف الموقّع أو النسخ المؤرشفة النهائية',
          });
        }

        const { data: attachments, error: attError } = await supabase
          .from('deed_attachments')
          .select('storage_path')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', row.id);

        if (attError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attError.message });

        const paths = (attachments ?? []).map((a) => a.storage_path).filter(Boolean) as string[];
        if (paths.length) {
          const { error: removeError } = await supabase.storage.from('rasm-files').remove(paths);
          if (removeError) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: removeError.message });
          }
        }

        const { error: deleteAttachmentsError } = await supabase
          .from('deed_attachments')
          .delete()
          .eq('record_type', 'saved_rasm')
          .eq('record_id', row.id);

        if (deleteAttachmentsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteAttachmentsError.message });

        const { error: deleteError } = await supabase.from('saved_rasms').delete().eq('id', row.id);
        if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });

        return { success: true };
      }),

    deleteAllSavedRasms: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .output(z.object({ success: z.boolean(), count: z.number(), skippedCount: z.number() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can perform this action');

        const { data: rows, error: fetchError } = await supabase
          .from('saved_rasms')
          .select('id')
          .eq('notary_user_id', user.id);

        if (fetchError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fetchError.message });
        if (!rows || rows.length === 0) return { success: true, count: 0, skippedCount: 0 };

        const ids = rows.map(r => r.id);
        const protectedIds = await listProtectedSavedRasmIds(ids);
        const deletableIds = ids.filter((id) => !protectedIds.has(String(id)));

        if (deletableIds.length === 0) {
          return { success: true, count: 0, skippedCount: ids.length };
        }

        // Delete attachments from storage and DB first
        const { data: attachments, error: attError } = await supabase
          .from('deed_attachments')
          .select('storage_path')
          .eq('record_type', 'saved_rasm')
          .in('record_id', deletableIds);

        if (!attError && attachments) {
          const paths = attachments.map(a => a.storage_path).filter(Boolean);
          if (paths.length) {
            await supabase.storage.from('rasm-files').remove(paths);
          }
        }

        await supabase.from('deed_attachments').delete().eq('record_type', 'saved_rasm').in('record_id', deletableIds);
        const { error: deleteError, count } = await supabase.from('saved_rasms').delete().eq('notary_user_id', user.id).in('id', deletableIds);

        if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });

        return { success: true, count: count ?? deletableIds.length, skippedCount: ids.length - deletableIds.length };
      }),

    clearAllSavedRasmsByCategory: publicProcedure
      .input(z.object({ sessionToken: z.string(), category: z.string() }))
      .output(z.object({ success: z.boolean(), count: z.number(), skippedCount: z.number() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can perform this action');

        const { data: rows, error: fetchError } = await supabase
          .from('saved_rasms')
          .select('id')
          .eq('notary_user_id', user.id)
          .eq('document_type', input.category);

        if (fetchError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fetchError.message });
        if (!rows || rows.length === 0) return { success: true, count: 0, skippedCount: 0 };

        const ids = rows.map(r => r.id);
        const protectedIds = await listProtectedSavedRasmIds(ids);
        const deletableIds = ids.filter((id) => !protectedIds.has(String(id)));

        if (deletableIds.length === 0) {
          return { success: true, count: 0, skippedCount: ids.length };
        }

        // Delete attachments
        const { data: attachments, error: attError } = await supabase
          .from('deed_attachments')
          .select('storage_path')
          .eq('record_type', 'saved_rasm')
          .in('record_id', deletableIds);

        if (!attError && attachments) {
          const paths = attachments.map(a => a.storage_path).filter(Boolean);
          if (paths.length) {
            await supabase.storage.from('rasm-files').remove(paths);
          }
        }

        await supabase.from('deed_attachments').delete().eq('record_type', 'saved_rasm').in('record_id', deletableIds);
        const { error: deleteError, count } = await supabase
          .from('saved_rasms')
          .delete()
          .eq('notary_user_id', user.id)
          .eq('document_type', input.category)
          .in('id', deletableIds);

        if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });

        return { success: true, count: count ?? deletableIds.length, skippedCount: ids.length - deletableIds.length };
      }),

    finalize: publicProcedure
      .input(z.object({
        id: z.string(),
        notarySignature: z.string(),
        secondNotarySignature: z.string().optional(),
      }))
      .output(z.object({
        certificateNumber: z.string(),
        pdfUrl: z.string(),
        signedAt: z.string(),
        status: z.enum(['signed', 'ready_for_printing']),
      }))
      .mutation(async ({ input }) => {
        const certificateNumber = `CERT_${Date.now()}`;
        return {
          certificateNumber,
          pdfUrl: `/documents/${certificateNumber}.pdf`,
          signedAt: new Date().toISOString(),
          status: 'signed',
        };
      }),

};
