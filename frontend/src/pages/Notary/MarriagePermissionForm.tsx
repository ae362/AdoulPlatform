import React, { useState, useEffect, useMemo } from 'react';
import { WacomSignatureCapture, type CapturedWacomSignature } from '../../components/WacomSignatureCapture';
import { PermissionJudgeSelector } from '../../components/PermissionJudgeSelector';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

interface MarriagePermissionFormProps {
  notaryData: {
    fullName: string;
    professionalNumber: string;
    officeNumber: string;
    jurisdiction: string;
    appointmentDecreeNumber: string;
    appointmentDate: string;
    appellateCourt: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function buildLocalMarriageDraft(formState: any) {
  const suitorName = `${formState.suitorFirstNameAr || ''} ${formState.suitorLastNameAr || ''}`.trim() || 'الخاطب';
  const fianceeName = `${formState.fianceeFirstNameAr || ''} ${formState.fianceeLastNameAr || ''}`.trim() || 'المخطوبة';
  const guardianLine =
    formState.hasGuardian === 'نعم'
      ? `وقد صرح الولي ${formState.guardianName || 'المذكور'} بصفته ${formState.guardianCapacity || 'ولياً شرعياً'} بموافقته على هذا الطلب.`
      : '';

  return [
    'الحمد لله وحده.',
    `بناء على طلب الإذن بتوثيق الزواج المقدم من ${suitorName} الراغب في الزواج من ${fianceeName}.`,
    `نوع الزواج المطلوب: ${formState.marriageType || 'زواج أول'}.`,
    `الخاطب الحامل لبطاقة التعريف الوطنية رقم ${formState.suitorCIN || 'غير مصرح به'}، والمخطوبة الحاملة لبطاقة التعريف الوطنية رقم ${formState.fianceeCIN || 'غير مصرح به'}.`,
    guardianLine,
    'أُعد هذا الطلب قصد عرضه على السيد قاضي الأسرة المكلف بالزواج لاتخاذ المتعين قانوناً.',
  ]
    .filter(Boolean)
    .join('\n');
}

function getMarriageDraftServiceUrl() {
  const configuredUrl = ((import.meta as any).env?.VITE_NOTARY_DRAFT_SERVICE_URL as string | undefined)?.trim();
  if (!configuredUrl) return null;
  return configuredUrl.replace(/\/+$/, '');
}

async function generateDraftFromPortalFields(formState: any) {
  const serviceUrl = getMarriageDraftServiceUrl();

  if (!serviceUrl) {
    return {
      draft: {
        final_text: buildLocalMarriageDraft(formState),
      },
      intake_id: null,
      generate_request: null,
      saved_input_path: null,
      saved_generate_request_path: null,
      usedLocalFallback: true,
    };
  }

  try {
    const response = await fetch(`${serviceUrl}/notary-portal/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "marriage",
        title: "رسم زواج",
        subject: "رسم زواج",
        fields: formState,
        debug: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Drafting service failed with HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.warn('Marriage draft service unavailable, using local fallback draft.', error);
    return {
      draft: {
        final_text: buildLocalMarriageDraft(formState),
      },
      intake_id: null,
      generate_request: null,
      saved_input_path: null,
      saved_generate_request_path: null,
      usedLocalFallback: true,
    };
  }
}

const MarriagePermissionForm: React.FC<MarriagePermissionFormProps> = ({
  notaryData,
  onSubmit,
  onCancel,
  isSubmitting: extIsSubmitting
}) => {
  const printablePreviewRef = React.useRef<HTMLDivElement | null>(null);
  const { user, sessionToken } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 8;
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeNotarySlot, setActiveNotarySlot] = useState<'adoul1' | 'adoul2'>('adoul1');

  const { data: notaryPartners } = trpc.auth.getNotaryPartners.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken && !!user?.id,
      staleTime: 60_000,
    }
  );
  
  // Auto-generated file number
  const [fileNumber] = useState(`MAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [creationDate] = useState(new Date().toLocaleDateString('ar-MA'));

  const activeSecondaryPartner = useMemo(() => {
    return (notaryPartners || []).find((partner: any) => partner?.is_available) || null;
  }, [notaryPartners]);

  const primaryNotaryName =
    String(notaryData.fullName || user?.full_name || '').trim() || 'العدل الأول';
  const secondaryNotaryName =
    String(activeSecondaryPartner?.partner_name || '').trim() || 'العدل الثاني';
  const primarySlotLabel = 'الشريك 1';
  const secondarySlotLabel = 'الشريك 2';

  const hasDualNotaryPair = !!primaryNotaryName && !!String(activeSecondaryPartner?.partner_name || '').trim();

  const [formData, setFormData] = useState({
    // Step 1: General
    court: 'المحكمة الابتدائية – قسم قضاء الأسرة',
    judgeName: '',
    selectedJudgeUserId: '',
    status: 'قيد الإعداد',

    // Step 2: Suitor (Khateb) Identity
    suitorFirstNameAr: '',
    suitorLastNameAr: '',
    suitorFirstNameLat: '',
    suitorLastNameLat: '',
    suitorParents: '',
    suitorDOB: '',
    suitorPOB: '',
    suitorBirthRegistryNumber: '',
    suitorNationality: 'مغربية',
    suitorCIN: '',
    suitorFamilyStatus: 'أعزب',
    suitorHealthStatus: 'سليم',
    suitorHealthDetails: '',

    // Step 3: Suitor Job & Housing
    suitorProfession: '',
    suitorAddress: '',
    suitorCommune: '',
    suitorAdministrativeAnnex: '',
    suitorHasWakil: false,
    suitorWakilInfo: '',

    // Step 4: Suitor Documents
    suitorDocs: {
      adminCert: { number: '', date: '', issuer: '', file: null as File | null },
      birthCert: { number: '', date: '', issuer: '', file: null as File | null },
      medicalCert: { number: '', date: '', issuer: '', file: null as File | null },
      marriagePermission: { number: '', date: '', issuer: '', file: null as File | null },
      competenceCert: { number: '', date: '', issuer: '', file: null as File | null },
    },

    // Step 5: Fiancée (Makhtouba) Identity
    fianceeFirstNameAr: '',
    fianceeLastNameAr: '',
    fianceeFirstNameLat: '',
    fianceeLastNameLat: '',
    fianceeParents: '',
    fianceeDOB: '',
    fianceePOB: '',
    fianceeBirthRegistryNumber: '',
    fianceeNationality: 'مغربية',
    fianceeCIN: '',
    fianceeFamilyStatus: 'بكر',
    fianceeHealthStatus: 'سليمة',
    fianceeHealthDetails: '',

    // Step 6: Fiancée Job & Housing
    fianceeProfession: '',
    fianceeAddress: '',
    fianceeCommune: '',
    fianceeAdministrativeAnnex: '',
    fianceeHasWakil: false,
    fianceeWakilInfo: '',

    // Step 7: Fiancée Documents
    fianceeDocs: {
      adminCert: { number: '', date: '', issuer: '', file: null as File | null },
      birthCert: { number: '', date: '', issuer: '', file: null as File | null },
      medicalCert: { number: '', date: '', issuer: '', file: null as File | null },
      marriagePermission: { number: '', date: '', issuer: '', file: null as File | null },
      competenceCert: { number: '', date: '', issuer: '', file: null as File | null },
    },

    // Step 8: Marriage Details
    marriageType: 'زواج أول', // زواج أول, مراجعة, زواج تعدد
    hasGuardian: 'لا',
    guardianName: '',
    guardianCapacity: '',
    guardianCIN: '',

    // Final
    authorizationToPull: false,
    suitorSignature: false,
    fianceeSignature: false,
    guardianSignature: false,
    finalSignature: false,
    finalSignatureData: null as CapturedWacomSignature | null,
    suitorSignatureData: null as CapturedWacomSignature | null,
    fianceeSignatureData: null as CapturedWacomSignature | null,
    guardianSignatureData: null as CapturedWacomSignature | null,
    notarySigning: {
      enabled: true,
      completed: false,
      completedAt: null as string | null,
      signatures: {
        adoul1: null as any,
        adoul2: null as any,
      },
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDocChange = (party: 'suitor' | 'fiancee', docType: string, field: string, value: any) => {
    const partyDocs = party === 'suitor' ? 'suitorDocs' : 'fianceeDocs';
    setFormData(prev => ({
      ...prev,
      [partyDocs]: {
        ...(prev[partyDocs as keyof typeof prev] as any),
        [docType]: {
          ...(prev[partyDocs as keyof typeof prev] as any)[docType],
          [field]: value
        }
      }
    }));
  };

  const handlePartySignatureSave = (
    role: 'suitor' | 'fiancee' | 'guardian',
    signature: CapturedWacomSignature
  ) => {
    if (role === 'suitor') {
      setFormData((prev) => ({
        ...prev,
        suitorSignature: true,
        suitorSignatureData: signature,
      }));
      return;
    }

    if (role === 'fiancee') {
      setFormData((prev) => ({
        ...prev,
        fianceeSignature: true,
        fianceeSignatureData: signature,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      guardianSignature: true,
      guardianSignatureData: signature,
    }));
  };

  const handleFinalSignatureSave = (signature: CapturedWacomSignature) => {
    setFormData((prev) => {
      const nextSignatures = {
        ...(prev.notarySigning?.signatures || {}),
        [activeNotarySlot]: {
          slot: activeNotarySlot,
          label: activeNotarySlot === 'adoul1' ? 'توقيع العدل الأول' : 'توقيع العدل الثاني',
          signerName: activeNotarySlot === 'adoul1' ? primaryNotaryName : secondaryNotaryName,
          professionalNumber: activeNotarySlot === 'adoul1' ? String(notaryData.professionalNumber || '') : '',
          ...signature,
        },
      };
      const completed = !!nextSignatures.adoul1?.signatureDataUrl && !!nextSignatures.adoul2?.signatureDataUrl;
      return {
        ...prev,
        finalSignature: completed,
        finalSignatureData: completed ? nextSignatures.adoul2 || nextSignatures.adoul1 : null,
        notarySigning: {
          enabled: true,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
          signatures: nextSignatures,
        },
      };
    });

    if (activeNotarySlot === 'adoul1' && hasDualNotaryPair) {
      setActiveNotarySlot('adoul2');
    }
  };

  const adoul1Signature = formData.notarySigning?.signatures?.adoul1 || null;
  const adoul2Signature = formData.notarySigning?.signatures?.adoul2 || null;
  const hasBothNotarySignatures = !!adoul1Signature?.signatureDataUrl && !!adoul2Signature?.signatureDataUrl;

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.judgeName) newErrors.judgeName = 'يرجى اختيار القاضي المكلف';
    }

    if (currentStep === 2) {
      if (!formData.suitorFirstNameAr) newErrors.suitorFirstNameAr = 'الاسم الشخصي مطلوب';
      if (!formData.suitorLastNameAr) newErrors.suitorLastNameAr = 'الاسم العائلي مطلوب';
      if (!formData.suitorCIN) newErrors.suitorCIN = 'رقم البطاقة الوطنية مطلوب';
    }
    
    if (currentStep === 3) {
      if (!formData.suitorProfession) newErrors.suitorProfession = 'المهنة مطلوبة';
      if (!formData.suitorAddress) newErrors.suitorAddress = 'عنوان السكن مطلوب';
    }

    if (currentStep === 4) {
      // Basic check for mandatory docs
      if (!formData.suitorDocs.adminCert.number) {
        newErrors.suitorDocs = 'يجب إدخال رقم الشهادة الإدارية للمتابعة';
      } else if (!formData.suitorDocs.birthCert.number) {
        newErrors.suitorDocs = 'يجب إدخال رقم رسم الولادة للمتابعة';
      }
    }

    if (currentStep === 5) {
      if (!formData.fianceeFirstNameAr) newErrors.fianceeFirstNameAr = 'الاسم الشخصي مطلوب';
      if (!formData.fianceeLastNameAr) newErrors.fianceeLastNameAr = 'الاسم العائلي مطلوب';
      if (!formData.fianceeCIN) newErrors.fianceeCIN = 'رقم البطاقة الوطنية مطلوب';
    }

    if (currentStep === 6) {
      if (!formData.fianceeDocs.adminCert.number) {
        newErrors.fianceeDocs = 'يجب إدخال رقم الشهادة الإدارية للمخطوبة';
      } else if (!formData.fianceeDocs.birthCert.number) {
        newErrors.fianceeDocs = 'يجب إدخال رقم رسم الولادة للمخطوبة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo(0, 0);
    }
  };

  const handleGenerateAndSubmit = async () => {
    if (!String(formData.judgeName || '').trim()) {
      setGenError('يرجى اختيار القاضي الموجه إليه الطلب قبل الإرسال النهائي');
      return;
    }
    setIsGenerating(true);
    setGenError(null);
    try {
      // 1. Generate the draft from the external service, or fall back locally if unavailable
      const draftResult = await generateDraftFromPortalFields(formData);
      
      // 2. Pass the data back with the generated text and debug info
      onSubmit({
        ...formData,
        generatedDraft: draftResult.draft?.final_text || "",
        intake_id: draftResult.intake_id,
        generate_request: draftResult.generate_request,
        saved_input_path: draftResult.saved_input_path,
        saved_generate_request_path: draftResult.saved_generate_request_path,
        usedLocalFallbackDraft: !!draftResult.usedLocalFallback,
      });
    } catch (err: any) {
      console.error("Draft generation failed:", err);
      setGenError(`فشل الاتصال بخدمة الصياغة: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden font-amiri" dir="rtl">
      {/* Smart Progress Bar */}
      <div className="bg-slate-50 border-b border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-red-950">طلب الاذن بالزواج عبر بوابة العدل</h2>
          <div className="text-sm font-bold text-gray-500 bg-white px-4 py-1 rounded-full border border-gray-100">
             المرحلة {step} من {totalSteps}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 h-full transition-all duration-500 shadow-[0_0_15px_rgba(251,146,60,0.8)]"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="p-8 md:p-12">
        {/* Step 1: General Info & Notary */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100 space-y-4">
                <h3 className="text-lg font-black text-red-900 border-b border-red-200 pb-2">بيانات الملف الآلية</h3>
                <div className="space-y-2">
                  <p className="flex justify-between"><span>رقم الملف:</span> <span className="font-bold text-red-950">{fileNumber}</span></p>
                  <p className="flex justify-between"><span>تاريخ الإنشاء:</span> <span className="font-bold text-red-950">{creationDate}</span></p>
                  <p className="flex justify-between"><span>حالة الملف:</span> <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">{formData.status}</span></p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">المحكمة والوجهة</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">المحكمة المختصة</label>
                    <input type="text" readOnly value={formData.court} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-red-950 font-bold" />
                  </div>
                  <div className={`${errors.judgeName ? 'p-2 border border-red-500 bg-red-50 rounded-xl' : ''}`}>
                    <PermissionJudgeSelector
                      judgeName={formData.judgeName}
                      selectedJudgeUserId={(formData as any).selectedJudgeUserId || ''}
                      onChange={({ judgeName, selectedJudgeUserId }) => {
                        setFormData((prev) => ({
                          ...prev,
                          judgeName,
                          selectedJudgeUserId: selectedJudgeUserId || '',
                        }));
                        if (errors.judgeName) {
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.judgeName;
                            return next;
                          });
                        }
                      }}
                      label="القاضي المكلف"
                      helperText="اختر القاضي الذي سيحال إليه الطلب أو أدخل الاسم يدوياً."
                    />
                  </div>
                  {errors.judgeName && <p className="text-red-600 text-xs mt-1 font-bold">{errors.judgeName}</p>}
                </div>
              </div>
            </div>

            <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center text-sm">1</span>
                بيانات العدل المشرف
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">الاسم الكامل</p>
                  <p className="font-bold text-lg bg-gray-50 p-2 rounded-lg border border-gray-100">{notaryData.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">الرقم المهني</p>
                  <p className="font-bold text-lg bg-gray-50 p-2 rounded-lg border border-gray-100">{notaryData.professionalNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">محكمة الاستئناف</p>
                  <p className="font-bold text-lg bg-gray-50 p-2 rounded-lg border border-gray-100">{notaryData.appellateCourt || 'غير محدد'}</p>
                </div>
                <div className="lg:col-span-3">
                  <p className="text-xs text-gray-500 font-bold mb-1">دائرة الاختصاص (المحكمة الابتدائية)</p>
                  <p className="font-bold text-lg bg-gray-50 p-2 rounded-lg border border-gray-100">{notaryData.jurisdiction}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={nextStep}
                className="bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
              >
                المرحلة الموالية 
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Suitor Identity */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">👤</span>
               بيانات الخاطب (طالب الإذن)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl">
              <div className="space-y-4">
                 <h4 className="font-black text-slate-800 text-lg">الهوية بالعربية</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold mb-1">الاسم الشخصي</label>
                     <input type="text" name="suitorFirstNameAr" value={formData.suitorFirstNameAr} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 ${errors.suitorFirstNameAr ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                     {errors.suitorFirstNameAr && <p className="text-red-600 text-xs mt-1 font-bold">{errors.suitorFirstNameAr}</p>}
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">الاسم العائلي</label>
                     <input type="text" name="suitorLastNameAr" value={formData.suitorLastNameAr} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 ${errors.suitorLastNameAr ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                     {errors.suitorLastNameAr && <p className="text-red-600 text-xs mt-1 font-bold">{errors.suitorLastNameAr}</p>}
                   </div>
                 </div>
                 <div className="mt-4">
                   <label className="block text-sm font-bold mb-1">أسماء الوالدين (كاملة)</label>
                   <input 
                     type="text" 
                     name="suitorParents" 
                     value={formData.suitorParents} 
                     onChange={handleInputChange} 
                     placeholder="ابن فلان وفلانة"
                     className="w-full border border-gray-200 rounded-xl px-4 py-3" 
                   />
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black text-slate-400 text-lg">Identity in Latin</h4>
                 <div className="grid grid-cols-2 gap-4" dir="ltr">
                   <div>
                     <label className="block text-sm font-bold mb-1">First Name</label>
                     <input type="text" name="suitorFirstNameLat" value={formData.suitorFirstNameLat} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">Last Name</label>
                     <input type="text" name="suitorLastNameLat" value={formData.suitorLastNameLat} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                   </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold mb-1">تاريخ الازدياد</label>
                <input type="date" name="suitorDOB" value={formData.suitorDOB} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">مكان الازدياد</label>
                <input type="text" name="suitorPOB" value={formData.suitorPOB} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">رقم رسم الولادة</label>
                <input type="text" name="suitorBirthRegistryNumber" value={formData.suitorBirthRegistryNumber} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="مثال: 1234" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الجنسية</label>
                <input type="text" name="suitorNationality" value={formData.suitorNationality} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">رقم البطاقة الوطنية</label>
                <input type="text" name="suitorCIN" value={formData.suitorCIN} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 font-bold text-red-950 ${errors.suitorCIN ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                {errors.suitorCIN && <p className="text-red-600 text-xs mt-1 font-bold">{errors.suitorCIN}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الحالة العائلية</label>
                <select name="suitorFamilyStatus" value={formData.suitorFamilyStatus} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3">
                  <option value="أعزب">أعزب</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الحالة الصحية</label>
                <div className="flex gap-2">
                  <select name="suitorHealthStatus" value={formData.suitorHealthStatus} onChange={handleInputChange} className="flex-1 border border-gray-200 rounded-xl px-4 py-3">
                    <option value="سليم">سليم</option>
                    <option value="مرض مزمن">مرض مزمن</option>
                  </select>
                </div>
              </div>
            </div>
            {formData.suitorHealthStatus === 'مرض مزمن' && (
              <div className="mt-2 animate-slideDown">
                <label className="block text-sm font-bold mb-1">تفاصيل الحالة الصحية</label>
                <textarea name="suitorHealthDetails" value={formData.suitorHealthDetails} onChange={handleInputChange} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="يرجى التوضيح..."></textarea>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Suitor Job & Housing */}
        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">🏠</span>
               المهنة والسكن - الخاطب
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-1">المهنة</label>
                <input type="text" name="suitorProfession" value={formData.suitorProfession} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 ${errors.suitorProfession ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                {errors.suitorProfession && <p className="text-red-600 text-xs mt-1 font-bold">{errors.suitorProfession}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">عنوان السكن أو الإقامة</label>
                <textarea name="suitorAddress" value={formData.suitorAddress} onChange={handleInputChange} rows={3} className={`w-full border rounded-xl px-4 py-3 ${errors.suitorAddress ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}></textarea>
                {errors.suitorAddress && <p className="text-red-600 text-xs mt-1 font-bold">{errors.suitorAddress}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الجماعة / الإقليم</label>
                <input type="text" name="suitorCommune" value={formData.suitorCommune} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الملحقة الإدارية</label>
                <input type="text" name="suitorAdministrativeAnnex" value={formData.suitorAdministrativeAnnex} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="مثال: الملحقة الإدارية الثانية" />
              </div>
              <div className="bg-slate-100/50 p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-slate-800">هل يوجد وكيل ؟</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, suitorHasWakil: true }))}
                      className={`px-6 py-2 rounded-xl font-bold transition-all border ${formData.suitorHasWakil ? 'bg-red-900 text-white border-red-900 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, suitorHasWakil: false, suitorWakilInfo: '' }))}
                      className={`px-6 py-2 rounded-xl font-bold transition-all border ${!formData.suitorHasWakil ? 'bg-red-900 text-white border-red-900 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      لا
                    </button>
                  </div>
                </div>
                
                {formData.suitorHasWakil && (
                  <div className="animate-slideDown space-y-2">
                    <label className="block text-xs font-bold text-red-900">معلومات الوكيل (الاسم، رقم البطاقة، تفاصيل الوكالة...)</label>
                    <textarea 
                      name="suitorWakilInfo" 
                      value={formData.suitorWakilInfo} 
                      onChange={handleInputChange} 
                      rows={2}
                      placeholder="أدخل البيانات الكاملة للوكيل هنا..."
                      className="w-full border-2 border-red-100 rounded-xl px-4 py-3 focus:border-red-900 focus:outline-none bg-white font-bold" 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Suitor Documents */}
        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">📂</span>
               وثائق الخاطب
            </h3>
            
            <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 border ${errors.suitorDocs ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
               <span className="text-xl">{errors.suitorDocs ? '❌' : '⚠️'}</span>
               <div className="flex-1">
                 <p className={`text-sm font-bold ${errors.suitorDocs ? 'text-red-900' : 'text-amber-900'}`}>
                   {errors.suitorDocs || 'تنبيه ذكي: لا يمكن الانتقال للمرحلة الموالية إلا بعد اكتمال الوثائق الإلزامية.'}
                 </p>
               </div>
            </div>

            <div className="space-y-4">
              {[
                { id: 'adminCert', label: 'شهادة إدارية' },
                { id: 'birthCert', label: 'نسخة كاملة من رسم الولادة' },
                { id: 'medicalCert', label: 'شهادة طبية' },
                { id: 'marriagePermission', label: 'الإذن بالزواج (عند الاقتضاء)' },
                { id: 'competenceCert', label: 'شهادة الكفاءة للزواج' },
              ].map((doc) => (
                <div key={doc.id} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                       <p className="font-black text-red-900">{doc.label}</p>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                         <input 
                           type="text" 
                           placeholder="رقم الوثيقة" 
                           value={(formData.suitorDocs as any)[doc.id].number} 
                           onChange={(e) => handleDocChange('suitor', doc.id, 'number', e.target.value)}
                           className={`border rounded-lg px-3 py-2 text-xs ${(errors.suitorDocs && !(formData.suitorDocs as any)[doc.id].number && (doc.id === 'adminCert' || doc.id === 'birthCert')) ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                         />
                         <input 
                           type="date" 
                           value={(formData.suitorDocs as any)[doc.id].date} 
                           onChange={(e) => handleDocChange('suitor', doc.id, 'date', e.target.value)}
                           className="border border-gray-100 rounded-lg px-3 py-2 text-xs" 
                         />
                         <input 
                           type="text" 
                           placeholder="الجهة المصدرة" 
                           value={(formData.suitorDocs as any)[doc.id].issuer} 
                           onChange={(e) => handleDocChange('suitor', doc.id, 'issuer', e.target.value)}
                           className="border border-gray-100 rounded-lg px-3 py-2 text-xs col-span-2" 
                         />
                       </div>
                    </div>
                    <div className="w-full md:w-auto">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                        <span>📤 تحميل PDF</span>
                        <input 
                          type="file" 
                          hidden 
                          onChange={(e) => handleDocChange('suitor', doc.id, 'file', e.target.files?.[0])}
                        />
                      </label>
                      {(formData.suitorDocs as any)[doc.id].file && (
                        <p className="text-[10px] text-green-600 mt-1 font-bold">✓ تم التحميل</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Fiancée Identity */}
        {step === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">👩</span>
               بيانات المخطوبة (المرأة المراد الزواج بها)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-pink-50/30 p-8 rounded-3xl border border-pink-100/50">
              <div className="space-y-4">
                 <h4 className="font-black text-pink-800 text-lg">الهوية بالعربية</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold mb-1">الاسم الشخصي</label>
                     <input type="text" name="fianceeFirstNameAr" value={formData.fianceeFirstNameAr} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 ${errors.fianceeFirstNameAr ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                     {errors.fianceeFirstNameAr && <p className="text-red-600 text-xs mt-1 font-bold">{errors.fianceeFirstNameAr}</p>}
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">الاسم العائلي</label>
                     <input type="text" name="fianceeLastNameAr" value={formData.fianceeLastNameAr} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 ${errors.fianceeLastNameAr ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                     {errors.fianceeLastNameAr && <p className="text-red-600 text-xs mt-1 font-bold">{errors.fianceeLastNameAr}</p>}
                   </div>
                 </div>
                 <div className="mt-4">
                   <label className="block text-sm font-bold mb-1">أسماء الوالدين (كاملة)</label>
                   <input 
                     type="text" 
                     name="fianceeParents" 
                     value={formData.fianceeParents} 
                     onChange={handleInputChange} 
                     placeholder="بنت فلان وفلانة"
                     className="w-full border border-gray-200 rounded-xl px-4 py-3" 
                   />
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="font-black text-slate-400 text-lg">Identity in Latin</h4>
                 <div className="grid grid-cols-2 gap-4" dir="ltr">
                   <div>
                     <label className="block text-sm font-bold mb-1">First Name</label>
                     <input type="text" name="fianceeFirstNameLat" value={formData.fianceeFirstNameLat} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold mb-1">Last Name</label>
                     <input type="text" name="fianceeLastNameLat" value={formData.fianceeLastNameLat} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                   </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold mb-1">تاريخ الازدياد</label>
                <input type="date" name="fianceeDOB" value={formData.fianceeDOB} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">مكان الازدياد</label>
                <input type="text" name="fianceePOB" value={formData.fianceePOB} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">رقم رسم الولادة</label>
                <input type="text" name="fianceeBirthRegistryNumber" value={formData.fianceeBirthRegistryNumber} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="مثال: 5678" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الجنسية</label>
                <input type="text" name="fianceeNationality" value={formData.fianceeNationality} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">رقم البطاقة الوطنية</label>
                <input type="text" name="fianceeCIN" value={formData.fianceeCIN} onChange={handleInputChange} className={`w-full border rounded-xl px-4 py-3 font-bold text-red-950 ${errors.fianceeCIN ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                {errors.fianceeCIN && <p className="text-red-600 text-xs mt-1 font-bold">{errors.fianceeCIN}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الحالة العائلية</label>
                <select name="fianceeFamilyStatus" value={formData.fianceeFamilyStatus} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3">
                  <option value="بكر">بكر</option>
                  <option value="مطلقة">مطلقة</option>
                  <option value="أرملة">أرملة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">الحالة الصحية</label>
                <select name="fianceeHealthStatus" value={formData.fianceeHealthStatus} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3">
                  <option value="سليمة">سليمة</option>
                  <option value="مرض">مرض</option>
                </select>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-gray-100">
               <h4 className="font-black text-red-900 mb-6 flex items-center gap-2">
                 <span>🏠</span> المهنة والسكن للمخطوبة
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-sm font-bold mb-1">المهنة</label>
                   <input type="text" name="fianceeProfession" value={formData.fianceeProfession} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold mb-1">الجماعة / الإقليم</label>
                   <input type="text" name="fianceeCommune" value={formData.fianceeCommune} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold mb-1">الملحقة الإدارية</label>
                   <input type="text" name="fianceeAdministrativeAnnex" value={formData.fianceeAdministrativeAnnex} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="مثال: الملحقة الإدارية الرابعة" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold mb-1">عنوان السكن</label>
                   <input type="text" name="fianceeAddress" value={formData.fianceeAddress} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3" />
                 </div>
                 <div className="md:col-span-2 bg-pink-50/50 p-6 rounded-2xl border border-pink-100">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-bold text-pink-900">هل يوجد وكيل للمخطوبة ؟</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, fianceeHasWakil: true }))}
                          className={`px-6 py-2 rounded-xl font-bold transition-all border ${formData.fianceeHasWakil ? 'bg-pink-800 text-white border-pink-800 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                        >
                          نعم
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, fianceeHasWakil: false, fianceeWakilInfo: '' }))}
                          className={`px-6 py-2 rounded-xl font-bold transition-all border ${!formData.fianceeHasWakil ? 'bg-pink-800 text-white border-pink-800 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                        >
                          لا
                        </button>
                      </div>
                    </div>
                    
                    {formData.fianceeHasWakil && (
                      <div className="animate-slideDown space-y-2">
                        <label className="block text-xs font-bold text-pink-900">معلومات الوكيل (الاسم، رقم البطاقة، تفاصيل الوكالة...)</label>
                        <textarea 
                          name="fianceeWakilInfo" 
                          value={formData.fianceeWakilInfo} 
                          onChange={handleInputChange} 
                          rows={2}
                          placeholder="أدخل البيانات الكاملة للوكيل هنا..."
                          className="w-full border-2 border-pink-100 rounded-xl px-4 py-3 focus:border-pink-800 focus:outline-none bg-white font-bold" 
                        />
                      </div>
                    )}
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Step 6: Fiancée Documents */}
        {step === 6 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">📂</span>
               وثائق المخطوبة
            </h3>
            
            <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 border ${errors.fianceeDocs ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
               <span className="text-xl">{errors.fianceeDocs ? '❌' : '⚠️'}</span>
               <div className="flex-1">
                 <p className={`text-sm font-bold ${errors.fianceeDocs ? 'text-red-900' : 'text-amber-900'}`}>
                   {errors.fianceeDocs || 'تنبيه ذكي: يرجى إدخال أرقام الوثائق الإلزامية للمخطوبة (الشهادة الإدارية ورسم الولادة).'}
                 </p>
               </div>
            </div>

            <div className="space-y-4">
              {[
                { id: 'adminCert', label: 'شهادة إدارية' },
                { id: 'birthCert', label: 'نسخة كاملة من رسم الولادة' },
                { id: 'medicalCert', label: 'شهادة طبية' },
                { id: 'marriagePermission', label: 'الإذن بالزواج (إن وجد)' },
                { id: 'competenceCert', label: 'شهادة الكفاءة للزواج' },
              ].map((doc) => (
                <div key={doc.id} className="p-6 bg-pink-50/20 border border-pink-100/50 rounded-3xl shadow-sm">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center justify-between">
                         <p className="font-black text-red-900">{doc.label}</p>
                         {(formData.fianceeDocs as any)[doc.id].file ? (
                           <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✔ مكتمل</span>
                         ) : (
                           <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">⚠ ناقص</span>
                         )}
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                         <input 
                           type="text" 
                           placeholder="رقم الوثيقة" 
                           value={(formData.fianceeDocs as any)[doc.id].number} 
                           onChange={(e) => handleDocChange('fiancee', doc.id, 'number', e.target.value)}
                           className={`border rounded-lg px-3 py-2 text-xs ${(errors.fianceeDocs && !(formData.fianceeDocs as any)[doc.id].number && (doc.id === 'adminCert' || doc.id === 'birthCert')) ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                         />
                         <input 
                           type="date" 
                           value={(formData.fianceeDocs as any)[doc.id].date} 
                           onChange={(e) => handleDocChange('fiancee', doc.id, 'date', e.target.value)}
                           className="border border-gray-100 rounded-lg px-3 py-2 text-xs" 
                         />
                         <input 
                           type="text" 
                           placeholder="الجهة المصدرة" 
                           value={(formData.fianceeDocs as any)[doc.id].issuer} 
                           onChange={(e) => handleDocChange('fiancee', doc.id, 'issuer', e.target.value)}
                           className="border border-gray-100 rounded-lg px-3 py-2 text-xs col-span-2" 
                         />
                       </div>
                    </div>
                    <div className="w-full md:w-auto">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                        <span>📤 تحميل PDF</span>
                        <input 
                          type="file" 
                          hidden 
                          onChange={(e) => handleDocChange('fiancee', doc.id, 'file', e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Marriage Details */}
        {step === 7 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">💍</span>
               معلومات الزواج المرغوب فيه
            </h3>
            
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                <p className="font-black text-slate-800">نوع الزواج:</p>
                <div className="flex flex-wrap gap-4">
                  {['زواج أول', 'مراجعة', 'زواج تعدد'].map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, marriageType: type }))}
                      className={`px-6 py-3 rounded-2xl font-bold transition-all border-2 ${formData.marriageType === type ? 'bg-red-950 text-white border-red-950 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {formData.marriageType === 'زواج تعدد' && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl animate-slideDown">
                   <p className="text-sm font-bold text-red-900 mb-2">ملاحظة لزواج التعدد:</p>
                   <p className="text-xs text-red-800 italic">يُرجى إرفاق الإذن بالتعدد الصادر عن المحكمة في قسم الوثائق.</p>
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-800">وجود ولي:</p>
                  <div className="flex gap-2">
                    {['نعم', 'لا'].map(v => (
                      <button 
                        key={v}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hasGuardian: v }))}
                        className={`px-6 py-2 rounded-xl font-bold transition-all border ${formData.hasGuardian === v ? 'bg-red-900 text-white border-red-900' : 'bg-white text-gray-400 border-gray-100'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.hasGuardian === 'نعم' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slideDown">
                    <input type="text" name="guardianName" value={formData.guardianName} onChange={handleInputChange} placeholder="اسم الولي الكامل" className="border border-gray-200 rounded-xl px-4 py-2" />
                    <input type="text" name="guardianCapacity" value={formData.guardianCapacity} onChange={handleInputChange} placeholder="الصفة (أب، أخ..)" className="border border-gray-200 rounded-xl px-4 py-2" />
                    <input type="text" name="guardianCIN" value={formData.guardianCIN} onChange={handleInputChange} placeholder="رقم البطاقة الوطنية" className="border border-gray-200 rounded-xl px-4 py-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Final Preview & Review */}
        {step === 8 && (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-2xl font-black text-red-950 flex items-center gap-3">
               <span className="text-3xl">📄</span>
               معاينة طلب الإذن بتوثيق الزواج
            </h3>
            
            <div className="bg-slate-50 p-1 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] rounded-3xl border border-slate-200 overflow-hidden">
               <div
                 ref={printablePreviewRef}
                 className="bg-white m-4 p-10 md:p-16 rounded-2xl shadow-inner border border-slate-100 text-right space-y-8 min-h-[1000px] font-amiri text-slate-900 leading-relaxed"
               >
                 
                 {/* Header Style from Screenshot */}
                 <div className="text-center space-y-4 mb-12">
                   <h1 className="text-4xl font-black border-b-4 border-double border-slate-900 inline-block px-12 pb-2">
                     طلب الإذن بتوثيق الــــــــــــــــــــزواج
                   </h1>
                   <p className="text-2xl font-bold mt-4">
                     إلى السيد قاضي الأسرة المكلف بالزواج بالمحكمة الابتدائية {notaryData.jurisdiction ? `ب${notaryData.jurisdiction}` : 'بشفشاون'}
                   </p>
                 </div>

                 {/* Suitor Section */}
                 <div className="space-y-4">
                   <h2 className="text-2xl font-black underline decoration-2 underline-offset-8 mb-6">
                     معلومـــــــــات عن الخاطب- طالب الإذن بتوثيق الزواج :
                   </h2>
                   <div className="space-y-3 px-4 text-xl">
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الاسم الشخصي والعائلي:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorFirstNameAr} {formData.suitorLastNameAr}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">تاريخ ومكان الازدياد :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorDOB || '....'} بـ {formData.suitorPOB || '....'} (رسم: {formData.suitorBirthRegistryNumber || '....'})</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">والداه:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorParents || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الجنسية:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorNationality}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">رقم البطاقة الوطنية :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4 font-mono">{formData.suitorCIN || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الحالة العائلية:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorFamilyStatus}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الحالة الصحية :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">
                         {formData.suitorHealthStatus === 'سليم' ? 'سليمة' : `به مرض (${formData.suitorHealthDetails || '................'})`} 
                         <span className="text-sm text-slate-400 mr-2">مع بيان نوع المرض إن كان</span>
                       </span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">المهنة :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorProfession || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">محل السكنى والملحقة :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.suitorAddress || '....'} ({formData.suitorAdministrativeAnnex || '....'})</span>
                     </p>
                   </div>
                 </div>

                 {/* Fiancee Section */}
                 <div className="space-y-4 pt-8">
                   <h2 className="text-2xl font-black underline decoration-2 underline-offset-8 mb-6">
                     معلومـــــــــات عن المخطوبة المراد الزواج بهــــــــــــــــــا :
                   </h2>
                   <div className="space-y-3 px-4 text-xl">
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الاسم الشخصي والعائلي:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeFirstNameAr} {formData.fianceeLastNameAr}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">تاريخ ومكان الازدياد :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeDOB || '....'} بـ {formData.fianceePOB || '....'} (رسم: {formData.fianceeBirthRegistryNumber || '....'})</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">من والداها:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeParents || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الجنسية:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeNationality}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">رقم البطاقة الوطنية :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4 font-mono">{formData.fianceeCIN || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الحالة العائلية:</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeFamilyStatus}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">الحالة الصحية :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">
                         {formData.fianceeHealthStatus === 'سليمة' ? 'سليمة' : `بها مرض (${formData.fianceeHealthDetails || '................'})`} 
                         <span className="text-sm text-slate-400 mr-2">مع بيان نوع المرض إن كان</span>
                       </span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">المهنة :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeProfession || '................................'}</span>
                     </p>
                     <p className="flex items-center gap-2">
                       <span className="text-slate-400">❖</span>
                       <span className="font-bold">محل السكنى والملحقة :</span>
                       <span className="border-b border-dotted border-slate-400 flex-1 px-4">{formData.fianceeAddress || '....'} ({formData.fianceeAdministrativeAnnex || '....'})</span>
                     </p>
                   </div>
                 </div>

                 {/* Marriage Details Section */}
                 <div className="space-y-6 pt-8">
                   <h2 className="text-2xl font-black underline decoration-2 underline-offset-8 mb-6">
                     معلومـــــــــات عــــــــن الــــــــزواج المرغوب فيــــــــــــــه :
                   </h2>
                   <div className="px-4 space-y-4 text-xl">
                     <p className="font-bold">
                       هل هذا الزواج أول؟ أو مراجعة للمخطوبة المذكورة؟ أو زواج متعدد؟
                     </p>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block px-12 font-black text-2xl text-red-950">
                       {formData.marriageType}
                     </div>
                     
                     <p className="text-2xl font-black pt-8">
                        &laquo;أفوض الموقع أسفله للعدل سحب إذن الزواج&raquo;
                     </p>
                   </div>
                 </div>

                 <div className="flex justify-between items-end pt-12 border-t mt-16">
                   <div className="text-right text-xl space-y-1">
                     <p className="font-bold italic">وحرر بتاريخ: <span className="underline px-4">{new Date().toLocaleDateString('ar-MA')}</span></p>
                   </div>
                   <div className="flex-1 flex flex-col items-center">
                     <p className="text-2xl font-black border-b-2 border-slate-900 px-12 mb-8">إمضــــــــــــــــاء</p>
                     <div className="grid w-full max-w-2xl grid-cols-2 gap-4 text-center font-bold text-lg">
                       <div className="space-y-2">
                         <p>{primarySlotLabel}</p>
                         <div className="h-12 border border-dashed border-slate-200 rounded flex items-center justify-center overflow-hidden bg-white">
                           {adoul1Signature?.signatureDataUrl ? (
                             <img src={adoul1Signature.signatureDataUrl} alt="توقيع العدل الأول" className="h-10 w-full object-contain" />
                           ) : (
                             <span className="text-[10px] text-slate-300">مكان توقيع الشريك 1</span>
                           )}
                         </div>
                       </div>
                       <div className="space-y-2">
                         <p>{secondarySlotLabel}</p>
                         <div className="h-12 border border-dashed border-slate-200 rounded flex items-center justify-center overflow-hidden bg-white">
                           {adoul2Signature?.signatureDataUrl ? (
                             <img src={adoul2Signature.signatureDataUrl} alt="توقيع العدل الثاني" className="h-10 w-full object-contain" />
                           ) : (
                             <span className="text-[10px] text-slate-300">مكان توقيع الشريك 2</span>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-red-50 p-8 rounded-3xl border border-red-100 space-y-6">
               <h4 className="font-black text-red-900 text-lg">التفويض والتوقيعات النهائية:</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <label className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-red-100 cursor-pointer hover:shadow-sm transition">
                   <input 
                     type="checkbox" 
                     name="authorizationToPull" 
                     checked={formData.authorizationToPull} 
                     onChange={handleInputChange}
                     className="w-6 h-6 accent-red-950" 
                  />
                   <span className="font-bold text-sm">تفويض سحب الإذن (خانة اختيار)</span>
                 </label>
                 <div className="md:col-span-2">
                   <div className="mb-3 flex flex-wrap gap-2">
                     <button
                       type="button"
                       onClick={() => setActiveNotarySlot('adoul1')}
                       className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                         activeNotarySlot === 'adoul1'
                           ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                           : 'border-slate-200 bg-white text-slate-600'
                       }`}
                     >
                       {primarySlotLabel}
                     </button>
                     <button
                       type="button"
                       onClick={() => hasDualNotaryPair && setActiveNotarySlot('adoul2')}
                       disabled={!hasDualNotaryPair}
                       className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                         activeNotarySlot === 'adoul2'
                           ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                           : 'border-slate-200 bg-white text-slate-600'
                       } ${!hasDualNotaryPair ? 'cursor-not-allowed opacity-50' : ''}`}
                     >
                       {secondarySlotLabel}
                     </button>
                   </div>
                   <WacomSignatureCapture
                     key={activeNotarySlot}
                     signerLabel={activeNotarySlot === 'adoul1' ? `التقاط توقيع ${primaryNotaryName}` : `التقاط توقيع ${secondaryNotaryName}`}
                     previewTargetRef={printablePreviewRef}
                     existingSignatureDataUrl={
                       activeNotarySlot === 'adoul1'
                         ? adoul1Signature?.signatureDataUrl || null
                         : adoul2Signature?.signatureDataUrl || null
                     }
                     disabled={activeNotarySlot === 'adoul2' && !hasDualNotaryPair}
                     onSave={async (payload) => handleFinalSignatureSave(payload)}
                   />
                 </div>
                 <div className="md:col-span-2 rounded-2xl border border-red-100 bg-white p-4 text-sm font-bold text-slate-700">
                   <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                     <span>
                       التوقيع الجاري: {activeNotarySlot === 'adoul1' ? primaryNotaryName : secondaryNotaryName}
                     </span>
                     <span className={hasBothNotarySignatures ? 'text-emerald-700' : 'text-amber-700'}>
                       {hasBothNotarySignatures ? 'تم حفظ التوقيعين بنجاح' : `عدد التوقيعات المحفوظة: ${(adoul1Signature ? 1 : 0) + (adoul2Signature ? 1 : 0)} / 2`}
                     </span>
                   </div>
                   <p className="mt-2 text-slate-500">
                     بعد حفظ التوقيع الأول من الزر الأخضر على جهاز Wacom سيتم الانتقال تلقائياً إلى التوقيع الثاني.
                   </p>
                   {!hasDualNotaryPair && (
                     <p className="mt-2 text-rose-700">
                       يجب تفعيل الشريك الثاني من لوحة العدل حتى تتمكن من التقاط التوقيع الثاني لهذا الطلب.
                     </p>
                   )}
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-8 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
        {step > 1 && (
          <button 
            onClick={prevStep}
            className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
          >
            السابق
          </button>
        )}
        
        {step < totalSteps ? (
          <button 
            onClick={nextStep}
            className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
          >
            المرحلة الموالية →
          </button>
        ) : (
              <button 
                onClick={handleGenerateAndSubmit}
                disabled={
                  extIsSubmitting ||
                  isGenerating ||
                  !hasBothNotarySignatures ||
                  !String(formData.judgeName || '').trim()
                }
                className={`flex-[2] px-8 py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all ${
                  (
                    extIsSubmitting ||
                    isGenerating ||
                    !hasBothNotarySignatures ||
                    !String(formData.judgeName || '').trim()
                  )
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-red-950 text-[#E6BE8A] hover:bg-red-900'
            }`}
          >
            {extIsSubmitting || isGenerating ? (
              <>
                <span className="animate-spin text-2xl">🌀</span>
                {isGenerating ? "جاري صياغة العقد..." : "جاري إرسال الطلب..."}
              </>
            ) : (
              <>
                <span>📤</span>
                صياغة العقد وإرسال الطلب للمحكمة
              </>
            )}
          </button>
        )}
        
        <button 
          onClick={onCancel}
          className="px-8 py-4 bg-white text-gray-400 rounded-2xl font-bold hover:text-red-600 transition"
        >
          إلغاء
        </button>
      </div>

      {genError && (
        <div className="px-8 py-4 bg-red-50 border-t border-red-100">
           <div className="flex items-center gap-3">
             <span className="text-xl">❌</span>
             <p className="text-sm text-red-700 font-bold">{genError}</p>
           </div>
        </div>
      )}

      {/* Intelligence Tooltips */}
      <div className="px-8 py-4 bg-blue-50/50 border-t border-blue-100">
         <div className="flex items-center gap-3">
           <span className="text-xl">💡</span>
           <p className="text-xs text-blue-700 font-bold">
             تلميح ذكي: {step === 1 ? 'تأكد من اختيار القاضي المكلف إذا كنت تعرفه لتسريع المعالجة.' : step === 4 ? 'جميع الوثائق يجب أن تكون بصيغة PDF ومسحوبة ضوئياً بشكل جلي.' : 'يمكنك دائما العودة للخلف لتعديل البيانات قبل الإرسال النهائي.'}
           </p>
         </div>
      </div>
    </div>
  );
};

export default MarriagePermissionForm;
