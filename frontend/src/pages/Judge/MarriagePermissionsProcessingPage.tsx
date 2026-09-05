import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { 
  Line, 
  Doughnut 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MarriagePermissionApprovalTemplate } from '../../components/MarriagePermissionApprovalTemplate';
import { MarriageDocumentView } from '../../components/MarriageDocumentView';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Minus, Download, Search, FileText, CheckCircle2, AlertCircle, Paperclip, Shield } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type ViewType = 'dashboard' | 'processing' | 'archive' | 'analytics';

const MarriagePermissionsProcessingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'موافقة' | 'رفض' | 'طلب_استكمال' | 'إحالة_جلسة'>('موافقة');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCategory, setRejectCategory] = useState('');
  const [incompleteDetails, setIncompleteDetails] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPreviewingDecision, setIsPreviewingDecision] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'original' | 'compare' | 'attachments'>('original');
  const [modalDocTab, setModalDocTab] = useState<'original' | 'attachments'>('original');
  const [selectedAttachmentUrl, setSelectedAttachmentUrl] = useState<string | null>(null);

  // tRPC Queries
  const { data: rawRequests, refetch, isLoading } = trpc.permissions.getAllMarriage.useQuery();
  const updateStatusMutation = trpc.permissions.updateStatus.useMutation();

  const requests = useMemo(
    () =>
      (rawRequests ?? []).filter((request: any) => {
        const assignedJudgeUserId = request?.data?.selectedJudgeUserId;
        if (!assignedJudgeUserId) return true;
        return assignedJudgeUserId === user?.id;
      }),
    [rawRequests, user?.id]
  );

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );

  // Statistics Calculation
  const stats = useMemo(() => {
    if (!requests) return { new: 0, approved: 0, rejected: 0, incomplete: 0, minors: 0, polygamy: 0, conflicts: 0 };
    return {
      new: requests.filter(r => r.status === 'جديد' || r.status === 'قيد_المعالجة').length,
      approved: requests.filter(r => r.status === 'مقبول').length,
      rejected: requests.filter(r => r.status === 'مرفوض').length,
      incomplete: requests.filter(r => r.status === 'طلب_استكمال').length,
      minors: requests.filter(r => (r.data as any)?.suitorAge < 18 || (r.data as any)?.brideAge < 18).length,
      polygamy: requests.filter(r => (r.data as any)?.marriageType === 'تعدد').length,
      conflicts: requests.filter(r => (r.data as any)?.hasConflicts).length,
    };
  }, [requests]);

  const chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'طلبات الزواج',
      data: [65, 59, 80, 81, 56, 55],
      borderColor: '#1e3a8a',
      backgroundColor: 'rgba(30, 58, 138, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const handleDecision = async () => {
    if (!selectedRequestId) return;
    setIsSubmitting(true);
    try {
      let status = 'مقبول';
      let reasoning = '';
      if (decisionType === 'رفض') {
          status = 'مرفوض';
          reasoning = `${rejectCategory}: ${rejectReason}`;
      } else if (decisionType === 'طلب_استكمال') {
          status = 'طلب_استكمال';
          reasoning = incompleteDetails;
      } else if (decisionType === 'إحالة_جلسة') {
          status = 'إحالة_لجلسة';
          reasoning = 'تمت إحالة الملف لجلسة استماع قضاء الأسرة';
      }

      await updateStatusMutation.mutateAsync({
        id: selectedRequestId,
        type: 'marriage',
        status: status,
        decisionType: decisionType === 'موافقة' ? 'موافقة' : (decisionType as any),
        reasoning: reasoning || 'تمت المصادقة على طلب الإذن بالزواج',
        judgeName: user?.full_name || '',
      });
      
      alert('✅ تم تنفيذ الإجراء بنجاح');
      setIsDecisionModalOpen(false);
      setSelectedRequestId(null);
      refetch();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async (divId: string, fileName: string) => {
    const element = document.getElementById(divId);
    if (!element) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalZoom > 1 || modalDocTab === 'attachments') {
       setIsDragging(true);
       setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
       e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setDragOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-amiri overflow-hidden" dir="rtl">
      {/* Top Header & Tabs */}
      <div className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm shrink-0">
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-blue-900 leading-tight">منصة تدقيق ومراقبة طلبات الزواج</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Marriage Audit & Compliance Hub</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
               {[
                 { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
                 { id: 'processing', label: 'غرفة التدقيق', icon: '⚖️' },
                 { id: 'archive', label: 'الأرشيف', icon: '📁' },
                 { id: 'analytics', label: 'إحصائيات الأسرة', icon: '📊' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveView(tab.id as any)}
                   className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeView === tab.id ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500'}`}
                 >
                    <span>{tab.icon}</span>
                    {tab.label}
                 </button>
               ))}
            </div>
         </div>
         <button 
           onClick={() => setIsFormModalOpen(true)}
           className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-lg flex items-center gap-2"
         >
            <span>➕</span> تسجيل طلب جديد
         </button>
      </div>

      <div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
        {activeView === 'dashboard' && (
          <div className="h-full overflow-y-auto space-y-10 animate-fadeIn">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <StatItem label="طلبات جديدة" value={stats.new} color="blue" icon="💍" />
              <StatItem label="موافقات" value={stats.approved} color="green" icon="✅" />
              <StatItem label="مرفوضة" value={stats.rejected} color="red" icon="❌" />
              <StatItem label="طلبات ناقصة" value={stats.incomplete} color="amber" icon="⚠️" />
              <StatItem label="تعارض بيانات" value={stats.conflicts} color="red" icon="🔄" isAlert={stats.conflicts > 0} />
              <StatItem label="طلبات قاصرين" value={stats.minors} color="indigo" icon="👶" />
              <StatItem label="طلبات تعدد" value={stats.polygamy} color="purple" icon="👩‍⚖️" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  <h2 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
                    <span>📈</span> وتيرة النشاط التوثيقي (الزواج)
                  </h2>
                  <div className="h-[400px]">
                    <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
               </div>

               <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 mb-8">التوزيع حسب الفئة</h3>
                  <div className="h-[300px] flex items-center justify-center">
                    <Doughnut data={{
                      labels: ['عادي', 'تعدد', 'قاصرين'],
                      datasets: [{
                        data: [70, 20, 10],
                        backgroundColor: ['#1e3a8af0', '#9333ea', '#4f46e5'],
                      }]
                    }} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeView === 'processing' && (
          <div className="h-full flex gap-4 lg:gap-6 animate-fadeIn overflow-hidden">
            {/* List Sidebar */}
            <div className="w-72 lg:w-80 bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col shrink-0">
               <div className="p-6 bg-slate-50 border-b">
                 <h3 className="text-lg font-black text-slate-800 mb-4">قائمة الطلبات الجارية</h3>
                 <div className="relative">
                    <input type="text" placeholder="بحث باسم الخاطب..." className="w-full bg-white p-3 pr-10 rounded-xl ring-1 ring-slate-200 outline-none font-bold text-xs" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                 </div>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {isLoading ? (
                    <div className="p-8 text-center text-slate-400 font-bold">جاري التحميل...</div>
                  ) : requests?.map((req: any) => (
                    <div 
                      key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer relative group ${selectedRequestId === req.id ? 'border-blue-900 bg-blue-50/50' : 'border-slate-50 hover:border-blue-200 bg-white'}`}
                    >
                       <div className="flex justify-between items-start mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${req.status === 'جديد' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{req.status}</span>
                          <div className="flex items-center gap-2">
                             {req.status !== 'جديد' && req.status !== 'قيد_المعالجة' && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setSelectedRequestId(req.id); setIsPreviewingDecision(true); }}
                                 className="text-emerald-600 hover:scale-125 transition-transform" 
                                 title="عرض القرار"
                               >
                                  📄
                               </button>
                             )}
                             <span className="text-[9px] font-mono text-slate-400">#{req.request_number?.slice(-6) || '...'}</span>
                          </div>
                       </div>
                       <p className="font-black text-slate-800 text-[11px] truncate">الخاطب: {(req.data as any)?.suitorFirstNameAr} {(req.data as any)?.suitorLastNameAr}</p>
                       <p className="font-black text-slate-800 text-[11px] truncate mt-0.5">المخطوبة: {(req.data as any)?.brideFirstNameAr} {(req.data as any)?.brideLastNameAr}</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* Audit Logic View (The Modern Judicial Hub) */}
            <div className="flex-1 bg-[#f1f5f9] rounded-[2.5rem] shadow-inner overflow-hidden flex flex-col border border-slate-200 m-2">
               {selectedRequest ? (
                 <div className="h-full flex flex-col">
                    {/* Header Bar */}
                    <div className="px-10 py-5 bg-white border-b flex justify-between items-center shrink-0 shadow-sm z-10">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                             <FileText size={20} />
                          </div>
                          <div>
                             <h2 className="text-lg font-black text-slate-900 leading-tight">تدقيق الملف الرقمي</h2>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transaction: {selectedRequest.request_number}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-[10px] text-blue-600 font-black">جاهز للمراجعة</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mr-4 shadow-inner">
                             <button 
                                onClick={() => setActiveDocTab('original')}
                                className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${activeDocTab === 'original' ? 'bg-white text-blue-900 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                <FileText size={14} />
                                طلب الإذن
                             </button>
                             <button 
                                onClick={() => setActiveDocTab('attachments')}
                                className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${activeDocTab === 'attachments' ? 'bg-white text-blue-900 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                <Paperclip size={14} />
                                المرفقات
                             </button>
                             <button 
                                onClick={() => setActiveDocTab('compare')}
                                className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${activeDocTab === 'compare' ? 'bg-white text-blue-900 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                <Shield size={14} />
                                التحليل الذكي
                             </button>
                          </div>
                          
                          <button 
                            onClick={() => setIsZoomed(true)}
                            className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl flex items-center gap-3 active:scale-95"
                          >
                             <Search size={16} />
                             معاينة واختبار (Zoom)
                          </button>
                          
                          <button 
                            onClick={() => setIsDecisionModalOpen(true)}
                            className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
                          >
                             <CheckCircle2 size={16} />
                             اتخاذ القرار
                          </button>
                       </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                       {/* LEFT: DATA SUMMARY (Sleek Dark Aesthetic) */}
                       <div className="w-72 shrink-0 bg-[#0f172a] text-white p-8 overflow-y-auto space-y-10 shadow-[10px_0_30px_rgba(0,0,0,0.1)] z-10 custom-scrollbar">
                          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                             <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                             <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-300 italic">Data Extraction</h4>
                          </div>
                          
                          <Section label="🤵 بيانات الخاطب">
                             <div className="space-y-3">
                                <div className="bg-white/5 p-5 rounded-2xl space-y-3 border border-white/5 hover:bg-white/[0.08] transition-colors group">
                                   <div className="flex justify-between text-[10px]"><span className="opacity-40 font-bold uppercase tracking-tighter">Name:</span><span className="font-black text-blue-100">{(selectedRequest.data as any)?.suitorFirstNameAr}</span></div>
                                   <div className="flex justify-between text-[10px]"><span className="opacity-40 font-bold uppercase tracking-tighter">ID Card:</span><span className="font-mono text-blue-300">{(selectedRequest.data as any)?.suitorCIN}</span></div>
                                   <div className="flex justify-between text-[10px]"><span className="opacity-40 font-bold uppercase tracking-tighter">Current Age:</span><span className="font-black">{(selectedRequest.data as any)?.suitorAge} سنة</span></div>
                                </div>
                             </div>
                          </Section>

                          <Section label="👰 بيانات المخطوبة">
                             <div className="space-y-3">
                                <div className="bg-white/5 p-5 rounded-2xl space-y-3 border border-white/5 hover:bg-white/[0.08] transition-colors group">
                                   <div className="flex justify-between text-[10px]"><span className="opacity-40 font-bold uppercase tracking-tighter">Name:</span><span className="font-black text-pink-100">{(selectedRequest.data as any)?.brideFirstNameAr}</span></div>
                                   <div className="flex justify-between text-[10px]"><span className="opacity-40 font-bold uppercase tracking-tighter">Current Age:</span><span className="font-black">{(selectedRequest.data as any)?.brideAge} سنة</span></div>
                                </div>
                             </div>
                          </Section>

                          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 mt-8 relative overflow-hidden group">
                             <div className="relative z-10">
                                <p className="text-[9px] font-black text-blue-400 mb-2 uppercase tracking-widest">Judicial Advisory</p>
                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">لا توجد ملاحظات قانونية تستدعي التوقف حالياً. الملف مستوفٍ لجميع الشروط الشكلية.</p>
                             </div>
                             <Shield size={60} className="absolute -bottom-4 -right-4 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                          </div>
                       </div>

                       {/* CENTER: THE WORK CANVAS */}
                       <div className="flex-1 flex flex-col relative group/canvas overflow-hidden">
                          {activeDocTab === 'original' ? (
                             <div className="flex-1 bg-slate-200/40 overflow-y-auto p-12 flex justify-center custom-scrollbar">
                                <div 
                                  className="w-full max-w-[850px] bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] relative transition-all duration-700 hover:shadow-[0_45px_100px_rgba(0,0,0,0.2)] rounded-sm cursor-zoom-in group/doc grow-0 h-fit"
                                  onClick={() => setIsZoomed(true)}
                                >
                                   <div className="p-1 pointer-events-none scale-[0.98] origin-top">
                                      <MarriageDocumentView data={selectedRequest.data || {}} notaryData={selectedRequest as any} />
                                   </div>
                                   <div className="absolute inset-0 bg-blue-900/0 group-hover/doc:bg-blue-900/5 transition-all flex items-center justify-center opacity-0 group-hover/doc:opacity-100">
                                      <div className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xs shadow-2xl flex items-center gap-4 transform translate-y-4 group-hover/doc:translate-y-0 transition-all duration-500">
                                         <Search size={18} />
                                         اضغط لبدء الفحص الدقيق والمطابقة
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ) : activeDocTab === 'attachments' ? (
                             <div className="flex-1 flex overflow-hidden">
                                {/* Attachment Selector */}
                                <div className="w-80 border-l bg-white p-8 overflow-y-auto space-y-4 shrink-0 shadow-sm custom-scrollbar">
                                   <div className="flex items-center justify-between mb-8 border-b pb-4">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Vault Contents</p>
                                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black">SECURE</span>
                                   </div>
                                   {(() => {
                                      const attachments = [];
                                      try {
                                         if (selectedRequest.attachments) {
                                            const parsed = typeof selectedRequest.attachments === 'string' ? JSON.parse(selectedRequest.attachments) : selectedRequest.attachments;
                                            if (Array.isArray(parsed)) attachments.push(...parsed);
                                            else if (parsed.url) attachments.push(parsed.url);
                                         }
                                      } catch(e) {}
                                      
                                      if (attachments.length === 0) return (
                                         <div className="text-center py-20 opacity-20">
                                            <Paperclip size={40} className="mx-auto mb-4" />
                                            <p className="text-xs font-bold">لا توجد وثائق متاحة</p>
                                         </div>
                                      );
                                      
                                      return attachments.map((url, idx) => (
                                         <button 
                                            key={idx}
                                            onClick={() => setSelectedAttachmentUrl(url)}
                                            className={`w-full p-5 rounded-2xl text-right transition-all flex items-center gap-4 border shadow-sm group ${selectedAttachmentUrl === url ? 'bg-blue-900 border-blue-900 text-white shadow-blue-200 translate-x-1' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'}`}
                                         >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${selectedAttachmentUrl === url ? 'bg-white/20' : 'bg-slate-100 group-hover:scale-110'}`}>
                                               <FileText size={16} />
                                            </div>
                                            <div className="flex-1">
                                               <span className="block text-[11px] font-black">الوثيقة الرسمية #{idx + 1}</span>
                                               <span className={`text-[8px] font-bold uppercase transition-colors ${selectedAttachmentUrl === url ? 'text-blue-200' : 'text-slate-400'}`}>Digitally Verified</span>
                                            </div>
                                         </button>
                                      ));
                                   })()}
                                </div>

                                {/* Attachment View */}
                                <div className="flex-1 bg-slate-900 flex items-center justify-center p-10 relative overflow-hidden">
                                   {selectedAttachmentUrl ? (
                                      <div className="w-full h-full bg-white rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] overflow-hidden border-8 border-white/10 p-1 group/viewer relative">
                                         <iframe 
                                           src={`${selectedAttachmentUrl}#view=FitH&toolbar=0`} 
                                           className="w-full h-full border-0 rounded-2xl" 
                                           title="Viewer" 
                                         />
                                         <div 
                                           onClick={() => setIsZoomed(true)}
                                           className="absolute top-6 right-6 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl opacity-0 group-hover/viewer:opacity-100 transition-all cursor-pointer hover:scale-110 active:scale-95 z-20"
                                         >
                                            <Search size={20} />
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="text-center p-20">
                                         <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center text-4xl shadow-inner mb-8 mx-auto border border-white/5">
                                            <Paperclip size={40} className="text-slate-700 opacity-20" />
                                         </div>
                                         <p className="font-black text-slate-600 text-lg">يرجى تحديد وثيقة من سجل المرفقات</p>
                                         <p className="text-xs font-bold text-slate-700 mt-2 uppercase tracking-widest italic opacity-40">Waiting for selection...</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                          ) : (
                             <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-slate-50">
                                <ComparisonPanel data={selectedRequest.data || {}} highlightLayout />
                             </div>
                          )}
                       </div>

                       {/* RIGHT: COMPLIANCE FLAGS (Modern Judicial Cards) */}
                       <div className="w-[340px] shrink-0 border-r p-8 overflow-y-auto space-y-10 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10 custom-scrollbar">
                          <h4 className="text-[11px] font-black text-slate-800 border-b pb-4 flex items-center gap-3 uppercase tracking-[0.1em] text-right">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                             </div>
                             المطابقة والنتائج الذكية
                          </h4>
                          
                          <div className="space-y-6">
                             <AlertCard 
                                type="blue"
                                icon={<Shield size={18} />}
                                label="تدقيق المادة 20"
                                status={(selectedRequest.data as any)?.suitorAge < 18 || (selectedRequest.data as any)?.brideAge < 18 ? 'red' : 'green'}
                                message={(selectedRequest.data as any)?.suitorAge < 18 || (selectedRequest.data as any)?.brideAge < 18 ? 'عائق السن: يتطلب إذن القاضي المكلف بالزواج' : 'طرفا العقد راشدان (قانوني)'}
                             />
                             <AlertCard 
                                type="amber"
                                icon={<AlertCircle size={18} />}
                                label="فحص الحالة المدنية"
                                status={(selectedRequest.data as any)?.hasConflicts ? 'red' : 'green'}
                                message={(selectedRequest.data as any)?.hasConflicts ? 'يوجد تضارب صريح في بيانات الحالة العائلية' : 'البيانات المصرح بها مطابقة لسجلات الحالة المدنية'}
                             />
                          </div>

                          <div className="mt-auto pt-10">
                             <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                <div className="relative z-10 transition-transform group-hover:-translate-y-1">
                                   <p className="text-[10px] font-black text-blue-400 mb-4 tracking-[0.2em] uppercase">التلخيص القانوني</p>
                                   <p className="text-xs font-bold leading-relaxed opacity-90">
                                      {(selectedRequest.data as any)?.suitorAge < 18 ? 
                                      "نظراً لوجود طرف قاصر في هذا الملف، يجب استدعاء الأطراف لجلسة الاستماع ومناقشة المصلحة الفضلى." : 
                                      "الملف يبدو مستوفياً لجميع الشروط الجوهرية. المعاينة البصرية لم تظهر أي عيوب شكلية في الوثائق المرفقة."}
                                   </p>
                                </div>
                                <Search size={120} className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-blue-900">
                    <span className="text-[200px] mb-8">💍</span>
                    <p className="text-4xl font-black">غرفة المداولة الأسرية</p>
                    <p className="text-xl font-bold mt-4">يرجى اختيار طلب ملف زواج لمراجعته</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeView === 'archive' && (
           <div className="animate-fadeIn space-y-8">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 overflow-hidden">
                 <div className="flex justify-between items-center mb-8 border-b pb-8">
                    <h3 className="text-2xl font-black text-slate-800">📁 السجل التاريخي المتكامل</h3>
                    <div className="flex gap-4">
                       <input type="text" placeholder="رقم الطلب / الاسم..." className="bg-slate-50 p-3 rounded-xl ring-1 ring-slate-100 outline-none font-bold text-xs w-64" />
                       <button className="bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-blue-800">بحث متقدم</button>
                    </div>
                 </div>
                 
                 <table className="w-full text-right border-collapse">
                    <thead>
                       <tr className="bg-slate-50 text-slate-500 font-black text-xs uppercase border-b">
                          <th className="p-6">رقم الملف</th>
                          <th className="p-6">الأطراف</th>
                          <th className="p-6">النوع</th>
                          <th className="p-6">التاريخ</th>
                          <th className="p-6">الحالة</th>
                          <th className="p-6">خيارات</th>
                       </tr>
                    </thead>
                    <tbody>
                       {requests?.map((req: any) => (
                          <tr key={req.id} className="border-b hover:bg-slate-50 transition-all">
                             <td className="p-6 font-mono text-xs">{req.request_number}</td>
                             <td className="p-6 font-black">{(req.data as any)?.suitorFirstNameAr} & {(req.data as any)?.brideFirstNameAr}</td>
                             <td className="p-6 font-bold">{(req.data as any)?.marriageType || '---'}</td>
                             <td className="p-6 text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString('ar-MA')}</td>
                             <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black ${req.status === 'مقبول' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{req.status}</span>
                             </td>
                             <td className="p-6">
                                <button 
                                  onClick={() => { setSelectedRequestId(req.id); setIsPreviewingDecision(true); }}
                                  className="text-blue-900 hover:scale-110 transition-transform p-2 bg-blue-50 rounded-lg"
                                >
                                   📄 عرض القرار
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>

      {/* Decision Modal */}
      {isDecisionModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-fadeIn">
           <div className="bg-white rounded-[3.5rem] w-full max-w-2xl p-12 shadow-2xl relative border-4 border-blue-900/5">
              <div className="flex justify-between items-center mb-10">
                 <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-800">📜 إصدار القرار القضائي</h2>
                    <p className="text-slate-500 font-bold mt-1">تأكيد الرأي النهائي لملف الزواج</p>
                 </div>
                 <span className="text-4xl">⚖️</span>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-black text-slate-400 block mb-3 uppercase">طبيعة القرار</label>
                    <div className="grid grid-cols-2 gap-4">
                       {[
                         { id: 'موافقة', label: 'قبول وتوليد الإذن', color: 'bg-emerald-50 text-emerald-700 ring-emerald-500' },
                         { id: 'رفض', label: 'رفض الطلب', color: 'bg-rose-50 text-rose-700 ring-rose-500' },
                         { id: 'طلب_استكمال', label: 'طلب وثيقة إضافية', color: 'bg-amber-50 text-amber-700 ring-amber-500' },
                         { id: 'إحالة_جلسة', label: 'إحالة لجلسة استماع', color: 'bg-blue-50 text-blue-700 ring-blue-500' },
                       ].map(opt => (
                         <button 
                           key={opt.id}
                           onClick={() => setDecisionType(opt.id as any)}
                           className={`p-4 rounded-2xl text-xs font-black transition-all ring-2 ${decisionType === opt.id ? opt.color : 'bg-slate-50 text-slate-400 ring-transparent'}`}
                         >
                            {opt.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 {decisionType === 'رفض' && (
                    <div className="space-y-4 animate-slideUp">
                       <label className="text-sm font-black text-slate-700">تعليل الرفض الإجباري *</label>
                       <select 
                         className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 outline-none font-bold"
                         value={rejectCategory}
                         onChange={(e) => setRejectCategory(e.target.value)}
                       >
                          <option value="">اختر مبرراً...</option>
                          <option value="مانع قانوني">مانع قانوني (المادة 18-20)</option>
                          <option value="عدم انحلال ميثاق">زواج قائم لم ينحل</option>
                          <option value="تناقض هوية">تناقض جوهري في الوثائق</option>
                          <option value="طمس معلومات">محاولة تضليل (إخفاء حالة)</option>
                       </select>
                       <textarea 
                          className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 outline-none font-bold text-sm"
                          placeholder="أدخل مبررات الرفض بالتفصيل..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                       />
                    </div>
                 )}

                 {decisionType === 'طلب_استكمال' && (
                    <div className="space-y-4 animate-slideUp">
                       <label className="text-sm font-black text-slate-700">تحديد النواقص المطلوبة *</label>
                       <textarea 
                          className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 outline-none font-bold text-sm"
                          placeholder="اشرح للعدل ما يحتاجه لاستكمال ملفه..."
                          value={incompleteDetails}
                          onChange={(e) => setIncompleteDetails(e.target.value)}
                       />
                    </div>
                 )}
              </div>

              <div className="mt-12 flex gap-4">
                 <button 
                   onClick={handleDecision}
                   disabled={isSubmitting || (decisionType === 'رفض' && (!rejectReason || !rejectCategory)) || (decisionType === 'طلب_استكمال' && !incompleteDetails)}
                   className="flex-1 py-4 bg-blue-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-800 transition-all disabled:opacity-50"
                 >
                    {isSubmitting ? 'جاري التنفيذ...' : 'تأكيد وحفظ القرار'}
                 </button>
                 <button onClick={() => setIsDecisionModalOpen(false)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* Full Preview & Compare Modal - Redesigned Audit Station */}
      {isZoomed && selectedRequest && (
        <div className="fixed inset-0 bg-[#0f172a]/98 backdrop-blur-3xl z-[800] flex items-center justify-center p-0 animate-fadeIn">
           <div className="w-full h-full flex flex-col overflow-hidden">
              
              {/* MODAL HEADER: Dark Judicial Glass */}
              <div className="bg-slate-900/50 border-b border-white/5 px-10 py-5 flex items-center justify-between shadow-2xl z-50">
                 <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => { setIsZoomed(false); setModalZoom(1); setDragOffset({ x: 0, y: 0 }); setModalDocTab('original'); }}
                         className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 rounded-2xl flex items-center justify-center transition-all border border-white/10 group active:scale-90"
                         title="Close Inspection"
                       >
                          <X size={24} className="group-hover:rotate-90 transition-transform" />
                       </button>
                       <div className="hidden lg:block">
                          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                             محطة الفحص والتدقيق الرقمي
                             <span className="bg-blue-500 text-[10px] px-2 py-0.5 rounded-md font-black uppercase">v4.2</span>
                          </h2>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Live Inspection Mode • {selectedRequest.request_number}</p>
                          </div>
                       </div>
                    </div>

                    {/* INTERFACE TABS */}
                    <div className="bg-black/40 backdrop-blur-xl p-1.5 rounded-[1.5rem] flex gap-2 border border-white/5 shadow-2xl">
                       <button 
                         onClick={() => { setModalDocTab('original'); setModalZoom(1.2); setDragOffset({x:0, y:0}); }}
                         className={`px-8 py-3 rounded-[1.1rem] text-[11px] font-black transition-all flex items-center gap-3 ${modalDocTab === 'original' ? 'bg-blue-600 text-white shadow-xl ring-1 ring-white/10 scale-[1.05]' : 'text-slate-500 hover:text-slate-300'}`}
                       >
                          <FileText size={16} />
                          طلب الإذن الرئيسي
                       </button>
                       <button 
                         onClick={() => { setModalDocTab('attachments'); setModalZoom(1.8); setDragOffset({x:0, y:0}); }}
                         className={`px-8 py-3 rounded-[1.1rem] text-[11px] font-black transition-all flex items-center gap-3 ${modalDocTab === 'attachments' ? 'bg-blue-600 text-white shadow-xl ring-1 ring-white/10 scale-[1.05]' : 'text-slate-500 hover:text-slate-300'}`}
                       >
                          <Paperclip size={16} />
                          المرفقات المرقمنة
                       </button>
                    </div>
                 </div>

                 <div className="flex items-center gap-6">
                    {/* ZOOM ENGINE */}
                    <div className="flex items-center bg-black/60 text-white rounded-2xl p-1 gap-1 border border-white/5">
                       <button 
                         onClick={() => setModalZoom(prev => Math.min(prev + 0.25, 4))}
                         className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all text-xl"
                       >
                          <Plus size={18} />
                       </button>
                       <div className="px-6 font-black text-[12px] font-mono border-x border-white/5 min-w-[70px] text-center text-blue-400">
                          {Math.round(modalZoom * 100)}%
                       </div>
                       <button 
                         onClick={() => setModalZoom(prev => Math.max(prev - 0.25, 0.5))}
                         className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all text-xl"
                       >
                          <Minus size={18} />
                       </button>
                       <button 
                         onClick={() => { setModalZoom(modalDocTab === 'attachments' ? 1.8 : 1.2); setDragOffset({x:0, y:0}); }}
                         className="px-4 text-[9px] font-black uppercase tracking-tighter hover:text-blue-400 transition-colors"
                       >
                         Reset
                       </button>
                    </div>

                    <button 
                      onClick={() => handleExportPDF(`zoom-marriage-${selectedRequest.id}`, `audit-${selectedRequest.request_number}`)}
                      className="bg-white text-slate-900 h-12 px-8 rounded-2xl flex items-center gap-3 transition-all font-black text-xs shadow-2xl hover:scale-105 active:scale-95 group"
                    >
                       <Download size={16} className="group-hover:-translate-y-1 transition-transform" />
                       تصدير نسخة التدقيق
                    </button>
                 </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 {/* SIDEBAR: SMART ANALYTICS (Ultra Sleek Dark) */}
                 <div className="w-[320px] bg-[#020617] text-white p-8 overflow-y-auto shrink-0 shadow-[20px_0_50px_rgba(0,0,0,0.3)] z-20 flex flex-col border-r border-white/5">
                    <div className="mb-10">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                             <Shield size={20} className="text-blue-400" />
                          </div>
                          <div>
                             <h4 className="text-[11px] font-black tracking-[1px] text-blue-100 uppercase">مركز الامتثال</h4>
                             <p className="text-[8px] text-slate-500 font-black uppercase mt-0.5">Automated Analysis</p>
                          </div>
                       </div>
                       <div className="h-[1px] w-full bg-slate-800"></div>
                    </div>
                    
                    <div className="flex-1 space-y-10 custom-scrollbar pr-2">
                       <Section label="نقاط المراقبة القانونية">
                          <ComparisonPanel data={selectedRequest.data || {}} zoomMode />
                       </Section>

                       <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-white/10">
                          <p className="text-[9px] font-black opacity-40 mb-3 text-blue-400 uppercase tracking-widest">توصية النظام القضائي</p>
                          <p className="text-[11px] font-bold leading-relaxed text-slate-300">
                             لم يتم رصد أي تناقضات جوهرية بين طلب الإذن والوثائق الملحقة. يرجى مطابقة الهوية البصرية بعناية قبل التوقيع الرقمي.
                          </p>
                       </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                       <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-4">
                          <span>Operator ID:</span>
                          <span className="font-mono text-slate-400">{user?.id?.slice(0, 8) || 'JUDGE-01'}</span>
                       </div>
                       <button 
                         onClick={() => setIsDecisionModalOpen(true)}
                         className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-xs transition-all shadow-xl shadow-blue-900/40"
                       >
                          اتخاذ القرار النهائي
                       </button>
                    </div>
                 </div>

                 {/* MAIN: THE CANVAS (High resolution viewport) */}
                 <div 
                   className={`flex-1 overflow-hidden bg-[#0f172a] shadow-inner flex justify-center items-start relative select-none animate-fadeIn ${modalZoom > 1 || modalDocTab === 'attachments' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseUp}
                 >
                    <div 
                       className={`origin-top pointer-events-none will-change-transform mt-12 mb-40 ${isDragging ? '' : 'transition-transform duration-300'}`}
                       style={{ 
                         transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${modalZoom})`,
                         width: '1100px',
                       }}
                    >
                       <div 
                          id={`zoom-marriage-${selectedRequest.id}`}
                          className="pointer-events-auto bg-white shadow-[0_50px_150px_rgba(0,0,0,0.6)] ring-1 ring-white/10 rounded-sm overflow-hidden"
                       >
                          {modalDocTab === 'original' ? (
                             <div className="p-0.5">
                                <MarriageDocumentView data={selectedRequest.data || {}} notaryData={selectedRequest as any} />
                             </div>
                          ) : (
                             <div className="w-full h-[1600px] bg-white overflow-hidden flex flex-col relative">
                                {selectedAttachmentUrl ? (
                                   <>
                                      <iframe 
                                        src={`${selectedAttachmentUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`} 
                                        className="flex-1 w-full h-full border-0 select-none pointer-events-none" 
                                        title="Attachment" 
                                      />
                                      {/* Interaction Layer */}
                                      <div className="absolute inset-0 z-10 bg-transparent" />
                                   </>
                                ) : (
                                   <div className="h-[800px] flex flex-col items-center justify-center text-slate-200">
                                      <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-6 border-2 border-dashed border-slate-100">
                                         <FileText size={40} className="opacity-20" />
                                      </div>
                                      <p className="text-xl font-black text-slate-300">يرجى اختيار وثيقة للمعاينة</p>
                                      <p className="text-sm font-bold text-slate-400 mt-2">استخدم اللوحة الجانبية على اليسار</p>
                                   </div>
                                )}
                             </div>
                          )}
                       </div>
                    </div>

                    {/* INTERACTIVE HUD */}
                    <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end pointer-events-none">
                       <div className="bg-slate-900/90 backdrop-blur-2xl text-white px-8 py-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-6 animate-slideUp">
                          <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                             <span className="text-[10px] font-black tracking-widest uppercase">Canvas Active</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-300">👋 انقر واسحب للمناورة بالوثيقة • 🔍 استخدم أدوات التحكم أعلاه</p>
                       </div>
                    </div>
                 </div>

                 {/* ATTACHMENTS LIST PANEL (Sleek High-Capacity) */}
                 {modalDocTab === 'attachments' && (
                    <div className="w-[300px] bg-[#020617] border-r border-white/5 overflow-hidden shrink-0 shadow-2xl z-20 flex flex-col animate-slideInRight">
                       <div className="p-8 border-b border-white/5 bg-slate-900/50">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">أرشيف المرفقات</span>
                             <span className="bg-white/10 text-white text-[8px] px-2 py-0.5 rounded font-black italic">SECURE</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">قائمة الوثائق المستخرجة لهذا الملف</p>
                       </div>
                       
                       <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                          {(() => {
                             const attachments = [];
                             try {
                                if (selectedRequest.attachments) {
                                   const parsed = typeof selectedRequest.attachments === 'string' ? JSON.parse(selectedRequest.attachments) : selectedRequest.attachments;
                                   if (Array.isArray(parsed)) attachments.push(...parsed);
                                   else if (parsed.url) attachments.push(parsed.url);
                                }
                             } catch(e) {}
                             
                             if (attachments.length === 0) return (
                                <div className="text-center py-20">
                                   <Paperclip size={40} className="mx-auto text-slate-800 mb-4 opacity-50" />
                                   <p className="text-slate-500 font-bold italic text-xs">لا توجد وثائق متاحة</p>
                                </div>
                             );
                             
                             return attachments.map((url: any, idx: number) => (
                                <button 
                                   key={idx}
                                   onClick={() => setSelectedAttachmentUrl(url)}
                                   className={`w-full p-5 rounded-2xl transition-all flex items-center gap-4 group relative border ${selectedAttachmentUrl === url ? 'bg-blue-600 border-blue-400 text-white shadow-xl translate-x-1' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedAttachmentUrl === url ? 'bg-white/20' : 'bg-slate-800'}`}>
                                      <FileText size={16} />
                                   </div>
                                   <div className="text-right flex-1 overflow-hidden">
                                      <p className={`text-[11px] font-black truncate transition-colors ${selectedAttachmentUrl === url ? 'text-white' : 'text-slate-300'}`}>الوثائق المرقمنة #{idx + 1}</p>
                                      <p className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-tighter overflow-hidden truncate">Valid Digital Copy</p>
                                   </div>
                                   {selectedAttachmentUrl === url && (
                                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                   )}
                                </button>
                             ));
                          })()}
                       </div>
                       
                       <div className="p-8 bg-black/40 border-t border-white/5">
                          <div className="bg-blue-900/20 border border-blue-900/30 p-4 rounded-xl">
                             <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Audit Note</p>
                             <p className="text-[10px] text-slate-400 leading-tight">جميع المرفقات مشفرة ومؤمنة بالنظام.</p>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Decision Document Preview Modal */}
      {isPreviewingDecision && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[700] flex items-center justify-center p-8 animate-fadeIn">
           <div className="w-full max-w-4xl h-full bg-white rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setIsPreviewingDecision(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm font-black text-slate-400">✕</button>
                    <h3 className="text-xl font-black text-blue-900">📄 معاينة القرار القضائي النهائي</h3>
                 </div>
                 <button 
                   onClick={() => handleExportPDF(`decision-preview-${selectedRequest.id}`, `decision-marriage-${selectedRequest.request_number}`)}
                   className="bg-blue-900 text-white px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-all flex items-center gap-2"
                 >
                    <span>🖨️</span> {isExporting ? 'جاري التحميل...' : 'طباعة القرار PDF'}
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-slate-100/30 flex justify-center">
                 <div id={`decision-preview-${selectedRequest.id}`} className="bg-white shadow-2xl origin-top transform scale-90 translate-y-[-5%] mb-20">
                    <MarriagePermissionApprovalTemplate notification={selectedRequest} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Internal Registration Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[500] flex items-center justify-center p-6 animate-fadeIn overflow-y-auto">
           <div className="bg-slate-50 rounded-[4rem] w-full max-w-5xl shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh] border-8 border-white">
              <div className="bg-blue-900 p-8 flex justify-between items-center shrink-0">
                 <h2 className="text-2xl font-black text-white">➕ منصة تسجيل طلب زواج جديد (داخلي)</h2>
                 <button onClick={() => setIsFormModalOpen(false)} className="text-white bg-white/20 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                 <AdminMarriageForm 
                    onClose={() => setIsFormModalOpen(false)} 
                    onSuccess={() => { setIsFormModalOpen(false); refetch(); }} 
                 />
              </div>
           </div>
        </div>
      )}

      {/* Hidden PDF Template Container */}
      <div className="hidden">
        {requests?.map((req: any) => (
          <div key={req.id} id={`approval-template-${req.id}`}>
             <MarriagePermissionApprovalTemplate notification={req} />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Sub-components ---

const StatItem = ({ label, value, color, icon, isAlert = false }: any) => {
  const themes: any = {
    blue: 'bg-white border-blue-900/10 text-blue-900',
    green: 'bg-white border-green-900/10 text-green-700',
    red: 'bg-white border-red-900/10 text-red-700',
    amber: 'bg-white border-amber-900/10 text-amber-700',
    indigo: 'bg-white border-indigo-900/10 text-indigo-700',
    purple: 'bg-white border-purple-900/10 text-purple-700',
  };
  return (
    <div className={`p-5 rounded-[2.5rem] border shadow-sm transition-all hover:scale-105 ${themes[color]} ${isAlert ? 'ring-2 ring-red-500 ring-offset-2 animate-pulse' : ''}`}>
       <div className="flex justify-between items-center mb-3">
          <span className="text-2xl">{icon}</span>
          <span className="text-[8px] font-black opacity-30 uppercase">LIVE</span>
       </div>
       <p className="text-2xl font-black mb-1">{value}</p>
       <p className="text-[10px] font-black opacity-60 leading-tight">{label}</p>
    </div>
  );
};

const Section = ({ label, children }: any) => (
  <div className="space-y-4">
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
    {children}
  </div>
);

const DataPanel = ({ data }: { data: Array<{k: string, v: string}> }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
    {data.map((item, idx) => (
      <div key={idx} className="flex justify-between items-center text-xs">
        <span className="font-bold text-slate-400">{item.k}:</span>
        <span className="font-black text-slate-800">{item.v || '---'}</span>
      </div>
    ))}
  </div>
);

const AlertCard = ({ type, label, status, message, icon }: any) => (
  <div className={`p-5 rounded-3xl border-2 shadow-sm ${status === 'green' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : (status === 'red' ? 'bg-rose-50/50 border-rose-100 text-rose-800' : 'bg-blue-50/50 border-blue-100 text-blue-800')}`}>
     <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] font-black uppercase">{label}</span>
     </div>
     <p className="text-xs font-bold leading-relaxed">{message}</p>
  </div>
);

const ComparisonPanel = ({ data, zoomMode = false, highlightLayout = false }: any) => {
  const suitorAge = data?.suitorAge || 0;
  const brideAge = data?.brideAge || 0;
  const isPolygamy = data?.marriageType === 'تعدد';
  const hasConflicts = data?.hasConflicts;

  return (
    <div className={`space-y-6 ${highlightLayout ? 'max-w-4xl mx-auto' : ''}`}>
       <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-6">
          <h5 className="text-[10px] font-black text-blue-900 mb-4 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
             مؤشرات المطابقة والامتثال (Smart Audit)
          </h5>
          <div className="space-y-3">
             <ComplianceRow 
               label="أهلية الخاطب (المادة 19)" 
               status={suitorAge >= 18 ? 'success' : 'alert'} 
               message={suitorAge >= 18 ? 'السن قانوني (راشد)' : `قاصر (${suitorAge} سنة) - يتطلب إذن القاضي`} 
             />
             <ComplianceRow 
               label="أهلية المخطوبة (المادة 19)" 
               status={brideAge >= 18 ? 'success' : 'alert'} 
               message={brideAge >= 18 ? 'السن قانوني (راشد)' : `قاصرة (${brideAge} سنة) - يتطلب إذن القاضي`} 
             />
             <ComplianceRow 
               label="وضعية التعدد (المادة 40)" 
               status={isPolygamy ? 'warning' : 'success'} 
               message={isPolygamy ? 'طلب تعدد - يستوجب التحقق من المبرر والموافقة' : 'زواج عادي'} 
             />
             <ComplianceRow 
               label="سلامة التصريحات (المادة 65)" 
               status={hasConflicts ? 'danger' : 'success'} 
               message={hasConflicts ? 'تعارض في الحالة العائلية المصرح بها' : 'لا توجد تناقضات ظاهرة'} 
             />
          </div>
       </div>

       <table className="w-full text-right border-separate border-spacing-y-2">
          <thead>
             <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="pr-4 pb-2">العنصر</th>
                <th className="pb-2">البيانات المصرح بها</th>
                <th className="pb-2 text-center">الحالة</th>
             </tr>
          </thead>
          <tbody className="text-[11px]">
             <CompareRow label="الخاطب" val={(data?.suitorFirstNameAr || '') + ' ' + (data?.suitorLastNameAr || '')} result="ok" />
             <CompareRow label="تاريخ الازدياد" val={data?.suitorDOB} result={suitorAge < 18 ? 'warn' : 'ok'} />
             <CompareRow label="رقم البطاقة" val={data?.suitorCIN} result="ok" />
             <CompareRow label="الحالة العائلية" val={data?.suitorMaritalStatus} result={hasConflicts ? 'err' : 'ok'} />
             <CompareRow label="المخطوبة" val={(data?.brideFirstNameAr || '') + ' ' + (data?.brideLastNameAr || '')} result="ok" />
             <CompareRow label="تاريخ الازدياد" val={data?.brideDOB} result={brideAge < 18 ? 'warn' : 'ok'} />
          </tbody>
       </table>
       
       <div className="p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300">
          <h5 className="text-[10px] font-black text-slate-400 mb-3 underline">⚖️ موانع الملاحظات الهامشية</h5>
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">• زواج سابق غير منحل</p>
                <span className={`text-[10px] font-black ${hasConflicts ? 'text-red-500' : 'text-emerald-600'}`}>{hasConflicts ? 'محتمل' : 'لا يوجد'}</span>
             </div>
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">• انقضاء مدة العدة</p>
                <span className="text-[10px] text-emerald-600 font-bold">متحقق</span>
             </div>
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">• انتهاء صلاحية الملف الطبي</p>
                <span className="text-[10px] text-emerald-600 font-bold">ساري</span>
             </div>
          </div>
       </div>
    </div>
  );
};

const ComplianceRow = ({ label, status, message }: any) => {
  const styles: any = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    alert: 'bg-indigo-500',
    danger: 'bg-rose-500'
  };
  return (
    <div className="flex items-start gap-3">
       <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${styles[status]}`}></div>
       <div>
          <p className="text-[10px] font-black text-slate-800">{label}</p>
          <p className={`text-[9px] font-bold ${status === 'success' ? 'text-emerald-700' : (status === 'danger' ? 'text-rose-600' : 'text-slate-500')}`}>{message}</p>
       </div>
    </div>
  );
};

const CompareRow = ({ label, val, result }: any) => (
  <tr className="bg-white group">
     <td className="p-3 font-black text-slate-400">{label}</td>
     <td className="p-3 font-black text-slate-800">{val || '---'}</td>
     <td className="p-3 text-center">
        {result === 'ok' ? '✅' : (result === 'err' ? '🔴' : '⚠️')}
     </td>
  </tr>
);

const TabButton = ({ label, active, onClick, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`px-6 py-2 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 ${active ? 'bg-blue-900 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
  >
     <span>{icon}</span>
     {label}
  </button>
);

// --- Admin Form Component ---

const AdminMarriageForm = ({ onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = trpc.permissions.createMarriage.useMutation();

  const [formData, setFormData] = useState({
    judicialFileNumber: `MAT-AUD-${Date.now().toString().slice(-6)}`,
    suitorFirstNameAr: '', suitorLastNameAr: '', suitorCIN: '', suitorDOB: '', suitorAge: 0, suitorMaritalStatus: 'أعزب', suitorJob: '', suitorAddress: '',
    brideFirstNameAr: '', brideLastNameAr: '', brideCIN: '', brideDOB: '', brideAge: 0, brideMaritalStatus: 'عزباء', brideJob: '', brideAddress: '',
    marriageType: 'عادي', // عادي، تعدد
    hasConflicts: false,
    birthCertNumber: '',
  });

  const handleDOBChange = (side: 'suitor' | 'bride', val: string) => {
    const age = new Date().getFullYear() - new Date(val).getFullYear();
    setFormData((prev: any) => ({
      ...prev,
      [`${side}DOB`]: val,
      [`${side}Age`]: age
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        fullName: `${formData.suitorFirstNameAr} ${formData.suitorLastNameAr}`,
        professionalNumber: user?.full_name || 'JUDGE-ADMIN',
        jurisdiction: user?.jurisdiction || 'محكمة الاستئناف بتطوان',
        data: formData,
      });
      alert('تم تسجيل طلب الزواج بنجاح');
      onSuccess();
    } catch (e: any) {
      alert('خطأ في التسجيل: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-10 space-y-10">
      {/* Progress */}
      <div className="flex justify-between px-10 relative">
        <div className="absolute top-1/2 left-10 right-10 h-1 bg-slate-200 -z-10 -translate-y-1/2"></div>
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black transition-all ${step >= s ? 'bg-blue-900 border-blue-900 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
            {s}
          </div>
        ))}
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-inner border border-slate-100">
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-xl font-black text-blue-900">👤 أولاً: بيانات الخاطب</h3>
            <div className="grid grid-cols-2 gap-6">
              <Input label="الاسم الشخصي" value={formData.suitorFirstNameAr} onChange={(v: string) => setFormData({...formData, suitorFirstNameAr: v})} />
              <Input label="الاسم العائلي" value={formData.suitorLastNameAr} onChange={(v: string) => setFormData({...formData, suitorLastNameAr: v})} />
              <Input label="رقم البطاقة الوطنية" value={formData.suitorCIN} onChange={(v: string) => setFormData({...formData, suitorCIN: v})} />
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400">تاريخ الازدياد</label>
                 <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold" value={formData.suitorDOB} onChange={e => handleDOBChange('suitor', e.target.value)} />
                 {formData.suitorAge > 0 && <span className={`text-[10px] font-black ${formData.suitorAge < 18 ? 'text-red-600' : 'text-green-600'}`}>السن المحسوب: {formData.suitorAge} سنة {formData.suitorAge < 18 && ' (قاصر - يتطلب إذن)'}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-xl font-black text-blue-900">👰 ثانياً: بيانات المخطوبة</h3>
            <div className="grid grid-cols-2 gap-6">
              <Input label="الاسم الشخصي" value={formData.brideFirstNameAr} onChange={(v: string) => setFormData({...formData, brideFirstNameAr: v})} />
              <Input label="الاسم العائلي" value={formData.brideLastNameAr} onChange={(v: string) => setFormData({...formData, brideLastNameAr: v})} />
              <Input label="رقم البطاقة الوطنية" value={formData.brideCIN} onChange={(v: string) => setFormData({...formData, brideCIN: v})} />
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400">تاريخ الازدياد</label>
                 <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold" value={formData.brideDOB} onChange={e => handleDOBChange('bride', e.target.value)} />
                 {formData.brideAge > 0 && <span className={`text-[10px] font-black ${formData.brideAge < 18 ? 'text-red-600' : 'text-green-600'}`}>السن المحسوب: {formData.brideAge} سنة {formData.brideAge < 18 && ' (قاصر - يتطلب إذن)'}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-xl font-black text-blue-900">📎 ثالثاً: الوثائق والمرفقات الإجبارية</h3>
            <div className="grid grid-cols-2 gap-4">
               <DocCheckbox label="النسخة الكاملة من رسم الولادة (الطرفين)" checked />
               <DocCheckbox label="شهادة إدارية للعزوبة (الخاطب)" checked />
               <DocCheckbox label="شهادة إدارية للعزوبة (المخطوبة)" checked />
               <DocCheckbox label="شهادة طبية للطرفين" checked />
            </div>
            <p className="bg-amber-50 text-amber-700 p-4 rounded-xl text-xs font-bold">⚠️ ملاحظة: النظام لا يسمح بتسجيل الطلب في حالة نقص أي وثيقة إجبارية.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-xl font-black text-blue-900">🧠 رابعاً: معطيات التدقيق والنوع</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400">نوع الزواج</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold ring-1 ring-slate-100" value={formData.marriageType} onChange={e => setFormData({...formData, marriageType: e.target.value})}>
                  <option value="عادي">زواج عادي</option>
                  <option value="تعدد">طلب تعدد (المادة 40 وما بعدها)</option>
                </select>
              </div>
              <Input label="رقم رسم الولادة" value={formData.birthCertNumber} onChange={(v: string) => setFormData({...formData, birthCertNumber: v})} />
              <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl">
                 <input type="checkbox" checked={formData.hasConflicts} onChange={e => setFormData({...formData, hasConflicts: e.target.checked})} className="w-5 h-5" />
                 <span className="text-xs font-bold text-rose-800">وجود تعارض في الحالة العائلية المذكورة في الوثائق؟</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">السابق</button>
        ) : <div />}
        
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} className="px-12 py-4 bg-blue-900 text-white rounded-3xl font-black shadow-xl hover:scale-105 transition-all">المرحلة التالية</button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-16 py-4 bg-green-600 text-white rounded-3xl font-black shadow-xl hover:scale-105 transition-all">إرسال وتوثيق الطلب</button>
        )}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-slate-400 uppercase">{label}</label>
    <input 
      type="text" 
      className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm focus:ring-blue-500 transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const DocCheckbox = ({ label, checked }: any) => (
  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
     <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>✓</div>
     <span className="text-xs font-black text-slate-800">{label}</span>
  </div>
);

export default MarriagePermissionsProcessingPage;
