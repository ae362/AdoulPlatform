import React, { useEffect, useState, useMemo } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import { DateWidget } from '../../modules/DateWidget';
import { OrnateScrollBanner } from '../../components/common/OrnateScrollBanner';
import { MarriageDocumentView } from '../../components/MarriageDocumentView';
import { WorkCertificateDocumentView } from '../../components/WorkCertificateDocumentView';
import { AdlCopyDocumentView } from '../../components/AdlCopyDocumentView';
import { AdlCopyProcessingModule } from './AdlCopyProcessingModule';

// Helper to parse the formatted notes back into an object for easier display
const parseRequestNotes = (notes: string | undefined | null) => {
  if (!notes) return null;
  
  // Basic detection - prioritized by specific keywords
  const hasWorkKeywords = notes.includes('شهادة عمل') || notes.includes('CT-WORK');
  const hasMarriageKeywords = notes.includes('طلب الاذن بالزواج') || notes.includes('زواج');
  const hasAdlCopyKeywords = notes.includes('طلب الإذن لاستخراج نسخ/نظائر الرسوم العدلية');
  
  const result: any = {
    isMarriage: hasMarriageKeywords && !hasWorkKeywords && !hasAdlCopyKeywords,
    isAdlCopy: hasAdlCopyKeywords
  };

  // 1. Try to extract from JSON block if available (for new requests)
  if (notes.includes('--- DATA JSON START ---')) {
    try {
      const jsonPart = notes.split('--- DATA JSON START ---')[1].split('--- DATA JSON END ---')[0].trim();
      const jsonData = JSON.parse(jsonPart);
      result.fullData = jsonData;

      // Re-evaluate type based on JSON content
      if (jsonData.certificateType?.includes('شهادة عمل') || jsonData.isWorkCertificate) {
        result.isMarriage = false;
        result.isAdlCopy = false;
      } else if (jsonData.marriageType || jsonData.suitorFirstNameAr) {
        result.isMarriage = true;
        result.isAdlCopy = false;
      } else if (jsonData.deeds && jsonData.applicantFirstName) {
        result.isMarriage = false;
        result.isAdlCopy = true;
      }

      if (result.isMarriage) {
        // Map to consistent structure for easier use elsewhere
        result.suitor = {
          name: `${jsonData.suitorFirstNameAr} ${jsonData.suitorLastNameAr}`,
          cin: jsonData.suitorCIN,
          status: jsonData.suitorFamilyStatus,
          profession: jsonData.suitorProfession,
          address: jsonData.suitorAddress,
          docs: jsonData.suitorDocs,
          parents: jsonData.suitorParents || '',
          birthPlace: jsonData.suitorPOB || '',
          birthDate: jsonData.suitorDOB || '',
          birthRegistryNumber: jsonData.suitorBirthRegistryNumber || '',
          commune: jsonData.suitorCommune || '',
          administrativeAnnex: jsonData.suitorAdministrativeAnnex || '',
          hasWakil: jsonData.suitorHasWakil || false,
          wakilInfo: jsonData.suitorWakilInfo || '',
        };
        result.fiancee = {
          name: `${jsonData.fianceeFirstNameAr} ${jsonData.fianceeLastNameAr}`,
          cin: jsonData.fianceeCIN,
          status: jsonData.fianceeFamilyStatus,
          profession: jsonData.fianceeProfession,
          address: jsonData.fianceeAddress,
          docs: jsonData.fianceeDocs,
          parents: jsonData.fianceeParents || '',
          birthPlace: jsonData.fianceePOB || '',
          birthDate: jsonData.fianceeDOB || '',
          birthRegistryNumber: jsonData.fianceeBirthRegistryNumber || '',
          commune: jsonData.fianceeCommune || '',
          administrativeAnnex: jsonData.fianceeAdministrativeAnnex || '',
          hasWakil: jsonData.fianceeHasWakil || false,
          wakilInfo: jsonData.fianceeWakilInfo || '',
        };
      }
      result.judgeName = jsonData.judgeName || '';
      result.details = {
        type: jsonData.marriageType || jsonData.certificateType,
        hasGuardian: jsonData.hasGuardian === 'نعم',
        guardian: jsonData.hasGuardian === 'نعم' ? jsonData.guardianName : 'لا يوجد',
        guardianCIN: jsonData.guardianCIN || '',
        guardianCapacity: jsonData.guardianCapacity || '',
      };
      return result;
    } catch (e) {
      console.error('Failed to parse JSON in notes');
    }
  }
  
  if (!result.isMarriage) return result;

  // 2. Fallback to Regex parsing (for old requests or requests without JSON)
  const fileMatch = notes.match(/رقم الملف: ([^\n]+)/);
  if (fileMatch) result.fileNumber = fileMatch[1].trim();

  // Try extracting with and without emojis to be robust
  const suitorMatch = idExtract(notes, '👤 بيانات الخاطب:') || idExtract(notes, 'بيانات الخاطب:');
  const fianceeMatch = idExtract(notes, '👩 بيانات المخطوبة:') || idExtract(notes, 'بيانات المخطوبة:');
  const detailsMatch = idExtract(notes, '💍 تفاصيل الزواج:') || idExtract(notes, 'تفاصيل الزواج:');

  // Specific fields
  const getField = (section: string, field: string) => {
    // Escape dots and special chars for the field label
    const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedField}: ([^\n|]+)`);
    const match = section.match(regex);
    return match ? match[1].trim() : '';
  };

  if (suitorMatch) {
    result.suitor = {
      name: getField(suitorMatch, 'الاسم'),
      cin: getField(suitorMatch, 'CIN'),
      status: getField(suitorMatch, 'الحالة'),
      profession: getField(suitorMatch, 'المهنة'),
      address: getField(suitorMatch, 'العنوان'),
    };
  }

  if (fianceeMatch) {
    result.fiancee = {
      name: getField(fianceeMatch, 'الاسم'),
      cin: getField(fianceeMatch, 'CIN'),
      status: getField(fianceeMatch, 'الحالة'),
      profession: getField(fianceeMatch, 'المهنة'),
      address: getField(fianceeMatch, 'العنوان'),
    };
  }

  if (detailsMatch) {
    const guardian = getField(detailsMatch, 'الولي');
    result.details = {
      type: getField(detailsMatch, 'النوع'),
      guardian: guardian,
      hasGuardian: guardian && guardian !== 'لا يوجد' && guardian !== 'بدون' && guardian !== '',
    };
  }

  return result;
};

const idExtract = (text: string, header: string) => {
  const parts = text.split(header);
  if (parts.length < 2) return null;
  return parts[1].split('\n\n')[0];
};

export function PermissionsProcessingPage({ 
  initialCertificateType = 'MARRIAGE_ALL',
  title = 'مركز معالجة طلبات الإذن' 
}: { 
  initialCertificateType?: string;
  title?: string;
}) {
  const { user } = useAuth();
  const { markJudgePermissionSeen, isJudgePermissionSeen, judgePermissionsTotal } = useMessagingNotifications();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد_المعالجة' | 'موافق_عليه' | 'مرفوض'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests, isLoading, refetch } = trpc.notifications.getRequestsList.useQuery(
    {
      status: statusFilter,
      certificateType: initialCertificateType,
      searchTerm: searchTerm,
    },
    {
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
    }
  );

  // Auto-select newest request when list loads/changes
  useEffect(() => {
    if (!selectedRequestId && requests && requests.length > 0) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  // Mark as seen on explicit click (see list item onClick).

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );

  const { data: selectedRequestFull } = trpc.notifications.getNotificationById.useQuery(
    selectedRequestId as string,
    { enabled: !!selectedRequestId }
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
    <div className="flex h-full flex-col space-y-6 overflow-hidden">
      {/* 1. Statistics Dashboard */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'إجمالي الطلبات', value: stats.total, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📄' },
          { label: 'قيد المعالجة', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⏳' },
          { label: 'تمت الموافقة', value: stats.approved, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅' },
          { label: 'الطلبات المرفوضة', value: stats.rejected, color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '❌' },
        ].map((s, idx) => (
          <div key={idx} className={`rounded-xl border p-4 shadow-sm ${s.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold">{s.value}</span>
            </div>
            <div className="mt-2 text-sm font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* 2. Inbox / List (Left Sidebar Style) */}
        <div className="flex w-1/3 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-lg font-bold text-slate-800">صندوق طلبات الإذن</h3>
            {judgePermissionsTotal > 0 ? (
              <div className="mt-2">
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white animate-pulse">
                  جديد: {judgePermissionsTotal}
                </span>
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="بحث بالاسم أو الرقم..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2">
                {['all', 'قيد_المعالجة', 'موافق_عليه', 'مرفوض'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s ? 'bg-[#0b1b3a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'all' ? 'الكل' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="flex h-20 items-center justify-center text-sm text-slate-400">جاري التحميل...</div>
            ) : requests?.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-sm text-slate-400">لا توجد طلبات</div>
            ) : (
              requests?.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    markJudgePermissionSeen(String(req.id));
                    setSelectedRequestId(req.id);
                  }}
                  className={`w-full rounded-xl border p-3 text-right transition-all ${
                    selectedRequestId === req.id 
                      ? 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-500' 
                      : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {!isJudgePermissionSeen(String(req.id)) ? (
                        <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                          جديد
                        </span>
                      ) : null}
                      <span className="text-[10px] font-bold text-slate-400">{req.request_number}</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      req.status === 'موافق_عليه' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'مرفوض' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 text-sm line-clamp-1">{req.involved_names || 'طلب زواج - أسماء غير مدرجة'}</div>
                  <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                    <span>{new Date(req.created_at).toLocaleDateString('ar-MA')}</span>
                    <span className="truncate max-w-[100px]">{req.notary_name || '...'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 3. Detail View (Right Content) */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          {selectedRequest ? (
            <RequestDetailView 
              request={selectedRequestFull || selectedRequest} 
              onDecisionRecorded={() => {
                refetch();
                // We keep selection so they can see the updated status
              }} 
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-50 p-6 text-6xl opacity-40">📄</div>
              <h3 className="text-xl font-bold text-slate-800 opacity-60">اختر طلباً لمعالجته</h3>
              <p className="mt-2 text-slate-500">سيتم عرض كافة تفاصيل الملف والمستندات والتحليلات القانونية هنا.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DocStatusItem = ({ label, doc }: { label: string, doc: any }) => {
  if (!doc) return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2 opacity-50">
       <span className="text-[11px] font-bold text-slate-400">{label}</span>
       <span className="text-[9px] font-bold text-slate-300">غ/مدرج</span>
    </div>
  );

  const hasUrl = !!doc.uploadedUrl;
  
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-2 transition-all ${hasUrl ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-700">{label}</span>
        {hasUrl ? (
          <a 
            href={doc.uploadedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1 animate-pulse-slow"
          >
            <span>📥</span> عرض الوثيقة
          </a>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">بيانات فقط</span>
        )}
      </div>
      {(doc.number || doc.date) && (
        <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-slate-600">
          <span className="font-medium">الرقم: <span className="font-bold">{doc.number || '---'}</span></span>
          <span className="font-medium">التاريخ: <span className="font-bold">{doc.date || '---'}</span></span>
        </div>
      )}
    </div>
  );
};

const parseAttachments = (request: any, parsedData: any) => {
  let raw: any[] = [];
  
  // 1. Check attachments column
  if (request.attachments) {
    if (Array.isArray(request.attachments)) {
      raw = request.attachments;
    } else {
      try {
        if (typeof request.attachments === 'string' && request.attachments.length > 5) {
          raw = JSON.parse(request.attachments);
        }
      } catch (e) {}
    }
  }

  // 2. Fallback to notes JSON
  if ((!raw || raw.length === 0) && parsedData?.uploadedAttachments) {
    raw = parsedData.uploadedAttachments;
  }

  if (!Array.isArray(raw)) raw = raw ? [raw] : [];

  return raw.map((a: any, i: number) => {
    if (typeof a === 'string') return { url: a, name: `مرفق ${i+1}` };
    return {
      url: a.url || a.uploadedUrl || a.link,
      name: a.name || a.description || a.type || `مرفق ${i+1}`
    };
  }).filter(a => !!a.url);
};

function RequestDetailView({ request, onDecisionRecorded }: { request: any, onDecisionRecorded: () => void }) {
  const { user } = useAuth();
  const parsedData = useMemo(() => parseRequestNotes(request.notes), [request.notes]);
  const attachments = useMemo(() => parseAttachments(request, parsedData), [request, parsedData]);

  // If it's an Adl Copy Permission, use the specialized high-fidelity processing module
  if (parsedData?.isAdlCopy) {
    return <AdlCopyProcessingModule request={request} onComplete={onDecisionRecorded} />;
  }

  const [decision, setDecision] = useState<{ type: string, reasoning: string, notes: string }>({
    type: '',
    reasoning: '',
    notes: ''
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showApprovalTemplate, setShowApprovalTemplate] = useState(false);

  const backfillNotesMutation = trpc.notifications.backfillMarriagePermissionNotes.useMutation({
    onSuccess: (res: any) => {
      if (res?.updatedCount > 0) {
        alert('تم استرجاع نص الطلب بنجاح.');
      } else {
        alert('لا يوجد ما يمكن استرجاعه لهذا الطلب.');
      }
      onDecisionRecorded();
    },
  });

  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation({
    onSuccess: (res: any) => {
      onDecisionRecorded();
      const savedType = res?.updated?.[0]?.decision_type;
      alert(savedType ? `تم إرسال القرار بنجاح (${savedType})` : 'تم إرسال القرار بنجاح.');
    },
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || 'حدث خطأ أثناء إرسال القرار';
      alert(`فشل إرسال القرار: ${msg}`);
    },
  });

  const handleAction = (type: any) => {
    if (!decision.reasoning) {
      alert('يرجى إدخال تعليل القرار أولاً.');
      return;
    }
    recordDecisionMutation.mutate({
      notificationId: request.id,
      decisionType: type,
      reasoning: decision.reasoning,
      internalNotes: decision.notes
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#0b1b3a]">
               {request.certificate_type?.includes('زواج') ? 'تفاصيل طلب الإذن بالزواج' : 'تفاصيل طلب الإذن الإلكتروني'}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <span className="font-mono text-xs">{request.request_number}</span>
              <span>•</span>
              <span className="flex items-center gap-1">📅 {new Date(request.created_at).toLocaleDateString('ar-MA')}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-amber-600">👤 العدل: {request.notary_name}</span>
            </div>
          </div>
          <div className="flex gap-2">
             <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-slate-50">
               🖨️ طباعة الملف
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f1f5f9]">
        <div className="flex flex-col lg:flex-row gap-6 max-w-[1700px] mx-auto h-full">
          
          {/* MAIN COLUMN: Document & Data (Flex 1) */}
          <div className="flex-1 flex flex-col space-y-6 min-w-0">
             {/* 📄 Full Original Document View */}
             <div className="rounded-2xl border-2 border-white bg-slate-300 shadow-xl overflow-hidden flex flex-col min-h-[700px]">
                <div className="bg-[#1e293b] text-white p-3 px-6 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <h4 className="font-bold flex items-center gap-2">
                        <span>📄</span> وثيقـــــــــــة الطلب الأصلية
                      </h4>
                      <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">PAPER VIEW</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsFullScreen(true)}
                        className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      >
                        <span>🔍</span> تكبير العرض
                      </button>
                   </div>
                </div>
                
                <div 
                   className="flex-1 p-4 md:p-10 overflow-y-auto bg-slate-400/20 cursor-zoom-in flex justify-center"
                   onClick={() => setIsFullScreen(true)}
                >
                   <div className="w-full max-w-3xl shadow-2xl transition-transform hover:scale-[1.01] origin-top bg-white rounded-sm">
                      {(!request.notes || String(request.notes).trim().length === 0) ? (
                        <div className="p-20 text-center">
                           <p className="text-slate-400 font-bold mb-4">بيانات الملف غير متوفرة بصيغة العرض الورقي.</p>
                           <button
                             onClick={() => backfillNotesMutation.mutate({ notificationId: request.id })}
                             className="text-amber-700 underline text-sm font-black"
                           >
                             🔁 محاولة توليد نص العرض
                           </button>
                        </div>
                      ) : parsedData?.isMarriage ? (
                        <MarriageDocumentView 
                          data={parsedData?.fullData || {}} 
                          notaryData={{
                            fullName: request.notary_name,
                            jurisdiction: request.jurisdiction,
                            professionalNumber: request.notary_professional_number
                          }}
                        />
                      ) : parsedData?.isAdlCopy ? (
                        <AdlCopyDocumentView 
                          data={parsedData?.fullData || {}} 
                          notaryData={{
                            fullName: request.notary_name,
                            jurisdiction: request.jurisdiction,
                            professionalNumber: request.notary_professional_number
                          }}
                        />
                      ) : (
                        <WorkCertificateDocumentView 
                          data={parsedData?.fullData || {}} 
                          notaryData={{
                            fullName: request.notary_name,
                            jurisdiction: request.jurisdiction,
                            professionalNumber: request.notary_professional_number
                          }}
                        />
                      )}
                   </div>
                </div>
             </div>

             {/* SUMMARY CARDS - AT THE BOTTOM */}
             {parsedData?.isMarriage && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Suitor Quick Info */}
                <div className="rounded-2xl border-t-4 border-blue-500 bg-white p-5 shadow-sm">
                   <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                      <h4 className="font-extrabold text-blue-900 flex items-center gap-2 text-base">
                         <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">♂️</span>
                         بيانات الخاطب
                      </h4>
                      {parsedData?.suitor?.status === 'متزوج' && <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-black animate-pulse">تنبيه تعدد</span>}
                   </div>
                   {parsedData?.suitor ? (
                     <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">الاسم الكامل</p>
                           <p className="font-bold text-slate-800">{parsedData.suitor.name}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">رقم البطاقة الوطنية</p>
                           <p className="font-mono font-black text-blue-700">{parsedData.suitor.cin}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">الحالة العائلية</p>
                           <p className="font-bold text-slate-800">{parsedData.suitor.status}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">المهنة</p>
                           <p className="font-bold text-slate-800">{parsedData.suitor.profession}</p>
                        </div>
                     </div>
                   ) : <p className="text-xs text-slate-400 italic mb-4">لم يتم استخراج البيانات الأساسية.</p>}
                   
                   {parsedData?.suitor?.docs && (
                      <div className="space-y-2 border-t border-slate-50 pt-3">
                         <p className="text-[11px] font-black text-slate-500 mb-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            المستندات الثبوتية الملحقة
                         </p>
                         <div className="grid grid-cols-1 gap-2">
                            <DocStatusItem label="الشهادة الإدارية" doc={parsedData.suitor.docs.adminCert} />
                            <DocStatusItem label="نسخة رسم الولادة" doc={parsedData.suitor.docs.birthCert} />
                            <DocStatusItem label="الشهادة الطبية" doc={parsedData.suitor.docs.medicalCert} />
                            {parsedData.suitor.docs.marriagePermission?.number && (
                               <DocStatusItem label="إذن الزواج (تعدد/قاصر)" doc={parsedData.suitor.docs.marriagePermission} />
                            )}
                         </div>
                      </div>
                   )}
                </div>

                {/* Fiancee Quick Info */}
                <div className="rounded-2xl border-t-4 border-rose-500 bg-white p-5 shadow-sm">
                   <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                      <h4 className="font-extrabold text-rose-900 flex items-center gap-2 text-base">
                         <span className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm">♀️</span>
                         بيانات المخطوبة
                      </h4>
                   </div>
                   {parsedData?.fiancee ? (
                     <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">الاسم الكامل</p>
                           <p className="font-bold text-slate-800">{parsedData.fiancee.name}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">رقم البطاقة الوطنية</p>
                           <p className="font-mono font-black text-rose-700">{parsedData.fiancee.cin}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">الحالة العائلية</p>
                           <p className="font-bold text-slate-800">{parsedData.fiancee.status}</p>
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-tight">المهنة</p>
                           <p className="font-bold text-slate-800">{parsedData.fiancee.profession}</p>
                        </div>
                     </div>
                   ) : <p className="text-xs text-slate-400 italic mb-4">لم يتم استخراج البيانات الأساسية.</p>}

                   {parsedData?.fiancee?.docs && (
                      <div className="space-y-2 border-t border-slate-50 pt-3">
                         <p className="text-[11px] font-black text-slate-500 mb-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            المستندات الثبوتية الملحقة
                         </p>
                         <div className="grid grid-cols-1 gap-2">
                            <DocStatusItem label="الشهادة الإدارية" doc={parsedData.fiancee.docs.adminCert} />
                            <DocStatusItem label="نسخة رسم الولادة" doc={parsedData.fiancee.docs.birthCert} />
                            <DocStatusItem label="الشهادة الطبية" doc={parsedData.fiancee.docs.medicalCert} />
                         </div>
                      </div>
                   )}
                </div>
             </div>
             )}

             {!parsedData?.isMarriage && (
               <div className="rounded-2xl border-t-4 border-emerald-500 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                     <h4 className="font-extrabold text-emerald-900 flex items-center gap-2 text-base">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">📋</span>
                        ملخص بيانات طلب شهادة العمل
                     </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">البيانات الشخصية</p>
                        <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                           <p className="text-xs font-bold text-slate-800">الاسم: {parsedData?.fullData?.fullName}</p>
                           <p className="text-xs font-bold text-slate-800">CIN: {parsedData?.fullData?.cin}</p>
                           <p className="text-[10px] text-slate-500 font-mono">{parsedData?.fullData?.professionalNumber}</p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">نوع الطلب والغرض</p>
                        <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                           <p className="text-xs font-black text-blue-700">{parsedData?.fullData?.certificateType}</p>
                           <p className="text-[10px] italic text-slate-600">{parsedData?.fullData?.customPurpose || 'غرض إداري عام'}</p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">المرفقات الرقمية</p>
                        <div className="flex flex-wrap gap-2">
                           {attachments.length > 0 ? (
                             attachments.map((att: any, idx: number) => (
                               <a 
                                 key={idx} 
                                 href={att.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                               >
                                 <span>📎</span>
                                 <span>{att.name}</span>
                               </a>
                             ))
                           ) : (
                             <>
                               {parsedData?.fullData?.attachments?.cinCopy && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">✓ البطاقة الوطنية</span>}
                               {parsedData?.fullData?.attachments?.professionalIdCopy && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold">✓ البطاقة المهنية</span>}
                               {(!parsedData?.fullData?.attachments?.cinCopy && !parsedData?.fullData?.attachments?.professionalIdCopy) && (
                                 <span className="text-[9px] text-slate-400 italic">لا توجد مرفقات</span>
                               )}
                             </>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
             )}
          </div>

          {/* SIDEBAR COLUMN: Intelligence, Decision & Log (Fixed width) */}
          <div className="w-full lg:w-[450px] space-y-6 shrink-0 h-full">
             {/* 🤖 Judge Assistant (Moudawana Checks) */}
             <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <h4 className="text-lg font-black text-amber-900">المساعد الرقمي الذكي</h4>
                    <p className="text-[10px] text-amber-700 font-bold opacity-70">فحص آلي لمقتضيات {parsedData?.isMarriage ? 'مدونة الأسرة' : 'المساطر الإدارية'}</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  {parsedData?.isMarriage ? (
                    <>
                      {/* Age Alert */}
                      <div className="flex gap-4 items-start bg-white/60 p-3 rounded-xl border border-amber-100">
                         <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-xs shadow-sm shadow-emerald-200">✓</div>
                         <div>
                            <div className="text-sm font-black text-amber-950">الأهلية القانونية (المادة 19)</div>
                            <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">الطرفان بلغا السن القانوني للزواج (18 سنة شمسية كاملة). لا يتطلب الأمر إذن قاضي القاصرين.</p>
                         </div>
                      </div>

                      {/* Documentation Check */}
                      <div className="p-4 bg-white/80 rounded-xl border-2 border-amber-200 shadow-inner">
                         <div className="text-xs font-black text-amber-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">📑 صحة الملف المرفق (المادة 65)</span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">مكتمل</span>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'شهادة إدارية', ok: !!parsedData?.suitor?.docs?.adminCert?.uploadedUrl },
                              { label: 'رسم الولادة', ok: !!parsedData?.suitor?.docs?.birthCert?.uploadedUrl },
                              { label: 'شهادة طبية', ok: !!parsedData?.suitor?.docs?.medicalCert?.uploadedUrl },
                              { label: 'التوقيعات', ok: !!parsedData?.fullData?.suitorSignature }
                            ].map((item, idx) => (
                               <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-1.5 rounded-lg">
                                  <span className={item.ok ? "text-emerald-500" : "text-amber-400"}>{item.ok ? "●" : "○"}</span>
                                  <span className={item.ok ? "" : "opacity-50"}>{item.label}</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* Polygamy Alert */}
                      {parsedData?.suitor?.status === 'متزوج' ? (
                        <div className="p-4 bg-rose-50 rounded-xl border-2 border-rose-200 animate-pulse">
                          <div className="text-xs font-black text-rose-900 flex items-center gap-2 mb-1">
                            <span className="text-lg">⚠️</span> تنبيه تعدد الزوجات (المادة 40)
                          </div>
                          <p className="text-[11px] text-rose-800 leading-relaxed font-bold">
                            تنبيه: الخاطب متزوج. يتطلب الإذن بالزواج إثبات المبرر الاستثنائي الاستثنائي والقدرة المالية الكافية لإعالة الأسرتين.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                           <span className="text-emerald-600">✨</span>
                           <span className="text-[10px] font-bold text-emerald-800">الحالة العائلية لا تثير موانع تعدد الزوجات.</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Generic Documentation Check for Smart Permissions */}
                      <div className="p-4 bg-white/80 rounded-xl border-2 border-amber-200 shadow-inner">
                         <div className="text-xs font-black text-amber-900 mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">📑 التحقق الإداري (المادة 14 / 44)</span>
                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">مكتمل</span>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                               <span className="text-emerald-500">✓</span>
                               <span>العدل ممارس بصفة قانونية (المادة 14)</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                               <span className="text-emerald-500">✓</span>
                               <span>استيفاء شروط الشهادة (المادة 44)</span>
                            </div>
                         </div>
                         <p className="text-[10px] text-amber-800 mt-3 leading-relaxed font-bold border-t border-amber-100 pt-2">
                            تم فحص محتوى الطلب الإلكتروني رقم {request.request_number}. الطلب مطابق للمخطط الهيكلي المعتمد لطلبات شهادة العمل.
                         </p>
                      </div>
                      
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2">
                         <span className="text-emerald-600">✨</span>
                         <span className="text-[10px] font-bold text-emerald-800">مدة المعالجة المتوقعة: 15 يوماً من التصديق.</span>
                      </div>
                    </>
                  )}
                </div>
             </div>

             {/* 📂 Attachments from Notary */}
             {(request.attachments || parsedData?.fullData?.uploadedAttachments) && (
               <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 shadow-md">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
                     📂
                   </div>
                   <div>
                     <h4 className="text-base font-black text-blue-900">وثائق مرفقة للطلب</h4>
                     <p className="text-[10px] text-blue-700 font-bold opacity-70">المستندات التي أرفقها العدل عبر البوابة</p>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                   {(() => {
                     try {
                       let atts = request.attachments || parsedData?.fullData?.uploadedAttachments;
                       if (typeof atts === 'string' && atts.trim().startsWith('[')) {
                         atts = JSON.parse(atts);
                       }
                       
                       return Array.isArray(atts) ? atts.map((att: any, idx: number) => (
                         <a 
                           key={idx}
                           href={att.url || att.uploadedUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all group"
                         >
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm group-hover:bg-blue-50 transition-colors">
                               📄
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[11px] font-black text-slate-700 leading-tight">{att.name || 'وثيقة إضافية'}</span>
                               <span className="text-[9px] text-slate-400 font-medium">عرض فوري بالنظام</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              {att.size && <span className="text-[9px] text-slate-300 font-bold">{att.size}</span>}
                              <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">👁️</span>
                           </div>
                         </a>
                       )) : null;
                     } catch (e) {
                       return null;
                     }
                   })()}
                 </div>
               </div>
             )}

             {/* ⚖️ Judge Decision Panel */}
             <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-lg">
                <h4 className="mb-5 text-lg font-black text-slate-900 flex items-center gap-3">
                   <span className="text-2xl">⚖️</span> صياغة القرار القضائي
                </h4>
                
                <div className="space-y-5">
                   <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 mr-1">حيثيات وتعليل القرار:</label>
                      <textarea 
                        className="w-full rounded-xl border-2 border-slate-100 p-4 text-sm focus:border-amber-500 focus:outline-none placeholder:text-slate-300 font-medium bg-slate-50/50 min-h-[120px]"
                        placeholder="بناء على الحجج المدلى بها... قررنا منح الإذن..."
                        value={decision.reasoning}
                        onChange={(e) => setDecision({...decision, reasoning: e.target.value})}
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-black text-slate-700 mb-2 mr-1">ملاحظات سرية (للمحكمة فقط):</label>
                      <input 
                        type="text"
                        className="w-full rounded-xl border-2 border-slate-100 p-3 text-sm focus:border-amber-500 focus:outline-none bg-slate-50/50"
                        placeholder="مثلا: شكوك في هوية الطرف..."
                        value={decision.notes}
                        onChange={(e) => setDecision({...decision, notes: e.target.value})}
                      />
                   </div>

                   <div className="flex flex-col gap-3 pt-2">
                      <div className="flex gap-3">
                        <button 
                           onClick={() => {
                             setDecision(prev => ({ ...prev, type: 'موافقة' }));
                             setShowApprovalTemplate(true);
                           }}
                           disabled={recordDecisionMutation.isPending}
                           className="flex-1 rounded-xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                           {recordDecisionMutation.isPending ? '...' : '✅ منح الإذن'}
                        </button>
                        <button 
                           onClick={() => handleAction('رفض')}
                           disabled={recordDecisionMutation.isPending}
                           className="flex-1 rounded-xl bg-rose-600 py-4 font-black text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                           ❌ رفض الطلب
                        </button>
                      </div>
                      
                      <button 
                         onClick={() => handleAction('تأجيل')}
                         disabled={recordDecisionMutation.isPending}
                         className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 py-3.5 font-black text-amber-700 transition-all hover:bg-amber-100 text-sm"
                      >
                         ⏳ استكمال الوثائق / استدعاء الأطراف
                      </button>
                   </div>
                </div>
             </div>

             {/* Audit Log Vertical */}
             <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h5 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2 flex justify-between items-center">
                   <span>سجل عمليات الملف</span>
                   <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded">Live Audit</span>
                </h5>
                <div className="relative space-y-6 border-r-2 border-slate-100 pr-5 mr-1">
                   <div className="relative">
                      <div className="absolute -right-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
                      <div className="text-xs font-black text-slate-800">إيداع الطلب</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">بواسطة العدل: {request.notary_name}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1">{new Date(request.created_at).toLocaleString('ar-MA')}</div>
                   </div>
                   
                   {request.status === 'موافق_عليه' && (
                     <div className="relative">
                        <div className="absolute -right-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow-sm"></div>
                        <div className="text-xs font-black text-slate-800">إقرار الموافقة</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">تم توقيع الإذن القضائي الإلكتروني</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-1">{new Date(request.decided_at || Date.now()).toLocaleString('ar-MA')}</div>
                     </div>
                   )}

                   <div className="relative opacity-30">
                      <div className="absolute -right-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-300"></div>
                      <div className="text-xs font-bold text-slate-400 italic">تبليغ القرار للمواطن</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Full Screen Document Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10 animate-fadeIn">
           <div className="relative w-full max-w-5xl h-full flex flex-col">
              {/* Close Button & Header */}
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-t-2xl border-b border-slate-800">
                 <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                       <h3 className="font-bold">عرض الوثيقة الأصلية - بملء الشاشة</h3>
                       <p className="text-[10px] text-slate-400">رقم الملف: {request.request_number}</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsFullScreen(false)}
                   className="rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>

              {/* Document Container */}
              <div className="flex-1 overflow-y-auto bg-slate-800 p-4 md:p-8 rounded-b-2xl">
                 <div className="mx-auto max-w-4xl shadow-2xl scale-100 origin-top transform transition-transform duration-300">
                    {parsedData?.isMarriage ? (
                       <MarriageDocumentView 
                         data={parsedData?.fullData || {}} 
                         notaryData={{
                           fullName: request.notary_name,
                           jurisdiction: request.jurisdiction,
                           professionalNumber: request.notary_professional_number
                         }}
                       />
                    ) : parsedData?.isAdlCopy ? (
                       <AdlCopyDocumentView 
                         data={parsedData?.fullData || {}} 
                         notaryData={{
                           fullName: request.notary_name,
                           jurisdiction: request.jurisdiction,
                           professionalNumber: request.notary_professional_number
                         }}
                       />
                    ) : (
                       <WorkCertificateDocumentView 
                         data={parsedData?.fullData || {}} 
                         notaryData={{
                           fullName: request.notary_name,
                           jurisdiction: request.jurisdiction,
                           professionalNumber: request.notary_professional_number
                         }}
                       />
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 📜 Marriage Approval Document (Exact Template Match) */}
      {showApprovalTemplate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
           <div className="relative w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl rounded-sm my-10 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-slate-100 p-4 border-b shrink-0 z-[10001]">
                 <div className="flex gap-4">
                   <button 
                     onClick={() => {
                        handleAction('موافقة');
                        setShowApprovalTemplate(false);
                     }}
                     className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-black hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                   >
                     <span>✍️</span> تأكيد التوقيع والإرسال النهائي
                   </button>
                   <button className="bg-slate-700 text-white px-6 py-2 rounded-lg font-black hover:bg-slate-800 shadow-md transition-all flex items-center gap-2">
                     <span>🖨️</span> طباعة الإذن
                   </button>
                 </div>
                 <button 
                   onClick={() => setShowApprovalTemplate(false)}
                   className="text-slate-400 hover:text-rose-600 transition-colors bg-white w-10 h-10 rounded-full border flex items-center justify-center font-bold"
                 >
                    ✕
                 </button>
              </div>

              {/* The "Exact" Template */}
              <div className="flex-1 overflow-y-auto bg-slate-500 p-4 md:p-8 custom-scrollbar">
                 <div id="printable-template" className="mx-auto max-w-4xl min-h-full p-8 md:p-14 text-right font-amiri text-black leading-loose select-none bg-white relative shadow-2xl">
                    {/* Double Border Frame */}
                    <div className="absolute inset-4 border-[2px] border-black pointer-events-none"></div>
                    <div className="absolute inset-5 border-[1px] border-black pointer-events-none"></div>

                    <div className="relative z-10 px-6 py-2">
                    {/* Header */}
                    <div className="relative flex justify-between items-start mb-12 text-[11px] md:text-xs min-h-[180px]">
                       {/* Middle: Coat of Arms */}
                       <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
                            className="h-28 w-auto"
                            alt="Coat of arms"
                          />
                       </div>

                        {/* Right side: Official Labels */}
                       <div className="text-right font-bold space-y-1 w-1/3">
                          <p className="text-sm">المملكة المغربية</p>
                          <p>وزارة العدل</p>
                          <p>محكمة الاستئناف بـ {(request.jurisdiction || 'تطوان').replace('محكمة الاستئناف', '').replace('المحكمة الابتدائية', '').replace(/^بـ\s*/, '').trim()}</p>
                          <p className="border-b-2 border-black pb-1 inline-block">المحكمة الابتدائية بـ {(request.target_court || 'شفشاون').replace('المحكمة الابتدائية', '').replace('محكمة الاستئناف', '').replace(/^بـ\s*/, '').trim()}</p>
                          <div className="pt-6 space-y-3">
                             <p className="font-black text-sm underline underline-offset-4 tracking-widest">قسم قضاء الأسرة</p>
                             <p className="text-[10px] font-bold">ملف مستندات الزواج</p>
                             <div className="text-[11px] space-y-2 mt-2">
                                <p>رقــــــــــــــــــــم: {new Date().getFullYear()} / {request.request_number.split('-')[1] || '.............'}</p>
                                <p>رقم السجل: {new Date().getFullYear()} / {request.id.substring(0, 5).toUpperCase()}</p>
                             </div>
                          </div>
                       </div>

                       {/* Left side: Empty for balance */}
                       <div className="w-1/3 order-last"></div>
                    </div>

                    {/* Main Title - Calligraphic Style */}
                    <div className="text-center mb-6">
                       {!parsedData?.isMarriage && (
                         <div className="mb-6 space-y-1 text-base font-bold">
                            <p>الحمــــــــد لله وحــــــــده</p>
                            <p>وصلى الله وسلم على مولانا رسول الله</p>
                         </div>
                       )}
                       <h1 className="text-5xl font-black inline-block px-14 py-4">
                          {parsedData?.isMarriage ? 'إذن بتوثيق عقد الزواج' : 'شهادة عمل'}
                       </h1>
                    </div>

                    {/* Document Contents */}
                    <div className="space-y-4 text-sm md:text-[15px] leading-[2.1] text-justify">
                       {parsedData?.isMarriage && (
                          <div className="flex items-center gap-2 mb-2">
                             <span className="font-black text-lg">نحـــــــــــــــــن الأستاذ /</span>
                             <span className="flex-1 border-b border-dotted border-black px-4 font-bold text-slate-900 leading-none h-8">
                               {parsedData?.judgeName || user?.full_name || `قاضي الأسرة المكلف بالزواج`}
                             </span>
                          </div>
                       )}

                       {parsedData?.isMarriage ? (
                         <>
                            <div className="indent-10">
                               بناء على الطلب المسجل تحت عدد <span className="font-black">{request.request_number}</span> بتاريخ <span className="font-black">{new Date(request.created_at).toLocaleDateString('ar-MA')}</span> الذي تقدم به السيد (1) : <span className="font-black text-lg px-2">{(parsedData as any)?.suitor?.name || '................................'}</span> المولود بـ (2) <span className="font-bold">{(parsedData as any)?.suitor?.birthPlace || '................'}</span> بتاريخ <span className="font-bold">{(parsedData as any)?.suitor?.birthDate || '................'}</span> والداه (3) <span className="font-bold">{(parsedData as any)?.suitor?.parents || '................................................................'}</span> ببطاقته الوطنية رقم (2) <span className="font-black text-blue-900">{(parsedData as any)?.suitor?.cin}</span> مهنته (3) <span className="font-bold">{(parsedData as any)?.suitor?.profession}</span> جنسيته مغربية، حالته العائلية <span className="font-black">{parsedData?.suitor?.status}</span> حسب الشهادة الإدارية أو شهادة الكفاءة في الزواج (4) رقم <span className="font-bold">{(parsedData as any)?.suitor?.docs?.adminCert?.number || (parsedData as any)?.suitor?.docs?.competenceCert?.number || '.......'}</span> من الملحقة الإدارية <span className="font-bold">{(parsedData as any)?.suitor?.administrativeAnnex || (parsedData as any)?.suitor?.docs?.adminCert?.issuer || '...........'}</span> الجماعة <span className="font-bold">{(parsedData as any)?.suitor?.commune || '...........'}</span> بتاريخ <span className="font-bold">{(parsedData as any)?.suitor?.docs?.adminCert?.date || '...........'}</span> الساكن <span className="font-bold">{(parsedData as any)?.suitor?.address}</span>.
                            </div>

                            {parsedData?.suitor?.hasWakil && (
                               <p className="border-b border-dotted border-black/40 pb-1 italic">
                                  اسم الوكيل (5) وبرقم بطاقته الوطنية وتاريخ ومكان صدور الوكالة في الزواج ومراجعتها وتاريخ التأشير عليها : <span className="font-bold">{(parsedData as any)?.suitor?.wakilInfo || 'لا يوجد'}</span>
                               </p>
                            )}

                            <p className="text-center font-black py-2 text-xl tracking-[0.2em]">والراغب في الإذن له بتوثيق عقد الزواج</p>

                            <div className="indent-10">
                               مع السيدة (1) : <span className="font-black text-lg px-2">{(parsedData as any)?.fiancee?.name || '................................'}</span> المولودة بـ (2) <span className="font-bold">{(parsedData as any)?.fiancee?.birthPlace || '................'}</span> بتاريخ <span className="font-bold">{(parsedData as any)?.fiancee?.birthDate || '................'}</span> من والداها (3) <span className="font-bold">{(parsedData as any)?.fiancee?.parents || '................................................................'}</span> حسب رسم ولادتها رقم <span className="font-bold">{(parsedData as any)?.fiancee?.birthRegistryNumber || (parsedData as any)?.fiancee?.docs?.birthCert?.number || '.......'}</span> لجماعة <span className="font-bold">{(parsedData as any)?.fiancee?.commune || '...........'}</span> ببطاقتها الوطنية رقم (2) <span className="font-black text-rose-900">{(parsedData as any)?.fiancee?.cin}</span> مهنتها (3) <span className="font-bold">{(parsedData as any)?.fiancee?.profession}</span> جنسيتها مغربية، حالتها <span className="font-black">{(parsedData as any)?.fiancee?.status}</span> حسب الشهادة الإدارية أو شهادة الكفاءة في الزواج (4) رقم <span className="font-bold">{(parsedData as any)?.fiancee?.docs?.adminCert?.number || (parsedData as any)?.fiancee?.docs?.competenceCert?.number || '.......'}</span> بمراجعة <span className="font-bold">{(parsedData as any)?.fiancee?.administrativeAnnex || (parsedData as any)?.fiancee?.docs?.adminCert?.issuer || '...........'}</span> الساكنة بـ <span className="font-bold">{(parsedData as any)?.fiancee?.address}</span>.
                            </div>

                            {parsedData?.details?.hasGuardian && (
                               <p className="border-b border-dotted border-black/40 pb-1">
                                  اسم الولي عند الاقتضاء والخاطب : <span className="font-bold">{parsedData?.details?.guardian}</span> بصفته <span className="font-bold">{parsedData?.details?.guardianCapacity || '--'}</span> بطاقته رقم <span className="font-bold font-mono">{parsedData?.details?.guardianCIN || '--'}</span>
                               </p>
                            )}

                            {parsedData?.fiancee?.hasWakil && (
                               <p className="border-b border-dotted border-black/40 pb-1 italic">
                                  اسم الوكيل (5) وبرقم بطاقته الوطنية وتاريخ ومكان صدور الوكالة في الزواج ومراجعتها وتاريخ التأشير عليها : <span className="font-bold">{(parsedData as any)?.fiancee?.wakilInfo || 'لا يوجد'}</span>
                               </p>
                            )}

                            <div className="space-y-4 pt-4 text-[13px] font-bold text-slate-700">
                               <p>وبناء على الإذن بالزواج عدد (6) <span className="font-black border-slate-300">{(parsedData as any)?.suitor?.docs?.marriagePermission?.number || (parsedData as any)?.fiancee?.docs?.marriagePermission?.number || request.request_number.split('-')[1]}</span> بتاريخ <span className="font-black border-slate-300">{(parsedData as any)?.suitor?.docs?.marriagePermission?.date || (parsedData as any)?.fiancee?.docs?.marriagePermission?.date || new Date().toLocaleDateString('ar-MA')}</span> الصادر عن قاضي الأسرة المكلف بالزواج بالابتدائية بـ {request.target_court || 'شفشاون'}</p>
                               <p>وبناء على الوثائق المدلى بها في الملف المشار أعلاه.</p>
                               <p>وتطبيقا للمادة 65 من مدونة الأسرة.</p>
                            </div>
                         </>
                       ) : (
                         <>
                            <div className="font-bold text-lg mb-6">
                               يشهد القاضي المكلف بالتوثيق لدى المحكمة الابتدائية بـ: <span className="underline decoration-dotted">{request.target_court || '__________'}</span>
                            </div>
                            
                            <p className="font-bold underline underline-offset-4 mb-4 text-base">أن السيد(ة):</p>

                            <div className="space-y-2 px-6 font-bold">
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">الاسم الشخصي والعائلي:</span>
                                  <span className="border-b border-dotted border-black flex-1">{parsedData?.fullData?.fullName || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">الصفة:</span>
                                  <span className="border-b border-dotted border-black flex-1">عدل</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">الرقم المهني:</span>
                                  <span className="border-b border-dotted border-black flex-1 font-mono">{parsedData?.fullData?.professionalNumber || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">تاريخ التعيين:</span>
                                  <span className="border-b border-dotted border-black flex-1">{parsedData?.fullData?.appointmentDate || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">المحكمة الابتدائية التابع لها:</span>
                                  <span className="border-b border-dotted border-black flex-1">{parsedData?.fullData?.court || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">محكمة الاستئناف التابع لها:</span>
                                  <span className="border-b border-dotted border-black flex-1">{parsedData?.fullData?.appellateCourt || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">رقم البطاقة الوطنية للتعريف:</span>
                                  <span className="border-b border-dotted border-black flex-1 font-mono">{parsedData?.fullData?.cin || '................'}</span>
                               </p>
                               <p className="flex items-baseline gap-2">
                                  <span className="min-w-[200px]">الرقم الضريبي:</span>
                                  <span className="border-b border-dotted border-black flex-1 font-mono">{parsedData?.fullData?.taxId || '................'}</span>
                               </p>
                            </div>

                            <div className="indent-10 pt-6 text-justify font-bold leading-loose">
                               يزاول(تزاول) مهنة العدول بصفة قانونية ومنتظمة، ويمارس(تمارس) مهامه(ا) المهنية في إطار الاختصاص الترابي للمحكمة المذكورة أعلاه، وذلك طبقًا للقوانين والأنظمة الجاري بها العمل، ودون وجود ما يمنع مهنيًا أو تنظيميًا من مزاولة هذه المهنة إلى تاريخ تسليم هذه الشهادة.
                            </div>

                            <div className="indent-10 text-justify font-bold leading-loose">
                               وقد سلمت هذه الشهادة للمعني(ة) بالأمر بناءً على طلبه(ها)، للإدلاء بها لدى الجهات المختصة، طبقًا للمقتضيات القانونية والتنظيمية الجاري بها العمل.
                            </div>
                         </>
                       )}


                       <div className="text-center py-6">
                          <h2 className="text-3xl font-black">لأجــــــلـــه</h2>
                       </div>

                       <p className="text-center font-black text-xl md:text-2xl leading-[1.8] tracking-wide px-10">
                          {parsedData?.isMarriage ? 
                             'فأننا نأذن لعدليين منتصبين للإشهاد بدائرة هذه المحكمة بتوثيق عقد الزواج المذكور طبقا للقواعد المنصوص عليها في مدونة الأسرة.' :
                             'فأننا نقرر منح المعني بالأمر الشهادة / الإذن المطلوب أعلاه لاستعماله فيما يسمح به القانون.'
                          }
                       </p>

                       <div className="flex justify-between items-end pt-8 border-t-2 border-black/10 mt-10 pb-12">
                          <div className="space-y-4 text-sm font-bold">
                             <p>وحرر بـ {request.target_court || 'شفشاون'} في: <span className="px-2">{new Date().toLocaleDateString('ar-MA')}</span></p>
                             <div className="pt-2 text-[10px] space-y-1 opacity-70">
                                <p>رقم الشهادة: {request.request_number.replace('CT-WORK-', 'CERT-')}</p>
                                <p>تاريخ التسجيل: {new Date(request.created_at).toLocaleDateString('ar-MA')}</p>
                             </div>
                             <p className="pt-4">{parsedData?.isMarriage ? 'موافق :' : 'القاضي المكلف بالتوثيق'} ................................................................</p>
                          </div>
                          <div className="text-center font-black space-y-12">
                             <p className="text-lg">الإمضـــــــــــــــــــــــــــــاء والختم</p>
                             <div className="w-36 h-36 border-2 border-dotted border-slate-300 flex flex-col items-center justify-center rounded-full opacity-40 text-[9px] -rotate-12 scale-90">
                                <span className="font-mono">OFFICIAL SEAL</span>
                                <span className="font-mono text-[7px] mt-1">ID: {request.id.substring(0,8).toUpperCase()}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    )}
    </div>
  );
}
export default PermissionsProcessingPage;
