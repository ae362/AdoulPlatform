import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  PromiseToLeaseDeed,
  PromiseToLeasePartyInfo,
  PromiseToLeaseSuspensiveCondition,
  FeesAgentState,
} from '../../../../types/feesAgentTypes';
import {
  convertNumberToArabicWords,
} from '../../../../utils/feesAgentUtils';
import {
  generatePromiseToLeaseDraft,
} from '../../../../templates/feesAgentTemplates';
import {
  Building2,
  ShieldCheck,
  Users,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  FileCheck,
  Key,
  Flame,
  Briefcase,
  DollarSign,
  Info,
} from 'lucide-react';

export const PromiseToLeaseWizard: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  // Navigation between sections (1 to 6)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Sync helper
  const syncState = useCallback((patch: Partial<FeesAgentState>) => {
    setState(prev => ({
      ...prev,
      ...patch,
    }));
  }, [setState]);

  // Read or initialize PromiseToLease data (clean, zero mock data)
  const leaseData = useMemo<Partial<PromiseToLeaseDeed>>(() => {
    return state.promiseToLease || {};
  }, [state.promiseToLease]);

  // 1. Point ① & ④: Intended Operation & Legal Nature
  const [intendedOperation, setIntendedOperation] = useState<PromiseToLeaseDeed['intendedOperation']>(
    leaseData.intendedOperation || 'وعد_بالكراء'
  );
  const [promiseNature, setPromiseNature] = useState<PromiseToLeaseDeed['promiseNature']>(
    leaseData.promiseNature || 'وعد_متبادل'
  );

  // 2. Point ②: Promisors (الواعدون بالكراء - المكري)
  const [promisors, setPromisors] = useState<PromiseToLeasePartyInfo[]>(() => {
    if (leaseData.promisors && leaseData.promisors.length > 0) return leaseData.promisors;
    if (state.sellers && state.sellers.length > 0) {
      return state.sellers.map((s, idx) => ({
        id: `plr-${idx + 1}`,
        isLegalEntity: s.actingCapacity === 'legal_representative',
        partyType: s.actingCapacity === 'legal_representative' ? 'معنوي_مغربي' : 'طبيعي',
        fullName: s.name || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        idNumber: s.idNumber || '',
        address: s.address || '',
        profession: s.profession || '',
        nationality: (s.nationality as any) || 'مغربي',
        maritalStatus: s.maritalStatus || '',
        capacity: 'مالك',
        shareFraction: s.share || '1/1',
        companyName: s.legalEntityName || '',
        companyForm: s.legalForm || 'شركة ذات مسؤولية محدودة SARL',
        rcNumber: s.commercialRegister || '',
        ice: s.ice || '',
        headquarters: s.headquartersAddress || '',
        legalRepresentativeName: s.legalRepresentativeName || '',
        legalRepresentativeCapacity: s.legalRepresentativeCapacity || 'المسير القانوني',
      }));
    }
    return [{
      id: 'plr-1',
      isLegalEntity: false,
      partyType: 'طبيعي',
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idType: 'بطاقة_تعريف_وطنية',
      idNumber: '',
      idIssueDate: '',
      address: '',
      profession: '',
      maritalStatus: 'متزوج',
      capacity: 'مالك',
      shareFraction: '1/1',
      shareNumeric: 100,
      companyName: '',
      companyForm: 'شركة ذات مسؤولية محدودة SARL',
      rcNumber: '',
      rcCity: '',
      ice: '',
      taxId: '',
      headquarters: '',
      capital: undefined,
      legalRepresentativeName: '',
      legalRepresentativeCapacity: 'المسير القانوني',
      legalRepresentativeCin: '',
    }];
  });

  // 3. Point ③: Promisees (الموعود لهم بالكراء - المكتري المزمع)
  const [promisees, setPromisees] = useState<PromiseToLeasePartyInfo[]>(() => {
    if (leaseData.promisees && leaseData.promisees.length > 0) return leaseData.promisees;
    if (state.buyers && state.buyers.length > 0) {
      return state.buyers.map((b, idx) => ({
        id: `ple-${idx + 1}`,
        isLegalEntity: b.actingCapacity === 'legal_representative',
        partyType: b.actingCapacity === 'legal_representative' ? 'معنوي_مغربي' : 'طبيعي',
        fullName: b.name || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        idNumber: b.idNumber || '',
        address: b.address || '',
        profession: b.profession || '',
        nationality: (b.nationality as any) || 'مغربي',
        maritalStatus: b.maritalStatus || '',
        capacity: 'طرف_مباشر',
        shareFraction: '1/1',
        companyName: b.legalEntityName || '',
        companyForm: b.legalForm || 'شركة ذات مسؤولية محدودة SARL',
        rcNumber: b.commercialRegister || '',
        ice: b.ice || '',
        headquarters: b.headquartersAddress || '',
        legalRepresentativeName: b.legalRepresentativeName || '',
        legalRepresentativeCapacity: b.legalRepresentativeCapacity || 'المسير القانوني',
      }));
    }
    return [{
      id: 'ple-1',
      isLegalEntity: false,
      partyType: 'طبيعي',
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idType: 'بطاقة_تعريف_وطنية',
      idNumber: '',
      idIssueDate: '',
      address: '',
      profession: '',
      maritalStatus: 'متزوج',
      capacity: 'طرف_مباشر',
      shareFraction: '1/1',
      shareNumeric: 100,
      companyName: '',
      companyForm: 'شركة ذات مسؤولية محدودة SARL',
      rcNumber: '',
      rcCity: '',
      ice: '',
      taxId: '',
      headquarters: '',
      capital: undefined,
      legalRepresentativeName: '',
      legalRepresentativeCapacity: 'المسير القانوني',
      legalRepresentativeCin: '',
    }];
  });

  // 4. Point ⑤: Property / Premises (المحل الموعود بكرائه)
  const [propertyDetails, setPropertyDetails] = useState<PromiseToLeaseDeed['propertyDetails']>(() => {
    return leaseData.propertyDetails || {
      premisesType: 'محل_تجاري',
      propertyStatus: 'محفظ',
      titleNumber: '',
      titleIndex: '',
      requisitionNumber: '',
      propertyName: '',
      exactAddress: '',
      city: '',
      district: '',
      areaSquareMeters: undefined,
      componentsAndDesignation: '',
      isEntireProperty: true,
      partSpecification: {
        partNumber: '',
        floorNumber: '',
        boundariesDescription: '',
        sharesInCommonParts: '',
      },
    };
  });

  // 5. Point ⑥: Purpose & Legal Regime (الغرض والنظام القانوني)
  const [leasePurpose, setLeasePurpose] = useState<PromiseToLeaseDeed['leasePurpose']>(
    leaseData.leasePurpose || 'تجاري'
  );
  const [leasePurposeDetails, setLeasePurposeDetails] = useState<string>(
    leaseData.leasePurposeDetails || ''
  );
  const [isCommercialGoodwillIncluded, setIsCommercialGoodwillIncluded] = useState<boolean>(
    leaseData.isCommercialGoodwillIncluded ?? false
  );
  const [commercialActivityType, setCommercialActivityType] = useState<string>(
    leaseData.commercialActivityType || ''
  );

  // Auto-calculated legal regime based on purpose
  const legalRegime = useMemo<PromiseToLeaseDeed['legalRegime']>(() => {
    if (leasePurpose === 'تجاري' || leasePurpose === 'صناعي' || leasePurpose === 'حرفي') {
      return 'قانون_49.16';
    }
    if (leasePurpose === 'سكنى' || leasePurpose === 'مهني') {
      return 'قانون_67.12';
    }
    return 'قواعد_عامة_ق_ل_ع';
  }, [leasePurpose]);

  // 6. Point ⑦: Future Lease Terms (شروط الكراء المزمع إبرامه)
  const [rentAmount, setRentAmount] = useState<number>(leaseData.futureLeaseTerms?.rentAmount || 0);
  const [rentAmountInWords, setRentAmountInWords] = useState<string>(leaseData.futureLeaseTerms?.rentAmountInWords || '');
  const [periodicity, setPeriodicity] = useState<PromiseToLeaseDeed['futureLeaseTerms']['periodicity']>(
    leaseData.futureLeaseTerms?.periodicity || 'شهري'
  );
  const [paymentMethod, setPaymentMethod] = useState<PromiseToLeaseDeed['futureLeaseTerms']['paymentMethod']>(
    leaseData.futureLeaseTerms?.paymentMethod || 'تحويل_بنكي'
  );
  const [paymentDayInPeriod, setPaymentDayInPeriod] = useState<string>(
    leaseData.futureLeaseTerms?.paymentDayInPeriod || 'اليوم الأول من كل شهر'
  );
  const [leaseDuration, setLeaseDuration] = useState<string>(
    leaseData.futureLeaseTerms?.leaseDuration || 'ثلاث سنوات'
  );
  const [isRenewable, setIsRenewable] = useState<boolean>(
    leaseData.futureLeaseTerms?.isRenewable ?? true
  );
  const [chargesDistribution, setChargesDistribution] = useState<PromiseToLeaseDeed['futureLeaseTerms']['chargesDistribution']>(
    leaseData.futureLeaseTerms?.chargesDistribution || {
      waterElectricity: 'حسب_العداد',
      syndicFees: 'المكتري',
      cleaningAndGuarding: 'المكتري',
      communalServicesTax: 'المكتري',
    }
  );
  const [hasRentReview, setHasRentReview] = useState<boolean>(
    leaseData.futureLeaseTerms?.rentReview?.hasReview ?? true
  );
  const [reviewPercentage, setReviewPercentage] = useState<number>(
    leaseData.futureLeaseTerms?.rentReview?.reviewPercentage || (leasePurpose === 'سكنى' ? 8 : 10)
  );
  const [sublettingAllowed, setSublettingAllowed] = useState<PromiseToLeaseDeed['futureLeaseTerms']['sublettingAllowed']>(
    leaseData.futureLeaseTerms?.sublettingAllowed || 'مشروط_بموافقة_كتابية'
  );

  // 7. Point ⑧: Promise Deadlines (أجل الوعد وإعمال الخيار)
  const [deadlineType, setDeadlineType] = useState<PromiseToLeaseDeed['promiseDeadlines']['deadlineType']>(
    leaseData.promiseDeadlines?.deadlineType || 'تاريخ_محدد'
  );
  const [specificDeadlineDate, setSpecificDeadlineDate] = useState<string>(
    leaseData.promiseDeadlines?.specificDeadlineDate || ''
  );
  const [periodNumber, setPeriodNumber] = useState<number>(
    leaseData.promiseDeadlines?.periodNumber || 30
  );
  const [periodUnit, setPeriodUnit] = useState<PromiseToLeaseDeed['promiseDeadlines']['periodUnit']>(
    leaseData.promiseDeadlines?.periodUnit || 'أيام'
  );
  const [expiryConsequence, setExpiryConsequence] = useState<PromiseToLeaseDeed['promiseDeadlines']['expiryConsequence']>(
    leaseData.promiseDeadlines?.expiryConsequence || 'سقوط_الوعد_تلقائياً'
  );
  const [optionExerciseMethod, setOptionExerciseMethod] = useState<string>(
    leaseData.promiseDeadlines?.optionExerciseMethod || 'إشعار_كتابي'
  );

  // 8. Point ⑨: Financial Guarantees, Advance & Penalty Clause
  const [hasFinancialDeposit, setHasFinancialDeposit] = useState<PromiseToLeaseDeed['financialGuarantees']['hasFinancialDeposit']>(
    leaseData.financialGuarantees?.hasFinancialDeposit || 'لا'
  );
  const [depositAmount, setDepositAmount] = useState<number>(
    leaseData.financialGuarantees?.amount || 0
  );
  const [depositAmountInWords, setDepositAmountInWords] = useState<string>(
    leaseData.financialGuarantees?.amountInWords || ''
  );
  const [depositDate, setDepositDate] = useState<string>(
    leaseData.financialGuarantees?.paymentDate || ''
  );
  const [depositMethod, setDepositMethod] = useState<string>(
    leaseData.financialGuarantees?.paymentMethod || 'تحويل_بنكي'
  );
  const [depositReference, setDepositReference] = useState<string>(
    leaseData.financialGuarantees?.paymentReference || ''
  );
  const [breachRule, setBreachRule] = useState<PromiseToLeaseDeed['financialGuarantees']['breachRule']>(
    leaseData.financialGuarantees?.breachRule || 'تطبيق_الفصل_288_290_قلع'
  );
  const [hasPenaltyClause, setHasPenaltyClause] = useState<boolean>(
    leaseData.financialGuarantees?.hasPenaltyClause ?? false
  );
  const [penaltyClauseAmount, setPenaltyClauseAmount] = useState<number>(
    leaseData.financialGuarantees?.penaltyClauseAmount || 0
  );
  const [penaltyClauseText, setPenaltyClauseText] = useState<string>(
    leaseData.financialGuarantees?.penaltyClauseText || ''
  );

  // 9. Point ⑩: Suspensive Conditions
  const [suspensiveConditions, setSuspensiveConditions] = useState<PromiseToLeaseSuspensiveCondition[]>(() => {
    return leaseData.suspensiveConditions || [];
  });

  // 10. Point ⑨ & Occupancy: Current Status & Delivery
  const [occupancyStatus, setOccupancyStatus] = useState<PromiseToLeaseDeed['occupancyAndDelivery']['currentStatus']>(
    leaseData.occupancyAndDelivery?.currentStatus || 'فارغ'
  );
  const [expectedHandoverDate, setExpectedHandoverDate] = useState<string>(
    leaseData.occupancyAndDelivery?.expectedHandoverDate || ''
  );
  const [conditionAtHandover, setConditionAtHandover] = useState<PromiseToLeaseDeed['occupancyAndDelivery']['conditionAtHandover']>(
    leaseData.occupancyAndDelivery?.conditionAtHandover || 'جاهز_للاستعمال'
  );
  const [handoverInventoryAgreed, setHandoverInventoryAgreed] = useState<boolean>(
    leaseData.occupancyAndDelivery?.handoverInventoryAgreed ?? true
  );

  // 11. Point ⑪: Authority & Decree 2.23.101
  const [capacityBasis, setCapacityBasis] = useState<PromiseToLeaseDeed['authorityAndRepresentation']['promisorCapacityBasis']>(
    leaseData.authorityAndRepresentation?.promisorCapacityBasis || 'سند_الملكية'
  );
  const [poaReference, setPoaReference] = useState<string>(
    leaseData.authorityAndRepresentation?.poaReference || ''
  );
  const [isVerifiedDecree2_23_101, setIsVerifiedDecree2_23_101] = useState<boolean>(
    leaseData.authorityAndRepresentation?.isVerifiedUnderDecree2_23_101 ?? true
  );

  // 12. Point ⑫: Critical Test: "هل نحن أمام وعد أم كراء قائم؟"
  const [keysHandedOver, setKeysHandedOver] = useState<'نعم' | 'لا'>(
    leaseData.criticalExecutionTest?.hasKeysBeenHandedOver || 'لا'
  );
  const [tenantOccupied, setTenantOccupied] = useState<'نعم' | 'لا'>(
    leaseData.criticalExecutionTest?.hasTenantOccupiedPremises || 'لا'
  );
  const [rentPaidActive, setRentPaidActive] = useState<'نعم' | 'لا'>(
    leaseData.criticalExecutionTest?.hasRentBeenPaidForActivePeriod || 'لا'
  );

  // Critical Flag: Is Execution Already Started?
  const isExecutionStarted = useMemo(() => {
    return keysHandedOver === 'نعم' || tenantOccupied === 'نعم' || rentPaidActive === 'نعم';
  }, [keysHandedOver, tenantOccupied, rentPaidActive]);

  // Full state object memo
  const fullPromiseLeaseState = useMemo<PromiseToLeaseDeed>(() => {
    return {
      intendedOperation,
      promiseNature,
      promisors,
      promisees,
      propertyDetails,
      leasePurpose,
      leasePurposeDetails,
      legalRegime,
      isCommercialGoodwillIncluded,
      commercialActivityType,
      futureLeaseTerms: {
        rentAmount,
        rentAmountInWords,
        periodicity,
        paymentMethod,
        paymentDayInPeriod,
        leaseDuration,
        isRenewable,
        chargesDistribution,
        rentReview: {
          hasReview: hasRentReview,
          reviewBasis: 'قانون_07.03',
          reviewPercentage,
          reviewIntervalYears: 3,
        },
        sublettingAllowed,
      },
      promiseDeadlines: {
        deadlineType,
        specificDeadlineDate,
        periodNumber,
        periodUnit,
        expiryConsequence,
        optionExerciseMethod: optionExerciseMethod as any,
      },
      financialGuarantees: {
        hasFinancialDeposit,
        amount: depositAmount,
        amountInWords: depositAmountInWords,
        paymentDate: depositDate,
        paymentMethod: depositMethod,
        paymentReference: depositReference,
        breachRule,
        hasPenaltyClause,
        penaltyClauseAmount,
        penaltyClauseText,
      },
      suspensiveConditions,
      occupancyAndDelivery: {
        currentStatus: occupancyStatus,
        expectedHandoverDate,
        conditionAtHandover,
        handoverInventoryAgreed,
      },
      authorityAndRepresentation: {
        promisorCapacityBasis: capacityBasis,
        poaReference,
        isVerifiedUnderDecree2_23_101: isVerifiedDecree2_23_101,
      },
      criticalExecutionTest: {
        hasKeysBeenHandedOver: keysHandedOver,
        hasTenantOccupiedPremises: tenantOccupied,
        hasRentBeenPaidForActivePeriod: rentPaidActive,
      },
      isPreReceptionVerified: true,
    };
  }, [
    intendedOperation, promiseNature, promisors, promisees, propertyDetails, leasePurpose,
    leasePurposeDetails, legalRegime, isCommercialGoodwillIncluded, commercialActivityType,
    rentAmount, rentAmountInWords, periodicity, paymentMethod, paymentDayInPeriod, leaseDuration,
    isRenewable, chargesDistribution, hasRentReview, reviewPercentage, sublettingAllowed,
    deadlineType, specificDeadlineDate, periodNumber, periodUnit, expiryConsequence,
    optionExerciseMethod, hasFinancialDeposit, depositAmount, depositAmountInWords, depositDate,
    depositMethod, depositReference, breachRule, hasPenaltyClause, penaltyClauseAmount,
    penaltyClauseText, suspensiveConditions, occupancyStatus, expectedHandoverDate,
    conditionAtHandover, handoverInventoryAgreed, capacityBasis, poaReference,
    isVerifiedDecree2_23_101, keysHandedOver, tenantOccupied, rentPaidActive
  ]);

  // Keep parent in sync
  useEffect(() => {
    syncState({ promiseToLease: fullPromiseLeaseState });
  }, [fullPromiseLeaseState, syncState]);

  // Handle Rent Change and Auto Arabic Words
  const handleRentChange = (val: number) => {
    setRentAmount(val);
    if (val > 0) {
      setRentAmountInWords(convertNumberToArabicWords(val));
    } else {
      setRentAmountInWords('');
    }
  };

  // Handle Deposit Change and Auto Arabic Words
  const handleDepositChange = (val: number) => {
    setDepositAmount(val);
    if (val > 0) {
      setDepositAmountInWords(convertNumberToArabicWords(val));
    } else {
      setDepositAmountInWords('');
    }
  };

  // Promisor row handlers
  const addPromisor = () => {
    setPromisors(prev => [
      ...prev,
      {
        id: `plr-${prev.length + 1}`,
        isLegalEntity: false,
        partyType: 'طبيعي',
        fullName: '',
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        placeOfBirth: '',
        nationality: 'مغربي',
        idType: 'بطاقة_تعريف_وطنية',
        idNumber: '',
        address: '',
        profession: '',
        capacity: 'مالك',
        shareFraction: '1/1',
      },
    ]);
  };

  const removePromisor = (index: number) => {
    setPromisors(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updatePromisor = (index: number, patch: Partial<PromiseToLeasePartyInfo>) => {
    setPromisors(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  // Promisee row handlers
  const addPromisee = () => {
    setPromisees(prev => [
      ...prev,
      {
        id: `ple-${prev.length + 1}`,
        isLegalEntity: false,
        partyType: 'طبيعي',
        fullName: '',
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        placeOfBirth: '',
        nationality: 'مغربي',
        idType: 'بطاقة_تعريف_وطنية',
        idNumber: '',
        address: '',
        profession: '',
        capacity: 'طرف_مباشر',
        shareFraction: '1/1',
      },
    ]);
  };

  const removePromisee = (index: number) => {
    setPromisees(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updatePromisee = (index: number, patch: Partial<PromiseToLeasePartyInfo>) => {
    setPromisees(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  // Suspensive Condition handlers
  const addSuspensiveCondition = () => {
    setSuspensiveConditions(prev => [
      ...prev,
      {
        id: `sc-${prev.length + 1}`,
        type: 'رخصة_إدارية',
        conditionText: '',
        status: 'معلق',
        fulfillmentDeadline: '',
        consequenceOfBreach: 'انفساخ الوعد دون تعويض ورد العربون',
      },
    ]);
  };

  const removeSuspensiveCondition = (index: number) => {
    setSuspensiveConditions(prev => prev.filter((_, i) => i !== index));
  };

  const updateSuspensiveCondition = (index: number, patch: Partial<PromiseToLeaseSuspensiveCondition>) => {
    setSuspensiveConditions(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  // Top Card Summaries
  const promisorSummary = useMemo(() => {
    const valid = promisors.filter(p => (p.isLegalEntity ? p.companyName : p.fullName));
    if (!valid.length) return 'لم يحدد بعد';
    if (valid.length === 1) return valid[0].isLegalEntity ? (valid[0].companyName || 'شركة') : valid[0].fullName;
    return `${valid[0].isLegalEntity ? valid[0].companyName : valid[0].fullName} وآخرون (${valid.length})`;
  }, [promisors]);

  const promiseeSummary = useMemo(() => {
    const valid = promisees.filter(p => (p.isLegalEntity ? p.companyName : p.fullName));
    if (!valid.length) return 'لم يحدد بعد';
    if (valid.length === 1) return valid[0].isLegalEntity ? (valid[0].companyName || 'شركة') : valid[0].fullName;
    return `${valid[0].isLegalEntity ? valid[0].companyName : valid[0].fullName} وآخرون (${valid.length})`;
  }, [promisees]);

  const propertySummary = useMemo(() => {
    if (propertyDetails.propertyStatus === 'محفظ') {
      return propertyDetails.titleNumber ? `رسم عقاري عدد ${propertyDetails.titleNumber}` : 'عقار محفظ';
    }
    if (propertyDetails.propertyStatus === 'طور_التحفيظ') {
      return propertyDetails.requisitionNumber ? `مطلب تحفيظ عدد ${propertyDetails.requisitionNumber}` : 'طور التحفيظ';
    }
    return propertyDetails.propertyName || propertyDetails.exactAddress || 'عقار غير محفظ';
  }, [propertyDetails]);

  const deadlineSummary = useMemo(() => {
    if (deadlineType === 'تاريخ_محدد' && specificDeadlineDate) return specificDeadlineDate;
    if (deadlineType === 'أجل_بالأيام_أو_الأشهر') return `${periodNumber} ${periodUnit}`;
    return 'مرتبط بشرط واقف';
  }, [deadlineType, specificDeadlineDate, periodNumber, periodUnit]);

  // Validation Status
  const validationStatus = useMemo(() => {
    if (isExecutionStarted) {
      return { text: 'تنبيه كراء فعلي', color: 'bg-red-100 text-red-800 border-red-300' };
    }
    const hasPromisor = promisors.some(p => (p.isLegalEntity ? p.companyName : p.fullName));
    const hasPromisee = promisees.some(p => (p.isLegalEntity ? p.companyName : p.fullName));
    const hasProperty = propertyDetails.exactAddress || propertyDetails.titleNumber;
    const hasRent = rentAmount > 0;

    if (hasPromisor && hasPromisee && hasProperty && hasRent) {
      return { text: 'مكتمل ومطابق قانونياً', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { text: 'قيد الفحص والتدقيق', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }, [isExecutionStarted, promisors, promisees, propertyDetails, rentAmount]);

  // Final Action: Direct Wire to Step 7 (المراجعة الذكية والتوثيق)
  const handleProceedToStep7 = () => {
    const currentState: FeesAgentState = {
      ...state,
      documentType: 'وعد_بالكراء',
      promiseToLease: fullPromiseLeaseState,
      sellers: promisors.map(p => ({
        id: p.id,
        name: p.fullName || p.companyName || '',
        idNumber: p.idNumber || p.ice || '',
        idIssueDate: '',
        idImage: '',
        address: p.address || p.headquarters || '',
        profession: p.profession || '',
        fatherName: p.fatherName || '',
        motherName: p.motherName || '',
        actingCapacity: p.isLegalEntity ? 'legal_representative' : 'seller',
        legalEntityName: p.companyName,
        legalForm: p.companyForm,
        commercialRegister: p.rcNumber,
        ice: p.ice,
        headquartersAddress: p.headquarters,
        legalRepresentativeName: p.legalRepresentativeName,
        legalRepresentativeCapacity: p.legalRepresentativeCapacity,
      })) as any,
      buyers: promisees.map(b => ({
        id: b.id,
        name: b.fullName || b.companyName || '',
        idNumber: b.idNumber || b.ice || '',
        idIssueDate: '',
        idImage: '',
        address: b.address || b.headquarters || '',
        profession: b.profession || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        actingCapacity: b.isLegalEntity ? 'legal_representative' : 'buyer',
        legalEntityName: b.companyName,
        legalForm: b.companyForm,
        commercialRegister: b.rcNumber,
        ice: b.ice,
        headquartersAddress: b.headquarters,
        legalRepresentativeName: b.legalRepresentativeName,
        legalRepresentativeCapacity: b.legalRepresentativeCapacity,
      })) as any,
      finance: {
        registeredWithTax: '',
        price: rentAmount,
        priceInWords: rentAmountInWords,
        paymentMethod: (paymentMethod === 'أخرى' ? '' : paymentMethod) as any,
        ...(state.finance || {}),
      } as any,
    };

    const draftText = generatePromiseToLeaseDraft(currentState);

    setState(prev => ({
      ...prev,
      ...currentState,
      step: 7,
      draft: draftText,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. PERSISTENT TOP CARD (بطاقة رسم الوعد بالكراء)                          */}
      {/* ========================================================================= */}
      <div className="sticky top-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-5 border-2 border-slate-200/80 shadow-xl transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">رسم وعد بإبرام عقد كراء</h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  🟢 وعد بالكراء — قيد التحقق
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                وفق القانون 67.12 (سكنى/مهني) والقانون 49.16 (تجاري) والفصل 14 من ظهير الالتزامات والعقود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Link to Step 0.25 Pre-Reception Verification Gate */}
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: 0.25 }))}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 border border-teal-600/30"
              title="الانتقال إلى بوابة التحقق القبلي وشروط التلقي العدلي"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>بوابة التلقي العدلي (0.25)</span>
            </button>

            <span className={`px-3 py-1 text-xs font-black rounded-lg border ${validationStatus.color}`}>
              {validationStatus.text}
            </span>
          </div>
        </div>

        {/* Top Card Data Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">📜 نوع العملية</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5">وعد بالكراء</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">🏠 المحل المكترى</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5" title={propertySummary}>
              {propertySummary}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">👤 الواعد بالكراء</span>
            <span className="font-bold text-emerald-800 truncate block mt-0.5" title={promisorSummary}>
              {promisorSummary}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">👤 الموعود له</span>
            <span className="font-bold text-blue-800 truncate block mt-0.5" title={promiseeSummary}>
              {promiseeSummary}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">🎯 الغرض والمدة</span>
            <span className="font-bold text-amber-900 truncate block mt-0.5">
              {leasePurpose} ({leaseDuration})
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold">💰 السومة / الأجل</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {rentAmount > 0 ? `${rentAmount.toLocaleString()} د.م` : 'لم تحدد'} / {deadlineSummary}
            </span>
          </div>
        </div>

        {/* Critical Execution Warning Banner if triggered */}
        {isExecutionStarted && (
          <div className="mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-2.5 text-red-900 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-black">⚠️ تنبيه قضائي عاجل ومؤكد: </span>
              الواقع المادي المدخل يشير إلى قيام علاقة كرائية فعلية (تسليم مفاتيح أو وضع يد أو أداء كراء عن مدة جارية) وليس مجرد وعد بالكراء. وفق الفصل 628 من ق.ل.ع ومقتضيات القانونين 67.12 و 49.16، فإن شغل المحل يعد تنفيذاً لعقد الكراء. يُنصح بتحرير رسم كراء رسمي مباشر لتفادي النزاع أو إعادة تكييف العقد قضائياً.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION TABS NAVIGATION                                                */}
      {/* ========================================================================= */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs font-bold scrollbar-none">
        {[
          { id: 1, label: '① نقطة البداية والتكييف', icon: Scale },
          { id: 2, label: '② أطراف الوعد (الواعد والموعود له)', icon: Users },
          { id: 3, label: '③ المحل المكترى والنظام القانوني', icon: Building2 },
          { id: 4, label: '④ شروط الكراء والأجل المالي', icon: DollarSign },
          { id: 5, label: '⑤ الشروط الواقفة والضمانات', icon: ShieldCheck },
          { id: 6, label: '⑥ الاختبار الحاسم والاعتماد (7)', icon: FileCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentStage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentStage(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-md border border-emerald-200 font-black'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: نقطة البداية الذكية والتكييف القانوني (الفصل 14 ق.ل.ع)              */}
      {/* ========================================================================= */}
      {currentStage === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span>المرحلة الأولى: نقطة البداية الذكية والتكييف القانوني للوعد</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              التمييز بين الوعد والاتفاق التمهيدي وعقد الكراء الفوري وفق الفصل 14 من ظهير الالتزامات والعقود واجتهاد محكمة النقض
            </p>
          </div>

          {/* Intended Operation Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              ماذا تريد تحريره في هذا الملف؟ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: 'وعد_بالكراء', title: '📜 وعد بالكراء', desc: 'التزام بإبرام عقد كراء عند حلول أجل أو شرط' },
                { id: 'وعد_متبادل', title: '🤝 وعد متبادل بإبرام الكراء', desc: 'التزام متبادل وملزم للطرفين معاً' },
                { id: 'عقد_كراء', title: '📋 عقد كراء فوري', desc: 'كراء نافذ مع وضع يد وشغل المحل' },
                { id: 'تجديد_كراء', title: '🔄 تجديد كراء سابق', desc: 'تمديد أو تجديد عقد كراء جارٍ' },
                { id: 'أخرى', title: '📂 عملية أخرى', desc: 'تصرف كرائي أو عقاري آخر' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setIntendedOperation(opt.id as any)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    intendedOperation === opt.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                </div>
              ))}
            </div>

            {intendedOperation === 'عقد_كراء' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>إرشاد توثيقي:</strong> إذا كانت الأركان تامة والمحل جاهزاً ومسَلّماً بالفعل، يُستحسن تحرير رسم كراء نهائي مباشر بدلاً من رسم الوعد بالكراء لتفادي الازدواج الإجرائي.
                </div>
              </div>
            )}
          </div>

          {/* Legal Characterization (الفصل 14 ق.ل.ع) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-800">
              التكييف القانوني للوعد (المادة 14 من ق.ل.ع واجتهاد محكمة النقض)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'وعد_متبادل', title: 'وعد متبادل بإبرام الكراء', desc: 'الواعد يلتزم بالإكراء والموعود له يلتزم بالاكتراء عند الأجل' },
                { id: 'وعد_من_جانب_واحد', title: 'وعد ملزم لجانب واحد (المكري)', desc: 'الواعد يلتزم بالكراء مع منح الموعود له حق الخيار' },
                { id: 'اتفاق_تمهيدي_مشروط', title: 'اتفاق تمهيدي معلق على شروط واقفة', desc: 'الارتباط مشروط بتحقق تراخيص إدارية أو إصلاحات' },
                { id: 'وعد_مع_خيار_الموعود_له', title: 'وعد مقرون بشرط جزائي وخيار صريح', desc: 'حق استرداد العربون أو إعمال الشرط الجزائي عند النكول' },
              ].map(item => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    promiseNature === item.id
                      ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="promiseNature"
                    checked={promiseNature === item.id}
                    onChange={() => setPromiseNature(item.id as any)}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-black text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Smart Judicial Alert Box */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-xl shadow-md space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>تنبيه قضائي ذكي من مقتضيات الفصل 14 من ظهير الالتزامات والعقود:</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                «مجرد الوعد لا ينشئ التزامًا إلا إذا اقترن بأجل محدد وقبول صريح من الموعود له، أو كان متبادلًا مستجمعًا لأركان الكراء الأساسية (المحل، الأجرة، والمدة). ولا يجوز أن يتحول الوعد إلى وسيلة للتهرب من أحكام الكراء التجاري أو استقرار الكراء السكني.»
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي: أطراف الوعد (المكري والمكتري المزمع)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: أطراف الوعد (الواعد بالكراء والموعود له بالكراء)                    */}
      {/* ========================================================================= */}
      {currentStage === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>المرحلة الثانية: أطراف الوعد بالكراء (محرك الأشخاص والشركات)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              التعريف بالواعد (المكري أو وكيله أو ممثله) والموعود له (المكتري المزمع)، ودعم الشخص المعنوي وفق القوانين المغربية
            </p>
          </div>

          {/* 1. PROMISORS SECTION (الواعدون بالكراء) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>الطرف الواعد بالكراء (المكري / صاحب الحق) ({promisors.length})</span>
              </h4>
              <button
                type="button"
                onClick={addPromisor}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة واعد آخر</span>
              </button>
            </div>

            {promisors.map((p, idx) => (
              <div key={p.id || idx} className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-700">واعد رقم ({idx + 1}):</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePromisor(idx, { isLegalEntity: false, partyType: 'طبيعي' })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                          !p.isLegalEntity
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        شخص طبيعي
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePromisor(idx, { isLegalEntity: true, partyType: 'معنوي_مغربي' })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                          p.isLegalEntity
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        🏢 شخص معنوي (شركة / هيئة)
                      </button>
                    </div>
                  </div>

                  {promisors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePromisor(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="حذف هذا الواعد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {!p.isLegalEntity ? (
                  /* Natural Person Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الاسم الكامل</label>
                      <input
                        type="text"
                        value={p.fullName || ''}
                        onChange={e => updatePromisor(idx, { fullName: e.target.value })}
                        placeholder="الاسم الكامل للواعد"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الأب</label>
                      <input
                        type="text"
                        value={p.fatherName || ''}
                        onChange={e => updatePromisor(idx, { fatherName: e.target.value })}
                        placeholder="اسم الأب"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الأم</label>
                      <input
                        type="text"
                        value={p.motherName || ''}
                        onChange={e => updatePromisor(idx, { motherName: e.target.value })}
                        placeholder="اسم الأم"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم البطاقة (CIN)</label>
                      <input
                        type="text"
                        value={p.idNumber || ''}
                        onChange={e => updatePromisor(idx, { idNumber: e.target.value })}
                        placeholder="رقم بطاقة التعريف"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الصفة في المحل</label>
                      <select
                        value={p.capacity || 'مالك'}
                        onChange={e => updatePromisor(idx, { capacity: e.target.value as any })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
                      >
                        <option value="مالك">مالك العقار التام</option>
                        <option value="صاحب_حق_انتفاع">صاحب حق انتفاع</option>
                        <option value="مالك_على_الشياع">مالك على الشياع</option>
                        <option value="وكيل_خاص">وكيل بموجب وكالة خاصة</option>
                        <option value="ممثل_قانوني">ممثل قانوني</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المهنة</label>
                      <input
                        type="text"
                        value={p.profession || ''}
                        onChange={e => updatePromisor(idx, { profession: e.target.value })}
                        placeholder="المهنة"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-bold mb-1">عنوان السكنى</label>
                      <input
                        type="text"
                        value={p.address || ''}
                        onChange={e => updatePromisor(idx, { address: e.target.value })}
                        placeholder="العنوان الكامل"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Legal Entity Fields (Corporate Engine) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تسمية الشركة / الهيئة</label>
                      <input
                        type="text"
                        value={p.companyName || ''}
                        onChange={e => updatePromisor(idx, { companyName: e.target.value })}
                        placeholder="اسم الشركة التجاري"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الشكل القانوني</label>
                      <select
                        value={p.companyForm || 'شركة ذات مسؤولية محدودة SARL'}
                        onChange={e => updatePromisor(idx, { companyForm: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="شركة ذات مسؤولية محدودة SARL">SARL - ذات مسؤولية محدودة</option>
                        <option value="شركة مساهمة SA">SA - شركة مساهمة</option>
                        <option value="شركة مبسطة SAS">SAS - مساهمة مبسطة</option>
                        <option value="شركة تضامن SNC">SNC - شركة تضامن</option>
                        <option value="تعاونية">تعاونية</option>
                        <option value="جمعية">جمعية</option>
                        <option value="مؤسسة عامة">مؤسسة عامة / هيئة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم السجل التجاري (RC)</label>
                      <input
                        type="text"
                        value={p.rcNumber || ''}
                        onChange={e => updatePromisor(idx, { rcNumber: e.target.value })}
                        placeholder="رقم السجل التجاري"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المعرف الموحد (ICE)</label>
                      <input
                        type="text"
                        value={p.ice || ''}
                        onChange={e => updatePromisor(idx, { ice: e.target.value })}
                        placeholder="15 رقماً"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الممثل القانوني</label>
                      <input
                        type="text"
                        value={p.legalRepresentativeName || ''}
                        onChange={e => updatePromisor(idx, { legalRepresentativeName: e.target.value })}
                        placeholder="الاسم الكامل للمسير أو الوكيل"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">صفة وسند التمثيل</label>
                      <input
                        type="text"
                        value={p.legalRepresentativeCapacity || ''}
                        onChange={e => updatePromisor(idx, { legalRepresentativeCapacity: e.target.value })}
                        placeholder="المسير بمقتضى النظام الأساسي"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 font-bold mb-1">المقر الاجتماعي</label>
                      <input
                        type="text"
                        value={p.headquarters || ''}
                        onChange={e => updatePromisor(idx, { headquarters: e.target.value })}
                        placeholder="العنوان الكامل للمقر الاجتماعي"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2. PROMISEES SECTION (الموعود لهم بالكراء) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-blue-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>الطرف الموعود له بالكراء (المكتري المزمع) ({promisees.length})</span>
              </h4>
              <button
                type="button"
                onClick={addPromisee}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موعود له آخر</span>
              </button>
            </div>

            {promisees.map((p, idx) => (
              <div key={p.id || idx} className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-700">موعود له رقم ({idx + 1}):</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePromisee(idx, { isLegalEntity: false, partyType: 'طبيعي' })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                          !p.isLegalEntity
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        شخص طبيعي
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePromisee(idx, { isLegalEntity: true, partyType: 'معنوي_مغربي' })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                          p.isLegalEntity
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        🏢 شخص معنوي (شركة / مقاولة)
                      </button>
                    </div>
                  </div>

                  {promisees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePromisee(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="حذف هذا الموعود له"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {!p.isLegalEntity ? (
                  /* Natural Person Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الاسم الكامل</label>
                      <input
                        type="text"
                        value={p.fullName || ''}
                        onChange={e => updatePromisee(idx, { fullName: e.target.value })}
                        placeholder="الاسم الكامل للموعود له"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الأب</label>
                      <input
                        type="text"
                        value={p.fatherName || ''}
                        onChange={e => updatePromisee(idx, { fatherName: e.target.value })}
                        placeholder="اسم الأب"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الأم</label>
                      <input
                        type="text"
                        value={p.motherName || ''}
                        onChange={e => updatePromisee(idx, { motherName: e.target.value })}
                        placeholder="اسم الأم"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم البطاقة (CIN)</label>
                      <input
                        type="text"
                        value={p.idNumber || ''}
                        onChange={e => updatePromisee(idx, { idNumber: e.target.value })}
                        placeholder="رقم بطاقة التعريف"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المهنة / النشاط</label>
                      <input
                        type="text"
                        value={p.profession || ''}
                        onChange={e => updatePromisee(idx, { profession: e.target.value })}
                        placeholder="مهنة المكتري"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 font-bold mb-1">عنوان السكنى</label>
                      <input
                        type="text"
                        value={p.address || ''}
                        onChange={e => updatePromisee(idx, { address: e.target.value })}
                        placeholder="العنوان الكامل"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Legal Entity Fields */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">تسمية الشركة / الهيئة</label>
                      <input
                        type="text"
                        value={p.companyName || ''}
                        onChange={e => updatePromisee(idx, { companyName: e.target.value })}
                        placeholder="اسم الشركة المكترية"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الشكل القانوني</label>
                      <select
                        value={p.companyForm || 'شركة ذات مسؤولية محدودة SARL'}
                        onChange={e => updatePromisee(idx, { companyForm: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="شركة ذات مسؤولية محدودة SARL">SARL - ذات مسؤولية محدودة</option>
                        <option value="شركة مساهمة SA">SA - شركة مساهمة</option>
                        <option value="شركة مبسطة SAS">SAS - مساهمة مبسطة</option>
                        <option value="شركة تضامن SNC">SNC - شركة تضامن</option>
                        <option value="تعاونية">تعاونية</option>
                        <option value="جمعية">جمعية</option>
                        <option value="مؤسسة عامة">مؤسسة عامة / هيئة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">رقم السجل التجاري (RC)</label>
                      <input
                        type="text"
                        value={p.rcNumber || ''}
                        onChange={e => updatePromisee(idx, { rcNumber: e.target.value })}
                        placeholder="رقم السجل التجاري"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">المعرف الموحد (ICE)</label>
                      <input
                        type="text"
                        value={p.ice || ''}
                        onChange={e => updatePromisee(idx, { ice: e.target.value })}
                        placeholder="15 رقماً"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">اسم الممثل القانوني</label>
                      <input
                        type="text"
                        value={p.legalRepresentativeName || ''}
                        onChange={e => updatePromisee(idx, { legalRepresentativeName: e.target.value })}
                        placeholder="الاسم الكامل للمسير أو الوكيل"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">صفة التمثيل</label>
                      <input
                        type="text"
                        value={p.legalRepresentativeCapacity || ''}
                        onChange={e => updatePromisee(idx, { legalRepresentativeCapacity: e.target.value })}
                        placeholder="المسير القانوني"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-slate-600 font-bold mb-1">المقر الاجتماعي</label>
                      <input
                        type="text"
                        value={p.headquarters || ''}
                        onChange={e => updatePromisee(idx, { headquarters: e.target.value })}
                        placeholder="العنوان الكامل للمقر الاجتماعي"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStage(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: التكييف</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي: المحل والنظام القانوني</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: المحل المكترى والنظام القانوني المطبق (قانون 67.12 / 49.16)           */}
      {/* ========================================================================= */}
      {currentStage === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>المرحلة الثالثة: المحل الموعود بكرائه وتحديد النظام القانوني</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              الربط الآلي بين الغرض والنظام القانوني (قانون 67.12 للسكنى والمهني / قانون 49.16 للتجاري والصناعي) وبيانات التحفيظ
            </p>
          </div>

          {/* 1. Purpose & Legal Regime Engine (نقطة الربط الآلي) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>الغرض المخصص له المحل (يحدد النظام القانوني تلقائياً)</span>
              </label>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg border border-emerald-300">
                النظام المطبق: {legalRegime === 'قانون_49.16' ? 'القانون 49.16 (تجاري/صناعي)' : legalRegime === 'قانون_67.12' ? 'القانون 67.12 (سكنى/مهني)' : 'القواعد العامة (ق.ل.ع)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {[
                { id: 'سكنى', label: '🏡 سكنى', regime: '67.12' },
                { id: 'مهني', label: '💼 مهني', regime: '67.12' },
                { id: 'تجاري', label: '🏪 تجاري', regime: '49.16' },
                { id: 'صناعي', label: '🏭 صناعي', regime: '49.16' },
                { id: 'حرفي', label: '🔨 حرفي', regime: '49.16' },
                { id: 'تعليمي', label: '🎓 تعليمي/صحي', regime: 'خاص' },
                { id: 'آخر', label: '📂 غرض آخر', regime: 'ق.ل.ع' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLeasePurpose(opt.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    leasePurpose === opt.id
                      ? 'border-emerald-600 bg-emerald-600 text-white font-black shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${leasePurpose === opt.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                    قانون {opt.regime}
                  </div>
                </button>
              ))}
            </div>

            {/* Commercial specifics */}
            {(leasePurpose === 'تجاري' || leasePurpose === 'صناعي' || leasePurpose === 'حرفي') && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>مقتضيات خاصة بالكراء التجاري (القانون 49.16):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">النشاط التجاري المزمع ممارسته بدقة</label>
                    <input
                      type="text"
                      value={commercialActivityType}
                      onChange={e => setCommercialActivityType(e.target.value)}
                      placeholder="مثال: مطعم ومقهى، صيدلية، متجر ملابس..."
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">هل يشمل الكراء أصلاً تجارياً أم الجدران فقط؟</label>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCommercialGoodwillIncluded(false)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                          !isCommercialGoodwillIncluded ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600'
                        }`}
                      >
                        الجدران فقط (كراء عقاري)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCommercialGoodwillIncluded(true)}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs ${
                          isCommercialGoodwillIncluded ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600'
                        }`}
                      >
                        يشمل أصلاً تجارياً قائماً
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800">
                  * تذكير: يكتسب المكتري الحق في الكراء (الحق في تجديد العقد) بعد مرور سنتين متتاليتين من الاستغلال الفعلي بمقتضى المادة 4 من القانون 49.16.
                </p>
              </div>
            )}

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <label className="block text-slate-700 font-bold mb-1">بيان تفصيلي لغرض وتخصيص المحل المكترى</label>
              <input
                type="text"
                value={leasePurposeDetails}
                onChange={e => setLeasePurposeDetails(e.target.value)}
                placeholder="مثال: سكنى عائلية رئيسية، مقر شركة استشارات، عيادة طبية..."
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* 2. Premises Details & Legal Status */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span>الوضع العقاري ومواصفات المحل المكترى</span>
            </h4>

            {/* Property Status Radio */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { id: 'محفظ', label: 'رسم عقاري (محفظ)', icon: '🏛️' },
                { id: 'طور_التحفيظ', label: 'مطلب تحفيظ', icon: '📝' },
                { id: 'ملكية_مشتركة', label: 'ملكية مشتركة', icon: '🏢' },
                { id: 'غير_محفظ', label: 'ملك عادي (غير محفظ)', icon: '📜' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setPropertyDetails(prev => ({ ...prev, propertyStatus: st.id as any }))}
                  className={`p-3 rounded-xl border font-bold text-center transition-all ${
                    propertyDetails.propertyStatus === st.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base block mb-0.5">{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>

            {/* Scope: Entire Property or Part of Property */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-800">نطاق المحل بالنسبة للعقار:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyDetails(prev => ({ ...prev, isEntireProperty: true }))}
                  className={`px-3 py-1.5 rounded-lg border font-bold ${
                    propertyDetails.isEntireProperty ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600'
                  }`}
                >
                  كامل العقار ومرافقه
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyDetails(prev => ({ ...prev, isEntireProperty: false }))}
                  className={`px-3 py-1.5 rounded-lg border font-bold ${
                    !propertyDetails.isEntireProperty ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600'
                  }`}
                >
                  جزء مفرز من العقار (شقة، محل تجاري، طابق...)
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">نوع المحل</label>
                <select
                  value={propertyDetails.premisesType}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, premisesType: e.target.value as any }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  <option value="محل_تجاري">محل تجاري</option>
                  <option value="شقة">شقة سكنية</option>
                  <option value="فيلا">فيلا</option>
                  <option value="مكتب_مهني">مكتب مهني / إداري</option>
                  <option value="مستودع_هنجار">مستودع / هنجار صناعي</option>
                  <option value="أرض_عارية">أرض عارية للكراء</option>
                  <option value="جزء_مفرز">جزء مفرز من عقار</option>
                  <option value="عقار_كامل">عقار كامل</option>
                </select>
              </div>

              {propertyDetails.propertyStatus === 'محفظ' && (
                <>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">رقم الرسم العقاري</label>
                    <input
                      type="text"
                      value={propertyDetails.titleNumber || ''}
                      onChange={e => setPropertyDetails(prev => ({ ...prev, titleNumber: e.target.value }))}
                      placeholder="مثال: 123456"
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">مؤشر الرسم العقاري</label>
                    <input
                      type="text"
                      value={propertyDetails.titleIndex || ''}
                      onChange={e => setPropertyDetails(prev => ({ ...prev, titleIndex: e.target.value }))}
                      placeholder="مثال: 01"
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-left"
                    />
                  </div>
                </>
              )}

              {propertyDetails.propertyStatus === 'طور_التحفيظ' && (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم مطلب التحفيظ</label>
                  <input
                    type="text"
                    value={propertyDetails.requisitionNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, requisitionNumber: e.target.value }))}
                    placeholder="مثال: 5678/م"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-left"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم العقار (إن وجد)</label>
                <input
                  type="text"
                  value={propertyDetails.propertyName || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, propertyName: e.target.value }))}
                  placeholder="اسم العقار أو الإقامة"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المساحة التقريبية (م²)</label>
                <input
                  type="number"
                  value={propertyDetails.areaSquareMeters || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, areaSquareMeters: Number(e.target.value) || undefined }))}
                  placeholder="المساحة بالأمتار المربعة"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المدينة</label>
                <input
                  type="text"
                  value={propertyDetails.city || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="المدينة"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">العنوان الدقيق للمحل</label>
                <input
                  type="text"
                  value={propertyDetails.exactAddress || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, exactAddress: e.target.value }))}
                  placeholder="الشارع، رقم المحل، الحي، الرمز البريدي"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Part Specification if not entire */}
            {!propertyDetails.isEntireProperty && (
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم المحل / الشقة المفرزة</label>
                  <input
                    type="text"
                    value={propertyDetails.partSpecification?.partNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({
                      ...prev,
                      partSpecification: { ...(prev.partSpecification || {}), partNumber: e.target.value }
                    }))}
                    placeholder="رقم المحل"
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الطابق</label>
                  <input
                    type="text"
                    value={propertyDetails.partSpecification?.floorNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({
                      ...prev,
                      partSpecification: { ...(prev.partSpecification || {}), floorNumber: e.target.value }
                    }))}
                    placeholder="الطابق السفلي، الأول..."
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحدود والمعالم الخاصة</label>
                  <input
                    type="text"
                    value={propertyDetails.partSpecification?.boundariesDescription || ''}
                    onChange={e => setPropertyDetails(prev => ({
                      ...prev,
                      partSpecification: { ...(prev.partSpecification || {}), boundariesDescription: e.target.value }
                    }))}
                    placeholder="يحده يميناً... وشمالاً..."
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-bold mb-1">مشتملات المحل وتجهيزاته</label>
              <textarea
                rows={2}
                value={propertyDetails.componentsAndDesignation || ''}
                onChange={e => setPropertyDetails(prev => ({ ...prev, componentsAndDesignation: e.target.value }))}
                placeholder="بيان تفصيلي: غرف، مرافق صحية، واجهة زجاجية، عداد كهرباء مستقل..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الأطراف</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي: شروط الكراء والأجل</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: شروط الكراء المزمع والأجل المالي (السومة والمدة والتحملات)            */}
      {/* ========================================================================= */}
      {currentStage === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>المرحلة الرابعة: شروط عقد الكراء المزمع والأجل المالي</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تحديد الوجيبة الكرائية، الدورية، طريقة الأداء، مدة الكراء، والتمييز القاطع بين أجل الوعد ومدة الكراء
            </p>
          </div>

          {/* 1. Rent Amount & Periodicity */}
          <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 space-y-4">
            <h4 className="text-xs font-black text-emerald-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>الوجيبة الكرائية المتفق عليها للعقد النهائي</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الوجيبة الكرائية بالدرهم <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rentAmount || ''}
                    onChange={e => handleRentChange(Number(e.target.value) || 0)}
                    placeholder="مثال: 5000"
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-black text-base text-emerald-800 pr-3 pl-12 text-left"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">د.م</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">الوجيبة بالحروف العربية</label>
                <input
                  type="text"
                  value={rentAmountInWords}
                  onChange={e => setRentAmountInWords(e.target.value)}
                  placeholder="تولد تلقائياً بالحروف العربية"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">دورية الأداء</label>
                <select
                  value={periodicity}
                  onChange={e => setPeriodicity(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="شهري">شهرياً (أول كل شهر)</option>
                  <option value="ربع_سنوي">كل 3 أشهر (ربع سنوي)</option>
                  <option value="نصف_سنوي">كل 6 أشهر (نصف سنوي)</option>
                  <option value="سنوي">سنوياً</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">موعد استحقاق الوجيبة</label>
                <input
                  type="text"
                  value={paymentDayInPeriod}
                  onChange={e => setPaymentDayInPeriod(e.target.value)}
                  placeholder="مثال: اليوم الأول من كل شهر، أو خلال خمسة أيام..."
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">طريقة الأداء</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="تحويل_بنكي">تحويل بنكي رسمي</option>
                  <option value="شيك_بنكي">شيك بنكي</option>
                  <option value="خصم_أوتوماتيكي">اقتطاع بنكي أوتوماتيكي</option>
                  <option value="نقد">نقداً مقابل توصيل رسمي</option>
                  <option value="أخرى">طريقة أخرى متفق عليها</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مدة الكراء النهائي المزمع</label>
                <input
                  type="text"
                  value={leaseDuration}
                  onChange={e => setLeaseDuration(e.target.value)}
                  placeholder="سنة واحدة / ثلاث سنوات"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تجديد العقد النهائي</label>
                <select
                  value={isRenewable ? 'نعم' : 'لا'}
                  onChange={e => setIsRenewable(e.target.value === 'نعم')}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="نعم">قابل للتجديد باتفاق الطرفين</option>
                  <option value="لا">غير قابل للتجديد الضمني إلا باتفاق مكتوب</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الكراء من الباطن والتولية</label>
                <select
                  value={sublettingAllowed}
                  onChange={e => setSublettingAllowed(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="مشروط_بموافقة_كتابية">مشروط بموافقة كتابية مسبقة من المكري</option>
                  <option value="ممنوع_مطلقاً">ممنوع منعاً باتاً ومطلقاً</option>
                  <option value="مسموح_به">مسموح به قانوناً</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Deadlines: Distinct Promise Expiry vs Lease Duration */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>أجل الوعد وإعمال الخيار (متميز تماماً عن مدة الكراء)</span>
              </h4>
              <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                أجل الوعد: أجل ممارسة خيار التعاقد
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع تحديد الأجل</label>
                <select
                  value={deadlineType}
                  onChange={e => setDeadlineType(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="تاريخ_محدد">تاريخ محدد باليوم والشهر والسنة</option>
                  <option value="أجل_بالأيام_أو_الأشهر">مدة زمنية (عدد أيام أو أشهر)</option>
                  <option value="مرتبط_بشرط">معلق على تحقق شرط واقف</option>
                </select>
              </div>

              {deadlineType === 'تاريخ_محدد' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">أجل إبرام الكراء النهائي كحد أقصى</label>
                  <input
                    type="date"
                    value={specificDeadlineDate}
                    onChange={e => setSpecificDeadlineDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-slate-700 font-bold mb-1">العدد</label>
                    <input
                      type="number"
                      value={periodNumber}
                      onChange={e => setPeriodNumber(Number(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-slate-700 font-bold mb-1">الوحدة</label>
                    <select
                      value={periodUnit}
                      onChange={e => setPeriodUnit(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    >
                      <option value="أيام">يوماً</option>
                      <option value="أشهر">شهراً</option>
                      <option value="سنوات">سنوات</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">مآل انصرام الأجل دون إبرام العقد</label>
                <select
                  value={expiryConsequence}
                  onChange={e => setExpiryConsequence(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="سقوط_الوعد_تلقائياً">سقوط الوعد تلقائياً وبراءة الذمة</option>
                  <option value="تجديد_باتفاق_كتابي">إمكانية التمديد باتفاق كتابي</option>
                  <option value="إعمال_الشرط_الجزائي">إعمال الشرط الجزائي المتفق عليه</option>
                  <option value="فقدان_العربون_أو_استرداده">فقدان أو استرداد العربون</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">طريقة ممارسة خيار التعاقد</label>
                <select
                  value={optionExerciseMethod}
                  onChange={e => setOptionExerciseMethod(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="إشعار_كتابي">إشعار كتابي رسمي موجه للواعد</option>
                  <option value="إنذار_مفوض_قضائي">تبليغ بواسطة مفوض قضائي</option>
                  <option value="حضور_مجلس_العقد_مباشرة">حضور مباشر لمجلس الإشهاد العدلي</option>
                  <option value="مراسلة_مضمونة">مراسلة مضمونة مع الإشعار بالتوصل</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Rent Review & Utilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Rent Review Box (Law 07.03) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">مراجعة السومة الكرائية (القانون 07.03)</span>
                <input
                  type="checkbox"
                  checked={hasRentReview}
                  onChange={e => setHasRentReview(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
              {hasRentReview ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">نسبة الزيادة القانونية الدورية:</span>
                    <span className="font-black text-emerald-700">{reviewPercentage}% كل ثلاث سنوات</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewPercentage(8)}
                      className={`px-3 py-1 rounded-lg border font-bold ${
                        reviewPercentage === 8 ? 'bg-emerald-600 text-white' : 'bg-white'
                      }`}
                    >
                      8% (السكنى)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewPercentage(10)}
                      className={`px-3 py-1 rounded-lg border font-bold ${
                        reviewPercentage === 10 ? 'bg-emerald-600 text-white' : 'bg-white'
                      }`}
                    >
                      10% (التجاري/المهني)
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400">بدون مراجعة دورية</span>
              )}
            </div>

            {/* Charges and Utilities */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-black text-slate-900 block">توزيع التحملات الكرائية والخدمات المشتركة</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block mb-0.5">الماء والكهرباء:</span>
                  <select
                    value={chargesDistribution.waterElectricity}
                    onChange={e => setChargesDistribution(prev => ({ ...prev, waterElectricity: e.target.value as any }))}
                    className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="حسب_العداد">حسب العداد المستقل</option>
                    <option value="المكتري">على عاتق المكتري</option>
                    <option value="المكري">مشمول بالسومة الكرائية</option>
                    <option value="مناصفة">مناصفة</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">واجبات السنديك والحراسة:</span>
                  <select
                    value={chargesDistribution.syndicFees}
                    onChange={e => setChargesDistribution(prev => ({ ...prev, syndicFees: e.target.value as any }))}
                    className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="المكتري">على عاتق المكتري</option>
                    <option value="المكري">على عاتق المكري</option>
                    <option value="غير_مشمول">غير مشمول</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: المحل</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي: الشروط الواقفة والضمانات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: الشروط الواقفة والضمانات المالية (العربون والشرط الجزائي)            */}
      {/* ========================================================================= */}
      {currentStage === 5 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>المرحلة الخامسة: الشروط الواقفة والضمانات المالية والعربون</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تنظيم العربون والتسبيق وفق الفصل 288 ق.ل.ع، وتحديد الشروط الواقفة الإدارية والمادية (الرخص، الإصلاحات، الإفراغ)
            </p>
          </div>

          {/* 1. Earnest and Financial Deposit */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>المبلغ المالي المؤدى عند إبرام الوعد (العربون / التسبيق)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                { id: 'لا', label: 'بدون أداء مالي' },
                { id: 'عربون', label: 'عربون (فصول 288-290)' },
                { id: 'تسبيق_من_الوجيبة', label: 'تسبيق من أول وجيبة' },
                { id: 'وديعة_ضمان_مسبقة', label: 'وديعة ضمان مسبقة' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setHasFinancialDeposit(d.id as any)}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    hasFinancialDeposit === d.id
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {hasFinancialDeposit !== 'لا' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المبلغ المؤدى (د.م)</label>
                  <input
                    type="number"
                    value={depositAmount || ''}
                    onChange={e => handleDepositChange(Number(e.target.value) || 0)}
                    placeholder="مبلغ العربون أو التسبيق"
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المبلغ بالحروف العربية</label>
                  <input
                    type="text"
                    value={depositAmountInWords}
                    onChange={e => setDepositAmountInWords(e.target.value)}
                    placeholder="تولد تلقائياً"
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مصير المبلغ عند نكول أحد الطرفين</label>
                  <select
                    value={breachRule}
                    onChange={e => setBreachRule(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="تطبيق_الفصل_288_290_قلع">قواعد العربون (الفصل 288-290 ق.ل.ع)</option>
                    <option value="استرداد_كامل_دون_تعويض">استرداده بالكامل دون تعويض</option>
                    <option value="فقدان_المبلغ_لصالح_الواعد">فقده لصالح الواعد كتعويض</option>
                    <option value="مضاعفة_المبلغ_إذا_نكل_الواعد">رد ضعفه إذا نكل الواعد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ أداء العربون/التسبيق</label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">طريقة أداء العربون</label>
                  <select
                    value={depositMethod}
                    onChange={e => setDepositMethod(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="تحويل_بنكي">تحويل بنكي</option>
                    <option value="شيك_بنكي">شيك بنكي</option>
                    <option value="شيك_مضمون_الأداء">شيك مضمون الأداء (Certified)</option>
                    <option value="نقد">نقداً بمجلس العقد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">مرجع الأداء والبنك</label>
                  <input
                    type="text"
                    value={depositReference}
                    onChange={e => setDepositReference(e.target.value)}
                    placeholder="رقم الشيك أو الحوالة البنكية"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Penalty Clause */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900">الشرط الجزائي الإضافي (بند جزائي للتعويض الاتفاقي)</span>
              <input
                type="checkbox"
                checked={hasPenaltyClause}
                onChange={e => setHasPenaltyClause(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            {hasPenaltyClause && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ التعويض الجزائي (د.م)</label>
                  <input
                    type="number"
                    value={penaltyClauseAmount || ''}
                    onChange={e => setPenaltyClauseAmount(Number(e.target.value) || 0)}
                    placeholder="مثال: 10000"
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">صيغة الشرط الجزائي</label>
                  <input
                    type="text"
                    value={penaltyClauseText}
                    onChange={e => setPenaltyClauseText(e.target.value)}
                    placeholder="يلزم الطرف المخل بأداء المبلغ كتعويض بات ونهائي"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2.5 Authority, Representation & Decree 2.23.101 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>فحص الصفة وسند التصرف أو التمثيل (مرسوم 2.23.101)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">سند حق الواعد في الكراء</label>
                <select
                  value={capacityBasis}
                  onChange={e => setCapacityBasis(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="سند_الملكية">مالك بموجب سند ملكية تام</option>
                  <option value="وكالة_رسمية">وكيل بموجب وكالة خاصة رسمية</option>
                  <option value="قرار_مجلس_إداري">ممثل بموجب النظام الأساسي أو الجمع العام</option>
                  <option value="إذن_قضائي_للنائب_الشرعي">إذن قاضي المستعجلات أو قاضي شؤون القاصرين</option>
                  <option value="أخرى">سند تمثيل أو تصرف آخر</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">مراجع السند / الوكالة (العدد، التاريخ، التوثيق)</label>
                <input
                  type="text"
                  value={poaReference}
                  onChange={e => setPoaReference(e.target.value)}
                  placeholder="مثال: وكالة خاصة عدد 120 صحيفة 45 توثيق طنجة بتاريخ..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 text-emerald-800 font-bold">
              <input
                type="checkbox"
                checked={isVerifiedDecree2_23_101}
                onChange={e => setIsVerifiedDecree2_23_101(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تم التحقق من الصفة وسريان الصلاحية وعدم وجود مانع تصرف طبقاً للمرسوم 2.23.101</span>
            </div>
          </div>

          {/* 2.6 Current Occupancy & Handover */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>حالة المحل الراهنة وموعد التسليم المتوقع</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الوضع الحالي للمحل</label>
                <select
                  value={occupancyStatus}
                  onChange={e => setOccupancyStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="فارغ">فارغ ومتاح</option>
                  <option value="شاغل_من_المالك">شاغل من المالك (يلتزم بإخلائه)</option>
                  <option value="مكتري_حالي_يلتزم_بالإفراغ">مكتري حالي يلتزم بالإفراغ قبل الأجل</option>
                  <option value="أشغال_جارية">أشغال تهيئة أو إصلاحات جارية</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ التسليم المتوقع للمحل</label>
                <input
                  type="date"
                  value={expectedHandoverDate}
                  onChange={e => setExpectedHandoverDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">حالة المحل عند التسليم</label>
                <select
                  value={conditionAtHandover}
                  onChange={e => setConditionAtHandover(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="جاهز_للاستعمال">جاهز للاستعمال الفوري</option>
                  <option value="يحتاج_إصلاحات_على_عاتق_المكري">إصلاحات على عاتق المكري</option>
                  <option value="تهيئة_على_عاتق_المكتري">تهيئة على عاتق المكتري بخصم من الكراء</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={handoverInventoryAgreed}
                onChange={e => setHandoverInventoryAgreed(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>اتفق الطرفان على تحرير محضر وصفي وجرد للمحل وتجهيزاته عند التسليم الفعلي</span>
            </div>
          </div>


          {/* 3. Suspensive Conditions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>الشروط الواقفة والالتزامات السابقة لإبرام الكراء ({suspensiveConditions.length})</span>
              </h4>
              <button
                type="button"
                onClick={addSuspensiveCondition}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة شرط واقف</span>
              </button>
            </div>

            {suspensiveConditions.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                لا توجد شروط واقفة مسجلة. الوعد بات ونافذ المفعول مباشرة.
              </div>
            ) : (
              suspensiveConditions.map((sc, idx) => (
                <div key={sc.id || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">شرط رقم ({idx + 1}):</span>
                    <button
                      type="button"
                      onClick={() => removeSuspensiveCondition(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-0.5">نوع الشرط</label>
                      <select
                        value={sc.type}
                        onChange={e => updateSuspensiveCondition(idx, { type: e.target.value as any })}
                        className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="رخصة_إدارية">رخصة إدارية / رخصة استغلال</option>
                        <option value="أشغال_تهيئة">إتمام أشغال تهيئة أو إصلاحات</option>
                        <option value="إفراغ_مكتري_سابق">إفراغ مكتري سابق</option>
                        <option value="موافقة_شريك_أو_بنك">موافقة شريك أو بنك</option>
                        <option value="تمويل_بنكي">حصول المكتري على تمويل</option>
                        <option value="أخرى">شرط آخر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-0.5">تفصيل الشرط</label>
                      <input
                        type="text"
                        value={sc.conditionText}
                        onChange={e => updateSuspensiveCondition(idx, { conditionText: e.target.value })}
                        placeholder="نص الشرط الواقف بدقة"
                        className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-0.5">أجل التحقق</label>
                      <input
                        type="date"
                        value={sc.fulfillmentDeadline || ''}
                        onChange={e => updateSuspensiveCondition(idx, { fulfillmentDeadline: e.target.value })}
                        className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الشروط والأجل</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(6)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>التالي: الاختبار الحاسم والاعتماد</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 6: الاختبار الحاسم: هل نحن أمام وعد أم كراء قائم؟ والاعتماد النهائي (7) */}
      {/* ========================================================================= */}
      {currentStage === 6 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              <span>المرحلة السادسة: الاختبار الحاسم والاعتماد المباشر للخطوة 7</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              التحقق القضائي الحاسم لمنع الخلط بين الوعد والكراء النافذ، وتوليد النص الرسمي ونقل المعطيات للخطوة 7
            </p>
          </div>

          {/* CRITICAL EXISTENCE TEST (الاختبار الحاسم) */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>الاختبار الحاسم للعدل الموثق: هل نحن أمام وعد أم كراء قائم؟</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              وفق الفصل 628 من ق.ل.ع ومقتضيات القانون 67.12 و49.16، تسليم المفاتيح أو تمكين المكتري من المحل أو قبض كراء عن مدة جارية يُعد قرينة قاطعة على بدء نفاذ عقد الكراء الفعلي.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
                <span className="font-bold block text-slate-200">1. هل تسلم المكتري المفاتيح بالفعل؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setKeysHandedOver('لا')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      keysHandedOver === 'لا' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    لا، لم يتسلمها
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeysHandedOver('نعم')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      keysHandedOver === 'نعم' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    نعم تسلمها
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
                <span className="font-bold block text-slate-200">2. هل بدأ في شغل المحل أو الانتفاع به؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTenantOccupied('لا')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      tenantOccupied === 'لا' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    لا، لم يشغله
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantOccupied('نعم')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      tenantOccupied === 'نعم' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    نعم بدأ الشغل
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
                <span className="font-bold block text-slate-200">3. هل أدى وجيبة كرائية عن مدة سارية؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRentPaidActive('لا')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      rentPaidActive === 'لا' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    لا، مجرد عربون/تسبيق
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentPaidActive('نعم')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                      rentPaidActive === 'نعم' ? 'bg-red-600 text-white border-red-500' : 'bg-white/5 text-slate-300 border-white/20'
                    }`}
                  >
                    نعم كراء سارٍ
                  </button>
                </div>
              </div>
            </div>

            {isExecutionStarted && (
              <div className="p-3.5 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs space-y-1">
                <span className="font-black text-red-400 block text-sm">⚠️ تحذير وإلزام توثيقي حاسم:</span>
                <p>
                  إجابتك بـ «نعم» على أحد الأسئلة السابقة تعني أن الواقع المادي تجاوز مرحلة «الوعد» إلى «الكراء الفعلي». لن يتمكن الطرفان من التمسك بوصف الوعد أمام القضاء إذا ثبت وضع اليد. يُنصح بتحرير رسم كراء نهائي فوري لحفظ حقوق الطرفين.
                </p>
              </div>
            )}
          </div>

          {/* Legal Compliance Review Checklist */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-black text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مراجعة عناصر الرسم قبل الاعتماد:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <span className={promisors.length > 0 && (promisors[0].fullName || promisors[0].companyName) ? 'text-emerald-600' : 'text-slate-300'}>✓</span>
                <span>الطرف الواعد: {promisorSummary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={promisees.length > 0 && (promisees[0].fullName || promisees[0].companyName) ? 'text-emerald-600' : 'text-slate-300'}>✓</span>
                <span>الطرف الموعود له: {promiseeSummary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={propertyDetails.exactAddress || propertyDetails.titleNumber ? 'text-emerald-600' : 'text-slate-300'}>✓</span>
                <span>المحل المكترى: {propertySummary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={rentAmount > 0 ? 'text-emerald-600' : 'text-slate-300'}>✓</span>
                <span>السومة والأجل: {rentAmount > 0 ? `${rentAmount.toLocaleString()} د.م` : 'لم تحدد'} ({deadlineSummary})</span>
              </div>
            </div>
          </div>

          {/* PROMINENT RED STEP 7 DIRECT TRANSIT BUTTON */}
          <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-red-300/80 text-center space-y-4 shadow-sm">
            <div>
              <h4 className="font-black text-slate-900 text-base">جاهزية التحرير العدلي والاعتماد</h4>
              <p className="text-xs text-slate-600 mt-1">
                عند الاعتماد، سيتم توليد نص الرسم العدلي للوعد بالكراء بالصيغة الرسمية المعتمدة والانتقال مباشرة إلى الخطوة 7 للمراجعة الذكية والتوثيق القضائي
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleProceedToStep7}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-red-500/40 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span>اعتماد رسم الوعد بالكراء والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الشروط الواقفة والضمانات</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
