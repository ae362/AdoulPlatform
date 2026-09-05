import React, { useMemo } from 'react';

export function WorkCertificateApprovalTemplate({
  notification,
  documentId = 'printable-work-cert',
}: {
  notification?: any;
  documentId?: string;
}) {
  const safeNotification = notification || {};
  const data = safeNotification.data || {};
  const requestNumber =
    safeNotification.request_number ||
    data.fileNumber ||
    'CERT-2026-PENDING';
  const jurisdiction =
    safeNotification.jurisdiction ||
    safeNotification.target_court ||
    data.court ||
    'المحكمة الابتدائية بـ ...';
  const applicantName =
    safeNotification.notary_name ||
    safeNotification.full_name ||
    data.fullName ||
    '................';
  const appointmentDate =
    safeNotification.appointment_date ||
    data.appointmentDate ||
    '................';
  const appointmentDecreeNumber =
    safeNotification.appointment_decree_number ||
    data.appointmentDecreeNumber ||
    '................';
  const judgeName =
    safeNotification.judge_name ||
    data.judgeName ||
    '............................';

  const getApplicantLabel = () => {
    switch (data.applicantType) {
      case 'notary': return 'عدل منتصب';
      case 'trainee': return 'عدل متمرن';
      case 'employee': return 'مستخدم بمكتب عدلي';
      case 'scribe': return 'كاتب / مساعد';
      default: return 'عدل';
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://moj.gov.ma/verify/${requestNumber}`;

  return (
    <div
      id={documentId}
      className="mx-auto max-w-4xl min-h-screen p-14 text-right font-amiri text-black leading-loose select-none bg-white relative shadow-2xl border-[16px] border-double border-blue-900/10"
    >
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="text-right space-y-1">
            <p className="font-bold text-lg">المملكة المغربية</p>
            <p className="font-bold text-lg">وزارة العدل</p>
            <p className="font-bold text-lg">{jurisdiction}</p>
            <p className="font-black text-blue-900">قسم قضاء التوثيق</p>
          </div>
          <div className="flex flex-col items-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
              className="h-24 w-auto mb-2"
              alt="Coat of arms"
            />
            <div className="border border-slate-300 p-1 rounded bg-slate-50">
               <img src={qrUrl} alt="Verification QR" className="w-16 h-16" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="font-black text-xl mb-2">شهادة عمل</p>
            <div className="border-2 border-blue-900 p-2 rounded-lg">
               <p className="text-xs font-bold">الرقم: {requestNumber.replace('CT-WORK-', 'CERT-2026-')}</p>
               <p className="text-[10px] font-black uppercase tracking-tighter">OFFICIAL WORK CERTIFICATE</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-base font-bold mb-6">الحمــــــــد لله وحــــــــده</p>
          <div className="h-0.5 bg-blue-900 w-full mb-8"></div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 text-xl leading-[3rem] text-justify">
          <p>
            يشهد القاضي المكلف بالتوثيق لدى المحكمة الابتدائية بـ: <span className="font-black underline"> {String(jurisdiction).replace('المحكمة الابتدائية بـ', '') || '................'} </span>
          </p>

          <p>
            أن السيد(ة): <span className="font-black text-2xl px-2"> {applicantName} </span>
          </p>

          <p>
            الحامل لبطاقة التعريف الوطنية رقم: <span className="font-bold font-mono"> {data.cin || '................'} </span>
          </p>

          <p>
            بصفته: <span className="font-black text-blue-900"> {getApplicantLabel()} </span>
          </p>

          <div className="bg-slate-50 p-8 rounded-3xl border border-blue-900/10 space-y-4">
             <p>
                يشتغل بالدائرة القضائية لهذه المحكمة منذ تاريخ: <span className="font-bold"> {appointmentDate} </span> بموجب قرار التعيين رقم: <span className="font-bold"> {appointmentDecreeNumber} </span>.
             </p>
             
             {data.includeExperience && (
                <p>• شهدت له الإدارة بالأقدمية المطلوبة والممارسة الفعلية لمهامه بانتظام.</p>
             )}
             {data.includeStatus && (
                <p>• وضعيته النظامية سليمة ومسجل بجدول نفوذ هذه المحكمة.</p>
             )}
             {data.includeNoPenalties && (
                <p>• لم يسبق أن صدرت في حقه أية عقوبات تأديبية نهائية خلال الفترة المطلوبة.</p>
             )}
             {data.avgIncome && (
                <p>• متوسط دخله السنوي المصرح به يطابق السجلات المهنية الممسوخة.</p>
             )}
          </div>

          <p className="indent-12">
             وبناءً على طلبه، سلمت له هذه الشهادة للإدلاء بها عند الاقتضاء، {data.recipientUnit ? `وتوجيهها إلى: ${data.recipientUnit}` : ''}.
          </p>
        </div>

        {/* Footer Section */}
        <div className="mt-20 flex justify-between items-start">
           <div className="text-center space-y-4 pt-4">
              <p className="font-black text-xl">توقيع قاضي التوثيق</p>
              <div className="space-y-2 mt-6">
                 <p className="text-sm font-bold text-slate-400">القاضي: {judgeName}</p>
                 <div className="flex flex-col items-center gap-2">
                    <div className="p-4 border-2 border-blue-900 rounded-2xl bg-white transform rotate-[-3deg] shadow-lg relative">
                       <p className="text-[8px] font-black text-blue-900">APPROVED & SIGNED DIGITALLY</p>
                       <p className="text-[10px] font-black text-blue-950">AUTHENTICATION JUDGE</p>
                       <p className="text-[8px] font-mono text-slate-400">
                         {safeNotification.decided_at || safeNotification.created_at
                           ? new Date(safeNotification.decided_at || safeNotification.created_at).toISOString()
                           : 'PENDING'}
                       </p>
                       <div className="absolute -top-2 -right-2 bg-blue-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black">✓</div>
                    </div>
                    <p className="text-xs font-bold mt-4 opacity-30">الختم الإلكتروني للمحكمة</p>
                 </div>
              </div>
           </div>

           <div className="text-left font-bold space-y-2">
              <p className="text-lg">حرر بـ: {String(jurisdiction).replace('المحكمة الابتدائية بـ', '') || '..........'}</p>
              <p className="text-lg">
                بتاريخ: {safeNotification.decided_at || safeNotification.created_at
                  ? new Date(safeNotification.decided_at || safeNotification.created_at).toLocaleDateString('ar-MA')
                  : '..........'}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
