import React, { useRef, useState } from 'react';
import { WacomSignatureCapture, type CapturedWacomSignature } from '../../components/WacomSignatureCapture';
import { PermissionJudgeSelector } from '../../components/PermissionJudgeSelector';

interface NotaryData {
  fullName: string;
  professionalNumber: string;
  officeNumber?: string;
  officeAddress?: string;
  jurisdiction?: string;
  appointmentDecreeNumber?: string;
  appointmentDate?: string;
  courtName?: string;
  appellateCourt?: string;
  primaryCourt?: string;
  phone?: string;
}

interface IndividualReceptionPermissionFormProps {
  notaryData: NotaryData;
  onSubmit: (data: any, recipient: 'judge' | 'regional_council' | 'both') => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const IndividualReceptionPermissionForm: React.FC<IndividualReceptionPermissionFormProps> = ({
  notaryData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const professionalModelPreviewRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    certificateType: 'زواج',
    partiesNames: '',
    receptionLocation: 'المكتب',
    receptionDate: new Date().toISOString().split('T')[0],
    isSimultaneous: true,
    isDual: true,
    reasons: [] as string[],
    otherReason: '',
    declarations: {
      legalRules: false,
      limitToPermission: false,
      fullResponsibility: false,
    },
    serialNumber: `IND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    requestDate: new Date().toLocaleDateString('ar-MA'),
    receptionDate2: new Date().toISOString().split('T')[0], // For the two-date workflow
    attachments: [] as File[],
    notes: '',
    recipientType: 'judge' as 'judge' | 'regional_council' | 'both',
    judgeName: '',
    selectedJudgeUserId: '',
    finalSignatureData: null as CapturedWacomSignature | null,
  });

  const [showProfessionalModel, setShowProfessionalModel] = useState(false);

  // Logic: Decide if permission is required
  const needsPermission = !formData.isDual || (formData.isDual && !formData.isSimultaneous);

  const handleReasonToggle = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      reasons: prev.reasons.includes(reason)
        ? prev.reasons.filter(r => r !== reason)
        : [...prev.reasons, reason]
    }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      if (!formData.judgeName) newErrors.judgeName = 'اختيار القاضي مطلوب';
    }
    if (currentStep === 2) {
      if (!formData.partiesNames.trim()) newErrors.partiesNames = 'أسماء الأطراف مطلوبة';
    }
    if (currentStep === 3) {
      if (formData.reasons.length === 0 && !formData.otherReason.trim()) {
        newErrors.otherReason = 'يرجى تحديد سبب واحد على الأقل';
      }
    }
    if (currentStep === 4) {
      if (!formData.declarations.legalRules || !formData.declarations.limitToPermission || !formData.declarations.fullResponsibility) {
        newErrors.declarations = 'يجب الموافقة على جميع التصريحات للمتابعة';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(e.target.files!)]
      }));
    }
  };

  const isFormValid = () => {
    if (step === 2) {
      return formData.partiesNames.trim().length >= 3;
    }
    if (step === 3) {
      // RULE: Required reasoning (Checkboxes or detailed text)
      return formData.reasons.length > 0 || formData.otherReason.trim().length >= 5;
    }
    if (step === 4) {
      // Must accept all legal declarations
      return formData.declarations.legalRules && 
             formData.declarations.limitToPermission && 
             formData.declarations.fullResponsibility;
    }
    return true;
  };

  const handleFinalSignatureSave = async (signature: CapturedWacomSignature) => {
    setFormData((prev) => ({
      ...prev,
      finalSignatureData: signature,
    }));
  };

  const renderProfessionalModel = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-12 space-y-8 font-amiri text-right overflow-y-auto max-h-[90vh]" dir="rtl">
          <div
            ref={professionalModelPreviewRef}
            className="space-y-8"
          >
            <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
              <h3 className="text-2xl font-black underline decoration-double underline-offset-8">طلب الإذن بالتلقي الفردي وفق المادة 50 من القانون 16.22</h3>
              <p className="text-lg font-bold">إلى السيد قاضي التوثيق</p>
              {formData.judgeName && <p className="text-base font-bold">الأستاذ(ة): {formData.judgeName}</p>}
              <p className="text-lg font-bold">بـ: {notaryData.primaryCourt || notaryData.jurisdiction || '................'}</p>
            </div>

            <div className="space-y-6 text-xl leading-[2.5rem] text-slate-900">
              <p className="font-bold">سلام تام بوجود مولانا الإمام،</p>
              <p>وبعد،</p>
              <p>يشرفني أن أتقدم إلى سيادتكم بطلبي هذا بصفتي العدل: 
                 <span className="font-black"> {notaryData.fullName}</span>، رقم مهني <span className="font-black">{notaryData.professionalNumber}</span>،
                 المنتسب لـ <span className="font-black">{notaryData.appellateCourt || '................'}</span>،
                 والمزاول لمهامي بـ <span className="font-black">{notaryData.primaryCourt || notaryData.jurisdiction || '................'}</span>،
                 الكائن مكتبي العدلي بـ <span className="font-black">{notaryData.officeAddress || notaryData.primaryCourt || notaryData.jurisdiction || '................'}</span>،
              </p>
              <p>ألتمس من سيادتكم الإذن لي بتلقي شهادة <span className="font-black">{formData.certificateType}</span>، 
                 وذلك <span className="font-black">{formData.isDual ? 'في تاريخ مختلف عن رفيقي' : 'بصفة فردية'}</span>،
                 نظراً لـ <span className="font-black">{formData.reasons.join(' و ') || formData.otherReason}</span>،
                 وذلك طبقاً لمقتضيات المادة 50 من القانون رقم 16.22،
              </p>
              <p>مع التزامي التام باحترام الضوابط القانونية والتنظيمية الجاري بها العمل، وتحرير الشهادة في حدود الإذن الممنوح لي.</p>
              <p>وتفضلوا، السيد {formData.recipientType === 'regional_council' ? 'رئيس المجلس الجهوي' : 'القاضي'}، بقبول فائق الاحترام والتقدير.</p>
            </div>

            <div className="flex justify-between items-end pt-10 border-t border-slate-100">
               <div className="text-center">
                  <p>الإمضاء:</p>
                  <p className="font-black mt-4">{notaryData.fullName}</p>
                  <div className="w-32 h-16 border-2 border-dashed border-slate-200 rounded-lg mt-2 flex items-center justify-center overflow-hidden bg-white">
                    {formData.finalSignatureData?.signatureDataUrl ? (
                      <img src={formData.finalSignatureData.signatureDataUrl} alt="إمضاء العدل" className="h-14 w-full object-contain" />
                    ) : (
                      <span className="text-slate-300 italic">Signature / Seal</span>
                    )}
                  </div>
               </div>
               <div className="text-right">
                  <p>حرر بـ: {(notaryData.primaryCourt || notaryData.jurisdiction)?.replace(/المحكمة الابتدائية بـ|المحكمة الابتدائية|محكمة /g, '') || '................'}</p>
                  <p>بتاريخ: {formData.requestDate}</p>
               </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-orange-50 p-6">
            <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white p-5">
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
                helperText="اختر القاضي الآن قبل الإرسال النهائي. يمكنك تغييره من هذه النافذة مباشرة."
              />
            </div>
            <WacomSignatureCapture
              signerLabel="إمضاء العدل"
              previewTargetRef={professionalModelPreviewRef}
              existingSignatureDataUrl={formData.finalSignatureData?.signatureDataUrl || null}
              onSave={handleFinalSignatureSave}
            />
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => {
                if (!String(formData.judgeName || '').trim()) {
                  alert('يرجى اختيار القاضي الموجه إليه الطلب قبل الإرسال');
                  return;
                }
                setShowProfessionalModel(false);
                onSubmit(formData, formData.recipientType);
              }}
              disabled={!formData.finalSignatureData || !String(formData.judgeName || '').trim()}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all"
            >
              تأكيد وإرسال الطلب النهائي 📩
            </button>
            <button 
              onClick={() => setShowProfessionalModel(false)}
              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200"
            >
              تعديل البيانات
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 animate-fadeIn font-amiri" dir="rtl">
      {/* Smart Progress Bar */}
      <div className="bg-slate-50 border-b border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-red-950">طلب الإذن بالتلقي الفردي أو غير المتزامن</h2>
          <div className="text-sm font-bold text-gray-500 bg-white px-4 py-1 rounded-full border border-gray-100">
             المرحلة {step} من 4
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 h-full transition-all duration-500 shadow-[0_0_15px_rgba(251,146,60,0.8)]"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="p-10">
        {/* Step 1: Notary Data */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 pr-2">الاسم الكامل</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-slate-800">{notaryData.fullName}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 pr-2">الرقم المهني</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-slate-800 tracking-widest">{notaryData.professionalNumber}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 pr-2">محكمة الاستئناف</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-slate-800">{notaryData.appellateCourt || 'غير محدد'}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 pr-2">المحكمة الابتدائية</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-slate-800">{notaryData.primaryCourt || notaryData.jurisdiction || 'غير محدد'}</div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 pr-2">عنوان المكتب العدلي</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-bold text-slate-800 italic">{notaryData.officeAddress || notaryData.primaryCourt || notaryData.jurisdiction || 'غير محدد'}</div>
              </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
              <span className="text-3xl">ℹ️</span>
              <p className="text-xs font-bold text-blue-900 leading-relaxed">هذه البيانات تُسحب تلقائياً من ملفك المهني الموثق لدى الهيئة الوطنية لضمان صحة الطلب القانوني.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
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
            
            <div className="flex justify-end pt-6">
               <button 
                 onClick={() => {
                   if (validateStep(1)) setStep(2);
                 }}
                 className="bg-red-950 text-[#E6BE8A] px-12 py-4 rounded-2xl font-black text-xl hover:bg-red-900 transition shadow-xl"
               >
                 المرحلة الموالية
               </button>
            </div>
          </div>
        )}

        {/* Step 2: Certificate Data */}
        {step === 2 && (
          <div className="space-y-10 animate-in slide-in-from-left-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">نوع الشهادة موضوع التلقي</label>
                <select 
                  value={formData.certificateType}
                  onChange={(e) => setFormData({...formData, certificateType: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-600 transition-all"
                >
                  <option>زواج</option>
                  <option>طلاق</option>
                  <option>إراثة</option>
                  <option>إقرار (بيع، تنازل، الخ)</option>
                  <option>كفالة</option>
                  <option>شهادة حياة / إقامة</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">أطراف الشهادة (أسماء مختصرة)</label>
                <input 
                  name="partiesNames"
                  placeholder="Ex: كمال وأحمد..."
                  value={formData.partiesNames}
                  onChange={handleInputChange}
                  className={`w-full bg-slate-50 border-2 ${errors.partiesNames ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-600`}
                />
                {errors.partiesNames && <p className="text-red-600 text-[10px] mt-1 font-bold">{errors.partiesNames}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">مكان التلقي</label>
                <div className="flex gap-4">
                  {['المكتب', 'خارج المكتب'].map(loc => (
                    <button 
                      key={loc}
                      onClick={() => setFormData({...formData, receptionLocation: loc})}
                      className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${formData.receptionLocation === loc ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">تاريخ التلقي</label>
                <input 
                  type="date"
                  value={formData.receptionDate}
                  onChange={(e) => setFormData({...formData, receptionDate: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">ملاحظات إضافية (اختياري)</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-600"
                placeholder="أضف أي ملاحظات تود إرفاقها بالطلب..."
              />
            </div>

            {/* Smart Logic Toggles */}
            <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 space-y-8">
              <h3 className="font-black text-slate-900 border-r-4 border-orange-500 pr-3">المعايير الذكية لطلب الإذن</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800">هل التلقي زوجي؟</p>
                      <p className="text-[10px] font-bold text-slate-400">أي بحضور عدلين معاً أو في نفس الملف</p>
                    </div>
                    <button 
                      onClick={() => setFormData({...formData, isDual: !formData.isDual})}
                      className={`w-14 h-8 rounded-full relative transition-all ${formData.isDual ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isDual ? 'right-7' : 'right-1'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-800">هل التلقي متزامن؟</p>
                      <p className="text-[10px] font-bold text-slate-400">أي في نفس الجلسة والتوقيت</p>
                    </div>
                    <button 
                      disabled={!formData.isDual}
                      onClick={() => setFormData({...formData, isSimultaneous: !formData.isSimultaneous})}
                      className={`w-14 h-8 rounded-full relative transition-all ${!formData.isDual ? 'opacity-30 cursor-not-allowed' : ''} ${formData.isSimultaneous ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.isSimultaneous ? 'right-7' : 'right-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 ${needsPermission ? 'border-orange-500 bg-orange-50 shadow-inner' : 'border-emerald-500 bg-emerald-50 shadow-inner'}`}>
                  <span className="text-4xl">{needsPermission ? '🔐' : '✅'}</span>
                  <p className={`font-black ${needsPermission ? 'text-orange-950' : 'text-emerald-950'}`}>
                    {needsPermission ? 'الإذن القضائي مطلوب' : 'لا حاجة لطلب إذن'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500">
                    {needsPermission 
                      ? 'بناءً على اختيارك (تلقي فردي أو غير متزامن)، يستوجب القانون الحصول على إذن مسبق.'
                      : 'التلقي الزوجي المتزامن هو الأصل ولا يتطلب إذناً استثنائياً.'}
                  </p>
                </div>
              </div>

              {/* Explicit Date for Second Notary when Not Simultaneous */}
              {formData.isDual && !formData.isSimultaneous && (
                <div className="mt-8 p-8 bg-orange-100/50 rounded-[2.5rem] border border-orange-200 animate-in slide-in-from-top-2">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black">2</div>
                      <div>
                        <h4 className="font-black text-orange-900">تاريخ تلقي العدل الثاني (المتوقع)</h4>
                        <p className="text-[10px] font-bold text-orange-700/60 leading-tight">في حالة عدم تزامن التلقي، يجب تحديد المواعيد المختلف عليها.</p>
                      </div>
                   </div>
                   <input 
                      type="date"
                      value={formData.receptionDate2}
                      onChange={(e) => setFormData({...formData, receptionDate2: e.target.value})}
                      className="w-full bg-white border-2 border-orange-200 rounded-2xl p-6 font-black text-orange-900 outline-none focus:border-orange-600 shadow-sm"
                   />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Reasoning */}
        {step === 3 && (
          <div className="space-y-10 animate-in zoom-in-95">
            <div className="space-y-4">
               <h3 className="text-xl font-black text-slate-900">3. تعليل طلب التلقي (سبب الاستثناء)</h3>
               <p className="text-sm text-slate-500 font-bold">يرجى تحديد سبب واحد أو أكثر لطلب التلقي الفردي أو غير المتزامن.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'absent', label: 'تعذر حضور العدل الثاني', icon: '⛔' },
                { id: 'dates', label: 'اختلاف تواريخ التلقي', icon: '📅' },
                { id: 'health', label: 'مانع صحي طارئ', icon: '🚑' },
                { id: 'admin', label: 'مانع إداري أو مهني', icon: '🏛️' },
              ].map(reason => (
                <button 
                  key={reason.id}
                  onClick={() => handleReasonToggle(reason.label)}
                  className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 text-right shadow-sm ${formData.reasons.includes(reason.label) ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300 grayscale'}`}
                >
                  <span className="text-3xl">{reason.icon}</span>
                  <span className="font-black text-slate-900">{reason.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-10 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 pr-2 uppercase italic flex items-center gap-2">
                <span>✍️</span> سبب آخر أو تفاصيل إضافية (إلزامي في حال عدم اختيار سبب أعلاه)
              </label>
              <textarea 
                placeholder="أدخل التعليل هنا في حالة وجود أسباب أخرى..."
                value={formData.otherReason}
                name="otherReason"
                onChange={handleInputChange}
                className={`w-full bg-slate-50 border-2 ${errors.otherReason ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-3xl p-8 font-bold outline-none focus:border-blue-600 min-h-[150px]`}
              />
              {errors.otherReason && <p className="text-red-500 text-[10px] font-black animate-pulse pr-4">{errors.otherReason}</p>}
            </div>
          </div>
        )}

        {/* Step 4: Declarations and Attachments */}
        {step === 4 && (
          <div className="space-y-10 animate-in slide-in-from-bottom-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Declarations */}
              <div className="bg-amber-50 p-8 rounded-[3rem] border border-amber-200 space-y-6">
                <h3 className="text-xl font-black text-amber-950 flex items-center gap-3">
                  <span>⚖️</span>
                  التصريحات القانونية
                </h3>
                
                <div className={`space-y-4 ${errors.declarations ? 'p-4 border border-red-500 rounded-3xl bg-red-50' : ''}`}>
                  <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-amber-100 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.declarations.legalRules}
                      onChange={(e) => {
                        setFormData({...formData, declarations: {...formData.declarations, legalRules: e.target.checked}});
                        if (errors.declarations) setErrors(prev => { const n={...prev}; delete n.declarations; return n; });
                      }}
                      className="w-6 h-6 accent-amber-600 mt-1" 
                    />
                    <div>
                      <p className="font-black text-xs text-slate-900">أصرح بأن التلقي سيتم وفق الضوابط القانونية المعمول بها</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">أتحمل مسؤولية مطابقة التلقي الفردي لمقتضيات المادة 50.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-amber-100 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.declarations.limitToPermission}
                      onChange={(e) => {
                        setFormData({...formData, declarations: {...formData.declarations, limitToPermission: e.target.checked}});
                        if (errors.declarations) setErrors(prev => { const n={...prev}; delete n.declarations; return n; });
                      }}
                      className="w-6 h-6 accent-amber-600 mt-1" 
                    />
                    <div>
                      <p className="font-black text-xs text-slate-900">ألتزم بتحرير الشهادة في حدود الإذن الممنوح فقط</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">أي تجاوز لنطاق الإذن يعتبر باطلاً مهنياً.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-amber-100 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.declarations.fullResponsibility}
                      onChange={(e) => {
                        setFormData({...formData, declarations: {...formData.declarations, fullResponsibility: e.target.checked}});
                        if (errors.declarations) setErrors(prev => { const n={...prev}; delete n.declarations; return n; });
                      }}
                      className="w-6 h-6 accent-amber-600 mt-1" 
                    />
                    <div>
                      <p className="font-black text-xs text-slate-900">أتحمل مسؤوليتي المهنية والمدنية كاملة</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">عن كل خلل ناتج عن هذا الاستثناء في التلقي.</p>
                    </div>
                  </label>
                </div>
                {errors.declarations && <p className="text-red-600 text-[10px] mt-1 font-bold pr-4">{errors.declarations}</p>}
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 space-y-6">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <span>📎</span> المرفقات (اختياري)
                 </h3>
                 <div className="space-y-4">
                    <div 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="border-4 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                       <span className="text-4xl group-hover:scale-110 transition-transform">📤</span>
                       <p className="font-black text-slate-400">تحميل شهادة طبية أو وثيقة مانع</p>
                       <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                    </div>
                    
                    {formData.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.attachments.map((file, i) => (
                          <div key={i} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-blue-600 flex items-center gap-2">
                             <span>📄</span> {file.name.substring(0, 10)}...
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Smart Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!formData.isSimultaneous && formData.isDual && (
                <div className="bg-orange-100 p-4 rounded-2xl border border-orange-200 text-orange-900 flex items-center gap-3 text-xs font-bold animate-pulse">
                  <span>🟠</span> تنبيه: التلقي في تاريخ مختلف يتطلب إذن االاستثناء وفق المادة 50.
                </div>
              )}
              {['زواج', 'طلاق'].includes(formData.certificateType) && (
                <div className="bg-red-100 p-4 rounded-2xl border border-red-200 text-red-900 flex items-center gap-3 text-xs font-bold">
                  <span>🔴</span> تنبيه: شهادة {formData.certificateType} تعتبر من الشهادات الحساسة التي تخضع لرقابة قضائية مشددة.
                </div>
              )}
            </div>

            {/* Recipient Selection */}
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-1/3 h-full bg-white/5 -skew-x-12 -mr-10"></div>
                
                <div className="relative z-10">
                  <h4 className="text-xl font-black mb-4 flex items-center gap-2">وجهة الطلب 🏛️</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'judge', label: 'قاضي التوثيق', icon: '⚖️' },
                      { id: 'regional_council', label: 'المجلس الجهوي', icon: '🏛️' },
                      { id: 'both', label: 'كلاهما (القاضي والمجلس)', icon: '⚖️🏛️' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, recipientType: option.id as any })}
                        className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 text-right shadow-sm ${
                          formData.recipientType === option.id 
                            ? 'border-blue-500 bg-blue-600/20' 
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                        }`}
                      >
                        <span className="text-3xl">{option.icon}</span>
                        <span className="font-black">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 pt-8 mt-8">
                  <div>
                    <h4 className="text-xl font-black mb-1 flex items-center gap-2">جاهز للإرسال الرقمي 📩 <span className="bg-emerald-500 text-emerald-950 text-[8px] px-2 py-0.5 rounded-full">قيد الإرسال</span></h4>
                    <p className="text-xs text-slate-400 max-w-sm font-bold leading-relaxed">بمجرد الإرسال، سيتوفر سجل زمني (Audit Log) لتتبع مراحل معالجة الطلب من طرف {formData.recipientType === 'both' ? 'الجهتين' : formData.recipientType === 'regional_council' ? 'المجلس الجهوي' : 'قاضي التوثيق'}.</p>
                  </div>
                  <div className="text-center bg-white/10 px-6 py-4 rounded-2xl border border-white/20">
                     <p className="text-[8px] font-black uppercase text-blue-400 tracking-[0.3em]">TIMESTAMP</p>
                     <p className="text-sm font-black tracking-widest leading-none">{new Date().toLocaleTimeString('ar-MA')}</p>
                     <p className="text-[8px] font-bold text-slate-500 mt-1">{new Date().toLocaleDateString('ar-MA')}</p>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-12 flex justify-between border-t border-slate-100 pt-10">
          <button 
            type="button"
            onClick={step === 1 ? onCancel : () => setStep(step - 1)}
            className="px-12 py-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition-all active:scale-95"
          >
            {step === 1 ? 'إلغاء' : 'السابق'}
          </button>
          
          <button 
            type="button"
            onClick={() => {
              if (validateStep(step)) {
                if (step < 4) {
                  setStep(step + 1);
                } else {
                  setShowProfessionalModel(true);
                }
              }
            }}
            disabled={isSubmitting}
            className={`px-16 py-5 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center gap-3 bg-orange-600 text-white hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? <span className="animate-spin text-xl">⏳</span> : <span>{step === 4 ? 'توليد ومراجعة الطلب المهني 📁' : 'متابعة'}</span>}
            {step < 4 && !isSubmitting && <span className="">←</span>}
          </button>
        </div>
      </div>
      {showProfessionalModel && renderProfessionalModel()}
    </div>
  );
};
