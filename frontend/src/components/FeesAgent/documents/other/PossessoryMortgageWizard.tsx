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

  export const Step3_PossessoryMortgage_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const mortgage = state.possessoryMortgage || {};
    
    const updateMortgage = (field: string, value: any) => {
      setState((prev) => ({
        ...prev,
        possessoryMortgage: {
          ...prev.possessoryMortgage,
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 border-b-2 pb-4">
          تفاصيل الرهن الحيازي
        </h2>

        {/* I. Property Verification */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
          <h3 className="text-xl font-bold text-blue-900 mb-4">I. التحقق من العقار المرهون</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                هل العقار محفظ؟
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mortgage.isPropertyRegistered === 'نعم'}
                    onChange={() => updateMortgage('isPropertyRegistered', 'نعم')}
                    className="w-4 h-4"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={mortgage.isPropertyRegistered === 'لا'}
                    onChange={() => updateMortgage('isPropertyRegistered', 'لا')}
                    className="w-4 h-4"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>

            {mortgage.isPropertyRegistered === 'نعم' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رقم الرسم العقاري:
                </label>
                <input
                  type="text"
                  value={mortgage.propertyRegistrationNumber || ''}
                  onChange={(e) => updateMortgage('propertyRegistrationNumber', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="أدخل رقم الرسم العقاري"
                />
              </div>
            )}

            {mortgage.isPropertyRegistered === 'لا' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.possessionInspectionRequired || false}
                    onChange={(e) => updateMortgage('possessionInspectionRequired', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold text-yellow-900">
                    ⚠ يلزم معاينة الحيازة الفعلية للعقار غير المحفظ
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* II. Pledge Details */}
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-xl font-bold text-green-900 mb-4">II. تفاصيل العقار والدين المضمون</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                نوع الرهن:
              </label>
              <input
                type="text"
                value="حيازي"
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                موقع العقار المرهون:
              </label>
              <input
                type="text"
                value={mortgage.propertyLocation || ''}
                onChange={(e) => updateMortgage('propertyLocation', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: حي النخيل، شارع الزيتون، الرباط"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                مساحة العقار:
              </label>
              <input
                type="text"
                value={mortgage.propertyArea || ''}
                onChange={(e) => updateMortgage('propertyArea', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: 200 متر مربع"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                مكونات العقار:
              </label>
              <textarea
                value={mortgage.propertyComponents || ''}
                onChange={(e) => updateMortgage('propertyComponents', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: منزل مكون من طابقين، به 4 غرف، صالون، مطبخ، حمامين، ساحة..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                المرجع العقاري (إن وجد):
              </label>
              <input
                type="text"
                value={mortgage.propertyRegistrationRef || ''}
                onChange={(e) => updateMortgage('propertyRegistrationRef', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="رسم عقاري، عقد ملكية، رسم إراثة..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  مبلغ الدين المضمون (بالأرقام):
                </label>
                <input
                  type="number"
                  value={mortgage.securedDebtAmount || ''}
                  onChange={(e) => updateMortgage('securedDebtAmount', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: 500000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  مبلغ الدين (بالحروف):
                </label>
                <input
                  type="text"
                  value={mortgage.securedDebtAmountInWords || ''}
                  onChange={(e) => updateMortgage('securedDebtAmountInWords', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: خمسمائة ألف درهم"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  مدة الدين:
                </label>
                <input
                  type="text"
                  value={mortgage.debtDuration || ''}
                  onChange={(e) => updateMortgage('debtDuration', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: سنتان"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  مدة الدين (بالأشهر):
                </label>
                <input
                  type="number"
                  value={mortgage.debtDurationInMonths || ''}
                  onChange={(e) => updateMortgage('debtDurationInMonths', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="24"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                شروط الدين الإضافية:
              </label>
              <textarea
                value={mortgage.mortgageTerms || ''}
                onChange={(e) => updateMortgage('mortgageTerms', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: فوائد، أقساط شهرية، شروط التسديد المبكر..."
              />
            </div>
          </div>
        </div>

        {/* III. Party Roles */}
        <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300">
          <h3 className="text-xl font-bold text-purple-900 mb-4">III. صفة الراهن</h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الراهن هو:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-purple-100">
                <input
                  type="radio"
                  checked={mortgage.pledgorRole === 'مدين'}
                  onChange={() => updateMortgage('pledgorRole', 'مدين')}
                  className="w-4 h-4"
                />
                <span>المدين نفسه</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-purple-100">
                <input
                  type="radio"
                  checked={mortgage.pledgorRole === 'كفيل_عيني'}
                  onChange={() => updateMortgage('pledgorRole', 'كفيل_عيني')}
                  className="w-4 h-4"
                />
                <span>كفيل عيني (غير المدين)</span>
              </label>
            </div>
          </div>
        </div>

        {/* IV. Validity Conditions */}
        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
          <h3 className="text-xl font-bold text-yellow-900 mb-4">IV. شروط الصحة (المواد 156-159)</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={mortgage.acknowledgeOfficialContract || false}
                onChange={(e) => updateMortgage('acknowledgeOfficialContract', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✅ شرط 1:</span>
                <span className="text-sm text-gray-700">عقد رسمي (المادة 156)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={mortgage.acknowledgeDefinedDuration || false}
                onChange={(e) => updateMortgage('acknowledgeDefinedDuration', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✅ شرط 2:</span>
                <span className="text-sm text-gray-700">تحديد مدة الدين (المادة 157)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={mortgage.acknowledgePossessionInspection || false}
                onChange={(e) => updateMortgage('acknowledgePossessionInspection', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✅ شرط 3:</span>
                <span className="text-sm text-gray-700">معاينة الحيازة الفعلية للمرهون (المادة 158)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={mortgage.acknowledgeOwnership || false}
                onChange={(e) => updateMortgage('acknowledgeOwnership', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✅ شرط 4:</span>
                <span className="text-sm text-gray-700">التحقق من ملكية الراهن للعقار المرهون</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200">
              <input
                type="checkbox"
                checked={mortgage.acknowledgeCapacity || false}
                onChange={(e) => updateMortgage('acknowledgeCapacity', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✅ شرط 5:</span>
                <span className="text-sm text-gray-700">التحقق من أهلية الراهن للتصرف (بالغ، رشيد، غير محجور عليه)</span>
              </div>
            </label>
          </div>
        </div>

        {/* V. Creditor Rights and Effects */}
        <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-300">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">V. حقوق الدائن المرتهن (المواد 155-160)</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={mortgage.creditorRightPossession || false}
                onChange={(e) => updateMortgage('creditorRightPossession', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">🔹 الحق 1:</span>
                <span className="text-sm text-gray-700">حيازة المرهون وحفظه (المادة 155)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={mortgage.creditorRightAuctionSale || false}
                onChange={(e) => updateMortgage('creditorRightAuctionSale', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">🔹 الحق 2:</span>
                <span className="text-sm text-gray-700">طلب البيع بالمزاد العلني عند حلول الأجل (المادة 160)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={mortgage.creditorRightRecovery || false}
                onChange={(e) => updateMortgage('creditorRightRecovery', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">🔹 الحق 3:</span>
                <span className="text-sm text-gray-700">استيفاء دينه من ثمن المرهون بالأولوية (المادة 159)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={mortgage.creditorRightFruits || false}
                onChange={(e) => updateMortgage('creditorRightFruits', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">🔹 الحق 4:</span>
                <span className="text-sm text-gray-700">قبض ثمار المرهون وخصمها من الدين (المادة 157)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-200">
              <input
                type="checkbox"
                checked={mortgage.creditorRightRepairs || false}
                onChange={(e) => updateMortgage('creditorRightRepairs', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">🔹 الحق 5:</span>
                <span className="text-sm text-gray-700">استرداد نفقات الصيانة والحفظ (المادة 164)</span>
              </div>
            </label>
          </div>
        </div>

        {/* VI. Debtor Rights and Obligations */}
        <div className="bg-teal-50 p-6 rounded-lg border-2 border-teal-300">
          <h3 className="text-xl font-bold text-teal-900 mb-4">VI. حقوق والتزامات الراهن</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={mortgage.debtorRightEarlyPayment || false}
                onChange={(e) => updateMortgage('debtorRightEarlyPayment', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">✔ حق الوفاء المسبق:</span>
                <span className="text-sm text-gray-700">يحق للراهن سداد الدين قبل الأجل واسترداد المرهون</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
              <input
                type="checkbox"
                checked={mortgage.debtorObligationExpenses || false}
                onChange={(e) => updateMortgage('debtorObligationExpenses', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ التزام:</span>
                <span className="text-sm text-gray-700">رد نفقات الصيانة والحفظ الضرورية للمرتهن (المادة 164)</span>
              </div>
            </label>
          </div>
        </div>

        {/* VII. Termination Conditions & Warnings */}
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300">
          <h3 className="text-xl font-bold text-red-900 mb-4">VII. أسباب الانقضاء والتحذيرات</h3>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-gray-800 mb-3">أسباب انقضاء الرهن:</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.terminationDebtExtinguished || false}
                    onChange={(e) => updateMortgage('terminationDebtExtinguished', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">1. انقضاء الدين المضمون (وفاء، إبراء، مقاصة...)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.terminationCreditorWaiver || false}
                    onChange={(e) => updateMortgage('terminationCreditorWaiver', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">2. تنازل الدائن المرتهن عن الرهن</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.terminationPropertyDestruction || false}
                    onChange={(e) => updateMortgage('terminationPropertyDestruction', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">3. هلاك المرهون بسبب أجنبي</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.terminationMerger || false}
                    onChange={(e) => updateMortgage('terminationMerger', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">4. اتحاد الذمة (صار المرتهن مالكاً للمرهون أو العكس)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.terminationForcedSale || false}
                    onChange={(e) => updateMortgage('terminationForcedSale', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">5. البيع الجبري واستيفاء الدين من الثمن</span>
                </label>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-3">⚠ تحذيرات قانونية:</h4>
              <div className="space-y-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.acknowledgeNoAutomaticOwnership || false}
                    onChange={(e) => updateMortgage('acknowledgeNoAutomaticOwnership', e.target.checked)}
                    className="w-4 h-4 mt-1"
                  />
                  <span className="text-sm">1. <strong>بطلان شرط التملك:</strong> يبطل كل شرط يجيز للمرتهن تملك المرهون عند عدم الوفاء (المادة 154/2)</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.acknowledgeIndivisibility || false}
                    onChange={(e) => updateMortgage('acknowledgeIndivisibility', e.target.checked)}
                    className="w-4 h-4 mt-1"
                  />
                  <span className="text-sm">2. <strong>عدم التجزئة:</strong> الرهن غير قابل للتجزئة (كل جزء من المرهون ضامن لكل الدين)</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.acknowledgeMinorRestrictions || false}
                    onChange={(e) => updateMortgage('acknowledgeMinorRestrictions', e.target.checked)}
                    className="w-4 h-4 mt-1"
                  />
                  <span className="text-sm">3. <strong>رهن أموال القاصر:</strong> لا يجوز إلا بإذن المحكمة (المادة 266 مدونة الأسرة)</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.acknowledgeCreditorLiability || false}
                    onChange={(e) => updateMortgage('acknowledgeCreditorLiability', e.target.checked)}
                    className="w-4 h-4 mt-1"
                  />
                  <span className="text-sm">4. <strong>مسؤولية المرتهن:</strong> يلتزم بحفظ المرهون ويضمن هلاكه بتقصيره (المادة 155)</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.acknowledgeExpenseDeduction || false}
                    onChange={(e) => updateMortgage('acknowledgeExpenseDeduction', e.target.checked)}
                    className="w-4 h-4 mt-1"
                  />
                  <span className="text-sm">5. <strong>خصم النفقات:</strong> للمرتهن خصم نفقات الصيانة من الثمار أو من ثمن البيع (المادة 164)</span>
                </label>
              </div>
            </div>
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
  // Step 3: Long-term Lease Details (كراء طويل الأمد)
  // ============================================================================

export const PossessoryMortgageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_PossessoryMortgage_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
