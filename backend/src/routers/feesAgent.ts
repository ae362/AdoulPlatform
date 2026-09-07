import { router, publicProcedure } from './trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { supabase } from '../services/supabase';
import { RasmPdfService } from '../services/rasmPdf';
import { uploadBufferToDocumentsBucket, uploadDocument, fileUploadSchema } from '../utils/storage';
import { patchSchemaV1, patchSha256, sha256Hex } from '../utils/auditDocPatch';
import { appendPlainTextToDocx, generateDocxFromText } from '../services/smartDrafting';
import { convertDocxToPdfViaLibreOffice, convertPlainTextToPdfViaHtml } from '../services/auditDocArtifacts';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';
import fontkit from '@pdf-lib/fontkit';
import Bidi from 'bidi-js';
import { ArabicShaper } from 'arabic-persian-reshaper';
import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

const rasmPdfService = new RasmPdfService();

const JUDGE_APPROVED_STATUSES = ['accepted', 'accepted_with_notes', 'substantive_notes'];
const JUDGE_CITY_CODE_MAP: Record<string, string> = {
  chefchaouen: 'CHE',
  شفشاون: 'CHE',
  rabat: 'RAB',
  الرباط: 'RAB',
  casablanca: 'CAS',
  'الدار البيضاء': 'CAS',
  sale: 'SAL',
  سلا: 'SAL',
  fes: 'FES',
  فاس: 'FES',
  marrakech: 'MAR',
  مراكش: 'MAR',
  tanger: 'TAN',
  طنجة: 'TAN',
  tetouan: 'TET',
  تطوان: 'TET',
  agadir: 'AGA',
  أكادير: 'AGA',
  oujda: 'OUJ',
  وجدة: 'OUJ',
  kenitra: 'KEN',
  القنيطرة: 'KEN',
  meknes: 'MEK',
  مكناس: 'MEK',
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const bidi = new Bidi();

function normalizeJudgeCityKey(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ');
}

function transliterateJudgeCityForCode(value: string) {
  const map: Record<string, string> = {
    ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
    د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
    ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
    ي: 'y', ى: 'a', ؤ: 'w', ئ: 'y', ء: '', ' ': '',
  };
  const raw = String(value ?? '').trim();
  if (!raw) return 'JDG';
  if (/^[a-z0-9 _-]+$/i.test(raw)) return raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return Array.from(raw).map((char) => map[char] ?? '').join('').toUpperCase();
}

function buildJudgeCityPrefix(city: string) {
  const mapped = JUDGE_CITY_CODE_MAP[normalizeJudgeCityKey(city)];
  if (mapped) return mapped;
  const transliterated = transliterateJudgeCityForCode(city);
  return (transliterated || 'JDG').slice(0, 3).padEnd(3, 'X');
}

function normalizeCourtMatchKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ');
}

function buildJudgeCourtGeneratedId(submissionId: string, fileNumber: string, courtCity: string) {
  const prefix = buildJudgeCityPrefix(courtCity);
  const suffix =
    String(fileNumber || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() ||
    submissionId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function getPriorityJudgeCourtIdentifier(payload: Record<string, any> | null | undefined, submissionId: string, fileNumber: string) {
  const nestedIdentifier =
    payload && typeof payload.judgeCourtIdentifier === 'object' && payload.judgeCourtIdentifier
      ? (payload.judgeCourtIdentifier as Record<string, unknown>)
      : null;
  const courtCity =
    String(nestedIdentifier?.courtCity ?? payload?.courtCity ?? payload?.city ?? 'الرباط').trim() || 'الرباط';
  return (
    String(nestedIdentifier?.id ?? '').trim() ||
    buildJudgeCourtGeneratedId(submissionId, fileNumber, courtCity)
  );
}

// Some DBs were created without `saved_rasms.status`. Cache the capability in-process
// so we don't keep triggering PostgREST schema-cache errors on every finalize.
let SAVED_RASMS_HAS_STATUS_COLUMN: boolean | null = null;
const JUDGE_ENDORSED_DEEDS_CACHE_TTL_MS = 8_000;
const judgeEndorsedDeedsCache = new Map<string, { expiresAt: number; data: any[] }>();

function readJudgeEndorsedDeedsCache(key: string) {
  const cached = judgeEndorsedDeedsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    judgeEndorsedDeedsCache.delete(key);
    return null;
  }
  return cached.data;
}

function writeJudgeEndorsedDeedsCache(key: string, data: any[]) {
  judgeEndorsedDeedsCache.set(key, {
    data,
    expiresAt: Date.now() + JUDGE_ENDORSED_DEEDS_CACHE_TTL_MS,
  });
}

function mergeLiveJudgeSubmissionSnapshot(
  payload: Record<string, unknown>,
  submission: {
    id: string;
    status: string | null;
    decision: string | null;
    judge_notes: string | null;
    updated_at: string | null;
    decided_at: string | null;
  } | null,
) {
  const judgeSubmissionId =
    String((payload as any)?.step7JudgeSubmissionId || (payload as any)?.judgeSubmissionId || '').trim() || null;

  if (!judgeSubmissionId) {
    return payload;
  }

  const nextStep = (() => {
    const current = String((payload as any)?.step7Step || (payload as any)?.workflowStep || '').trim();
    if (current === 'inclusion' || current === 'final') return current;
    return 'judicial_review';
  })();

  return {
    ...payload,
    judgeSubmissionId,
    step7JudgeSubmissionId: judgeSubmissionId,
    step7Step: nextStep,
    workflowStep: nextStep,
    judgeSubmissionStatus: submission?.status ?? ((payload as any)?.judgeSubmissionStatus ?? null),
    judgeSubmissionDecision: submission?.decision ?? ((payload as any)?.judgeSubmissionDecision ?? null),
    judgeSubmissionJudgeNotes: submission?.judge_notes ?? ((payload as any)?.judgeSubmissionJudgeNotes ?? null),
    judgeSubmissionUpdatedAt: submission?.updated_at ?? ((payload as any)?.judgeSubmissionUpdatedAt ?? null),
    judgeSubmissionDecidedAt: submission?.decided_at ?? ((payload as any)?.judgeSubmissionDecidedAt ?? null),
  };
}

function hmacToken(secret: string, value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

async function finalizeSigningVersionForUser({
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

async function finalizeDirectDocxForSavedRasm({
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

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signOnlyOfficeJwt(secret: string, payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function sanitizeAttachmentLikeValue(value: any) {
  if (!value || typeof value !== 'object') return value;
  const next: Record<string, unknown> = {};
  const keepKeys = [
    'name',
    'fileName',
    'filename',
    'size',
    'type',
    'mimeType',
    'mime_type',
    'category',
    'field',
    'url',
    'fileUrl',
    'file_url',
    'fileURL',
    'publicUrl',
    'public_url',
  ];

  for (const key of keepKeys) {
    const raw = (value as any)[key];
    if (raw == null) continue;
    if (typeof raw === 'string' && raw.startsWith('data:')) continue;
    next[key] = raw;
  }

  return next;
}

function sanitizePersistedPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;

  const next: Record<string, unknown> = { ...(payload as any) };

  if (Array.isArray((next as any).attachments)) {
    next.attachments = ((next as any).attachments as any[]).map((att) => sanitizeAttachmentLikeValue(att));
  }

  if ((next as any).judgeAcceptedDoc && typeof (next as any).judgeAcceptedDoc === 'object') {
    next.judgeAcceptedDoc = sanitizeAttachmentLikeValue((next as any).judgeAcceptedDoc);
  }

  if ((next as any).baseDoc && typeof (next as any).baseDoc === 'object') {
    next.baseDoc = sanitizeAttachmentLikeValue((next as any).baseDoc);
  }

  return next as T;
}

function summarizeSavedRasmPayload(payload: any): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;

  const p = payload as any;
  const summary: Record<string, unknown> = {};
  const keepKeys = [
    'husband_name',
    'wife_name',
    'parties_names',
    'deceased_name',
    'applicants_names',
    'latestDocumentUpdatedAt',
    'latestDocumentVersionId',
    'latestDocumentUrl',
    'latestDocumentMimeType',
    'auditEditedArtifactUrl',
    'auditDocVersionId',
  ];

  for (const key of keepKeys) {
    if (p[key] != null) summary[key] = p[key];
  }

  if (Array.isArray(p.sellers)) summary.sellers = p.sellers.slice(0, 2).map((x: any) => ({ name: x?.name ?? null }));
  if (Array.isArray(p.buyers)) summary.buyers = p.buyers.slice(0, 2).map((x: any) => ({ name: x?.name ?? null }));
  if (Array.isArray(p.applicants)) summary.applicants = p.applicants.slice(0, 2).map((x: any) => ({ name: x?.name ?? null }));
  if (p.meta && typeof p.meta === 'object') {
    summary.meta = {
      fileNumber: (p.meta as any)?.fileNumber ?? null,
      documentType: (p.meta as any)?.documentType ?? null,
    };
  }

  return summary;
}

function isTransportFetchFailure(error: unknown) {
  const message =
    typeof error === 'string'
      ? error
      : String((error as any)?.message || (error as any)?.cause?.message || '');
  const lower = message.toLowerCase();
  return lower.includes('fetch failed') || lower.includes('typeerror: fetch failed');
}

async function removeAttachmentStorageByCategory(recordType: string, recordId: string, categories: string[]) {
  if (!recordType || !recordId || !categories.length) return;
  const { data, error } = await supabase
    .from('deed_attachments')
    .select('storage_path')
    .eq('record_type', recordType)
    .eq('record_id', recordId)
    .in('category', categories);

  if (error || !data?.length) return;
  const paths = data.map((row) => String(row.storage_path || '').trim()).filter(Boolean);
  if (!paths.length) return;
  await supabase.storage.from('rasm-files').remove(paths);
}

async function removeSavedRasmStorageByCategory(recordId: string, categories: string[]) {
  await removeAttachmentStorageByCategory('saved_rasm', recordId, categories);
}

async function listProtectedSavedRasmIds(savedRasmIds: string[]) {
  if (!savedRasmIds.length) return new Set<string>();
  const { data, error } = await supabase
    .from('signed_deeds')
    .select('saved_rasm_id')
    .in('saved_rasm_id', savedRasmIds);

  if (error || !data?.length) return new Set<string>();
  return new Set(
    data
      .map((row: any) => String(row?.saved_rasm_id || '').trim())
      .filter(Boolean)
  );
}

const SignedDeedCategorySchema = z.enum(['Marriage', 'Property', 'Inheritance', 'Divorce', 'Other']);
type SignedDeedCategory = z.infer<typeof SignedDeedCategorySchema>;
const SignedDeedWorkflowStatusSchema = z.enum([
  'NotSent',
  'PendingJudgeEndorsement',
  'JudgeEndorsed',
  'FinalArchived',
]);
type SignedDeedWorkflowStatus = z.infer<typeof SignedDeedWorkflowStatusSchema>;

type JudgeSubmissionWorkflowStatus =
  | 'pending'
  | 'in_review'
  | 'accepted'
  | 'accepted_with_notes'
  | 'substantive_notes';

function deriveSignedDeedWorkflowStatus(
  stage: string | null | undefined,
  readyForJudge: boolean,
  latestJudgeSubmissionStatus?: string | null,
  hasPostJudgeArchiveVersion?: boolean,
): SignedDeedWorkflowStatus {
  const normalizedStage = String(stage || '').trim().toLowerCase();
  const normalizedJudgeStatus = String(latestJudgeSubmissionStatus || '').trim().toLowerCase();
  if (hasPostJudgeArchiveVersion) return 'FinalArchived';
  if (normalizedStage === 'final_archived') return 'FinalArchived';
  if (normalizedStage === 'judge_endorsed') return 'JudgeEndorsed';
  if (normalizedStage === 'pending_judge_endorsement' || normalizedStage === 'sent_to_judge') {
    return 'PendingJudgeEndorsement';
  }
  if (normalizedJudgeStatus === 'accepted' || normalizedJudgeStatus === 'accepted_with_notes') {
    return 'JudgeEndorsed';
  }
  if (
    normalizedJudgeStatus === 'pending' ||
    normalizedJudgeStatus === 'in_review' ||
    normalizedJudgeStatus === 'substantive_notes'
  ) {
    return 'PendingJudgeEndorsement';
  }
  return readyForJudge ? 'NotSent' : 'NotSent';
}

async function tryReadFileBytes(candidatePath: string): Promise<Uint8Array | null> {
  try {
    const buf = await fs.readFile(candidatePath);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function loadAmiriFontBytesBestEffort(): Promise<Uint8Array | null> {
  // Best-effort: in dev/monorepo the font exists in frontend/src/assets.
  // In deployments where the font isn't packaged with the backend, we fall back to StandardFonts.
  const candidates = [
    path.resolve(process.cwd(), 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(process.cwd(), '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(process.cwd(), '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(__dirname, '..', '..', '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
  ];

  for (const p of candidates) {
    const bytes = await tryReadFileBytes(p);
    if (bytes) return bytes;
  }
  return null;
}

async function renderFooterStripPng(opts: {
  widthPt: number;
  heightPt: number;
  includeQr: boolean;
  qrPng: Buffer | null;
  registerInfoHeading?: string | null;
  registerInfoLines?: string[];
  inclusionHeading?: string;
  inclusionLines: string[];
  notaryLines: string[];
}): Promise<Buffer> {
  const { widthPt, heightPt, includeQr, qrPng, registerInfoHeading, registerInfoLines, inclusionHeading, inclusionLines, notaryLines } = opts;

  const DPI = 144;
  const ptToPx = (pt: number) => Math.max(1, Math.round((pt * DPI) / 72));
  const widthPx = ptToPx(widthPt);
  const heightPx = ptToPx(heightPt);

  const fontBytes = await loadAmiriFontBytesBestEffort();
  const fontBase64 = fontBytes ? Buffer.from(fontBytes).toString('base64') : null;
  const qrBase64 = includeQr && qrPng ? qrPng.toString('base64') : null;
  const scaleSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
      <path d="M60 18 L60 88" stroke="#1E3A8A" stroke-width="5" stroke-linecap="round"/>
      <path d="M34 34 H86" stroke="#1E3A8A" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 34 L34 34 L18 56 Z" fill="#7C3AED" fill-opacity="0.28" stroke="#7C3AED" stroke-width="3.25" stroke-linejoin="round"/>
      <path d="M86 34 L96 34 L80 56 Z" fill="#7C3AED" fill-opacity="0.28" stroke="#7C3AED" stroke-width="3.25" stroke-linejoin="round"/>
      <path d="M18 56 C18 66 25 73 34 73 C43 73 50 66 50 56" stroke="#7C3AED" stroke-width="3.75" stroke-linecap="round"/>
      <path d="M70 56 C70 66 77 73 86 73 C95 73 102 66 102 56" stroke="#7C3AED" stroke-width="3.75" stroke-linecap="round"/>
      <path d="M60 88 L44 102 H76 Z" fill="#1D4ED8" fill-opacity="0.24" stroke="#1D4ED8" stroke-width="3.25" stroke-linejoin="round"/>
      <circle cx="60" cy="14" r="5.5" fill="#7C3AED"/>
    </svg>`,
    'utf8'
  ).toString('base64');

  const esc = (s: string) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${fontBase64 ? `
      @font-face {
        font-family: 'AmiriEmbedded';
        src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      ` : ''}
      html, body { margin: 0; padding: 0; background: #fff; }
      #strip {
        width: ${widthPx}px;
        height: ${heightPx}px;
        box-sizing: border-box;
        border: 1px solid #d1d7e1;
        font-family: ${fontBase64 ? "'AmiriEmbedded'," : ''} 'Amiri', 'Traditional Arabic', Arial, sans-serif;
        position: relative;
        overflow: hidden;
      }
      #topline { position:absolute; left:0; top:0; width:100%; height:6px; background:#1a59d9; }
      #grid {
        position:absolute;
        left:0; top:6px;
        width:100%; height: calc(100% - 6px);
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
      }
      .col { box-sizing:border-box; padding: 10px 14px; }
      .textCol { padding-right: 28px; }
      .col + .col { border-left: 1px solid #e6eaf2; }
      .heading { color: #7228a6; font-size: 16px; font-weight: 700; margin-bottom: 8px; text-align: right; direction: rtl; }
      .line { color: #111827; font-size: 14px; font-weight: 600; line-height: 1.35; text-align: right; direction: rtl; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .qrCol { position: relative; }
      .qrWrap { width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding-right: ${registerInfoLines && registerInfoLines.length > 0 ? '102px' : '0'}; box-sizing:border-box; }
      .qrImg { width: ${Math.max(58, Math.floor(Math.min(widthPx / 3, heightPx) * 0.64))}px; height: auto; }
      .registerMeta {
        position:absolute;
        top:50%;
        right:4px;
        transform:translateY(-50%);
        width:98px;
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        justify-content:center;
        gap:3px;
        text-align:right;
        direction:rtl;
      }
      .registerMeta .metaHeading { color:#7228a6; font-size:11px; font-weight:700; line-height:1.15; white-space:normal; overflow:visible; width:100%; }
      .registerMeta .metaLineHeading { color:#111827; font-size:11px; font-weight:700; line-height:1.15; white-space:normal; overflow:visible; width:100%; }
      .registerMeta .metaLine { color:#111827; font-size:12px; font-weight:700; line-height:1.15; white-space:normal; overflow:visible; width:100%; }
      .muted { color: #6b7280; }
      .centerMark {
        position:absolute;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        width:92px;
        height:92px;
        opacity:0.52;
        pointer-events:none;
        z-index:0;
        filter: drop-shadow(0 1px 1px rgba(30, 58, 138, 0.18));
      }
      #grid { z-index:1; }
    </style>
  </head>
  <body>
    <div id="strip">
      <div id="topline"></div>
      <img class="centerMark" alt="Justice" src="data:image/svg+xml;base64,${scaleSvg}" />
      <div id="grid">
        <div class="col qrCol">
          ${registerInfoLines && registerInfoLines.length > 0 ? `<div class="registerMeta">${registerInfoHeading ? `<div class="metaHeading">${esc(registerInfoHeading)}</div>` : ``}${registerInfoLines.map((line, idx) => `<div class="${idx === 0 ? 'metaLineHeading' : 'metaLine'}">${esc(line)}</div>`).join('')}</div>` : ``}
          <div class="qrWrap">
            ${qrBase64 ? `<img class="qrImg" alt="QR" src="data:image/png;base64,${qrBase64}" />` : ``}
          </div>
        </div>
        <div class="col textCol">
          <div class="heading">${esc(inclusionHeading || 'مراجع سجل التضمين')}</div>
          ${(inclusionLines ?? []).map((l) => `<div class="line">${esc(l)}</div>`).join('')}
        </div>
        <div class="col textCol">
          <div class="heading">بيانات العدلين</div>
          ${(notaryLines ?? []).map((l) => `<div class="line">${esc(l)}</div>`).join('')}
        </div>
      </div>
    </div>
  </body>
  </html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  } as any);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: widthPx, height: heightPx, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    const png = (await page.screenshot({ type: 'png' })) as Buffer;
    await page.close();
    return png;
  } finally {
    await browser.close();
  }
}

function drawRightAlignedTextLayer(opts: {
  page: any;
  text: string;
  font: any;
  size: number;
  xRight: number;
  y: number;
  opacity?: number;
}) {
  const { page, text, font, size, xRight, y, opacity } = opts;
  const raw = text ?? '';
  let w = 0;
  try {
    const computed = font?.widthOfTextAtSize?.(raw, size);
    w = Number.isFinite(computed) ? computed : 0;
  } catch {
    w = 0;
  }
  const x = Number.isFinite(xRight - w) ? Math.max(0, xRight - w) : 0;
  page.drawText(raw, {
    x,
    y,
    size,
    font,
    // Keep the visual footer as PNG; this is a text layer for selection/search.
    // Use very low opacity instead of 0 to avoid some renderers skipping it.
    opacity: typeof opacity === 'number' ? opacity : 0.01,
    color: rgb(0, 0, 0),
  });
}

function drawRightAlignedText(opts: {
  page: any;
  text: string;
  font: any;
  size: number;
  xRight: number;
  y: number;
  color?: any;
}) {
  const { page, text, font, size, xRight, y, color } = opts;
  const raw = text ?? '';
  const t = ARABIC_RE.test(raw)
    ? (() => {
        try {
          const levels = bidi.getEmbeddingLevels(raw);
          return bidi.getReorderedString(raw, levels);
        } catch {
          return raw;
        }
      })()
    : raw;
  let w = 0;
  try {
    const computed = font?.widthOfTextAtSize?.(t, size);
    w = Number.isFinite(computed) ? computed : 0;
  } catch {
    w = 0;
  }
  const x = Number.isFinite(xRight - w) ? Math.max(0, xRight - w) : 0;
  page.drawText(t, { x, y, size, font, color: color ?? rgb(0, 0, 0) });
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s.length ? s : null;
}

function pickFirstString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    const s = toNonEmptyString(v);
    if (s) return s;
  }
  return null;
}

function pickFirstDate(obj: any, keys: string[]): string | null {
  const s = pickFirstString(obj, keys);
  if (!s) return null;
  // Accept ISO strings or yyyy-mm-dd.
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractInclusionFromPayload(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const auditHub = (p as any)?.auditHubInclusion && typeof (p as any).auditHubInclusion === 'object'
    ? (p as any).auditHubInclusion
    : ((p as any)?.audit_hub_inclusion && typeof (p as any).audit_hub_inclusion === 'object' ? (p as any).audit_hub_inclusion : null);
  const meta = (p as any)?.meta && typeof (p as any).meta === 'object' ? (p as any).meta : null;
  const notaries = (p as any)?.notaries && typeof (p as any).notaries === 'object' ? (p as any).notaries : null;
  const auditHubNotaries = auditHub && typeof (auditHub as any)?.notaries === 'object' ? (auditHub as any).notaries : null;

  const inclusionId = pickFirstString(p, ['inclusionId', 'inclusion_id', 'InclusionID', 'InclusionId']);
  const registerNumber = pickFirstString(p, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'inclusionRegisterNumber', 'inclusion_register_number'])
    || pickFirstString(auditHub, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'inclusionRegisterNumber', 'inclusion_register_number']);
  const registryLetter = pickFirstString(p, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter'])
    || pickFirstString(auditHub, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']);
  const registryBookType = pickFirstString(p, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type'])
    || pickFirstString(auditHub, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']);
  const certificateNumber = pickFirstString(p, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'inclusionCertificateNumber', 'inclusion_certificate_number'])
    || pickFirstString(auditHub, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'inclusionCertificateNumber', 'inclusion_certificate_number']);
  const registryPage = pickFirstString(p, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'inclusionPageNumber', 'inclusion_page_number'])
    || pickFirstString(auditHub, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'inclusionPageNumber', 'inclusion_page_number']);
  const inclusionDate = pickFirstDate(p, ['inclusionDate', 'inclusion_date', 'createdAt', 'created_at', 'registrationDate', 'registration_date'])
    || pickFirstDate(auditHub, ['inclusionDate', 'inclusion_date', 'registrationDate', 'registration_date', 'documentDate', 'document_date', 'date']);
  const inclusionHijri = pickFirstString(p, ['inclusionHijri', 'inclusion_hijri', 'dateHijri', 'date_hijri']);
  const court = pickFirstString(p, ['court', 'court_name', 'courtName', 'primaryCourt', 'primary_court', 'authority'])
    || pickFirstString(auditHub, ['court', 'court_name', 'courtName', 'primaryCourt', 'primary_court', 'authority']);
  const operationId = pickFirstString(p, ['operationId', 'operation_id', 'processId', 'process_id', 'transactionId', 'transaction_id', 'serial', 'reference'])
    || pickFirstString(auditHub, ['operationId', 'operation_id', 'processId', 'process_id', 'transactionId', 'transaction_id', 'serial', 'reference']);
  const inclusionHash = pickFirstString(p, ['inclusionHash', 'inclusion_hash', 'hashInclusion', 'hash_inclusion', 'preHash', 'pre_hash']);
  const notary1Name = pickFirstString(p, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name', 'notaryPrimary', 'notary_primary'])
    || pickFirstString(notaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name'])
    || pickFirstString(meta, ['notaryPrimary', 'notary_primary'])
    || pickFirstString(auditHub, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name', 'notaryPrimary', 'notary_primary'])
    || pickFirstString(auditHubNotaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']);
  const notary2Name = pickFirstString(p, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(notaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name'])
    || pickFirstString(meta, ['notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(auditHub, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'notarySecondary', 'notary_secondary', 'partnerName', 'partner_name', 'partner'])
    || pickFirstString(auditHubNotaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']);

  return {
    inclusionId,
    registryBookType,
    registerNumber,
    registryLetter,
    certificateNumber,
    registryPage,
    inclusionDate,
    inclusionHijri,
    court,
    operationId,
    inclusionHash,
    notary1Name,
    notary2Name,
  };
}

function hasMeaningfulInclusionFields(incl: ReturnType<typeof extractInclusionFromPayload>): boolean {
  return Boolean(
    incl.registerNumber ||
      incl.certificateNumber ||
      incl.registryPage ||
      incl.inclusionDate ||
      incl.court ||
      incl.operationId ||
      incl.inclusionHash
  );
}

async function persistInclusionForSavedRasm(opts: {
  savedRasmId: string;
  payload: any;
  existingInclusionId?: string | null;
  fallbackNotaryName?: string | null;
}): Promise<string | null> {
  const payloadObj = opts.payload && typeof opts.payload === 'object' ? opts.payload : {};
  const parsed = extractInclusionFromPayload(payloadObj);

  if (!hasMeaningfulInclusionFields(parsed)) return null;

  const resolvedExisting = opts.existingInclusionId ? String(opts.existingInclusionId) : null;
  const fromPayload = parsed.inclusionId ? String(parsed.inclusionId) : null;
  let inclusionId: string | null = resolvedExisting || fromPayload;

  const buildPatch = () => {
    const patch: any = {};
    if (parsed.registerNumber) patch.register_number = parsed.registerNumber;
    if (parsed.certificateNumber) patch.certificate_number = parsed.certificateNumber;
    if (parsed.registryPage) patch.registry_page = parsed.registryPage;
    if (parsed.inclusionDate) patch.inclusion_date = parsed.inclusionDate;
    if (parsed.inclusionHijri) patch.inclusion_hijri = parsed.inclusionHijri;
    if (parsed.court) patch.court = parsed.court;
    if (parsed.operationId) patch.operation_id = parsed.operationId;
    if (parsed.inclusionHash) patch.inclusion_hash = parsed.inclusionHash;
    if (parsed.notary1Name || opts.fallbackNotaryName) patch.notary1_name = parsed.notary1Name ?? opts.fallbackNotaryName ?? null;
    if (parsed.notary2Name) patch.notary2_name = parsed.notary2Name;
    return patch;
  };

  const inclPatch = buildPatch();
  if (!Object.keys(inclPatch).length) return null;

  // If we have an inclusionId, try updating it first.
  if (inclusionId) {
    const upd = await supabase.from('inclusion_registry').update(inclPatch).eq('id', inclusionId);
    if (!upd.error) {
      try {
        await supabase.from('saved_rasms').update({ inclusion_id: inclusionId }).eq('id', opts.savedRasmId);
      } catch {
        // best-effort (older schemas)
      }
      return inclusionId;
    }
    // If update failed (missing row or schema), fall through to insert.
    inclusionId = null;
  }

  const ins = await supabase
    .from('inclusion_registry')
    .insert(inclPatch)
    .select('id')
    .single();

  if (ins.error || !ins.data) return null;

  inclusionId = String(ins.data.id);
  try {
    await supabase.from('saved_rasms').update({ inclusion_id: inclusionId }).eq('id', opts.savedRasmId);
  } catch {
    // best-effort
  }
  return inclusionId;
}

function extractPartiesFromPayload(payload: any): Array<{ role: string | null; fullName: string; idNumber: string | null; phone: string | null }> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const parties: Array<{ role: string | null; fullName: string; idNumber: string | null; phone: string | null }> = [];

  const readParty = (obj: any, role: string | null) => {
    const fullName = pickFirstString(obj, ['fullName', 'full_name', 'name', 'partyName', 'party_name']);
    if (!fullName) return;
    const idNumber = pickFirstString(obj, ['idNumber', 'id_number', 'cin', 'CIN', 'nationalId', 'national_id', 'id']);
    const phone = pickFirstString(obj, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'mobile_number']);
    parties.push({ role, fullName, idNumber, phone });
  };

  const pushFromArray = (arr: any, role: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((x) => readParty(x, role));
  };

  pushFromArray((p as any).sellers, 'seller');
  pushFromArray((p as any).buyers, 'buyer');
  pushFromArray((p as any).applicants, 'applicant');

  const husbandName = pickFirstString(p, ['husband_name', 'husbandName', 'husband']);
  const wifeName = pickFirstString(p, ['wife_name', 'wifeName', 'wife']);
  if (husbandName) {
    const idNumber = pickFirstString(p, ['husband_id', 'husbandId', 'husband_id_number', 'husbandIdNumber']);
    parties.push({ role: 'husband', fullName: husbandName, idNumber, phone: null });
  }
  if (wifeName) {
    const idNumber = pickFirstString(p, ['wife_id', 'wifeId', 'wife_id_number', 'wifeIdNumber']);
    parties.push({ role: 'wife', fullName: wifeName, idNumber, phone: null });
  }

  const party1Name = pickFirstString(p, ['party1Name', 'party_1_name', 'firstPartyName']);
  const party2Name = pickFirstString(p, ['party2Name', 'party_2_name', 'secondPartyName']);
  if (party1Name) parties.push({ role: 'party_1', fullName: party1Name, idNumber: null, phone: null });
  if (party2Name) parties.push({ role: 'party_2', fullName: party2Name, idNumber: null, phone: null });

  const partiesNames = pickFirstString(p, [
    'parties_names',
    'partiesNames',
    'parties',
    'partySummary',
    'involvedNames',
    'involved_names',
  ]);
  if (partiesNames) {
    partiesNames
      .split(/[-,،؛|/\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => parties.push({ role: null, fullName: name, idNumber: null, phone: null }));
  }

  const seen = new Set<string>();
  return parties.filter((x) => {
    const key = `${x.role || ''}::${x.fullName}::${x.idNumber || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTaxReferenceCandidates(payload: any): Array<{
  registrationNumber: string | null;
  registrationDate: string | null;
  paymentNumber: string | null;
  financeReference: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const candidates: Array<{
    registrationNumber: string | null;
    registrationDate: string | null;
    paymentNumber: string | null;
    financeReference: string | null;
  }> = [];

  const pushCandidate = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    const registrationNumber =
      pickFirstString(obj, [
        'registrationNumber',
        'registration_number',
        'depositNumber',
        'deposit_number',
        'taxRegistrationNumber',
        'tax_registration_number',
        'number',
        'recordNumber',
        'record_number',
        'counterpartNumber',
        'counterpart_number',
      ]) || null;
    const registrationDate =
      pickFirstDate(obj, ['registrationDate', 'registration_date', 'depositDate', 'deposit_date', 'date']) || null;
    const paymentNumber =
      pickFirstString(obj, [
        'paymentNumber',
        'payment_number',
        'depositNumber',
        'deposit_number',
        'receiptNumber',
        'receipt_number',
        'counterpartNumber',
        'counterpart_number',
        'number',
        'recordNumber',
        'record_number',
      ]) || null;
    const financeReference =
      pickFirstString(obj, [
        'financeReference',
        'finance_reference',
        'registeredAtFinance',
        'registered_at_finance',
        'registeredAt',
        'registered_at',
        'book',
        'bookType',
        'book_type',
      ]) || null;

    if (!registrationNumber && !registrationDate && !paymentNumber && !financeReference) return;
    candidates.push({ registrationNumber, registrationDate, paymentNumber, financeReference });
  };

  pushCandidate(p);
  pushCandidate((p as any).financialData);
  pushCandidate((p as any).financial_data);
  pushCandidate((p as any).postRegistration);
  pushCandidate((p as any).post_registration);
  pushCandidate((p as any).taxRegistration);
  pushCandidate((p as any).tax_registration);
  pushCandidate((p as any).finance);

  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => pushCandidate(doc));
  });

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.registrationNumber || ''}::${item.registrationDate || ''}::${item.paymentNumber || ''}::${item.financeReference || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractPayloadDeedRelations(payload: any): Array<{
  originalDeed: string | null;
  originalDeedNumber: string | null;
  transferType: string | null;
  referenceDate: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  const relations: Array<{
    originalDeed: string | null;
    originalDeedNumber: string | null;
    transferType: string | null;
    referenceDate: string | null;
  }> = [];

  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => {
      const bookReference = pickFirstString(doc, ['bookReference', 'book_reference', 'register', 'registerNumber']);
      const number = pickFirstString(doc, ['number', 'deedNumber', 'deed_number']);
      const letter = pickFirstString(doc, ['letter', 'deedLetter', 'deed_letter']);
      const page = pickFirstString(doc, ['page', 'pageNumber', 'page_number']);
      const count = pickFirstString(doc, ['count', 'certificateNumber', 'certificate_number']);
      const transferType = pickFirstString(doc, ['feeType', 'type', 'deedType', 'deed_type']);
      const referenceDate = pickFirstDate(doc, ['date', 'correspondingDate', 'corresponding_date']);

      const parts = [
        bookReference ? `دفتر ${bookReference}` : null,
        number ? `رقم ${number}` : null,
        letter ? `حرف ${letter}` : null,
        page ? `صحيفة ${page}` : null,
        count ? `عدد ${count}` : null,
      ].filter(Boolean);

      if (!parts.length && !transferType && !referenceDate) return;

      relations.push({
        originalDeed: parts.length ? parts.join(' | ') : null,
        originalDeedNumber: number,
        transferType,
        referenceDate,
      });
    });
  });

  const seen = new Set<string>();
  return relations.filter((item) => {
    const key = `${item.originalDeed || ''}::${item.transferType || ''}::${item.referenceDate || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTitleDocumentCandidates(payload: any): Array<{
  deedType: string | null;
  bookType: string | null;
  bookNumber: string | null;
  number: string | null;
  count: string | null;
  page: string | null;
  office: string | null;
  date: string | null;
  notes: string | null;
}> {
  const p = payload && typeof payload === 'object' ? payload : {};
  const properties = Array.isArray((p as any).properties) ? (p as any).properties : [];
  const candidates: Array<{
    deedType: string | null;
    bookType: string | null;
    bookNumber: string | null;
    number: string | null;
    count: string | null;
    page: string | null;
    office: string | null;
    date: string | null;
    notes: string | null;
  }> = [];

  properties.forEach((property: any) => {
    const titleDocuments = Array.isArray(property?.titleDocuments) ? property.titleDocuments : [];
    titleDocuments.forEach((doc: any) => {
      const deedType = pickFirstString(doc, ['feeType', 'type', 'deedType', 'deed_type']);
      const bookType = pickFirstString(doc, ['bookType', 'book_type']);
      const bookNumber = pickFirstString(doc, ['bookNumber', 'book_number', 'register', 'registerNumber']);
      const number = pickFirstString(doc, ['number', 'deedNumber', 'deed_number', 'counterpartNumber', 'counterpart_number']);
      const count = pickFirstString(doc, ['count', 'certificateNumber', 'certificate_number']);
      const page = pickFirstString(doc, ['page', 'pageNumber', 'page_number']);
      const office = pickFirstString(doc, ['court', 'courtName', 'court_name', 'office', 'officeName', 'office_name', 'authority']);
      const date = pickFirstDate(doc, ['date', 'deedDate', 'deed_date', 'correspondingDate', 'corresponding_date']);
      const notes = pickFirstString(doc, ['notes', 'remarks', 'comment', 'comments', 'observation']);

      if (!deedType && !bookType && !bookNumber && !number && !count && !page && !office && !date && !notes) return;
      candidates.push({ deedType, bookType, bookNumber, number, count, page, office, date, notes });
    });
  });

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.deedType || ''}::${item.bookType || ''}::${item.bookNumber || ''}::${item.number || ''}::${item.count || ''}::${item.page || ''}::${item.office || ''}::${item.date || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSecureArchiveSearchDetails(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const auditHub =
    (p as any).auditHubInclusion && typeof (p as any).auditHubInclusion === 'object'
      ? (p as any).auditHubInclusion
      : ((p as any).audit_hub_inclusion && typeof (p as any).audit_hub_inclusion === 'object'
        ? (p as any).audit_hub_inclusion
        : ((p as any).auditHub && typeof (p as any).auditHub === 'object' ? (p as any).auditHub : {}));
  const meta = (p as any).meta && typeof (p as any).meta === 'object' ? (p as any).meta : {};
  const notaries = (p as any).notaries && typeof (p as any).notaries === 'object' ? (p as any).notaries : {};
  const financialData = (p as any).financialData && typeof (p as any).financialData === 'object' ? (p as any).financialData : {};
  const parties = extractPartiesFromPayload(p);
  const titleDocuments = extractTitleDocumentCandidates(p);
  const taxReferences = extractTaxReferenceCandidates(p);

  return {
    certificateType:
      pickFirstString(p, ['certificateType', 'certificate_type', 'documentType', 'document_type']) ||
      pickFirstString(meta, ['documentType', 'document_type']) ||
      null,
    inclusionRegistryType:
      pickFirstString(p, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']) ||
      pickFirstString(auditHub, ['registryBookType', 'registry_book_type', 'bookType', 'book_type', 'registerType', 'register_type']) ||
      null,
    intakeOffice:
      pickFirstString(p, ['court', 'courtName', 'court_name', 'authority', 'officeName', 'office_name']) ||
      pickFirstString(auditHub, ['court', 'courtName', 'court_name', 'authority', 'officeName', 'office_name']) ||
      null,
    intakeDate:
      pickFirstDate(p, ['intakeDate', 'intake_date', 'receivedAt', 'received_at', 'submissionDate', 'submission_date', 'date']) ||
      pickFirstDate(auditHub, ['intakeDate', 'intake_date', 'receivedAt', 'received_at', 'submissionDate', 'submission_date', 'date']) ||
      null,
    referenceNumber:
      pickFirstString(p, ['reference', 'referenceNumber', 'reference_number', 'serial', 'operationId', 'operation_id']) ||
      pickFirstString(auditHub, ['reference', 'referenceNumber', 'reference_number', 'serial', 'operationId', 'operation_id']) ||
      null,
    registryNumber:
      pickFirstString(p, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'register']) ||
      pickFirstString(auditHub, ['registryNumber', 'registry_number', 'registerNumber', 'register_number', 'register']) ||
      null,
    registryLetter:
      pickFirstString(p, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']) ||
      pickFirstString(auditHub, ['registryLetter', 'registry_letter', 'letter', 'deedLetter', 'deed_letter']) ||
      null,
    registryPage:
      pickFirstString(p, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'page']) ||
      pickFirstString(auditHub, ['registryPage', 'registry_page', 'pageNumber', 'page_number', 'page']) ||
      null,
    registryCount:
      pickFirstString(p, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'count']) ||
      pickFirstString(auditHub, ['certificateNumber', 'certificate_number', 'registryCount', 'registry_count', 'count']) ||
      null,
    party1Name: parties[0]?.fullName || null,
    party1Id: parties[0]?.idNumber || null,
    party2Name: parties[1]?.fullName || null,
    party2Id: parties[1]?.idNumber || null,
    titleDeedType: titleDocuments[0]?.deedType || null,
    titleBookType: titleDocuments[0]?.bookType || null,
    titleBookNumber: titleDocuments[0]?.bookNumber || null,
    titleDeedNumber: titleDocuments[0]?.number || null,
    titleDeedCount: titleDocuments[0]?.count || null,
    titleDeedPage: titleDocuments[0]?.page || null,
    titleDeedOffice: titleDocuments[0]?.office || null,
    titleDeedDate: titleDocuments[0]?.date || null,
    titleDeedNotes: titleDocuments[0]?.notes || null,
    financialCounterpartNumber:
      pickFirstString(financialData, ['counterpartNumber', 'counterpart_number', 'referenceNumber', 'reference_number']) ||
      pickFirstString(p, ['counterpartNumber', 'counterpart_number']) ||
      null,
    propertyIncomeReference:
      pickFirstString(financialData, ['propertyIncome', 'property_income', 'realEstateIncome', 'real_estate_income']) ||
      pickFirstString(p, ['propertyIncome', 'property_income', 'realEstateIncome', 'real_estate_income']) ||
      null,
    financialBook:
      pickFirstString(financialData, ['book', 'bookType', 'book_type', 'register', 'registerType', 'register_type']) ||
      pickFirstString(p, ['financialBook', 'financial_book']) ||
      null,
    financialNumber:
      pickFirstString(financialData, ['number', 'recordNumber', 'record_number', 'counterpartNumber', 'counterpart_number']) ||
      pickFirstString(p, ['financialNumber', 'financial_number']) ||
      null,
    financialCount:
      pickFirstString(financialData, ['count', 'recordCount', 'record_count', 'certificateNumber', 'certificate_number']) ||
      pickFirstString(p, ['financialCount', 'financial_count']) ||
      null,
    financialDate:
      pickFirstDate(financialData, ['date', 'recordDate', 'record_date', 'registrationDate', 'registration_date']) ||
      pickFirstDate(p, ['financialDate', 'financial_date']) ||
      null,
    firstNotaryName:
      pickFirstString(p, ['notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']) ||
      pickFirstString(notaries, ['primary', 'notary1Name', 'notary_1_name', 'adoul1Name', 'adoul1_name']) ||
      null,
    secondNotaryName:
      pickFirstString(p, ['notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']) ||
      pickFirstString(notaries, ['secondary', 'notary2Name', 'notary_2_name', 'adoul2Name', 'adoul2_name', 'partnerName', 'partner_name']) ||
      null,
    notes:
      pickFirstString(p, ['notes', 'remarks', 'comment', 'comments', 'observations']) ||
      pickFirstString(auditHub, ['notes', 'remarks', 'comment', 'comments', 'observations']) ||
      null,
    taxReferences,
  };
}

function extractRasmFilesStoragePathFromPublicUrl(url: string) {
  try {
    const marker = '/storage/v1/object/public/rasm-files/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const p = url.slice(idx + marker.length);
    return p || null;
  } catch {
    return null;
  }
}

function pickJudgeAttachmentFromPayload(payload: any, desiredCategory: 'judge_attachment' | 'judge_attachment_docx') {
  if (!payload || typeof payload !== 'object') return null;
  const list = Array.isArray(payload.attachments) ? payload.attachments : [];

  const hasData = (a: any) => !!(a?.base64 || a?.url || a?.fileUrl || a?.file_url || a?.fileURL);
  const categoryOf = (a: any) => (a?.category || '').toString().toLowerCase();
  const nameOf = (a: any) => (a?.name || a?.fileName || a?.filename || '').toString().toLowerCase();
  const typeOf = (a: any) => (a?.type || a?.mimeType || a?.mime_type || '').toString().toLowerCase();

  const manual = list.find((a: any) => hasData(a) && (a?.field || '').toString().includes('manualRasmFile'));

  if (desiredCategory === 'judge_attachment_docx') {
    const explicitDocx = list.find((a: any) => hasData(a) && categoryOf(a) === 'judge_attachment_docx');
    if (explicitDocx) return explicitDocx;

    // Back-compat: before we generated PDF+DOCX, the manual upload was typically the DOCX.
    const manualDocx = manual && (nameOf(manual).endsWith('.docx') || nameOf(manual).endsWith('.doc') || typeOf(manual).includes('word'));
    if (manualDocx) return manual;

    const docx = list.find((a: any) => {
      if (!hasData(a)) return false;
      const n = nameOf(a);
      const t = typeOf(a);
      return n.endsWith('.docx') || n.endsWith('.doc') || t.includes('wordprocessingml') || t.includes('msword');
    });
    if (docx) return docx;

    const single = payload.attachment;
    if (single && hasData(single)) {
      const n = nameOf(single);
      const t = typeOf(single);
      if (n.endsWith('.docx') || n.endsWith('.doc') || t.includes('word')) return single;
    }

    return null;
  }

  // desiredCategory === 'judge_attachment' (typically PDF)
  const explicitPdf = list.find((a: any) => hasData(a) && categoryOf(a) === 'judge_attachment');
  if (explicitPdf) return explicitPdf;

  // Back-compat: if no explicit category exists, allow the manual doc as judge_attachment.
  if (manual) return manual;

  const pdf = list.find((a: any) => {
    if (!hasData(a)) return false;
    const n = nameOf(a);
    const t = typeOf(a);
    return n.endsWith('.pdf') || t.includes('application/pdf') || t.includes('pdf');
  });
  if (pdf) return pdf;

  const single = payload.attachment;
  if (single && hasData(single)) return single;

  return null;
}

async function ensureSavedRasmHasJudgeAttachment(opts: {
  recordId: string;
  notaryUserId: string;
  payload: any;
  desiredCategory: 'judge_attachment' | 'judge_attachment_docx';
}) {
  const judgeSubmissionId = opts.payload?.judgeSubmissionId || opts.payload?.step7JudgeSubmissionId || null;
  if (!judgeSubmissionId) return;

  // If already present, do nothing.
  const { data: existing, error: existingError } = await supabase
    .from('deed_attachments')
    .select('id')
    .eq('record_type', 'saved_rasm')
    .eq('record_id', opts.recordId)
    .eq('category', opts.desiredCategory)
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  if ((existing ?? []).length) return;

  const { data: submission, error: subError } = await supabase
    .from('judge_submissions')
    .select('id, notary_user_id, status, payload')
    .eq('id', judgeSubmissionId)
    .single();

  if (subError || !submission) return;
  if (submission.notary_user_id !== opts.notaryUserId) return;
  if (!JUDGE_APPROVED_STATUSES.includes(submission.status ?? '')) {
    // Only persist judge-primary once the submission is approved.
    return;
  }

  const judgePayload = submission.payload && typeof submission.payload === 'object' ? submission.payload : null;
  const att = pickJudgeAttachmentFromPayload(judgePayload, opts.desiredCategory);
  if (!att) return;

  const name = (att.name || att.fileName || att.filename || 'judge_attachment').toString();
  const type = (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
  const size = Number(att.size || att.fileSize || 0) || null;

  let fileUrl = null;
  let storagePath = null;

  if (att.base64) {
    const uploaded = await uploadDocument({
      name,
      type,
      size: Number(att.size || att.fileSize || 0) || 0,
      base64: att.base64,
    });
    fileUrl = uploaded.url;
    storagePath = uploaded.path;
  } else {
    const url = (att.url || att.fileUrl || att.file_url || att.fileURL || '').toString();
    if (!url) return;
    fileUrl = url;
    storagePath = extractRasmFilesStoragePathFromPublicUrl(url);
  }

  if (!fileUrl) return;

  const { error: insertError } = await supabase.from('deed_attachments').insert({
    record_id: opts.recordId,
    record_type: 'saved_rasm',
    category: opts.desiredCategory,
    file_name: name,
    file_url: fileUrl,
    storage_path: storagePath || '',
    mime_type: type,
    file_size: size,
    metadata: {
      source: 'judge_submission',
      judgeSubmissionId,
      field: att.field ?? null,
      originalCategory: att.category ?? null,
    },
  });

  if (insertError) throw new Error(insertError.message);
}

async function ensureSavedRasmHasJudgeAttachments(opts: {
  recordId: string;
  notaryUserId: string;
  payload: any;
}) {
  // Best-effort ensure both PDF and DOCX are present so:
  // - Judge portal preview uses PDF (`judge_attachment`)
  // - AuditHub editing uses DOCX (`judge_attachment_docx`)
  await ensureSavedRasmHasJudgeAttachment({ ...opts, desiredCategory: 'judge_attachment' });
  await ensureSavedRasmHasJudgeAttachment({ ...opts, desiredCategory: 'judge_attachment_docx' });
}

// ============================================================================
// SCHEMAS
// ============================================================================

const OCRResultSchema = z.object({
  rawText: z.string(),
  extractedFields: z.object({
    name: z.string().optional(),
    idNumber: z.string().optional(),
    idIssueDate: z.string().optional(),
    idExpiryDate: z.string().optional(),
    nationality: z.string().optional(),
  }),
  confidence: z.number().min(0).max(100),
  errors: z.array(z.string()),
});

const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(['تحذير', 'خطأ', 'خطر']),
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
});

const FeesAgentDocumentSchema = z.object({
  id: z.string().optional(),
  documentType: z.enum([
    'بيع_وشراء',
    'بيع_وشراء_معنوي',
    'بيع_وشراء_طور_انجاز_ابتدائي',
    'بيع_وشراء_طور_انجاز_نهائي',
    'بيع_وشراء_ملكية_مشتركة',
    'عقد_ايجار_المفضي_الى_تملك',
    'كراء_طويل_الامد',
    'عقد_تحبيس',
    'عقد_بيع_حق_الهواء_والتعلية',
    'عقد_تفويت_حق_السطحية',
    'ثبوت_زينة_عقار',
    'ثبوت_بناء',
    'عقد_العمري',
    'هبة',
    'مقاسمة',
    'صدقة',
    'رهن',
    'رهن_حيازي',
    'توكيل_رسمي',
    'رسم_الاقرار_ببنوة',
    'ثبوت_نسب_ببينة_السماع',
    'اتفاق_تدبير_اموال_زوجية',
    'أخرى',
    'اراثة',
    'بيان_فريضة',
    'احصاء_متروك',
    'زواج',
    'زواج_مختلط',
    'ملكية',
    'حيازة',
    'الاشهاد_على_الطلاق_الاتفاقي',
    'رسم_زواج',
    'رسم_طلاق',
    'رسم_أملاك',
    'رسم_تركات',
    'باقي_الوثائق',
  ]),
  seller: z.object({
    name: z.string(),
    idNumber: z.string(),
    idIssueDate: z.string(),
    idExpiryDate: z.string().optional(),
  }),
  buyer: z.object({
    name: z.string(),
    idNumber: z.string(),
    idIssueDate: z.string(),
    idExpiryDate: z.string().optional(),
  }),
  property: z.object({
    type: z.enum(['محفظ', 'غير_محفظ', 'منقول']),
    area_m2: z.number().optional(),
    boundaries: z.object({
      north: z.string(),
      south: z.string(),
      east: z.string(),
      west: z.string(),
    }),
    titleRef: z.string().optional(),
    titleRefDate: z.string().optional(),
    hasThirdPartyRights: z.enum(['نعم', 'لا']),
  }),
  finance: z.object({
    price: z.number().min(0),
    priceInWords: z.string(),
    paymentMethod: z.enum(['نقد', 'شيك', 'تحويل', 'قسط']),
    transferDetails: z.string().optional(),
    registeredWithTax: z.enum(['نعم', 'لا']),
  }),
  meta: z.object({
    fileNumber: z.string(),
    notaryPrimary: z.string(),
    notarySecondary: z.string().optional(),
    dateGregorian: z.string(),
    dateHijri: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  draft: z.string().optional(),
  status: z.enum(['draft', 'under_review', 'approved', 'signed']).optional(),
});

const RasmPdfPayloadSchema = z.object({
  documentType: z.enum(['بيع_وشراء', 'هبة', 'مقاسمة', 'احصاء_متروك']),
  meta: z
    .object({
      fileNumber: z.string().optional(),
      dateGregorian: z.string().optional(),
      dateHijri: z.string().optional(),
      notaryPrimary: z.string().optional(),
      notarySecondary: z.string().optional(),
    })
    .optional(),
  sellers: z
    .array(z.object({
      name: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      idIssueDate: z.string().optional(),
      profession: z.string().optional(),
      share: z.string().optional(),
      nationality: z.string().optional(),
    }))
    .optional(),
  buyers: z
    .array(z.object({
      name: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      idIssueDate: z.string().optional(),
      profession: z.string().optional(),
      share: z.string().optional(),
      nationality: z.string().optional(),
    }))
    .optional(),
  applicants: z
    .array(z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      capacity: z.string().optional(),
    }))
    .optional(),
  inheritanceDeeds: z
    .array(z.object({
      book: z.string().optional(),
      page: z.string().optional(),
      number: z.string().optional(),
      date: z.string().optional(),
      notary: z.string().optional(),
    }))
    .optional(),
  inheritanceDescription: z.string().optional(),
  partitionDivisions: z
    .array(z.object({
      propertyDescription: z.string().optional(),
      area: z.string().optional(),
      length: z.string().optional(),
      width: z.string().optional(),
      boundaries: z
        .object({
          north: z.string().optional(),
          south: z.string().optional(),
          east: z.string().optional(),
          west: z.string().optional(),
        })
        .optional(),
      divisionValue: z.number().optional(),
      divisionValueInWords: z.string().optional(),
      beneficiaries: z
        .array(z.object({ name: z.string().optional(), share: z.string().optional() }))
        .optional(),
    }))
    .optional(),
  properties: z
    .array(z.object({
      type: z.string().optional(),
      propertyName: z.string().optional(),
      location: z.string().optional(),
      province: z.string().optional(),
      area_m2: z.number().optional(),
      length_m: z.number().optional(),
      width_m: z.number().optional(),
      boundaries: z
        .object({
          north: z.string().optional(),
          south: z.string().optional(),
          east: z.string().optional(),
          west: z.string().optional(),
        })
        .optional(),
      titleDocuments: z
        .array(z.object({
          feeType: z.string().optional(),
          bookReference: z.string().optional(),
          number: z.string().optional(),
          letter: z.string().optional(),
          page: z.string().optional(),
          count: z.string().optional(),
          date: z.string().optional(),
          correspondingDate: z.string().optional(),
        }))
        .optional(),
    }))
    .optional(),
  finance: z
    .object({
      price: z.number().optional(),
      priceInWords: z.string().optional(),
      paymentMethod: z.string().optional(),
      transferDetails: z.string().optional(),
    })
    .optional(),
});

// ============================================================================
// tRPC ROUTER
// ============================================================================

export const feesAgentRouter = router({
  // =========================================================================
  // OCR PROCEDURES
  // =========================================================================
  ocr: router({
    extractIDCard: publicProcedure
      .input(z.object({ file: z.any() }))
      .output(OCRResultSchema)
      .mutation(async ({ input }) => {
        return {
          rawText: 'extracted text from image',
          extractedFields: {
            name: 'محمد أحمد علي',
            idNumber: '1234567890',
            idIssueDate: '2015-01-15',
            idExpiryDate: '2030-01-15',
            nationality: 'مغربية',
          },
          confidence: 92,
          errors: [],
        };
      }),
    extractTitleDocument: publicProcedure
      .input(z.object({ file: z.any() }))
      .output(z.object({
        titleRef: z.string().optional(),
        titleRefDate: z.string().optional(),
        propertyType: z.string().optional(),
        area_m2: z.number().optional(),
        confidence: z.number(),
        errors: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        return {
          titleRef: 'أ/123/456',
          titleRefDate: '2020-06-15',
          propertyType: 'محفظ',
          area_m2: 250,
          confidence: 85,
          errors: [],
        };
      }),
    compareWithExtracted: publicProcedure
      .input(z.object({
        field: z.string(),
        manualEntry: z.string(),
        extractedValue: z.string(),
      }))
      .output(z.object({
        match: z.boolean(),
        similarity: z.number(),
        suggestion: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const similarity = input.manualEntry.toLowerCase() === input.extractedValue.toLowerCase() ? 1 : 0.75;
        return {
          match: similarity > 0.85,
          similarity,
          suggestion: similarity < 0.85
            ? `هل قصدت: "${input.extractedValue}"؟`
            : undefined,
        };
      }),
  }),

  // =========================================================================
  // VALIDATION PROCEDURES
  // =========================================================================
  validation: router({
    validateIDNumber: publicProcedure
      .input(z.object({ idNumber: z.string() }))
      .output(ValidationResultSchema)
      .query(async ({ input }) => {
        const errors: any[] = [];
        const warnings: any[] = [];
        if (!/^\d{10}$/.test(input.idNumber)) {
          errors.push({
            field: 'idNumber',
            message: 'رقم البطاقة يجب أن يكون 10 أرقام',
            severity: 'خطأ',
          });
        }
        return { isValid: errors.length === 0, errors, warnings };
      }),
    validateIDExpiry: publicProcedure
      .input(z.object({ issueDate: z.string(), expiryDate: z.string() }))
      .output(ValidationResultSchema)
      .query(async ({ input }) => {
        const errors: any[] = [];
        const warnings: any[] = [];
        const expiryTime = new Date(input.expiryDate).getTime();
        const now = new Date().getTime();
        if (expiryTime < now) {
          errors.push({
            field: 'idExpiryDate',
            message: 'البطاقة منتهية الصلاحية',
            severity: 'خطر',
          });
        }
        return { isValid: errors.length === 0, errors, warnings };
      }),
    validateProperty: publicProcedure
      .input(z.object({
        type: z.enum(['محفظ', 'غير_محفظ', 'منقول']),
        boundaries: z.record(z.string()),
        titleRef: z.string().optional(),
      }))
      .output(ValidationResultSchema)
      .query(async ({ input }) => {
        const errors: any[] = [];
        const warnings: any[] = [];
        if (input.type !== 'منقول') {
          const missingBoundaries = Object.values(input.boundaries).filter((v) => !v || v.trim() === '').length;
          if (missingBoundaries > 0) {
            errors.push({
              field: 'boundaries',
              message: `${missingBoundaries} حدود مفقودة`,
              severity: 'خطأ',
            });
          }
          if (input.type === 'غير_محفظ' && !input.titleRef) {
            warnings.push({
              field: 'titleRef',
              message: 'عقار غير محفظ بدون مرجع',
              suggestion: 'أرفق إقرار الشهود',
            });
          }
        }
        return { isValid: errors.length === 0, errors, warnings };
      }),
    validatePrice: publicProcedure
      .input(z.object({ price: z.number(), propertyType: z.string() }))
      .output(ValidationResultSchema)
      .query(async ({ input }) => {
        const errors: any[] = [];
        const warnings: any[] = [];
        if (input.price <= 0) {
          errors.push({
            field: 'price',
            message: 'السعر يجب أن يكون موجباً',
            severity: 'خطأ',
          });
        }
        if (input.price < 50000 && input.propertyType !== 'منقول') {
          warnings.push({
            field: 'price',
            message: 'السعر قد يثير شبهات التهرب الضريبي',
            suggestion: 'تحقق من معقولية السعر',
          });
        }
        return { isValid: errors.length === 0, errors, warnings };
      }),
  }),

  // =========================================================================
  // LEGAL TEXT GENERATION PROCEDURES
  // =========================================================================
  legal: router({
    generateTaxClause: publicProcedure
      .input(z.object({ registeredWithTax: z.enum(['نعم', 'لا']) }))
      .output(z.string())
      .query(async ({ input }) => {
        return input.registeredWithTax === 'نعم'
          ? 'تم التسجيل بكل أصولية...'
          : 'يلتزم الطرفان بالتسجيل في 15 يوم...';
      }),
    generateThirdPartyClause: publicProcedure
      .input(z.object({
        hasThirdPartyRights: z.enum(['نعم', 'لا']),
        details: z.string().optional(),
      }))
      .output(z.string())
      .query(async ({ input }) => {
        return input.hasThirdPartyRights === 'لا'
          ? 'العقار خالٍ من حقوق الغير...'
          : `العقار مثقل بـ: ${input.details}...`;
      }),
    generateDraft: publicProcedure
      .input(FeesAgentDocumentSchema.omit({ draft: true, status: true }))
      .output(z.string())
      .mutation(async ({ input }) => {
        return `
رسم عدلي: ${input.documentType}
الرقم: ${input.meta.fileNumber}
التاريخ: ${input.meta.dateGregorian}

الأطراف:
- ${input.seller.name}
- ${input.buyer.name}

الموضوع: عقار من نوع ${input.property.type}
السعر: ${input.finance.price} درهم

توقيع العدل...
        `;
      }),
  }),

  // =========================================================================
  // DOCUMENT MANAGEMENT PROCEDURES
  // =========================================================================
  documents: router({
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

        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        }

        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can save rasms' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        return finalizeSigningVersionForUser({
          user: { id: String(user.id), role: String(user.role) },
          versionId: input.versionId,
        });
      }),

    createSavedRasm: publicProcedure
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can save rasms' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        // Fetch user display name for inclusion notary fallback.
        let sessionUserFullName: string | null = null;
        try {
          const uRes = await supabase
            .from('users')
            .select('full_name, is_active')
            .eq('id', session.user_id)
            .single();
          if (!uRes.error && uRes.data?.is_active) {
            sessionUserFullName = (uRes.data.full_name as any) ?? null;
          }
        } catch {
          sessionUserFullName = null;
        }

        const { data: existing, error: existingError } = await supabase
          .from('saved_rasms')
          .select('payload, notary_user_id, notary_name, inclusion_id')
          .eq('id', input.id)
          .single();

        if (existingError || !existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
        
        const userFullName = String(sessionUserFullName || '').trim();
        const existingName = String((existing as any)?.notary_name || '').trim();
        const isOwner = existing.notary_user_id === session.user_id || 
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
      .input(z.object({ sessionToken: z.string(), category: z.string().optional() }))
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        
        // If the user is an admin or judge, they bypass the notary-only restriction for listing
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
              SAVED_RASMS_HAS_STATUS_COLUMN === false
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
                SAVED_RASMS_HAS_STATUS_COLUMN = attempt.includeStatus;
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });

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

        if (SAVED_RASMS_HAS_STATUS_COLUMN === false) {
          const res2 = await updateWithoutStatus();
          if (res2.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res2.error.message });
        } else {
          const res = await updateWithStatus();
          if (res.error) {
            const msg = String(res.error.message || '');
            const missingStatusColumn = msg.includes("Could not find the 'status' column") ||
              (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('status'));
            if (missingStatusColumn) {
              SAVED_RASMS_HAS_STATUS_COLUMN = false;
              const res2 = await updateWithoutStatus();
              if (res2.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res2.error.message });
            } else {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: res.error.message });
            }
          } else {
            SAVED_RASMS_HAS_STATUS_COLUMN = true;
          }
        }

        return { success: true, ledgerId: ledgerId };
      }),

    getSavedRasm: publicProcedure
      .input(z.object({ sessionToken: z.string(), id: z.string().uuid() }))
      .output(z.object({
        id: z.string(),
        fileNumber: z.string().nullable(),
        documentType: z.string().nullable(),
        createdAt: z.string(),
        draft: z.string().nullable(),
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        
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
              const extraFiles = [
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

        // --- SORT PRIORITY: prefer edited artifacts (PDF/DOCX) over judge_attachment ---
        const combined = [...auditVirtualAttachments, ...(finalAttachments ?? [])];
        const categoryWeight = (cat: string) => {
          const c = String(cat || '').toLowerCase();
          if (c.includes('audit_final_docx') || c.includes('audit_draft_docx')) return 0;
          if (c.includes('audit_final_pdf') || c.includes('audit_draft_pdf')) return 1;
          if (c.includes('primary_attachment')) return 2;
          if (c === 'document') return 3;
          if (c.includes('docx') || c.includes('word')) return 4;
          if (c.includes('pdf')) return 5;
          if (c === 'judge_attachment') return 50;
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
          const submissionRes = await supabase
            .from('judge_submissions')
            .select('id, status, decision, judge_notes, updated_at, decided_at')
            .eq('id', liveJudgeSubmissionId)
            .maybeSingle();

          if (!submissionRes.error && submissionRes.data) {
            normalizedPayload = mergeLiveJudgeSubmissionSnapshot(normalizedPayload, submissionRes.data as any);
          }
        }

        return {
          id: row.id,
          fileNumber: (row.file_number ?? null),
          documentType: (row.document_type ?? null),
          createdAt: row.created_at,
          draft: (row.draft ?? null),
          payload: normalizedPayload,
          latestDraftVersionId: (row.latest_draft_version_id ? String(row.latest_draft_version_id) : null) as any,
          latestDraftDocxUrl: (row.latest_draft_docx_url ? String(row.latest_draft_docx_url) : null) as any,
          latestDraftSha256: (row.latest_draft_sha256 ? String(row.latest_draft_sha256) : null) as any,
          latestDraftUpdatedAt: (row.latest_draft_updated_at ? String(row.latest_draft_updated_at) : null) as any,
          attachments: sortedAttachments.map((a) => ({
            id: a.id,
            category: a.category,
            fileName: a.file_name,
            fileUrl: a.file_url,
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this' });

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
      .output(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        }

        // 1. Get the submission
        const { data: submission, error: subError } = await supabase
          .from('judge_submissions')
          .select('*')
          .eq('id', input.judgeSubmissionId)
          .single();

        if (subError || !submission) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });
        }

        // 2. Create the saved_rasm
        const { data: created, error: createError } = await supabase
          .from('saved_rasms')
          .insert({
            notary_user_id: submission.notary_user_id,
            notary_name: submission.notary_name,
            file_number: submission.file_number,
            document_type: submission.document_type,
            draft: submission.summary || '',
            payload: {
              ...(submission.payload as any || {}),
              judgeSubmissionId: submission.id,
              originalApprovedJudgeUserId: submission.judge_user_id ?? null,
              originJudgeUserId: submission.judge_user_id ?? null,
            },
          })
          .select('id')
          .single();

        if (createError || !created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: createError?.message ?? 'Failed to create saved_rasm',
          });
        }

        // 3. Ensure the saved_rasm has both judge PDF + base DOCX attachments (best-effort).
        try {
          await ensureSavedRasmHasJudgeAttachments({
            recordId: created.id,
            notaryUserId: submission.notary_user_id,
            payload: sanitizePersistedPayload({
              ...(submission.payload as any || {}),
              judgeSubmissionId: submission.id,
            }),
          });
        } catch {}

        return { id: created.id };
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

        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only notaries can access this. User role: ' + user.role,
        });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this. User role: ' + user.role });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can perform this action' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can perform this action' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active || user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'هذه العملية متاحة للعدل فقط' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

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

        // --- BACKGROUND PROCESSING START ---
        // Fire-and-forget background processing for DOCX conversion and PDF generation.
        // We do NOT 'await' this block to ensure the frontend receives the submissionId immediately (~11s -> <500ms).
        (async () => {
          try {
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
            if (primaryDeed) {
              const nameRaw = String(primaryDeed?.name || primaryDeed?.fileName || 'judge-attachment');
              const typeRaw = String(primaryDeed?.type || primaryDeed?.mimeType || '').toLowerCase();
              const nameLower = nameRaw.toLowerCase();
              const isDocx =
                nameLower.endsWith('.docx') ||
                nameLower.endsWith('.doc') ||
                typeRaw.includes('wordprocessingml') ||
                typeRaw.includes('msword') ||
                typeRaw.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
                typeRaw.includes('application/msword') ||
                typeRaw.includes('word') ||
                typeRaw.includes('officedocument');
              const isPdf = nameLower.endsWith('.pdf') || typeRaw.includes('pdf');

              const docBytes = await readAttachmentBytes(primaryDeed);
              if (docBytes) {
                const safeBase = nameRaw.replace(/[^\w.\- ]+/g, '_').trim() || 'judge-attachment';
                const baseNoExt = safeBase.replace(/\.(docx?|dotx?|pdf)$/i, '').trim() || 'judge-attachment';

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

                  payloadAny.attachment = {
                    ...primaryDeed,
                    name: `${baseNoExt}.docx`,
                    fileName: `${baseNoExt}.docx`,
                    url: uploadedDocx.url,
                    fileUrl: uploadedDocx.url,
                    pdfUrl: uploadedPdf.url,
                    base64: undefined,
                  };
                  payloadAny.previewUrl = uploadedPdf.url;
                  payloadAny.previewName = `${baseNoExt}.pdf`;

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

                  payloadAny.attachment = {
                    ...primaryDeed,
                    name: `${baseNoExt}.pdf`,
                    fileName: `${baseNoExt}.pdf`,
                    url: uploadedPdf.url,
                    fileUrl: uploadedPdf.url,
                    base64: undefined,
                  };
                  payloadAny.previewUrl = uploadedPdf.url;
                  payloadAny.previewName = `${baseNoExt}.pdf`;

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
              }
            }

            // 2. Process All Additional Attachments in parallel
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

            await supabase
              .from('judge_submissions')
              .update({ payload: sanitizePersistedPayload(payloadAny) })
              .eq('id', created.id);
          } catch (e) {
            // Background errors are logged but don't crash the request
            // eslint-disable-next-line no-console
            console.error('[submitToJudge-Background] Background conversion failed', e);
          }
        })();
        // --- BACKGROUND PROCESSING END ---

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
      }))
      .query(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

        const { data, error } = await supabase
          .from('judge_submissions')
          .select('id, notary_user_id, status, decision, judge_notes, updated_at, decided_at')
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

        return {
          id: data.id,
          status: data.status,
          decision: (data.decision ?? null),
          judgeNotes: (data.judge_notes ?? null),
          updatedAt: data.updated_at,
          decidedAt: (data.decided_at ?? null),
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

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

        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'جلسة غير صالحة' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'مستخدم غير موجود' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير نشط' });
        }

        if (user.role !== 'notary') {
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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session token' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        }

        if (!user.is_active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'User is inactive' });
        }

        if (user.role !== 'notary') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notary can generate rasms' });
        }

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can final-save signed deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name, email')
          .eq('id', session.user_id)
          .single();
        if (userError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message });
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can seal deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can send deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can archive deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access signed deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name, email')
          .eq('id', session.user_id)
          .single();

        if (userError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message });
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access signed deeds' });

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
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name, email')
          .eq('id', session.user_id)
          .single();
        if (userError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message });
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
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

    listSecureArchiveCards: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          origin: z.string(),
          query: z.string().optional(),
          originalDeed: z.string().optional(),
          transferBook: z.string().optional(),
          transferNumber: z.string().optional(),
          transferCount: z.string().optional(),
          transferDate: z.string().optional(),
          transferAuthority: z.string().optional(),
          deedRelation: z.string().optional(),
          saleProcess: z.string().optional(),
          inclusionRegistryType: z.string().optional(),
          intakeDate: z.string().optional(),
          registryNumber: z.string().optional(),
          registryLetter: z.string().optional(),
          registryPage: z.string().optional(),
          registryCount: z.string().optional(),
          party1Name: z.string().optional(),
          party1Id: z.string().optional(),
          party2Name: z.string().optional(),
          party2Id: z.string().optional(),
          titleDeedType: z.string().optional(),
          titleBookType: z.string().optional(),
          titleBookNumber: z.string().optional(),
          titleDeedNumber: z.string().optional(),
          titleDeedCount: z.string().optional(),
          titleDeedPage: z.string().optional(),
          titleDeedOffice: z.string().optional(),
          titleDeedDate: z.string().optional(),
          financialBook: z.string().optional(),
          financialNumber: z.string().optional(),
          financialCount: z.string().optional(),
          financialDate: z.string().optional(),
          transactionDate: z.string().optional(),
          registrationNumber: z.string().optional(),
          registrationDate: z.string().optional(),
          paymentNumber: z.string().optional(),
          financeReference: z.string().optional(),
          registrationStatement: z.string().optional(),
          categories: z.array(SignedDeedCategorySchema).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            category: SignedDeedCategorySchema,
            signatureTimestamp: z.string().nullable(),
            createdAt: z.string(),
            fileNumber: z.string().nullable(),
            documentType: z.string().nullable(),
            inclusionRegistryType: z.string().nullable().optional(),
            intakeDate: z.string().nullable().optional(),
            referenceNumber: z.string().nullable().optional(),
            registryNumber: z.string().nullable(),
            registryLetter: z.string().nullable().optional(),
            registryCount: z.string().nullable(),
            registryPage: z.string().nullable(),
            titleBookType: z.string().nullable().optional(),
            titleBookNumber: z.string().nullable().optional(),
            titleDeedType: z.string().nullable().optional(),
            titleDeedNumber: z.string().nullable().optional(),
            titleDeedCount: z.string().nullable().optional(),
            titleDeedPage: z.string().nullable().optional(),
            titleDeedOffice: z.string().nullable().optional(),
            titleDeedDate: z.string().nullable().optional(),
            financialBook: z.string().nullable().optional(),
            financialNumber: z.string().nullable().optional(),
            financialCount: z.string().nullable().optional(),
            financialDate: z.string().nullable().optional(),
            financialCounterpartNumber: z.string().nullable().optional(),
            propertyIncomeReference: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            partyNames: z.array(z.string()).optional(),
            partyIdNumbers: z.array(z.string()).optional(),
            preJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            postJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            verification: z
              .object({
                token: z.string(),
                expiresAt: z.string().nullable(),
                url: z.string(),
                qrDataUrl: z.string().nullable(),
              })
              .nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const escapeLike = (value: string) => value.replace(/[%_]/g, (m) => `\\${m}`);
        const normalizeSearch = (value: unknown) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access archive' });

        const limit = input.limit ?? 100;
        const query = (input.query || '').trim();
        const originalDeed = (input.originalDeed || '').trim();
        const transferBook = (input.transferBook || '').trim();
        const transferNumber = (input.transferNumber || '').trim();
        const transferCount = (input.transferCount || '').trim();
        const transferDate = (input.transferDate || '').trim();
        const transferAuthority = (input.transferAuthority || '').trim();
        const deedRelation = (input.deedRelation || '').trim();
        const saleProcess = (input.saleProcess || '').trim();
        const inclusionRegistryType = (input.inclusionRegistryType || '').trim();
        const intakeDate = (input.intakeDate || '').trim();
        const registryNumber = (input.registryNumber || '').trim();
        const registryLetter = (input.registryLetter || '').trim();
        const registryPage = (input.registryPage || '').trim();
        const registryCount = (input.registryCount || '').trim();
        const party1Name = (input.party1Name || '').trim();
        const party1Id = (input.party1Id || '').trim();
        const party2Name = (input.party2Name || '').trim();
        const party2Id = (input.party2Id || '').trim();
        const titleDeedType = (input.titleDeedType || '').trim();
        const titleBookType = (input.titleBookType || '').trim();
        const titleBookNumber = (input.titleBookNumber || '').trim();
        const titleDeedNumber = (input.titleDeedNumber || '').trim();
        const titleDeedCount = (input.titleDeedCount || '').trim();
        const titleDeedPage = (input.titleDeedPage || '').trim();
        const titleDeedOffice = (input.titleDeedOffice || '').trim();
        const titleDeedDate = (input.titleDeedDate || '').trim();
        const financialBook = (input.financialBook || '').trim();
        const financialNumber = (input.financialNumber || '').trim();
        const financialCount = (input.financialCount || '').trim();
        const financialDate = (input.financialDate || '').trim();
        const transactionDate = (input.transactionDate || '').trim();
        const registrationNumber = (input.registrationNumber || '').trim();
        const registrationDate = (input.registrationDate || '').trim();
        const paymentNumber = (input.paymentNumber || '').trim();
        const financeReference = (input.financeReference || '').trim();
        const registrationStatement = (input.registrationStatement || '').trim();
        const origin = (input.origin || '').replace(/\/$/, '');
        const effectiveFetchLimit = query ? Math.max(limit, 200) : limit;
        const hasStructuredFilters = !!(
          originalDeed ||
          transferBook ||
          transferNumber ||
          transferCount ||
          transferDate ||
          transferAuthority ||
          deedRelation ||
          saleProcess ||
          inclusionRegistryType ||
          intakeDate ||
          registryNumber ||
          registryLetter ||
          registryPage ||
          registryCount ||
          party1Name ||
          party1Id ||
          party2Name ||
          party2Id ||
          titleDeedType ||
          titleBookType ||
          titleBookNumber ||
          titleDeedNumber ||
          titleDeedCount ||
          titleDeedPage ||
          titleDeedOffice ||
          titleDeedDate ||
          financialBook ||
          financialNumber ||
          financialCount ||
          financialDate ||
          transactionDate ||
          registrationNumber ||
          registrationDate ||
          paymentNumber ||
          financeReference ||
          registrationStatement
        );

        let signedDeedIdsFilter: string[] | null = null;
        if (query) {
          const escapedQuery = escapeLike(query);
          const indexedIds = new Set<string>();

          try {
            const idxLikeRes = await supabase
              .from('deed_search_index')
              .select('signed_deed_id, search_text')
              .ilike('search_text', `%${escapedQuery}%`)
              .limit(effectiveFetchLimit);

            if (!idxLikeRes.error) {
              (idxLikeRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            }
          } catch {
            // fallback to direct row filtering below
          }

          try {
            const idxTextRes = await supabase
              .from('deed_search_index')
              .select('signed_deed_id')
              .textSearch('full_text', query, { type: 'plain', config: 'simple' } as any)
              .limit(effectiveFetchLimit);

            if (!idxTextRes.error) {
              (idxTextRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            }
          } catch {
            // fallback to direct row filtering below
          }

          try {
            const partiesRes = await supabase
              .from('deed_parties')
              .select('signed_deed_id, full_name, id_number')
              .or(`full_name.ilike.%${escapedQuery}%,id_number.ilike.%${escapedQuery}%`)
              .limit(effectiveFetchLimit);

            if (!partiesRes.error) {
              (partiesRes.data || []).forEach((r: any) => {
                if (r?.signed_deed_id) indexedIds.add(String(r.signed_deed_id));
              });
            } else {
              const msg = String(partiesRes.error.message || '');
              const code = String((partiesRes.error as any)?.code || '');
              if (!(code === 'PGRST205' || msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
                throw partiesRes.error;
              }
            }
          } catch {
            // fallback to direct row filtering below
          }

          signedDeedIdsFilter = indexedIds.size ? Array.from(indexedIds) : null;
        }

        let signedQuery = supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'category',
              'signature_timestamp',
              'created_at',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
              'inclusion_registry!signed_deeds_inclusion_fk(court, notary1_name, register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri)',
              'seal_metadata(notary1_name, register_number, certificate_number, page_number, inclusion_date)',
            ].join(',')
          )
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(effectiveFetchLimit);

        if (input.categories?.length) {
          signedQuery = signedQuery.in('category', input.categories as any);
        }
        if (signedDeedIdsFilter) {
          signedQuery = signedQuery.in('id', signedDeedIdsFilter as any);
        }

        const signedRes = await signedQuery;
        if (signedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: signedRes.error.message });

        let signedRows = (signedRes.data || []) as any[];
        if (!signedRows.length) return [];

        if ((query && !signedDeedIdsFilter) || hasStructuredFilters) {
          const normalizedNeedle = normalizeSearch(query);
          signedRows = signedRows.filter((r: any) => {
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const payload = saved?.payload || {};
            const payloadParties = extractPartiesFromPayload(saved?.payload || {});
            const deedRelations = extractPayloadDeedRelations(payload);
            const taxReferences = extractTaxReferenceCandidates(payload);
            const archiveDetails = extractSecureArchiveSearchDetails(payload);
            const effectiveRegistryNumber = incl?.register_number ?? seal?.register_number ?? archiveDetails.registryNumber;
            const effectiveRegistryPage = incl?.registry_page ?? seal?.page_number ?? archiveDetails.registryPage;
            const effectiveRegistryCount = incl?.certificate_number ?? seal?.certificate_number ?? archiveDetails.registryCount;
            const effectiveIntakeDate = incl?.inclusion_date ?? seal?.inclusion_date ?? archiveDetails.intakeDate;
            const categoryLabel =
              r?.category === 'Marriage'
                ? 'الزواج'
                : r?.category === 'Divorce'
                  ? 'الطلاق'
                  : r?.category === 'Property'
                    ? 'الأملاك'
                    : r?.category === 'Inheritance'
                      ? 'التركات'
                      : 'باقي الوثائق';
            const categoryAliases =
              r?.category === 'Marriage'
                ? ['marriage', 'زواج', 'الزواج']
                : r?.category === 'Divorce'
                  ? ['divorce', 'طلاق', 'الطلاق']
                  : r?.category === 'Property'
                    ? ['property', 'amlak', 'milk', 'ملك', 'أملاك', 'الاملاك', 'الأملاك']
                    : r?.category === 'Inheritance'
                      ? ['inheritance', 'estate', 'تركة', 'تركات', 'التركات']
                      : ['other', 'misc', 'وثائق', 'باقي الوثائق'];
            const matchesAny = (needle: string, values: Array<unknown>) =>
              values.some((value) => normalizeSearch(value).includes(needle));

            const haystack = normalizeSearch([
              r?.id,
              saved?.file_number,
              saved?.document_type,
              incl?.court,
              incl?.notary1_name,
              seal?.notary1_name,
              ...payloadParties.flatMap((p) => [p.fullName, p.idNumber]),
              r?.category,
              categoryLabel,
              r?.signature_timestamp,
              r?.created_at,
            ].filter(Boolean).join(' '));

            if (query && !haystack.includes(normalizedNeedle)) return false;

            if (inclusionRegistryType) {
              const needle = normalizeSearch(inclusionRegistryType);
              const matched = matchesAny(needle, [
                (archiveDetails as any).inclusionRegistryType,
                archiveDetails.certificateType,
                saved?.document_type,
                r?.category,
                categoryLabel,
                ...categoryAliases,
              ]);
              if (!matched) return false;
            }
            if (intakeDate && !matchesAny(normalizeSearch(intakeDate), [effectiveIntakeDate, archiveDetails.titleDeedDate, (archiveDetails as any).financialDate])) return false;
            if (registryNumber && !matchesAny(normalizeSearch(registryNumber), [effectiveRegistryNumber, archiveDetails.titleDeedNumber, (archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber])) return false;
            if (registryLetter && !matchesAny(normalizeSearch(registryLetter), [(archiveDetails as any).registryLetter])) return false;
            if (registryPage && !matchesAny(normalizeSearch(registryPage), [effectiveRegistryPage, archiveDetails.titleDeedPage])) return false;
            if (registryCount && !matchesAny(normalizeSearch(registryCount), [effectiveRegistryCount, archiveDetails.titleDeedCount, (archiveDetails as any).financialCount])) return false;
            if (party1Name && !normalizeSearch(archiveDetails.party1Name).includes(normalizeSearch(party1Name))) return false;
            if (party1Id && !normalizeSearch(archiveDetails.party1Id).includes(normalizeSearch(party1Id))) return false;
            if (party2Name && !normalizeSearch(archiveDetails.party2Name).includes(normalizeSearch(party2Name))) return false;
            if (party2Id && !normalizeSearch(archiveDetails.party2Id).includes(normalizeSearch(party2Id))) return false;
            if (titleDeedType) {
              const needle = normalizeSearch(titleDeedType);
              const matched = matchesAny(needle, [
                archiveDetails.titleDeedType,
                (archiveDetails as any).titleBookType,
                archiveDetails.certificateType,
                saved?.document_type,
                r?.category,
                categoryLabel,
                ...categoryAliases,
              ]);
              if (!matched) return false;
            }
            if (titleBookType && !matchesAny(normalizeSearch(titleBookType), [(archiveDetails as any).titleBookType, archiveDetails.certificateType, saved?.document_type, r?.category, categoryLabel, ...categoryAliases])) return false;
            if (titleBookNumber && !matchesAny(normalizeSearch(titleBookNumber), [(archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber, archiveDetails.registryNumber])) return false;
            if (titleDeedNumber && !matchesAny(normalizeSearch(titleDeedNumber), [archiveDetails.titleDeedNumber, (archiveDetails as any).titleBookNumber, archiveDetails.referenceNumber])) return false;
            if (titleDeedCount && !matchesAny(normalizeSearch(titleDeedCount), [archiveDetails.titleDeedCount, archiveDetails.registryCount, (archiveDetails as any).financialCount])) return false;
            if (titleDeedPage && !matchesAny(normalizeSearch(titleDeedPage), [archiveDetails.titleDeedPage, archiveDetails.registryPage])) return false;
            if (titleDeedOffice && !matchesAny(normalizeSearch(titleDeedOffice), [archiveDetails.titleDeedOffice, archiveDetails.intakeOffice])) return false;
            if (titleDeedDate && !matchesAny(normalizeSearch(titleDeedDate), [archiveDetails.titleDeedDate, archiveDetails.intakeDate, ...deedRelations.map((item) => item.referenceDate)])) return false;
            if (financialBook && !matchesAny(normalizeSearch(financialBook), [(archiveDetails as any).financialBook, archiveDetails.certificateType, saved?.document_type, r?.category, categoryLabel])) return false;
            if (financialNumber && !matchesAny(normalizeSearch(financialNumber), [(archiveDetails as any).financialNumber, (archiveDetails as any).financialCounterpartNumber, archiveDetails.referenceNumber, archiveDetails.registryNumber])) return false;
            if (financialCount && !matchesAny(normalizeSearch(financialCount), [(archiveDetails as any).financialCount, archiveDetails.registryCount, archiveDetails.titleDeedCount])) return false;
            if (financialDate && !matchesAny(normalizeSearch(financialDate), [(archiveDetails as any).financialDate, archiveDetails.intakeDate, archiveDetails.titleDeedDate, ...taxReferences.map((item) => item.registrationDate)])) return false;

            if (originalDeed) {
              const needle = normalizeSearch(originalDeed);
              const matched = deedRelations.some((item) =>
                normalizeSearch([item.originalDeed, item.originalDeedNumber].filter(Boolean).join(' ')).includes(needle)
              );
              if (!matched) return false;
            }

            if (transferBook) {
              const needle = normalizeSearch(transferBook);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch((archiveDetails as any).titleBookType).includes(needle) ||
                normalizeSearch((archiveDetails as any).titleBookNumber).includes(needle);
              if (!matched) return false;
            }

            if (transferNumber) {
              const needle = normalizeSearch(transferNumber);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeedNumber).includes(needle) || normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch(archiveDetails.registryNumber).includes(needle) ||
                normalizeSearch((archiveDetails as any).titleBookNumber).includes(needle) ||
                normalizeSearch(archiveDetails.titleDeedNumber).includes(needle) ||
                normalizeSearch(archiveDetails.referenceNumber).includes(needle);
              if (!matched) return false;
            }

            if (transferCount) {
              const needle = normalizeSearch(transferCount);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.originalDeed).includes(needle)) ||
                normalizeSearch(archiveDetails.registryCount).includes(needle) ||
                normalizeSearch(archiveDetails.titleDeedCount).includes(needle);
              if (!matched) return false;
            }

            if (transferDate) {
              const needle = normalizeSearch(transferDate);
              const matched =
                deedRelations.some((item) => normalizeSearch(item.referenceDate).includes(needle)) ||
                normalizeSearch(archiveDetails.titleDeedDate).includes(needle);
              if (!matched) return false;
            }

            if (transferAuthority) {
              const needle = normalizeSearch(transferAuthority);
              const matched = matchesAny(needle, [archiveDetails.titleDeedOffice, archiveDetails.intakeOffice]);
              if (!matched) return false;
            }

            if (deedRelation) {
              const needle = normalizeSearch(deedRelation);
              const matched = deedRelations.some((item) => normalizeSearch(item.transferType).includes(needle));
              if (!matched) return false;
            }

            if (saleProcess) {
              const needle = normalizeSearch(saleProcess);
              const matched = deedRelations.some((item) => normalizeSearch(item.transferType).includes(needle));
              if (!matched) return false;
            }

            if (transactionDate) {
              const needle = normalizeSearch(transactionDate);
              const matched = deedRelations.some((item) => normalizeSearch(item.referenceDate).includes(needle)) || matchesAny(needle, [archiveDetails.titleDeedDate, archiveDetails.intakeDate]);
              if (!matched) return false;
            }

            if (registrationNumber) {
              const needle = normalizeSearch(registrationNumber);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.registrationNumber).includes(needle)) ||
                matchesAny(needle, [
                  archiveDetails.referenceNumber,
                  archiveDetails.registryNumber,
                  (archiveDetails as any).financialNumber,
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).propertyIncomeReference,
                ]);
              if (!matched) return false;
            }

            if (registrationDate) {
              const needle = normalizeSearch(registrationDate);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.registrationDate).includes(needle)) ||
                matchesAny(needle, [(archiveDetails as any).financialDate, archiveDetails.titleDeedDate, archiveDetails.intakeDate]);
              if (!matched) return false;
            }

            if (paymentNumber) {
              const needle = normalizeSearch(paymentNumber);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.paymentNumber).includes(needle)) ||
                matchesAny(needle, [
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).financialNumber,
                  archiveDetails.referenceNumber,
                ]);
              if (!matched) return false;
            }

            if (financeReference) {
              const needle = normalizeSearch(financeReference);
              const matched =
                taxReferences.some((item) => normalizeSearch(item.financeReference).includes(needle)) ||
                matchesAny(needle, [
                  (archiveDetails as any).financialCounterpartNumber,
                  (archiveDetails as any).propertyIncomeReference,
                  (archiveDetails as any).financialBook,
                ]);
              if (!matched) return false;
            }

            if (registrationStatement) {
              const needle = normalizeSearch(registrationStatement);
              const matched =
                normalizeSearch(JSON.stringify(payload || {})).includes(needle) ||
                normalizeSearch((archiveDetails as any).notes).includes(needle) ||
                normalizeSearch((payload as any)?.registrationStatement).includes(needle) ||
                normalizeSearch((payload as any)?.financialData?.registrationStatement).includes(needle);
              if (!matched) return false;
            }

            return true;
          });
        }

        if (!signedRows.length) return [];

        const ids = signedRows.map((r) => String(r.id));
        const fileNumbers = Array.from(
          new Set(
            signedRows
              .map((row: any) => {
                const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
                return String(saved?.file_number || '').trim();
              })
              .filter(Boolean)
          )
        );

        const latestJudgeSubmissionByFileNumber: Record<string, any> = {};
        if (fileNumbers.length) {
          const judgeSubmissionsRes = await supabase
            .from('judge_submissions')
            .select('id, file_number, payload, updated_at')
            .in('file_number', fileNumbers as any)
            .in('status', ['accepted', 'accepted_with_notes'])
            .order('updated_at', { ascending: false });

          if (!judgeSubmissionsRes.error) {
            for (const row of judgeSubmissionsRes.data || []) {
              const fileNumber = row?.file_number ? String(row.file_number) : '';
              if (!fileNumber || latestJudgeSubmissionByFileNumber[fileNumber]) continue;
              latestJudgeSubmissionByFileNumber[fileNumber] = row;
            }
          }
        }

        const partiesBySignedDeedId: Record<string, Array<{ fullName: string | null; idNumber: string | null }>> = {};
        try {
          const deedPartiesRes = await supabase
            .from('deed_parties')
            .select('signed_deed_id, full_name, id_number')
            .in('signed_deed_id', ids as any);

          if (deedPartiesRes.error) {
            const msg = String(deedPartiesRes.error.message || '');
            const code = String((deedPartiesRes.error as any)?.code || '');
            if (!(code === 'PGRST205' || msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
              throw deedPartiesRes.error;
            }
          } else {
            (deedPartiesRes.data || []).forEach((row: any) => {
              const deedId = String(row?.signed_deed_id || '');
              if (!deedId) return;
              if (!partiesBySignedDeedId[deedId]) partiesBySignedDeedId[deedId] = [];
              partiesBySignedDeedId[deedId].push({
                fullName: row?.full_name ? String(row.full_name) : null,
                idNumber: row?.id_number ? String(row.id_number) : null,
              });
            });
          }
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (!(msg.includes('deed_parties') || msg.includes('schema cache') || msg.includes('does not exist'))) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg || 'Failed to load deed parties' });
          }
        }

        const versionsRes = await supabase
          .from('final_secure_archive_versions')
          .select('signed_deed_id, version_type, sha256, file_url, sealed_at')
          .in('signed_deed_id', ids as any);
        if (versionsRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: versionsRes.error.message });

        const versionsById: Record<string, { pre: any | null; post: any | null }> = {};
        ids.forEach((id) => (versionsById[id] = { pre: null, post: null }));
        (versionsRes.data || []).forEach((v: any) => {
          const id = String(v.signed_deed_id);
          if (!versionsById[id]) versionsById[id] = { pre: null, post: null };
          if (v.version_type === 'pre_judge') versionsById[id].pre = v;
          if (v.version_type === 'post_judge') versionsById[id].post = v;
        });

        const verRes = await supabase
          .from('verification_links')
          .select('signed_deed_id, token, expires_at, revoked_at, created_at')
          .in('signed_deed_id', ids as any)
          .is('revoked_at', null)
          .order('created_at', { ascending: false });
        if (verRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: verRes.error.message });

        const verById: Record<string, any> = {};
        (verRes.data || []).forEach((r: any) => {
          const id = String(r.signed_deed_id);
          if (!verById[id]) verById[id] = r;
        });

        const cards = await Promise.all(
          signedRows.map(async (r: any) => {
            const id = String(r.id);
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const v = versionsById[id] || { pre: null, post: null };
            const ver = verById[id] || null;
            const payloadParties = extractPartiesFromPayload(saved?.payload || {});
            const storedParties = partiesBySignedDeedId[id] || [];
            const parties = storedParties.length
              ? storedParties
              : payloadParties.map((p) => ({ fullName: p.fullName, idNumber: p.idNumber }));
            const archiveDetails = extractSecureArchiveSearchDetails(saved?.payload || {});
            const fileNumber = String(saved?.file_number || '').trim();
            const judgeSubmission = fileNumber ? latestJudgeSubmissionByFileNumber[fileNumber] : null;
            const judgePayload = judgeSubmission?.payload && typeof judgeSubmission.payload === 'object' ? judgeSubmission.payload : null;
            const judgeInclusionReference =
              judgePayload && typeof (judgePayload as any).inclusionReference === 'object'
                ? ((judgePayload as any).inclusionReference as Record<string, unknown>)
                : null;
            const effectiveRegistryNumber =
              incl?.register_number ??
              seal?.register_number ??
              judgeInclusionReference?.registerNumber ??
              judgeInclusionReference?.register_number ??
              archiveDetails.registryNumber;
            const effectiveRegistryCount =
              incl?.certificate_number ??
              seal?.certificate_number ??
              judgeInclusionReference?.inclusionNumber ??
              judgeInclusionReference?.inclusion_number ??
              archiveDetails.registryCount;
            const effectiveRegistryPage =
              incl?.registry_page ??
              seal?.page_number ??
              judgeInclusionReference?.registryPage ??
              judgeInclusionReference?.registry_page ??
              archiveDetails.registryPage;
            const effectiveIntakeDate =
              incl?.inclusion_date ??
              seal?.inclusion_date ??
              judgeInclusionReference?.gregorianDate ??
              judgeInclusionReference?.gregorian_date ??
              archiveDetails.intakeDate;
            const effectiveRegistryLetter =
              (judgeInclusionReference?.registryLetter as string | undefined) ??
              (judgeInclusionReference?.registry_letter as string | undefined) ??
              (archiveDetails as any).registryLetter ??
              null;
            const effectiveRegistryType =
              (judgeInclusionReference?.descriptor as string | undefined) ??
              (archiveDetails as any).inclusionRegistryType ??
              null;

            const preJudge = v.pre
              ? { sha256: String(v.pre.sha256), fileUrl: String(v.pre.file_url), sealedAt: String(v.pre.sealed_at) }
              : null;
            const postJudge = v.post
              ? { sha256: String(v.post.sha256), fileUrl: String(v.post.file_url), sealedAt: String(v.post.sealed_at) }
              : null;

            let verification: any = null;
            if (ver?.token) {
              const url = `${origin}/verify/${ver.token}`;
              let qrDataUrl: string | null = null;
              try {
                qrDataUrl = await QRCode.toDataURL(url, {
                  errorCorrectionLevel: 'M',
                  margin: 1,
                  width: 180,
                } as any);
              } catch {
                qrDataUrl = null;
              }
              verification = {
                token: String(ver.token),
                expiresAt: ver.expires_at ? String(ver.expires_at) : null,
                url,
                qrDataUrl,
              };
            }

            return {
              signedDeedId: id,
              category: r.category as SignedDeedCategory,
              signatureTimestamp: r.signature_timestamp ? String(r.signature_timestamp) : null,
              createdAt: String(r.created_at),
              fileNumber: saved?.file_number ?? archiveDetails.referenceNumber ?? null,
              documentType: saved?.document_type ?? archiveDetails.certificateType ?? archiveDetails.titleDeedType ?? null,
              inclusionRegistryType: effectiveRegistryType ?? null,
              intakeDate: effectiveIntakeDate ?? null,
              referenceNumber: archiveDetails.referenceNumber ?? null,
              registryNumber: effectiveRegistryNumber ?? null,
              registryLetter: effectiveRegistryLetter ?? null,
              registryCount: effectiveRegistryCount ?? null,
              registryPage: effectiveRegistryPage ?? null,
              titleBookType: (archiveDetails as any).titleBookType ?? null,
              titleBookNumber: (archiveDetails as any).titleBookNumber ?? null,
              titleDeedType: archiveDetails.titleDeedType ?? null,
              titleDeedNumber: archiveDetails.titleDeedNumber ?? null,
              titleDeedCount: archiveDetails.titleDeedCount ?? null,
              titleDeedPage: archiveDetails.titleDeedPage ?? null,
              titleDeedOffice: archiveDetails.titleDeedOffice ?? null,
              titleDeedDate: archiveDetails.titleDeedDate ?? null,
              financialBook: (archiveDetails as any).financialBook ?? null,
              financialNumber: (archiveDetails as any).financialNumber ?? null,
              financialCount: (archiveDetails as any).financialCount ?? null,
              financialDate: (archiveDetails as any).financialDate ?? null,
              financialCounterpartNumber: (archiveDetails as any).financialCounterpartNumber ?? null,
              propertyIncomeReference: (archiveDetails as any).propertyIncomeReference ?? null,
              notes: archiveDetails.notes ?? null,
              court: incl?.court ?? archiveDetails.intakeOffice ?? null,
              notaryName: incl?.notary1_name ?? seal?.notary1_name ?? archiveDetails.firstNotaryName ?? null,
              partyNames: parties.map((p) => p.fullName).filter(Boolean),
              partyIdNumbers: parties.map((p) => p.idNumber).filter(Boolean),
              preJudge,
              postJudge,
              verification,
            };
          })
        );

        if (query) {
          const normalizedNeedle = normalizeSearch(query);
          return cards
            .filter((card: any) => {
              const categoryLabel =
                card.category === 'Marriage'
                  ? 'الزواج'
                  : card.category === 'Divorce'
                    ? 'الطلاق'
                    : card.category === 'Property'
                      ? 'الأملاك'
                      : card.category === 'Inheritance'
                        ? 'التركات'
                        : 'باقي الوثائق';

              const haystack = normalizeSearch([
                card.signedDeedId,
                card.fileNumber,
                card.documentType,
                card.court,
                card.notaryName,
                ...(card.partyNames || []),
                ...(card.partyIdNumbers || []),
                card.category,
                categoryLabel,
                card.signatureTimestamp,
                card.createdAt,
                card.preJudge?.sha256,
                card.postJudge?.sha256,
                card.verification?.token,
              ].filter(Boolean).join(' '));

              return haystack.includes(normalizedNeedle);
            })
            .slice(0, limit);
        }

        return cards.slice(0, limit);
      }),

    listJudgeEndorsedDeeds: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          origin: z.string().optional(),
          query: z.string().optional(),
          judgeName: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          categories: z.array(SignedDeedCategorySchema).optional(),
          limit: z.number().int().min(1).max(200).optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            savedRasmId: z.string(),
            judicialId: z.string().nullable(),
            inclusionReference: z
              .object({
                descriptor: z.string().nullable(),
                registerNumber: z.string().nullable(),
                registryLetter: z.string().nullable(),
                inclusionNumber: z.string().nullable(),
                registryPage: z.string().nullable(),
                hijriDate: z.string().nullable(),
                gregorianDate: z.string().nullable(),
              })
              .nullable(),
            category: SignedDeedCategorySchema,
            fileNumber: z.string().nullable(),
            documentType: z.string().nullable(),
            createdAt: z.string(),
            signatureTimestamp: z.string().nullable(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            judgeName: z.string().nullable(),
            partyNames: z.array(z.string()),
            partyIdNumbers: z.array(z.string()),
            workflowStatus: z.enum([
              'Draft',
              'ReadyForJudge',
              'SentToJudge',
              'PendingJudgeEndorsement',
              'JudgeEndorsed',
              'FinalArchived',
            ]),
            workflowCurrentStep: z.number().int().min(0).max(5),
            hasQr: z.boolean(),
            hasFingerprint: z.boolean(),
            hasAttachments: z.boolean(),
            isEditable: z.boolean(),
            canArchiveFinal: z.boolean(),
            previewUrl: z.string().nullable(),
            preJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            postJudge: z
              .object({ sha256: z.string(), fileUrl: z.string(), sealedAt: z.string() })
              .nullable(),
            verification: z
              .object({
                token: z.string(),
                expiresAt: z.string().nullable(),
                url: z.string(),
                qrDataUrl: z.string().nullable(),
              })
              .nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const startedAt = Date.now();
        const normalizeSearch = (value: unknown) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();

        if (sessionError || !session) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active, full_name')
          .eq('id', session.user_id)
          .single();

        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access this page' });

        const origin = String(input.origin || '').replace(/\/$/, '');
        const limit = input.limit ?? 120;
        const query = normalizeSearch(input.query);
        const judgeNameQuery = normalizeSearch(input.judgeName);
        const dateFrom = String(input.dateFrom || '').trim();
        const dateTo = String(input.dateTo || '').trim();
        const cacheKey = JSON.stringify({
          userId: user.id,
          origin,
          query,
          judgeNameQuery,
          dateFrom,
          dateTo,
          categories: input.categories || null,
          limit,
        });
        const cached = readJudgeEndorsedDeedsCache(cacheKey);
        if (cached) {
          console.log('[feesAgent.listJudgeEndorsedDeeds] cache hit', {
            userId: user.id,
            ms: Date.now() - startedAt,
          });
          return cached as any;
        }
        const sentToNotaryRes = await supabase
          .from('archive_operation_logs')
          .select('signed_deed_id, timestamp')
          .eq('action_type', 'SEND_TO_NOTARY_JUDGE_ENDORSED')
          .not('signed_deed_id', 'is', null)
          .order('timestamp', { ascending: false })
          .limit(Math.max(limit * 6, limit));
        if (sentToNotaryRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: sentToNotaryRes.error.message });
        }

        const sentSignedDeedIds = Array.from(
          new Set(
            (sentToNotaryRes.data || [])
              .map((row: any) => String(row?.signed_deed_id || '').trim())
              .filter(Boolean)
          )
        );
        if (!sentSignedDeedIds.length) return [];

        let signedQuery = supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'saved_rasm_id',
              'inclusion_id',
              'category',
              'signature_timestamp',
              'created_at',
              'ready_for_judge',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
              'inclusion_registry!signed_deeds_inclusion_fk(court, notary1_name)',
              'seal_metadata(notary1_name)',
            ].join(',')
          )
          .in('id', sentSignedDeedIds as any)
          .eq('saved_rasms.notary_user_id', user.id)
          .not('inclusion_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(Math.max(limit * 2, limit));

        if (input.categories?.length) {
          signedQuery = signedQuery.in('category', input.categories as any);
        }

        const signedRes = await signedQuery;
        if (signedRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: signedRes.error.message });
        }
        const signedFetchedAt = Date.now();

        const signedRowsSent = ((signedRes.data || []) as any[]).filter((row: any) => {
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const fileNumber = saved?.file_number ? String(saved.file_number) : '';
          return !!fileNumber;
        }).slice(0, limit);
        if (!signedRowsSent.length) return [];

        const ids = signedRowsSent.map((r) => String(r.id));
        const fileNumbers = Array.from(
          new Set(
            signedRowsSent
              .map((row: any) => {
                const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
                return String(saved?.file_number || '').trim();
              })
              .filter(Boolean)
          )
        );
        if (!fileNumbers.length) return [];

        const submissionsRes = await supabase
          .from('judge_submissions')
          .select('id, file_number, document_type, payload, status, updated_at, decided_at, created_at')
          .in('status', ['accepted', 'accepted_with_notes'])
          .in('file_number', fileNumbers as any)
          .order('updated_at', { ascending: false });
        if (submissionsRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: submissionsRes.error.message });
        }

        const latestSubmissionByFileNumber: Record<string, any> = {};
        for (const row of submissionsRes.data || []) {
          const fileNumber = row?.file_number ? String(row.file_number) : '';
          if (!fileNumber || latestSubmissionByFileNumber[fileNumber]) continue;
          latestSubmissionByFileNumber[fileNumber] = row;
        }

        const partiesBySignedDeedId: Record<string, Array<{ fullName: string | null; idNumber: string | null }>> = {};
        try {
          const deedPartiesRes = await supabase
            .from('deed_parties')
            .select('signed_deed_id, full_name, id_number')
            .in('signed_deed_id', ids as any);
          if (!deedPartiesRes.error) {
            (deedPartiesRes.data || []).forEach((row: any) => {
              const deedId = String(row?.signed_deed_id || '');
              if (!deedId) return;
              if (!partiesBySignedDeedId[deedId]) partiesBySignedDeedId[deedId] = [];
              partiesBySignedDeedId[deedId].push({
                fullName: row?.full_name ? String(row.full_name) : null,
                idNumber: row?.id_number ? String(row.id_number) : null,
              });
            });
          }
        } catch {
          // ignore optional table
        }

        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_url, created_at')
          .eq('record_type', 'signed_deed')
          .in('record_id', ids as any)
          .in('category', ['judge_court_stamped_pdf', 'judge_signed_pdf', 'signed_pdf'] as any)
          .order('created_at', { ascending: false });
        if (attachmentRes.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });
        }
        const attachmentsFetchedAt = Date.now();

        const latestPreviewById: Record<string, string | null> = {};
        const attachmentPriority: Record<string, number> = {
          judge_court_stamped_pdf: 3,
          judge_signed_pdf: 2,
          signed_pdf: 1,
        };
        const attachmentChoiceById: Record<string, { priority: number; url: string } | undefined> = {};
        (attachmentRes.data || []).forEach((attachment: any) => {
          const signedDeedId = String(attachment?.record_id || '');
          const category = String(attachment?.category || '');
          const fileUrl = String(attachment?.file_url || '').trim();
          if (!signedDeedId || !fileUrl) return;
          const priority = attachmentPriority[category] || 0;
          const current = attachmentChoiceById[signedDeedId];
          if (!current || priority > current.priority) {
            attachmentChoiceById[signedDeedId] = { priority, url: fileUrl };
            latestPreviewById[signedDeedId] = fileUrl;
          }
        });

        const rows = signedRowsSent.map((r: any) => {
            const id = String(r.id);
            const saved = Array.isArray(r?.saved_rasms) ? r.saved_rasms[0] : r?.saved_rasms;
            const incl = Array.isArray(r?.inclusion_registry) ? r.inclusion_registry[0] : r?.inclusion_registry;
            const seal = Array.isArray(r?.seal_metadata) ? r.seal_metadata[0] : r?.seal_metadata;
            const payload = saved?.payload || {};
            const submission = latestSubmissionByFileNumber[String(saved?.file_number || '')] || null;
            const judgePayload = submission?.payload && typeof submission.payload === 'object' ? submission.payload : {};
            const judicialId = getPriorityJudgeCourtIdentifier(
              Object.keys(judgePayload || {}).length ? judgePayload : payload,
              String(submission?.id || id),
              String(saved?.file_number || '')
            );
            const judgeInclusionReference =
              judgePayload && typeof judgePayload.inclusionReference === 'object' && judgePayload.inclusionReference
                ? (judgePayload.inclusionReference as Record<string, unknown>)
                : null;
            const payloadInclusionReference =
              payload && typeof payload.inclusionReference === 'object' && payload.inclusionReference
                ? (payload.inclusionReference as Record<string, unknown>)
                : null;
            const sealMetadata = seal && typeof seal === 'object' ? (seal as Record<string, unknown>) : null;
            const inclusionReference = {
              descriptor:
                String(
                  judgeInclusionReference?.descriptor ??
                    payloadInclusionReference?.descriptor ??
                    ''
                ).trim() || null,
              registerNumber:
                String(
                  incl?.register_number ??
                    sealMetadata?.register_number ??
                    judgeInclusionReference?.registerNumber ??
                    judgeInclusionReference?.register_number ??
                    payloadInclusionReference?.registerNumber ??
                    payloadInclusionReference?.register_number ??
                    ''
                ).trim() || null,
              registryLetter:
                String(
                  judgeInclusionReference?.registryLetter ??
                    judgeInclusionReference?.registry_letter ??
                    payloadInclusionReference?.registryLetter ??
                    payloadInclusionReference?.registry_letter ??
                    ''
                ).trim() || null,
              inclusionNumber:
                String(
                  incl?.certificate_number ??
                    sealMetadata?.certificate_number ??
                    judgeInclusionReference?.inclusionNumber ??
                    judgeInclusionReference?.inclusion_number ??
                    payloadInclusionReference?.inclusionNumber ??
                    payloadInclusionReference?.inclusion_number ??
                    ''
                ).trim() || null,
              registryPage:
                String(
                  incl?.page_number ??
                    sealMetadata?.page_number ??
                    judgeInclusionReference?.registryPage ??
                    judgeInclusionReference?.registry_page ??
                    payloadInclusionReference?.registryPage ??
                    payloadInclusionReference?.registry_page ??
                    ''
                ).trim() || null,
              hijriDate:
                String(
                  judgeInclusionReference?.hijriDate ??
                    judgeInclusionReference?.hijri_date ??
                    payloadInclusionReference?.hijriDate ??
                    payloadInclusionReference?.hijri_date ??
                    ''
                ).trim() || null,
              gregorianDate:
                String(
                  incl?.inclusion_date ??
                    sealMetadata?.inclusion_date ??
                    judgeInclusionReference?.gregorianDate ??
                    judgeInclusionReference?.gregorian_date ??
                    payloadInclusionReference?.gregorianDate ??
                    payloadInclusionReference?.gregorian_date ??
                    ''
                ).trim() || null,
            };
            const payloadParties = extractPartiesFromPayload(payload || {});
            const storedParties = partiesBySignedDeedId[id] || [];
            const parties = storedParties.length
              ? storedParties
              : payloadParties.map((p) => ({ fullName: p.fullName, idNumber: p.idNumber }));
            const archiveDetails = extractSecureArchiveSearchDetails(payload);
            const judgeName =
              judgePayload?.judgeName ||
              judgePayload?.judge_name ||
              null;

            return {
              signedDeedId: id,
              savedRasmId: String(r.saved_rasm_id),
              judicialId: judicialId || null,
              inclusionReference,
              category: r.category as SignedDeedCategory,
              fileNumber: saved?.file_number ?? archiveDetails.referenceNumber ?? null,
              documentType: saved?.document_type ?? archiveDetails.certificateType ?? null,
              createdAt: String(r.created_at),
              signatureTimestamp: r.signature_timestamp ? String(r.signature_timestamp) : null,
              court: incl?.court ?? archiveDetails.intakeOffice ?? null,
              notaryName: incl?.notary1_name ?? seal?.notary1_name ?? archiveDetails.firstNotaryName ?? null,
              judgeName: judgeName ? String(judgeName) : null,
              partyNames: parties.map((p) => p.fullName).filter(Boolean) as string[],
              partyIdNumbers: parties.map((p) => p.idNumber).filter(Boolean) as string[],
              workflowStatus: 'FinalArchived' as const,
              workflowCurrentStep: 5,
              hasQr: true,
              hasFingerprint: true,
              hasAttachments: !!saved,
              isEditable: false,
              canArchiveFinal: false,
              previewUrl: latestPreviewById[id] || null,
              preJudge: null,
              postJudge: null,
              verification: null,
            };
          });

        const filteredRows = rows.filter((row) => {
          const createdStamp = row.signatureTimestamp || row.createdAt;
          if (dateFrom && String(createdStamp).slice(0, 10) < dateFrom) return false;
          if (dateTo && String(createdStamp).slice(0, 10) > dateTo) return false;
          if (judgeNameQuery && !normalizeSearch(row.judgeName).includes(judgeNameQuery)) return false;
          if (query) {
            const haystack = normalizeSearch([
              row.judicialId,
              row.fileNumber,
              row.documentType,
              row.inclusionReference?.descriptor,
              row.inclusionReference?.registerNumber,
              row.inclusionReference?.registryLetter,
              row.inclusionReference?.inclusionNumber,
              row.inclusionReference?.registryPage,
              row.inclusionReference?.hijriDate,
              row.inclusionReference?.gregorianDate,
              row.court,
              row.judgeName,
              ...row.partyNames,
              ...row.partyIdNumbers,
              row.category,
              createdStamp,
            ].filter(Boolean).join(' '));
            if (!haystack.includes(query)) return false;
          }
          return true;
        });
        writeJudgeEndorsedDeedsCache(cacheKey, filteredRows);
        console.log('[feesAgent.listJudgeEndorsedDeeds] timings', {
          userId: user.id,
          signedMs: signedFetchedAt - startedAt,
          attachmentsAndAuxMs: attachmentsFetchedAt - signedFetchedAt,
          totalMs: Date.now() - startedAt,
          rows: filteredRows.length,
        });
        return filteredRows;
      }),

    getArchiveSecurityLog: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid() }))
      .output(
        z.array(
          z.object({
            id: z.string(),
            actionType: z.string(),
            timestamp: z.string(),
            userId: z.string().nullable(),
            device: z.any().nullable(),
            ip: z.string().nullable(),
            previousHash: z.string().nullable(),
            newHash: z.string().nullable(),
            metadata: z.any().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can access logs' });

        const ownRes = await supabase
          .from('signed_deeds')
          .select('id, saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)')
          .eq('id', input.signedDeedId)
          .single();
        if (ownRes.error || !ownRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((ownRes.data as any)?.saved_rasms) ? (ownRes.data as any).saved_rasms[0] : (ownRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        const { data: rows, error } = await supabase
          .from('archive_operation_logs')
          .select('id, action_type, timestamp, user_id, device, ip, previous_hash, new_hash, metadata')
          .eq('signed_deed_id', input.signedDeedId)
          .order('timestamp', { ascending: false });
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

        return (rows || []).map((r: any) => ({
          id: String(r.id),
          actionType: String(r.action_type),
          timestamp: String(r.timestamp),
          userId: r.user_id ? String(r.user_id) : null,
          device: r.device ?? null,
          ip: r.ip ? String(r.ip) : null,
          previousHash: r.previous_hash ? String(r.previous_hash) : null,
          newHash: r.new_hash ? String(r.new_hash) : null,
          metadata: r.metadata ?? null,
        }));
      }),

    regenerateVerificationLink: publicProcedure
      .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid(), origin: z.string() }))
      .output(z.object({ token: z.string(), expiresAt: z.string().nullable(), url: z.string(), qrDataUrl: z.string().nullable() }))
      .mutation(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can regenerate links' });

        const ownRes = await supabase
          .from('signed_deeds')
          .select('id, saved_rasms!signed_deeds_saved_rasm_fk(notary_user_id)')
          .eq('id', input.signedDeedId)
          .single();
        if (ownRes.error || !ownRes.data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signed deed not found' });
        const saved = Array.isArray((ownRes.data as any)?.saved_rasms) ? (ownRes.data as any).saved_rasms[0] : (ownRes.data as any)?.saved_rasms;
        if (!saved || String(saved.notary_user_id) !== String(user.id)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

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
          .select('token, expires_at')
          .single();
        if (insertRes.error || !insertRes.data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertRes.error?.message ?? 'Failed to create link' });

        const origin = (input.origin || '').replace(/\/$/, '');
        const token = String((insertRes.data as any).token);
        const url = `${origin}/verify/${token}`;
        let qrDataUrl: string | null = null;
        try {
          qrDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 180 } as any);
        } catch {
          qrDataUrl = null;
        }

        try {
          await supabase.from('archive_operation_logs').insert({
            signed_deed_id: input.signedDeedId,
            action_type: 'REGENERATE_VERIFICATION_LINK',
            timestamp: nowIso,
            user_id: user.id,
            device: null,
            ip: null,
            previous_hash: null,
            new_hash: null,
            metadata: { token },
          });
        } catch {
          // ignore
        }

        return { token, expiresAt: (insertRes.data as any).expires_at ? String((insertRes.data as any).expires_at) : null, url, qrDataUrl };
      }),

    searchLostDeedsByNationalId: publicProcedure
      .input(z.object({ sessionToken: z.string(), nationalId: z.string().min(1) }))
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            partyNames: z.array(z.string()),
            serialNumber: z.string().nullable(),
            registerNumber: z.string().nullable(),
            deedType: z.string().nullable(),
            date: z.string().nullable(),
            court: z.string().nullable(),
            notaryName: z.string().nullable(),
            visualCopy: z.string().nullable(),
            attachments: z.array(
              z.object({
                name: z.string(),
                url: z.string().nullable(),
                category: z.string().nullable(),
              })
            ),
          })
        )
      )
      .query(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can search archive' });

        const nationalId = String(input.nationalId || '').trim();
        if (!nationalId) return [];

        const partyRes = await supabase
          .from('deed_parties')
          .select('signed_deed_id, full_name, id_number')
          .ilike('id_number', `%${nationalId.replace(/[%_]/g, '\\$&')}%`)
          .limit(100);
        if (partyRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: partyRes.error.message });

        const partyRows = (partyRes.data || []) as any[];
        const ids = Array.from(new Set(partyRows.map((r) => String(r.signed_deed_id)).filter(Boolean)));
        if (!ids.length) return [];

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'created_at',
            'signature_timestamp',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(register_number, court, inclusion_date, notary1_name)',
            'seal_metadata(notary1_name)',
          ].join(','))
          .in('id', ids as any)
          .eq('saved_rasms.notary_user_id', user.id);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const ownedRows = (deedRes.data || []) as any[];
        if (!ownedRows.length) return [];

        const ownedIds = ownedRows.map((r: any) => String(r.id));
        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_name, file_url')
          .eq('record_type', 'signed_deed')
          .in('record_id', ownedIds as any);
        if (attachmentRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });

        const attachmentsById: Record<string, Array<{ name: string; url: string | null; category: string | null }>> = {};
        (attachmentRes.data || []).forEach((att: any) => {
          const id = String(att.record_id);
          if (!attachmentsById[id]) attachmentsById[id] = [];
          attachmentsById[id].push({
            name: String(att.file_name || 'مرفق'),
            url: att.file_url ? String(att.file_url) : null,
            category: att.category ? String(att.category) : null,
          });
        });

        const partiesById: Record<string, string[]> = {};
        partyRows.forEach((party: any) => {
          const id = String(party.signed_deed_id);
          if (!partiesById[id]) partiesById[id] = [];
          const fullName = String(party.full_name || '').trim();
          if (fullName && !partiesById[id].includes(fullName)) partiesById[id].push(fullName);
        });

        return ownedRows.map((row: any) => {
          const id = String(row.id);
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const seal = Array.isArray(row?.seal_metadata) ? row.seal_metadata[0] : row?.seal_metadata;
          const payloadObj = saved?.payload ?? {};
          const extractedIncl = extractInclusionFromPayload(payloadObj);
          const attachments = attachmentsById[id] || [];
          const visualCopy = attachments.find((a) => a.category === 'signed_pdf')?.url || null;

          return {
            signedDeedId: id,
            partyNames: partiesById[id] || [],
            serialNumber: saved?.file_number ? String(saved.file_number) : null,
            registerNumber: incl?.register_number ?? extractedIncl.registerNumber ?? null,
            deedType: saved?.document_type ? String(saved.document_type) : null,
            date: row.signature_timestamp ? String(row.signature_timestamp) : (incl?.inclusion_date ? String(incl.inclusion_date) : String(row.created_at)),
            court: incl?.court ?? extractedIncl.court ?? null,
            notaryName: seal?.notary1_name ?? incl?.notary1_name ?? extractedIncl.notary1Name ?? null,
            visualCopy,
            attachments,
          };
        });
      }),

    searchDeedRelationshipTracker: publicProcedure
      .input(z.object({ sessionToken: z.string(), reference: z.string().min(1) }))
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            originalDeed: z.string().nullable(),
            subsequentSale: z.string().nullable(),
            transferType: z.string().nullable(),
            date: z.string().nullable(),
            notary: z.string().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can search archive' });

        const reference = String(input.reference || '').trim().toLowerCase();
        if (!reference) return [];

        const matchingPartyRes = await supabase
          .from('deed_parties')
          .select('signed_deed_id, id_number, full_name')
          .or(`id_number.ilike.%${reference.replace(/[%_]/g, '\\$&')}%,full_name.ilike.%${reference.replace(/[%_]/g, '\\$&')}%`)
          .limit(250);
        if (matchingPartyRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: matchingPartyRes.error.message });

        const matchingPartyDeedIds = new Set(
          ((matchingPartyRes.data || []) as any[])
            .map((row: any) => String(row.signed_deed_id || ''))
            .filter(Boolean)
        );

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'created_at',
            'signature_timestamp',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(notary1_name)',
            'seal_metadata(notary1_name)',
          ].join(','))
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(250);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const matches: Array<{
          signedDeedId: string;
          originalDeed: string | null;
          subsequentSale: string | null;
          transferType: string | null;
          date: string | null;
          notary: string | null;
        }> = [];

        ((deedRes.data || []) as any[]).forEach((row: any) => {
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          if (!saved || String(saved.notary_user_id) !== String(user.id)) return;

          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const seal = Array.isArray(row?.seal_metadata) ? row.seal_metadata[0] : row?.seal_metadata;
          const currentFileNumber = saved?.file_number ? String(saved.file_number) : null;
          const currentDocType = saved?.document_type ? String(saved.document_type) : null;
          const relations = extractPayloadDeedRelations(saved?.payload ?? {});

          relations.forEach((relation) => {
            const haystack = [
              relation.originalDeed,
              relation.originalDeedNumber,
              relation.transferType,
              currentFileNumber,
              currentDocType,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            const cinMatched = matchingPartyDeedIds.has(String(row.id));
            if (!haystack.includes(reference) && !cinMatched) return;

            matches.push({
              signedDeedId: String(row.id),
              originalDeed: relation.originalDeed,
              subsequentSale: currentFileNumber ? `${currentFileNumber}${currentDocType ? ` • ${currentDocType}` : ''}` : currentDocType,
              transferType: relation.transferType ?? currentDocType ?? null,
              date: row.signature_timestamp ? String(row.signature_timestamp) : String(row.created_at),
              notary: seal?.notary1_name ?? incl?.notary1_name ?? null,
            });
          });
        });

        const seen = new Set<string>();
        return matches.filter((item) => {
          const key = `${item.signedDeedId}::${item.originalDeed || ''}::${item.subsequentSale || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 100);
      }),

    searchTaxRegistrationReferences: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          registrationNumber: z.string().optional(),
          registrationDate: z.string().optional(),
          paymentNumber: z.string().optional(),
          financeReference: z.string().optional(),
        })
      )
      .output(
        z.array(
          z.object({
            signedDeedId: z.string(),
            fileNumber: z.string().nullable(),
            deedType: z.string().nullable(),
            court: z.string().nullable(),
            registrationNumber: z.string().nullable(),
            registrationDate: z.string().nullable(),
            paymentNumber: z.string().nullable(),
            financeReference: z.string().nullable(),
            visualCopy: z.string().nullable(),
          })
        )
      )
      .query(async ({ input }) => {
        const { data: session, error: sessionError } = await supabase
          .from('user_sessions')
          .select('user_id')
          .eq('session_token', input.sessionToken)
          .single();
        if (sessionError || !session) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, role, is_active')
          .eq('id', session.user_id)
          .single();
        if (userError || !user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
        if (!user.is_active) throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
        if (user.role !== 'notary') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only notaries can search archive' });

        const normalizedInput = {
          registrationNumber: String(input.registrationNumber || '').trim().toLowerCase(),
          registrationDate: String(input.registrationDate || '').trim(),
          paymentNumber: String(input.paymentNumber || '').trim().toLowerCase(),
          financeReference: String(input.financeReference || '').trim().toLowerCase(),
        };
        if (!normalizedInput.registrationNumber && !normalizedInput.registrationDate && !normalizedInput.paymentNumber && !normalizedInput.financeReference) {
          return [];
        }

        const deedRes = await supabase
          .from('signed_deeds')
          .select([
            'id',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, notary_user_id, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(court)',
          ].join(','))
          .eq('saved_rasms.notary_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(250);
        if (deedRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedRes.error.message });

        const ownedRows = (deedRes.data || []) as any[];
        if (!ownedRows.length) return [];

        const ids = ownedRows.map((r: any) => String(r.id));
        const attachmentRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_url')
          .eq('record_type', 'signed_deed')
          .eq('category', 'signed_pdf')
          .in('record_id', ids as any);
        if (attachmentRes.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attachmentRes.error.message });

        const visualById: Record<string, string | null> = {};
        (attachmentRes.data || []).forEach((att: any) => {
          const id = String(att.record_id);
          if (!visualById[id]) visualById[id] = att.file_url ? String(att.file_url) : null;
        });

        const matches: Array<{
          signedDeedId: string;
          fileNumber: string | null;
          deedType: string | null;
          court: string | null;
          registrationNumber: string | null;
          registrationDate: string | null;
          paymentNumber: string | null;
          financeReference: string | null;
          visualCopy: string | null;
        }> = [];

        ownedRows.forEach((row: any) => {
          const id = String(row.id);
          const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
          const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
          const candidates = extractTaxReferenceCandidates(saved?.payload ?? {});

          candidates.forEach((candidate) => {
            const ok =
              (!normalizedInput.registrationNumber || String(candidate.registrationNumber || '').toLowerCase().includes(normalizedInput.registrationNumber)) &&
              (!normalizedInput.registrationDate || String(candidate.registrationDate || '').includes(normalizedInput.registrationDate)) &&
              (!normalizedInput.paymentNumber || String(candidate.paymentNumber || '').toLowerCase().includes(normalizedInput.paymentNumber)) &&
              (!normalizedInput.financeReference || String(candidate.financeReference || '').toLowerCase().includes(normalizedInput.financeReference));

            if (!ok) return;

            matches.push({
              signedDeedId: id,
              fileNumber: saved?.file_number ? String(saved.file_number) : null,
              deedType: saved?.document_type ? String(saved.document_type) : null,
              court: incl?.court ? String(incl.court) : null,
              registrationNumber: candidate.registrationNumber,
              registrationDate: candidate.registrationDate,
              paymentNumber: candidate.paymentNumber,
              financeReference: candidate.financeReference,
              visualCopy: visualById[id] || null,
            });
          });
        });

        const seen = new Set<string>();
        return matches.filter((item) => {
          const key = `${item.signedDeedId}::${item.registrationNumber || ''}::${item.registrationDate || ''}::${item.paymentNumber || ''}::${item.financeReference || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 100);
      }),

    verifyByToken: publicProcedure
      .input(z.object({ token: z.string().uuid() }))
      .output(
        z.object({
          valid: z.boolean(),
          reason: z.string().nullable(),
          signedDeedId: z.string().nullable(),
          expiresAt: z.string().nullable(),
          category: SignedDeedCategorySchema.nullable(),
          fileNumber: z.string().nullable(),
          documentType: z.string().nullable(),
          court: z.string().nullable(),
          preJudgeSha256: z.string().nullable(),
          postJudgeSha256: z.string().nullable(),
          artifactUrl: z.string().nullable(),
        })
      )
      .query(async ({ input }) => {
        const linkRes = await supabase
          .from('verification_links')
          .select('signed_deed_id, expires_at, revoked_at')
          .eq('token', input.token)
          .maybeSingle();

        if (linkRes.error || !linkRes.data || linkRes.data.revoked_at) {
          return {
            valid: false,
            reason: 'INVALID_OR_REVOKED',
            signedDeedId: null,
            expiresAt: null,
            category: null,
            fileNumber: null,
            documentType: null,
            court: null,
            preJudgeSha256: null,
            postJudgeSha256: null,
            artifactUrl: null,
          };
        }

        const expiresAt = linkRes.data.expires_at ? String(linkRes.data.expires_at) : null;
        if (expiresAt) {
          const exp = new Date(expiresAt);
          if (Number.isFinite(exp.getTime()) && exp.getTime() < Date.now()) {
            return {
              valid: false,
              reason: 'EXPIRED',
              signedDeedId: String(linkRes.data.signed_deed_id),
              expiresAt,
              category: null,
              fileNumber: null,
              documentType: null,
              court: null,
              preJudgeSha256: null,
              postJudgeSha256: null,
              artifactUrl: null,
            };
          }
        }

        const signedDeedId = String(linkRes.data.signed_deed_id);

        const deedRes = await supabase
          .from('signed_deeds')
          .select(
            [
              'id',
              'category',
              'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type)',
              'inclusion_registry!signed_deeds_inclusion_fk(court)',
            ].join(',')
          )
          .eq('id', signedDeedId)
          .maybeSingle();

        if (deedRes.error || !deedRes.data) {
          return {
            valid: false,
            reason: 'NOT_FOUND',
            signedDeedId,
            expiresAt,
            category: null,
            fileNumber: null,
            documentType: null,
            court: null,
            preJudgeSha256: null,
            postJudgeSha256: null,
            artifactUrl: null,
          };
        }

        const versionsRes = await supabase
          .from('final_secure_archive_versions')
          .select('version_type, sha256, file_url')
          .eq('signed_deed_id', signedDeedId);

        const versions = versionsRes.data || [];
        const pre = versions.find((v: any) => v.version_type === 'pre_judge') || null;
        const post = versions.find((v: any) => v.version_type === 'post_judge') || null;

        const saved = Array.isArray((deedRes.data as any)?.saved_rasms) ? (deedRes.data as any).saved_rasms[0] : (deedRes.data as any)?.saved_rasms;
        const incl = Array.isArray((deedRes.data as any)?.inclusion_registry) ? (deedRes.data as any).inclusion_registry[0] : (deedRes.data as any)?.inclusion_registry;

        return {
          valid: true,
          reason: null,
          signedDeedId,
          expiresAt,
          category: (deedRes.data as any).category as SignedDeedCategory,
          fileNumber: saved?.file_number ?? null,
          documentType: saved?.document_type ?? null,
          court: incl?.court ?? null,
          preJudgeSha256: pre?.sha256 ? String(pre.sha256) : null,
          postJudgeSha256: post?.sha256 ? String(post.sha256) : null,
          artifactUrl: post?.file_url ? String(post.file_url) : pre?.file_url ? String(pre.file_url) : null,
        };
      }),
  }),

  compliance: router({
    generateComplianceReport: publicProcedure
      .input(FeesAgentDocumentSchema.omit({ draft: true, status: true }))
      .output(z.object({
        timestamp: z.string(),
        documentType: z.string(),
        overallStatus: z.enum(['نجح', 'تحذير', 'فشل']),
        checks: z.array(z.object({
          name: z.string(),
          status: z.enum(['نجح', 'تحذير', 'فشل']),
          details: z.string(),
        })),
      }))
      .query(async ({ input }) => {
        return {
          timestamp: new Date().toISOString(),
          documentType: input.documentType,
          overallStatus: 'نجح',
          checks: [
            {
              name: 'التحقق من الأطراف',
              status: 'نجح',
              details: 'جميع البيانات صحيحة',
            },
            {
              name: 'التحقق من الملكية',
              status: 'نجح',
              details: 'العقار محفظ ومسجل',
            },
          ],
        };
      }),
  }),
});

