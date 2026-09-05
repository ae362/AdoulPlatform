import React, { useEffect, useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import { AdlCopyProcessingModule } from './AdlCopyProcessingModule';

export function AdlCopyPermissionsProcessingPage() {
  const { user } = useAuth();
  const { markJudgeAdlCopyPermissionSeen, isJudgeAdlCopyPermissionSeen, judgeAdlCopyPermissionsTotal } = useMessagingNotifications();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد_المعالجة' | 'موافق_عليه' | 'مرفوض'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests, isLoading, refetch } = trpc.notifications.getRequestsList.useQuery(
    {
      status: statusFilter,
      certificateType: 'طلب استخراج نسخ/نظائر الرسوم العدلية',
      searchTerm: searchTerm,
    },
    {
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
    }
  );

  // Auto-select newest request
  useEffect(() => {
    if (!selectedRequestId && requests && requests.length > 0) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'قيد_المعالجة' || r.status === 'قيد_الدراسة').length,
      approved: requests.filter(r => r.status === 'موافق_عليه').length,
      rejected: requests.filter(r => r.status === 'مرفوض').length,
    };
  }, [requests]);

  return (
    <div className="flex h-full flex-col bg-[#f1f5f9] overflow-hidden" dir="rtl">
      {/* 🧭 Header with Minimal Judicial Design */}
      <div className="bg-[#0b1b3a] text-white p-6 shadow-lg relative z-20">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner">
               📝
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tight">طلبات الإذن لاستخراج نسخ/نظائر الرسوم العدلية</h1>
               <div className="flex items-center gap-3 mt-1 opacity-70">
                 <span className="text-xs font-bold uppercase tracking-widest">Judicial Copy Extraction Portal</span>
                 <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                 <span className="text-xs font-bold">المملكة المغربية • قضاء التوثيق</span>
               </div>
             </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-2xl text-center">
               <p className="text-[10px] font-black text-blue-300 uppercase mb-1">إجمالي الطلبات</p>
               <p className="text-xl font-black leading-none">{stats.total}</p>
            </div>
            <div className="bg-amber-500/20 border border-amber-500/30 px-6 py-2 rounded-2xl text-center">
               <p className="text-[10px] font-black text-amber-300 uppercase mb-1">في انتظار الفحص</p>
               <p className="text-xl font-black leading-none text-amber-400 animate-pulse">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* 📚 Request List Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10 transition-all duration-500">
           <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <input 
                type="text" 
                placeholder="بحث برقم الطلب أو اسم المعني..."
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#0b1b3a] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-1 mt-3">
                 {[
                   { id: 'all', label: 'الكل' },
                   { id: 'قيد_المعالجة', label: 'قيد الفحص' },
                   { id: 'موافق_عليه', label: 'مقبول' },
                   { id: 'مرفوض', label: 'مرفوض' }
                 ].map(tab => (
                   <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                      statusFilter === tab.id ? 'bg-[#0b1b3a] text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                   >
                     {tab.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-[#f8fafc]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
                   <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-xs font-black">جاري جلب السجلات...</span>
                </div>
              ) : requests?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-40 grayscale">
                   <span className="text-3xl mb-2">📥</span>
                   <span className="text-xs font-black">لا توجد طلبات واردة حالياً</span>
                </div>
              ) : (
                requests?.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => {
                      markJudgeAdlCopyPermissionSeen(String(req.id));
                      setSelectedRequestId(req.id);
                    }}
                    className={`w-full group rounded-2xl border-2 p-4 text-right transition-all relative overflow-hidden ${
                      selectedRequestId === req.id 
                        ? 'border-[#0b1b3a] bg-white shadow-xl translate-x-1' 
                        : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                    }`}
                  >
                    {selectedRequestId === req.id && (
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-[#0b1b3a]"></div>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-mono font-black text-slate-400 group-hover:text-[#0b1b3a] transition-colors">{req.request_number}</span>
                       <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                         req.status === 'موافق_عليه' ? 'bg-emerald-100 text-emerald-700' :
                         req.status === 'مرفوض' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                       }`}>
                         {req.status === 'قيد_المعالجة' ? 'قيد الفحص' : req.status?.replace('_', ' ')}
                       </span>
                    </div>

                    {!isJudgeAdlCopyPermissionSeen(String(req.id)) && (
                      <span className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    )}

                    <div className="font-extrabold text-slate-900 text-sm mb-1 leading-tight group-hover:text-[#0b1b3a]">
                      {req.involved_names}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                       <div className="flex items-center gap-1.5 opacity-60">
                          <span className="text-[10px]">⚖️</span>
                          <span className="text-[10px] font-bold truncate max-w-[100px]">{req.notary_name}</span>
                       </div>
                       <span className="text-[9px] font-bold text-slate-400">{new Date(req.created_at).toLocaleDateString('ar-MA')}</span>
                    </div>
                  </button>
                ))
              )}
           </div>
        </div>

        {/* ⚖️ Main Processing Area */}
        <div className="flex-1 bg-slate-100 overflow-hidden">
           {selectedRequest ? (
             <AdlCopyProcessingModule 
               key={selectedRequest.id} 
               request={selectedRequest} 
               onComplete={() => refetch()}
             />
           ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale p-20 text-center">
                <div className="w-32 h-32 bg-slate-300 rounded-full flex items-center justify-center text-6xl mb-6 shadow-inner border-4 border-slate-400/20">
                  📄
                </div>
                <h2 className="text-2xl font-black text-slate-700">يرجى اختيار طلب من القائمة للبدء في الفحص</h2>
                <p className="mt-2 font-bold max-w-sm">سيتم عرض وثيقة الطلب الأصلية وأدوات التأشير الرقمي هنا بمجرد اختيار السجل.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
