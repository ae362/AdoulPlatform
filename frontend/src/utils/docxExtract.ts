// Extracts header content from a DOCX template.
// Supports:
// 1. Full header XML (text + shapes + images) for composite headers
// 2. Single image fallback for simple image-based headers

// @ts-ignore
import PizZip from 'pizzip';

export type ExtractedImage = {
  data: Uint8Array;
  type: 'png' | 'jpg';
};

export type ExtractedHeader = {
  headerXml: string | null; // Full header XML including text/shapes/images
  headerImage: ExtractedImage | null; // Fallback: single largest image
};

function inferTypeFromPath(path: string): 'png' | 'jpg' {
  const lower = (path || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  return 'png';
}

/**
 * Extracts the complete header XML from the first header in document relationships.
 * This captures ALL header content: text, shapes, images, decorations, etc.
 */
function extractFullHeaderXml(zip: any): string | null {
  try {
    const docRelsXml = zip.file('word/_rels/document.xml.rels')?.asText?.() as string | undefined;
    if (!docRelsXml) return null;

    // Find header1.xml relationship (typical default header)
    const headerMatch = /Id="rId\d+"[^>]*Target="(header\d+\.xml)"/i.exec(docRelsXml);
    if (!headerMatch) return null;

    const headerFileName = headerMatch[1];
    const headerFile = zip.file(`word/${headerFileName}`);
    if (!headerFile) return null;

    const headerXml = headerFile.asText?.() as string | undefined;
    return headerXml || null;
  } catch {
    return null;
  }
}

/**
 * Extracts the largest image from document media folder.
 * Fallback when full header XML is not available or rendering fails.
 */
function extractLargestImage(zip: any): ExtractedImage | null {
  const mediaPaths = Object.keys(zip.files)
    .filter((p) => p.startsWith('word/media/') && /\.(png|jpe?g)$/i.test(p));

  let best: { path: string; size: number } | null = null;
  for (const path of mediaPaths) {
    try {
      const file = zip.file(path);
      if (!file) continue;
      const data = file.asUint8Array();
      // Prefer larger images (header decorations are typically > 50KB)
      if (data.byteLength > 50000 && (!best || data.byteLength > best.size)) {
        best = { path, size: data.byteLength };
      }
    } catch {
      // ignore
    }
  }

  // Fallback: take any image if no large one found
  if (!best) {
    for (const path of mediaPaths) {
      try {
        const file = zip.file(path);
        if (!file) continue;
        const data = file.asUint8Array();
        if (!best || data.byteLength > best.size) {
          best = { path, size: data.byteLength };
        }
      } catch {
        // ignore
      }
    }
  }

  if (best) {
    const file = zip.file(best.path);
    if (!file) return null;
    const type = inferTypeFromPath(best.path);
    const data = file.asUint8Array();
    return { data, type };
  }

  return null;
}

/**
 * Extracts header content from a DOCX template.
 * Returns both full header XML (for rich rendering) and fallback image.
 */
export function extractHeaderContentFromDocx(docxArrayBuffer: ArrayBuffer): ExtractedHeader {
  const zip = new PizZip(docxArrayBuffer);
  
  return {
    headerXml: extractFullHeaderXml(zip),
    headerImage: extractLargestImage(zip),
  };
}

// Legacy: extract image only (for backward compatibility)
export function extractHeaderImageFromDocxArrayBuffer(docxArrayBuffer: ArrayBuffer): ExtractedImage | null {
  const zip = new PizZip(docxArrayBuffer);
  return extractLargestImage(zip);
}
