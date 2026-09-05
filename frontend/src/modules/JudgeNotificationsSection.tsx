import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';

const DECISION_TEMPLATES = {
  موافقة: [
    "تمت الموافقة على الطلب بعد التأكد من استيفائه للشروط القانونية.",
    "لا مانع لدينا من التنقل لتلقي الإشهاد المطلوب في الزمان والمكان المحددين.",
    "بناءً على المعطيات الواردة، نؤشر بالموافقة على تنقل السيد العدل واستكمال الإجراءات."
  ],
  رفض: [
    "يرفض الطلب لعدم تقديم مبررات كافية للتنقل خارج الدائرة القضائية.",
    "يرفض الطلب لمخالفته المقتضيات التنظيمية المعمول بها في هذا الخصوص.",
    "يتعذر قبول الطلب نظراً لعدم وضوح الغرض من التنقل أو وجود نقص في البيانات الأساسية."
  ],
  تأجيل: [
    "يؤجل البت في الطلب إلى حين تقديم توضيحات إضافية حول سبب هذا القرار.",
    "يؤجل الطلب نظراً لتعارضه مع الجدول الزمني للجلسات أو المهام القضائية المستعجلة.",
    "يرجى إعادة جدولة الموعد بالتنسيق مع الأطراف المعنية وإعادة تقديم الإشعار لاحقاً."
  ]
};

function StatusPill({ status }: { status: string }) {
  const label =
    status === 'pending'
      ? 'جديد'
      : status === 'in_review'
        ? 'قيد الدراسة'
        : status === 'accepted'
          ? 'مقبول'
          : status === 'accepted_with_notes'
            ? 'مقبول مع ملاحظات'
            : status === 'substantive_notes'
              ? 'ملاحظات جوهرية'
              : status;

  const cls =
    label === 'جديد'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : label === 'قيد الدراسة' || label === 'قيد المتابعة'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : label === 'مقبول' || label === 'مقبول مع ملاحظات' || label === 'مكتمل'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : label === 'ملاحظات جوهرية' || label === 'مرفوض'
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function JudgeNotificationsSection() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد_المعالجة' | 'موافق_عليه' | 'مرفوض' | 'مؤجل'>('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'موافقة' | 'رفض' | 'تأجيل'>('موافقة');
  const [selectedDecisionType, setSelectedDecisionType] = useState<'موافقة' | 'رفض' | 'تأجيل' | null>(null);
  const [showResponsePreview, setShowResponsePreview] = useState(false);
  const { markJudgeRequestSeen, isJudgeRequestSeen } = useMessagingNotifications();

  // Fetch notifications specifically for judges
  const { data: notifications, isLoading, refetch } = trpc.notifications.getRequestsList.useQuery({
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
    searchTerm: searchTerm || undefined,
    recipientType: 'judge',
    excludeSpecialized: true, // Hide marriage/adl-copy as they have dedicated sections
  });

  const judgeNotifications = notifications || [];

  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation({
    onSuccess: () => {
      setSelectedNotification(null);
      setDecisionReason('');
      setSelectedDecisionType(null); // Reset selection
      setShowResponsePreview(false); // Close preview modal if open
      refetch();
      alert('تم تسجيل القرار بنجاح وإرساله للعدل المعني.');
    },
    onError: (err) => {
      alert('حدث خطأ أثناء تسجيل القرار: ' + err.message);
    },
    onSettled: () => setIsProcessing(false)
  });

  const handleDecision = (type: 'موافقة' | 'رفض' | 'تأجيل') => {
    if (!decisionReason && type !== 'موافقة') {
      alert('يرجى كتابة التعليل للقرار المتخذ.');
      return;
    }

    if (!confirm(`هل أنت متأكد من تسجيل قرار (${type}) على هذا الإشعار؟`)) return;

    setIsProcessing(true);
    recordDecisionMutation.mutate({
      notificationId: selectedNotification.id,
      decisionType: type,
      reasoning: decisionReason || 'تمت الموافقة على الطلب بعد المراجعة.',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all font-bold text-sm"
            >
              <span>←</span> العودة
            </button>
            <div className="text-right">
              <h2 className="text-2xl font-extrabold text-slate-900 font-amiri">إشعارات القاضي (التنقل خارج الاختصاص)</h2>
              <p className="mt-1 text-sm text-slate-600">
                مراجعة طلبات السادة العدول للتوجه خارج دائرة نفوذ المحكمة لتلقي الإشهادات.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold border border-amber-100 flex items-center gap-2">
              <span>⏳</span>
              قيد الانتظار: {judgeNotifications.filter(n => n.status === 'قيد_المعالجة').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="البحث باسم العدل أو رقم الطلب..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-900/10 text-right"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'قيد_المعالجة', 'موافق_عليه', 'مرفوض', 'مؤجل'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                statusFilter === s
                  ? 'bg-red-950 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'الكل' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-20 text-center text-slate-400">
          <div className="animate-spin text-3xl mb-4 text-red-900">⏳</div>
          جاري تحميل الإشعارات...
        </div>
      ) : judgeNotifications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {judgeNotifications.map((notif: any) => (
            <div 
              key={notif.id}
              className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:border-red-200 transition-all cursor-pointer relative overflow-hidden flex flex-col"
              onClick={() => {
                markJudgeRequestSeen(String(notif.id));
                setSelectedNotification(notif);
              }}
            >
              {!isJudgeRequestSeen(String(notif.id)) ? (
                <span className="absolute left-6 top-6 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md animate-pulse">
                  جديد
                </span>
              ) : null}
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 text-red-900 rounded-2xl">
                  <span className="text-2xl">📝</span>
                </div>
                <StatusPill status={notif.status} />
              </div>
              
              <div className="flex-grow space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>طلب رقم: {notif.request_number || notif.id.substring(0,8)}</span>
                  <span>{new Date(notif.created_at).toLocaleDateString('ar-MA')}</span>
                </div>
                
                <h3 className="text-xl font-black text-slate-900">{notif.notary_name}</h3>
                <p className="text-slate-500 font-medium flex items-center gap-2">
                  <span className="text-slate-400">🏛️</span>
                  {notif.target_court}
                </p>
                
                <div className="bg-slate-50 rounded-2xl p-4 text-sm mt-4">
                  <p className="text-slate-600 leading-relaxed line-clamp-2">
                    {notif.reason_for_movement}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-red-950">
                  {notif.certificate_type}
                </span>
                <div className="text-red-900 font-black text-sm group-hover:translate-x-[-5px] transition-transform">
                  التفاصيل واتخاذ القرار ←
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
          <div className="text-6xl mb-6 opacity-30">📭</div>
          <h3 className="text-2xl font-black text-slate-400">لا توجد إشعارات قضائية حالياً</h3>
          <p className="text-slate-500 mt-2">سيتم ظهور الطلبات الموجهة إليك هنا بمجرد إرسالها من طرف العدول</p>
        </div>
      )}

      {/* Modal Details & Action */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-scaleIn">
            <div className="p-8 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-950 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">⚖️</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 font-amiri underline decoration-red-900/30 underline-offset-8">
                    {(selectedNotification.notes?.includes('شهادة علمية') || 
                      selectedNotification.notes?.includes('شهادة مثلية') ||
                      selectedNotification.certificate_type?.includes('علمية') ||
                      selectedNotification.certificate_type?.includes('مثلية') ||
                      selectedNotification.certificate_type?.includes('نسب')) 
                      ? 'مراجعة طلب إذن بتلقي شهادة علمية' 
                      : 'مراجعة إشعار بالتنقل'}
                  </h2>
                  <p className="text-slate-500 text-sm font-bold">رقم الطلب: {selectedNotification.request_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-900 transition-all hover:bg-red-50"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 text-right">
                {/* Information Column */}
                <div className="space-y-8">
                  <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 shadow-inner">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                       <span className="w-1.5 h-6 bg-red-950 rounded-full"></span>
                       بيانات العدل والدائرة
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">الاسم الكامل:</span>
                        <span className="text-slate-900 font-black">{selectedNotification.notary_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">الرقم المهني:</span>
                        <span className="text-slate-900 font-bold">{selectedNotification.appointment_decree_number || selectedNotification.notary_professional_number}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">رقم ب.ت.و (CIN):</span>
                        <span className="text-slate-900 font-bold tracking-widest">{selectedNotification.cin || '---'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">الهاتف:</span>
                        <span className="text-slate-900 font-bold" dir="ltr">{selectedNotification.phone || '---'}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold mb-1">العنوان المهني:</span>
                        <span className="text-slate-700 text-sm font-medium leading-relaxed">{selectedNotification.office_address || '---'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">المحكمة المعين بها:</span>
                        <span className="text-slate-900 font-bold">{selectedNotification.jurisdiction}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-500 font-bold">المحكمة المقصد:</span>
                        <span className="text-red-900 font-black">{selectedNotification.target_court}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50/30 rounded-[32px] p-8 border border-red-100">
                    <h3 className="text-lg font-black text-red-950 mb-6 flex items-center gap-3">
                       <span className="w-1.5 h-6 bg-red-950 rounded-full"></span>
                       {(selectedNotification.notes?.includes('شهادة علمية') || 
                        selectedNotification.notes?.includes('شهادة مثلية') ||
                        selectedNotification.certificate_type?.includes('علمية') ||
                        selectedNotification.certificate_type?.includes('مثلية') ||
                        selectedNotification.certificate_type?.includes('نسب')) 
                        ? 'تفاصيل الطلب العلمي' 
                        : 'تفاصيل المهمة'}
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex justify-between border-b border-red-200/50 pb-3">
                        <span className="text-red-900/60 font-bold">نوع الشهادة:</span>
                        <span className="text-red-950 font-black">{selectedNotification.certificate_type}</span>
                      </div>
                      <div className="flex justify-between border-b border-red-200/50 pb-3">
                        <span className="text-red-900/60 font-bold">مكان التلقي:</span>
                        <span className="text-red-950 font-bold">{selectedNotification.reception_place}</span>
                      </div>
                      <div className="flex justify-between border-b border-red-200/50 pb-3">
                        <span className="text-red-900/60 font-bold">تاريخ وساعة التلقي:</span>
                        <span className="text-red-950 font-bold">{selectedNotification.reception_date} - {selectedNotification.reception_time}</span>
                      </div>
                      <div>
                        <span className="text-red-900/60 font-bold block mb-2 text-right">
                          {(selectedNotification.notes?.includes('شهادة علمية') || 
                            selectedNotification.notes?.includes('شهادة مثلية') ||
                            selectedNotification.certificate_type?.includes('علمية') ||
                            selectedNotification.certificate_type?.includes('مثلية') ||
                            selectedNotification.certificate_type?.includes('نسب')) 
                            ? 'موضوع الشهادة:' 
                            : 'سبب التوجه والمبررات:'}
                        </span>
                        <div className="bg-white/80 p-4 rounded-2xl text-red-950 leading-relaxed italic border border-red-100 shadow-sm text-right">
                          {selectedNotification.reason_for_movement}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decision Column */}
                <div className="space-y-8">
                   <div className="bg-white rounded-[32px] p-8 border-2 border-slate-100 shadow-sm">
                      <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        اتخاذ القرار القضائي
                      </h3>

                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex gap-2">
                            {(['موافقة', 'رفض', 'تأجيل'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setActiveTemplateTab(tab)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                  activeTemplateTab === tab 
                                    ? 'bg-red-950 text-white shadow-md' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                نماذج {tab}
                              </button>
                            ))}
                          </div>
                          <label className="block text-sm font-bold text-slate-500 text-right">قوالب الجواب الجاهزة:</label>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4 justify-end">
                          {DECISION_TEMPLATES[activeTemplateTab].map((template, idx) => (
                            <button
                              key={idx}
                              onClick={() => setDecisionReason(template)}
                              className="px-4 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-900 border border-slate-200 rounded-xl text-xs font-medium transition-all text-right max-w-full"
                            >
                              {template}
                            </button>
                          ))}
                        </div>

                        <label className="block text-sm font-bold text-slate-500 mb-3 text-right">تعليل القرار أو ملاحظات توجيهية (إجباري في حالة الرفض أو التأجيل):</label>
                        <textarea
                          className="w-full px-6 py-4 rounded-3xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-red-900/5 focus:border-red-950/20 text-slate-900 min-h-[150px] transition-all bg-slate-50 placeholder:text-slate-300 text-right"
                          placeholder="اكتب هنا أسباب الموافقة أو الرفض أو التعليمات الواجب اتباعها..."
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setSelectedDecisionType('تأجيل');
                            setActiveTemplateTab('تأجيل');
                            setDecisionReason(DECISION_TEMPLATES['تأجيل'][0]);
                          }}
                          className={`px-4 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                            selectedDecisionType === 'تأجيل'
                              ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                              : 'bg-amber-600/10 text-amber-600 hover:bg-amber-600 hover:text-white'
                          }`}
                        >
                          <span className="text-xl">⌛</span> تأجيل
                        </button>
                        
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setSelectedDecisionType('رفض');
                            setActiveTemplateTab('رفض');
                            setDecisionReason(DECISION_TEMPLATES['رفض'][0]);
                          }}
                          className={`px-4 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                            selectedDecisionType === 'رفض'
                              ? 'bg-red-600 text-white ring-4 ring-red-200'
                              : 'bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          <span className="text-xl">❌</span> رفض
                        </button>

                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setSelectedDecisionType('موافقة');
                            setActiveTemplateTab('موافقة');
                            setDecisionReason(DECISION_TEMPLATES['موافقة'][0]);
                          }}
                          className={`px-4 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                            selectedDecisionType === 'موافقة'
                              ? 'bg-red-950 text-white ring-4 ring-red-900/20'
                              : 'bg-red-950/10 text-red-950 hover:bg-red-950 hover:text-white'
                          }`}
                        >
                          <span className="bg-emerald-500 text-white rounded p-0.5 text-xs">✓</span> موافقة
                        </button>
                      </div>

                      {selectedDecisionType && (
                        <div className="mt-8 space-y-4 animate-slideUp">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <p className="text-xs text-slate-500 font-bold mb-2">القرار الحالي المختار: <span className="text-red-900">{selectedDecisionType}</span></p>
                             <p className="text-[10px] text-slate-400">يمكنك تعديل نص التعليل أدناه قبل الحفظ النهائي.</p>
                           </div>

                           <button
                             disabled={isProcessing}
                             onClick={() => setShowResponsePreview(true)}
                             className="w-full px-8 py-5 bg-red-950 text-[#E6BE8A] rounded-[24px] font-black text-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3 border-2 border-[#E6BE8A]/30"
                           >
                             <span>⚖️</span> مراجعة نص القرار وإرساله
                           </button>

                           <p className="px-4 py-2 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg text-center">
                             سيتم فتح معاينة A4 الرسمية لمراجعة النص قبل الإرسال النهائي.
                           </p>
                        </div>
                      )}
                      
                      <p className="mt-6 text-[10px] text-slate-400 font-bold text-center leading-loose">
                        يُرجى مراجعة نص القرار بدقة. بمجرد الضغط على "تأكيد وإرسال"، سيتم تبليغ العدل رسمياً عبر فضاءه الرقمي.
                      </p>
                   </div>

                   {/* History Hint */}
                   <div className="p-6 border-2 border-dashed border-slate-200 rounded-[32px] text-center opacity-60">
                     <p className="text-sm text-slate-400 font-bold">
                       هذا الطلب مسجل تحت الرقم التسلسلي العالمي للتدقيق الجنائي الرقمي المرتبط بالهوية الوطنية للسيد العدل.
                     </p>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t bg-slate-50 text-center">
              <p className="text-slate-400 text-xs font-bold font-amiri">
                 النظام الذكي للتدبير الرقمي للرسوم العدلية والرقابة القضائية - المملكة المغربية © 2026
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Response Preview Modal - High Fidelity Document */}
      {showResponsePreview && selectedNotification && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="bg-red-950 text-white p-6 flex justify-between items-center no-print">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️</span>
                <h2 className="text-xl font-bold font-amiri underline decoration-[#E6BE8A] underline-offset-8">القرار القضائي الرسمي</h2>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-[#E6BE8A] text-red-950 rounded-xl font-black hover:bg-white transition-all shadow-lg flex items-center gap-2"
                >
                  <span>🖨️</span> طباعة القرار (A4)
                </button>
                <button
                  onClick={() => setShowResponsePreview(false)}
                  className="px-6 py-2 bg-red-800 text-white rounded-xl font-black hover:bg-red-700 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div className="p-12 bg-white printable-area">
              <style>{`
                @media print {
                  .no-print { display: none !important; }
                  .printable-area { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                  body { background: white !important; }
                }
                .font-amiri { font-family: 'Amiri', serif; }
              `}</style>

              {/* Common Header */}
              <div className="flex justify-between items-start mb-12 text-center font-amiri">
                <div className="w-1/3 space-y-1">
                  <p className="font-bold text-xl uppercase tracking-tighter">المملكة المغربية</p>
                  <p className="font-bold text-lg">وزارة العدل</p>
                  <p className="font-bold text-lg">المحكمة الابتدائية بـ: {selectedNotification.jurisdiction || '........'}</p>
                  <p className="font-bold text-lg border-t border-black pt-1">مكتب قاضي التوثيق</p>
                </div>
                <div className="w-1/3 flex flex-col items-center">
                  <img src="/logos/morocco-coat.jpg" alt="Morocco Coat of Arms" className="w-28 h-28 object-contain mb-2" />
                </div>
                <div className="w-1/3 space-y-1">
                  <p className="font-bold text-lg">تحرير بـ: {selectedNotification.jurisdiction || '........'}</p>
                  <p className="font-bold text-lg underline underline-offset-4">بتاريخ: {new Date().toLocaleDateString('ar-MA')}</p>
                  <p className="text-xs font-bold text-slate-400 mt-2">مرجع الطلب: {selectedNotification.request_number || '........'}</p>
                </div>
              </div>

              {/* Title based on Decision Type */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-black border-b-4 border-double border-black inline-block pb-4 font-amiri">
                  {(selectedNotification.notes?.includes('شهادة علمية') || 
                    selectedNotification.notes?.includes('شهادة مثلية') ||
                    selectedNotification.certificate_type?.includes('علمية') ||
                    selectedNotification.certificate_type?.includes('مثلية') ||
                    selectedNotification.certificate_type?.includes('نسب'))
                    ? (activeTemplateTab === 'موافقة' ? 'إذن بتلقي شهادة علمية' : `قرار قضائي بشأن طلب شهادة علمية`)
                    : (activeTemplateTab === 'موافقة' ? 'إذن قضائي بالتنقل' : `إشعار قضائي ${activeTemplateTab === 'رفض' ? 'بالرفض' : 'بتأجيل'} للبت`)
                  }
                </h1>
              </div>

              {/* Dynamic Content based on Decision Type */}
              <div className="text-right leading-[2.6] text-xl font-amiri space-y-8 px-12">
                {activeTemplateTab === 'موافقة' && (
                  <div className="space-y-6">
                    {(selectedNotification.notes?.includes('شهادة علمية') || 
                      selectedNotification.notes?.includes('شهادة مثلية') ||
                      selectedNotification.certificate_type?.includes('علمية') ||
                      selectedNotification.certificate_type?.includes('مثلية') ||
                      selectedNotification.certificate_type?.includes('نسب')) ? (
                      /* CUSTOM TEMPLATE FOR SCIENTIFIC CERTIFICATE */
                      <div className="space-y-8 text-2xl leading-[3rem]">
                        <div className="flex border-b-2 border-slate-900 pb-6 mb-8">
                          <div className="w-full space-y-2">
                             <p>المحكمة الابتدائية بـ: <span className="font-bold underline">{selectedNotification.jurisdiction || '........'}</span></p>
                             <p>قسم التوثيق وشؤون القاصرين</p>
                             <p className="pt-4">المرجع: <span className="font-bold">إشعار/طلب الإذن بتلقي شهادة علمية</span></p>
                             <p>العدل(ان): <span className="font-black underline">{selectedNotification.notary_name}</span> ورفيقه: <span className="font-bold underline">{
                               (() => {
                                 const notes = selectedNotification.notes || '';
                                 // More robust matching for the companion notary
                                 const match = notes.match(/أسماء العدلين: .*?([،,])\s*(.*?)(\n|$)/) || notes.match(/أسماء العدلين: .*?، (.*)/);
                                 return match ? (match[2] || match[1]) : '........';
                               })()
                             }</span></p>
                             <p>موضوع الشهادة: <span className="font-bold italic">{selectedNotification.reason_for_movement || '........'}</span></p>
                          </div>
                        </div>

                        <p className="text-center font-bold text-3xl italic my-8">سلام تام بوجود مولانا الإمام،</p>

                        <div className="space-y-6">
                          <p>
                            بعد الاطلاع على الطلب المشار إليه أعلاه والمتعلق بتلقي شهادة علمية لفائدة المعني(ة): <span className="font-black text-red-950 underline underline-offset-8">
                              {selectedNotification.involved_names || selectedNotification.involvedNames || '........'}
                            </span>،
                          </p>
                          <p>وبناءً على ما قمتم به من توضيحات حول موضوع الشهادة ومحلها وغايتها،</p>
                          <p>وبالنظر إلى ما تتطلبه الممارسة المهنية من مراعاة الضوابط القانونية والتنظيمية الجاري بها العمل؛</p>
                          
                          <div className="font-black text-3xl py-10 bg-emerald-50/50 border-r-[15px] border-emerald-800 pr-10 rounded-2xl shadow-inner leading-relaxed">
                            نوافق على منح الإذن بتلقي الشهادة العلمية موضوع الطلب، وتحت مسؤوليتكم المهنية وفقاً لما تقتضيه القواعد المؤطرة للتوثيق العدلي.
                          </div>

                          {decisionReason && !DECISION_TEMPLATES.موافقة.includes(decisionReason) && (
                            <div className="mt-4 p-6 border-dashed border-2 border-amber-200 rounded-2xl bg-amber-50/20 italic">
                               <p className="text-sm text-slate-500 font-bold mb-2">ملاحظات تكميلية:</p>
                               <p>"{decisionReason}"</p>
                            </div>
                          )}
                        </div>

                        <p className="text-center font-bold text-2xl pt-12">وتفضلوا بقبول فائق التقدير والاحترام.</p>

                        <div className="mt-20 flex flex-col items-start px-20">
                          <p className="font-black text-3xl underline underline-offset-8 decoration-4">قاضي التوثيق وشؤون القاصرين</p>
                          <div className="flex flex-col gap-4 mt-8">
                             <p className="text-xl">الاسم: ............................................</p>
                             <p className="text-xl">التوقيع: ............................................</p>
                             <p className="text-xl">التاريخ: {new Date().toLocaleDateString('ar-MA')}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STANDARD NOTIFICATION TEMPLATE */
                      <>
                        <div className="mb-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                          <p className="font-bold">إلى السيد العدل: <span className="underline font-black">{selectedNotification.notary_name}</span></p>
                          <p>المعين بالمحكمة الابتدائية بـ: <span className="underline">{selectedNotification.jurisdiction || '........'}</span></p>
                          <p>رقم قرار التعيين: <span className="underline font-bold">{selectedNotification.appointment_decree_number || '........'}</span></p>
                        </div>
                        
                        <p className="font-black text-center text-2xl py-4 underline decoration-double underline-offset-8">الموضوع: إذن قضائي بالتوجه لتلقي إشهاد خارج دائرة النفوذ</p>
                        
                        <p className="text-center font-bold text-2xl mt-6 italic">سلام تام بوجود مولانا الإمام،</p>
                        
                        <p className="font-bold">وبعد،</p>
                        
                        <p className="text-justify font-medium">
                          بناءً على الإشعار المقدم من طرفكم والمؤرخ في <span className="underline font-bold">{new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</span>، والرامي إلى طلب الإذن بالتوجه إلى: <span className="underline font-bold">{selectedNotification.reception_place || '........'}</span> يوم <span className="underline font-bold">{selectedNotification.reception_date || '........'}</span> على الساعة <span className="underline font-bold">{selectedNotification.reception_time || '........'}</span> من أجل تلقي إشهاد بنوع: <span className="underline font-bold">{selectedNotification.certificate_type || '........'}</span>.
                        </p>
                        
                        <p>
                          وبعد دراسة الطلب والوقوف على الدواعي والمبررات الواردة فيه، ووفقاً للصلاحيات المخولة لنا في مراقبة وتنظيم المهنة:
                        </p>
                        
                        <div className="font-black text-2xl py-8 bg-emerald-50/50 border-r-[12px] border-emerald-700 pr-8 rounded-xl shadow-inner">
                          <p className="mb-4 text-emerald-900 underline underline-offset-4 pointer-events-none">قررنا ما يلي:</p>
                          <p className="leading-relaxed">
                            نأذن للسيد العدل المذكور أعلاه بالتوجه للمكان والزمان المحددين لتلقي الإشهاد موضوع الطلب، مع الالتزام التام بالمقتضيات القانونية الجاري بها العمل، وموافاتنا عند الاقتضاء بملخص عن الإجراء.
                          </p>
                        </div>

                        {decisionReason && (
                          <div className="mt-4 p-6 border-dashed border-2 border-slate-200 rounded-2xl bg-amber-50/30">
                            <p className="text-sm text-slate-500 font-bold mb-2">تعليمات إضافية من السيد القاضي:</p>
                            <p className="italic text-slate-800 font-bold text-2xl leading-loose">"{decisionReason}"</p>
                          </div>
                        )}
                        
                        <p className="text-center font-bold text-2xl pt-8">والسلام.</p>
                        
                        <div className="mt-16 flex flex-col items-start px-12">
                          <p className="font-black text-2xl">عن مكتب قاضي التوثيق</p>
                          <div className="h-24 w-48 border-2 border-dashed border-slate-200 rounded-xl my-4 flex items-center justify-center text-slate-300 text-sm">التوقيع والخاتم الرسمي</div>
                          <p className="font-bold">المحكمة الابتدائية بـ: {selectedNotification.jurisdiction || '........'}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTemplateTab === 'رفض' && (
                  <div className="space-y-6">
                    <div className="mb-6 bg-red-50/30 p-6 rounded-2xl border border-red-100">
                      <p className="font-bold">إلى السيد العدل: <span className="underline font-black">{selectedNotification.notary_name}</span></p>
                    </div>
                    
                    <p className="font-black text-center text-2xl py-4 underline decoration-red-600 underline-offset-8">الموضوع: رفض الإذن بالتنقل لتلقي الإشهاد</p>
                    
                    <p className="text-center font-bold text-2xl mt-6 italic">سلام تام بوجود مولانا الإمام،</p>
                    
                    <p className="font-bold">أما بعد،</p>
                    
                    <p className="text-justify font-medium">
                       رداً على إشعاركم المتعلق بالتوجه لتلقي إشهاد خارج مقر العمل، نبلغكم بأنه بعد المراجعة القضائية للطلب ومبرراته:
                    </p>
                    
                    <div className="font-black text-2xl py-8 bg-red-50 border-r-[12px] border-red-800 pr-8 rounded-xl shadow-inner text-red-950">
                      <p className="mb-4 underline underline-offset-4">القرار المتخذ:</p>
                      <p className="leading-relaxed">
                         قررنا رفض طلب الإذن بالتوجه، ويتعين عليكم البقاء ضمن دائرة نفوذ المحكمة لممارسة المهام العادية.
                      </p>
                    </div>

                    <div className="mt-6 p-6 border-red-200 border-2 rounded-2xl bg-white shadow-sm">
                        <p className="text-sm text-red-800 font-black mb-2 uppercase tracking-widest">المبررات القضائية للرفض:</p>
                        <p className="italic text-slate-800 font-bold text-2xl leading-loose whitespace-pre-wrap">
                          {decisionReason || 'لم يتم استيفاء المبررات القانونية المطلوبة للتنقل خارج الاختصاص.'}
                        </p>
                    </div>
                    
                    <p className="text-center font-bold text-2xl pt-8">والسلام.</p>
                    
                    <div className="mt-16 flex flex-col items-start px-12">
                      <p className="font-black text-2xl">محمد بن عبد الله (قاضي التوثيق)</p>
                      <p className="font-bold opacity-50">خاتم المحكمة</p>
                    </div>
                  </div>
                )}

                {activeTemplateTab === 'تأجيل' && (
                  <div className="space-y-6">
                    <div className="mb-6 bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                      <p className="font-bold">إلى السيد العدل: <span className="underline font-black">{selectedNotification.notary_name}</span></p>
                    </div>
                    
                    <p className="font-black text-center text-2xl py-4 underline decoration-amber-600 underline-offset-8">الموضوع: تأجيل البت في طلب التنقل</p>
                    
                    <p className="text-center font-bold text-2xl mt-6 italic">سلام تام بوجود مولانا الإمام،</p>
                    
                    <p className="font-bold">أما بعد،</p>
                    
                    <p className="text-justify font-medium">
                       نخبركم بأن طلب التنقل المؤرخ في <span className="underline font-bold">{new Date(selectedNotification.created_at).toLocaleDateString('ar-MA')}</span> قد تقرر تأجيل البت فيه للأسباب التالية:
                    </p>
                    
                    <div className="font-black text-2xl py-8 bg-amber-50 border-r-[12px] border-amber-500 pr-8 rounded-xl shadow-inner">
                      <p className="leading-relaxed whitespace-pre-wrap text-[#854d0e]">
                        {decisionReason || 'يتطلب البت في هذا الطلب مزيداً من التدقيق أو حضور الأطراف المعنية للمحكمة أولاً.'}
                      </p>
                    </div>
                    
                    <p className="text-center font-bold text-2xl pt-8">والسلام.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-32 border-t pt-6 text-center text-xs text-slate-400 no-print flex justify-between px-12">
                <p>هذه الوثيقة صادرة عن النظام المعلوماتي للرقابة القضائية - وزارة العدل</p>
                <p className="font-mono">VERIFICATION ID: {selectedNotification.id.substring(0,12).toUpperCase()}</p>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 no-print">
              <div className="flex-1 text-right">
                <p className="text-sm text-slate-500 font-bold italic">
                   يرجى التأكد من التوقيع والخاتم بعد الطباعة ليصبح القرار ساري المفعول قانونياً.
                </p>
                <p className="text-[10px] text-slate-400 mt-1">يمكنك إرسال القرار إلكترونياً للعدل الآن بعد مراجعته.</p>
              </div>
              
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={() => setShowResponsePreview(false)}
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-50 transition-all flex-1 md:flex-none"
                >
                  تعديل النص
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => {
                    handleDecision(selectedDecisionType!);
                    // Modal will close automatically via onSuccess of mutation
                  }}
                  className="px-10 py-3 bg-red-950 text-[#E6BE8A] rounded-xl font-black hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 flex-1 md:flex-none border-2 border-[#E6BE8A]/20"
                >
                  {isProcessing ? 'جاري الإرسال...' : '✅ إرسال القرار للعدل الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
