import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  X,
  Check,
  RotateCcw,
  Stamp,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Hand,
} from 'lucide-react';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface NormalizedPosition {
  x: number;      // 0.0 - 1.0 (from left)
  y: number;      // 0.0 - 1.0 (PDF space: 0.0 is bottom, 1.0 is top)
  width: number;  // 0.0 - 1.0 (ratio of page width)
  height: number; // 0.0 - 1.0 (ratio of page height)
  page?: number;  // 1-indexed page number
  xRatio?: number;
  yRatio?: number;
  wRatio?: number;
  hRatio?: number;
}

export interface StampPositionModalProps {
  open: boolean;
  pdfUrl: string;
  stampSvgMarkup?: string;
  initialSignaturePosition?: NormalizedPosition | null;
  initialStampPosition?: NormalizedPosition | null;
  onClose: () => void;
  onConfirm: (positions: {
    signaturePosition: NormalizedPosition;
    stampPosition: NormalizedPosition;
    page: number;
  }) => void;
  isSubmitting?: boolean;
}

type ActiveLayerMode = 'both' | 'signature' | 'stamp';
type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';

interface BoxState {
  x: number;      // pixels relative to current displayed canvas width
  y: number;      // pixels relative to current displayed canvas height (top-left origin)
  width: number;  // pixels
  height: number; // pixels
}

interface InteractionState {
  type: 'move' | 'resize';
  target: 'signature' | 'stamp';
  corner?: ResizeCorner;
  startX: number;
  startY: number;
  initialBox: BoxState;
}

// Base unzoomed reference canvas width for crisp vector rendering
const BASE_CANVAS_WIDTH = 680;

// Default Presets as normalized ratios (0.0 to 1.0, PDF bottom-left origin)
const DEFAULT_SIGNATURE_RATIOS = { x: 0.08, y: 0.14, width: 0.44, height: 0.14 };
const DEFAULT_STAMP_RATIOS = { x: 0.64, y: 0.12, width: 0.28, height: 0.20 };

// ============================================================================
// LAYER 1: STATIC PDF VECTOR CANVAS (Z-Index: 10)
// Completely decoupled from interactive overlay drags to prevent canvas blanking.
// ============================================================================
interface StaticPdfVectorLayerProps {
  pdfDoc: any;
  currentPage: number;
  zoomLevel: number;
  baseWidth: number;
  onDimensionsReady: (w: number, h: number) => void;
  onRenderStatusChange: (rendering: boolean, error: string | null) => void;
}

const StaticPdfVectorLayer = React.memo<StaticPdfVectorLayerProps>(
  ({ pdfDoc, currentPage, zoomLevel, baseWidth, onDimensionsReady, onRenderStatusChange }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
      let isCancelled = false;

      const render = async () => {
        if (!pdfDoc || !canvasRef.current) return;
        const canvas = canvasRef.current;

        // Cancel previous render task if active
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        try {
          onRenderStatusChange(true, null);
          const page = await pdfDoc.getPage(currentPage);
          if (isCancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const targetDisplayWidth = baseWidth * zoomLevel;
          const scale = targetDisplayWidth / Math.max(1, baseViewport.width);
          const dpr = Math.max(1, window.devicePixelRatio || 1);

          const viewport = page.getViewport({ scale: scale * dpr });
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const displayW = Math.round(viewport.width / dpr);
          const displayH = Math.round(viewport.height / dpr);
          canvas.style.width = `${displayW}px`;
          canvas.style.height = `${displayH}px`;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
          });
          renderTaskRef.current = renderTask;

          await renderTask.promise;
          renderTaskRef.current = null;

          if (!isCancelled) {
            onDimensionsReady(displayW, displayH);
            onRenderStatusChange(false, null);
          }
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.warn('PDF Page rendering error:', err);
            if (!isCancelled) {
              onRenderStatusChange(false, err?.message || 'تعذر تصيير صفحة الرسم');
            }
          }
        }
      };

      void render();

      return () => {
        isCancelled = true;
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }
      };
    }, [pdfDoc, currentPage, zoomLevel, baseWidth, onDimensionsReady, onRenderStatusChange]);

    return (
      <div className="relative z-10 select-none bg-white">
        <canvas ref={canvasRef} className="block bg-white" />
      </div>
    );
  }
);

// ============================================================================
// STAMP POSITION MODAL (Container + Controls Ribbon + Interactive Layer 2)
// ============================================================================
export const StampPositionModal: React.FC<StampPositionModalProps> = ({
  open,
  pdfUrl,
  stampSvgMarkup,
  initialSignaturePosition,
  initialStampPosition,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Active layer mode: both, signature only, or stamp only
  const [activeLayerMode, setActiveLayerMode] = useState<ActiveLayerMode>('both');

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanningActive, setIsPanningActive] = useState<boolean>(false);

  // Canvas display dimensions
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: BASE_CANVAS_WIDTH,
    height: Math.round(BASE_CANVAS_WIDTH * 1.414),
  });

  // Pixel boxes relative to the displayed canvas (x, y, width, height)
  const [signatureBox, setSignatureBox] = useState<BoxState>({
    x: Math.round(DEFAULT_SIGNATURE_RATIOS.x * BASE_CANVAS_WIDTH),
    y: Math.round((1 - DEFAULT_SIGNATURE_RATIOS.y - DEFAULT_SIGNATURE_RATIOS.height) * Math.round(BASE_CANVAS_WIDTH * 1.414)),
    width: Math.round(DEFAULT_SIGNATURE_RATIOS.width * BASE_CANVAS_WIDTH),
    height: Math.round(DEFAULT_SIGNATURE_RATIOS.height * Math.round(BASE_CANVAS_WIDTH * 1.414)),
  });

  const [stampBox, setStampBox] = useState<BoxState>({
    x: Math.round(DEFAULT_STAMP_RATIOS.x * BASE_CANVAS_WIDTH),
    y: Math.round((1 - DEFAULT_STAMP_RATIOS.y - DEFAULT_STAMP_RATIOS.height) * Math.round(BASE_CANVAS_WIDTH * 1.414)),
    width: Math.round(DEFAULT_STAMP_RATIOS.width * BASE_CANVAS_WIDTH),
    height: Math.round(DEFAULT_STAMP_RATIOS.height * Math.round(BASE_CANVAS_WIDTH * 1.414)),
  });

  // Active interaction state for dragging or 4-corner resizing
  const [activeInteraction, setActiveInteraction] = useState<InteractionState | null>(null);
  const activeInteractionRef = useRef<InteractionState | null>(null);
  activeInteractionRef.current = activeInteraction;

  // Refs
  const stageRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; scrollLeft: number; scrollTop: number }>({
    mouseX: 0,
    mouseY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Convert Normalized Position (PDF bottom-left origin) to Screen Box State at given canvas dimensions
  const computeBoxFromNorm = useCallback(
    (
      norm: NormalizedPosition | null | undefined,
      fallbackRatios: typeof DEFAULT_SIGNATURE_RATIOS,
      currentCanvasW: number,
      currentCanvasH: number
    ): BoxState => {
      const normX = typeof norm?.x === 'number' ? norm.x : (typeof norm?.xRatio === 'number' ? norm.xRatio : fallbackRatios.x);
      const normY = typeof norm?.y === 'number' ? norm.y : (typeof norm?.yRatio === 'number' ? norm.yRatio : fallbackRatios.y);
      const normW = typeof norm?.width === 'number' ? norm.width : (typeof norm?.wRatio === 'number' ? norm.wRatio : fallbackRatios.width);
      const normH = typeof norm?.height === 'number' ? norm.height : (typeof norm?.hRatio === 'number' ? norm.hRatio : fallbackRatios.height);

      const w = Math.max(60, normW * currentCanvasW);
      const h = Math.max(40, normH * currentCanvasH);
      const x = Math.max(0, Math.min(currentCanvasW - w, normX * currentCanvasW));
      // Invert Y axis: screenTop = 1.0 - (normY + normH)
      const top = Math.max(0, Math.min(currentCanvasH - h, (1.0 - normY - normH) * currentCanvasH));

      return {
        x: Math.round(x),
        y: Math.round(top),
        width: Math.round(w),
        height: Math.round(h),
      };
    },
    []
  );

  // Callback when StaticPdfVectorLayer completes rendering and measures dimensions
  const handleDimensionsReady = useCallback(
    (w: number, h: number) => {
      setCanvasDimensions({ width: w, height: h });
    },
    []
  );

  const handleRenderStatusChange = useCallback(
    (rendering: boolean, error: string | null) => {
      setIsRenderingPage(rendering);
      if (error) setPdfError(error);
    },
    []
  );

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 1. Load PDF document
  useEffect(() => {
    if (!open || !pdfUrl) {
      setPdfDoc(null);
      setPageCount(0);
      return;
    }

    let cancelled = false;
    setIsLoadingPdf(true);
    setPdfError(null);
    setZoomLevel(1.0);
    setIsPanMode(false);

    const loadPdf = async () => {
      try {
        const resp = await fetch(pdfUrl, { cache: 'no-store', credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`تعذر تحميل الوثيقة (${resp.status})`);
        const bytes = await resp.arrayBuffer();
        if (cancelled) return;
        const loadedDoc = await (pdfjsLib as any).getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPdfDoc(loadedDoc);
        const count = Math.max(1, loadedDoc.numPages || 1);
        setPageCount(count);
        setCurrentPage(count); // Default to final page

        // Determine base height from page aspect ratio
        try {
          const page = await loadedDoc.getPage(count);
          const vp = page.getViewport({ scale: 1 });
          const calculatedBaseH = Math.round(BASE_CANVAS_WIDTH * (vp.height / vp.width));
          setCanvasDimensions({ width: BASE_CANVAS_WIDTH, height: calculatedBaseH });

          // Initialize boxes
          setSignatureBox(computeBoxFromNorm(initialSignaturePosition, DEFAULT_SIGNATURE_RATIOS, BASE_CANVAS_WIDTH, calculatedBaseH));
          setStampBox(computeBoxFromNorm(initialStampPosition, DEFAULT_STAMP_RATIOS, BASE_CANVAS_WIDTH, calculatedBaseH));
        } catch {
          const fallbackH = Math.round(BASE_CANVAS_WIDTH * 1.414);
          setCanvasDimensions({ width: BASE_CANVAS_WIDTH, height: fallbackH });
          setSignatureBox(computeBoxFromNorm(initialSignaturePosition, DEFAULT_SIGNATURE_RATIOS, BASE_CANVAS_WIDTH, fallbackH));
          setStampBox(computeBoxFromNorm(initialStampPosition, DEFAULT_STAMP_RATIOS, BASE_CANVAS_WIDTH, fallbackH));
        }
      } catch (err: any) {
        if (!cancelled) setPdfError(err?.message || 'تعذر تحميل صفحات الرسم.');
      } finally {
        if (!cancelled) setIsLoadingPdf(false);
      }
    };

    void loadPdf();
    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl, initialSignaturePosition, initialStampPosition, computeBoxFromNorm]);

  // 2. Zoom Handler with proportional box scaling
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Number(Math.max(0.75, Math.min(3.0, newZoom)).toFixed(2));
    if (clampedZoom === zoomLevel) return;

    const factor = clampedZoom / zoomLevel;
    setSignatureBox((prev) => ({
      x: Math.round(prev.x * factor),
      y: Math.round(prev.y * factor),
      width: Math.max(50, Math.round(prev.width * factor)),
      height: Math.max(35, Math.round(prev.height * factor)),
    }));
    setStampBox((prev) => ({
      x: Math.round(prev.x * factor),
      y: Math.round(prev.y * factor),
      width: Math.max(50, Math.round(prev.width * factor)),
      height: Math.max(35, Math.round(prev.height * factor)),
    }));
    setZoomLevel(clampedZoom);
  };

  // 3. Pointer Interaction (Move & 4-Corner Resize) Handlers on Layer 2
  const handleStartInteraction = (
    e: React.MouseEvent | React.TouchEvent,
    target: 'signature' | 'stamp',
    type: 'move' | 'resize',
    corner?: ResizeCorner
  ) => {
    if (isPanMode || isSpacePressed) return;
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentBox = target === 'signature' ? signatureBox : stampBox;
    const interaction: InteractionState = {
      type,
      target,
      corner,
      startX: clientX,
      startY: clientY,
      initialBox: { ...currentBox },
    };
    setActiveInteraction(interaction);
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      // Pan dragging in viewport stage
      if (isPanningRef.current && stageRef.current) {
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const dx = clientX - panStartRef.current.mouseX;
        const dy = clientY - panStartRef.current.mouseY;
        stageRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        stageRef.current.scrollTop = panStartRef.current.scrollTop - dy;
        return;
      }

      // Box move or 4-corner resize
      if (!activeInteractionRef.current) return;
      const interaction = activeInteractionRef.current;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - interaction.startX;
      const deltaY = clientY - interaction.startY;
      const init = interaction.initialBox;

      const currentCanvasWidth = canvasDimensions.width;
      const currentCanvasHeight = canvasDimensions.height;

      const minW = Math.max(50, Math.round(60 * zoomLevel));
      const minH = Math.max(35, Math.round(40 * zoomLevel));

      const updateBox = interaction.target === 'signature' ? setSignatureBox : setStampBox;

      if (interaction.type === 'move') {
        const newX = Math.max(0, Math.min(currentCanvasWidth - init.width, init.x + deltaX));
        const newY = Math.max(0, Math.min(currentCanvasHeight - init.height, init.y + deltaY));
        updateBox({
          ...init,
          x: Math.round(newX),
          y: Math.round(newY),
        });
      } else if (interaction.type === 'resize' && interaction.corner) {
        let { x, y, width, height } = init;

        switch (interaction.corner) {
          case 'br': {
            // Bottom-Right handle
            const rawW = init.width + deltaX;
            const rawH = init.height + deltaY;
            width = Math.max(minW, Math.min(currentCanvasWidth - init.x, rawW));
            height = Math.max(minH, Math.min(currentCanvasHeight - init.y, rawH));
            break;
          }
          case 'bl': {
            // Bottom-Left handle
            const rawW = init.width - deltaX;
            const rawH = init.height + deltaY;
            if (rawW < minW) {
              width = minW;
              x = init.x + init.width - minW;
            } else {
              x = Math.max(0, init.x + deltaX);
              width = init.x + init.width - x;
            }
            height = Math.max(minH, Math.min(currentCanvasHeight - init.y, rawH));
            break;
          }
          case 'tr': {
            // Top-Right handle
            const rawW = init.width + deltaX;
            const rawH = init.height - deltaY;
            width = Math.max(minW, Math.min(currentCanvasWidth - init.x, rawW));
            if (rawH < minH) {
              height = minH;
              y = init.y + init.height - minH;
            } else {
              y = Math.max(0, init.y + deltaY);
              height = init.y + init.height - y;
            }
            break;
          }
          case 'tl': {
            // Top-Left handle
            const rawW = init.width - deltaX;
            const rawH = init.height - deltaY;
            if (rawW < minW) {
              width = minW;
              x = init.x + init.width - minW;
            } else {
              x = Math.max(0, init.x + deltaX);
              width = init.x + init.width - x;
            }
            if (rawH < minH) {
              height = minH;
              y = init.y + init.height - minH;
            } else {
              y = Math.max(0, init.y + deltaY);
              height = init.y + init.height - y;
            }
            break;
          }
        }

        updateBox({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        });
      }
    };

    const handlePointerUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanningActive(false);
      }
      if (activeInteractionRef.current) {
        setActiveInteraction(null);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [canvasDimensions, zoomLevel]);

  // Stage Mouse Down for Viewport Panning
  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (isPanMode || isSpacePressed) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanningActive(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        scrollLeft: stageRef.current?.scrollLeft || 0,
        scrollTop: stageRef.current?.scrollTop || 0,
      };
    }
  };

  // 4. Snap Presets
  const applyPreset = (preset: 'bottom-right' | 'bottom-center' | 'top-left' | 'reset') => {
    const currentW = canvasDimensions.width;
    const currentH = canvasDimensions.height;

    if (preset === 'bottom-right') {
      setSignatureBox(computeBoxFromNorm({ x: 0.12, y: 0.10, width: 0.44, height: 0.14 }, DEFAULT_SIGNATURE_RATIOS, currentW, currentH));
      setStampBox(computeBoxFromNorm({ x: 0.65, y: 0.10, width: 0.26, height: 0.20 }, DEFAULT_STAMP_RATIOS, currentW, currentH));
    } else if (preset === 'bottom-center') {
      setSignatureBox(computeBoxFromNorm({ x: 0.25, y: 0.22, width: 0.50, height: 0.14 }, DEFAULT_SIGNATURE_RATIOS, currentW, currentH));
      setStampBox(computeBoxFromNorm({ x: 0.36, y: 0.05, width: 0.28, height: 0.18 }, DEFAULT_STAMP_RATIOS, currentW, currentH));
    } else if (preset === 'top-left') {
      setSignatureBox(computeBoxFromNorm({ x: 0.05, y: 0.81, width: 0.44, height: 0.14 }, DEFAULT_SIGNATURE_RATIOS, currentW, currentH));
      setStampBox(computeBoxFromNorm({ x: 0.55, y: 0.75, width: 0.26, height: 0.20 }, DEFAULT_STAMP_RATIOS, currentW, currentH));
    } else if (preset === 'reset') {
      setSignatureBox(computeBoxFromNorm(null, DEFAULT_SIGNATURE_RATIOS, currentW, currentH));
      setStampBox(computeBoxFromNorm(null, DEFAULT_STAMP_RATIOS, currentW, currentH));
    }
  };

  // 5. ZOOM-INVARIANT COORDINATE & SIZE NORMALIZATION
  const calculateNormalizedPayload = () => {
    const currentCanvasWidth = canvasDimensions.width;
    const currentCanvasHeight = canvasDimensions.height;

    const normalize = (box: BoxState) => {
      // Divide out current canvas display dimensions to keep coordinates invariant to zoom
      const xRatio = Math.max(0, Math.min(1.0, box.x / currentCanvasWidth));
      const wRatio = Math.max(0.01, Math.min(1.0, box.width / currentCanvasWidth));
      const hRatio = Math.max(0.01, Math.min(1.0, box.height / currentCanvasHeight));
      // Invert Y axis for standard PDF coordinate system (origin at bottom-left)
      const yRatio = Math.max(0, Math.min(1.0, 1.0 - (box.y + box.height) / currentCanvasHeight));

      return {
        x: Number(xRatio.toFixed(4)),
        y: Number(yRatio.toFixed(4)),
        width: Number(wRatio.toFixed(4)),
        height: Number(hRatio.toFixed(4)),
        xRatio: Number(xRatio.toFixed(4)),
        yRatio: Number(yRatio.toFixed(4)),
        wRatio: Number(wRatio.toFixed(4)),
        hRatio: Number(hRatio.toFixed(4)),
        page: currentPage,
      };
    };

    return {
      signaturePosition: normalize(signatureBox),
      stampPosition: normalize(stampBox),
      page: currentPage,
    };
  };

  const handleConfirm = () => {
    const payload = calculateNormalizedPayload();
    onConfirm(payload);
  };

  if (!open) return null;

  const isPanActive = isPanMode || isSpacePressed;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div
        className="flex h-[95vh] w-full max-w-[1380px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl text-white"
        dir="rtl"
      >
        {/* Modal Header & Controls Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-8 py-3.5 z-30">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#1f3c88] text-blue-300 rounded-2xl border border-blue-400/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                تحديد موضع خطاب القاضي وخاتم المحكمة
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono">
                  DUAL-LAYER VECTOR CALIBRATION
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                اسحب مربعات التموضع أو كبّر الحجم من الزوايا الأربع لتحديد موضع التوقيع والخاتم بدقة متناهية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewport Zoom & Pan Toolbar */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => handleZoomChange(Math.min(3.0, Number((zoomLevel + 0.25).toFixed(2))))}
                className="p-1 hover:bg-slate-700 rounded text-slate-200 transition-colors"
                title="تكبير (+25%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-black text-amber-400 min-w-[42px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoomChange(Math.max(0.75, Number((zoomLevel - 0.25).toFixed(2))))}
                className="p-1 hover:bg-slate-700 rounded text-slate-200 transition-colors"
                title="تصغير (-25%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoomChange(1.0)}
                className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-300 font-bold transition-colors ml-1"
                title="إعادة ضبط مقياس العرض إلى 100%"
              >
                إعادة ضبط
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setIsPanMode((p) => !p)}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                  isPanMode
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
                title="وضع التحريك باليد (أو اضغط زر المسافة Spacebar للسحب)"
              >
                <Hand className="w-4 h-4" />
                <span className="text-[10px] font-bold hidden sm:inline">تحريك</span>
              </button>
            </div>

            {/* Page Switcher */}
            {pageCount > 1 && (
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-300 min-w-[65px] text-center">
                  {currentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Switch Pills + Snap Presets */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-slate-900 px-8 py-2.5 z-20 text-xs">
          {/* Switch Pills */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> عرض الطبقات:
            </span>
            <div className="flex rounded-xl bg-slate-950 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveLayerMode('both')}
                className={`px-3 py-1 rounded-lg font-black transition-all ${
                  activeLayerMode === 'both'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                كلا العنصرين
              </button>
              <button
                type="button"
                onClick={() => setActiveLayerMode('signature')}
                className={`px-3 py-1 rounded-lg font-black transition-all ${
                  activeLayerMode === 'signature'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                التوقيع فقط
              </button>
              <button
                type="button"
                onClick={() => setActiveLayerMode('stamp')}
                className={`px-3 py-1 rounded-lg font-black transition-all ${
                  activeLayerMode === 'stamp'
                    ? 'bg-red-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الخاتم فقط
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold text-[11px]">مواضع نموذجية:</span>
            <button
              type="button"
              onClick={() => applyPreset('bottom-right')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 font-bold text-[11px] transition-colors"
            >
              أسفل اليمين
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bottom-center')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 font-bold text-[11px] transition-colors"
            >
              أسفل الوسط
            </button>
            <button
              type="button"
              onClick={() => applyPreset('top-left')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 font-bold text-[11px] transition-colors"
            >
              أعلى اليسار
            </button>
            <button
              type="button"
              onClick={() => applyPreset('reset')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 font-bold text-[11px] flex items-center gap-1 transition-colors"
              title="إعادة ضبط المواضع الافتراضية"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة الضبط</span>
            </button>
          </div>
        </div>

        {/* Central Viewport Stage */}
        <div
          ref={stageRef}
          onMouseDown={handleStageMouseDown}
          className={`flex-1 overflow-auto p-8 flex justify-center items-start custom-scrollbar bg-slate-950 relative select-none ${
            isPanActive
              ? isPanningActive
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-default'
          }`}
        >
          {isLoadingPdf ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm font-black">جاري تحميل صفحة الوثيقة بدقة المتجهات...</p>
            </div>
          ) : pdfError ? (
            <div className="p-8 text-center rounded-2xl bg-red-950/40 border border-red-800 text-red-300 max-w-md my-auto">
              <p className="font-black text-sm">{pdfError}</p>
            </div>
          ) : (
            <div
              className="relative mx-auto bg-white rounded-sm shadow-2xl border border-slate-700 transition-shadow"
              style={{
                width: `${canvasDimensions.width}px`,
                height: `${canvasDimensions.height}px`,
              }}
            >
              {/* LAYER 1: STATIC PDF VECTOR CANVAS (Z-Index: 10) */}
              <StaticPdfVectorLayer
                pdfDoc={pdfDoc}
                currentPage={currentPage}
                zoomLevel={zoomLevel}
                baseWidth={BASE_CANVAS_WIDTH}
                onDimensionsReady={handleDimensionsReady}
                onRenderStatusChange={handleRenderStatusChange}
              />

              {/* LAYER 2: TRANSPARENT INTERACTIVE BOUNDING OVERLAY (Z-Index: 20) */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {/* TARGET A: Judge's Signature / Calligraphy Box */}
                {(activeLayerMode === 'both' || activeLayerMode === 'signature') && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${signatureBox.x}px`,
                      top: `${signatureBox.y}px`,
                      width: `${signatureBox.width}px`,
                      height: `${signatureBox.height}px`,
                      cursor: isPanActive ? 'inherit' : 'move',
                      zIndex: 25,
                      pointerEvents: isPanActive ? 'none' : 'auto',
                    }}
                    onMouseDown={(e) => handleStartInteraction(e, 'signature', 'move')}
                    onTouchStart={(e) => handleStartInteraction(e, 'signature', 'move')}
                    className="group rounded-xl border-2 border-dashed border-amber-500 bg-amber-500/15 backdrop-blur-[1px] p-2 flex flex-col justify-between shadow-xl transition-shadow hover:border-amber-400 hover:shadow-amber-500/20"
                  >
                    {/* Dimensions Tooltip during drag/resize or hover */}
                    <div
                      className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950/95 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-md shadow-lg border border-amber-500/40 whitespace-nowrap pointer-events-none transition-opacity duration-150 z-30 ${
                        activeInteraction?.target === 'signature'
                          ? 'opacity-100 scale-105'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {Math.round(signatureBox.width / zoomLevel)}px × {Math.round(signatureBox.height / zoomLevel)}px
                    </div>

                    {/* Badge Header */}
                    <div className="flex items-center justify-between gap-1 pointer-events-none">
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-400/95 px-2 py-0.5 rounded shadow">
                        <PenTool className="w-3 h-3" /> موضع الخطاب والتوقيع
                      </span>
                      <span className="text-[9px] font-mono font-bold text-amber-800 bg-white/90 px-1 rounded">
                        {Math.round((signatureBox.x / canvasDimensions.width) * 100)}%,{' '}
                        {Math.round((signatureBox.y / canvasDimensions.height) * 100)}%
                      </span>
                    </div>

                    {/* Calligraphy Preview Text */}
                    <div
                      className="text-center font-['Amiri',_serif] font-black text-[#1f3c88] select-none pointer-events-none leading-snug my-auto"
                      style={{ fontSize: `${Math.max(12, Math.round(15 * zoomLevel))}px` }}
                    >
                      الحمد لله أعلم بأدائها ومراقبتها
                    </div>

                    {/* 4-CORNER DRAG-TO-RESIZE HANDLES */}
                    {/* Top-Left */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'signature', 'resize', 'tl')}
                      onTouchStart={(e) => handleStartInteraction(e, 'signature', 'resize', 'tl')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Top-Right */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'signature', 'resize', 'tr')}
                      onTouchStart={(e) => handleStartInteraction(e, 'signature', 'resize', 'tr')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Bottom-Left */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'signature', 'resize', 'bl')}
                      onTouchStart={(e) => handleStartInteraction(e, 'signature', 'resize', 'bl')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Bottom-Right */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'signature', 'resize', 'br')}
                      onTouchStart={(e) => handleStartInteraction(e, 'signature', 'resize', 'br')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                  </div>
                )}

                {/* TARGET B: Official Court Seal Box */}
                {(activeLayerMode === 'both' || activeLayerMode === 'stamp') && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${stampBox.x}px`,
                      top: `${stampBox.y}px`,
                      width: `${stampBox.width}px`,
                      height: `${stampBox.height}px`,
                      cursor: isPanActive ? 'inherit' : 'move',
                      zIndex: 26,
                      pointerEvents: isPanActive ? 'none' : 'auto',
                    }}
                    onMouseDown={(e) => handleStartInteraction(e, 'stamp', 'move')}
                    onTouchStart={(e) => handleStartInteraction(e, 'stamp', 'move')}
                    className="group rounded-2xl border-2 border-solid border-red-600 bg-red-600/15 backdrop-blur-[1px] p-2 flex flex-col justify-between shadow-xl transition-shadow hover:border-red-500 hover:shadow-red-600/20"
                  >
                    {/* Dimensions Tooltip during drag/resize or hover */}
                    <div
                      className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950/95 text-red-300 text-[10px] font-mono px-2 py-0.5 rounded-md shadow-lg border border-red-600/40 whitespace-nowrap pointer-events-none transition-opacity duration-150 z-30 ${
                        activeInteraction?.target === 'stamp'
                          ? 'opacity-100 scale-105'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {Math.round(stampBox.width / zoomLevel)}px × {Math.round(stampBox.height / zoomLevel)}px
                    </div>

                    {/* Badge Header */}
                    <div className="flex items-center justify-between gap-1 pointer-events-none">
                      <span className="flex items-center gap-1 text-[10px] font-black text-white bg-red-700 px-2 py-0.5 rounded shadow">
                        <Stamp className="w-3 h-3" /> موضع خاتم المحكمة
                      </span>
                      <span className="text-[9px] font-mono font-bold text-red-800 bg-white/90 px-1 rounded">
                        {Math.round((stampBox.x / canvasDimensions.width) * 100)}%,{' '}
                        {Math.round((stampBox.y / canvasDimensions.height) * 100)}%
                      </span>
                    </div>

                    {/* SVG or Stamp Icon Preview */}
                    <div className="flex items-center justify-center select-none pointer-events-none overflow-hidden my-auto max-h-[80%]">
                      {stampSvgMarkup ? (
                        <div
                          className="w-16 h-16 [&_svg]:block [&_svg]:h-full [&_svg]:w-full opacity-80"
                          style={{
                            transform: `scale(${Math.max(0.8, Math.min(2.0, zoomLevel))})`,
                          }}
                          dangerouslySetInnerHTML={{ __html: stampSvgMarkup }}
                        />
                      ) : (
                        <div
                          className="rounded-full border-2 border-red-600/40 flex items-center justify-center"
                          style={{
                            width: `${Math.round(64 * Math.min(1.5, zoomLevel))}px`,
                            height: `${Math.round(64 * Math.min(1.5, zoomLevel))}px`,
                          }}
                        >
                          <Stamp className="w-8 h-8 text-red-600 opacity-60" />
                        </div>
                      )}
                    </div>

                    {/* 4-CORNER DRAG-TO-RESIZE HANDLES */}
                    {/* Top-Left */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'stamp', 'resize', 'tl')}
                      onTouchStart={(e) => handleStartInteraction(e, 'stamp', 'resize', 'tl')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Top-Right */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'stamp', 'resize', 'tr')}
                      onTouchStart={(e) => handleStartInteraction(e, 'stamp', 'resize', 'tr')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Bottom-Left */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'stamp', 'resize', 'bl')}
                      onTouchStart={(e) => handleStartInteraction(e, 'stamp', 'resize', 'bl')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                    {/* Bottom-Right */}
                    <div
                      onMouseDown={(e) => handleStartInteraction(e, 'stamp', 'resize', 'br')}
                      onTouchStart={(e) => handleStartInteraction(e, 'stamp', 'resize', 'br')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform z-30 shadow-md"
                      title="تغيير الحجم"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Confirm Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/95 px-8 py-3.5 z-30">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <span>* الإحداثيات والمقاسات تُعاير بنسب لا تتأثر بمستوى التكبير (Zoom-Invariant 1:1 PDF Points).</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || isLoadingPdf || !pdfDoc || isRenderingPage}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-black text-sm shadow-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري تطبيق المواضع والتوليد...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>تأكيد الموضع وإصدار الخطاب</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
