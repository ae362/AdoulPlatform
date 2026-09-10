import http from 'http';
import https from 'https';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { supabase } from '../../../../services/supabase';

async function requireNotary(sessionToken: string, message = 'Only notaries can access this') {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message });
  return user;
}
import { RasmPdfService } from '../../../../services/rasmPdf';
import { uploadBufferToDocumentsBucket, uploadDocument, fileUploadSchema } from '../../../../utils/storage';
import { patchSchemaV1, patchSha256, sha256Hex } from '../../../../utils/auditDocPatch';
import { appendPlainTextToDocx, generateDocxFromText } from '../../../../services/smartDrafting';
import { convertDocxToPdfViaLibreOffice, convertPlainTextToPdfViaHtml } from '../../../../services/auditDocArtifacts';
import { applyTopHeaderPaginationToPdf, applyTopHeaderPaginationToDocx } from '../../../../services/pdfStamper';
import {
  signOnlyOfficeJwt,
  removeSavedRasmStorageByCategory,
  hmacToken,
  sanitizePersistedPayload,
  savedRasmsSchemaState,
} from '../../helpers';
import { ensureSavedRasmHasJudgeAttachments } from '../../extractors';
import { FeesAgentDocumentSchema, RasmPdfPayloadSchema } from '../../types';
import { finalizeSigningVersionForUser } from './documentFinalizers';

const rasmPdfService = new RasmPdfService();


export const draftsProcedures = {
    applyPagination: publicProcedure
      .input(
        z.object({
          sessionToken: z.string().optional(),
          signedDeedId: z.string().optional(),
          rasmId: z.string().optional(),
          position: z.enum(['TOP_HEADER', 'BOTTOM_FOOTER']).default('TOP_HEADER'),
          options: z
            .object({
              fontSize: z.number().optional(),
              topMargin: z.number().optional(),
              rightMargin: z.number().optional(),
              clearHeaderArea: z.boolean().optional(),
            })
            .optional(),
        })
      )
      .output(
        z.object({
          success: z.boolean(),
          signedDeedId: z.string().nullable().optional(),
          rasmId: z.string().nullable().optional(),
          pdfPreviewUrl: z.string().nullable().optional(),
          signedPdfUrl: z.string().nullable().optional(),
          docxUrl: z.string().nullable().optional(),
          totalPages: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { signedDeedId, rasmId } = input;
        if (!signedDeedId && !rasmId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing signedDeedId or rasmId' });
        }

        // --- CASE 1: SIGNED DEED (/signed-rasm) ---
        if (signedDeedId) {
          const { data: deed, error: deedError } = await supabase
            .from('signed_deeds')
            .select('*')
            .eq('id', signedDeedId)
            .single();

          if (deedError || !deed) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
          }

          const { data: attachments } = await supabase
            .from('deed_attachments')
            .select('*')
            .eq('record_type', 'signed_deed')
            .eq('record_id', signedDeedId)
            .order('created_at', { ascending: false });

          const attList = Array.isArray(attachments) ? attachments : [];
          let candidatePdfUrl =
            attList.find((a: any) => a.category === 'signed_pdf')?.file_url ||
            attList.find((a: any) => a.file_name?.toLowerCase().endsWith('.pdf'))?.file_url ||
            null;

          if (!candidatePdfUrl && deed.saved_rasm_id) {
            const { data: savedRasm } = await supabase
              .from('saved_rasms')
              .select('pdf_preview_url, payload')
              .eq('id', deed.saved_rasm_id)
              .maybeSingle();

            candidatePdfUrl =
              savedRasm?.pdf_preview_url ||
              (savedRasm?.payload as any)?.pdf_preview_url ||
              (savedRasm?.payload as any)?.latestDraftPdfUrl ||
              null;
          }

          if (!candidatePdfUrl) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'لا يوجد ملف PDF للرسم الموقع لإدراج ترقيم الصفحات.',
            });
          }

          let originalPdfBuffer: Buffer;
          try {
            const resp = await fetch(candidatePdfUrl, { cache: 'no-store' as any });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const ab = await resp.arrayBuffer();
            originalPdfBuffer = Buffer.from(ab);
          } catch (fetchErr: any) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `تعذر تحميل ملف الـ PDF: ${fetchErr?.message || String(fetchErr)}`,
            });
          }

          const stamped = await applyTopHeaderPaginationToPdf(originalPdfBuffer, {
            fontSize: input.options?.fontSize ?? 11,
            topMargin: input.options?.topMargin ?? 30,
            rightMargin: input.options?.rightMargin ?? 38,
            clearHeaderArea: input.options?.clearHeaderArea ?? false,
          });

          const stampedSha = sha256Hex(stamped.buffer);
          const uploaded = await uploadBufferToDocumentsBucket({
            path: `signed-deeds/${signedDeedId}/paginated_${Date.now()}_${stampedSha.slice(0, 10)}.pdf`,
            buffer: stamped.buffer,
            contentType: 'application/pdf',
            upsert: true,
          });

          await supabase
            .from('deed_attachments')
            .delete()
            .eq('record_type', 'signed_deed')
            .eq('record_id', signedDeedId)
            .eq('category', 'signed_pdf');

          await supabase.from('deed_attachments').insert({
            record_id: signedDeedId,
            record_type: 'signed_deed',
            category: 'signed_pdf',
            file_name: `signed-paginated-${signedDeedId}.pdf`,
            file_url: uploaded.url,
            storage_path: `signed-deeds/${signedDeedId}/paginated_${stampedSha}.pdf`,
            mime_type: 'application/pdf',
            file_size: stamped.buffer.length,
            metadata: {
              sha256: stampedSha,
              hasTopPagination: true,
              totalPages: stamped.totalPages,
              source: 'apply_top_pagination',
            },
          });

          return {
            success: true,
            signedDeedId,
            signedPdfUrl: uploaded.url,
            pdfPreviewUrl: uploaded.url,
            totalPages: stamped.totalPages,
          };
        }

        // --- CASE 2: SAVED RASM (rasmId) ---
        const { data: rasm, error: rasmError } = await supabase
          .from('saved_rasms')
          .select('*')
          .eq('id', rasmId)
          .single();

        if (rasmError || !rasm) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found' });
        }

        const { data: attachments } = await supabase
          .from('deed_attachments')
          .select('*')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', rasmId);

        const attList = Array.isArray(attachments) ? attachments : [];

        let pdfCandidateUrl: string | null =
          (rasm.payload as any)?.pdf_preview_url ||
          rasm.pdf_preview_url ||
          (rasm.payload as any)?.latestDraftPdfUrl ||
          (rasm.payload as any)?.latestDocumentUrl ||
          null;

        if (!pdfCandidateUrl || !pdfCandidateUrl.toLowerCase().includes('.pdf')) {
          const pdfAtt = attList.find(
            (a: any) =>
              a.category === 'audit_final_pdf' ||
              (a.file_name && a.file_name.toLowerCase().endsWith('.pdf')) ||
              (a.mime_type && a.mime_type.includes('pdf'))
          );
          if (pdfAtt?.file_url) {
            pdfCandidateUrl = pdfAtt.file_url;
          }
        }

        let docxCandidateUrl: string | null =
          (rasm.payload as any)?.primary_docx_url ||
          rasm.primary_docx_url ||
          (rasm.payload as any)?.latestDraftDocxUrl ||
          rasm.latest_draft_docx_url ||
          null;

        if (!docxCandidateUrl || !docxCandidateUrl.toLowerCase().includes('.docx')) {
          const docxAtt = attList.find(
            (a: any) =>
              a.category === 'audit_final_docx' ||
              a.category === 'document' ||
              (a.file_name && a.file_name.toLowerCase().endsWith('.docx'))
          );
          if (docxAtt?.file_url) {
            docxCandidateUrl = docxAtt.file_url;
          }
        }

        let pdfBuffer: Buffer | null = null;
        if (pdfCandidateUrl) {
          try {
            const resp = await fetch(pdfCandidateUrl, { cache: 'no-store' as any });
            if (resp.ok) {
              const ab = await resp.arrayBuffer();
              pdfBuffer = Buffer.from(ab);
            }
          } catch (fetchErr) {
            console.warn('[applyPagination] Failed to fetch existing PDF:', fetchErr);
          }
        }

        let docxBuffer: Buffer | null = null;
        if (docxCandidateUrl) {
          try {
            const resp = await fetch(docxCandidateUrl, { cache: 'no-store' as any });
            if (resp.ok) {
              const ab = await resp.arrayBuffer();
              docxBuffer = Buffer.from(ab);
            }
          } catch (fetchDocxErr) {
            console.warn('[applyPagination] Failed to fetch existing DOCX:', fetchDocxErr);
          }
        }

        if (!pdfBuffer && docxBuffer) {
          try {
            const conv = await convertDocxToPdfViaLibreOffice({ docxBuffer });
            if (conv?.pdfBuffer?.length) {
              pdfBuffer = conv.pdfBuffer;
            }
          } catch (convErr) {
            console.warn('[applyPagination] LibreOffice conversion fallback:', convErr);
          }
        }

        if (!pdfBuffer) {
          const draftText =
            rasm.draft ||
            (rasm.payload as any)?.draft ||
            (rasm.payload as any)?.rasmHtml ||
            'وثيقة عدلية رسمية';
          try {
            const gen = await convertPlainTextToPdfViaHtml({ text: draftText });
            if (gen?.pdfBuffer?.length) {
              pdfBuffer = gen.pdfBuffer;
            }
          } catch (genErr) {
            console.warn('[applyPagination] Text to PDF fallback:', genErr);
          }
        }

        if (!pdfBuffer || !pdfBuffer.length) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'تعذر تحميل أو توليد ملف الـ PDF لإدراج ترقيم الصفحات.',
          });
        }

        const stampedPdf = await applyTopHeaderPaginationToPdf(pdfBuffer, {
          fontSize: input.options?.fontSize ?? 11,
          topMargin: input.options?.topMargin ?? 30,
          rightMargin: input.options?.rightMargin ?? 38,
          clearHeaderArea: input.options?.clearHeaderArea ?? false,
        });

        const pdfSha = sha256Hex(stampedPdf.buffer);
        const uploadedPdf = await uploadBufferToDocumentsBucket({
          path: `saved/${rasmId}/paginated_${Date.now()}_${pdfSha.slice(0, 10)}.pdf`,
          buffer: stampedPdf.buffer,
          contentType: 'application/pdf',
          upsert: true,
        });

        let uploadedDocxUrl: string | null = null;
        if (docxBuffer) {
          try {
            const paginatedDocx = applyTopHeaderPaginationToDocx(docxBuffer);
            const docxSha = sha256Hex(paginatedDocx);
            const uploadedDocx = await uploadBufferToDocumentsBucket({
              path: `saved/${rasmId}/paginated_${docxSha}.docx`,
              buffer: paginatedDocx,
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert: true,
            });
            uploadedDocxUrl = uploadedDocx.url;
          } catch (docxPagErr) {
            console.warn('[applyPagination] Warning updating docx pagination:', docxPagErr);
          }
        }

        await supabase
          .from('deed_attachments')
          .delete()
          .eq('record_type', 'saved_rasm')
          .eq('record_id', rasmId)
          .eq('category', 'audit_final_pdf');

        await supabase.from('deed_attachments').insert({
          record_id: rasmId,
          record_type: 'saved_rasm',
          category: 'audit_final_pdf',
          file_name: `paginated-${rasmId}.pdf`,
          file_url: uploadedPdf.url,
          storage_path: `saved/${rasmId}/paginated_${pdfSha}.pdf`,
          mime_type: 'application/pdf',
          file_size: stampedPdf.buffer.length,
          metadata: {
            sha256: pdfSha,
            hasTopPagination: true,
            totalPages: stampedPdf.totalPages,
            source: 'apply_top_pagination',
          },
        });

        const nowIso = new Date().toISOString();
        const existingPayload = (rasm.payload as Record<string, unknown>) || {};
        const updatedPayload = {
          ...existingPayload,
          pdf_preview_url: uploadedPdf.url,
          latestDraftPdfUrl: uploadedPdf.url,
          latestDocumentUrl: uploadedPdf.url,
          hasTopPagination: true,
          totalPages: stampedPdf.totalPages,
          ...(uploadedDocxUrl ? { primary_docx_url: uploadedDocxUrl, latestDraftDocxUrl: uploadedDocxUrl } : {}),
        };

        const updateData: any = {
          pdf_preview_url: uploadedPdf.url,
          payload: updatedPayload,
          updated_at: nowIso,
        };
        if (uploadedDocxUrl) {
          updateData.primary_docx_url = uploadedDocxUrl;
          updateData.latest_draft_docx_url = uploadedDocxUrl;
        }

        await supabase.from('saved_rasms').update(updateData).eq('id', rasmId);

        return {
          success: true,
          rasmId,
          pdfPreviewUrl: uploadedPdf.url,
          docxUrl: uploadedDocxUrl,
          totalPages: stampedPdf.totalPages,
        };
      }),

    getOnlyOfficeConfig: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        savedRasmId: z.string().uuid().optional(),
        id: z.string().uuid().optional(),
        editorType: z.string().optional(),
      }))
      .output(z.object({
        dsUrl: z.string().nullable().optional(),
        documentServerUrl: z.string().nullable().optional(),
        config: z.record(z.unknown()).nullable().optional(),
        offline: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const rasmId = input.savedRasmId || input.id;
        if (!rasmId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing savedRasmId or id' });
        }

        const candidateUrls = [
          String(process.env.ONLYOFFICE_DS_URL || '').trim(),
          'http://localhost:8082',
          'http://localhost:8080',
        ].filter(Boolean);

        // Fast ping check (< 1000ms) across candidate URLs to detect active Document Server
        const checkUrl = (targetUrl: string): Promise<string | null> => {
          return new Promise((resolve) => {
            try {
              const parsed = new URL(targetUrl);
              const isHttps = parsed.protocol === 'https:';
              const client = isHttps ? https : http;
              const pingUrl = `${parsed.protocol}//${parsed.host}/web-apps/apps/api/documents/api.js`;
              const req = client.get(pingUrl, { timeout: 800 }, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
                  resolve(`${parsed.protocol}//${parsed.host}`);
                } else {
                  resolve(null);
                }
              });
              req.on('error', () => resolve(null));
              req.on('timeout', () => {
                req.destroy();
                resolve(null);
              });
            } catch {
              resolve(null);
            }
          });
        };

        const checkResults = await Promise.all(candidateUrls.map(checkUrl));
        const activeDsUrl = checkResults.find(Boolean) || null;

        if (!activeDsUrl) {
          return {
            offline: true,
            dsUrl: null,
            documentServerUrl: null,
            config: null,
          };
        }

        const user = await resolveSessionUser(input.sessionToken);
        const isAdminOrJudge = user.role === 'authentication_judge' || user.role === 'admin' || user.role === 'super_admin';
        if (user.role !== 'notary' && !isAdminOrJudge) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can edit' });

        const { data: rasm, error: rasmError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, file_number')
          .eq('id', rasmId)
          .single();

        if (rasmError || !rasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });
        if (!isAdminOrJudge && rasm.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        const { data: attachments, error: attError } = await supabase
          .from('deed_attachments')
          .select('id, category, file_name, file_url, mime_type, created_at')
          .eq('record_type', 'saved_rasm')
          .eq('record_id', rasmId)
          .order('created_at', { ascending: false });

        if (attError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attError.message });

        const list = attachments ?? [];
        const pick = (...cats: string[]) =>
          list.find((a: any) => cats.includes(String(a?.category || '').toLowerCase())) as any;

        // Prefer continuing from latest edit, else start from judge base DOCX.
        const base =
          pick('audit_draft_docx', 'audit_final_docx') ||
          pick('judge_attachment_docx') ||
          pick('primary_attachment') ||
          null;

        if (!base) throw new TRPCError({ code: 'NOT_FOUND', message: 'No DOCX attachment found for editing' });

        const dsUrl = activeDsUrl;
        const publicBackend = String(process.env.PUBLIC_BACKEND_URL || `http://localhost:${Number(process.env.PORT) || 4000}`).trim();

        const fileSecret = String(process.env.ONLYOFFICE_FILE_TOKEN_SECRET || '').trim();
        const callbackSecret = String(process.env.ONLYOFFICE_CALLBACK_TOKEN_SECRET || '').trim();

        const fileToken = fileSecret ? hmacToken(fileSecret, String(base.id)) : '';
        const cbToken = callbackSecret ? hmacToken(callbackSecret, `${rasmId}:${String(base.id)}`) : '';

        const directBaseFileUrl = String(base.file_url || base.fileUrl || '').trim();
        const proxiedFileUrl = `${publicBackend}/onlyoffice/file/${String(base.id)}${fileToken ? `?token=${fileToken}` : ''}`;
        const fileUrl = /^https?:\/\//i.test(directBaseFileUrl) ? directBaseFileUrl : proxiedFileUrl;
        const callbackUrl = `${publicBackend}/onlyoffice/callback/${rasmId}/${String(base.id)}${cbToken ? `?token=${cbToken}` : ''}`;

        const title = String(base.file_name || base.fileName || rasm.file_number || 'document.docx');
        const key = `${String(base.id)}-${Date.parse(String(base.created_at || '')) || Date.now()}`;

        const config: Record<string, unknown> = {
          document: {
            fileType: 'docx',
            key,
            title,
            url: fileUrl,
            permissions: {
              edit: true,
              download: true,
              print: true,
              review: true,
              comment: true,
              fillForms: true,
              modifyFilter: true,
              modifyContentControl: true,
            },
          },
          editorConfig: {
            callbackUrl,
            lang: 'ar',
            region: 'MA',
            mode: 'edit',
            customization: {
              autosave: true,
              forcesave: true,
            },
            user: {
              id: user.id,
              name: user.full_name || 'Notary',
            },
          },
          width: '100%',
          height: '100%',
          type: 'desktop',
        };

        const onlyOfficeJwtSecret = String(
          process.env.ONLYOFFICE_JWT_SECRET || process.env.ONLYOFFICE_DS_JWT_SECRET || ''
        ).trim();
        if (onlyOfficeJwtSecret) {
          config.token = signOnlyOfficeJwt(onlyOfficeJwtSecret, config);
        }

        return { dsUrl, documentServerUrl: dsUrl, config: config as any, offline: false };
      }),

    forceOnlyOfficeSave: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        savedRasmId: z.string().uuid(),
        documentKey: z.string().min(1),
        requestId: z.string().min(1),
      }))
      .output(z.object({
        success: z.boolean(),
        errorCode: z.number().nullable(),
        message: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);
        const isAdminOrJudge = user.role === 'authentication_judge' || user.role === 'admin' || user.role === 'super_admin';
        if (user.role !== 'notary' && !isAdminOrJudge) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can edit' });

        const { data: rasm, error: rasmError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id')
          .eq('id', input.savedRasmId)
          .single();

        if (rasmError || !rasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });
        if (!isAdminOrJudge && rasm.notary_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        const dsUrl = String(process.env.ONLYOFFICE_DS_URL || '').trim().replace(/\/+$/, '');
        if (!dsUrl) throw new TRPCError({ code: 'BAD_REQUEST', message: 'ONLYOFFICE_DS_URL is not configured on backend' });

        const payload: Record<string, unknown> = {
          c: 'forcesave',
          key: input.documentKey,
          userdata: JSON.stringify({
            savedRasmId: input.savedRasmId,
            requestId: input.requestId,
          }),
        };

        const onlyOfficeJwtSecret = String(
          process.env.ONLYOFFICE_JWT_SECRET || process.env.ONLYOFFICE_DS_JWT_SECRET || ''
        ).trim();
        if (onlyOfficeJwtSecret) {
          payload.token = signOnlyOfficeJwt(onlyOfficeJwtSecret, payload);
        }

        const commandUrl = `${dsUrl}/coauthoring/CommandService.ashx`;
        let responseJson: any = null;
        try {
          const response = await fetch(commandUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          responseJson = await response.json().catch(() => null);
          if (!response.ok) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `ONLYOFFICE force save failed (${response.status})`,
            });
          }
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error?.message || 'Failed to call ONLYOFFICE force save',
          });
        }

        const errorCode = Number(responseJson?.error);
        const success = errorCode === 0 || errorCode === 4;
        return {
          success,
          errorCode: Number.isFinite(errorCode) ? errorCode : null,
          message:
            success
              ? (errorCode === 4 ? 'No pending changes to save' : 'Force save accepted')
              : (responseJson?.message ? String(responseJson.message) : 'ONLYOFFICE force save was not accepted'),
        };
      }),

    saveDraft: publicProcedure
      .input(FeesAgentDocumentSchema)
      .output(z.object({
        id: z.string(),
        savedAt: z.string(),
        version: z.number(),
      }))
      .mutation(async ({ input }) => {
        const id = input.id || `draft_${Date.now()}`;
        return {
          id,
          savedAt: new Date().toISOString(),
          version: 1,
        };
      }),
    getDraft: publicProcedure
      .input(z.object({ id: z.string() }))
      .output(FeesAgentDocumentSchema)
      .query(async ({ input }) => {
        return {
          documentType: 'بيع_وشراء',
          seller: {
            name: 'محمد أحمد',
            idNumber: '1234567890',
            idIssueDate: '2015-01-01',
          },
          buyer: {
            name: 'فاطمة محمود',
            idNumber: '0987654321',
            idIssueDate: '2015-01-01',
          },
          property: {
            type: 'محفظ',
            boundaries: {
              north: 'شارع النيل',
              south: 'شارع التقدم',
              east: 'شارع الأمل',
              west: 'شارع الحياة',
            },
          },
          finance: {
            price: 500000,
            priceInWords: 'خمسمائة ألف درهم',
            paymentMethod: 'نقد',
            registeredWithTax: 'نعم',
          },
          meta: {
            fileNumber: '2025/1234',
            notaryPrimary: 'العدل المتلقي',
            dateGregorian: new Date().toISOString().split('T')[0],
            dateHijri: '1446/06/05',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    deleteDraft: publicProcedure
      .input(z.object({ id: z.string() }))
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        return { success: true };
      }),
    saveFinalRasm: publicProcedure
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
      .output(z.object({ id: z.string(), createdAt: z.string(), attachmentsCount: z.number() }))
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
        if (input.files?.length) {
          const inserts = [];
          for (const f of input.files) {
            const uploaded = await uploadDocument(f);
            attachmentsCount += 1;
            inserts.push({
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
          }
          if (inserts.length) {
            const { error: insertError } = await supabase.from('deed_attachments').insert(inserts);
            if (insertError) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message });
            }
          }
        }

        return {
          id: created.id,
          createdAt: created.created_at,
          attachmentsCount,
        };
      }),

    // =====================================================================
    // AUDIT DOC VERSIONS (base DOCX + patch => server artifacts)
    // =====================================================================

    savePatchDraft: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          savedRasmId: z.string().uuid(),
          baseDocUrl: z.string().url(),
          patch: patchSchemaV1,
          supersedesVersionId: z.string().uuid().optional(),
        })
      )
      .output(
        z.object({
          versionId: z.string().uuid(),
          status: z.enum(['draft', 'finalized']),
          createdAt: z.string().nullable(),
          previewPdfUrl: z.string().nullable(),
          previewPdfPath: z.string().nullable(),
          previewPdfBytes: z.number().nullable(),
          previewPdfSha256: z.string().nullable(),
          pdfConversionError: z.string().nullable(),
          previewDocxUrl: z.string().nullable(),
          previewDocxPath: z.string().nullable(),
          previewDocxBytes: z.number().nullable(),
          previewDocxSha256: z.string().nullable(),
          baseDocSha256: z.string().nullable(),
          patchSha256: z.string(),
          latestPointer: z.object({
            field: z.string(),
            versionId: z.string().uuid(),
            url: z.string().nullable(),
            updatedAt: z.string().nullable(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);

        // Ensure the rasm exists (and is owned by a notary).
        const { data: existingRasm, error: rasmError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id')
          .eq('id', input.savedRasmId)
          .single();

        if (rasmError || !existingRasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });

        // Minimal auth: allow notary/judge; enforce notary ownership when role is notary.
        if (user.role === 'notary' && existingRasm.notary_user_id !== user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        const { stableJson, sha256: patchSha } = patchSha256(input.patch);

        // Fetch base DOCX (immutable judge-accepted artifact)
        let baseDocSha256: string | null = null;
        let baseDocBytes: Buffer;
        try {
          const resp = await fetch(input.baseDocUrl, { cache: 'no-store' as any });
          if (!resp.ok) throw new Error(`base doc fetch failed (${resp.status})`);
          const ab = await resp.arrayBuffer();
          baseDocBytes = Buffer.from(ab);
          baseDocSha256 = sha256Hex(baseDocBytes);
          const head = baseDocBytes.slice(0, 2).toString('utf8');
          if (head !== 'PK') {
            throw new Error('base doc is not a DOCX/ZIP (missing PK header)');
          }
        } catch (e: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Failed to fetch base DOCX: ${e?.message || String(e)}` });
        }

        const setPlainTextOp = input.patch.ops.find((op: any) => op.op === 'set_plain_text') as any;
        const appendPlainTextOp = input.patch.ops.find((op: any) => op.op === 'append_plain_text') as any;
        if (!setPlainTextOp && !appendPlainTextOp) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Patch v1 must include set_plain_text or append_plain_text' });
        }

        const trimmed =
          setPlainTextOp
            ? String(setPlainTextOp.value || '').trim()
            : String(appendPlainTextOp.value || '').trim();
        if (!trimmed) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Patched text is empty' });

        // Create version row first to obtain stable versionId for storage paths.
        const { data: created, error: createError } = await supabase
          .from('audit_doc_versions')
          .insert({
            saved_rasm_id: input.savedRasmId,
            base_doc_url: input.baseDocUrl,
            base_doc_sha256: baseDocSha256,
            patch_json: JSON.parse(stableJson),
            patch_sha256: patchSha,
            status: 'draft',
            created_by: user.id,
            supersedes_version_id: input.supersedesVersionId ?? null,
          })
          .select('id, created_at')
          .single();

        if (createError || !created) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: createError?.message ?? 'Failed to create audit doc version' });
        }

        const versionId = created.id as string;
        const createdAt = (created as any)?.created_at ? new Date((created as any).created_at).toISOString() : null;

        let previewDocxUrl: string | null = null;
        let previewPdfUrl: string | null = null;
        let previewDocxPath: string | null = null;
        let previewPdfPath: string | null = null;
        let previewDocxBytes: number | null = null;
        let previewPdfBytes: number | null = null;
        let previewDocxSha256: string | null = null;
        let previewPdfSha256: string | null = null;
        let pdfConversionError: string | null = null;

        // Persist a single “latest edited version” pointer on the Saved Rasm.
        // Source-of-truth field: saved_rasms.latest_draft_* (with payload fallback for older DBs).
        const LATEST_POINTER_FIELD = 'saved_rasms.latest_draft_version_id';
        let latestPointerUpdatedAt: string | null = null;
        let latestDraftColumnsWritten = false;
        try {
          const docxBuffer = setPlainTextOp
            ? await generateDocxFromText(trimmed, baseDocBytes.toString('base64'), { mode: 'replace-body' })
            : await appendPlainTextToDocx(baseDocBytes, String(appendPlainTextOp.value || ''));
          const docxSha = sha256Hex(docxBuffer);
          previewDocxBytes = docxBuffer.length;
          previewDocxSha256 = docxSha;

          const uploadedDocx = await uploadBufferToDocumentsBucket({
            path: `audit-drafts/${versionId}.docx`,
            buffer: docxBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          });
          previewDocxUrl = uploadedDocx.url;
          previewDocxPath = uploadedDocx.path;

          // Canonical signing artifact: always generate/upload PDF.
          // Prefer LibreOffice docx->pdf, but fall back to HTML-based PDF (dev-friendly) if LibreOffice isn't available.
          let pdfRes: { pdfBuffer: Buffer } | null = null;
          try {
            const lo = await convertDocxToPdfViaLibreOffice({ docxBuffer });
            // eslint-disable-next-line no-console
            console.log('[SAVE_EDIT] pdf_convert', {
              method: 'libreoffice',
              exitCode: lo.exitCode,
              durationMs: lo.durationMs,
              stdoutBytes: lo.stdout?.length ?? 0,
              stderrBytes: lo.stderr?.length ?? 0,
            });
            pdfRes = { pdfBuffer: lo.pdfBuffer };
          } catch (e: any) {
            const msg = e?.message || String(e);
            pdfConversionError = msg;
            // eslint-disable-next-line no-console
            console.log('[SAVE_EDIT] pdf_convert', { method: 'none', error: msg });

            // IMPORTANT: Do not generate a plain-text “fallback PDF” here.
            // That PDF won't match the DOCX template layout (logo/header/page geometry) and appears as deformation.
            // When LibreOffice isn't available, we keep only the DOCX artifact for preview.
            previewPdfUrl = null;
            previewPdfPath = null;
            previewPdfBytes = null;
            previewPdfSha256 = null;
          }

          if (pdfRes) {
            const pdfSha = sha256Hex(pdfRes.pdfBuffer);
            previewPdfBytes = pdfRes.pdfBuffer.length;
            previewPdfSha256 = pdfSha;
            const uploadedPdf = await uploadBufferToDocumentsBucket({
              path: `audit-drafts/${versionId}.pdf`,
              buffer: pdfRes.pdfBuffer,
              contentType: 'application/pdf',
              upsert: true,
            });
            previewPdfUrl = uploadedPdf.url;
            previewPdfPath = uploadedPdf.path;
          }

          const { error: updateError } = await supabase
            .from('audit_doc_versions')
            .update({
              final_docx_url: previewDocxUrl,
              final_pdf_url: previewPdfUrl,
              final_docx_sha256: previewDocxSha256,
              final_pdf_sha256: previewPdfSha256,
            })
            .eq('id', versionId);
          if (updateError) {
            throw new Error(updateError.message);
          }
        } catch (e: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              `Failed to generate/upload edited artifacts (DOCX/PDF). ` +
              `This prevents saving to Saved Documents. ` +
              `Error: ${e?.message || String(e)}`,
          });
        }

        // Update “latest” pointer on Saved Rasm payload.
        // This is REQUIRED so Saved Documents + Signing Portal resolve the same latest artifact.
        try {
          const { data: existingPayloadRow } = await supabase
            .from('saved_rasms')
            .select('payload')
            .eq('id', input.savedRasmId)
            .maybeSingle();

          const payloadObj =
            existingPayloadRow?.payload && typeof existingPayloadRow.payload === 'object'
              ? (existingPayloadRow.payload as any)
              : {};

          // Single source-of-truth for AuditHub/Saved Documents viewing: prefer PDF when available.
          // DOCX rendering in-browser (docx-preview) is not pixel-perfect and often deforms complex RTL docs.
          // The canonical signing artifact is a PDF, so prefer it for preview to match Judge Portal output.
          const chosenUrlForSavedDocs = previewPdfUrl || previewDocxUrl || null;
          const nowIso = new Date().toISOString();

          const chosenMimeType = previewPdfUrl
            ? 'application/pdf'
            : (previewDocxUrl ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : null);

          if (!chosenUrlForSavedDocs) {
            throw new Error('No preview URL was produced after generation');
          }

          const updatedPayload = {
            ...(payloadObj || {}),
            auditDocVersionId: versionId,
            auditEditedArtifactUrl: chosenUrlForSavedDocs,
            auditEditedUpdatedAt: nowIso,
            latestDocumentVersionId: versionId,
            latestDocumentUrl: chosenUrlForSavedDocs,
            latestDocumentMimeType: chosenMimeType,
            latestDocumentUpdatedAt: nowIso,
          };

          const updateSavedRasm = async (opts: { includeUpdatedAt: boolean; includeLatestDraftCols: boolean }) => {
            const patch: any = {
              payload: updatedPayload,
            };
            if (opts.includeLatestDraftCols) {
              patch.latest_draft_version_id = versionId;
              patch.latest_draft_docx_url = previewDocxUrl;
              patch.latest_draft_sha256 = previewDocxSha256;
              patch.latest_draft_updated_at = nowIso;
            }
            if (opts.includeUpdatedAt) {
              patch.updated_at = nowIso;
            }
            return await supabase.from('saved_rasms').update(patch).eq('id', input.savedRasmId);
          };

          // Try: with updated_at + latest_draft_* columns
          let res = await updateSavedRasm({ includeUpdatedAt: true, includeLatestDraftCols: true });
          if (!res.error) {
            latestDraftColumnsWritten = true;
          } else {
            // Retry: drop updated_at (some DBs don't have it)
            res = await updateSavedRasm({ includeUpdatedAt: false, includeLatestDraftCols: true });
            if (!res.error) {
              latestDraftColumnsWritten = true;
            } else {
              // Retry: drop latest_draft_* columns (older DBs)
              res = await updateSavedRasm({ includeUpdatedAt: false, includeLatestDraftCols: false });
            }
          }

          if (res.error) {
            throw new Error(res.error.message);
          }

          latestPointerUpdatedAt = nowIso;

          // Minimal targeted backend log for this regression.
          // Includes the pointer values that AuditHub/SavedDocs/Signing all must agree on.
          // eslint-disable-next-line no-console
          console.log('[SAVE_EDIT] pointer', {
            rasmId: input.savedRasmId,
            previousVersionId: input.supersedesVersionId ?? null,
            newVersionId: versionId,
            latestDocumentUrl: chosenUrlForSavedDocs,
            latestDocumentMimeType: chosenMimeType,
            wroteLatestDraftColumns: latestDraftColumnsWritten,
            latest_draft_version_id: latestDraftColumnsWritten ? versionId : null,
            latest_draft_docx_url: latestDraftColumnsWritten ? previewDocxUrl : null,
            audit_doc_versions_final_pdf_url: previewPdfUrl,
          });
        } catch (e: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to persist latest edited document pointer on saved rasm: ${e?.message || String(e)}`,
          });
        }

        // Persist the edited artifacts into Saved Documents (deed_attachments) so other modules
        // can see them without relying on virtual attachments.
        try {
          const recordId = String(input.savedRasmId);

          // Keep only the latest edited artifacts in these categories.
          await removeSavedRasmStorageByCategory(recordId, ['audit_draft_pdf', 'audit_draft_docx']);
          await supabase
            .from('deed_attachments')
            .delete()
            .eq('record_type', 'saved_rasm')
            .eq('record_id', recordId)
            .in('category', ['audit_draft_pdf', 'audit_draft_docx']);

          const inserts: any[] = [];

          if (previewPdfUrl && previewPdfPath && previewPdfBytes != null) {
            inserts.push({
              record_id: recordId,
              record_type: 'saved_rasm',
              category: 'audit_draft_pdf',
              file_name: `audit-draft-${versionId}.pdf`,
              file_url: previewPdfUrl,
              storage_path: previewPdfPath,
              mime_type: 'application/pdf',
              file_size: previewPdfBytes,
              metadata: {
                source: 'audit_doc_versions',
                versionId,
                baseDocSha256,
                patchSha256: patchSha,
                pdfSha256: previewPdfSha256,
              },
            });
          }

          if (previewDocxUrl && previewDocxPath && previewDocxBytes != null) {
            inserts.push({
              record_id: recordId,
              record_type: 'saved_rasm',
              category: 'audit_draft_docx',
              file_name: `audit-draft-${versionId}.docx`,
              file_url: previewDocxUrl,
              storage_path: previewDocxPath,
              mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              file_size: previewDocxBytes,
              metadata: {
                source: 'audit_doc_versions',
                versionId,
                baseDocSha256,
                patchSha256: patchSha,
                docxSha256: previewDocxSha256,
                pdfConversionError: previewPdfUrl ? null : pdfConversionError,
              },
            });
          }

          if (inserts.length) {
            const { error: insertError } = await supabase.from('deed_attachments').insert(inserts);
            if (insertError) throw new Error(insertError.message);
          }
        } catch (e: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to persist edited artifacts into Saved Documents: ${e?.message || String(e)}`,
          });
        }

        return {
          versionId,
          status: 'draft',
          createdAt,
          previewPdfUrl,
          previewPdfPath,
          previewPdfBytes,
          previewPdfSha256,
          pdfConversionError,
          previewDocxUrl,
          previewDocxPath,
          previewDocxBytes,
          previewDocxSha256,
          baseDocSha256,
          patchSha256: patchSha,
          latestPointer: {
            field: latestDraftColumnsWritten ? 'latest_draft_version_id' : 'payload.auditDocVersionId',
            versionId,
            url: (previewPdfUrl || previewDocxUrl || null),
            updatedAt: latestPointerUpdatedAt,
          },
        };
      }),

    finalizeForSigning: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          versionId: z.string().uuid(),
        })
      )
      .output(
        z.object({
          versionId: z.string().uuid(),
          status: z.enum(['draft', 'finalized']),
          finalPdfUrl: z.string(),
          finalDocxUrl: z.string().nullable(),
          baseDocSha256: z.string().nullable(),
          patchSha256: z.string().nullable(),
          finalPdfSha256: z.string().nullable(),
          finalDocxSha256: z.string().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);
        return finalizeSigningVersionForUser({
          user: { id: String(user.id), role: String(user.role) },
          versionId: input.versionId,
        });
      }),

    finalizeAudit: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        payload: z.record(z.unknown()).optional(),
        ledgerEntry: z.object({
          family_name: z.string(),
          personal_name: z.string(),
          id_card: z.string().optional(),
          certificate_type: z.string(),
          operation_type: z.string(),
          amount_received: z.number(),
          receipt_number: z.string(),
        })
      }))
      .output(z.object({ success: z.boolean(), ledgerId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const user = await resolveSessionUser(input.sessionToken);

        const now = new Date();
        const entry_time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        const { data: existingRasm, error: existingError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, notary_name, payload')
          .eq('id', input.id)
          .single();

        if (existingError || !existingRasm) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
        }

        const userFullName = String(user.full_name || '').trim();
        const rasmNotaryName = String((existingRasm as any)?.notary_name || '').trim();
        const isOwner = existingRasm.notary_user_id === user.id || 
                       (existingRasm.notary_user_id === null && userFullName !== '' && rasmNotaryName === userFullName) ||
                       (userFullName !== '' && rasmNotaryName === userFullName);

        if (user.role === 'notary' && !isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden' });
        }

        const existingPayload = existingRasm.payload && typeof existingRasm.payload === 'object'
          ? (existingRasm.payload as any)
          : {};

        const incomingPayload = input.payload && typeof input.payload === 'object'
          ? input.payload
          : {};

        const finalPayload = {
          ...existingPayload,
          ...incomingPayload,
        };

        const existingLedgerId = existingPayload?.ledgerId;
        let ledgerId = existingLedgerId;

        if (ledgerId) {
          const { error: ledgerUpdateError } = await supabase
            .from('daily_ledger')
            .update({ ...input.ledgerEntry, entry_time })
            .eq('id', ledgerId);

          if (ledgerUpdateError) {
            ledgerId = undefined;
          }
        }

        if (!ledgerId) {
          const { data: ledgerData, error: ledgerError } = await supabase
            .from('daily_ledger')
            .insert([{
              ...input.ledgerEntry,
              entry_time,
              user_id: user.id,
              notary_id: user.id
            }])
            .select('id')
            .single();

          if (ledgerError) {
            if (ledgerError.code === '23505' && ledgerError.message.includes('unique_receipt_per_notary')) {
              const { data: recovery } = await supabase
                .from('daily_ledger')
                .select('id')
                .eq('receipt_number', input.ledgerEntry.receipt_number)
                .eq('notary_id', user.id)
                .single();

              if (recovery) {
                ledgerId = recovery.id;
              } else {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ledgerError.message });
              }
            } else {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ledgerError.message });
            }
          } else {
            ledgerId = ledgerData.id;
          }
        }

        try {
          await ensureSavedRasmHasJudgeAttachments({
            recordId: input.id,
            notaryUserId: user.id,
            payload: finalPayload,
          });
        } catch (e) {}

        const updatedPayload = {
          ...(finalPayload || {}),
          // Preserve the latest edited-artifact pointers from the database so
          // a stale frontend snapshot cannot roll the document version back.
          auditDocVersionId: (existingPayload as any)?.auditDocVersionId ?? (finalPayload as any)?.auditDocVersionId,
          auditEditedArtifactUrl: (existingPayload as any)?.auditEditedArtifactUrl ?? (finalPayload as any)?.auditEditedArtifactUrl,
          auditEditedUpdatedAt: (existingPayload as any)?.auditEditedUpdatedAt ?? (finalPayload as any)?.auditEditedUpdatedAt,
          latestDocumentVersionId: (existingPayload as any)?.latestDocumentVersionId ?? (finalPayload as any)?.latestDocumentVersionId,
          latestDocumentUrl: (existingPayload as any)?.latestDocumentUrl ?? (finalPayload as any)?.latestDocumentUrl,
          latestDocumentMimeType: (existingPayload as any)?.latestDocumentMimeType ?? (finalPayload as any)?.latestDocumentMimeType,
          latestDocumentUpdatedAt: (existingPayload as any)?.latestDocumentUpdatedAt ?? (finalPayload as any)?.latestDocumentUpdatedAt,
          latestForceSaveRequestId: (existingPayload as any)?.latestForceSaveRequestId ?? (finalPayload as any)?.latestForceSaveRequestId,
          finalized: true,
          ledgerId: ledgerId,
          finalizedAt: now.toISOString(),
          workflowStatus: 'AUDITED',
        };

        const candidateDocumentType = (() => {
          const v =
            (updatedPayload as any)?.certificateType ??
            (updatedPayload as any)?.documentType ??
            (updatedPayload as any)?.meta?.documentType;
          return (typeof v === 'string' && v.trim()) ? v.trim() : null;
        })();

        const candidateFileNumber = (() => {
          const v = (updatedPayload as any)?.meta?.fileNumber ?? (updatedPayload as any)?.fileNumber;
          return (typeof v === 'string' && v.trim()) ? v.trim() : null;
        })();

        const updatePatchBase: Record<string, unknown> = {
          draft: 'FINALIZED',
          payload: updatedPayload,
          updated_at: now.toISOString(),
          ...(candidateDocumentType ? { document_type: candidateDocumentType } : {}),
          ...(candidateFileNumber ? { file_number: candidateFileNumber } : {}),
        };

        const updateWithStatus = async () => await supabase
          .from('saved_rasms')
          .update({
            ...updatePatchBase,
            status: 'AUDITED',
          })
          .eq('id', input.id);

        const updateWithoutStatus = async () => await supabase
          .from('saved_rasms')
          .update(updatePatchBase)
          .eq('id', input.id);

        if (savedRasmsSchemaState.hasStatusColumn === false) {
          const res2 = await updateWithoutStatus();
          if (res2.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res2.error.message });
        } else {
          const res = await updateWithStatus();
          if (res.error) {
            const msg = String(res.error.message || '');
            const missingStatusColumn = msg.includes("Could not find the 'status' column") ||
              (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('status'));
            if (missingStatusColumn) {
              savedRasmsSchemaState.hasStatusColumn = false;
              const res2 = await updateWithoutStatus();
              if (res2.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res2.error.message });
            } else {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res.error.message });
            }
          } else {
            savedRasmsSchemaState.hasStatusColumn = true;
          }
        }

        return { success: true, ledgerId: ledgerId };
      }),

    generateRasmPdf: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        payload: RasmPdfPayloadSchema,
      }))
      .output(z.object({
        pdf: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notary can generate rasms');

        // The payload is Zod-validated by `RasmPdfPayloadSchema`; cast to satisfy
        // the downstream service typing (which expects the same shape).
        const pdfBuffer = await rasmPdfService.generate(input.payload as any);
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `rasm-${input.payload.documentType}-${Date.now()}.pdf`,
        };
      }),

    getAuditTrail: publicProcedure
      .input(z.object({ documentId: z.string() }))
      .output(z.array(z.object({
        timestamp: z.string(),
        notary: z.string(),
        action: z.string(),
        field: z.string(),
        oldValue: z.string().optional(),
        newValue: z.string(),
      })))
      .query(async ({ input }) => {
        return [
          {
            timestamp: new Date().toISOString(),
            notary: 'عدول متلقي',
            action: 'إنشاء',
            field: 'documentType',
            oldValue: undefined,
            newValue: 'بيع_وشراء',
          },
        ];
      }),

};
