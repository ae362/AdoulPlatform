import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentWizardProps } from '../types';
import type { Witness } from '../../../types/feesAgentTypes';
import {
  Users, Scale, FileText, UserCheck, ShieldCheck, AlertTriangle,
  CheckCircle2, ArrowRight, ArrowLeft, Info, HelpCircle, XCircle
} from 'lucide-react';
import {
  type EvidenceMethod,
  getEvidenceRuleForDocument,
  evaluateWitnessCompleteness,
  EVIDENCE_METHODS_CONFIG,
} from '../services/evidenceRulesEngine';
import { EvidenceMethodSelector } from './evidence/EvidenceMethodSelector';
import { LafifWitnessManager } from './evidence/LafifWitnessManager';
import { ScientificTestimonyForm } from './evidence/ScientificTestimonyForm';
import { MithliyaTestimonyForm } from './evidence/MithliyaTestimonyForm';
import { WhyLegalModal } from './evidence/WhyLegalModal';

export const Step5_Witnesses: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  const documentType = state.documentType || '';
  const rule = useMemo(() => getEvidenceRuleForDocument(documentType), [documentType]);

  // الطريقة المحددة حالياً
  const selectedMethod: EvidenceMethod = (state.evidenceMethod as EvidenceMethod) || rule.defaultMethod;

  // حالة النافذة التفسيرية «لماذا يطلب النظام ذلك؟»
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // تحديث طريقة الإثبات في حالة التطبيق العامة
  const handleSelectMethod = (method: EvidenceMethod) => {
    setState((prev) => ({
      ...prev,
      evidenceMethod: method,
    }));
  };

  // المزامنة الأولية إذا لم تكن طريقة الإثبات محددة
  useEffect(() => {
    if (!state.evidenceMethod) {
      setState((prev) => ({
        ...prev,
        evidenceMethod: rule.defaultMethod,
      }));
    }
  }, [state.evidenceMethod, rule.defaultMethod, setState]);

  const witnesses = state.witnesses || [];

  // تقييم الجاهزية الإجمالية للمرحلة (Overall Stage Readiness & Validation Gating)
  const validationSummary = useMemo(() => {
    const errors: string[] = [];
    let ageOk = true;
    let kinshipOk = true;
    let inquestOk = true;
    let countOk = true;

    if (selectedMethod === 'none') {
      return {
        isReady: true,
        errors: [],
        countOk: true,
        ageOk: true,
        kinshipOk: true,
        inquestOk: true,
        summaryText: 'مستوفٍ تلقائياً — هذا الرسم لا يستلزم شهادة خاصة',
      };
    }

    if (selectedMethod === 'lafif') {
      const minReq = rule.minimumWitnesses || 12;
      if (witnesses.length < minReq) {
        countOk = false;
        errors.push(`نصاب الشهود غير مكتمل (${witnesses.length} من ${minReq} على الأقل)`);
      }

      let ageBlockers = 0;
      let kinshipBlockers = 0;
      let incompleteCount = 0;

      witnesses.forEach((w, idx) => {
        const evaluation = evaluateWitnessCompleteness(w, rule);
        if (!w.name?.trim()) {
          errors.push(`اسم الشاهد رقم ${idx + 1} غير مدخل`);
          incompleteCount++;
        }
        if (!w.idNumber?.trim()) {
          errors.push(`رقم تعريف الشاهد رقم ${idx + 1} غير مدخل`);
          incompleteCount++;
        }
        if (evaluation.ageCheck.overallStatus === 'invalid') {
          ageBlockers++;
          errors.push(`مانع في سن الشاهد رقم ${idx + 1} (${evaluation.ageCheck.reason})`);
        }
        if (evaluation.kinshipCheck.isForbidden) {
          kinshipBlockers++;
          errors.push(`مانع قرابة في الشاهد رقم ${idx + 1} (${evaluation.kinshipCheck.reason})`);
        }
        if (evaluation.inquestResult === 'incomplete') {
          incompleteCount++;
        }
      });

      if (ageBlockers > 0) ageOk = false;
      if (kinshipBlockers > 0) kinshipOk = false;
      if (incompleteCount > 0) inquestOk = false;

      return {
        isReady: countOk && ageOk && kinshipOk && errors.length === 0,
        errors,
        countOk,
        ageOk,
        kinshipOk,
        inquestOk,
        summaryText: errors.length === 0
          ? 'اكتملت جميع المتطلبات الآلية لشهادة اللفيف بنجاح'
          : `توجد ${errors.length} متطلبات لم تستوفَ بعد`,
      };
    }

    if (selectedMethod === 'scientific') {
      const sciData = state.scientificTestimony || {};
      if (!sciData.permissionNumber?.trim()) {
        errors.push('رقم الإذن القضائي مطلوب');
      }
      if (!sciData.permissionDate?.trim()) {
        errors.push('تاريخ الإذن القضائي مطلوب');
      }
      if (!sciData.courtName?.trim()) {
        errors.push('المحكمة المختصة مطلوبة');
      }
      return {
        isReady: errors.length === 0,
        errors,
        countOk: true,
        ageOk: true,
        kinshipOk: true,
        inquestOk: true,
        summaryText: errors.length === 0
          ? 'اكتملت مراجع الإذن القضائي والعدلين'
          : `يرجى استكمال بيانات الإذن القضائي (${errors.length} متبقي)`,
      };
    }

    if (selectedMethod === 'mithliya') {
      const mithData = state.mithliyaTestimony || {};
      if (witnesses.length < 6) {
        countOk = false;
        errors.push(`نصاب شهادة المثلية غير مكتمل (${witnesses.length} من 6 شهود)`);
      }
      if (!mithData.permissionNumber?.trim()) {
        errors.push('رقم إذن قاضي التوثيق للعدل الأساسي مطلوب');
      }
      if (!mithData.permissionDate?.trim()) {
        errors.push('تاريخ إذن قاضي التوثيق مطلوب');
      }
      if (!mithData.courtName?.trim() && !state.meta?.court?.trim()) {
        errors.push('المحكمة المختصة مطلوبة');
      }

      // التحقق من أهلية سن الشهود الستة
      let ageBlockers = 0;
      witnesses.forEach((w, idx) => {
        if (!w.name?.trim()) {
          errors.push(`اسم الشاهد رقم ${idx + 1} غير مدخل`);
        }
        if (w.bearingStatus === 'invalid') {
          ageBlockers++;
          errors.push(`مانع في سن الشاهد رقم ${idx + 1} (دون سن التمييز 12 سنة وقت الواقعة)`);
        }
        if (w.performanceStatus === 'invalid') {
          ageBlockers++;
          errors.push(`مانع في سن الشاهد رقم ${idx + 1} (دون سن الرشد 18 سنة وقت الأداء)`);
        }
      });
      if (ageBlockers > 0) ageOk = false;

      return {
        isReady: countOk && ageOk && errors.length === 0,
        errors,
        countOk,
        ageOk,
        kinshipOk: true,
        inquestOk: true,
        summaryText: errors.length === 0
          ? 'اكتمل نصاب الشهادة بالمثلية ومراجع إذن القاضي (6 شهود مؤهلين + إذن معتمد)'
          : `يرجى استكمال متطلبات الشهادة بالمثلية (${errors.length} متبقي)`,
      };
    }

    return {
      isReady: true,
      errors: [],
      countOk: true,
      ageOk: true,
      kinshipOk: true,
      inquestOk: true,
      summaryText: 'جاهز للمتابعة',
    };
  }, [selectedMethod, rule, witnesses, state.scientificTestimony, state.mithliyaTestimony, state.evidenceSubjectMatter]);

  const handlePrevStep = () => {
    if (onBack) {
      onBack();
      return;
    }
    setState((prev) => ({
      ...prev,
      step: prev.documentType === 'ثبوت_نسب_ببينة_السماع' ? 3 : 4,
    }));
  };

  const handleNextStep = () => {
    if (!validationSummary.isReady) return;
    if (onNext) {
      onNext();
      return;
    }
    setState((prev) => ({ ...prev, step: 6 }));
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* 1. Main Stage Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3.5 py-1 text-xs font-black text-indigo-200 border border-indigo-400/30">
            <Scale className="h-3.5 w-3.5 text-indigo-300" />
            <span>المرحلة السادسة (06)</span>
          </span>
          <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            نوع الرسم: {rule.arabicName}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-amiri text-white mb-2 flex items-center gap-2.5">
          <span>⑥ طريقة الإثبات والشهادة والتحري</span>
        </h2>

        <p className="text-sm font-medium text-slate-300 max-w-3xl leading-relaxed">
          حدد طريقة الإثبات المعتمدة لهذا الرسم. سيعرض النظام فقط الأشخاص والوثائق والبيانات التي ترتبط بالطريقة المختارة، مع إجراء التنبيهات والتحققات اللازمة قبل الانتقال إلى المرحلة التالية.
        </p>
      </div>

      {/* 2. Smart Status Bar (الحادية والعشرون: شريط حالة ذكي) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Method pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200">
              <span className="text-slate-500">طريقة الإثبات:</span>
              <strong className="text-indigo-900 font-black">{EVIDENCE_METHODS_CONFIG[selectedMethod].title}</strong>
            </div>

            {/* Witnesses Count pill */}
            {selectedMethod === 'lafif' && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border ${
                validationSummary.countOk
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                <span>عدد الشهود:</span>
                <strong className="font-mono font-black">{witnesses.length} / {rule.minimumWitnesses || 12}</strong>
              </div>
            )}

            {selectedMethod === 'mithliya' && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border ${
                validationSummary.countOk
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                <span>عدد الشهود:</span>
                <strong className="font-mono font-black">{witnesses.length} / 6</strong>
              </div>
            )}

            {/* Age indicator */}
            {selectedMethod === 'lafif' && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold ${
                validationSummary.ageOk ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
              }`}>
                <span>السن:</span>
                <span>{validationSummary.ageOk ? '✓ مستوفٍ' : '🔴 مانع'}</span>
              </div>
            )}

            {/* Kinship indicator */}
            {selectedMethod === 'lafif' && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold ${
                validationSummary.kinshipOk ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
              }`}>
                <span>القرابة:</span>
                <span>{validationSummary.kinshipOk ? '✓ لا مانع' : '🔴 مانع'}</span>
              </div>
            )}

            {/* Inquest indicator */}
            {selectedMethod === 'lafif' && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold ${
                validationSummary.inquestOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}>
                <span>التحري:</span>
                <span>{validationSummary.inquestOk ? '✓ مكتمل' : '⚠️ استكمال'}</span>
              </div>
            )}

            {/* Scientific permission indicator */}
            {selectedMethod === 'scientific' && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold ${
                validationSummary.isReady ? 'bg-emerald-50 text-emerald-800' : 'bg-purple-50 text-purple-800'
              }`}>
                <span>الإذن القضائي:</span>
                <span>{validationSummary.isReady ? '✓ مكتمل' : '⚠️ مطلوب'}</span>
              </div>
            )}
          </div>

          {/* Overall Status indicator */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 border ${
              validationSummary.isReady
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {validationSummary.isReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الحالة: جاهز للانتقال</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>الحالة: {validationSummary.summaryText}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Method Selector (The 4 Cards & Smart Suggestion) */}
      <EvidenceMethodSelector
        selectedMethod={selectedMethod}
        onSelectMethod={handleSelectMethod}
        rule={rule}
        onOpenWhyModal={() => setIsWhyModalOpen(true)}
      />

      {/* 4. Section 2: Method-Specific Body (Conditional Rendering) */}
      <div className="pt-2">
        {selectedMethod === 'none' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-emerald-950">
              هذا الرسم لا يستلزم شهادة خاصة
            </h4>
            <p className="text-xs text-emerald-900 max-w-lg mx-auto leading-relaxed">
              وفقاً للطبيعة القانونية لهذا الرسم، يتم التلقي والإشهاد مباشرة بين أطراف العقد أمام العدلين، دون الحاجة إلى مسار شهادة اللفيف أو الشهادة العلمية أو المثلية.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>جاهز للمرور المباشر إلى مرحلة التواريخ والمراجع ومجلس الإشهاد</span>
            </div>
          </div>
        )}

        {selectedMethod === 'lafif' && (
          <LafifWitnessManager
            state={state}
            setState={setState}
            rule={rule}
            onOpenWhyModal={() => setIsWhyModalOpen(true)}
          />
        )}

        {selectedMethod === 'scientific' && (
          <ScientificTestimonyForm
            state={state}
            setState={setState}
          />
        )}

        {selectedMethod === 'mithliya' && (
          <MithliyaTestimonyForm
            state={state}
            setState={setState}
          />
        )}
      </div>

      {/* 5. Navigation Footer with Strict Validation Gating */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={handlePrevStep}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs active:scale-95 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>السابق</span>
        </button>

        <div className="flex items-center gap-3">
          {!validationSummary.isReady && (
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{validationSummary.errors[0] || 'يرجى استكمال شروط المرحلة للمتابعة'}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!validationSummary.isReady}
            className={`inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black transition shadow-md ${
              validationSummary.isReady
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-700/20 active:scale-95 cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
            }`}
            title={!validationSummary.isReady ? validationSummary.errors[0] : 'الانتقال إلى الخطوة التالية'}
          >
            <span>التالي: التواريخ والمراجع ومجلس الإشهاد</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6. Legal "Why?" Modal */}
      <WhyLegalModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
        rule={rule}
      />
    </div>
  );
};
