import React from 'react';

export function PublicOfficialHeader() {
  return (
    <div className="border-b bg-gradient-to-b from-[#E2E4E7] via-[#F1F2F4] to-white shadow-sm overflow-hidden relative" dir="rtl">
      {/* Subtle light pattern overlay */}
      <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
      
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 relative z-10">
        {/* Right side: Morocco Coat of Arms & Official Typography */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="p-1.5 bg-white/90 rounded-2xl shadow-sm border border-white backdrop-blur-sm shrink-0">
            <img
              src="/logos/morocco-coat.jpg"
              alt="شعار المملكة المغربية"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="text-right leading-[1.3] font-maghribi select-none">
            <div className="text-xl sm:text-2xl font-[800] text-slate-800 tracking-normal">
              <span>المملكة المغربية</span>
            </div>
            <div className="text-xl sm:text-2xl font-[800] text-slate-600 tracking-normal">
              <span>الهيئة الوطنية للعدول</span>
            </div>
          </div>
        </div>

        {/* Left side: Official Adoul Order Logo */}
        <div className="p-1.5 bg-white/90 rounded-2xl shadow-sm border border-white backdrop-blur-sm shrink-0">
          <img
            src="/logos/adoul-logo.jpg"
            alt="شعار الهيئة الوطنية للعدول"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm rounded-xl"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

