export type StampArcConfig = {
  radius: number;
  startAngle: number;
  endAngle: number;
  fontSize: number;
  letterSpacing: number;
  text: string;
};

export type StampConfig = {
  size: number;
  outerCircle: { radius: number; stroke: number };
  innerCircle: { radius: number; stroke: number };
  topArc: StampArcConfig;
  bottomArc: StampArcConfig;
  is360?: boolean;
  centerText: {
    lines: string[];
    fontSize: number;
    lineGap: number;
    fontWeight?: number | string;
  };
  footerLine?: {
    text: string;
    fontSize: number;
    offsetY?: number;
  };
  serialLine?: {
    text: string;
    fontSize: number;
    offsetY?: number;
  };
  separators?: {
    stars?: { angle: number; radius: number; size: number }[];
  };
  effects?: {
    distress?: number;
    opacity?: number;
    inkSpread?: number;
  };
  fontFamily: string;
};

export type StampPlacement = {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation: number;
};

export type PageViewportBox = {
  width: number;
  height: number;
};

export type StampScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
};

export type StampRendererOutput = {
  svg: string;
  viewBox: string;
};
