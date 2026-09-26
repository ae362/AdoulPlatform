import React, { useState, useMemo } from 'react';
import type {
  FeesAgentState,
  ConsensualDivorceWorkflowData,
  ConsensualChildData
} from '../../../../types/feesAgentTypes';
import { generateConsensualDivorceDraft } from '../../../../utils/divorceTemplateEngine';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Coins,
  ShieldCheck,
  HeartCrack,
  UserCheck,
  Building2,
  FileCheck2,
  Users,
  Baby,
  Home,
  Check,
  Sparkles,
  Info
} from 'lucide-react';

interface ConsensualDivorceWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete: () => void;
  onBackToClassification?: () => void;
}

// Arabic Tafqit (Number to Words)
function convertNumberToArabicWords(num: number, suffix: string = ' درهم'): string {
  if (!num || isNaN(num)) return 'صفر درهم';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const rem = n % 10;
      return (rem ? ones[rem] + ' و' : '') + tens[Math.floor(n / 10)];
    }
    const rem = n % 100;
    return hundreds[Math.floor(n / 100)] + (rem ? ' و' + convertGroup(rem) : '');
  };

  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  let result = '';

  if (thousands > 0) {
    if (thousands === 1) result = 'ألف';
    else if (thousands === 2) result = 'ألفان';
    else if (thousands >= 3 && thousands <= 10) result = convertGroup(thousands) + ' آلاف';
    else result = convertGroup(thousands) + ' ألف';
  }

  if (remainder > 0) {
    result = (result ? result + ' و' : '') + convertGroup(remainder);
  }

  return result.trim() + suffix;
}

function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const bDate = new Date(birthDateStr);
  const today = new Date();
  if (isNaN(bDate.getTime())) return 0;
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export const ConsensualDivorceWorkflow: React.FC<ConsensualDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  const existingWf = state.divorceClassification?.consensualWorkflow;
  const husbandExisting = state.sellers?.[0];
  const wifeExisting = state.buyers?.[0];
  // واقعة البناء — مُسجَّلة من الشاشة التمهيدية
  const isBeforeConsummation = state.divorceClassification?.consummationStatus === 'before_consummation';

  const [currentStage, setCurrentStage] = useState<number>(1);

  // -------------------------------------------------------------
  // Stage 01: الإذن القضائي بالإشهاد بالطلاق الاتفاقي
  // -------------------------------------------------------------
  const [hasJudicialPermission, setHasJudicialPermission] = useState<boolean>(
    existingWf?.hasJudicialPermission ?? true
  );
  const [court, setCourt] = useState<string>(
    existingWf?.court || state.meta?.court || 'المحكمة الابتدائية بطنجة'
  );
  const [section, setSection] = useState<string>(
    existingWf?.section || state.meta?.courtSection || 'قسم قضاء الأسرة'
  );
  const [fileNumber, setFileNumber] = useState<string>(
    existingWf?.fileNumber || state.meta?.fileNumber || '2026/1602/412'
  );
  const [permissionNumber, setPermissionNumber] = useState<string>(
    existingWf?.permissionNumber || state.meta?.authorizationNumber || '1428'
  );
  const [permissionDate, setPermissionDate] = useState<string>(
    existingWf?.permissionDate || state.meta?.authorizationDate || '2026-03-12'
  );
  const [receptionDate, setReceptionDate] = useState<string>(
    existingWf?.receptionDate || state.meta?.dateGregorian || '2026-03-15'
  );
  const [adoulNotes, setAdoulNotes] = useState<string>(
    existingWf?.adoulNotes || ''
  );

  // -------------------------------------------------------------
  // Stage 02: تحديد الحاضرين وطالبي الإشهاد
  // -------------------------------------------------------------
  const [attendeeType, setAttendeeType] = useState<'both_spouses' | 'proxies' | 'husband_only' | 'wife_only'>(
    existingWf?.attendeeType || 'both_spouses'
  );

  // -------------------------------------------------------------
  // Stage 03: بيانات الزوج
  // -------------------------------------------------------------
  const [husbandFirstNameAr, setHusbandFirstNameAr] = useState<string>(
    existingWf?.husband?.firstNameAr || husbandExisting?.name?.split(' ')[0] || 'عمر'
  );
  const [husbandLastNameAr, setHusbandLastNameAr] = useState<string>(
    existingWf?.husband?.lastNameAr || husbandExisting?.name?.split(' ').slice(1).join(' ') || 'المنصوري'
  );
  const [husbandFirstNameFr, setHusbandFirstNameFr] = useState<string>(
    existingWf?.husband?.firstNameFr || ''
  );
  const [husbandLastNameFr, setHusbandLastNameFr] = useState<string>(
    existingWf?.husband?.lastNameFr || ''
  );
  const [husbandNationality, setHusbandNationality] = useState<string>(
    existingWf?.husband?.nationality || husbandExisting?.nationality || 'مغربية'
  );
  const [husbandBirthDate, setHusbandBirthDate] = useState<string>(
    existingWf?.husband?.birthDate || husbandExisting?.dateOfBirth || '1988-04-14'
  );
  const [husbandBirthPlace, setHusbandBirthPlace] = useState<string>(
    existingWf?.husband?.birthPlace || husbandExisting?.placeOfBirth || 'طنجة'
  );
  const [husbandFatherName, setHusbandFatherName] = useState<string>(
    existingWf?.husband?.fatherName || husbandExisting?.fatherName || 'محمد'
  );
  const [husbandMotherName, setHusbandMotherName] = useState<string>(
    existingWf?.husband?.motherName || husbandExisting?.motherName || 'فاطمة الزهراء'
  );
  const [husbandIdType, setHusbandIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWf?.husband?.idType || 'cin'
  );
  const [husbandIdNumber, setHusbandIdNumber] = useState<string>(
    existingWf?.husband?.idNumber || husbandExisting?.idNumber || 'K489123'
  );
  const [husbandIdExpiryDate, setHusbandIdExpiryDate] = useState<string>(
    existingWf?.husband?.idExpiryDate || husbandExisting?.idExpiryDate || '2031-06-20'
  );
  const [husbandProfession, setHusbandProfession] = useState<string>(
    existingWf?.husband?.profession || husbandExisting?.profession || 'مهندس برمجيات'
  );
  const [husbandAddress, setHusbandAddress] = useState<string>(
    existingWf?.husband?.address || husbandExisting?.address || 'حي مالاباطا، شارع محمد السادس'
  );
  const [husbandCity, setHusbandCity] = useState<string>(
    existingWf?.husband?.city || 'طنجة'
  );
  const [husbandCountry, setHusbandCountry] = useState<string>(
    existingWf?.husband?.country || 'المملكة المغربية'
  );

  // -------------------------------------------------------------
  // Stage 04: بيانات الزوجة
  // -------------------------------------------------------------
  const [wifeFirstNameAr, setWifeFirstNameAr] = useState<string>(
    existingWf?.wife?.firstNameAr || wifeExisting?.name?.split(' ')[0] || 'مريم'
  );
  const [wifeLastNameAr, setWifeLastNameAr] = useState<string>(
    existingWf?.wife?.lastNameAr || wifeExisting?.name?.split(' ').slice(1).join(' ') || 'العلوي'
  );
  const [wifeFirstNameFr, setWifeFirstNameFr] = useState<string>(
    existingWf?.wife?.firstNameFr || ''
  );
  const [wifeLastNameFr, setWifeLastNameFr] = useState<string>(
    existingWf?.wife?.lastNameFr || ''
  );
  const [wifeNationality, setWifeNationality] = useState<string>(
    existingWf?.wife?.nationality || wifeExisting?.nationality || 'مغربية'
  );
  const [wifeBirthDate, setWifeBirthDate] = useState<string>(
    existingWf?.wife?.birthDate || wifeExisting?.dateOfBirth || '1992-09-22'
  );
  const [wifeBirthPlace, setWifeBirthPlace] = useState<string>(
    existingWf?.wife?.birthPlace || wifeExisting?.placeOfBirth || 'تطوان'
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    existingWf?.wife?.fatherName || wifeExisting?.fatherName || 'عبد الكريم'
  );
  const [wifeMotherName, setWifeMotherName] = useState<string>(
    existingWf?.wife?.motherName || wifeExisting?.motherName || 'خديجة'
  );
  const [wifeIdType, setWifeIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWf?.wife?.idType || 'cin'
  );
  const [wifeIdNumber, setWifeIdNumber] = useState<string>(
    existingWf?.wife?.idNumber || wifeExisting?.idNumber || 'L591823'
  );
  const [wifeIdExpiryDate, setWifeIdExpiryDate] = useState<string>(
    existingWf?.wife?.idExpiryDate || wifeExisting?.idExpiryDate || '2032-11-15'
  );
  const [wifeProfession, setWifeProfession] = useState<string>(
    existingWf?.wife?.profession || wifeExisting?.profession || 'أستاذة التعليم الثانوي'
  );
  const [wifeAddress, setWifeAddress] = useState<string>(
    existingWf?.wife?.address || wifeExisting?.address || 'شارع مولاي إسماعيل، إقامة الزهور'
  );
  const [wifeCity, setWifeCity] = useState<string>(
    existingWf?.wife?.city || 'طنجة'
  );
  const [wifeCountry, setWifeCountry] = useState<string>(
    existingWf?.wife?.country || 'المملكة المغربية'
  );

  // -------------------------------------------------------------
  // Stage 05: مرجع رسم الزواج
  // -------------------------------------------------------------
  const [marriageDeedType, setMarriageDeedType] = useState<string>(
    existingWf?.marriageRef?.deedType || 'رسم زواج شرعي'
  );
  const [marriageRegistryBook, setMarriageRegistryBook] = useState<string>(
    existingWf?.marriageRef?.registryBook || 'كناش الأنكحة'
  );
  const [marriageBookNumber, setMarriageBookNumber] = useState<string>(
    existingWf?.marriageRef?.bookNumber || '18'
  );
  const [marriagePageNumber, setMarriagePageNumber] = useState<string>(
    existingWf?.marriageRef?.pageNumber || '142'
  );
  const [marriageDeedNumber, setMarriageDeedNumber] = useState<string>(
    existingWf?.marriageRef?.deedNumber || '854'
  );
  const [marriageDeedDate, setMarriageDeedDate] = useState<string>(
    existingWf?.marriageRef?.deedDate || '2019-10-05'
  );
  const [marriageIssuingAuthority, setMarriageIssuingAuthority] = useState<string>(
    existingWf?.marriageRef?.issuingAuthority || 'قسم قضاء الأسرة بالمحكمة الابتدائية بطنجة'
  );

  // -------------------------------------------------------------
  // Stage 06: بيانات الطلاق الاتفاقي وطبيعته القانونية
  // -------------------------------------------------------------
  const [divorceCount, setDivorceCount] = useState<'first' | 'second'>(
    existingWf?.divorceCount || 'first'
  );

  // -------------------------------------------------------------
  // Stage 07: التحقق من واقعة البناء
  // -------------------------------------------------------------
  const [consummationHappened, setConsummationHappened] = useState<boolean>(
    existingWf?.consummationHappened ?? true
  );

  // -------------------------------------------------------------
  // Stage 08: أهلية الطرفين وحرية الإرادة والتراضي
  // -------------------------------------------------------------
  const [isFreeWillConsent, setIsFreeWillConsent] = useState<boolean>(
    existingWf?.consentChecks?.isFreeWillConsent ?? true
  );
  const [hasCoercionOrDefect, setHasCoercionOrDefect] = useState<boolean>(
    existingWf?.consentChecks?.hasCoercionOrDefect ?? false
  );
  const [hasIncompetenceOrLackOfDiscernment, setHasIncompetenceOrLackOfDiscernment] = useState<boolean>(
    existingWf?.consentChecks?.hasIncompetenceOrLackOfDiscernment ?? false
  );

  // -------------------------------------------------------------
  // Stage 09: مستحقات وشروط اتفاق الطلاق
  // -------------------------------------------------------------
  const [hasAgreementAttached, setHasAgreementAttached] = useState<boolean>(
    existingWf?.hasAgreementAttached ?? true
  );
  const [wifeAgreedDues, setWifeAgreedDues] = useState<number>(
    existingWf?.dues?.wifeAgreedDues || 30000
  );
  const [housingOrCompDues, setHousingOrCompDues] = useState<number>(
    existingWf?.dues?.housingOrCompDues || 15000
  );
  const [childrenMonthlySupport, setChildrenMonthlySupport] = useState<number>(
    existingWf?.dues?.childrenMonthlySupport || 2000
  );
  const [otherConditions, setOtherConditions] = useState<string>(
    existingWf?.dues?.otherConditions || 'تنازل متبادل عن أثاث بيت الزوجية واستقلال كل طرف بمتعلقاته الشخصية'
  );

  const duesTotal = useMemo(() => {
    return (wifeAgreedDues || 0) + (housingOrCompDues || 0);
  }, [wifeAgreedDues, housingOrCompDues]);

  const duesTotalInWords = useMemo(() => {
    return convertNumberToArabicWords(duesTotal);
  }, [duesTotal]);

  // -------------------------------------------------------------
  // Stage 10: إيداع المستحقات أو تنفيذ الشروط المالية
  // -------------------------------------------------------------
  const [duesExecutionStatus, setDuesExecutionStatus] = useState<boolean>(
    existingWf?.duesExecutionStatus ?? true
  );
  const [executedAmount, setExecutedAmount] = useState<number>(
    existingWf?.executionDetails?.executedAmount || duesTotal
  );
  const [receiptOrDeliveryRef, setReceiptOrDeliveryRef] = useState<string>(
    existingWf?.executionDetails?.receiptOrDeliveryRef || 'REC-8841/2026'
  );
  const [executionDate, setExecutionDate] = useState<string>(
    existingWf?.executionDetails?.executionDate || '2026-03-14'
  );
  const [authorityOrCourt, setAuthorityOrCourt] = useState<string>(
    existingWf?.executionDetails?.authorityOrCourt || 'صندوق المحكمة الابتدائية بطنجة'
  );

  const executedAmountInWords = useMemo(() => {
    return convertNumberToArabicWords(executedAmount);
  }, [executedAmount]);

  // -------------------------------------------------------------
  // Stage 11 & 12: الأبناء وبطاقة كل ابن وحضانته الاتفاقية
  // -------------------------------------------------------------
  const [hasChildren, setHasChildren] = useState<boolean>(
    existingWf?.hasChildren ?? true
  );
  const [totalChildrenCount, setTotalChildrenCount] = useState<number>(
    existingWf?.totalChildrenCount || 1
  );
  const [boysCount, setBoysCount] = useState<number>(
    existingWf?.boysCount || 1
  );
  const [girlsCount, setGirlsCount] = useState<number>(
    existingWf?.girlsCount || 0
  );

  const defaultChild: ConsensualChildData = {
    id: 'child-1',
    fullName: 'يوسف المنصوري',
    firstName: 'يوسف',
    lastName: 'المنصوري',
    gender: 'ذكر',
    birthDate: '2021-05-18',
    custodyAssignment: 'mother',
    visitationRights: 'عطل نهاية الأسبوع من صباح السبت إلى مساء الأحد مع النصف الأول من العطل المدرسية'
  };

  const [childrenList, setChildrenList] = useState<ConsensualChildData[]>(
    existingWf?.childrenList || [defaultChild]
  );

  // -------------------------------------------------------------
  // Stage 13: حالة الحمل
  // -------------------------------------------------------------
  const [pregnancyStatus, setPregnancyStatus] = useState<'yes' | 'no' | 'unknown'>(
    existingWf?.pregnancyStatus || 'no'
  );

  // Validation per stage
  const isCurrentStageValid = useMemo(() => {
    switch (currentStage) {
      case 1:
        return hasJudicialPermission && !!court && !!permissionNumber && !!permissionDate;
      case 2:
        return attendeeType === 'both_spouses' || attendeeType === 'proxies';
      case 3:
        return !!husbandFirstNameAr && !!husbandLastNameAr && !!husbandIdNumber;
      case 4:
        return !!wifeFirstNameAr && !!wifeLastNameAr && !!wifeIdNumber;
      case 5:
        return !!marriageDeedNumber && !!marriageDeedDate;
      case 6:
        return true;
      case 7:
        return true;
      case 8:
        return isFreeWillConsent && !hasCoercionOrDefect && !hasIncompetenceOrLackOfDiscernment;
      case 9:
        return true;
      case 10:
        return !duesExecutionStatus || (executedAmount > 0 && !!receiptOrDeliveryRef);
      case 11:
        if (!hasChildren) return true;
        return totalChildrenCount > 0 && boysCount + girlsCount === totalChildrenCount;
      case 12:
        if (!hasChildren) return true;
        return childrenList.length > 0 && childrenList.every((c) => !!c.firstName && !!c.birthDate);
      case 13:
        return true;
      case 14:
        return true;
      default:
        return true;
    }
  }, [
    currentStage,
    hasJudicialPermission,
    court,
    permissionNumber,
    permissionDate,
    attendeeType,
    husbandFirstNameAr,
    husbandLastNameAr,
    husbandIdNumber,
    wifeFirstNameAr,
    wifeLastNameAr,
    wifeIdNumber,
    marriageDeedNumber,
    marriageDeedDate,
    isFreeWillConsent,
    hasCoercionOrDefect,
    hasIncompetenceOrLackOfDiscernment,
    duesExecutionStatus,
    executedAmount,
    receiptOrDeliveryRef,
    hasChildren,
    totalChildrenCount,
    boysCount,
    girlsCount,
    childrenList
  ]);

  // Stepper navigation
  const handleNextStage = () => {
    if (currentStage < 14) {
      let next = currentStage + 1;
      // Auto-skip children (11,12) and pregnancy (13) when before consummation
      if (isBeforeConsummation && next === 11) next = 14;
      if (isBeforeConsummation && next === 12) next = 14;
      if (isBeforeConsummation && next === 13) next = 14;
      setCurrentStage(Math.min(next, 14));
    }
  };

  const handlePrevStage = () => {
    if (currentStage > 1) {
      let prev = currentStage - 1;
      // Skip back over children/pregnancy when before consummation
      if (isBeforeConsummation && prev === 13) prev = 10;
      if (isBeforeConsummation && prev === 12) prev = 10;
      if (isBeforeConsummation && prev === 11) prev = 10;
      setCurrentStage(Math.max(prev, 1));
    }
  };

  // Children helpers
  const handleAddChild = () => {
    const nextNum = childrenList.length + 1;
    const newChild: ConsensualChildData = {
      id: `child-${Date.now()}`,
      fullName: `ابن/ابنة ${nextNum}`,
      firstName: '',
      lastName: husbandLastNameAr,
      gender: 'ذكر',
      birthDate: '2022-01-01',
      custodyAssignment: 'mother',
      visitationRights: 'عطل نهاية الأسبوع والعطل المدرسية بالاتفاق'
    };
    setChildrenList([...childrenList, newChild]);
    setTotalChildrenCount(childrenList.length + 1);
    setBoysCount(boysCount + 1);
  };

  const handleRemoveChild = (id: string) => {
    const target = childrenList.find((c) => c.id === id);
    if (target) {
      if (target.gender === 'ذكر') setBoysCount(Math.max(0, boysCount - 1));
      else setGirlsCount(Math.max(0, girlsCount - 1));
    }
    const filtered = childrenList.filter((c) => c.id !== id);
    setChildrenList(filtered);
    setTotalChildrenCount(filtered.length);
  };

  const handleUpdateChild = (id: string, updates: Partial<ConsensualChildData>) => {
    setChildrenList(
      childrenList.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Package data for state
  const packageWorkflowData = (): ConsensualDivorceWorkflowData => ({
    hasJudicialPermission,
    court,
    section,
    fileNumber,
    permissionNumber,
    permissionDate,
    receptionDate,
    adoulNotes,
    attendeeType,
    husband: {
      firstNameAr: husbandFirstNameAr,
      lastNameAr: husbandLastNameAr,
      firstNameFr: husbandFirstNameFr,
      lastNameFr: husbandLastNameFr,
      nationality: husbandNationality,
      birthDate: husbandBirthDate,
      birthPlace: husbandBirthPlace,
      fatherName: husbandFatherName,
      motherName: husbandMotherName,
      idType: husbandIdType,
      idNumber: husbandIdNumber,
      idExpiryDate: husbandIdExpiryDate,
      profession: husbandProfession,
      address: husbandAddress,
      city: husbandCity,
      country: husbandCountry
    },
    wife: {
      firstNameAr: wifeFirstNameAr,
      lastNameAr: wifeLastNameAr,
      firstNameFr: wifeFirstNameFr,
      lastNameFr: wifeLastNameFr,
      nationality: wifeNationality,
      birthDate: wifeBirthDate,
      birthPlace: wifeBirthPlace,
      fatherName: wifeFatherName,
      motherName: wifeMotherName,
      idType: wifeIdType,
      idNumber: wifeIdNumber,
      idExpiryDate: wifeIdExpiryDate,
      profession: wifeProfession,
      address: wifeAddress,
      city: wifeCity,
      country: wifeCountry
    },
    marriageRef: {
      deedType: marriageDeedType,
      registryBook: marriageRegistryBook,
      bookNumber: marriageBookNumber,
      pageNumber: marriagePageNumber,
      deedNumber: marriageDeedNumber,
      deedDate: marriageDeedDate,
      issuingAuthority: marriageIssuingAuthority
    },
    divorceCount,
    divorceNature: 'طلاق اتفاقي',
    legalEffect: 'طلاق بائن بينونة صغرى',
    consummationHappened,
    consentChecks: {
      isFreeWillConsent,
      hasCoercionOrDefect,
      hasIncompetenceOrLackOfDiscernment
    },
    hasAgreementAttached,
    dues: {
      wifeAgreedDues,
      housingOrCompDues,
      childrenMonthlySupport,
      otherConditions,
      totalAmount: duesTotal,
      totalAmountInWords: duesTotalInWords
    },
    duesExecutionStatus,
    executionDetails: {
      executedAmount,
      executedAmountInWords,
      receiptOrDeliveryRef,
      executionDate,
      authorityOrCourt
    },
    hasChildren,
    totalChildrenCount,
    boysCount,
    girlsCount,
    childrenList,
    pregnancyStatus,
    completedAt: new Date().toISOString()
  });

  // Final Action: الانتقال إلى تحرير الرسم الاتفاقي
  const handleFinalProceedToDraft = () => {
    const packaged = packageWorkflowData();
    setState((prev) => {
      const nextState: FeesAgentState = {
        ...prev,
        divorceClassification: {
          ...(prev.divorceClassification || {
            primaryType: 'consensual',
            statisticalCode: 'D-01'
          }),
          primaryType: 'consensual',
          statisticalCode: 'D-01',
          divorceCount: divorceCount,
          wifePresence: 'present',
          consensualWorkflow: packaged,
          consensualAgreement: {
            terms: otherConditions ? [otherConditions] : [],
            childrenCustodyAgreed: true,
            housingAgreed: housingOrCompDues > 0,
            courtPermissionNumber: permissionNumber,
            courtPermissionDate: permissionDate,
            courtName: court
          }
        },
        sellers: [
          {
            ...(prev.sellers?.[0] || {}),
            name: `${husbandFirstNameAr} ${husbandLastNameAr}`,
            idNumber: husbandIdNumber,
            address: husbandAddress,
            fatherName: husbandFatherName,
            motherName: husbandMotherName,
            profession: husbandProfession
          } as any
        ],
        buyers: [
          {
            ...(prev.buyers?.[0] || {}),
            name: `${wifeFirstNameAr} ${wifeLastNameAr}`,
            idNumber: wifeIdNumber,
            address: wifeAddress,
            fatherName: wifeFatherName,
            motherName: wifeMotherName,
            profession: wifeProfession
          } as any
        ],
        step: 7 // Proceed directly to Step 7 (Final Review & Smart Drafting)
      };

      const officialDraft = generateConsensualDivorceDraft(nextState);
      return {
        ...nextState,
        draft: officialDraft
      };
    });

    onComplete();
  };

  const stagesList = [
    { num: 1, label: 'الإذن القضائي' },
    { num: 2, label: 'طالب الإشهاد' },
    { num: 3, label: 'بيانات الزوج' },
    { num: 4, label: 'بيانات الزوجة' },
    { num: 5, label: 'مرجع الزواج' },
    { num: 6, label: 'بيانات الطلاق' },
    { num: 7, label: 'واقعة البناء' },
    { num: 8, label: 'صحة التراضي' },
    { num: 9, label: 'شروط ومستحقات الاتفاق' },
    { num: 10, label: 'إيداع المستحقات' },
    { num: 11, label: 'الأبناء' },
    { num: 12, label: 'حضانة الأبناء' },
    { num: 13, label: 'حالة الحمل' },
    { num: 14, label: 'المراجعة الشاملة' }
  ];

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-slate-800 font-sans" dir="rtl">
      {/* 🧭 Moroccan Judicial Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md">
            <Scale className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">🏛️ مسار الطلاق الاتفاقي (المادة 114)</h2>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                رمز الإحصاء: D-01
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              توثيق الطلاق الاتفاقي بالتراضي الحر بين الزوجين بناءً على الإذن القضائي الصادر عن قضاء الأسرة
            </p>
          </div>
        </div>

        {onBackToClassification && (
          <button
            type="button"
            onClick={onBackToClassification}
            className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl font-medium transition-all shadow-sm hover:bg-slate-50"
          >
            ↩️ تغيير مسار ونوع الطلاق
          </button>
        )}
      </div>

      {/* 📍 Stage Stepper Navigator */}
      <div className="mt-6 mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1.5 scrollbar-thin">
          {stagesList.map((s) => {
            const isCompleted = currentStage > s.num;
            const isCurrent = currentStage === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStage(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-blue-900 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{isCompleted ? '✓' : s.num}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🏢 Stages Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[460px] flex flex-col justify-between">
        {/* ========================================================= */}
        {/* المرحلة 01: الإذن القضائي بالإشهاد بالطلاق الاتفاقي */}
        {/* ========================================================= */}
        {currentStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">📜</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 01 — الإذن القضائي بالإشهاد بالطلاق الاتفاقي</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  يرجى إدخال بيانات الإذن القضائي الصادر عن المحكمة بالإشهاد على الطلاق الاتفاقي، قبل الانتقال إلى استكمال باقي بيانات الرسم.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800">
                هل يوجد إذن قضائي بالإشهاد على الطلاق الاتفاقي؟
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="hasJudicialPermission"
                    checked={hasJudicialPermission === true}
                    onChange={() => setHasJudicialPermission(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>🔘 نعم</span>
                </label>

                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="hasJudicialPermission"
                    checked={hasJudicialPermission === false}
                    onChange={() => setHasJudicialPermission(false)}
                    className="w-4 h-4 text-rose-600"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {!hasJudicialPermission ? (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <span>🔴</span>
                    <h4>لا يمكن متابعة هذه المسطرة</h4>
                  </div>
                  <p className="text-xs leading-relaxed">
                    يتعين التحقق من توفر الإذن القضائي المسبق بالإشهاد على الطلاق الاتفاقي (المادة 114 من مدونة الأسرة) قبل الانتقال إلى المرحلة التالية.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة:</label>
                      <input
                        type="text"
                        value={court}
                        onChange={(e) => setCourt(e.target.value)}
                        placeholder="المحكمة الابتدائية بطنجة"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">القسم/الجهة:</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="قسم قضاء الأسرة"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الملف:</label>
                      <input
                        type="text"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                        placeholder="2026/1602/412"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الإذن:</label>
                      <input
                        type="text"
                        value={permissionNumber}
                        onChange={(e) => setPermissionNumber(e.target.value)}
                        placeholder="1428"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإذن:</label>
                      <input
                        type="date"
                        value={permissionDate}
                        onChange={(e) => setPermissionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التوصل بالإذن:</label>
                      <input
                        type="date"
                        value={receptionDate}
                        onChange={(e) => setReceptionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات العدل:</label>
                    <textarea
                      value={adoulNotes}
                      onChange={(e) => setAdoulNotes(e.target.value)}
                      placeholder="أي مراجع أو ملاحظات إضافية بخصوص الإذن القضائي..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none h-20"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>🟢 تم تسجيل بيانات الإذن القضائي بنجاح.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 02: تحديد الحاضرين وطالبي الإشهاد */}
        {/* ========================================================= */}
        {currentStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 02 — تحديد الحاضرين وطالبي الإشهاد</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  يرجى تحديد صفة الأشخاص الحاضرين أمامكم لاستكمال إجراءات الإشهاد على الطلاق الاتفاقي.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800 mb-2">من يحضر أمام العدل؟</label>

              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                attendeeType === 'both_spouses'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="attendeeType"
                  checked={attendeeType === 'both_spouses'}
                  onChange={() => setAttendeeType('both_spouses')}
                  className="mt-1 w-4 h-4 text-emerald-600"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>👥 الزوج والزوجة معاً</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">الخيار الأساسي</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حضور كلا الطرفين شخصياً أمام العدلين للتعبير الصريح عن التراضي على إنهاء العلاقة الزوجية.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                attendeeType === 'proxies'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="attendeeType"
                  checked={attendeeType === 'proxies'}
                  onChange={() => setAttendeeType('proxies')}
                  className="mt-1 w-4 h-4 text-emerald-600"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    👨 الزوج ووكلائه / 👩 الزوجة ووكيلها (بوكالة رسمية صريحة)
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حضور وكيل مفوض بوكالة عدلية خاصة صريحة تنص على الإشهاد على الطلاق الاتفاقي طبقاً للمقتضيات القانونية.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                attendeeType === 'husband_only'
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="attendeeType"
                  checked={attendeeType === 'husband_only'}
                  onChange={() => setAttendeeType('husband_only')}
                  className="mt-1 w-4 h-4 text-amber-600"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">👨 الزوج وحده</div>
                  <p className="text-xs text-slate-500 mt-1">حضور الزوج منفرداً دون حضور الزوجة أو من ينوب عنها بوكالة.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                attendeeType === 'wife_only'
                  ? 'border-amber-400 bg-amber-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="attendeeType"
                  checked={attendeeType === 'wife_only'}
                  onChange={() => setAttendeeType('wife_only')}
                  className="mt-1 w-4 h-4 text-amber-600"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">👩 الزوجة وحدها</div>
                  <p className="text-xs text-slate-500 mt-1">حضور الزوجة منفردة دون حضور الزوج أو من ينوب عنه بوكالة.</p>
                </div>
              </label>
            </div>

            {attendeeType === 'both_spouses' || attendeeType === 'proxies' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                <span className="text-xl">🟢</span>
                <p className="text-xs font-bold leading-relaxed">
                  يمكن متابعة المسطرة: حضور الإرادتين معاً متحقق قانونياً للإشهاد على الطلاق الاتفاقي.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">⚠️ تعذر متابعة المسطرة بهذه الصفة</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    الطلاق الاتفاقي يتعين فيه حضور الإرادتين معاً (الزوج والزوجة أو من يمثلهما بوكالة خاصة صريحة للطلاق الاتفاقي). يرجى التحقق من حضور الطرفين لمتابعة المسطرة.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 03: بيانات الزوج */}
        {/* ========================================================= */}
        {currentStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">👨</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 03 — بيانات الزوج</h3>
                <p className="text-xs text-blue-800 mt-1">الهوية الكاملة ووثيقة التعريف والعنوان والمهنة للزوج طالب الإشهاد.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-xs text-slate-700 border-b pb-1">🪪 الهوية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية:</label>
                  <input
                    type="text"
                    value={husbandFirstNameAr}
                    onChange={(e) => setHusbandFirstNameAr(e.target.value)}
                    placeholder="عمر"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي بالعربية:</label>
                  <input
                    type="text"
                    value={husbandLastNameAr}
                    onChange={(e) => setHusbandLastNameAr(e.target.value)}
                    placeholder="المنصوري"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية (عند الاقتضاء):</label>
                  <input
                    type="text"
                    value={husbandFirstNameFr}
                    onChange={(e) => setHusbandFirstNameFr(e.target.value)}
                    placeholder="Omar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية (عند الاقتضاء):</label>
                  <input
                    type="text"
                    value={husbandLastNameFr}
                    onChange={(e) => setHusbandLastNameFr(e.target.value)}
                    placeholder="El Mansouri"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={husbandNationality}
                    onChange={(e) => setHusbandNationality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={husbandBirthDate}
                    onChange={(e) => setHusbandBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={husbandBirthPlace}
                    onChange={(e) => setHusbandBirthPlace(e.target.value)}
                    placeholder="طنجة"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب واسم الأم:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={husbandFatherName}
                      onChange={(e) => setHusbandFatherName(e.target.value)}
                      placeholder="الأب"
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={husbandMotherName}
                      onChange={(e) => setHusbandMotherName(e.target.value)}
                      placeholder="الأم"
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-xs text-slate-700 border-b pb-1 pt-2">📜 وثيقة الهوية</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الوثيقة:</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setHusbandIdType('cin')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        husbandIdType === 'cin' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      بطاقة وطنية
                    </button>
                    <button
                      type="button"
                      onClick={() => setHusbandIdType('passport')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        husbandIdType === 'passport' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      جواز سفر
                    </button>
                    <button
                      type="button"
                      onClick={() => setHusbandIdType('other')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        husbandIdType === 'other' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      أخرى
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الوثيقة:</label>
                  <input
                    type="text"
                    value={husbandIdNumber}
                    onChange={(e) => setHusbandIdNumber(e.target.value)}
                    placeholder="K489123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصلاحية:</label>
                  <input
                    type="date"
                    value={husbandIdExpiryDate}
                    onChange={(e) => setHusbandIdExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <h4 className="font-bold text-xs text-slate-700 border-b pb-1 pt-2">🏠 البيانات الشخصية</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={husbandProfession}
                    onChange={(e) => setHusbandProfession(e.target.value)}
                    placeholder="مهندس برمجيات"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السكنى:</label>
                  <input
                    type="text"
                    value={husbandAddress}
                    onChange={(e) => setHusbandAddress(e.target.value)}
                    placeholder="حي مالاباطا"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
                  <input
                    type="text"
                    value={husbandCity}
                    onChange={(e) => setHusbandCity(e.target.value)}
                    placeholder="طنجة"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
                  <input
                    type="text"
                    value={husbandCountry}
                    onChange={(e) => setHusbandCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 04: بيانات الزوجة */}
        {/* ========================================================= */}
        {currentStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👩</span>
                <div>
                  <h3 className="font-bold text-blue-950 text-base">المرحلة 04 — بيانات الزوجة</h3>
                  <p className="text-xs text-blue-800 mt-1">الهوية الكاملة ووثيقة التعريف والعنوان للزوجة طالبة الإشهاد.</p>
                </div>
              </div>

              {wifeExisting?.name && (
                <button
                  type="button"
                  onClick={() => {
                    if (wifeExisting.name) {
                      const parts = wifeExisting.name.split(' ');
                      setWifeFirstNameAr(parts[0] || '');
                      setWifeLastNameAr(parts.slice(1).join(' ') || '');
                    }
                    if (wifeExisting.idNumber) setWifeIdNumber(wifeExisting.idNumber);
                    if (wifeExisting.address) setWifeAddress(wifeExisting.address);
                    if (wifeExisting.fatherName) setWifeFatherName(wifeExisting.fatherName);
                    if (wifeExisting.motherName) setWifeMotherName(wifeExisting.motherName);
                    if (wifeExisting.profession) setWifeProfession(wifeExisting.profession);
                  }}
                  className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                >
                  <span>🔄 استدعاء بيانات الزوجة من سجل الزواج</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-xs text-slate-700 border-b pb-1">🪪 الهوية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية:</label>
                  <input
                    type="text"
                    value={wifeFirstNameAr}
                    onChange={(e) => setWifeFirstNameAr(e.target.value)}
                    placeholder="مريم"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي بالعربية:</label>
                  <input
                    type="text"
                    value={wifeLastNameAr}
                    onChange={(e) => setWifeLastNameAr(e.target.value)}
                    placeholder="العلوي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية (عند الاقتضاء):</label>
                  <input
                    type="text"
                    value={wifeFirstNameFr}
                    onChange={(e) => setWifeFirstNameFr(e.target.value)}
                    placeholder="Meryem"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية (عند الاقتضاء):</label>
                  <input
                    type="text"
                    value={wifeLastNameFr}
                    onChange={(e) => setWifeLastNameFr(e.target.value)}
                    placeholder="Alaoui"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={wifeNationality}
                    onChange={(e) => setWifeNationality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={wifeBirthDate}
                    onChange={(e) => setWifeBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={wifeBirthPlace}
                    onChange={(e) => setWifeBirthPlace(e.target.value)}
                    placeholder="تطوان"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب واسم الأم:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wifeFatherName}
                      onChange={(e) => setWifeFatherName(e.target.value)}
                      placeholder="الأب"
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={wifeMotherName}
                      onChange={(e) => setWifeMotherName(e.target.value)}
                      placeholder="الأم"
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-xs text-slate-700 border-b pb-1 pt-2">📜 وثيقة الهوية</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الوثيقة:</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setWifeIdType('cin')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        wifeIdType === 'cin' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      بطاقة وطنية
                    </button>
                    <button
                      type="button"
                      onClick={() => setWifeIdType('passport')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        wifeIdType === 'passport' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      جواز سفر
                    </button>
                    <button
                      type="button"
                      onClick={() => setWifeIdType('other')}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                        wifeIdType === 'other' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      أخرى
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الوثيقة:</label>
                  <input
                    type="text"
                    value={wifeIdNumber}
                    onChange={(e) => setWifeIdNumber(e.target.value)}
                    placeholder="L591823"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصلاحية:</label>
                  <input
                    type="date"
                    value={wifeIdExpiryDate}
                    onChange={(e) => setWifeIdExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <h4 className="font-bold text-xs text-slate-700 border-b pb-1 pt-2">🏠 البيانات الشخصية</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={wifeProfession}
                    onChange={(e) => setWifeProfession(e.target.value)}
                    placeholder="أستاذة التعليم الثانوي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السكنى:</label>
                  <input
                    type="text"
                    value={wifeAddress}
                    onChange={(e) => setWifeAddress(e.target.value)}
                    placeholder="شارع مولاي إسماعيل"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
                  <input
                    type="text"
                    value={wifeCity}
                    onChange={(e) => setWifeCity(e.target.value)}
                    placeholder="طنجة"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
                  <input
                    type="text"
                    value={wifeCountry}
                    onChange={(e) => setWifeCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 05: مرجع رسم الزواج */}
        {/* ========================================================= */}
        {currentStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">💍</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 05 — مرجع رسم الزواج</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  يرجى إدخال أو مراجعة البيانات المرجعية لرسم الزواج المراد حله بالاتفاق.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الرسم:</label>
                  <input
                    type="text"
                    value={marriageDeedType}
                    onChange={(e) => setMarriageDeedType(e.target.value)}
                    placeholder="رسم زواج شرعي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مضمن بدفتر:</label>
                  <input
                    type="text"
                    value={marriageRegistryBook}
                    onChange={(e) => setMarriageRegistryBook(e.target.value)}
                    placeholder="كناش الأنكحة"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الدفتر:</label>
                  <input
                    type="text"
                    value={marriageBookNumber}
                    onChange={(e) => setMarriageBookNumber(e.target.value)}
                    placeholder="18"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صفحة:</label>
                  <input
                    type="text"
                    value={marriagePageNumber}
                    onChange={(e) => setMarriagePageNumber(e.target.value)}
                    placeholder="142"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد:</label>
                  <input
                    type="text"
                    value={marriageDeedNumber}
                    onChange={(e) => setMarriageDeedNumber(e.target.value)}
                    placeholder="854"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بتاريخ:</label>
                  <input
                    type="date"
                    value={marriageDeedDate}
                    onChange={(e) => setMarriageDeedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الجهة التي صدر عنها الرسم:</label>
                <input
                  type="text"
                  value={marriageIssuingAuthority}
                  onChange={(e) => setMarriageIssuingAuthority(e.target.value)}
                  placeholder="قسم قضاء الأسرة بالمحكمة الابتدائية بطنجة"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* 💍 بطاقة ملخص مرجع الزواج */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <span>💍</span>
                  <h4>بطاقة ملخص مرجع الزواج</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-500">النوع: </span><strong>{marriageDeedType}</strong></div>
                  <div><span className="text-slate-500">الدفتر: </span><strong>{marriageRegistryBook} (رقم {marriageBookNumber})</strong></div>
                  <div><span className="text-slate-500">الصفحة والعدد: </span><strong>ص {marriagePageNumber} / ع {marriageDeedNumber}</strong></div>
                  <div><span className="text-slate-500">التاريخ: </span><strong>{marriageDeedDate}</strong></div>
                  <div className="col-span-2"><span className="text-slate-500">الجهة المصدرة: </span><strong>{marriageIssuingAuthority}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 06: بيانات الطلاق الاتفاقي وطبيعته القانونية */}
        {/* ========================================================= */}
        {currentStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 06 — بيانات الطلاق الاتفاقي وطبيعته القانونية</h3>
                <p className="text-xs text-blue-800 mt-1">يرجى تحديد عدد الطلقات الواقعة بين الزوجين إلى غاية هذا الرسم.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800">عدد الطلاق:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                  divorceCount === 'first' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="divorceCount"
                    checked={divorceCount === 'first'}
                    onChange={() => setDivorceCount('first')}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-blue-950">🔵 الطلقة الأولى</span>
                    <p className="text-xs text-slate-500 mt-1">الطلقة الأولى في عصمة الزوجية بالاتفاق والتراضي.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                  divorceCount === 'second' ? 'border-amber-600 bg-amber-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="divorceCount"
                    checked={divorceCount === 'second'}
                    onChange={() => setDivorceCount('second')}
                    className="mt-1 w-4 h-4 text-amber-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-amber-950">🟠 الطلقة الثانية</span>
                    <p className="text-xs text-slate-500 mt-1">سبقتها طلقة أولى سابقة بالاتفاق أو غيره.</p>
                  </div>
                </label>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>ملاحظة: حذفت "الطلقة الثالثة" لعدم إمكانية إيقاعها اتفاقاً، إذ تعتبر طلاقاً بائناً بينونة كبرى بموجب القانون.</span>
              </div>

              {/* طبيعة الطلاق وحكمه */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-3">
                <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                  <span>⚖️ طبيعة الطلاق وحكمه</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">نوع المسطرة: </span>
                    <strong className="text-emerald-800 text-sm">🟢 طلاق اتفاقي</strong>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">الأثر القانوني: </span>
                    <strong className="text-emerald-800 text-sm">📌 طلاق بائن بينونة صغرى (مادة 123 من مدونة الأسرة)</strong>
                  </div>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed pt-1">
                  💡 تذكير قانوني للعدل: الطلاق الاتفاقي يعتبر بائناً بينونة صغرى، وتنحل به الرابطة الزوجية في الحين، ولا تحل له إلا بعقد ومهر جديدين وموافقتها الصريحة.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 07: التحقق من واقعة البناء */}
        {/* ========================================================= */}
        {currentStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">💍</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 07 — التحقق من واقعة البناء</h3>
                <p className="text-xs text-blue-800 mt-1">تحديد ما إذا كان الطلاق الاتفاقي قد وقع قبل البناء الشرعي أو بعده لترتيب آثاره القانونية.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800">هل حصل البناء بالزوجة؟</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="consummationHappened"
                    checked={consummationHappened === true}
                    onChange={() => setConsummationHappened(true)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>🔘 نعم (بعد البناء)</span>
                </label>

                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="consummationHappened"
                    checked={consummationHappened === false}
                    onChange={() => setConsummationHappened(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>🔘 لا (قبل البناء)</span>
                </label>
              </div>

              {!consummationHappened && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
                    <span>ℹ️</span>
                    <h4>إشعار قانوني</h4>
                  </div>
                  <p className="text-xs leading-relaxed">
                    الطلاق الاتفاقي قبل البناء هو طلاق بائن بينونة صغرى، ولا تجب فيه العدة على الزوجة وفق الأحكام الشرعية والقانونية.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 08: أهلية الطرفين وحرية الإرادة والتراضي */}
        {/* ========================================================= */}
        {currentStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 08 — أهلية الطرفين وحرية الإرادة والتراضي</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  التحقق من صحة التراضي وحرية الإرادة وخلو الاتفاق من أي إكراه أو عيب من عيوب الرضا.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  هل صدر الطلاق بتراضي الزوجين الإرادي؟
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="isFreeWillConsent"
                      checked={isFreeWillConsent === true}
                      onChange={() => setIsFreeWillConsent(true)}
                    />
                    <span>🔘 نعم</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="isFreeWillConsent"
                      checked={isFreeWillConsent === false}
                      onChange={() => setIsFreeWillConsent(false)}
                    />
                    <span>🔘 لا</span>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  هل يوجد شائبة إكراه أو عيب من عيوب الرضا لدى أي من الطرفين؟
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="hasCoercionOrDefect"
                      checked={hasCoercionOrDefect === false}
                      onChange={() => setHasCoercionOrDefect(false)}
                    />
                    <span>🔘 لا</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="hasCoercionOrDefect"
                      checked={hasCoercionOrDefect === true}
                      onChange={() => setHasCoercionOrDefect(true)}
                    />
                    <span>🔘 نعم</span>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  هل كان أحد الطرفين فاقداً للأهلية أو التمييز وقت التوقيع على الاتفاق؟
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="hasIncompetenceOrLackOfDiscernment"
                      checked={hasIncompetenceOrLackOfDiscernment === false}
                      onChange={() => setHasIncompetenceOrLackOfDiscernment(false)}
                    />
                    <span>🔘 لا</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="hasIncompetenceOrLackOfDiscernment"
                      checked={hasIncompetenceOrLackOfDiscernment === true}
                      onChange={() => setHasIncompetenceOrLackOfDiscernment(true)}
                    />
                    <span>🔘 نعم</span>
                  </label>
                </div>
              </div>

              {(!isFreeWillConsent || hasCoercionOrDefect || hasIncompetenceOrLackOfDiscernment) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">⚠️ تنبيه: سلامة الإرادة والتراضي</h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      تتضمن البيانات المدخلة ما يشير إلى خلل في شرط التراضي الحر بين الطرفين. يرجى التثبت والتحقق القانوني قبل استكمال الإشهاد.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 09: مستحقات وشروط اتفاق الطلاق */}
        {/* ========================================================= */}
        {currentStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 09 — مستحقات وشروط اتفاق الطلاق</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  تفاصيل المستحقات والالتزامات المالية والشروط المتفق عليها بين الطرفين والمأذون بها قضائياً.
                </p>
              </div>
            </div>

            {/* 🔔 Before-consummation adaptive dues notice */}
            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3">
                <p className="text-xs font-extrabold text-amber-900 flex items-center gap-2">
                  ⚠️ تكييف آلي — الطلاق قبل الدخول (المادة 71 من مدونة الأسرة)
                </p>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">موقف الصداق / المهر:</label>
                    <div className="flex flex-col gap-2">
                      {(['تم قبضه كاملاً', 'تجب نصف الفريضة (نصف الصداق)', 'لم يحدد صداق (مهر المثل/المتعة)'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" name="mahrStatus" className="w-4 h-4 accent-amber-600" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 bg-amber-100 rounded-lg text-xs text-amber-900 font-semibold">
                    🔒 نفقة العدة: <strong>غير مستحقة</strong> — لا عدة على المطلقة قبل الدخول (المادة 135 من مدونة الأسرة).
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">المتعة أو التعويض الاتفاقي / القضائي (درهم):</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-sm focus:border-amber-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-800">هل تم إرفاق شروط اتفاق الطلاق المصادق عليه والمأذون به من المحكمة؟</span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="hasAgreementAttached"
                      checked={hasAgreementAttached === true}
                      onChange={() => setHasAgreementAttached(true)}
                    />
                    <span>🔘 نعم</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="hasAgreementAttached"
                      checked={hasAgreementAttached === false}
                      onChange={() => setHasAgreementAttached(false)}
                    />
                    <span>🔘 لا</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مستحقات الزوجة المتفق عليها (إن وجدت):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={wifeAgreedDues || ''}
                      onChange={(e) => setWifeAgreedDues(Number(e.target.value))}
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">درهم</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واجبات السكنى أو التعويض المالي المتفق عليه:</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={housingOrCompDues || ''}
                      onChange={(e) => setHousingOrCompDues(Number(e.target.value))}
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">درهم</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مستحقات الأبناء والنفقة الاتفاقية الشهرية:</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={childrenMonthlySupport || ''}
                      onChange={(e) => setChildrenMonthlySupport(Number(e.target.value))}
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">درهم/ش</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شروط أخرى (مثل التنازلات أو مؤخر الصداق):</label>
                <textarea
                  value={otherConditions}
                  onChange={(e) => setOtherConditions(e.target.value)}
                  placeholder="بيان التنازلات، أثاث بيت الزوجية، مؤخر الصداق، أو أي التزامات أخرى..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-none h-20"
                />
              </div>

              {/* إجمالي المبالغ */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-amber-950">الإجمالي المالي الموثق بالأرقام:</span>
                  <span className="font-extrabold text-base text-amber-900">{duesTotal.toLocaleString('ar-MA')} درهم</span>
                </div>
                <div className="text-xs text-amber-800">
                  <span>الإجمالي بالحروف (يولد تلقائياً): </span>
                  <strong>{duesTotalInWords}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 10: إيداع المستحقات أو تنفيذ الشروط المالية */}
        {/* ========================================================= */}
        {currentStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">🏦</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 10 — وضع المستحقات والتنفيذ</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  هل أودع الزوج المستحقات المحددة بكتابة ضبط المحكمة أو سلمت للزوجة وفق الإذن القضائي؟
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="duesExecutionStatus"
                    checked={duesExecutionStatus === true}
                    onChange={() => setDuesExecutionStatus(true)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>🔘 نعم</span>
                </label>

                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="duesExecutionStatus"
                    checked={duesExecutionStatus === false}
                    onChange={() => setDuesExecutionStatus(false)}
                    className="w-4 h-4 text-slate-600"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {duesExecutionStatus && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المودع/المسلم بالأرقام:</label>
                      <input
                        type="number"
                        value={executedAmount || ''}
                        onChange={(e) => setExecutedAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ بالحروف (يولد تلقائياً):</label>
                      <input
                        type="text"
                        readOnly
                        value={executedAmountInWords}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم وصل الإيداع / الإشهاد بالاستلام:</label>
                      <input
                        type="text"
                        value={receiptOrDeliveryRef}
                        onChange={(e) => setReceiptOrDeliveryRef(e.target.value)}
                        placeholder="REC-8841/2026"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإيداع/الاستلام:</label>
                      <input
                        type="date"
                        value={executionDate}
                        onChange={(e) => setExecutionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة / الجهة:</label>
                      <input
                        type="text"
                        value={authorityOrCourt}
                        onChange={(e) => setAuthorityOrCourt(e.target.value)}
                        placeholder="صندوق المحكمة الابتدائية بطنجة"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>🟢 تم التأكد من تسجيل بيانات الإيداع/التنفيذ بنجاح.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 11: الأبناء */}
        {/* ========================================================= */}
        {currentStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 11 — أبناء الزوجين</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  تحديد وجود أبناء من الرابطة الزوجية وتعداد الذكور والإناث للمطابقة الدقيقة.
                </p>
              </div>
            </div>

            {/* Auto-skip notice when before consummation */}
            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
                <span className="text-blue-600 text-lg flex-shrink-0">ℹ️</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  <strong>تنبيه النظام:</strong> تم إلغاء مرحلة بيانات الأبناء والحضانة تلقائياً لعدم وجود دخلة شرعية. لا تنشأ روابط الأبناء إلا بعد البناء.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800">هل للزوجين أبناء؟</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="hasChildren"
                    checked={hasChildren === true}
                    onChange={() => setHasChildren(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>🔘 نعم</span>
                </label>

                <label className="flex items-center gap-2 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all font-bold text-sm">
                  <input
                    type="radio"
                    name="hasChildren"
                    checked={hasChildren === false}
                    onChange={() => setHasChildren(false)}
                    className="w-4 h-4 text-slate-600"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {hasChildren && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي عدد الأبناء:</label>
                      <input
                        type="number"
                        min="1"
                        value={totalChildrenCount || ''}
                        onChange={(e) => setTotalChildrenCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ذكور 👦:</label>
                      <input
                        type="number"
                        min="0"
                        value={boysCount}
                        onChange={(e) => setBoysCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إناث 👧:</label>
                      <input
                        type="number"
                        min="0"
                        value={girlsCount}
                        onChange={(e) => setGirlsCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-center"
                      />
                    </div>
                  </div>

                  {boysCount + girlsCount !== totalChildrenCount && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>تنبيه: مجموع الذكور والإناث ({boysCount + girlsCount}) لا يطابق الإجمالي المحدد ({totalChildrenCount}). يتعين تصحيح العدد للمتابعة.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 12: بطاقة كل ابن وحضانته الاتفاقية */}
        {/* ========================================================= */}
        {currentStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👦👧</span>
                <div>
                  <h3 className="font-bold text-blue-950 text-base">المرحلة 12 — بطاقة كل ابن وحضانته الاتفاقية</h3>
                  <p className="text-xs text-blue-800 mt-1">
                    ينشئ النظام تلقائياً بطاقة لكل ابن لتدوين بياناته وإسناد الحضانة الاتفاقية وحق الزيارة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddChild}
                className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ابن</span>
              </button>
            </div>

            <div className="space-y-4">
              {childrenList.map((child, idx) => (
                <div key={child.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs text-slate-800">
                      {child.gender === 'ذكر' ? '👦' : '👧'} الابن رقم 0{idx + 1}
                    </span>
                    {childrenList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChild(child.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 text-xs"
                        title="حذف هذا الابن"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي:</label>
                      <input
                        type="text"
                        value={child.firstName}
                        onChange={(e) => handleUpdateChild(child.id, { firstName: e.target.value })}
                        placeholder="يوسف"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي:</label>
                      <input
                        type="text"
                        value={child.lastName}
                        onChange={(e) => handleUpdateChild(child.id, { lastName: e.target.value })}
                        placeholder="المنصوري"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الجنس:</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateChild(child.id, { gender: 'ذكر' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            child.gender === 'ذكر' ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          ذكر
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateChild(child.id, { gender: 'أنثى' })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            child.gender === 'أنثى' ? 'bg-rose-700 text-white border-rose-700' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          أنثى
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد (العمر: {calculateAge(child.birthDate)} سنة):</label>
                      <input
                        type="date"
                        value={child.birthDate}
                        onChange={(e) => handleUpdateChild(child.id, { birthDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إسناد الحضانة الاتفاقية:</label>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateChild(child.id, { custodyAssignment: 'mother' })}
                          className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                            child.custodyAssignment === 'mother' ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          للأم
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateChild(child.id, { custodyAssignment: 'father' })}
                          className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                            child.custodyAssignment === 'father' ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          للزوج
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateChild(child.id, { custodyAssignment: 'other_agreed' })}
                          className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                            child.custodyAssignment === 'other_agreed' ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          ترتيب آخر متفق عليه
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">حق زيارة وصلة الرحم الاتفاقي:</label>
                      <input
                        type="text"
                        value={child.visitationRights}
                        onChange={(e) => handleUpdateChild(child.id, { visitationRights: e.target.value })}
                        placeholder="عطل نهاية الأسبوع والعطل المدرسية بالاتفاق"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 13: حالة الحمل */}
        {/* ========================================================= */}
        {currentStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">🤰</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 13 — حالة الحمل</h3>
                <p className="text-xs text-blue-800 mt-1">التحقق من حالة الحمل وقت الإشهاد لترتيب آثاره على نفقة الحمل ومشتملاته.</p>
              </div>
            </div>

            {/* Auto-skip notice when before consummation */}
            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
                <span className="text-blue-600 text-lg flex-shrink-0">ℹ️</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  <strong>تنبيه النظام:</strong> تم تجاوز مرحلة التحقق من الحمل تلقائياً — لا عدة على المطلقة قبل الدخول، ومن ثم لا حمل يُعتدّ به (المادة 135 من مدونة الأسرة).
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-800">هل الزوجة حامل وقت الإشهاد؟</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className={`flex items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  pregnancyStatus === 'yes' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="pregnancyStatus"
                    checked={pregnancyStatus === 'yes'}
                    onChange={() => setPregnancyStatus('yes')}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="font-bold text-sm">🔘 نعم</span>
                </label>

                <label className={`flex items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  pregnancyStatus === 'no' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="pregnancyStatus"
                    checked={pregnancyStatus === 'no'}
                    onChange={() => setPregnancyStatus('no')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span className="font-bold text-sm">🔘 لا (براءة الرحم)</span>
                </label>

                <label className={`flex items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  pregnancyStatus === 'unknown' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="pregnancyStatus"
                    checked={pregnancyStatus === 'unknown'}
                    onChange={() => setPregnancyStatus('unknown')}
                    className="w-4 h-4 text-slate-600"
                  />
                  <span className="font-bold text-sm">🔘 غير معلوم</span>
                </label>
              </div>

              {pregnancyStatus === 'yes' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <span>🟠</span>
                    <h4>تنبيه: أثر الحمل على الطلاق الاتفاقي</h4>
                  </div>
                  <p className="text-xs leading-relaxed">
                    تم تسجيل حالة الحمل. يرجى التأكد من تضمين نفقة الحمل ومشتملاته ورعاية المولد ضمن اتفاق الطرفين المأذون به.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* المرحلة 14: المراجعة الشاملة والتأكيد */}
        {/* ========================================================= */}
        {currentStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-2xl">🔎</span>
              <div>
                <h3 className="font-bold text-blue-950 text-base">المرحلة 14 — المراجعة الشاملة والتأكيد</h3>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  مراجعة كافة معطيات الطلاق الاتفاقي المدخلة قبل الانتقال المباشر لإنشاء وتحرير الرسم العدلي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>📜 الإذن القضائي بالطلاق الاتفاقي:</span>
                <span className="font-bold text-emerald-700">🟢 متوفر ومتحقق (رقم {permissionNumber})</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👥 طالبي الإشهاد وتوفر التراضي:</span>
                <span className="font-bold text-emerald-700">🟢 الزوج والزوجة معاً (أو الوكلاء)</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👨 بيانات الزوج:</span>
                <span className="font-bold text-emerald-700">🟢 مكتملة ({husbandFirstNameAr} {husbandLastNameAr})</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👩 بيانات الزوجة:</span>
                <span className="font-bold text-emerald-700">🟢 مكتملة ({wifeFirstNameAr} {wifeLastNameAr})</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>💍 مرجع عقد الزواج:</span>
                <span className="font-bold text-emerald-700">🟢 مكتمل (رقم {marriageDeedNumber})</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>⚖️ طبيعة الطلاق بائن:</span>
                <span className="font-bold text-emerald-700">🟢 ({divorceCount === 'second' ? 'الطلقة الثانية' : 'الطلقة الأولى'} اتفاقاً)</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>💰 شروط الاتفاق والمستحقات:</span>
                <span className="font-bold text-emerald-700">🟢 تم تسجيلها ({duesTotal.toLocaleString('ar-MA')} درهم)</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>🏦 الإيداع والتنفيذ:</span>
                <span className="font-bold text-emerald-700">🟢 تم التحقق منه</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👶 الأبناء والحضانة الاتفاقية:</span>
                <span className="font-bold text-emerald-700">🟢 {hasChildren ? `مكتملة (${childrenList.length} أولاد)` : 'لا يوجد أولاد'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>🤰 حالة الحمل:</span>
                <span className="font-bold text-emerald-700">🟢 {pregnancyStatus === 'yes' ? 'حامل (تم التدوين)' : 'لا يوجد'}</span>
              </div>
            </div>

            {/* Final Action Box */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div>
                <h4 className="font-bold text-emerald-950 text-base">✅ اكتملت مرحلة جمع والتحقق الأولي من معطيات الطلاق الاتفاقي</h4>
                <p className="text-xs text-emerald-900 mt-1 max-w-xl leading-relaxed">
                  يمكنكم الآن الانتقال المباشر لإنشاء وتحرير رسم الطلاق الاتفاقي في المرحلة 07 بالصياغة الذكية والنماذج القضائية الرسمية المعتمدة.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalProceedToDraft}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-center justify-center hover:scale-105 active:scale-95"
              >
                <span>✍️ الانتقال إلى تحرير الرسم الاتفاقي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 🎛️ Navigation Actions (Back / Next) */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handlePrevStage}
            disabled={currentStage === 1}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentStage === 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق: {currentStage > 1 ? stagesList[currentStage - 2]?.label : ''}</span>
          </button>

          {currentStage < 14 ? (
            <button
              type="button"
              onClick={handleNextStage}
              disabled={!isCurrentStageValid}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isCurrentStageValid
                  ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-md hover:scale-105 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>التالي: {stagesList[currentStage]?.label}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalProceedToDraft}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <span>✍️ اعتماد والانتقال إلى تحرير الرسم</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
