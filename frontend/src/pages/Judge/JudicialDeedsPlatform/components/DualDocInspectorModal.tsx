import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Columns,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Shield,
  Layers,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileSpreadsheet,
  Paperclip,
  Move
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { AttachmentSelectorStrip, AttachmentItem } from './AttachmentSelectorStrip';

export interface DualDocInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryPdfUrl: string;
  primaryTitle?: string;
  attachments: AttachmentItem[];
}

const getJudgeLikePdfViewerUrl = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.split('#')[0];
  return `${cleanUrl}#view=FitH&zoom=100&toolbar=1`;
};

export const DualDocInspectorModal: React.FC<DualDocInspectorModalProps> = ({
  isOpen,
  onClose,
  primaryPdfUrl,
  primaryTitle = 'المحرر القضائي المعتمد برسم التوثيق',
  attachments = [],
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [splitMode, setSplitMode] = useState<'50-50' | 'focus-main' | 'focus-att'>('50-50');

  // Interactive Pan / Zoom state for Image Attachments
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reset zoom & pan when active attachment changes
  useEffect(() => {
    setImageZoom(1);
    setImageRotation(0);
    setImageOffset({ x: 0, y: 0 });
  }, [selectedIndex]);

  // Keep selected index within bounds
  useEffect(() => {
    if (attachments.length > 0 && selectedIndex >= attachments.length) {
      setSelectedIndex(0);
    }
  }, [attachments.length, selectedIndex]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        // RTL Next (towards right or previous index)
        if (attachments.length > 1) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
        }
      } else if (e.key === 'ArrowLeft') {
        // RTL Prev (towards left or next index)
        if (attachments.length > 1) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, attachments.length]);

  const activeAttachment = attachments[selectedIndex] || null;
  const isImageAttachment = Boolean(
    activeAttachment &&
      (activeAttachment.type === 'IMAGE' ||
        activeAttachment.fileUrl.startsWith('data:image/') ||
        activeAttachment.mimeType?.startsWith('image/'))
  );
  const isPdfAttachment = Boolean(
    activeAttachment &&
      (activeAttachment.type === 'PDF' ||
        activeAttachment.fileUrl.includes('.pdf') ||
        activeAttachment.mimeType?.includes('pdf') ||
        activeAttachment.fileUrl.startsWith('data:application/pdf'))
  );
  const isDocxAttachment = Boolean(
    activeAttachment &&
      (activeAttachment.type === 'DOCX' ||
        activeAttachment.fileUrl.includes('.doc') ||
        activeAttachment.mimeType?.includes('word'))
  );

  // Mouse drag handlers for image pane
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!isImageAttachment) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - imageOffset.x,
      y: e.clientY - imageOffset.y,
    };
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImageOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setImageZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setImageZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotateCw = () => setImageRotation((r) => (r + 90) % 360);
  const handleResetImage = () => {
    setImageZoom(1);
    setImageRotation(0);
    setImageOffset({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col font-cairo select-none text-slate-100 animate-in fade-in duration-200"
    >
      {/* 1. TOP HEADER & CONTROL TOOLBAR */}
      <header className="h-16 bg-[#02271a] border-b border-[#E6BE8A]/30 px-6 flex items-center justify-between shrink-0 z-20 shadow-xl">
        {/* Right Section: Title & Judicial Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black font-maghribi text-[#E6BE8A] flex items-center gap-2">
                منصة المعاينة المزدوجة والمطابقة الفورية
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full">
                  LIVE DUAL INSPECTOR
                </span>
              </h2>
              <p className="text-[10px] text-slate-300 font-bold font-amiri">
                مقارنة الرسم التوثيقي الرئيسي جنباً إلى جنب مع الوثائق والمرفقات الداعمة
              </p>
            </div>
          </div>
        </div>

        {/* Center Section: View Controls & Zoom */}
        <div className="flex items-center gap-3">
          {/* Split Mode Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setSplitMode('50-50')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                splitMode === '50-50'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="عرض متساوي (50/50)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>معاينة مزدوجة (50/50)</span>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode('focus-main')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                splitMode === 'focus-main'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="التركيز على الرسم الرئيسي"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تركيز الرسم</span>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode('focus-att')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                splitMode === 'focus-att'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="التركيز على المرفق المختار"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>تركيز المرفق</span>
            </button>
          </div>

          {/* Image Pan/Zoom Toolbar (if image active) */}
          {isImageAttachment && splitMode !== 'focus-main' && (
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner gap-1">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                title="تكبير الصورة"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 min-w-[40px] text-center">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                title="تصغير الصورة"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleRotateCw}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                title="تدوير الصورة 90 درجة"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetImage}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                title="إعادة ضبط الصورة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attachment Quick Selector Dropdown */}
          {attachments.length > 0 && (
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold font-amiri rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {attachments.map((att, idx) => (
                <option key={att.id || idx} value={idx}>
                  {idx + 1}. {att.title} ({att.category || 'مرفق'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Left Section: Close & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-400 font-mono">
            <span>اضغط</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-400 font-bold">
              ESC
            </kbd>
            <span>للإغلاق</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/50 flex items-center justify-center transition shadow-md active:scale-95 cursor-pointer"
            title="إغلاق منصة المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. DUAL INSPECTION WORKSPACE (SPLIT VIEW) */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-950">
        {/* PANE A: PRIMARY LEGAL DEED */}
        {(splitMode === '50-50' || splitMode === 'focus-main') && (
          <section
            className={`flex flex-col h-full rounded-2xl bg-slate-900 border border-slate-800/90 shadow-2xl overflow-hidden transition-all duration-200 ${
              splitMode === 'focus-main' ? 'w-full' : 'flex-1'
            }`}
          >
            {/* Pane A Title Bar */}
            <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" />
                <span className="text-xs font-black font-amiri text-emerald-400">
                  المستند الرئيسي برسم التوثيق
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-bold text-slate-300 truncate max-w-[280px]" title={primaryTitle}>
                  {primaryTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {primaryPdfUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => saveAs(primaryPdfUrl, `${primaryTitle || 'deed'}.pdf`)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="تحميل الرسم الرئيسي بصيغة PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={primaryPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="فتح الرسم في نافذة مستقلة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Pane A Frame */}
            <div className="flex-1 w-full h-full bg-slate-950 p-2 overflow-hidden relative">
              {primaryPdfUrl ? (
                <iframe
                  key={primaryPdfUrl}
                  src={getJudgeLikePdfViewerUrl(primaryPdfUrl)}
                  className="w-full h-full rounded-xl bg-white border-0 shadow-lg"
                  title="المستند القضائي الرئيسي"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-amiri p-6 text-center">
                  <FileText className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-black text-slate-300">جاري تجهيز وثيقة الرسم القضائي...</p>
                  <p className="text-xs text-slate-500 mt-1">تأكد من اكتمال استخراج مسودة أو ملف الـ PDF.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* PANE B: ACTIVE ATTACHMENT VIEWER */}
        {(splitMode === '50-50' || splitMode === 'focus-att') && (
          <section
            className={`flex flex-col h-full rounded-2xl bg-slate-900 border border-slate-800/90 shadow-2xl overflow-hidden transition-all duration-200 ${
              splitMode === 'focus-att' ? 'w-full' : 'flex-1'
            }`}
          >
            {/* Pane B Title Bar */}
            <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/20" />
                <span className="text-xs font-black font-amiri text-amber-400">
                  المرفق المختار للمطابقة:
                </span>
                <span className="text-slate-600">|</span>
                <span
                  className="text-xs font-bold text-slate-200 truncate max-w-[240px]"
                  title={activeAttachment?.title || 'مرفق داعم'}
                >
                  {activeAttachment?.title || 'لا يوجد مرفق محدد'}
                </span>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    ({selectedIndex + 1} من {attachments.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeAttachment?.fileUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        saveAs(activeAttachment.fileUrl, `${activeAttachment.title || 'attachment'}`)
                      }
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="تحميل المرفق"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={activeAttachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="فتح المرفق في نافذة مستقلة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Pane B Frame / Content */}
            <div className="flex-1 w-full h-full bg-slate-950 p-2 overflow-hidden relative">
              {activeAttachment ? (
                isImageAttachment ? (
                  /* Interactive Image Canvas */
                  <div
                    className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing border border-slate-800/80"
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUp}
                    onMouseLeave={handleImageMouseUp}
                  >
                    <div
                      style={{
                        transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageZoom}) rotate(${imageRotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        transformOrigin: 'center center',
                      }}
                      className="max-w-full max-h-full flex items-center justify-center p-4"
                    >
                      <img
                        src={activeAttachment.fileUrl}
                        alt={activeAttachment.title}
                        className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                        draggable={false}
                      />
                    </div>

                    {/* Quick pan helper badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-amiri font-bold flex items-center gap-1.5 pointer-events-none">
                      <Move className="w-3 h-3 text-amber-400" />
                      <span>اسحب للتحريك | انقر للتكبير</span>
                    </div>
                  </div>
                ) : isPdfAttachment ? (
                  /* PDF Viewer */
                  <iframe
                    key={activeAttachment.fileUrl}
                    src={getJudgeLikePdfViewerUrl(activeAttachment.fileUrl)}
                    className="w-full h-full rounded-xl bg-white border-0 shadow-lg"
                    title={activeAttachment.title}
                  />
                ) : (
                  /* Other files / DOCX */
                  <div className="w-full h-full rounded-xl bg-slate-900 flex flex-col items-center justify-center p-8 text-center border border-slate-800">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
                      {isDocxAttachment ? <FileSpreadsheet className="w-8 h-8" /> : <Paperclip className="w-8 h-8" />}
                    </div>
                    <h3 className="text-base font-black font-amiri text-slate-100 mb-1">
                      {activeAttachment.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mb-4 font-amiri">
                      نوع الملف: {activeAttachment.type || 'وثيقة إضافية'} ({activeAttachment.category || 'مرفق داعم'})
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveAs(activeAttachment.fileUrl, activeAttachment.title)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>تنزيل الملف للمعاينة</span>
                      </button>
                      <a
                        href={activeAttachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black transition flex items-center gap-2 border border-slate-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح في تبويب خارجي</span>
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full rounded-xl bg-slate-900/60 flex flex-col items-center justify-center text-slate-500 font-amiri p-6 text-center border border-dashed border-slate-800">
                  <Paperclip className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-black text-slate-400">لا توجد مرفقات مصاحبة محددة</p>
                  <p className="text-xs text-slate-600 mt-1">اختر مرفقاً من الشريط السفلي لمطابقته مع الرسم.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* 3. BOTTOM ATTACHMENT STRIP */}
      <AttachmentSelectorStrip
        attachments={attachments}
        selectedIndex={selectedIndex}
        onSelectIndex={(idx) => setSelectedIndex(idx)}
      />
    </div>
  );
};

