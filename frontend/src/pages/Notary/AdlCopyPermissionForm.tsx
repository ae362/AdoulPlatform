import React, { useMemo, useRef, useState } from 'react';
import { WacomSignatureCapture, type CapturedWacomSignature } from '../../components/WacomSignatureCapture';
import { PermissionJudgeSelector } from '../../components/PermissionJudgeSelector';

interface AdlCopyPermissionFormProps {
  notaryData: {
    fullName: string;
    professionalNumber: string;
    officeNumber: string;
    jurisdiction: string;
    appointmentDecreeNumber: string;
    appointmentDate: string;
  };
  previewComponent?: React.ComponentType<any>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const AdlCopyPermissionForm: React.FC<AdlCopyPermissionFormProps> = ({
  notaryData,
  previewComponent: PreviewComponent,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const printablePreviewRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(1);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    // Section 1: Applicant Data
    applicantFirstName: '',
    applicantLastName: '',
    idDocumentType: 'البطاقة الوطنية',
    idDocumentNumber: '',
    idCardFile: null as File | null,
    idCardBase64: '',
    civilStatusNumber: '',
    residencyCertNumber: '',
    issuingAuthority: '',
    fullAddress: '',
    dateOfBirth: '',
    profession: '',
    socialStatus: '',
    date: new Date().toISOString().split('T')[0], // Auto-fill current date
    judgeName: '',
    selectedJudgeUserId: '',

    // Section 2: Capacity
    requestFor: 'عن نفسي' as 'عن نفسي' | 'لفائدة الغير',
    beneficiaryName: '',
    legalRelationship: '',

    // Section 3: Subject
    documentType: 'نسخة' as 'نسخة' | 'نظير',

    // Section 4: Deed References (Repeatable)
    deeds: [
      {
        register: '',
        number: '',
        letter: '',
        page: '',
        countValue: '', // Changed from count to countValue
        date: new Date().toISOString().split('T')[0],
        authRef: ''
      }
    ],

    // Section 5: Legal Basis
    termsAccepted: false,
    finalSignatureData: null as CapturedWacomSignature | null,

    // Section 6: Attachments
    attachments: [
      {
        type: '',
        description: '',
        file: null as File | null,
        base64: ''
      }
    ]
  });

  const [prefilledText, setPrefilledText] = useState('');

  // Auto-generate the formal text
  useMemo(() => {
    const beneficiary = formData.requestFor === 'عن نفسي' 
      ? `${formData.applicantFirstName} ${formData.applicantLastName}`
      : formData.beneficiaryName;
    
    const deedRefs = formData.deeds.map(d => 
      `المضمن بدفتر ${d.register} رقم ${d.number} حرف ${d.letter} صحيفة ${d.page} عدد ${d.countValue} بتاريخ ${d.date}`
    ).join(' و');

    const text = `إلى السيد قاضي التوثيق

يشرفني أن أتقدم إلى سيادتكم بطلب استخراج ${formData.documentType} لفائدة
السيد(ة): ${beneficiary}
الحامل(ة) لـ ${formData.idDocumentType} رقم ${formData.idDocumentNumber} الصادرة من ${formData.issuingAuthority}
الساكن(ة) بـ ${formData.fullAddress}
المزداد(ة) بتاريخ ${formData.dateOfBirth}
وذلك بخصوص الرسم العدلي ${deedRefs}
وإذ أؤكد تقيدي بالمقتضيات القانونية الجاري بها العمل أرفق طلبي هذا بما يثبت أحقيتي في استخراج النسخة المطلوبة.

وتفضلوا بقبول فائق الاحترام والتقدير.`;
    
    setPrefilledText(text);
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setShowValidationErrors(false);
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      const required = [
        'applicantFirstName', 'applicantLastName', 'idDocumentNumber',
        'dateOfBirth', 'placeOfBirth', 'profession', 'socialStatus', 'fullAddress'
      ];
      const hasEmpty = required.some(field => !String((formData as any)[field] || '').trim());
      if (hasEmpty) {
        setShowValidationErrors(true);
        return false;
      }
    }
    if (currentStep === 2) {
      const hasInvalidDeed = formData.deeds.some(d => !d.register || !d.number || !d.page || !d.countValue || !d.date);
      const hasEmptyAttachment = formData.attachments.some(att => !att.type || !att.file);
      if (hasInvalidDeed || hasEmptyAttachment) {
        setShowValidationErrors(true);
        return false;
      }
    }
    setShowValidationErrors(false);
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
    setShowValidationErrors(false);
  };

  const addDeed = () => {
    setFormData(prev => ({
      ...prev,
      deeds: [...prev.deeds, { register: '', number: '', letter: '', page: '', countValue: '', date: new Date().toISOString().split('T')[0], authRef: '' }]
    }));
  };

  const updateDeed = (index: number, field: string, value: string) => {
    const newDeeds = [...formData.deeds];
    newDeeds[index] = { ...newDeeds[index], [field]: value };
    setFormData(prev => ({ ...prev, deeds: newDeeds }));
  };

  const removeDeed = (index: number) => {
    if (formData.deeds.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      deeds: prev.deeds.filter((_, i) => i !== index)
    }));
  };

  const addAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, { type: '', description: '', file: null, base64: '' }]
    }));
  };

  const updateAttachment = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newAttachments = [...prev.attachments];
      newAttachments[index] = { ...newAttachments[index], [field]: value };
      return { ...prev, attachments: newAttachments };
    });
  };

  const handleFileChange = async (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFormData(prev => {
        const newAttachments = [...prev.attachments];
        newAttachments[index] = { 
          ...newAttachments[index], 
          file: file, 
          base64: base64 
        };
        return { ...prev, attachments: newAttachments };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!String(formData.judgeName || '').trim()) {
      alert('يرجى اختيار القاضي الموجه إليه الطلب قبل الإرسال');
      return;
    }
    if (!formData.termsAccepted) {
      alert('يرجى التأكيد على صحة المعطيات وتحمل المسؤولية القانونية');
      return;
    }
    if (!formData.finalSignatureData) {
      alert('يرجى حفظ التوقيع الرقمي قبل إرسال الطلب');
      return;
    }
    onSubmit({
      ...formData,
      generatedText: prefilledText
    });
  };

  const handleFinalSignatureSave = async (signature: CapturedWacomSignature) => {
    setFormData((prev) => ({
      ...prev,
      finalSignatureData: signature,
    }));
  };

  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden font-amiri" dir="rtl">
      {/* Smart Progress Bar */}
      <div className="bg-slate-50 border-b border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-red-950">طلب استخراج نسخ الرسوم العدلية</h2>
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
        {/* Step 1: Applicant Identity */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-bold text-red-950">بيانات طالب استخراج النسخة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.applicantFirstName ? 'text-red-600' : 'text-gray-700'}`}>الاسم الشخصي</label>
                  <input
                    type="text"
                    name="applicantFirstName"
                    value={formData.applicantFirstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !formData.applicantFirstName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    required
                  />
                  {showValidationErrors && !formData.applicantFirstName && <p className="text-red-500 text-xs mt-1 font-bold">هذا الحقل مطلوب</p>}
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.applicantLastName ? 'text-red-600' : 'text-gray-700'}`}>الاسم العائلي</label>
                  <input
                    type="text"
                    name="applicantLastName"
                    value={formData.applicantLastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !formData.applicantLastName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    required
                  />
                  {showValidationErrors && !formData.applicantLastName && <p className="text-red-500 text-xs mt-1 font-bold">هذا الحقل مطلوب</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع الوثيقة</label>
                    <select
                      name="idDocumentType"
                      value={formData.idDocumentType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold"
                    >
                      <option value="البطاقة الوطنية">البطاقة الوطنية</option>
                      <option value="جواز السفر">جواز السفر</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.idDocumentNumber ? 'text-red-600' : 'text-gray-700'}`}>
                      {formData.idDocumentType === 'البطاقة الوطنية' ? 'رقم البطاقة الوطنية' : 'رقم جواز السفر'}
                    </label>
                    <input
                      type="text"
                      name="idDocumentNumber"
                      value={formData.idDocumentNumber}
                      onChange={handleInputChange}
                      placeholder={formData.idDocumentType === 'البطاقة الوطنية' ? 'أدخل رقم البطاقة الوطنية...' : 'أدخل رقم جواز السفر...'}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !formData.idDocumentNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      required
                    />
                    {showValidationErrors && !formData.idDocumentNumber && <p className="text-red-500 text-xs mt-1 font-bold">يرجى إدخال رقم الوثيقة</p>}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.dateOfBirth ? 'text-red-600' : 'text-gray-700'}`}>تاريخ الازدياد</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold transition-colors ${showValidationErrors && !formData.dateOfBirth ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !(formData as any).placeOfBirth ? 'text-red-600' : 'text-gray-700'}`}>مكان الازدياد</label>
                  <input
                    type="text"
                    name="placeOfBirth"
                    value={(formData as any).placeOfBirth || ''}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !(formData as any).placeOfBirth ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="أدخل مكان الازدياد..."
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.profession ? 'text-red-600' : 'text-gray-700'}`}>المهنة</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold transition-colors ${showValidationErrors && !formData.profession ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder="مثلا: تاجر، موظف..."
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.socialStatus ? 'text-red-600' : 'text-gray-700'}`}>الحالة العائلية</label>
                  <select
                    name="socialStatus"
                    value={formData.socialStatus}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !formData.socialStatus ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    required
                  >
                    <option value="">اختر الحالة</option>
                    <option value="عازب(ة)">عازب(ة)</option>
                    <option value="متزوج(ة)">متزوج(ة)</option>
                    <option value="مطلق(ة)">مطلق(ة)</option>
                    <option value="أرمل(ة)">أرمل(ة)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold mb-2 ${showValidationErrors && !formData.fullAddress ? 'text-red-600' : 'text-gray-700'}`}>العنوان الكامل</label>
                  <input
                    type="text"
                    name="fullAddress"
                    value={formData.fullAddress}
                    onChange={handleInputChange}
                    placeholder="أدخل العنوان السكني الكامل..."
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-950 outline-none transition-colors ${showValidationErrors && !formData.fullAddress ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                  />
                </div>
                <div className="md:col-span-2">
                  <PermissionJudgeSelector
                    judgeName={formData.judgeName}
                    selectedJudgeUserId={formData.selectedJudgeUserId}
                    onChange={({ judgeName, selectedJudgeUserId }) =>
                      setFormData((prev) => ({
                        ...prev,
                        judgeName,
                        selectedJudgeUserId: selectedJudgeUserId || '',
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={nextStep}
                className="bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
              >
                المرحلة الموالية: مراجع الرسم 
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Deed Details */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-bold text-red-950">مراجع الرسم المطلوب استخراجه</h3>
              </div>
              
              <div className="space-y-6 bg-slate-50 p-6 rounded-2xl">
                <div className="flex gap-8 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="documentType" 
                      value="نسخة" 
                      checked={formData.documentType === 'نسخة'} 
                      onChange={handleInputChange}
                      className="text-red-950"
                    />
                    <span className="font-bold">استخراج نسخة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="documentType" 
                      value="نظير" 
                      checked={formData.documentType === 'نظير'} 
                      onChange={handleInputChange}
                      className="text-red-950"
                    />
                    <span className="font-bold">استخراج نظير</span>
                  </label>
                </div>

                {formData.deeds.map((deed, index) => (
                  <div key={index} className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border transition-colors relative ${showValidationErrors && (!deed.register || !deed.number || !deed.page || !deed.countValue || !deed.date) ? 'bg-red-50 border-red-300 shadow-inner' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {formData.deeds.length > 1 && (
                      <button
                        onClick={() => removeDeed(index)}
                        className="absolute -top-2 -left-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-colors border border-red-200 shadow-sm z-10"
                        title="حذف الرسم"
                      >
                        ✕
                      </button>
                    )}
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${showValidationErrors && !deed.register ? 'text-red-600' : 'text-gray-400'}`}>دفتر</label>
                      <input 
                        type="text" value={deed.register} 
                        onChange={(e) => updateDeed(index, 'register', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm outline-none transition-colors"
                        placeholder="رقم الدفتر..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${showValidationErrors && !deed.number ? 'text-red-600' : 'text-gray-400'}`}>رقم</label>
                      <input 
                        type="text" value={deed.number} 
                        onChange={(e) => updateDeed(index, 'number', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm outline-none transition-colors"
                        placeholder="رقم الرسم..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">حرف</label>
                      <input 
                        type="text" value={deed.letter || ''} 
                        onChange={(e) => updateDeed(index, 'letter', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm outline-none transition-colors"
                        placeholder="أ / ب / ج..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${showValidationErrors && !deed.page ? 'text-red-600' : 'text-gray-400'}`}>صحيفة</label>
                      <input 
                        type="text" value={deed.page} 
                        onChange={(e) => updateDeed(index, 'page', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm outline-none transition-colors"
                        placeholder="رقم الصحيفة..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${showValidationErrors && !deed.countValue ? 'text-red-600' : 'text-gray-400'}`}>عدد</label>
                      <input 
                        type="text" value={deed.countValue} 
                        onChange={(e) => updateDeed(index, 'countValue', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm font-bold text-red-950 outline-none transition-colors"
                        placeholder="أدخل العدد..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${showValidationErrors && !deed.date ? 'text-red-600' : 'text-gray-400'}`}>تاريخ الرسم</label>
                      <input 
                        type="date" value={deed.date} 
                        onChange={(e) => updateDeed(index, 'date', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm font-bold text-red-900 outline-none transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 mb-1">مرجع التوثيق</label>
                      <input 
                        type="text" value={deed.authRef || ''} 
                        onChange={(e) => updateDeed(index, 'authRef', e.target.value)}
                        className="w-full border-b-2 border-slate-100 focus:border-red-950 rounded-none px-3 py-2 text-sm outline-none transition-colors"
                        placeholder="أدخل مرجع التوثيق (اختياري)"
                      />
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={addDeed}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-red-950 hover:text-red-950 transition"
                >
                  + إضافة رسم آخر
                </button>
              </div>

              {/* Attachments Section moved to Step 2 */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h4 className={`font-bold mb-4 flex items-center gap-2 ${showValidationErrors && formData.attachments.some(att => !att.type || !att.file) ? 'text-red-600' : 'text-red-950'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  إضافة المرفقات الضرورية (بطاقة التعريف، الوكالة...)
                </h4>
                <div className="space-y-4">
                  {formData.attachments.map((att, idx) => (
                    <div key={idx} className={`flex gap-4 items-center p-4 rounded-xl border transition-colors ${showValidationErrors && (!att.type || !att.file) ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <select 
                        value={att.type}
                        onChange={(e) => updateAttachment(idx, 'type', e.target.value)}
                        className={`bg-slate-50 border rounded-lg text-sm font-bold w-1/3 p-2 outline-none ${showValidationErrors && !att.type ? 'border-red-400' : 'border-slate-200'}`}
                        required
                      >
                        <option value="">نوع المرفق</option>
                        <option value="ID_CARD">بطاقة التعريف</option>
                        <option value="RASM">رسم</option>
                        <option value="CRIMINAL_RECORD">السجل العدلي</option>
                        <option value="AUTHORIZATION">وكالة / تفويض</option>
                        <option value="OTHER">وثيقة أخرى</option>
                      </select>
                      <div className="flex-1 space-y-4">
                        <div className="flex gap-4 items-center">
                          <input 
                            type="file" 
                            onChange={(e) => e.target.files?.[0] && handleFileChange(idx, e.target.files[0])}
                            className="flex-1 text-xs"
                          />
                        </div>

                        {att.type === 'RASM' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 mt-2">
                            <div className="col-span-3 text-red-950 font-bold text-sm mb-1 border-b border-red-200 pb-1 flex justify-between">
                              <span>تفاصيل الرسم المرفق:</span>
                              <span className="text-[10px] text-gray-500 font-normal">يجب ملء هذه البيانات لمطابقة الرسم المرفق</span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">دفتر</label>
                              <input 
                                type="text"
                                placeholder="رقم الدفتر"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[1] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[1] || ''}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">رقم</label>
                              <input 
                                type="text"
                                placeholder="رقم الرسم"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[2] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[2] || ''}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">حرف</label>
                              <input 
                                type="text"
                                placeholder="أ / ب / ج"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[3] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[3] || ''}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">صحيفة</label>
                              <input 
                                type="text"
                                placeholder="رقم الصحيفة"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[4] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[4] || ''}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">عدد</label>
                              <input 
                                type="text"
                                placeholder="أدخل العدد"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[5] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[5] || ''}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">تاريخ الرسم</label>
                              <input 
                                type="date"
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[6] = e.target.value;
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[6] || ''}
                              />
                            </div>
                            <div className="col-span-3">
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">نوع الرسم (الاستحقاق)</label>
                              <select 
                                className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none font-bold"
                                onChange={(e) => {
                                  const currentParts = (att.description || '||||||').split('|');
                                  currentParts[0] = e.target.value; // Store the specific rasm type in first part
                                  updateAttachment(idx, 'description', currentParts.join('|'));
                                }}
                                value={(att.description || '').split('|')[0] || ''}
                              >
                                <option value="">اختر نوع الرسم...</option>
                                <optgroup label="رسوم الزواج">
                                  <option value="زواج">زواج</option>
                                  <option value="زواج مختلط">زواج مختلط</option>
                                  <option value="رسم استمرار زواج">رسم استمرار زواج</option>
                                </optgroup>
                                <optgroup label="رسوم الطلاق">
                                  <option value="الاشهاد على الطلاق الاتفاقي">الاشهاد على الطلاق الاتفاقي</option>
                                </optgroup>
                                <optgroup label="رسوم الأملاك">
                                  <option value="ملكية">ملكية</option>
                                  <option value="حيازة">حيازة</option>
                                  <option value="بيع وشراء">بيع وشراء</option>
                                  <option value="هبة">هبة</option>
                                  <option value="صدقة">صدقة</option>
                                  <option value="رهن">رهن</option>
                                  <option value="مقاسمة">مقاسمة</option>
                                </optgroup>
                                <optgroup label="رسوم التركات">
                                  <option value="اراثة">اراثة</option>
                                  <option value="بيان فريضة">بيان فريضة</option>
                                  <option value="احصاء متروك">احصاء متروك</option>
                                </optgroup>
                                <optgroup label="رسوم أخرى">
                                  <option value="توكيل رسمي">توكيل رسمي</option>
                                  <option value="رسم الإقرار ببنوة">رسم الإقرار ببنوة</option>
                                  <option value="ثبوت نسب ببينة السماع">ثبوت نسب ببينة السماع</option>
                                  <option value="رسم إبراء من دين">رسم إبراء من دين</option>
                                  <option value="رسم اقرار بدين">رسم اقرار بدين</option>
                                  <option value="CUSTOM">أخرى (كتابة يدوية)</option>
                                </optgroup>
                              </select>
                            </div>
                            
                            {((att.description || '').split('|')[0] === 'CUSTOM' || !['زواج', 'زواج مختلط', 'رسم استمرار زواج', 'الاشهاد على الطلاق الاتفاقي', 'ملكية', 'حيازة', 'بيع وشراء', 'هبة', 'صدقة', 'رهن', 'مقاسمة', 'اراثة', 'بيان فريضة', 'احصاء متروك', 'توكيل رسمي', 'رسم الإقرار ببنوة', 'ثبوت نسب ببينة السماع', 'رسم إبراء من دين', 'رسم اقرار بدين', ''].includes((att.description || '').split('|')[0])) && (
                              <div className="col-span-3">
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">حدد نوع الرسم:</label>
                                <input 
                                  type="text"
                                  placeholder="اكتب نوع الرسم هنا..."
                                  className="w-full p-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-900 outline-none font-bold bg-white"
                                  onChange={(e) => {
                                    const currentParts = (att.description || '||||||').split('|');
                                    currentParts[0] = e.target.value;
                                    updateAttachment(idx, 'description', currentParts.join('|'));
                                  }}
                                  value={['CUSTOM'].includes((att.description || '').split('|')[0]) ? '' : (att.description || '').split('|')[0]}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(att.type === 'OTHER' || att.type === 'AUTHORIZATION') && (
                          <input 
                            type="text"
                            placeholder="وصف الوثيقة..."
                            className="w-full border-b border-gray-200 text-xs p-1 outline-none focus:border-red-900"
                            onChange={(e) => updateAttachment(idx, 'description', e.target.value)}
                            value={att.description || ''}
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        {idx === formData.attachments.length - 1 && (
                          <button onClick={addAttachment} className="text-red-950 font-black text-xl w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200">+</button>
                        )}
                        {formData.attachments.length > 1 && (
                          <button onClick={() => setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))} className="text-red-600 font-bold text-lg w-8 h-8 flex items-center justify-center bg-red-50 rounded-full hover:bg-red-100">×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {showValidationErrors && formData.attachments.some(att => !att.type || !att.file) && (
                  <p className="text-red-600 text-xs font-bold mt-2">يرجى اختيار نوع المرفق ورفع الملف الخاص به</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={prevStep}
                className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
              >
                السابق
              </button>
              <button 
                onClick={nextStep}
                className="flex-[2] bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
              >
                المرحلة الموالية: التأكيد 
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-lg font-bold text-red-950">التأكيد النهائي والمرفقات</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-8 mb-8">
                {/* Visual Preview */}
                <div className="bg-slate-50 border-2 border-slate-200 p-8 rounded-3xl overflow-hidden shadow-inner">
                  <h4 className="font-bold mb-6 text-slate-500 text-lg flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                    معاينة حية للوثيقة:
                  </h4>
                  <div ref={printablePreviewRef} className="bg-white border border-gray-100 rounded-xl overflow-auto min-h-[800px] shadow-sm p-4">
                    {PreviewComponent && (
                      <PreviewComponent 
                        data={{
                          documentType: formData.documentType,
                          fullAddress: formData.fullAddress,
                          idDocumentType: formData.idDocumentType,
                          idDocumentNumber: formData.idDocumentNumber,
                          beneficiaryName: formData.requestFor === 'عن نفسي' ? `${formData.applicantFirstName} ${formData.applicantLastName}` : formData.beneficiaryName,
                          requestFor: formData.requestFor,
                          legalRelationship: formData.legalRelationship,
                          deeds: formData.deeds,
                          applicantFirstName: formData.applicantFirstName,
                          applicantLastName: formData.applicantLastName,
                          civilStatusNumber: formData.civilStatusNumber,
                          residencyCertNumber: formData.residencyCertNumber,
                          dateOfBirth: formData.dateOfBirth,
                          placeOfBirth: (formData as any).placeOfBirth,
                          profession: formData.profession,
                          socialStatus: formData.socialStatus,
                          attachments: formData.attachments,
                          generatedText: prefilledText,
                          date: formData.date,
                          finalSignatureData: formData.finalSignatureData,
                        }}
                        notaryData={notaryData}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-r-4 border-amber-400 p-6 rounded-2xl">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={formData.termsAccepted}
                     onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                     className="w-6 h-6 text-red-950"
                   />
                   <span className="font-black text-red-950 text-lg">أقر بصحة المعطيات وأتحمل مسؤوليتها القانونية</span>
                 </label>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6">
                <PermissionJudgeSelector
                  judgeName={formData.judgeName}
                  selectedJudgeUserId={formData.selectedJudgeUserId}
                  onChange={({ judgeName, selectedJudgeUserId }) =>
                    setFormData((prev) => ({
                      ...prev,
                      judgeName,
                      selectedJudgeUserId: selectedJudgeUserId || '',
                    }))
                  }
                  helperText="اختر القاضي الآن قبل الإرسال النهائي. يمكنك تغييره من هذه الخطوة."
                />
              </div>

              <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                <h4 className="font-black text-red-900 mb-4">التوقيع الرقمي النهائي</h4>
                <WacomSignatureCapture
                  signerLabel="إمضاء طالب النسخة"
                  previewTargetRef={printablePreviewRef}
                  existingSignatureDataUrl={formData.finalSignatureData?.signatureDataUrl || null}
                  onSave={handleFinalSignatureSave}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={prevStep}
                className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
              >
                السابق
              </button>
              <button 
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !formData.termsAccepted || !formData.finalSignatureData || !String(formData.judgeName || '').trim()}
                className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-4 rounded-2xl font-black text-xl hover:bg-red-900 transition shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب النهائي '}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdlCopyPermissionForm;
