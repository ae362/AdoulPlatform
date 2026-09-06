import React from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Lock, 
  Scale, 
  FileSignature,
  Building
} from 'lucide-react';

export const PreSaveReviewModal = ({ isOpen, onClose, checks, setChecks, showRegistration, onConfirm }: any) => {
  if (!isOpen) return null;

  const allChecked =
    checks.inclusionComplete &&
    (checks.judgeNotesApplied || checks.noJudgeNotes) &&
    (!showRegistration || checks.registrationConfirmed) &&
    checks.finalClosure;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[2rem] border border-slate-200 shadow-[0_50px_100px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-2xl font-black text-slate-900 font-amiri">نافذة: المراجعة النهائية قبل اعتماد الرسم</h3>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-emerald-900">🟢 أولًا: اكتمال بيانات التضمين</div>
                <div className="text-emerald-900/90 font-bold leading-relaxed">
                  ✔ أيقونة خضراء – تأكيد مهني
                  <div className="mt-2">
                    نلتمس منكم التفضل بإعادة النظر في جميع خانات وحقول التضمين الإلكتروني، والتأكد من إدراج البيانات كاملةً دون سهو أو نقص، بما يعكس مضمون السند على وجه الدقة والتمام.
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-emerald-600"
                    checked={checks.inclusionComplete}
                    onChange={(e) => setChecks({ ...checks, inclusionComplete: e.target.checked })}
                  />
                  <span className="font-black text-sm text-emerald-900">☐ أُقرّ بأنني راجعت جميع بيانات التضمين وتأكدت من اكتمالها وصحتها.</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-amber-100 bg-amber-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-amber-900">🟡 ثانيًا: ملاحظات قاضي التوثيق</div>
                <div className="text-amber-900/90 font-bold leading-relaxed">
                  ⚖ أيقونة ذهبية – مسؤولية مهنية
                  <div className="mt-2">
                    إذا كانت قد صدرت عن السيد قاضي التوثيق ملاحظات أو توجيهات بخصوص هذا الرسم، يرجى التأكد من إدراج جميع التصحيحات والإضافات المشار إليها، إذ ستتم مقارنة النسخة المعتمدة بالمسودة المحفوظة لديه خلال مرحلة الخطاب.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-amber-600"
                      checked={checks.judgeNotesApplied}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChecks({ ...checks, judgeNotesApplied: checked, noJudgeNotes: checked ? false : checks.noJudgeNotes });
                      }}
                    />
                    <span className="font-black text-sm text-amber-900">☐ أؤكد أنني اطلعت على ملاحظات قاضي التوثيق وأدرجت ما يلزم من تصحيحات.</span>
                  </label>

                  <div className="text-xs font-black text-slate-400 pr-8">أو</div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-amber-600"
                      checked={checks.noJudgeNotes}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChecks({ ...checks, noJudgeNotes: checked, judgeNotesApplied: checked ? false : checks.judgeNotesApplied });
                      }}
                    />
                    <span className="font-black text-sm text-amber-900">☐ لا توجد ملاحظات سابقة تتعلق بهذا الرسم.</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {showRegistration && (
            <div className="p-6 rounded-2xl border border-orange-100 bg-orange-50/60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-3">
                  <div className="text-lg font-black text-orange-900">🟠 ثالثًا (يظهر فقط إذا كان الرسم خاضعًا للتسجيل)</div>
                  <div className="text-orange-900/90 font-bold leading-relaxed">
                    🏛 أيقونة إدارية برتقالية – تنبيه مالي
                    <div className="mt-2">
                      تبين أن هذا الرسم يندرج ضمن الرسوم الخاضعة لإجراءات التسجيل. وعليه، يرجى التحقق بعناية من استيفاء متطلبات التسجيل وفق الضوابط الجاري بها العمل، ومراجعة صحة الأرقام والمبالغ والمراجع المالية المدرجة بالرسم، إذ إن أي عدم دقة فيها قد يترتب عنه مؤاخذات أو غرامات من طرف مصلحة التسجيل المختصة.
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-orange-600"
                      checked={checks.registrationConfirmed}
                      onChange={(e) => setChecks({ ...checks, registrationConfirmed: e.target.checked })}
                    />
                    <span className="font-black text-sm text-orange-900">☐ أؤكد أنني تحققت من خضوع الرسم لإجراءات التسجيل ومن دقة بياناته الرقمية والمراجع المالية.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-3">
                <div className="text-lg font-black text-red-900">🔴 رابعًا: الإغلاق النهائي للرسم</div>
                <div className="text-red-900/90 font-bold leading-relaxed">
                  🔒 أيقونة حمراء هادئة – أثر قانوني
                  <div className="mt-2">
                    يرجى العلم أن اعتماد الرسم للانتقال إلى مرحلة التوقيع سيجعله غير قابل للتعديل لاحقًا، إلا بواسطة ملحق إضافي وفق الضوابط القانونية المعمول بها.
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-red-600"
                    checked={checks.finalClosure}
                    onChange={(e) => setChecks({ ...checks, finalClosure: e.target.checked })}
                  />
                  <span className="font-black text-sm text-red-900">☐ أدرك أن أي تعديل بعد هذه المرحلة يستلزم ملحقًا إضافيًا.</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          {!allChecked && (
            <div className="mb-4 text-center text-sm font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4">
              يرجى استكمال عناصر المراجعة قبل المتابعة.
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-black text-sm text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            >
              ⬅ العودة للمراجعة
            </button>

            <button
              type="button"
              disabled={!allChecked}
              onClick={onConfirm}
              className={`px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${
                allChecked ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'bg-blue-300 cursor-not-allowed opacity-70'
              }`}
            >
              🖋 اعتماد الرسم والانتقال إلى توقيع العدلين
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
