import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../trpc';
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
  Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

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

export const JudicialOversightManagement: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'reports' | 'engine'>('dashboard');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: stats, isLoading, isError, error } = trpc.statistics.regionalSummary.useQuery(
    { sessionToken: sessionToken || '', reportYear: new Date().getFullYear() },
    { enabled: Boolean(sessionToken), retry: 1 },
  );

  const qrMutation = trpc.statistics.getReportQrPayload.useQuery(
    { sessionToken: sessionToken || '', reportYear: new Date().getFullYear(), kind: 'annual' },
    { enabled: false }
  );

  const statsMeta = useMemo(() => {
    return [
      { title: 'الرقابة', count: (stats?.documentActivity?.totalDeeds ?? 0).toLocaleString(), desc: 'إجمالي الرسوم المراقبة وطنيا', icon: '⚖️' },
      { title: 'التفتيش', count: (stats?.judicialActivity?.notifications ?? 0).toLocaleString(), desc: 'عمليات تفتيش وإشعارات مسجلة', icon: '🔎' },
      { title: 'المطابقة القانونية', count: stats?.summary?.performance?.completedPct == null ? '—' : `${100 - (stats?.documentActivity?.delaysDetected ?? 0) / (stats?.documentActivity?.totalDeeds || 1) * 100}%`, desc: 'نسبة المطابقة القانونية المحسوبة', icon: '🛡️' },
    ];
  }, [stats]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-6 animate-pulse bg-white rounded-3xl h-[600px] border border-slate-100 shadow-sm">
      <div className="w-20 h-20 bg-slate-100 rounded-full"></div>
      <div className="h-6 w-64 bg-slate-100 rounded-lg"></div>
      <div className="h-4 w-48 bg-slate-100 rounded-lg opacity-50"></div>
      <div className="text-slate-400 font-bold text-sm">جاري جلب البيانات الاستراتيجية...</div>
    </div>
  );

  if (isError) return (
    <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-red-50 border-dashed space-y-6">
       <span className="text-6xl block">⚠️</span>
       <h2 className="text-2xl font-black text-slate-900 shadow-sm inline-block px-6 py-2 bg-red-50 rounded-2xl">فشل في تحميل البيانات</h2>
       <p className="text-slate-500 font-bold max-w-md mx-auto">تعذر الوصول إلى نظام الإحصائيات حالياً. يرجى التحقق من الاتصال بالخادم أو صلاحيات الولوج.</p>
       <div className="text-[10px] text-red-300 font-mono">CODE: {(error as any)?.message || 'UNKNOWN_ERROR'}</div>
       <button 
         onClick={() => window.location.reload()}
         className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all"
       >
         إعادة المحاولة 🔄
       </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 text-right" dir="rtl">
      {/* Royal Judicial Header */}
      <div className="bg-gradient-to-l from-[#023120] to-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-[#E6BE8A]">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 -mr-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <span className="bg-[#E6BE8A] text-[#023120] p-3 rounded-2xl shadow-lg">⚖️</span>
               إحصائيات الرقابة القضائية
            </h1>
            <p className="text-xl text-emerald-100/80 font-medium leading-relaxed">
              (Judicial Oversight Statistics) - منصة الرقابة والتفتيش والامتثال القانوني.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">🎯 الرقابة</span>
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">🎯 التفتيش</span>
               <span className="bg-white/10 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">🎯 المطابقة القانونية</span>
            </div>
          </div>

          <button 
            onClick={() => navigate('/judge')}
            className="group bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl border border-white/20 transition-all flex items-center gap-3 backdrop-blur-md"
          >
            <span className="text-xl group-hover:translate-x-1 transition-transform">←</span>
            <span className="font-black text-sm uppercase tracking-widest">العودة للوحة التحكم الرئيسيـة</span>
          </button>
        </div>
      </div>

      {/* Internal Navigation */}
      <div className="flex justify-center gap-4">
        {[
          { id: 'dashboard', label: '1️⃣ لوحة رقابية', icon: '📊' },
          { id: 'reports', label: '2️⃣ تقارير رقابية', icon: '📋' },
          { id: 'engine', label: '3️⃣ محرك التقارير القضائي', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-8 py-4 rounded-2xl font-black transition-all border-2 ${
              activeSubTab === tab.id 
              ? 'bg-[#023120] text-[#E6BE8A] border-[#E6BE8A] shadow-xl' 
              : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-10 animate-in fade-in zoom-in-95">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statsMeta.map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4 hover:ring-4 hover:ring-[#023120]/5 transition-all">
                   <div className="w-16 h-16 bg-[#023120] text-[#E6BE8A] rounded-2xl flex items-center justify-center text-2xl shadow-xl">{item.icon}</div>
                   <h4 className="text-xl font-black text-slate-900 pt-2">{item.title}</h4>
                   <p className="text-3xl font-black tracking-tighter text-slate-800">{item.count}</p>
                   <p className="text-xs font-bold text-slate-400">{item.desc}</p>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                 <h3 className="text-xl font-black text-slate-900 mb-8 border-r-4 border-[#023120] pr-4">لوحة رقابية (نظام الشذوذ)</h3>
                 
                 <div className="mb-10 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                       <span>📊</span> عدد الرسوم حسب النوع (تفصيلي)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       {[
                         { label: 'الزواج', count: stats?.summary?.marriageCount ?? 0, icon: '💍', color: 'text-emerald-600' },
                         { label: 'الطلاق', count: stats?.summary?.divorceCount ?? 0, icon: '⚖️', color: 'text-red-600' },
                         { label: 'الاملاك', count: stats?.summary?.propertyCount ?? 0, icon: '🏠', color: 'text-blue-600' },
                         { label: 'التركات', count: stats?.summary?.inheritanceCount ?? 0, icon: '📜', color: 'text-amber-600' },
                         { label: 'باقي الوثائق', count: stats?.summary?.otherCount ?? 0, icon: '📄', color: 'text-slate-600' },
                       ].map((t) => (
                         <div key={t.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center group hover:border-[#023120] transition-colors">
                            <span className="text-xl block mb-1 group-hover:scale-110 transition-transform">{t.icon}</span>
                            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-tighter mb-1">{t.label}</span>
                            <span className={`text-lg font-black ${t.color}`}>{t.count.toLocaleString()}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-8">
                    {[
                      { label: 'توزيع الرسوم حسب النوع', value: 100, color: 'bg-[#023120]', desc: 'تحليل هيكلي للرسوم الموثقة' },
                      { 
                        label: 'نسب المخالفات المحتملة', 
                        value: stats?.documentActivity?.totalDeeds ? Math.round((stats.judicialActivity.complaints / stats.documentActivity.totalDeeds) * 100) : 0,
                        color: 'bg-red-600', 
                        desc: 'تنبيهات خروقات مسطرية بناءً على المرفوضات' 
                      },
                      { 
                        label: 'مؤشرات الشذوذ الإحصائي', 
                        value: stats?.documentActivity?.totalDeeds ? Math.round((stats.documentActivity.delaysDetected / stats.documentActivity.totalDeeds) * 100) : 0,
                        color: 'bg-amber-500', 
                        desc: 'بيان الانحرافات عن المعايير الزمنية' 
                      },
                    ].map(st => (
                      <div key={st.label} className="space-y-3">
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-sm font-black text-slate-800">{st.label}</p>
                               <p className="text-[10px] text-slate-400 font-bold">{st.desc}</p>
                            </div>
                            <span className="text-lg font-black text-[#023120]">{st.value}%</span>
                         </div>
                         <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                            <div className={`${st.color} h-full rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${st.value}%` }}></div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center space-y-6 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
                 <div className="w-40 h-40 bg-emerald-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-emerald-100 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200/50 border-t-emerald-500 animate-spin-slow"></div>
                    <span className="relative group-hover:scale-125 transition-transform duration-500">🔎</span>
                 </div>
                 <div className="space-y-2 z-10">
                    <h4 className="text-2xl font-black text-slate-900">نظام الرصد والتحليل</h4>
                    <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
                       يقوم النظام آلياً بفلترة المعطيات الإحصائية لرصد أي انحرافات مسطرية تستوجب تدخلاً رقابياً.
                    </p>
                 </div>
                 
                 <button 
                    onClick={() => navigate('/judge/alerts')}
                    className="z-10 bg-red-50 hover:bg-red-100 text-red-700 px-6 py-4 rounded-3xl text-sm font-black border border-red-100 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-3 group/btn"
                 >
                    <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                    تم رصد {stats?.documentActivity?.delaysDetected || 0} حالة تستوجب المراجعة المسطرية
                    <span className="group-hover/btn:translate-x-[-5px] transition-transform font-serif">←</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in slide-in-from-left-5">
           <h3 className="text-2xl font-black text-slate-900 mb-10 border-r-8 border-[#023120] pr-4">تقارير رقابية متقدمة</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  title: 'تقارير التفتيش', 
                  icon: '📝', 
                  desc: 'سجل عمليات التفتيش الدورية والمفاجئة للمكاتب العدلية.', 
                  count: `${stats?.judicialActivity?.notifications ?? 0} تقرير`, 
                  path: '/judge/notifications' 
                },
                { 
                  title: 'تقارير عدم التطابق', 
                  icon: '❌', 
                  desc: 'حصر الرسوم التي لم تستوف الشروط المسطرية المطلوبة.', 
                  count: `${stats?.documentActivity?.delaysDetected ?? 0} ملفات`, 
                  path: '/judge/alerts' 
                },
                { 
                  title: 'سجل الأثر الكامل', 
                  icon: '🔐', 
                  desc: 'تتبع زمني دقيق لكل عملية ولوج أو تعديل في النظام.', 
                  count: 'Audit Log', 
                  path: '/judge/audit' 
                },
              ].map((report, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(report.path)}
                  className="group bg-slate-50 p-8 rounded-[3rem] border border-slate-200 hover:border-[#023120] transition-all cursor-pointer"
                >
                   <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform">{report.icon}</span>
                   <h4 className="text-lg font-black text-slate-900 mb-2">{report.title}</h4>
                   <p className="text-xs text-slate-500 font-bold leading-relaxed mb-6">{report.desc}</p>
                   <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <span className="text-xs font-black text-[#023120]">{report.count}</span>
                      <button className="text-[10px] font-black underline uppercase tracking-widest">معاينة الملف ←</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in zoom-in-95">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
              <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900">محرك التقارير القضائي</h3>
                 <p className="text-slate-500 font-bold">توليد تقارير PDF قضائية رسمية بدون معطيات مالية</p>
              </div>

              <div className="space-y-4">
                 <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between group">
                    <div className="flex gap-4 items-center">
                       <span className="text-4xl">📄</span>
                       <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-xl">تقرير PDF قضائي</span>
                          <span className="text-xs text-emerald-600 font-bold">معتمد مع Hash Code فريد</span>
                       </div>
                    </div>
                    <button className="bg-[#023120] text-[#E6BE8A] px-8 py-4 rounded-2xl text-xs font-black shadow-xl">تحميل الآونة 📥</button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-6 pt-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center">
                       <span className="text-2xl mb-2 block">🚫 💰</span>
                       <p className="font-black text-slate-800 text-sm">بدون بيانات مالية</p>
                       <p className="text-[10px] text-slate-400 font-bold">خصوصية تامة للعموم</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center">
                       <span className="text-2xl mb-2 block">🚫 🔮</span>
                       <p className="font-black text-slate-800 text-sm">بدون توقعات</p>
                       <p className="text-[10px] text-slate-400 font-bold">بيانات واقعية فعلية فقط</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-[#023120] p-10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-10"></div>
              <div className="w-48 h-48 bg-white/10 rounded-4xl border-4 border-dashed border-[#E6BE8A]/30 flex items-center justify-center relative overflow-hidden group">
                 {qrDataUrl ? (
                   <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain p-4 invert transition-transform group-hover:scale-110" />
                 ) : (
                   <div className="flex flex-col items-center gap-2 p-6">
                      <span className="text-4xl opacity-40">🛡️</span>
                      <p className="text-[10px] text-[#E6BE8A] font-black uppercase tracking-widest">QR Verification</p>
                   </div>
                 )}
                 <div className="absolute top-2 right-2 bg-[#E6BE8A] text-[#023120] px-3 py-1 rounded-full text-[10px] font-black">حماية 🔐</div>
              </div>
              <div className="space-y-3 z-10">
                 <h4 className="text-xl font-black text-[#E6BE8A]">نظام الأمان والحوكمة</h4>
                 <p className="text-sm text-emerald-100/60 font-medium leading-relaxed max-w-sm">
                   جميع التقارير القضائية مصدقة رقمياً وتخضع لقانون 09-08 المتعلق بحماية المعطيات الشخصية.
                 </p>
              </div>
              <button 
                onClick={async () => {
                  const { data } = await qrMutation.refetch();
                  if (data?.token) {
                    const url = await QRCode.toDataURL(`${window.location.origin}/verify/judicial-report?token=${data.token}`, { margin: 1 });
                    setQrDataUrl(url);
                  }
                }}
                className="bg-[#E6BE8A] text-[#023120] px-10 py-4 rounded-[2rem] font-black text-sm shadow-xl hover:scale-105 transition-all z-10"
              >
                توليد البصمة الرقمية ⚔️
              </button>
           </div>
        </div>
      )}

      {/* Security & Compliance Footer */}
      <div className="bg-slate-900 text-white p-12 rounded-[4rem] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
         <div className="absolute left-0 top-0 w-1/2 h-full bg-emerald-500/5 -skew-x-12 -ml-20"></div>
         <div className="space-y-4 z-10">
            <h4 className="text-2xl font-black flex items-center gap-3">
               <span className="text-emerald-500">🔐</span> الأمان والحوكمة وتدقيق المسار
            </h4>
            <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
               نظام Audit Trail كامل لتتبع صلاحيات الولوج واحترام قانون 09-08 المتعلق بحماية المعطيات ذات الطابع الشخصي.
            </p>
            <div className="flex gap-6 opacity-60">
               <img src="https://www.cndp.ma/wp-content/themes/cndp/images/logo_cndp_ar.png" alt="CNDP" className="h-10 invert contrast-200" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em]">Official Source</span>
                  <span className="text-sm font-black">justice.gov.ma</span>
               </div>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-4 z-10">
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
               <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">صلاحيات دقيقة</p>
               <p className="text-xl font-black">RBAC ✔</p>
            </div>
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
               <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">تتبع المسار</p>
               <p className="text-xl font-black">Audit ✔</p>
            </div>
         </div>
      </div>

      {/* Final Conclusion Footer */}
      <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 w-2 bg-[#023120] h-full"></div>
         <h4 className="text-xl font-black text-[#023120] mb-6 flex items-center gap-2">
            🏁 الخلاصة النهائية للمنظومة الإحصائية
         </h4>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'نظام هرمي كامل', icon: '✔' },
              { label: 'موزع عبر 4 منصات', icon: '✔' },
              { label: 'ذكاء اصطناعي', icon: '✔' },
              { label: 'رقابة قضائية', icon: '✔' },
              { label: 'اعتماد رسمي', icon: '✔' },
              { label: 'توسع وطني', icon: '✔' },
            ].map((cell, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-1 group-hover:bg-emerald-50 transition-colors border border-slate-100">
                 <span className="text-emerald-600 font-black">{cell.icon}</span>
                 <span className="text-[10px] font-black text-slate-700">{cell.label}</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
