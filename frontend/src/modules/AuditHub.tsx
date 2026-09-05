import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  Download, 
  Share2,
  UserCheck, 
  Book, 
  Clipboard, 
  FileCheck, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  MoreVertical, 
  XCircle, 
  Printer,
  Plus,
  Minus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Save,
  Upload,
  Edit3,
  AlertCircle,
  PlusCircle,
  Building,
  CreditCard as CreditCardIcon,
  Medal as AwardIcon,
  FileSignature,
  RotateCcw,
  History,
  Lock,
  CheckCircle2,
  PenTool,
  Scale,
  FileSearch,
  ShieldCheck,
  Users,
  Building2,
  Trash2,
  Settings,
  HeartPulse,
  ScrollText,
  LayoutGrid,
  FolderArchive,
  Loader2
} from 'lucide-react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import type { FeesAgentState } from './FeesAgent';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import { PDFDocument } from 'pdf-lib';
import { RasmDocxPreview } from '../components/SmartDrafting/RasmDocxPreview';
import { WordPreview, type WordPreviewHandle } from '../components/WordPreview';
import { OnlyOfficeEditor } from '../components/OnlyOfficeEditor';
// @ts-ignore
import PizZip from 'pizzip';
import JSZip from 'jszip';
import { injectPlainTextIntoDocxZip } from '../utils/docxTemplate';

// --- Shared Constants & Helpers ---
const PAGE_WIDTH = 794; // A4 width at 96 DPI
const PAGE_HEIGHT = 1123; // A4 height at 96 DPI
const PAGE_GAP = 128; // gap-32

// (legacy debug helper removed)

const getPages = (text: string) => {
  if (!text) return [''];
  const rawPages = text.split(/\[PAGE_BREAK\]|\\f/);
  if (rawPages.length > 1) return rawPages;
  
  const maxChars = 850; 
  const maxLines = 14;
  const result = [];
  let current = text;

  while (current.length > 0) {
    let splitIdx = current.length <= maxChars ? current.length : maxChars;
    const lines = current.substring(0, splitIdx).split('\n');
    if (lines.length > maxLines) {
      let lineLimitIdx = 0;
      for (let i = 0; i < maxLines; i++) {
        lineLimitIdx = current.indexOf('\n', lineLimitIdx + 1);
      }
      if (lineLimitIdx !== -1 && lineLimitIdx < splitIdx) {
        splitIdx = lineLimitIdx;
      }
    }
    if (splitIdx < current.length) {
        let preferredSplit = current.lastIndexOf('\n\n', splitIdx);
        if (preferredSplit < splitIdx * 0.7) {
            preferredSplit = current.lastIndexOf('\n', splitIdx);
        }
        if (preferredSplit > splitIdx * 0.5) {
            splitIdx = preferredSplit;
        }
    }
    result.push(current.substring(0, splitIdx).trim());
    current = current.substring(splitIdx).trim();
    if (result.length > 50) break;
  }
  return result;
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
// --- High-Resolution Viewer Component ---
const HighResViewer = ({ 
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
  updateZoom,
  onRegisterPlainTextGetter,
  renderNonce,
  pdfTextEditor
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
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
    if (forcedBasePdfUrl) return forcedBasePdfUrl;
    const u = String(docUrl || '');
    const r = String(docRemoteUrl || '');
    if (u.startsWith('blob:')) return u;
    if (u.startsWith('data:')) return r || u;
    return u || r;
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

  const canInlineEdit = isWord || isDraft;

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
    onRegisterPlainTextGetter(() => wordPreviewRef.current?.getPlainText?.() || '');
  }, [onRegisterPlainTextGetter, docUrl]);

  useEffect(() => {
    if (!canInlineEdit) {
      setIsEditing(false);
      return;
    }
    if (typeof inlineEditMode === 'boolean') {
      setIsEditing(inlineEditMode);
      if (inlineEditMode) setShowOverlay(false);
    }
  }, [inlineEditMode, canInlineEdit, docUrl]);

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

  return (
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative group bg-[#f8fafc]">
          {/* VIEW OVERLAY / UNLOCK SCREEN */}
          {showOverlay && !isEditing && (
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

          {/* FLOATING ACTION PILL (PREMIUM DESIGN) */}
          {!showOverlay && (
            <div dir="ltr" className="fixed bottom-8 left-[50%] -translate-x-1/2 z-[200] flex items-center gap-2 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl p-3 rounded-full border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-500">
                {/* Page Navigation */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10">
                  <button onClick={(e) => { e.stopPropagation(); scrollToPage(Math.max(0, currentPage - 1)); }} className="p-2 text-white/60 hover:text-blue-400 hover:bg-white/10 rounded-full transition-all duration-300"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="min-w-[60px] text-center font-bold text-sm text-white px-2">{currentPage + 1} / {pages.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); scrollToPage(Math.min(pages.length - 1, currentPage + 1)); }} className="p-2 text-white/60 hover:text-blue-400 hover:bg-white/10 rounded-full transition-all duration-300"><ChevronRight className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-white/20"></div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); isDraft && handleExportPdf(); }} className="p-2.5 text-white/60 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-full transition-all duration-300" title="Export PDF"><Download className="w-4 h-4" /></button>
                  <button className="p-2.5 text-white/60 hover:bg-blue-500/20 hover:text-blue-400 rounded-full transition-all duration-300" title="Print"><Printer className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-6 bg-white/20"></div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); updateZoom(zoom - 0.1); }} className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full"><Minus className="w-4 h-4" /></button>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-white min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
                    <input 
                      type="range"
                      min="0.3"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => updateZoom(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
                    />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); updateZoom(zoom + 0.1); }} className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 active:scale-110 transition-all rounded-full"><Plus className="w-4 h-4" /></button>
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
                const shouldRenderSmartDraft = !hasRealBinaryUrl && !!doc?.rasmHtml;
                const shouldRenderDraftText = !hasRealBinaryUrl && isDraft;
                const shouldRenderWord = isWord;
                const baseWidth = shouldRenderSmartDraft ? 800 : PAGE_WIDTH;
                const pageCount = Math.max(1, pages.length);
                const baseHeight = (pageCount * PAGE_HEIGHT) + ((pageCount - 1) * PAGE_GAP) + 200;
                // For PDFs: do not CSS-scale the iframe (it becomes blurry). Keep layout zoom at 1 and control zoom via URL hash.
                const layoutZoom = isPDF ? 1 : zoom;
                const scaledWidth = Math.round(baseWidth * layoutZoom);
                const scaledHeight = Math.round(baseHeight * layoutZoom);
                const isDocxLike = Boolean(shouldRenderSmartDraft || shouldRenderDraftText || shouldRenderWord);

                return (
                  <div className="flex min-h-full justify-center pt-8 pb-32">
                    <div className="relative" style={isDocxLike ? undefined : { width: scaledWidth, height: scaledHeight }}>
                      {isDocxLike ? (
                        <div className="origin-top transform-none" style={{ zoom: zoom as any, transform: 'none' as any }}>
                          <div className="flex flex-col items-center gap-12">
                            {shouldRenderSmartDraft ? (
                              <div className="w-[800px]">
                                <RasmDocxPreview textContent={stripHtmlToPlainText(doc.rasmHtml)} isDarkMode={isDarkMode} />
                              </div>
                            ) : shouldRenderDraftText ? (
                              <div ref={a4Ref} className="flex flex-col gap-32">
                                <WordPreview key={`draft-${doc?.id || ''}-${renderNonce || 0}`} ref={wordPreviewRef} editable={isEditing && canInlineEdit} textContent={editContent || doc.content} isDarkMode={isDarkMode} msWordRtlJustify={true} />
                              </div>
                            ) : shouldRenderWord ? (
                              <>
                                <WordPreview
                                  key={String(effectiveDocUrl || 'word')}
                                  ref={wordPreviewRef}
                                  sourceTag={sourceTag}
                                  editable={isEditing && canInlineEdit}
                                  url={effectiveDocUrl}
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
                                src={getJudgeLikePdfViewerUrl(pdfBlobUrl || effectiveDocUrl || docUrl, zoom)}
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

export const AuditHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('data');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionToken, user, notaryProfile } = useAuth();
  const trpcUtils = trpc.useContext();
  const params = new URLSearchParams(location.search);
  const rasmId = params.get('id');

  const [state, setState] = useState<FeesAgentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark as requested
  const [selectedAttachmentTabDoc, setSelectedAttachmentTabDoc] = useState<any>(null);
  
  // Modals & Panels
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'correct' | 'reject' | null>(null);

  // Signature Transition State
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  // Pre-save review (before category selection)
  const [isPreSaveReviewModalOpen, setIsPreSaveReviewModalOpen] = useState(false);
  const [preSaveReviewIntent, setPreSaveReviewIntent] = useState<'save' | 'signing'>('save');
  const [saveCategoryIntent, setSaveCategoryIntent] = useState<'save' | 'signing'>('save');
  const [isSaveCategoryModalOpen, setIsSaveCategoryModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ show: boolean; docId?: string }>({ show: false });
  const [sigChecks, setSigChecks] = useState({ 
    accuracy: false, 
    judgeNotes: false, 
    registration: false, 
    finality: false 
  });
  const [preSaveChecks, setPreSaveChecks] = useState({
    inclusionComplete: false,
    judgeNotesApplied: false,
    noJudgeNotes: false,
    registrationConfirmed: false,
    finalClosure: false,
  });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  const buildFinalReviewChecklist = useCallback(() => ({
    inclusionComplete: !!preSaveChecks.inclusionComplete,
    judgeNotesApplied: !!preSaveChecks.judgeNotesApplied,
    noJudgeNotes: !!preSaveChecks.noJudgeNotes,
    registrationConfirmed: !!preSaveChecks.registrationConfirmed,
    finalClosure: !!preSaveChecks.finalClosure,
    savedAt: new Date().toISOString(),
    source: 'audit_hub_pre_signing_review',
  }), [preSaveChecks]);

  // Get the current notary's primary court for auto-population
  const defaultCourt = notaryProfile?.primary_court || 'الرباط';

  // Property Units System
  const [propertyUnits, setPropertyUnits] = useState<any[]>([
    { 
        id: crypto.randomUUID(), 
        type: 'unregistered', 
        unregisteredData: { bookType: 'أملاك', bookNumber: '', count: '', page: '', date: '', authority: defaultCourt, notes: '' },
        registeredData: { deedNumber: '', issueDate: '', registryOffice: defaultCourt, applicationNumber: '', notes: '' }
    }
  ]);

  const addPropertyUnit = () => {
    setPropertyUnits([...propertyUnits, { 
        id: crypto.randomUUID(), 
        type: 'unregistered',
        unregisteredData: { bookType: 'أملاك', bookNumber: '', count: '', page: '', date: '', authority: defaultCourt, notes: '' },
        registeredData: { deedNumber: '', issueDate: '', registryOffice: defaultCourt, applicationNumber: '', notes: '' }
    }]);
  };

  const removePropertyUnit = (id: string) => {
    if (propertyUnits.length > 1) {
        setPropertyUnits(propertyUnits.filter(u => u.id !== id));
    }
  };

  const updatePropertyUnit = (id: string, field: string, value: any, subField?: string) => {
    setPropertyUnits(propertyUnits.map(u => {
      if (u.id === id) {
        if (subField) {
          return { ...u, [field]: { ...u[field], [subField]: value } };
        }
        return { ...u, [field]: value };
      }
      return u;
    }));
  };

  const [vaultModal, setVaultModal] = useState<{ isOpen: boolean; title: string; type: 'ids' | 'certificates' | 'none' }>({ isOpen: false, title: '', type: 'none' });
  const [selectedVaultDoc, setSelectedVaultDoc] = useState<any>(null);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const [primaryTextEditorOpen, setPrimaryTextEditorOpen] = useState(false);
  const [primaryBusy, setPrimaryBusy] = useState(false);
  const primaryDocBlobUrlRef = useRef<string | null>(null);
  const editedPlainTextGetterRef = useRef<null | (() => string)>(null);
  const preEditPlainTextRef = useRef<string>('');
  const preEditDocIdRef = useRef<string | null>(null);
  const [viewerDocRenderNonce, setViewerDocRenderNonce] = useState(0);
  const onlyOfficeBaselineRef = useRef<{ versionId: string | null; updatedAt: string | null }>({
    versionId: null,
    updatedAt: null,
  });

  const revokePrimaryDocBlobUrl = () => {
    if (primaryDocBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(primaryDocBlobUrlRef.current);
      } catch {}
      primaryDocBlobUrlRef.current = null;
    }
  };

  const base64ToBlobUrl = (base64: string, mime: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  };

  // PDF text editor (white-out + overlay text)
  const [pdfFormEditorOpen, setPdfFormEditorOpen] = useState(false);
  const [pdfFormBusy, setPdfFormBusy] = useState(false);
  const [pdfFormError, setPdfFormError] = useState<string | null>(null);

  type PdfRedactionRect = { x: number; y: number; w: number; h: number };
  type PdfOverlayText = { x: number; y: number; text: string; size: number };
  type PdfTextEdits = { rects: PdfRedactionRect[]; texts: PdfOverlayText[] };

  const [pdfTextTool, setPdfTextTool] = useState<'redact' | 'text'>('redact');
  const [pdfTextInput, setPdfTextInput] = useState('');
  const [pdfTextFontSize, setPdfTextFontSize] = useState(14);
  const [pdfTextPageIndex, setPdfTextPageIndex] = useState(0);
  const [pdfTextPageSizes, setPdfTextPageSizes] = useState<Array<{ width: number; height: number }>>([]);
  const [pdfTextEditsByPage, setPdfTextEditsByPage] = useState<Record<number, PdfTextEdits>>({});

  const pdfOriginalDocRef = useRef<any>(null);
  const pdfOriginalBytesRef = useRef<ArrayBuffer | null>(null);

  const getDocEffectiveUrl = (doc: any): string => {
    return (
      doc?.remoteUrl ||
      doc?.remote_url ||
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toString();
  };

  const stripHash = (url: string) => {
    const idx = url.indexOf('#');
    return idx === -1 ? url : url.slice(0, idx);
  };

  const buildPdfViewerUrl = (url: string, pageIndex: number) => {
    const base = stripHash(url);
    const page = Math.max(1, (pageIndex || 0) + 1);
    return `${base}#page=${page}&zoom=page-width`;
  };

  const isSelectedPdf = useMemo(() => {
    const d = selectedVaultDoc as any;
    if (!d) return false;
    const u = getDocEffectiveUrl(d).toLowerCase();
    const n = (d?.fileName || d?.file_name || d?.name || '').toString().toLowerCase();
    const t = (d?.mimeType || d?.mime_type || d?.type || '').toString().toLowerCase();
    return n.endsWith('.pdf') || u.includes('.pdf') || t.includes('application/pdf');
  }, [selectedVaultDoc]);

  const closePdfFormEditor = useCallback((opts?: { restoreSelection?: boolean }) => {
    const restoreSelection = opts?.restoreSelection !== false;
    setPdfFormEditorOpen(false);
    setPdfFormBusy(false);
    setPdfFormError(null);
    setPdfTextTool('redact');
    setPdfTextInput('');
    setPdfTextFontSize(14);
    setPdfTextPageIndex(0);
    setPdfTextPageSizes([]);
    setPdfTextEditsByPage({});
    pdfOriginalBytesRef.current = null;

    if (restoreSelection && pdfOriginalDocRef.current) {
      setSelectedVaultDoc(pdfOriginalDocRef.current);
    }

    pdfOriginalDocRef.current = null;
  }, []);

  const openPdfFormEditor = useCallback(async () => {
    if (!selectedVaultDoc || !isSelectedPdf) return;
    setPdfFormError(null);
    setPdfFormBusy(true);
    try {
      const url = stripHash(getDocEffectiveUrl(selectedVaultDoc));
      if (!url) throw new Error('PDF URL is missing');

      // snapshot current doc to revert
      pdfOriginalDocRef.current = selectedVaultDoc;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load PDF (${resp.status})`);
      const bytes = await resp.arrayBuffer();
      pdfOriginalBytesRef.current = bytes;

      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const sizes = pages.map((p) => {
        const s = p.getSize();
        return { width: s.width, height: s.height };
      });

      setPdfTextPageSizes(sizes);
      setPdfTextPageIndex(0);
      setPdfTextEditsByPage({});
      setPdfTextTool('redact');
      setPdfFormEditorOpen(true);

      // Force viewer to a stable view so overlay mapping is consistent.
      setSelectedVaultDoc((prev: any) => {
        const base = pdfOriginalDocRef.current || prev;
        const effective = stripHash(getDocEffectiveUrl(base));
        const nextUrl = buildPdfViewerUrl(effective, 0);
        return {
          ...(base || {}),
          fileUrl: nextUrl,
          url: nextUrl,
          mimeType: 'application/pdf',
          type: 'application/pdf',
        };
      });
    } catch (e: any) {
      setPdfFormError(e?.message || String(e));
      setPdfFormEditorOpen(true);
    } finally {
      setPdfFormBusy(false);
    }
  }, [isSelectedPdf, selectedVaultDoc]);

  useEffect(() => {
    if (!pdfFormEditorOpen) return;
    const base = pdfOriginalDocRef.current || selectedVaultDoc;
    if (!base) return;
    const effective = stripHash(getDocEffectiveUrl(base));
    if (!effective) return;
    setSelectedVaultDoc((prev: any) => {
      const nextUrl = buildPdfViewerUrl(effective, pdfTextPageIndex);
      return {
        ...(prev || {}),
        fileUrl: nextUrl,
        url: nextUrl,
      };
    });
  }, [pdfFormEditorOpen, pdfTextPageIndex, selectedVaultDoc]);

  const addPdfRedactionRect = useCallback((pageIndex: number, rect: PdfRedactionRect) => {
    setPdfTextEditsByPage((prev) => {
      const current = prev[pageIndex] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIndex]: {
          ...current,
          rects: [...current.rects, rect],
        },
      };
    });
  }, []);

  const addPdfOverlayText = useCallback((pageIndex: number, textItem: PdfOverlayText) => {
    setPdfTextEditsByPage((prev) => {
      const current = prev[pageIndex] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIndex]: {
          ...current,
          texts: [...current.texts, textItem],
        },
      };
    });
  }, []);

  const pdfHasAnyTextEdits = useMemo(() => {
    return Object.values(pdfTextEditsByPage).some(
      (e) => (e?.rects?.length || 0) > 0 || (e?.texts?.length || 0) > 0
    );
  }, [pdfTextEditsByPage]);

  // If user navigates away from PDF while editor is open, just clean up (don't restore selection).
  useEffect(() => {
    if (!pdfFormEditorOpen) return;
    if (isSelectedPdf) return;
    closePdfFormEditor({ restoreSelection: false });
  }, [closePdfFormEditor, isSelectedPdf, pdfFormEditorOpen]);
  
  // High-Res Viewer State
  const [viewerZoom, setViewerZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Section Collapse State
  const [isUnitsCollapsed, setIsUnitsCollapsed] = useState(true);
  const [isFinancialCollapsed, setIsFinancialCollapsed] = useState(true);

  // Availability State
  const [isUnitsAvailable, setIsUnitsAvailable] = useState(true);
  const [isFinancialAvailable, setIsFinancialAvailable] = useState(true);

  const initialFinalRecord = React.useMemo(() => ({
    serial: '2026/001',
    certificateType: 'مطابق للفئة المحددة',
    register: '',
    number: '',
    page: '',
    count: '',
    date: '2026-02-18',
    registrationDate: '',
    authority: defaultCourt,
    notes: '',
    firstPartyName: 'test',
    firstPartyId: '66676678',
    secondPartyName: '',
    secondPartyId: '',
    deedBook: 'أملاك العقارية',
    deedNumber: 'REF-9920-R',
    deedPage: '124',
    deedCount: '15',
    depositNumber: 'DEP-2026-9921',
    taxOrder: 'TAX-88201-9B',
    notaryName: '',
    optionalParties: [] as Array<{ id: string; name: string; nationalId: string }>,
  }), [defaultCourt]);

  const [finalRecord, setFinalRecord] = useState(initialFinalRecord);

  const [onlyOfficeOpen, setOnlyOfficeOpen] = useState(false);
  const [onlyOfficeDsUrl, setOnlyOfficeDsUrl] = useState<string | null>(null);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<Record<string, unknown> | null>(null);

  const updateRecord = (field: string, value: string) => {
    setFinalRecord(prev => ({ ...prev, [field]: value }));
  };

  const addOptionalParty = () => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: [
        ...(Array.isArray(prev.optionalParties) ? prev.optionalParties : []),
        { id: crypto.randomUUID(), name: '', nationalId: '' },
      ],
    }));
  };

  const updateOptionalParty = (partyId: string, field: 'name' | 'nationalId', value: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (Array.isArray(prev.optionalParties) ? prev.optionalParties : []).map((party: any) =>
        party.id === partyId ? { ...party, [field]: value } : party
      ),
    }));
  };

  const removeOptionalParty = (partyId: string) => {
    setFinalRecord((prev: any) => ({
      ...prev,
      optionalParties: (Array.isArray(prev.optionalParties) ? prev.optionalParties : []).filter((party: any) => party.id !== partyId),
    }));
  };

  const rasmQuery = trpc.feesAgent.documents.getSavedRasm.useQuery(
    { sessionToken: sessionToken || '', id: rasmId || '' },
    { 
      enabled: !!sessionToken && !!rasmId,
      retry: 0
    }
  );

  const payload = rasmQuery.data?.payload as any;
  const judgeSubmissionId = payload?.judgeSubmissionId || payload?.step7JudgeSubmissionId || undefined;

  const judgeSubmissionQuery = trpc.feesAgent.getMyJudgeSubmission.useQuery(
    { sessionToken: sessionToken || '', submissionId: judgeSubmissionId || '' },
    { enabled: !!sessionToken && !!judgeSubmissionId, retry: 0 }
  );

  const fileNumberForJudgeLookup =
    (rasmQuery.data?.fileNumber as string | null | undefined) ||
    payload?.meta?.fileNumber ||
    payload?.fileNumber ||
    undefined;

  const latestApprovedByFileNumberQuery = trpc.feesAgent.getLatestApprovedJudgeSubmissionByFileNumber.useQuery(
    { sessionToken: sessionToken || '', fileNumber: fileNumberForJudgeLookup || '' },
    { enabled: !!sessionToken && !!fileNumberForJudgeLookup, retry: 0 }
  );

  const judgeSubmissionById: any = judgeSubmissionQuery.data || null;
  const judgeSubmissionByFileNumber: any = latestApprovedByFileNumberQuery.data?.submission || null;

  const isApprovedJudgeStatus = (status: any) => {
    const s = (status || '').toString();
    return ['accepted', 'accepted_with_notes', 'substantive_notes'].includes(s);
  };

  // Align with Judge portal, but keep the current rasm-linked submission first.
  const approvedByFile = isApprovedJudgeStatus(judgeSubmissionByFileNumber?.status) ? judgeSubmissionByFileNumber : null;
  const effectiveJudgeSubmission: any =
    (judgeSubmissionId ? judgeSubmissionById : null) ||
    approvedByFile ||
    judgeSubmissionByFileNumber ||
    judgeSubmissionById ||
    null;

  const effectiveJudgePayload: any = effectiveJudgeSubmission?.payload || null;

  const judgeAttachmentDocs = useMemo(() => {
    if (!effectiveJudgePayload) return [] as any[];

    const normalizeToDoc = (att: any, fallbackCategory?: string) => {
      if (!att) return null;
      const base64 = att.base64;
      const type = att.type || att.mimeType || att.mime_type || 'application/octet-stream';
      const name = att.name || att.fileName || att.filename || att.file_name || 'attachment';

      const url =
        base64
          ? `data:${type};base64,${base64}`
          : (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null);
      if (!url) return null;

      const category = (att.category || fallbackCategory || 'judge_attachment').toString();
      return {
        id: `judge-submission-attachment-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isJudgePrimary:
          Boolean(att?.isJudgePrimary) ||
          category.toLowerCase().includes('judge_attachment') ||
          Boolean((att?.field || '').toString().includes('manualRasmFile')),
      };
    };

    const out: any[] = [];

    const singleDoc = normalizeToDoc(effectiveJudgePayload?.attachment, 'judge_attachment');
    if (singleDoc) out.push(singleDoc);

    const list = Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : [];
    for (const att of list) {
      const d = normalizeToDoc(att, att?.category);
      if (!d) continue;
      out.push(d);
    }

    // De-dupe by url/name
    const seen = new Set<string>();
    const deduped = out.filter((d) => {
      const key = `${d.url || ''}||${d.fileName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Prefer Judge Portal primary (judge_attachment) first (typically PDF),
    // then DOCX, then other PDFs.
    deduped.sort((a, b) => {
      const ac = (a.category || '').toString().toLowerCase();
      const bc = (b.category || '').toString().toLowerCase();

      if (ac === 'judge_attachment' && bc !== 'judge_attachment') return -1;
      if (bc === 'judge_attachment' && ac !== 'judge_attachment') return 1;

      const an0 = (a.fileName || a.name || '').toString().toLowerCase();
      const bn0 = (b.fileName || b.name || '').toString().toLowerCase();
      const aIsWord0 = /\.(docx?|dotx?)($|\?)/i.test(an0);
      const bIsWord0 = /\.(docx?|dotx?)($|\?)/i.test(bn0);
      if (aIsWord0 && !bIsWord0) return -1;
      if (bIsWord0 && !aIsWord0) return 1;

      const aIsPdf = /\.(pdf)($|\?)/i.test(an0);
      const bIsPdf = /\.(pdf)($|\?)/i.test(bn0);
      if (aIsPdf && !bIsPdf) return -1;
      if (bIsPdf && !aIsPdf) return 1;
      return an0.localeCompare(bn0);
    });

    return deduped;
  }, [effectiveJudgePayload]);

  const judgeAttachmentDoc = judgeAttachmentDocs[0] || null;
  const judgeAcceptanceNotes = useMemo(() => {
    const fromSubmission = String((effectiveJudgeSubmission as any)?.judgeNotes || '').trim();
    if (fromSubmission) return fromSubmission;
    const fromPayload = String((effectiveJudgePayload as any)?.judgeSubmissionJudgeNotes || '').trim();
    return fromPayload || null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission]);

  const isPdfLikeDoc = useCallback((doc: any) => {
    if (!doc) return false;
    const fileName = String(doc?.fileName || doc?.file_name || doc?.name || '').toLowerCase();
    const mime = String(doc?.mimeType || doc?.mime_type || doc?.type || '').toLowerCase();
    const url = String(
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toLowerCase();
    return (
      fileName.endsWith('.pdf') ||
      mime.includes('application/pdf') ||
      mime.includes('pdf') ||
      url.includes('.pdf')
    );
  }, []);

  const isWordLikeDoc = useCallback((doc: any) => {
    if (!doc) return false;
    const fileName = String(doc?.fileName || doc?.file_name || doc?.name || '').toLowerCase();
    const mime = String(doc?.mimeType || doc?.mime_type || doc?.type || '').toLowerCase();
    const url = String(
      doc?.url ||
      doc?.fileUrl ||
      doc?.file_url ||
      doc?.fileURL ||
      doc?.publicUrl ||
      doc?.public_url ||
      ''
    ).toLowerCase();
    return (
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.dotx') ||
      mime.includes('application/msword') ||
      mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
      url.includes('.doc') ||
      url.includes('.docx') ||
      url.includes('.dotx')
    );
  }, []);
  const judgeWordAttachmentDoc = useMemo(() => {
    return judgeAttachmentDocs.find((doc: any) => isWordLikeDoc(doc)) || null;
  }, [isWordLikeDoc, judgeAttachmentDocs]);

  const judgePrimaryDoc = useMemo(() => {
    const canonicalPreviewUrl = String((effectiveJudgeSubmission as any)?.previewUrl || '').trim();
    if (canonicalPreviewUrl) {
      return {
        id: `judge-primary-preview-${String((effectiveJudgeSubmission as any)?.id || '')}`,
        category: 'judge_attachment',
        fileName:
          String((effectiveJudgeSubmission as any)?.previewName || 'judge-preview.pdf').trim() || 'judge-preview.pdf',
        name:
          String((effectiveJudgeSubmission as any)?.previewName || 'judge-preview.pdf').trim() || 'judge-preview.pdf',
        fileUrl: canonicalPreviewUrl,
        url: canonicalPreviewUrl,
        mimeType: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        type: String((effectiveJudgeSubmission as any)?.previewMimeType || 'application/pdf'),
        isJudgePrimary: true,
      };
    }

    if (!effectiveJudgePayload) return null;

    const normalizeToDoc = (att: any, fallbackCategory?: string) => {
      if (!att) return null;
      const base64 = att.base64;
      const type = att.type || att.mimeType || att.mime_type || 'application/octet-stream';
      const name = att.name || att.fileName || att.filename || att.file_name || 'attachment';
      const url =
        base64
          ? `data:${type};base64,${base64}`
          : (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null);
      if (!url) return null;

      const category = (att.category || fallbackCategory || 'judge_attachment').toString();
      return {
        id: `judge-primary-${category}-${name}-${String(att.size || '')}`,
        category,
        fileName: name,
        name,
        fileUrl: url,
        url,
        mimeType: type,
        type,
        isJudgePrimary: true,
      };
    };

    const list = Array.isArray(effectiveJudgePayload?.attachments) ? effectiveJudgePayload.attachments : [];
    const manual = list.find((a: any) => (a?.field || '').toString().includes('manualRasmFile'));
    const judgeCategory = list.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment');

    const primaryAttachment = manual || judgeCategory || null;
    const primaryAttachmentDoc = normalizeToDoc(primaryAttachment, primaryAttachment?.category);
    if (primaryAttachmentDoc) return primaryAttachmentDoc;

    const singleDoc = normalizeToDoc(effectiveJudgePayload?.attachment, 'judge_attachment');
    if (singleDoc) return singleDoc;

    if (effectiveJudgePayload?.rasmHtml) {
      return {
        id: 'judge-smart-rasm',
        fileName: 'المحرر القضائي (المعتمد)',
        rasmHtml: effectiveJudgePayload.rasmHtml,
        isSmartDraft: true,
        isJudgePrimary: true,
      };
    }

    if (effectiveJudgePayload?.draft) {
      return {
        id: 'judge-draft-doc',
        fileName: 'مسودة القاضي',
        isDraft: true,
        content: effectiveJudgePayload.draft,
        isJudgePrimary: true,
      };
    }

    return null;
  }, [effectiveJudgePayload, effectiveJudgeSubmission]);

  const attachmentTabDocs = useMemo(() => {
    const normalizeSavedAttachment = (att: any) => {
      if (!att) return null;
      const fileName =
        (att.fileName || att.file_name || att.name || att.filename || 'attachment').toString();
      const mimeType =
        (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
      const url =
        (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null) as
          | string
          | null;
      if (!url) return null;
      return {
        ...att,
        fileName,
        name: att.name || fileName,
        mimeType: att.mimeType || att.mime_type || att.type || mimeType,
        type: att.type || att.mime_type || att.mimeType || mimeType,
        fileUrl: att.fileUrl || att.file_url || att.url || url,
        url: att.url || att.fileUrl || att.file_url || url,
      };
    };

    const isMainRasmCategory = (category: string) =>
      category === 'primary_attachment' ||
      category === 'deed' ||
      category === 'rasm' ||
      category === 'contract' ||
      category === 'title_documents' ||
      category === 'post_registration' ||
      category.includes('judge_attachment');

    const rawSaved = Array.isArray(rasmQuery.data?.attachments) ? rasmQuery.data.attachments : [];
    const savedDocs = rawSaved
      .map(normalizeSavedAttachment)
      .filter(Boolean)
      .filter((att: any) => {
        const category = String(att?.category || '').toLowerCase();
        return !category.startsWith('audit_');
      });

    const mainDocUrls = new Set(
      [judgePrimaryDoc, judgeAttachmentDoc]
        .map((doc: any) => String(doc?.url || doc?.fileUrl || '').trim())
        .filter(Boolean)
    );
    const mainDocNames = new Set(
      [judgePrimaryDoc, judgeAttachmentDoc]
        .map((doc: any) => String(doc?.fileName || doc?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const merged = [...judgeAttachmentDocs, ...savedDocs];
    const seen = new Set<string>();
    return merged.filter((doc: any) => {
      const category = String(doc?.category || '').toLowerCase();
      const url = String(doc?.url || doc?.fileUrl || '').trim();
      const fileName = String(doc?.fileName || doc?.name || '').trim().toLowerCase();
      if (Boolean(doc?.isJudgePrimary) || isMainRasmCategory(category)) {
        return false;
      }
      if (url && mainDocUrls.has(url)) return false;
      if (fileName && mainDocNames.has(fileName)) return false;

      const key = `${String(doc?.url || '').trim()}||${String(doc?.fileName || doc?.name || '').trim()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [judgeAttachmentDoc, judgeAttachmentDocs, judgePrimaryDoc, rasmQuery.data?.attachments]);

  useEffect(() => {
    if (activeTab !== 'attachments') return;
    if (!attachmentTabDocs.length) {
      setSelectedAttachmentTabDoc(null);
      return;
    }

    setSelectedAttachmentTabDoc((prev: any) => {
      if (!prev) return attachmentTabDocs[0];
      const prevKey = `${String(prev?.url || prev?.fileUrl || '').trim()}||${String(prev?.fileName || prev?.name || '').trim()}`;
      const stillExists = attachmentTabDocs.find((doc: any) => {
        const nextKey = `${String(doc?.url || doc?.fileUrl || '').trim()}||${String(doc?.fileName || doc?.name || '').trim()}`;
        return nextKey === prevKey;
      });
      return stillExists || attachmentTabDocs[0];
    });
  }, [activeTab, attachmentTabDocs]);

  // --- Dynamic Validation Engine ---
  const validations = useMemo(() => {
    const list = [];
    
    // 1. Parties Identity
    const partiesComplete = state?.sellers?.every(s => s.idNumber && s.idNumber !== '---' && s.idNumber.length > 3);
    list.push({ 
        label: 'اكتمال بيانات الأطراف (الرقم الوطني)', 
        status: partiesComplete ? 'success' : 'error',
        msg: partiesComplete ? 'تم التحقق من الوثائق الثبوتية' : 'يرجى إدخال أرقام الهوية الوطنية لجميع الأطراف'
    });

    // 2. Property Units Validation
    const unitsValid = !isUnitsAvailable || propertyUnits.every(unit => {
        if (unit.type === 'unregistered') {
            return unit.unregisteredData.bookType && unit.unregisteredData.page && unit.unregisteredData.count;
        } else {
            return unit.registeredData.deedNumber && unit.registeredData.deedNumber.length > 3;
        }
    });

    list.push({
        label: 'بيانات العقارات / السندات المرجعية',
        status: unitsValid ? 'success' : 'error',
        msg: !isUnitsAvailable ? 'تم وضع الحالة على "غير متوفر"' : (unitsValid ? 'جميع الحقول الإلزامية مكتملة' : 'هناك حقول فارغة في أحد العقارات المضافة (رقم الرسم أو بيانات التضمين)')
    });

    // 3. Duplicate Detection (Internal to current form)
    const unitStrings = isUnitsAvailable ? propertyUnits.filter(u => 
        (u.type === 'unregistered' && u.unregisteredData.count) || 
        (u.type === 'registered' && u.registeredData.deedNumber)
    ).map(u => 
        u.type === 'unregistered' 
            ? `UNREG-${u.city}-${u.unregisteredData.bookType}-${u.unregisteredData.page}-${u.unregisteredData.count}`
            : `REG-${u.registeredData.deedNumber}`
    ) : [];
    const hasDuplicates = isUnitsAvailable && unitStrings.length > 0 && new Set(unitStrings).size !== unitStrings.length;

    list.push({
        label: 'منع التكرار (رقم الرسم / السند)',
        status: hasDuplicates ? 'error' : 'success',
        msg: !isUnitsAvailable ? 'لا ينطبق (غير متوفر)' : (hasDuplicates ? 'خطأ: تم إدخال نفس العقار أكثر من مرة في هذه المعاملة' : 'لا يوجد تكرار في السندات المدخلة')
    });

    // New 3b: Financial Data Validation
    const financialValid = !isFinancialAvailable || (finalRecord.taxOrder && finalRecord.taxOrder.length > 2);
    list.push({
        label: 'التحقق من البيانات المالية',
        status: financialValid ? 'success' : 'error',
        msg: !isFinancialAvailable ? 'تم وضع الحالة على "غير متوفر"' : (financialValid ? 'البيانات المالية مكتملة' : 'يرجى إدخال رقم أمر المطالبة')
    });

    // 4. Notary Signature / Data
    const notaryValid = finalRecord.judgeName && finalRecord.judgeName.length > 5;
    list.push({
        label: 'بيانات العدل(ة) والختم الرقمي',
        status: notaryValid ? 'success' : 'warning',
        msg: notaryValid ? 'توقيع العدل(ة) معتمد' : 'يرجى التأكد من اسم العدل(ة) الكامل'
    });

    // 5. Attachments
    const hasAttachments = (rasmQuery.data?.attachments?.length || 0) > 0;
    list.push({
        label: 'المرفقات الرقمية الأصلية',
        status: hasAttachments ? 'success' : 'error',
        msg: hasAttachments ? 'تم العثور على النسخة الضوئية للرسم' : 'عنصر مفقود: لا يمكن التضمين بدون صورة السند الأصلي'
    });

    return list;
  }, [state, propertyUnits, rasmQuery.data, finalRecord.judgeName, isUnitsAvailable, isFinancialAvailable, finalRecord.taxOrder]);

  const stats = useMemo(() => {
    const unitsSectionComplete =
      !isUnitsAvailable ||
      propertyUnits.every((unit: any) =>
        unit.type === 'unregistered'
          ? !!(unit.unregisteredData?.bookNumber && unit.unregisteredData?.count && unit.unregisteredData?.page)
          : !!(unit.registeredData?.deedNumber && unit.registeredData?.issueDate)
      );

    const financialSectionComplete =
      !isFinancialAvailable ||
      (!!(finalRecord.taxOrder && finalRecord.taxOrder.length > 2) &&
        String(finalRecord.taxOrder || '').trim() !== String(initialFinalRecord.taxOrder || '').trim());

    const trackedEntries = [
      { current: finalRecord.register, weight: 1 },
      { current: finalRecord.page, weight: 1 },
      { current: finalRecord.count, weight: 1 },
      { current: finalRecord.registrationDate, weight: 1 },
      { current: finalRecord.firstPartyName, weight: 1 },
      { current: finalRecord.firstPartyId, weight: 1 },
      { current: finalRecord.secondPartyName, weight: 1 },
      { current: finalRecord.secondPartyId, weight: 1 },
      { current: unitsSectionComplete ? 'complete' : '', initial: '', weight: 4 },
      { current: financialSectionComplete ? 'complete' : '', initial: '', weight: 2 },
    ];

    const filledCount = trackedEntries.reduce((sum, entry) => {
      const current = String(entry.current || '').trim();
      const initial = String((entry as any).initial || '').trim();
      const isFilled = current.length > 0 && (initial ? current !== initial : true);
      return sum + (isFilled ? entry.weight : 0);
    }, 0);

    const totalTrackedFields = trackedEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const baseFillRatio = totalTrackedFields > 0 ? Math.round((filledCount / totalTrackedFields) * 100) : 0;
    const judgeFieldCompleted = !!String((finalRecord as any).judgeName || '').trim();
    const fillRatio = judgeFieldCompleted ? 100 : Math.min(baseFillRatio, 93);

    let qualityLabel = 'بداية';
    let qualityColor = 'text-slate-500';
    if (fillRatio >= 1 && fillRatio < 35) {
      qualityLabel = 'قيد التعبئة';
      qualityColor = 'text-red-500';
    } else if (fillRatio < 65) {
      qualityLabel = 'تقدم متوسط';
      qualityColor = 'text-amber-500';
    } else if (fillRatio < 100) {
      qualityLabel = 'قارب الاكتمال';
      qualityColor = 'text-blue-500';
    } else if (fillRatio >= 100) {
      qualityLabel = 'مكتمل';
      qualityColor = 'text-emerald-500';
    }

    const displayFees = (rasmQuery.data as any)?.totalAmount || (rasmQuery.data as any)?.amount || 124;

    return {
      fillRatio,
      qualityLabel,
      qualityColor,
      displayFees,
      filledCount: judgeFieldCompleted ? totalTrackedFields : filledCount,
      totalTrackedFields,
    };
  }, [finalRecord, isUnitsAvailable, isFinancialAvailable, propertyUnits, rasmQuery.data]);

  const finalizeMutation = (trpc as any).feesAgent.documents.finalizeAudit.useMutation();
  const addPrimaryAttachmentMutation = (trpc as any).feesAgent.documents.addSavedRasmAttachment.useMutation();
  const updateSavedRasmMutation = (trpc as any).feesAgent.documents.updateSavedRasm.useMutation();
  const createSavedRasmMutation = (trpc as any).feesAgent.documents.createSavedRasm.useMutation();
  const deleteSavedRasmMutation = (trpc as any).feesAgent.documents.deleteSavedRasm.useMutation();
  const revertLatestSavedRasmEditMutation = (trpc as any).feesAgent.documents.revertLatestSavedRasmEdit.useMutation();
  const generateDocxMutation = trpc.smartDrafting.generateDocxFromText.useMutation();

  const savePatchDraftMutation = (trpc as any).feesAgent.documents.savePatchDraft.useMutation();
  const finalizeForSigningMutation = (trpc as any).feesAgent.documents.finalizeForSigning.useMutation();
  const prepareSigningPortalDocumentMutation = (trpc as any).feesAgent.documents.prepareSigningPortalDocument.useMutation();
  const getOnlyOfficeConfigMutation = (trpc as any).feesAgent.documents.getOnlyOfficeConfig.useMutation();
  const forceOnlyOfficeSaveMutation = (trpc as any).feesAgent.documents.forceOnlyOfficeSave.useMutation();

  const [latestAuditVersionId, setLatestAuditVersionId] = useState<string | null>(null);
  const [latestSavedDocsPointerUpdatedAt, setLatestSavedDocsPointerUpdatedAt] = useState<string | null>(null);

type ActiveDocVersion = 'base' | 'edited';
type OnlyOfficePaneStatus = 'idle' | 'loading-config' | 'loading-editor' | 'ready' | 'error';
  const [activeDocVersion, setActiveDocVersion] = useState<ActiveDocVersion>('base');
  const [activeEditedArtifact, setActiveEditedArtifact] = useState<null | {
    versionId: string;
    url: string;
    kind: 'pdf' | 'docx';
  }>(null);
  const [onlyOfficeMode, setOnlyOfficeMode] = useState<'overlay' | 'embedded'>('overlay');
  const [onlyOfficePaneStatus, setOnlyOfficePaneStatus] = useState<OnlyOfficePaneStatus>('idle');
  const [onlyOfficeError, setOnlyOfficeError] = useState<string | null>(null);
  const [onlyOfficeLoadStartedAt, setOnlyOfficeLoadStartedAt] = useState<number | null>(null);
  const [onlyOfficeRenderNonce, setOnlyOfficeRenderNonce] = useState(0);
  const [signingTransition, setSigningTransition] = useState<{ active: boolean; progress: number; message: string }>({
    active: false,
    progress: 0,
    message: '',
  });
  const [signingTransitionStartedAt, setSigningTransitionStartedAt] = useState<number | null>(null);
  const [signingTransitionTick, setSigningTransitionTick] = useState(0);

  useEffect(() => {
    if (!signingTransition.active) {
      setSigningTransitionStartedAt(null);
      setSigningTransitionTick(0);
      return;
    }

    setSigningTransitionStartedAt((prev) => prev ?? Date.now());
    const interval = window.setInterval(() => {
      setSigningTransitionTick((prev) => prev + 1);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [signingTransition.active]);

  const signingTransitionUi = useMemo(() => {
    const elapsedMs = signingTransitionStartedAt ? Math.max(0, Date.now() - signingTransitionStartedAt) : 0;
    const elapsedSec = elapsedMs / 1000;
    const phase =
      signingTransition.progress >= 100
        ? 'handoff'
        : elapsedSec < 2
          ? 'start'
          : 'saving';

    const rotatingMessages = [
      'جاري حفظ الرسم المضمن...',
      'يتم تأمين البيانات...',
      'المرجو الانتظار، العملية جارية...',
    ];
    const rotatingIndex = signingTransitionTick % rotatingMessages.length;

    const stageTitle =
      phase === 'handoff'
        ? 'جاري تحويل الرسم إلى توقيع العدلين...'
        : phase === 'start'
          ? 'جاري تحريك الرسم نحو مرحلة الحفظ...'
          : rotatingMessages[rotatingIndex];

    const detailText =
      phase === 'handoff'
        ? 'تم تأكيد الحفظ، ويجري فتح مساحة التوقيع الآن.'
        : signingTransition.message || 'جاري تنفيذ المرحلة الحالية...';

    const docPosition =
      phase === 'handoff'
        ? 78
        : phase === 'start'
          ? 20
          : 42;

    const glowAtSave = phase !== 'handoff';
    const penGlow = phase === 'handoff';
    const lineFill = phase === 'handoff' ? 100 : phase === 'start' ? 36 : 62;

    return {
      elapsedMs,
      elapsedSec,
      phase,
      stageTitle,
      detailText,
      docPosition,
      glowAtSave,
      penGlow,
      lineFill,
      isLongWait: elapsedSec >= 5,
    };
  }, [signingTransition.active, signingTransition.message, signingTransition.progress, signingTransitionStartedAt, signingTransitionTick]);
  const onlyOfficeAutoLoadKeyRef = useRef<string | null>(null);
  const onlyOfficeRequestSeqRef = useRef(0);
  const onlyOfficeEmbeddedRetryRef = useRef(0);

  const forcedViewerDoc = useMemo(() => {
    if (activeDocVersion === 'edited') return selectedVaultDoc;
    if (selectedVaultDoc && isWordLikeDoc(selectedVaultDoc)) return selectedVaultDoc;
    if (judgePrimaryDoc && isPdfLikeDoc(judgePrimaryDoc)) return judgePrimaryDoc;
    return selectedVaultDoc;
  }, [activeDocVersion, isPdfLikeDoc, isWordLikeDoc, judgePrimaryDoc, selectedVaultDoc]);
  const isEmbeddedOnlyOfficePreviewTab =
    activeTab === 'formal' || activeTab === 'legal' || activeTab === 'data';
  const isEmbeddedOnlyOfficeActive =
    isEmbeddedOnlyOfficePreviewTab && activeDocVersion === 'base';
  const shouldRenderOnlyOfficePrimaryPane = isEmbeddedOnlyOfficeActive;
  const shouldMountEmbeddedOnlyOffice =
    isEmbeddedOnlyOfficeActive &&
    !!onlyOfficeDsUrl &&
    !!onlyOfficeConfig &&
    onlyOfficePaneStatus !== 'error';
  const shouldShowEmbeddedOnlyOfficeLoader =
    shouldRenderOnlyOfficePrimaryPane &&
    !shouldMountEmbeddedOnlyOffice &&
    onlyOfficePaneStatus !== 'error';

  const docxTemplateBase64Ref = useRef<string | null>(null);

  const loadDocxTemplateBase64 = useCallback(async () => {
    if (docxTemplateBase64Ref.current) return docxTemplateBase64Ref.current;
    const templateResponse = await fetch('/templates/headers/DECOR ADOUL 33.docx');
    if (!templateResponse.ok) throw new Error('Failed to fetch template');
    const templateArrayBuffer = await templateResponse.arrayBuffer();

    // Convert ArrayBuffer -> base64 (browser-safe)
    const templateUint8 = new Uint8Array(templateArrayBuffer);
    let binary = '';
    for (let i = 0; i < templateUint8.length; i++) {
      binary += String.fromCharCode(templateUint8[i]);
    }
    const templateBase64 = btoa(binary);
    docxTemplateBase64Ref.current = templateBase64;
    return templateBase64;
  }, []);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('file read failed'));
      reader.onload = () => {
        const s = String(reader.result || '');
        const comma = s.indexOf(',');
        resolve(comma === -1 ? s : s.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    });

  const uploadPrimaryFile = useCallback(
    async (file: File) => {
      if (!rasmId || !sessionToken) return;
      setPrimaryBusy(true);
      try {
        const base64 = await fileToBase64(file);
        const inferredMime = file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Prefer Blob URL for preview (stable even for >1MB). Keep base64 for upload.
        revokePrimaryDocBlobUrl();
        const blobUrl = URL.createObjectURL(file);
        primaryDocBlobUrlRef.current = blobUrl;

        const res = await addPrimaryAttachmentMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          category: 'primary_attachment',
          field: 'primaryAttachment',
          file: {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          },
        });

        // Prefer showing the freshly generated file immediately (no network fetch).
        // Keep the remote URL for later download/open.
        const remoteUrl =
          (res as any)?.fileUrl ||
          (res as any)?.url ||
          (res as any)?.publicUrl ||
          (res as any)?.data?.fileUrl ||
          (res as any)?.data?.url ||
          '';
        const preferredUrl = blobUrl;
        if (preferredUrl) {
          setSelectedVaultDoc({
            id: res.attachmentId,
            category: 'primary_attachment',
            fileName: file.name,
            name: file.name,
            fileUrl: preferredUrl,
            url: preferredUrl,
            remoteUrl,
            localDataUrl: `data:${inferredMime};base64,${base64}`,
            mimeType: inferredMime,
            type: inferredMime,
          });
        }

        // Optional: keep attachments list updated, but do not block UI.
        // Avoid refetch here to prevent any timing-based viewer blanking.
      } finally {
        setPrimaryBusy(false);
      }
    },
    [addPrimaryAttachmentMutation, rasmId, rasmQuery, sessionToken]
  );

  const saveEditedPdfAsNewAttachment = useCallback(async () => {
    if (!pdfOriginalBytesRef.current) {
      alert('تعذر تحميل ملف PDF الأصلي.');
      return;
    }

    const hasAnyEdits = Object.values(pdfTextEditsByPage).some(
      (e) => (e?.rects?.length || 0) > 0 || (e?.texts?.length || 0) > 0
    );
    if (!hasAnyEdits) {
      alert('لا توجد تعديلات لحفظها.');
      return;
    }

    const dataUrlToBytes = (dataUrl: string) => {
      const comma = dataUrl.indexOf(',');
      const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    try {
      setPdfFormBusy(true);

      const pdfDoc = await PDFDocument.load(pdfOriginalBytesRef.current);
      const pages = pdfDoc.getPages();

      const rasterScale = 2; // 144dpi-ish (keeps Arabic rendering correct via canvas)

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const edits = pdfTextEditsByPage[pageIndex];
        if (!edits || ((edits.rects?.length || 0) === 0 && (edits.texts?.length || 0) === 0)) continue;

        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * rasterScale));
        canvas.height = Math.max(1, Math.round(height * rasterScale));
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redactions (white)
        ctx.fillStyle = '#ffffff';
        for (const r of edits.rects || []) {
          const x = r.x * rasterScale;
          const yTop = (height - r.y - r.h) * rasterScale;
          const w = r.w * rasterScale;
          const h = r.h * rasterScale;
          ctx.fillRect(x, yTop, w, h);
        }

        // Overlay text (black)
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        for (const t of edits.texts || []) {
          const text = String(t.text || '');
          if (!text.trim()) continue;
          const isArabic = /[\u0600-\u06FF]/.test(text);
          (ctx as any).direction = isArabic ? 'rtl' : 'ltr';
          ctx.textAlign = isArabic ? 'right' : 'left';
          const size = Math.max(6, Number(t.size) || 14);
          ctx.font = `${size * rasterScale}px sans-serif`;
          const x = t.x * rasterScale;
          const yTop = (height - t.y - size) * rasterScale;
          ctx.fillText(text, x, yTop);
        }

        const pngBytes = dataUrlToBytes(canvas.toDataURL('image/png'));
        const png = await pdfDoc.embedPng(pngBytes);
        page.drawImage(png, { x: 0, y: 0, width, height });
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const fileName = `primary-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      await uploadPrimaryFile(file);
      closePdfFormEditor({ restoreSelection: false });
    } catch (e: any) {
      alert('تعذر حفظ PDF: ' + (e?.message || String(e)));
    } finally {
      setPdfFormBusy(false);
    }
  }, [closePdfFormEditor, pdfTextEditsByPage, uploadPrimaryFile]);

  const uploadPrimaryBase64 = useCallback(
    async (opts: { base64: string; name: string; size?: number; previewTextContent?: string }) => {
      if (!rasmId || !sessionToken) return;
      setPrimaryBusy(true);
      try {
        const inferredMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Use Blob URL for preview (avoid huge data: URLs)
        revokePrimaryDocBlobUrl();
        const blobUrl = base64ToBlobUrl(opts.base64, inferredMime);
        primaryDocBlobUrlRef.current = blobUrl;

        const res = await addPrimaryAttachmentMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          category: 'primary_attachment',
          field: 'primaryAttachment',
          file: {
            name: opts.name,
            type: inferredMime,
            size: opts.size || opts.base64.length,
            base64: opts.base64,
          },
        });

        const remoteUrl =
          (res as any)?.fileUrl ||
          (res as any)?.url ||
          (res as any)?.publicUrl ||
          (res as any)?.data?.fileUrl ||
          (res as any)?.data?.url ||
          '';
        const preferredUrl = blobUrl;
        setSelectedVaultDoc({
          id: res?.attachmentId || `primary-${Date.now()}`,
          category: 'primary_attachment',
          fileName: opts.name,
          name: opts.name,
          fileUrl: preferredUrl,
          url: preferredUrl,
          remoteUrl,
          localDataUrl: `data:${inferredMime};base64,${opts.base64}`,
          mimeType: inferredMime,
          type: inferredMime,
          previewTextContent: opts.previewTextContent,
        });
      } finally {
        setPrimaryBusy(false);
      }
    },
    [addPrimaryAttachmentMutation, rasmId, sessionToken]
  );

  const savePrimaryFromInlineText = useCallback(
    async (text: string, opts?: { savedRasmId?: string }) => {
      const content = (text || '').trim();
      if (!content) return;

      const isDocxLike = (att: any): boolean => {
        const category = String(att?.category || '').toLowerCase();
        if (category === 'judge_attachment_docx') return true;
        const name = String(att?.name || att?.fileName || att?.filename || att?.originalName || '');
        const lower = name.toLowerCase();
        const mime = String(att?.mimeType || att?.type || att?.mime_type || '').toLowerCase();
        if (lower.endsWith('.docx') || lower.endsWith('.doc')) return true;
        if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
        return false;
      };

      const pickUrl = (att: any): string | null => {
        const url =
          att?.fileUrl ||
          att?.url ||
          att?.file_url ||
          att?.publicUrl ||
          att?.public_url ||
          att?.remoteUrl ||
          null;
        return typeof url === 'string' ? url : null;
      };

      const pickBaseJudgeDocxUrl = (attachments: any[], selected: any): string | null => {
        const selectedRemote = pickUrl(selected || {});
        if (selectedRemote && isDocxLike(selected)) return selectedRemote;
        const docxAtt = attachments.find((a: any) => isDocxLike(a)) || null;
        return docxAtt ? pickUrl(docxAtt) : null;
      };

      // New model: save a patch draft (base DOCX is immutable judge-accepted artifact)
      const effectiveRasmId = (opts?.savedRasmId || rasmId || '').toString();
      if (!effectiveRasmId || !sessionToken) return;

      const attachments = (rasmQuery.data as any)?.attachments || [];
      const baseDocUrl = pickBaseJudgeDocxUrl(attachments, selectedVaultDoc as any);

      if (!baseDocUrl || typeof baseDocUrl !== 'string' || !/^https?:/i.test(baseDocUrl)) {
        throw new Error('Base judge DOCX URL not found (judge_attachment_docx).');
      }

      // Prefer a minimal "append" patch when user only added text at the end.
      // This preserves the original DOCX layout (logo/spacing/tables) and avoids reflow/deformation.
      const baseSnapshot = String(preEditPlainTextRef.current || '').replace(/\r\n/g, '\n').trimEnd();
      const nextText = String(content || '').replace(/\r\n/g, '\n').trimEnd();
      const appended = baseSnapshot && nextText.startsWith(baseSnapshot) ? nextText.slice(baseSnapshot.length) : '';
      const patch =
        appended && appended.trim()
          ? { version: 1 as const, ops: [{ op: 'append_plain_text' as const, value: appended }] }
          : { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: nextText }] };

      // Minimal targeted debug for the edited-doc regression
      // eslint-disable-next-line no-console
      console.log('[SAVE_EDIT] click', {
        rasmId: effectiveRasmId,
        previousVersionId: latestAuditVersionId || null,
      });

      const res = await savePatchDraftMutation.mutateAsync({
        sessionToken: sessionToken || '',
        savedRasmId: effectiveRasmId,
        baseDocUrl,
        patch,
        supersedesVersionId: latestAuditVersionId || undefined,
      });

      if (!(res as any)?.previewPdfUrl) {
        // Without a server-generated PDF (LibreOffice), we'll fall back to DOCX rendering in-browser,
        // which is known to deform complex RTL documents. Surface a clear warning for operators.
        // eslint-disable-next-line no-console
        console.warn('[SAVE_EDIT] pdf missing; falling back to docx-preview', {
          versionId: (res as any)?.versionId || null,
          pdfConversionError: (res as any)?.pdfConversionError || null,
        });
        try {
          alert('تنبيه: تعذر توليد PDF للختم/المعاينة (LibreOffice غير متوفر أو فشل التحويل). سيتم عرض ملف Word وقد يبدو مشوهاً.');
        } catch {}
      }

      // Backend persists the “latest edited version” pointer on the Saved Rasm.
      try {
        const backendUpdatedAt = (res as any)?.latestPointer?.updatedAt || null;
        setLatestSavedDocsPointerUpdatedAt(backendUpdatedAt);
      } catch {}

      setLatestAuditVersionId(res?.versionId || null);

      // Prefer PDF for preview to avoid docx-preview layout deformation.
      const returnedUrl = (res as any)?.previewPdfUrl || (res as any)?.previewDocxUrl || null;
      const returnedVersionId = (res as any)?.versionId || null;
      const returnedUpdatedAt = (res as any)?.createdAt || null;

      // eslint-disable-next-line no-console
      console.log('[SAVE_EDIT] result', {
        rasmId: effectiveRasmId,
        previousVersionId: latestAuditVersionId || null,
        newVersionId: returnedVersionId,
        latestPointer: (res as any)?.latestPointer || null,
      });

      if (returnedUrl && returnedVersionId) {
        const lower = String(returnedUrl).toLowerCase();
        const kind: 'pdf' | 'docx' = lower.includes('.pdf') ? 'pdf' : 'docx';

        // Keep Judge-portal behavior: do NOT auto-switch the viewer immediately.
        setActiveDocVersion('base');
        setActiveEditedArtifact({ versionId: returnedVersionId, url: returnedUrl, kind });
      }

      setPrimaryTextEditorOpen(false);
      setViewerDocRenderNonce((n) => n + 1);

      // Invalidate Saved Documents cache so list/detail show edited version immediately.
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: effectiveRasmId });
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
      } catch {}
    },
    [judgeSubmissionId, latestAuditVersionId, rasmId, rasmQuery.data, savePatchDraftMutation, selectedVaultDoc, sessionToken, trpcUtils]
  );

  const handleFinalize = () => {
    if (!state || !rasmId) return;
    setDecisionType('approve');
    setIsDecisionModalOpen(true);
  };

  const baseDocUrlForDebug = useMemo(() => {
    const attachments = (rasmQuery.data as any)?.attachments || [];
    const savedJudgeDoc =
      attachments.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment_docx') ||
      attachments.find((a: any) => (a?.category || '').toString().toLowerCase() === 'judge_attachment');
    const base = (judgePrimaryDoc as any) || savedJudgeDoc || judgeAttachmentDoc || null;
    const url = base ? getDocEffectiveUrl(base) : '';
    return String(url || '').trim() || null;
  }, [judgeAttachmentDoc, judgePrimaryDoc, rasmQuery.data]);

  const editedDocUrlForDebug = useMemo(() => {
    if (activeEditedArtifact?.url) return activeEditedArtifact.url;
    const d = selectedVaultDoc as any;
    const cat = (d?.category || '').toString().toLowerCase();
    if (cat.startsWith('audit_')) return getDocEffectiveUrl(d) || null;
    return null;
  }, [activeEditedArtifact, selectedVaultDoc]);

  useEffect(() => {
    if (!rasmQuery.data) return;

    const attachments = rasmQuery.data.attachments || [];
    const persistedEditedDocxAttachment = attachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_docx' || category === 'audit_draft_docx';
    });
    const persistedEditedPdfAttachment = attachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
    });
    const persistedEditedAttachment = persistedEditedPdfAttachment || persistedEditedDocxAttachment || null;

    const persistedVersionId =
      rasmQuery.data?.latestDraftVersionId ||
      String((persistedEditedAttachment as any)?.metadata?.versionId || (persistedEditedAttachment as any)?.metadata?.version_id || '') ||
      null;

    const persistedUrl =
      persistedEditedPdfAttachment?.fileUrl ||
      persistedEditedDocxAttachment?.fileUrl ||
      (rasmQuery.data?.latestDraftDocxUrl || null);

    if (!persistedVersionId || !persistedUrl) return;

    const inferredKind: 'pdf' | 'docx' =
      String(persistedEditedAttachment?.category || persistedUrl).toLowerCase().includes('pdf') ||
      String(persistedUrl).toLowerCase().includes('.pdf')
        ? 'pdf'
        : 'docx';

    setLatestSavedDocsPointerUpdatedAt((current) => current || rasmQuery.data?.latestDraftUpdatedAt || null);
    setActiveEditedArtifact((current) => {
      if (current?.versionId === persistedVersionId && current?.url === persistedUrl && current?.kind === inferredKind) {
        return current;
      }
      return {
        versionId: persistedVersionId,
        url: persistedUrl,
        kind: inferredKind,
      };
    });
  }, [rasmQuery.data]);

  useEffect(() => {
    if (!rasmQuery.data) return;
    
    const savedChecklist = (rasmQuery.data.payload as any)?.finalReviewChecklist;
    if (!savedChecklist || typeof savedChecklist !== 'object') return;
    setPreSaveChecks({
      inclusionComplete: !!savedChecklist.inclusionComplete,
      judgeNotesApplied: !!savedChecklist.judgeNotesApplied,
      noJudgeNotes: !!savedChecklist.noJudgeNotes,
      registrationConfirmed: !!savedChecklist.registrationConfirmed,
      finalClosure: !!savedChecklist.finalClosure,
    });
  }, [rasmQuery.data?.payload]);

  const confirmFinalize = async (): Promise<boolean> => {
    if (!state || !rasmId) return false;

    // Check if there are critical errors in checklist
    const criticalError = validations.find(v => v.status === 'error');
    if (criticalError) {
      alert(`لا يمكن إتمام التضمين: ${criticalError.msg}`);
      return false;
    }
    
    // Auto-calculate names from sellers[0]
    const fullName = state.sellers?.[0]?.name || '---';
    const names = fullName.split(' ');
    const personal = names[0] || '---';
    const family = names.length > 1 ? names.slice(1).join(' ') : '---';

    // Construct detailed property reference for the ledger
    const propertySummary = propertyUnits.map(u => 
        u.type === 'unregistered'
            ? `عدلي(${u.city}, ${u.unregisteredData.page}/${u.unregisteredData.count})`
            : `محفظ(${u.registeredData.propertyId})`
    ).join(' | ');

    // 🔄 Sync modifications to the database before final approval
    // Importantly, capture current state of inline edits from the rendered WordPreview.
    // HighResViewer registers a plain-text getter through `editedPlainTextGetterRef`.
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();
    const finalPayload = {
        ...state,
        draft: currentDocContent, // persist inline edits
        propertyUnits, // include the enhanced unit list
        isUnitsAvailable,
        isFinancialAvailable,
        optionalParties: Array.isArray((finalRecord as any).optionalParties) ? (finalRecord as any).optionalParties : [],
        finalReviewChecklist: buildFinalReviewChecklist(),
    };

    // New signing model:
    // - Base DOCX (judge accepted) stays immutable.
    // - We save edits as a patch JSON.
    // - Server generates final PDF for signing from (base DOCX + patch).
    let finalPdfUrl: string | null = null;
    let versionIdForSigning: string | null = null;
    try {
      if (currentDocContent && sessionToken) {
        const attachments = (rasmQuery.data as any)?.attachments || [];
        const isDocxLike = (att: any): boolean => {
          const category = String(att?.category || '').toLowerCase();
          if (category === 'judge_attachment_docx') return true;
          const name = String(att?.name || att?.fileName || att?.filename || att?.originalName || '');
          const lower = name.toLowerCase();
          const mime = String(att?.mimeType || att?.type || att?.mime_type || '').toLowerCase();
          if (lower.endsWith('.docx') || lower.endsWith('.doc')) return true;
          if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
          return false;
        };

        const pickUrl = (att: any): string | null => {
          const url =
            att?.fileUrl ||
            att?.url ||
            att?.file_url ||
            att?.publicUrl ||
            att?.public_url ||
            att?.remoteUrl ||
            null;
          return typeof url === 'string' ? url : null;
        };

        const pickBaseJudgeDocxUrl = (attachments: any[], selected: any): string | null => {
          const selectedRemote = pickUrl(selected || {});
          if (selectedRemote && isDocxLike(selected)) return selectedRemote;
          const docxAtt = attachments.find((a: any) => isDocxLike(a)) || null;
          return docxAtt ? pickUrl(docxAtt) : null;
        };

        const baseDocUrl = pickBaseJudgeDocxUrl(attachments, selectedVaultDoc as any);

        if (!baseDocUrl || typeof baseDocUrl !== 'string' || !/^https?:/i.test(baseDocUrl)) {
          throw new Error('Base judge DOCX URL not found (judge_attachment_docx).');
        }

      const baseSnapshot = String(preEditPlainTextRef.current || '').replace(/\r\n/g, '\n').trimEnd();
      const nextText = String(currentDocContent || '').replace(/\r\n/g, '\n').trimEnd();
      const appended = baseSnapshot && nextText.startsWith(baseSnapshot) ? nextText.slice(baseSnapshot.length) : '';
      const patch =
        appended && appended.trim()
          ? { version: 1 as const, ops: [{ op: 'append_plain_text' as const, value: appended }] }
          : { version: 1 as const, ops: [{ op: 'set_plain_text' as const, value: nextText }] };

        const draftRes = await savePatchDraftMutation.mutateAsync({
          sessionToken: sessionToken || '',
          savedRasmId: rasmId,
          baseDocUrl,
          patch,
          supersedesVersionId: latestAuditVersionId || undefined,
        });

        versionIdForSigning = draftRes?.versionId || null;
        setLatestAuditVersionId(versionIdForSigning);

        if (!versionIdForSigning) throw new Error('Failed to create audit doc version');

        const finRes = await finalizeForSigningMutation.mutateAsync({
          sessionToken: sessionToken || '',
          versionId: versionIdForSigning,
        });

        finalPdfUrl = finRes?.finalPdfUrl || null;
      }
    } catch (e) {
      // This one is important: signing must use server artifact.
      alert('تعذر توليد النسخة النهائية للتوقيع (PDF) على الخادم. يرجى المحاولة لاحقاً أو التحقق من إعدادات التحويل.');
      return false;
    }

    // 2. Transmit latest payload to finalization to avoid potential race conditions.
    // finalizeAudit is the source of truth (no fire-and-forget mutation before navigation).
    try {
      await finalizeMutation.mutateAsync({
        sessionToken: sessionToken || '',
        id: rasmId,
        payload: finalPayload,
        ledgerEntry: {
          family_name: family,
          personal_name: personal,
          id_card: state.sellers?.[0]?.idNumber || '---',
          certificate_type: state.documentType || 'رسم_عدلي',
          operation_type: 'تضمين_نهائي',
          amount_received: 0,
          receipt_number: `${finalRecord.register} (ص: ${finalRecord.page}, ع: ${finalRecord.count})`,
          property_reference: propertySummary,
          notary_name: finalRecord.judgeName,
        },
      });

      setIsDecisionModalOpen(false);
      alert('تم التضمين بنجاح. تم إغلاق الملف ومنحه أثراً رقمياً حياً.');
      const navigationState = { draft: finalPayload.draft, finalPdfUrl, versionIdForSigning };

      // 🚀 Redirect to the Notary Signing Portal (open the selected rasm directly)
      const targetId = rasmId || '';
      navigate(targetId ? `/notary-signing-portal/sign/${targetId}` : `/notary-signing-portal`, {
        state: navigationState,
      });
      return true;
    } catch (err: any) {
      alert('حدث خطأ أثناء التضمين: ' + (err?.message || String(err)));
      return false;
    }
  };

  const selectedDocumentUrl = useMemo(() => {
    const doc = forcedViewerDoc as any;
    if (!doc) return '';
    return String(
      doc?.remoteUrl ||
        doc?.remote_url ||
        doc?.fileUrl ||
        doc?.url ||
        doc?.file_url ||
        doc?.fileURL ||
        doc?.publicUrl ||
        doc?.public_url ||
        ''
    ).trim();
  }, [forcedViewerDoc]);

  const selectedDocumentName = useMemo(() => {
    const doc = forcedViewerDoc as any;
    return String(doc?.fileName || doc?.file_name || doc?.name || 'document').trim();
  }, [forcedViewerDoc]);

  const shareSelectedDocument = useCallback(async () => {
    if (!selectedDocumentUrl) {
      alert('لا توجد نسخة قابلة للمشاركة حالياً.');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedDocumentName,
          text: 'مشاركة الوثيقة الحالية',
          url: selectedDocumentUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(selectedDocumentUrl);
      alert('تم نسخ رابط الوثيقة إلى الحافظة.');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      alert('تعذر تنفيذ المشاركة الحالية.');
    }
  }, [selectedDocumentName, selectedDocumentUrl]);

  const printSelectedDocument = useCallback(() => {
    if (selectedDocumentUrl) {
      const printWindow = window.open(selectedDocumentUrl, '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        alert('تعذر فتح نافذة الطباعة.');
      }
      return;
    }

    window.print();
  }, [selectedDocumentUrl]);

  const deleteCurrentRasm = useCallback(async () => {
    if (!sessionToken || !rasmId) return;
    if (!confirm('هل تريد حذف هذا الرسم نهائياً؟')) return;

    try {
      await deleteSavedRasmMutation.mutateAsync({ sessionToken, id: rasmId });
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
      } catch {}
      navigate('/dashboard?module=notaryPortal');
    } catch (error: any) {
      alert(error?.message || 'تعذر حذف الرسم.');
    }
  }, [deleteSavedRasmMutation, navigate, rasmId, sessionToken, trpcUtils]);

  const revertSavedEdit = useCallback(async () => {
    if (!sessionToken || !rasmId) return;
    if (!confirm('هل تريد التراجع عن آخر التعديلات المحفوظة والرجوع إلى النسخة الأصلية؟')) return;

    try {
      await revertLatestSavedRasmEditMutation.mutateAsync({ sessionToken, id: rasmId });
      setActiveEditedArtifact(null);
      setActiveDocVersion('base');
      setLatestAuditVersionId(null);
      setLatestSavedDocsPointerUpdatedAt(null);
      setPrimaryTextEditorOpen(false);
      setViewerDocRenderNonce((n) => n + 1);
      try {
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken, id: rasmId });
      } catch {}
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken } as any);
      } catch {}
      await rasmQuery.refetch();
    } catch (error: any) {
      alert(error?.message || 'تعذر التراجع عن آخر التعديلات.');
    }
  }, [rasmId, rasmQuery, revertLatestSavedRasmEditMutation, sessionToken, trpcUtils]);

  useEffect(() => {
    try {
      if (!rasmQuery.data?.payload) return;

      const s = rasmQuery.data.payload as any;
      if (!s || typeof s !== 'object') return;

      setState(s);
      setIsUnitsAvailable(s.isUnitsAvailable ?? true);
      setIsFinancialAvailable(s.isFinancialAvailable ?? true);
      
      // Auto-fill final record from payload
      setFinalRecord(prev => ({
        ...prev,
        register: (s as any).witnessesData?.notaryRegister || '',
        number: (s as any).meta?.fileNumber || rasmQuery.data?.fileNumber || '',
        page: s.properties?.[0]?.titleDocuments?.[0]?.page || '',
        count: s.properties?.[0]?.titleDocuments?.[0]?.count || '',
        date: (s as any).meta?.dateGregorian || new Date().toISOString().split('T')[0],
        certificateType: s.documentType || 'رسم بيع',
        firstPartyName: s.sellers?.[0]?.name || '',
        firstPartyId: s.sellers?.[0]?.idNumber || '',
        secondPartyName: s.buyers?.[0]?.name || '',
        secondPartyId: s.buyers?.[0]?.idNumber || '',
        notaryName: s.notaryPrimary || 'الأستاذ المصطفى العلوي',
        optionalParties: Array.isArray((s as any).optionalParties)
          ? (s as any).optionalParties.map((party: any) => ({
              id: String(party?.id || crypto.randomUUID()),
              name: String(party?.name || ''),
              nationalId: String(party?.nationalId || party?.idNumber || ''),
            }))
          : [],
      }));

      // Auto-select the most relevant document for viewing:
      // 0) Smart Rasm HTML from payload
      const payload = rasmQuery.data?.payload as any;
      const attachments = rasmQuery.data?.attachments || [];

      const normalizeSavedAttachment = (att: any) => {
        if (!att) return null;
        const fileName =
          (att.fileName || att.file_name || att.name || att.filename || 'attachment').toString();
        const mimeType =
          (att.type || att.mimeType || att.mime_type || 'application/octet-stream').toString();
        const url =
          (att.url || att.fileUrl || att.file_url || att.fileURL || att.publicUrl || att.public_url || null) as
            | string
            | null;
        return {
          ...att,
          fileName,
          name: att.name || fileName,
          mimeType: att.mimeType || att.mime_type || att.type || mimeType,
          type: att.type || att.mime_type || att.mimeType || mimeType,
          fileUrl: att.fileUrl || att.file_url || att.url || url,
          url: att.url || att.fileUrl || att.file_url || url,
        };
      };

      const setSelectedVaultDocNormalized = (next: any) => {
        const normalized = normalizeSavedAttachment(next) || next;
        setSelectedVaultDoc((prev: any) => {
          if (!prev || !normalized) return normalized;
          if (prev?.id && normalized?.id && prev.id === normalized.id) {
            const prevUrl = (prev.url || prev.fileUrl || '') as string;
            const keepPrevDataUrl = typeof prevUrl === 'string' && prevUrl.startsWith('data:');
            const normalizedHasRealFile =
              !!String(normalized?.url || normalized?.fileUrl || '').trim() &&
              !String(normalized?.url || normalized?.fileUrl || '').startsWith('html://') &&
              String(normalized?.url || normalized?.fileUrl || '') !== 'draft://main';
            return {
              ...prev,
              ...normalized,
              url: keepPrevDataUrl ? prev.url : normalized.url,
              fileUrl: keepPrevDataUrl ? prev.fileUrl : normalized.fileUrl,
              fileName: normalized.fileName || prev.fileName,
              mimeType: normalized.mimeType || prev.mimeType,
              type: normalized.type || prev.type,
              ...(normalizedHasRealFile
                ? {
                    rasmHtml: undefined,
                    isSmartDraft: false,
                    isDraft: false,
                    content: undefined,
                    textContent: undefined,
                    previewTextContent: undefined,
                  }
                : {}),
            };
          }
          return normalized;
        });
      };
      const editedOverrideDocx = attachments.find((a: any) => {
        const category = (a.category || '').toString().toLowerCase();
        return category === 'audit_final_docx' || category === 'audit_draft_docx';
      });
      const editedOverridePdf = attachments.find((a: any) => {
        const category = (a.category || '').toString().toLowerCase();
        return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
      });
      const primaryOverride = attachments.find((a: any) =>
        (a.category || '').toString().toLowerCase() === 'primary_attachment'
      );
      const savedJudgeDoc = attachments.find((a: any) =>
        (a.category || '').toString().toLowerCase() === 'judge_attachment'
      );
      const deed = attachments.find((a: any) =>
        ['deed', 'rasm', 'contract', 'title_documents', 'post_registration'].includes((a.category || '').toString().toLowerCase())
      );

      // Deterministic precedence: if we have an edited artifact, keep it selected.
      // Prevent query refetch / auto-select from clobbering the edited URL.
      if (activeDocVersion === 'edited' && activeEditedArtifact?.url && activeEditedArtifact?.versionId) {
        const kind = activeEditedArtifact.kind;
        const editedDoc = {
          id: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}` : `audit-draft-docx-${activeEditedArtifact.versionId}`,
          category: kind === 'pdf' ? 'audit_draft_pdf' : 'audit_draft_docx',
          fileName: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}.pdf` : `audit-draft-${activeEditedArtifact.versionId}.docx`,
          name: kind === 'pdf' ? `audit-draft-${activeEditedArtifact.versionId}.pdf` : `audit-draft-${activeEditedArtifact.versionId}.docx`,
          fileUrl: activeEditedArtifact.url,
          url: activeEditedArtifact.url,
          remoteUrl: activeEditedArtifact.url,
          mimeType: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          type: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        setSelectedVaultDocNormalized(editedDoc);
        return;
      }

      // Base mode: open the same judge-approved/base document first.
      // Edited artifacts should only take over automatically when activeDocVersion === 'edited'.
      if (judgeWordAttachmentDoc) {
        setSelectedVaultDocNormalized(judgeWordAttachmentDoc);
      } else if (judgePrimaryDoc) {
        setSelectedVaultDocNormalized(judgePrimaryDoc);
      } else if (savedJudgeDoc) {
        setSelectedVaultDocNormalized(savedJudgeDoc);
      } else if (judgeAttachmentDoc) {
        setSelectedVaultDocNormalized(judgeAttachmentDoc);
      } else if (primaryOverride) {
        setSelectedVaultDocNormalized(primaryOverride);
      } else if (editedOverridePdf) {
        setSelectedVaultDocNormalized(editedOverridePdf);
      } else if (editedOverrideDocx) {
        setSelectedVaultDocNormalized(editedOverrideDocx);
      } else if (payload?.rasmHtml) {
        setSelectedVaultDoc({
          id: 'smart-rasm',
          fileName: 'المحرر العدلي (نظام ذكي)',
          rasmHtml: payload.rasmHtml,
          isSmartDraft: true
        });
      } else if (deed) {
        setSelectedVaultDocNormalized(deed);
      } else if (Array.isArray(attachments) && attachments.length > 0) {
        setSelectedVaultDocNormalized(attachments[0]);
      } else if (rasmQuery.data && (rasmQuery.data.draft || (s as any)?.draft)) {
        const draftContent = rasmQuery.data.draft || (s as any)?.draft;
        if (draftContent) {
          setSelectedVaultDoc({
            id: 'draft-doc',
            fileName: 'المحرر العدلي',
            isDraft: true,
            content: draftContent
          });
        }
      }
    } catch (error) {
      console.error('Error in document selection logic:', error);
    }
  }, [activeDocVersion, activeEditedArtifact, rasmQuery.data, judgeAttachmentDoc, judgeAttachmentDocs, judgePrimaryDoc, judgeWordAttachmentDoc]);

  // Force re-selection if the judge-side primary preview appears later.
  useEffect(() => {
    if (!judgePrimaryDoc) return;

    const currentUrl = String(
      selectedVaultDoc?.url ||
      selectedVaultDoc?.fileUrl ||
      selectedVaultDoc?.file_url ||
      selectedVaultDoc?.fileURL ||
      ''
    ).trim();
    const currentId = String(selectedVaultDoc?.id || '');
    const currentCategory = String(selectedVaultDoc?.category || '').toLowerCase();
    const currentFileName = String(
      selectedVaultDoc?.fileName ||
      selectedVaultDoc?.file_name ||
      selectedVaultDoc?.name ||
      ''
    ).toLowerCase();
    const currentMime = String(
      selectedVaultDoc?.mimeType ||
      selectedVaultDoc?.mime_type ||
      selectedVaultDoc?.type ||
      ''
    ).toLowerCase();
    const judgePreviewIsPdf =
      String(judgePrimaryDoc?.fileName || judgePrimaryDoc?.name || '').toLowerCase().endsWith('.pdf') ||
      String(judgePrimaryDoc?.mimeType || judgePrimaryDoc?.type || '').toLowerCase().includes('application/pdf');
    const currentIsStatic =
      !currentUrl ||
      currentUrl.startsWith('html://') ||
      currentUrl === 'draft://main' ||
      currentId === 'smart-rasm' ||
      currentId === 'draft-doc';
    const currentIsDocxLike =
      currentCategory === 'judge_attachment_docx' ||
      currentFileName.endsWith('.docx') ||
      currentFileName.endsWith('.doc') ||
      currentMime.includes('wordprocessingml') ||
      currentMime.includes('msword');
    const currentIsPdf =
      currentCategory === 'judge_attachment' ||
      currentFileName.endsWith('.pdf') ||
      currentMime.includes('application/pdf');

    if (currentIsStatic || (judgePreviewIsPdf && !currentIsPdf) || currentIsDocxLike) {
      setSelectedVaultDocNormalized(judgePrimaryDoc);
    }
  }, [
    judgePrimaryDoc,
    selectedVaultDoc?.id,
    selectedVaultDoc?.url,
    selectedVaultDoc?.fileUrl,
    selectedVaultDoc?.category,
    selectedVaultDoc?.fileName,
    selectedVaultDoc?.mimeType,
    selectedVaultDoc?.type,
  ]);

  // Force re-selection if judgeAttachmentDoc appears later
  useEffect(() => {
    if (judgeAttachmentDoc && selectedVaultDoc?.id === 'draft-doc') {
       setSelectedVaultDoc(judgeAttachmentDoc);
    }
  }, [judgeAttachmentDoc]);

  useEffect(() => {
    if (rasmQuery.error) {
      setError(rasmQuery.error.message);
    }
  }, [rasmQuery.error]);

  const handleViewerMouseDown = (e: React.MouseEvent) => {
    if (primaryTextEditorOpen) return;
    const el = viewerContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
  };

  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = viewerContainerRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
    el.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleViewerMouseUp = () => setIsDragging(false);

  const getBaseViewerWidth = (doc: any) => (doc?.rasmHtml ? 800 : PAGE_WIDTH);

  const computeFitZoom = React.useCallback(() => {
    const el = viewerContainerRef.current;
    if (!el || !selectedVaultDoc) return 1;
    const baseWidth = getBaseViewerWidth(selectedVaultDoc);
    const available = Math.max(320, el.clientWidth - 96); // padding + breathing room
    const z = available / baseWidth;
    return Math.min(Math.max(z, 0.75), 1.5);
  }, [selectedVaultDoc]);

  const updateZoom = (nextZoom: number) => {
    const z = Math.min(Math.max(nextZoom, 0.5), 3);
    setViewerZoom(z);
  };

  const handleViewerWheel = (e: any) => {
    if (e.ctrlKey) {
      if (e.preventDefault) e.preventDefault();
      return;
    }
  };

  // Reset listener for the Reset View button
  useEffect(() => {
    const handleReset = () => {
      const z = computeFitZoom();
      setViewerZoom(z);
      const el = viewerContainerRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    };
    window.addEventListener('viewer-reset', handleReset);
    return () => window.removeEventListener('viewer-reset', handleReset);
  }, [computeFitZoom]);

  // Fit-to-width on document change (sensible default for normal users)
  useEffect(() => {
    if (!selectedVaultDoc) return;
    requestAnimationFrame(() => {
      const z = computeFitZoom();
      setViewerZoom(z);
      const el = viewerContainerRef.current;
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
  }, [selectedVaultDoc?.id, computeFitZoom]);

  const updateDraftContent = (newContent: string) => {
    setState((prev: any) => ({ ...prev, draft: newContent }));
    if (selectedVaultDoc?.id === 'draft-doc') {
      setSelectedVaultDoc((prev: any) => ({ ...prev, content: newContent }));
    }
  };

  const loadOnlyOfficeConfig = useCallback(
    async ({
      mode = 'overlay',
      silent = false,
      force = false,
    }: {
      mode?: 'overlay' | 'embedded';
      silent?: boolean;
      force?: boolean;
    } = {}) => {
      if (primaryBusy) return false;

      if (!sessionToken || !rasmId) {
        if (!silent) {
          alert('خطأ: لم يتم العثور على جلسة المستخدم أو معرّف الرسم.');
        }
        return false;
      }

      const requestSeq = ++onlyOfficeRequestSeqRef.current;

      setOnlyOfficeMode(mode);
      setOnlyOfficeError(null);

      if (mode === 'embedded') {
        setOnlyOfficeOpen(false);
        setOnlyOfficePaneStatus('loading-config');
        setOnlyOfficeLoadStartedAt((prev) => prev ?? Date.now());
      } else {
        setOnlyOfficePaneStatus('ready');
        setOnlyOfficeLoadStartedAt(null);
      }

      if (force) {
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeRenderNonce((n) => n + 1);
      }

      try {
        onlyOfficeBaselineRef.current = {
          versionId: (rasmQuery.data?.latestDraftVersionId as string | null) || null,
          updatedAt:
            (rasmQuery.data?.latestDraftUpdatedAt as string | null) ||
            String((rasmQuery.data?.payload as any)?.latestDocumentUpdatedAt || '') ||
            null,
        };

        const res = await getOnlyOfficeConfigMutation.mutateAsync({
          sessionToken: sessionToken || '',
          savedRasmId: rasmId,
        });

        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const nextDsUrl = String(res?.dsUrl || '').trim();
        const nextConfig = (res as any)?.config;

        if (!nextDsUrl || !nextConfig || typeof nextConfig !== 'object') {
          throw new Error('OnlyOffice config response is incomplete');
        }

        setOnlyOfficeDsUrl(nextDsUrl);
        setOnlyOfficeConfig(nextConfig);
        setOnlyOfficeRenderNonce((n) => n + 1);

        if (mode === 'embedded') {
          setOnlyOfficePaneStatus('loading-editor');
        } else {
          setOnlyOfficeOpen(true);
        }

        return true;
      } catch (e: any) {
        if (requestSeq !== onlyOfficeRequestSeqRef.current) return false;

        const message = e?.message || String(e);
        setOnlyOfficeError(message);
        setOnlyOfficeDsUrl(null);
        setOnlyOfficeConfig(null);
        setOnlyOfficeOpen(false);
        setOnlyOfficeLoadStartedAt(null);
        setOnlyOfficePaneStatus(mode === 'embedded' ? 'error' : 'idle');

        if (!silent) {
          alert('تعذر فتح محرر Word: ' + message);
        }

        return false;
      }
    },
    [getOnlyOfficeConfigMutation, primaryBusy, rasmId, rasmQuery.data, sessionToken]
  );

  const reloadEmbeddedOnlyOfficeToLatestVersion = useCallback(() => {
    if (!isEmbeddedOnlyOfficeActive) return;
    if (onlyOfficeMode !== 'embedded') return;
    window.setTimeout(() => {
      void loadOnlyOfficeConfig({ mode: 'embedded', silent: true, force: true });
    }, 0);
  }, [isEmbeddedOnlyOfficeActive, loadOnlyOfficeConfig, onlyOfficeMode]);

  const refreshAfterOnlyOfficeSave = useCallback((opts?: {
    requirePdf?: boolean;
    requestedAfterMs?: number;
    baselineOverride?: { versionId: string | null; updatedAt: string | null };
    forceSaveRequestId?: string | null;
  }) => (async () => {
    const baseline = opts?.baselineOverride || onlyOfficeBaselineRef.current;
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    let lastData: any = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      let nextData: any = null;
      try {
        const refetchRes = await rasmQuery.refetch();
        nextData = refetchRes?.data || null;
      } catch {}
      lastData = nextData;

      const nextVersionId = (nextData?.latestDraftVersionId as string | null) || null;
      const nextUpdatedAt =
        (nextData?.latestDraftUpdatedAt as string | null) ||
        String((nextData?.payload as any)?.latestDocumentUpdatedAt || '') ||
        null;
      const nextUpdatedAtMs = nextUpdatedAt ? Date.parse(nextUpdatedAt) : 0;
      const attachments = Array.isArray(nextData?.attachments) ? nextData.attachments : [];
      const latestDraftDocxUrl = String(nextData?.latestDraftDocxUrl || '').trim() || null;
      const payloadForceSaveRequestId =
        String((nextData?.payload as any)?.latestForceSaveRequestId || '').trim() || null;
      const hasMatchingDocx = !!attachments.find((attachment: any) => {
        const category = String(attachment?.category || '').toLowerCase();
        const attachmentVersionId = String(attachment?.metadata?.versionId || attachment?.metadata?.version_id || '').trim();
        const attachmentUrl = String(attachment?.fileUrl || attachment?.url || '').trim();
        if (nextVersionId && attachmentVersionId && attachmentVersionId === nextVersionId) {
          return category === 'audit_final_docx' || category === 'audit_draft_docx';
        }
        return !!latestDraftDocxUrl && attachmentUrl === latestDraftDocxUrl;
      });
      const hasMatchingPdf = !!attachments.find((attachment: any) => {
        const category = String(attachment?.category || '').toLowerCase();
        const attachmentVersionId = String(attachment?.metadata?.versionId || attachment?.metadata?.version_id || '').trim();
        if (category !== 'audit_final_pdf' && category !== 'audit_draft_pdf') return false;
        if (!nextVersionId) return true;
        return attachmentVersionId === nextVersionId;
      });
      const hasExactForceSaveRequest = !opts?.forceSaveRequestId || payloadForceSaveRequestId === opts.forceSaveRequestId || !!attachments.find((attachment: any) => {
        const attachmentRequestId = String(attachment?.metadata?.forceSaveRequestId || '').trim();
        return attachmentRequestId && attachmentRequestId === opts.forceSaveRequestId;
      });

      const changed =
        (nextVersionId && nextVersionId !== baseline.versionId) ||
        (nextUpdatedAt && nextUpdatedAt !== baseline.updatedAt);
      const materialized = opts?.requirePdf ? hasMatchingPdf : (hasMatchingDocx || hasMatchingPdf);
      const freshEnough = opts?.requestedAfterMs ? nextUpdatedAtMs >= (opts.requestedAfterMs - 1000) : true;
      const confirmedByForceSaveRequest = !!opts?.forceSaveRequestId && hasExactForceSaveRequest;

      if ((changed || confirmedByForceSaveRequest) && materialized && freshEnough && hasExactForceSaveRequest) {
        onlyOfficeBaselineRef.current = {
          versionId: nextVersionId || baseline.versionId,
          updatedAt: nextUpdatedAt || baseline.updatedAt,
        };
        setLatestSavedDocsPointerUpdatedAt(nextUpdatedAt || null);
        if (nextVersionId) {
          setLatestAuditVersionId(nextVersionId);
        }
        setViewerDocRenderNonce((n) => n + 1);
        reloadEmbeddedOnlyOfficeToLatestVersion();
        return nextData;
      }

      await wait(500 + attempt * 250);
    }

    setViewerDocRenderNonce((n) => n + 1);
    return lastData;
  })(), [rasmQuery, reloadEmbeddedOnlyOfficeToLatestVersion]);

  const syncLatestSavedDraftState = useCallback(async (opts?: {
    requirePdf?: boolean;
    requestedAfterMs?: number;
    baselineOverride?: { versionId: string | null; updatedAt: string | null };
    forceSaveRequestId?: string | null;
  }) => {
    try {
      const refreshed = await refreshAfterOnlyOfficeSave(opts);
      if (refreshed) {
        return refreshed;
      }
    } catch {}

    try {
      const refetchRes = await rasmQuery.refetch();
      return refetchRes?.data || rasmQuery.data || null;
    } catch {
      return rasmQuery.data || null;
    }
  }, [rasmQuery, refreshAfterOnlyOfficeSave]);

  const openNotarySigningFromAuditHub = useCallback(async (opts?: { skipInitialSave?: boolean; targetDocType?: string }) => {
    if (!rasmId || !state) return;
    const clickStartedAtMs = Date.now();
    const fallbackDocumentType =
      opts?.targetDocType ||
      String(
        (state as any)?.documentType ||
          (rasmQuery.data as any)?.documentType ||
          (rasmQuery.data?.payload as any)?.documentType ||
          'باقي_الوثائق'
      ).trim() || 'باقي_الوثائق';
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();
    const finalReviewChecklist = buildFinalReviewChecklist();
    const generatedForceSaveRequestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `forcesave-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let awaitedForceSaveRequestId: string | null = null;
    const baselineAtClick = {
      versionId: (rasmQuery.data?.latestDraftVersionId as string | null) || null,
      updatedAt:
        (rasmQuery.data?.latestDraftUpdatedAt as string | null) ||
        String((rasmQuery.data?.payload as any)?.latestDocumentUpdatedAt || '') ||
        null,
    };

    setSigningTransition((prev) => ({
      active: true,
      progress: Math.max(prev.progress, 20),
      message: prev.message || 'جاري تجهيز آخر نسخة قبل الانتقال إلى رواق التوقيع...',
    }));

    if (!opts?.skipInitialSave) {
      try {
        await updateSavedRasmMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          documentType: fallbackDocumentType,
          draft: currentDocContent,
          payload: {
            ...state,
            documentType: fallbackDocumentType,
            draft: currentDocContent,
            propertyUnits,
            isUnitsAvailable,
            isFinancialAvailable,
            finalReviewChecklist,
          },
          files: undefined,
        });
        await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: rasmId });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[AUDITHUB -> SIGNING] finalReviewChecklist persist failed', error);
      }
    }

    if (isEmbeddedOnlyOfficeActive && onlyOfficeConfig && sessionToken) {
      const documentKey = String((onlyOfficeConfig as any)?.document?.key || '').trim();
      if (documentKey) {
        setSigningTransition({
          active: true,
          progress: 24,
          message: 'جاري حفظ آخر تعديلات OnlyOffice...',
        });
        try {
          const forceSaveRes = await forceOnlyOfficeSaveMutation.mutateAsync({
            sessionToken: sessionToken || '',
            savedRasmId: rasmId,
            documentKey,
            requestId: generatedForceSaveRequestId,
          });
          awaitedForceSaveRequestId = forceSaveRes?.errorCode === 0 ? generatedForceSaveRequestId : null;
        } catch (err: any) {
          // Non-fatal: 404 means the OnlyOffice session has expired or was never started.
          // The payload was already persisted above — proceed to signing without a force-save pointer.
          const errMsg = String(err?.message || err || '');
          const is404 = errMsg.includes('404') || (err?.data?.httpStatus === 404);
          if (is404) {
            // eslint-disable-next-line no-console
            console.warn('[AUDITHUB -> SIGNING] OnlyOffice force-save returned 404 — session likely expired. Proceeding without force-save lock.', err);
            awaitedForceSaveRequestId = null;
            // Continue execution — do NOT return
          } else {
            setSigningTransition({ active: false, progress: 0, message: '' });
            alert('تعذر فرض حفظ التعديلات الأخيرة قبل التوقيع.\n\n' + errMsg);
            return;
          }
        }
      }
    }

    setSigningTransition({
      active: true,
      progress: 48,
      message: 'جاري التحقق من المستند الرئيسي الأخير...',
    });

    try {
      await syncLatestSavedDraftState({
        requestedAfterMs: clickStartedAtMs,
        baselineOverride: baselineAtClick,
        forceSaveRequestId: awaitedForceSaveRequestId,
      });
    } catch {}

    let finalPdfUrl: string | null = null;
    try {
      const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
      for (let attempt = 0; attempt < 6; attempt++) {
        setSigningTransition({
          active: true,
          progress: Math.min(72 + attempt * 4, 92),
          message:
            attempt === 0
              ? 'جاري تجهيز المستند الرئيسي للتوقيع...'
              : 'جاري تثبيت آخر حفظ من المستند قبل فتح رواق التوقيع...',
        });
        const prepared = await prepareSigningPortalDocumentMutation.mutateAsync({
          sessionToken: sessionToken || '',
          id: rasmId,
          forceSaveRequestId: awaitedForceSaveRequestId,
        });
        // eslint-disable-next-line no-console
        console.warn('[AUDITHUB -> SIGNING] prepareSigningPortalDocument', {
          rasmId,
          attempt,
          forceSaveRequestId: awaitedForceSaveRequestId,
          finalPdfUrl: prepared?.finalPdfUrl || null,
          versionId: prepared?.versionId || null,
          source: prepared?.source || null,
          debugJson: prepared?.debugJson || null,
        });
        finalPdfUrl = String(prepared?.finalPdfUrl || '').trim() || null;
        if (finalPdfUrl) break;
        if (!awaitedForceSaveRequestId) break;
        await wait(550 + attempt * 150);
      }
    } catch (err: any) {
      setSigningTransition({ active: false, progress: 0, message: '' });
      alert('تعذر تجهيز المستند الرئيسي للتوقيع.\n\n' + (err?.message || String(err)));
      return;
    }

    if (!finalPdfUrl) {
      // If the rasm is a pure HTML/draft document (no uploaded DOCX), navigate to signing portal
      // anyway — it will render from payload.rasmHtml / payload.draft directly.
      const hasDraftContent = !!(
        (state as any)?.rasmHtml ||
        (state as any)?.draft ||
        (rasmQuery.data?.payload as any)?.rasmHtml ||
        (rasmQuery.data?.payload as any)?.draft
      );
      if (!hasDraftContent) {
        setSigningTransition({ active: false, progress: 0, message: '' });
        alert('تعذر العثور على المستند الرئيسي للتوقيع. يرجى التحقق من أن الرسم قد تم حفظه وتحضيره بشكل صحيح.');
        return;
      }
      // hasDraftContent — continue to signing portal without a PDF pointer
    }

    const navState: Record<string, unknown> = {
      finalPdfUrl,
      requestedAfterMs: clickStartedAtMs,
    };

    if (awaitedForceSaveRequestId) {
      navState.forceSaveRequestId = awaitedForceSaveRequestId;
    }

    setSigningTransition({
      active: true,
      progress: 100,
      message: 'جاري فتح رواق التوقيع على المستند الرئيسي...',
    });
    navigate(`/notary-signing-portal/sign/${rasmId}`, { state: navState });
  }, [
    forceOnlyOfficeSaveMutation,
    isEmbeddedOnlyOfficeActive,
    navigate,
    onlyOfficeConfig,
    prepareSigningPortalDocumentMutation,
    rasmId,
    rasmQuery.data,
    sessionToken,
    selectedVaultDoc,
    syncLatestSavedDraftState,
    state,
    trpcUtils,
    updateSavedRasmMutation,
    propertyUnits,
    isUnitsAvailable,
    isFinancialAvailable,
    buildFinalReviewChecklist,
  ]);

  useEffect(() => {
    const autoKey =
      isEmbeddedOnlyOfficeActive && sessionToken && rasmId
        ? `${rasmId}:base`
        : null;

    if (!autoKey) return;

    if (
      onlyOfficeMode === 'embedded' &&
      onlyOfficeDsUrl &&
      onlyOfficeConfig &&
      onlyOfficePaneStatus !== 'error'
    ) {
      onlyOfficeAutoLoadKeyRef.current = autoKey;
      return;
    }

    if (
      onlyOfficeAutoLoadKeyRef.current === autoKey ||
      onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`
    ) {
      return;
    }

    onlyOfficeAutoLoadKeyRef.current = `loading:${autoKey}`;
    void (async () => {
      const loaded = await loadOnlyOfficeConfig({ mode: 'embedded', silent: true });
      if (loaded) {
        onlyOfficeAutoLoadKeyRef.current = autoKey;
      } else if (onlyOfficeAutoLoadKeyRef.current === `loading:${autoKey}`) {
        onlyOfficeAutoLoadKeyRef.current = null;
      }
    })();
  }, [
    activeDocVersion,
    isEmbeddedOnlyOfficeActive,
    loadOnlyOfficeConfig,
    onlyOfficeConfig,
    onlyOfficeDsUrl,
    onlyOfficeMode,
    onlyOfficePaneStatus,
    rasmId,
    sessionToken,
  ]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) return;
    if (onlyOfficeMode !== 'embedded') {
      setOnlyOfficeMode('embedded');
    }
  }, [isEmbeddedOnlyOfficeActive, onlyOfficeMode]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) {
      setOnlyOfficeLoadStartedAt(null);
      return;
    }

    if (onlyOfficePaneStatus === 'ready' || onlyOfficePaneStatus === 'error' || onlyOfficePaneStatus === 'idle') {
      setOnlyOfficeLoadStartedAt(null);
    }
  }, [isEmbeddedOnlyOfficeActive, onlyOfficePaneStatus]);

  useEffect(() => {
    if (!isEmbeddedOnlyOfficeActive) {
      onlyOfficeEmbeddedRetryRef.current = 0;
      return;
    }

    if (onlyOfficePaneStatus !== 'loading-config' && onlyOfficePaneStatus !== 'loading-editor') {
      if (onlyOfficePaneStatus === 'ready' || onlyOfficePaneStatus === 'error') {
        onlyOfficeEmbeddedRetryRef.current = 0;
      }
      return;
    }

    const retryTimer = window.setTimeout(() => {
      if (onlyOfficeEmbeddedRetryRef.current >= 1) return;
      onlyOfficeEmbeddedRetryRef.current += 1;
      void loadOnlyOfficeConfig({ mode: 'embedded', silent: true, force: true });
    }, 4000);

    const elapsedMs = onlyOfficeLoadStartedAt ? Date.now() - onlyOfficeLoadStartedAt : 0;
    const remainingMs = Math.max(0, 10000 - elapsedMs);

    const failoverTimer = window.setTimeout(() => {
      setOnlyOfficeError('تجاوز تحميل OnlyOffice الوقت المتوقع. تم التحويل إلى المعاينة البديلة.');
      setOnlyOfficeLoadStartedAt(null);
      setOnlyOfficePaneStatus('error');
    }, remainingMs);

    return () => {
      window.clearTimeout(retryTimer);
      window.clearTimeout(failoverTimer);
    };
  }, [isEmbeddedOnlyOfficeActive, loadOnlyOfficeConfig, onlyOfficeLoadStartedAt, onlyOfficePaneStatus]);

  // Legacy inline WordPreview editor revert removed (OnlyOffice is used for WYSIWYG editing).

  const handleSaveToCategory = async (selectedDocType: string) => {
    if (!sessionToken) {
      alert('خطأ: لم يتم العثور على جلسة المستخدم. يرجى تسجيل الدخول من جديد.');
      return;
    }

    const latestRasmData: any = await syncLatestSavedDraftState();
    const latestAttachments = Array.isArray(latestRasmData?.attachments) ? latestRasmData.attachments : [];
    const latestEditedDocxAttachment = latestAttachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_docx' || category === 'audit_draft_docx';
    });
    const latestEditedPdfAttachment = latestAttachments.find((attachment: any) => {
      const category = String(attachment?.category || '').toLowerCase();
      return category === 'audit_final_pdf' || category === 'audit_draft_pdf';
    });
    const latestEditedAttachment = latestEditedPdfAttachment || latestEditedDocxAttachment || null;
    
    // 1. Capture current content
    const currentDocContent = String(
      editedPlainTextGetterRef.current?.() ||
        (state as any)?.draft ||
        (selectedVaultDoc?.isDraft ? selectedVaultDoc?.content : '') ||
        ''
    ).trim();

    const editedVersionId =
      (latestRasmData?.latestDraftVersionId as string | null) ||
      String((latestEditedAttachment as any)?.metadata?.versionId || (latestEditedAttachment as any)?.metadata?.version_id || '') ||
      activeEditedArtifact?.versionId ||
      latestAuditVersionId ||
      null;
    const editedUrl =
      String(
        latestEditedPdfAttachment?.fileUrl ||
        latestEditedDocxAttachment?.fileUrl ||
        latestRasmData?.latestDraftDocxUrl ||
        activeEditedArtifact?.url ||
        ''
      ).trim() || null;

    // Race guard: if user is on edited view, require a versionId/url.
    if (activeDocVersion === 'edited' && !editedVersionId) {
      alert('تعذر الحفظ إلى الوجهة لأن نسخة التعديل لم تُثبت بعد. يرجى انتظار اكتمال "Save edit" ثم المحاولة.');
      return;
    }

    // Race guard (stronger): require backend confirmation that Saved Rasm pointer was updated.
    if (activeDocVersion === 'edited' && !(latestRasmData?.latestDraftUpdatedAt || latestSavedDocsPointerUpdatedAt)) {
      alert('يرجى انتظار اكتمال حفظ التعديل وتأكيد تحديث نسخة الوثيقة قبل المتابعة إلى الحفظ/التصنيف.');
      return;
    }

    const stateAny = state as any;
    const primaryNotaryName =
      (stateAny?.notaries?.primary as string | undefined) ||
      (stateAny?.notaries?.notary1Name as string | undefined) ||
      (stateAny?.meta?.notaryPrimary as string | undefined) ||
      (user?.full_name ?? null);
    const secondaryNotaryName =
      (stateAny?.notaries?.secondary as string | undefined) ||
      (stateAny?.notaries?.notary2Name as string | undefined) ||
      (stateAny?.meta?.notarySecondary as string | undefined) ||
      null;

    const finalPayload = {
      ...state,
      draft: currentDocContent,
      propertyUnits,
      isUnitsAvailable,
      isFinancialAvailable,
      optionalParties: Array.isArray((finalRecord as any).optionalParties) ? (finalRecord as any).optionalParties : [],
      finalReviewChecklist: buildFinalReviewChecklist(),
      // Persist inclusion refs entered in AuditHub so downstream (signature + signed viewer)
      // can gather them automatically from saved_rasms.payload.
      registerNumber: finalRecord.register,
      certificateNumber: finalRecord.count,
      registryPage: finalRecord.page,
      inclusionDate: finalRecord.registrationDate || finalRecord.date,
      court: finalRecord.authority,
      // Persist notary identity from logged-in user + known meta.
      notary1Name: primaryNotaryName,
      notary2Name: secondaryNotaryName,
      phone: notaryProfile?.phone || null,
      email: user?.email || null,
      auditHubInclusion: {
        registerNumber: finalRecord.register,
        certificateNumber: finalRecord.count,
        registryPage: finalRecord.page,
        inclusionDate: finalRecord.registrationDate || finalRecord.date,
        court: finalRecord.authority,
        serial: finalRecord.serial,
        certificateType: finalRecord.certificateType,
        registrationDate: finalRecord.registrationDate || null,
        documentDate: finalRecord.date || null,
        notary1Name: primaryNotaryName,
        notary2Name: secondaryNotaryName,
        phone: notaryProfile?.phone || null,
        email: user?.email || null,
      },
      // Persist edited artifact identity for Saved Documents (stable across refresh/users)
      auditDocVersionId: editedVersionId,
      auditEditedArtifactUrl: editedUrl,
    };

    const isSigningIntent = saveCategoryIntent === 'signing';

    // ⚡ INSTANT RESPONSE:
    // When moving to signing, immediately dismiss modal and activate high-fidelity signing transition screen
    if (isSigningIntent) {
      setIsSaveCategoryModalOpen(false);
      setSigningTransition({
        active: true,
        progress: 15,
        message: 'جاري حفظ التصنيف وتجهيز رواق التوقيع...',
      });
    }

    try {
      setIsCategorySaving(true);
      
      let finalId = rasmId;

      if (!finalId) {
        // Fresh creation if no ID yet (blank start)
        const res: any = await createSavedRasmMutation.mutateAsync({
            sessionToken,
            documentType: selectedDocType,
            draft: currentDocContent,
            payload: finalPayload,
            fileNumber: (state as any)?.meta?.fileNumber || (state as any)?.fileNumber,
            files: undefined
        });
        finalId = res.id;

        // eslint-disable-next-line no-console
        console.log('[SAVE]', {
          rasmId: finalId,
          savedAttachmentId: res?.savedAttachmentId ?? null,
          savedCategory: res?.savedCategory ?? null,
          savedUrl: res?.savedUrl ?? null,
          auditDocVersionId: editedVersionId,
          hasInlinePdf: false,
        });
      } else {
        // Update existing
        const res: any = await updateSavedRasmMutation.mutateAsync({
            sessionToken,
            id: finalId,
            documentType: selectedDocType,
            draft: currentDocContent,
            payload: finalPayload,
            files: undefined
        });

        // eslint-disable-next-line no-console
        console.log('[SAVE]', {
          rasmId: finalId,
          savedAttachmentId: res?.savedAttachmentId ?? null,
          savedCategory: res?.savedCategory ?? null,
          savedUrl: res?.savedUrl ?? null,
          auditDocVersionId: editedVersionId,
          hasInlinePdf: false,
        });
      }

      setState((prev) => (prev ? ({ ...(prev as any), documentType: selectedDocType } as any) : prev));

      // Keep the saved version visible in the viewer by updating the primary DOCX attachment
      // Only needed for regular save; signing transition prepares the final document directly in openNotarySigningFromAuditHub
      if (!isSigningIntent) {
        try {
          if (finalId && currentDocContent && !isEmbeddedOnlyOfficeActive) {
            await savePrimaryFromInlineText(currentDocContent, { savedRasmId: finalId });
          }
        } catch (e) {
        }
      }

      setIsSaveCategoryModalOpen(false);
      setIsCategorySaving(false);

      // Ensure Saved Documents sees the newly persisted changes immediately.
      try {
        await trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
      } catch {}
      try {
        if (finalId) {
          await trpcUtils.feesAgent.documents.getSavedRasm.invalidate({ sessionToken: sessionToken || '', id: finalId } as any);
        }
      } catch {}

      if (isSigningIntent) {
        // Pass skipInitialSave: true because updateSavedRasmMutation was just completed above with selectedDocType
        await openNotarySigningFromAuditHub({ skipInitialSave: true, targetDocType: selectedDocType });
        return;
      }

      // Show success message
      setSuccessMessage({ show: true, docId: finalId });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage({ show: false });
      }, 5000);
    } catch (err: any) {
      setIsSaveCategoryModalOpen(false);
      setIsCategorySaving(false);
      setSigningTransition({ active: false, progress: 0, message: '' });
      const errorMsg = err?.message || String(err);
      alert('خطأ أثناء الحفظ والتصنيف:\n\n' + errorMsg + '\n\nتحقق من أن جميع البيانات المطلوبة قد تمت ملؤها بشكل صحيح.');
    }
  };

  if (rasmQuery.isLoading || !state) return (
    <div className={`h-screen flex flex-col items-center justify-center gap-6 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="relative">
        <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full"></div>
        <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-lg shadow-blue-500/20"></div>
        <Shield className="w-10 h-10 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="font-black text-3xl font-amiri tracking-tight">جاري تحضير منصة التضمين</h2>
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Initializing Secure Registration Hub</p>
      </div>
    </div>
  );
  
  if (error || rasmQuery.error) return (
    <div className="h-screen flex items-center justify-center bg-red-50 p-12">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-2 border-red-100 flex flex-col items-center gap-6 max-w-lg text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 font-amiri">عذراً، تعذر تحميل البيانات</h3>
        <p className="text-slate-600 font-medium leading-relaxed">{error || (rasmQuery.error as any)?.message}</p>
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">العودة للخلف</button>
      </div>
    </div>
  );

  const getDocTypeColor = (type: string) => {
    if (type.includes('زواج') || type.includes('طلاق')) return 'bg-emerald-600';
    if (type.includes('بيع') || type.includes('شراء')) return 'bg-blue-700';
    return 'bg-slate-700';
  };

  const needsFiscal = !state.documentType?.includes('زواج') && !state.documentType?.includes('طلاق') && !state.documentType?.includes('اراثة');
  const needsRegistrationReview = (() => {
    const docType = (state?.documentType || '').toString().replace(/_/g, ' ');
    const contractIsTypicallyRegistrable =
      docType.includes('بيع') ||
      docType.includes('هبة') ||
      docType.includes('مقاسمة') ||
      docType.includes('قسمة') ||
      docType.includes('تفويت') ||
      docType.includes('تسليم') ||
      docType.includes('بعوض') ||
      docType.includes('مناقلة');
    const flaggedBySystem = (state as any)?.step7FiscalNature === 'subject';
    return Boolean(contractIsTypicallyRegistrable || flaggedBySystem);
  })();

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden bg-[linear-gradient(135deg,#EAF4FF_0%,#F4F7FB_100%)] font-amiri" dir="rtl">
      
      {/* ZONE 1: HEADER (Fixed) */}
      <header className="h-[70px] shrink-0 bg-[linear-gradient(90deg,#1E88E5_0%,#6A1B9A_100%)] text-white shadow-lg z-50 px-6 flex items-center justify-between relative">
         <div className="flex items-center gap-4">
             {/* Logo / Badge */}
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                 </div>
                 <div className="flex flex-col">
                     <h1 className="text-lg font-black tracking-tight leading-none">مسار المراقبة و التضمين</h1>
                     <span className="text-[10px] text-blue-100 font-bold opacity-80 uppercase tracking-widest">Smart Audit Hub</span>
                 </div>
             </div>
             <div className="h-8 w-px bg-white/20 mx-2"></div>
             {/* Fee Info */}
             <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                     <span className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">رقم الرسم</span>
                     <span className="text-sm font-black font-mono">{finalRecord.serial}</span>
                 </div>
                 <div className="flex flex-col border-r border-white/10 pr-4">
                     <span className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">الموثق</span>
                     <span className="text-sm font-bold">{finalRecord.notaryName || '---'}</span>
                 </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs font-bold text-white">قيد المعالجة</span>
                  </div>
             </div>
         </div>

         {/* Right Actions */}
         <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-white/80 hover:text-white"
             >
                 <XCircle className="w-6 h-6" />
             </button>
         </div>
      </header>

      {/* Success Toast */}
      {successMessage.show && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-6 flex items-center gap-4 border border-emerald-400/50">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg">تم الحفظ بنجاح! ✨</p>
              <p className="text-sm text-emerald-50 font-bold">تم حفظ الرسم في فئة الوثائق المختارة</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSuccessMessage({ show: false });
                  try {
                    trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
                  } catch {}
                  openNotarySigningFromAuditHub();
                }}
                disabled={!rasmId}
                className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-50 transition-colors whitespace-nowrap"
              >
                رواق التوقيع العدلي
              </button>
              <button
                onClick={() => setSuccessMessage({ show: false })}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {signingTransition.active && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl p-8 text-right overflow-hidden" dir="rtl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                <FileSignature className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">رحلة الرسم المضمن</div>
                <div className="text-xs font-bold text-slate-500">يتم حفظ المستند وتأمينه قبل الانتقال إلى رواق التوقيع</div>
              </div>
            </div>

            <div className="relative rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-6 py-8 overflow-hidden">
              <div
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                style={{
                  transform: `translateX(${(signingTransitionTick % 2 === 0 ? 180 : 360)}%)`,
                  transition: 'transform 1.8s ease-in-out',
                }}
              />

              <div className="relative mb-8 h-28">
                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2">
                  <div className="relative h-2 rounded-full bg-slate-200/90 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${signingTransitionUi.lineFill}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 h-5 w-24 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent"
                    style={{
                      left: `${Math.max(0, signingTransitionUi.lineFill - 10)}%`,
                      transition: 'left 1.4s ease-in-out',
                    }}
                  />
                </div>

                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
                  style={{
                    left: `${signingTransitionUi.docPosition}%`,
                    transform: `translate(-50%, -50%) scale(${signingTransitionUi.phase === 'saving' ? (signingTransitionTick % 2 === 0 ? 1.02 : 1) : 1})`,
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-blue-200/40 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-lg">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="absolute left-[14%] top-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <FileText className="w-7 h-7 text-slate-600" />
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all duration-700 ${signingTransitionUi.glowAtSave ? 'border-emerald-200 shadow-[0_0_0_8px_rgba(16,185,129,0.08)]' : 'border-slate-200'}`}>
                    <Save className={`w-7 h-7 ${signingTransitionUi.phase === 'handoff' ? 'text-emerald-600' : 'text-slate-700'}`} />
                    {signingTransitionUi.phase === 'handoff' ? (
                      <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <>
                        <span className="absolute -left-5 top-3 h-1.5 w-4 rounded-full bg-emerald-300/90 animate-pulse" />
                        <span className="absolute -left-7 top-7 h-1.5 w-6 rounded-full bg-sky-300/80 animate-pulse" />
                        <span className="absolute -left-4 top-11 h-1.5 w-3 rounded-full bg-blue-300/80 animate-pulse" />
                      </>
                    )}
                  </div>
                </div>

                <div className="absolute right-[14%] top-1/2 -translate-y-1/2">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-white shadow-sm transition-all duration-700 ${signingTransitionUi.penGlow ? 'border-amber-200 shadow-[0_0_0_8px_rgba(251,191,36,0.12)]' : 'border-slate-200'}`}>
                    <PenTool className={`w-7 h-7 ${signingTransitionUi.penGlow ? 'text-amber-500' : 'text-slate-500'}`} />
                  </div>
                </div>
              </div>

              <div className="relative text-center">
                <div className="text-xl font-black text-slate-900">{signingTransitionUi.stageTitle}</div>
                <div className="mt-2 text-sm font-bold text-slate-600">{signingTransitionUi.detailText}</div>
                {signingTransitionUi.isLongWait && signingTransitionUi.phase !== 'handoff' && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
                    <Clock className="w-4 h-4" />
                    العملية مستمرة بشكل طبيعي ويتم تأمين آخر نسخة محفوظة
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between text-[11px] font-black text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'start' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <span>📜 بداية الحركة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'saving' ? 'bg-blue-500 animate-pulse' : signingTransitionUi.phase === 'handoff' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span>💾 الحفظ والتأمين</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${signingTransitionUi.phase === 'handoff' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  <span>✍️ التوقيع</span>
                </div>
              </div>

              <div className="mt-5 text-xs font-black text-slate-400 text-left" dir="ltr">
                {Math.round(signingTransition.progress)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {onlyOfficeMode === 'overlay' && onlyOfficeOpen && onlyOfficeDsUrl && onlyOfficeConfig && (
        <OnlyOfficeEditor
          key={`onlyoffice-overlay-${onlyOfficeRenderNonce}`}
          dsUrl={onlyOfficeDsUrl}
          config={onlyOfficeConfig}
          onSaved={refreshAfterOnlyOfficeSave}
          onClose={async () => {
            setOnlyOfficeOpen(false);
            await refreshAfterOnlyOfficeSave();
          }}
        />
      )}

      {/* MAIN BODY FLEX ROW */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        
        {/* ZONE 2: Left Sidebar */}
        <aside className="w-[260px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm z-40 relative">
           <div className="p-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">أقسام الملف</h3>
               <nav className="space-y-1">
                   {[
                     { id: 'data', label: 'بيانات الرسم', icon: FileText },
                     { id: 'attachments', label: 'المرفقات', icon: FileSearch },
                     { id: 'registration', label: 'التسجيل والتنبر', icon: CreditCardIcon },
                   ].map((item) => (
                       <button
                         key={item.id}
                         onClick={() => setActiveTab(item.id)}
                         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${
                             activeTab === item.id 
                             ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100 translate-x-[-4px]' 
                             : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                         }`}
                       >
                           <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-blue-500' : 'text-slate-400'}`} />
                           {item.label}
                           {activeTab === item.id && (
                               <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                           )}
                       </button>
                   ))}
               </nav>
           </div>
        </aside>

        {/* ZONE 3: Workspace */}
        <main className="flex-1 relative bg-slate-50/50 overflow-hidden flex flex-col min-w-0">
            
            {/* Dynamic View based on Active Tab */}
            {activeTab === 'attachments' ? (
                <div className="h-full overflow-y-auto bg-slate-50 px-6 py-8 xl:px-8">
                    <div className="mx-auto w-full max-w-none space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">المرفقات</h3>
                                    <p className="mt-1 text-sm font-bold text-slate-500">تعرض هذه المساحة المرفقات الإضافية فقط، مع ملاحظات القاضي إن وُجدت.</p>
                                </div>
                                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                                    {attachmentTabDocs.length} مرفق
                                </div>
                            </div>
                        </div>

                        {judgeAcceptanceNotes && (
                            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-amber-900">ملاحظات القاضي للعدل</h4>
                                        <p className="text-xs font-bold text-amber-700">الملاحظات المرفقة عند قبول الرسم أو إعادته مع ملاحظات شكلية.</p>
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap rounded-2xl border border-amber-200 bg-white px-5 py-4 text-sm font-bold leading-8 text-slate-700">
                                    {judgeAcceptanceNotes}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start" dir="ltr">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm xl:p-4" dir="rtl">
                                {selectedAttachmentTabDoc ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                            <div className="min-w-0">
                                                <h4 className="truncate text-lg font-black text-slate-900">
                                                    {String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || 'attachment').trim()}
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    {String(selectedAttachmentTabDoc?.category || 'attachment').trim()}
                                                </p>
                                            </div>
                                            <a
                                                href={String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim() || undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <Download className="h-4 w-4" />
                                                    تنزيل
                                                </span>
                                            </a>
                                        </div>

                                        <div className="h-[72vh] min-h-[640px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 xl:h-[76vh]">
                                            {(() => {
                                                const previewUrl = String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim();
                                                const fileName = String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || '').toLowerCase();
                                                const mimeType = String(selectedAttachmentTabDoc?.mimeType || selectedAttachmentTabDoc?.type || '').toLowerCase();
                                                const isImage =
                                                  fileName.endsWith('.png') ||
                                                  fileName.endsWith('.jpg') ||
                                                  fileName.endsWith('.jpeg') ||
                                                  fileName.endsWith('.webp') ||
                                                  fileName.endsWith('.gif') ||
                                                  mimeType.startsWith('image/');
                                                const isPdf =
                                                  fileName.endsWith('.pdf') ||
                                                  mimeType.includes('application/pdf') ||
                                                  previewUrl.toLowerCase().includes('.pdf');
                                                const isDocx =
                                                  fileName.endsWith('.docx') ||
                                                  fileName.endsWith('.doc') ||
                                                  mimeType.includes('wordprocessingml') ||
                                                  mimeType.includes('msword');

                                                if (isImage) {
                                                    return (
                                                        <div className="flex h-full items-center justify-center bg-slate-100 p-4">
                                                            <img src={previewUrl} alt={fileName || 'attachment'} className="max-h-full max-w-full rounded-2xl object-contain shadow-sm" />
                                                        </div>
                                                    );
                                                }

                                                if (isPdf) {
                                                    return <iframe title={fileName || 'attachment-pdf'} src={previewUrl} className="h-full w-full bg-white" />;
                                                }

                                                if (isDocx) {
                                                    return (
                                                        <div className="h-full overflow-auto bg-white p-4">
                                                            <WordPreview
                                                                url={previewUrl}
                                                                isDarkMode={false}
                                                                editable={false}
                                                                sourceTag="base"
                                                                msWordRtlJustify
                                                            />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                            <FileText className="h-7 w-7" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-black text-slate-700">معاينة غير متاحة داخل النظام</h4>
                                                            <p className="mt-2 text-sm font-bold text-slate-500">يمكنك تنزيل هذا المرفق أو فتحه في نافذة مستقلة.</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <FileSearch className="h-7 w-7" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700">اختر مرفقاً للمعاينة</h4>
                                        <p className="mt-2 text-sm font-bold text-slate-500">لكل مرفق هنا معاينته المستقلة بعيداً عن عارض الرسم الرئيسي.</p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
                                {attachmentTabDocs.length > 0 ? (
                                    <div className="space-y-3">
                                        {attachmentTabDocs.map((doc: any, idx: number) => {
                                            const fileName = String(doc?.fileName || doc?.name || `attachment-${idx + 1}`).trim();
                                            const category = String(doc?.category || 'attachment').trim();
                                            const url = String(doc?.url || doc?.fileUrl || '').trim();
                                            const mimeType = String(doc?.mimeType || doc?.type || '').trim();
                                            const currentKey = `${String(selectedAttachmentTabDoc?.url || selectedAttachmentTabDoc?.fileUrl || '').trim()}||${String(selectedAttachmentTabDoc?.fileName || selectedAttachmentTabDoc?.name || '').trim()}`;
                                            const rowKey = `${url}||${fileName}`;
                                            const isActive = currentKey === rowKey;
                                            return (
                                                <button
                                                    type="button"
                                                    key={String(doc?.id || `${fileName}-${idx}`)}
                                                    onClick={() => setSelectedAttachmentTabDoc(doc)}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                                                        isActive
                                                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                                                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-black text-slate-900">{fileName}</p>
                                                            <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                                                                {category || 'attachment'}{mimeType ? ` • ${mimeType}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <FileSearch className="h-7 w-7" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-700">لا توجد مرفقات متاحة</h4>
                                        <p className="mt-2 text-sm font-bold text-slate-500">سيتم عرض مرفقات الرسم وملاحظات القاضي هنا عند توفرها.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'formal' || activeTab === 'legal' || activeTab === 'data' ? (
            <div className="flex h-full min-w-0">
                    {/* Left Half: Document Preview */}
              <div className="flex-1 relative bg-slate-200/50 border-l border-slate-200 p-4 flex flex-col min-w-0 overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.05)] border border-slate-200 h-full overflow-hidden relative group flex flex-col">
                            {/* Document Actions Bar (Premium Edit Controls) */}
                            <div className="h-[52px] bg-slate-50/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-3.5 z-[100] shrink-0">
                                <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        if (!state) {
                                          alert('خطأ: لم يتم تحميل بيانات الرسم بعد. يرجى الانتظار قليلاً ثم المحاولة مجدداً.');
                                          return;
                                        }
                                        if (primaryTextEditorOpen) {
                                          const finalContent = editedPlainTextGetterRef.current?.();
                                          if (finalContent) {
                                            updateDraftContent(finalContent);
                                          }
                                          setPrimaryTextEditorOpen(false);
                                        }
                                        setPreSaveReviewIntent('save');
                                        setIsPreSaveReviewModalOpen(true);
                                      }}
                                      disabled={!state || isRedirecting}
                                      className={`px-6 py-2 rounded-full text-white font-black text-[11px] flex items-center gap-2.5 transition-all shadow-lg active:scale-95 group ${
                                        state && !isRedirecting
                                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 cursor-pointer'
                                          : 'bg-blue-400 cursor-not-allowed opacity-60'
                                      }`}
                                    >
                                        <span>حفظ وتصنيف (رواق التوقيع)</span>
                                        <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>

                                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                                    {(activeEditedArtifact?.versionId || rasmQuery.data?.latestDraftVersionId) && (
                                      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                        <div className="flex flex-col leading-none">
                                          <span className="text-[10px] font-black text-slate-500">جاهزية الملف</span>
                                          <span className={`text-[10px] font-black ${stats.qualityColor}`}>{stats.qualityLabel}</span>
                                        </div>
                                        <div className="relative w-[32rem]">
                                          <div className="h-3 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-300/80">
                                            <div
                                              className={`relative h-full rounded-full transition-all duration-500 ${stats.qualityColor.replace('text-', 'bg-')}`}
                                              style={{ width: `${Math.max(stats.fillRatio, 8)}%` }}
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0 opacity-80 animate-[pulse_1.8s_ease-in-out_infinite]" />
                                            </div>
                                          </div>
                                          <div className="mt-1 flex justify-between px-0.5 text-[9px] font-black text-slate-400">
                                            <span>0%</span>
                                            <span>50%</span>
                                            <span>100%</span>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-center leading-none">
                                          <span className={`min-w-[2.5rem] text-center text-[11px] font-black ${stats.qualityColor}`}>{stats.fillRatio}%</span>
                                          <span className="text-[9px] font-black text-slate-400">{stats.filledCount}/{stats.totalTrackedFields}</span>
                                        </div>
                                      </div>
                                    )}

                                    <button 
                                        onClick={() => void revertSavedEdit()}
                                        disabled={revertLatestSavedRasmEditMutation.isPending || (!activeEditedArtifact?.versionId && !rasmQuery.data?.latestDraftVersionId)}
                                        className={`px-6 py-2 rounded-full font-black text-[11px] flex items-center gap-2.5 transition-all shadow-lg active:scale-95 group ${
                                          revertLatestSavedRasmEditMutation.isPending || (!activeEditedArtifact?.versionId && !rasmQuery.data?.latestDraftVersionId)
                                            ? 'bg-blue-300 text-white cursor-not-allowed opacity-70'
                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110'
                                        }`}
                                    >
                                        <span>تحديث النسخة</span>
                                        <RotateCcw className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>

                                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                                    <button 
                                        onClick={() => {
                                          try {
                                            trpcUtils.feesAgent.documents.listSavedRasms.invalidate({ sessionToken: sessionToken || '' } as any);
                                          } catch {}
                                          navigate('/saved-documents');
                                        }}
                                        className="px-6 py-2 rounded-full font-black text-[11px] flex items-center gap-2.5 transition-all shadow-lg active:scale-95 group bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110"
                                    >
                                        <span>عرض المحفوظات</span>
                                        <FolderArchive className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>

                                </div>

                                <div className="flex items-center gap-2">
                                     {isEmbeddedOnlyOfficeActive && (
                                       <div
                                         title={onlyOfficeError || undefined}
                                         className={`flex items-center gap-2.5 rounded-lg py-1 px-3 shadow-inner ${
                                         onlyOfficePaneStatus === 'ready'
                                           ? 'bg-emerald-50 border border-emerald-200'
                                           : onlyOfficePaneStatus === 'error'
                                             ? 'bg-amber-50 border border-amber-200'
                                             : 'bg-white border border-slate-200'
                                       }`}
                                       >
                                          <div className={`w-2 h-2 rounded-full ${
                                            onlyOfficePaneStatus === 'ready'
                                              ? 'bg-emerald-500'
                                              : onlyOfficePaneStatus === 'error'
                                                ? 'bg-amber-500'
                                                : 'bg-blue-500 animate-pulse'
                                          }`}></div>
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                            {onlyOfficePaneStatus === 'ready'
                                              ? 'OnlyOffice Embedded'
                                              : onlyOfficePaneStatus === 'error'
                                                ? 'Fallback Preview'
                                                : 'Loading OnlyOffice'}
                                          </span>
                                       </div>
                                     )}
                                     <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg py-1 px-3 shadow-inner shadow-slate-50">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Mode: Preview</span>
                                     </div>
                                </div>
                            </div>

                            <div className="flex-1 relative overflow-hidden bg-slate-200/20">
                                {shouldRenderOnlyOfficePrimaryPane ? (
                                  shouldMountEmbeddedOnlyOffice ? (
                                    <OnlyOfficeEditor
                                      key={`onlyoffice-embedded-${onlyOfficeRenderNonce}`}
                                      dsUrl={onlyOfficeDsUrl as string}
                                      config={onlyOfficeConfig as Record<string, unknown>}
                                      mode="embedded"
                                      onReady={() => {
                                        setOnlyOfficeError(null);
                                        setOnlyOfficePaneStatus('ready');
                                      }}
                                      onError={(message) => {
                                        setOnlyOfficeError(message);
                                        setOnlyOfficePaneStatus('error');
                                      }}
                                    />
                                  ) : shouldShowEmbeddedOnlyOfficeLoader ? (
                                    <div className="h-full w-full bg-white flex items-center justify-center p-8">
                                      <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
                                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
                                          <Edit3 className="w-6 h-6 text-blue-600 animate-pulse" />
                                        </div>
                                        <div className="text-base font-black text-slate-900 mb-2">
                                          جاري فتح المستند داخل OnlyOffice
                                        </div>
                                        <div className="text-sm font-bold text-slate-600">
                                          يتم تحميل محرر المستند مباشرة داخل نافذة المعاينة.
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <HighResViewer 
                                        doc={forcedViewerDoc}
                                        docSourceMeta={{
                                          selectedDocSource: activeDocVersion,
                                          baseDocUrl: baseDocUrlForDebug,
                                          editedDocUrl: editedDocUrlForDebug,
                                          versionId: activeEditedArtifact?.versionId || latestAuditVersionId || null,
                                          rasmId,
                                          submissionId: judgeSubmissionId || null,
                                          reason:
                                            activeDocVersion === 'edited'
                                              ? 'activeDocVersion=edited'
                                              : (forcedViewerDoc as any)?.category
                                                ? `selectedVaultDoc.category=${String((forcedViewerDoc as any).category)}`
                                                : 'no-selectedVaultDoc',
                                        }}
                                        zoom={viewerZoom}
                                        isDragging={isDragging}
                                        onMouseDown={handleViewerMouseDown}
                                        onMouseMove={handleViewerMouseMove}
                                        onMouseUp={handleViewerMouseUp}
                                        onWheel={handleViewerWheel}
                                        containerRef={viewerContainerRef}
                                        isDarkMode={isDarkMode}
                                        onUpdateDraft={updateDraftContent}
                                        inlineEditMode={false}
                                        updateZoom={updateZoom}
                                        renderNonce={viewerDocRenderNonce}
                                        pdfTextEditor={{
                                          active: pdfFormEditorOpen && isSelectedPdf,
                                          tool: pdfTextTool,
                                          pageIndex: pdfTextPageIndex,
                                          pageSize: pdfTextPageSizes[pdfTextPageIndex] || null,
                                          edits: pdfTextEditsByPage[pdfTextPageIndex] || { rects: [], texts: [] },
                                          textInput: pdfTextInput,
                                          fontSize: pdfTextFontSize,
                                          onAddRect: addPdfRedactionRect,
                                          onAddText: addPdfOverlayText,
                                        }}
                                        onRegisterPlainTextGetter={(fn: () => string) => {
                                          editedPlainTextGetterRef.current = fn;
                                        }}
                                    />
                                  )
                                ) : (
                                  <HighResViewer 
                                      doc={forcedViewerDoc}
                                      docSourceMeta={{
                                        selectedDocSource: activeDocVersion,
                                        baseDocUrl: baseDocUrlForDebug,
                                        editedDocUrl: editedDocUrlForDebug,
                                        versionId: activeEditedArtifact?.versionId || latestAuditVersionId || null,
                                        rasmId,
                                        submissionId: judgeSubmissionId || null,
                                        reason:
                                          activeDocVersion === 'edited'
                                            ? 'activeDocVersion=edited'
                                            : (forcedViewerDoc as any)?.category
                                              ? `selectedVaultDoc.category=${String((forcedViewerDoc as any).category)}`
                                              : 'no-selectedVaultDoc',
                                      }}
                                      zoom={viewerZoom}
                                      isDragging={isDragging}
                                      onMouseDown={handleViewerMouseDown}
                                      onMouseMove={handleViewerMouseMove}
                                      onMouseUp={handleViewerMouseUp}
                                      onWheel={handleViewerWheel}
                                      containerRef={viewerContainerRef}
                                      isDarkMode={isDarkMode}
                                      onUpdateDraft={updateDraftContent}
                                      inlineEditMode={false}
                                      updateZoom={updateZoom}
                                      renderNonce={viewerDocRenderNonce}
                                      pdfTextEditor={{
                                        active: pdfFormEditorOpen && isSelectedPdf,
                                        tool: pdfTextTool,
                                        pageIndex: pdfTextPageIndex,
                                        pageSize: pdfTextPageSizes[pdfTextPageIndex] || null,
                                        edits: pdfTextEditsByPage[pdfTextPageIndex] || { rects: [], texts: [] },
                                        textInput: pdfTextInput,
                                        fontSize: pdfTextFontSize,
                                        onAddRect: addPdfRedactionRect,
                                        onAddText: addPdfOverlayText,
                                      }}
                                      onRegisterPlainTextGetter={(fn: () => string) => {
                                        editedPlainTextGetterRef.current = fn;
                                      }}
                                  />
                                )}
                            </div>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white px-2 py-1.5 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50" dir="ltr">
                                <button onClick={() => updateZoom(viewerZoom - 0.1)} className="p-1.5 hover:bg-white/10 rounded-full"><Minus className="w-4 h-4" /></button>
                                <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(viewerZoom * 100)}%</span>
                                <button onClick={() => updateZoom(viewerZoom + 0.1)} className="p-1.5 hover:bg-white/10 rounded-full"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Right Half: Validation Cards */}
                    <div className="w-[450px] bg-white h-full overflow-y-auto p-6 shadow-xl relative z-10 flex flex-col">
                        {activeTab === 'data' ? (
                          <div className="space-y-6 pb-20">
                                <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    مراجع تضمين الشهادة/العقد
                                </h3>

                                {/* Level 1: Deed Identity */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    
                                    {/* New Added Fields from Requirements */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع الشهادة</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                checked={true} readOnly
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <input 
                                                type="text" 
                                                value={finalRecord.certificateType}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, certificateType: e.target.value}))}
                                                className="flex-1 text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="أدخل نوع الشهادة..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">جهة التوثيق (المكتب)</label>
                                            <select 
                                                value={finalRecord.authority}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, authority: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                            >
                                                <option value="الرباط">مكتب التوثيق - الرباط</option>
                                                <option value="الدار البيضاء">مكتب التوثيق - الدار البيضاء</option>
                                                <option value="طنجة">مكتب التوثيق - طنجة</option>
                                                <option value="مراكش">مكتب التوثيق - مراكش</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التقييد</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.registrationDate || finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, registrationDate: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200 my-4"></div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الرقم المسلسل (Reference)</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={finalRecord.serial}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, serial: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono pl-8"
                                                />
                                                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            </div>
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ التوثيق</label>
                                            <input 
                                                type="date" 
                                                value={finalRecord.date}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, date: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">السجل</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.register}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, register: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">الصحيفة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.page}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, page: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">العدد</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.count}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, count: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Level 2: Parties Smart Cards */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h4 className="font-bold text-slate-700 text-sm flex justify-between items-center">
                                            بيانات اطراف الشهادة/العقد
                                            <span className="mr-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Smart Verify Active</span>
                                        </h4>
                                        <button
                                          type="button"
                                          onClick={addOptionalParty}
                                          className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md transition-all hover:brightness-110"
                                        >
                                          + إضافة طرف اختياري
                                        </button>
                                    </div>
                                    
                                    <div className="mb-4 relative group">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">الطرف الأول (البائع)</span>
                                                <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                             <div className="flex items-center gap-1 opacity-50">
                                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                                <span className="text-[10px] font-mono text-slate-400">BIO-SECURE</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الاسم الثلاثي"
                                                value={finalRecord.firstPartyName}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyName: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none pl-10"
                                            />
                                            <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="الرقم القومي"
                                                    value={finalRecord.firstPartyId}
                                                    onChange={(e) => setFinalRecord(prev => ({...prev, firstPartyId: e.target.value}))}
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                    dir="ltr"
                                                />
                                                <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 98%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 my-4 border-dashed"></div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">الطرف الثاني (المشتري)</span>
                                                 <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                                </span>
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الثلاثي"
                                            value={finalRecord.secondPartyName}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 mb-2 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="الرقم القومي"
                                                value={finalRecord.secondPartyId}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, secondPartyId: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-left"
                                                dir="ltr"
                                            />
                                             <div className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded border border-emerald-100">%IDD 95%</div>
                                        </div>
                                    </div>

                                    {Array.isArray((finalRecord as any).optionalParties) && (finalRecord as any).optionalParties.length > 0 && (
                                      <>
                                        <div className="border-t border-slate-200 my-4 border-dashed"></div>
                                        <div className="space-y-3">
                                          {(finalRecord as any).optionalParties.map((party: any, index: number) => (
                                            <div key={party.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                              <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">طرف اختياري {index + 1}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => removeOptionalParty(party.id)}
                                                  className="text-[11px] font-black text-red-600 hover:text-red-700"
                                                >
                                                  حذف
                                                </button>
                                              </div>
                                              <input
                                                type="text"
                                                placeholder="الاسم الثلاثي"
                                                value={party.name}
                                                onChange={(e) => updateOptionalParty(party.id, 'name', e.target.value)}
                                                className="mb-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                              />
                                              <input
                                                type="text"
                                                placeholder="الرقم القومي"
                                                value={party.nationalId}
                                                onChange={(e) => updateOptionalParty(party.id, 'nationalId', e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 p-2.5 text-left font-mono text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                                dir="ltr"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                </div>

                                {/* Level 3: Deed Reference System (Property Units) */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsUnitsCollapsed(!isUnitsCollapsed)}
                                        >
                                            <Building2 className={`w-4 h-4 transition-colors ${isUnitsCollapsed ? 'text-slate-400' : 'text-blue-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">مراجع سند الشهادة/العقد</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isUnitsCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-blue-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(true)}
                                                    className="w-3 h-3 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isUnitsAvailable ? 'text-blue-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isUnitsAvailable} 
                                                    onChange={() => setIsUnitsAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isUnitsAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isUnitsCollapsed && (
                                        !isUnitsAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء مراجع السند (هذه الخانة غير متوفرة لهذا العقد)</span>
                                            </div>
                                        ) : (
                                        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {propertyUnits.map((unit, idx) => {
                                            // Duplicate Check Logic
                                            const isDuplicate = propertyUnits.some((u, i) => i !== idx && (
                                                (u.type === 'unregistered' && unit.type === 'unregistered' && 
                                                 u.unregisteredData.bookNumber === unit.unregisteredData.bookNumber &&
                                                 u.unregisteredData.count === unit.unregisteredData.count &&
                                                 u.unregisteredData.page === unit.unregisteredData.page &&
                                                 u.unregisteredData.authority === unit.unregisteredData.authority) ||
                                                (u.type === 'registered' && unit.type === 'registered' &&
                                                 u.registeredData.deedNumber === unit.registeredData.deedNumber)
                                            ));

                                            return (
                                            <div key={unit.id} className={`p-4 bg-white rounded-xl border relative group transition-all ${isDuplicate ? 'border-red-300 shadow-red-100 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>
                                                <div className="absolute top-3 left-3 flex gap-2">
                                                     <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded-full">Unit {idx + 1}</span>
                                                    <button 
                                                        onClick={() => removePropertyUnit(unit.id)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all"
                                                        title="Remove Unit"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                
                                                <div className="mb-4 pr-8">
                                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-2">
                                                        <span>🔹 نوع السند (Deed Type)</span>
                                                        {isDuplicate && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 rounded-full animate-pulse">تكرار بيانات!</span>}
                                                    </label>
                                                    <select 
                                                        value={unit.type}
                                                        onChange={(e) => updatePropertyUnit(unit.id, 'type', e.target.value)}
                                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer font-bold text-slate-700"
                                                    >
                                                        <option value="unregistered">☐ سند غير محفظ (رسوم عدلية – غير محفظة)</option>
                                                        <option value="registered">☐ رسم عقاري محفظ (Land Title)</option>
                                                    </select>
                                                </div>

                                                {unit.type === 'unregistered' ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            <span className="text-xs font-bold text-emerald-700">حالة سند غير محفظ (رسوم عدلية)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع الدفتر</label>
                                                            <select 
                                                                value={unit.unregisteredData.bookType}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookType')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 bg-white outline-none"
                                                            >
                                                                <option value="أملاك">أملاك</option>
                                                                <option value="زواج">زواج</option>
                                                                <option value="تركات">تركات</option>
                                                                <option value="وصايا">وصايا</option>
                                                                <option value="كفالات">كفالات</option>
                                                                <option value="هبات">هبات</option>
                                                                <option value="أوقاف">أوقاف</option>
                                                                <option value="مختلفة">سجلات مختلفة</option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الدفتر</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.bookNumber}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'bookNumber')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">العدد</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.count}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'count')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">الصحيفة</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="#"
                                                                    value={unit.unregisteredData.page}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'page')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ التضمين</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.unregisteredData.date}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'date')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">جهة التوثيق</label>
                                                                <select 
                                                                    value={unit.unregisteredData.authority}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'authority')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="فاس">فاس</option>
                                                                    <option value="مراكش">مراكش</option>
                                                                    <option value="أكادير">أكادير</option>
                                                                    <option value="وجدة">وجدة</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <textarea 
                                                                placeholder="ملاحظات حول هذا السند..."
                                                                value={unit.unregisteredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'unregisteredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            <span className="text-xs font-bold text-blue-700">حالة رسم عقاري محفظ (Registered)</span>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم الرسم العقاري</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Titre Foncier (e.g., 12345/R)"
                                                                value={unit.registeredData.deedNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'deedNumber')}
                                                                className="w-full text-sm p-2.5 rounded border border-blue-200 bg-blue-50/30 outline-none font-mono font-bold text-blue-900"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ الإصدار</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={unit.registeredData.issueDate}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'issueDate')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">المحافظة العقارية</label>
                                                                <select 
                                                                    value={unit.registeredData.registryOffice}
                                                                    onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'registryOffice')}
                                                                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                                >
                                                                    <option value="الرباط">الرباط</option>
                                                                    <option value="الدار البيضاء">الدار البيضاء</option>
                                                                    <option value="طنجة">طنجة</option>
                                                                    <option value="القنيطرة">القنيطرة</option>
                                                                    <option value="سطات">سطات</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 mb-1">رقم المطلب (اختياري)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="رقم مطلب التحفيظ..."
                                                                value={unit.registeredData.applicationNumber}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'applicationNumber')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none"
                                                            />
                                                        </div>

                                                         <div>
                                                            <textarea 
                                                                placeholder="ملاحظات عقارية..."
                                                                value={unit.registeredData.notes || ''}
                                                                onChange={(e) => updatePropertyUnit(unit.id, 'registeredData', e.target.value, 'notes')}
                                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none min-h-[60px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                        
                                        <button 
                                            onClick={addPropertyUnit}
                                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-400 transition-all group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span>إضافة عقار / سند آخر (Add Property Unit)</span>
                                        </button>
                                    </div>
                                    )
                                    )}
                                </div>

                                {/* Level 4: Fiscal/Stamp */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div 
                                        className="flex items-center justify-between mb-0 group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer flex-1"
                                            onClick={() => setIsFinancialCollapsed(!isFinancialCollapsed)}
                                        >
                                            <CreditCardIcon className={`w-4 h-4 transition-colors ${isFinancialCollapsed ? 'text-slate-400' : 'text-emerald-500'}`} />
                                            <h4 className="font-bold text-slate-700 text-sm">البيانات المالية (Financial Data)</h4>
                                            <div className={`p-0.5 rounded-md hover:bg-slate-200 transition-all ${isFinancialCollapsed ? 'rotate-180 text-slate-400' : 'rotate-0 text-emerald-500'}`}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/50 p-1 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(true)}
                                                    className="w-3 h-3 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className={`text-[10px] font-bold ${isFinancialAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>متوفر</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={!isFinancialAvailable} 
                                                    onChange={() => setIsFinancialAvailable(false)}
                                                    className="w-3 h-3 text-red-600 focus:ring-red-500"
                                                />
                                                <span className={`text-[10px] font-bold ${!isFinancialAvailable ? 'text-red-600' : 'text-slate-400'}`}>غير متوفر</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {!isFinancialCollapsed && (
                                        !isFinancialAvailable ? (
                                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                <span className="text-xs font-bold">تم استثناء البيانات المالية (غير متوفرة لهذا السند)</span>
                                            </div>
                                        ) : (
                                        <div className="grid grid-cols-2 gap-3 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">دفتر المشهر</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.deedBook}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, deedBook: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-100" // readonly look maybe?
                                            />
                                        </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">أمر المطالبة</label>
                                            <input 
                                                type="text" 
                                                value={finalRecord.taxOrder}
                                                onChange={(e) => setFinalRecord(prev => ({...prev, taxOrder: e.target.value}))}
                                                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                    )
                                    )}
                                </div>

                                {/* Level 5: Notary Vital Data */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-4 text-sm">بيانات العدل(ة)</h4>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم العدل العاطف</label>
                                        <input 
                                            type="text" 
                                            placeholder="الاسم الرباعي"
                                            value={finalRecord.judgeName || ''}
                                            onChange={(e) => setFinalRecord(prev => ({...prev, judgeName: e.target.value}))}
                                            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-slate-800 bg-gradient-to-b from-slate-950 to-[#101828] p-4 shadow-[0_25px_60px_rgba(15,23,42,0.35)]">
                                  <div className="mb-4 flex items-center gap-3 text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                      <FolderArchive className="w-5 h-5 text-slate-200" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-black">إجراءات الوثيقة</div>
                                      <div className="text-[11px] font-bold text-slate-400">الإجراءات النهائية بعد استكمال جميع البيانات</div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreSaveReviewIntent('signing');
                                        setIsPreSaveReviewModalOpen(true);
                                      }}
                                      disabled={!rasmId}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black text-white transition-all flex items-center justify-center gap-2 border ${
                                        rasmId
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500/30 hover:brightness-110'
                                        : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'
                                      }`}
                                    >
                                      <FileSignature className="w-4 h-4" />
                                      رواق التوقيع العدلي
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void shareSelectedDocument()}
                                      disabled={!selectedDocumentUrl}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        selectedDocumentUrl
                                        ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                                        : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
                                      }`}
                                    >
                                      <Share2 className="w-4 h-4" />
                                      مشاركة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={printSelectedDocument}
                                      className="w-full rounded-xl px-4 py-3 text-sm font-black text-slate-100 bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700"
                                    >
                                      <Printer className="w-4 h-4" />
                                      طباعة
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void deleteCurrentRasm()}
                                      disabled={!rasmId || deleteSavedRasmMutation.isPending}
                                      className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border ${
                                        !rasmId || deleteSavedRasmMutation.isPending
                                        ? 'bg-red-950/40 text-red-300/50 border-red-900/40 cursor-not-allowed'
                                        : 'bg-red-950/80 text-red-300 border-red-900/60 hover:bg-red-900/80'
                                      }`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      حذف
                                    </button>
                                  </div>
                                </div>

                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    بطاقات التحقق
                                </h3>
                                
                                <div className="space-y-4 pb-20">
                            {validations.map((item, i) => (
                                <div key={i} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
                                    item.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 
                                    item.status === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
                                    'bg-red-50/50 border-red-100'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                            item.status === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 
                                            item.status === 'warning' ? 'bg-amber-100 border-amber-200 text-amber-600' : 
                                            'bg-red-100 border-red-200 text-red-600'
                                        }`}>
                                            {item.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                                             item.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                                             <XCircle className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-[15px]">{item.label}</h4>
                                            {item.msg && <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{item.msg}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full flex-col gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                        <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-500">مساحة العمل: {activeTab}</h3>
                </div>
            )}

            {/* ZONE 4: Footer Action Bar (Fixed at bottom of main area) */}
            <div className="h-[80px] bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20 absolute bottom-0 w-full left-0 right-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setDecisionType('reject'); setIsDecisionModalOpen(true); }}
                        className="px-6 py-3 rounded-xl border border-red-200 text-[#C62828] font-bold hover:bg-red-50 hover:brightness-110 transition-all text-sm"
                    >
                        رفض الملف
                    </button>
                    <button 
                        onClick={() => { setDecisionType('correct'); setIsDecisionModalOpen(true); }}
                        className="px-6 py-3 rounded-xl border border-orange-200 text-[#EF6C00] font-bold hover:bg-orange-50 hover:brightness-110 transition-all text-sm"
                    >
                        طلب استكمال
                    </button>
                    <button className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm">
                        حفظ الملاحظات
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                </div>
            </div>

        </main>
      </div>

      {/* --- Modals --- */}
      <DecisionModal
         isOpen={isDecisionModalOpen}
         onClose={() => setIsDecisionModalOpen(false)}
         type={decisionType}
         onConfirm={confirmFinalize}
         name={state?.sellers?.[0]?.name || '---'}
      />

      <PreSaveReviewModal
        isOpen={isPreSaveReviewModalOpen}
        onClose={() => setIsPreSaveReviewModalOpen(false)}
        checks={preSaveChecks}
        setChecks={setPreSaveChecks}
        showRegistration={needsRegistrationReview}
        onConfirm={async () => {
          setIsPreSaveReviewModalOpen(false);
          setSaveCategoryIntent(preSaveReviewIntent);
          setIsSaveCategoryModalOpen(true);
        }}
      />

      <SaveCategoryModal 
         isOpen={isSaveCategoryModalOpen}
         onClose={() => setIsSaveCategoryModalOpen(false)}
         onSave={handleSaveToCategory}
         intent={saveCategoryIntent}
         isLoading={isCategorySaving}
         fileName={state?.sellers?.[0]?.name ? `رسم عدلي: ${state?.sellers?.[0]?.name || ''}` : 'رسم غير مسمى'}
      />

      <ImageViewerModal 
         isOpen={isImageViewerOpen} 
         onClose={() => setIsImageViewerOpen(false)} 
         doc={selectedVaultDoc}
      />

      {/* Signature Confirmation Checklist */}
      <SignatureConfirmationModal 
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        checks={sigChecks}
        setChecks={setSigChecks}
        needsFiscal={needsFiscal}
        rasmId={rasmId}
        navigationState={{ draft: state?.draft, fallback: true }}
        onConfirm={async () => {
          setIsRedirecting(true);
          const ok = await confirmFinalize();
          if (!ok) {
            setIsRedirecting(false);
            return;
          }
          // If navigation is blocked by the alert dialog, ensure the modal doesn't stay on-screen.
          setIsSignatureModalOpen(false);
        }}
      />

      {/* Success Animation Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[2000] bg-blue-900/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                <CheckCircle2 className="w-14 h-14 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 font-amiri text-center">تم اعتماد الرسم بنجاح</h2>
            <p className="text-blue-200 text-xl font-bold">أصبح الرسم جاهزاً الآن لتوقيع السادة العدول...</p>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---

const SignatureConfirmationModal = ({ isOpen, onClose, checks, setChecks, onConfirm, needsFiscal, rasmId, navigationState }: any) => {
    if (!isOpen) return null;
    const navigate = useNavigate();

    const allChecked = checks.accuracy && 
                       checks.judgeNotes && 
                       (!needsFiscal || checks.registration) && 
                       checks.finality;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#fdfcf0] w-full max-w-2xl rounded-[3rem] border-l-[12px] border-[#d9a36f] shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in duration-300">
                
                {/* Header */}
                <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-3xl font-black text-[#1e3a8a] flex items-center gap-4 font-amiri">
                        <span className="text-4xl">🔎</span> المراجعة النهائية قبل اعتماد الرسم
                    </h3>
                    
                    {/* Direct link to old signature for emergency / preference */}
                    <button 
                        onClick={() => navigate(`/ready-for-signature/${rasmId}`, { state: navigationState })}
                        className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition-all border border-slate-200"
                    >
                        الواجهة القديمة (تخطي)
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Section 1: Accuracy (Green) */}
                    <div className="flex gap-6 items-start bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-emerald-900">أولاً: الدقة والكمال الموضوعي</h4>
                            <p className="text-emerald-800 font-bold leading-relaxed text-lg">
                                نرجو التأكد بعناية من أن جميع خانات وحقول التضمين الإلكتروني قد تم ملؤها بشكل دقيق وكامل، وأن البيانات المدرجة تعكس حقيقة السند دون سهو أو نقص.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-emerald-600"
                                    checked={checks.accuracy}
                                    onChange={(e) => setChecks({ ...checks, accuracy: e.target.checked })}
                                />
                                <span className="text-emerald-800 font-black text-sm group-hover:text-emerald-900">أُقرّ بأنني قمت بمراجعة كافة بيانات التضمين والتأكد من اكتمالها وصحتها.</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 2: Judge Notes (Amber) */}
                    <div className="flex gap-6 items-start bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                            <AwardIcon className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-amber-900">ثانياً: مطابقة ملاحظات قاضي التوثيق</h4>
                            <p className="text-amber-800 font-bold leading-relaxed text-lg">
                                إذا كانت قد صدرت عن السيد قاضي التوثيق ملاحظات أو توجيهات بخصوص هذا الرسم، نلتمس منكم التأكد من إدراج جميع التصحيحات والإضافات التي تم التنبيه إليها.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-amber-600"
                                    checked={checks.judgeNotes}
                                    onChange={(e) => setChecks({ ...checks, judgeNotes: e.target.checked })}
                                />
                                <span className="text-amber-800 font-black text-sm group-hover:text-amber-900">أؤكد أنني راجعت ملاحظات قاضي التوثيق (أو لا توجد ملاحظات سابقة) وأدرجت ما يلزم.</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 3: Registration (Orange) - only if required */}
                    {needsFiscal && (
                        <div className="flex gap-6 items-start bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                                <Building className="w-7 h-7 text-white" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-black text-orange-900">ثالثاً: مراجعة إجراءات التسجيل المسبقة</h4>
                                <p className="text-orange-800 font-bold leading-relaxed text-lg">
                                    تبين أن هذا الرسم يندرج ضمن الرسوم الخاضعة لإجراءات التسجيل. وعليه، يرجى التحقق بعناية من استيفاء متطلبات التسجيل وفق الضوابط الجاري بها العمل.
                                </p>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-6 h-6 rounded-lg accent-orange-600"
                                        checked={checks.registration}
                                        onChange={(e) => setChecks({ ...checks, registration: e.target.checked })}
                                    />
                                    <span className="text-orange-800 font-black text-sm group-hover:text-orange-900">أؤكد أنني تحققت من خضوع الرسم لإجراءات التسجيل ومن دقة بياناته.</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Finality (Red) */}
                    <div className="flex gap-6 items-start bg-red-50/50 p-6 rounded-3xl border border-red-100">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                            <Scale className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-red-910">رابعاً: استيفاء المسؤولية المهنية</h4>
                            <p className="text-red-900 font-bold leading-relaxed text-lg">
                                يرجى العلم أن اعتماد الرسم للانتقال إلى مرحلة التوقيع سيجعله غير قابل للتعديل مستقبلاً، إلا عن طريق ملحق إضافي وفق الضوابط القانونية.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-red-600"
                                    checked={checks.finality}
                                    onChange={(e) => setChecks({ ...checks, finality: e.target.checked })}
                                />
                                <span className="text-red-800 font-black text-sm group-hover:text-red-900">أدرك أن أي تعديل لاحق سيتطلب ملحقاً إضافياً.</span>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-10 bg-slate-50 flex flex-col gap-6 border-t border-slate-100">
                    {!allChecked && (
                        <div className="flex items-center justify-center gap-3 py-3 px-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-pulse font-black text-sm">
                            <AlertTriangle className="w-5 h-5" />
                            <span>يرجى استكمال كافة تأكيدات المراجعة (تأكد من النزول لآخر القائمة)</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-6">
                        <button 
                            onClick={onClose}
                            className="px-8 py-4 text-slate-500 font-black text-lg hover:text-slate-800 transition-colors"
                        >
                            ⬅ العودة للمراجعة
                        </button>
                        
                        <button 
                            disabled={!allChecked}
                            onClick={onConfirm}
                            className={`flex-1 flex items-center justify-center gap-4 px-12 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl ${
                                allChecked 
                                ? 'bg-[#1e3a8a] text-white hover:bg-blue-800 hover:shadow-blue-500/30 ring-4 ring-blue-100' 
                                : 'bg-slate-300 text-slate-100 cursor-not-allowed'
                            }`}
                        >
                            <FileSignature className="w-6 h-6" />
                            اعتماد والانتقال للتوقيع السيادي
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PreSaveReviewModal = ({ isOpen, onClose, checks, setChecks, showRegistration, onConfirm }: any) => {
  if (!isOpen) return null;

  const allChecked =
    checks.inclusionComplete &&
    (checks.judgeNotesApplied || checks.noJudgeNotes) &&
    (!showRegistration || checks.registrationConfirmed) &&
    checks.finalClosure;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[2rem] border border-slate-200 shadow-[0_50px_100px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-2xl font-black text-slate-900 font-amiri">نافذة: المراجعة النهائية قبل اعتماد الرسم</h3>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-emerald-900">🟢 أولًا: اكتمال بيانات التضمين</div>
                <div className="text-emerald-900/90 font-bold leading-relaxed">
                  ✔ أيقونة خضراء – تأكيد مهني
                  <div className="mt-2">
                    نلتمس منكم التفضل بإعادة النظر في جميع خانات وحقول التضمين الإلكتروني، والتأكد من إدراج البيانات كاملةً دون سهو أو نقص، بما يعكس مضمون السند على وجه الدقة والتمام.
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-emerald-600"
                    checked={checks.inclusionComplete}
                    onChange={(e) => setChecks({ ...checks, inclusionComplete: e.target.checked })}
                  />
                  <span className="font-black text-sm text-emerald-900">☐ أُقرّ بأنني راجعت جميع بيانات التضمين وتأكدت من اكتمالها وصحتها.</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-amber-100 bg-amber-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-amber-900">🟡 ثانيًا: ملاحظات قاضي التوثيق</div>
                <div className="text-amber-900/90 font-bold leading-relaxed">
                  ⚖ أيقونة ذهبية – مسؤولية مهنية
                  <div className="mt-2">
                    إذا كانت قد صدرت عن السيد قاضي التوثيق ملاحظات أو توجيهات بخصوص هذا الرسم، يرجى التأكد من إدراج جميع التصحيحات والإضافات المشار إليها، إذ ستتم مقارنة النسخة المعتمدة بالمسودة المحفوظة لديه خلال مرحلة الخطاب.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-amber-600"
                      checked={checks.judgeNotesApplied}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChecks({ ...checks, judgeNotesApplied: checked, noJudgeNotes: checked ? false : checks.noJudgeNotes });
                      }}
                    />
                    <span className="font-black text-sm text-amber-900">☐ أؤكد أنني اطلعت على ملاحظات قاضي التوثيق وأدرجت ما يلزم من تصحيحات.</span>
                  </label>

                  <div className="text-xs font-black text-slate-400 pr-8">أو</div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-amber-600"
                      checked={checks.noJudgeNotes}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChecks({ ...checks, noJudgeNotes: checked, judgeNotesApplied: checked ? false : checks.judgeNotesApplied });
                      }}
                    />
                    <span className="font-black text-sm text-amber-900">☐ لا توجد ملاحظات سابقة تتعلق بهذا الرسم.</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {showRegistration && (
            <div className="p-6 rounded-2xl border border-orange-100 bg-orange-50/60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-3">
                  <div className="text-lg font-black text-orange-900">🟠 ثالثًا (يظهر فقط إذا كان الرسم خاضعًا للتسجيل)</div>
                  <div className="text-orange-900/90 font-bold leading-relaxed">
                    🏛 أيقونة إدارية برتقالية – تنبيه مالي
                    <div className="mt-2">
                      تبين أن هذا الرسم يندرج ضمن الرسوم الخاضعة لإجراءات التسجيل. وعليه، يرجى التحقق بعناية من استيفاء متطلبات التسجيل وفق الضوابط الجاري بها العمل، ومراجعة صحة الأرقام والمبالغ والمراجع المالية المدرجة بالرسم، إذ إن أي عدم دقة فيها قد يترتب عنه مؤاخذات أو غرامات من طرف مصلحة التسجيل المختصة.
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-orange-600"
                      checked={checks.registrationConfirmed}
                      onChange={(e) => setChecks({ ...checks, registrationConfirmed: e.target.checked })}
                    />
                    <span className="font-black text-sm text-orange-900">☐ أؤكد أنني تحققت من خضوع الرسم لإجراءات التسجيل ومن دقة بياناته الرقمية والمراجع المالية.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-red-900">🔴 رابعًا: الإغلاق النهائي للرسم</div>
                <div className="text-red-900/90 font-bold leading-relaxed">
                  🔒 أيقونة حمراء هادئة – أثر قانوني
                  <div className="mt-2">
                    يرجى العلم أن اعتماد الرسم للانتقال إلى مرحلة التوقيع سيجعله غير قابل للتعديل لاحقًا، إلا بواسطة ملحق إضافي وفق الضوابط القانونية المعمول بها.
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-red-600"
                    checked={checks.finalClosure}
                    onChange={(e) => setChecks({ ...checks, finalClosure: e.target.checked })}
                  />
                  <span className="font-black text-sm text-red-900">☐ أدرك أن أي تعديل بعد هذه المرحلة يستلزم ملحقًا إضافيًا.</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          {!allChecked && (
            <div className="mb-4 text-center text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4">
              يرجى استكمال عناصر المراجعة قبل المتابعة.
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-black text-sm text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            >
              ⬅ العودة للمراجعة
            </button>

            <button
              type="button"
              disabled={!allChecked}
              onClick={onConfirm}
              className={`px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${
                allChecked ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'bg-blue-300 cursor-not-allowed opacity-70'
              }`}
            >
              🖋 اعتماد الرسم والانتقال إلى توقيع العدلين
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const SaveCategoryModal = ({ isOpen, onClose, onSave, fileName, intent, isLoading }: any) => {
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const categories = [
        { id: 'marriage', label: 'الزواج', icon: HeartPulse, color: 'text-emerald-600', accent: 'bg-emerald-500', glow: 'shadow-emerald-500/25', bg: 'bg-emerald-50', border: 'border-emerald-200', docType: 'رسم_زواج' },
        { id: 'divorce', label: 'الطلاق', icon: ScrollText, color: 'text-rose-600', accent: 'bg-rose-500', glow: 'shadow-rose-500/25', bg: 'bg-rose-50', border: 'border-rose-200', docType: 'رسم_طلاق' },
        { id: 'property', label: 'الأملاك', icon: LayoutGrid, color: 'text-blue-600', accent: 'bg-blue-500', glow: 'shadow-blue-500/25', bg: 'bg-blue-50', border: 'border-blue-200', docType: 'رسم_أملاك' },
        { id: 'inheritance', label: 'التركات', icon: Book, color: 'text-slate-700', accent: 'bg-slate-600', glow: 'shadow-slate-500/20', bg: 'bg-slate-100', border: 'border-slate-300', docType: 'رسم_تركات' },
        { id: 'misc', label: 'باقي الوثائق', icon: FolderArchive, color: 'text-amber-700', accent: 'bg-amber-500', glow: 'shadow-amber-500/25', bg: 'bg-amber-50', border: 'border-amber-200', docType: 'باقي_الوثائق' },
    ];

    React.useEffect(() => {
      if (isOpen) {
        setSelectedCategoryId(null);
        setIsSubmitting(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const isBusy = isSubmitting || Boolean(isLoading);
    const selectedIndex = Math.max(0, categories.findIndex((cat) => cat.id === selectedCategoryId));
    const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId) || null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !isBusy && onClose()}></div>
            <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 font-amiri">اختيار تصنيف الحفظ</h3>
                    <p className="text-slate-600 font-bold text-sm">
                      {intent === 'signing'
                        ? 'اختر نوع الرسم أولًا، ثم سيتم فتح رواق التوقيع مباشرة'
                        : 'المرجو تصنيف الرسم للحفظ ضمن السلة المناسبة'}
                    </p>
                    </div>
                    <button disabled={isBusy} onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">المستند الحالي</p>
                            <p className="text-slate-800 font-black">{fileName}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="pointer-events-none absolute right-6 top-8 bottom-8 w-1 rounded-full bg-slate-200" />
                        <div
                          className={`pointer-events-none absolute right-6 top-8 w-1 rounded-full transition-all duration-500 ${selectedCategory?.accent || 'bg-blue-500'} ${selectedCategory?.glow || ''}`}
                          style={{ height: `${selectedCategory ? 22 + selectedIndex * 92 : 0}px` }}
                        />

                        <div className="grid grid-cols-1 gap-3">
                            {categories.map((cat, index) => {
                              const isSelected = selectedCategoryId === cat.id;
                              return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`relative flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300 active:scale-[0.98] group text-right w-full ${
                                      isSelected
                                        ? `${cat.bg} ${cat.border} shadow-xl ${cat.glow} ring-2 ring-offset-2 ring-offset-white ring-current ${cat.color}`
                                        : `${cat.bg} ${cat.border} hover:shadow-lg`
                                    } ${isBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 transition-all duration-300 ${
                                      isSelected ? `${cat.accent} border-white shadow-lg` : 'bg-white border-slate-300'
                                    }`} />
                                    <div className={`mr-8 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        <cat.icon className={`w-7 h-7 ${cat.color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                          <h4 className={`text-xl font-black ${cat.color} mb-0.5`}>{cat.label}</h4>
                                          <span className={`text-[11px] font-black transition-all duration-300 ${isSelected ? cat.color : 'text-slate-400'}`}>
                                            {isSelected ? 'تم الاختيار' : `${index + 1}/5`}
                                          </span>
                                        </div>
                                        <p className="text-slate-500 font-bold text-xs uppercase opacity-80">
                                          {intent === 'signing'
                                            ? `اختيار ${cat.label} ثم فتح رواق التوقيع`
                                            : `إرسال إلى رواق ${(cat.label).includes('رسوم') ? cat.label : cat.label}`}
                                        </p>
                                    </div>
                                    <ChevronLeft className={`w-6 h-6 transition-all duration-300 ${isSelected ? `${cat.color} opacity-100 translate-x-0` : `${cat.color} opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0`}`} />
                                </button>
                              );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button 
                      disabled={isBusy} 
                      onClick={onClose} 
                      className="text-slate-500 font-bold hover:text-slate-800 px-8 py-2 disabled:opacity-40"
                    >
                      تراجع
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCategory || isBusy}
                      onClick={() => {
                        if (!selectedCategory || isBusy) return;
                        setIsSubmitting(true);
                        onSave(selectedCategory.docType);
                      }}
                      className={`px-6 py-3 rounded-2xl font-black text-sm text-white transition-all flex items-center justify-center gap-2 ${
                        selectedCategory && !isBusy
                          ? `${selectedCategory.accent} hover:brightness-110 shadow-lg ${selectedCategory.glow}`
                          : 'bg-slate-300 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin inline-block" />
                          <span>{intent === 'signing' ? 'جاري الانتقال إلى التوقيع...' : 'جاري الحفظ والاعتماد...'}</span>
                        </>
                      ) : (
                        intent === 'signing' ? 'متابعة إلى رواق التوقيع' : 'اعتماد الصنف المختار'
                      )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DecisionModal = ({ isOpen, onClose, type, onConfirm, name }: any) => {
    if (!isOpen) return null;
    
    const isApprove = type === 'approve';
    const isReject = type === 'reject';
    
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative bg-[#020617] w-full max-w-lg rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in duration-300">
                <div className={`p-10 text-center ${isApprove ? 'bg-emerald-500/10' : isReject ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-2xl ${isApprove ? 'bg-emerald-500 text-white' : isReject ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {isApprove ? <CheckCircle className="w-12 h-12" /> : isReject ? <XCircle className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 font-amiri">تاكيد القرار النهائي</h3>
                    <p className="text-slate-400 text-lg font-bold">للرسم الخاص بـ: <span className="text-white">{name}</span></p>
                </div>
                
                <div className="p-10 space-y-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-right">
                        <p className="text-white font-bold leading-relaxed mb-4">
                            {isApprove 
                                ? "هل تؤكد تضمين هذا الرسم نهائياً؟ بعد هذه الخطوة سيتم قفل الرسم، منحه رقم تضمين رسمي، وحفظه في الأرشيف غير القابل للحذف."
                                : "برجاء توضيح سبب اتخاذ هذا القرار ليتم إرساله للموثق المختص."}
                        </p>
                        {!isApprove && (
                            <textarea 
                                placeholder="اكتب السبب هنا..."
                                className="w-full bg-[#0f172a] border border-white/10 rounded-2xl p-4 text-white resize-none h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={onConfirm}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-xl transition-all active:scale-95 shadow-2xl ${isApprove ? 'bg-emerald-600 text-white hover:bg-emerald-500' : isReject ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                        >
                            تأكيد القرار نهائياً
                        </button>
                        <button onClick={onClose} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">تراجع</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ImageViewerModal = ({ isOpen, onClose, doc }: any) => {
    if (!isOpen || !doc) return null;
    
    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl">
            {/* Header Control Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent z-[1100]">
                <div className="flex gap-4">
                     <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">
                        <Printer className="w-5 h-5" />
                     </button>
                     <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all">
                        <Download className="w-5 h-5" />
                     </button>
                </div>
                <div className="text-center">
                    <h2 className="text-white font-black text-lg">معاينة السند العدلي الأصلي</h2>
                    <p className="text-slate-400 text-[12px] font-bold">دقة عالية - معالجة رقمية</p>
                </div>
                <button 
                    onClick={onClose}
                    className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all shadow-xl active:scale-95 group font-black"
                >
                     <span className="text-[14px]">إغلاق المعاينة</span>
                     <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
            
            <div className="w-full h-full flex items-center justify-center p-20 overflow-auto scrollbar-hide cursor-zoom-in">
                <div className="bg-white rounded-sm shadow-[0_0_150px_rgba(0,0,0,0.8)] p-1 animate-in zoom-in duration-700">
                    <img 
                      src={doc.url || doc.fileUrl || doc.file_url || doc.fileURL || doc.publicUrl || doc.public_url} 
                        alt="Full Resolution View" 
                        className="max-h-[85vh] object-contain"
                    />
                </div>
            </div>

            {/* Bottom Floating Close (Visual Backup) */}
            <button 
                onClick={onClose}
                className="absolute bottom-10 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-3xl border border-white/10 font-bold transition-all animate-bounce"
            >
                إغلاق (ESC)
            </button>
        </div>
    );
};
