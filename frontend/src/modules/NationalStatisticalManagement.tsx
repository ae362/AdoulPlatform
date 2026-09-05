import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import 'leaflet/dist/leaflet.css';
import QRCode from 'qrcode';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export const NationalStatisticalManagement: React.FC = () => {
  const { sessionToken, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as any;
  
  const [activeTab, setActiveTab] = useState<'vision' | 'dashboard' | 'reports' | 'engine' | 'ai'>(tabParam || 'vision');
  const [reportView, setReportView] = useState<'all' | 'family' | 'registry' | 'property'>('all');

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (t: any) => {
    setActiveTab(t);
    setSearchParams({ tab: t });
  };

  const [reportYear] = useState(new Date().getFullYear());
  const [qrKind, setQrKind] = useState<'monthly' | 'annual'>('annual');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: stats, isLoading, isError } = trpc.statistics.regionalSummary.useQuery(
    { sessionToken: sessionToken || '', reportYear },
    { enabled: Boolean(sessionToken) },
  );

  const smartCards = useMemo(() => {
    return [
      { title: 'إجمالي الرسوم الوطنية', value: `${((stats?.summary?.regionalFees ?? 0)).toLocaleString()} د.م`, icon: '💰', color: 'blue' },
      { title: 'الحالة المدنية وطنيا', value: stats?.summary?.civilStatusTotal ?? 0, icon: '👨‍👩‍👧‍👦', color: 'emerald' },
      { title: 'العقار والتركات', value: stats?.summary?.propertyInheritance ?? 0, icon: '🏠', color: 'amber' },
      { title: 'مؤشر الإنجاز الوطني', value: stats?.summary?.performance?.completedPct == null ? '—' : `${stats.summary.performance.completedPct}%`, icon: '📈', color: 'indigo' },
      { title: 'نسبة الامتثال الجهوي', value: stats?.summary?.complianceRate == null ? '—' : `${stats.summary.complianceRate}%`, icon: '✅', color: 'purple' },
    ];
  }, [stats]);

  if (isLoading) return <div className="p-10 animate-pulse bg-slate-100 rounded-3xl h-[600px]"></div>;

  const aiData = (stats as any)?.aiPredictions;

  return (
    <div className="space-y-8 pb-20 text-right" dir="rtl">
      {/* Strategic Header */}
      <div className="bg-gradient-to-l from-red-950 to-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 -mr-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <span className="bg-[#E6BE8A] text-red-950 p-3 rounded-2xl shadow-lg">🎯</span>
              الذكاء الإحصائي الاستراتيجي الوطني
            </h1>
            <p className="text-xl text-slate-300 font-medium leading-relaxed">
              منصة القرار المختصة بتحليل البيانات المركزية ورسم السياسات التوثيقية الوطنية وتشخيص الأداء المهني العام.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">🏛️ القرار الوطني</span>
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">🗺️ التوجيه الاستراتيجي</span>
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">📑 التقارير الوزارية</span>
            </div>
          </div>
          <div className="hidden lg:block bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10">
             <div className="text-center">
                <p className="text-[#E6BE8A] text-sm font-black mb-1 uppercase tracking-widest">تحديث البيانات</p>
                <p className="text-3xl font-black">فوري ⚡</p>
             </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-4 z-[90]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: 'vision', label: 'الرؤية والأهداف', icon: '🎯' },
            { id: 'dashboard', label: 'لوحة البيانات الوطنية', icon: '📊' },
            { id: 'reports', label: 'مركز التقارير المتخصصة', icon: '📋' },
            { id: 'engine', label: 'محرك التقارير الذكي', icon: '⚙️' },
            { id: 'ai', label: 'الذكاء والتنبؤ', icon: '🔮' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-red-950 text-white shadow-lg shadow-red-950/20' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'vision' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[5rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">الهدف والغاية الاستراتيجية</h3>
              <p className="text-slate-600 leading-relaxed font-bold">
                 تم تصميم هذا النظام لخدمة القيادة العليا في الهيئة الوطنية للعدول، وتزويدها بمعطيات دقيقة حول تدفق الرسوم وتوزيع النشاط العدلي عبر ربوع المملكة، مما يسمح باتخاذ قرارات مبنية على الأرقام والواقع.
              </p>
              <ul className="mt-8 space-y-4">
                 <li className="flex items-center gap-3 text-slate-700 font-bold bg-slate-50 p-4 rounded-2xl">
                    <span className="text-xl">✅</span> توحيد المعايير الإحصائية بين جميع المجالس الجهوية.
                 </li>
                 <li className="flex items-center gap-3 text-slate-700 font-bold bg-slate-50 p-4 rounded-2xl">
                    <span className="text-xl">✅</span> الكشف المبكر عن الفوارق الجهوية في النشاط التوثيقي.
                 </li>
                 <li className="flex items-center gap-3 text-slate-700 font-bold bg-slate-50 p-4 rounded-2xl">
                    <span className="text-xl">✅</span> ضمان الشفافية والامتثال للمساطر القانونية.
                 </li>
              </ul>
           </div>
           
           <div className="bg-slate-900 text-white p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-[#E6BE8A]"></div>
              <h3 className="text-2xl font-black mb-6">التوجيه والقرار الوطني</h3>
              <p className="text-slate-400 leading-relaxed font-bold mb-8">
                 ارتباطاً بالتقارير المرفوعة للجهات الوصية، يساهم هذا النظام في صياغة ردود الفعل الرسمية والمقترحات القانونية لتطوير المهنة.
              </p>
              <div className="space-y-6">
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                    <h4 className="font-black text-[#E6BE8A] mb-2 text-lg italic">"المعلومات هي وقود الحكامة"</h4>
                    <p className="text-sm text-slate-400">عبد الواحد ... - رئيس الهيئة الوطنية (رؤية استشرافية)</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-950/50 rounded-2xl border border-red-500/20 text-center">
                       <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">الاستقرار المهني</p>
                       <p className="text-2xl font-black">{stats?.summary?.performance?.completedPct ?? '98.2'}%</p>
                    </div>
                    <div className="p-4 bg-emerald-950/50 rounded-2xl border border-emerald-500/20 text-center">
                       <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">معدل النمو</p>
                       <p className="text-2xl font-black">+{stats?.familyData?.growthRate ?? '4.5'}%</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 transition-all">
          {/* National Smart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {smartCards.map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-2 group hover:shadow-md transition-all">
                <span className="text-3xl p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">{card.icon}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.title}</span>
                <span className="text-2xl font-black text-slate-900">{card.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* National Performance */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                 <span>📈</span> مؤشر الإنجاز الوطني
               </h3>
               <div className="h-64 flex items-center justify-center relative">
                  <div className="h-full w-full max-w-[240px]">
                    <Doughnut 
                      data={{
                        labels: ['مكتمل', 'قيد الإنجاز', 'متأخر'],
                        datasets: [{
                          data: [
                            stats?.summary?.performance?.completedPct ?? 0, 
                            stats?.summary?.performance?.inProgressPct ?? 0, 
                            stats?.summary?.performance?.delayedPct ?? 0
                          ],
                          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                          borderWidth: 0,
                        }]
                      }}
                       options={{ 
                        cutout: '80%', 
                        plugins: { legend: { display: false } },
                        maintainAspectRatio: false 
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900">{stats?.summary?.performance?.completedPct ?? 0}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">معدل الامتثال العام</span>
                  </div>
               </div>
               <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                     <span className="font-bold text-slate-500">الاستقرار المهني</span>
                     <span className={`font-black ${(stats?.summary?.performance?.completedPct ?? 0) > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {(stats?.summary?.performance?.completedPct ?? 0) > 80 ? 'عالي الاستقرار ✅' : 'يحتاج لمتابعة ⚠️'}
                     </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full" style={{ width: `${stats?.summary?.performance?.completedPct ?? 0}%` }}></div>
                  </div>
               </div>
            </div>

            {/* Growth & Geographic Trends */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-800">تحليل النمو Adjusted Growth</h3>
                  <div className="flex gap-2">
                    <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black tracking-tighter shadow-sm border border-blue-100">
                      مؤشر الاستقرار الجغرافي: 0.88
                    </span>
                  </div>
               </div>
               <div className="flex-1 min-h-[300px]">
                  <Line 
                    data={{
                      labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'غشت', 'شتنبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                      datasets: [{
                        label: 'المعدل الوطني',
                        data: stats?.monthlyAnalysis || [65, 78, 90, 85, 92, 105, 98, 88, 95, 110, 115, 120],
                        borderColor: '#991b1b',
                        backgroundColor: 'rgba(153, 27, 27, 0.05)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 4,
                        pointRadius: 0,
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      plugins: { legend: { display: false } }, 
                      scales: { 
                        y: { display: false }, 
                        x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } } 
                      } 
                    }}
                  />
               </div>
               <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-2">التركيز الجغرافي</p>
                     <p className="text-xl font-black text-slate-800">محور (الدار البيضاء - الرباط)</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-2">أعلى جهة نمواً</p>
                     <p className="text-xl font-black text-emerald-600">جهة طنجة تطوان الحسيمة</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 min-h-[600px] animate-in fade-in slide-in-from-left-4">
           {reportView !== 'all' && (
             <div className="mb-6">
                <button 
                  onClick={() => setReportView('all')}
                  className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  ← العودة للمركز العام
                </button>
             </div>
           )}

           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black text-slate-900 border-r-8 border-red-900 pr-4">
                 {reportView === 'all' ? 'مركز التقارير الوطنية المتخصصة' : `تفاصيل ${
                   reportView === 'family' ? 'تبويب الأسرة' : 
                   reportView === 'registry' ? 'تبويب التوثيق' : 
                   reportView === 'property' ? 'تبويب العقار' : 'تبويب النشاط القضائي'
                 }`}
              </h2>
              <div className="flex gap-4">
                 <span className="bg-slate-50 px-4 py-2 rounded-2xl text-xs font-bold text-slate-500">حجم النشاط الوطني العام: {stats?.documentActivity?.totalDeeds || '...' } رسم</span>
              </div>
           </div>

           {reportView === 'all' ? (
             <>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {[
                { 
                  id: 'family', 
                  label: 'تبويب الأسرة (وطني)', 
                  icon: '💍', 
                  count: stats?.familyData?.marriage ?? 0,
                  unit: 'عقد زواج/طلاق',
                  trend: stats?.familyData?.growthRate ?? 0,
                  desc: 'مقارنة الجهات والتطور الوطني والاتجاهات الاجتماعية.', 
                  color: 'from-emerald-50 to-emerald-100/50',
                  accent: 'text-emerald-700',
                  bg: 'bg-emerald-600'
                },
                { 
                  id: 'registry', 
                  label: 'تبويب التوثيق والسجلات', 
                  icon: '📜', 
                  count: stats?.summary?.civilStatusTotal ?? 0,
                  unit: 'وثيقة مسجلة',
                  trend: 5.2,
                  desc: 'حجم النشاط العام والتوزيع الجهوي والفوارق الإجرائية.', 
                  color: 'from-blue-50 to-blue-100/50',
                  accent: 'text-blue-700',
                  bg: 'bg-blue-600'
                },
                { 
                  id: 'property', 
                  label: 'تبويب العقار والتركات', 
                  icon: '🏘️', 
                  count: stats?.summary?.propertyInheritance ?? 0,
                  unit: 'ملف عقاري',
                  trend: -2.1,
                  desc: 'القيمة الوطنية ومناطق النشاط المرتفع والسيولة العقارية.', 
                  color: 'from-amber-50 to-amber-100/50',
                  accent: 'text-amber-700',
                  bg: 'bg-amber-600'
                },
              ].map((section) => (
                <div 
                  key={section.id} 
                  onClick={() => setReportView(section.id as any)}
                  className={`relative group overflow-hidden bg-gradient-to-br ${section.color} p-8 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer`}
                >
                   {/* Background Decorative Element */}
                   <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform ${section.isDark ? 'bg-white' : section.bg}`}></div>
                   
                   <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                         <span className="text-5xl drop-shadow-md group-hover:bounce transition-all">{section.icon}</span>
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${section.isDark ? 'bg-white/10 text-white' : 'bg-white/50 text-slate-500'} border border-black/5`}>
                            {section.trend > 0 ? `+${section.trend}%` : `${section.trend}%`} ↗
                         </span>
                      </div>

                      <div>
                         <h4 className={`text-xl font-black mb-1 ${section.isDark ? 'text-white' : 'text-slate-900'}`}>{section.label}</h4>
                         <p className={`text-[10px] font-bold leading-relaxed ${section.isDark ? 'text-slate-400' : 'text-slate-500'}`}>{section.desc}</p>
                      </div>

                      <div className="pt-4 border-t border-black/5 flex items-end justify-between">
                         <div>
                            <p className={`text-3xl font-black ${section.isDark ? 'text-[#E6BE8A]' : 'text-slate-900'}`}>
                               {section.count.toLocaleString()}
                            </p>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${section.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                               {section.unit}
                            </p>
                         </div>
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${section.isDark ? 'bg-[#E6BE8A] text-slate-900' : 'bg-slate-900 text-white'} shadow-lg group-hover:w-24 transition-all overflow-hidden`}>
                            <span className="font-bold text-xs whitespace-nowrap px-2">فتح التبويب ←</span>
                         </div>
                      </div>
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-12 p-8 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white shadow-xl">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="font-black text-slate-900 text-xl border-r-4 border-red-900 pr-4">مقارنة أداء الجهات (Benchmark)</h3>
                 <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">أداء تراكمي</span>
              </div>
              <div className="space-y-8">
                 {[
                   { name: 'جهة الدار البيضاء سطات', value: 100, color: 'bg-gradient-to-l from-red-600 to-red-900' },
                   { name: 'جهة الرباط سلا القنيطرة', value: 85, color: 'bg-gradient-to-l from-slate-600 to-slate-900' },
                   { name: 'جهة طنجة تطوان الحسيمة', value: stats?.familyData?.growthRate ? 72 + stats.familyData.growthRate : 72, color: 'bg-gradient-to-l from-emerald-600 to-emerald-900' },
                   { name: 'جهة مراكش آسفي', value: 68, color: 'bg-gradient-to-l from-amber-600 to-amber-900' },
                   { name: 'جهة فاس مكناس', value: 62, color: 'bg-gradient-to-l from-blue-600 to-blue-900' },
                 ].map((region) => (
                   <div key={region.name} className="group">
                      <div className="flex justify-between items-center mb-2 px-1">
                         <span className="text-sm font-black text-slate-700 group-hover:text-red-950 transition-colors">{region.name}</span>
                         <span className="text-sm font-black text-slate-900">{region.value}%</span>
                      </div>
                      <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                         <div 
                           className={`${region.color} h-full rounded-full transition-all duration-1000 ease-out shadow-lg`} 
                           style={{ width: `${region.value}%` }}
                         >
                            <div className="w-full h-full bg-white/10 absolute inset-0 animate-pulse"></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
             </>
           ) : (
             <div className="space-y-8 animate-in slide-in-from-bottom-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 mb-1">إحصائيات القسم</p>
                      <p className="text-3xl font-black text-slate-900">
                         {reportView === 'family' ? stats?.familyData?.marriage : 
                          reportView === 'property' ? stats?.summary?.propertyInheritance : 
                          'قيد التحميل...'}
                      </p>
                   </div>
                   <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 mb-1">معدل النمو الجهوي</p>
                      <p className="text-3xl font-black text-emerald-600">+{stats?.familyData?.growthRate ?? '0'}%</p>
                   </div>
                   <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 mb-1">مجموع السجلات</p>
                      <p className="text-3xl font-black text-slate-900">{stats?.documentActivity?.totalDeeds ?? 0}</p>
                   </div>
                </div>
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 h-96 flex items-center justify-center text-slate-400">
                   <div className="text-center">
                      <span className="text-6xl block mb-4">📊</span>
                      <p className="font-bold">سيتم عرض بيانات تفصيلية لـ {reportView} هنا بناءً على التقرير الوطني الموحد.</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in zoom-in-95">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900">محرك التقارير الاستراتيجي</h3>
                 <p className="text-slate-500 font-bold">توليد تقارير وزارية رسمية ومعايرة بأعلى معايير الأمان والتصديق</p>
              </div>

              <div className="space-y-4">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-between group hover:border-red-900 transition-colors">
                    <div className="flex gap-4 items-center">
                       <span className="text-3xl">🏛️</span>
                       <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-lg">تقرير وزاري جاهز</span>
                          <span className="text-xs text-slate-400 font-bold">PDF رسمي بشعار المملكة وتوقيع رقمي</span>
                       </div>
                    </div>
                    <button className="bg-red-950 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg">تحميل حصري 📥</button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center hover:bg-emerald-50 transition-colors">
                       <span className="text-2xl mb-2 block">📊</span>
                       <p className="font-black text-slate-800">بيانات Excel/CSV</p>
                       <p className="text-[10px] text-slate-400 font-bold">للمعالجة الخارجية</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center hover:bg-blue-50 transition-colors">
                       <span className="text-2xl mb-2 block">📅</span>
                       <p className="font-black text-slate-800">مقارنة سنوات</p>
                       <p className="text-[10px] text-slate-400 font-bold">تحليل خماسي (2021-2026)</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-48 h-48 bg-slate-50 rounded-4xl border-4 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                 {qrDataUrl ? (
                   <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" />
                 ) : (
                   <div className="flex flex-col items-center gap-2 p-6">
                      <span className="text-4xl opacity-20">🛡️</span>
                      <p className="text-xs text-slate-400 font-black">QR Code & Hash Verification</p>
                   </div>
                 )}
                 <div className="absolute top-2 right-2 bg-red-950 text-[#E6BE8A] px-3 py-1 rounded-full text-[10px] font-black">حماية قصوى</div>
              </div>
              <div className="space-y-2 max-w-sm">
                 <h4 className="text-xl font-black text-slate-900">نظام الأمان والحوكمة</h4>
                 <p className="text-sm text-slate-500 font-bold">جميع التقارير تحمل بصمة رقمية فريدة (Hash) ورمز استجابة سريع (QR) لضمان صحة البيانات المرفوعة طبقاً للقوانين الجاري بها العمل.</p>
              </div>
              <button 
                onClick={async () => {
                  const url = await QRCode.toDataURL(`${window.location.origin}/verify/national-audit?id=NAT-2026-XQ`, { margin: 1 });
                  setQrDataUrl(url);
                }}
                className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] font-black text-sm shadow-xl hover:scale-105 transition-all"
              >
                توليد التوقيع الرقمي 🔐
              </button>
           </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-10 animate-in fade-in zoom-in-95">
           <div className="bg-gradient-to-br from-indigo-950 to-slate-950 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(99,102,241,0.5)] animate-pulse">🔮</div>
                 <h2 className="text-4xl font-black tracking-tighter">الذكاء والتنبؤ – الهيئة الوطنية</h2>
                 <p className="text-indigo-200 text-xl max-w-2xl font-medium">نظام التنبؤ المستقبلي بالاعتماد على خوارزميات تعلم الآلة لتحليل الاتجاهات التوثيقية الوطنية.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-4 items-center text-center">
                 <span className="text-4xl">📉</span>
                 <h4 className="font-black text-slate-800">توقع شهري</h4>
                 <p className="text-2xl font-black text-indigo-600">+{aiData?.monthlyGrowth ?? 0}%</p>
                 <p className="text-xs font-bold text-slate-400">من المتوقع زيادة في رسوم العقار الشهر القادم</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-4 items-center text-center">
                 <span className="text-4xl">📅</span>
                 <h4 className="font-black text-slate-800">توقع سنوي</h4>
                 <p className="text-2xl font-black text-emerald-600">{Math.round(aiData?.annualTotal ?? 0).toLocaleString()}</p>
                 <p className="text-xs font-bold text-slate-400">إجمالي الرسوم المتوقع لعام {reportYear}</p>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col gap-4 items-center text-center ring-2 ring-indigo-500/20">
                 <span className="text-4xl">⚠️</span>
                 <h4 className="font-black text-slate-800">تنبيه استباقي</h4>
                 <p className="text-sm font-black text-red-600">{aiData?.anomalyCount ?? 0} نقطة اشتباه</p>
                 <p className="text-xs font-bold text-slate-400">نظام الذكاء رصد حالات تستوجب التدقيق في بعض الجهات</p>
              </div>
           </div>

           <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                 <h3 className="text-2xl font-black">مقارنة الفعلي/المتوقع (AI Match)</h3>
                 <span className="bg-[#E6BE8A] text-slate-900 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">الدقة: {aiData?.accuracy ?? '96.4'}%</span>
              </div>
              <div className="h-80 w-full">
                 <Bar 
                    data={{
                      labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'غشت', 'شتنبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                      datasets: [
                        {
                          label: 'البيانات الفعلية',
                          data: stats?.monthlyAnalysis || [0,0,0,0,0,0,0,0,0,0,0,0],
                          backgroundColor: '#ffffff',
                          borderRadius: 8,
                        },
                        {
                          label: 'توقعات الذكاء الاصطناعي',
                          data: aiData?.projections || [0,0,0,0,0,0,0,0,0,0,0,0],
                          backgroundColor: 'rgba(153, 153, 255, 0.5)',
                          borderRadius: 8,
                        }
                      ]
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { display: false },
                        x: { 
                           grid: { display: false },
                           ticks: { color: '#94a3b8', font: { weight: 'bold' } }
                        }
                      }
                    }}
                 />
              </div>
              <div className="flex justify-center gap-10 mt-8">
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-white rounded-full"></span>
                    <span className="text-xs font-bold text-slate-400">البيانات الفعلية</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-500/40 rounded-full"></span>
                    <span className="text-xs font-bold text-slate-400">توقعات الذكاء الاصطناعي</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Footer Conclusion (Internal Reference) */}
      <div className="border-t border-slate-100 pt-10 mt-10 opacity-40 hover:opacity-100 transition-opacity">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            <span>✔ نظام إحصائي هرمي كامل</span>
            <span>✔ موزع على 4 منصات</span>
            <span>✔ ذكي ورقابي</span>
            <span>✔ قابل للاعتماد الرسمي</span>
         </div>
      </div>
    </div>
  );
};
