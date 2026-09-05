import React from 'react';

type BannerTheme = 'maroon' | 'green' | 'blue' | 'gray' | 'orange';

function EdgeOrnament({
  className,
  mirrored,
}: {
  className?: string;
  mirrored?: boolean;
}) {
  const id = React.useId();
  const goldFillId = `${id}-goldFill`;
  const goldStrokeId = `${id}-goldStroke`;
  const goldHighlightId = `${id}-goldHighlight`;
  const shadowId = `${id}-softShadow`;

  return (
    <svg
      viewBox="0 0 140 140"
      className={className}
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={goldFillId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF2D6" />
          <stop offset="35%" stopColor="#F2D29C" />
          <stop offset="70%" stopColor="#D4A861" />
          <stop offset="100%" stopColor="#8B4513" />
        </linearGradient>
        <linearGradient id={goldStrokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F7E7C5" />
          <stop offset="45%" stopColor="#E6BE8A" />
          <stop offset="100%" stopColor="#8B4513" />
        </linearGradient>
        <linearGradient id={goldHighlightId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#FFF2D6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF2D6" stopOpacity="0" />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* Connector spear/diamond (touches the banner edge at x=140) */}
        <path
          d="M140 70 L114 54 L104 70 L114 86 Z"
          fill={`url(#${goldFillId})`}
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Main stem */}
        <path
          d="M112 70 C96 58 88 42 84 28 C76 46 76 64 86 78 C74 78 66 92 68 108 C84 98 96 86 112 70 Z"
          fill="none"
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {/* Outer curl */}
        <path
          d="M78 34 C54 10 40 34 54 52 C30 46 30 80 62 74 C40 94 66 118 92 98"
          fill="none"
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        />

        {/* Inner curl */}
        <path
          d="M74 48 C58 36 52 52 62 60 C46 60 48 78 68 76"
          fill="none"
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Leaf fills (top/bottom) */}
        <path
          d="M98 30 C82 36 74 48 70 62 C86 56 100 44 110 34 Z"
          fill={`url(#${goldFillId})`}
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="2"
          opacity="0.95"
          strokeLinejoin="round"
        />
        <path
          d="M98 110 C82 104 74 92 70 78 C86 84 100 96 110 106 Z"
          fill={`url(#${goldFillId})`}
          stroke={`url(#${goldStrokeId})`}
          strokeWidth="2"
          opacity="0.95"
          strokeLinejoin="round"
        />

        {/* Small inner leaf */}
        <path
          d="M86 66 C78 60 72 68 74 76 C80 74 86 70 90 66 Z"
          fill={`url(#${goldFillId})`}
          opacity="0.85"
        />
      </g>

      {/* Highlights (thin) */}
      <path
        d="M112 70 C96 58 88 42 84 28"
        fill="none"
        stroke={`url(#${goldHighlightId})`}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M78 34 C54 10 40 34 54 52"
        fill="none"
        stroke={`url(#${goldHighlightId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function OrnateScrollBanner({
  className,
  children,
  theme = 'maroon',
}: {
  className?: string;
  children: React.ReactNode;
  theme?: BannerTheme;
}) {
  const barGradient =
    theme === 'green'
      ? 'from-[#023120] via-[#044a33] to-[#023120]'
      : theme === 'blue'
      ? 'from-[#161c4f] via-[#1d2569] to-[#161c4f]'
      : theme === 'gray'
      ? 'from-[#717475] via-[#a1a5a6] to-[#717475]'
      : theme === 'orange'
      ? 'from-[#f97316] via-[#ea580c] to-[#ef4444]'
      : 'from-[#5a0c0b] via-[#800020] to-[#5a0c0b]';

  return (
    <div className={`relative flex-1 max-w-[1400px] h-20 z-20 ${className ?? ''}`}>
      {/* Decorative background (no pointer events) */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 bg-gradient-to-r ${barGradient} shadow-[0_15px_40px_rgba(0,0,0,0.4)] overflow-hidden`}
        >
          {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
          <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none opacity-40 z-0" />

          <div className={`absolute inset-0 ${
             theme === 'blue' 
               ? 'bg-[radial-gradient(circle_at_center,rgba(100,150,255,0.2),transparent_70%)]' 
               : theme === 'gray' 
               ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3),transparent_70%)]' 
               : theme === 'green'
               ? 'bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.2),transparent_70%)]'
               : theme === 'orange'
               ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4),transparent_70%)]'
               : 'bg-[radial-gradient(circle_at_center,rgba(255,100,100,0.2),transparent_70%)]'
          }`} />

          {/* Gold rails */}
          <div className="absolute inset-x-0 top-0 h-2.5 bg-gradient-to-r from-amber-200 via-[#E6BE8A] to-amber-200 shadow-sm border-b border-amber-600/30" />
          <div className="absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-r from-amber-200 via-[#E6BE8A] to-amber-200 shadow-sm border-t border-amber-600/30" />

          {/* Center gold highlights */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 h-6 w-28 rounded-full bg-gradient-to-r from-[#8B4513] via-[#E6BE8A] to-[#8B4513] opacity-80 blur-[0.2px]" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 h-6 w-28 rounded-full bg-gradient-to-r from-[#8B4513] via-[#E6BE8A] to-[#8B4513] opacity-80 blur-[0.2px]" />

          {/* Animated shine */}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.14)_50%,transparent_75%)] bg-[length:250%_100%] animate-[shine_10s_linear_infinite]" />
        </div>

        {/* Edge ornaments (only geometry changes) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-20 w-20">
          <EdgeOrnament className="h-full w-full" />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-20 w-20">
          <EdgeOrnament className="h-full w-full" mirrored />
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative h-full w-full flex items-center justify-center">{children}</div>
    </div>
  );
}
