import React, { useState } from 'react';
import type { DocumentWizardProps } from '../../types';
import {
  Step1_Divorce_JudicialDetails,
  Step2_Divorce_Spouses,
  Step3_Divorce_MarriageDetails,
  Step4_Divorce_Summary
} from '../../../../modules/DivorceSteps';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { SmartDivorceClassificationGate } from './SmartDivorceClassificationGate';
import { NationalDivorceStatsModal } from './NationalDivorceStatsModal';
import { RevocableDivorceWorkflow } from './RevocableDivorceWorkflow';
import { KhulDivorceWorkflow } from './KhulDivorceWorkflow';
import { TamlikDivorceWorkflow } from './TamlikDivorceWorkflow';
import { ConsensualDivorceWorkflow } from './ConsensualDivorceWorkflow';
import { DiscordDivorceWorkflow } from './DiscordDivorceWorkflow';
import { CompletedThreeDivorceWorkflow } from './CompletedThreeDivorceWorkflow';
import type { DivorceClassificationType, DivorceStatisticalCode } from '../../../../types/feesAgentTypes';

export const DivorceWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const [showGateOverride, setShowGateOverride] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [consummationConfirmed, setConsummationConfirmed] = useState<boolean>(false);
  const [consummationAnswer, setConsummationAnswer] = useState<'yes' | 'no' | null>(null);

  const isGateOpen = showGateOverride || !state.divorceClassification?.confirmedAt;

  if (isGateOpen) {
    return (
      <div className="w-full">
        <SmartDivorceClassificationGate
          state={state}
          setState={setState}
          onConfirm={() => {
            setShowGateOverride(false);
            setConsummationConfirmed(false);
            setConsummationAnswer(null);
          }}
          onCancel={state.divorceClassification?.confirmedAt ? () => setShowGateOverride(false) : onBack}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 💍 INTERSTITIAL: واقعة البناء والدخول
  // Shown once after classification is confirmed, before any guided workflow
  // ──────────────────────────────────────────────────────────────────────────
  const primaryType = state.divorceClassification?.primaryType;
  const workflowTypes: DivorceClassificationType[] = [
    'revocable', 'khul', 'tamlik', 'consensual', 'discord', 'completed_three'
  ];
  const isWorkflowType = primaryType && workflowTypes.includes(primaryType);

  if (isWorkflowType && !consummationConfirmed && state.step < 7) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 px-4 font-sans animate-fadeIn" dir="rtl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-xl border border-blue-900/40 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💍</span>
            <div>
              <h2 className="text-lg font-extrabold">التحقق من واقعة البناء والدخول</h2>
              <p className="text-blue-200 text-xs mt-0.5">
                خطوة تمهيدية لازمة قبل الشروع في استكمال بيانات الرسم
              </p>
            </div>
          </div>
        </div>

        {/* ⚠️ تنبيه توثيقي هام: انقضاء الأجل القانوني للإذن بالإشهاد (المادة 87 من مدونة الأسرة) */}
        {primaryType && ['consensual', 'revocable', 'khul', 'tamlik'].includes(primaryType) && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-400 text-amber-950 shadow-md space-y-3 font-sans">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  تنبيه توثيقي هام: انقضاء الأجل القانوني للإذن بالإشهاد (المادة 87 من مدونة الأسرة)
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                  <strong>أخي العدل:</strong> يُرجى التحقق الدقيق من تاريخ صدور الإذن القضائي قبل الشروع في تلقي الشهادة بالإشهاد، حيث سقوط الإذن يتم بقوة القانون (بقوة النص) بمضي 15 يوماً كاملة دون الإشهاد.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/80">
              <span className="text-xs font-bold text-amber-950 block mb-2">
                أنواع الإشهادات المشمولة حتماً بأجل 15 يوماً:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    primaryType === 'revocable'
                      ? 'bg-amber-100/90 border-amber-500 font-bold text-amber-950 ring-1 ring-amber-400 shadow-sm'
                      : 'bg-white/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🔹</span>
                    <span>الطلاق بالإرادة المنفردة للزوج (المادة 78 وما يليها)</span>
                  </div>
                  {primaryType === 'revocable' && (
                    <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                      المسار الحالي
                    </span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    primaryType === 'consensual'
                      ? 'bg-amber-100/90 border-amber-500 font-bold text-amber-950 ring-1 ring-amber-400 shadow-sm'
                      : 'bg-white/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🔹</span>
                    <span>الطلاق الاتفاقي (المادة 114)</span>
                  </div>
                  {primaryType === 'consensual' && (
                    <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                      المسار الحالي
                    </span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    primaryType === 'khul'
                      ? 'bg-amber-100/90 border-amber-500 font-bold text-amber-950 ring-1 ring-amber-400 shadow-sm'
                      : 'bg-white/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🔹</span>
                    <span>الطلاق الخلعي بالتراضي (المادة 115)</span>
                  </div>
                  {primaryType === 'khul' && (
                    <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                      المسار الحالي
                    </span>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    primaryType === 'tamlik'
                      ? 'bg-amber-100/90 border-amber-500 font-bold text-amber-950 ring-1 ring-amber-400 shadow-sm'
                      : 'bg-white/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>🔹</span>
                    <span>طلاق التمليك / المُمَلَّك (المادة 89)</span>
                  </div>
                  {primaryType === 'tamlik' && (
                    <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                      المسار الحالي
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Intro */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-blue-600 text-xl flex-shrink-0 mt-0.5">⚖️</span>
            <div className="text-sm text-blue-900 leading-relaxed">
              <span className="font-bold block mb-1">حالة الزوجين من حيث البناء والدخول</span>
              يرجى تحديد ما إذا كان الطلاق موضوع الرسم قد وقع قبل الدخول أو بعده، إذ يترتب على ذلك اختلاف في الآثار الشرعية والمستحقات المالية المترتبة.
            </div>
          </div>

          {/* Question */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-800">هل حصل البناء / الدخول بالزوجة؟</p>

            {/* Option YES */}
            <button
              type="button"
              onClick={() => setConsummationAnswer('yes')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-right transition-all duration-150 ${
                consummationAnswer === 'yes'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400 hover:bg-emerald-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  consummationAnswer === 'yes' ? 'border-white bg-white' : 'border-gray-400'
                }`}
              >
                {consummationAnswer === 'yes' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block" />
                )}
              </span>
              <div>
                <span className="font-bold text-sm block">نعم — بعد الدخول والبناء</span>
                <span
                  className={`text-xs block mt-0.5 ${
                    consummationAnswer === 'yes' ? 'text-emerald-100' : 'text-gray-500'
                  }`}
                >
                  الطلاق واقع بعد الدخول الفعلي بالزوجة، وتترتب على ذلك كافة الآثار الشرعية والمالية الكاملة.
                </span>
              </div>
            </button>

            {/* Option NO */}
            <button
              type="button"
              onClick={() => setConsummationAnswer('no')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-right transition-all duration-150 ${
                consummationAnswer === 'no'
                  ? 'bg-amber-600 border-amber-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-800 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  consummationAnswer === 'no' ? 'border-white bg-white' : 'border-gray-400'
                }`}
              >
                {consummationAnswer === 'no' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 block" />
                )}
              </span>
              <div>
                <span className="font-bold text-sm block">لا — قبل الدخول والبناء</span>
                <span
                  className={`text-xs block mt-0.5 ${
                    consummationAnswer === 'no' ? 'text-amber-100' : 'text-gray-500'
                  }`}
                >
                  الطلاق واقع قبل حصول الدخول الفعلي، ولها نصف الصداق المسمى ولا عدة عليها (المادة 71 من مدونة الأسرة).
                </span>
              </div>
            </button>
          </div>

          {/* Legal warning – before consummation */}
          {consummationAnswer === 'no' && (
            primaryType === 'revocable' ? (
              <div className="flex items-start gap-2.5 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-950 shadow-sm animate-fadeIn">
                <span className="text-rose-600 text-lg flex-shrink-0">🛑</span>
                <div className="leading-relaxed">
                  <span className="font-extrabold text-rose-900 block mb-1">تحذير تكييف قانوني:</span>
                  اخترتم طلاقاً قبل الدخول. ينبه النظام إلى أن الطلاق قبل البناء بائن بينونة صغرى بقوة القانون (المادة 123)، ولا تنطبق عليه أحكام الرجعة. يرجى تحويل المسطرة لبيت الطلاق الاتفاقي أو البائن.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="text-amber-600 text-base flex-shrink-0">⚠️</span>
                <div className="leading-relaxed">
                  <span className="font-bold block mb-0.5">تنبيه قانوني — المادة 71 من مدونة الأسرة:</span>
                  الطلاق قبل الدخول يخوّل الزوجةَ نصفَ الصداق المسمى فقط إن كان قد سُمّي، أو المتعة المناسبة إن لم يُسمَّ. كما لا تجب عليها عدة ولا نفقة عدة، ولا تحسب طلقة من حق الزوج.
                </div>
              </div>
            )
          )}

          {/* Confirm */}
          <button
            type="button"
            disabled={!consummationAnswer}
            onClick={() => {
              setState((prev) => ({
                ...prev,
                divorceClassification: prev.divorceClassification
                  ? {
                      ...prev.divorceClassification,
                      consummationStatus:
                        consummationAnswer === 'yes'
                          ? ('after_consummation' as const)
                          : ('before_consummation' as const)
                    }
                  : prev.divorceClassification
              }));
              setConsummationConfirmed(true);
            }}
            className={`w-full py-3 rounded-xl text-sm font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 ${
              consummationAnswer
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>تسجيل الإجابة والانتقال إلى بيانات الرسم</span>
            <span>←</span>
          </button>
        </div>
      </div>
    );
  }

  // Active classification summary for persistent header
  const classification = state.divorceClassification;

  // 🏛️ Dedicated 14-Stage Complete Legal Workflow for الطلاق الرجعي (D-03)
  if (classification?.primaryType === 'revocable' && state.step < 7) {
    return (
      <div className="w-full">
        <RevocableDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  // 🏛️ Dedicated 22-Stage Complete Legal Workflow for الطلاق بالخلع (D-04)
  if (classification?.primaryType === 'khul' && state.step < 7) {
    return (
      <div className="w-full">
        <KhulDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  // 🏛️ Dedicated 19-Stage Complete Legal Workflow for الطلاق المملك (D-05)
  if (classification?.primaryType === 'tamlik' && state.step < 7) {
    return (
      <div className="w-full">
        <TamlikDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  // 🏛️ Dedicated 14-Stage Complete Legal Workflow for الطلاق الاتفاقي (D-01)
  if (classification?.primaryType === 'consensual' && state.step < 7) {
    return (
      <div className="w-full">
        <ConsensualDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  // 🏛️ Dedicated 14-Stage Complete Legal Workflow for التطليق للشقاق (D-02)
  if (classification?.primaryType === 'discord' && state.step < 7) {
    return (
      <div className="w-full">
        <DiscordDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  // 🏛️ Dedicated 14-Stage Complete Legal Workflow for الطلاق المكمل للثلاث (D-08)
  if (classification?.primaryType === 'completed_three' && state.step < 7) {
    return (
      <div className="w-full">
        <CompletedThreeDivorceWorkflow
          state={state}
          setState={setState}
          onComplete={() => {
            setState((prev) => ({ ...prev, step: 7 }));
          }}
          onBackToClassification={() => setShowGateOverride(true)}
        />
      </div>
    );
  }

  const classificationDetails: Record<
    DivorceClassificationType,
    { title: string; code: DivorceStatisticalCode; badge: string; color: string; icon: string }
  > = {
    consensual: {
      title: 'الطلاق الاتفاقي',
      code: 'D-01',
      badge: 'مسار اتفاقي',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🤝'
    },
    discord: {
      title: 'التطليق للشقاق',
      code: 'D-02',
      badge: 'مسطرة قضائية',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: '⚖️'
    },
    completed_three: {
      title: 'الطلاق المكمل للثلاث',
      code: 'D-08',
      badge: 'بائن بينونة كبرى',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: '🛑'
    },
    revocable: {
      title: 'الطلاق الرجعي',
      code: 'D-03',
      badge: classification?.divorceCount === 'second' ? 'طلقة ثانية' : 'طلقة أولى',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: '🔄'
    },
    khul: {
      title: 'الطلاق الخلعي',
      code: 'D-04',
      badge: classification?.khulDetails?.compensationAmount
        ? `${classification.khulDetails.compensationAmount.toLocaleString('ar-MA')} درهم`
        : 'على بدل',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: '💰'
    },
    tamlik: {
      title: 'الطلاق المملك',
      code: 'D-05',
      badge: classification?.tamlikBasis?.deedNumber
        ? `سند تمليك رقم ${classification.tamlikBasis.deedNumber}`
        : 'المادة 89',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '👩'
    },
    revocation_return: {
      title: 'رسم الرجعة أو المراجعة',
      code: 'D-06',
      badge:
        classification?.returnRevocation?.scenario === 'khul_reconciliation'
          ? 'مراجعة بعد خلع'
          : 'رجعة في عدة',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🔁'
    },
    rajah: {
      title: 'رسم الرجعة',
      code: 'D-06',
      badge: classification?.rajahDetails?.iddahConfirmed ? 'داخل العدة' : 'إشهاد رجعة',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🔁'
    },
    murajaah: {
      title: 'رسم المراجعة',
      code: 'D-07',
      badge: classification?.murajaahDetails?.dowryAmount
        ? `صداق: ${classification.murajaahDetails.dowryAmount} درهم`
        : 'عقد وصداق جديدان',
      color: 'bg-teal-100 text-teal-800 border-teal-300',
      icon: '💍'
    }
  };

  const currentInfo = classification?.primaryType
    ? classificationDetails[classification.primaryType]
    : classificationDetails.consensual;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Persistent Classification & Pathway Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
            {currentInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">المسار والنوع المعتمد:</span>
              <span className="text-sm font-bold text-gray-900">{currentInfo.title}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border">
                {currentInfo.code}
              </span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${currentInfo.color}`}>
                {currentInfo.badge}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              <span>
                تم تفعيل مُنشئ الشهادة الذكي واعتماد الكود المعياري الوطني ({currentInfo.code}) في
                الإحصائيات الرسمية
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {classification?.primaryType === 'revocable' && (
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>↩ مراجعة مراحل الطلاق الرجعي (14 مرحلة)</span>
            </button>
          )}
          {classification?.primaryType === 'khul' && (
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>↩ مراجعة مراحل الطلاق بالخلع (22 مرحلة)</span>
            </button>
          )}
          {classification?.primaryType === 'tamlik' && (
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>↩ مراجعة مراحل الطلاق المملك (19 مرحلة)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>📊 الإحصائيات الوطنية للطلاق</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGateOverride(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>⚙️ تعديل مسار الطلاق</span>
          </button>
        </div>
      </div>

      {state.step === 1 && <Step1_Divorce_JudicialDetails state={state} setState={setState} />}
      {state.step === 2 && <Step2_Divorce_Spouses state={state} setState={setState} />}
      {state.step === 3 && <Step3_Divorce_MarriageDetails state={state} setState={setState} />}
      {state.step === 4 && <Step4_Divorce_Summary state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}

      <NationalDivorceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};
