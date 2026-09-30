import React, { useState, useMemo, useEffect } from 'react';
import {
  Home,
  Users,
  Building2,
  FileText,
  DollarSign,
  Clock,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Copy,
  Plus,
  Trash2,
  HelpCircle,
  Briefcase,
  AlertCircle,
  FileCheck,
  Zap,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Send,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import {
  LeaseDeedState,
  LeaseOperationType,
  LeaseUsageNature,
  ApplicableLegalRegime,
  LessorPropertyRole,
  PropertyStatusType,
  RentPaymentFrequency,
  RentPaymentMethod,
  RenewalOptionType,
  GuaranteeType,
  CoLesseeItem,
  CoLessorItem,
  MeterReading,
  LeaseEventItem,
  LeaseNoticeItem,
  LeaseCaseLawItem,
} from './leaseTypes';
import { useAuth } from '../../../../contexts/AuthContext';
import { createEmptyParty, convertGregorianToHijri } from '../../../../utils/feesAgentUtils';

export const LeaseWizard: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  const { user, notaryProfile } = useAuth();

  // Primary court & notary identity derived dynamically (zero hardcoding)
  const defaultCourt =
    state.meta?.court ||
    notaryProfile?.primary_court ||
    notaryProfile?.court_name ||
    'المحكمة الابتدائية المختصة';
  const defaultNotary1 = state.meta?.notaryPrimary || user?.full_name || 'الأستاذ العدل المتلقي';
  const defaultNotary2 = state.meta?.notarySecondary || 'العدل المشارك';

  const todayGregorian = new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // Active Stage (1 to 11)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [activeFaqStage, setActiveFaqStage] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Operation & Purpose & Applicable Law Engine
  // ---------------------------------------------------------------------------
  const [operationType, setOperationType] = useState<LeaseOperationType>(
    state.leaseDeed?.operationType || 'إنشاء'
  );
  const [usageNature, setUsageNature] = useState<LeaseUsageNature>(
    state.leaseDeed?.usageNature || 'سكن_شخصي'
  );
  const [actualActivityDescription, setActualActivityDescription] = useState<string>(
    state.leaseDeed?.actualActivityDescription || ''
  );
  const [contractDate, setContractDate] = useState<string>(
    state.leaseDeed?.contractDate || todayGregorian
  );
  const [effectiveStartDate, setEffectiveStartDate] = useState<string>(
    state.leaseDeed?.effectiveStartDate || todayGregorian
  );
  const [effectiveEndDate, setEffectiveEndDate] = useState<string>(
    state.leaseDeed?.effectiveEndDate || ''
  );
  const [isIndefiniteDuration, setIsIndefiniteDuration] = useState<boolean>(
    state.leaseDeed?.isIndefiniteDuration || false
  );
  const [isNewContract, setIsNewContract] = useState<boolean>(
    state.leaseDeed?.isNewContract ?? true
  );
  const [previousContractDate, setPreviousContractDate] = useState<string>(
    state.leaseDeed?.previousContractDate || ''
  );

  // ---------------------------------------------------------------------------
  // 2. Lessor State (المكري)
  // ---------------------------------------------------------------------------
  const [lessor, setLessor] = useState(
    state.leaseDeed?.lessor || {
      isLegalEntity: false,
      fullName: state.sellers?.[0]?.name || '',
      cin: state.sellers?.[0]?.idNumber || '',
      fatherName: state.sellers?.[0]?.fatherName || '',
      motherName: state.sellers?.[0]?.motherName || '',
      birthDate: state.sellers?.[0]?.dateOfBirth || '',
      birthPlace: state.sellers?.[0]?.placeOfBirth || '',
      nationality: state.sellers?.[0]?.nationality || 'مغربي',
      profession: state.sellers?.[0]?.profession || '',
      address: state.sellers?.[0]?.address || '',
      maritalStatus: state.sellers?.[0]?.maritalStatus || 'متزوج',
      propertyRole: 'مالك_كامل' as LessorPropertyRole,
      undividedShare: '1/1',
      titleSourceType: 'ملكية' as const,
      titleRefNumber: '',
      titleDate: '',
      usufructDurationLimit: '',
      entityName: '',
      entityForm: 'شركة ذات مسؤولية محدودة',
      rcNumber: '',
      ice: '',
      headquarters: '',
      legalRepName: '',
      legalRepCapacity: 'المسير القانوني',
      legalRepDocRef: '',
    }
  );
  const [coLessors, setCoLessors] = useState<CoLessorItem[]>(state.leaseDeed?.coLessors || []);

  // ---------------------------------------------------------------------------
  // 3. Lessee State (المكتري)
  // ---------------------------------------------------------------------------
  const [lessee, setLessee] = useState(
    state.leaseDeed?.lessee || {
      isLegalEntity: false,
      fullName: state.buyers?.[0]?.name || '',
      cin: state.buyers?.[0]?.idNumber || '',
      fatherName: state.buyers?.[0]?.fatherName || '',
      motherName: state.buyers?.[0]?.motherName || '',
      birthDate: state.buyers?.[0]?.dateOfBirth || '',
      birthPlace: state.buyers?.[0]?.placeOfBirth || '',
      nationality: state.buyers?.[0]?.nationality || 'مغربي',
      profession: state.buyers?.[0]?.profession || '',
      address: state.buyers?.[0]?.address || '',
      maritalStatus: state.buyers?.[0]?.maritalStatus || 'عازب',
      capacityType: 'كامل_الأهلية' as const,
      entityName: '',
      entityForm: 'شركة ذات مسؤولية محدودة',
      rcNumber: '',
      ice: '',
      headquarters: '',
      legalRepName: '',
      legalRepCapacity: 'الممثل القانوني',
      legalRepAuthDoc: '',
    }
  );
  const [coLessees, setCoLessees] = useState<CoLesseeItem[]>(state.leaseDeed?.coLessees || []);
  const [isJointLiability, setIsJointLiability] = useState<boolean>(
    state.leaseDeed?.isJointLiability ?? true
  );

  // ---------------------------------------------------------------------------
  // 4. Property Details (العين المكتراة)
  // ---------------------------------------------------------------------------
  const [property, setProperty] = useState(
    state.leaseDeed?.property || {
      propertyType: 'شقة' as const,
      propertyStatus: 'محفظ' as PropertyStatusType,
      titleNumber: state.properties?.[0]?.titleDeedNumber || state.properties?.[0]?.titleNumber || '',
      requisitionNumber: '',
      landRegistryOffice: state.properties?.[0]?.realEstateOffice || '',
      city: '',
      district: '',
      street: '',
      buildingNumber: '',
      floor: '',
      apartmentNumber: '',
      areaSquareMeters: '',
      roomsCount: '',
      hasGarage: false,
      hasRoofAccess: false,
      hasBasement: false,
      hasWarehouse: false,
      otherDependencies: '',
      boundariesDescription: '',
    }
  );

  // ---------------------------------------------------------------------------
  // 5. Purpose & Commercial Goodwill
  // ---------------------------------------------------------------------------
  const [declaredPurpose, setDeclaredPurpose] = useState<string>(
    state.leaseDeed?.purpose?.declaredPurpose || 'سكن شخصي وعائلي'
  );
  const [isCommercialGoodwillPresent, setIsCommercialGoodwillPresent] = useState<boolean>(
    state.leaseDeed?.purpose?.isCommercialGoodwillPresent || false
  );
  const [goodwillTradeName, setGoodwillTradeName] = useState<string>(
    state.leaseDeed?.purpose?.goodwillTradeName || ''
  );
  const [goodwillRcNumber, setGoodwillRcNumber] = useState<string>(
    state.leaseDeed?.purpose?.goodwillRcNumber || ''
  );
  const [goodwillStartDate, setGoodwillStartDate] = useState<string>(
    state.leaseDeed?.purpose?.goodwillStartDate || ''
  );
  const [isWallsOnly, setIsWallsOnly] = useState<boolean>(
    state.leaseDeed?.purpose?.isWallsOnly ?? true
  );
  const [customersAndReputationIncluded, setCustomersAndReputationIncluded] = useState<boolean>(
    state.leaseDeed?.purpose?.customersAndReputationIncluded || false
  );

  // ---------------------------------------------------------------------------
  // 6. Finance, Rent, Review & Guarantees
  // ---------------------------------------------------------------------------
  const [monthlyRentAmount, setMonthlyRentAmount] = useState<number>(
    state.leaseDeed?.finance?.monthlyRentAmount || 0
  );
  const [monthlyRentAmountInWords, setMonthlyRentAmountInWords] = useState<string>(
    state.leaseDeed?.finance?.monthlyRentAmountInWords || ''
  );
  const [paymentFrequency, setPaymentFrequency] = useState<RentPaymentFrequency>(
    state.leaseDeed?.finance?.paymentFrequency || 'شهري'
  );
  const [paymentMethod, setPaymentMethod] = useState<RentPaymentMethod>(
    state.leaseDeed?.finance?.paymentMethod || 'تحويل_بنكي'
  );
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(
    state.leaseDeed?.finance?.dueDayOfMonth || 5
  );

  // Rent Review (Law 07.03)
  const [hasReviewClause, setHasReviewClause] = useState<boolean>(
    state.leaseDeed?.finance?.hasReviewClause ?? true
  );
  const [reviewFrequencyYears, setReviewFrequencyYears] = useState<number>(
    state.leaseDeed?.finance?.reviewFrequencyYears || 3
  );
  const [reviewPercentage, setReviewPercentage] = useState<number>(
    state.leaseDeed?.finance?.reviewPercentage || 8
  );

  // Security Deposit
  const [hasSecurityDeposit, setHasSecurityDeposit] = useState<boolean>(
    state.leaseDeed?.finance?.hasSecurityDeposit ?? true
  );
  const [securityDepositType, setSecurityDepositType] = useState<GuaranteeType>(
    state.leaseDeed?.finance?.securityDepositType || 'نقدية'
  );
  const [securityDepositAmount, setSecurityDepositAmount] = useState<number>(
    state.leaseDeed?.finance?.securityDepositAmount || 0
  );
  const [securityDepositReturnConditions, setSecurityDepositReturnConditions] = useState<string>(
    state.leaseDeed?.finance?.securityDepositReturnConditions ||
      'تسترجع الضمانة للمكتري بعد انتهاء مدة الكراء وإفراغ العين وتسليم المفاتيح وإبراء ذمته من استهلاك الماء والكهرباء ومصاريف السنديك وبعد معاينة سلامة المحل من أي أضرار غير ناتجة عن الاستعمال المألوف.'
  );

  // Charges & Utilities
  const [waterOnLessee, setWaterOnLessee] = useState<boolean>(
    state.leaseDeed?.finance?.waterOnLessee ?? true
  );
  const [electricityOnLessee, setElectricityOnLessee] = useState<boolean>(
    state.leaseDeed?.finance?.electricityOnLessee ?? true
  );
  const [syndicOnLessee, setSyndicOnLessee] = useState<boolean>(
    state.leaseDeed?.finance?.syndicOnLessee ?? true
  );
  const [syndicMonthlyAmount, setSyndicMonthlyAmount] = useState<number>(
    state.leaseDeed?.finance?.syndicMonthlyAmount || 0
  );
  const [propertyTaxesOnLessor, setPropertyTaxesOnLessor] = useState<boolean>(
    state.leaseDeed?.finance?.propertyTaxesOnLessor ?? true
  );
  const [userCityTaxesOnLessee, setUserCityTaxesOnLessee] = useState<boolean>(
    state.leaseDeed?.finance?.userCityTaxesOnLessee ?? true
  );
  const [minorRepairsOnLessee, setMinorRepairsOnLessee] = useState<boolean>(
    state.leaseDeed?.finance?.minorRepairsOnLessee ?? true
  );
  const [majorStructuralRepairsOnLessor, setMajorStructuralRepairsOnLessor] = useState<boolean>(
    state.leaseDeed?.finance?.majorStructuralRepairsOnLessor ?? true
  );

  // ---------------------------------------------------------------------------
  // 7. Delivery, Keys & Meter Readings
  // ---------------------------------------------------------------------------
  const [hasDescriptiveInspectionReport, setHasDescriptiveInspectionReport] = useState<boolean>(
    state.leaseDeed?.handover?.hasDescriptiveInspectionReport ?? true
  );
  const [inspectionDate, setInspectionDate] = useState<string>(
    state.leaseDeed?.handover?.inspectionDate || todayGregorian
  );
  const [keysCount, setKeysCount] = useState<number>(state.leaseDeed?.handover?.keysCount || 2);
  const [doorsState, setDoorsState] = useState<'ممتازة' | 'جيدة' | 'متوسطة' | 'تحتاج_إصلاح'>(
    state.leaseDeed?.handover?.doorsState || 'جيدة'
  );
  const [windowsState, setWindowsState] = useState<'ممتازة' | 'جيدة' | 'متوسطة' | 'تحتاج_إصلاح'>(
    state.leaseDeed?.handover?.windowsState || 'جيدة'
  );
  const [wallsAndPaintState, setWallsAndPaintState] = useState<'ممتازة' | 'جيدة' | 'متوسطة' | 'تحتاج_إصلاح'>(
    state.leaseDeed?.handover?.wallsAndPaintState || 'جيدة'
  );
  const [meters, setMeters] = useState<MeterReading[]>(
    state.leaseDeed?.handover?.meters || [
      { meterType: 'كهرباء', meterNumber: '', currentReading: '' },
      { meterType: 'ماء', meterNumber: '', currentReading: '' },
    ]
  );
  const [generalObservations, setGeneralObservations] = useState<string>(
    state.leaseDeed?.handover?.generalObservations || ''
  );

  // ---------------------------------------------------------------------------
  // 8. POA & Representation (الفصل 1-889 ق.ل.ع)
  // ---------------------------------------------------------------------------
  const [hasPoa, setHasPoa] = useState<boolean>(state.leaseDeed?.poa?.hasPoa || false);
  const [agentRole, setAgentRole] = useState<'وكيل_عن_المكري' | 'وكيل_عن_المكتري'>(
    state.leaseDeed?.poa?.agentRole || 'وكيل_عن_المكري'
  );
  const [agentName, setAgentName] = useState<string>(state.leaseDeed?.poa?.agentName || '');
  const [agentCin, setAgentCin] = useState<string>(state.leaseDeed?.poa?.agentCin || '');
  const [poaType, setPoaType] = useState<'رسمية_عدلية' | 'توثيقية' | 'عرفية_مصادق_عليها'>(
    state.leaseDeed?.poa?.poaType || 'رسمية_عدلية'
  );
  const [poaDate, setPoaDate] = useState<string>(state.leaseDeed?.poa?.poaDate || '');
  const [poaNumber, setPoaNumber] = useState<string>(state.leaseDeed?.poa?.poaNumber || '');
  const [poaCourtOrMunicipality, setPoaCourtOrMunicipality] = useState<string>(
    state.leaseDeed?.poa?.poaCourtOrMunicipality || ''
  );
  const [scopeIncludesLeasing, setScopeIncludesLeasing] = useState<boolean>(
    state.leaseDeed?.poa?.scopeIncludesLeasing ?? true
  );
  const [scopeIncludesCollectingRent, setScopeIncludesCollectingRent] = useState<boolean>(
    state.leaseDeed?.poa?.scopeIncludesCollectingRent ?? true
  );
  const [scopeIncludesRentAdjustment, setScopeIncludesRentAdjustment] = useState<boolean>(
    state.leaseDeed?.poa?.scopeIncludesRentAdjustment ?? true
  );
  const [scopeIncludesEvictionAndNotices, setScopeIncludesEvictionAndNotices] = useState<boolean>(
    state.leaseDeed?.poa?.scopeIncludesEvictionAndNotices ?? true
  );
  const [isRegisteredInLocalRegistry, setIsRegisteredInLocalRegistry] = useState<boolean>(
    state.leaseDeed?.poa?.isRegisteredInLocalRegistry ?? false
  );
  const [localRegistryCourt, setLocalRegistryCourt] = useState<string>(
    state.leaseDeed?.poa?.localRegistryCourt || ''
  );
  const [localRegistryOrderNumber, setLocalRegistryOrderNumber] = useState<string>(
    state.leaseDeed?.poa?.localRegistryOrderNumber || ''
  );

  // ---------------------------------------------------------------------------
  // 9. Covenants & Subleasing
  // ---------------------------------------------------------------------------
  const [isSubleasingAllowed, setIsSubleasingAllowed] = useState<'ممنوع_قطعياً' | 'مسموح_بشروط_مكتوبة' | 'مسموح_مطلقاً'>(
    state.leaseDeed?.covenants?.isSubleasingAllowed || 'ممنوع_قطعياً'
  );
  const [isAssignmentAllowed, setIsAssignmentAllowed] = useState<'ممنوع_قطعياً' | 'مسموح_بشروط_مكتوبة' | 'مسموح_مطلقاً'>(
    state.leaseDeed?.covenants?.isAssignmentAllowed || 'ممنوع_قطعياً'
  );
  const [isAlterationAllowed, setIsAlterationAllowed] = useState<boolean>(
    state.leaseDeed?.covenants?.isAlterationAllowed || false
  );
  const [alterationConditions, setAlterationConditions] = useState<string>(
    state.leaseDeed?.covenants?.alterationConditions || ''
  );
  const [renewalOption, setRenewalOption] = useState<RenewalOptionType>('تجديد_تلقائي_ضمني');

  // ---------------------------------------------------------------------------
  // 10. Ledger, Events & Notices
  // ---------------------------------------------------------------------------
  const [eventsLedger, setEventsLedger] = useState<LeaseEventItem[]>(
    state.leaseDeed?.eventsLedger || []
  );
  const [notices, setNotices] = useState<LeaseNoticeItem[]>(
    state.leaseDeed?.notices || []
  );

  // ---------------------------------------------------------------------------
  // 11. Registration & Tax Details
  // ---------------------------------------------------------------------------
  const [taxRegistryOffice, setTaxRegistryOffice] = useState<string>(
    state.leaseDeed?.registration?.taxRegistryOffice || ''
  );
  const [registrationReceiptNumber, setRegistrationReceiptNumber] = useState<string>(
    state.leaseDeed?.registration?.registrationReceiptNumber || ''
  );
  const [registrationDate, setRegistrationDate] = useState<string>(
    state.leaseDeed?.registration?.registrationDate || todayGregorian
  );
  const [registrationDutyAmount, setRegistrationDutyAmount] = useState<number>(
    state.leaseDeed?.registration?.dutyAmount || 0
  );

  // ---------------------------------------------------------------------------
  // Applicable Law Dynamic Engine
  // ---------------------------------------------------------------------------
  const applicableLawAnalysis = useMemo((): {
    regime: ApplicableLegalRegime;
    title: string;
    articles: string;
    description: string;
    badgeColor: string;
  } => {
    if (
      usageNature === 'كراء_تجاري' ||
      usageNature === 'كراء_صناعي' ||
      usageNature === 'كراء_حرفي' ||
      usageNature === 'صيدلية_مختبر_عيادة' ||
      usageNature === 'مؤسسة_تعليم_خصوصي' ||
      usageNature === 'مصحة_مؤسسة_مماثلة' ||
      isCommercialGoodwillPresent
    ) {
      return {
        regime: 'قانون_49_16',
        title: 'القانون رقم 49.16 (المحلات التجارية والصناعية والحرفية)',
        articles: 'المواد 1 إلى 38 من القانون 49.16 / المادة 6 من مدونة التجارة',
        description:
          'يخضع هذا العقد وجوباً لأحكام القانون 49.16 الخاص بكراء العقارات والمحلات المخصصة للاستعمال التجاري أو الصناعي أو الحرفي، وتكتسب فيه أحكام الحق في الكيل، التجديد، والتعويض عن الإفراغ حجية قاطعة لا يجوز التنازل المسبق عنها.',
        badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      };
    }

    if (usageNature === 'سكن_شخصي' || usageNature === 'سكن_عائلي' || usageNature === 'استعمال_مهني') {
      return {
        regime: 'قانون_67_12',
        title: 'القانون رقم 67.12 (المحلات المعدة للسكنى أو للاستعمال المهني)',
        articles: 'المواد 1 إلى 56 من القانون 67.12 / القانون 07.03 المتعلق بمراجعة السومة',
        description:
          'يخضع العقد للقانون رقم 67.12 المنظم للعلاقات التعاقدية بين المكري والمكتري لمحلات السكنى والمهني؛ يشترط وجوب تحرير العقد كتابة وإجراء محضر وصفي، وسقف الضمانة لا يتجاوز شهرين، ونسبة مراجعة السومة محددة قانوناً في 8% للسكنى و10% للمهني كل 3 سنوات.',
        badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      };
    }

    if (usageNature === 'أرض_فلاحية') {
      return {
        regime: 'قانون_كراء_الأراضي_الفلاحية',
        title: 'قانون كراء الأراضي الفلاحية وقانون الالتزامات والعقود (الفصول 700 وما بعدها)',
        articles: 'الفصول 700 إلى 722 من ق.ل.ع / مدونة الحقوق العينية',
        description:
          'يخضع العقد لأحكام كراء الأراضي الفلاحية، بما يشمل تكييف مواسم الجني، الحصاد، إعداد الأرض، وتحملات السقي والغرس.',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    }

    if (usageNature === 'ملك_دولة_أو_جماعة') {
      return {
        regime: 'نظام_أملاك_الدولة_والجماعات',
        title: 'نظام كراء وتدبير الملك الخاص للدولة والجماعات الترابية',
        articles: 'القوانين والأنظمة الخاصة بالاحتلال المؤقت والملك الخاص للجماعات',
        description: 'يخضع هذا العقد للضوابط الإدارية والمحاسباتية الجاري بها العمل في تدبير أملاك الدولة والجماعات الترابية.',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    }

    return {
      regime: 'قانون_الالتزامات_والعقود',
      title: 'القواعد العامة في ظهير الالتزامات والعقود المغربي (الفصول 627 وما بعدها)',
      articles: 'الفصل 627 وما يليه من ق.ل.ع',
      description: 'تسري على هذا الكراء القواعد العامة المنظمة لعقد إجارة الأشياء المنصوص عليها في ق.ل.ع فيما لم يرد فيه نص خاص.',
      badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
    };
  }, [usageNature, isCommercialGoodwillPresent]);

  // Adjust recommended rent review percentage automatically
  useEffect(() => {
    if (applicableLawAnalysis.regime === 'قانون_49_16') {
      setReviewPercentage(10);
    } else if (applicableLawAnalysis.regime === 'قانون_67_12') {
      setReviewPercentage(usageNature === 'استعمال_مهني' ? 10 : 8);
    }
  }, [applicableLawAnalysis.regime, usageNature]);

  // Conflict Detection: Purpose vs Property or Intentions
  const conflictDetection = useMemo(() => {
    const isCommercial =
      usageNature === 'كراء_تجاري' ||
      usageNature === 'كراء_صناعي' ||
      usageNature === 'كراء_حرفي' ||
      usageNature === 'صيدلية_مختبر_عيادة';
    const isResidentialProp = property.propertyType === 'شقة' || property.propertyType === 'منزل';

    if (isCommercial && isResidentialProp && declaredPurpose.includes('سكن')) {
      return {
        hasConflict: true,
        level: 'أحمر_مانع',
        message:
          'تعارض صريح في الغرض: تم اختيار نشاط تجاري/مهني في حين أن الغرض المصرح به محدد في "السكن الشخصي". يمنع القانون 67.12 تغيير الغرض دون موافقة كتابية صريحة.',
      };
    }

    if (hasPoa && !scopeIncludesLeasing) {
      return {
        hasConflict: true,
        level: 'أحمر_مانع',
        message:
          'مانع قانوني قاطع في التمثيل: الوكالة المدلى بها لا تتضمن صراحة صلاحية إبرام عقد الكراء. عملاً بالفصل 1-889 وما بعده من ق.ل.ع، لا يجوز للوكيل توقيع هذا الرسم بهذه الصفة.',
      };
    }

    if (
      applicableLawAnalysis.regime === 'قانون_67_12' &&
      hasSecurityDeposit &&
      monthlyRentAmount > 0 &&
      securityDepositAmount > monthlyRentAmount * 2
    ) {
      return {
        hasConflict: true,
        level: 'برتقالي_تنبيه',
        message:
          'تنبيه قانوني (المادة 20 من القانون 67.12): مبلغ الضمانة يتجاوز واجب شهرين من الكراء؛ السقف القانوني الآمر لمبلغ الضمانة هو كراء شهرين فقط.',
      };
    }

    if (lessor.propertyRole === 'صاحب_حق_انتفاع' && isIndefiniteDuration) {
      return {
        hasConflict: true,
        level: 'برتقالي_تنبيه',
        message:
          'مراجعة قانونية مطلوبة (المادة 89 من مدونة الحقوق العينية): المكري صاحب حق انتفاع؛ ينقضي حق الانتفاع حتماً بموت المنتفع ولا يجوز إبرام كراء غير محدد المدة دون موافقة مالك الرقبة.',
      };
    }

    return { hasConflict: false, level: 'سليم', message: 'كافة العناصر متوافقة ومطابقة للأحكام القانونية.' };
  }, [
    usageNature,
    property.propertyType,
    declaredPurpose,
    hasPoa,
    scopeIncludesLeasing,
    applicableLawAnalysis.regime,
    hasSecurityDeposit,
    monthlyRentAmount,
    securityDepositAmount,
    lessor.propertyRole,
    isIndefiniteDuration,
  ]);

  // Duration Calculator
  const calculatedDuration = useMemo(() => {
    if (isIndefiniteDuration) return 'مدة غير محددة (تخضع للإشعار بالإنهاء وفق القانون)';
    if (!effectiveStartDate || !effectiveEndDate) return 'لم تحدد التواريخ بعد';

    const start = new Date(effectiveStartDate);
    const end = new Date(effectiveEndDate);
    if (end <= start) return 'تنبيه: تاريخ النهاية يسبق أو يطابق تاريخ البداية!';

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      days += 30;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتان' : 'سنوات'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'شهر' : months === 2 ? 'شهران' : 'أشهر'}`);
    if (days > 0) parts.push(`${days} يوم`);

    return parts.join(' و ') || 'أقل من يوم';
  }, [isIndefiniteDuration, effectiveStartDate, effectiveEndDate]);

  // Global State Sync
  useEffect(() => {
    const fullLeaseState: LeaseDeedState = {
      operationType,
      usageNature,
      actualActivityDescription,
      contractDate,
      effectiveStartDate,
      effectiveEndDate,
      isIndefiniteDuration,
      calculatedDurationText: calculatedDuration,
      isNewContract,
      previousContractDate,
      applicableLaw: applicableLawAnalysis.regime,
      applicableLawJustification: applicableLawAnalysis.description,
      lessor,
      coLessors,
      lessee,
      coLessees,
      isJointLiability,
      property,
      purpose: {
        declaredPurpose,
        hasActivityConflict: conflictDetection.hasConflict,
        conflictDescription: conflictDetection.message,
        isCommercialGoodwillPresent,
        goodwillTradeName,
        goodwillRcNumber,
        goodwillStartDate,
        isWallsOnly,
        customersAndReputationIncluded,
      },
      finance: {
        monthlyRentAmount,
        monthlyRentAmountInWords,
        paymentFrequency,
        paymentMethod,
        dueDayOfMonth,
        hasReviewClause,
        reviewFrequencyYears,
        reviewPercentage,
        reviewLawArticle: 'القانون 07.03',
        nextReviewDate: '',
        hasSecurityDeposit,
        securityDepositType,
        securityDepositAmount,
        securityDepositReceiptRef: '',
        securityDepositReturnConditions,
        waterOnLessee,
        electricityOnLessee,
        syndicOnLessee,
        syndicMonthlyAmount,
        propertyTaxesOnLessor,
        userCityTaxesOnLessee,
        minorRepairsOnLessee,
        majorStructuralRepairsOnLessor,
      },
      handover: {
        hasDescriptiveInspectionReport,
        inspectionDate,
        keysCount,
        doorsState,
        windowsState,
        wallsAndPaintState,
        meters,
        generalObservations,
      },
      poa: {
        hasPoa,
        agentRole,
        agentName,
        agentCin,
        poaType,
        poaDate,
        poaNumber,
        poaCourtOrMunicipality,
        scopeIncludesLeasing,
        scopeIncludesCollectingRent,
        scopeIncludesRentAdjustment,
        scopeIncludesEvictionAndNotices,
        scopeIncludesContractTermination: true,
        isRegisteredInLocalRegistry,
        localRegistryCourt,
        localRegistryOrderNumber,
      },
      covenants: {
        isSubleasingAllowed,
        isAssignmentAllowed,
        isAlterationAllowed,
        alterationConditions,
        lessorInspectionRightDaysNotice: 2,
        insuranceObligationOnLessee: true,
        terminationNoticePeriodMonths: 3,
        customConditions: [],
      },
      eventsLedger,
      notices,
      registration: {
        isSubjectToTaxRegistration: true,
        taxRegistryOffice,
        registrationReceiptNumber,
        registrationDate,
        dutyAmount: registrationDutyAmount,
        stampDutyPages: 3,
        stampDutyAmount: 60,
      },
    };

    setState((prev) => ({
      ...prev,
      leaseDeed: fullLeaseState,
    }));
  }, [
    operationType,
    usageNature,
    actualActivityDescription,
    contractDate,
    effectiveStartDate,
    effectiveEndDate,
    isIndefiniteDuration,
    calculatedDuration,
    isNewContract,
    previousContractDate,
    applicableLawAnalysis,
    lessor,
    coLessors,
    lessee,
    coLessees,
    isJointLiability,
    property,
    declaredPurpose,
    conflictDetection,
    isCommercialGoodwillPresent,
    goodwillTradeName,
    goodwillRcNumber,
    goodwillStartDate,
    isWallsOnly,
    customersAndReputationIncluded,
    monthlyRentAmount,
    monthlyRentAmountInWords,
    paymentFrequency,
    paymentMethod,
    dueDayOfMonth,
    hasReviewClause,
    reviewFrequencyYears,
    reviewPercentage,
    hasSecurityDeposit,
    securityDepositType,
    securityDepositAmount,
    securityDepositReturnConditions,
    waterOnLessee,
    electricityOnLessee,
    syndicOnLessee,
    syndicMonthlyAmount,
    propertyTaxesOnLessor,
    userCityTaxesOnLessee,
    minorRepairsOnLessee,
    majorStructuralRepairsOnLessor,
    hasDescriptiveInspectionReport,
    inspectionDate,
    keysCount,
    doorsState,
    windowsState,
    wallsAndPaintState,
    meters,
    generalObservations,
    hasPoa,
    agentRole,
    agentName,
    agentCin,
    poaType,
    poaDate,
    poaNumber,
    poaCourtOrMunicipality,
    scopeIncludesLeasing,
    scopeIncludesCollectingRent,
    scopeIncludesRentAdjustment,
    scopeIncludesEvictionAndNotices,
    isRegisteredInLocalRegistry,
    localRegistryCourt,
    localRegistryOrderNumber,
    isSubleasingAllowed,
    isAssignmentAllowed,
    isAlterationAllowed,
    alterationConditions,
    eventsLedger,
    notices,
    taxRegistryOffice,
    registrationReceiptNumber,
    registrationDate,
    registrationDutyAmount,
    setState,
  ]);

  // ---------------------------------------------------------------------------
  // Moroccan Four-Tier Authoritative Legal Draft Generator
  // ---------------------------------------------------------------------------
  const generateAuthoritativeLeaseDraft = useMemo(() => {
    const lessorText = lessor.isLegalEntity
      ? `شركة "${lessor.entityName || '...'}" (${lessor.entityForm})، المقيدة بالسجل التجاري تحت رقم ${lessor.rcNumber || '...'} وICE: ${lessor.ice || '...'}، الكائن مقرها الاجتماعي بـ: ${lessor.headquarters || '...'}، في شخص ممثلها القانوني السيد: ${lessor.legalRepName || '...'} (بصفته: ${lessor.legalRepCapacity}).`
      : `السيد: ${lessor.fullName || '...........................'}، بن ${lessor.fatherName || '...'} وأمه ${lessor.motherName || '...'}، المزداد بتاريخ ${lessor.birthDate || '...'} بـ ${lessor.birthPlace || '...'}، الحامل للبطاقة الوطنية للتعريف رقم ${lessor.cin || '..........'}، مهنته ${lessor.profession || '...'}، الساكن بـ ${lessor.address || '...........................'}، من جنسية ${lessor.nationality}، وصفته في العقار: (${lessor.propertyRole} - بحصة ${lessor.undividedShare}).`;

    const lesseeText = lessee.isLegalEntity
      ? `شركة "${lessee.entityName || '...'}" (${lessee.entityForm})، المقيدة بالسجل التجاري بـ ${lessee.rcNumber || '...'} وICE: ${lessee.ice || '...'}، ومقرها بـ ${lessee.headquarters || '...'}، في شخص ممثلها القانوني: ${lessee.legalRepName || '...'}.`
      : `السيد: ${lessee.fullName || '...........................'}، بن ${lessee.fatherName || '...'} وأمه ${lessee.motherName || '...'}، المزداد بتاريخ ${lessee.birthDate || '...'} بـ ${lessee.birthPlace || '...'}، الحامل للبطاقة الوطنية للتعريف رقم ${lessee.cin || '..........'}، مهنته ${lessee.profession || '...'}، الساكن بـ ${lessee.address || '...........................'}، من جنسية ${lessee.nationality}.`;

    return `بسم الله الرحمن الرحيم
الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه

المملكة المغربية
وزارة العدل
دائرة محكمة الاستئناف بـ ${defaultCourt.replace('المحكمة الابتدائية', '')}
${defaultCourt}
قسم قضاء الأسرة والتوثيق
مكتب العدلين: ${defaultNotary1} و${defaultNotary2}

عقد كراء رسمي
(محرر وفقاً لأحكام ${applicableLawAnalysis.title})

═══════════════════════════════════════════════════════════
الطبقة الأولى: مجلس العقد والهوية التوثيقية والتمثيل
═══════════════════════════════════════════════════════════
بتاريخ: ${todayHijri} هجرية، موافق: ${todayGregorian} ميلادية.
حضر بمكتبنا المهني المعين بدائرة المحكمة المذكورة، أمامنا نحن العدلين المنتصبين للإشهاد الموقعين أسفله:

أولاً - الطرف المكري:
${lessorText}
${coLessors.length > 0 ? `بحضور وموافقة الشركاء على الشياع: ${coLessors.map((c) => `${c.fullName} (بحصة ${c.shareFraction})`).join('، و')}.` : ''}
${hasPoa && agentRole === 'وكيل_عن_المكري' ? `\n(وينوب عنه بمقتضى وكالة ${poaType} مؤرخة في ${poaDate} تحت عدد ${poaNumber} صادرة عن ${poaCourtOrMunicipality} السيد: ${agentName} الحامل للبطاقة رقم ${agentCin}، بعد التحقق من شمول صلاحياتها لإبرام الكراء وقبض الوجيبة).` : ''}

ثانياً - الطرف المكتري:
${lesseeText}
${coLessees.length > 0 ? `\nبالاشتراك مع: ${coLessees.map((cl) => `${cl.fullName} (ب.ت.و: ${cl.cin} - صفته: ${cl.roleType})`).join('، و')}${isJointLiability ? '، ملتزمين بصفة تضامنية لا تقبل التجزئة.' : '.'}` : ''}
${hasPoa && agentRole === 'وكيل_عن_المكتري' ? `\n(وينوب عن المكتري وكيله السيد: ${agentName} ب.ت.و ${agentCin} بموجب وكالة رسمية مؤرخة في ${poaDate}).` : ''}

═══════════════════════════════════════════════════════════
الطبقة الثانية: العين المكتراة وسند المكري والغرض من الكراء
═══════════════════════════════════════════════════════════
ثالثاً - موضوع الكراء والعين المؤجرة:
أكرى الطرف المكري بمقتضى هذا العقد للطرف المكتري القابل لذلك، المحل الموصوف كالتالي:
- نوع العقار: ${property.propertyType}
- الوضعية العقارية: ${property.propertyStatus === 'محفظ' ? `عقار محفظ ذي الرسم العقاري عدد (${property.titleNumber || '...'}) المودع بالمحافظة العقارية بـ ${property.landRegistryOffice || '...'}` : property.propertyStatus === 'في_طور_التحفيظ' ? `عقار في طور التحفيظ مطلب عدد (${property.requisitionNumber || '...'})` : 'عقار غير محفظ'}
- العنوان والموقع: ${property.city} ${property.district ? '، حي ' + property.district : ''} ${property.street ? '، شارع ' + property.street : ''} ${property.buildingNumber ? '، عمارة/رقم ' + property.buildingNumber : ''} ${property.floor ? '، طابق ' + property.floor : ''} ${property.apartmentNumber ? '، شقة ' + property.apartmentNumber : ''}
- المساحة والمشتملات: مساحته التقريبية ${property.areaSquareMeters || '...'} م²، يشتمل على ${property.roomsCount || '...'} ومرافقه الصحية${property.hasGarage ? ' مع مرآب للسيارة' : ''}${property.hasRoofAccess ? ' وحق استعمال السطح' : ''}${property.hasBasement ? ' وسرداب' : ''}${property.hasWarehouse ? ' ومستودع تابع' : ''}.

رابعاً - سند تملك المكري:
يملك المكري العين المكتراة بمقتضى ${lessor.titleSourceType} مؤرخ في ${lessor.titleDate || '...'} مراجع (${lessor.titleRefNumber || '...'})${lessor.propertyRole === 'صاحب_حق_انتفاع' ? `، بصفته صاحب حق انتفاع مقيد إلى غاية ${lessor.usufructDurationLimit || 'وفاته'}` : ''}.

خامساً - الغرض من الكراء والنظام القانوني:
خصص المحل المكترى حصراً لغرض: [${declaredPurpose || usageNature}]، ولا يجوز للمكتري بحال من الأحوال تحويل وجهة استعمال العين أو ممارسة نشاط مغاير دون ترخيص صريح وكتابي ومسبق من المكري.
${isCommercialGoodwillPresent ? `ويقر الطرفان بأن المحل يستغل فيه أصل تجاري ("${goodwillTradeName}") مقيد بالسجل التجاري تحت رقم ${goodwillRcNumber} وتخضع العلاقة لأحكام القانون 49.16.` : ''}

═══════════════════════════════════════════════════════════
الطبقة الثالثة: الوجيبة والمدة والصيانة والتسليم
═══════════════════════════════════════════════════════════
سادساً - مدة الكراء:
${isIndefiniteDuration ? 'أبرم هذا الكراء لمدة غير محددة، ويخضع إنهاؤه للمقتضيات القانونية والآجال المقررة تشريعاً.' : `حدد الطرفان مدة هذا الكراء في [${calculatedDuration}] تبتدئ وجوباً من تاريخ: ${effectiveStartDate} وتنتهي بحلول متم تاريخ: ${effectiveEndDate || '...'}.`}
خيار التجديد: ${renewalOption === 'تجديد_تلقائي_ضمني' ? 'يتجدد هذا العقد تلقائياً لنفس المدة ما لم يوجه أحد الطرفين إشعاراً بالإنهاء وفق الآجال القانونية.' : renewalOption === 'تجديد_باتفاق_مكتوب_جديد' ? 'لا يتجدد هذا العقد ضمنياً، ولا يمدد إلا بتحرير ملحق اتفاقي مكتوب وموقع من الطرفين.' : 'يخضع التجديد للأحكام الخاصة المنصوص عليها في القانون الواجب التطبيق.'}

سابعاً - الوجيبة الكرائية ومراجعتها:
حددت السومة الكرائية الاتفاقية في مبلغ قدره: (${monthlyRentAmount.toLocaleString('ar-MA')} درهم) شهرياً [فقط: ${monthlyRentAmountInWords || '...........................'}]، تؤدى بصيغة (${paymentFrequency}) عن طريق (${paymentMethod})، وذلك في أجل أقصاه اليوم (${dueDayOfMonth}) من كل شهر كرائي جاري.
مراجعة الوجيبة: ${hasReviewClause ? `اتفق الطرفان على مراجعة السومة الكرائية كل ثلاث (${reviewFrequencyYears}) سنوات طبقاً لمقتضيات القانون رقم 07.03 وبنسبة (${reviewPercentage}%) من السومة الجارية.` : 'لا تطبق مراجعة على الوجيبة إلا وفق الضوابط القانونية النافذة.'}

ثامناً - الضمانة المالية (الكفالة التعاقدية):
${hasSecurityDeposit ? `أودع المكتري بين يدي المكري مبلغاً قدره (${securityDepositAmount.toLocaleString('ar-MA')} درهم) برسم الضمانة (${securityDepositType})، وتسترد وفق الشروط التالية: ${securityDepositReturnConditions}.` : 'اتفق الطرفان على الإعفاء من أداء مبلغ الضمانة.'}

تاسعاً - التسليم والمحضر الوصفي ومقاييس الاستهلاك:
صرح المكتري بأنه عاين المحل المكترى المعاينة التامة النافية للجهالة، وتسلم مفاتيحه بعدد (${keysCount}) مفاتيح، وأقر بحالة الأبواب (${doorsState})، والنوافذ (${windowsState})، والجدران (${wallsAndPaintState}).
بيانات العدادات عند التمكين والتسليم:
${meters.map((m) => `- عداد ${m.meterType}: رقم (${m.meterNumber || '...'}) القراءة المسجلة: (${m.currentReading || '...'})`).join('\n')}

عاشراً - التحملات والمصاريف والصيانة:
يلتزم المكتري بأداء استهلاكاته الفردية من ماء وكهرباء، ${syndicOnLessee ? `وواجبات السنديك المشتركة البالغة (${syndicMonthlyAmount} درهم شهرياً)` : ''}، ورسم الخدمات الجماعية الناتج عن الاستغلال، والإصلاحات الصغرى والتأجيرية. بينما يتحمل المكري الإصلاحات الهيكلية الكبرى والضرائب العقارية المترتبة على الملكية.

حادي عشر - منع التولية والكراء من الباطن:
${isSubleasingAllowed === 'ممنوع_قطعياً' ? 'يمنع منعاً كلياً وباتاً على المكتري تولية الكراء أو التنازل عنه أو إكراء العين كلاً أو بعضاً من الباطن للغير تحت طائلة الفسخ الفوري.' : 'يخضع الكراء من الباطن أو التنازل للشروط والموافقات المقررة تشريعاً.'}

═══════════════════════════════════════════════════════════
الطبقة الرابعة: الإيجاب والقبول والمراجع المالية والختام
═══════════════════════════════════════════════════════════
ثاني عشر - التراضي والقبول والإعذار:
وبما ذكر أعلاه تراضى الطرفان وتصادقا عليه بعد القراءة والمواجهة المفصلة باللسان العربي المبين، وثبتت هويتهما وأهليتهما المعتبرة لدى العدلين.
التسجيل والتنبر: سجل هذا العقد بمصلحة التسجيل والتنبر المختصة بـ ${taxRegistryOffice || '...'} بتاريخ ${registrationDate} تحت رقم ${registrationReceiptNumber || '...'}، بأداء واجب التسجيل ومبلغ التنبر القانوني.

وتحرر هذا الرسم ليكون سنداً رسمياً تام الحجية لإثبات العلاقة الكرائية وحفظ حقوق الطرفين.
والسلام.

توقيع المكري: ........................           توقيع المكتري: ........................
توقيع العدل الأول: ........................           توقيع العدل الثاني: ........................
قاضي التوثيق المكلف: .....................`;
  }, [
    defaultCourt,
    defaultNotary1,
    defaultNotary2,
    todayHijri,
    todayGregorian,
    applicableLawAnalysis,
    lessor,
    coLessors,
    hasPoa,
    agentRole,
    poaType,
    poaDate,
    poaNumber,
    poaCourtOrMunicipality,
    agentName,
    agentCin,
    lessee,
    coLessees,
    isJointLiability,
    property,
    declaredPurpose,
    usageNature,
    isCommercialGoodwillPresent,
    goodwillTradeName,
    goodwillRcNumber,
    isIndefiniteDuration,
    calculatedDuration,
    effectiveStartDate,
    effectiveEndDate,
    renewalOption,
    monthlyRentAmount,
    monthlyRentAmountInWords,
    paymentFrequency,
    paymentMethod,
    dueDayOfMonth,
    hasReviewClause,
    reviewFrequencyYears,
    reviewPercentage,
    hasSecurityDeposit,
    securityDepositAmount,
    securityDepositType,
    securityDepositReturnConditions,
    keysCount,
    doorsState,
    windowsState,
    wallsAndPaintState,
    meters,
    syndicOnLessee,
    syndicMonthlyAmount,
    isSubleasingAllowed,
    taxRegistryOffice,
    registrationDate,
    registrationReceiptNumber,
  ]);

  // ---------------------------------------------------------------------------
  // Red Button Action: Transition to Step 7 (المراجعة الذكية والتوثيق القضائي)
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = () => {
    const lessorParty: Party = {
      ...createEmptyParty(),
      id: 'party-lessor',
      name: lessor.isLegalEntity ? `${lessor.entityName} (الممثل: ${lessor.legalRepName})` : lessor.fullName,
      idNumber: lessor.isLegalEntity ? lessor.ice || lessor.rcNumber || '' : lessor.cin,
      dateOfBirth: lessor.birthDate,
      placeOfBirth: lessor.birthPlace,
      fatherName: lessor.fatherName,
      motherName: lessor.motherName,
      profession: lessor.profession,
      address: lessor.isLegalEntity ? lessor.headquarters || '' : lessor.address,
      nationality: (lessor.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as any,
      maritalStatus: lessor.maritalStatus as any,
      partyRole: 'المكري',
    };

    const lesseeParty: Party = {
      ...createEmptyParty(),
      id: 'party-lessee',
      name: lessee.isLegalEntity ? `${lessee.entityName} (الممثل: ${lessee.legalRepName})` : lessee.fullName,
      idNumber: lessee.isLegalEntity ? lessee.ice || lessee.rcNumber || '' : lessee.cin,
      dateOfBirth: lessee.birthDate,
      placeOfBirth: lessee.birthPlace,
      fatherName: lessee.fatherName,
      motherName: lessee.motherName,
      profession: lessee.profession,
      address: lessee.isLegalEntity ? lessee.headquarters || '' : lessee.address,
      nationality: (lessee.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as any,
      maritalStatus: lessee.maritalStatus as any,
      partyRole: 'المكتري',
    };

    setState((prev) => ({
      ...prev,
      step: 7, // الانتقال المباشر للمرحلة السابعة للإرسال للقاضي
      documentType: 'كراء',
      draft: generateAuthoritativeLeaseDraft,
      draftText: generateAuthoritativeLeaseDraft,
      sellers: [lessorParty],
      buyers: [lesseeParty],
      property: {
        ...prev.property,
        type: property.propertyStatus === 'محفظ' ? 'محفظ' : 'غير محفظ',
        titleNumber: property.titleNumber,
        landRegistry: property.landRegistryOffice,
        address: `${property.city} ${property.district} ${property.street}`,
      },
      finance: {
        ...prev.finance,
        price: monthlyRentAmount,
        priceInWords: monthlyRentAmountInWords,
        paymentMethod: paymentMethod === 'نقداً' ? 'نقد' : paymentMethod === 'شيك' ? 'شيك' : 'تحويل',
      },
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper Copy & Print
  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generateAuthoritativeLeaseDraft);
    alert('✅ تم نسخ مسودة رسم الكراء بالكامل للحافظة بنجاح.');
  };

  const handlePrintDraft = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl" lang="ar">
          <head>
            <title>رسم كراء رسمي</title>
            <style>
              body { font-family: 'Amiri', 'Traditional Arabic', serif; padding: 40px; line-height: 2; font-size: 15pt; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${generateAuthoritativeLeaseDraft}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 350);
    }
  };

  // 11 Stages Definition
  const stagesList = [
    { num: 1, title: 'العملية والقانون', icon: Scale },
    { num: 2, title: 'بيت المكري', icon: Users },
    { num: 3, title: 'بيت المكتري', icon: Users },
    { num: 4, title: 'العين المكتراة', icon: Building2 },
    { num: 5, title: 'الغرض والأصل التجاري', icon: Briefcase },
    { num: 6, title: 'مدة الكراء والتجديد', icon: Clock },
    { num: 7, title: 'الوجيبة والضمانة والمصاريف', icon: DollarSign },
    { num: 8, title: 'التسليم والعدادات', icon: FileCheck },
    { num: 9, title: 'الوكالة وسجل ف 1-889', icon: ShieldCheck },
    { num: 10, title: 'الخط الزمني والإنذارات', icon: Zap },
    { num: 11, title: 'التحرير والاعتماد القضائي', icon: FileText },
  ];

  // FAQ "لماذا يسألني النظام هذا السؤال؟" mapping
  const stageFaqs: Record<number, { question: string; answer: string; legalRef: string }> = {
    1: {
      question: 'لماذا يسألني النظام عن طبيعة النشاط وتاريخ العقد والاستعمال الفعلي؟',
      answer:
        'لأن النظام القانوني للكراء في المغرب ليس قالباً واحداً؛ بل يتفرع إلى أنظمة تشريعية متباينة تحكمها قواعد آمرة لا يجوز مخالفتها. فالكراء السكني والمهني يخضع للقانون 67.12، بينما الكراء التجاري والصناعي والحرفي والتعليم الخصوصي والمصحات يخضع للقانون 49.16 الذي يرتب حق الملكية التجارية والتجديد الحتمي، في حين تخضع الأراضي الفلاحية لظهير الالتزامات والعقود.',
      legalRef: 'المادة 1 من القانون 67.12 والمادة 1 من القانون 49.16 والفصل 627 من ق.ل.ع',
    },
    2: {
      question: 'لماذا يسأل النظام عن صفة المكري وسند تملكه وعما إذا كان المالك على الشياع أو صاحب انتفاع؟',
      answer:
        'لأن صحة الإيجار ونفاذه في مواجهة الغير تشترط ثبوت سلطة المكري. فإذا كان مالكاً على الشياع استلزم ذلك موافقة أغلبية الشركاء أو اتفاق استغلال، وإذا كان صاحب حق انتفاع فلا يمكن أن يمتد الكراء إلى ما بعد انقضاء الانتفاع إلا بموافقة مالك الرقبة (المادة 89 ق.ح.ع).',
      legalRef: 'المواد 24 و89 من القانون 39.08 والفصول 960 وما بعدها من ق.ل.ع',
    },
    3: {
      question: 'لماذا يفرق النظام بين المكتري المتضامن والشاغل، ويطلب بيانات السجل التجاري للشخص المعنوي؟',
      answer:
        'لحماية الذمة المالية، وتحديد من يتحمل الالتزام بالأداء والإخلاء عند النزاع؛ ومنع أن يتحول مجرد المقيم أو الشاغل العارض إلى مكتري أصلي يستفيد من الحماية القانونية ونقل العقد دون وجه حق.',
      legalRef: 'المادتان 53 و54 من القانون 67.12 والفصل 175 من ق.ل.ع',
    },
    4: {
      question: 'لماذا يستلزم النظام تدقيق الوضعية العقارية للعين وبيان ملحقاتها؟',
      answer:
        'لتعيين محل العقد تعييناً نافياً للجهالة، وللتثبت من عدم وجود تقييدات أو حجوزات أو حقوق عينية مانعة، وضبط ما إذا كانت الملحقات كالمرآب والسطح مشمولة بالكراء منعاً لنزاعات الحيازة.',
      legalRef: 'الفصل 635 من ظهير الالتزامات والعقود والمادة 3 من القانون 67.12',
    },
    5: {
      question: 'لماذا يراقب النظام تعارض الغرض مع طبيعة العقار، ويستفسر عن وجود أصل تجاري؟',
      answer:
        'لأن تغيير غرض المحل دون موافقة كتابية صريحة يشكل سبباً قاطعاً للإفراغ الفوري دون تعويض. كما أن وجود أصل تجاري ينقل العقد فوراً إلى الحماية المشددة للقانون 49.16 التي تكفل اكتساب الحق في الكراء بعد سنتين من الاستغلال.',
      legalRef: 'المادة 8 من القانون 67.12 والمادتان 4 و6 من القانون 49.16',
    },
    6: {
      question: 'لماذا يحسب النظام مدة العقد تلقائياً ويدقق في شروط التجديد والتمديد؟',
      answer:
        'لضبط مواعيد سريان الالتزام، ولمنع الخلط الفقهي والقضائي بين التجديد الضمني وإبرام عقد جديد، ولتحديد ميعاد إنهاء العقد وتوجيه الإشعار وفق الآجال القانونية الصارمة.',
      legalRef: 'المواد 44 وما بعدها من القانون 67.12 والمادة 687 من ق.ل.ع',
    },
    7: {
      question: 'لماذا يفحص النظام سقف الضمانة ونسبة مراجعة السومة الكرائية؟',
      answer:
        'لأن المادة 20 من القانون 67.12 تنص صراحة على أن مبلغ الضمانة لا يجوز أن يتجاوز كراء شهرين، ومراجعة السومة مقيدة بأحكام القانون 07.03 التي تحدد سقف 8% للسكنى و10% للمهني والتجاري كل 3 سنوات.',
      legalRef: 'المادة 20 من القانون 67.12 والمادتان 1 و4 من القانون 07.03',
    },
    8: {
      question: 'لماذا يولي النظام أهمية بالغة للمحضر الوصفي وأرقام عدادات الماء والكهرباء؟',
      answer:
        'لأن المحضر الوصفي وقراءات العدادات الموثقة عند التسليم هي الحجة القاطعة والوحيدة لإثبات حالة العين عند الاسترجاع ومحاسبة المكتري على الأضرار واستهلاكات المرافق دون الحاجة لخبرات قضائية مكلفة.',
      legalRef: 'المادتان 7 و17 من القانون 67.12 والفصل 676 من ق.ل.ع',
    },
    9: {
      question: 'لماذا يتحقق النظام من تقييد الوكالة في السجل المحلي بالمحكمة (ف 1-889 ق.ل.ع) وصلاحية الكراء؟',
      answer:
        'لأن الوكالة العامة لا تخول الوكيل إبرام الكراء ما لم تنص على ذلك صراحة. وعملاً بالفصل 1-889 من ق.ل.ع، فإن الوكالات المتعلقة بالتصرفات العقارية يجب قيدها في السجل المحلي بالمحكمة الابتدائية لنفاذ آثارها.',
      legalRef: 'الفصل 1-889 والفصول 893 و894 من ظهير الالتزامات والعقود',
    },
    10: {
      question: 'لماذا يدمج النظام محرك الإنذارات وحساب الآجال التلقائي مع السجل الزمني للعلاقة؟',
      answer:
        'لأن أي إخلال في احتساب أجل الإنذار (15 يوماً في ق 49.16 لعدم الأداء، أو شهر في ق 67.12) أو طريقة التبليغ يؤدي حتماً إلى بطلان دعوى الإفراغ أو المطالبة بالأداء شكلاً أمام المحاكم.',
      legalRef: 'المادة 26 من القانون 49.16 والمادة 45 من القانون 67.12 واجتهاد محكمة النقض',
    },
    11: {
      question: 'لماذا يمر العقد مباشرة للمرحلة 7 (Step 7) قبل القاضي؟',
      answer:
        'لأن المرحلة السابعة هي منصة التدقيق العدلي النهائي، حيث يتم التوقيع الرقمي للعدلين وربط الملف بنافذة اختيار القاضي المكلف بالتوثيق (JudgePickerModal) لمخاطبته وتضمينه بالسجلات القضائية الرسمية.',
      legalRef: 'القانون 16.03 المنظم لخطة العدالة والقرار الوزاري المتعلق بالتضمين القضائي',
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans" dir="rtl">
      {/* ===================================================================== */}
      {/* 1. PERSISTENT TOP CARD (بطاقة رسم الكراء الثابتة)                     */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-md p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md">
              <Home className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">🏠 رسم الكراء — منظومة العقد والعلاقة الكرائية</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {operationType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تأصيل توثيقي شامل: الأطراف، العين، الوجيبة، المدة، الضمانة، المحضر الوصفي، ومحرك القوانين المقارنة
              </p>
            </div>
          </div>

          {/* Quick Legal Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${applicableLawAnalysis.badgeColor}`}>
              <Bookmark className="w-3.5 h-3.5" />
              <span>{applicableLawAnalysis.title}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                conflictDetection.hasConflict
                  ? conflictDetection.level === 'أحمر_مانع'
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${conflictDetection.hasConflict ? (conflictDetection.level === 'أحمر_مانع' ? 'bg-red-600' : 'bg-amber-500') : 'bg-emerald-600'}`} />
              <span>{conflictDetection.hasConflict ? conflictDetection.level : '🟢 مستوفٍ للشروط'}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Stepper Bar (11 Stages) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5 pt-1">
          {stagesList.map((st) => {
            const Icon = st.icon;
            const isCurrent = activeStage === st.num;
            const isPassed = activeStage > st.num;
            return (
              <button
                key={st.num}
                type="button"
                onClick={() => setActiveStage(st.num)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-500/30'
                    : isPassed
                    ? 'bg-blue-50/60 text-blue-900 border-blue-200 hover:bg-blue-100/60'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-black opacity-80">{st.num}.</span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold line-clamp-1 leading-tight">{st.title}</span>
              </button>
            );
          })}
        </div>

        {/* Why is the system asking this question? Accordion */}
        {stageFaqs[activeStage] && (
          <div className="mt-2 bg-gradient-to-r from-amber-50/80 via-white to-blue-50/60 rounded-xl border border-amber-200/80 p-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveFaqStage(activeFaqStage === activeStage ? null : activeStage)}
              className="w-full flex items-center justify-between text-right font-bold text-amber-900 hover:text-amber-950 transition"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>❓ لماذا يسألني النظام أسئلة المرحلة {activeStage} ({stagesList[activeStage - 1]?.title})؟</span>
              </div>
              {activeFaqStage === activeStage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {activeFaqStage === activeStage && (
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 text-slate-700 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-slate-900">{stageFaqs[activeStage].question}</p>
                <p className="text-slate-700">{stageFaqs[activeStage].answer}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-800 font-bold mt-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>السند التشريعي: {stageFaqs[activeStage].legalRef}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conflict / Blocker Banner if detected */}
      {conflictDetection.hasConflict && (
        <div
          className={`p-4 rounded-xl border-2 flex items-start gap-3 text-xs ${
            conflictDetection.level === 'أحمر_مانع'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-sm block">تنبيه قانوني صادر عن محرك المراقبة والتحقق:</span>
            <p className="leading-relaxed">{conflictDetection.message}</p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 1: طبيعة العملية والقانون الواجب التطبيق                       */}
      {/* ===================================================================== */}
      {activeStage === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-700" />
              <span>المرحلة 1: طبيعة العملية الكرائية ومحرك القانون الواجب التطبيق</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد طبيعة المحرر (إنشاء / تجديد / تعديل / إنهاء) وفحص الاستعمال الفعلي لاختيار النظام القانوني الآمر
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع المحرر أو العملية الكرائية *</label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as LeaseOperationType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="إنشاء">📄 إنشاء عقد كراء جديد</option>
                <option value="تجديد">🔄 تجديد عقد كراء قائم</option>
                <option value="تعديل">✍️ ملحق تعديلي لعقد كراء (مراجعة سومة / تغيير شروط)</option>
                <option value="إنهاء">🛑 إشهاد بإنهاء عقد الكراء وتسليم العين</option>
                <option value="إثبات_علاقة_كرائية">⚖️ إشهاد بإثبات علاقة كرائية قائمة (بناء على قرائن الأداء)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">طبيعة الاستعمال والنشاط الفعلي *</label>
              <select
                value={usageNature}
                onChange={(e) => setUsageNature(e.target.value as LeaseUsageNature)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="سكن_شخصي">🏠 كراء للسكنى الفردية</option>
                <option value="سكن_عائلي">👨‍👩‍👧 كراء للسكن العائلي</option>
                <option value="استعمال_مهني">💼 كراء للاستعمال المهني (مكتب محاماة / توثيق / محاسبة / مهندسون)</option>
                <option value="كراء_تجاري">🏪 كراء تجاري (محل تجاري / متجر / نقطة بيع)</option>
                <option value="كراء_صناعي">🏭 كراء صناعي (معمل / ورشة إنتاج / مقاولة صناعية)</option>
                <option value="كراء_حرفي">🔨 كراء حرفي (ورشة حرفية / صناعة تقليدية)</option>
                <option value="أرض_فلاحية">🌾 كراء أرض فلاحية / استغلال زراعي</option>
                <option value="صيدلية_مختبر_عيادة">💊 صيدلية / مختبر تحاليل / عيادة طبية (قانون 49.16)</option>
                <option value="مؤسسة_تعليم_خصوصي">🏫 مؤسسة تعليم خصوصي / روض أطفال (قانون 49.16)</option>
                <option value="مصحة_مؤسسة_مماثلة">🏥 مصحة / مركز علاج وتأهيل (قانون 49.16)</option>
                <option value="مستودع_تخزين">📦 كراء مستودع أو محل تخزين مستقل</option>
                <option value="استعمال_مختلط">🧩 استعمال مختلط (سكن وممارسة مهنة معاً)</option>
                <option value="ملك_دولة_أو_جماعة">🏛️ كراء عقار تابع للملك الخاص للدولة أو الجماعات الترابية</option>
                <option value="أخرى">⚙️ حالة استعمال أخرى خاصة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف تفصيلي للنشاط المزمع ممارسته بالمحل *</label>
            <input
              type="text"
              value={actualActivityDescription}
              onChange={(e) => setActualActivityDescription(e.target.value)}
              placeholder="مثال: استغلال المحل كصيدلية مرخصة قانوناً أو عيادة لطب الأسنان أو مكتب للاستشارات..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Applicable Law Engine Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
              <Scale className="w-4 h-4 text-blue-700" />
              <span>نتائج محرك القانون الواجب التطبيق:</span>
              <span className="px-2.5 py-0.5 bg-blue-700 text-white rounded-full text-xs font-bold">
                {applicableLawAnalysis.title}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {applicableLawAnalysis.description}
            </p>
            <div className="text-[11px] text-blue-800 font-bold pt-1">
              📜 المراجع التشريعية الآمرة: {applicableLawAnalysis.articles}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: بيت المكري (الواهب/المؤجر وسند سلطته)                         */}
      {/* ===================================================================== */}
      {activeStage === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700" />
                <span>المرحلة 2: بيت المكري وسلطته على العقار وحالة الشياع</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">الهوية الكاملة للمكري، صفته (مالك منفرد، شريك على الشياع، صاحب انتفاع)، وسند سلطته</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lessor.isLegalEntity}
                  onChange={(e) => setLessor({ ...lessor, isLegalEntity: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>المكري شخص معنوي (شركة / جماعة / مؤسسة)</span>
              </label>
            </div>
          </div>

          {!lessor.isLegalEntity ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للمكري *</label>
                <input
                  type="text"
                  value={lessor.fullName}
                  onChange={(e) => setLessor({ ...lessor, fullName: e.target.value })}
                  placeholder="الاسم الشخصي والعائلي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={lessor.cin}
                  onChange={(e) => setLessor({ ...lessor, cin: e.target.value })}
                  placeholder="مثال: AB123456"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={lessor.fatherName}
                  onChange={(e) => setLessor({ ...lessor, fatherName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={lessor.motherName}
                  onChange={(e) => setLessor({ ...lessor, motherName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ ومكان الازدياد</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={lessor.birthDate}
                    onChange={(e) => setLessor({ ...lessor, birthDate: e.target.value })}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessor.birthPlace}
                    onChange={(e) => setLessor({ ...lessor, birthPlace: e.target.value })}
                    placeholder="مكان الازدياد"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المهنة والعنوان</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessor.profession}
                    onChange={(e) => setLessor({ ...lessor, profession: e.target.value })}
                    placeholder="المهنة"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessor.address}
                    onChange={(e) => setLessor({ ...lessor, address: e.target.value })}
                    placeholder="العنوان الكامل"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشخص المعنوي *</label>
                <input
                  type="text"
                  value={lessor.entityName}
                  onChange={(e) => setLessor({ ...lessor, entityName: e.target.value })}
                  placeholder="مثال: شركة الأمل العقارية ش.م.م"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الشكل القانوني</label>
                <input
                  type="text"
                  value={lessor.entityForm}
                  onChange={(e) => setLessor({ ...lessor, entityForm: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السجل التجاري (RC) و ICE</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessor.rcNumber}
                    onChange={(e) => setLessor({ ...lessor, rcNumber: e.target.value })}
                    placeholder="رقم RC"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessor.ice}
                    onChange={(e) => setLessor({ ...lessor, ice: e.target.value })}
                    placeholder="رقم ICE"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">الممثل القانوني وصفته وسند صلاحيته</label>
                <div className="grid md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={lessor.legalRepName}
                    onChange={(e) => setLessor({ ...lessor, legalRepName: e.target.value })}
                    placeholder="اسم الممثل القانوني"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessor.legalRepCapacity}
                    onChange={(e) => setLessor({ ...lessor, legalRepCapacity: e.target.value })}
                    placeholder="صفته (المسير / رئيس مجلس الإدارة)"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessor.legalRepDocRef}
                    onChange={(e) => setLessor({ ...lessor, legalRepDocRef: e.target.value })}
                    placeholder="سند الصلاحية (محضر الجمع العام / النظام الأساسي)"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Lessor Property Role & Authority Check */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4">
            <h3 className="text-xs font-black text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>صفة المكري بالنسبة للعقار وسند سلطته القانونية لإبرام الكراء:</span>
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صفة المكري في الملك *</label>
                <select
                  value={lessor.propertyRole}
                  onChange={(e) => setLessor({ ...lessor, propertyRole: e.target.value as LessorPropertyRole })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="مالك_كامل">🏠 مالك العقار كاملاً (1/1)</option>
                  <option value="مالك_على_الشياع">🧩 مالك على الشياع (حصة مشاعة)</option>
                  <option value="صاحب_حق_انتفاع">🔑 صاحب حق انتفاع (مقيد بالرسم العقاري)</option>
                  <option value="وكيل">🔏 وكيل بمقتضى وكالة رسمية</option>
                  <option value="نائب_قانوني">⚖️ نائب قانوني (ولي / وصي / مقدم)</option>
                  <option value="وارث">🧬 وارث يتصرف في المخلف</option>
                  <option value="صاحب_حق_آخر">📜 صاحب مركز قانوني خاص</option>
                </select>
              </div>

              {lessor.propertyRole === 'مالك_على_الشياع' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحصة المشاعة المملوكة للمكري</label>
                  <input
                    type="text"
                    value={lessor.undividedShare}
                    onChange={(e) => setLessor({ ...lessor, undividedShare: e.target.value })}
                    placeholder="مثال: النصف (1/2) أو الربع (1/4)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              )}

              {lessor.propertyRole === 'صاحب_حق_انتفاع' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أجل انقضاء حق الانتفاع</label>
                  <input
                    type="text"
                    value={lessor.usufructDurationLimit}
                    onChange={(e) => setLessor({ ...lessor, usufructDurationLimit: e.target.value })}
                    placeholder="وفاة المنتفع أو تاريخ محدد"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سند التملك ومراجعه</label>
                <input
                  type="text"
                  value={lessor.titleRefNumber}
                  onChange={(e) => setLessor({ ...lessor, titleRefNumber: e.target.value })}
                  placeholder="رقم رسم الشراء / الملكية / الهبة"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Co-Lessors on Undivided Ownership */}
            {lessor.propertyRole === 'مالك_على_الشياع' && (
              <div className="pt-3 border-t border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    🧩 الشركاء على الشياع (الفصل 960 ق.ل.ع - يشترط موافقة الأغلبية أو إنابتهم للمكري):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCoLessors([
                        ...coLessors,
                        { id: `co-${Date.now()}`, fullName: '', cin: '', shareFraction: '1/4', participationType: 'طرف_مباشر_موقع' },
                      ])
                    }
                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة شريك في الملك</span>
                  </button>
                </div>

                {coLessors.map((c, idx) => (
                  <div key={c.id} className="grid md:grid-cols-4 gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs items-center">
                    <input
                      type="text"
                      placeholder="اسم الشريك"
                      value={c.fullName}
                      onChange={(e) => {
                        const updated = [...coLessors];
                        updated[idx].fullName = e.target.value;
                        setCoLessors(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      placeholder="رقم البطاقة الوطنية"
                      value={c.cin}
                      onChange={(e) => {
                        const updated = [...coLessors];
                        updated[idx].cin = e.target.value;
                        setCoLessors(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="الحصة (مثلاً: 1/4)"
                      value={c.shareFraction}
                      onChange={(e) => {
                        const updated = [...coLessors];
                        updated[idx].shareFraction = e.target.value;
                        setCoLessors(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={c.participationType}
                        onChange={(e) => {
                          const updated = [...coLessors];
                          updated[idx].participationType = e.target.value as any;
                          setCoLessors(updated);
                        }}
                        className="p-1.5 border border-slate-300 rounded-lg font-semibold flex-1 text-[11px]"
                      >
                        <option value="طرف_مباشر_موقع">طرف موقع بالعقد</option>
                        <option value="مفوض_لوكيله">مفوض للمكري</option>
                        <option value="موافق_باتفاق_استغلال">اتفاق استغلال سابق</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setCoLessors(coLessors.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: بيت المكتري وتعدد المكترين                                  */}
      {/* ===================================================================== */}
      {activeStage === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700" />
                <span>المرحلة 3: بيت المكتري، المكتري المتعدد والتضامن والشاغلون</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">الهوية الكاملة للمكتري (ذاتي أو معنوي)، التضامن، وإضافة المكترين المشاركين</p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={lessee.isLegalEntity}
                onChange={(e) => setLessee({ ...lessee, isLegalEntity: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>المكتري شخص معنوي (شركة / جمعية / مهني)</span>
            </label>
          </div>

          {!lessee.isLegalEntity ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للمكتري *</label>
                <input
                  type="text"
                  value={lessee.fullName}
                  onChange={(e) => setLessee({ ...lessee, fullName: e.target.value })}
                  placeholder="الاسم الشخصي والعائلي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={lessee.cin}
                  onChange={(e) => setLessee({ ...lessee, cin: e.target.value })}
                  placeholder="مثال: CD654321"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب واسم الأم</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessee.fatherName}
                    onChange={(e) => setLessee({ ...lessee, fatherName: e.target.value })}
                    placeholder="الأب"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessee.motherName}
                    onChange={(e) => setLessee({ ...lessee, motherName: e.target.value })}
                    placeholder="الأم"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ ومكان الازدياد</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={lessee.birthDate}
                    onChange={(e) => setLessee({ ...lessee, birthDate: e.target.value })}
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessee.birthPlace}
                    onChange={(e) => setLessee({ ...lessee, birthPlace: e.target.value })}
                    placeholder="مكان الازدياد"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المهنة والعنوان المختار</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessee.profession}
                    onChange={(e) => setLessee({ ...lessee, profession: e.target.value })}
                    placeholder="المهنة"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessee.address}
                    onChange={(e) => setLessee({ ...lessee, address: e.target.value })}
                    placeholder="العنوان الكامل"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الأهلية القانونية</label>
                <select
                  value={lessee.capacityType}
                  onChange={(e) => setLessee({ ...lessee, capacityType: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="كامل_الأهلية">راشد كامل الأهلية القانونية</option>
                  <option value="قاصر_بولي">قاصر ممثل بنائبه الشرعي (المادة 209 م.أ)</option>
                  <option value="مقدم">محجور عليه ممثل بمقدم قضائي</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشخص المعنوي (المكتري) *</label>
                <input
                  type="text"
                  value={lessee.entityName}
                  onChange={(e) => setLessee({ ...lessee, entityName: e.target.value })}
                  placeholder="مثال: شركة النور للتجارة والتوزيع ش.م.م"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السجل التجاري و ICE</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessee.rcNumber}
                    onChange={(e) => setLessee({ ...lessee, rcNumber: e.target.value })}
                    placeholder="رقم RC"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessee.ice}
                    onChange={(e) => setLessee({ ...lessee, ice: e.target.value })}
                    placeholder="رقم ICE"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الممثل القانوني وصفته</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lessee.legalRepName}
                    onChange={(e) => setLessee({ ...lessee, legalRepName: e.target.value })}
                    placeholder="اسم الممثل"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={lessee.legalRepCapacity}
                    onChange={(e) => setLessee({ ...lessee, legalRepCapacity: e.target.value })}
                    placeholder="صفته"
                    className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multiple Lessees & Joint Liability */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">👨‍👩‍👧 المكتري المتعدد والشاغلون المصرح بهم:</span>
                <p className="text-[11px] text-slate-500">
                  هل يكتري المحل عدة أشخاص؟ يمنع النظام الخلط بين صفة المكتري الأصلي وصفة مجرد الشاغل أو المقيم.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCoLessees([
                    ...coLessees,
                    {
                      id: `colessee-${Date.now()}`,
                      fullName: '',
                      cin: '',
                      phone: '',
                      address: '',
                      roleType: 'مكتر_متضامن',
                    },
                  ])
                }
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مكتري مشارك</span>
              </button>
            </div>

            {coLessees.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-900 font-bold border border-blue-200">
                  <input
                    type="checkbox"
                    checked={isJointLiability}
                    onChange={(e) => setIsJointLiability(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>التزام تضامني لا يقبل التجزئة بين المكترين في أداء السومة الكرائية والتحملات التعاقدية (الفصل 175 ق.ل.ع)</span>
                </div>

                {coLessees.map((cl, idx) => (
                  <div key={cl.id} className="grid md:grid-cols-4 gap-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs items-center">
                    <input
                      type="text"
                      placeholder="اسم المكتري المشارك"
                      value={cl.fullName}
                      onChange={(e) => {
                        const updated = [...coLessees];
                        updated[idx].fullName = e.target.value;
                        setCoLessees(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      placeholder="رقم CIN / الهاتف"
                      value={cl.cin}
                      onChange={(e) => {
                        const updated = [...coLessees];
                        updated[idx].cin = e.target.value;
                        setCoLessees(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg"
                    />
                    <select
                      value={cl.roleType}
                      onChange={(e) => {
                        const updated = [...coLessees];
                        updated[idx].roleType = e.target.value as any;
                        setCoLessees(updated);
                      }}
                      className="p-1.5 border border-slate-300 rounded-lg font-bold text-[11px]"
                    >
                      <option value="مكتر_متضامن">مكترٍ متضامن في الأداء</option>
                      <option value="مكتر_بحصة">مكترٍ بنسبة/حصة محددة</option>
                      <option value="شريك_في_الاستغلال">شريك في الاستغلال المهني/التجاري</option>
                      <option value="زوج_مشارك">زوج(ة) مشارك(ة) في الكراء</option>
                      <option value="مجرد_شاغل_مقيم">مجرد شاغل/مقيم تابع (لا يكتسب صفة مكتري)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setCoLessees(coLessees.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1 flex items-center justify-end"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: العين المكتراة والوضعية العقارية                             */}
      {/* ===================================================================== */}
      {activeStage === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              <span>المرحلة 4: العين المكتراة، التحديد، والوضعية العقارية والملحقات</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              الوصف الدقيق للعين، وضعها العقاري (محفظ / مطلب / غير محفظ)، مشمولاتها ومرافقها المشتركة
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع المحل / العقار *</label>
              <select
                value={property.propertyType}
                onChange={(e) => setProperty({ ...property, propertyType: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="شقة">🏢 شقة سكنية</option>
                <option value="منزل">🏡 منزل / دار مستقلة / فيلا</option>
                <option value="محل_تجاري">🏪 محل تجاري / دكان</option>
                <option value="متجر">🏬 متجر / فضاء عرض تجاري</option>
                <option value="مكتب">💼 مكتب مهني / شقة إدارية</option>
                <option value="مصنع">🏭 مصنع / وحدة إنتاجية</option>
                <option value="مستودع">📦 مستودع / مخزن مستقل</option>
                <option value="بناية_كاملة">🏗️ عمارة / بناية كاملة</option>
                <option value="مؤسسة_تعليمية">🏫 مؤسسة تعليم خصوصي</option>
                <option value="مصحة">🏥 مصحة / مركز صحي</option>
                <option value="أرض_فلاحية">🌾 أرض فلاحية</option>
                <option value="أخرى">🧱 عقار مبني وأرض أو متعدد الاستعمالات</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوضعية العقارية *</label>
              <select
                value={property.propertyStatus}
                onChange={(e) => setProperty({ ...property, propertyStatus: e.target.value as PropertyStatusType })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="محفظ">🟢 عقار محفظ (رسم عقاري تابت)</option>
                <option value="في_طور_التحفيظ">🟡 في طور التحفيظ (مطلب تحفيظ)</option>
                <option value="غير_محفظ">🔴 غير محفظ (ملك ثابت بالرسم العدلي)</option>
              </select>
            </div>

            {property.propertyStatus === 'محفظ' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرسم العقاري والمحافظة *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={property.titleNumber}
                    onChange={(e) => setProperty({ ...property, titleNumber: e.target.value })}
                    placeholder="رقم الرسم العقاري"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={property.landRegistryOffice}
                    onChange={(e) => setProperty({ ...property, landRegistryOffice: e.target.value })}
                    placeholder="المحافظة العقارية"
                    className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {property.propertyStatus === 'في_طور_التحفيظ' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم مطلب التحفيظ *</label>
                <input
                  type="text"
                  value={property.requisitionNumber}
                  onChange={(e) => setProperty({ ...property, requisitionNumber: e.target.value })}
                  placeholder="مثال: مطلب عدد 12345/03"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            )}
          </div>

          {/* Location & Address */}
          <div className="grid md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / الجماعة</label>
              <input
                type="text"
                value={property.city}
                onChange={(e) => setProperty({ ...property, city: e.target.value })}
                placeholder="المدينة أو الجماعة"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الحي / المنطقة</label>
              <input
                type="text"
                value={property.district}
                onChange={(e) => setProperty({ ...property, district: e.target.value })}
                placeholder="الحي أو التجزئة"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الشارع والزنقة ورقم العمارة</label>
              <input
                type="text"
                value={property.street}
                onChange={(e) => setProperty({ ...property, street: e.target.value })}
                placeholder="الشارع ورقم البناية"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الطابق ورقم الشقة/المحل</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={property.floor}
                  onChange={(e) => setProperty({ ...property, floor: e.target.value })}
                  placeholder="الطابق"
                  className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={property.apartmentNumber}
                  onChange={(e) => setProperty({ ...property, apartmentNumber: e.target.value })}
                  placeholder="رقم المحل"
                  className="p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Area & Dependencies */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المساحة التقريبية (م²)</label>
              <input
                type="text"
                value={property.areaSquareMeters}
                onChange={(e) => setProperty({ ...property, areaSquareMeters: e.target.value })}
                placeholder="مثال: 95 م²"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عدد الغرف / المرافق</label>
              <input
                type="text"
                value={property.roomsCount}
                onChange={(e) => setProperty({ ...property, roomsCount: e.target.value })}
                placeholder="مثال: 3 غرف وصالون ومطبخ وحمام"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="block text-xs font-bold text-slate-700 mb-1.5">الملحقات والمرافق التابعة:</span>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={property.hasGarage}
                    onChange={(e) => setProperty({ ...property, hasGarage: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>مرآب سيارة</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={property.hasRoofAccess}
                    onChange={(e) => setProperty({ ...property, hasRoofAccess: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>حق السطح</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={property.hasBasement}
                    onChange={(e) => setProperty({ ...property, hasBasement: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>سرداب (Cave)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: الغرض، الأصل التجاري وكشف التعارض                            */}
      {/* ===================================================================== */}
      {activeStage === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-700" />
              <span>المرحلة 5: الغرض التعاقدي، فحص الأصل التجاري (القانون 49.16)، وكشف التعارض</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد الغرض من الكراء ومراقبة التناسق بين طبيعة العين والنشاط لتفادي دعاوى إنهاء الكراء التعسفي
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الغرض الصريح المتفق عليه بين الطرفين *</label>
            <input
              type="text"
              value={declaredPurpose}
              onChange={(e) => setDeclaredPurpose(e.target.value)}
              placeholder="مثال: السكنى الشخصية والعائلية للمكتري فقط / ممارسة تجارة الألبسة الجاهزة..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
            />
          </div>

          {/* Commercial Goodwill (Fonds de commerce) Section */}
          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-purple-950 block">🏪 كراء أصل تجاري أو محل يرتبط بأصل تجاري:</span>
                <p className="text-[11px] text-purple-800">
                  هل يوجد أصل تجاري مستغل حالياً أو سيستغل بالمحل؟ (تطبيق أحكام القانون 49.16 ومادتها 1 و 4)
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950">
                <input
                  type="checkbox"
                  checked={isCommercialGoodwillPresent}
                  onChange={(e) => setIsCommercialGoodwillPresent(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>تطبيق مقتضيات الأصل التجاري</span>
              </label>
            </div>

            {isCommercialGoodwillPresent && (
              <div className="grid md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">الاسم التجاري للأصل</label>
                  <input
                    type="text"
                    value={goodwillTradeName}
                    onChange={(e) => setGoodwillTradeName(e.target.value)}
                    placeholder="اسم المتجر أو المؤسسة"
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">رقم السجل التجاري والنشاط</label>
                  <input
                    type="text"
                    value={goodwillRcNumber}
                    onChange={(e) => setGoodwillRcNumber(e.target.value)}
                    placeholder="رقم RC الخاص بالنشاط"
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">محل الكراء بالنسبة للأصل</label>
                  <select
                    value={isWallsOnly ? 'جدران_فقط' : 'عناصر_الأصل'}
                    onChange={(e) => setIsWallsOnly(e.target.value === 'جدران_فقط')}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold"
                  >
                    <option value="جدران_فقط">كراء الجدران والعقار فقط (كراء تجاري عادي)</option>
                    <option value="عناصر_الأصل">كراء مشمول بعناصر مادية أو معنوية للأصل</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 6: مدة الكراء وحسابها التلقائي وخيارات التجديد                   */}
      {/* ===================================================================== */}
      {activeStage === 6 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-700" />
              <span>المرحلة 6: مدة الكراء، الحساب التلقائي، والتجديد والتمديد</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد سريان العقد، حساب المدة الزمنية التلقائي، وضوابط التجديد والتمديد
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع مدة الكراء *</label>
              <select
                value={isIndefiniteDuration ? 'غير_محددة' : 'محددة'}
                onChange={(e) => setIsIndefiniteDuration(e.target.value === 'غير_محددة')}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="محددة">📅 مدة محددة بأجل معلوم</option>
                <option value="غير_محددة">♾️ مدة غير محددة (خاضعة للإنهاء القانوني)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ بداية الكراء (سريان المفعول) *</label>
              <input
                type="date"
                value={effectiveStartDate}
                onChange={(e) => setEffectiveStartDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>

            {!isIndefiniteDuration && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ نهاية مدة الكراء *</label>
                <input
                  type="date"
                  value={effectiveEndDate}
                  onChange={(e) => setEffectiveEndDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            )}
          </div>

          {/* Automatic Duration Box */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>⏱️ المدة المحسوبة تلقائياً بواسطة النظام:</span>
              <strong className="text-sm font-black text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                {calculatedDuration}
              </strong>
            </div>
            <div className="text-[11px] text-emerald-800 font-semibold">
              {isIndefiniteDuration ? 'الإنهاء يستلزم إشعاراً طبق القانون' : 'انتهاء الأجل يحسم مصير العقد'}
            </div>
          </div>

          {/* Renewal Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">مآل العقد بعد انصرام الأجل وخيارات التجديد *</label>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { id: 'تجديد_تلقائي_ضمني', title: 'تجديد تلقائي ضمني', desc: 'يتجدد العقد تلقائياً لنفس المدة ما لم يوجه إنذار' },
                { id: 'تجديد_باتفاق_مكتوب_جديد', title: 'تجديد باتفاق مكتوب جديد', desc: 'لا يمدد الكراء إلا بملحق رسمي مكتوب بين الطرفين' },
                { id: 'تجديد_وفق_القانون_الخاص', title: 'خاضع لأحكام القانون الخاص', desc: 'تطبيق أحكام التجديد الحتمي أو الإفراغ بقوة القانون' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRenewalOption(opt.id as RenewalOptionType)}
                  className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                    renewalOption === opt.id
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black text-xs block mb-1">{opt.title}</span>
                  <span className="text-[11px] text-slate-500 leading-tight block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 7: الوجيبة الكرائية، المراجعة، الضمانة والمصاريف               */}
      {/* ===================================================================== */}
      {activeStage === 7 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-700" />
              <span>المرحلة 7: الوجيبة الكرائية، مراجعة السومة، الضمانة وتحمل المصاريف</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد المقابل المالي، طريقة الأداء، مراجعة السومة القانونية، سقف الضمانة وتوزيع الأعباء
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ الوجيبة الكرائية (درهم) *</label>
              <input
                type="number"
                value={monthlyRentAmount || ''}
                onChange={(e) => setMonthlyRentAmount(Number(e.target.value))}
                placeholder="مثال: 4500"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ بالحروف العربية</label>
              <input
                type="text"
                value={monthlyRentAmountInWords}
                onChange={(e) => setMonthlyRentAmountInWords(e.target.value)}
                placeholder="أربعة آلاف وخمسمائة درهم"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دورية الأداء</label>
              <select
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value as RentPaymentFrequency)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="شهري">شهرياً في بداية كل شهر</option>
                <option value="ثلاثي">كل ثلاثة أشهر مسبقاً</option>
                <option value="نصف_سنوي">كل نصف سنة</option>
                <option value="سنوي">سنوياً</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الأداء ويوم الاستحقاق</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as RentPaymentMethod)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="تحويل_بنكي">تحويل بنكي</option>
                  <option value="شيك">شيك بنكي</option>
                  <option value="نقداً">نقداً مع وصل</option>
                  <option value="وسيلة_إلكترونية">وسيلة دفع رقمية</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDayOfMonth}
                  onChange={(e) => setDueDayOfMonth(Number(e.target.value))}
                  placeholder="يوم 5"
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Rent Review Section (Law 07.03) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">
                  📈 مراجعة السومة الكرائية (القانون رقم 07.03):
                </span>
                <p className="text-[11px] text-slate-500">
                  يحدد القانون 07.03 أجل 3 سنوات كحد أدنى للمطالبة بمراجعة الكراء، بنسبة أقصاها 8% للسكنى و10% للتجاري والمهني.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={hasReviewClause}
                  onChange={(e) => setHasReviewClause(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>تضمين شرط المراجعة بالعقد</span>
              </label>
            </div>

            {hasReviewClause && (
              <div className="grid md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دورية المراجعة (بالسنوات)</label>
                  <input
                    type="number"
                    value={reviewFrequencyYears}
                    onChange={(e) => setReviewFrequencyYears(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نسبة الزيادة المطبقة (%)</label>
                  <input
                    type="number"
                    value={reviewPercentage}
                    onChange={(e) => setReviewPercentage(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المرجع القانوني</label>
                  <input
                    type="text"
                    disabled
                    value="القانون 07.03 المتعلق بمراجعة أثمان كراء المحلات"
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Security Deposit Section */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-950 block">💵 الضمانة المالية (الكفالة التعاقدية):</span>
                <p className="text-[11px] text-amber-800">
                  المادة 20 من القانون 67.12 تمنع أن يتجاوز مبلغ الضمانة واجب شهرين من الكراء؛ لحماية المكتري.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={hasSecurityDeposit}
                  onChange={(e) => setHasSecurityDeposit(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>وجود مبلغ ضمانة</span>
              </label>
            </div>

            {hasSecurityDeposit && (
              <div className="grid md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">نوع الضمانة</label>
                  <select
                    value={securityDepositType}
                    onChange={(e) => setSecurityDepositType(e.target.value as GuaranteeType)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold"
                  >
                    <option value="نقدية">نقدية تسلم للمكري مقابل وصل</option>
                    <option value="شيك_ضمان">شيك بنكي مودع على سبيل الضمان</option>
                    <option value="كفالة_بنكية">كفالة بنكية مستقلة</option>
                    <option value="كفيل_شخصي">كفيل شخصي متضامن</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">مبلغ الضمانة (درهم)</label>
                  <input
                    type="number"
                    value={securityDepositAmount || ''}
                    onChange={(e) => setSecurityDepositAmount(Number(e.target.value))}
                    placeholder="مثال: 9000"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-amber-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">شروط الاسترجاع</label>
                  <input
                    type="text"
                    value={securityDepositReturnConditions}
                    onChange={(e) => setSecurityDepositReturnConditions(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Allocation of Charges & Utilities */}
          <div>
            <span className="block text-xs font-black text-slate-800 mb-2">🧾 توزيع التحملات والمصاريف والصيانة:</span>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block border-b pb-1">على عاتق المكتري:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={waterOnLessee} onChange={(e) => setWaterOnLessee(e.target.checked)} className="rounded" />
                  <span>استهلاك الماء الصالح للشرب</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={electricityOnLessee} onChange={(e) => setElectricityOnLessee(e.target.checked)} className="rounded" />
                  <span>استهلاك الكهرباء والغاز</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={syndicOnLessee} onChange={(e) => setSyndicOnLessee(e.target.checked)} className="rounded" />
                  <span>مصاريف السنديك والنظافة المشتركة</span>
                </label>
                {syndicOnLessee && (
                  <input
                    type="number"
                    value={syndicMonthlyAmount || ''}
                    onChange={(e) => setSyndicMonthlyAmount(Number(e.target.value))}
                    placeholder="واجب السنديك الشهري (درهم)"
                    className="w-full p-1.5 bg-white border rounded text-xs mt-1"
                  />
                )}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={userCityTaxesOnLessee} onChange={(e) => setUserCityTaxesOnLessee(e.target.checked)} className="rounded" />
                  <span>رسم الخدمات الجماعية (النظافة)</span>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block border-b pb-1">على عاتق المكري:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={propertyTaxesOnLessor} onChange={(e) => setPropertyTaxesOnLessor(e.target.checked)} className="rounded" />
                  <span>الضرائب العقارية وضريبة السكن</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={majorStructuralRepairsOnLessor} onChange={(e) => setMajorStructuralRepairsOnLessor(e.target.checked)} className="rounded" />
                  <span>الإصلاحات الهيكلية الكبرى (السطح، الأعمدة، شبكة الماء الرئيسية)</span>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block border-b pb-1">الإصلاحات الصغرى:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={minorRepairsOnLessee} onChange={(e) => setMinorRepairsOnLessee(e.target.checked)} className="rounded" />
                  <span>الإصلاحات التأجيرية الطفيفة (المفاتيح، الأقفال، الصنبور) على المكتري</span>
                </label>
              </div>
            </div>
          </div>

          {/* Subleasing, Assignment & Alterations */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="block text-xs font-black text-slate-800">
              ⚖️ الكراء من الباطن، التنازل، وإحداث التغييرات والأشغال:
            </span>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكراء من الباطن (Sous-location)</label>
                <select
                  value={isSubleasingAllowed}
                  onChange={(e) => setIsSubleasingAllowed(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="ممنوع_قطعياً">ممنوع منعاً باتاً (تحت طائلة الفسخ)</option>
                  <option value="مسموح_بشروط_مكتوبة">مسموح بموافقة كتابية مسبقة من المكري</option>
                  <option value="مسموح_مطلقاً">مسموح به مطلقاً</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التنازل عن الكراء (Cession de bail)</label>
                <select
                  value={isAssignmentAllowed}
                  onChange={(e) => setIsAssignmentAllowed(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="ممنوع_قطعياً">ممنوع منعاً باتاً</option>
                  <option value="مسموح_بشروط_مكتوبة">مسموح بموافقة كتابية من المكري</option>
                  <option value="مسموح_مطلقاً">مسموح به للغير</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">إحداث تغييرات أو أشغال في العين</label>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isAlterationAllowed}
                      onChange={(e) => setIsAlterationAllowed(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>يسمح ببعض الأشغال والتعديلات</span>
                  </label>
                  {isAlterationAllowed && (
                    <input
                      type="text"
                      value={alterationConditions}
                      onChange={(e) => setAlterationConditions(e.target.value)}
                      placeholder="شروط الأشغال ورخصة البناء إن لزمت"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 8: محضر التسليم والعدادات وحالة العين                          */}
      {/* ===================================================================== */}
      {activeStage === 8 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-700" />
              <span>المرحلة 8: محضر التسليم والتمكين، المفاتيح، والعدادات والبيان الوصفي</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              المحضر الوصفي للعين عند تسليم المفاتيح، قراءة عدادات الماء والكهرباء وتوثيق الحالة
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المعاينة والتسليم *</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عدد المفاتيح المسلمة للمكتري *</label>
              <input
                type="number"
                value={keysCount}
                onChange={(e) => setKeysCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الأبواب والنوافذ</label>
              <select
                value={doorsState}
                onChange={(e) => setDoorsState(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="ممتازة">ممتازة (شبه جديدة)</option>
                <option value="جيدة">جيدة وسليمة من أي كسر</option>
                <option value="متوسطة">متوسطة وبها أثر الاستعمال العادي</option>
                <option value="تحتاج_إصلاح">تحتاج إلى صيانة وإصلاح</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الطلاء والجدران</label>
              <select
                value={wallsAndPaintState}
                onChange={(e) => setWallsAndPaintState(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="ممتازة">صباغة جديدة ممتازة</option>
                <option value="جيدة">جيدة ونظيفة</option>
                <option value="متوسطة">متوسطة مقبولة</option>
                <option value="تحتاج_إصلاح">بها رطوبة أو تحتاج تجديداً</option>
              </select>
            </div>
          </div>

          {/* Meter Readings Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">
                ⚡ مقاييس وعدادات الاستهلاك يوم تسليم المفاتيح:
              </span>
              <button
                type="button"
                onClick={() => setMeters([...meters, { meterType: 'كهرباء', meterNumber: '', currentReading: '' }])}
                className="px-2 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة عداد</span>
              </button>
            </div>

            <div className="space-y-2">
              {meters.map((m, idx) => (
                <div key={idx} className="grid md:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs items-center">
                  <select
                    value={m.meterType}
                    onChange={(e) => {
                      const updated = [...meters];
                      updated[idx].meterType = e.target.value as any;
                      setMeters(updated);
                    }}
                    className="p-1.5 border rounded-lg font-bold"
                  >
                    <option value="كهرباء">⚡ عداد الكهرباء</option>
                    <option value="ماء">💧 عداد الماء الصالح للشرب</option>
                    <option value="غاز">🔥 عداد الغاز</option>
                  </select>
                  <input
                    type="text"
                    placeholder="رقم العداد"
                    value={m.meterNumber}
                    onChange={(e) => {
                      const updated = [...meters];
                      updated[idx].meterNumber = e.target.value;
                      setMeters(updated);
                    }}
                    className="p-1.5 border rounded-lg font-mono font-bold"
                  />
                  <input
                    type="text"
                    placeholder="القراءة المسجلة يوم التسليم"
                    value={m.currentReading}
                    onChange={(e) => {
                      const updated = [...meters];
                      updated[idx].currentReading = e.target.value;
                      setMeters(updated);
                    }}
                    className="p-1.5 border rounded-lg font-mono font-bold text-blue-900"
                  />
                  <button
                    type="button"
                    onClick={() => setMeters(meters.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 p-1 flex justify-end"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات المعاينة العامة أو تحفظات التسليم
              </label>
              <textarea
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="بيان أية تحفظات أو عيوب ظاهرة بالعين أو ملحقاتها تم الاتفاق على إثباتها بمحضر التسليم..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 9: التوكيل وسجلات ف 1-889 ق.ل.ع                                 */}
      {/* ===================================================================== */}
      {activeStage === 9 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <span>المرحلة 9: الوكالة وسجل المحكمة المحلي (الفصل 1-889 ق.ل.ع) وصلاحيات الإيجار</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                فحص سندات التمثيل الاتفاقي، التحقق من شمول الوكالة لحق الإيجار، وقيدها بالسجل العقاري بالمحكمة
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-950">
              <input
                type="checkbox"
                checked={hasPoa}
                onChange={(e) => setHasPoa(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>توقيع العقد بالوكالة</span>
            </label>
          </div>

          {hasPoa ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الطرف المُمَثَّل بالوكالة</label>
                  <select
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="وكيل_عن_المكري">وكيل عن المكري</option>
                    <option value="وكيل_عن_المكتري">وكيل عن المكتري</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الوكيل الكامل *</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="اسم الوكيل"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم بطاقة تعريف الوكيل</label>
                  <input
                    type="text"
                    value={agentCin}
                    onChange={(e) => setAgentCin(e.target.value)}
                    placeholder="رقم CIN"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طبيعة سند الوكالة</label>
                  <select
                    value={poaType}
                    onChange={(e) => setPoaType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="رسمية_عدلية">رسمية عدلية مضمنة بالمحكمة</option>
                    <option value="توثيقية">عقد توثيقي رسمي</option>
                    <option value="عرفية_مصادق_عليها">عرفية مصادق على صحة توقيعها</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم سند الوكالة / عدد التضمين</label>
                  <input
                    type="text"
                    value={poaNumber}
                    onChange={(e) => setPoaNumber(e.target.value)}
                    placeholder="رقم الوكالة أو عدد التضمين"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ سند الوكالة</label>
                  <input
                    type="date"
                    value={poaDate}
                    onChange={(e) => setPoaDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجهة المصدرة للوكالة</label>
                  <input
                    type="text"
                    value={poaCourtOrMunicipality}
                    onChange={(e) => setPoaCourtOrMunicipality(e.target.value)}
                    placeholder="المحكمة الابتدائية أو الجماعة الترابية"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Scope Checklist */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="block text-xs font-black text-slate-800">
                  🔐 فحص شمول صلاحيات الوكالة لإبرام هذا العقد (الفصل 894 ق.ل.ع):
                </span>
                <div className="grid md:grid-cols-2 gap-2 text-xs font-semibold pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeIncludesLeasing}
                      onChange={(e) => setScopeIncludesLeasing(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>صلاحية إبرام وتوقيع عقد الكراء وتحديد شروطه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeIncludesCollectingRent}
                      onChange={(e) => setScopeIncludesCollectingRent(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>صلاحية قبض الوجيبة الكرائية وتسليم التواصيل والمخالصات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeIncludesRentAdjustment}
                      onChange={(e) => setScopeIncludesRentAdjustment(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>صلاحية مراجعة السومة الكرائية وتعديلها</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeIncludesEvictionAndNotices}
                      onChange={(e) => setScopeIncludesEvictionAndNotices(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>صلاحية توجيه الإنذارات القضائية والمطالبة بالإفراغ</span>
                  </label>
                </div>
              </div>

              {/* Local Court Registry Verification (Art 1-889 DOC) */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">
                    📕 تقييد الوكالة في السجل المحلي بالمحكمة الابتدائية (الفصل 1-889 ق.ل.ع):
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isRegisteredInLocalRegistry}
                      onChange={(e) => setIsRegisteredInLocalRegistry(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>مقيدة بالسجل المحلي بالمحكمة</span>
                  </label>
                </div>
                {isRegisteredInLocalRegistry && (
                  <div className="grid md:grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="المحكمة الابتدائية المقيدة بسجلها"
                      value={localRegistryCourt}
                      onChange={(e) => setLocalRegistryCourt(e.target.value)}
                      className="p-1.5 bg-white border border-blue-300 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="رقم التقييد والترتيب بالسجل"
                      value={localRegistryOrderNumber}
                      onChange={(e) => setLocalRegistryOrderNumber(e.target.value)}
                      className="p-1.5 bg-white border border-blue-300 rounded text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 text-slate-500 rounded-xl text-center text-xs">
              الطرفان يحضران بأصالة عن نفسيهما دون وساطة أو تمثيل وكيل.
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 10: الخط الزمني، الإنذارات، ومحرك الإفراغ والاجتهاد القضائي     */}
      {/* ===================================================================== */}
      {activeStage === 10 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-700" />
              <span>المرحلة 10: الخط الزمني للعلاقة الكرائية، الإنذارات، وأسباب الإفراغ، والاجتهاد القضائي</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة دورة حياة العقد بالكامل: توثيق الأحداث، حساب آجال الإنذارات تلقائياً، واستعراض قرارات محكمة النقض
            </p>
          </div>

          {/* Interactive Timeline */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 block">🕒 الخط الزمني لدورة حياة الكراء:</span>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold pt-2">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-2xs text-blue-900">
                <span>📅 1. إبرام العقد</span>
              </div>
              <span>←</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-2xs text-emerald-900">
                <span>🔑 2. تسليم المحل</span>
              </div>
              <span>←</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-2xs text-purple-900">
                <span>💰 3. أداء الوجيبة</span>
              </div>
              <span>←</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-2xs text-amber-900">
                <span>📈 4. مراجعة السومة</span>
              </div>
              <span>←</span>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-2xs text-red-900">
                <span>📩 5. الإنذارات / الإفراغ</span>
              </div>
            </div>
          </div>

          {/* Event Ledger (سجل الأحداث الكرائية الحية) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-800 block">🧩 إضافة وتدوين حدث كرائي في ملف العلاقة:</span>
                <p className="text-[11px] text-slate-500">
                  يمكن للعدل توثيق أحداث الأداء أو التخلف أو الإنذارات لإثبات المركز القانوني
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEventsLedger([
                    ...eventsLedger,
                    {
                      id: `ev-${Date.now()}`,
                      eventDate: todayGregorian,
                      eventType: 'أداء_الوجيبة',
                      description: 'تم أداء واجب الكراء الشهري بموجب تحويل بنكي',
                      amount: monthlyRentAmount,
                    },
                  ])
                }
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة حدث</span>
              </button>
            </div>

            {eventsLedger.length > 0 ? (
              <div className="space-y-2">
                {eventsLedger.map((ev, idx) => (
                  <div key={ev.id} className="grid md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                    <input
                      type="date"
                      value={ev.eventDate}
                      onChange={(e) => {
                        const updated = [...eventsLedger];
                        updated[idx].eventDate = e.target.value;
                        setEventsLedger(updated);
                      }}
                      className="p-1.5 bg-white border rounded"
                    />
                    <select
                      value={ev.eventType}
                      onChange={(e) => {
                        const updated = [...eventsLedger];
                        updated[idx].eventType = e.target.value as any;
                        setEventsLedger(updated);
                      }}
                      className="p-1.5 bg-white border rounded font-bold"
                    >
                      <option value="أداء_الوجيبة">💰 أداء الوجيبة</option>
                      <option value="تخلف_عن_الأداء">⚠️ تخلف عن الأداء</option>
                      <option value="إنذار_بالأداء">📩 توجيه إنذار بالأداء</option>
                      <option value="مراجعة_الوجيبة">📈 مراجعة السومة</option>
                      <option value="استرجاع_المحل">🔑 تسليم المفاتيح وإنهاء الكراء</option>
                    </select>
                    <input
                      type="text"
                      value={ev.description}
                      onChange={(e) => {
                        const updated = [...eventsLedger];
                        updated[idx].description = e.target.value;
                        setEventsLedger(updated);
                      }}
                      className="p-1.5 bg-white border rounded"
                    />
                    <div className="flex items-center justify-between">
                      <input
                        type="number"
                        placeholder="المبلغ (إن وجد)"
                        value={ev.amount || ''}
                        onChange={(e) => {
                          const updated = [...eventsLedger];
                          updated[idx].amount = Number(e.target.value);
                          setEventsLedger(updated);
                        }}
                        className="p-1.5 bg-white border rounded w-24 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setEventsLedger(eventsLedger.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-3 bg-slate-50 text-slate-400 rounded-xl text-xs">
                لا توجد أحداث مسجلة بعد في السجل الزمني للعقد.
              </div>
            )}
          </div>

          {/* Case Law Engine (محرك الاجتهاد القضائي لمحكمة النقض) */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
              <Scale className="w-4 h-4 text-indigo-700" />
              <span>⚖️ اجتهادات محكمة النقض المغربية المرتبطة بالحالة الكرائية:</span>
            </div>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                <span className="font-bold text-indigo-950 block">1. إثبات العلاقة الكرائية بقبول الوجيبة والمراسلات:</span>
                <p className="leading-relaxed text-[11px]">
                  «استقرار محكمة النقض على أن أداء الوجيبة الكرائية بصفة منتظمة وقبولها من طرف المالك دون تحفظ يشكل قرينة قاطعة على قيام العلاقة الكرائية، ولو في غياب عقد كتابي، وتسري عليها أحكام القانون الحامي للعين.»
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                <span className="font-bold text-indigo-950 block">2. التمييز بين الكراء والتسيير الحر (Gérance libre):</span>
                <p className="leading-relaxed text-[11px]">
                  «العبرة في تكييف العقد بحقيقة قصد الطرفين لا بالألفاظ المستعملة؛ فإذا كان العقد وارداً على جدران المحل فقط دون عناصر الأصل التجاري فإنه كراء تجاري خاضع للقانون 49.16 وليس تسييراً حراً.»
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                <span className="font-bold text-indigo-950 block">3. احتساب أجل الإنذار التجاري (المادة 26 من ق 49.16):</span>
                <p className="leading-relaxed text-[11px]">
                  «أجل 15 يوماً الممنوح في إنذار الأداء يبدأ حسابه من تاريخ التوصل الفعلي بالإنذار، وأي دعوى ترفع قبل انصرام الأجل كاملة تكون غير مقبولة شكلاً بقوة القانون.»
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 11: التحرير العدلي الكامل والمخرجات والانتقال للمرحلة 7        */}
      {/* ===================================================================== */}
      {activeStage === 11 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <span>المرحلة 11: الصياغة العدلية المغربية رباعية الطبقات والمخرجات القضائية</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد نص عقد الكراء الرسمي وفق الأصول التوثيقية والتشريعات المغربية النافذة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ المسودة</span>
              </button>
              <button
                type="button"
                onClick={handlePrintDraft}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المعاينة</span>
              </button>
            </div>
          </div>

          {/* Legal Draft Container */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300/80 font-serif text-sm leading-loose whitespace-pre-wrap text-slate-900 shadow-inner select-text">
            {generateAuthoritativeLeaseDraft}
          </div>

          {/* Tax Registration Details (المادة 127 من المدونة العامة للضرائب) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="block text-xs font-black text-slate-800">
              🏛️ بيانات التسجيل وإدارة الضرائب (وفق متطلبات المادة 127 من المدونة العامة للضرائب):
            </span>
            <div className="grid md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">مكتب ومصلحة التسجيل</label>
                <input
                  type="text"
                  value={taxRegistryOffice}
                  onChange={(e) => setTaxRegistryOffice(e.target.value)}
                  placeholder="مكتب التسجيل والتمبر المختص"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم وصل التسجيل والأمر بالاستخلاص</label>
                <input
                  type="text"
                  value={registrationReceiptNumber}
                  onChange={(e) => setRegistrationReceiptNumber(e.target.value)}
                  placeholder="رقم الوصل / التضمين"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ التسجيل والأداء</label>
                <input
                  type="date"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">واجبات التسجيل والتمبر (درهم)</label>
                <input
                  type="number"
                  value={registrationDutyAmount || ''}
                  onChange={(e) => setRegistrationDutyAmount(Number(e.target.value))}
                  placeholder="200"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>
          </div>

          {/* Transition Button to Step 7 (المراجعة القضائية والإرسال للقاضي) */}
          <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="font-black text-sm block flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>المرحلة الموالية: التحقق النهائي والاعتماد وتوجيه الرسم للقاضي المكلف بالتوثيق</span>
              </span>
              <p className="text-xs text-slate-300">
                الانتقال المباشر إلى الخطوة السابعة (Step 7) لتوليد وتدقيق الوثيقة في المحرر التفاعلي واختيار القاضي عبر JudgePickerModal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleProceedToStep7}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition transform hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              <span>المتابعة للمرحلة 7 (المراجعة القضائية والإرسال للقاضي)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Bottom Navigation Buttons                                            */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (activeStage > 1) setActiveStage((prev) => prev - 1);
            else if (onBack) onBack();
          }}
          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{activeStage === 1 ? 'الرجوع للقائمة' : 'المرحلة السابقة'}</span>
        </button>

        <div className="text-xs font-bold text-slate-400">
          المرحلة {activeStage} من 11
        </div>

        {activeStage < 11 ? (
          <button
            type="button"
            onClick={() => setActiveStage((prev) => prev + 1)}
            className="px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-700/20"
          >
            <span>المرحلة التالية</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleProceedToStep7}
            className="px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>المتابعة للمرحلة 7 (الإرسال للقاضي)</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
