import React from 'react';

interface OfficeMovementDocumentViewProps {
  notification: any;
  documentId?: string;
}

export const OfficeMovementDocumentView: React.FC<OfficeMovementDocumentViewProps> = ({ 
  notification, 
  documentId = 'printable-movement-doc' 
}) => {
  const isCouncil = notification?.recipient_type === 'regional_council';
  const isBoth = notification?.recipient_type === 'both';
  const isOfficeMovement = Boolean(
    notification?.certificate_type?.includes('توجه') || 
    notification?.reason_for_movement || 
    notification?.reception_place ||
    notification?.request_number?.startsWith('PERM-')
  );

  return (
    <div 
      id={documentId}
      className="bg-white p-12 shadow-sm text-right space-y-10 font-amiri text-slate-900 border-2 border-slate-200 rounded-[3rem] relative overflow-hidden max-w-4xl mx-auto"
      dir="rtl"
    >
      {/* Decorative Header Background */}
      <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-red-950 via-amber-300 to-red-950"></div>
      
      {/* Header Section */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-8 gap-4">
        <div className="text-right space-y-1.5 flex-1">
          <p className="font-black text-xl text-red-950">المملكة المغربية</p>
          {isCouncil ? (
            <>
              <p className="font-bold text-slate-700">الهيئة الوطنية للعدول</p>
              <p className="font-bold text-slate-600">{notification?.regional_council || notification?.appellate_court || 'المجلس الجهوي للعدول'}</p>
            </>
          ) : isBoth ? (
            <>
              <p className="font-bold text-slate-700">وزارة العدل & الهيئة الوطنية للعدول</p>
              <p className="font-bold text-slate-600">{notification?.target_court || notification?.jurisdiction || 'المحكمة الابتدائية والمجلس الجهوي'}</p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-700">وزارة العدل</p>
              <p className="font-bold text-slate-600">{notification?.target_court || notification?.jurisdiction || 'المحكمة الابتدائية'}</p>
              <p className="text-xs text-slate-500 font-bold">قسم قضاء التوثيق</p>
            </>
          )}
        </div>

        <div className="flex flex-col items-center flex-shrink-0">
          <img 
            src="/logos/adoul-logo.jpg" 
            className="h-24 w-auto mb-2 object-contain"
            alt="شعار الهيئة الوطنية للعدول"
          />
          <p className="text-xs font-black border border-amber-300/80 px-3 py-1 bg-amber-50/60 text-red-950 uppercase tracking-widest rounded-lg shadow-sm">
            {isOfficeMovement ? 'إشعار رسمي بالتوجه' : 'طلب خطي مهني'}
          </p>
        </div>

        <div className="text-left space-y-1.5 flex-1">
          <p className="font-bold text-slate-500 text-sm">المرجع: <span className="text-slate-900 font-black">{notification?.request_number || '...'}</span></p>
          <p className="font-bold text-slate-500 text-sm">التاريخ: <span className="text-slate-900 font-black">{notification?.created_at ? new Date(notification.created_at).toLocaleDateString('ar-MA') : new Date().toLocaleDateString('ar-MA')}</span></p>
          {notification?.status && (
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 mt-1">
              الحالة: {notification.status}
            </span>
          )}
        </div>
      </div>

      {/* Addressee */}
      <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/70 text-right space-y-1">
        <p className="text-sm font-bold text-slate-500">إلى السيد(ة) المحترم(ة):</p>
        <p className="text-2xl font-black text-red-950">
          {isCouncil 
            ? 'السيد رئيس المجلس الجهوي للعدول' 
            : isBoth 
            ? 'السيد قاضي التوثيق والسيد رئيس المجلس الجهوي للعدول' 
            : 'السيد قاضي التوثيق وشؤون القاصرين بالمحكمة الابتدائية'}
        </p>
        <p className="text-xs font-bold text-slate-600">
          بدائرة نفوذ {notification?.target_court || notification?.jurisdiction || 'المحكمة المختصة'}
        </p>
      </div>

      {/* Main Document Body */}
      <div className="text-center space-y-12 py-4">
        <h1 className="text-4xl font-black text-red-950 underline decoration-double underline-offset-[14px] decoration-amber-300">
          {isOfficeMovement ? 'إشعار بالتوجه لتلقي إشهاد خارج مكتب التعيين' : (notification?.certificate_type || 'طلب خطي موجه للمجلس')}
        </h1>
        
        <div className="space-y-10 text-xl leading-[3.2rem] px-4 text-justify">
          <p>
            سلام تام بوجود مولانا الإمام المؤيد بالله،
          </p>

          <p>
            أنا الموقع أسفله، السيد(ة) <span className="font-black text-2xl border-b-2 border-amber-400 px-3 bg-amber-50/30"> {notification?.notary_name || '....................'} </span>، 
            العدل الممارس بدائرة {notification?.jurisdiction || notification?.target_court || 'المحكمة الابتدائية المختصة'}، 
            {notification?.appointment_decree_number && (
              <span> والحامل لقرار التعيين رقم <span className="font-black"> {notification.appointment_decree_number} </span></span>
            )}
            {notification?.appointment_date && (
              <span> الصادر بتاريخ <span className="font-black"> {notification.appointment_date} </span></span>
            )}
            {notification?.notary_phone && (
              <span> (الهاتف: <span className="font-black font-sans text-lg">{notification.notary_phone}</span>)</span>
            )}
            .
          </p>

          <p>
            {isOfficeMovement ? (
              <>
                أتشرف بإحاطتكم علماً بنيتي الانتقال والتوجه خارج مقر مكتبي المهني، 
                {notification?.reception_date && (
                  <span> وذلك يوم <span className="font-black bg-slate-50 px-3 py-1 rounded-lg border border-slate-200"> {notification.reception_date} </span></span>
                )}
                {notification?.reception_time && (
                  <span> على الساعة <span className="font-black bg-slate-50 px-3 py-1 rounded-lg border border-slate-200"> {notification.reception_time} </span></span>
                )}
                {notification?.reception_place && (
                  <span> قصد التوجه إلى العنوان التالي: <span className="font-bold text-red-950 underline decoration-amber-400 underline-offset-4"> {notification.reception_place} </span></span>
                )}
                .
              </>
            ) : (
              <>
                أتشرف برفع هذا الطلب إلى أنظاركم الكريمة بخصوص موضوع: <span className="font-black text-red-950 underline decoration-amber-400"> {notification?.certificate_type || 'المعاملة التوثيقية المحددة أعلاه'} </span>.
              </>
            )}
          </p>

          <p>
            موضوع الإجراء المطلوب: <span className="font-black text-red-950 bg-amber-50 px-4 py-1 rounded-xl border border-amber-200 inline-block"> {notification?.certificate_type || notification?.reason_for_movement || 'تلقي إشهادات خارج المكتب'} </span>
          </p>

          {notification?.involved_names && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
              <span className="font-black text-slate-700 block mb-2">الأطراف المعنية بالإشهاد / الطلب:</span>
              <span className="font-bold text-xl text-slate-900 leading-relaxed block">{notification.involved_names}</span>
            </div>
          )}

          {notification?.reason_for_movement && (
            <p>
              أسباب ومبررات الإجراء: <span className="font-bold italic text-slate-800"> {notification.reason_for_movement} </span>.
            </p>
          )}

          {notification?.partner_name && (
            <p>
              العدل المشارك (الرفيق): <span className="font-black text-slate-900">{notification.partner_name}</span>.
            </p>
          )}

          {notification?.notes && (
            <div className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/60 text-base font-bold text-slate-700">
              <p className="font-black text-red-950 mb-1">بيانات وتوضيحات تكميلية:</p>
              <p className="leading-relaxed whitespace-pre-wrap">{notification.notes}</p>
            </div>
          )}

          <p className="text-center font-bold text-xl pt-4">
            وتفضلوا، سيدي الرئيس / فضيلة القاضي، بقبول أسمى عبارات الاحترام والتقدير.
          </p>
        </div>
      </div>

      {/* Footer Section & Signatures */}
      <div className="flex justify-between items-end pt-10 border-t border-slate-200 mt-12 gap-8">
        <div className="space-y-3">
          <p className="font-bold text-slate-500">
            حرر بـ: <span className="text-slate-900 font-black">{notification?.writing_place || notification?.jurisdiction?.replace(/المحكمة الابتدائية بـ|محكمة /g, '') || 'المكتب التوثيقي'}</span>
          </p>
          <p className="font-bold text-slate-500">
            بتاريخ: <span className="text-slate-900 font-black">{notification?.created_at ? new Date(notification.created_at).toLocaleDateString('ar-MA') : new Date().toLocaleDateString('ar-MA')}</span>
          </p>
          <div className="text-[11px] font-bold text-slate-400">
            تم الإيداع إلكترونياً عبر النظام الموحد لمنصة العدول بالمغرب
          </div>
        </div>

        <div className="text-center space-y-4 bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-300 shadow-md w-80">
          <p className="font-black text-red-950 text-lg border-b border-amber-200 pb-2">توقيع وخاتم السيد العدل</p>
          <div className="h-20 flex flex-col items-center justify-center text-slate-400 font-bold text-xs gap-1">
            <span className="text-xl">✍️</span>
            <span className="text-slate-700 font-black">{notification?.notary_name}</span>
            <span className="text-[9px] text-emerald-700 font-sans font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">VERIFIED NOTARY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
