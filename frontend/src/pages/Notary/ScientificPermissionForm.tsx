import React, { useRef, useState } from 'react';
import { WacomSignatureCapture, type CapturedWacomSignature } from '../../components/WacomSignatureCapture';
import { ScientificDocumentView } from '../../components/ScientificDocumentView';
import { PermissionJudgeSelector } from '../../components/PermissionJudgeSelector';

interface ScientificPermissionFormProps {
  notaryData: {
    fullName: string;
    professionalNumber: string;
    officeNumber: string;
    jurisdiction: string;
    appointmentDate: string;
    appellateCourt: string;
  };
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const ScientificPermissionForm: React.FC<ScientificPermissionFormProps> = ({
  notaryData,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const printablePreviewRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    // Identity
    fullName: notaryData.fullName,
    professionalNumber: notaryData.professionalNumber,
    appointmentDate: notaryData.appointmentDate,
    officeNumber: notaryData.officeNumber || '',
    jurisdiction: notaryData.jurisdiction,

    // Specific Details
    certificateType: 'شهادة علمية/مثلية',
    companionAdoulName: '',
    involvedNames: '',
    applicantCapacity: '',
    reasonForMovement: '',
    
    // Tracking
    trackingNotificationNumber: '',
    trackingPermissionNumber: '',
    trackingDate: new Date().toISOString().split('T')[0],

    // Additional
    notes: '',
    judgeName: '',
    selectedJudgeUserId: '',
    finalSignatureData: null as CapturedWacomSignature | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.fullName) newErrors.fullName = 'الاسم الكامل مطلوب';
      if (!formData.professionalNumber) newErrors.professionalNumber = 'الرقم المهني مطلوب';
      if (!formData.judgeName) newErrors.judgeName = 'اختيار القاضي مطلوب';
    }
    if (currentStep === 2) {
      if (!formData.involvedNames) newErrors.involvedNames = 'اسم المعني بالأمر مطلوب';
      if (!formData.reasonForMovement) newErrors.reasonForMovement = 'موضوع الشهادة مطلوب';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      alert('يرجى ملء جميع الخانات الإجبارية');
      return;
    }
    if (!formData.finalSignatureData) {
      alert('يرجى حفظ التوقيع الرقمي قبل إرسال الطلب');
      return;
    }
    onSubmit({
      ...formData,
      requestedDuration: '1',
      durationUnit: 'يوم',
      recipientType: 'judge'
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
          <h2 className="text-2xl font-black text-red-950">طلب إذن بتلقي شهادة علمية/مثلية</h2>
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
        {/* Step 1: Notary Identity */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
                <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-bold text-red-950">بيانات العدل المشرف</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 outline-none`}
                    required
                  />
                  {errors.fullName && <p className="text-red-600 text-xs mt-1 font-bold">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الرقم المهني</label>
                  <input
                    type="text"
                    name="professionalNumber"
                    value={formData.professionalNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${errors.professionalNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 outline-none`}
                    required
                  />
                  {errors.professionalNumber && <p className="text-red-600 text-xs mt-1 font-bold">{errors.professionalNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ التعيين</label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">رقم المكتب</label>
                  <input
                    type="text"
                    name="officeNumber"
                    value={formData.officeNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">محكمة الاستئناف</label>
                      <input
                        type="text"
                        value={notaryData.appellateCourt || 'غير محدد'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-bold"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">المحكمة الابتدائية (دائرة الاختصاص)</label>
                      <input
                        type="text"
                        name="jurisdiction"
                        value={formData.jurisdiction}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-bold"
                        readOnly
                      />
                    </div>
                  </div>
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
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.judgeName;
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.judgeName && <p className="text-red-600 text-xs mt-1 font-bold">{errors.judgeName}</p>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              {onCancel && (
                <button 
                  onClick={onCancel}
                  className="ml-4 px-8 py-4 border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-lg hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
              )}
              <button 
                onClick={() => {
                  if (validateStep(1)) {
                    setStep(2);
                  }
                }}
                className="bg-red-950 text-[#E6BE8A] px-10 py-4 rounded-2xl font-black text-lg hover:bg-red-900 transition shadow-xl"
              >
                المرحلة الموالية 
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Certificate Details */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
              <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <h3 className="text-lg font-bold text-red-950">تفاصيل الطلب وموضوع الشهادة</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نوع الشهادة</label>
                <select
                  name="certificateType"
                  value={formData.certificateType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none font-bold"
                  required
                >
                  <option value="شهادة علمية/مثلية">شهادة علمية/مثلية</option>
                  <option value="شهادة علمية">شهادة علمية</option>
                  <option value="شهادة مثلية">شهادة مثلية</option>
                  <option value="شهادة نسب">شهادة نسب</option>
                  <option value="شهادة وفاة">شهادة وفاة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">لفائدة السيد(ة)</label>
                <input
                  type="text"
                  name="involvedNames"
                  value={formData.involvedNames}
                  onChange={handleInputChange}
                  placeholder="اسم المعني بالأمر"
                  className={`w-full px-4 py-3 border ${errors.involvedNames ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 outline-none`}
                  required
                />
                {errors.involvedNames && <p className="text-red-600 text-xs mt-1 font-bold">{errors.involvedNames}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم العدل الرفيق (اختياري)</label>
                <input
                  type="text"
                  name="companionAdoulName"
                  value={formData.companionAdoulName}
                  onChange={handleInputChange}
                  placeholder="أدخل اسم العدل الرفيق..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">صفة الطالب</label>
                <input
                  type="text"
                  name="applicantCapacity"
                  value={formData.applicantCapacity}
                  onChange={handleInputChange}
                  placeholder="مثال: المعني بالأمر / وكيل..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-950 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">موضوع الشهادة بالتفصيل</label>
                <textarea
                  name="reasonForMovement"
                  value={formData.reasonForMovement}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full px-4 py-3 border ${errors.reasonForMovement ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-red-950 outline-none`}
                  required
                />
                {errors.reasonForMovement && <p className="text-red-600 text-xs mt-1 font-bold">{errors.reasonForMovement}</p>}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
              >
                السابق
              </button>
              <button 
                onClick={() => {
                  if (validateStep(2)) {
                    setStep(3);
                  }
                }}
                className="flex-[2] bg-red-950 text-[#E6BE8A] px-8 py-4 rounded-2xl font-black text-xl hover:bg-red-900 transition shadow-xl"
              >
                توليد الوثيقة ومتابعة التوقيع
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-950">
              <div className="w-8 h-8 bg-red-950 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <h3 className="text-lg font-bold text-red-950">معاينة الوثيقة والتوقيع الرقمي</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                <div className="text-sm font-bold text-slate-500 mb-3">الوثيقة المولدة من المعطيات المدخلة</div>
                <div ref={printablePreviewRef} className="overflow-auto max-h-[760px] rounded-2xl border border-slate-100 bg-white">
                  <ScientificDocumentView data={formData} notaryData={notaryData} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-red-100 rounded-3xl p-6">
                  <h4 className="font-black text-red-900 mb-4">التوقيع النهائي</h4>
                  <WacomSignatureCapture
                    signerLabel="التوقيع النهائي"
                    previewTargetRef={printablePreviewRef}
                    existingSignatureDataUrl={formData.finalSignatureData?.signatureDataUrl || null}
                    onSave={handleFinalSignatureSave}
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                  <p className="font-black text-slate-800 mb-2">حالة الإرسال</p>
                  <p className="text-sm text-slate-500">
                    بعد ملء البيانات تم توليد الوثيقة تلقائياً، والآن يلزم حفظ توقيع واحد قبل الإرسال النهائي.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 px-8 py-4 border-2 border-red-950 text-red-950 rounded-2xl font-black text-lg hover:bg-white transition"
              >
                السابق
              </button>
              <button 
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !formData.finalSignatureData || !String(formData.judgeName || '').trim()}
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

export default ScientificPermissionForm;
