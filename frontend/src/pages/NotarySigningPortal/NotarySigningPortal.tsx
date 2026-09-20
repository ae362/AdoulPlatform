import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Layers3,
  Cpu,
  Settings,
  FileText,
  Layers,
  Bell,
  Fingerprint,
  History,
  Lock,
  Scale
} from 'lucide-react';
import { SigningDashboard } from './components/SigningDashboard.tsx';
import { DualSessionsList } from './components/DualSessionsList.tsx';
import { SigningTasksList } from './components/SigningTasksList.tsx';
import { AdvancedSettings } from './components/AdvancedSettings.tsx';

type CorridorTab = 'ready_rasms' | 'dual_sessions' | 'signing_tasks' | 'audit_log';

interface NotarySigningPortalProps {
  initialTab?: CorridorTab;
}

export const NotarySigningPortal: React.FC<NotarySigningPortalProps> = ({ initialTab = 'ready_rasms' }) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<CorridorTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="min-h-screen bg-[#0a192f] font-kufi" dir="rtl">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden border-b border-blue-900/50 bg-[linear-gradient(135deg,#071426_0%,#0B254E_35%,#123E7E_70%,#1A56B0_100%)] text-white shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="absolute -left-12 top-8 h-36 w-36 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-44 w-44 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-5 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8b06c]/35 bg-black/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#f2ddb2] backdrop-blur-xl">
                <ShieldCheck className="h-4 w-4" /> Dual Notary Signing Corridor
              </div>
              <div className="space-y-3">
                <h1 className="font-amiri text-4xl font-black leading-tight lg:text-6xl">رواق توقيع العدلين والمصادقة</h1>
                <p className="max-w-2xl text-sm font-bold leading-7 text-white/80 lg:text-base">
                  محرك توقيع عدلي مشترك مؤمن مركزياً: قفل النسخة الرقمية برمز SHA-256، تدبير دورة التوقيع الثنائية، استدعاء العدل الثاني، والتحقق المشفر من تطابق النسخ قبل التوقيع.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[480px]">
              <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Dual Engine</div>
                <div className="mt-3 text-3xl font-black">02</div>
                <div className="mt-2 text-sm font-bold text-white/75">دورة توقيع مشتركة ومقفلة</div>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Device</div>
                <div className="mt-3 flex items-center gap-2 text-3xl font-black"><Cpu className="h-7 w-7" /> STU-540</div>
                <div className="mt-2 text-sm font-bold text-white/75">جاهزية اللوحة والأجهزة المحلية</div>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2ddb2]">Integrity</div>
                <div className="mt-3 flex items-center gap-2 text-3xl font-black"><Lock className="h-7 w-7" /> SHA-256</div>
                <div className="mt-2 text-sm font-bold text-white/75">تطابق مشفر وسجل غير قابل للتلاعب</div>
              </div>
            </div>
          </div>

          {/* Navigation Bar between Corridor Branches */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-black/20 p-2 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ready_rasms')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  activeTab === 'ready_rasms'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>الرسوم الجاهزة للتوقيع</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dual_sessions')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  activeTab === 'dual_sessions'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>جلسات توقيع العدلين</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('signing_tasks')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  activeTab === 'signing_tasks'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>طلبات التوقيع الواردة</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit_log')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  activeTab === 'audit_log'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>سجل التوقيعات والتدقيق</span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-2">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-black text-white transition hover:bg-white/20"
                title="إعدادات الأجهزة والتوقيع"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>الإعدادات</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8c5a0]/40 bg-[#d8c5a0]/15 px-3.5 py-2 text-xs font-black text-[#f2ddb2] transition hover:bg-[#d8c5a0]/25"
                title="العودة للبوابة الرئيسية"
              >
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === 'ready_rasms' && <SigningDashboard />}
        {activeTab === 'dual_sessions' && <DualSessionsList />}
        {activeTab === 'signing_tasks' && <SigningTasksList />}
        {activeTab === 'audit_log' && <DualSessionsList />}
      </div>

      {showSettings && (
        <AdvancedSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default NotarySigningPortal;
