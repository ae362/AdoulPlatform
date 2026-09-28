import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  FeesAgentState,
  SaleEntityDeed,
  LegalEntityBuyerInfo,
  LegalEntityRepresentativeInfo,
  LegalEntityNature,
  CommercialCompanySubtype,
  LegalEntityStatus,
  SalePersonPartyInfo,
  SalePersonPropertyDetails,
  SaleEncumbranceItem,
  SalePaymentInstallment,
  SaleAdminCertificateItem,
  PaymentMethod,
} from '../../../../types/feesAgentTypes';
import {
  convertNumberToArabicWords,
  generateFileNumber,
  createEmptyParty,
  createEmptyProperty,
} from '../../../../utils/feesAgentUtils';
import {
  generateSaleEntityDraft
} from '../../../../templates/feesAgentTemplates';
import {
  Building2,
  User,
  Users,
  Shield,
  ShieldCheck,
  XCircle,
  Plus,
  Trash2,
  Send,
  FileText,
  Scale,
  DollarSign,
  ChevronLeft,
  Eye,
  Search,
  FileCheck,
  ArrowRight,
  Landmark,
  Compass,
} from 'lucide-react';

// ============================================================================
// CONSTANTS & VOCABULARY FOR LEGAL ENTITIES
// ============================================================================

const COMMERCIAL_SUBTYPES: { id: CommercialCompanySubtype; label: string; law: string }[] = [
  { id: 'SARL', label: 'شركة ذات مسؤولية محدودة (SARL / SARL-AU)', law: 'القانون رقم 5.96' },
  { id: 'SA', label: 'شركة مساهمة (SA)', law: 'القانون رقم 17.95' },
  { id: 'SAS', label: 'شركة مساهمة مبسطة (SAS)', law: 'القانون رقم 5.96' },
  { id: 'SNC', label: 'شركة تضامن (SNC)', law: 'القانون رقم 5.96' },
  { id: 'شركة_توصية_بسيطة', label: 'شركة توصية بسيطة', law: 'القانون رقم 5.96' },
  { id: 'شركة_توصية_بالأسهم', label: 'شركة توصية بالأسهم', law: 'القانون رقم 5.96' },
  { id: 'أخرى', label: 'شركة تجارية بشكل آخر', law: 'التشريع التجاري المغربي' },
];

const REPRESENTATIVE_CAPACITIES = [
  { id: 'مسير', label: 'مسير (Gérant)' },
  { id: 'مدير_عام', label: 'مدير عام (Directeur Général)' },
  { id: 'رئيس', label: 'رئيس مجلس الإدارة (Président du CA)' },
  { id: 'عضو_مجلس_إدارة', label: 'عضو جهاز الإدارة مفوض' },
  { id: 'مصف', label: 'مصفٍّ اتفاقي أو قضائي (Liquidateur)' },
  { id: 'وكيل_بتوكيل_خاص', label: 'وكيل بتوكيل خاص بالشراء' },
  { id: 'وكيل_بتوكيل_عام', label: 'وكيل بتوكيل عام' },
  { id: 'مفوض_بالتوقيع', label: 'مفوض رسمي بالتوقيع' },
  { id: 'آخر', label: 'صفة تمثيلية أخرى' },
];

const AUTHORITY_SOURCES = [
  { id: 'النظام_الأساسي', label: 'منصوص عليه في النظام الأساسي للشركة' },
  { id: 'القانون', label: 'بحكم القانون المباشر للصلاحيات المخولة' },
  { id: 'التعيين', label: 'محضر أو وثيقة التعيين المسجلة بالسجل التجاري' },
  { id: 'قرار_الهيئة_المختصة', label: 'قرار أو محضر الهيئة المختصة (جمع عام / مجلس الإدارة)' },
  { id: 'وكالة', label: 'عقد وكالة عدلية أو رسمية مستوفية' },
  { id: 'تفويض', label: 'سند تفويض خاص بالتوقيع' },
  { id: 'حكم_أو_قرار_قضائي', label: 'حكم أو قرار قضائي حائز لقوة الشيء المقضي به' },
  { id: 'مصدر_آخر', label: 'مستند قانوني آخر' },
];

export const SaleEntityWizard: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  // Navigation Stages:
  // 1: هوية الشخص المعنوي والممثل القانوني (Entity & Rep)
  // 2: الطرف البائع (Sellers)
  // 3: محرك العقار المشترك (Shared Property Engine)
  // 4: الثمن وطريقة الأداء والتمويل (Finance & Source of Funds)
  // 5: الشروط والوكالة والتوثيق (Terms, Agency & POAs)
  // 6: الفحص القانوني والمعاينة والاعتماد (Legal Audit, Draft Preview & Step 7 Transit)
  const [stage, setStage] = useState<number>(1);

  // Smart Starting Point: Choice of Buyer Type
  const [buyerChoice, setBuyerChoice] = useState<'معنوي' | 'طبيعي'>('معنوي');

  // Existing Legal Entity Search State (عدم إعادة إدخال البيانات)
  const [searchRcQuery, setSearchRcQuery] = useState('');
  const [showSavedEntityPrompt, setShowSavedEntityPrompt] = useState(false);

  // Initialize or extract legal entity state
  const existingEntity = state.saleEntityDeed?.buyerEntity;
  const existingRep = state.saleEntityDeed?.buyerRepresentative;

  // --- Entity Form State ---
  const [entityNature, setEntityNature] = useState<LegalEntityNature>(existingEntity?.entityNature || 'شركة_تجارية');
  const [companySubtype, setCompanySubtype] = useState<CommercialCompanySubtype>(existingEntity?.companySubtype || 'SARL');
  const [legalName, setLegalName] = useState(existingEntity?.legalName || '');
  const [commercialName, setCommercialName] = useState(existingEntity?.commercialName || '');
  const [legalForm, setLegalForm] = useState(existingEntity?.legalForm || 'شركة ذات مسؤولية محدودة');
  const [headquarters, setHeadquarters] = useState(existingEntity?.headquarters || '');
  const [city, setCity] = useState(existingEntity?.city || '');
  const [country, setCountry] = useState(existingEntity?.country || 'المغرب');
  const [rcNumber, setRcNumber] = useState(existingEntity?.rcNumber || '');
  const [rcCourt, setRcCourt] = useState(existingEntity?.rcCourt || '');
  const [ice, setIce] = useState(existingEntity?.ice || '');
  const [ifNumber, setIfNumber] = useState(existingEntity?.ifNumber || '');
  const [creationDate, setCreationDate] = useState(existingEntity?.creationDate || '');
  const [corporatePurpose, setCorporatePurpose] = useState(existingEntity?.corporatePurpose || '');
  const [purposeCompliance, setPurposeCompliance] = useState<'نعم' | 'تحتاج_مراجعة' | 'يوجد_تعارض_ظاهر'>(existingEntity?.purposeCompliance || 'نعم');
  const [legalStatus, setLegalStatus] = useState<LegalEntityStatus>(existingEntity?.legalStatus || 'نشط');
  const [statusNotes, _setStatusNotes] = useState(existingEntity?.statusNotes || '');

  // Foreign Entity Specifics
  const [foreignOriginCountry, setForeignOriginCountry] = useState(existingEntity?.foreignDetails?.countryOfOrigin || '');
  const [foreignRegistrationNumber, setForeignRegistrationNumber] = useState(existingEntity?.foreignDetails?.foreignRegistrationNumber || '');
  const [foreignHasApostille, setForeignHasApostille] = useState(existingEntity?.foreignDetails?.hasApostilleOrLegalization ?? true);
  const [foreignHasTranslation, setForeignHasTranslation] = useState(existingEntity?.foreignDetails?.hasSwornTranslation ?? true);

  // Liquidation / Judicial Receivership Specifics
  const [liquidatorDoc, setLiquidatorDoc] = useState(existingEntity?.liquidationDetails?.liquidatorAppointmentDoc || '');
  const [liquidatorDate, setLiquidatorDate] = useState(existingEntity?.liquidationDetails?.appointmentDate || '');
  const [liquidatorLimits, setLiquidatorLimits] = useState(existingEntity?.liquidationDetails?.authorityLimits || '');
  const [hasPurchaseAuth, setHasPurchaseAuth] = useState(existingEntity?.liquidationDetails?.hasPurchaseAuthorization ?? false);

  const [courtProceedingType, setCourtProceedingType] = useState(existingEntity?.judicialProceedingsDetails?.proceedingType || '');
  const [proceedingCourt, setProceedingCourt] = useState(existingEntity?.judicialProceedingsDetails?.court || '');
  const [proceedingCaseNum, setProceedingCaseNum] = useState(existingEntity?.judicialProceedingsDetails?.caseNumber || '');
  const [proceedingDate, setProceedingDate] = useState(existingEntity?.judicialProceedingsDetails?.judgmentDate || '');
  const [judicialReceiver, setJudicialReceiver] = useState(existingEntity?.judicialProceedingsDetails?.judicialReceiverName || '');

  // Special Approvals & GA Resolutions
  const [requiresSpecialApproval, setRequiresSpecialApproval] = useState<'نعم' | 'لا' | 'يحتاج_مراجعة'>(existingEntity?.specialApproval?.requiresSpecialApproval || 'لا');
  const [specialApprovalAuthority, setSpecialApprovalAuthority] = useState(existingEntity?.specialApproval?.authorityType || 'الجمع العام غير العادي');
  const [specialMeetingDate, setSpecialMeetingDate] = useState(existingEntity?.specialApproval?.meetingDate || '');
  const [specialMinutesNumber, setSpecialMinutesNumber] = useState(existingEntity?.specialApproval?.minutesNumber || '');
  const [specialApprovalSubject, setSpecialApprovalSubject] = useState(existingEntity?.specialApproval?.approvalSubject || '');

  // Documents Checklist & Matching
  const [docModel7, setDocModel7] = useState(existingEntity?.documentsChecklist?.hasRecentRCModel7 ?? true);
  const [docBylaws, setDocBylaws] = useState(existingEntity?.documentsChecklist?.hasUpdatedBylaws ?? true);
  const [docRepProof, setDocRepProof] = useState(existingEntity?.documentsChecklist?.hasRepresentativeProof ?? true);
  const [docGAMinutes, setDocGAMinutes] = useState(existingEntity?.documentsChecklist?.hasGAMinutes ?? false);
  const [docJudicialRecord, setDocJudicialRecord] = useState(existingEntity?.documentsChecklist?.hasJudicialRecordCert ?? false);
  const [docNonBankruptcy, setDocNonBankruptcy] = useState(existingEntity?.documentsChecklist?.hasNonBankruptcyCert ?? true);
  const [bylawsNameMatch, setBylawsNameMatch] = useState(true);

  // --- Representative Form State ---
  const [repName, setRepName] = useState(existingRep?.fullName || '');
  const [repCin, setRepCin] = useState(existingRep?.cin || '');
  const [repDob, setRepDob] = useState(existingRep?.dateOfBirth || '');
  const [repNationality, setRepNationality] = useState(existingRep?.nationality || 'مغربية');
  const [repAddress, setRepAddress] = useState(existingRep?.address || '');
  const [repCapacity, setRepCapacity] = useState<any>(existingRep?.capacity || 'مسير');
  const [repCapacityStartDate, setRepCapacityStartDate] = useState(existingRep?.capacityStartDate || '');
  const [repCapacityDuration, setRepCapacityDuration] = useState(existingRep?.capacityDuration || 'غير محددة');
  const [repAuthoritySource, setRepAuthoritySource] = useState<any>(existingRep?.authoritySource || 'النظام_الأساسي');
  const [repAuthorityDocNum, setRepAuthorityDocNum] = useState(existingRep?.authorityDocNumber || '');
  const [repAuthorityDocDate, setRepAuthorityDocDate] = useState(existingRep?.authorityDocDate || '');
  const [repIsCapacityValid, setRepIsCapacityValid] = useState<'نعم' | 'تحتاج_تحقق' | 'غير_ثابتة'>(existingRep?.isCapacityValid || 'نعم');
  const [repMode, setRepMode] = useState<any>(existingRep?.representationMode || 'منفرد');

  // Second Representative (in case of joint representation)
  const [rep2Name, setRep2Name] = useState(existingRep?.secondRepresentative?.fullName || '');
  const [rep2Cin, setRep2Cin] = useState(existingRep?.secondRepresentative?.cin || '');
  const [rep2Capacity, setRep2Capacity] = useState(existingRep?.secondRepresentative?.capacity || 'مسير مشارك');

  // Sub-Agent POA Chain (الشركة -> الممثل -> الوكيل -> الرسم)
  const [hasSubAgent, setHasSubAgent] = useState(existingRep?.poaChain?.hasSubAgent ?? false);
  const [subAgentName, setSubAgentName] = useState(existingRep?.poaChain?.agentFullName || '');
  const [subAgentCin, setSubAgentCin] = useState(existingRep?.poaChain?.agentCin || '');
  const [subAgentAddress, setSubAgentAddress] = useState(existingRep?.poaChain?.agentAddress || '');
  const [subAgentCourt, setSubAgentCourt] = useState(existingRep?.poaChain?.poaCourt || '');
  const [subAgentBook, setSubAgentBook] = useState(existingRep?.poaChain?.poaDeedBook || 'كناش التوكيلات');
  const [subAgentPage, setSubAgentPage] = useState(existingRep?.poaChain?.poaDeedPage || '');
  const [subAgentNumber, setSubAgentNumber] = useState(existingRep?.poaChain?.poaDeedNumber || '');
  const [subAgentDate, setSubAgentDate] = useState(existingRep?.poaChain?.poaDeedDate || '');
  const [subAgentIsRealEstatePoa, setSubAgentIsRealEstatePoa] = useState(existingRep?.poaChain?.isRealEstatePoa ?? true);
  const [subAgentLocalRegNum, setSubAgentLocalRegNum] = useState(existingRep?.poaChain?.localRegistryNumber || '');
  const [subAgentLocalRegCourt, setSubAgentLocalRegCourt] = useState(existingRep?.poaChain?.localRegistryCourt || '');
  const [subAgentLocalRegDate, setSubAgentLocalRegDate] = useState(existingRep?.poaChain?.localRegistryDate || '');

  // Representative History Ledger
  const [repHistory, _setRepHistory] = useState<any[]>(existingEntity?.representationHistory || []);

  // --- Sellers State (الطرف البائع) ---
  const [sellers, setSellers] = useState<SalePersonPartyInfo[]>(() => {
    if (state.saleEntityDeed?.sellers && state.saleEntityDeed.sellers.length > 0) {
      return state.saleEntityDeed.sellers;
    }
    if (state.sellers && state.sellers.length > 0) {
      return state.sellers.map(s => ({
        id: s.id || generateFileNumber(),
        fullName: s.name || '',
        idNumber: s.idNumber || '',
        dateOfBirth: s.dateOfBirth || '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: (s.nationality as any) || 'مغربي',
        profession: s.profession || '',
        address: s.address || '',
        share: s.share || '100%',
        representationMode: (s.hasSpecialProxy === 'نعم' || s.proxyName ? 'وكيل' : 'شخصي') as any,
        poaInfo: s.proxyName ? {
          court: s.proxyDeedNotary || '',
          registryBook: s.proxyDeedBook || '',
          page: s.proxyDeedPage || '',
          count: s.proxyDeedNumber || '',
          date: s.proxyDeedDate || '',
          agentFullName: s.proxyName || '',
          agentCin: s.proxyNationalID || '',
          agentAddress: s.proxyAddress || '',
          isRealEstatePoa: false,
        } : undefined,
      }));
    }
    return [{
      id: generateFileNumber(),
      fullName: '',
      idNumber: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      profession: '',
      address: '',
      share: '100%',
      representationMode: 'شخصي',
    }];
  });

  // --- Shared Property State ---
  const existingProp = state.saleEntityDeed?.property || (state.properties && state.properties.length > 0 ? {
    propertyStatus: (state.properties[0].propertyType as any) || 'محفظ',
    titleName: state.properties[0].propertyName || '',
    titleNumber: state.properties[0].titleDeedNumber || '',
    conservationOffice: state.properties[0].realEstateOffice || '',
    location: state.properties[0].addressOrLocation || '',
    areaNumber: typeof state.properties[0].area === 'number' ? state.properties[0].area : undefined,
    areaUnit: 'متر_مربع' as const,
    components: '',
    boundaries: typeof state.properties[0].boundaries === 'object' && state.properties[0].boundaries
      ? state.properties[0].boundaries
      : { north: '', south: '', east: '', west: '' },
    titleOriginDeed: 'شراء رسمي',
    titleOriginReferences: '',
    requisitionNumber: '',
    requisitionDate: '',
  } : undefined);

  const [propStatus, setPropStatus] = useState<'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ'>(
    existingProp?.propertyStatus || 'محفظ'
  );
  const [propTitleName, setPropTitleName] = useState(existingProp?.titleName || '');
  const [propTitleNumber, setPropTitleNumber] = useState(existingProp?.titleNumber || '');
  const [propConservation, setPropConservation] = useState(existingProp?.conservationOffice || '');
  const [propRequisitionNumber, setPropRequisitionNumber] = useState(existingProp?.requisitionNumber || '');
  const [propRequisitionDate, setPropRequisitionDate] = useState(existingProp?.requisitionDate || '');
  const [propLocation, setPropLocation] = useState(existingProp?.location || '');
  const [propAreaNumber, setPropAreaNumber] = useState<number | undefined>(existingProp?.areaNumber);
  const [propAreaUnit, setPropAreaUnit] = useState<any>(existingProp?.areaUnit || 'متر_مربع');
  const [propComponents, setPropComponents] = useState<string>(existingProp?.components || '');
  const [propBoundaries, setPropBoundaries] = useState({
    north: existingProp?.boundaries?.north || '',
    south: existingProp?.boundaries?.south || '',
    east: existingProp?.boundaries?.east || '',
    west: existingProp?.boundaries?.west || '',
  });
  const [propOriginDeed, setPropOriginDeed] = useState(existingProp?.titleOriginDeed || 'شراء رسمي');
  const [propOriginRef, setPropOriginRef] = useState(existingProp?.titleOriginReferences || '');

  // Encumbrances
  const [hasEncumbrances, setHasEncumbrances] = useState<'نعم' | 'لا' | ''>(state.saleEntityDeed?.hasEncumbrances || 'لا');
  const [encumbrances, _setEncumbrances] = useState<SaleEncumbranceItem[]>(state.saleEntityDeed?.encumbrances || []);

  // --- Finance & Source of Funds State ---
  const existingFin = state.saleEntityDeed?.finance || (state.finance ? {
    totalPrice: state.finance.price || 0,
    totalPriceInWords: state.finance.priceInWords || '',
    paymentMethods: [state.finance.paymentMethod || 'شيك بنكي مصادق عليه'],
  } : undefined);

  const [totalPrice, setTotalPrice] = useState<number>(existingFin?.totalPrice || 0);
  const [totalPriceWords, setTotalPriceWords] = useState<string>(existingFin?.totalPriceInWords || '');
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(existingFin?.isPriceInclusiveOfTaxes ?? false);
  const [paymentWays, setPaymentWays] = useState<string[]>(existingFin?.paymentMethods || ['شيك بنكي مصادق عليه']);
  const [sourceOfFunds, setSourceOfFunds] = useState<'أموال_الشركة' | 'تمويل_بنكي' | 'قرض' | 'مساهمة_شركاء' | 'آخر'>(
    existingFin?.sourceOfFunds || 'أموال_الشركة'
  );
  const [sourceOfFundsNotes, setSourceOfFundsNotes] = useState(existingFin?.sourceOfFundsNotes || '');

  // Earnest & Installments
  const [hasEarnest, setHasEarnest] = useState(existingFin?.hasEarnest ?? false);
  const [earnestAmount, setEarnestAmount] = useState<number>(existingFin?.earnestAmount || 0);
  const [earnestMethod, setEarnestMethod] = useState(existingFin?.earnestPaymentMethod || 'شيك بنكي مصادق عليه');
  const [earnestBank, setEarnestBank] = useState(existingFin?.earnestBank || '');
  const [earnestRef, setEarnestRef] = useState(existingFin?.earnestReference || '');
  const [earnestDate, setEarnestDate] = useState(existingFin?.earnestDate || '');
  const [remainingDueDate, setRemainingDueDate] = useState(existingFin?.remainingDueDate || '');

  const [hasInstallments, _setHasInstallments] = useState(existingFin?.hasInstallments ?? false);
  const [installments, _setInstallments] = useState<SalePaymentInstallment[]>(existingFin?.installments || []);

  // --- Administrative Certificates & Tax & Dates ---
  const [adminCerts, _setAdminCerts] = useState<SaleAdminCertificateItem[]>(state.saleEntityDeed?.certificates || []);
  const [taxOffice, setTaxOffice] = useState(state.saleEntityDeed?.taxAndDuty?.registrationOffice || '');
  const [taxReceipt, setTaxReceipt] = useState(state.saleEntityDeed?.taxAndDuty?.receiptNumber || '');
  const [taxDate, setTaxDate] = useState(state.saleEntityDeed?.taxAndDuty?.paymentDate || '');
  const [taxAmount, setTaxAmount] = useState<number | undefined>(state.saleEntityDeed?.taxAndDuty?.amount);

  const [court, setCourt] = useState(state.saleEntityDeed?.court || state.meta?.court || 'طنجة');
  const [courtSection, setCourtSection] = useState(state.saleEntityDeed?.section || state.meta?.courtSection || 'قسم قضاء الأسرة والتوثيق');
  const [notaryPrimary, setNotaryPrimary] = useState(state.saleEntityDeed?.notaryPrimary || state.meta?.notaryPrimary || '');
  const [notarySecondary, setNotarySecondary] = useState(state.saleEntityDeed?.notarySecondary || state.meta?.notarySecondary || '');
  const [intakeDate, setIntakeDate] = useState(state.saleEntityDeed?.intakeDate || state.meta?.dateGregorian || new Date().toISOString().split('T')[0]);

  // Smart Confirmation State (سؤال الاعتماد الذكي)
  const [confirmEntityAdoption, setConfirmEntityAdoption] = useState<'نعم' | 'تعديل' | 'إيقاف_للمراجعة'>('نعم');
  const [confirmRepAtSigning, setConfirmRepAtSigning] = useState<'نعم' | 'يحتاج_مراجعة'>('نعم');

  // Auto-convert price to words when totalPrice changes
  useEffect(() => {
    if (totalPrice > 0) {
      const words = convertNumberToArabicWords(totalPrice);
      setTotalPriceWords(words);
    }
  }, [totalPrice]);

  // Sync Legal Form with Commercial Subtype
  useEffect(() => {
    if (entityNature === 'شركة_تجارية') {
      const match = COMMERCIAL_SUBTYPES.find(s => s.id === companySubtype);
      if (match) setLegalForm(match.label);
    } else if (entityNature === 'تعاونية') {
      setLegalForm('تعاونية (خاضعة للقانون رقم 112.12)');
    } else if (entityNature === 'جمعية') {
      setLegalForm('جمعية مدنية (ظهير 1958)');
    } else if (entityNature === 'مؤسسة_أو_هيئة_عامة') {
      setLegalForm('مؤسسة / هيئة عامة');
    } else if (entityNature === 'شخص_معنوي_أجنبي') {
      setLegalForm('شخص معنوي أجنبي');
    }
  }, [entityNature, companySubtype]);

  // Build current Deed State
  const buildCurrentDeedState = useCallback((): SaleEntityDeed => {
    const buyerEntity: LegalEntityBuyerInfo = {
      entityNature,
      companySubtype: entityNature === 'شركة_تجارية' ? companySubtype : undefined,
      legalName,
      commercialName,
      legalForm,
      headquarters,
      city,
      country,
      rcNumber,
      rcCourt,
      ice,
      ifNumber,
      creationDate,
      corporatePurpose,
      purposeCompliance,
      legalStatus,
      statusNotes,
      foreignDetails: entityNature === 'شخص_معنوي_أجنبي' ? {
        countryOfOrigin: foreignOriginCountry,
        foreignRegistrationNumber,
        hasApostilleOrLegalization: foreignHasApostille,
        hasSwornTranslation: foreignHasTranslation,
      } : undefined,
      liquidationDetails: legalStatus === 'في_طور_التصفية' ? {
        liquidatorAppointmentDoc: liquidatorDoc,
        appointmentDate: liquidatorDate,
        authorityLimits: liquidatorLimits,
        hasPurchaseAuthorization: hasPurchaseAuth,
      } : undefined,
      judicialProceedingsDetails: legalStatus === 'تحت_مسطرة_قضائية' ? {
        proceedingType: courtProceedingType,
        court: proceedingCourt,
        caseNumber: proceedingCaseNum,
        judgmentDate: proceedingDate,
        judicialReceiverName: judicialReceiver,
      } : undefined,
      specialApproval: {
        requiresSpecialApproval,
        authorityType: specialApprovalAuthority,
        meetingDate: specialMeetingDate,
        minutesNumber: specialMinutesNumber,
        approvalSubject: specialApprovalSubject,
      },
      documentsChecklist: {
        hasRecentRCModel7: docModel7,
        hasUpdatedBylaws: docBylaws,
        hasRepresentativeProof: docRepProof,
        hasGAMinutes: docGAMinutes,
        hasJudicialRecordCert: docJudicialRecord,
        hasNonBankruptcyCert: docNonBankruptcy,
      },
      representationHistory: repHistory,
    };

    const buyerRepresentative: LegalEntityRepresentativeInfo = {
      id: existingRep?.id || generateFileNumber(),
      fullName: repName,
      cin: repCin,
      dateOfBirth: repDob,
      nationality: repNationality,
      address: repAddress,
      capacity: repCapacity,
      capacityStartDate: repCapacityStartDate,
      capacityDuration: repCapacityDuration,
      authoritySource: repAuthoritySource,
      authorityDocNumber: repAuthorityDocNum,
      authorityDocDate: repAuthorityDocDate,
      isCapacityValid: repIsCapacityValid,
      representationMode: repMode,
      secondRepresentative: repMode === 'توقيع_مشترك' ? {
        fullName: rep2Name,
        cin: rep2Cin,
        capacity: rep2Capacity,
      } : undefined,
      poaChain: hasSubAgent ? {
        hasSubAgent: true,
        agentFullName: subAgentName,
        agentCin: subAgentCin,
        agentAddress: subAgentAddress,
        poaCourt: subAgentCourt,
        poaDeedBook: subAgentBook,
        poaDeedNumber: subAgentNumber,
        poaDeedPage: subAgentPage,
        poaDeedDate: subAgentDate,
        isRealEstatePoa: subAgentIsRealEstatePoa,
        localRegistryNumber: subAgentLocalRegNum,
        localRegistryCourt: subAgentLocalRegCourt,
        localRegistryDate: subAgentLocalRegDate,
      } : undefined,
    };

    const property: SalePersonPropertyDetails = {
      propertyStatus: propStatus,
      titleName: propTitleName,
      titleNumber: propTitleNumber,
      conservationOffice: propConservation,
      requisitionNumber: propRequisitionNumber,
      requisitionDate: propRequisitionDate,
      location: propLocation,
      areaNumber: propAreaNumber,
      areaUnit: propAreaUnit,
      areaInWords: propAreaNumber ? `${propAreaNumber} ${propAreaUnit}` : '',
      components: propComponents,
      boundaries: propBoundaries,
      titleOriginDeed: propOriginDeed,
      titleOriginReferences: propOriginRef,
    };

    const remainingAmount = hasEarnest ? Math.max(0, totalPrice - earnestAmount) : 0;

    return {
      disposalType: 'شراء',
      buyerNature: 'شخص_معنوي',
      intakeDate,
      court,
      section: courtSection,
      notaryPrimary,
      notarySecondary,
      deedStatus: 'جاهز_للتحرير',
      buyerEntity,
      buyerRepresentative,
      sellers,
      property,
      titleChain: [],
      hasEncumbrances,
      encumbrances,
      finance: {
        totalPrice,
        totalPriceInWords: totalPriceWords,
        paymentMethods: paymentWays,
        hasEarnest,
        earnestAmount,
        earnestPaymentMethod: earnestMethod,
        earnestBank,
        earnestReference: earnestRef,
        earnestDate,
        remainingAmount,
        remainingAmountInWords: remainingAmount > 0 ? convertNumberToArabicWords(remainingAmount) : '',
        remainingDueDate,
        hasInstallments,
        installments,
        sourceOfFunds,
        sourceOfFundsNotes,
        isPriceInclusiveOfTaxes: isTaxInclusive,
      },
      terms: {
        hasAgreedDeadline: Boolean(remainingDueDate),
        dueDate: remainingDueDate,
      },
      certificates: adminCerts,
      taxAndDuty: {
        registrationOffice: taxOffice,
        receiptNumber: taxReceipt,
        paymentDate: taxDate,
        amount: taxAmount,
      },
      adoptionQuestion: {
        confirmVerifiedIdentity: confirmEntityAdoption,
        confirmRepresentativeAtSigning: confirmRepAtSigning,
      },
      legalCheckData: {
        isEntityActive: legalStatus !== 'مشطوب' && legalStatus !== 'أخرى',
        isNameConsistent: bylawsNameMatch,
        isRepresentativeValid: repIsCapacityValid === 'نعم',
        isCapacityContinuous: true,
        isPropertyValid: Boolean(propStatus),
        isPriceBalanced: totalPrice > 0,
        allChecksPassed: legalStatus !== 'مشطوب' && repIsCapacityValid !== 'غير_ثابتة',
      },
    };
  }, [
    entityNature, companySubtype, legalName, commercialName, legalForm, headquarters, city, country,
    rcNumber, rcCourt, ice, ifNumber, creationDate, corporatePurpose, purposeCompliance, legalStatus,
    statusNotes, foreignOriginCountry, foreignRegistrationNumber, foreignHasApostille, foreignHasTranslation,
    liquidatorDoc, liquidatorDate, liquidatorLimits, hasPurchaseAuth, courtProceedingType, proceedingCourt,
    proceedingCaseNum, proceedingDate, judicialReceiver, requiresSpecialApproval, specialApprovalAuthority,
    specialMeetingDate, specialMinutesNumber, specialApprovalSubject, docModel7, docBylaws, docRepProof,
    docGAMinutes, docJudicialRecord, docNonBankruptcy, repHistory, existingRep?.id, repName, repCin, repDob,
    repNationality, repAddress, repCapacity, repCapacityStartDate, repCapacityDuration, repAuthoritySource,
    repAuthorityDocNum, repAuthorityDocDate, repIsCapacityValid, repMode, rep2Name, rep2Cin, rep2Capacity,
    hasSubAgent, subAgentName, subAgentCin, subAgentAddress, subAgentCourt, subAgentBook, subAgentNumber,
    subAgentPage, subAgentDate, subAgentIsRealEstatePoa, subAgentLocalRegNum, subAgentLocalRegCourt,
    subAgentLocalRegDate, propStatus, propTitleName, propTitleNumber, propConservation, propRequisitionNumber,
    propRequisitionDate, propLocation, propAreaNumber, propAreaUnit, propComponents, propBoundaries,
    propOriginDeed, propOriginRef, sellers, hasEncumbrances, encumbrances, totalPrice, totalPriceWords,
    paymentWays, hasEarnest, earnestAmount, earnestMethod, earnestBank, earnestRef, earnestDate,
    remainingDueDate, hasInstallments, installments, sourceOfFunds, sourceOfFundsNotes, isTaxInclusive,
    adminCerts, taxOffice, taxReceipt, taxDate, taxAmount, confirmEntityAdoption, confirmRepAtSigning,
    bylawsNameMatch, intakeDate, court, courtSection, notaryPrimary, notarySecondary
  ]);

  // Overall Verification Status
  const verificationStatus = useMemo<'قيد_الفحص' | 'مكتمل' | 'يحتاج_وثيقة' | 'ممنوع'>(() => {
    if (legalStatus === 'مشطوب' || repIsCapacityValid === 'غير_ثابتة') {
      return 'ممنوع';
    }
    if (!docModel7 || !docBylaws || !docRepProof || repIsCapacityValid === 'تحتاج_تحقق') {
      return 'يحتاج_وثيقة';
    }
    if (legalName && rcNumber && repName && repCin && totalPrice > 0) {
      return 'مكتمل';
    }
    return 'قيد_الفحص';
  }, [legalStatus, repIsCapacityValid, docModel7, docBylaws, docRepProof, legalName, rcNumber, repName, repCin, totalPrice]);

  // Golden Rule Check: If struck off, prevent transition to step 7
  const isStruckOffOrBanned = legalStatus === 'مشطوب' || repIsCapacityValid === 'غير_ثابتة';

  // ---------------------------------------------------------------------------
  // Red Button Action: Transition to Step 7 (المراجعة الذكية والتوثيق)
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = () => {
    if (isStruckOffOrBanned) {
      alert('❌ تنبيه قانوني قاطع: لا يمكن اعتماد رسم الشراء في ظل شطب الشخص المعنوي أو عدم ثبوت صفة الممثل القانوني!');
      return;
    }

    const deed = buildCurrentDeedState();
    const updatedState: FeesAgentState = {
      ...state,
      saleEntityDeed: deed,
      // Map entity & sellers to global state for cross-compatibility
      buyers: [{
        ...createEmptyParty(),
        id: deed.buyerRepresentative.id,
        name: `${deed.buyerEntity.legalName} (في شخص ممثلها: ${deed.buyerRepresentative.fullName})`,
        idNumber: deed.buyerEntity.ice || deed.buyerEntity.rcNumber,
        nationality: 'مغربي',
        address: deed.buyerEntity.headquarters,
        share: '100%',
        isLegalEntity: true,
        legalEntityType: deed.buyerEntity.entityNature === 'شركة_تجارية' ? 'company' :
                         deed.buyerEntity.entityNature === 'تعاونية' ? 'cooperative' :
                         deed.buyerEntity.entityNature === 'جمعية' ? 'association' : 'public_institution',
        legalEntityName: deed.buyerEntity.legalName,
      }],
      sellers: deed.sellers.map(s => ({
        ...createEmptyParty(),
        id: s.id,
        name: s.fullName,
        idNumber: s.idNumber,
        dateOfBirth: s.dateOfBirth,
        nationality: (s.nationality as any) || 'مغربي',
        address: s.address,
        share: s.share,
      })),
      properties: [{
        ...createEmptyProperty(),
        id: generateFileNumber(),
        propertyName: deed.property.titleName || '',
        titleDeedNumber: deed.property.titleNumber || '',
        realEstateOffice: deed.property.conservationOffice || '',
        propertyType: deed.property.propertyStatus as any,
        addressOrLocation: deed.property.location || '',
        area: deed.property.areaNumber || 0,
        boundaries: typeof deed.property.boundaries === 'object' && deed.property.boundaries
          ? deed.property.boundaries
          : { north: '', south: '', east: '', west: '' },
      }],
      finance: {
        price: deed.finance.totalPrice || 0,
        priceInWords: deed.finance.totalPriceInWords || '',
        paymentMethod: 'شيك' as PaymentMethod,
        transferDetails: deed.finance.sourceOfFunds || '',
        registeredWithTax: deed.taxAndDuty.receiptNumber ? 'نعم' : 'لا',
      },
    };

    const draftText = generateSaleEntityDraft(updatedState);

    setState(prev => ({
      ...prev,
      ...updatedState,
      step: 7,
      draft: draftText,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for sellers share balancing
  const handleSellerShareChange = (idx: number, newShare: string) => {
    const updated = [...sellers];
    updated[idx].share = newShare;
    setSellers(updated);
  };

  const handleEqualizeSellerShares = () => {
    if (sellers.length === 0) return;
    const equalShare = (100 / sellers.length).toFixed(2).replace(/\.00$/, '') + '%';
    setSellers(sellers.map(s => ({ ...s, share: equalShare })));
  };

  const addSeller = () => {
    const newS: SalePersonPartyInfo = {
      id: generateFileNumber(),
      fullName: '',
      idNumber: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      profession: '',
      address: '',
      share: sellers.length === 0 ? '100%' : '50%',
      representationMode: 'شخصي',
    };
    setSellers([...sellers, newS]);
  };

  const removeSeller = (idx: number) => {
    if (sellers.length <= 1) return;
    setSellers(sellers.filter((_, i) => i !== idx));
  };

  // ---------------------------------------------------------------------------
  // RENDER UI
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 text-right font-sans pb-16" dir="rtl">

      {/* ========================================================================= */}
      {/* ① PERSISTENT TOP CARD (بطاقة ثابتة أعلى الشاشة)                          */}
      {/* ========================================================================= */}
      <div className="sticky top-2 z-40 bg-white/95 backdrop-blur-md border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl shadow-emerald-950/10 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Operation & Buyer Summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              🟢 شراء لفائدة شخص معنوي
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              🏢 المشتري: <strong className="text-slate-900">{legalName || 'شخص معنوي (قيد الإدخال)'}</strong>
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              🏡 العقار: <strong className="text-slate-900">{propStatus === 'محفظ' ? 'محفظ' : propStatus === 'في_طور_التحفيظ' ? 'في طور التحفيظ' : 'غير محفظ'}</strong>
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              💰 الثمن: <strong className="text-emerald-700">{totalPrice > 0 ? `${totalPrice.toLocaleString()} درهم` : '---'}</strong>
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              👤 الممثل: <strong className="text-slate-900">{repName ? `${repName} (${repCapacity})` : '---'}</strong>
            </span>
            
            {/* Dynamic Status Badge */}
            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 ${
              verificationStatus === 'مكتمل'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : verificationStatus === 'يحتاج_وثيقة'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : verificationStatus === 'ممنوع'
                ? 'bg-red-50 text-red-800 border-red-300 animate-pulse'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}>
              🔐 حالة التحقق: {
                verificationStatus === 'مكتمل' ? 'مكتمل ✅' :
                verificationStatus === 'يحتاج_وثيقة' ? 'يحتاج وثيقة ⚠️' :
                verificationStatus === 'ممنوع' ? 'ممنوع ⛔' : 'قيد الفحص 🔍'
              }
            </span>
          </div>

          {/* Quick Step 7 Action */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleProceedToStep7}
              disabled={isStruckOffOrBanned}
              className={`px-4 py-2 text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 border ${
                isStruckOffOrBanned
                  ? 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white border-red-400/50 shadow-red-900/20 cursor-pointer'
              }`}
              title="اعتماد رسم الشراء والانتقال الفوري للخطوة 7"
            >
              <Send className="w-4 h-4 text-white" />
              <span>اعتماد رسم الشراء والانتقال للخطوة 7</span>
            </button>
          </div>
        </div>

        {/* Stage Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-3 pt-3 border-t border-slate-100 overflow-x-auto text-[11px] font-bold">
          {[
            { id: 1, label: '① هوية الكيان والممثل' },
            { id: 2, label: '② الطرف البائع' },
            { id: 3, label: '③ محرك العقار' },
            { id: 4, label: '④ الثمن والتمويل' },
            { id: 5, label: '⑤ الوكالة والقرارات' },
            { id: 6, label: '⑥ التدقيق والاعتماد' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStage(s.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                stage === s.id
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ② SMART STARTING POINT (نقطة البداية الذكية)                               */}
      {/* ========================================================================= */}
      {stage === 1 && (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-sm text-slate-900 mb-0.5 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                من هو المشتري المستفيد من هذا الرسم؟
              </h4>
              <p className="text-xs text-slate-600">
                حدد طبيعة الطرف المشتري لتوجيه محرك التوثيق العدلي نحو القواعد القانونية المناسبة.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBuyerChoice('طبيعي');
                  // Give friendly prompt to switch to natural person wizard if user desired
                  if (confirm('هل ترغب في الانتقال إلى رسم شراء الشخص الذاتي (الطبيعي)؟ سيتم تحويل نوع العقد دون فقدان البيانات المشتركة.')) {
                    setState(prev => ({ ...prev, documentType: 'بيع_وشراء' }));
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  buyerChoice === 'طبيعي'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                👤 شخص طبيعي (ذاتي)
              </button>
              <button
                type="button"
                onClick={() => setBuyerChoice('معنوي')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  buyerChoice === 'معنوي'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                🏢 شخص معنوي (مفعل)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CRITICAL WARNING BANNER IF STRUCK OFF (قاعدة الحظر عند الشطب)             */}
      {/* ========================================================================= */}
      {legalStatus === 'مشطوب' && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-5 text-red-100 shadow-xl flex items-start gap-4 animate-fade-in">
          <XCircle className="w-7 h-7 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-black text-sm text-white">
              ❌ لا يمكن متابعة عملية الشراء بهذه الصفة قبل التحقق من الوضع القانوني الحالي للشخص المعنوي
            </h4>
            <p className="text-xs text-red-200 leading-relaxed">
              وفقاً لقواعد التجارة والتسجيل العقاري المغربي، فإن الشخص المعنوي المشطوب من السجل التجاري يفقد أهليته للشراء والتعاقد.
              يرجى الإدلاء بشهادة رفع الشطب أو تسوية وضعية الكيان قبل محاولة اعتماد الرسم أو إرساله للمراجعة القضائية.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: هوية الشخص المعنوي والممثل القانوني (ENTITY & REPRESENTATION)      */}
      {/* ========================================================================= */}
      {stage === 1 && (
        <div className="space-y-6">

          {/* ㉘ Fast search & reuse previously saved entity */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                🔄 استعمال ملف شخص معنوي مسجل مسبقاً في المنصة:
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="ابحث بواسطة RC أو ICE أو الاسم..."
                value={searchRcQuery}
                onChange={e => setSearchRcQuery(e.target.value)}
                className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchRcQuery.trim()) {
                    setShowSavedEntityPrompt(true);
                  }
                }}
                className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shrink-0"
              >
                بحث
              </button>
            </div>
          </div>

          {showSavedEntityPrompt && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-emerald-950 flex items-center justify-between gap-3 animate-fade-in">
              <div>
                <h5 className="font-bold text-xs">🟢 تم العثور على سجل متطابق للشخص المعنوي في قاعدة البيانات المحلية</h5>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  هل تريد اعتماد البيانات المسجلة أم تحديثها وفق المستندات الحديثة؟
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavedEntityPrompt(false)}
                  className="px-3 py-1 text-xs bg-emerald-700 text-white rounded-lg font-bold"
                >
                  اعتماد وتحديث
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedEntityPrompt(false)}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* ③ نوع الشخص المعنوي (Entity Nature & Subtypes) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              ③ حدد طبيعة ونوع الشخص المعنوي
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[
                { id: 'شركة_تجارية', label: 'شركة تجارية', badge: 'قانون 5.96 / 17.95' },
                { id: 'تعاونية', label: 'تعاونية', badge: 'قانون 112.12' },
                { id: 'جمعية', label: 'جمعية', badge: 'ظهير 1958' },
                { id: 'مؤسسة_أو_هيئة_عامة', label: 'مؤسسة / هيئة عامة', badge: 'قانون عام' },
                { id: 'شخص_معنوي_آخر', label: 'شخص معنوي آخر', badge: 'خاص' },
                { id: 'شخص_معنوي_أجنبي', label: 'شخص معنوي أجنبي', badge: 'استثمار دولي' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEntityNature(opt.id as any)}
                  className={`p-3 rounded-xl border-2 text-right transition flex flex-col justify-between ${
                    entityNature === opt.id
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono">{opt.badge}</span>
                </button>
              ))}
            </div>

            {/* Subtypes for Commercial Companies */}
            {entityNature === 'شركة_تجارية' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  اختر الشكل القانوني الدقيق للشركة التجارية:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {COMMERCIAL_SUBTYPES.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCompanySubtype(st.id)}
                      className={`px-3 py-2 rounded-lg text-right text-xs transition border ${
                        companySubtype === st.id
                          ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold">{st.id}</div>
                      <div className="text-[10px] opacity-80">{st.law}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notice for Cooperative (Law 112.12) */}
            {entityNature === 'تعاونية' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                ⚖️ <strong>مقتضيات خاصة بالتعاونيات:</strong> تطبق أحكام القانون رقم 112.12 المتعلق بالتعاونيات. يجب التأكد من موافقة مجلس الإدارة أو الجمع العام ومطابقة شراء العقار لأهداف التعاونية التنموية.
              </div>
            )}

            {/* Notice for Association */}
            {entityNature === 'جمعية' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                📜 <strong>مقتضيات خاصة بالجمعيات:</strong> يشترط توفر الوصل النهائي للإيداع القانوني وملاءمة الشراء مع مقتضيات الظهير الشريف المنظم لحق تأسيس الجمعيات، وتوفر الممثل على تفويض خاص.
              </div>
            )}

            {/* Special engine for Foreign Legal Entity (㉞) */}
            {entityNature === 'شخص_معنوي_أجنبي' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  🌍 متطلبات الشركات والأشخاص المعنوية الأجنبية
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">دولة التأسيس:</label>
                    <input
                      type="text"
                      value={foreignOriginCountry}
                      onChange={e => setForeignOriginCountry(e.target.value)}
                      placeholder="مثال: فرنسا، إسبانيا..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم التسجيل الأجنبي:</label>
                    <input
                      type="text"
                      value={foreignRegistrationNumber}
                      onChange={e => setForeignRegistrationNumber(e.target.value)}
                      placeholder="رقم السجل الأجنبي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="cbApostille"
                      checked={foreignHasApostille}
                      onChange={e => setForeignHasApostille(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <label htmlFor="cbApostille" className="text-xs font-bold text-slate-800">
                      شهادة الأبوستيل / التصديق القنصلي
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="cbTranslation"
                      checked={foreignHasTranslation}
                      onChange={e => setForeignHasTranslation(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <label htmlFor="cbTranslation" className="text-xs font-bold text-slate-800">
                      ترجمة رسمية محلفة للوثائق
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ④ بطاقة هوية الشخص المعنوي (Entity Identity Card) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              ④ بطاقة هوية الشخص المعنوي 🏢
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الاسم القانوني الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  placeholder="مثال: شركة المغرب للإنماء العقاري"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الاسم التجاري (إن وجد):
                </label>
                <input
                  type="text"
                  value={commercialName}
                  onChange={e => setCommercialName(e.target.value)}
                  placeholder="الاسم التجاري أو العلامة"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الشكل القانوني:
                </label>
                <input
                  type="text"
                  value={legalForm}
                  onChange={e => setLegalForm(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رقم السجل التجاري (RC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rcNumber}
                  onChange={e => setRcNumber(e.target.value)}
                  placeholder="مثال: 123456"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  المحكمة المختصة بالسجل التجاري:
                </label>
                <input
                  type="text"
                  value={rcCourt}
                  onChange={e => setRcCourt(e.target.value)}
                  placeholder="مثال: طنجة، الرباط، الدار البيضاء..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  المعرف الموحد للمقاولة (ICE) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ice}
                  onChange={e => setIce(e.target.value)}
                  placeholder="15 رقماً"
                  maxLength={15}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  المعرف الضريبي (IF):
                </label>
                <input
                  type="text"
                  value={ifNumber}
                  onChange={e => setIfNumber(e.target.value)}
                  placeholder="الرقم الضريبي"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  المقر الاجتماعي (العنوان الكامل):
                </label>
                <input
                  type="text"
                  value={headquarters}
                  onChange={e => setHeadquarters(e.target.value)}
                  placeholder="شارع، رقم، عمارة..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  المدينة والدولة:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="المدينة"
                    className="w-1/2 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="الدولة"
                    className="w-1/2 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  تاريخ التأسيس:
                </label>
                <input
                  type="date"
                  value={creationDate}
                  onChange={e => setCreationDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الغرض / النشاط الاجتماعي المصرح به:
                </label>
                <input
                  type="text"
                  value={corporatePurpose}
                  onChange={e => setCorporatePurpose(e.target.value)}
                  placeholder="مثال: المعاملات العقارية، الاستثمار، التشييد والبناء..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Legal Status of Entity (حالة الشخص المعنوي) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 mb-2">
                حالة الشخص المعنوي الحالية: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'نشط', label: '🟢 نشط ومزاول', color: 'border-emerald-500 bg-emerald-50 text-emerald-950' },
                  { id: 'في_طور_التصفية', label: '🟠 في طور التصفية', color: 'border-amber-500 bg-amber-50 text-amber-950' },
                  { id: 'تحت_مسطرة_قضائية', label: '⚖️ صعوبات مقاولة / قضائي', color: 'border-purple-500 bg-purple-50 text-purple-950' },
                  { id: 'مشطوب', label: '🔴 مشطوب / متوقف', color: 'border-red-500 bg-red-50 text-red-950' },
                  { id: 'أخرى', label: '⚪ حالة أخرى', color: 'border-slate-300 bg-slate-50 text-slate-800' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setLegalStatus(st.id as any)}
                    className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition ${
                      legalStatus === st.id
                        ? `${st.color} shadow-xs font-black ring-2 ring-slate-400/20`
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ⑫ Liquidation Details (إذا كان الشخص المعنوي في طور التصفية) */}
            {legalStatus === 'في_طور_التصفية' && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                <h4 className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                  🗄️ وضعية التصفية والمصفي القانوني
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">سند تعيين المصفي:</label>
                    <input
                      type="text"
                      value={liquidatorDoc}
                      onChange={e => setLiquidatorDoc(e.target.value)}
                      placeholder="محضر جمع عام / حكم قضائي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التعيين:</label>
                    <input
                      type="date"
                      value={liquidatorDate}
                      onChange={e => setLiquidatorDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">حدود وصلاحيات المصفي:</label>
                    <input
                      type="text"
                      value={liquidatorLimits}
                      onChange={e => setLiquidatorLimits(e.target.value)}
                      placeholder="صلاحيات المصفي في البيع والشراء"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <input
                    type="checkbox"
                    id="cbLiquidatorPurchase"
                      checked={hasPurchaseAuth}
                      onChange={e => setHasPurchaseAuth(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <label htmlFor="cbLiquidatorPurchase" className="text-xs font-bold text-slate-800">
                      يتوفر المصفي على إذن خاص لشراء عقار جديد
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ⑬ Judicial Receivership (إذا كان خاضعاً لمسطرة قضائية) */}
            {legalStatus === 'تحت_مسطرة_قضائية' && (
              <div className="bg-purple-50/70 border border-purple-300 rounded-xl p-4 space-y-3">
                <h4 className="font-black text-xs text-purple-950 flex items-center gap-1.5">
                  ⚖️ وضع قضائي خاص (صعوبات المقاولة / التسوية القضائية)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع المسطرة:</label>
                    <input
                      type="text"
                      value={courtProceedingType}
                      onChange={e => setCourtProceedingType(e.target.value)}
                      placeholder="إنقاذ / تسوية / حراسة قضائية"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة المختصة:</label>
                    <input
                      type="text"
                      value={proceedingCourt}
                      onChange={e => setProceedingCourt(e.target.value)}
                      placeholder="المحكمة التجارية بـ..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الملف / الحكم:</label>
                    <input
                      type="text"
                      value={proceedingCaseNum}
                      onChange={e => setProceedingCaseNum(e.target.value)}
                      placeholder="المحكمة التجارية ملف رقم..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم السنديك / المسؤول:</label>
                    <input
                      type="text"
                      value={judicialReceiver}
                      onChange={e => setJudicialReceiver(e.target.value)}
                      placeholder="الاسم الكامل"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الحكم / الإذن:</label>
                    <input
                      type="date"
                      value={proceedingDate}
                      onChange={e => setProceedingDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ⑤ وثائق هوية الشخص المعنوي وفحص المطابقة (Documents Checklist & Matching) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                ⑤ فحص ومطابقة وثائق الشخص المعنوي 📄
              </span>
              <span className="text-xs text-slate-500 font-normal">
                قائمة ديناميكية حسب شكل الكيان
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { state: docModel7, setter: setDocModel7, label: 'مستخرج حديث من السجل التجاري (نموذج 7)', req: true },
                { state: docBylaws, setter: setDocBylaws, label: 'النظام الأساسي المحدث والمصادق عليه', req: true },
                { state: docRepProof, setter: setDocRepProof, label: 'وثيقة إثبات صفة الممثل وسريان ولايته', req: true },
                { state: docGAMinutes, setter: setDocGAMinutes, label: 'محضر الجمع العام أو مجلس الإدارة', req: false },
                { state: docJudicialRecord, setter: setDocJudicialRecord, label: 'شهادة السجل العدلي للممثل القانوني', req: false },
                { state: docNonBankruptcy, setter: setDocNonBankruptcy, label: 'شهادة عدم الإفلاس أو فتح مساطر الصعوبات', req: true },
              ].map((doc, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    doc.state
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={doc.state}
                    onChange={e => doc.setter(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span>{doc.label}</span>
                    {doc.req && <span className="text-red-500 mr-1">*</span>}
                  </div>
                </label>
              ))}
            </div>

            {/* 🔐 Name Matching Cross-Check Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  فحص تطابق الاسم: (السجل التجاري ↕ النظام الأساسي ↕ المحرر العدلي)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBylawsNameMatch(true)}
                  className={`text-xs px-3 py-1 rounded-lg font-bold border ${
                    bylawsNameMatch
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  🟢 متطابق تماماً
                </button>
                <button
                  type="button"
                  onClick={() => setBylawsNameMatch(false)}
                  className={`text-xs px-3 py-1 rounded-lg font-bold border ${
                    !bylawsNameMatch
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  🟠 يوجد اختلاف
                </button>
              </div>
            </div>

            {!bylawsNameMatch && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 leading-relaxed animate-fade-in">
                ⚠️ <strong>تنبيه للمراجعة:</strong> يوجد اختلاف بين هوية الشخص المعنوي في الوثائق المدخلة والنظام الأساسي. يرجى التحقق من آخر تعديل مصادق عليه قبل اعتماد الرسم.
              </div>
            )}
          </div>

          {/* ⑥-⑧ بطاقة الممثل القانوني وسريان الصفة (Representative Card & Authority) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                ⑥ بطاقة الممثل القانوني للشخص المعنوي 👤
              </span>
              <span className="text-xs text-slate-500 font-normal">
                (يوقع بالصفة التمثيلية وليس أصالة عن نفسه)
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الاسم الكامل للممثل القانوني <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={repName}
                  onChange={e => setRepName(e.target.value)}
                  placeholder="الاسم الشخصي والعائلي"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رقم البطاقة الوطنية (CIN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={repCin}
                  onChange={e => setRepCin(e.target.value)}
                  placeholder="مثال: AB123456"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  صفة الحاضر في العقد: <span className="text-red-500">*</span>
                </label>
                <select
                  value={repCapacity}
                  onChange={e => setRepCapacity(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {REPRESENTATIVE_CAPACITIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ما مصدر الصفة؟ <span className="text-red-500">*</span>
                </label>
                <select
                  value={repAuthoritySource}
                  onChange={e => setRepAuthoritySource(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {AUTHORITY_SOURCES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رقم وثيقة التعيين / المرجع:
                </label>
                <input
                  type="text"
                  value={repAuthorityDocNum}
                  onChange={e => setRepAuthorityDocNum(e.target.value)}
                  placeholder="رقم المحضر أو الإيداع بالسجل التجاري"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  تاريخ وثيقة التعيين:
                </label>
                <input
                  type="date"
                  value={repAuthorityDocDate}
                  onChange={e => setRepAuthorityDocDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">تاريخ الازدياد:</label>
                <input
                  type="date"
                  value={repDob}
                  onChange={e => setRepDob(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">الجنسية:</label>
                <input
                  type="text"
                  value={repNationality}
                  onChange={e => setRepNationality(e.target.value)}
                  placeholder="مغربية"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  تاريخ بدء الصفة:
                </label>
                <input
                  type="date"
                  value={repCapacityStartDate}
                  onChange={e => setRepCapacityStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  مدة الصفة:
                </label>
                <input
                  type="text"
                  value={repCapacityDuration}
                  onChange={e => setRepCapacityDuration(e.target.value)}
                  placeholder="غير محددة / 3 سنوات..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  عنوان السكن:
                </label>
                <input
                  type="text"
                  value={repAddress}
                  onChange={e => setRepAddress(e.target.value)}
                  placeholder="العنوان الكامل للممثل"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            {/* ⑧ التحقق من استمرار الصفة (Capacity Continuity Check) */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  هل صفة الممثل القانوني سارية المفعول دون عزل أو انتهاء مدة؟ <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  مطابقة مستخرج RC حديث + وثيقة التعيين + النظام الأساسي
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: 'نعم', label: '🟢 نعم سارية', color: 'bg-emerald-700 text-white' },
                  { id: 'تحتاج_تحقق', label: '🟠 تحتاج تحقق', color: 'bg-amber-600 text-white' },
                  { id: 'غير_ثابتة', label: '🔴 غير ثابتة (منع)', color: 'bg-red-700 text-white' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRepIsCapacityValid(opt.id as any)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition ${
                      repIsCapacityValid === opt.id
                        ? `${opt.color} shadow-xs`
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ⑨ طريقة التمثيل (Single vs Joint Representation) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 mb-2">
                طريقة التمثيل والتوقيع:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { id: 'منفرد', label: '🔘 منفرد بمفرده' },
                  { id: 'توقيع_مشترك', label: '👥 بتوقيع مشترك' },
                  { id: 'مجتمع', label: 'مجتمعاً مع غيره' },
                  { id: 'تفويض_خاص', label: 'بتفويض خاص' },
                  { id: 'حسب_النظام_الأساسي', label: 'حسب النظام الأساسي' },
                  { id: 'حسب_قرار_الهيئة', label: 'حسب قرار الهيئة' },
                ].map(rm => (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => setRepMode(rm.id as any)}
                    className={`text-xs p-2 rounded-xl border text-center transition font-bold ${
                      repMode === rm.id
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {rm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Joint Representation Card */}
            {repMode === 'توقيع_مشترك' && (
              <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-4 space-y-3 animate-fade-in">
                <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  👥 بيانات الممثل القانوني الثاني (التوقيع المشترك المطلوب)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                    <input
                      type="text"
                      value={rep2Name}
                      onChange={e => setRep2Name(e.target.value)}
                      placeholder="اسم الممثل الثاني"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة (CIN):</label>
                    <input
                      type="text"
                      value={rep2Cin}
                      onChange={e => setRep2Cin(e.target.value)}
                      placeholder="رقم بطاقة الممثل الثاني"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">صفته بالشركة:</label>
                    <input
                      type="text"
                      value={rep2Capacity}
                      onChange={e => setRep2Capacity(e.target.value)}
                      placeholder="مسير مشارك / مدير عام مساعد"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ⑩-⑪ الغرض الاجتماعي ومداولة الهيئة المختصة (Special Approvals) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              ⑩ مطابقة الغرض الاجتماعي ومداولات الهيئة المختصة ⚖️
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purpose Compliance */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="block text-xs font-bold text-slate-900">
                  هل شراء هذا العقار يدخل ضمن الغرض الاجتماعي للشخص المعنوي؟
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'نعم', label: '🟢 نعم مطابق' },
                    { id: 'تحتاج_مراجعة', label: '🟠 يحتاج مراجعة' },
                    { id: 'يوجد_تعارض_ظاهر', label: '🔴 تعارض ظاهر' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPurposeCompliance(p.id as any)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition ${
                        purposeCompliance === p.id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Approval Requirement */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="block text-xs font-bold text-slate-900">
                  هل توجد وثيقة أو مقتضى يوجب موافقة خاصة لإتمام الشراء؟
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'لا', label: 'لا (صلاحيات عادية)' },
                    { id: 'نعم', label: 'نعم (يوجد ترخيص)' },
                    { id: 'يحتاج_مراجعة', label: 'غير واضح' },
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setRequiresSpecialApproval(a.id as any)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition ${
                        requiresSpecialApproval === a.id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {requiresSpecialApproval === 'نعم' && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-fade-in">
                <h4 className="font-bold text-xs text-emerald-950">بيانات قرار / محضر الموافقة الخاصة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الهيئة:</label>
                    <input
                      type="text"
                      value={specialApprovalAuthority}
                      onChange={e => setSpecialApprovalAuthority(e.target.value)}
                      placeholder="الجمع العام غير العادي / مجلس الإدارة"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الاجتماع:</label>
                    <input
                      type="date"
                      value={specialMeetingDate}
                      onChange={e => setSpecialMeetingDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم المحضر:</label>
                    <input
                      type="text"
                      value={specialMinutesNumber}
                      onChange={e => setSpecialMinutesNumber(e.target.value)}
                      placeholder="رقم المحضر أو إيداعه"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">موضوع الترخيص:</label>
                    <input
                      type="text"
                      value={specialApprovalSubject}
                      onChange={e => setSpecialApprovalSubject(e.target.value)}
                      placeholder="الترخيص باقتناء العقار"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation to Stage 2 */}
          <div className="flex justify-between items-center pt-2">
            <div></div>
            <button
              type="button"
              onClick={() => setStage(2)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <span>الانتقال إلى ② الطرف البائع</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: الطرف البائع (SELLERS ENGINE)                                    */}
      {/* ========================================================================= */}
      {stage === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  ⑪ بطاقة البائع (الطرف الثاني المنقولة منه الملكية)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل بيانات البائعين (أشخاص ذاتيون أو معنويون) مع نسب الحصص وتفاصيل الوكالة إن وجدت.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEqualizeSellerShares}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition"
                  title="توزيع الحصص بالتساوي على جميع البائعين"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-600" />
                  <span>توزيع الحصص بالتساوي</span>
                </button>
                <button
                  type="button"
                  onClick={addSeller}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>إضافة بائع</span>
                </button>
              </div>
            </div>

            {/* Sellers List */}
            <div className="space-y-4">
              {sellers.map((seller, idx) => (
                <div key={seller.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      البائع رقم ({idx + 1})
                    </span>
                    {sellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSeller(idx)}
                        className="text-red-600 hover:text-red-700 p-1 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                      <input
                        type="text"
                        value={seller.fullName}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].fullName = e.target.value;
                          setSellers(updated);
                        }}
                        placeholder="الاسم الكامل للبائع"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة (CIN/RC):</label>
                      <input
                        type="text"
                        value={seller.idNumber}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].idNumber = e.target.value;
                          setSellers(updated);
                        }}
                        placeholder="رقم التعريف"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الحصة في العقار:</label>
                      <input
                        type="text"
                        value={seller.share}
                        onChange={e => handleSellerShareChange(idx, e.target.value)}
                        placeholder="مثال: 100% أو 1/2"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة الحضور:</label>
                      <select
                        value={seller.representationMode}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].representationMode = e.target.value as any;
                          setSellers(updated);
                        }}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="شخصي">حضور شخصي بالأصالة</option>
                        <option value="وكيل">ينوب عنه وكيل</option>
                        <option value="ممثل_قانوني">ينوب عنه نائب شرعي / ولي</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان الكامل:</label>
                      <input
                        type="text"
                        value={seller.address}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].address = e.target.value;
                          setSellers(updated);
                        }}
                        placeholder="محل السكن أو المقر"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة:</label>
                      <input
                        type="text"
                        value={seller.profession}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].profession = e.target.value;
                          setSellers(updated);
                        }}
                        placeholder="المهنة"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنسية:</label>
                      <input
                        type="text"
                        value={seller.nationality}
                        onChange={e => {
                          const updated = [...sellers];
                          updated[idx].nationality = e.target.value as any;
                          setSellers(updated);
                        }}
                        placeholder="مغربي"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStage(1)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ①</span>
            </button>
            <button
              type="button"
              onClick={() => setStage(3)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <span>الانتقال إلى ③ محرك العقار المشترك</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: محرك العقار المشترك (SHARED PROPERTY ENGINE - ㊱)                 */}
      {/* ========================================================================= */}
      {stage === 3 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              ⑭-⑱ بطاقة العقار محل الشراء (محرك العقار المشترك)
            </h3>

            {/* Central Property Status Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">
                الوضعية القانونية للعقار محل الشراء: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'محفظ', label: 'عقار محفظ', desc: 'له رسم عقاري نهائي ومسجل بالمحافظة العقارية', badge: 'رسم عقاري' },
                  { id: 'في_طور_التحفيظ', label: 'عقار في طور التحفيظ', desc: 'موضوع مطلب تحفيظ جارٍ بالمحافظة', badge: 'مطلب تحفيظ' },
                  { id: 'غير_محفظ', label: 'عقار غير محفظ', desc: 'ملك عادي يستند إلى رسم ملكية عدلية أو سند شرعي', badge: 'ملك عدلي' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPropStatus(opt.id as any)}
                    className={`p-3.5 rounded-xl border-2 text-right transition flex flex-col justify-between ${
                      propStatus === opt.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border font-mono">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Registered Property Fields (⑮) */}
            {propStatus === 'محفظ' && (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-fade-in">
                <h4 className="font-bold text-xs text-emerald-950">بيانات الرسم العقاري بالمحافظة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الرسم العقاري: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={propTitleNumber}
                      onChange={e => setPropTitleNumber(e.target.value)}
                      placeholder="مثال: 06/123456"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العقاري:</label>
                    <input
                      type="text"
                      value={propTitleName}
                      onChange={e => setPropTitleName(e.target.value)}
                      placeholder="مثال: أرض السعادة / دار السلام"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحافظة العقارية المختصة:</label>
                    <input
                      type="text"
                      value={propConservation}
                      onChange={e => setPropConservation(e.target.value)}
                      placeholder="مثال: محافظة طنجة المدينة"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* In Requisition Fields (⑰) */}
            {propStatus === 'في_طور_التحفيظ' && (
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-blue-950">بيانات مطلب التحفيظ:</h4>
                  <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                    تنبيه: العقار في طور التحفيظ وتخضع حقوق المشتري لمآل المسطرة
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم مطلب التحفيظ:</label>
                    <input
                      type="text"
                      value={propRequisitionNumber}
                      onChange={e => setPropRequisitionNumber(e.target.value)}
                      placeholder="مثال: 06/78910"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ إيداع المطلب:</label>
                    <input
                      type="date"
                      value={propRequisitionDate}
                      onChange={e => setPropRequisitionDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحافظة العقارية:</label>
                    <input
                      type="text"
                      value={propConservation}
                      onChange={e => setPropConservation(e.target.value)}
                      placeholder="المحافظة العقارية المختصة"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Unregistered Melk Fields (⑯) */}
            {propStatus === 'غير_محفظ' && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3 animate-fade-in">
                <h4 className="font-bold text-xs text-amber-950">بيانات الملك العدلي والحدود الأربعة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">شمالاً:</label>
                    <input
                      type="text"
                      value={propBoundaries.north}
                      onChange={e => setPropBoundaries({ ...propBoundaries, north: e.target.value })}
                      placeholder="الحد الشمالي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">جنوباً:</label>
                    <input
                      type="text"
                      value={propBoundaries.south}
                      onChange={e => setPropBoundaries({ ...propBoundaries, south: e.target.value })}
                      placeholder="الحد الجنوبي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">شرقاً:</label>
                    <input
                      type="text"
                      value={propBoundaries.east}
                      onChange={e => setPropBoundaries({ ...propBoundaries, east: e.target.value })}
                      placeholder="الحد الشرقي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">غرباً:</label>
                    <input
                      type="text"
                      value={propBoundaries.west}
                      onChange={e => setPropBoundaries({ ...propBoundaries, west: e.target.value })}
                      placeholder="الحد الغربي"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">أصل التملك وسند الملكية:</label>
                    <input
                      type="text"
                      value={propOriginDeed}
                      onChange={e => setPropOriginDeed(e.target.value)}
                      placeholder="رسم ملكية عدلية / شراء / إرث..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مراجع رسم الملكية:</label>
                    <input
                      type="text"
                      value={propOriginRef}
                      onChange={e => setPropOriginRef(e.target.value)}
                      placeholder="كناش، عدد، صحيفة، تاريخ، محكمة..."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General Property Physical Details (⑱) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">موقع العقار / العنوان:</label>
                <input
                  type="text"
                  value={propLocation}
                  onChange={e => setPropLocation(e.target.value)}
                  placeholder="شارع، حي، جماعة، إقليم..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">المساحة الإجمالية:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={propAreaNumber ?? ''}
                    onChange={e => setPropAreaNumber(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="المساحة رقماً"
                    className="w-2/3 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                  />
                  <select
                    value={propAreaUnit}
                    onChange={e => setPropAreaUnit(e.target.value)}
                    className="w-1/3 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="متر_مربع">م²</option>
                    <option value="هكتار">هكتار</option>
                    <option value="آر">آر</option>
                    <option value="سنتيار">سنتيار</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">المشتملات والمكونات:</label>
                <input
                  type="text"
                  value={propComponents}
                  onChange={e => setPropComponents(e.target.value)}
                  placeholder="أرض عارية / فيلا / شقة / طوابق / محلات..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Encumbrances Cross-Check (سلامة العقار من التحملات والرهون) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  هل يتحمل العقار بأي رهن أو حجز أو ارتفاقات غير مطهرة؟
                </span>
                <span className="text-[11px] text-slate-500">
                  الأصل هو طهارة المبيع وسلامته من أي دين عيني أو استحقاق
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasEncumbrances('لا')}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold border ${
                    hasEncumbrances === 'لا'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  🟢 طاهر وخالٍ من التحملات
                </button>
                <button
                  type="button"
                  onClick={() => setHasEncumbrances('نعم')}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold border ${
                    hasEncumbrances === 'نعم'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  🟠 توجد تحملات مصرح بها
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStage(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ②</span>
            </button>
            <button
              type="button"
              onClick={() => setStage(4)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <span>الانتقال إلى ④ الثمن والتمويل والأداء</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: الثمن وطريقة الأداء والتمويل (FINANCE & FUNDS SOURCE)              */}
      {/* ========================================================================= */}
      {stage === 4 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              ⑲-㉑ الثمن الإجمالي وطريقة الأداء ومصدر تمويل الشخص المعنوي
            </h3>

            {/* Price in Numbers & Auto Words */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الثمن الإجمالي للبيع (بالدرهم): <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={totalPrice || ''}
                  onChange={e => setTotalPrice(Number(e.target.value))}
                  placeholder="مثال: 1500000"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الثمن بالحروف العربية الفصيحة (تلقائي):
                </label>
                <input
                  type="text"
                  value={totalPriceWords}
                  onChange={e => setTotalPriceWords(e.target.value)}
                  placeholder="فقط مليون وخمسمائة ألف درهم لا غير"
                  className="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Tax Inclusion Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="cbTaxInc"
                checked={isTaxInclusive}
                onChange={e => setIsTaxInclusive(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <label htmlFor="cbTaxInc" className="text-xs font-bold text-slate-800">
                الثمن يشمل جميع الرسوم والضرائب التوثيقية والجبائية المستحقة
              </label>
            </div>

            {/* ㉑ Source of Funds (مصدر أموال الشخص المعنوي) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                💳 مصدر تمويل وأموال الشخص المعنوي: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'أموال_الشركة', label: 'أموال ذاتية للشركة' },
                  { id: 'تمويل_بنكي', label: 'تمويل بنكي مصرفي' },
                  { id: 'قرض', label: 'قرض مالي' },
                  { id: 'مساهمة_شركاء', label: 'مساهمة الشركاء' },
                  { id: 'آخر', label: 'مصدر تمويلي آخر' },
                ].map(src => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSourceOfFunds(src.id as any)}
                    className={`text-xs p-2.5 rounded-xl border text-center font-bold transition ${
                      sourceOfFunds === src.id
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
              {sourceOfFunds !== 'أموال_الشركة' && (
                <input
                  type="text"
                  value={sourceOfFundsNotes}
                  onChange={e => setSourceOfFundsNotes(e.target.value)}
                  placeholder="بيان مرجع التمويل البنكي، اسم المصرف، ورقم عقد التمويل..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl mt-2"
                />
              )}
            </div>

            {/* Payment Method Selector (⑳) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                وسيلة الأداء الأساسية:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'شيك بنكي مصادق عليه',
                  'تحويل بنكي من حساب الشركة',
                  'كمبيالة / سند لأمر',
                  'نقد بمجلس العقد (في حدود المسموح قانوناً)',
                  'دفعة واحدة ناجزة',
                  'دفعات مقسطة',
                ].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (paymentWays.includes(m)) {
                        if (paymentWays.length > 1) {
                          setPaymentWays(paymentWays.filter(x => x !== m));
                        }
                      } else {
                        setPaymentWays([...paymentWays, m]);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                      paymentWays.includes(m)
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Earnest Section (العربون والتسبيق المعجل) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  هل تم أداء عربون أو تسبيق معجل بمجلس العقد؟
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasEarnest(false)}
                    className={`text-xs px-3 py-1 rounded-lg border font-bold ${
                      !hasEarnest ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    لا (مؤدى بالكامل)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasEarnest(true)}
                    className={`text-xs px-3 py-1 rounded-lg border font-bold ${
                      hasEarnest ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    نعم (يوجد تسبيق)
                  </button>
                </div>
              </div>

              {hasEarnest && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">مبلغ العربون المؤدى:</label>
                      <input
                        type="number"
                        value={earnestAmount || ''}
                        onChange={e => setEarnestAmount(Number(e.target.value))}
                        placeholder="المبلغ بالدرهم"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">وسيلة أداء العربون:</label>
                      <input
                        type="text"
                        value={earnestMethod}
                        onChange={e => setEarnestMethod(e.target.value)}
                        placeholder="شيك مصادق / تحويل"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المصرف المسحوب عليه:</label>
                      <input
                        type="text"
                        value={earnestBank}
                        onChange={e => setEarnestBank(e.target.value)}
                        placeholder="اسم البنك"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم شيك / تحويل العربون:</label>
                      <input
                        type="text"
                        value={earnestRef}
                        onChange={e => setEarnestRef(e.target.value)}
                        placeholder="رقم المرجع أو الشيك"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ أداء العربون:</label>
                      <input
                        type="date"
                        value={earnestDate}
                        onChange={e => setEarnestDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">أجل أداء المتبقي:</label>
                      <input
                        type="date"
                        value={remainingDueDate}
                        onChange={e => setRemainingDueDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-emerald-950 font-bold bg-white p-2.5 rounded-lg border border-emerald-200">
                    المبلغ المتبقي بذمة الشخص المعنوي المشتري: [ {(Math.max(0, totalPrice - earnestAmount)).toLocaleString()} درهم ]
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStage(3)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ③</span>
            </button>
            <button
              type="button"
              onClick={() => setStage(5)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <span>الانتقال إلى ⑤ الوكالة والقرارات الخاصة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: الوكالة والقرارات والبيانات الجبائية (POAs & LOCAL REGISTRY)       */}
      {/* ========================================================================= */}
      {stage === 5 && (
        <div className="space-y-6">
          
          {/* ㉒-㉔ Agency & Real Estate POA (سلسلة التمثيل والمرسوم 2.23.101) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  ㉒-㉔ سلسلة التمثيل: هل تم الشراء بوكالة عن الممثل القانوني؟
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تطبيق مقتضيات المرسوم 2.23.101 المتعلق بالسجل المحلي للوكالات الخاصة بالحقوق العينية.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasSubAgent(false)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-bold ${
                    !hasSubAgent ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  لا (حضور مباشر للممثل)
                </button>
                <button
                  type="button"
                  onClick={() => setHasSubAgent(true)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-bold ${
                    hasSubAgent ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  نعم (حضور وكيل عن الممثل)
                </button>
              </div>
            </div>

            {hasSubAgent && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Representation Chain (㉒) */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-950">
                  <span>🏢 {legalName || 'الشركة'}</span>
                  <span>←</span>
                  <span>👤 الممثل: {repName || 'الممثل القانوني'}</span>
                  <span>←</span>
                  <span className="text-emerald-700 underline">📜 وكالة خاصة</span>
                  <span>←</span>
                  <span>🧑💼 الوكيل: {subAgentName || 'الوكيل المفوض'}</span>
                  <span>←</span>
                  <span>🏡 شراء العقار</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">اسم الوكيل الكامل:</label>
                    <input
                      type="text"
                      value={subAgentName}
                      onChange={e => setSubAgentName(e.target.value)}
                      placeholder="اسم الوكيل الحاضر"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">رقم بطاقته (CIN):</label>
                    <input
                      type="text"
                      value={subAgentCin}
                      onChange={e => setSubAgentCin(e.target.value)}
                      placeholder="رقم بطاقة الوكيل"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">عنوان الوكيل:</label>
                    <input
                      type="text"
                      value={subAgentAddress}
                      onChange={e => setSubAgentAddress(e.target.value)}
                      placeholder="محل سكن الوكيل"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Original Notarial POA References */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800">مراجع الوكالة العدلية الأصلية:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">محكمة التوثيق:</label>
                      <input
                        type="text"
                        value={subAgentCourt}
                        onChange={e => setSubAgentCourt(e.target.value)}
                        placeholder="محكمة التوثيق"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الكناش:</label>
                      <input
                        type="text"
                        value={subAgentBook}
                        onChange={e => setSubAgentBook(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">العدد:</label>
                      <input
                        type="text"
                        value={subAgentNumber}
                        onChange={e => setSubAgentNumber(e.target.value)}
                        placeholder="العدد"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الصحيفة:</label>
                      <input
                        type="text"
                        value={subAgentPage}
                        onChange={e => setSubAgentPage(e.target.value)}
                        placeholder="الصحيفة"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">التاريخ:</label>
                      <input
                        type="date"
                        value={subAgentDate}
                        onChange={e => setSubAgentDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* ㉔ Local Registry of Real Estate POAs (مرسوم 2.23.101) */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                      🏛️ تقييد الوكالة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية (المرسوم 2.23.101)
                    </h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="cbSubAgentRealEstate"
                        checked={subAgentIsRealEstatePoa}
                        onChange={e => setSubAgentIsRealEstatePoa(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <label htmlFor="cbSubAgentRealEstate" className="text-[11px] font-bold text-purple-950 cursor-pointer">
                        وكالة عقارية خاضعة للسجل المحلي (مرسوم 2.23.101)
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة الابتدائية:</label>
                      <input
                        type="text"
                        value={subAgentLocalRegCourt}
                        onChange={e => setSubAgentLocalRegCourt(e.target.value)}
                        placeholder="المحكمة المسجل بها السجل المحلي"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم التقييد بالسجل المحلي:</label>
                      <input
                        type="text"
                        value={subAgentLocalRegNum}
                        onChange={e => setSubAgentLocalRegNum(e.target.value)}
                        placeholder="الرقم الترتيبي بالسجل"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التقييد بالسجل:</label>
                      <input
                        type="date"
                        value={subAgentLocalRegDate}
                        onChange={e => setSubAgentLocalRegDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tax, Registration & Notarial Court Data */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              المعطيات التوثيقية والجبائية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">المحكمة الابتدائية:</label>
                <input
                  type="text"
                  value={court}
                  onChange={e => setCourt(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">القسم القضائي:</label>
                <input
                  type="text"
                  value={courtSection}
                  onChange={e => setCourtSection(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">العدل الأول:</label>
                <input
                  type="text"
                  value={notaryPrimary}
                  onChange={e => setNotaryPrimary(e.target.value)}
                  placeholder="اسم العدل الأول"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">العدل الثاني:</label>
                <input
                  type="text"
                  value={notarySecondary}
                  onChange={e => setNotarySecondary(e.target.value)}
                  placeholder="اسم العدل الثاني"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">تاريخ تلقي الإشهاد:</label>
                <input
                  type="date"
                  value={intakeDate}
                  onChange={e => setIntakeDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">مكتب التسجيل والتمبر:</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={e => setTaxOffice(e.target.value)}
                  placeholder="مكتب قباضة التسجيل"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">رقم وصل التسجيل:</label>
                <input
                  type="text"
                  value={taxReceipt}
                  onChange={e => setTaxReceipt(e.target.value)}
                  placeholder="رقم الوصل أو الإيداع الجبائي"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">تاريخ أداء واجبات التسجيل:</label>
                <input
                  type="date"
                  value={taxDate}
                  onChange={e => setTaxDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">مبلغ واجبات التسجيل المؤداة:</label>
                <input
                  type="number"
                  value={taxAmount ?? ''}
                  onChange={e => setTaxAmount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="المبلغ بالدرهم"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStage(4)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ④</span>
            </button>
            <button
              type="button"
              onClick={() => setStage(6)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition"
            >
              <span>الانتقال إلى ⑥ التدقيق والاعتماد والمعاينة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 6: التدقيق والاعتماد والمعاينة والزر الأحمر (AUDIT, DRAFT & TRANSIT) */}
      {/* ========================================================================= */}
      {stage === 6 && (
        <div className="space-y-6">

          {/* ㉖ بطاقة «من يشتري؟» الذكية (Authoritative Representation Card) */}
          <div className="bg-linear-to-r from-emerald-900 to-teal-950 text-white border-2 border-emerald-500 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
              <h3 className="font-black text-sm flex items-center gap-2 text-emerald-200">
                <Shield className="w-4 h-4 text-emerald-400" />
                ㉖ بطاقة «من يشتري؟» الذكية (منع الخلط بين الشركة وممثلها)
              </h3>
              <span className="text-[10px] bg-emerald-800/80 px-2.5 py-1 rounded-full border border-emerald-400/40 text-emerald-200">
                قاعدة توثيقية حاسمة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="block text-emerald-300 text-[10px] font-bold">🏢 المشتري الحقيقي (المالك):</span>
                <span className="font-black text-sm text-white mt-1 block">{legalName || '---'}</span>
                <span className="text-[10px] text-emerald-200/80 mt-0.5 block">{legalForm}</span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="block text-emerald-300 text-[10px] font-bold">👤 الممثل القانوني الحاضر:</span>
                <span className="font-black text-sm text-white mt-1 block">{repName || '---'}</span>
                <span className="text-[10px] text-emerald-200/80 mt-0.5 block">ب.ت.و: {repCin || '---'}</span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="block text-emerald-300 text-[10px] font-bold">⚖️ صفته ومصدر الصلاحية:</span>
                <span className="font-bold text-white mt-1 block">{repCapacity}</span>
                <span className="text-[10px] text-emerald-200/80 mt-0.5 block">بمقتضى: {repAuthoritySource}</span>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="block text-emerald-300 text-[10px] font-bold">✍️ صفة التوقيع في الرسم:</span>
                <span className="font-black text-emerald-200 mt-1 block">
                  «بصفته ممثلاً قانونياً للشركة المشترية»
                </span>
                <span className="text-[10px] text-emerald-300/80 mt-0.5 block">توقيع نيابي ملزم للكيان</span>
              </div>
            </div>
          </div>

          {/* ㉕ & ㊲ لوحة الفحص القانوني الشامل قبل الاعتماد (Comprehensive Audit Board) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ㉕ و ㊲ الفحص القانوني والتدقيق الذاتي قبل الاعتماد
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                verificationStatus === 'مكتمل' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
              }`}>
                {verificationStatus === 'مكتمل' ? 'جاهز للاعتماد' : 'قيد المراجعة'}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {[
                { label: 'هوية الكيان', ok: Boolean(legalName && rcNumber), val: legalName ? '🟢' : '🔴' },
                { label: 'الوضعية القانونية', ok: legalStatus !== 'مشطوب', val: legalStatus !== 'مشطوب' ? '🟢' : '🔴' },
                { label: 'مطابقة الوثائق', ok: bylawsNameMatch && docModel7, val: bylawsNameMatch && docModel7 ? '🟢' : '🟠' },
                { label: 'سريان صفة الممثل', ok: repIsCapacityValid === 'نعم', val: repIsCapacityValid === 'نعم' ? '🟢' : '🔴' },
                { label: 'محرك العقار', ok: Boolean(propStatus), val: '🟢' },
                { label: 'الثمن والتمويل', ok: totalPrice > 0, val: totalPrice > 0 ? '🟢' : '🔴' },
                { label: 'الوكالة العقارية', ok: !hasSubAgent || Boolean(subAgentLocalRegNum), val: '🟢' },
              ].map((c, i) => (
                <div key={i} className={`p-2.5 rounded-xl border text-center text-xs ${c.ok ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'}`}>
                  <span className="block text-sm mb-1">{c.val}</span>
                  <span className="text-[11px] font-bold text-slate-800">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ㉚ سؤال الاعتماد الذكي قبل التحرير (Smart Adoption Confirmation) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              🧠 ㉚ سؤال التحقق والاعتماد التوثيقي
            </h4>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-800 font-bold">
                  هل تريد اعتماد هوية الشخص المعنوي وممثله كما تم التحقق منهما في هذه العملية؟
                </span>
                <div className="flex items-center gap-2">
                  {(['نعم', 'تعديل', 'إيقاف_للمراجعة'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setConfirmEntityAdoption(opt)}
                      className={`text-xs px-3 py-1 rounded-lg font-bold border ${
                        confirmEntityAdoption === opt
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {opt === 'نعم' ? 'نعم، اعتماد' : opt === 'تعديل' ? 'تعديل' : 'إيقاف للمراجعة'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-800 font-bold">
                  هل تم التحقق من أن الشخص الموقع يمثل الشخص المعنوي بهذه الصفة وقت إبرام العقد؟
                </span>
                <div className="flex items-center gap-2">
                  {(['نعم', 'يحتاج_مراجعة'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setConfirmRepAtSigning(opt)}
                      className={`text-xs px-3 py-1 rounded-lg font-bold border ${
                        confirmRepAtSigning === opt
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {opt === 'نعم' ? 'نعم، مؤكد' : 'يحتاج مراجعة'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ㉛ & ㉜ المعاينة التوثيقية التلقائية والصياغة الرسمية (Authoritative Draft Preview) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                ㉛ مشروع رسم الشراء (صياغة عدلية معتمدة وفق التشريع المغربي)
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                صيغة «اشترت شركة (...) في شخص ممثلها (...)»
              </span>
            </div>

            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-600">
              {generateSaleEntityDraft({
                ...state,
                saleEntityDeed: buildCurrentDeedState(),
              })}
            </div>
          </div>

          {/* ⑯ PROMINENT RED BUTTON (زر الاعتماد والانتقال للخطوة 7) */}
          <div className="bg-red-950/20 border-2 border-red-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl shadow-red-950/5">
            <div>
              <h3 className="font-black text-base text-red-950 flex items-center justify-center gap-2">
                <Send className="w-5 h-5 text-red-600" />
                اعتماد رسم الشراء وإرساله للمراجعة الذكية والتوثيق
              </h3>
              <p className="text-xs text-slate-600 max-w-xl mx-auto mt-1 leading-relaxed">
                بالضغط على الزر أدناه، سيتم تجميع كافة معطيات الشخص المعنوي والممثل والعقار والثمن بصيغة رسمية معتمدة وفق التوثيق العدلي المغربي، والانتقال مباشرة إلى الخطوة 7 للتدقيق القضائي والتأشير والإرسال للقاضي المكلف بالتوثيق.
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedToStep7}
              disabled={isStruckOffOrBanned}
              className={`w-full sm:w-auto px-8 py-4 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 mx-auto transition-all transform active:scale-95 border cursor-pointer ${
                isStruckOffOrBanned
                  ? 'bg-slate-400 text-slate-600 border-slate-500 cursor-not-allowed'
                  : 'bg-linear-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 border-red-400/50 shadow-red-900/40 hover:scale-[1.02]'
              }`}
            >
              <Send className="w-5 h-5 text-white" />
              <span>اعتماد رسم الشراء والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
            </button>
          </div>

          {/* Back Navigation */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStage(5)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ⑤</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
