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

  export const Step3_Waqf_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const waqf = state.waqfContract || {};
    
    const updateWaqf = (field: string, value: any) => {
      setState((prev) => ({
        ...prev,
        waqfContract: {
          ...prev.waqfContract,
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 border-b-2 pb-4">
          تفاصيل عقد التحبيس
        </h2>

        {/* I. Document Details */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
          <h3 className="text-xl font-bold text-blue-900 mb-4">I. المحرر الرسمي</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نوع المحرّر:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.documentType === 'محضر_إشهاد'}
                    onChange={() => updateWaqf('documentType', 'محضر_إشهاد')}
                    className="w-4 h-4"
                  />
                  <span>محضر إشهاد</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.documentType === 'وثيقة_موثقة'}
                    onChange={() => updateWaqf('documentType', 'وثيقة_موثقة')}
                    className="w-4 h-4"
                  />
                  <span>وثيقة موثّقة</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                رقم الشهادة / المحرّر:
              </label>
              <input
                type="text"
                value={waqf.documentNumber || ''}
                onChange={(e) => updateWaqf('documentNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: 2026/0001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                المحكمة أو المكتب العدلي المكلف:
              </label>
              <input
                type="text"
                value={waqf.court || ''}
                onChange={(e) => updateWaqf('court', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: محكمة الدار البيضاء الابتدائية"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التاريخ:
                </label>
                <input
                  type="date"
                  value={waqf.documentDate || ''}
                  onChange={(e) => updateWaqf('documentDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الوقت:
                </label>
                <input
                  type="time"
                  value={waqf.documentTime || ''}
                  onChange={(e) => updateWaqf('documentTime', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* II. Waqf Property Details */}
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-xl font-bold text-green-900 mb-4">II. بيانات المال الموقوف</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نوع المال:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.propertyType === 'عقار'}
                    onChange={() => updateWaqf('propertyType', 'عقار')}
                    className="w-4 h-4"
                  />
                  <span>عقار</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.propertyType === 'منقول'}
                    onChange={() => updateWaqf('propertyType', 'منقول')}
                    className="w-4 h-4"
                  />
                  <span>منقول</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                موقع المال الموقوف:
              </label>
              <input
                type="text"
                value={waqf.propertyLocation || ''}
                onChange={(e) => updateWaqf('propertyLocation', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: حي الرياض، شارع الزيتون"
              />
            </div>

            {waqf.propertyType === 'عقار' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    رقم الرسم العقاري (إذا كان محفظًا):
                  </label>
                  <input
                    type="text"
                    value={waqf.propertyRegistrationNumber || ''}
                    onChange={(e) => updateWaqf('propertyRegistrationNumber', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="رقم الرسم العقاري"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    المساحة:
                  </label>
                  <input
                    type="text"
                    value={waqf.propertyArea || ''}
                    onChange={(e) => updateWaqf('propertyArea', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="مثال: 500 متر مربع"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الوصف الكامل للمال:
              </label>
              <textarea
                value={waqf.propertyDescription || ''}
                onChange={(e) => updateWaqf('propertyDescription', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="وصف مفصل للمال الموقوف..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                حدود المال الموقوف:
              </label>
              <textarea
                value={waqf.propertyBoundaries || ''}
                onChange={(e) => updateWaqf('propertyBoundaries', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="الحدود الشمالية، الجنوبية، الشرقية، الغربية..."
              />
            </div>

            {waqf.propertyType === 'عقار' && (
              <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-400">
                <p className="text-sm text-gray-800">
                  <strong>⚠ تنبيه قانوني:</strong> إذا تعلق الوقف بعقار، يشمل كذلك الأغراس والمنشآت والبنايات الموجودة عليه ما لم يوضح الواقف خلاف ذلك.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* III. Waqf Nature & Duration */}
        <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300">
          <h3 className="text-xl font-bold text-purple-900 mb-4">III. طبيعة الوقف</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                صفة الوقف:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-purple-100">
                  <input
                    type="radio"
                    checked={waqf.waqfNature === 'عام'}
                    onChange={() => updateWaqf('waqfNature', 'عام')}
                    className="w-4 h-4"
                  />
                  <span>وقف عام (لفائدة عامة)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-purple-100">
                  <input
                    type="radio"
                    checked={waqf.waqfNature === 'خاص_أهلي'}
                    onChange={() => updateWaqf('waqfNature', 'خاص_أهلي')}
                    className="w-4 h-4"
                  />
                  <span>وقف خاص / أهلي</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                مدة الوقف:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.waqfDuration === 'مؤبد'}
                    onChange={() => updateWaqf('waqfDuration', 'مؤبد')}
                    className="w-4 h-4"
                  />
                  <span>مؤبد</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={waqf.waqfDuration === 'مؤقت'}
                    onChange={() => updateWaqf('waqfDuration', 'مؤقت')}
                    className="w-4 h-4"
                  />
                  <span>مؤقت لمدة محددة</span>
                </label>
              </div>
            </div>

            {waqf.waqfDuration === 'مؤقت' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ انتهاء الوقف:
                </label>
                <input
                  type="date"
                  value={waqf.waqfEndDate || ''}
                  onChange={(e) => updateWaqf('waqfEndDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* IV. Waqf Purposes & Benefits */}
        <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-300">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">IV. أغراض الوقف وتخصيص المنافع</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الجهة المستفيدة:
              </label>
              <input
                type="text"
                value={waqf.beneficiaryEntity || ''}
                onChange={(e) => updateWaqf('beneficiaryEntity', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: العلماء، الأيتام، المعوزون..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                كيفية صرف المنافع:
              </label>
              <textarea
                value={waqf.benefitDistribution || ''}
                onChange={(e) => updateWaqf('benefitDistribution', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="نفقات، راتب، تعليم، صحة، إلخ..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الأولويات (إن وجدت):
              </label>
              <textarea
                value={waqf.priorities || ''}
                onChange={(e) => updateWaqf('priorities', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={2}
                placeholder="تحديد الأولويات في صرف المنافع..."
              />
            </div>
          </div>
        </div>

        {/* V. Possession & Legal Representative */}
        <div className="bg-teal-50 p-6 rounded-lg border-2 border-teal-300">
          <h3 className="text-xl font-bold text-teal-900 mb-4">V. شروط التحبيس</h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgePublicNotary || false}
                onChange={(e) => updateWaqf('acknowledgePublicNotary', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الشرط 1:</span>
                <span className="text-sm text-gray-700">الإشهاد على الوقف (إلزامي)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={waqf.possessionTransferred || false}
                onChange={(e) => updateWaqf('possessionTransferred', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الشرط 2:</span>
                <span className="text-sm text-gray-700">الحوز: تسليم المال الموقوف للموقوف عليه أو إثبات الحوز حسب القانون</span>
              </div>
            </label>

            {waqf.possessionTransferred && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ تسليم الحوز:
                </label>
                <input
                  type="date"
                  value={waqf.transferredDate || ''}
                  onChange={(e) => updateWaqf('transferredDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                إذا تعذر الحوز — الأسباب القاهرة:
              </label>
              <textarea
                value={waqf.impossiblePossessionReason || ''}
                onChange={(e) => updateWaqf('impossiblePossessionReason', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={2}
                placeholder="في حالة استحالة تسليم الحوز..."
              />
            </div>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={waqf.hasMinorBeneficiary || false}
                onChange={(e) => updateWaqf('hasMinorBeneficiary', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ ملاحظة:</span>
                <span className="text-sm text-gray-700">الموقوف عليه قاصر</span>
              </div>
            </label>

            {waqf.hasMinorBeneficiary && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الممثل القانوني للقاصر:
                </label>
                <input
                  type="text"
                  value={waqf.legalRepresentative || ''}
                  onChange={(e) => updateWaqf('legalRepresentative', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="الولي أو الوصي"
                />
              </div>
            )}

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={waqf.allowsReturn || false}
                onChange={(e) => updateWaqf('allowsReturn', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ شرط الرجوع:</span>
                <span className="text-sm text-gray-700">يسمح الواقف بالرجوع في الوقف</span>
              </div>
            </label>

            {waqf.allowsReturn && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  شروط الرجوع:
                </label>
                <textarea
                  value={waqf.returnCondition || ''}
                  onChange={(e) => updateWaqf('returnCondition', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                  placeholder="تحديد شروط ومحددات الرجوع..."
                />
              </div>
            )}
          </div>
        </div>

        {/* VI. Legal Warnings */}
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300">
          <h3 className="text-xl font-bold text-red-900 mb-4">VI. التنبيهات والتحذيرات الجوهرية</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgeIrrevocable || false}
                onChange={(e) => updateWaqf('acknowledgeIrrevocable', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 1:</span>
                <span className="text-sm text-gray-700">لا يجوز الرجوع عن الوقف بعد انعقاده إلا في حالات محددة بنصّ العقد نفسه وفي حالات ضيقة جدًا</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgePossessionImportant || false}
                onChange={(e) => updateWaqf('acknowledgePossessionImportant', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 2:</span>
                <span className="text-sm text-gray-700">الحوز مهم جدًّا لإنشاء الوقف — إلا إذا ورد نص قانوني يبيح تجاوزه لسبب غير إداري أو قاهر</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgeExistingRights || false}
                onChange={(e) => updateWaqf('acknowledgeExistingRights', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 3:</span>
                <span className="text-sm text-gray-700">كافة الحقوق الواقعة على المال الموقوف تظل قائمة ما لم ينص الواقف على خلاف ذلك</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgeForbiddenDisposal || false}
                onChange={(e) => updateWaqf('acknowledgeForbiddenDisposal', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 4:</span>
                <span className="text-sm text-gray-700">المال الموقوف يعتبر محرّم التصرف فيه خارج مقتضيات الوقف</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={waqf.acknowledgeHistoricalDocuments || false}
                onChange={(e) => updateWaqf('acknowledgeHistoricalDocuments', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 5:</span>
                <span className="text-sm text-gray-700">الحوالات الحبسية (وثائق تسجيل قديمة) تعتبر دليلاً قويًا على الواقف وتحبيس المال — ما لم يثبت خلاف ذلك</span>
              </div>
            </label>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
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
  // خطوة 3: الشواهد الادارية
  // ============================================================================


export const WaqfWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_Waqf_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
