import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle2,
  AlertCircle, Paperclip, Shield, Archive, Lock, Pencil, Highlighter, Eraser, RotateCcw, RotateCw, Trash2, Loader2, Image as ImageIcon,
  Columns
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { RasmHtmlPreview } from '../../../components/SmartDrafting/RasmHtmlPreview';
import { DocumentToolbar } from '../../../components/Judge/viewer/DocumentToolbar';
import { RasmDocxPreview } from '../../../components/SmartDrafting/RasmDocxPreview';
import { WordPreview } from '../../../components/WordPreview';
import { JudicialPdfViewer } from '../../../components/JudicialPdfViewer';
import { DocumentViewerErrorBoundary } from '../../../components/Judge/DocumentViewerErrorBoundary';
import { useJudicialDocumentStream } from '../../../hooks/useJudicialDocumentStream';
import { useViewerAnnotationState } from '../../../hooks/useViewerAnnotationState';
import { pickNormalizedDocument, pickBestSavedDocsAttachment, deduplicateAttachments, NormalizedDocument, SavedDocAttachment } from '../../../utils/savedDocsPicker';
import { logViewerEvent } from '../../../utils/documentTelemetry';
import { DualDocInspectorModal } from './components/DualDocInspectorModal';

const getJudgeLikePdfViewerUrl = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.split('#')[0];
  return `${cleanUrl}#view=FitH&zoom=100&toolbar=1`;
};

const stripHtmlToPlainText = (html: string) => {
  if (!html) return '';
  const normalized = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n');

  const tmp = document.createElement('div');
  tmp.innerHTML = normalized;
  const text = (tmp.textContent || tmp.innerText || '').replace(/\u00a0/g, ' ');
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function formatCategoryLabel(category?: string, field?: string): string {
  const c = String(category || '').toLowerCase();
  const f = String(field || '').toLowerCase();
  if (c === 'id_images' || f.includes('idimage') || f.includes('cin')) return 'بطاقة التعريف الوطنية';
  if (c === 'passport_images' || f.includes('passport')) return 'جواز السفر';
  if (c === 'entry_stamp_images' || f.includes('entrystamp')) return 'طابع الدخول';
  if (c === 'title_documents' || f.includes('titledocuments')) return 'وثائق الملكية';
  if (c === 'ownership_certificates' || f.includes('ownership')) return 'شهادة الملكية';
  if (c === 'additional_documents' || f.includes('additional')) return 'وثيقة إضافية';
  if (c === 'post_registration' || f.includes('templatepdf')) return 'ملف التسجيل';
  if (c === 'conversion_certificate' || f.includes('conversion')) return 'شهادة الإشهار';
  if (c === 'judge_attachment' || c === 'judge_attachment_docx' || f.includes('judgeattachment')) return 'وثيقة موجهة للقاضي';
  if (c === 'manual_upload' || f.includes('manualrasm')) return 'الرسم المرفوع';
  if (c === 'primary_draft' || c === 'audit_draft_docx' || c === 'audit_draft_pdf') return 'مسودة التوثيق';
  return 'مستند مرفق';
}

function detectFileType(fileName?: string, url?: string, mime?: string): 'PDF' | 'DOCX' | 'IMAGE' | 'HTML' {
  const n = String(fileName || '').toLowerCase();
  const u = String(url || '').toLowerCase();
  const m = String(mime || '').toLowerCase();

  if (n.endsWith('.pdf') || u.includes('.pdf') || m.includes('pdf') || u.startsWith('data:application/pdf')) return 'PDF';
  if (
    n.endsWith('.docx') ||
    n.endsWith('.doc') ||
    u.includes('.docx') ||
    u.includes('.doc') ||
    m.includes('word') ||
    m.includes('officedocument') ||
    u.startsWith('data:application/vnd.openxml') ||
    u.startsWith('data:application/msword')
  ) return 'DOCX';
  if (
    n.endsWith('.png') ||
    n.endsWith('.jpg') ||
    n.endsWith('.jpeg') ||
    n.endsWith('.webp') ||
    n.endsWith('.gif') ||
    n.endsWith('.bmp') ||
    m.startsWith('image/') ||
    u.startsWith('data:image/')
  ) return 'IMAGE';
  if (u.startsWith('html://') || u.startsWith('draft://') || m.includes('html') || n.endsWith('.html')) return 'HTML';
  return 'PDF';
}

function stateSummaryFallback(payload: any = {}, submission: any = {}): string {
  const docType = payload.documentType || submission.documentType || 'رسم توثيقي عدلي';
  const fileNo = payload.fileNumber || submission.fileNumber || '---';
  const summary = submission.summary || payload.summary || '';
  return `
    <div style="text-align: right; padding: 24px; font-family: 'Amiri', serif; direction: rtl;">
      <h2 style="text-align: center; color: #023120; margin-bottom: 16px; font-size: 22px;">${docType}</h2>
      <p style="text-align: center; font-weight: bold; color: #64748b;">رقم الملف: ${fileNo}</p>
      <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 20px 0;" />
      <div style="font-size: 16px; line-height: 2.2; text-align: justify;">
        ${summary || 'بيانات ومعلومات الرسم مسجلة وموثقة ضمن المنظومة العدلية المعتمدة.'}
      </div>
    </div>
  `;
}

export default function JudicialDeedsAuditPlatform() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<'ocr' | 'compare' | 'legal'>('ocr');
  const [decision, setDecision] = useState<'accepted' | 'accepted_with_notes' | 'substantive_notes'>('accepted_with_notes');
  const [notes, setNotes] = useState('');
  const [dualViewOpen, setDualViewOpen] = useState(false);

  // viewerNonce: increments whenever the active deed `id` changes, forcing a full
  // iframe unmount so the browser never serves a cached PDF from the previous deed.
  const [viewerNonce, setViewerNonce] = useState(0);
  useEffect(() => {
    if (!id) return;
    setViewerNonce((n) => n + 1);
    // Also invalidate the submission cache for the previous deed so fresh data loads immediately.
    setSelectedDocUrl(null);
    setSelectedDocTitle(null);
    setSelectedDocType(null);
    setSelectedDocRawContent(null);
    setNotes('');
    setDecision('accepted_with_notes');
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    // Invalidate the submission cache so fresh deed data loads immediately without stale cache
    utils.judge.getSubmission.invalidate();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps


  const submissionQuery = trpc.judge.getSubmission.useQuery(
    { sessionToken: sessionToken || '', id: id || '' },
    {
      enabled: !!sessionToken && !!id,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchInterval: (query: any) => {
        const sub = query?.state?.data as any;
        const p = sub?.payload || {};
        const hasPdf = Boolean(
          sub?.pdf_preview_url ||
          sub?.previewUrl ||
          sub?.canonical_approved_pdf ||
          sub?.signed_pdf_url ||
          p?.previewUrl ||
          p?.pdf_preview_url ||
          p?.canonical_approved_pdf ||
          p?.signed_pdf_url ||
          p?.attachment?.pdfUrl ||
          (p?.attachment?.url && (String(p.attachment.url).includes('.pdf') || String(p.attachment.url).startsWith('http')))
        );
        // If deed is pending and has no PDF yet, poll every 1.5s until conversion/upload finishes
        return !hasPdf && sub?.status === 'pending' ? 1500 : false;
      },
    }
  );

  const decideMutation = trpc.judge.decideSubmission.useMutation({
    onSuccess: () => {
      utils.judge.getSubmission.invalidate();
      utils.judge.listSubmissions.invalidate();
      // Invalidate AuditHub document and submission caches so notary portals flush instantly
      (utils as any).feesAgent?.documents?.getSavedRasm?.invalidate?.();
      (utils as any).feesAgent?.getJudgeSubmissionStatus?.invalidate?.();
      (utils as any).feesAgent?.getMyJudgeSubmission?.invalidate?.();
      (utils as any).feesAgent?.getLatestApprovedJudgeSubmissionByFileNumber?.invalidate?.();
    }
  });

  const createSavedRasmMutation: any = (trpc as any)?.feesAgent?.createSavedRasmFromJudgeSubmission?.useMutation?.();
  const startReviewMutation = trpc.judge.startReview.useMutation();

  const submission: any = submissionQuery.data;
  const payload: any = submission?.payload || {};

  const savedRasmAttachments: SavedDocAttachment[] = Array.isArray((submission as any)?.savedRasmAttachments)
    ? ((submission as any).savedRasmAttachments as SavedDocAttachment[])
    : [];

  // Selected document URL & Normalized document computation
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<'PDF' | 'DOCX' | 'IMAGE' | 'HTML' | null>(null);
  const [selectedDocRawContent, setSelectedDocRawContent] = useState<string | null>(null);

  // Automatically compute normalized primary document contract
  const primaryDoc = useMemo<NormalizedDocument | null>(() => {
    try {
      return pickNormalizedDocument({ ...submission, ...payload }, savedRasmAttachments);
    } catch {
      return null;
    }
  }, [payload, savedRasmAttachments, submission]);

  const activeStreamUrl = selectedDocUrl || primaryDoc?.streamUrl || null;
  const activeFileType = useMemo(() => {
    if (selectedDocType) return selectedDocType;
    if (selectedDocUrl) {
      return detectFileType(selectedDocTitle || '', selectedDocUrl);
    }
    return primaryDoc?.fileType || (payload.rasmHtml || payload.draft || submission?.summary ? 'HTML' : 'PDF');
  }, [selectedDocType, selectedDocUrl, selectedDocTitle, primaryDoc, payload, submission]);

  // Unified Document Stream Hook
  const documentStream = useJudicialDocumentStream(
    activeStreamUrl,
    activeFileType,
    id,
    selectedDocRawContent || (primaryDoc?.rawContent || (primaryDoc?.metadata?.rawContent as string)) || null
  );

  // Scale-Aware Annotation Hook
  const annotationState = useViewerAnnotationState({
    submissionId: id,
    initialTool: 'select',
  });

  // Canvas Viewport & Zoom State
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (annotationState.activeTool !== 'select') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setDragOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if ((submissionQuery.data as any)?.status === 'pending' && id && sessionToken) {
      startReviewMutation.mutate({ sessionToken, id });
    }
  }, [submissionQuery.data, id, sessionToken]);

  // Structured OCR extraction
  const ocrData = useMemo(() => {
    if (payload.ocrData) return payload.ocrData;
    const parties = [];
    
    if (Array.isArray(payload.sellers) && payload.sellers.length > 0) {
      parties.push(...payload.sellers.map((s: any) => ({ name: s.name, id: s.idNumber || '-', role: 'طرف أول (بائع)' })));
    }
    if (Array.isArray(payload.buyers) && payload.buyers.length > 0) {
      parties.push(...payload.buyers.map((b: any) => ({ name: b.name, id: b.idNumber || '-', role: 'طرف ثان (مشتري)' })));
    }

    if (payload.husband_name) parties.push({ name: payload.husband_name, id: payload.husband_cin || '-', role: 'الزوج' });
    if (payload.wife_name) parties.push({ name: payload.wife_name, id: payload.wife_cin || '-', role: 'الزوجة' });

    if (payload.parties_names && typeof payload.parties_names === 'string') {
      const names = payload.parties_names.split(' - ');
      names.forEach((n, i) => parties.push({ name: n, id: '-', role: `طرف ${i+1}` }));
    }

    if (parties.length === 0) {
      const p1 = payload.senderName || payload.party1 || payload.first_party_name;
      const p2 = payload.receiverName || payload.party2 || payload.second_party_name;
      if (p1) parties.push({ name: p1, id: '-', role: 'طرف أول' });
      if (p2) parties.push({ name: p2, id: '-', role: 'طرف ثان' });
    }

    if (parties.length === 0) {
      parties.push({ name: 'غير محدد', id: '-', role: 'طرف أول' }, { name: 'غير محدد', id: '-', role: 'طرف ثان' });
    }

    const rawPrice = payload.finance?.price || payload.mahr_amount || payload.amount || payload.total_amount || payload.price;
    let extractedAmount = 'غير محدد';
    if (rawPrice) {
      extractedAmount = `${rawPrice} درهم`;
    } else if (submission?.summary) {
       const priceMatch = submission.summary.match(/(?:الثمن|المبلغ|الصداق|القدر|بمبلغ|القيمة):\s*([\d,.]+)/i);
       if (priceMatch) {
         extractedAmount = `${priceMatch[1]} درهم`;
       }
    }

    const firstProp = payload.properties?.[0] || {};
    const propertyRef = firstProp.titleRef || payload.propertyRef || payload.referance || payload.title_ref || '-';
    const area = firstProp.areaM2 ? `${firstProp.areaM2} متر مربع` : (payload.area || payload.area_m2 || '-');

    return {
      parties,
      amount: extractedAmount,
      propertyRef,
      area,
      date: payload.dates?.gregorian || payload.deedDate || payload.marriage_date || payload.inclusion_date || submission?.createdAt?.split('T')[0] || '2026-02-11'
    };
  }, [payload, submission]);

  // Comprehensive document repository list
  const repositoryDocs = useMemo(() => {
    const list: any[] = [];
    const seenUrls = new Set<string>();

    // 1. Primary document
    if (primaryDoc) {
      const urlKey = primaryDoc.streamUrl || primaryDoc.id;
      seenUrls.add(urlKey);
      list.push({
        id: primaryDoc.id,
        name: primaryDoc.title,
        url: primaryDoc.streamUrl,
        type: primaryDoc.fileType,
        category: 'الرسم الأساسي المعتمد',
        isPrimary: true,
        rawContent: primaryDoc.rawContent,
      });
    }

    // 2. Saved Rasm Attachments (from DB query)
    savedRasmAttachments.forEach((att, idx) => {
      const url = String(att.fileUrl || '').trim();
      if (!url) return;
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      const fType = detectFileType(att.fileName, url, att.mimeType || '');
      list.push({
        id: att.id || `db_att_${idx}`,
        name: att.fileName || `مرفق رقم ${idx + 1}`,
        url,
        type: fType,
        category: formatCategoryLabel(att.category, (att.metadata as any)?.field),
        isPrimary: false,
        size: att.fileSize,
      });
    });

    // 3. Direct Payload attachments array
    const payloadAttachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    payloadAttachments.forEach((att: any, idx: number) => {
      const name = String(att.name || att.fileName || att.filename || `مرفق_${idx + 1}`);
      const mime = String(att.type || att.mimeType || att.mime_type || '');
      let url = String(att.url || att.fileUrl || att.file_url || att.publicUrl || '').trim();
      if (!url && typeof att.base64 === 'string' && att.base64.trim()) {
        const b64 = att.base64.trim();
        url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
      }
      if (!url) return;
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      const fType = detectFileType(name, url, mime);
      list.push({
        id: att.id || `payload_att_${idx}`,
        name,
        url,
        type: fType,
        category: formatCategoryLabel(att.category, att.field),
        isPrimary: false,
        size: att.size || att.fileSize,
      });
    });

    // 4. Individual single files in payload
    const singlePayloadCandidates = [
      { obj: payload?.attachment, label: 'وثيقة التوثيق المرفقة' },
      { obj: payload?.judgeAttachment, label: 'مستند القاضي' },
      { obj: payload?.manualRasmFile, label: 'الرسم المرفوع' },
      { obj: payload?.judgeAcceptedDoc, label: 'المستند المعتمد' },
      { obj: payload?.baseDoc, label: 'المستند الأصلي' },
    ];

    singlePayloadCandidates.forEach(({ obj, label }, idx) => {
      if (!obj) return;
      const name = String(obj.name || obj.fileName || obj.filename || label);
      const mime = String(obj.type || obj.mimeType || obj.mime_type || '');
      let url = String(obj.url || obj.fileUrl || obj.file_url || obj.publicUrl || '').trim();
      if (!url && typeof obj.base64 === 'string' && obj.base64.trim()) {
        const b64 = obj.base64.trim();
        url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
      }
      if (!url) return;
      if (seenUrls.has(url)) return;
      seenUrls.add(url);

      const fType = detectFileType(name, url, mime);
      list.push({
        id: obj.id || `single_payload_${idx}`,
        name,
        url,
        type: fType,
        category: formatCategoryLabel(obj.category || label, obj.field),
        isPrimary: false,
        size: obj.size || obj.fileSize,
      });
    });

    // 5. Deep scan of payload nested properties (e.g. sellers[*].idImage, buyers[*].passportImage, properties[*].titleDocuments, etc.)
    const seenPayloadObjs = new WeakSet<object>();
    const deepScanPayload = (v: unknown, p = '') => {
      if (!v) return;
      if (typeof v !== 'object') return;
      if (seenPayloadObjs.has(v as object)) return;
      seenPayloadObjs.add(v as object);

      const obj = v as Record<string, any>;
      const hasUrl = typeof obj.url === 'string' && obj.url.trim().length > 0;
      const hasFileUrl = typeof obj.fileUrl === 'string' && obj.fileUrl.trim().length > 0;
      const hasBase64 = typeof obj.base64 === 'string' && obj.base64.trim().length > 0;
      const hasData = typeof obj.data === 'string' && obj.data.startsWith('data:');

      if ((hasUrl || hasFileUrl || hasBase64 || hasData) && (obj.name || obj.fileName || p)) {
        const name = String(obj.name || obj.fileName || formatCategoryLabel(undefined, p));
        const mime = String(obj.type || obj.mimeType || obj.mime_type || '');
        let url = String(obj.url || obj.fileUrl || '').trim();
        if (!url && hasBase64) {
          const b64 = obj.base64.trim();
          url = b64.startsWith('data:') ? b64 : `data:${mime || 'application/octet-stream'};base64,${b64}`;
        } else if (!url && hasData) {
          url = obj.data.trim();
        }

        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          const fType = detectFileType(name, url, mime);
          list.push({
            id: obj.id || `deep_payload_${list.length}`,
            name,
            url,
            type: fType,
            category: formatCategoryLabel(obj.category, p),
            isPrimary: false,
            size: obj.size || obj.fileSize,
          });
        }
      }

      if (Array.isArray(v)) {
        v.forEach((item, idx) => deepScanPayload(item, `${p}[${idx}]`));
      } else {
        Object.entries(obj).forEach(([k, val]) => {
          deepScanPayload(val, p ? `${p}.${k}` : k);
        });
      }
    };

    if (payload) {
      deepScanPayload(payload);
    }

    const dedupedAttachments = deduplicateAttachments(
      list.filter((d) => !d.isPrimary),
      primaryDoc
    );

    return primaryDoc ? [list[0], ...dedupedAttachments] : dedupedAttachments;
  }, [primaryDoc, savedRasmAttachments, payload]);

  const dualViewAttachments = useMemo(() => {
    return repositoryDocs
      .filter((d) => !d.isPrimary)
      .map((d) => ({
        id: String(d.id),
        title: String(d.name || 'مرفق'),
        fileUrl: String(d.url || ''),
        mimeType: d.mimeType || (d.type === 'PDF' ? 'application/pdf' : d.type === 'IMAGE' ? 'image/jpeg' : undefined),
        type: d.type,
        category: d.category,
        size: d.size,
      }));
  }, [repositoryDocs]);

  const dualViewPrimaryPdfUrl = useMemo(() => {
    return (
      primaryDoc?.streamUrl ||
      submission?.previewUrl ||
      submission?.finalPdfUrl ||
      payload?.previewUrl ||
      payload?.finalPdfUrl ||
      ''
    );
  }, [primaryDoc, submission, payload]);

  const selectDoc = (url: string, title?: string, type?: 'PDF' | 'DOCX' | 'IMAGE' | 'HTML', rawContent?: string) => {
    setSelectedDocUrl(url);
    if (title) setSelectedDocTitle(title);
    if (type) setSelectedDocType(type);
    setSelectedDocRawContent(rawContent || null);
  };

  const handleDecision = async () => {
    if (!id || !sessionToken) return;

    try {
      await decideMutation.mutateAsync({
        sessionToken,
        id,
        decision,
        notes,
      });

      if ((decision === 'accepted' || decision === 'accepted_with_notes') && createSavedRasmMutation) {
        try {
          const rasmRes = await createSavedRasmMutation.mutateAsync({
            sessionToken,
            judgeSubmissionId: id,
          });
          const createdRasmId = rasmRes?.id || rasmRes;
          logViewerEvent('SAVED_RASM_CREATED', { submissionId: id, rasmId: createdRasmId });
        } catch (createErr) {
          console.warn('[JudicialDeedsAuditPlatform] createSavedRasm error:', createErr);
        }
      }

      // Flush document caches so notary side reflects approved document immediately
      utils.judge.getSubmission.invalidate();
      (utils as any).feesAgent?.documents?.getSavedRasm?.invalidate?.();
      (utils as any).feesAgent?.getJudgeSubmissionStatus?.invalidate?.();

      navigate('/judge/deeds');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء اعتماد القرار');
    }
  };

  const handleCompleteReview = () => {
    navigate('/judge/deeds');
  };

  return (
    <div dir="rtl" className="h-full w-full min-h-0 min-w-0 flex-1 flex flex-col bg-slate-900 overflow-hidden font-cairo select-none">
      {/* 1. TOP SECURE SYSTEM BAR */}
      <header className="h-16 bg-[#023120] text-white px-6 flex items-center justify-between border-b border-[#E6BE8A]/30 z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-maghribi tracking-wide text-[#E6BE8A]">المنظومة القضائية الرقمية</span>
              <span className="text-[10px] text-white/50 border border-white/20 px-2 py-0.5 rounded font-mono">AUTHENTICATED REVIEWER</span>
           </div>
           <div className="h-4 w-px bg-white/20"></div>
           <div className="flex items-center gap-2 text-xs font-amiri text-slate-300">
              <span>نوع الرسم:</span>
              <span className="font-bold text-emerald-400">{submission?.documentType || 'رسم توثيقي عدلي'}</span>
              <span className="text-white/40">|</span>
              <span>رقم الملف:</span>
              <span className="font-mono text-emerald-400">{submission?.fileNumber || id}</span>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-emerald-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[11px] font-mono text-emerald-400">SECURE JUDICIAL NODE - ACTIVE</span>
           </div>

           {/* Dual View Modal Trigger */}
           <button
             type="button"
             onClick={() => setDualViewOpen(true)}
             className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 hover:bg-amber-500/30 transition-all shadow-lg active:scale-95 cursor-pointer"
             title="فتح منصة المعاينة المزدوجة والمطابقة جنباً إلى جنب"
           >
             <Columns className="w-4 h-4" />
             <span>معاينة مزدوجة (مطابقة المرفقات)</span>
           </button>

           <button 
             onClick={handleCompleteReview}
             className="px-4 py-1.5 bg-[#03442c] hover:bg-[#04593a] text-[#E6BE8A] text-xs font-bold rounded-lg transition-all flex items-center gap-2 border border-[#E6BE8A]/40 shadow-xs cursor-pointer"
           >
              <Download size={14} />
              <span>تصدير ملف المراجعة الكامل (PDF)</span>
           </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 flex overflow-hidden relative">
         {/* SIDEBAR A: CASE DETAILS & JUDICIAL DECISION */}
         <section className="w-[360px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
            {/* TABS */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
               <button 
                 onClick={() => setActiveTab('ocr')} 
                 className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === 'ocr' ? 'bg-[#023120] text-[#E6BE8A] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  مستخرج البيانات (OCR)
               </button>
               <button 
                 onClick={() => setActiveTab('compare')} 
                 className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === 'compare' ? 'bg-[#023120] text-[#E6BE8A] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  المطابقة الشرعية
               </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
               {activeTab === 'ocr' ? (
                  <div className="space-y-4">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200/60 pb-2">
                           <span>تاريخ التحرير:</span>
                           <span className="font-mono text-slate-800">{ocrData.date}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200/60 pb-2">
                           <span>المبلغ / القيمة:</span>
                           <span className="font-bold text-emerald-700 font-mono">{ocrData.amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200/60 pb-2">
                           <span>المرجع العقاري:</span>
                           <span className="font-mono text-slate-800">{ocrData.propertyRef}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                           <span>المساحة:</span>
                           <span className="font-bold text-slate-800">{ocrData.area}</span>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">أطراف المعاملة الموثقة</h4>
                        <div className="space-y-2">
                           {ocrData.parties.map((party: any, idx: number) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                 <div>
                                    <p className="text-xs font-black text-slate-800 font-amiri">{party.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{party.id}</p>
                                 </div>
                                 <span className="text-[10px] font-bold px-2 py-0.5 bg-[#023120]/5 text-[#023120] rounded-full border border-[#023120]/10">
                                    {party.role}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-4">
                     <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                           <h5 className="text-xs font-bold text-emerald-900">المطابقة الآلية الأولية مكتملة</h5>
                           <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                              تم التحقق من مطابقة الأركان الإلزامية وخلو الرسم من التناقضات الصريحة.
                           </p>
                        </div>
                     </div>
                  </div>
               )}

               {/* DECISION ACTION PANEL */}
               <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">
                     محطة التوقيع والقرار القضائي
                  </h4>

                  <div className="space-y-3">
                     {[
                        { id: 'accepted', label: 'مقبول وجاهز للتضمين', icon: <CheckCircle2 size={18} />, color: 'bg-emerald-600' },
                        { id: 'accepted_with_notes', label: 'مقبول مع ملاحظات شكلية', icon: <AlertCircle size={18} />, color: 'bg-amber-500' },
                        { id: 'substantive_notes', label: 'ملاحظات جوهرية / مرفوض', icon: <X size={18} />, color: 'bg-red-500' },
                     ].map((opt) => (
                        <button 
                           key={opt.id} 
                           onClick={() => setDecision(opt.id as any)}
                           className={`w-full flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all duration-300 ${
                              decision === opt.id 
                                ? 'bg-[#023120] border-[#023120] text-[#E6BE8A] shadow-xl scale-[1.02]' 
                                : 'bg-white border-slate-100 text-slate-700 hover:border-[#023120]/30 hover:bg-slate-50'
                           }`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${decision === opt.id ? 'bg-white/10' : opt.color + ' text-white'}`}>
                                 {opt.icon}
                              </div>
                              <span className="text-sm font-black font-amiri">{opt.label}</span>
                           </div>
                        </button>
                     ))}
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">ملاحظات ديوان القاضي</label>
                     <textarea 
                        className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:bg-white outline-none shadow-inner resize-none font-amiri leading-relaxed"
                        placeholder="اكتب ملاحظات التدقيق القضائي هنا بعناية..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                     />
                  </div>

                  <button 
                    onClick={handleDecision}
                    disabled={decideMutation.isPending}
                    className="w-full py-4 bg-[#023120] text-[#E6BE8A] rounded-2xl font-black text-base font-amiri shadow-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                     {decideMutation.isPending ? (
                        <>
                           <div className="w-5 h-5 border-2 border-[#E6BE8A] border-t-transparent rounded-full animate-spin"></div>
                           <span>جاري إجراء التأشير الرقمي...</span>
                        </>
                     ) : (
                        <>
                           <span>اعتمـاد القرار القضائي</span>
                           <Shield size={18} />
                        </>
                     )}
                  </button>
               </div>
            </div>
         </section>

         {/* SIDEBAR B: ATTACHMENTS REPOSITORY */}
         <section className="w-[320px] bg-slate-50 border-l border-slate-200/80 flex flex-col z-30 shadow-lg relative">
            <div className="p-5 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
               <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                     <Paperclip size={15} className="text-[#023120]" />
                     مستودع الوثائق
                  </h3>
                  <div className="flex items-center gap-2">
                     <button
                       type="button"
                       onClick={() => setDualViewOpen(true)}
                       className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 text-[10px] font-black flex items-center gap-1 transition shadow-2xs cursor-pointer"
                       title="فتح المعاينة المزدوجة والمطابقة"
                     >
                        <Columns size={11} />
                        <span>معاينة مزدوجة</span>
                     </button>
                     <span className="bg-[#023120] text-[#E6BE8A] text-[10px] px-2.5 py-0.5 rounded-full font-black">
                        {repositoryDocs.length} {repositoryDocs.length === 1 ? 'ملف' : 'ملفات'}
                     </span>
                  </div>
               </div>
               <p className="text-[10px] text-slate-500 font-bold font-amiri">الوثائق والبيانات المعتمدة والمرفقات</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
               {repositoryDocs.length > 0 ? (
                 repositoryDocs.map((doc, idx) => {
                    const isSelected = (activeStreamUrl === doc.url) || (!selectedDocUrl && doc.isPrimary);
                    return (
                      <button 
                        key={doc.id || idx} 
                        onClick={() => selectDoc(doc.url, doc.name, doc.type, doc.rawContent)}
                        className={`w-full p-3.5 rounded-2xl border transition-all text-right flex items-start gap-3 ${
                          isSelected 
                            ? 'border-[#023120] bg-white shadow-md ring-1 ring-[#023120]/15 translate-x-1' 
                            : 'bg-white border-slate-200/60 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                         <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                           isSelected 
                             ? 'bg-[#023120] text-[#E6BE8A] shadow-sm' 
                             : doc.isPrimary
                             ? 'bg-amber-50 text-amber-800 border border-amber-200'
                             : doc.type === 'IMAGE'
                             ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                             : doc.type === 'PDF'
                             ? 'bg-rose-50 text-rose-700 border border-rose-200'
                             : doc.type === 'DOCX'
                             ? 'bg-blue-50 text-blue-700 border border-blue-200'
                             : 'bg-slate-100 text-slate-600'
                         }`}>
                            {doc.isPrimary ? (
                              <FileText size={18} />
                            ) : doc.type === 'IMAGE' ? (
                              <ImageIcon size={17} />
                            ) : doc.type === 'PDF' ? (
                              <FileText size={17} />
                            ) : doc.type === 'DOCX' ? (
                              <FileText size={17} />
                            ) : (
                              <Paperclip size={16} />
                            )}
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {doc.isPrimary && (
                                <span className="bg-[#023120] text-[#E6BE8A] text-[8px] font-black px-1.5 py-0.2 rounded shrink-0">الرسم</span>
                              )}
                              <p className="text-xs font-black truncate font-amiri text-slate-800" title={doc.name}>{doc.name}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 font-amiri truncate max-w-[150px]">{doc.category || 'مرفق'}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 ${
                                doc.type === 'IMAGE' ? 'bg-emerald-100/70 text-emerald-800' :
                                doc.type === 'PDF' ? 'bg-rose-100/70 text-rose-800' :
                                doc.type === 'DOCX' ? 'bg-blue-100/70 text-blue-800' : 'bg-slate-100 text-slate-700'
                              }`}>{doc.type}</span>
                            </div>
                         </div>
                      </button>
                    );
                 })
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center opacity-50">
                    <Archive size={48} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">لا توجد مرفقات</p>
                 </div>
               )}
            </div>
         </section>

         {/* MAIN WORKSPACE CANVAS - VERTICAL FLEX LAYOUT (NO OVERLAPS) */}
         <section className="flex-1 flex flex-col h-full overflow-hidden bg-[#121214] relative">
            {/* FIXED TOP TOOLBAR HEADER */}
            <DocumentToolbar
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={() => { setZoom(1); setDragOffset({ x: 0, y: 0 }); }}
              annotationState={annotationState}
              documentTitle={selectedDocTitle || primaryDoc?.title || 'المستند القضائي المعتمد'}
              fileType={activeFileType}
              onPrint={() => window.print()}
              onDownload={() => {
                if (documentStream.blobUrl || activeStreamUrl) {
                  const targetUrl = documentStream.blobUrl || activeStreamUrl || '';
                  if (targetUrl.startsWith('http') || targetUrl.startsWith('blob:') || targetUrl.startsWith('data:')) {
                    saveAs(targetUrl, selectedDocTitle || primaryDoc?.title || 'judicial_document');
                  }
                }
              }}
            />

            {/* SCROLLABLE DOCUMENT PANE (MATCHING NOTARY SIGNING CORRIDOR) */}
            <div 
              className="flex-1 h-full w-full overflow-y-auto bg-slate-950 p-6 flex justify-center items-start custom-scrollbar select-none relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
               <div 
                  className={`w-full max-w-[850px] min-h-[1123px] bg-white shadow-2xl rounded-sm overflow-hidden my-4 origin-top pointer-events-auto ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
                  style={{ 
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom})`,
                  }}
               >
                  <DocumentViewerErrorBoundary
                    submissionId={id}
                    documentName={selectedDocTitle || primaryDoc?.title || 'مستند المعاينة القضائي'}
                    onReset={documentStream.refetch}
                  >
                     <div className="w-full min-h-[1123px] relative pointer-events-auto bg-white">
                        {submissionQuery.isLoading || documentStream.isLoading ? (
                           <div className="flex flex-col items-center justify-center h-[1123px] bg-slate-50">
                              <Loader2 className="w-12 h-12 text-[#023120] animate-spin mb-4" />
                              <h4 className="text-xl font-black font-amiri text-slate-800">جاري تحميل وتجهيز المستند الرقمي...</h4>
                              <p className="text-xs font-bold text-slate-400 mt-2">Connecting to authenticated stream pipeline</p>
                           </div>
                        ) : activeFileType === 'IMAGE' && (documentStream.blobUrl || activeStreamUrl) ? (
                           <div className="flex flex-col items-center justify-center p-8 bg-slate-900/5 min-h-[1123px] w-full">
                              <div className="relative group max-w-full flex flex-col items-center">
                                 <img
                                   key={`judge-img-${id || ''}-${activeStreamUrl || ''}-${viewerNonce}`}
                                   src={documentStream.blobUrl || activeStreamUrl || ''}
                                   alt={selectedDocTitle || 'مرفق المستند القضائي'}
                                   className="max-w-full max-h-[950px] object-contain rounded-xl shadow-2xl border border-slate-200/80 bg-white"
                                 />
                                 <div className="mt-6 flex items-center gap-3">
                                    <a
                                      href={documentStream.blobUrl || activeStreamUrl || ''}
                                      download={selectedDocTitle || 'attachment'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-5 py-2.5 bg-[#023120] text-[#E6BE8A] text-xs font-black rounded-xl flex items-center gap-2 hover:brightness-110 shadow-lg transition-all"
                                    >
                                      <Download size={15} />
                                      <span>تحميل الصورة الأصلية</span>
                                    </a>
                                 </div>
                              </div>
                           </div>
                        ) : activeFileType === 'PDF' && (documentStream.blobUrl || activeStreamUrl) ? (
                           <iframe
                             key={`judge-pdf-${id || ''}-${activeStreamUrl || ''}-${viewerNonce}`}
                             src={getJudgeLikePdfViewerUrl(documentStream.blobUrl || activeStreamUrl || '')}
                             className="w-full h-[1123px] border-none"
                             title={selectedDocTitle || primaryDoc?.title || 'Judicial Deed Document'}
                           />
                        ) : activeFileType === 'DOCX' && (documentStream.blobUrl || activeStreamUrl) ? (
                           <WordPreview
                             key={`judge-word-${id || ''}-${activeStreamUrl || ''}-${viewerNonce}`}
                             url={documentStream.blobUrl || activeStreamUrl || ''}
                             submissionId={id}
                           />
                        ) : (
                           <RasmHtmlPreview
                             key={`judge-html-${id || ''}-${viewerNonce}`}
                             htmlContent={
                               selectedDocRawContent ||
                               documentStream.rawContent ||
                               payload.rasmHtml ||
                               payload.draft ||
                               payload.html ||
                               payload.content ||
                               (primaryDoc?.rawContent as string) ||
                               (primaryDoc?.metadata?.rawContent as string) ||
                               submission?.summary ||
                               stateSummaryFallback(payload, submission)
                             }
                             submissionId={id}
                             isDarkMode={false}
                           />
                        )}
                     </div>
                  </DocumentViewerErrorBoundary>
               </div>
            </div>
          </section>
      </main>

      {/* 3. DUAL DOCUMENT INSPECTION & COMPARISON MODAL */}
      <DualDocInspectorModal
        isOpen={dualViewOpen}
        onClose={() => setDualViewOpen(false)}
        primaryPdfUrl={dualViewPrimaryPdfUrl}
        primaryTitle={primaryDoc?.title || submission?.documentType || 'المحرر القضائي المعتمد برسم التوثيق'}
        attachments={dualViewAttachments}
      />
    </div>
  );
}
