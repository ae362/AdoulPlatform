import React, { useEffect, useState } from 'react';

const ZOOM_STORAGE_KEY = 'app_zoom_level';
const DEFAULT_ZOOM = 90;
const MIN_ZOOM = 75;
const MAX_ZOOM = 110;
const STEP = 5;

export const ZoomControl: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_ZOOM;
  });

  const applyZoom = (newZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    setZoom(clamped);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, clamped.toString());
    } catch {
      // ignore storage errors
    }
    document.documentElement.style.zoom = `${clamped}%`;
  };

  useEffect(() => {
    // Sync initial zoom on mount
    document.documentElement.style.zoom = `${zoom}%`;
  }, [zoom]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyZoom(zoom + STEP);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyZoom(zoom - STEP);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyZoom(DEFAULT_ZOOM);
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 bg-white/90 border border-slate-200/80 rounded-lg px-2 py-0.5 shadow-xs backdrop-blur-xs select-none text-slate-700 text-xs ${className}`}
        title="التحكم في نسبة تكبير الشاشة (حجم الواجهة)"
      >
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition-colors"
          title="تصغير الواجهة (Zoom out)"
        >
          −
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="px-1 text-[11px] font-bold hover:text-cyan-700 transition-colors cursor-pointer"
          title="إعادة ضبط الحجم الافتراضي (90%)"
        >
          {zoom}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition-colors"
          title="تكبير الواجهة (Zoom in)"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 bg-white/90 border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-xs backdrop-blur-xs select-none text-slate-700 ${className}`}
      title="التحكم في نسبة تكبير الشاشة (حجم الواجهة)"
    >
      <span className="text-xs opacity-60 ml-0.5">🔍</span>
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition-colors"
        title="تصغير الواجهة (Zoom out)"
        aria-label="تصغير الواجهة"
      >
        −
      </button>

      <button
        type="button"
        onClick={handleReset}
        className="px-1.5 py-0.5 rounded text-xs font-black tracking-tight hover:bg-cyan-50 hover:text-cyan-800 transition-colors"
        title="إعادة ضبط الحجم الافتراضي (90%)"
      >
        {zoom}%
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition-colors"
        title="تكبير الواجهة (Zoom in)"
        aria-label="تكبير الواجهة"
      >
        +
      </button>
    </div>
  );
};
export default ZoomControl;

