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

  export const Step3_Omra_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const updateOmra = <K extends keyof NonNullable<FeesAgentState['omra']>>(
      field: K,
      value: NonNullable<FeesAgentState['omra']>[K]
    ) => {
      setState(prev => ({
        ...prev,
        omra: {
          ...prev.omra,
          [field]: value
        } as NonNullable<FeesAgentState['omra']>
      }));
    };

    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border-r-4 border-indigo-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تفاصيل عقد العمري</h2>
          <p className="text-gray-700">أدخل التفاصيل الخاصة بعقد العمري وفقاً للمادة 4 من مدونة الحقوق العينية والمادة 489 من ق.ل.ع.</p>
        </div>

        {/* 1. Type of Omra */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400">
          <h3 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
            <span>1️⃣</span>
            <span>تحديد نوع العمري</span>
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-indigo-50 transition">
              <input
                type="radio"
                checked={state.omra?.omraType === 'بعمر_المعطى_له'}
                onChange={() => updateOmra('omraType', 'بعمر_المعطى_له')}
                className="w-5 h-5"
              />
              <span className="font-semibold">بعمر المعطى له</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-indigo-50 transition">
              <input
                type="radio"
                checked={state.omra?.omraType === 'بعمر_المعطي'}
                onChange={() => updateOmra('omraType', 'بعمر_المعطي')}
                className="w-5 h-5"
              />
              <span className="font-semibold">بعمر المعطي</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-indigo-50 transition">
              <input
                type="radio"
                checked={state.omra?.omraType === 'لمدة_محددة'}
                onChange={() => updateOmra('omraType', 'لمدة_محددة')}
                className="w-5 h-5"
              />
              <span className="font-semibold">لمدة محددة</span>
            </label>
            
            {state.omra?.omraType === 'لمدة_محددة' && (
              <div className="mr-8 mt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">المدة (بالسنوات)</label>
                <input
                  type="text"
                  value={state.omra?.specifiedDuration || ''}
                  onChange={(e) => updateOmra('specifiedDuration', e.target.value)}
                  placeholder="مثال: 20 سنة"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            )}
            
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-indigo-50 transition">
              <input
                type="radio"
                checked={state.omra?.omraType === 'غير_محددة'}
                onChange={() => updateOmra('omraType', 'غير_محددة')}
                className="w-5 h-5"
              />
              <span className="font-semibold">غير محددة</span>
            </label>
            
            {state.omra?.omraType === 'غير_محددة' && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded mr-8">
                <p className="text-yellow-800 font-semibold text-sm">
                  ⚠️ سيرجع تأويلها لعمري على الغالب
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Property Nature */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <h3 className="text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
            <span>2️⃣</span>
            <span>طبيعة العقار</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">العقار هو *</label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.omra?.propertyNature === 'محفظ'}
                    onChange={() => updateOmra('propertyNature', 'محفظ')}
                    className="w-4 h-4"
                  />
                  <span>محفظ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.omra?.propertyNature === 'في_طور_التحفيظ'}
                    onChange={() => updateOmra('propertyNature', 'في_طور_التحفيظ')}
                    className="w-4 h-4"
                  />
                  <span>في طور التحفيظ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.omra?.propertyNature === 'غير_محفظ'}
                    onChange={() => updateOmra('propertyNature', 'غير_محفظ')}
                    className="w-4 h-4"
                  />
                  <span>غير محفظ</span>
                </label>
              </div>
              
              {(state.omra?.propertyNature === 'محفظ' || state.omra?.propertyNature === 'في_طور_التحفيظ') && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {state.omra?.propertyNature === 'محفظ' ? 'رقم الرسم العقاري' : 'رقم مطلب التحفيظ'}
                  </label>
                  <input
                    type="text"
                    value={state.omra?.propertyRegistrationNumber || ''}
                    onChange={(e) => updateOmra('propertyRegistrationNumber', e.target.value)}
                    placeholder="أدخل الرقم"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-900 font-bold text-sm mb-2">⚠️ تنبيه قانوني</p>
              <p className="text-red-800 text-sm">
                المادة 4 مدونة الحقوق العينية + المادة 489 قانون الالتزامات والعقود تشترط المحرر الرسمي للعقود الناقلة للحقوق العقارية
              </p>
              <a href="https://adala.justice.gov.ma/production/html/Fr/152641.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs mt-2 inline-block">
                🔗 رابط رسمي
              </a>
            </div>
          </div>
        </div>

        {/* 3. Ownership Verification */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400">
          <h3 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2">
            <span>3️⃣</span>
            <span>تحقق الملكية</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل المعطي مالك؟ *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.omra?.isGiverOwner === 'نعم'}
                    onChange={() => updateOmra('isGiverOwner', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={state.omra?.isGiverOwner === 'لا'}
                    onChange={() => updateOmra('isGiverOwner', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
              
              {state.omra?.isGiverOwner === 'لا' && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded mt-3">
                  <p className="text-red-800 font-bold">❌ رفض: المعطي ليس مالكاً</p>
                </div>
              )}
              
              {state.omra?.isGiverOwner === 'نعم' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">بموجب ماذا؟</label>
                    <input
                      type="text"
                      value={state.omra?.ownershipBasis || ''}
                      onChange={(e) => updateOmra('ownershipBasis', e.target.value)}
                      placeholder="رسم ملكية / محفظ / رسم شراء / إراثة / حكم قضائي..."
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">وثائق التحقق</label>
                    <textarea
                      value={state.omra?.ownershipDocuments || ''}
                      onChange={(e) => updateOmra('ownershipDocuments', e.target.value)}
                      placeholder="تفاصيل الوثائق المرفوعة..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Usage Type */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
          <h3 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2">
            <span>4️⃣</span>
            <span>تحديد الاستغلال (العِمارة)</span>
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">المعطى له ملزم بـ:</p>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-purple-50 transition">
              <input
                type="radio"
                checked={state.omra?.usageType === 'إقامة_فعلية'}
                onChange={() => updateOmra('usageType', 'إقامة_فعلية')}
                className="w-5 h-5"
              />
              <span>إقامة فعلية</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-purple-50 transition">
              <input
                type="radio"
                checked={state.omra?.usageType === 'أخذ_الغلة'}
                onChange={() => updateOmra('usageType', 'أخذ_الغلة')}
                className="w-5 h-5"
              />
              <span>أخذ الغلة</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer p-3 border-2 border-red-300 rounded-lg hover:bg-red-50 transition">
              <input
                type="radio"
                checked={state.omra?.usageType === 'غير_ذلك'}
                onChange={() => updateOmra('usageType', 'غير_ذلك')}
                className="w-5 h-5"
              />
              <span className="text-red-700">غير ذلك</span>
            </label>
            
            {state.omra?.usageType === 'غير_ذلك' && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded mr-8">
                <p className="text-red-800 font-bold">❌ يُمنع: يجب أن يكون الاستغلال إما بالإقامة أو بأخذ الغلة</p>
              </div>
            )}
          </div>
        </div>

        {/* Legal Alerts */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
          <h3 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>تنبيهات قانونية إلزامية</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800">عقد العمري بغير عوض</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800">لا يحتاج للحوز</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800 font-bold">محرر رسمي تحت طائلة البطلان</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800">ينتقل الحق بالإرث فقط للمعطي</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800">ينتهي الحق بوفاة الطرف المحدد</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800 font-bold">لا يجوز التفويت إلا للمعطي أو لورثته</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <p className="text-sm text-gray-800">في العقار المحفظ يجب الإشهار بالرسم العقاري</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }))}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-bold"
          >
            السابق
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (state.omra?.isGiverOwner !== 'نعم') {
                alert('يجب أن يكون المعطي مالكاً للعقار');
                return;
              }
              if (state.omra?.usageType === 'غير_ذلك') {
                alert('الاستغلال يجب أن يكون بالإقامة أو بأخذ الغلة');
                return;
              }
              
              setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-lg"
          >
            التالي
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Paternity Acknowledgment Details (رسم الاقرار ببنوة/عقد الاستلحاق)
  // ============================================================================


export const OmraWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_Omra_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
