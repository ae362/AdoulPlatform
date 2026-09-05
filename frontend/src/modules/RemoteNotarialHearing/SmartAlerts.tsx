import React, { useMemo } from 'react';
import { trpc } from '../../trpc';

export default function SmartAlerts(props: {
  sessionToken: string;
  session: any | null;
  reminders: any[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const generate = trpc.remoteNotarialHearing.generateDefaultReminders.useMutation();

  const timeline = useMemo(() => {
    return (props.reminders || []).map((r) => {
      const when = r.scheduled_for ? new Date(r.scheduled_for) : null;
      const status = String(r.status || 'scheduled');
      const color =
        status === 'sent'
          ? 'bg-green-100 text-green-700'
          : status === 'failed'
            ? 'bg-red-100 text-red-700'
            : status === 'dismissed'
              ? 'bg-slate-100 text-slate-700'
              : 'bg-blue-100 text-blue-700';
      return {
        id: r.id,
        time: when ? when.toLocaleString('fr-FR') : '—',
        kind: r.reminder_kind,
        msg: r.message,
        status,
        color,
      };
    });
  }, [props.reminders]);

  if (!props.session) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
        <p className="font-bold text-slate-800">اختر جلسة أولاً.</p>
      </div>
    );
  }

  if (props.isLoading) return <div className="text-center text-slate-500 p-6">جاري تحميل...</div>;

  return (
    <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white">
        <div className="text-right">
          <h3 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">🔔</span>
            منظومة التذكيرات الذكية
          </h3>
          <p className="text-slate-500 font-medium mt-2 max-w-md">إدارة الإشعارات الاستباقية، فشل المطابقة، وتذكيرات البروتوكول القانوني للجلسة</p>
        </div>
        <button
          disabled={generate.isPending}
          onClick={async () => {
            await generate.mutateAsync({ sessionToken: props.sessionToken, sessionId: props.session.id, channel: 'in_app' });
            props.onChanged();
          }}
          className="group flex items-center gap-3 px-8 py-5 rounded-3xl bg-slate-900 border-b-4 border-slate-700 hover:bg-slate-800 text-white font-black shadow-2xl transition-all active:scale-95 disabled:opacity-60"
        >
          {generate.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          )}
          {generate.isPending ? 'جاري التوليد...' : 'توليد ذكـاء التنبيهات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Scheduled Timeline */}
        <div className="lg:col-span-3 bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
          <h4 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-4">
            <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">⏳</span>
            المسار الزمني للإشعارات
          </h4>

          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <div className="text-6xl opacity-30">📭</div>
              <p className="font-black text-slate-400">لا توجد جدولة نشطة حالياً</p>
              <p className="text-xs text-slate-400">ابدأ بإنشاء التذكيرات الافتراضية للجلسة</p>
            </div>
          ) : (
            <div className="space-y-8 relative">
              <div className="absolute top-0 right-[25px] bottom-0 w-1 bg-gradient-to-b from-slate-100 via-slate-100 to-transparent rounded-full" />
              
              {timeline.map((a, i) => (
                <div key={a.id} className="flex gap-8 relative group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg z-10 transition-transform group-hover:scale-110 ${a.color} ring-4 ring-white`}>
                    {a.status === 'sent' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <span className="text-xl">🔔</span>
                    )}
                  </div>
                  <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100 group-hover:bg-white group-hover:shadow-xl transition-all">
                    <div className="flex justify-between items-center mb-2">
                       <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${a.color} border border-current opacity-70`}>{a.status}</span>
                       <p className="font-mono font-black text-slate-400 text-xs">{a.time}</p>
                    </div>
                    <p className="font-bold text-slate-800 text-base leading-relaxed mb-3">{a.msg}</p>
                    <div className="flex items-center gap-4">
                       <span className="px-2 py-1 bg-white text-[10px] font-black text-slate-400 border border-slate-100 rounded-lg">{a.kind}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend / Info */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <h4 className="text-lg font-black mb-6">قواعد التنبيه التلقائي</h4>
              <ul className="space-y-6">
                 {[
                   { t: "تنبيه الهوية", d: "إرسال رسالة فورية عند فشل التحقق البيومتري", i: "🆔" },
                   { t: "تذكير الحضور", d: "رسالة هاتفية قبل 15 دقيقة من موعد الجلسة", i: "📱" },
                   { t: "سجل الوصول", d: "توثيق وقت دخول كل طرف للتطبيق", i: "📡" }
                 ].map((item, idx) => (
                   <li key={idx} className="flex gap-4">
                      <span className="text-2xl">{item.i}</span>
                      <div>
                         <p className="font-bold leading-none mb-1">{item.t}</p>
                         <p className="text-xs text-emerald-100 font-medium">{item.d}</p>
                      </div>
                   </li>
                 ))}
              </ul>
           </div>

           {/* Post-session smart logic integrated here */}
           <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-900/5">
              <h4 className="text-sm font-black text-amber-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-200 text-amber-700 flex items-center justify-center text-xs">⚠️</span>
                إنذارات الجودة والمخاطر
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-white/60 rounded-2xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed group hover:bg-white transition-colors">
                  <p className="font-black mb-1">بروتوكول فشل التسجيل:</p>
                  <p>يتم إنشاء تنبيه آلي فوري إذا تم رصد انقطاع في البث المرئي المؤمن أو فشل في مزامنة الأرشيف السحابي.</p>
                </div>
                <div className="p-4 bg-white/60 rounded-2xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed group hover:bg-white transition-colors">
                  <p className="font-black mb-1">خوارزمية تأخر الحضور:</p>
                  <p>رصد ذكي لتأخر أي طرف عن موعد الجلسة بـ 5 دقائق، مع إرسال إشعار استعجالي عبر كافة القنوات المتاحة.</p>
                </div>
              </div>
           </div>
           
           <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors"></div>
              <h4 className="text-[10px] font-black text-slate-400 mb-6 tracking-widest uppercase">قنوات البث المعتمدة</h4>
              <div className="grid grid-cols-3 gap-3">
                 <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-xl block mb-1">📱</span>
                    <span className="text-[9px] font-bold text-slate-800">المنصة</span>
                 </div>
                 <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 opacity-50 grayscale hover:grayscale-0 transition-all cursor-help" title="قيد التفعيل">
                    <span className="text-xl block mb-1">💬</span>
                    <span className="text-[9px] font-bold text-slate-800">SMS</span>
                 </div>
                 <div className="text-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 opacity-50 grayscale hover:grayscale-0 transition-all cursor-help" title="قيد التفعيل">
                    <span className="text-xl block mb-1">📧</span>
                    <span className="text-[9px] font-bold text-slate-800">E-mail</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

