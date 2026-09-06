import React from 'react';
import { CheckCircle2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export interface ValidationItem {
  status: 'success' | 'warning' | 'error' | string;
  label: string;
  msg?: string;
}

export interface ValidationCardsProps {
  validations: ValidationItem[];
}

export const ValidationCards: React.FC<ValidationCardsProps> = ({ validations }) => {
  return (
    <>
      <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    بطاقات التحقق
                                </h3>
                                
                                <div className="space-y-4 pb-20">
                            {validations.map((item, i) => (
                                <div key={i} className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
                                    item.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 
                                    item.status === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
                                    'bg-red-50/50 border-red-100'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                            item.status === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 
                                            item.status === 'warning' ? 'bg-amber-100 border-amber-200 text-amber-600' : 
                                            'bg-red-100 border-red-200 text-red-600'
                                        }`}>
                                            {item.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                                             item.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                                             <XCircle className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-[15px]">{item.label}</h4>
                                            {item.msg && <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{item.msg}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
    </>
  );
};
