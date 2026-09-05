import React from 'react';
import { useNavigate } from 'react-router-dom';

export function ReturnToLandingButton({
  label = 'العودة إلى الصفحة الرئيسية',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <div className={`flex justify-end ${className}`}>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

