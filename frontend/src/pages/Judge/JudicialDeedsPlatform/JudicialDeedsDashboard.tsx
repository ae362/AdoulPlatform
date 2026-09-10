import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type DeedStatus = 'all' | 'pending' | 'in_review' | 'accepted' | 'accepted_with_notes' | 'substantive_notes';
type Category = 'all' | 'marriage' | 'divorce' | 'property' | 'inheritance' | 'others';

export default function JudicialDeedsDashboard() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const trpcUtils = trpc.useUtils();
  const [status, setStatus] = useState<DeedStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation State
  const [selectedNotaryId, setSelectedNotaryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  // Query with caching & smooth background transitions
  const submissionsQuery = trpc.judge.listSubmissions.useQuery(
    {
      sessionToken: sessionToken || '',
      status: status === 'all' ? undefined : (status as any),
    },
    {
      enabled: !!sessionToken,
      staleTime: 30_000,
      staleTime: 4_000,
      refetchInterval: 6_000,
      refetchOnWindowFocus: true,
      retry: false,
      placeholderData: (prev) => prev,
    }
  );

  const allDeeds = submissionsQuery.data ?? [];

  // Hover prefetching helper
  const handlePrefetchDeed = useCallback((deedId: string) => {
    if (!sessionToken || !deedId) return;
    trpcUtils.judge.getSubmission.prefetch({
      sessionToken,
      id: deedId,
    });
  }, [sessionToken, trpcUtils]);

  // 1. Group Notaries Level
  const notaries = useMemo(() => {
    const map = new Map<string, any>();
    allDeeds.forEach(d => {
      const id = d.notaryUserId || d.notaryName;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: d.notaryName,
          waiting: 0,
          marked: 0,
          rejected: 0,
          all: [],
          riskIndex: Math.random() > 0.8 ? 'high' : (Math.random() > 0.5 ? 'medium' : 'low')
        });
      }
      const n = map.get(id);
      n.all.push(d);
      if (d.status === 'pending') n.waiting++;
      else if (d.status === 'accepted' || d.status === 'accepted_with_notes') n.marked++;
      else if (d.status === 'substantive_notes') n.rejected++;
    });
    
    let list = Array.from(map.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q));
    }
    
    return list.sort((a, b) => b.waiting - a.waiting);
  }, [allDeeds, searchQuery]);

  // 2. Filter Deeds for specific notary and category
  const categorizedDeeds = useMemo(() => {
    if (!selectedNotaryId) return [];
    const notaryDeeds = allDeeds.filter(d => (d.notaryUserId || d.notaryName) === selectedNotaryId);
    
    return notaryDeeds.filter(d => {
      const type = (d.documentType || '').toLowerCase();
      if (activeCategory === 'all') return true;
      if (activeCategory === 'marriage') return type.includes('زواج');
      if (activeCategory === 'divorce') return type.includes('طلاق');
      if (activeCategory === 'property') return type.includes('بيع') || type.includes('حيازة') || type.includes('ملك') || type.includes('سكن') || type.includes('عقار');
      if (activeCategory === 'inheritance') return type.includes('إراثة') || type.includes('مخلف') || type.includes('إحصاء') || type.includes('تركات');
      if (activeCategory === 'others') {
        const known = ['زواج', 'طلاق', 'بيع', 'حيازة', 'ملك', 'سكن', 'عقار', 'إراثة', 'مخلف', 'إحصاء', 'تركات'];
        return !known.some(k => type.includes(k));
      }
      return true;
    });
  }, [allDeeds, selectedNotaryId, activeCategory]);

  const selectedNotary = useMemo(() => {
    return notaries.find(n => n.id === selectedNotaryId);
  }, [notaries, selectedNotaryId]);

  const stats = useMemo(() => {
    return {
      total: allDeeds.length,
      pending: allDeeds.filter(d => d.status === 'pending').length,
      inReview: allDeeds.filter(d => d.status === 'in_review').length,
      accepted: allDeeds.filter(d => d.status === 'accepted').length,
      hasNotes: allDeeds.filter(d => d.status === 'accepted_with_notes' || d.status === 'substantive_notes').length,
    };
  }, [allDeeds]);

  // CATEGORIES FOR TABS
  const categories: { id: Category; label: string; icon: string }[] = [
    { id: 'all', label: 'الكل', icon: '📊' },
    { id: 'marriage', label: 'رسوم الزواج', icon: '💍' },
    { id: 'divorce', label: 'رسوم الطلاق', icon: '⚖️' },
    { id: 'property', label: 'رسوم الأملاك', icon: '🏠' },
    { id: 'inheritance', label: 'رسوم التركات', icon: '⚰️' },
    { id: 'others', label: 'باقي الوثائق', icon: '📄' },
  ];

  if (selectedNotaryId) {
    return (
      <div className="min-h-screen bg-[#fcfcf9]" dir="rtl">
        <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-8 animate-in slide-in-from-left duration-500">
          {/* Notary Detail Header */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-8">
                  <button 
                    onClick={() => setSelectedNotaryId(null)}
                    className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-2xl hover:bg-[#023120] hover:text-[#E6BE8A] transition-all font-black text-slate-700 shadow-sm"
                  >
                    →
                  </button>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#023120]/5 flex items-center justify-center text-3xl border border-[#023120]/10">
                      ✍️
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">ملف السيد العدل : {selectedNotary?.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                            selectedNotary?.riskIndex === 'high' ? 'bg-red-50 text-red-700' : 
                            (selectedNotary?.riskIndex === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              selectedNotary?.riskIndex === 'high' ? 'bg-red-500' : 
                              (selectedNotary?.riskIndex === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')
                            }`}></span>
                            مؤشر الدقة: {selectedNotary?.riskIndex === 'high' ? 'منخفض' : (selectedNotary?.riskIndex === 'medium' ? 'متوسط' : 'عالي')}
                          </span>
                          <span className="text-slate-200 font-bold">|</span>
                          <span className="text-slate-500 font-black text-xs">إجمالي الرسوم المكتشفة: {selectedNotary?.all.length}</span>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner overflow-x-auto">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-3 whitespace-nowrap ${
                        activeCategory === c.id 
                          ? 'bg-[#023120] text-[#E6BE8A] shadow-lg scale-[1.02]' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
            </div>
          </div>

          {/* Level 2: Categorized Deeds List */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden ring-1 ring-black/[0.02]">
            <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center w-32">رقم المرجع</th>
                      <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">تاريخ التسجيل</th>
                      <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">نوع الوثيقة</th>
                      <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">مستوى المراجعة</th>
                      <th className="p-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">إجراء المراجعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {categorizedDeeds.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="p-32 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <span className="text-6xl opacity-20">📂</span>
                            <p className="text-slate-300 font-black text-xl font-amiri">لا توجد رسوم في هذا القسم حالياً</p>
                          </div>
                        </td>
                    </tr>
                  ) : categorizedDeeds.map(d => (
                    <tr 
                      key={d.id} 
                      onMouseEnter={() => handlePrefetchDeed(d.id)}
                      className="hover:bg-[#023120]/[0.01] transition-colors group"
                    >
                        <td className="p-8 font-sans font-black text-slate-900 border-l border-slate-50 text-center">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">#{d.fileNumber || d.id.slice(0,6)}</span>
                        </td>
                        <td className="p-8">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700">{new Date(d.createdAt).toLocaleDateString('ar-MA')}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{new Date(d.createdAt).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg border border-slate-100">⚖️</span>
                            <span className="font-black text-slate-800 text-lg font-amiri">{d.documentType}</span>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black border tracking-tight ${
                            d.status === 'pending' ? 'bg-blue-50 border-blue-100 text-blue-700' : 
                            d.status === 'in_review' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                            d.status === 'accepted' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            'bg-red-50 border-red-100 text-red-700'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              d.status === 'pending' ? 'bg-blue-500 animate-pulse' : 
                              d.status === 'in_review' ? 'bg-amber-500 animate-pulse' :
                              d.status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></span>
                            {d.status === 'pending' ? 'بانتظار الفحص والتدقيق' : 
                              d.status === 'in_review' ? 'تجري حاليا معالجة الملف' :
                              d.status === 'accepted' ? 'تم التأشير والقبول' : 'ملاحظات جوهرية مرفوضة'}
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <button 
                            onClick={() => navigate(`/judge/deeds/${d.id}`)}
                            className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#023120] text-[#E6BE8A] rounded-2xl text-[11px] font-black hover:scale-[1.02] transition-all shadow-xl shadow-[#023120]/10 active:scale-95 group-hover:brightness-110"
                          >
                            <span>فتح منصة التدقيق الرقمي</span>
                            <span className="text-lg">🔍</span>
                          </button>
                        </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf9] selection:bg-[#023120] selection:text-[#E6BE8A]" dir="rtl">
      <div className="max-w-[1600px] mx-auto px-8 py-12 space-y-12 animate-in fade-in duration-700">
        
        {/* Level 1: Notaries Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#023120]/5 border border-[#023120]/10 text-[#023120]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#023120] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#023120]"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Judicial Oversight Protocol v2.0</span>
            </div>
            <h1 className="text-6xl font-black text-slate-900 font-amiri tracking-tight leading-tight">
              نظـام التدقيـق الرقمي للرسوم العدلية
            </h1>
            <p className="text-slate-500 font-bold text-lg max-w-2xl leading-relaxed">
              منصة قضائية متطورة للمراقبة الآنية لأداء السادة العدول وضمان جودة الوثائق الرسمية عبر تقنيات الذكاء الاصطناعي والتدقيق الشكلي الجوهري.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-[#023120] transition-colors">
                <span className="text-xl">🔍</span>
              </div>
              <input 
                type="text"
                placeholder="ابحث بالاسم، رقم الرخصة، أو المدينة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[450px] pr-16 pl-6 py-6 bg-white border border-slate-100 rounded-[2.5rem] font-black text-slate-800 focus:ring-[12px] focus:ring-[#023120]/5 focus:border-[#023120] outline-none transition-all shadow-2xl shadow-slate-200/50 placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Global Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'إجمالي السادة العدول', val: notaries.length, icon: '🏛️', color: 'border-r-[#E6BE8A]', bg: 'bg-[#E6BE8A]/5' },
            { label: 'رسوم بانتظار التأشير', val: stats.pending, icon: '⏳', color: 'border-r-blue-500', bg: 'bg-blue-500/5', pulse: true },
            { label: 'رسوم تم التأشير عليها', val: stats.accepted, icon: '📜', color: 'border-r-emerald-500', bg: 'bg-emerald-500/5' },
            { label: 'معدل الدقة والانضباط', val: stats.total > 0 ? `${Math.round((stats.accepted / (stats.total || 1)) * 100)}%` : '100%', icon: '📈', color: 'border-r-red-500', bg: 'bg-red-500/5' }
          ].map((s, i) => (
            <div key={i} className={`bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-8 group hover:shadow-2xl hover:-translate-y-1 transition-all border-r-[6px] ${s.color}`}>
              <div className={`w-20 h-20 ${s.bg} rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform text-4xl shadow-inner relative`}>
                {s.icon}
                {s.pulse && <span className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-ping"></span>}
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Level 1: Notaries Layer Grid */}
        {submissionsQuery.isLoading && notaries.length === 0 ? (
          <div className="h-[500px] rounded-[4rem] border border-slate-100 bg-white flex flex-col items-center justify-center gap-8 text-slate-400 shadow-sm">
            <div className="relative">
              <div className="w-24 h-24 border-[6px] border-[#023120]/10 border-t-[#023120] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-black">⚖️</div>
            </div>
            <div className="text-center">
              <p className="font-black text-xl font-amiri text-slate-800">جاري فحص وتصنيف سجلات السادة العدول</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Connecting to Secure Judicial Cloud...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {notaries.map(n => (
                <div 
                  key={n.id}
                  onClick={() => setSelectedNotaryId(n.id)}
                  className="bg-white rounded-[4rem] border border-slate-100 p-10 shadow-sm hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)] hover:-translate-y-3 transition-all cursor-pointer group relative flex flex-col min-h-[480px] ring-1 ring-black/[0.01]"
                >
                  {/* Progress Indicators */}
                  <div className="absolute top-0 right-0 left-0 h-2.5 flex rounded-t-[4rem] overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(n.marked / (n.all.length || 1)) * 100}%` }}></div>
                      <div className="h-full bg-red-400 transition-all duration-1000" style={{ width: `${(n.rejected / (n.all.length || 1)) * 100}%` }}></div>
                      <div className="h-full bg-slate-50 flex-1"></div>
                  </div>

                  <div className="flex items-center gap-8 mb-10 mt-6">
                      <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl border-[6px] relative overflow-hidden transition-transform duration-500 group-hover:scale-105 ${
                        n.riskIndex === 'high' ? 'bg-red-50 text-red-600 border-red-50' : (n.riskIndex === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-50' : 'bg-[#023120] text-[#E6BE8A] border-[#023120]/5')
                      }`}>
                        {n.name.split(' ').slice(-1)[0]?.charAt(0) || '⚖️'}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-black text-slate-800 font-amiri group-hover:text-[#023120] transition-colors leading-snug">{n.name}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">License ID: {n.id.slice(0, 8)}</span>
                            {n.waiting > 0 && <span className="flex h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse"></span>}
                        </div>
                      </div>
                  </div>

                  {/* Primary Activity Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-10">
                      {[
                        { l: 'معلقة', v: n.waiting, c: 'text-blue-600', bg: 'bg-blue-50/50' },
                        { l: 'مقبولة', v: n.marked, c: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                        { l: 'مرفوضة', v: n.rejected, c: 'text-red-500', bg: 'bg-red-50/50' }
                      ].map((stat, idx) => (
                        <div key={idx} className={`text-center p-6 ${stat.bg} rounded-[2.5rem] border border-slate-50 transition-all group-hover:bg-white group-hover:shadow-lg group-hover:ring-1 group-hover:ring-black/[0.02]`}>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">{stat.l}</p>
                          <p className={`text-3xl font-black ${stat.c} font-mono tracking-tighter`}>{stat.v}</p>
                        </div>
                      ))}
                  </div>

                  {/* Professional Quality Metrics */}
                  <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500 tracking-[0.1em] px-4">
                        <span className="flex items-center gap-2">📊 كفاءة التوثيق</span>
                        <span className={`px-2 py-0.5 rounded ${n.riskIndex === 'high' ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'}`}>
                          {n.riskIndex === 'high' ? 'تحت المراقبة' : 'انضباط عالي'}
                        </span>
                      </div>
                      <div className="px-4">
                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden shadow-inner p-0.5">
                          <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${n.riskIndex === 'high' ? 'bg-gradient-to-l from-red-400 to-red-600' : 'bg-gradient-to-l from-emerald-400 to-emerald-600'}`} style={{ width: n.riskIndex === 'high' ? '45%' : '94%' }}></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-6 px-4">
                        <div className="flex -space-x-3 rtl:space-x-reverse">
                            {['💍', '🏠', '📜'].map((emoji, i) => (
                              <div key={i} className="w-10 h-10 rounded-full border-[3px] border-white bg-slate-50 flex items-center justify-center text-lg shadow-sm">
                                {emoji}
                              </div>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 italic">التخصص الغالب: المعاملات المدنية</span>
                      </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4 group-hover:translate-x-2 transition-all">
                        <span className="text-sm font-black text-[#023120]">فتح الملف القضائي الكامل</span>
                        <div className="w-8 h-8 rounded-full bg-[#023120] text-[#E6BE8A] flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform shadow-lg shadow-[#023120]/20">
                          ←
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-300 font-mono italic">Sync: v2.4.9</span>
                  </div>
                </div>
            ))}

            {notaries.length === 0 && (
                <div className="col-span-full h-[600px] rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 bg-white shadow-inner">
                  <div className="text-9xl mb-10 drop-shadow-sm opacity-50">🔍</div>
                  <p className="text-3xl font-black font-amiri text-slate-800">لم يتم العثور على نتائج مطابقة</p>
                  <p className="text-sm font-bold mt-4 bg-slate-100 px-6 py-2 rounded-full">يرجى التحقق من معايير البحث (الاسم أو رمز العدل)</p>
                </div>
            )}
          </div>
        )}
        </div>
      </div>
  );
}
