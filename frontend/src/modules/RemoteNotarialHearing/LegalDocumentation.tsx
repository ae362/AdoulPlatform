import React, { useMemo } from 'react';

export default function LegalDocumentation(props: {
  sessionToken: string;
  session: any | null;
  participants: any[];
  identityChecks: any[];
  recordings: any[];
}) {
  const parties = useMemo(() => props.participants.filter((p) => String(p.participant_role) === 'party'), [props.participants]);

  const attendanceSummary = useMemo(() => {
    const names = props.participants.map((p) => p.full_name).filter(Boolean);
    return names.length ? names.join('، ') : '—';
  }, [props.participants]);

  const identitySummary = useMemo(() => {
    const passed = props.identityChecks.filter((c) => c.result_status === 'passed').length;
    const failed = props.identityChecks.filter((c) => c.result_status === 'failed').length;
    const pending = props.identityChecks.length - passed - failed;
    return { passed, failed, pending };
  }, [props.identityChecks]);

  const recordingOk = props.recordings.some((r) => r.status === 'completed' && (r.file_url || r.storage_path));
  const scheduledAt = props.session?.scheduled_at ? new Date(props.session.scheduled_at) : null;
  const startedAt = props.session?.started_at ? new Date(props.session.started_at) : null;
  const endedAt = props.session?.ended_at ? new Date(props.session.ended_at) : null;

  if (!props.session) {
    return (
      <div className="max-w-4xl mx-auto p-16 bg-white/70 backdrop-blur-xl rounded-[3rem] border border-white/40 shadow-2xl flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner">📄</div>
        <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">التوثيق العدلي غير متاح</h2>
        <p className="text-slate-400 font-bold max-w-sm">يرجى اختيار جلسة نشطة لعرض مسودة المحضر القانوني وسجلات التسجيل.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fadeIn p-2 pb-20">
      <div className="flex justify-between items-center flex-wrap gap-6 bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] border border-white/40 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="w-14 h-14 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner border border-emerald-100">⚖️</span>
            التوثيق القانوني والأرشفة
          </h2>
          <p className="text-slate-400 text-sm font-bold mt-2 pr-1 tracking-wide uppercase">تحرير محضر الجلسة والمصادقة على التسجيلات الرقمية</p>
        </div>
        <div className="flex gap-4">
          <button disabled className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs border border-slate-200 cursor-not-allowed opacity-60">
            تحميل سجل الفيديو
          </button>
          <button disabled className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-600/20 cursor-not-allowed opacity-60 flex items-center gap-3">
            <span>تصدير المحضر الرسمي (PDF)</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[8px]">SOON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Modern Document Viewer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-16 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 min-h-[800px] relative overflow-hidden font-serif rtl leading-[2.5]">
            {/* Watermark Pattern */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] rotate-12 pointer-events-none select-none">
              <div className="grid grid-cols-2 gap-40">
                <span className="text-9xl font-black whitespace-nowrap">المملكة المغربية</span>
                <span className="text-9xl font-black whitespace-nowrap">وزارة العدل</span>
              </div>
            </div>

            <div className="flex justify-between items-start mb-16 border-b-2 border-slate-900 pb-10">
              <div className="space-y-1">
                <p className="text-lg font-black text-slate-900">المملكة المغربية</p>
                <p className="text-sm font-bold text-slate-600">هيئة العدول بالمملكة</p>
                <p className="text-sm font-bold text-slate-600">المكتب العدلي الرقمي</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center text-4xl mb-3 shadow-inner">⚖️</div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">محضر تلقي</h3>
              </div>
              <div className="text-left space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">SESSION_REF</p>
                <p className="font-mono font-black text-slate-900 text-base">{props.session.session_number}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ARCHIVE_HASH: AFC8...F12</p>
              </div>
            </div>

            <div className="space-y-10 text-slate-800">
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">أولاً: بيانات الجلسة</div>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-2 gap-8 text-sm p-8 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-400 font-bold">الموعد المبرمج:</span>
                    <span className="font-mono font-black">{scheduledAt ? scheduledAt.toLocaleString('fr-FR') : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-400 font-bold">الخطة التوثيقية:</span>
                    <span className="font-black text-emerald-700">{props.session.scenario_plan ? `خطة رقم ${props.session.scenario_plan}` : 'اعتيادية'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-400 font-bold">وقت بدء البث:</span>
                    <span className="font-mono font-black text-blue-600">{startedAt ? startedAt.toLocaleTimeString('fr-FR') : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-400 font-bold">وقت الإغلاق:</span>
                    <span className="font-mono font-black text-rose-600">{endedAt ? endedAt.toLocaleTimeString('fr-FR') : '—'}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">ثانياً: الارتباط القانوني</div>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm italic text-slate-600 leading-loose">
                  {props.session.legal_reference || 'لم يتم تحديد مرجع قانوني لهذه الجلسة.'}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">ثالثاً: سجل الحضور الرقمي</div>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>
                <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 text-base font-black text-slate-700">
                  {attendanceSummary}
                </div>
              </section>

              <div className="pt-20 text-center space-y-4 opacity-40 grayscale translate-y-10 group-hover:translate-y-0 transition-transform">
                <div className="inline-block px-10 py-4 border-2 border-dashed border-slate-300 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">ختم الكتروني مؤقت</p>
                  <p className="text-xs font-bold text-slate-500">هذه الوثيقة مسودة رقمية بانتظار التوقيع العدلي النهائي</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Status Summary */}
        <div className="lg:col-span-4 space-y-8 h-fit sticky top-6">
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/40 shadow-2xl space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">📊</div>
              <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">إحصائيات الهوية</h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-emerald-50 transition-colors">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600">تم الاعتماد</div>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black text-slate-900 group-hover:text-emerald-700">{identitySummary.passed}</div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">✅</div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-amber-50 transition-colors">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-amber-600">بانتظار التحقق</div>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black text-slate-900 group-hover:text-amber-700">{identitySummary.pending}</div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">⏳</div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-rose-50 transition-colors">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-rose-600">فشل التحقق</div>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black text-slate-900 group-hover:text-rose-700">{identitySummary.failed}</div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm">❌</div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className={`p-6 rounded-3xl flex items-center gap-4 transition-all ${recordingOk ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-50 text-slate-400'}`}>
                <div className={`text-2xl ${recordingOk ? 'animate-pulse' : ''}`}>{recordingOk ? '🎥' : '📽️'}</div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-60">حالة ملف الوسائط</div>
                  <div className="text-xs font-black">{recordingOk ? 'التسجيل جاهز للأرشفة' : 'لا يوجد تسجيل حالياً'}</div>
                </div>
                {recordingOk && <div className="mr-auto text-xl">✓</div>}
              </div>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-x-10 -translate-y-10 blur-2xl"></div>
            <div className="relative z-10">
              <h5 className="font-black text-base mb-3 leading-tight">جاهز للمصادقة؟</h5>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-6 italic">
                بمجرد إغلاق الجلسة، سيتم رزم كافة المرفقات (فيديو، صور بيومترية، محضر) في سجل عدلي مشفر غير قابل للتغيير.
              </p>
              <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                <span>إصدار الوثيقة النهائية</span>
                <span className="text-lg">⚖️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
