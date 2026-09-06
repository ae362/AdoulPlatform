import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { logViewerEvent } from '../utils/documentTelemetry';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface JudicialPdfViewerProps {
  url: string;
  targetWidth?: number;
  className?: string;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onLoadSuccess?: (totalPages: number) => void;
  submissionId?: string;
}

interface PageRenderItemProps {
  pdfDoc: any;
  pageNumber: number;
  targetWidth: number;
  isSingleMode?: boolean;
  submissionId?: string;
}

const JudicialPdfPageItem: React.FC<PageRenderItemProps> = ({
  pdfDoc,
  pageNumber,
  targetWidth,
  isSingleMode = false,
  submissionId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [pageHeight, setPageHeight] = useState<number>(Math.round(targetWidth * 1.414));
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel any active render task before starting a new one
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = targetWidth / Math.max(1, baseViewport.width);
        const viewport = page.getViewport({ scale });
        
        // Scale by device pixel ratio for crystal clear high-DPI rendering
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        const canvas = canvasRef.current;
        if (!canvas) return;

        logViewerEvent('RENDER_START', {
          pageNumber,
          scale,
          targetWidth,
          submissionId,
          dpr,
        });

        const cssWidth = Math.round(viewport.width);
        const cssHeight = Math.round(viewport.height);
        setPageHeight(cssHeight);

        // Canvas buffer scaled by DPR
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        
        // CSS display size constrained to viewport
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        if (!isCancelled) {
          setRendered(true);
          setError(null);
          logViewerEvent('RENDER_COMPLETE', {
            pageNumber,
            submissionId,
          });
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || isCancelled) {
          return;
        }

        console.error(`Error rendering PDF page ${pageNumber}:`, err);
        logViewerEvent('VIEWER_ERROR', {
          error: err?.message || 'Page render failure',
          pageNumber,
          submissionId,
        });
        if (!isCancelled) {
          setError('تعذر عرض الصفحة بدقة');
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, targetWidth, submissionId]);

  return (
    <div className="relative mx-auto bg-white shadow-2xl rounded-sm border border-slate-200/80 overflow-hidden mb-8 last:mb-0 transition-shadow">
      {!isSingleMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100/80 border-b border-slate-200 text-xs font-black text-slate-500 font-mono">
          <span>صفحة {pageNumber}</span>
          <span className="text-[10px] text-slate-400">وثيقة رسمية معتمدة</span>
        </div>
      )}

      <div
        className="relative bg-white flex items-center justify-center overflow-hidden"
        style={{
          width: `${targetWidth}px`,
          minHeight: `${pageHeight}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          className={`block transition-opacity duration-300 pointer-events-none ${rendered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        />

        <div
          className="absolute inset-0 pointer-events-auto z-10"
          style={{ width: '100%', height: '100%' }}
        />

        {!rendered && !error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-xs">
            <div className="w-10 h-10 border-3 border-[#023120] border-t-[#E6BE8A] rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-slate-500 font-amiri">جاري معالجة الصفحة {pageNumber}...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-rose-50/90">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-sm font-black text-rose-700 font-amiri">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const JudicialPdfViewer: React.FC<JudicialPdfViewerProps> = ({
  url,
  targetWidth = 860,
  className = '',
  onPageChange,
  onLoadSuccess,
  submissionId,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);

    const loadDoc = async () => {
      if (!url) {
        setLoading(false);
        return;
      }

      logViewerEvent('DOC_FETCH_START', { url, submissionId, type: 'PDF' });

      try {
        let loadingTask: any;

        if (url.startsWith('data:')) {
          const base64Index = url.indexOf('base64,');
          if (base64Index !== -1) {
            const base64 = url.slice(base64Index + 7);
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
          } else {
            loadingTask = (pdfjsLib as any).getDocument({ url });
          }
        } else {
          try {
            const resp = await fetch(url);
            if (resp.ok) {
              const bytes = await resp.arrayBuffer();
              loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
            } else {
              loadingTask = (pdfjsLib as any).getDocument({ url });
            }
          } catch {
            loadingTask = (pdfjsLib as any).getDocument({ url });
          }
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
        onLoadSuccess?.(doc.numPages);
        logViewerEvent('DOC_FETCH_SUCCESS', { numPages: doc.numPages, submissionId });
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load PDF document:', err);
        setError('تعذر قراءة ملف PDF أو المستند غير صالح');
        setLoading(false);
        logViewerEvent('VIEWER_ERROR', { error: err?.message, submissionId });
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [url, submissionId, onLoadSuccess]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      onPageChange?.(next, totalPages);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      onPageChange?.(prev, totalPages);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 min-h-[500px]">
        <div className="w-12 h-12 border-4 border-[#023120] border-t-[#E6BE8A] rounded-full animate-spin mb-4"></div>
        <p className="text-base font-black text-slate-700 font-amiri">جاري قراءة وتجهيز الوثيقة الرسمية بدقة متناهية...</p>
        <p className="text-xs text-slate-400 mt-1 font-amiri">تطبيق معايير العرض عالي الدقة High-DPI</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-rose-50/50 rounded-2xl border border-rose-200 text-center m-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h4 className="text-lg font-black text-rose-800 font-amiri mb-1">خطأ في استعراض الوثيقة</h4>
        <p className="text-xs font-bold text-rose-600 font-amiri">{error}</p>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {totalPages > 1 && (
        <div className="w-full max-w-[860px] flex items-center justify-between px-4 py-2 bg-slate-800 text-white rounded-t-lg mb-2 text-xs font-amiri">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'continuous' ? 'single' : 'continuous')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded font-bold transition-all"
            >
              {viewMode === 'continuous' ? 'عرض صفحة بصفحة' : 'عرض متتالي'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span>صفحة {currentPage} من {totalPages}</span>
            {viewMode === 'single' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full flex flex-col items-center">
        {viewMode === 'continuous' ? (
          Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <JudicialPdfPageItem
              key={pageNum}
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              targetWidth={targetWidth}
              isSingleMode={false}
              submissionId={submissionId}
            />
          ))
        ) : (
          <JudicialPdfPageItem
            key={currentPage}
            pdfDoc={pdfDoc}
            pageNumber={currentPage}
            targetWidth={targetWidth}
            isSingleMode={true}
            submissionId={submissionId}
          />
        )}
      </div>
    </div>
  );
};
