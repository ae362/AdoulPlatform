import { useState, useCallback } from 'react';

export const usePdfOverlayEditor = () => {
  const [pdfFormEditorOpen, setPdfFormEditorOpen] = useState(false);
  const [pdfTextTool, setPdfTextTool] = useState<'redact' | 'text'>('redact');
  const [pdfTextInput, setPdfTextInput] = useState('');
  const [pdfTextFontSize, setPdfTextFontSize] = useState(14);
  const [pdfTextFontFamily, setPdfTextFontFamily] = useState('Amiri, sans-serif');
  const [pdfTextColor, setPdfTextColor] = useState('#111827');
  const [pdfTextPageIndex, setPdfTextPageIndex] = useState(0);
  const [pdfEditsByPage, setPdfEditsByPage] = useState<
    Record<number, { rects: Array<{ x: number; y: number; w: number; h: number }>; texts: Array<{ x: number; y: number; text: string; size: number }> }>
  >({});
  const [pdfPageDimensions, setPdfPageDimensions] = useState<{ width: number; height: number } | null>(null);

  const openPdfFormEditor = useCallback(() => {
    setPdfFormEditorOpen(true);
  }, []);

  const closePdfFormEditor = useCallback(() => {
    setPdfFormEditorOpen(false);
    setPdfEditsByPage({});
    setPdfTextInput('');
  }, []);

  const onAddRect = useCallback((pageIdx: number, rect: { x: number; y: number; w: number; h: number }) => {
    setPdfEditsByPage((prev) => {
      const page = prev[pageIdx] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIdx]: {
          ...page,
          rects: [...page.rects, rect],
        },
      };
    });
  }, []);

  const onAddText = useCallback((pageIdx: number, textObj: { x: number; y: number; text: string; size: number }) => {
    setPdfEditsByPage((prev) => {
      const page = prev[pageIdx] || { rects: [], texts: [] };
      return {
        ...prev,
        [pageIdx]: {
          ...page,
          texts: [...page.texts, textObj],
        },
      };
    });
  }, []);

  const onClearEdits = useCallback((pageIdx?: number) => {
    if (typeof pageIdx === 'number') {
      setPdfEditsByPage((prev) => {
        const next = { ...prev };
        delete next[pageIdx];
        return next;
      });
    } else {
      setPdfEditsByPage({});
    }
  }, []);

  return {
    pdfFormEditorOpen,
    setPdfFormEditorOpen,
    pdfTextTool,
    setPdfTextTool,
    pdfTextInput,
    setPdfTextInput,
    pdfTextFontSize,
    setPdfTextFontSize,
    pdfTextFontFamily,
    setPdfTextFontFamily,
    pdfTextColor,
    setPdfTextColor,
    pdfTextPageIndex,
    setPdfTextPageIndex,
    pdfEditsByPage,
    setPdfEditsByPage,
    pdfPageDimensions,
    setPdfPageDimensions,
    openPdfFormEditor,
    closePdfFormEditor,
    onAddRect,
    onAddText,
    onClearEdits,
  };
};
