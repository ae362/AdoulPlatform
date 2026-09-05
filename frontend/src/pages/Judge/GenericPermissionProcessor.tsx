import React, { useState, useMemo, useEffect } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { printElement } from '../../utils/print';
import { WordPreview } from '../../components/WordPreview';

interface GenericPermissionProcessorProps {
  type: 'scientific' | 'marriage' | 'judicialFees' | 'individualReception';
  title: string;
  icon: string;
  documentViewComponent: React.ComponentType<any>;
  approvalTemplateComponent: React.ComponentType<any>;
  queryHook: any;
}

type NormalizedAttachment = {
  id: string;
  url: string;
  name: string;
  type: string;
  mimeType?: string;
  category?: string;
};

function normalizeAttachment(att: any, index: number): NormalizedAttachment | null {
  if (!att) return null;

  const isString = typeof att === 'string';
  const url = String(
    isString
      ? att
      : att.url || att.fileUrl || att.downloadUrl || att.publicUrl || att.path || ''
  ).trim();

  if (!url) return null;

  const mimeType = String(isString ? '' : att.mimeType || att.type || '').trim();
  const rawName = String(
    isString
      ? ''
      : att.name || att.fileName || att.originalName || att.label || att.title || att.field || ''
  ).trim();
  const extension = url.split('?')[0].split('#')[0].split('.').pop() || '';
  const prettyType = mimeType.toLowerCase().includes('pdf') || extension.toLowerCase() === 'pdf'
    ? 'PDF'
    : mimeType.toLowerCase().startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension.toLowerCase())
      ? 'Image'
      : mimeType.toLowerCase().includes('word') || ['doc', 'docx'].includes(extension.toLowerCase())
        ? 'Word'
        : extension.toUpperCase() || 'FILE';

  return {
    id: String(!isString && (att.id || att.attachmentId || att.fileId) ? (att.id || att.attachmentId || att.fileId) : `${url}::${index}`),
    url,
    name: rawName || `مرفق ${index + 1}`,
    type: prettyType,
    mimeType: mimeType || undefined,
    category: String(!isString ? (att.category || att.field || att.kind || '') : '').trim() || undefined,
  };
}

function getAttachmentKind(att: Pick<NormalizedAttachment, 'url' | 'name' | 'type' | 'mimeType'>) {
  const url = String(att.url || '').toLowerCase();
  const name = String(att.name || '').toLowerCase();
  const mimeType = String(att.mimeType || att.type || '').toLowerCase();

  const isImage =
    mimeType.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => url.includes(ext) || name.endsWith(ext));
  const isPdf = mimeType.includes('pdf') || url.includes('.pdf') || name.endsWith('.pdf');
  const isDocx =
    mimeType.includes('word') ||
    mimeType.includes('wordprocessingml') ||
    ['.doc', '.docx'].some((ext) => url.includes(ext) || name.endsWith(ext));

  return { isImage, isPdf, isDocx };
}

const GenericPermissionProcessor: React.FC<GenericPermissionProcessorProps> = ({
  type,
  title,
  icon,
  documentViewComponent: DocumentViewComponent,
  approvalTemplateComponent: ApprovalTemplateComponent,
  queryHook
}) => {
  const { user } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'decision' | 'history' | 'inbox'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'قيد_المعالجة' | 'موافق_عليه' | 'مرفوض' | 'مؤجَّل'>('all');
  
  // New states for Judicial Fees requirements
  const [applicantCategory, setApplicantCategory] = useState<'ذو حق' | 'غير ذي صفة' | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRiskAlert, setShowRiskAlert] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  const { data: rawRequests, isLoading, refetch } = queryHook(undefined, {
    refetchInterval: 30000 // Real-time volume awareness: refresh every 30 seconds
  });
  // Compatibility alias: some older render paths still expect `requests`.
  const requests = rawRequests || [];
  const updateStatus = (trpc as any).permissions.updateStatus.useMutation();

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    let result = requests;

    // Filter by recipientType: Only show if recipient is judge or both or null (default)
    result = result.filter((req: any) => {
      const isForJudge = !req.recipient_type || req.recipient_type === 'judge' || req.recipient_type === 'both';
      return isForJudge;
    });

    // If the request is explicitly assigned to a judge, only that judge should see it.
    result = result.filter((req: any) => {
      const assignedJudgeUserId = req?.data?.selectedJudgeUserId;
      if (!assignedJudgeUserId) return true;
      return assignedJudgeUserId === user?.id;
    });
    
    if (statusFilter !== 'all') {
      result = result.filter((req: any) => req.status === statusFilter);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((req: any) => 
        req.request_number?.toLowerCase().includes(term) ||
        req.notary_name?.toLowerCase().includes(term) ||
        (req.involved_names && req.involved_names.toLowerCase().includes(term)) ||
        (req.data && JSON.stringify(req.data).toLowerCase().includes(term))
      );
    }
    
    return result;
  }, [requests, searchTerm, statusFilter, user?.id]);

  const selectedRequest = useMemo(() => 
    filteredRequests?.find((r: any) => r.id === selectedRequestId), 
    [filteredRequests, selectedRequestId]
  );

  // Smart Checks Logic for Marriage
  const smartAlerts = useMemo(() => {
    if (type !== 'marriage' || !selectedRequest?.data) return [];
    const alerts = [];
    const data = selectedRequest.data;
    
    // Check for minor (Suitor)
    if (data.suitorDOB) {
      const birthYear = new Date(data.suitorDOB).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 18) {
        alerts.push({ type: 'warning', text: 'الخاطب قاصر (أقل من 18 سنة)', icon: '⚠️' });
      }
    }
    
    // Check for minor (Fiancee)
    if (data.fianceeDOB) {
      const birthYear = new Date(data.fianceeDOB).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 18) {
        alerts.push({ type: 'warning', text: 'المخطوبة قاصرة (أقل من 18 سنة)', icon: '⚠️' });
      }
    }
    
    // Check for polygamy
    if (data.marriageType === 'تعدد' || data.marriageType === 'زوجة ثانية') {
      alerts.push({ type: 'danger', text: 'طلب تعدد الزوجات - يتطلب مسطرة خاصة', icon: '🚨' });
    }
    
    // Missing documents check (simplified)
    const requiredDocs = ['adminCert', 'birthCert', 'medicalCert'];
    const missingSuitor = requiredDocs.filter(doc => !data.suitorDocs?.[doc]?.number);
    const missingFiancee = requiredDocs.filter(doc => !data.fianceeDocs?.[doc]?.number);
    
    if (missingSuitor.length > 0 || missingFiancee.length > 0) {
      alerts.push({ type: 'info', text: 'نقص في الوثائق المرفقة', icon: '📂' });
    }
    
    return alerts;
  }, [type, selectedRequestId, selectedRequest?.data]);

  const attachments = useMemo<NormalizedAttachment[]>(() => {
    if (!selectedRequest) return [];
    let rawAttachments: any[] = [];
    
    // 1. Try column data first
    if (selectedRequest.attachments) {
      if (Array.isArray(selectedRequest.attachments)) {
        rawAttachments = selectedRequest.attachments;
      } else {
        try {
          if (typeof selectedRequest.attachments === 'string' && selectedRequest.attachments.trim().length > 0) {
            if (selectedRequest.attachments.trim().startsWith('[') || selectedRequest.attachments.trim().startsWith('{')) {
              rawAttachments = JSON.parse(selectedRequest.attachments);
            } else {
              rawAttachments = [selectedRequest.attachments];
            }
          }
        } catch (e) {
          console.error('Failed to parse attachments', e);
        }
      }
    }

    // 2. Search for Supabase URLs in notes or data if column is empty
    if (rawAttachments.length === 0) {
      const searchString = JSON.stringify(selectedRequest.data || {}) + (selectedRequest.notes || '');
      const urlRegex = /(https:\/\/[^\s"'<>\n]+\.supabase\.[^\s"'<>\n]+)/g;
      const matches = searchString.match(urlRegex);
      if (matches) {
        rawAttachments = Array.from(new Set(matches)).map((url: string, i: number) => ({
          url,
          name: `وثيقة مرفقة ${i + 1}`,
          type: url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'
        }));
      }
    }

    return rawAttachments
      .map((att: any, i: number) => normalizeAttachment(att, i))
      .filter(Boolean) as NormalizedAttachment[];
  }, [selectedRequest]);

  const selectedAttachment = useMemo(() => {
    if (attachments.length === 0) return null;
    return attachments.find((att) => att.id === selectedAttachmentId) || attachments[0];
  }, [attachments, selectedAttachmentId]);

  useEffect(() => {
    if (!selectedRequestId && filteredRequests && filteredRequests.length > 0) {
      setSelectedRequestId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedRequestId]);

  useEffect(() => {
    if (attachments.length === 0) {
      setSelectedAttachmentId(null);
      return;
    }

    setSelectedAttachmentId((current) => {
      if (current && attachments.some((att) => att.id === current)) return current;
      return attachments[0].id;
    });
  }, [attachments, selectedRequestId]);

  const handleDecision = async (status: 'موافق_عليه' | 'مرفوض' | 'مؤجَّل', decisionType: 'موافقة' | 'رفض' | 'تأجيل') => {
    if (!selectedRequestId) return;

    if (type === 'judicialFees' && !applicantCategory && status !== 'مؤجَّل') {
      alert('⚠️ يرجى تصنيف صفة طالب النسخة أولاً (ذو حق أو غير ذي صفة)');
      return;
    }

    if (decisionType === 'رفض' && !decisionNotes.trim()) {
      alert('يجب ذكر سبب الرفض في الملاحظات');
      return;
    }

    if (type === 'judicialFees' && applicantCategory === 'غير ذي صفة' && decisionType === 'موافقة' && !decisionNotes.trim()) {
      alert('الموافقة لفائدة الأغيار تستوجب مراجعة التعليل الإجباري');
      return;
    }

    if (type === 'judicialFees' || type === 'scientific') {
        const confirmed = window.confirm(
          decisionType === 'موافقة' 
          ? "هل تم التأكد من استيفاء جميع الشروط القانونية؟" 
          : decisionType === 'تأجيل' 
          ? "هل تريد تأجيل البت في هذا الطلب لاستكمال معطيات؟ (لا يشترط التعليل الآن)"
          : "هل أنت متأكد من رفض هذا الطلب؟"
        );
        if (!confirmed) return;
    }
    
    setIsProcessing(true);
    try {
      await updateStatus.mutateAsync({
        id: selectedRequestId,
        type,
        status,
        decisionType,
        reasoning: decisionNotes,
        decisionSerialNumber: decisionType === 'موافقة' ? `DEC-${Date.now()}` : undefined
      });
      alert('✓ تم تسجيل القرار بنجاح');
      setDecisionNotes('');
      setApplicantCategory(null);
      setActiveTab('view');
      refetch();
    } catch (error: any) {
      alert('✗ فشل في تسجيل القرار: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    const list = requests || [];
    const today = new Date().toISOString().split('T')[0];
    return {
      total: list.length,
      today: list.filter((r: any) => r.created_at?.startsWith(today)).length,
      pending: list.filter((r: any) => r.status === 'قيد_المعالجة').length,
      approved: list.filter((r: any) => r.decision_type === 'موافقة').length,
      rejected: list.filter((r: any) => r.decision_type === 'رفض').length,
      deferred: list.filter((r: any) => r.status === 'مؤجَّل').length,
    };
  }, [requests]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 font-amiri">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-xl font-black text-slate-700 animate-pulse">جاري تحميل سجل الأذونات القضائية...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] font-amiri overflow-hidden" dir="rtl">
      {/* Dynamic Command Header */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-4 shadow-2xl relative z-20">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/5">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digital Judiciary Hub • Active Session</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => refetch()}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors group relative"
              title="تحديث البيانات"
            >
              <span className={`text-xl inline-block ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>🔄</span>
              {isLoading && (
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </span>
              )}
            </button>
            <div className="h-10 w-px bg-white/10 mx-2"></div>
            <StatMini label="جديدة اليوم" value={stats.today} color="blue" />
            <StatMini label="قيد الدراسة" value={stats.pending} color="amber" />
            <StatMini label="موافق عليها" value={stats.approved} color="emerald" />
            <StatMini label="مرفوضة" value={stats.rejected} color="red" />
            {stats.deferred > 0 && <StatMini label="مؤجلة" value={stats.deferred} color="blue" />}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar - Refined Sidebar */}
        <div className="w-[380px] bg-white border-l border-slate-200/60 shadow-lg flex flex-col z-10 overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 text-sm">قائمة الطلبات</span>
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {searchTerm ? `${filteredRequests.length} من ${requests?.length || 0}` : `${requests?.length || 0} طلباً`}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="بحث برقم الطلب أو اسم العدل أو المعني..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all pl-9 text-right"
                dir="rtl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-xs">🔍</span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar-horizontal">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'قيد_المعالجة', label: 'قيد الدراسة' },
                { id: 'موافق_عليه', label: 'مقبول' },
                { id: 'مرفوض', label: 'مرفوض' },
                { id: 'مؤجَّل', label: 'مؤجل ⏳' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${
                    statusFilter === tab.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black">جاري جلب السجلات...</span>
               </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4">
                <div className="text-5xl opacity-20 italic">{searchTerm ? 'No Results' : 'Empty'}</div>
                <p className="text-slate-400 font-bold italic">
                  {searchTerm ? 'لم يتم العثور على نتائج تطابق هذا البحث' : 'لا توجد طلبات واردة في هذا القسم حالياً'}
                </p>
              </div>
            ) : (
              filteredRequests.map((req: any) => (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelectedRequestId(req.id);
                    setActiveTab('view');
                  }}
                  className={`w-full text-right p-4 rounded-2xl transition-all group relative overflow-hidden ${
                    selectedRequestId === req.id 
                    ? 'bg-blue-50/50 shadow-sm border border-blue-100' 
                    : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {selectedRequestId === req.id && (
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedRequestId === req.id ? 'text-blue-600' : 'text-slate-400'}`}>
                      {req.request_number}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  {type === 'judicialFees' && req.status === 'قيد_المعالجة' && (req.data?.legalRelationship === 'الأغيار' || req.involved_names?.includes('غير')) && (
                    <div className="mb-2 bg-amber-50 border border-amber-200 p-2 rounded-lg animate-pulse">
                       <p className="text-[9px] font-black text-amber-700 leading-tight">
                         🔔 طلب جديد في انتظار الفحص – يتضمن استخراج نسخة لفائدة غير ذي صفة ظاهرة
                       </p>
                    </div>
                  )}

                  {type === 'marriage' && req.status === 'قيد_المعالجة' && (
                    <div className="flex gap-1 mb-2">
                      {(req.data?.suitorDOB && (new Date().getFullYear() - new Date(req.data.suitorDOB).getFullYear() < 18)) && (
                        <span className="bg-rose-100 text-rose-700 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-rose-200">⚠️ قاصر</span>
                      )}
                      {(req.data?.fianceeDOB && (new Date().getFullYear() - new Date(req.data.fianceeDOB).getFullYear() < 18)) && (
                        <span className="bg-rose-100 text-rose-700 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-rose-200">⚠️ قاصرة</span>
                      )}
                      {(req.data?.marriageType === 'تعدد') && (
                        <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-amber-200">🚨 تعدد</span>
                      )}
                    </div>
                  )}

                  <div className="text-sm font-black text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
                    {req.notary_name}
                  </div>
                  {type === 'judicialFees' && (
                    <div className="flex gap-2 mb-2">
                       <span className="bg-slate-100 text-[8px] px-2 py-0.5 rounded font-black text-slate-500">
                          {req.data?.source || 'منصة العدل'}
                       </span>
                       <span className="bg-blue-50 text-[8px] px-2 py-0.5 rounded font-black text-blue-600">
                          {req.data?.copiesCount || '1'} نسخة
                       </span>
                    </div>
                  )}
                  {req.involved_names && (
                    <div className="text-[11px] font-bold text-slate-500 mb-2 line-clamp-1 border-r-2 border-slate-200 pr-2">
                       👤 {req.involved_names}
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span>📅</span>
                        {new Date(req.created_at).toLocaleDateString('ar-MA')}
                     </div>
                     <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span>⏰</span>
                        {new Date(req.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                     </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f1f5f9]">
          {selectedRequest ? (
            <>
              {/* Context bar with tabs */}
              <div className="bg-white border-b border-slate-200 px-8 py-0 shadow-sm z-10 flex justify-between items-center">
                <div className="flex gap-10">
                   <TabButton 
                      active={activeTab === 'view'} 
                      onClick={() => setActiveTab('view')} 
                      icon="👁️" 
                      label="معاينة الملف" 
                   />
                   <TabButton 
                      active={activeTab === 'inbox'} 
                      onClick={() => setActiveTab('inbox')} 
                      icon="📊" 
                      label="جدول البيانات" 
                   />
                   <TabButton 
                      active={activeTab === 'decision'} 
                      onClick={() => setActiveTab('decision')} 
                      icon="✍️" 
                      label="اتخاذ القرار" 
                      badge={selectedRequest.status === 'قيد_المعالجة' ? 'جديد' : undefined}
                   />
                   <TabButton 
                      active={activeTab === 'history'} 
                      onClick={() => setActiveTab('history')} 
                      icon="📜" 
                      label="القرار الصادر" 
                      disabled={!selectedRequest.decision_type}
                   />
                </div>
                
                <div className="flex gap-4 py-3">
                   <button 
                      onClick={() => {
                        const id = activeTab === 'history' ? 'printable-decision' : 'printable-request';
                        const el = document.getElementById(id);
                        if (el) printElement(el);
                      }}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
                   >
                     <span>🖨️</span> طبع المستند
                   </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-10 bg-slate-100/30">
                 <div className="max-w-5xl mx-auto">
                    {activeTab === 'inbox' && (
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-lg font-black italic">📊 جدول البيانات التفاعلي (Inbox)</h3>
                            <div className="flex gap-2">
                               <button className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition-all">تصدير Excel</button>
                               <button className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition-all">طباعة السجل</button>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">رقم التسجيل</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">تاريخ الإيداع</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">اسم العدل</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">اسم المستفيد</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">نوع الشهادة</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">الحالة</th>
                                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase text-center">الإجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredRequests.map((req: any) => (
                                  <tr key={req.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
                                    <td className="p-4 font-black text-xs text-blue-950">{req.request_number}</td>
                                    <td className="p-4 text-xs font-bold text-slate-600">{new Date(req.created_at).toLocaleDateString('ar-MA')}</td>
                                    <td className="p-4 text-sm font-black text-slate-800">{req.notary_name}</td>
                                    <td className="p-4 text-xs font-bold text-slate-700">{req.involved_names || '---'}</td>
                                    <td className="p-4">
                                      <span className="bg-slate-100 text-[10px] px-2 py-1 rounded-lg font-black text-slate-500">
                                        {req.data?.certificateType || 'ديبلوما/شهادة'}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <StatusBadge status={req.status} />
                                    </td>
                                    <td className="p-4 text-center">
                                      <button 
                                        onClick={() => { setSelectedRequestId(req.id); setActiveTab('view'); }}
                                        className="text-blue-600 hover:text-blue-800 font-black text-[10px] underline underline-offset-4"
                                      >
                                        فتح ومعالجة
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'view' && (
                      <div className="flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* Main Document Column */}
                         <div className="flex-1 space-y-8">
                            {/* Info Strip */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
                               <div className="flex gap-12">
                                  <div>
                                     <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">مقدم الطلب</p>
                                     <p className="font-black text-slate-800 text-lg">{selectedRequest.notary_name}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">الرقم المهني</p>
                                     <p className="font-black text-slate-800 text-lg tabular-nums">{selectedRequest.notary_professional_number}</p>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">المحكمة</p>
                                     <p className="font-black text-slate-800 text-lg">{selectedRequest.primary_court || selectedRequest.jurisdiction}</p>
                                  </div>
                               </div>
                               <div className="text-left border-r pr-8 mr-8">
                                  <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">حالة الطلب</p>
                                  <StatusBadge status={selectedRequest.status} large />
                               </div>
                            </div>

                            {/* Actual Document Template */}
                            <div className="relative group">
                               {(type === 'judicialFees' || type === 'marriage') && (
                                 <div className="flex bg-white/80 backdrop-blur-md p-3 rounded-2xl mb-4 shadow-sm border border-slate-200 gap-4 items-center justify-between sticky top-0 z-30">
                                    <div className="flex gap-2 text-slate-400">
                                       <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.5))} className="p-2 hover:bg-slate-100 rounded-lg" title="Zoom In">➕</button>
                                       <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))} className="p-2 hover:bg-slate-100 rounded-lg" title="Zoom Out">➖</button>
                                       <button onClick={() => setZoomLevel(1)} className="p-2 hover:bg-slate-100 rounded-lg text-xs font-bold">100%</button>
                                    </div>
                                    <div className="flex gap-2">
                                       {type === 'marriage' && (
                                          <button 
                                            onClick={() => setIsComparisonMode(!isComparisonMode)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isComparisonMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
                                          >
                                             <span>🔲</span> {isComparisonMode ? 'إغلاق المقارنة' : 'نمط المقارنة الرباعي'}
                                          </button>
                                       )}
                                       <button className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black border border-amber-200">
                                          <span>📌</span> إضافة ملاحظة لاصقة
                                       </button>
                                    </div>
                                 </div>
                               )}
                               
                               {isComparisonMode && type === 'marriage' ? (
                                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
                                     {[
                                       { title: 'نسخة قصد الزواج', url: attachments.find(a => a.name?.includes('adminCert'))?.url },
                                       { title: 'شهادة العزوبة - الخاطب', url: attachments.find(a => a.name?.includes('suitorDocs_adminCert'))?.url },
                                       { title: 'شهادة العزوبة - المخطوبة', url: attachments.find(a => a.name?.includes('fianceeDocs_adminCert'))?.url },
                                       { title: 'الشهادات الطبية', url: attachments.find(a => a.name?.includes('medicalCert'))?.url },
                                     ].map((doc, idx) => (
                                       <div key={idx} className="bg-slate-200 rounded-2xl h-[400px] border-2 border-slate-300 flex flex-col overflow-hidden shadow-inner">
                                          <div className="p-3 bg-slate-800 text-white text-[10px] font-black flex justify-between">
                                             <span>{doc.title}</span>
                                             <span className="opacity-50">Document #{idx + 1}</span>
                                          </div>
                                          {doc.url ? (
                                             <iframe src={doc.url} className="flex-1 w-full border-none" title={doc.title} />
                                          ) : (
                                             <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
                                                <span className="text-3xl">🚫</span>
                                                <p className="text-[10px] font-black italic">الوثيقة غير متوفرة حالياً</p>
                                             </div>
                                          )}
                                       </div>
                                    ))}
                                  </div>
                               ) : (
                                 <>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
                                    <div className="relative transition-transform duration-300 origin-top" style={{ transform: `scale(${zoomLevel})` }}>
                                       <DocumentViewComponent 
                                          data={selectedRequest.data} 
                                          notification={selectedRequest}
                                          attachments={attachments}
                                          notaryData={{
                                             fullName: selectedRequest.notary_name,
                                             professionalNumber: selectedRequest.notary_professional_number,
                                             jurisdiction: selectedRequest.jurisdiction,
                                          }}
                                       />
                                    </div>
                                 </>
                               )}
                            </div>
                         </div>

                         {/* Side Column for Attachments & Metadata */}
                         <div className="w-80 space-y-6">
                            {/* Smart Assistant Logic for Marriage */}
                            {type === 'marriage' && smartAlerts.length > 0 && (
                              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl text-white space-y-4 border border-white/5">
                                 <h4 className="font-black text-sm flex items-center gap-2 border-b border-white/10 pb-3 mb-2">
                                    <span className="animate-pulse">🤖</span> المساعد الذكي للقاضي
                                 </h4>
                                 <div className="space-y-3">
                                    {smartAlerts.map((alert, idx) => (
                                      <div key={idx} className={`p-3 rounded-xl flex items-center gap-3 border ${
                                        alert.type === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-200' : 
                                        alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 
                                        'bg-blue-500/10 border-blue-500/30 text-blue-200'
                                      }`}>
                                        <span className="text-xl">{alert.icon}</span>
                                        <p className="text-[10px] font-black leading-tight">{alert.text}</p>
                                      </div>
                                    ))}
                                 </div>
                                 <p className="text-[8px] font-bold text-slate-500 italic text-center">بناءً على تحليل البيانات المرفقة بمدونة الأسرة</p>
                              </div>
                            )}

                            {type === 'judicialFees' && (
                              <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-200 space-y-4">
                                 <h4 className="font-black text-amber-900 flex items-center gap-2 border-b border-amber-200 pb-3 mb-2">
                                    <span>📝</span> ملاحظات داخلية (خاصة)
                                 </h4>
                                 <textarea 
                                    placeholder="دون ملاحظاتك هنا... لن تظهر للعدل"
                                    className="w-full bg-white/50 border border-amber-200 rounded-xl p-3 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500/20"
                                    value={internalNotes}
                                    onChange={(e) => setInternalNotes(e.target.value)}
                                 />
                                 <p className="text-[8px] font-bold text-amber-600 italic">هذه الملاحظات مخصصة للأرشفة الداخلية فقط.</p>
                              </div>
                            )}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                               <h4 className="font-black text-slate-900 flex items-center gap-2 border-b pb-3 mb-2">
                                  <span>📎</span> المرفقات والوثائق
                               </h4>
                               {attachments.length === 0 ? (
                                 <div className="py-10 text-center space-y-3">
                                    <div className="text-4xl opacity-10">📁</div>
                                    <p className="text-[10px] font-bold text-slate-400 italic">لا توجد وثائق مرفقة بهذا الطلب</p>
                                 </div>
                               ) : (
                                 <div className="space-y-3">
                                    {attachments.map((att: any, idx: number) => (
                                      <div 
                                        key={att.id || idx}
                                        className={`p-3 rounded-xl border transition-all ${selectedAttachment?.id === att.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-blue-50 hover:border-blue-200'}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAttachmentId(att.id)}
                                            className="flex min-w-0 flex-1 items-center gap-3 text-right"
                                          >
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl shadow-sm transition-transform">
                                              {att.type === 'PDF' ? '📄' : att.type === 'Word' ? '📝' : '🖼️'}
                                            </div>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                               <p className="text-[10px] font-black text-slate-700 truncate">{att.name}</p>
                                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{selectedAttachment?.id === att.id ? 'Previewing now' : 'Click to preview'}</p>
                                            </div>
                                          </button>
                                          <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-600 hover:border-blue-200 hover:text-blue-600"
                                            title="فتح في نافذة مستقلة"
                                          >
                                            فتح
                                          </a>
                                        </div>
                                      </div>
                                    ))}

                                    {selectedAttachment && (
                                      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-inner">
                                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-[11px] font-black text-slate-800">{selectedAttachment.name}</p>
                                            <p className="mt-1 text-[9px] font-bold text-slate-400">{selectedAttachment.category || selectedAttachment.type}</p>
                                          </div>
                                          <a
                                            href={selectedAttachment.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white hover:bg-blue-700"
                                          >
                                            تنزيل / فتح
                                          </a>
                                        </div>

                                        <div className="h-[420px] bg-slate-100">
                                          {(() => {
                                            const kind = getAttachmentKind(selectedAttachment);

                                            if (kind.isImage) {
                                              return (
                                                <div className="flex h-full items-center justify-center p-3">
                                                  <img
                                                    src={selectedAttachment.url}
                                                    alt={selectedAttachment.name}
                                                    className="max-h-full max-w-full rounded-2xl object-contain shadow-sm"
                                                  />
                                                </div>
                                              );
                                            }

                                            if (kind.isPdf) {
                                              return (
                                                <iframe
                                                  title={selectedAttachment.name}
                                                  src={selectedAttachment.url}
                                                  className="h-full w-full bg-white"
                                                />
                                              );
                                            }

                                            if (kind.isDocx) {
                                              return (
                                                <div className="h-full overflow-auto bg-white p-3">
                                                  <WordPreview
                                                    url={selectedAttachment.url}
                                                    isDarkMode={false}
                                                    editable={false}
                                                    sourceTag="base"
                                                    msWordRtlJustify
                                                  />
                                                </div>
                                              );
                                            }

                                            return (
                                              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                                                <div className="text-4xl opacity-40">📁</div>
                                                <p className="text-sm font-black text-slate-700">المعاينة المدمجة غير متاحة لهذا النوع من الملفات</p>
                                                <p className="text-[10px] font-bold text-slate-400">استخدم زر الفتح لعرض الملف في نافذة مستقلة.</p>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                 </div>
                               )}
                            </div>

                            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white space-y-4 relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full"></div>
                               <h4 className="font-black text-sm border-b border-white/10 pb-3 relative z-10">التدقيق الرقمي</h4>
                               <div className="space-y-3 relative z-10">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[9px] font-bold text-slate-400">تاريخ الإيداع</span>
                                     <span className="text-[10px] font-black">{new Date(selectedRequest.created_at).toLocaleString('ar-MA')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-emerald-400">
                                     <span className="text-[9px] font-bold opacity-80">البصمة الرقمية</span>
                                     <span className="text-[8px] font-mono tracking-tighter">VERIFIED-ID</span>
                                  </div>
                                  <div className="pt-2">
                                     <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full w-2/3"></div>
                                     </div>
                                     <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Audit level: Internal Review In Progress</p>
                                  </div>
                               </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                              <div className="absolute top-0 left-6 bottom-0 w-0.5 bg-slate-100"></div>
                              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 px-2 relative z-10 bg-white inline-block">Judicial Timeline</h4>
                              
                              <div className="space-y-6 relative z-10">
                                 {/* Step 1: Submission */}
                                 <div className="flex gap-4 items-start group">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex-shrink-0 mt-1"></div>
                                    <div className="flex-1">
                                       <p className="text-[10px] font-black text-slate-900">إيداع الطلب إلكترونياً</p>
                                       <p className="text-[9px] font-bold text-slate-400">{new Date(selectedRequest.created_at).toLocaleString('ar-MA')}</p>
                                       <div className="mt-1 flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
                                          <span className="text-[8px] font-bold text-emerald-600">نظام التوثيق الرقمي</span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Step 2: Review (Static but active) */}
                                 <div className="flex gap-4 items-start">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm flex-shrink-0 mt-1"></div>
                                    <div className="flex-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                                       <p className="text-[10px] font-black text-blue-900">قيد المراجعة القضائية</p>
                                       <p className="text-[9px] font-bold text-blue-400">بدأ: {new Date().toLocaleTimeString('ar-MA')}</p>
                                    </div>
                                 </div>

                                 {/* Step 3: Conditional (Decision) */}
                                 {selectedRequest.status !== 'قيد_المعالجة' && (
                                   <div className="flex gap-4 items-start">
                                      <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm flex-shrink-0 mt-1 ${
                                         selectedRequest.status === 'موافق_عليه' ? 'bg-emerald-600' : 
                                         selectedRequest.status === 'مرفوض' ? 'bg-red-600' : 'bg-amber-600'
                                      }`}></div>
                                      <div className="flex-1">
                                         <p className={`text-[10px] font-black ${
                                            selectedRequest.status === 'موافق_عليه' ? 'text-emerald-900' : 
                                            selectedRequest.status === 'مرفوض' ? 'text-red-900' : 'text-amber-900'
                                         }`}>
                                            {selectedRequest.status === 'موافق_عليه' ? 'تم إصدار الإذن' : 
                                             selectedRequest.status === 'مرفوض' ? 'تم رفض الطلب' : 'تم تأجيل الطلب'}
                                         </p>
                                         <p className="text-[9px] font-bold opacity-50">{new Date(selectedRequest.decided_at || new Date()).toLocaleString('ar-MA')}</p>
                                      </div>
                                   </div>
                                 )}
                              </div>
                            </div>
                         </div>
                      </div>
                    )}

                    {activeTab === 'decision' && (
                      <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500 py-10">
                         {/* Risk Alert and Legal Consistency for Judicial Fees */}
                         {type === 'judicialFees' && (
                           <div className="flex flex-col gap-4 mb-6">
                              <div className="bg-amber-50 border-r-8 border-amber-500 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                  <span className="text-3xl text-amber-600">⚠️</span>
                                  <div>
                                    <h4 className="font-black text-amber-900">Legal Consistency Check</h4>
                                    <p className="text-xs font-bold text-amber-700">هل سبق إصدار قرار مماثل بخصوص هذا الرسم؟ يتم التحقق من السجلات السابقة...</p>
                                  </div>
                                </div>
                                <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-amber-600 border border-amber-200">VALIDATING</span>
                              </div>
                              
                              {selectedRequest.involved_names && (
                                <div className="bg-rose-50 border-r-8 border-rose-500 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                                  <div className="flex items-center gap-4">
                                    <span className="text-3xl text-rose-600">🚨</span>
                                    <div>
                                      <h4 className="font-black text-rose-900">Risk Alert</h4>
                                      <p className="text-xs font-bold text-rose-700">تكرار طلبات استخراج لفائدة الغير لنفس الرسم – يُرجى الانتباه والتدقيق في الصفة.</p>
                                    </div>
                                  </div>
                                  <StatusBadge status="HIGH RISK" />
                                </div>
                              )}
                           </div>
                         )}

                         <div className={`${type === 'judicialFees' && applicantCategory === 'غير ذي صفة' ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-50'} rounded-[3rem] shadow-2xl border-4 p-12 overflow-hidden relative transition-colors duration-500`}>
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 -mr-32 -mt-32 rounded-full"></div>
                             
                             <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-blue-200 mb-6">✍️</div>
                                <h3 className="text-3xl font-black text-slate-900 mb-2">اتخاذ قرار قضائي مـعلل</h3>
                                <p className="text-slate-500 font-bold mb-10 max-w-lg text-center leading-relaxed">يرجى مراجعة كافة المبررات القانونية المرفقة بالطلب قبل إصدار الإذن. القرارات يتم توقيعها رقمياً وبشكل نهائي.</p>
                                
                                <div className="w-full space-y-8">
                                   {/* Step 2: Applicant Status Selection (Judicial Fees Exclusive) */}
                                   {type === 'judicialFees' && (
                                     <div className="p-8 bg-slate-50/50 rounded-3xl border-2 border-slate-100 flex flex-col items-center gap-6">
                                        <h4 className="font-black text-slate-600 text-sm uppercase tracking-widest border-b pb-2">2️⃣ تصنيف صفة الطالب</h4>
                                        <div className="flex gap-4 w-full">
                                           <button 
                                              onClick={() => setApplicantCategory('ذو حق')}
                                              className={`flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border-2 ${
                                                applicantCategory === 'ذو حق' 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'
                                              }`}
                                           >
                                              <span className="text-xl">⭕</span> ذو حق (وريث – مفوض – طرف)
                                           </button>
                                           <button 
                                              onClick={() => {
                                                setApplicantCategory('غير ذي صفة');
                                                if (!decisionNotes) {
                                                   setDecisionNotes(`بعد الاطلاع على الطلب والمرفقات المدلى بها،\nوبعد التيقن من أن طالب النسخة لا يمكنه التوصل إلى حقه أو الدفاع عنه إلا بالاطلاع على الرسم المطلوب،\nوحيث لا يظهر من ذلك أي مساس بحقوق الغير أو مخالفة للنصوص الجاري بها العمل،\nفإن الطلب يكون مبررًا،\nوعليه يؤشر بالموافقة على استخراج النسخة المطلوبة في حدود الغرض المبين.`);
                                                }
                                              }}
                                              className={`flex-1 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border-2 ${
                                                applicantCategory === 'غير ذي صفة' 
                                                ? 'bg-amber-600 text-white border-amber-600 shadow-lg' 
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-amber-400'
                                              }`}
                                           >
                                              <span className="text-xl">🔘</span> غير ذي صفة (أغيار - أجانب)
                                           </button>
                                        </div>
                                        {applicantCategory === 'غير ذي صفة' && (
                                          <div className="w-full bg-amber-50 rounded-xl p-4 border border-amber-200 animate-pulse">
                                             <p className="text-amber-800 font-bold text-center text-xs">🔔 تنبيه: الموافقة لفائدة الغير تستوجب تعليلًا صريحًا</p>
                                          </div>
                                        )}
                                     </div>
                                   )}

                                   <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 pr-4 uppercase tracking-[0.2em]">تعليل القرار / الملاحظات القضائية</label>
                                      <textarea
                                        placeholder="اكتب هنا الأسباب الواقعية والقانونية التي بني عليها قراركم..."
                                        className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-3xl p-8 min-h-[220px] focus:border-blue-600 focus:bg-white outline-none transition-all text-xl font-medium shadow-inner"
                                        value={decisionNotes}
                                        onChange={(e) => setDecisionNotes(e.target.value)}
                                      />
                                      {/* Smart Suggestions for Judicial Fees */}
                                      {type === 'judicialFees' && (
                                        <div className="flex gap-2 mt-2">
                                          <SuggestionChip 
                                            label="انعدام الصفة" 
                                            onClick={() => setDecisionNotes('نظراً لانعدام الصفة في طالب النسخة وعدم إدلائه بما يثبت مصلحة قانونية مشروعة.')} 
                                            color="red"
                                          />
                                          <SuggestionChip 
                                            label="كفاية وسائل أخرى" 
                                            onClick={() => setDecisionNotes('نظراً لوجود وكفاية وسائل أخرى للتوصل للحق المطالب به دون حاجة لهذه النسخة.')} 
                                            color="red"
                                          />
                                          <SuggestionChip 
                                            label="تم استخراجها سابقاً" 
                                            onClick={() => setDecisionNotes('بناء على مراجعة السجل فقد سبق تسليم نسخة لنفس المستفيد بتاريخ سابق.')} 
                                            color="amber"
                                          />
                                        </div>
                                      )}

                                      {/* Smart Suggestions for Marriage */}
                                      {type === 'marriage' && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          <SuggestionChip 
                                            label="موافقة (عامة)" 
                                            onClick={() => setDecisionNotes('بناء على الطلب المرفوع والمرفقات المودعة، وحيث تم التأكد من استيفاء جميع الشروط المنصوص عليها في مدونة الأسرة، تقرر الإذن بتوثيق الزواج.')} 
                                            color="emerald"
                                          />
                                          <SuggestionChip 
                                            label="رفض (عدم الأهلية)" 
                                            onClick={() => setDecisionNotes('نظراً لعدم توفر شروط الأهلية القانونية المنصوص عليها في المادتين 19 و 20 من مدونة الأسرة.')} 
                                            color="red"
                                          />
                                          <SuggestionChip 
                                            label="استكمال وثاق" 
                                            onClick={() => setDecisionNotes('يرجى موافاتنا بالوثائق الناقصة (الشهادة الطبية / نسخة من رسم الولادة الأصلية) لإتمام معالجة الطلب.')} 
                                            color="amber"
                                          />
                                          <SuggestionChip 
                                            label="مانع شرعي" 
                                            onClick={() => setDecisionNotes('لوجود مانع شرعي مؤقت يقتضي انتظار انصرام مدة العدة الشرعية طبقاً للمقتضيات القانونية.')} 
                                            color="red"
                                          />
                                        </div>
                                      )}
                                   </div>

                                   <div className={`grid ${type === 'scientific' || type === 'marriage' ? 'grid-cols-3' : 'grid-cols-2'} gap-8 pt-4`}>
                                      <button
                                        onClick={() => handleDecision('موافق_عليه', 'موافقة')}
                                        disabled={isProcessing}
                                        className={`group relative h-20 ${(type === 'judicialFees' || type === 'marriage') ? 'bg-[#0f172a]' : 'bg-emerald-600'} text-white rounded-3xl font-black shadow-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 overflow-hidden`}
                                      >
                                        <div className="relative z-10 flex items-center justify-center gap-4 text-xl">
                                          <span>موافقة ✔</span>
                                          <span className="text-2xl group-hover:rotate-12 transition-transform">⚖️</span>
                                        </div>
                                        <div className={`absolute bottom-0 left-0 w-full h-1 ${(type === 'judicialFees' || type === 'marriage') ? 'bg-blue-400/50' : 'bg-emerald-400/50'}`}></div>
                                      </button>

                                      {(type === 'scientific' || type === 'marriage') && (
                                        <button
                                          onClick={() => handleDecision('مؤجَّل', 'تأجيل')}
                                          disabled={isProcessing}
                                          className="group relative h-20 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                                        >
                                          <div className="relative z-10 flex items-center justify-center gap-4 text-xl">
                                            <span>{type === 'marriage' ? 'إرجاع للاستكمال 🔄' : 'تأجيل ⏳'}</span>
                                          </div>
                                          <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-400/50"></div>
                                        </button>
                                      )}
                                      
                                      <button
                                        onClick={() => handleDecision('مرفوض', 'رفض')}
                                        disabled={isProcessing}
                                        className="group relative h-20 bg-red-600 text-white rounded-3xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                                      >
                                        <div className="relative z-10 flex items-center justify-center gap-4 text-xl">
                                          <span>رفض ✖</span>
                                          <span className="text-2xl group-hover:scale-110 transition-transform">❌</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-400/50"></div>
                                      </button>
                                   </div>
                                </div>
                             </div>
                         </div>
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-xl flex justify-between items-center overflow-hidden relative">
                            <div className="absolute right-0 top-0 w-1/2 h-full bg-white/5 skew-x-12 -mr-20"></div>
                            <div className="relative z-10">
                               <h4 className="text-2xl font-black mb-1">القرار القضائي المعتمد</h4>
                               <p className="text-emerald-100 font-bold opacity-80">صدر هذا القرار وتم إرساله رقمياً لمكتب العدول المعني.</p>
                            </div>
                            <div className="relative z-10 bg-white/10 px-6 py-3 rounded-2xl border border-white/20 text-center backdrop-blur-md">
                               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">SERIAL NO.</p>
                               <p className="font-black text-lg tracking-[0.2em]">{selectedRequest.decision_serial_number || 'DEC-PENDING'}</p>
                            </div>
                         </div>

                         <div id="printable-decision" className="relative group">
                            <div className="absolute -inset-1 bg-emerald-500 rounded-[3rem] blur opacity-10"></div>
                            <div className="relative">
                               <ApprovalTemplateComponent 
                                   decision={selectedRequest}
                                   notification={selectedRequest}
                                   annotation={{
                                     status: selectedRequest.decision_type === 'موافقة' ? 'approved' : 'rejected',
                                     reasoning: selectedRequest.decision_reasoning,
                                     date: selectedRequest.decided_at,
                                     regNumber: selectedRequest.decision_serial_number,
                                     judgeName: user?.fullName || 'القاضي المكلف بالتوثيق'
                                   }}
                                />
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
              <div className="text-9xl opacity-10">🏛️</div>
              <div className="text-center space-y-2">
                 <p className="text-2xl font-black text-slate-400">نظام معالجة الأذونات القضائية الموحد</p>
                 <p className="font-bold text-slate-400 italic">حدد طلباً من القائمة الجانبية لبدء عملية الدراسة واتخاذ القرار</p>
              </div>
              <div className="flex gap-4 opacity-40">
                 <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-dashed animate-spin"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, disabled = false, badge }: any) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={`relative py-5 px-4 font-black text-sm flex items-center gap-3 transition-all duration-300 border-b-4 ${
      active 
      ? 'border-blue-600 text-blue-600' 
      : 'border-transparent text-slate-400 hover:text-slate-600'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    <span className={`text-xl transition-transform duration-300 ${active ? 'scale-110 drop-shadow-sm' : 'grayscale'}`}>{icon}</span>
    <span>{label}</span>
    {badge && (
      <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">
        {badge}
      </span>
    )}
    {active && (
      <div className="absolute bottom-[-2px] left-0 w-full h-1.5 bg-blue-600/10 blur-sm"></div>
    )}
  </button>
);

const StatMini = ({ label, value, color }: any) => {
  const colors: any = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
  };
  return (
    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black border ${colors[color]} flex flex-col items-center min-w-[70px] shadow-sm`}>
      <span className="opacity-60 mb-0.5">{label}</span>
      <span className="text-xl leading-none tabular-nums">{value}</span>
    </div>
  );
};

const StatusBadge = ({ status, large = false }: { status: string, large?: boolean }) => {
  const cls = status === 'قيد_المعالجة' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
              status === 'موافق_عليه' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`rounded-xl font-black border flex items-center justify-center uppercase tracking-tighter ${large ? 'px-4 py-1.5 text-xs' : 'px-2 py-0.5 text-[8px]'} ${cls}`}>
      {status === 'قيد_المعالجة' && <span className="w-1 h-1 rounded-full bg-amber-500 ml-1.5 animate-pulse"></span>}
      {status}
    </span>
  );
};

const SuggestionChip = ({ label, onClick, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100',
  };
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-[10px] font-black transition-all ${colors[color]}`}
    >
      + {label}
    </button>
  );
};

export default GenericPermissionProcessor;

