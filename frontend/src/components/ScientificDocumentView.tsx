import React from 'react';

interface ScientificDocumentViewProps {
  data: any;
  notification?: any;
  attachments?: any[];
  notaryData: {
    fullName?: string;
    jurisdiction?: string;
    professionalNumber?: string;
  };
}

export const ScientificDocumentView: React.FC<ScientificDocumentViewProps> = ({ data, notification, attachments, notaryData }) => {
  if (!data && !notification) {
    return <div className="p-10 text-center text-red-500 font-bold font-amiri">خطأ: لا توجد بيانات للطلب للمعاينة.</div>;
  }
  const finalSignatureImage = data?.finalSignatureData?.signatureDataUrl || notification?.data?.finalSignatureData?.signatureDataUrl || null;

  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية)\s*/, '').trim();
  };

  const today = new Date().toLocaleDateString('ar-MA');
  const city = formatCourtName(notification?.jurisdiction || notaryData.jurisdiction);
  const targetJudgeName = data?.judgeName || notification?.data?.judgeName || '';

  return (
    <div 
      id="printable-request"
      className="bg-white p-8 max-w-4xl mx-auto space-y-6 font-amiri min-h-[1050px] relative text-right text-slate-900 border border-gray-100 shadow-xl print:shadow-none print:border-none print:p-4 print:m-0 print:w-full print:max-w-none print:block print:visible"
      dir="rtl"
    >
      {/* Official Header - Enhanced as per screenshot */}
      <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6 text-xs">
        {/* Right Section: Official Jurisdiction */}
        <div className="text-center space-y-0.5 w-1/3">
          <p className="font-bold text-sm">المملكة المغربية</p>
          <p className="font-bold text-sm">وزارة العدل</p>
          <p className="font-bold">محكمة الاستئناف بـ {formatCourtName(notification?.appellate_court)}</p>
          <p className="font-bold underline decoration-slate-400">المحكمة الابتدائية بـ {formatCourtName(notification?.jurisdiction || notaryData.jurisdiction)}</p>
        </div>

        {/* Center Section: Notary Logo & Title */}
        <div className="flex flex-col items-center w-1/3">
          <img 
            src="/logos/adoul-logo.jpg" 
            alt="Notary Logo" 
            className="w-16 h-16 object-contain mb-1"
            onError={(e) => {
              (e.target as any).src = "https://icon-library.com/images/judge-icon/judge-icon-15.jpg";
            }}
          />
          <p className="font-black text-[10px] mt-0.5">الإدارة القضائية</p>
        </div>

        {/* Left Section: Notary Identity */}
        <div className="text-center space-y-0.5 w-1/3">
          <p className="font-bold text-sm">مـكـتـب الـعدول</p>
          <p className="font-black text-base">السيد(ة) {notaryData.fullName}</p>
          <p className="font-bold text-xs">الرقم المهني: <span className="font-mono">{notaryData.professionalNumber}</span></p>
        </div>
      </div>

      {/* Target Authority */}
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-black">إلى السيد قاضي التوثيق وشؤون القاصرين</h3>
        {targetJudgeName && <h3 className="text-base font-bold">الأستاذ(ة): {targetJudgeName}</h3>}
        <h3 className="text-lg font-black">بالمحكمة الابتدائية بـ: {city}</h3>
      </div>

      {/* Subject Line */}
      <div className="flex gap-4 items-baseline mb-6">
        <h4 className="text-base font-black underline decoration-2 underline-offset-4">الموضوع:</h4>
        <p className="text-base font-bold">طلب الإذن بتلقي {data.certificateType || 'شهادة علمية'}</p>
      </div>

      <div className="text-center py-2">
        <p className="text-lg font-bold">سلام تام بوجود مولانا الإمام،</p>
      </div>

      {/* Main Body */}
      <div className="space-y-4 text-base leading-[1.8rem]">
        <p className="text-justify">
          يشرفنا، بصفتنا العدلين المنتصبين للشهادة بالدائرة المذكورة أعلاه، أن نلتمس من سيادتكم الإذن بتلقي <span className="font-black underline">{data.certificateType || 'شهادة علمية (مثلية)'}</span> لفائدة السيد/السيدة: <span className="font-black text-xl">{data.involvedNames || data.applicantName || '................................'}</span>.
        </p>

        <div className="space-y-2">
          <p className="font-bold underline decoration-dotted underline-offset-4">وتتعلق الشهادة بالموضوع التالي:</p>
          <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 min-h-[60px] font-black leading-relaxed">
            {data.reasonForMovement || data.notes || '................................................................'}
          </div>
        </div>

        <p className="text-justify indent-8">
          وبعد اطلاعنا على عناصر الشهادة محل الطلب، ومعرفتنا بها، وتحقيقنا من صحة المعطيات المرتبطة بها، والإحاطة بموضوعها من حيث صفة الطالب وصحة المشهود فيه ومشروعية سند الشهادة، واحترام الضوابط المهنية والتنظيمية والتوثيقية الجاري بها العمل؛ نتقدم إلى سيادتكم بطلب الإذن لنا وتحت مسؤوليتنا المهنية بتلقي الشهادة العلمية المذكورة وفق المقتضيات القانونية والتنظيمية الجاري بها العمل في مهنة العدول.
        </p>

        <p className="text-center pt-4 text-xl font-bold">وتفضلوا بقبول فائق التقدير والاحترام.</p>
      </div>

      {/* Signature Section - Exactly as requested */}
      <div className="pt-8 grid grid-cols-2 gap-8 text-sm">
        <div className="space-y-4">
          <div className="font-black underline text-base">العدل:</div>
          <p>الاسم الكامل: <span className="font-bold">{notaryData.fullName}</span></p>
          <div className="h-24 border border-dashed border-slate-200 rounded-lg bg-white flex items-center justify-center overflow-hidden px-2">
            {finalSignatureImage ? (
              <img src={finalSignatureImage} alt="التوقيع النهائي" className="h-20 w-full object-contain" />
            ) : (
              <div className="pt-4 border-b border-slate-200 w-full"></div>
            )}
          </div>
          <p className="text-center text-[10px] text-slate-400">التوقيع النهائي</p>
        </div>

        <div className="space-y-4">
          <div className="font-black underline text-base">رفيقه:</div>
          <p>الاسم الكامل: <span className="font-bold">{data.companionAdoulName || '................................'}</span></p>
          <div className="pt-4 border-b border-slate-200 w-full"></div>
          <p className="text-center text-[10px] text-slate-400">بيان اسم الرفيق</p>
        </div>
      </div>

      {/* Footer Location & Date */}
      <div className="pt-6 flex justify-end gap-8 text-base font-bold">
        <p>بـ: {city}</p>
        <p>في: {today}</p>
      </div>

      {/* Metadata for identification - Hidden in print */}
      <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-300 print:hidden">
        REF: {notification?.request_number || 'TR-GEN'}
      </div>
    </div>
  );
};
