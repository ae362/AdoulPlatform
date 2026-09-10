import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Download, Upload } from 'lucide-react';
import { exportStampedPdf } from '../pdfExporter';
import { StampPlacementLayer } from '../stampPlacementLayer';
import { DEFAULT_ARABIC_STAMP_CONFIG, StampSvg, renderStampSvgString } from '../stampRenderer';
import type { PageViewportBox, StampPlacement } from '../types';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const DEFAULT_PLACEMENT: StampPlacement = {
  page: 1,
  xPct: 0.6,
  yPct: 0.12,
  widthPct: 0.24,
  heightPct: 0.24,
  rotation: 0,
};

export default function StampSystemDemoPage() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [pageBox, setPageBox] = useState<PageViewportBox>({ width: 820, height: 1160 });
  const [placement, setPlacement] = useState<StampPlacement>(DEFAULT_PLACEMENT);
  const [isRendering, setIsRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const stampSvg = useMemo(
    () => renderStampSvgString(DEFAULT_ARABIC_STAMP_CONFIG, { strategy: 'textPath', includeDistress: true }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const renderPage = async () => {
      if (!pdfBytes || !canvasRef.current || !hostRef.current) return;
      setIsRendering(true);
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes } as any);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPageCount(pdf.numPages || 1);
        const safePage = Math.max(1, Math.min(page, pdf.numPages || 1));
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;
        const hostWidth = Math.max(680, hostRef.current.clientWidth - 2);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = hostWidth / Math.max(1, baseViewport.width);
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.round(viewport.width * devicePixelRatio);
        canvas.height = Math.round(viewport.height * devicePixelRatio);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        await (pdfPage.render as any)({ canvasContext: context, viewport }).promise;
        setPageBox({ width: Math.round(viewport.width), height: Math.round(viewport.height) });
        setPlacement((prev) => ({ ...prev, page: safePage }));
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };
    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, page]);

  const handlePickPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPdfBytes(await file.arrayBuffer());
    setPage(1);
    setPlacement(DEFAULT_PLACEMENT);
  };

  const handleExport = async () => {
    if (!pdfBytes) return;
    const stampedBytes = await exportStampedPdf(pdfBytes, [{ placement, svgMarkup: stampSvg }]);
    const blob = new Blob([stampedBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stamped-demo.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">SVG Judicial Stamp Demo</h1>
          <p className="mt-2 text-sm text-slate-600">
            PDF.js preview + normalized placement + SVG-first stamp rendering + pdf-lib export.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
              <Upload className="h-4 w-4" />
              اختيار PDF
              <input type="file" accept="application/pdf" onChange={handlePickPdf} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleExport}
              disabled={!pdfBytes}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download className="h-4 w-4" />
              تصدير PDF مختوم
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              صفحة {page} / {pageCount}
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 disabled:text-slate-300"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={page >= pageCount}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 disabled:text-slate-300"
            >
              التالي
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">معاينة الطابع</h2>
            <StampSvg config={DEFAULT_ARABIC_STAMP_CONFIG} className="mx-auto w-[280px]" />
            <div className="rounded-2xl bg-slate-50 p-4 text-xs font-mono text-slate-700">
              <div>xPct: {placement.xPct.toFixed(4)}</div>
              <div>yPct: {placement.yPct.toFixed(4)}</div>
              <div>widthPct: {placement.widthPct.toFixed(4)}</div>
              <div>heightPct: {placement.heightPct.toFixed(4)}</div>
              <div>rotation: {placement.rotation.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div
              ref={hostRef}
              className="relative mx-auto overflow-hidden rounded-2xl border border-slate-300 bg-slate-100"
              style={{ width: pageBox.width, minHeight: pageBox.height }}
            >
              {!pdfBytes && (
                <div className="flex h-[900px] items-center justify-center text-sm font-black text-slate-500">
                  اختر ملف PDF لبدء التجربة.
                </div>
              )}
              {pdfBytes && (
                <>
                  <canvas ref={canvasRef} className="block bg-white" />
                  <StampPlacementLayer
                    page={page}
                    pageBox={pageBox}
                    placement={placement}
                    svgMarkup={stampSvg}
                    onChange={setPlacement}
                  />
                  {isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 text-sm font-black text-slate-700">
                      جاري تحميل الصفحة...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
