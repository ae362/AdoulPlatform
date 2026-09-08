import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import Bidi from 'bidi-js';
import { ArabicShaper } from 'arabic-persian-reshaper';
import PizZip from 'pizzip';
import * as fs from 'fs/promises';
import * as path from 'path';

const bidi = new Bidi();
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export interface PaginationOptions {
  startPage?: number;
  fontSize?: number;
  topMargin?: number;
  rightMargin?: number;
  format?: (current: number, total: number) => string;
  clearHeaderArea?: boolean;
}

export function shapeArabicText(raw: string): string {
  const str = String(raw ?? '').trim();
  if (!str || !ARABIC_RE.test(str)) return str;
  try {
    const shaped = ArabicShaper.convertArabic(str);
    const levels = bidi.getEmbeddingLevels(shaped);
    return bidi.getReorderedString(shaped, levels);
  } catch {
    try {
      const levels = bidi.getEmbeddingLevels(str);
      return bidi.getReorderedString(str, levels);
    } catch {
      return str;
    }
  }
}

async function tryReadFileBytes(filePath: string): Promise<Uint8Array | null> {
  try {
    const buf = await fs.readFile(filePath);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function loadAmiriFontBytes(): Promise<Uint8Array | null> {
  const candidates = [
    path.resolve(process.cwd(), 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(process.cwd(), '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(process.cwd(), '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
    path.resolve(__dirname, '..', '..', '..', '..', 'frontend', 'src', 'assets', 'Amiri-Regular.ttf'),
  ];

  for (const p of candidates) {
    const bytes = await tryReadFileBytes(p);
    if (bytes) return bytes;
  }
  return null;
}

/**
 * Applies top-header pagination to a PDF document (e.g. "الصفحة X من Y").
 * Strictly renders at the top header margin (default y = height - 28pt).
 */
export async function applyTopHeaderPaginationToPdf(
  pdfBuffer: Buffer,
  options?: PaginationOptions
): Promise<{ buffer: Buffer; totalPages: number }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  if (!totalPages) {
    return { buffer: pdfBuffer, totalPages: 0 };
  }

  const amiriBytes = await loadAmiriFontBytes();
  if (!amiriBytes) {
    throw new Error('Amiri font could not be located to render Arabic top-header pagination.');
  }

  const amiriFont = await pdfDoc.embedFont(amiriBytes, { subset: true });

  const fontSize = options?.fontSize ?? 11;
  const topMargin = options?.topMargin ?? 30;
  const rightMargin = options?.rightMargin ?? 38;
  const format = options?.format ?? ((cur: number, tot: number) => `الصفحة ${cur} من ${tot}`);

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const currentNum = i + 1;
    const rawLabel = format(currentNum, totalPages);
    const shapedLabel = shapeArabicText(rawLabel);

    let textWidth = 0;
    try {
      textWidth = amiriFont.widthOfTextAtSize(shapedLabel, fontSize);
    } catch {
      textWidth = fontSize * shapedLabel.length * 0.5;
    }

    const x = Math.max(20, pageWidth - rightMargin - textWidth);
    const y = Math.max(10, pageHeight - topMargin - fontSize);

    if (options?.clearHeaderArea) {
      page.drawRectangle({
        x: x - 4,
        y: y - 2,
        width: textWidth + 8,
        height: fontSize + 5,
        color: rgb(1, 1, 1),
      });
    }

    page.drawText(shapedLabel, {
      x,
      y,
      size: fontSize,
      font: amiriFont,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const saved = await pdfDoc.save();
  return {
    buffer: Buffer.from(saved),
    totalPages,
  };
}

const TOP_HEADER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
       xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:w10="urn:schemas-microsoft-com:office:word"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
       xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
       xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
       xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
       xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
       mc:Ignorable="w14 wp14">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:bidi/>
      <w:jc w:val="right"/>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
      <w:t xml:space="preserve">الصفحة </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Amiri" w:hAnsi="Amiri" w:eastAsia="Amiri" w:cs="Amiri"/>
        <w:sz w:val="19"/>
        <w:szCs w:val="19"/>
        <w:color w:val="555555"/>
        <w:rtl/>
        <w:lang w:val="ar-SA"/>
      </w:rPr>
      <w:t xml:space="preserve"> من </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:hdr>`;

/**
 * Injects OpenXML top-header pagination directly into a DOCX zip container.
 */
export function injectTopHeaderPaginationIntoDocxZip(zip: any): void {
  // 1. Write or override word/header1.xml
  zip.file('word/header1.xml', TOP_HEADER_XML);

  // 2. Ensure [Content_Types].xml includes header override
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = ctFile.asText();
    if (!ctXml.includes('PartName="/word/header1.xml"')) {
      ctXml = ctXml.replace(
        '</Types>',
        '  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>\n</Types>'
      );
      zip.file('[Content_Types].xml', ctXml);
    }
  }

  // 3. Register relationship in word/_rels/document.xml.rels
  const relsFile = zip.file('word/_rels/document.xml.rels');
  let headerRelId = 'rIdHeader1';
  if (relsFile) {
    let relsXml = relsFile.asText();
    if (!relsXml.includes('Target="header1.xml"')) {
      const matchIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
      let maxId = 10;
      for (const m of matchIds) {
        const val = parseInt(m[1], 10);
        if (Number.isFinite(val) && val > maxId) maxId = val;
      }
      headerRelId = `rId${maxId + 1}`;
      relsXml = relsXml.replace(
        '</Relationships>',
        `  <Relationship Id="${headerRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>\n</Relationships>`
      );
      zip.file('word/_rels/document.xml.rels', relsXml);
    } else {
      const existingMatch = relsXml.match(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="header1\.xml"/);
      if (existingMatch) {
        headerRelId = existingMatch[1];
      }
    }
  }

  // 4. Bind headerReference inside w:sectPr in word/document.xml
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    let docXml = docFile.asText();
    const headerRefTag = `<w:headerReference w:type="default" r:id="${headerRelId}"/>`;
    if (!docXml.includes(headerRefTag)) {
      docXml = docXml.replace(/<w:sectPr([^>]*)>/g, (match, attrs) => {
        return `<w:sectPr${attrs}>${headerRefTag}`;
      });
      zip.file('word/document.xml', docXml);
    }
  }
}

/**
 * Applies top-header pagination to a DOCX buffer.
 */
export function applyTopHeaderPaginationToDocx(docxBuffer: Buffer): Buffer {
  const zip = new PizZip(docxBuffer);
  injectTopHeaderPaginationIntoDocxZip(zip);
  return zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

export interface NormalizedElementPlacement {
  x?: number;      // 0.0 to 1.0 (from left)
  y?: number;      // 0.0 to 1.0 (PDF space: 0.0 is bottom, 1.0 is top)
  width?: number;  // 0.0 to 1.0 (ratio of page width)
  height?: number; // 0.0 to 1.0 (ratio of page height)
  page?: number;   // 1-indexed page number (default: last page)
  xRatio?: number;
  yRatio?: number;
  wRatio?: number;
  hRatio?: number;
}

export interface JudicialStampAndSignatureOptions {
  signaturePosition?: NormalizedElementPlacement;
  stampPosition?: NormalizedElementPlacement;
  signatureImageBuffer?: Buffer | Uint8Array;
  stampImageBuffer?: Buffer | Uint8Array;
  defaultTargetPage?: number; // 1-indexed
}

/**
 * Applies Judge's Calligraphy/Signature and Official Court Seal onto target PDF page(s)
 * using 1:1 normalized coordinate ratios mapping directly to PDF point space.
 */
export async function applyJudicialStampAndSignatureToPdf(
  pdfBuffer: Buffer,
  options: JudicialStampAndSignatureOptions
): Promise<{ buffer: Buffer; totalPages: number }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  if (!totalPages) {
    return { buffer: pdfBuffer, totalPages: 0 };
  }

  // 1. Embed images if provided
  let signatureImage: any = null;
  if (options.signatureImageBuffer && options.signatureImageBuffer.length > 0) {
    try {
      signatureImage = await pdfDoc.embedPng(options.signatureImageBuffer);
    } catch (e) {
      console.warn('Failed to embed signature image as PNG, trying JPG:', e);
      try {
        signatureImage = await pdfDoc.embedJpg(options.signatureImageBuffer);
      } catch (e2) {
        console.error('Could not embed signature image:', e2);
      }
    }
  }

  let stampImage: any = null;
  if (options.stampImageBuffer && options.stampImageBuffer.length > 0) {
    try {
      stampImage = await pdfDoc.embedPng(options.stampImageBuffer);
    } catch (e) {
      console.warn('Failed to embed stamp image as PNG, trying JPG:', e);
      try {
        stampImage = await pdfDoc.embedJpg(options.stampImageBuffer);
      } catch (e2) {
        console.error('Could not embed stamp image:', e2);
      }
    }
  }

  const defaultPageIndex = options.defaultTargetPage
    ? Math.max(0, Math.min(options.defaultTargetPage - 1, totalPages - 1))
    : totalPages - 1;

  // 2. Draw Signature / Calligraphy
  if (signatureImage && options.signaturePosition) {
    const sigPos = options.signaturePosition;
    const pageIndex = sigPos.page
      ? Math.max(0, Math.min(sigPos.page - 1, totalPages - 1))
      : defaultPageIndex;
    const targetPage = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    const rawNormW = typeof (sigPos as any).wRatio === 'number'
      ? (sigPos as any).wRatio
      : (typeof sigPos.width === 'number' ? sigPos.width : 0.42);
    const normW = Number.isFinite(rawNormW) && rawNormW > 0 ? rawNormW : 0.42;

    const rawNormH = typeof (sigPos as any).hRatio === 'number'
      ? (sigPos as any).hRatio
      : (typeof sigPos.height === 'number' ? sigPos.height : 0.14);
    const normH = Number.isFinite(rawNormH) && rawNormH > 0 ? rawNormH : 0.14;

    const rawNormX = typeof (sigPos as any).xRatio === 'number'
      ? (sigPos as any).xRatio
      : (typeof sigPos.x === 'number' ? sigPos.x : 0.05);
    const normX = Number.isFinite(rawNormX) ? rawNormX : 0.05;

    const rawNormY = typeof (sigPos as any).yRatio === 'number'
      ? (sigPos as any).yRatio
      : (typeof sigPos.y === 'number' ? sigPos.y : 0.12);
    const normY = Number.isFinite(rawNormY) ? rawNormY : 0.12;

    const calculatedPdfW = normW * pageWidth;
    const calculatedPdfH = normH * pageHeight;
    const pdfW = Math.max(20, Number.isFinite(calculatedPdfW) ? calculatedPdfW : 220);
    const pdfH = Math.max(10, Number.isFinite(calculatedPdfH) ? calculatedPdfH : 75);

    const calculatedPdfX = normX * pageWidth;
    const calculatedPdfY = normY * pageHeight;
    const pdfX = Math.max(0, Math.min(pageWidth - pdfW, Number.isFinite(calculatedPdfX) ? calculatedPdfX : 30));
    const pdfY = Math.max(0, Math.min(pageHeight - pdfH, Number.isFinite(calculatedPdfY) ? calculatedPdfY : 30));

    targetPage.drawImage(signatureImage, {
      x: pdfX,
      y: pdfY,
      width: pdfW,
      height: pdfH,
      opacity: 0.98,
    });
  }

  // 3. Draw Court Seal
  if (stampImage && options.stampPosition) {
    const stampPos = options.stampPosition;
    const pageIndex = stampPos.page
      ? Math.max(0, Math.min(stampPos.page - 1, totalPages - 1))
      : defaultPageIndex;
    const targetPage = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    const rawNormW = typeof (stampPos as any).wRatio === 'number'
      ? (stampPos as any).wRatio
      : (typeof stampPos.width === 'number' ? stampPos.width : 0.26);
    const normW = Number.isFinite(rawNormW) && rawNormW > 0 ? rawNormW : 0.26;

    const rawNormH = typeof (stampPos as any).hRatio === 'number'
      ? (stampPos as any).hRatio
      : (typeof stampPos.height === 'number' ? stampPos.height : 0.26);
    const normH = Number.isFinite(rawNormH) && rawNormH > 0 ? rawNormH : 0.26;

    const rawNormX = typeof (stampPos as any).xRatio === 'number'
      ? (stampPos as any).xRatio
      : (typeof stampPos.x === 'number' ? stampPos.x : 0.65);
    const normX = Number.isFinite(rawNormX) ? rawNormX : 0.65;

    const rawNormY = typeof (stampPos as any).yRatio === 'number'
      ? (stampPos as any).yRatio
      : (typeof stampPos.y === 'number' ? stampPos.y : 0.12);
    const normY = Number.isFinite(rawNormY) ? rawNormY : 0.12;

    const calculatedPdfW = normW * pageWidth;
    const calculatedPdfH = normH * pageHeight;
    const pdfW = Math.max(20, Number.isFinite(calculatedPdfW) ? calculatedPdfW : 150);
    const pdfH = Math.max(10, Number.isFinite(calculatedPdfH) ? calculatedPdfH : 150);

    const calculatedPdfX = normX * pageWidth;
    const calculatedPdfY = normY * pageHeight;
    const pdfX = Math.max(0, Math.min(pageWidth - pdfW, Number.isFinite(calculatedPdfX) ? calculatedPdfX : 350));
    const pdfY = Math.max(0, Math.min(pageHeight - pdfH, Number.isFinite(calculatedPdfY) ? calculatedPdfY : 30));

    targetPage.drawImage(stampImage, {
      x: pdfX,
      y: pdfY,
      width: pdfW,
      height: pdfH,
      opacity: 0.98,
    });
  }

  const saved = await pdfDoc.save();
  return {
    buffer: Buffer.from(saved),
    totalPages,
  };
}

