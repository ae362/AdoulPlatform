import React, { useCallback, useRef } from 'react';

interface AdlCopyDocumentViewProps {
  data: any;
  notaryData: {
    fullName?: string;
    jurisdiction?: string;
    professionalNumber?: string;
  };
  annotation?: {
    status: 'approved' | 'rejected';
    reasoning: string;
    date: string;
    regNumber: string;
    judgeName?: string;
  };
}

export const AdlCopyDocumentView: React.FC<AdlCopyDocumentViewProps> = ({ data = {}, notaryData = {}, annotation }) => {
  const beneficiary = data.requestFor === 'عن نفسي' 
    ? `${data.applicantFirstName || ''} ${data.applicantLastName || ''}`
    : (data.beneficiaryName || '..........');
  const finalSignatureImage = data?.finalSignatureData?.signatureDataUrl || null;
  const targetJudgeName = data?.judgeName || '';

  const isRejected = annotation?.status === 'rejected';
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = useCallback(() => {
    const printContainer = printContainerRef.current;
    if (!printContainer) return;

    const otherPrintableAreas = Array.from(document.querySelectorAll<HTMLElement>('.printable-area')).filter(
      (el) => el !== printContainer
    );

    for (const el of otherPrintableAreas) {
      el.classList.remove('printable-area');
      el.dataset.printableAreaDisabled = '1';
    }

    printContainer.classList.add('printable-area');

    const cleanup = () => {
      printContainer.classList.remove('printable-area');
      for (const el of otherPrintableAreas) {
        if (el.dataset.printableAreaDisabled === '1') {
          el.classList.add('printable-area');
          delete el.dataset.printableAreaDisabled;
        }
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 50);
  }, []);

  return (
    <div className="relative pb-10 adl-print-container-wrapper">
      {/* Print Control - Hidden during print */}
      <div className="flex justify-end mb-4 no-print px-4">
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          طباعة الوثيقة
        </button>
      </div>

      <div ref={printContainerRef} className="bg-[#fcfdfa] p-12 md:p-16 shadow-2xl text-right font-amiri text-gray-900 leading-[2] border-[12px] border-double border-gray-100 rounded-sm max-w-4xl mx-auto relative adl-print-container" dir="rtl">
        
        {/* 1. Official Notary Stamp (Top Right) */}
        <div className="adl-notary-stamp absolute top-28 right-28 w-40 p-3 border-[2px] border-gray-300 opacity-60 transform -rotate-2 pointer-events-none select-none">
          <div className="border border-gray-200 p-2 text-center space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Office of the Notary Public</p>
            <p className="text-xs font-bold text-gray-500">{notaryData.fullName || 'الأستاذ(ة)........'}</p>
            <p className="text-[9px] font-bold text-gray-400">العدل بـ {notaryData.jurisdiction || '.......'}</p>
            <div className="w-full h-[1px] bg-gray-100 my-1"></div>
            <p className="text-[7px] font-mono text-gray-300">REF: {notaryData.professionalNumber || 'XX-XXXX'}</p>
          </div>
        </div>

        {/* 2. Visual Annotation Layer (The "Tashir" on the Bottom Left) */}
        {annotation && (
          <div className={`adl-judicial-stamp absolute bottom-12 left-12 w-64 p-5 border-[4px] shadow-2xl transform -rotate-2 z-10 animate-stampIn backdrop-blur-sm bg-white/95 ${isRejected ? 'border-rose-600' : 'border-emerald-600'}`}>
            <div className={`border-b-2 pb-2 mb-3 text-center ${isRejected ? 'border-rose-600' : 'border-emerald-600'}`}>
              <h4 className={`font-extrabold text-lg ${isRejected ? 'text-rose-800' : 'text-emerald-800'}`}>تأشيرة القاضي</h4>
              <h5 className={`font-bold text-[10px] ${isRejected ? 'text-rose-700' : 'text-emerald-700'}`}>قسم قضاء الأسرة - {notaryData.jurisdiction || '.......'}</h5>
            </div>
            <div className={`space-y-2 text-xs leading-relaxed ${isRejected ? 'text-rose-900' : 'text-emerald-900'}`}>
              <div className="flex justify-between font-black">
                <span>رقم التحقق:</span>
                <span className="font-mono">{annotation.regNumber?.split('-')[2] || 'ORD-'+Math.floor(Math.random()*9000)}</span>
              </div>
              <div className="flex justify-between font-black">
                <span>بتاريخ:</span>
                <span>{annotation.date || new Date().toLocaleString('ar-MA')}</span>
              </div>
              <div className={`mt-2 text-sm font-black border-t pt-2 text-center ${isRejected ? 'border-rose-100' : 'border-emerald-100'}`}>
                {annotation.status === 'approved' ? (
                  <span className="text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 uppercase tracking-tighter">موافق عليه</span>
                ) : (
                  <span className="text-rose-700 bg-rose-50 px-3 py-0.5 rounded-full border border-rose-200">مرفوض</span>
                )}
              </div>
              <p className={`mt-3 text-[10px] font-bold leading-tight border-t pt-3 text-justify opacity-80 ${isRejected ? 'border-rose-50' : 'border-emerald-50'}`}>
                {annotation.reasoning?.slice(0, 150) || 'تمت المعالجة طبقاً للمساطر الجاري بها العمل'}{annotation.reasoning?.length > 150 ? '...' : ''}
              </p>
              <div className={`mt-4 flex flex-col items-center border-t-2 pt-2 ${isRejected ? 'border-rose-100' : 'border-emerald-100'}`}>
                <div className={`h-12 w-28 border-2 flex items-center justify-center opacity-20 text-[6px] italic font-black uppercase tracking-widest mb-1 ${isRejected ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                  Official Judicial QR Hub
                </div>
                <span className={`font-black text-[10px] ${isRejected ? 'text-rose-900' : 'text-emerald-900'}`}>{annotation.judgeName || 'قاضي التوثيق'}</span>
              </div>
            </div>
            {/* Mock QR Code */}
            <div className={`absolute -bottom-2 -left-2 w-10 h-10 text-white p-1 text-[7px] flex items-center justify-center font-mono border-2 border-white shadow-lg ${isRejected ? 'bg-rose-800' : 'bg-emerald-800'}`}>QR CODE</div>
          </div>
        )}

        {/* Top Identity Block */}
        <div className="space-y-3 mb-12 text-lg">
          <div className="flex gap-4">
            <span className="font-bold underline">لفائدة السيد (ة):</span>
            <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{beneficiary || '................................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="font-bold underline">الحامل لتعريفة الوطنية رقم:</span>
            <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{data.idDocumentNumber || '................................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="font-bold underline">الحالة المدنية رقم:</span>
            <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{data.civilStatusNumber || '................................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="font-bold underline">أو شهادة السكنى رقم:</span>
            <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{data.residencyCertNumber || '................................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="font-bold underline">العنوان:</span>
            <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{data.fullAddress || '................................................'}</span>
          </div>
        </div>

        {/* Recipient */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black bg-gray-50 py-3 px-8 border border-gray-200 inline-block rounded-xl shadow-sm">
            إلى فضيلة قاضي التوثيق بالمحكمة الابتدائية بـ {notaryData.jurisdiction || '........'}
          </h2>
          {targetJudgeName && <p className="mt-3 text-base font-bold">الأستاذ(ة): {targetJudgeName}</p>}
        </div>

        {/* Subject */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="text-xl font-bold border-r-4 border-red-800 pr-3">الموضوع:</span>
          <span className="text-xl font-black underline decoration-double underline-offset-8">
             طلب الإذن لاستخراج {data.documentType || 'نسخة'} من رسم أو رسوم
          </span>
        </div>

        {/* Salutation */}
        <div className="text-center mb-8">
          <p className="text-xl font-bold tracking-widest">سلام تام بوجود مولانا الإمام،</p>
          <p className="text-xl font-bold mt-2">وبعد، أنا الموقع (ة) أسفله والمذكور(ة) أعلاه</p>
        </div>

        {/* Body */}
        <div className="space-y-6 text-lg leading-[2.2] text-justify">
        {/* JUDICIAL RATIONALE - HIGH VISIBILITY BLOCK */}
        {annotation?.status === 'approved' && (data?.legalRelationship?.includes('الأغيار') || annotation?.reasoning?.includes('بعد الاطلاع على الطلب')) && (
          <div className={`my-10 p-8 border-[6px] border-double ${data?.legalRelationship?.includes('الأغيار') || annotation?.reasoning?.includes('بالاطلاع على الرسم') ? 'border-amber-500 bg-amber-50/30' : 'border-emerald-600 bg-emerald-50/10'} rounded-lg shadow-sm relative overflow-hidden text-center`}>
            <div className={`absolute top-0 right-0 h-full w-1 ${data?.legalRelationship?.includes('الأغيار') || annotation?.reasoning?.includes('بالاطلاع على الرسم') ? 'bg-amber-500' : 'bg-emerald-600'}`}></div>
            <h3 className={`text-2xl font-black ${data?.legalRelationship?.includes('الأغيار') || annotation?.reasoning?.includes('بالاطلاع على الرسم') ? 'text-amber-900 border-amber-200' : 'text-emerald-900 border-emerald-200'} mb-6 border-b-2 inline-block px-10 pb-2`}>قرار قضائي بالموافقة</h3>
            <p className={`leading-[2] text-xl font-bold ${data?.legalRelationship?.includes('الأغيار') || annotation?.reasoning?.includes('بالاطلاع على الرسم') ? 'text-amber-950' : 'text-emerald-950'} text-justify px-4`}>
              "بعد الاطلاع على الطلب والمرفقات المدلى بها،
              وبعد التيقن من أن طالب النسخة لا يمكنه التوصل إلى حقه أو الدفاع عنه إلا بالاطلاع على الرسم المطلوب،
              وحيث لا يظهر من ذلك أي مساس بحقوق الغير أو مخالفة للنصوص الجاري بها العمل،
              فإن الطلب يكون مبررًا،
              وعليه يؤشر بالموافقة على استخراج النسخة المطلوبة في حدود الغرض المبين."
            </p>
          </div>
        )}

          <p className="flex flex-wrap gap-x-8 gap-y-2 border-y border-gray-100 py-3 my-4 bg-gray-50/30 px-4 rounded-lg text-sm">
            <span>
              <span className="font-bold text-gray-500 ml-1">المزداد(ة) بتاريخ:</span> 
              <span className="font-black text-slate-900 underline underline-offset-4 decoration-slate-300">{data.dateOfBirth || data.details?.dateOfBirth || '..........'}</span>
            </span>
            <span>
              <span className="font-bold text-gray-500 ml-1">بـ:</span> 
              <span className="font-black text-slate-900 underline underline-offset-4 decoration-slate-300">{data.placeOfBirth || data.details?.placeOfBirth || '..........'}</span>
            </span>
            <span>
              <span className="font-bold text-gray-500 ml-1">المهنة:</span> 
              <span className="font-black text-slate-900 underline underline-offset-4 decoration-slate-300">{data.profession || data.details?.profession || '..........'}</span>
            </span>
            <span>
              <span className="font-bold text-gray-500 ml-1">الحالة:</span> 
              <span className="font-black text-slate-900 underline underline-offset-4 decoration-slate-300">{data.socialStatus || data.details?.socialStatus || '..........'}</span>
            </span>
          </p>

          <p>
            وعلاقة بالموضوع المشار إليه أعلاه، يشرفني أن أتقدم إلى جناب فضيلتكم بهذا الطلب راجيا من سيادتكم منحي إذن لاستخراج {data.documentType || 'نسخة'} من الرسم المذكور أعلاه المضمن بـ:
          </p>

          {/* Dynamic Deed Blocks */}
          <div className="space-y-4 pr-6 border-r-2 border-gray-100">
            {data.deeds?.map((deed: any, idx: number) => (
              <div key={idx} className="bg-gray-50/50 p-4 rounded-lg">
                <span className="font-bold ml-2">سجل:</span> <span className="underline font-black">{deed.register || '.....'}</span>
                <span className="font-bold mx-2">رقم:</span> <span className="underline font-black">{deed.number || '.....'}</span>
                <span className="font-bold mx-2">حرف:</span> <span className="underline font-black">{deed.letter || '.....'}</span>
                <span className="font-bold mx-2">صحيفة:</span> <span className="underline font-black">{deed.page || '.....'}</span>
                <span className="font-bold mx-2">عدد:</span> <span className="underline font-black">{deed.countValue || deed.count || '.....'}</span>
                <span className="font-bold mx-2">بتاريخ:</span> <span className="underline font-black">{deed.date || '........'}</span>
                <span className="font-bold mx-2">توثيق:</span> <span className="underline font-black">{deed.authRef || '........'}</span>
              </div>
            ))}
          </div>

          <p className="pt-4">
            وحتى أتقيد بمنصتكم، أرفق بطلبي ما يدعم ويثبت أحقيتي في ذلك.
          </p>

          <div className="pr-8 space-y-1">
            <p className="font-bold mb-2 underline">المرفقات:</p>
            {data.attachments?.map((att: any, idx: number) => {
              const types: Record<string, string> = {
                'ID_CARD': 'بطاقة التعريف الوطنية',
                'RASM': 'رسم',
                'CRIMINAL_RECORD': 'السجل العدلي',
                'AUTHORIZATION': 'وكالة / تفويض',
                'OTHER': 'وثيقة أخرى'
              };
              
              let arabicType = types[att.type] || att.type;
              let displayText = arabicType;

              // Handle Rasm details if present in description
              if (att.type === 'RASM' && att.description?.includes('|')) {
                const parts = att.description.split('|');
                // parts[0] is the specific rasm type (e.g. "زواج", "ملكية", etc.)
                const specificType = parts[0] || 'رسم';
                // parts[1]: register, 2: number, 3: letter, 4: page, 5: count, 6: date
                const details = [];
                if (parts[1]) details.push(`دفتر: ${parts[1]}`);
                if (parts[2]) details.push(`رقم: ${parts[2]}`);
                if (parts[3]) details.push(`حرف: ${parts[3]}`);
                if (parts[4]) details.push(`صحيفة: ${parts[4]}`);
                if (parts[5]) details.push(`عدد: ${parts[5]}`);
                if (parts[6]) details.push(`بتاريخ: ${parts[6]}`);
                
                displayText = `${specificType} (${details.join(' - ')})`;
              } else if (att.description && !att.description.includes('|')) {
                displayText = `${arabicType} - ${att.description}`;
              }
              
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-2 h-2 bg-gray-400 rotate-45"></span>
                  <span>{displayText}</span>
                </div>
              );
            })}
          </div>

          <p className="font-bold pt-6">
            ومن أجل ذلك ألتمس من سيادتكم الموافقة على طلبي، ولسيادتكم فائق تقديري واحترامي والسلام.
          </p>
        </div>

        {/* Signature Section */}
        <div className="mt-12 flex flex-col items-center ml-auto w-fit">
          <p className="text-xl font-black border-b-[3px] border-gray-900 pb-1 mb-8">إمضاء طالب النسخة</p>
          <div className="w-32 h-16 border-2 border-gray-100/50 flex items-center justify-center overflow-hidden bg-white">
            {finalSignatureImage ? (
              <img src={finalSignatureImage} alt="إمضاء طالب النسخة" className="h-14 w-full object-contain" />
            ) : (
              <div className="opacity-30 italic text-xs">STAMP / SIGNATURE</div>
            )}
          </div>
        </div>

      </div> {/* Close adl-print-container */}
    </div>
  );
};

export default AdlCopyDocumentView;

