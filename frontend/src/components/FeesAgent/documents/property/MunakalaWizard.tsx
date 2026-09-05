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

  export const Step3_Munakala_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const ex = state.exchangeDeed || {};

    const updateExchange = <K extends keyof ExchangeDeed>(field: K, value: ExchangeDeed[K]) => {
      setState((prev) => ({
        ...prev,
        exchangeDeed: {
          ...(prev.exchangeDeed || {}),
          [field]: value,
        },
      }));
    };

    const updateSmart = (field: keyof NonNullable<ExchangeDeed['smartAnswers']>, value: boolean) => {
      const current = ex.smartAnswers || {};
      updateExchange('smartAnswers', { ...current, [field]: value } as any);
    };

    const property = ex.propertyContext || {};
    const updatePropertyContext = (patch: Partial<NonNullable<ExchangeDeed['propertyContext']>>) => {
      updateExchange('propertyContext', { ...property, ...patch } as any);
    };

    const ownershipSources = ex.ownershipSources || [];
    const toggleOwnershipSource = (value: NonNullable<ExchangeDeed['ownershipSources']>[number]) => {
      const exists = ownershipSources.includes(value);
      updateExchange('ownershipSources', (exists ? ownershipSources.filter((v) => v !== value) : [...ownershipSources, value]) as any);
    };

    const exchangeDetails = ex.exchangeDetails || {};
    const updateExchangeDetails = (patch: Partial<NonNullable<ExchangeDeed['exchangeDetails']>>) => {
      updateExchange('exchangeDetails', { ...exchangeDetails, ...patch } as any);
    };

    const valuation = ex.valuation || {};
    const updateValuation = (patch: Partial<NonNullable<ExchangeDeed['valuation']>>) => {
      updateExchange('valuation', { ...valuation, ...patch } as any);
    };

    const valuationMethods = valuation.methods || [];
    const toggleValuationMethod = (value: NonNullable<ExchangeDeed['valuation']['methods']>[number]) => {
      const exists = valuationMethods.includes(value);
      updateValuation({ methods: (exists ? valuationMethods.filter((v) => v !== value) : [...valuationMethods, value]) as any });
    };

    const obligations = ex.obligations || {};
    const updateObligations = (patch: Partial<NonNullable<ExchangeDeed['obligations']>>) => {
      updateExchange('obligations', { ...obligations, ...patch } as any);
    };

    const warnings = ex.warnings || {};
    const updateWarnings = (patch: Partial<NonNullable<ExchangeDeed['warnings']>>) => {
      updateExchange('warnings', { ...warnings, ...patch } as any);
    };

    const special = ex.specialCases || {};
    const updateSpecialCases = (patch: Partial<NonNullable<ExchangeDeed['specialCases']>>) => {
      updateExchange('specialCases', { ...special, ...patch } as any);
    };

    const propertyKinds = property.propertyKinds || [];
    const togglePropertyKind = (
      kind:
        | 'عقار_محفظ'
        | 'عقار_غير_محفظ'
        | 'مطلب_تحفيظ'
        | 'ملك_جماعي'
        | 'ملك_حبس'
        | 'ملك_غير_قابل_للتفويت'
        | 'ملك_فلاحي'
        | 'ملك_حضري',
    ) => {
      const exists = propertyKinds.includes(kind);
      updatePropertyContext({ propertyKinds: (exists ? propertyKinds.filter((v: any) => v !== kind) : [...propertyKinds, kind]) as any });
    };

    const anyRegisteredKind = propertyKinds.includes('عقار_محفظ');
    const anyPreRegKind = propertyKinds.includes('مطلب_تحفيظ');

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تهييء رسم المناقلة العقارية</h2>
          <p className="text-gray-700 leading-relaxed">
            المناقلة عقد معاوضة عقارية يتبادل فيه الأطراف عقارات أو حقوقًا عينية، وقد يقترن ذلك بتعويض نقدي عند تفاوت القيم. يساعدك هذا القسم على ضبط الأطراف،
            موضوع المناقلة، سبب التملك، التقويم المالي، والآثار القانونية.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800">
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مرجعية: مدونة الحقوق العينية 39.08 (الملكية والشفعة والحيازة)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">قانون الالتزامات والعقود (أحكام البيع والمعاوضة)</span>
            <a
              href="https://www.finances.gov.ma/fr/Pages/Documentation"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-full bg-white border border-green-200 text-green-800 hover:bg-green-50"
            >
              المدونة العامة للضرائب – التسجيل (رسوم المناقلة)
            </a>
          </div>
        </div>

        {/* 1. أطراف الشهادة */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">1. أطراف الشهادة (أساس النموذج)</h3>
          <p className="text-xs text-gray-600 mb-2">
            يتم استحضار بيانات الأطراف الأساسية من الخطوات السابقة، ويضاف هنا توصيف صفتهم القانونية وعلاقتهم بالإرث أو الملك المشاع.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الطرف الأول – صفته القانونية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={ex.firstPartyCapacity || ''}
                onChange={(e) => updateExchange('firstPartyCapacity', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="مالك">مالك</option>
                <option value="وارث">وارث</option>
                <option value="شريك">شريك</option>
                <option value="ذي_صفة">ذي صفة أخرى</option>
              </select>
              <label className="mt-2 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.firstPartyIsHeir || false}
                  onChange={(e) => updateExchange('firstPartyIsHeir', e.target.checked)}
                />
                <span>هل هو وارث في العقار موضوع المناقلة؟</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">الطرف الثاني – صفته القانونية</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={ex.secondPartyCapacity || ''}
                onChange={(e) => updateExchange('secondPartyCapacity', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="مالك">مالك</option>
                <option value="وارث">وارث</option>
                <option value="شريك">شريك</option>
                <option value="ذي_صفة">ذي صفة أخرى</option>
              </select>
              <label className="mt-2 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.secondPartyIsHeir || false}
                  onChange={(e) => updateExchange('secondPartyIsHeir', e.target.checked)}
                />
                <span>هل هو وارث في العقار موضوع المناقلة؟</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">هل يوجد صرف ثالث؟</label>
              <label className="inline-flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.hasThirdParty || false}
                  onChange={(e) => updateExchange('hasThirdParty', e.target.checked)}
                />
                <span>نعم، يوجد طرف ثالث في المناقلة</span>
              </label>
              {ex.hasThirdParty && (
                <>
                  <label className="block font-semibold text-gray-700 mb-1">الطرف الثالث – صفته القانونية</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={ex.thirdPartyCapacity || ''}
                    onChange={(e) => updateExchange('thirdPartyCapacity', e.target.value as any)}
                  >
                    <option value="">اختر...</option>
                    <option value="مالك">مالك</option>
                    <option value="وارث">وارث</option>
                    <option value="شريك">شريك</option>
                    <option value="ذي_صفة">ذي صفة أخرى</option>
                  </select>
                  <label className="mt-2 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={ex.thirdPartyIsHeir || false}
                      onChange={(e) => updateExchange('thirdPartyIsHeir', e.target.checked)}
                    />
                    <span>هل هو وارث أو ذو صفة إرثية؟</span>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm mt-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">صفة الوكلاء (إن وجدوا)</label>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={ex.firstPartyHasAgent || false}
                    onChange={(e) => updateExchange('firstPartyHasAgent', e.target.checked)}
                  />
                  <span>للطرف الأول وكيل</span>
                </label>
                {ex.firstPartyHasAgent && (
                  <input
                    type="text"
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="نطاق الوكالة للطرف الأول"
                    value={ex.firstPartyAgencyScope || ''}
                    onChange={(e) => updateExchange('firstPartyAgencyScope', e.target.value)}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">وكالة الطرف الثاني</label>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={ex.secondPartyHasAgent || false}
                    onChange={(e) => updateExchange('secondPartyHasAgent', e.target.checked)}
                  />
                  <span>للطرف الثاني وكيل</span>
                </label>
                {ex.secondPartyHasAgent && (
                  <input
                    type="text"
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="نطاق الوكالة للطرف الثاني"
                    value={ex.secondPartyAgencyScope || ''}
                    onChange={(e) => updateExchange('secondPartyAgencyScope', e.target.value)}
                  />
                )}
              </div>
            </div>

            {ex.hasThirdParty && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">وكالة الطرف الثالث</label>
                <div className="space-y-1">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={ex.thirdPartyHasAgent || false}
                      onChange={(e) => updateExchange('thirdPartyHasAgent', e.target.checked)}
                    />
                    <span>للطرف الثالث وكيل</span>
                  </label>
                  {ex.thirdPartyHasAgent && (
                    <input
                      type="text"
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="نطاق الوكالة للطرف الثالث"
                      value={ex.thirdPartyAgencyScope || ''}
                      onChange={(e) => updateExchange('thirdPartyAgencyScope', e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">طبيعة الحصة موضوع المناقلة</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={ex.dispositionShareType || ''}
                onChange={(e) => updateExchange('dispositionShareType', e.target.value as any)}
              >
                <option value="">اختر...</option>
                <option value="كامل_الملك">كامل الملك</option>
                <option value="نصيب_مشاع">نصيب مشاع</option>
                <option value="جزء_مفرز">جزء مفرز</option>
                <option value="غير_ذلك">غير ذلك</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">ملاحظات إضافية حول الأطراف</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={ex.partiesNotes || ''}
                onChange={(e) => updateExchange('partiesNotes', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 bg-white border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
            <p className="font-semibold mb-1">الأسئلة الذكية للأطراف:</p>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.smartAnswers?.anyPartyHeir || false}
                  onChange={(e) => updateSmart('anyPartyHeir', e.target.checked)}
                />
                <span>هل أحد الأطراف ورثة؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.smartAnswers?.includesInheritanceShare || false}
                  onChange={(e) => updateSmart('includesInheritanceShare', e.target.checked)}
                />
                <span>هل المعاملة تشمل نصيبًا إرثيًا؟</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ex.smartAnswers?.dispositionOnUndividedShare || false}
                  onChange={(e) => updateSmart('dispositionOnUndividedShare', e.target.checked)}
                />
                <span>هل التصرف واقع على نصيب مشاع؟</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. طبيعة العقار/الحقوق */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
          <h3 className="text-lg font-bold text-green-900">2. طبيعة العقار/الحقوق موضوع المناقلة</h3>
          <p className="text-xs text-gray-700 mb-2">حدد طبيعة العقار أو الحق موضوع المناقلة، مع وصفه وحدوده ومساحته.</p>

          <div className="grid sm:grid-cols-4 gap-2 text-sm">
            {[
              { key: 'عقار_محفظ', label: 'عقار محفظ' },
              { key: 'عقار_غير_محفظ', label: 'عقار غير محفظ' },
              { key: 'مطلب_تحفيظ', label: 'مطلب تحفيظ' },
              { key: 'ملك_جماعي', label: 'ملك جماعي' },
              { key: 'ملك_حبس', label: 'ملك حبس' },
              { key: 'ملك_غير_قابل_للتفويت', label: 'ملك غير قابل للتفويت' },
              { key: 'ملك_فلاحي', label: 'ملك فلاحى' },
              { key: 'ملك_حضري', label: 'ملك حضري' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={propertyKinds.includes(key as any)}
                  onChange={() => togglePropertyKind(key as any)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">تسمية العقار (الاسم العرفي)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.customaryName || ''}
                onChange={(e) => updatePropertyContext({ customaryName: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">المساحة (بالمتر أو القصبة حسب العرف)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={property.areaDescription || ''}
                onChange={(e) => updatePropertyContext({ areaDescription: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحدود الأربع</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.fourBoundaries || ''}
                onChange={(e) => updatePropertyContext({ fourBoundaries: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الأشجار/الزرع/الماء/السقي (خاصة في العقار الفلاحي)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.agriculturalElements || ''}
                onChange={(e) => updatePropertyContext({ agriculturalElements: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الحقوق التابعة (حق المرور، الماء، الهواء...)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                value={property.attachedRights || ''}
                onChange={(e) => updatePropertyContext({ attachedRights: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {anyRegisteredKind && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">رقم الرسم العقاري (إن كان العقار محفظًا)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={property.landRegistryNumber || ''}
                    onChange={(e) => updatePropertyContext({ landRegistryNumber: e.target.value })}
                  />
                </div>
              )}
              {anyPreRegKind && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">رقم مطلب التحفيظ (إن كان في طور التحفيظ)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={property.preRegistrationNumber || ''}
                    onChange={(e) => updatePropertyContext({ preRegistrationNumber: e.target.value })}
                  />
                </div>
              )}
              <p className="text-xs text-amber-800 mt-1">
                ⚠ إذا كان العقار محفظًا يجب ذكر رقم الرسم العقاري، وإذا كان في طور التحفيظ يجب ذكر رقم مطلب التحفيظ.
              </p>
            </div>
          </div>
        </div>

        {/* 3. سبب التملك أو مصدر الحق */}
        <div className="bg-white p-6 rounded-lg border-l-4 border-indigo-300 space-y-4">
          <h3 className="text-lg font-bold text-indigo-900">3. سبب التملك أو مصدر الحق</h3>
          <p className="text-xs text-gray-700 mb-2">يساعد ضبط سبب التملك في التحقق من صحة المناقلة وخاصة في حالات الإرث والمشاع.</p>

          <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
            {['شراء', 'إرث', 'قسم', 'وصية', 'حيازة', 'وثيقة_أخرى'].map((src) => (
              <label key={src} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ownershipSources.includes(src as any)}
                  onChange={() => toggleOwnershipSource(src as any)}
                />
                <span>{src === 'وثيقة_أخرى' ? 'وثيقة أخرى' : src}</span>
              </label>
            ))}
          </div>

          {ownershipSources.includes('وثيقة_أخرى') && (
            <div className="mt-3 text-sm">
              <label className="block font-semibold text-gray-700 mb-1">تحديد الوثيقة أو السند</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="مثال: رسم ملك، حكم قضائي، عقد قسمة..."
                value={ex.ownershipSourceOther || ''}
                onChange={(e) => updateExchange('ownershipSourceOther', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 4. المعاوضة والمقابلة */}
        <div className="bg-white p-6 rounded-lg border-l-4 border-purple-300 space-y-4">
          <h3 className="text-lg font-bold text-purple-900">4. المعاوضة والمقابلة (جوهر المناقلة)</h3>
          <p className="text-xs text-gray-700 mb-2">حدد بدقة ما يبذله كل طرف للآخر، مع إمكانية إضافة تعويض نقدي عند تفاوت القيم.</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الطرف الأول يبذل للطرف الثاني</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: القطعة (أ) من الملك الفلاحي الكائن بـ... مع ما عليها من أشجار..."
                value={exchangeDetails.firstPartyGives || ''}
                onChange={(e) => updateExchangeDetails({ firstPartyGives: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">الطرف الثاني يبذل للطرف الأول</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="مثال: القطعة (ج) من الملك الكائن بـ..."
                value={exchangeDetails.secondPartyGives || ''}
                onChange={(e) => updateExchangeDetails({ secondPartyGives: e.target.value })}
              />
            </div>
          </div>

          {ex.hasThirdParty && (
            <div className="text-sm">
              <label className="block font-semibold text-gray-700 mb-1">الطرف الثالث يبذل ضمن المناقلة</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                value={exchangeDetails.thirdPartyGives || ''}
                onChange={(e) => updateExchangeDetails({ thirdPartyGives: e.target.value })}
              />
            </div>
          )}

          <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm items-end">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">هل يوجد تعويض نقدي إضافي؟</label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={exchangeDetails.hasCashCompensation || false}
                  onChange={(e) => updateExchangeDetails({ hasCashCompensation: e.target.checked })}
                />
                <span>نعم، يوجد عوض نقدي بسبب اختلاف القيم</span>
              </label>
            </div>
            {exchangeDetails.hasCashCompensation && (
              <>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">مبلغ العوض النقدي (بالدرهم)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={exchangeDetails.cashCompensationAmount ?? ''}
                    onChange={(e) =>
                      updateExchangeDetails({
                        cashCompensationAmount: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">من يتحمل العوض النقدي؟</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                    value={exchangeDetails.cashCompensationPayer || ''}
                    onChange={(e) => updateExchangeDetails({ cashCompensationPayer: e.target.value as any })}
                  >
                    <option value="">اختر...</option>
                    <option value="الطرف_الأول">الطرف الأول</option>
                    <option value="الطرف_الثاني">الطرف الثاني</option>
                    {ex.hasThirdParty && <option value="الطرف_الثالث">الطرف الثالث</option>}
                    <option value="أخرى">أخرى حسب الاتفاق</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 5. التقويم المالي */}
        <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-300 space-y-4">
          <h3 className="text-lg font-bold text-yellow-900">5. التقويم المالي لتوازن الصفقة</h3>
          <p className="text-xs text-gray-700 mb-2">
            التقويم جوهري في رسم المناقلة، خاصة أمام إدارة الضرائب والمحافظة العقارية، ويستحسن تحديد أساس التقويم والأطراف التي قامت به.
          </p>

          <div className="grid sm:grid-cols-4 gap-2 text-sm">
            {[
              { key: 'تقويم_عرفي', label: 'تقويم عرفي' },
              { key: 'تقويم_خبير', label: 'تقويم خبير' },
              { key: 'تقويم_عقاري_رسمي', label: 'تقويم عقاري رسمي' },
              { key: 'تقويم_لجنة_الجماعة', label: 'تقويم لجان الجماعة (فلاحي)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={valuationMethods.includes(key as any)}
                  onChange={() => toggleValuationMethod(key as any)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="grid md:grid-cols-4 gap-4 text-sm mt-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">قيمة ما يبذله الطرف الأول (درهم)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={valuation.firstPartyPiecesValue ?? ''}
                onChange={(e) =>
                  updateValuation({ firstPartyPiecesValue: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">قيمة ما يبذله الطرف الثاني (درهم)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={valuation.secondPartyPiecesValue ?? ''}
                onChange={(e) =>
                  updateValuation({ secondPartyPiecesValue: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </div>
            {ex.hasThirdParty && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">قيمة ما يبذله الطرف الثالث (درهم)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={valuation.thirdPartyPiecesValue ?? ''}
                  onChange={(e) =>
                    updateValuation({
                      thirdPartyPiecesValue: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            )}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">قيمة الجميع (إجمالي المناقلة)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                value={valuation.totalValue ?? ''}
                onChange={(e) =>
                  updateValuation({ totalValue: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm mt-4 items-end">
            <div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={valuation.hasAdditionalCompensation || false}
                  onChange={(e) => updateValuation({ hasAdditionalCompensation: e.target.checked })}
                />
                <span>هل يوجد عوض إضافي لتعديل التوازن المالي؟</span>
              </label>
              {valuation.hasAdditionalCompensation && (
                <input
                  type="number"
                  className="mt-2 w-full px-3 py-2 border rounded-lg"
                  placeholder="مبلغ العوض الإضافي (درهم)"
                  value={valuation.additionalCompensationAmount ?? ''}
                  onChange={(e) =>
                    updateValuation({
                      additionalCompensationAmount:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              )}
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">من يتحمل الصائر (الرسوم والحقوق)؟</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-white"
                value={valuation.costsBearer || ''}
                onChange={(e) => updateValuation({ costsBearer: e.target.value as any })}
              >
                <option value="">اختر...</option>
                <option value="الطرف_الأول">الطرف الأول</option>
                <option value="الطرف_الثاني">الطرف الثاني</option>
                {ex.hasThirdParty && <option value="الطرف_الثالث">الطرف الثالث</option>}
                <option value="بالتساوي">بالتساوي بين الأطراف</option>
                <option value="حسب_الاتفاق">حسب ما يتفق عليه الأطراف</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mt-3">
            <p>
              ⚠ المناقلة تخضع للرسوم والتسجيل غالبًا بنسبة تقارب بيع العقار (تُرجع للتعريفة الجارية بالمدونة العامة للضرائب). يستحسن تدوين الأساس الذي اعتمد في التقويم.
            </p>
          </div>
        </div>

        {/* 6. الآثار القانونية والتزامات الأطراف */}
        <div className="bg-white p-6 rounded-lg border-l-4 border-gray-400 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">6. الآثار القانونية والتزامات الأطراف</h3>
          <p className="text-xs text-gray-700 mb-2">يمكن تفعيل بعض الشروط العدلية المتعارف عليها لضبط المناقلة وضمان استقرار الأوضاع القانونية.</p>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.noShare || false}
                onChange={(e) => updateObligations({ noShare: e.target.checked })}
              />
              <span>التنصيص على شرط عدم الشرك (نفي ادعاء الغير المشاركة في الملك)</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.noOption || false}
                onChange={(e) => updateObligations({ noOption: e.target.checked })}
              />
              <span>التنصيص على عدم الخيار (التراجع) بعد تمام المناقلة</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.noDoubleSale || false}
                onChange={(e) => updateObligations({ noDoubleSale: e.target.checked })}
              />
              <span>الالتزام بعدم الثنية والتصرف المكرر في نفس الملك للغير</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.movableDelivery || false}
                onChange={(e) => updateObligations({ movableDelivery: e.target.checked })}
              />
              <span>التزام الأطراف بتسليم المنقولات التابعة للعقار إن وجدت</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.evacuationObligation || false}
                onChange={(e) => updateObligations({ evacuationObligation: e.target.checked })}
              />
              <span>التزام بالإفراغ في حالة السكن (تحديد أجل الإفراغ في متن الرسم)</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={obligations.ownershipTransferAcknowledged || false}
                onChange={(e) => updateObligations({ ownershipTransferAcknowledged: e.target.checked })}
              />
              <span>الإقرار بانتقال الملكية فورًا بين الأطراف وفقًا للقانون</span>
            </label>
          </div>
        </div>

        {/* 7. التنبيهات والتحذيرات القانونية */}
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-300 space-y-4">
          <h3 className="text-lg font-bold text-red-900">7. التنبيهات والتحذيرات القانونية</h3>
          <p className="text-xs text-red-900 mb-2">هذه التنبيهات تساعد العدل على رصد مكامن الخطر في المناقلة قبل تحرير الرسم.</p>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.noExchangeOnOthersProperty || false}
                onChange={(e) => updateWarnings({ noExchangeOnOthersProperty: e.target.checked })}
              />
              <span>⚠ لا تصح المناقلة على ملك الغير دون صفة أو سند صحيح</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.inheritanceCheckRequired || false}
                onChange={(e) => updateWarnings({ inheritanceCheckRequired: e.target.checked })}
              />
              <span>⚠ إذا كان محل المناقلة نصيبًا إرثيًا يجب التحقق من الورثة والتخارج</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.shufaaRightImpacted || false}
                onChange={(e) => updateWarnings({ shufaaRightImpacted: e.target.checked })}
              />
              <span>⚠ في الملك المشاع يمكن أن يثار حق الشفعة (م 292–304 م.ح.ع)</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.agriculturalLawToConsider || false}
                onChange={(e) => updateWarnings({ agriculturalLawToConsider: e.target.checked })}
              />
              <span>⚠ إذا كانت القطع فلاحية يجب مراعاة القوانين الفلاحية والتنظيمية</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.registrationRequiredForRegisteredProperty || false}
                onChange={(e) => updateWarnings({ registrationRequiredForRegisteredProperty: e.target.checked })}
              />
              <span>⚠ في الملك المحفظ لا تنتج المناقلة آثارها تجاه الغير دون تقييد بالرسم العقاري</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={warnings.subjectToRegistrationTaxes || false}
                onChange={(e) => updateWarnings({ subjectToRegistrationTaxes: e.target.checked })}
              />
              <span>⚠ المناقلة تخضع لرسوم التسجيل والتمبر وفق المدونة العامة للضرائب</span>
            </label>
          </div>
        </div>

        {/* 8. الحالات الخاصة */}
        <div className="bg-white p-6 rounded-lg border-l-4 border-blue-300 space-y-4">
          <h3 className="text-lg font-bold text-blue-900">8. الحالات الخاصة التي يجب دعمها</h3>
          <p className="text-xs text-gray-700 mb-2">حدد ما إذا كانت المناقلة تندرج ضمن إحدى الحالات الخاصة التالية لتوجيه الصياغة والتنبيه المناسب.</p>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.betweenHeirsForTakharrouj || false}
                onChange={(e) => updateSpecialCases({ betweenHeirsForTakharrouj: e.target.checked })}
              />
              <span>مناقلة بين ورثة مقابل التخارج أو إنهاء الشيوع الإرثي</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.withPriorPossession || false}
                onChange={(e) => updateSpecialCases({ withPriorPossession: e.target.checked })}
              />
              <span>مناقلة لعقار كانت عليه حيازة سابقة مؤثرة في الملك</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.againstUsufructOrRent || false}
                onChange={(e) => updateSpecialCases({ againstUsufructOrRent: e.target.checked })}
              />
              <span>مناقلة عقارية مقابل ريع دوري أو حق انتفاع</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.betweenWaqfAndBeneficiary || false}
                onChange={(e) => updateSpecialCases({ betweenWaqfAndBeneficiary: e.target.checked })}
              />
              <span>مناقلة بين المحبس والمحبس عليه (الملك الحبسي)</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.propertyPlusCash || false}
                onChange={(e) => updateSpecialCases({ propertyPlusCash: e.target.checked })}
              />
              <span>مناقلة عقار مقابل عقار آخر + مبلغ نقدي</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.inCommonPropertyWithAbsentPartners || false}
                onChange={(e) => updateSpecialCases({ inCommonPropertyWithAbsentPartners: e.target.checked })}
              />
              <span>مناقلة في ملك مشترك مع شركاء غائبين أو مجهولين العناوين</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.shufaaNoticeToPartners || false}
                onChange={(e) => updateSpecialCases({ shufaaNoticeToPartners: e.target.checked })}
              />
              <span>إشعار الشركاء بحق الشفعة أو إشعارهم بالمناقلة</span>
            </label>
            <label className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={special.inCollectivePropertyNeedsAuthorization || false}
                onChange={(e) => updateSpecialCases({ inCollectivePropertyNeedsAuthorization: e.target.checked })}
              />
              <span>مناقلة في الملك الجماعي تتطلب ترخيصًا من الجهات المختصة</span>
            </label>
          </div>

          <div className="mt-3 text-sm">
            <label className="block font-semibold text-gray-700 mb-1">ملاحظات العدول أو عناصر خاصة بالقضية</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              value={special.notes || ''}
              onChange={(e) => updateSpecialCases({ notes: e.target.value })}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4 mt-8 p-6 bg-gray-50 rounded-lg border-t-2 border-gray-200">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
          >
            ← رجوع
          </button>
          <div className="text-sm text-gray-600">الخطوة 3 من 7: تفاصيل المناقلة</div>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            التالي: الثمن والالتزامات →
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step 3: Gift Deed Details (رسم هبة)
  // ============================================================================

export const MunakalaWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_Munakala_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
