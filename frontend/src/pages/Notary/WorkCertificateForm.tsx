import React, { useRef, useState } from 'react';
import { WacomSignatureCapture, type CapturedWacomSignature } from '../../components/WacomSignatureCapture';
import { PermissionJudgeSelector } from '../../components/PermissionJudgeSelector';
import { WorkCertificateDocumentView } from '../../components/WorkCertificateDocumentView';

interface WorkCertificateFormProps {
  notaryData: {
    fullName: string;
    fullNameLat?: string;
    professionalNumber: string;
    officeNumber: string;
    jurisdiction: string;
    appellateCourt?: string;
    appointmentDecreeNumber: string;
    appointmentDate: string;
    cin?: string;
    taxId?: string;
    councilMemberId?: string;
    status?: string;
    officeAddress?: string;
    commune?: string;
    phone?: string;
    email?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const WorkCertificateForm: React.FC<WorkCertificateFormProps> = ({
  notaryData,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const printablePreviewRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 5; // Increased to 5 for preview
  
  const [fileNumber] = useState(`CT-WORK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0')}`);
  const [creationDate] = useState(new Date().toLocaleDateString('ar-MA'));

  const [formData, setFormData] = useState({
    // Step 1: General & Identity (Pre-filled mostly)
    court: notaryData.jurisdiction || '',
    appellateCourt: notaryData.appellateCourt || '',
    status: 'قيد الإعداد',
    fullName: notaryData.fullName,
    fullNameLat: notaryData.fullNameLat || '',
    professionalNumber: notaryData.professionalNumber,
    appointmentDate: notaryData.appointmentDate,
    appointmentDecreeNumber: notaryData.appointmentDecreeNumber,
    
    // Step 2: Administrative Info
    cin: notaryData.cin || '',
    taxId: notaryData.taxId || '',
    councilMemberId: notaryData.councilMemberId || '',
    employmentStatus: notaryData.status || 'مزاول',
    
    // Step 3: Contact Info
    officeAddress: notaryData.officeAddress || '',
    commune: notaryData.commune || '',
    phone: notaryData.phone || '',
    email: notaryData.email || '',

    // Step 4: Subject & Attachments
    certificateType: 'شهادة عمل عادية',
    customPurpose: '',
    legalArticles: ['المادة 14', 'المادة 44'],
    processingDeadline: '15 يوما',
    notes: '',
    judgeName: '',
    selectedJudgeUserId: '',
    termsAccepted: false,
    finalSignatureData: null as CapturedWacomSignature | null,
    attachments: {
      cinCopy: null as File | null,
      professionalIdCopy: null as File | null,
      purposeSupport: null as File | null,
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleTermsAcceptedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormData(prev => ({ ...prev, termsAccepted: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        attachments: { ...prev.attachments, [field]: e.target.files![0] }
      }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!String(formData.fullName || '').trim()) newErrors.fullName = 'الاسم الكامل مطلوب';
      if (!String(formData.professionalNumber || '').trim()) newErrors.professionalNumber = 'الرقم المهني مطلوب';
      if (!String(formData.court || '').trim()) newErrors.court = 'المحكمة الابتدائية مطلوبة';
      if (!String(formData.judgeName || '').trim()) newErrors.judgeName = 'اختيار القاضي مطلوب';
    }

    if (currentStep === 2) {
      if (!String(formData.cin || '').trim()) newErrors.cin = 'رقم البطاقة الوطنية مطلوب';
      if (!String(formData.employmentStatus || '').trim()) newErrors.employmentStatus = 'الحالة المهنية مطلوبة';
    }

    if (currentStep === 3) {
      if (!String(formData.officeAddress || '').trim()) newErrors.officeAddress = 'عنوان المكتب المهني مطلوب';
      if (!String(formData.phone || '').trim()) newErrors.phone = 'رقم الهاتف المهني مطلوب';
      if (!String(formData.email || '').trim()) {
        newErrors.email = 'البريد الإلكتروني المهني مطلوب';
      } else if (!/\S+@\S+\.\S+/.test(String(formData.email).trim())) {
        newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة';
      }
    }

    if (currentStep === 4) {
      if (!String(formData.certificateType || '').trim()) newErrors.certificateType = 'طبيعة الطلب مطلوبة';
      if (!formData.attachments.cinCopy) newErrors.cinCopy = 'نسخة بطاقة التعريف مطلوبة';
      if (!formData.attachments.professionalIdCopy) newErrors.professionalIdCopy = 'نسخة البطاقة المهنية مطلوبة';
    }

    if (currentStep === 5) {
      if (!String(formData.judgeName || '').trim()) newErrors.judgeName = 'اختيار القاضي مطلوب';
      if (!formData.termsAccepted) newErrors.termsAccepted = 'يلزم تأكيد صحة المعطيات';
      if (!formData.finalSignatureData) newErrors.finalSignatureData = 'يلزم حفظ التوقيع الرقمي';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleFinalSignatureSave = async (signature: CapturedWacomSignature) => {
    setFormData((prev) => ({
      ...prev,
      finalSignatureData: signature,
    }));
  };

  const handleSubmit = () => {
    if (!validateStep(5)) {
      alert('يرجى استكمال المعطيات الإلزامية قبل إرسال الطلب');
      return;
    }
    if (!formData.finalSignatureData) {
      alert('يرجى حفظ التوقيع الرقمي قبل إرسال الطلب');
      return;
    }
    onSubmit({ ...formData, fileNumber, creationDate });
  };

  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden font-amiri" dir="rtl">
      {/* Smart Progress Bar */}
      <div className="bg-slate-50 border-b border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-950 text-[#E6BE8A] rounded-xl flex items-center justify-center text-xl"></div>
             <h2 className="text-2xl font-black text-red-950">طلب شهادة عمل</h2>
          </div>
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
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-bold text-red-950">الهوية المهنية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل (عربي) *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold`} />
                  {errors.fullName && <p className="text-red-600 text-xs mt-1 font-bold">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل (لاتيني)</label>
                  <input type="text" name="fullNameLat" value={formData.fullNameLat} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الرقم المهني *</label>
                  <input type="text" name="professionalNumber" value={formData.professionalNumber} readOnly className={`w-full px-4 py-3 border ${errors.professionalNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl bg-gray-50 font-bold`} />
                  {errors.professionalNumber && <p className="text-red-600 text-xs mt-1 font-bold">{errors.professionalNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">المحكمة الابتدائية التابع لها *</label>
                  <input type="text" name="court" value={formData.court} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.court ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold`} />
                  {errors.court && <p className="text-red-600 text-xs mt-1 font-bold">{errors.court}</p>}
                </div>
                <div className="md:col-span-2">
                  <div className={`${errors.judgeName ? 'p-2 border border-red-500 bg-red-50 rounded-xl' : ''}`}>
                    <PermissionJudgeSelector
                      judgeName={formData.judgeName}
                      selectedJudgeUserId={formData.selectedJudgeUserId}
                      onChange={({ judgeName, selectedJudgeUserId }) => {
                        setFormData((prev) => ({
                          ...prev,
                          judgeName,
                          selectedJudgeUserId: selectedJudgeUserId || '',
                        }));
                        if (errors.judgeName) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.judgeName;
                            return next;
                          });
                        }
                      }}
                      label="القاضي الجهوي الموجه إليه الطلب"
                      helperText="اختر القاضي الذي سيعالج طلب شهادة العمل قبل متابعة الخطوات."
                    />
                  </div>
                  {errors.judgeName && <p className="text-red-600 text-xs mt-1 font-bold">{errors.judgeName}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-bold text-red-950">المعطيات الإدارية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم البطاقة الوطنية (CIN) *</label>
                  <input type="text" name="cin" value={formData.cin} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.cin ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold`} />
                  {errors.cin && <p className="text-red-600 text-xs mt-1 font-bold">{errors.cin}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الرقم الضريبي (IF)</label>
                  <input type="text" name="taxId" value={formData.taxId} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم الانخراط بالمجلس الجهوي</label>
                  <input type="text" name="councilMemberId" value={formData.councilMemberId} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الحالة المهنية *</label>
                  <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.employmentStatus ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold outline-none`}>
                    <option value="مزاول">مزاول</option>
                    <option value="في وضعية توقف">في وضعية توقف</option>
                    <option value="ملحق">ملحق</option>
                  </select>
                  {errors.employmentStatus && <p className="text-red-600 text-xs mt-1 font-bold">{errors.employmentStatus}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-lg font-bold text-red-950">العنوان ووسائل الاتصال</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">عنوان المكتب المهني *</label>
                  <input type="text" name="officeAddress" value={formData.officeAddress} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.officeAddress ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold`} />
                  {errors.officeAddress && <p className="text-red-600 text-xs mt-1 font-bold">{errors.officeAddress}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف المهني *</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold`} dir="ltr" />
                  {errors.phone && <p className="text-red-600 text-xs mt-1 font-bold">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني المهني *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold`} dir="ltr" />
                  {errors.email && <p className="text-red-600 text-xs mt-1 font-bold">{errors.email}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h3 className="text-lg font-bold text-red-950">موضوع الطلب والمرفقات</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">طبيعة الطلب *</label>
                  <select name="certificateType" value={formData.certificateType} onChange={handleInputChange} className={`w-full px-4 py-3 border ${errors.certificateType ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 font-bold outline-none`}>
                    <option value="شهادة عمل عادية">شهادة عمل عادية</option>
                    <option value="شهادة عمل للتقاعد أو التنقيل">شهادة عمل للتقاعد أو التنقيل</option>
                    <option value="شهادة عمل لأغراض خارجية">شهادة عمل لأغراض خارجية</option>
                  </select>
                  {errors.certificateType && <p className="text-red-600 text-xs mt-1 font-bold">{errors.certificateType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الغرض من الطلب</label>
                  <textarea name="customPurpose" value={formData.customPurpose} onChange={handleInputChange} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 font-bold outline-none" placeholder="أدخل الغرض من طلب هذه الشهادة (اختياري)..." />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-bold text-red-950 text-sm border-b pb-2">المرفقات الضرورية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-gray-500 mb-2">نسخة من بطاقة التعريف (CIN) *</label>
                      <input type="file" onChange={(e) => handleFileChange(e, 'cinCopy')} className="text-xs w-full" />
                      {errors.cinCopy && <p className="text-red-600 text-xs mt-2 font-bold">{errors.cinCopy}</p>}
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <label className="block text-xs font-bold text-gray-500 mb-2">نسخة من البطاقة المهنية *</label>
                      <input type="file" onChange={(e) => handleFileChange(e, 'professionalIdCopy')} className="text-xs w-full" />
                      {errors.professionalIdCopy && <p className="text-red-600 text-xs mt-2 font-bold">{errors.professionalIdCopy}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">5</div>
                <h3 className="text-lg font-bold text-red-950">معاينة الطلب والتوقيع الرقمي</h3>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
                  <div className="mb-4 flex items-center gap-2 text-slate-500 font-bold">
                    <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                    هذا النموذج يوضح كيف سيظهر طلبكم لدى القاضي:
                  </div>
                  <div ref={printablePreviewRef} className="bg-white border rounded-xl overflow-auto max-h-[640px] shadow-sm scale-95 origin-top">
                    <WorkCertificateDocumentView 
                      data={{ ...formData, fileNumber, creationDate }}
                      notaryData={notaryData}
                    />
                  </div>
                </div>

                <div className="bg-white border-2 border-red-100 rounded-3xl p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h4 className="font-black text-red-900 text-xl">لوحة التوقيع النهائي</h4>
                    <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                      خطوة إلزامية قبل الإرسال
                    </span>
                  </div>
                  <WacomSignatureCapture
                    signerLabel="التوقيع النهائي"
                    previewTargetRef={printablePreviewRef}
                    existingSignatureDataUrl={formData.finalSignatureData?.signatureDataUrl || null}
                    onSave={handleFinalSignatureSave}
                  />
                  {errors.finalSignatureData && <p className="text-red-600 text-xs mt-3 font-bold">{errors.finalSignatureData}</p>}
                </div>

                <div className="bg-amber-50 border-r-4 border-amber-400 p-6 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={handleTermsAcceptedChange}
                      className="w-6 h-6 text-red-950 cursor-pointer"
                    />
                    <span className="font-black text-red-950 text-lg">أقر بصحة المعطيات الواردة أعلاه وأتحمل مسؤوليتها</span>
                  </label>
                  {errors.termsAccepted && <p className="text-red-600 text-xs mt-2 font-bold">{errors.termsAccepted}</p>}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                  <p className="font-black text-slate-800 mb-2">حالة الإرسال</p>
                  <p className="text-sm text-slate-500">
                    بعد مراجعة الوثيقة، يلزم حفظ التوقيع الرقمي وتأكيد الإقرار قبل الإرسال النهائي.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-8">
          <button 
            type="button" 
            onClick={step === 1 ? onCancel : prevStep} 
            className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
          >
            {step === 1 ? 'إلغاء' : 'السابق'}
          </button>
          
          {step < totalSteps ? (
            <button 
              type="button" 
              onClick={nextStep} 
              className="flex-[2] bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
            >
              المرحلة الموالية 
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.finalSignatureData || !formData.termsAccepted}
              className="flex-[2] bg-red-950 text-[#E6BE8A] px-12 py-4 rounded-2xl font-black text-xl hover:bg-red-900 transition shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب النهائي '}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkCertificateForm;
