import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Move,
  ChevronRight,
  ChevronLeft,
  User,
  Heart,
  SlidersHorizontal,
  Printer,
  FileSpreadsheet,
  Layers,
  Sparkles
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { MarriageAttachmentCarousel, MarriageAttachmentItem } from './MarriageAttachmentCarousel';
import { MarriageDocumentView } from '../../../components/MarriageDocumentView';

export interface ComplianceRule {
  id: string;
  label: string;
  description: string;
  status: 'green' | 'red' | 'amber' | 'blue';
  category?: 'age' | 'status' | 'medical' | 'guardianship' | 'custom';
  message: string;
}

export interface MarriageDualInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestNumber: string;
  requestData: any;
  notaryData?: any;
  primaryPdfUrl?: string;
  husbandAttachments?: MarriageAttachmentItem[];
  wifeAttachments?: MarriageAttachmentItem[];
  additionalAttachments?: MarriageAttachmentItem[];
  complianceChecks?: ComplianceRule[];
  onOpenDecisionModal?: () => void;
}

const getJudgeLikePdfViewerUrl = (url: string) => {
  if (!url) return '';
  const cleanUrl = url.split('#')[0];
  return `${cleanUrl}#view=FitH&zoom=100&toolbar=1`;
};

export const MarriageDualInspectorModal: React.FC<MarriageDualInspectorModalProps> = ({
  isOpen,
  onClose,
  requestNumber,
  requestData = {},
  notaryData = {},
  primaryPdfUrl,
  husbandAttachments = [],
  wifeAttachments = [],
  additionalAttachments = [],
  complianceChecks = [],
  onOpenDecisionModal,
}) => {
  const [activeGroup, setActiveGroup] = useState<'husband' | 'wife' | 'additional'>('husband');
  const [selectedAttachment, setSelectedAttachment] = useState<MarriageAttachmentItem | null>(null);
  const [splitMode, setSplitMode] = useState<'50-50' | 'focus-main' | 'focus-att'>('50-50');
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);

  // Pane A (Request Document) zoom
  const [requestZoom, setRequestZoom] = useState(1);

  // Pane B (Image attachment) interactive pan/zoom state
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Auto-select initial attachment when group changes or modal opens
  useEffect(() => {
    const list =
      activeGroup === 'husband'
        ? husbandAttachments
        : activeGroup === 'wife'
        ? wifeAttachments
        : additionalAttachments;

    if (list.length > 0) {
      setSelectedAttachment(list[0]);
    } else {
      setSelectedAttachment(null);
    }
  }, [activeGroup, husbandAttachments, wifeAttachments, additionalAttachments]);

  // Reset zoom & pan when active attachment changes
  useEffect(() => {
    setImageZoom(1);
    setImageRotation(0);
    setImageOffset({ x: 0, y: 0 });
  }, [selectedAttachment]);

  // Current active group attachments list
  const currentList = useMemo(() => {
    return activeGroup === 'husband'
      ? husbandAttachments
      : activeGroup === 'wife'
      ? wifeAttachments
      : additionalAttachments;
  }, [activeGroup, husbandAttachments, wifeAttachments, additionalAttachments]);

  const currentIndex = useMemo(() => {
    if (!selectedAttachment) return 0;
    const idx = currentList.findIndex((a) => a.id === selectedAttachment.id);
    return idx >= 0 ? idx : 0;
  }, [currentList, selectedAttachment]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        // RTL Next (towards right or previous index)
        if (currentList.length > 1) {
          e.preventDefault();
          const nextIdx = currentIndex > 0 ? currentIndex - 1 : currentList.length - 1;
          setSelectedAttachment(currentList[nextIdx]);
        }
      } else if (e.key === 'ArrowLeft') {
        // RTL Prev (towards left or next index)
        if (currentList.length > 1) {
          e.preventDefault();
          const nextIdx = currentIndex < currentList.length - 1 ? currentIndex + 1 : 0;
          setSelectedAttachment(currentList[nextIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentList, currentIndex]);

  const isImageAttachment = Boolean(
    selectedAttachment &&
      (selectedAttachment.type === 'IMAGE' ||
        selectedAttachment.fileUrl.startsWith('data:image/') ||
        selectedAttachment.mimeType?.startsWith('image/'))
  );
  const isPdfAttachment = Boolean(
    selectedAttachment &&
      (selectedAttachment.type === 'PDF' ||
        selectedAttachment.fileUrl.includes('.pdf') ||
        selectedAttachment.mimeType?.includes('pdf') ||
        selectedAttachment.fileUrl.startsWith('data:application/pdf'))
  );
  const isDocxAttachment = Boolean(
    selectedAttachment &&
      (selectedAttachment.type === 'DOCX' ||
        selectedAttachment.fileUrl.includes('.doc') ||
        selectedAttachment.mimeType?.includes('word'))
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

  const totalAttachmentsCount =
    husbandAttachments.length + wifeAttachments.length + additionalAttachments.length;

  const redFlagsCount = complianceChecks.filter((c) => c.status === 'red').length;
  const amberFlagsCount = complianceChecks.filter((c) => c.status === 'amber').length;

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[800] bg-slate-950/98 backdrop-blur-2xl flex flex-col font-cairo select-none text-slate-100 animate-in fade-in duration-200"
    >
      {/* 1. TOP HEADER & CONTROL TOOLBAR */}
      <header className="h-16 bg-[#02271a] border-b border-[#E6BE8A]/30 px-6 flex items-center justify-between shrink-0 z-30 shadow-xl">
        {/* Right Section: Title & Judicial Metadata */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black font-maghribi text-[#E6BE8A]">
                  منصة الفحص والمطابقة الرقمية - طلبات إذن الزواج
                </h2>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full">
                  MARRIAGE AUDIT & COMPLIANCE
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-300 font-bold font-amiri mt-0.5">
                <span>رقم الطلب: <strong className="font-mono text-emerald-400">{requestNumber}</strong></span>
                <span className="text-white/30">|</span>
                <span>الخاطب: <strong className="text-blue-300">{requestData?.suitorFirstNameAr} {requestData?.suitorLastNameAr}</strong></span>
                <span className="text-white/30">|</span>
                <span>المخطوبة: <strong className="text-pink-300">{requestData?.brideFirstNameAr} {requestData?.brideLastNameAr}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: View Controls & Compliance Center Trigger */}
        <div className="flex items-center gap-3">
          {/* Split Mode Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setSplitMode('50-50')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                splitMode === '50-50'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="معاينة متساوية (50/50)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>معاينة مزدوجة (50/50)</span>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode('focus-main')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                splitMode === 'focus-main'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="التركيز على طلب الإذن الرئيسي"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>طلب الإذن</span>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode('focus-att')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                splitMode === 'focus-att'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="التركيز على المرفق المختار"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>المرفق المختار</span>
            </button>
          </div>

          {/* Compliance Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsComplianceOpen((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-2 border cursor-pointer ${
              isComplianceOpen
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg ring-1 ring-blue-400/50'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="فتح/إغلاق لوحة مركز الامتثال"
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>مركز الامتثال</span>
            {redFlagsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse">
                {redFlagsCount} تنبيه
              </span>
            ) : amberFlagsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black">
                {amberFlagsCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-black">
                سليم
              </span>
            )}
          </button>

          {/* Image Pan/Zoom Tools */}
          {isImageAttachment && splitMode !== 'focus-main' && (
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner gap-1">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="تكبير الصورة"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 min-w-[38px] text-center">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="تصغير الصورة"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleRotateCw}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="تدوير الصورة 90 درجة"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetImage}
                className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                title="إعادة ضبط الصورة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Left Section: Actions & Close */}
        <div className="flex items-center gap-3">
          {/* Direct Decision Button */}
          {onOpenDecisionModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDecisionModal();
              }}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اتخاذ القرار</span>
            </button>
          )}

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

      {/* 2. DUAL INSPECTION WORKSPACE BODY */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-950 relative">
        {/* PANE A: PRIMARY MARRIAGE AUTHORIZATION REQUEST */}
        {(splitMode === '50-50' || splitMode === 'focus-main') && (
          <section
            className={`flex flex-col h-full rounded-2xl bg-slate-900 border border-slate-800/90 shadow-2xl overflow-hidden transition-all duration-200 ${
              splitMode === 'focus-main' ? 'w-full' : 'flex-1'
            }`}
          >
            {/* Pane A Header Bar */}
            <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" />
                <span className="text-xs font-black font-amiri text-emerald-400">
                  طلب الإذن بتوثيق الزواج الرسمي
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {requestNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {primaryPdfUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => saveAs(primaryPdfUrl, `marriage_request_${requestNumber}.pdf`)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="تحميل طلب الإذن بصيغة PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={primaryPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="فتح في نافذة مستقلة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Pane A Content View */}
            <div className="flex-1 w-full h-full bg-slate-950 p-2 overflow-y-auto custom-scrollbar relative flex justify-center items-start">
              {primaryPdfUrl ? (
                <iframe
                  key={primaryPdfUrl}
                  src={getJudgeLikePdfViewerUrl(primaryPdfUrl)}
                  className="w-full h-full rounded-xl bg-white border-0 shadow-lg"
                  title="طلب الإذن بتوثيق الزواج"
                />
              ) : (
                <div className="w-full max-w-[850px] bg-white rounded-lg shadow-2xl overflow-hidden my-2 border border-slate-200">
                  <MarriageDocumentView
                    data={requestData || {}}
                    notaryData={notaryData || {}}
                    attachments={currentList}
                  />
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
            {/* Pane B Header Bar */}
            <div className="h-11 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/20" />
                <span className="text-xs font-black font-amiri text-amber-400">
                  المرفق المختار للمطابقة:
                </span>
                <span className="text-slate-600">|</span>
                <span
                  className="text-xs font-bold text-slate-200 truncate max-w-[220px]"
                  title={selectedAttachment?.title || 'مرفق'}
                >
                  {selectedAttachment?.title || 'لا يوجد مرفق محدد'}
                </span>
                {selectedAttachment && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-amiri ${
                      activeGroup === 'husband'
                        ? 'bg-blue-900/60 text-blue-300 border border-blue-800/40'
                        : activeGroup === 'wife'
                        ? 'bg-pink-900/60 text-pink-300 border border-pink-800/40'
                        : 'bg-amber-900/60 text-amber-300 border border-amber-800/40'
                    }`}
                  >
                    {activeGroup === 'husband'
                      ? 'وثائق الزوج'
                      : activeGroup === 'wife'
                      ? 'وثائق الزوجة'
                      : 'مستند إضافي'}
                  </span>
                )}
                {currentList.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    ({currentIndex + 1} من {currentList.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedAttachment?.fileUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        saveAs(selectedAttachment.fileUrl, selectedAttachment.title || 'attachment')
                      }
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="تحميل المرفق"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={selectedAttachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="فتح المرفق في نافذة مستقلة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Pane B View Area */}
            <div className="flex-1 w-full h-full bg-slate-950 p-2 overflow-hidden relative">
              {selectedAttachment ? (
                isImageAttachment ? (
                  /* Interactive Image Viewer Canvas */
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
                        src={selectedAttachment.fileUrl}
                        alt={selectedAttachment.title}
                        className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                        draggable={false}
                      />
                    </div>

                    {/* Helper badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pointer-events-none">
                      <Move className="w-3 h-3 text-amber-400" />
                      <span>اسحب للتحريك | انقر للتكبير والتصغير</span>
                    </div>
                  </div>
                ) : isPdfAttachment ? (
                  /* Secondary PDF Frame */
                  <iframe
                    key={selectedAttachment.fileUrl}
                    src={getJudgeLikePdfViewerUrl(selectedAttachment.fileUrl)}
                    className="w-full h-full rounded-xl bg-white border-0 shadow-lg"
                    title={selectedAttachment.title}
                  />
                ) : (
                  /* DOCX or Other File Fallback */
                  <div className="w-full h-full rounded-xl bg-slate-900 flex flex-col items-center justify-center p-8 text-center border border-slate-800">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
                      {isDocxAttachment ? <FileSpreadsheet className="w-8 h-8" /> : <Paperclip className="w-8 h-8" />}
                    </div>
                    <h3 className="text-base font-black font-amiri text-slate-100 mb-1">
                      {selectedAttachment.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mb-4 font-amiri">
                      نوع الملف: {selectedAttachment.type || 'وثيقة إضافية'} ({selectedAttachment.category || 'مرفق داعم'})
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveAs(selectedAttachment.fileUrl, selectedAttachment.title)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>تنزيل الملف للمعاينة</span>
                      </button>
                      <a
                        href={selectedAttachment.fileUrl}
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
                  <p className="text-sm font-black text-slate-400">لا توجد وثائق محددة للمعاينة</p>
                  <p className="text-xs text-slate-600 mt-1">اختر وثيقة من الشريط المصنف بالأسفل لمطابقتها مع الطلب.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SIDE OVERLAY: مركز الامتثال (Collapsible Compliance Drawer) */}
        {isComplianceOpen && (
          <aside className="w-80 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col shrink-0 z-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black text-slate-100 font-amiri uppercase tracking-wider">
                  مركز الامتثال والتحقق
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComplianceOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {complianceChecks.length > 0 ? (
                complianceChecks.map((rule) => {
                  const isGreen = rule.status === 'green';
                  const isRed = rule.status === 'red';
                  const isAmber = rule.status === 'amber';

                  return (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isGreen
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                          : isRed
                          ? 'bg-rose-950/40 border-rose-800/50 text-rose-200 shadow-md'
                          : isAmber
                          ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                          : 'bg-blue-950/30 border-blue-800/40 text-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black font-amiri">{rule.label}</span>
                        {isGreen ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isRed ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : isAmber ? (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] font-bold opacity-90 leading-relaxed font-amiri">
                        {rule.message || rule.description}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-slate-800/50 text-slate-400 text-xs text-center font-amiri">
                  تم استيفاء جميع الشروط القانونية الأولية
                </div>
              )}

              {/* Judicial Recommendation Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 mt-4">
                <p className="text-[10px] font-black text-amber-400 mb-1 tracking-widest uppercase">
                  توصية التدقيق القضائي
                </p>
                <p className="text-xs font-bold leading-relaxed text-slate-300 font-amiri">
                  {redFlagsCount > 0
                    ? 'يتطلب الملف إرفاق إذن قضائي خاص أو عقد جلسة استماع للأطراف قبل الاعتماد.'
                    : 'الملف مستوفٍ لجميع الشروط الجوهرية والشكلية لمطابقة إذن الزواج.'}
                </p>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* 3. CATEGORIZED BOTTOM ATTACHMENT CAROUSEL */}
      <MarriageAttachmentCarousel
        husbandAttachments={husbandAttachments}
        wifeAttachments={wifeAttachments}
        additionalAttachments={additionalAttachments}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        selectedAttachmentId={selectedAttachment?.id || null}
        onSelectAttachment={(att) => setSelectedAttachment(att)}
      />
    </div>
  );
};

