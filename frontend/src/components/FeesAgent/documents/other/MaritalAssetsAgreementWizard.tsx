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

  export const Step3_MaritalAssetsAgreement_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const agreement = state.maritalAssetsAgreement || {};
    
    const updateAgreement = (field: keyof NonNullable<FeesAgentState['maritalAssetsAgreement']>, value: any) => {
      setState(prev => ({
        ...prev,
        maritalAssetsAgreement: {
          ...prev.maritalAssetsAgreement,
          [field]: value
        }
      }));
    };

    const toggleAssetSource = (source: string) => {
      const current = agreement.includedAssetSources || [];
      if (current.includes(source)) {
        updateAgreement('includedAssetSources', current.filter(s => s !== source));
      } else {
        updateAgreement('includedAssetSources', [...current, source]);
      }
    };

    const togglePartnershipType = (type: string) => {
      const current = agreement.partialPartnershipType || [];
      if (current.includes(type)) {
        updateAgreement('partialPartnershipType', current.filter(t => t !== type));
      } else {
        updateAgreement('partialPartnershipType', [...current, type]);
      }
    };

    const toggleLiquidationTrigger = (trigger: string) => {
      const current = agreement.liquidationTriggers || [];
      if (current.includes(trigger)) {
        updateAgreement('liquidationTriggers', current.filter(t => t !== trigger));
      } else {
        updateAgreement('liquidationTriggers', [...current, trigger]);
      }
    };

    return (
      <div className="space-y-8">
        <div className="bg-pink-50 p-6 rounded-lg border-r-4 border-pink-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تفاصيل اتفاق تدبير الأموال الزوجية</h2>
          <p className="text-gray-700">إدخال بيانات الاتفاق بين الزوجين على نظام المشاركة في الأموال</p>
        </div>

        {/* Legal Warning */}
        <div className="bg-red-100 border-l-4 border-red-600 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
            ⚠ تنبيه قانوني إلزامي
          </h3>
          <p className="text-red-900 font-semibold mb-2">
            الاتفاق لا يُبرم إلا بين زوجين بعقد زواج صحيح
          </p>
          <p className="text-red-800 text-sm">
            استنادًا للمادة 49 من مدونة الأسرة
          </p>
        </div>

        {/* I. Marriage Contract Reference */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-pink-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">I. مرجع عقد الزواج</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم عقد الزواج *</label>
              <input
                type="text"
                value={agreement.marriageContractNumber || ''}
                onChange={(e) => updateAgreement('marriageContractNumber', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="رقم العقد"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ عقد الزواج *</label>
              <input
                type="date"
                value={agreement.marriageContractDate || ''}
                onChange={(e) => updateAgreement('marriageContractDate', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الدفتر</label>
              <input
                type="text"
                value={agreement.marriageContractBook || ''}
                onChange={(e) => updateAgreement('marriageContractBook', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الصفحة</label>
              <input
                type="text"
                value={agreement.marriageContractPage || ''}
                onChange={(e) => updateAgreement('marriageContractPage', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">الموثق</label>
              <input
                type="text"
                value={agreement.marriageContractNotary || ''}
                onChange={(e) => updateAgreement('marriageContractNotary', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="اسم العدل الموثق"
              />
            </div>
          </div>
        </div>

        {/* II. Type of Financial System */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">II. طبيعة النظام المالي المتفق عليه</h3>
          
          <div className="space-y-4">
            {[
              { value: 'مشاركة_كاملة', label: 'مشاركة كاملة في جميع الأموال المكتسبة' },
              { value: 'مشاركة_جزئية', label: 'مشاركة جزئية (تختار أصناف الأموال)' },
              { value: 'انفصال_مالي', label: 'انفصال مالي كامل (للتوثيق العكسي)' },
              { value: 'نظام_مخصص', label: 'نظام مخصص (custom)' }
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition">
                <input
                  type="radio"
                  checked={agreement.financialSystemType === option.value}
                  onChange={() => updateAgreement('financialSystemType', option.value)}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="font-semibold text-gray-800">{option.label}</span>
              </label>
            ))}
          </div>

          {/* Partial Partnership Details */}
          {agreement.financialSystemType === 'مشاركة_جزئية' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-gray-800 mb-3">تحديد أصناف الأموال المشمولة:</h4>
              <div className="space-y-2">
                {['عقار', 'منقول', 'مدخرات', 'مشاريع_تجارية'].map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreement.partialPartnershipType?.includes(type) || false}
                      onChange={() => togglePartnershipType(type)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="font-semibold">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Partnership Percentages */}
          {(agreement.financialSystemType === 'مشاركة_كاملة' || agreement.financialSystemType === 'مشاركة_جزئية') && (
            <div className="mt-6 space-y-4">
              <h4 className="font-bold text-gray-800">نسب المشاركة:</h4>
              {[
                { value: 'مناصفة_50_50', label: 'مناصفة (50/50)' },
                { value: 'نسبة_70_30', label: 'نسبة 70% زوج / 30% زوجة' },
                { value: 'نسبة_30_70', label: 'نسبة 30% زوج / 70% زوجة' },
                { value: 'مشاركة_مشاعة', label: 'مشاركة مشاعة بدون نسب' },
                { value: 'أخرى', label: 'نسبة مخصصة' }
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={agreement.partnershipPercentages === option.value}
                    onChange={() => updateAgreement('partnershipPercentages', option.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-semibold">{option.label}</span>
                </label>
              ))}
              
              {agreement.partnershipPercentages === 'أخرى' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">نسبة الزوج (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={agreement.customPercentageHusband || ''}
                      onChange={(e) => updateAgreement('customPercentageHusband', parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">نسبة الزوجة (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={agreement.customPercentageWife || ''}
                      onChange={(e) => updateAgreement('customPercentageWife', parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* III. Sources of Shared Assets */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">III. مصادر الأموال المشمولة</h3>
          
          <div className="space-y-2 mb-4">
            {[
              { value: 'الأجور', label: 'الأجور' },
              { value: 'الأرباح_المهنية', label: 'الأرباح المهنية' },
              { value: 'المدخرات', label: 'المدخرات' },
              { value: 'الهبات', label: 'الهبات' },
              { value: 'الإرث', label: 'الإرث' },
              { value: 'المساعدات_الأسرية', label: 'المساعدات الأسرية' },
              { value: 'القروض_المشتركة', label: 'القروض المشتركة' }
            ].map((source) => (
              <label key={source.value} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={agreement.includedAssetSources?.includes(source.value) || false}
                  onChange={() => toggleAssetSource(source.value)}
                  className="w-4 h-4 text-green-600"
                />
                <span className="font-semibold">{source.label}</span>
              </label>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
            <p className="text-sm text-yellow-900 font-semibold">
              ⚠ تنبيه مهم: الإرث والهبة تخضعان لنية المورّث أو الواهب وقد تُخرج من نظام المشاركة إذا اشترط ذلك
            </p>
            <p className="text-xs text-yellow-800 mt-2">(فقه الأسرة + قانون الإرث)</p>
          </div>

          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={agreement.inheritanceExcluded || false}
                onChange={(e) => updateAgreement('inheritanceExcluded', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-semibold">استثناء الإرث من نظام المشاركة</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={agreement.giftExcluded || false}
                onChange={(e) => updateAgreement('giftExcluded', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-semibold">استثناء الهبات من نظام المشاركة</span>
            </label>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ملاحظات الاستثناءات</label>
              <textarea
                value={agreement.exclusionNotes || ''}
                onChange={(e) => updateAgreement('exclusionNotes', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="أي شروط أو ملاحظات خاصة بالاستثناءات..."
              />
            </div>
          </div>
        </div>

        {/* IV. Management and Administration */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">IV. إدارة وتسيير الأموال</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">من له حق التدبير؟</label>
              <div className="space-y-2">
                {[
                  { value: 'كلاهما', label: 'كلاهما' },
                  { value: 'الزوج', label: 'الزوج' },
                  { value: 'الزوجة', label: 'الزوجة' },
                  { value: 'بالتفويض', label: 'بالتفويض' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.managementAuthority === option.value}
                      onChange={() => updateAgreement('managementAuthority', option.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="font-semibold">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">سحب الأموال البنكية:</label>
              <div className="space-y-2">
                {[
                  { value: 'منفرد', label: 'منفرد' },
                  { value: 'مشترك', label: 'مشترك' },
                  { value: 'رقابة_متبادلة', label: 'رقابة متبادلة' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.bankWithdrawalType === option.value}
                      onChange={() => updateAgreement('bankWithdrawalType', option.value)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="font-semibold">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">الالتزامات المالية تجاه الغير - هل تلزم الزوج الآخر؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.financialObligationsBindOther === option}
                      onChange={() => updateAgreement('financialObligationsBindOther', option)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* V. Liquidation Terms */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">V. التصفية عند انتهاء الزواج</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">حالات انتهاء العقد:</label>
              <div className="space-y-2">
                {[
                  { value: 'الطلاق', label: 'الطلاق' },
                  { value: 'التطليق', label: 'التطليق' },
                  { value: 'الفسخ', label: 'الفسخ' },
                  { value: 'الخلع', label: 'الخلع' },
                  { value: 'الوفاة', label: 'الوفاة' },
                  { value: 'إنهاء_النظام_بالاتفاق', label: 'الاتفاق على إنهاء النظام' }
                ].map((trigger) => (
                  <label key={trigger.value} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={agreement.liquidationTriggers?.includes(trigger.value) || false}
                      onChange={() => toggleLiquidationTrigger(trigger.value)}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="font-semibold">{trigger.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">طريقة التصفية:</label>
              <div className="space-y-2">
                {[
                  { value: 'تقسيم_بالتساوي', label: 'تقسيم بالتساوي (50/50)' },
                  { value: 'بنسبة', label: 'بنسبة محددة' },
                  { value: 'بتقدير_القاضي', label: 'بتقدير القاضي' },
                  { value: 'تصفية_محاسباتية', label: 'بالتصفية المالية المحاسباتية' }
                ].map((method) => (
                  <label key={method.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.liquidationMethod === method.value}
                      onChange={() => updateAgreement('liquidationMethod', method.value)}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="font-semibold">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {agreement.liquidationMethod === 'بنسبة' && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-orange-50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">نسبة الزوج عند التصفية (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={agreement.liquidationPercentageHusband || ''}
                    onChange={(e) => updateAgreement('liquidationPercentageHusband', parseFloat(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">نسبة الزوجة عند التصفية (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={agreement.liquidationPercentageWife || ''}
                    onChange={(e) => updateAgreement('liquidationPercentageWife', parseFloat(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-2">📖 استناد تشريعي:</p>
              <p className="text-sm text-blue-800">
                المادة 49: "يعتمد القاضي في تقدير نصيب كل زوج على العطاءات والمجهودات المبذولة…"
              </p>
              <a 
                href="https://adala.justice.gov.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm mt-2 inline-block"
              >
                🔗 مدونة الأسرة - المادة 49
              </a>
            </div>
          </div>
        </div>

        {/* VI. Problematic Cases */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4">VI. حالات إشكالية يجب الانتباه لها</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل يوجد أطفال قاصرون؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.hasMinorChildren === option}
                      onChange={() => updateAgreement('hasMinorChildren', option)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>
              {agreement.hasMinorChildren === 'نعم' && (
                <p className="mt-2 text-sm text-red-700 bg-red-50 p-3 rounded">
                  🔹 تدخل النيابة العامة مطلوب
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل يوجد عقار غير محفظ؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.hasUnregisteredProperty === option}
                      onChange={() => updateAgreement('hasUnregisteredProperty', option)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>
              {agreement.hasUnregisteredProperty === 'نعم' && (
                <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                  🔹 حجية الإثبات تختلف
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل توجد شركة تجارية؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.hasCommercialCompany === option}
                      onChange={() => updateAgreement('hasCommercialCompany', option)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>
              {agreement.hasCommercialCompany === 'نعم' && (
                <p className="mt-2 text-sm text-blue-700 bg-blue-50 p-3 rounded">
                  🔹 تطبيق قانون الشركات
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">هل الأموال مختلطة (مشتراة من مصادر متعددة)؟</label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={agreement.hasMixedAssets === option}
                      onChange={() => updateAgreement('hasMixedAssets', option)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>
              {agreement.hasMixedAssets === 'نعم' && (
                <p className="mt-2 text-sm text-purple-700 bg-purple-50 p-3 rounded">
                  🔹 عبء الإثبات على من يدعي
                </p>
              )}
            </div>
          </div>
        </div>

        {/* VII. Legal Warnings */}
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-300">
          <h3 className="text-xl font-bold text-red-900 mb-4">VII. التحذيرات والتنبيهات القانونية</h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={agreement.acknowledgeNoInheritanceOverride || false}
                onChange={(e) => updateAgreement('acknowledgeNoInheritanceOverride', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ تحذير 1:</span>
                <span className="text-sm text-gray-700">الاتفاق لا ينسخ قواعد الإرث الشرعي (المادة 49 فقرة 3)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={agreement.acknowledgePostMarriageOnly || false}
                onChange={(e) => updateAgreement('acknowledgePostMarriageOnly', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ تحذير 2:</span>
                <span className="text-sm text-gray-700">لا عبرة بالمشاركة قبل الزواج إلا بنص + الاتفاق لا يدخل حيز التنفيذ إلا بعد الزواج</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={agreement.acknowledgeNotCommercialPartnership || false}
                onChange={(e) => updateAgreement('acknowledgeNotCommercialPartnership', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ تحذير 3:</span>
                <span className="text-sm text-gray-700">المشاركة لا تعني "الشركة التجارية" بل "الشيوع الشرعي"</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
              <input
                type="checkbox"
                checked={agreement.acknowledgeEvidenceRequirements || false}
                onChange={(e) => updateAgreement('acknowledgeEvidenceRequirements', e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <div>
                <span className="font-semibold text-gray-800 block">⚠ تحذير 4:</span>
                <span className="text-sm text-gray-700">لا يُحتج بالبينة الكتابية المنفردة لإخراج أموال بعد الزواج دون اتفاق</span>
              </div>
            </label>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 6 }))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التواريخ والمراجع
          </button>
        </div>
      </div>
    );
  };

export const MaritalAssetsAgreementWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 3 && <Step3_MaritalAssetsAgreement_Details state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
