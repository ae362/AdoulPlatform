import type { PageViewportBox, StampPlacement, StampScreenRect } from './types';

export const STAMP_VIEWBOX_SIZE = 1000;
export const STAMP_CENTER = { x: 500, y: 500 };

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const theta = degToRad(angle - 90);
  return {
    x: cx + radius * Math.cos(theta),
    y: cy + radius * Math.sin(theta),
  };
}

export function describeArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  sweepFlag = 1
) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const rawSweep = ((endAngle - startAngle) % 360 + 360) % 360;
  const largeArcFlag = rawSweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

export function describeReversedArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  return describeArcPath(cx, cy, radius, endAngle, startAngle, 0);
}

export function placementToScreenRect(
  placement: StampPlacement,
  pageBox: PageViewportBox
): StampScreenRect {
  return {
    left: placement.xPct * pageBox.width,
    top: placement.yPct * pageBox.height,
    width: placement.widthPct * pageBox.width,
    height: placement.heightPct * pageBox.height,
    rotation: placement.rotation,
  };
}

export function screenRectToPlacement(
  rect: StampScreenRect,
  page: number,
  pageBox: PageViewportBox
): StampPlacement {
  return {
    page,
    xPct: clamp01(rect.left / Math.max(1, pageBox.width)),
    yPct: clamp01(rect.top / Math.max(1, pageBox.height)),
    widthPct: clamp01(rect.width / Math.max(1, pageBox.width)),
    heightPct: clamp01(rect.height / Math.max(1, pageBox.height)),
    rotation: rect.rotation,
  };
}

export function clampPlacement(placement: StampPlacement, pageBox: PageViewportBox): StampPlacement {
  const widthPct = clamp01(placement.widthPct);
  const heightPct = clamp01(placement.heightPct);
  const maxXPct = Math.max(0, 1 - widthPct);
  const maxYPct = Math.max(0, 1 - heightPct);
  return {
    ...placement,
    xPct: clamp(placement.xPct, 0, maxXPct),
    yPct: clamp(placement.yPct, 0, maxYPct),
    widthPct,
    heightPct,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}
