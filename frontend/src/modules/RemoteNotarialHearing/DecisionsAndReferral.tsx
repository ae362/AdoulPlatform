import React, { useEffect, useState } from 'react';
import { trpc } from '../../trpc';

export default function DecisionsAndReferral(props: {
  sessionToken: string;
  session: any | null;
  isLoading: boolean;
  onChanged: () => void;
}) {
  const [decisionResult, setDecisionResult] = useState<string>('قبول التلقي وإتمام العقد');
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [referrals, setReferrals] = useState<{ regionalCouncil: boolean; nationalAuthority: boolean; notaryArchive: boolean }>({
    regionalCouncil: true,
    nationalAuthority: true,
    notaryArchive: true,
  });

  const update = trpc.remoteNotarialHearing.updateSession.useMutation();

  useEffect(() => {
    if (!props.session) return;
    setDecisionResult(props.session.decision_result || 'قبول التلقي وإتمام العقد');
    setDecisionNotes(props.session.decision_notes || '');
    const r = props.session.referral_targets || null;
    if (r && typeof r === 'object') {
      setReferrals({
        regionalCouncil: Boolean(r.regionalCouncil ?? true),
        nationalAuthority: Boolean(r.nationalAuthority ?? true),
        notaryArchive: Boolean(r.notaryArchive ?? true),
      });
    }
  }, [props.session?.id]);

  if (!props.session) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
        <p className="font-bold text-slate-800">اختر جلسة أولاً.</p>
      </div>
    );
  }

  if (props.isLoading) return <div className="text-center text-slate-500 p-6">جاري تحميل...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fadeIn pb-10">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">إصدار القرار والإحالة السحابية</h2>
        <div className="h-1.5 w-32 bg-emerald-600 mx-auto rounded-full"></div>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          المرحلة النهائية: توثيق نتيجة التلقي العدلي وتفعيل مسارات الأرشفة والمصادقة الرقمية
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Decision Form */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-4">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">⚖️</span>
              المنطوق والملاحظات القانونية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">خلاصة القرار العدلي</label>
                <div className="relative group">
                  <select
                    value={decisionResult}
                    onChange={(e) => setDecisionResult(e.target.value)}
                    className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-700 focus:bg-white focus:border-emerald-500 hover:border-slate-300 outline-none transition-all appearance-none"
                  >
                    <option>قبول التلقي وإتمام العقد</option>
                    <option>تأجيل الجلسة لاستكمال الوثائق</option>
                    <option>رفض التلقي لعدم اليقين من الهوية</option>
                    <option>إحالة الملف للقضاء</option>
                  </select>
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">تحديث الحالة الإدارية</label>
                <div className="relative group">
                  <select
                    value={props.session.status || 'scheduled'}
                    onChange={async (e) => {
                      await update.mutateAsync({ sessionToken: props.sessionToken, sessionId: props.session.id, status: e.target.value as any });
                      props.onChanged();
                    }}
                    className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-700 focus:bg-white focus:border-emerald-500 hover:border-slate-300 outline-none transition-all appearance-none"
                  >
                    <option value="scheduled">قيد الانتظار</option>
                    <option value="waiting_identity">تحقق الهوية</option>
                    <option value="in_progress">جلسة مفتوحة</option>
                    <option value="paused">متوقفة مؤقتاً</option>
                    <option value="completed">مكتملة ونهائية</option>
                    <option value="cancelled">ملغاة رسمياً</option>
                  </select>
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">مذكرات تكميلية للقرار</label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full min-h-[160px] p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none placeholder:text-slate-300"
                placeholder="أضف تفاصيل إضافية حول القبول أو الرفض، الشروط القانونية، أو توصيات الإحالة..."
              />
            </div>
          </div>

          {/* Referral Targets */}
          <div className="bg-slate-900/5 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/50">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-4">
              <span className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">🔗</span>
              مسارات الإرسال الآلي (API Referrals)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right" dir="rtl">
              <label className={`group relative p-6 rounded-3xl border-2 transition-all cursor-pointer ${referrals.regionalCouncil ? 'bg-white border-emerald-500 shadow-xl' : 'bg-white/40 border-transparent hover:bg-white hover:border-slate-200'}`}>
                <input
                  type="checkbox"
                  className="absolute left-4 top-4 w-6 h-6 rounded-lg text-emerald-600 focus:ring-emerald-500"
                  checked={referrals.regionalCouncil}
                  onChange={(e) => setReferrals((p) => ({ ...p, regionalCouncil: e.target.checked }))}
                />
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">🏛️</div>
                <p className="text-base font-black text-slate-800">المجلس الجهوي</p>
                <p className="text-xs font-bold text-slate-400 mt-1">المصادقة الرقابية</p>
              </label>

              <label className={`group relative p-6 rounded-3xl border-2 transition-all cursor-pointer ${referrals.nationalAuthority ? 'bg-white border-blue-500 shadow-xl' : 'bg-white/40 border-transparent hover:bg-white hover:border-slate-200'}`}>
                <input
                  type="checkbox"
                  className="absolute left-4 top-4 w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
                  checked={referrals.nationalAuthority}
                  onChange={(e) => setReferrals((p) => ({ ...p, nationalAuthority: e.target.checked }))}
                />
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                <p className="text-base font-black text-slate-800">الهيئة الوطنية</p>
                <p className="text-xs font-bold text-slate-400 mt-1">الرصد الإحصائي الوطني</p>
              </label>

              <label className={`group relative p-6 rounded-3xl border-2 transition-all cursor-pointer ${referrals.notaryArchive ? 'bg-white border-slate-500 shadow-xl' : 'bg-white/40 border-transparent hover:bg-white hover:border-slate-200'}`}>
                <input
                  type="checkbox"
                  className="absolute left-4 top-4 w-6 h-6 rounded-lg text-slate-600 focus:ring-slate-500"
                  checked={referrals.notaryArchive}
                  onChange={(e) => setReferrals((p) => ({ ...p, notaryArchive: e.target.checked }))}
                />
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                <p className="text-base font-black text-slate-800">أرشيف العدل</p>
                <p className="text-xs font-bold text-slate-400 mt-1">الحفظ السحابي المشفر</p>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             
             <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">بطاقة مرجع الجلسة</h4>
             
             <div className="space-y-8 text-right">
                <div>
                   <span className="text-slate-400 text-sm block mb-1">الرقم المرجعي للجلسة</span>
                   <span className="text-2xl font-mono font-black tracking-widest text-emerald-50 italic">{props.session.session_number}</span>
                </div>
                
                <div className="h-px bg-white/10"></div>
                
                <div>
                   <span className="text-slate-400 text-sm block mb-1">طبيعة العقد/المرجع</span>
                   <span className="text-lg font-bold block">{props.session.legal_reference || 'غير محدد'}</span>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">حالة التوثيق</span>
                      <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md font-bold">نشط</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">سلامة البيانات</span>
                      <span className="px-2 py-0.5 bg-blue-500 text-white rounded-md font-bold">مؤمنة</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="p-2">
            {update.error && (
              <div className="p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-sm font-black mb-6 animate-shake">
                ⚠️ فشل في المزامنة: {String((update.error as any).message || update.error)}
              </div>
            )}

            <button
              disabled={update.isPending}
              onClick={async () => {
                await update.mutateAsync({
                  sessionToken: props.sessionToken,
                  sessionId: props.session.id,
                  decisionResult,
                  decisionNotes,
                  referralTargets: referrals,
                  status: 'completed',
                });
                props.onChanged();
              }}
              className="w-full group relative overflow-hidden flex flex-col items-center justify-center p-8 bg-emerald-600 text-white rounded-[2.5rem] font-black shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
              
              <span className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-500">🚀</span>
              <span className="text-xl">
                {update.isPending ? 'جاري التنفيذ...' : 'تنفيذ القرار النهائي'}
              </span>
              <span className="text-[10px] uppercase tracking-widest mt-2 opacity-60">ختم ومزامنة الملف</span>
            </button>
            
            <p className="mt-6 text-center text-slate-400 text-[11px] font-bold leading-relaxed px-4">
              بالضغط على "تنفيذ"، سيتم قفل الجلسة وإرسال البيانات المشفرة إلى الجهات المعتمدة المختارة. هذا الإجراء غير قابل للتراجع.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

