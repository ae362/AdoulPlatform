import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Layers3,
  Cpu,
  Settings,
} from 'lucide-react';
import { SigningDashboard } from './components/SigningDashboard.tsx';
import { AdvancedSettings } from './components/AdvancedSettings.tsx';

export const NotarySigningPortal: React.FC = () => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4ead6_0%,#f8fbfd_34%,#dfeae4_100%)]" dir="rtl">
      <div className="relative overflow-hidden border-b border-[#d8c5a0]/70 bg-[linear-gradient(135deg,#0d3129_0%,#12473d_48%,#1a6755_100%)] text-white shadow-[0_30px_80px_rgba(13,49,41,0.22)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-[#d8b06c]/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-5 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8b06c]/35 bg-black/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#f2ddb2] backdrop-blur-xl">
                <ShieldCheck className="h-4 w-4" /> Secure Signing Corridor
              </div>
              <div className="space-y-3">
                <h1 className="font-amiri text-4xl font-black leading-tight lg:text-6xl">رواق التوقيع العدلي المؤمّن</h1>
                <p className="max-w-2xl text-sm font-bold leading-7 text-white/80 lg:text-base">
                  واجهة تشغيل جديدة للرسوم المضمّنة، تركز على وضوح حالة التوقيع، جاهزية المعدات، وسرعة الانتقال إلى مساحة الإمضاء دون المساس بأي خطوة من دورة العمل الحالية.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[480px]">
              <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Signing Flow</div>
                <div className="mt-3 text-3xl font-black">02</div>
                <div className="mt-2 text-sm font-bold text-white/75">عدلان، مسار واحد، تسجيل مؤمن</div>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Device</div>
                <div className="mt-3 flex items-center gap-2 text-3xl font-black"><Cpu className="h-7 w-7" /> STU-540</div>
                <div className="mt-2 text-sm font-bold text-white/75">متابعة مباشرة لجاهزية اللوحة</div>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Workspace</div>
                <div className="mt-3 flex items-center gap-2 text-3xl font-black"><Layers3 className="h-7 w-7" /> Live</div>
                <div className="mt-2 text-sm font-bold text-white/75">لوحة تشغيل ومتابعة التوقيع</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-black/15 px-5 py-4 backdrop-blur-xl">
            <div className="text-sm font-bold text-white/75">الوصول إلى الإعدادات المتقدمة متاح لتخصيص خيارات التوقيع والتحقق.</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                <span>الإعدادات المتقدمة</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c5a0]/40 bg-[#d8c5a0]/15 px-4 py-2.5 text-xs font-black text-[#f2ddb2] transition hover:bg-[#d8c5a0]/25"
                title="العودة للبوابة الرئيسية"
              >
                <span>العودة للرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <SigningDashboard />
      </div>

      {showSettings && (
        <AdvancedSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default NotarySigningPortal;
