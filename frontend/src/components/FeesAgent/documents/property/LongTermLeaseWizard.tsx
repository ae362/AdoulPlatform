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

  export const Step3_LongTermLease_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const lease = state.longTermLease || {};
    
    const updateLease = (field: string, value: any) => {
      setState((prev) => ({
        ...prev,
        longTermLease: {
          ...prev.longTermLease,
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 border-b-2 pb-4">
          تفاصيل الكراء طويل الأمد
        </h2>

        {/* I. Property Verification */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
          <h3 className="text-xl font-bold text-blue-900 mb-4">I. التحقق من العقار</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                هل العقار محفظ؟
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-100">
                  <input
                    type="radio"
                    checked={lease.isPropertyRegistered === 'نعم'}
                    onChange={() => updateLease('isPropertyRegistered', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم → سجل رسم عقاري</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-100">
                  <input
                    type="radio"
                    checked={lease.isPropertyRegistered === 'لا'}
                    onChange={() => updateLease('isPropertyRegistered', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا → سجل في المحكمة الابتدائية</span>
                </label>
              </div>
            </div>

            {lease.isPropertyRegistered === 'نعم' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رقم الرسم العقاري:
                </label>
                <input
                  type="text"
                  value={lease.propertyRegistrationNumber || ''}
                  onChange={(e) => updateLease('propertyRegistrationNumber', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="أدخل رقم الرسم العقاري"
                />
              </div>
            )}

            {lease.isPropertyRegistered === 'لا' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  معلومات التسجيل بالمحكمة الابتدائية:
                </label>
                <textarea
                  value={lease.courtRegistrationInfo || ''}
                  onChange={(e) => updateLease('courtRegistrationInfo', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="مثال: مسجل بالمحكمة الابتدائية بالدار البيضاء تحت رقم..."
                />
              </div>
            )}
          </div>
        </div>

        {/* II. Lease Nature and Duration */}
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-xl font-bold text-green-900 mb-4">II. تحديد الحق</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                طبيعة الكراء:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={lease.leaseNature === 'عيني'}
                    onChange={() => updateLease('leaseNature', 'عيني')}
                    className="w-4 h-4"
                  />
                  <span>عيني</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={lease.leaseNature === 'طويل_الأمد'}
                    onChange={() => updateLease('leaseNature', 'طويل_الأمد')}
                    className="w-4 h-4"
                  />
                  <span>طويل الأمد</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                مدة الكراء (بالسنوات): <span className="text-red-600">≥10 سنوات و ≤40 سنة</span>
              </label>
              <input
                type="number"
                min="10"
                max="40"
                value={lease.leaseDurationYears || ''}
                onChange={(e) => updateLease('leaseDurationYears', parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: 20"
              />
              {lease.leaseDurationYears && (lease.leaseDurationYears < 10 || lease.leaseDurationYears > 40) && (
                <p className="text-red-600 text-sm mt-1">⚠ يجب أن تكون المدة بين 10 و 40 سنة</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نطاق الكراء:
              </label>
              <textarea
                value={lease.leaseScope || ''}
                onChange={(e) => updateLease('leaseScope', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: استخدام العقار للسكن، البناء، أو التملك المؤقت حسب الاتفاق..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ بدء الكراء:
                </label>
                <input
                  type="date"
                  value={lease.leaseStartDate || ''}
                  onChange={(e) => updateLease('leaseStartDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ انتهاء الكراء:
                </label>
                <input
                  type="date"
                  value={lease.leaseEndDate || ''}
                  onChange={(e) => updateLease('leaseEndDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* III. Tenant Rights and Obligations */}
        <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300">
          <h3 className="text-xl font-bold text-purple-900 mb-4">III. حقوق والتزامات المستأجر</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={lease.tenantRightEnjoyment || false}
                onChange={(e) => updateLease('tenantRightEnjoyment', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الحق 1:</span>
                <span className="text-sm text-gray-700">التمتع بالعقار وفق شروط العقد</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={lease.tenantObligationMaintenance || false}
                onChange={(e) => updateLease('tenantObligationMaintenance', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الالتزام 1:</span>
                <span className="text-sm text-gray-700">القيام بالأعمال اللازمة للحفاظ على العقار وصيانته (المادة 127)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={lease.tenantProhibitValueReduction || false}
                onChange={(e) => updateLease('tenantProhibitValueReduction', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ الالتزام 2:</span>
                <span className="text-sm text-gray-700">عدم إجراء تغييرات تقلل من قيمة العقار (المادة 126)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={lease.tenantRightAttachments || false}
                onChange={(e) => updateLease('tenantRightAttachments', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الحق 2:</span>
                <span className="text-sm text-gray-700">التمتع بالملحقات الناتجة عن الالتصاق أو الاندماج مع العقار (المادة 129)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={lease.tenantRightEasement || false}
                onChange={(e) => updateLease('tenantRightEasement', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الحق 3:</span>
                <span className="text-sm text-gray-700">إمكانية ترتيب حقوق ارتفاق لفائدة الغير خلال مدة الكراء مع إخطار المالك (المادة 128)</span>
              </div>
            </label>
          </div>
        </div>

        {/* IV. Landlord Rights and Obligations */}
        <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-300">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">IV. حقوق والتزامات المكري</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={lease.landlordRightDelivery || false}
                onChange={(e) => updateLease('landlordRightDelivery', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الالتزام 1:</span>
                <span className="text-sm text-gray-700">تسليم العقار صالحًا للاستعمال وفق العقد</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={lease.landlordRightRent || false}
                onChange={(e) => updateLease('landlordRightRent', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الحق 1:</span>
                <span className="text-sm text-gray-700">تلقي الواجبات في موعدها</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={lease.landlordRightJudicialAction || false}
                onChange={(e) => updateLease('landlordRightJudicialAction', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ الحق 2:</span>
                <span className="text-sm text-gray-700">إمكانية اتخاذ إجراء قضائي عند التخلف عن الأداء سنتين متتاليتين أو الإضرار بالعقار (المادة 124)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={lease.landlordObligationHumanitarian || false}
                onChange={(e) => updateLease('landlordObligationHumanitarian', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚖ الالتزام 2:</span>
                <span className="text-sm text-gray-700">مراعاة الظروف الإنسانية للمستأجر عند الفسخ القضائي</span>
              </div>
            </label>
          </div>
        </div>

        {/* V. Termination and Expiry */}
        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
          <h3 className="text-xl font-bold text-yellow-900 mb-4">V. الفسخ وانقضاء الحق</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={lease.terminationContractEnd || false}
                onChange={(e) => updateLease('terminationContractEnd', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ السبب 1:</span>
                <span className="text-sm text-gray-700">انتهاء مدة العقد المحددة</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={lease.terminationNonPayment || false}
                onChange={(e) => updateLease('terminationNonPayment', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ السبب 2:</span>
                <span className="text-sm text-gray-700">تخلف المستأجر عن الأداء لمدة سنتين متتاليتين بعد إنذار</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={lease.terminationDamage || false}
                onChange={(e) => updateLease('terminationDamage', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ السبب 3:</span>
                <span className="text-sm text-gray-700">الإضرار الجسيم بالعقار أو عدم تنفيذ الشروط</span>
              </div>
            </label>
          </div>
        </div>

        {/* VI. Warnings and Alerts */}
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300">
          <h3 className="text-xl font-bold text-red-900 mb-4">VI. التنبيهات والتحذيرات</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={lease.acknowledgeDuration10to40 || false}
                onChange={(e) => updateLease('acknowledgeDuration10to40', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 1:</span>
                <span className="text-sm text-gray-700">التأكد من أن مدة الكراء بين 10 و40 سنة</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={lease.acknowledgeOfficialDocument || false}
                onChange={(e) => updateLease('acknowledgeOfficialDocument', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 2:</span>
                <span className="text-sm text-gray-700">توثيق العقد رسميًا تحت طائلة البطلان</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={lease.acknowledgeNoEscape || false}
                onChange={(e) => updateLease('acknowledgeNoEscape', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 3:</span>
                <span className="text-sm text-gray-700">المستأجر لا يمكنه التملص من الالتزامات بتخليه عن الملك</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={lease.acknowledgeImprovementsOwnership || false}
                onChange={(e) => updateLease('acknowledgeImprovementsOwnership', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 4:</span>
                <span className="text-sm text-gray-700">الأعمال أو التحسينات التي تزيد قيمة العقار تبقى ملكًا للمالك بعد انتهاء العقد</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={lease.acknowledgeRepairObligation || false}
                onChange={(e) => updateLease('acknowledgeRepairObligation', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-red-800 block">⚠ تحذير 5:</span>
                <span className="text-sm text-gray-700">الالتزام بالإصلاحات وفق سبب الضرر (حادث فجائي أو قوة قاهرة يعفي من إعادة البناء)</span>
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
  // Step 3: Building Proof (ثبوت بناء)
  // ============================================================================

export const LongTermLeaseWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_LongTermLease_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
