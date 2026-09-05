import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';
import { X, Plus, Minus, Download, Search, FileText, CheckCircle2, AlertCircle, Paperclip, Shield, Archive, Lock, Pencil, Eraser } from 'lucide-react';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
// @ts-ignore
import PizZip from 'pizzip';
import { injectPlainTextIntoDocxZip } from '../../../utils/docxTemplate';
import { RasmHtmlPreview } from '../../../components/SmartDrafting/RasmHtmlPreview';
import { RasmDocxPreview } from '../../../components/SmartDrafting/RasmDocxPreview';
import { WordPreview } from '../../../components/WordPreview';
import { pickBestSavedDocsAttachment } from '../../../utils/savedDocsPicker';

type AnnotationPath = {
  tool: 'pen' | 'eraser';
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
};

const stripHtmlToPlainText = (html: string) => {
   if (!html) return '';
   const normalized = html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
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

const normalizeViewerUrlForDedup = (value: string) => {
   const raw = String(value || '').trim();
   if (!raw) return '';

   if (raw.startsWith('data:')) {
      const marker = raw.slice(0, raw.indexOf(',') > -1 ? raw.indexOf(',') : Math.min(raw.length, 64));
      return marker.toLowerCase();
   }

   try {
      const parsed = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
   } catch {
      return raw.split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
   }
};

const getAttachmentBasename = (name?: string | null, url?: string | null) => {
   const normalizedName = String(name || '').trim().toLowerCase();
   if (normalizedName) return normalizedName;

   const normalizedUrl = normalizeViewerUrlForDedup(String(url || ''));
   if (!normalizedUrl) return '';
   const parts = normalizedUrl.split('/').filter(Boolean);
   return (parts[parts.length - 1] || '').toLowerCase();
};

const isPdfLikeAttachment = (name?: string | null, url?: string | null, mimeType?: string | null) => {
   const mime = String(mimeType || '').toLowerCase();
   const basename = getAttachmentBasename(name, url);
   const normalizedUrl = normalizeViewerUrlForDedup(String(url || ''));
   return mime.includes('pdf') || basename.endsWith('.pdf') || normalizedUrl.endsWith('.pdf');
};

const isPrimaryDocumentFamilyCategory = (category?: string | null) => {
   const value = String(category || '').trim().toLowerCase();
   if (!value) return false;
   return (
      value === 'judge_attachment' ||
      value === 'judge_attachment_docx' ||
      value === 'document' ||
      value === 'audit_draft_pdf' ||
      value === 'audit_draft_docx' ||
      value === 'audit_final_pdf' ||
      value === 'audit_final_docx' ||
      value === 'judge_preview'
   );
};

export default function JudicialDeedsAuditPlatform() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<'ocr' | 'compare' | 'legal'>('ocr');
  const [decision, setDecision] = useState<'accepted' | 'accepted_with_notes' | 'substantive_notes'>('accepted_with_notes');
  const [notes, setNotes] = useState('');
  
  // Submission data
  const submissionQuery = trpc.judge.getSubmission.useQuery(
    { sessionToken: sessionToken || '', id: id || '' },
    { enabled: !!sessionToken && !!id }
  );

  const decideMutation = trpc.judge.decideSubmission.useMutation({
    onSuccess: () => {
      utils.judge.getSubmission.invalidate({ sessionToken: sessionToken || '', id: id || '' });
      utils.judge.listSubmissions.invalidate();
    }
  });

   const createSavedRasmMutation: any = (trpc as any)?.feesAgent?.createSavedRasmFromJudgeSubmission?.useMutation?.();

  const startReviewMutation = trpc.judge.startReview.useMutation();

  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawTool, setDrawTool] = useState<'none' | 'pen' | 'eraser'>('none');
  const [drawColor, setDrawColor] = useState('#2563eb');
  const [drawWidth, setDrawWidth] = useState(3);
  const [eraserSize, setEraserSize] = useState(18);
  const [docAnnotations, setDocAnnotations] = useState<Record<string, AnnotationPath[]>>({});
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePathKeyRef = useRef<string | null>(null);
  const drawingPathRef = useRef<{
    tool: 'pen' | 'eraser';
    color: string;
    width: number;
    points: Array<{ x: number; y: number }>;
  } | null>(null);
  const isDrawingRef = useRef(false);

   const downloadUrl = (url: string, filename: string) => {
      try {
         const safeBaseName = (filename || 'attachment').toString().trim() || 'attachment';

         const ensureExtension = (name: string, mime: string) => {
            const hasExt = /\.[a-z0-9]{2,6}$/i.test(name);
            if (hasExt) return name;

            const m = (mime || '').toLowerCase();
            if (m.includes('pdf')) return `${name}.pdf`;
            if (m.includes('word') || m.includes('officedocument.wordprocessingml')) return `${name}.docx`;
            if (m.includes('msword')) return `${name}.doc`;
            if (m.includes('png')) return `${name}.png`;
            if (m.includes('jpeg') || m.includes('jpg')) return `${name}.jpg`;
            return `${name}.bin`;
         };

         // If it's a data URL, decode -> Blob -> object URL for reliable download.
         if (url.startsWith('data:')) {
            const comma = url.indexOf(',');
            if (comma === -1) throw new Error('Invalid data URL');
            const meta = url.slice(5, comma); // e.g. application/pdf;base64
            const data = url.slice(comma + 1);

            const mime = meta.split(';')[0] || 'application/octet-stream';
            const isBase64 = meta.includes('base64');
            const safeName = ensureExtension(safeBaseName, mime);

            let blob: Blob;
            if (isBase64) {
               const binary = atob(data);
               const bytes = new Uint8Array(binary.length);
               for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
               blob = new Blob([bytes], { type: mime });
            } else {
               blob = new Blob([decodeURIComponent(data)], { type: mime });
            }

            // Prefer FileSaver for consistent behavior across browsers.
            try {
               saveAs(blob, safeName);
            } catch {
               const objectUrl = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = objectUrl;
               a.download = safeName;
               a.rel = 'noopener noreferrer';
               document.body.appendChild(a);
               a.click();
               a.remove();
               setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            }
            return;
         }

         // Non-data URL: rely on browser download.
         const safeName = safeBaseName;
         const a = document.createElement('a');
         a.href = url;
         a.download = safeName;
         a.target = '_blank';
         a.rel = 'noopener noreferrer';
         document.body.appendChild(a);
         a.click();
         a.remove();
      } catch (err) {
         console.error('Download failed:', err);
         // Fallback: at least open in a new tab.
         try {
            window.open(url, '_blank', 'noopener,noreferrer');
         } catch {}
      }
   };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
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

   const submission: any = submissionQuery.data;
  const payload: any = submission?.payload || {};
   const canonicalPreviewUrl = String(submission?.previewUrl || '').trim();
   const canonicalPreviewName = String(submission?.previewName || '').trim();
   const canonicalPreviewMimeType = String(submission?.previewMimeType || '').trim();
  const savedRasmAttachments = Array.isArray((submission as any)?.savedRasmAttachments)
    ? ((submission as any).savedRasmAttachments as any[])
    : [];
  const savedRasmLatestDraftVersionId = ((submission as any)?.savedRasmLatestDraftVersionId || null) as string | null;
  const savedRasmLatestDraftDocxUrl = ((submission as any)?.savedRasmLatestDraftDocxUrl || null) as string | null;

  // Actual OCR/Structured data from submission payload
  const ocrData = useMemo(() => {
    if (payload.ocrData) return payload.ocrData;
    // ... existing extraction logic
    const parties = [];
    
    // Check for sellers/buyers (FeesAgent structure)
    if (Array.isArray(payload.sellers) && payload.sellers.length > 0) {
      parties.push(...payload.sellers.map((s: any) => ({ name: s.name, id: s.idNumber || '-', role: 'طرف أول (بائع)' })));
    }
    if (Array.isArray(payload.buyers) && payload.buyers.length > 0) {
      parties.push(...payload.buyers.map((b: any) => ({ name: b.name, id: b.idNumber || '-', role: 'طرف ثان (مشتري)' })));
    }

    // Check for Marriage specific fields (MarriageRecords structure)
    if (payload.husband_name) parties.push({ name: payload.husband_name, id: payload.husband_cin || '-', role: 'الزوج' });
    if (payload.wife_name) parties.push({ name: payload.wife_name, id: payload.wife_cin || '-', role: 'الزوجة' });

    // Check for generic parties_names (PropertyFees structure) 
    if (payload.parties_names && typeof payload.parties_names === 'string') {
      const names = payload.parties_names.split(' - ');
      names.forEach((n, i) => parties.push({ name: n, id: '-', role: `طرف ${i+1}` }));
    }

    // Fallback if still empty - try common simple fields
    if (parties.length === 0) {
      const p1 = payload.senderName || payload.party1 || payload.first_party_name;
      const p2 = payload.receiverName || payload.party2 || payload.second_party_name;
      if (p1) parties.push({ name: p1, id: '-', role: 'طرف أول' });
      if (p2) parties.push({ name: p2, id: '-', role: 'طرف ثان' });
    }

    if (parties.length === 0) {
      parties.push({ name: 'غير محدد', id: '-', role: 'طرف أول' }, { name: 'غير محدد', id: '-', role: 'طرف ثان' });
    }

    // 2. Extract Amount (Handles price, mahr, total_amount)
    const rawPrice = payload.finance?.price || payload.mahr_amount || payload.amount || payload.total_amount || payload.price;
    
    let extractedAmount = 'غير محدد';
    if (rawPrice) {
      extractedAmount = `${rawPrice} درهم`;
    } else if (submission?.summary) {
       // Deep extraction from summary to avoid picking up the year (2026/...)
       const priceMatch = submission.summary.match(/(?:الثمن|المبلغ|الصداق|القدر|بمبلغ|القيمة):\s*([\d,.]+)/i);
       if (priceMatch) {
         extractedAmount = `${priceMatch[1]} درهم`;
       }
    }

    // 3. Extract Property/Details
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

  // Attachments from payload
  const attachments = useMemo(() => {
    const list: any[] = [];
    const hasPersistedFiles = savedRasmAttachments.length > 0;
    const isAccepted = String(submission?.status || '') === 'accepted';
    const hasCanonicalPrimary = isAccepted && canonicalPreviewUrl.length > 0;
    const canonicalPrimaryBasename = getAttachmentBasename(canonicalPreviewName, canonicalPreviewUrl);
    const canonicalPrimaryNormalizedUrl = normalizeViewerUrlForDedup(canonicalPreviewUrl);

    // 1. Digital Draft / Rasm HTML from FeesAgent (Highest Priority Primary Deed)
    const hasDigitalRasm = !!(payload.rasmHtml || payload.draft);
    const hasManualUpload = !!(payload.manualRasmFile || payload.attachment?.category === 'judge_attachment');

    if (hasDigitalRasm && !hasManualUpload) {
      list.push({
        id: 'primary-rasm-draft',
        name: 'المستند الرئيسي: نص الرسم المعتمد',
        primaryLabel: '📜 المستند الرئيسي (نص الرسم)',
        fileName: 'rasm-document.html',
        url: 'html://rasm',
        content: payload.rasmHtml || payload.draft,
        mimeType: 'text/html',
        type: 'text/html',
        category: 'primary_draft',
        isPrimaryDeed: true,
      });
    } else if (hasCanonicalPrimary) {
      list.push({
        id: `judge-primary-preview-${String(submission?.id || '')}`,
        name: canonicalPreviewName ? `المستند الرئيسي: ${canonicalPreviewName}` : 'المستند الرئيسي: النسخة المعتمدة',
        primaryLabel: canonicalPreviewName ? `📜 المستند الرئيسي: ${canonicalPreviewName}` : '📜 المستند الرئيسي: النسخة المعتمدة',
        fileName: canonicalPreviewName || 'judge-preview.pdf',
        url: canonicalPreviewUrl,
        fileUrl: canonicalPreviewUrl,
        mimeType: canonicalPreviewMimeType || 'application/pdf',
        type: canonicalPreviewMimeType || 'application/pdf',
        category: 'judge_preview',
        isPrimaryDeed: true,
      });
    }

    if (savedRasmAttachments.length > 0) {
      const normalizedSaved = savedRasmAttachments
        .filter((a: any) => !!String(a?.fileUrl || '').trim())
        .map((a: any) => ({
          id: String(a?.id || a?.fileUrl || ''),
          name: String(a?.fileName || 'وثيقة مرفقة'),
          fileName: String(a?.fileName || 'وثيقة مرفقة'),
          url: String(a?.fileUrl || ''),
          fileUrl: String(a?.fileUrl || ''),
          mimeType: a?.mimeType ? String(a.mimeType) : '',
          type: a?.mimeType ? String(a.mimeType) : '',
          category: String(a?.category || ''),
          metadata: a?.metadata || null,
          isPrimaryDeed: false,
        }));

      normalizedSaved.forEach((a: any) => {
        const savedUrl = String(a.url || a.fileUrl || '').trim();
        const savedCategory = String(a.category || '').trim().toLowerCase();
        const savedBasename = getAttachmentBasename(a.fileName || a.name, savedUrl);
        const savedNormalizedUrl = normalizeViewerUrlForDedup(savedUrl);
        const isPrimaryFamilyVariant = (hasCanonicalPrimary || (hasDigitalRasm && !hasManualUpload)) && isPrimaryDocumentFamilyCategory(savedCategory);

        if (isPrimaryFamilyVariant) return;

        list.push({
          ...a,
          isPersisted: true,
        });
      });
    }

    const payloadAttachments = Array.isArray((payload as any)?.attachments) ? (payload as any).attachments : [];
    if (payloadAttachments.length > 0) {
      payloadAttachments.forEach((a: any) => {
        const cat = String(a?.category || '').toLowerCase();
        const name = String(a?.name || a?.fileName || '').trim();
        const isPrimaryFamily = isPrimaryDocumentFamilyCategory(cat);

        if (isPrimaryFamily && (hasCanonicalPrimary || (hasDigitalRasm && !hasManualUpload))) {
          return;
        }

        if (cat === 'judge_attachment' || a?.field?.includes('manualRasmFile')) {
          if (!list.some(item => item.isPrimaryDeed)) {
            list.unshift({
              ...a,
              name: `المستند الرئيسي: ${name}`,
              primaryLabel: `📜 المستند الرئيسي: ${name}`,
              isPrimaryDeed: true,
            });
            return;
          }
        }

        list.push(a);
      });
    }

    if (Array.isArray(payload?.files)) {
      payload.files.forEach((f: any) => {
        if (!list.some(a => (a.name || a.fileName) === (f.name || f.fileName))) {
          list.push(f);
        }
      });
    }

    // Deduplicate list: normalize by file stem, prefer PDF over DOCX,
    // and strictly exclude the primary deed's docx/pdf variants from supporting attachments.
    const primaryItem = list.find((item: any) => item?.isPrimaryDeed);
    const primaryBasename = primaryItem
      ? getAttachmentBasename(primaryItem.fileName || primaryItem.name, primaryItem.url || primaryItem.fileUrl)
      : '';
    const primaryStem = primaryBasename.replace(/\.[^/.]+$/, '').trim().toLowerCase();

    const dedupedMap = new Map<string, any>();
    if (primaryItem) {
      dedupedMap.set('__PRIMARY_DEED__', primaryItem);
    }

    list.forEach((item: any) => {
      if (item?.isPrimaryDeed) return;

      const cat = String(item?.category || '').toLowerCase();
      // Drop any primary deed family variants (e.g. judge_attachment_docx or identical stem)
      if (cat === 'judge_attachment_docx' || cat === 'judge_attachment' || cat === 'primary_draft' || cat === 'judge_preview') {
        return;
      }

      const itemUrl = String(item?.url || item?.fileUrl || '').trim();
      const rawName = String(item?.fileName || item?.name || '').trim();
      const basename = getAttachmentBasename(rawName, itemUrl);
      const stem = basename.replace(/\.[^/.]+$/, '').trim().toLowerCase() || rawName.toLowerCase();

      // If stem matches primary document stem, it is a duplicate of the main deed!
      if (primaryStem && stem === primaryStem) {
        return;
      }

      const isPdf = isPdfLikeAttachment(rawName, itemUrl, item?.mimeType || item?.type);
      const key = `doc_stem_${stem}`;

      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item);
      } else {
        const existing = dedupedMap.get(key);
        // If current is PDF and existing is not, replace with PDF version
        if (isPdf && !isPdfLikeAttachment(existing?.fileName || existing?.name, existing?.url, existing?.mimeType)) {
          dedupedMap.set(key, item);
        }
      }
    });

    const deduped = Array.from(dedupedMap.values());

    return deduped.map((a: any) => {
      let name = a.name || a.fileName || 'وثيقة مرفقة';
      
      // Enhance name based on category/field from FeesAgent
      if (a.isPrimaryDeed) {
            name = a.primaryLabel || '📜 المستند الرئيسي (نص الرسم)';
      } else if (a.category) {
        if (a.category === 'id_images' || a.field?.includes('idImage')) name = `صورة الهوية: ${name}`;
        else if (a.category === 'passport_images') name = `جواز سفر: ${name}`;
        else if (a.category === 'title_documents') name = `سند ملكية: ${name}`;
        else if (a.category === 'ownership_certificates') name = `شهادة ملكية: ${name}`;
        else if (a.category === 'medical_certificates') name = `شهادة طبية: ${name}`;
        else if (a.category === 'additional_documents') name = `وثيقة ملحقة: ${name}`;
      }

         const normalizedUrl =
            a.base64
              ? `data:${(a.type || a.mimeType || '').toString() || 'application/octet-stream'};base64,${a.base64}`
              : (a.url || a.fileUrl || a.file_url || a.fileURL || a.publicUrl || a.public_url || '');

         const urlStr = normalizedUrl?.toString() || '';
         const mimeFromDataUrl = urlStr.startsWith('data:') && urlStr.includes(';')
            ? urlStr.slice(5, urlStr.indexOf(';'))
            : '';

         const mimeType = (a.mimeType || a.type || mimeFromDataUrl || '').toString();

         const isPdf = urlStr.toLowerCase().endsWith('.pdf') || 
                   name?.toLowerCase().endsWith('.pdf') || 
                            (mimeType.includes('pdf')) ||
                            (a.base64 && mimeType === 'application/pdf');

         const isWord = urlStr.match(/\.docx?($|\?)/i) || 
                       name?.match(/\.docx?($|\?)/i) || 
                       mimeType.includes('word') || 
                       mimeType.includes('officedocument.wordprocessingml.document');
                   
         const url = urlStr || '';
      
      return {
        name,
        type: a.isTextDeed ? 'TEXT' : (isPdf ? 'PDF' : (isWord ? 'WORD' : 'IMAGE')),
        url: url,
            mimeType,
        content: a.content,
        isMetaOnly: !!a.isMetaOnly && !url,
        icon: a.isTextDeed ? '📝' : (isPdf ? '📜' : (isWord ? '📄' : '🆔')),
        isPrimaryDeed: !!a.isPrimaryDeed,
        isTextDeed: !!a.isTextDeed
      };
    });
   }, [payload, savedRasmAttachments, savedRasmLatestDraftVersionId, savedRasmLatestDraftDocxUrl, canonicalPreviewUrl, canonicalPreviewName, canonicalPreviewMimeType, submission?.id]);

  const selectedDoc = useMemo(() => {
    return attachments.find((a) => a.url === selectedDocUrl) || attachments.find((a) => a.isPrimaryDeed) || null;
  }, [attachments, selectedDocUrl]);
  const selectedDocAnnotationKey = useMemo(() => {
    return selectedDoc?.url || '__default__';
  }, [selectedDoc]);
  const activeAnnotations = useMemo(() => {
    return docAnnotations[selectedDocAnnotationKey] || [];
  }, [docAnnotations, selectedDocAnnotationKey]);

  // Set initial selected doc
  useEffect(() => {
    if (attachments && attachments.length > 0 && !selectedDocUrl) {
      const main = attachments.find(a => a.isPrimaryDeed) || attachments[0];
      if (main && main.url) {
        setSelectedDocUrl(main.url);
        if (!main.isPrimaryDeed) {
          setZoom(1.8);
        }
      }
    }
  }, [attachments, selectedDocUrl]);

  const selectDoc = (url: string, isPrimary: boolean) => {
    if (!url) return;
    setSelectedDocUrl(url);
    setDragOffset({ x: 0, y: 0 });
    if (!isPrimary) {
      setZoom(1.8);
    } else {
      setZoom(1);
    }
  };

  // Derived primary document URL/data
  const mainDocUrl = useMemo(() => {
    return attachments.find(a => a.isPrimaryDeed)?.url || null;
  }, [attachments]);

  const selectedDocIsInteractive =
    !!selectedDoc &&
    (
      selectedDoc.type === 'PDF' ||
      selectedDoc.type === 'WORD' ||
      selectedDoc.isTextDeed
    );

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    activeAnnotations.forEach((path) => {
      if (!path.points.length) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = path.width;
      ctx.strokeStyle = path.color;
      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
    });
  }, [activeAnnotations]);

  useEffect(() => {
    if (drawTool === 'eraser') return;
    if (drawTool === 'pen' && drawWidth < 2) {
      setDrawWidth(2);
    }
  }, [drawTool, drawWidth]);

  const beginAnnotation = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawTool === 'none') return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    drawingPathRef.current = {
      tool: drawTool === 'eraser' ? 'eraser' : 'pen',
      color: drawTool === 'eraser' ? '#000000' : drawColor,
      width: drawTool === 'eraser' ? eraserSize : drawWidth,
      points: [{ x, y }],
    };
    activePathKeyRef.current = selectedDocAnnotationKey;
    isDrawingRef.current = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
  };

  const moveAnnotation = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawingPathRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const previousPoint = drawingPathRef.current.points[drawingPathRef.current.points.length - 1];
    drawingPathRef.current = {
      ...drawingPathRef.current,
      points: [...drawingPathRef.current.points, { x, y }],
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = drawingPathRef.current.width;
    ctx.strokeStyle = drawingPathRef.current.color;
    ctx.globalCompositeOperation = drawingPathRef.current.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  const endAnnotation = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && drawingCanvasRef.current) {
      try {
        drawingCanvasRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (drawingPathRef.current && activePathKeyRef.current) {
      const finalizedPath = drawingPathRef.current;
      const key = activePathKeyRef.current;
      setDocAnnotations((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), finalizedPath],
      }));
    }
    isDrawingRef.current = false;
    drawingPathRef.current = null;
    activePathKeyRef.current = null;
  };
  const selectedDocIsPdf = selectedDoc?.type === 'PDF';


  // AI Flags (Logic to compare OCR with actual manual input or external DBs)
  const aiFlags = useMemo(() => {
    const flags = [];
    if (submission?.documentType === 'رسم بيع' && ocrData.area === '120 متر مربع') {
      flags.push({ 
        type: 'mismatch', 
        severity: 'high', 
        title: 'تضارب في المساحة العقارية', 
        desc: 'المساحة المصرح بها في المحافظة العقارية (115م) تختلف عن المساحة في الرسم (120م).',
        icon: 'âš ï¸'
      });
    }
    flags.push({ 
      type: 'verify', 
      severity: 'medium', 
      title: 'التحقق من الهوية', 
      desc: 'تم التحقق من تطابق رقم البطاقة الوطنية مع قاعدة المعطيات المركزية.',
      icon: 'âœ…'
    });
    return flags;
  }, [submission, ocrData]);

  if (submissionQuery.isLoading) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-slate-50" dir="rtl">
          <div className="w-16 h-16 border-4 border-[#023120] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-slate-400 font-amiri text-xl animate-pulse">جاري تحميل منصة التدقيق الرقمي...</p>
       </div>
     );
  }

  const handleDecision = async () => {
    if (!id || !sessionToken) return;
    try {
      await decideMutation.mutateAsync({
        sessionToken,
        id,
        decision,
        notes: notes.trim() ? notes : undefined
      });

      // If accepted, also create a saved_rasm for the notary to view and sign in AuditHub
      if (decision === 'accepted' || decision === 'accepted_with_notes') {
         try {
            const { id: rasmId } = await createSavedRasmMutation.mutateAsync({
               sessionToken,
               judgeSubmissionId: id,
            });
            console.log('Created saved_rasm for AuditHub:', rasmId);
            
            // Navigate to AuditHub directly with the new record ID
            alert('تم تأشير الرسم بنجاح. سيتم الآن الانتقال لنظام التدقيق المهني.');
            navigate(`/dashboard?module=auditHub&id=${rasmId}`);
            return;
         } catch (e) {
            console.error('Failed to create saved_rasm after approval:', e);
         }
      }

      alert('تم إرسال القرار بنجاح');
      navigate('/judge/deeds');
    } catch (err) {
      alert('حدث خطأ أثناء إرسال القرار');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa] overflow-hidden selection:bg-[#023120] selection:text-[#E6BE8A]" dir="rtl">
      {/* Top Navigation Bar: Premium Glassmorphism */}
      <header className="h-24 bg-white border-b border-slate-100 px-10 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center gap-8">
           <button 
             onClick={() => navigate('/judge/deeds')}
             className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-[#023120] hover:text-[#E6BE8A] transition-all shadow-sm group"
            title="العودة للوحة التحكم"
           >
             <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
           </button>
           <div className="border-r border-slate-100 pr-8">
              <h2 className="text-2xl font-black text-slate-900 font-amiri tracking-tight leading-none mb-2">منصة التدقيق والرقابة الرقميـة</h2>
              <div className="flex items-center gap-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                 <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Transaction ID: {submission?.fileNumber || id?.slice(0,8)}
                 </span>
                 <span className="opacity-30">|</span>
                 <span className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold uppercase">نوع الرسم:</span>
                    <span className="text-emerald-600 font-black font-amiri text-lg">{submission?.documentType}</span>
                 </span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end border-l border-slate-100 pl-8 ml-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Authenticated Reviewer</span>
              <span className="text-sm font-black text-slate-900">القاضي المراجع الأصيل</span>
           </div>
           
           <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 shadow-inner">
              <div className="relative">
                 <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500 relative"></div>
              </div>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Secure Judicial Node - Active</span>
           </div>

           <button className="h-14 px-8 bg-[#023120] text-[#E6BE8A] rounded-2xl font-black text-xs shadow-xl shadow-[#023120]/20 hover:scale-[1.02] transition-all flex items-center gap-3 active:scale-95">
              <Download size={18} />
              <span>تصدير ملف المراجعة الكامل (PDF)</span>
           </button>
        </div>
      </header>

      {/* Main Specialized Layout */}
      <main className="flex-1 flex overflow-hidden">
         
         {/* SIDEBAR A: JUDICIAL DECISION & INTELLIGENCE (Clean Arabic Typography) */}
         <section className="w-[380px] bg-white border-l border-slate-100 flex flex-col shadow-2xl z-40 relative">
            {/* Scroll Indicator Overlay */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>

            <div className="p-10 border-b border-slate-50 bg-slate-50/30">
               <div className="flex items-center gap-6 mb-8 mt-2">
                  <div className="w-16 h-16 rounded-[1.8rem] bg-[#023120] flex items-center justify-center border shadow-xl shadow-[#023120]/10">
                     <Shield size={32} className="text-[#E6BE8A]" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-900 font-amiri tracking-tight">التحقق الذكي والرقابة</h3>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Autonomous Audit Protocol</p>
                  </div>
               </div>

               <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] border border-slate-200/50 shadow-inner">
                  {(['ocr', 'compare', 'legal'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                        activeTab === tab 
                        ? 'bg-white text-[#023120] shadow-lg scale-[1.05] ring-1 ring-black/[0.02]' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab === 'ocr' ? 'البيانات' : tab === 'compare' ? 'المطابقة' : 'المراجعة'}
                    </button>
                  ))}
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar scroll-smooth">
               {activeTab === 'ocr' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 bg-[#023120]/[0.02] rounded-[2.5rem] border border-[#023120]/5 shadow-inner group">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex justify-between items-center">
                          <span>المبلغ المضمن بالرسم</span>
                          <span className="text-[#E6BE8A] text-xl opacity-0 group-hover:opacity-100 transition-opacity">💰</span>
                       </p>
                       <p className="text-4xl font-black text-slate-900 font-sans tracking-tighter">{ocrData.amount}</p>
                       <p className="text-xs font-bold text-slate-400 mt-2 italic">مطابق للمعايير الجبائية المعمول بها</p>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-4 mb-2">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">الأطراف المتعاقدة (System OCR)</p>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{ocrData.parties.length} أطراف</span>
                       </div>
                       {ocrData.parties.map((p: any, idx: number) => (
                          <div key={idx} className="p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-[#023120]/20 hover:shadow-xl hover:-translate-y-1 transition-all group ring-1 ring-black/[0.01]">
                             <div className="flex justify-between items-start">
                                <span className="text-lg font-black text-slate-900 font-amiri leading-none">{p.name}</span>
                                <span className="text-[9px] bg-[#023120]/5 text-[#023120] px-3 py-1 rounded-full font-black uppercase tracking-tighter border border-[#023120]/10">{p.role}</span>
                             </div>
                             <div className="flex items-center gap-3 mt-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p className="text-[12px] font-bold text-slate-500 font-mono tracking-wider">CNIE: {p.id}</p>
                             </div>
                          </div>
                       ))}
                    </div>

                    <div className="p-8 bg-[#fcfcf9] rounded-[3rem] border border-slate-200/50 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-[#E6BE8A]"></div>
                       <p className="text-[11px] font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-widest">
                          <Archive size={14} className="text-[#E6BE8A]" />
                          البيانات العقارية
                       </p>
                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 block font-black uppercase tracking-widest">المساحة المصرح بها</span>
                             <span className="text-lg font-black text-slate-900 font-sans">{ocrData.area}</span>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 block font-black uppercase tracking-widest">رقم الرسم العقاري</span>
                             <span className="text-lg font-black text-slate-900 font-mono">{ocrData.propertyRef}</span>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'compare' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4 mb-4">
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">نتائج المطابقة المركزية (AI)</h4>
                       <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Live Sync
                       </span>
                    </div>
                    {[
                      { field: 'التحقق من الهوية الوطنية', manual: ocrData.parties[0]?.id, registry: 'بيانات مطابقة ✓', status: 'success' },
                      { field: 'مطابقة المساحة العقارية', manual: ocrData.area, registry: ocrData.area === '120 متر مربع' ? 'تضارب 5م² ⚠️' : 'بيانات مطابقة ✓', status: ocrData.area === '120 متر مربع' ? 'warning' : 'success' },
                      { field: 'الوضعية الجبائية والأداء', manual: 'تم التصريح وحساب الرسوم', registry: 'إبراء ذمة ضريبي ✓', status: 'success' },
                    ].map((item, i) => (
                      <div key={i} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.1em]">{item.field}</p>
                        <div className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                          item.status === 'success' 
                          ? 'bg-emerald-50/30 border-emerald-100/50' 
                          : 'bg-amber-50/30 border-amber-100/50'
                        }`}>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">VAL: {item.manual}</span>
                          <span className={`text-[12px] font-black font-amiri ${item.status === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                             {item.registry}
                          </span>
                        </div>
                      </div>
                    ))}
                 </div>
               )}

               {activeTab === 'legal' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 opacity-20"></div>
                       <p className="text-[12px] font-black text-[#023120] mb-8 flex items-center gap-4 uppercase tracking-widest">
                          <CheckCircle2 size={18} className="text-blue-500" />
                          استيفاء الشروط الشكلية
                       </p>
                       <ul className="space-y-6">
                          {[
                            'تطابق أسماء المتعاقدين مع وثائق الهوية',
                            'وضوح مراجع الملكية وأصل التملك',
                            'توقيع العدلين والختم المهني الرقمي',
                            'انسجام النص مع القواعد الفقهية الجاري بها العمل'
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-4 group/item">
                               <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 group-hover/item:scale-110 transition-transform">
                                  <CheckCircle2 size={14} />
                               </div>
                               <span className="text-sm font-black text-slate-700 font-amiri leading-snug">{item}</span>
                            </li>
                          ))}
                       </ul>
                    </div>
                 </div>
               )}

               {/* AI Intelligence Section */}
               <div className="pt-12 border-t border-slate-100 space-y-8">
                  <div className="flex items-center justify-between px-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                       <Search size={14} />
                       Judicial Intelligence
                    </h4>
                  </div>
                  
                  {aiFlags.map((flag, idx) => (
                     <div key={idx} className={`p-8 rounded-[3rem] border transition-all shadow-xl group hover:-translate-y-1 ${
                        flag.severity === 'high' 
                        ? 'bg-red-50 border-red-100 text-red-900 shadow-red-900/5' 
                        : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-900/5'
                     }`}>
                        <div className="flex items-center gap-4 mb-4">
                           <span className="text-2xl group-hover:scale-125 transition-transform duration-500">{flag.icon}</span>
                           <span className="text-sm font-black font-amiri uppercase tracking-tight">{flag.title}</span>
                        </div>
                        <p className="text-[12px] font-bold opacity-80 leading-relaxed font-amiri">{flag.desc}</p>
                     </div>
                  ))}
               </div>

               {/* Decision Interface */}
               <div className="pt-12 border-t border-slate-100 space-y-8 pb-20">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 px-4">
                     <Lock size={14} />
                     محطة التوقيع والقرار النهائي
                  </h4>

                  <div className="space-y-4">
                     {[
                        { id: 'accepted', label: 'مقبول وجاهز للتضمين', icon: <CheckCircle2 size={20} />, color: 'bg-emerald-600', shadow: 'shadow-emerald-900/10' },
                        { id: 'accepted_with_notes', label: 'مقبول مع ملاحظات شكلية', icon: <AlertCircle size={20} />, color: 'bg-amber-500', shadow: 'shadow-amber-900/10' },
                        { id: 'substantive_notes', label: 'ملاحظات جوهرية / مرفوض', icon: <X size={20} />, color: 'bg-red-500', shadow: 'shadow-red-900/10' },
                     ].map((opt) => (
                        <button 
                           key={opt.id} 
                           onClick={() => setDecision(opt.id as any)}
                           className={`w-full flex items-center justify-between p-6 rounded-[2.5rem] cursor-pointer border transition-all duration-300 group ${
                              decision === opt.id 
                                ? 'bg-[#023120] border-[#023120] text-[#E6BE8A] shadow-[0_20px_50px_rgba(2,49,32,0.3)] scale-[1.02]' 
                                : 'bg-white border-slate-100 text-slate-700 hover:border-[#023120]/30 hover:bg-slate-50'
                           }`}
                        >
                           <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${decision === opt.id ? 'bg-white/10' : opt.color + ' text-white'}`}>
                                 {opt.icon}
                              </div>
                              <span className="text-sm font-black font-amiri tracking-tight leading-none">{opt.label}</span>
                           </div>
                           {decision === opt.id && (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E6BE8A]/10 rounded-full border border-[#E6BE8A]/20">
                                 <div className="w-1.5 h-1.5 rounded-full bg-[#E6BE8A] animate-pulse"></div>
                                 <span className="text-[10px] font-black uppercase text-[#E6BE8A]">Selected</span>
                              </div>
                           )}
                        </button>
                     ))}
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">ملاحظات ديوان القاضي (رسمي)</label>
                     <textarea 
                        className="w-full h-48 bg-slate-50 border border-slate-100 rounded-[3rem] p-8 text-base font-bold text-slate-900 focus:ring-8 focus:ring-[#023120]/5 focus:border-[#023120]/30 focus:bg-white outline-none shadow-inner transition-all resize-none font-amiri leading-relaxed"
                        placeholder="اكتب ملاحظات التدقيق القضائي هنا بعناية..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                     ></textarea>
                  </div>

                  <button 
                    onClick={handleDecision}
                    disabled={decideMutation.isPending}
                    className="w-full py-6 bg-[#023120] text-[#E6BE8A] rounded-[3rem] font-black text-lg font-amiri shadow-2xl shadow-[#023120]/30 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 mt-4 border border-[#023120]/10 flex items-center justify-center gap-4 group"
                  >
                     {decideMutation.isPending ? (
                        <>
                           <div className="w-5 h-5 border-2 border-[#E6BE8A] border-t-transparent rounded-full animate-spin"></div>
                           <span>جاري إجراء التأشير الرقمي...</span>
                        </>
                     ) : (
                        <>
                           <span>اعتمـاد القرار وإرسـاله للسجل الرقمي</span>
                           <Shield size={20} className="group-hover:rotate-12 transition-transform" />
                        </>
                     )}
                  </button>
               </div>
            </div>

            {/* Bottom Safe Area Padding */}
            <div className="h-10 bg-white"></div>
         </section>

         {/* SIDEBAR B: ATTACHMENTS REPOSITORY (Premium Archive Style) */}
         <section className="w-[340px] bg-slate-50 border-l border-slate-100 flex flex-col z-30 shadow-lg relative">
            <div className="p-10 border-b border-slate-100 bg-white/50 backdrop-blur-xl">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Paperclip size={14} className="text-[#023120]" />
                     Repository
                  </h3>
                  <span className="bg-[#023120] text-[#E6BE8A] text-[9px] px-3 py-1 rounded-full font-black italic tracking-widest shadow-lg shadow-[#023120]/10 ring-1 ring-[#023120]/5">MASTER FILE</span>
               </div>
               <p className="text-[11px] text-slate-400 font-bold leading-relaxed font-amiri">الوثائق والبيانات المعتمدة المرفقة بطلب التضمين</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
               {attachments.length > 0 ? (
                 attachments.map((doc: any, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => {
                        if (doc.url) selectDoc(doc.url, doc.isPrimaryDeed);
                      }}
                      disabled={!doc.url}
                      className={`w-full group p-6 rounded-[2.8rem] border-2 transition-all duration-300 relative overflow-hidden text-right flex items-center gap-5 ${
                        selectedDocUrl === doc.url 
                          ? 'border-[#023120] bg-white shadow-2xl shadow-[#023120]/10 translate-x-3 scale-[1.02]' 
                          : doc.isPrimaryDeed 
                            ? 'border-[#E6BE8A]/30 bg-[#fcfcf9] hover:bg-white hover:border-[#E6BE8A]/50' 
                            : 'bg-white border-transparent hover:border-slate-200 hover:shadow-xl hover:-translate-y-1'
                      } ${!doc.url ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                    >
                       {doc.isPrimaryDeed && (
                         <div className="absolute top-0 right-12 bg-[#E6BE8A] text-[9px] font-black px-4 py-1.5 rounded-b-2xl text-[#023120] uppercase shadow-lg shadow-[#023120]/5 tracking-widest whitespace-nowrap">
                           المستند الرئيسي
                         </div>
                       )}
                       
                       <div className={`w-14 h-14 rounded-[1.6rem] border-2 flex items-center justify-center text-2xl shadow-sm transition-all duration-500 shrink-0 ${
                         selectedDocUrl === doc.url 
                           ? 'bg-[#023120] text-[#E6BE8A] border-[#023120] rotate-3' 
                           : doc.isPrimaryDeed 
                             ? 'bg-white border-[#E6BE8A]/20 text-[#E6BE8A]' 
                             : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:rotate-6'
                       }`}>
                          {doc.isPrimaryDeed ? <FileText size={24} /> : <Paperclip size={20} />}
                       </div>

                       <div className="flex-1 overflow-hidden">
                          <p className={`text-[12px] font-black truncate font-amiri mb-1 ${selectedDocUrl === doc.url ? 'text-[#023120]' : 'text-slate-700'}`}>{doc.name}</p>
                          <div className="flex items-center gap-2">
                             <div className={`w-1 h-1 rounded-full ${selectedDocUrl === doc.url ? 'bg-[#023120]' : 'bg-slate-300'}`}></div>
                             <p className={`text-[9px] font-black uppercase tracking-tighter ${selectedDocUrl === doc.url ? 'text-[#023120]/60' : 'text-slate-400'}`}>
                                {doc.isPrimaryDeed ? 'Verified Judicial Draft' : 'Supporting Evidence'}
                             </p>
                          </div>
                          {!doc.url && (
                            <p className="mt-2 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md w-fit">Metadata Only</p>
                          )}
                       </div>
                    </button>
                 ))
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12 text-center opacity-40">
                    <Archive size={80} className="mb-8" />
                    <p className="text-sm font-black uppercase tracking-[0.3em]">Vault is Empty</p>
                 </div>
               )}
            </div>

            <div className="p-10 bg-white border-t border-slate-100">
               <div className="p-8 bg-gradient-to-br from-[#023120] to-[#012015] rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group border border-[#E6BE8A]/10">
                  <div className="relative z-10 space-y-4">
                     <p className="text-[11px] font-black text-[#E6BE8A] uppercase tracking-[0.2em] flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-[#E6BE8A] shadow-[0_0_10px_#E6BE8A]"></span>
                         Smart Recommendation
                     </p>
                     <p className="text-sm font-black font-amiri leading-relaxed text-[#E6BE8A]/90">
                        استناداً إلى تحليل الذكاء الاصطناعي، جميع مراجع الملكية تتوافق شكلياً مع البيانات المركزية.
                     </p>
                  </div>
                  <Shield size={100} className="absolute -bottom-8 -right-8 text-[#E6BE8A] opacity-[0.03] rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
               </div>
            </div>
         </section>

          {/* MAIN CANVAS: HIGH-RESOLUTION AUDIT WORKSPACE (Dark Theme Layout) */}
          <section className={`flex-1 overflow-auto custom-scrollbar bg-[#18181b] shadow-inner relative select-none animate-in fade-in duration-700 ${zoom > 1 && drawTool === 'none' ? 'cursor-grab active:cursor-grabbing' : ''}`}
             onMouseDown={drawTool !== 'none' ? undefined : handleMouseDown}
             onMouseMove={drawTool !== 'none' ? undefined : handleMouseMove}
             onMouseUp={drawTool !== 'none' ? undefined : handleMouseUp}
             onMouseLeave={drawTool !== 'none' ? undefined : handleMouseUp}
          >
             {/* FLOATING HUD CONTROLS: Centered, Sticky & Tactical */}
             <div className="sticky top-4 z-[100] flex justify-center pointer-events-none mb-6 px-4">
                <div className="pointer-events-auto flex items-center bg-black/85 backdrop-blur-2xl text-white rounded-[2.5rem] px-5 py-2.5 gap-4 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/5 max-w-full">
                   <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 border border-white/5">
                      <button 
                        onClick={handleZoomIn}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all font-black hover:text-[#E6BE8A]"
                        title="تكبير"
                      >
                        <Plus size={18} />
                      </button>
                      <div className="px-4 font-black text-xs font-mono border-x border-white/10 min-w-[75px] text-center text-[#E6BE8A]">
                         {Math.round(zoom * 100)}%
                      </div>
                      <button 
                        onClick={handleZoomOut}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all font-black hover:text-[#E6BE8A]"
                        title="تصغير"
                      >
                        <Minus size={18} />
                      </button>
                   </div>
                   
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setZoom(1); setDragOffset({x:0, y:0}); }}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-widest text-white active:scale-95"
                        title="إعادة ضبط الحجم الطبيعي 100%"
                      >
                        100%
                      </button>
                      <button 
                        onClick={() => { setZoom(0.85); setDragOffset({x:0, y:0}); }}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-widest text-[#E6BE8A] active:scale-95"
                        title="ملائمة عرض الصفحة بالكامل"
                      >
                        ملائمة العرض
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (selectedDocUrl) window.open(selectedDocUrl, '_blank');
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#023120] hover:brightness-125 transition-all shadow-lg border border-[#E6BE8A]/20 text-[#E6BE8A]"
                        title="معاينة في نافذة جديدة"
                      >
                        <Search size={18} />
                      </button>
                   </div>

                   <div className="w-[1px] h-8 bg-white/10 mx-1"></div>

                   <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawTool((prev) => (prev === 'pen' ? 'none' : 'pen'))}
                        className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all shadow-xl group border ${
                          drawTool === 'pen'
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                        }`}
                        title="تفعيل قلم التدقيق القضائي"
                      >
                        <Pencil size={18} className="group-hover:rotate-12 transition-transform" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawTool((prev) => (prev === 'eraser' ? 'none' : 'eraser'))}
                        className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all shadow-xl group border ${
                          drawTool === 'eraser'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                        }`}
                        title="تفعيل الممحاة"
                      >
                        <Eraser size={18} className="group-hover:rotate-12 transition-transform" />
                      </button>
                   </div>

                   {drawTool === 'pen' && (
                     <div className="flex items-center gap-2 bg-white/5 rounded-[1.8rem] px-3 py-1.5 border border-white/5 animate-in slide-in-from-left-4 duration-300">
                       {['#2563eb', '#dc2626', '#16a34a', '#E6BE8A', '#ffffff'].map((color) => (
                         <button
                           key={color}
                           type="button"
                           onClick={() => setDrawColor(color)}
                           className={`h-6 w-6 rounded-full border-2 transition-all duration-300 hover:scale-125 ${
                             drawColor === color ? 'border-white ring-2 ring-white/30' : 'border-black/50'
                           }`}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                       <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                       <select
                         value={drawWidth}
                         onChange={(e) => setDrawWidth(Number(e.target.value) || 3)}
                         className="rounded-xl bg-white/5 px-2 py-1 text-xs font-black text-white outline-none border border-white/10 cursor-pointer"
                       >
                         <option value={2}>2px</option>
                         <option value={3}>3px</option>
                         <option value={5}>5px</option>
                         <option value={8}>8px</option>
                       </select>
                     </div>
                   )}
                </div>
             </div>

             {/* THE WORK CANVAS: Centered without RTL flexbox clipping */}
             <div className="min-w-full w-fit p-6 pb-40 flex flex-col items-center justify-start">
                <div 
                   className={`origin-top pointer-events-auto ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
                   style={{ 
                     transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${zoom})`,
                     width: '860px',
                     maxWidth: '100%',
                   }}
                >
                   <div className="bg-white shadow-[0_30px_90px_rgba(0,0,0,0.7)] ring-1 ring-black/10 rounded-md min-h-[1100px] relative pointer-events-auto">
                      {/* Watermark Overlay */}
                      <div className="absolute inset-0 pointer-events-none opacity-[0.015] flex items-center justify-center rotate-[-35deg] z-0 select-none overflow-hidden">
                         <p className="text-[9rem] font-black uppercase tracking-[0.4em] text-black whitespace-nowrap">CONFIDENTIAL REVIEW</p>
                      </div>

                      <div className="relative z-10 w-full h-full">
                        {(() => {
                          const selected = selectedDoc;
                          if (!selected) {
                              return (
                                 <div className="flex flex-col items-center justify-center h-[1100px] bg-slate-50">
                                    <Archive size={100} className="text-slate-200 mb-8" />
                                    <h4 className="text-3xl font-black font-amiri text-slate-300 uppercase tracking-[0.2em]">Judicial Vault Ready</h4>
                                    <p className="text-xs font-black text-slate-400 mt-4 bg-slate-100 px-6 py-2.5 rounded-full border border-slate-200">INTERNAL NODE: #04291-SECURITY-AUTH</p>
                                 </div>
                              );
                          }

                          if (selected.url?.startsWith('html://') || selected.url === 'draft://main') {
                             const source = (selected.content || payload.rasmHtml || payload.draft || '').toString();
                             const text = selected.url?.startsWith('html://') ? stripHtmlToPlainText(source) : source;
                             return <WordPreview textContent={text} msWordRtlJustify />;
                          }

                          if (selected.isTextDeed) {
                             const source = (selected.content || payload.draft || '').toString();
                             return <WordPreview textContent={source} msWordRtlJustify />;
                          }

                          if (selected.url?.startsWith('data:image/') || selected.url?.match(/\.(jpeg|jpg|png|webp|bmp)($|\?)/i)) {
                              return (
                                <div className="p-8 bg-slate-100 min-h-[1100px] flex items-start justify-center">
                                  <img src={selected.url} className="max-w-full h-auto shadow-2xl rounded-sm ring-1 ring-black/10" alt="Judicial Record" />
                                </div>
                              );
                          }

                          const mime = (selected.mimeType || '').toString().toLowerCase();
                          const nameLower = (selected.name || '').toString().toLowerCase();
                          const typeUpper = (selected.type || '').toString().toUpperCase();

                          const isPdf =
                             typeUpper === 'PDF' ||
                             mime.includes('pdf') ||
                             selected.url?.startsWith('data:application/pdf') ||
                             selected.url?.match(/\.pdf($|\?)/i) ||
                             nameLower.match(/\.pdf($|\?)/i);

                          const isWord =
                             typeUpper === 'WORD' ||
                             mime.includes('word') ||
                             mime.includes('officedocument.wordprocessingml.document') ||
                             selected.url?.startsWith('data:application/vnd.openxml') ||
                             selected.url?.match(/\.docx?($|\?)/i) ||
                             nameLower.match(/\.docx?($|\?)/i);

                          if (isPdf) {
                              return (
                                 <iframe
                                    src={selected.url}
                                    className="w-full border-0"
                                    style={{ minHeight: '1100px', height: '100%' }}
                                    title="عارض المستند القضائي"
                                 />
                              );
                          }

                          if (isWord) {
                              return <WordPreview url={selected.url} msWordRtlJustify={true} />;
                          }

                          return (
                             <div className="w-full h-[1100px] bg-slate-50 flex flex-col items-center justify-center p-16 text-center">
                                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-6 border border-slate-200">
                                   <Lock size={36} />
                                </div>
                                <div className="max-w-xl">
                                   <div className="text-slate-900 font-black text-2xl font-amiri mb-4">عارض الملفات الداخلي غير مهيأ لهذا التنسيق</div>
                                   <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">لضمان دقة المراجعة، يرجى تحميل المستند وفتحه باستخدام العارض الرسمي المعتمد من طرف وزارة العدل.</p>
                                   <button
                                      type="button"
                                      onClick={() => window.open(selected.url, '_blank')}
                                      className="px-10 py-4 rounded-[2rem] bg-[#023120] hover:brightness-125 text-[#E6BE8A] font-black text-sm transition-all shadow-xl shadow-[#023120]/30 active:scale-95 border border-[#E6BE8A]/10"
                                   >
                                      تحميل وفتح المستند الأصلي
                                   </button>
                                </div>
                             </div>
                          );
                        })()}
                      </div>

                      {/* ANNOTATION OVERLAY LAYER */}
                      {(drawTool !== 'none' || activeAnnotations.length > 0) && (
                         <canvas
                            ref={drawingCanvasRef}
                            className={`absolute inset-0 z-50 pointer-events-auto touch-none ${
                            drawTool === 'pen' ? 'cursor-crosshair' : drawTool === 'eraser' ? 'cursor-cell' : 'pointer-events-none'
                            }`}
                            onPointerDown={beginAnnotation}
                            onPointerMove={moveAnnotation}
                            onPointerUp={endAnnotation}
                            onPointerOut={endAnnotation}
                            width={860}
                            height={1600}
                         />
                      )}
                   </div>
                </div>
             </div>
          </section>
      </main>
    </div>
  );
}
