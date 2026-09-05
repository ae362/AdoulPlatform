import React, { useMemo } from 'react';
import { AMIRI_FONT_BASE64 } from '../../../assets/amiriFontBase64';
import {
  escapeXml,
  getManualWordAnchors,
  normalizeArabicText,
  type CircularTextStrategy,
} from '../arabic';
import { STAMP_VIEWBOX_SIZE, polarToCartesian } from '../geometry';
import type { StampConfig, StampRendererOutput } from '../types';
import { DEFAULT_ARABIC_STAMP_CONFIG } from './defaultConfig';

export type StampRenderOptions = {
  strategy?: CircularTextStrategy;
  includeDistress?: boolean;
};

const STAMP_LAYOUT = {
  viewBox: 1000,
  center: { x: 500, y: 500 },
  centerTextOrigin: { x: 270, y: 340 },
  centerTextSize: { width: 460, height: 230 },
  serialOffsetY: 838,
  footerOffsetY: 730,
};

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function getRingRotation(angle: number) {
  const normalized = normalizeAngle(angle);
  return normalized >= 90 && normalized <= 270 ? normalized - 180 : normalized;
}

function buildStar(cx: number, cy: number, size: number) {
  return `${cx},${cy - size} ${cx + size * 0.78},${cy} ${cx},${cy + size} ${cx - size * 0.78},${cy}`;
}

function buildScaleIcon() {
  return `
    <g transform="translate(500 505)" fill="none" stroke="#3b73d1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <line x1="0" y1="-120" x2="0" y2="118" />
      <line x1="-96" y1="-88" x2="96" y2="-88" />
      <line x1="0" y1="-120" x2="-18" y2="-146" />
      <line x1="0" y1="-120" x2="18" y2="-146" />
      <line x1="-70" y1="-88" x2="-120" y2="8" />
      <line x1="-70" y1="-88" x2="-18" y2="8" />
      <line x1="70" y1="-88" x2="18" y2="8" />
      <line x1="70" y1="-88" x2="120" y2="8" />
      <path d="M -138 14 Q -70 84 -2 14 Z" fill="#3b73d1" stroke="none" />
      <path d="M 2 14 Q 70 84 138 14 Z" fill="#3b73d1" stroke="none" />
      <path d="M -78 126 Q 0 96 78 126" />
      <line x1="0" y1="118" x2="0" y2="168" />
      <path d="M -54 176 L 54 176 L 92 194 L -92 194 Z" fill="#3b73d1" stroke="none" />
    </g>
  `;
}

function buildCenterText(config: StampConfig) {
  if (!config.centerText.lines.length || config.centerText.fontSize <= 0) return '';
  const boxX = STAMP_LAYOUT.centerTextOrigin.x;
  const boxY = STAMP_LAYOUT.centerTextOrigin.y;
  const boxWidth = STAMP_LAYOUT.centerTextSize.width;
  const boxHeight = STAMP_LAYOUT.centerTextSize.height;
  const totalHeight =
    config.centerText.lines.length * config.centerText.fontSize +
    Math.max(0, config.centerText.lines.length - 1) * config.centerText.lineGap;
  const startY = boxY + (boxHeight - totalHeight) / 2 + config.centerText.fontSize * 0.82;

  return config.centerText.lines
    .map((line, index) => {
      const y = startY + index * (config.centerText.fontSize + config.centerText.lineGap);
      return `<text x="${boxX + boxWidth / 2}" y="${y}" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" font-size="${config.centerText.fontSize}" font-weight="${config.centerText.fontWeight || 800}">${escapeXml(normalizeArabicText(line))}</text>`;
    })
    .join('');
}

function buildArcText(config: StampConfig, strategy: CircularTextStrategy) {
  const topWords = getManualWordAnchors(config.topArc.text, config.topArc.startAngle, config.topArc.endAngle)
    .map((anchor) => {
      const point = polarToCartesian(
        STAMP_LAYOUT.center.x,
        STAMP_LAYOUT.center.y,
        config.topArc.radius,
        anchor.angle
      );
      return `<text class="stamp-outer-arc" direction="rtl" unicode-bidi="plaintext" font-size="${config.topArc.fontSize}" text-anchor="middle" dominant-baseline="middle" transform="translate(${point.x} ${point.y}) rotate(${getRingRotation(anchor.angle)})">${escapeXml(normalizeArabicText(anchor.word))}</text>`;
    })
    .join('');

  const upperLeftWords = getManualWordAnchors(
    config.footerLine?.text || '',
    -4,
    -96
  )
    .map((anchor) => {
      const point = polarToCartesian(
        STAMP_LAYOUT.center.x,
        STAMP_LAYOUT.center.y,
        config.topArc.radius,
        anchor.angle
      );
      return `<text class="stamp-outer-arc" direction="rtl" unicode-bidi="plaintext" font-size="${config.footerLine?.fontSize || config.topArc.fontSize}" text-anchor="middle" dominant-baseline="middle" transform="translate(${point.x} ${point.y}) rotate(${getRingRotation(anchor.angle)})">${escapeXml(normalizeArabicText(anchor.word))}</text>`;
    })
    .join('');

  const bottomWords = getManualWordAnchors(
    config.bottomArc.text,
    config.bottomArc.startAngle,
    config.bottomArc.endAngle
  )
    .map((anchor) => {
      const point = polarToCartesian(
        STAMP_LAYOUT.center.x,
        STAMP_LAYOUT.center.y,
        config.bottomArc.radius,
        anchor.angle
      );
      return `<text class="stamp-outer-arc" direction="rtl" unicode-bidi="plaintext" font-size="${config.bottomArc.fontSize}" text-anchor="middle" dominant-baseline="middle" transform="translate(${point.x} ${point.y}) rotate(${getRingRotation(anchor.angle)})">${escapeXml(normalizeArabicText(anchor.word))}</text>`;
    })
    .join('');

  return `<g aria-hidden="true">${topWords}${upperLeftWords}${bottomWords}</g>`;
}

function buildFooterLine(config: StampConfig) {
  if (!config.footerLine?.text) return '';
  return `
    <text
      x="${STAMP_LAYOUT.center.x}"
      y="${config.footerLine.offsetY ?? STAMP_LAYOUT.footerOffsetY}"
      text-anchor="middle"
      direction="rtl"
      unicode-bidi="plaintext"
      font-size="${config.footerLine.fontSize}"
      font-weight="800"
      class="stamp-outer-line"
    >
      ${escapeXml(normalizeArabicText(config.footerLine.text))}
    </text>
  `;
}

function buildSerialLine(config: StampConfig) {
  if (!config.serialLine?.text) return '';
  const width = 356;
  const height = 78;
  const x = STAMP_LAYOUT.center.x - width / 2;
  const y = (config.serialLine.offsetY ?? STAMP_LAYOUT.serialOffsetY) - 50;
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" ry="30" fill="#183a78" stroke="#e5eefc" stroke-width="6" />
    <text
      x="${STAMP_LAYOUT.center.x}"
      y="${config.serialLine.offsetY ?? STAMP_LAYOUT.serialOffsetY}"
      text-anchor="middle"
      direction="ltr"
      unicode-bidi="plaintext"
      font-size="${config.serialLine.fontSize}"
      font-weight="800"
      class="stamp-serial-line"
    >
      ${escapeXml(String(config.serialLine.text || '').trim())}
    </text>
  `;
}

function buildDistressLayer(config: StampConfig) {
  if (!config.effects?.distress) return '';
  const opacity = Math.max(0, Math.min(1, config.effects.opacity ?? 0.96));
  const distress = Math.max(0, Math.min(1, config.effects.distress));
  const spread = Math.max(0, config.effects.inkSpread ?? 0.8);
  return `
    <g opacity="${opacity}">
      <rect x="0" y="0" width="1000" height="1000" fill="transparent" filter="url(#stampDistress)" />
      <filter id="stampDistress">
        <feTurbulence type="fractalNoise" baseFrequency="${0.015 + distress * 0.03}" numOctaves="2" seed="17" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${2 + spread * 5}" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </g>
  `;
}

export function renderStampSvgString(
  config: StampConfig = DEFAULT_ARABIC_STAMP_CONFIG,
  options: StampRenderOptions = {}
): string {
  const separatorMarkup = (config.separators?.stars || [])
    .map((star, index) => {
      const point = polarToCartesian(STAMP_LAYOUT.center.x, STAMP_LAYOUT.center.y, star.radius, star.angle);
      return `<circle data-star-index="${index}" cx="${point.x}" cy="${point.y}" r="${star.size}" />`;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${config.size}" height="${config.size}" role="img" aria-label="Arabic judicial stamp" preserveAspectRatio="xMidYMid meet">
      <defs>
        <style>
          @font-face {
            font-family: '${config.fontFamily}';
            src: url("data:font/ttf;base64,${AMIRI_FONT_BASE64}") format("truetype");
          }
          .stamp-root {
            font-family: '${config.fontFamily}', 'Amiri', 'Noto Naskh Arabic', serif;
            fill: #111827;
            stroke: #111827;
          }
          .stamp-outer-line {
            fill: #3b73d1;
            stroke: none;
            font-weight: 900;
          }
          .stamp-serial-line {
            fill: #3b73d1;
            stroke: none;
            font-weight: 800;
            font-family: Arial, Helvetica, sans-serif;
            letter-spacing: 1.2px;
          }
          .stamp-outer-arc {
            fill: #3b73d1;
            stroke: none;
            font-weight: 900;
            letter-spacing: 0;
          }
          .stamp-center-text {
            fill: #3b73d1;
            stroke: none;
          }
          .stamp-star {
            fill: #3b73d1;
            stroke: none;
          }
        </style>
      </defs>
      <g class="stamp-root" opacity="${config.effects?.opacity ?? 0.96}">
        <circle cx="${STAMP_LAYOUT.center.x}" cy="${STAMP_LAYOUT.center.y}" r="${config.outerCircle.radius}" fill="none" stroke="#3b73d1" stroke-width="${config.outerCircle.stroke}" />
        ${buildArcText(config, options.strategy ?? 'textPath')}
        <circle cx="${STAMP_LAYOUT.center.x}" cy="${STAMP_LAYOUT.center.y}" r="${config.innerCircle.radius}" fill="none" stroke="#3b73d1" stroke-width="${config.innerCircle.stroke}" />
        <g class="stamp-star">${separatorMarkup}</g>
        ${buildScaleIcon()}
        <g class="stamp-center-text">${buildCenterText(config)}</g>
        ${buildSerialLine(config)}
      </g>
      ${options.includeDistress === false ? '' : buildDistressLayer(config)}
    </svg>
  `.trim();
}

export function renderStampSvg(config?: StampConfig, options?: StampRenderOptions): StampRendererOutput {
  return {
    svg: renderStampSvgString(config, options),
    viewBox: `0 0 ${STAMP_VIEWBOX_SIZE} ${STAMP_VIEWBOX_SIZE}`,
  };
}

export async function svgToPngBlob(svgMarkup: string, size: number) {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to build PNG preview'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function StampSvg({
  config = DEFAULT_ARABIC_STAMP_CONFIG,
  className,
  strategy = 'textPath',
  includeDistress = true,
}: {
  config?: StampConfig;
  className?: string;
  strategy?: CircularTextStrategy;
  includeDistress?: boolean;
}) {
  const markup = useMemo(
    () => renderStampSvgString(config, { strategy, includeDistress }),
    [config, strategy, includeDistress]
  );
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}

export { DEFAULT_ARABIC_STAMP_CONFIG };
