import React from 'react';

interface WorkCertificateDocumentViewProps {
  data: any;
  notaryData: {
    fullName?: string;
    jurisdiction?: string;
    professionalNumber?: string;
  };
}

export const WorkCertificateDocumentView: React.FC<WorkCertificateDocumentViewProps> = ({ data, notaryData }) => {
  const finalSignatureImage = data?.finalSignatureData?.signatureDataUrl || null;

  return (
    <div className="bg-white p-6 md:p-10 shadow-sm text-right space-y-6 font-amiri text-slate-900 leading-relaxed border-2 border-slate-200 rounded-lg">
      {/* Logo & Kingdom Header */}
      <div className="flex justify-between items-start mb-8">
         <div className="text-center font-bold text-[10px] md:text-xs">
            <p>المملكة المغربية</p>
            <p>وزارة العدل</p>
            <p>محكمة الاستئناف بـ {(notaryData.jurisdiction || '..........').replace(/محكمة الاستئناف/g, '').replace(/المحكمة الابتدائية/g, '').replace(/^بـ\s*/, '').trim()}</p>
            <p className="border-b border-slate-900 px-2 mt-1 inline-block">المحكمة الابتدائية بـ {(notaryData.jurisdiction || '..........').replace(/المحكمة الابتدائية/g, '').replace(/محكمة الاستئناف/g, '').replace(/^بـ\s*/, '').trim()}</p>
         </div>
         <div className="flex flex-col items-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Coat_of_arms_of_Morocco.svg/1200px-Coat_of_arms_of_Morocco.svg.png" 
              alt="Morocco Coat of Arms" 
              className="h-12 md:h-16 w-auto mb-1"
            />
            <p className="text-[8px] font-bold">الإدارة القضائية</p>
         </div>
         <div className="text-center font-bold text-[10px] md:text-xs">
            <p>مكتب العدول</p>
            <p>السيد(ة) {notaryData.fullName || '..........'}</p>
            <p>الرقم المهني {notaryData.professionalNumber || '..........'}</p>
         </div>
      </div>

      <div className="text-center space-y-2 mb-8">
         <h1 className="text-xl font-black border-b-2 border-slate-900 inline-block px-6 pb-1">
            طلب شهادة عمل
         </h1>
      </div>

      {/* Recipient */}
      <div className="mb-6 font-bold text-lg">
         <p>إلى السيد</p>
         <p>قاضي التوثيق بالمحكمة الابتدائية بـ: {data.court || notaryData.jurisdiction || '..........'}</p>
      </div>

      <div className="space-y-4 text-sm md:text-base leading-relaxed">
         <p className="font-bold underline underline-offset-4">سلام تام بوجود مولانا الإمام،</p>
         <p className="font-bold">وبعد،</p>
         
         <p className="indent-10 text-justify">
            يشرفني أن أتقدم إلى سيادتكم المحترمة بهذا الطلب، ملتمسًا منكم التفضل بتسليمي شهادة عمل تثبت مزاولتي لمهنة العدول بصفة قانونية ومنتظمة (وفق مقتضيات المادتين 14 و 44 من القانون المنظم للمهنة)، وذلك قصد الإدلاء بها لدى الجهة التي يهمها الأمر.
         </p>

         <p className="font-black pt-2">وأحيطكم علمًا أنني:</p>

         <div className="space-y-2 px-6">
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">الاسم الشخصي والعائلي:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">{data.fullName || data.employeeName || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">الصفة:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">عدل</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">الرقم المهني:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 font-mono">{data.professionalNumber || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">تاريخ التعيين:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">{data.appointmentDate || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">المحكمة الابتدائية التابع لها:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">{data.court || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">محكمة الاستئناف التابع لها:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">{data.appellateCourt || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">رقم البطاقة الوطنية للتعريف:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 font-mono">{data.cin || data.employeeCIN || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">الرقم الضريبي:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 font-mono">{data.taxId || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">رقم الانخراط بالمجلس الجهوي:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 font-mono">{data.councilMemberId || '...............................'}</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">الحالة المهنية:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 text-emerald-700 font-bold">مزاول لمهنة العدول بصفة نظامية</span>
            </p>
            <p className="flex items-baseline gap-2">
               <span className="font-bold min-w-[180px]">عنوان المكتب المهني:</span>
               <span className="border-b border-dotted border-slate-400 flex-1">{data.officeAddress || '..........................................................'}</span>
            </p>
         </div>

         <p className="indent-10 text-justify pt-4">
            وأؤكد لسيادتكم أنني أزاول مهنة العدول وفق القوانين والأنظمة الجاري بها العمل، ودون أن تكون هناك أية موانع مهنية أو تنظيمية تحول دون ذلك، راجيًا منكم التفضل بالموافقة على طلبي هذا، وإصدار شهادة عمل في الموضوع.
         </p>

         <p className="text-center font-bold pt-6 text-lg">وتفضلوا، السيد القاضي، بقبول فائق عبارات التقدير والاحترام.</p>
         <p className="text-center font-bold">والسلام.</p>
      </div>

      {/* Footer Section */}
      <div className="flex justify-between items-end pt-8 border-t-2 border-slate-100 mt-10">
         <div className="space-y-2 text-sm font-bold">
            <p>حرر بـ: {data.court || '..........'}</p>
            <p>في: {data.creationDate || new Date().toLocaleDateString('ar-MA')}</p>
         </div>
         <div className="text-center font-black space-y-3">
            <p className="text-base border-b border-slate-900 px-4 pb-1">الإمضـــــــــــــــــــــــــــــاء</p>
            <div className="text-[11px] text-slate-500">
               <p>الاسم الكامل:</p>
               <p className="text-slate-900">{data.fullName || data.employeeName || '................'}</p>
            </div>
            <div className="w-32 h-20 border-2 border-dashed border-slate-200 rounded-lg mx-auto flex items-center justify-center overflow-hidden bg-white">
               {finalSignatureImage ? (
                 <img src={finalSignatureImage} alt="إمضاء العدل" className="h-16 w-full object-contain" />
               ) : (
                 <span className="text-slate-300 italic text-xs">Signature / Seal</span>
               )}
            </div>
         </div>
      </div>

    </div>
  );
};

export default WorkCertificateDocumentView;
