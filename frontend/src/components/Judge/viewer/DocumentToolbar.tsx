import React from 'react';
import { 
  Plus, Minus, RotateCcw, RotateCw, Trash2, 
  Pencil, Highlighter, Eraser, Printer, FileDown, 
  FileText
} from 'lucide-react';

interface DocumentToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  annotationState?: {
    activeTool: string;
    setTool: (tool: any) => void;
    canUndo: boolean;
    undo: () => void;
    canRedo: boolean;
    redo: () => void;
    clearAll: () => void;
  };
  documentTitle?: string;
  fileType?: string;
  onPrint?: () => void;
  onDownload?: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  annotationState,
  documentTitle,
  fileType = 'HTML',
  onPrint,
  onDownload,
}) => {
  return (
    <div dir="rtl" className="w-full bg-[#18181b] border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0 z-40 shadow-md select-none">
      {/* Right: Document Info & Badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#023120] text-[#E6BE8A] flex items-center justify-center shadow-md">
          <FileText size={18} />
        </div>
        <div className="text-right">
          <h4 className="text-xs font-black text-white font-amiri leading-tight">
            {documentTitle || 'المستند القضائي المعتمد'}
          </h4>
          <span className="inline-block mt-0.5 text-[9px] font-black font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#E6BE8A] uppercase">
            {fileType}
          </span>
        </div>
      </div>

      {/* Center: Zoom and Annotation Controls */}
      <div className="flex items-center gap-3" dir="ltr">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
          <button
            type="button"
            onClick={onZoomIn}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 text-slate-300 hover:text-[#E6BE8A] transition-all font-black"
            title="تكبير (+)"
          >
            <Plus size={15} />
          </button>
          <div className="px-2 font-mono font-black text-xs text-[#E6BE8A] min-w-[48px] text-center border-x border-white/10">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={onZoomOut}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 text-slate-300 hover:text-[#E6BE8A] transition-all font-black"
            title="تصغير (-)"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase text-slate-300 transition-all"
            title="إعادة ضبط المقياس"
          >
            100%
          </button>
        </div>

        {/* Annotation Tools */}
        {annotationState && (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
            <button
              type="button"
              onClick={() => annotationState.setTool(annotationState.activeTool === 'pen' ? 'select' : 'pen')}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
                annotationState.activeTool === 'pen'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                  : 'bg-white/5 hover:bg-white/15 border-white/5 text-slate-300'
              }`}
              title="قلم التأشير القضائي"
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              onClick={() => annotationState.setTool(annotationState.activeTool === 'highlighter' ? 'select' : 'highlighter')}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
                annotationState.activeTool === 'highlighter'
                  ? 'bg-amber-500 text-white border-amber-300 shadow-md'
                  : 'bg-white/5 hover:bg-white/15 border-white/5 text-slate-300'
              }`}
              title="قلم التظليل"
            >
              <Highlighter size={14} />
            </button>

            <button
              type="button"
              onClick={() => annotationState.setTool(annotationState.activeTool === 'eraser' ? 'select' : 'eraser')}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all border ${
                annotationState.activeTool === 'eraser'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                  : 'bg-white/5 hover:bg-white/15 border-white/5 text-slate-300'
              }`}
              title="الممحاة"
            >
              <Eraser size={14} />
            </button>

            <div className="w-px h-4 bg-white/15 mx-0.5"></div>

            <button
              type="button"
              disabled={!annotationState.canUndo}
              onClick={annotationState.undo}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 transition-all"
              title="تراجع"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              disabled={!annotationState.canRedo}
              onClick={annotationState.redo}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 transition-all"
              title="إعادة"
            >
              <RotateCw size={14} />
            </button>

            <button
              type="button"
              onClick={annotationState.clearAll}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-rose-500/25 text-rose-400 transition-all"
              title="مسح جميع التأشيرات"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Left: Print & Download Quick Actions */}
      <div className="flex items-center gap-2">
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-black font-amiri flex items-center gap-1.5 transition-all shadow-xs"
            title="طباعة الوثيقة"
          >
            <Printer size={14} />
            <span>طباعة</span>
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="px-3.5 py-1.5 bg-[#023120] hover:bg-[#03442c] text-[#E6BE8A] rounded-lg text-xs font-black font-amiri flex items-center gap-1.5 transition-all shadow-md"
            title="تحميل الوثيقة"
          >
            <FileDown size={14} />
            <span>تحميل</span>
          </button>
        )}
      </div>
    </div>
  );
};
