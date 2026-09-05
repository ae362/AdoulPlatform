import React from 'react';

interface AdlCopyPermissionApprovalTemplateProps {
  notification: any;
  decision: any;
  data?: any; // Added this to handle parsed data from parent
  annotation: {
    status: 'approved' | 'rejected';
    reasoning: string;
    date: string;
    regNumber: string;
    judgeName?: string;
  };
}

export const AdlCopyPermissionApprovalTemplate: React.FC<AdlCopyPermissionApprovalTemplateProps> = ({ 
  notification, 
  annotation,
  data: passedData
}) => {
  const isApproved = annotation.status === 'approved';
  
  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية)\s*/, '').trim();
  };

  // Use passedData if available (parsed by parent), otherwise try to parse notification.data
  const effectiveData = passedData || (typeof notification?.data === 'string' ? JSON.parse(notification.data) : notification?.data) || {};

  // Helper to extract data from multiple possible structures
  const deedData = effectiveData.deeds?.[0] || {};
  const registryType = effectiveData.registryType || deedData.register || '..........';
  const registryNumber = effectiveData.registryNumber || deedData.number || '..........';
  const deedNumber = effectiveData.deedNumber || deedData.countValue || deedData.count || '..........';
  const pageNumber = effectiveData.pageNumber || deedData.page || '..........';
  const copyType = effectiveData.copyType || effectiveData.documentType || 'نسخة';
  const deedType = effectiveData.deedType || effectiveData.involvedNames || notification.involved_names || '..........';

  return (
    <div 
      className="bg-white rounded-sm shadow-2xl border-[8px] border-double border-slate-100 p-8 md:p-12 max-w-4xl mx-auto space-y-6 font-amiri relative text-right print:shadow-none print:border-slate-300 print:p-6"
      dir="rtl"
    >
      {/* Official Header */}
      <div className="flex justify-between items-start border-b-2 border-double border-slate-900 pb-4 mb-4 print:pb-2 print:mb-2">
        <div className="text-center space-y-1 w-1/3">
          <p className="font-extrabold text-base print:text-sm">المملكة المغربية</p>
          <p className="font-extrabold text-base print:text-sm">وزارة العدل</p>
          <p className="font-bold text-sm print:text-xs">المحكمة الابتدائية بـ {formatCourtName(notification.jurisdiction || notification.target_court)}</p>
          <p className="font-black text-[10px] underline decoration-slate-400 underline-offset-2">قسم قضاء الأسرة</p>
        </div>
        <div className="flex flex-col items-center w-1/3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
            alt="Morocco Coat of Arms" 
            className="w-16 h-16 object-contain print:w-12 print:h-12"
          />
        </div>
        <div className="text-center space-y-0.5 w-1/3 pt-2">
          <p className="text-[10px] font-black">رقم السجل: {annotation.regNumber}</p>
          <p className="text-[10px] font-black">بتاريخ: {annotation.date}</p>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className={`text-2xl font-black underline decoration-double underline-offset-[10px] mb-4 print:text-xl print:mb-2 ${!isApproved ? 'text-red-900' : 'text-slate-900'}`}>
          إذن قضائي باستخراج {copyType || 'نسخة/نظير'} رسم عدلي
        </h2>
        <p className="text-lg font-black print:text-base">الحمد لله وحده</p>
      </div>

      <div className="space-y-4 text-lg leading-relaxed text-slate-900 px-6 print:px-2 print:text-sm print:space-y-2 print:leading-normal">
        <p>نحن القاضي المكلف بالتوثيق بالمحكمة الابتدائية بـ <span className="font-black underline underline-offset-4">{formatCourtName(notification.jurisdiction)}</span>،</p>
        
        <p>بناءً على الطلب المسجل تحت رقم <span className="font-black text-blue-900">{notification.request_number}</span>، المقدم من طرف السيد(ة) العدل:
          <br />
          <span className="font-black text-xl print:text-lg">{notification.notary_name}</span>،
        </p>

        <p>الذي يلتمس من خلاله الإذن له باستخراج <span className="font-black underline decoration-dotted">{copyType || 'نسخة'}</span> من الرسم العدلي المتعلق بـ <span className="font-black">{deedType || '..........'}</span>،
           المضمن بسجل <span className="font-bold">{registryType || '..........'}</span> رقم <span className="font-bold">{registryNumber || '..........'}</span>،
           عدد <span className="font-bold">{deedNumber || '..........'}</span>، ص <span className="font-bold">{pageNumber || '..........'}</span>.
        </p>

        {isApproved ? (
          <>
            <div className="text-center font-black text-2xl py-4 italic decoration-amber-600 underline underline-offset-[8px] print:py-2 print:text-xl">
              لهــــــــذه الأسبــــــــاب
            </div>
            
            {/* Annotation Summary in Document Body */}
            <div className="flex gap-4 items-start print:gap-2">
              <div className="flex-1 bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-100 font-bold leading-relaxed shadow-inner text-justify space-y-3 print:p-4 print:text-[10px] print:leading-tight">
                {annotation.reasoning && annotation.reasoning.includes('بعد الاطلاع على الطلب') ? (
                  <p className="text-base whitespace-pre-wrap leading-relaxed print:text-[11px]">
                    {annotation.reasoning.split(/(\bالتيقن\b|\bلا يمكن التوصل إلى حقه\b|\bدون مساس بحقوق الغير\b)/).map((part, i) => 
                      ['التيقن', 'لا يمكن التوصل إلى حقه', 'دون مساس بحقوق الغير'].includes(part) 
                      ? <span key={i} className="bg-amber-100 text-amber-900 px-1 rounded">{part}</span> 
                      : part
                    )}
                  </p>
                ) : (
                  <>
                    <p className="print:text-[11px]">
                      نأذن للسيد(ة) العدل مقدم(ة) الطلب باستخراج النسخة المطلوبة وتسليمها لمن له الحق فيها طبقاً للقانون، مع الإشارة إلى مراجع هذا الإذن بهامش الرسم الأصلي.
                    </p>
                    {annotation.reasoning && <p className="text-sm border-t pt-2 border-slate-200 opacity-80 italic">ملاحظات إضافية: {annotation.reasoning}</p>}
                  </>
                )}
              </div>
              
              {/* Paper-like Marginal Box for Annotation */}
              <div className={`w-56 border-2 ${isApproved ? 'border-emerald-600/30 bg-emerald-50/10' : 'border-rose-600/30 bg-rose-50/10'} border-dashed p-4 rounded-xl rotate-1 shadow-sm relative transition-colors duration-500 print:w-48 print:p-3`}>
                <div className={`absolute -top-2 right-4 bg-white px-2 py-0.5 text-[8px] font-black ${isApproved ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'} border uppercase rounded-full`}>
                   هامش التأشير
                </div>
                <div className={`space-y-3 font-amiri text-xs leading-tight ${isApproved ? 'text-emerald-900' : 'text-rose-900'}`}>
                  <div className="flex items-center gap-1 border-b border-white/50 pb-1">
                    <span className="text-base">{isApproved ? '✅' : '❌'}</span>
                    <p className="font-black text-xs">{isApproved ? 'تأشيرة بالموافقة' : 'تأشيرة بالرفض'}</p>
                  </div>
                  
                  <p className="italic text-[9px] font-bold text-justify leading-tight">
                    {isApproved 
                      ? '"بناء على ثبوت الصفة والمصلحة القانونية طبقا للتعليل الوارد في صلب هذا القرار، يؤشر بالموافقة."'
                      : '"نظراً لعدم استيفاء الشروط القانونية المطلوبة، يؤشر بالرفض."'
                    }
                  </p>

                  <div className="pt-1 space-y-0.5 border-t border-white/40 text-[9px]">
                    <div className="flex justify-between items-center">
                       <span className="opacity-60">التاريخ:</span>
                       <span className="font-bold">{new Date(annotation.date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <div className={`w-16 h-16 rounded-full border-2 ${isApproved ? 'border-emerald-200 bg-emerald-100/20' : 'border-rose-200 bg-rose-100/20'} flex flex-col items-center justify-center opacity-50`}>
                      <div className="text-[5px] font-black leading-none">PRIMARY COURT</div>
                      <div className="text-base mt-0.5">⚖️</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center font-black text-2xl py-6 italic decoration-red-600 underline underline-offset-[8px] print:py-2">
              لهــــــــذه الأسبــــــــاب
            </div>
            
            <div className="flex gap-4 items-start">
               <div className="flex-1 bg-red-50 p-6 rounded-[1.5rem] border-2 border-red-100 font-bold leading-relaxed shadow-inner text-red-950 text-justify print:text-[11px] print:p-4">
                  نقرر عدم الاستجابة للطلب المذكور أعلاه نظراً لـ: <span className="font-black">{annotation.reasoning || 'عدم استيفاء الشروط القانونية المنصوص عليها في خطة العدالة'}</span>.
               </div>

               {/* Paper-like Marginal Box for Annotation (Refusal) */}
               <div className="w-56 border-2 border-rose-600/30 bg-rose-50/10 border-dashed p-4 rounded-xl -rotate-1 shadow-sm relative transition-colors duration-500 print:w-48 print:p-3">
                  <div className="absolute -top-2 right-4 bg-white px-2 py-0.5 text-[8px] font-black text-rose-700 border border-rose-200 border uppercase rounded-full">
                     هامش التأشير
                  </div>
                  <div className="space-y-3 font-amiri text-xs leading-tight text-rose-900">
                    <div className="flex items-center gap-1 border-b border-white/50 pb-1">
                       <span className="text-base">❌</span>
                       <p className="font-black text-xs">تأشيرة بالرفض</p>
                    </div>
                    
                    <p className="italic text-[9px] font-bold text-justify leading-tight">
                       "نظراً لعدم استيفاء الشروط القانونية المطلوبة أو انعدام الصفة، يؤشر بالرفض."
                    </p>

                    <div className="pt-1 border-t border-white/40 text-[9px]">
                       <div className="flex justify-between items-center text-[9px]">
                          <span className="opacity-60">التاريخ:</span>
                          <span className="font-bold">{new Date(annotation.date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                       </div>
                    </div>

                    <div className="flex justify-center pt-2">
                       <div className="w-16 h-16 rounded-full border-2 border-rose-200 bg-rose-100/20 flex flex-col items-center justify-center opacity-50">
                          <div className="text-[5px] font-black leading-none text-rose-800">PRIMARY COURT</div>
                          <div className="text-base mt-0.5">⚖️</div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>

      <div className="pt-8 flex justify-between items-end px-12 print:pt-4 print:px-4">
        <div className="text-center space-y-2">
          <div className="w-32 h-0.5 bg-slate-900 mx-auto opacity-50"></div>
          <p className="font-black text-base underline print:text-sm">توقيع القاضي</p>
          <div className="h-12 flex items-center justify-center -mt-6 pointer-events-none select-none opacity-30">
             <span className="font-serif italic text-2xl text-blue-900 -rotate-3 print:text-xl">Judge Electronic Sign</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1">
           <div className="w-16 h-16 bg-white border border-slate-200 p-1 shadow-sm rounded-lg flex items-center justify-center print:w-12 print:h-12">
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-0.5">
                 <div className="grid grid-cols-3 gap-0.5 w-full h-full">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className={`bg-white ${i % 3 === 0 ? 'opacity-100' : 'opacity-40'}`}></div>
                    ))}
                 </div>
              </div>
           </div>
           <p className="text-[7px] font-black text-slate-400 uppercase">Secured QR</p>
        </div>

        <div className="text-center space-y-1 opacity-20 pointer-events-none select-none">
          <div className="w-20 h-20 border-4 border-slate-300 rounded-full flex items-center justify-center font-black text-slate-300 text-3xl rotate-12 print:w-16 print:h-16 print:text-2xl">
            ختم
          </div>
        </div>
      </div>
    </div>
  );
};
