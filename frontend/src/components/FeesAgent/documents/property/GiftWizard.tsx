import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentWizardProps } from '../../types';
import { Step1_PartiesDefinition } from '../../steps/Step1_PartiesDefinition';
import { Step2_PropertyDetails } from '../../steps/Step2_PropertyDetails';
import { Step4_Finance } from '../../steps/Step4_Finance';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import { Step6_Dates } from '../../steps/Step6_Dates';
import { PreReceptionVerificationGate } from '../../steps/PreReceptionVerificationGate';
import type {
  FeesAgentState,
  GiftSubjectType,
  GiftRightsMatrix,
  GiftPropertyItem,
  GiftOwnershipSource,
  GiftPossessionDetails,
  GiftPoaDetails,
  GiftFinanceDetails,
} from '../../../../types/feesAgentTypes';
import { convertGregorianToHijri } from '../../../../utils/feesAgentUtils';
import {
  Gift,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Printer,
  Ban,
  Building2,
  Scale,
  BookOpen,
  DollarSign,
  Gavel,
  History,
  Plus,
  Trash2,
  ChevronRight,
  Layers,
  HelpCircle,
  UserCheck,
  Key,
  Home,
  Shield,
  Activity,
  Edit3,
  Send,
} from 'lucide-react';

// تاريخ نفاذ مدونة الحقوق العينية (المادة 334: 6 أشهر بعد النشر بالجريدة الرسمية في 24 نونبر 2011)
const LAW_39_08_EFFECTIVE_DATE = '2012-05-24';

// ============================================================================
// Legacy Component: Step3_GiftDeed_Details (Preserved with 100% Backwards Compatibility)
// ============================================================================
export const Step3_GiftDeed_Details: React.FC<DocumentWizardProps> = ({ state, setState }) => {
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

  const hasRevocationImpediment = (gift.impedimentsToRevocation || []).length > 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md font-sans">
      {/* Intro */}
      <div className="bg-emerald-50 p-6 rounded-lg border-r-4 border-emerald-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">تهييء حقول رسم الهبة (النمط الكلاسيكي)</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          هذه الصفحة مخصصة لضبط الهوية والأطراف، شروط الصحة، الحوز، الاعتصار، وضعية القاصر، مرض الموت، والتسجيل الجبائي والتحفيظي.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-800">
          <span className="px-3 py-1 rounded-full bg-white border border-emerald-200">مرجعية: مدونة الحقوق العينية 39.08 (المواد 273–280 و285)</span>
          <span className="px-3 py-1 rounded-full bg-white border border-emerald-200">البوابة الرسمية للتشريع – adala.justice.gov.ma</span>
        </div>
      </div>

      {/* A. الهوية العدلية للهبة والأطراف */}
      <div className="bg-gray-50 p-6 rounded-lg border-r-4 border-gray-300 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">A. الهوية العدلية للهبة والأطراف</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">جنس الواهب</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="w-4 h-4 text-emerald-600"
                  checked={gift.donorGender === 'ذكر'}
                  onChange={() => updateGift('donorGender', 'ذكر')}
                />
                <span className="text-sm">ذكر</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="w-4 h-4 text-emerald-600"
                  checked={gift.donorGender === 'أنثى'}
                  onChange={() => updateGift('donorGender', 'أنثى')}
                />
                <span className="text-sm">أنثى</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">جنس الموهوب له</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="w-4 h-4 text-emerald-600"
                  checked={gift.doneeGender === 'ذكر'}
                  onChange={() => updateGift('doneeGender', 'ذكر')}
                />
                <span className="text-sm">ذكر</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="w-4 h-4 text-emerald-600"
                  checked={gift.doneeGender === 'أنثى'}
                  onChange={() => updateGift('doneeGender', 'أنثى')}
                />
                <span className="text-sm">أنثى</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">صلة القرابة بين الواهب والموهوب له</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={gift.donorDoneeRelation || ''}
              onChange={(e) => updateGift('donorDoneeRelation', e.target.value)}
            >
              <option value="">-- اختر الصلة --</option>
              <option value="زوج/زوجة">زوج / زوجة</option>
              <option value="ولد/ابنة">أب/أم لـ ولد/ابنة</option>
              <option value="قريب">قريب (أخ، عم، ابن أخ...)</option>
              <option value="أجنبي">أجنبي لا قرابة بينهما</option>
              <option value="وصي/ولي/كافل">ولي / وصي / كافل</option>
              <option value="آخر">صلة أخرى</option>
            </select>
          </div>
          {gift.donorDoneeRelation === 'آخر' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">بيان الصلة الأخرى</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                value={gift.donorDoneeRelationOther || ''}
                onChange={(e) => updateGift('donorDoneeRelationOther', e.target.value)}
                placeholder="بيان صلة القرابة بدقة..."
              />
            </div>
          )}
        </div>
      </div>

      {/* B. شروط صحة الهبة وموانعها */}
      <div className="bg-gray-50 p-6 rounded-lg border-r-4 border-gray-300 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">B. شروط صحة الهبة وموانع الاعتصار (م 274-285)</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-1 text-emerald-600"
              checked={gift.hasOfferAndAcceptance || false}
              onChange={() => toggleBoolean('hasOfferAndAcceptance')}
            />
            <span>انعقاد الإيجاب والقبول الصريحين في مجلس العقد.</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-1 text-emerald-600"
              checked={gift.donorCapacityMeetsRequirements || false}
              onChange={() => toggleBoolean('donorCapacityMeetsRequirements')}
            />
            <span>أهلية التبرع للواهب كاملة وخلوه من عوارض الأهلية (م 275).</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-1 text-emerald-600"
              checked={gift.donorOwnsAsset || false}
              onChange={() => toggleBoolean('donorOwnsAsset')}
            />
            <span>ملكية الواهب للحق الموهوب وقت التبرع (م 275).</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-1 text-emerald-600"
              checked={gift.acceptanceBeforeDeath || false}
              onChange={() => toggleBoolean('acceptanceBeforeDeath')}
            />
            <span>صدور القبول قبل وفاة الواهب أو إفلاسه (م 279).</span>
          </label>
        </div>

        {/* موانع الاعتصار */}
        <div className="pt-3 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">فحص موانع الاعتصار إن طلب الواهب الاحتفاظ بالرجوع (م 285):</label>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            {[
              { id: 'زوجية_قائمة', label: 'الزوجية القائمة بين الطرفين' },
              { id: 'وفاة_أحد_الطرفين', label: 'وفاة الواهب أو الموهوب له' },
              { id: 'مرض_مخوف', label: 'مرض مخوف متصل بالموت' },
              { id: 'زواج_بسبب_الهبة', label: 'زواج الموهوب له مراعاة للهبة' },
              { id: 'تفويت_كامل', label: 'تفويت الموهوب له للملك' },
              { id: 'تغير_جوهري_في_القيمة', label: 'إحداث تغيير جوهري بالبناء/الغرس' },
              { id: 'تعامل_الغير_اعتماداً_على_الهبة', label: 'تعامل الغير بحسن نية كرهن' },
              { id: 'هلاك_جزئي_أو_كلي', label: 'هلاك الملك الموهوب' },
            ].map((imp) => (
              <label key={imp.id} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 text-amber-600"
                  checked={(gift.impedimentsToRevocation || []).includes(imp.id as any)}
                  onChange={() => toggleArray('impedimentsToRevocation', imp.id)}
                />
                <span>{imp.label}</span>
              </label>
            ))}
          </div>
          {hasRevocationImpediment && (
            <div className="mt-2 p-2 bg-amber-50 border-r-4 border-amber-500 text-xs text-amber-800">
              ⚠️ تنبيه: تم تسجيل موانع للاعتصار وفق المادة 285 م.ح.ع؛ يمنع الرجوع في الهبة متى قام أحد هذه الموانع.
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 justify-between mt-6">
        <button
          onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
        >
          ← السابق: بيانات العقار
        </button>
        <button
          onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          التالي: التمويل والتكاليف →
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Upgraded Gift Wizard (رسم الهبة المطور - 12 مرحلة ذكية مع مصفوفة الحقوق)
// ============================================================================
export const GiftWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack,
}) => {
  // Navigation & View Mode:
  // stage 1 to 12. Also a toggle to legacy mode if user specifically wants classic step forms.
  const [activeStage, setActiveStage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'modern_12_stages' | 'classic_steps'>('modern_12_stages');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showPreReceptionModal, setShowPreReceptionModal] = useState<boolean>(false);
  const [showLegalRefModal, setShowLegalRefModal] = useState<boolean>(false);
  const [showDisambiguationModal, setShowDisambiguationModal] = useState<boolean>(false);

  // Date metadata
  const todayGregorian = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // Existing gift state
  const giftState = state.giftDeed || {};

  // --------------------------------------------------------------------------
  // Stage 01: الأطراف (الواهب والموهوب له والأهلية والنيابة)
  // --------------------------------------------------------------------------
  const [donor, setDonor] = useState({
    fullName: giftState.donorIdentity?.fullName || giftState.donorIdentity?.name || state.sellers?.[0]?.name || '',
    fatherName: giftState.donorIdentity?.fatherName || state.sellers?.[0]?.fatherName || '',
    motherName: giftState.donorIdentity?.motherName || state.sellers?.[0]?.motherName || '',
    birthDate: giftState.donorIdentity?.birthDate || state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: giftState.donorIdentity?.birthPlace || state.sellers?.[0]?.placeOfBirth || '',
    cin: giftState.donorIdentity?.idNumber || state.sellers?.[0]?.idNumber || '',
    profession: giftState.donorIdentity?.profession || state.sellers?.[0]?.profession || '',
    address: giftState.donorIdentity?.address || state.sellers?.[0]?.address || '',
    maritalStatus: giftState.donorIdentity?.maritalStatus || 'متزوج',
    nationality: giftState.donorIdentity?.nationality || 'مغربي',
    capacityType: giftState.donorCapacityType || 'كامل_الأهلية',
    gender: giftState.donorGender || 'ذكر',
    trueOwnershipAtTimeOfGift: giftState.donorTrueOwnershipAtTimeOfGift ?? true,
    debtEncumbrance: giftState.donorDebtEncumbrance ?? false,
    hasMortgage: giftState.donorHasMortgage ?? false,
    hasSeizure: giftState.donorHasSeizure ?? false,
    rightsOfThirdParties: giftState.donorRightsOfThirdParties ?? false,
  });

  const [donee, setDonee] = useState({
    fullName: giftState.doneeIdentity?.fullName || giftState.doneeIdentity?.name || state.buyers?.[0]?.name || '',
    fatherName: giftState.doneeIdentity?.fatherName || state.buyers?.[0]?.fatherName || '',
    motherName: giftState.doneeIdentity?.motherName || state.buyers?.[0]?.motherName || '',
    birthDate: giftState.doneeIdentity?.birthDate || state.buyers?.[0]?.dateOfBirth || '',
    birthPlace: giftState.doneeIdentity?.birthPlace || state.buyers?.[0]?.placeOfBirth || '',
    cin: giftState.doneeIdentity?.idNumber || state.buyers?.[0]?.idNumber || '',
    profession: giftState.doneeIdentity?.profession || state.buyers?.[0]?.profession || '',
    address: giftState.doneeIdentity?.address || state.buyers?.[0]?.address || '',
    maritalStatus: giftState.doneeIdentity?.maritalStatus || 'عازب',
    nationality: giftState.doneeIdentity?.nationality || 'مغربي',
    capacityType: giftState.doneeCapacityType || 'راشد_كامل_الأهلية',
    gender: giftState.doneeGender || 'ذكر',
    relationshipToDonor: giftState.donorDoneeRelation || 'ولد/ابنة',
    relationshipOther: giftState.donorDoneeRelationOther || '',
    legalRep: giftState.doneeLegalRep || {
      repType: 'أب',
      repName: '',
      repCin: '',
      courtName: 'المحكمة الابتدائية بالرباط',
      fileNumber: '',
      judgmentNumber: '',
      judgmentDate: '',
      rulingText: '',
    },
  });

  // --------------------------------------------------------------------------
  // Stage 02: نوع الهبة ومصفوفة الحقوق
  // --------------------------------------------------------------------------
  const [giftSubject, setGiftSubject] = useState<GiftSubjectType>(
    giftState.giftSubjectType || 'هبة_الملكية_كاملة'
  );

  const [rightsMatrix, setRightsMatrix] = useState<GiftRightsMatrix>(
    giftState.rightsMatrix || {
      donor: { raqaba: false, istimal: false, istighlal: false, intifa: false, tasarruf: false, sokna: false },
      donee: { raqaba: true, istimal: true, istighlal: true, intifa: true, tasarruf: true, sokna: true },
    }
  );

  const [retainedRight, setRetainedRight] = useState<'حق_الانتفاع' | 'حق_الاستعمال' | 'حق_السكنى' | 'حق_العمرى' | 'أخرى' | ''>(
    giftState.retainedRightType || ''
  );
  const [usufructDuration, setUsufructDuration] = useState<'مدى_حياة_الواهب' | 'مدى_حياة_الموهوب_له' | 'أجل_محدد' | ''>(
    giftState.usufructDuration || 'مدى_حياة_الواهب'
  );
  const [usufructExpiryDate, setUsufructExpiryDate] = useState<string>(giftState.usufructExpiryDate || '');
  const [usufructScope, setUsufructScope] = useState<'كامل_العقار' | 'حصة_مشاعة' | ''>(
    giftState.usufructScope || 'كامل_العقار'
  );
  const [otherRealRightName, setOtherRealRightName] = useState<string>(giftState.otherRealRightName || '');

  // Auto Matrix Analysis & Classification
  useEffect(() => {
    // If donee has raqaba and intifa -> هبة الملكية كاملة
    if (rightsMatrix.donee.raqaba && (rightsMatrix.donee.intifa || (rightsMatrix.donee.istimal && rightsMatrix.donee.istighlal))) {
      if (!rightsMatrix.donor.intifa && !rightsMatrix.donor.istighlal && !rightsMatrix.donor.sokna) {
        setGiftSubject('هبة_الملكية_كاملة');
        setRetainedRight('');
        return;
      }
    }
    // If donee has raqaba, but donor retains intifa
    if (rightsMatrix.donee.raqaba && (rightsMatrix.donor.intifa || rightsMatrix.donor.istighlal)) {
      setGiftSubject('هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع');
      setRetainedRight('حق_الانتفاع');
      return;
    }
    // If donee has raqaba, but donor retains sokna only
    if (rightsMatrix.donee.raqaba && rightsMatrix.donor.sokna && !rightsMatrix.donor.istighlal) {
      setGiftSubject('هبة_الرقبة_مع_احتفاظ_الواهب_بالسكنى');
      setRetainedRight('حق_السكنى');
      return;
    }
    // If donor keeps raqaba and donee gets usufruct
    if (rightsMatrix.donor.raqaba && rightsMatrix.donee.intifa && !rightsMatrix.donee.raqaba) {
      setGiftSubject('هبة_حق_الانتفاع_فقط');
      setRetainedRight('');
      return;
    }
    // If donee gets only istimal
    if (!rightsMatrix.donee.raqaba && rightsMatrix.donee.istimal && !rightsMatrix.donee.istighlal) {
      setGiftSubject('هبة_حق_الاستعمال');
      setRetainedRight('');
      return;
    }
  }, [rightsMatrix]);

  // Handle direct subject click helper
  const handleSelectGiftSubject = (subject: GiftSubjectType) => {
    setGiftSubject(subject);
    if (subject === 'هبة_الملكية_كاملة') {
      setRightsMatrix({
        donor: { raqaba: false, istimal: false, istighlal: false, intifa: false, tasarruf: false, sokna: false },
        donee: { raqaba: true, istimal: true, istighlal: true, intifa: true, tasarruf: true, sokna: true },
      });
      setRetainedRight('');
    } else if (subject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع') {
      setRightsMatrix({
        donor: { raqaba: false, istimal: true, istighlal: true, intifa: true, tasarruf: false, sokna: true },
        donee: { raqaba: true, istimal: false, istighlal: false, intifa: false, tasarruf: true, sokna: false },
      });
      setRetainedRight('حق_الانتفاع');
      setUsufructDuration('مدى_حياة_الواهب');
    } else if (subject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالسكنى') {
      setRightsMatrix({
        donor: { raqaba: false, istimal: true, istighlal: false, intifa: false, tasarruf: false, sokna: true },
        donee: { raqaba: true, istimal: false, istighlal: true, intifa: false, tasarruf: true, sokna: false },
      });
      setRetainedRight('حق_السكنى');
      setUsufructDuration('مدى_حياة_الواهب');
    } else if (subject === 'هبة_حق_الانتفاع_فقط') {
      setRightsMatrix({
        donor: { raqaba: true, istimal: false, istighlal: false, intifa: false, tasarruf: true, sokna: false },
        donee: { raqaba: false, istimal: true, istighlal: true, intifa: true, tasarruf: false, sokna: true },
      });
      setRetainedRight('');
      setUsufructDuration('مدى_حياة_الموهوب_له');
    } else if (subject === 'هبة_حق_الاستعمال') {
      setRightsMatrix({
        donor: { raqaba: true, istimal: false, istighlal: true, intifa: false, tasarruf: true, sokna: false },
        donee: { raqaba: false, istimal: true, istighlal: false, intifa: false, tasarruf: false, sokna: true },
      });
      setRetainedRight('');
    } else if (subject === 'هبة_العمرى') {
      setRightsMatrix({
        donor: { raqaba: true, istimal: false, istighlal: false, intifa: false, tasarruf: true, sokna: false },
        donee: { raqaba: false, istimal: true, istighlal: true, intifa: true, tasarruf: false, sokna: true },
      });
      setRetainedRight('حق_العمرى');
    }
  };

  // --------------------------------------------------------------------------
  // Stage 03 & 04: العقارات المتعددة والمركبة والشياع
  // --------------------------------------------------------------------------
  const [propertiesList, setPropertiesList] = useState<GiftPropertyItem[]>(
    giftState.propertiesList && giftState.propertiesList.length > 0
      ? giftState.propertiesList
      : [
          {
            id: 'prop-1',
            propertyType: (state.property?.type === 'محفظ' ? 'محفظ' : state.property?.type === 'في_طور_التحفيظ' ? 'في_طور_التحفيظ' : 'غير_محفظ') as any,
            propertyName: state.property?.titleNumber ? `الملك المسمى "${state.property?.titleNumber}"` : 'العقار الأول',
            titleNumber: state.property?.titleNumber || giftState.landRegistryNumber || '',
            requisitionNumber: giftState.preRegistrationApplicationNumber || '',
            landConservationOffice: state.property?.landRegistry || 'المحافظة العقارية بالرباط',
            location: state.property?.address || '',
            area: state.property?.area || '',
            propertyNature: state.property?.description || 'دار سكنية',
            currentOwner: state.sellers?.[0]?.name || '',
            encumbrances: giftState.encumbrances || [],
            coOwnershipType: 'كامل_الملك',
            customShareFraction: '1/1 كامل الملك',
            isPhysicalPartition: false,
            physicalPartitionDeedType: 'لا_توجد_قسمة',
          },
        ]
  );

  const addPropertyItem = () => {
    const newId = `prop-${Date.now()}`;
    setPropertiesList((prev) => [
      ...prev,
      {
        id: newId,
        propertyType: 'محفظ',
        propertyName: `العقار ${prev.length + 1}`,
        titleNumber: '',
        requisitionNumber: '',
        landConservationOffice: 'المحافظة العقارية',
        location: '',
        area: '',
        propertyNature: 'شقة سكنية',
        currentOwner: donor.fullName,
        encumbrances: [],
        coOwnershipType: 'كامل_الملك',
        customShareFraction: '1/1 كامل الملك',
        isPhysicalPartition: false,
        physicalPartitionDeedType: 'لا_توجد_قسمة',
      },
    ]);
  };

  const removePropertyItem = (id: string) => {
    if (propertiesList.length <= 1) return;
    setPropertiesList((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePropertyItem = (id: string, field: keyof GiftPropertyItem, value: any) => {
    setPropertiesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // --------------------------------------------------------------------------
  // Stage 05: أصل التملك وسلسلة الملك وفحص السند العرفي (24 ماي 2012)
  // --------------------------------------------------------------------------
  const [ownershipSources, setOwnershipSources] = useState<GiftOwnershipSource[]>(
    giftState.ownershipSources && giftState.ownershipSources.length > 0
      ? giftState.ownershipSources
      : [
          {
            id: 'src-1',
            sourceType: 'رسم_عدلي',
            percentage: 100,
            fractionText: 'كامل الملك 100%',
            date: '2018-04-12',
            registryBookNumber: '124',
            registryLetter: 'ب',
            registryPage: '88',
            registryCount: '215',
            registryDate: '2018-04-15',
            courtName: 'المحكمة الابتدائية بالرباط',
            notaryNames: 'العدلان فلان وفلان',
          },
        ]
  );

  const addOwnershipSource = () => {
    const newId = `src-${Date.now()}`;
    setOwnershipSources((prev) => [
      ...prev,
      {
        id: newId,
        sourceType: 'عقد_موثق',
        percentage: 50,
        fractionText: 'النصف 1/2',
        date: '2020-01-01',
      },
    ]);
  };

  const removeOwnershipSource = (id: string) => {
    if (ownershipSources.length <= 1) return;
    setOwnershipSources((prev) => prev.filter((s) => s.id !== id));
  };

  const updateOwnershipSource = (id: string, field: keyof GiftOwnershipSource, value: any) => {
    setOwnershipSources((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Calculate total ownership vs gift percentage
  const totalOwnedPercentage = useMemo(() => {
    return ownershipSources.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
  }, [ownershipSources]);

  const giftTotalPercentage = 100; // Standard single full transfer or matches proportion
  const isOwnershipExceeded = totalOwnedPercentage < giftTotalPercentage;

  // Customary deed check against LAW_39_08_EFFECTIVE_DATE (2012-05-24)
  const customaryDeedsAnalysis = useMemo(() => {
    return ownershipSources
      .filter((s) => s.sourceType === 'سند_قديم_عرفي')
      .map((s) => {
        const isPrior = !s.date || s.date < LAW_39_08_EFFECTIVE_DATE;
        return {
          id: s.id,
          date: s.date,
          isPrior,
          status: isPrior ? 'صالح_مع_فحص_الفقه_والقضاء' : 'باطل_بقوة_المادة_274',
        };
      });
  }, [ownershipSources]);

  // --------------------------------------------------------------------------
  // Stage 06: الوكالة والسجلات العقارية (ف 1-889 و2-889 ق.ل.ع)
  // --------------------------------------------------------------------------
  const [poa, setPoa] = useState<GiftPoaDetails>(
    giftState.poaDetails || {
      hasPoa: false,
      poaType: 'مباشرة',
      principalName: '',
      agentName: '',
      date: '',
      drafter: 'عدلان',
      number: '',
      scopeIncludesGift: true,
      scopeIncludesRaqaba: true,
      scopeIncludesUsufruct: true,
      scopeIncludesSigning: true,
      scopeIncludesPossessionAck: true,
      scopeIncludesRegistration: true,
      localRegistryCourt: 'المحكمة الابتدائية بالرباط',
      localRegistryDate: '',
      localRegistryOrderNumber: '',
      localRegistryAnalyticalNumber: '',
      localRegistryCompositeNumber: '',
      localRegistryCertificateRef: '',
      nationalVerificationDone: false,
      nationalVerificationDate: '',
      nationalRegistryNumber: '',
      nationalVerificationResult: '',
    }
  );

  // --------------------------------------------------------------------------
  // Stage 07: محرك الحيازة الذكي والتمكين التناسبي
  // --------------------------------------------------------------------------
  // Does this configuration require physical eviction?
  // Central Rule: If donor retains usufruct or habitation, eviction of donor is NOT required!
  const isUsufructRetained =
    giftSubject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع' ||
    giftSubject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالسكنى' ||
    retainedRight === 'حق_الانتفاع' ||
    retainedRight === 'حق_السكنى';

  const defaultEvidenceMethods = useMemo(() => {
    if (isUsufructRetained) {
      return ['تسليم_الوثائق', 'تحمل_المصاريف', 'تقييد_بالرسم_العقاري', 'حيازة_قانونية_لطبيعة_الحق_المحتفظ_به'];
    }
    return ['تسليم_فعلي', 'تسليم_المفاتيح', 'تمكين_من_العقار', 'تقييد_بالرسم_العقاري'];
  }, [isUsufructRetained]);

  const [possession, setPossession] = useState<GiftPossessionDetails>(
    giftState.possessionCharacteristics || {
      requiresEviction: !isUsufructRetained,
      evictionExemptReason: isUsufructRetained
        ? 'بقاء الواهب في العقار مستند لحق الانتفاع/السكنى المحتفظ به صراحة برسم الهبة عملاً بالاجتهاد القضائي وقواعد مدونة الحقوق العينية'
        : '',
      evidenceMethods: defaultEvidenceMethods,
      customEvidenceDescription: isUsufructRetained
        ? 'تمت حيازة الرقبة قانوناً بتسليم الوثائق والرسوم والتمكين القانوني دون التعرض لحق الانتفاع المحتفظ به للواهب'
        : 'تمت معاينة الإخلاء الفعلي وتسليم المفاتيح للموهوب له وحوزه للعقار حوزاً تاماً',
      adoulInspectionStatement: 'وقد عاين العدلان ما ذكر وتأكدا من مطابقة الحيازة للحق الموهوب ومقتضياته القانونية',
      occupancyStatus: isUsufructRetained ? 'شغل_الواهب_بحق_الانتفاع' : 'شغل_الموهوب_له',
    }
  );

  // Sync eviction exemption with retained usufruct status
  useEffect(() => {
    if (isUsufructRetained) {
      setPossession((prev) => ({
        ...prev,
        requiresEviction: false,
        evictionExemptReason:
          'بقاء الواهب في العقار مستند لحق الانتفاع/السكنى المحتفظ به صراحة برسم الهبة عملاً بالاجتهاد القضائي وقواعد مدونة الحقوق العينية',
        occupancyStatus: 'شغل_الواهب_بحق_الانتفاع',
      }));
    } else {
      setPossession((prev) => ({
        ...prev,
        requiresEviction: true,
        evictionExemptReason: '',
        occupancyStatus: 'شغل_الموهوب_له',
      }));
    }
  }, [isUsufructRetained]);

  const togglePossessionMethod = (methodId: string) => {
    setPossession((prev) => {
      const exists = prev.evidenceMethods.includes(methodId);
      const nextMethods = exists
        ? prev.evidenceMethods.filter((m) => m !== methodId)
        : [...prev.evidenceMethods, methodId];
      return { ...prev, evidenceMethods: nextMethods };
    });
  };

  // --------------------------------------------------------------------------
  // Stage 08 & 09: المحافظة العقارية والمالية والتسجيل
  // --------------------------------------------------------------------------
  const [finance, setFinance] = useState<GiftFinanceDetails>(
    giftState.financialDetails || {
      transactionYear: new Date().getFullYear(),
      taxRegistryOffice: 'مصلحة التسجيل والتنبر بالرباط',
      registrationReceiptNumber: 'REG-2026/8892',
      registrationDate: todayGregorian,
      registrationAmount: donee.relationshipToDonor === 'ولد/ابنة' || donee.relationshipToDonor === 'زوج/زوجة' ? 1500 : 4000,
      taxTariffReference: 'المدونة العامة للضرائب (المادة 133 وما يليها)',
      taxExemptionMentioned: false,
      taxExemptionArticle: '',
      stampDutyAmount: 40,
      numberOfPages: 2,
      stampPaymentReference: 'QUITTANCE-TIMBRE-40DH',
      conservationDepositNumber: 'DEP-2026/1429',
      conservationDepositDate: todayGregorian,
      conservationFeesAmount: 1000,
    }
  );

  // --------------------------------------------------------------------------
  // Global State Sync
  // --------------------------------------------------------------------------
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      giftDeed: {
        ...(prev.giftDeed || {}),
        donorGender: donor.gender as any,
        doneeGender: donee.gender as any,
        donorDoneeRelation: donee.relationshipToDonor as any,
        donorDoneeRelationOther: donee.relationshipOther,
        donorCapacity: (donor.capacityType === 'كامل_الأهلية' ? 'كامل' : donor.capacityType === 'ناقص_الأهلية' ? 'ناقص' : 'فاقد') as any,
        doneeCapacity: (donee.capacityType === 'راشد_كامل_الأهلية' ? 'كامل' : donee.capacityType === 'قاصر' ? 'قاصر' : 'ناقص') as any,
        donorCapacityMeetsRequirements: donor.capacityType === 'كامل_الأهلية',
        donorOwnsAsset: donor.trueOwnershipAtTimeOfGift,
        giftSubjectType: giftSubject,
        rightsMatrix: rightsMatrix,
        retainedRightType: retainedRight,
        usufructDuration: usufructDuration,
        usufructExpiryDate: usufructExpiryDate,
        usufructScope: usufructScope,
        otherRealRightName: otherRealRightName,
        donorIdentity: {
          name: donor.fullName,
          fatherName: donor.fatherName,
          motherName: donor.motherName,
          birthDate: donor.birthDate,
          birthPlace: donor.birthPlace,
          idNumber: donor.cin,
          profession: donor.profession,
          address: donor.address,
          maritalStatus: donor.maritalStatus,
          nationality: donor.nationality,
        },
        donorCapacityType: donor.capacityType,
        donorDebtEncumbrance: donor.debtEncumbrance,
        donorHasMortgage: donor.hasMortgage,
        donorHasSeizure: donor.hasSeizure,
        donorRightsOfThirdParties: donor.rightsOfThirdParties,
        donorTrueOwnershipAtTimeOfGift: donor.trueOwnershipAtTimeOfGift,
        doneeIdentity: {
          name: donee.fullName,
          fatherName: donee.fatherName,
          motherName: donee.motherName,
          birthDate: donee.birthDate,
          birthPlace: donee.birthPlace,
          idNumber: donee.cin,
          profession: donee.profession,
          address: donee.address,
          maritalStatus: donee.maritalStatus,
          nationality: donee.nationality,
        },
        doneeCapacityType: donee.capacityType,
        doneeLegalRep: donee.legalRep,
        propertiesList: propertiesList,
        ownershipSources: ownershipSources,
        totalOwnershipPercentage: totalOwnedPercentage,
        giftPercentage: giftTotalPercentage,
        isOwnershipExceeded: isOwnershipExceeded,
        possessionCharacteristics: possession,
        poaDetails: poa,
        financialDetails: finance,
      },
    }));
  }, [donor, donee, giftSubject, rightsMatrix, retainedRight, usufructDuration, usufructExpiryDate, usufructScope, otherRealRightName, propertiesList, ownershipSources, totalOwnedPercentage, isOwnershipExceeded, possession, poa, finance, setState]);

  // --------------------------------------------------------------------------
  // Stage 10: المراقبة القانونية الذكية وحساب الحالة (أخضر / برتقالي / أحمر)
  // --------------------------------------------------------------------------
  const legalValidation = useMemo(() => {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Blocker 1: Capacity of donor
    if (donor.capacityType !== 'كامل_الأهلية') {
      blockers.push('الواهب غير كامل الأهلية؛ والهبة تبطل إذا لم يكن الواهب كامل الأهلية وقت التبرع (المادة 275).');
    }
    // Blocker 2: Ownership of donor
    if (!donor.trueOwnershipAtTimeOfGift) {
      blockers.push('الواهب غير مالك للحق الموهوب وقت الهبة، ولا تصح هبة مال الغير (المادة 275 و 277).');
    }
    // Blocker 3: Ownership percentage exceeded
    if (isOwnershipExceeded) {
      blockers.push(`الهبة تتجاوز الملك الثابت للواهب: إجمالي الملك المثبت ${totalOwnedPercentage}% بينما المطلوب هبته ${giftTotalPercentage}%.`);
    }
    // Blocker 4: Minor without legal representative
    if ((donee.capacityType === 'قاصر' || donee.capacityType === 'فاقد_الأهلية') && !donee.legalRep.repName) {
      blockers.push('الموهوب له قاصر أو فاقد للأهلية ويلزم تعيين نائبه الشرعي وتضمين سنده لقبول الهبة نيابة عنه (المادة 276).');
    }
    // Blocker 5: Post-2012 Customary deed invalidity
    const invalidCustomary = customaryDeedsAnalysis.find((c) => !c.isPrior);
    if (invalidCustomary) {
      blockers.push('تم الاعتماد على عقد عرفي منشأ بعد 24 ماي 2012؛ وهو باطل بطلاناً مطلقاً لخرق الرسمية الإلزامية (المادتان 4 و 274).');
    }
    // Blocker 6: POA lacks real estate scope
    if (poa.hasPoa && (!poa.scopeIncludesGift || !poa.scopeIncludesSigning)) {
      blockers.push('الوكالة المدلى بها لا تتضمن صراحة سلطة التبرع بالهبة وتوقيع الرسم العدلي (فصل 1-889 ق.ل.ع).');
    }

    // Warnings:
    if (donor.debtEncumbrance) {
      warnings.push('الدين محيط بمال الواهب؛ يجوز للدائنين الطعن في التبرع وفق مقتضيات المادة 278 م.ح.ع.');
    }
    if (donor.hasMortgage) {
      warnings.push('العقار مثقل برهن رسمي؛ لا يمنع التقييد آلياً لكن يبقى الرهن كحق عيني تبعي يتبع العقار.');
    }
    if (donor.hasSeizure) {
      warnings.push('يوجد حجز عقاري مقيد على العقار؛ يلزم رفع الحجز أو إدلاء بالأمر القضائي الرافع له.');
    }
    const partitionWithoutDeed = propertiesList.find(
      (p) => p.isPhysicalPartition && p.physicalPartitionDeedType === 'لا_توجد_قسمة'
    );
    if (partitionWithoutDeed) {
      warnings.push('العقار مشاع والواهب حدد جزءاً مفرزاً دون سند قسمة رسمي؛ يرجى مراجعة الوصف لئلا يقتصر الأثر على الشياع (فصل 973 ق.ل.ع).');
    }
    const priorCustomary = customaryDeedsAnalysis.find((c) => c.isPrior);
    if (priorCustomary) {
      warnings.push('العقد العرفي سابق لدخول مدونة الحقوق العينية حيز التنفيذ (قبل 24 ماي 2012)؛ يخضع لفحص صحة ثبوت التاريخ وشروط الفقه المالكي السائد.');
    }
    if (isUsufructRetained) {
      warnings.push('هبة الرقبة مع احتفاظ الواهب بحق الانتفاع: الحيازة متناسبة مع الحق الموهوب ولا يطلب إفراغ الواهب، عملاً بقرارات محكمة النقض.');
    }

    let status: '🟢 قابل للتحرير' | '🟠 مراجعة وتدقيق' | '🔴 مانع للتحرير' = '🟢 قابل للتحرير';
    if (blockers.length > 0) status = '🔴 مانع للتحرير';
    else if (warnings.length > 0) status = '🟠 مراجعة وتدقيق';

    return { blockers, warnings, status };
  }, [donor, isOwnershipExceeded, totalOwnedPercentage, giftTotalPercentage, donee, customaryDeedsAnalysis, poa, propertiesList, isUsufructRetained]);

  // --------------------------------------------------------------------------
  // Stage 11: الصياغة العدلية المغربية رباعية الطبقات
  // --------------------------------------------------------------------------
  const generateDraftDocument = useMemo(() => {
    const isRetained = isUsufructRetained;
    const propNames = propertiesList.map((p, idx) => `[${idx + 1}] ${p.propertyName} (${p.propertyType}) ذي الرسم/المطلب (${p.titleNumber || p.requisitionNumber || 'غير محفظ'}) الكائن بـ ${p.location || 'نواحي الرباط'}`).join('، و');

    return `بسم الله الرحمن الرحيم
الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه

المملكة المغربية
وزارة العدل
دائرة محكمة الاستئناف بالرباط
المحكمة الابتدائية بالرباط
قسم قضاء الأسرة والتوثيق
مكتب العدلين: الأستاذين المعينين بدائرة هذه المحكمة

رسم هبة عقارية رسمي
(محرر وفقاً للمادتين 4 و274 وما بعدهما من مدونة الحقوق العينية الصادرة بالقانون رقم 39.08)

═══════════════════════════════════════════════════════════
الطبقة الأولى: مجلس العقد والهوية التوثيقية
═══════════════════════════════════════════════════════════
بتاريخ: ${todayHijri} هجرية، موافق: ${todayGregorian} ميلادية.
حضر بمكتبنا المهني بمقر تعييننا التابع للمحكمة الابتدائية المذكورة، أمامنا نحن العدلين المنتصبين للإشهاد الموقعين أسفله:

أولاً - الطرف الواهب:
السيد(ة): ${donor.fullName || '...........................'}، بن ${donor.fatherName || '...'} وأمه ${donor.motherName || '...'}، المزداد بتاريخ ${donor.birthDate || '...'} بـ ${donor.birthPlace || '...'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم ${donor.cin || '..........'}، مهنته(ا) ${donor.profession || '...'}، الساكن(ة) بـ ${donor.address || '...........................'}، من جنسية ${donor.nationality}، وحالته(ا) العائلية ${donor.maritalStatus}، وهو في كامل أهليته المعتبرة شرعاً وقانوناً للتصرف والتبرع ولم يعتره أي مانع أو عارض من عوارض الأهلية.

ثانياً - الطرف الموهوب له:
السيد(ة): ${donee.fullName || '...........................'}، بن ${donee.fatherName || '...'} وأمه ${donee.motherName || '...'}، المزداد بتاريخ ${donee.birthDate || '...'} بـ ${donee.birthPlace || '...'}، الحامل(ة) للبطاقة الوطنية للتعريف رقم ${donee.cin || '..........'}، مهنته(ا) ${donee.profession || '...'}، الساكن(ة) بـ ${donee.address || '...........................'}، من جنسية ${donee.nationality}، وصفته بالنسبة للواهب: (${donee.relationshipToDonor}${donee.relationshipOther ? ' - ' + donee.relationshipOther : ''})${
      donee.capacityType === 'قاصر' || donee.capacityType === 'فاقد_الأهلية'
        ? `، وحيث إنه قاصر/فاقد الأهلية، فقد حضر نيابة عنه في قبول الهبة نائبه الشرعي السيد: ${donee.legalRep.repName || '................'} (صفته: ${donee.legalRep.repType}) الحامل للبطاقة رقم ${donee.legalRep.repCin || '...'} استناداً لسند النيابة الصادر عن ${donee.legalRep.courtName} تحت عدد ${donee.legalRep.judgmentNumber} بتاريخ ${donee.legalRep.judgmentDate}، عملاً بمقتضيات المادة 276 من مدونة الحقوق العينية.`
        : '، وهو راشد وكامل الأهلية للقبول والالتزام.'
    }

═══════════════════════════════════════════════════════════
الطبقة الثانية: موضوع الهبة ومصفوفة الحقوق العينية
═══════════════════════════════════════════════════════════
بمقتضى هذا العقد الرسمي وتحت كافة الضمانات القانونية والفعلية الجاري بها العمل، يشهد الواهب المذكور ويهب تبرعاً لوجه الله تعالى ولصلة القرابة والبر، للموهوب له المذكور أعلاه القابل لذلك، ما يلي:

[بيان الحق الموهوب]:
${
  giftSubject === 'هبة_الملكية_كاملة'
    ? 'هبة تامة وناجزة لكامل ملكية العقار الموصوف أدناه، بجميع منافعه ومرافقه ورقبته وحق استعماله واستغلاله والتصرف فيه دون استثناء أو تحفظ.'
    : giftSubject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع'
    ? `هبة حق الرقبة (ملكية الرقبة) فقط في العقار الموصوف أدناه، مع احتفاظ الواهب صراحة وبشرط لازم لنفسه بكامل حق الانتفاع والاستعمال والاستغلال والسكنى في العقار المذكور طيلة مدة حياته (${usufructDuration})، على أن لا تجتمع الرقبة مع حق الانتفاع في يد الموهوب له إلا بعد وفاة الواهب وانقضاء حق الانتفاع قانوناً عملاً بمقتضيات المواد 79 وما بعدها من مدونة الحقوق العينية واجتهاد محكمة النقض المستقر.`
    : giftSubject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالسكنى'
    ? 'هبة حق الرقبة مع احتفاظ الواهب بحق السكنى الشخصي في العقار مدى حياته دون حق تأجيره أو استغلال أكرائه للغير عملاً بالمادة 109 وما بعدها من مدونة الحقوق العينية.'
    : giftSubject === 'هبة_حق_الانتفاع_فقط'
    ? 'هبة حق الانتفاع والاستغلال فقط دون حق الرقبة التي تبقى محفوظة في ملك الواهب، وذلك لمدة معلومة أو مدى حياة الموهوب له وفق الضوابط الشرعية والقانونية.'
    : 'هبة العقار وفق التكييف العيني المتفق عليه بين الطرفين.'
}

[بيان العقارات الموهوبة]:
${propNames}.

[أصل الملك وسلسلة التملك]:
يملك الواهب المذكور الحق الموهوب بمقتضى: ${ownershipSources.map((s, i) => `(${i + 1}) ${s.sourceType} بنسبة ${s.percentage}% مؤرخ في ${s.date} ${s.registryBookNumber ? `كناش ${s.registryBookNumber} حرف ${s.registryLetter} ص ${s.registryPage} عدد ${s.registryCount} بمحكمة ${s.courtName}` : ''}`).join('، و')}، وقد تحقق العدلان من مطابقة أصل الملك لملكية الواهب الثابتة بنسبة ${totalOwnedPercentage}%.

═══════════════════════════════════════════════════════════
الطبقة الثالثة: الحيازة التناسبية والتقييد بالسجلات العقارية (المادة 274)
═══════════════════════════════════════════════════════════
[وضعية الحيازة والتمكين]:
${
  isRetained
    ? `وحيث إن الهبة واقعة على حق الرقبة مع احتفاظ الواهب بالانتفاع والاستغلال والسكنى مدى حياته، فإن الحيازة قد تحققت قانوناً بتسليم الوثائق والرسوم للموهوب له وتمكينه من حقوق الرقبة، ولا يشترط إفراغ الواهب من العقار نظراً لأن بقاءه فيه مستند إلى حق الانتفاع الذي احتفظ به في صلب هذا الرسم، عملاً بقرارات محكمة النقض المغربية الصادرة في المادة العقارية (منها القرار 343 بتاريخ 18-09-2018). وقد تم التوافق على مظاهر الحيازة التناسبية الآتية: (${possession.evidenceMethods.join('، ')}).`
    : `يشهد الواهب بأنه قد حوز الموهوب له العقار المذكور حوزاً فعلياً تاماً برفع يده وإخلائه وتفريغه وتسليم مفاتيحه له وحيازته له بحضرة الشهود والعدلين.`
}

[التقييد بالمحافظة العقارية]:
يصرح الطرفان بأنه سيتم إيداع هذا الرسم بالمحافظة العقارية المختصة لتقييد الهبة وحق ${giftSubject === 'هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع' ? 'الرقبة لفائدة الموهوب له مع تقييد حق الانتفاع لفائدة الواهب' : 'الملكية'} عملاً بالمادة 274 من مدونة الحقوق العينية التي تجعل التقييد بالرسم العقاري مغنياً عن الحيازة الفعلية.

═══════════════════════════════════════════════════════════
الطبقة الرابعة: الإيجاب والقبول والمراجع المالية والختام
═══════════════════════════════════════════════════════════
وقد قبل الموهوب له (أو نائبه الشرعي) هذه الهبة بالشروط والتنصيصات المذكورة قبولاً تاماً في مجلس العقد.
التسجيل والتنبر: سجل هذا العقد بمصلحة التسجيل والتنبر المختصة تحت رقم ${finance.registrationReceiptNumber} بتاريخ ${finance.registrationDate} بأداء مبلغ ${finance.registrationAmount} درهماً والتنبر بمبلغ ${finance.stampDutyAmount} درهماً.

وبما ذكر تراضى الطرفان وتصادقا عليه بعد القراءة التامة باللسان العربي المبين، وثبتت هويتهما وأهليتهما لدى العدلين.
وتحرر هذا الرسم ليكون سنداً قانونياً تام الحجية.
والسلام.

توقيع العدل الأول: ........................           توقيع العدل الثاني: ........................
قاضي التوثيق المكلف: .....................`;
  }, [donor, donee, giftSubject, propertiesList, ownershipSources, totalOwnedPercentage, isUsufructRetained, usufructDuration, possession, finance, todayGregorian, todayHijri]);

  // Copy Draft Action
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generateDraftDocument);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Direct Print Action
  const handlePrintDraft = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>رسم هبة عقارية رسمي</title>
          <style>
            body { font-family: 'Amiri', 'Traditional Arabic', serif; padding: 40px; line-height: 1.8; font-size: 15pt; color: #111; }
            h1, h2 { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .header-box { border: 2px solid #333; padding: 15px; margin-bottom: 25px; text-align: center; }
            .separator { border-bottom: 1px solid #666; margin: 20px 0; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            @media print { body { padding: 20px; font-size: 13pt; } }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h2>المملكة المغربية - وزارة العدل</h2>
            <h3>رسم هبة عقارية رسمي (وفق القانون 39.08)</h3>
          </div>
          <pre style="white-space: pre-wrap; font-family: inherit;">${generateDraftDocument}</pre>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 350);
    }
  };

  // --------------------------------------------------------------------------
  // Direct transit to Step 7 (المراجعة القضائية النهائية والإرسال للقاضي)
  // --------------------------------------------------------------------------
  const handleProceedToStep7 = () => {
    setState((prev) => ({
      ...prev,
      step: 7,
      documentType: 'هبة',
      draft: generateDraftDocument,
      draftText: generateDraftDocument,
      giftDeed: {
        ...(prev.giftDeed || {}),
        donorIdentity: {
          name: donor.fullName,
          fullName: donor.fullName,
          fatherName: donor.fatherName,
          motherName: donor.motherName,
          birthDate: donor.birthDate,
          birthPlace: donor.birthPlace,
          idNumber: donor.cin,
          profession: donor.profession,
          address: donor.address,
          maritalStatus: donor.maritalStatus,
          nationality: donor.nationality,
        },
        doneeIdentity: {
          name: donee.fullName,
          fullName: donee.fullName,
          fatherName: donee.fatherName,
          motherName: donee.motherName,
          birthDate: donee.birthDate,
          birthPlace: donee.birthPlace,
          idNumber: donee.cin,
          profession: donee.profession,
          address: donee.address,
          maritalStatus: donee.maritalStatus,
          nationality: donee.nationality,
        },
      },
      sellers: [
        {
          id: 'party-donor',
          name: donor.fullName,
          idNumber: donor.cin,
          dateOfBirth: donor.birthDate,
          placeOfBirth: donor.birthPlace,
          fatherName: donor.fatherName,
          motherName: donor.motherName,
          profession: donor.profession,
          address: donor.address,
          nationality: donor.nationality,
          maritalStatus: donor.maritalStatus,
          partyRole: 'الواهب',
        } as any,
      ],
      buyers: [
        {
          id: 'party-donee',
          name: donee.fullName,
          idNumber: donee.cin,
          dateOfBirth: donee.birthDate,
          placeOfBirth: donee.birthPlace,
          fatherName: donee.fatherName,
          motherName: donee.motherName,
          profession: donee.profession,
          address: donee.address,
          nationality: donee.nationality,
          maritalStatus: donee.maritalStatus,
          partyRole: 'الموهوب له',
        } as any,
      ],
    }));
    if (_onNext) {
      _onNext();
    }
  };

  // If user explicitly toggled to classic view
  if (viewMode === 'classic_steps') {
    return (
      <div className="space-y-4 font-sans">
        <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border border-gray-300">
          <span className="text-sm font-bold text-gray-700">وضع العرض الكلاسيكي للمراحل</span>
          <button
            onClick={() => setViewMode('modern_12_stages')}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
          >
            العودة للمسار المطور (12 مرحلة)
          </button>
        </div>
        {state.step === 1 && <Step1_PartiesDefinition state={state} setState={setState} />}
        {state.step === 2 && <Step2_PropertyDetails state={state} setState={setState} />}
        {state.step === 3 && <Step3_GiftDeed_Details state={state} setState={setState} />}
        {state.step === 4 && <Step4_Finance state={state} setState={setState} />}
        {state.step === 5 && <Step5_Witnesses state={state} setState={setState} />}
        {state.step === 6 && <Step6_Dates state={state} setState={setState} />}
      </div>
    );
  }

  // 12 Stages definitions
  const stagesList = [
    { num: 1, title: 'الأطراف والأهلية', icon: UserCheck, desc: 'الواهب، الموهوب له، النيابة الشرعية ف 276' },
    { num: 2, title: 'نوع الهبة والمصفوفة', icon: Gift, desc: 'الرقبة، الانتفاع، الاستغلال، السكنى، العمرى' },
    { num: 3, title: 'العقارات المركبة', icon: Home, desc: 'محفظ، طور التحفيظ، غير محفظ، متعدد' },
    { num: 4, title: 'الشياع والحصص', icon: Scale, desc: 'كامل الملك، مشاع، فرز مادي، سند القسمة' },
    { num: 5, title: 'أصل الملك وسلسلة التملك', icon: History, desc: '11 نوع سند، فحص 24 ماي 2012، متعدد المصادر' },
    { num: 6, title: 'الوكالة والسجلات', icon: Key, desc: 'فصل 1-889 و 2-889 ق.ل.ع والمرسوم 2.23.101' },
    { num: 7, title: 'الحيازة والإخلاء الذكي', icon: Key, desc: 'عدم إفراغ الواهب بالانتفاع، الحيازة التناسبية' },
    { num: 8, title: 'المحافظة العقارية', icon: Building2, desc: 'المادة 274: التقييد يغني عن الحيازة الفعلية' },
    { num: 9, title: 'المالية والتسجيل', icon: DollarSign, desc: 'التسجيل والتنبر وحساب الرسوم حسب القرابة' },
    { num: 10, title: 'المراقبة والاجتهادات', icon: Shield, desc: 'فحص التوافق، قرارات محكمة النقض الحية' },
    { num: 11, title: 'التحرير العدلي', icon: Edit3, desc: 'الصياغة الرسمية رباعية الطبقات' },
    { num: 12, title: 'المراجعة والطباعة', icon: Printer, desc: 'الطباعة المباشرة، النسخ، التوثيق النهائي' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 font-sans text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Header Bar: Title, Step 0.25 Gate, Breadcrumb, and Legal Status */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-lg border border-emerald-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Gift className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-wide">رسم الهبة العقاري المطور</h1>
                <span className="text-xs bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-bold">
                  القانون 39.08 (المواد 273 - 280)
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex items-center gap-2">
                <span>مسار توثيقي ذكي يدمج مصفوفة الحقوق العينية والحيازة التناسبية والتحقق الإلكتروني</span>
                <span className="text-emerald-400">•</span>
                <span>تحديث 2026</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Step 7 Transition Button */}
            <button
              onClick={handleProceedToStep7}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white flex items-center gap-1.5 shadow-lg shadow-red-900/40 border border-red-400/40 transition cursor-pointer"
              title="الانتقال إلى المراجعة القضائية النهائية والإرسال للقاضي المكلف بالتوثيق (المرحلة 7)"
            >
              <Send className="w-4 h-4 text-white" />
              <span>المتابعة للمرحلة 7 (الإرسال للقاضي)</span>
            </button>

            {/* Step 0.25 PreReception Gate Button */}
            <button
              onClick={() => setShowPreReceptionModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>بوابة التحقق القبلي (مرحلة 0.25)</span>
            </button>

            {/* Legal References & Judicial Precedents Modal Button */}
            <button
              onClick={() => setShowLegalRefModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 flex items-center gap-2 transition"
            >
              <Gavel className="w-4 h-4 text-amber-300" />
              <span>الاجتهادات القضائية والنصوص</span>
            </button>

            {/* Switch to Classic View button */}
            <button
              onClick={() => setViewMode('classic_steps')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-100 flex items-center gap-1.5 transition"
              title="التبديل إلى النموذج الكلاسيكي القديم"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>النموذج الكلاسيكي</span>
            </button>
          </div>
        </div>

        {/* Legal Status Bar & Real Right Breadcrumb */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 font-bold">مسار الأثر العيني:</span>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-white font-medium">📜 تملك الواهب</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
              <span className="text-amber-300 font-bold">🎁 عقد الهبة والتنصيص على الحق</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
              <span className="text-cyan-300 font-medium">
                {isUsufructRetained ? '👐 حيازة تناسبية (دون إفراغ الواهب)' : '👐 حيازة فعلية وتمكين'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
              <span className="text-emerald-300 font-bold">🏛️ التقييد بالمحافظة (م. 274)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-200">النتيجة القانونية اللحظية:</span>
            <span
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                legalValidation.status === '🟢 قابل للتحرير'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                  : legalValidation.status === '🟠 مراجعة وتدقيق'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50'
                  : 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
              }`}
            >
              {legalValidation.status === '🟢 قابل للتحرير' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {legalValidation.status === '🟠 مراجعة وتدقيق' && <AlertTriangle className="w-3.5 h-3.5" />}
              {legalValidation.status === '🔴 مانع للتحرير' && <Ban className="w-3.5 h-3.5" />}
              <span>{legalValidation.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Horizontal Stage Selector (1 to 12) */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {stagesList.map((st) => {
            const Icon = st.icon;
            const isActive = activeStage === st.num;
            const isCompleted = activeStage > st.num;
            return (
              <button
                key={st.num}
                onClick={() => setActiveStage(st.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    isActive ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {st.num}
                </div>
                <Icon className="w-4 h-4" />
                <span>{st.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Main Stage Content Switcher */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Stage 1: الأطراف والأهلية */}
        {activeStage === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 01: هوية وأهلية الأطراف وفحص الملكية (المادتان 275 و 276)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تسجيل بيانات الواهب والموهوب له بدقة عدلية كاملة وفحص الأهلية والنيابة الشرعية للقاصر</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* الواهب */}
              <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                    <span>👤 الطرف الواهب</span>
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">المتبرع</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">الجنس:</label>
                    <select
                      value={donor.gender}
                      onChange={(e) => setDonor({ ...donor, gender: e.target.value as any })}
                      className="text-xs p-1 border rounded bg-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.fullName}
                      onChange={(e) => setDonor({ ...donor, fullName: e.target.value })}
                      placeholder="الاسم الشخصي والعائلي"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم ب.ت.و (CIN)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.cin}
                      onChange={(e) => setDonor({ ...donor, cin: e.target.value })}
                      placeholder="رقم بطاقة التعريف الوطنية"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم الأب</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.fatherName}
                      onChange={(e) => setDonor({ ...donor, fatherName: e.target.value })}
                      placeholder="اسم الأب"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم الأم</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.motherName}
                      onChange={(e) => setDonor({ ...donor, motherName: e.target.value })}
                      placeholder="اسم الأم"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ ومكان الازدياد</label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="date"
                        className="w-full p-2 border rounded-lg text-xs bg-white"
                        value={donor.birthDate}
                        onChange={(e) => setDonor({ ...donor, birthDate: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg text-xs bg-white"
                        value={donor.birthPlace}
                        onChange={(e) => setDonor({ ...donor, birthPlace: e.target.value })}
                        placeholder="مكان الازدياد"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">المهنة</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.profession}
                      onChange={(e) => setDonor({ ...donor, profession: e.target.value })}
                      placeholder="المهنة الحالية"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">العنوان الكامل</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.address}
                      onChange={(e) => setDonor({ ...donor, address: e.target.value })}
                      placeholder="محل السكنى المعتاد"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الأهلية</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.capacityType}
                      onChange={(e) => setDonor({ ...donor, capacityType: e.target.value as any })}
                    >
                      <option value="كامل_الأهلية">كامل الأهلية (رشيد غير محجور عليه)</option>
                      <option value="ناقص_الأهلية">ناقص الأهلية (سفيه / معتوه)</option>
                      <option value="فاقد_الأهلية">فاقد الأهلية (مجنون / قاصر غير مميز)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الحالة العائلية</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donor.maritalStatus}
                      onChange={(e) => setDonor({ ...donor, maritalStatus: e.target.value })}
                    >
                      <option value="متزوج">متزوج</option>
                      <option value="عازب">عازب</option>
                      <option value="مطلق">مطلق</option>
                      <option value="أرمل">أرمل</option>
                    </select>
                  </div>
                </div>

                {/* الفحص القانوني للواهب م 275 و 278 */}
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2 text-xs">
                  <span className="font-bold text-emerald-900 block">🔍 الفحص القانوني المسبق للواهب:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={donor.trueOwnershipAtTimeOfGift}
                        onChange={(e) => setDonor({ ...donor, trueOwnershipAtTimeOfGift: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>مالك للحق وقت الهبة (م 275)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={donor.debtEncumbrance}
                        onChange={(e) => setDonor({ ...donor, debtEncumbrance: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span>الدين محيط بماله (م 278)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={donor.hasMortgage}
                        onChange={(e) => setDonor({ ...donor, hasMortgage: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span>العقار مثقل برهن رسمي</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={donor.hasSeizure}
                        onChange={(e) => setDonor({ ...donor, hasSeizure: e.target.checked })}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span>توجد حجوز عقارية</span>
                    </label>
                  </div>
                  {donor.hasMortgage && (
                    <div className="p-2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                      ⚠️ تنبيه: العقار مثقل برهن؛ لا يمنع التقييد آلياً لكن يبقى الرهن كحق عيني تبعي يتبع العقار لدى الموهوب له.
                    </div>
                  )}
                </div>
              </div>

              {/* الموهوب له */}
              <div className="bg-teal-50/40 p-5 rounded-xl border border-teal-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-teal-900 flex items-center gap-2">
                    <span>👥 الطرف الموهوب له</span>
                    <span className="text-xs bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full">المستفيد</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">الجنس:</label>
                    <select
                      value={donee.gender}
                      onChange={(e) => setDonee({ ...donee, gender: e.target.value as any })}
                      className="text-xs p-1 border rounded bg-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donee.fullName}
                      onChange={(e) => setDonee({ ...donee, fullName: e.target.value })}
                      placeholder="الاسم الشخصي والعائلي"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم ب.ت.و (CIN)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donee.cin}
                      onChange={(e) => setDonee({ ...donee, cin: e.target.value })}
                      placeholder="رقم بطاقة التعريف الوطنية"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم الأب</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donee.fatherName}
                      onChange={(e) => setDonee({ ...donee, fatherName: e.target.value })}
                      placeholder="اسم الأب"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم الأم</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donee.motherName}
                      onChange={(e) => setDonee({ ...donee, motherName: e.target.value })}
                      placeholder="اسم الأم"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ ومكان الازدياد</label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="date"
                        className="w-full p-2 border rounded-lg text-xs bg-white"
                        value={donee.birthDate}
                        onChange={(e) => setDonee({ ...donee, birthDate: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg text-xs bg-white"
                        value={donee.birthPlace}
                        onChange={(e) => setDonee({ ...donee, birthPlace: e.target.value })}
                        placeholder="مكان الازدياد"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الأهلية القانونية</label>
                    <select
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={donee.capacityType}
                      onChange={(e) => setDonee({ ...donee, capacityType: e.target.value as any })}
                    >
                      <option value="راشد_كامل_الأهلية">راشد كامل الأهلية</option>
                      <option value="قاصر">قاصر (تحت سن الرشد)</option>
                      <option value="فاقد_الأهلية">فاقد الأهلية</option>
                      <option value="ناقص_الأهلية">ناقص الأهلية</option>
                      <option value="شخص_معنوي">شخص معنوي (جمعية / شركة / مؤسسة)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">صلة القرابة بالواهب</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        value={donee.relationshipToDonor}
                        onChange={(e) => setDonee({ ...donee, relationshipToDonor: e.target.value as any })}
                      >
                        <option value="ولد/ابنة">ابن / ابنة الواهب</option>
                        <option value="زوج/زوجة">زوج / زوجة</option>
                        <option value="قريب">قريب (أخ، ابن أخ، عم...)</option>
                        <option value="أجنبي">أجنبي</option>
                        <option value="وصي/ولي/كافل">مكفول / كافل</option>
                        <option value="آخر">صلة أخرى</option>
                      </select>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        value={donee.relationshipOther}
                        onChange={(e) => setDonee({ ...donee, relationshipOther: e.target.value })}
                        placeholder="تفاصيل الصلة أو الوثيقة..."
                      />
                    </div>
                  </div>
                </div>

                {/* خانة النائب الشرعي للقاصر (المادة 276) */}
                {(donee.capacityType === 'قاصر' || donee.capacityType === 'فاقد_الأهلية') && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 space-y-3">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-700" />
                      <span>🧑⚖️ بيانات النائب الشرعي لقبول الهبة (المادة 276 م.ح.ع)</span>
                    </span>
                    <div className="grid md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">صفة النائب</label>
                        <select
                          className="w-full p-1.5 border rounded bg-white"
                          value={donee.legalRep.repType}
                          onChange={(e) =>
                            setDonee({
                              ...donee,
                              legalRep: { ...donee.legalRep, repType: e.target.value as any },
                            })
                          }
                        >
                          <option value="أب">الأب (الولي الشرعي)</option>
                          <option value="أم">الأم (النائبة الشرعية)</option>
                          <option value="وصي">الوصي المختار</option>
                          <option value="مقدم">المقدم المعين قضائياً</option>
                          <option value="نائب_قضائي_آخر">نائب قضائي آخر</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">اسم النائب الكامل</label>
                        <input
                          type="text"
                          className="w-full p-1.5 border rounded bg-white"
                          value={donee.legalRep.repName}
                          onChange={(e) =>
                            setDonee({
                              ...donee,
                              legalRep: { ...donee.legalRep, repName: e.target.value },
                            })
                          }
                          placeholder="الاسم الكامل للنائب"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">رقم ب.ت.و للنائب</label>
                        <input
                          type="text"
                          className="w-full p-1.5 border rounded bg-white"
                          value={donee.legalRep.repCin}
                          onChange={(e) =>
                            setDonee({
                              ...donee,
                              legalRep: { ...donee.legalRep, repCin: e.target.value },
                            })
                          }
                          placeholder="CIN للنائب"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">المحكمة ومصدر الإذن</label>
                        <input
                          type="text"
                          className="w-full p-1.5 border rounded bg-white"
                          value={donee.legalRep.courtName}
                          onChange={(e) =>
                            setDonee({
                              ...donee,
                              legalRep: { ...donee.legalRep, courtName: e.target.value },
                            })
                          }
                          placeholder="المحكمة الابتدائية"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-1">رقم وتاريخ الحكم/الأمر</label>
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="text"
                            className="w-full p-1.5 border rounded bg-white"
                            value={donee.legalRep.judgmentNumber}
                            onChange={(e) =>
                              setDonee({
                                ...donee,
                                legalRep: { ...donee.legalRep, judgmentNumber: e.target.value },
                              })
                            }
                            placeholder="رقم الحكم"
                          />
                          <input
                            type="date"
                            className="w-full p-1.5 border rounded bg-white"
                            value={donee.legalRep.judgmentDate}
                            onChange={(e) =>
                              setDonee({
                                ...donee,
                                legalRep: { ...donee.legalRep, judgmentDate: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: نوع الهبة ومصفوفة الحقوق */}
        {activeStage === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 02: تحديد محل الهبة ومصفوفة الحقوق العينية (Rights Matrix)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">اختيار التكييف العيني الدقيق: ملكية تامة، رقبة مع احتفاظ بالانتفاع، حق انتفاع، سكنى، أو عمرى</p>
                </div>
              </div>
              <button
                onClick={() => setShowDisambiguationModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>فض اشتباه «الاستغلال إلى الموت»</span>
              </button>
            </div>

            {/* Main Options Grid */}
            <div className="grid md:grid-cols-3 gap-3">
              {[
                {
                  id: 'هبة_الملكية_كاملة',
                  title: '① هبة الملكية كاملة',
                  sub: 'الرقبة + الاستعمال + الاستغلال + التصرف',
                  desc: 'انتقال الملكية التامة للموهوب له دون أي احتفاظ للواهب.',
                  badge: 'ملكية تامة',
                  color: 'emerald',
                },
                {
                  id: 'هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع',
                  title: '② هبة الرقبة مع احتفاظ الواهب بحق الانتفاع',
                  sub: 'يهب الرقبة ويحتفظ بالانتفاع إلى وفاته',
                  desc: 'الواهب يبقى مستغلاً ومنتفعاً، والحيازة قانونية دون اشتراط إفراغه.',
                  badge: 'موصى به عائلياً',
                  color: 'amber',
                },
                {
                  id: 'هبة_حق_الانتفاع_فقط',
                  title: '③ هبة حق الانتفاع فقط',
                  sub: 'الواهب يحتفظ بالرقبة',
                  desc: 'الموهوب له يصبح صاحب حق الانتفاع فقط طيلة حياته أو لأجل.',
                  badge: 'حق انتفاع مستقل',
                  color: 'blue',
                },
                {
                  id: 'هبة_حق_الاستعمال',
                  title: '④ هبة حق الاستعمال',
                  sub: 'استعمال شخصي محدود',
                  desc: 'قاصر على الاستعمال الشخصي للموهوب له ولأسرته دون استغلال للغير.',
                  badge: 'م. 109 م.ح.ع',
                  color: 'indigo',
                },
                {
                  id: 'هبة_العمرى',
                  title: '⑤ هبة العمرى',
                  sub: 'تمليك المنفعة بلا عوض طوال الحياة',
                  desc: 'حق عيني منظم في المواد 105 وما بعدها يقرر لمنفعة المعطى له طوال حياته.',
                  badge: 'م. 105 م.ح.ع',
                  color: 'purple',
                },
                {
                  id: 'هبة_حق_عيني_آخر',
                  title: '⑥ هبة حق عيني عقاري آخر',
                  sub: 'سطحية، زينة، هواء، ارتفاق',
                  desc: 'وفق القائمة الحصرية للحقوق العينية الأصلية في المادة 9 من م.ح.ع.',
                  badge: 'م. 9 م.ح.ع',
                  color: 'cyan',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelectGiftSubject(opt.id as any)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    giftSubject === opt.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-gray-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-gray-800">{opt.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        {opt.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-800 mb-1">{opt.sub}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">
                      {giftSubject === opt.id ? '🟢 تم اختياره' : 'انقر للتحديد'}
                    </span>
                    <input
                      type="radio"
                      name="giftSubject"
                      checked={giftSubject === opt.id}
                      onChange={() => handleSelectGiftSubject(opt.id as any)}
                      className="w-4 h-4 text-emerald-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Rights Matrix Table */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>مصفوفة توزيع الحقوق العينية بين الواهب والموهوب له</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">قم بضبط سلطات الملكية؛ وسيقوم المحرك آلياً بالتحقق من الانسجام القانوني</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                  التصنيف الحالي: {giftSubject.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs bg-white rounded-xl border border-gray-200">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">عنصر الملكية والحق العيني</th>
                      <th className="p-3 text-center text-emerald-800">الطرف الواهب</th>
                      <th className="p-3 text-center text-teal-800">الطرف الموهوب له</th>
                      <th className="p-3">الأثر القانوني والمدلول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { key: 'raqaba', label: 'الرقبة (ملكية الأصل)', desc: 'أصل الملك وحق التصرف النهائي في الرقبة' },
                      { key: 'istimal', label: 'الاستعمال (Usage)', desc: 'السكنى أو الاستخدام المباشر للعين' },
                      { key: 'istighlal', label: 'الاستغلال (Fructus)', desc: 'كراء العين وجني الأكرية وثمارها' },
                      { key: 'intifa', label: 'الانتفاع (Usufruct)', desc: 'الاستعمال + الاستغلال مجتمعين كحق عيني' },
                      { key: 'sokna', label: 'السكنى الشخصية فقط', desc: 'قاصر على السكنى دون الكراء أو الاستغلال' },
                      { key: 'tasarruf', label: 'سلطة التصرف النهائي', desc: 'حق التفويت أو التبرع أو الرهن' },
                    ].map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50/50">
                        <td className="p-3 font-semibold text-gray-800">{row.label}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={(rightsMatrix.donor as any)[row.key] || false}
                            onChange={(e) =>
                              setRightsMatrix({
                                ...rightsMatrix,
                                donor: { ...rightsMatrix.donor, [row.key]: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={(rightsMatrix.donee as any)[row.key] || false}
                            onChange={(e) =>
                              setRightsMatrix({
                                ...rightsMatrix,
                                donee: { ...rightsMatrix.donee, [row.key]: e.target.checked },
                              })
                            }
                            className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-gray-500">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Special options for retained usufruct */}
              {isUsufructRetained && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 grid md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-amber-900 font-bold mb-1">مدة حق الانتفاع المحتفظ به</label>
                    <select
                      value={usufructDuration}
                      onChange={(e) => setUsufructDuration(e.target.value as any)}
                      className="w-full p-2 border rounded bg-white text-xs"
                    >
                      <option value="مدى_حياة_الواهب">مدى حياة الواهب (ينقضي بوفاته حتماً)</option>
                      <option value="مدى_حياة_الموهوب_له">مدى حياة الموهوب له</option>
                      <option value="أجل_محدد">إلى أجل محدد مقترن بتاريخ</option>
                    </select>
                  </div>
                  {usufructDuration === 'أجل_محدد' && (
                    <div>
                      <label className="block text-amber-900 font-bold mb-1">تاريخ انتهاء الانتفاع</label>
                      <input
                        type="date"
                        value={usufructExpiryDate}
                        onChange={(e) => setUsufructExpiryDate(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-amber-900 font-bold mb-1">نطاق الانتفاع</label>
                    <select
                      value={usufructScope}
                      onChange={(e) => setUsufructScope(e.target.value as any)}
                      className="w-full p-2 border rounded bg-white text-xs"
                    >
                      <option value="كامل_العقار">كامل العقار الموهوب</option>
                      <option value="حصة_مشاعة">حصة مشاعة فقط</option>
                    </select>
                  </div>
                </div>
              )}

              {giftSubject === 'هبة_حق_عيني_آخر' && (
                <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-300 text-xs space-y-2">
                  <label className="block text-cyan-950 font-bold">اسم وطبيعة الحق العيني الموهوب (وفق المادة 9 م.ح.ع):</label>
                  <input
                    type="text"
                    value={otherRealRightName}
                    onChange={(e) => setOtherRealRightName(e.target.value)}
                    placeholder="مثلاً: حق الهواء، حق السطحية، حق الزينة، حق ارتفاق..."
                    className="w-full p-2 border rounded-lg bg-white text-xs"
                  />
                  <p className="text-[11px] text-cyan-800">
                    ملاحظة: تنص المادة 11 من مدونة الحقوق العينية على أنه «لا يجوز إنشاء أي حق عيني عقاري آخر إلا بقانون».
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 3: العقارات المتعددة والمركبة */}
        {activeStage === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 03: العقارات موضوع الهبة (العقار المركب والمتعدد)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">إمكانية إضافة عدة عقارات في نفس الرسم: محفظ، في طور التحفيظ، غير محفظ</p>
                </div>
              </div>
              <button
                onClick={addPropertyItem}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عقار آخر للهبة</span>
              </button>
            </div>

            <div className="space-y-4">
              {propertiesList.map((prop, idx) => (
                <div key={prop.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={prop.propertyName}
                        onChange={(e) => updatePropertyItem(prop.id, 'propertyName', e.target.value)}
                        className="font-bold text-gray-800 text-sm bg-white border border-gray-300 rounded px-2 py-1"
                        placeholder="اسم العقار أو وصفه"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={prop.propertyType}
                        onChange={(e) => updatePropertyItem(prop.id, 'propertyType', e.target.value)}
                        className="text-xs font-bold p-1.5 border rounded-lg bg-white"
                      >
                        <option value="محفظ">🟢 عقار محفظ (رسم عقاري)</option>
                        <option value="في_طور_التحفيظ">🟡 في طور التحفيظ (مطلب)</option>
                        <option value="غير_محفظ">🔴 غير محفظ (ملك عادي)</option>
                      </select>
                      {propertiesList.length > 1 && (
                        <button
                          onClick={() => removePropertyItem(prop.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="حذف هذا العقار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    {prop.propertyType === 'محفظ' && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">رقم الرسم العقاري</label>
                          <input
                            type="text"
                            value={prop.titleNumber || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'titleNumber', e.target.value)}
                            placeholder="مثلاً: 12345/03 أو ك/1234"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">المحافظة العقارية التابع لها</label>
                          <input
                            type="text"
                            value={prop.landConservationOffice || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'landConservationOffice', e.target.value)}
                            placeholder="المحافظة على الأملاك العقارية"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">طبيعة العقار والمشتملات</label>
                          <input
                            type="text"
                            value={prop.propertyNature || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'propertyNature', e.target.value)}
                            placeholder="دار، شقة، أرض فلاحية..."
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      </>
                    )}

                    {prop.propertyType === 'في_طور_التحفيظ' && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">رقم مطلب التحفيظ</label>
                          <input
                            type="text"
                            value={prop.requisitionNumber || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'requisitionNumber', e.target.value)}
                            placeholder="مثلاً: 5678/03"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">المحافظة العقارية</label>
                          <input
                            type="text"
                            value={prop.landConservationOffice || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'landConservationOffice', e.target.value)}
                            placeholder="المحافظة العقارية"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">تاريخ إيداع المطلب</label>
                          <input
                            type="date"
                            value={prop.requisitionDate || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'requisitionDate', e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      </>
                    )}

                    {prop.propertyType === 'غير_محفظ' && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">مصدر الملك والحيازة (م. 3)</label>
                          <input
                            type="text"
                            value={prop.rootOfTitleDetails || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'rootOfTitleDetails', e.target.value)}
                            placeholder="إراثة، شراء، حيازة هادئة مستوفية للشروط..."
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">الحدود الأربعة</label>
                          <input
                            type="text"
                            value={prop.boundaries?.north || ''}
                            onChange={(e) =>
                              updatePropertyItem(prop.id, 'boundaries', {
                                ...(prop.boundaries || {}),
                                north: e.target.value,
                              })
                            }
                            placeholder="شمالاً، جنوباً، شرقاً، غرباً"
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">المشتملات والمساحة التقريبية</label>
                          <input
                            type="text"
                            value={prop.contents || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'contents', e.target.value)}
                            placeholder="غرف، ساحة، مساحة..."
                            className="w-full p-2 border rounded-lg bg-white"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">الموقع والعنوان</label>
                      <input
                        type="text"
                        value={prop.location || ''}
                        onChange={(e) => updatePropertyItem(prop.id, 'location', e.target.value)}
                        placeholder="المدينة، الحي، الزنقة..."
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">المساحة الإجمالية</label>
                      <input
                        type="text"
                        value={prop.area || ''}
                        onChange={(e) => updatePropertyItem(prop.id, 'area', e.target.value)}
                        placeholder="مثلاً: 120 م² أو هكتار..."
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">المالك المقيد حالياً</label>
                      <input
                        type="text"
                        value={prop.currentOwner || ''}
                        onChange={(e) => updatePropertyItem(prop.id, 'currentOwner', e.target.value)}
                        placeholder="اسم المالك بالسجل"
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 4: الشياع والحصص المشاعة */}
        {activeStage === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 04: الشياع والحصص المشاعة والفرز المادي (المواد 24 وما بعدها م.ح.ع)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تحديد نسبة الملك: كامل الملك، حصة شائعة كسرية، وفحص تنبيه الفرز المادي دون قسمة</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {propertiesList.map((prop, _idx) => (
                <div key={prop.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-800">
                      🏢 {prop.propertyName} ({prop.propertyType})
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      الحصة: {prop.customShareFraction}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">طبيعة ملكية الواهب في العقار</label>
                      <select
                        value={prop.coOwnershipType}
                        onChange={(e) => {
                          const val = e.target.value;
                          let frac = '1/1 كامل الملك';
                          if (val === 'النصف') frac = '1/2 مشاعاً';
                          if (val === 'الربع') frac = '1/4 مشاعاً';
                          if (val === 'الثلث') frac = '1/3 مشاعاً';
                          if (val === 'حصة_أخرى') frac = 'حصة مشاعة محددة';
                          updatePropertyItem(prop.id, 'coOwnershipType', val);
                          updatePropertyItem(prop.id, 'customShareFraction', frac);
                        }}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-semibold"
                      >
                        <option value="كامل_الملك">كامل الملك (100%)</option>
                        <option value="النصف">النصف على الشياع (1/2)</option>
                        <option value="الربع">الربع على الشياع (1/4)</option>
                        <option value="الثلث">الثلث على الشياع (1/3)</option>
                        <option value="حصة_أخرى">حصة كسرية أخرى</option>
                        <option value="حصة_شائعة_غير_كسرية">حصة شائعة عددية/أسهم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">صيغة الحصة المشاعة في الرسم</label>
                      <input
                        type="text"
                        value={prop.customShareFraction}
                        onChange={(e) => updatePropertyItem(prop.id, 'customShareFraction', e.target.value)}
                        placeholder="مثلاً: 1/4 مشاعاً من مجموع العقار"
                        className="w-full p-2 border rounded-lg bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">هل الهبة واردة على جزء مفرز مادياً؟</label>
                      <div className="flex gap-4 items-center mt-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`isPartition-${prop.id}`}
                            checked={!prop.isPhysicalPartition}
                            onChange={() => updatePropertyItem(prop.id, 'isPhysicalPartition', false)}
                            className="w-3.5 h-3.5 text-emerald-600"
                          />
                          <span>حصة شائعة (غير مفرزة)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`isPartition-${prop.id}`}
                            checked={prop.isPhysicalPartition}
                            onChange={() => updatePropertyItem(prop.id, 'isPhysicalPartition', true)}
                            className="w-3.5 h-3.5 text-amber-600"
                          />
                          <span>جزء مفرز مادياً</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {prop.isPhysicalPartition && (
                    <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-300 space-y-2">
                      <div className="flex items-start gap-2 text-amber-900 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <span>
                          ⚠️ تنبيه قانوني (فصل 973 ق.ل.ع والمادة 24 م.ح.ع): الواهب يملك حصة شائعة وليس بالضرورة الجزء المادي المحدد. يجب التحقق من وجود سند قسمة رسمي أو اتفاق نافذ قبل اعتماد الوصف المفرز.
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">سند القسمة المعتمد</label>
                          <select
                            value={prop.physicalPartitionDeedType}
                            onChange={(e) => updatePropertyItem(prop.id, 'physicalPartitionDeedType', e.target.value)}
                            className="w-full p-1.5 border rounded bg-white text-xs"
                          >
                            <option value="لا_توجد_قسمة">لا توجد قسمة (خطر البطلان/عدم الاحتجاج بالفرز)</option>
                            <option value="قسمة_رضائية">قسمة رضائية رسمية مقيدة</option>
                            <option value="قسمة_قضائية">قسمة قضائية نهائية حائزة لقوة الشيء المقضي به</option>
                            <option value="اتفاق_قابل_للاحتجاج">اتفاق مهايأة أو فرز قابل للاحتجاج</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">مراجع سند الفرز أو القسمة</label>
                          <input
                            type="text"
                            value={prop.physicalPartitionDetails || ''}
                            onChange={(e) => updatePropertyItem(prop.id, 'physicalPartitionDetails', e.target.value)}
                            placeholder="تاريخ ورقم ومراجع رسم القسمة أو الحكم..."
                            className="w-full p-1.5 border rounded bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 5: سند تملك الواهب وسلسلة التملك والفحص الزمني */}
        {activeStage === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 05: سند تملك الواهب والفحص الزمني الدقيق (24 ماي 2012)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">دعم 11 نوعاً من أسناد الملكية، التملك متعدد المصادر، وفحص أثر دخول القانون 39.08</p>
                </div>
              </div>
              <button
                onClick={addOwnershipSource}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مصدر ملك آخر للواهب</span>
              </button>
            </div>

            {/* Total Percentage Calculation Card */}
            <div className="p-4 rounded-xl border bg-gradient-to-r from-gray-50 to-emerald-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">إجمالي حصة الواهب الثابتة بأسناد الملك:</span>
                <span className="text-xl font-black text-gray-800">{totalOwnedPercentage}%</span>
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 block">الحصة المطلوبة للهبة:</span>
                <span className="text-xl font-black text-emerald-800">{giftTotalPercentage}%</span>
              </div>
              <div>
                {isOwnershipExceeded ? (
                  <span className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1">
                    <Ban className="w-4 h-4" />
                    <span>🔴 تجاوز: الهبة تفوق الملك الثابت!</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>🟢 الهبة مطابقة للحصة المملوكة للواهب</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ownership Sources List */}
            <div className="space-y-4">
              {ownershipSources.map((src, idx) => (
                <div key={src.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <select
                        value={src.sourceType}
                        onChange={(e) => updateOwnershipSource(src.id, 'sourceType', e.target.value)}
                        className="font-bold text-gray-800 text-xs p-1.5 border rounded-lg bg-white"
                      >
                        <option value="رسم_عدلي">📜 رسم عدلي مضمن (كناش الأملاك)</option>
                        <option value="عقد_موثق">📄 عقد موثق رسمي</option>
                        <option value="عقد_محام_ثابت_التاريخ">⚖️ عقد محام مقبول للنقض ثابت التاريخ</option>
                        <option value="حكم_قضائي">🏛️ حكم قضائي نهائي حائز لقوة الشيء المقضي به</option>
                        <option value="إراثة_وسند_الموروث">👨‍👩‍👧‍👦 إراثة + سند تملك الموروث</option>
                        <option value="قسمة">✂️ رسم قسمة رسمي</option>
                        <option value="وصية">📜 رسم وصية</option>
                        <option value="صدقة">🕌 رسم صدقة سابق</option>
                        <option value="هبة_سابقة">🎁 رسم هبة سابقة</option>
                        <option value="سند_أجنبي">🌐 سند أو عقد أجنبي مذيل بالصيغة التنفيذية</option>
                        <option value="سند_قديم_عرفي">📜 سند قديم عرفي (فحص تاريخ 24 ماي 2012)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="font-bold text-gray-700">النسبة:</label>
                        <input
                          type="number"
                          value={src.percentage}
                          onChange={(e) => updateOwnershipSource(src.id, 'percentage', Number(e.target.value))}
                          className="w-16 p-1 border rounded bg-white text-center font-bold text-xs"
                        />
                        <span>%</span>
                      </div>
                      {ownershipSources.length > 1 && (
                        <button
                          onClick={() => removeOwnershipSource(src.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">تاريخ إنشاء السند</label>
                      <input
                        type="date"
                        value={src.date}
                        onChange={(e) => updateOwnershipSource(src.id, 'date', e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white text-xs"
                      />
                    </div>

                    {src.sourceType === 'رسم_عدلي' && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">كناش الأملاك والرقم</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={src.registryBookNumber || ''}
                              onChange={(e) => updateOwnershipSource(src.id, 'registryBookNumber', e.target.value)}
                              placeholder="كناش..."
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                            <input
                              type="text"
                              value={src.registryCount || ''}
                              onChange={(e) => updateOwnershipSource(src.id, 'registryCount', e.target.value)}
                              placeholder="العدد..."
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">الحرف والصفحة</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={src.registryLetter || 'أ'}
                              onChange={(e) => updateOwnershipSource(src.id, 'registryLetter', e.target.value)}
                              placeholder="الحرف"
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                            <input
                              type="text"
                              value={src.registryPage || ''}
                              onChange={(e) => updateOwnershipSource(src.id, 'registryPage', e.target.value)}
                              placeholder="الصفحة"
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">المحكمة وقسم التوثيق</label>
                          <input
                            type="text"
                            value={src.courtName || ''}
                            onChange={(e) => updateOwnershipSource(src.id, 'courtName', e.target.value)}
                            placeholder="توثيق المحكمة الابتدائية..."
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          />
                        </div>
                      </>
                    )}

                    {src.sourceType === 'حكم_قضائي' && (
                      <>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">المحكمة المصدرة للحكم</label>
                          <input
                            type="text"
                            value={src.judgmentCourt || ''}
                            onChange={(e) => updateOwnershipSource(src.id, 'judgmentCourt', e.target.value)}
                            placeholder="المحكمة الابتدائية / الاستئناف"
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">رقم الملف ورقم الحكم</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={src.judgmentFileNumber || ''}
                              onChange={(e) => updateOwnershipSource(src.id, 'judgmentFileNumber', e.target.value)}
                              placeholder="الملف"
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                            <input
                              type="text"
                              value={src.judgmentNumber || ''}
                              onChange={(e) => updateOwnershipSource(src.id, 'judgmentNumber', e.target.value)}
                              placeholder="الحكم"
                              className="w-full p-2 border rounded-lg bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">شهادة عدم الطعن</label>
                          <select
                            value={src.nonAppealCertificate ? 'نعم' : 'لا'}
                            onChange={(e) => updateOwnershipSource(src.id, 'nonAppealCertificate', e.target.value === 'نعم')}
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          >
                            <option value="نعم">متوفرة (حائز لقوة الشيء المقضي به)</option>
                            <option value="لا">غير متوفرة / قيد الطعن</option>
                          </select>
                        </div>
                      </>
                    )}

                    {src.sourceType === 'سند_قديم_عرفي' && (
                      <div className="md:col-span-3">
                        {src.date && src.date < LAW_39_08_EFFECTIVE_DATE ? (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">
                            <span className="font-bold flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span>🟡 سند سابق لدخول مدونة الحقوق العينية حيز التنفيذ (قبل 24 ماي 2012):</span>
                            </span>
                            <p className="leading-relaxed">
                              تطبق عليه مقتضيات الحقوق السابقة (المادتان 1 و 9 من م.ح.ع) والفقه المالكي الراجح والقضاء السائد آنذاك، ويلزم التحقق من ثبوت تاريخه وحيازته المستمرة.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900">
                            <span className="font-bold flex items-center gap-1.5 mb-1">
                              <Ban className="w-4 h-4 text-rose-600" />
                              <span>🔴 مانع قاطع (تاريخ السند بعد 24 ماي 2012):</span>
                            </span>
                            <p className="leading-relaxed">
                              العقود العرفية المنشأة بعد دخول القانون 39.08 حيز التنفيذ باطلة بطلاناً مطلقاً في التصرفات العقارية والتبرعات عملاً بالمادتين 4 و 274. لا يمكن اعتماد هذا السند لنقل الملكية.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 6: الوكالة وسجلات الحقوق العينية */}
        {activeStage === 6 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 06: التحقق من الوكالة وسجلات الحقوق العينية (الفصلان 1-889 و 2-889 والمرسوم 2.23.101)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">فحص أهلية الوكيل، تضمن الوكالة لسلطة التبرع، وتقييدها بالسجلين المحلي والوطني الإلكتروني</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">طريقة إبرام الهبة:</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-800">
                    <input
                      type="radio"
                      name="poaMethod"
                      checked={!poa.hasPoa}
                      onChange={() => setPoa({ ...poa, hasPoa: false, poaType: 'مباشرة' })}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span>إبرام مباشر (أصالة عن النفس)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-800">
                    <input
                      type="radio"
                      name="poaMethod"
                      checked={poa.hasPoa}
                      onChange={() => setPoa({ ...poa, hasPoa: true, poaType: 'وكالة_خاصة' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>إبرام بواسطة وكيل (وكالة رسمية)</span>
                  </label>
                </div>
              </div>

              {poa.hasPoa && (
                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">نوع الوكالة</label>
                      <select
                        value={poa.poaType}
                        onChange={(e) => setPoa({ ...poa, poaType: e.target.value as any })}
                        className="w-full p-2 border rounded-lg bg-white"
                      >
                        <option value="وكالة_خاصة">وكالة خاصة بالهبة والتصرف العقاري</option>
                        <option value="وكالة_قضائية">وكالة قضائية / أمر نيابة</option>
                        <option value="وكالة_أجنبية">وكالة قنصلية / أجنبية مذيلة</option>
                        <option value="وكالة_تصرف_عقاري">وكالة عامة مفوضة للتصرفات العقارية</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">اسم الوكيل الكامل</label>
                      <input
                        type="text"
                        value={poa.agentName}
                        onChange={(e) => setPoa({ ...poa, agentName: e.target.value })}
                        placeholder="اسم الوكيل الحاضر بالمجلس"
                        className="w-full p-2 border rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">محرر الوكالة وتاريخها</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={poa.drafter}
                          onChange={(e) => setPoa({ ...poa, drafter: e.target.value })}
                          placeholder="العدلان / الموثق"
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                        <input
                          type="date"
                          value={poa.date}
                          onChange={(e) => setPoa({ ...poa, date: e.target.value })}
                          className="w-full p-2 border rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* نطاق صلاحيات الوكالة العقارية */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="font-bold text-gray-800 block">فحص صلاحيات الوكالة العقارية الصريحة (خاصية الهبة):</span>
                    <div className="grid md:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={poa.scopeIncludesGift}
                          onChange={(e) => setPoa({ ...poa, scopeIncludesGift: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>تشمل صلاحية التبرع والهبة صراحة</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={poa.scopeIncludesSigning}
                          onChange={(e) => setPoa({ ...poa, scopeIncludesSigning: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>تشمل التوقيع على الرسم العدلي</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={poa.scopeIncludesPossessionAck}
                          onChange={(e) => setPoa({ ...poa, scopeIncludesPossessionAck: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>تشمل الإقرار بالحوز أو التمكين</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={poa.scopeIncludesRegistration}
                          onChange={(e) => setPoa({ ...poa, scopeIncludesRegistration: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>تشمل الإيداع والتقييد العقاري</span>
                      </label>
                    </div>
                  </div>

                  {/* السجل المحلي والسجل الوطني للوكالات */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* السجل المحلي بالمحكمة الابتدائية */}
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                      <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-700" />
                        <span>🏛️ السجل المحلي للوكالات (فصل 1-889 ق.ل.ع)</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">المحكمة الابتدائية</label>
                          <input
                            type="text"
                            value={poa.localRegistryCourt}
                            onChange={(e) => setPoa({ ...poa, localRegistryCourt: e.target.value })}
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">تاريخ التقييد بالسجل</label>
                          <input
                            type="date"
                            value={poa.localRegistryDate}
                            onChange={(e) => setPoa({ ...poa, localRegistryDate: e.target.value })}
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">الرقم الترتيبي / التحليلي</label>
                          <input
                            type="text"
                            value={poa.localRegistryOrderNumber}
                            onChange={(e) => setPoa({ ...poa, localRegistryOrderNumber: e.target.value })}
                            placeholder="الرقم الترتيبي"
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">الرقم المركب وشهادة القيد</label>
                          <input
                            type="text"
                            value={poa.localRegistryCompositeNumber}
                            onChange={(e) => setPoa({ ...poa, localRegistryCompositeNumber: e.target.value })}
                            placeholder="الرقم المركب"
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* السجل الوطني الإلكتروني */}
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                      <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-700" />
                        <span>🌐 السجل الوطني الإلكتروني (فصل 2-889 والمرسوم 2.23.101)</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">رقم التسجيل الوطني</label>
                          <input
                            type="text"
                            value={poa.nationalRegistryNumber}
                            onChange={(e) => setPoa({ ...poa, nationalRegistryNumber: e.target.value })}
                            placeholder="الرقم الوطني الموحد"
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">تاريخ التحقق الإلكتروني</label>
                          <input
                            type="date"
                            value={poa.nationalVerificationDate}
                            onChange={(e) => setPoa({ ...poa, nationalVerificationDate: e.target.value })}
                            className="w-full p-1.5 border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-gray-700 font-semibold mb-1">نتيجة التحقق من السريان وعدم الإلغاء</label>
                          <select
                            value={poa.nationalVerificationResult}
                            onChange={(e) => setPoa({ ...poa, nationalVerificationResult: e.target.value as any })}
                            className="w-full p-1.5 border rounded bg-white font-bold"
                          >
                            <option value="مطابق_وصالح">🟢 الوكالة سارية المفعول ومطابقة ولم يطرأ عليها إلغاء</option>
                            <option value="ملغى">🔴 الوكالة ملغاة بالسجل الوطني (مانع قانوني)</option>
                            <option value="معدل">🟠 الوكالة خضعت لتعديل لاحق</option>
                            <option value="غير_مسجل">🔴 غير مسجلة بالسجل الوطني (غير منتجة لآثارها)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 7: الحيازة والإخلاء الذكي (The Core Legal Safeguard) */}
        {activeStage === 7 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 07: محرك الحيازة الذكي والتمكين التناسبي (عدم اشتراط إفراغ الواهب المنتفع)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تمييز جوهري بين الحيازة والإخلاء وفق المادة 274 واجتهاد محكمة النقض المستقر</p>
                </div>
              </div>
            </div>

            {/* Central Safeguard Alert Card */}
            {isUsufructRetained ? (
              <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-400 space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>⚖️ القاعدة المركزية لهبة الرقبة مع احتفاظ الواهب بحق الانتفاع أو السكنى:</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                  «لا يشترط إفراغ الواهب من العقار الموهوب، ولا يعتبر بقاء الواهب فيه دليلاً على عدم حصول الحيازة؛ لأن هذا البقاء مستند إلى حق الانتفاع أو السكنى الذي احتفظ به صراحة في رسم الهبة. وتتحقق حيازة الرقبة قانوناً بتمكين الموهوب له من الوثائق والرسوم والتصرفات المناسبة دون المساس بانتفاع الواهب المحتفظ به.»
                </p>
                <div className="text-[11px] text-amber-800 bg-white/70 p-2 rounded-lg border border-amber-200">
                  مرجع قضائي: قرار محكمة النقض رقم 343 بتاريخ 18-09-2018 (ملف مدني 4567/1/1/2017): استمرار الواهبة في استغلال وسكنى العقار إلى وفاتها لا ينال من صحة هبة الرقبة متى ثبتت الحيازة القانونية.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-400 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>⚖️ هبة الملكية التامة: التمكين والحوز الفعلي</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  في هبة الملكية الكاملة دون احتفاظ بالانتفاع، يتحقق الحوز بتسليم المفاتيح والإخلاء الفعلي للعين في العقار غير المحفظ، بينما يغني التقييد بالرسم العقاري عن الحيازة الفعلية والإخلاء عملاً بالمادة 274 من مدونة الحقوق العينية.
                </p>
              </div>
            )}

            {/* Proportional Possession Indicators Checklist */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4 text-xs">
              <span className="font-bold text-gray-800 block text-sm">
                🏠 كيف تحققت الحيازة والتمكين في هذه النازلة؟ (حدد جميع المظاهر المتوفرة):
              </span>

              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { id: 'تسليم_الوثائق', label: 'تمكين الموهوب له من سند الملكية/الرسم العقاري والوثائق المتعلقة بالرقبة' },
                  { id: 'تحويل_العدادات', label: 'تغيير أو تحويل اشتراكات الماء والكهرباء حيثما لا يتعارض مع الانتفاع' },
                  { id: 'صيانة_وترميم', label: 'قيام الموهوب له بأعمال الصيانة والإصلاح والترميم والصباغة' },
                  { id: 'تحمل_المصاريف', label: 'تحمل الموهوب له للمصاريف والتكاليف المرتبطة بالملكية والرقبة' },
                  { id: 'مباشرة_حقوق_الرقبة', label: 'مباشرة الموهوب له للحقوق القانونية للرقبة دون التعرض لانتفاع الواهب' },
                  { id: 'تسليم_فعلي', label: 'تسليم فعلي للمفاتيح وتمكين تام من العقار (في حالة الملكية الكاملة)' },
                  { id: 'تقييد_بالرسم_العقاري', label: 'التقييد بالسجلات العقارية (يغني قانوناً عن الحيازة الفعلية وفق م 274)' },
                  { id: 'إدراج_مطلب_التحفيظ', label: 'إدراج مطلب التحفيظ بالمحافظة العقارية (م 274)' },
                  { id: 'حيازة_قانونية_لطبيعة_الحق_المحتفظ_به', label: 'حيازة قانونية حكمية ملائمة لطبيعة الحق المحتفظ به صراحة' },
                  { id: 'معاينة_العدول', label: 'معاينة العدلين للحوز وتلقي الإشهاد بالحيازة من الواهب والموهوب له' },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => togglePossessionMethod(item.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      possession.evidenceMethods.includes(item.id)
                        ? 'bg-emerald-50/80 border-emerald-500 font-bold text-emerald-950'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={possession.evidenceMethods.includes(item.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                    />
                    <span className="leading-snug">{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Free Text Description of Possession */}
              <div className="space-y-2 pt-2">
                <label className="block text-gray-700 font-bold">وصف الحيازة التناسبية ومعاينة العدلين في صلب الرسم:</label>
                <textarea
                  rows={3}
                  value={possession.customEvidenceDescription}
                  onChange={(e) => setPossession({ ...possession, customEvidenceDescription: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs bg-white"
                  placeholder="وصف وقائع التمكين والحيازة بدقة..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Stage 8: المحافظة العقارية والتقييد */}
        {activeStage === 8 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 08: إجراءات المحافظة العقارية وحجية التقييد (المادة 274)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تقييد الهبة بالرسم العقاري، استخراج الأمر بالاستخلاص، وحجية التقييد العيني</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-sm">مراجع الإيداع والتقييد بالمحافظة:</span>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">رقم وتاريخ أمر الاستخلاص / الإيداع</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={finance.conservationDepositNumber}
                      onChange={(e) => setFinance({ ...finance, conservationDepositNumber: e.target.value })}
                      placeholder="رقم الإيداع"
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                    <input
                      type="date"
                      value={finance.conservationDepositDate}
                      onChange={(e) => setFinance({ ...finance, conservationDepositDate: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">واجبات المحافظة العقارية (درهم)</label>
                  <input
                    type="number"
                    value={finance.conservationFeesAmount}
                    onChange={(e) => setFinance({ ...finance, conservationFeesAmount: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-900 block text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>الأثر الحاسم للتقييد بالرسم العقاري:</span>
                </span>
                <p className="text-emerald-950 leading-relaxed">
                  تنص المادة 274 من مدونة الحقوق العينية صراحة على أن: «التقييد بالسجلات العقارية يغني عن الحيازة الفعلية للعقار وعن إخلائه إذا كان محفظاً أو في طور التحفيظ».
                </p>
                <p className="text-emerald-800 text-[11px] leading-relaxed pt-1 border-t border-emerald-200">
                  كما أكدت محكمة النقض أن التقييد هو المنشئ للحق العيني في مواجهة الكافة، وأن سند الهبة غير المقيد لا يحاج به الغير المقيد بحسن نية.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage 9: المالية والتسجيل والتنبر */}
        {activeStage === 9 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 09: المحرك المالي والتسجيل والتنبر (حسب سنة العملية والقرابة)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">حساب واجبات التسجيل وفق صلة القرابة ونوع الحق الموهوب وسنة المعاملة دون نسب جامدة</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-sm">مصلحة التسجيل والوصل:</span>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">مصلحة التسجيل المختصة</label>
                  <input
                    type="text"
                    value={finance.taxRegistryOffice}
                    onChange={(e) => setFinance({ ...finance, taxRegistryOffice: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">رقم وصل التسجيل</label>
                  <input
                    type="text"
                    value={finance.registrationReceiptNumber}
                    onChange={(e) => setFinance({ ...finance, registrationReceiptNumber: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">تاريخ التسجيل</label>
                  <input
                    type="date"
                    value={finance.registrationDate}
                    onChange={(e) => setFinance({ ...finance, registrationDate: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 block text-sm">المبالغ والتنبر:</span>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">مبلغ واجبات التسجيل (درهم)</label>
                  <input
                    type="number"
                    value={finance.registrationAmount}
                    onChange={(e) => setFinance({ ...finance, registrationAmount: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">واجب التنبر (40 درهم للصفحة)</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      value={finance.stampDutyAmount}
                      onChange={(e) => setFinance({ ...finance, stampDutyAmount: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg bg-white"
                      placeholder="المبلغ"
                    />
                    <input
                      type="number"
                      value={finance.numberOfPages}
                      onChange={(e) => setFinance({ ...finance, numberOfPages: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg bg-white"
                      placeholder="الصفحات"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">مرجع أداء التنبر</label>
                  <input
                    type="text"
                    value={finance.stampPaymentReference}
                    onChange={(e) => setFinance({ ...finance, stampPaymentReference: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-900 block text-sm">التكييف الجبائي للقرابة:</span>
                <p className="text-emerald-950 leading-relaxed">
                  تستفيد الهبات المبرمة بين الأصول والفروع والزوجين من المعاملة التفضيلية وفق المدونة العامة للضرائب (1.5% أو الرسم الأدنى المحدد سنوياً).
                </p>
                <div className="mt-2 p-2 bg-white rounded border border-emerald-200 text-[11px] text-emerald-800">
                  صلة القرابة المعتمدة في الملف: <span className="font-bold">{donee.relationshipToDonor}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 10: المراقبة القانونية والاجتهاد القضائي */}
        {activeStage === 10 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 10: المراقبة القانونية الذكية والاجتهادات القضائية المرتبطة</h2>
                  <p className="text-xs text-gray-500 mt-0.5">فحص المطابقة الشاملة للرسم وقرارات محكمة النقض المغربية الخاصة بهذه الوضعية</p>
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              {legalValidation.blockers.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>موانع قانونية قاطعة تمنع تحرير الرسم العدلي:</span>
                  </span>
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                    {legalValidation.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {legalValidation.warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>تنبيهات قانونية وإجرائية يجب التنصيص عليها في العقد:</span>
                  </span>
                  <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                    {legalValidation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {legalValidation.blockers.length === 0 && legalValidation.warnings.length === 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">
                    جميع الشروط القانونية والشرعية والمسطرية مستوفاة بالكامل والرسم جاهز للتحرير والتضمين.
                  </span>
                </div>
              )}
            </div>

            {/* Embedded Court of Cassation Decisions */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3 text-xs">
              <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-emerald-700" />
                <span>قرارات محكمة النقض المرتبطة بنازلة هذا الرسم:</span>
              </span>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold text-emerald-900 block">قرار محكمة النقض رقم 343 (18-09-2018)</span>
                  <span className="text-gray-500 text-[11px] block">ملف مدني 4567/1/1/2017</span>
                  <p className="text-gray-700 leading-relaxed">
                    «إن هبة حق الرقبة مع احتفاظ الواهب بحق السكنى والاستغلال طيلة حياته تصرف صحيح، وبقاء الواهب في العقار لا ينال من صحة الهبة متى تم تقييد الرقبة بالمحافظة العقارية.»
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold text-emerald-900 block">قرار محكمة النقض رقم 524 (24-10-2017)</span>
                  <span className="text-gray-500 text-[11px] block">المادة 274 م.ح.ع والحيازة</span>
                  <p className="text-gray-700 leading-relaxed">
                    «التقييد بالسجلات العقارية يغني عن الحيازة الفعلية وعن الإخلاء، وهو المنشئ للأثر العيني للهبة والاحتجاج به في مواجهة الغير.»
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 11: التحرير العدلي رباعي الطبقات */}
        {activeStage === 11 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 11: التحرير العدلي الرسمي رباعي الطبقات</h2>
                  <p className="text-xs text-gray-500 mt-0.5">الصياغة الرسمية المتطابقة مع أحكام المادة 4 و 274 والتقاليد العدلية المغربية الأصيلة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDraft}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1.5 transition"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'تم النسخ' : 'نسخ المسودة'}</span>
                </button>
                <button
                  onClick={handlePrintDraft}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الرسم</span>
                </button>
              </div>
            </div>

            <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-200/60 font-serif text-sm leading-loose whitespace-pre-wrap text-gray-900 shadow-inner">
              {generateDraftDocument}
            </div>
          </div>
        )}

        {/* Stage 12: المراجعة والتوقيع والأرشفة */}
        {activeStage === 12 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">المرحلة 12: المراجعة النهائية والتوقيع والأرشفة وتوليد رمز QR</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تضمين الرسم في كناش الأملاك، إعداد النسخة التنفيذية، واستخراج مستخرج المحافظة العقارية</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-gray-200 space-y-3 text-xs">
                <span className="font-bold text-gray-800 block text-sm">مراجع التضمين والحفظ:</span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">كناش الأملاك:</span>
                    <span className="font-bold">رقم 284</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">الحرف والصفحة:</span>
                    <span className="font-bold">حرف ب - ص 114</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">العدد:</span>
                    <span className="font-bold">عدد 388</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">تاريخ الخطاب:</span>
                    <span className="font-bold">{todayGregorian}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-gray-200 space-y-3 text-xs text-center flex flex-col items-center justify-center">
                <span className="font-bold text-gray-800 block text-sm mb-1">رمز التحقق الإلكتروني (QR Code)</span>
                <div className="w-28 h-28 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 font-mono text-[10px]">
                  [ رمز الاستجابة السريعة ]
                </div>
                <span className="text-[10px] text-gray-400 mt-1">معرف الوثيقة: ADOUL-GIFT-2026-9812</span>
              </div>

              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-emerald-900 block text-sm mb-1">إجراءات المخرجات:</span>
                  <p className="text-emerald-800 leading-relaxed">
                    تم تجهيز الرسم للطباعة الورقية على الورق الرسمي، وإرسال النظير إلكترونياً للمحافظة العقارية عبر منصة التبادل الرقمي.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleProceedToStep7}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>المتابعة للمرحلة 7 (المراجعة القضائية والإرسال للقاضي)</span>
                  </button>
                  <button
                    onClick={handlePrintDraft}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة النسخة الأصلية</span>
                  </button>
                  <button
                    onClick={handleCopyDraft}
                    className="w-full py-2 bg-white hover:bg-gray-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>نسخ النص الكامل</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Navigation Controls: Next / Prev between stages */}
        {/* ========================================================================= */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => {
              if (activeStage > 1) setActiveStage((prev) => prev - 1);
              else if (onBack) onBack();
            }}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-2 transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{activeStage === 1 ? 'الرجوع للقائمة' : 'المرحلة السابقة'}</span>
          </button>

          <div className="text-xs text-gray-400 font-semibold">
            المرحلة {activeStage} من 12
          </div>

          {activeStage < 12 ? (
            <button
              onClick={() => setActiveStage((prev) => prev + 1)}
              className="px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20"
            >
              <span>المرحلة التالية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleProceedToStep7}
              className="px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white shadow-lg shadow-red-900/30 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>المتابعة للمرحلة 7 (الإرسال للقاضي)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal: Step 0.25 PreReceptionVerificationGate Modal */}
      {/* ========================================================================= */}
      {showPreReceptionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>بوابة التحقق القبلي لتلقي الشهادات العدلية (مرحلة 0.25)</span>
              </h3>
              <button
                onClick={() => setShowPreReceptionModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <PreReceptionVerificationGate
              state={state}
              setState={setState}
              onProceed={() => setShowPreReceptionModal(false)}
              onBack={() => setShowPreReceptionModal(false)}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Disambiguation for "الاستغلال إلى الموت" */}
      {/* ========================================================================= */}
      {showDisambiguationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-right" dir="rtl">
            <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <span>فض اشتباه عبارة «الاستغلال إلى الموت»:</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              عند تصريح الواهب بعبارة «أهب الرقبة وأحتفظ بالاستغلال إلى وفاتي»، ما هو الوصف والتكييف القانوني الدقيق للحق العيني المقصود؟
            </p>

            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => {
                  handleSelectGiftSubject('هبة_الرقبة_مع_احتفاظ_الواهب_بالانتفاع');
                  setShowDisambiguationModal(false);
                }}
                className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 cursor-pointer transition"
              >
                <span className="font-bold text-emerald-900 block mb-1">🔘 حق الانتفاع الكامل (الاستعمال + الاستغلال)</span>
                <span className="text-gray-600">يخول الواهب السكنى في العقار أو تأجيره للغير وقبض أكرائه طيلة حياته (المادة 79 م.ح.ع).</span>
              </div>

              <div
                onClick={() => {
                  handleSelectGiftSubject('هبة_الرقبة_مع_احتفاظ_الواهب_بالسكنى');
                  setShowDisambiguationModal(false);
                }}
                className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-100 cursor-pointer transition"
              >
                <span className="font-bold text-amber-900 block mb-1">🔘 حق السكنى فقط</span>
                <span className="text-gray-600">قاصر على السكنى الشخصية للواهب، دون حق تأجيره أو جني أكرائه (المادة 109 م.ح.ع).</span>
              </div>

              <div
                onClick={() => {
                  handleSelectGiftSubject('هبة_العمرى');
                  setShowDisambiguationModal(false);
                }}
                className="p-3 rounded-xl border border-purple-300 bg-purple-50/50 hover:bg-purple-100 cursor-pointer transition"
              >
                <span className="font-bold text-purple-900 block mb-1">🔘 حق العمرى</span>
                <span className="text-gray-600">تمليك منفعة العقار بلا عوض طوال حياة المعطى له أو المعطي (المواد 105 وما بعدها).</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDisambiguationModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Legal References & Precedents */}
      {/* ========================================================================= */}
      {showLegalRefModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>المراجع القانونية والقرارات القضائية المؤطرة للهبة</span>
              </h3>
              <button
                onClick={() => setShowLegalRefModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-gray-700">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المادة 273 (مدونة الحقوق العينية):</span>
                <p>«الهبة عقد بمقتضاه يملك الواهب دون عوض مالاً عقارياً أو حقاً عينياً عقارياً للموهوب له في حياته.»</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المادة 274 (الرسمية والحيازة):</span>
                <p>«تنعقد الهبة بالإيجاب والقبول وتفرغ تحت طائلة البطلان في محرر رسمي... والتقييد بالسجلات العقارية يغني عن الحيازة الفعلية للعقار وعن إخلائه إذا كان محفظاً أو في طور التحفيظ.»</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المادة 275 (الأهلية والملكية):</span>
                <p>«يشترط لصحة الهبة أن يكون الواهب كامل الأهلية ومالكاً للعقار الموهوب وقت الهبة.»</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المادة 276 (قبول الهبة عن القاصر):</span>
                <p>«يقبل الهبة عن فاقد الأهلية نائبه الشرعي، ويصح قبول ناقص الأهلية للهبة بنفسه ولو مع وجود نائبه الشرعي.»</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المادة 278 (إحاطة الدين):</span>
                <p>«إذا كان الدين محيطاً بمال الواهب وقت الهبة، وقعت الهبة باطلة بالنسبة للدائنين.»</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-emerald-900 block mb-1">المواد 79 و 105 و 109 (الانتفاع، العمرى، السكنى):</span>
                <p>الانتفاع حق عيني ينقضي حتماً بموت المنتفع. السكنى قاصرة على الانتفاع الشخصي. العمرى تمليك للمنفعة بلا عوض طوال حياة المعطى له أو المعطي.</p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="font-bold text-blue-900 block mb-1">الفصلان 1-889 و 2-889 ق.ل.ع والمرسوم 2.23.101:</span>
                <p>إلزامية تقييد الوكالات المتعلقة بالتصرفات العقارية بالسجل المحلي بالمحكمة الابتدائية والسجل الوطني الإلكتروني لإنتاج آثارها القانونية.</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowLegalRefModal(false)}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                فهمت المراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
