import React from 'react';

interface IndividualReceptionRequestTemplateProps {
  data: any;
  notification: any;
  attachments?: any[];
  notaryData: {
    fullName?: string;
    jurisdiction?: string;
    professionalNumber?: string;
  };
}

export const IndividualReceptionRequestTemplate: React.FC<IndividualReceptionRequestTemplateProps> = ({ 
  data, 
  notification,
  attachments,
  notaryData 
}) => {
  const formatCourtName = (name: string | undefined | null) => {
    if (!name) return '..........';
    return name.replace(/^(بالمحكمة الابتدائية بـ|المحكمة الابتدائية بـ|بالمحكمة الابتدائية|المحكمة الابتدائية|محكمة الاستئناف بـ|محكمة الاستئناف|بمحكمة الاستئناف بـ)\s*/, '').trim();
  };

  const primaryCourt = formatCourtName(notification.jurisdiction || notification.primary_court || notification.data?.primaryCourt || notification.data?.court);
  const appellateCourt = formatCourtName(notification.appellate_court || notification.data?.appellateCourt);
  const requestDate = notification.created_at ? new Date(notification.created_at).toLocaleDateString('ar-MA') : '..........';
  const finalSignatureImage = notification.data?.finalSignatureData?.signatureDataUrl || data?.finalSignatureData?.signatureDataUrl || null;
  const targetJudgeName = notification.data?.judgeName || data?.judgeName || '';

  return (
    <div 
      id="printable-request"
      className="bg-white p-8 max-w-4xl mx-auto space-y-6 font-amiri min-h-[1050px] relative text-right text-slate-900 border border-gray-100 shadow-xl printable-area print:shadow-none print:border-none print:p-4 print:m-0 print:w-full print:max-w-none print:block print:visible"
      dir="rtl"
    >
      {/* Official Header - Enhanced as per professional standards */}
      <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6 text-xs">
        {/* Right Section: Official Jurisdiction */}
        <div className="text-center space-y-0.5 w-1/3">
          <p className="font-bold text-sm">المملكة المغربية</p>
          <p className="font-bold text-sm">وزارة العدل</p>
          <p className="font-bold">محكمة الاستئناف بـ {appellateCourt}</p>
          <p className="font-bold underline decoration-slate-400">المحكمة الابتدائية بـ {primaryCourt}</p>
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
          <p className="font-black text-base">السيد(ة) {notification.notary_name}</p>
          <p className="font-bold text-xs">الرقم المهني: <span className="font-mono">{notification.notary_professional_number}</span></p>
        </div>
      </div>

      {/* Target Authority */}
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-black">إلى السيد قاضي التوثيق وشؤون القاصرين</h3>
        {targetJudgeName && <h3 className="text-base font-bold">الأستاذ(ة): {targetJudgeName}</h3>}
        <h3 className="text-lg font-black underline decoration-slate-300 underline-offset-4">بالمحكمة الابتدائية بـ: {primaryCourt}</h3>
      </div>

      {/* Subject Line */}
      <div className="flex gap-4 items-baseline mb-6">
        <h4 className="text-base font-black underline decoration-2 underline-offset-4">الموضوع:</h4>
        <p className="text-base font-bold">طلب الإذن بتلقي شهادة بصفة فردية</p>
      </div>

      <div className="text-center py-2">
        <p className="text-lg font-bold">سلام تام بوجود مولانا الإمام،</p>
      </div>

      {/* Main Body */}
      <div className="space-y-4 text-base leading-[1.8rem] text-slate-900">
        <p className="text-justify indent-8">
          يشرفني أن أتقدم إلى سيادتكم بطلبي هذا بصفتي العدل: 
          <span className="font-black text-xl mx-2 text-blue-900"> {notification.notary_name}</span>، 
          رقم مهني <span className="font-black tracking-widest text-lg ml-2">{notification.notary_professional_number}</span>،
          المنتسب لدائرة محكمة الاستئناف بـ <span className="font-black">{appellateCourt}</span>،
          والمزاول لمهامي بالمحكمة الابتدائية بـ <span className="font-black">{primaryCourt}</span>،
          الكائن مقر عملي المهني بـ <span className="font-bold underline decoration-dotted">{notification.office_address || notification.data?.officeAddress || primaryCourt}</span>.
        </p>

        <p className="text-justify indent-8">
          ألتمس من سيادتكم الإذن لي بتلقي شهادة <span className="font-black underline decoration-blue-200 underline-offset-4"> {notification.certificate_type || notification.data?.certificateType || 'الشهادة المطلوبة'} </span>، 
          وذلك <span className="font-black">{notification.data?.isDual ? 'في تاريخ مختلف عن رفيقي' : 'بصفة فردية'}</span>،
          نظراً لـ: <span className="font-black italic bg-amber-50/50 px-2 rounded border border-amber-100"> {notification.reason_for_movement || (notification.data?.reasons ? notification.data.reasons.join(' و ') : '') || notification.data?.otherReason || 'المبررات الموضحة في المرفقات'} </span>،
          وذلك طبقاً لمقتضيات المادة 50 من القانون رقم 16.22 المتعلق بخطة العدالة.
        </p>

        <p className="text-justify indent-8">
          وبعد تأكدي من توفر كافة الضوابط القانونية والتوثيقية الجاري بها العمل، أؤكد لسيادتكم التزامي التام بتحرير الشهادة في حدود الإذن الممنوح لي وتحت مسؤوليتي المهنية.
        </p>
        
        <p className="pt-4 text-center text-xl font-bold">
          وتفضلوا، السيد القاضي، بقبول فائق التقدير والاحترام.
        </p>
      </div>

      {/* Signature Section */}
      <div className="pt-8 grid grid-cols-2 gap-8 text-sm">
        <div className="space-y-4">
          <div className="font-black underline text-base">إمضاء العدل:</div>
          <p>الاسم الكامل: <span className="font-bold">{notification.notary_name}</span></p>
          <div className="h-16 border border-dashed border-slate-200 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            {finalSignatureImage ? (
              <img src={finalSignatureImage} alt="إمضاء العدل" className="h-14 w-full object-contain" />
            ) : (
              <div className="pt-4 border-b border-slate-200 w-full"></div>
            )}
          </div>
          <p className="text-center text-[10px] text-slate-400">توقيع مهني مختوم</p>
        </div>

        <div className="space-y-4 text-left flex flex-col justify-end items-end">
            <div className="text-right space-y-1 font-bold text-base">
               <p>بـ: {primaryCourt}</p>
               <p>بتاريخ: <span className="font-mono">{requestDate}</span></p>
            </div>
            <div className="h-12 border-2 border-dashed border-slate-100 w-32 rounded-lg flex items-center justify-center opacity-20 text-[6px] italic">
               Digital Timestamp
            </div>
        </div>
      </div>

      {/* Attachments Section - Subdued and clean */}
      {attachments && attachments.length > 0 && (
          <div className="mt-16 pt-8 border-t-4 border-double border-slate-100 space-y-6 print:break-before-page">
              <h4 className="font-black text-slate-400 text-sm uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <span>📎</span> الوثائق والتعليلات المرفقة بالطلب الرقمي
              </h4>
              <div className="grid grid-cols-2 gap-4">
                  {attachments.map((att, idx) => (
                    <a 
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 border rounded-2xl flex items-center gap-4 bg-slate-50 border-slate-100 group hover:bg-white hover:shadow-md transition-all"
                    >
                        <span className="text-3xl">{att.type === 'PDF' ? '📄' : '🖼️'}</span>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] font-black text-slate-400">ملف مرفق {idx + 1}</p>
                            <p className="text-xs font-black text-slate-900 truncate">{att.name}</p>
                        </div>
                        <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-2 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">عرض ↗</span>
                    </a>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
