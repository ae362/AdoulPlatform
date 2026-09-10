import {
  JudgeDeedService,
  extractCourtCity,
  ListSubmissionsInputSchema,
  GetSubmissionInputSchema,
  DecideSubmissionInputSchema,
  JudgeSubmissionStatus,
  JudgeDecision,
} from '../services/JudgeDeedService';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { supabase } from '../services/supabase';
import { publicProcedure, router, resolveSessionUser } from './trpc';
import { CacheService } from '../services/cacheService';
import { uploadBufferToDocumentsBucket } from '../utils/storage';
import { PDFDocument } from 'pdf-lib';
import { sha256Hex } from '../utils/auditDocPatch';
import puppeteer from 'puppeteer';
import Bidi from 'bidi-js';
import { ArabicShaper } from 'arabic-persian-reshaper';
import { applyJudicialStampAndSignatureToPdf } from '../services/pdfStamper';

type InclusionRegistryType = 'property' | 'marriage' | 'divorce' | 'inheritance' | 'other';
type FinalArchivingEntryStatus = 'ARCHIVED' | 'FINAL_SECURED';

const INCLUSION_REGISTRY_LABELS: Record<InclusionRegistryType, string> = {
  property: 'الأملاك',
  marriage: 'الزواج',
  divorce: 'الطلاق',
  inheritance: 'التركات',
  other: 'باقي الوثائق',
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const bidi = new Bidi();
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

const FINAL_ARCHIVING_CACHE_TTL_SEC = 15;

function getFinalArchivingCacheKey(userId: string) {
  return `judge:final-archiving:${userId}`;
}

async function readFinalArchivingCache(userId: string) {
  return CacheService.get<{ registries: any[]; entries: any[] }>(getFinalArchivingCacheKey(userId));
}

async function writeFinalArchivingCache(userId: string, data: { registries: any[]; entries: any[] }) {
  await CacheService.set(getFinalArchivingCacheKey(userId), data, FINAL_ARCHIVING_CACHE_TTL_SEC);
}

async function invalidateFinalArchivingCache(userId: string) {
  await CacheService.del(getFinalArchivingCacheKey(userId));
}

function buildJudgeInclusionDescriptor(registryType: InclusionRegistryType, registryLetter: string) {
  const label = INCLUSION_REGISTRY_LABELS[registryType] ?? INCLUSION_REGISTRY_LABELS.other;
  return `سجل بسجل ${label} حرف ${registryLetter}`;
}

function parseJudgeInclusionDescriptor(value: string): { registryType: InclusionRegistryType; registryLetter: string } {
  const raw = String(value ?? '').trim();
  const registryLetter = (raw.match(/حرف\s+([^\s]+)/)?.[1] ?? '').trim() || 'أ';
  if (raw.includes('الأملاك')) return { registryType: 'property', registryLetter };
  if (raw.includes('الزواج')) return { registryType: 'marriage', registryLetter };
  if (raw.includes('الطلاق')) return { registryType: 'divorce', registryLetter };
  if (raw.includes('التركات')) return { registryType: 'inheritance', registryLetter };
  return { registryType: 'other', registryLetter };
}

function computeInclusionRegisterNumber(inclusionNumber: number) {
  if (!Number.isFinite(inclusionNumber) || inclusionNumber <= 0) return 1;
  return Math.floor((inclusionNumber - 1) / 500) + 1;
}

function toGregorianDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toHijriDateString(value: Date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const year = parts.find((p) => p.type === 'year')?.value ?? '';
    if (year && month && day) return `${year}/${month}/${day}`;
  } catch {
    // ignore
  }
  return '';
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shapeArabicForSvg(value: string) {
  const raw = String(value ?? '').trim();
  if (!raw || !ARABIC_RE.test(raw)) return raw;

  try {
    const shaped = ArabicShaper.convertArabic(raw);
    const levels = bidi.getEmbeddingLevels(shaped);
    return bidi.getReorderedString(shaped, levels);
  } catch {
    try {
      const levels = bidi.getEmbeddingLevels(raw);
      return bidi.getReorderedString(raw, levels);
    } catch {
      return raw;
    }
  }
}

const STAMP_VIEWBOX = 1000;
const STAMP_CENTER_X = 500;
const STAMP_CENTER_Y = 500;
const STAMP_OUTER_RADIUS = 270;
const STAMP_INNER_RADIUS = 208;
const STAMP_OUTER_STROKE = 8;
const STAMP_INNER_STROKE = 6;
const STAMP_TOP_ARC = { radius: 244, startAngle: 60, endAngle: 22, fontSize: 18 };
const STAMP_TOP_LEFT_ARC = { radius: 244, startAngle: -4, endAngle: -96, fontSize: 15 };
const STAMP_BOTTOM_ARC = { radius: 244, startAngle: 142, endAngle: 218, fontSize: 13 };
const STAMP_SERIAL_Y = 0;
const STAMP_CENTER_TEXT_BOX = {
  x: 270,
  y: 340,
  width: 460,
  height: 230,
};

function stampDegToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function stampPolarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const theta = stampDegToRad(angle - 90);
  return {
    x: cx + radius * Math.cos(theta),
    y: cy + radius * Math.sin(theta),
  };
}

function stampDescribeArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  sweepFlag = 1
) {
  const start = stampPolarToCartesian(cx, cy, radius, startAngle);
  const end = stampPolarToCartesian(cx, cy, radius, endAngle);
  const rawSweep = ((endAngle - startAngle) % 360 + 360) % 360;
  const largeArcFlag = rawSweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function stampDescribeReversedArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  return stampDescribeArcPath(cx, cy, radius, endAngle, startAngle, 0);
}

function estimateStampGlyphWeight(char: string) {
  if (!char.trim()) return 0.7;
  if ('اةدذرزو'.includes(char)) return 0.85;
  if ('لمك'.includes(char)) return 1.05;
  return 1;
}

function normalizeStampAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function getStampGlyphRotation(angle: number) {
  const normalized = normalizeStampAngle(angle);
  return normalized >= 90 && normalized <= 270 ? normalized - 180 : normalized;
}

function getStampManualGlyphAnchors(text: string, startAngle: number, endAngle: number) {
  const rawChars = Array.from(String(text ?? '').trim());
  const shapedChars = Array.from(ArabicShaper.convertArabic(String(text ?? '').trim()));
  if (rawChars.length === 0 || shapedChars.length === 0) return [];

  const paired = rawChars.map((source, index) => ({
    source,
    glyph: shapedChars[index] ?? source,
  }));
  const totalWeight = paired.reduce((sum, glyph) => sum + estimateStampGlyphWeight(glyph.source), 0);
  const span = endAngle - startAngle;
  let traversedWeight = 0;

  return paired.map((glyph) => {
    const weight = estimateStampGlyphWeight(glyph.source);
    const ratio = totalWeight <= 0 ? 0.5 : (traversedWeight + weight / 2) / totalWeight;
    const angle = startAngle + span * ratio;
    traversedWeight += weight;
    return {
      glyph: glyph.glyph,
      angle,
      isWhitespace: !glyph.source.trim(),
    };
  });
}

function getStampManualWordAnchors(text: string, startAngle: number, endAngle: number) {
  const words = String(text ?? '')
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (!words.length) return [];

  const totalWeight = words.reduce((sum, word) => sum + Math.max(1, Array.from(word).length), 0);
  const span = endAngle - startAngle;
  const spanMid = startAngle + span / 2;
  const packedSpan = span * 0.82;
  const packedStart = spanMid - packedSpan / 2;
  let traversedWeight = 0;

  return words.map((word) => {
    const weight = Math.max(1, Array.from(word).length);
    const ratio = totalWeight <= 0 ? 0.5 : (traversedWeight + weight / 2) / totalWeight;
    traversedWeight += weight;
    return {
      word,
      angle: packedStart + packedSpan * ratio,
    };
  });
}

function normalizeCityKey(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ');
}

function transliterateCityForCode(value: string) {
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
  const mapped = JUDGE_CITY_CODE_MAP[normalizeCityKey(city)];
  if (mapped) return mapped;
  const transliterated = transliterateCityForCode(city);
  return (transliterated || 'JDG').slice(0, 3).padEnd(3, 'X');
}

function buildJudgeCourtGeneratedId(submissionId: string, fileNumber: string, courtCity: string) {
  const prefix = buildJudgeCityPrefix(courtCity);
  const suffix =
    String(fileNumber || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() ||
    submissionId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function getPriorityJudgeCourtIdentifier(opts: {
  payload?: Record<string, unknown> | null;
  submissionId: string;
  fileNumber: string;
  courtCity?: string | null;
}) {
  const payload = opts.payload && typeof opts.payload === 'object' ? opts.payload : {};
  const nestedIdentifier =
    payload && typeof (payload as any).judgeCourtIdentifier === 'object' && (payload as any).judgeCourtIdentifier
      ? ((payload as any).judgeCourtIdentifier as Record<string, unknown>)
      : null;
  const resolvedCourtCity =
    String(
      opts.courtCity ??
        nestedIdentifier?.courtCity ??
        (payload as any)?.courtCity ??
        (payload as any)?.city ??
        'الرباط'
    ).trim() || 'الرباط';
  const id =
    String(nestedIdentifier?.id ?? '').trim() ||
    buildJudgeCourtGeneratedId(opts.submissionId, opts.fileNumber, resolvedCourtCity);

  return {
    id,
    courtCity: resolvedCourtCity,
    cityCode: String(nestedIdentifier?.cityCode ?? '').trim() || buildJudgeCityPrefix(resolvedCourtCity),
    createdAt: String(nestedIdentifier?.createdAt ?? '').trim() || null,
  };
}

function extractJudgePreviewAttachment(payload: Record<string, unknown>) {
  const explicitSigned = payload?.judgeSignedDoc && typeof payload.judgeSignedDoc === 'object'
    ? [payload.judgeSignedDoc]
    : [];
  const explicitStamped = payload?.judgeCourtStampedDoc && typeof payload.judgeCourtStampedDoc === 'object'
    ? [payload.judgeCourtStampedDoc]
    : [];
  const candidateAttachments = [
    ...explicitSigned,
    ...explicitStamped,
    ...(Array.isArray(payload?.attachments) ? (payload.attachments as any[]) : []),
    payload?.attachment,
  ].filter(Boolean);

  for (const raw of candidateAttachments) {
    const att: any = raw && typeof raw === 'object' ? raw : null;
    if (!att) continue;
    let url = String(att.url || att.fileUrl || att.file_url || att.fileURL || '').trim();
    if (!url && att.base64) {
      const mime = String(att.mimeType || att.mime_type || att.type || 'application/pdf').trim();
      url = String(att.base64).startsWith('data:') ? String(att.base64) : `data:${mime};base64,${att.base64}`;
    }
    if (!url) continue;
    const mimeType = String(att.mimeType || att.mime_type || att.type || '').trim().toLowerCase();
    const name = String(att.name || att.fileName || att.filename || '').trim().toLowerCase();
    if (mimeType.includes('pdf') || name.endsWith('.pdf') || url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf')) {
      return {
        url,
        mimeType: mimeType || 'application/pdf',
        name: String(att.name || att.fileName || att.filename || 'judge-preview.pdf').trim() || 'judge-preview.pdf',
      };
    }
  }

  return null;
}

async function resolveJudgeSourcePdfBuffer(opts: {
  signedDeedId: string;
  payload: Record<string, unknown>;
}) {
  for (const category of ['judge_signed_pdf', 'judge_court_stamped_pdf', 'signed_pdf']) {
    const attachmentRes = await supabase
      .from('deed_attachments')
      .select('file_url, storage_path')
      .eq('record_type', 'signed_deed')
      .eq('record_id', opts.signedDeedId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!attachmentRes.error && attachmentRes.data?.storage_path) {
      const { data, error } = await supabase.storage
        .from('rasm-files')
        .download(String(attachmentRes.data.storage_path));
      if (!error && data) {
        return {
          buffer: Buffer.from(await data.arrayBuffer()),
          fileUrl: String(attachmentRes.data.file_url || '').trim() || null,
          storagePath: String(attachmentRes.data.storage_path),
        };
      }
    }
  }

  const previewAttachment = extractJudgePreviewAttachment(opts.payload);
  const payloadStoragePath = String(
    ((previewAttachment as any)?.storagePath as string) ||
      ((previewAttachment as any)?.storage_path as string) ||
      ''
  ).trim();

  if (payloadStoragePath) {
    const { data, error } = await supabase.storage.from('rasm-files').download(payloadStoragePath);
    if (!error && data) {
      return {
        buffer: Buffer.from(await data.arrayBuffer()),
        fileUrl: previewAttachment?.url || null,
        storagePath: payloadStoragePath,
      };
    }
  }

  if (previewAttachment?.url) {
    const resp = await fetch(previewAttachment.url, { cache: 'no-store' as any });
    if (!resp.ok) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `تعذر تحميل ملف الرسم (${resp.status})` });
    }
    return {
      buffer: Buffer.from(await resp.arrayBuffer()),
      fileUrl: previewAttachment.url,
      storagePath: payloadStoragePath || null,
    };
  }

  throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'لا توجد نسخة PDF صالحة للختم القضائي' });
}

async function renderJudgeCourtStampPng(opts: {
  courtName: string;
  courtCityLine: string;
  courtCity: string;
  judgeName: string;
  gregorianDate: string;
  fileNumber: string;
}) {
  const topRingText = escapeHtml(
    shapeArabicForSvg('المجلس الأعلى للسلطة القضائية • المملكة المغربية')
  );
  const bottomRingText = escapeHtml(
    shapeArabicForSvg(`المحكمة الابتدائية بـ ${opts.courtCity} • ${opts.gregorianDate}`)
  );

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        width: 1000px;
        height: 500px;
        background: transparent;
        overflow: hidden;
        font-family: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
      }
      #canvas {
        position: relative;
        width: 1000px;
        height: 500px;
        background: transparent;
      }
      .seal {
        position: absolute;
        left: 690px;
        top: 100px;
        width: 250px;
        height: 250px;
        border: 7px solid rgba(18, 18, 18, 0.9);
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .seal::before {
        content: "";
        position: absolute;
        inset: 20px;
        border: 5px solid rgba(18, 18, 18, 0.86);
        border-radius: 9999px;
      }
      .sealRingText {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        pointer-events: none;
      }
      .sealRingSvg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .sealRingSvg text {
        font-family: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        fill: #1D4ED8;
      }
      .sealCenter {
        position: relative;
        z-index: 1;
        text-align: center;
        color: rgba(18, 18, 18, 0.98);
        background: rgba(255,255,255,0.78);
        border-radius: 9999px;
        padding: 10px 18px 6px;
      }
      .sealCenter .top {
        font-size: 30px;
        font-weight: 900;
        line-height: 1.1;
      }
      .sealCenter .bottom {
        font-size: 34px;
        font-weight: 900;
        line-height: 1.05;
      }
      .meta {
        position: absolute;
        left: 690px;
        top: 360px;
        width: 250px;
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        color: rgba(35, 35, 35, 0.78);
      }
      .protocolBlock {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 570px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: right;
        direction: rtl;
        color: rgba(25, 25, 25, 0.95);
        z-index: 2;
      }
      .protocolBlock .line1 {
        font-size: 78px;
        line-height: 1.1;
        font-weight: 900;
        margin-bottom: 16px;
        white-space: nowrap;
      }
      .protocolBlock .line2 {
        font-size: 52px;
        line-height: 1.25;
        font-weight: 800;
        margin-bottom: 14px;
        white-space: nowrap;
      }
      .protocolBlock .line3 {
        font-size: 34px;
        line-height: 1.35;
        font-weight: 800;
        white-space: normal;
      }
    </style>
  </head>
  <body>
    <div id="canvas">
      <div class="seal">
        <div class="sealRingText">
          <svg class="sealRingSvg" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <!-- Top arc: endpoints at 5-o'clock & 7-o'clock, CW through 12-o'clock — text centered at top, endpoints safely at bottom -->
              <path id="sealArcTop" d="M 96 326 A 168 168 0 1 1 264 326" />
              <!-- Bottom arc: endpoints at 11-o'clock & 1-o'clock, CW through 6-o'clock — text centered at bottom, endpoints safely at top -->
              <path id="sealArcBottom" d="M 264 35 A 168 168 0 1 1 96 35" />
            </defs>
            <text direction="rtl" text-anchor="middle">
              <textPath href="#sealArcTop" startOffset="50%" textLength="528" lengthAdjust="spacing">${topRingText}</textPath>
            </text>
            <text direction="rtl" text-anchor="middle">
              <textPath href="#sealArcBottom" startOffset="50%" textLength="528" lengthAdjust="spacing">${bottomRingText}</textPath>
            </text>
          </svg>
        </div>
        <div class="sealCenter">
          <div class="top">قاضي</div>
          <div class="bottom">التوثيق</div>
        </div>
      </div>
      <div class="protocolBlock">
        <div class="line1">${escapeHtml('الحمد لله')}</div>
        <div class="line2">${escapeHtml('أُعلم بأدائها ومراقبتها')}</div>
        <div class="line3">${escapeHtml(opts.courtCityLine)}</div>
      </div>
      <div class="meta">${escapeHtml(`الرسم ${opts.fileNumber}`)}</div>
    </div>
  </body>
  </html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  } as any);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 500, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    const png = (await page.screenshot({ type: 'png', omitBackground: true })) as Buffer;
    await page.close();
    return png;
  } finally {
    await browser.close();
  }
}

async function renderJudgeCourtSealPng(opts: {
  courtCity: string;
  gregorianDate: string;
  generatedId: string;
}) {
  const topGlyphs = getStampManualWordAnchors(
    'المملكة المغربية',
    STAMP_TOP_ARC.startAngle,
    STAMP_TOP_ARC.endAngle
  )
    .map((anchor) => {
      const point = stampPolarToCartesian(
        STAMP_CENTER_X,
        STAMP_CENTER_Y,
        STAMP_TOP_ARC.radius,
        anchor.angle
      );
      return `<text class="outerArc" direction="rtl" unicode-bidi="plaintext" text-anchor="middle" dominant-baseline="middle" font-size="${STAMP_TOP_ARC.fontSize}" transform="translate(${point.x} ${point.y}) rotate(${getStampGlyphRotation(anchor.angle)})">${escapeHtml(anchor.word)}</text>`;
    })
    .join('');
  const topLeftGlyphs = getStampManualWordAnchors(
    'المجلس الأعلى للسلطة القضائية',
    STAMP_TOP_LEFT_ARC.startAngle,
    STAMP_TOP_LEFT_ARC.endAngle
  )
    .map((anchor) => {
      const point = stampPolarToCartesian(
        STAMP_CENTER_X,
        STAMP_CENTER_Y,
        STAMP_TOP_LEFT_ARC.radius,
        anchor.angle
      );
      return `<text class="outerArc" direction="rtl" unicode-bidi="plaintext" text-anchor="middle" dominant-baseline="middle" font-size="${STAMP_TOP_LEFT_ARC.fontSize}" transform="translate(${point.x} ${point.y}) rotate(${getStampGlyphRotation(anchor.angle)})">${escapeHtml(anchor.word)}</text>`;
    })
    .join('');
  const bottomGlyphs = getStampManualWordAnchors(
    `المحكمة الابتدائية ${opts.courtCity || 'شفشاون'}`,
    STAMP_BOTTOM_ARC.startAngle,
    STAMP_BOTTOM_ARC.endAngle
  )
    .map((anchor) => {
      const point = stampPolarToCartesian(
        STAMP_CENTER_X,
        STAMP_CENTER_Y,
        STAMP_BOTTOM_ARC.radius,
        anchor.angle
      );
      return `<text class="outerArc" direction="rtl" unicode-bidi="plaintext" text-anchor="middle" dominant-baseline="middle" font-size="${STAMP_BOTTOM_ARC.fontSize}" transform="translate(${point.x} ${point.y}) rotate(${getStampGlyphRotation(anchor.angle)})">${escapeHtml(anchor.word)}</text>`;
    })
    .join('');

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        width: 1000px;
        height: 1000px;
        background: transparent;
        overflow: hidden;
        font-family: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
      }
      #canvas {
        position: relative;
        width: 1000px;
        height: 1000px;
        background: transparent;
      }
      .sealSvg {
        width: 100%;
        height: 100%;
      }
      .outerArc {
        font-family: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
        fill: #3b73d1;
        font-weight: 900;
      }
    </style>
  </head>
  <body>
    <div id="canvas">
      <svg class="sealSvg" viewBox="0 0 ${STAMP_VIEWBOX} ${STAMP_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${topGlyphs}
        ${topLeftGlyphs}
        ${bottomGlyphs}
        <circle cx="${STAMP_CENTER_X}" cy="${STAMP_CENTER_Y}" r="${STAMP_OUTER_RADIUS}" fill="none" stroke="#3b73d1" stroke-width="${STAMP_OUTER_STROKE}" />
        <circle cx="${STAMP_CENTER_X}" cy="${STAMP_CENTER_Y}" r="${STAMP_INNER_RADIUS}" fill="none" stroke="#3b73d1" stroke-width="${STAMP_INNER_STROKE}" />
        <polygon points="${(() => {
          const p = stampPolarToCartesian(STAMP_CENTER_X, STAMP_CENTER_Y, 244, 90);
          return `${p.x},${p.y - 6} ${p.x + 4.6},${p.y} ${p.x},${p.y + 6} ${p.x - 4.6},${p.y}`;
        })()}" fill="#3b73d1" />
        <polygon points="${(() => {
          const p = stampPolarToCartesian(STAMP_CENTER_X, STAMP_CENTER_Y, 244, 270);
          return `${p.x},${p.y - 6} ${p.x + 4.6},${p.y} ${p.x},${p.y + 6} ${p.x - 4.6},${p.y}`;
        })()}" fill="#3b73d1" />
        <polygon points="${(() => {
          const p = stampPolarToCartesian(STAMP_CENTER_X, STAMP_CENTER_Y, 244, 0);
          return `${p.x},${p.y - 6} ${p.x + 4.6},${p.y} ${p.x},${p.y + 6} ${p.x - 4.6},${p.y}`;
        })()}" fill="#3b73d1" />
        <polygon points="${(() => {
          const p = stampPolarToCartesian(STAMP_CENTER_X, STAMP_CENTER_Y, 244, 180);
          return `${p.x},${p.y - 6} ${p.x + 4.6},${p.y} ${p.x},${p.y + 6} ${p.x - 4.6},${p.y}`;
        })()}" fill="#3b73d1" />
        <g transform="translate(500 505)" fill="none" stroke="#3b73d1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
          <line x1="0" y1="-120" x2="0" y2="118" />
          <line x1="-96" y1="-88" x2="96" y2="-88" />
          <line x1="0" y1="-120" x2="-18" y2="-146" />
          <line x1="0" y1="-120" x2="18" y2="-146" />
          <line x1="-70" y1="-88" x2="-120" y2="8" />
          <line x1="-70" y1="-88" x2="-18" y2="8" />
          <line x1="70" y1="-88" x2="18" y2="8" />
          <line x1="70" y1="-88" x2="120" y2="8" />
          <path d="M -138 14 Q -70 84 -2 14 Z" fill="#3b73d1" stroke="none" />
          <path d="M 2 14 Q 70 84 138 14 Z" fill="#3b73d1" stroke="none" />
          <path d="M -78 126 Q 0 96 78 126" />
          <line x1="0" y1="118" x2="0" y2="168" />
          <path d="M -54 176 L 54 176 L 92 194 L -92 194 Z" fill="#3b73d1" stroke="none" />
        </g>
      </svg>
    </div>
  </body>
  </html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  } as any);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    const png = (await page.screenshot({ type: 'png', omitBackground: true })) as Buffer;
    await page.close();
    return png;
  } finally {
    await browser.close();
  }
}

async function renderJudgeCourtProtocolPng(opts: {
  courtCityLine: string;
}) {
  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        width: 700px;
        height: 240px;
        background: transparent;
        overflow: hidden;
        font-family: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', Arial, sans-serif;
      }
      #canvas {
        width: 700px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      }
      .protocolBlock {
        width: 660px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: right;
        direction: rtl;
        color: rgba(25, 25, 25, 0.95);
      }
      .line1 {
        font-size: 78px;
        line-height: 1.1;
        font-weight: 900;
        margin-bottom: 16px;
        white-space: nowrap;
      }
      .line2 {
        font-size: 52px;
        line-height: 1.25;
        font-weight: 800;
        margin-bottom: 14px;
        white-space: nowrap;
      }
      .line3 {
        font-size: 34px;
        line-height: 1.35;
        font-weight: 800;
        white-space: normal;
      }
    </style>
  </head>
  <body>
    <div id="canvas">
      <div class="protocolBlock">
        <div class="line1">${escapeHtml('الحمد لله')}</div>
        <div class="line2">${escapeHtml('أُعلم بأدائها ومراقبتها')}</div>
        <div class="line3">${escapeHtml(opts.courtCityLine)}</div>
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
    await page.setViewport({ width: 700, height: 240, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load' });
    const png = (await page.screenshot({ type: 'png', omitBackground: true })) as Buffer;
    await page.close();
    return png;
  } finally {
    await browser.close();
  }
}

async function requireJudgeSubmission(sessionToken: string, id: string) {
  const user = await requireSession(sessionToken);
  if (user.role !== 'authentication_judge') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
  }

  const { data, error } = await supabase
    .from('judge_submissions')
    .select('id, notary_name, file_number, document_type, payload, status, decision, judge_notes, created_at, updated_at, decided_at, judge_user_id')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
  }

  const payload = data.payload && typeof data.payload === 'object' ? (data.payload as Record<string, unknown>) : {};
  const signedDeedIdRaw = payload?.signedDeedId;
  const signedDeedId = typeof signedDeedIdRaw === 'string' && signedDeedIdRaw ? signedDeedIdRaw : null;
  if (!signedDeedId) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'لا يوجد رسم موقّع مرتبط بهذه الإحالة' });
  }

  return { user, submission: data, payload, signedDeedId };
}

async function requireSession(sessionToken: string) {
  return resolveSessionUser(sessionToken);
}

function isJudgeRole(role: string) {
  return role === 'authentication_judge' || role === 'regional_judge' || role === 'supreme_judge';
}

export const judgeRouter = router({
  getMyProfile: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      if (!isJudgeRole(String(user.role))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'هذه العملية متاحة للقضاة فقط' });
      }

      const { data: profile, error } = await supabase
        .from('judge_profiles')
        .select('appellate_court, primary_court, court_name, phone, profile_picture_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'تعذر تحميل ملف القاضي' });
      }

      return {
        fullName: String(user.full_name || ''),
        email: String(user.email || ''),
        role: String(user.role || ''),
        appellateCourt: (profile as any)?.appellate_court ?? null,
        primaryCourt: (profile as any)?.primary_court ?? null,
        courtName: (profile as any)?.court_name ?? null,
        phone: (profile as any)?.phone ?? null,
        profilePictureUrl: (profile as any)?.profile_picture_url ?? null,
      };
    }),

  updateMyProfile: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      fullName: z.string().min(1, 'الاسم الكامل مطلوب'),
      appellateCourt: z.string().nullable(),
      primaryCourt: z.string().nullable(),
      courtName: z.string().nullable(),
      phone: z.string().nullable(),
      profilePictureUrl: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      if (!isJudgeRole(String(user.role))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'هذه العملية متاحة للقضاة فقط' });
      }

      const trimmedFullName = input.fullName.trim();
      const trimmedAppellateCourt = input.appellateCourt?.trim() || null;
      const trimmedPrimaryCourt = input.primaryCourt?.trim() || null;
      const trimmedCourt = input.courtName?.trim() || null;
      const trimmedPhone = input.phone?.trim() || null;
      const trimmedPicture = input.profilePictureUrl?.trim() || null;

      const { error: userError } = await supabase
        .from('users')
        .update({ full_name: trimmedFullName })
        .eq('id', user.id);

      if (userError) {
        console.error('Update judge name error:', userError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'تعذر تحديث اسم القاضي' });
      }

      const { data: profileData, error: profileError } = await supabase
        .from('judge_profiles')
        .upsert({
          user_id: user.id,
          appellate_court: trimmedAppellateCourt,
          primary_court: trimmedPrimaryCourt,
          court_name: trimmedCourt,
          phone: trimmedPhone,
          profile_picture_url: trimmedPicture,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select('appellate_court, primary_court, court_name, phone, profile_picture_url');

      const updatedProfile = Array.isArray(profileData) ? profileData[0] : profileData;

      if (profileError) {
        console.error('Update judge profile error:', profileError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'تعذر تحديث ملف القاضي' });
      }

      return {
        success: true,
        profile: {
          fullName: trimmedFullName,
          email: String(user.email || ''),
          role: String(user.role || ''),
          appellateCourt: (updatedProfile as any)?.appellate_court ?? null,
          primaryCourt: (updatedProfile as any)?.primary_court ?? null,
          courtName: (updatedProfile as any)?.court_name ?? null,
          phone: (updatedProfile as any)?.phone ?? null,
          profilePictureUrl: (updatedProfile as any)?.profile_picture_url ?? null,
        },
      };
    }),

  sendFinalArchivedToNotaryPortal: publicProcedure
    .input(z.object({ sessionToken: z.string(), signedDeedId: z.string().uuid() }))
    .output(z.object({ success: z.boolean(), sentAt: z.string(), alreadySent: z.boolean() }))
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);

      if (user.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }

      const deedRes = await supabase
        .from('signed_deeds')
        .select('id, saved_rasms!signed_deeds_saved_rasm_fk(file_number)')
        .eq('id', input.signedDeedId)
        .single();

      if (deedRes.error || !deedRes.data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الرسم غير موجود' });
      }

      const saved = Array.isArray((deedRes.data as any)?.saved_rasms)
        ? (deedRes.data as any).saved_rasms[0]
        : (deedRes.data as any)?.saved_rasms;
      const fileNumber = String(saved?.file_number || '').trim();
      if (!fileNumber) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'الرسم لا يحمل مرجعاً صالحاً للإرسال' });
      }

      const submissionRes = await supabase
        .from('judge_submissions')
        .select('id, status')
        .eq('file_number', fileNumber)
        .in('status', ['accepted', 'accepted_with_notes'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submissionRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: submissionRes.error.message });
      }
      if (!submissionRes.data?.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب إنهاء اعتماد الرسم من طرف القاضي قبل إرساله إلى بوابة العدل' });
      }

      const existingSendRes = await supabase
        .from('archive_operation_logs')
        .select('signed_deed_id, timestamp, metadata')
        .eq('action_type', 'SEND_TO_NOTARY_JUDGE_ENDORSED')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (existingSendRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingSendRes.error.message });
      }

      const existingSendMatch = (existingSendRes.data || []).find((row: any) => {
        const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : null;
        const loggedFileNumber = String(meta?.fileNumber || '').trim();
        return String(row?.signed_deed_id || '') === input.signedDeedId || (!!loggedFileNumber && loggedFileNumber === fileNumber);
      });

      if (existingSendMatch?.timestamp) {
        return {
          success: true,
          sentAt: String(existingSendMatch.timestamp),
          alreadySent: true,
        };
      }

      const sentAt = new Date().toISOString();
      const logRes = await supabase.from('archive_operation_logs').insert({
        signed_deed_id: input.signedDeedId,
        action_type: 'SEND_TO_NOTARY_JUDGE_ENDORSED',
        timestamp: sentAt,
        user_id: user.id,
        device: null,
        ip: null,
        previous_hash: null,
        new_hash: null,
        metadata: {
          judgeSubmissionId: submissionRes.data.id,
          fileNumber,
          destination: 'judge-endorsed-deeds',
        },
      });

      if (logRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: logRes.error.message });
      }

      await invalidateFinalArchivingCache(String(user.id));
      return { success: true, sentAt, alreadySent: false };
    }),

  listFinalArchivingRecords: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const startedAt = Date.now();
      const user = await requireSession(input.sessionToken);

      if (user.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }

      const cached = await readFinalArchivingCache(String(user.id));
      if (cached) {
        console.log('[judge.listFinalArchivingRecords] cache hit', {
          userId: user.id,
          ms: Date.now() - startedAt,
        });
        return cached;
      }

      const submissionsRes = await supabase
        .from('judge_submissions')
        .select('id, file_number, document_type, payload, status, updated_at, decided_at, created_at, judge_user_id')
        .in('status', ['accepted', 'accepted_with_notes'])
        .order('updated_at', { ascending: false });

      if (submissionsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: submissionsRes.error.message });
      }
      const submissionsFetchedAt = Date.now();

      const latestSubmissionByFileNumber: Record<string, any> = {};
      for (const row of submissionsRes.data ?? []) {
        const fileNumber = row?.file_number ? String(row.file_number) : '';
        if (!fileNumber || latestSubmissionByFileNumber[fileNumber]) continue;
        latestSubmissionByFileNumber[fileNumber] = row;
      }

      const judgeUserIds = Array.from(
        new Set(
          (submissionsRes.data ?? [])
            .map((row: any) => String(row?.judge_user_id || '').trim())
            .filter(Boolean)
        )
      );
      const judgeNamesById = new Map<string, string>();
      if (judgeUserIds.length) {
        const judgeUsersRes = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', judgeUserIds as any);
        if (!judgeUsersRes.error) {
          for (const row of judgeUsersRes.data ?? []) {
            const id = String(row?.id || '').trim();
            const fullName = String(row?.full_name || '').trim();
            if (id && fullName) judgeNamesById.set(id, fullName);
          }
        }
      }

      const fileNumbers = Object.keys(latestSubmissionByFileNumber);
      if (!fileNumbers.length) {
        return { registries: [], entries: [] };
      }

      const deedsRes = await supabase
        .from('signed_deeds')
        .select(
          [
            'id',
            'saved_rasm_id',
            'inclusion_id',
            'category',
            'created_at',
            'saved_rasms!signed_deeds_saved_rasm_fk(file_number, document_type, payload)',
            'inclusion_registry!signed_deeds_inclusion_fk(id, register_number, certificate_number, registry_page, inclusion_date, inclusion_hijri, operation_id, notary1_name, notary2_name)',
            'seal_metadata(register_number, certificate_number, page_number, inclusion_date, notary1_name, notary2_name)',
          ].join(',')
        )
        .in('saved_rasms.file_number', fileNumbers as any)
        .not('inclusion_id', 'is', null)
        .order('created_at', { ascending: false });

      if (deedsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedsRes.error.message });
      }
      const deedsFetchedAt = Date.now();

      const relevantRows = (deedsRes.data ?? []).filter((row: any) => {
        const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
        const fileNumber = saved?.file_number ? String(saved.file_number) : '';
        return !!fileNumber && !!latestSubmissionByFileNumber[fileNumber];
      });

      const signedDeedIds = relevantRows.map((row: any) => String(row.id));
      const finalArchiveStageBySignedDeedId: Record<string, string | null> = {};
      const previewAttachmentBySignedDeedId: Record<string, { url: string | null; name: string | null; mimeType: string | null }> = {};
      const sentToNotaryBySignedDeedId: Record<string, string | null> = {};
      const sentToNotaryByFileNumber: Record<string, string | null> = {};
      if (signedDeedIds.length) {
        const archiveRes = await supabase
          .from('final_secure_archives')
          .select('signed_deed_id, current_stage')
          .in('signed_deed_id', signedDeedIds);
        if (!archiveRes.error) {
          for (const row of archiveRes.data ?? []) {
            if (row?.signed_deed_id) {
              finalArchiveStageBySignedDeedId[String(row.signed_deed_id)] = row?.current_stage ? String(row.current_stage) : null;
            }
          }
        }

        const sendLogRes = await supabase
          .from('archive_operation_logs')
          .select('signed_deed_id, timestamp, metadata')
          .in('signed_deed_id', signedDeedIds as any)
          .eq('action_type', 'SEND_TO_NOTARY_JUDGE_ENDORSED')
          .order('timestamp', { ascending: false });
        if (!sendLogRes.error) {
          for (const row of sendLogRes.data ?? []) {
            const signedDeedId = row?.signed_deed_id ? String(row.signed_deed_id) : '';
            const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : null;
            const loggedFileNumber = String(meta?.fileNumber || '').trim();
            if (signedDeedId && !sentToNotaryBySignedDeedId[signedDeedId]) {
              sentToNotaryBySignedDeedId[signedDeedId] = row?.timestamp ? String(row.timestamp) : null;
            }
            if (loggedFileNumber && !sentToNotaryByFileNumber[loggedFileNumber]) {
              sentToNotaryByFileNumber[loggedFileNumber] = row?.timestamp ? String(row.timestamp) : null;
            }
          }
        }

        const attachmentsRes = await supabase
          .from('deed_attachments')
          .select('record_id, category, file_url, file_name, mime_type, created_at')
          .eq('record_type', 'signed_deed')
          .in('record_id', signedDeedIds)
          .in('category', ['judge_court_stamped_pdf', 'judge_signed_pdf', 'signed_pdf'])
          .order('created_at', { ascending: false });
        if (!attachmentsRes.error) {
          const priority: Record<string, number> = {
            judge_signed_pdf: 3,
            judge_court_stamped_pdf: 2,
            signed_pdf: 1,
          };
          for (const row of attachmentsRes.data ?? []) {
            const recordId = row?.record_id ? String(row.record_id) : '';
            if (!recordId) continue;
            const current = previewAttachmentBySignedDeedId[recordId];
            const nextPriority = priority[String(row?.category ?? '')] ?? 0;
            const currentPriority = current ? priority[String((current as any).__category ?? '')] ?? 0 : -1;
            if (current && nextPriority <= currentPriority) continue;
            previewAttachmentBySignedDeedId[recordId] = {
              url: row?.file_url ? String(row.file_url) : null,
              name: row?.file_name ? String(row.file_name) : null,
              mimeType: row?.mime_type ? String(row.mime_type) : null,
              __category: String(row?.category ?? ''),
            } as any;
          }
          for (const key of Object.keys(previewAttachmentBySignedDeedId)) {
            delete (previewAttachmentBySignedDeedId[key] as any).__category;
          }
        }
      }
      const attachmentsFetchedAt = Date.now();

      const registryMap = new Map<string, any>();
      const entries = relevantRows.map((row: any) => {
        const saved = Array.isArray(row?.saved_rasms) ? row.saved_rasms[0] : row?.saved_rasms;
        const incl = Array.isArray(row?.inclusion_registry) ? row.inclusion_registry[0] : row?.inclusion_registry;
        const seal = Array.isArray(row?.seal_metadata) ? row.seal_metadata[0] : row?.seal_metadata;
        const fileNumber = saved?.file_number ? String(saved.file_number) : '';
        const submission = latestSubmissionByFileNumber[fileNumber];
        const submissionJudgeUserId = submission?.judge_user_id ? String(submission.judge_user_id).trim() : '';
        const judgeName = submissionJudgeUserId ? (judgeNamesById.get(submissionJudgeUserId) || null) : null;
        const payload = (saved?.payload && typeof saved.payload === 'object' ? saved.payload : {}) as Record<string, any>;
        const judgePayload = (submission?.payload && typeof submission.payload === 'object' ? submission.payload : {}) as Record<string, any>;
        const judgeNotes = submission?.judge_notes ? String(submission.judge_notes).trim() : null;
        const payloadInclusion = (payload?.inclusionReference && typeof payload.inclusionReference === 'object'
          ? payload.inclusionReference
          : null) as Record<string, any> | null;
        const judgePayloadInclusion = (judgePayload?.inclusionReference && typeof judgePayload.inclusionReference === 'object'
          ? judgePayload.inclusionReference
          : null) as Record<string, any> | null;
        const descriptor =
          String(
            incl?.operation_id ??
              judgePayloadInclusion?.descriptor ??
              payloadInclusion?.descriptor ??
              ''
          ).trim();
        const parsedDescriptor = parseJudgeInclusionDescriptor(descriptor);
        const registerNumber = Number(
          String(
            incl?.register_number ??
              seal?.register_number ??
              judgePayloadInclusion?.registerNumber ??
              payloadInclusion?.registerNumber ??
              ''
          ).trim()
        ) || 1;
        const certificateNumber = Number(
          String(
            incl?.certificate_number ??
              seal?.certificate_number ??
              judgePayloadInclusion?.inclusionNumber ??
              payloadInclusion?.inclusionNumber ??
              ''
          ).trim()
        ) || 0;
        const registryPage = String(
          incl?.registry_page ??
            seal?.page_number ??
            judgePayloadInclusion?.registryPage ??
            payloadInclusion?.registryPage ??
            ''
        ).trim();
        const inclusionGregorianDate = String(
          incl?.inclusion_date ??
            seal?.inclusion_date ??
            judgePayloadInclusion?.gregorianDate ??
            payloadInclusion?.gregorianDate ??
            row?.created_at ??
            ''
        ).slice(0, 10);
        const inclusionHijriDate = String(
          incl?.inclusion_hijri ??
            judgePayloadInclusion?.hijriDate ??
            payloadInclusion?.hijriDate ??
            ''
        ).trim();
        const priorityJudgeId = getPriorityJudgeCourtIdentifier({
          payload: judgePayload && Object.keys(judgePayload).length ? judgePayload : payload,
          submissionId: String(submission?.id || row.id || ''),
          fileNumber,
          courtCity:
            String(
              judgePayload?.judgeCourtIdentifier?.courtCity ??
              judgePayload?.courtCity ??
              payload?.judgeCourtIdentifier?.courtCity ??
              payload?.courtCity ??
              payload?.city ??
              'الرباط'
            ).trim() || 'الرباط',
        });
        const nationalId = priorityJudgeId.id;

        const partiesRaw = Array.isArray(payload?.parties)
          ? payload.parties
          : Array.isArray(payload?.partyNames)
            ? payload.partyNames
            : [];
        const parties = partiesRaw
          .map((item: any) => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') {
              return String(item.name ?? item.fullName ?? item.label ?? '').trim();
            }
            return '';
          })
          .filter(Boolean);

        const notaries = [
          String(incl?.notary1_name ?? '').trim(),
          String(incl?.notary2_name ?? '').trim(),
          String(seal?.notary1_name ?? '').trim(),
          String(seal?.notary2_name ?? '').trim(),
          String(payload?.notaryName ?? '').trim(),
          String(payload?.notary1Name ?? '').trim(),
          String(payload?.notary2Name ?? '').trim(),
        ].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);

        const judgeAttachmentCandidates = [
          ...(Array.isArray(judgePayload?.attachments) ? judgePayload.attachments : []),
          judgePayload?.attachment,
        ].filter(Boolean);
        const judgeAttachments = judgeAttachmentCandidates
          .map((raw: any) => {
            const category = String(raw?.category || '').trim();
            const url = String(raw?.url || raw?.fileUrl || raw?.file_url || '').trim();
            if (!url) return null;
            if (category === 'judge_attachment' || category === 'judge_attachment_docx') return null;
            return {
              name: String(raw?.name || raw?.fileName || raw?.filename || 'مرفق').trim() || 'مرفق',
              url,
              mimeType: String(raw?.mimeType || raw?.mime_type || raw?.type || '').trim() || null,
              category: category || null,
            };
          })
          .filter(Boolean);

        const registryKey = `${parsedDescriptor.registryType}:${parsedDescriptor.registryLetter}:${registerNumber}`;
        const currentRegistry = registryMap.get(registryKey) ?? {
          id: registryKey,
          type: parsedDescriptor.registryType,
          letter: parsedDescriptor.registryLetter,
          registerNumber,
          currentCount: 0,
          maxEntries: 500,
          startDate: inclusionGregorianDate,
          closeDate: undefined as string | undefined,
        };
        currentRegistry.currentCount += 1;
        if (currentRegistry.currentCount >= 500) {
          currentRegistry.closeDate = inclusionGregorianDate;
        }
        registryMap.set(registryKey, currentRegistry);

        const entryStatus: FinalArchivingEntryStatus =
          finalArchiveStageBySignedDeedId[String(row.id)] === 'final_archived' ? 'FINAL_SECURED' : 'ARCHIVED';
        const previewAttachment = previewAttachmentBySignedDeedId[String(row.id)] || {
          url: null,
          name: null,
          mimeType: null,
        };
        return {
          id: String(row.id),
          registryId: registryKey,
          nationalId,
          fileNumber,
          deedType: String(saved?.document_type ?? row?.category ?? submission?.document_type ?? '').trim() || 'رسم عدلي',
          registryType: parsedDescriptor.registryType,
          letter: parsedDescriptor.registryLetter,
          parties: parties.length ? parties : ['غير متوفر'],
          notaries: notaries.length ? notaries : ['غير متوفر'],
          judgeName,
          judgeNotes,
          judgeAttachments,
          dateGregorian: inclusionGregorianDate,
          dateHijri: inclusionHijriDate || 'غير متوفر',
          status: entryStatus,
          previewUrl: previewAttachment.url,
          previewName: previewAttachment.name,
          previewMimeType: previewAttachment.mimeType,
          inclusionReference: {
            heading: 'مراجع سجل التضمين',
            descriptor,
            registerNumber,
            registryLetter: parsedDescriptor.registryLetter,
            inclusionNumber: certificateNumber || null,
            registryPage: registryPage || null,
            gregorianDate: inclusionGregorianDate || null,
            hijriDate: inclusionHijriDate || null,
          },
          sentToNotary:
            !!sentToNotaryBySignedDeedId[String(row.id)] ||
            !!sentToNotaryByFileNumber[fileNumber],
          sentToNotaryAt:
            sentToNotaryBySignedDeedId[String(row.id)] ||
            sentToNotaryByFileNumber[fileNumber] ||
            null,
        };
      });

      const registries = Array.from(registryMap.values()).sort((a, b) => {
        if (a.type !== b.type) return String(a.type).localeCompare(String(b.type), 'ar');
        if (a.letter !== b.letter) return String(a.letter).localeCompare(String(b.letter), 'ar');
        return Number(a.registerNumber) - Number(b.registerNumber);
      });

      const response = { registries, entries };
      await writeFinalArchivingCache(String(user.id), response);
      console.log('[judge.listFinalArchivingRecords] timings', {
        userId: user.id,
        submissionsMs: submissionsFetchedAt - startedAt,
        deedsMs: deedsFetchedAt - submissionsFetchedAt,
        attachmentsAndLogsMs: attachmentsFetchedAt - deedsFetchedAt,
        totalMs: Date.now() - startedAt,
        entries: entries.length,
        registries: registries.length,
      });
      return response;
    }),

  listSubmissions: publicProcedure
    .input(ListSubmissionsInputSchema)
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      return JudgeDeedService.listSubmissions(user, input);
    }),

  listJudicialSpeechQueue: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);

      if (user.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }

      const { data, error } = await supabase
        .from('judge_submissions')
        .select(
          'id, notary_user_id, notary_name, file_number, document_type, summary, payload, status, decision, judge_notes, created_at, updated_at, decided_at, judge_user_id'
        )
        .in('status', ['pending', 'in_review'])
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return (data ?? [])
        .filter((row: any) => {
          const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
          const source = String((payload as any)?.source || '').trim();
          const signedDeedId = String((payload as any)?.signedDeedId || '').trim();
          if (source !== 'signed_rasms_send_to_judge' || !signedDeedId) return false;

          const originalApprovedJudgeUserId =
            String(
              (payload as any)?.originalApprovedJudgeUserId ||
              (payload as any)?.originJudgeUserId ||
              ''
            ).trim() || null;
          const currentAssignedJudgeUserId = row?.judge_user_id ? String(row.judge_user_id).trim() : null;

          if (String(row?.status || '') === 'in_review') {
            return currentAssignedJudgeUserId === String(user.id) || originalApprovedJudgeUserId === String(user.id);
          }

          return currentAssignedJudgeUserId === String(user.id) || originalApprovedJudgeUserId === String(user.id);
        })
        .map((row: any) => ({
          id: row.id as string,
          notaryUserId: row.notary_user_id as string,
          notaryName: row.notary_name as string,
          fileNumber: (row.file_number ?? '') as string,
          documentType: (row.document_type ?? '') as string,
          summary: (row.summary ?? '') as string,
          payload: row.payload,
          courtCity: extractCourtCity(
            row.payload?.courtCity ||
            row.payload?.primary_court ||
            row.payload?.court_name ||
            row.payload?.court ||
            row.payload?.city ||
            row.payload?.notaryCity ||
            row.payload?.jurisdiction ||
            'شفشاون'
          ),
          status: row.status as JudgeSubmissionStatus,
          decision: (row.decision ?? null) as JudgeDecision | null,
          judgeNotes: (row.judge_notes ?? null) as string | null,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          decidedAt: (row.decided_at ?? null) as string | null,
        }));
    }),

  getSubmission: publicProcedure
    .input(GetSubmissionInputSchema)
    .query(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      return JudgeDeedService.getSubmission(user, input.id);
    }),

  startReview: publicProcedure
    .input(z.object({ sessionToken: z.string(), id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);

      if (user.role !== 'authentication_judge') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مصرح' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('judge_submissions')
        .select('id, status, payload, judge_user_id')
        .eq('id', input.id)
        .single();

      if (existingError || !existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'غير موجود' });
      }

      if (existing.status !== 'pending') {
        return { success: true };
      }

      const existingPayload = existing?.payload && typeof existing.payload === 'object' ? existing.payload : {};
      const isJudicialSpeechFlow = String((existingPayload as any)?.source || '').trim() === 'signed_rasms_send_to_judge';
      if (isJudicialSpeechFlow) {
        const originalApprovedJudgeUserId =
          String(
            (existingPayload as any)?.originalApprovedJudgeUserId ||
            (existingPayload as any)?.originJudgeUserId ||
            existing?.judge_user_id ||
            ''
          ).trim() || null;
        if (originalApprovedJudgeUserId && originalApprovedJudgeUserId !== String(user.id)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'هذا الرسم مخصص لقاضٍ آخر في رواق الخطاب القضائي' });
        }
      }

      const { error } = await supabase
        .from('judge_submissions')
        .update({ status: 'in_review', judge_user_id: user.id })
        .eq('id', input.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      return { success: true };
    }),

  generateInclusionReference: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        registryType: z.enum(['property', 'marriage', 'divorce', 'inheritance', 'other']),
        registryLetter: z.string().min(1).max(8),
      })
    )
    .mutation(async ({ input }) => {
      await requireJudgeSubmission(input.sessionToken, input.id);

      const registryLetter = input.registryLetter.trim();
      const descriptor = buildJudgeInclusionDescriptor(input.registryType, registryLetter);
      const { data, error } = await supabase
        .from('inclusion_registry')
        .select('certificate_number, operation_id')
        .eq('operation_id', descriptor);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      const latestNumber = (data ?? []).reduce((max, row: any) => {
        const n = Number(String(row?.certificate_number ?? '').trim());
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);

      const now = new Date();
      const nextInclusionNumber = latestNumber + 1;
      return {
        descriptor,
        inclusionNumber: nextInclusionNumber,
        registerNumber: computeInclusionRegisterNumber(nextInclusionNumber),
        hijriDate: toHijriDateString(now),
        gregorianDate: toGregorianDateString(now),
      };
    }),

  saveInclusionReference: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        registryType: z.enum(['property', 'marriage', 'divorce', 'inheritance', 'other']),
        registryLetter: z.string().min(1).max(8),
      })
    )
    .mutation(async ({ input }) => {
      const { user, submission, payload, signedDeedId } = await requireJudgeSubmission(input.sessionToken, input.id);

      const registryLetter = input.registryLetter.trim();
      const descriptor = buildJudgeInclusionDescriptor(input.registryType, registryLetter);

      const existingRes = await supabase
        .from('signed_deeds')
        .select('id, inclusion_id')
        .eq('id', signedDeedId)
        .single();

      if (existingRes.error || !existingRes.data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الرسم الموقّع المرتبط غير موجود' });
      }

      const allRowsRes = await supabase
        .from('inclusion_registry')
        .select('id, certificate_number, operation_id')
        .eq('operation_id', descriptor);

      if (allRowsRes.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: allRowsRes.error.message });
      }

      const latestNumber = (allRowsRes.data ?? []).reduce((max, row: any) => {
        const n = Number(String(row?.certificate_number ?? '').trim());
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      const finalNumber = latestNumber + 1;
      const finalRegisterNumber = computeInclusionRegisterNumber(finalNumber);
      const now = new Date();
      const gregorianDate = toGregorianDateString(now);
      const hijriDate = toHijriDateString(now);

      const patch = {
        register_number: String(finalRegisterNumber),
        operation_id: descriptor,
        certificate_number: String(finalNumber),
        inclusion_date: gregorianDate,
        inclusion_hijri: hijriDate || null,
        notary1_name: (submission.notary_name ?? user.full_name ?? null) as string | null,
      };

      let inclusionId = existingRes.data.inclusion_id ? String(existingRes.data.inclusion_id) : null;
      if (inclusionId) {
        const upd = await supabase.from('inclusion_registry').update(patch).eq('id', inclusionId);
        if (upd.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: upd.error.message });
        }
      } else {
        const ins = await supabase.from('inclusion_registry').insert(patch).select('id').single();
        if (ins.error || !ins.data) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ins.error?.message ?? 'تعذر إنشاء مرجع التضمين' });
        }
        inclusionId = String(ins.data.id);
        const deedUpd = await supabase.from('signed_deeds').update({ inclusion_id: inclusionId }).eq('id', signedDeedId);
        if (deedUpd.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deedUpd.error.message });
        }
      }

      const inclusionReference = {
        registryType: input.registryType,
        registryTypeLabel: INCLUSION_REGISTRY_LABELS[input.registryType],
        registryLetter,
        descriptor,
        inclusionNumber: finalNumber,
        registerNumber: finalRegisterNumber,
        hijriDate,
        gregorianDate,
        inclusionId,
        savedAt: now.toISOString(),
      };

      const payloadNext = {
        ...payload,
        inclusionReference,
      };

      const subUpd = await supabase
        .from('judge_submissions')
        .update({ payload: payloadNext })
        .eq('id', input.id);

      if (subUpd.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: subUpd.error.message });
      }

      try {
        await supabase.from('archive_operation_logs').insert({
          signed_deed_id: signedDeedId,
          action_type: 'JUDGE_INCLUSION_REFERENCE',
          timestamp: now.toISOString(),
          user_id: user.id,
          device: null,
          ip: null,
          previous_hash: null,
          new_hash: null,
          metadata: inclusionReference,
        });
      } catch {
        // best-effort
      }

      await invalidateFinalArchivingCache(String(user.id));
      return {
        success: true,
        signedDeedId,
        inclusionReference,
      };
    }),

  generateJudgeCourtStamp: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        courtCity: z
          .string()
          .max(120)
          .optional()
          .default('تطوان')
          .or(z.literal(''))
          .transform((val) => (val && typeof val === 'string' && val.trim() ? val.trim() : 'تطوان')),
        placement: z
          .object({
            signaturePosition: z
              .object({
                x: z.number().min(0).max(1).optional(),
                y: z.number().min(0).max(1).optional(),
                width: z.number().min(0).max(1).optional(),
                height: z.number().min(0).max(1).optional(),
                xRatio: z.number().min(0).max(1).optional(),
                yRatio: z.number().min(0).max(1).optional(),
                wRatio: z.number().min(0).max(1).optional(),
                hRatio: z.number().min(0).max(1).optional(),
                page: z.number().int().positive().optional(),
              })
              .optional(),
            stampPosition: z
              .object({
                x: z.number().min(0).max(1).optional(),
                y: z.number().min(0).max(1).optional(),
                width: z.number().min(0).max(1).optional(),
                height: z.number().min(0).max(1).optional(),
                xRatio: z.number().min(0).max(1).optional(),
                yRatio: z.number().min(0).max(1).optional(),
                wRatio: z.number().min(0).max(1).optional(),
                hRatio: z.number().min(0).max(1).optional(),
                page: z.number().int().positive().optional(),
              })
              .optional(),
            xPct: z.number().min(0).max(1).optional(),
            yPct: z.number().min(0).max(1).optional(),
            widthPct: z.number().min(0).max(1).optional(),
            heightPct: z.number().min(0).max(1).optional(),
            page: z.number().int().positive().optional(),
          })
          .optional(),
        signaturePosition: z
          .object({
            x: z.number().min(0).max(1).optional(),
            y: z.number().min(0).max(1).optional(),
            width: z.number().min(0).max(1).optional(),
            height: z.number().min(0).max(1).optional(),
            xRatio: z.number().min(0).max(1).optional(),
            yRatio: z.number().min(0).max(1).optional(),
            wRatio: z.number().min(0).max(1).optional(),
            hRatio: z.number().min(0).max(1).optional(),
            page: z.number().int().positive().optional(),
          })
          .optional(),
        stampPosition: z
          .object({
            x: z.number().min(0).max(1).optional(),
            y: z.number().min(0).max(1).optional(),
            width: z.number().min(0).max(1).optional(),
            height: z.number().min(0).max(1).optional(),
            xRatio: z.number().min(0).max(1).optional(),
            yRatio: z.number().min(0).max(1).optional(),
            wRatio: z.number().min(0).max(1).optional(),
            hRatio: z.number().min(0).max(1).optional(),
            page: z.number().int().positive().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { user, submission, payload, signedDeedId } = await requireJudgeSubmission(input.sessionToken, input.id);
      const sourcePdf = await resolveJudgeSourcePdfBuffer({ signedDeedId, payload });
      const originalBuffer = sourcePdf.buffer;
      const courtCity = extractCourtCity(
        input.courtCity ||
          (payload.courtCity as string) ||
          (payload.primary_court as string) ||
          (payload.court_name as string) ||
          (payload.court as string) ||
          (payload.city as string) ||
          (payload.notaryCity as string) ||
          'شفشاون'
      );
      const courtLine = `قاضي التوثيق بالمحكمة الابتدائية بـ ${courtCity}`;
      const generatedId =
        String((payload.judgeCourtIdentifier as any)?.id || '').trim() ||
        buildJudgeCourtGeneratedId(input.id, String(submission.file_number || ''), courtCity);
      const gregorianDate = toGregorianDateString(new Date());
      const stampPng = await renderJudgeCourtSealPng({
        courtCity,
        gregorianDate,
        generatedId,
      });
      const protocolPng = await renderJudgeCourtProtocolPng({
        courtCityLine: courtLine,
      });

      // Dual positioning support (normalized 0.0 - 1.0)
      const effSignaturePos = input.signaturePosition || input.placement?.signaturePosition;
      const effStampPos = input.stampPosition || input.placement?.stampPosition;

      let stampedBuffer: Buffer;
      if (effSignaturePos || effStampPos) {
        const stampedRes = await applyJudicialStampAndSignatureToPdf(originalBuffer, {
          signaturePosition: effSignaturePos,
          stampPosition: effStampPos || (typeof input.placement?.xPct === 'number' && Number.isFinite(input.placement.xPct) ? {
            x: input.placement.xPct,
            y: 1.0 - (input.placement.yPct + (input.placement.heightPct || 0.2)),
            width: input.placement.widthPct || 0.25,
            height: input.placement.heightPct || 0.25,
            page: input.placement.page,
          } : undefined),
          signatureImageBuffer: protocolPng,
          stampImageBuffer: stampPng,
          defaultTargetPage: input.placement?.page,
        });
        stampedBuffer = stampedRes.buffer;
      } else {
        // Fallback / legacy placement calculation
        const pdfDoc = await PDFDocument.load(originalBuffer);
        const stampImage = await pdfDoc.embedPng(stampPng);
        const protocolImage = await pdfDoc.embedPng(protocolPng);
        const pages = pdfDoc.getPages();
        const targetPageIndex = input.placement?.page
          ? Math.max(0, Math.min((input.placement.page || pages.length) - 1, pages.length - 1))
          : pages.length - 1;
        const targetPage = pages[targetPageIndex];
        const pageWidth = targetPage.getWidth();
        const pageHeight = targetPage.getHeight();
        const rawWidthPct = typeof input.placement?.widthPct === 'number' && Number.isFinite(input.placement.widthPct)
          ? input.placement.widthPct
          : 0.28;
        const stampWidth = Math.max(72, Math.min(pageWidth, rawWidthPct * pageWidth));
        const stampHeight = stampWidth;

        const rawXPct = typeof input.placement?.xPct === 'number' && Number.isFinite(input.placement.xPct)
          ? input.placement.xPct
          : undefined;
        const rawYPct = typeof input.placement?.yPct === 'number' && Number.isFinite(input.placement.yPct)
          ? input.placement.yPct
          : undefined;

        const requestedX = rawXPct !== undefined
          ? rawXPct * pageWidth
          : pageWidth - stampWidth - 40;
        const requestedY = rawYPct !== undefined
          ? pageHeight - rawYPct * pageHeight - stampHeight
          : pageHeight * 0.14;
        const stampX = Math.max(0, Math.min(pageWidth - stampWidth, Number.isFinite(requestedX) ? requestedX : 40));
        const stampY = Math.max(0, Math.min(pageHeight - stampHeight, Number.isFinite(requestedY) ? requestedY : 40));

        targetPage.drawImage(stampImage, {
          x: stampX,
          y: stampY,
          width: stampWidth,
          height: stampHeight,
          opacity: 0.98,
        });

        const protocolWidth = Math.min(310, pageWidth * 0.46);
        const protocolHeight = protocolWidth * (240 / 700);
        const sealCenterX = stampX + stampWidth / 2;
        const protocolX =
          sealCenterX > pageWidth / 2
            ? 16
            : Math.max(16, pageWidth - protocolWidth - 16);
        const protocolY = Math.max(
          24,
          Math.min(pageHeight - protocolHeight - 24, stampY + stampHeight / 2 - protocolHeight / 2)
        );

        targetPage.drawImage(protocolImage, {
          x: protocolX,
          y: protocolY,
          width: protocolWidth,
          height: protocolHeight,
          opacity: 0.98,
        });

        const stampedBytes = await pdfDoc.save();
        stampedBuffer = Buffer.from(stampedBytes);
      }

      const stampedSha = sha256Hex(stampedBuffer);
      const uploaded = await uploadBufferToDocumentsBucket({
        path: `judge-submissions/${input.id}/court-stamp-${stampedSha}.pdf`,
        buffer: stampedBuffer,
        contentType: 'application/pdf',
        upsert: true,
      });

      const stampedAttachment = {
        name: `judge-court-stamped-${submission.file_number || input.id}.pdf`,
        fileName: `judge-court-stamped-${submission.file_number || input.id}.pdf`,
        url: uploaded.url,
        mimeType: 'application/pdf',
        category: 'judge_court_stamped_pdf',
        file_url: uploaded.url,
      };

      const existingAttachments = Array.isArray(payload.attachments) ? [...(payload.attachments as any[])] : [];
      const filteredAttachments = existingAttachments.filter((raw: any) => {
        const category = String(raw?.category || '').toLowerCase();
        const url = String(raw?.url || raw?.fileUrl || raw?.file_url || '').trim();
        if (category === 'judge_court_stamped_pdf') return false;
        if (url && url === uploaded.url) return false;
        return true;
      });

      const nextPayload = {
        ...payload,
        judgeCourtStamp: {
          createdAt: new Date().toISOString(),
          judgeName: String(user.full_name || '').trim() || null,
          courtCity,
          courtLine,
          courtName:
            String(
              (payload.courtName as string) ||
                (payload.court as string) ||
                (payload.court_name as string) ||
                'المحكمة الابتدائية'
            ).trim() || 'المحكمة الابتدائية',
          sha256: stampedSha,
          url: uploaded.url,
          storagePath: uploaded.path,
        },
        judgeCourtIdentifier: {
          id: generatedId,
          cityCode: buildJudgeCityPrefix(courtCity),
          courtCity,
          createdAt: new Date().toISOString(),
        },
        judgeCourtStampedDoc: stampedAttachment,
        attachments: [stampedAttachment, ...filteredAttachments],
      };

      const subUpd = await supabase
        .from('judge_submissions')
        .update({ payload: nextPayload })
        .eq('id', input.id);

      if (subUpd.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: subUpd.error.message });
      }

      const attExisting = await supabase
        .from('deed_attachments')
        .select('id')
        .eq('record_type', 'signed_deed')
        .eq('record_id', signedDeedId)
        .eq('category', 'judge_court_stamped_pdf')
        .maybeSingle();

      const attachmentPatch = {
        file_name: stampedAttachment.fileName,
        file_url: uploaded.url,
        storage_path: uploaded.path,
        mime_type: 'application/pdf',
        file_size: stampedBuffer.length,
        metadata: {
          judgeCourtStamp: {
            createdAt: new Date().toISOString(),
            judgeSubmissionId: input.id,
            judgeName: String(user.full_name || '').trim() || null,
            sha256: stampedSha,
          },
        },
      };

      if (attExisting.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: attExisting.error.message });
      }

      if (attExisting.data?.id) {
        const upd = await supabase.from('deed_attachments').update(attachmentPatch).eq('id', attExisting.data.id);
        if (upd.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: upd.error.message });
        }
      } else {
        const ins = await supabase.from('deed_attachments').insert({
          record_id: signedDeedId,
          record_type: 'signed_deed',
          category: 'judge_court_stamped_pdf',
          ...attachmentPatch,
        });
        if (ins.error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ins.error.message });
        }
      }

      try {
        await supabase.from('archive_operation_logs').insert({
          signed_deed_id: signedDeedId,
          action_type: 'JUDGE_COURT_STAMP_GENERATED',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          device: null,
          ip: null,
          previous_hash: null,
          new_hash: stampedSha,
          metadata: {
            judgeSubmissionId: input.id,
            url: uploaded.url,
          },
        });
      } catch {
        // best-effort
      }

      return {
        success: true,
        stampedPdfUrl: uploaded.url,
        sha256: stampedSha,
      };
    }),

  generateJudgeCourtIdentifier: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
        courtCity: z
          .string()
          .max(120)
          .optional()
          .default('تطوان')
          .or(z.literal(''))
          .transform((val) => (val && typeof val === 'string' && val.trim() ? val.trim() : 'تطوان')),
      })
    )
    .mutation(async ({ input }) => {
      const { user, submission, payload, signedDeedId } = await requireJudgeSubmission(input.sessionToken, input.id);
      const courtCity =
        String(
          input.courtCity ||
            (payload.courtCity as string) ||
            (payload.city as string) ||
            'الرباط'
        ).trim() || 'الرباط';
      const generatedId =
        String((payload.judgeCourtIdentifier as any)?.id || '').trim() ||
        buildJudgeCourtGeneratedId(input.id, String(submission.file_number || ''), courtCity);
      const baseIdentifier = {
        id: generatedId,
        cityCode: buildJudgeCityPrefix(courtCity),
        courtCity,
        createdAt: new Date().toISOString(),
        judgeName: String(user.full_name || '').trim() || null,
      };

      const nextPayload: Record<string, unknown> = {
        ...payload,
        courtCity,
        judgeCourtIdentifier: baseIdentifier,
      };

      const subUpd = await supabase
        .from('judge_submissions')
        .update({ payload: nextPayload })
        .eq('id', input.id);

      if (subUpd.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: subUpd.error.message });
      }

      try {
        await supabase.from('archive_operation_logs').insert({
          signed_deed_id: signedDeedId,
          action_type: 'JUDGE_COURT_IDENTIFIER_GENERATED',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          device: null,
          ip: null,
          previous_hash: null,
          new_hash: null,
          metadata: {
            judgeSubmissionId: input.id,
            generatedId,
            courtCity,
          },
        });
      } catch {
        // best-effort
      }

      return {
        success: true,
        stampedPdfUrl: null,
        generatedId,
      };
    }),

  revertJudgeCourtStamp: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const { user, payload, signedDeedId } = await requireJudgeSubmission(input.sessionToken, input.id);

      const stampedDoc = payload?.judgeCourtStampedDoc && typeof payload.judgeCourtStampedDoc === 'object'
        ? (payload.judgeCourtStampedDoc as Record<string, unknown>)
        : null;
      const stampedStoragePath = String(
        (payload?.judgeCourtStamp as any)?.storagePath ||
        (payload?.judgeCourtStamp as any)?.storage_path ||
        (stampedDoc?.storagePath as string) ||
        (stampedDoc?.storage_path as string) ||
        ''
      ).trim();

      const existingAttachments = Array.isArray(payload.attachments) ? [...(payload.attachments as any[])] : [];
      const filteredAttachments = existingAttachments.filter((raw: any) => String(raw?.category || '').toLowerCase() !== 'judge_court_stamped_pdf');

      const nextPayload = { ...payload } as Record<string, unknown>;
      delete (nextPayload as any).judgeCourtStamp;
      delete (nextPayload as any).judgeCourtStampedDoc;
      nextPayload.attachments = filteredAttachments;

      const subUpd = await supabase
        .from('judge_submissions')
        .update({ payload: nextPayload })
        .eq('id', input.id);

      if (subUpd.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: subUpd.error.message });
      }

      const deleteAtt = await supabase
        .from('deed_attachments')
        .delete()
        .eq('record_type', 'signed_deed')
        .eq('record_id', signedDeedId)
        .eq('category', 'judge_court_stamped_pdf');

      if (deleteAtt.error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteAtt.error.message });
      }

      if (stampedStoragePath) {
        try {
          await supabase.storage.from('rasm-files').remove([stampedStoragePath]);
        } catch {
          // best-effort
        }
      }

      try {
        await supabase.from('archive_operation_logs').insert({
          signed_deed_id: signedDeedId,
          action_type: 'JUDGE_COURT_STAMP_REVERTED',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          device: null,
          ip: null,
          previous_hash: null,
          new_hash: null,
          metadata: {
            judgeSubmissionId: input.id,
          },
        });
      } catch {
        // best-effort
      }

      return { success: true };
    }),

  decideSubmission: publicProcedure
    .input(DecideSubmissionInputSchema)
    .mutation(async ({ input }) => {
      const user = await requireSession(input.sessionToken);
      const result = await JudgeDeedService.decideSubmission(user, input);
      await invalidateFinalArchivingCache(String(user.id));
      return result;
    }),
});

export type JudgeRouter = typeof judgeRouter;
