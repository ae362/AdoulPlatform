import React, { useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet,
  User,
  Heart,
  FolderOpen
} from 'lucide-react';

export interface MarriageAttachmentItem {
  id: string;
  title: string;
  fileUrl: string;
  mimeType?: string;
  type?: 'PDF' | 'DOCX' | 'IMAGE' | 'HTML' | string;
  category?: string;
  group: 'husband' | 'wife' | 'additional';
  size?: number | null;
}

export interface MarriageAttachmentCarouselProps {
  husbandAttachments: MarriageAttachmentItem[];
  wifeAttachments: MarriageAttachmentItem[];
  additionalAttachments: MarriageAttachmentItem[];
  activeGroup: 'husband' | 'wife' | 'additional';
  setActiveGroup: (group: 'husband' | 'wife' | 'additional') => void;
  selectedAttachmentId: string | null;
  onSelectAttachment: (att: MarriageAttachmentItem) => void;
}

export const MarriageAttachmentCarousel: React.FC<MarriageAttachmentCarouselProps> = ({
  husbandAttachments = [],
  wifeAttachments = [],
  additionalAttachments = [],
  activeGroup,
  setActiveGroup,
  selectedAttachmentId,
  onSelectAttachment,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentList =
    activeGroup === 'husband'
      ? husbandAttachments
      : activeGroup === 'wife'
      ? wifeAttachments
      : additionalAttachments;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="bg-slate-950 border-t border-slate-800/90 flex flex-col shrink-0 select-none shadow-2xl">
      {/* Category Group Selector Tabs */}
      <div className="h-10 px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tab 1: Husband Documents */}
          <button
            type="button"
            onClick={() => setActiveGroup('husband')}
            className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              activeGroup === 'husband'
                ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>وثائق الخاطب (الزوج)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                activeGroup === 'husband' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {husbandAttachments.length}
            </span>
          </button>

          {/* Tab 2: Wife Documents */}
          <button
            type="button"
            onClick={() => setActiveGroup('wife')}
            className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              activeGroup === 'wife'
                ? 'bg-pink-600 text-white shadow-md ring-1 ring-pink-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>وثائق المخطوبة (الزوجة)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                activeGroup === 'wife' ? 'bg-pink-800 text-pink-100' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {wifeAttachments.length}
            </span>
          </button>

          {/* Tab 3: Additional Legal Proofs */}
          <button
            type="button"
            onClick={() => setActiveGroup('additional')}
            className={`px-3.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              activeGroup === 'additional'
                ? 'bg-amber-600 text-white shadow-md ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>المستندات الثبوتية الإضافية</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                activeGroup === 'additional' ? 'bg-amber-800 text-amber-100' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {additionalAttachments.length}
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span className="text-amber-400 font-bold">← / →</span>
          <span>للتنقل بين الوثائق</span>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="h-20 px-4 flex items-center gap-3 relative">
        {/* Scroll: Right */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition shadow-sm border border-slate-700/50 active:scale-95 cursor-pointer"
          title="التمرير لليمين"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel items */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1 scroll-smooth"
          dir="rtl"
        >
          {currentList.length > 0 ? (
            currentList.map((att, idx) => {
              const isSelected = selectedAttachmentId === att.id;
              const isImage =
                att.type === 'IMAGE' ||
                att.fileUrl.startsWith('data:image/') ||
                att.mimeType?.startsWith('image/');
              const isPdf =
                att.type === 'PDF' ||
                att.fileUrl.includes('.pdf') ||
                att.mimeType?.includes('pdf') ||
                att.fileUrl.startsWith('data:application/pdf');
              const isDocx =
                att.type === 'DOCX' ||
                att.fileUrl.includes('.doc') ||
                att.mimeType?.includes('word');

              return (
                <button
                  type="button"
                  key={att.id || `att-card-${idx}`}
                  onClick={() => onSelectAttachment(att)}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shrink-0 min-w-[210px] max-w-[280px] text-right cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600/30 to-blue-700/20 border-blue-500 shadow-lg ring-1 ring-blue-400/50 text-white'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  {/* Thumbnail / Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
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
                      <ImageIcon className="w-4 h-4" />
                    ) : isPdf ? (
                      <FileText className="w-4 h-4" />
                    ) : isDocx ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </div>

                  {/* Attachment metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-black truncate font-amiri text-slate-100 group-hover:text-blue-300 transition-colors">
                        {att.title || `وثيقة ${idx + 1}`}
                      </p>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span className="truncate max-w-[120px] font-amiri text-slate-400">
                        {att.category || 'مرفق رسمي'}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
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
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-amiri py-4">
              <Paperclip className="w-4 h-4 ml-2 opacity-50" />
              <span>لا توجد وثائق مدرجة في هذه الفئة لهذا الطلب</span>
            </div>
          )}
        </div>

        {/* Scroll: Left */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition shadow-sm border border-slate-700/50 active:scale-95 cursor-pointer"
          title="التمرير لليسار"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

