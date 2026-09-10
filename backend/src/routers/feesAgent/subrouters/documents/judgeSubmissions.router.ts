import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { CacheService } from '../../../../services/cacheService';
import { supabase } from '../../../../services/supabase';
import { RasmPdfService } from '../../../../services/rasmPdf';
import { uploadBufferToDocumentsBucket, uploadDocument, fileUploadSchema } from '../../../../utils/storage';
import { convertDocxToPdfViaLibreOffice } from '../../../../services/auditDocArtifacts';
import {
  buildJudgeCityPrefix,
  normalizeCourtMatchKey,
  buildJudgeCourtGeneratedId,
  getPriorityJudgeCourtIdentifier,
  sanitizePersistedPayload,
} from '../../helpers';
import {
  JUDGE_APPROVED_STATUSES,
  JUDGE_CITY_CODE_MAP,
} from '../../types';

const rasmPdfService = new RasmPdfService();

async function requireActiveUser(sessionToken: string) {
  return resolveSessionUser(sessionToken);
}

async function requireNotary(sessionToken: string) {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'هذه العملية متاحة للعدل فقط' });
  }
  return user;
}

export const judgeSubmissionsProcedures = {
    listAvailableJudgesForNotary: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .output(z.object({
        appellateCourt: z.string().nullable(),
        primaryCourt: z.string().nullable(),
        source: z.enum(['regional_profiles', 'regional_history', 'fallback_all']),
        judges: z.array(z.object({
          id: z.string(),
          fullName: z.string(),
          email: z.string().nullable(),
        })),
      }))
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken);

        return CacheService.remember(`ref:available_judges:${user.id}`, 300, async () => {
          const profileRes = await supabase
            .from('notary_profiles')
            .select('appellate_court, primary_court, court_name')
            .eq('user_id', user.id)
            .maybeSingle();

        const profile = profileRes.data as any;
        const appellateCourt = profile?.appellate_court ? String(profile.appellate_court) : null;
        const primaryCourt = profile?.primary_court ? String(profile.primary_court) : null;
        const courtName = profile?.court_name ? String(profile.court_name) : null;
        const courtKeys = Array.from(
          new Set(
            [appellateCourt, primaryCourt, courtName]
              .map((v) => normalizeCourtMatchKey(v))
              .filter(Boolean)
          )
        );

        const fetchJudgesByIds = async (ids: string[]) => {
          if (!ids.length) return [] as any[];
          const res = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', ids)
            .eq('role', 'authentication_judge')
            .eq('is_active', true)
            .order('full_name', { ascending: true });
          return (res.data ?? []) as any[];
        };

        let judges = [] as any[];
        let source: 'regional_profiles' | 'regional_history' | 'fallback_all' = 'regional_profiles';

        if (courtKeys.length) {
          const judgeProfilesRes = await supabase
            .from('judge_profiles')
            .select('user_id, appellate_court, primary_court, court_name')
            .not('user_id', 'is', null);

          if (!judgeProfilesRes.error) {
            const profileJudgeIds = Array.from(
              new Set(
                (judgeProfilesRes.data ?? [])
                  .filter((row: any) => {
                    const profileKeys = [
                      row?.appellate_court,
                      row?.primary_court,
                      row?.court_name,
                    ]
                      .map((v) => normalizeCourtMatchKey(v))
                      .filter(Boolean);

                    return profileKeys.some((key) => courtKeys.includes(key));
                  })
                  .map((row: any) => String(row.user_id))
              )
            );

            judges = await fetchJudgesByIds(profileJudgeIds);
          }
        }

        if (!judges.length && courtKeys.length) {
          let judgeIds: string[] = [];
          const historyRes = await supabase
            .from('judge_submissions')
            .select('judge_user_id, payload, updated_at')
            .not('judge_user_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(500);

          if (!historyRes.error) {
            judgeIds = Array.from(
              new Set(
                (historyRes.data ?? [])
                  .filter((row: any) => {
                    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
                    const payloadKeys = [
                      (payload as any)?.primary_court,
                      (payload as any)?.primaryCourt,
                      (payload as any)?.court_name,
                      (payload as any)?.courtName,
                      (payload as any)?.appellate_court,
                      (payload as any)?.appellateCourt,
                      (payload as any)?.courtCity,
                      (payload as any)?.city,
                    ]
                      .map((v) => normalizeCourtMatchKey(v))
                      .filter(Boolean);

                    return payloadKeys.some((key) => courtKeys.includes(key));
                  })
                  .map((row: any) => String(row.judge_user_id))
              )
            );
          }
          judges = await fetchJudgesByIds(judgeIds);
          source = 'regional_history';
        }

        if (!judges.length) {
          source = 'fallback_all';
          const fallbackRes = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'authentication_judge')
            .eq('is_active', true)
            .order('full_name', { ascending: true });

          if (fallbackRes.error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fallbackRes.error.message });
          }
          judges = (fallbackRes.data ?? []) as any[];
        }

          return {
            appellateCourt,
            primaryCourt,
            source,
            judges: judges.map((row: any) => ({
              id: String(row.id),
              fullName: String(row.full_name || 'قاضٍ غير مسمى'),
              email: row.email ? String(row.email) : null,
            })),
          };
        });
      }),

    submitToJudge: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        fileNumber: z.string().optional(),
        documentType: z.string().optional(),
        summary: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
        selectedJudgeUserId: z.string().uuid().optional(),
      }))
      .output(z.object({
        success: z.boolean(),
        submissionId: z.string(),
        status: z.string(),
        createdAt: z.string(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken);

        let assignedJudgeUserId = input.selectedJudgeUserId ?? null;
        if (!assignedJudgeUserId) {
          const judgeRes = await supabase
            .from('users')
            .select('id')
            .eq('role', 'authentication_judge')
            .eq('is_active', true)
            .order('full_name', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (judgeRes.error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: judgeRes.error.message });
          }

          assignedJudgeUserId = judgeRes.data?.id ? String(judgeRes.data.id) : null;
        }

        if (!assignedJudgeUserId) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'لا يوجد قاضٍ نشط لاستقبال الرسم حالياً',
          });
        }

        const rawBasePayload = (input.payload ?? {}) as any;
        const basePayload = sanitizePersistedPayload(rawBasePayload);

        const { data: created, error: createError } = await supabase
          .from('judge_submissions')
          .insert({
            notary_user_id: user.id,
            notary_name: user.full_name,
            file_number: input.fileNumber ?? null,
            document_type: input.documentType ?? null,
            summary: input.summary ?? null,
            payload: basePayload,
            status: 'pending',
            judge_user_id: assignedJudgeUserId,
          })
          .select('id, status, created_at')
          .single();

        if (createError || !created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: createError?.message ?? 'فشل إرسال الرسم إلى القاضي',
          });
        }

        const payloadAny = rawBasePayload && typeof rawBasePayload === 'object' ? { ...rawBasePayload } : {};
        const payloadAttachments = Array.isArray(payloadAny.attachments) ? [...payloadAny.attachments] : [];

        const decodeDataUrl = (dataUrl: string): Buffer | null => {
          const s = String(dataUrl || '');
          const comma = s.indexOf(',');
          if (comma === -1) return null;
          const meta = s.slice(0, comma);
          const data = s.slice(comma + 1);
          const isBase64 = /;base64/i.test(meta);
          if (!isBase64) return Buffer.from(decodeURIComponent(data), 'utf8');
          return Buffer.from(data, 'base64');
        };

        const readAttachmentBytes = async (att: any): Promise<Buffer | null> => {
          if (att?.base64) return Buffer.from(String(att.base64), 'base64');
          const url = String(att?.url || att?.fileUrl || att?.file_url || att?.fileURL || '').trim();
          if (!url) return null;
          if (url.startsWith('data:')) return decodeDataUrl(url);
          if (/^https?:/i.test(url)) {
            const resp = await fetch(url, { cache: 'no-store' as any });
            if (!resp.ok) return null;
            const ab = await resp.arrayBuffer();
            return Buffer.from(ab);
          }
          return null;
        };

        // 1. Process Main Deed Document
        const primaryDeed = payloadAny.attachment || payloadAny.judgeAttachment || payloadAny.manualRasmFile;
        let isDocx = false;
        let isPdf = false;
        let nameRaw = 'judge-attachment';
        if (primaryDeed) {
          nameRaw = String(primaryDeed?.name || primaryDeed?.fileName || 'judge-attachment');
          const typeRaw = String(primaryDeed?.type || primaryDeed?.mimeType || '').toLowerCase();
          const nameLower = nameRaw.toLowerCase();
          isDocx =
            nameLower.endsWith('.docx') ||
            nameLower.endsWith('.doc') ||
            typeRaw.includes('wordprocessingml') ||
            typeRaw.includes('msword') ||
            typeRaw.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
            typeRaw.includes('application/msword') ||
            typeRaw.includes('word') ||
            typeRaw.includes('officedocument');
          isPdf = nameLower.endsWith('.pdf') || typeRaw.includes('pdf');
        }

        const processPrimaryDeed = async () => {
          if (!primaryDeed) return;
          const docBytes = await readAttachmentBytes(primaryDeed);
          if (!docBytes) return;

          const safeBase = nameRaw.replace(/[^\w.\- ]+/g, '_').trim() || 'judge-attachment';
          const baseNoExt = safeBase.replace(/\.(docx?|dotx?|pdf)$/i, '').trim() || 'judge-attachment';

          let uploadedPdfUrl: string | null = null;
          let pdfFileSize = 0;

          if (isDocx) {
            // Upload original DOCX (for later editing)
            const uploadedDocx = await uploadBufferToDocumentsBucket({
              path: `judge-submissions/${created.id}/${baseNoExt}-${created.id}.docx`,
              buffer: docBytes,
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert: true,
            });

            // Convert to PDF for preview
            const pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer: docBytes });
            const uploadedPdf = await uploadBufferToDocumentsBucket({
              path: `judge-submissions/${created.id}/${baseNoExt}-${created.id}.pdf`,
              buffer: pdfRes.pdfBuffer,
              contentType: 'application/pdf',
              upsert: true,
            });

            uploadedPdfUrl = uploadedPdf.url;
            pdfFileSize = pdfRes.pdfBuffer.length;

            payloadAny.attachment = {
              ...primaryDeed,
              name: `${baseNoExt}.docx`,
              fileName: `${baseNoExt}.docx`,
              category: 'judge_attachment_docx',
              url: uploadedDocx.url,
              fileUrl: uploadedDocx.url,
              pdfUrl: uploadedPdf.url,
              base64: undefined,
            };
            payloadAny.previewUrl = uploadedPdf.url;
            payloadAny.previewName = `${baseNoExt}.pdf`;
            payloadAny.canonical_approved_pdf = uploadedPdf.url;
            payloadAny.signed_pdf_url = uploadedPdf.url;
            payloadAny.pdf_preview_url = uploadedPdf.url;

            await supabase.from('deed_attachments').insert([
              {
                record_type: 'judge_submission',
                record_id: created.id,
                category: 'judge_attachment',
                file_name: `${baseNoExt}.pdf`,
                file_url: uploadedPdf.url,
                mime_type: 'application/pdf',
                file_size: pdfRes.pdfBuffer.length,
              },
              {
                record_type: 'judge_submission',
                record_id: created.id,
                category: 'judge_attachment_docx',
                file_name: `${baseNoExt}.docx`,
                file_url: uploadedDocx.url,
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                file_size: docBytes.length,
              }
            ]);
          } else if (isPdf) {
            const uploadedPdf = await uploadBufferToDocumentsBucket({
              path: `judge-submissions/${created.id}/${baseNoExt}-${created.id}.pdf`,
              buffer: docBytes,
              contentType: 'application/pdf',
              upsert: true,
            });

            uploadedPdfUrl = uploadedPdf.url;
            pdfFileSize = docBytes.length;

            payloadAny.attachment = {
              ...primaryDeed,
              name: `${baseNoExt}.pdf`,
              fileName: `${baseNoExt}.pdf`,
              category: 'judge_attachment',
              url: uploadedPdf.url,
              fileUrl: uploadedPdf.url,
              base64: undefined,
            };
            payloadAny.previewUrl = uploadedPdf.url;
            payloadAny.previewName = `${baseNoExt}.pdf`;
            payloadAny.canonical_approved_pdf = uploadedPdf.url;
            payloadAny.signed_pdf_url = uploadedPdf.url;
            payloadAny.pdf_preview_url = uploadedPdf.url;

            await supabase.from('deed_attachments').insert({
              record_type: 'judge_submission',
              record_id: created.id,
              category: 'judge_attachment',
              file_name: `${baseNoExt}.pdf`,
              file_url: uploadedPdf.url,
              mime_type: 'application/pdf',
              file_size: docBytes.length,
            });
          }

          if (uploadedPdfUrl) {
            let targetRasmId = payloadAny.savedRasmId || rawBasePayload?.savedRasmId;
            if (!targetRasmId && input.fileNumber) {
              const { data: foundRasm } = await supabase
                .from('saved_rasms')
                .select('id')
                .eq('user_id', user.id)
                .eq('file_number', String(input.fileNumber).trim())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (foundRasm?.id) {
                targetRasmId = foundRasm.id;
                payloadAny.savedRasmId = targetRasmId;
              }
            }

            if (targetRasmId) {
              await supabase
                .from('saved_rasms')
                .update({
                  canonical_approved_pdf: uploadedPdfUrl,
                  signed_pdf_url: uploadedPdfUrl,
                  pdf_preview_url: uploadedPdfUrl,
                  previewUrl: uploadedPdfUrl,
                  pdfCompilationReady: true,
                })
                .eq('id', targetRasmId);

              await supabase.from('deed_attachments').insert([
                {
                  record_type: 'saved_rasm',
                  record_id: targetRasmId,
                  category: 'judge_attachment',
                  file_name: `${baseNoExt}.pdf`,
                  file_url: uploadedPdfUrl,
                  mime_type: 'application/pdf',
                  file_size: pdfFileSize,
                },
                {
                  record_type: 'saved_rasm',
                  record_id: targetRasmId,
                  category: 'audit_final_pdf',
                  file_name: `${baseNoExt}.pdf`,
                  file_url: uploadedPdfUrl,
                  mime_type: 'application/pdf',
                  file_size: pdfFileSize,
                }
              ]);
            }
          }
        };

        const processAdditionalAttachments = async () => {
          const updatedAttachments: any[] = [];
          for (let i = 0; i < payloadAttachments.length; i++) {
            const att = { ...payloadAttachments[i] };
            try {
              const attBytes = await readAttachmentBytes(att);
              if (attBytes && attBytes.length > 0) {
                const rawName = String(att.name || att.fileName || `attachment_${i + 1}`);
                const safeName = rawName.replace(/[^\w.\- ]+/g, '_').trim() || `attachment_${i + 1}`;
                const contentType = att.type || att.mimeType || 'application/octet-stream';

                const uploaded = await uploadBufferToDocumentsBucket({
                  path: `judge-submissions/${created.id}/attachments/${i}-${safeName}`,
                  buffer: attBytes,
                  contentType,
                  upsert: true,
                });

                att.fileUrl = uploaded.url;
                att.url = uploaded.url;
                att.base64 = undefined;

                await supabase.from('deed_attachments').insert({
                  record_type: 'judge_submission',
                  record_id: created.id,
                  category: String(att.category || att.field || 'attachment'),
                  file_name: rawName,
                  file_url: uploaded.url,
                  mime_type: contentType,
                  file_size: attBytes.length,
                  metadata: {
                    field: att.field,
                    category: att.category,
                  },
                });
              }
            } catch (attErr) {
              // eslint-disable-next-line no-console
              console.error(`[submitToJudge-Attachment] Failed to process attachment index ${i}:`, attErr);
            }
            updatedAttachments.push(att);
          }
          payloadAny.attachments = updatedAttachments;
        };

        // Complete processing for primary deed and attachments synchronously
        // so Judge immediately receives the fully compiled PDF and attachments on first fetch with ZERO manual refresh!
        try {
          if (primaryDeed) {
            await processPrimaryDeed();
          }
          if (payloadAttachments.length > 0) {
            await processAdditionalAttachments();
          }
          await supabase
            .from('judge_submissions')
            .update({ payload: sanitizePersistedPayload(payloadAny) })
            .eq('id', created.id);
        } catch (syncErr) {
          // eslint-disable-next-line no-console
          console.error('[submitToJudge] Synchronous upload/conversion failed, fallback to best-effort save:', syncErr);
          try {
            await supabase
              .from('judge_submissions')
              .update({ payload: sanitizePersistedPayload(payloadAny) })
              .eq('id', created.id);
          } catch {
            // best-effort
          }
        }

        return {
          success: true,
          submissionId: created.id,
          status: created.status,
          createdAt: created.created_at,
        };
      }),

    getJudgeSubmissionStatus: publicProcedure
      .input(z.object({ sessionToken: z.string(), submissionId: z.string().uuid() }))
      .output(z.object({
        id: z.string(),
        status: z.string(),
        decision: z.string().nullable(),
        judgeNotes: z.string().nullable(),
        updatedAt: z.string(),
        decidedAt: z.string().nullable(),
        signedPdfUrl: z.string().nullable().optional(),
        pdfPreviewUrl: z.string().nullable().optional(),
      }))
      .query(async ({ input }) => {
        const user = await requireActiveUser(input.sessionToken);

        const { data, error } = await supabase
          .from('judge_submissions')
          .select('id, notary_user_id, status, decision, judge_notes, updated_at, decided_at, payload')
          .eq('id', input.submissionId)
          .single();

        if (error || !data) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
        }

        if (user.role === 'notary' && data.notary_user_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        if (user.role !== 'notary' && user.role !== 'authentication_judge') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        const pl = (data.payload && typeof data.payload === 'object') ? (data.payload as Record<string, unknown>) : {};
        const pdfUrl =
          String(
            pl.signed_pdf_url ||
            pl.signedPdfUrl ||
            pl.pdf_preview_url ||
            pl.pdfPreviewUrl ||
            pl.canonical_approved_pdf ||
            pl.canonicalApprovedPdf ||
            (pl.judgeCourtStamp as any)?.url ||
            (pl.judgeCourtStampedDoc as any)?.url ||
            (pl.judgeSignedDoc as any)?.url ||
            pl.previewUrl ||
            pl.finalPdfUrl ||
            ''
          ).trim() || null;

        return {
          id: data.id,
          status: data.status,
          decision: (data.decision ?? null),
          judgeNotes: (data.judge_notes ?? null),
          updatedAt: data.updated_at,
          decidedAt: (data.decided_at ?? null),
          signedPdfUrl: pdfUrl,
          pdfPreviewUrl: pdfUrl,
        };
      }),

    getMyJudgeSubmission: publicProcedure
      .input(z.object({ sessionToken: z.string(), submissionId: z.string().uuid() }))
      .output(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        status: z.string(),
        decision: z.string().nullable(),
        judgeNotes: z.string().nullable(),
        payload: z.record(z.unknown()).nullable(),
        updatedAt: z.string(),
        decidedAt: z.string().nullable(),
      }))
      .query(async ({ input }) => {
        const user = await requireActiveUser(input.sessionToken);

        if (user.role !== 'notary' && user.role !== 'authentication_judge') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        const { data, error } = await supabase
          .from('judge_submissions')
          .select('id, notary_user_id, file_number, document_type, payload, status, decision, judge_notes, updated_at, decided_at')
          .eq('id', input.submissionId)
          .single();

        if (error || !data) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
        }

        if (user.role === 'notary' && data.notary_user_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        return {
          id: data.id,
          fileNumber: (data.file_number ?? null),
          documentType: (data.document_type ?? null),
          status: data.status,
          decision: (data.decision ?? null),
          judgeNotes: (data.judge_notes ?? null),
          payload: (data.payload as any ?? null),
          updatedAt: data.updated_at,
          decidedAt: (data.decided_at ?? null),
        };
      }),

    listMyJudgeSubmissions: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .output(z.array(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        summary: z.string().nullable(),
        status: z.string(),
        decision: z.string().nullable(),
        judgeNotes: z.string().nullable(),
        decidedAt: z.string().nullable(),
        notaryStage: z.string(),
        notaryCompletedAt: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
        payload: z.record(z.unknown()).nullable(),
        notaryName: z.string().nullable(),
      })))
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken);

        const userFullName = String(user.full_name || '').trim();

          // Security: Filter by notary_user_id at the database level.
        // If no results, attempt name-based fallback for migration records.
        let { data: rawData, error } = await supabase
          .from('judge_submissions')
          .select('id,file_number,document_type,summary,status,decision,judge_notes,decided_at,notary_stage,notary_completed_at,created_at,updated_at,payload,notary_name,notary_user_id')
          .eq('notary_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        // Defensive: Double-check ownership in-memory to prevent leaks if DB filter is buggy
        let data = (rawData ?? []).filter(row => String(row.notary_user_id) === String(user.id));

        // If no results found by user_id and we have a valid name, try a fallback for legacy records
        if (data.length === 0 && userFullName !== '') {
          const fallbackRes = await supabase
            .from('judge_submissions')
            .select('id,file_number,document_type,summary,status,decision,judge_notes,decided_at,notary_stage,notary_completed_at,created_at,updated_at,payload,notary_name,notary_user_id')
            .is('notary_user_id', null)
            .eq('notary_name', userFullName)
            .order('created_at', { ascending: false });
          
          if (!fallbackRes.error && fallbackRes.data?.length) {
            // Apply defensive filtering to fallback results as well
            const fallbackFiltered = fallbackRes.data.filter(row => 
              (row.notary_user_id === null || row.notary_user_id === undefined) && 
              String(row.notary_name || '').trim() === userFullName
            );
            if (fallbackFiltered.length > 0) {
              data = fallbackFiltered;
            }
          }
        }

        return (data ?? []).map((row) => ({
          id: row.id,
          fileNumber: (row.file_number ?? null),
          documentType: (row.document_type ?? null),
          summary: (row.summary ?? null),
          status: row.status,
          decision: (row.decision ?? null),
          judgeNotes: (row.judge_notes ?? null),
          decidedAt: (row.decided_at ?? null),
          notaryStage: (row.notary_stage ?? 'sending'),
          notaryCompletedAt: (row.notary_completed_at ?? null),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          payload: (row.payload as any ?? null),
          notaryName: (row.notary_name ?? null),
        }));
      }),

    getLatestApprovedJudgeSubmissionByFileNumber: publicProcedure
      .input(z.object({ sessionToken: z.string(), fileNumber: z.string().min(1) }))
      .output(z.object({
        submission: z
          .object({
            id: z.string(),
            fileNumber: z.string().nullable(),
            documentType: z.string().nullable(),
            status: z.string(),
            decision: z.string().nullable(),
            judgeNotes: z.string().nullable(),
            payload: z.record(z.unknown()).nullable(),
            updatedAt: z.string(),
            decidedAt: z.string().nullable(),
          })
          .nullable(),
      }))
      .query(async ({ input }) => {
        const normalizeFileNumber = (raw: any) => {
          const s = (raw ?? '').toString().trim().toLowerCase();
          if (!s) return '';
          const toWesternDigits = (value: string) => value
            .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
            .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

          return toWesternDigits(s)
            .replace(/\s+/g, '')
            .replace(/[\\]+/g, '/')
            .replace(/[‐‑–—−]/g, '-')
            .replace(/[^a-z0-9\-\/]/g, '');
        };

        const user = await requireNotary(input.sessionToken);

        const target = normalizeFileNumber(input.fileNumber);

        const { data, error } = await supabase
          .from('judge_submissions')
          .select('id, file_number, document_type, status, decision, judge_notes, payload, updated_at, decided_at')
          .eq('notary_user_id', user.id)
          .in('status', ['accepted', 'accepted_with_notes', 'substantive_notes'])
          .order('decided_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false })
          .limit(50);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        const list = (data ?? []);
        const isMatch = (row: any) => {
          const payload = row?.payload && typeof row.payload === 'object' ? row.payload : null;
          const candidates = [
            row?.file_number,
            payload?.meta?.fileNumber,
            payload?.fileNumber,
            payload?.meta?.file_number,
            payload?.file_number,
          ].filter(Boolean);

          for (const c of candidates) {
            const n = normalizeFileNumber(c);
            if (!n) continue;
            if (n === target) return true;
            if (target && (n.includes(target) || target.includes(n))) return true;
          }
          return false;
        };

        const row = list.find(isMatch);
        if (!row) return { submission: null };

        return {
          submission: {
            id: row.id,
            fileNumber: (row.file_number ?? null),
            documentType: (row.document_type ?? null),
            status: row.status,
            decision: (row.decision ?? null),
            judgeNotes: (row.judge_notes ?? null),
            payload: (row.payload as any ?? null),
            updatedAt: row.updated_at,
            decidedAt: (row.decided_at ?? null),
          },
        };
      }),

    searchFinalizedSubmissions: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        mode: z.enum(['registry', 'identity']),
        fileNumber: z.string().optional(),
        name: z.string().optional(),
        cin: z.string().optional(),
        types: z.array(z.string()).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .output(z.array(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        notaryCompletedAt: z.string().nullable(),
        payload: z.record(z.unknown()).nullable(),
      })))
      .query(async ({ input }) => {
        const user = await requireActiveUser(input.sessionToken);

        if (user.role !== 'notary' && user.role !== 'authentication_judge') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        let query = supabase
          .from('judge_submissions')
          .select('id, file_number, document_type, notary_completed_at, payload')
          .eq('notary_stage', 'done');

        if (input.types && input.types.length > 0) {
          query = query.in('document_type', input.types);
        }
        if (input.dateFrom) {
          query = query.gte('notary_completed_at', input.dateFrom);
        }
        if (input.dateTo) {
          query = query.lte('notary_completed_at', input.dateTo);
        }
        if (input.mode === 'registry' && input.fileNumber) {
          query = query.eq('file_number', input.fileNumber);
        }

        const { data, error } = await query;
        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        let results = data || [];

        if (input.mode === 'identity' && (input.name || input.cin)) {
          const searchName = input.name?.toLowerCase();
          const searchCin = input.cin?.toLowerCase();

          results = results.filter((row: any) => {
            const payload = row.payload || {};
            const parties = [
              ...(payload.sellers || []),
              ...(payload.buyers || []),
              ...(payload.applicants || []),
              ...(payload.witnesses || []),
            ];
            return parties.some((p: any) => {
              const pName = p.name?.toLowerCase() || '';
              const pCin = p.idNumber?.toLowerCase() || '';
              if (searchName && pName.includes(searchName)) return true;
              if (searchCin && pCin.includes(searchCin)) return true;
              return false;
            });
          });
        }

        return results.map((row) => ({
          id: row.id,
          fileNumber: row.file_number,
          documentType: row.document_type,
          notaryCompletedAt: row.notary_completed_at,
          payload: row.payload as any,
        }));
      }),

    updateSubmissionStage: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        submissionId: z.string().uuid(),
        notaryStage: z.enum(['sending', 'inclusion', 'done']),
      }))
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        const user = await requireActiveUser(input.sessionToken);

        if (user.role !== 'notary' && user.role !== 'authentication_judge') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        const { data: existing, error: existingError } = await supabase
          .from('judge_submissions')
          .select('id, notary_user_id')
          .eq('id', input.submissionId)
          .single();

        if (existingError || !existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
        }

        if (existing.notary_user_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

        const patch: any = { notary_stage: input.notaryStage };
        if (input.notaryStage === 'done') {
          patch.notary_completed_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('judge_submissions')
          .update(patch)
          .eq('id', input.submissionId);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        return { success: true };
      }),

};
