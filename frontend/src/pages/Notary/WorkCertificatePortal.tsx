import React, { useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import WorkCertificateForm from './WorkCertificateForm';
import { WorkCertificateDocumentView } from '../../components/WorkCertificateDocumentView';
import { WorkCertificateApprovalTemplate } from '../../components/WorkCertificateApprovalTemplate';

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

const WorkCertificatePortal: React.FC = () => {
  const { user, notaryProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'list' | 'certificate_responses' | 'archive'>('dashboard');
  const [selectedDecision, setSelectedDecision] = useState<any>(null);
  const [selectedRequestView, setSelectedRequestView] = useState<any>(null);
  const [selectedTrackingView, setSelectedTrackingView] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch work certificates
  const { data: certificatesList, isLoading: listLoading, refetch: refetchCertificates } = 
    trpc.permissions.getWorkCertificates.useQuery({ notaryId: user?.id });

  // Mutation for creating a work certificate request
  const createMutation = trpc.permissions.createWorkCertificate.useMutation();

  const filteredList = useMemo(() => {
    if (!certificatesList) return [];
    if (!searchQuery) return certificatesList;
    const query = searchQuery.toLowerCase();
    return certificatesList.filter((p: any) => 
      p.request_number?.toLowerCase().includes(query) ||
      p.status?.toLowerCase().includes(query) ||
      p.notary_name?.toLowerCase().includes(query)
    );
  }, [certificatesList, searchQuery]);

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not logged in');
      
      // Handle file uploads by converting to base64
      let attachmentsData: any[] = [];
      if (formData.attachments) {
        // Handle specific attachment fields from WorkCertificateForm
        const attachmentEntries = Object.entries(formData.attachments);
        const filePromises = attachmentEntries.map(async ([key, file]: [string, any]) => {
          if (file instanceof File) {
            const base64 = await toBase64(file);
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              base64
            };
          }
          return null;
        });
        const results = await Promise.all(filePromises);
        attachmentsData = results.filter(r => r !== null);
      }

      const payload = {
        notaryId: user.id,
        fullName: formData.fullName || user.full_name || '',
        professionalNumber: formData.professionalNumber || (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
        appointmentDecreeNumber: formData.appointmentDecreeNumber || notaryProfile?.appointment_decree_number || '',
        appointmentDate: formData.appointmentDate || (notaryProfile as any)?.appointment_date || '',
        officeNumber: formData.officeNumber || (notaryProfile as any)?.office_number || '',
        jurisdiction: formData.court || notaryProfile?.primary_court || '',
        targetCourt: formData.court || notaryProfile?.primary_court || '',
        certificateType: 'شهادة عمل',
        receptionDate: new Date().toISOString().split('T')[0],
        notes: formData.notes || '',
        attachments: attachmentsData,
        data: formData
      };

      await createMutation.mutateAsync(payload);
      alert('✓ تم إرسال طلب شهادة العمل بنجاح');
      setActiveTab('list');
      refetchCertificates();
    } catch (error: any) {
      alert('✗ فشل في الإرسال: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const list = certificatesList || [];
    return {
      totalSubmitted: list.length,
      pending: list.filter(n => n.status === 'قيد_المعالجة').length,
      approved: list.filter(n => n.decision_type === 'موافقة').length,
      rejected: list.filter(n => n.decision_type === 'رفض').length,
    };
  }, [certificatesList]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4 font-maghribi">
              <span className="p-3 bg-red-950/5 rounded-2xl text-3xl">📋</span>
              بوابة طلبات شهادة العمل
            </h2>
            <p className="mt-3 text-slate-500 font-medium text-sm">نظام إلكتروني موحد لإصدار وتصديق شهادات العمل الخاصة بالعدول</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'dashboard', label: 'لوحة القيادة', icon: '📊' },
              { id: 'create', label: 'إنشاء طلب', icon: '📝' },
              { id: 'list', label: 'تتبع الطلبات', icon: '⏱️' },
              { id: 'certificate_responses', label: 'الشهادات المنجزة', icon: '✅' },
              { id: 'archive', label: 'الأرشيف', icon: '📁' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-red-950 text-[#E6BE8A] shadow-lg shadow-red-950/20 scale-105'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 min-h-[600px] relative overflow-hidden">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard label="إجمالي الطلبات" value={stats.totalSubmitted} color="blue" icon="📂" />
            <StatCard label="طلبات قيد المراجعة" value={stats.pending} color="amber" icon="⏳" />
            <StatCard label="شهادات جاهزة" value={stats.approved} color="green" icon="📜" />
            <StatCard label="طلبات مرفوضة" value={stats.rejected} color="red" icon="🚫" />
          </div>
        )}

        {activeTab === 'create' && (
          <WorkCertificateForm 
            notaryData={{
              fullName: user?.full_name || '',
              professionalNumber: (notaryProfile as any)?.professional_number || notaryProfile?.appointment_decree_number || '',
              officeNumber: notaryProfile?.appointment_decree_number || '',
              jurisdiction: notaryProfile?.primary_court || '',
              appointmentDecreeNumber: notaryProfile?.appointment_decree_number || '',
              appointmentDate: (notaryProfile as any)?.appointment_date || '',
              appellateCourt: notaryProfile?.appellate_court || '',
              officeAddress: notaryProfile?.office_address || '',
              phone: notaryProfile?.phone || ''
            }}
            onSubmit={handleFormSubmit} 
            onCancel={() => setActiveTab('list')}
            isSubmitting={isSubmitting}
          />
        )}

        {activeTab === 'list' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="relative w-full max-w-xl">
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو الحالة أو التاريخ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border-0 shadow-sm rounded-2xl focus:ring-2 focus:ring-red-950/20 outline-none font-bold placeholder:text-slate-300"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl grayscale">🔍</span>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => refetchCertificates()} className="p-4 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-colors border border-slate-100" title="تحديث البيانات">🔄</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-red-950 text-[#E6BE8A]">
                    <th className="p-6 font-bold text-sm uppercase tracking-wider">رقم الطلب</th>
                    <th className="p-6 font-bold text-sm uppercase tracking-wider text-center">تاريخ الإرسال والوقت</th>
                    <th className="p-6 font-bold text-sm uppercase tracking-wider">الحالة الحالية</th>
                    <th className="p-6 font-bold text-sm uppercase tracking-wider text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredList?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-6">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800 text-lg">{p.request_number}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.target_court || 'محكمة ابتدائية'}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        {p.created_at ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                              <span className="text-slate-300">📅</span>
                              {new Date(p.created_at).toLocaleDateString('ar-MA')}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                              <span className="text-slate-300">🕒</span>
                              {new Date(p.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : '---'}
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm border ${
                          p.status === 'قيد_المعالجة' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          p.status === 'مقبول' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'قيد_المعالجة' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setSelectedRequestView(p)} 
                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="عرض الطلب"
                          >
                            👁️
                          </button>
                          <button 
                            onClick={() => setSelectedTrackingView(p)} 
                            className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="تتبع المسار"
                          >
                            📍
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                         <div className="flex flex-col items-center gap-4 opacity-20">
                            <span className="text-6xl">🔍</span>
                            <p className="text-xl font-bold">لا توجد نتائج تطابق بحثك حالياً</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'certificate_responses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            {filteredList?.filter((p: any) => p.decision_type).map((p: any) => (
              <div key={p.id} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-red-950/5 rounded-[1.5rem] text-3xl">📜</div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${p.decision_type === 'موافقة' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {p.decision_type}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2 font-maghribi">شهادة عمل رسمية</h4>
                <p className="text-slate-500 font-bold mb-4 text-sm">الرقم المرجعي بالديوان: <span className="text-red-950 font-mono">{p.request_number}</span></p>
                <div className="flex items-center gap-4 py-4 border-t border-slate-50 mt-6">
                   <button 
                    onClick={() => setSelectedDecision(p)}
                    className="flex-1 bg-red-950 text-[#E6BE8A] py-4 rounded-2xl font-bold shadow-lg shadow-red-950/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                   >
                    تحميل ومشاهدة الشهادة
                   </button>
                   <button 
                    onClick={() => setSelectedTrackingView(p)}
                    className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors"
                   >
                    📍
                   </button>
                </div>
              </div>
            ))}
            {filteredList?.filter((p: any) => p.decision_type).length === 0 && (
                <div className="col-span-full p-20 text-center opacity-30">
                   <div className="text-6xl mb-6">📝</div>
                   <h3 className="text-2xl font-bold font-maghribi">قائمة الشهادات المنجزة فارغة حالياً</h3>
                   <p className="mt-2 text-sm font-medium">بمجرد توقيع الشهادة من طرف القاضي، ستظهر هنا فوراً</p>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Modals Strategy */}
      {selectedRequestView && (
        <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 shadow-3xl relative border border-slate-200">
            <button onClick={() => setSelectedRequestView(null)} className="absolute top-8 left-8 w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
            <WorkCertificateDocumentView 
               data={selectedRequestView.data} 
               notaryData={{
                 fullName: selectedRequestView.notary_name,
                 professionalNumber: selectedRequestView.notary_professional_number,
                 jurisdiction: selectedRequestView.jurisdiction,
               }} 
            />
            <div className="mt-10 flex justify-end gap-4 no-print">
               <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all">طباعة الطلب 🖨️</button>
               <button onClick={() => setSelectedRequestView(null)} className="bg-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {selectedDecision && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 shadow-3xl relative">
            <button onClick={() => setSelectedDecision(null)} className="absolute top-8 left-8 w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
            <WorkCertificateApprovalTemplate 
              notification={selectedDecision} 
            />
            <div className="mt-10 flex justify-end gap-4 no-print">
               <button onClick={() => window.print()} className="bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all">طباعة الشهادة الرسمية ✅</button>
               <button onClick={() => setSelectedDecision(null)} className="bg-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-bold">رجوع</button>
            </div>
          </div>
        </div>
      )}

      {selectedTrackingView && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-slate-100" dir="rtl">
            <div className="bg-gradient-to-br from-red-950 to-[#3b0d0c] p-10 text-white relative overflow-hidden">
               <button onClick={() => setSelectedTrackingView(null)} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all">✕</button>
               <div className="relative">
                 <div className="inline-block px-4 py-1.5 bg-[#E6BE8A] text-[#3b0d0c] rounded-full text-xs font-bold mb-4">مسار الوثيقة</div>
                 <h3 className="text-3xl font-black font-maghribi">تتبع حالة شهادة العمل</h3>
                 <div className="mt-4 flex flex-col gap-1">
                   <p className="text-white/60 font-medium flex items-center gap-2">الرقم المرجعي: <span className="text-[#E6BE8A] font-bold">{selectedTrackingView.request_number}</span></p>
                   <p className="text-white/60 text-xs font-bold font-mono">Sent on: {new Date(selectedTrackingView.created_at).toLocaleString('ar-MA')}</p>
                 </div>
               </div>
            </div>

            <div className="p-10 bg-slate-50/50">
              <div className="relative">
                <div className="absolute right-[19px] top-2 bottom-2 w-1 bg-slate-200 rounded-full overflow-hidden">
                   <div 
                    className="w-full bg-gradient-to-b from-[#E6BE8A] via-red-900 to-red-950 transition-all duration-1000"
                    style={{ height: selectedTrackingView.decision_type ? '100%' : selectedTrackingView.status === 'قيد_المعالجة' ? '50%' : '25%' }}
                   />
                </div>
                <div className="space-y-10">
                  <PortalTrackingStep 
                    title="تقديم الطلب إلكترونياً" 
                    date={selectedTrackingView.created_at} 
                    status="completed" 
                    icon="📤"
                    description="تم إيداع ملف طلب شهادة العمل بنجاح في المنظومة الرقمية."
                  />
                  <PortalTrackingStep 
                    title="المراجعة الإدارية" 
                    date={selectedTrackingView.status === 'قيد_المعالجة' ? "جاري الفحص" : "تمت المراجعة"} 
                    status={selectedTrackingView.status !== 'جديد' ? 'completed' : 'pending'} 
                    icon="⚙️"
                    description="يجري حالياً التحقق من المعطيات المهنية وسجلات العدل."
                  />
                  <PortalTrackingStep 
                    title="توقيع القاضي" 
                    date={selectedTrackingView.decided_at} 
                    status={selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                    icon="🖋️"
                    description="مرحلة المصادقة النهائية والتوقيع الرقمي على الشهادة."
                  />
                  <PortalTrackingStep 
                    title="الشهادة جاهزة" 
                    date={selectedTrackingView.decision_type ? "متاحة الآن" : null} 
                    status={selectedTrackingView.decision_type ? 'completed' : 'pending'} 
                    icon="✅"
                    isLast={true}
                    description="بمجرد التوقيع، تصبح النسخة الرسمية المختومة متاحة للتحميل."
                  />
                </div>
              </div>
              <div className="mt-14 flex justify-center">
                 <button onClick={() => setSelectedTrackingView(null)} className="px-12 py-4 bg-red-950 text-[#E6BE8A] rounded-2xl font-bold text-lg active:scale-95 transition-all">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

const PortalTrackingStep = ({ title, description, status, date, icon, isLast }: any) => {
  return (
    <div className="relative pr-14 group">
      <div className={`absolute right-0 top-0 w-10 h-10 rounded-full z-20 flex items-center justify-center text-xl transition-all duration-500 border-4 ${
        status === 'completed' 
          ? 'bg-red-950 border-[#E6BE8A] shadow-lg scale-110' 
          : 'bg-white border-slate-200 text-slate-300'
      }`}>
        {status === 'completed' ? '✓' : ''}
      </div>
      <div className={`p-6 rounded-3xl border transition-all duration-500 ${
        status === 'completed' ? 'bg-white border-slate-100 shadow-xl' : 'bg-transparent border-dashed border-slate-300 opacity-60'
      }`}>
        <div className="flex justify-between items-center mb-2">
           <h4 className={`text-xl font-bold ${status === 'completed' ? 'text-red-950' : 'text-slate-500'}`}>{icon} {title}</h4>
           {date && <span className="text-[10px] font-bold opacity-40">{typeof date === 'string' ? date : new Date(date).toLocaleDateString('ar-MA')}</span>}
        </div>
        <p className={`text-sm font-medium ${status === 'completed' ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
      </div>
    </div>
  );
};

export default WorkCertificatePortal;
