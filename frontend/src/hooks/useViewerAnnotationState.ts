import { useState, useCallback, useRef } from 'react';
import { logViewerEvent } from '../utils/documentTelemetry';

export type AnnotationToolType = 'select' | 'pen' | 'highlighter' | 'eraser';

export interface AnnotationPoint {
  x: number; // 0.0 to 1.0 (relative canvas width)
  y: number; // 0.0 to 1.0 (relative canvas height)
}

export interface AnnotationStroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  pageNumber: number;
  points: AnnotationPoint[];
  timestamp?: number;
}

export interface UseViewerAnnotationStateOptions {
  initialTool?: AnnotationToolType;
  initialColor?: string;
  initialWidth?: number;
  initialAnnotations?: AnnotationStroke[];
  submissionId?: string;
  onSave?: (annotations: AnnotationStroke[]) => void;
}

export interface UseViewerAnnotationStateResult {
  activeTool: AnnotationToolType;
  strokeColor: string;
  strokeWidth: number;
  annotations: AnnotationStroke[];
  canUndo: boolean;
  canRedo: boolean;
  setTool: (tool: AnnotationToolType) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  addStroke: (stroke: Omit<AnnotationStroke, 'id'> | AnnotationStroke) => AnnotationStroke;
  removeStrokeById: (id: string) => void;
  clearPageAnnotations: (pageNumber: number) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  getNormalizedPoint: (clientX: number, clientY: number, rect: DOMRect) => AnnotationPoint;
  getAbsolutePoint: (point: AnnotationPoint, canvasWidth: number, canvasHeight: number) => { x: number; y: number };
}

export const DEFAULT_TOOL_COLORS: Record<AnnotationToolType, string> = {
  select: 'transparent',
  pen: '#dc2626', // Red
  highlighter: 'rgba(234, 179, 8, 0.4)', // Amber highlighter
  eraser: '#ffffff',
};

export const DEFAULT_TOOL_WIDTHS: Record<AnnotationToolType, number> = {
  select: 0,
  pen: 2.5,
  highlighter: 18,
  eraser: 20,
};

/**
 * Isolated, scale-aware annotation state management hook for Judicial Document Viewer.
 * Coordinates are stored as scale-invariant relative ratios (0.0 - 1.0) so annotations
 * maintain pixel-perfect alignment across arbitrary zoom levels and window resizes.
 */
export function useViewerAnnotationState(
  options: UseViewerAnnotationStateOptions = {}
): UseViewerAnnotationStateResult {
  const {
    initialTool = 'select',
    initialColor,
    initialWidth,
    initialAnnotations = [],
    submissionId,
    onSave,
  } = options;

  const [activeTool, setActiveToolState] = useState<AnnotationToolType>(initialTool);
  const [strokeColor, setStrokeColor] = useState<string>(
    initialColor || DEFAULT_TOOL_COLORS[initialTool] || '#dc2626'
  );
  const [strokeWidth, setStrokeWidth] = useState<number>(
    initialWidth || DEFAULT_TOOL_WIDTHS[initialTool] || 2.5
  );

  // Undo / Redo History Stack
  const [history, setHistory] = useState<AnnotationStroke[][]>([initialAnnotations]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentAnnotations = history[historyIndex] || [];
  const annotationsRef = useRef<AnnotationStroke[]>(currentAnnotations);
  annotationsRef.current = currentAnnotations;

  const pushState = useCallback(
    (nextAnnotations: AnnotationStroke[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, nextAnnotations];
      });
      setHistoryIndex((prev) => prev + 1);

      logViewerEvent('ANNOTATION_SAVE', {
        strokeCount: nextAnnotations.length,
        submissionId,
      });

      if (onSave) {
        onSave(nextAnnotations);
      }
    },
    [historyIndex, submissionId, onSave]
  );

  const setTool = useCallback((tool: AnnotationToolType) => {
    setActiveToolState(tool);
    if (tool === 'highlighter') {
      setStrokeColor(DEFAULT_TOOL_COLORS.highlighter);
      setStrokeWidth(DEFAULT_TOOL_WIDTHS.highlighter);
    } else if (tool === 'pen') {
      setStrokeColor(DEFAULT_TOOL_COLORS.pen);
      setStrokeWidth(DEFAULT_TOOL_WIDTHS.pen);
    } else if (tool === 'eraser') {
      setStrokeWidth(DEFAULT_TOOL_WIDTHS.eraser);
    }
  }, []);

  const setColor = useCallback((color: string) => {
    setStrokeColor(color);
  }, []);

  const setWidth = useCallback((width: number) => {
    setStrokeWidth(width);
  }, []);

  const addStroke = useCallback(
    (strokeData: Omit<AnnotationStroke, 'id'> | AnnotationStroke): AnnotationStroke => {
      const id = 'id' in strokeData && strokeData.id ? strokeData.id : `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const completeStroke: AnnotationStroke = {
        ...strokeData,
        id,
        timestamp: Date.now(),
      };

      const next = [...annotationsRef.current, completeStroke];
      pushState(next);
      return completeStroke;
    },
    [pushState]
  );

  const removeStrokeById = useCallback(
    (id: string) => {
      const next = annotationsRef.current.filter((s) => s.id !== id);
      pushState(next);
    },
    [pushState]
  );

  const clearPageAnnotations = useCallback(
    (pageNumber: number) => {
      const next = annotationsRef.current.filter((s) => s.pageNumber !== pageNumber);
      pushState(next);
    },
    [pushState]
  );

  const clearAll = useCallback(() => {
    pushState([]);
  }, [pushState]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Coordinate Normalization Utilities
  const getNormalizedPoint = useCallback(
    (clientX: number, clientY: number, rect: DOMRect): AnnotationPoint => {
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const normalizedX = Math.max(0, Math.min(1, rawX / Math.max(1, rect.width)));
      const normalizedY = Math.max(0, Math.min(1, rawY / Math.max(1, rect.height)));
      return { x: normalizedX, y: normalizedY };
    },
    []
  );

  const getAbsolutePoint = useCallback(
    (point: AnnotationPoint, canvasWidth: number, canvasHeight: number): { x: number; y: number } => {
      return {
        x: point.x * canvasWidth,
        y: point.y * canvasHeight,
      };
    },
    []
  );

  return {
    activeTool,
    strokeColor,
    strokeWidth,
    annotations: currentAnnotations,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    setTool,
    setColor,
    setWidth,
    addStroke,
    removeStrokeById,
    clearPageAnnotations,
    clearAll,
    undo,
    redo,
    getNormalizedPoint,
    getAbsolutePoint,
  };
}
