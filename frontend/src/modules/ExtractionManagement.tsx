import React, { useState, useMemo } from 'react';
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

type TabType = 'dashboard' | 'request_type' | 'search' | 'verification' | 'result' | 'extraction' | 'delivery';
type ServiceType = 'copy' | 'duplicate' | 'status_check' | null;

export const ExtractionManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [serviceType, setServiceType] = useState<ServiceType>(null);
  const { user } = useAuth();

  // Shared state for the extraction process
  const [sessionData, setSessionData] = useState({
    searchMethod: 'identity' as 'identity' | 'refs' | 'document',
    identity: { firstName: '', lastName: '', cin: '' },
    refs: { type: 'بيع', register: '', volume: '', char: '', page: '', count: '', date: '', center: '' },
    statusCheck: { found: false, transferred: false, newActRefs: '' },
    fees: { amount: 100, paid: false, method: 'نقدًا' },
    extractionResult: null as any
  });

  const stats = {
    dailyRequests: 8,
    copiesExtracted: 145,
    duplicatesExtracted: 22,
    statusChecks: 67,
    avgTime: '45 دقيقة'
  };

  return (
    <div className="space-y-8 pb-20 text-right font-sans" dir="rtl">
      {/* Royal Header */}
      <div className="bg-gradient-to-l from-[#064e3b] to-[#065f46] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-[#E6BE8A]">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 -mr-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <span className="bg-[#E6BE8A] text-[#064e3b] p-3 rounded-2xl shadow-lg">📜</span>
              استخراج نسخ الشهادات والعقود العدلية
            </h1>
            <p className="text-xl text-emerald-100/80 font-medium leading-relaxed">
               خاص بالرسوم المتلقاة والمضمنة من طرف العدل فقط. نظام الاستخراج والتحقق الذكي من الوضعية القانونية للرسوم.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/20 backdrop-blur-sm text-center">
                <p className="text-[10px] font-black text-[#E6BE8A] uppercase mb-1">صلاحية الوصول</p>
                <p className="text-lg font-black tracking-widest">موثق معتمد ✔</p>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'لوحة الاستخراج', icon: '📊' },
          { id: 'request_type', label: 'نوع الطلب', icon: '🔘' },
          { id: 'search', label: 'محرك البحث', icon: '🔍' },
          { id: 'verification', label: 'التحقق من الوضعية', icon: '⚖️' },
          { id: 'extraction', label: 'توليد الوثيقة', icon: '📄' },
          { id: 'delivery', label: 'التوصيل والأرشفة', icon: '🗂️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all ${
              activeTab === tab.id
                ? 'bg-[#064e3b] text-white shadow-xl scale-105'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[600px]">
        {activeTab === 'dashboard' && <DashboardView stats={stats} setActiveTab={setActiveTab} />}
        {activeTab === 'request_type' && <RequestTypeView serviceType={serviceType} setServiceType={setServiceType} onNext={() => setActiveTab('search')} />}
        {activeTab === 'search' && <SearchView serviceType={serviceType} sessionData={sessionData} setSessionData={setSessionData} onNext={() => setActiveTab('verification')} />}
        {activeTab === 'verification' && <VerificationView sessionData={sessionData} setSessionData={setSessionData} onNext={() => setActiveTab('extraction')} />}
        {activeTab === 'extraction' && <ExtractionView serviceType={serviceType} onNext={() => setActiveTab('delivery')} />}
        {activeTab === 'delivery' && <DeliveryView sessionData={sessionData} serviceType={serviceType} />}
      </div>

      {/* Security Footer */}
      <div className="bg-slate-900 text-white p-12 rounded-[4rem] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden mt-10">
         <div className="absolute left-0 top-0 w-1/2 h-full bg-emerald-500/5 -skew-x-12 -ml-20"></div>
         <div className="space-y-4 z-10 text-right">
            <h4 className="text-2xl font-black flex items-center gap-3 justify-end">
               الخصوصية والحماية (Law 09-08) <span className="text-emerald-500">🔐</span>
            </h4>
            <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
               البحث يقتصر على رسوم العدل نفسه فقط. جميع عمليات الاستخراج موثقة بسجل أثر كامل (Audit Trail) لضمان الشفافية المهنية.
            </p>
         </div>
         <div className="flex gap-6 z-10">
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
               <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">المصدر الرسمي</p>
               <p className="text-xl font-black tracking-widest leading-none">CNDP & Justice ✔</p>
            </div>
         </div>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ stats: any; setActiveTab: (t: TabType) => void }> = ({ stats, setActiveTab }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
    {/* Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {[
        { label: 'طلبات اليوم', val: stats.dailyRequests, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'النسخ المستخرجة', val: stats.copiesExtracted, icon: '📄', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'النظائر المستخرجة', val: stats.duplicatesExtracted, icon: '📜', color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'طلبات التحقق', val: stats.statusChecks, icon: '⚖️', color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'متوسط الأداء', val: stats.avgTime, icon: '⏱️', color: 'text-slate-600', bg: 'bg-slate-50' },
      ].map((s, i) => (
        <div key={i} className={`${s.bg} p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col items-center justify-center text-center space-y-3 group hover:scale-105 transition-all cursor-pointer`}>
           <span className="text-4xl group-hover:animate-bounce">{s.icon}</span>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
           <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Smart Alerts */}
      <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-red-600 rounded-full"></span>
            تنبيهات الاستخراج 🔔
         </h3>
         <div className="space-y-4">
            {[
              { msg: 'طلبات استخراج غير مكتملة المعطيات', count: 2, icon: '⚠️', color: 'text-amber-600' },
              { msg: 'رسوم تم تفويتها لاحقاً وتنبيه المشتري مطلوب', count: 4, icon: '🚨', color: 'text-red-600' },
              { msg: 'وثائق جاهزة للتسليم الإلكتروني', count: 12, icon: '✅', color: 'text-emerald-600' },
            ].map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-[#064e3b] transition-all cursor-pointer group">
                 <div className="flex items-center gap-4">
                    <span className="text-2xl">{alert.icon}</span>
                    <span className={`font-bold ${alert.color}`}>{alert.msg}</span>
                 </div>
                 <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black">{alert.count}</span>
              </div>
            ))}
         </div>
      </div>

      {/* Internal Ranking */}
      <div className="bg-[#064e3b] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
         <div className="absolute inset-0 bg-white/5 opacity-10"></div>
         <div>
            <h3 className="text-xl font-black mb-6 z-10 relative flex items-center gap-2">
               <span>📊</span> إحصائيات نوعية
            </h3>
            <div className="space-y-5 z-10 relative">
               <div>
                  <div className="flex justify-between text-[10px] font-black text-emerald-100/60 uppercase mb-1">
                     <span>عقود البيع</span>
                     <span>65%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-[#E6BE8A] w-[65%]"></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-[10px] font-black text-emerald-100/60 uppercase mb-1">
                     <span>عقود الزواج</span>
                     <span>25%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-400 w-[25%]"></div>
                  </div>
               </div>
            </div>
         </div>
         <div className="mt-8 p-6 bg-white/10 rounded-3xl border border-white/20 text-center">
            <p className="text-[10px] font-black text-emerald-300 mb-1 uppercase tracking-widest">أكثر الرسوم طلباً</p>
            <p className="text-lg font-black">عقود البيع العقاري</p>
         </div>
      </div>
    </div>
  </div>
);

const RequestTypeView: React.FC<{ serviceType: ServiceType; setServiceType: (s: ServiceType) => void; onNext: () => void }> = ({ serviceType, setServiceType, onNext }) => (
  <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in zoom-in-95 space-y-12 text-center">
     <div className="space-y-4">
        <h2 className="text-3xl font-black text-slate-900">1. تحديد نوع الخدمة المطلوبة</h2>
        <p className="text-slate-500 font-bold max-w-xl mx-auto">هذا الاختيار يحدد نوع الحقول، طريقة البحث، وصيغة الجواب النهائي المسلم للمرتفق.</p>
     </div>

     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { id: 'copy', label: 'استخراج نسخة', icon: '📄', desc: 'نسخة مطابقة للرسم المضمن' },
          { id: 'duplicate', label: 'استخراج نظير', icon: '📜', desc: 'نظير عدلي وفق الضوابط المهنية' },
          { id: 'status_check', label: 'التحقق من وضعية رسم', icon: '⚖️', desc: 'تحديد ما إذا كان الرسم قائماً أم مُفَاتاً' },
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setServiceType(type.id as ServiceType)}
            className={`p-10 rounded-[3rem] border-4 transition-all flex flex-col items-center gap-4 group ${serviceType === type.id ? 'border-[#064e3b] bg-emerald-50 shadow-2xl scale-105' : 'border-slate-50 bg-slate-50 opacity-60 hover:opacity-100'}`}
          >
             <span className="text-6xl group-hover:rotate-12 transition-transform">{type.icon}</span>
             <span className="text-xl font-black text-slate-900">{type.label}</span>
             <p className="text-xs font-bold text-slate-400">{type.desc}</p>
             <div className={`mt-4 w-8 h-8 rounded-full border-4 flex items-center justify-center ${serviceType === type.id ? 'border-[#064e3b] bg-[#064e3b] text-white' : 'border-slate-200'}`}>
                {serviceType === type.id && '✓'}
             </div>
          </button>
        ))}
     </div>

     {serviceType && (
       <div className="pt-10 flex justify-center animate-in slide-in-from-top-4">
          <button onClick={onNext} className="bg-slate-900 text-white px-20 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl hover:bg-black transition-all flex items-center gap-4 group">
             بدء البحث الذكي
             <span className="group-hover:-translate-x-2 transition-transform">←</span>
          </button>
       </div>
     )}
  </div>
);

const SearchView: React.FC<{ serviceType: ServiceType; sessionData: any; setSessionData: (d: any) => void; onNext: () => void }> = ({ serviceType, sessionData, setSessionData, onNext }) => {
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
     setSearching(true);
     setTimeout(() => {
        setSearching(false);
        onNext();
     }, 1500);
  };

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in slide-in-from-left-5 space-y-12">
      <div className="flex justify-between items-center border-b border-slate-50 pb-8">
         <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#064e3b] pr-4">2. محرك البحث الذكي عن الرسم</h3>
         <div className="flex gap-2">
            {['identity', 'refs', 'document'].map(m => (
              <button
                key={m}
                onClick={() => setSessionData({...sessionData, searchMethod: m})}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${sessionData.searchMethod === m ? 'bg-[#064e3b] text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}
              >
                {m === 'identity' ? 'بالهوية' : m === 'refs' ? 'بالمراجع' : 'بالسند المادي'}
              </button>
            ))}
         </div>
      </div>

      {sessionData.searchMethod === 'identity' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in duration-500">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">الاسم الشخصي</label>
              <input value={sessionData.identity.firstName} onChange={e => setSessionData({...sessionData, identity: {...sessionData.identity, firstName: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">الاسم العائلي</label>
              <input value={sessionData.identity.lastName} onChange={e => setSessionData({...sessionData, identity: {...sessionData.identity, lastName: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b] transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">رقم البطاقة الوطنية (اختياري)</label>
              <input placeholder="Ex: AB123456" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b] transition-all" />
           </div>
           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                 <p className="text-[10px] font-black text-blue-800 leading-none mb-1 uppercase">سؤال ذكي</p>
                 <p className="text-xs font-bold text-blue-900 leading-tight">هل الاسم قد يكون تغيّر أو له صيغة أخرى؟ يقترح تهجئات محتملة.</p>
              </div>
           </div>
        </div>
      )}

      {sessionData.searchMethod === 'refs' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">نوع الرسم</label>
                <select 
                   value={sessionData.refs.type}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, type: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b]">
                   <option>بيع</option>
                   <option>زواج</option>
                   <option>إراثة</option>
                   <option>تنازل</option>
                   <option>قسمة</option>
                   <option>رهن</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">تاريخ التوثيق</label>
                <input 
                   type="date" 
                   value={sessionData.refs.date}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, date: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b]" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">مركز التوثيق</label>
                <input 
                   value={sessionData.refs.center}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, center: e.target.value}})}
                   placeholder="Ex: طنجة" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b]" />
             </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">دفتر</label>
                <input 
                   value={sessionData.refs.char}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, char: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-[#064e3b]" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">سجل</label>
                <input 
                   value={sessionData.refs.register}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, register: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-[#064e3b]" />
             </div>
             <div className="space-y-2 text-red-600">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase italic">رقم الدفتر/السجل</label>
                <input 
                   value={sessionData.refs.volume}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, volume: e.target.value}})}
                   className="w-full bg-red-50/50 border-2 border-red-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-red-500" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">الحرف</label>
                <input 
                   value={sessionData.refs.count} // repurposed
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, count: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-[#064e3b]" placeholder="أ / ب" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">رقم الصحيفة</label>
                <input 
                   value={sessionData.refs.page}
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, page: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-[#064e3b]" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">عددها</label>
                <input 
                   value={sessionData.refs.count2 || ''} // temporary use
                   onChange={e => setSessionData({...sessionData, refs: {...sessionData.refs, count2: e.target.value}})}
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none focus:border-[#064e3b]" />
             </div>
          </div>
        </div>
      )}

      {sessionData.searchMethod === 'document' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4 text-amber-900 shadow-sm">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm font-bold leading-relaxed">تنبيه ذكي: هذه الخدمة لا تُغني عن البحث بالمحافظة العقارية، لكنها تُفيد في التحقق من وجود تفويت عدلي لاحق بنفس مرجع الرسم في هذا المكتب.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1 col-span-2">
                 <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">اسم صاحب الرسم الوارد فيه</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b]" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">نوع الرسم</label>
                 <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-[#064e3b]">
                   <option>بيع</option>
                   <option>إراثة</option>
                 </select>
              </div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-6 gap-4 border-t border-slate-50 pt-6">
             <input placeholder="بدفتر رقم" className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-center" />
             <input placeholder="الحرف" className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-center" />
             <input placeholder="الصحيفة" className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-center" />
             <input placeholder="العدد" className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-center" />
             <input placeholder="تاريخ التوثيق" type="date" className="col-span-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-center" />
           </div>
        </div>
      )}

      <div className="pt-10 flex justify-end border-t border-slate-50">
         <button 
           onClick={handleSearch}
           disabled={searching}
           className="bg-[#064e3b] text-[#E6BE8A] px-16 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50"
         >
           {searching ? (
             <span className="animate-spin text-2xl">⏳</span>
           ) : (
             <span className="text-2xl">🔎</span>
           )}
           {searching ? 'جاري التنقيب في الرسوم...' : 'تشغيل محرك البحث'}
         </button>
      </div>
    </div>
  );
};

const VerificationView: React.FC<{ sessionData: any; setSessionData: (d: any) => void; onNext: () => void }> = ({ sessionData, setSessionData, onNext }) => {
  const [verified, setVerified] = useState(false);
  const [transferred, setTransferred] = useState(false);

  const performCheck = () => {
     setVerified(true);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-5">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
         <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#064e3b] pr-4">3. التحقق من وضعية الرسم (Status Verification)</h3>
            {!verified && (
              <button onClick={performCheck} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all">
                 تحليل التشابكات العدلية 🔍
              </button>
            )}
         </div>

         {verified ? (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in zoom-in-95">
              {/* Outcome A: Still Standing */}
              <div 
                onClick={() => setTransferred(false)}
                className={`p-10 rounded-[3rem] border-4 cursor-pointer transition-all flex flex-col items-center gap-4 text-center ${!transferred ? 'border-emerald-500 bg-emerald-50 shadow-2xl' : 'border-slate-50 bg-slate-50 opacity-40 hover:opacity-100'}`}
              >
                  <span className="text-6xl">✔</span>
                  <p className="text-xl font-black text-emerald-800">الرسم ما زال قائماً</p>
                  <p className="text-xs font-bold text-slate-500">“لم يتم العثور على أي تفويت عدلي لاحق بهذا المكتب بخصوص هذا الرسم”</p>
                  <div className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">مؤشر ثقة: مرتفع</div>
              </div>

              {/* Outcome B: Transferred */}
              <div 
                onClick={() => setTransferred(true)}
                className={`p-10 rounded-[3rem] border-4 cursor-pointer transition-all flex flex-col items-center gap-4 text-center ${transferred ? 'border-red-500 bg-red-50 shadow-2xl' : 'border-slate-50 bg-slate-50 opacity-40 hover:opacity-100'}`}
              >
                  <span className="text-6xl">⚠️</span>
                  <p className="text-xl font-black text-red-800">تم تفويت الرسم</p>
                  <p className="text-xs font-bold text-slate-500">“هذا الرسم تم تفويته بمقتضى رسم لاحق مسجل بنفس السجلات”</p>
                  <div className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">تنبيه بالخلط المحتمل</div>
              </div>
           </div>
         ) : (
           <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-200 animate-spin"></div>
              <p className="font-bold">يرجى الضغط على "تحليل التشابكات" للتحقق من الرسوم اللاحقة والمتعلقة بنفس الاسم أو الموضوع</p>
           </div>
         )}

         {verified && transferred && (
           <div className="p-8 bg-white border-2 border-red-100 rounded-[2.5rem] animate-in slide-in-from-top-10 space-y-6">
              <h4 className="font-black text-red-900 border-r-4 border-red-500 pr-3">بيانات الرسم اللاحق المسيطر:</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">نوع الرسم</p>
                    <p className="font-black text-slate-800">تنازل / بيع كلي</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">مراجعة التضمين</p>
                    <p className="font-black text-slate-800">سجل 45 / عدد 122</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">تاريخ التوثيق</p>
                    <p className="font-black text-slate-800">2024/05/12</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">المستفيد الجديد</p>
                    <p className="font-black text-red-600">كمال بن جلون</p>
                 </div>
              </div>
           </div>
         )}

         {verified && (
           <div className="pt-10 flex justify-center border-t border-slate-50">
              <button onClick={onNext} className="bg-slate-900 text-white px-20 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl hover:bg-black transition-all">
                 الانتقال لتوليد الوثيقة
              </button>
           </div>
         )}
      </div>
    </div>
  );
};

const ExtractionView: React.FC<{ serviceType: ServiceType; onNext: () => void }> = ({ serviceType, onNext }) => {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setDone(true);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in zoom-in-95">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
         <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#064e3b] pr-4">4. وحدة الاستخراج وتوليد الوثيقة</h3>
         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">نوع الوثيقة قيد الاستخراج</p>
                  <p className="text-xl font-black text-[#064e3b]">{serviceType === 'copy' ? 'نسخة طبق الأصل' : serviceType === 'duplicate' ? 'نظير عدلي' : 'شهادة وضعية رسم'}</p>
               </div>
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">رقم الاستخراج المتسلسل</p>
                  <p className="text-xl font-black text-slate-800 underline">EXT-2026-9021</p>
               </div>
            </div>
            
            <div className="space-y-4">
               <label className="flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer group">
                  <input type="checkbox" className="w-6 h-6 accent-[#064e3b]" />
                  <span className="text-sm font-bold text-emerald-900 group-hover:text-[#064e3b]">إدراج التنبيه القانوني التلقائي (خاص بصحة التضمين)</span>
               </label>
               <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 text-xs font-black text-amber-900 flex items-center gap-3">
                  <span>📢</span>
                  تنبیه ذكي: لا يمكن استخراج نظير إلا وفق الضوابط المهنية المعمول بها قانوناً.
               </div>
            </div>
         </div>
         <button 
           onClick={handleGenerate}
           disabled={generating || done}
           className="w-full bg-[#064e3b] text-[#E6BE8A] py-6 rounded-3xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
         >
            {generating ? <span className="animate-spin text-2xl">⏳</span> : <span>📁</span>}
            {generating ? 'جاري التوليد والترقيم...' : done ? 'تم توليد الوثيقة بنجاح ✔' : 'توليد الوثيقة إلكترونياً'}
         </button>

         {done && (
           <button onClick={onNext} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-sm shadow-xl hover:bg-black animate-bounce mt-4">
              التوجه لخاتمة التوصيل والأرشفة
           </button>
         )}
      </div>

      <div className="bg-[#064e3b] p-1 shadow-2xl rounded-[3.5rem] relative flex items-center justify-center min-h-[500px] overflow-hidden">
         <div className="absolute inset-0 bg-white/5 opacity-20"></div>
         <div className={`w-[85%] h-[90%] bg-white rounded-[2.5rem] shadow-2xl p-10 transform transition-all duration-1000 ${done ? 'scale-100 rotate-0 translate-y-0 opacity-100' : 'scale-90 rotate-2 translate-y-10 opacity-30 blur-sm'}`}>
            <div className="border-4 border-double border-emerald-900 h-full p-8 flex flex-col justify-between">
               <div className="flex justify-between items-start border-b-2 border-emerald-900 pb-4">
                  <div className="text-[10px] font-black text-right text-emerald-900">
                     <p>المملكة المغربية</p>
                     <p>هيئة العدول</p>
                     <p>مكتب الأستاذ: {user?.full_name || 'عادل الموثق'}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-900 rounded-full flex items-center justify-center text-white font-black">ط.ع</div>
               </div>
               <div className="flex-1 py-10 text-center space-y-6">
                  <h4 className="text-3xl font-black text-emerald-900 underline decoration-double underline-offset-8 decoration-emerald-200">
                     {serviceType === 'copy' ? 'نسخة من رسم' : serviceType === 'duplicate' ? 'نظير عدلي' : 'شهادة إدارية مسببة'}
                  </h4>
                  <div className="space-y-4 text-slate-600 font-bold leading-loose">
                     <p>الحمد لله وحده.. بصفتي عدل بمكتب التوثيق المذكور أعلاه، أشهد بأنني تنقلت للسجلات وضبطت الرسم المراد...</p>
                     <p className="bg-slate-50 px-4 py-2 rounded-xl text-xs text-slate-400 italic">"هذا الحيز مخصص لنص الرسم والعناصر الجوهرية المستخرجة أوتوماتيكياً"</p>
                  </div>
               </div>
               <div className="border-t-2 border-emerald-900 pt-6 flex justify-between items-center bg-slate-50/50 p-4 rounded-xl">
                  <div className="text-[8px] font-black text-slate-400 space-y-1">
                     <p>رقم التتبع: EXT-2026-9021</p>
                     <p>الربط الأصلي: سجل 12 / ص 22</p>
                  </div>
                  <div className="text-center">
                     <div className="w-16 h-16 bg-slate-900/10 rounded-lg flex items-center justify-center text-slate-400 text-xl font-bold italic rotate-6">SEAL</div>
                     <p className="text-[8px] font-black mt-1 text-emerald-900">توقيع إلكتروني مأمن</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const DeliveryView: React.FC<{ sessionData: any; serviceType: ServiceType }> = ({ sessionData, serviceType }) => {
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('100.00');
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { user } = useAuth();

  const addLedgerEntry = trpc.dailyLedger.addEntry.useMutation();

  const handleArchive = async () => {
    setLoading(true);
    // Generate unique content for QR
    const uniqueReceiptId = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
    
    // Get session token from localStorage using the correct key
    const sessionToken = localStorage.getItem('auth_session_token') || sessionStorage.getItem('auth_session_token') || '';

    try {
      // 1. Save to Daily Ledger
      await addLedgerEntry.mutateAsync({
        sessionToken,
        entry: {
          family_name: sessionData.identity.lastName || 'غير محدد',
          personal_name: sessionData.identity.firstName || 'غير محدد',
          id_card: sessionData.identity.cin || '',
          certificate_type: sessionData.refs.type || 'استخراج',
          operation_type: 'Copy',
          amount_received: parseFloat(amount),
          receipt_number: uniqueReceiptId,
          copy_type: serviceType === 'duplicate' ? 'نظير' : 'نسخة',
          adl1_number: sessionData.refs.register,
          adl1_volume: sessionData.refs.volume,
          adl1_page: sessionData.refs.page,
          reception_date: sessionData.refs.date || undefined,
        }
      });

      const qrData = JSON.stringify({
        id: uniqueReceiptId,
        notary: user?.full_name || 'عادل الموثق',
        date: new Date().toLocaleDateString('ar-SA'),
        amount: `${amount} DH`,
        status: 'ARCHIVED'
      });

      const url = await QRCode.toDataURL(qrData);
      setQrCodeUrl(url);
      setArchived(true);
      alert('تمت أرشفة العملية وتسجيلها في السجل الحسابي اليومي بنجاح.');
    } catch (err: any) {
      console.error(err);
      alert('خطأ في الأرشفة: ' + (err.message || 'فشل الاتصال بالخادم'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!archived) {
      alert('الرجاء أرشفة العملية أولاً لتوليد وصل الأداء.');
      return;
    }
    setShowReceipt(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
       {/* Details Column */}
       <div className="lg:col-span-2 space-y-10">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-2 h-20 bg-[#064e3b]"></div>
             <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#064e3b] pr-4">5. الأجرة، التوصيل، والأرشفة النهائية</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                     <span className="text-amber-500">💰</span> 
                     استيفاء الأتعاب
                   </h4>
                   <div className="p-10 bg-amber-50/50 rounded-[2.5rem] border border-amber-100/50 flex flex-col items-center justify-center relative group min-h-[200px]">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-4 relative z-10">المبلغ الواجب استخلاصه</p>
                      <div className="bg-blue-600 text-white px-8 py-4 rounded-xl shadow-xl transform transition-all focus-within:ring-4 focus-within:ring-blue-300">
                        <div className="flex items-center gap-2">
                           <input 
                              type="text" 
                              value={amount} 
                              onChange={(e) => !archived && setAmount(e.target.value)}
                              disabled={archived}
                              className="bg-transparent text-4xl font-black w-32 outline-none text-center"
                           />
                           <span className="text-lg font-black italic">DH</span>
                        </div>
                      </div>
                      {!archived && <p className="text-[8px] font-bold text-slate-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">انقر على الرقم لتعديلة</p>}
                   </div>
                   <div className="flex gap-2">
                      {[
                        { id: 'cash', label: 'نقدًا' },
                        { id: 'transfer', label: 'تحويل' },
                        { id: 'digital', label: 'إلكتروني' }
                      ].map(m => (
                        <button 
                          key={m.id} 
                          onClick={() => setMethod(m.id)} 
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${method === m.id ? 'bg-[#E6BE8A] text-[#5a0c0b] shadow-xl scale-105' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'}`}
                        >
                           {m.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                     <span className="text-blue-500">📁</span> 
                     ضمانات الأرشفة
                   </h4>
                   <div className="space-y-4">
                      {[
                        'ربط الاستخراج بالرسم الأصلي أوتوماتيكياً',
                        'تسجيل هوية المرتفق في سجل الأثر (Law 09-08)',
                        'إغلاق الملف وتأمينه ضد التغيير اللاحق'
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 text-[10px] font-bold text-slate-600">
                           <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">✓</span>
                           {item}
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="pt-10 flex flex-col md:flex-row gap-4 border-t border-slate-50">
                <button 
                  onClick={handleArchive}
                  disabled={archived || loading}
                  className={`flex-1 py-6 rounded-3xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-4 ${archived ? 'bg-emerald-50 text-emerald-600 cursor-default' : 'bg-[#E6BE8A] hover:bg-[#d4af37] text-[#5a0c0b] active:scale-95'} ${loading ? 'opacity-50' : ''}`}
                >
                   <span>{loading ? '⏳' : archived ? '✅' : '🔐'}</span> 
                   {loading ? 'جاري الأرشفة والتدوين...' : archived ? 'تمت الأرشفة والتدوين في السجل' : 'أرشفة العملية والتدوين في السجل'}
                </button>
                {archived && (
                  <button 
                    onClick={() => {
                        // Logic to navigate to ledger tab or similar would go here
                        // For now we show success and assume the user knows where it is
                        alert('تم الانتقال للسجل الحسابي بنجاح مسبقاً، يمكنك مراجعة القائمة هناك.');
                    }}
                    className="flex-1 bg-blue-600 text-white py-6 rounded-3xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4"
                  >
                     <span>📊</span> 
                     عرض في السجل اليومي
                  </button>
                )}
                <button 
                  onClick={handlePrint}
                  className="flex-1 bg-[#800020] text-white py-6 rounded-3xl font-black text-sm shadow-xl hover:bg-[#5a0c0b] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                   <span>📄</span> 
                   طباعة وصل الأداء
                </button>
             </div>
          </div>
       </div>

       {/* Status Column */}
       <div className="bg-[#064e3b] text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center border-b-[12px] border-[#E6BE8A]/30">
          <div className="absolute inset-0 bg-white/5 opacity-10"></div>
          <div className="relative z-10 text-center space-y-8 w-full">
             <div className="w-24 h-24 bg-[#E6BE8A]/20 rounded-full flex items-center justify-center mx-auto border-4 border-[#E6BE8A]/30 group-hover:animate-bounce transition-all">
                <span className="text-4xl">🚀</span>
             </div>
             <div className="space-y-2">
                <h4 className="text-3xl font-black tracking-tight text-[#E6BE8A]">جاهز للتسليم النهائي</h4>
                <p className="text-emerald-100/60 font-medium text-xs leading-relaxed max-w-[200px] mx-auto">بمجرد الانتهاء من استخلاص الأتعاب، سيتم تفعيل رابط التحميل المباشر للمرتفق وإرساله لعنونه الإلكتروني المسجل.</p>
             </div>
             
             <div className="bg-black/20 p-8 rounded-[2.5rem] border border-white/10 shadow-inner group">
                <p className="text-[10px] font-black uppercase text-emerald-300 mb-3 tracking-widest opacity-70">رمز التتبع السريع</p>
                <p className="text-2xl font-black tracking-[0.2em] text-white">#REC-2026-992#</p>
             </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 px-10">
            <div className="p-4 border border-white/10 rounded-2xl text-[8px] font-black text-emerald-100/30 uppercase tracking-[0.4em] text-center">
               DIGITAL NOTARY LEDGER SYSTEM V4.0
            </div>
          </div>
       </div>

       {/* Receipt Modal */}
       {showReceipt && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300 relative">
               <button onClick={() => setShowReceipt(false)} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black hover:bg-red-50 hover:text-red-600 transition-all">✕</button>
               
               <div className="text-center space-y-2 border-b-4 border-double border-slate-100 pb-6">
                  <h4 className="text-2xl font-black text-slate-900 underline underline-offset-8">وصل أداء الخدمات العدلية</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Professional Receipt</p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400">التاريخ</p>
                        <p className="font-black text-slate-800">{new Date().toLocaleDateString('ar-SA')}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400">الموثق</p>
                        <p className="font-black text-slate-800">{user?.full_name || 'عادل الموثق'}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 p-4">
                     {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="Receipt QR" className="w-28 h-28 mix-blend-multiply" />
                     ) : (
                        <div className="w-28 h-28 bg-white rounded-lg animate-pulse" />
                     )}
                     <p className="text-[8px] font-black text-slate-400 mt-2">تأكيد رقمي مأمن</p>
                  </div>
               </div>

               <div className="bg-[#064e3b] text-white p-6 rounded-[2rem] shadow-xl">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-[10px] font-bold text-emerald-300">طريقة الأداء</p>
                        <p className="font-black">{method === 'cash' ? 'نقدًا' : method === 'transfer' ? 'تحويل' : 'إلكتروني'}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-300 uppercase">المبلغ الإجمالي</p>
                        <p className="text-3xl font-black">{amount} <span className="text-sm">DH</span></p>
                     </div>
                  </div>
               </div>

               <button 
                 onClick={() => window.print()}
                 className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:shadow-2xl transition-all"
               >
                 إصدار وطباعة النهائي 🖨️
               </button>
            </div>
         </div>
       )}
    </div>
  );
};
