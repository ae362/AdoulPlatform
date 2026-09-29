import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  Party,
  GiftRevocationMethod,
  GiftRevocationDonorCapacity,
  GiftRevocationDoneeRelation,
  GiftRevocationOriginalDeedType,
  GiftRevocationPropertyStatus,
  GiftRevocationDisposalStatus,
  GiftRevocationPerishingStatus,
  GiftRevocationPoaType,
  GiftRevocationDeed,
} from '../../../../types/feesAgentTypes';
import { createEmptyParty, convertGregorianToHijri } from '../../../../utils/feesAgentUtils';
import { PreReceptionVerificationGate } from '../../steps/PreReceptionVerificationGate';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Printer,
  Ban,
  Link2,
  Search,
  Sparkles,
  FileText,
  Building2,
  Scale,
  RotateCcw,
  BookOpen,
  DollarSign,
  Gavel,
  History,
  FileSpreadsheet,
} from 'lucide-react';

// تاريخ نفاذ مدونة الحقوق العينية (المادة 334: 6 أشهر بعد النشر بالجريدة الرسمية في 24 نونبر 2011)
const LAW_39_08_EFFECTIVE_DATE = '2012-05-24';

export const GiftRevocationWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack,
}) => {
  // المراحل السبعة للمسار: 1 (النوع والطرفان) إلى 7 (المراجعة والتحرير)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showLegalRefModal, setShowLegalRefModal] = useState<boolean>(false);
  const [showPreReceptionModal, setShowPreReceptionModal] = useState<boolean>(false);

  // تاريخ اليوم ومراجع التوثيق
  const todayGregorian = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // --------------------------------------------------------------------------
  // ① تحديد نوع الاعتصار (اتفاقي / قضائي)
  // --------------------------------------------------------------------------
  const [revocationMethod, setRevocationMethod] = useState<GiftRevocationMethod>(
    state.giftRevocationDeed?.revocationMethod || 'اتفاقي'
  );

  // --------------------------------------------------------------------------
  // ② هوية الواهب وصفته
  // --------------------------------------------------------------------------
  const [donor, setDonor] = useState({
    fullName: state.giftRevocationDeed?.donor?.fullName || state.sellers?.[0]?.name || '',
    fatherName: state.giftRevocationDeed?.donor?.fatherName || state.sellers?.[0]?.fatherName || '',
    motherName: state.giftRevocationDeed?.donor?.motherName || state.sellers?.[0]?.motherName || '',
    birthDate: state.giftRevocationDeed?.donor?.birthDate || state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.giftRevocationDeed?.donor?.birthPlace || state.sellers?.[0]?.placeOfBirth || '',
    cin: state.giftRevocationDeed?.donor?.cin || state.sellers?.[0]?.idNumber || '',
    profession: state.giftRevocationDeed?.donor?.profession || state.sellers?.[0]?.profession || '',
    address: state.giftRevocationDeed?.donor?.address || state.sellers?.[0]?.address || '',
    maritalStatus: state.giftRevocationDeed?.donor?.maritalStatus || 'متزوج',
    nationality: state.giftRevocationDeed?.donor?.nationality || 'مغربي',
    capacity: state.giftRevocationDeed?.donor?.capacity || 'كامل_الأهلية',
    capacityType: (state.giftRevocationDeed?.donor?.capacityType || 'أب') as GiftRevocationDonorCapacity,
    incapacityProofDetails: state.giftRevocationDeed?.donor?.incapacityProofDetails || '',
  });

  // --------------------------------------------------------------------------
  // ③ هوية الموهوب له وصلته بالواهب
  // --------------------------------------------------------------------------
  const [donee, setDonee] = useState({
    fullName: state.giftRevocationDeed?.donee?.fullName || state.buyers?.[0]?.name || '',
    fatherName: state.giftRevocationDeed?.donee?.fatherName || state.buyers?.[0]?.fatherName || '',
    motherName: state.giftRevocationDeed?.donee?.motherName || state.buyers?.[0]?.motherName || '',
    birthDate: state.giftRevocationDeed?.donee?.birthDate || state.buyers?.[0]?.dateOfBirth || '',
    birthPlace: state.giftRevocationDeed?.donee?.birthPlace || state.buyers?.[0]?.placeOfBirth || '',
    cin: state.giftRevocationDeed?.donee?.cin || state.buyers?.[0]?.idNumber || '',
    profession: state.giftRevocationDeed?.donee?.profession || state.buyers?.[0]?.profession || '',
    address: state.giftRevocationDeed?.donee?.address || state.buyers?.[0]?.address || '',
    maritalStatus: state.giftRevocationDeed?.donee?.maritalStatus || 'عازب',
    nationality: state.giftRevocationDeed?.donee?.nationality || 'مغربي',
    capacity: (state.giftRevocationDeed?.donee?.capacity || 'راشد') as 'راشد' | 'ناقص_الأهلية' | 'فاقد_الأهلية' | 'ممثل_بنائب_شرعي' | 'وكيل',
    relationshipToDonor: (state.giftRevocationDeed?.donee?.relationshipToDonor || 'ابن') as GiftRevocationDoneeRelation,
    parentageDocumentRef: state.giftRevocationDeed?.donee?.parentageDocumentRef || '',
    representativeName: state.giftRevocationDeed?.donee?.representativeName || '',
    representativeCin: state.giftRevocationDeed?.donee?.representativeCin || '',
    representativeCapacity: state.giftRevocationDeed?.donee?.representativeCapacity || 'نائب شرعي',
    representativeAppointmentOrder: state.giftRevocationDeed?.donee?.representativeAppointmentOrder || '',
  });

  // --------------------------------------------------------------------------
  // ⑤ مرجع وبيانات الهبة الأصلية
  // --------------------------------------------------------------------------
  const [originalGiftDeed, setOriginalGiftDeed] = useState({
    originalDeedType: (state.giftRevocationDeed?.originalGiftDeed?.originalDeedType || 'رسم_عدلي') as GiftRevocationOriginalDeedType,
    registryBookNumber: state.giftRevocationDeed?.originalGiftDeed?.registryBookNumber || '',
    registryLetter: state.giftRevocationDeed?.originalGiftDeed?.registryLetter || 'أ',
    registryPage: state.giftRevocationDeed?.originalGiftDeed?.registryPage || '',
    registryCount: state.giftRevocationDeed?.originalGiftDeed?.registryCount || '',
    registryDate: state.giftRevocationDeed?.originalGiftDeed?.registryDate || '',
    courtName: state.giftRevocationDeed?.originalGiftDeed?.courtName || 'المحكمة الابتدائية بالرباط',
    courtNotaryDept: state.giftRevocationDeed?.originalGiftDeed?.courtNotaryDept || 'قسم التوثيق وشؤون الأسرة',
    notary1Name: state.giftRevocationDeed?.originalGiftDeed?.notary1Name || '',
    notary2Name: state.giftRevocationDeed?.originalGiftDeed?.notary2Name || '',
    originalDeedDate: state.giftRevocationDeed?.originalGiftDeed?.originalDeedDate || '',
    originalDonorName: state.giftRevocationDeed?.originalGiftDeed?.originalDonorName || '',
    originalDoneeName: state.giftRevocationDeed?.originalGiftDeed?.originalDoneeName || '',
    originalPropertyDescription: state.giftRevocationDeed?.originalGiftDeed?.originalPropertyDescription || 'شقة سكنية كائنة بالعنوان المذكور',
    originalGiftedShare: state.giftRevocationDeed?.originalGiftDeed?.originalGiftedShare || 'كامل الملك (1/1)',
    originalGiftValue: state.giftRevocationDeed?.originalGiftDeed?.originalGiftValue || 500000,
    originalStipulatedConditions: state.giftRevocationDeed?.originalGiftDeed?.originalStipulatedConditions || '',
    customaryCreationDate: state.giftRevocationDeed?.originalGiftDeed?.customaryCreationDate || '',
  });

  // الفحص الزمني للعقد العرفي القديم
  const customaryAudit = useMemo(() => {
    if (originalGiftDeed.originalDeedType !== 'عقد_عرفي_قديم' || !originalGiftDeed.customaryCreationDate) {
      return { isApplicable: false, isPrior: false, message: '' };
    }
    const isPrior = originalGiftDeed.customaryCreationDate < LAW_39_08_EFFECTIVE_DATE;
    return {
      isApplicable: true,
      isPrior,
      message: isPrior
        ? 'مسار الحقوق السابقة: هذه الهبة أنشئت قبل نفاذ القانون 39.08 (24 ماي 2012)؛ لا تخضع آلياً لشكلية المادة 274 اللاحقة، ويجب التحقق من صحة إنشائها وفق القواعد الفقهية الراجحة والقضائية السارية وقتذاك (المادتان 1 و 9 من م.ح.ع).'
        : 'تنبيه قانوني قاطع: الهبة العقارية بعد 24 ماي 2012 يجب أن تكون في محرر رسمي تحت طائلة البطلان المطلق وفق المادة 274؛ لا يصح العقد العرفي لإثبات إنشاء هبة عقارية جديدة.',
    };
  }, [originalGiftDeed.originalDeedType, originalGiftDeed.customaryCreationDate]);

  // --------------------------------------------------------------------------
  // ⑧ شرط الاعتصار وشرط عدم الاعتصار
  // --------------------------------------------------------------------------
  const [revocationClauses, setRevocationClauses] = useState({
    hasRevocationClause: (state.giftRevocationDeed?.revocationClauses?.hasRevocationClause || 'نعم') as 'نعم' | 'لا' | 'غير_واضح',
    revocationClauseText: state.giftRevocationDeed?.revocationClauses?.revocationClauseText || 'وقد اشترط الواهب لنفسه صراحة حق اعتصار هذه الهبة متى شاء وقبل الموهوب له ذلك.',
    hasWaiverOfRevocationClause: (state.giftRevocationDeed?.revocationClauses?.hasWaiverOfRevocationClause || 'لا') as 'لا' | 'نعم' | 'غير_واضح',
    waiverClauseText: state.giftRevocationDeed?.revocationClauses?.waiverClauseText || '',
  });

  // --------------------------------------------------------------------------
  // ⑩ العقار الموهوب والتحملات
  // --------------------------------------------------------------------------
  const [propertyDetails, setPropertyDetails] = useState({
    propertyStatus: (state.giftRevocationDeed?.propertyDetails?.propertyStatus || 'محفظ') as GiftRevocationPropertyStatus,
    landRegistryName: state.giftRevocationDeed?.propertyDetails?.landRegistryName || 'المحافظة العقارية بالرباط حسان',
    titleNumber: state.giftRevocationDeed?.propertyDetails?.titleNumber || '',
    partNumber: state.giftRevocationDeed?.propertyDetails?.partNumber || '01',
    totalArea: state.giftRevocationDeed?.propertyDetails?.totalArea || '',
    propertyLocation: state.giftRevocationDeed?.propertyDetails?.propertyLocation || '',
    currentOwnershipDescription: state.giftRevocationDeed?.propertyDetails?.currentOwnershipDescription || 'مقيد باسم الموهوب له بناء على رسم الهبة',
    giftedShare: state.giftRevocationDeed?.propertyDetails?.giftedShare || 'كامل الملك',
    encumbrancesText: state.giftRevocationDeed?.propertyDetails?.encumbrancesText || 'خالٍ من أي تحمل عقاري لاحق',
    requisitionNumber: state.giftRevocationDeed?.propertyDetails?.requisitionNumber || '',
    requisitionOffice: state.giftRevocationDeed?.propertyDetails?.requisitionOffice || '',
    requisitionDate: state.giftRevocationDeed?.propertyDetails?.requisitionDate || '',
    requisitionShare: state.giftRevocationDeed?.propertyDetails?.requisitionShare || '',
    originalTitleRef: state.giftRevocationDeed?.propertyDetails?.originalTitleRef || '',
    possessionType: state.giftRevocationDeed?.propertyDetails?.possessionType || 'حيازة مستمرة',
    deedDate: state.giftRevocationDeed?.propertyDetails?.deedDate || '',
    boundariesDescription: state.giftRevocationDeed?.propertyDetails?.boundariesDescription || '',
    hasNewEncumbrances: state.giftRevocationDeed?.propertyDetails?.hasNewEncumbrances || false,
    chargesComparisonDayOfGiftVsDayOfRevocation: state.giftRevocationDeed?.propertyDetails?.chargesComparisonDayOfGiftVsDayOfRevocation || 'تطابق كامل ولا توجد تقييدات لاحقة تعوق الاعتصار',
  });

  // --------------------------------------------------------------------------
  // ⑫-⑳ فحص الموانع القانونية القطعية (المادتان 285 و 291)
  // --------------------------------------------------------------------------
  const [impediments, setImpediments] = useState({
    disposalStatus: (state.giftRevocationDeed?.impedimentsAudit?.disposalStatus || 'لا') as GiftRevocationDisposalStatus,
    disposedPartDescription: state.giftRevocationDeed?.impedimentsAudit?.disposedPartDescription || '',
    hasThirdPartyFinancialDealing: (state.giftRevocationDeed?.impedimentsAudit?.hasThirdPartyFinancialDealing || 'لا') as 'لا' | 'نعم_قرض' | 'نعم_رهن' | 'نعم_ضمان' | 'نعم_معاملة_أخرى',
    thirdPartyDealingDetails: state.giftRevocationDeed?.impedimentsAudit?.thirdPartyDealingDetails || '',
    hasPropertyModifications: state.giftRevocationDeed?.impedimentsAudit?.hasPropertyModifications || false,
    modificationsList: state.giftRevocationDeed?.impedimentsAudit?.modificationsList || [] as string[],
    hasSignificantValueIncrease: state.giftRevocationDeed?.impedimentsAudit?.hasSignificantValueIncrease || false,
    perishingStatus: (state.giftRevocationDeed?.impedimentsAudit?.perishingStatus || 'لا') as GiftRevocationPerishingStatus,
    remainingPortionDescription: state.giftRevocationDeed?.impedimentsAudit?.remainingPortionDescription || '',
    hasDreadIllness: state.giftRevocationDeed?.impedimentsAudit?.hasDreadIllness || false,
    affectedParty: (state.giftRevocationDeed?.impedimentsAudit?.affectedParty || 'الواهب') as 'الواهب' | 'الموهوب_له' | 'كلاهما',
    recoveryDate: state.giftRevocationDeed?.impedimentsAudit?.recoveryDate || '',
    donorAliveStatus: (state.giftRevocationDeed?.impedimentsAudit?.donorAliveStatus || 'حي') as 'حي' | 'متوفى',
    doneeAliveStatus: (state.giftRevocationDeed?.impedimentsAudit?.doneeAliveStatus || 'حي') as 'حي' | 'متوفى',
    hasDoneeMarriedAfterGift: state.giftRevocationDeed?.impedimentsAudit?.hasDoneeMarriedAfterGift || false,
    marriageDate: state.giftRevocationDeed?.impedimentsAudit?.marriageDate || '',
    marriageContractRef: state.giftRevocationDeed?.impedimentsAudit?.marriageContractRef || '',
    wasMarriageMotivatedByGift: state.giftRevocationDeed?.impedimentsAudit?.wasMarriageMotivatedByGift || false,
    isGiftBetweenSpouses: state.giftRevocationDeed?.impedimentsAudit?.isGiftBetweenSpouses || false,
    isMaritalBondStillExisting: state.giftRevocationDeed?.impedimentsAudit?.isMaritalBondStillExisting || false,
    originalContractNature: (state.giftRevocationDeed?.impedimentsAudit?.originalContractNature || 'هبة') as 'هبة' | 'صدقة',
  });

  // --------------------------------------------------------------------------
  // ㉑-㉕ الوكالة والسجلات العقارية
  // --------------------------------------------------------------------------
  const [poaDetails, setPoaDetails] = useState({
    hasAgent: (state.giftRevocationDeed?.poaDetails?.hasAgent || 'لا') as GiftRevocationPoaType,
    agentName: state.giftRevocationDeed?.poaDetails?.agentName || '',
    agentCin: state.giftRevocationDeed?.poaDetails?.agentCin || '',
    agentAddress: state.giftRevocationDeed?.poaDetails?.agentAddress || '',
    agentPhone: state.giftRevocationDeed?.poaDetails?.agentPhone || '',
    principalName: state.giftRevocationDeed?.poaDetails?.principalName || '',
    principalCin: state.giftRevocationDeed?.poaDetails?.principalCin || '',
    localRegistryCourt: state.giftRevocationDeed?.poaDetails?.localRegistryCourt || 'المحكمة الابتدائية بالرباط',
    localRegistryDate: state.giftRevocationDeed?.poaDetails?.localRegistryDate || '',
    chronologicalNumber: state.giftRevocationDeed?.poaDetails?.chronologicalNumber || '',
    analyticalNumber: state.giftRevocationDeed?.poaDetails?.analyticalNumber || '',
    compositeNumber: state.giftRevocationDeed?.poaDetails?.compositeNumber || '',
    hasLocalRegistryCertificate: state.giftRevocationDeed?.poaDetails?.hasLocalRegistryCertificate ?? true,
    isVerifiedInNationalRegistry: state.giftRevocationDeed?.poaDetails?.isVerifiedInNationalRegistry ?? true,
    nationalVerificationDate: state.giftRevocationDeed?.poaDetails?.nationalVerificationDate || '',
    nationalRegistrationNumber: state.giftRevocationDeed?.poaDetails?.nationalRegistrationNumber || '',
    nationalQueryResult: (state.giftRevocationDeed?.poaDetails?.nationalQueryResult || 'مقيدة_وصحيحة') as 'مقيدة_وصحيحة' | 'غير_مقيدة' | 'ملغاة' | 'معدلة' | '',
    judicialMandateCourt: state.giftRevocationDeed?.poaDetails?.judicialMandateCourt || '',
    judicialMandateFileNumber: state.giftRevocationDeed?.poaDetails?.judicialMandateFileNumber || '',
    judicialMandateYear: state.giftRevocationDeed?.poaDetails?.judicialMandateYear || '',
    judicialMandateDate: state.giftRevocationDeed?.poaDetails?.judicialMandateDate || '',
    judicialMandateOrderType: state.giftRevocationDeed?.poaDetails?.judicialMandateOrderType || '',
    judicialMandateSummary: state.giftRevocationDeed?.poaDetails?.judicialMandateSummary || '',
    judicialAuthorizedPerson: state.giftRevocationDeed?.poaDetails?.judicialAuthorizedPerson || '',
    scopeIncludesRevocation: state.giftRevocationDeed?.poaDetails?.scopeIncludesRevocation ?? true,
    scopeIncludesAgreement: state.giftRevocationDeed?.poaDetails?.scopeIncludesAgreement ?? true,
    scopeIncludesSigning: state.giftRevocationDeed?.poaDetails?.scopeIncludesSigning ?? true,
    scopeIncludesDisposal: state.giftRevocationDeed?.poaDetails?.scopeIncludesDisposal ?? true,
  });

  // --------------------------------------------------------------------------
  // ㉖ التسجيل والتنبر
  // --------------------------------------------------------------------------
  const [fiscalAndStamp, setFiscalAndStamp] = useState({
    fiscalStatus: (state.giftRevocationDeed?.fiscalAndStamp?.fiscalStatus || 'خاضع') as 'خاضع' | 'معفى' | 'معلوم_خاص' | 'تحديد_آلي',
    officeName: state.giftRevocationDeed?.fiscalAndStamp?.officeName || 'إدارة الضرائب والتسجيل بالرباط',
    registrationDate: state.giftRevocationDeed?.fiscalAndStamp?.registrationDate || '',
    registrationNumber: state.giftRevocationDeed?.fiscalAndStamp?.registrationNumber || '',
    receiptNumber: state.giftRevocationDeed?.fiscalAndStamp?.receiptNumber || '',
    dutyAmount: state.giftRevocationDeed?.fiscalAndStamp?.dutyAmount || 1000,
    dutyType: state.giftRevocationDeed?.fiscalAndStamp?.dutyType || 'واجب ثابت / نسبي وفق قانون المالية الجاري',
    pageCount: state.giftRevocationDeed?.fiscalAndStamp?.pageCount || 2,
    copyCount: state.giftRevocationDeed?.fiscalAndStamp?.copyCount || 2,
    stampDutyPaid: state.giftRevocationDeed?.fiscalAndStamp?.stampDutyPaid || 40,
    stampReceiptNumber: state.giftRevocationDeed?.fiscalAndStamp?.stampReceiptNumber || '',
    stampPaymentDate: state.giftRevocationDeed?.fiscalAndStamp?.stampPaymentDate || '',
  });

  // --------------------------------------------------------------------------
  // ㉗ ملف المحافظة العقارية
  // --------------------------------------------------------------------------
  const [landRegistryDossier, setLandRegistryDossier] = useState({
    originalRegistrationDate: state.giftRevocationDeed?.landRegistryDossier?.originalRegistrationDate || '',
    originalDepositNumber: state.giftRevocationDeed?.landRegistryDossier?.originalDepositNumber || '',
    revocationDepositDate: state.giftRevocationDeed?.landRegistryDossier?.revocationDepositDate || '',
    revocationDepositNumber: state.giftRevocationDeed?.landRegistryDossier?.revocationDepositNumber || '',
    resultantStatus: state.giftRevocationDeed?.landRegistryDossier?.resultantStatus || 'تشطيب على تقييد الهبة وإعادة تقييد الملك باسم الواهب',
  });

  // --------------------------------------------------------------------------
  // ㉘-㉙ المسار القضائي / الاتفاقي
  // --------------------------------------------------------------------------
  const [judicialRuling, setJudicialRuling] = useState({
    courtName: state.giftRevocationDeed?.judicialRulingDetails?.courtName || 'المحكمة الابتدائية بالرباط',
    fileNumber: state.giftRevocationDeed?.judicialRulingDetails?.fileNumber || '',
    caseYear: state.giftRevocationDeed?.judicialRulingDetails?.caseYear || new Date().getFullYear().toString(),
    rulingNumber: state.giftRevocationDeed?.judicialRulingDetails?.rulingNumber || '',
    rulingDate: state.giftRevocationDeed?.judicialRulingDetails?.rulingDate || '',
    litigationDegree: state.giftRevocationDeed?.judicialRulingDetails?.litigationDegree || 'ابتدائي انتهائي / استئنافي',
    isFinal: state.giftRevocationDeed?.judicialRulingDetails?.isFinal ?? true,
    finalAcquisitionDate: state.giftRevocationDeed?.judicialRulingDetails?.finalAcquisitionDate || '',
    rulingVerdict: state.giftRevocationDeed?.judicialRulingDetails?.rulingVerdict || 'قضت المحكمة علنياً ونهائياً بفسخ عقد الهبة المبرم بين الطرفين وإرجاع العقار الموهوب لذمة الواهب.',
    confirmsGiftRescission: state.giftRevocationDeed?.judicialRulingDetails?.confirmsGiftRescission ?? true,
  });

  // --------------------------------------------------------------------------
  // ㉚ الثمار والنفقات
  // --------------------------------------------------------------------------
  const [fruitsAndExpenses, setFruitsAndExpenses] = useState({
    fruitsCutoffDate: state.giftRevocationDeed?.fruitsAndExpenses?.fruitsCutoffDate || todayGregorian,
    necessaryExpensesAmount: state.giftRevocationDeed?.fruitsAndExpenses?.necessaryExpensesAmount || 0,
    usefulExpensesAmount: state.giftRevocationDeed?.fruitsAndExpenses?.usefulExpensesAmount || 0,
    ornamentalExpensesAction: (state.giftRevocationDeed?.fruitsAndExpenses?.ornamentalExpensesAction || 'لا_توجد') as 'إزالتها_دون_ضرر' | 'دفع_قيمتها_مستحقة_القلع' | 'لا_توجد',
    revocationExpensesBearer: 'الواهب_قانونا_المادة_289' as const,
  });

  // --------------------------------------------------------------------------
  // الفحص القانوني التلقائي الشامل للموانع (المادتان 285 و 291)
  // --------------------------------------------------------------------------
  const blockerAudit = useMemo(() => {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. فحص الصدقة (المادة 291)
    if (impediments.originalContractNature === 'صدقة') {
      blockers.push('العقد الأصلي صدقة وليس هبة؛ والاعتصار في الصدقة غير جائز مطلقاً طبقاً للمادة 291 من مدونة الحقوق العينية.');
    }

    // 2. فحص الزوجية (المادة 285/1)
    if (impediments.isGiftBetweenSpouses && impediments.isMaritalBondStillExisting) {
      blockers.push('الهبة واقعة بين زوجين وما زالت رابطة الزوجية قائمة؛ استمرار الزوجية مانع للاعتصار طبقاً للمادة 285/1 من مدونة الحقوق العينية.');
    }

    // 3. فحص الوفاة (المادة 285/2)
    if (impediments.donorAliveStatus === 'متوفى' || impediments.doneeAliveStatus === 'متوفى') {
      blockers.push('وفاة أحد طرفي الهبة (الواهب أو الموهوب له) قبل الاعتصار مانع قطعي طبقاً للمادة 285/2 من مدونة الحقوق العينية.');
    }

    // 4. فحص المرض المخوف (المادة 285/3)
    if (impediments.hasDreadIllness && !impediments.recoveryDate) {
      blockers.push('إصابة الواهب أو الموهوب له بمرض مخوف يعتبر مانعاً للاعتصار إلى حين ثبوت زوال المرض طبقاً للمادة 285/3 من مدونة الحقوق العينية.');
    }

    // 5. فحص زواج الموهوب له بعد الهبة من أجلها (المادة 285/4)
    if (impediments.hasDoneeMarriedAfterGift && impediments.wasMarriageMotivatedByGift) {
      blockers.push('زواج الموهوب له بعد إبرام الهبة واعتبار الهبة من أسباب وبواعث الزواج يمنع الاعتصار طبقاً للمادة 285/4 من مدونة الحقوق العينية.');
    }

    // 6. فحص التفويت (المادة 285/5)
    if (impediments.disposalStatus === 'نعم_كله') {
      blockers.push('الموهوب له فوت كامل العقار الموهوب؛ التفويت التام مانع من الاعتصار طبقاً للمادة 285/5 من مدونة الحقوق العينية.');
    } else if (impediments.disposalStatus === 'نعم_جزء_منه') {
      warnings.push('تم تفويت جزء من العقار؛ ينحصر الاعتصار قانوناً في الجزء المتبقي الصالح طبقاً للمادة 285/5 من مدونة الحقوق العينية.');
    }

    // 7. فحص تعامل الغير (المادة 285/6)
    if (impediments.hasThirdPartyFinancialDealing !== 'لا') {
      blockers.push('تعامل الغير مالياً مع الموهوب له اعتماداً على الهبة (رهن/قرض/ضمان) يمنع الاعتصار حفاظاً على حقوق الغير حسن النية طبقاً للمادة 285/6.');
    }

    // 8. فحص التغييرات وزيادة القيمة (المادة 285/7)
    if (impediments.hasPropertyModifications && impediments.hasSignificantValueIncrease) {
      blockers.push('إحداث الموهوب له لتغييرات في العقار نتجت عنها زيادة مهمة في قيمته يمنع الاعتصار طبقاً للمادة 285/7 من مدونة الحقوق العينية.');
    }

    // 9. فحص الهلاك (المادة 285/8)
    if (impediments.perishingStatus === 'هلك_كليا') {
      blockers.push('هلاك محل الهبة كلياً مانع للاعتصار لانعدام المحل طبقاً للمادة 285/8 من مدونة الحقوق العينية.');
    } else if (impediments.perishingStatus === 'هلك_جزئيا') {
      warnings.push('هلاك جزء من محل الهبة؛ ينحصر الاعتصار في الجزء المتبقي الصالح طبقاً للمادة 285/8 من مدونة الحقوق العينية.');
    }

    // 10. فحص شرط عدم الاعتصار
    if (revocationClauses.hasWaiverOfRevocationClause === 'نعم') {
      blockers.push('مراجعة شرط عقدي مؤثر: يوجد في أصل الهبة شرط يتعلق بإسقاط حق الاعتصار، مما يعوق التحرير.');
    }

    // 11. فحص شرط الاعتصار في عقد الهبة لغير الأبوين (المادة 284)
    if (donor.capacityType === 'عاجز_عن_الإنفاق' && revocationClauses.hasRevocationClause !== 'نعم') {
      blockers.push('المادة 284 تشترط أن يكون الواهب قد أشهد بالاعتصار ونُص عليه في عقد الهبة وقبله الموهوب له؛ لا يحق الاعتصار للعاجز عن الإنفاق دون اشتراط صريح وقبول مسبق.');
    }

    // 12. فحص العقد العرفي بعد 24 ماي 2012
    if (customaryAudit.isApplicable && !customaryAudit.isPrior) {
      blockers.push(customaryAudit.message);
    }

    // 13. فحص المسار القضائي
    if (revocationMethod === 'قضائي') {
      if (!judicialRuling.isFinal) {
        blockers.push('الحكم القضائي غير نهائي؛ لا يمكن اعتماد الاعتصار القضائي دون ثبوت نهائية الحكم واكتسابه قوة الشيء المقضي به طبقاً للمادة 286.');
      }
      if (!judicialRuling.confirmsGiftRescission) {
        blockers.push('منطوق الحكم لم يقضِ صراحة بفسخ عقد الهبة لفائدة الواهب.');
      }
    }

    // 14. فحص الوكالة بالسجلين
    if (poaDetails.hasAgent !== 'لا') {
      if (!poaDetails.hasLocalRegistryCertificate) {
        warnings.push('يلزم التحقق من شهادة التقييد بالسجل المحلي للوكالات المتعلقة بالحقوق العينية (الفصل 1-889 ق.ل.ع).');
      }
      if (!poaDetails.isVerifiedInNationalRegistry) {
        warnings.push('يلزم التحقق من السجل الوطني الإلكتروني للوكالات (الفصل 2-889 ق.ل.ع) لضمان سريان الوكالة.');
      }
    }

    const hasBlockers = blockers.length > 0;
    const hasWarnings = warnings.length > 0;
    const legalStatus: 'قابل_للتحرير' | 'مراجعة' | 'مانع' = hasBlockers
      ? 'مانع'
      : hasWarnings
      ? 'مراجعة'
      : 'قابل_للتحرير';

    return {
      hasBlockers,
      hasWarnings,
      blockers,
      warnings,
      legalStatus,
    };
  }, [
    impediments,
    revocationClauses,
    donor.capacityType,
    customaryAudit,
    revocationMethod,
    judicialRuling,
    poaDetails,
  ]);

  // --------------------------------------------------------------------------
  // محرك الصياغة العدلية المغربية رباعية الطبقات
  // --------------------------------------------------------------------------
  const generatedRasmText = useMemo(() => {
    const dName = donor.fullName || 'الواهب';
    const dCin = donor.cin ? `(ب.ت.و: ${donor.cin})` : '';
    const dCapText =
      donor.capacityType === 'أب'
        ? 'بصفته والداً للموهوب له'
        : donor.capacityType === 'أم'
        ? 'بصفتها والدة للموهوب له'
        : 'بصفته واهباً أصبح عاجزاً عن الإنفاق على نفسه وعلى من تلزمه نفقته';

    const dnName = donee.fullName || 'الموهوب له';
    const dnCin = donee.cin ? `(ب.ت.و: ${donee.cin})` : '';
    const propDesc = propertyDetails.propertyStatus === 'محفظ'
      ? `العقار ذي الرسم العقاري عدد ${propertyDetails.titleNumber || '...'}/${propertyDetails.partNumber || '01'}، الكائن بـ ${propertyDetails.propertyLocation || '...'}`
      : propertyDetails.propertyStatus === 'في_طور_التحفيظ'
      ? `العقار موضوع مطلب التحفيظ عدد ${propertyDetails.requisitionNumber || '...'}`
      : `العقار غير المحفظ المسمى «${propertyDetails.propertyLocation || '...'}»`;

    const methodHeader = revocationMethod === 'اتفاقي'
      ? 'رسم اعتصار هبة اتفاقي (فسخ عقد هبة بالتراضي ورد الملك إلى الواهب)'
      : 'رسم اعتصار هبة قضائي (توثيق تنفيذ حكم قضائي بفسخ عقد الهبة ورد الملك)';

    const refGiftText = originalGiftDeed.originalDeedType === 'رسم_عدلي'
      ? `بمقتضى رسم الهبة المضمن بكناش الأملاك بالمحكمة الابتدائية بـ ${originalGiftDeed.courtName} تحت عدد ${originalGiftDeed.registryCount || '...'}، صحيفة ${originalGiftDeed.registryPage || '...'}، كناش عدد ${originalGiftDeed.registryBookNumber || '...'}، وتاريخ ${originalGiftDeed.originalDeedDate || '...'}`
      : `بمقتضى عقد الهبة المؤرخ في ${originalGiftDeed.originalDeedDate || '...'}`;

    const agreementClause = revocationMethod === 'اتفاقي'
      ? `فقد حضر الواهب والموهوب له المذكوران بكامل أهليتهما المعتبرة شرعاً وقانوناً، وصرح الواهب بأنه يعتصر الهبة المذكورة ويرد الملك الموهوب إلى ملكيته وذمته المالية التامة، وصرح الموهوب له المقيد في هويته أعلاه بأنه يحضر مجلس هذا العقد ويصادق ويوافق موافقة صريحة تامة لا رجوع فيها على اعتصار الهبة المذكورة وفسخ عقدها ورد العقار الموهوب إلى الواهب السيد ${dName} طوعاً واختياراً منه، طبقاً لمقتضيات المادتين 286 و287 من مدونة الحقوق العينية.`
      : `وحيث إنه قد صدر حكم قضائي قطعي حائز لقوة الشيء المقضي به عن ${judicialRuling.courtName} بتاريخ ${judicialRuling.rulingDate || '...'} في الملف عدد ${judicialRuling.fileNumber || '...'} تحت رقم ${judicialRuling.rulingNumber || '...'} قضى بفسخ عقد الهبة المذكور لفائدة الواهب ورد الملكية إليه، وبناءً على طلب الواهب تم توثيق تنفيذ هذا المقتضى القضائي في هذا الرسم العدلي طبقاً للمادة 286 من مدونة الحقوق العينية.`;

    const fruitsClause = `وقد اتفق الطرفان على أن الثمار والغلة الناتجة عن العقار إلى غاية تاريخ هذا الإشهاد تعود للموهوب له، ${fruitsAndExpenses.necessaryExpensesAmount > 0 ? `مع أداء الواهب للموهوب له مبلغ قدره ${fruitsAndExpenses.necessaryExpensesAmount} درهم تعويضاً عن النفقات الضرورية والنافعة المؤداة على العقار طبقاً للمادة 287 من مدونة الحقوق العينية` : 'دون أن يبقى لأي منهما قبل الآخر أي طلب متعلق بالنفقات أو الثمار المستهلكة'}، وأن مصاريف هذا الرسم وإجراءات تقييده العقاري تقع على عاتق الواهب طبقاً للمادة 289 من مدونة الحقوق العينية.`;

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.

المملكة المغربية
وزارة العدل
دائرة محكمة الاستئناف بـ: ...
المحكمة الابتدائية بـ: ...
مكتب العدلين: ... و ...

${methodHeader}
بتاريخ: ${todayHijri} هـ موافق ${todayGregorian} م.

الطبقة الأولى: تعريف طرفي الاعتصار وأهليتهما
أمام العدلين المنتصبين للإشهاد الموقعين أسفله:
حضر السيد: ${dName}، المغاربي الجنسية، الحامل للبطاقة الوطنية للتعريف رقم ${dCin}، الساكن بـ ${donor.address || '...'}، ${dCapText}، وهو في كامل أهليته المعتبرة.
وحضر معه السيد: ${dnName}، الحامل لرقم ب.ت.و ${dnCin}، الساكن بـ ${donee.address || '...'}، بصفته موهوباً له و${donee.relationshipToDonor} للواهب، وهو في كامل قواه العقلية وأهليته القانونية.

الطبقة الثانية: بيان أصل الهبة ومحلها وشرط الاعتصار
وبعد استفسارهما، شهدا وأكدا معاً أن الواهب كان قد وهب للموهوب له ${propDesc}، ${refGiftText}.
${revocationClauses.hasRevocationClause === 'نعم' ? `وأن عقد الهبة تضمن التنصيص الصريح على حق الواهب في الاعتصار وقبله الموهوب له وفقاً للمادة 284 من مدونة الحقوق العينية.` : ''}
وبعد التحقق والاطلاع على الوضعية العقارية للملك وخلوه من موانع الاعتصار المنصوص عليها في المادة 285 من مدونة الحقوق العينية؛

الطبقة الثالثة: صيغة الاعتصار والاتفاق والآثار العينية
${agreementClause}
وبموجب هذا الإشهاد، ينفسخ عقد الهبة المذكور أعلاه بقوة القانون، ويرجع العقار الموهوب بحصصه ومشتملاته ومنافعه إلى ملكية وذمة الواهب السيد ${dName} كما كان قبل إبرام الهبة، مع الإذن للمحافظ على الأملاك العقارية بالتشطيب على تقييد الهبة وإعادة تقييد الملكية الكاملة باسم الواهب.

الطبقة الرابعة: تصفية النفقات ومستند التضمين والأداء
${fruitsClause}
وعلى ما ذكر، أشهد الطرفان على أنفسهما بعد قراءة فصول هذا العقد عليهما ومطابقته لإرادتهما الصريحة، وأذنا بتحريره وتوجيهه لقاضي التوثيق للتأشير عليه والتضمين في سجلات الأملاك وفق القانون.
(توقيع الواهب)                       (توقيع الموهوب له)                       (توقيع العدلين)`;
  }, [
    donor,
    donee,
    propertyDetails,
    revocationMethod,
    originalGiftDeed,
    judicialRuling,
    revocationClauses,
    fruitsAndExpenses,
    todayGregorian,
    todayHijri,
  ]);

  // --------------------------------------------------------------------------
  // حفظ ومزامنة الحالة مع FeesAgentState
  // --------------------------------------------------------------------------
  useEffect(() => {
    const deedData: GiftRevocationDeed = {
      revocationMethod,
      donor,
      donee,
      originalGiftDeed,
      revocationClauses,
      propertyDetails,
      impedimentsAudit: impediments,
      poaDetails,
      fiscalAndStamp,
      landRegistryDossier,
      judicialRulingDetails: judicialRuling,
      fruitsAndExpenses,
      deedText: generatedRasmText,
    };

    const donorParty: Party = {
      ...createEmptyParty(),
      id: 'party-donor-revocation',
      name: donor.fullName,
      idNumber: donor.cin,
      nationality: (donor.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as '' | 'مغربي' | 'اجنبي',
      address: donor.address,
      partyRole: 'الواهب (المعتصر)',
    };

    const doneeParty: Party = {
      ...createEmptyParty(),
      id: 'party-donee-revocation',
      name: donee.fullName,
      idNumber: donee.cin,
      nationality: (donee.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as '' | 'مغربي' | 'اجنبي',
      address: donee.address,
      partyRole: 'الموهوب له (المعتصر ضده)',
    };

    setState(prev => ({
      ...prev,
      giftRevocationDeed: deedData,
      sellers: [donorParty],
      buyers: [doneeParty],
      property: {
        ...prev.property,
        titleNumber: propertyDetails.titleNumber,
        type: propertyDetails.propertyStatus === 'محفظ' ? 'محفظ' : propertyDetails.propertyStatus === 'في_طور_التحفيظ' ? 'في طور التحفيظ' : 'غير محفظ',
        location: propertyDetails.propertyLocation,
      },
      draft: generatedRasmText,
    }));
  }, [
    revocationMethod,
    donor,
    donee,
    originalGiftDeed,
    revocationClauses,
    propertyDetails,
    impediments,
    poaDetails,
    fiscalAndStamp,
    landRegistryDossier,
    judicialRuling,
    fruitsAndExpenses,
    generatedRasmText,
    setState,
  ]);

  // نسخ نص الرسم
  const handleCopyDeed = async () => {
    try {
      await navigator.clipboard.writeText(generatedRasmText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch {
      // fallback
    }
  };

  // طباعة الرسم
  const handlePrint = () => {
    window.print();
  };

  // --------------------------------------------------------------------------
  // واجهة المستخدم الكاملة
  // --------------------------------------------------------------------------
  return (
    <div className="w-full space-y-5" dir="rtl">
      {/* ==================================================================== */}
      {/* البطاقة العلوية الثابتة والذكية */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* شريط المسار الدائم */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300">سلسلة الأثر العيني:</span>
            <span>📜 الهبة الأصلية</span>
            <span className="text-slate-400">←</span>
            <span className="text-amber-400 font-black">🔄 الاعتصار</span>
            <span className="text-slate-400">←</span>
            <span className="text-emerald-400 font-black">🏠 رجوع الملك إلى الواهب</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLegalRefModal(true)}
            className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-white transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>المرجع القانوني</span>
          </button>
        </div>

        {/* بطاقة ملخص العملية والنتيجة التوثيقية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">نوع العملية</span>
            <strong className="text-slate-900 font-black flex items-center gap-1">
              <span>🔄 اعتصار هبة</span>
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">الواهب (المعتصر)</span>
            <strong className="text-slate-900 truncate block font-black">
              {donor.fullName || '...'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">الموهوب له</span>
            <strong className="text-slate-900 truncate block font-black">
              {donee.fullName || '...'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">موضوع الهبة</span>
            <strong className="text-slate-900 truncate block font-black">
              {propertyDetails.propertyStatus === 'محفظ' && propertyDetails.titleNumber
                ? `رسم ${propertyDetails.titleNumber}`
                : originalGiftDeed.originalPropertyDescription || 'عقار'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">نوع العقار</span>
            <strong className="text-slate-900 font-black">
              {propertyDetails.propertyStatus === 'محفظ'
                ? 'محفظ 🏛️'
                : propertyDetails.propertyStatus === 'في_طور_التحفيظ'
                ? 'طور التحفيظ 📑'
                : 'غير محفظ 📜'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold">طريق الاعتصار</span>
            <strong className="text-slate-900 font-black">
              {revocationMethod === 'اتفاقي' ? '🤝 اتفاقي' : '⚖️ قضائي'}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl border flex flex-col justify-center items-start shadow-xs">
            <span className="text-[10px] text-slate-500 block font-bold">النتيجة القانونية</span>
            {blockerAudit.legalStatus === 'مانع' ? (
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>🔴 مانع</span>
              </span>
            ) : blockerAudit.legalStatus === 'مراجعة' ? (
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>🟠 مراجعة</span>
              </span>
            ) : (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>🟢 قابل للتحرير</span>
              </span>
            )}
          </div>
        </div>

        {/* زر ومسار التحقق القبلي من التلقي (المرحلة 0.25) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700">
              بوابة التحقق القبلي واختصاص التلقي التوثيقي (المرحلة 0.25):
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreReceptionModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="مراجعة شروط التلقي والاختصاص المكاني (المرحلة 0.25)"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>فحص شروط التلقي (المرحلة 0.25)</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* شريط التنقل بين المراحل الإجرائية السبعة */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-xs">
        {[
          { num: 1, title: '① النوع والطرفان', desc: 'الاتفاقي/القضائي والهوية' },
          { num: 2, title: '② الهبة الأصلية', desc: 'دفتر الأملاك والشروط' },
          { num: 3, title: '③ العقار الموهوب', desc: 'التحفيظ والتحملات' },
          { num: 4, title: '④ فحص الموانع', desc: 'المادة 285 والمادة 291' },
          { num: 5, title: '⑤ الوكالة والسجلات', desc: 'السجل المحلي والوطني' },
          { num: 6, title: '⑥ الجباية والمحافظة', desc: 'التسجيل والثمار والمصاريف' },
          { num: 7, title: '⑦ التحرير والاعتماد', desc: 'سلسلة الملك والوثيقة' },
        ].map(st => {
          const isActive = activeStage === st.num;
          return (
            <button
              key={st.num}
              type="button"
              onClick={() => setActiveStage(st.num)}
              className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-black shadow-xs ring-1 ring-amber-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] block">{st.title}</span>
              <span className="text-[9px] text-slate-500 truncate block mt-0.5">{st.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* المرحلة 1: ① تحديد نوع الاعتصار والطرفان والأهلية */}
      {/* ==================================================================== */}
      {activeStage === 1 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>① تحديد نوع الاعتصار وهوية وأهلية الطرفين (المادتان 283 و 286):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              المادة 286: يتم الاعتصار إما بحضور الموهوب له وموافقته، أو بحكم قضائي يقضي بفسخ عقد الهبة لفائدة الواهب.
            </p>
          </div>

          {/* نوع الاعتصار */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-800">
              كيف سيتم الاعتصار في هذا الملف؟ *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                onClick={() => setRevocationMethod('اتفاقي')}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  revocationMethod === 'اتفاقي'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="revMethod"
                  checked={revocationMethod === 'اتفاقي'}
                  onChange={() => setRevocationMethod('اتفاقي')}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <strong className="block text-slate-900 font-black">🤝 اعتصار اتفاقي رضائي</strong>
                  <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                    حضور الواهب والموهوب له معاً أمام العدلين ومصادقتهما وتوافق إرادتهما على رد الملك الموهوب.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setRevocationMethod('قضائي')}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  revocationMethod === 'قضائي'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="revMethod"
                  checked={revocationMethod === 'قضائي'}
                  onChange={() => setRevocationMethod('قضائي')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <strong className="block text-slate-900 font-black">⚖️ اعتصار قضائي (بحكم نهائي)</strong>
                  <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                    وجود حكم قضائي قطعي حائز لقوة الشيء المقضي به يقضي بفسخ عقد الهبة لفائدة الواهب.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* بطاقة الواهب وصفته */}
          <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <span>👤 هوية الواهب (المعتصر) وصفته الشرعية (المادة 283):</span>
              </h4>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                حصر حق الاعتصار
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  صفة الواهب المعتمد عليها في طلب الاعتصار (المادة 283) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'أب', label: '🔘 أب (اعتصار الأب لما وهبه لولده)' },
                    { id: 'أم', label: '🔘 أم (اعتصار الأم لما وهبته لولدها)' },
                    { id: 'عاجز_عن_الإنفاق', label: '🔘 شخص أصبح عاجزاً عن الإنفاق على نفسه أو من تلزمه نفقته' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDonor(prev => ({ ...prev, capacityType: opt.id as any }))}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer text-xs font-bold ${
                        donor.capacityType === opt.id
                          ? 'border-amber-600 bg-amber-100/70 text-amber-950 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {donor.capacityType === 'عاجز_عن_الإنفاق' && (
                <div className="sm:col-span-3 p-3 bg-white border border-amber-200 rounded-xl space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800">
                    بيان سند أو واقعة العجز عن الإنفاق ومبرراتها المصرح بها:
                  </label>
                  <input
                    type="text"
                    value={donor.incapacityProofDetails}
                    onChange={(e) => setDonor(prev => ({ ...prev, incapacityProofDetails: e.target.value }))}
                    placeholder="مثال: شهادة عدم العمل، وضعية صحية، مستند رسمي مثبت للعجز..."
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <span className="text-[10px] text-amber-800 block">
                    ملاحظة: يشترط لاعتصار العاجز عن الإنفاق أن يكون قد اشترط الاعتصار وقبله الموهوب له في عقد الهبة وفق المادة 284.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل للواهب *</label>
                <input
                  type="text"
                  value={donor.fullName}
                  onChange={(e) => setDonor(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="الاسم العائلي والشخصي"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={donor.fatherName}
                  onChange={(e) => setDonor(prev => ({ ...prev, fatherName: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={donor.motherName}
                  onChange={(e) => setDonor(prev => ({ ...prev, motherName: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={donor.cin}
                  onChange={(e) => setDonor(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                  placeholder="مثال: A123456"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ ومكان الازدياد</label>
                <input
                  type="text"
                  value={donor.birthDate}
                  onChange={(e) => setDonor(prev => ({ ...prev, birthDate: e.target.value }))}
                  placeholder="تاريخ الازدياد ومكانه"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة ومحل الإقامة</label>
                <input
                  type="text"
                  value={donor.address}
                  onChange={(e) => setDonor(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="العنوان الكامل للواهب"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* بطاقة الموهوب له وصلته بالواهب */}
          <div className="p-4 rounded-2xl bg-cyan-50/30 border border-cyan-200 space-y-4">
            <h4 className="text-xs font-black text-cyan-950 flex items-center gap-1.5">
              <span>👤 هوية الموهوب له وصلته بالواهب والأهلية (المادتان 276 و 283):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">صلة الموهوب له بالواهب *</label>
                <select
                  value={donee.relationshipToDonor}
                  onChange={(e) => setDonee(prev => ({ ...prev, relationshipToDonor: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ابن">👨‍👦 ابن</option>
                  <option value="بنت">👧 بنت</option>
                  <option value="زوج_أو_زوجة">💍 زوج / زوجة</option>
                  <option value="غير_ذلك">👤 غير ذلك</option>
                </select>
              </div>

              {(donee.relationshipToDonor === 'ابن' || donee.relationshipToDonor === 'بنت') && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    صلة الأبوة أو الأمومة ثابتة بالوثيقة رقم: *
                  </label>
                  <input
                    type="text"
                    value={donee.parentageDocumentRef}
                    onChange={(e) => setDonee(prev => ({ ...prev, parentageDocumentRef: e.target.value }))}
                    placeholder="مثال: كناش الحالة المدنية عدد ... / رسم ولادة رقم ..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-cyan-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل للموهوب له *</label>
                <input
                  type="text"
                  value={donee.fullName}
                  onChange={(e) => setDonee(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="الاسم العائلي والشخصي"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم ب.ت.و للموهوب له *</label>
                <input
                  type="text"
                  value={donee.cin}
                  onChange={(e) => setDonee(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                  placeholder="مثال: BE654321"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">أهلية الموهوب له (المادة 276) *</label>
                <select
                  value={donee.capacity}
                  onChange={(e) => setDonee(prev => ({ ...prev, capacity: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                >
                  <option value="راشد">راشد كامل الأهلية</option>
                  <option value="ناقص_الأهلية">ناقص الأهلية (قاصر مميز)</option>
                  <option value="فاقد_الأهلية">فاقد الأهلية (المادة 276)</option>
                  <option value="ممثل_بنائب_شرعي">ممثل بنائب شرعي</option>
                  <option value="وكيل">وكيل بمقتضى وكالة</option>
                </select>
              </div>

              {(donee.capacity === 'فاقد_الأهلية' || donee.capacity === 'ممثل_بنائب_شرعي' || donee.capacity === 'ناقص_الأهلية') && (
                <div className="sm:col-span-3 p-3 bg-white border border-cyan-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم النائب الشرعي / المعين قضائياً</label>
                    <input
                      type="text"
                      value={donee.representativeName}
                      onChange={(e) => setDonee(prev => ({ ...prev, representativeName: e.target.value }))}
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم ب.ت.و للنائب</label>
                    <input
                      type="text"
                      value={donee.representativeCin}
                      onChange={(e) => setDonee(prev => ({ ...prev, representativeCin: e.target.value.toUpperCase() }))}
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">سند التعيين أو الإذن القضائي</label>
                    <input
                      type="text"
                      value={donee.representativeAppointmentOrder}
                      onChange={(e) => setDonee(prev => ({ ...prev, representativeAppointmentOrder: e.target.value }))}
                      placeholder="رقم الأمر وتاريخه..."
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                العودة لاختيار الرسم
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى مرجع الهبة الأصلية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 2: ⑤ مرجع وبيانات الهبة الأصلية وشروطها */}
      {/* ==================================================================== */}
      {activeStage === 2 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>② 🧾 مرجع وبيانات الهبة الأصلية وشروط الاعتصار (المادتان 274 و 284):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              توثيق أصل الملك بالهبة بدقة تامة والتثبت من شروط الاعتصار في العقد الأصلي.
            </p>
          </div>

          {/* نوع المرجع */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              أصل الملكية عن طريق الهبة — ما هو نوع سند الهبة الأصلي؟ *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {[
                { id: 'رسم_عدلي', label: 'رسم عدلي مضمن' },
                { id: 'عقد_موثق', label: 'عقد موثق (نوتر)' },
                { id: 'محرر_رسمي_آخر', label: 'محرر رسمي آخر' },
                { id: 'عقد_عرفي_قديم', label: 'عقد عرفي قديم' },
                { id: 'حكم_قضائي', label: 'حكم قضائي' },
                { id: 'غير_ذلك', label: 'سند آخر' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOriginalGiftDeed(prev => ({ ...prev, originalDeedType: opt.id as any }))}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                    originalGiftDeed.originalDeedType === opt.id
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* حقول الرسم العدلي الأصلي المضمن */}
          {originalGiftDeed.originalDeedType === 'رسم_عدلي' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-black text-slate-900 block">
                مضمن بدفتر الأملاك بالرسم الأصلي للهبة:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الكناش</label>
                  <input
                    type="text"
                    value={originalGiftDeed.registryBookNumber}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, registryBookNumber: e.target.value }))}
                    placeholder="رقم"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الحرف</label>
                  <input
                    type="text"
                    value={originalGiftDeed.registryLetter}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, registryLetter: e.target.value }))}
                    placeholder="أ"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الصفحة</label>
                  <input
                    type="text"
                    value={originalGiftDeed.registryPage}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, registryPage: e.target.value }))}
                    placeholder="صفحة"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">العدد</label>
                  <input
                    type="text"
                    value={originalGiftDeed.registryCount}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, registryCount: e.target.value }))}
                    placeholder="عدد"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التضمين</label>
                  <input
                    type="date"
                    value={originalGiftDeed.registryDate}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, registryDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة الابتدائية</label>
                  <input
                    type="text"
                    value={originalGiftDeed.courtName}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, courtName: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">قسم التوثيق</label>
                  <input
                    type="text"
                    value={originalGiftDeed.courtNotaryDept}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, courtNotaryDept: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">العدلان المتلقيان لأصل الهبة</label>
                  <input
                    type="text"
                    value={originalGiftDeed.notary1Name}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, notary1Name: e.target.value }))}
                    placeholder="الأستاذ فلان والأستاذ فلان"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ⑥ الفحص الزمني للعقد العرفي القديم (24 ماي 2012) */}
          {originalGiftDeed.originalDeedType === 'عقد_عرفي_قديم' && (
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-300 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700" />
                <span className="font-black text-amber-950">
                  🕰️ هبة عرفية سابقة لمدونة الحقوق العينية (الفحص التاريخي الدقيق):
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ إنشاء الهبة العرفية *</label>
                  <input
                    type="date"
                    value={originalGiftDeed.customaryCreationDate}
                    onChange={(e) => setOriginalGiftDeed(prev => ({ ...prev, customaryCreationDate: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-[11px] text-slate-700 leading-relaxed">
                  تاريخ نفاذ القانون 39.08 هو <strong>24 ماي 2012</strong> وفق المادة 334.
                </div>
              </div>

              {customaryAudit.isApplicable && (
                <div className={`p-3 rounded-xl border leading-relaxed text-xs ${
                  customaryAudit.isPrior
                    ? 'bg-amber-100/50 border-amber-300 text-amber-950 font-bold'
                    : 'bg-rose-50 border-rose-300 text-rose-950 font-black'
                }`}>
                  {customaryAudit.message}
                </div>
              )}
            </div>
          )}

          {/* ⑧ و ⑨ فحص شرط الاعتصار وشرط عدم الاعتصار */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* شرط الاعتصار */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>⑧ شرط الاعتصار في عقد الهبة (المادة 284):</span>
                </span>
                <span className="text-[10px] text-slate-500">نقطة فحص أساسية</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                المادة 284 تشترط أن يكون الواهب قد أشهد بالاعتصار ونُص عليه في عقد الهبة وقبله الموهوب له.
              </p>
              <div className="flex gap-2">
                {[
                  { id: 'نعم', label: '🔘 نعم، يوجد التنصيص' },
                  { id: 'لا', label: '🔘 لا يوجد' },
                  { id: 'غير_واضح', label: '🔘 النص غير واضح' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRevocationClauses(prev => ({ ...prev, hasRevocationClause: opt.id as any }))}
                    className={`flex-1 p-2 rounded-xl border text-center transition cursor-pointer font-bold ${
                      revocationClauses.hasRevocationClause === opt.id
                        ? 'border-amber-600 bg-amber-100 text-amber-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={revocationClauses.revocationClauseText}
                onChange={(e) => setRevocationClauses(prev => ({ ...prev, revocationClauseText: e.target.value }))}
                placeholder="نص شرط الاعتصار كما ورد في الرسم الأصلي..."
                className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>

            {/* شرط عدم الاعتصار */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>⑨ هل يوجد شرط إسقاط أو عدم الاعتصار؟</span>
                </span>
                <span className="text-[10px] text-rose-600 font-bold">شرط مانع</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                إذا تنازل الواهب عن الاعتصار في عقد الهبة فلا يجوز له الرجوع بعد ذلك.
              </p>
              <div className="flex gap-2">
                {[
                  { id: 'لا', label: '🔘 لا يوجد شرط مانع' },
                  { id: 'نعم', label: '🔘 نعم، يوجد شرط إسقاط' },
                  { id: 'غير_واضح', label: '🔘 غير واضح' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRevocationClauses(prev => ({ ...prev, hasWaiverOfRevocationClause: opt.id as any }))}
                    className={`flex-1 p-2 rounded-xl border text-center transition cursor-pointer font-bold ${
                      revocationClauses.hasWaiverOfRevocationClause === opt.id
                        ? opt.id === 'نعم'
                          ? 'border-rose-600 bg-rose-100 text-rose-950 shadow-xs'
                          : 'border-emerald-600 bg-emerald-100 text-emerald-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {revocationClauses.hasWaiverOfRevocationClause === 'نعم' && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-[11px] font-bold leading-relaxed">
                  🔴 تنبيه قطعي: يوجد في أصل الهبة شرط يتعلق بعدم الاعتصار أو إسقاطه؛ لا يسمح النظام بالتحرير قبل حسم هذا المانع.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: النوع والطرفان
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى بيانات العقار والتحملات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 3: ⑩ العقار الموهوب والتحملات */}
      {/* ==================================================================== */}
      {activeStage === 3 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>③ 🏡 بيانات العقار الموهوب وفحص التقييدات والتحملات (المادة 274):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              المادة 274: التقييد بالسجلات العقارية يغني عن الحيازة الفعلية في العقار المحفظ أو الذي في طور التحفيظ.
            </p>
          </div>

          {/* نوع العقار */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              الوضعية العقارية للملك الموهوب محل الاعتصار *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { id: 'محفظ', label: '🏛️ عقار محفظ (رسم عقاري تابت)' },
                { id: 'في_طور_التحفيظ', label: '📑 في طور التحفيظ (مطلب تحفيظ)' },
                { id: 'غير_محفظ', label: '📜 عقار غير محفظ (ملك / حيازة)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPropertyDetails(prev => ({ ...prev, propertyStatus: opt.id as any }))}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer font-bold ${
                    propertyDetails.propertyStatus === opt.id
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* الحقول بحسب وضعية العقار */}
          {propertyDetails.propertyStatus === 'محفظ' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-black text-slate-900 block">
                بيانات المحافظة العقارية والرسم العقاري:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المحافظة العقارية</label>
                  <input
                    type="text"
                    value={propertyDetails.landRegistryName}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, landRegistryName: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الرسم العقاري *</label>
                  <input
                    type="text"
                    value={propertyDetails.titleNumber}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, titleNumber: e.target.value }))}
                    placeholder="مثال: 12345"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الرمز / الجزء</label>
                  <input
                    type="text"
                    value={propertyDetails.partNumber}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, partNumber: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-center"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">موقع العقار ومشتملاته</label>
                  <input
                    type="text"
                    value={propertyDetails.propertyLocation}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, propertyLocation: e.target.value }))}
                    placeholder="العنوان الكامل للملك الموهوب"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المساحة الإجمالية</label>
                  <input
                    type="text"
                    value={propertyDetails.totalArea}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, totalArea: e.target.value }))}
                    placeholder="مثال: 120 م²"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الحصة الموهوبة</label>
                  <input
                    type="text"
                    value={propertyDetails.giftedShare}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, giftedShare: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {propertyDetails.propertyStatus === 'في_طور_التحفيظ' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-black text-slate-900 block">
                بيانات مطلب التحفيظ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم مطلب التحفيظ *</label>
                  <input
                    type="text"
                    value={propertyDetails.requisitionNumber}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, requisitionNumber: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المحافظة العقارية المختصة</label>
                  <input
                    type="text"
                    value={propertyDetails.requisitionOffice}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, requisitionOffice: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ إيداع المطلب</label>
                  <input
                    type="date"
                    value={propertyDetails.requisitionDate}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, requisitionDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {propertyDetails.propertyStatus === 'غير_محفظ' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-black text-slate-900 block">
                بيانات الملك غير المحفظ وأصل الحيازة:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مرجع أصل التملك</label>
                  <input
                    type="text"
                    value={propertyDetails.originalTitleRef}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, originalTitleRef: e.target.value }))}
                    placeholder="رسم ملكية أو استمرار عدد..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">طبيعة الحيازة</label>
                  <input
                    type="text"
                    value={propertyDetails.possessionType}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, possessionType: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">حدود العقار الأربعة</label>
                  <input
                    type="text"
                    value={propertyDetails.boundariesDescription}
                    onChange={(e) => setPropertyDetails(prev => ({ ...prev, boundariesDescription: e.target.value }))}
                    placeholder="شمالاً، جنوباً، شرقاً، غرباً..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ⑪ مقارنة وضعية العقار يوم الهبة بوضعيته يوم الاعتصار */}
          <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-3 text-xs">
            <span className="font-black text-amber-950 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-700" />
              <span>⑪ فحص التقييدات والتحملات (شهادة الملكية الحديثة ومقارنة الوضعية):</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={propertyDetails.hasNewEncumbrances}
                  onChange={(e) => setPropertyDetails(prev => ({ ...prev, hasNewEncumbrances: e.target.checked }))}
                  className="rounded text-amber-600 w-4 h-4"
                />
                <span>توجد تقييدات لاحقة أو حقوق عينية سجلت على العقار بعد تاريخ الهبة</span>
              </label>

              <input
                type="text"
                value={propertyDetails.chargesComparisonDayOfGiftVsDayOfRevocation}
                onChange={(e) => setPropertyDetails(prev => ({ ...prev, chargesComparisonDayOfGiftVsDayOfRevocation: e.target.value }))}
                placeholder="بيان التقييدات والرهون إن وجدت..."
                className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الهبة والشروط
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى فحص الموانع القانونية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 4: ⑫-⑳ الفحص الصارم للموانع القانونية (المادتان 285 و 291) */}
      {/* ==================================================================== */}
      {activeStage === 4 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>④ 🛡️ الفحص الصارم لموانع الاعتصار (المادة 285 والمادة 291):</span>
              </h3>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-900 text-white">
                8 موانع قانونية
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تنص المادة 285 من مدونة الحقوق العينية على الموانع القطعية التي تسقط أو تقيد حق الاعتصار.
            </p>
          </div>

          {/* ⑳ فحص هبة أم صدقة؟ */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2 text-xs">
            <span className="font-black text-rose-950 block">
              ⑳ فحص «الهبة أم الصدقة؟» (المادة 291):
            </span>
            <div className="flex gap-3">
              <label
                onClick={() => setImpediments(prev => ({ ...prev, originalContractNature: 'هبة' }))}
                className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition ${
                  impediments.originalContractNature === 'هبة'
                    ? 'border-emerald-600 bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span>🎁 هبة (عقد تبرع قابل للاعتصار بشروطه)</span>
              </label>

              <label
                onClick={() => setImpediments(prev => ({ ...prev, originalContractNature: 'صدقة' }))}
                className={`flex-1 p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition ${
                  impediments.originalContractNature === 'صدقة'
                    ? 'border-rose-600 bg-rose-100 text-rose-950 shadow-xs ring-1 ring-rose-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span>🤲 صدقة (لوجه الله تعالى)</span>
              </label>
            </div>
            {impediments.originalContractNature === 'صدقة' && (
              <p className="text-rose-900 font-bold text-[11px] leading-relaxed pt-1">
                🔴 المادة 291: لا يجوز الاعتصار في الصدقة مطلقاً. لا يفتح مسار الاعتصار في الصدقة.
              </p>
            )}
          </div>

          {/* شبكة موانع المادة 285 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 1. الزوجية (المادة 285/1) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">1️⃣ فحص الزوجية (المادة 285/1)</span>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={impediments.isGiftBetweenSpouses}
                  onChange={(e) => setImpediments(prev => ({ ...prev, isGiftBetweenSpouses: e.target.checked }))}
                  className="rounded text-amber-600"
                />
                <span>الهبة واقعة بين زوجين</span>
              </label>
              {impediments.isGiftBetweenSpouses && (
                <div className="p-2 bg-amber-50 rounded-lg space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-[11px]">
                    <input
                      type="checkbox"
                      checked={impediments.isMaritalBondStillExisting}
                      onChange={(e) => setImpediments(prev => ({ ...prev, isMaritalBondStillExisting: e.target.checked }))}
                      className="rounded text-rose-600"
                    />
                    <span>علاقة الزوجية ما زالت قائمة حتى تاريخ الاعتصار</span>
                  </label>
                  {impediments.isMaritalBondStillExisting && (
                    <span className="text-[10px] text-rose-700 font-black block">
                      🔴 مانع: استمرار الزوجية مانع للاعتصار طبقاً للمادة 285/1.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 2. الوفاة (المادة 285/2) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">2️⃣ فحص الوفاة (المادة 285/2)</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-600 block mb-1">حالة الواهب:</span>
                  <select
                    value={impediments.donorAliveStatus}
                    onChange={(e) => setImpediments(prev => ({ ...prev, donorAliveStatus: e.target.value as any }))}
                    className="w-full p-1.5 border rounded-lg"
                  >
                    <option value="حي">🟢 على قيد الحياة</option>
                    <option value="متوفى">🔴 متوفى</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-600 block mb-1">حالة الموهوب له:</span>
                  <select
                    value={impediments.doneeAliveStatus}
                    onChange={(e) => setImpediments(prev => ({ ...prev, doneeAliveStatus: e.target.value as any }))}
                    className="w-full p-1.5 border rounded-lg"
                  >
                    <option value="حي">🟢 على قيد الحياة</option>
                    <option value="متوفى">🔴 متوفى</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. المرض المخوف (المادة 285/3) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">3️⃣ فحص المرض المخوف (المادة 285/3)</span>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={impediments.hasDreadIllness}
                  onChange={(e) => setImpediments(prev => ({ ...prev, hasDreadIllness: e.target.checked }))}
                  className="rounded text-rose-600"
                />
                <span>أحد الطرفين مصاب بمرض مخوف حالياً</span>
              </label>
              {impediments.hasDreadIllness && (
                <div className="p-2 bg-rose-50 rounded-lg space-y-1">
                  <span className="text-[10px] text-rose-700 font-bold block">
                    المرض مانع ما دام قائماً؛ ويزول المانع بشفائه.
                  </span>
                  <input
                    type="date"
                    value={impediments.recoveryDate}
                    onChange={(e) => setImpediments(prev => ({ ...prev, recoveryDate: e.target.value }))}
                    placeholder="تاريخ زوال المرض إن زال..."
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* 4. الزواج بعد الهبة (المادة 285/4) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">4️⃣ زواج الموهوب له بعد الهبة (المادة 285/4)</span>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={impediments.hasDoneeMarriedAfterGift}
                  onChange={(e) => setImpediments(prev => ({ ...prev, hasDoneeMarriedAfterGift: e.target.checked }))}
                  className="rounded text-amber-600"
                />
                <span>تزوج الموهوب له بعد إبرام الهبة</span>
              </label>
              {impediments.hasDoneeMarriedAfterGift && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-800 text-[11px] block mt-1">
                  <input
                    type="checkbox"
                    checked={impediments.wasMarriageMotivatedByGift}
                    onChange={(e) => setImpediments(prev => ({ ...prev, wasMarriageMotivatedByGift: e.target.checked }))}
                    className="rounded text-rose-600"
                  />
                  <span>الهبة روعيت في الزواج وكانت سبباً أو باعثاً عليه</span>
                </label>
              )}
            </div>

            {/* 5. التفويت (المادة 285/5) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">5️⃣ تفويت الموهوب له في العقار (المادة 285/5)</span>
              <select
                value={impediments.disposalStatus}
                onChange={(e) => setImpediments(prev => ({ ...prev, disposalStatus: e.target.value as any }))}
                className="w-full p-2 border rounded-lg font-bold"
              >
                <option value="لا">لا، لم يفوت في الملك</option>
                <option value="نعم_جزء_منه">فوت جزءاً منه (الاعتصار ينحصر في الباقي)</option>
                <option value="نعم_كله">فوت كامل الملك (مانع قطعي للاعتصار)</option>
              </select>
            </div>

            {/* 6. تعامل الغير المالي (المادة 285/6) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">6️⃣ تعامل الغير مع الموهوب له (المادة 285/6)</span>
              <select
                value={impediments.hasThirdPartyFinancialDealing}
                onChange={(e) => setImpediments(prev => ({ ...prev, hasThirdPartyFinancialDealing: e.target.value as any }))}
                className="w-full p-2 border rounded-lg font-bold"
              >
                <option value="لا">لا يوجد تعامل مالي مع الغير اعتماداً على الهبة</option>
                <option value="نعم_قرض">نعم، قرض مالي</option>
                <option value="نعم_رهن">نعم، تقييد رهن عقاري</option>
                <option value="نعم_ضمان">نعم، تقديم العقار كضمان</option>
                <option value="نعم_معاملة_أخرى">نعم، معاملة مالية أخرى</option>
              </select>
            </div>

            {/* 7. التغييرات وزيادة القيمة (المادة 285/7) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">7️⃣ التغييرات وزيادة القيمة (المادة 285/7)</span>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={impediments.hasPropertyModifications}
                  onChange={(e) => setImpediments(prev => ({ ...prev, hasPropertyModifications: e.target.checked }))}
                  className="rounded text-amber-600"
                />
                <span>أحدث الموهوب له تغييرات (بناء/تعلية/إضافة/تحسين)</span>
              </label>
              {impediments.hasPropertyModifications && (
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-800 text-[11px] block mt-1">
                  <input
                    type="checkbox"
                    checked={impediments.hasSignificantValueIncrease}
                    onChange={(e) => setImpediments(prev => ({ ...prev, hasSignificantValueIncrease: e.target.checked }))}
                    className="rounded text-rose-600"
                  />
                  <span>نتجت عن هذه التغييرات زيادة مهمة في قيمة الملك الموهوب</span>
                </label>
              )}
            </div>

            {/* 8. الهلاك (المادة 285/8) */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">8️⃣ هلاك محل الهبة (المادة 285/8)</span>
              <select
                value={impediments.perishingStatus}
                onChange={(e) => setImpediments(prev => ({ ...prev, perishingStatus: e.target.value as any }))}
                className="w-full p-2 border rounded-lg font-bold"
              >
                <option value="لا">لا، لم يهلك العقار</option>
                <option value="هلك_جزئيا">هلك جزئياً (الاعتصار في الجزء الباقي)</option>
                <option value="هلك_كليا">هلك كلياً (مانع قطعي لانعدام المحل)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: العقار والتحملات
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الوكالة والسجلات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 5: ㉑-㉕ الوكالة والسجلات العقارية والوطنية */}
      {/* ==================================================================== */}
      {activeStage === 5 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>⑤ 👤 الوكالة والتحقق من السجل المحلي والسجل الوطني الإلكتروني (الفصلان 1-889 و2-889 ق.ل.ع):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              المرسوم 2.23.101 وقرار وزير العدل 381.25: لا تنتج الوكالة العقارية أثرها إلا بعد تقييدها بالسجل المحلي والتحقق منها إلكترونياً.
            </p>
          </div>

          {/* نوع الحضور والوكالة */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              هل يحضر أحد الأطراف بمقتضى وكالة أو سند نيابة؟ *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'لا', label: '🔘 لا، حضور شخصي للطرفين' },
                { id: 'نعم_اختيارية', label: '🔘 وكالة اختيارية خاصة' },
                { id: 'نعم_قضائية', label: '🔘 سند نيابة قضائية / إذن' },
                { id: 'وكالة_بالخارج', label: '🔘 وكالة محررة بالخارج (قنصلية)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPoaDetails(prev => ({ ...prev, hasAgent: opt.id as any }))}
                  className={`p-2.5 rounded-xl border text-right transition cursor-pointer font-bold ${
                    poaDetails.hasAgent === opt.id
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* بيانات الوكالة وسجلاتها إن وجدت */}
          {poaDetails.hasAgent !== 'لا' && (
            <div className="space-y-4">
              {/* بيانات الوكيل */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الوكيل الكامل</label>
                  <input
                    type="text"
                    value={poaDetails.agentName}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, agentName: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم ب.ت.و للوكيل</label>
                  <input
                    type="text"
                    value={poaDetails.agentCin}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, agentCin: e.target.value.toUpperCase() }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الموكل</label>
                  <input
                    type="text"
                    value={poaDetails.principalName}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, principalName: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* ㉓ السجل المحلي للوكالات المتعلقة بالحقوق العينية (الفصل 1-889) */}
              <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-950 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                    <span>📕 ㉓ السجل المحلي للوكالات بالمحكمة الابتدائية (الفصل 1-889 ق.ل.ع):</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-800">إلزامي لصحة التصرف العيني</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة الابتدائية</label>
                    <input
                      type="text"
                      value={poaDetails.localRegistryCourt}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, localRegistryCourt: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الرقم الزمني</label>
                    <input
                      type="text"
                      value={poaDetails.chronologicalNumber}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, chronologicalNumber: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الرقم التحليلي</label>
                    <input
                      type="text"
                      value={poaDetails.analyticalNumber}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, analyticalNumber: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الرقم المركب</label>
                    <input
                      type="text"
                      value={poaDetails.compositeNumber}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, compositeNumber: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-center"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    checked={poaDetails.hasLocalRegistryCertificate}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, hasLocalRegistryCertificate: e.target.checked }))}
                    className="rounded text-amber-600 w-4 h-4"
                  />
                  <span>تم الإدلاء بشهادة التقييد بالسجل المحلي للوكالات المتعلقة بالحقوق العينية</span>
                </label>
              </div>

              {/* ㉔ السجل الوطني الإلكتروني للوكالات (الفصل 2-889) */}
              <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-cyan-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-700" />
                    <span>🌐 ㉔ السجل الوطني الإلكتروني للوكالات (المعمم وطنياً 2026):</span>
                  </span>
                  <span className="text-[11px] font-bold text-cyan-800">الفصل 2-889 ق.ل.ع</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التحقق الإلكتروني</label>
                    <input
                      type="date"
                      value={poaDetails.nationalVerificationDate || todayGregorian}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, nationalVerificationDate: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم التقييد الوطني</label>
                    <input
                      type="text"
                      value={poaDetails.nationalRegistrationNumber}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, nationalRegistrationNumber: e.target.value }))}
                      placeholder="NAT-POA-2026-..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نتيجة المطابقة والبحث</label>
                    <select
                      value={poaDetails.nationalQueryResult}
                      onChange={(e) => setPoaDetails(prev => ({ ...prev, nationalQueryResult: e.target.value as any }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="مقيدة_وصحيحة">🟢 مقيدة وسارية المفعول</option>
                      <option value="غير_مقيدة">🔴 غير مقيدة بالسجل الوطني</option>
                      <option value="ملغاة">🔴 ملغاة بمقتضى عزل أو إلغاء</option>
                      <option value="معدلة">🟠 مقيدة مع تعديل في الصلاحيات</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ㉕ سند النيابة القضائية إن كانت قضائية */}
              {poaDetails.hasAgent === 'نعم_قضائية' && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3 text-xs">
                  <span className="font-black text-indigo-950 flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-indigo-700" />
                    <span>⚖️ ㉕ سند النيابة القضائية وفحص حدود الصلاحية:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الملف والسنة</label>
                      <input
                        type="text"
                        value={poaDetails.judicialMandateFileNumber}
                        onChange={(e) => setPoaDetails(prev => ({ ...prev, judicialMandateFileNumber: e.target.value }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الأمر أو الحكم</label>
                      <input
                        type="date"
                        value={poaDetails.judicialMandateDate}
                        onChange={(e) => setPoaDetails(prev => ({ ...prev, judicialMandateDate: e.target.value }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">منطوق الأمر / حدود الإذن</label>
                      <input
                        type="text"
                        value={poaDetails.judicialMandateSummary}
                        onChange={(e) => setPoaDetails(prev => ({ ...prev, judicialMandateSummary: e.target.value }))}
                        placeholder="الإذن بالاعتصار وتوقيع الرسم العدلي..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: فحص الموانع
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الجباية والمحافظة العقارية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 6: ㉖-㉚ الجباية والمحافظة العقارية والثمار والنفقات */}
      {/* ==================================================================== */}
      {activeStage === 6 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>⑥ 💰 الوضعية الجبائية والمحافظة العقارية وحساب الثمار والنفقات (المادتان 287 و289):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ربط جبائي ديناميكي طبقاً لقانون المالية الجاري، وتسوية استرداد النفقات ومصاريف الاعتصار.
            </p>
          </div>

          {/* ㉖ التسجيل والتنبر */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <span className="font-black text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>㉖ الوضعية الجبائية والتسجيل والتنبر:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الخضوع للتسجيل</label>
                <select
                  value={fiscalAndStamp.fiscalStatus}
                  onChange={(e) => setFiscalAndStamp(prev => ({ ...prev, fiscalStatus: e.target.value as any }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                >
                  <option value="خاضع">خاضع للتسجيل</option>
                  <option value="معفى">معفى بنص قانوني</option>
                  <option value="معلوم_خاص">معلوم خاص محدد</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">مبلغ واجبات التسجيل (درهم)</label>
                <input
                  type="number"
                  value={fiscalAndStamp.dutyAmount}
                  onChange={(e) => setFiscalAndStamp(prev => ({ ...prev, dutyAmount: Number(e.target.value) }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم وصل التسجيل</label>
                <input
                  type="text"
                  value={fiscalAndStamp.receiptNumber}
                  onChange={(e) => setFiscalAndStamp(prev => ({ ...prev, receiptNumber: e.target.value }))}
                  placeholder="رقم الوصل"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">واجب التنبر (درهم)</label>
                <input
                  type="number"
                  value={fiscalAndStamp.stampDutyPaid}
                  onChange={(e) => setFiscalAndStamp(prev => ({ ...prev, stampDutyPaid: Number(e.target.value) }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold font-mono"
                />
              </div>
            </div>
          </div>

          {/* ㉗ ملف المحافظة العقارية */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <span className="font-black text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-700" />
              <span>🏛️ ㉗ إجراءات وملف المحافظة العقارية لتقييد الاعتصار:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ إيداع الاعتصار بالمحافظة</label>
                <input
                  type="date"
                  value={landRegistryDossier.revocationDepositDate}
                  onChange={(e) => setLandRegistryDossier(prev => ({ ...prev, revocationDepositDate: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الإيداع (كنش التحفيظ)</label>
                <input
                  type="text"
                  value={landRegistryDossier.revocationDepositNumber}
                  onChange={(e) => setLandRegistryDossier(prev => ({ ...prev, revocationDepositNumber: e.target.value }))}
                  placeholder="رقم الإيداع..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الأثر العيني والتقييد الناتج</label>
                <input
                  type="text"
                  value={landRegistryDossier.resultantStatus}
                  onChange={(e) => setLandRegistryDossier(prev => ({ ...prev, resultantStatus: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* ㉘ إذا كان الاعتصار قضائياً */}
          {revocationMethod === 'قضائي' && (
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-3 text-xs">
              <span className="font-black text-blue-950 flex items-center gap-1.5">
                <Gavel className="w-4 h-4 text-blue-700" />
                <span>⚖️ ㉘ مراجع الحكم القضائي الحائز لقوة الشيء المقضي به (المادة 286):</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الحكم وتاريخه</label>
                  <input
                    type="text"
                    value={judicialRuling.rulingNumber}
                    onChange={(e) => setJudicialRuling(prev => ({ ...prev, rulingNumber: e.target.value }))}
                    placeholder="رقم الحكم وتاريخ صدوره"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ اكتساب الصبغة النهائية</label>
                  <input
                    type="date"
                    value={judicialRuling.finalAcquisitionDate}
                    onChange={(e) => setJudicialRuling(prev => ({ ...prev, finalAcquisitionDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">هل الحكم نهائي قطعي؟</label>
                  <select
                    value={judicialRuling.isFinal ? 'نعم' : 'لا'}
                    onChange={(e) => setJudicialRuling(prev => ({ ...prev, isFinal: e.target.value === 'نعم' }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="نعم">🟢 نعم، نهائي قطعي حائز لقوة الشيء المقضي به</option>
                    <option value="لا">🔴 لا، ما زال قابلاً للطعن</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ㉚ الثمار والنفقات (المادتان 287 و 289) */}
          <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-3 text-xs">
            <span className="font-black text-amber-950 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-700" />
              <span>㉚ الثمار والنفقات ومصاريف الاعتصار (المادتان 287 و 289):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  تاريخ حسم الثمار (المادة 287)
                </label>
                <input
                  type="date"
                  value={fruitsAndExpenses.fruitsCutoffDate}
                  onChange={(e) => setFruitsAndExpenses(prev => ({ ...prev, fruitsCutoffDate: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  الثمار للموهوب له إلى تاريخ الاتفاق أو تاريخ الحكم النهائي.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مبلغ النفقات الضرورية والنافعة المستردة (درهم)
                </label>
                <input
                  type="number"
                  value={fruitsAndExpenses.necessaryExpensesAmount}
                  onChange={(e) => setFruitsAndExpenses(prev => ({ ...prev, necessaryExpensesAmount: Number(e.target.value) }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="p-2.5 bg-white border border-amber-200 rounded-xl text-[11px] text-slate-700 leading-relaxed">
                <strong>المادة 289:</strong> مصاريف الاعتصار ورد الملك تقع على عاتق <strong>الواهب قانوناً</strong>.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الوكالة والسجلات
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى التحرير والصياغة وسلسلة الملك</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* المرحلة 7: ㉛ سلسلة الملك واللوحة التوثيقية والصياغة العدلية */}
      {/* ==================================================================== */}
      {activeStage === 7 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>⑦ 🔗 سلسلة الملك واللوحة التوثيقية والصياغة العدلية المتقنة (المرحلة النهائية):</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              اكتمال فحص الأركان والآثار العينية والصياغة العدلية رباعية الطبقات وفق الضوابط الشرعية والقانونية.
            </p>
          </div>

          {/* ㉛ بطاقة سلسلة الملك التفاعلية 🔗 */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              <span>㉛ بطاقة «سلسلة الملك» التفاعلية 🔗:</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
              {[
                { step: '1', title: 'أصل ملك الواهب', desc: 'قبل الهبة' },
                { step: '2', title: 'رسم الهبة', desc: originalGiftDeed.originalDeedType },
                { step: '3', title: 'دفتر الأملاك', desc: `عدد ${originalGiftDeed.registryCount || '...'}` },
                { step: '4', title: 'تقييد المحافظة', desc: propertyDetails.titleNumber || 'عقار' },
                { step: '5', title: 'رسم الاعتصار', desc: revocationMethod },
                { step: '6', title: 'التقييد الناتج', desc: 'تشطيب وفسخ' },
                { step: '7', title: 'رجوع الملك', desc: 'إلى الواهب' },
              ].map(item => (
                <div key={item.step} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                  <span className="text-[10px] text-amber-400 font-bold block">{item.step}</span>
                  <strong className="text-[11px] block mt-0.5">{item.title}</strong>
                  <span className="text-[9px] text-slate-400 block truncate">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ㉞ شاشة مانع التحرير إن وجد */}
          {blockerAudit.hasBlockers && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 text-xs text-rose-950">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                <strong className="font-black text-sm">
                  ㉞ تعذر اعتماد اعتصار الهبة في وضعيتها الحالية لوجود موانع قانونية:
                </strong>
              </div>
              <ul className="list-disc pr-6 space-y-1 text-[11px] font-bold">
                {blockerAudit.blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ㉝ لوحة الفحص الشامل الموحد قبل التحرير */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>㉝ لوحة الفحص والتحقق التوثيقي النهائي قبل التحرير والتوقيع:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                donor.fullName && donor.cin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية الواهب والمقتضى</span>
                {donor.fullName && donor.cin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                donee.fullName && donee.cin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية الموهوب له والصلة</span>
                {donee.fullName && donee.cin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                originalGiftDeed.originalDeedType ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>مرجع الهبة الأصلية</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                !blockerAudit.hasBlockers ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>خلو الموانع (المادة 285)</span>
                {!blockerAudit.hasBlockers ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>
            </div>
          </div>

          {/* محرك الصياغة العدلية رباعي الطبقات */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>نص المحرر العدلي المولد آلياً (الصياغة العدلية رباعية الطبقات):</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDeed}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedSuccess ? 'تم النسخ بنجاح!' : 'نسخ نص الرسم'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>طباعة الرسم</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={18}
                value={generatedRasmText}
                className="w-full p-4 rounded-2xl bg-amber-50/20 border border-amber-200 text-slate-800 font-amiri text-base leading-relaxed resize-y focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الجباية والمحافظة
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDeed}
                className="px-5 py-2.5 rounded-xl border border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-50 text-xs font-bold transition cursor-pointer"
              >
                {copiedSuccess ? 'تم النسخ بنجاح' : 'نسخ نص المحرر'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>اعتماد وطباعة رسم اعتصار الهبة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* نافذة بوابة التحقق القبلي من التلقي (المرحلة 0.25) */}
      {/* ==================================================================== */}
      {showPreReceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>بوابة التحقق القبلي واختصاص التلقي التوثيقي (المرحلة 0.25):</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPreReceptionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black p-1 text-base cursor-pointer"
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

      {/* ==================================================================== */}
      {/* ㉟ نافذة المراجع القانونية المتكاملة */}
      {/* ==================================================================== */}
      {showLegalRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>㉟ المراجع القانونية المؤطرة لاعتصار الهبة وسجلات الوكالات:</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLegalRefModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <strong className="text-slate-900 font-bold block">1. مدونة الحقوق العينية (القانون 39.08):</strong>
                <p>• <strong>المادة 1:</strong> تطبيق مقتضيات المدونة والرجوع لقانون الالتزامات والعقود والفقه المالكي الراجح عند غياب النص.</p>
                <p>• <strong>المادة 4:</strong> وجوب تحرير التصرفات العقارية والوكالات الخاصة بها تحت طائلة البطلان في محرر رسمي أو ثابت التاريخ.</p>
                <p>• <strong>المادة 9:</strong> الحقوق العينية المنشأة عرفياً بوجه صحيح قبل دخول المدونة حيز التنفيذ تظل صحيحة وخاضعة للقوانين السارية حينها.</p>
                <p>• <strong>المواد 273 إلى 289:</strong> أحكام الهبة وشروطها واعتصارها، وحصر الاعتصار في الأب والأم والعاجز عن الإنفاق المشترط لذلك.</p>
                <p>• <strong>المادة 285:</strong> موانع الاعتصار الثمانية القطعية.</p>
                <p>• <strong>المادة 291:</strong> حظر الاعتصار في الصدقة مطلقاً.</p>
                <p>• <strong>المادة 334:</strong> دخول المدونة حيز التنفيذ بعد ستة أشهر من نشرها بالجريدة الرسمية (24 ماي 2012).</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <strong className="text-slate-900 font-bold block">2. قانون الالتزامات والعقود وسجلات الوكالات:</strong>
                <p>• <strong>الفصل 1-889:</strong> وجوب تقييد الوكالات المتعلقة بالحقوق العينية في السجل المحلي بالمحكمة الابتدائية، وعدم نفاذ آثارها إلا من تاريخ التقييد.</p>
                <p>• <strong>الفصل 2-889:</strong> السجل الوطني الإلكتروني للوكالات وإلزامية التحقق منه قبل توثيق التصرفات العقارية.</p>
                <p>• <strong>المرسوم 2.23.101 وقرار وزير العدل 381.25:</strong> نماذج التقييد وشهادات السجل المحلي والإلكتروني.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLegalRefModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
