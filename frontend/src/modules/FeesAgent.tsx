import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AIChatAssistant } from '../components/AIChatAssistant';
import { DOCUMENT_WIZARD_REGISTRY } from '../components/FeesAgent/documentRegistry';
import { Step0_DocumentSelection } from '../components/FeesAgent/steps/Step0_DocumentSelection';
import { LegalEntityWizard } from '../components/FeesAgent/documents/property/LegalEntityWizard';
import { Step7_FinalReview } from '../components/FeesAgent/steps/Step7_FinalReview';
import { Step8_PostRegistration } from '../components/FeesAgent/steps/Step8_PostRegistration';
import { AISidePanel } from '../components/FeesAgent/components/AISidePanel';

import type { FeesAgentState, FeesAgentProps } from '../types/feesAgentTypes';
import {
  createEmptyParty,
  createEmptyProperty,
  generateFileNumber,
  convertGregorianToHijri,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertTimeToWords,
} from '../utils/feesAgentUtils';

// Re-export all sub-modules for external consumers (e.g., aiQuestioner, Fees, AuditHub)
export * from '../constants/feesAgentLocales';
export * from '../types/feesAgentTypes';
export * from '../utils/feesAgentUtils';
export * from '../templates/feesAgentTemplates';

export function FeesAgent({ initialState, initialJudgeSubmissionId, startMode = 'intake' }: FeesAgentProps) {
  const navigate = useNavigate();
  const { user, sessionToken, notaryProfile } = useAuth();
  const buildInitialState = (): FeesAgentState => {
    const today = new Date().toISOString().split('T')[0];
    const judgeSubmissionId =
      (initialState as any)?.step7JudgeSubmissionId ||
      (initialState as any)?.judgeSubmissionId ||
      initialJudgeSubmissionId ||
      null;
    const registeredWithTax = initialState?.finance?.registeredWithTax;
    const fiscalNature =
      (initialState as any)?.step7FiscalNature ||
      (initialState as any)?.fiscalNature ||
      (judgeSubmissionId ? ((registeredWithTax as string) === 'yes' || registeredWithTax === 'نعم' ? 'subject' : 'exempt') : null);
    const defaultPostRegistration = {
      registeredAtFinance: '',
      registrationDate: today,
      depositNumber: '',
      templatePdf: null,
    };
    const sourceMeta = initialState?.meta || ({} as FeesAgentState['meta']);
    const resolvedDateGregorian = sourceMeta.dateGregorian || today;
    const resolvedTime = sourceMeta.time || '';
    const resolvedDateHijri = sourceMeta.dateHijri || convertGregorianToHijri(resolvedDateGregorian);
    const resolvedHourInWords = sourceMeta.hourInWords || (() => {
      if (!resolvedTime) return '';
      const [hours, minutes] = resolvedTime.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return convertTimeToWords(date);
    })();
    const normalizedMeta = {
      ...sourceMeta,
      fileNumber: sourceMeta.fileNumber || generateFileNumber(),
      notaryPrimary: sourceMeta.notaryPrimary || user?.full_name || '',
      notarySecondary: sourceMeta.notarySecondary || '',
      dateGregorian: resolvedDateGregorian,
      dateHijri: resolvedDateHijri,
      dateGregorianInWords: sourceMeta.dateGregorianInWords || convertGregorianDateToWords(resolvedDateGregorian),
      dateHijriInWords: sourceMeta.dateHijriInWords || convertHijriDateToWords(resolvedDateGregorian),
      hourInWords: resolvedHourInWords,
      court: sourceMeta.court || notaryProfile?.primary_court || notaryProfile?.court_name || '',
      additionalDocuments: sourceMeta.additionalDocuments || [],
    };

    if (initialState) {
      return {
        ...initialState,
        meta: normalizedMeta,
        postRegistration: { ...defaultPostRegistration, ...(initialState.postRegistration || {}) },
        step: judgeSubmissionId || (startMode === 'drafting' && !!initialState.documentType)
          ? 7
          : (initialState.step || 0),
        judgeSubmissionId,
        step7JudgeSubmissionId: judgeSubmissionId,
        step7FiscalNature: fiscalNature,
        step7Step: judgeSubmissionId ? 'judicial_review' : (initialState.step7Step || 'fiscal_draft'),
      };
    }

    return {
      step: judgeSubmissionId ? 7 : 0,
      documentType: '',
      sellers: [createEmptyParty()],
      buyers: [createEmptyParty()],
      witnesses: [],
      partitionDivisions: [],
      commonFacilities: { hasCommonFacilities: '', items: [] },
      buildingProof: {},
      properties: [createEmptyProperty()],
      finance: { price: 0, priceInWords: '', paymentMethod: '', registeredWithTax: '' },
      meta: {
        fileNumber: generateFileNumber(),
        notaryPrimary: '',
        notarySecondary: '',
        dateGregorian: today,
        dateHijri: convertGregorianToHijri(today),
        dateGregorianInWords: '',
        dateHijriInWords: '',
        hourInWords: '',
        court: notaryProfile?.primary_court || notaryProfile?.court_name || '',
        additionalDocuments: [],
      },
      postRegistration: {
        registeredAtFinance: '',
        registrationDate: today,
        depositNumber: '',
        templatePdf: null,
      },
      draft: '',
      validationAlerts: [],
      auditTrail: [],
      isDraftSaved: false,
      certificates: [],
      law2590: false,
      step7Step: 'fiscal_draft',
      step7FiscalNature: null,
      step7JudgeSubmissionId: judgeSubmissionId,
      step7JudgeSendError: null,
      step7ShowDeedPreviewModal: false,
      step7DeedPreviewText: '',
      step7JudgeAttachment: null,
      step7VaultModal: { isOpen: false, title: '', type: 'certificates' },
    };
  };

  const [state, setState] = useState<FeesAgentState>(() => buildInitialState());

  useEffect(() => {
    if (!initialJudgeSubmissionId) return;
    setState((prev) => {
      if (prev.step7JudgeSubmissionId === initialJudgeSubmissionId && prev.step === 7) return prev;
      return {
        ...prev,
        step: 7,
        judgeSubmissionId: initialJudgeSubmissionId,
        step7JudgeSubmissionId: initialJudgeSubmissionId,
        step7Step: 'judicial_review',
        step7FiscalNature:
          prev.step7FiscalNature ||
          (((prev.finance?.registeredWithTax as string) === 'yes' || prev.finance?.registeredWithTax === 'نعم') ? 'subject' : 'exempt'),
      };
    });
  }, [initialJudgeSubmissionId]);

  // Self-heal any stale transition steps (such as 0.35) so the user never sees a blank page
  useEffect(() => {
    if (state.step === 0.35) {
      setState(prev => ({
        ...prev,
        step: 1,
        legalEntitySetupStep: prev.documentType === 'بيع_وشراء_معنوي' ? (prev.legalEntitySetupStep !== undefined ? prev.legalEntitySetupStep : 1) : 0
      }));
    }
  }, [state.step]);

  const handleNext = useCallback(() => {
    setState((prev) => ({ ...prev, step: (prev.step || 0) + 1 }));
  }, []);

  const handleBack = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(0, (prev.step || 0) - 1) }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Step 0 & Intake Gateways */}
            {(state.step === 0 || state.step === undefined || state.step === null || (state.step > 0 && state.step < 0.5)) && (
              state.step === 0.35 ? (
                (() => {
                  const WizardComponent = DOCUMENT_WIZARD_REGISTRY[state.documentType || 'بيع_وشراء_معنوي'];
                  return WizardComponent ? (
                    <WizardComponent state={{ ...state, step: 1 }} setState={setState} onNext={handleNext} onBack={handleBack} />
                  ) : (
                    <Step0_DocumentSelection state={state} setState={setState} onNext={handleNext} onBack={handleBack} startMode={startMode} />
                  );
                })()
              ) : (
                <Step0_DocumentSelection state={state} setState={setState} onNext={handleNext} onBack={handleBack} startMode={startMode} />
              )
            )}

            {/* Steps 1 - 6: Dynamic Registry Lookup */}
            {state.step >= 0.5 && state.step < 7 && state.documentType && (
              (() => {
                const WizardComponent = DOCUMENT_WIZARD_REGISTRY[state.documentType];
                if (!WizardComponent) {
                  return (
                    <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200">
                      <p className="text-lg font-bold text-amber-900 mb-2">نوع الشهادة المحدد ({state.documentType}) قيد المعالجة</p>
                      <button onClick={() => setState(prev => ({ ...prev, step: 0 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">
                        العودة لاختيار نوع الشهادة
                      </button>
                    </div>
                  );
                }
                return <WizardComponent state={state} setState={setState} onNext={handleNext} onBack={handleBack} />;
              })()
            )}

            {/* Step 7: Final Review, Smart Drafting & Judicial Review */}
            {state.step === 7 && (
              <Step7_FinalReview state={state} setState={setState} onNext={handleNext} onBack={handleBack} startMode={startMode} />
            )}

            {/* Step 8: Post-Registration Data Tracking */}
            {state.step === 8 && (
              <Step8_PostRegistration state={state} setState={setState} onNext={handleNext} onBack={handleBack} />
            )}
          </div>

          {startMode === 'intake' && <AISidePanel state={state} />}
        </div>
      </div>

      {/* AI Chat Assistant - Only in Intake Mode */}
      {startMode === 'intake' && (
        <AIChatAssistant
          context={{
            step: state.step,
            documentType: state.documentType,
            validationAlerts: state.validationAlerts,
          }}
        />
      )}
    </div>
  );
}

export default FeesAgent;
