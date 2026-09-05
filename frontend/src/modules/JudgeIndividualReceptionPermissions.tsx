import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { IndividualReceptionDocumentTemplate } from '../components/IndividualReceptionDocumentTemplate';

interface IndividualReceptionRequest {
  id: string;
  request_number: string;
  notary_name: string;
  notary_professional_number: string;
  certificate_type: string;
  created_at: string;
  status: string;
  decision_type?: string;
  decision_serial_number?: string;
  notes?: string;
  involved_names?: string;
  reception_date?: string;
  notary_office_number?: string;
}

export function JudgeIndividualReceptionPermissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<IndividualReceptionRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [showApprovalModel, setShowApprovalModel] = useState(false);
  const [showRejectionModel, setShowRejectionModel] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<IndividualReceptionRequest | null>(null);

  // Optimized Fetch: Filter at database level instead of client-side
  const { data: requests, refetch, isLoading } = trpc.notifications.getRequestsList.useQuery({
    recipientType: 'judge',
    certificateType: 'INDIVIDUAL_RECEPTION', 
    limit: 100, // Reasonable limit for active review
  });

  const filteredRequests = (requests || []).filter((req: any) => {
    const cert = String(req.certificate_type || '').toLowerCase();
    // Support Arabic labels and the new internal type
    return cert.includes('تلقي') || cert.includes('فردي') || cert.includes('individual_reception');
  });

  const { mutate: recordDecision, isLoading: isMutationLoading } = trpc.notifications.recordDecision.useMutation({
    onSuccess: () => {
      setSelectedRequest(null);
      setDecisionNotes('');
      refetch();
    },
    onError: (err) => {
      console.error('Decision error:', err);
      alert('حدث خطأ أثناء حفظ القرار. يرجى مراجعة سجلات النظام.');
    }
  });

  const isProcessing = isLoading || isMutationLoading;

  const stats = useMemo(() => {
    return {
      total: filteredRequests.length,
      approved: filteredRequests.filter(r => r.status === 'موافق_عليه' || r.decision_type === 'موافقة').length,
      rejected: filteredRequests.filter(r => r.status === 'مرفوض' || r.decision_type === 'رفض').length,
      pending: filteredRequests.filter(r => r.status === 'قيد_المعالجة' || r.status === 'قيد_الدراسة').length,
    };
  }, [filteredRequests]);

  const generateDecisionSerial = () => {
    const year = new Date().getFullYear();
    const serial = String(stats.approved + 1).padStart(5, '0');
    return `CT-50 / ${year} / ${serial}`;
  };

  const handleDecision = async (status: 'موافقة' | 'رفض') => {
    if (!selectedRequest) return;
    if (status === 'رفض' && !decisionNotes.trim()) {
      alert('يجب ذكر سبب الرفض');
      return;
    }

    try {
      const decisionSerial = status === 'موافقة' ? generateDecisionSerial() : undefined;
      
      recordDecision({
        notificationId: selectedRequest.id,
        decisionType: status as any,
        reasoning: decisionNotes || (status === 'موافقة' ? 'تمت الموافقة بناء على المادة 50' : ''),
        internalNotes: decisionNotes,
        decisionSerialNumber: decisionSerial,
      });

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ القرار');
    }
  };

  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية)\s*/, '').trim();
  };

  const renderApprovalModel = () => {
    if (!viewingRequest) return null;

    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 space-y-6 overflow-y-auto max-h-[90vh]">
            <IndividualReceptionDocumentTemplate notification={viewingRequest} documentId="printable-decision-judge" />
            
            <div className="flex gap-4 pt-4 no-print px-12 pb-8">
              <button 
                onClick={() => window.print()}
                className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                <span>طباعة القرار الرسمي</span>
                <span className="text-xl">🖨️</span>
              </button>
              <button 
                onClick={() => setShowApprovalModel(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRejectionModel = () => {
    if (!viewingRequest) return null;

    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 space-y-6 overflow-y-auto max-h-[90vh]">
            <IndividualReceptionDocumentTemplate notification={viewingRequest} documentId="printable-decision-judge" />
            
            <div className="flex gap-4 pt-4 no-print px-12 pb-8">
              <button 
                onClick={() => window.print()}
                className="flex-[2] bg-red-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                <span>طباعة قرار الرفض</span>
                <span className="text-xl">🖨️</span>
              </button>
              <button 
                onClick={() => setShowRejectionModel(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-10 text-center font-black animate-pulse">جاري تحميل طلبات الإذن... ⏳</div>;

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      {/* Header & Dashboard */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <span className="text-3xl">⚖️</span>
              قسم الإذن القضائي بالتلقي الفردي (المادة 50)
            </h2>
            <p className="text-slate-500 font-bold mt-1">إدارة ومراجعة طلبات التلقي الاستثنائية للعدول</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm border border-slate-200 transition-all"
          >
            ← العودة
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard label="إجمالي الطلبات" value={stats.total.toString()} icon="📊" color="blue" />
          <MetricCard label="الطلبات المقبولة" value={stats.approved.toString()} icon="✅" color="emerald" />
          <MetricCard label="الطلبات المرفوضة" value={stats.rejected.toString()} icon="❌" color="red" />
          <MetricCard label="قيد الدراسة" value={stats.pending.toString()} icon="🟠" color="amber" />
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <span>📄</span> سجل الطلبات الواردة
          </h3>
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Digital Judicial Registry</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">رقم الطلب</th>
                <th className="px-6 py-5">العدل(ة)</th>
                <th className="px-6 py-5">نوع الشهادة</th>
                <th className="px-6 py-5">تاريخ الطلب</th>
                <th className="px-6 py-5">الحالة</th>
                <th className="px-6 py-5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRequests.map((req: any) => (
                <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-6 font-black text-blue-600 text-sm">{req.request_number}</td>
                  <td className="px-6 py-6 font-bold text-slate-700">
                    <div>{req.notary_name}</div>
                    <div className="text-[9px] text-slate-400 uppercase"># {req.notary_professional_number}</div>
                  </td>
                  <td className="px-6 py-6 text-sm font-bold text-slate-600">{req.certificate_type}</td>
                  <td className="px-6 py-6 text-xs text-slate-400 font-bold">{new Date(req.created_at).toLocaleDateString('ar-MA')}</td>
                  <td className="px-6 py-6">
                    <StatusPill status={req.status} />
                  </td>
                  <td className="px-6 py-6 text-center flex gap-2 justify-center">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-black transition-all"
                    >
                      مراجعة
                    </button>
                    {(req.status === 'مكتمل' || req.status === 'موافق_عليه' || req.decision_type === 'موافقة') && (
                      <button 
                        onClick={() => {
                          setViewingRequest(req);
                          setShowApprovalModel(true);
                        }}
                        className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-black transition-all"
                        title="تحميل قرار الموافقة"
                      >
                        🖨️
                      </button>
                    )}
                    {(req.status === 'مرفوض' || req.decision_type === 'رفض') && (
                      <button 
                        onClick={() => {
                          setViewingRequest(req);
                          setShowRejectionModel(true);
                        }}
                        className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-4 py-2 rounded-xl text-xs font-black transition-all"
                        title="تحميل قرار الرفض"
                      >
                        🖨️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-bold">لا توجد طلبات إذن بالتلقي الفردي حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">مراجعة طلب الإذن رقم: {selectedRequest.request_number}</h3>
                <p className="text-slate-400 text-xs mt-1">عرض تفاصيل الطلب واتخاذ قرار قضائي مسبب</p>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Request Details (Read-only) */}
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معلومات العدل والشهادة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 mb-1">اسم العدل</p>
                      <p className="font-black text-slate-800 text-sm">{selectedRequest.notary_name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 mb-1">الرقم المهني</p>
                      <p className="font-black text-slate-800 text-sm">{selectedRequest.notary_professional_number}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 mb-1">نوع الشهادة</p>
                      <p className="font-black text-slate-800 text-sm">{selectedRequest.certificate_type}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 mb-1">تاريخ الطلب</p>
                      <p className="font-black text-slate-800 text-sm">{new Date(selectedRequest.created_at).toLocaleDateString('ar-MA')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                   <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">التعليل الوارد في الطلب</h4>
                   <p className="font-bold text-slate-700 leading-relaxed text-sm italic">
                      " {selectedRequest.notes?.split('---')[0].trim() || 'لا يوجد تعليل مكتوب'} "
                   </p>
                </div>
              </div>

              {/* Decision Section */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 pr-2 uppercase italic flex items-center gap-2">
                    <span>📝</span> ملاحظات القاضي وتعليل القرار
                  </label>
                  <textarea 
                    placeholder="أدخل التعليل القضائي للقرار هنا..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 font-bold outline-none focus:border-blue-600 min-h-[150px]"
                  />
                  <p className="text-red-500 text-[9px] font-black px-4">⚠️ هذا القرار سيُرقَّم ويُؤرشف تلقائيًا ولا يمكن تعديله بعد الحفظ.</p>
                </div>

                {selectedRequest.status === 'مكتمل' || selectedRequest.status === 'مرفوض' ? (
                   <div className="bg-slate-100 p-8 rounded-3xl text-center">
                      <p className="font-black text-slate-500 text-sm">تم البت في هذا الطلب سابقاً.</p>
                      {selectedRequest.decision_serial_number && (
                        <p className="text-blue-600 font-black mt-2">رقم القرار: {selectedRequest.decision_serial_number}</p>
                      )}
                   </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      disabled={isProcessing}
                      onClick={() => handleDecision('موافقة')}
                      className="bg-emerald-600 text-white p-6 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all flex flex-col items-center gap-1 active:scale-95"
                    >
                      <span>الموافقة ✅</span>
                      <span className="text-[8px] font-bold opacity-80 italic">سيتم توليد الرقم: {generateDecisionSerial()}</span>
                    </button>
                    <button 
                      disabled={isProcessing}
                      onClick={() => handleDecision('رفض')}
                      className="bg-red-600 text-white p-6 rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 transition-all flex flex-col items-center gap-1 active:scale-95"
                    >
                      <span>الرفض ❌</span>
                      <span className="text-[8px] font-bold opacity-80">يتطلب تعليلاً إلزامياً</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm grayscale opacity-30">🔏</div>
                  <p className="text-[9px] font-black text-slate-400">التوقيع الرقمي المعتمد لقاضي التوثيق</p>
               </div>
               <button 
                onClick={() => setSelectedRequest(null)}
                className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all"
               >
                 إلغاء المعاينة
               </button>
            </div>
          </div>
        </div>
      )}
      {showApprovalModel && renderApprovalModel()}
      {showRejectionModel && renderRejectionModel()}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: 'blue' | 'emerald' | 'red' | 'amber' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className={`p-6 rounded-3xl border ${colors[color]} space-y-1 transition-all hover:scale-105 cursor-default`}>
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-black tracking-widest">{value}</span>
      </div>
      <p className="text-[10px] font-black uppercase opacity-60">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string, cls: string }> = {
    'جديد': { label: 'جديد', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
    'قيد_المعالجة': { label: 'قيد الدراسة', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    'قيد_الدراسة': { label: 'قيد الدراسة', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    'مكتمل': { label: 'مقبول ✅', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black' },
    'مقبول': { label: 'مقبول ✅', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black' },
    'مرفوض': { label: 'مرفوض ❌', cls: 'bg-red-50 text-red-600 border-red-100 font-black' },
  };

  const { label, cls } = config[status] || { label: status, cls: 'bg-slate-50 text-slate-500 border-slate-100' };

  return (
    <span className={`px-4 py-1.5 rounded-full border text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}
