import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Scale, 
  FileSignature, 
  RotateCcw, 
  CheckCircle2, 
  PenTool, 
  ShieldCheck,
  Medal as AwardIcon,
  Building,
  AlertTriangle
} from 'lucide-react';

export const SignatureConfirmationModal = ({ isOpen, onClose, checks, setChecks, onConfirm, needsFiscal, rasmId, navigationState }: any) => {
    if (!isOpen) return null;
    const navigate = useNavigate();

    const allChecked = checks.accuracy && 
                       checks.judgeNotes && 
                       (!needsFiscal || checks.registration) && 
                       checks.finality;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#fdfcf0] w-full max-w-2xl rounded-[3rem] border-l-[12px] border-[#d9a36f] shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in duration-300">
                
                {/* Header */}
                <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-3xl font-black text-[#1e3a8a] flex items-center gap-4 font-amiri">
                        <span className="text-4xl">🔎</span> المراجعة النهائية قبل اعتماد الرسم
                    </h3>
                    
                    {/* Direct link to old signature for emergency / preference */}
                    <button 
                        onClick={() => navigate(`/ready-for-signature/${rasmId}`, { state: navigationState })}
                        className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition-all border border-slate-200"
                    >
                        الواجهة القديمة (تخطي)
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Section 1: Accuracy (Green) */}
                    <div className="flex gap-6 items-start bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-emerald-900">أولاً: الدقة والكمال الموضوعي</h4>
                            <p className="text-emerald-800 font-bold leading-relaxed text-lg">
                                نرجو التأكد بعناية من أن جميع خانات وحقول التضمين الإلكتروني قد تم ملؤها بشكل دقيق وكامل، وأن البيانات المدرجة تعكس حقيقة السند دون سهو أو نقص.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-emerald-600"
                                    checked={checks.accuracy}
                                    onChange={(e) => setChecks({ ...checks, accuracy: e.target.checked })}
                                />
                                <span className="text-emerald-800 font-black text-sm group-hover:text-emerald-900">أُقرّ بأنني قمت بمراجعة كافة بيانات التضمين والتأكد من اكتمالها وصحتها.</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 2: Judge Notes (Amber) */}
                    <div className="flex gap-6 items-start bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                            <AwardIcon className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-amber-900">ثانياً: مطابقة ملاحظات قاضي التوثيق</h4>
                            <p className="text-amber-800 font-bold leading-relaxed text-lg">
                                إذا كانت قد صدرت عن السيد قاضي التوثيق ملاحظات أو توجيهات بخصوص هذا الرسم، نلتمس منكم التأكد من إدراج جميع التصحيحات والإضافات التي تم التنبيه إليها.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-amber-600"
                                    checked={checks.judgeNotes}
                                    onChange={(e) => setChecks({ ...checks, judgeNotes: e.target.checked })}
                                />
                                <span className="text-amber-800 font-black text-sm group-hover:text-amber-900">أؤكد أنني راجعت ملاحظات قاضي التوثيق (أو لا توجد ملاحظات سابقة) وأدرجت ما يلزم.</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 3: Registration (Orange) - only if required */}
                    {needsFiscal && (
                        <div className="flex gap-6 items-start bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                                <Building className="w-7 h-7 text-white" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-black text-orange-900">ثالثاً: مراجعة إجراءات التسجيل المسبقة</h4>
                                <p className="text-orange-800 font-bold leading-relaxed text-lg">
                                    تبين أن هذا الرسم يندرج ضمن الرسوم الخاضعة لإجراءات التسجيل. وعليه، يرجى التحقق بعناية من استيفاء متطلبات التسجيل وفق الضوابط الجاري بها العمل.
                                </p>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-6 h-6 rounded-lg accent-orange-600"
                                        checked={checks.registration}
                                        onChange={(e) => setChecks({ ...checks, registration: e.target.checked })}
                                    />
                                    <span className="text-orange-800 font-black text-sm group-hover:text-orange-900">أؤكد أنني تحققت من خضوع الرسم لإجراءات التسجيل ومن دقة بياناته.</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Finality (Red) */}
                    <div className="flex gap-6 items-start bg-red-50/50 p-6 rounded-3xl border border-red-100">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                            <Scale className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xl font-black text-red-910">رابعاً: استيفاء المسؤولية المهنية</h4>
                            <p className="text-red-900 font-bold leading-relaxed text-lg">
                                يرجى العلم أن اعتماد الرسم للانتقال إلى مرحلة التوقيع سيجعله غير قابل للتعديل مستقبلاً، إلا عن طريق ملحق إضافي وفق الضوابط القانونية.
                            </p>
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg accent-red-600"
                                    checked={checks.finality}
                                    onChange={(e) => setChecks({ ...checks, finality: e.target.checked })}
                                />
                                <span className="text-red-800 font-black text-sm group-hover:text-red-900">أدرك أن أي تعديل لاحق سيتطلب ملحقاً إضافياً.</span>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-10 bg-slate-50 flex flex-col gap-6 border-t border-slate-100">
                    {!allChecked && (
                        <div className="flex items-center justify-center gap-3 py-3 px-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-pulse font-black text-sm">
                            <AlertTriangle className="w-5 h-5" />
                            <span>يرجى استكمال كافة تأكيدات المراجعة (تأكد من النزول لآخر القائمة)</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-6">
                        <button 
                            onClick={onClose}
                            className="px-8 py-4 text-slate-500 font-black text-lg hover:text-slate-800 transition-colors"
                        >
                            ⬅ العودة للمراجعة
                        </button>
                        
                        <button 
                            disabled={!allChecked}
                            onClick={onConfirm}
                            className={`flex-1 flex items-center justify-center gap-4 px-12 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl ${
                                allChecked 
                                ? 'bg-[#1e3a8a] text-white hover:bg-blue-800 hover:shadow-blue-500/30 ring-4 ring-blue-100' 
                                : 'bg-slate-300 text-slate-100 cursor-not-allowed'
                            }`}
                        >
                            <FileSignature className="w-6 h-6" />
                            اعتماد والانتقال للتوقيع السيادي
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
