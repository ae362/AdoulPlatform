import { PDFDocument, degrees } from 'pdf-lib';
import type { StampPlacement } from '../types';

type ExportStampInput = {
  placement: StampPlacement;
  svgMarkup: string;
};

async function svgMarkupToPngBytes(svgMarkup: string, size: number) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable for PDF export');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Failed to rasterize stamp SVG'));
          return;
        }
        resolve(nextBlob);
      }, 'image/png');
    });
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportStampedPdf(
  originalPdf: ArrayBuffer | Uint8Array,
  stamps: ExportStampInput[]
) {
  const pdfDoc = await PDFDocument.load(originalPdf);
  const pngCache = new Map<string, Uint8Array>();

  for (const stamp of stamps) {
    const pageIndex = Math.max(0, stamp.placement.page - 1);
    const page = pdfDoc.getPages()[pageIndex];
    if (!page) continue;

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const x = stamp.placement.xPct * pageWidth;
    const width = stamp.placement.widthPct * pageWidth;
    const height = stamp.placement.heightPct * pageHeight;
    const y = pageHeight - stamp.placement.yPct * pageHeight - height;

    let pngBytes = pngCache.get(stamp.svgMarkup);
    if (!pngBytes) {
      pngBytes = await svgMarkupToPngBytes(stamp.svgMarkup, 1200);
      pngCache.set(stamp.svgMarkup, pngBytes);
    }
    const image = await pdfDoc.embedPng(pngBytes);
    page.drawImage(image, {
      x,
      y,
      width,
      height,
      rotate: degrees(stamp.placement.rotation),
    });
  }

  return pdfDoc.save();
}
