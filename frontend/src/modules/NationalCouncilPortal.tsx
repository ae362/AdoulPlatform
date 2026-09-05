import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';
import { NationalFinancialManagement } from './NationalFinancialManagement';
import { NationalAuthorityFinances } from './NationalAuthorityFinances';
import { NationalRegionalCouncils } from './NationalRegionalCouncils';
import { NationalIncomeRegionsExplorer } from './NationalIncomeRegionsExplorer';
import { NationalNotariesTechnicalCards } from './NationalNotariesTechnicalCards';
import { NationalRequestsManagement } from './NationalRequestsManagement';
import { NationalStatisticalManagement } from './NationalStatisticalManagement';
import NationalExecutiveCorrespondence from '../pages/NationalCouncil/NationalExecutiveCorrespondence';
import NationalNotificationsCenterPage from '../pages/NationalCouncil/NationalNotificationsCenterPage';
import { DateWidget } from './DateWidget';
import { OrnateScrollBanner } from '../components/common/OrnateScrollBanner';

// --- Imports ---

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const languages = { ar: 'العربية', fr: 'Français' };
  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-[#1d2569]/20"
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {Object.entries(languages).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

// --- Types & Interfaces ---

interface NavItem {
  path: string;
  label: string;
  icon: string;
  isSubItem?: boolean;
}

// --- Navigation Config ---

const NAV_ITEMS: NavItem[] = [
  { path: '', label: 'لوحة القيادة الوطنية', icon: '📊' },
  // National Financial Management
   { path: 'notifications-center', label: 'مركز التنبيهات الوطنية', icon: '🔔' },
  { path: 'authority-finances', label: 'التدبير المالي للهيئة الوطنية', icon: '🏦' },
   { path: 'income-regions', label: 'مداخيل الجهات (بحث/تصفية)', icon: '🌍' },
   { path: 'notaries-technical-cards', label: 'البطاقة التقنية للسادة العدول', icon: '🪪' },
  { path: 'regional-governance', label: 'إدارة المجالس الجهوية', icon: '🗺️' },
  { path: 'national-executive-correspondence', label: 'الصادرات والواردات / المكاتب الجهوية', icon: '🏛️' },
  { path: 'regional-councils', label: 'سجل الاشتراكات السنوية', icon: '💰' },
  { path: 'financial-subscriptions', label: 'التدبير المالي المركزي', icon: '🏛️' },
  { path: 'national-requests', label: 'قسم الطلبات الواردة من العدول', icon: '📂' },

  { path: 'ethics', label: 'الأخلاقيات والسلوك', icon: '⚖️' },
  { path: 'correspondence', label: 'المراسلات والتنسيق', icon: '✉️' },
  { path: 'governance', label: 'الاجتماعات والقيادة', icon: '🎥' },
  { path: 'training', label: 'التكوين والثقافة', icon: '🎓' },
  { path: 'exams', label: 'المباريات والولوج', icon: '🏁' },
  { path: 'discipline', label: 'النظام التأديبي', icon: '🔨' },
  
  // --- Enhanced National Statistics ---
  { path: 'strategic-intelligence', label: 'الذكاء الإحصائي الاستراتيجي', icon: '🎯' },
  { path: 'strategic-intelligence?tab=vision', label: 'الأهداف والتوجيه', icon: '🚩', isSubItem: true },
  { path: 'strategic-intelligence?tab=dashboard', label: 'لوحة القيادة الوطنية', icon: '📊', isSubItem: true },
  { path: 'strategic-intelligence?tab=reports', label: 'التقارير المتخصصة', icon: '📋', isSubItem: true },
  { path: 'strategic-intelligence?tab=engine', label: 'محرك التقارير الذكي', icon: '⚙️', isSubItem: true },
  { path: 'strategic-intelligence?tab=ai', label: 'الذكاء والتنبؤ', icon: '🔮', isSubItem: true },
  { path: 'strategic-intelligence?tab=judicial', label: 'إحصائيات قاضي التوثيق', icon: '⚖️' },
];

// --- Sub-Components ---

function Dashboard() {
  const navigate = useNavigate();
  // Fetch real data
  const { data: stats } = trpc.statistics.summary.useQuery();
  
  return (
    <div className="space-y-6">
      {/* Header / Vision */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border-t-4 border-red-950">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-red-950">لوحة القيادة الوطنية</h1>
               <p className="text-gray-600 mt-2 max-w-2xl">
                 منصة القيادة العليا لتدبير مهنة العدالة، وتنسيق مؤسساتها، والسهر على أخلاقياتها، وضمان استمراريتها وتطورها.
               </p>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100">
               <span className="text-red-900 font-bold">🎯 الرؤية الشمولية</span>
            </div>
         </div>
      </div>

      {/* Philosophy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { title: 'قائد مؤسساتي', icon: '👑', color: 'bg-red-50 text-red-900', action: () => navigate('regional-councils') },
           { title: 'منسق وطني', icon: '🔄', color: 'bg-[#E6BE8A]/20 text-yellow-900', action: () => navigate('correspondence') },
           { title: 'ضامن للأخلاقيات', icon: '⚖️', color: 'bg-amber-50 text-amber-900', action: () => navigate('ethics') },
           { title: 'شريك للسلطة', icon: '🤝', color: 'bg-slate-50 text-slate-900', action: () => navigate('reports') },
         ].map((card, idx) => (
           <div 
             key={idx} 
             onClick={card.action}
             className={`p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 ${card.color} cursor-pointer hover:scale-105 transition-transform`}
           >
             <span className="text-2xl">{card.icon}</span>
             <span className="font-bold">{card.title}</span>
           </div>
         ))}
      </div>

      {/* Key Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document Activity (Replacing Regional Activity placeholder with Real Data) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-[#E6BE8A] transition-colors" onClick={() => navigate('reports')}>
           <h3 className="text-gray-500 font-medium mb-4 text-sm">نشاط التوثيق العدلي</h3>
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-[#E6BE8A]/30 border-t-[#E6BE8A] flex items-center justify-center">
                 <span className="font-bold text-[#b08d55]">
                    {stats?.summary ? stats.summary.reduce((acc, curr) => acc + curr.count, 0) : '...'}
                 </span>
              </div>
              <div>
                 <p className="font-bold text-gray-800">إجمالي الوثائق</p>
                 <p className="text-xs text-gray-500">المسجلة في النظام</p>
              </div>
           </div>
        </div>

        {/* System Status (Replacing Alerts with generic status for now) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-red-200 transition-colors" onClick={() => navigate('discipline')}>
           <h3 className="text-gray-500 font-medium mb-4 text-sm">حالة النظام</h3>
           <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                 <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> الخوادم</span>
                 <span className="font-bold text-gray-800">تعمل</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                 <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> قاعدة البيانات</span>
                 <span className="font-bold text-gray-800">متصلة</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}


function RegionalCouncils() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'annual' | 'voluntary' | 'donations' | null;
  const initialTab = tabParam || 'annual';
  
  const [activeTab, setActiveTab] = React.useState<'annual' | 'voluntary' | 'donations'>(initialTab);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'paid' | 'unpaid'>('all');
  const [search, setSearch] = React.useState('');

  // Sync internal state with URL
  React.useEffect(() => {
     if (tabParam && tabParam !== activeTab) {
        setActiveTab(tabParam);
     }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (tab: 'annual' | 'voluntary' | 'donations') => {
     setActiveTab(tab);
     setSearchParams({ tab });
  };

  // Use real notary data (augmented with mock financial status for now since DB table doesn't exist)
  const { data: adouls, isLoading } = trpc.notaries.list.useQuery({ search });

  // Mock financial augmentation (Deterministic based on name length for demo consistency)
  const augmentedData = React.useMemo(() => {
     if (!adouls) return [];
     return adouls.map(adoul => {
        const hash = adoul.full_name.length;
        let status: 'paid' | 'unpaid' | 'pending' | 'voluntary' | 'donation' = 'unpaid';
        if (activeTab === 'annual') {
           status = hash % 3 === 0 ? 'paid' : hash % 3 === 1 ? 'pending' : 'unpaid';
        } else if (activeTab === 'voluntary') {
           status = 'voluntary';
        } else {
           status = 'donation';
        }
        
        return {
           ...adoul,
           financialStatus: status,
           amount: (hash * 100) + 500,
           paymentDate: status === 'paid' ? '2025-12-15' : null,
           paymentMethod: status === 'paid' ? 'تحويل بنكي' : null
        };
     }).filter(item => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'paid') return item.financialStatus === 'paid' || item.financialStatus === 'voluntary' || item.financialStatus === 'donation';
        if (statusFilter === 'unpaid') return item.financialStatus === 'unpaid' || item.financialStatus === 'pending';
        return true;
     });
  }, [adouls, activeTab, statusFilter]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'paid': return { color: 'bg-green-100 text-green-700', icon: '✔️', label: 'مؤدٍّ للاشتراك', border: 'border-green-200' };
      case 'unpaid': return { color: 'bg-red-50 text-red-700', icon: '❗', label: 'غير مؤدٍّ للاشتراك', border: 'border-red-200' };
      case 'pending': return { color: 'bg-yellow-50 text-yellow-700', icon: '⏳', label: 'في طور الأداء', border: 'border-yellow-200' };
      case 'voluntary': return { color: 'bg-blue-50 text-blue-700', icon: '🤝', label: 'اشتراك تطوعي', border: 'border-blue-200' };
      case 'donation': return { color: 'bg-purple-50 text-purple-700', icon: '🎁', label: 'تبرع', border: 'border-purple-200' };
      default: return { color: 'bg-gray-100', icon: '?', label: 'غير محدد', border: 'border-gray-200' };
    }
  };

  const handleReminder = (name: string, type: 'gentle' | 'formal') => {
     const message = type === 'gentle' 
        ? `حضرة العدل المحترم ${name}،\nنحيطكم علمًا بأن الاشتراك السنوي للمجلس الجهوي لم يتم تسويته بعد، ونرجو منكم التفضل بتسوية الوضعية في أقرب الآجال، شاكرين تعاونكم.`
        : `إلى السيد ${name}،\nفي إطار الحرص على انتظام السير المهني، يرجى تسوية الاشتراك السنوي للمجلس الجهوي.`;
     alert(`تم إرسال التذكير:\n\n${message}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
       {/* 1. Header & Philosophy */}
       <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
             <h2 className="text-3xl font-bold mb-4">💰 سجل الاشتراكات الجهوية</h2>
             <p className="text-slate-200 text-lg leading-relaxed max-w-3xl">
                فضاء شفاف ومنظم لتتبع الالتزامات المالية المهنية، في إطار من الوضوح، واللباقة، واحترام المكانة الاعتبارية للعدل.
             </p>
             <div className="flex gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                   <span className="font-bold">🧭 الفلسفة العامة:</span> الاشتراك التزام مهني وليس أداة طغط
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                   <span className="font-bold">🎯 الهدف:</span> التتبع والتنظيم دون تشهير
                </div>
             </div>
          </div>
       </div>

       {/* 2. Dashboard Stats (Simulated) */}
       <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="text-sm text-gray-500 mb-1">🟢 المؤدين</div>
             <div className="text-2xl font-bold text-green-700">65</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="text-sm text-gray-500 mb-1">🔴 غير المؤدين</div>
             <div className="text-2xl font-bold text-red-700">12</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="text-sm text-gray-500 mb-1">🟡 في طور التسوية</div>
             <div className="text-2xl font-bold text-yellow-600">8</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="text-sm text-gray-500 mb-1">💠 اشتراكات تطوعية</div>
             <div className="text-2xl font-bold text-blue-700">24</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <div className="text-sm text-gray-500 mb-1">🎁 تبرعات</div>
             <div className="text-2xl font-bold text-purple-700">3</div>
          </div>
       </div>

       {/* 3. Main Interface */}
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between gap-4">
             {/* Tabs */}
             <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                {[
                   { id: 'annual', label: 'الاشتراك السنوي الإجباري', icon: '📅' },
                   { id: 'voluntary', label: 'الاشتراكات التطوعية', icon: '🤝' },
                   { id: 'donations', label: 'تبرعات', icon: '🎁' },
                ].map(tab => (
                   <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                      <span>{tab.icon}</span> {tab.label}
                   </button>
                ))}
             </div>

             {/* Filters & Actions */}
             <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                   <input 
                      type="text" 
                      placeholder="بحث بالاسم أو رقم التأجير..." 
                      className="pl-4 pr-10 py-2 rounded-lg border border-gray-200 w-64 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                   />
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                </div>
                
                <select 
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none"
                  value={statusFilter}
                  onChange={(e:any) => setStatusFilter(e.target.value)}
                >
                   <option value="all">كل الحالات</option>
                   <option value="paid">المؤدون فقط</option>
                   <option value="unpaid">المتأخرون فقط ⚠️</option>
                </select>

                <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 flex items-center gap-2">
                   <span>📤</span> تصدير Excel
                </button>
             </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-600 text-sm font-medium border-b border-gray-200">
                   <tr>
                      <th className="p-4 w-1/4">العدل / رقم التأجير</th>
                      <th className="p-4">الدائرة القضائية</th>
                      <th className="p-4">نوع الاشتراك</th>
                      <th className="p-4">الحالة المالية</th>
                      <th className="p-4">المبلغ</th>
                      <th className="p-4">تاريخ الأداء</th>
                      <th className="p-4">إجراءات</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {isLoading ? (
                      <tr><td colSpan={7} className="p-12 text-center text-gray-400">جاري تحميل السجل المالي...</td></tr>
                   ) : augmentedData.length === 0 ? (
                      <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد سجلات مطابقة</td></tr>
                   ) : augmentedData.map((adoul: any, i) => {
                      const status = getStatusConfig(adoul.financialStatus);
                      return (
                         <tr key={adoul.id || i} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                               <div className="font-bold text-gray-900">{adoul.full_name}</div>
                               <div className="text-xs text-gray-400 font-mono mt-0.5">#{adoul.appointment_number?.slice(0, 8) || '---'}</div>
                            </td>
                            <td className="p-4 text-sm text-gray-600">{adoul.region}</td>
                            <td className="p-4 text-sm">
                               {activeTab === 'annual' ? '2026' : activeTab === 'voluntary' ? 'نشاط تكويني' : 'دعم المجلس'}
                            </td>
                            <td className="p-4">
                               <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color} ${status.border}`}>
                                  <span>{status.icon}</span> {status.label}
                               </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-gray-700">{adoul.amount} د.م</td>
                            <td className="p-4 text-sm text-gray-500">
                               {adoul.paymentDate || <span className="text-gray-300 italic">--</span>}
                            </td>
                            <td className="p-4">
                               {adoul.financialStatus === 'unpaid' && (
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button 
                                       onClick={() => handleReminder(adoul.full_name, 'gentle')}
                                       title="تذكير لبق"
                                       className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex items-center justify-center transition-colors"
                                     >
                                        👋
                                     </button>
                                     <button 
                                       onClick={() => handleReminder(adoul.full_name, 'formal')}
                                       title="تنبيه رسمي (داخلي)"
                                       className="w-8 h-8 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center transition-colors"
                                     >
                                        🔔
                                     </button>
                                  </div>
                               )}
                               {adoul.financialStatus === 'paid' && (
                                  <button className="text-blue-600 hover:underline text-xs font-bold">تحميل الوصل</button>
                               )}
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
          
          {/* Footer Note */}
          <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
             <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                <span>🔒</span> بيانات محمية بموجب السر المهني. يظهر التنبيه للمتأخرين داخلياً فقط ولا يؤثر على سير عملهم في النظام.
             </p>
          </div>
       </div>
    </div>
  );
}

function AdoulRegistry() {
   const [search, setSearch] = React.useState('');
   const [selectedAdoul, setSelectedAdoul] = React.useState<any>(null);
   const [isEditing, setIsEditing] = React.useState(false);
   const [editForm, setEditForm] = React.useState<any>({});
   const utils = trpc.useUtils();
   
   // Query all notaries matching search
   const { data: adouls, isLoading } = trpc.notaries.list.useQuery({ 
      search: search,
   });

   const updateMutation = trpc.notaries.updateProfile.useMutation({
      onSuccess: () => {
         utils.notaries.list.invalidate();
         setIsEditing(false);
         if (selectedAdoul) {
            setSelectedAdoul((prev: any) => ({ ...prev, ...editForm }));
         }
         alert('تم تحديث البيانات بنجاح ✅');
      },
      onError: (err) => {
         alert(`خطأ في التحديث: ${err.message}`);
      }
   });

   const handleEditClick = () => {
      if (!selectedAdoul) return;
      setEditForm({
         id: selectedAdoul.id,
         full_name: selectedAdoul.full_name,
         phone: selectedAdoul.phone,
         office_location: selectedAdoul.office_location,
         primary_court: selectedAdoul.primary_court,
         appointment_number: selectedAdoul.appointment_number,
         appellate_court: selectedAdoul.region
      });
      setIsEditing(true);
   };

   const handleSave = () => {
      updateMutation.mutate(editForm);
   };

   // Helper Component for consistent rows
   const InfoRow = ({ label, value, isLtr = false, className = '' }: any) => (
      <div className="flex justify-between items-center border-b border-gray-200/50 pb-3 last:border-0 last:pb-0">
         <span className="text-gray-500 text-sm font-medium">{label}</span>
         <span className={`font-bold text-gray-800 ${isLtr ? 'dir-ltr text-right' : ''} ${className}`}>
            {value || <span className="text-gray-300 italic">غير متوفر</span>}
         </span>
      </div>
   );

   // Helper Component for Edit Inputs
   const EditInput = ({ label, value, onChange, disabled = false }: any) => (
       <div className="mb-4">
           <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
           <input 
               type="text" 
               className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#E6BE8A] outline-none transition-all ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
               value={value || ''}
               onChange={onChange}
               disabled={disabled}
           />
       </div>
   );

   if (selectedAdoul) {
      return (
         <div className="space-y-6 animate-fade-in">
            {/* Navigation Back */}
            {!isEditing && (
               <button 
                  onClick={() => setSelectedAdoul(null)}
                  className="group flex items-center gap-2 text-gray-600 hover:text-red-950 transition-all font-medium mb-2 pr-2"
               >
                  <span className="group-hover:-translate-x-1 transition-transform">➡️</span> 
                  <span>العودة إلى اللائحة</span>
               </button>
            )}
            
            {/* Profile Card or Edit Form */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
             
               {isEditing ? (
                  // --- EDIT MODE ---
                  <div className="p-8">
                     <div className="flex justify-between items-center mb-8 border-b pb-4">
                        <h3 className="text-2xl font-bold text-red-950 flex items-center gap-2">
                           <span>✏️</span> تعديل بيانات العدل
                        </h3>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                                <h4 className="font-bold text-red-900 mb-2">المعلومات الأساسية</h4>
                                <EditInput label="الاسم الكامل" value={editForm.full_name} onChange={(e:any) => setEditForm({...editForm, full_name: e.target.value})} />
                                <EditInput label="الهاتف" value={editForm.phone} onChange={(e:any) => setEditForm({...editForm, phone: e.target.value})} />
                             </div>
                         </div>
                         <div className="space-y-4">
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <h4 className="font-bold text-slate-900 mb-2">المسار المهني</h4>
                                <EditInput label="محكمة الاستئناف" value={editForm.appellate_court} onChange={(e:any) => setEditForm({...editForm, appellate_court: e.target.value})} />
                                <EditInput label="المحكمة الابتدائية" value={editForm.primary_court} onChange={(e:any) => setEditForm({...editForm, primary_court: e.target.value})} />
                                <EditInput label="رقم قرار التعيين" value={editForm.appointment_number} onChange={(e:any) => setEditForm({...editForm, appointment_number: e.target.value})} />
                                <EditInput label="عنوان المكتب" value={editForm.office_location} onChange={(e:any) => setEditForm({...editForm, office_location: e.target.value})} />
                             </div>
                         </div>
                     </div>
                     
                     <div className="flex gap-4 mt-8 justify-end border-t pt-6 bg-gray-50 -mx-8 -mb-8 p-8">
                         <button 
                           onClick={() => setIsEditing(false)} 
                           className="px-6 py-2 rounded-lg text-gray-600 hover:bg-white hover:shadow-sm font-bold border border-transparent hover:border-gray-200 transition-all"
                        >
                           إلغاء
                        </button>
                         <button 
                           onClick={handleSave} 
                           disabled={updateMutation.isLoading}
                           className="px-8 py-2 rounded-lg bg-[#E6BE8A] text-red-950 hover:bg-[#d4ac7a] font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        >
                            {updateMutation.isLoading ? (
                               <>
                                 <span className="animate-spin">⌛</span> جاري الحفظ...
                               </>
                            ) : (
                               <>
                                 <span>💾</span> حفظ التغييرات
                               </>
                            )}
                         </button>
                     </div>
                  </div>
               ) : (
                  // --- VIEW MODE ---
                  <>
                     {/* Hero Banner */}
                     <div className="h-48 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-red-950 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-red-900/50 to-red-950/50"></div>
                     </div>

                     <div className="px-8 md:px-10 pb-10">
                        <div className="relative -mt-20 mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
                           <div className="flex flex-col md:flex-row items-end gap-6 w-full">
                              {/* Avatar */}
                              <div className="w-40 h-40 rounded-3xl bg-white p-1.5 shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-300 relative z-10">
                                 {selectedAdoul.photo_url ? (
                                    <img src={selectedAdoul.photo_url} alt={selectedAdoul.full_name} className="w-full h-full object-cover rounded-2xl border border-gray-100" />
                                 ) : (
                                    <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center text-5xl border border-slate-100 text-slate-300">
                                       👤
                                    </div>
                                 )}
                                 <div className="absolute -bottom-3 -right-3 bg-green-500 text-white p-2 rounded-full border-4 border-white shadow-sm" title="متصل">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                 </div>
                              </div>

                              {/* Name & Identity */}
                              <div className="mb-3 text-right flex-1">
                                 <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                                    {selectedAdoul.full_name}
                                 </h2>
                                 <div className="flex flex-wrap gap-3 text-sm">
                                    <span className="bg-red-50 text-red-900 px-3 py-1 rounded-full border border-red-100 font-bold flex items-center gap-2 shadow-sm">
                                       📜 عدل موثق
                                    </span>
                                    <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-2">
                                       📍 {selectedAdoul.region || 'غير محدد'}
                                    </span>
                                 </div>
                              </div>
                           </div>

                           {/* Action Buttons */}
                           <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                              <button 
                                 onClick={handleEditClick}
                                 className="flex-1 md:flex-none bg-[#E6BE8A] text-red-950 px-6 py-3 rounded-xl font-bold hover:bg-[#d4ac7a] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                              >
                                 <span>✏️</span> تعديل البيانات
                              </button>
                              <button className="md:hidden bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-bold hover:bg-gray-200">
                                 ...
                              </button>
                           </div>
                        </div>
                        
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                           <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-red-100 transition-colors group">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                                 <span className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">⚖️</span>
                                 المعلومات المهنية
                              </h3>
                              <div className="space-y-4">
                                 <InfoRow label="المحكمة الابتدائية" value={selectedAdoul.primary_court} />
                                 <InfoRow label="رقم قرار التعيين" value={selectedAdoul.appointment_number} />
                                 <InfoRow label="تاريخ التعيين" value={selectedAdoul.start_date ? new Date(selectedAdoul.start_date).toLocaleDateString('ar-MA') : null} />
                                 <InfoRow label="عنوان المكتب" value={selectedAdoul.office_location} />
                              </div>
                           </div>
                           
                           <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-red-100 transition-colors group">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                                 <span className="bg-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">📞</span>
                                 بيانات الاتصال
                              </h3>
                              <div className="space-y-4">
                                 <InfoRow label="البريد الإلكتروني" value={selectedAdoul.email} isLtr />
                                 <InfoRow label="الهاتف" value={selectedAdoul.phone} isLtr />
                                 <InfoRow label="الحالة في النظام" value="نشط وفعال" className="text-green-600 font-bold" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>
      );
   }

   // Helper Component for consistent rows (defined inside or outside) - REMOVED DUPLICATE DEFINITION


   return (
      <div className="space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-red-950">السجل الوطني للعدول</h2>
            <div className="flex gap-2 w-full md:w-auto">
               <input 
                  type="text" 
                  placeholder="بحث بالاسم أو المنطقة..." 
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:border-[#E6BE8A]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
               />
               <button className="bg-red-950 text-white px-4 py-2 rounded-lg hover:bg-red-900 whitespace-nowrap">بحث</button>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <table className="w-full text-right">
               <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                     <th className="p-4">الاسم الكامل</th>
                     <th className="p-4">المجلس الجهوي</th>
                     <th className="p-4">تاريخ التعيين</th>
                     <th className="p-4">الحالة</th>
                     <th className="p-4">الإعدادات</th>
                  </tr>
               </thead>
               <tbody className="divide-y text-slate-700">
                  {isLoading ? (
                     <tr><td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
                  ) : (adouls || []).map((adoul) => (
                     <tr key={adoul.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-800">{adoul.full_name}</td>
                        <td className="p-4">{adoul.region || 'غير محدد'}</td>
                        <td className="p-4 text-gray-400">
                           {adoul.start_date ? new Date(adoul.start_date).toLocaleDateString('ar-MA') : '--/--/----'}
                        </td>
                        <td className="p-4">
                           <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">مسجل</span>
                        </td>
                        <td className="p-4">
                           <button 
                              onClick={() => setSelectedAdoul(adoul)}
                              className="text-[#b08d55] font-bold hover:underline"
                           >
                              الملف الشخصي
                           </button>
                        </td>
                     </tr>
                  ))}
                  {!isLoading && (!adouls || adouls.length === 0) && (
                     <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد نتائج مطابقة</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
}

function Ethics() {
   const handleDownload = () => {
      alert('جاري تنزيل ميثاق الأخلاقيات (PDF)...');
   };

   return (
      <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-red-950">
               <h3 className="font-bold text-lg mb-4">مدونة السلوك</h3>
               <p className="text-gray-600 leading-relaxed mb-4">
                  تعتبر قواعد السلوك المهني الركيزة الأساسية لمهنة العدالة. يجب على جميع العدول الالتزام بالمبادئ التالية: الاستقلالية، الحياد، والنزاهة.
               </p>
               <button 
                  onClick={handleDownload}
                  className="text-[#b08d55] font-bold hover:underline flex items-center gap-2"
               >
                  <span>📥</span> تحميل الميثاق الكامل (PDF)
               </button>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-amber-500">
               <h3 className="font-bold text-lg mb-4">لجنة الأخلاقيات</h3>
               <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                     <span>عدد الملفات المعروضة</span>
                     <span className="font-bold text-red-950">12</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                     <span>نسبة المعالجة</span>
                     <span className="font-bold text-green-600">85%</span>
                  </div>
               </div>
               <button 
                  onClick={() => alert('الانتقال إلى نظام تدبير المخالفات...')}
                  className="w-full mt-4 bg-amber-50 text-amber-900 py-2 rounded-lg font-bold hover:bg-amber-100 transition-colors"
               >
                  عرض التقارير التفصيلية
               </button>
            </div>
         </div>
      </div>
   );
}

function Correspondence() {
   const { user, sessionToken } = useAuth();
   const [activeTab, setActiveTab] = React.useState<'inbox' | 'outbox' | 'drafts'>('inbox');
   
   const { data: threads, isLoading } = trpc.messaging.listThreads.useQuery(
      { sessionToken: sessionToken || '' },
      { enabled: !!sessionToken }
   );

   const handleNewMessage = () => {
      const recipient = prompt('إلى من تود إرسال الرسالة؟ (أدخل الاسم أو الجهة)');
      if (recipient) {
         alert(`تم فتح نافذة إنشاء رسالة جديدة إلى: ${recipient}`);
      }
   };

   const openMessage = (id: string) => {
      alert(`فتح المحادثة رقم ${id}`);
   };

   // Filter threads based on tab
   const filteredThreads = React.useMemo(() => {
     if (!threads || !user) return [];
     
     if (activeTab === 'inbox') {
        // Threads where last message was NOT sent by me
        return threads.filter(t => t.lastMessage && t.lastMessage.senderUserId !== user.id);
     } else if (activeTab === 'outbox') {
        // Threads where last message WAS sent by me
        return threads.filter(t => t.lastMessage && t.lastMessage.senderUserId === user.id);
     }
     return []; // Drafts not implemented
   }, [threads, activeTab, user]);

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-red-950">المراسلات والتنسيق المؤسساتي</h2>
            <button 
               onClick={handleNewMessage}
               className="bg-[#E6BE8A] text-red-950 px-4 py-2 rounded-lg font-bold hover:bg-[#d4ac7a] transition-colors shadow-sm"
            >
               + رسالة جديدة
            </button>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
            <div className="flex border-b">
               <button 
                  onClick={() => setActiveTab('inbox')}
                  className={`px-6 py-3 font-bold transition-colors ${activeTab === 'inbox' ? 'border-b-2 border-red-950 text-red-950' : 'text-gray-500 hover:text-gray-700'}`}
               >
                  الواردة
               </button>
               <button 
                  onClick={() => setActiveTab('outbox')}
                  className={`px-6 py-3 font-bold transition-colors ${activeTab === 'outbox' ? 'border-b-2 border-red-950 text-red-950' : 'text-gray-500 hover:text-gray-700'}`}
               >
                  الصادرة
               </button>
               <button 
                  onClick={() => setActiveTab('drafts')}
                  className={`px-6 py-3 font-bold transition-colors ${activeTab === 'drafts' ? 'border-b-2 border-red-950 text-red-950' : 'text-gray-500 hover:text-gray-700'}`}
               >
                  المسودات
               </button>
            </div>
            <div className="p-2">
               {isLoading && <div className="p-12 text-center text-gray-500">جاري تحميل الرسائل...</div>}
               
               {!isLoading && filteredThreads.length > 0 && filteredThreads.map((thread) => {
                  const isRead = thread.unreadCount === 0;
                  return (
                     <div 
                        key={thread.id} 
                        onClick={() => openMessage(thread.id)}
                        className={`flex items-center gap-4 p-4 hover:bg-gray-50 border-b last:border-0 cursor-pointer transition-colors ${!isRead && activeTab === 'inbox' ? 'bg-red-50/50' : ''}`}
                     >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!isRead && activeTab === 'inbox' ? 'bg-red-100 text-red-600 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                           {isRead ? '✉️' : '📩'}
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between">
                              <h4 className={`text-gray-800 ${!isRead ? 'font-bold' : 'font-medium'}`}>
                                 {thread.otherUser?.fullName || 'مستخدم غير معروف'}
                              </h4>
                              <span className="text-xs text-gray-400">
                                 {thread.lastMessage?.at ? new Date(thread.lastMessage.at).toLocaleDateString('ar-MA') : ''}
                              </span>
                           </div>
                           <p className={`text-sm mt-1 ${!isRead ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                              {thread.lastMessage?.body ? (
                                 thread.lastMessage.body.length > 60 
                                 ? thread.lastMessage.body.substring(0, 60) + '...' 
                                 : thread.lastMessage.body
                              ) : 'مرفق'}
                           </p>
                        </div>
                     </div>
                  );
               })}

               {!isLoading && filteredThreads.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                     لا توجد رسائل في هذا المجلد حالياً
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}

function Governance() {
   const [attendanceConfirmed, setAttendanceConfirmed] = React.useState(false);

   const toggleAttendance = () => {
      setAttendanceConfirmed(!attendanceConfirmed);
      if (!attendanceConfirmed) {
         alert('تم تأكيد حضورك للاجتماع بنجاح.');
      } else {
         alert('تم إلغاء تأكيد الحضور.');
      }
   };

   return (
      <div className="space-y-6">
         <div className="bg-red-950 text-white p-8 rounded-2xl relative overflow-hidden shadow-lg">
            <div className="relative z-10">
               <span className="inline-block bg-[#E6BE8A] text-red-950 text-xs font-bold px-2 py-1 rounded mb-2">القادم</span>
               <h2 className="text-2xl font-bold mb-2">اجتماع المكتب التنفيذي</h2>
               <p className="text-red-200 mb-6">سيتم الإعلان عن الموعد قريباً</p>
               <div className="flex gap-3">
                  <button 
                     disabled
                     className="bg-white/10 text-white/50 px-6 py-2 rounded-lg font-bold cursor-not-allowed"
                  >
                     لا يوجد اجتماع مبرمج حالياً
                  </button>
               </div>
            </div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-gray-800 mb-4">محاضر الاجتماعات السابقة</h3>
               <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">📂</span>
                  <p>لا توجد محاضر مؤرشفة في النظام</p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-gray-800 mb-4">القرارات المتخذة</h3>
               <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl block mb-2">📜</span>
                  <p>سجل القرارات فارغ</p>
               </div>
            </div>
         </div>
      </div>
   );
}

function Training() {
   return (
      <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
               <h3 className="font-bold text-gray-800 mb-4">برامج التكوين المستمر</h3>
               <div className="border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl mb-3 opacity-20">🎓</span>
                  <p className="text-gray-500 font-medium">لا توجد دورات تكوينية مبرمجة حالياً</p>
                  <p className="text-gray-400 text-sm mt-1">سيتم إدراج البرامج التكوينية فور المصادقة عليها</p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-gray-800 mb-4">إحصائيات</h3>
               <div className="text-center py-6">
                  <div className="text-4xl font-extrabold text-[#E6BE8A] mb-2">0</div>
                  <p className="text-gray-500 mb-4">مستفيد هذه السنة</p>
                  <p className="text-xs text-gray-400">بانتظار انطلاق الموسم التكويني</p>
               </div>
            </div>
         </div>
      </div>
   );
}

function Exams() {
   const [statsMode, setStatsMode] = React.useState(false);

   return (
      <div className="space-y-6">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">🎓</div>
            <div className="relative z-10">
               <div className="inline-block p-4 rounded-full bg-slate-50 mb-4 text-3xl shadow-sm text-gray-400">📝</div>
               <h2 className="text-2xl font-bold text-gray-800 mb-2">المباريات المهنية</h2>
               <p className="text-gray-500 max-w-lg mx-auto mb-8">لا توجد مباريات مفتوحة حالياً. يرجى مراجعة الإعلانات الرسمية لاحقاً.</p>
               
               <div className="flex justify-center gap-4">
                  <button 
                     disabled
                     className="bg-gray-100 text-gray-400 px-6 py-3 rounded-xl font-bold cursor-not-allowed"
                  >
                     إدارة المترشحين
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

function Discipline() {
   return (
      <div className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200"><h3 className="text-gray-400 font-bold mb-1 text-2xl">0</h3><p className="text-sm font-medium text-gray-400">ملفات رائجة</p></div>
            <div className="bg-white p-4 rounded-xl border border-gray-200"><h3 className="text-gray-400 font-bold mb-1 text-2xl">0</h3><p className="text-sm font-medium text-gray-400">في طور التحقيق</p></div>
            <div className="bg-white p-4 rounded-xl border border-gray-200"><h3 className="text-gray-400 font-bold mb-1 text-2xl">0</h3><p className="text-sm font-medium text-gray-400">ملفات مفصولة</p></div>
            <div className="bg-white p-4 rounded-xl border border-gray-200"><h3 className="text-gray-400 font-bold mb-1 text-2xl">0</h3><p className="text-sm font-medium text-gray-400">استئناف</p></div>
         </div>
         
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-bold text-gray-800">الملفات التأديبية</h3>
            </div>
            <div className="p-12 text-center">
               <p className="text-gray-500">لا توجد ملفات تأديبية مسجلة في النظام.</p>
            </div>
         </div>
      </div>
   );
}


function Reports() {
   const [reportPeriod, setReportPeriod] = React.useState('current');
   const { data: stats } = trpc.statistics.summary.useQuery();
   const { data: notaries } = trpc.notaries.list.useQuery({});

   // Aggregate Adouls by Region
   const adoulsByRegion = React.useMemo(() => {
      if (!notaries) return [];
      const counts: Record<string, number> = {};
      notaries.forEach(n => {
         const region = n.region || 'غير محدد';
         counts[region] = (counts[region] || 0) + 1;
      });
      return Object.entries(counts)
         .map(([l, v]) => ({ l, v }))
         .sort((a, b) => b.v - a.v)
         .slice(0, 5); // Top 5
   }, [notaries]);

   const totalAdouls = notaries?.length || 1; // avoid divide by zero

   const handleExport = () => {
      alert(`جاري تصدير التقرير بصيغة PDF...`);
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-red-950">التقارير والإحصائيات الاستراتيجية</h2>
            <div className="flex gap-2">
               <button 
                  onClick={handleExport}
                  className="bg-[#E6BE8A] text-red-950 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#d4ac7a] flex items-center gap-2"
               >
                  <span>📤</span> تصدير
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-gray-800 mb-6">إحصائيات الوثائق المنجزة</h3>
               <div className="space-y-4">
                  {(stats?.summary || []).map((item, i) => (
                     <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                           <span>{item.label}</span>
                           <span className="font-bold">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                           <div className="bg-[#E6BE8A] h-full" style={{ width: `${Math.min((item.count / 100) * 100, 100)}%` }}></div>
                        </div>
                     </div>
                  ))}
                  {(!stats?.summary) && <div className="text-center text-gray-400">جاري تحميل البيانات...</div>}
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-gray-800 mb-6">توزيع العدول حسب الجهات (أكبر 5 جهات)</h3>
                <div className="space-y-4">
                  {adoulsByRegion.map((d, i) => {
                     const percentage = Math.round((d.v / totalAdouls) * 100);
                     return (
                        <div key={i} className="cursor-pointer group">
                           <div className="flex justify-between text-sm mb-1 group-hover:text-red-900 transition-colors">
                              <span className="font-bold">{d.l}</span>
                              <span className="font-bold">{d.v} ({percentage}%)</span>
                           </div>
                           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-red-950 h-full transition-all duration-500 group-hover:opacity-80" style={{ width: `${percentage}%` }}></div>
                           </div>
                        </div>
                     );
                  })}
                  {adoulsByRegion.length === 0 && <div className="text-center text-gray-400">لا توجد بيانات عدول مسجلة</div>}
                </div>
                
                <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <h4 className="font-bold text-sm text-gray-800 mb-2">تحليل الذكاء الاصطناعي 🤖</h4>
                   <p className="text-xs text-gray-600 leading-relaxed">
                      يعتمد هذا التقرير على البيانات الحقيقية المسجلة في قاعدة البيانات المركزية. يتم تحديث النسب مئوية تلقائياً بناءً على القيد الفعلي للعدول والوثائق.
                   </p>
                </div>
            </div>
         </div>
      </div>
   );
}


// --- Main Shell ---

export const NationalCouncilPortal = () => {
  const { user, logout, notaryProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { nationalPendingTransfersTotal } = useMessagingNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPath = location.pathname.split('/').pop() || '';
  const effectivePath = location.pathname.endsWith('/national-council') ? '' : currentPath;

  return (
    <div className="flex min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-[#f97316] via-[#ea580c] to-[#ef4444] text-white shadow-2xl z-20 border-l-4 border-[#E6BE8A] transition-all duration-300 flex flex-col h-screen flex-shrink-0 relative overflow-hidden font-kufi">
        {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
        <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none z-0"></div>

        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>

        {/* Sidebar Header */}
        <div className="p-6 bg-gradient-to-b from-[#f97316] to-[#ea580c] border-b border-[#E6BE8A]/30 group relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E6BE8A] to-amber-500 rounded-2xl flex items-center justify-center text-[#595c5d] font-bold text-2xl shadow-lg shadow-amber-400/40 group-hover:scale-110 transition-transform">
                🏛️
            </div>
            <div>
              <h1 className="text-sm font-black text-[#E6BE8A] leading-tight tracking-widest uppercase opacity-90 font-maghribi">
                المملكة المغربية
              </h1>
              <h2 className="text-lg font-black text-white leading-tight mt-0.5 tracking-tight group-hover:text-[#E6BE8A] transition-colors font-maghribi">
                الهيئة الوطنية للعدول
              </h2>
            </div>
          </div>
          <div className="mt-4 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-100 uppercase tracking-tighter">
              بوابة الرئيس - National President Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar relative z-10">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = (item.path === '' && effectivePath === '') || (item.path !== '' && effectivePath === item.path.split('?')[0]);
              
              return (
                <li key={item.path}>
                  <Link
                    to={`/national-council/${item.path}`}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-right text-sm font-bold transition-all duration-200 group relative overflow-hidden ${
                      isActive 
                      ? 'bg-gradient-to-r from-[#E6BE8A] to-[#d4af37] text-[#1e293b] shadow-lg shadow-amber-400/20 border-2 border-[#E6BE8A]/50' 
                      : 'text-gray-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#E6BE8A] to-amber-300 rounded-r-full shadow-lg shadow-amber-400/50"></div>
                    )}

                    <span className={`text-2xl transition-all duration-200 flex-shrink-0 ${isActive ? 'scale-125 drop-shadow-lg' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-3">
                      <span className={`transition-all ${isActive ? 'text-[#1e293b] text-base' : 'text-gray-100 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                                 {item.path === 'notifications-center' && nationalPendingTransfersTotal > 0 ? (
                        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white animate-pulse shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {nationalPendingTransfersTotal}
                        </span>
                      ) : null}
                    </span>

                    {/* Hover Effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#E6BE8A]/0 to-[#E6BE8A]/0 group-hover:from-[#E6BE8A]/5 group-hover:to-[#E6BE8A]/10 rounded-2xl transition-all"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#E6BE8A]/20 to-transparent mx-4 relative z-10"></div>

        {/* User Profile & Logout */}
        <div className="p-4 bg-black/10 border-t border-[#E6BE8A]/20 mt-auto relative z-10">
           <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full border border-[#E6BE8A]/30 overflow-hidden bg-gradient-to-br from-[#E6BE8A] to-[#c5a065] flex items-center justify-center text-sm font-bold text-[#717475] shadow-inner">
               {user?.full_name?.charAt(0) || 'A'}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-bold text-white truncate">{user?.full_name || 'رئيس الهيئة'}</p>
               <p className="text-xs text-[#E6BE8A] truncate opacity-80">القيادة العليا</p>
             </div>
           </div>
           
           <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-[#E6BE8A] hover:bg-[#d4af37] text-[#595c5d] py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
           >
             <span>🚪</span> تسجيل الخروج
           </button>
        </div>

        {/* Decorative Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto h-screen bg-gray-50 flex flex-col">
        {/* Header with logos and app name - Matching Notary Portal Style */}
        <header className="bg-gradient-to-b from-[#fff7ed] via-[#ffedd5] to-white shadow-sm overflow-hidden relative">
          {/* Subtle light pattern overlay */}
          <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] pointer-events-none"></div>
          
          <div className="flex items-center justify-between px-8 py-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-1.5 bg-white/80 rounded-2xl shadow-sm border border-white backdrop-blur-sm">
                <img
                  src="/logos/morocco-coat.jpg"
                  alt="شعار المملكة المغربية"
                  className="h-16 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <div className="text-right leading-tight">
                <div className="text-2xl font-black text-slate-800 tracking-tight">
                  <span>المملكة المغربية</span>
                </div>
                <div className="text-2xl font-black text-slate-600">
                  <span>الهيئة الوطنية للعدول</span>
                </div>
              </div>
            </div>

            {/* Centered Identity Spot - Stable Element */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto">
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#E6BE8A] via-amber-400 to-[#E6BE8A] rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <div className="relative h-24 w-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                        {notaryProfile?.profile_picture_url ? (
                          <img 
                            src={notaryProfile.profile_picture_url} 
                            alt="President" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl">👤</div>
                        )}
                        {/* Active Status Badge */}
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {/* Notifications */}
              <div className="flex items-center gap-3">
                <button
                           onClick={() => navigate('/national-council/notifications-center')}
                  className="relative p-2.5 bg-white/80 rounded-2xl shadow-sm border border-white hover:bg-white transition-all group"
                  title="تنبيهات مالية"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">🔔</span>
                  {nationalPendingTransfersTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-white text-[10px] font-black text-white animate-pulse">
                      {nationalPendingTransfersTotal}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-end gap-2 pr-6 border-r border-slate-300/50">
                <div className="bg-white/90 px-5 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                   <div className="text-slate-700 font-bold">
                     <DateWidget />
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>اللغة الاختيارية</span>
                  </span>
                  <div className="scale-90 origin-right">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
              
              <div className="p-2.5 bg-white/80 rounded-3xl shadow-sm border border-white group backdrop-blur-sm">
                <img
                  src="/logos/adoul-logo.jpg"
                  alt="شعار الهيئة الوطنية للعدول"
                  className="h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex h-32 items-center justify-center relative px-12 -mt-10 mb-2 no-print select-none">
            {/* Banner Main Body */}
            <OrnateScrollBanner className="group" theme="orange">
               <span className="text-center text-4xl font-black tracking-widest drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] px-24 group-hover:scale-[1.01] transition-transform duration-700">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(230,190,138,0.4)]">
                    بوابة القيادة العليا للهيئة الوطنية
                  </span>
               </span>

               {/* Right Status Badge */}
               <div className="absolute left-10 hidden 2xl:flex items-center gap-2 bg-black/40 px-5 py-2 rounded-xl border border-amber-400/20 backdrop-blur-md shadow-2xl translate-x-12">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20"></span>
                  <span className="text-xs font-black uppercase text-[#E6BE8A] tracking-widest">
                    {NAV_ITEMS.find(item => item.path === effectivePath)?.label || 'لوحة القيادة'}
                  </span>
               </div>
            </OrnateScrollBanner>
          </div>

          {/* Decorative Descaling Line Under Header */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#ef4444] shadow-[0_2px_4px_rgba(0,0,0,0.1)]"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="notifications-center" element={<NationalNotificationsCenterPage />} />
              <Route path="authority-finances" element={<NationalAuthorityFinances />} />
              <Route path="income-regions" element={<NationalIncomeRegionsExplorer />} />
              <Route path="notaries-technical-cards" element={<NationalNotariesTechnicalCards />} />
              <Route path="regional-governance" element={<NationalRegionalCouncils />} />
              <Route path="national-executive-correspondence" element={<NationalExecutiveCorrespondence />} />
              <Route path="national-requests" element={<NationalRequestsManagement />} />
              <Route path="financial-subscriptions" element={<NationalFinancialManagement />} />
              <Route path="regional-councils" element={<RegionalCouncils />} />
              <Route path="adoul-registry" element={<AdoulRegistry />} />
              <Route path="ethics" element={<Ethics />} />
              <Route path="correspondence" element={<Correspondence />} />
              <Route path="governance" element={<Governance />} />
              <Route path="training" element={<Training />} />
              <Route path="exams" element={<Exams />} />
              <Route path="discipline" element={<Discipline />} />
              <Route path="strategic-intelligence" element={<NationalStatisticalManagement />} />
              <Route path="*" element={<Navigate to="/national-council" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};
