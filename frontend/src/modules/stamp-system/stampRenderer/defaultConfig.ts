import type { StampConfig } from '../types';

export const DEFAULT_ARABIC_STAMP_CONFIG: StampConfig = {
  size: 1000,
  outerCircle: { radius: 270, stroke: 8 },
  innerCircle: { radius: 208, stroke: 6 },
  topArc: {
    radius: 244,
    startAngle: 60,
    endAngle: 22,
    fontSize: 18,
    letterSpacing: 0,
    text: 'المملكة المغربية',
  },
  bottomArc: {
    radius: 244,
    startAngle: 142,
    endAngle: 218,
    fontSize: 13,
    letterSpacing: 0,
    text: 'المحكمة الابتدائية شفشاون',
  },
  centerText: {
    lines: [],
    fontSize: 0,
    lineGap: 0,
    fontWeight: 900,
  },
  footerLine: {
    text: 'المجلس الأعلى للسلطة القضائية',
    fontSize: 15,
    offsetY: 730,
  },
  serialLine: {
    text: '',
    fontSize: 28,
    offsetY: 852,
  },
  separators: {
    stars: [
      { angle: 90, radius: 244, size: 6 },
      { angle: 270, radius: 244, size: 6 },
      { angle: 0, radius: 244, size: 6 },
      { angle: 180, radius: 244, size: 6 },
    ],
  },
  effects: {
    distress: 0,
    opacity: 1,
    inkSpread: 0,
  },
  fontFamily: 'AmiriStamp',
};
