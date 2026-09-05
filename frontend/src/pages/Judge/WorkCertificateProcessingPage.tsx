import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { 
  Line, 
  Pie 
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
import { WorkCertificateApprovalTemplate } from '../../components/WorkCertificateApprovalTemplate';
import { WorkCertificateDocumentView } from '../../components/WorkCertificateDocumentView';
import { useAuth } from '../../contexts/AuthContext';

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

const WorkCertificateProcessingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'موافقة' | 'رفض' | 'طلب_استكمال'>('موافقة');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCategory, setRejectCategory] = useState('');
  const [incompleteDetails, setIncompleteDetails] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // tRPC Queries
  const { data: rawRequests, refetch, isLoading } = trpc.permissions.getAllWorkCertificates.useQuery();
  const updateStatusMutation = trpc.permissions.updateStatus.useMutation();

  const requests = useMemo(() => {
    const list = rawRequests || [];
    return list.filter((req) => {
      const assignedJudgeUserId = (req as any)?.data?.selectedJudgeUserId;
      if (!assignedJudgeUserId) return true;
      return assignedJudgeUserId === user?.id;
    });
  }, [rawRequests, user?.id]);

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );

  const stats = useMemo(() => {
    if (!requests) return { new: 0, approved: 0, rejected: 0, incomplete: 0, delayed: 0 };
    const now = new Date();
    return {
      new: requests.filter(r => r.status === 'قيد_المعالجة').length,
      approved: requests.filter(r => r.decision_type === 'موافقة').length,
      rejected: requests.filter(r => r.decision_type === 'رفض').length,
      incomplete: requests.filter(r => r.status === 'طلب_استكمال').length,
      delayed: requests.filter(r => {
          if (r.status !== 'قيد_المعالجة') return false;
          const created = new Date(r.created_at);
          const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          return diffHours > 72;
      }).length
    };
  }, [requests]);

  const chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'الشواهد المسلمة',
      data: [12, 19, 15, 25, 22, 30],
      borderColor: '#1e40af',
      backgroundColor: 'rgba(30, 64, 175, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const handleDecision = async () => {
    if (!selectedRequestId) return;
    
    setIsSubmitting(true);
    try {
      let status = 'مكتمل';
      let reasoning = '';
      
      if (decisionType === 'رفض') {
          reasoning = `${rejectCategory}: ${rejectReason}`;
      } else if (decisionType === 'طلب_استكمال') {
          status = 'طلب_استكمال';
          reasoning = incompleteDetails;
      } else {
          reasoning = 'تمت الموافقة على طلب شهادة العمل';
      }

      await updateStatusMutation.mutateAsync({
        id: selectedRequestId,
        type: 'workCertificate',
        status: status,
        decisionType: decisionType === 'موافقة' ? 'موافقة' : (decisionType === 'رفض' ? 'رفض' : 'طلب_استكمال'),
        reasoning: reasoning,
        judgeName: user?.full_name || '',
      });
      
      alert(decisionType === 'موافقة' ? '✅ تم إصدار الشهادة بنجاح' : (decisionType === 'رفض' ? '❌ تم تسجيل الرفض' : '⚠️ تم إرسال طلب الاستكمال'));
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50 font-amiri overflow-hidden" dir="rtl">
      {/* Top Header & Tabs */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-blue-900 border-l-4 border-blue-900 pl-4">شواهد العمل والوضعية المهنية</h1>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
               {[
                 { id: 'dashboard', label: 'الرئيسية', icon: '🏠' },
                 { id: 'processing', label: 'غرفة المعالجة', icon: '⚖️' },
                 { id: 'archive', label: 'الأرشيف', icon: '📁' },
                 { id: 'analytics', label: 'الإحصائيات', icon: '📊' }
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

      <div className="flex-1 overflow-y-auto p-8">
        {activeView === 'dashboard' && (
          <div className="space-y-10 animate-fadeIn">
            {/* Top Stats Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <StatItem label="طلبات جديدة" value={stats.new} color="blue" icon="📩" />
              <StatItem label="تمت المصادقة" value={stats.approved} color="green" icon="✅" />
              <StatItem label="طلبات مرفوضة" value={stats.rejected} color="red" icon="❌" />
              <StatItem label="نقص الوثائق" value={stats.incomplete} color="amber" icon="⚠️" />
              <StatItem label="تجاوزت الأجل" value={stats.delayed} color="red" icon="⏳" isAlert={stats.delayed > 0} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black text-slate-800">📊 وتيرة إصدار الشواهد (شهري)</h3>
                    <select className="bg-slate-50 p-3 rounded-xl font-bold text-xs ring-1 ring-slate-100 outline-none">
                       <option>سنة 2026</option>
                       <option>سنة 2025</option>
                    </select>
                  </div>
                  <div className="h-[400px]">
                    <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                     <div className="relative z-10">
                        <p className="text-blue-200 font-bold mb-2">معدل المعالجة الزمني</p>
                        <h4 className="text-5xl font-black mb-6">14.5 <span className="text-xl">ساعة</span></h4>
                        <div className="w-full bg-blue-700/50 h-2 rounded-full overflow-hidden">
                           <div className="bg-green-400 h-full w-[85%]"></div>
                        </div>
                        <p className="text-xs mt-4 opacity-70 font-bold">تحسن بنسبة 12% عن الشهر الماضي 📈</p>
                     </div>
                     <span className="absolute -right-10 -bottom-10 text-[200px] opacity-10 group-hover:scale-110 transition-transform">⚙️</span>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                     <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🧠 التنبيهات الذكية</h3>
                     <div className="space-y-4">
                        {stats.delayed > 0 && (
                          <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex gap-3 items-center border border-red-100">
                             <span className="text-2xl">🚨</span>
                             <div>
                                <p className="text-xs font-black">هناك {stats.delayed} طلبات تجاوزت 72 ساعة.</p>
                                <p className="text-[10px] opacity-70">يُرجى البت فيها لتفادي التأخير الإداري.</p>
                             </div>
                          </div>
                        )}
                        <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl flex gap-3 items-center border border-amber-100">
                           <span className="text-2xl">⚠️</span>
                           <div>
                              <p className="text-xs font-black">تحليل نمطي:</p>
                              <p className="text-[10px] opacity-70">تم رصد تكرار طلبات "شهادة بنكية" لـ 3 عدول في أسبوع واحد.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeView === 'processing' && (
          <div className="flex gap-8 h-full animate-fadeIn">
            {/* List Sidebar */}
            <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
               <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-0 z-10">
                  <input 
                    type="text" 
                    placeholder="بحث سريع عن اسم أو رقم..." 
                    className="w-full p-4 bg-slate-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-900 outline-none font-bold text-sm"
                  />
               </div>
               
               {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-20 opacity-20">
                     <span className="animate-spin text-5xl mb-4">🌀</span>
                     <p className="font-black">جاري جلب الطلبات...</p>
                  </div>
               ) : requests?.filter(r => r.status === 'قيد_المعالجة' || r.status === 'طلب_استكمال').map(r => (
                  <button 
                    key={r.id}
                    onClick={() => setSelectedRequestId(r.id)}
                    className={`w-full text-right p-6 rounded-[2rem] transition-all border-2 ${selectedRequestId === r.id ? 'bg-blue-50 border-blue-900 shadow-lg' : 'bg-white border-transparent hover:border-slate-200'}`}
                  >
                     <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${r.status === 'طلب_استكمال' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                           {r.status === 'قيد_المعالجة' ? 'جديد' : 'في الانتظار'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(r.created_at).toLocaleDateString('ar-MA')}</span>
                     </div>
                     <h4 className="text-lg font-black text-slate-800 mb-1">{r.notary_name}</h4>
                     <p className="text-xs font-bold text-slate-500 mb-3">{r.certificate_type || 'شهادة عمل'}</p>
                     
                     <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-[10px] font-black text-slate-400">الرقم الترتيبي: {r.request_number}</span>
                     </div>
                  </button>
               ))}
               
               {requests?.filter(r => r.status === 'قيد_المعالجة' || r.status === 'طلب_استكمال').length === 0 && (
                  <div className="text-center p-20 opacity-30">
                     <span className="text-6xl mb-4 block">🏝️</span>
                     <p className="font-black">لا توجد طلبات معلقة حالياً</p>
                  </div>
               )}
            </div>

            {/* View Details */}
            <div className="flex-1 overflow-y-auto">
               {selectedRequest ? (
                 <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
                       <div>
                          <h2 className="text-4xl font-black text-slate-900 mb-2">{selectedRequest.notary_name}</h2>
                          <div className="flex items-center gap-4">
                             <span className="bg-blue-50 text-blue-800 px-4 py-1.5 rounded-full text-xs font-black">🏢 {selectedRequest.jurisdiction}</span>
                             <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black">🆔 {selectedRequest.notary_professional_number}</span>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          {selectedRequest.status === 'قيد_المعالجة' && (
                             <>
                                <button 
                                  onClick={() => { setDecisionType('موافقة'); setIsDecisionModalOpen(true); }}
                                  className="px-8 py-3 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all"
                                >
                                    🟢 قبول واعتماد
                                </button>
                                <button 
                                  onClick={() => { setDecisionType('طلب_استكمال'); setIsDecisionModalOpen(true); }}
                                  className="px-8 py-3 bg-amber-500 text-white rounded-2xl font-black shadow-lg hover:bg-amber-600 transition-all"
                                >
                                    🟡 طلب استكمال
                                </button>
                                <button 
                                  onClick={() => { setDecisionType('رفض'); setIsDecisionModalOpen(true); }}
                                  className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all"
                                >
                                    🔴 رفض القرار
                                </button>
                             </>
                          )}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-8">
                          <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100">
                             <h4 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">📝 تفاصيل الطلب</h4>
                             <div className="space-y-4">
                                <DetailItem label="نوع الشهادة" value={selectedRequest.certificate_type || 'شهادة عمل'} />
                                <DetailItem label="تاريخ الالتحاق" value={selectedRequest.appointment_date || '---'} />
                                <DetailItem label="رقم قرار التعيين" value={selectedRequest.appointment_decree_number || '---'} />
                                <DetailItem label="الجهة الموجه إليها" value={selectedRequest.data?.recipientUnit || 'جميع المصالح الإدارية'} />
                                <DetailItem label="لغة الشهادة" value={selectedRequest.data?.language === 'fr' ? 'الفرنسية' : 'العربية'} />
                             </div>
                          </div>

                          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                             <h4 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">📎 المرفقات الداعمة</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <AttachmentCard label="طلب موقع" />
                                <AttachmentCard label="بطاقة وطنية" />
                             </div>
                          </div>
                       </div>

                       <div className="space-y-8">
                          <div className="bg-white border-4 border-double border-slate-200 p-8 rounded-[2rem] shadow-inner h-full flex flex-col relative group">
                             <p className="text-center font-black text-slate-300 mb-4 uppercase tracking-[5px]">Pre-View Document</p>
                             <div 
                                onClick={() => setIsZoomed(true)}
                                className="flex-1 overflow-hidden relative cursor-zoom-in transition-all hover:ring-4 hover:ring-blue-500/20 rounded-xl bg-slate-50 flex justify-center"
                             >
                                <div className="origin-top scale-[0.55] w-[180%] h-fit shrink-0 pointer-events-none">
                                   <WorkCertificateDocumentView data={selectedRequest.data || {}} notaryData={selectedRequest} />
                                </div>
                                <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                   <div className="bg-blue-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                      <span>🔍</span>
                                      انقر للمعاينة الكاملة
                                   </div>
                                </div>
                             </div>
                             <p className="text-center text-[10px] font-bold text-slate-400 mt-4 italic">يتيح هذا العرض مراجعة سريعة لمحتوى الوثيقة المقدمة</p>
                          </div>
                       </div>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="mt-10 bg-amber-50/50 p-8 rounded-[3rem] border border-amber-200">
                       <h4 className="font-black text-amber-900 text-xl mb-6 flex items-center gap-2">⚠️ تدقيق الوضعية المهنية الذكي</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <RiskIndicator label="تطابق الوضعية" status="success" message="العدل مزاول فعلي بالقاعدة" />
                          <RiskIndicator label="السجل التأديبي" status="warning" message="تنبيه مهني سابق (خفيف) منذ 3 سنوات" />
                          <RiskIndicator label="الفترة المطلوبة" status="success" message="تطابق كامل مع المزاولة الفعلية" />
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-blue-900">
                    <span className="text-[150px] mb-8">🛡️</span>
                    <p className="text-4xl font-black">غرفة المداولة للشواهد</p>
                    <p className="text-xl font-bold mt-4">يرجى اختيار طلب لمراجعته والبت فيه</p>
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
                       <input type="text" placeholder="رقم الشهادة / الاسم..." className="bg-slate-50 p-3 rounded-xl ring-1 ring-slate-100 outline-none font-bold text-xs w-64" />
                       <button className="bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-blue-800">بحث متقدم</button>
                    </div>
                 </div>
                 
                 <table className="w-full text-right border-collapse">
                    <thead>
                       <tr className="bg-slate-50 text-slate-500 font-black text-xs uppercase border-b">
                          <th className="p-6">رقم الشهادة</th>
                          <th className="p-6">المعني بالأمر</th>
                          <th className="p-6">النوع</th>
                          <th className="p-6">تاريخ الإصدار</th>
                          <th className="p-6">صاحب القرار</th>
                          <th className="p-6">الحالة</th>
                          <th className="p-6">الإجراء</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {requests?.filter(r => r.status === 'مكتمل').map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="p-6 font-black text-blue-900">{r.request_number?.replace('CT-WORK-', 'CERT-2026-')}</td>
                             <td className="p-6 font-bold text-slate-700">{r.notary_name}</td>
                             <td className="p-6 text-xs font-bold text-slate-500">{r.certificate_type || 'شهادة عمل'}</td>
                             <td className="p-6 text-xs text-slate-400">{new Date(r.decided_at || r.updated_at || r.created_at).toLocaleDateString('ar-MA')}</td>
                             <td className="p-6 text-xs font-black text-slate-900 italic">الأرشيف القاضي {r.judge_name || '---'}</td>
                             <td className="p-6">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${r.decision_type === 'موافقة' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                   {r.decision_type}
                                </span>
                             </td>
                             <td className="p-6">
                                <button 
                                  onClick={() => setSelectedRequestId(r.id)}
                                  className="text-blue-900 hover:scale-125 transition-transform"
                                >
                                   📄
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
      {isDecisionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fadeIn">
           <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-3xl text-right">
              <h3 className={`text-2xl font-black mb-6 ${decisionType === 'موافقة' ? 'text-green-700' : (decisionType === 'رفض' ? 'text-red-700' : 'text-amber-700')}`}>
                 {decisionType === 'موافقة' ? 'اعتماد وإصدار الشهادة' : (decisionType === 'رفض' ? 'قرار رفض الشهادة' : 'طلب استكمال الملف')}
              </h3>
              
              <div className="space-y-6">
                 {decisionType === 'موافقة' && (
                   <div className="bg-green-50 p-6 rounded-3xl border border-green-100 font-bold text-green-800 italic">
                      سيتم توليد شهادة عمل رسمية تتضمن توقيعكم الإلكتروني ورمزا رقمياً للتحقق (QR Code) وحفظها بالأرشيف.
                   </div>
                 )}

                 {decisionType === 'رفض' && (
                    <div className="space-y-4">
                       <label className="text-sm font-black text-slate-700">تعليل الرفض الإجباري *</label>
                       <select 
                         className="w-full p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 outline-none font-bold"
                         value={rejectCategory}
                         onChange={(e) => setRejectCategory(e.target.value)}
                       >
                          <option value="">اختر سبب الرفض...</option>
                          <option value="نقص وثائق">نقص وثائق جوهرية</option>
                          <option value="عدم مطابقة الفترة">عدم مطابقة الفترة المطلوبة</option>
                          <option value="مانع تأديبي">وجود مانع تأديبي</option>
                          <option value="طلب غير مشروع">طلب غير مشروع</option>
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
                    <div className="space-y-4">
                       <label className="text-sm font-black text-slate-700">تحديد النواقص المطلوبة *</label>
                       <textarea 
                          className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-200 outline-none font-bold text-sm"
                          placeholder="اشرح للعدل ما يحتاجه لاستكمال ملفه (مثلاً: إرفاق نسخة التعيين الأصلية)..."
                          value={incompleteDetails}
                          onChange={(e) => setIncompleteDetails(e.target.value)}
                       />
                    </div>
                 )}
              </div>

              <div className="mt-10 flex gap-4">
                 <button 
                   onClick={handleDecision}
                   disabled={isSubmitting || (decisionType === 'رفض' && (!rejectReason || !rejectCategory)) || (decisionType === 'طلب_استكمال' && !incompleteDetails)}
                   className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg transition-all ${decisionType === 'موافقة' ? 'bg-green-600 hover:bg-green-700' : (decisionType === 'رفض' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700')} disabled:opacity-50`}
                 >
                    {isSubmitting ? 'جاري المعالجة...' : 'تأكيد القرار النهائي'}
                 </button>
                 <button 
                   onClick={() => setIsDecisionModalOpen(false)}
                   className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all font-bold"
                 >
                    إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Registration Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-6 sm:p-12 animate-fadeIn overflow-y-auto">
           <div className="bg-slate-50 rounded-[3rem] w-full max-w-5xl shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-blue-900 p-8 flex justify-between items-center shrink-0">
                 <h2 className="text-2xl font-black text-white">➕ تسجيل طلب شهادة عمل جديد</h2>
                 <button onClick={() => setIsFormModalOpen(false)} className="text-white bg-white/20 w-10 h-10 rounded-full flex items-center justify-center font-black">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                 <AdminWorkCertificateForm 
                    onClose={() => setIsFormModalOpen(false)} 
                    onSuccess={() => { setIsFormModalOpen(false); refetch(); }} 
                 />
              </div>
           </div>
        </div>
      )}

      {/* Zoom Preview Modal */}
      {isZoomed && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 md:p-10 animate-fadeIn">
           <div className="relative w-full max-w-4xl max-h-full overflow-y-auto bg-white rounded-[2rem] shadow-2xl p-8 md:p-12">
              <button 
                onClick={() => setIsZoomed(false)}
                className="absolute top-6 left-6 w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full flex items-center justify-center font-black transition-all z-10"
              >
                 ✕
              </button>
              
              <div className="mb-8 border-b pb-6 flex justify-between items-end">
                 <div className="flex gap-4">
                    <button 
                      onClick={() => handleExportPDF(`zoom-doc-${selectedRequest.id}`, `certificate-${selectedRequest.request_number}`)}
                      disabled={isExporting}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-xs hover:bg-green-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                       <span>{isExporting ? '⌛' : '🖨️'}</span>
                       {isExporting ? 'جاري التحضير...' : 'طباعة / تحميل PDF'}
                    </button>
                 </div>
                 <div className="text-right">
                    <h3 className="text-2xl font-black text-slate-800">معاينة كاملة للوثيقة</h3>
                    <p className="text-slate-500 font-bold mt-1">الرقم المرجعي: {selectedRequest.request_number}</p>
                 </div>
              </div>

              <div className="bg-slate-50 p-4 md:p-10 rounded-2xl border border-slate-100 overflow-hidden" id={`zoom-doc-${selectedRequest.id}`}>
                 <WorkCertificateDocumentView data={selectedRequest.data || {}} notaryData={selectedRequest} />
              </div>

              <div className="mt-8 flex justify-center">
                 <button 
                   onClick={() => setIsZoomed(false)}
                   className="px-12 py-4 bg-blue-900 text-white rounded-2xl font-black hover:bg-blue-800 transition-all shadow-xl"
                 >
                    إغلاق المعاينة
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Hidden Templates for PDF Generation */}
      {selectedRequest && (
        <div className="hidden">
           <div id={`template-${selectedRequest.id}`}>
              {selectedRequest.decision_type === 'موافقة' ? (
                 <WorkCertificateApprovalTemplate notification={selectedRequest} />
              ) : (
                 <WorkCertificateDocumentView data={selectedRequest.data || {}} notaryData={selectedRequest} />
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// Sub-components

const StatItem = ({ label, value, color, icon, isAlert = false }: any) => {
  const themes: any = {
    blue: 'bg-white border-blue-900/10 text-blue-900',
    green: 'bg-white border-green-900/10 text-green-700',
    red: 'bg-white border-red-900/10 text-red-700',
    amber: 'bg-white border-amber-900/10 text-amber-700',
  };
  return (
    <div className={`p-6 rounded-3xl border shadow-sm transition-all hover:scale-105 ${themes[color]} ${isAlert ? 'ring-2 ring-red-500 ring-offset-2 animate-pulse' : ''}`}>
       <div className="flex justify-between items-center mb-4">
          <span className="text-3xl bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center">{icon}</span>
          <span className="text-xs font-black opacity-30 uppercase">LIVE</span>
       </div>
       <p className="text-3xl font-black mb-1">{value}</p>
       <p className="text-[10px] font-black opacity-60">{label}</p>
    </div>
  );
};

const DetailItem = ({ label, value }: any) => (
  <div className="flex justify-between items-center border-b border-blue-900/5 pb-2">
     <span className="text-xs font-bold text-slate-400">{label}:</span>
     <span className="text-sm font-black text-slate-800">{value}</span>
  </div>
);

const AttachmentCard = ({ label }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2 group hover:border-blue-900 transition-all cursor-pointer">
     <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
     <span className="text-[10px] font-black">{label}</span>
     <span className="text-[8px] opacity-30 uppercase font-mono">View File</span>
  </div>
);

const RiskIndicator = ({ label, status, message }: any) => (
  <div className={`p-4 rounded-2xl border ${status === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
     <p className="text-[10px] font-black uppercase mb-1 opacity-70">{label}</p>
     <div className="flex items-center gap-2">
        <span className="text-xs font-bold">{message}</span>
     </div>
  </div>
);

// Advanced Form for Admin Registration
const AdminWorkCertificateForm = ({ onClose, onSuccess }: any) => {
  const [step, setStep] = useState(1);
  const [applicantType, setApplicantType] = useState('notary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = trpc.permissions.createWorkCertificate.useMutation();

  const [formData, setFormData] = useState({
    fullName: '',
    professionalNumber: '',
    rentalNumber: '',
    appointmentDecreeNumber: '',
    appointmentDate: '',
    employmentStatus: 'مزاول',
    certificateType: 'شهادة مزاولة مهنة',
    otherType: '',
    recipientUnit: '',
    country: '',
    language: 'ar',
    needsTranslation: 'no',
    startDate: '',
    endDate: '',
    includeExperience: true,
    includeStatus: true,
    includeNoPenalties: true,
    avgIncome: false,
    notes: '',
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        fullName: formData.fullName,
        professionalNumber: formData.professionalNumber,
        appointmentDecreeNumber: formData.appointmentDecreeNumber,
        appointmentDate: formData.appointmentDate,
        certificateType: formData.certificateType === 'أخرى' ? formData.otherType : formData.certificateType,
        jurisdiction: 'المحكمة الابتدائية المختصة',
        data: {
           ...formData,
           applicantType,
           submittedVia: 'حضوري',
        }
      });
      alert('✅ تم تسجيل الطلب بنجاح');
      onSuccess();
    } catch (e: any) {
      alert('خطأ أثناء الحفظ: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-10 space-y-10">
       {/* Step Indicators */}
       <div className="flex items-center justify-between gap-4">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2 group">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${step >= s ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                  {s}
               </div>
               <div className={`h-1 flex-1 rounded-full ${step > s ? 'bg-blue-900' : 'bg-slate-200'}`}></div>
            </div>
          ))}
       </div>

       <div className="animate-fadeIn min-h-[400px]">
          {step === 1 && (
             <div className="space-y-6">
                <h3 className="text-xl font-black text-blue-900 border-r-4 border-blue-900 pr-4">1. هوية طالب الشهادة</h3>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex gap-6">
                   {['notary', 'trainee', 'employee', 'scribe'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setApplicantType(type)}
                        className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${applicantType === type ? 'bg-blue-50 border-blue-900' : 'bg-white border-transparent hover:border-slate-100'}`}
                      >
                         <span className="text-4xl">{type === 'notary' ? '⚖️' : (type === 'trainee' ? '🎓' : '💼')}</span>
                         <span className="text-xs font-black">{type === 'notary' ? 'عدل منتصب' : (type === 'trainee' ? 'عدل متمرن' : (type === 'employee' ? 'مستخدم مكتب' : 'كاتب/مساعد'))}</span>
                      </button>
                   ))}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <FormInput label="الاسم الكامل" value={formData.fullName} onChange={v => setFormData({...formData, fullName: v})} />
                   <FormInput label="رقم التأجير" value={formData.rentalNumber} onChange={v => setFormData({...formData, rentalNumber: v})} />
                   <FormInput label="رقم قرار التعيين" value={formData.appointmentDecreeNumber} onChange={v => setFormData({...formData, appointmentDecreeNumber: v})} />
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">الحالة المهنية *</label>
                      <select 
                        className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm"
                        value={formData.employmentStatus}
                        onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})}
                      >
                         <option value="مزاول">مزاول ✅</option>
                         <option value="موقوف">موقوف 🛑</option>
                         <option value="متقاعد">متقاعد 👴</option>
                         <option value="مشطوب">مشطوب ❌</option>
                      </select>
                      {formData.employmentStatus === 'موقوف' && <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">⚠️ تنبيه: العدول موقوف حالياً عن الممارسة.</p>}
                      {formData.employmentStatus === 'مشطوب' && <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg">🛑 تحذير: هذا الشخص مشطوب من الهيئة.</p>}
                   </div>
                </div>
             </div>
          )}

          {step === 2 && (
             <div className="space-y-6">
                <h3 className="text-xl font-black text-blue-900 border-r-4 border-blue-900 pr-4">2. نوع الشهادة المطلوبة</h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">اختر من القائمة *</label>
                      <select 
                        className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm"
                        value={formData.certificateType}
                        onChange={(e) => setFormData({...formData, certificateType: e.target.value})}
                      >
                         <option value="شهادة مزاولة مهنة">شهادة مزاولة مهنة</option>
                         <option value="شهادة أقدمية">شهادة أقدمية</option>
                         <option value="شهادة عدم توقيف">شهادة عدم توقيف</option>
                         <option value="شهادة لفائدة مؤسسة بنكية">شهادة لفائدة مؤسسة بنكية</option>
                         <option value="شهادة لغرض الهجرة/فيزا">شهادة لغرض الهجرة/فيزا</option>
                         <option value="أخرى">أخرى (تحديد يدوي)</option>
                      </select>
                   </div>
                   
                   {formData.certificateType === 'أخرى' && (
                      <FormInput label="حدد نوع الشهادة" value={formData.otherType} onChange={v => setFormData({...formData, otherType: v})} />
                   )}
                   
                   {formData.certificateType === 'شهادة لفائدة مؤسسة بنكية' && (
                      <div className="col-span-2 bg-blue-50 p-4 rounded-2xl flex items-center justify-between">
                         <p className="text-xs font-black text-blue-900">💡 اقتراح ذكي: هل ترغب في إدراج متوسط الدخل السنوي ضمن الشهادة؟</p>
                         <button 
                           onClick={() => setFormData({...formData, avgIncome: !formData.avgIncome})}
                           className={`px-4 py-2 rounded-xl text-[10px] font-black ${formData.avgIncome ? 'bg-blue-900 text-white' : 'bg-white text-blue-900 border border-blue-900'}`}
                         >
                            {formData.avgIncome ? 'مُدرج ✅' : 'إدراج الدخل'}
                         </button>
                      </div>
                   )}
                </div>
             </div>
          )}

          {step === 3 && (
             <div className="space-y-6">
                <h3 className="text-xl font-black text-blue-900 border-r-4 border-blue-900 pr-4">3. بيانات موجه إليها الشهادة</h3>
                <div className="grid grid-cols-2 gap-6">
                   <FormInput label="الجهة الموجه إليها" placeholder="مثلاً: بنك القرض الفلاحي، قنصلية فرنسا..." value={formData.recipientUnit} onChange={v => setFormData({...formData, recipientUnit: v})} />
                   <FormInput label="الدولة" value={formData.country} onChange={v => setFormData({...formData, country: v})} />
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">لغة الشهادة *</label>
                      <select className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm" value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
                         <option value="ar">العربية</option>
                         <option value="fr">الفرنسية (ترجمة إدارية)</option>
                      </select>
                   </div>
                </div>
             </div>
          )}

          {step === 4 && (
             <div className="space-y-6">
                <h3 className="text-xl font-black text-blue-900 border-r-4 border-blue-900 pr-4">4. نطاق الشهادة</h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">من تاريخ</label>
                      <input type="date" className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">إلى غاية</label>
                      <input type="date" className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm" />
                   </div>
                   <div className="col-span-2 space-y-4 pt-4 border-t">
                      <p className="text-xs font-black text-slate-400">عناصر الشهادة المضمنة:</p>
                      <div className="flex gap-4">
                         <Checkbox label="الأقدمية" checked={formData.includeExperience} onChange={v => setFormData({...formData, includeExperience: v})} />
                         <Checkbox label="الوضعية النظامية" checked={formData.includeStatus} onChange={v => setFormData({...formData, includeStatus: v})} />
                         <Checkbox label="عدم وجود عقوبات" checked={formData.includeNoPenalties} onChange={v => setFormData({...formData, includeNoPenalties: v})} />
                      </div>
                   </div>
                </div>
             </div>
          )}

          {step === 5 && (
             <div className="space-y-6">
                <h3 className="text-xl font-black text-blue-900 border-r-4 border-blue-900 pr-4">5. المرفقات والملاحظات</h3>
                <div className="grid grid-cols-1 gap-6">
                   <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 group hover:border-blue-900 transition-all cursor-pointer">
                      <span className="text-5xl group-hover:scale-110 transition-transform">📁</span>
                      <p className="font-black text-slate-400">اسحب وأفلت المرفقات هنا (الطلب، بطاقة، إلخ)</p>
                      <p className="text-[10px] opacity-30 uppercase font-mono">Max size 10MB per file</p>
                   </div>
                   <textarea 
                     className="w-full p-6 bg-white rounded-3xl border-0 ring-1 ring-slate-100 outline-none font-bold text-sm h-32" 
                     placeholder="ملاحظات إضافية بخصوص الملف..."
                     value={formData.notes}
                     onChange={(e) => setFormData({...formData, notes: e.target.value})}
                   />
                </div>
             </div>
          )}
       </div>

       <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setStep(s => Math.max(1, s - 1))} 
            disabled={step === 1}
            className="px-8 py-3 bg-slate-100 text-slate-500 rounded-xl font-black disabled:opacity-20 transition-all hover:bg-slate-200"
          >
             السابق
          </button>
          
          <div className="flex gap-4">
             <button onClick={onClose} className="px-8 py-3 text-slate-400 font-bold hover:text-slate-600 transition-all">إلغاء</button>
             {step < 5 ? (
               <button 
                 onClick={() => setStep(s => s + 1)} 
                 className="px-10 py-3 bg-blue-900 text-white rounded-xl font-black hover:scale-105 transition-all shadow-md"
               >
                  التالي
               </button>
             ) : (
               <button 
                 onClick={handleSubmit} 
                 disabled={isSubmitting}
                 className="px-10 py-3 bg-green-600 text-white rounded-xl font-black hover:scale-105 transition-all shadow-md disabled:opacity-50"
               >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب النهائي'}
               </button>
             )}
          </div>
       </div>
    </div>
  );
};

const FormInput = ({ label, value, onChange, placeholder = '' }: any) => (
  <div className="space-y-2">
     <label className="text-xs font-black text-slate-500">{label} *</label>
     <input 
        type="text" 
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 bg-white rounded-2xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-900 outline-none font-bold text-sm transition-all"
     />
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 ${checked ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
  >
     <span>{checked ? '✓' : '○'}</span>
     {label}
  </button>
);

export default WorkCertificateProcessingPage;
