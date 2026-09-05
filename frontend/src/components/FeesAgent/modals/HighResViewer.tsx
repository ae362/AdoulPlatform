import React from 'react';
import { FileText, Minus, Plus } from 'lucide-react';

export interface HighResViewerProps {
  doc: any;
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: { deltaY: number; preventDefault?: () => void }) => void;
}

export const HighResViewer: React.FC<HighResViewerProps> = ({
  doc,
  zoom,
  pan,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}) => {
  if (!doc) {
    return (
      <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-slate-600" />
        </div>
        <p className="text-xl font-bold opacity-50">الرجاء اختيار وثيقة للعرض</p>
      </div>
    );
  }

  const isPDF = doc.name?.toLowerCase().endsWith('.pdf') || doc.type?.includes('pdf');

  return (
    <div
      className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing group select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Zoom Overlay Info */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        ZOOM: {Math.round(zoom * 100)}% | PAN: {Math.round(pan.x)}, {Math.round(pan.y)}
      </div>

      <div
        className={`transform-gpu ${!isDragging ? 'transition-transform duration-200 ease-out' : 'transition-none'}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        {isPDF ? (
          <div className="bg-white shadow-2xl p-10 min-w-[600px] min-h-[800px] flex flex-col items-center justify-center">
            <FileText className="w-24 h-24 text-red-500 mb-4" />
            <p className="text-slate-800 font-bold text-lg mb-2">وثيقة PDF: {doc.name || 'مستند'}</p>
            <p className="text-slate-500 text-sm">يتم عرض المعاينة العالية الدقة...</p>
          </div>
        ) : (
          <img
            src={typeof doc === 'string' ? doc : URL.createObjectURL(doc)}
            alt="Document Preview"
            className="max-w-none shadow-2xl bg-white border-8 border-white"
            style={{ height: '85vh', width: 'auto' }}
            draggable={false}
          />
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
        <button
          type="button"
          onClick={() => onWheel({ deltaY: 100, preventDefault: () => {} })}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white"
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="px-4 text-white font-bold min-w-[80px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={() => onWheel({ deltaY: -100, preventDefault: () => {} })}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          type="button"
          onClick={() => {
            // Reset zoom/pan if needed
          }}
          className="px-4 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm"
        >
          إعادة ضبط
        </button>
      </div>
    </div>
  );
};

