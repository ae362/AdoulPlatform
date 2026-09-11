import crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { rgb } from 'pdf-lib';
import Bidi from 'bidi-js';
import { supabase } from '../../services/supabase';
import { CacheService } from '../../services/cacheService';
import {
  ARABIC_RE,
  JUDGE_CITY_CODE_MAP,
} from './types';
import { deepSanitizeObject } from '../../utils/inputSanitizer';

const bidi = new Bidi();

export function normalizeJudgeCityKey(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ');
}

export function transliterateJudgeCityForCode(value: string): string {
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

export function buildJudgeCityPrefix(city: string): string {
  const mapped = JUDGE_CITY_CODE_MAP[normalizeJudgeCityKey(city)];
  if (mapped) return mapped;
  const transliterated = transliterateJudgeCityForCode(city);
  return (transliterated || 'JDG').slice(0, 3).padEnd(3, 'X');
}

export function normalizeCourtMatchKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ');
}

export function buildJudgeCourtGeneratedId(submissionId: string, fileNumber: string, courtCity: string): string {
  const prefix = buildJudgeCityPrefix(courtCity);
  const suffix =
    String(fileNumber || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() ||
    submissionId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getPriorityJudgeCourtIdentifier(
  payload: Record<string, any> | null | undefined,
  submissionId: string,
  fileNumber: string
): string {
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

const JUDGE_ENDORSED_DEEDS_CACHE_TTL_SEC = 15;

export const savedRasmsSchemaState = {
  hasStatusColumn: null as boolean | null,
};

export async function readJudgeEndorsedDeedsCache(key: string): Promise<any[] | null> {
  return CacheService.get<any[]>(`judge:endorsed:${key}`);
}

export async function writeJudgeEndorsedDeedsCache(key: string, data: any[]): Promise<void> {
  await CacheService.set(`judge:endorsed:${key}`, data, JUDGE_ENDORSED_DEEDS_CACHE_TTL_SEC);
}

export function hmacToken(secret: string, value: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function signOnlyOfficeJwt(secret: string, payload: Record<string, unknown>): string {
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('Security Error: A valid ONLYOFFICE_JWT_SECRET is required to sign document tokens');
  }
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

export function sanitizeAttachmentLikeValue(value: any): any {
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

export function sanitizePersistedPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;

  const sanitized = deepSanitizeObject(payload);
  const next: Record<string, unknown> = { ...(sanitized as any) };

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

export function summarizeSavedRasmPayload(payload: any): Record<string, unknown> | null {
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

export function isTransportFetchFailure(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : String((error as any)?.message || (error as any)?.cause?.message || '');
  const lower = message.toLowerCase();
  return lower.includes('fetch failed') || lower.includes('typeerror: fetch failed');
}

export async function removeAttachmentStorageByCategory(recordType: string, recordId: string, categories: string[]): Promise<void> {
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

export async function removeSavedRasmStorageByCategory(recordId: string, categories: string[]): Promise<void> {
  await removeAttachmentStorageByCategory('saved_rasm', recordId, categories);
}

export async function listProtectedSavedRasmIds(savedRasmIds: string[]): Promise<Set<string>> {
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

export async function tryReadFileBytes(candidatePath: string): Promise<Uint8Array | null> {
  try {
    const buf = await fs.readFile(candidatePath);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function loadAmiriFontBytesBestEffort(): Promise<Uint8Array | null> {
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

export async function renderFooterStripPng(opts: {
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

export function drawRightAlignedTextLayer(opts: {
  page: any;
  text: string;
  font: any;
  size: number;
  xRight: number;
  y: number;
  opacity?: number;
}): void {
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
    opacity: typeof opacity === 'number' ? opacity : 0.01,
    color: rgb(0, 0, 0),
  });
}

export function drawRightAlignedText(opts: {
  page: any;
  text: string;
  font: any;
  size: number;
  xRight: number;
  y: number;
  color?: any;
}): void {
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
