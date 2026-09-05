import React from 'react';

interface IndividualReceptionDocumentTemplateProps {
  notification: any;
  documentId?: string;
}

export const IndividualReceptionDocumentTemplate: React.FC<IndividualReceptionDocumentTemplateProps> = ({ 
  notification, 
  documentId = 'printable-decision' 
}) => {
  const isApproved = notification.decision_type === 'موافقة';
  
  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية)\s*/, '').trim();
  };

  const decidedAt = notification.decided_at 
    ? new Date(notification.decided_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div 
      id={documentId} 
      className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12 max-w-4xl mx-auto space-y-10 font-amiri min-h-[842px] relative print:shadow-none print:border-none print:p-0"
      dir="rtl"
    >
      {/* Official Header */}
      <div className="flex justify-between items-start border-b-4 border-double border-slate-900 pb-8 mb-8 text-right">
        <div className="text-center space-y-1 w-1/3">
          <p className="font-bold text-lg">المملكة المغربية</p>
          <p className="font-bold text-lg">وزارة العدل</p>
          <p className="font-bold text-lg">محكمة الاستئناف بـ {formatCourtName(notification.appellate_court)}</p>
          <p className="font-bold text-lg">المحكمة الابتدائية بـ {formatCourtName(notification.primary_court || notification.target_court || notification.jurisdiction)}</p>
        </div>
        <div className="flex flex-col items-center w-1/3">
          <img 
            src="/logos/morocco-coat.jpg" 
            alt="Morocco Coat of Arms" 
            className="w-28 h-28 object-contain mb-2"
            onError={(e) => {
              (e.target as any).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png";
            }}
          />
          <p className="text-xs font-black uppercase tracking-widest mt-2">وزارة العدل</p>
        </div>
        <div className="text-center space-y-1 w-1/3">
          <p className="font-bold text-lg">Kingdom of Morocco</p>
          <p className="font-bold text-lg">Ministry of Justice</p>
          <p className="font-sm font-black opacity-50 italic">Judicial Portal</p>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className={`text-3xl font-black underline decoration-double underline-offset-[12px] mb-6 ${!isApproved ? 'text-red-900' : ''}`}>
          قرار {isApproved ? 'بالموافقة على' : 'برفض'} طلب الإذن بالتلقي الفردي
        </h2>
        <p className="text-2xl font-bold">الحمد لله وحده</p>
        <p className="text-xl font-bold mt-2">وصلى الله على سيدنا محمد وآله وصحبه</p>
      </div>

      <div className="space-y-6 text-xl leading-[2.8rem] text-slate-900 px-8 text-right">
        <p>إن القاضي المكلف بالتوثيق بالمحكمة الابتدائية بـ <span className={`font-black underline underline-offset-4 ${isApproved ? 'decoration-slate-400' : 'decoration-red-400'}`}>{formatCourtName(notification.target_court || notification.jurisdiction)}</span></p>
        
        <p>بناءً على الطلب المقدم من طرف السيد(ة) العدل:
          <br />
          <span className="font-black text-2xl">{notification.notary_name}</span>، الحامل(ة) للرقم المهني <span className="font-black text-2xl">{notification.notary_professional_number}</span>،
          المنتسب(ة) لدائرة محكمة الاستئناف بـ <span className="font-black">{formatCourtName(notification.appellate_court)}</span>،
        </p>

        <p>وبعد دراسة موضوع الشهادة المزمع تلقيها والمتعلقة بـ <span className="font-black text-2xl underline decoration-dotted">{notification.certificate_type}</span>،
          ومعاينة المبررات والتعليل الوارد بالطلب الإلكتروني المسجل تحت رقم <span className="font-black text-blue-900">{notification.request_number}</span>،
          واستنادًا إلى مقتضيات المادة 50 من القانون رقم 16.22 المتعلق بتنظيم مهنة العدول،
        </p>

        {isApproved ? (
          <>
            <p>وحيث ثبت للقضـاء قيام سبب مشروع يبرر الاستثناء من الأصل (التلقي الزوجي)،
              وحيث إن الطلب استوفى كافة المتطلبات والشروط القانونية والتنظيمية الـمعمول بها،
            </p>
            <div className="text-center font-black text-3xl py-6 italic decoration-amber-600 underline underline-offset-[10px] scale-110">
              لهــذه الأسبــاب
            </div>
            <p className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 font-bold leading-relaxed shadow-inner">
              يأذن القاضي المكلف بالتوثيق للعدل(ة) المذكور(ة) أعلاه بتلقي الشهادة موضوع الطلب،
              وذلك في شكل تلقٍ فردي استثناءً، مع وجوب التقيد التام بالضوابط القانونية الجاري بها العمل، وتحرير الشهادة في حدود هذا الإذن حصراً.
            </p>
          </>
        ) : (
          <>
            <p>وحيث إن الطلب، في وضعيته الحالية، لا يتوفر على ما يبرر قانوناً الترخيص بالاستثناء من الأصل،
              وحيث إن الأصل هو التلقي الزوجي المتزامن، ولا يُعدَل عنه إلا لضرورة ثابتة ومعللة تعليلاً كافياً،
            </p>
            <div className="text-center font-black text-3xl py-6 italic decoration-red-600 underline underline-offset-[10px] scale-110">
              لهــذه الأسبــاب
            </div>
            <p className="bg-red-50 p-8 rounded-3xl border-2 border-red-100 font-bold leading-relaxed shadow-inner text-red-950">
              يقرر القاضي المكلف بالتوثيق عدم الاستجابة لطلب الإذن بالتلقي الفردي المذكور أعلاه، 
              مع بقاء إمكانية إعادة تقديمه متى توفرت المبررات القانونية المقبولة أو المعطيات الجديدة المؤيدة له.
            </p>
          </>
        )}
      </div>

      <div className="flex justify-between items-end pt-12 border-t-2 border-slate-100 mt-12 px-8 text-right">
         <div className="text-center relative">
            <p className="font-bold text-xl">القاضي المكلف بالتوثيق</p>
            <p className="font-black mt-2 text-slate-400">الإمضاء والخاتم الرقمي</p>
            <div className="w-48 h-24 border-2 border-dashed border-slate-200 rounded-2xl mt-4 flex items-center justify-center text-slate-300 bg-slate-50/50">
              <img src="/logos/adoul-logo.jpg" alt="Stamp" className="w-16 h-16 opacity-20 grayscale" />
            </div>
            <p className="text-[12px] font-sans font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">{notification.decision_serial_number || 'OFFICIAL-DECISION-SEQ'}</p>
         </div>
         <div className="text-right space-y-2">
            <p className="text-lg">حرر بـ: <span className="font-black">{formatCourtName(notification.jurisdiction)}</span></p>
            <p className="text-lg">في: <span className="font-black">{decidedAt}</span></p>
            <div className="mt-8">
              <p className="text-[10px] text-slate-400 font-bold">هذا القرار تم توقيعه رقمياً عبر بوابة العدل المتكاملة</p>
              <p className="text-[10px] text-slate-400 font-bold">Digital ID: {notification.id ? notification.id.substring(0,8).toUpperCase() : 'VERIFIED'}</p>
            </div>
         </div>
      </div>
    </div>
  );
};
