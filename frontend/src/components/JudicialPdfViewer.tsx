import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ChevronRight, ChevronLeft, AlertTriangle, ExternalLink } from 'lucide-react';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface JudicialPdfViewerProps {
  url: string;
  targetWidth?: number;
  className?: string;
  onPageChange?: (currentPage: number, totalPages: number) => void;
  onLoadSuccess?: (totalPages: number) => void;
}

interface PageRenderItemProps {
  pdfDoc: any;
  pageNumber: number;
  targetWidth: number;
  isSingleMode?: boolean;
}

const JudicialPdfPageItem: React.FC<PageRenderItemProps> = ({
  pdfDoc,
  pageNumber,
  targetWidth,
  isSingleMode = false,
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

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = targetWidth / Math.max(1, baseViewport.width);
        const viewport = page.getViewport({ scale });
        const ratio = Math.max(1, window.devicePixelRatio || 1);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const cssWidth = Math.round(viewport.width);
        const cssHeight = Math.round(viewport.height);
        setPageHeight(cssHeight);

        canvas.width = Math.round(viewport.width * ratio);
        canvas.height = Math.round(viewport.height * ratio);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setRendered(true);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error(`Error rendering PDF page ${pageNumber}:`, err);
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
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, targetWidth]);

  return (
    <div className="relative mx-auto bg-white shadow-2xl rounded-sm border border-slate-200/80 overflow-hidden mb-8 last:mb-0 transition-shadow">
      {!isSingleMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100/80 border-b border-slate-200 text-xs font-black text-slate-500 font-mono">
          <span>صفحة {pageNumber}</span>
          <span className="text-[10px] text-slate-400">وثيقة رسمية معتمدة</span>
        </div>
      )}

      <div
        className="relative bg-white flex items-center justify-center"
        style={{
          width: `${targetWidth}px`,
          minHeight: `${pageHeight}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          className={`block transition-opacity duration-300 ${rendered ? 'opacity-100' : 'opacity-0'}`}
        />

        {!rendered && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-3 border-[#023120] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-slate-400">جاري معالجة الصفحة {pageNumber}...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-rose-50/70">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-sm font-black text-rose-700">{error}</p>
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
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF Document
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

      try {
        let loadingTask: any;

        if (url.startsWith('data:')) {
          // Parse base64 data URI
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
          // Try fetching as arrayBuffer for highest reliability across CORS/proxy
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
        const count = doc.numPages || 1;
        setTotalPages(count);
        setLoading(false);

        if (onLoadSuccess) {
          onLoadSuccess(count);
        }
        if (onPageChange) {
          onPageChange(1, count);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF in JudicialPdfViewer:', err);
          setError(err?.message || 'تعذر تحميل ملف الرسم القضائي');
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const handlePageSelect = (page: number) => {
    const safePage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(safePage);
    if (onPageChange) {
      onPageChange(safePage, totalPages);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white/90 rounded-2xl shadow-xl min-h-[600px] w-full">
        <div className="w-14 h-14 border-4 border-[#023120] border-t-[#E6BE8A] rounded-full animate-spin mb-6"></div>
        <h4 className="text-xl font-black font-amiri text-slate-800 mb-2">جاري فك تشفير وتجهيز الرسم القضائي...</h4>
        <p className="text-xs font-bold text-slate-400">معالجة المستند عبر العارض القضائي عالي الدقة</p>
      </div>
    );
  }

  if (error || !pdfDoc) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl shadow-2xl min-h-[500px] text-center max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-6 border border-rose-100">
          <AlertTriangle size={36} />
        </div>
        <h4 className="text-2xl font-black font-amiri text-slate-900 mb-3">تعذر عرض ملف PDF عبر العارض الداخلي</h4>
        <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
          قد يكون الملف محمياً أو غير متوافق مع العارض المباشر. يمكنك فتحه مباشرة في نافذة مستقلة للمراجعة.
        </p>
        <button
          type="button"
          onClick={() => window.open(url, '_blank')}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#023120] text-[#E6BE8A] font-black text-sm hover:brightness-125 transition-all shadow-xl shadow-[#023120]/20"
        >
          <ExternalLink size={18} />
          <span>فتح المستند في نافذة خارجية مستقلة</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Top Document Bar: Page info & display mode switch */}
      {totalPages > 1 && (
        <div className="sticky top-2 z-40 mb-6 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full border border-white/10 shadow-xl text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <span>الصفحة</span>
            <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[#E6BE8A]">
              {currentPage}
            </span>
            <span>من</span>
            <span className="px-2 py-0.5 rounded bg-white/10 font-mono">
              {totalPages}
            </span>
          </div>

          <div className="w-px h-5 bg-white/20 mx-1"></div>

          {/* Mode Switch: Continuous scroll vs Single Page */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('continuous')}
              className={`px-3 py-1 rounded-full transition-all font-bold ${
                viewMode === 'continuous' ? 'bg-[#023120] text-[#E6BE8A] shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              عرض متتابع ({totalPages})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-full transition-all font-bold ${
                viewMode === 'single' ? 'bg-[#023120] text-[#E6BE8A] shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              صفحة بصفحة
            </button>
          </div>

          {viewMode === 'single' && (
            <>
              <div className="w-px h-5 bg-white/20 mx-1"></div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageSelect(currentPage - 1)}
                  className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="الصفحة السابقة"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageSelect(currentPage + 1)}
                  className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="الصفحة التالية"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pages Container */}
      <div className="w-full flex flex-col items-center">
        {viewMode === 'continuous' ? (
          Array.from({ length: totalPages }, (_, i) => (
            <JudicialPdfPageItem
              key={`pdf-page-${i + 1}`}
              pdfDoc={pdfDoc}
              pageNumber={i + 1}
              targetWidth={targetWidth}
              isSingleMode={totalPages === 1}
            />
          ))
        ) : (
          <JudicialPdfPageItem
            key={`pdf-page-${currentPage}`}
            pdfDoc={pdfDoc}
            pageNumber={currentPage}
            targetWidth={targetWidth}
            isSingleMode={true}
          />
        )}
      </div>
    </div>
  );
};

export default JudicialPdfViewer;
