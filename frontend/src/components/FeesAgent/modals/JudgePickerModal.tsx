import React from 'react';

export interface JudgeInfo {
  id: string;
  fullName: string;
  email?: string;
}

export interface JudgePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appellateCourt?: string;
  primaryCourt?: string;
  documentType?: string;
  judgePartyNames: string;
  manualJudgePartyNames: string;
  setManualJudgePartyNames: (val: string) => void;
  judgeDispatchDate: string;
  judgeDispatchTime: string;
  availableJudgesQuery: {
    data?: any;
    isFetching: boolean;
    error?: any;
  };
  selectedJudgeUserId: string;
  setSelectedJudgeUserId: (id: string) => void;
  handleSendToJudge: (judgeId: string) => void;
  isSubmittingToJudge: boolean;
  judgeSendError: string | null;
  judgeSendVisualPhase: 'idle' | 'launch' | 'transit' | 'success' | 'error';
  setJudgeSendVisualPhase: (phase: 'idle' | 'launch' | 'transit' | 'success' | 'error') => void;
  judgeSendStatusText: string;
  notaryProfile?: {
    appellate_court?: string;
    primary_court?: string;
  };
}

export const JudgePickerModal: React.FC<JudgePickerModalProps> = ({
  isOpen,
  onClose,
  appellateCourt,
  primaryCourt,
  documentType,
  judgePartyNames,
  manualJudgePartyNames,
  setManualJudgePartyNames,
  judgeDispatchDate,
  judgeDispatchTime,
  availableJudgesQuery,
  selectedJudgeUserId,
  setSelectedJudgeUserId,
  handleSendToJudge,
  isSubmittingToJudge,
  judgeSendError,
  judgeSendVisualPhase,
  setJudgeSendVisualPhase,
  judgeSendStatusText,
  notaryProfile,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <style>{`
            @keyframes judge-send-glow {
              0% { transform: translateX(0%); opacity: 0; }
              20% { opacity: .9; }
              100% { transform: translateX(220%); opacity: 0; }
            }
            @keyframes judge-send-doc-bob {
              0%, 100% { transform: translateX(0px) translateY(0px); }
              50% { transform: translateX(8px) translateY(-2px); }
            }
            @keyframes judge-send-arrow {
              0% { opacity: .25; transform: translateX(0); }
              50% { opacity: 1; transform: translateX(-4px); }
              100% { opacity: .25; transform: translateX(-8px); }
            }
            @keyframes judge-send-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: .85; }
            }
            @keyframes judge-send-shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(4px); }
              75% { transform: translateX(-4px); }
            }
          `}</style>
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="text-right">
              <h3 className="text-xl font-black text-slate-900">اختيار القاضي المكلف بالتدقيق</h3>
              <p className="mt-1 text-sm text-slate-500">
                سيتم اقتراح القضاة المرتبطين بمحكمة العدل أو الجهة نفسها قبل إرسال الرسم.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white"
            >
              إغلاق
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right md:grid-cols-2">
              <div>
                <div className="text-[11px] font-extrabold text-slate-500">محكمة الاستئناف</div>
                <div className="mt-1 text-sm font-bold text-slate-800">
                  {availableJudgesQuery.data?.appellateCourt ||
                    appellateCourt ||
                    notaryProfile?.appellate_court ||
                    'غير محدد'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-slate-500">المحكمة الابتدائية</div>
                <div className="mt-1 text-sm font-bold text-slate-800">
                  {availableJudgesQuery.data?.primaryCourt ||
                    primaryCourt ||
                    notaryProfile?.primary_court ||
                    'غير محدد'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-right md:grid-cols-3">
              <div className="md:col-span-3">
                <div className="text-[11px] font-extrabold text-emerald-700">أسماء الأطراف</div>
                {judgePartyNames ? (
                  <div className="mt-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">
                    {judgePartyNames}
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    <input
                      type="text"
                      dir="rtl"
                      value={manualJudgePartyNames}
                      onChange={(e) => setManualJudgePartyNames(e.target.value)}
                      placeholder="أدخل أسماء الأطراف مفصولة بفواصل"
                      className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                    />
                    <div className="text-xs font-semibold text-amber-700">
                      لم نجد أسماء أطراف مضمنة تلقائيًا، ويمكنك إدخالها يدويًا قبل الإرسال.
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-emerald-700">تاريخ الإرسال</div>
                <input
                  type="date"
                  value={judgeDispatchDate}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
                />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-emerald-700">وقت الإرسال</div>
                <input
                  type="time"
                  value={judgeDispatchTime}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
                />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-emerald-700">نوع الرسم</div>
                <div className="mt-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">
                  {documentType || 'غير محدد'}
                </div>
              </div>
            </div>

            {availableJudgesQuery.isFetching ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center text-sm font-bold text-blue-700">
                جاري تحميل القضاة المتاحين...
              </div>
            ) : availableJudgesQuery.error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-bold text-red-700">
                {availableJudgesQuery.error.message || 'حدث خطأ أثناء تحميل بيانات القضاة'}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-700">
                    {availableJudgesQuery.data?.source === 'regional_profiles'
                      ? 'جميع القضاة المرتبطين بجهة العدل ومحكمته'
                      : availableJudgesQuery.data?.source === 'regional_history'
                      ? 'القضاة المقترحون حسب نفس الجهة/المحكمة من السجل السابق'
                      : 'لا يوجد تطابق تاريخي واضح، تم عرض جميع القضاة المتاحين'}
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {(availableJudgesQuery.data?.judges ?? []).length} قاضٍ
                  </div>
                </div>

                {(availableJudgesQuery.data?.judges ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-center text-sm font-bold text-amber-800">
                    لم يتم العثور على قضاة مرتبطين بجهة العدل الحالية، ويمكن مراجعة بيانات المحكمة أولًا.
                  </div>
                ) : (
                  <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {(availableJudgesQuery.data?.judges ?? []).map((judge: JudgeInfo) => {
                      const selected = selectedJudgeUserId === judge.id;
                      return (
                        <button
                          key={judge.id}
                          type="button"
                          onClick={() => setSelectedJudgeUserId(judge.id)}
                          className={`w-full rounded-2xl border px-4 py-4 text-right transition-all ${
                            selected
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                                selected
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-extrabold text-slate-900">{judge.fullName}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {judge.email || 'بلا بريد إلكتروني ظاهر'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {judgeSendError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-right text-sm font-bold text-rose-700">
                {judgeSendError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingToJudge}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleSendToJudge(selectedJudgeUserId)}
                disabled={
                  !selectedJudgeUserId ||
                  isSubmittingToJudge ||
                  judgeSendVisualPhase === 'success' ||
                  availableJudgesQuery.isFetching ||
                  (!judgePartyNames && !manualJudgePartyNames.trim())
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {judgeSendVisualPhase === 'launch'
                  ? 'جاري تجهيز الإرسال...'
                  : judgeSendVisualPhase === 'transit'
                  ? 'جاري نقل الرسم...'
                  : judgeSendVisualPhase === 'success'
                  ? 'تم الإرسال بنجاح'
                  : isSubmittingToJudge
                  ? 'جاري الإرسال...'
                  : 'إرسال إلى القاضي المختار'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Transfer Overlay */}
      {judgeSendVisualPhase !== 'idle' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4">
          <div
            className={`w-full max-w-xl rounded-[2rem] border p-6 shadow-2xl transition-all duration-500 ${
              judgeSendVisualPhase === 'success'
                ? 'border-emerald-200 bg-white'
                : judgeSendVisualPhase === 'error'
                ? 'border-rose-200 bg-white'
                : 'border-sky-200 bg-white'
            }`}
          >
            <div className="text-right">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {judgeSendVisualPhase === 'launch'
                  ? 'مرحلة الانطلاق'
                  : judgeSendVisualPhase === 'transit'
                  ? 'مرحلة النقل'
                  : judgeSendVisualPhase === 'success'
                  ? 'تأكيد الوصول'
                  : 'تعذر الإرسال'}
              </div>
              <div
                className={`mt-2 text-lg font-extrabold ${
                  judgeSendVisualPhase === 'success'
                    ? 'text-emerald-700'
                    : judgeSendVisualPhase === 'error'
                    ? 'text-rose-700'
                    : 'text-sky-800'
                }`}
              >
                {judgeSendStatusText}
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-slate-50 px-5 py-6 shadow-inner">
              <div className="flex items-center gap-4">
                <div
                  className="text-4xl"
                  style={{
                    animation:
                      judgeSendVisualPhase === 'launch' || judgeSendVisualPhase === 'transit'
                        ? 'judge-send-doc-bob 1.4s ease-in-out infinite'
                        : undefined,
                  }}
                >
                  📜
                </div>
                <div
                  className={`text-4xl ${
                    judgeSendVisualPhase === 'error' ? 'text-rose-600' : 'text-sky-600'
                  }`}
                  style={{
                    animation:
                      judgeSendVisualPhase === 'error'
                        ? 'judge-send-shake .35s ease-in-out 2'
                        : undefined,
                  }}
                >
                  {judgeSendVisualPhase === 'error' ? '✖️' : '📤'}
                </div>

                <div className="relative flex-1 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      judgeSendVisualPhase === 'success'
                        ? 'bg-emerald-300'
                        : judgeSendVisualPhase === 'error'
                        ? 'bg-rose-200'
                        : 'bg-sky-100'
                    }`}
                  />
                  {(judgeSendVisualPhase === 'launch' || judgeSendVisualPhase === 'transit') && (
                    <>
                      <div
                        className="absolute inset-y-0 right-0 w-20 rounded-full bg-gradient-to-l from-sky-400/0 via-sky-300 to-sky-400/0"
                        style={{ animation: 'judge-send-glow 1.5s linear infinite' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 text-sky-500">
                        {['→', '→', '→'].map((arrow, idx) => (
                          <span
                            key={`${arrow}-${idx}`}
                            className="text-base font-black"
                            style={{
                              animation: `judge-send-arrow .9s ease-in-out ${idx * 0.12}s infinite`,
                            }}
                          >
                            {arrow}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative text-4xl">
                  <span>🏛️</span>
                  {judgeSendVisualPhase === 'success' && (
                    <span
                      className="absolute -right-3 -top-3 text-2xl"
                      style={{ animation: 'judge-send-pulse .9s ease-in-out infinite' }}
                    >
                      ✔️
                    </span>
                  )}
                </div>
              </div>
            </div>

            {judgeSendError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-right text-sm font-bold text-rose-700">
                {judgeSendError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                {judgeSendVisualPhase === 'transit'
                  ? 'Live Transfer'
                  : judgeSendVisualPhase === 'success'
                  ? 'Completed'
                  : judgeSendVisualPhase === 'error'
                  ? 'Failed'
                  : 'Preparing'}
              </div>
              {judgeSendVisualPhase === 'error' && (
                <button
                  type="button"
                  onClick={() => setJudgeSendVisualPhase('idle')}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  العودة إلى الاختيار
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

