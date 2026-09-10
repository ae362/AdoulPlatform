import crypto from 'crypto';
import { TRPCError } from '@trpc/server';
import { supabase } from '../../../../services/supabase';
import { sha256Hex, patchSchemaV1 } from '../../../../utils/auditDocPatch';
import { convertDocxToPdfViaLibreOffice, convertPlainTextToPdfViaHtml } from '../../../../services/auditDocArtifacts';
import { uploadBufferToDocumentsBucket } from '../../../../utils/storage';
import { removeSavedRasmStorageByCategory } from '../../helpers';
import { generateDocxFromText, appendPlainTextToDocx } from '../../../../services/smartDrafting';

export async function finalizeSigningVersionForUser({
  user,
  versionId,
}: {
  user: { id: string; role: string };
  versionId: string;
}) {
  // Fast cache check: return existing finalized PDF if already generated for this versionId
  try {
    const { data: cachedPdfRows } = await supabase
      .from('deed_attachments')
      .select('id, file_url, metadata')
      .eq('category', 'audit_final_pdf')
      .order('created_at', { ascending: false })
      .limit(20);

    const cachedPdf = (cachedPdfRows ?? []).find((row: any) => {
      const metaVId = String(row?.metadata?.versionId || row?.metadata?.version_id || '').trim();
      return metaVId === versionId && row?.file_url;
    });

    if (cachedPdf?.file_url) {
      return {
        versionId,
        status: 'finalized' as const,
        finalPdfUrl: String(cachedPdf.file_url),
        finalDocxUrl: '',
        baseDocSha256: null,
        patchSha256: null,
        finalPdfSha256: String(cachedPdf?.metadata?.finalPdfSha256 || ''),
        finalDocxSha256: '',
      };
    }
  } catch {}
  const { data: version, error: versionError } = await supabase
    .from('audit_doc_versions')
    .select('id, saved_rasm_id, base_doc_url, base_doc_sha256, patch_json, patch_sha256')
    .eq('id', versionId)
    .single();

  if (versionError || !version) {
    const { data: onlyOfficeDrafts, error: onlyOfficeDraftsError } = await supabase
      .from('deed_attachments')
      .select('id, record_id, file_url, file_name, mime_type, metadata, created_at')
      .eq('record_type', 'saved_rasm')
      .eq('category', 'audit_draft_docx')
      .order('created_at', { ascending: false });

    if (onlyOfficeDraftsError) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
    }

    const onlyOfficeDraft = ((onlyOfficeDrafts ?? []) as any[]).find((row: any) => {
      const metaVersionId = String(row?.metadata?.versionId || row?.metadata?.version_id || '').trim();
      return metaVersionId === versionId;
    });

    if (!onlyOfficeDraft) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
    }

    const savedRasmId = String(onlyOfficeDraft.record_id || '').trim();
    const { data: existingRasm, error: rasmError } = await supabase
      .from('saved_rasms')
      .select('id, notary_user_id')
      .eq('id', savedRasmId)
      .single();
    if (rasmError || !existingRasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });
    if (user.role === 'notary' && existingRasm.notary_user_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    let docxBuffer: Buffer;
    try {
      const resp = await fetch(String(onlyOfficeDraft.file_url), { cache: 'no-store' as any });
      if (!resp.ok) throw new Error(`docx fetch failed (${resp.status})`);
      const ab = await resp.arrayBuffer();
      docxBuffer = Buffer.from(ab);
    } catch (e: any) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Failed to fetch OnlyOffice DOCX: ${e?.message || String(e)}` });
    }

    const finalDocxSha256 = sha256Hex(docxBuffer);

    let pdfRes: { pdfBuffer: Buffer };
    try {
      pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer });
    } catch (e: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Failed to convert OnlyOffice DOCX to signing PDF: ${e?.message || String(e)}`,
      });
    }

    const finalPdfSha256 = sha256Hex(pdfRes.pdfBuffer);
    const uploadedPdf = await uploadBufferToDocumentsBucket({
      path: `audit-final/${versionId}.pdf`,
      buffer: pdfRes.pdfBuffer,
      contentType: 'application/pdf',
      upsert: true,
    });

    try {
      const recordId = savedRasmId;
      await removeSavedRasmStorageByCategory(recordId, ['audit_final_pdf']);
      await supabase
        .from('deed_attachments')
        .delete()
        .eq('record_type', 'saved_rasm')
        .eq('record_id', recordId)
        .eq('category', 'audit_final_pdf');

      await supabase.from('deed_attachments').insert({
        record_id: recordId,
        record_type: 'saved_rasm',
        category: 'audit_final_pdf',
        file_name: `audit-final-${versionId}.pdf`,
        file_url: uploadedPdf.url,
        storage_path: `audit-final/${versionId}.pdf`,
        mime_type: 'application/pdf',
        file_size: pdfRes.pdfBuffer.length,
        metadata: {
          source: 'onlyoffice',
          versionId,
          derivedFromAttachmentId: String(onlyOfficeDraft.id || ''),
          finalPdfSha256,
        },
      });
    } catch {}

    return {
      versionId,
      status: 'finalized' as const,
      finalPdfUrl: uploadedPdf.url,
      finalDocxUrl: String(onlyOfficeDraft.file_url || ''),
      baseDocSha256: null,
      patchSha256: null,
      finalPdfSha256,
      finalDocxSha256,
    };
  }

  const { data: existingRasm, error: rasmError } = await supabase
    .from('saved_rasms')
    .select('id, notary_user_id')
    .eq('id', version.saved_rasm_id)
    .single();
  if (rasmError || !existingRasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });
  if (user.role === 'notary' && existingRasm.notary_user_id !== user.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
  }

  const parsedPatch = patchSchemaV1.safeParse(version.patch_json);
  if (!parsedPatch.success) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid patch_json in version record' });
  }

  let baseDocBytes: Buffer;
  let baseDocSha256: string | null = (version.base_doc_sha256 ?? null) as any;
  try {
    const resp = await fetch(String(version.base_doc_url), { cache: 'no-store' as any });
    if (!resp.ok) throw new Error(`base doc fetch failed (${resp.status})`);
    const ab = await resp.arrayBuffer();
    baseDocBytes = Buffer.from(ab);
    baseDocSha256 = sha256Hex(baseDocBytes);
  } catch (e: any) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Failed to fetch base DOCX: ${e?.message || String(e)}` });
  }

  const setPlainTextOp = parsedPatch.data.ops.find((op: any) => op.op === 'set_plain_text') as any;
  const appendPlainTextOp = parsedPatch.data.ops.find((op: any) => op.op === 'append_plain_text') as any;
  if (!setPlainTextOp && !appendPlainTextOp) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Patch v1 must include set_plain_text or append_plain_text' });
  }

  const trimmed =
    setPlainTextOp
      ? String(setPlainTextOp.value || '').trim()
      : String(appendPlainTextOp.value || '').trim();
  if (!trimmed) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Patched text is empty' });

  const docxBuffer = setPlainTextOp
    ? await generateDocxFromText(trimmed, baseDocBytes.toString('base64'), { mode: 'replace-body' })
    : await appendPlainTextToDocx(baseDocBytes, String(appendPlainTextOp.value || ''));
  const finalDocxSha256 = sha256Hex(docxBuffer);

  const uploadedDocx = await uploadBufferToDocumentsBucket({
    path: `audit-final/${version.id}.docx`,
    buffer: docxBuffer,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  });

  let pdfRes: { pdfBuffer: Buffer };
  try {
    pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer });
  } catch {
    const fallback = await convertPlainTextToPdfViaHtml({ text: trimmed, rtl: true });
    pdfRes = { pdfBuffer: fallback.pdfBuffer };
  }
  const finalPdfSha256 = sha256Hex(pdfRes.pdfBuffer);
  const uploadedPdf = await uploadBufferToDocumentsBucket({
    path: `audit-final/${version.id}.pdf`,
    buffer: pdfRes.pdfBuffer,
    contentType: 'application/pdf',
    upsert: true,
  });

  const { error: updateError } = await supabase
    .from('audit_doc_versions')
    .update({
      base_doc_sha256: baseDocSha256,
      final_docx_url: uploadedDocx.url,
      final_pdf_url: uploadedPdf.url,
      final_docx_sha256: finalDocxSha256,
      final_pdf_sha256: finalPdfSha256,
      status: 'finalized',
    })
    .eq('id', version.id);

  if (updateError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message });
  }

  try {
    const recordId = String(version.saved_rasm_id);
    await removeSavedRasmStorageByCategory(recordId, ['audit_final_pdf']);
    await supabase
      .from('deed_attachments')
      .delete()
      .eq('record_type', 'saved_rasm')
      .eq('record_id', recordId)
      .eq('category', 'audit_final_pdf');

    await supabase.from('deed_attachments').insert({
      record_id: recordId,
      record_type: 'saved_rasm',
      category: 'audit_final_pdf',
      file_name: `audit-final-${version.id}.pdf`,
      file_url: uploadedPdf.url,
      storage_path: `audit-final/${version.id}.pdf`,
      mime_type: 'application/pdf',
      file_size: pdfRes.pdfBuffer.length,
      metadata: {
        source: 'audit_doc_versions',
        versionId: version.id,
        baseDocSha256,
        patchSha256: version.patch_sha256 ?? null,
        finalPdfSha256,
      },
    });
  } catch {}

  return {
    versionId: version.id,
    status: 'finalized' as const,
    finalPdfUrl: uploadedPdf.url,
    finalDocxUrl: uploadedDocx.url,
    baseDocSha256,
    patchSha256: (version.patch_sha256 ?? null) as any,
    finalPdfSha256,
    finalDocxSha256,
  };
}

export async function finalizeDirectDocxForSavedRasm({
  user,
  savedRasmId,
  docxUrl,
  suppliedVersionId,
  attachmentId,
}: {
  user: { id: string; role: string };
  savedRasmId: string;
  docxUrl: string;
  suppliedVersionId?: string | null;
  attachmentId?: string | null;
}) {
  const { data: existingRasm, error: rasmError } = await supabase
    .from('saved_rasms')
    .select('id, notary_user_id')
    .eq('id', savedRasmId)
    .single();
  if (rasmError || !existingRasm) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved rasm not found' });
  if (user.role === 'notary' && existingRasm.notary_user_id !== user.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
  }

  let docxBuffer: Buffer;
  try {
    const resp = await fetch(String(docxUrl), { cache: 'no-store' as any });
    if (!resp.ok) throw new Error(`docx fetch failed (${resp.status})`);
    const ab = await resp.arrayBuffer();
    docxBuffer = Buffer.from(ab);
  } catch (e: any) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Failed to fetch DOCX: ${e?.message || String(e)}` });
  }

  let pdfRes: { pdfBuffer: Buffer };
  try {
    pdfRes = await convertDocxToPdfViaLibreOffice({ docxBuffer });
  } catch (e: any) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Failed to convert DOCX to signing PDF: ${e?.message || String(e)}`,
    });
  }

  const versionId = String(suppliedVersionId || crypto.randomUUID()).trim();
  const finalPdfSha256 = sha256Hex(pdfRes.pdfBuffer);
  const uploadedPdf = await uploadBufferToDocumentsBucket({
    path: `audit-final/${versionId}.pdf`,
    buffer: pdfRes.pdfBuffer,
    contentType: 'application/pdf',
    upsert: true,
  });

  try {
    await removeSavedRasmStorageByCategory(savedRasmId, ['audit_final_pdf']);
    await supabase
      .from('deed_attachments')
      .delete()
      .eq('record_type', 'saved_rasm')
      .eq('record_id', savedRasmId)
      .eq('category', 'audit_final_pdf');

    await supabase.from('deed_attachments').insert({
      record_id: savedRasmId,
      record_type: 'saved_rasm',
      category: 'audit_final_pdf',
      file_name: `audit-final-${versionId}.pdf`,
      file_url: uploadedPdf.url,
      storage_path: `audit-final/${versionId}.pdf`,
      mime_type: 'application/pdf',
      file_size: pdfRes.pdfBuffer.length,
      metadata: {
        source: 'direct_docx_finalize',
        versionId,
        derivedFromAttachmentId: attachmentId ? String(attachmentId) : null,
        finalPdfSha256,
      },
    });
  } catch {}

  return {
    versionId,
    finalPdfUrl: uploadedPdf.url,
  };
}

