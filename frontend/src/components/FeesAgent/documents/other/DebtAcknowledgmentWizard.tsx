import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step3_AdministrativeCertificates } from '../../steps/Step3_AdministrativeCertificates';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { ShareDistributionModal } from '../../modals';
import type {
  PaymentMethod, PropertyType, ValidationSeverity, Party, Applicant,
  TitleDocumentDetails, OwnershipCertificateDetails, PropertyDetails,
  FinanceDetails, DocumentMeta, ValidationAlert, AuditEntry,
  AdministrativeCertificate, PostRegistrationDetails, InheritanceDeed,
  Witness, PartitionBeneficiary, PartitionDivision, FacilityShare,
  FacilityItem, CommonFacilities, BuildingProof, EasementProof,
  PossessionProof, PromiseToSell, ProofOfEstate, EstateInventory,
  WillDeed, ExchangeDeed, DeliveryDeed, AcknowledgmentDeed,
  DebtDischargeDeed, DebtAcknowledgmentDeed, PersonIdentityFields,
  BilingualPersonIdentity, MarriageContinuityDeed, MarriageDetails,
  DowryDetails, TawkilScope, FeesAgentState
} from '../../../../types/feesAgentTypes';
import {
  createEmptyTitleDocument, createEmptyProperty, createEmptyPartitionDivision,
  createEmptyParty, createEmptyWitness, calculateAge, convertGregorianToHijri,
  generateFileNumber, convertNumberToArabicWords, convertGregorianDateToWords,
  convertHijriDateToWords, convertTimeToWords, getArabicWeekdayName,
  generateValidationId, generateValidationAlert, performValidationChecks,
  executeLegalFiltersForPossession, validatePossessionConditions,
  validateWitnessRequirements, generateOutcomeRouting
} from '../../../../utils/feesAgentUtils';
import { formatCourtName, generateRasmHtml, generateDocumentDraft } from '../../../../templates/feesAgentTemplates';
import {
  type DocumentType, type PartyLabels, DEFAULT_PARTY_LABELS,
  DOCUMENT_PARTY_LABELS, getPartyLabels, DOCUMENT_CATEGORIES,
  LEGAL_ENTITY_TYPE_OPTIONS, REPRESENTATION_DOC_TYPE_OPTIONS,
  PROFESSIONAL_CONVICTION_QUESTIONS, JUDGE_SEND_TRANSIT_MESSAGES,
  ARABIC_ONES, ARABIC_TENS, ARABIC_TEENS, ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC, SALE_DOCUMENT_TYPES, FAMILY_DEED_TYPES,
  MARRIAGE_DOCUMENT_TYPES, INHERITANCE_DOCUMENT_TYPES
} from '../../../../constants/feesAgentLocales';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';

  export const Step3_DebtAcknowledgmentDeed: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const deed = state.debtAcknowledgmentDeed || {};
    
    const updateDeed = <K extends keyof DebtAcknowledgmentDeed>(field: K, value: DebtAcknowledgmentDeed[K]) => {
      setState((prev) => ({
        ...prev,
        debtAcknowledgmentDeed: {
          ...(prev.debtAcknowledgmentDeed || {}),
          [field]: value,
        },
      })); 
    };

    const updateNested = (parent: keyof DebtAcknowledgmentDeed, field: string, value: any) => {
        setState((prev) => {
            const currentDeed = prev.debtAcknowledgmentDeed || {};
            const parentObj = (currentDeed[parent] as any) || {};
            return {
                ...prev,
                debtAcknowledgmentDeed: {
                    ...currentDeed,
                    [parent]: {
                        ...parentObj,
                        [field]: value 
                    }
                }
            };
        });
    };

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
           <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: رسم إقرار بدين</h2>
           <p className="text-gray-700 leading-relaxed">
             توثيق الاعتراف بالدين مع تحديد المصدر، الأجل، والضمانات وفق مدونة الالتزامات والعقود (الفصول 410 وما يليها).
           </p>
        </div>

        {/* 1. Smart Debt Profiling */}
        <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">1. توصيف الدين (Smart Debt Profiling)</h3>
             <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">مصدر الدين</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.debtSource || ''} onChange={(e) => updateDeed('debtSource', e.target.value as any)}>
                        <option value="">اختر...</option>
                        <option value="قرض">قرض</option>
                        <option value="معاملة">معاملة تجارية</option>
                        <option value="بيع_وشراء">بيع وشراء</option>
                        <option value="نفقة">نفقة</option>
                        <option value="أجرة">أجرة</option>
                        <option value="عمل">عمل</option>
                        <option value="تعويض">تعويض</option>
                        <option value="شراكة">شراكة</option>
                         <option value="تسبيق">تسبيق</option>
                        <option value="وديعة">وديعة</option>
                        <option value="غير_مبرر">غير مبرر (⚠ يتطلب تبيين)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">طبيعة الدين</label>
                     <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.debtNature || ''} onChange={(e) => updateDeed('debtNature', e.target.value as any)}>
                        <option value="">اختر...</option>
                        <option value="نقدي">نقدي (Cash)</option>
                        <option value="غير_نقدي">غير نقدي (عمل/منفعة)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">مبلغ الدين (درهم)</label>
                    <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.debtAmount || ''} onChange={(e) => updateDeed('debtAmount', parseFloat(e.target.value))} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">مبلغ الدين (بالحروف)</label>
                    <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.debtAmountInWords || ''} onChange={(e) => updateDeed('debtAmountInWords', e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">نوع الأجل</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.deadlineType || ''} onChange={(e) => updateDeed('deadlineType', e.target.value as any)}>
                        <option value="">اختر...</option>
                        <option value="مؤجل">مؤجل (Deferred)</option>
                        <option value="فوري">فوري (Immediate)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">وسيلة الأداء</label>
                     <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        value={deed.paymentMethod || ''} onChange={(e) => updateDeed('paymentMethod', e.target.value as any)}>
                        <option value="">اختر...</option>
                        <option value="نقد">نقد</option>
                        <option value="تحويل_بنكي">تحويل بنكي</option>
                        <option value="شيك">شيك</option>
                         <option value="خدمة_الكترونية">خدمة إلكترونية</option>
                        <option value="غير_محدد">غير محدد (⚠ غموض)</option>
                    </select>
                 </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700">وضع الضمانات</label>
                     <div className="flex flex-wrap gap-4 mt-1">
                        {['بدون_ضمان', 'كفالة_شخصية', 'رهن', 'حجز_اتفاقي', 'إبراء_معلق'].map(g => (
                             <label key={g} className="flex items-center gap-2">
                                <input type="radio" name="guaranteeType" checked={deed.guaranteeType === g}
                                    onChange={() => updateDeed('guaranteeType', g as any)} />
                                <span className="text-sm">{g.replace('_', ' ')}</span>
                            </label>
                        ))}
                     </div>
                  </div>
             </div>
        </div>

        {/* 2. Debtor & Creditor Questions */}
         <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">أسئلة المدين (المعترف)</h3>
                 <div className="space-y-3 text-sm">
                    <label className="flex items-center justify-between">
                        <span>هل استلمت المبلغ فعلاً؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.receivedAmount || false} onChange={(e) => updateNested('debtorQ', 'receivedAmount', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل هناك شهود على الدين؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.hasWitnesses || false} onChange={(e) => updateNested('debtorQ', 'hasWitnesses', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل هناك عقد مكتوب سابق؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.hasWrittenContract || false} onChange={(e) => updateNested('debtorQ', 'hasWrittenContract', e.target.checked)}/>
                    </label>
                      <label className="flex items-center justify-between">
                        <span>هل يوجد نزاع قضائي مع الدائن؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.hasJudicialDispute || false} onChange={(e) => updateNested('debtorQ', 'hasJudicialDispute', e.target.checked)}/>
                    </label>
                    <label className="flex items-center justify-between">
                        <span>هل تقبل بشرط جزائي عند التأخر؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.acceptsPenaltyClause || false} onChange={(e) => updateNested('debtorQ', 'acceptsPenaltyClause', e.target.checked)}/>
                    </label>
                 </div>
            </div>

             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">أسئلة الدائن (المستفيد)</h3>
                 <div className="space-y-3 text-sm">
                    <label className="flex items-center justify-between">
                        <span>هل سلمت المبلغ كاملاً؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.deliveredAmount || false} onChange={(e) => updateNested('creditorQ', 'deliveredAmount', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل المعاملة تجارية؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.isCommercialUse || false} onChange={(e) => updateNested('creditorQ', 'isCommercialUse', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل هناك قروض سابقة؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.hasPreviousLoans || false} onChange={(e) => updateNested('creditorQ', 'hasPreviousLoans', e.target.checked)}/>
                    </label>
                 </div>
            </div>
         </div>

         {/* 3. Legal Filters & Outcome */}
         <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">3. الفلاتر والتحذيرات (Legal Engine)</h3>
             <div className="text-sm space-y-2 text-gray-700">
                 <div className="grid grid-cols-2 gap-2">
                     <label className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                        <input type="checkbox" checked={deed.filters?.civilLimitationCheck || false} onChange={(e) => updateNested('filters', 'civilLimitationCheck', e.target.checked)} />
                        <span>التحقق من التقادم المدني</span>
                     </label>
                     <label className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                        <input type="checkbox" checked={deed.filters?.usuryCheck || false} onChange={(e) => updateNested('filters', 'usuryCheck', e.target.checked)} />
                        <span>خلو من الربا (الفوائد)</span>
                     </label>
                      <label className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                        <input type="checkbox" checked={deed.filters?.hiddenSaleCheck || false} onChange={(e) => updateNested('filters', 'hiddenSaleCheck', e.target.checked)} />
                        <span>خلو من تحايل بيع</span>
                     </label>
                      <label className="flex items-center gap-2 p-2 bg-white rounded shadow-sm">
                        <input type="checkbox" checked={deed.filters?.capacityCheck || false} onChange={(e) => updateNested('filters', 'capacityCheck', e.target.checked)} />
                        <span>أهلية الأطراف (رشد/سفه)</span>
                     </label>
                 </div>

                 <div className="mt-4 p-4 bg-white border border-red-200 rounded">
                     <h4 className="font-bold text-red-600 mb-2">⚠ تنبيهات (Legal Alerts)</h4>
                     <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                         {deed.debtNature === 'غير_نقدي' && (
                             <li className="text-orange-700">الديون غير النقدية (عمل/منفعة) تتطلب ضبطاً دقيقاً للمواصفات لتجنب الغرر.</li>
                         )}
                         {deed.paymentMethod === 'غير_محدد' && (
                             <li className="text-red-700">عدم تحديد وسيلة الأداء يعتبر غموضاً قانونياً قد يثير الشك.</li>
                         )}
                         {deed.deadlineType === 'فوري' && (
                              <li>الأجل الفوري يعني استحقاق الدين بمجرد الإشهاد.</li>
                         )}
                         {deed.guaranteeType === 'كفالة_شخصية' && (
                             <li className="font-bold text-blue-700">الكفالة الشخصية تتطلب تحديد طبيعة الالتزام (تضامن أم لا).</li>
                         )}
                         {deed.creditorQ?.isCommercialUse && (
                             <li>في الديون التجارية، الاعتراف يتطلب تفسير السبب وفق الماد 419-420 م.ل.ع.</li>
                         )}
                     </ul>
                 </div>
             </div>
         </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between mt-4">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Marriage Continuity Deed (رسم استمرار زواج)
  // ============================================================================

export const DebtAcknowledgmentWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_DebtAcknowledgmentDeed state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
