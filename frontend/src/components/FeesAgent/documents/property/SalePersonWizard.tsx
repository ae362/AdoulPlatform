import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  Party, PropertyDetails,
  SalePersonDeed, SalePersonPartyInfo, SalePartyPOAInfo,
  SaleEncumbranceItem, SaleTitleChainItem, SaleAdminCertificateItem,
  SalePaymentInstallment, SalePersonPropertyDetails, FeesAgentState
} from '../../../../types/feesAgentTypes';
import {
  createEmptyParty, createEmptyProperty, convertNumberToArabicWords,
} from '../../../../utils/feesAgentUtils';
import { generateSalePersonDraft } from '../../../../templates/feesAgentTemplates';
import {
  FileText, Users, Building2, Scale,
  CheckCircle2, AlertTriangle, AlertCircle, Plus, Trash2,
  Send, ShieldCheck, Info, Check, User,
  Lock, FileCheck, Layers, Link2, Calendar,
  CreditCard, ArrowLeft, ArrowRight, FileSignature, X
} from 'lucide-react';

export const SalePersonWizard: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  // ---------------------------------------------------------------------------
  // Inner Stage Navigation (1 to 5)
  // ---------------------------------------------------------------------------
  const [activeStage, setActiveStage] = useState<number>(() => {
    if (state.step && state.step >= 1 && state.step <= 5) return state.step;
    return 1;
  });

  const changeStage = (newStage: number) => {
    setActiveStage(newStage);
    setState(prev => ({
      ...prev,
      step: newStage
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // 1. General Deed Identity (بطاقة هوية الرسم)
  // ---------------------------------------------------------------------------
  const [disposalType, setDisposalType] = useState<'بيع' | 'شراء'>(
    state.salePersonDeed?.disposalType || 'بيع'
  );
  const [intakeDate, setIntakeDate] = useState<string>(
    state.salePersonDeed?.intakeDate || state.meta?.dateGregorian || new Date().toISOString().split('T')[0]
  );
  const [intakePlace, setIntakePlace] = useState<string>(
    state.salePersonDeed?.intakePlace || state.meta?.court || 'مكتب التوثيق العدلي'
  );
  const [court, setCourt] = useState<string>(
    state.salePersonDeed?.court || state.meta?.court || state.preReceptionVerification?.primaryCourt || 'طنجة'
  );
  const [section, setSection] = useState<string>(
    state.salePersonDeed?.section || state.meta?.courtSection || 'قسم قضاء الأسرة والتوثيق'
  );
  const [notaryPrimary, setNotaryPrimary] = useState<string>(
    state.salePersonDeed?.notaryPrimary || state.meta?.notaryPrimary || state.preReceptionVerification?.notary1Name || ''
  );
  const [notarySecondary, setNotarySecondary] = useState<string>(
    state.salePersonDeed?.notarySecondary || state.meta?.notarySecondary || state.preReceptionVerification?.notary2Name || ''
  );
  const [internalFileNumber, setInternalFileNumber] = useState<string>(
    state.salePersonDeed?.internalFileNumber || state.meta?.fileNumber || ''
  );
  const [deedStatus, setDeedStatus] = useState<SalePersonDeed['deedStatus']>(
    state.salePersonDeed?.deedStatus || 'قيد_الإدخال'
  );

  // Notice for legal entity attempt
  const [legalEntityNotice, setLegalEntityNotice] = useState<boolean>(false);
  const [showLegalEntityOption, setShowLegalEntityOption] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // 2. Property Legal Nature (طبيعة ووضعية العقار)
  // ---------------------------------------------------------------------------
  const [propertyStatus, setPropertyStatus] = useState<'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ' | 'حالة_خاصة'>(
    state.salePersonDeed?.property?.propertyStatus ||
    (state.properties?.[0]?.type === 'محفظ' ? 'محفظ' : state.properties?.[0]?.type === 'غير_محفظ' ? 'غير_محفظ' : 'محفظ')
  );

  const [propDetails, setPropDetails] = useState<SalePersonPropertyDetails>(() => {
    if (state.salePersonDeed?.property) return state.salePersonDeed.property;
    const legacy = state.properties?.[0];
    return {
      propertyStatus: legacy?.type === 'غير_محفظ' ? 'غير_محفظ' : 'محفظ',
      propertyType: legacy?.propertyName ? 'عقار_مبني' : 'دار',
      titleNumber: legacy?.titleNumber || '',
      landRegistryOffice: 'المحافظة العقارية المختصة',
      registeredOwners: '',
      registeredShares: 'الكل',
      lastOwnershipCertDate: '',
      ownershipCertRef: '',
      isCoOwnership: false,
      requisitionNumber: '',
      requisitionDate: '',
      requisitionApplicant: '',
      requisitionStatus: 'قيد_المسطرة',
      hasOppositions: 'لا',
      oppositionsDetails: '',
      originDeedType: 'شراء',
      originDeedDate: '',
      originDeedSource: '',
      originDeedCourt: '',
      originDeedBook: '',
      originDeedLetter: '',
      originDeedPage: '',
      originDeedCount: '',
      originDeedNotary: '',
      originDeedNature: 'ناقل_للحق',
      acquisitionMethod: 'بالشراء الصحيح والمخالصة التامة',
      commune: '',
      district: '',
      neighborhood: '',
      douar: '',
      street: '',
      buildingNumber: '',
      exactAddress: legacy?.location || '',
      areaNumber: legacy?.area_m2 || 0,
      areaUnit: 'متر_مربع',
      areaInWords: '',
      boundaries: {
        north: legacy?.boundaries?.north || '',
        south: legacy?.boundaries?.south || '',
        east: legacy?.boundaries?.east || '',
        west: legacy?.boundaries?.west || '',
      },
      components: '',
      treesAndPlantations: '',
      buildingsAndInstallations: '',
      waterAndPassageRights: '',
      easementsOrDisclosedRights: '',
    };
  });

  // ---------------------------------------------------------------------------
  // 3. Parties: Sellers & Buyers (الأطراف: البائعون والمشترون)
  // ---------------------------------------------------------------------------
  const [sellers, setSellers] = useState<SalePersonPartyInfo[]>(() => {
    if (state.salePersonDeed?.sellers && state.salePersonDeed.sellers.length > 0) {
      return state.salePersonDeed.sellers;
    }
    if (state.sellers && state.sellers.length > 0) {
      return state.sellers.map((s, idx) => ({
        id: s.id || `seller-${Date.now()}-${idx}`,
        fullName: s.name || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        dateOfBirth: s.dateOfBirth || '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: (s.nationality as any) || 'مغربي',
        profession: s.profession || '',
        address: s.address || '',
        idType: s.idType || 'CIN',
        idNumber: s.idNumber || '',
        idIssueDate: s.idIssueDate || '',
        idIssuedBy: '',
        maritalStatus: s.maritalStatus || 'متزوج',
        share: s.share || (state.sellers.length === 1 ? 'كامل العقار (100%)' : `1/${state.sellers.length}`),
        sharePercentage: state.sellers.length === 1 ? 100 : Math.round(100 / state.sellers.length),
        capacity: 'مالك',
        representationMode: (s.hasSpecialProxy === 'نعم' || s.proxyName) ? 'وكيل' : 'شخصي',
        poaInfo: s.proxyName ? {
          court: s.proxyDeedNotary || '',
          registryBook: s.proxyDeedBook || '',
          letter: '',
          page: s.proxyDeedPage || '',
          count: s.proxyDeedNumber || '',
          date: s.proxyDeedDate || '',
          notary: s.proxyDeedNotary || '',
          poaNature: 'خاصة',
          isRealEstatePoa: true,
          localRegistryInfo: {
            court: s.proxyDeedNotary || '',
            registrationDate: '',
            localRegistryNumber: '',
            chronologicalNumber: '',
            analyticalNumber: '',
            certificateDate: '',
            status: 'مقيدة',
          },
          agentFullName: s.proxyName || '',
          agentCin: s.proxyNationalID || '',
          agentAddress: s.proxyAddress || '',
          agentPhone: '',
        } : undefined,
      }));
    }
    // Clean default with zero mock names
    return [{
      id: `seller-${Date.now()}`,
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      profession: '',
      address: '',
      idType: 'CIN',
      idNumber: '',
      idIssueDate: '',
      idIssuedBy: '',
      maritalStatus: '',
      share: 'كامل العقار (100%)',
      sharePercentage: 100,
      capacity: 'مالك',
      representationMode: 'شخصي',
    }];
  });

  const [buyers, setBuyers] = useState<SalePersonPartyInfo[]>(() => {
    if (state.salePersonDeed?.buyers && state.salePersonDeed.buyers.length > 0) {
      return state.salePersonDeed.buyers;
    }
    if (state.buyers && state.buyers.length > 0) {
      return state.buyers.map((b, idx) => ({
        id: b.id || `buyer-${Date.now()}-${idx}`,
        fullName: b.name || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        dateOfBirth: b.dateOfBirth || '',
        placeOfBirth: b.placeOfBirth || '',
        nationality: (b.nationality as any) || 'مغربي',
        profession: b.profession || '',
        address: b.address || '',
        idType: b.idType || 'CIN',
        idNumber: b.idNumber || '',
        idIssueDate: b.idIssueDate || '',
        idIssuedBy: '',
        maritalStatus: b.maritalStatus || 'متزوج',
        share: b.share || (state.buyers.length === 1 ? 'كامل العقار (100%)' : `1/${state.buyers.length}`),
        sharePercentage: state.buyers.length === 1 ? 100 : Math.round(100 / state.buyers.length),
        capacity: 'مشتري',
        representationMode: (b.hasSpecialProxy === 'نعم' || b.proxyName) ? 'وكيل' : 'شخصي',
        poaInfo: b.proxyName ? {
          court: b.proxyDeedNotary || '',
          registryBook: b.proxyDeedBook || '',
          letter: '',
          page: b.proxyDeedPage || '',
          count: b.proxyDeedNumber || '',
          date: b.proxyDeedDate || '',
          notary: b.proxyDeedNotary || '',
          poaNature: 'خاصة',
          isRealEstatePoa: true,
          localRegistryInfo: {
            court: b.proxyDeedNotary || '',
            registrationDate: '',
            localRegistryNumber: '',
            chronologicalNumber: '',
            analyticalNumber: '',
            certificateDate: '',
            status: 'مقيدة',
          },
          agentFullName: b.proxyName || '',
          agentCin: b.proxyNationalID || '',
          agentAddress: b.proxyAddress || '',
          agentPhone: '',
        } : undefined,
      }));
    }
    // Clean default with zero mock names
    return [{
      id: `buyer-${Date.now()}`,
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      profession: '',
      address: '',
      idType: 'CIN',
      idNumber: '',
      idIssueDate: '',
      idIssuedBy: '',
      maritalStatus: '',
      share: 'كامل العقار (100%)',
      sharePercentage: 100,
      capacity: 'مشتري',
      representationMode: 'شخصي',
    }];
  });

  // Calculate sum of seller shares
  const sellersShareTotal = useMemo(() => {
    return sellers.reduce((acc, s) => acc + (s.sharePercentage || 0), 0);
  }, [sellers]);

  const buyersShareTotal = useMemo(() => {
    return buyers.reduce((acc, b) => acc + (b.sharePercentage || 0), 0);
  }, [buyers]);

  // ---------------------------------------------------------------------------
  // 4. Chain of Title (سلسلة أصل الملكية)
  // ---------------------------------------------------------------------------
  const [titleChain, setTitleChain] = useState<SaleTitleChainItem[]>(
    state.salePersonDeed?.titleChain || []
  );

  const addTitleChainItem = () => {
    setTitleChain(prev => [
      ...prev,
      {
        id: `chain-${Date.now()}`,
        deedType: 'شراء سابق',
        deedDate: '',
        previousOwner: '',
        reference: '',
        court: court,
        notary: '',
        book: '',
        letter: '',
        page: '',
        count: '',
        transferNature: 'شراء',
      }
    ]);
  };

  const removeTitleChainItem = (id: string) => {
    setTitleChain(prev => prev.filter(c => c.id !== id));
  };

  // ---------------------------------------------------------------------------
  // 5. Encumbrances & Restrictions (التحملات والتقييدات العقارية)
  // ---------------------------------------------------------------------------
  const [hasEncumbrances, setHasEncumbrances] = useState<'نعم' | 'لا' | ''>(
    state.salePersonDeed?.hasEncumbrances || 'لا'
  );

  const [encumbrances, setEncumbrances] = useState<SaleEncumbranceItem[]>(
    state.salePersonDeed?.encumbrances || []
  );

  const addEncumbranceItem = () => {
    setEncumbrances(prev => [
      ...prev,
      {
        id: `enc-${Date.now()}`,
        encumbranceType: 'رهن_رسمي',
        beneficiary: '',
        date: '',
        reference: '',
        impactOnSale: 'يستلزم التشطيب أو الإبراء',
        resolutionChoice: 'رفع_قبل_البيع',
      }
    ]);
  };

  const removeEncumbranceItem = (id: string) => {
    setEncumbrances(prev => prev.filter(e => e.id !== id));
  };

  // ---------------------------------------------------------------------------
  // 6. Pricing & Finance (الثمن والأداء والوفاء)
  // ---------------------------------------------------------------------------
  const [totalPrice, setTotalPrice] = useState<number>(
    state.salePersonDeed?.finance?.totalPrice || state.finance?.price || 0
  );
  const totalPriceWords = useMemo(() => {
    return totalPrice > 0 ? convertNumberToArabicWords(totalPrice) : '';
  }, [totalPrice]);

  const [paymentWays, setPaymentWays] = useState<string[]>(() => {
    if (state.salePersonDeed?.finance?.paymentMethods && state.salePersonDeed.finance.paymentMethods.length > 0) {
      return state.salePersonDeed.finance.paymentMethods;
    }
    return [state.finance?.paymentMethod || 'نقداً'];
  });

  // Earnest / Advance
  const [hasEarnest, setHasEarnest] = useState<boolean>(
    state.salePersonDeed?.finance?.hasEarnest || false
  );
  const [earnestAmount, setEarnestAmount] = useState<number>(
    state.salePersonDeed?.finance?.earnestAmount || 0
  );
  const earnestAmountInWords = useMemo(() => {
    return earnestAmount > 0 ? convertNumberToArabicWords(earnestAmount) : '';
  }, [earnestAmount]);
  const [earnestDate, setEarnestDate] = useState<string>(
    state.salePersonDeed?.finance?.earnestDate || ''
  );
  const [earnestPaymentMethod, setEarnestPaymentMethod] = useState<string>(
    state.salePersonDeed?.finance?.earnestPaymentMethod || 'تحويل_بنكي'
  );
  const [earnestReference, setEarnestReference] = useState<string>(
    state.salePersonDeed?.finance?.earnestReference || ''
  );
  const [earnestBank, setEarnestBank] = useState<string>(
    state.salePersonDeed?.finance?.earnestBank || ''
  );

  // Remaining
  const remainingAmount = useMemo(() => {
    if (!hasEarnest) return 0;
    return Math.max(0, totalPrice - earnestAmount);
  }, [hasEarnest, totalPrice, earnestAmount]);
  const remainingAmountInWords = useMemo(() => {
    return remainingAmount > 0 ? convertNumberToArabicWords(remainingAmount) : '';
  }, [remainingAmount]);
  const [remainingDueDate, setRemainingDueDate] = useState<string>(
    state.salePersonDeed?.finance?.remainingDueDate || ''
  );

  // Installments
  const [hasInstallments, setHasInstallments] = useState<boolean>(
    state.salePersonDeed?.finance?.hasInstallments || false
  );
  const [installments, setInstallments] = useState<SalePaymentInstallment[]>(
    state.salePersonDeed?.finance?.installments || []
  );

  const addInstallment = () => {
    setInstallments(prev => [
      ...prev,
      {
        id: `ins-${Date.now()}`,
        number: prev.length + 1,
        amount: 0,
        dueDate: '',
        paymentMethod: 'تحويل_بنكي',
        reference: '',
        recipient: '',
        notes: '',
      }
    ]);
  };

  const removeInstallment = (id: string) => {
    setInstallments(prev => prev.filter(ins => ins.id !== id).map((ins, i) => ({ ...ins, number: i + 1 })));
  };

  // In-Kind Exchange (عوض عيني)
  const [hasInKindExchange, setHasInKindExchange] = useState<boolean>(
    state.salePersonDeed?.finance?.hasInKindExchange || false
  );
  const [inKindNature, setInKindNature] = useState<string>(
    state.salePersonDeed?.finance?.inKindNature || ''
  );
  const [inKindValue, setInKindValue] = useState<number>(
    state.salePersonDeed?.finance?.inKindValue || 0
  );
  const [inKindTitleOrigin, setInKindTitleOrigin] = useState<string>(
    state.salePersonDeed?.finance?.inKindTitleOrigin || ''
  );

  // ---------------------------------------------------------------------------
  // 7. Special Terms & Administrative Certificates (الشواهد والالتزامات)
  // ---------------------------------------------------------------------------
  const [adminCertificates, setAdminCertificates] = useState<SaleAdminCertificateItem[]>(
    state.salePersonDeed?.certificates || [
      { id: 'cert-1', type: 'شهادة الإبراء الضريبي (Quitus Fiscal)', number: '', date: '', issuedBy: 'إدارة الضرائب' }
    ]
  );

  const addAdminCert = () => {
    setAdminCertificates(prev => [
      ...prev,
      {
        id: `cert-${Date.now()}`,
        type: 'شهادة إدارية لنفي الصبغة الجماعية',
        number: '',
        date: '',
        issuedBy: 'السلطة المحلية المختصة'
      }
    ]);
  };

  const removeAdminCert = (id: string) => {
    setAdminCertificates(prev => prev.filter(c => c.id !== id));
  };

  // Special conditions
  const [specialConditions, setSpecialConditions] = useState<Array<{ id: string; type: any; description: string; isBindingLegal: boolean }>>(
    state.salePersonDeed?.terms?.specialConditions || []
  );

  const addSpecialCondition = () => {
    setSpecialConditions(prev => [
      ...prev,
      {
        id: `cond-${Date.now()}`,
        type: 'تسليم',
        description: 'التزم البائع بتسليم مفاتيح العقار وإخلائه فور الإشهاد واستيفاء الثمن',
        isBindingLegal: true,
      }
    ]);
  };

  const removeSpecialCondition = (id: string) => {
    setSpecialConditions(prev => prev.filter(c => c.id !== id));
  };

  // ---------------------------------------------------------------------------
  // 8. Tax & Duties (التسجيل والتمبر)
  // ---------------------------------------------------------------------------
  const [taxOffice, setTaxOffice] = useState<string>(
    state.salePersonDeed?.taxAndDuty?.registrationOffice || 'مكتب التسجيل والتمبر المختص'
  );
  const [taxReceiptNumber, setTaxReceiptNumber] = useState<string>(
    state.salePersonDeed?.taxAndDuty?.receiptNumber || state.finance?.taxReceiptNumber || ''
  );
  const [taxPaymentDate, setTaxPaymentDate] = useState<string>(
    state.salePersonDeed?.taxAndDuty?.paymentDate || state.finance?.registrationDate || ''
  );
  const [taxAmount, setTaxAmount] = useState<number>(
    state.salePersonDeed?.taxAndDuty?.amount || Math.round(totalPrice * 0.04)
  );
  const [stampDutyAmount, setStampDutyAmount] = useState<number>(
    state.salePersonDeed?.taxAndDuty?.stampDutyAmount || 200
  );

  // ---------------------------------------------------------------------------
  // 9. Pre-Drafting Comprehensive Legal Verification Matrix (الفحص القانوني)
  // ---------------------------------------------------------------------------
  const legalMatrix = useMemo(() => {
    const hasSellers = sellers.length > 0 && sellers.every(s => s.fullName.trim() !== '' && s.idNumber?.trim() !== '');
    const hasBuyers = buyers.length > 0 && buyers.every(b => b.fullName.trim() !== '' && b.idNumber?.trim() !== '');
    const sharesOk = sellersShareTotal === 100;
    const buyersSharesOk = buyers.length > 1 ? buyersShareTotal === 100 : true;
    const propOk = propertyStatus === 'محفظ'
      ? Boolean(propDetails.titleNumber?.trim())
      : propertyStatus === 'في_طور_التحفيظ'
      ? Boolean(propDetails.requisitionNumber?.trim())
      : Boolean(propDetails.boundaries?.north && propDetails.boundaries?.south);
    const priceOk = totalPrice > 0;
    const encumbranceOk = hasEncumbrances === 'لا' || (encumbrances.length > 0 && encumbrances.every(e => Boolean(e.resolutionChoice)));
    const poaCheck = sellers.every(s => {
      if (s.representationMode !== 'وكيل') return true;
      if (!s.poaInfo) return false;
      if (s.poaInfo.isRealEstatePoa && !s.poaInfo.localRegistryInfo?.localRegistryNumber) return false;
      return true;
    });

    const fatalErrors: string[] = [];
    if (!hasSellers) fatalErrors.push('بيانات الطرف البائع غير مكتملة (الاسم ورقم البطاقة الوطنية مطلوبان).');
    if (!hasBuyers) fatalErrors.push('بيانات الطرف المشتري غير مكتملة (الاسم ورقم البطاقة الوطنية مطلوبان).');
    if (!sharesOk) fatalErrors.push(`مجموع حصص البائعين لا يساوي 100% (المجموع الحالي: ${sellersShareTotal}%).`);
    if (!buyersSharesOk) fatalErrors.push(`مجموع حصص المشترين لا يساوي 100% (المجموع الحالي: ${buyersShareTotal}%).`);
    if (!propOk) fatalErrors.push('بيانات العقار الأساسية أو الحدود غير مكتملة.');
    if (!priceOk) fatalErrors.push('لم يتم تحديد ثمن البيع الإجمالي.');
    if (!encumbranceOk) fatalErrors.push('توجد تحملات عقارية مصرح بها دون تحديد خيار المعالجة القانونية.');
    if (!poaCheck) fatalErrors.push('توجد وكالة متعلقة بحق عيني غير مقيدة بالسجل المحلي للوكالات (المرسوم 2.23.101).');

    const allPassed = fatalErrors.length === 0;

    return {
      hasSellers,
      hasBuyers,
      sharesOk: sharesOk && buyersSharesOk,
      propOk,
      priceOk,
      encumbranceOk,
      poaCheck,
      allPassed,
      fatalErrors,
    };
  }, [sellers, buyers, sellersShareTotal, buyersShareTotal, propertyStatus, propDetails, totalPrice, hasEncumbrances, encumbrances]);

  // ---------------------------------------------------------------------------
  // Sync State Upwards to parent state
  // ---------------------------------------------------------------------------
  const syncToGlobalState = useCallback((newStep?: number) => {
    // Construct SalePersonDeed object
    const saleDeedObject: SalePersonDeed = {
      disposalType,
      intakeDate,
      intakePlace,
      court,
      section,
      notaryPrimary,
      notarySecondary,
      internalFileNumber,
      deedStatus,
      sellers,
      buyers,
      isJointSellers: sellers.length > 1,
      buyersDevolutionType: buyers.length > 1 ? 'على_الشياع' : 'سويا',
      property: {
        ...propDetails,
        propertyStatus,
      },
      titleChain,
      hasEncumbrances,
      encumbrances,
      finance: {
        totalPrice,
        totalPriceInWords: totalPriceWords,
        paymentMethods: paymentWays,
        hasEarnest,
        earnestAmount,
        earnestAmountInWords,
        earnestDate,
        earnestPaymentMethod,
        earnestReference,
        earnestBank,
        remainingAmount,
        remainingAmountInWords,
        remainingDueDate,
        hasInstallments,
        installments,
        hasInKindExchange,
        inKindNature,
        inKindValue,
        inKindTitleOrigin,
      },
      terms: {
        hasAgreedDeadline: Boolean(remainingDueDate),
        dueDate: remainingDueDate,
        specialConditions,
      },
      certificates: adminCertificates,
      taxAndDuty: {
        registrationOffice: taxOffice,
        receiptNumber: taxReceiptNumber,
        paymentDate: taxPaymentDate,
        amount: taxAmount,
        stampDutyAmount,
      },
      legalCheckData: {
        isPartiesValid: legalMatrix.hasSellers && legalMatrix.hasBuyers,
        isSharesBalanced: legalMatrix.sharesOk,
        isPropertyValid: legalMatrix.propOk,
        isEncumbrancesResolved: legalMatrix.encumbranceOk,
        isPriceWordsMatching: Boolean(totalPriceWords),
        isPaymentBalanced: true,
        isPoaCompliant: legalMatrix.poaCheck,
        allChecksPassed: legalMatrix.allPassed,
        fatalErrors: legalMatrix.fatalErrors,
      },
      reviewDecision: legalMatrix.allPassed ? 'جاهز_للتحرير' : 'يحتاج_مراجعة',
    };

    // Convert parties to generic Party[] for backwards compatibility
    const genericSellers: Party[] = sellers.map(s => ({
      ...createEmptyParty(),
      id: s.id,
      name: s.fullName,
      idNumber: s.idNumber || '',
      dateOfBirth: s.dateOfBirth || '',
      placeOfBirth: s.placeOfBirth || '',
      nationality: s.nationality || 'مغربي',
      address: s.address || '',
      profession: s.profession || '',
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      maritalStatus: (s.maritalStatus as any) || '',
      share: s.share || '',
      hasSpecialProxy: s.representationMode === 'وكيل' ? 'نعم' : 'لا',
      proxyName: s.poaInfo?.agentFullName,
      proxyNationalID: s.poaInfo?.agentCin,
      proxyDeedNumber: s.poaInfo?.count,
      proxyDeedBook: s.poaInfo?.registryBook,
      proxyDeedPage: s.poaInfo?.page,
      proxyDeedDate: s.poaInfo?.date,
      proxyDeedNotary: s.poaInfo?.court,
    }));

    const genericBuyers: Party[] = buyers.map(b => ({
      ...createEmptyParty(),
      id: b.id,
      name: b.fullName,
      idNumber: b.idNumber || '',
      dateOfBirth: b.dateOfBirth || '',
      placeOfBirth: b.placeOfBirth || '',
      nationality: b.nationality || 'مغربي',
      address: b.address || '',
      profession: b.profession || '',
      fatherName: b.fatherName || '',
      motherName: b.motherName || '',
      maritalStatus: (b.maritalStatus as any) || '',
      share: b.share || '',
      hasSpecialProxy: b.representationMode === 'وكيل' ? 'نعم' : 'لا',
      proxyName: b.poaInfo?.agentFullName,
      proxyNationalID: b.poaInfo?.agentCin,
    }));

    // Convert property to generic PropertyDetails
    const genericProperty: PropertyDetails = {
      ...createEmptyProperty(),
      type: propertyStatus === 'محفظ' ? 'محفظ' : 'غير_محفظ',
      titleNumber: propDetails.titleNumber,
      propertyName: propDetails.propertyType,
      location: propDetails.exactAddress || propDetails.commune,
      area_m2: propDetails.areaNumber,
      boundaries: {
        north: propDetails.boundaries?.north || '',
        south: propDetails.boundaries?.south || '',
        east: propDetails.boundaries?.east || '',
        west: propDetails.boundaries?.west || '',
      },
      titleDocuments: propDetails.originDeedType ? [{
        feeType: propDetails.originDeedType,
        bookReference: propDetails.originDeedBook || '',
        number: propDetails.originDeedCount || '',
        letter: propDetails.originDeedLetter || '',
        page: propDetails.originDeedPage || '',
        count: propDetails.originDeedCount || '',
        date: propDetails.originDeedDate || '',
        correspondingDate: '',
        hasRegistrationReferences: '',
        registeredAt: '',
        depositNumber: '',
        depositDate: '',
        hasNotes: '',
        notes: propDetails.components || '',
        file: null,
      }] : [],
    };

    setState(prev => ({
      ...prev,
      step: newStep !== undefined ? newStep : prev.step,
      salePersonDeed: saleDeedObject,
      sellers: genericSellers,
      buyers: genericBuyers,
      properties: [genericProperty],
      finance: {
        ...(prev.finance || {}),
        price: totalPrice,
        priceInWords: totalPriceWords,
        paymentMethod: paymentWays[0] as any || 'نقداً',
        registeredWithTax: taxReceiptNumber ? 'نعم' : 'لا',
        taxReceiptNumber: taxReceiptNumber,
        registrationDate: taxPaymentDate,
      },
      meta: {
        ...(prev.meta || {}),
        court: court,
        notaryPrimary: notaryPrimary,
        notarySecondary: notarySecondary,
        dateGregorian: intakeDate,
        fileNumber: internalFileNumber,
      } as any,
    }));
  }, [
    disposalType, intakeDate, intakePlace, court, section, notaryPrimary, notarySecondary,
    internalFileNumber, deedStatus, sellers, buyers, propDetails, propertyStatus, titleChain,
    hasEncumbrances, encumbrances, totalPrice, totalPriceWords, paymentWays, hasEarnest,
    earnestAmount, earnestAmountInWords, earnestDate, earnestPaymentMethod, earnestReference,
    earnestBank, remainingAmount, remainingAmountInWords, remainingDueDate, hasInstallments,
    installments, hasInKindExchange, inKindNature, inKindValue, inKindTitleOrigin, specialConditions,
    adminCertificates, taxOffice, taxReceiptNumber, taxPaymentDate, taxAmount, stampDutyAmount,
    legalMatrix, setState
  ]);

  // Keep state synchronized
  useEffect(() => {
    syncToGlobalState();
  }, [syncToGlobalState]);

  // ---------------------------------------------------------------------------
  // Red Button Action: Transition to Step 7 (المراجعة الذكية والتوثيق)
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = () => {
    // Generate authoritative legal draft
    const currentState: FeesAgentState = {
      ...state,
      salePersonDeed: {
        disposalType,
        intakeDate,
        intakePlace,
        court,
        section,
        notaryPrimary,
        notarySecondary,
        internalFileNumber,
        deedStatus: 'جاهز_للتحرير',
        sellers,
        buyers,
        isJointSellers: sellers.length > 1,
        buyersDevolutionType: buyers.length > 1 ? 'على_الشياع' : 'سويا',
        property: {
          ...propDetails,
          propertyStatus,
        },
        titleChain,
        hasEncumbrances,
        encumbrances,
        finance: {
          totalPrice,
          totalPriceInWords: totalPriceWords,
          paymentMethods: paymentWays,
          hasEarnest,
          earnestAmount,
          earnestAmountInWords,
          earnestDate,
          earnestPaymentMethod,
          earnestReference,
          earnestBank,
          remainingAmount,
          remainingAmountInWords,
          remainingDueDate,
          hasInstallments,
          installments,
          hasInKindExchange,
          inKindNature,
          inKindValue,
          inKindTitleOrigin,
        },
        terms: {
          hasAgreedDeadline: Boolean(remainingDueDate),
          dueDate: remainingDueDate,
          specialConditions,
        },
        certificates: adminCertificates,
        taxAndDuty: {
          registrationOffice: taxOffice,
          receiptNumber: taxReceiptNumber,
          paymentDate: taxPaymentDate,
          amount: taxAmount,
          stampDutyAmount,
        },
      },
    };

    const draftText = generateSalePersonDraft(currentState);

    setState(prev => ({
      ...prev,
      ...currentState,
      step: 7,
      draft: draftText,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // Helper Handlers for Sellers and Buyers
  // ---------------------------------------------------------------------------
  // --- Smart Sellers Management ---
  const handleSellerShareChange = (id: string, rawVal: number) => {
    const val = Math.max(0, Math.min(100, rawVal));
    setSellers(prev => {
      if (prev.length === 2) {
        const otherShare = Math.max(0, 100 - val);
        return prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              sharePercentage: val,
              share: val === 100 ? 'كامل العقار (100%)' : val === 50 ? 'النصف (50%)' : `${val}%`,
            };
          } else {
            return {
              ...s,
              sharePercentage: otherShare,
              share: otherShare === 100 ? 'كامل العقار (100%)' : otherShare === 50 ? 'النصف (50%)' : `${otherShare}%`,
            };
          }
        });
      } else if (prev.length > 2) {
        const otherSum = prev.filter(s => s.id !== id).reduce((acc, s) => acc + (s.sharePercentage || 0), 0);
        if (otherSum + val > 100) {
          let excess = (otherSum + val) - 100;
          return prev.map(s => {
            if (s.id === id) {
              return { ...s, sharePercentage: val, share: `${val}%` };
            }
            if (excess > 0 && (s.sharePercentage || 0) > 0) {
              const deduct = Math.min(s.sharePercentage || 0, excess);
              excess -= deduct;
              const newS = (s.sharePercentage || 0) - deduct;
              return { ...s, sharePercentage: newS, share: `${newS}%` };
            }
            return s;
          });
        }
        return prev.map(s => s.id === id ? { ...s, sharePercentage: val, share: `${val}%` } : s);
      }
      return prev.map(s => s.id === id ? { ...s, sharePercentage: val, share: val === 100 ? 'كامل العقار (100%)' : `${val}%` } : s);
    });
  };

  const distributeSellerSharesEqually = () => {
    if (sellers.length === 0) return;
    const count = sellers.length;
    const equal = Math.floor((100 / count) * 100) / 100;
    let allocated = 0;
    setSellers(prev => prev.map((s, idx) => {
      const share = idx === count - 1 ? Math.round((100 - allocated) * 100) / 100 : equal;
      allocated += share;
      const desc = count === 2 ? 'النصف (50%)' : count === 3 ? 'الثلث (33.33%)' : count === 4 ? 'الربع (25%)' : `${share}%`;
      return { ...s, sharePercentage: share, share: desc };
    }));
  };

  const addSeller = () => {
    setSellers(prev => {
      const count = prev.length + 1;
      let updatedPrev = [...prev];
      let newShare = 0;

      if (prev.length === 1 && (prev[0].sharePercentage || 0) === 100) {
        updatedPrev = [{
          ...prev[0],
          sharePercentage: 50,
          share: 'النصف (50%)',
        }];
        newShare = 50;
      } else {
        const currentSum = prev.reduce((acc, s) => acc + (s.sharePercentage || 0), 0);
        if (currentSum < 100) {
          newShare = 100 - currentSum;
        } else {
          const equal = Math.floor((100 / count) * 100) / 100;
          let allocated = 0;
          updatedPrev = prev.map(s => {
            allocated += equal;
            return { ...s, sharePercentage: equal, share: `${equal}%` };
          });
          newShare = Math.round((100 - allocated) * 100) / 100;
        }
      }

      return [
        ...updatedPrev,
        {
          id: `seller-${Date.now()}`,
          fullName: '',
          fatherName: '',
          motherName: '',
          dateOfBirth: '',
          placeOfBirth: '',
          nationality: 'مغربي',
          profession: '',
          address: '',
          idType: 'CIN',
          idNumber: '',
          idIssueDate: '',
          idIssuedBy: '',
          maritalStatus: 'متزوج',
          share: newShare === 50 ? 'النصف (50%)' : `${newShare}%`,
          sharePercentage: newShare,
          capacity: 'شريك_على_الشياع',
          representationMode: 'شخصي',
        }
      ];
    });
  };

  const removeSeller = (id: string) => {
    if (sellers.length <= 1) return;
    setSellers(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 1) {
        return [{
          ...filtered[0],
          sharePercentage: 100,
          share: 'كامل العقار (100%)',
        }];
      }
      return filtered;
    });
  };

  const updateSeller = (id: string, field: keyof SalePersonPartyInfo, val: any) => {
    setSellers(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const updateSellerPoa = (id: string, poaField: keyof SalePartyPOAInfo, val: any) => {
    setSellers(prev => prev.map(s => {
      if (s.id !== id) return s;
      const currentPoa = s.poaInfo || {};
      return {
        ...s,
        poaInfo: {
          ...currentPoa,
          [poaField]: val,
        }
      };
    }));
  };

  const updateSellerLocalRegistry = (id: string, regField: string, val: any) => {
    setSellers(prev => prev.map(s => {
      if (s.id !== id) return s;
      const currentPoa = s.poaInfo || {};
      const currentReg = currentPoa.localRegistryInfo || {};
      return {
        ...s,
        poaInfo: {
          ...currentPoa,
          localRegistryInfo: {
            ...currentReg,
            [regField]: val,
          }
        }
      };
    }));
  };

  // --- Smart Buyers Management ---
  const handleBuyerShareChange = (id: string, rawVal: number) => {
    const val = Math.max(0, Math.min(100, rawVal));
    setBuyers(prev => {
      if (prev.length === 2) {
        const otherShare = Math.max(0, 100 - val);
        return prev.map(b => {
          if (b.id === id) {
            return {
              ...b,
              sharePercentage: val,
              share: val === 100 ? 'كامل العقار (100%)' : val === 50 ? 'النصف (50%)' : `${val}%`,
            };
          } else {
            return {
              ...b,
              sharePercentage: otherShare,
              share: otherShare === 100 ? 'كامل العقار (100%)' : otherShare === 50 ? 'النصف (50%)' : `${otherShare}%`,
            };
          }
        });
      } else if (prev.length > 2) {
        const otherSum = prev.filter(b => b.id !== id).reduce((acc, b) => acc + (b.sharePercentage || 0), 0);
        if (otherSum + val > 100) {
          let excess = (otherSum + val) - 100;
          return prev.map(b => {
            if (b.id === id) {
              return { ...b, sharePercentage: val, share: `${val}%` };
            }
            if (excess > 0 && (b.sharePercentage || 0) > 0) {
              const deduct = Math.min(b.sharePercentage || 0, excess);
              excess -= deduct;
              const newS = (b.sharePercentage || 0) - deduct;
              return { ...b, sharePercentage: newS, share: `${newS}%` };
            }
            return b;
          });
        }
        return prev.map(b => b.id === id ? { ...b, sharePercentage: val, share: `${val}%` } : b);
      }
      return prev.map(b => b.id === id ? { ...b, sharePercentage: val, share: val === 100 ? 'كامل العقار (100%)' : `${val}%` } : b);
    });
  };

  const distributeBuyerSharesEqually = () => {
    if (buyers.length === 0) return;
    const count = buyers.length;
    const equal = Math.floor((100 / count) * 100) / 100;
    let allocated = 0;
    setBuyers(prev => prev.map((b, idx) => {
      const share = idx === count - 1 ? Math.round((100 - allocated) * 100) / 100 : equal;
      allocated += share;
      const desc = count === 2 ? 'النصف (50%)' : count === 3 ? 'الثلث (33.33%)' : count === 4 ? 'الربع (25%)' : `${share}%`;
      return { ...b, sharePercentage: share, share: desc };
    }));
  };

  const addBuyer = () => {
    setBuyers(prev => {
      const count = prev.length + 1;
      let updatedPrev = [...prev];
      let newShare = 0;

      if (prev.length === 1 && (prev[0].sharePercentage || 0) === 100) {
        updatedPrev = [{
          ...prev[0],
          sharePercentage: 50,
          share: 'النصف (50%)',
        }];
        newShare = 50;
      } else {
        const currentSum = prev.reduce((acc, b) => acc + (b.sharePercentage || 0), 0);
        if (currentSum < 100) {
          newShare = 100 - currentSum;
        } else {
          const equal = Math.floor((100 / count) * 100) / 100;
          let allocated = 0;
          updatedPrev = prev.map(b => {
            allocated += equal;
            return { ...b, sharePercentage: equal, share: `${equal}%` };
          });
          newShare = Math.round((100 - allocated) * 100) / 100;
        }
      }

      return [
        ...updatedPrev,
        {
          id: `buyer-${Date.now()}`,
          fullName: '',
          fatherName: '',
          motherName: '',
          dateOfBirth: '',
          placeOfBirth: '',
          nationality: 'مغربي',
          profession: '',
          address: '',
          idType: 'CIN',
          idNumber: '',
          idIssueDate: '',
          idIssuedBy: '',
          maritalStatus: 'متزوج',
          share: newShare === 50 ? 'النصف (50%)' : `${newShare}%`,
          sharePercentage: newShare,
          capacity: 'مشتري',
          representationMode: 'شخصي',
        }
      ];
    });
  };

  const removeBuyer = (id: string) => {
    if (buyers.length <= 1) return;
    setBuyers(prev => {
      const filtered = prev.filter(b => b.id !== id);
      if (filtered.length === 1) {
        return [{
          ...filtered[0],
          sharePercentage: 100,
          share: 'كامل العقار (100%)',
        }];
      }
      return filtered;
    });
  };

  const updateBuyer = (id: string, field: keyof SalePersonPartyInfo, val: any) => {
    setBuyers(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  // ---------------------------------------------------------------------------
  // Render Main Component
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">

      {/* ========================================================================= */}
      {/* 1. PERSISTENT TOP CARD (بطاقة هوية رسم البيع والشراء - الشخص الطبيعي)     */}
      {/* ========================================================================= */}
      <div className="sticky top-2 z-30 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-linear-to-br from-amber-600 to-amber-700 rounded-xl shadow-lg shadow-amber-900/30 text-white shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  رسم بيع وشراء (شخص طبيعي)
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${
                  deedStatus === 'جاهز_للتحرير' ? 'bg-emerald-950 text-emerald-300 border-emerald-600' :
                  deedStatus === 'مستوف' ? 'bg-teal-950 text-teal-300 border-teal-600' :
                  deedStatus === 'يحتاج_مراجعة' ? 'bg-amber-950 text-amber-300 border-amber-600' :
                  'bg-blue-950 text-blue-300 border-blue-600'
                }`}>
                  {deedStatus === 'قيد_الإدخال' ? '🟠 قيد الإدخال' :
                   deedStatus === 'يحتاج_مراجعة' ? '🟡 يحتاج مراجعة' :
                   deedStatus === 'مستوف' ? '🟢 مستوفٍ' :
                   deedStatus === 'جاهز_للتحرير' ? '🔵 جاهز للتحرير' : '🔴 متوقف'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {propertyStatus === 'محفظ' ? '🟢 عقار محفظ' :
                   propertyStatus === 'في_طور_التحفيظ' ? '🔵 في طور التحفيظ' : '🟠 غير محفظ'}
                </span>
              </div>
              
              <h1 className="text-base sm:text-lg font-black text-white mt-1 flex flex-wrap items-center gap-2">
                <span>المحكمة الابتدائية بـ {court}</span>
                <span className="text-xs text-slate-400 font-normal">| {section}</span>
                {internalFileNumber && (
                  <span className="text-xs text-amber-400 font-mono">#{internalFileNumber}</span>
                )}
              </h1>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">البائعون:</span>
              <span className="font-bold text-slate-200 truncate block">
                {sellers[0]?.fullName ? `${sellers[0].fullName} ${sellers.length > 1 ? `(+${sellers.length - 1})` : ''}` : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">المشترون:</span>
              <span className="font-bold text-emerald-300 truncate block">
                {buyers[0]?.fullName ? `${buyers[0].fullName} ${buyers.length > 1 ? `(+${buyers.length - 1})` : ''}` : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">العقار:</span>
              <span className="font-bold text-amber-300 truncate block">
                {propertyStatus === 'محفظ' ? (propDetails.titleNumber ? `رسم عدد ${propDetails.titleNumber}` : 'رسم غير محدد') :
                 propertyStatus === 'في_طور_التحفيظ' ? (propDetails.requisitionNumber ? `مطلب عدد ${propDetails.requisitionNumber}` : 'مطلب غير محدد') :
                 (propDetails.exactAddress || 'ملك غير محفظ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">الثمن الإجمالي:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {totalPrice > 0 ? `${totalPrice.toLocaleString()} د.م` : '---'}
              </span>
            </div>
          </div>

          {/* Action Step 7 Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleProceedToStep7}
              className="w-full sm:w-auto px-4 py-2.5 bg-linear-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 transition-all transform active:scale-95 border border-red-400/40"
              title="الانتقال الفوري لاعتماد رسم البيع وتحرير الصياغة العدلية بالخطوة 7"
            >
              <Send className="w-4 h-4 text-white" />
              <span>اعتماد رسم البيع والانتقال للخطوة 7</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEGAL ENTITY NOTICE DIALOG (عند محاولة إدخال شخص معنوي)                    */}
      {/* ========================================================================= */}
      {legalEntityNotice && (
        <div className="bg-amber-950/90 border-2 border-amber-500 rounded-2xl p-4 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-white mb-1">تنبيه قانوني: حصر الصفة في الأشخاص الطبيعيين</h4>
              <p className="text-xs leading-relaxed text-amber-200">
                هذا البيت مخصص حصرياً للبيع والشراء من طرف <strong>الأشخاص الطبيعيين (العاديين)</strong>. 
                إذا كنت لا ترغب في إدخال شخص معنوي، يمكنك إلغاء هذا التنبيه وسيبقى التحرير مقتصراً بالكامل على الأشخاص الذاتيين دون أي تأثير على بياناتك.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => {
                setLegalEntityNotice(false);
                setShowLegalEntityOption(false);
              }}
              className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border border-red-400 flex items-center gap-1.5 transition shadow-xs"
              title="إلغاء خيار الشخص المعنوي والاعتماد كشخص ذاتي فقط"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء (التعامل مع شخص ذاتي فقط)</span>
            </button>
            <button
              type="button"
              onClick={() => setLegalEntityNotice(false)}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-600"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP NAVIGATION ROADMAP (5 مراحل إجرائية داخلية)                           */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { stage: 1, title: '① طبيعة العقار', desc: 'تحديد الحالة والفحص القبلي', icon: Building2 },
            { stage: 2, title: '② الأطراف والوكالات', desc: 'البائعون والمشترون والسجل', icon: Users },
            { stage: 3, title: '③ الوصف والمراجع', desc: 'الحدود وسلسلة أصل الملك', icon: FileCheck },
            { stage: 4, title: '④ التحملات والشروط', desc: 'الرهون والحجوز والآجال', icon: Scale },
            { stage: 5, title: '⑤ الثمن والاعتماد', desc: 'الأداء والتمبر والانتقال للخطوة 7', icon: ShieldCheck },
          ].map(tab => (
            <button
              key={tab.stage}
              onClick={() => changeStage(tab.stage)}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                activeStage === tab.stage
                  ? 'bg-amber-50/80 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-500/30'
                  : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{tab.title}</span>
                <tab.icon className={`w-4 h-4 ${activeStage === tab.stage ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">{tab.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: PROPERTY LEGAL NATURE & INTAKE IDENTITY                          */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <span>المرحلة الأولى: تحديد طبيعة ووضعية العقار المبيع والبيانات الأساسية</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              القاعدة المركزية: لا يضع النظام العقارات في قالب واحد، بل يبني التوجيه القانوني والوثائق بناءً على طبيعة العقار.
            </p>
          </div>

          {/* Central Property Nature Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              ما الوضعية القانونية للعقار المبيع؟ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { id: 'محفظ', label: 'عقار محفظ', desc: 'له رسم عقاري نهائي ثابت لدى المحافظة العقارية', badge: 'رسم عقاري', color: 'border-emerald-500 bg-emerald-50/60 text-emerald-950' },
                { id: 'في_طور_التحفيظ', label: 'عقار في طور التحفيظ', desc: 'موضوع مطلب تحفيظ جارٍ بالمحافظة العقارية', badge: 'مطلب تحفيظ', color: 'border-blue-500 bg-blue-50/60 text-blue-950' },
                { id: 'غير_محفظ', label: 'عقار غير محفظ', desc: 'ملك عادي يستند إلى رسم ملكية أو سند تملك شرعي', badge: 'أصل ملكية', color: 'border-amber-500 bg-amber-50/60 text-amber-950' },
                { id: 'حالة_خاصة', label: 'حالة خاصة', desc: 'تحتاج تدقيقاً وقيد مراجعة المسطرة والوثائق', badge: 'تحقق خاص', color: 'border-purple-500 bg-purple-50/60 text-purple-950' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPropertyStatus(opt.id as any)}
                  className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between ${
                    propertyStatus === opt.id
                      ? `${opt.color} shadow-sm ring-2 ring-offset-1 ring-amber-500/50`
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm">{opt.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border font-mono">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Deed Details Grid */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <h3 className="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>بيانات التلقي الإشهادي والتوثيق القضائي</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">نوع التصرف</label>
                <select
                  value={disposalType}
                  onChange={e => setDisposalType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="بيع">بيع (تفويت ملك)</option>
                  <option value="شراء">شراء (اكتساب ملك)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ التلقي</label>
                <input
                  type="date"
                  value={intakeDate}
                  onChange={e => setIntakeDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">المحكمة الابتدائية المختصة</label>
                <input
                  type="text"
                  value={court}
                  onChange={e => setCourt(e.target.value)}
                  placeholder="المحكمة الابتدائية..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">قسم قضاء التوثيق</label>
                <input
                  type="text"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">العدل الأول</label>
                <input
                  type="text"
                  value={notaryPrimary}
                  onChange={e => setNotaryPrimary(e.target.value)}
                  placeholder="العدل الأول..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">العدل الثاني</label>
                <input
                  type="text"
                  value={notarySecondary}
                  onChange={e => setNotarySecondary(e.target.value)}
                  placeholder="العدل الثاني..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">مكان التلقي الإشهادي</label>
                <input
                  type="text"
                  value={intakePlace}
                  onChange={e => setIntakePlace(e.target.value)}
                  placeholder="مكتب التوثيق..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الملف الداخلي</label>
                <input
                  type="text"
                  value={internalFileNumber}
                  onChange={e => setInternalFileNumber(e.target.value)}
                  placeholder="رقم الملف..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">وضعية الإدراج</label>
                <select
                  value={deedStatus}
                  onChange={e => setDeedStatus(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                >
                  <option value="قيد_الإدخال">قيد الإدخال</option>
                  <option value="جاهز_للتوثيق">جاهز للتوثيق</option>
                  <option value="محرر_نهائيا">محرر نهائياً</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Legal Guardrail Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                <strong>تطبيق المادة 4 من مدونة الحقوق العينية (القانون 39.08):</strong> يجب تحرير جميع التصرفات العقارية المتعلقة بنقل الملكية أو إنشاء حقوق عينية تحت طائلة البطلان في محرر رسمي يحرره عدلان منتصبان للإشهاد.
              </span>
            </div>
            <button
              onClick={() => changeStage(2)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shrink-0"
            >
              <span>المتابعة للمرحلة ② الأطراف</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: PARTIES, SHARES & AGENCY / REAL ESTATE POA REGISTRY              */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Sellers Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  <span>الطرف البائع (الأشخاص الطبيعيون)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    عدد البائعين: {sellers.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل بيانات البائعين الطبيعيين بدقة وسند ملكيتهم وحصصهم وطريقة حضورهم.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {showLegalEntityOption && (
                  <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white text-xs shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setLegalEntityNotice(true)}
                      className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-1"
                      title="الاستفسار حول بيع الشخص المعنوي (شركة / مؤسسة)"
                    >
                      <span>🏢 إدخال شخص معنوي؟</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLegalEntityOption(false);
                        setLegalEntityNotice(false);
                      }}
                      className="px-2 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border-r border-slate-200 transition"
                      title="إلغاء وإخفاء خيار الشخص المعنوي (التعامل مع شخص ذاتي فقط)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={addSeller}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بائع</span>
                </button>
              </div>
            </div>

            {/* Sum of Shares Validation Banner */}
            <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
              sellersShareTotal === 100
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-center gap-2">
                {sellersShareTotal === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>
                  <strong>مجموع حصص البائعين:</strong> {sellersShareTotal}% 
                  {sellersShareTotal === 100 ? ' — تم استكمال مجموع الحصص بنجاح (100%).' : ' — مجموع الحصص المدخلة لا يساوي كامل الحق المبيع (100%).'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {sellers.length > 1 && (
                  <button
                    type="button"
                    onClick={distributeSellerSharesEqually}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs transition"
                  >
                    ⚖️ توزيع الحصص بالتساوي
                  </button>
                )}
                <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{sellersShareTotal}%</span>
              </div>
            </div>

            {/* Sellers List */}
            <div className="space-y-4">
              {sellers.map((s, index) => (
                <div key={s.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span>البائع رقم {index + 1}: {s.fullName || 'طرف جديد'}</span>
                    </span>

                    {sellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSeller(s.id)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف البائع</span>
                      </button>
                    )}
                  </div>

                  {/* Seller Main Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={s.fullName}
                        onChange={e => updateSeller(s.id, 'fullName', e.target.value)}
                        placeholder="الاسم الكامل كما بالبطاقة..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">اسم الأب</label>
                      <input
                        type="text"
                        value={s.fatherName || ''}
                        onChange={e => updateSeller(s.id, 'fatherName', e.target.value)}
                        placeholder="ابن..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">اسم الأم</label>
                      <input
                        type="text"
                        value={s.motherName || ''}
                        onChange={e => updateSeller(s.id, 'motherName', e.target.value)}
                        placeholder="وأمه..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم البطاقة الوطنية (CIN) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={s.idNumber || ''}
                        onChange={e => updateSeller(s.id, 'idNumber', e.target.value)}
                        placeholder="L123456..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={s.dateOfBirth || ''}
                        onChange={e => updateSeller(s.id, 'dateOfBirth', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مكان الازدياد</label>
                      <input
                        type="text"
                        value={s.placeOfBirth || ''}
                        onChange={e => updateSeller(s.id, 'placeOfBirth', e.target.value)}
                        placeholder="مكان الازدياد..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الجنسية</label>
                      <select
                        value={s.nationality || 'مغربي'}
                        onChange={e => updateSeller(s.id, 'nationality', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="مغربي">مغربية</option>
                        <option value="اجنبي">أجنبية</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المهنة</label>
                      <input
                        type="text"
                        value={s.profession || ''}
                        onChange={e => updateSeller(s.id, 'profession', e.target.value)}
                        placeholder="المهنة..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">العنوان والسكنى</label>
                      <input
                        type="text"
                        value={s.address || ''}
                        onChange={e => updateSeller(s.id, 'address', e.target.value)}
                        placeholder="العنوان الكامل..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الحصة المبيعة (كنسبة مئوية %)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={s.sharePercentage || 0}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          handleSellerShareChange(s.id, val);
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">وصف الحصة كتابة</label>
                      <input
                        type="text"
                        value={s.share || ''}
                        onChange={e => updateSeller(s.id, 'share', e.target.value)}
                        placeholder="مثال: النصف، الربع، 125/1000..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Representation Mode Question (سؤال ذكي: التصرف شخصياً أم بوكالة) */}
                  <div className="bg-white border border-amber-200 rounded-xl p-3">
                    <label className="block font-bold text-xs text-slate-900 mb-2">
                      هل يتصرف هذا البائع شخصياً أم بواسطة نائب/وكيل؟
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name={`rep-${s.id}`}
                          checked={s.representationMode === 'شخصي'}
                          onChange={() => updateSeller(s.id, 'representationMode', 'شخصي')}
                          className="w-4 h-4 text-amber-600"
                        />
                        <span>👤 يتصرف شخصياً بكامل أهليته</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
                        <input
                          type="radio"
                          name={`rep-${s.id}`}
                          checked={s.representationMode === 'وكيل'}
                          onChange={() => {
                            updateSeller(s.id, 'representationMode', 'وكيل');
                            if (!s.poaInfo) {
                              updateSeller(s.id, 'poaInfo', {
                                court: court,
                                registryBook: 'المختلفة',
                                letter: 'ب',
                                page: '',
                                count: '',
                                date: '',
                                notary: '',
                                poaNature: 'حقوق_عينية',
                                isRealEstatePoa: true,
                                localRegistryInfo: {
                                  court: court,
                                  registrationDate: '',
                                  localRegistryNumber: '',
                                  chronologicalNumber: '',
                                  analyticalNumber: '',
                                  certificateDate: '',
                                  status: 'مقيدة',
                                },
                                agentFullName: '',
                                agentCin: '',
                                agentAddress: '',
                              });
                            }
                          }}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>📜 بواسطة وكيل (بموجب وكالة)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900">
                        <input
                          type="radio"
                          name={`rep-${s.id}`}
                          checked={s.representationMode === 'ممثل_قانوني'}
                          onChange={() => updateSeller(s.id, 'representationMode', 'ممثل_قانوني')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>⚖️ بواسطة ممثل قانوني (ولي/وصي/مقدم)</span>
                      </label>
                    </div>

                    {/* Extended POA Card when Agent is selected */}
                    {s.representationMode === 'وكيل' && (
                      <div className="mt-3 pt-3 border-t border-purple-200 space-y-3 bg-purple-50/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-purple-600" />
                            <span>بطاقة الوكالة والتحقق من السجل المحلي للوكالات (المرسوم 2.23.101)</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-mono">
                            فصل 4 مدونة الحقوق العينية
                          </span>
                        </div>

                        {/* Agent Person Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">اسم الوكيل الكامل</label>
                            <input
                              type="text"
                              value={s.poaInfo?.agentFullName || ''}
                              onChange={e => updateSellerPoa(s.id, 'agentFullName', e.target.value)}
                              placeholder="اسم الوكيل..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">رقم بطاقة الوكيل (CIN)</label>
                            <input
                              type="text"
                              value={s.poaInfo?.agentCin || ''}
                              onChange={e => updateSellerPoa(s.id, 'agentCin', e.target.value)}
                              placeholder="CIN الوكيل..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">طبيعة الوكالة</label>
                            <select
                              value={s.poaInfo?.poaNature || 'حقوق_عينية'}
                              onChange={e => {
                                const val = e.target.value as any;
                                updateSellerPoa(s.id, 'poaNature', val);
                                updateSellerPoa(s.id, 'isRealEstatePoa', val === 'حقوق_عينية');
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                            >
                              <option value="حقوق_عينية">وكالة خاصة متعلقة بالحقوق العينية (المادة 4)</option>
                              <option value="خاصة">وكالة خاصة عامة بالتفويت</option>
                              <option value="عامة">وكالة عامة بالتصرف</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          </div>
                        </div>

                        {/* Original POA Reference */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                          <div>
                            <label className="block text-slate-600 mb-1">المحكمة</label>
                            <input
                              type="text"
                              value={s.poaInfo?.court || ''}
                              onChange={e => updateSellerPoa(s.id, 'court', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">دفتر/كناش</label>
                            <input
                              type="text"
                              value={s.poaInfo?.registryBook || ''}
                              onChange={e => updateSellerPoa(s.id, 'registryBook', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">حرف</label>
                            <input
                              type="text"
                              value={s.poaInfo?.letter || ''}
                              onChange={e => updateSellerPoa(s.id, 'letter', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">صحيفة</label>
                            <input
                              type="text"
                              value={s.poaInfo?.page || ''}
                              onChange={e => updateSellerPoa(s.id, 'page', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">عدد</label>
                            <input
                              type="text"
                              value={s.poaInfo?.count || ''}
                              onChange={e => updateSellerPoa(s.id, 'count', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 mb-1">تاريخ الوكالة</label>
                            <input
                              type="date"
                              value={s.poaInfo?.date || ''}
                              onChange={e => updateSellerPoa(s.id, 'date', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                        </div>

                        {/* Local Registry Unit for Real Estate POA (المرسوم 2.23.101 وقرار 381.25) */}
                        <div className="bg-white p-3 rounded-lg border border-purple-300 space-y-2">
                          <span className="font-bold text-xs text-purple-950 block">
                            🌐 السجل المحلي للوكالات المتعلقة بالحقوق العينية (بالمحكمة الابتدائية)
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <label className="block text-slate-600 mb-1">رقم التقييد بالسجل المحلي</label>
                              <input
                                type="text"
                                value={s.poaInfo?.localRegistryInfo?.localRegistryNumber || ''}
                                onChange={e => updateSellerLocalRegistry(s.id, 'localRegistryNumber', e.target.value)}
                                placeholder="رقم التقييد..."
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">الرقم التحليلي/المركب</label>
                              <input
                                type="text"
                                value={s.poaInfo?.localRegistryInfo?.analyticalNumber || ''}
                                onChange={e => updateSellerLocalRegistry(s.id, 'analyticalNumber', e.target.value)}
                                placeholder="الرقم المركب..."
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">تاريخ التقييد</label>
                              <input
                                type="date"
                                value={s.poaInfo?.localRegistryInfo?.registrationDate || ''}
                                onChange={e => updateSellerLocalRegistry(s.id, 'registrationDate', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">وضعية الوكالة بالسجل</label>
                              <select
                                value={s.poaInfo?.localRegistryInfo?.status || 'مقيدة'}
                                onChange={e => updateSellerLocalRegistry(s.id, 'status', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-bold"
                              >
                                <option value="مقيدة">🟢 مقيدة وسارية المفعول</option>
                                <option value="معدلة">🟠 معدلة</option>
                                <option value="ملغاة">🔴 ملغاة (معزولة)</option>
                                <option value="تحتاج_تحقق">🟡 تحتاج تحقق</option>
                              </select>
                            </div>
                          </div>

                          {!s.poaInfo?.localRegistryInfo?.localRegistryNumber && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ <strong>تنبيه ذكي:</strong> توجد وكالة متعلقة بحق عيني، لكن لم يتم العثور على مرجع تقييدها بالسجل المحلي للوكالات. تحقق من وضعيتها قبل اعتماد البيع طبقاً للمرسوم 2.23.101.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buyers Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>الطرف المشتري (الأشخاص الطبيعيون)</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    عدد المشترين: {buyers.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل بيانات المشتري الطبيعي، وحصته من المقتنى، وطريقة التملك.
                </p>
              </div>

              <button
                type="button"
                onClick={addBuyer}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مشترٍ</span>
              </button>
            </div>

            {/* Sum of Buyers Shares Validation Banner */}
            {buyers.length > 1 && (
              <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                buyersShareTotal === 100
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-center gap-2">
                  {buyersShareTotal === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>
                    <strong>مجموع حصص المشترين:</strong> {buyersShareTotal}% 
                    {buyersShareTotal === 100 ? ' — تم استكمال مجموع الحصص بنجاح (100%).' : ' — مجموع الحصص المدخلة للمشترين لا يساوي 100% (راجع الحصص).'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={distributeBuyerSharesEqually}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs transition"
                  >
                    ⚖️ توزيع الحصص بالتساوي
                  </button>
                  <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{buyersShareTotal}%</span>
                </div>
              </div>
            )}

            {/* Buyers List */}
            <div className="space-y-4">
              {buyers.map((b, index) => (
                <div key={b.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span>المشتري رقم {index + 1}: {b.fullName || 'طرف جديد'}</span>
                    </span>

                    {buyers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBuyer(b.id)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف المشتري</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={b.fullName}
                        onChange={e => updateBuyer(b.id, 'fullName', e.target.value)}
                        placeholder="الاسم الكامل كما بالبطاقة..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">اسم الأب</label>
                      <input
                        type="text"
                        value={b.fatherName || ''}
                        onChange={e => updateBuyer(b.id, 'fatherName', e.target.value)}
                        placeholder="ابن..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">اسم الأم</label>
                      <input
                        type="text"
                        value={b.motherName || ''}
                        onChange={e => updateBuyer(b.id, 'motherName', e.target.value)}
                        placeholder="وأمه..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم البطاقة الوطنية (CIN) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={b.idNumber || ''}
                        onChange={e => updateBuyer(b.id, 'idNumber', e.target.value)}
                        placeholder="CIN..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاريخ الازدياد</label>
                      <input
                        type="date"
                        value={b.dateOfBirth || ''}
                        onChange={e => updateBuyer(b.id, 'dateOfBirth', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مكان الازدياد</label>
                      <input
                        type="text"
                        value={b.placeOfBirth || ''}
                        onChange={e => updateBuyer(b.id, 'placeOfBirth', e.target.value)}
                        placeholder="مكان الازدياد..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الجنسية</label>
                      <select
                        value={b.nationality || 'مغربي'}
                        onChange={e => updateBuyer(b.id, 'nationality', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="مغربي">مغربية</option>
                        <option value="اجنبي">أجنبية</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المهنة</label>
                      <input
                        type="text"
                        value={b.profession || ''}
                        onChange={e => updateBuyer(b.id, 'profession', e.target.value)}
                        placeholder="المهنة..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">العنوان والسكنى</label>
                      <input
                        type="text"
                        value={b.address || ''}
                        onChange={e => updateBuyer(b.id, 'address', e.target.value)}
                        placeholder="العنوان الكامل..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الحصة المقتناة (كنسبة مئوية %)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={b.sharePercentage || 0}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          handleBuyerShareChange(b.id, val);
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">وصف الحصة كتابة</label>
                      <input
                        type="text"
                        value={b.share || ''}
                        onChange={e => updateBuyer(b.id, 'share', e.target.value)}
                        placeholder="مثال: كامل العقار، النصف، على الشياع..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => changeStage(1)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ①</span>
            </button>

            <button
              onClick={() => changeStage(3)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة للمرحلة ③ الوصف العقاري والمراجع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: PROPERTY DESCRIPTION, BOUNDARIES, CO-OWNERSHIP & CERTIFICATES    */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <span>المرحلة الثالثة: مشخصات العقار المبيع، الحدود الأربع، وسندات التملك</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تفرع الحقول آلياً طبقاً لوضعية العقار: [{propertyStatus}]
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
              الوضعية الحالية: {propertyStatus}
            </span>
          </div>

          {/* Conditional Branch A: Registered Property (عقار محفظ) */}
          {propertyStatus === 'محفظ' && (
            <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-4 space-y-4">
              <span className="font-bold text-xs text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>📜 بطاقة الرسم العقاري والشهادة العقارية</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الرسم العقاري <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={propDetails.titleNumber || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, titleNumber: e.target.value }))}
                    placeholder="رقم الرسم العقاري..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المحافظة العقارية المختصة</label>
                  <input
                    type="text"
                    value={propDetails.landRegistryOffice || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, landRegistryOffice: e.target.value }))}
                    placeholder="المحافظة العقارية بـ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">المالك أو المالكون المقيدون</label>
                  <input
                    type="text"
                    value={propDetails.registeredOwners || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, registeredOwners: e.target.value }))}
                    placeholder="أسماء المالكين بالرسم..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الحصص المقيدة بالرسم</label>
                  <input
                    type="text"
                    value={propDetails.registeredShares || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, registeredShares: e.target.value }))}
                    placeholder="الكل، النصف، الشياع..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">مرجع شهادة الملكية الحديثة</label>
                  <input
                    type="text"
                    value={propDetails.ownershipCertRef || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, ownershipCertRef: e.target.value }))}
                    placeholder="عدد شهادة الملكية..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ استخراج شهادة الملكية</label>
                  <input
                    type="date"
                    value={propDetails.lastOwnershipCertDate || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, lastOwnershipCertDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
                    <input
                      type="checkbox"
                      checked={propDetails.isCoOwnership || false}
                      onChange={e => setPropDetails(prev => ({ ...prev, isCoOwnership: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>🏢 العقار خاضع لنظام الملكية المشتركة في العقارات المبنية (القانون 18.00)</span>
                  </label>
                </div>
              </div>

              {/* Co-ownership Special Unit Fields */}
              {propDetails.isCoOwnership && (
                <div className="bg-white p-3 rounded-xl border border-emerald-400 space-y-3">
                  <span className="font-bold text-xs text-emerald-950 block">
                    🏢 بيانات الوحدة المفرزة والأجزاء المشتركة (الملكية المشتركة)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">رقم الوحدة المفرزة</label>
                      <input
                        type="text"
                        value={propDetails.coOwnershipUnitNumber || ''}
                        onChange={e => setPropDetails(prev => ({ ...prev, coOwnershipUnitNumber: e.target.value }))}
                        className="w-full p-1.5 bg-slate-50 border rounded font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">الطابق</label>
                      <input
                        type="text"
                        value={propDetails.coOwnershipFloor || ''}
                        onChange={e => setPropDetails(prev => ({ ...prev, coOwnershipFloor: e.target.value }))}
                        className="w-full p-1.5 bg-slate-50 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">رقم الشقة/المحل</label>
                      <input
                        type="text"
                        value={propDetails.coOwnershipApartmentNumber || ''}
                        onChange={e => setPropDetails(prev => ({ ...prev, coOwnershipApartmentNumber: e.target.value }))}
                        className="w-full p-1.5 bg-slate-50 border rounded font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">الحصة بالأجزاء المشتركة</label>
                      <input
                        type="text"
                        value={propDetails.coOwnershipCommonPartsShare || ''}
                        onChange={e => setPropDetails(prev => ({ ...prev, coOwnershipCommonPartsShare: e.target.value }))}
                        placeholder="مثال: 145/10000"
                        className="w-full p-1.5 bg-slate-50 border rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional Branch B: Under Requisition (عقار في طور التحفيظ) */}
          {propertyStatus === 'في_طور_التحفيظ' && (
            <div className="bg-blue-50/60 border border-blue-300 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>📜 بطاقة مطلب التحفيظ العقاري (يمنع استخدام عبارة رسم عقاري)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-bold">
                  قاعدة قانونية ملزمة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم مطلب التحفيظ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={propDetails.requisitionNumber || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, requisitionNumber: e.target.value }))}
                    placeholder="مطلب عدد..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ إيداع المطلب</label>
                  <input
                    type="date"
                    value={propDetails.requisitionDate || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, requisitionDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم طالب التحفيظ</label>
                  <input
                    type="text"
                    value={propDetails.requisitionApplicant || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, requisitionApplicant: e.target.value }))}
                    placeholder="اسم طالب التحفيظ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">هل توجد تعرضات مقيدة؟</label>
                  <select
                    value={propDetails.hasOppositions || 'لا'}
                    onChange={e => setPropDetails(prev => ({ ...prev, hasOppositions: e.target.value as any }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="لا">لا (خالٍ من التعرضات)</option>
                    <option value="نعم">نعم (توجد تعرضات مقيدة)</option>
                  </select>
                </div>

                {propDetails.hasOppositions === 'نعم' && (
                  <div className="sm:col-span-4">
                    <label className="block text-red-700 font-bold mb-1">بيانات وتفاصيل التعرضات والاتفاق حولها</label>
                    <input
                      type="text"
                      value={propDetails.oppositionsDetails || ''}
                      onChange={e => setPropDetails(prev => ({ ...prev, oppositionsDetails: e.target.value }))}
                      placeholder="أرقام التعرضات والخصوم والوضعية..."
                      className="w-full p-2 bg-white border border-red-300 rounded-lg text-red-900"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conditional Branch C: Unregistered Property (عقار غير محفظ) */}
          {propertyStatus === 'غير_محفظ' && (
            <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-4 space-y-4">
              <span className="font-bold text-xs text-amber-950 flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-amber-600" />
                <span>📜 بطاقة أصل الملكية وسند تملك البائع</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع السند</label>
                  <select
                    value={propDetails.originDeedType || 'شراء'}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedType: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded font-bold"
                  >
                    <option value="شراء">رسم شراء</option>
                    <option value="ملكية">رسم ملكية (لفيف)</option>
                    <option value="إراثة">رسم إراثة</option>
                    <option value="قسمة">رسم مقاسمة</option>
                    <option value="هبة">رسم هبة</option>
                    <option value="حيازة">رسم حيازة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ السند</label>
                  <input
                    type="date"
                    value={propDetails.originDeedDate || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedDate: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المحكمة/التوثيق</label>
                  <input
                    type="text"
                    value={propDetails.originDeedCourt || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedCourt: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كناش/دفتر</label>
                  <input
                    type="text"
                    value={propDetails.originDeedBook || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedBook: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">صحيفة</label>
                  <input
                    type="text"
                    value={propDetails.originDeedPage || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedPage: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عدد</label>
                  <input
                    type="text"
                    value={propDetails.originDeedCount || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, originDeedCount: e.target.value }))}
                    className="w-full p-1.5 bg-white border rounded"
                  />
                </div>
              </div>

              {/* Chain of Title Addition (سلسلة أصل الملكية) */}
              <div className="pt-2 border-t border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>🔗 سلسلة أصل الملكية وتداول الحق (السند السابق ← الأسبق)</span>
                  </span>
                  <button
                    type="button"
                    onClick={addTitleChainItem}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة سند سابق بالسلسلة</span>
                  </button>
                </div>

                {titleChain.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    لم تتم إضافة سندات سابقة في السلسلة. يمكنك إضافة سند المالك السابق إن وجد لإحكام السند.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {titleChain.map((chain, i) => (
                      <div key={chain.id} className="bg-white p-2.5 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-amber-800">سند ({i + 1})</span>
                        <input
                          type="text"
                          value={chain.deedType}
                          onChange={e => setTitleChain(prev => prev.map(c => c.id === chain.id ? { ...c, deedType: e.target.value } : c))}
                          placeholder="نوع السند..."
                          className="p-1 bg-slate-50 border rounded w-28"
                        />
                        <input
                          type="text"
                          value={chain.previousOwner || ''}
                          onChange={e => setTitleChain(prev => prev.map(c => c.id === chain.id ? { ...c, previousOwner: e.target.value } : c))}
                          placeholder="السلف/المالك السابق..."
                          className="p-1 bg-slate-50 border rounded w-36 font-bold"
                        />
                        <input
                          type="text"
                          value={chain.reference || ''}
                          onChange={e => setTitleChain(prev => prev.map(c => c.id === chain.id ? { ...c, reference: e.target.value } : c))}
                          placeholder="المراجع (عدد، كناش...)"
                          className="p-1 bg-slate-50 border rounded flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeTitleChainItem(chain.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Common Physical Characteristics & Boundaries (الموقع والحدود الأربع الإلزامية) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>المشخصات المادية، المساحة، والحدود الأربعة المعتبرة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع العقار</label>
                <select
                  value={propDetails.propertyType || 'دار'}
                  onChange={e => setPropDetails(prev => ({ ...prev, propertyType: e.target.value as any }))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="دار">دار سكنية</option>
                  <option value="شقة">شقة</option>
                  <option value="فيلا">فيلا</option>
                  <option value="أرض">بقعة أرضية صالحة للبناء</option>
                  <option value="أرض_فلاحية">أرض فلاحية</option>
                  <option value="محل_تجاري">محل تجاري/مهني</option>
                  <option value="عقار_مبني">عقار مبني</option>
                  <option value="عقار_آخر">عقار آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المساحة بالأرقام</label>
                <input
                  type="number"
                  min="0"
                  value={propDetails.areaNumber || 0}
                  onChange={e => {
                    const num = Number(e.target.value) || 0;
                    setPropDetails(prev => ({
                      ...prev,
                      areaNumber: num,
                      areaInWords: num > 0 ? `${convertNumberToArabicWords(num)} ${prev.areaUnit === 'هكتار' ? 'هكتار' : 'متر مربع'}` : ''
                    }));
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الوحدة</label>
                <select
                  value={propDetails.areaUnit || 'متر_مربع'}
                  onChange={e => setPropDetails(prev => ({ ...prev, areaUnit: e.target.value as any }))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="متر_مربع">متر مربع (م²)</option>
                  <option value="هكتار">هكتار</option>
                  <option value="آر">آر</option>
                  <option value="سنتيار">سنتيار</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المساحة بالحروف</label>
                <input
                  type="text"
                  value={propDetails.areaInWords || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, areaInWords: e.target.value }))}
                  placeholder="مائتان وخمسون متراً مربعاً..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الجماعة الترابية</label>
                <input
                  type="text"
                  value={propDetails.commune || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, commune: e.target.value }))}
                  placeholder="جماعة..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الحي / الدوار</label>
                <input
                  type="text"
                  value={propDetails.douar || propDetails.neighborhood || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, douar: e.target.value, neighborhood: e.target.value }))}
                  placeholder="الحي أو الدوار..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">العنوان الدقيق والموقع</label>
                <input
                  type="text"
                  value={propDetails.exactAddress || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, exactAddress: e.target.value }))}
                  placeholder="الشارع، رقم الزقاق، عمارة، شقة..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Mandatory Four Boundaries (الحدود الأربع) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-900 mb-2">
                الحدود الأربعة المعتبرة قانوناً (لا يسمح بالنقل بحدود مجهولة دون تنبيه) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="block text-slate-500 mb-1 font-bold">شمالاً:</span>
                  <input
                    type="text"
                    value={propDetails.boundaries?.north || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, boundaries: { ...prev.boundaries!, north: e.target.value } }))}
                    placeholder="يحده شمالاً..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 font-bold">جنوباً:</span>
                  <input
                    type="text"
                    value={propDetails.boundaries?.south || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, boundaries: { ...prev.boundaries!, south: e.target.value } }))}
                    placeholder="يحده جنوباً..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 font-bold">شرقاً:</span>
                  <input
                    type="text"
                    value={propDetails.boundaries?.east || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, boundaries: { ...prev.boundaries!, east: e.target.value } }))}
                    placeholder="يحده شرقاً..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 font-bold">غرباً:</span>
                  <input
                    type="text"
                    value={propDetails.boundaries?.west || ''}
                    onChange={e => setPropDetails(prev => ({ ...prev, boundaries: { ...prev.boundaries!, west: e.target.value } }))}
                    placeholder="يحده غرباً..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Elements / Amenities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">مكونات العقار ومرافقه</label>
                <input
                  type="text"
                  value={propDetails.components || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, components: e.target.value }))}
                  placeholder="غرف، بهو، مطبخ، مرآب، مرافق..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ما به من أشجار / حقوق ماء وممرات</label>
                <input
                  type="text"
                  value={propDetails.treesAndPlantations || ''}
                  onChange={e => setPropDetails(prev => ({ ...prev, treesAndPlantations: e.target.value }))}
                  placeholder="أشجار زيتون، حقوق شرب ومسيل..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Administrative Certificates (الشواهد الإدارية) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-slate-600" />
                <span>الشواهد الإدارية المرفقة (الإبراء الجبائي، عدم الصبغة الجماعية، رخص التعمير)</span>
              </span>
              <button
                type="button"
                onClick={addAdminCert}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة شاهدة إدارية</span>
              </button>
            </div>

            <div className="space-y-2">
              {adminCertificates.map((cert) => (
                <div key={cert.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <input
                    type="text"
                    value={cert.type}
                    onChange={e => setAdminCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, type: e.target.value } : c))}
                    className="p-1 bg-slate-50 border rounded w-56 font-bold"
                  />
                  <input
                    type="text"
                    value={cert.number || ''}
                    onChange={e => setAdminCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, number: e.target.value } : c))}
                    placeholder="رقم الشاهدة..."
                    className="p-1 bg-slate-50 border rounded w-28 font-mono"
                  />
                  <input
                    type="date"
                    value={cert.date || ''}
                    onChange={e => setAdminCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, date: e.target.value } : c))}
                    className="p-1 bg-slate-50 border rounded w-32"
                  />
                  <input
                    type="text"
                    value={cert.issuedBy || ''}
                    onChange={e => setAdminCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, issuedBy: e.target.value } : c))}
                    placeholder="الجهة المصدرة..."
                    className="p-1 bg-slate-50 border rounded flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdminCert(cert.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => changeStage(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ②</span>
            </button>

            <button
              onClick={() => changeStage(4)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة للمرحلة ④ التحملات والتقييدات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: ENCUMBRANCES, RESTRICTIONS & SPECIAL CONDITIONS                  */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <span>المرحلة الرابعة: التحملات والتقييدات العقارية والشروط الخاصة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع الرهون والحجوز والتقييدات الاحتياطية وتحديد القرار الذكي لمعالجتها قبل اعتماد الرسم.
              </p>
            </div>
          </div>

          {/* Encumbrance Query Switch */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-900 mb-2">
              هل توجد أي تقييدات أو رهن أو حجز أو تحملات عينية مسجلة على العقار؟
            </label>
            <div className="flex gap-4 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer text-emerald-900">
                <input
                  type="radio"
                  name="hasEncumbrances"
                  checked={hasEncumbrances === 'لا'}
                  onChange={() => {
                    setHasEncumbrances('لا');
                    setEncumbrances([]);
                  }}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>🟢 طاهر وخالٍ من أي تحمل أو رهن أو حجز (عقار حر)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-amber-900">
                <input
                  type="radio"
                  name="hasEncumbrances"
                  checked={hasEncumbrances === 'نعم'}
                  onChange={() => {
                    setHasEncumbrances('نعم');
                    if (encumbrances.length === 0) addEncumbranceItem();
                  }}
                  className="w-4 h-4 text-amber-600"
                />
                <span>🟠 توجد تحملات أو تقييدات مسجلة تستلزم المعالجة</span>
              </label>
            </div>
          </div>

          {/* Encumbrances List & Smart Resolution Choices */}
          {hasEncumbrances === 'نعم' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>قائمة التحملات وطريقة المعالجة المقررة:</span>
                </span>
                <button
                  type="button"
                  onClick={addEncumbranceItem}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة تحمل جديد</span>
                </button>
              </div>

              {encumbrances.map((item, idx) => (
                <div key={item.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-300 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">التحمل ({idx + 1})</span>
                    <button
                      type="button"
                      onClick={() => removeEncumbranceItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع التحمل أو التقييد</label>
                      <select
                        value={item.encumbranceType}
                        onChange={e => setEncumbrances(prev => prev.map(en => en.id === item.id ? { ...en, encumbranceType: e.target.value as any } : en))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="رهن_رسمي">رهن رسمي (بنكي أو اتفاقي)</option>
                        <option value="حجز_تحفظي">حجز تحفظي</option>
                        <option value="حجز_تنفيذي">حجز تنفيذي</option>
                        <option value="تقييد_احتياطي">تقييد احتياطي (فصل 85 وما يليه)</option>
                        <option value="حق_ارتفاق">حق ارتفاق مقيد</option>
                        <option value="حق_انتفاع">حق انتفاع أو سكنى</option>
                        <option value="منع_من_التصرف">منع من التصرف أو شرط واقف</option>
                        <option value="تعرض">تعرض بمطلب التحفيظ</option>
                        <option value="حق_عيني_آخر">حق عيني آخر</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المستفيد / الدائن المقيد</label>
                      <input
                        type="text"
                        value={item.beneficiary}
                        onChange={e => setEncumbrances(prev => prev.map(en => en.id === item.id ? { ...en, beneficiary: e.target.value } : en))}
                        placeholder="اسم البنك أو الدائن..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مرجع التقييد وتاريخه</label>
                      <input
                        type="text"
                        value={item.reference || ''}
                        onChange={e => setEncumbrances(prev => prev.map(en => en.id === item.id ? { ...en, reference: e.target.value } : en))}
                        placeholder="كناش... عدد... تاريخ..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">🛡️ القرار الذكي لكيفية المعالجة</label>
                      <select
                        value={item.resolutionChoice}
                        onChange={e => setEncumbrances(prev => prev.map(en => en.id === item.id ? { ...en, resolutionChoice: e.target.value as any } : en))}
                        className="w-full p-2 bg-white border border-amber-400 rounded-lg font-bold text-slate-900"
                      >
                        <option value="رفع_قبل_البيع">سيُرفع قبل البيع والتقييد النهائي</option>
                        <option value="رفع_بالتزامن">سيُرفع بالتزامن عبر اقتطاع الدين من الثمن</option>
                        <option value="بقاء_التحمل">البيع يتم مع بقاء التحمل ورضا المشتري</option>
                        <option value="موافقة_صاحب_الحق">توجد موافقة كتابية رسمية من صاحب الحق</option>
                        <option value="تحقق_قانوني">يحتاج إلى تحقق قانوني إضافي</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Terms & Conditions (الشروط والاتفاقات الخاصة) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>الشروط والاتفاقات الخاصة (تسليم المفاتيح، الإخلاء، رفع التحملات)</span>
              </span>
              <button
                type="button"
                onClick={addSpecialCondition}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة شرط خاص</span>
              </button>
            </div>

            {specialConditions.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                لم يتم إدراج شروط خاصة إضافية (تسري القواعد العامة لقانون الالتزامات والعقود حول التسليم والضمان).
              </p>
            ) : (
              <div className="space-y-2">
                {specialConditions.map((cond, i) => (
                  <div key={cond.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">شرط ({i + 1})</span>
                    <select
                      value={cond.type}
                      onChange={e => setSpecialConditions(prev => prev.map(c => c.id === cond.id ? { ...c, type: e.target.value as any } : c))}
                      className="p-1 bg-slate-50 border rounded font-bold"
                    >
                      <option value="تسليم">متعلق بالتسليم والإخلاء</option>
                      <option value="أداء">متعلق بالأداء والوفاء</option>
                      <option value="رفع_تحمل">متعلق برفع تحمل أو رهن</option>
                      <option value="وثيقة">متعلق بوثيقة أو رخصة</option>
                      <option value="آخر">آخر</option>
                    </select>
                    <input
                      type="text"
                      value={cond.description}
                      onChange={e => setSpecialConditions(prev => prev.map(c => c.id === cond.id ? { ...c, description: e.target.value } : c))}
                      className="p-1 bg-slate-50 border rounded flex-1 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecialCondition(cond.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => changeStage(3)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ③</span>
            </button>

            <button
              onClick={() => changeStage(5)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة للمرحلة ⑤ الثمن والأداء والاعتماد</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: PRICE, PAYMENT, TAXES & FINAL STEP 7 DISPATCH                    */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>المرحلة الخامسة: الثمن وطرق الأداء، التسجيل والتمبر، والاعتماد النهائي للخطوة 7</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تفقيط الثمن آلياً بالحروف باللغة العربية، وجدولة الدفعات أو التسبيق، والفحص القانوني الشامل.
            </p>
          </div>

          {/* Total Price & Arabic Conversion */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-900 font-bold mb-1">
                  الثمن الإجمالي للبيع (بالدرهم المغربي) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalPrice || 0}
                  onChange={e => setTotalPrice(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-black font-mono text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الثمن كتابة بالحروف (تلقائي)</label>
                <input
                  type="text"
                  readOnly
                  value={totalPriceWords}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Payment Ways Multi-Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">كيف تم أداء الثمن؟ (يمكن اختيار أكثر من طريقة)</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {['نقداً بمجلس العقد', 'تحويل بنكي', 'شيك بنكي مصادق عليه', 'مقاصة', 'عوض عيني', 'أداء مؤجل', 'تسبيق معجل + الباقي', 'دفعات مجدولة'].map(method => {
                  const isSelected = paymentWays.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setPaymentWays(prev => prev.filter(m => m !== method));
                        } else {
                          setPaymentWays(prev => [...prev, method]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Earnest / Advance Breakdown */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
                <input
                  type="checkbox"
                  checked={hasEarnest}
                  onChange={e => setHasEarnest(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>💰 يوجد تسبيق / عربون مؤدى معجلاً بمجلس العقد</span>
              </label>
            </div>

            {hasEarnest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">مبلغ التسبيق المؤدى</label>
                  <input
                    type="number"
                    min="0"
                    max={totalPrice}
                    value={earnestAmount || 0}
                    onChange={e => setEarnestAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ أداء التسبيق</label>
                  <input
                    type="date"
                    value={earnestDate}
                    onChange={e => setEarnestDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طريقة أداء التسبيق</label>
                  <input
                    type="text"
                    value={earnestPaymentMethod}
                    onChange={e => setEarnestPaymentMethod(e.target.value)}
                    placeholder="شيك، تحويل، نقد..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">البنك المسحوب عليه</label>
                  <input
                    type="text"
                    value={earnestBank}
                    onChange={e => setEarnestBank(e.target.value)}
                    placeholder="اسم المؤسسة البنكية..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">مرجع الشيك / التحويل</label>
                  <input
                    type="text"
                    value={earnestReference}
                    onChange={e => setEarnestReference(e.target.value)}
                    placeholder="رقم الشيك أو الحساب..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">باقي الثمن (محسوب آلياً)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${remainingAmount.toLocaleString()} درهم`}
                    className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-bold font-mono text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">أجل وفاء الباقي</label>
                  <input
                    type="date"
                    value={remainingDueDate}
                    onChange={e => setRemainingDueDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Multiple Installments Block (الدفعات المتعددة) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
                <input
                  type="checkbox"
                  checked={hasInstallments}
                  onChange={e => {
                    setHasInstallments(e.target.checked);
                    if (e.target.checked && installments.length === 0) {
                      addInstallment();
                    }
                  }}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span>🧾 أداء الثمن على دفعات متعددة مجدولة</span>
              </label>

              {hasInstallments && (
                <button
                  type="button"
                  onClick={addInstallment}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة دفعة</span>
                </button>
              )}
            </div>

            {hasInstallments && (
              <div className="space-y-2 pt-2">
                {installments.map((ins) => (
                  <div key={ins.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">الدفعة ({ins.number})</span>
                    <input
                      type="number"
                      min="0"
                      value={ins.amount || 0}
                      onChange={e => setInstallments(prev => prev.map(item => item.id === ins.id ? { ...item, amount: Number(e.target.value) || 0 } : item))}
                      placeholder="المبلغ..."
                      className="p-1.5 bg-slate-50 border rounded w-28 font-mono font-bold"
                    />
                    <input
                      type="date"
                      value={ins.dueDate || ''}
                      onChange={e => setInstallments(prev => prev.map(item => item.id === ins.id ? { ...item, dueDate: e.target.value } : item))}
                      className="p-1.5 bg-slate-50 border rounded w-32"
                    />
                    <select
                      value={ins.paymentMethod}
                      onChange={e => setInstallments(prev => prev.map(item => item.id === ins.id ? { ...item, paymentMethod: e.target.value } : item))}
                      className="p-1.5 bg-slate-50 border rounded w-32"
                    >
                      <option value="تحويل_بنكي">تحويل بنكي</option>
                      <option value="شيك_بنكي">شيك بنكي</option>
                      <option value="نقداً">نقداً</option>
                    </select>
                    <input
                      type="text"
                      value={ins.reference || ''}
                      onChange={e => setInstallments(prev => prev.map(item => item.id === ins.id ? { ...item, reference: e.target.value } : item))}
                      placeholder="المرجع / البنك..."
                      className="p-1.5 bg-slate-50 border rounded flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeInstallment(ins.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Kind Exchange Block (الأداء بعوض عيني) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
              <input
                type="checkbox"
                checked={hasInKindExchange}
                onChange={e => setHasInKindExchange(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span>🧱 أداء بعوض عيني أو معاوضة (عقار أو منقول آخر)</span>
            </label>

            {hasInKindExchange && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طبيعة العوض العيني ومواصفاته</label>
                  <input
                    type="text"
                    value={inKindNature}
                    onChange={e => setInKindNature(e.target.value)}
                    placeholder="شقة، بقعة أرضية، منقول..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">القيمة المتفق عليها (د.م)</label>
                  <input
                    type="number"
                    min="0"
                    value={inKindValue}
                    onChange={e => setInKindValue(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">سند تملك العوض العيني</label>
                  <input
                    type="text"
                    value={inKindTitleOrigin}
                    onChange={e => setInKindTitleOrigin(e.target.value)}
                    placeholder="رسم شراء، ملكية، إراثة..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Tax and Duties Unit (الوحدة الجبائية) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-600" />
              <span>🧾 التسجيل والتمبر والواجبات الجبائية (تحديد ديناميكي)</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">مكتب التسجيل والضرائب</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={e => setTaxOffice(e.target.value)}
                  className="w-full p-2 bg-white border rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم وصل التسجيل</label>
                <input
                  type="text"
                  value={taxReceiptNumber}
                  onChange={e => setTaxReceiptNumber(e.target.value)}
                  placeholder="رقم الوصل..."
                  className="w-full p-2 bg-white border rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ أداء التسجيل</label>
                <input
                  type="date"
                  value={taxPaymentDate}
                  onChange={e => setTaxPaymentDate(e.target.value)}
                  className="w-full p-2 bg-white border rounded"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">واجب التسجيل التقديري (4%)</label>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={e => setTaxAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رسم التمبر القانوني</label>
                <input
                  type="number"
                  value={stampDutyAmount}
                  onChange={e => setStampDutyAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pre-Drafting 10-Point Legal Verification Matrix */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="font-black text-sm text-white">
                  🔐 الفحص القانوني المسبق الشامل قبل التحرير العدلي
                </h4>
              </div>
              <button
                type="button"
                onClick={() => syncToGlobalState()}
                className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition"
              >
                تحديث الفحص 🔍
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.hasSellers ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>طرف البائع</span>
                {legalMatrix.hasSellers ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.hasBuyers ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>طرف المشتري</span>
                {legalMatrix.hasBuyers ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.sharesOk ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>الحصص (100%)</span>
                {legalMatrix.sharesOk ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.propOk ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>العقار والحدود</span>
                {legalMatrix.propOk ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.priceOk ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>الثمن والتفقيط</span>
                {legalMatrix.priceOk ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.encumbranceOk ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>سلامة التحملات</span>
                {legalMatrix.encumbranceOk ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.poaCheck ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <span>تقييد الوكالات (السجل)</span>
                {legalMatrix.poaCheck ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                legalMatrix.allPassed ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              }`}>
                <span>جاهزية التحرير</span>
                {legalMatrix.allPassed ? <span className="font-bold text-emerald-400">مستوفٍ</span> : <span className="font-bold text-amber-400">ملاحظات</span>}
              </div>
            </div>

            {legalMatrix.fatalErrors.length > 0 && (
              <div className="bg-red-950/70 border border-red-500/40 rounded-xl p-3 space-y-1 text-xs text-red-200">
                <span className="font-bold text-red-300 block mb-1">نقاط تستوجب المعالجة قبل التحرير:</span>
                {legalMatrix.fatalErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Central Prominent Step 7 Transition Button */}
          <div className="bg-linear-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-red-500/40 rounded-2xl p-6 text-center space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-900">
                اعتماد رسم البيع والشراء وتوليد وثيقة الإشهاد العدلي الرسمية
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl mx-auto">
                بالضغط على الزر أدناه، سيقوم النظام بتجميع كافة البيانات المهيكلة وصياغة رسم البيع المعتمد وفق التوثيق العدلي المغربي، والانتقال مباشرة إلى الخطوة 7 للتدقيق والمراجعة القضائية وإرسال الملف للقاضي المكلف بالتوثيق.
              </p>
            </div>

            <button
              onClick={handleProceedToStep7}
              className="px-8 py-3.5 bg-linear-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm rounded-xl shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 mx-auto transition-all transform hover:scale-[1.02] active:scale-95 border border-red-400/50 cursor-pointer"
            >
              <Send className="w-5 h-5 text-white" />
              <span>اعتماد رسم البيع والشراء والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => changeStage(4)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للمرحلة ④</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
