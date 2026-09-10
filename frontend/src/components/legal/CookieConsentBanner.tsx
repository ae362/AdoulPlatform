import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenPrivacyPolicy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacyPolicy }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('adoul_cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } catch {
      // If localStorage is unavailable, do not block the user
      setIsVisible(false);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('adoul_cookie_consent', 'all');
    } catch {
      // Ignore storage errors
    }
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem('adoul_cookie_consent', 'essential');
    } catch {
      // Ignore storage errors
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 md:max-w-md z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-900/20 p-5 text-right transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-900 flex-shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            ملفات تعريف الارتباط والخصوصية
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            نستخدم ملفات تعريف الارتباط الضرورية لتأمين جلسات التوثيق والتحقق وتطبيق معايير الحماية وفق مقتضيات القانون رقم 09-08 (CNDP).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {onOpenPrivacyPolicy ? (
          <button
            type="button"
            onClick={onOpenPrivacyPolicy}
            className="text-xs text-amber-900 underline hover:text-amber-700 font-medium py-1"
          >
            سياسة الخصوصية
          </button>
        ) : (
          <span />
        )}
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAcceptEssential}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            الضروري فقط
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-900 text-white hover:bg-amber-800 font-bold shadow-sm transition-colors"
          >
            قبول الكل
          </button>
        </div>
      </div>
    </div>
  );
};

