import React from 'react';

export function IslamicRosette({ className, mirrored }: { className?: string; mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="rosetteGold" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#F7E7C5" />
          <stop offset="45%" stopColor="#E6BE8A" />
          <stop offset="100%" stopColor="#8B4513" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill="url(#rosetteGold)" />
      <circle cx="50" cy="50" r="40" fill="#2A0505" opacity="0.95" />

      {/* Petal rosette */}
      <path
        d="M50 4 L56 30 L79 15 L66 38 L96 50 L66 62 L79 85 L56 70 L50 96 L44 70 L21 85 L34 62 L4 50 L34 38 L21 15 L44 30 Z"
        fill="none"
        stroke="#E6BE8A"
        strokeWidth="2.2"
        opacity="0.95"
      />
      <path
        d="M50 14 L50 86 M14 50 L86 50 M24 24 L76 76 M24 76 L76 24"
        fill="none"
        stroke="#E6BE8A"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle cx="50" cy="50" r="10" fill="none" stroke="#E6BE8A" strokeWidth="2" opacity="0.85" />
      <circle cx="50" cy="50" r="3" fill="#E6BE8A" opacity="0.9" />
    </svg>
  );
}

export function IslamicDivider({ className }: { className?: string }) {
  return (
    <div className={`w-full select-none ${className ?? ''}`} aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center">
        <div className="relative z-20 h-16 w-16 shrink-0 -mr-6">
          <div className="absolute inset-0 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
          <IslamicRosette className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]" />
        </div>

        <div className="relative z-10 h-12 flex-1 overflow-hidden bg-gradient-to-r from-[#5a0c0b] via-[#800020] to-[#5a0c0b] shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,110,110,0.18),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-200 via-[#E6BE8A] to-amber-200 shadow-sm border-b border-amber-600/30" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-amber-200 via-[#E6BE8A] to-amber-200 shadow-sm border-t border-amber-600/30" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.12)_50%,transparent_75%)] bg-[length:250%_100%] animate-[shine_10s_linear_infinite] pointer-events-none" />
        </div>

        <div className="relative z-20 h-16 w-16 shrink-0 -ml-6">
          <div className="absolute inset-0 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.45)]" />
          <IslamicRosette
            className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
            mirrored
          />
        </div>
      </div>
    </div>
  );
}
