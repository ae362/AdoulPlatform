import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, resolveSessionUser } from '../../../trpc';
import { supabase } from '../../../../services/supabase';

async function requireNotary(sessionToken: string, message = 'Only notaries can perform this operation') {
  const user = await resolveSessionUser(sessionToken);
  if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message });
  return user;
}
import { uploadBufferToDocumentsBucket, uploadDocument, fileUploadSchema } from '../../../../utils/storage';
import { patchSha256, sha256Hex } from '../../../../utils/auditDocPatch';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';
import fontkit from '@pdf-lib/fontkit';
import {
  drawRightAlignedTextLayer,
  drawRightAlignedText,
  renderFooterStripPng,
  removeAttachmentStorageByCategory,
  loadAmiriFontBytesBestEffort,
  sanitizePersistedPayload,
} from '../../helpers';
import {
  deriveSignedDeedWorkflowStatus,
  extractInclusionFromPayload,
  hasMeaningfulInclusionFields,
  extractPartiesFromPayload,
  extractTaxReferenceCandidates,
  extractPayloadDeedRelations,
  extractTitleDocumentCandidates,
  extractSecureArchiveSearchDetails,
} from '../../extractors';
import {
  SignedDeedCategorySchema,
  SignedDeedCategory,
  SignedDeedWorkflowStatusSchema,
  SignedDeedWorkflowStatus,
  JudgeSubmissionWorkflowStatus,
} from '../../types';


export const signedDeedsProcedures = {
    finalSaveAfterSignature: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(), // saved_rasm_id
        category: SignedDeedCategorySchema,
        finalSha256: z.string().optional(),
        signedPdfBase64: z.string().optional(),
        device: z.record(z.unknown()).optional(),
      }))
      .output(z.object({
        signedDeedId: z.string(),
        inclusionId: z.string().nullable(),
        category: SignedDeedCategorySchema,
        createdAt: z.string(),
        signedPdfUrl: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can final-save signed deeds');

        // Fetch the rasm; include inclusion_id if present (migration adds it).
        const { data: rasmRow, error: rasmError } = await supabase
          .from('saved_rasms')
          .select('id, notary_user_id, notary_name, payload, inclusion_id, latest_draft_sha256')
          .eq('id', input.id)
          .single();

        if (rasmError || !rasmRow) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rasm not found' });
        }

        const userFullName = String(user.full_name || '').trim();
        const rasmNotaryName = String((rasmRow as any)?.notary_name || '').trim();
        const isOwner = rasmRow.notary_user_id === user.id || 
                       (rasmRow.notary_user_id === null && userFullName !== '' && rasmNotaryName === userFullName) ||
                       (userFullName !== '' && rasmNotaryName === userFullName);

        if (!isOwner) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this rasm' });
        }

        const payloadObj = (rasmRow.payload as any) ?? {};
        const inclusionFromPayload = extractInclusionFromPayload(payloadObj);
        const parties = extractPartiesFromPayload(payloadObj);

        // Resolve / create inclusion_registry row.
        let inclusionId: string | null = (rasmRow as any).inclusion_id ? String((rasmRow as any).inclusion_id) : null;
        if (!inclusionId && inclusionFromPayload.inclusionId) {
          inclusionId = inclusionFromPayload.inclusionId;
        }

        let inclusionRow: any | null = null;
        if (inclusionId) {
          const inclRes = await supabase
            .from('inclusion_registry')
            .select('*')
            .eq('id', inclusionId)
            .maybeSingle();
          if (!inclRes.error) inclusionRow = inclRes.data ?? null;
        }

        if (!inclusionRow) {
          const insertIncl = await supabase
            .from('inclusion_registry')
            .insert({
              register_number: inclusionFromPayload.registerNumber ?? null,
              certificate_number: inclusionFromPayload.certificateNumber ?? null,
              registry_page: inclusionFromPayload.registryPage ?? null,
              inclusion_date: inclusionFromPayload.inclusionDate ?? null,
              inclusion_hijri: inclusionFromPayload.inclusionHijri ?? null,
              court: inclusionFromPayload.court ?? null,
              operation_id: inclusionFromPayload.operationId ?? null,
              inclusion_hash: inclusionFromPayload.inclusionHash ?? null,
              notary1_name: inclusionFromPayload.notary1Name ?? user.full_name ?? null,
              notary2_name: inclusionFromPayload.notary2Name ?? null,
            })
            .select('id, register_number, certificate_number, registry_page, inclusion_date, notary1_name, notary2_name, court')
            .single();

          if (insertIncl.error || !insertIncl.data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: insertIncl.error?.message ?? 'Failed to create inclusion registry row',
            });
          }
          inclusionRow = insertIncl.data;
          inclusionId = String(insertIncl.data.id);

          // Backfill the FK on saved_rasms for future joins.
          try {
            await supabase.from('saved_rasms').update({ inclusion_id: inclusionId }).eq('id', input.id);
          } catch {
            // best-effort
          }
        }

        const finalHash = input.finalSha256 || (rasmRow as any).latest_draft_sha256 || null;

        // 1) Insert into SignedDeeds (basket) (idempotent per saved_rasm_id)
        const signedRes = await supabase
          .from('signed_deeds')
          .upsert({
            saved_rasm_id: input.id,
            inclusion_id: inclusionId,
            category: input.category,
            final_hash: finalHash,
            signature_timestamp: new Date().toISOString(),
            created_by: user.id,
          }, { onConflict: 'saved_rasm_id' })
          .select('id, created_at')
          .single();

        if (signedRes.error || !signedRes.data) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: signedRes.error?.message ?? 'Failed to create SignedDeeds row' });
        }

        const signedDeedId = String(signedRes.data.id);

        // Ensure archive container row exists (insert-only; immutable)
        try {
          await supabase
            .from('final_secure_archives')
            .upsert(
              {
                signed_deed_id: signedDeedId,
                archived_at: new Date().toISOString(),
                archived_by: user.id,
                immutable: true,
                current_stage: 'pre_judge',
              },
              { onConflict: 'signed_deed_id', ignoreDuplicates: true } as any
            );
        } catch {
          // best-effort
        }

        // 2) Import inclusion data automatically (SealMetadata seeds from InclusionRegistry)
        const sealMetadataInsert = supabase
          .from('seal_metadata')
          .insert({
            signed_deed_id: signedDeedId,
            register_number: inclusionRow?.register_number ?? null,
            certificate_number: inclusionRow?.certificate_number ?? null,
            page_number: inclusionRow?.registry_page ?? null,
            inclusion_date: inclusionRow?.inclusion_date ?? null,
            notary1_name: inclusionRow?.notary1_name ?? null,
            notary2_name: inclusionRow?.notary2_name ?? null,
            court: inclusionRow?.court ?? null,
          });

        // 3) Security log
        const securityInsert = supabase
          .from('signed_deed_security_logs')
          .insert({
            signed_deed_id: signedDeedId,
            operation: 'Final Save After Signature',
            category: input.category,
            final_sha256: finalHash,
            user_id: user.id,
            device: input.device ?? null,
            timestamp: new Date().toISOString(),
          });

        const [sealRes, secRes] = await Promise.all([sealMetadataInsert, securityInsert]);
        if (sealRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: sealRes.error.message });
        }
        if (secRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: secRes.error.message });
        }

        // Persist a signed + QR stamped PDF artifact for the Signed Deed viewer.
        // The client provides a PDF that already contains the embedded signature images.
        let signedPdfUrl: string | null = null;
        let signedPdfStoragePath: string | null = null;
        let signedPdfSha256: string | null = null;
        if (input.signedPdfBase64) {
          try {
            const originalPdfBuffer = Buffer.from(input.signedPdfBase64, 'base64');

            // Stamp a QR code on the first page (minimal required for viewer).
            const qrPayload = `SIGNED_DEED:${signedDeedId}`;
            const qrPng = await QRCode.toBuffer(qrPayload, {
              type: 'png',
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 220,
            } as any);

            const pdfDoc = await PDFDocument.load(originalPdfBuffer);
            const pages = pdfDoc.getPages();
            if (!pages.length) {
              throw new Error('Signed PDF has no pages');
            }
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            const qrImage = await pdfDoc.embedPng(qrPng);

            // Bottom-left corner with a small margin; keep within page.
            const qrSize = Math.min(110, Math.max(80, Math.floor(Math.min(width, height) * 0.12)));
            const margin = 30;
            firstPage.drawImage(qrImage, {
              x: margin,
              y: margin,
              width: qrSize,
              height: qrSize,
            });

            const stamped = await pdfDoc.save();
            const stampedBuffer = Buffer.from(stamped);
            const stampedSha = sha256Hex(stampedBuffer);

            const uploaded = await uploadBufferToDocumentsBucket({
              path: `signed-deeds/${signedDeedId}/${stampedSha}.pdf`,
              buffer: stampedBuffer,
              contentType: 'application/pdf',
              upsert: true,
            });

            signedPdfUrl = uploaded.url;
            signedPdfStoragePath = uploaded.path;
            signedPdfSha256 = stampedSha;

            // Replace previous signed_pdf attachment (idempotent for signed_deed).
            await removeAttachmentStorageByCategory('signed_deed', signedDeedId, ['signed_pdf']);
            await supabase
              .from('deed_attachments')
              .delete()
              .eq('record_type', 'signed_deed')
              .eq('record_id', signedDeedId)
              .eq('category', 'signed_pdf');

            await supabase
              .from('deed_attachments')
              .insert({
                record_id: signedDeedId,
                record_type: 'signed_deed',
                category: 'signed_pdf',
                file_name: `signed-${signedDeedId}.pdf`,
                file_url: uploaded.url,
                storage_path: uploaded.path,
                mime_type: 'application/pdf',
                file_size: stampedBuffer.length,
                metadata: {
                  sha256: stampedSha,
                  qr: { payload: qrPayload },
                  source: 'finalSaveAfterSignature',
                },
              });
          } catch (e: any) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to persist signed PDF: ${e?.message || String(e)}`,
            });
          }
        }

        // Secure archival operations (pre-judge) after seal + QR stage.
        // Runs even if there is no PDF artifact, but the archive/version + index are only created when we have a signed PDF stored.
        try {
          const nowIso = new Date().toISOString();

          // Settings (verification link expiry)
          let verificationExpiryDays = 30;
          try {
            const settingsRes = await supabase
              .from('archive_settings')
              .select('verification_link_expiry_days')
              .eq('id', 1)
              .maybeSingle();
            const v = Number((settingsRes.data as any)?.verification_link_expiry_days);
            if (Number.isFinite(v) && v > 0 && v <= 3650) verificationExpiryDays = v;
          } catch {
            // ignore
          }

          const ops: Array<Promise<any>> = [];

          if (signedPdfUrl && signedPdfStoragePath && signedPdfSha256) {
            // 1) FinalSecureArchive: immutable pre-judge version
            ops.push(
              (async () =>
                await supabase
                  .from('final_secure_archive_versions')
                  .upsert(
                    {
                      signed_deed_id: signedDeedId,
                      version_type: 'pre_judge',
                      storage_path: signedPdfStoragePath,
                      file_url: signedPdfUrl,
                      sha256: signedPdfSha256,
                      seal_hash: null,
                      sealed_at: nowIso,
                      immutable: true,
                      created_by: user.id,
                    },
                    { onConflict: 'signed_deed_id,version_type', ignoreDuplicates: true } as any
                  )
              )()
            );

            // 2) Log
            ops.push(
              (async () =>
                await supabase.from('archive_operation_logs').insert({
                  signed_deed_id: signedDeedId,
                  action_type: 'FINAL_SECURE_ARCHIVE_PRE_JUDGE',
                  timestamp: nowIso,
                  user_id: user.id,
                  device: input.device ?? null,
                  ip: null,
                  previous_hash: null,
                  new_hash: signedPdfSha256,
                  metadata: {
                    source: 'finalSaveAfterSignature',
                    artifact: 'signed_pdf',
                  },
                })
              )()
            );

            // 3) Search index (simple)
            const searchText = [
              signedDeedId,
              input.category,
              inclusionRow?.register_number ?? null,
              inclusionRow?.certificate_number ?? null,
              inclusionRow?.registry_page ?? null,
              inclusionRow?.court ?? null,
              inclusionRow?.notary1_name ?? null,
              inclusionRow?.notary2_name ?? null,
              (payloadObj as any)?.fileNumber ?? null,
              (payloadObj as any)?.documentType ?? null,
              ...parties.flatMap((x) => [x.fullName, x.idNumber]),
            ]
              .filter(Boolean)
              .map((v: any) => String(v))
              .join(' ');

            ops.push(
              (async () =>
                await supabase
                  .from('deed_search_index')
                  .upsert(
                    {
                      signed_deed_id: signedDeedId,
                      category: input.category,
                      search_text: searchText,
                      structured: {
                        signedDeedId,
                        category: input.category,
                        inclusion: {
                          registerNumber: inclusionRow?.register_number ?? null,
                          certificateNumber: inclusionRow?.certificate_number ?? null,
                          pageNumber: inclusionRow?.registry_page ?? null,
                          court: inclusionRow?.court ?? null,
                        },
                        parties: parties.map((x) => ({ role: x.role, fullName: x.fullName, idNumber: x.idNumber })),
                      },
                      updated_at: nowIso,
                    },
                    { onConflict: 'signed_deed_id' } as any
                  )
              )()
            );

            // Parties table (lost-deed search)
            ops.push(
              (async () => {
                try {
                  await supabase.from('deed_parties').delete().eq('signed_deed_id', signedDeedId);
                } catch {
                  // ignore
                }
                if (!parties.length) return;
                const rowsToInsert = parties.map((x) => ({
                  signed_deed_id: signedDeedId,
                  role: x.role,
                  full_name: x.fullName,
                  id_number: x.idNumber,
                  phone: x.phone,
                }));
                await supabase.from('deed_parties').insert(rowsToInsert);
              })()
            );

            // 4) Verification link token (UUID + expiry)
            const expiresAt = new Date(Date.now() + verificationExpiryDays * 24 * 60 * 60 * 1000).toISOString();
            ops.push(
              (async () =>
                await supabase.from('verification_links').insert({
                  signed_deed_id: signedDeedId,
                  expires_at: expiresAt,
                  created_by: user.id,
                })
              )()
            );
          }

          if (ops.length) {
            const results = await Promise.all(ops);
            const firstErr = results.find((r: any) => r?.error)?.error;
            if (firstErr) {
              throw new Error(firstErr.message || 'Archive operation failed');
            }
          }
        } catch (e: any) {
          // Do not block the main save; log-only in later iteration.
        }

        return {
          signedDeedId,
          inclusionId,
          category: input.category,
          createdAt: String(signedRes.data.created_at),
          signedPdfUrl,
        };
      }),

    sealSignedDeedForCorrespondence: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          signedDeedId: z.string().uuid(),
          device: z.record(z.unknown()).optional(),
        })
      )
      .output(z.object({ sealHash: z.string(), sealTimestamp: z.string(), readyForJudge: z.boolean() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can seal deeds');

        // Some deployments store phone in notary_profiles (and some have users.phone). Gather both best-effort.
        let userPhone: string | null = null;
        try {
          const up = await supabase.from('users').select('phone').eq('id', user.id).maybeSingle();
          if (!up.error && up.data) userPhone = (up.data as any)?.phone ?? null;
        } catch {
          userPhone = null;
        }

        let notaryProfilePhone: string | null = null;
        try {
          const prof = await supabase.from('notary_profiles').select('phone').eq('user_id', user.id).maybeSingle();
          if (!prof.error && prof.data) notaryProfilePhone = (prof.data as any)?.phone ?? null;
        } catch {
          notaryProfilePhone = null;
        }

        const deedRes = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'inclusion_id',
              'category',
              'final_hash',
              'seal_hash',
              'seal_timestamp',
              'ready_for_judge',
              'saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)',
              'inclusion_registry!signed_deeds_inclusion_fk(register_number, certificate_number, registry_page, inclusion_date, court, operation_id, inclusion_hash)',
              'seal_metadata(notary1_name, notary2_name, court, phone, email)',
            ].join(',')
          )
          .eq('id', input.signedDeedId)
          .single();
        if (deedRes.error || !deedRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });

        const deedRow: any = deedRes.data;
        const saved = Array.isArray(deedRow?.saved_rasms) ? deedRow.saved_rasms[0] : deedRow?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        // Idempotent: return existing seal when present.
        if (deedRow.seal_hash && deedRow.seal_timestamp) {
          return {
            sealHash: String(deedRow.seal_hash),
            sealTimestamp: String(deedRow.seal_timestamp),
            readyForJudge: !!deedRow.ready_for_judge,
          };
        }

        const nowIso = new Date().toISOString();
        const incl = Array.isArray(deedRow?.inclusion_registry) ? deedRow.inclusion_registry[0] : deedRow?.inclusion_registry;
        const sealMeta = Array.isArray(deedRow?.seal_metadata) ? deedRow.seal_metadata[0] : deedRow?.seal_metadata;

        const sealPayload = {
          signedDeedId: String(deedRow.id),
          savedRasmId: String(deedRow.saved_rasm_id),
          inclusionId: deedRow.inclusion_id ? String(deedRow.inclusion_id) : null,
          category: String(deedRow.category),
          finalHash: deedRow.final_hash ? String(deedRow.final_hash) : null,
          inclusion: {
            registerNumber: incl?.register_number ?? null,
            certificateNumber: incl?.certificate_number ?? null,
            pageNumber: incl?.registry_page ?? null,
            inclusionDate: incl?.inclusion_date ? String(incl.inclusion_date) : null,
            court: incl?.court ?? null,
            operationId: incl?.operation_id ?? null,
            inclusionHash: incl?.inclusion_hash ?? null,
          },
          notaries: {
            notary1Name: sealMeta?.notary1_name ?? (user.full_name ?? null),
            notary2Name: sealMeta?.notary2_name ?? null,
            court: sealMeta?.court ?? incl?.court ?? null,
            phone: (userPhone ?? notaryProfilePhone) ?? sealMeta?.phone ?? null,
            email: user.email ?? sealMeta?.email ?? null,
          },
          timestamp: nowIso,
          userId: String(user.id),
        };

        const sealHash = sha256Hex(Buffer.from(JSON.stringify(sealPayload)));

        const updateRes = await supabase
          .from('signed_deeds')
          .update({ seal_hash: sealHash, seal_timestamp: nowIso, ready_for_judge: true })
          .eq('id', input.signedDeedId)
          .is('seal_hash', null)
          .select('seal_hash, seal_timestamp, ready_for_judge, category, final_hash')
          .maybeSingle();

        const effectiveSealHash = updateRes.data?.seal_hash ?? sealHash;
        const effectiveSealTs = updateRes.data?.seal_timestamp ?? nowIso;
        const effectiveReady = typeof updateRes.data?.ready_for_judge === 'boolean' ? updateRes.data.ready_for_judge : true;

        // Best-effort: persist notary contact fields.
        try {
          await supabase
            .from('seal_metadata')
            .update({
              phone: (userPhone ?? notaryProfilePhone) ?? null,
              email: user.email ?? null,
              court: sealMeta?.court ?? incl?.court ?? null,
              notary1_name: sealMeta?.notary1_name ?? (user.full_name ?? null),
            })
            .eq('signed_deed_id', input.signedDeedId);
        } catch {
          // ignore
        }

        // Security log
        try {
          await supabase.from('signed_deed_security_logs').insert({
            signed_deed_id: input.signedDeedId,
            operation: 'Seal For Correspondence',
            category: (updateRes.data as any)?.category ?? deedRow.category,
            final_sha256: (updateRes.data as any)?.final_hash ?? deedRow.final_hash ?? null,
            user_id: user.id,
            device: input.device ?? null,
            timestamp: nowIso,
          });
        } catch {
          // ignore
        }

        return { sealHash: String(effectiveSealHash), sealTimestamp: String(effectiveSealTs), readyForJudge: !!effectiveReady };
      }),

    sendSignedDeedToJudge: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid(), device: z.record(z.unknown()).optional() }))
      .output(z.object({ sent: z.boolean(), timestamp: z.string(), submissionId: z.string().nullable() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can send deeds');

        const deedRes = await supabase
          .from('signed_deeds')
          .select('id, seal_hash, saved_rasms!signed_deeds_saved_rasm_fk(id, notary_user_id, file_number, document_type, payload)')
          .eq('id', input.signedDeedId)
          .single();
        if (deedRes.error || !deedRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((deedRes.data as any)?.saved_rasms) ? (deedRes.data as any).saved_rasms[0] : (deedRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        if (!(deedRes.data as any).seal_hash) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Deed must be sealed before sending' });
        }

        const nowIso = new Date().toISOString();
        const savedPayload = saved?.payload && typeof saved.payload === 'object' ? saved.payload : {};
        const existingSubmissionRes = await supabase
          .from('judge_submissions')
          .select('id, status, payload, judge_user_id')
          .contains('payload', { signedDeedId: input.signedDeedId } as any)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSubmissionRes.error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: existingSubmissionRes.error.message || 'تعذر التحقق من إحالات الرسم السابقة',
          });
        }

        let judgeSubmissionId: string | null = existingSubmissionRes.data?.id ? String(existingSubmissionRes.data.id) : null;

        let signedPdfAttachmentForJudge: Record<string, unknown> | null = null;
        try {
          const signedPdfRes = await supabase
            .from('deed_attachments')
            .select('file_name, file_url, mime_type, file_size')
            .eq('record_type', 'signed_deed')
            .eq('record_id', input.signedDeedId)
            .eq('category', 'signed_pdf')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!signedPdfRes.error && signedPdfRes.data?.file_url) {
            signedPdfAttachmentForJudge = {
              name: String((signedPdfRes.data as any).file_name || `signed-${input.signedDeedId}.pdf`),
              fileName: String((signedPdfRes.data as any).file_name || `signed-${input.signedDeedId}.pdf`),
              size: Number((signedPdfRes.data as any).file_size || 0) || 0,
              type: String((signedPdfRes.data as any).mime_type || 'application/pdf'),
              mimeType: String((signedPdfRes.data as any).mime_type || 'application/pdf'),
              category: 'judge_attachment',
              field: 'judgeAttachmentPdf',
              url: String((signedPdfRes.data as any).file_url),
              fileUrl: String((signedPdfRes.data as any).file_url),
            };
          }
        } catch {
          signedPdfAttachmentForJudge = null;
        }

        if (!signedPdfAttachmentForJudge) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'لا توجد نسخة PDF موقعة صالحة لإرسالها إلى رواق الخطاب القضائي',
          });
        }

        const originalJudgeSubmissionId =
          String(
            (savedPayload as any)?.step7JudgeSubmissionId ||
            (savedPayload as any)?.judgeSubmissionId ||
            (existingSubmissionRes.data as any)?.id ||
            ''
          ).trim() || null;

        let originalApprovedJudgeUserId =
          String(
            (savedPayload as any)?.originalApprovedJudgeUserId ||
            (savedPayload as any)?.originJudgeUserId ||
            ((existingSubmissionRes.data as any)?.payload || {})?.originalApprovedJudgeUserId ||
            (existingSubmissionRes.data as any)?.judge_user_id ||
            ''
          ).trim() || null;

        if (!originalApprovedJudgeUserId && originalJudgeSubmissionId) {
          try {
            const originalJudgeSubmissionRes = await supabase
              .from('judge_submissions')
              .select('judge_user_id')
              .eq('id', originalJudgeSubmissionId)
              .maybeSingle();
            if (!originalJudgeSubmissionRes.error && originalJudgeSubmissionRes.data?.judge_user_id) {
              originalApprovedJudgeUserId = String(originalJudgeSubmissionRes.data.judge_user_id).trim() || null;
            }
          } catch {
            // best effort
          }
        }

        let savedRasmSideAttachments: any[] = [];
        try {
          const savedAttachmentRes = await supabase
            .from('deed_attachments')
            .select('category, file_name, file_url, mime_type, file_size, metadata')
            .eq('record_type', 'saved_rasm')
            .eq('record_id', String(saved?.id || ''))
            .order('created_at', { ascending: false });

          if (!savedAttachmentRes.error && Array.isArray(savedAttachmentRes.data)) {
            savedRasmSideAttachments = savedAttachmentRes.data
              .filter((att: any) => {
                const category = String(att?.category || '').toLowerCase();
                const url = String(att?.file_url || '').trim();
                if (!url) return false;
                if (
                  category === 'judge_attachment' ||
                  category === 'judge_attachment_docx' ||
                  category === 'document' ||
                  category === 'primary_attachment' ||
                  category === 'audit_final_pdf' ||
                  category === 'audit_draft_pdf' ||
                  category === 'audit_final_docx' ||
                  category === 'audit_draft_docx'
                ) {
                  return false;
                }
                return true;
              })
              .map((att: any) => ({
                name: String(att?.file_name || 'مرفق'),
                fileName: String(att?.file_name || 'مرفق'),
                size: Number(att?.file_size || 0) || 0,
                type: String(att?.mime_type || 'application/octet-stream'),
                mimeType: String(att?.mime_type || 'application/octet-stream'),
                category: String(att?.category || 'attachments'),
                field: String((att?.metadata as any)?.field || '').trim() || undefined,
                url: String(att?.file_url || ''),
                fileUrl: String(att?.file_url || ''),
                source: 'saved_rasm_attachment',
              }));
          }
        } catch {
          savedRasmSideAttachments = [];
        }

        const mergedSideAttachments = [
          ...(((savedPayload as any)?.attachments || []) as any[]),
          ...savedRasmSideAttachments,
        ].filter((att: any) => {
          const category = String(att?.category || '').toLowerCase();
          const field = String(att?.field || '').toLowerCase();
          const url = String(att?.url || att?.fileUrl || att?.file_url || '').trim();
          if (!url) return false;
          if (category === 'judge_attachment' || field.includes('judgeattachmentpdf')) return false;
          return true;
        }).filter((att: any, index: number, list: any[]) => {
          const url = String(att?.url || att?.fileUrl || att?.file_url || '').trim();
          const category = String(att?.category || '').toLowerCase();
          return list.findIndex((item: any) => {
            const itemUrl = String(item?.url || item?.fileUrl || item?.file_url || '').trim();
            const itemCategory = String(item?.category || '').toLowerCase();
            return itemUrl === url && itemCategory === category;
          }) === index;
        });

        const mergedSubmissionPayload = sanitizePersistedPayload({
          ...(savedPayload as Record<string, unknown>),
          signedDeedId: input.signedDeedId,
          savedRasmId: saved?.id ? String(saved.id) : null,
          source: 'signed_rasms_send_to_judge',
          sentToJudgeAt: nowIso,
          originalJudgeSubmissionId,
          originalApprovedJudgeUserId,
          previewUrl: (signedPdfAttachmentForJudge as any)?.fileUrl || (savedPayload as any)?.previewUrl || null,
          finalPdfUrl: (signedPdfAttachmentForJudge as any)?.fileUrl || (savedPayload as any)?.finalPdfUrl || null,
          latestSigningPdfUrl: (signedPdfAttachmentForJudge as any)?.fileUrl || (savedPayload as any)?.latestSigningPdfUrl || null,
          signedPdfUrl: (signedPdfAttachmentForJudge as any)?.fileUrl || null,
          signed_pdf_url: (signedPdfAttachmentForJudge as any)?.fileUrl || null,
          attachment: signedPdfAttachmentForJudge || (savedPayload as any)?.attachment || null,
          attachments: [
            ...(signedPdfAttachmentForJudge ? [signedPdfAttachmentForJudge] : []),
            ...mergedSideAttachments,
          ],
        } as any);

        if (!judgeSubmissionId) {
          const fallbackNotaryName =
            String(
              (user as any)?.full_name ||
              (savedPayload as any)?.notaryName ||
              (savedPayload as any)?.notary1Name ||
              (savedPayload as any)?.auditHubInclusion?.notary1Name ||
              (savedPayload as any)?.meta?.notaryName ||
              ''
            ).trim() || `العدل محرر الرسم ${saved?.file_number || ''}`.trim();

          const summary =
            String(
              (savedPayload as any)?.summary ||
              (savedPayload as any)?.documentSummary ||
              (savedPayload as any)?.notes ||
              ''
            ).trim() || `إحالة الرسم ${saved?.file_number || input.signedDeedId} إلى قاضي التوثيق للخطاب`;

          const createSubmissionRes = await supabase
            .from('judge_submissions')
            .insert({
              notary_user_id: user.id,
              notary_name: fallbackNotaryName,
              file_number: saved?.file_number ?? null,
              document_type: saved?.document_type ?? null,
              summary,
              payload: mergedSubmissionPayload,
              status: 'pending',
              judge_user_id: originalApprovedJudgeUserId,
            })
            .select('id')
            .single();

          if (createSubmissionRes.error || !createSubmissionRes.data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: createSubmissionRes.error?.message ?? 'تعذر إرسال الرسم إلى رواق الخطاب القضائي',
            });
          }

          judgeSubmissionId = String(createSubmissionRes.data.id);
        } else {
          const summary =
            String(
              (savedPayload as any)?.summary ||
              (savedPayload as any)?.documentSummary ||
              (savedPayload as any)?.notes ||
              ''
            ).trim() || `إحالة الرسم ${saved?.file_number || input.signedDeedId} إلى قاضي التوثيق للخطاب`;

          const updateSubmissionRes = await supabase
            .from('judge_submissions')
            .update({
              notary_name:
                String(
                  (user as any)?.full_name ||
                    (savedPayload as any)?.notaryName ||
                    (savedPayload as any)?.notary1Name ||
                    (savedPayload as any)?.auditHubInclusion?.notary1Name ||
                    (savedPayload as any)?.meta?.notaryName ||
                    ''
                ).trim() || `العدل محرر الرسم ${saved?.file_number || ''}`.trim(),
              file_number: saved?.file_number ?? null,
              document_type: saved?.document_type ?? null,
              summary,
              payload: mergedSubmissionPayload,
              status: 'pending',
              decision: null,
              judge_notes: null,
              decided_at: null,
              judge_user_id:
                originalApprovedJudgeUserId ||
                ((existingSubmissionRes.data as any)?.judge_user_id
                  ? String((existingSubmissionRes.data as any).judge_user_id)
                  : null),
            })
            .eq('id', judgeSubmissionId)
            .select('id')
            .single();

          if (updateSubmissionRes.error || !updateSubmissionRes.data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: updateSubmissionRes.error?.message ?? 'تعذر تحديث إحالة الرسم إلى رواق الخطاب القضائي',
            });
          }
        }

        const verifySubmissionRes = await supabase
          .from('judge_submissions')
          .select('id, status, file_number, document_type')
          .eq('id', judgeSubmissionId)
          .single();

        if (verifySubmissionRes.error || !verifySubmissionRes.data) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: verifySubmissionRes.error?.message ?? 'تعذر التحقق من وصول الرسم إلى رواق الخطاب القضائي',
          });
        }

        if (String((verifySubmissionRes.data as any).status || '') !== 'pending') {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'تم إنشاء الإحالة لكن حالتها ليست pending كما هو متوقع في رواق الخطاب القضائي',
          });
        }

        // Persist operation (used later for audit; judge platform integration is out-of-scope here).
        try {
          await supabase
            .from('final_secure_archives')
            .update({ current_stage: 'pending_judge_endorsement' })
            .eq('signed_deed_id', input.signedDeedId);
        } catch {
          // ignore
        }

        try {
          await supabase.from('archive_operation_logs').insert({
            signed_deed_id: input.signedDeedId,
            action_type: 'SEND_TO_JUDGE',
            timestamp: nowIso,
            user_id: user.id,
            device: input.device ?? null,
            ip: null,
            previous_hash: null,
            new_hash: null,
            metadata: { channel: 'judge_platform', judgeSubmissionId },
          });
        } catch {
          // ignore
        }

        try {
          await supabase.from('signed_deed_security_logs').insert({
            signed_deed_id: input.signedDeedId,
            operation: 'Send To Judge',
            category: null,
            final_sha256: null,
            user_id: user.id,
            device: input.device ?? null,
            timestamp: nowIso,
          });
        } catch {
          // ignore
        }

        try {
          await supabase.from('judicial_notifications').insert({
            request_number: `JSG-${String(saved?.file_number || input.signedDeedId).replace(/[^\w/-]+/g, '').slice(0, 48)}`,
            notary_name:
              String(
                (user as any)?.full_name ||
                  (savedPayload as any)?.notaryName ||
                  (savedPayload as any)?.notary1Name ||
                  (savedPayload as any)?.auditHubInclusion?.notary1Name ||
                  ''
              ).trim() || `العدل محرر الرسم ${saved?.file_number || ''}`.trim(),
            notary_professional_number: String((savedPayload as any)?.professionalNumber || '').trim() || null,
            notary_office_number: String((savedPayload as any)?.officeNumber || '').trim() || null,
            jurisdiction:
              String(
                (savedPayload as any)?.jurisdiction ||
                  (savedPayload as any)?.auditHubInclusion?.authority ||
                  (savedPayload as any)?.court ||
                  ''
              ).trim() || null,
            target_court:
              String(
                (savedPayload as any)?.targetCourt ||
                  (savedPayload as any)?.auditHubInclusion?.authority ||
                  (savedPayload as any)?.court ||
                  ''
              ).trim() || null,
            certificate_type: String(saved?.document_type || '').trim() || 'رسم عدلي محال للخطاب القضائي',
            involved_names: String((savedPayload as any)?.partySummary || (savedPayload as any)?.involvedNames || '').trim() || null,
            recipient_type: 'judge',
            reason_for_movement: `إحالة الرسم ${saved?.file_number || input.signedDeedId} إلى قاضي التوثيق للخطاب`,
            status: 'قيد_المعالجة',
            notary_id: user.id,
            notes: [
              '🔔 تم إنشاء هذا الإشعار تلقائياً بعد إحالة رسم موقع إلى قاضي التوثيق.',
              `رقم الإحالة: ${judgeSubmissionId}`,
              `رقم الرسم: ${saved?.file_number || '---'}`,
              `نوع الرسم: ${saved?.document_type || '---'}`,
              '',
              '--- DATA JSON START ---',
              JSON.stringify({
                source: 'signed_rasms_send_to_judge',
                judgeSubmissionId,
                signedDeedId: input.signedDeedId,
                savedRasmId: saved?.id ? String(saved.id) : null,
              }),
              '--- DATA JSON END ---',
            ].join('\n'),
            attachments: JSON.stringify(
              mergedSubmissionPayload && typeof mergedSubmissionPayload === 'object'
                ? ((mergedSubmissionPayload as any).attachments || [])
                : []
            ),
          });
        } catch {
          // best-effort: the actual judge submission already exists
        }

        return { sent: true, timestamp: nowIso, submissionId: judgeSubmissionId };
      }),

    archiveSignedDeedPostJudge: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid(), device: z.record(z.unknown()).optional() }))
      .output(z.object({ archived: z.boolean(), postJudgeSha256: z.string().nullable(), sealedAt: z.string().nullable() }))
      .mutation(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can archive deeds');

        const deedRes = await supabase
          .from('signed_deeds')
          .select('id, seal_hash, saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)')
          .eq('id', input.signedDeedId)
          .single();
        if (deedRes.error || !deedRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((deedRes.data as any)?.saved_rasms) ? (deedRes.data as any).saved_rasms[0] : (deedRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        const sealHash = (deedRes.data as any).seal_hash ? String((deedRes.data as any).seal_hash) : null;
        if (!sealHash) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Deed must be sealed before archiving post-judge' });

        const preRes = await supabase
          .from('final_secure_archive_versions')
          .select('storage_path, file_url, sha256')
          .eq('signed_deed_id', input.signedDeedId)
          .eq('version_type', 'pre_judge')
          .maybeSingle();
        if (preRes.error || !preRes.data) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Pre-judge archive version not found' });

        const nowIso = new Date().toISOString();

        // Immutable insert-only. Uses ignoreDuplicates to avoid attempting an UPDATE.
        try {
          await supabase
            .from('final_secure_archive_versions')
            .upsert(
              {
                signed_deed_id: input.signedDeedId,
                version_type: 'post_judge',
                storage_path: String((preRes.data as any).storage_path),
                file_url: String((preRes.data as any).file_url),
                sha256: String((preRes.data as any).sha256),
                seal_hash: sealHash,
                sealed_at: nowIso,
                immutable: true,
                created_by: user.id,
              },
              { onConflict: 'signed_deed_id,version_type', ignoreDuplicates: true } as any
            );
        } catch {
          // ignore
        }

        try {
          await supabase
            .from('final_secure_archives')
            .update({ current_stage: 'final_archived' })
            .eq('signed_deed_id', input.signedDeedId);
        } catch {
          // ignore
        }

        try {
          await supabase.from('archive_operation_logs').insert({
            signed_deed_id: input.signedDeedId,
            action_type: 'FINAL_SECURE_ARCHIVE_POST_JUDGE',
            timestamp: nowIso,
            user_id: user.id,
            device: input.device ?? null,
            ip: null,
            previous_hash: String((preRes.data as any).sha256),
            new_hash: String((preRes.data as any).sha256),
            metadata: { sealHash },
          });
        } catch {
          // ignore
        }

        return { archived: true, postJudgeSha256: String((preRes.data as any).sha256), sealedAt: nowIso };
      }),

    listSignedDeeds: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .output(z.array(z.object({
        id: z.string(),
        savedRasmId: z.string(),
        category: SignedDeedCategorySchema,
        signatureTimestamp: z.string(),
        createdAt: z.string(),
        readyForJudge: z.boolean(),
        judgeWorkflowStatus: SignedDeedWorkflowStatusSchema,
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        inclusion: z
          .object({
            registerNumber: z.string().nullable(),
            certificateNumber: z.string().nullable(),
            court: z.string().nullable(),
            inclusionDate: z.string().nullable(),
          })
          .nullable(),
      })))
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access signed deeds');

        const userFullName = String(user.full_name || '').trim();

        // Security: Filter signed_deeds by the linked saved_rasm.notary_user_id at the DB level.
        // Fallback to name-based join only if no ID matches are found (migration scenario).
        let { data: rawRows, error } = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'category',
              'signature_timestamp',
              'created_at',
              'ready_for_judge',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, notary_name)',
              'inclusion_registry!signed_deeds_inclusion_fk(register_number, certificate_number, court, inclusion_date)',
            ].join(',')
          )
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        // PostgREST filter on a joined table might return parent records even if join object is null (acting like LEFT JOIN).
        // For security, explicitly filter in-memory to double-check ownership.
        let rows = (rawRows ?? []).filter((r: any) => {
          const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
          return saved && String(saved.notary_user_id) === String(user.id);
        });

        // Migration Fallback: If no records found for user ID, check for legacy name-matched records with null IDs
        if (rows.length === 0 && userFullName !== '') {
          const fallbackRes = await supabase
            .from('signed_deeds')
            .select(
              [
                'id',
                'saved_rasm_id',
                'category',
                'signature_timestamp',
                'created_at',
                'ready_for_judge',
                'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, notary_name)',
                'inclusion_registry!signed_deeds_inclusion_fk(register_number, certificate_number, court, inclusion_date)',
              ].join(',')
            )
            .is('saved_rasms.notary_user_id', null)
            .eq('saved_rasms.notary_name', userFullName)
            .order('created_at', { ascending: false });
          
          if (!fallbackRes.error && fallbackRes.data?.length) {
            const fallbackFiltered = fallbackRes.data.filter((r: any) => {
              const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
              return saved && (saved.notary_user_id === null || saved.notary_user_id === undefined) && String(saved.notary_name || '').trim() === userFullName;
            });
            if (fallbackFiltered.length > 0) {
              rows = fallbackFiltered;
            }
          }
        }

        const signedDeedIds = (rows ?? [])
          .map((r: any) => (r?.id ? String(r.id) : null))
          .filter(Boolean) as string[];
        const signedDeedFileNumbers = (rows ?? [])
          .map((r: any) => {
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            return saved?.file_number ? String(saved.file_number) : null;
          })
          .filter(Boolean) as string[];
        const stageBySignedDeedId: Record<string, string | null> = {};
        const latestJudgeStatusBySignedDeedId: Record<string, JudgeSubmissionWorkflowStatus | null> = {};
        const postJudgeArchiveBySignedDeedId: Record<string, boolean> = {};
        if (signedDeedIds.length) {
          const stagesRes = await supabase
            .from('final_secure_archives')
            .select('signed_deed_id, current_stage')
            .in('signed_deed_id', signedDeedIds);
          if (!stagesRes.error) {
            (stagesRes.data || []).forEach((row: any) => {
              if (row?.signed_deed_id) stageBySignedDeedId[String(row.signed_deed_id)] = row?.current_stage ? String(row.current_stage) : null;
            });
          }

          if (signedDeedFileNumbers.length) {
            const judgeSubmissionsRes = await supabase
              .from('judge_submissions')
              .select('file_number, status, created_at, updated_at, decided_at')
              .eq('notary_user_id', user.id)
              .in('file_number', signedDeedFileNumbers)
              .order('created_at', { ascending: false });

            if (!judgeSubmissionsRes.error) {
              const latestJudgeTimestampByFileNumber: Record<string, number> = {};
              const latestJudgeStatusByFileNumber: Record<string, JudgeSubmissionWorkflowStatus | null> = {};
              (judgeSubmissionsRes.data || []).forEach((row: any) => {
                const fileNumber = row?.file_number ? String(row.file_number) : null;
                if (!fileNumber) return;
                const ts = new Date(String(row?.updated_at || row?.decided_at || row?.created_at || '')).getTime();
                const prevTs = latestJudgeTimestampByFileNumber[fileNumber] ?? -1;
                if (Number.isFinite(ts) && ts >= prevTs) {
                  latestJudgeTimestampByFileNumber[fileNumber] = ts;
                  latestJudgeStatusByFileNumber[fileNumber] = row?.status ? (String(row.status) as JudgeSubmissionWorkflowStatus) : null;
                }
              });

              (rows ?? []).forEach((row: any) => {
                const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
                const fileNumber = saved?.file_number ? String(saved.file_number) : null;
                const signedDeedId = row?.id ? String(row.id) : null;
                if (!fileNumber || !signedDeedId) return;
                latestJudgeStatusBySignedDeedId[signedDeedId] = latestJudgeStatusByFileNumber[fileNumber] ?? null;
              });
            }
          }

          const postJudgeVersionsRes = await supabase
            .from('final_secure_archive_versions')
            .select('signed_deed_id')
            .eq('version_type', 'post_judge')
            .in('signed_deed_id', signedDeedIds);

          if (!postJudgeVersionsRes.error) {
            (postJudgeVersionsRes.data || []).forEach((row: any) => {
              if (row?.signed_deed_id) postJudgeArchiveBySignedDeedId[String(row.signed_deed_id)] = true;
            });
          }
        }

        return (rows ?? []).map((r: any) => {
          const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
          const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
          const workflowStatus = deriveSignedDeedWorkflowStatus(
            stageBySignedDeedId[String(r.id)],
            !!r.ready_for_judge,
            latestJudgeStatusBySignedDeedId[String(r.id)],
            !!postJudgeArchiveBySignedDeedId[String(r.id)],
          );
          return {
            id: String(r.id),
            savedRasmId: String(r.saved_rasm_id),
            category: r.category,
            signatureTimestamp: String(r.signature_timestamp),
            createdAt: String(r.created_at),
            readyForJudge: !!r.ready_for_judge,
            judgeWorkflowStatus: workflowStatus,
            fileNumber: saved?.file_number ?? null,
            documentType: saved?.document_type ?? null,
            inclusion: incl
              ? {
                  registerNumber: incl.register_number ?? null,
                  certificateNumber: incl.certificate_number ?? null,
                  court: incl.court ?? null,
                  inclusionDate: incl.inclusion_date ? String(incl.inclusion_date) : null,
                }
              : null,
          };
        });
      }),

    getSignedDeed: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        id: z.string().uuid(), // signed_deeds.id
      }))
      .output(z.object({
        id: z.string(),
        savedRasmId: z.string(),
        inclusionId: z.string().nullable(),
        category: SignedDeedCategorySchema,
        finalHash: z.string().nullable(),
        signatureTimestamp: z.string(),
        sealHash: z.string().nullable(),
        sealTimestamp: z.string().nullable(),
        readyForJudge: z.boolean(),
        judgeWorkflowStatus: SignedDeedWorkflowStatusSchema,
        sentToJudgeAt: z.string().nullable(),
        archivedFinallyAt: z.string().nullable(),
        createdAt: z.string(),
        signedPdfUrl: z.string().nullable(),
        signedPdfHasInclusionFooterStrip: z.boolean(),
        signedPdfFooterStripVersion: z.number(),
        signedPdfFooterStripQrIncluded: z.boolean(),
        signedPdfFooterStripCreatedAt: z.string().nullable(),
        savedRasm: z.object({
          fileNumber: z.string().nullable(),
          documentType: z.string().nullable(),
          createdAt: z.string().nullable(),
        }),
        inclusion: z
          .object({
            registerNumber: z.string().nullable(),
            certificateNumber: z.string().nullable(),
            court: z.string().nullable(),
            inclusionDate: z.string().nullable(),
          })
          .nullable(),
        sealMetadata: z
          .object({
            registerNumber: z.string().nullable(),
            certificateNumber: z.string().nullable(),
            pageNumber: z.string().nullable(),
            inclusionDate: z.string().nullable(),
            notary1Name: z.string().nullable(),
            notary2Name: z.string().nullable(),
            court: z.string().nullable(),
            phone: z.string().nullable(),
            email: z.string().nullable(),
          })
          .nullable(),
        auditHubInclusion: z
          .object({
            serial: z.string().nullable(),
            certificateType: z.string().nullable(),
            authority: z.string().nullable(),
            registrationDate: z.string().nullable(),
            documentDate: z.string().nullable(),
            register: z.string().nullable(),
            page: z.string().nullable(),
            count: z.string().nullable(),
            notary1Name: z.string().nullable(),
            notary2Name: z.string().nullable(),
            phone: z.string().nullable(),
            email: z.string().nullable(),
          })
          .nullable(),
      }))
      .query(async ({ input }) => {
        const user = await requireNotary(input.sessionToken, 'Only notaries can access signed deeds');

        // Best-effort: fetch notary profile phone (some environments store phone there, not in users).
        let notaryProfileId: string | null = null;
        let notaryProfilePhone: string | null = null;
        try {
          const prof = await supabase
            .from('notary_profiles')
            .select('id, phone')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!prof.error && prof.data) {
            notaryProfileId = (prof.data as any)?.id ? String((prof.data as any).id) : null;
            notaryProfilePhone = (prof.data as any)?.phone ?? null;
          }
        } catch {
          notaryProfileId = null;
          notaryProfilePhone = null;
        }

        // Secondary notary name fallback is resolved later (needs payloadObj).
        let fallbackSecondaryNotaryName: string | null = null;

        // Optional: fetch users.phone if the column exists in this deployment.
        let userPhone: string | null = null;
        try {
          const up = await supabase.from('users').select('phone').eq('id', user.id).maybeSingle();
          if (!up.error && up.data) userPhone = (up.data as any)?.phone ?? null;
        } catch {
          userPhone = null;
        }

        const { data: rawRow, error } = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'inclusion_id',
              'category',
              'final_hash',
              'signature_timestamp',
              'seal_hash',
              'seal_timestamp',
              'ready_for_judge',
              'created_at',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, created_at, notary_user_id, inclusion_id, payload)',
              'inclusion_registry!signed_deeds_inclusion_fk(register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri, court, operation_id, inclusion_hash, notary1_name, notary2_name)',
              'seal_metadata(register_number, certificate_number, page_number, inclusion_date, notary1_name, notary2_name, court, phone, email)',
            ].join(',')
          )
          .eq('id', input.id)
          .eq('saved_rasms.notary_user_id', user.id)
          .maybeSingle();

        if (error || !rawRow) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        }

        // Double check ownership in case PostgREST returned the parent with a null join object
        const savedCheck = Array.isArray((rawRow as any)?.saved_rasms) ? (rawRow as any).saved_rasms[0] : (rawRow as any)?.saved_rasms;
        if (!savedCheck || String(savedCheck.notary_user_id) !== String(user.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        const row = rawRow;
        const saved = savedCheck;

        const seal = Array.isArray((row as any)?.seal_metadata) ? (row as any).seal_metadata[0] : (row as any)?.seal_metadata;

        const payloadObj = (saved?.payload as any) ?? {};
        const parsedFromPayload = extractInclusionFromPayload(payloadObj);
        const auditHubObj = payloadObj?.auditHubInclusion && typeof payloadObj.auditHubInclusion === 'object' ? payloadObj.auditHubInclusion : null;

        // Resolve the activated/selected secondary notary (partner) name.
        // Priority:
        // 1) Explicit partnerId/notaryPartnerId in payload/meta.
        // 2) Activated partner (is_available=true) with smallest position_order.
        // 3) First partner by position_order.
        if (notaryProfileId) {
          try {
            const payloadMeta = payloadObj?.meta && typeof payloadObj.meta === 'object' ? payloadObj.meta : null;
            const selectedPartnerIdRaw =
              (payloadObj as any)?.notaryPartnerId ??
              (payloadObj as any)?.partnerId ??
              (payloadMeta as any)?.notaryPartnerId ??
              (payloadMeta as any)?.partnerId ??
              null;
            const selectedPartnerId = selectedPartnerIdRaw ? String(selectedPartnerIdRaw) : null;

            if (selectedPartnerId) {
              const byId = await supabase
                .from('notary_partners')
                .select('partner_name, notary_profile_id')
                .eq('id', selectedPartnerId)
                .maybeSingle();
              if (!byId.error && byId.data && String((byId.data as any).notary_profile_id) === String(notaryProfileId)) {
                fallbackSecondaryNotaryName = (byId.data as any)?.partner_name ? String((byId.data as any).partner_name) : null;
              }
            }

            if (!fallbackSecondaryNotaryName) {
              const pRes = await supabase
                .from('notary_partners')
                .select('partner_name, position_order, is_available')
                .eq('notary_profile_id', notaryProfileId)
                .order('is_available', { ascending: false })
                .order('position_order', { ascending: true })
                .limit(1);
              if (!pRes.error) {
                const row0: any = (pRes.data ?? [])?.[0];
                fallbackSecondaryNotaryName = row0?.partner_name ? String(row0.partner_name) : null;
              }
            }
          } catch {
            fallbackSecondaryNotaryName = null;
          }
        }

        // Inclusion: best-effort automatic gathering
        // 1) Prefer explicit FK join via signed_deeds.inclusion_id
        let incl: any = Array.isArray((row as any)?.inclusion_registry) ? (row as any).inclusion_registry[0] : (row as any)?.inclusion_registry;

        // 2) If signed_deeds.inclusion_id is null, try saved_rasms.inclusion_id.
        if (!incl) {
          const fallbackInclusionId = (row as any).inclusion_id
            ? String((row as any).inclusion_id)
            : saved?.inclusion_id
              ? String(saved.inclusion_id)
              : null;
          if (fallbackInclusionId) {
            try {
              const inclRes = await supabase
                .from('inclusion_registry')
                .select('register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri, court, operation_id, inclusion_hash, notary1_name, notary2_name')
                .eq('id', fallbackInclusionId)
                .maybeSingle();
              if (!inclRes.error && inclRes.data) {
                incl = inclRes.data;
              }
            } catch {
              // ignore
            }
          }
        }

        // 3) If still missing, extract from saved_rasms payload (works for legacy rows).
        let extractedInclusion: any | null = null;
        if (!incl) {
          try {
            const parsed = parsedFromPayload;
            if (parsed?.registerNumber || parsed?.certificateNumber || parsed?.court || parsed?.inclusionDate || parsed?.registryPage || parsed?.operationId) {
              extractedInclusion = {
                register_number: parsed.registerNumber ?? null,
                certificate_number: parsed.certificateNumber ?? null,
                registry_page: parsed.registryPage ?? null,
                court: parsed.court ?? null,
                inclusion_date: parsed.inclusionDate ?? null,
                inclusion_hijri: parsed.inclusionHijri ?? null,
                operation_id: parsed.operationId ?? null,
                inclusion_hash: parsed.inclusionHash ?? null,
                notary1_name: parsed.notary1Name ?? (user as any)?.full_name ?? null,
                notary2_name: parsed.notary2Name ?? null,
              };
            }
          } catch {
            extractedInclusion = null;
          }
        }

        const resolvedInclusionCandidate = (incl || extractedInclusion || seal)
          ? {
              registerNumber: (incl?.register_number ?? extractedInclusion?.register_number ?? seal?.register_number) ?? null,
              certificateNumber: (incl?.certificate_number ?? extractedInclusion?.certificate_number ?? seal?.certificate_number) ?? null,
              court: (incl?.court ?? extractedInclusion?.court ?? seal?.court) ?? null,
              inclusionDate: (incl?.inclusion_date ?? extractedInclusion?.inclusion_date ?? seal?.inclusion_date)
                ? String(incl?.inclusion_date ?? extractedInclusion?.inclusion_date ?? seal?.inclusion_date)
                : null,
            }
          : null;

        const resolvedInclusion = resolvedInclusionCandidate &&
          (resolvedInclusionCandidate.registerNumber ||
            resolvedInclusionCandidate.certificateNumber ||
            resolvedInclusionCandidate.court ||
            resolvedInclusionCandidate.inclusionDate)
          ? resolvedInclusionCandidate
          : null;

        const resolvedAuditHubInclusion = {
          serial:
            (auditHubObj?.serial ?? null) ||
            (auditHubObj?.reference ?? null) ||
            (parsedFromPayload?.operationId ?? null) ||
            (incl?.operation_id ?? null) ||
            (extractedInclusion?.operation_id ?? null) ||
            null,
          certificateType: (auditHubObj?.certificateType ?? null) || (payloadObj?.certificateType ?? null) || (saved?.document_type ?? null),
          authority: (auditHubObj?.court ?? null) || (auditHubObj?.authority ?? null) || (parsedFromPayload?.court ?? null) || (incl?.court ?? null) || (seal?.court ?? null) || null,
          registrationDate: (auditHubObj?.registrationDate ?? null) || null,
          documentDate: (auditHubObj?.documentDate ?? null) || null,
          register:
            (auditHubObj?.registerNumber ?? null) ||
            (payloadObj?.registerNumber ?? null) ||
            (incl?.register_number ?? null) ||
            (seal?.register_number ?? null) ||
            null,
          page:
            (auditHubObj?.registryPage ?? null) ||
            (payloadObj?.registryPage ?? null) ||
            (incl?.registry_page ?? null) ||
            (seal?.page_number ?? null) ||
            null,
          count:
            (auditHubObj?.certificateNumber ?? null) ||
            (payloadObj?.certificateNumber ?? null) ||
            (incl?.certificate_number ?? null) ||
            (seal?.certificate_number ?? null) ||
            null,
          notary1Name:
            (seal?.notary1_name ?? null) ||
            (incl?.notary1_name ?? null) ||
            (extractedInclusion?.notary1_name ?? null) ||
            (parsedFromPayload?.notary1Name ?? null) ||
            (user as any)?.full_name ||
            null,
          notary2Name:
            (seal?.notary2_name ?? null) ||
            (incl?.notary2_name ?? null) ||
            (extractedInclusion?.notary2_name ?? null) ||
            (parsedFromPayload?.notary2Name ?? null) ||
            (fallbackSecondaryNotaryName ?? null) ||
            null,
          phone:
            (seal?.phone ?? null) ||
            (payloadObj?.phone ?? null) ||
            (userPhone ?? null) ||
            (notaryProfilePhone ?? null) ||
            null,
          email: (seal?.email ?? null) || (payloadObj?.email ?? null) || ((user as any)?.email ?? null) || null,
        };

        let currentStage: string | null = null;
        try {
          const stageRes = await supabase
            .from('final_secure_archives')
            .select('current_stage')
            .eq('signed_deed_id', input.id)
            .maybeSingle();
          if (!stageRes.error && stageRes.data) {
            currentStage = (stageRes.data as any)?.current_stage ? String((stageRes.data as any).current_stage) : null;
          }
        } catch {
          currentStage = null;
        }

        let latestJudgeSubmissionStatus: JudgeSubmissionWorkflowStatus | null = null;
        try {
          if (saved?.file_number) {
            const judgeSubmissionRes = await supabase
              .from('judge_submissions')
              .select('status, created_at, updated_at, decided_at')
              .eq('notary_user_id', user.id)
              .eq('file_number', String(saved.file_number))
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!judgeSubmissionRes.error && judgeSubmissionRes.data) {
              latestJudgeSubmissionStatus = (judgeSubmissionRes.data as any)?.status
                ? (String((judgeSubmissionRes.data as any).status) as JudgeSubmissionWorkflowStatus)
                : null;
            }
          }
        } catch {
          latestJudgeSubmissionStatus = null;
        }

        let hasPostJudgeArchiveVersion = false;
        try {
          const postJudgeVersionRes = await supabase
            .from('final_secure_archive_versions')
            .select('signed_deed_id')
            .eq('signed_deed_id', input.id)
            .eq('version_type', 'post_judge')
            .maybeSingle();
          hasPostJudgeArchiveVersion = !postJudgeVersionRes.error && !!postJudgeVersionRes.data;
        } catch {
          hasPostJudgeArchiveVersion = false;
        }

        let sentToJudgeAt: string | null = null;
        let archivedFinallyAt: string | null = null;
        try {
          const logsRes = await supabase
            .from('archive_operation_logs')
            .select('action_type, timestamp')
            .eq('signed_deed_id', input.id)
            .in('action_type', ['SEND_TO_JUDGE', 'FINAL_SECURE_ARCHIVE_POST_JUDGE'] as any)
            .order('timestamp', { ascending: false });
          if (!logsRes.error) {
            for (const log of logsRes.data || []) {
              const actionType = String((log as any)?.action_type || '');
              const timestamp = (log as any)?.timestamp ? String((log as any).timestamp) : null;
              if (!sentToJudgeAt && actionType === 'SEND_TO_JUDGE') sentToJudgeAt = timestamp;
              if (!archivedFinallyAt && actionType === 'FINAL_SECURE_ARCHIVE_POST_JUDGE') archivedFinallyAt = timestamp;
            }
          }
        } catch {
          sentToJudgeAt = null;
          archivedFinallyAt = null;
        }

        const workflowStatus = deriveSignedDeedWorkflowStatus(
          currentStage,
          !!(row as any).ready_for_judge,
          latestJudgeSubmissionStatus,
          hasPostJudgeArchiveVersion || !!archivedFinallyAt,
        );

        // Fetch the persisted signed PDF (with QR) for direct rendering.
        let signedPdfUrl: string | null = null;
        let signedPdfHasInclusionFooterStrip = false;
        let signedPdfFooterStripVersion = 0;
        let signedPdfFooterStripQrIncluded = true;
        let signedPdfFooterStripCreatedAt: string | null = null;
        try {
          const attRes = await supabase
            .from('deed_attachments')
            .select('file_url, created_at, metadata')
            .eq('record_type', 'signed_deed')
            .eq('record_id', input.id)
            .eq('category', 'signed_pdf')
            .order('created_at', { ascending: false })
            .limit(1);
          if (!attRes.error) {
            const att0: any = attRes.data?.[0] ?? null;
            signedPdfUrl = att0?.file_url ?? null;
            const meta = att0?.metadata && typeof att0.metadata === 'object' ? att0.metadata : null;
            const footerStripObj = meta?.footerStrip && typeof meta.footerStrip === 'object' ? (meta.footerStrip as any) : null;
            const removed = footerStripObj ? footerStripObj.removed === true : false;
            signedPdfFooterStripVersion = removed ? 0 : Number(footerStripObj?.version ?? 0);
            const qrIncluded = footerStripObj ? footerStripObj.qrIncluded : undefined;
            signedPdfFooterStripQrIncluded = removed ? false : (typeof qrIncluded === 'boolean' ? qrIncluded : true);
            signedPdfHasInclusionFooterStrip = !removed && signedPdfFooterStripVersion >= 2;
            signedPdfFooterStripCreatedAt =
              !removed && footerStripObj?.createdAt ? String(footerStripObj.createdAt) : null;
          }
        } catch {
          signedPdfUrl = null;
          signedPdfHasInclusionFooterStrip = false;
          signedPdfFooterStripVersion = 0;
          signedPdfFooterStripQrIncluded = true;
          signedPdfFooterStripCreatedAt = null;
        }

        return {
          id: String((row as any).id),
          savedRasmId: String((row as any).saved_rasm_id),
          inclusionId: (row as any).inclusion_id ? String((row as any).inclusion_id) : null,
          category: (row as any).category,
          finalHash: (row as any).final_hash ?? null,
          signatureTimestamp: String((row as any).signature_timestamp),
          sealHash: (row as any).seal_hash ?? null,
          sealTimestamp: (row as any).seal_timestamp ? String((row as any).seal_timestamp) : null,
          readyForJudge: !!(row as any).ready_for_judge,
          judgeWorkflowStatus: workflowStatus,
          sentToJudgeAt,
          archivedFinallyAt,
          createdAt: String((row as any).created_at),
          signedPdfUrl,
          signedPdfHasInclusionFooterStrip,
          signedPdfFooterStripVersion,
          signedPdfFooterStripQrIncluded,
          signedPdfFooterStripCreatedAt,
          savedRasm: {
            fileNumber: saved?.file_number ?? null,
            documentType: saved?.document_type ?? null,
            createdAt: saved?.created_at ? String(saved.created_at) : null,
          },
          inclusion: resolvedInclusion,
          sealMetadata: seal
            ? {
                registerNumber: seal.register_number ?? null,
                certificateNumber: seal.certificate_number ?? null,
                pageNumber: seal.page_number ?? null,
                inclusionDate: seal.inclusion_date ? String(seal.inclusion_date) : null,
                notary1Name: seal.notary1_name ?? null,
                notary2Name: seal.notary2_name ?? null,
                court: seal.court ?? null,
                phone: seal.phone ?? null,
                email: seal.email ?? null,
              }
            : null,
          auditHubInclusion: resolvedAuditHubInclusion,
        };
      }),

    embedInclusionFooterStrip: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          signedDeedId: z.string().uuid(),
          includeQr: z.boolean().optional(),
          forceRegenerate: z.boolean().optional(),
          origin: z.string().optional(),
          device: z.record(z.unknown()).optional(),
        })
      )
      .output(
        z.object({
          updated: z.boolean(),
          signedPdfUrl: z.string().nullable(),
          sha256: z.string().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const removeFooterStrip = input.includeQr === false;
        const includeQr = !removeFooterStrip;
        // v17: embed footer strip (with QR) + selectable/searchable text layer
        const FOOTER_STRIP_VERSION_WITH_QR = 17;
        const user = await resolveSessionUser(input.sessionToken);
        const isJudge = user.role === 'authentication_judge';
        if (user.role !== 'notary' && !isJudge) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries or authentication judges can stamp deeds' });
        }

        // Fetch signed deed + ownership + inclusion/seal data.
        const deedRes = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'inclusion_id',
              'final_hash',
              'signature_timestamp',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, notary_user_id)',
              'inclusion_registry!signed_deeds_inclusion_fk(register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri, operation_id, court, notary1_name, notary2_name)',
              'seal_metadata(register_number, certificate_number, page_number, inclusion_date, court, notary1_name, notary2_name, phone, email)',
            ].join(',')
          )
          .eq('id', input.signedDeedId)
          .single();

        if (deedRes.error || !deedRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const deedRow: any = deedRes.data;
        const saved = Array.isArray(deedRow?.saved_rasms) ? deedRow.saved_rasms[0] : deedRow?.saved_rasms;
        if (!saved) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }
        if (!isJudge && String(saved.notary_user_id) !== String(user.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        }
        if (isJudge) {
          const judgeSubRes = await supabase
            .from('judge_submissions')
            .select('id')
            .contains('payload', { signedDeedId: input.signedDeedId } as any)
            .limit(1);
          if (judgeSubRes.error || !(judgeSubRes.data?.length)) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
          }
        }

        const incl = Array.isArray(deedRow?.inclusion_registry) ? deedRow.inclusion_registry[0] : deedRow?.inclusion_registry;
        const seal = Array.isArray(deedRow?.seal_metadata) ? deedRow.seal_metadata[0] : deedRow?.seal_metadata;

        // Fetch current signed_pdf attachment
        const attRes = await supabase
          .from('deed_attachments')
          .select('id, file_url, storage_path, metadata, created_at')
          .eq('record_type', 'signed_deed')
          .eq('record_id', input.signedDeedId)
          .eq('category', 'signed_pdf')
          .order('created_at', { ascending: false })
          .limit(1);

        const attRow: any = attRes.error ? null : (attRes.data?.[0] ?? null);
        if (!attRow?.file_url) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No signed PDF found for this deed' });
        }

        // Idempotency guard:
        // - v5+ is the current fixed implementation.
        // - Allow upgrades from older versions (including v1-v4) even when includeQr doesn't change.
        const existingMeta = attRow?.metadata && typeof attRow.metadata === 'object' ? attRow.metadata : null;
        const priorFooterVersion = Number(existingMeta?.footerStrip?.version ?? 0);
        const priorQrIncluded = existingMeta?.footerStrip && typeof existingMeta.footerStrip === 'object'
          ? (existingMeta.footerStrip as any)?.qrIncluded
          : undefined;
        const priorQrIncludedBool = typeof priorQrIncluded === 'boolean' ? priorQrIncluded : true;

        if (!removeFooterStrip && !input.forceRegenerate) {
          const targetFooterVersion = FOOTER_STRIP_VERSION_WITH_QR;
          // Idempotency check uses version + qrIncluded.
          if (priorFooterVersion >= targetFooterVersion && priorQrIncludedBool === true) {
            return {
              updated: false,
              signedPdfUrl: String(attRow.file_url),
              sha256: (existingMeta?.sha256 ? String(existingMeta.sha256) : null),
            };
          }
        } else {
          // If there is no known strip metadata, do nothing.
          const footerStripObj = existingMeta?.footerStrip && typeof existingMeta.footerStrip === 'object'
            ? (existingMeta.footerStrip as any)
            : null;
          const alreadyRemoved = footerStripObj ? footerStripObj.removed === true : false;
          if ((priorFooterVersion ?? 0) <= 0 || alreadyRemoved) {
            return {
              updated: false,
              signedPdfUrl: String(attRow.file_url),
              sha256: (existingMeta?.sha256 ? String(existingMeta.sha256) : null),
            };
          }
        }

        // Download original PDF
        let originalPdfBuffer: Buffer;
        try {
          const resp = await fetch(String(attRow.file_url), { cache: 'no-store' as any });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const ab = await resp.arrayBuffer();
          originalPdfBuffer = Buffer.from(ab);
        } catch (e: any) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to fetch signed PDF: ${e?.message || String(e)}` });
        }

        // Build QR payload.
        // Instead of raw JSON (which most scanners won't "open"), encode a verification URL.
        // This uses the existing public /verify/:token flow.
        const qrPayloadObj = {
          hash: deedRow?.final_hash ? String(deedRow.final_hash) : null,
          rasmNumber: saved?.file_number ?? null,
          inclusionRegisterNumber: incl?.register_number ?? seal?.register_number ?? null,
          uuid: String(deedRow.id),
          signatureDate: deedRow?.signature_timestamp ? String(deedRow.signature_timestamp) : null,
        };

        const cleanedOrigin = (input.origin || '').trim().replace(/\/+$/, '');
        const canBuildLink = includeQr && cleanedOrigin.length > 0;

        let verifyToken: string | null = null;
        let verifyUrl: string | null = null;

        if (canBuildLink) {
          // Reuse an active link if possible, else create a new one.
          const now = Date.now();
          try {
            const existingLinkRes = await supabase
              .from('verification_links')
              .select('token, expires_at, revoked_at')
              .eq('signed_deed_id', input.signedDeedId)
              .is('revoked_at', null)
              .order('created_at', { ascending: false })
              .limit(1);

            const existing: any = existingLinkRes.error ? null : (existingLinkRes.data?.[0] ?? null);
            const expiresAt = existing?.expires_at ? new Date(String(existing.expires_at)).getTime() : NaN;
            const isValid = !!existing?.token && Number.isFinite(expiresAt) && expiresAt > now;
            if (isValid) {
              verifyToken = String(existing.token);
            }
          } catch {
            // ignore
          }

          if (!verifyToken) {
            let verificationExpiryDays = 30;
            try {
              const settingsRes = await supabase
                .from('archive_settings')
                .select('verification_link_expiry_days')
                .eq('id', 1)
                .maybeSingle();
              const v = Number((settingsRes.data as any)?.verification_link_expiry_days);
              if (Number.isFinite(v) && v > 0 && v <= 3650) verificationExpiryDays = v;
            } catch {
              // ignore
            }

            const nowIso = new Date().toISOString();
            const expiresAt = new Date(Date.now() + verificationExpiryDays * 24 * 60 * 60 * 1000).toISOString();

            await supabase
              .from('verification_links')
              .update({ revoked_at: nowIso })
              .eq('signed_deed_id', input.signedDeedId)
              .is('revoked_at', null);

            const insertRes = await supabase
              .from('verification_links')
              .insert({ signed_deed_id: input.signedDeedId, expires_at: expiresAt, created_by: user.id })
              .select('token')
              .single();
            if (!insertRes.error && insertRes.data) {
              verifyToken = String((insertRes.data as any).token);
            }
          }

          if (verifyToken) {
            verifyUrl = `${cleanedOrigin}/verify/${verifyToken}`;
          }
        }

        const qrValue = includeQr ? (verifyUrl ?? '') : '';
        const qrPng = includeQr && qrValue
          ? await QRCode.toBuffer(qrValue, {
              type: 'png',
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 220,
            } as any)
          : null;

        const pdfDoc = await PDFDocument.load(originalPdfBuffer);
        pdfDoc.registerFontkit(fontkit);

        const pages = pdfDoc.getPages();
        if (!pages.length) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Signed PDF has no pages' });

        // Always mask the legacy QR stamped at signature-time (bottom-left of first page).
        // The footer strip is the only supported QR placement.
        // For multi-page PDFs we can mask it directly on page 1.
        // For single-page PDFs, the page is rebuilt below; masking is handled after embedding.
        const legacyQrMargin = 30;
        if (pages.length > 1) {
          const p0 = pages[0];
          const { width: w0, height: h0 } = p0.getSize();
          const legacyQrSize = Math.min(110, Math.max(80, Math.floor(Math.min(w0, h0) * 0.12)));
          p0.drawRectangle({
            x: legacyQrMargin - 2,
            y: legacyQrMargin - 2,
            width: legacyQrSize + 4,
            height: legacyQrSize + 4,
            color: rgb(1, 1, 1),
          });
        }

        // Footer geometry: 3cm height
        const CM_TO_PT = 72 / 2.54;
        const footerHeight = 3 * CM_TO_PT;

        // IMPORTANT: Keep paper size unchanged AND keep the page content unscaled.
        // We reserve the bottom 3cm by clearing that band, then draw the footer strip on top.
        // This prevents the original PDF frame/border from being moved upward.
        const lastPageIndex = pages.length - 1;
        const page = pages[lastPageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // If we embed or remove the strip, clear the bottom band first.
        if (priorFooterVersion >= 1 || removeFooterStrip) {
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pageWidth,
            height: footerHeight + 2,
            color: rgb(1, 1, 1),
          });
        }

        // For single-page PDFs, the legacy QR is on the same page.
        if (pages.length === 1) {
          const legacyQrSize = Math.min(110, Math.max(80, Math.floor(Math.min(pageWidth, pageHeight) * 0.12)));
          page.drawRectangle({
            x: legacyQrMargin - 2,
            y: legacyQrMargin - 2,
            width: legacyQrSize + 4,
            height: legacyQrSize + 4,
            color: rgb(1, 1, 1),
          });
        }

        const n1 = seal?.notary1_name ?? incl?.notary1_name ?? (user as any)?.full_name ?? null;
        const n2 = seal?.notary2_name ?? incl?.notary2_name ?? null;
        const court = seal?.court ?? incl?.court ?? null;
        const phone = seal?.phone ?? null;
        const email = seal?.email ?? (user as any)?.email ?? null;
        const notaryLines = [
          `العدل الأول: ${n1 ?? '---'}`,
          `العدل الثاني: ${n2 ?? '---'}`,
          `المحكمة: ${court ?? '---'}`,
          `الهاتف: ${phone ?? '---'}`,
          `البريد الإلكتروني: ${email ?? '---'}`,
        ];

        const regNo = incl?.register_number ?? seal?.register_number ?? null;
        const pageNo = incl?.registry_page ?? seal?.page_number ?? null;
        const certNo = incl?.certificate_number ?? seal?.certificate_number ?? null;
        const inclDate = incl?.inclusion_date ?? seal?.inclusion_date ?? null;
        const inclHijri = incl?.inclusion_hijri ?? null;
        const operationDescriptor = incl?.operation_id ?? null;
        const registerInfoHeading = operationDescriptor ? 'مراجع سجل التضمين' : null;
        const registryLetterMatch = operationDescriptor ? String(operationDescriptor).match(/حرف\s+(.+)$/u) : null;
        const registryLetterValue = registryLetterMatch?.[1]?.trim() ?? null;
        const compactOperationDescriptorBase = operationDescriptor
          ? String(operationDescriptor)
              .replace(/^سجل بسجل\s*/u, 'سجل ')
              .replace(/\s+حرف\s+.+$/u, '')
              .replace(/\s+/gu, ' ')
              .trim()
          : null;
        const compactOperationDescriptor = operationDescriptor
          ? String(operationDescriptor)
              .replace(/^سجل بسجل\s*/u, 'سجل ')
              .replace(/\s+/gu, ' ')
              .trim()
          : null;
        const registerInfoLines = operationDescriptor
          ? [
              `${compactOperationDescriptorBase ?? compactOperationDescriptor ?? String(operationDescriptor)} رقم ${regNo ?? '---'}`,
              `حرف: ${registryLetterValue ?? '---'}`,
              `عدد: ${certNo ?? '---'}`,
              `الهجري: ${inclHijri ?? '---'}`,
              `الميلادي: ${inclDate ? String(inclDate).slice(0, 10) : '---'}`,
            ]
          : regNo || certNo || inclHijri || inclDate
            ? [
                'مرجع التضمين',
                `رقم: ${regNo ?? '---'}`,
                `العدد: ${certNo ?? '---'}`,
                `الهجري: ${inclHijri ?? '---'}`,
                `الميلادي: ${inclDate ? String(inclDate).slice(0, 10) : '---'}`,
              ]
            : [];
        const inclusionHeading = operationDescriptor ? 'سجل البيانات' : 'مراجع سجل البيانات';
        const inclusionLines = operationDescriptor
          ? [
              `سجل البيانات: ${regNo ?? '---'}`,
              `الصحيفة: ${pageNo ?? '---'}`,
              `العدد: ${certNo ?? '---'}`,
              `بتاريخ: ${inclDate ? String(inclDate).slice(0, 10) : '---'}`,
            ]
          : [
              `الصحيفة: ${pageNo ?? '---'}`,
              `العدد: ${certNo ?? '---'}`,
              `بتاريخ: ${inclDate ? String(inclDate).slice(0, 10) : '---'}`,
            ];

        if (!removeFooterStrip) {
          let footerStripPng: Buffer;
          try {
            footerStripPng = await renderFooterStripPng({
              widthPt: pageWidth,
              heightPt: footerHeight,
              includeQr,
              qrPng,
              registerInfoHeading,
              registerInfoLines,
              inclusionLines,
              notaryLines,
              inclusionHeading,
            });
          } catch (e: any) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to render footer strip: ${e?.message || String(e)}`,
            });
          }

          const footerImage = await pdfDoc.embedPng(footerStripPng);
          page.drawImage(footerImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: footerHeight,
          });

          // Selectable/searchable text layer (kept nearly invisible), aligned to the same 3-column strip.
          // Visual fidelity comes from the PNG; the text layer is for search/copy.
          const amiriBytes = await loadAmiriFontBytesBestEffort();
          if (!amiriBytes) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                'Amiri font not found. Required to embed selectable/searchable Arabic text layer in the footer strip.',
            });
          }
          const amiriFont = await pdfDoc.embedFont(amiriBytes, { subset: true });

          const padX = 28;
          const padTop = 10;
          const headingSize = 10;
          const textSize = 9;
          const lineGap = 11;
          const colW = pageWidth / 3;

          const topLinePt = 6;
          const yHeading = footerHeight - topLinePt - padTop - headingSize;
          const yFirstLine = yHeading - 14;

          const col2Right = colW * 2 - padX;
          const col3Right = pageWidth - padX;
          const registerRight = colW - 4;

          // Column 2 (inclusion registry)
          drawRightAlignedTextLayer({
            page,
            text: inclusionHeading,
            font: amiriFont,
            size: headingSize,
            xRight: col2Right,
            y: yHeading,
          });
          inclusionLines.forEach((line, idx) => {
            drawRightAlignedTextLayer({
              page,
              text: line,
              font: amiriFont,
              size: textSize,
              xRight: col2Right,
              y: yFirstLine - idx * lineGap,
            });
          });

          if (registerInfoLines.length > 0) {
            if (registerInfoHeading) {
              drawRightAlignedTextLayer({
                page,
                text: registerInfoHeading,
                font: amiriFont,
                size: headingSize,
                xRight: registerRight,
                y: yHeading,
              });
            }
            drawRightAlignedTextLayer({
              page,
              text: registerInfoLines[0] ?? '',
              font: amiriFont,
              size: textSize,
              xRight: registerRight,
              y: registerInfoHeading ? yFirstLine : yHeading,
            });
            registerInfoLines.slice(1).forEach((line, idx) => {
              drawRightAlignedTextLayer({
                page,
                text: line,
                font: amiriFont,
                size: textSize,
                xRight: registerRight,
                y: (registerInfoHeading ? yFirstLine - 10 : yFirstLine) - idx * 10,
              });
            });
          }

          // Column 3 (notary)
          drawRightAlignedTextLayer({
            page,
            text: 'بيانات العدلين',
            font: amiriFont,
            size: headingSize,
            xRight: col3Right,
            y: yHeading,
          });
          notaryLines.forEach((line, idx) => {
            drawRightAlignedTextLayer({
              page,
              text: line,
              font: amiriFont,
              size: textSize,
              xRight: col3Right,
              y: yFirstLine - idx * lineGap,
            });
          });
        }

        const stampedBytes = await pdfDoc.save();
        const stampedBuffer = Buffer.from(stampedBytes);
        const stampedSha = sha256Hex(stampedBuffer);

        const uploaded = await uploadBufferToDocumentsBucket({
          path: `signed-deeds/${input.signedDeedId}/${stampedSha}.pdf`,
          buffer: stampedBuffer,
          contentType: 'application/pdf',
          upsert: true,
        });

        // Replace previous signed_pdf attachment
        await removeAttachmentStorageByCategory('signed_deed', input.signedDeedId, ['signed_pdf']);
        await supabase
          .from('deed_attachments')
          .delete()
          .eq('record_type', 'signed_deed')
          .eq('record_id', input.signedDeedId)
          .eq('category', 'signed_pdf');

        await supabase.from('deed_attachments').insert({
          record_id: input.signedDeedId,
          record_type: 'signed_deed',
          category: 'signed_pdf',
          file_name: `signed-${input.signedDeedId}.pdf`,
          file_url: uploaded.url,
          storage_path: uploaded.path,
          mime_type: 'application/pdf',
          file_size: stampedBuffer.length,
          metadata: {
            sha256: stampedSha,
            footerStrip: removeFooterStrip
              ? {
                  removed: true,
                  version: 0,
                  createdAt: new Date().toISOString(),
                  source: 'embedInclusionFooterStrip',
                  heightCm: 3,
                  qrIncluded: false,
                  legacyQrMasked: true,
                }
              : {
                  version: FOOTER_STRIP_VERSION_WITH_QR,
                  createdAt: new Date().toISOString(),
                  source: 'embedInclusionFooterStrip',
                  heightCm: 3,
                  qrIncluded: true,
                  legacyQrMasked: true,
                  forceRegenerated: !!input.forceRegenerate,
                },
            qr: {
              payload: qrPayloadObj,
              verify: verifyUrl ? { url: verifyUrl, token: verifyToken } : null,
            },
          },
        });

        // Best-effort security log
        try {
          await supabase.from('signed_deed_security_logs').insert({
            signed_deed_id: input.signedDeedId,
            operation: 'Embed Inclusion Footer Strip',
            category: null,
            final_sha256: deedRow?.final_hash ? String(deedRow.final_hash) : null,
            user_id: user.id,
            device: input.device ?? null,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // ignore
        }

        return { updated: true, signedPdfUrl: uploaded.url, sha256: stampedSha };
      }),

    // ===============================
    // SECURE ARCHIVE (cards + search)
    // ===============================

};
