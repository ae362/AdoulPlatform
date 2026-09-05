import Bidi from 'bidi-js';

export type CircularTextStrategy = 'textPath' | 'manualGlyphs';

const bidi = new Bidi();

function segmentText(text: string) {
  const SegmenterCtor = (Intl as unknown as { Segmenter?: new (...args: any[]) => any }).Segmenter;
  if (SegmenterCtor) {
    const segmenter = new SegmenterCtor('ar', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (entry: any) => entry.segment as string);
  }
  return Array.from(text);
}

function segmentWords(text: string) {
  return normalizeArabicText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function normalizeArabicText(text: string) {
  return String(text || '').trim();
}

type ArabicFormSet = {
  isolated: string;
  final?: string;
  initial?: string;
  medial?: string;
  joinsWithPrevious: boolean;
  joinsWithNext: boolean;
};

type ShapedGlyph = {
  source: string;
  shaped: string;
};

const ARABIC_FORMS: Record<string, ArabicFormSet> = {
  'ء': { isolated: '\uFE80', joinsWithPrevious: false, joinsWithNext: false },
  'آ': { isolated: '\uFE81', final: '\uFE82', joinsWithPrevious: true, joinsWithNext: false },
  'أ': { isolated: '\uFE83', final: '\uFE84', joinsWithPrevious: true, joinsWithNext: false },
  'ؤ': { isolated: '\uFE85', final: '\uFE86', joinsWithPrevious: true, joinsWithNext: false },
  'إ': { isolated: '\uFE87', final: '\uFE88', joinsWithPrevious: true, joinsWithNext: false },
  'ئ': {
    isolated: '\uFE89',
    final: '\uFE8A',
    initial: '\uFE8B',
    medial: '\uFE8C',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ا': { isolated: '\uFE8D', final: '\uFE8E', joinsWithPrevious: true, joinsWithNext: false },
  'ب': {
    isolated: '\uFE8F',
    final: '\uFE90',
    initial: '\uFE91',
    medial: '\uFE92',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ة': { isolated: '\uFE93', final: '\uFE94', joinsWithPrevious: true, joinsWithNext: false },
  'ت': {
    isolated: '\uFE95',
    final: '\uFE96',
    initial: '\uFE97',
    medial: '\uFE98',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ث': {
    isolated: '\uFE99',
    final: '\uFE9A',
    initial: '\uFE9B',
    medial: '\uFE9C',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ج': {
    isolated: '\uFE9D',
    final: '\uFE9E',
    initial: '\uFE9F',
    medial: '\uFEA0',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ح': {
    isolated: '\uFEA1',
    final: '\uFEA2',
    initial: '\uFEA3',
    medial: '\uFEA4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'خ': {
    isolated: '\uFEA5',
    final: '\uFEA6',
    initial: '\uFEA7',
    medial: '\uFEA8',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'د': { isolated: '\uFEA9', final: '\uFEAA', joinsWithPrevious: true, joinsWithNext: false },
  'ذ': { isolated: '\uFEAB', final: '\uFEAC', joinsWithPrevious: true, joinsWithNext: false },
  'ر': { isolated: '\uFEAD', final: '\uFEAE', joinsWithPrevious: true, joinsWithNext: false },
  'ز': { isolated: '\uFEAF', final: '\uFEB0', joinsWithPrevious: true, joinsWithNext: false },
  'س': {
    isolated: '\uFEB1',
    final: '\uFEB2',
    initial: '\uFEB3',
    medial: '\uFEB4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ش': {
    isolated: '\uFEB5',
    final: '\uFEB6',
    initial: '\uFEB7',
    medial: '\uFEB8',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ص': {
    isolated: '\uFEB9',
    final: '\uFEBA',
    initial: '\uFEBB',
    medial: '\uFEBC',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ض': {
    isolated: '\uFEBD',
    final: '\uFEBE',
    initial: '\uFEBF',
    medial: '\uFEC0',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ط': {
    isolated: '\uFEC1',
    final: '\uFEC2',
    initial: '\uFEC3',
    medial: '\uFEC4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ظ': {
    isolated: '\uFEC5',
    final: '\uFEC6',
    initial: '\uFEC7',
    medial: '\uFEC8',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ع': {
    isolated: '\uFEC9',
    final: '\uFECA',
    initial: '\uFECB',
    medial: '\uFECC',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'غ': {
    isolated: '\uFECD',
    final: '\uFECE',
    initial: '\uFECF',
    medial: '\uFED0',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ف': {
    isolated: '\uFED1',
    final: '\uFED2',
    initial: '\uFED3',
    medial: '\uFED4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ق': {
    isolated: '\uFED5',
    final: '\uFED6',
    initial: '\uFED7',
    medial: '\uFED8',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ك': {
    isolated: '\uFED9',
    final: '\uFEDA',
    initial: '\uFEDB',
    medial: '\uFEDC',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ل': {
    isolated: '\uFEDD',
    final: '\uFEDE',
    initial: '\uFEDF',
    medial: '\uFEE0',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'م': {
    isolated: '\uFEE1',
    final: '\uFEE2',
    initial: '\uFEE3',
    medial: '\uFEE4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ن': {
    isolated: '\uFEE5',
    final: '\uFEE6',
    initial: '\uFEE7',
    medial: '\uFEE8',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'ه': {
    isolated: '\uFEE9',
    final: '\uFEEA',
    initial: '\uFEEB',
    medial: '\uFEEC',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
  'و': { isolated: '\uFEED', final: '\uFEEE', joinsWithPrevious: true, joinsWithNext: false },
  'ى': { isolated: '\uFEEF', final: '\uFEF0', joinsWithPrevious: true, joinsWithNext: false },
  'ي': {
    isolated: '\uFEF1',
    final: '\uFEF2',
    initial: '\uFEF3',
    medial: '\uFEF4',
    joinsWithPrevious: true,
    joinsWithNext: true,
  },
};

function isWhitespace(char: string) {
  return /\s/.test(char);
}

function getPrevMeaningfulChar(chars: string[], index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!isWhitespace(chars[cursor])) return chars[cursor];
  }
  return null;
}

function getNextMeaningfulChar(chars: string[], index: number) {
  for (let cursor = index + 1; cursor < chars.length; cursor += 1) {
    if (!isWhitespace(chars[cursor])) return chars[cursor];
  }
  return null;
}

function shapeArabicChar(char: string, prevChar: string | null, nextChar: string | null) {
  const formSet = ARABIC_FORMS[char];
  if (!formSet) return char;
  const prevForms = prevChar ? ARABIC_FORMS[prevChar] : null;
  const nextForms = nextChar ? ARABIC_FORMS[nextChar] : null;
  const connectsPrev =
    !!prevForms && prevForms.joinsWithNext && formSet.joinsWithPrevious;
  const connectsNext =
    !!nextForms && formSet.joinsWithNext && nextForms.joinsWithPrevious;

  if (connectsPrev && connectsNext && formSet.medial) return formSet.medial;
  if (connectsPrev && formSet.final) return formSet.final;
  if (connectsNext && formSet.initial) return formSet.initial;
  return formSet.isolated;
}

function estimateGlyphWeight(source: string) {
  if (isWhitespace(source)) return 0.7;
  if ('اأإآدذرزوؤةى'.includes(source)) return 0.72;
  if ('ل'.includes(source)) return 0.78;
  if ('مغهشقصضطظع'.includes(source)) return 1.08;
  return 0.92;
}

export function shapeArabicGlyphs(text: string): ShapedGlyph[] {
  const normalized = normalizeArabicText(text);
  const chars = Array.from(normalized);

  return chars.map((char, index) => {
    if (isWhitespace(char) || !ARABIC_FORMS[char]) {
      return { source: char, shaped: char };
    }
    return {
      source: char,
      shaped: shapeArabicChar(
        char,
        getPrevMeaningfulChar(chars, index),
        getNextMeaningfulChar(chars, index)
      ),
    };
  });
}

export function shapeArabicText(text: string) {
  return shapeArabicGlyphs(text)
    .map((glyph) => glyph.shaped)
    .join('');
}

export function shapeArabicVisualText(text: string) {
  const shaped = shapeArabicText(text);
  if (!shaped) return shaped;
  try {
    const levels = bidi.getEmbeddingLevels(shaped);
    return bidi.getReorderedString(shaped, levels);
  } catch {
    return shaped;
  }
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getManualGlyphAnchors(
  text: string,
  startAngle: number,
  endAngle: number
) {
  const glyphs = shapeArabicGlyphs(text);
  const visibleGlyphs = glyphs.filter((glyph) => glyph.shaped.length > 0);
  if (visibleGlyphs.length === 0) return [];

  const totalWeight = visibleGlyphs.reduce((sum, glyph) => sum + estimateGlyphWeight(glyph.source), 0);
  const span = endAngle - startAngle;
  let traversedWeight = 0;

  return visibleGlyphs.map((glyph) => {
    const weight = estimateGlyphWeight(glyph.source);
    const ratio = totalWeight <= 0 ? 0.5 : (traversedWeight + weight / 2) / totalWeight;
    const angle = startAngle + span * ratio;
    traversedWeight += weight;
    return {
      glyph: glyph.shaped,
      angle,
      weight,
      isWhitespace: isWhitespace(glyph.source),
    };
  });
}

export function getManualWordAnchors(
  text: string,
  startAngle: number,
  endAngle: number
) {
  const words = segmentWords(text);
  if (words.length === 0) return [];

  const totalWeight = words.reduce((sum, word) => sum + Math.max(1, Array.from(word).length), 0);
  const span = endAngle - startAngle;
  const spanMid = startAngle + span / 2;
  const packedSpan = span * 0.82;
  const packedStart = spanMid - packedSpan / 2;
  let traversedWeight = 0;

  return words.map((word) => {
    const weight = Math.max(1, Array.from(word).length);
    const ratio = totalWeight <= 0 ? 0.5 : (traversedWeight + weight / 2) / totalWeight;
    traversedWeight += weight;
    return {
      word,
      angle: packedStart + packedSpan * ratio,
    };
  });
}
