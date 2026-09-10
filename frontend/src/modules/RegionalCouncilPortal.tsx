import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';
import { MessagingInbox } from './MessagingInbox';
import { NotaryTechnicalCardPage } from './NotaryTechnicalCardPage';
import { RegionalIncomeContribution } from './RegionalIncomeContribution';
import { RegionalCouncilInvoicesDashboard } from './RegionalCouncilInvoicesDashboard';
import { RegionalStatisticalManagement } from './RegionalStatisticalManagement';
import { DateWidget } from './DateWidget';
import { OrnateScrollBanner } from '../components/common/OrnateScrollBanner';
import { COURT_MAPPINGS } from '../../../shared/courts';

// Import Notification Management Components
import NotificationDashboard from '../pages/RegionalCouncil/NotificationDashboard';
import NotificationRequestsTable from '../pages/RegionalCouncil/NotificationRequestsTable';
import DecisionModule from '../pages/RegionalCouncil/DecisionModule';
import ArchiveModule from '../pages/RegionalCouncil/ArchiveModule';
import ReportsModule from '../pages/RegionalCouncil/ReportsModule';
import SettingsModule from '../pages/RegionalCouncil/SettingsModule';
import NotificationsAndStudentsHub from '../pages/RegionalCouncil/NotificationsAndStudentsHub';
import RegionalNotificationsCenterPage from '../pages/RegionalCouncil/RegionalNotificationsCenterPage';
import ExportsAndImports from '../pages/RegionalCouncil/ExportsAndImports';
import ExecutiveOfficeCorrespondence from '../pages/RegionalCouncil/ExecutiveOfficeCorrespondence';

// --- Types ---
type NavItem = {
  path: string;
  label: string;
  icon: string;
};

// --- Mock Data ---

const MOCK_STATS = [
  { label: 'إجمالي الملفات السنوية', value: 12450, change: '+5%', icon: '📂' },
  { label: 'العدول المتقاعدين (2025)', value: 12, change: '-2%', icon: '👴' },
  { label: 'الشكايات قيد المعالجة', value: 5, change: '0%', icon: '⚖️' },
  { label: 'الدورات التدريبية النشطة', value: 3, change: '+1', icon: '🎓' },
];

const MOCK_ANNUAL_FILES = [
  { id: 1, year: 2024, totalNotaries: 156, totalDeeds: 45000, status: 'مكتمل' },
  { id: 2, year: 2025, totalNotaries: 160, totalDeeds: 12500, status: 'جاري' },
];

const MOCK_RETIREMENT = [
  { id: 1, name: 'أحمد العلمي', birthDate: '1955-03-12', retirementDate: '2025-03-12', status: 'قريب جداً' },
  { id: 2, name: 'مصطفى السليماني', birthDate: '1955-06-20', retirementDate: '2025-06-20', status: 'خلال 3 أشهر' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const languages = { ar: 'العربية', fr: 'Français' };
  return (
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-900/20"
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

// --- Components ---

function JurisdictionBanner({ onFilterChange }: { onFilterChange?: (court: string | null) => void }) {
  const { user, notaryProfile } = useAuth();
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);

  const regionInfo = React.useMemo(() => {
     let regionName = notaryProfile?.appellate_court;
     if (!regionName && user?.full_name) {
          const normalizedName = user.full_name.trim();
          const match = COURT_MAPPINGS.find(m => normalizedName.includes(m.appellateCourt) || normalizedName.includes(m.appellateCourt.replace('محكمة الاستئناف ', '').replace('ب', '')));
          if (match) regionName = match.appellateCourt;
     }
     
     if (!regionName) return null;
     
     const mapping = COURT_MAPPINGS.find(m => m.appellateCourt === regionName);
     return {
        name: regionName,
        primaryCourts: mapping?.primaryCourts || []
     };
  }, [user, notaryProfile]);

  if (!regionInfo) return null;

  const handleSelect = (court: string | null) => {
      setSelectedCourt(court);
      if (onFilterChange) onFilterChange(court);
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100 shadow-sm flex flex-wrap items-center justify-between gap-6 animate-fade-in relative overflow-hidden">
      
      <div className="flex items-center gap-4 z-10">
         <div className="bg-white p-3 rounded-xl shadow-md border border-blue-50">
            <span className="text-3xl">🏛️</span>
         </div>
         <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
               <span className="text-xs text-blue-800 font-bold uppercase tracking-wider">نطاق الاختصاص القضائي</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 border-b-2 border-blue-200 pb-1 inline-block">{regionInfo.name}</h3>
         </div>
      </div>
      
      <div className="flex gap-2 flex-wrap z-10">
         <button 
           onClick={() => handleSelect(null)}
           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${!selectedCourt ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200'}`}
         >
            <span>🏙️</span>
            <span>الكل</span>
         </button>
         {regionInfo.primaryCourts.map(court => (
             <button
               key={court}
               onClick={() => handleSelect(court)}
               className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${selectedCourt === court ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200'}`}
             >
               {court}
             </button>
         ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, change, icon }: { label: string; value: number | string; change: string; icon: string }) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className={`text-sm px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}

function RegionalDashboard() {
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  const stats = React.useMemo(() => {
     if (!selectedPrimaryCourt) return MOCK_STATS;
     
     // Simulate stats for a specific court
     return MOCK_STATS.map(stat => ({
        ...stat,
        value: typeof stat.value === 'number' ? Math.floor(stat.value * 0.25) : stat.value,
        change: stat.change // Keep change rate or modify if needed
     }));
  }, [selectedPrimaryCourt]);

  return (
    <div className="space-y-6">
      <JurisdictionBanner onFilterChange={setSelectedPrimaryCourt} />
      <h2 className="text-2xl font-bold text-gray-800 mb-6 font-kufi">
         لوحة القيادة - المجلس الجهوي
         {selectedPrimaryCourt && <span className="text-base font-normal text-gray-500 mr-2">({selectedPrimaryCourt})</span>}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-blue-950 border-b border-blue-100 pb-2">آخر الإعلانات</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-1">📌</span>
              <span className="text-gray-700">اجتماع المجلس الجهوي يوم الخميس القادم لمناقشة التقرير السنوي.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-1">📌</span>
              <span className="text-gray-700">فتح باب التسجيل في الدورة التدريبية حول "قانون الملكية العقارية".</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-emerald-800 border-b pb-2">حالة الاشتراكات السنوية</h3>
          <div className="h-48 flex items-center justify-center bg-gray-50 rounded text-gray-400">
            [رسم بياني: نسبة العدول المؤدين للاشتراك السنوي]
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnualFiles() {
  const navigate = useNavigate();
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  // Simulate filtered data based on selected court
  const filteredFiles = React.useMemo(() => {
    if (!selectedPrimaryCourt) return MOCK_ANNUAL_FILES;
    
    // If a court is selected, show simulated subset stats
    return MOCK_ANNUAL_FILES.map(file => ({
      ...file,
      totalNotaries: Math.floor(file.totalNotaries / 4), // Approximate division
      totalDeeds: Math.floor(file.totalDeeds / 4),
    }));
  }, [selectedPrimaryCourt]);

  return (
    <div className="space-y-6">
      <JurisdictionBanner onFilterChange={setSelectedPrimaryCourt} />
      <h2 className="text-2xl font-bold text-gray-800 mb-6">الملفات السنوية للعدول</h2>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-right">
          <thead className="bg-[#E6BE8A] text-blue-950 border-b border-blue-900">
            <tr>
              <th className="p-4 font-semibold">السنة</th>
              <th className="p-4 font-semibold">عدد العدول المزاولين</th>
              <th className="p-4 font-semibold">إجمالي العقود المنجزة</th>
              <th className="p-4 font-semibold">الحالة</th>
              <th className="p-4 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFiles.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{file.year}</td>
                <td className="p-4">{file.totalNotaries}</td>
                <td className="p-4">{file.totalDeeds}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${file.status === 'مكتمل' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {file.status}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => navigate(`/regional-council/analytics?year=${file.year}`)} className="text-blue-800 hover:text-blue-900 text-sm font-medium hover:underline transition-all cursor-pointer">عرض التفاصيل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgeManagement() {
  const navigate = useNavigate();
  const { user, notaryProfile } = useAuth();
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  // Determine User Region to assign mock courts
  const userRegionInfo = React.useMemo(() => {
     let regionName = notaryProfile?.appellate_court;
     if (!regionName && user?.full_name) {
          const normalizedName = user.full_name.trim();
          const match = COURT_MAPPINGS.find(m => normalizedName.includes(m.appellateCourt) || normalizedName.includes(m.appellateCourt.replace('محكمة الاستئناف ', '').replace('ب', '')));
          if (match) regionName = match.appellateCourt;
     }
     
     if (!regionName) return null;
     const mapping = COURT_MAPPINGS.find(m => m.appellateCourt === regionName);
     return {
        name: regionName,
        primaryCourts: mapping?.primaryCourts || []
     };
  }, [user, notaryProfile]);

  const filteredData = React.useMemo(() => {
    // augment mock data with courts from the region
    const courts = userRegionInfo?.primaryCourts || [];
    const augmented = MOCK_RETIREMENT.map((item, idx) => ({
       ...item,
       primaryCourt: courts.length > 0 ? courts[idx % courts.length] : 'محكمة ابتدائية'
    }));

    if (!selectedPrimaryCourt) return augmented;
    return augmented.filter(item => item.primaryCourt === selectedPrimaryCourt);
  }, [selectedPrimaryCourt, userRegionInfo]);

  return (
    <div className="space-y-6">
      <JurisdictionBanner onFilterChange={setSelectedPrimaryCourt} />
      <h2 className="text-2xl font-bold text-gray-800 mb-6">مراقبة السن والتقاعد</h2>
      <div className="bg-amber-50 border-r-4 border-amber-400 p-4 mb-6 rounded-l">
        <p className="text-amber-800 font-medium">⚠️ تنبيه: يوجد {filteredData.length} عدول مقبلون على التقاعد في الـ 6 أشهر القادمة.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-700 border-b">
            <tr>
              <th className="p-4">الاسم الكامل</th>
              <th className="p-4">المحكمة الابتدائية</th>
              <th className="p-4">تاريخ الازدياد</th>
              <th className="p-4">تاريخ التقاعد المرتقب</th>
              <th className="p-4">الوضعية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.length > 0 ? (
               filteredData.map((item) => (
              <tr key={item.id}>
                <td className="p-4 font-medium">{item.name}</td>
                <td className="p-4 text-sm text-gray-500">{item.primaryCourt}</td>
                <td className="p-4 text-gray-600">{item.birthDate}</td>
                <td className="p-4 text-blue-600 font-bold">{item.retirementDate}</td>
                <td className="p-4">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-100">
                    {item.status}
                  </span>
                </td>
              </tr>
            ))
            ) : (
               <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">لا توجد نتائج لهذه المحكمة</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainingCenter() {
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <JurisdictionBanner onFilterChange={setSelectedPrimaryCourt} />
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
         التكوين والتدريب
         {selectedPrimaryCourt && <span className="text-base font-normal text-gray-500 mr-2">({selectedPrimaryCourt})</span>}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-900">
          <h3 className="text-xl font-bold mb-2">الدورات المتاحة</h3>
          <p className="text-gray-500 mb-4">قائمة بالتكوينات المستمرة المتاحة للعدول</p>
          <button onClick={() => navigate('/regional-council/reports?tab=courses')} className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-950 w-full transition-colors cursor-pointer">إدارة الدورات</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-amber-400">
          <h3 className="text-xl font-bold mb-2">سجل المتدربين</h3>
          <p className="text-gray-500 mb-4">متابعة حضور واجتياز المتدربين</p>
          <button onClick={() => navigate('/regional-council/reports?tab=trainees')} className="bg-white border border-blue-900 text-blue-900 px-4 py-2 rounded hover:bg-blue-50 w-full transition-colors cursor-pointer">عرض السجل</button>
        </div>
      </div>
    </div>
  );
}

function UnderConstruction({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <span className="text-6xl mb-4">🚧</span>
      <h3 className="text-2xl font-bold text-gray-400">{title} - قيد الإنجاز</h3>
    </div>
  );
}

function InvoiceModal({ isOpen, onClose, notary, activeTab }: { isOpen: boolean, onClose: () => void, notary: any, activeTab: string }) {
  const [amount, setAmount] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDate, setDueDate] = useState(`${new Date().getFullYear()}-12-31`);
  const utils = trpc.useContext();
  
  const createInvoice = trpc.subscriptions.createInvoiceForCouncil.useMutation({
    onSuccess: () => {
       utils.subscriptions.getPaymentsForCouncil.invalidate();
       onClose();
       // alert handled via toast usually, but simple visual feedback is implied
    }
  });

  // Arabic labels map
  const typeLabels: Record<string, string> = {
    'annual': 'الاشتراك السنوي',
    'affiliation': 'واجب الانخراط',
    'stamps': 'دفتر الدمغات',
    'notebook': 'كناش التصاريح',
    'register': 'السجل السنوي',
    'badge': 'شارة الهوية',
    'equipment': 'التجهيزات',
    'suit': 'البدلة',
    'other': 'مساهمات اخرى',
    'notaried': 'شهادات توثيق العقود'
  };

  React.useEffect(() => {
     if(isOpen) {
         // Default amounts
         let defAmount = 0;
         switch (activeTab) {
           case 'annual': defAmount = 800; break;
           case 'affiliation': defAmount = 5000; break;
           case 'stamps': defAmount = 200; break;
           case 'notebook': defAmount = 150; break;
           case 'register': defAmount = 300; break;
           case 'badge': defAmount = 100; break;
           case 'equipment': defAmount = 0; break;
           case 'suit': defAmount = 0; break;
           case 'other': defAmount = 0; break;
           case 'notaried': defAmount = 0; break;
         }
         setAmount(defAmount);
     }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const typeName = typeLabels[activeTab] || activeTab;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-900 to-blue-800 p-6 text-white flex justify-between items-start">
           <div>
              <h3 className="text-xl font-bold mb-1">إصدار فاتورة جديدة</h3>
              <p className="text-blue-100 text-sm opacity-90">يتم إنشاء التزام مالي في حساب العدول</p>
           </div>
           <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
              <span className="text-2xl">🧾</span>
           </div>
        </div>

        {/* Notary Info Bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              {notary?.full_name?.split(' ').map((n:string) => n[0]).join('').slice(0,2)}
           </div>
           <div>
              <p className="text-sm font-bold text-gray-800">{notary?.full_name}</p>
              <p className="text-xs text-gray-500">{notary?.primary_court || 'محكمة ابتدائية'}</p>
           </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
           
           {/* Type Card */}
           <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100/50">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-lg">
                 📌
              </div>
              <div className="flex-1">
                 <p className="text-xs text-gray-500 font-bold mb-0.5">نوع الاستحقاق</p>
                 <p className="text-blue-900 font-bold">{typeName}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 opacity-80">السنة المالية</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={year} 
                      onChange={e => setYear(Number(e.target.value))}
                      className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 opacity-80">تاريخ الاستحقاق</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={dueDate} 
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-gray-50 border-none ring-1 ring-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-700 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    />
                  </div>
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 opacity-80">المبلغ المستحق (د.م)</label>
              <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none group-focus-within:text-red-500 transition-colors">MAD</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 pl-12 text-lg font-black text-gray-800 focus:border-red-500 outline-none transition-all shadow-sm" 
                  />
              </div>
              <div className="mt-2 flex gap-2">
                 {[100, 200, 500, 800].map(val => (
                   <button 
                     key={val}
                     onClick={() => setAmount(val)} 
                     className="px-2 py-1 bg-gray-50 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                   >
                     {val} د.م
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 border-t border-gray-50 flex gap-3 bg-white">
           <button 
             onClick={() => createInvoice.mutate({
                userId: notary.id,
                subscriptionType: activeTab,
                periodYear: year,
                amount,
                dueDate
             })}
             disabled={createInvoice.isPending}
             className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
           >
             {createInvoice.isPending ? (
               <>
                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                 جاري المعالجة...
               </>
             ) : (
               <>
                 <span>تأكيد الإصدار</span>
                 <span className="group-hover:-translate-x-1 transition-transform">←</span>
               </>
             )}
           </button>
           <button 
             onClick={onClose} 
             className="px-6 py-3.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors"
           >
             إلغاء
           </button>
        </div>
      </div>
    </div>
  );
}

function FinancialManagement() {
  const { user, notaryProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'annual' | 'monthly' | 'affiliation' | 'stamps' | 'notebook' | 'register' | 'badge' | 'equipment' | 'suit' | 'other' | 'donations' | 'notaried' | null;
  const initialTab = tabParam || 'annual';
  
  const [activeTab, setActiveTab] = React.useState<'annual' | 'monthly' | 'affiliation' | 'stamps' | 'notebook' | 'register' | 'badge' | 'equipment' | 'suit' | 'other' | 'donations' | 'notaried'>(initialTab);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'paid' | 'unpaid'>('all');
  const [search, setSearch] = React.useState('');
  const [selectedPrimaryCourt, setSelectedPrimaryCourt] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotary, setSelectedNotary] = useState<any>(null);
  const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState<string>('');
  const [bulkPaymentMarkAsPaid, setBulkPaymentMarkAsPaid] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [selectedNotaryForInvoice, setSelectedNotaryForInvoice] = useState<any>(null);
  const [singleInvoiceAmount, setSingleInvoiceAmount] = useState<string>('');
  const [singleInvoiceMarkAsPaid, setSingleInvoiceMarkAsPaid] = useState(false);
  const [isSelectNotaryModalOpen, setIsSelectNotaryModalOpen] = useState(false);
  const [notarySearchTerm, setNotarySearchTerm] = useState('');
  const [expandedNotaryId, setExpandedNotaryId] = useState<string | null>(null);
  const [selectedNotariesForBulk, setSelectedNotariesForBulk] = useState<Set<string>>(new Set());
  const [showNotarySelection, setShowNotarySelection] = useState(false);
  const [showAmountWarning, setShowAmountWarning] = useState(false);
  const [pendingAmountValue, setPendingAmountValue] = useState<string>('');
  const [amountEditConfirmed, setAmountEditConfirmed] = useState(false);

  const openInvoiceModal = (notary: any) => {
     setSelectedNotary(notary);
     setIsModalOpen(true);
  };

  const openCreateInvoiceModal = (notary: any) => {
    setSelectedNotaryForInvoice(notary);
    setIsCreateInvoiceModalOpen(true);
  };


  const utils = trpc.useContext();
  // Fetch real payment data
  const { data: payments } = trpc.subscriptions.getPaymentsForCouncil.useQuery({
    year: 2026,
    type: activeTab
  });

  const toggleStatusMutation = trpc.subscriptions.togglePaymentStatus.useMutation({
    onSuccess: () => {
      utils.subscriptions.getPaymentsForCouncil.invalidate();
    },
    onError: (err) => {
        console.error("Toggle Payment Failed:", err);
        alert("فشل تحديث الحالة: " + err.message);
    }
  });

  const bulkPaymentMutation = trpc.subscriptions.createBulkPayments.useMutation({
    onSuccess: () => {
      utils.subscriptions.getPaymentsForCouncil.invalidate();
    },
    onError: (err) => {
        console.error("Bulk Payment Failed:", err);
        alert("فشل إنشاء الفواتير: " + err.message);
    }
  });

  const deletePaymentMutation = trpc.subscriptions.deletePayment.useMutation({
    onSuccess: () => {
      utils.subscriptions.getPaymentsForCouncil.invalidate();
    },
    onError: (err) => {
        console.error("Delete Payment Failed:", err);
        alert("فشل حذف الفاتورة: " + err.message);
    }
  });

  const handleDeletePayment = (recordId: string, notaryName: string) => {
    if (!recordId) {
      alert('لا يمكن حذف هذه الفاتورة');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف فاتورة ${notaryName}؟`)) {
      deletePaymentMutation.mutate({ id: recordId });
    }
  };

  const handleCreateSingleInvoice = async () => {
    const amount = Number(singleInvoiceAmount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!selectedNotaryForInvoice) {
      alert('لم يتم اختيار عدل');
      return;
    }

    const payment = {
      userId: selectedNotaryForInvoice.userId,
      subscriptionType: activeTab === 'donations' ? 'donation' : activeTab,
      periodYear: 2026,
      periodMonth: activeTab === 'monthly' ? Number(searchParams.get('month') || new Date().getMonth() + 1) : undefined,
      amount,
      status: singleInvoiceMarkAsPaid ? 'paid' as const : 'unpaid' as const
    };

    try {
      const result = await bulkPaymentMutation.mutateAsync({ payments: [payment] });
      if (result.count > 0) {
        const message = result.updated > 0 
          ? `تم تحديث فاتورة ${selectedNotaryForInvoice.full_name} بنجاح`
          : `تم إنشاء فاتورة لـ ${selectedNotaryForInvoice.full_name} بنجاح`;
        alert(message);
      } else {
        alert('الفاتورة موجودة مسبقاً ولم يتم إجراء أي تغيير');
      }
      setIsCreateInvoiceModalOpen(false);
      setSingleInvoiceAmount('');
      setSingleInvoiceMarkAsPaid(false);
      setSelectedNotaryForInvoice(null);
    } catch (error) {
      console.error('Create invoice error:', error);
    }
  };

  const handleBulkPayment = async () => {
    const amount = Number(bulkPaymentAmount);
    if (!amount || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    // Get selected notaries or all if none selected
    let notariesToInvoice = augmentedData;
    if (showNotarySelection && selectedNotariesForBulk.size > 0) {
      notariesToInvoice = augmentedData.filter((a: any) => selectedNotariesForBulk.has(a.userId));
    }

    if (notariesToInvoice.length === 0) {
      alert('لا يوجد عدول محددين');
      return;
    }

    const statusText = bulkPaymentMarkAsPaid ? 'مدفوعة' : 'غير مدفوعة';
    if (!confirm(`هل أنت متأكد من إنشاء ${notariesToInvoice.length} فاتورة بمبلغ ${amount} د.م لكل عدل (${statusText})؟`)) {
      return;
    }

    // Prepare bulk payment data
    const payments = notariesToInvoice.map((adoul: any) => ({
      userId: adoul.userId,
      subscriptionType: activeTab === 'donations' ? 'donation' : activeTab,
      periodYear: 2026,
      periodMonth: activeTab === 'monthly' ? Number(searchParams.get('month') || new Date().getMonth() + 1) : undefined,
      amount,
      status: bulkPaymentMarkAsPaid ? 'paid' as const : 'unpaid' as const
    }));

    try {
      const result = await bulkPaymentMutation.mutateAsync({ payments });
      alert(result.message || `تم إنشاء ${result.count} فاتورة بنجاح`);
      setIsBulkPaymentModalOpen(false);
      setBulkPaymentAmount('');
      setBulkPaymentMarkAsPaid(false);
      setSelectedNotariesForBulk(new Set());
      setShowNotarySelection(false);
      setAmountEditConfirmed(false);
    } catch (error) {
      console.error('Bulk payment error:', error);
    }
  };

  // Determine User Region (Appellate Court)
  // Logic mostly mirrors NotaryTechnicalCardPage
  const userRegion = React.useMemo(() => {
     if (notaryProfile?.appellate_court) return notaryProfile.appellate_court;
     if (!user?.full_name) return null;

     const normalizedName = user.full_name.trim();

     // 1. Direct match
     const directMatch = COURT_MAPPINGS.find(m => normalizedName.includes(m.appellateCourt));
     if (directMatch) return directMatch.appellateCourt;

     // 2. Fuzzy match
     const fuzzyMatch = COURT_MAPPINGS.find(m => {
        const city = m.appellateCourt.replace('محكمة الاستئناف ', '').replace('ب', '');
        return normalizedName.includes(city);
     });

     return fuzzyMatch?.appellateCourt || null;
  }, [user, notaryProfile]);

  // Sync internal state with URL
  React.useEffect(() => {
     if (tabParam && tabParam !== activeTab) {
        setActiveTab(tabParam);
     }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (tab: typeof activeTab) => {
     setActiveTab(tab);
     setSearchParams({ tab });
  };

  // Use real notary data (augmented with mock financial status)
  // Passing 'court' to backend query is optimal, but we filter client-side too just in case
  const { data: adouls, isLoading } = trpc.notaries.list.useQuery({ 
     search,
     court: userRegion // Filter by region at API level if possible
  });

  // Augment with Real Data
  const augmentedData = React.useMemo(() => {
     if (!adouls) return [];
     
     // 1. Transactional Mode (List of Invoices) - for items that can be multiple per year
     const isTransactional = ['badge', 'stamps', 'notebook', 'register', 'equipment', 'suit', 'donations', 'other', 'affiliation', 'notaried', 'annual', 'monthly'].includes(activeTab);

     if (isTransactional) {
         if (!payments) return [];
         
         const relevantPayments = payments.filter((p: any) => 
            p.subscription_type === (activeTab === 'donations' ? 'donation' : activeTab)
         );

         return relevantPayments.map((p: any) => {
             const adoul = adouls.find(a => a.id === p.user_id);
             if (!adoul) return null;

             return {
                 ...adoul,
                 id: p.id, // Unique Key for Table (Payment ID)
                 userId: adoul.id, // Actual User ID
                 recordId: p.id,
                 financialStatus: p.paid_at ? 'paid' : 'unpaid',
                 amount: Number(p.amount),
                 paymentDate: p.paid_at ? new Date(p.paid_at).toISOString().split('T')[0] : 
                              (p.due_date || p.created_at || new Date().toISOString()).split('T')[0],
                 periodMonth: null,
                 periodYear: p.period_year || 2026,
             };
         }).filter((item): item is NonNullable<typeof item> => {
             if (!item) return false;
             // Filters
             if (userRegion && item.region !== userRegion) return false;
             if (selectedPrimaryCourt && item.primary_court !== selectedPrimaryCourt) return false;
             if (statusFilter === 'paid' && item.financialStatus !== 'paid') return false;
             if (statusFilter === 'unpaid' && item.financialStatus !== 'unpaid') return false;
             return true;
         });
     }

     // 2. Registry Mode (One Row Per Notary) - for Annual/Monthly/Affiliation
     return adouls.map(adoul => {
        let amount = 0;
        let pMonth: number | null = null;
        let pYear: number | null = 2026;

        // Default base amounts
        switch (activeTab) {
           case 'annual': amount = 800; break;
           case 'monthly': amount = 100; break;
           case 'affiliation': amount = 5000; break;
        }

        // Check against real DB records
        let record;
        if (activeTab === 'monthly') {
            // For Monthly, we need to match the SPECIFIC month selected in UI
            const targetMonth = Number(searchParams.get('month') || new Date().getMonth() + 1);
            pMonth = targetMonth;
            
            record = payments?.find((p: any) => 
                p.user_id === adoul.id && 
                p.subscription_type === 'monthly' && 
                p.period_month === targetMonth
            );
        } else {
             // For others, match type (treating yearly as equivalent to annual)
             const matches = payments?.filter((p: any) => 
                p.user_id === adoul.id &&
                (activeTab === 'donations' ? p.subscription_type === 'donation' : 
                 activeTab === 'annual' ? (p.subscription_type === 'annual' || p.subscription_type === 'yearly') :
                 p.subscription_type === activeTab)
            ) || [];
            record = matches.find((p: any) => p.paid_at) || matches[0];
        }
        
        let status: 'paid' | 'unpaid' = 'unpaid';
        if (record && record.paid_at) status = 'paid';
        if (record && record.amount) amount = Number(record.amount);
        
        return {
           ...adoul,
           id: adoul.id, // Unique Key (User ID)
           userId: adoul.id,
           recordId: record?.id,
           financialStatus: status,
           amount,
           periodMonth: pMonth,
           periodYear: pYear,
           paymentDate: status === 'paid' && record?.paid_at ? new Date(record.paid_at).toISOString().split('T')[0] : 
                        record?.created_at ? new Date(record.created_at).toISOString().split('T')[0] : 
                        (activeTab === 'monthly' ? `2026-${String(pMonth).padStart(2,'0')}-28` : new Date().toISOString().split('T')[0]), 
        };
     }).filter(item => {
        // Double check region filter (client-side)
        if (userRegion && item.region !== userRegion) {
           return false;
        }

        // Filter by Primary Court (JurisdictionBanner)
        if (selectedPrimaryCourt && item.primary_court !== selectedPrimaryCourt) {
            return false;
        }

        if (statusFilter === 'all') return true;
        if (statusFilter === 'paid') return item.financialStatus === 'paid';
        if (statusFilter === 'unpaid') return item.financialStatus === 'unpaid';
        return true;
     });
  }, [adouls, activeTab, statusFilter, userRegion, selectedPrimaryCourt, payments]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'paid': return { color: 'bg-green-100 text-green-700', icon: '✔️', label: activeTab === 'affiliation' ? 'منخرط' : 'مؤدٍّ' };
      case 'unpaid': return { color: 'bg-red-50 text-red-700', icon: '❗', label: 'غير مؤدٍّ' };
      case 'pending': return { color: 'bg-yellow-50 text-yellow-700', icon: '⏳', label: 'في طور المعالجة' };
      case 'voluntary': return { color: 'bg-blue-50 text-blue-700', icon: '🤝', label: 'اشتراك تطوعي' };
      case 'donation': return { color: 'bg-purple-50 text-purple-700', icon: '🎁', label: 'تبرع' };
      default: return { color: 'bg-gray-100', icon: '?', label: 'غير محدد' };
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: string, recordId?: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    
    let amount = 0;
    switch (activeTab) {
        case 'annual': amount = 800; break;
        case 'affiliation': amount = 5000; break;
        case 'stamps': amount = 200; break;
        case 'notebook': amount = 150; break;
        case 'register': amount = 300; break;
        case 'badge': amount = 100; break;
        case 'equipment': amount = 2000; break;
        case 'suit': amount = 1500; break;
        case 'other': amount = 500; break;
        case 'notaried': amount = 0; break;
        case 'donations': amount = 0; break; // Donation amount usually variable...
    }

    toggleStatusMutation.mutate({
        id: recordId, // Pass specific Record ID if available
        userId: userId,
        type: activeTab,
        year: 2026,
        status: newStatus,
        amount,
        // MUST pass periodMonth for monthly payments to target specific month
        periodMonth: activeTab === 'monthly' ? Number(searchParams.get('month') || new Date().getMonth() + 1) : undefined
    });
  };

  const handleReminder = (name: string, type: 'gentle' | 'formal') => {
    alert(`تم إرسال التذكير (${type === 'gentle' ? 'اللبق' : 'الرسمي'}) إلى: ${name}`);
  };

  // Get all invoices for a specific notary
  const getNotaryInvoices = (userId: string) => {
    if (!payments) return [];
    return payments.filter((p: any) => p.user_id === userId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h2 className="text-2xl font-bold text-gray-800">💰 المالية والاشتراكات</h2>
             <p className="text-gray-500 mt-1">تتبع الوضعية المالية للاشتراكات السنوية والمساهمات</p>
          </div>
          <div className="flex gap-2">
             <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold border border-green-200">
                نسبة التحصيل: 65%
             </div>
          </div>
       </div>

       <JurisdictionBanner 
          onFilterChange={setSelectedPrimaryCourt} 
       />

       {/* Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-gray-50 p-1 rounded-lg w-fit overflow-x-auto">
             {[
                { id: 'annual', label: 'الاشتراك السنوي', icon: '📅' },
                { id: 'monthly', label: 'الاشتراك الشهري', icon: '🗓️' },
                { id: 'affiliation', label: 'الانخراط', icon: '📝' },
                { id: 'stamps', label: 'الدمغة', icon: '🏷️' },
                { id: 'notebook', label: 'كناش التصاريح', icon: '📒' },
                { id: 'register', label: 'سجل البيانات', icon: '📓' },
                { id: 'badge', label: 'الشارة', icon: '📛' },
                { id: 'notaried', label: 'التوثيق', icon: '🏛️' },
                { id: 'donations', label: 'تبرعات', icon: '🎁' },
                { id: 'equipment', label: 'التجهيزات', icon: '🛠️' },
                { id: 'suit', label: 'البدلة', icon: '👔' },
                { id: 'other', label: 'مساهمات اخرى', icon: '🤝' },
             ].map(tab => (
                <button
                   key={tab.id}
                   onClick={() => handleTabChange(tab.id as any)}
                   className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-blue-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                   <span>{tab.icon}</span> {tab.label}
                </button>
             ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
             <button
               onClick={() => setIsBulkPaymentModalOpen(true)}
               className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white font-bold hover:from-green-700 hover:to-green-600 transition-all shadow-sm flex items-center gap-2"
               title="إنشاء دفعة جماعية"
             >
               <span>💳</span>
               <span>دفعة جماعية</span>
             </button>

             <button
               onClick={() => setIsSelectNotaryModalOpen(true)}
               className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm flex items-center gap-2"
               title="إنشاء فاتورة لعدل"
             >
               <span>➕</span>
               <span>إنشاء فاتورة</span>
             </button>
             
             {activeTab === 'monthly' && (
                 <select 
                   className="px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-300 font-bold"
                   value={searchParams.get('month') || new Date().getMonth() + 1}
                   onChange={(e) => {
                       const m = e.target.value;
                       setSearchParams({ ...Object.fromEntries(searchParams), month: m });
                   }}
                 >
                    {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} - {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i]}</option>
                    ))}
                 </select>
             )}

             <input 
               type="text" 
               placeholder="بحث..." 
               className="px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-red-300"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
             <select 
               className="px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-red-300"
               value={statusFilter}
               onChange={(e:any) => setStatusFilter(e.target.value)}
             >
                <option value="all">كل الحالات</option>
                <option value="paid">المؤدون</option>
                <option value="unpaid">المتأخرون</option>
             </select>
          </div>
       </div>

       {/* Table */}
       <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">عدد العدول: <span className="text-blue-600">{augmentedData.length}</span></p>
          </div>
          <table className="w-full text-right">
             <thead className="bg-gray-50 text-gray-700 font-medium">
                <tr>
                   <th className="p-4">العدل</th>
                   <th className="p-4">الدائرة</th>
                   <th className="p-4">{activeTab === 'annual' ? 'السنة' : 'النوع'}</th>
                   <th className="p-4">الحالة</th>
                   <th className="p-4">تاريخ العملية</th>
                   <th className="p-4">المبلغ</th>
                   <th className="p-4">الإجراءات</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 text-gray-700">
                {isLoading ? (
                   <tr><td colSpan={7} className="p-8 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : augmentedData.map((adoul: any, i) => {
                   const status = getStatusConfig(adoul.financialStatus);
                   return (
                      <React.Fragment key={adoul.id || i}>
                      <tr className="hover:bg-blue-50/10 transition-colors cursor-pointer" onClick={() => setExpandedNotaryId(expandedNotaryId === adoul.id ? null : adoul.id)}>
                         <td className="p-4 font-bold max-w-[200px] truncate" title={adoul.full_name}>
                           <div className="flex items-center gap-2">
                               {adoul.photo_url && adoul.photo_url.length > 10 ? (
                                   <img
                                     src={adoul.photo_url}
                                     alt={adoul.full_name}
                                     className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                     onError={(e) => {
                                       // Hide broken image and show initials instead
                                       const target = e.target as HTMLImageElement;
                                       target.style.display = 'none';
                                       const parent = target.parentElement;
                                       if (parent) {
                                         const fallback = document.createElement('div');
                                         fallback.className = 'w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600';
                                         fallback.textContent = adoul.full_name?.slice(0, 2) || '';
                                         parent.insertBefore(fallback, target);
                                       }
                                     }}
                                   />
                               ) : (
                                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                       {adoul.full_name?.slice(0,2)}
                                   </div>
                               )}
                               {adoul.full_name}
                           </div>
                         </td>
                         <td className="p-4 text-sm text-gray-500">{adoul.primary_court || adoul.court_name}</td>
                         <td className="p-4 text-sm">
                           {activeTab === 'annual' ? '2026' : 
                            activeTab === 'monthly' ? (adoul.periodMonth ? `${adoul.periodMonth}/${adoul.periodYear || '2026'}` : '--') :
                            activeTab === 'affiliation' ? 'رسوم الانخراط' :
                            activeTab === 'stamps' ? 'طلب دمغات' :
                            activeTab === 'notebook' ? 'طلب كناش' :
                            activeTab === 'register' ? 'طلب سجل' :
                            activeTab === 'badge' ? 'طلب شارة' :
                            activeTab === 'notaried' ? 'طلب توثيق' : 
                            activeTab === 'donations' ? 'تبرع' : 'عملية'}
                         </td>
                          <td className="p-4">
                             <button
                                type="button"
                                onClick={(e) => {
                                   e.stopPropagation();
                                   handleToggleStatus(adoul.userId, adoul.financialStatus, adoul.recordId);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset cursor-pointer hover:opacity-85 transition-opacity ${status.color.replace('bg-', 'ring-')}`}
                                title="اضغط لتغيير حالة الأداء"
                             >
                                {status.icon} {status.label}
                             </button>
                          </td>
                          <td className="p-4 text-sm font-mono text-gray-500" dir="ltr">
                            {adoul.paymentDate || '--'}
                          </td>
                          <td className="p-4 text-sm font-bold">
                             {adoul.amount} د.م
                          </td>
                          <td className="p-4 flex items-center gap-2">
                             <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   handleToggleStatus(adoul.userId, adoul.financialStatus, adoul.recordId);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                   adoul.financialStatus === 'paid'
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title={adoul.financialStatus === 'paid' ? 'إلغاء التأشير بالأداء' : 'تأكيد أداء الاشتراك'}
                             >
                                <span className="text-xs">{adoul.financialStatus === 'paid' ? '↩️' : '✓'}</span>
                                <span>{adoul.financialStatus === 'paid' ? 'إلغاء الأداء' : 'تأكيد الأداء'}</span>
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedNotaryId(expandedNotaryId === adoul.id ? null : adoul.id); }}
                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center text-xs font-bold"
                                title="عرض التفاصيل"
                             >
                                {expandedNotaryId === adoul.id ? '▼' : '▶'}
                             </button>
                         </td>
                      </tr>
                      {expandedNotaryId === adoul.id && (
                        <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-t border-blue-200">
                          <td colSpan={7} className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-800 text-right flex items-center gap-2">
                                  <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">📋</span>
                                  فواتير {adoul.full_name}
                                </h4>
                                <span className="text-xs bg-blue-200 text-blue-800 px-3 py-1 rounded-full font-bold">
                                  {getNotaryInvoices(adoul.userId).length} فاتورة
                                </span>
                              </div>
                              <div className="overflow-x-auto rounded-xl border border-blue-200 shadow-sm">
                                <table className="w-full text-sm text-right">
                                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                    <tr>
                                      <th className="p-3 text-right font-bold">الإجراءات</th>
                                      <th className="p-3 text-right font-bold">الحالة</th>
                                      <th className="p-3 text-right font-bold">تاريخ الدفع</th>
                                      <th className="p-3 text-right font-bold">المبلغ</th>
                                      <th className="p-3 text-right font-bold">النوع</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-blue-100">
                                    {getNotaryInvoices(adoul.userId).length > 0 ? (
                                      getNotaryInvoices(adoul.userId).map((invoice: any) => {
                                        const invStatus = getStatusConfig(invoice.paid_at ? 'paid' : 'unpaid');
                                        return (
                                          <tr key={invoice.id} className="hover:bg-white/50 transition-colors">
                                            <td className="p-3">
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleToggleStatus(adoul.userId, invoice.paid_at ? 'paid' : 'unpaid', invoice.id)}
                                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                                    invoice.paid_at 
                                                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:from-orange-600 hover:to-orange-500' 
                                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:from-emerald-600 hover:to-emerald-500'
                                                  }`}
                                                >
                                                  <span className="text-sm">{invoice.paid_at ? '↩️' : '✓'}</span>
                                                  {invoice.paid_at ? 'إلغاء الدفع' : 'تأكيد الدفع'}
                                                </button>
                                                <button
                                                  onClick={() => handleDeletePayment(invoice.id, adoul.full_name)}
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:from-blue-600 hover:to-blue-500"
                                                  disabled={deletePaymentMutation.isLoading}
                                                >
                                                  <span className="text-sm">🗑️</span>
                                                  حذف
                                                </button>
                                              </div>
                                            </td>
                                            <td className="p-3">
                                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                                                invoice.paid_at 
                                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 ring-1 ring-green-200' 
                                                : 'bg-gradient-to-r from-red-100 to-orange-100 text-red-700 ring-1 ring-red-200'
                                              }`}>
                                                <span className="text-sm">{invoice.paid_at ? '✅' : '⏳'}</span>
                                                {invoice.paid_at ? 'مدفوعة' : 'غير مدفوعة'}
                                              </span>
                                            </td>
                                            <td className="p-3">
                                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600" dir="ltr">
                                                📅 {invoice.paid_at ? new Date(invoice.paid_at).toISOString().split('T')[0] : '--'}
                                              </span>
                                            </td>
                                            <td className="p-3">
                                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold ring-1 ring-blue-200">
                                                💰 {Number(invoice.amount).toFixed(2)} د.م
                                              </span>
                                            </td>
                                            <td className="p-3 text-right">
                                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">
                                              {invoice.subscription_type === 'annual' ? '📅 سنوي' :
                                               invoice.subscription_type === 'monthly' ? '🗓️ شهري' :
                                               invoice.subscription_type === 'donation' ? '🎁 تبرع' :
                                               invoice.subscription_type === 'stamps' ? '🏷️ دمغات' :
                                               invoice.subscription_type === 'notebook' ? '📒 كناش' :
                                               invoice.subscription_type === 'register' ? '📓 سجل' :
                                               invoice.subscription_type === 'badge' ? '📛 شارة' :
                                               invoice.subscription_type === 'equipment' ? '🛠️ تجهيزات' :
                                               invoice.subscription_type === 'suit' ? '👔 بدلة' :
                                               invoice.subscription_type === 'notaried' ? '🏛️ توثيق' :
                                               invoice.subscription_type === 'affiliation' ? '📝 انخراط' : '🤝 أخرى'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                       <tr>
                                         <td className="p-3">
                                           <button
                                             onClick={() => handleToggleStatus(adoul.userId, adoul.financialStatus, adoul.recordId)}
                                             className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                               adoul.financialStatus === 'paid'
                                                 ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:from-orange-600 hover:to-orange-500'
                                                 : 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:from-emerald-600 hover:to-emerald-500'
                                             }`}
                                           >
                                             <span className="text-sm">{adoul.financialStatus === 'paid' ? '↩️' : '✓'}</span>
                                             {adoul.financialStatus === 'paid' ? 'إلغاء الدفع' : 'تأكيد الدفع'}
                                           </button>
                                         </td>
                                         <td className="p-3">
                                           <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                                             adoul.financialStatus === 'paid'
                                               ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 ring-1 ring-green-200'
                                               : 'bg-gradient-to-r from-red-100 to-orange-100 text-red-700 ring-1 ring-red-200'
                                           }`}>
                                             <span className="text-sm">{adoul.financialStatus === 'paid' ? '✅' : '⏳'}</span>
                                             {adoul.financialStatus === 'paid' ? 'مدفوعة' : 'في انتظار الأداء'}
                                           </span>
                                         </td>
                                         <td className="p-3 font-mono text-xs text-gray-500" dir="ltr">
                                           {adoul.paymentDate || '--'}
                                         </td>
                                         <td className="p-3 font-bold text-gray-800">{adoul.amount} د.م</td>
                                         <td className="p-3 text-right">
                                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">
                                             {activeTab === 'annual' ? '📅 سنوي' :
                                              activeTab === 'monthly' ? '🗓️ شهري' :
                                              activeTab === 'affiliation' ? '📝 انخراط' :
                                              activeTab === 'notaried' ? '🏛️ توثيق' : '🤝 مستحق'}
                                           </span>
                                         </td>
                                       </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                   );
                })}

             </tbody>
          </table>
       </div>
       
       <InvoiceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          notary={selectedNotary} 
          activeTab={activeTab} 
       />

       {/* Bulk Payment Modal */}
       {isBulkPaymentModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setIsBulkPaymentModalOpen(false); setAmountEditConfirmed(false); setBulkPaymentAmount(''); }}>
           <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
             <h3 className="text-xl font-bold text-gray-800 mb-4 text-right">💳 إنشاء فواتير جماعية</h3>
             
             <div className="space-y-4 flex-1 overflow-y-auto">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right">
                 <p className="text-sm text-blue-800">
                   سيتم إنشاء فاتورة لـ 
                   {showNotarySelection && selectedNotariesForBulk.size > 0 
                     ? <span className="font-bold text-blue-900"> {selectedNotariesForBulk.size} عدل محدد</span>
                     : <span className="font-bold text-blue-900"> {augmentedData.length} عدل</span>
                   }
                 </p>
               </div>

               {/* Checkbox to enable selection */}
               <div className="text-right">
                 <label className="flex items-center justify-end gap-2 cursor-pointer">
                   <span className="text-sm font-bold text-gray-700">تحديد عدول معينين</span>
                   <input
                     type="checkbox"
                     checked={showNotarySelection}
                     onChange={(e) => {
                       setShowNotarySelection(e.target.checked);
                       if (e.target.checked) {
                         // Select all by default
                         setSelectedNotariesForBulk(new Set(augmentedData.map((a: any) => a.userId)));
                       } else {
                         setSelectedNotariesForBulk(new Set());
                       }
                     }}
                     className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                   />
                 </label>
               </div>

               {/* Notary selection list */}
               {showNotarySelection && (
                 <div className="border border-gray-200 rounded-lg overflow-hidden">
                   <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                     <button
                       onClick={() => setSelectedNotariesForBulk(new Set())}
                       className="text-xs text-red-600 hover:text-red-800 font-bold"
                     >
                       إلغاء الكل
                     </button>
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-gray-600">المحدد: {selectedNotariesForBulk.size}/{augmentedData.length}</span>
                       <button
                         onClick={() => setSelectedNotariesForBulk(new Set(augmentedData.map((a: any) => a.userId)))}
                         className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                       >
                         تحديد الكل
                       </button>
                     </div>
                   </div>
                   <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                     {augmentedData.map((notary: any) => (
                       <label
                         key={notary.userId}
                         className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                       >
                         <div className="flex items-center gap-3">
                           <input
                             type="checkbox"
                             checked={selectedNotariesForBulk.has(notary.userId)}
                             onChange={(e) => {
                               const newSet = new Set(selectedNotariesForBulk);
                               if (e.target.checked) {
                                 newSet.add(notary.userId);
                               } else {
                                 newSet.delete(notary.userId);
                               }
                               setSelectedNotariesForBulk(newSet);
                             }}
                             className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                           />
                           {notary.photo_url ? (
                             <img
                               src={notary.photo_url}
                               alt={notary.full_name}
                               className="w-8 h-8 rounded-full object-cover border border-gray-200"
                             />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                               {notary.full_name?.slice(0, 2)}
                             </div>
                           )}
                         </div>
                         <div className="text-right">
                           <div className="font-bold text-gray-800 text-sm">{notary.full_name}</div>
                           <div className="text-xs text-gray-500">{notary.primary_court}</div>
                         </div>
                       </label>
                     ))}
                   </div>
                 </div>
               )}

               <div className="text-right">
                 <label className="block text-sm font-bold text-gray-700 mb-2">
                   المبلغ لكل عدل (بالدرهم)
                 </label>
                 <input
                   type="number"
                   value={bulkPaymentAmount}
                   onChange={(e) => {
                     const newValue = e.target.value;
                     if (!amountEditConfirmed && newValue !== '') {
                       setPendingAmountValue(newValue);
                       setShowAmountWarning(true);
                     } else {
                       setBulkPaymentAmount(newValue);
                     }
                   }}
                   placeholder="أدخل المبلغ"
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                   min="0"
                   step="0.01"
                 />
               </div>

               <div className="text-right">
                 <label className="flex items-center justify-end gap-2 cursor-pointer">
                   <span className="text-sm font-bold text-gray-700">تحديد كمدفوعة</span>
                   <input
                     type="checkbox"
                     checked={bulkPaymentMarkAsPaid}
                     onChange={(e) => setBulkPaymentMarkAsPaid(e.target.checked)}
                     className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                   />
                 </label>
                 <p className="text-xs text-gray-500 mt-1">
                   {bulkPaymentMarkAsPaid ? 'سيتم إنشاء الفواتير كمدفوعة' : 'سيتم إنشاء الفواتير كغير مدفوعة'}
                 </p>
               </div>

               {bulkPaymentAmount && Number(bulkPaymentAmount) > 0 && (
                 <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-right">
                   <p className="text-sm text-green-800 font-bold">
                     المجموع الكلي: {(Number(bulkPaymentAmount) * (showNotarySelection && selectedNotariesForBulk.size > 0 ? selectedNotariesForBulk.size : augmentedData.length)).toFixed(2)} د.م
                   </p>
                 </div>
               )}

               <div className="flex gap-2 justify-end pt-2">
                 <button
                   onClick={() => {
                     setIsBulkPaymentModalOpen(false);
                     setBulkPaymentAmount('');
                     setBulkPaymentMarkAsPaid(false);
                     setSelectedNotariesForBulk(new Set());
                     setShowNotarySelection(false);
                     setAmountEditConfirmed(false);
                   }}
                   className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
                 <button
                   onClick={handleBulkPayment}
                   disabled={!bulkPaymentAmount || Number(bulkPaymentAmount) <= 0 || bulkPaymentMutation.isLoading || (showNotarySelection && selectedNotariesForBulk.size === 0)}
                   className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-bold hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {bulkPaymentMutation.isLoading ? 'جارٍ المعالجة...' : 'إنشاء الفواتير'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Amount Warning Dialog */}
       {showAmountWarning && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowAmountWarning(false)}>
           <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-t-4 border-amber-500" onClick={(e) => e.stopPropagation()}>
             <div className="text-center mb-6">
               <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-3xl">⚠️</span>
               </div>
               <h3 className="text-xl font-bold text-gray-800 mb-3">تنبيه إداري</h3>
               <p className="text-gray-600 leading-relaxed">
                 المبلغ الواجب أداؤه يُحدد حصريًا من طرف المكتب الجهوي بعد المصادقة عليه في اجتماع رسمي.
               </p>
               <p className="text-gray-700 font-bold mt-4">
                 هل ترغب فعلًا في تعديل القيمة؟
               </p>
             </div>

             <div className="flex gap-3 justify-center">
               <button
                 onClick={() => {
                   setShowAmountWarning(false);
                   setPendingAmountValue('');
                 }}
                 className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
               >
                 لا، إلغاء
               </button>
               <button
                 onClick={() => {
                   setAmountEditConfirmed(true);
                   setBulkPaymentAmount(pendingAmountValue);
                   setShowAmountWarning(false);
                   setPendingAmountValue('');
                 }}
                 className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-bold hover:from-amber-600 hover:to-amber-700 transition-all"
               >
                 نعم، متابعة التعديل
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Single Invoice Creation Modal */}
       {isCreateInvoiceModalOpen && selectedNotaryForInvoice && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsCreateInvoiceModalOpen(false)}>
           <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
             <h3 className="text-xl font-bold text-gray-800 mb-4 text-right">➕ إنشاء فاتورة</h3>
             
             <div className="space-y-4">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right">
                 <p className="text-sm text-blue-800 font-bold">
                   العدل: {selectedNotaryForInvoice.full_name}
                 </p>
                 <p className="text-xs text-blue-600 mt-1">
                   {selectedNotaryForInvoice.primary_court || selectedNotaryForInvoice.court_name}
                 </p>
               </div>

               <div className="text-right">
                 <label className="block text-sm font-bold text-gray-700 mb-2">
                   المبلغ (بالدرهم)
                 </label>
                 <input
                   type="number"
                   value={singleInvoiceAmount}
                   onChange={(e) => setSingleInvoiceAmount(e.target.value)}
                   placeholder="أدخل المبلغ"
                   className="w-full px-4 py-3 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                   min="0"
                   step="0.01"
                   autoFocus
                 />
               </div>

               <div className="text-right">
                 <label className="flex items-center justify-end gap-2 cursor-pointer">
                   <span className="text-sm font-bold text-gray-700">تحديد كمدفوعة</span>
                   <input
                     type="checkbox"
                     checked={singleInvoiceMarkAsPaid}
                     onChange={(e) => setSingleInvoiceMarkAsPaid(e.target.checked)}
                     className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                   />
                 </label>
                 <p className="text-xs text-gray-500 mt-1">
                   {singleInvoiceMarkAsPaid ? 'سيتم إنشاء الفاتورة كمدفوعة' : 'سيتم إنشاء الفاتورة كغير مدفوعة'}
                 </p>
               </div>

               <div className="flex gap-2 justify-end pt-2">
                 <button
                   onClick={() => {
                     setIsCreateInvoiceModalOpen(false);
                     setSingleInvoiceAmount('');
                     setSingleInvoiceMarkAsPaid(false);
                     setSelectedNotaryForInvoice(null);
                   }}
                   className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
                 <button
                   onClick={handleCreateSingleInvoice}
                   disabled={!singleInvoiceAmount || Number(singleInvoiceAmount) <= 0 || bulkPaymentMutation.isPending}
                   className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {bulkPaymentMutation.isPending ? 'جارٍ المعالجة...' : 'إنشاء الفاتورة'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Select Notary Modal */}
       {isSelectNotaryModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsSelectNotaryModalOpen(false)}>
           <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
             <h3 className="text-xl font-bold text-gray-800 mb-4 text-right">اختر عدل لإنشاء فاتورة</h3>
             
             <div className="mb-4">
               <input
                 type="text"
                 value={notarySearchTerm}
                 onChange={(e) => setNotarySearchTerm(e.target.value)}
                 placeholder="ابحث عن عدل..."
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                 autoFocus
               />
             </div>

             <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
               {adouls && adouls.length > 0 ? (
                 <div className="divide-y divide-gray-100">
                   {adouls
                     .filter((notary: any) => 
                       !notarySearchTerm || 
                       notary.full_name?.toLowerCase().includes(notarySearchTerm.toLowerCase()) ||
                       notary.cin?.includes(notarySearchTerm) ||
                       notary.primary_court?.includes(notarySearchTerm)
                     )
                     .map((notary: any) => (
                       <button
                         key={notary.id}
                         onClick={() => {
                           setSelectedNotaryForInvoice({
                             ...notary,
                             userId: notary.id
                           });
                           setIsSelectNotaryModalOpen(false);
                           setIsCreateInvoiceModalOpen(true);
                           setNotarySearchTerm('');
                         }}
                         className="w-full p-4 text-right hover:bg-blue-50 transition-colors flex items-center justify-between"
                       >
                         <div className="flex items-center gap-3">
                           {notary.photo_url && notary.photo_url.length > 10 ? (
                             <img
                               src={notary.photo_url}
                               alt={notary.full_name}
                               className="w-10 h-10 rounded-full object-cover border border-gray-200"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.style.display = 'none';
                               }}
                             />
                           ) : (
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                               {notary.full_name?.slice(0, 2)}
                             </div>
                           )}
                           <div>
                             <div className="font-bold text-gray-900">{notary.full_name}</div>
                             <div className="text-sm text-gray-500">{notary.primary_court || notary.court_name}</div>
                           </div>
                         </div>
                         <div className="text-xs text-gray-400">{notary.cin}</div>
                       </button>
                     ))}
                 </div>
               ) : (
                 <div className="p-8 text-center text-gray-400">لا يوجد عدول</div>
               )}
             </div>

             <div className="mt-4 flex justify-end">
               <button
                 onClick={() => {
                   setIsSelectNotaryModalOpen(false);
                   setNotarySearchTerm('');
                 }}
                 className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-all"
               >
                 إلغاء
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

// --- Main Portal Layout ---

export const RegionalCouncilPortal = () => {
  const navigate = useNavigate();
  const { user, logout, notaryProfile } = useAuth();
  const location = useLocation();
  const { unreadTotal, councilRequestsTotal, councilUnderReviewTotal, councilArchivedTotal, councilHubTotal } = useMessagingNotifications();
  const { i18n } = useTranslation();

  const isArabic = i18n.language === 'ar';
  const currentPath = location.pathname.split('/').pop() || '';
  const effectivePath = location.pathname.endsWith('/regional-council') ? '' : currentPath;

  const regionInfo = React.useMemo(() => {
    let regionName = notaryProfile?.appellate_court;
    if (!regionName && user?.full_name) {
         const normalizedName = user.full_name.trim();
         const match = COURT_MAPPINGS.find(m => normalizedName.includes(m.appellateCourt) || normalizedName.includes(m.appellateCourt.replace('محكمة الاستئناف ', '').replace('ب', '')));
         if (match) regionName = match.appellateCourt;
    }
    return regionName || "المجلس الجهوي للعدول";
 }, [user, notaryProfile]);

  const NAV_ITEMS: NavItem[] = [
    { path: '', label: 'الرئيسية', icon: '🏠' },
    { path: 'regional-statistics', label: 'التدبير الإحصائي الجهوي', icon: '🎯' },
    { path: 'invoices-dashboard', label: 'لوحة الفواتير', icon: '📋' },
    { path: 'technical-card', label: 'بطاقة تقنية خاصة بالسادة العدول', icon: '🆔' },
    { path: 'annual-files', label: 'الملفات السنوية', icon: '📂' },
    
    // Judicial Mobility Management
    { path: 'notifications-hub', label: '⚖️ التدبير القانوني والتقسيم القضائي للطلبات', icon: '⚖️' },
    { path: 'notifications-decisions', label: 'وحدة القرار الموحدة', icon: '✅' },
    { path: 'notifications-archive', label: 'الأرشيف القانوني', icon: '🗂️' },
    { path: 'notifications-reports', label: 'التقارير', icon: '📊' },
    { path: 'notifications-settings', label: 'الإعدادات', icon: '⚙️' },
    
    // Exports, Imports and Judges relation
    { path: 'exports-imports', label: '📤 الصادرات والواردات (قضاتي)', icon: '📤' },
    { path: 'executive-office-correspondence', label: 'الصادرات والواردات / المكتب التنفيذي للهيئة الوطنية', icon: '🏛️' },
    
    // Financial Management
    { path: 'financial-dashboard', label: 'التدبير المالي للجهة', icon: '📊' },
    { path: 'subscriptions?tab=annual', label: 'الاشتراكات المالية', icon: '💰' },
    { path: 'subscriptions?tab=voluntary', label: 'مساهمات وتبرعات', icon: '🤝' },

    { path: 'age-management', label: 'مراقبة السن', icon: '⏳' },
    { path: 'training', label: 'التكوين', icon: '🎓' },
    { path: 'ethics', label: 'التأديب والأخلاقيات', icon: '⚖️' },
    { path: 'services', label: 'الخدمات الاجتماعية', icon: '🤝' },
    { path: 'messaging', label: 'المراسلات', icon: '📨' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-[#161c4f] via-[#1d2569] to-[#0d123d] text-white shadow-2xl z-20 border-l-4 border-[#E6BE8A] transition-all duration-300 flex flex-col h-screen flex-shrink-0 relative overflow-hidden font-kufi">
        {/* Luxury Grand Moroccan Islamic Pattern Watermark */}
        <div className="absolute inset-0 moroccan-luxury-pattern pointer-events-none z-0"></div>

        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>

        {/* Sidebar Header */}
        <div className="p-6 bg-gradient-to-b from-[#161c4f] to-[#0d123d] border-b border-[#E6BE8A]/30 group relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E6BE8A] to-amber-500 rounded-2xl flex items-center justify-center text-[#161c4f] font-bold text-2xl shadow-lg shadow-amber-400/40 group-hover:scale-110 transition-transform">
                🏛️
            </div>
            <div>
               <h1 className="text-xl font-black text-white leading-tight tracking-tight font-maghribi">المجلس الجهوي</h1>
               <p className="text-xs text-[#E6BE8A] opacity-90 font-medium mt-1 font-kufi">الهيئة الوطنية للعدول</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto py-8 px-3 scrollbar-thin scrollbar-thumb-[#E6BE8A]/80 scrollbar-track-gray-800/40 scrollbar-thumb-rounded-full hover:scrollbar-thumb-[#E6BE8A] relative z-10">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
               const isActive = item.path === '' 
                  ? (location.pathname === '/regional-council' || location.pathname === '/regional-council/')
                  : location.pathname.endsWith(`/${item.path}`) || location.pathname.includes(`/${item.path}/`);
               
               return (
                <li key={item.path}>
                  <Link
                    to={`/regional-council/${item.path}`}
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
                      {item.path === 'messaging' && unreadTotal > 0 ? (
                        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {unreadTotal}
                        </span>
                      ) : null}
                      {item.path === 'notifications-hub' && councilHubTotal > 0 ? (
                        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white animate-pulse shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {councilHubTotal}
                        </span>
                      ) : null}
                      {item.path === 'notifications-requests' && councilRequestsTotal > 0 ? (
                        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white animate-pulse shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {councilRequestsTotal}
                        </span>
                      ) : null}
                      {item.path === 'notifications-decisions' && councilUnderReviewTotal > 0 ? (
                        <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {councilUnderReviewTotal}
                        </span>
                      ) : null}
                      {item.path === 'notifications-archive' && councilArchivedTotal > 0 ? (
                        <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white/20 flex-shrink-0">
                          {councilArchivedTotal}
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
             <div className="w-10 h-10 rounded-full border border-[#E6BE8A]/30 overflow-hidden bg-gradient-to-br from-[#E6BE8A] to-[#c5a065] flex items-center justify-center text-sm font-bold text-[#161c4f] shadow-inner">
               {user?.full_name?.charAt(0) || 'A'}
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-bold text-white truncate">{user?.full_name || 'Admin'}</p>
               <p className="text-xs text-[#E6BE8A] truncate opacity-80">رئيس المجلس</p>
             </div>
           </div>
           
           <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-[#E6BE8A] hover:bg-[#d4af37] text-[#161c4f] py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
           >
             <span>🚪</span> تسجيل الخروج
           </button>
        </div>

        {/* Decorative Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E6BE8A] via-amber-400 to-[#E6BE8A] z-10"></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto h-screen bg-gray-50 flex flex-col relative">
        {/* Modernized Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-[100] no-print">
          <div className="max-w-[1600px] mx-auto px-8 h-24 flex items-center justify-between relative">
            
            {/* Right Side: State Identity (RTL: Left of screen) */}
            <div className="flex items-center gap-6">
              <div className="p-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hidden sm:block">
                <img
                  src="/logos/morocco-coat.jpg"
                  alt="شعار المملكة المغربية"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <div className="text-right border-r-2 border-slate-100 pr-6">
                <h2 className="text-lg font-black text-slate-900 leading-tight">المملكة المغربية</h2>
                <p className="text-sm font-bold text-slate-500">الهيئة الوطنية للعدول</p>
              </div>
            </div>

            {/* Middle: User Identity & Portal Name - Absolutely Centered */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
               <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#161c4f] to-[#1d2569] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative h-14 w-14 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
                      {notaryProfile?.profile_picture_url ? (
                        <img 
                          src={notaryProfile.profile_picture_url} 
                          alt="Council User" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[#161c4f] font-bold text-xl uppercase">
                          {user?.full_name?.charAt(0) || '👤'}
                        </div>
                      )}
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
               </div>
            </div>

            {/* Left Side: Actions & Utility */}
            <div className="flex items-center gap-6">
              {/* Utility Icons */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button
                  onClick={() => navigate('/regional-council/messaging')}
                  className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group lg:w-11 lg:h-11 flex items-center justify-center"
                  title="الرسائل"
                >
                  <span className="text-lg group-hover:rotate-12 transition-transform">📬</span>
                  {unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border-2 border-white text-[10px] font-black text-white shadow-lg animate-bounce">
                      {unreadTotal}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigate('/regional-council/notifications-hub')}
                  className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all group lg:w-11 lg:h-11 flex items-center justify-center"
                  title="تنبيهات قانونية"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">🔔</span>
                  {councilHubTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-white text-[10px] font-black text-white shadow-lg animate-pulse">
                      {councilHubTotal}
                    </span>
                  )}
                </button>
              </div>

              {/* Date & Language */}
              <div className="hidden lg:flex flex-col items-center gap-1 border-r border-slate-200 pr-6 h-12 justify-center">
                 <div className="bg-slate-900 text-[#E6BE8A] text-[11px] font-black px-3 py-1 rounded-full border border-[#E6BE8A]/30 flex items-center gap-2 shadow-inner">
                   <span>📅</span>
                   <DateWidget />
                 </div>
              </div>

              {/* Secondary Logo */}
              <div className="p-1.5 bg-white rounded-xl shadow-sm border border-slate-100 hidden md:block">
                <img
                  src="/logos/adoul-logo.jpg"
                  alt="شعار الهيئة"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* Sub-Header: Animated Breadcrumbs / Context */}
          <div className="flex h-32 items-center justify-center relative px-12 -mt-4 mb-2 no-print select-none z-[110]">
            <OrnateScrollBanner className="group" theme="blue">
               <span className="text-center text-3xl font-black tracking-widest drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] px-24 group-hover:scale-[1.01] transition-transform duration-700 font-amiri">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(230,190,138,0.4)]">
                    المجلس الجهوي
                  </span>
               </span>
               <div className="absolute left-10 hidden 2xl:flex items-center gap-2 bg-black/40 px-5 py-2 rounded-xl border border-amber-400/20 backdrop-blur-md shadow-2xl translate-x-12 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E6BE8A] animate-pulse ring-4 ring-[#E6BE8A]/20"></span>
                  <span className="text-xs font-black uppercase text-[#E6BE8A] tracking-widest text-nowrap">
                    {NAV_ITEMS.find(item => item.path === effectivePath)?.label || 'الرئيسية'}
                  </span>
               </div>
            </OrnateScrollBanner>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#161c4f] shadow-[0_2px_4px_rgba(0,0,0,0.1)]"></div>
        </header>

        <main className="p-8 max-w-7xl mx-auto flex-1 w-full bg-[#fdfdfd]">
          <div className="mb-10 no-print">
            <div className="bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full -ml-24 -mb-24 transition-transform duration-700 group-hover:scale-110"></div>
               
               <div className="relative z-10 text-right space-y-2">
                 <h1 className="text-4xl lg:text-5xl font-black text-slate-900 font-amiri tracking-tight">
                    {NAV_ITEMS.find(item => item.path === effectivePath)?.label || 'بوابة المجلس الجهوي'}
                 </h1>
                 <p className="text-slate-500 text-lg font-bold flex items-center gap-2">
                   <span className="text-red-900">✨</span>
                   التدبير الإلكتروني الموحد لشؤون العدول والمواطنين
                 </p>
               </div>

               <div className="relative z-10 flex flex-wrap justify-center gap-4">
                 <button 
                  onClick={() => navigate('/regional-council')}
                  className="bg-red-950 text-[#E6BE8A] px-8 py-4 rounded-2xl font-black shadow-2xl shadow-red-950/20 hover:bg-black transition-all active:scale-95 flex items-center gap-3 group"
                 >
                   <span className="bg-red-900/50 p-2 rounded-xl text-xl group-hover:rotate-12 transition-transform">📊</span>
                   الرؤية الشمولية
                 </button>
               </div>
            </div>
          </div>
          
          <Routes>
            <Route index element={<RegionalDashboard />} />
            <Route path="regional-statistics" element={<RegionalStatisticalManagement />} />
            <Route path="invoices-dashboard" element={<RegionalCouncilInvoicesDashboard />} />
            <Route path="technical-card" element={<NotaryTechnicalCardPage />} />
            <Route path="annual-files" element={<AnnualFiles />} />
            
            {/* Judicial Mobility Notification Routes */}
            <Route path="notifications-hub" element={<RegionalNotificationsCenterPage />} />
            <Route path="notifications-dashboard" element={<NotificationsAndStudentsHub />} />
            <Route path="notifications-requests" element={<NotificationsAndStudentsHub />} />
            <Route path="requests" element={<NotificationsAndStudentsHub />} />
            <Route path="notifications-decisions" element={<NotificationsAndStudentsHub />} />
            <Route path="notifications-archive" element={<ArchiveModule />} />
            <Route path="notifications-reports" element={<ReportsModule />} />
            <Route path="notifications-settings" element={<SettingsModule />} />
            <Route path="exports-imports" element={<ExportsAndImports />} />
            <Route path="executive-office-correspondence" element={<ExecutiveOfficeCorrespondence />} />
            
            <Route path="financial-dashboard" element={<RegionalIncomeContribution />} />
            <Route path="subscriptions" element={<FinancialManagement />} />
            <Route path="age-management" element={<AgeManagement />} />
            <Route path="training" element={<TrainingCenter />} />
            <Route path="ethics" element={<UnderConstruction title="التأديب والأخلاقيات" />} />
            <Route path="services" element={<UnderConstruction title="الخدمات الاجتماعية" />} />
            <Route path="messaging" element={<MessagingInbox mode="notary" />} />
            <Route path="*" element={<Navigate to="/regional-council" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

