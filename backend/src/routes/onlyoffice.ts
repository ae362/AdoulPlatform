import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { supabase } from '../services/supabase';
import { uploadBufferToDocumentsBucket } from '../utils/storage';
import { convertDocxToPdfViaLibreOffice } from '../services/auditDocArtifacts';

function jsonParseBody(body: any): any {
  if (body == null) return null;
  if (typeof body === 'object') return body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return null;
}

function timingSafeEq(a: string, b: string) {
  try {
    const ab = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function hmacToken(secret: string, value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function parseOnlyOfficeUserdata(raw: unknown): { savedRasmId: string | null; requestId: string | null } {
  const fallback = String(raw ?? '').trim();
  if (!fallback) return { savedRasmId: null, requestId: null };
  try {
    const parsed = JSON.parse(fallback);
    if (parsed && typeof parsed === 'object') {
      return {
        savedRasmId: String((parsed as any).savedRasmId || '').trim() || null,
        requestId: String((parsed as any).requestId || '').trim() || null,
      };
    }
  } catch {
    // ignore
  }
  return { savedRasmId: fallback, requestId: null };
}

export async function registerOnlyOfficeRoutes(fastify: FastifyInstance) {
  // DocumentServer downloads the file from here.
  fastify.get('/onlyoffice/file/:attachmentId', async (req, reply) => {
    const attachmentId = String((req.params as any)?.attachmentId || '').trim();
    if (!attachmentId) return reply.code(400).send({ error: 'attachmentId required' });
    fastify.log.info({ attachmentId, query: req.query }, 'OnlyOffice file request');

    const secret = process.env.ONLYOFFICE_FILE_TOKEN_SECRET || process.env.ONLYOFFICE_JWT_SECRET || process.env.JWT_SECRET || '';
    if (secret) {
      const token = String((req.query as any)?.token || '');
      const expected = hmacToken(secret, attachmentId);
      if (!timingSafeEq(token, expected)) {
        return reply.code(403).send({ error: 'forbidden' });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({ error: 'Server configuration error: Token secret missing' });
    }

    const { data: att, error } = await supabase
      .from('deed_attachments')
      .select('id, file_url, mime_type, file_name')
      .eq('id', attachmentId)
      .single();

    if (error || !att) return reply.code(404).send({ error: 'attachment not found' });
    const fileUrl = String((att as any).file_url || '').trim();
    if (!fileUrl) return reply.code(404).send({ error: 'file_url missing' });

    const resp = await fetch(fileUrl, { cache: 'no-store' as any });
    if (!resp.ok) return reply.code(502).send({ error: `failed to fetch file (${resp.status})` });
    const ab = await resp.arrayBuffer();
    const buf = Buffer.from(ab);

    reply
      .header('Content-Type', String((att as any).mime_type || 'application/octet-stream'))
      .header('Content-Disposition', `inline; filename="${String((att as any).file_name || 'document').replace(/"/g, '')}"`)
      .send(buf);
  });

  // DocumentServer calls back here when the user saves.
  fastify.post('/onlyoffice/callback/:savedRasmId/:baseAttachmentId', async (req, reply) => {
    const savedRasmId = String((req.params as any)?.savedRasmId || '').trim();
    const baseAttachmentId = String((req.params as any)?.baseAttachmentId || '').trim();
    if (!savedRasmId || !baseAttachmentId) return reply.code(400).send({ error: 1 });
    fastify.log.info(
      {
        savedRasmId,
        baseAttachmentId,
        query: req.query,
        rawBody: (req as any).body,
      },
      'OnlyOffice callback received'
    );

    const secret = process.env.ONLYOFFICE_CALLBACK_TOKEN_SECRET || process.env.ONLYOFFICE_JWT_SECRET || process.env.JWT_SECRET || '';
    if (secret) {
      const token = String((req.query as any)?.token || '');
      const expected = hmacToken(secret, `${savedRasmId}:${baseAttachmentId}`);
      if (!timingSafeEq(token, expected)) {
        return reply.code(403).send({ error: 1 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({ error: 'Server configuration error: Token secret missing' });
    }

    const body = jsonParseBody((req as any).body);
    const status = Number(body?.status);
    const url = String(body?.url || '').trim();
    const userdata = parseOnlyOfficeUserdata(body?.userdata);
    const forceSaveRequestId = userdata.requestId;
    fastify.log.info({ savedRasmId, baseAttachmentId, status, url, forceSaveRequestId }, 'OnlyOffice callback parsed');

    // 2 = MustSave, 6 = MustForceSave (OnlyOffice)
    if (!(status === 2 || status === 6)) {
      fastify.log.info({ savedRasmId, baseAttachmentId, status }, 'OnlyOffice callback ignored status');
      return reply.send({ error: 0 });
    }
    if (!url || !/^https?:/i.test(url)) return reply.send({ error: 0 });

    try {
      const resp = await fetch(url, { cache: 'no-store' as any });
      if (!resp.ok) return reply.send({ error: 0 });
      const ab = await resp.arrayBuffer();
      const docxBuffer = Buffer.from(ab);

      const versionId = crypto.randomUUID();
      const docxPath = `onlyoffice-edits/${savedRasmId}/${versionId}.docx`;
      const uploadedDocx = await uploadBufferToDocumentsBucket({
        path: docxPath,
        buffer: docxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

      let pdfBuffer: Buffer | null = null;
      try {
        const pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer });
        pdfBuffer = pdfRes.pdfBuffer;
      } catch {
        pdfBuffer = null;
      }

      let uploadedPdfUrl: string | null = null;
      let pdfPath: string | null = null;
      if (pdfBuffer) {
        pdfPath = `onlyoffice-edits/${savedRasmId}/${versionId}.pdf`;
        const uploadedPdf = await uploadBufferToDocumentsBucket({
          path: pdfPath,
          buffer: pdfBuffer,
          contentType: 'application/pdf',
          upsert: true,
        });
        uploadedPdfUrl = uploadedPdf.url;
      }

      // Replace previous draft artifacts (keep judge attachments immutable).
      const { data: previousDrafts } = await supabase
        .from('deed_attachments')
        .select('storage_path')
        .eq('record_type', 'saved_rasm')
        .eq('record_id', savedRasmId)
        .in('category', ['audit_draft_docx', 'audit_draft_pdf']);

      const oldPaths = (previousDrafts ?? [])
        .map((row: any) => String(row?.storage_path || '').trim())
        .filter(Boolean);
      if (oldPaths.length) {
        await supabase.storage.from('rasm-files').remove(oldPaths);
      }

      await supabase
        .from('deed_attachments')
        .delete()
        .eq('record_type', 'saved_rasm')
        .eq('record_id', savedRasmId)
        .in('category', ['audit_draft_docx', 'audit_draft_pdf']);

      await supabase.from('deed_attachments').insert([
        {
          record_id: savedRasmId,
          record_type: 'saved_rasm',
          category: 'audit_draft_docx',
          file_name: `onlyoffice-${versionId}.docx`,
          file_url: uploadedDocx.url,
          storage_path: docxPath,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size: docxBuffer.length,
          metadata: {
            source: 'onlyoffice',
            baseAttachmentId,
            versionId,
            forceSaveRequestId,
          },
        },
        ...(uploadedPdfUrl
          ? [
              {
                record_id: savedRasmId,
                record_type: 'saved_rasm',
                category: 'audit_draft_pdf',
                file_name: `onlyoffice-${versionId}.pdf`,
                file_url: uploadedPdfUrl,
                storage_path: pdfPath || '',
                mime_type: 'application/pdf',
                file_size: pdfBuffer?.length ?? null,
                metadata: {
                  source: 'onlyoffice',
                  baseAttachmentId,
                  isMainDocument: true,
                  documentRole: 'main',
                  versionId,
                  forceSaveRequestId,
                },
              },
            ]
          : []),
      ]);

      try {
        const nowIso = new Date().toISOString();
        const latestUrl = uploadedPdfUrl || uploadedDocx.url;
        const latestMimeType = uploadedPdfUrl
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const { data: existingRow } = await supabase
          .from('saved_rasms')
          .select('payload')
          .eq('id', savedRasmId)
          .maybeSingle();

        const payloadObj =
          existingRow?.payload && typeof existingRow.payload === 'object'
            ? (existingRow.payload as any)
            : {};

        const updatedPayload = {
          ...(payloadObj || {}),
          auditEditedArtifactUrl: latestUrl,
          auditEditedUpdatedAt: nowIso,
          latestDocumentUrl: latestUrl,
          latestDocumentMimeType: latestMimeType,
          latestDocumentVersionId: versionId,
          latestDocumentUpdatedAt: nowIso,
          latestForceSaveRequestId: forceSaveRequestId,
          latestSigningPdfUrl: uploadedPdfUrl || null,
          latestSigningPdfUpdatedAt: uploadedPdfUrl ? nowIso : ((payloadObj as any)?.latestSigningPdfUpdatedAt || null),
          latestMainDocumentCategory: uploadedPdfUrl ? 'audit_draft_pdf' : 'audit_draft_docx',
        };

        const updateSavedRasm = async (opts: { includeUpdatedAt: boolean; includeLatestDraftCols: boolean }) => {
          const patch: any = {
            payload: updatedPayload,
          };

          if (opts.includeLatestDraftCols) {
            patch.latest_draft_version_id = versionId;
            patch.latest_draft_docx_url = uploadedDocx.url;
            patch.latest_draft_sha256 = null;
            patch.latest_draft_updated_at = nowIso;
          }

          if (opts.includeUpdatedAt) {
            patch.updated_at = nowIso;
          }

          return await supabase.from('saved_rasms').update(patch).eq('id', savedRasmId);
        };

        let updateRes = await updateSavedRasm({ includeUpdatedAt: true, includeLatestDraftCols: true });
        if (updateRes.error) {
          updateRes = await updateSavedRasm({ includeUpdatedAt: false, includeLatestDraftCols: true });
          if (updateRes.error) {
            updateRes = await updateSavedRasm({ includeUpdatedAt: false, includeLatestDraftCols: false });
          }
        }

        if (updateRes.error) {
          fastify.log.warn(
            { savedRasmId, versionId, error: updateRes.error.message },
            'OnlyOffice callback could not refresh saved_rasms latest document pointer'
          );
        }
      } catch (e) {
        fastify.log.warn({ err: e, savedRasmId, versionId }, 'OnlyOffice callback latest-pointer refresh failed');
      }
    } catch (e) {
      // Best-effort: Never block DocumentServer on persistence issues.
      fastify.log.error({ err: e }, 'OnlyOffice callback failed');
    }

    return reply.send({ error: 0 });
  });
}
