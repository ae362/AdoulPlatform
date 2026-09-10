import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import NotificationDashboard from './NotificationDashboard';
import { OfficeMovementDocumentView } from '../../components/OfficeMovementDocumentView';

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

interface StudentRecord {
  id: string;
  name: string;
  level: string;
  school: string;
  registrationDate: string;
  status: string;
}

const NotificationsAndStudentsHub: React.FC = () => {
  return <StudentsManagement />;
};

// Students Management Component
const StudentsManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlRequestId = searchParams.get('requestId');
  const urlSearch = searchParams.get('search');
  const urlSection = searchParams.get('section');
  const urlAction = searchParams.get('action');

  type ActiveSection = 'all' | 'ADM' | 'REG' | 'PRO' | 'ELEC' | 'pending' | 'issued' | 'archived' | 'overview' | 'requests' | 'reports';

  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    if (urlSection && ['all', 'ADM', 'REG', 'PRO', 'ELEC', 'pending', 'issued', 'archived', 'overview', 'requests', 'reports'].includes(urlSection)) {
      return urlSection as any;
    }
    return (urlRequestId || urlSearch) ? 'all' : 'overview';
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [notificationPage, setNotificationPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [communeFilter, setCommuneFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(() => urlSearch || urlRequestId || '');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'written_request'>('overview');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showLegislativeGuide, setShowLegislativeGuide] = useState(false);
  const [showResponsePreview, setShowResponsePreview] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionType, setDecisionType] = useState<'موافقة' | 'رفض' | 'تأجيل' | 'حفظ_دون_أثر' | 'قيد_الدراسة'>('موافقة');
  const [internalNotes, setInternalNotes] = useState('');

  const lastHandledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (urlSearch || urlRequestId) {
      setActiveSection('all');
      if (urlSearch) setSearchTerm(urlSearch);
    }
  }, [urlRequestId, urlSearch]);

  // Fetch real data from judicial_notifications table
  const { data: notificationsList, isLoading: notificationsLoading } = trpc.notifications.getRequestsList.useQuery({
    status: (statusFilter as any) || 'all',
    searchTerm: searchTerm,
    limit: 12,
    offset: notificationPage * 12,
  });

  useEffect(() => {
    if (!urlRequestId && !urlSearch) return;
    const key = `${urlRequestId || ''}-${urlSearch || ''}`;
    if (lastHandledKeyRef.current === key) return;

    if (notificationsList && (notificationsList as any[]).length > 0) {
      const match = (notificationsList as any[]).find(
        (n) => String(n.id) === String(urlRequestId) || n.request_number === urlSearch || String(n.id) === String(urlSearch)
      ) || (urlRequestId || urlSearch ? (notificationsList as any[])[0] : null);

      if (match) {
        setSelectedNotification(match);
        if (urlAction === 'decision') {
          setShowDecisionModal(true);
        } else {
          setShowDetailModal(true);
        }
        lastHandledKeyRef.current = key;
      }
    }
  }, [notificationsList, urlRequestId, urlSearch, urlAction]);

  const { data: dashboardStats, isLoading: statsLoading } = trpc.notifications.getDashboardStats.useQuery({
    year: new Date().getFullYear(),
  });

  const { data: monthlyStats, isLoading: monthlyLoading } = trpc.notifications.getMonthlyStats.useQuery({
    year: new Date().getFullYear(),
  });

  // Mutation for recording decisions
  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation({
    onSuccess: () => {
      // Refetch the notifications list after decision is recorded
      alert('تم حفظ القرار بنجاح');
      setShowDecisionModal(false);
      setDecisionReason('');
      setInternalNotes('');
      setDecisionType('موافقة');
      setSelectedNotification(null);
    },
    onError: (error) => {
      alert(`خطأ: ${error.message}`);
    }
  });

  // Unique lists for filters
  const provinces = useMemo(() => {
    if (!notificationsList) return [];
    return [...new Set((notificationsList as any[]).map(n => n.province).filter(Boolean))];
  }, [notificationsList]);

  const communes = useMemo(() => {
    if (!notificationsList) return [];
    return [...new Set((notificationsList as any[]).map(n => n.commune).filter(Boolean))];
  }, [notificationsList]);

  // Filter by category, status, group, and geography
  const filteredNotifications = useMemo(() => {
    if (!notificationsList) return [];
    
    let items = (notificationsList as any[]).map(n => ({
      ...n,
      appellate_court: n.appellate_court || n.jurisdiction,
    }));

    if (categoryFilter !== 'all') {
      items = items.filter(n => 
        n.request_number?.includes(`-${categoryFilter}-`) || 
        n.notes?.includes(`"category":"${categoryFilter}"`)
      );
    }

    if (statusFilter !== 'all') {
      items = items.filter(n => n.status === statusFilter);
    }

    if (provinceFilter) {
      items = items.filter(n => n.province === provinceFilter);
    }
    if (communeFilter) {
      items = items.filter(n => n.commune === communeFilter);
    }

    return items;
  }, [notificationsList, categoryFilter, statusFilter, provinceFilter, communeFilter]);

  // Status mapping to colors and labels with premium branding
  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'موافق_عليه': return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.1)]', label: 'موافق عليها' };
      case 'مرفوض': return { color: 'bg-rose-50 text-rose-700 border-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.1)]', label: 'مرفوضة' };
      case 'مؤجل': return { color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.1)]', label: 'مؤجلة' };
      case 'قيد_الدراسة': return { color: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-[0_0_20px_rgba(79,70,229,0.1)]', label: 'قيد الدراسة' };
      case 'مسجل': return { color: 'bg-slate-50 text-slate-700 border-slate-200', label: 'مسجلة' };
      case 'محفوظ_دون_أثر': return { color: 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60', label: 'محفوظة' };
      default: return { color: 'bg-red-50 text-red-950 border-red-100 italic', label: 'قيد المعالجة' };
    }
  };

  const cleanCourtName = (name: string) => {
    if (!name) return '........';
    return name
      .replace(/محكمة الاستئناف\s+محكمة الاستئناف/g, 'محكمة الاستئناف')
      .replace(/بمحكمة الاستئناف\s+بمحكمة الاستئناف/g, 'بمحكمة الاستئناف')
      .replace(/بجهة\s+بجهة/g, 'بجهة')
      .trim();
  };

  const cleanDisplayNotes = (notes: string) => {
    if (!notes) return 'لا توجد ملاحظات إضافية مسجلة';
    // Remove JSON-like metadata if present
    let cleaned = notes;
    try {
      if (notes.startsWith('{') && notes.endsWith('}')) {
        const obj = JSON.parse(notes);
        if (obj.additionalNotes) return obj.additionalNotes;
        if (obj.notes) return obj.notes;
        return 'بيانات تقنية مسجلة';
      }
    } catch (e) {
      // Not JSON, continue with regex
    }
    
    return cleaned
      .replace(/\{"category":"[^"]+","status":"[^"]+","updatedAt":"[^"]+"\}/g, '')
      .replace(/\{"type":"[^"]+","timestamp":"[^"]+"\}/g, '')
      .trim() || 'لا توجد ملاحظات إضافية';
  };

  const getLegalClassification = (reqNum: string) => {
    if (reqNum?.includes('-ADM-')) return { label: 'طلب إداري', article: 'المادة 184', desc: 'لا تتضمن تقديراً مهنياً ولا تأديباً' };
    if (reqNum?.includes('-REG-')) return { label: 'طلب تنظيمي', article: 'المادة 174/184', desc: 'إعداد تقارير المجلس أو النظام الداخلي' };
    if (reqNum?.includes('-PRO-')) return { label: 'طلب ذو طابع مهني', article: 'المادة 174', desc: 'تتعلق بالسلوك المهني والانضباط' };
    if (reqNum?.includes('-ELEC-')) return { label: 'طلب انتخابي', article: 'قانون الهيئة الوطنية', desc: 'تتعلق بانتخابات أجهزة الهيئة الوطنية للعدول' };
    return { label: 'تصنيف عام', article: 'قانون 16-03', desc: 'طلب قيد المعالجة القانونية' };
  };

  const getDocSubject = (notif: any) => {
    if (notif.request_number?.includes('-ADM-')) return 'قرار المجلس بخصوص طلب إداري رقم ' + notif.request_number;
    if (notif.request_number?.includes('-REG-')) return 'قرار المجلس بخصوص طلب تنظيمي رقم ' + notif.request_number;
    if (notif.request_number?.includes('-PRO-')) return 'قرار المجلس بخصوص طلب مهني رقم ' + notif.request_number;
    if (notif.request_number?.includes('-ELEC-')) return 'قرار المجلس بخصوص طلب انتخابي رقم ' + notif.request_number;
    return 'جواب على إشعار بالتوجه لتلقي إشهاد خارج المحكمة';
  };

  // Transform stats for display
  const stats = useMemo(() => {
    if (!dashboardStats) return [];
    return [
      {
        label: 'إجمالي الوارد',
        value: dashboardStats.totalIncoming || 0,
        icon: '📥',
        color: 'bg-blue-50 text-blue-700 border-blue-100',
      },
      {
        label: 'تمت معالجتها',
        value: (dashboardStats.totalApproved || 0) + (dashboardStats.totalRejected || 0),
        icon: '⚖️',
        color: 'bg-green-50 text-green-700 border-green-100',
      },
      {
        label: 'قيد الدراسة',
        value: (dashboardStats as any)?.totalUnderReview || 0,
        icon: '🔍',
        color: 'bg-orange-50 text-orange-700 border-orange-100',
      },
      {
        label: 'محفوظة',
        value: (dashboardStats as any)?.totalArchived || 0,
        icon: '📁',
        color: 'bg-gray-50 text-gray-700 border-gray-100',
      },
    ];
  }, [dashboardStats]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" dir="rtl">
      {/* 🧭 Sovereign Vertical Navigation Bar */}
      <div className="w-24 bg-white border-l border-slate-200 flex flex-col items-center py-8 gap-6 shrink-0 shadow-lg z-50">
        <div className="w-14 h-14 bg-red-950 rounded-[1.2rem] flex items-center justify-center text-2xl shadow-xl shadow-red-950/20 text-white mb-6">⚖️</div>
        
        <div className="flex flex-col gap-4 flex-1">
          {[
            { id: 'overview', icon: '📊', label: 'الرئيسية' },
            { id: 'all', icon: '🏛️', label: 'الأرشيف' },
            { id: 'pending', icon: '⏳', label: 'المعالجة' },
            { id: 'issued', icon: '✅', label: 'الموافق' },
            { id: 'archived', icon: '📁', label: 'الحفظ' },
            { id: 'reports', icon: '📈', label: 'التقارير' }
          ].map((nav) => (
            <button
              key={nav.id}
              onClick={() => setActiveSection(nav.id as any)}
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group ${
                activeSection === nav.id 
                ? 'bg-red-950 text-white shadow-2xl scale-110' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-red-950'
              }`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{nav.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{nav.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => setShowLegislativeGuide(true)}
          className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-xl text-[#E6BE8A] hover:bg-black transition-all shadow-lg"
        >
          📘
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        <header className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black text-slate-900 font-amiri tracking-tight">التدبير القانوني والتقسيم القضائي للطلبات</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative group">
                <input 
                  className="bg-slate-100 border border-transparent rounded-[1rem] px-12 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-red-950/20 outline-none transition-all w-80 placeholder:text-slate-400"
                  placeholder="البحث السريع..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </header>
        <div className="hidden">
          {/* Old Sidebar Removed */}
        </div>
        <div className="flex-1 p-8 space-y-8 overflow-y-auto no-print">
          <div className="hidden">
            <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-red-900/40 mb-6 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-slate-200"></span>
              التدبير والتقسيم القضائي
            </h3>
          </div>
          <div className="hidden">
            Legal State Removed
          </div>

          {/* Main Dashboard Modules */}
          <div className="space-y-12">
            {/* Overview Section - Elevated Stats */}
            {activeSection === 'overview' && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading ? (
              <div className="col-span-full h-48 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-200">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                  <span className="font-black text-slate-400 text-xs">جاري المزامنة مع قاعدة البيانات...</span>
                </div>
              </div>
            ) : (
              stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-100 group hover:translate-y-[-6px] transition-all duration-500 cursor-pointer">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`p-4 rounded-2xl ${stat.color} shadow-inner bg-opacity-10`}>
                      <span className="text-3xl filter drop-shadow-sm">{stat.icon}</span>
                    </div>
                    <div className="h-6 w-6 bg-slate-50 rounded-full flex items-center justify-center text-[10px] text-slate-300 font-black">
                       i
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black text-slate-900 font-amiri decoration-[#E6BE8A] decoration-2 underline-offset-8">{stat.value}</p>
                      <span className="text-xs font-bold text-slate-400">طلب</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center justify-between mb-12 border-b border-slate-50 pb-8">
                <div className="space-y-2">
                   <h3 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">الرصد الإحصائي للمعاملات</h3>
                   <p className="text-slate-400 text-xs font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      تحليل البيانات الواردة وتطور وتيرة الطلبات الزمنية
                   </p>
                </div>
                <div className="flex gap-3">
                   <button className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-800 text-xs font-black border border-slate-100 hover:bg-slate-100 transition-colors">تصدير التقارير 📤</button>
                </div>
             </div>
             <NotificationDashboard />
          </div>
        </div>
      )}

      {/* List Section - Advanced Layout */}
      {activeSection !== 'overview' && activeSection !== 'requests' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Intelligence Search Bar */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-red-950"></div>
            <div className="flex flex-col gap-10">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-50">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl shadow-slate-900/30 text-white">🔍</div>
                   <div>
                     <h2 className="text-2xl font-black text-slate-900 font-amiri">مختبر البحث والفلترة</h2>
                     <p className="text-slate-400 text-[11px] font-bold mt-1 uppercase tracking-wider">Search Intelligence Hub</p>
                   </div>
                 </div>
                 
                 <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                   <button 
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black transition-all duration-300 ${viewMode === 'table' ? 'bg-white shadow-xl text-slate-900 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <span>📋</span>
                     جدول تفصيلي
                   </button>
                   <button 
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black transition-all duration-300 ${viewMode === 'cards' ? 'bg-white shadow-xl text-slate-900 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <span>🃏</span>
                     نظام البطاقات
                   </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 <div className="lg:col-span-12 space-y-4">
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="ابحث عن رقم الإشعار، اسم العدل، أو تفاصيل الأطراف..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setNotificationPage(0);
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-16 py-5 font-bold text-slate-800 focus:bg-white focus:border-red-900/20 outline-none transition-all placeholder:text-slate-400/70"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl filter grayscale opacity-40 group-focus-within:grayscale-0 group-focus-within:opacity-100 transition-all">🔎</span>
                      
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {searchTerm && (
                           <button onClick={() => setSearchTerm('')} className="bg-slate-200/50 hover:bg-slate-200 p-2 rounded-full text-xs">✕</button>
                        )}
                        <span className="text-[10px] font-black text-slate-300 border border-slate-200 px-3 py-1 rounded-full bg-white">Global Search</span>
                      </div>
                    </div>
                 </div>

                 <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4 pb-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 px-2 uppercase italic">الحالة المرغوبة</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setNotificationPage(0);
                        }}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none hover:border-red-900/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="all">كل الحالات القانونية</option>
                        <option value="مسجل">المسجلة</option>
                        <option value="قيد_الدراسة">قيد الدراسة</option>
                        <option value="موافق_عليه">موافق عليها</option>
                        <option value="مرفوض">مرفوضة</option>
                        <option value="مؤجل">مؤجلة</option>
                        <option value="محفوظ_دون_أثر">محفوظة دون أثر</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 px-2 uppercase italic">العمالة / الإقليم</label>
                      <select
                        value={provinceFilter}
                        onChange={(e) => setProvinceFilter(e.target.value)}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none hover:border-red-900/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="">جميع الأقاليم</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 px-2 uppercase italic">الجماعة الترابية</label>
                      <select
                        value={communeFilter}
                        onChange={(e) => setCommuneFilter(e.target.value)}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none hover:border-red-900/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="">جميع الجماعات</option>
                        {communes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2 flex flex-col justify-end">
                      <button 
                        onClick={() => {
                          setProvinceFilter('');
                          setCommuneFilter('');
                          setStatusFilter('all');
                          setSearchTerm('');
                        }}
                        className="w-full py-4 rounded-2xl bg-red-50 text-red-900 text-xs font-black border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
                      >
                        إعادة الضبط ↺
                      </button>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Table or Cards View */}
          {notificationsLoading ? (
            <div className="py-24 text-center space-y-6 bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
              <div className="w-16 h-16 border-[6px] border-slate-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-1">
                 <p className="text-slate-900 font-black text-lg">جاري تحميل البيانات...</p>
                 <p className="text-slate-400 text-xs font-bold italic">يتم الاتصال بالخادم الرئيسي للمجلس</p>
              </div>
            </div>
          ) : filteredNotifications && filteredNotifications.length > 0 ? (
            viewMode === 'table' ? (
              <div className="bg-transparent animate-in fade-in slide-in-from-bottom-6 duration-700 overflow-x-auto custom-scrollbar pb-4">
                <table className="w-full text-right border-separate border-spacing-y-4 min-w-[1000px]">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">رقم الإشعار</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">اسم المودع والتفاصيل</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">الدائرة الترابية</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">المسطرة القضائية</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">تاريخ الإيداع</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-right whitespace-nowrap">حالة الملف</th>
                      <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-center whitespace-nowrap">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotifications.map((notification: any) => {
                      const status = getStatusConfig(notification.status);
                      return (
                        <tr key={notification.id} className="group hover:translate-y-[-4px] transition-all duration-300">
                          <td className="px-4 py-6 first:rounded-r-[2rem] border-y border-r border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                            <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-red-950 bg-red-50 px-3 py-2 rounded-xl border border-red-100 flex items-center justify-center shadow-inner group-hover:bg-white transition-colors">
                                 {notification.request_number}
                               </span>
                               <span className="text-[8px] font-black text-slate-300 mr-2 uppercase tracking-[0.1em]">Sovereign ID</span>
                            </div>
                          </td>
                          <td className="px-4 py-6 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xl group-hover:bg-red-950 transition-all duration-500 shadow-xl shadow-slate-900/10 rotate-3 group-hover:rotate-0 flex-shrink-0">
                                   <span className="filter drop-shadow-md">🤵</span>
                                </div>
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-950 text-base font-amiri tracking-tight group-hover:text-red-950 transition-colors">{notification.notary_name}</span>
                                   <div className="flex items-center gap-1 mt-1">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase">Active Adoul</span>
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-4 py-6 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                             <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-900 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 italic">{notification.province || 'الرباط'}</span>
                                <span className="text-[9px] text-slate-400 font-bold mt-1">📍 {notification.commune}</span>
                             </div>
                          </td>
                          <td className="px-4 py-6 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                             <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                   <span className="p-2 bg-red-950/5 rounded-xl text-md group-hover:bg-red-950 group-hover:text-white transition-all">📜</span>
                                   <span className="text-[12px] font-black text-slate-900 line-clamp-1 max-w-[140px] font-amiri">{notification.certificate_type}</span>
                                </div>
                                {notification.request_number && (
                                  <div className="flex items-center gap-1.5 mr-1">
                                    <span className="px-2 py-0.5 bg-[#E6BE8A]/10 text-red-950 text-[8px] font-black rounded-lg border border-[#E6BE8A]/30 uppercase">
                                      {getLegalClassification(notification.request_number).label}
                                    </span>
                                  </div>
                                )}
                             </div>
                          </td>
                          <td className="px-4 py-6 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                             <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-slate-950 font-sans tracking-tight">{new Date(notification.created_at).toLocaleDateString('ar-MA')}</span>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">Submission</span>
                             </div>
                          </td>
                          <td className="px-4 py-6 border-y border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                            <div className="flex flex-col items-center gap-2">
                               <span className={`px-4 py-2.5 rounded-2xl text-[9px] font-black border-2 transition-all inline-flex items-center gap-2 shadow-sm ${status.color.replace('border-', 'border-').replace('text-', 'text-')}`}>
                                 <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                 {status.label}
                               </span>
                            </div>
                          </td>
                          <td className="px-4 py-6 last:rounded-l-[2rem] border-y border-l border-slate-100 bg-white shadow-sm group-hover:shadow-2xl group-hover:border-red-950/20 transition-all group-hover:bg-slate-50/50">
                            <div className="flex gap-3 justify-center">
                              <button 
                                onClick={() => { setSelectedNotification(notification); setShowDetailModal(true); }}
                                className="w-12 h-12 bg-slate-100 text-slate-950 rounded-2xl border border-slate-200 hover:bg-black hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-95 group/btn"
                                title="فحص الأوراق"
                              >
                                <span className="text-xl group-hover/btn:rotate-12 transition-transform">👁️</span>
                              </button>
                              <button 
                                onClick={() => { setSelectedNotification(notification); setShowDecisionModal(true); }}
                                className="px-6 py-3.5 bg-red-950 text-[#E6BE8A] text-[10px] font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-950/20 flex items-center gap-2 active:scale-95 translate-y-0 hover:translate-y-[-2px]"
                              >
                                <span className="text-lg">⚖️</span> 
                                <span className="uppercase tracking-widest">قرار</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10">
                {filteredNotifications.map((notification: any) => {
                  const status = getStatusConfig(notification.status);
                  const classification = getLegalClassification(notification.request_number);
                  return (
                    <div key={notification.id} className="bg-white rounded-[4rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-red-950/20 hover:translate-y-[-10px] transition-all duration-700 group relative flex flex-col">
                      {/* Premium Accent & Header Info */}
                      <div className="h-2 w-full bg-gradient-to-r from-red-950 via-slate-900 to-[#E6BE8A]"></div>
                      <div className="absolute top-4 left-10 opacity-10 group-hover:opacity-100 transition-opacity">
                         <span className="text-[40px] font-black text-slate-100 font-sans">0{notification.id?.slice(-1) || '1'}</span>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-12 space-y-10 flex-grow relative z-10">
                        <div className="flex items-start justify-between">
                           <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[10px] font-black text-red-950 bg-red-50 px-4 py-2 rounded-2xl border border-red-100 shadow-sm flex items-center gap-2">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-950"></span>
                                   {notification.request_number}
                                </span>
                                <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border leading-none shadow-sm flex items-center gap-2 ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                              <h3 className="text-3xl font-black text-slate-950 font-amiri tracking-tight group-hover:text-red-950 transition-colors leading-tight underline decoration-slate-100 decoration-4 underline-offset-8">
                                {notification.notary_name}
                              </h3>
                           </div>
                           <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 flex items-center justify-center text-4xl group-hover:bg-red-950 group-hover:rotate-6 transition-all duration-700 shadow-2xl shadow-slate-950/20">
                              <span className="filter drop-shadow-md">🤵</span>
                           </div>
                        </div>

                        {/* Legal Classification Strip */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:bg-red-50 transition-colors">
                           <div className="flex items-center gap-3">
                              <span className="text-xl">⚖️</span>
                              <div>
                                 <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{classification.label}</p>
                                 <p className="text-[9px] text-slate-400 font-bold">{classification.article}</p>
                              </div>
                           </div>
                           <div className="w-2 h-2 rounded-full bg-red-950 shadow-[0_0_10px_rgba(69,10,10,0.5)]"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all group-hover:shadow-xl group-hover:border-red-950/10">
                              <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest italic flex items-center gap-2">
                                <span className="w-3 h-[1px] bg-slate-200"></span>
                                عمالة / إقليم
                              </p>
                              <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 font-amiri">{notification.province || 'غير مصنف'}</p>
                                <p className="text-[10px] text-slate-400 font-bold italic">{notification.commune}</p>
                              </div>
                           </div>
                           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all group-hover:shadow-xl group-hover:border-red-950/10">
                              <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest italic flex items-center gap-2">
                                <span className="w-3 h-[1px] bg-slate-200"></span>
                                تاريخ الإيداع
                              </p>
                              <div className="space-y-1 text-left">
                                <p className="text-sm font-black text-slate-900 font-sans">
                                   {new Date(notification.created_at).toLocaleDateString('ar-MA')}
                                </p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Sovereign Portal 2026</p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                <span className="w-6 h-[1px] bg-slate-200"></span>
                                تفاصيل المسطرة القضائية
                              </p>
                              <div className="flex items-center gap-4 text-slate-900 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group-hover:bg-white transition-all shadow-inner group-hover:shadow-none">
                                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-700">📜</span>
                                <span className="text-[13px] font-black line-clamp-2 leading-relaxed font-amiri">{notification.certificate_type}</span>
                              </div>
                           </div>
                        </div>

                        {/* Card Actions Overlay or inline */}
                        <div className="flex gap-4 pt-10 border-t border-slate-50 mt-auto">
                           <button 
                            onClick={() => { setSelectedNotification(notification); setShowDetailModal(true); }}
                            className="flex-1 py-5 bg-slate-100 text-slate-950 rounded-2xl hover:bg-black hover:text-white transition-all text-xs font-black active:scale-95 shadow-sm border border-slate-200/50 flex items-center justify-center gap-2 group/btn"
                           >
                             <span className="text-lg group-hover/btn:scale-110 transition-transform">📂</span>
                             <span>فحص الملف</span>
                           </button>
                           <button 
                            onClick={() => { setSelectedNotification(notification); setShowDecisionModal(true); }}
                            className="flex-1 py-5 bg-red-950 text-[#E6BE8A] rounded-2xl hover:bg-black transition-all text-xs font-black shadow-2xl shadow-red-950/30 active:scale-95 flex items-center justify-center gap-2"
                           >
                             <span className="text-lg">⚖️</span>
                             <span>البت النهائي</span>
                           </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
               <h3 className="text-2xl font-black text-slate-900 font-amiri">لا توجد سجلات حالياً</h3>
               <p className="text-slate-400 font-bold mt-2">لم يتم العثور على أي ملفات تطابق معايير البحث المحددة</p>
               <button 
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:scale-105 transition-transform"
               >
                 إعادة تعيين القائمة ↺
               </button>
            </div>
          )}

          {/* Enhanced Pagination Modernized */}
          {filteredNotifications && filteredNotifications.length > 0 && (
            <div className="flex items-center justify-between bg-white rounded-[2rem] p-6 shadow-2xl shadow-slate-200/50 border border-slate-100 mt-12 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-full bg-red-950/2 tracking-tighter -skew-x-12 translate-x-10 group-hover:bg-red-950/5 transition-all"></div>
               <div className="flex gap-4 relative z-10">
                  <button 
                    onClick={() => setNotificationPage(Math.max(0, notificationPage - 1))}
                    disabled={notificationPage === 0}
                    className="px-8 py-4 rounded-2xl bg-slate-50 text-slate-900 font-black text-xs disabled:opacity-20 hover:bg-slate-100 transition-all shadow-sm border border-slate-100 active:scale-95"
                  >
                    ← الصفـحة السابقة
                  </button>
                  <button 
                    onClick={() => setNotificationPage(notificationPage + 1)}
                    disabled={!filteredNotifications || filteredNotifications.length < 12}
                    className="px-8 py-4 rounded-2xl bg-slate-950 text-[#E6BE8A] font-black text-xs disabled:opacity-20 hover:bg-black hover:shadow-xl transition-all shadow-lg active:scale-95"
                  >
                    الصفحة التالية →
                  </button>
               </div>
               <div className="px-8 flex flex-col items-end relative z-10">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-1">Navigation System</span>
                  <div className="flex items-center gap-3">
                     <span className="text-sm font-black text-slate-900">سجل رقم {notificationPage + 1}</span>
                     <div className="w-2 h-2 rounded-full bg-red-950 animate-pulse"></div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Section - Monthly Statistics */}
      {activeSection === 'requests' && (
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12">
          <div className="flex items-center justify-between mb-12 pb-8 border-b border-slate-50">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-amber-500/20 text-white">📈</div>
                <div>
                   <h3 className="text-3xl font-black text-slate-900 font-amiri tracking-tight">تتبع وتيرة الطلبات الشهرية</h3>
                   <p className="text-slate-400 text-[11px] font-bold mt-1 uppercase tracking-wider">تحليل النشاط المهني لعام 2026</p>
                </div>
             </div>
          </div>

          {monthlyLoading ? (
            <div className="text-center text-slate-500 py-24 flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-slate-400">جاري استرجاع البيانات التاريخية من السحابة السيادية...</p>
            </div>
          ) : monthlyStats && monthlyStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monthlyStats.map((stat: any, idx: number) => {
                const total = stat.total || 0;
                const percentage = Math.min((total / 50) * 100, 100);
                
                return (
                  <div key={idx} className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 group hover:bg-white hover:shadow-2xl transition-all duration-500">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 flex items-center justify-center bg-slate-950 text-[#E6BE8A] rounded-xl shadow-lg font-black text-xs italic">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-black text-slate-900 text-lg">{stat.month}</span>
                      </div>
                      <div className="text-left">
                        <span className={`text-2xl font-black ${total > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {total} <span className="text-[10px] uppercase tracking-tighter text-slate-400">ملف</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-full bg-slate-200/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${total > 0 ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-200'}`}
                          style={{ width: `${total > 0 ? Math.max(percentage, 2) : 0}%` }}
                        ></div>
                      </div>
                      
                      {total > 0 && (
                        <div className="flex gap-3 text-[9px] font-black uppercase">
                          <span className="flex-1 bg-emerald-50 text-emerald-700 py-2 px-3 rounded-lg border border-emerald-100 text-center">✅ {stat.approved}</span>
                          <span className="flex-1 bg-rose-50 text-rose-700 py-2 px-3 rounded-lg border border-rose-100 text-center">❌ {stat.rejected}</span>
                          <span className="flex-1 bg-cyan-50 text-cyan-700 py-2 px-3 rounded-lg border border-cyan-100 text-center">⏳ {stat.postponed}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
              <span className="text-6xl block mb-6 italic text-slate-200">No Data Available</span>
              <p className="text-slate-400 font-black text-xl">لا توجد بيانات مسجلة لهذا العام في الأرشيف الرقمي</p>
            </div>
          )}
        </div>
      )}

      {/* Reports Section - Real Statistics */}
      {/* Reports Section - Sovereign Statistics */}
      {activeSection === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Status Distribution */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12">
            <h3 className="text-2xl font-black text-slate-950 mb-10 flex items-center gap-4">
              <span className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/20">📊</span>
              توزيع الطلبات حسب الحالة المهنية
            </h3>
            {statsLoading ? (
              <div className="text-center text-slate-500 py-12 font-bold flex flex-col items-center gap-6">
                 <div className="w-10 h-10 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                 جاري تحليل البيانات الإحصائية السيادية...
              </div>
            ) : dashboardStats ? (
              <div className="space-y-8">
                {[
                  { label: 'الطلبات الواردة', value: dashboardStats.totalIncoming, color: 'bg-slate-900', icon: '📥' },
                  { label: 'طلبات تمت الموافق عليها', value: dashboardStats.totalApproved, color: 'bg-emerald-600', icon: '✅' },
                  { label: 'طلبات تم رفضها', value: dashboardStats.totalRejected, color: 'bg-rose-600', icon: '❌' },
                  { label: 'طلبات قيد الدراسة والمراجعة', value: (dashboardStats as any)?.totalUnderReview || 0, color: 'bg-amber-500', icon: '🔍' },
                  { label: 'طلبات مؤرشفة/محفوظة', value: (dashboardStats as any)?.totalArchived || 0, color: 'bg-slate-400', icon: '📁' },
                ].map((item, idx) => {
                  const percentage = dashboardStats.totalIncoming > 0 ? (item.value / dashboardStats.totalIncoming) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-3 font-black text-slate-700 text-sm">{item.icon} {item.label}</span>
                        <span className="text-slate-950 font-black bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{item.value} <span className="text-[10px] text-slate-400">({Math.round(percentage)}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-50 rounded-full h-4 overflow-hidden border border-slate-100 p-0.5">
                        <div 
                          className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out shadow-sm`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-20 font-bold border-2 border-dashed border-slate-100 rounded-[2rem]">
                لا توجد تقارير إحصائية للفترة المحاسبية الحالية
              </div>
            )}
          </div>

          {/* Geographical Statistics */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12">
            <h3 className="text-2xl font-black text-slate-950 mb-10 flex items-center gap-4">
              <span className="p-4 bg-red-950 rounded-2xl text-[#E6BE8A] shadow-xl shadow-red-950/20">📍</span>
              التوزيع الجغرافي للطلبات
            </h3>
            <div className="space-y-8">
              <p className="text-xs font-black text-slate-400 text-center py-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 italic">
                 كفاءة الإخراج حسب المناطق القضائية التابعة للمجلس الجهوي
              </p>
              
              {provinces.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {provinces.map((prov, i) => (
                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-slate-950/20 transition-all group cursor-default hover:shadow-xl hover:translate-y-[-4px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">إقليم / عمالة</span>
                        <span className="text-[10px] font-black text-slate-950 p-1.5 bg-slate-50 rounded-lg group-hover:bg-slate-950 group-hover:text-white transition-colors">2026</span>
                      </div>
                      <p className="font-black text-slate-800 text-lg font-amiri group-hover:text-red-950">{prov}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-300 font-black italic">
                   No geographical maps found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Detail Modal Redesign */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300" dir="rtl">
           <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-900/40 flex flex-col animate-in zoom-in-95 duration-500">
             <div className="bg-slate-900 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-full bg-red-950 skew-x-[-20deg] translate-x-32"></div>
                <div className="relative z-10 flex items-center justify-between">
                   <div className="space-y-4 text-right">
                      <div className="flex items-center gap-4 justify-end">
                        <span className="text-white/40 font-black text-xs tracking-widest">{selectedNotification.request_number}</span>
                        <span className="bg-[#E6BE8A] text-slate-900 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg font-sans">FILE REVIEW</span>
                      </div>
                      <h2 className="text-4xl font-black font-amiri tracking-tight">تفاصيل الملف القانوني</h2>
                      <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
                         مراجعة شاملة لبيانات الطلب المقدم من طرف السيد(ة): <span className="text-white font-black underline decoration-[#E6BE8A] underline-offset-4">{selectedNotification.notary_name}</span>
                      </p>
                   </div>
                   <button 
                    onClick={() => setShowDetailModal(false)}
                    className="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-2xl transition-all hover:rotate-90"
                   >
                     ✕
                   </button>
                 </div>
              </div>

              {/* Sub-header Navigation Tabs */}
              <div className="bg-slate-100/80 px-10 py-3 border-b border-slate-200/80 flex items-center justify-between no-print" dir="rtl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailTab('overview')}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                      detailTab === 'overview'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                    }`}
                  >
                    <span>📋</span>
                    <span>بيانات وملخص الملف</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('written_request')}
                    className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                      detailTab === 'written_request'
                        ? 'bg-red-950 text-[#E6BE8A] shadow-md ring-2 ring-[#E6BE8A]/30'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                    }`}
                  >
                    <span>📜</span>
                    <span>الطلب الخطي من طرف العدل (الوثيقة الرسمية)</span>
                  </button>
                </div>
                {detailTab === 'written_request' && (
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-black hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <span>🖨️</span>
                    <span>طباعة الطلب</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-50/30 overflow-x-hidden" dir="rtl">
                {detailTab === 'written_request' ? (
                  <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-900 flex items-center justify-between no-print">
                      <div className="flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>هذه هي الوثيقة الرسمية للطلب الخطي الموجه من طرف السيد(ة) العدل عبر المنصة الرقمية.</span>
                      </div>
                      <span className="font-mono bg-amber-100/80 px-2.5 py-1 rounded-lg text-[10px]">{selectedNotification.request_number}</span>
                    </div>
                    <OfficeMovementDocumentView notification={selectedNotification} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="space-y-10">
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                           <h3 className="text-lg font-black text-slate-900 mb-8 border-r-4 border-slate-900 pr-4">الهوية والبيانات المهنية</h3>
                           <div className="grid grid-cols-1 gap-6">
                              <DetailRow label="الاسم الكامل للعدل" value={selectedNotification.notary_name} icon="🤵" />
                              <DetailRow label="رقم الهاتف" value={selectedNotification.notary_phone} icon="📞" />
                              <DetailRow label="المحكمة الابتدائية" value={selectedNotification.jurisdiction} icon="🏛️" />
                              <DetailRow label="محكمة الاستئناف" value={selectedNotification.appellate_court} icon="⚖️" />
                           </div>
                        </section>

                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                           <h3 className="text-lg font-black text-slate-900 mb-8 border-r-4 border-amber-500 pr-4">تفاصيل العملية / الموضوع</h3>
                           <div className="grid grid-cols-1 gap-6">
                              <DetailRow label="طبيعة الطلب" value={selectedNotification.certificate_type} icon="📄" />
                              <DetailRow 
                                label="التصنيف القانوني" 
                                value={getLegalClassification(selectedNotification.request_number).label} 
                                icon="⚖️" 
                                subtitle={`${getLegalClassification(selectedNotification.request_number).article} - ${getLegalClassification(selectedNotification.request_number).desc}`}
                              />
                              <DetailRow label="تاريخ الإرسال" value={new Date(selectedNotification.created_at).toLocaleString('ar-MA')} icon="📅" />
                              <DetailRow label="الطرف / الأطراف" value={selectedNotification.involved_names} icon="👥" />
                           </div>
                        </section>
                     </div>

                     <div className="space-y-10">
                        <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                           <h3 className="text-lg font-black text-slate-900 mb-8 border-r-4 border-emerald-500 pr-4">الموقع الجغرافي والإدارة</h3>
                           <div className="grid grid-cols-1 gap-6">
                              <DetailRow label="الإقليم / العمالة" value={selectedNotification.province} icon="📍" />
                              <DetailRow label="الجماعة الترابية" value={selectedNotification.commune} icon="🏢" />
                              <DetailRow label="الحالة الحالية" value={selectedNotification.status} icon="🏷️" highlight />
                           </div>
                        </section>

                        {selectedNotification.notes && (
                           <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3 justify-end">
                                 <span>ملاحظات إضافية</span>
                                 <span>📝</span>
                              </h3>
                              <div className="bg-slate-50 p-6 rounded-2xl text-sm font-bold text-slate-600 leading-loose border border-slate-100 text-right">
                                 {cleanDisplayNotes(selectedNotification.notes)}
                              </div>
                           </section>
                        )}

                        {/* Quantum Workflow Tracker - Sovereign Mapping */}
                        <section className="bg-white p-10 rounded-[3rem] shadow-xl border border-[#E6BE8A]/20 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-red-950 to-orange-950 opacity-10 group-hover:opacity-100 transition-opacity"></div>
                           <h3 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-4 justify-end">
                              <span>مسار معالجة الطلب (Mapping)</span>
                              <span className="p-2 bg-slate-100 rounded-xl text-lg">🛰️</span>
                           </h3>
                           
                           <div className="relative pr-8 space-y-12">
                              {/* Connector Line */}
                              <div className="absolute right-3.5 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              
                              {[
                                { 
                                  label: 'إيداع الطلب الرقمي', 
                                  time: new Date(selectedNotification.created_at).toLocaleString('ar-MA'), 
                                  completed: true,
                                  icon: '📥' 
                                },
                                { 
                                  label: 'دخول مرحلة الفحص والتدقيق', 
                                  time: selectedNotification.status !== 'مسجل' ? 'مكتمل' : 'قيد الانتظار', 
                                  completed: selectedNotification.status !== 'مسجل',
                                  icon: '🔍' 
                                },
                                { 
                                  label: 'صياغة القرار النهائي', 
                                  time: (selectedNotification.status === 'موافق_عليه' || selectedNotification.status === 'مرفوض') ? 'مكتمل' : 'في الانتظار', 
                                  completed: (selectedNotification.status === 'موافق_عليه' || selectedNotification.status === 'مرفوض'),
                                  icon: '⚖️' 
                                }
                              ].map((step, idx) => (
                                <div key={idx} className="relative flex items-center justify-end gap-6 group/step">
                                   <div className="text-right">
                                      <p className={`text-sm font-black transition-colors ${step.completed ? 'text-slate-950' : 'text-slate-400'}`}>{step.label}</p>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{step.time}</p>
                                   </div>
                                   <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs z-10 shadow-lg transition-transform group-hover/step:scale-110 ${step.completed ? 'bg-red-950 text-white' : 'bg-white border border-slate-100 text-slate-200'}`}>
                                      {step.completed ? '✓' : step.icon}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </section>
                     </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 md:p-8 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4 shadow-[0_-10px_30_rgba(0,0,0,0.02)] no-print">
                 <div className="flex items-center gap-3">
                   {detailTab === 'overview' ? (
                     <button
                       onClick={() => setDetailTab('written_request')}
                       className="px-6 py-3.5 bg-red-950/10 hover:bg-red-950/20 text-red-950 rounded-2xl font-black text-xs border border-red-950/20 transition-all flex items-center gap-2"
                     >
                       <span>📜</span>
                       <span>عرض الطلب الخطي للعدل</span>
                     </button>
                   ) : (
                     <button
                       onClick={() => setDetailTab('overview')}
                       className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all flex items-center gap-2"
                     >
                       <span>📋</span>
                       <span>العودة لبيانات الملف</span>
                     </button>
                   )}
                 </div>

                 <div className="flex items-center gap-4">
                   <button 
                     onClick={() => setShowDetailModal(false)}
                     className="px-8 py-3.5 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-100 transition-colors"
                   >
                     إغلاق
                   </button>
                   <button 
                     onClick={() => { setShowDetailModal(false); setShowDecisionModal(true); }}
                     className="px-8 py-3.5 bg-slate-900 text-[#E6BE8A] rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-transform"
                   >
                     التحول نحو اتخاذ القرار ⚖️
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Decision Modal - Premium Modernized */}
      {showDecisionModal && selectedNotification && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300" dir="rtl">
           <div className="bg-white w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 border border-white/20">
              <div className="bg-gradient-to-r from-red-950 to-orange-950 p-10 text-white flex justify-between items-center group">
                 <div className="space-y-1 text-right">
                    <h2 className="text-3xl font-black font-amiri">توقيع القرار النهائي</h2>
                    <p className="text-orange-200/60 font-black text-[10px] uppercase tracking-widest font-sans">Judicial Decision Authentication</p>
                 </div>
                 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">⚖️</div>
              </div>

              <div className="p-12 space-y-8 bg-slate-50/30">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'موافقة', label: 'الموافقة والإصدار', icon: '✅', color: 'bg-emerald-500' },
                      { id: 'رفض', label: 'الرفض والتعليل', icon: '❌', color: 'bg-rose-500' },
                      { id: 'تأجيل', label: 'التأجيل للاستكمال', icon: '🕒', color: 'bg-amber-500' },
                      { id: 'قيد_الدراسة', label: 'إبقاء قيد الدراسة', icon: '🔍', color: 'bg-slate-600' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDecisionType(opt.id as any)}
                        className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between group h-24 ${
                          decisionType === opt.id 
                          ? 'bg-white border-slate-900 shadow-xl ring-4 ring-slate-900/5' 
                          : 'bg-white/50 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                         <div className="flex items-center gap-4 text-right">
                            <span className={`w-12 h-12 ${decisionType === opt.id ? opt.color : 'bg-slate-100'} rounded-2xl flex items-center justify-center text-xl transition-colors`}>{opt.icon}</span>
                            <span className={`font-black text-sm ${decisionType === opt.id ? 'text-slate-900' : 'text-slate-400'}`}>{opt.label}</span>
                         </div>
                         {decisionType === opt.id && <div className="w-4 h-4 rounded-full bg-slate-900 animate-pulse"></div>}
                      </button>
                    ))}
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 italic block text-right">التعليل القانوني (اختياري)</label>
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="أدخل تعليل القرار هنا..."
                      className="w-full bg-white border-2 border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold text-slate-800 focus:border-slate-900 outline-none h-40 transition-all shadow-sm text-right"
                    />
                 </div>
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                 <button 
                  onClick={() => setShowDecisionModal(false)}
                  className="px-10 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors"
                 >
                   إلغاء العملية
                 </button>
                 <button 
                  onClick={() => {
                     recordDecisionMutation.mutate({
                       notificationId: selectedNotification.id,
                       decisionType: decisionType,
                       reasoning: decisionReason,
                       internalNotes: internalNotes,
                       authorityName: user?.full_name ? `${user.full_name} (المجلس الجهوي للعدول)` : 'المجلس الجهوي للعدول',
                       authorityType: 'regional_council',
                     });
                   }}
                  disabled={recordDecisionMutation.isPending}
                  className="px-14 py-5 bg-slate-950 text-[#E6BE8A] rounded-[1.5rem] font-black text-xs shadow-2xl shadow-slate-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                 >
                   {recordDecisionMutation.isPending ? 'جاري الحفظ...' : 'تثبيت القرار في النظام ✍️'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Response Preview Modal */}
      {showResponsePreview && selectedNotification && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 lg:p-10 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-[210mm] w-full my-8 relative overflow-hidden flex flex-col border border-white/20">
            {/* Action Bar - Non-Printable */}
            <div className="bg-slate-900 p-8 flex justify-between items-center no-print border-b border-[#E6BE8A]/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E6BE8A]/10 flex items-center justify-center text-2xl border border-[#E6BE8A]/20">
                  🏛️
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">الرد السيادي الرسمي</h2>
                  <p className="text-[10px] text-[#E6BE8A] font-bold uppercase tracking-widest">Sovereign Official Response Preview</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs transition-all flex items-center gap-3 border border-white/10"
                >
                  <span className="text-lg">🖨️</span> طباعة النسخة الرسمية
                </button>
                <button
                  onClick={() => setShowResponsePreview(false)}
                  className="px-8 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black text-xs transition-all border border-red-500/20"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* A4 Letterhead Structure */}
            <div className="p-16 bg-white printable-area flex-grow font-serif">
              {/* Grand Header - Moroccan Ministry of Justice Style */}
              <div className="flex justify-between items-start mb-16 relative">
                 {/* Right Side: Identity */}
                 <div className="w-1/3 text-center space-y-1">
                    <p className="font-bold text-xl text-slate-900">المملكة المغربية</p>
                    <p className="font-bold text-lg text-slate-800">وزارة العدل</p>
                    <div className="mx-auto w-12 h-0.5 bg-[#E6BE8A] my-2"></div>
                    <p className="font-bold text-md text-slate-700">المجلس الجهوي لعدول</p>
                    <p className="font-black text-lg text-blue-900">{cleanCourtName(selectedNotification.appellate_court || selectedNotification.jurisdiction)}</p>
                 </div>

                 {/* Center: Kingdom Seal */}
                 <div className="w-1/3 flex flex-col items-center">
                    <img src="/logos/morocco-coat.jpg" alt="Kingdom Seal" className="w-40 h-40 object-contain" />
                    <div className="mt-4 border-2 border-slate-900 p-1 rounded-sm">
                      <div className="border border-slate-900 px-3 py-1 text-[8px] font-black uppercase tracking-tighter text-slate-900">
                        Official Judicial Document
                      </div>
                    </div>
                 </div>

                 {/* Left Side: Reference & Date */}
                 <div className="w-1/3 text-right space-y-3 pt-2">
                    <div className="flex flex-col items-end border-r-4 border-[#E6BE8A] pr-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase">المكان والزمان</span>
                       <p className="font-bold text-slate-900">حرر بـ: {cleanCourtName(selectedNotification.writing_place || selectedNotification.jurisdiction)}</p>
                       <p className="font-bold text-slate-900">بتاريخ: {selectedNotification.decided_at ? new Date(selectedNotification.decided_at).toLocaleDateString('ar-MA') : new Date().toLocaleDateString('ar-MA')}</p>
                    </div>
                    <div className="flex flex-col items-end border-r-4 border-slate-200 pr-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase">الرقم المرجعي</span>
                       <p className="font-black text-slate-900">{selectedNotification.request_number}</p>
                    </div>
                 </div>
              </div>

              {/* Subject Banner */}
              <div className="text-center mb-16 relative">
                <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t-2 border-slate-100"></div>
                </div>
                <div className="relative bg-white px-10 inline-block">
                  <h1 className="text-4xl font-black text-slate-900 font-amiri tracking-tight">
                    {decisionType === 'موافقة' ? 'إشعار بالموافقة' : `إشعار ${decisionType === 'رفض' ? 'بالرفض' : 'بتأجيل'} الموعد`}
                  </h1>
                </div>
              </div>

              {/* Metadata Summary using layout for key info */}
              <div className="grid grid-cols-2 gap-6 mb-12 no-print">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase italic">المرسل إليه</span>
                    <p className="text-lg font-black text-slate-900">السيد العدل: {selectedNotification.notary_name}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">قرار التعيين: {selectedNotification.appointment_decree_number || '........'}</p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase italic">موضوع الإشعار</span>
                    <p className="text-lg font-black text-slate-900">{getDocSubject(selectedNotification)}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">تاريخ الإشعار: {new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</p>
                 </div>
              </div>

              {/* Official Content Body */}
              <div className="text-right leading-[2.8] text-xl font-amiri space-y-8 text-slate-800 px-4">
                <p className="text-center font-black text-3xl text-slate-900 my-10 drop-shadow-sm">سلام تام بوجود مولانا الإمام،</p>
                
                <p className="font-bold">وبعد،</p>

                {decisionType === 'موافقة' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <p>
                      بناءً على الإشعار المقدم من طرفكم والمؤرخ في <span className="font-black border-b border-slate-400">{new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</span> والمتعلق برغبتكم في التوجه بتاريخ <span className="font-black border-b border-slate-400">{selectedNotification.reception_date || '........'}</span> على الساعة <span className="font-black border-b border-slate-400">{selectedNotification.reception_time || '........'}</span> إلى العنوان: <span className="font-black border-b border-slate-400">{selectedNotification.reception_place || '........'}</span> لتلقي إشهاد نوع: <span className="font-black border-b border-slate-400">{selectedNotification.certificate_type || '........'}</span> لفائدة الطرف: <span className="font-black border-b border-slate-400">{selectedNotification.involved_names || '........'}</span>.
                    </p>
                    
                    <p>
                      يشرف المجلس الجهوي أن ينهي إلى كريم علمكم أنه، وبعد الدراسة المستفيضة لمضمون إشعاركم، تقرر ما يلي:
                    </p>
                    
                    <div className="p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-200 relative overflow-hidden group hover:border-[#E6BE8A] transition-colors duration-500">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E6BE8A]/5 rounded-full -mr-16 -mt-16"></div>
                      <p className="font-black text-3xl text-slate-950 relative z-10">
                        يعلن المجلس عن عدم ممانعته في تنفيذ الإجراءات المذكورة أعلاه، مع التأكيد على ضرورة الالتزام التام بالضوابط القانونية والمهنية المنصوص عليها في القانون 03-16 المتعلق بخطة العدالة.
                      </p>
                    </div>
                  </div>
                )}

                {decisionType === 'رفض' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <p>
                      بالإشارة إلى مراسلتكم المؤرخة في <span className="font-black border-b border-slate-400">{new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</span> بشأن الانتقال لتلقي إشهاد مهني...
                    </p>
                    <p>
                      يؤسف المجلس الجهوي إبلاغكم أنه تعذر قبول طلبكم نظراً للمسوغات القانونية التالية:
                    </p>
                    <div className="p-10 bg-red-50 rounded-[2.5rem] border-2 border-red-100 relative overflow-hidden">
                      <p className="font-black text-2xl text-red-900">
                        مضمون الإشعار لا يستوفي المعايير المهنية والشروط التنظيمية الواجبة، وعليه تقرر صرف النظر عن هذا الإشعار.
                      </p>
                      {decisionReason && (
                        <div className="mt-6 pt-6 border-t border-red-200">
                          <p className="text-sm font-black text-red-800 mb-2 uppercase tracking-widest">تعليل إضافي سيادي:</p>
                          <p className="text-lg italic font-bold text-red-700">{decisionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {decisionType === 'تأجيل' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <p>
                      بخصوص إشعاركم الوارد إلينا بتاريخ <span className="font-black border-b border-slate-400">{new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</span>...
                    </p>
                    <div className="p-10 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100 relative overflow-hidden text-blue-900 font-bold">
                       تقرر تأجيل البت في هذا الإشعار إلى حين استكمال المعطيات المطلوبة أو استيفاء الشروط المهنية الجاري بها العمل.
                       {decisionReason && (
                        <div className="mt-6 pt-6 border-t border-blue-200">
                          <p className="text-sm font-black text-blue-800 mb-2">تعليمات التأجيل:</p>
                          <p className="text-lg italic">{decisionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-center font-bold text-slate-600 mt-12">والسلام.</p>
                
                {/* Signature Section */}
                <div className="mt-20 flex justify-between items-end">
                  <div className="w-1/2 text-center">
                    <div className="w-48 h-48 border-2 border-dashed border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      خاتم المجلس
                    </div>
                  </div>
                  <div className="w-1/2 text-right space-y-2">
                    <p className="font-black text-xl text-slate-900 underline decoration-[#E6BE8A] decoration-4 underline-offset-8">رئيس المجلس الجهوي للعدول</p>
                    <p className="font-bold text-slate-600">بجهة: {cleanCourtName(selectedNotification.appellate_court)}</p>
                    <p className="font-black text-slate-400 text-sm mt-10">إمضاء إلكتروني مؤمن رقم: #AD-2026-{(selectedNotification.id || '0').toString().slice(-4)}</p>
                  </div>
                </div>
              </div>

              {/* Fine Print Footer */}
              <div className="mt-32 pt-8 border-t border-slate-100 text-center space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sovereign Judicial Portal • Electronic Certification Service</p>
                <p className="text-xs font-bold text-slate-300">تم استخراج هذه الوثيقة آلياً من النظام الموحد للمجالس الجهوية بالمغرب</p>
              </div>
            </div>

            {/* Final Footer Actions - Non-Printable */}
            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-6 no-print">
              <button 
                onClick={() => setShowResponsePreview(false)}
                className="px-10 py-5 bg-white text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
              >
                تحديث البيانات / تعديل
              </button>
              <button
                onClick={() => {
                  recordDecisionMutation.mutate({
                    notificationId: selectedNotification.id,
                    decisionType: decisionType,
                    reasoning: decisionReason,
                    internalNotes: internalNotes,
                    authorityName: user?.full_name ? `${user.full_name} (المجلس الجهوي للعدول)` : 'المجلس الجهوي للعدول',
                    authorityType: 'regional_council',
                  });
                  setShowResponsePreview(false);
                }}
                disabled={recordDecisionMutation.isPending}
                className="px-16 py-5 bg-slate-950 text-[#E6BE8A] rounded-2xl font-black text-xs shadow-2xl shadow-slate-950/40 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
              >
                {recordDecisionMutation.isPending ? 'جاري الإرسال السيادي...' : (
                  <>
                    <span>اعتماد وإرسال القرار النهائي</span>
                    <span className="text-lg">⚖️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📘 Legislative Guide Modal (Premium Gold/Charcoal Design) */}
      {showLegislativeGuide && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500" dir="rtl">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col border border-white/10 animate-in zoom-in-95 duration-700">
            <div className="bg-red-950 p-12 text-white relative overflow-hidden">
               {/* Decorative background patterns */}
               <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 border-[30px] border-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-200 rotate-45 -translate-x-1/2 translate-y-1/2"></div>
               </div>
               
               <div className="relative z-10 flex items-center justify-between">
                  <div className="text-right">
                    <div className="flex items-center gap-3 justify-end mb-4">
                      <span className="h-1 w-12 bg-amber-400 rounded-full"></span>
                      <span className="text-amber-200 text-xs font-black uppercase tracking-[0.3em]">Institutional Guide</span>
                    </div>
                    <h2 className="text-5xl font-black font-amiri tracking-tight mb-2">الدليل التشريعي لتصنيف الطلبات</h2>
                    <p className="text-slate-300 font-bold max-w-xl">
                      وفقاً لمقتضيات المواد 174 و 184 من القانون رقم 16.03 المتعلق بخطة العدالة
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowLegislativeGuide(false)}
                    className="w-20 h-20 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-3xl transition-all hover:rotate-90 text-amber-200 shadow-2xl"
                  >
                    ✕
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                  {[
                    {
                      id: '01',
                      title: 'الطلبات الإدارية',
                      category: 'Administrative',
                      law: 'المادة 184',
                      desc: 'تتضمن الطلبات التي لا تتضمن تقديراً مهنياً ولا تأديباً، وتدخل في صميم التسيير الإداري لعلاقة العدل بالهيئة والمحاكم.',
                      icon: '📁',
                      border: 'border-blue-500/20'
                    },
                    {
                      id: '02',
                      title: 'الطلبات التنظيمية',
                      category: 'Regulatory',
                      law: 'المواد 174/184',
                      desc: 'تتعلق بإعداد تقارير المجلس الدوري، مقترحات النظام الداخلي، وتنظيم العمل داخل المجالس الجهوية.',
                      icon: '📜',
                      border: 'border-amber-500/20'
                    },
                    {
                      id: '03',
                      title: 'طلبات ذات طابع مهني',
                      category: 'Professional',
                      law: 'المادة 174',
                      desc: 'تتعلق مباشرة بالسلوك المهني، الانضباط، والمهام المنصوص عليها في المادة 174 والحرص على تطبيق آليات المهنة.',
                      icon: '⚖️',
                      border: 'border-red-950/20'
                    },
                    {
                      id: '04',
                      title: 'الطلبات الانتخابية',
                      category: 'Electoral',
                      law: 'قانون الهيئة',
                      desc: 'تتعلق بانتخابات أجهزة الهيئة الوطنية للعدول والمجالس الجهوية والطعون المرتبطة بها.',
                      icon: '🗳️',
                      border: 'border-emerald-500/20'
                    }
                  ].map((guide, idx) => (
                    <div key={idx} className={`bg-white p-8 rounded-[2.5rem] shadow-sm border ${guide.border} hover:shadow-2xl transition-all duration-500 group relative overflow-hidden`}>
                        <div className="absolute top-6 left-6 text-slate-100 font-black text-6xl opacity-5 group-hover:opacity-10 transition-opacity font-sans">{guide.id}</div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-3xl">{guide.icon}</span>
                            <span className="px-5 py-1.5 bg-slate-50 text-slate-900 border border-slate-100 rounded-full text-[10px] font-black group-hover:bg-red-950 group-hover:text-white transition-colors">{guide.law}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-900 mb-2 group-hover:text-red-950 transition-colors uppercase tracking-tight">{guide.title}</h4>
                          <p className="text-slate-400 text-[10px] font-black mb-4 uppercase tracking-[0.2em]">{guide.category} CATEGORY</p>
                          <p className="text-slate-600 font-bold leading-relaxed text-sm">
                            {guide.desc}
                          </p>
                        </div>
                    </div>
                  ))}
               </div>

               <div className="mt-12 p-10 bg-red-950 rounded-[3rem] text-white overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(230,190,138,0.1),transparent)] transition-all group-hover:scale-150 duration-1000"></div>
                  <div className="relative z-10 flex items-center gap-8">
                    <div className="w-16 h-16 bg-amber-400/20 rounded-2xl flex items-center justify-center text-4xl">💡</div>
                    <div className="text-right">
                      <p className="font-black text-lg text-amber-200">ملاحظة هامة للمرسل</p>
                      <p className="font-bold text-white/70 max-w-2xl text-sm leading-relaxed mt-1">
                        يجب على العدل تحديد نوع الطلب بدقة عند كتابة موضوع الرسالة لضمان توجيهه لمصالح المعالجة المختصة بالمجلس الجهوي، مما يسرع من وثيرة الرد والبت.
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex justify-center no-print">
               <button 
                 onClick={() => setShowLegislativeGuide(false)}
                 className="px-20 py-5 bg-slate-900 text-[#E6BE8A] rounded-2xl font-black text-sm shadow-2xl hover:bg-red-950 transition-all hover:scale-[1.05]"
               >
                 فهمت، إغلاق المرجع 📘
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
);
};

const DetailRow = ({ label, value, icon, highlight, subtitle }: { label: string; value: any; icon: string; highlight?: boolean; subtitle?: string }) => (
  <div className={`p-5 rounded-[2rem] border-2 ${highlight ? 'bg-red-950 border-red-900 text-[#E6BE8A] shadow-[0_20px_50px_rgba(69,10,10,0.3)] scale-[1.02]' : 'bg-slate-50/50 border-slate-100 hover:border-red-950/20'} flex items-center justify-between transition-all duration-300 group`} dir="rtl">
     <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg transition-transform group-hover:scale-110 ${highlight ? 'bg-red-900 text-white' : 'bg-white text-slate-400 group-hover:text-red-950'}`}>
          {icon}
        </div>
        <div className="flex flex-col text-right">
          <span className={`text-[10px] font-black ${highlight ? 'text-[#E6BE8A]/60' : 'text-slate-400'} uppercase tracking-widest mb-0.5`}>{label}</span>
          <span className={`text-sm font-black ${highlight ? 'text-white' : 'text-slate-900'}`}>{value || 'غير متوفر'}</span>
          {subtitle && <span className="text-[9px] font-bold text-red-900/40 mt-1 uppercase tracking-tighter">{subtitle}</span>}
        </div>
     </div>
     {highlight && (
       <div className="w-8 h-8 rounded-full bg-[#E6BE8A]/10 flex items-center justify-center">
         <span className="text-[#E6BE8A] text-xs">⭐</span>
       </div>
     )}
  </div>
);

export default NotificationsAndStudentsHub;
