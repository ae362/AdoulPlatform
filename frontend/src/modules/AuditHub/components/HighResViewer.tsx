import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileText, 
  Pencil, 
  Plus, 
  Minus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { PDFDocument, rgb } from 'pdf-lib';
import { RasmDocxPreview } from '../../../components/SmartDrafting/RasmDocxPreview';
import { WordPreview, type WordPreviewHandle } from '../../../components/WordPreview';
import { OnlyOfficeEditor } from '../../../components/OnlyOfficeEditor';
// @ts-ignore
import PizZip from 'pizzip';
import JSZip from 'jszip';
import { injectPlainTextIntoDocxZip } from '../../../utils/docxTemplate';
import { PAGE_WIDTH, PAGE_HEIGHT, PAGE_GAP, getPages, stripHtmlToPlainText } from '../utils/textParsers';

export const HighResViewer = ({ 
  doc, 
  docSourceMeta,
  zoom, 
  isDragging, 
  onMouseDown, 
  onMouseMove, 
  onMouseUp,
  onWheel,
  containerRef,
  isDarkMode,
  onUpdateDraft,
  inlineEditMode,
  activeViewMode = 'preview',
  onlyOfficeConfig,
  onlyOfficeDsUrl,
  onSaveAndCloseOnlyOffice,
  isSavingOnlyOffice = false,
  onCloseOnlyOffice,
  updateZoom,
  onRegisterPlainTextGetter,
  renderNonce,
  pdfTextEditor
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [onlyOfficeFailed, setOnlyOfficeFailed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const a4Ref = useRef<HTMLDivElement>(null);
  const wordPreviewRef = useRef<WordPreviewHandle | null>(null);
  const pdfOverlayRef = useRef<HTMLDivElement>(null);
  const pdfDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pdfDragRectCss, setPdfDragRectCss] = useState<null | { x: number; y: number; w: number; h: number }>(null);

  const sourceTag: 'base' | 'edited' = (docSourceMeta as any)?.selectedDocSource === 'edited' ? 'edited' : 'base';
  const forcedBasePdfUrlRaw = sourceTag === 'base' ? String((docSourceMeta as any)?.baseDocUrl || '').trim() : '';
  const forcedBasePdfUrl =
    forcedBasePdfUrlRaw && /\.pdf(?:$|[?#])/i.test(forcedBasePdfUrlRaw)
      ? forcedBasePdfUrlRaw
      : '';

  const isDraft = doc?.isDraft;
  const mimeType = (doc?.type || doc?.mimeType || doc?.mime_type || '').toString().toLowerCase();
  const isPDF =
    !!forcedBasePdfUrl ||
    doc?.fileName?.toLowerCase().endsWith('.pdf') ||
    doc?.name?.toLowerCase().endsWith('.pdf') ||
    mimeType.includes('application/pdf') ||
    mimeType.includes('pdf');

  const docUrl: string = (
    doc?.url ||
    doc?.fileUrl ||
    doc?.file_url ||
    doc?.fileURL ||
    doc?.publicUrl ||
    doc?.public_url ||
    ''
  ) as string;
  const docRemoteUrl: string = (
    doc?.remoteUrl ||
    doc?.remote_url ||
    ''
  ) as string;
  const effectiveDocUrl = (() => {
    const u = String(docUrl || '');
    const r = String(docRemoteUrl || '');
    if (u.startsWith('blob:')) return u;
    if (u.startsWith('data:')) return r || u;
    if (u || r) return u || r;
    if (forcedBasePdfUrl) return forcedBasePdfUrl;
    return '';
  })();

  // For some hosts (e.g. object storage), direct <iframe src="https://...pdf"> can render blank/black
  // due to CORP/CSP or viewer restrictions. Fetching to a blob URL makes the PDF same-origin to the app.
  useEffect(() => {
    let revoke: string | null = null;
    const abort = new AbortController();

    const run = async () => {
      if (!isPDF) {
        setPdfBlobUrl(null);
        return;
      }

      const u = String(effectiveDocUrl || '').trim();
      if (!u) {
        setPdfBlobUrl(null);
        return;
      }

      if (u.startsWith('blob:')) {
        setPdfBlobUrl(null);
        return;
      }

      if (u.startsWith('data:')) {
        try {
          const resp = await fetch(u, { signal: abort.signal });
          if (!resp.ok) throw new Error(`Failed to read PDF data URL (${resp.status})`);
          const bytes = await resp.arrayBuffer();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          revoke = URL.createObjectURL(blob);
          setPdfBlobUrl(revoke);
        } catch {
          setPdfBlobUrl(null);
        }
        return;
      }

      if (!/^https?:/i.test(u)) {
        setPdfBlobUrl(null);
        return;
      }

      try {
        const isSupabasePublic = u.includes('supabase.co/storage/v1/object/public/');
        const cacheBustedUrl = `${u}${u.includes('?') ? '&' : '?'}cb=${Date.now()}`;
        const resp = await fetch(cacheBustedUrl, {
          cache: 'no-store',
          mode: 'cors',
          credentials: isSupabasePublic ? 'omit' : 'include',
          signal: abort.signal,
        });
        if (!resp.ok) throw new Error(`Failed to load PDF (${resp.status})`);
        const bytes = await resp.arrayBuffer();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        revoke = URL.createObjectURL(blob);
        setPdfBlobUrl(revoke);
      } catch {
        setPdfBlobUrl(null);
      }
    };

    run();
    return () => {
      abort.abort();
      if (revoke) {
        try {
          URL.revokeObjectURL(revoke);
        } catch {}
      }
    };
  }, [effectiveDocUrl, isPDF]);

  const getJudgeLikePdfViewerUrl = (url: string, pdfZoom?: number) => {
    const u = String(url || '').trim();
    if (!u) return '';
    // PDF Open Parameters (built-in browser viewer).
    // IMPORTANT: Always override any existing hash to keep behavior consistent.
    // Avoid CSS scaling of the <iframe> (causes blurry/rasterized PDF). Instead, drive zoom via viewer params.
    const zRaw = typeof pdfZoom === 'number' && Number.isFinite(pdfZoom) ? pdfZoom : null;
    const z =
      zRaw == null
        ? null
        : Math.round(Math.max(30, Math.min(300, zRaw * 100)));

    // Prefer a "fit width" default (page-width) when zoom is ~100%,
    // otherwise use explicit percent zoom.
    const zoomParam =
      zRaw != null && Math.abs(zRaw - 1) < 0.01
        ? 'zoom=page-width&'
        : (z != null ? `zoom=${z}&` : '');

    const viewerHash = `view=FitH&${zoomParam}toolbar=1&navpanes=1&scrollbar=1`;
    const base = u.split('#')[0];
    return `${base}#${viewerHash}`;
  };

  // (legacy debug logging removed)
  const fileName: string = (
    doc?.fileName ||
    doc?.file_name ||
    doc?.filename ||
    doc?.name ||
    'attachment'
  ).toString();
  const isImage =
    mimeType.startsWith('image/') ||
    /^data:image\//i.test(docUrl) ||
    /\.(png|jpe?g|webp|bmp|gif|svg)($|\?)/i.test(fileName) ||
    /\.(png|jpe?g|webp|bmp|gif|svg)($|\?)/i.test(docUrl);
  const isWord =
    !isPDF &&
    (
      /\.(docx?|dotx?)($|\?)/i.test(fileName) ||
      mimeType.includes('application/msword') ||
      mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    );
  const hasRealBinaryUrl =
    !!String(effectiveDocUrl || '').trim() &&
    !String(effectiveDocUrl || '').startsWith('html://') &&
    String(effectiveDocUrl || '') !== 'draft://main';

  const canInlineEdit = isWord || isDraft || inlineEditMode;

  // Legacy PDF overlay editing is intentionally disabled.
  // AuditHub uses PDF for accurate preview and OnlyOffice for real editing.
  const pdfEditorActive = false;
  const pdfTool: 'redact' | 'text' = (pdfTextEditor?.tool || 'redact') as any;
  const pdfPageIndex: number = Number(pdfTextEditor?.pageIndex || 0);
  const pdfPageSize: { width: number; height: number } | null = pdfTextEditor?.pageSize || null;
  const pdfEdits = (pdfTextEditor?.edits || { rects: [], texts: [] }) as any;

  const cssPointToPdfPoint = (xCss: number, yCss: number, textSize?: number) => {
    const overlayEl = pdfOverlayRef.current;
    if (!overlayEl || !pdfPageSize) return null;
    const r = overlayEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const xPt = (xCss / r.width) * pdfPageSize.width;

    if (typeof textSize === 'number') {
      // Map click to top-left of text box
      const yTopPt = (yCss / r.height) * pdfPageSize.height;
      const yPt = Math.max(0, Math.min(pdfPageSize.height - textSize, pdfPageSize.height - yTopPt - textSize));
      return { x: xPt, y: yPt };
    }

    const yPt = (1 - (yCss / r.height)) * pdfPageSize.height;
    return { x: xPt, y: yPt };
  };

  const pdfRectCssToPdf = (rectCss: { x: number; y: number; w: number; h: number }) => {
    const overlayEl = pdfOverlayRef.current;
    if (!overlayEl || !pdfPageSize) return null;
    const r = overlayEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const xPt = (rectCss.x / r.width) * pdfPageSize.width;
    const wPt = (rectCss.w / r.width) * pdfPageSize.width;
    const hPt = (rectCss.h / r.height) * pdfPageSize.height;
    const yPt = ((r.height - (rectCss.y + rectCss.h)) / r.height) * pdfPageSize.height;
    return { x: xPt, y: yPt, w: wPt, h: hPt };
  };

  const pdfRectPdfToCss = (rectPdf: { x: number; y: number; w: number; h: number }) => {
    const overlayEl = pdfOverlayRef.current;
    if (!overlayEl || !pdfPageSize) return null;
    const r = overlayEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const xCss = (rectPdf.x / pdfPageSize.width) * r.width;
    const wCss = (rectPdf.w / pdfPageSize.width) * r.width;
    const yTopPt = pdfPageSize.height - rectPdf.y - rectPdf.h;
    const yCss = (yTopPt / pdfPageSize.height) * r.height;
    const hCss = (rectPdf.h / pdfPageSize.height) * r.height;
    return { x: xCss, y: yCss, w: wCss, h: hCss };
  };

  const pdfTextPdfToCss = (t: { x: number; y: number; text: string; size: number }) => {
    const overlayEl = pdfOverlayRef.current;
    if (!overlayEl || !pdfPageSize) return null;
    const r = overlayEl.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const xCss = (t.x / pdfPageSize.width) * r.width;
    const yTopPt = pdfPageSize.height - t.y - (t.size || 14);
    const yCss = (yTopPt / pdfPageSize.height) * r.height;
    const fontPx = ((Number(t.size || 14) / pdfPageSize.height) * r.height);
    return { x: xCss, y: yCss, fontPx };
  };

  useEffect(() => {
    if (!onRegisterPlainTextGetter) return;
    onRegisterPlainTextGetter(() => wordPreviewRef.current?.getPlainText?.() || editContent || '');
  }, [onRegisterPlainTextGetter, docUrl, editContent]);

  useEffect(() => {
    if (typeof inlineEditMode === 'boolean') {
      setIsEditing(inlineEditMode);
      if (inlineEditMode) {
        setShowOverlay(false);
        if (!editContent) {
          setEditContent(doc?.content || doc?.rawContent || '');
        }
      }
    }
  }, [inlineEditMode, docUrl, doc]);

  const downloadCurrentDoc = () => {
    try {
      const name = fileName.trim() || 'attachment';
      const effectiveUrl = docRemoteUrl || docUrl;
      if (!effectiveUrl) return;

      if (effectiveUrl.startsWith('data:')) {
        const comma = effectiveUrl.indexOf(',');
        if (comma === -1) return;
        const header = effectiveUrl.slice(5, comma);
        const base64 = effectiveUrl.slice(comma + 1);
        const inferredMime = header.split(';')[0] || mimeType || 'application/octet-stream';

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: inferredMime });
        saveAs(blob, name);
        return;
      }

      // URL case (Supabase/public link)
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  useEffect(() => {
    const handleReset = () => {
      setShowOverlay(true);
    };
    window.addEventListener('viewer-reset', handleReset);
    return () => window.removeEventListener('viewer-reset', handleReset);
  }, []);

  useEffect(() => {
    if (doc?.isDraft) {
      setEditContent(doc.content || '');
    }
  }, [doc]);

  const handleExportTxt = () => {
    const contentToExport = editContent || doc?.content || '';
    const blob = new Blob([contentToExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `draft-${doc?.fileName || 'document'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!a4Ref.current) return;
    try {
      const canvas = await html2canvas(a4Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`document-${Date.now()}.pdf`);
    } catch {}
  };

  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (!doc) return (
      <div className={`flex-1 ${isDarkMode ? 'bg-slate-950' : 'bg-[#f4f7f9]'} flex flex-col items-center justify-center p-8`}>
          <div className="w-24 h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 border border-slate-100">
              <FileText className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-xl font-black text-slate-400">الرجاء اختيار وثيقة لبدء المعاينة</p>
      </div>
  );

  const pages = isDraft ? getPages(editContent || doc.content) : [doc.content];

  const scrollToPage = (idx: number) => {
    setCurrentPage(idx);
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const raw =
      doc?.content ||
      doc?.rawContent ||
      (typeof doc?.rasmHtml === 'string' ? stripHtmlToPlainText(doc.rasmHtml) : '') ||
      '';
    if (raw) {
      setEditContent((prev) => (prev ? prev : raw));
    }
  }, [doc]);

  useEffect(() => {
    if (onRegisterPlainTextGetter) {
      onRegisterPlainTextGetter(() => editContent || doc?.content || doc?.rawContent || (typeof doc?.rasmHtml === 'string' ? stripHtmlToPlainText(doc.rasmHtml) : '') || '');
    }
  }, [editContent, doc, onRegisterPlainTextGetter]);

  if (activeViewMode === 'onlyoffice') {
    return (
      <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-100">
        {/* Top Banner Button */}
        <div className="h-12 bg-[#023120] text-[#E6BE8A] flex items-center justify-between px-6 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${onlyOfficeFailed ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></div>
            <span className="text-xs font-bold font-amiri">
              {onlyOfficeFailed
                ? 'المحرر العدلي المدمج (تعديل مباشر) - يتم حفظ التغييرات وتوليد نسخة PDF تلقائياً'
                : 'محرر OnlyOffice المباشر - يتم حفظ التغييرات وتوليد نسخة PDF تلقائياً'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSavingOnlyOffice}
              onClick={onSaveAndCloseOnlyOffice}
              className="px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingOnlyOffice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>حفظ وإغلاق المحرر</span>
            </button>
            {onCloseOnlyOffice && (
              <button
                type="button"
                onClick={onCloseOnlyOffice}
                className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
              >
                <span>إلغاء</span>
              </button>
            )}
          </div>
        </div>
        {/* Editor Body */}
        <div className="flex-1 relative overflow-hidden bg-slate-200/50">
          {onlyOfficeDsUrl && onlyOfficeConfig && !onlyOfficeFailed ? (
            <OnlyOfficeEditor
              dsUrl={onlyOfficeDsUrl}
              config={onlyOfficeConfig}
              mode="embedded"
              onError={() => {
                setOnlyOfficeFailed(true);
              }}
            />
          ) : (
            <div className="w-full h-full overflow-y-auto p-8 flex justify-center items-start custom-scrollbar">
              <div className="w-[794px] min-h-[1123px] bg-white shadow-2xl rounded-sm p-12 text-right dir-rtl flex flex-col">
                {onlyOfficeFailed && (
                  <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-bold font-amiri shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>خادم OnlyOffice غير متاح حالياً (أوفلاين). تم تفعيل المحرر المدمج السريع لمتابعة التعديل وحفظ التغييرات مباشرة.</span>
                  </div>
                )}
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditContent(val);
                    onUpdateDraft?.(val);
                  }}
                  className="w-full flex-1 min-h-[950px] border-none outline-none resize-none font-amiri text-[15pt] leading-[2.2] text-justify bg-transparent"
                  dir="rtl"
                  placeholder="اكتب أو عدّل نص الرسم العدلي هنا..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (inlineEditMode) {
    return (
      <div className="w-full h-full overflow-y-auto bg-slate-200/60 p-8 flex justify-center items-start custom-scrollbar">
        <div className="w-[794px] min-h-[1123px] bg-white shadow-2xl rounded-sm p-12 text-right dir-rtl">
          <textarea
            value={editContent}
            onChange={(e) => {
              const val = e.target.value;
              setEditContent(val);
              onUpdateDraft?.(val);
            }}
            className="w-full h-full min-h-[1000px] border-none outline-none resize-none font-amiri text-[15pt] leading-[2.2] text-justify bg-transparent"
            dir="rtl"
            placeholder="اكتب أو عدّل نص الرسم العدلي هنا..."
          />
        </div>
      </div>
    );
  }

  return (
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative group bg-[#f8fafc]">
          {/* VIEW OVERLAY / UNLOCK SCREEN */}
          {showOverlay && !isEditing && !inlineEditMode && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOverlay(false);
              }}
              className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md cursor-pointer transition-all hover:bg-slate-900/50 group/overlay"
            >
                <div className="flex flex-col items-center gap-10 animate-in zoom-in duration-700">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/10 backdrop-blur-3xl flex items-center justify-center border border-white/20 shadow-2xl group-hover/overlay:scale-110 transition-transform duration-500">
                       <Maximize2 className="w-16 h-16 text-[#d9a36f]" />
                    </div>
                    <button 
                      className="px-14 py-7 bg-[#d9a36f] text-white rounded-[2rem] font-black text-2xl shadow-[0_30px_100px_rgba(217,163,111,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6 border-4 border-white/30"
                    >
                      اضغط لبدء الفحص الدقيق والمطابقة
                    </button>
                    <div className="flex items-center gap-4 text-white/40 font-black text-sm tracking-[0.5em] uppercase">
                       <div className="w-12 h-px bg-white/20"></div>
                       SECURE AUDIT INTERFACE
                       <div className="w-12 h-px bg-white/20"></div>
                    </div>
                </div>
            </div>
          )}

          {/* FLOATING ACTION PILL (COMPACT & CONTAINED) */}
          {!showOverlay && (
            <div dir="ltr" className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15 shadow-xl transition-all">
                {/* Page Navigation */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/10">
                  <button onClick={(e) => { e.stopPropagation(); scrollToPage(Math.max(0, currentPage - 1)); }} className="p-1 text-white/70 hover:text-blue-400 hover:bg-white/10 rounded-full transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="min-w-[45px] text-center font-bold text-xs text-white px-1">{currentPage + 1} / {pages.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); scrollToPage(Math.min(pages.length - 1, currentPage + 1)); }} className="p-1 text-white/70 hover:text-blue-400 hover:bg-white/10 rounded-full transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>

                <div className="w-px h-4 bg-white/20"></div>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); isDraft && handleExportPdf(); }} className="p-1.5 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-full transition-all" title="Export PDF"><Download className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-white/70 hover:bg-blue-500/20 hover:text-blue-400 rounded-full transition-all" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                </div>

                <div className="w-px h-4 bg-white/20"></div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); updateZoom(zoom - 0.1); }} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full"><Minus className="w-3.5 h-3.5" /></button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
                    <input 
                      type="range"
                      min="0.3"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => updateZoom(parseFloat(e.target.value))}
                      className="w-14 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
                    />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); updateZoom(zoom + 0.1); }} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 active:scale-110 transition-all rounded-full"><Plus className="w-3.5 h-3.5" /></button>
                </div>
            </div>
          )}

          {/* VIEWER CONTENT */}
          <div 
              ref={containerRef}
              className={`flex-1 relative overflow-auto scrollbar-hide px-10 ${isEditing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${isEditing ? '' : 'select-none text-right'} bg-[#e2e8f0]/30`}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
              onScroll={(e: any) => {
                const scrollTop = e.target.scrollTop;
                const stride = (PAGE_HEIGHT + PAGE_GAP) * zoom;
                const index = stride > 0 ? Math.round(scrollTop / stride) : 0;
                if (index < pages.length && index !== currentPage) {
                  setCurrentPage(index);
                }
              }}
          >
              {(() => {
                const shouldRenderSmartDraft = !hasRealBinaryUrl && !!doc?.rasmHtml && !inlineEditMode;
                const shouldRenderDraftText = (!hasRealBinaryUrl && isDraft) || (inlineEditMode && !isWord && !doc?.docxUrl && !doc?.editableUrl);
                const shouldRenderWord = isWord || (inlineEditMode && !!(doc?.docxUrl || doc?.editableUrl));
                const baseWidth = shouldRenderSmartDraft ? 800 : PAGE_WIDTH;
                const pageCount = Math.max(1, pages.length);
                const baseHeight = (pageCount * PAGE_HEIGHT) + ((pageCount - 1) * PAGE_GAP) + 200;
                // For PDFs: do not CSS-scale the iframe (it becomes blurry). Keep layout zoom at 1 and control zoom via URL hash.
                const layoutZoom = (isPDF && !inlineEditMode) ? 1 : zoom;
                const scaledWidth = Math.round(baseWidth * layoutZoom);
                const scaledHeight = Math.round(baseHeight * layoutZoom);
                const isDocxLike = Boolean(shouldRenderSmartDraft || shouldRenderDraftText || shouldRenderWord || inlineEditMode);

                return (
                  <div className="flex min-h-full justify-center pt-8 pb-32">
                    <div className="relative" style={isDocxLike ? undefined : { width: scaledWidth, height: scaledHeight }}>
                      {isDocxLike ? (
                        <div className="origin-top transform-none" style={{ zoom: zoom as any, transform: 'none' as any }}>
                          <div className="flex flex-col items-center gap-12">
                            {shouldRenderSmartDraft ? (
                              <div className="w-[800px]">
                                <RasmDocxPreview htmlContent={doc.rasmHtml || doc.rawContent} textContent={doc.rasmHtml || doc.rawContent} isDarkMode={isDarkMode} />
                              </div>
                            ) : shouldRenderDraftText ? (
                              <div ref={a4Ref} className="flex flex-col gap-32">
                                <WordPreview 
                                  key={`draft-${doc?.id || ''}-${renderNonce || 0}`} 
                                  ref={wordPreviewRef} 
                                  editable={isEditing && canInlineEdit} 
                                  textContent={editContent || doc?.content || doc?.rawContent || (typeof doc?.rasmHtml === 'string' ? stripHtmlToPlainText(doc.rasmHtml) : '')} 
                                  htmlContent={doc?.rasmHtml || doc?.rawContent} 
                                  onContentChange={(newText) => {
                                    setEditContent(newText);
                                    onUpdateDraft?.(newText);
                                  }}
                                  isDarkMode={isDarkMode} 
                                  msWordRtlJustify={true} 
                                />
                              </div>
                            ) : shouldRenderWord || inlineEditMode ? (
                              <>
                                <WordPreview
                                  key={String(doc?.docxUrl || doc?.editableUrl || effectiveDocUrl || 'word')}
                                  ref={wordPreviewRef}
                                  sourceTag={sourceTag}
                                  editable={isEditing && canInlineEdit}
                                  url={doc?.docxUrl || doc?.editableUrl || (isWord ? effectiveDocUrl : undefined)}
                                  textContent={editContent || doc?.content || doc?.rawContent || (typeof doc?.rasmHtml === 'string' ? stripHtmlToPlainText(doc.rasmHtml) : '')}
                                  htmlContent={doc?.rasmHtml || doc?.rawContent}
                                  onContentChange={(newText) => {
                                    setEditContent(newText);
                                    onUpdateDraft?.(newText);
                                  }}
                                  isDarkMode={isDarkMode}
                                  msWordRtlJustify={true}
                                />
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`absolute top-0 left-1/2 -translate-x-1/2 origin-top transition-transform duration-300 ${isDragging ? 'transition-none' : ''}`}
                          style={{ transform: `translateX(-50%) scale(${layoutZoom})`, willChange: 'transform' }}
                        >
                          <div className="flex flex-col items-center gap-12">
                            {isPDF ? (
                            <div
                              className="bg-white shadow-xl relative w-[min(98vw,1400px)] aspect-[210/297]"
                              style={
                                pdfEditorActive && pdfPageSize
                                  ? { aspectRatio: `${pdfPageSize.width}/${pdfPageSize.height}` as any }
                                  : undefined
                              }
                            >
                              <iframe
                                key={doc?.url || doc?.fileUrl || 'active-pdf-viewer'}
                                src={getJudgeLikePdfViewerUrl(doc?.url || doc?.fileUrl || pdfBlobUrl || effectiveDocUrl, zoom)}
                                className="absolute inset-0 w-full h-full border-0"
                                title="PDF Viewer"
                              />

                              {pdfEditorActive && (
                                <div
                                  ref={pdfOverlayRef}
                                  className="absolute inset-0"
                                  style={{ cursor: pdfTool === 'text' ? 'text' : 'crosshair' }}
                                  onMouseDown={(e) => {
                                    if (!pdfEditorActive) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (pdfTool !== 'redact') return;
                                    const overlayEl = pdfOverlayRef.current;
                                    if (!overlayEl) return;
                                    const r = overlayEl.getBoundingClientRect();
                                    const x = e.clientX - r.left;
                                    const y = e.clientY - r.top;
                                    pdfDragStartRef.current = { x, y };
                                    setPdfDragRectCss({ x, y, w: 0, h: 0 });
                                  }}
                                  onMouseMove={(e) => {
                                    if (!pdfEditorActive) return;
                                    if (pdfTool !== 'redact') return;
                                    if (!pdfDragStartRef.current) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const overlayEl = pdfOverlayRef.current;
                                    if (!overlayEl) return;
                                    const r = overlayEl.getBoundingClientRect();
                                    const x2 = e.clientX - r.left;
                                    const y2 = e.clientY - r.top;
                                    const x1 = pdfDragStartRef.current.x;
                                    const y1 = pdfDragStartRef.current.y;
                                    const x = Math.min(x1, x2);
                                    const y = Math.min(y1, y2);
                                    const w = Math.abs(x2 - x1);
                                    const h = Math.abs(y2 - y1);
                                    setPdfDragRectCss({ x, y, w, h });
                                  }}
                                  onMouseUp={(e) => {
                                    if (!pdfEditorActive) return;
                                    if (pdfTool !== 'redact') return;
                                    if (!pdfDragStartRef.current) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const rectCss = pdfDragRectCss;
                                    pdfDragStartRef.current = null;
                                    setPdfDragRectCss(null);
                                    if (!rectCss || rectCss.w < 2 || rectCss.h < 2) return;
                                    const rectPdf = pdfRectCssToPdf(rectCss);
                                    if (!rectPdf) return;
                                    pdfTextEditor?.onAddRect?.(pdfPageIndex, rectPdf);
                                  }}
                                  onClick={(e) => {
                                    if (!pdfEditorActive) return;
                                    if (pdfTool !== 'text') return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const overlayEl = pdfOverlayRef.current;
                                    if (!overlayEl) return;
                                    const r = overlayEl.getBoundingClientRect();
                                    const xCss = e.clientX - r.left;
                                    const yCss = e.clientY - r.top;

                                    const text = String(pdfTextEditor?.textInput || '');
                                    const size = Math.max(6, Number(pdfTextEditor?.fontSize || 14));
                                    if (!text.trim()) return;

                                    const p = cssPointToPdfPoint(xCss, yCss, size);
                                    if (!p) return;
                                    pdfTextEditor?.onAddText?.(pdfPageIndex, { x: p.x, y: p.y, text, size });
                                  }}
                                >
                                  {/* Existing redactions */}
                                  {(pdfEdits?.rects || []).map((r: any, idx: number) => {
                                    const css = pdfRectPdfToCss(r);
                                    if (!css) return null;
                                    return (
                                      <div
                                        key={`r-${idx}`}
                                        className="absolute bg-white/90 border border-slate-300"
                                        style={{ left: css.x, top: css.y, width: css.w, height: css.h }}
                                      />
                                    );
                                  })}

                                  {/* Existing overlay texts */}
                                  {(pdfEdits?.texts || []).map((t: any, idx: number) => {
                                    const css = pdfTextPdfToCss(t);
                                    if (!css) return null;
                                    const text = String(t.text || '');
                                    const isArabic = /[\u0600-\u06FF]/.test(text);
                                    return (
                                      <div
                                        key={`t-${idx}`}
                                        className="absolute text-black whitespace-pre"
                                        style={{
                                          left: css.x,
                                          top: css.y,
                                          fontSize: `${Math.max(8, Number(css.fontPx || 12))}px`,
                                          direction: isArabic ? 'rtl' : 'ltr',
                                          textAlign: isArabic ? 'right' : 'left',
                                          transform: isArabic ? 'translateX(0%)' : undefined,
                                        }}
                                      >
                                        {text}
                                      </div>
                                    );
                                  })}

                                  {/* Active drag rect */}
                                  {pdfDragRectCss && pdfTool === 'redact' && (
                                    <div
                                      className="absolute bg-white/70 border-2 border-dashed border-blue-500"
                                      style={{
                                        left: pdfDragRectCss.x,
                                        top: pdfDragRectCss.y,
                                        width: pdfDragRectCss.w,
                                        height: pdfDragRectCss.h,
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ) : isImage ? (
                            <div className="bg-white shadow-xl relative">
                              <img
                                src={
                                  doc.url ||
                                  doc.fileUrl ||
                                  doc.file_url ||
                                  doc.fileURL ||
                                  doc.publicUrl ||
                                  doc.public_url ||
                                  (typeof doc === 'string'
                                    ? doc
                                    : doc instanceof Blob
                                      ? URL.createObjectURL(doc)
                                      : '')
                                }
                                alt="Document Preview"
                                className="max-w-none shadow-sm"
                                style={{ height: '140vh', width: 'auto' }}
                                draggable={false}
                              />
                            </div>
                          ) : (
                            <div className="bg-white shadow-xl w-[210mm] min-h-[297mm] flex flex-col items-center justify-center text-center gap-6 relative">
                              <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                <FileText className="w-10 h-10 text-slate-400" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-800">لا يمكن معاينة هذا النوع داخل النظام</div>
                                <div className="text-xs font-bold text-slate-500 mt-1">{fileName}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const effectiveUrl = docRemoteUrl || docUrl;
                                    if (effectiveUrl) window.open(effectiveUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs"
                                >
                                  فتح
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadCurrentDoc();
                                  }}
                                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs"
                                >
                                  تحميل
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
      </div>
  );
};
