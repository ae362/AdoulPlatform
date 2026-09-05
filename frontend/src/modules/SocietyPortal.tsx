import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type SocietySection =
  | 'home'
  | 'institutional'
  | 'memorandum'
  | 'legal'
  | 'cpd'
  | 'meetings'
  | 'compliance'
  | 'membership'
  | 'circulars';

const ICON_BUILDING = '\u{1F3DB}';

const SECTIONS: Array<{ key: SocietySection; path: string; title: string; subtitle: string; icon: string }> = [
  { key: 'home', path: '/society', title: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629', subtitle: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0648\u0625\u0634\u0639\u0627\u0631\u0627\u062a', icon: '🏠' },
  { key: 'institutional', path: '/society/institutional', title: '\u0627\u0644\u0641\u0636\u0627\u0621 \u0627\u0644\u0645\u0624\u0633\u0633\u064a', subtitle: '\u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u062c\u0645\u0639\u064a\u0629 \u0648\u0627\u0644\u062d\u0648\u0643\u0645\u0629', icon: '🏛️' },
  { key: 'memorandum', path: '/society/memorandum', title: '\u0627\u0644\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a\u0629', subtitle: '\u0645\u0628\u0627\u062f\u0626 \u0648\u0646\u0637\u0627\u0642 \u0627\u0644\u0627\u0633\u062a\u0639\u0645\u0627\u0644', icon: '📜' },
  { key: 'legal', path: '/society/legal', title: '\u0627\u0644\u0641\u0636\u0627\u0621 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0648\u0627\u0644\u0645\u0647\u0646\u064a', subtitle: '\u0645\u0630\u0643\u0631\u0627\u062a\u060c \u0627\u062c\u062a\u0647\u0627\u062f\u0627\u062a\u060c \u062a\u0648\u062c\u064a\u0647\u0627\u062a', icon: '⚖️' },
  { key: 'cpd', path: '/society/cpd', title: '\u0627\u0644\u062a\u0643\u0648\u064a\u0646 \u0627\u0644\u0645\u0633\u062a\u0645\u0631', subtitle: '\u062f\u0648\u0631\u0627\u062a\u060c \u0646\u062f\u0648\u0627\u062a\u060c \u062a\u062a\u0628\u0639 \u0627\u0644\u0631\u0635\u064a\u062f', icon: '🎓' },
  { key: 'meetings', path: '/society/meetings', title: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u0627\u062a \u0639\u0646 \u0628\u064f\u0639\u062f', subtitle: '\u0642\u0627\u0639\u0627\u062a \u0648\u0645\u062d\u0627\u0636\u0631 \u0648\u062a\u0633\u062c\u064a\u0644\u0627\u062a', icon: '🎥' },
  { key: 'compliance', path: '/society/compliance', title: '\u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0648\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a', subtitle: '\u0633\u064a\u0627\u0633\u0627\u062a \u0648\u0633\u062c\u0644 \u0648\u0644\u0648\u062c', icon: '🛡️' },
  { key: 'membership', path: '/society/membership', title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0636\u0648\u064a\u0629', subtitle: '\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a', icon: '🆔' },
  { key: 'circulars', path: '/society/circulars', title: '\u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a \u0648\u0627\u0644\u062a\u0639\u0627\u0645\u064a\u0645', subtitle: '\u0628\u0644\u0627\u063a\u0627\u062a \u0648\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0645\u0633\u062a\u062c\u062f\u0627\u062a', icon: '📢' },
];

function classNames(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

function useReturnTo() {
  const navigate = useNavigate();
  const location = useLocation();

  return React.useCallback(() => {
    const state = location.state as { from?: string } | null;
    const from = state?.from;

    if (typeof from === 'string' && from.startsWith('/')) {
      navigate(from);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/directory');
  }, [location.state, navigate]);
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = useReturnTo();

  const active = React.useMemo(() => {
    const found = SECTIONS.find((s) => location.pathname === s.path);
    if (found) return found.key;
    const prefix = SECTIONS.find((s) => s.path !== '/society' && location.pathname.startsWith(s.path));
    return prefix?.key ?? 'home';
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/society-members', { replace: true, state: location.state });
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans" dir="rtl">
      
      {/* Sidebar - Deep Burgundy & Light Gold Theme */}
      <aside className="w-72 bg-red-950 text-white shadow-xl z-20 border-l-4 border-[#E6BE8A] flex flex-col h-full flex-shrink-0 transition-all duration-300 relative overflow-hidden font-kufi">
        {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
        <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none z-0"></div>
        
        {/* Header */}
        <div className="p-6 bg-black/10 border-b border-[#E6BE8A]/20 relative z-10">
           <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-red-950 text-2xl shadow-lg border border-[#E6BE8A]">
                 {ICON_BUILDING}
              </div>
              <div>
                 <h1 className="text-sm font-bold text-white leading-tight opacity-90">فضاء الأعضاء</h1>
                 <h2 className="text-base font-extrabold text-[#E6BE8A] leading-tight mt-0.5">الجمعية المهنية</h2>
              </div>
           </div>
           <p className="text-[11px] text-red-200 font-medium tracking-wide">منصة التنظيم والتكوين والتواصل</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar relative z-10">
           {SECTIONS.map((s) => (
             <button
                key={s.key}
                type="button"
                onClick={() => navigate(s.path, { state: location.state })}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden text-right ${
                   active === s.key
                   ? 'bg-[#E6BE8A] text-red-950 shadow-md' 
                   : 'text-red-100 hover:bg-[#E6BE8A]/10 hover:text-[#E6BE8A]'
                }`}
             >
                {active === s.key && <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-900"></div>}
                
                <span className={`text-xl mt-0.5 ${active === s.key ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                  {s.icon}
                </span>

                <div className="flex flex-col items-start gap-0.5">
                  <span className={`font-bold text-sm leading-tight ${active === s.key ? 'text-red-950' : ''}`}>{s.title}</span>
                  <span className={`text-[10px] sm:text-xs leading-tight ${active === s.key ? 'text-red-900/80' : 'text-red-200/60 group-hover:text-[#E6BE8A]/70'}`}>{s.subtitle}</span>
                </div>
             </button>
           ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 bg-black/20 border-t border-[#E6BE8A]/20 mt-auto space-y-3 relative z-10">
           
           <div className="rounded-xl border border-[#E6BE8A]/20 bg-[#E6BE8A]/5 p-3 text-xs text-red-100/80">
            <div className="font-extrabold text-[#E6BE8A] mb-1">{'\u062a\u0646\u0628\u064a\u0647 \u0645\u0647\u0646\u064a'}</div>
             {'\u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0635\u0629 \u062d\u0635\u0631\u064a\u0629 \u0644\u0644\u0623\u0639\u0636\u0627\u0621.'}
           </div>

           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E6BE8A] flex items-center justify-center text-sm font-bold text-red-950 border-2 border-white/20 shadow-sm">
                 {user?.full_name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-bold text-white truncate">{user?.full_name || 'عضو الجمعية'}</p>
                 <p className="text-xs text-red-200 truncate">{user?.email}</p>
              </div>
           </div>
           
           <div className="flex gap-2">
             <button
               onClick={returnTo}
               className="flex-1 bg-[#E6BE8A]/10 hover:bg-[#E6BE8A]/20 text-[#E6BE8A] py-2 rounded-lg text-xs font-bold border border-[#E6BE8A]/30 transition-all"
             >
               العودة
             </button>
             <button 
                onClick={handleLogout}
                className="flex-1 bg-red-900 hover:bg-red-800 text-white py-2 rounded-lg text-xs font-bold shadow-sm transition-all border border-red-800"
             >
                تسجيل الخروج
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
         {/* Top Decoration Line */}
         <div className="h-1.5 w-full bg-gradient-to-r from-red-950 via-[#E6BE8A] to-red-950"></div>
         
         {/* Top Bar */}
         <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <span className="text-red-950">🏛️</span>
               <span>فضاء أعضاء الجمعية المهنية</span>
            </h2>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {new Date().toLocaleDateString('ar-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </span>
            </div>
         </header>

         {/* Content Scrollable Area */}
         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-5xl mx-auto">
               {children}
            </div>
         </div>
      </main>
    </div>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-t-4 border-t-red-950">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-extrabold text-red-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function Tile({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#E6BE8A]/50 hover:bg-gradient-to-br hover:from-white hover:to-[#E6BE8A]/5"
    >
      <div className="text-base font-extrabold text-slate-900 group-hover:text-red-950 transition-colors">{title}</div>
      <div className="mt-1 text-sm text-slate-600 group-hover:text-slate-800">{subtitle}</div>
      <div className="mt-4 text-xs font-bold text-[#b08d55] group-hover:text-red-900 transition-colors">{'\u0641\u062a\u062d \u0627\u0644\u0642\u0633\u0645'}</div>
    </button>
  );
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader
        title={'\u0627\u0644\u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0647\u0646\u064a\u0629 \u0644\u0644\u0623\u0639\u0636\u0627\u0621'}
        subtitle={
          '\u062a\u0646\u0638\u064a\u0645 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0647\u0646\u064a\u060c \u0627\u0644\u062a\u0643\u0648\u064a\u0646 \u0627\u0644\u0645\u0633\u062a\u0645\u0631\u060c \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062a\u064a \u0641\u064a \u0641\u0636\u0627\u0621 \u0645\u0624\u0645\u0646.'
        }
        actions={
          <button
            type="button"
            onClick={() => navigate('/society/circulars', { state: location.state })}
            className="rounded-xl bg-red-950 px-4 py-2 text-sm font-bold text-[#E6BE8A] hover:bg-red-900 border border-[#E6BE8A]/30 shadow-sm transition-all"
          >
            {'\u0639\u0631\u0636 \u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-t-4 border-t-red-900">
          <div className="text-right text-xs font-bold text-slate-500">{'\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062c\u062f\u064a\u062f\u0629'}</div>
          <div className="mt-2 text-right text-3xl font-extrabold text-red-950">3</div>
          <div className="mt-1 text-right text-xs text-slate-500">{'\u0628\u0644\u0627\u063a\u0627\u0646 + \u062a\u0646\u0628\u064a\u0647 \u0627\u0633\u062a\u0639\u062c\u0627\u0644\u064a'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-t-4 border-t-[#E6BE8A]">
          <div className="text-right text-xs font-bold text-slate-500">{'\u0631\u0635\u064a\u062f \u0627\u0644\u062a\u0643\u0648\u064a\u0646'}</div>
          <div className="mt-2 text-right text-3xl font-extrabold text-red-950">12</div>
          <div className="mt-1 text-right text-xs text-slate-500">{'\u0633\u0627\u0639\u0629 \u0645\u0639\u062a\u0645\u062f\u0629 \u0647\u0630\u0627 \u0627\u0644\u0641\u0635\u0644'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-t-4 border-t-slate-600">
          <div className="text-right text-xs font-bold text-slate-500">{'\u0627\u062c\u062a\u0645\u0627\u0639\u0627\u062a \u0642\u0627\u062f\u0645\u0629'}</div>
          <div className="mt-2 text-right text-3xl font-extrabold text-slate-900">1</div>
          <div className="mt-1 text-right text-xs text-slate-500">{'\u0646\u062f\u0648\u0629 \u0645\u0647\u0646\u064a\u0629 \u0645\u0628\u0627\u0634\u0631\u0629'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tile
          title={SECTIONS.find((s) => s.key === 'institutional')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'institutional')!.subtitle}
          onClick={() => navigate('/society/institutional', { state: location.state })}
        />
        <Tile
          title={SECTIONS.find((s) => s.key === 'legal')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'legal')!.subtitle}
          onClick={() => navigate('/society/legal', { state: location.state })}
        />
        <Tile
          title={SECTIONS.find((s) => s.key === 'cpd')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'cpd')!.subtitle}
          onClick={() => navigate('/society/cpd', { state: location.state })}
        />
        <Tile
          title={SECTIONS.find((s) => s.key === 'meetings')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'meetings')!.subtitle}
          onClick={() => navigate('/society/meetings', { state: location.state })}
        />
        <Tile
          title={SECTIONS.find((s) => s.key === 'compliance')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'compliance')!.subtitle}
          onClick={() => navigate('/society/compliance', { state: location.state })}
        />
        <Tile
          title={SECTIONS.find((s) => s.key === 'membership')!.title}
          subtitle={SECTIONS.find((s) => s.key === 'membership')!.subtitle}
          onClick={() => navigate('/society/membership', { state: location.state })}
        />
      </div>
    </div>
  );
}

function Institutional() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'institutional')!.title}
        subtitle={'\u0645\u062d\u062a\u0648\u0649 \u0645\u0624\u0633\u0633\u0627\u062a\u064a \u0645\u0646\u0638\u0645: \u0627\u0644\u062a\u0639\u0631\u064a\u0641\u060c \u0627\u0644\u0623\u062c\u0647\u0632\u0629\u060c \u0627\u0644\u0646\u0635\u0648\u0635\u060c \u0648\u0627\u0644\u0645\u062d\u0627\u0636\u0631.'}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm hover:shadow-md transition-shadow hover:border-[#E6BE8A]/30">
          <div className="text-base font-extrabold text-slate-900">{'\u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u062c\u0645\u0639\u064a\u0629'}</div>
          <p className="mt-2 text-sm text-slate-600">
            {'\u0648\u062b\u064a\u0642\u0629 \u062a\u0639\u0631\u064a\u0641\u064a\u0629 \u0645\u0648\u062c\u0632\u0629 \u0648\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0648\u0623\u0647\u062f\u0627\u0641\u0647\u0627.'}
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl border border-[#E6BE8A]/30 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-[#E6BE8A]/10 hover:text-red-950 transition-colors"
          >
            {'\u0639\u0631\u0636 \u0627\u0644\u0648\u062b\u064a\u0642\u0629'}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm hover:shadow-md transition-shadow hover:border-[#E6BE8A]/30">
          <div className="text-base font-extrabold text-slate-900">{'\u0627\u0644\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u0645\u0633\u064a\u0631\u0629'}</div>
          <p className="mt-2 text-sm text-slate-600">
            {'\u0627\u0644\u0647\u064a\u0643\u0644\u0629 \u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a\u0629\u060c \u0627\u0644\u0644\u062c\u0627\u0646\u060c \u0648\u0645\u0633\u0624\u0648\u0644\u064a\u0627\u062a \u0643\u0644 \u062c\u0647\u0627\u0632.'}
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl border border-[#E6BE8A]/30 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-[#E6BE8A]/10 hover:text-red-950 transition-colors"
          >
            {'\u0639\u0631\u0636 \u0627\u0644\u0647\u064a\u0643\u0644\u0629'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Memorandum() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'memorandum')!.title}
        subtitle={'\u0625\u0637\u0627\u0631 \u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0646\u0635\u0629: \u0627\u0644\u0645\u0628\u0627\u062f\u0626\u060c \u0627\u0644\u0646\u0637\u0627\u0642\u060c \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a.'}
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm">
        <div className="text-sm font-extrabold text-slate-900">{'1) \u0627\u0644\u062f\u064a\u0628\u0627\u062c\u0629'}</div>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-700">
          <li>{'\u062a\u0639\u0631\u064a\u0641 \u0628\u0627\u0644\u062c\u0645\u0639\u064a\u0629 \u0623\u0648 \u0627\u0644\u0647\u064a\u0626\u0629 \u0648\u0627\u0644\u0623\u0633\u0627\u0633 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0644\u0625\u062d\u062f\u0627\u062b \u0627\u0644\u0645\u0646\u0635\u0629.'}</li>
          <li>{'\u0627\u0644\u0645\u0628\u0627\u062f\u0626: \u0627\u0644\u0627\u0633\u062a\u0642\u0644\u0627\u0644\u060c \u0627\u0644\u0645\u0647\u0646\u064a\u0629\u060c \u0627\u0644\u0633\u0631\u064a\u0629\u060c \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u064a\u0629.'}</li>
        </ul>
        <div className="mt-6 text-sm font-extrabold text-slate-900">{'2) \u0646\u0637\u0627\u0642 \u0627\u0644\u0627\u0633\u062a\u0639\u0645\u0627\u0644'}</div>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-700">
          <li>{'\u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u062e\u0635\u0635\u0629 \u062d\u0635\u0631\u064a\u064b\u0627 \u0644\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u064a\u0646.'}</li>
          <li>{'\u064a\u0645\u0646\u0639 \u0627\u0633\u062a\u0639\u0645\u0627\u0644\u0647\u0627 \u0644\u0623\u063a\u0631\u0627\u0636 \u063a\u064a\u0631 \u0645\u0647\u0646\u064a\u0629.'}</li>
          <li>{'\u0643\u0644 \u0645\u062d\u062a\u0648\u0649 \u062e\u0627\u0636\u0639 \u0644\u0633\u0631\u064a\u0629 \u0627\u0644\u0645\u0647\u0646\u0629.'}</li>
        </ul>
        <div className="mt-6 text-sm font-extrabold text-slate-900">{'3) \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0644\u0644\u0645\u062d\u062a\u0648\u0649'}</div>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-700">
          <li>{'\u0645\u062d\u062a\u0648\u0649 \u0645\u0647\u0646\u064a \u063a\u064a\u0631 \u0645\u0648\u062c\u0647 \u0644\u0644\u0639\u0645\u0648\u0645.'}</li>
          <li>{'\u0648\u062b\u0627\u0626\u0642 \u062a\u0641\u0633\u064a\u0631\u064a\u0629 \u0644\u0627 \u062a\u064f\u063a\u0646\u064a \u0639\u0646 \u0627\u0644\u0646\u0635 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a.'}</li>
          <li>{'\u0644\u0627 \u064a\u064f\u062d\u062a\u062c \u0628\u0647\u0627 \u062e\u0627\u0631\u062c \u0627\u0644\u0625\u0637\u0627\u0631 \u0627\u0644\u0645\u0647\u0646\u064a.'}</li>
        </ul>
      </div>
    </div>
  );
}

function LegalSpace() {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const documents = [
    { id: 1, title: 'القانون المنظم للمهنة 16.03', type: 'PDF', date: '01/01/2024', category: 'قوانين' },
    { id: 2, title: 'الدليل العملي للعدول', type: 'PDF', date: '15/02/2024', category: 'أدلة' },
    { id: 3, title: 'اجتهادات قضائية في العقار', type: 'PDF', date: '10/03/2024', category: 'اجتهادات' },
    { id: 4, title: 'مذكرة حول التوثيق العدلي', type: 'PDF', date: '05/04/2024', category: 'مذكرات' },
  ];

  const filteredDocs = documents.filter(doc => doc.title.includes(searchTerm));

  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'legal')!.title}
        subtitle={'\u0645\u0630\u0643\u0631\u0627\u062a\u060c \u0634\u0631\u0648\u062d \u0627\u062c\u062a\u0647\u0627\u062f\u0627\u062a \u0642\u0636\u0627\u0626\u064a\u0629\u060c \u062a\u0648\u062c\u064a\u0647\u0627\u062a \u0645\u0647\u0646\u064a\u0629'}
      />
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
         <div className="flex gap-4 mb-6">
            <input 
              type="text" 
              placeholder="بحث في الوثائق..." 
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#E6BE8A] focus:ring-1 focus:ring-[#E6BE8A]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-red-950 text-white px-6 py-2 rounded-lg hover:bg-red-900 transition-colors">
               بحث
            </button>
         </div>

         <div className="space-y-3">
            {filteredDocs.map((doc) => (
               <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#E6BE8A]/30 transition-all">
                  <div className="flex items-center gap-4">
                     <span className="text-3xl text-red-900">📄</span>
                     <div>
                        <h3 className="font-bold text-gray-800">{doc.title}</h3>
                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                           <span className="flex items-center gap-1">📅 {doc.date}</span>
                           <span className="bg-[#E6BE8A]/10 text-[#b08d55] px-2 rounded-full text-xs border border-[#E6BE8A]/20">{doc.category}</span>
                        </div>
                     </div>
                  </div>
                  <button className="text-[#b08d55] hover:text-red-900 font-bold text-sm px-4 py-2 hover:bg-[#E6BE8A]/10 rounded-lg transition-colors">
                     تحميل ⬇
                  </button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function CPDSpace() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'cpd')!.title}
        subtitle={'\u062f\u0648\u0631\u0627\u062a \u0645\u0639\u062a\u0645\u062f\u0629\u060c \u0646\u062f\u0648\u0627\u062a \u0645\u0633\u062c\u0644\u0629\u060c \u062a\u0642\u064a\u064a\u0645\u0627\u062a'}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-gray-500 font-medium mb-2">رصيد التكوين</h3>
            <div className="text-3xl font-extrabold text-red-950">12 <span className="text-sm font-normal text-gray-400">ساعة</span></div>
            <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
               <div className="bg-[#E6BE8A] h-full" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">المطلوب: 20 ساعة سنوياً</p>
         </div>
         
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
            <h3 className="text-gray-800 font-bold mb-4">الدورات المتاحة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1, 2].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-[#E6BE8A] transition-colors cursor-pointer group">
                     <span className="bg-red-50 text-red-900 text-xs px-2 py-1 rounded-md mb-2 inline-block">عن بعد</span>
                     <h4 className="font-bold text-gray-800 group-hover:text-red-950">مستجدات قانون المالية {2024 + i}</h4>
                     <p className="text-sm text-gray-500 mt-1">الجمعة، 15 ماي 10:00 صباحاً</p>
                     <button className="mt-3 w-full bg-red-950 text-white py-2 rounded-lg text-sm hover:bg-red-900">تسجيل الحضور</button>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

function RemoteMeetings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'meetings')!.title}
        subtitle={'\u0642\u0627\u0639\u0627\u062a \u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629\u060c \u0628\u062b \u0645\u0628\u0627\u0634\u0631\u060c \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a'}
      />
      
      <div className="bg-gradient-to-l from-red-950 to-red-900 rounded-2xl p-8 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[#E6BE8A] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
               <span className="bg-[#E6BE8A] text-red-950 px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block">مباشر الآن 🔴</span>
               <h2 className="text-2xl font-bold mb-2">الاجتماع الشهري للمجلس الجهوي</h2>
               <p className="text-red-100 max-w-lg">مناقشة التقرير الأدبي والمالي والتحضير للجمع العام السنوي.</p>
            </div>
            <button className="bg-white text-red-950 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-100 transition-colors">
               الانضمام للاجتماع 🎥
            </button>
         </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
         <h3 className="font-bold text-gray-800 mb-4">أرشيف التسجيلات</h3>
         <div className="space-y-3">
            {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">▶️</div>
                  <div className="flex-1">
                     <h4 className="font-bold text-gray-700">ورشة عمل حول الرقمنة</h4>
                     <p className="text-xs text-gray-500">تم التسجيل بتاريخ 12/0{i}/2024</p>
                  </div>
                  <button className="text-sm text-[#b08d55] font-bold">مشاهدة</button>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function Compliance() {
   return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'compliance')!.title}
        subtitle={'\u0633\u064a\u0627\u0633\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629\u060c \u0633\u0631\u064a\u0629 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0627\u062a\u060c \u0633\u062c\u0644 \u0627\u0644\u0648\u0644\u0648\u062c\u0627\u062a'}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">حالة الامتثال</h3>
            <div className="flex items-center gap-4 mb-6">
               <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center text-green-600 font-bold text-xl">
                  100%
               </div>
               <div>
                  <p className="font-bold">وضعيتك سليمة</p>
                  <p className="text-xs text-gray-500">آخر تحديث: اليوم</p>
               </div>
            </div>
            <div className="space-y-2">
               {['المصادقة على ميثاق الأخلاقيات', 'تحديث المعطيات الشخصية', 'تأكيد البريد المهني'].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                     <span className="text-green-500">✔</span> {item}
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">سجل الولوجات الحديثة</h3>
            <div className="space-y-3">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-50">
                     <span className="text-gray-600">تسجيل دخول ناجح</span>
                     <span className="text-gray-400 font-mono">192.168.1.{10+i}</span>
                     <span className="text-gray-500">منذ {i} ساعة</span>
                  </div>
               ))}
            </div>
            <button className="w-full mt-4 text-[#b08d55] text-sm font-bold border border-[#E6BE8A]/30 rounded-lg py-2 hover:bg-[#E6BE8A]/10">
               عرض السجل الكامل
            </button>
         </div>
      </div>
    </div>
   );
}

function Membership() {
   const { user } = useAuth();
   return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'membership')!.title}
        subtitle={'\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a'}
      />
      
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
         <div className="bg-red-950 p-8 text-white flex flex-col items-center justify-center md:w-1/3">
            <div className="w-32 h-32 rounded-full border-4 border-[#E6BE8A] bg-white text-red-950 flex items-center justify-center text-4xl mb-4">
               {user?.full_name?.charAt(0) || '👤'}
            </div>
            <h2 className="text-xl font-bold">{user?.full_name || 'الاسم الكامل'}</h2>
            <p className="text-[#E6BE8A] opacity-80 mt-1">رقم العضوية: 84920</p>
            <div className="mt-6">
               <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm border border-green-500/30">عضو نشط ✅</span>
            </div>
         </div>
         
         <div className="p-8 flex-1">
            <h3 className="font-bold text-gray-800 mb-6 border-b pb-2">المعلومات المهنية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs text-gray-500 mb-1">البريد الإلكتروني</label>
                  <div className="font-medium text-gray-800">{user?.email}</div>
               </div>
               <div>
                  <label className="block text-xs text-gray-500 mb-1">الهاتف</label>
                  <div className="font-medium text-gray-800">+212 600 000 000</div>
               </div>
               <div>
                  <label className="block text-xs text-gray-500 mb-1">تاريخ الانخراط</label>
                  <div className="font-medium text-gray-800">01/01/2020</div>
               </div>
               <div>
                  <label className="block text-xs text-gray-500 mb-1">المجلس الجهوي</label>
                  <div className="font-medium text-gray-800">الرباط</div>
               </div>
            </div>
            
            <div className="mt-8 flex gap-3">
               <button className="bg-red-950 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-900">تحديث البيانات</button>
               <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">طباعة بطاقة العضوية</button>
            </div>
         </div>
      </div>
    </div>
   );
}

function Circulars() {
   const circulars = [
      { id: 1, title: 'تذكير بموعد الجمع العام', date: '2024-05-01', priority: 'high', content: 'نذكر السادة الأعضاء بموعد الجمع العام المقرر عقده يوم...' },
      { id: 2, title: 'مستجدات منصة رقيم', date: '2024-04-20', priority: 'medium', content: 'تم تحديث منصة رقيم لإضافة الميزات التالية...' },
      { id: 3, title: 'تهنئة بمناسبة العيد', date: '2024-04-10', priority: 'low', content: 'بمناسبة حلول العيد، يتقدم رئيس الجمعية بأحر التهاني...' },
   ];

   return (
    <div className="space-y-6">
      <PageHeader
        title={SECTIONS.find((s) => s.key === 'circulars')!.title}
        subtitle={'\u0628\u0644\u0627\u063a\u0627\u062a \u0648\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0645\u0633\u062a\u062c\u062f\u0627\u062a'}
      />
      
      <div className="space-y-4">
         {circulars.map((item) => (
            <div key={item.id} className={`bg-white p-6 rounded-2xl border-r-4 shadow-sm hover:shadow-md transition-shadow ${
               item.priority === 'high' ? 'border-red-500' : item.priority === 'medium' ? 'border-amber-500' : 'border-blue-500'
            }`}>
               <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                  <span className="text-xs text-gray-400">{item.date}</span>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
               <div className="mt-4 flex justify-end">
                  <button className="text-sm font-bold text-[#b08d55] hover:underline">قراءة المزيد ←</button>
               </div>
            </div>
         ))}
      </div>
    </div>
   );
}

function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
        {'\u0633\u064a\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u062a\u062f\u0631\u064a\u062c\u064a\u064b\u0627 (\u0645\u062d\u062a\u0648\u0649 + \u0635\u0644\u0627\u062d\u064a\u0627\u062a + \u0623\u062f\u0648\u0627\u062a \u0625\u062f\u0627\u0631\u0629).'}
      </div>
    </div>
  );
}

export function SocietyPortal() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/society-members" replace />;
  if (user.role !== 'society_member') return <Navigate to="/unauthorized" replace />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/institutional" element={<Institutional />} />
        <Route path="/memorandum" element={<Memorandum />} />
        <Route path="/legal" element={<LegalSpace />} />
        <Route path="/cpd" element={<CPDSpace />} />
        <Route path="/meetings" element={<RemoteMeetings />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/circulars" element={<Circulars />} />
        <Route path="*" element={<Navigate to="/society" replace />} />
      </Routes>
    </Shell>
  );
}

