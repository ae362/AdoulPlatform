import React from 'react';

interface ScientificPermissionApprovalTemplateProps {
  notification: any;
  decision: any;
  annotation: {
    status: 'approved' | 'rejected';
    reasoning: string;
    date: string;
    regNumber: string;
    judgeName?: string;
  };
}

export const ScientificPermissionApprovalTemplate: React.FC<ScientificPermissionApprovalTemplateProps> = ({ 
  notification, 
  annotation 
}) => {
  const isApproved = annotation.status === 'approved';
  
  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية)\s*/, '').trim();
  };

  const courtName = formatCourtName(notification.jurisdiction || notification.target_court);

  return (
    <div 
      className="bg-white rounded-sm shadow-2xl border-[12px] border-double border-emerald-50 p-16 max-w-4xl mx-auto space-y-8 font-amiri min-h-[1000px] relative text-right text-slate-900"
      dir="rtl"
    >
      {/* Official Header */}
      <div className="flex justify-between items-start border-b-4 border-double border-slate-900 pb-8 mb-4">
        <div className="text-right space-y-1 w-1/3">
          <p className="font-extrabold text-xl">المملكة المغربية</p>
          <p className="font-extrabold text-xl">وزارة العدل</p>
          <p className="font-bold text-lg">المحكمة الابتدائية بـ {courtName}</p>
          <p className="font-black text-sm">قسم التوثيق وشؤون القاصرين</p>
        </div>
        <div className="flex flex-col items-center w-1/3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
            alt="Morocco Coat of Arms" 
            className="w-24 h-24 object-contain"
          />
        </div>
        <div className="text-center space-y-1 w-1/3 pt-4">
          <p className="text-xs font-black">المرجع: {notification.request_number}</p>
          <p className="text-xs font-black">التاريخ: {annotation.date}</p>
        </div>
      </div>

      <div className="space-y-6 text-xl leading-relaxed">
        <div className="space-y-2">
           <p className="font-bold">المرجع: <span className="font-black underline px-2">إشعار/طلب الإذن بتلقي شهادة علمية</span></p>
           <p className="font-bold">العدل(ان): <span className="font-black px-2 text-xl italic">{notification.notary_name}</span> ورفيقه: <span className="font-black px-2">..................</span></p>
           <p className="font-bold">موضوع الشهادة: <span className="font-black px-2 underline decoration-dotted">{notification.data?.certificateType || 'شهادة علمية'}</span></p>
        </div>

        <div className="text-center py-4">
           <p className="text-2xl font-black">سلام تام بوجود مولانا الإمام،</p>
        </div>

        <div className="space-y-6 text-justify">
          {isApproved ? (
            <>
              <p>بعد الاطلاع على الطلب المشار إليه أعلاه والمتعلق بتلقي شهادة علمية لفائدة المعني(ة): <span className="font-black px-2 text-2xl">{notification.data?.involvedNames || '.........................'}</span>،</p>
              
              <p>وبناءً على ما قمتم به من توضيحات حول موضوع الشهادة ومحلها وغايتها،</p>
              
              <p>وبالنظر إلى ما تتطلبه الممارسة المهنية من مراعاة الضوابط القانونية والتنظيمية الجاري بها العمل؛</p>

              <div className="bg-emerald-50/20 p-8 rounded-3xl border-2 border-emerald-100 shadow-sm">
                 <p className="font-black leading-[2.8rem] text-2xl">
                   نوافق على منح الإذن بتلقي الشهادة العلمية موضوع الطلب، وتحت مسؤوليتكم المهنية وفقًا لما تقتضيه القواعد المؤطرة للتوثيق العدلي.
                 </p>
              </div>
            </>
          ) : (
            <>
              <p>وبعد الاطلاع على الطلب أعلاه، والمتعلق بتلقي شهادة علمية لفائدة المعني(ة): <span className="font-black px-2 text-2xl">{notification.data?.involvedNames || '.........................'}</span>،</p>
              
              <p>وبعد دراسة العناصر المرتبطة بالشهادة وغاية الإشهاد ومحلّه، وما يقتضيه العمل المهني من مراعاة الضوابط القانونية والتنظيمية ومقتضيات جودة وأمان التوثيق؛</p>

              <div className="bg-red-50/20 p-8 rounded-3xl border-2 border-red-100 shadow-sm text-red-900">
                 <p className="font-black leading-[2.8rem] text-2xl">
                   نُبلغكم تعذر الموافقة على الطلب المذكور في الوقت الراهن، وذلك اعتبارًا لمقتضيات الممارسة التوثيقية السليمة وتدبير العمل العدلي وفق ما تقتضيه المصلحة المهنية.
                 </p>
                 {annotation.reasoning && (
                   <div className="mt-4 pt-4 border-t border-red-200 text-lg italic">
                     السبب الإضافي: {annotation.reasoning}
                   </div>
                 )}
              </div>
            </>
          )}
        </div>

        <div className="text-center py-6">
           <p className="text-xl font-bold italic">وتفضلوا بقبول فائق التقدير والاحترام.</p>
        </div>
      </div>

      <div className="pt-10 flex flex-col items-start mr-auto w-1/2">
        <div className="text-center space-y-4 w-full">
          <p className="font-black text-xl">قاضي التوثيق وشؤون القاصرين</p>
          <div className="space-y-1">
             <p className="font-bold text-lg">الاسم: <span className="font-black px-2 border-b-2 border-slate-300 inline-block min-w-40">{annotation.judgeName}</span></p>
             <p className="font-bold text-lg">التوقيع: <span className="font-black italic text-slate-200">............................</span></p>
             <p className="font-bold text-lg">التاريخ: <span className="font-black px-2">{annotation.date}</span></p>
          </div>
        </div>
        <div className="mt-8 self-center opacity-10 rotate-12 pointer-events-none select-none">
          <div className="w-24 h-24 border-4 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-900 text-3xl">
            ⚖️
          </div>
        </div>
      </div>
    </div>
  );
};
