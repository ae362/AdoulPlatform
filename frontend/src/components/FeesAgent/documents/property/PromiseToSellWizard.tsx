import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  PromiseToSell,
  PromiseToSellPartyInfo,
  PromiseToSellPropertyDetails,
  PromiseToSellPaymentInstallment,
  PromiseToSellSuspensiveCondition,
  PromiseToSellEncumbranceItem,
  FeesAgentState,
} from '../../../../types/feesAgentTypes';
import {
  convertNumberToArabicWords,
} from '../../../../utils/feesAgentUtils';
import {
  generatePromiseToSellDraft,
} from '../../../../templates/feesAgentTemplates';
import {
  Building2,
  ShieldCheck,
  Users,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  FileCheck,
  Landmark,
  Layers,
  MapPin,
  Receipt,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export const PromiseToSellWizard: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  // Internal Stage Navigation (1 to 5)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Sync helper with parent FeesAgent state
  const syncState = useCallback((patch: Partial<FeesAgentState>) => {
    setState(prev => ({
      ...prev,
      ...patch,
    }));
  }, [setState]);

  // Read or initialize PromiseToSell data (clean, blank, zero dummy/random names)
  const promiseData = useMemo<PromiseToSell>(() => {
    return state.promiseToSell || {};
  }, [state.promiseToSell]);

  // Local state for Preliminary Qualification
  const [qualification, setQualification] = useState(promiseData.preliminaryQualification || {
    promiseNature: 'وعد_بالبيع_العقاري',
    isRealEstateSubject: true,
    deedFormat: 'محرر_رسمي',
    isLaw41_24Compliant: true,
  });

  // Local state for Promisors (الواعدون بالبيع)
  const [promisors, setPromisors] = useState<PromiseToSellPartyInfo[]>(() => {
    if (promiseData.promisors && promiseData.promisors.length > 0) return promiseData.promisors;
    if (promiseData.seller?.fullName) {
      return [{
        id: 'p-1',
        isLegalEntity: false,
        fullName: promiseData.seller.fullName || '',
        idNumber: promiseData.seller.idNumber || '',
        dateOfBirth: promiseData.seller.dateOfBirth || '',
        placeOfBirth: promiseData.seller.placeOfBirth || '',
        nationality: promiseData.seller.nationality || 'مغربي',
        address: promiseData.seller.address || '',
        relationToProperty: promiseData.seller.relationToProperty || 'مالك',
        isCapable: promiseData.seller.isCapable ?? true,
        shareFraction: '1/1',
        shareNumeric: 100,
      }];
    }
    if (state.sellers && state.sellers.length > 0) {
      return state.sellers.map((s, idx) => ({
        id: `p-${idx + 1}`,
        isLegalEntity: s.actingCapacity === 'legal_representative',
        fullName: s.name || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        idNumber: s.idNumber || '',
        address: s.address || '',
        profession: s.profession || '',
        nationality: (s.nationality as any) || 'مغربي',
        maritalStatus: s.maritalStatus || '',
        isCapable: true,
        shareFraction: s.share || '1/1',
        companyName: s.legalEntityName || '',
        companyForm: s.legalForm || '',
        rcNumber: s.commercialRegister || '',
        ice: s.ice || '',
        headquarters: s.headquartersAddress || '',
        legalRepresentativeName: s.legalRepresentativeName || '',
        legalRepresentativeCapacity: s.legalRepresentativeCapacity || '',
      }));
    }
    return [{
      id: 'p-1',
      isLegalEntity: false,
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idNumber: '',
      idIssueDate: '',
      profession: '',
      address: '',
      maritalStatus: '',
      matrimonialRegime: '',
      relationToProperty: 'مالك',
      isCapable: true,
      shareFraction: '1/1',
      shareNumeric: 100,
      ownershipDeedRef: '',
    }];
  });

  // Local state for Promisees (الموعود لهم بالشراء)
  const [promisees, setPromisees] = useState<PromiseToSellPartyInfo[]>(() => {
    if (promiseData.promisees && promiseData.promisees.length > 0) return promiseData.promisees;
    if (promiseData.buyer?.fullName) {
      return [{
        id: 'b-1',
        isLegalEntity: false,
        fullName: promiseData.buyer.fullName || '',
        idNumber: promiseData.buyer.idNumber || '',
        dateOfBirth: promiseData.buyer.dateOfBirth || '',
        placeOfBirth: promiseData.buyer.placeOfBirth || '',
        nationality: promiseData.buyer.nationality || 'مغربي',
        address: promiseData.buyer.address || '',
        relationToProperty: 'محايد',
        isCapable: promiseData.buyer.isCapable ?? true,
        shareFraction: '1/1',
        shareNumeric: 100,
      }];
    }
    if (state.buyers && state.buyers.length > 0) {
      return state.buyers.map((b, idx) => ({
        id: `b-${idx + 1}`,
        isLegalEntity: b.actingCapacity === 'legal_representative',
        fullName: b.name || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        idNumber: b.idNumber || '',
        address: b.address || '',
        profession: b.profession || '',
        nationality: (b.nationality as any) || 'مغربي',
        maritalStatus: b.maritalStatus || '',
        isCapable: true,
        shareFraction: b.share || '1/1',
        companyName: b.legalEntityName || '',
        companyForm: b.legalForm || '',
        rcNumber: b.commercialRegister || '',
        ice: b.ice || '',
        headquarters: b.headquartersAddress || '',
        legalRepresentativeName: b.legalRepresentativeName || '',
        legalRepresentativeCapacity: b.legalRepresentativeCapacity || '',
      }));
    }
    return [{
      id: 'b-1',
      isLegalEntity: false,
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idNumber: '',
      idIssueDate: '',
      profession: '',
      address: '',
      maritalStatus: '',
      relationToProperty: 'محايد',
      isCapable: true,
      shareFraction: '1/1',
      shareNumeric: 100,
    }];
  });

  // Multiple Promisors / Promisees distribution options
  const [promisorsJoint, setPromisorsJoint] = useState<'نعم' | 'لا' | 'حسب_حصص_محددة'>(
    promiseData.multiplePromisorsStructure?.distributionType === 'بالتساوي' ? 'نعم' : 'حسب_حصص_محددة'
  );
  const [promiseesDevolution, setPromiseesDevolution] = useState<'بالتساوي' | 'حسب_حصص_محددة' | 'على_الشياع' | 'حسب_بيان_خاص'>(
    promiseData.multiplePromiseesStructure?.devolutionUponFinalSale || 'بالتساوي'
  );

  // Property Details State
  const [propertyDetails, setPropertyDetails] = useState<PromiseToSellPropertyDetails>(() => {
    return promiseData.propertyDetails || {
      propertyStatus: 'محفظ',
      titleNumber: promiseData.property?.registryOrDeed || '',
      titleSuffix: '',
      landRegistryOffice: '',
      propertyName: '',
      landCertificateNumber: '',
      landCertificateDate: '',
      hasLandCertificateAttached: false,
      originDeedType: 'شراء_سابق',
      originDeedNumber: '',
      originDeedDate: '',
      originDeedAuthority: '',
      originDeedBook: '',
      originDeedLetter: '',
      originDeedPage: '',
      originDeedCount: '',
      originCourtNotary: '',
      originalOwnerName: '',
      requisitionNumber: '',
      requisitionDate: '',
      requisitionApplicantName: '',
      requisitionStatus: 'جارية',
      hasRequisitionOppositions: false,
      requisitionOppositionsDetails: '',
      commune: '',
      province: '',
      neighborhoodOrDouar: '',
      exactAddress: promiseData.property?.address || '',
      areaTotal: promiseData.property?.totalValue ? 0 : undefined,
      areaUnit: 'متر_مربع',
      areaInWords: '',
      boundaryNorth: '',
      boundarySouth: '',
      boundaryEast: '',
      boundaryWest: '',
      additionalBoundaries: [],
      components: [],
      isFullProperty: true,
      subjectShareFraction: 'كامل الملك',
      subjectSharePercentage: 100,
    };
  });

  // Finance Details State
  const initialTotal = promiseData.financeDetails?.totalPrice || promiseData.promiseTerms?.totalPrice || state.finance?.price || 0;
  const initialEarnest = promiseData.financeDetails?.earnestAmount || promiseData.promiseTerms?.earnestMoney || 0;
  const [totalPrice, setTotalPrice] = useState<number>(initialTotal);
  const [totalPriceWords, setTotalPriceWords] = useState<string>(
    promiseData.financeDetails?.totalPriceInWords || (initialTotal ? convertNumberToArabicWords(initialTotal) : '')
  );
  const [earnestAmount, setEarnestAmount] = useState<number>(initialEarnest);
  const [earnestAmountWords, setEarnestAmountWords] = useState<string>(
    promiseData.financeDetails?.earnestAmountInWords || (initialEarnest ? convertNumberToArabicWords(initialEarnest) : '')
  );
  const [earnestDate, setEarnestDate] = useState<string>(
    promiseData.financeDetails?.earnestDate || new Date().toISOString().split('T')[0]
  );
  const [earnestPaymentMethod, setEarnestPaymentMethod] = useState<'نقد' | 'تحويل_بنكي' | 'شيك_بنكي' | 'شيك_مضمون' | 'وديعة_لدى_العدل' | 'أخرى'>(
    (promiseData.financeDetails?.earnestPaymentMethod as any) || (promiseData.promiseTerms?.paymentMethod as any) || 'نقد'
  );
  const [earnestReference, setEarnestReference] = useState<string>(promiseData.financeDetails?.earnestReference || '');
  const [earnestBankName, setEarnestBankName] = useState<string>(promiseData.financeDetails?.earnestBankName || '');
  const [manualRemainingReason, setManualRemainingReason] = useState<string>(promiseData.financeDetails?.manualRemainingReason || '');
  const [isManualRemaining, setIsManualRemaining] = useState<boolean>(false);
  const [manualRemainingValue, setManualRemainingValue] = useState<number>(
    promiseData.financeDetails?.remainingAmount !== undefined ? promiseData.financeDetails.remainingAmount : Math.max(0, initialTotal - initialEarnest)
  );

  // Auto-calculated Remaining Balance
  const remainingAmount = useMemo(() => {
    if (isManualRemaining) return manualRemainingValue;
    return Math.max(0, (totalPrice || 0) - (earnestAmount || 0));
  }, [isManualRemaining, manualRemainingValue, totalPrice, earnestAmount]);

  const remainingAmountWords = useMemo(() => {
    return remainingAmount ? convertNumberToArabicWords(remainingAmount) : 'صفر درهم';
  }, [remainingAmount]);

  // Installments list
  const [installments, setInstallments] = useState<PromiseToSellPaymentInstallment[]>(
    promiseData.financeDetails?.installments || []
  );

  // Selected payment methods (multiple checkboxes)
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(
    promiseData.financeDetails?.selectedPaymentMethods || ['تسبيق', 'باقي الثمن عند البيع النهائي']
  );

  // Earnest Rule
  const [earnestRule, setEarnestRule] = useState<'خصم_عند_البيع_أو_فقده_عند_النكول' | 'مسترد_في_حال_عدم_تحقق_الشرط' | 'مزدوج_المادة_586_ق_ل_ع' | ''>(
    promiseData.financeDetails?.earnestRule || 'خصم_عند_البيع_أو_فقده_عند_النكول'
  );
  const [penaltyClauseText, setPenaltyClauseText] = useState<string>(
    promiseData.financeDetails?.penaltyClauseText || ''
  );

  // Final Sale Deadline State
  const [deadlineType, setDeadlineType] = useState<string>(
    promiseData.finalSaleDeadline?.type || (promiseData.promiseTerms?.finalDeadline ? 'تاريخ_محدد' : 'تاريخ_محدد')
  );
  const [specificDeadlineDate, setSpecificDeadlineDate] = useState<string>(
    promiseData.finalSaleDeadline?.specificDate || promiseData.promiseTerms?.finalDeadline || ''
  );
  const [periodNumber, setPeriodNumber] = useState<number>(promiseData.finalSaleDeadline?.periodNumber || 90);
  const [periodUnit, setPeriodUnit] = useState<'أيام' | 'أشهر' | 'سنوات'>(promiseData.finalSaleDeadline?.periodUnit || 'أيام');
  const [deadlineConditionText, setDeadlineConditionText] = useState<string>(
    promiseData.finalSaleDeadline?.conditionText || ''
  );

  // Suspensive conditions
  const [suspensiveConditions, setSuspensiveConditions] = useState<PromiseToSellSuspensiveCondition[]>(
    promiseData.suspensiveConditions || []
  );

  // Encumbrances state
  const [hasEncumbrances, setHasEncumbrances] = useState<'نعم' | 'لا' | 'غير_معلوم'>(
    promiseData.encumbrances?.hasEncumbrances || 'لا'
  );
  const [encumbrancesList, setEncumbrancesList] = useState<PromiseToSellEncumbranceItem[]>(
    promiseData.encumbrances?.items || []
  );

  // Registration & Stamp Duty State
  const [regStatus, setRegStatus] = useState<string>(promiseData.registrationInfo?.status || 'سيتم_تسجيله');
  const [regTaxOffice, setRegTaxOffice] = useState<string>(promiseData.registrationInfo?.taxOffice || '');
  const [regReceiptNumber, setRegReceiptNumber] = useState<string>(promiseData.registrationInfo?.receiptNumber || '');
  const [regDate, setRegDate] = useState<string>(promiseData.registrationInfo?.registrationDate || '');
  const [stampDutyAmount, setStampDutyAmount] = useState<number>(promiseData.stampDutyInfo?.amount || 200);

  // Intelligent Question Check
  const [intelligentQuestionAnswer, setIntelligentQuestionAnswer] = useState<'نعم' | 'يحتاج_استكمال' | 'يحتاج_مراجعة_قانونية' | ''>(
    promiseData.intelligentQuestionAnswer || 'نعم'
  );

  // Master State Synchronizer
  const fullPromiseState = useMemo<PromiseToSell>(() => {
    return {
      preliminaryQualification: qualification as any,
      promisors,
      promisees,
      multiplePromisorsStructure: {
        isJointOwnership: promisorsJoint === 'نعم',
        distributionType: promisorsJoint === 'نعم' ? 'بالتساوي' : 'حسب_حصص_محددة',
      },
      multiplePromiseesStructure: {
        isMultipleBuyers: promisees.length > 1,
        devolutionUponFinalSale: promiseesDevolution,
      },
      propertyDetails,
      financeDetails: {
        totalPrice,
        totalPriceInWords: totalPriceWords,
        earnestAmount,
        earnestAmountInWords: earnestAmountWords,
        earnestDate,
        earnestPaymentMethod,
        earnestReference,
        earnestBankName,
        remainingAmount,
        remainingAmountInWords: remainingAmountWords,
        manualRemainingReason,
        selectedPaymentMethods,
        hasInstallments: installments.length > 0,
        installments,
        earnestRule,
        penaltyClauseText,
      },
      finalSaleDeadline: {
        type: deadlineType as any,
        specificDate: specificDeadlineDate,
        periodNumber,
        periodUnit,
        conditionText: deadlineConditionText,
      },
      suspensiveConditions,
      encumbrances: {
        hasEncumbrances,
        items: encumbrancesList,
      },
      registrationInfo: {
        status: regStatus as any,
        taxOffice: regTaxOffice,
        receiptNumber: regReceiptNumber,
        registrationDate: regDate,
      },
      stampDutyInfo: {
        amount: stampDutyAmount,
        status: 'مكتمل',
      },
      intelligentQuestionAnswer,
      // Legacy fields preservation
      seller: promisors[0] ? {
        fullName: promisors[0].fullName,
        idNumber: promisors[0].idNumber,
        dateOfBirth: promisors[0].dateOfBirth,
        placeOfBirth: promisors[0].placeOfBirth,
        nationality: (promisors[0].nationality as any) || 'مغربي',
        address: promisors[0].address,
        relationToProperty: promisors[0].relationToProperty as any,
        isCapable: promisors[0].isCapable,
      } : undefined,
      buyer: promisees[0] ? {
        fullName: promisees[0].fullName,
        idNumber: promisees[0].idNumber,
        dateOfBirth: promisees[0].dateOfBirth,
        placeOfBirth: promisees[0].placeOfBirth,
        nationality: (promisees[0].nationality as any) || 'مغربي',
        address: promisees[0].address,
        relationToProperty: 'محايد',
        isCapable: promisees[0].isCapable,
      } : undefined,
      property: {
        propertyType: propertyDetails.propertyStatus === 'محفظ' ? 'حضري' : 'فلاحي',
        address: propertyDetails.exactAddress || '',
        registryOrDeed: propertyDetails.titleNumber || propertyDetails.originDeedNumber || '',
        boundaries: `شمالاً: ${propertyDetails.boundaryNorth || ''}، جنوباً: ${propertyDetails.boundarySouth || ''}`,
        area: String(propertyDetails.areaTotal || ''),
        status: hasEncumbrances === 'نعم' ? 'مرهون' : 'حر',
      },
      promiseTerms: {
        totalPrice,
        earnestMoney: earnestAmount,
        paymentMethod: earnestPaymentMethod as any,
        finalDeadline: specificDeadlineDate || deadlineConditionText,
      },
    };
  }, [
    qualification, promisors, promisees, promisorsJoint, promiseesDevolution,
    propertyDetails, totalPrice, totalPriceWords, earnestAmount, earnestAmountWords,
    earnestDate, earnestPaymentMethod, earnestReference, earnestBankName,
    remainingAmount, remainingAmountWords, manualRemainingReason, selectedPaymentMethods,
    installments, earnestRule, penaltyClauseText, deadlineType, specificDeadlineDate,
    periodNumber, periodUnit, deadlineConditionText, suspensiveConditions,
    hasEncumbrances, encumbrancesList, regStatus, regTaxOffice, regReceiptNumber,
    regDate, stampDutyAmount, intelligentQuestionAnswer
  ]);

  // Keep state.promiseToSell in sync with debounce
  useEffect(() => {
    syncState({ promiseToSell: fullPromiseState });
  }, [fullPromiseState, syncState]);

  // Auto-generate Arabic Words for Total Price
  const handleTotalPriceChange = (val: number) => {
    setTotalPrice(val);
    if (val > 0) {
      setTotalPriceWords(convertNumberToArabicWords(val));
    } else {
      setTotalPriceWords('');
    }
  };

  // Auto-generate Arabic Words for Earnest Amount
  const handleEarnestChange = (val: number) => {
    setEarnestAmount(val);
    if (val > 0) {
      setEarnestAmountWords(convertNumberToArabicWords(val));
    } else {
      setEarnestAmountWords('');
    }
  };

  // Promisors Multi-row Management
  const addPromisor = () => {
    setPromisors(prev => [
      ...prev,
      {
        id: `p-${prev.length + 1}`,
        isLegalEntity: false,
        fullName: '',
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        placeOfBirth: '',
        nationality: 'مغربي',
        idNumber: '',
        idIssueDate: '',
        profession: '',
        address: '',
        maritalStatus: '',
        relationToProperty: 'مالك',
        isCapable: true,
        shareFraction: '1/2',
        shareNumeric: 50,
      }
    ]);
  };

  const removePromisor = (index: number) => {
    if (promisors.length <= 1) return;
    setPromisors(prev => prev.filter((_, i) => i !== index));
  };

  const updatePromisor = (index: number, patch: Partial<PromiseToSellPartyInfo>) => {
    setPromisors(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  // Promisees Multi-row Management
  const addPromisee = () => {
    setPromisees(prev => [
      ...prev,
      {
        id: `b-${prev.length + 1}`,
        isLegalEntity: false,
        fullName: '',
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        placeOfBirth: '',
        nationality: 'مغربي',
        idNumber: '',
        idIssueDate: '',
        profession: '',
        address: '',
        maritalStatus: '',
        relationToProperty: 'محايد',
        isCapable: true,
        shareFraction: '1/2',
        shareNumeric: 50,
      }
    ]);
  };

  const removePromisee = (index: number) => {
    if (promisees.length <= 1) return;
    setPromisees(prev => prev.filter((_, i) => i !== index));
  };

  const updatePromisee = (index: number, patch: Partial<PromiseToSellPartyInfo>) => {
    setPromisees(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  // Installments Management
  const addInstallment = () => {
    setInstallments(prev => [
      ...prev,
      {
        id: `ins-${prev.length + 1}`,
        installmentNumber: prev.length + 1,
        amount: 0,
        paymentMethod: 'تحويل_بنكي',
        dueDate: '',
        status: 'مستحق',
        notes: '',
      }
    ]);
  };

  const removeInstallment = (index: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstallment = (index: number, patch: Partial<PromiseToSellPaymentInstallment>) => {
    setInstallments(prev => prev.map((ins, i) => (i === index ? { ...ins, ...patch } : ins)));
  };

  // Suspensive Conditions Management
  const addSuspensiveCondition = () => {
    setSuspensiveConditions(prev => [
      ...prev,
      {
        id: `c-${prev.length + 1}`,
        type: 'قرض_بنكي',
        conditionText: '',
        status: 'معلق',
        fulfillmentDeadline: '',
        consequenceOfBreach: 'استرداد العربون وانفساخ الوعد دون تعويض',
      }
    ]);
  };

  const removeSuspensiveCondition = (index: number) => {
    setSuspensiveConditions(prev => prev.filter((_, i) => i !== index));
  };

  const updateSuspensiveCondition = (index: number, patch: Partial<PromiseToSellSuspensiveCondition>) => {
    setSuspensiveConditions(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  // Encumbrances Management
  const addEncumbrance = () => {
    setEncumbrancesList(prev => [
      ...prev,
      {
        id: `enc-${prev.length + 1}`,
        type: 'رهن رسمي',
        beneficiary: '',
        date: '',
        amount: 0,
        reference: '',
        liftingStatus: 'شرط_للبيع_النهائي',
      }
    ]);
  };

  const removeEncumbrance = (index: number) => {
    setEncumbrancesList(prev => prev.filter((_, i) => i !== index));
  };

  const updateEncumbrance = (index: number, patch: Partial<PromiseToSellEncumbranceItem>) => {
    setEncumbrancesList(prev => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  // Intelligent Pre-drafting Verification (Legal Check)
  const legalCheckSummary = useMemo(() => {
    const fatalErrors: string[] = [];
    const reviewNotes: string[] = [];

    // Check Promisors
    const validPromisors = promisors.filter(p => (p.isLegalEntity ? p.companyName : p.fullName));
    if (validPromisors.length === 0) {
      fatalErrors.push('يجب إدخال بيانات الطرف الواعد بالبيع (الاسم الكامل أو اسم الشركة).');
    }

    // Check Promisees
    const validPromisees = promisees.filter(p => (p.isLegalEntity ? p.companyName : p.fullName));
    if (validPromisees.length === 0) {
      fatalErrors.push('يجب إدخال بيانات الطرف الموعود له بالشراء.');
    }

    // Check Real Estate subject
    if (!qualification.isRealEstateSubject) {
      fatalErrors.push('هذا البيت مخصص حصرياً للوعد بالبيع العقاري (المادة 4 من مدونة الحقوق العينية).');
    }

    // Check Property
    if (propertyDetails.propertyStatus === 'محفظ') {
      if (!propertyDetails.titleNumber?.trim()) {
        fatalErrors.push('يجب إدخال رقم الرسم العقاري للعقار المحفظ.');
      }
    } else if (propertyDetails.propertyStatus === 'غير_محفظ') {
      if (!propertyDetails.originDeedNumber?.trim() && !propertyDetails.originalOwnerName?.trim()) {
        reviewNotes.push('العقار غير محفظ: يستحسن استكمال مراجع أصل التملك وسنده.');
      }
    } else if (propertyDetails.propertyStatus === 'طور_التحفيظ' || propertyDetails.propertyStatus === 'مطلب_تحفيظ') {
      if (!propertyDetails.requisitionNumber?.trim()) {
        reviewNotes.push('العقار في طور التحفيظ: يرجى إدخال رقم مطلب التحفيظ.');
      }
    }

    // Check Price
    if (totalPrice <= 0) {
      fatalErrors.push('يجب تحديد الثمن الإجمالي للبيع النهائي.');
    }
    if (earnestAmount > totalPrice) {
      fatalErrors.push('مبلغ العربون/التسبيق لا يمكن أن يتجاوز الثمن الإجمالي للبيع.');
    }

    // Check Installments total
    if (installments.length > 0) {
      const sumInstallments = installments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      if (sumInstallments + earnestAmount > totalPrice) {
        fatalErrors.push('مجموع الدفعات المقررة مع العربون يتجاوز الثمن الإجمالي للمبيع.');
      }
    }

    // Check Encumbrances
    if (hasEncumbrances === 'نعم') {
      reviewNotes.push('العقار محمل برهون أو تقييدات؛ يتعين تتبع رفعها قبل إبرام البيع النهائي.');
    }

    // Check Suspensive Conditions
    if (suspensiveConditions.length > 0) {
      reviewNotes.push(`يحتوي الوعد على (${suspensiveConditions.length}) شروط واقفة تتطلب التحقق عند الأجل.`);
    }

    return {
      isValid: fatalErrors.length === 0,
      fatalErrors,
      reviewNotes,
    };
  }, [promisors, promisees, qualification, propertyDetails, totalPrice, earnestAmount, installments, hasEncumbrances, suspensiveConditions]);

  // Status for top card
  const fileStatusBadge = useMemo(() => {
    if (legalCheckSummary.fatalErrors.length > 0) {
      return { text: 'يحتاج مراجعة وتصحيح', color: 'bg-red-100 text-red-800 border-red-300' };
    }
    if (legalCheckSummary.reviewNotes.length > 0) {
      return { text: 'قيد الإعداد والتدقيق', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { text: 'مكتمل ومطابق قانونياً', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }, [legalCheckSummary]);

  // Summary labels for Top Card
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
      return propertyDetails.requisitionNumber ? `مطلب تحفيظ عدد ${propertyDetails.requisitionNumber}` : 'في طور التحفيظ';
    }
    return propertyDetails.propertyName || propertyDetails.exactAddress || 'عقار غير محفظ';
  }, [propertyDetails]);

  const deadlineSummary = useMemo(() => {
    if (deadlineType === 'تاريخ_محدد' && specificDeadlineDate) return specificDeadlineDate;
    if (deadlineType === 'أجل_بالأيام_أو_الأشهر') return `${periodNumber} ${periodUnit}`;
    if (deadlineType === 'مرتبط_بشرط') return 'معلق على شرط';
    return 'قيد التحديد';
  }, [deadlineType, specificDeadlineDate, periodNumber, periodUnit]);

  // Final Action: Direct Wire to Step 7 (المراجعة الذكية والتوثيق)
  const handleProceedToStep7 = () => {
    const currentState: FeesAgentState = {
      ...state,
      documentType: 'وعد_بالبيع',
      promiseToSell: fullPromiseState,
      sellers: promisors.map(p => ({
        id: p.id || '',
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
        id: b.id || '',
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
        price: totalPrice,
        priceInWords: totalPriceWords,
        paymentMethod: (earnestPaymentMethod === 'أخرى' ? '' : earnestPaymentMethod) as any,
        ...(state.finance || {}),
      } as any,
    };

    const draftText = generatePromiseToSellDraft(currentState);

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
      {/* 1. PERSISTENT TOP CARD (بطاقة الوعد بالبيع العقاري)                        */}
      {/* ========================================================================= */}
      <div className="sticky top-4 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-5 border-2 border-slate-200/80 shadow-xl transition-all">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">رسم وعد بالبيع العقاري</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  المادة 4 ق.ح.ع (القانون 41.24)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                عقد ملزم بالبيع النهائي لا ينقل الملكية العقارية حالاً حتى إتمام شروطه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${fileStatusBadge.color} shadow-xs`}>
              {fileStatusBadge.text}
            </span>
          </div>
        </div>

        {/* Persistent Grid Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span className="block text-slate-400 font-bold mb-0.5">👤 الواعد بالبيع</span>
            <span className="font-bold text-slate-800 truncate block" title={promisorSummary}>
              {promisorSummary}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span className="block text-slate-400 font-bold mb-0.5">👤 الموعود له بالشراء</span>
            <span className="font-bold text-slate-800 truncate block" title={promiseeSummary}>
              {promiseeSummary}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span className="block text-slate-400 font-bold mb-0.5">🏠 العقار الموعود به</span>
            <span className="font-bold text-slate-800 truncate block" title={propertySummary}>
              {propertySummary}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span className="block text-slate-400 font-bold mb-0.5">📍 الوضعية القانونية</span>
            <span className="font-bold text-slate-800">
              {propertyDetails.propertyStatus === 'محفظ' ? 'محفظ' : propertyDetails.propertyStatus === 'طور_التحفيظ' ? 'طور التحفيظ' : 'غير محفظ'}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/70">
            <span className="block text-emerald-700 font-bold mb-0.5">💰 الثمن الإجمالي</span>
            <span className="font-black text-emerald-950">
              {totalPrice > 0 ? `${totalPrice.toLocaleString()} د.م` : 'لم يحدد'}
            </span>
          </div>

          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/70">
            <span className="block text-blue-700 font-bold mb-0.5">💵 العربون / المؤدى</span>
            <span className="font-black text-blue-950">
              {earnestAmount > 0 ? `${earnestAmount.toLocaleString()} د.م` : '0 د.م'}
            </span>
          </div>

          <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
            <span className="block text-amber-700 font-bold mb-0.5">💳 باقي الثمن</span>
            <span className="font-black text-amber-950">
              {remainingAmount > 0 ? `${remainingAmount.toLocaleString()} د.م` : '0 د.م'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            <span className="block text-slate-400 font-bold mb-0.5">📅 أجل البيع النهائي</span>
            <span className="font-bold text-slate-800 truncate block">
              {deadlineSummary}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRESS TABS NAVIGATOR (5 مراحل متسلسلة داخل البيت)                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-2">
        {[
          { num: 1, title: '① التكييف والشكلية', icon: ShieldCheck, desc: 'القانون 41.24' },
          { num: 2, title: '② أطراف الوعد', icon: Users, desc: 'الواعد والموعود له' },
          { num: 3, title: '③ العقار وأصل الملك', icon: Building2, desc: 'التحفيظ والحدود' },
          { num: 4, title: '④ الثمن والأجل والشرط', icon: Scale, desc: 'العربون والدفعات' },
          { num: 5, title: '⑤ السندات والاعتماد', icon: FileCheck, desc: 'الفحص والتحرير' },
        ].map(stage => {
          const Icon = stage.icon;
          const isActive = currentStage === stage.num;
          return (
            <button
              key={stage.num}
              type="button"
              onClick={() => setCurrentStage(stage.num)}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <div className="text-right">
                <span className="block leading-tight">{stage.title}</span>
                <span className={`text-[10px] font-normal ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{stage.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: التكييف القانوني الأولي وشكل المحرر (Law 41.24 Gate)             */}
      {/* ========================================================================= */}
      {currentStage === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              المرحلة الأولى: التكييف القانوني الأولي وشكلية الوعد
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              التحقق من خضوع الوعد لمقتضيات المادة 4 من مدونة الحقوق العينية (القانون 41.24) وشروط صحته
            </p>
          </div>

          {/* Alert Notice on Law 41.24 */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>تنبيه شكلي قانوني إلزامي (مستجد القانون رقم 41.24):</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              «الوعد بالبيع العقاري مشمول صراحة بالمادة 4 من مدونة الحقوق العينية المعدلة بالقانون 41.24، ويجب أن يحرر بمحرر رسمي أو محرر ثابت التاريخ يتم توثيقه وفق الشكل القانوني المقرر تحت طائلة البطلان. ولا يعتد بالمحرر العرفي العادي في الوعد بالبيع العقاري.»
            </p>
            <div className="text-[11px] text-amber-700 bg-white/70 p-2 rounded-lg border border-amber-200/50 inline-block font-bold">
              تغير الإطار القانوني: تطبيق القاعدة التشريعية الحالية على الوعد الجديد مع إظهار المرجع القانوني في صلب الرسم.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* 1. ما طبيعة التصرف؟ */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-700">
                ما طبيعة التصرف؟ *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'وعد_بالبيع_العقاري', label: 'وعد بالبيع العقاري التبادلي' },
                  { id: 'وعد_مشروط', label: 'وعد مشروط' },
                  { id: 'وعد_ملزم_لجانب_واحد', label: 'وعد ملزم لجانب واحد' },
                  { id: 'وعد_متبادل', label: 'وعد متبادل بين الطرفين' },
                  { id: 'وعد_معلق_على_شرط_واقف', label: 'وعد معلق على شرط واقف' },
                  { id: 'وعد_آخر', label: 'وعد آخر محدد' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setQualification(prev => ({ ...prev, promiseNature: opt.id as any }))}
                    className={`p-3 text-right rounded-xl border text-xs font-bold transition-all ${
                      qualification.promiseNature === opt.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. هل محل الوعد عقار أو حق عيني عقاري؟ */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-700">
                هل محل الوعد عقار أو حق عيني عقاري؟ *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQualification(prev => ({ ...prev, isRealEstateSubject: true }))}
                  className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    qualification.isRealEstateSubject
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>نعم، عقار أو حق عيني</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQualification(prev => ({ ...prev, isRealEstateSubject: false }))}
                  className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    !qualification.isRealEstateSubject
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>لا (منقول أو غير عقاري)</span>
                </button>
              </div>
              {!qualification.isRealEstateSubject && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                  ⛔ تنبيه مانع: هذا البيت مخصص حصرياً للوعد بالبيع العقاري المشمول بأحكام مدونة الحقوق العينية.
                </p>
              )}
            </div>

            {/* 3. بأي صفة سيحرر هذا الوعد؟ */}
            <div className="space-y-3 md:col-span-2">
              <label className="block text-xs font-black text-slate-700">
                بأي صفة سيحرر هذا الوعد؟ *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'محرر_رسمي', title: 'محرر رسمي عدلي', desc: 'تلقي العدلين وتوثيق المحكمة الابتدائية (النموذج المعتمد)' },
                  { id: 'محرر_ثابت_التاريخ', title: 'محرر ثابت التاريخ', desc: 'محرر محامي مقبول للنقض وفق المادة 4 ق.ح.ع' },
                  { id: 'محرر_سابق', title: 'محرر سابق يراد إدخاله', desc: 'استيراد وعد سابق للمطابقة أو التجديد' },
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setQualification(prev => ({ ...prev, deedFormat: fmt.id as any }))}
                    className={`p-3.5 text-right rounded-xl border text-xs font-bold transition-all ${
                      qualification.deedFormat === fmt.id
                        ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-black text-sm mb-0.5">{fmt.title}</span>
                    <span className={`text-[11px] font-normal ${qualification.deedFormat === fmt.id ? 'text-blue-200' : 'text-slate-500'}`}>
                      {fmt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <span>المتابعة إلى أطراف الوعد</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: أطراف الوعد بالبيع (الواعدون والموعود لهم)                         */}
      {/* ========================================================================= */}
      {currentStage === 2 && (
        <div className="space-y-6">
          {/* SECTION A: الواعد بالبيع (البائع) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  أ. الطرف الواعد بالبيع (الملتزم بالتفويت)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المالك أو أصحاب الحق المقيد بسند التملك الملتزمون بإبرام البيع النهائي
                </p>
              </div>

              <button
                type="button"
                onClick={addPromisor}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة واعد آخر</span>
              </button>
            </div>

            {/* Multi-promisors joint ownership options */}
            {promisors.length > 1 && (
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/70 space-y-3">
                <span className="text-xs font-black text-blue-900 block">
                  تعدد الواعدين بالبيع: هل يملك الواعدون العقار مجتمعين؟
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'نعم', label: 'نعم، مجتمعين بالتساوي' },
                    { id: 'حسب_حصص_محددة', label: 'حسب حصص شائعة محددة لكل طرف' },
                    { id: 'لا', label: 'بصفات وأسباب تملك مستقلة' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPromisorsJoint(opt.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        promisorsJoint === opt.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Promisors List */}
            <div className="space-y-6">
              {promisors.map((promisor, idx) => (
                <div key={promisor.id || idx} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-800">
                      الواعد بالبيع رقم ({idx + 1})
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promisor.isLegalEntity || false}
                          onChange={e => updatePromisor(idx, { isLegalEntity: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold">شخص اعتباري (شركة / مؤسسة)</span>
                      </label>

                      {promisors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePromisor(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف هذا الواعد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {promisor.isLegalEntity ? (
                    // Legal Entity Fields
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تسمية الشركة / الهيئة *</label>
                        <input
                          type="text"
                          value={promisor.companyName || ''}
                          onChange={e => updatePromisor(idx, { companyName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الشكل القانوني (SARL, SA...)</label>
                        <input
                          type="text"
                          value={promisor.companyForm || ''}
                          onChange={e => updatePromisor(idx, { companyForm: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المعرف الموحد للمقاولة (ICE)</label>
                        <input
                          type="text"
                          value={promisor.ice || ''}
                          onChange={e => updatePromisor(idx, { ice: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
                        <input
                          type="text"
                          value={promisor.rcNumber || ''}
                          onChange={e => updatePromisor(idx, { rcNumber: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المقر الاجتماعي</label>
                        <input
                          type="text"
                          value={promisor.headquarters || ''}
                          onChange={e => updatePromisor(idx, { headquarters: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم الممثل القانوني وصفته</label>
                        <input
                          type="text"
                          value={promisor.legalRepresentativeName || ''}
                          onChange={e => updatePromisor(idx, { legalRepresentativeName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    // Natural Person Fields
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                        <input
                          type="text"
                          value={promisor.fullName || ''}
                          onChange={e => updatePromisor(idx, { fullName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم الأب</label>
                        <input
                          type="text"
                          value={promisor.fatherName || ''}
                          onChange={e => updatePromisor(idx, { fatherName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم الأم</label>
                        <input
                          type="text"
                          value={promisor.motherName || ''}
                          onChange={e => updatePromisor(idx, { motherName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (ب.ت.و) *</label>
                        <input
                          type="text"
                          value={promisor.idNumber || ''}
                          onChange={e => updatePromisor(idx, { idNumber: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                        <input
                          type="date"
                          value={promisor.dateOfBirth || ''}
                          onChange={e => updatePromisor(idx, { dateOfBirth: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">مكان الازدياد</label>
                        <input
                          type="text"
                          value={promisor.placeOfBirth || ''}
                          onChange={e => updatePromisor(idx, { placeOfBirth: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المهنة</label>
                        <input
                          type="text"
                          value={promisor.profession || ''}
                          onChange={e => updatePromisor(idx, { profession: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الحالة العائلية</label>
                        <input
                          type="text"
                          value={promisor.maritalStatus || ''}
                          onChange={e => updatePromisor(idx, { maritalStatus: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">العنوان الكامل للسكني</label>
                        <input
                          type="text"
                          value={promisor.address || ''}
                          onChange={e => updatePromisor(idx, { address: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الحصة المملوكة (الكسر)</label>
                        <input
                          type="text"
                          value={promisor.shareFraction || '1/1'}
                          onChange={e => updatePromisor(idx, { shareFraction: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">مرجع سند الملكية</label>
                        <input
                          type="text"
                          value={promisor.ownershipDeedRef || ''}
                          onChange={e => updatePromisor(idx, { ownershipDeedRef: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: الموعود له بالشراء (المشتري) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    ب. الطرف الموعود له بالشراء (المستفيد من الوعد)
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    ⚠️ لا يعتبر مالكاً للعقار حالاً
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  الطرف المستفيد من الالتزام بالبيع والمتحمل بدفع العربون وباقي الثمن
                </p>
              </div>

              <button
                type="button"
                onClick={addPromisee}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موعود له آخر</span>
              </button>
            </div>

            {/* Multiple Promisees Devolution */}
            {promisees.length > 1 && (
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/70 space-y-3">
                <span className="text-xs font-black text-emerald-900 block">
                  تعدد الموعود لهم: كيف ستؤول الحصص عند إتمام البيع النهائي؟
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'بالتساوي', label: 'بالتساوي بين المشترين' },
                    { id: 'حسب_حصص_محددة', label: 'حسب حصص محددة لكل طرف' },
                    { id: 'على_الشياع', label: 'على الشياع دون تحديد حصص الآن' },
                    { id: 'حسب_بيان_خاص', label: 'حسب اتفاق ملحق' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPromiseesDevolution(opt.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        promiseesDevolution === opt.id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Promisees List */}
            <div className="space-y-6">
              {promisees.map((promisee, idx) => (
                <div key={promisee.id || idx} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-800">
                      الموعود له بالشراء رقم ({idx + 1})
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promisee.isLegalEntity || false}
                          onChange={e => updatePromisee(idx, { isLegalEntity: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold">شخص اعتباري (شركة / مؤسسة)</span>
                      </label>

                      {promisees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePromisee(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف هذا الموعود له"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {promisee.isLegalEntity ? (
                    // Legal Entity Fields
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تسمية الشركة / الهيئة *</label>
                        <input
                          type="text"
                          value={promisee.companyName || ''}
                          onChange={e => updatePromisee(idx, { companyName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الشكل القانوني</label>
                        <input
                          type="text"
                          value={promisee.companyForm || ''}
                          onChange={e => updatePromisee(idx, { companyForm: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المعرف الموحد (ICE)</label>
                        <input
                          type="text"
                          value={promisee.ice || ''}
                          onChange={e => updatePromisee(idx, { ice: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
                        <input
                          type="text"
                          value={promisee.rcNumber || ''}
                          onChange={e => updatePromisee(idx, { rcNumber: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المقر الاجتماعي</label>
                        <input
                          type="text"
                          value={promisee.headquarters || ''}
                          onChange={e => updatePromisee(idx, { headquarters: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الممثل القانوني</label>
                        <input
                          type="text"
                          value={promisee.legalRepresentativeName || ''}
                          onChange={e => updatePromisee(idx, { legalRepresentativeName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    // Natural Person Fields
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                        <input
                          type="text"
                          value={promisee.fullName || ''}
                          onChange={e => updatePromisee(idx, { fullName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم الأب</label>
                        <input
                          type="text"
                          value={promisee.fatherName || ''}
                          onChange={e => updatePromisee(idx, { fatherName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم الأم</label>
                        <input
                          type="text"
                          value={promisee.motherName || ''}
                          onChange={e => updatePromisee(idx, { motherName: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (ب.ت.و) *</label>
                        <input
                          type="text"
                          value={promisee.idNumber || ''}
                          onChange={e => updatePromisee(idx, { idNumber: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                        <input
                          type="date"
                          value={promisee.dateOfBirth || ''}
                          onChange={e => updatePromisee(idx, { dateOfBirth: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">مكان الازدياد</label>
                        <input
                          type="text"
                          value={promisee.placeOfBirth || ''}
                          onChange={e => updatePromisee(idx, { placeOfBirth: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">المهنة</label>
                        <input
                          type="text"
                          value={promisee.profession || ''}
                          onChange={e => updatePromisee(idx, { profession: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الحصة الموعود بشرائها</label>
                        <input
                          type="text"
                          value={promisee.shareFraction || '1/1'}
                          onChange={e => updatePromisee(idx, { shareFraction: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block font-bold text-slate-700 mb-1">العنوان الكامل للسكني</label>
                        <input
                          type="text"
                          value={promisee.address || ''}
                          onChange={e => updatePromisee(idx, { address: e.target.value })}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
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
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <span>المتابعة إلى بيانات العقار</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: بيانات العقار وأصل الملك (محفظ / غير محفظ / طور التحفيظ)          */}
      {/* ========================================================================= */}
      {currentStage === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              المرحلة الثالثة: مشخصات العقار وأصل الملك
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تحديد الوضعية العقارية وفق مقتضيات المادتين 2 و3 من مدونة الحقوق العينية
            </p>
          </div>

          {/* Property Status Radio Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700">
              ما وضعية العقار محل الوعد؟ *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'محفظ', title: 'عقار محفظ', desc: 'له رسم عقاري رسمي بالمحافظة العقارية' },
                { id: 'غير_محفظ', title: 'عقار غير محفظ', desc: 'مبني على أصل الملك وسلسلة الرسوم والشهادات' },
                { id: 'طور_التحفيظ', title: 'في طور التحفيظ', desc: 'موضوع مطلب تحفيظ قيد المسطرة' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setPropertyDetails(prev => ({ ...prev, propertyStatus: st.id as any }))}
                  className={`p-4 text-right rounded-2xl border text-xs font-bold transition-all ${
                    propertyDetails.propertyStatus === st.id
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-black text-sm mb-1">{st.title}</span>
                  <span className={`text-[11px] font-normal leading-relaxed ${propertyDetails.propertyStatus === st.id ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {st.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Path A: Registered Property (عقار محفظ) */}
          {propertyDetails.propertyStatus === 'محفظ' && (
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-200/70 pb-3">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <h4 className="font-black text-emerald-950 text-sm">بيانات الرسم العقاري وشهادة الملكية</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الرسم العقاري (Titre Foncier) *</label>
                  <input
                    type="text"
                    value={propertyDetails.titleNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, titleNumber: e.target.value }))}
                    placeholder="مثال: 12345/01"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-emerald-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المحافظة العقارية المختصة</label>
                  <input
                    type="text"
                    value={propertyDetails.landRegistryOffice || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, landRegistryOffice: e.target.value }))}
                    placeholder="المحافظة العقارية بـ..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الملك</label>
                  <input
                    type="text"
                    value={propertyDetails.propertyName || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, propertyName: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم نظير الرسم إن وجد</label>
                  <input
                    type="text"
                    value={propertyDetails.titleSuffix || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, titleSuffix: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم شهادة الملكية</label>
                  <input
                    type="text"
                    value={propertyDetails.landCertificateNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, landCertificateNumber: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ استخراج الشهادة</label>
                  <input
                    type="date"
                    value={propertyDetails.landCertificateDate || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, landCertificateDate: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyDetails.hasLandCertificateAttached || false}
                      onChange={e => setPropertyDetails(prev => ({ ...prev, hasLandCertificateAttached: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-800">تم الاطلاع على شهادة الملكية ومطابقة مالكي الرسم العقاري</span>
                  </label>
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                📌 <strong>حجية التقييدات العقارية (المادة 2 ق.ح.ع):</strong> الرسوم العقارية وما تتضمنه من تقييدات تثبت حجيتها في مواجهة الكافة، ويجب مطابقة أسماء الواعدين وحصصهم مع الشهادة المسلوبة من المحافظة.
              </div>
            </div>
          )}

          {/* Conditional Path B: Unregistered Property (عقار غير محفظ) */}
          {propertyDetails.propertyStatus === 'غير_محفظ' && (
            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-amber-200/70 pb-3">
                <BookOpen className="w-5 h-5 text-amber-700" />
                <h4 className="font-black text-amber-950 text-sm">أصل الملك وسلسلة العقود (المادة 3 من مدونة الحقوق العينية)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع سند التملك الأصلي *</label>
                  <select
                    value={propertyDetails.originDeedType || 'شراء_سابق'}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originDeedType: e.target.value as any }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="شراء_سابق">شراء سابق (رسم شراء)</option>
                    <option value="إرث">إرث (رسم إراثة / مخلف)</option>
                    <option value="قسمة">رسم قسمة رضائية / بتية</option>
                    <option value="هبة">رسم هبة</option>
                    <option value="صدقة">رسم صدقة</option>
                    <option value="حيازة">رسم حيازة ومخالطة</option>
                    <option value="ملكية_قديمة">رسم استمرار ملكية</option>
                    <option value="أخرى">سند آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم / عدد السند الأصلي</label>
                  <input
                    type="text"
                    value={propertyDetails.originDeedNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originDeedNumber: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ تحرير السند</label>
                  <input
                    type="date"
                    value={propertyDetails.originDeedDate || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originDeedDate: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الجهة المحررة / توثيق المحكمة</label>
                  <input
                    type="text"
                    value={propertyDetails.originCourtNotary || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originCourtNotary: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المالك السالف (البائع السابق / المورث)</label>
                  <input
                    type="text"
                    value={propertyDetails.originalOwnerName || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originalOwnerName: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كناش السند</label>
                  <input
                    type="text"
                    value={propertyDetails.originDeedBook || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originDeedBook: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">صحيفة السند</label>
                  <input
                    type="text"
                    value={propertyDetails.originDeedPage || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, originDeedPage: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كيفية التملك</label>
                  <input
                    type="text"
                    value={propertyDetails.acquisitionMode || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, acquisitionMode: e.target.value }))}
                    placeholder="شراء، إرث..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                📌 <strong>ضمان أصل التملك (المادة 3 ق.ح.ع):</strong> العقار غير المحفظ يتطلب تتبع سلسلة التملك الحيازية والمستندية للتأكد من أحقية الواعد بالتصرف وخلو الملك من أي نزاع معتبر شرعاً.
              </div>
            </div>
          )}

          {/* Conditional Path C: Requisition (في طور التحفيظ) */}
          {propertyDetails.propertyStatus === 'طور_التحفيظ' && (
            <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-sky-200/70 pb-3">
                <Layers className="w-5 h-5 text-sky-700" />
                <h4 className="font-black text-sky-950 text-sm">بيانات مطلب التحفيظ والتعرضات</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم مطلب التحفيظ *</label>
                  <input
                    type="text"
                    value={propertyDetails.requisitionNumber || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, requisitionNumber: e.target.value }))}
                    placeholder="مثال: R/12345"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم طالب التحفيظ</label>
                  <input
                    type="text"
                    value={propertyDetails.requisitionApplicantName || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, requisitionApplicantName: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ إيداع المطلب</label>
                  <input
                    type="date"
                    value={propertyDetails.requisitionDate || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, requisitionDate: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={propertyDetails.hasRequisitionOppositions || false}
                      onChange={e => setPropertyDetails(prev => ({ ...prev, hasRequisitionOppositions: e.target.checked }))}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-bold text-slate-800">هل توجد تعرضات مسجلة على مطلب التحفيظ؟</span>
                  </label>
                  {propertyDetails.hasRequisitionOppositions && (
                    <input
                      type="text"
                      value={propertyDetails.requisitionOppositionsDetails || ''}
                      onChange={e => setPropertyDetails(prev => ({ ...prev, requisitionOppositionsDetails: e.target.value }))}
                      placeholder="بيان أسماء المتعرضين وموضوع التعرض..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-sky-200 text-[11px] text-sky-900 leading-relaxed">
                📌 <strong>تنبيه مسطري:</strong> العقار موضوع مطلب تحفيظ؛ يجب التحقق من وضعية المطلب وعدم تحويله إلى عقار محفظ إلا بعد تأسيس الرسم العقاري النهائي.
              </div>
            </div>
          )}

          {/* Spatial & Physical Description */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-600" />
              الموقع، المساحة والحدود الأربعة
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الجماعة الترابية</label>
                <input
                  type="text"
                  value={propertyDetails.commune || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, commune: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الإقليم / العمالة</label>
                <input
                  type="text"
                  value={propertyDetails.province || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, province: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">المساحة الإجمالية</label>
                <input
                  type="number"
                  value={propertyDetails.areaTotal ?? ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, areaTotal: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">وحدة القياس</label>
                <select
                  value={propertyDetails.areaUnit || 'متر_مربع'}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, areaUnit: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="متر_مربع">متر مربع (m²)</option>
                  <option value="هكتار">هكتار</option>
                  <option value="آر">آر</option>
                  <option value="سنتيار">سنتيار</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">العنوان والموقع الدقيق / الدوار / الحي</label>
                <input
                  type="text"
                  value={propertyDetails.exactAddress || ''}
                  onChange={e => setPropertyDetails(prev => ({ ...prev, exactAddress: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Boundaries */}
            <div className="pt-2 border-t border-slate-200">
              <span className="block font-black text-xs text-slate-700 mb-2">الحدود الأربعة للعقار:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">⬆️ شمالاً</label>
                  <input
                    type="text"
                    value={propertyDetails.boundaryNorth || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, boundaryNorth: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">⬇️ جنوباً</label>
                  <input
                    type="text"
                    value={propertyDetails.boundarySouth || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, boundarySouth: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">➡️ شرقاً</label>
                  <input
                    type="text"
                    value={propertyDetails.boundaryEast || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, boundaryEast: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">⬅️ غرباً</label>
                  <input
                    type="text"
                    value={propertyDetails.boundaryWest || ''}
                    onChange={e => setPropertyDetails(prev => ({ ...prev, boundaryWest: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
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
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <span>المتابعة إلى الثمن والأجل</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: الثمن وكيفية الأداء والأجل والشروط الواقفة والرهون                 */}
      {/* ========================================================================= */}
      {currentStage === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              المرحلة الرابعة: الثمن، العربون، الدفعات، وأجل البيع النهائي
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              الجانب المالي وقواعد العربون (الفصول 584 إلى 586 من ق.ل.ع) والشروط الواقفة
            </p>
          </div>

          {/* Pricing Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Total Price */}
            <div className="bg-emerald-50/70 p-5 rounded-2xl border-2 border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900">💰 الثمن الإجمالي للبيع النهائي</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded-full">إلزامي</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={totalPrice || ''}
                  onChange={e => handleTotalPriceChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl font-black text-lg text-emerald-950"
                />
                <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold">درهم</span>
              </div>
              {totalPriceWords && (
                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/60 text-xs font-bold text-emerald-800 leading-relaxed">
                  فقط {totalPriceWords} درهماً لا غير.
                </div>
              )}
            </div>

            {/* 2. Earnest Amount */}
            <div className="bg-blue-50/70 p-5 rounded-2xl border-2 border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900">💵 العربون / التسبيق المؤدى</span>
                <span className="text-[10px] bg-blue-200 text-blue-950 font-bold px-2 py-0.5 rounded-full">معجل</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={earnestAmount || ''}
                  onChange={e => handleEarnestChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-3 bg-white border border-blue-300 rounded-xl font-black text-lg text-blue-950"
                />
                <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold">درهم</span>
              </div>
              {earnestAmountWords && (
                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200/60 text-xs font-bold text-blue-800 leading-relaxed">
                  فقط {earnestAmountWords} درهماً لا غير.
                </div>
              )}
            </div>

            {/* 3. Remaining Balance (Auto-Calculated) */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border-2 border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900">💳 باقي الثمن في الذمة</span>
                <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full">آلياً</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  disabled={!isManualRemaining}
                  value={remainingAmount}
                  onChange={e => setManualRemainingValue(parseFloat(e.target.value) || 0)}
                  className={`w-full p-3 rounded-xl font-black text-lg border ${
                    isManualRemaining
                      ? 'bg-white border-amber-400 text-amber-950'
                      : 'bg-amber-100/50 border-amber-200 text-amber-900'
                  }`}
                />
                <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold">درهم</span>
              </div>
              <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/60 text-xs font-bold text-amber-800 leading-relaxed">
                فقط {remainingAmountWords} درهماً لا غير.
              </div>
              <div className="pt-2 border-t border-amber-200/50">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-900 font-bold">
                  <input
                    type="checkbox"
                    checked={isManualRemaining}
                    onChange={e => setIsManualRemaining(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>تعديل يدوي استثنائي للباقي</span>
                </label>
                {isManualRemaining && (
                  <input
                    type="text"
                    value={manualRemainingReason}
                    onChange={e => setManualRemainingReason(e.target.value)}
                    placeholder="علة التعديل اليدوي للباقي..."
                    className="mt-1.5 w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Payment Methods Multi-Checkbox Selection */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <span className="font-black text-slate-800 block">كيفية ومسارات أداء الثمن الإجمالي (اختيارات متعددة):</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                'نقداً / عياناً',
                'تحويل بنكي',
                'شيك بنكي',
                'تسبيق / عربون',
                'دفعة أولى معجلة',
                'دفعات متتابعة',
                'باقي الثمن عند البيع النهائي',
                'وديعة لدى العدلين'
              ].map((method) => {
                const checked = selectedPaymentMethods.includes(method);
                return (
                  <label key={method} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-slate-700 font-bold">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedPaymentMethods(prev => [...prev, method]);
                        } else {
                          setSelectedPaymentMethods(prev => prev.filter(m => m !== method));
                        }
                      }}
                      className="rounded text-slate-800"
                    />
                    <span>{method}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Earnest Payment Details & Method */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              تفاصيل أداء العربون / التسبيق
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة أداء العربون *</label>
                <select
                  value={earnestPaymentMethod}
                  onChange={e => setEarnestPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="نقد">نقداً بمجلس العقد (عياناً)</option>
                  <option value="تحويل_بنكي">تحويل بنكي رسمي</option>
                  <option value="شيك_مضمون">شيك بنكي معتمد ومضمون الأداء</option>
                  <option value="شيك_بنكي">شيك بنكي عادي</option>
                  <option value="وديعة_لدى_العدل">وديعة مودعة لدى العدلين</option>
                  <option value="أخرى">طريقة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الأداء / الاستلام</label>
                <input
                  type="date"
                  value={earnestDate}
                  onChange={e => setEarnestDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الشيك أو مرجع التحويل</label>
                <input
                  type="text"
                  value={earnestReference}
                  onChange={e => setEarnestReference(e.target.value)}
                  placeholder="رقم الشيك أو العملية..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المؤسسة البنكية المسحوب عليها</label>
                <input
                  type="text"
                  value={earnestBankName}
                  onChange={e => setEarnestBankName(e.target.value)}
                  placeholder="البنك الشعبي، التجاري وفا بنك..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Earnest Legal Rule (Fasl 584 & 586 DOC) */}
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-5 rounded-2xl border border-blue-200 space-y-3 text-xs">
            <span className="font-black text-blue-900 block">
              قاعدة العربون الجزائي عند النكول (الفصلان 584 و586 من ق.ل.ع):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'خصم_عند_البيع_أو_فقده_عند_النكول',
                  title: 'القاعدة العامة (خصم أو فقد)',
                  desc: 'يخصم من الثمن عند إتمام البيع، ويفقده المشتري إذا نكل، ويرده البائع إذا نكل.'
                },
                {
                  id: 'مزدوج_المادة_586_ق_ل_ع',
                  title: 'الجزاء المزدوج (ضعف العربون)',
                  desc: 'إذا نكل المشتري فقد العربون، وإذا نكل البائع أرجع العربون ومثله (ضعفه).'
                },
                {
                  id: 'مسترد_في_حال_عدم_تحقق_الشرط',
                  title: 'استرداد العربون كلياً',
                  desc: 'يسترد العربون كاملاً في حال تعذر تحقق شرط واقف دون خطأ من المشتري.'
                }
              ].map(rule => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setEarnestRule(rule.id as any)}
                  className={`p-3 text-right rounded-xl border font-bold transition-all ${
                    earnestRule === rule.id
                      ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                      : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span className="block font-black text-xs mb-0.5">{rule.title}</span>
                  <span className={`text-[10px] font-normal leading-relaxed ${earnestRule === rule.id ? 'text-blue-200' : 'text-slate-500'}`}>
                    {rule.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Penalty Clause */}
            <div className="pt-2 border-t border-blue-200/50">
              <label className="block font-bold text-blue-950 mb-1">الشرط الجزائي الاتفاقي الإضافي (إن وجد)</label>
              <input
                type="text"
                value={penaltyClauseText}
                onChange={e => setPenaltyClauseText(e.target.value)}
                placeholder="مثال: يلتزم الطرف الناكل بأداء تعويض اتفاقي قدره... درهم دون حاجة لإنذار"
                className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Installments Schedule */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                جدول أداء الدفعات المتتابعة (إن وجد)
              </h4>
              <button
                type="button"
                onClick={addInstallment}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دفعة</span>
              </button>
            </div>

            {installments.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-2">
                لا توجد دفعات دورية؛ يتم أداء باقي الثمن كاملاً دفعة واحدة عند إبرام البيع النهائي.
              </p>
            ) : (
              <div className="space-y-3">
                {installments.map((ins, idx) => (
                  <div key={ins.id || idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">الدفعة ({idx + 1})</span>
                      <input
                        type="number"
                        value={ins.amount || ''}
                        onChange={e => updateInstallment(idx, { amount: parseFloat(e.target.value) || 0 })}
                        placeholder="المبلغ د.م"
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">تاريخ الاستحقاق</span>
                      <input
                        type="date"
                        value={ins.dueDate || ''}
                        onChange={e => updateInstallment(idx, { dueDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">طريقة الأداء</span>
                      <select
                        value={ins.paymentMethod}
                        onChange={e => updateInstallment(idx, { paymentMethod: e.target.value as any })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      >
                        <option value="تحويل_بنكي">تحويل بنكي</option>
                        <option value="شيك_مضمون">شيك مضمون</option>
                        <option value="شيك_بنكي">شيك عادي</option>
                        <option value="نقد">نقد</option>
                      </select>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">الحالة</span>
                      <select
                        value={ins.status}
                        onChange={e => updateInstallment(idx, { status: e.target.value as any })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      >
                        <option value="مستحق">مستحق لاحقاً</option>
                        <option value="مؤدى">تم الأداء</option>
                        <option value="معلق">معلق على شرط</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => removeInstallment(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final Sale Deadline */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              أجل إتمام البيع النهائي (المادة 573 ق.ل.ع)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'تاريخ_محدد', label: 'تاريخ تقويمي محدد' },
                { id: 'أجل_بالأيام_أو_الأشهر', label: 'مدة محددة بالأيام أو الأشهر' },
                { id: 'مرتبط_بشرط', label: 'أجل معلق على تحقق واقعة أو شرط' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeadlineType(opt.id)}
                  className={`p-3 text-right rounded-xl border font-bold transition-all ${
                    deadlineType === opt.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {deadlineType === 'تاريخ_محدد' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">التاريخ النهائي لإتمام البيع *</label>
                <input
                  type="date"
                  value={specificDeadlineDate}
                  onChange={e => setSpecificDeadlineDate(e.target.value)}
                  className="w-full sm:w-1/2 p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
            )}

            {deadlineType === 'أجل_بالأيام_أو_الأشهر' && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={periodNumber}
                  onChange={e => setPeriodNumber(parseInt(e.target.value) || 0)}
                  className="w-32 p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                />
                <select
                  value={periodUnit}
                  onChange={e => setPeriodUnit(e.target.value as any)}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="أيام">أيام</option>
                  <option value="أشهر">أشهر</option>
                  <option value="سنوات">سنوات</option>
                </select>
                <span className="text-slate-500 font-bold">من تاريخ توقيع هذا الوعد.</span>
              </div>
            )}

            {deadlineType === 'مرتبط_بشرط' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">الشرط المعلق عليه أجل البيع</label>
                <input
                  type="text"
                  value={deadlineConditionText}
                  onChange={e => setDeadlineConditionText(e.target.value)}
                  placeholder="مثال: فور صدور الموافقة على القرض البنكي للمشتري..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Suspensive Conditions & Encumbrances */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                  الشروط الواقفة والالتزامات الاتفاقية
                </h4>
                <span className="text-[11px] text-slate-500">كالحصول على تمويل بنكي أو رفع الرهن أو الإدلاء برخصة</span>
              </div>
              <button
                type="button"
                onClick={addSuspensiveCondition}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة شرط</span>
              </button>
            </div>

            {suspensiveConditions.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-2">
                لا توجد شروط واقفة خاصة مضافة.
              </p>
            ) : (
              <div className="space-y-3">
                {suspensiveConditions.map((cond, idx) => (
                  <div key={cond.id || idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">نوع الشرط</span>
                      <select
                        value={cond.type}
                        onChange={e => updateSuspensiveCondition(idx, { type: e.target.value as any })}
                        className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="قرض_بنكي">الحصول على قرض بنكي</option>
                        <option value="رفع_رهن">رفع الرهن الرسمي عن العقار</option>
                        <option value="تسوية_وضعية">تسوية وضعية عقارية</option>
                        <option value="وثيقة_إدارية">شهادة إدارية / إبراء ضريبي</option>
                        <option value="ترخيص_تجزئة">رخصة تقسيم أو بناء</option>
                        <option value="أخرى">شرط آخر</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-500 block mb-1">صيغة الشرط المتفق عليها</span>
                      <input
                        type="text"
                        value={cond.conditionText || ''}
                        onChange={e => updateSuspensiveCondition(idx, { conditionText: e.target.value })}
                        placeholder="نص الشرط..."
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => removeSuspensiveCondition(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Encumbrances & Mortgages Section */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                  التحملات، الرهون والحجوزات المسجلة على العقار
                </h4>
                <span className="text-[11px] text-slate-500">هل العقار موضوع رهن رسمي أو حجز تحفظي؟</span>
              </div>
              <div className="flex items-center gap-2">
                {(['لا', 'نعم', 'غير_معلوم'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setHasEncumbrances(opt)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      hasEncumbrances === opt
                        ? opt === 'نعم' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt === 'لا' ? 'خالٍ من التحملات' : opt === 'نعم' ? 'محمل برهن/تحمل' : 'غير معلوم'}
                  </button>
                ))}
                {hasEncumbrances === 'نعم' && (
                  <button
                    type="button"
                    onClick={addEncumbrance}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة رهن/تحمل</span>
                  </button>
                )}
              </div>
            </div>

            {hasEncumbrances === 'نعم' && (
              <div className="space-y-3">
                {encumbrancesList.length === 0 ? (
                  <p className="text-xs text-amber-800 italic text-center py-2">
                    تم تحديد وجود تحملات؛ يرجى الضغط على «إضافة رهن/تحمل» لإدراج بيانات الدائن والمبلغ.
                  </p>
                ) : (
                  encumbrancesList.map((enc, idx) => (
                    <div key={enc.id || idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="font-bold text-slate-500 block mb-1">نوع التقييد</span>
                        <input
                          type="text"
                          value={enc.type || ''}
                          onChange={e => updateEncumbrance(idx, { type: e.target.value })}
                          placeholder="رهن رسمي..."
                          className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 block mb-1">الجهة المستفيدة</span>
                        <input
                          type="text"
                          value={enc.beneficiary || ''}
                          onChange={e => updateEncumbrance(idx, { beneficiary: e.target.value })}
                          placeholder="اسم البنك/الدائن..."
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 block mb-1">المبلغ د.م</span>
                        <input
                          type="number"
                          value={enc.amount || ''}
                          onChange={e => updateEncumbrance(idx, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 block mb-1">وضعية الرفع</span>
                        <select
                          value={enc.liftingStatus}
                          onChange={e => updateEncumbrance(idx, { liftingStatus: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        >
                          <option value="شرط_للبيع_النهائي">شرط لإبرام البيع النهائي</option>
                          <option value="قيد_الرفع">قيد مسطرة الرفع</option>
                          <option value="مرفوع">تم رفعه والتشطيب عليه</option>
                          <option value="متحمل_من_المشتري">يتحمله المشتري</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end pt-5">
                        <button
                          type="button"
                          onClick={() => removeEncumbrance(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: العقار</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <span>المتابعة إلى الفحص والاعتماد</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: السندات، التسجيل، الفحص الذكي (Legal Check)، والاعتماد النهائي    */}
      {/* ========================================================================= */}
      {currentStage === 5 && (
        <div className="space-y-6">
          {/* Registration & Stamp Duty Tracking */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                المرحلة الخامسة: التسجيل الضريبي، الفحص القانوني الذكي والاعتماد
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تتبع مراجع الضرائب والتسجيل وإجراء التدقيق العدلي النهائي قبل التوثيق
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">حالة التسجيل الضريبي</label>
                <select
                  value={regStatus}
                  onChange={e => setRegStatus(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="سيتم_تسجيله">سيتم تسجيله داخل الأجل القانوني (30 يوماً)</option>
                  <option value="تم_التسجيل">تم التسجيل واستيفاء الواجبات</option>
                  <option value="لم_يسجل_بعد">لم يسجل بعد</option>
                  <option value="يحتاج_تحققا">يحتاج تحققا</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مكتب التسجيل والتمبر المختص</label>
                <input
                  type="text"
                  value={regTaxOffice}
                  onChange={e => setRegTaxOffice(e.target.value)}
                  placeholder="مكتب التسجيل بـ..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم وصل الإيداع / التسجيل</label>
                <input
                  type="text"
                  value={regReceiptNumber}
                  onChange={e => setRegReceiptNumber(e.target.value)}
                  placeholder="رقم الوصل..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ التسجيل</label>
                <input
                  type="date"
                  value={regDate}
                  onChange={e => setRegDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">واجب التمبر القانوني (درهم)</label>
                <input
                  type="number"
                  value={stampDutyAmount}
                  onChange={e => setStampDutyAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Legal Check Board (لوحة الفحص الذكي) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-sm">لوحة الفحص القانوني الآلي (Legal Check)</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${fileStatusBadge.color}`}>
                {fileStatusBadge.text}
              </span>
            </div>

            {/* Fatal Errors Alert */}
            {legalCheckSummary.fatalErrors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-2">
                <span className="font-black text-red-900 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  موانع قانونية تتطلب المعالجة قبل التوثيق:
                </span>
                <ul className="list-disc list-inside text-xs text-red-800 space-y-1 font-medium">
                  {legalCheckSummary.fatalErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review Warnings */}
            {legalCheckSummary.reviewNotes.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                <span className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  ملاحظات تدقيق وتنبيهات مهنية:
                </span>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 font-medium">
                  {legalCheckSummary.reviewNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 10-Point Readiness Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { title: 'صفة المحرر وفق المادة 4', status: qualification.isLaw41_24Compliant ? 'green' : 'amber', text: 'محرر رسمي مشمول بالقانون 41.24' },
                { title: 'أهلية الواعد بالبيع', status: promisors.every(p => p.isCapable) ? 'green' : 'amber', text: 'كامل الأهلية مع انتفاء الموانع' },
                { title: 'صفة الموعود له بالشراء', status: 'green', text: 'مثبتة كمستفيد وليس مالكاً حالاً' },
                { title: 'مشخصات العقار وأصله', status: propertyDetails.titleNumber || propertyDetails.originDeedNumber ? 'green' : 'amber', text: propertyDetails.propertyStatus },
                { title: 'الثمن والعربون', status: totalPrice > 0 && earnestAmount <= totalPrice ? 'green' : 'red', text: `${totalPrice.toLocaleString()} د.م` },
                { title: 'قاعدة العربون (ق.ل.ع)', status: 'green', text: earnestRule },
                { title: 'أجل البيع النهائي', status: specificDeadlineDate || deadlineConditionText ? 'green' : 'amber', text: deadlineSummary },
                { title: 'خلو الملك من الموانع', status: hasEncumbrances === 'لا' ? 'green' : 'amber', text: hasEncumbrances === 'لا' ? 'سليم من الرهون' : 'محمل برهن/حجز' },
                { title: 'الشروط الواقفة المقررة', status: suspensiveConditions.length > 0 ? 'amber' : 'green', text: `${suspensiveConditions.length} شروط` },
                { title: 'التسجيل والتمبر', status: 'green', text: regStatus },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="block font-black text-slate-800">{item.title}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{item.text}</span>
                  </div>
                  {item.status === 'green' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {item.status === 'amber' && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  {item.status === 'red' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </div>
              ))}
            </div>

            {/* Smart Pre-Drafting Question */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-black">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>سؤال التدقيق المهني قبل التحرير:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                «هل يتضمن الوعد بالبيع جميع العناصر الجوهرية والشروط المتفق عليها بين الطرفين لإبرام البيع النهائي مستقبلاً دون غموض؟»
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-bold pt-1">
                {[
                  { id: 'نعم', label: 'نعم، تام ومستوفٍ لكافة العناصر' },
                  { id: 'يحتاج_استكمال', label: 'يحتاج استكمال بعض المعطيات' },
                  { id: 'يحتاج_مراجعة_قانونية', label: 'يحتاج تدقيقاً إضافياً' },
                ].map(ans => (
                  <button
                    key={ans.id}
                    type="button"
                    onClick={() => setIntelligentQuestionAnswer(ans.id as any)}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      intelligentQuestionAnswer === ans.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {ans.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FINAL PROMINENT STEP 7 TRANSITION RED BUTTON */}
            <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-red-300/80 text-center space-y-4 shadow-sm">
              <div>
                <h4 className="font-black text-slate-900 text-base">جاهزية التحرير العدلي والاعتماد</h4>
                <p className="text-xs text-slate-600 mt-1">
                  عند الاعتماد، سيتم توليد نص الرسم العدلي للوعد بالبيع بالصيغة الرسمية المعتمدة والانتقال مباشرة إلى الخطوة 7 للمراجعة الذكية والتوثيق القضائي
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleProceedToStep7}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-red-500/40"
                >
                  <FileText className="w-5 h-5" />
                  <span>اعتماد رسم الوعد بالبيع والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الثمن والأجل</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
