import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  X 
} from 'lucide-react';

export const DecisionModal = ({ isOpen, onClose, type, onConfirm, name }: any) => {
    if (!isOpen) return null;
    
    const isApprove = type === 'approve';
    const isReject = type === 'reject';
    
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative bg-[#020617] w-full max-w-lg rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in duration-300">
                <div className={`p-10 text-center ${isApprove ? 'bg-emerald-500/10' : isReject ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-2xl ${isApprove ? 'bg-emerald-500 text-white' : isReject ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {isApprove ? <CheckCircle className="w-12 h-12" /> : isReject ? <XCircle className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 font-amiri">تاكيد القرار النهائي</h3>
                    <p className="text-slate-400 text-lg font-bold">للرسم الخاص بـ: <span className="text-white">{name}</span></p>
                </div>
                
                <div className="p-10 space-y-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-right">
                        <p className="text-white font-bold leading-relaxed mb-4">
                            {isApprove 
                                ? "هل تؤكد تضمين هذا الرسم نهائياً؟ بعد هذه الخطوة سيتم قفل الرسم، منحه رقم تضمين رسمي، وحفظه في الأرشيف غير القابل للحذف."
                                : "برجاء توضيح سبب اتخاذ هذا القرار ليتم إرساله للموثق المختص."}
                        </p>
                        {!isApprove && (
                            <textarea 
                                placeholder="اكتب السبب هنا..."
                                className="w-full bg-[#0f172a] border border-white/10 rounded-2xl p-4 text-white resize-none h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={onConfirm}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-xl transition-all active:scale-95 shadow-2xl ${isApprove ? 'bg-emerald-600 text-white hover:bg-emerald-500' : isReject ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                        >
                            تأكيد القرار نهائياً
                        </button>
                        <button onClick={onClose} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">تراجع</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
