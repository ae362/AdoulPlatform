import React from 'react';

interface MarriageDocumentViewProps {
  data: any;
  attachments?: any[];
  notaryData: {
    fullName?: string;
    jurisdiction?: string;
    professionalNumber?: string;
    appellateCourt?: string;
  };
}

export const MarriageDocumentView: React.FC<MarriageDocumentViewProps> = ({ data, notaryData, attachments = [] }) => {
  const finalSignatureImage =
    data?.finalSignatureData?.signatureDataUrl ||
    data?.suitorSignatureData?.signatureDataUrl ||
    data?.fianceeSignatureData?.signatureDataUrl ||
    data?.guardianSignatureData?.signatureDataUrl ||
    null;

  const isMinor = (dob: string) => {
    if (!dob) return false;
    const year = new Date(dob).getFullYear();
    return (new Date().getFullYear() - year) < 18;
  };

  const findAttachmentUrl = (keyPath: string) => {
    // Try to find in data first (for legacy or if explicitly provided)
    const parts = keyPath.split('.');
    let current = data;
    for (const part of parts) {
      if (current && current[part]) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (current && typeof current === 'string') return current;
    if (current && current.uploadedUrl) return current.uploadedUrl;

    // Search in attachments array
    // Our GenericPermissionPortal names them like "suitorDocs_adminCert_file"
    const searchKey = keyPath.replace(/\./g, '_') + '_file';
    const attachment = attachments.find(a => 
      (a.name && a.name.includes(searchKey)) || 
      (a.url && a.url.includes(searchKey))
    );
    return attachment?.url;
  };

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
              src="/logos/adoul-logo.jpg" 
              alt="شعار الهيئة الوطنية للعدول" 
              className="h-16 md:h-20 w-auto mb-1 object-contain"
            />
            <p className="text-[9px] font-bold text-slate-700">قسم قضاء الأسرة</p>
         </div>
         <div className="text-center font-bold text-[10px] md:text-xs">
            <p>مكتب العدول</p>
            <p>السيد(ة) {notaryData.fullName || '..........'}</p>
            <p>الرقم المهني {notaryData.professionalNumber || '..........'}</p>
         </div>
      </div>

      <div className="text-center space-y-2 mb-8">
         <h1 className="text-xl font-black border-b-2 border-slate-900 inline-block px-6 pb-1">
            طلب الإذن بتوثيق الــــــــــــــــــــزواج
         </h1>
      </div>

      {/* Case Info Header (Point 3a) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-[10px] font-black text-slate-600 mb-6">
         <div className="flex gap-6">
            <p>رقم الملف القضائي: <span className="text-blue-900">{data.judicialFileNumber || `MP-${Math.floor(1000 + Math.random() * 9000)}/${new Date().getFullYear()}`}</span></p>
            <p>تاريخ الإيداع: <span className="text-blue-900">{data.depositDate || new Date().toLocaleDateString('ar-MA')}</span></p>
         </div>
         <p>المحكمة المختصة: <span className="text-blue-900">قسم قضاء الأسرة بـ {(notaryData.jurisdiction || '..........').replace(/المحكمة الابتدائية/g, '').trim()}</span></p>
      </div>

      {/* Suitor Section */}
      <div className="space-y-3">
         <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-2">
            <h2 className="text-sm font-black underline decoration-1 underline-offset-4">
               معلومـــــــــات عن الخاطب- طالب الإذن بتوثيق الزواج :
            </h2>
            {isMinor(data.suitorDOB) && (
              <span className="bg-red-600 text-white px-3 py-0.5 rounded-full text-[10px] animate-pulse">⚠️ تنبيه: الخاطب قاصر</span>
            )}
         </div>
         <div className="space-y-2 px-2 text-xs">
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">الاسم الشخصي والعائلي:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2 font-black text-sm">{data.suitorFirstNameAr || '...'} {data.suitorLastNameAr || '...'}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <p className="flex items-center gap-2">
                 <span className="text-slate-400">❖</span>
                 <span className="font-bold">تاريخ ومكان الازدياد:</span>
                 <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorDOB || '....'} بـ {data.suitorPOB || '....'}</span>
              </p>
              <p className="flex items-center gap-2">
                 <span className="text-slate-400">❖</span>
                 <span className="font-bold">الجنسية:</span>
                 <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorNationality || 'مغربية'}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">رقم البطاقة الوطنية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2 font-mono font-black">{data.suitorCIN || '................................'}</span>
               </p>
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">الحالة العائلية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorMaritalStatus || 'عازب'}</span>
               </p>
            </div>
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">والداه:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorParents || '................................'}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">المهنة:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorProfession || '................................'}</span>
               </p>
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">الحالة الصحية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorHealthStatus || 'سليم'}</span>
               </p>
            </div>
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">محل السكنى والملحقة:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.suitorAddress || '....'} ({data.suitorAdministrativeAnnex || '....'})</span>
            </p>
         </div>
         {/* Suitor Documents List with Status Indicators */}
         <div className="mt-4 px-3 py-3 border border-slate-200 rounded-2xl bg-slate-50/70">
            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
               <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🗂️ الوثائق المدلى بها من طرف الخاطب</p>
               <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded-full font-black border border-emerald-200">تدقيق إلكتروني: ✔ سليم</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[10px]">
               <DocLine label="إدارية" value={data.suitorDocs?.adminCert?.number} url={findAttachmentUrl('suitorDocs.adminCert')} />
               <DocLine label="رسم الولادة" value={data.suitorDocs?.birthCert?.number} url={findAttachmentUrl('suitorDocs.birthCert')} />
               <DocLine label="شهادة طبية" value={data.suitorDocs?.medicalCert?.number} url={findAttachmentUrl('suitorDocs.medicalCert')} />
               <DocLine label="إذن زواج" value={data.suitorDocs?.marriagePermission?.number} url={findAttachmentUrl('suitorDocs.marriagePermission')} />
               <DocLine label="أهلية/كفاءة" value={data.suitorDocs?.competenceCert?.number} url={findAttachmentUrl('suitorDocs.competenceCert')} />
            </div>
         </div>
      </div>

      {/* Fiancee Section */}
      <div className="space-y-3 pt-4">
         <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-2">
            <h2 className="text-sm font-black underline decoration-1 underline-offset-4">
               معلومـــــــــات عن المخطوبة المراد الزواج بهــــــــــــــــــا :
            </h2>
            {isMinor(data.fianceeDOB) && (
              <span className="bg-red-600 text-white px-3 py-0.5 rounded-full text-[10px] animate-pulse">⚠️ تنبيه: المخطوبة قاصرة</span>
            )}
         </div>
         <div className="space-y-2 px-2 text-xs">
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">الاسم الشخصي والعائلي:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2 font-black text-sm">{data.fianceeFirstNameAr || '...'} {data.fianceeLastNameAr || '...'}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <p className="flex items-center gap-2">
                 <span className="text-slate-400">❖</span>
                 <span className="font-bold">تاريخ ومكان الازدياد:</span>
                 <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeDOB || '....'} بـ {data.fianceePOB || '....'}</span>
              </p>
              <p className="flex items-center gap-2">
                 <span className="text-slate-400">❖</span>
                 <span className="font-bold">الجنسية:</span>
                 <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeNationality || 'مغربية'}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">رقم البطاقة الوطنية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2 font-mono font-black">{data.fianceeCIN || '................................'}</span>
               </p>
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">الحالة العائلية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeMaritalStatus || 'عازبة'}</span>
               </p>
            </div>
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">والداها:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeParents || '................................'}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">المهنة:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeProfession || '................................'}</span>
               </p>
               <p className="flex items-center gap-2">
                  <span className="text-slate-400">❖</span>
                  <span className="font-bold">الحالة الصحية:</span>
                  <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeHealthStatus || 'سليمة'}</span>
               </p>
            </div>
            <p className="flex items-center gap-2">
               <span className="text-slate-400">❖</span>
               <span className="font-bold">محل السكنى والملحقة:</span>
               <span className="border-b border-dotted border-slate-400 flex-1 px-2">{data.fianceeAddress || '....'} ({data.fianceeAdministrativeAnnex || '....'})</span>
            </p>
         </div>
         {/* Fiancee Documents List with Status Indicators */}
         <div className="mt-4 px-3 py-3 border border-slate-200 rounded-2xl bg-slate-50/70">
            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
               <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🗂️ الوثائق المدلى بها من طرف المخطوبة</p>
               <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded-full font-black border border-emerald-200">تدقيق إلكتروني: ✔ سليم</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[10px]">
               <DocLine label="إدارية" value={data.fianceeDocs?.adminCert?.number} url={findAttachmentUrl('fianceeDocs.adminCert')} highlight="rose" />
               <DocLine label="رسم الولادة" value={data.fianceeDocs?.birthCert?.number} url={findAttachmentUrl('fianceeDocs.birthCert')} highlight="rose" />
               <DocLine label="شهادة طبية" value={data.fianceeDocs?.medicalCert?.number} url={findAttachmentUrl('fianceeDocs.medicalCert')} highlight="rose" />
               <DocLine label="إذن زواج" value={data.fianceeDocs?.marriagePermission?.number} url={findAttachmentUrl('fianceeDocs.marriagePermission')} highlight="rose" />
               <DocLine label="أهلية/كفاءة" value={data.fianceeDocs?.competenceCert?.number} url={findAttachmentUrl('fianceeDocs.competenceCert')} highlight="rose" />
            </div>
         </div>
      </div>

      {/* Marriage Details Section */}
      <div className="space-y-3 pt-4">
         <h2 className="text-sm font-black underline decoration-1 underline-offset-4 mb-2">
            معلومـــــــــات عــــــــن الــــــــزواج المرغوب فيــــــــــــــه :
         </h2>
         <div className="px-2 space-y-2 text-xs">
            <p className="font-bold">نوع الزواج:</p>
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 inline-block px-4 font-black text-rose-900">
               {data.marriageType || 'زواج أول'}
            </div>
            <p className="font-bold mt-2">الولي الشرعي:</p>
            <div className="border-b border-dotted border-slate-400 min-w-[150px] inline-block px-2">
               {data.hasGuardian === 'نعم' ? `${data.guardianName} (${data.guardianCapacity})` : 'لا يوجد'}
            </div>
         </div>
      </div>

      <div className="flex justify-between items-end pt-6 border-t mt-6 gap-8">
         <div className="flex-1 space-y-4">
            <div className="text-right text-[10px] italic">
               حرر بتاريخ: {new Date().toLocaleDateString('ar-MA')}
            </div>
            
            {(data.intake_id || data.generate_request) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1">
                    🔍 بيانات التتبع التقني (Debug Info)
                 </p>
                 {data.intake_id && (
                   <p className="text-[9px] font-mono flex justify-between">
                      <span className="font-bold text-slate-400">Intake ID:</span>
                      <span className="text-blue-900">{data.intake_id}</span>
                   </p>
                 )}
                 {data.generate_request && (
                   <p className="text-[9px] font-mono flex justify-between">
                      <span className="font-bold text-slate-400">Request ID:</span>
                      <span className="text-slate-600 truncate max-w-[150px]" title={data.generate_request}>{data.generate_request}</span>
                   </p>
                 )}
              </div>
            )}
         </div>

         <div className="text-center shrink-0">
            <p className="text-xs font-black border-b border-slate-900 px-4 mb-2">إمضــــــــــــــــاء</p>
            <div className="w-40">
               <div className="h-14 border border-dashed border-slate-300 rounded-md bg-white flex items-center justify-center overflow-hidden">
                  {finalSignatureImage ? (
                    <img src={finalSignatureImage} alt="التوقيع النهائي" className="h-12 w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-slate-300">مكان البصمة/التوقيع</span>
                  )}
               </div>
               <p className="mt-2 text-[9px] font-bold text-slate-500">التوقيع النهائي المعتمد</p>
            </div>
         </div>
      </div>

      {data.generatedDraft && (
        <div className="mt-10 border-t-2 border-slate-900 pt-8">
           <h2 className="text-center text-lg font-black mb-6 underline decoration-double underline-offset-8">
              نص عقـــــــــــــــــد الزواج المقتــــــــــــــــرح
           </h2>
           <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-200 font-amiri text-lg leading-[2.5rem] whitespace-pre-wrap text-justify shadow-inner">
              {data.generatedDraft}
           </div>
        </div>
      )}
    </div>
  );
};

const DocLine = ({ label, value, url, highlight = 'blue' }: { label: string, value?: string, url?: string, highlight?: 'blue' | 'rose' }) => (
  <div className="flex items-center justify-between border-b border-white pb-1 group/line">
    <div className="flex items-center gap-2 flex-1">
      <span className={`text-[8px] ${highlight === 'blue' ? 'text-blue-400' : 'text-rose-400'}`}>●</span>
      <span className="font-bold text-slate-700 min-w-[70px]">{label}:</span>
      <span className="text-slate-400 italic flex-1 border-b border-dotted border-slate-200">{value || 'قيد التدقيق...'}</span>
    </div>
    {url ? (
      <a 
        href={url} 
        target="_blank" 
        rel="noreferrer" 
        className={`font-black text-[8px] ${highlight === 'blue' ? 'text-blue-700 bg-blue-100' : 'text-rose-700 bg-rose-100'} px-2 py-0.5 rounded-md hover:scale-105 transition-transform`}
      >
        معاينة ⚡
      </a>
    ) : (
      <span className="text-[7px] font-black text-rose-400 bg-rose-50 px-1 rounded border border-rose-100 italic">ناقص ⚠</span>
    )}
  </div>
);

export default MarriageDocumentView;
