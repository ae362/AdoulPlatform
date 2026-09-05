import React from 'react';

export function OfficeMovementApprovalTemplate({
  notification,
  documentId = 'printable-movement-decision',
}: {
  notification: any;
  documentId?: string;
}) {
  const isCouncil = notification.authorityType === 'regional_council' || notification.recipient_type === 'regional_council';

  return (
    <div
      id={documentId}
      className="mx-auto max-w-4xl min-h-screen p-14 text-right font-amiri text-black leading-loose select-none bg-white relative shadow-2xl border-[16px] border-double border-red-950/20"
    >
      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          {isCouncil ? (
            <div className="text-right space-y-1">
              <p className="font-bold text-lg">المملكة المغربية</p>
              <p className="font-bold text-lg">الهيئة الوطنية للعدول</p>
              <p className="font-bold text-lg">{notification.regional_council || notification.jurisdiction || 'المجلس الجهوي للعدول'}</p>
              <p className="font-black text-slate-600">مكتب الرئاسة والمتابعة المهنية</p>
            </div>
          ) : (
            <div className="text-right space-y-1">
              <p className="font-bold text-lg">المملكة المغربية</p>
              <p className="font-bold text-lg">وزارة العدل</p>
              <p className="font-bold text-lg">{notification.target_court || 'المحكمة الابتدائية'}</p>
              <p className="font-black text-slate-600">قسم التوثيق وشؤون القاصرين</p>
            </div>
          )}

          <img 
            src="/logos/morocco-coat.jpg" 
            alt="شعار المملكة المغربية"
            className="h-24 w-auto object-contain"
          />
          <div className="text-center space-y-1">
            <p className="font-black text-xl mb-2">
              {notification.decision_type === 'موافقة' ? 'نموذج جواب بالموافقة' : 'نموذج جواب بالرفض'}
            </p>
            <div className="border-2 border-slate-900 p-2 rounded-lg">
               <p className="text-xs font-bold">المرجع: {notification.request_number}</p>
               <p className="text-[10px] font-black uppercase tracking-tighter">
                 {isCouncil ? 'Regional Council Auth' : 'Office Movement Auth'}
               </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-base font-bold mb-6">سلام تام بوجود مولانا الإمام،</p>
          <div className="h-0.5 bg-slate-900 w-full mb-8"></div>
        </div>

        {/* Body Content */}
        <div className="space-y-8 text-xl leading-[3rem]">
          <p className="font-bold">
            المرجع: <span className="underline">إشعار بالتوجه لتلقي إشهاد خارج مكتب التعيين</span>
          </p>

          <p>
            العدل(ان): <span className="font-black text-2xl"> {notification.notary_name} </span> 
            ورفيقه: <span className="font-bold italic"> {notification.partner_name || '....................'} </span>
          </p>

          <p>
            موضوع التنقل: <span className="font-black text-red-950 underline decoration-indigo-500 underline-offset-4"> {notification.certificate_type || notification.reason_for_movement || 'تلقي إشهادات خارج المكتب'} </span>
          </p>

          {notification.decision_type === 'موافقة' ? (
            <>
              <div className="indent-12 text-justify">
                بعد الاطلاع على الإشعار المشار إليه أعلاه والمتعلق بالتوجه خارج مكتب التعيين قصد تلقي إشهاد لفائدة المعني(ة): 
                <span className="font-black text-2xl px-4"> {notification.involved_names || '....................'} </span>،
                وبناءً على ما قدمتموه من تعليلات بخصوص مبررات هذا الانتقال ومكانه، 
                {isCouncil ? (
                  <span> وبالنظر إلى الاختصاصات الموكولة للمجلس الجهوي للعدول في السهر على تنظيم المهنة وتأطير مزاولتها؛</span>
                ) : (
                  <span> وبالنظر إلى مقتضيات المادة 20 من القانون رقم 16.03 المتعلق بخطة العدالة؛</span>
                )}
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border-2 border-red-950/10 text-center font-black space-y-4 shadow-sm">
                 <p className="text-2xl md:text-3xl text-red-950 italic">
                   {notification.decision_reasoning || 'نوافق على إشعاركم بالتوجه للقيام بالإجراء المذكور،'}
                 </p>
                 <p className="text-lg">مع ضرورة التقيد بالضوابط المهنية والقانونية الجاري بها العمل.</p>
              </div>
            </>
          ) : (
            <>
              <div className="indent-12 text-justify">
                وبعد الاطلاع على الإشعار أعلاه، والمتعلق بالتوجه خارج مكتب التعيين قصد تلقي إشهاد لفائدة المعني(ة): 
                <span className="font-black text-2xl px-4"> {notification.involved_names || '....................'} </span>،
                وبدراسة مبررات الطلب وظروف التنقل المقترحة، وما يستلزمه تدبير العمل التوثيقي من ضمانات؛
              </div>

              <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-900/10 text-center font-black space-y-4 shadow-sm">
                 <p className="text-2xl md:text-3xl text-red-900 italic">نُبلغكم تعذر الاستجابة للإشعار المذكور بالتوجه،</p>
                 <p className="text-base text-red-800 mt-2 font-bold">السبب: {notification.decision_reasoning || 'عدم كفاية مبررات التنقل أو عدم مطابقتها للضوابط المعمول بها'}</p>
                 <p className="text-lg mt-4">وذلك مراعاةً لحسن سير العمل التوثيقي وضمان أمان المعاملات.</p>
              </div>
            </>
          )}

          <p className="text-center font-bold text-2xl mt-10">
            وتفضلوا بقبول فائق التقدير والاحترام.
          </p>
        </div>

        {/* Footer Section */}
        <div className="mt-20 flex justify-between items-start">
           <div className="text-center space-y-4 pt-4">
              <p className="font-black text-xl">
                {isCouncil ? 'رئيس المجلس الجهوي للعدول' : 'قاضي التوثيق وشؤون القاصرين'}
              </p>
              <div className="space-y-2 mt-6">
                 <p className="text-sm font-bold text-slate-500">
                   الاسم: {notification.authority_name || notification.judge_name || (isCouncil ? 'رئيس المجلس الجهوي' : '............................')}
                 </p>
                 <div className="flex flex-col items-center gap-2">
                    {notification.decision_type === 'موافقة' && (
                      <div className="p-3 border-2 border-emerald-500 rounded-xl bg-emerald-50 transform rotate-[-5deg] shadow-md border-double">
                         <p className="text-[10px] font-black text-emerald-700">SIGNED DIGITALLY</p>
                         <p className="text-[8px] font-mono text-emerald-600">{new Date(notification.updated_at || notification.decided_at || Date.now()).toISOString()}</p>
                      </div>
                    )}
                    <p className="text-sm font-bold mt-4">التوقيع والخاتم: ............................</p>
                 </div>
              </div>
           </div>

           <div className="text-left font-bold space-y-2">
              <p className="text-lg">حرر بـ: {notification.writing_place || notification.target_court?.replace(/المحكمة الابتدائية بـ|محكمة /g, '') || '..........'}</p>
              <p className="text-lg">بتاريخ: {new Date(notification.decided_at || notification.created_at || Date.now()).toLocaleDateString('ar-MA')}</p>
           </div>
        </div>
      </div>
    </div>
  );
}
