import React, { useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export interface AttachmentItem {
  id: string;
  title: string;
  fileUrl: string;
  mimeType?: string;
  type?: 'PDF' | 'DOCX' | 'IMAGE' | 'HTML' | string;
  category?: string;
  size?: number | null;
}

export interface AttachmentSelectorStripProps {
  attachments: AttachmentItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const AttachmentSelectorStrip: React.FC<AttachmentSelectorStripProps> = ({
  attachments,
  selectedIndex,
  onSelectIndex,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="h-20 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center text-slate-400 text-xs font-amiri">
        <Paperclip className="w-4 h-4 mr-2 text-slate-500 ml-2" />
        <span>لا توجد مرفقات مصاحبة لهذا الرسم القضائي</span>
      </div>
    );
  }

  return (
    <div className="h-24 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center gap-3 shrink-0 relative select-none">
      {/* Scroll Navigation: Previous */}
      <button
        type="button"
        onClick={() => handleScroll('right')}
        className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition shadow-sm border border-slate-700/50 active:scale-95"
        title="التمرير لليمين"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Horizontal Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1 scroll-smooth"
        dir="rtl"
      >
        {attachments.map((att, idx) => {
          const isSelected = selectedIndex === idx;
          const isImage = att.type === 'IMAGE' || att.fileUrl.startsWith('data:image/') || att.mimeType?.startsWith('image/');
          const isPdf = att.type === 'PDF' || att.fileUrl.includes('.pdf') || att.mimeType?.includes('pdf');
          const isDocx = att.type === 'DOCX' || att.fileUrl.includes('.doc') || att.mimeType?.includes('word');

          return (
            <button
              type="button"
              key={att.id || `att-strip-${idx}`}
              onClick={() => onSelectIndex(idx)}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shrink-0 min-w-[200px] max-w-[280px] text-right ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/60 shadow-md ring-1 ring-amber-400/40 text-white'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
              }`}
            >
              {/* Thumbnail / Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isImage
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                    : isPdf
                    ? 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                    : isDocx
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isImage ? (
                  <ImageIcon className="w-5 h-5" />
                ) : isPdf ? (
                  <FileText className="w-5 h-5" />
                ) : isDocx ? (
                  <FileSpreadsheet className="w-5 h-5" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </div>

              {/* Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-black truncate font-amiri text-slate-100 group-hover:text-amber-300 transition-colors">
                    {att.title || `مرفق ${idx + 1}`}
                  </p>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span className="truncate max-w-[120px] font-amiri text-slate-400">
                    {att.category || 'مرفق داعم'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                      isImage
                        ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/40'
                        : isPdf
                        ? 'bg-rose-900/50 text-rose-300 border border-rose-800/40'
                        : isDocx
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-800/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {att.type || (isImage ? 'IMG' : isPdf ? 'PDF' : 'DOC')}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Scroll Navigation: Next */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition shadow-sm border border-slate-700/50 active:scale-95"
        title="التمرير لليسار"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Quick navigation hint */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono shrink-0">
        <span className="text-amber-400 font-bold">← / →</span>
        <span>للتنقل السريع</span>
      </div>
    </div>
  );
};

