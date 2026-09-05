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

  export const Step3_DebtDischargeDeed: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const deed = state.debtDischargeDeed || {};
    
    const updateDeed = <K extends keyof DebtDischargeDeed>(field: K, value: DebtDischargeDeed[K]) => {
      setState((prev) => ({
        ...prev,
        debtDischargeDeed: {
          ...(prev.debtDischargeDeed || {}),
          [field]: value,
        },
      }));
    };
    
    const updateNested = (parent: keyof DebtDischargeDeed, field: string, value: any) => {
        setState((prev) => {
            const currentDeed = prev.debtDischargeDeed || {};
            const parentObj = (currentDeed[parent] as any) || {};
            return {
                ...prev,
                debtDischargeDeed: {
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: رسم إبراء من دين</h2>
          <p className="text-gray-700 leading-relaxed">
            توثيق انقضاء الالتزام بالإبراء مع تحديد طبيعة الدين، أطرافه، والشروط القانونية (مدونة الالتزامات والعقود ف 334).
          </p>
        </div>

        {/* 1. Profiling */}
        <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
           <h3 className="text-lg font-bold text-gray-800">1. توصيف الدين (Smart Profiling)</h3>
           <div className="grid md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700">مصدر الدين</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                     value={deed.debtSource || ''} onChange={(e) => updateDeed('debtSource', e.target.value as any)}>
                     <option value="">اختر...</option>
                     <option value="بيع_وشراء">بيع وشراء</option>
                     <option value="قرض">قرض</option>
                     <option value="نفقة">نفقة أو زوجية</option>
                     <option value="أجرة">أجرة</option>
                     <option value="شراكة">شراكة</option>
                     <option value="تعويض">تعويض</option>
                     <option value="ودائع">ودائع</option>
                     <option value="تسبيقات">تسبيقات</option>
                     <option value="دين_تجاري">دين تجاري</option>
                     <option value="دين_مدني">دين مدني</option>
                     <option value="غير_محدد">غير محدد (⚠ يمنع تمريره)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">نوع الإثبات</label>
                   <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                     value={deed.proofType || ''} onChange={(e) => updateDeed('proofType', e.target.value as any)}>
                     <option value="">اختر...</option>
                     <option value="حكم_قضائي">حكم قضائي</option>
                     <option value="عقد_عدلي">عقد عدلي</option>
                     <option value="ورقة_عرفية">ورقة عرفية</option>
                     <option value="تحويل_بنكي">تحويل بنكي</option>
                     <option value="اتفاق_شفهي">اتفاق شفهي (⚠ ضعيف)</option>
                  </select>
               </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">قيمة الدين (درهم)</label>
                  <input type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                     value={deed.debtAmount || ''} onChange={(e) => updateDeed('debtAmount', parseFloat(e.target.value))} />
               </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">قيمة الدين (بالحروف)</label>
                  <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                     value={deed.debtAmountInWords || ''} onChange={(e) => updateDeed('debtAmountInWords', e.target.value)} />
               </div>
               <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700">حالة الأداء</label>
                   <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="paymentStatus" checked={deed.paymentStatus === 'تم_الاداء_سابقا'} 
                                onChange={() => updateDeed('paymentStatus', 'تم_الاداء_سابقا')} />
                            <span>تم الأداء سابقاً (إقرار بالأداء)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="paymentStatus" checked={deed.paymentStatus === 'ابراء_دون_اداء'} 
                                onChange={() => updateDeed('paymentStatus', 'ابراء_دون_اداء')} />
                            <span>إبراء دون أداء (إسقاط حق)</span>
                        </label>
                   </div>
               </div>
           </div>
        </div>

        {/* 2. Questions */}
        <div className="grid md:grid-cols-2 gap-6">
            {/* Creditor Questions */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">أسئلة الدائن (المبرئ)</h3>
                <div className="space-y-3 text-sm">
                    <label className="flex items-center justify-between">
                        <span>هل هذا الدين ثابت في ذمتك؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.isDebtEstablished || false} onChange={(e) => updateNested('creditorQ', 'isDebtEstablished', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل توجد نزاعات قضائية؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.hasDisputes || false} onChange={(e) => updateNested('creditorQ', 'hasDisputes', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل الدين له كفيل؟</span>
                        <input type="checkbox" checked={deed.creditorQ?.hasGuarantor || false} onChange={(e) => updateNested('creditorQ', 'hasGuarantor', e.target.checked)}/>
                    </label>
                    {deed.creditorQ?.hasGuarantor && (
                         <label className="flex items-center justify-between text-blue-600 bg-blue-50 p-1 rounded">
                            <span>هل الإبراء يشمل الكفيل؟</span>
                            <input type="checkbox" checked={deed.creditorQ?.guarantorIncluded || false} onChange={(e) => updateNested('creditorQ', 'guarantorIncluded', e.target.checked)}/>
                        </label>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                         <div>
                            <span className="block text-xs text-gray-500">النطاق</span>
                            <select className="w-full text-xs border rounded" value={deed.creditorQ?.scope || ''} onChange={(e) => updateNested('creditorQ', 'scope', e.target.value)}>
                                <option value="شامل">شامل</option>
                                <option value="جزئي">جزئي</option>
                            </select>
                         </div>
                         <div>
                            <span className="block text-xs text-gray-500">الطبيعة</span>
                            <select className="w-full text-xs border rounded" value={deed.creditorQ?.nature || ''} onChange={(e) => updateNested('creditorQ', 'nature', e.target.value)}>
                                <option value="نهائي">نهائي</option>
                                <option value="معلق_شرط">معلق على شرط</option>
                            </select>
                         </div>
                    </div>
                </div>
            </div>
            
             {/* Debtor Questions */}
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">أسئلة المدين (المبرأ)</h3>
                <div className="space-y-3 text-sm">
                     <label className="flex items-center justify-between">
                        <span>هل تقر بوجود الدين سابقاً؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.acknowledgesDebt || false} onChange={(e) => updateNested('debtorQ', 'acknowledgesDebt', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل استلمت الأداء/حقك من الدائن؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.receivedSubject || false} onChange={(e) => updateNested('debtorQ', 'receivedSubject', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل الإبراء مقابل أداء جزئي؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.isPartialExchange || false} onChange={(e) => updateNested('debtorQ', 'isPartialExchange', e.target.checked)}/>
                    </label>
                     <label className="flex items-center justify-between">
                        <span>هل ترغب في إضافة شرط؟</span>
                        <input type="checkbox" checked={deed.debtorQ?.addCondition || false} onChange={(e) => updateNested('debtorQ', 'addCondition', e.target.checked)}/>
                    </label>
                    {deed.debtorQ?.addCondition && (
                        <input type="text" placeholder="تفاصيل الشرط..." className="w-full text-xs border rounded p-1"
                            value={deed.debtorQ?.conditionDetails || ''} onChange={(e) => updateNested('debtorQ', 'conditionDetails', e.target.value)} />
                    )}
                </div>
            </div>
        </div>

        {/* 3. Filters & Alerts */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
             <h3 className="text-lg font-bold text-gray-800">3. الفلاتر والتحذيرات (Legal Engine)</h3>
             <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                       <h4 className="font-semibold text-gray-700 text-sm">الفلاتر القانونية</h4>
                       <label className="flex items-center gap-2 p-2 bg-white rounded border">
                            <input type="checkbox" checked={deed.filters?.capacityCheck || false} onChange={(e) => updateNested('filters', 'capacityCheck', e.target.checked)} />
                            <span className="text-sm">تم التحقق من أهلية الدائن (قاصر/محجور؟)</span>
                       </label>
                        <label className="flex items-center gap-2 p-2 bg-white rounded border">
                            <input type="checkbox" checked={deed.filters?.commercialCheck || false} onChange={(e) => updateNested('filters', 'commercialCheck', e.target.checked)} />
                            <span className="text-sm">تم التحقق من الوضع التجاري (تفادي التفليسة)</span>
                       </label>
                        <label className="flex items-center gap-2 p-2 bg-white rounded border">
                            <input type="checkbox" checked={deed.filters?.usuryCheck || false} onChange={(e) => updateNested('filters', 'usuryCheck', e.target.checked)} />
                            <span className="text-sm">خلو الدين من الفوائد الربوية</span>
                       </label>
                  </div>
                  <div className="text-sm space-y-2 text-gray-600 bg-white p-3 rounded border">
                      <h4 className="font-bold text-red-600">⚠ تنبيهات قانونية</h4>
                      <ul className="list-disk list-inside space-y-1">
                          <li>الإبراء يسقط الالتزام نهائياً (م 334).</li>
                          {deed.creditorQ?.hasGuarantor && !deed.creditorQ?.guarantorIncluded && (
                              <li className="text-red-700 font-bold">تنبيه: الإبراء للمدين لا يسقط الكفيل إلا بنص صريح.</li>
                          )}
                          {deed.paymentStatus === 'تم_الاداء_سابقا' && (
                              <li className="text-blue-700">هذه الوثيقة تعتبر إقراراً بالأداء وليست إسقاطاً للحق.</li>
                          )}
                           {deed.creditorQ?.nature === 'معلق_شرط' && (
                              <li className="text-orange-700">الإبراء المشروط قد يتحول إلى عقد معاوضة.</li>
                          )}
                      </ul>
                  </div>
             </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between mt-4">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التمويل والتكاليف
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Debt Acknowledgment Deed (رسم اقرار بدين)
  // ============================================================================

export const DebtDischargeWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_DebtDischargeDeed state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
