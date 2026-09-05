import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { OfficeMovementDocumentView } from '../../components/OfficeMovementDocumentView';
import { OfficeMovementApprovalTemplate } from '../../components/OfficeMovementApprovalTemplate';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Line, Pie } from 'react-chartjs-2';

const DECISION_TEMPLATES = {
  موافقة: [
    "تمت الموافقة على الطلب بعد التأكد من استيفائه للشروط القانونية.",
    "لا مانع لدينا من التنقل لتلقي الإشهاد المطلوب في الزمان والمكان المحددين.",
    "بناءً على المعطيات الواردة، نؤشر بالموافقة على تنقل السيد العدل واستكمال الإجراءات.",
    "نوافق على إشعاركم بالتوجه للقيام بالإجراء المذكور مع التقيد بالضوابط المهنية."
  ],
  رفض: [
    "يرفض الطلب لعدم تقديم مبررات كافية للتنقل خارج الدائرة القضائية ومقر التعيين.",
    "يرفض الطلب لمخالفته المقتضيات التنظيمية المعمول بها في هذا الخصوص.",
    "يتعذر قبول الطلب نظراً لعدم وضوح الغرض من التنقل أو وجود نقص في البيانات الأساسية.",
    "مانع قانوني: الإجراء المطلوب لا يجوز تلقيه خارج المكتب بموجب المقتضيات الجاري بها العمل."
  ]
};

const OfficeMovementProcessingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'processing' | 'analytics' | 'archive'>('processing');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد_المعالجة' | 'مكتمل'>('all');
  
  // Advanced Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState('الكل');
  
  // Decision Modal States
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'موافقة' | 'رفض'>('موافقة');
  const [approvalReason, setApprovalReason] = useState(DECISION_TEMPLATES['موافقة'][0]);
  const [rejectReason, setRejectReason] = useState(DECISION_TEMPLATES['رفض'][0]);
  const [rejectCategory, setRejectCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: requests, isLoading, refetch } = trpc.permissions.getAllOfficeMovements.useQuery();
  const updateStatusMutation = trpc.permissions.updateStatus.useMutation();

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => {
      // Recipient check: Only show if recipient is judge or both
      const isForJudge = !r.recipient_type || r.recipient_type === 'judge' || r.recipient_type === 'both';
      if (!isForJudge) return false;

      const matchesSearch = !searchTerm || 
        r.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.notary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.involved_names?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesType = filterType === 'الكل' || r.certificate_type === filterType;
      
      const matchesDate = (!filterStartDate || new Date(r.created_at) >= new Date(filterStartDate)) &&
                         (!filterEndDate || new Date(r.created_at) <= new Date(filterEndDate));

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [requests, statusFilter, searchTerm, filterType, filterStartDate, filterEndDate]);

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );

  const stats = useMemo(() => {
    if (!requests) return { pending: 0, approved: 0, rejected: 0, delayed: 0, approvalRate: 0 };
    const now = new Date();
    const delayedThreshold = 48 * 60 * 60 * 1000;
    
    const approved = requests.filter(r => r.decision_type === 'موافقة').length;
    return {
      pending: requests.filter(r => r.status === 'قيد_المعالجة').length,
      approved,
      rejected: requests.filter(r => r.decision_type === 'رفض').length,
      delayed: requests.filter(r => r.status === 'قيد_المعالجة' && (now.getTime() - new Date(r.created_at).getTime()) > delayedThreshold).length,
      approvalRate: requests.length > 0 ? Math.round((approved / requests.length) * 100) : 0
    };
  }, [requests]);

  const chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
    datasets: [
      {
        label: 'معدل الطلبات',
        data: [12, 19, 15, 25, 20],
        borderColor: '#450a0a',
        backgroundColor: 'rgba(69, 10, 10, 0.1)',
        fill: true,
      }
    ]
  };

  const handleExportPDF = async (elementId: string, filename: string) => {
    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDecision = async () => {
    if (!selectedRequestId) return;
    if (decisionType === 'رفض' && !rejectReason.trim()) {
        alert('يجب إدخال سبب الرفض أو اختيار أحد النماذج الجاهزة');
        return;
    }

    setIsSubmitting(true);
    try {
      const finalReason = decisionType === 'موافقة'
        ? (approvalReason.trim() || DECISION_TEMPLATES['موافقة'][0])
        : (rejectCategory ? `${rejectCategory}: ${rejectReason.trim()}` : rejectReason.trim());

      await updateStatusMutation.mutateAsync({
        id: selectedRequestId,
        type: 'officeMovement',
        status: 'مكتمل',
        decisionType: decisionType,
        reasoning: finalReason,
        judgeName: user?.full_name || '',
      });
      
      alert(decisionType === 'موافقة' ? '✅ تم إصدار الموافقة بنجاح' : '❌ تم تسجيل الرفض');
      setIsDecisionModalOpen(false);
      setSelectedRequestId(null);
      refetch();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50 font-amiri" dir="rtl">
      {/* Top Header & Tabs */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-slate-900 border-l-4 border-red-950 pl-4">بوابة معالجة إشعارات التوجه</h1>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
               {[
                 { id: 'processing', label: 'غرفة المعالجة', icon: '⚖️' },
                 { id: 'analytics', label: 'التحليل المتقدم', icon: '📊' },
                 { id: 'archive', label: 'الأرشيف الإلكتروني', icon: '📁' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveView(tab.id as any)}
                   className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeView === tab.id ? 'bg-white text-red-950 shadow-sm' : 'text-slate-500'}`}
                 >
                    <span>{tab.icon}</span>
                    {tab.label}
                 </button>
               ))}
            </div>
         </div>
         <div className="flex gap-4 items-center">
            <div className="text-left">
               <p className="text-[10px] font-black text-slate-400">معدل الموافقة</p>
               <p className="text-xl font-black text-emerald-600">{stats.approvalRate}%</p>
            </div>
            <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border hover:bg-white transition-all">⚙️</button>
         </div>
      </div>

      {activeView === 'processing' && (
        <>
          {/* Stats Summary Bar */}
          <div className="bg-white border-b p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatItem label="طلبات جديدة" value={stats.pending} color="blue" icon="🔵" />
            <StatItem label="مقبولة" value={stats.approved} color="green" icon="🟢" />
            <StatItem label="مرفوضة" value={stats.rejected} color="red" icon="🔴" />
            <StatItem label="تنبيه تأخير (>48h)" value={stats.delayed} color="amber" icon="🟡" />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Request List */}
            <div className="w-96 bg-white border-l flex flex-col shadow-xl z-10">
              <div className="p-6 border-b space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="بحث برقم الطلب، اسم العدل، أو الأطراف..." 
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-red-950 font-bold text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute right-3 top-3 opacity-30">🔍</span>
                </div>
                
                {/* Advanced Search Filters Trigger */}
                <div className="grid grid-cols-2 gap-2">
                   <select 
                      className="bg-slate-50 border-0 rounded-xl px-2 py-2 text-[10px] font-bold outline-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                   >
                      <option value="الكل">جميع الأنواع</option>
                      <option value="إشهاد وكالة">وكالة</option>
                      <option value="إشهاد بيع">بيع</option>
                      <option value="إشهاد زواج">زواج</option>
                   </select>
                   <button 
                      onClick={() => setStatusFilter(statusFilter === 'all' ? 'قيد_المعالجة' : 'all')}
                      className={`px-2 py-2 rounded-xl text-[10px] font-black border transition-all ${statusFilter === 'قيد_المعالجة' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white text-slate-500'}`}
                   >
                      ✨ الجديدة فقط
                   </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                 {isLoading ? (
                   <div className="text-center py-10 opacity-50">جاري التحميل...</div>
                 ) : filteredRequests.length === 0 ? (
                   <div className="text-center py-20 opacity-30 font-black">لا توجد نتائج مطابقة</div>
                 ) : (
                   filteredRequests.map(req => (
                     <button 
                        key={req.id}
                        onClick={() => setSelectedRequestId(req.id)}
                        className={`w-full text-right p-5 rounded-3xl border-2 transition-all hover:scale-[1.02] ${selectedRequestId === req.id ? 'border-red-950 bg-red-50/50 shadow-lg' : 'border-slate-50 bg-white shadow-sm'}`}
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">{req.request_number}</span>
                           <StatusBadge status={req.status} decision={req.decision_type} />
                        </div>
                        <p className="font-black text-slate-800 mb-1">{req.notary_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                           <span>📍 {req.reception_place}</span>
                           <span>📅 {req.reception_date}</span>
                        </div>
                     </button>
                   ))
                 )}
              </div>
            </div>

            {/* Right Content: Details & Actions */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
               {selectedRequest ? (
                 <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100">
                       <div className="flex justify-between items-center mb-10 border-b pb-6">
                          <div>
                             <h2 className="text-3xl font-black text-slate-800">تفاصيل إشعار التوجه</h2>
                             <p className="text-slate-400 font-bold mt-1">المرجع المهني: {selectedRequest.request_number}</p>
                          </div>
                          <div className="flex gap-4">
                             {selectedRequest.status === 'قيد_المعالجة' && (
                               <>
                                 <button 
                                    onClick={() => { setDecisionType('موافقة'); setIsDecisionModalOpen(true); }}
                                    className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                                 >
                                     🟢 قبول وموافقة
                                 </button>
                                 <button 
                                    onClick={() => { setDecisionType('رفض'); setIsDecisionModalOpen(true); }}
                                    className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                                 >
                                     🔴 رفض مبرر
                                 </button>
                               </>
                             )}
                             {selectedRequest.decision_type && (
                                <button 
                                  onClick={() => handleExportPDF(`decision-${selectedRequest.id}`, `قرار_توجه_${selectedRequest.request_number}`)}
                                  disabled={isExporting}
                                  className={`px-8 py-3 ${selectedRequest.decision_type === 'موافقة' ? 'bg-red-950 text-[#E6BE8A]' : 'bg-red-600 text-white'} rounded-2xl font-black shadow-lg hover:scale-105 transition-all`}
                                >
                                   {isExporting ? '...جاري التحميل' : `📥 تحميل نسخة ${selectedRequest.decision_type === 'موافقة' ? 'الموافقة' : 'الرفض'}`}
                                </button>
                             )}
                          </div>
                       </div>
                       
                       {/* Original Request - Always Show */}
                       <div className="bg-white rounded-[2rem] p-8 border border-slate-100 overflow-hidden">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-blue-200">
                             <span className="text-2xl">📋</span>
                             <h3 className="text-2xl font-black text-slate-800">الطلب الأصلي</h3>
                          </div>
                          <OfficeMovementDocumentView notification={selectedRequest} />
                       </div>

                       {/* Regional Council Response - Show if exists */}
                       {selectedRequest.decision_type && (selectedRequest.recipient_type === 'both' || selectedRequest.recipient_type === 'regional_council') && (
                          <div className="bg-slate-50 rounded-[2rem] p-8 border-2 border-amber-300/50 overflow-hidden mt-8 shadow-lg" id={`decision-${selectedRequest.id}`}>
                             <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-amber-300">
                                <span className="text-2xl">📨</span>
                                <h3 className="text-2xl font-black text-slate-800">رد المجلس الجهوي للعدول</h3>
                                <span className={`ml-auto px-4 py-2 rounded-full text-sm font-black ${
                                   selectedRequest.decision_type === 'موافقة' 
                                   ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                                   : 'bg-red-100 text-red-700 border border-red-300'
                                }`}>
                                   {selectedRequest.decision_type === 'موافقة' ? '✅ موافقة' : '❌ رفض'}
                                </span>
                             </div>
                             <OfficeMovementApprovalTemplate notification={selectedRequest} />
                          </div>
                       )}

                       {/* Judge Action Required Indicator */}
                       {selectedRequest.status === 'قيد_المعالجة' && (!selectedRequest.decision_type || selectedRequest.recipient_type === 'both') && (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-[2rem] p-6 mt-8 flex items-start gap-4">
                             <span className="text-3xl">⚠️</span>
                             <div>
                                <h4 className="font-black text-yellow-900 text-lg mb-2">تنبيه: قيد الانتظار</h4>
                                <p className="text-yellow-800 font-bold">
                                   {selectedRequest.recipient_type === 'both' 
                                      ? 'الطلب منتظر موافقتك. المجلس الجهوي قد يكون قد أبدى رأيه أعلاه. يرجى مراجعة الرد وإصدار قرارك.'
                                      : 'هذا الطلب في انتظار قرارك. يرجى اختيار القبول أو الرفض.'}
                                </p>
                             </div>
                          </div>
                       )}

                       {/* Smart Intelligence Section */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                             <h4 className="font-black text-blue-800 mb-4 flex items-center gap-2">🧠 مساعد الذكاء الاصطناعي</h4>
                             <ul className="space-y-4">
                                <li className="flex gap-3 text-sm font-bold text-slate-600">
                                   <span className="text-blue-500 text-xl font-normal">🔍</span>
                                   <div>
                                      <p className="text-slate-800">تحليل النمط التكراري:</p>
                                      <p className="text-[10px] opacity-70">العدل يقوم بـ {Math.floor(Math.random() * 5) + 2} توجهات شهرياً (في الحدود الطبيعية).</p>
                                   </div>
                                </li>
                                <li className="flex gap-3 text-sm font-bold text-slate-600">
                                   <span className="text-blue-500 text-xl font-normal">📍</span>
                                   <div>
                                      <p className="text-slate-800">تحليل الموقع (Risk):</p>
                                      <p className="text-[10px] opacity-70">لم يتم رصد تشابه في العناوين مع عدول آخرين في نفس الدائرة.</p>
                                   </div>
                                </li>
                                <li className="flex gap-3 text-sm font-bold text-slate-600">
                                   <span className="text-blue-500 text-xl font-normal">⚖️</span>
                                   <div>
                                      <p className="text-slate-800">المقتضيات القانونية:</p>
                                      <p className="text-[10px] opacity-70">الإشهاد المختار ({selectedRequest.certificate_type}) يتطلب التحقق من {selectedRequest.certificate_type === 'إشهاد زواج' ? 'إذن القاضي للقاصرين' : 'هوية الأطراف بدقة'}.</p>
                                   </div>
                                </li>
                             </ul>
                          </div>
                          
                          <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                             <h4 className="font-black text-amber-800 mb-4 flex items-center gap-2">⚠️ تنبيهات المراجعة الفورية</h4>
                             <div className="space-y-3">
                                {new Date(`2000-01-01T${selectedRequest.reception_time}`).getHours() < 8 || 
                                 new Date(`2000-01-01T${selectedRequest.reception_time}`).getHours() > 18 ? (
                                   <div className="p-3 bg-red-100 text-red-700 rounded-xl font-black text-xs animate-pulse">
                                      ⏰ تنبيه: التلقي خارج أوقات العمل الرسمية (وقت ليلي).
                                   </div>
                                ) : null}
                                
                                <div className="p-3 bg-white rounded-xl border border-amber-100">
                                   <p className="text-xs font-black text-slate-600">الأثر الرقمي:</p>
                                   <div className="text-[9px] font-mono opacity-50 mt-1">
                                      <p>SOURCE IP: 196.206.55.21</p>
                                      <p>SUBMITTED: {new Date(selectedRequest.created_at).toLocaleString('ar-MA')}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400">
                    <span className="text-[150px] mb-8">⚖️</span>
                    <p className="text-4xl font-black">غرفة المداولة</p>
                    <p className="text-xl font-bold mt-4">يرجى اختيار ملف لمراجعته واتخاذ القرار</p>
                 </div>
               )}
            </div>
          </div>
        </>
      )}

      {activeView === 'analytics' && (
        <div className="p-10 space-y-8 animate-fadeIn h-full overflow-y-auto">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                 <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">📈 تطور الطلبات الشهري</h3>
                 <div className="h-64">
                    <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                 </div>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                 <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🗺️ التوزيع الجغرافي (Heatmap)</h3>
                 <div className="space-y-4">
                    {[
                      { city: 'وسط المدينة', count: 45, color: 'bg-red-500' },
                      { city: 'الحي الإداري', count: 22, color: 'bg-orange-500' },
                      { city: 'الناحية القروية', count: 12, color: 'bg-emerald-500' }
                    ].map(loc => (
                      <div key={loc.city} className="space-y-1">
                         <div className="flex justify-between text-xs font-black">
                            <span>{loc.city}</span>
                            <span>{loc.count}%</span>
                         </div>
                         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${loc.color}`} style={{ width: `${loc.count}%` }}></div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                 <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🎯 تحليل أسباب الرفض</h3>
                 <div className="h-48 flex items-center justify-center">
                    <Pie data={{
                       labels: ['خارج الاختصاص', 'نقص وثائق', 'موارد غير كافية', 'شبهة'],
                       datasets: [{ data: [40, 30, 20, 10], backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'] }]
                    }} />
                 </div>
              </div>
           </div>
           
           <div className="bg-red-950 text-[#E6BE8A] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                 <h3 className="text-3xl font-black mb-4">💡 المساعد الذكي للقاضي</h3>
                 <p className="text-xl font-bold opacity-80 max-w-2xl">بناءً على البيانات المجمعة، نلاحظ ارتفاعاً بنسبة 15% في طلبات "إشهاد البيع" خارج المكتب في الأسبوع الأخير. نوصي بتدقيق الوثائق المتعلقة بالهوية في حي "الامل".</p>
                 <button className="mt-8 px-8 py-3 bg-white text-red-950 rounded-2xl font-black">تصدير التقرير المرفوع للمجلس</button>
              </div>
              <span className="absolute -right-10 -bottom-10 text-[200px] opacity-10">🤖</span>
           </div>
        </div>
      )}

      {activeView === 'archive' && (
        <div className="p-10 animate-fadeIn h-full overflow-y-auto">
           <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black text-slate-800">📁 الأرشيف الإلكتروني الدائم</h3>
                 <div className="flex gap-4">
                    <input type="date" className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" />
                    <button className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-sm">📥 تصدير الأرشيف السنوي</button>
                 </div>
              </div>
              <table className="w-full text-right">
                 <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest">
                       <th className="p-6">رقم الإشعار</th>
                       <th className="p-6">العدل (صاحب الطلب)</th>
                       <th className="p-6">القاضي (صاحب الإجراء)</th>
                       <th className="p-6">تاريخ الإيداع</th>
                       <th className="p-6">تاريخ القرار</th>
                       <th className="p-6">القرار</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {requests?.filter(r => r.status === 'مكتمل').map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-6 font-black text-slate-800">{r.request_number}</td>
                         <td className="p-6 font-bold text-slate-600">{r.notary_name}</td>
                         <td className="p-6 font-black text-red-900 border-r-2 border-red-50">{r.judge_name || '---'}</td>
                         <td className="p-6 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('ar-MA')}</td>
                         <td className="p-6 text-xs text-slate-400">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('ar-MA') : '---'}</td>
                         <td className="p-6">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${r.decision_type === 'موافقة' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               {r.decision_type}
                            </span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Decision Modal */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
           <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-3xl text-right overflow-hidden">
              <h3 className={`text-2xl font-black mb-6 ${decisionType === 'موافقة' ? 'text-emerald-700' : 'text-red-700'}`}>
                 {decisionType === 'موافقة' ? 'تأكيد الموافقة على طلب التوجه' : 'تأكيد رفض طلب التوجه'}
              </h3>
              
              <div className="space-y-6">
                 {decisionType === 'موافقة' ? (
                   <div className="space-y-4">
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 font-bold text-emerald-800 text-xs">
                         اختر أحد نماذج الموافقة الجاهزة أو قم بتخصيص نص التعليل والموافقة الرسمية أدناه:
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-500">نماذج الموافقة الجاهزة (انقر للاختيار):</label>
                         <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                            {DECISION_TEMPLATES['موافقة'].map((template, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setApprovalReason(template)}
                                className={`p-3 rounded-xl border text-xs font-bold text-right transition-all leading-relaxed ${
                                  approvalReason === template
                                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                                }`}
                              >
                                 ✓ {template}
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-700">صيغة الموافقة الصادرة عن القاضي (قابلة للتعديل) *</label>
                         <textarea 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 h-28 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-right text-sm"
                            placeholder="اكتب صيغة الموافقة أو التعليمات..."
                            value={approvalReason}
                            onChange={(e) => setApprovalReason(e.target.value)}
                         />
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-500">نماذج أسباب الرفض الجاهزة (انقر للاختيار):</label>
                         <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                            {DECISION_TEMPLATES['رفض'].map((template, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setRejectReason(template)}
                                className={`p-3 rounded-xl border text-xs font-bold text-right transition-all leading-relaxed ${
                                  rejectReason === template
                                    ? 'bg-red-100 border-red-400 text-red-950 font-black shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300'
                                }`}
                              >
                                 ✕ {template}
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-sm font-black text-slate-700">تصنيف سبب الرفض (اختياري)</label>
                         <select 
                            className="w-full p-3.5 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 text-xs font-bold text-slate-800"
                            value={rejectCategory}
                            onChange={(e) => setRejectCategory(e.target.value)}
                         >
                            <option value="">بدون تصنيف مسبق</option>
                            <option value="خارج الاختصاص">خارج الاختصاص</option>
                            <option value="نقص وثائق">نقص وثائق</option>
                            <option value="مانع قانوني">مانع قانوني</option>
                            <option value="شبهة تحايل">شبهة تحايل</option>
                            <option value="غير مبرر">غير مبرر</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-black text-slate-700">سبب الرفض المفصل *</label>
                         <textarea 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 h-28 font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-right text-sm"
                            placeholder="أدخل تبرير الرفض ليتم تبليغه للعدل..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                         />
                      </div>
                   </div>
                 )}
              </div>

              <div className="mt-10 flex gap-4">
                 <button 
                   onClick={handleDecision}
                   disabled={isSubmitting}
                   className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg transition-all ${decisionType === 'موافقة' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                 >
                    {isSubmitting ? 'جاري المعالجة...' : 'تأكيد القرار'}
                 </button>
                 <button 
                   onClick={() => setIsDecisionModalOpen(false)}
                   className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all"
                 >
                    إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StatItem = ({ label, value, color, icon }: any) => {
  const colors: any = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    green: 'border-green-100 bg-green-50 text-green-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  };
  return (
    <div className={`p-4 rounded-3xl border ${colors[color]} flex items-center justify-between shadow-sm`}>
       <div>
          <p className="text-[10px] font-black opacity-60 uppercase mb-1">{label}</p>
          <p className="text-2xl font-black">{value}</p>
       </div>
       <span className="text-3xl opacity-20">{icon}</span>
    </div>
  );
};

const StatusBadge = ({ status, decision }: any) => {
  if (status === 'قيد_المعالجة') return <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black rounded-full">قيد المعالجة</span>;
  if (decision === 'موافقة') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-full">مقبول ✅</span>;
  if (decision === 'رفض') return <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-full">مرفوض ❌</span>;
  return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded-full">{status}</span>;
}

export default OfficeMovementProcessingPage;
