import React, { useState, useEffect } from 'react';

interface OfficeMovementFormProps {
  notaryData: {
    fullName: string;
    professionalNumber: string;
    officeNumber: string;
    jurisdiction: string;
    appointmentDecreeNumber: string;
    appointmentDate: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface Party {
  id: string;
  name: string;
  idCard: string;
  role: string;
  phone: string;
}

const OfficeMovementForm: React.FC<OfficeMovementFormProps> = ({
  notaryData,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  const [fileNumber] = useState(`EXT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // Status Simulation
  const [notaryStatus, setNotaryStatus] = useState<'active' | 'suspended' | 'retired'>('active');

  const [formData, setFormData] = useState({
    // Step 1: Identification
    fullName: notaryData.fullName,
    rentalNumber: 'RNT-2024-88', // Placeholder for "رقم التأجير"
    professionalNumber: notaryData.professionalNumber,
    appointmentDecreeNumber: notaryData.appointmentDecreeNumber,
    court: notaryData.jurisdiction || '',
    contact: '0661223344', // Placeholder
    
    // Step 2: Visit Details
    targetCourt: notaryData.jurisdiction || '',
    receptionPlace: '',
    receptionDate: new Date().toISOString().split('T')[0],
    receptionTime: '10:00',
    reasonForMovement: '',
    coordinates: '', // For map
    
    // Step 3: Parties
    parties: [] as Party[],
    
    // Step 4: Deed Type
    certificateType: '',
    subType: '',
    isMinorInvolved: false,
    
    // Step 5: Attachments
    attachments: [] as File[],
    notes: '',
    recipientType: 'judge' as 'judge' | 'regional_council' | 'both',
  });

  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const newAlerts = [];
    
    // 1. Jurisdiction check
    if (formData.targetCourt && formData.targetCourt !== notaryData.jurisdiction) {
      newAlerts.push('⚠️ تنبيه: العنوان المختار يقع خارج النفوذ الترابي المعتاد (عدم الاختصاص محلياً).');
    }

    // 2. Nighttime check
    const hour = parseInt(formData.receptionTime.split(':')[0]);
    if (hour < 8 || hour > 18) {
      newAlerts.push('⚠️ تنبيه: التوقيت المختار ليلي (خارج أوقات العمل الرسمية)، يتطلب تعليلاً خاصاً.');
    }

    // 3. Status check
    if (notaryStatus === 'suspended') {
      newAlerts.push('🛑 تحذير: حالة العدول حالياً "موقوف"، لا يمكن تقديم الطلب.');
    } else if (notaryStatus === 'retired') {
        newAlerts.push('🛑 تحذير: العدول متجاوز لسن التقاعد.');
    }

    setAlerts(newAlerts);
  }, [formData.targetCourt, formData.receptionTime, notaryStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addParty = () => {
    const newParty: Party = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      idCard: '',
      role: 'بائع',
      phone: ''
    };
    setFormData(prev => ({ ...prev, parties: [...prev.parties, newParty] }));
  };

  const updateParty = (id: string, field: keyof Party, value: string) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const removeParty = (id: string) => {
    setFormData(prev => ({ ...prev, parties: prev.parties.filter(p => p.id !== id) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...Array.from(e.target.files!)] }));
    }
  };

  const nextStep = () => {
    if (step === 1 && (notaryStatus === 'suspended' || notaryStatus === 'retired')) {
        alert('لا يمكن المتابعة بسبب وضعية العدول.');
        return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden font-amiri" dir="rtl">
      {/* Header & Steps */}
      <div className="bg-gradient-to-r from-red-950 to-[#5a0c0b] p-8 text-white relative">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-[#E6BE8A] text-red-950 rounded-2xl flex items-center justify-center text-3xl shadow-lg">📋</div>
             <div>
                <h3 className="font-black text-2xl">تسجيل إشعار توجه جديد</h3>
                <p className="text-[#E6BE8A] font-bold">الرقم المرجعي: <span className="underline">{fileNumber}</span></p>
             </div>
          </div>
          <div className="text-left bg-white/10 px-6 py-2 rounded-2xl border border-white/20">
             <span className="text-xs font-black">المرحلة {step} / {totalSteps}</span>
          </div>
        </div>
        
        {/* Step Wizard Dots */}
        <div className="flex justify-between items-center gap-2 max-w-md mx-auto">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#E6BE8A]' : 'bg-white/20'}`} />
            ))}
        </div>
      </div>

      <div className="p-10">
        {/* Universal Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${a.includes('🛑') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'}`}>
                {a}
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h4 className="text-xl font-black text-slate-800 border-r-4 border-red-950 pr-4">🔹 1. البيانات التعريفية للعدل</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              <DetailField label="الاسم الكامل" value={formData.fullName} />
              <DetailField label="رقم التأجير" value={formData.rentalNumber} />
              <DetailField label="رقم قرار التعيين" value={formData.professionalNumber} />
              <DetailField label="الدائرة القضائية" value={formData.court} />
              <DetailField label="وسيلة الاتصال" value={formData.contact} />
              
              <div className="md:col-span-2 mt-4 p-4 bg-white rounded-2xl border flex items-center justify-between">
                 <span className="font-bold text-slate-500">الحالة المهنية الحالية:</span>
                 <select 
                    value={notaryStatus} 
                    onChange={(e) => setNotaryStatus(e.target.value as any)}
                    className="bg-slate-50 px-4 py-2 rounded-xl font-black text-xs border-0 ring-1 ring-slate-200"
                 >
                    <option value="active">نشط (عادي)</option>
                    <option value="suspended">موقوف (تأديبي)</option>
                    <option value="retired">متقاعد</option>
                 </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
             <h4 className="text-xl font-black text-slate-800 border-r-4 border-red-950 pr-4">🔹 2. بيانات التوجه الاستثنائي</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">التاريخ 📅</label>
                  <input type="date" name="receptionDate" value={formData.receptionDate} onChange={handleInputChange} className="input-styled" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">الساعة ⏰</label>
                  <input type="time" name="receptionTime" value={formData.receptionTime} onChange={handleInputChange} className="input-styled" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-700">العنوان الكامل المقصود 📍</label>
                  <div className="relative">
                    <input type="text" name="receptionPlace" value={formData.receptionPlace} onChange={handleInputChange} placeholder="أدخل العنوان بدقة أو استخدم الخريطة..." className="input-styled pr-12" />
                    <button className="absolute right-3 top-3 text-xl hover:scale-110 transition-transform">🌍</button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-700">سبب التلقي خارج المقر *</label>
                  <select name="reasonForMovement" value={formData.reasonForMovement} onChange={handleInputChange} className="input-styled">
                    <option value="">اختر السبب المبرر</option>
                    <option value="مرض">مرض أحد الأطراف</option>
                    <option value="عجز">عجز بدني</option>
                    <option value="مؤسسة سجنية">مؤسسة سجنية</option>
                    <option value="مستشفى">مستشفى / مصحة</option>
                    <option value="حالة استعجال">حالة استعجال قصوى</option>
                    <option value="أخرى">أخرى (مع ذكر التفصيل في الملاحظات)</option>
                  </select>
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
             <div className="flex justify-between items-center border-r-4 border-red-950 pr-4">
                <h4 className="text-xl font-black text-slate-800">🔹 3. بيانات الأطراف (التحقق الذكي)</h4>
                <button onClick={addParty} className="bg-red-950 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-800 transition-colors">➕ إضافة طرف</button>
             </div>
             
             <div className="space-y-4">
                {formData.parties.map((party, idx) => (
                    <div key={party.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 relative group">
                        <button onClick={() => removeParty(party.id)} className="absolute -top-2 -left-2 w-8 h-8 bg-white shadow-md border rounded-full invisible group-hover:visible text-red-500">✕</button>
                        <p className="font-black text-[10px] text-red-950 mb-3 uppercase opacity-50">الطرف رقم {idx + 1}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <input placeholder="الاسم الكامل" className="input-mini" value={party.name} onChange={(e) => updateParty(party.id, 'name', e.target.value)} />
                            <input placeholder="رقم البطاقة الوطنية" className="input-mini" value={party.idCard} onChange={(e) => updateParty(party.id, 'idCard', e.target.value)} />
                            <select className="input-mini" value={party.role} onChange={(e) => updateParty(party.id, 'role', e.target.value)}>
                                <option>بائع</option>
                                <option>مشتري</option>
                                <option>موكل</option>
                                <option>زوج</option>
                                <option>مشهود عليه</option>
                            </select>
                            <input placeholder="رقم الهاتف" className="input-mini" value={party.phone} onChange={(e) => updateParty(party.id, 'phone', e.target.value)} />
                        </div>
                    </div>
                ))}
                {formData.parties.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300">
                        <p className="text-slate-400 font-bold">لم يتم إضافة أي أطراف بعد</p>
                    </div>
                )}
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
             <h4 className="text-xl font-black text-slate-800 border-r-4 border-red-950 pr-4">🔹 4. نوع الإشهاد والذكاء القانوني</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700">تصنيف الإشهاد</label>
                    <select name="certificateType" value={formData.certificateType} onChange={handleInputChange} className="input-styled text-lg">
                        <option value="">اختر النوع...</option>
                        <option value="وكالة">إشهاد وكالة</option>
                        <option value="زواج">إشهاد زواج</option>
                        <option value="بيع">إشهاد بيع</option>
                        <option value="تصحيح">إشهاد تصحيح</option>
                        <option value="كفالة">إشهاد كفالة</option>
                        <option value="أخرى">غير ذلك</option>
                    </select>
                </div>
                
                {formData.certificateType === 'زواج' && (
                    <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100 animate-bounce-short">
                        <p className="text-emerald-800 font-black mb-2">⚖️ ذكاء قانوني (زواج):</p>
                        <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={formData.isMinorInvolved} 
                              onChange={(e) => setFormData(prev => ({ ...prev, isMinorInvolved: e.target.checked }))}
                              className="w-5 h-5 accent-emerald-600"
                            />
                            <label className="font-bold text-sm">هل يوجد أحد الأطراف قاصراً؟</label>
                        </div>
                        {formData.isMinorInvolved && (
                            <p className="mt-4 p-3 bg-white rounded-xl text-red-600 text-xs font-black border border-red-100">
                                ⚠️ تنبيه: إشهاد زواج قاصر يتطلب إذن قضائي مسبق من قاضي التوثيق.
                            </p>
                        )}
                    </div>
                )}
             </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
             <h4 className="text-xl font-black text-slate-800 border-r-4 border-red-950 pr-4">🔹 5. المرفقات والأثر الرقمي</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <p className="font-bold text-slate-500">الوثائق الداعمة (PDF/Image):</p>
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-red-950 transition-colors relative cursor-pointer">
                        <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <p className="text-4xl mb-2">📎</p>
                        <p className="font-black text-slate-400">اسحب الملفات هنا أو اضغط للرفع</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {formData.attachments.map((f, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold border">{f.name}</span>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                    <p className="text-[#E6BE8A] font-black mb-4">🖥️ البصمة الرقمية للطلب:</p>
                    <div className="space-y-2 text-xs opacity-80 font-mono">
                        <p>IP ADDR: 196.206.XX.XXX</p>
                        <p>TIMESTAMP: {new Date().toISOString()}</p>
                        <p>BROWSER: Webkit/Moz (Chrome 121)</p>
                    </div>
                    <div className="mt-10 pt-6 border-t border-white/10 text-center">
                        <p className="text-[10px] italic">سيتم تسجيل هذه البيانات فور الضغط على "تأكيد الإرسال"</p>
                    </div>
                </div>
             </div>

             {/* Recipient Selection Section */}
             <div className="mt-8 bg-white border-2 border-slate-100 p-8 rounded-[2rem] shadow-sm">
                <h5 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span>🏛️</span> تحديد وجهة الإشعار (Recipient):
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'judge', label: 'قاضي التوثيق', icon: '⚖️', desc: 'توجيه الإشعار للرقابة القضائية' },
                      { id: 'regional_council', label: 'المجلس الجهوي', icon: '🏛️', desc: 'إشعار الهيئة المهنية (المجلس الجهوي)' },
                      { id: 'both', label: 'كلاهما (القاضي والمجلس)', icon: '⚖️🏛️', desc: 'إشعار مزدوج للقضاء والهيئة معاً' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, recipientType: option.id as any })}
                        className={`p-6 rounded-2xl border-2 transition-all text-right group ${
                          formData.recipientType === option.id 
                            ? 'border-red-950 bg-red-950 text-white shadow-xl scale-[1.02]' 
                            : 'border-slate-100 bg-slate-50 hover:border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                            <span className={`text-3xl p-3 rounded-xl transition-all ${
                                formData.recipientType === option.id ? 'bg-white/10' : 'bg-white group-hover:bg-red-50'
                            }`}>{option.icon}</span>
                            <div>
                                <p className="font-black text-lg">{option.label}</p>
                                <p className={`text-[10px] font-bold ${
                                    formData.recipientType === option.id ? 'text-[#E6BE8A]' : 'text-slate-400'
                                }`}>{option.desc}</p>
                            </div>
                        </div>
                      </button>
                    ))}
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-amber-700 bg-amber-50 p-3 rounded-xl">
                    <span>ℹ️</span> 
                    بناءً على اختيارك، سيظهر هذا الإشعار في لوحة التحكم الخاصة بالجهة المعنية فور الإرسال.
                </div>
             </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-12 pt-8 border-t flex justify-between items-center">
          <button
            onClick={prevStep}
            className={`px-8 py-3 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all ${step === 1 ? 'invisible' : ''}`}
          >
            السابق
          </button>
          
          <div className="flex gap-4">
            <button
               onClick={onCancel}
               className="px-8 py-3 rounded-2xl font-black text-slate-400 hover:text-red-600 transition-all"
            >
                إلغاء
            </button>
            {step < totalSteps ? (
              <button
                onClick={nextStep}
                className="px-10 py-3 bg-red-950 text-[#E6BE8A] rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
              >
                المرحلة التالية
              </button>
            ) : (
              <button
                onClick={() => onSubmit(formData)}
                disabled={isSubmitting}
                className="px-12 py-3 bg-red-950 text-[#E6BE8A] rounded-2xl font-black shadow-lg hover:bg-red-900 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد وإرسال الإشعار'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .input-styled {
            width: 100%;
            padding: 0.75rem 1.25rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 1.25rem;
            font-weight: 700;
            outline: none;
            transition: all 0.2s;
        }
        .input-styled:focus {
            background: #ffffff;
            border-color: #450a0a;
            box-shadow: 0 0 0 4px rgba(69, 10, 10, 0.05);
        }
        .input-mini {
            width: 100%;
            padding: 0.5rem 1rem;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .animate-bounce-short {
            animation: bounce-short 1s ease-in-out infinite;
        }
        @keyframes bounce-short {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100">{value}</p>
  </div>
);

export default OfficeMovementForm;
