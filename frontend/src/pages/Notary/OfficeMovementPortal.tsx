import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import OfficeMovementForm from './OfficeMovementForm';
import { OfficeMovementDocumentView } from '../../components/OfficeMovementDocumentView';
import { OfficeMovementApprovalTemplate } from '../../components/OfficeMovementApprovalTemplate';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
};

const OfficeMovementPortal: React.FC = () => {
  const { user, notaryProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'list' | 'responses' | 'archive'>('dashboard');
  const [selectedRequestView, setSelectedRequestView] = useState<any>(null);
  const [selectedTrackingView, setSelectedTrackingView] = useState<any>(null);
  const [selectedApprovalView, setSelectedApprovalView] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterType, setFilterType] = useState('الكل');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async (elementId: string, filename: string) => {
    setIsExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch office movement notifications
  const { data: movementsList, isLoading: listLoading, refetch: refetchMovements } = 
    trpc.permissions.getOfficeMovements.useQuery({ notaryId: user?.id });

  // Mutation for creating a movement request
  const createMutation = trpc.permissions.createOfficeMovement.useMutation();

  const filteredList = useMemo(() => {
    if (!movementsList) return [];
    
    return movementsList.filter((p: any) => {
      const matchesSearch = !searchQuery || 
        p.request_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.involved_names?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reception_place?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'الكل' || p.status === filterStatus;
      const matchesType = filterType === 'الكل' || p.certificate_type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [movementsList, searchQuery, filterStatus, filterType]);

  const stats = useMemo(() => {
    const list = movementsList || [];
    const now = new Date();
    const delayedThreshold = 48 * 60 * 60 * 1000; // 48 hours

    return {
      totalSubmitted: list.length,
      pending: list.filter(n => n.status === 'قيد_المعالجة').length,
      approved: list.filter(n => n.decision_type === 'موافقة').length,
      rejected: list.filter(n => n.decision_type === 'رفض').length,
      delayed: list.filter(n => n.status === 'قيد_المعالجة' && (now.getTime() - new Date(n.created_at).getTime()) > delayedThreshold).length,
      approvalRate: list.length > 0 ? Math.round((list.filter(n => n.decision_type === 'موافقة').length / list.length) * 100) : 0
    };
  }, [movementsList]);

  const chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        label: 'التوجهات الشهرية',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: '#5a0c0b',
        backgroundColor: 'rgba(90, 12, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not logged in');
      
      let attachmentsData: any[] = [];
      if (formData.attachments) {
        const filesToUpload = Array.isArray(formData.attachments) ? formData.attachments : [formData.attachments];
        const filePromises = filesToUpload.map(async (file: any) => {
          if (file instanceof File) {
            const base64 = await toBase64(file);
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              base64
            };
          }
          return file;
        });
        attachmentsData = await Promise.all(filePromises);
      }

      const payload = {
        notaryId: user.id,
        fullName: formData.fullName || user.full_name || '',
        professionalNumber: formData.professionalNumber || (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
        appointmentDecreeNumber: formData.appointmentDecreeNumber || notaryProfile?.appointment_decree_number || '',
        appointmentDate: formData.appointmentDate || (notaryProfile as any)?.appointment_date || '',
        officeNumber: formData.officeNumber || (notaryProfile as any)?.office_number || '',
        jurisdiction: notaryProfile?.primary_court || '',
        targetCourt: formData.targetCourt || notaryProfile?.primary_court || '',
        certificateType: formData.certificateType,
        receptionPlace: formData.receptionPlace,
        receptionDate: formData.receptionDate,
        receptionTime: formData.receptionTime,
        writingPlace: formData.writingPlace,
        involvedNames: Array.isArray(formData.parties) 
          ? formData.parties.map((p: any) => `${p.name} (${p.idCard})`).join(', ') 
          : formData.involvedNames,
        reasonForMovement: formData.reasonForMovement,
        recipientType: formData.recipientType,
        requestedDuration: formData.requestedDuration,
        durationUnit: formData.durationUnit,
        notes: formData.notes || '',
        attachments: attachmentsData,
        data: {
            ...formData,
            ip_address: '192.168.1.1', // Placeholder, would be better on backend
            timestamp: new Date().toISOString()
        }
      };

      await createMutation.mutateAsync(payload);
      alert('✓ تم إرسال إشعار التوجه بنجاح');
      setActiveTab('list');
      refetchMovements();
    } catch (error: any) {
      alert('✗ فشل في الإرسال: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4 font-maghribi">
              <span className="p-3 bg-red-950/5 rounded-2xl text-3xl">📍</span>
              بوابة إشعار التوجه خارج مكتب التعيين
            </h2>
            <p className="mt-3 text-slate-500 font-medium text-sm">نظام تتبع حركية العدول وتلقي الإشهادات خارج المقر الأصلي</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'dashboard', label: 'الإحصائيات', icon: '📊' },
              { id: 'create', label: 'إرسال إشعار', icon: '📝' },
              { id: 'list', label: 'لائحة الإشعارات', icon: '⏱️' },
              { id: 'responses', label: 'الأجوبة والقرارات', icon: '✅' },
              { id: 'archive', label: 'الأرشيف', icon: '📁' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-red-950 text-[#E6BE8A] shadow-lg shadow-red-950/20' 
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard label="الطلبات الجديدة" value={stats.pending} color="blue" icon="🔵" />
              <StatCard label="المقبولة" value={stats.approved} color="green" icon="🟢" />
              <StatCard label="المرفوضة" value={stats.rejected} color="red" icon="🔴" />
              <StatCard label="تنبيه تأخير" value={stats.delayed} color="amber" icon="🟡" />
              <StatCard label="نسبة الموافقة" value={`${stats.approvalRate}%`} color="indigo" icon="⚖️" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">📈 رسم بياني شهري للتوجهات</h3>
                    <select className="bg-slate-50 border-0 rounded-xl px-4 py-2 font-bold text-xs">
                        <option>2026</option>
                        <option>2025</option>
                    </select>
                  </div>
                  <div className="h-64">
                    <Line 
                        data={chartData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true } }
                        }} 
                    />
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-black text-slate-800 mb-6">➕ إجراء سريع</h3>
                  <button 
                    onClick={() => setActiveTab('create')}
                    className="w-full bg-red-950 text-[#E6BE8A] p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-lg"
                  >
                    <span className="text-4xl text-white">➕</span>
                    <span className="text-xl font-black">تسجيل إشعار جديد</span>
                  </button>
                  
                  <div className="mt-8 space-y-4">
                     <p className="font-black text-slate-400 text-xs uppercase tracking-widest border-b pb-2">آخر النشاطات</p>
                     {movementsList?.slice(0, 3).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                           <span className="text-xl">📄</span>
                           <div className="text-right flex-1">
                              <p className="text-xs font-black text-slate-800 truncate w-32">{m.request_number}</p>
                              <p className="text-[10px] font-bold text-slate-400">{m.reception_place}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto animate-fadeIn">
             <OfficeMovementForm 
                notaryData={{
                  fullName: user?.full_name || '',
                  professionalNumber: (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
                  officeNumber: (notaryProfile as any)?.office_number || '',
                  jurisdiction: notaryProfile?.primary_court || '',
                  appointmentDecreeNumber: notaryProfile?.appointment_decree_number || '',
                  appointmentDate: (notaryProfile as any)?.appointment_date || '',
                }}
                onSubmit={handleFormSubmit}
                onCancel={() => setActiveTab('dashboard')}
                isSubmitting={isSubmitting}
             />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-fadeIn">
            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="relative md:col-span-2">
                <input
                  type="text"
                  placeholder="بحث برقم الإشعار، المكان، أو أسماء الأطراف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 shadow-inner rounded-2xl focus:ring-2 focus:ring-red-950/20 outline-none font-bold"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl grayscale">🔍</span>
              </div>
              
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border-0 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none"
              >
                <option value="الكل">جميع الحالات</option>
                <option value="قيد_المعالجة">قيد المعالجة</option>
                <option value="موافقة">مقبولة</option>
                <option value="رفض">مرفوضة</option>
              </select>

              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border-0 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none"
              >
                <option value="الكل">جميع أنواع العقود</option>
                <option value="رسم_نكاح">رسم نكاح</option>
                <option value="عقد_بيع">عقد بيع</option>
                <option value="وكالة">وكالة</option>
                <option value="آخرى">آخرى</option>
              </select>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button 
                  onClick={() => refetchMovements()} 
                  className="px-6 py-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100 font-bold flex items-center gap-2"
                >
                  <span>🔄</span> تحديث البيانات
                </button>
                <button 
                  className="px-6 py-3 bg-red-950/5 text-red-950 rounded-2xl hover:bg-red-950 hover:text-white transition-all border border-red-950/10 font-bold flex items-center gap-2 group"
                >
                  <span className="group-hover:scale-125 transition-transform">📊</span> 
                  تصدير التقرير الدوري (Excel)
                </button>
              </div>
              <p className="text-slate-400 font-bold text-sm">عدد النتائج: {filteredList?.length || 0}</p>
            </div>

            <div className="overflow-x-auto text-right">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-red-950 text-[#E6BE8A]">
                    <th className="p-6 font-black text-sm uppercase tracking-wider">المرجع</th>
                    <th className="p-6 font-black text-sm uppercase tracking-wider">المكان والزمان</th>
                    <th className="p-6 font-black text-sm uppercase tracking-wider">الأطراف</th>
                    <th className="p-6 font-black text-sm uppercase tracking-wider">الحالة</th>
                    <th className="p-6 font-black text-sm uppercase tracking-wider text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredList?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-all group border-b">
                      <td className="p-6">
                         <span className="font-black text-slate-800 text-lg">{p.request_number}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                           <span className="font-black text-slate-700 text-xs">{p.reception_place}</span>
                           <span className="text-[10px] text-slate-400 font-bold">{p.reception_date} | {p.reception_time}</span>
                        </div>
                      </td>
                      <td className="p-6 font-bold text-slate-600 text-xs truncate max-w-[200px]">
                        {p.involved_names}
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 ${
                          p.status === 'قيد_المعالجة' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => setSelectedRequestView(p)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center">👁️</button>
                          <button onClick={() => setSelectedTrackingView(p)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center">📍</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-fadeIn text-right">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <span>✅</span> الأجوبة والقرارات الصادرة (القضاء والمجلس الجهوي)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {movementsList?.filter((m: any) => m.status === 'مكتمل' || m.decision_type || m.data?.council_decision || m.data?.judge_decision).map((m: any) => {
                const hasJudgeDecision = Boolean(m.data?.judge_decision?.decision_type || (m.recipient_type !== 'regional_council' && m.decision_type));
                const judgeDecisionType = m.data?.judge_decision?.decision_type || m.decision_type;
                const hasCouncilDecision = Boolean(m.data?.council_decision?.decision_type || (m.recipient_type === 'regional_council' && m.decision_type));
                const councilDecisionType = m.data?.council_decision?.decision_type || (m.recipient_type === 'regional_council' ? m.decision_type : null);

                return (
                  <div key={m.id} className="p-8 rounded-3xl border-2 border-slate-50 bg-slate-50/30 hover:bg-white hover:border-red-950/20 transition-all group">
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-2 flex-wrap">
                          {hasJudgeDecision && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${judgeDecisionType === 'موافقة' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               القضاء: {judgeDecisionType}
                            </span>
                          )}
                          {hasCouncilDecision && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${councilDecisionType === 'موافقة' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               المجلس الجهوي: {councilDecisionType}
                            </span>
                          )}
                          {!hasJudgeDecision && !hasCouncilDecision && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                               قيد الدراسة
                            </span>
                          )}
                        </div>
                        <p className="font-black text-slate-400 text-xs">{m.request_number}</p>
                     </div>
                     <p className="text-xl font-bold text-slate-800 mb-2">إشعار توجه: {m.reception_place}</p>
                     <p className="text-sm text-slate-500 font-bold mb-2">نوع الإشهاد: {m.certificate_type}</p>
                     <div className="flex flex-col gap-1 mb-6 border-t pt-4 text-xs font-bold text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">الجهة الموجه إليها:</span>
                          <span className="text-red-950">
                            {m.recipient_type === 'both' ? 'قاضي التوثيق والمجلس الجهوي' : m.recipient_type === 'regional_council' ? 'المجلس الجهوي للعدول' : 'قاضي التوثيق'}
                          </span>
                        </div>
                        {m.judge_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">الموقع / المرجع:</span>
                            <span className="text-slate-800">{m.judge_name}</span>
                          </div>
                        )}
                     </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                       {(hasJudgeDecision || m.recipient_type === 'judge' || m.recipient_type === 'both') && (
                         <button 
                            disabled={!hasJudgeDecision}
                            onClick={() => setSelectedApprovalView({
                              ...m,
                              ...(m.data?.judge_decision || {}),
                              authorityType: 'judge'
                            })}
                            className="flex-1 bg-red-950 text-[#E6BE8A] py-3 rounded-xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                         >
                            {hasJudgeDecision ? 'عرض قرار القاضي ⚖️' : 'قرار القاضي (قيد الانتظار)'}
                         </button>
                       )}
                       {(hasCouncilDecision || m.recipient_type === 'regional_council' || m.recipient_type === 'both') && (
                         <button 
                            disabled={!hasCouncilDecision}
                            onClick={() => setSelectedApprovalView({
                              ...m,
                              decision_type: m.data?.council_decision?.decision_type || m.decision_type,
                              decision_reasoning: m.data?.council_decision?.decision_reasoning || m.decision_reasoning,
                              decided_at: m.data?.council_decision?.decided_at || m.decided_at,
                              authority_name: m.data?.council_decision?.authorityName || m.judge_name,
                              authorityType: 'regional_council'
                            })}
                            className="flex-1 bg-slate-900 text-[#E6BE8A] py-3 rounded-xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                         >
                            {hasCouncilDecision ? 'عرض قرار المجلس الجهوي 📜' : 'قرار المجلس (قيد الانتظار)'}
                         </button>
                       )}
                     </div>
                  </div>
                );
              })}
              {movementsList?.filter((m: any) => m.status === 'مكتمل' || m.decision_type || m.data?.council_decision || m.data?.judge_decision).length === 0 && (
                <div className="col-span-2 py-20 text-center text-slate-400 font-bold">
                   <p className="text-4xl mb-4">🔔</p>
                   <p>لا توجد قرارات نهائية حتى الآن</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-fadeIn">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">📁 أرشيف إشعارات التوجه</h3>
                <span className="text-slate-400 font-bold">إجمالي المؤرشف: {movementsList?.length || 0}</span>
             </div>
             <div className="space-y-4">
                {movementsList?.map((m: any) => {
                  const hasJudge = Boolean(m.data?.judge_decision?.decision_type || (m.recipient_type !== 'regional_council' && m.decision_type));
                  const hasCouncil = Boolean(m.data?.council_decision?.decision_type || (m.recipient_type === 'regional_council' && m.decision_type));

                  return (
                    <div key={m.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <p className="font-black text-slate-800">{m.request_number}</p>
                             <p className="text-xs text-slate-400 font-bold">{m.created_at ? new Date(m.created_at).toLocaleDateString('ar-MA') : '---'}</p>
                          </div>
                       </div>
                       <div className="flex gap-2 flex-wrap">
                          <button onClick={() => setSelectedRequestView(m)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black hover:bg-slate-900 hover:text-white transition-all">إشعار التوجه</button>
                          {hasJudge && (
                             <button 
                               onClick={() => setSelectedApprovalView({
                                 ...m,
                                 ...(m.data?.judge_decision || {}),
                                 authorityType: 'judge'
                               })} 
                               className="px-4 py-2 bg-red-950/5 text-red-950 rounded-xl text-xs font-black hover:bg-red-950 hover:text-white transition-all"
                             >
                               قرار القاضي
                             </button>
                          )}
                          {hasCouncil && (
                             <button 
                               onClick={() => setSelectedApprovalView({
                                 ...m,
                                 decision_type: m.data?.council_decision?.decision_type || m.decision_type,
                                 decision_reasoning: m.data?.council_decision?.decision_reasoning || m.decision_reasoning,
                                 decided_at: m.data?.council_decision?.decided_at || m.decided_at,
                                 authority_name: m.data?.council_decision?.authorityName || m.judge_name,
                                 authorityType: 'regional_council'
                               })} 
                               className="px-4 py-2 bg-emerald-950/5 text-emerald-900 rounded-xl text-xs font-black hover:bg-emerald-800 hover:text-white transition-all"
                             >
                               قرار المجلس الجهوي
                             </button>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* Modal View Logic - Request Document */}
      {selectedRequestView && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-fadeIn h-screen overflow-hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full flex flex-col shadow-3xl overflow-hidden relative">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex gap-3">
                   <button 
                      onClick={() => handleExportPDF('printable-movement-doc', `إشعار_توجه_${selectedRequestView.request_number}`)}
                      disabled={isExporting}
                      className="px-6 py-2.5 bg-red-950 text-[#E6BE8A] rounded-xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                   >
                      {isExporting ? '...جاري التحميل' : '📥 تحميل بصيغة PDF'}
                   </button>
                </div>
                <button onClick={() => setSelectedRequestView(null)} className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                <OfficeMovementDocumentView notification={selectedRequestView} />
             </div>
          </div>
        </div>
      )}

      {/* Modal View Logic - Approval Document */}
      {selectedApprovalView && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-fadeIn h-screen overflow-hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full flex flex-col shadow-3xl overflow-hidden relative">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex gap-3">
                   <button 
                      onClick={() => handleExportPDF('printable-movement-decision', `قرار_توجه_${selectedApprovalView.request_number}`)}
                      disabled={isExporting}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                   >
                      {isExporting ? '...جاري التحميل' : '📥 تحميل القرار الرسمي'}
                   </button>
                </div>
                <button onClick={() => setSelectedApprovalView(null)} className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                <OfficeMovementApprovalTemplate notification={selectedApprovalView} />
             </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {selectedTrackingView && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-12 relative shadow-3xl text-right">
             <button onClick={() => setSelectedTrackingView(null)} className="absolute top-8 left-8 text-2xl bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">✕</button>
             <h3 className="text-3xl font-black text-slate-800 mb-10 border-b pb-6">تتبع مسار الإشعار رقم {selectedTrackingView.request_number}</h3>
             <div className="space-y-12 relative before:absolute before:right-6 before:top-2 before:bottom-2 before:w-1 before:bg-slate-100">
                <TimelineItem 
                  status="completed" 
                  title="إرسال الإشعار" 
                  date={new Date(selectedTrackingView.created_at).toLocaleString('ar-MA')} 
                  description="تم إرسال الإشعار بنجاح إلى المصالح القضائية"
                />
                <TimelineItem 
                  status={selectedTrackingView.status === 'قيد_المعالجة' ? 'active' : 'completed'} 
                  title="قيد المعالجة" 
                  date={selectedTrackingView.status === 'قيد_المعالجة' ? 'جاري حالياً' : 'مكتمل'} 
                  description="يتم حالياً مراجعة البيانات من طرف القاضي أو رئيس المجلس"
                />
                <TimelineItem 
                  status={selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                  title="قرار المصلحة" 
                  date={selectedTrackingView.decided_at ? new Date(selectedTrackingView.decided_at).toLocaleString('ar-MA') : 'بانتظار القرار'} 
                  description={selectedTrackingView.decision_type ? `تم اتخاذ قرار بالـ ${selectedTrackingView.decision_type}` : 'لم يتم اتخاذ قرار بعد'}
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TimelineItem = ({ status, title, date, description }: any) => (
  <div className="relative pr-14 group">
    <div className={`absolute right-4 top-1 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-all ${
      status === 'completed' ? 'bg-emerald-500 scale-125' : 
      status === 'active' ? 'bg-amber-500 animate-pulse scale-150' : 'bg-slate-200'
    }`} />
    <div className="bg-slate-50 p-6 rounded-2xl group-hover:bg-white border-2 border-transparent group-hover:border-slate-100 transition-all">
      <div className="flex justify-between items-center mb-1">
         <h4 className="font-black text-lg text-slate-800">{title}</h4>
         <span className="text-[10px] font-bold text-slate-400">{date}</span>
      </div>
      <p className="text-xs text-slate-500 font-bold">{description}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, color, icon }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`p-8 rounded-[2rem] border ${colors[color]} shadow-sm relative overflow-hidden group`}>
      <div className="text-4xl absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-700">{icon}</div>
      <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
};

const DetailItem = ({ label, value, span }: any) => (
  <div className={`space-y-1 ${span ? 'col-span-2' : ''}`}>
    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-slate-800 bg-slate-50 p-4 rounded-2xl border border-slate-100">{value}</p>
</div>
);

export default OfficeMovementPortal;
