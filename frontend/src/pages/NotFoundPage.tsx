import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowRight, ShieldAlert, Search, FileCheck2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
      {/* Top Sovereign Bar */}
      <header className="bg-amber-950 text-amber-100 py-3 px-6 shadow-md border-b border-amber-900/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logos/morocco-coat.jpg" 
              alt="شعار المملكة المغربية" 
              className="h-10 w-10 object-contain rounded"
            />
            <div>
              <h1 className="text-sm font-bold font-serif text-white">الهيئة الوطنية للعدول</h1>
              <p className="text-[10px] text-amber-300">المنظومة الرقمية للتوثيق العدلي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <Home className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </button>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 text-center relative overflow-hidden">
          {/* Subtle background badge */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
              <ShieldAlert className="w-10 h-10 text-red-700" />
            </div>

            <div className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3">
              رمز الخطأ 404
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 font-serif mb-3">
              الصفحة غير موجودة
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              عذراً، المحتوى أو المسار الذي تحاول الوصول إليه غير متوفر أو تم نقله ضمن التحديثات الأخيرة للمنظومة التوثيقية.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={() => navigate(sessionToken ? '/dashboard' : '/')}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-950 text-white font-bold text-sm hover:bg-amber-900 shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <Home className="w-4 h-4" />
                <span>{sessionToken ? 'العودة إلى لوحة التحكم' : 'العودة إلى البوابة الرئيسية'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الصفحة السابقة</span>
              </button>
            </div>

            {/* Quick Public Services */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-right">
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 transition-colors flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-amber-950"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>التحقق من صحة رسم</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/public-search-deeds')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 transition-colors flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-amber-950"
              >
                <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>البحث عن الرسوم العدلية</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Sovereign Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 الهيئة الوطنية للعدول - المملكة المغربية. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
};

export default NotFoundPage;

