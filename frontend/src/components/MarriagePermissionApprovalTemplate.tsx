import React, { useMemo, useState, useEffect } from 'react';
import QRCode from 'qrcode';

type ParsedMarriagePermission = {
  judgeName?: string;
  suitor?: any;
  fiancee?: any;
  registryNumber?: string;
  registryDate?: string;
  details?: any;
  fullData?: any;
};

const formatCity = (name?: string | null): string => {
  if (!name) return '';
  return String(name)
    .replace(/محكمة الاستئناف/g, '')
    .replace(/المحكمة الابتدائية/g, '')
    .replace(/قسم قضاء الأسرة/g, '')
    .replace(/^بالمحكمة الابتدائية بـ\s*/, '')
    .replace(/^المحكمة الابتدائية بـ\s*/, '')
    .replace(/^بالمحكمة الابتدائية\s*/, '')
    .replace(/^المحكمة الابتدائية\s*/, '')
    .replace(/^بـ\s*/, '')
    .replace(/^ب([^\s]+)/, '$1')
    .trim();
};

const primaryToAppellateCityMap: Record<string, string> = {
  'شفشاون': 'تطوان',
  'تطوان': 'تطوان',
  'وزان': 'تطوان',
  'طنجة': 'طنجة',
  'أصيلة': 'طنجة',
  'اصيلة': 'طنجة',
  'العرائش': 'طنجة',
  'القصر الكبير': 'طنجة',
  'فاس': 'فاس',
  'صفرو': 'فاس',
  'بولمان': 'فاس',
  'ميسور': 'فاس',
  'تاونات': 'فاس',
  'مكناس': 'مكناس',
  'إفران': 'مكناس',
  'ازرو': 'مكناس',
  'خنيفرة': 'مكناس',
  'الرباط': 'الرباط',
  'سلا': 'الرباط',
  'تمارة': 'الرباط',
  'الخميسات': 'الرباط',
  'تيفلت': 'الرباط',
  'الرماني': 'الرباط',
  'الدار البيضاء': 'الدار البيضاء',
  'المحمدية': 'الدار البيضاء',
  'بن سليمان': 'الدار البيضاء',
  'مراكش': 'مراكش',
  'قلعة السراغنة': 'مراكش',
  'ابن جرير': 'مراكش',
  'إيمنتانوت': 'مراكش',
  'أكادير': 'أكادير',
  'إنزكان': 'أكادير',
  'تارودانت': 'أكادير',
  'تيزنيت': 'أكادير',
  'طاطا': 'أكادير',
  'كلميم': 'كلميم',
  'طانطان': 'كلميم',
  'سيدي إفني': 'كلميم',
  'آسا الزاك': 'كلميم',
  'العيون': 'العيون',
  'السمارة': 'العيون',
  'بوجدور': 'العيون',
  'الداخلة': 'الداخلة',
  'أوسرد': 'الداخلة',
  'وجدة': 'وجدة',
  'بركان': 'وجدة',
  'الناظور': 'الناظور',
  'الدريوش': 'الناظور',
  'الحسيمة': 'الحسيمة',
  'تارجيست': 'الحسيمة',
  'القنيطرة': 'القنيطرة',
  'سيدي قاسم': 'القنيطرة',
  'سيدي سليمان': 'القنيطرة',
  'سوق الأربعاء': 'القنيطرة',
  'سطات': 'سطات',
  'برشيد': 'سطات',
  'ابن أحمد': 'سطات',
  'الجديدة': 'الجديدة',
  'سيدي بنور': 'الجديدة',
  'بني ملال': 'بني ملال',
  'الفقيه بن صالح': 'بني ملال',
  'أزيلال': 'بني ملال',
  'خريبكة': 'خريبكة',
  'وادي زم': 'خريبكة',
  'أبي الجعد': 'خريبكة',
  'آسفي': 'آسفي',
  'اليوسفية': 'آسفي',
  'الصويرة': 'آسفي',
  'ورزازات': 'ورزازات',
  'وارزازات': 'ورزازات',
  'زاكورة': 'ورزازات',
  'تنغير': 'ورزازات',
  'الرشيدية': 'الرشيدية',
  'ميدلت': 'الرشيدية',
  'تازة': 'تازة',
  'جرسيف': 'تازة',
};

function parseMarriagePermissionNotes(notification?: any | null): ParsedMarriagePermission | null {
  if (!notification) return null;
  
  let jsonData: any = null;

  // 1. Try to get from data field directly (modern table structure)
  if (notification.data && typeof notification.data === 'object') {
    jsonData = notification.data;
  } 
  // 2. Fallback to notes parsing (legacy/notifications system)
  else if (notification.notes && typeof notification.notes === 'string') {
    if (notification.notes.includes('--- DATA JSON START ---')) {
      try {
        const jsonPart = notification.notes.split('--- DATA JSON START ---')[1].split('--- DATA JSON END ---')[0].trim();
        jsonData = JSON.parse(jsonPart);
      } catch (e) {
        console.error('Failed to parse marriage notes JSON', e);
      }
    }
  }

  if (!jsonData) return null;

  try {
    return {
      fullData: jsonData,
      judgeName: jsonData.judgeName || '',
      registryNumber: jsonData.registryNumber || '',
      registryDate: jsonData.registryDate || '',
      suitor: {
        name: `${jsonData.suitorFirstNameAr || ''} ${jsonData.suitorLastNameAr || ''}`.trim(),
        cin: jsonData.suitorCIN,
        status: jsonData.suitorMaritalStatus || jsonData.suitorFamilyStatus,
        profession: jsonData.suitorProfession || jsonData.suitorJob,
        address: jsonData.suitorAddress,
        docs: jsonData.suitorDocs,
        parents: jsonData.suitorParents || '',
        birthPlace: jsonData.suitorPOB || '',
        birthDate: jsonData.suitorDOB || '',
        birthRegistryNumber: jsonData.suitorBirthRegistryNumber || '',
        commune: jsonData.suitorCommune || '',
        administrativeAnnex: jsonData.suitorAdministrativeAnnex || '',
        nationality: jsonData.suitorNationality || 'مغربية',
        hasWakil: jsonData.suitorHasWakil || false,
        wakilInfo: jsonData.suitorWakilInfo || '',
      },
      fiancee: {
        name: `${jsonData.brideFirstNameAr || jsonData.fianceeFirstNameAr || ''} ${jsonData.brideLastNameAr || jsonData.fianceeLastNameAr || ''}`.trim(),
        cin: jsonData.brideCIN || jsonData.fianceeCIN,
        status: jsonData.brideMaritalStatus || jsonData.fianceeFamilyStatus,
        profession: jsonData.brideProfession || jsonData.fianceeProfession || jsonData.brideJob,
        address: jsonData.brideAddress || jsonData.fianceeAddress,
        docs: jsonData.brideDocs || jsonData.fianceeDocs,
        parents: jsonData.brideParents || jsonData.fianceeParents || '',
        birthPlace: jsonData.bridePOB || jsonData.fianceePOB || '',
        birthDate: jsonData.brideDOB || jsonData.fianceeDOB || '',
        birthRegistryNumber: jsonData.brideBirthRegistryNumber || jsonData.fianceeBirthRegistryNumber || '',
        commune: jsonData.brideCommune || jsonData.fianceeCommune || '',
        administrativeAnnex: jsonData.brideAdministrativeAnnex || jsonData.fianceeAdministrativeAnnex || '',
        nationality: jsonData.brideNationality || jsonData.fianceeNationality || 'مغربية',
        hasWakil: jsonData.brideHasWakil || false,
        wakilInfo: jsonData.brideWakilInfo || '',
      },
      details: {
        type: jsonData.marriageType,
        hasGuardian: jsonData.hasGuardian === 'نعم',
        guardian: jsonData.hasGuardian === 'نعم' ? jsonData.guardianName : 'لا يوجد',
        guardianParents: jsonData.guardianParents || '',
        guardianCIN: jsonData.guardianCIN || '',
        guardianCapacity: jsonData.guardianCapacity || '',
        generatedDraft: jsonData.generatedDraft || '',
        intake_id: jsonData.intake_id || ''
      },
    };
  } catch {
    return null;
  }
}

export function MarriagePermissionApprovalTemplate({
  notification,
  judgeFallbackName,
  documentId = 'printable-marriage-permission',
  annotation,
}: {
  notification: any;
  judgeFallbackName?: string;
  documentId?: string;
  annotation?: {
    status: string;
    decisionType?: string;
    reasoning?: string;
    date: string;
    regNumber: string;
    judgeName?: string;
  };
}) {
  const parsed = useMemo(() => parseMarriagePermissionNotes(notification), [notification]);
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(`VERIFY-PERM-${notification.request_number}-${notification.id}`);
        setQrCodeUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };
    generateQR();
  }, [notification]);

  const judgeName = annotation?.judgeName || parsed?.judgeName || judgeFallbackName || '........................';
  const currentYear = new Date().getFullYear();

  const courtCity = formatCity(notification?.target_court || notification?.jurisdiction) || 'شفشاون';

  let appellateCity = formatCity(
    notification?.appellate_court || 
    notification?.data?.appellateCourt || 
    parsed?.fullData?.appellateCourt
  );

  if (!appellateCity || appellateCity === courtCity || appellateCity.includes('الابتدائية')) {
    appellateCity = primaryToAppellateCityMap[courtCity] || 'تطوان';
  }

  // Decision details from the system (allowing for the statuses from the new hub)
  const currentStatus = annotation?.status || notification?.status || 'جديد';
  const reasonText = annotation?.reasoning || notification?.reasoning || '';
  
  const regNumber = annotation?.regNumber || parsed?.registryNumber || notification?.request_number || '........................';
  const regDate = annotation?.date ? new Date(annotation.date).toLocaleDateString('ar-MA') : (parsed?.registryDate || '.................');

  const getTitle = () => {
    if (currentStatus === 'مقبول' || currentStatus === 'approved') return 'إذن بتوثيق عقد الزواج';
    if (currentStatus === 'مرفوض' || currentStatus === 'rejected') return 'قـرار برفض الإذن بالزواج';
    if (currentStatus === 'إحالة_لجلسة' || currentStatus === 'إحالة_جلسة') return 'قـرار بإحالة الملف على الجلسة';
    if (currentStatus === 'طلب_استكمال') return 'إشعار باستكمال ملف نـاقص';
    return 'ملخص طلب الإذن بالزواج';
  };

  return (
    <div
      id={documentId}
      className="mx-auto max-w-[21cm] min-h-[29.7cm] p-12 text-right font-amiri text-black leading-relaxed select-none bg-white relative print:p-8 print:m-0 print:shadow-none"
      dir="rtl"
    >
      {/* Outer Border Frame */}
      <div className="absolute inset-4 border-[3px] border-black pointer-events-none"></div>
      <div className="absolute inset-5 border-[1px] border-black pointer-events-none"></div>

      <div className="relative z-10 px-4 py-2 text-justify">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-right font-bold space-y-0.5 max-w-[45%]">
            <p className="text-sm font-black">المملكة المغربية</p>
            <p className="text-sm">وزارة العدل</p>
            <p className="text-sm">محكمة الاستئناف بـ {appellateCity}</p>
            <p className="text-sm border-b border-black inline-block pb-0.5">المحكمة الابتدائية بـ {courtCity}</p>
            <div className="pt-3 pb-1">
               <p className="font-extrabold text-base">قسم قضاء الأسرة</p>
               <p className="text-xs font-bold pt-0.5">ملف مستندات الزواج</p>
            </div>
            <div className="text-[11px] space-y-0.5 pt-1 font-mono">
              <p className="font-amiri font-bold">رقــــــــــــــــــــم : {currentYear} / {(String(notification?.request_number || '').split('-')[1] || '.............')}</p>
              <p className="font-amiri font-bold">رقم السجل : {regNumber}</p>
              <p className="font-amiri font-bold">تاريخ السجل : {regDate}</p>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center">
            <img
              src="/logos/morocco-coat.jpg"
              className="h-28 w-auto mb-2 object-contain"
              alt="شعار المملكة المغربية"
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black border-b-4 border-black inline-block px-10 pb-2">
             {getTitle()}
          </h1>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-base leading-[2.1]">
          <div className="w-full mb-3 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-black text-xl whitespace-nowrap">نحـــــــــن الأستاذ :</span>
              <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 text-center">
                <span className="font-black text-xl text-slate-900">{judgeName}</span>
              </div>
            </div>
            <div className="text-right pr-6 pt-1 space-y-0.5">
              <p className="font-bold text-base">قاضي الأسرة المكلف بالزواج بقسم قضاء الأسرة بالمحكمة الابتدائية</p>
              <p className="font-bold text-base">بـ {courtCity}</p>
            </div>
          </div>

          <p>
            بناء على الطلب المسجل تحت عدد <span className="font-black">{notification?.request_number || '........'}</span> بتاريخ{' '}
            <span className="font-black">
              {notification?.created_at ? new Date(notification.created_at).toLocaleDateString('ar-MA') : '........'}
            </span>{' '}
            الذي تقدم به السيد (1) <span className="font-black text-xl px-2">{parsed?.suitor?.name || '................................'}</span> المزداد بتاريخ <span className="font-bold">{parsed?.suitor?.birthDate || '................'}</span> والداه (3) <span className="font-bold px-1">{parsed?.suitor?.parents || '................................................................'}</span> ببطاقته الوطنية رقم (2) <span className="font-black">{parsed?.suitor?.cin || '........'}</span> مهنته (3) <span className="font-bold">{parsed?.suitor?.profession || '........'}</span> حالته العائلية <span className="font-black">{parsed?.suitor?.status || '........'}</span> الساكن بـ : {' '}
            <span className="font-bold">{parsed?.suitor?.address || '...........'}</span>.
          </p>

          <p className="text-center font-black py-1 text-xl tracking-widest underline">
             {(currentStatus === 'مقبول' || currentStatus === 'approved') ? 'والراغب في الإذن له بتوثيق عقد الزواج' : 'موضوع طلب الإذن بتوثيق الزواج'}
          </p>

          <p>
            مع السيدة (1) <span className="font-black text-xl px-2">{parsed?.fiancee?.name || '................................'}</span> المولودة بتاريخ <span className="font-bold">{parsed?.fiancee?.birthDate || '................'}</span> من والداها (3) <span className="font-bold px-1">{parsed?.fiancee?.parents || '................................................................'}</span> ببطاقتها الوطنية رقم (2) <span className="font-black">{parsed?.fiancee?.cin || '........'}</span> مهنتها (3) <span className="font-bold">{parsed?.fiancee?.profession || '........'}</span> حالتها <span className="font-black">{parsed?.fiancee?.status || '........'}</span> الساكنة بـ : {' '}
            <span className="font-bold">{parsed?.fiancee?.address || '...........'}</span>.
          </p>

          <div className="pt-4 border-t border-black"></div>

          <div className="pt-2 space-y-1 font-bold text-sm">
            <p>وبناء على الملف المعروض والمستندات الملحقة به.</p>
            <p>وبناء على مقتضيات مدونة الأسرة المغربية (المواد 10 - 13 - 19 - 65).</p>
            {(currentStatus === 'إحالة_لجلسة' || currentStatus === 'إحالة_جلسة') && <p>وحيث اقتضت ضرورة البحث الاستماع إلى الأطراف شخصياً في جلسة المداولة.</p>}
          </div>

          <div className="text-center py-2">
            <h2 className="text-2xl font-black">{(currentStatus === 'مرفوض' || currentStatus === 'rejected') ? 'لهــــــــذه الأسباب' : 'لأجــــله'}</h2>
          </div>

          <div className="text-center font-black text-xl leading-relaxed px-4">
            {(currentStatus === 'مقبول' || currentStatus === 'approved') && (
              <p>نأذن لعدليين منتصبين للإشهاد بدائرة هذه المحكمة بتوثيق عقد الزواج المذكور طبقا للقواعد المنصوص عليها في مدونة الأسرة.</p>
            )}
            {(currentStatus === 'مرفوض' || currentStatus === 'rejected') && (
              <div className="space-y-4">
                <p className="text-red-700">قررنا رفض الطلب المذكور أعلاه نظراً للمانع التالي:</p>
                <div className="bg-slate-50 p-6 border-2 border-black rounded-xl">
                   <p className="text-lg">{reasonText || 'عدم استيفاء الشروط القانونية المنصوص عليها في مقتضيات مدونة الأسرة.'}</p>
                </div>
              </div>
            )}
            {(currentStatus === 'إحالة_لجلسة' || currentStatus === 'إحالة_جلسة') && (
              <p>يقرر القاضي إحالة الملف على جلسة البحث والتحقيق للتأكد من المعطيات المذكورة قبل البت في الإذن.</p>
            )}
            {currentStatus === 'طلب_استكمال' && (
              <p className="text-amber-800">يرجى من العدل المرسل إرفاق الوثائق التالية: {reasonText}</p>
            )}
          </div>

          <footer className="pt-16 flex flex-col">
            <div className="flex justify-between items-start px-10">
               <div className="text-right space-y-4">
                  <p className="font-bold text-lg">وحرر بـ {courtCity} في : {notification?.updated_at ? new Date(notification.updated_at).toLocaleDateString('ar-MA') : new Date().toLocaleDateString('ar-MA')}</p>
                  <div className={`font-black text-3xl pr-10 border-r-8 border-blue-900 ${(currentStatus === 'مرفوض' || currentStatus === 'rejected') ? 'text-red-600 border-red-600' : 'text-blue-900'}`}>
                    {(currentStatus === 'مقبول' || currentStatus === 'approved') ? 'موافـــــــــــــــق' : ((currentStatus === 'مرفوض' || currentStatus === 'rejected') ? 'مرفـــــــــــــــوض' : 'يُنفـــــــــــــــذ')}
                  </div>
                  <p className="font-black text-sm mt-8">{judgeName}</p>
                  <p className="text-xs text-slate-500 italic">قاضي الأسرة المكلف بالزواج بالمحكمة المذكورة</p>
               </div>
               
               <div className="text-center flex flex-col items-center gap-2">
                  <div className="w-32 h-32 border-2 border-slate-200 p-2 rounded-xl bg-white shadow-sm flex items-center justify-center">
                     {qrCodeUrl ? (
                       <img src={qrCodeUrl} alt="Verification QR" className="w-full h-full" />
                     ) : (
                       <div className="text-[6px] font-mono">GEN_QR...</div>
                     )}
                  </div>
                  <p className="text-[8px] font-mono text-slate-400">REF: {notification?.request_number}</p>
                  <div className="text-[10px] font-black text-blue-900 border border-blue-900 px-4 py-1 rounded-full mt-4">إمضاء إلكتروني مؤمن</div>
               </div>
            </div>
            
            <div className="mt-16 border-t-2 border-slate-100 pt-6 text-center">
               <p className="text-[10px] font-bold text-slate-400">تنبيه: يعتبر هذا المحرر رسمياً ولا يعتد به إلا إذا حمل الطابع المائي والرمز المربع للتأكد من صحته عبر بوابة السلطة القضائية.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default MarriagePermissionApprovalTemplate;
