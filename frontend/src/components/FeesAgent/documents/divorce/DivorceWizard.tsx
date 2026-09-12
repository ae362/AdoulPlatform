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
import type { DivorceClassificationType, DivorceStatisticalCode } from '../../../../types/feesAgentTypes';

export const DivorceWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const [showGateOverride, setShowGateOverride] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  const isGateOpen = showGateOverride || !state.divorceClassification?.confirmedAt;

  if (isGateOpen) {
    return (
      <div className="w-full">
        <SmartDivorceClassificationGate
          state={state}
          setState={setState}
          onConfirm={() => setShowGateOverride(false)}
          onCancel={state.divorceClassification?.confirmedAt ? () => setShowGateOverride(false) : onBack}
        />
      </div>
    );
  }

  // Active classification summary for persistent header
  const classification = state.divorceClassification;
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
      title: 'الطلاق للشقاق',
      code: 'D-02',
      badge: 'مسطرة قضائية',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: '⚖️'
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
      badge: classification?.khulDetails?.compensationAmount ? `${classification.khulDetails.compensationAmount.toLocaleString('ar-MA')} درهم` : 'على بدل',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: '💰'
    },
    tamlik: {
      title: 'الطلاق المملك',
      code: 'D-05',
      badge: classification?.tamlikBasis?.deedNumber ? `سند تمليك رقم ${classification.tamlikBasis.deedNumber}` : 'المادة 89',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '👩'
    },
    revocation_return: {
      title: 'رسم الرجعة أو المراجعة',
      code: 'D-06',
      badge: classification?.returnRevocation?.scenario === 'khul_reconciliation' ? 'مراجعة بعد خلع' : 'رجعة في عدة',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🔁'
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
              <span>تم تفعيل مُنشئ الشهادة الذكي واعتماد الكود المعياري الوطني ({currentInfo.code}) في الإحصائيات الرسمية</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
