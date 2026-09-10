import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * NationalRequestsManagement Component
 * Implements the 5-layer workflow for the National Council (HN).
 * 
 * 1. Intake Layer: 5-step process.
 * 2. Taxonomy: Request categorization (A, B, C, D).
 * 3. Identity: HN-REQ-YYYY-XXXX ID logic.
 * 4. Workflow: Processing steps.
 * 5. Audit: PDF requirements and history.
 */

type Step = 'identity' | 'category' | 'details' | 'documents' | 'review' | 'success';

type ViewMode = 'list' | 'intake';

interface NationalRequestData {
  category: 'A' | 'B' | 'C' | 'D' | '';
  subCategory: string;
  subject: string;
  justification: string;
  involvedNames: string;
  attachments: string[]; // URLs of uploaded PDFs
  professionalSignature: boolean;
}

const WORKFLOW_JSON_START = '--- WORKFLOW JSON START ---';
const WORKFLOW_JSON_END = '--- WORKFLOW JSON END ---';

function extractWorkflowFromNotes(notes?: string | null) {
  const text = String(notes || '');
  if (!text.includes(WORKFLOW_JSON_START) || !text.includes(WORKFLOW_JSON_END)) return null;
  try {
    const jsonPart = text.split(WORKFLOW_JSON_START)[1].split(WORKFLOW_JSON_END)[0].trim();
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

export const NationalRequestsManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNotary = user?.role === 'notary';
  const [viewMode, setViewMode] = useState<ViewMode>(isNotary ? 'intake' : 'list');
  const [currentStep, setCurrentStep] = useState<Step>('identity');
  const [formData, setFormData] = useState<NationalRequestData>({
    category: '',
    subCategory: '',
    subject: '',
    justification: '',
    involvedNames: '',
    attachments: [],
    professionalSignature: false,
  });

  const [generatedId, setGeneratedId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [processingStage, setProcessingStage] = useState<string>('التحقق الشكلي');
  const [actionNote, setActionNote] = useState<string>('');
  const [responseType, setResponseType] = useState<'موافقة' | 'رفض' | 'تأجيل' | 'طلب_استكمال'>('موافقة');
  const [responseReasoning, setResponseReasoning] = useState<string>('');

  // Fetch National Requests
  const { data: requests, isLoading: isRequestsLoading, refetch } = trpc.notifications.getRequestsList.useQuery({
    recipientType: 'national_council',
    notaryId: isNotary ? user?.id : undefined
  });

  const appendWorkflowMutation = trpc.notifications.appendWorkflowEvent.useMutation({
    onSuccess: () => refetch(),
  });

  const recordDecisionMutation = trpc.notifications.recordDecision.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedRequest(null);
      setResponseReasoning('');
      setResponseType('موافقة');
    },
  });

  const createMutation = trpc.notifications.createNotification.useMutation({
    onSuccess: (data) => {
      if (data.success && data.notification) {
        setGeneratedId(data.notification.request_number);
        setCurrentStep('success');
        refetch();
      }
    }
  });

  const uploadMutation = trpc.notifications.uploadFile.useMutation();

  const handleUploadPdfs = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const file of list) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('يسمح فقط بملفات PDF.');
        continue;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const b64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(b64);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const res = await uploadMutation.mutateAsync({
        file: {
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          base64,
        },
      });
      if (res?.url) {
        setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, res.url] }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.subCategory || !formData.subject || !formData.justification || formData.attachments.length === 0 || !formData.professionalSignature) {
        alert('يرجى ملء جميع الحقول الإلزامية وإرفاق PDF والتوقيع المهني.');
        return;
      }
      await createMutation.mutateAsync({
        fullName: user?.full_name || 'Anonymous',
        professionalNumber: (user as any)?.professional_number || '0000',
        officeNumber: (user as any)?.office_number || '00',
        jurisdiction: (user as any)?.jurisdiction || 'Unknown',
        targetCourt: 'الهيئة الوطنية للعدول',
        certificateType: formData.subCategory,
        category: formData.category,
        recipientType: 'national_council',
        reasonForMovement: `${formData.subject}\n\n${formData.justification}`,
        requestedDuration: '0',
        durationUnit: 'day',
        notes: `تصنيف الطلب: الصنف ${formData.category}\nالموضوع: ${formData.subject}\nالأطراف: ${formData.involvedNames}`,
        attachments: formData.attachments.join(',')
      });
    } catch (error) {
      console.error('Error submitting national request:', error);
      alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.');
    }
  };

  const categories = [
    { 
      id: 'A', 
      title: 'الصنف (أ): طلبات الوضعية المهنية الوطنية', 
      description: 'طلبات الإعفاء، التوقف المؤقت، العودة، أو إعادة الإدماج المهني.',
      subTypes: [
        { label: 'طلب الإعفاء من المهنة', basis: 'المادة 45 من قانون 22-16', time: '15 يوم', appeal: 'نعم' },
        { label: 'طلب التوقف المؤقت عن ممارسة المهنة', basis: 'المادة 48 من قانون 22-16', time: '10 أيام', appeal: 'نعم' },
        { label: 'طلب العودة إلى ممارسة المهنة', basis: 'المادة 50 من قانون 22-16', time: '15 يوم', appeal: 'نعم' },
        { label: 'طلب إعادة الإدماج (النساخ سابقًا)', basis: 'المادة 90 (أحكام انتقالية)', time: '30 يوم', appeal: 'نعم' },
        { label: 'طلب تسوية وضعية مهنية وطنية', basis: 'المادة 12 من النظام الداخلي', time: '20 يوم', appeal: 'لا' }
      ]
    },
    { 
      id: 'B', 
      title: 'الصنف (ب): طلبات التأديب والطعن', 
      description: 'طلبات مراجعة القرارات التأديبية أو التظلمات الوطنية.',
      subTypes: [
        { label: 'طلب الطعن في مقرر تأديبي جهوي', basis: 'المادة 75 من قانون 22-16', time: '45 يوم', appeal: 'نعم (أمام القضاء الإداري)' },
        { label: 'طلب إعادة النظر', basis: 'المادة 78', time: '30 يوم', appeal: 'لا' },
        { label: 'طلب وقف تنفيذ مقرر', basis: 'المادة 80', time: '7 أيام', appeal: 'لا' }
      ]
    },
    { 
      id: 'C', 
      title: 'الصنف (ج): طلبات الترخيص الوطني', 
      description: 'التمثيل الدولي، الجمع بين المهام، أو المشاركة في مهام وطنية غاشمة.',
      subTypes: [
        { label: 'طلب الترخيص بالجمع بين مهام', basis: 'المادة 32 من القانون', time: '20 يوم', appeal: 'نعم' },
        { label: 'طلب تمثيل الهيئة', basis: 'قرار المكتب التنفيذي', time: '10 أيام', appeal: 'لا' },
        { label: 'طلب المشاركة في مهام وطنية أو دولية', basis: 'النظام الأساسي للهيئة', time: '15 يوم', appeal: 'لا' }
      ]
    },
    { 
      id: 'D', 
      title: 'الصنف (د): الطلبات الإدارية والمؤسساتية', 
      description: 'طلب شهادات الممارسة الوطنية، توجيهات، أو تفسيرات مؤسساتية.',
      subTypes: [
        { label: 'طلب شهادة وطنية', basis: 'المادة 5 من ميثاق الخدمات', time: '5 أيام', appeal: 'لا' },
        { label: 'طلب إفادة أو موقف مهني', basis: 'اختصاصات الرئيس', time: '15 يوم', appeal: 'لا' },
        { label: 'طلب توجيه أو تفسير مؤسساتي', basis: 'الدليل المسطري العربي', time: '25 يوم', appeal: 'لا' }
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep === 'identity') setCurrentStep('category');
    else if (currentStep === 'category') setCurrentStep('details');
    else if (currentStep === 'details') setCurrentStep('documents');
    else if (currentStep === 'documents') setCurrentStep('review');
  };

  const handleBack = () => {
    if (currentStep === 'category') setCurrentStep('identity');
    else if (currentStep === 'details') setCurrentStep('category');
    else if (currentStep === 'documents') setCurrentStep('details');
    else if (currentStep === 'review') setCurrentStep('documents');
  };

  const selectedWorkflow = useMemo(() => extractWorkflowFromNotes(selectedRequest?.notes) || null, [selectedRequest?.notes]);
  const workflowEvents: any[] = useMemo(() => (Array.isArray(selectedWorkflow?.events) ? selectedWorkflow?.events : []), [selectedWorkflow]);
  const currentStage = selectedWorkflow?.stage || '—';

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r: any) => {
      const matchSearch = 
        r.notary_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.certificate_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.status?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const openRequest = (req: any) => {
    setSelectedRequest(req);
    const wf = extractWorkflowFromNotes(req?.notes);
    setProcessingStage(String(wf?.stage || 'التحقق الشكلي'));
    setActionNote('');
    setResponseType('موافقة');
    setResponseReasoning('');
  };

  return (
    <>
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
         <div>
            <h1 className="text-2xl font-black text-[#1d2569] flex items-center gap-3">
               قسم الطلبات الواردة من العدول
               <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full tracking-widest font-black">
                  HN-WORKFLOW
               </span>
            </h1>
         </div>
         <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-xl font-bold transition-all text-sm ${viewMode === 'list' ? 'bg-[#1d2569] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              📥 صندوق الوارد
            </button>
            <button 
              onClick={() => { setViewMode('intake'); setCurrentStep('identity'); }}
              className={`px-6 py-2 rounded-xl font-bold transition-all text-sm ${viewMode === 'intake' ? 'bg-[#1d2569] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ➕ طلب جديد
            </button>
         </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-h-[500px]">
           {/* Summary Stats Layer */}
           <div className="p-6 border-b border-slate-50 flex flex-wrap gap-6 bg-slate-50/20">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[180px]">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">📁</div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">إجمالي الطلبات</p>
                    <p className="text-xl font-black text-slate-800">{requests?.length || 0}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[180px]">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl">⏳</div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">قيد المعالجة</p>
                    <p className="text-xl font-black text-slate-800">{requests?.filter((r: any) => r.status === 'قيد_المعالجة').length || 0}</p>
                 </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[180px]">
                 <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-black text-xl">✅</div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">تم البت فيها</p>
                    <p className="text-xl font-black text-slate-800">{requests?.filter((r: any) => ['موافق_عليه', 'مرفوض'].includes(r.status)).length || 0}</p>
                 </div>
              </div>

              {/* Advanced Search & Filtering Layer */}
              <div className="flex-1 flex gap-3 min-w-[300px]">
                 <div className="flex-1 relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input 
                      type="text" 
                      placeholder="البحث باسم العدل، رقم الطلب، أو النوع..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold focus:ring-2 focus:ring-[#1d2569]/10 outline-none transition-all shadow-sm"
                    />
                 </div>
                 <select 
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                   className="bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-[#1d2569] outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                 >
                    <option value="all">كل الحالات</option>
                    <option value="قيد_المعالجة">قيد المعالجة</option>
                    <option value="موافق_عليه">موافق عليه</option>
                    <option value="مرفوض">مرفوض</option>
                 </select>
              </div>
           </div>

           <div className="p-8 space-y-4 bg-slate-50/30">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req: any) => (
                  <div 
                    key={req.id} 
                    onClick={() => openRequest(req)}
                    className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-900/10 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6"
                  >
                    {/* ID & Type Side Marker */}
                    <div className="flex items-center gap-4 shrink-0 border-l border-slate-50 pl-6 h-full min-w-[180px]">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1d2569] flex items-center justify-center text-3xl shadow-inner group-hover:bg-[#1d2569] group-hover:text-white transition-all duration-500">
                        {req.category === 'A' ? '📁' : req.category === 'B' ? '⚖️' : req.category === 'C' ? '🔑' : '📜'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">REFERENCE</span>
                        <span className="font-mono text-xs font-black text-blue-900">{req.request_number}</span>
                        <span className="text-[8px] font-bold text-slate-300 mr-2 uppercase tracking-tighter">Verified Record</span>
                      </div>
                    </div>

                    {/* Applicant details */}
                    <div className="flex-1 flex flex-col justify-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">مقدم الطلب</span>
                       <h4 className="text-xl font-black text-slate-800 font-amiri tracking-tight group-hover:text-[#1d2569] transition-colors">{req.notary_name}</h4>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400">بصفته:</span>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">رئيس الهيئة الوطنية</span>
                       </div>
                    </div>

                    {/* Classification & Type */}
                    <div className="flex-1 flex flex-col justify-center border-r border-slate-50 pr-6">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-60">نوع ومسار الطلب</span>
                       <div className="flex items-center gap-3">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-white shadow-lg ${
                            req.category === 'A' ? 'bg-blue-600' : req.category === 'B' ? 'bg-rose-600' : req.category === 'C' ? 'bg-amber-600' : 'bg-slate-600'
                          }`}>
                            الصنف {req.category || 'أ'}
                          </span>
                          <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-1">{req.certificate_type}</span>
                       </div>
                    </div>

                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center px-10 border-r border-slate-50">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-60">تاريخ الإيداع</span>
                       <div className="text-center">
                          <p className="text-sm font-black text-slate-800">{new Date(req.created_at).toLocaleDateString('ar-MA')}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">GTM+1 Digital</p>
                       </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0 flex items-center px-6">
                       <span className={`px-6 py-2.5 rounded-full text-xs font-black shadow-lg border-2 transition-transform group-hover:scale-110 ${
                          req.status === 'موافق_عليه' ? 'bg-green-50 text-green-700 border-green-200' :
                          req.status === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-100'
                       }`}>
                          {req.status === 'قيد_المعالجة' ? '⌛ قيد المعالجة' : req.status}
                       </span>
                    </div>

                    {/* Detail Arrow */}
                    <div className="shrink-0 pl-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-[-10px] transition-all duration-500">
                       <span className="text-2xl text-[#1d2569]">←</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center animate-pulse">
                   <span className="text-5xl opacity-20">🏜️</span>
                   <p className="text-slate-400 font-black mt-4">لا توجد طلبات واردة تطابق الفلترة الحالية</p>
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Intake Header */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-t-8 border-[#1d2569] relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <h1 className="text-3xl font-black text-[#1d2569] flex items-center gap-3">الاستقبال الرقمي الموحد</h1>
                <p className="text-slate-600 mt-2 font-medium">النظام المركزي لاستقبال ومعالجة طلبات السادة العدول لدى الهيئة الوطنية.</p>
              </div>
            </div>

            {/* Multi-Step Indicator */}
            <div className="mt-12 flex items-center justify-between relative px-2">
               {[
                 { id: 'identity', icon: '👤', label: 'الهوية' },
                 { id: 'category', icon: '📁', label: 'التصنيف' },
                 { id: 'details', icon: '📝', label: 'التفاصيل' },
                 { id: 'documents', icon: '📎', label: 'الوثائق' },
                 { id: 'review', icon: '👁️', label: 'المراجعة' }
               ].map((step, idx) => (
                 <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all border-2 ${
                      currentStep === step.id ? 'bg-[#1d2569] text-white border-blue-400 scale-110 shadow-lg' : 'bg-white text-slate-300 border-slate-100'
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase ${currentStep === step.id ? 'text-[#1d2569]' : 'text-slate-400'}`}>{step.label}</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Steps Content */}
          <div className="min-h-[400px]">
            {currentStep === 'identity' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-slideIn">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-slate-800 pr-4">Step 1: التحقق من الهوية المهنية</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">هوية العدل</p>
                    <p className="font-bold text-slate-800">{user?.full_name}</p>
                    <p className="text-xs text-slate-500 mt-1">رقم المهنة: {(user as any)?.professional_number || '---'}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">المجلس الجهوي</p>
                    <p className="font-bold text-slate-800">{(user as any)?.jurisdiction || 'المجلس الوطني'}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">الوضعية المهنية</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ممارس (نشيط)
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8">
                   <p className="text-xs text-blue-700 leading-relaxed font-bold">
                     💡 يتم ربط هذا الطلب تلقائياً ببياناتكم المهنية المسجلة في قاعدة بيانات الهيئة الوطنية لضمان الحجية القانونية.
                   </p>
                </div>
                <button onClick={handleNext} className="w-full bg-[#1d2569] text-white py-4 rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-lg">تأكيد الهوية والمتابعة</button>
              </div>
            )}

            {currentStep === 'category' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-slideIn">
                <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-slate-800 pr-4">Step 2: التصنيف القانوني</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {categories.map((cat) => (
                     <div key={cat.id} onClick={() => setFormData({ ...formData, category: cat.id as any })} className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.category === cat.id ? 'border-[#1d2569] bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                        <h4 className="font-black text-slate-800">{cat.title}</h4>
                        <p className="text-xs text-slate-500 mb-4">{cat.description}</p>
                     </div>
                   ))}
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={handleBack} className="px-8 py-3 rounded-xl border">رجوع</button>
                  <button disabled={!formData.category} onClick={handleNext} className="flex-1 bg-[#1d2569] text-white py-4 rounded-xl font-bold">المتابعة</button>
                </div>
              </div>
            )}

            {currentStep === 'details' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-slideIn">
                 <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-slate-800 pr-4">Step 3: التفاصيل والمبررات</h3>
                 <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">نوع الطلب (قائمة منسدلة)</label>
                      <select 
                        value={formData.subCategory} 
                        onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} 
                        className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-[#1d2569] outline-none transition-all"
                      >
                        <option value="">-- اختر النوع المختص --</option>
                        {categories.find(c => c.id === formData.category)?.subTypes.map(s => (
                          <option key={s.label} value={s.label}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Smart Legal Map Feature */}
                    {formData.subCategory && (
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">✨</span>
                          <h4 className="font-black text-[#1d2569]">الخريطة القانونية للطلب</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white/60 p-3 rounded-xl border border-white">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">الجهة المختصة</p>
                            <p className="text-xs font-black text-slate-800">الهيئة الوطنية</p>
                          </div>
                          <div className="bg-white/60 p-3 rounded-xl border border-white">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">الأساس القانوني</p>
                            <p className="text-xs font-black text-slate-800">
                              {categories.find(c => c.id === formData.category)?.subTypes.find(s => s.label === formData.subCategory)?.basis || '—'}
                            </p>
                          </div>
                          <div className="bg-white/60 p-3 rounded-xl border border-white">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">أجل المعالجة</p>
                            <p className="text-xs font-black text-slate-800">
                              {categories.find(c => c.id === formData.category)?.subTypes.find(s => s.label === formData.subCategory)?.time || '—'}
                            </p>
                          </div>
                          <div className="bg-white/60 p-3 rounded-xl border border-white">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">قابلية الطعن</p>
                            <p className="text-xs font-black text-slate-800">
                               {categories.find(c => c.id === formData.category)?.subTypes.find(s => s.label === formData.subCategory)?.appeal || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">موضوع الطلب</label>
                      <input 
                        type="text"
                        value={formData.subject} 
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
                        className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 focus:border-[#1d2569] outline-none transition-all placeholder:text-slate-300 mb-4" 
                        placeholder="أدخل عنواناً واضحاً لموضوع الطلب..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">المبررات القانونية والواقعية</label>
                      <textarea 
                        rows={6} 
                        value={formData.justification} 
                        onChange={(e) => setFormData({ ...formData, justification: e.target.value })} 
                        className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-700 focus:border-[#1d2569] outline-none transition-all placeholder:text-slate-300" 
                        placeholder="اشرح مبررات الطلب بوضوح..." 
                      />
                    </div>
                 </div>
                 <div className="mt-8 flex gap-4">
                  <button onClick={handleBack} className="px-8 py-3 rounded-xl border font-bold text-slate-500 hover:bg-slate-50 transition-all">رجوع</button>
                  <button 
                    disabled={!formData.subCategory || !formData.justification} 
                    onClick={handleNext} 
                    className="flex-1 bg-[#1d2569] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    المتابعة لإرفاق الوثائق
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'documents' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-slideIn">
                 <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-slate-800 pr-4">Step 4: الوثائق الرقمية (PDF)</h3>
                 <div className="border-4 border-dashed border-slate-100 rounded-3xl p-8 text-center bg-slate-50">
                    <p className="text-slate-600 font-bold mb-4">إرفاق الوثائق (PDF فقط)</p>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      onChange={(e) => {
                        void handleUploadPdfs(e.target.files);
                        e.currentTarget.value = '';
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-[#1d2569] file:text-white hover:file:bg-blue-950"
                    />
                    {uploadMutation.isPending ? <div className="mt-4 text-sm font-bold text-slate-500">جاري رفع الملفات...</div> : null}
                 </div>

                 <div className="mt-6 space-y-2">
                   {formData.attachments.map((url, idx) => (
                     <div key={`${url}_${idx}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3">
                       <a href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 truncate max-w-[70%]">
                         📎 {url}
                       </a>
                       <button
                         type="button"
                         onClick={() => setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((x) => x !== url) }))}
                         className="text-xs font-black text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-100"
                       >
                         حذف
                       </button>
                     </div>
                   ))}
                   {formData.attachments.length === 0 ? <div className="text-sm text-slate-500">لا توجد وثائق مرفقة بعد.</div> : null}
                 </div>
                 <div className="mt-8 flex gap-4">
                   <button onClick={handleBack} className="px-8 py-3 rounded-xl border">رجوع</button>
                   <button disabled={formData.attachments.length === 0} onClick={handleNext} className="flex-1 bg-[#1d2569] text-white py-4 rounded-xl font-bold disabled:opacity-50">المراجعة</button>
                 </div>
              </div>
            )}

            {currentStep === 'review' && (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-slideIn">
                 <h3 className="text-xl font-bold text-slate-800 mb-6 border-r-4 border-slate-800 pr-4">Step 5: المراجعة والتوقيع الإلكتروني</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">ملخص التصنيف</p>
                      <p className="font-black text-[#1d2569]">{categories.find(c => c.id === formData.category)?.title}</p>
                      <p className="text-sm font-bold text-slate-600 mt-1">{formData.subCategory}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">الوثائق الرقمية</p>
                      <p className="font-black text-slate-800">{formData.attachments.length} ملفات مرفقة (PDF)</p>
                      <div className="flex gap-2 mt-2">
                        {formData.attachments.map((_, i) => <span key={i} className="text-blue-500">📄</span>)}
                      </div>
                    </div>
                 </div>

                 <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-8 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl text-2xl">🖋️</div>
                      <div className="flex-1">
                        <h4 className="font-black text-amber-900 mb-2">التوقيع الإلكتروني المهني</h4>
                        <p className="text-xs text-amber-700 leading-relaxed mb-6">
                          بصفتي عدلاً ممارساً، أقر بصحة البيانات الواردة في هذا الطلب وأؤكد أنها مقدمة للملف الرقمي للهيئة الوطنية للعدول. هذا التوقيع الرقمي له القيمة القانونية الكاملة وفقاً للنصوص التنظيمية الجاري بها العمل.
                        </p>
                        <label className="flex items-center gap-4 cursor-pointer group bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-400 transition-all">
                          <input 
                            type="checkbox" 
                            checked={formData.professionalSignature}
                            onChange={(e) => setFormData({...formData, professionalSignature: e.target.checked})}
                            className="w-6 h-6 rounded border-amber-300 text-[#1d2569] focus:ring-[#1d2569] cursor-pointer" 
                          />
                          <span className="font-black text-slate-800 group-hover:text-[#1d2569]">أوافق وأوقع إلكترونياً على هذا الطلب</span>
                        </label>
                      </div>
                    </div>
                 </div>

                 <div className="flex gap-4">
                  <button onClick={handleBack} className="px-8 py-4 rounded-xl border font-bold text-slate-500">رجوع للتعديل</button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending || !formData.professionalSignature} 
                    className="flex-1 bg-[#1d2569] text-white py-4 rounded-xl font-black shadow-xl shadow-blue-950/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {createMutation.isPending ? 'جاري معالجة الطلب...' : 'تأكيد المعالجة وإيداع الطلب الآن 🚀'}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'success' && (
              <div className="bg-white rounded-3xl p-16 border border-green-100 shadow-2xl text-center animate-bounceIn">
                 <div className="w-24 h-24 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-5xl mx-auto mb-8">✅</div>
                 <h2 className="text-4xl font-black text-slate-800 mb-4">تم الإرسال بنجاح!</h2>
                 <div className="bg-slate-900 text-white px-12 py-8 rounded-3xl mb-12 inline-block">
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-3">HN Request ID</p>
                    <p className="text-4xl font-mono">{generatedId}</p>
                 </div>
                 <button onClick={() => setViewMode('list')} className="w-full md:w-auto px-12 py-4 rounded-2xl bg-slate-100 font-bold">صندوق الوارد</button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-black text-slate-500">HN-REQ</div>
                <div className="font-mono font-black text-slate-900">{selectedRequest.request_number}</div>
                <div className="text-xs text-slate-600">
                  مقدم الطلب: <span className="font-bold">{selectedRequest.notary_name}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/40">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="text-sm font-black text-slate-800 mb-3">موضوع الطلب</div>
                    <div className="text-lg font-bold text-[#1d2569] mb-4 pb-2 border-b border-slate-50">
                      {selectedRequest.certificate_type} - {selectedRequest.reason_for_movement?.split('\n')[0] || 'بدون عنوان'}
                    </div>
                    <div className="text-sm font-black text-slate-800 mb-3">مضمون ومبررات الطلب</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl">
                      {selectedRequest.reason_for_movement || '—'}
                    </div>
                  </div>

                  {/* Attachment and Audit Audit Trail Sections... */}

                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-black text-slate-800">الوثائق المرفقة (PDF)</div>
                      <div className="text-[10px] font-bold text-slate-400">PDF Only</div>
                    </div>
                    <div className="space-y-2">
                      {String(selectedRequest.attachments || '')
                        .split(',')
                        .map((x: string) => x.trim())
                        .filter(Boolean)
                        .map((url: string, idx: number) => (
                          <a
                            key={`${url}_${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-800 hover:bg-white"
                          >
                            📎 فتح الوثيقة {idx + 1}
                          </a>
                        ))}
                      {String(selectedRequest.attachments || '').trim().length === 0 ? (
                        <div className="text-sm text-slate-500">لا توجد وثائق.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="text-sm font-black text-slate-800 mb-4">سجل التتبع (Audit Trail)</div>
                    <div className="space-y-3">
                      {workflowEvents.length === 0 ? (
                        <div className="text-sm text-slate-500">لا توجد أحداث مسجلة بعد.</div>
                      ) : (
                        workflowEvents
                          .slice()
                          .reverse()
                          .map((ev: any, idx: number) => (
                            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>{ev?.type || 'event'} • {ev?.stage || '—'}</span>
                                <span>{ev?.at ? new Date(ev.at).toLocaleString('ar-MA') : '—'}</span>
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-800">{ev?.message || '—'}</div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {!isNotary && (
                    <>
                      <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="text-sm font-black text-slate-800 mb-3">مرحلة المعالجة</div>
                        <div className="text-xs text-slate-500 mb-3">الحالية: <span className="font-bold">{currentStage}</span></div>
                        <select
                          value={processingStage}
                          onChange={(e) => setProcessingStage(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                        >
                          {[
                            'التحقق الشكلي',
                            'اكتمال الوثائق',
                            'سلامة التوقيع',
                            'الإحالة الداخلية',
                            'اللجنة القانونية',
                            'اللجنة التأديبية',
                            'المكتب التنفيذي',
                            'المداولة',
                            'اتخاذ القرار',
                            'التحرير الرسمي للرد',
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="ملاحظة / تعليل داخلي..."
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          rows={4}
                        />
                        <button
                          onClick={() => {
                            appendWorkflowMutation.mutate({
                              notificationId: selectedRequest.id,
                              stage: processingStage,
                              eventType: 'stage',
                              message: actionNote?.trim() ? `تحديث المرحلة: ${processingStage} — ${actionNote.trim()}` : `تحديث المرحلة: ${processingStage}`,
                              actorName: user?.full_name || undefined,
                              actorRole: user?.role || undefined,
                            });
                          }}
                          disabled={appendWorkflowMutation.isPending}
                          className="mt-3 w-full rounded-xl bg-[#1d2569] py-3 text-white font-black disabled:opacity-50"
                        >
                          {appendWorkflowMutation.isPending ? '...' : 'حفظ المرحلة'}
                        </button>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="text-sm font-black text-slate-800 mb-3">الرد الرسمي (Response Layer)</div>
                        <select
                          value={responseType}
                          onChange={(e) => setResponseType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                        >
                          <option value="موافقة">موافقة</option>
                          <option value="رفض">رفض معلل</option>
                          <option value="تأجيل">إرجاء</option>
                          <option value="طلب_استكمال">طلب استكمال</option>
                        </select>
                        <textarea
                          value={responseReasoning}
                          onChange={(e) => setResponseReasoning(e.target.value)}
                          placeholder="تعليل الرد / القرار..."
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          rows={5}
                        />
                        <button
                          onClick={() => {
                            if (!responseReasoning.trim() && responseType !== 'موافقة') {
                              alert('يرجى إدخال تعليل للقرار.');
                              return;
                            }
                            appendWorkflowMutation.mutate({
                              notificationId: selectedRequest.id,
                              stage: 'اتخاذ القرار',
                              eventType: responseType === 'طلب_استكمال' ? 'request_completion' : 'decision',
                              message:
                                responseType === 'طلب_استكمال'
                                  ? `طلب استكمال: ${responseReasoning.trim() || 'يرجى استكمال الوثائق المطلوبة.'}`
                                  : `قرار: ${responseType} — ${responseReasoning.trim() || 'تمت الموافقة.'}`,
                              actorName: user?.full_name || undefined,
                              actorRole: user?.role || undefined,
                            });

                            recordDecisionMutation.mutate({
                              notificationId: selectedRequest.id,
                              decisionType: responseType === 'طلب_استكمال' ? 'تأجيل' : responseType,
                              reasoning: responseReasoning.trim() || 'تمت الموافقة على الطلب بعد المراجعة.',
                            });
                          }}
                          disabled={recordDecisionMutation.isPending}
                          className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-white font-black disabled:opacity-50"
                        >
                          {recordDecisionMutation.isPending ? '...' : 'إرسال القرار والرد الرسمي للعدل'}
                        </button>

                        <button
                          onClick={() => {
                            window.print();
                          }}
                          className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-slate-200 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                          <span>🖨️</span> طباعة المقرر الرسمي (PDF)
                        </button>
                      </div>
                    </>
                  )}

                  {isNotary && selectedRequest.status !== 'قيد_المعالجة' && (
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
                      <div className="text-sm font-black text-emerald-800 mb-3">القرار النهائي والرد الرسمي</div>
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">الوضعية</p>
                        <p className="font-black text-emerald-900">{selectedRequest.status}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 mb-4">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">تعليل الهيئة</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {selectedWorkflow?.events?.find((e: any) => e.type === 'decision')?.message?.split('—')[1]?.trim() || 'تمت الموافقة على طلبكم.'}
                        </p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-900/20"
                      >
                        📄 تحميل المقرر الرسمي (PDF)
                      </button>
                    </div>
                  )}

                  {isNotary && selectedRequest.status === 'قيد_المعالجة' && (
                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
                      <div className="text-sm font-black text-amber-800 mb-3">حالة الطلب</div>
                      <p className="text-sm text-amber-700 leading-relaxed mb-4">
                        طلبكم قيد المعالجة لدى المصالح المختصة بالهيئة الوطنية للعدول. سيصلكم إشعار فور اتخاذ القرار النهائي.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                          <span>المرحلة الحالية:</span>
                          <span className="bg-white px-2 py-1 rounded border border-amber-200">{currentStage}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes bounceIn {
        0% { transform: scale(0.8); opacity: 0; }
        70% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); }
      }
      .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      .animate-slideIn { animation: slideIn 0.4s ease-out; }
      .animate-bounceIn { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    `}} />
    </>
  );
};

export default NationalRequestsManagement;

