import React, { useMemo, useState } from 'react';
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

type TabType = 'dashboard' | 'new_request' | 'financial' | 'workflow' | 'outcome' | 'archive';

export const SearchArchiveManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { user } = useAuth();

  // Shared state for the search request process
  const [formData, setFormData] = useState({
    firstName: 'أحمد',
    lastName: 'الراجي',
    idCard: '',
    phone: '',
    role: 'صاحب الشهادة',
    isInheritance: false,
    inheritanceName: '',
    inheritanceDate: '',
    yearFrom: '1982',
    yearTo: '1985',
    contractType: 'عقد زواج',
    knowsNotary: false,
    notaryName: '',
    center: 'بوزنيقة',
    fees: 150,
    paidAmount: 50,
    paymentMethod: 'نقدًا',
    isReceiptGenerated: false,
    steps: [
      { id: 1, label: 'سجل عدول مركز بوزنيقة - 1982', status: 'completed' as const },
      { id: 2, label: 'نظائر المحكمة الابتدائية بالرباط - 1983', status: 'in-progress' as const },
      { id: 3, label: 'أرشيف مركز توثيق المحارة - 1984', status: 'not-started' as const },
    ],
    checklist: [
      { text: 'هل تم التحقق من صيغ تهجئة اللقب في سجلات الثمانينات؟', checked: false },
      { text: 'هل تم فحص سجلات العدول المتوفين في نفس الفترة؟', checked: false },
      { text: 'هل يوجد احتمال أن الرسم مدمج مع ملف إرث ضخم؟', checked: false },
      { text: 'هل الدفتر رقم 12 سليم أم يحتاج ترميم للمعاينة؟', checked: false },
    ]
  });

  // Mock stats for the dashboard
  const stats = {
    activeRequests: 12,
    foundRequests: 45,
    unfruitfulRequests: 8,
    totalFees: 5400,
    avgDuration: '3.5 أيام',
  };

  return (
    <div className="space-y-8 pb-20 text-right font-sans" dir="rtl">
      {/* Royal Header */}
      <div className="bg-gradient-to-l from-[#5a0c0b] to-[#800020] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-[#E6BE8A]">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 -mr-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <span className="bg-[#E6BE8A] text-[#5a0c0b] p-3 rounded-2xl shadow-lg">🔍</span>
              طلبات البحث في النظائر وسجلات التضمين
            </h1>
            <p className="text-xl text-amber-100/80 font-medium leading-relaxed">
              منظومة إلكترونية متكاملة لتدبير عمليات البحث والتقصي في الأرشيف العدلي وربط النتائج بسجلات التضمين.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white/10 px-6 py-4 rounded-3xl border border-white/20 backdrop-blur-sm text-center">
                <p className="text-[10px] font-black text-[#E6BE8A] uppercase mb-1">حالة النظام</p>
                <p className="text-lg font-black tracking-widest">نشط ✔</p>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
          { id: 'new_request', label: 'طلب بحث جديد', icon: '➕' },
          { id: 'financial', label: 'التدبير المالي', icon: '💰' },
          { id: 'workflow', label: 'مسار التقصي', icon: '🔍' },
          { id: 'outcome', label: 'نتائج البحث', icon: '✅' },
          { id: 'archive', label: 'الأرشيف الصغير', icon: '🗂️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all ${
              activeTab === tab.id
                ? 'bg-[#5a0c0b] text-white shadow-xl scale-105'
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
        {activeTab === 'new_request' && <NewRequestView formData={formData} setFormData={setFormData} onNext={() => setActiveTab('financial')} />}
        {activeTab === 'financial' && <FinancialView formData={formData} setFormData={setFormData} onNext={() => setActiveTab('workflow')} />}
        {activeTab === 'workflow' && <WorkflowView formData={formData} setFormData={setFormData} />}
        {activeTab === 'outcome' && <OutcomeView />}
        {activeTab === 'archive' && <ArchiveView />}
      </div>

      {/* Security Footer */}
      <div className="bg-slate-900 text-white p-12 rounded-[4rem] flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden mt-10">
         <div className="absolute left-0 top-0 w-1/2 h-full bg-amber-500/5 -skew-x-12 -ml-20"></div>
         <div className="space-y-4 z-10">
            <h4 className="text-2xl font-black flex items-center gap-3">
               <span className="text-amber-500">🔐</span> الخصوصية والحماية (09-08)
            </h4>
            <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
               هذا القسم خاص بالعدل فقط، ولا يظهر لأي منصة أخرى. جميع العمليات مسجلة في سجل الأثر (Audit Trail) لضمان الشفافية وحماية المعطيات الشخصية.
            </p>
         </div>
         <div className="flex gap-6 z-10">
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center">
               <p className="text-[10px] font-black text-amber-500 uppercase mb-1">مصدر موثق</p>
               <p className="text-xl font-black tracking-widest leading-none">Official ✔</p>
            </div>
         </div>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ stats: any; setActiveTab: (tab: TabType) => void }> = ({ stats, setActiveTab }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
    {/* Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {[
        { label: 'طلبات جارية', val: stats.activeRequests, icon: '⏳', color: 'text-blue-600', bg: 'bg-blue-50', tab: 'workflow' },
        { label: 'طلبات ناجحة', val: stats.foundRequests, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'outcome' },
        { label: 'غير مثمرة', val: stats.unfruitfulRequests, icon: '❌', color: 'text-red-600', bg: 'bg-red-50', tab: 'outcome' },
        { label: 'أجرة البحث', val: `${stats.totalFees} dh`, icon: '💰', color: 'text-amber-600', bg: 'bg-amber-50', tab: 'financial' },
        { label: 'متوسط المداولة', val: stats.avgDuration, icon: '⏱️', color: 'text-purple-600', bg: 'bg-purple-50', tab: 'archive' },
      ].map((s, i) => (
        <div 
          key={i} 
          onClick={() => setActiveTab(s.tab as TabType)}
          className={`${s.bg} p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col items-center justify-center text-center space-y-3 group hover:scale-105 transition-all cursor-pointer`}
        >
           <span className="text-4xl group-hover:animate-bounce">{s.icon}</span>
           <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
           <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Smart Alerts */}
      <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-red-600 rounded-full"></span>
            تنبيهات ذكية (Smart Alerts)
         </h3>
         <div className="space-y-4">
            {[
              { type: 'delay', msg: 'طلبات بحث تجاوزت المدة العادية (أكثر من 5 أيام)', count: 3, icon: '⏳', tab: 'workflow' },
              { type: 'payment', msg: 'طلبات لم يستكمل أداؤها المالي بعد العثور على الرسم', count: 5, icon: '💰', tab: 'financial' },
              { type: 'ready', msg: 'طلبات جاهزة للتسليم للمرتفقين', count: 8, icon: '📄', tab: 'outcome' },
            ].map((alert, i) => (
              <div 
                key={i} 
                onClick={() => setActiveTab(alert.tab as TabType)}
                className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-[#5a0c0b] transition-all cursor-pointer group"
              >
                 <div className="flex items-center gap-4">
                    <span className="text-2xl">{alert.icon}</span>
                    <span className="font-bold text-slate-700">{alert.msg}</span>
                 </div>
                 <span className="bg-[#5a0c0b] text-white px-4 py-1 rounded-full text-xs font-black">{alert.count}</span>
              </div>
            ))}
         </div>
      </div>

      {/* Internal Stats */}
      <div className="bg-[#5a0c0b] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute inset-0 bg-white/5 opacity-10"></div>
         <h3 className="text-xl font-black mb-8 z-10 relative">مؤشرات الأداء الداخلي</h3>
         <div className="space-y-6 z-10 relative">
            <div>
               <div className="flex justify-between text-xs font-black text-amber-100/60 uppercase mb-2">
                  <span>الأبحاث المثمرة</span>
                  <span>85%</span>
               </div>
               <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]"></div>
               </div>
            </div>
            <div>
               <div className="flex justify-between text-xs font-black text-amber-100/60 uppercase mb-2">
                  <span>أكثر الفترات طلباً</span>
                  <span>1990 - 2005</span>
               </div>
               <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[60%]"></div>
               </div>
            </div>
         </div>
         <div className="mt-10 p-6 bg-white/10 rounded-3xl border border-white/20 text-center">
            <p className="text-[10px] font-black text-amber-300 mb-1 leading-none uppercase tracking-widest">مؤشر صعوبة البحث</p>
            <p className="text-xl font-black">متوسط - Moderate</p>
         </div>
      </div>
    </div>
  </div>
);

const NewRequestView: React.FC<{ formData: any; setFormData: (d: any) => void; onNext: () => void }> = ({ formData, setFormData, onNext }) => {
  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in slide-in-from-left-5 space-y-12">
      {/* 1. Applicant Section */}
      <section className="space-y-8">
        <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">1.بيانات طالب البحث</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">الاسم الشخصي</label>
              <input 
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">الاسم العائلي</label>
              <input 
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">رقم البطاقة الوطنية (اختياري)</label>
              <input 
                value={formData.idCard}
                onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">رقم الهاتف</label>
              <input 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold text-center" dir="ltr" placeholder="+212 --- --- ---" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">الصفة</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold text-right"
              >
                 <option>صاحب الشهادة</option>
                 <option>وارث</option>
                 <option>نائب</option>
                 <option>طالب بحث فقط</option>
              </select>
           </div>
           <div className="flex items-center gap-4 bg-amber-50 rounded-2xl px-6 py-4 border border-amber-100">
              <span className="text-xl">💡</span>
              <div className="flex-1">
                 <p className="text-[10px] font-black text-amber-700 leading-none mb-1">سؤال ذكي</p>
                 <p className="text-xs font-bold text-amber-900">هل الطلب يتعلق بإرث؟</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setFormData({...formData, isInheritance: true})} className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${formData.isInheritance ? 'bg-amber-600 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}>نعم</button>
                 <button onClick={() => setFormData({...formData, isInheritance: false})} className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${!formData.isInheritance ? 'bg-amber-600 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}>لا</button>
              </div>
           </div>
        </div>

        {formData.isInheritance && (
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 animate-in zoom-in-95 space-y-4">
             <h4 className="font-black text-slate-800 flex items-center gap-2">
                <span className="text-xl">⚰️</span> معطيات الموروث
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  value={formData.inheritanceName}
                  onChange={(e) => setFormData({ ...formData, inheritanceName: e.target.value })}
                  placeholder="اسم الموروث بالكامل" className="bg-white border-2 border-slate-200 rounded-xl px-6 py-3 font-bold" 
                />
                <input 
                  value={formData.inheritanceDate}
                  onChange={(e) => setFormData({ ...formData, inheritanceDate: e.target.value })}
                  placeholder="تاريخ الوفاة التقريبي" className="bg-white border-2 border-slate-200 rounded-xl px-6 py-3 font-bold" 
                />
             </div>
          </div>
        )}
      </section>

      {/* 2. Search Parameters Section */}
      <section className="space-y-8">
        <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">2.معطيات البحث الزمنية والنوعية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">من سنة</label>
              <input 
                type="number" 
                value={formData.yearFrom}
                onChange={(e) => setFormData({ ...formData, yearFrom: e.target.value })}
                placeholder="19-- / 20--" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold text-center" 
              />
           </div>
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">إلى سنة</label>
              <input 
                type="number" 
                value={formData.yearTo}
                onChange={(e) => setFormData({ ...formData, yearTo: e.target.value })}
                placeholder="19-- / 20--" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold text-center" 
              />
           </div>
           <div className="space-y-2 col-span-2">
              <label className="text-xs font-black text-slate-500 pr-2">نوع العقد المراد البحث عنه</label>
              <select 
                value={formData.contractType}
                onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold text-right"
              >
                 <option>عقد زواج</option>
                 <option>عقد بيع</option>
                 <option>وصية</option>
                 <option>إراثة</option>
                 <option>غير محدد</option>
              </select>
           </div>
        </div>
        <div className="p-6 bg-blue-50 text-blue-800 rounded-3xl border border-blue-100 text-sm font-bold flex items-center gap-4">
           <span className="text-2xl">📢</span>
           <p>تنبيه ذكي: كلما ضاقت الفترة الزمنية المحددة للبحث، زادت دقة النتائج وسرعة استخراج النظير.</p>
        </div>
      </section>

      {/* 3. Notary/Center Info */}
      <section className="space-y-8">
        <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">3.العدول ومقر التلقي</h3>
        <div className="flex gap-4 mb-6">
           <p className="text-sm font-black text-slate-700 font-serif">هل تتذكر اسم أحد العدول الذين تلقوا الإشهاد؟</p>
           <button onClick={() => setFormData({...formData, knowsNotary: true})} className={`px-6 py-1 rounded-xl text-xs font-bold transition-all ${formData.knowsNotary ? 'bg-[#5a0c0b] text-white' : 'bg-slate-100 text-slate-600'}`}>نعم</button>
           <button onClick={() => setFormData({...formData, knowsNotary: false})} className={`px-6 py-1 rounded-xl text-xs font-bold transition-all ${!formData.knowsNotary ? 'bg-[#5a0c0b] text-white' : 'bg-slate-100 text-slate-600'}`}>لا</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {formData.knowsNotary && (
             <div className="space-y-2 group">
                <label className="text-xs font-black text-slate-500 pr-2">اسم العدل (Auto-complete)</label>
                <input 
                  value={formData.notaryName}
                  onChange={(e) => setFormData({ ...formData, notaryName: e.target.value })}
                  placeholder="اكتب الاسم هنا..." className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold" 
                />
             </div>
           )}
           <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">مقر التلقي (محكمة / مركز)</label>
              <input 
                value={formData.center}
                onChange={(e) => setFormData({ ...formData, center: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#5a0c0b] outline-none transition-all font-bold" 
              />
           </div>
        </div>
      </section>

      <div className="pt-10 flex justify-end gap-4 border-t border-slate-100">
         <button 
           onClick={() => setFormData({ ...formData, firstName: '', lastName: '', idCard: '', phone: '' })}
           className="px-12 py-5 rounded-3xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all"
         >
           إفراغ البيانات 🗑️
         </button>
         <button 
           onClick={onNext}
           className="px-16 py-5 rounded-3xl bg-[#5a0c0b] text-[#E6BE8A] font-black text-sm shadow-xl hover:scale-105 transition-all"
         >
           تسجيل طلب البحث ➕
         </button>
      </div>
    </div>
  );
};

const FinancialView: React.FC<{ formData: any; setFormData: (d: any) => void; onNext: () => void }> = ({ formData, setFormData, onNext }) => {
  const [generating, setGenerating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Generate a real QR code with request details
      const qrData = JSON.stringify({
        id: 'R-2026-9921',
        applicant: `${formData.firstName} ${formData.lastName}`,
        amount: formData.paidAmount,
        date: '2026-02-03'
      });
      const url = await QRCode.toDataURL(qrData, {
        margin: 2,
        color: {
          dark: '#5a0c0b',
          light: '#ffffff'
        }
      });
      
      setTimeout(() => {
        setQrCodeUrl(url);
        setFormData({ ...formData, isReceiptGenerated: true });
        setGenerating(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setGenerating(false);
    }
  };

  const handleAction = (action: string) => {
    if (!formData.isReceiptGenerated) return;
    alert(`تم تنفيذ إجراء: ${action}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in zoom-in-95">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
         <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">التدبير المالي للطلب</h3>
         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 pr-2">أجرة البحث المتفق عليها</label>
                  <div className="relative">
                     <input 
                      type="number"
                      value={formData.fees}
                      onChange={(e) => setFormData({...formData, fees: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-2xl text-amber-600 text-center" 
                     />
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">DH</span>
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 pr-2">مبلغ التسبيق</label>
                  <div className="relative">
                     <input 
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value)})}
                      className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-6 py-4 font-black text-2xl text-emerald-600 text-center" 
                     />
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">DH</span>
                  </div>
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 pr-2">طريقة الأداء</label>
               <div className="grid grid-cols-3 gap-2">
                  {['نقدًا', 'تحويل', 'إلكتروني'].map(m => (
                     <button 
                      key={m} 
                      onClick={() => setFormData({...formData, paymentMethod: m})}
                      className={`py-4 rounded-xl text-xs font-black border transition-all ${formData.paymentMethod === m ? 'bg-[#5a0c0b] text-white' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                     >
                       {m}
                     </button>
                  ))}
               </div>
            </div>
         </div>
         <button 
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-black disabled:opacity-50"
         >
            {generating ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <span>🧾</span>
            )}
            {generating ? 'جاري التوليد...' : 'توليد التوصيل الإلكتروني'}
         </button>

         {formData.isReceiptGenerated && (
           <button 
            onClick={onNext}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-emerald-700 animate-bounce"
           >
             بدء مسار البحث والتقصي 🔍
           </button>
         )}
      </div>

      <div className="bg-[#5a0c0b] text-white p-12 rounded-[3.5rem] shadow-2xl relative flex flex-col items-center justify-center overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-2 bg-[#E6BE8A]"></div>
         <div className="absolute inset-0 bg-white/5 opacity-10"></div>
         <div className={`bg-white text-slate-900 p-10 rounded-[2rem] shadow-2xl w-full max-w-sm space-y-6 relative rotate-1 transition-all duration-700 ${formData.isReceiptGenerated ? 'scale-100 opacity-100' : 'scale-90 opacity-40 blur-sm'}`}>
            <div className="border-b-2 border-dashed border-slate-200 pb-4 text-center">
               <p className="font-serif font-black text-xs text-[#5a0c0b]">المملكة المغربية - هيئة العدول</p>
               <h4 className="font-black text-xl mt-1">وصل أداء بحث</h4>
            </div>
            <div className="space-y-3 text-sm">
               <div className="flex justify-between font-bold"><span>رقم الوصل:</span> <span className="text-[#5a0c0b]">#R-2026-9921</span></div>
               <div className="flex justify-between font-bold"><span>طالب البحث:</span> <span>{formData.firstName} {formData.lastName}</span></div>
               <div className="flex justify-between font-bold"><span>مبلغ الأداء:</span> <span className="bg-emerald-50 px-2 rounded-lg">{formData.paidAmount} DH</span></div>
               <div className="flex justify-between font-bold"><span>التاريخ:</span> <span>2026/02/03</span></div>
            </div>
            <div className="flex justify-center pt-4">
               <div className="w-32 h-32 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden shadow-inner relative group">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-20">
                      <span className="text-4xl">QR</span>
                      <span className="text-[8px] font-black uppercase">Pending</span>
                    </div>
                  )}
                  {formData.isReceiptGenerated && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none"></div>}
               </div>
            </div>
            <div className="flex gap-4 justify-center pt-2">
               <button 
                onClick={() => handleAction('تحميل وإرسال بالبريد')}
                className="bg-[#E6BE8A] text-[#5a0c0b] w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:scale-110 active:scale-95 transition-all group"
               >
                 <span className="text-xl group-hover:rotate-12 transition-transform">✉️</span>
               </button>
               <button 
                onClick={() => handleAction('إرسال للمحمول (WhatsApp/SMS)')}
                className="bg-[#2563EB] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(37,99,235,0.2)] hover:scale-110 active:scale-95 transition-all group"
               >
                 <span className="text-xl group-hover:rotate-12 transition-transform">📱</span>
               </button>
               <button 
                onClick={() => handleAction('طباعة الوصل الفورية')}
                className="bg-[#5a0c0b] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(90,12,11,0.2)] hover:scale-110 active:scale-95 transition-all group"
               >
                 <span className="text-xl group-hover:rotate-12 transition-transform">🖨️</span>
               </button>
            </div>
         </div>
         <p className="mt-8 text-amber-200/60 text-[10px] font-black uppercase tracking-[0.4em] z-10 text-center">Electronic Receipt System</p>
      </div>
    </div>
  );
};

const WorkflowView: React.FC<{ formData: any; setFormData: (d: any) => void }> = ({ formData, setFormData }) => {
  const toggleChecklist = (index: number) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index].checked = !newChecklist[index].checked;
    setFormData({ ...formData, checklist: newChecklist });
  };

  const updateStepStatus = (id: number) => {
    const newSteps = formData.steps.map((s: any) => {
       if (s.id === id) {
          const statuses = ['not-started', 'in-progress', 'completed'];
          const nextIdx = (statuses.indexOf(s.status) + 1) % 3;
          return { ...s, status: statuses[nextIdx] };
       }
       return s;
    });
    setFormData({ ...formData, steps: newSteps });
  };

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in slide-in-from-right-5">
       <div className="flex justify-between items-center mb-12">
          <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">مسار البحث والتقصي (Workflow)</h3>
          <span className="bg-blue-50 text-blue-700 px-6 py-2 rounded-2xl text-xs font-black border border-blue-100">البحث جارٍ عن ({formData.firstName} {formData.lastName})</span>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
             <h4 className="font-black text-slate-800 text-lg">🔍 حوض البحث الجغرافي والزماني</h4>
             <div className="space-y-4">
                {formData.steps.map((step: any, i: number) => (
                  <div 
                    key={i} 
                    onClick={() => updateStepStatus(step.id)}
                    className={`p-6 rounded-3xl border flex items-center justify-between transition-all cursor-pointer group ${step.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : step.status === 'in-progress' ? 'bg-white border-[#5a0c0b] shadow-lg scale-105' : 'bg-slate-50 border-slate-100'}`}
                  >
                     <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full bg-white border flex items-center justify-center font-black text-xs ${step.status === 'in-progress' ? 'border-[#5a0c0b] text-[#5a0c0b]' : ''}`}>{i+1}</span>
                        <span className={`font-bold ${step.status === 'completed' ? 'text-emerald-700' : 'text-slate-700'}`}>{step.label}</span>
                     </div>
                     <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg transition-all ${step.status === 'completed' ? 'bg-emerald-500 text-white' : step.status === 'in-progress' ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-300 text-white'}`}>
                        {step.status === 'completed' ? 'تم البحث ✔' : step.status === 'in-progress' ? 'جارٍ البحث ⏳' : 'في القائمة'}
                     </span>
                  </div>
                ))}
             </div>
             <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">انقر على المشروع لتحديث حالته</p>
          </div>

          <div className="bg-[#5a0c0b]/5 p-10 rounded-[3rem] border border-[#5a0c0b]/10 space-y-8">
             <h4 className="font-black text-[#5a0c0b] text-lg flex items-center gap-3">
                <span className="animate-pulse">🧠</span> أسئلة استرشادية (Checklist ذكية)
             </h4>
             <div className="space-y-4">
                {formData.checklist.map((q: any, i: number) => (
                  <label key={i} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${q.checked ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-white border-[#5a0c0b]/5 hover:bg-white active:scale-95'}`}>
                     <input 
                      type="checkbox" 
                      checked={q.checked}
                      onChange={() => toggleChecklist(i)}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer" 
                     />
                     <span className={`text-sm font-bold transition-all ${q.checked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700 group-hover:text-[#5a0c0b]'}`}>{q.text}</span>
                  </label>
                ))}
             </div>
             <div className="p-4 bg-[#5a0c0b] text-[#E6BE8A] rounded-2xl text-[10px] font-black text-center uppercase tracking-widest opacity-60 mt-6">
                نظام التنبيهات من السهو العدلي V2.0
             </div>
          </div>
       </div>
    </div>
  );
};

const OutcomeView: React.FC = () => {
  const [result, setResult] = useState<'found' | 'not_found' | null>(null);
  
  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in fade-in transition-all">
       <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4 mb-10">نتيجة البحث النهائية</h3>
       
       <div className="flex gap-8 mb-12">
          <button 
           onClick={() => setResult('found')}
           className={`flex-1 p-10 rounded-[3rem] border-4 transition-all flex flex-col items-center gap-4 group ${result === 'found' ? 'border-emerald-500 bg-emerald-50 shadow-2xl scale-105' : 'border-slate-100 bg-slate-50 opacity-40 hover:opacity-100'}`}
          >
             <span className="text-6xl group-hover:rotate-12 transition-transform">✅</span>
             <span className="text-xl font-black text-emerald-700 uppercase tracking-widest">تم العثور على الرسم</span>
          </button>
          <button 
           onClick={() => setResult('not_found')}
           className={`flex-1 p-10 rounded-[3rem] border-4 transition-all flex flex-col items-center gap-4 group ${result === 'not_found' ? 'border-red-500 bg-red-50 shadow-2xl scale-105' : 'border-slate-100 bg-slate-50 opacity-40 hover:opacity-100'}`}
          >
             <span className="text-6xl group-hover:rotate-12 transition-transform">❌</span>
             <span className="text-xl font-black text-red-700 uppercase tracking-widest">لم يتم العثور</span>
          </button>
       </div>

       {result === 'found' && (
         <div className="animate-in slide-in-from-top-10 space-y-10 border-t-2 border-slate-100 pt-10">
            <h4 className="text-lg font-black text-slate-800 bg-[#5a0c0b]/5 px-6 py-2 rounded-full inline-block">📘 ربط المعطيات بدفتر التضمين</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">رقم الدفتر</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black" placeholder="رقم الدفتر" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">نوع الشهادة (حرف)</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-center" placeholder="أ / ب / ج" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">العدد</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-center" placeholder="00" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">رقم الصحيفة</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-center" placeholder="00" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">اسم العدلين</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black" placeholder="فلان وفلان" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 pr-2">مركز التوثيق</label>
                 <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black" placeholder="المحكمة الابتدائية بـ..." />
               </div>
            </div>
            <div className="flex gap-4 pt-10 border-t border-slate-100">
               <button 
                onClick={() => alert('جاري فتح واجهة الرسم العدلي الجديد...')}
                className="flex-1 bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all hover:bg-emerald-700"
               >
                 فتح رسم جديد ✍️
               </button>
               <button 
                onClick={() => alert('جاري البحث في الرسوم الموجودة للربط...')}
                className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all hover:bg-black"
               >
                 ربط مع رسم موجود 🔗
               </button>
            </div>
         </div>
       )}

       {result === 'not_found' && (
         <div className="animate-in slide-in-from-top-10 space-y-6 border-t-2 border-slate-100 pt-10">
            <h4 className="text-lg font-black text-red-900">تحديد سبب عدم العثور لدقة الأرشيف:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {['عدم التلقي', 'خارج الفترة', 'مركز آخر', 'تعذر القراءة'].map(reason => (
                 <button 
                  key={reason} 
                  onClick={() => alert(`تم تحديد السبب: ${reason}`)}
                  className="py-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-black text-xs hover:bg-red-100 transition-all active:scale-95"
                 >
                   {reason}
                 </button>
               ))}
            </div>
            <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 min-h-[150px] outline-none font-bold focus:border-red-500" placeholder="ملاحظات العدل النهائية للإغلاق والأرشفة..." />
            <div className="flex justify-end">
               <button 
                onClick={() => alert('تم إغلاق الطلب وتهميشه في الأرشيف بنجاح.')}
                className="bg-red-600 text-white px-12 py-5 rounded-3xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
               >
                 إغلاق وتهميش الطلب 🔒
               </button>
            </div>
         </div>
       )}
    </div>
  );
};

const ArchiveView: React.FC = () => (
  <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 animate-in slide-in-from-bottom-10">
     <div className="flex justify-between items-center mb-12">
        <h3 className="text-2xl font-black text-slate-900 border-r-8 border-[#5a0c0b] pr-4">الأرشيف الصغير - سجل عمليات البحث</h3>
        <div className="flex gap-4">
           <input placeholder="بحث في الأرشيف باسم المرتفق..." className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-bold text-sm min-w-[300px]" />
           <button className="bg-[#5a0c0b] text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg">فلترة 🔍</button>
        </div>
     </div>
     
     <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
        <table className="w-full text-right border-collapse">
           <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">رقم الطلب</th>
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">طالب البحث</th>
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">نوع الشهادة</th>
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">النتيجة</th>
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">التاريخ</th>
                 <th className="p-6 text-xs font-black text-slate-400 font-serif uppercase tracking-widest">الإجراء</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
              {[
                { id: 'REQ-2026-001', name: 'يوسف العراقي', kind: 'إراثة', status: 'ناجح ✔', date: '03-02-2026' },
                { id: 'REQ-2026-002', name: 'فاطمة بناني', kind: 'عقد بيع', status: 'غير مثمر ❌', date: '02-02-2026' },
                { id: 'REQ-2026-003', name: 'أحمد الصبار', kind: 'عقد زواج', status: 'جاري ⏳', date: '01-02-2026' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="p-6 font-black text-sm text-[#5a0c0b]">{row.id}</td>
                   <td className="p-6 font-bold text-slate-700">{row.name}</td>
                   <td className="p-6 font-bold text-slate-700">{row.kind}</td>
                   <td className="p-6">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black ${row.status.includes('ناجح') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : row.status.includes('جاري') ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                         {row.status}
                      </span>
                   </td>
                   <td className="p-6 font-medium text-slate-400 text-xs">{row.date}</td>
                   <td className="p-6">
                      <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black group-hover:bg-[#5a0c0b] group-hover:text-white transition-all shadow-sm">تفاصيل</button>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
     </div>
  </div>
);
