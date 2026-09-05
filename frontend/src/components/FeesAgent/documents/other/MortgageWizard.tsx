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

  export const Step3_OfficialMortgage_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const mortgage = state.officialMortgage || {};
    
    const updateMortgage = (field: string, value: any) => {
      setState((prev) => ({
        ...prev,
        officialMortgage: {
          ...prev.officialMortgage,
          [field]: value,
        },
      }));
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 border-b-2 pb-4">
          تفاصيل الرهن الرسمي على عقار
        </h2>

        {/* I. تعريف قانوني وأطراف الرهن */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
          <h3 className="text-xl font-bold text-blue-900 mb-3">I. التعريف والأطراف (المواد 165-175 من م.ح.ع)</h3>
          <p className="text-sm text-blue-900 leading-relaxed">
            الرهن الرسمي حق عيني تبعي يتقرر على عقار محفظ أو في طور التحفيظ لضمان أداء دين، 
            ويمنح للدائن المرتهن حق تتبع العقار في أي يد يكون وحق الأفضلية في استيفاء دينه من ثمنه.
          </p>
          <p className="text-xs text-blue-800 mt-3">
            🔎 أطراف الرهن: الراهن (المدين أو الكفيل العيني)، الدائن المرتهن (غالباً بنك أو مؤسسة ائتمان)، 
            وقد يوجد حائز للعقار أو كفيل عيني مستقل.
          </p>
        </div>

        {/* II. التحقق من العقار والتقييد */}
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-xl font-bold text-green-900 mb-4">II. بيانات العقار والتقييد بالسجل العقاري</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                هل العقار محفظ أو في طور التحفيظ؟
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
                  <span>لا (⚠ الرهن الرسمي يفترض في الأصل عقاراً محفظاً)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رقم الرسم العقاري / مطلب التحفيظ:
                </label>
                <input
                  type="text"
                  value={mortgage.propertyRegistrationNumber || ''}
                  onChange={(e) => updateMortgage('propertyRegistrationNumber', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: 12345/06 أو 10-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  موقع العقار:
                </label>
                <input
                  type="text"
                  value={mortgage.propertyLocation || ''}
                  onChange={(e) => updateMortgage('propertyLocation', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: حي الرياض، الرباط"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                وصف مختصر للعقار المرهون:
              </label>
              <textarea
                value={mortgage.propertyDescription || ''}
                onChange={(e) => updateMortgage('propertyDescription', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: شقة بالطابق الثالث، تتكون من..."
              />
            </div>
          </div>
        </div>

        {/* III. طبيعة الدين وشروطه (المادة 175) */}
        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
          <h3 className="text-xl font-bold text-yellow-900 mb-4">III. بيانات الدين المضمون وشروطه</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل الدين ناتج عن قرض بنكي؟
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mortgage.isBankLoan === 'نعم'}
                      onChange={() => updateMortgage('isBankLoan', 'نعم')}
                      className="w-4 h-4"
                    />
                    <span>نعم (قرض بنكي / تمويل)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={mortgage.isBankLoan === 'لا'}
                      onChange={() => updateMortgage('isBankLoan', 'لا')}
                      className="w-4 h-4"
                    />
                    <span>لا (دين بين أفراد أو مؤسسات أخرى)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع الدائن المرتهن:
                </label>
                <select
                  value={mortgage.creditorType || ''}
                  onChange={(e) => updateMortgage('creditorType', e.target.value || undefined)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر...</option>
                  <option value="بنك">بنك</option>
                  <option value="مؤسسة_ائتمان">مؤسسة ائتمان / تمويل</option>
                  <option value="شخص_ذاتي">شخص ذاتي</option>
                  <option value="شخص_معنوي">شركة / شخص معنوي</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم الدائن المرتهن:
                </label>
                <input
                  type="text"
                  value={mortgage.creditorName || ''}
                  onChange={(e) => updateMortgage('creditorName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: البنك الشعبي، شركة تمويل..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  مرجع عقد القرض / السند:
                </label>
                <input
                  type="text"
                  value={mortgage.loanContractRef || ''}
                  onChange={(e) => updateMortgage('loanContractRef', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="رقم العقد، تاريخ، مرجع..."
                />
              </div>
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
                  placeholder="مثال: 800000"
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
                  placeholder="مثال: ثمانمائة ألف درهم"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع الفائدة:
                </label>
                <select
                  value={mortgage.interestType || ''}
                  onChange={(e) => updateMortgage('interestType', e.target.value || undefined)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر...</option>
                  <option value="ثابت">ثابتة</option>
                  <option value="متغير">متغيرة</option>
                  <option value="بدون_فوائد">بدون فوائد</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نسبة الفائدة / العائد (%):
                </label>
                <input
                  type="number"
                  value={mortgage.interestRate || ''}
                  onChange={(e) => updateMortgage('interestRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: 4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ الاستحقاق النهائي للدين:
                </label>
                <input
                  type="date"
                  value={mortgage.maturityDate || ''}
                  onChange={(e) => updateMortgage('maturityDate', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* IV. نوع الرهن والرتبة والتحملات السابقة */}
        <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300">
          <h3 className="text-xl font-bold text-purple-900 mb-4">IV. نوع الرهن والرتبة والتحملات السابقة</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع الرهن الرسمي:
                </label>
                <select
                  value={mortgage.mortgageType || ''}
                  onChange={(e) => updateMortgage('mortgageType', e.target.value || undefined)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر...</option>
                  <option value="اتفاقي">اتفاقي (عقد بين الأطراف)</option>
                  <option value="إجباري">إجباري (بمقتضى حكم أو نص خاص)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  السند المنشئ للدين / للرهن:
                </label>
                <input
                  type="text"
                  value={mortgage.sourceInstrument || ''}
                  onChange={(e) => updateMortgage('sourceInstrument', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="مثال: عقد قرض، حكم قضائي، سند رسمي..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  هل توجد رهون سابقة على نفس العقار؟
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.hasPriorMortgages || false}
                    onChange={(e) => updateMortgage('hasPriorMortgages', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>نعم، يوجد واحد أو أكثر من الرهون السابقة</span>
                </label>
                {mortgage.hasPriorMortgages && (
                  <textarea
                    value={mortgage.priorMortgagesDescription || ''}
                    onChange={(e) => updateMortgage('priorMortgagesDescription', e.target.value)}
                    className="w-full mt-2 px-4 py-2 border rounded-lg"
                    rows={2}
                    placeholder="وصف موجز للرهون السابقة ورتبتها..."
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تحفظات أو حجوزات أو إنذارات سابقة:
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mortgage.hasReservationsOrSeizures || false}
                    onChange={(e) => updateMortgage('hasReservationsOrSeizures', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>نعم، توجد تحفظات / حجوزات / إنذارات سابقة</span>
                </label>
                {mortgage.hasReservationsOrSeizures && (
                  <textarea
                    value={mortgage.reservationsDescription || ''}
                    onChange={(e) => updateMortgage('reservationsDescription', e.target.value)}
                    className="w-full mt-2 px-4 py-2 border rounded-lg"
                    rows={2}
                    placeholder="بيان موجز للتحفظات أو الحجوزات أو الإنذارات..."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* V. التحذيرات القانونية الأساسية */}
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300">
          <h3 className="text-xl font-bold text-red-900 mb-4">V. تحذيرات قانونية (مقتطفات من المواد 175 وما بعدها)</h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={mortgage.alertNoOwnershipOnDefault || false}
                onChange={(e) => updateMortgage('alertNoOwnershipOnDefault', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span className="text-sm text-gray-800">
                1. <strong>بطلان شرط التملك عند عدم الوفاء:</strong> يبطل كل شرط يجعل العقار المرهون مملوكاً للدائن تلقائياً عند عدم الأداء.
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={mortgage.alertNeedsCPCProcedure || false}
                onChange={(e) => updateMortgage('alertNeedsCPCProcedure', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span className="text-sm text-gray-800">
                2. <strong>احترام مسطرة البيع الجبري:</strong> تنفيذ الرهن يتم وفق مسطرة قانون المسطرة المدنية، وليس بالاتفاق على نقل الملكية مباشرة.
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={mortgage.alertCannotCoverFutureRevenuesOnly || false}
                onChange={(e) => updateMortgage('alertCannotCoverFutureRevenuesOnly', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span className="text-sm text-gray-800">
                3. <strong>عدم جواز رهن الدخل المستقبلي وحده:</strong> لا يجوز أن ينصب الرهن الرسمي على الغلة المستقبلية وحدها دون أصل العقار إلا في حالات خاصة.
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={mortgage.alertMustDefineDebtAndTerm || false}
                onChange={(e) => updateMortgage('alertMustDefineDebtAndTerm', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span className="text-sm text-gray-800">
                4. <strong>وجوب تحديد مبلغ الدين ومدته:</strong> يجب أن يذكر في الرسم مبلغ الدين أو حده الأقصى والأجل النهائي للاستحقاق.
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={mortgage.alertRespectRanking || false}
                onChange={(e) => updateMortgage('alertRespectRanking', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span className="text-sm text-gray-800">
                5. <strong>ترتيب الرهون:</strong> تُرتب الرهون بحسب تاريخ تقييدها، ويجب التنبيه إلى رتبة هذا الرهن مقارنة بالرهون السابقة.
              </span>
            </label>
          </div>
        </div>

        {/* VI. المسار العملي (قبل وبعد التلقي) + أسئلة ذكية */}
        <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-300">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">VI. المسار العملي والأسئلة الذكية</h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 mb-2">مسار العمل العملي:</h4>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={mortgage.workflowCheckedRCExtract || false}
                  onChange={(e) => updateMortgage('workflowCheckedRCExtract', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  تم الاطلاع على نظير الرسم العقاري/شهادة الملكية والتأكد من خلوه مما يعيق الرهن أو مع تسجيل التحفظات.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={mortgage.workflowCheckedBankOffer || false}
                  onChange={(e) => updateMortgage('workflowCheckedBankOffer', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  تم الاطلاع على عرض البنك / جدول السداد وملاءمته لمقتضيات الرهن الرسمي.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={mortgage.workflowExplainedRankingToParties || false}
                  onChange={(e) => updateMortgage('workflowExplainedRankingToParties', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  تم توضيح رتبة هذا الرهن وآثاره للراهنين والدائنين المرتهنين.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={mortgage.workflowPlanForRegistration || false}
                  onChange={(e) => updateMortgage('workflowPlanForRegistration', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  تم الاتفاق على مسطرة إيداع الرسم لدى المحافظة العقارية وتتبع تقييده.
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 mb-2">أسئلة ذكية لتقييم المخاطر:</h4>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  صفة المدين الأصلي:
                </label>
                <select
                  value={mortgage.smartDebtorType || ''}
                  onChange={(e) => updateMortgage('smartDebtorType', e.target.value || undefined)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر...</option>
                  <option value="شخص_ذاتي">شخص ذاتي</option>
                  <option value="شخص_معنوي">شركة / مقاولة / تعاونية</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  حالة تسجيل الرهن:
                </label>
                <select
                  value={mortgage.smartRegistrationStatus || ''}
                  onChange={(e) => updateMortgage('smartRegistrationStatus', e.target.value || undefined)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">اختر...</option>
                  <option value="مسجل">تم التقييد بالرسم العقاري</option>
                  <option value="غير_مسجل">في طور الإيداع / لم يسجل بعد</option>
                </select>
              </div>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(mortgage.smartHasPriorMortgages)}
                  onChange={(e) => updateMortgage('smartHasPriorMortgages', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  توجد رهون سابقة أو ديون ممتازة تؤثر في أولوية هذا الرهن.
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(mortgage.smartHasReservations)}
                  onChange={(e) => updateMortgage('smartHasReservations', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  توجد تحفظات أو إنذارات أو حجوزات مسجلة ينبغي مراعاتها.
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(mortgage.smartHasRealGuarantor)}
                  onChange={(e) => updateMortgage('smartHasRealGuarantor', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  يوجد كفيل عيني أو مالك آخر يقدم عقاره ضماناً لدين الغير، وتم تنبيهه إلى هذه الطبيعة.
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(mortgage.smartMaturityExceeded)}
                  onChange={(e) => updateMortgage('smartMaturityExceeded', e.target.checked)}
                  className="w-4 h-4 mt-1"
                />
                <span className="text-sm">
                  تجاوز الدين أجل الاستحقاق دون تسوية، ويُحتمل اللجوء إلى مسطرة التحقيق والبيع الجبري.
                </span>
              </label>
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
  // Step 3: Possessory Mortgage Details (رهن حيازي)
  // ============================================================================

export const MortgageWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_OfficialMortgage_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
