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

  export const Step3_GiftDeed_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handleNext = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) + 1 }));
  };
  const handlePrev = () => {
    setState(prev => ({ ...prev, step: (prev.step || 3) - 1 }));
  };

    const gift = state.giftDeed || {};

    const updateGift = (field: keyof NonNullable<FeesAgentState['giftDeed']>, value: any) => {
      setState((prev) => ({
        ...prev,
        giftDeed: {
          ...(prev.giftDeed || {}),
          [field]: value,
        },
      }));
    };

    const toggleArray = (field: 'giftedAssetType' | 'encumbrances' | 'impedimentsToRevocation', value: string) => {
      const current = (gift as any)[field] || [];
      const next = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value];
      updateGift(field as any, next);
    };

    const toggleBoolean = (field: keyof NonNullable<FeesAgentState['giftDeed']>) => {
      updateGift(field, !((gift as any)[field] as boolean));
    };

    // Auto warning: موانع الاعتصار
    const hasRevocationImpediment = (gift.impedimentsToRevocation || []).length > 0;

    return (
      <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
        {/* Intro */}
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الثالثة: تهييء رسم الهبة</h2>
          <p className="text-gray-700 leading-relaxed">
            هذه الصفحة مخصصة لضبط هوية الأطراف، موضوع الهبة، شروط الصحة، الحوز، الاعتصار، وضعية القاصر، مرض الموت، والتسجيل الجبائي والتحفيظي.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800">
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مرجعية: مدونة الحقوق العينية 39.08 (المواد 274–280 و285)</span>
            <span className="px-3 py-1 rounded-full bg-white border border-blue-200">مراجع: البوابة الرسمية للتشريع المغربي – adala.justice.gov.ma</span>
          </div>
        </div>

        {/* A. الهوية العدلية للشهادة */}
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-300 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">A. الهوية العدلية للهبة والأطراف</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">جنس الواهب</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.donorGender === 'ذكر'}
                    onChange={() => updateGift('donorGender', 'ذكر')}
                  />
                  <span>ذكر</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.donorGender === 'أنثى'}
                    onChange={() => updateGift('donorGender', 'أنثى')}
                  />
                  <span>أنثى</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">جنس الموهوب له</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.doneeGender === 'ذكر'}
                    onChange={() => updateGift('doneeGender', 'ذكر')}
                  />
                  <span>ذكر</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.doneeGender === 'أنثى'}
                    onChange={() => updateGift('doneeGender', 'أنثى')}
                  />
                  <span>أنثى</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">علاقة الواهب بالموهوب له</label>
              <select
                value={gift.donorDoneeRelation || ''}
                onChange={(e) => updateGift('donorDoneeRelation', e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg bg-white"
              >
                <option value="">اختر...</option>
                <option value="زوج/زوجة">زوج/زوجة</option>
                <option value="ولد/ابنة">ولد/ابنة</option>
                <option value="قريب">قريب</option>
                <option value="أجنبي">أجنبي</option>
                <option value="وصي/ولي/كافل">وصي/ولي/كافل</option>
                <option value="آخر">آخر (يحدد)</option>
              </select>
              {gift.donorDoneeRelation === 'آخر' && (
                <input
                  type="text"
                  value={gift.donorDoneeRelationOther || ''}
                  onChange={(e) => updateGift('donorDoneeRelationOther', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border rounded-lg"
                  placeholder="وصف العلاقة"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">أهلية الواهب</label>
                <select
                  value={gift.donorCapacity || ''}
                  onChange={(e) => updateGift('donorCapacity', e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                >
                  <option value="">اختر...</option>
                  <option value="كامل">كامل الأهلية</option>
                  <option value="ناقص">ناقص الأهلية</option>
                  <option value="فاقد">فاقد الأهلية</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">أهلية الموهوب له</label>
                <select
                  value={gift.doneeCapacity || ''}
                  onChange={(e) => updateGift('doneeCapacity', e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                >
                  <option value="">اختر...</option>
                  <option value="كامل">كامل</option>
                  <option value="ناقص">ناقص</option>
                  <option value="فاقد">فاقد</option>
                  <option value="قاصر">قاصر</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">العدل المتلقي للشهادة</label>
              <input
                type="text"
                value={gift.receivingNotaryName || ''}
                onChange={(e) => updateGift('receivingNotaryName', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="اسم العدل أو الهيئة"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الجهة المحفوظ لديها العقد (هيئة العدول)</label>
              <input
                type="text"
                value={gift.contractKeepingEntity || ''}
                onChange={(e) => updateGift('contractKeepingEntity', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="مثال: الهيئة المحلية للعدول..."
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-semibold mb-1">تنبيه قانوني فوري (مادة 275 م.ح.ع):</p>
            <p>
              يشترط لصحة الهبة أن يكون الواهب <strong>كامل الأهلية</strong> و<strong>مالكًا للعقار وقت الهبة</strong>. يجب على العدل التنبيه إلى هذه الشروط عند تحرير الرسم.
            </p>
          </div>
        </div>

        {/* B. موضوع الهبة */}
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-300 space-y-4">
          <h3 className="text-lg font-bold text-green-900">B. موضوع الهبة (العقار/العين/الحق)</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الموهوب</label>
            <div className="grid sm:grid-cols-3 gap-2 text-sm">
              {['عقار','حق_عيني','منقول','عقار_محفظ','عقار_في_طور_التحفيظ','عقار_غير_محفظ','ملك_مشاع','ملك_مفرز'].map((key) => (
                <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={(gift.giftedAssetType || []).includes(key as any)}
                    onChange={() => toggleArray('giftedAssetType', key)}
                  />
                  <span>
                    {key === 'حق_عيني' && 'حق عيني'}
                    {key === 'عقار' && 'عقار'}
                    {key === 'منقول' && 'منقول'}
                    {key === 'عقار_محفظ' && 'عقار محفظ'}
                    {key === 'عقار_في_طور_التحفيظ' && 'عقار في طور التحفيظ'}
                    {key === 'عقار_غير_محفظ' && 'عقار غير محفظ'}
                    {key === 'ملك_مشاع' && 'ملك مشاع'}
                    {key === 'ملك_مفرز' && 'ملك مفرز'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">وصف الموهوب (شقة/دار/محل تجاري/أرض/أصل تجاري/غيره)</label>
            <textarea
              value={gift.giftedAssetDescription || ''}
              onChange={(e) => updateGift('giftedAssetDescription', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">حالة التقييد</label>
              <select
                value={gift.hasTitleDeed || ''}
                onChange={(e) => updateGift('hasTitleDeed', e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg bg-white"
              >
                <option value="">اختر...</option>
                <option value="محفظ">نعم – عقار محفظ</option>
                <option value="في_طور_التحفيظ">نعم – في طور التحفيظ (يطلب مطلب)</option>
                <option value="غير_محفظ">لا – غير محفظ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الرسم العقاري</label>
              <input
                type="text"
                value={gift.landRegistryNumber || ''}
                onChange={(e) => updateGift('landRegistryNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="يملأ عند التحفيظ"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">رقم مطلب التحفيظ (إن وجد)</label>
              <input
                type="text"
                value={gift.preRegistrationApplicationNumber || ''}
                onChange={(e) => updateGift('preRegistrationApplicationNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">هل العين محملة بتحملات؟</label>
            <div className="grid sm:grid-cols-5 gap-2 text-sm">
              {['رهن','ارتفاق','حجز','نزاع_قضائي','لا_شيء'].map((key) => (
                <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={(gift.encumbrances || []).includes(key as any)}
                    onChange={() => toggleArray('encumbrances', key)}
                  />
                  <span>
                    {key === 'رهن' && 'رهن'}
                    {key === 'ارتفاق' && 'ارتفاق'}
                    {key === 'حجز' && 'حجز'}
                    {key === 'نزاع_قضائي' && 'نزاع قضائي'}
                    {key === 'لا_شيء' && 'لا شيء'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
            <p className="font-semibold mb-1">تنبيه تحذيري (مادة 277 م.ح.ع):</p>
            <p>
              يمنع هبة <strong>عقار الغير</strong> أو <strong>المال المستقبلي</strong> أو <strong>الوعد بالهبة</strong>، ويعد ذلك باطلاً.
            </p>
          </div>
        </div>

        {/* C & D & E & F & G & H & I summarized */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* C & D & E */}
          <div className="space-y-4">
            {/* C. شروط الصحة الجوهرية */}
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-300 space-y-2">
              <h3 className="text-md font-bold text-yellow-900 mb-1">C. شروط الصحة الجوهرية</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.hasOfferAndAcceptance || false}
                  onChange={() => toggleBoolean('hasOfferAndAcceptance')}
                />
                <span>تحقق الإيجاب والقبول بين الواهب والموهوب له</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.isFormalOfficialDeed || false}
                  onChange={() => toggleBoolean('isFormalOfficialDeed')}
                />
                <span>تحرير الهبة في محرر رسمي تحت طائلة البطلان (مادة 274)</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.donorCapacityMeetsRequirements || false}
                  onChange={() => toggleBoolean('donorCapacityMeetsRequirements')}
                />
                <span>التحقق من أهلية الواهب (مادتان 275–276)</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.donorOwnsAsset || false}
                  onChange={() => toggleBoolean('donorOwnsAsset')}
                />
                <span>التأكد من ملكية الواهب للعين الموهوبة</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.acceptanceBeforeDeath || false}
                  onChange={() => toggleBoolean('acceptanceBeforeDeath')}
                />
                <span>تحقق القبول قبل وفاة الواهب (مادة 279)</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.registrationReplacesPossessionForRegistered || false}
                  onChange={() => toggleBoolean('registrationReplacesPossessionForRegistered')}
                />
                <span>التقييد يغني عن الحيازة الفعلية للعقار المحفظ أو في طور التحفيظ (مادة 274)</span>
              </label>
            </div>

            {/* D. الحوز والمعاينة */}
            <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-300 space-y-3">
              <h3 className="text-md font-bold text-indigo-900 mb-1">D. الحوز والمعاينة</h3>
              <label className="block text-sm font-semibold text-gray-700 mb-1">هل تم الحوز؟</label>
              <select
                value={gift.possessionMode || ''}
                onChange={(e) => updateGift('possessionMode', e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg bg-white text-sm"
              >
                <option value="">اختر...</option>
                <option value="فعلي">فعلي</option>
                <option value="قانوني_بالتحفيظ">قانوني (بالتحفيظ)</option>
                <option value="نيابي_لقاصر">نيابي لقاصر</option>
                <option value="غير_متاح">غير متاح (مرض/غيبة/منقول حساس)</option>
              </select>
              <textarea
                value={gift.possessionNotes || ''}
                onChange={(e) => updateGift('possessionNotes', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="تفاصيل المعاينة العدلية للحوز"
              />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                التقييد بالسجلات العقارية يغني عن الحيازة الفعلية والإخلاء للعقار المحفظ أو في طور التحفيظ (مادة 274).
              </div>
            </div>

            {/* E. شرط الاعتصار */}
            <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-300 space-y-3">
              <h3 className="text-md font-bold text-purple-900 mb-1">E. شرط الاعتصار</h3>
              <label className="block text-sm font-semibold text-gray-700 mb-1">هل اشترط الواهب حق الاعتصار؟</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.hasRevocationCondition === true}
                    onChange={() => updateGift('hasRevocationCondition', true)}
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.hasRevocationCondition === false}
                    onChange={() => updateGift('hasRevocationCondition', false)}
                  />
                  <span>لا</span>
                </label>
              </div>

              {gift.hasRevocationCondition && (
                <div className="space-y-2 mt-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الاعتصار</label>
                  <select
                    value={gift.revocationType || ''}
                    onChange={(e) => updateGift('revocationType', e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="">اختر...</option>
                    <option value="مطلق">مطلق</option>
                    <option value="مقيد">مقيد</option>
                    <option value="لأسباب_محددة">لأسباب محددة</option>
                  </select>
                  <textarea
                    value={gift.revocationReasonsDetails || ''}
                    onChange={(e) => updateGift('revocationReasonsDetails', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-sm"
                    rows={2}
                    placeholder="تحديد أسباب الاعتصار إن كانت مقيدة"
                  />

                  <label className="block text-sm font-semibold text-gray-700 mt-2 mb-1">موانع الاعتصار (مادة 285)</label>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {['زوجية_قائمة','وفاة_أحد_الطرفين','مرض_مخوف','زواج_بسبب_الهبة','تفويت_كامل','تغير_جوهري_في_القيمة','تعامل_الغير_اعتماداً_على_الهبة','هلاك_جزئي_أو_كلي'].map((key) => (
                      <label key={key} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={(gift.impedimentsToRevocation || []).includes(key as any)}
                          onChange={() => toggleArray('impedimentsToRevocation', key)}
                        />
                        <span>
                          {key === 'زوجية_قائمة' && 'زوجية قائمة'}
                          {key === 'وفاة_أحد_الطرفين' && 'وفاة أحد الطرفين'}
                          {key === 'مرض_مخوف' && 'مرض مخوف'}
                          {key === 'زواج_بسبب_الهبة' && 'زواج الموهوب له بسبب الهبة'}
                          {key === 'تفويت_كامل' && 'تفويت كامل'}
                          {key === 'تغير_جوهري_في_القيمة' && 'تغير جوهري في القيمة'}
                          {key === 'تعامل_الغير_اعتماداً_على_الهبة' && 'تعامل الغير اعتمادًا على الهبة'}
                          {key === 'هلاك_جزئي_أو_كلي' && 'هلاك جزئي أو كلي'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {hasRevocationImpediment && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900">
                      ⚠ لا يقبل الاعتصار لأن المادة 285 تمنع ذلك في حالة واحدة أو أكثر من الحالات المختارة.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* F & G & H & I */}
          <div className="space-y-4">
            {/* F. هبة القاصر */}
            <div className="bg-sky-50 p-4 rounded-lg border-l-4 border-sky-300 space-y-2">
              <h3 className="text-md font-bold text-sky-900 mb-1">F. هبة القاصر</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.isMinorDoneeBranch || false}
                  onChange={() => toggleBoolean('isMinorDoneeBranch')}
                />
                <span>الموهوب له قاصر، يتم استحضار فرع خاص للهبة لفائدة القاصر.</span>
              </label>
              {gift.isMinorDoneeBranch && (
                <div className="space-y-2 text-sm mt-2">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1"
                      checked={gift.minorBranchLegalRepresentativeRequired || false}
                      onChange={() => toggleBoolean('minorBranchLegalRepresentativeRequired')}
                    />
                    <span>استدعاء نائب قانوني (ولي/وصي/كافل) للقبول نيابة عن القاصر.</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1"
                      checked={gift.minorBranchAcceptanceByRepresentative || false}
                      onChange={() => toggleBoolean('minorBranchAcceptanceByRepresentative')}
                    />
                    <span>إثبات القبول بالنيابة في الرسم.</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1"
                      checked={gift.minorBranchPossessionByInspection || false}
                      onChange={() => toggleBoolean('minorBranchPossessionByInspection')}
                    />
                    <span>إثبات الحوز عبر المعاينة العدلية.</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1"
                      checked={gift.minorBranchMayAppointStepParent || false}
                      onChange={() => toggleBoolean('minorBranchMayAppointStepParent')}
                    />
                    <span>إمكانية تعيين زوج الأم/الأب نائبًا كما في النموذج العدلي.</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-1"
                      checked={gift.minorBranchCourtAuthorizationNeeded || false}
                      onChange={() => toggleBoolean('minorBranchCourtAuthorizationNeeded')}
                    />
                    <span>منع الإهمال والتصرف بدون إذن المحكمة عند الاقتضاء (مدونة الأسرة).</span>
                  </label>
                </div>
              )}
            </div>

            {/* G. هبة في مرض الموت */}
            <div className="bg-rose-50 p-4 rounded-lg border-l-4 border-rose-300 space-y-2">
              <h3 className="text-md font-bold text-rose-900 mb-1">G. هبة في مرض الموت</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.isDeathIllnessGift || false}
                  onChange={() => toggleBoolean('isDeathIllnessGift')}
                />
                <span>الواهب في مرض موت؛ تُطبق أحكام الوصية (مادة 280).</span>
              </label>
              <div className="flex gap-4 text-sm mt-1">
                <span className="font-semibold text-gray-700">هل للواهب ورثة؟</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.donorHasHeirs === true}
                    onChange={() => updateGift('donorHasHeirs', true)}
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="w-4 h-4"
                    checked={gift.donorHasHeirs === false}
                    onChange={() => updateGift('donorHasHeirs', false)}
                  />
                  <span>لا</span>
                </label>
              </div>
              <div className="text-xs text-rose-900 mt-1">
                إذا لم يكن له ورثة، تكون الهبة صحيحة بكاملها؛ وإلا تُعامل في حدود ثلث التركة وفق أحكام الوصية.
              </div>
            </div>

            {/* H. التسجيل والتحفيظ */}
            <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-300 space-y-2">
              <h3 className="text-md font-bold text-teal-900 mb-1">H. التسجيل والتحفيظ (جبائي + تحفظي)</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.taxDeclarationDone || false}
                  onChange={() => toggleBoolean('taxDeclarationDone')}
                />
                <span>التصريح لدى الضرائب وفق المدونة العامة للضرائب.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.registrationTaxPaid || false}
                  onChange={() => toggleBoolean('registrationTaxPaid')}
                />
                <span>أداء رسوم التسجيل (مع مراعاة النظام الخاص للهبة بين الأصول والفروع).</span>
              </label>
              <textarea
                value={gift.registrationTaxNote || ''}
                onChange={(e) => updateGift('registrationTaxNote', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm"
                rows={2}
                placeholder="ملاحظات حول المعاملة الجبائية الخاصة (إن وجدت)"
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.conservationFilingDone || false}
                  onChange={() => toggleBoolean('conservationFilingDone')}
                />
                <span>الإيداع بالمحافظة العقارية (الوكالة الوطنية للمحافظة العقارية).</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.collectionOrderExtracted || false}
                  onChange={() => toggleBoolean('collectionOrderExtracted')}
                />
                <span>استخراج الأمر بالاستخلاص وأداء الرسوم.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.giftRegisteredInLandRegistry || false}
                  onChange={() => toggleBoolean('giftRegisteredInLandRegistry')}
                />
                <span>تقييد الهبة بالرسم العقاري.</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.encumbrancesClearedWhenNeeded || false}
                  onChange={() => toggleBoolean('encumbrancesClearedWhenNeeded')}
                />
                <span>حذف التحملات عند الاقتضاء بعد التقييد.</span>
              </label>
              <div className="text-[11px] text-teal-900 mt-1">
                مراجع: المدونة العامة للضرائب – tax.gov.ma / الوكالة الوطنية للمحافظة العقارية – ancfcc.gov.ma
              </div>
            </div>

            {/* I. التنبيهات والتحذيرات العدلية */}
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-300 space-y-2">
              <h3 className="text-md font-bold text-red-900 mb-1">I. التنبيهات والتحذيرات العدلية</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.warnDonorMustBeCapableOwner || false}
                  onChange={() => toggleBoolean('warnDonorMustBeCapableOwner')}
                />
                <span>الهبة تبطل إذا لم يكن الواهب كامل الأهلية ومالِكًا للعقار وقت الهبة (مادة 275).</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.warnGiftVoidIfDonorDiesBeforeAcceptance || false}
                  onChange={() => toggleBoolean('warnGiftVoidIfDonorDiesBeforeAcceptance')}
                />
                <span>الهبة تبطل إذا مات الواهب قبل القبول (مادة 279).</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.warnNoRevocationBetweenSpouses || false}
                  onChange={() => toggleBoolean('warnNoRevocationBetweenSpouses')}
                />
                <span>الهبة بين الأزواج لا يُعتصر فيها (مادة 285/1).</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.warnDeathIllnessSubjectToWillRules || false}
                  onChange={() => toggleBoolean('warnDeathIllnessSubjectToWillRules')}
                />
                <span>الهبة في مرض الموت تخضع في الحدود الزائدة لأحكام الوصية (مادة 280).</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  checked={gift.warnCannotGiftOthersProperty || false}
                  onChange={() => toggleBoolean('warnCannotGiftOthersProperty')}
                />
                <span>ممنوع هبة عقار الغير أو المال المستقبلي (مادة 277).</span>
              </label>
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
  // Step 3: Promise to Sell Details (رسم وعد بالبيع)
  // ============================================================================

export const SadaqaWizard: React.FC<DocumentWizardProps> = ({ state, setState, onNext, onBack }) => {
  return (
    <>
      {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
      {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
      {state.step === 3 && <Step3_GiftDeed_Details state={state} setState={setState} />}
      
      {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
      {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
      {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
    </>
  );
};
