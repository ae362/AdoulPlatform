import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
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

export const RegionalStatisticalManagement: React.FC = () => {
  const { sessionToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'engine' | 'alerts'>('dashboard');
  const [reportSubTab, setReportSubTab] = useState<'family' | 'registry' | 'property' | 'judicial'>('family');
  const reportYear = new Date().getFullYear();
  const [qrKind, setQrKind] = useState<'monthly' | 'annual'>('annual');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  
  const regionNameFallback = user?.full_name || 'المجلس الجهوي';

  const { data, isLoading, isError } = trpc.statistics.regionalSummary.useQuery(
    { sessionToken: sessionToken || '', reportYear },
    { enabled: Boolean(sessionToken) },
  );

  useEffect(() => {
    if (data) console.log('[RegionalStatistics] Data loaded:', data);
    if (isError) console.error('[RegionalStatistics] Error loading stats');
  }, [data, isError]);

  const qrQuery = trpc.statistics.getReportQrPayload.useQuery(
    { sessionToken: sessionToken || '', reportYear, kind: qrKind },
    { enabled: false },
  );

  const regionName = data?.context?.councilName || regionNameFallback;

  const smartCards = useMemo(() => {
    if (!data) return [];
    return [
      { title: 'إجمالي الرسوم الجهوية', value: `${(data?.summary?.regionalFees ?? 0).toLocaleString()} د.م`, icon: '💰', color: 'blue' },
      { title: 'الحالة المدنية (مجموع)', value: data?.summary?.civilStatusTotal ?? 0, icon: '👨‍👩‍👧‍👦', color: 'emerald' },
      { title: 'العقار والتركات', value: data?.summary?.propertyInheritance ?? 0, icon: '🏠', color: 'amber' },
      { title: 'نسبة الامتثال', value: data?.summary?.complianceRate == null ? '—' : `${data?.summary?.complianceRate}%`, icon: '✅', color: 'indigo' },
    ];
  }, [data]);

  const stats = data;
  const performance = stats?.summary?.performance ?? { completedPct: 0, inProgressPct: 0, delayedPct: 0 };

  const COURT_COORDS: Record<string, [number, number]> = {
    'الرباط': [34.0209, -6.8416],
    'الدار البيضاء': [33.5731, -7.5898],
    'فاس': [34.0331, -5.0003],
    'مراكش': [31.6295, -7.9811],
    'طنجة': [35.7595, -5.8340],
    'تطوان': [35.5785, -5.3684],
    'وجدة': [34.6814, -1.9086],
    'أكادير': [30.4278, -9.5981],
    'القنيطرة': [34.2610, -6.5802],
    'سلا': [34.0333, -6.8000],
    'مكناس': [33.8935, -5.5473],
    'العيون': [27.1536, -13.2033],
    'الداخلة': [23.6848, -15.9570],
    'بني ملال': [32.3373, -6.3498],
    'الحسيمة': [35.2446, -3.9317],
    'الجديدة': [33.2316, -8.5007],
  };

  const heatPoints = useMemo(() => {
    const rows = stats?.distribution ?? [];
    return rows
      .map((r) => {
        const key = String(r.court || '').trim();
        const coord = COURT_COORDS[key];
        if (!coord) return null;
        return { court: key, count: r.count, lat: coord[0], lng: coord[1] };
      })
      .filter(Boolean) as Array<{ court: string; count: number; lat: number; lng: number }>;
  }, [stats?.distribution]);

  const maxHeat = Math.max(1, ...heatPoints.map((p) => p.count));

  const generateQr = async () => {
    if (!sessionToken) return;
    const res = await qrQuery.refetch();
    const token = res.data?.token;
    if (!token) return;
    const qrPayload = `${window.location.origin}/verify/regional-report?token=${encodeURIComponent(token)}`;
    const url = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320 });
    setQrDataUrl(url);
  };

  useEffect(() => {
    setQrDataUrl(null);
  }, [qrKind, reportYear]);

  if (isLoading) return <div className="p-10 animate-pulse bg-slate-100 rounded-3xl h-[600px]"></div>;
  if (isError) return (
    <div className="p-20 text-center flex flex-col items-center gap-4 bg-white rounded-[3rem] shadow-xl border border-red-100">
       <span className="text-6xl">⚠️</span>
       <h2 className="text-2xl font-black text-slate-800">عذراً، حدث خطأ أثناء تحميل البيانات</h2>
       <p className="text-slate-500 font-bold">يرجى التحقق من الاتصال بالخادم أو المحاولة مرة أخرى لاحقاً.</p>
       <button onClick={() => window.location.reload()} className="bg-red-950 text-[#E6BE8A] px-8 py-3 rounded-2xl font-black shadow-lg">إعادة التحميل</button>
    </div>
  );

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      {/* Header with Navigation */}
      <div className="bg-white rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-4 z-[90]">
        <div className="flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-2 px-4">
              <span className="text-2xl">🎯</span>
              <h2 className="text-xl font-black text-slate-900">التدبير الإحصائي الجهوي</h2>
           </div>
           <nav className="flex gap-2">
              {[
                { id: 'dashboard', label: 'لوحة البيانات العامة', icon: '📊' },
                { id: 'reports', label: 'مركز التقارير المتخصصة', icon: '📋' },
                { id: 'engine', label: 'محرك التقارير الذكي', icon: '⚙️' },
                { id: 'alerts', label: 'تحذيرات المجلس', icon: '⚠️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                    activeTab === tab.id 
                    ? 'bg-[#161c4f] text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
           </nav>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 transition-all">
          {/* Smart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {smartCards.map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-2 group hover:shadow-md transition-all">
                <span className="text-3xl p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">{card.icon}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.title}</span>
                <span className="text-2xl font-black text-slate-900">{card.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Doughnut: Regional Performance */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                 <span>📈</span> مؤشر الإنجاز الجهوي
               </h3>
               <div className="h-64 flex items-center justify-center relative">
                  <div className="h-full w-full max-w-[240px]">
                    <Doughnut 
                      data={{
                        labels: ['مكتمل', 'قيد الإنجاز', 'متأخر'],
                        datasets: [{
                          data: [performance.completedPct, performance.inProgressPct, performance.delayedPct],
                          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{ cutout: '80%', plugins: { legend: { display: false } } }}
                    />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900">{stats?.summary?.complianceRate != null ? `${stats.summary.complianceRate}%` : '0%'}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">معدل الامتثال</span>
                  </div>
               </div>
              <div className="h-[320px] w-full overflow-hidden rounded-3xl border border-slate-100">
                <MapContainer center={[31.7917, -7.0926]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {heatPoints.map((p) => {
                    const intensity = p.count / maxHeat;
                    const radius = 10 + intensity * 30;
                    const color = intensity > 0.66 ? '#ef4444' : intensity > 0.33 ? '#f59e0b' : '#10b981';
                    return (
                      <CircleMarker
                        key={p.court}
                        center={[p.lat, p.lng]}
                        radius={radius}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.35 }}
                      >
                        <LeafletTooltip direction="top" offset={[0, -8]} opacity={1}>
                          <div className="text-xs font-bold">
                            {p.court}: {p.count}
                          </div>
                        </LeafletTooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>
              {heatPoints.length === 0 && (
                <div className="text-center text-xs text-slate-400 font-bold">بيانات غير كافية لعرض خريطة التوزيع.</div>
              )}
            </div>

            {/* Growth & Distribution */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-800">توزيع النشاط ومعدل النمو</h3>
                  <div className="flex gap-2">
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-black">
                      {stats?.familyData?.growthRate != null ? `${stats.familyData.growthRate}%` : '0%'} نمو سنوي
                    </span>
                  </div>
               </div>
               <div className="h-64">
                  <Line 
                    data={{
                      labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليو', 'غشت', 'شتنبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                      datasets: [{
                        label: 'معدل النشاط',
                        data: stats?.monthlyAnalysis || [],
                        borderColor: '#161c4f',
                        backgroundColor: 'rgba(22, 28, 79, 0.1)',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }}
                  />
               </div>
            </div>
          </div>

          {/* Activity by District & Heatmap Mock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h3 className="text-lg font-black text-slate-800 mb-6">توزيع النشاط حسب الدوائر</h3>
               <div className="space-y-4">
                  {(stats?.distribution ?? []).map((dist, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                       <span className="font-bold text-slate-700">{dist.court || 'غير محدد'}</span>
                       <div className="flex items-center gap-4 flex-1 mx-8">
                          <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-900" style={{ width: `${(stats?.summary?.activeNotaries && stats.summary.activeNotaries > 0) ? Math.min(100, (dist.count / stats.summary.activeNotaries) * 100) : 0}%` }}></div>
                          </div>
                       </div>
                       <span className="font-black text-blue-900">{dist.count ?? 0} عدل</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-slate-800 mb-1">Heatmap الجغرافي للنشاط</h3>
                  <p className="text-slate-500 text-sm">توزيع الكثافة حسب الدوائر بجهة {regionName}</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 transition-all">
          <div className="flex gap-4 p-2 bg-slate-100 rounded-2xl inline-flex">
             {[
               { id: 'family', label: 'تبويب الأسرة', icon: '💍' },
               { id: 'registry', label: 'التوثيق والسجلات', icon: '📜' },
               { id: 'property', label: 'العقار والتركات', icon: '🏘️' },
               { id: 'judicial', label: 'النشاط القضائي', icon: '⚖️' },
             ].map(sub => (
               <button
                 key={sub.id}
                 onClick={() => setReportSubTab(sub.id as any)}
                 className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                   reportSubTab === sub.id ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                 }`}
               >
                 {sub.icon} {sub.label}
               </button>
             ))}
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px]">
             {reportSubTab === 'family' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6 text-right">
                     <h4 className="text-2xl font-black text-slate-900 border-r-4 border-emerald-500 pr-4">إحصائيات الأسرة</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                           <p className="text-xs font-bold text-emerald-800 opacity-70">إجمالي الزواج</p>
                           <p className="text-3xl font-black text-emerald-900">{stats?.familyData?.marriage ?? 0}</p>
                        </div>
                        <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                           <p className="text-xs font-bold text-red-800 opacity-70">إجمالي الطلاق</p>
                           <p className="text-3xl font-black text-red-900">{stats?.familyData?.divorce ?? 0}</p>
                        </div>
                     </div>
                     <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <h5 className="font-black text-slate-800 mb-4">مقارنة بين العدول</h5>
                        {(stats?.notaryComparison ?? []).length ? (
                          (stats?.notaryComparison ?? []).map((n, i) => {
                            const count = Number(n.count ?? 0);
                            const max = Math.max(0, ...(stats?.notaryComparison ?? []).map((x) => Number(x.count ?? 0)));
                            const pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
                            return (
                              <div key={`${n.name}-${i}`} className="flex items-center justify-between mb-3 last:mb-0">
                                <span className="text-sm font-bold text-slate-600">{n.name}</span>
                                <div className="h-1.5 w-32 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-sm font-black">{count}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs font-bold text-slate-400">المقارنة بين العدول غير متاحة حالياً.</div>
                        )}
                     </div>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                     <span className="text-4xl mb-4">📉</span>
                     <h5 className="text-lg font-black text-slate-800">التطور الزمني لشؤون الأسرة</h5>
                     <p className="text-sm text-slate-500 text-center mt-2 px-10">تحليل الاتجاهات الموسمية للزواج والطلاق على مدار السنوات الخمس الماضية</p>
                  </div>
               </div>
             )}

             {reportSubTab === 'registry' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-black text-slate-900">نشاط مكاتب التوثيق والسجلات</h4>
                    <span className="bg-blue-100 text-blue-900 px-4 py-1 rounded-full text-xs font-black">إجمالي السجلات: {stats?.documentActivity?.totalDeeds}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 font-black text-slate-500 text-sm">مكتب التوثيق</th>
                          <th className="p-4 font-black text-slate-500 text-sm">عدد السجلات</th>
                          <th className="p-4 font-black text-slate-500 text-sm">نسبة الإنجاز</th>
                          <th className="p-4 font-black text-slate-500 text-sm">حالات التأخير</th>
                          <th className="p-4 font-black text-slate-500 text-sm">الإحصاء العقدي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(stats?.notaryComparison ?? []).map((row, i) => {
                          const count = Number(row.count ?? 0);
                          const max = Math.max(0, ...(stats?.notaryComparison ?? []).map((x) => Number(x.count ?? 0)));
                          const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
                          return (
                            <tr key={`${row.name}-${i}`} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{row.name}</td>
                              <td className="p-4 font-black">{count}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="text-xs font-bold text-blue-600">{pct}%</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">—</span>
                              </td>
                              <td className="p-4 text-xs font-bold text-slate-400">—</td>
                            </tr>
                          );
                        })}
                        {!(stats?.notaryComparison ?? []).length && (
                          <tr>
                            <td className="p-4 text-center text-slate-400 font-bold" colSpan={5}>
                              لا توجد بيانات نشاط للمكاتب حالياً.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
             )}

             {reportSubTab === 'property' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6">
                     <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100">
                        <h5 className="font-black text-amber-900 mb-2">الكتل العقارية</h5>
                        <p className="text-4xl font-black text-amber-950">{stats?.summary?.propertyInheritance}</p>
                        <p className="text-xs font-bold text-amber-800/60 mt-1">عقارات مسجلة بالجهة</p>
                     </div>
                     <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100">
                        <h5 className="font-black text-blue-900 mb-2">القيم التقديرية (د.م)</h5>
                        <p className="text-4xl font-black text-blue-950">{(stats?.summary?.regionalFees ?? 0).toLocaleString()}</p>
                        <p className="text-xs font-bold text-blue-800/60 mt-1">تداول مالي عقاري برسم السنة</p>
                     </div>
                  </div>
                  <div className="md:col-span-2 bg-slate-50 rounded-[2.5rem] p-10 flex flex-col items-center justify-center border border-slate-100">
                     <span className="text-5xl mb-6">📅</span>
                     <h5 className="text-xl font-black text-slate-800">التوزيع الزمني للرسوم العقارية</h5>
                     <div className="mt-8 flex gap-2 w-full h-32 items-end justify-center px-6">
                        {(stats?.propertyMonthly ?? new Array(12).fill(0)).slice(0, 12).map((v, i) => {
                          const max = Math.max(0, ...(stats?.propertyMonthly ?? [0]));
                          const h = max > 0 ? (v / max) * 100 : 0;
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-amber-400/30 rounded-t-xl hover:bg-amber-400 transition-all cursor-pointer"
                              title={`${v}`}
                              style={{ height: `${h}%` }}
                            ></div>
                          );
                        })}
                     </div>
                     <p className="text-xs text-slate-400 font-bold mt-4 uppercase">دورات ذروة النشاط العقاري</p>
                  </div>
               </div>
             )}

             {reportSubTab === 'judicial' && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'الشكايات', value: stats?.judicialActivity?.complaints ?? 0, icon: '⚖️' },
                    { label: 'المراسلات', value: stats?.judicialActivity?.correspondence ?? 0, icon: '📧' },
                    { label: 'المحاضر', value: stats?.judicialActivity?.minutes ?? 0, icon: '📝' },
                    { label: 'إخطارات التنقل', value: stats?.judicialActivity?.notifications ?? 0, icon: '🔔' },
                  ].map(act => (
                    <div key={act.label} className="p-8 bg-slate-900 text-white rounded-[2rem] border-b-4 border-indigo-500 flex flex-col items-center gap-4">
                       <span className="text-3xl">{act.icon}</span>
                       <div className="text-center">
                          <p className="text-[10px] uppercase font-black tracking-tighter text-indigo-300 mb-1">{act.label}</p>
                          <p className="text-4xl font-black">{act.value}</p>
                       </div>
                    </div>
                  ))}
                  <div className="md:col-span-4 p-8 bg-indigo-50/30 rounded-3xl border border-indigo-100 mt-4 text-center">
                     <p className="text-sm font-bold text-indigo-900">نظام المراقبة القضائية الموحد - جميع البيانات محدثة تزامناً مع محاكم المملكة</p>
                  </div>
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'engine' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
                <div className="space-y-2">
                   <h3 className="text-xl font-black text-slate-900">محرك التقارير الذكي</h3>
                   <p className="text-sm text-slate-500 font-bold">إنشاء وتصدير التقارير الرسمية</p>
                </div>
                
                <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">تقرير شهري</span>
                        <span className="text-[10px] text-slate-400">بيانات شهر فبراير 2026</span>
                      </div>
                      <button className="bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-black transition-colors">إنشاء ⚡</button>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">تقرير سنوي</span>
                        <span className="text-[10px] text-slate-400">إحصاء شامل لعام 2025</span>
                      </div>
                      <button className="bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-black transition-colors">إنشاء ⚡</button>
                   </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQrKind('monthly')}
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${qrKind === 'monthly' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                    >
                      شهري
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrKind('annual')}
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${qrKind === 'annual' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                    >
                      سنوي
                    </button>
                    <button
                      type="button"
                      onClick={generateQr}
                      className="px-4 py-1 rounded-xl text-xs font-black bg-[#161c4f] text-white hover:bg-black transition-colors"
                      disabled={qrQuery.isFetching || !sessionToken}
                    >
                      {qrQuery.isFetching ? '...' : 'QR'}
                    </button>
                  </div>

                  <div className="w-40 h-40 bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-xs text-slate-400 font-bold px-3 text-center">اضغط على QR لإنشاء رمز فريد لهذا الحساب.</span>
                    )}
                    <div className="absolute -top-2 -right-2 bg-[#E6BE8A] text-[#161c4f] px-2 py-0.5 rounded text-[10px] font-black">QR Code</div>
                  </div>
                   <p className="text-xs text-slate-400 font-bold mt-4">شهادات مصدقة برمز الاستجابة السريع</p>
                </div>
             </div>

             <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-10">
                <div className="flex items-center justify-between">
                   <h4 className="text-xl font-black text-slate-900">خيارات التصدير والمعاينة</h4>
                   <div className="flex gap-4">
                      <button className="flex items-center gap-2 bg-red-50 text-red-700 px-6 py-3 rounded-2xl font-black text-sm border border-red-100 hover:bg-red-100 transition-colors">
                        <span className="text-lg">📄</span> تصدير PDF بمروسة المجلس
                      </button>
                      <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-black text-sm border border-emerald-100 hover:bg-emerald-100 transition-colors">
                        <span className="text-lg">📊</span> تصدير Excel خام
                      </button>
                   </div>
                </div>

                <div className="space-y-6">
                   <h5 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      سجل الأثر والتدقيق (Activity Log)
                   </h5>
                   <div className="space-y-4">
                      {(stats?.activityLog ?? []).map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 border-r-4 border-blue-900/10 rounded-xl">
                           <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black shadow-sm">👤</div>
                              <div className="flex flex-col">
                                 <span className="text-sm font-black text-slate-800">{log.user}</span>
                                 <span className="text-[10px] font-bold text-slate-500 uppercase">{log.action}</span>
                              </div>
                           </div>
                           <span className="text-[10px] font-black text-slate-400">{log.date}</span>
                        </div>
                      ))}
                      {!(stats?.activityLog ?? []).length && (
                        <div className="text-center text-xs text-slate-400 font-bold py-6">سجل الأثر غير متوفر حالياً.</div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 transition-all">
          <div className="bg-red-900 text-white p-10 rounded-[3rem] shadow-2xl shadow-red-900/20 relative overflow-hidden">
             <div className="absolute right-0 top-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
             <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                   <span className="text-5xl animate-bounce">⚠️</span>
                   <div>
                      <h3 className="text-3xl font-black">تحذيرات المجلس الجهوي</h3>
                      <p className="text-red-200 font-bold">رصد تلقائي للتناقضات والتاخيرات الإحصائية</p>
                   </div>
                </div>
             </div>
          </div>

	          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
	             {(stats?.alerts ?? []).map((alert, i) => (
               <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative group hover:ring-2 hover:ring-red-500/20 transition-all">
                  <div className={`absolute top-4 left-4 w-3 h-3 rounded-full animate-ping ${alert.level === 'high' ? 'bg-red-600' : alert.level === 'mid' ? 'bg-amber-600' : 'bg-blue-600'}`}></div>
                  <h4 className="text-lg font-black text-slate-900">{alert.title}</h4>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">{alert.desc}</p>
                  <button className="mt-4 text-[10px] font-black text-red-600 underline text-right">معالجة فورية →</button>
               </div>
	             ))}
	          </div>
	          {!(stats?.alerts ?? []).length && (
	            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 text-center text-slate-500 font-bold">
	              لا توجد تحذيرات حالياً.
	            </div>
	          )}
	
	          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">🛡️</div>
             <h4 className="text-xl font-black text-slate-800">نظام الحماية والتحقق من النزاهة</h4>
             <p className="text-slate-400 text-sm font-bold mt-2 max-w-xl">تعمل الأنظمة الذكية على تحليل البيانات فور إدخالها للتأكد من خلوها من الأخطاء البشرية أو التلاعبات الإحصائية، مما يضمن تقارير جهوية موثوقة بنسبة 100%.</p>
          </div>
        </div>
      )}
    </div>
  );
};
