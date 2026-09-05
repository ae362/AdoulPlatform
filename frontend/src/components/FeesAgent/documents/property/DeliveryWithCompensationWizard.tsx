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

  export const Step3_DeliveryDeed: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const deed = state.deliveryDeed || {};
    
    const updateDeed = <K extends keyof DeliveryDeed>(field: K, value: DeliveryDeed[K]) => {
      setState((prev) => ({
        ...prev,
        deliveryDeed: {
          ...(prev.deliveryDeed || {}),
          [field]: value,
        },
      })); 
    };

    const updateNested = (parent: keyof DeliveryDeed, field: string, value: any) => {
        setState((prev) => {
            const currentDeed = prev.deliveryDeed || {};
            const parentObj = (currentDeed[parent] as any) || {};
            return {
                ...prev,
                deliveryDeed: {
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
           <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: رسم تسليم بعوض</h2>
           <p className="text-gray-700 leading-relaxed">
             توثيق عملية التسليم بعوض (المناولة) مع تحديد المحل، الثمن، وضمانات الاستحقاق.
           </p>
        </div>

        {/* Location Info */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">1. محل التسليم</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">وصف المحل</label>
                   <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.location?.description || ''} 
                          onChange={(e) => updateNested('location', 'description', e.target.value)} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">النوع</label>
                   <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           value={deed.location?.type || ''}
                           onChange={(e) => updateNested('location', 'type', e.target.value)}>
                        <option value="">اختر...</option>
                        <option value="محل_تجاري">محل تجاري</option>
                        <option value="سكن">سكن</option>
                        <option value="فلاحي">فلاحي</option>
                        <option value="أرض">أرض</option>
                   </select>
                </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700">المساحة</label>
                   <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.location?.area || ''} 
                          onChange={(e) => updateNested('location', 'area', e.target.value)} />
                </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700">الحدود</label>
                   <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.location?.boundaries || ''} 
                          onChange={(e) => updateNested('location', 'boundaries', e.target.value)} />
                </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                           checked={deed.location?.isRegistered || false}
                           onChange={(e) => updateNested('location', 'isRegistered', e.target.checked)} />
                    <span className="text-sm font-medium text-gray-700">محل محفظ؟</span>
                </label>
            </div>
             {deed.location?.isRegistered && (
                 <div className="mt-2">
                   <label className="block text-sm font-medium text-gray-700">رقم الرسم العقاري</label>
                   <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.location?.titleNumber || ''} 
                          onChange={(e) => updateNested('location', 'titleNumber', e.target.value)} />
                </div>
             )}
             {!deed.location?.isRegistered && (
                 <div className="mt-2">
                   <label className="block text-sm font-medium text-gray-700">تعريف عرفي</label>
                   <textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.location?.customaryDefinition || ''} 
                          onChange={(e) => updateNested('location', 'customaryDefinition', e.target.value)} />
                </div>
             )}
        </div>

        {/* Financials & Clauses */}
        <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">2. العوض وشروط التسليم</h3>
             <div className="grid md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">مبلغ العوض (درهم)</label>
                   <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.considerationAmount || ''} 
                          onChange={(e) => updateDeed('considerationAmount', parseFloat(e.target.value))} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">طريقة الأداء</label>
                   <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           value={deed.paymentMethod || ''}
                           onChange={(e) => updateDeed('paymentMethod', e.target.value as any)}>
                        <option value="">اختر...</option>
                        <option value="نقد">نقدًا</option>
                        <option value="شيك">شيك</option>
                        <option value="تحويل">تحويل</option>
                   </select>
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-gray-700">صيغة التسليم</label>
                   <textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.deliveryClause || 'أشهد المسلم بأنه سلم للمسلم له جميع المحل المذكور تسليمًا تامًا مناولة ويدًا بيد...'} 
                          onChange={(e) => updateDeed('deliveryClause', e.target.value)} />
                </div>
                 <div className="col-span-2">
                   <label className="block text-sm font-medium text-gray-700">صيغة الحوز</label>
                   <textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={deed.possessionClause || 'وحاز المسلم له المحل المذكور حوزًا تامًا شرعيًا وعرفيًا، وحل محل المسلم حلول ذي المال في ماله...'} 
                          onChange={(e) => updateDeed('possessionClause', e.target.value)} />
                </div>
             </div>
        </div>

        {/* Guarantees */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">3. الضمانات والإضافات</h3>
             <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                           checked={deed.guarantees?.entitlement || false}
                           onChange={(e) => updateNested('guarantees', 'entitlement', e.target.checked)} />
                    <span className="text-sm font-medium text-gray-700">ضمان الاستحقاق (Entitlement Guarantee)</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                           checked={deed.guarantees?.defects || false}
                           onChange={(e) => updateNested('guarantees', 'defects', e.target.checked)} />
                    <span className="text-sm font-medium text-gray-700">ضمان العيوب (Defects Guarantee)</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                           checked={deed.guarantees?.liabilities || false}
                           onChange={(e) => updateNested('guarantees', 'liabilities', e.target.checked)} />
                    <span className="text-sm font-medium text-gray-700">ضمان التحملات (Liabilities Guarantee)</span>
                </label>
             </div>
        </div>

        {/* AI Checks Mockup */}
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">4. فحص الذكاء الاصطناعي (AI Checks)</h3>
             <div className="grid md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded border ${deed.aiChecks?.taxCheck ? 'bg-green-100 border-green-400' : 'bg-white border-gray-200'}`}>
                      <div className="font-bold mb-2">Tax Checker</div>
                      <button onClick={() => updateNested('aiChecks', 'taxCheck', true)} className="text-xs px-2 py-1 bg-purple-600 text-white rounded">تشغيل الفحص</button>
                      {deed.aiChecks?.taxCheck && <div className="text-xs text-green-700 mt-2">✓ لا توجد ضرائب عالقة</div>}
                  </div>
                  <div className={`p-4 rounded border ${deed.aiChecks?.conflictCheck ? 'bg-green-100 border-green-400' : 'bg-white border-gray-200'}`}>
                      <div className="font-bold mb-2">Conflict Warning</div>
                      <button onClick={() => updateNested('aiChecks', 'conflictCheck', true)} className="text-xs px-2 py-1 bg-purple-600 text-white rounded">تشغيل الفحص</button>
                      {deed.aiChecks?.conflictCheck && <div className="text-xs text-green-700 mt-2">✓ السجل القانوني نظيف</div>}
                  </div>
                   <div className={`p-4 rounded border ${deed.aiChecks?.inheritanceCheck ? 'bg-green-100 border-green-400' : 'bg-white border-gray-200'}`}>
                      <div className="font-bold mb-2">Heritage Detector</div>
                      <button onClick={() => updateNested('aiChecks', 'inheritanceCheck', true)} className="text-xs px-2 py-1 bg-purple-600 text-white rounded">تشغيل الفحص</button>
                      {deed.aiChecks?.inheritanceCheck && <div className="text-xs text-green-700 mt-2">✓ لا شبهة إرث</div>}
                  </div>
             </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Acknowledgment Deed (رسم اقرار واعتراف)
  // ============================================================================

export const DeliveryWithCompensationWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_DeliveryDeed state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
