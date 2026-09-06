// --- Shared Constants & Helpers ---
export const PAGE_WIDTH = 794; // A4 width at 96 DPI
export const PAGE_HEIGHT = 1123; // A4 height at 96 DPI
export const PAGE_GAP = 128; // gap-32

// (legacy debug helper removed)

export const getPages = (text: string): string[] => {
  if (!text) return [''];
  const rawPages = text.split(/\[PAGE_BREAK\]|\\f/);
  if (rawPages.length > 1) return rawPages;
  
  const maxChars = 850; 
  const maxLines = 14;
  const result = [];
  let current = text;

  while (current.length > 0) {
    let splitIdx = current.length <= maxChars ? current.length : maxChars;
    const lines = current.substring(0, splitIdx).split('\n');
    if (lines.length > maxLines) {
      let lineLimitIdx = 0;
      for (let i = 0; i < maxLines; i++) {
        lineLimitIdx = current.indexOf('\n', lineLimitIdx + 1);
      }
      if (lineLimitIdx !== -1 && lineLimitIdx < splitIdx) {
        splitIdx = lineLimitIdx;
      }
    }
    if (splitIdx < current.length) {
        let preferredSplit = current.lastIndexOf('\n\n', splitIdx);
        if (preferredSplit < splitIdx * 0.7) {
            preferredSplit = current.lastIndexOf('\n', splitIdx);
        }
        if (preferredSplit > splitIdx * 0.5) {
            splitIdx = preferredSplit;
        }
    }
    result.push(current.substring(0, splitIdx).trim());
    current = current.substring(splitIdx).trim();
    if (result.length > 50) break;
  }
  return result;
};

export const stripHtmlToPlainText = (html: string): string => {
  if (!html) return '';
  const normalized = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n');

  const tmp = document.createElement('div');
  tmp.innerHTML = normalized;
  const text = (tmp.textContent || tmp.innerText || '').replace(/\u00a0/g, ' ');
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
