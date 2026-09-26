import React, { useState, useMemo } from 'react';
import type {
  FeesAgentState,
  DiscordDivorceWorkflowData,
  DiscordChildData
} from '../../../../types/feesAgentTypes';
import { generateDiscordDivorceDraft } from '../../../../utils/divorceTemplateEngine';
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

interface DiscordDivorceWorkflowProps {
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

export const DiscordDivorceWorkflow: React.FC<DiscordDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  const existingWf = state.divorceClassification?.discordWorkflow;
  const existingDiscordDetails = state.divorceClassification?.discordDetails;
  const husbandExisting = state.sellers?.[0];
  const wifeExisting = state.buyers?.[0];

  const [currentStage, setCurrentStage] = useState<number>(1);

  // -------------------------------------------------------------
  // Stage 01: الحكم القضائي النهائي بتطليق الشقاق
  // -------------------------------------------------------------
  const [hasJudgment, setHasJudgment] = useState<boolean>(
    existingWf?.hasJudgment ?? true
  );
  const [courtCity, setCourtCity] = useState<string>(
    existingWf?.courtCity || existingDiscordDetails?.courtName || state.meta?.court || 'طنجة'
  );
  const [familySectionCity, setFamilySectionCity] = useState<string>(
    existingWf?.familySectionCity || existingDiscordDetails?.courtName || state.meta?.court || 'طنجة'
  );
  const [caseNumber, setCaseNumber] = useState<string>(
    existingWf?.caseNumber || existingDiscordDetails?.caseFileNumber || state.meta?.fileNumber || '2026/1602/412'
  );
  const [judgmentNumber, setJudgmentNumber] = useState<string>(
    existingWf?.judgmentNumber || existingDiscordDetails?.judgmentNumber || state.meta?.authorizationNumber || '1428'
  );
  const [judgmentDate, setJudgmentDate] = useState<string>(
    existingWf?.judgmentDate || existingDiscordDetails?.judgmentDate || state.meta?.authorizationDate || '2026-03-12'
  );
  const [notificationDate, setNotificationDate] = useState<string>(
    existingWf?.notificationDate || '2026-03-18'
  );
  const [adoulNotes, setAdoulNotes] = useState<string>(
    existingWf?.adoulNotes || ''
  );

  // -------------------------------------------------------------
  // Stage 02: تحديد رافع الدعوى والحاضر أمام العدل
  // -------------------------------------------------------------
  const [applicantInJudgment, setApplicantInJudgment] = useState<'husband' | 'wife' | 'both'>(
    existingWf?.applicantInJudgment || 'wife'
  );
  const [attendeeForCertification, setAttendeeForCertification] = useState<'husband' | 'wife' | 'both'>(
    existingWf?.attendeeForCertification || 'wife'
  );

  // -------------------------------------------------------------
  // Stage 03: بيانات الزوج
  // -------------------------------------------------------------
  const [husbandFirstNameAr, setHusbandFirstNameAr] = useState<string>(
    existingWf?.husband?.firstNameAr || husbandExisting?.name?.split(' ')[0] || 'محمد'
  );
  const [husbandLastNameAr, setHusbandLastNameAr] = useState<string>(
    existingWf?.husband?.lastNameAr || husbandExisting?.name?.split(' ').slice(1).join(' ') || 'العلوي'
  );
  const [husbandFirstNameFr, setHusbandFirstNameFr] = useState<string>(
    existingWf?.husband?.firstNameFr || 'Mohamed'
  );
  const [husbandLastNameFr, setHusbandLastNameFr] = useState<string>(
    existingWf?.husband?.lastNameFr || 'Alaoui'
  );
  const [husbandNationality, setHusbandNationality] = useState<string>(
    existingWf?.husband?.nationality || husbandExisting?.nationality || 'مغربية'
  );
  const [husbandBirthDate, setHusbandBirthDate] = useState<string>(
    existingWf?.husband?.birthDate || husbandExisting?.dateOfBirth || '1985-05-15'
  );
  const [husbandBirthPlace, setHusbandBirthPlace] = useState<string>(
    existingWf?.husband?.birthPlace || husbandExisting?.placeOfBirth || 'طنجة'
  );
  const [husbandFatherName, setHusbandFatherName] = useState<string>(
    existingWf?.husband?.fatherName || husbandExisting?.fatherName || 'عبد الله'
  );
  const [husbandMotherName, setHusbandMotherName] = useState<string>(
    existingWf?.husband?.motherName || husbandExisting?.motherName || 'فاطمة الزهراء'
  );
  const [husbandIdType, setHusbandIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWf?.husband?.idType || 'cin'
  );
  const [husbandIdNumber, setHusbandIdNumber] = useState<string>(
    existingWf?.husband?.idNumber || husbandExisting?.idNumber || 'KB123456'
  );
  const [husbandIdExpiryDate, setHusbandIdExpiryDate] = useState<string>(
    existingWf?.husband?.idExpiryDate || husbandExisting?.idExpiryDate || '2030-01-01'
  );
  const [husbandProfession, setHusbandProfession] = useState<string>(
    existingWf?.husband?.profession || husbandExisting?.profession || 'تاجر'
  );
  const [husbandAddress, setHusbandAddress] = useState<string>(
    existingWf?.husband?.address || husbandExisting?.address || 'شارع محمد الخامس، مجمع النخيل، عمارة ب، رقم 12'
  );
  const [husbandCity, setHusbandCity] = useState<string>(
    existingWf?.husband?.city || 'طنجة'
  );
  const [husbandCountry, setHusbandCountry] = useState<string>(
    existingWf?.husband?.country || 'المغرب'
  );

  // -------------------------------------------------------------
  // Stage 04: بيانات الزوجة
  // -------------------------------------------------------------
  const [wifeFirstNameAr, setWifeFirstNameAr] = useState<string>(
    existingWf?.wife?.firstNameAr || wifeExisting?.name?.split(' ')[0] || 'أمينة'
  );
  const [wifeLastNameAr, setWifeLastNameAr] = useState<string>(
    existingWf?.wife?.lastNameAr || wifeExisting?.name?.split(' ').slice(1).join(' ') || 'الإدريسي'
  );
  const [wifeFirstNameFr, setWifeFirstNameFr] = useState<string>(
    existingWf?.wife?.firstNameFr || 'Amina'
  );
  const [wifeLastNameFr, setWifeLastNameFr] = useState<string>(
    existingWf?.wife?.lastNameFr || 'Idrissi'
  );
  const [wifeNationality, setWifeNationality] = useState<string>(
    existingWf?.wife?.nationality || wifeExisting?.nationality || 'مغربية'
  );
  const [wifeBirthDate, setWifeBirthDate] = useState<string>(
    existingWf?.wife?.birthDate || wifeExisting?.dateOfBirth || '1990-08-20'
  );
  const [wifeBirthPlace, setWifeBirthPlace] = useState<string>(
    existingWf?.wife?.birthPlace || wifeExisting?.placeOfBirth || 'فاس'
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    existingWf?.wife?.fatherName || wifeExisting?.fatherName || 'إدريس'
  );
  const [wifeMotherName, setWifeMotherName] = useState<string>(
    existingWf?.wife?.motherName || wifeExisting?.motherName || 'خديجة'
  );
  const [wifeIdType, setWifeIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWf?.wife?.idType || 'cin'
  );
  const [wifeIdNumber, setWifeIdNumber] = useState<string>(
    existingWf?.wife?.idNumber || wifeExisting?.idNumber || 'CD987654'
  );
  const [wifeIdExpiryDate, setWifeIdExpiryDate] = useState<string>(
    existingWf?.wife?.idExpiryDate || wifeExisting?.idExpiryDate || '2031-06-15'
  );
  const [wifeProfession, setWifeProfession] = useState<string>(
    existingWf?.wife?.profession || wifeExisting?.profession || 'أستاذة'
  );
  const [wifeAddress, setWifeAddress] = useState<string>(
    existingWf?.wife?.address || wifeExisting?.address || 'حي مالاباطا، شارع مولاي رشيد، إقامة اليمامة، رقم 4'
  );
  const [wifeCity, setWifeCity] = useState<string>(
    existingWf?.wife?.city || 'طنجة'
  );
  const [wifeCountry, setWifeCountry] = useState<string>(
    existingWf?.wife?.country || 'المغرب'
  );

  // -------------------------------------------------------------
  // Stage 05: مرجع رسم الزواج المراد إنهاؤه
  // -------------------------------------------------------------
  const [marriageDeedType, setMarriageDeedType] = useState<string>(
    existingWf?.marriageRef?.deedType || 'رسم زواج شرعي'
  );
  const [marriageRegistryBook, setMarriageRegistryBook] = useState<string>(
    existingWf?.marriageRef?.registryBook || 'سجل أنكحة'
  );
  const [marriageBookNumber, setMarriageBookNumber] = useState<string>(
    existingWf?.marriageRef?.bookNumber || '12-B'
  );
  const [marriagePageNumber, setMarriagePageNumber] = useState<string>(
    existingWf?.marriageRef?.pageNumber || '88'
  );
  const [marriageDeedNumber, setMarriageDeedNumber] = useState<string>(
    existingWf?.marriageRef?.deedNumber || '245'
  );
  const [marriageDeedDate, setMarriageDeedDate] = useState<string>(
    existingWf?.marriageRef?.deedDate || '2015-04-10'
  );
  const [marriageIssuingAuthority, setMarriageIssuingAuthority] = useState<string>(
    existingWf?.marriageRef?.issuingAuthority || 'قسم قضاء الأسرة بطنجة'
  );

  // -------------------------------------------------------------
  // Stage 06: بيانات تطليق الشقاق وطبيعته القانونية
  // -------------------------------------------------------------
  const [divorceCount, setDivorceCount] = useState<'first' | 'second'>(
    (existingWf?.divorceCount === 'second' ? 'second' : 'first')
  );

  // -------------------------------------------------------------
  // Stage 07: التحقق من واقعة البناء
  // -------------------------------------------------------------
  const [consummationHappened, setConsummationHappened] = useState<boolean>(
    existingWf?.consummationHappened ?? true
  );

  // -------------------------------------------------------------
  // Stage 08: محاولات الصلح ومسؤولية الشقاق
  // -------------------------------------------------------------
  const [reconciliationExhausted, setReconciliationExhausted] = useState<boolean>(
    existingWf?.reconciliationExhausted ?? true
  );
  const [responsibleParty, setResponsibleParty] = useState<'husband' | 'wife' | 'shared_or_unspecified'>(
    existingWf?.responsibleParty || 'husband'
  );

  // -------------------------------------------------------------
  // Stage 09: المستحقات المالية والتعويض عن الضرر
  // -------------------------------------------------------------
  const [wifeDues, setWifeDues] = useState<number>(
    existingWf?.dues?.wifeDues ?? 25000
  );
  const [damageCompensation, setDamageCompensation] = useState<number>(
    existingWf?.dues?.damageCompensation ?? 15000
  );
  const [childSupport, setChildSupport] = useState<number>(
    existingWf?.dues?.childSupport ?? 2000
  );

  const duesTotal = useMemo(() => {
    return (Number(wifeDues) || 0) + (Number(damageCompensation) || 0) + (Number(childSupport) || 0);
  }, [wifeDues, damageCompensation, childSupport]);

  const duesTotalInWords = useMemo(() => {
    return convertNumberToArabicWords(duesTotal);
  }, [duesTotal]);

  // -------------------------------------------------------------
  // Stage 10: إيداع المستحقات أو التنفيذ القضائي
  // -------------------------------------------------------------
  const [duesExecutionStatus, setDuesExecutionStatus] = useState<boolean>(
    existingWf?.duesExecutionStatus ?? true
  );
  const [depositAmount, setDepositAmount] = useState<number>(
    existingWf?.executionDetails?.depositAmount ?? duesTotal
  );
  const depositAmountInWords = useMemo(() => {
    return convertNumberToArabicWords(depositAmount);
  }, [depositAmount]);
  const [depositReceiptNumber, setDepositReceiptNumber] = useState<string>(
    existingWf?.executionDetails?.receiptNumber || 'DEP-2026/894'
  );
  const [depositDate, setDepositDate] = useState<string>(
    existingWf?.executionDetails?.depositDate || '2026-03-15'
  );
  const [depositCourt, setDepositCourt] = useState<string>(
    existingWf?.executionDetails?.courtName || 'المحكمة الابتدائية بطنجة'
  );

  // -------------------------------------------------------------
  // Stage 11 & 12: الأبناء وبطاقاتهم
  // -------------------------------------------------------------
  const [hasChildren, setHasChildren] = useState<boolean>(
    existingWf?.hasChildren ?? true
  );
  const [totalChildrenCount, setTotalChildrenCount] = useState<number>(
    existingWf?.totalChildrenCount ?? 2
  );
  const [boysCount, setBoysCount] = useState<number>(
    existingWf?.boysCount ?? 1
  );
  const [girlsCount, setGirlsCount] = useState<number>(
    existingWf?.girlsCount ?? 1
  );

  const [childrenList, setChildrenList] = useState<DiscordChildData[]>(
    existingWf?.childrenList || [
      {
        id: 'child-1',
        fullName: 'يوسف العلوي',
        firstName: 'يوسف',
        lastName: 'العلوي',
        gender: 'ذكر',
        birthDate: '2017-06-10',
        age: 8,
        custodyAssignment: 'mother',
        monthlySupport: 1000,
        visitationRights: 'كل نهاية أسبوع من صباح السبت إلى مساء الأحد ونصف العطل المدرسية'
      },
      {
        id: 'child-2',
        fullName: 'مريم العلوي',
        firstName: 'مريم',
        lastName: 'العلوي',
        gender: 'أنثى',
        birthDate: '2020-03-22',
        age: 5,
        custodyAssignment: 'mother',
        monthlySupport: 1000,
        visitationRights: 'كل نهاية أسبوع من صباح السبت إلى مساء الأحد ونصف العطل المدرسية'
      }
    ]
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
        return hasJudgment && !!courtCity && !!judgmentNumber && !!judgmentDate;
      case 2:
        return !!applicantInJudgment && !!attendeeForCertification;
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
        return reconciliationExhausted && !!responsibleParty;
      case 9:
        return duesTotal >= 0;
      case 10:
        return !duesExecutionStatus || (depositAmount > 0 && !!depositReceiptNumber);
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
    hasJudgment,
    courtCity,
    judgmentNumber,
    judgmentDate,
    applicantInJudgment,
    attendeeForCertification,
    husbandFirstNameAr,
    husbandLastNameAr,
    husbandIdNumber,
    wifeFirstNameAr,
    wifeLastNameAr,
    wifeIdNumber,
    marriageDeedNumber,
    marriageDeedDate,
    reconciliationExhausted,
    responsibleParty,
    duesTotal,
    duesExecutionStatus,
    depositAmount,
    depositReceiptNumber,
    hasChildren,
    totalChildrenCount,
    boysCount,
    girlsCount,
    childrenList
  ]);

  // واقعة البناء — مُسجَّلة من الشاشة التمهيدية
  const isBeforeConsummation = state.divorceClassification?.consummationStatus === 'before_consummation';

  // Stepper navigation
  const handleNextStage = () => {
    if (currentStage < 14) {
      let next = currentStage + 1;
      if (isBeforeConsummation && next === 11) next = 14;
      if (isBeforeConsummation && next === 12) next = 14;
      if (isBeforeConsummation && next === 13) next = 14;
      setCurrentStage(Math.min(next, 14));
    }
  };

  const handlePrevStage = () => {
    if (currentStage > 1) {
      let prev = currentStage - 1;
      if (isBeforeConsummation && prev === 13) prev = 10;
      if (isBeforeConsummation && prev === 12) prev = 10;
      if (isBeforeConsummation && prev === 11) prev = 10;
      setCurrentStage(Math.max(prev, 1));
    }
  };

  // Children helpers
  const handleAddChild = () => {
    const nextNum = childrenList.length + 1;
    const newChild: DiscordChildData = {
      id: `child-${Date.now()}`,
      fullName: `ابن/ابنة ${nextNum}`,
      firstName: '',
      lastName: husbandLastNameAr,
      gender: 'ذكر',
      birthDate: '2021-01-01',
      custodyAssignment: 'mother',
      monthlySupport: 1000,
      visitationRights: 'عطل نهاية الأسبوع والعطل المدرسية بالاتفاق وطبقاً لمنطوق الحكم'
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

  const handleUpdateChild = (id: string, updates: Partial<DiscordChildData>) => {
    setChildrenList(
      childrenList.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Helper to autofill wife details from existing data
  const handleFetchWifeData = () => {
    if (wifeExisting) {
      if (wifeExisting.name) {
        const parts = wifeExisting.name.split(' ');
        setWifeFirstNameAr(parts[0] || '');
        setWifeLastNameAr(parts.slice(1).join(' ') || '');
      }
      if (wifeExisting.idNumber) setWifeIdNumber(wifeExisting.idNumber);
      if (wifeExisting.dateOfBirth) setWifeBirthDate(wifeExisting.dateOfBirth);
      if (wifeExisting.placeOfBirth) setWifeBirthPlace(wifeExisting.placeOfBirth);
      if (wifeExisting.fatherName) setWifeFatherName(wifeExisting.fatherName);
      if (wifeExisting.motherName) setWifeMotherName(wifeExisting.motherName);
      if (wifeExisting.profession) setWifeProfession(wifeExisting.profession);
      if (wifeExisting.address) setWifeAddress(wifeExisting.address);
    }
  };

  // Package data for state
  const packageWorkflowData = (): DiscordDivorceWorkflowData => ({
    hasJudgment,
    courtCity,
    familySectionCity,
    caseNumber,
    judgmentNumber,
    judgmentDate,
    notificationDate,
    adoulNotes,
    applicantInJudgment,
    attendeeForCertification,
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
    divorceNature: 'تطليق قضائي للشقاق',
    legalEffect: 'طلاق بائن بينونة صغرى',
    consummationHappened,
    reconciliationExhausted,
    responsibleParty,
    dues: {
      wifeDues,
      damageCompensation,
      childSupport,
      totalAmount: duesTotal,
      totalAmountInWords: duesTotalInWords
    },
    duesExecutionStatus,
    executionDetails: {
      depositAmount,
      depositAmountInWords,
      receiptNumber: depositReceiptNumber,
      depositDate,
      courtName: depositCourt
    },
    hasChildren,
    totalChildrenCount,
    boysCount,
    girlsCount,
    childrenList,
    pregnancyStatus,
    completedAt: new Date().toISOString()
  });

  // Final Action: الانتقال إلى تحرير رسم تطليق الشقاق
  const handleFinalProceedToDraft = () => {
    const packaged = packageWorkflowData();
    setState((prev) => {
      const nextState: FeesAgentState = {
        ...prev,
        divorceClassification: {
          ...(prev.divorceClassification || {
            primaryType: 'discord',
            statisticalCode: 'D-02'
          }),
          primaryType: 'discord',
          statisticalCode: 'D-02',
          divorceCount: divorceCount,
          wifePresence: attendeeForCertification === 'husband' ? 'absent' : 'present',
          discordWorkflow: packaged,
          discordDetails: {
            caseFileNumber: caseNumber,
            judgmentNumber: judgmentNumber,
            judgmentDate: judgmentDate,
            courtName: courtCity,
            isLinkedToCourtFile: true
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

      const officialDraft = generateDiscordDivorceDraft(nextState);
      return {
        ...nextState,
        draft: officialDraft
      };
    });

    onComplete();
  };

  const stagesList = [
    { num: 1, label: 'الحكم القضائي' },
    { num: 2, label: 'رافع الدعوى والحاضر' },
    { num: 3, label: 'بيانات الزوج' },
    { num: 4, label: 'بيانات الزوجة' },
    { num: 5, label: 'مرجع الزواج' },
    { num: 6, label: 'طبيعة التطليق' },
    { num: 7, label: 'واقعة البناء' },
    { num: 8, label: 'محاولات الصلح والمسؤولية' },
    { num: 9, label: 'المستحقات والتعويض' },
    { num: 10, label: 'إيداع المستحقات' },
    { num: 11, label: 'الأبناء' },
    { num: 12, label: 'بطاقات الأبناء' },
    { num: 13, label: 'حالة الحمل' },
    { num: 14, label: 'المراجعة الشاملة' }
  ];

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans text-slate-800" dir="rtl">
      {/* 🏛️ Top Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 border-b border-indigo-700/50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
            <Scale className="w-7 h-7 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                المسار القضائي D-02
              </span>
              <span className="text-xs text-indigo-200/80">المواد 94-97 و123 من مدونة الأسرة</span>
            </div>
            <h2 className="text-2xl font-black mt-1 text-white tracking-wide">
              🏛️ التطليق للشقاق — مسار التوثيق القضائي
            </h2>
          </div>
        </div>

        {onBackToClassification && (
          <button
            type="button"
            onClick={onBackToClassification}
            className="text-xs px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center gap-1.5"
          >
            <span>🔄 تبديل تصنيف الطلاق</span>
          </button>
        )}
      </div>

      {/* 🧭 Stage Stepper Bar (14 Stages) */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 overflow-x-auto scrollbar-thin">
        <div className="flex items-center justify-between min-w-[950px] gap-2">
          {stagesList.map((st) => {
            const isActive = currentStage === st.num;
            const isPassed = currentStage > st.num;
            return (
              <button
                key={st.num}
                type="button"
                onClick={() => isPassed && setCurrentStage(st.num)}
                disabled={!isPassed && !isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-700 text-white shadow-md shadow-indigo-700/20 scale-105'
                    : isPassed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isActive
                      ? 'bg-white text-indigo-800'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {isPassed ? '✓' : st.num}
                </span>
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📄 Main Content Area */}
      <div className="p-6 md:p-8 space-y-6">

        {/* ------------------------------------------------------------- */}
        {/* STAGE 01: الحكم القضائي النهائي بتطليق الشقاق */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 01 — الحكم القضائي النهائي بتطليق الشقاق
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>📜 الحكم القضائي القاضي بتطليق الشقاق</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى إدخال بيانات الحكم القضائي النهائي الصادر بالتطليق للشقاق بين الزوجين، قبل الانتقال إلى استكمال باقي بيانات الرسم.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
              <label className="block text-sm font-bold text-indigo-950 mb-3">
                هل يوجد حكم قضائي بات قاضٍ بتطليق الشقاق؟
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHasJudgment(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    hasJudgment
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasJudgment(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    !hasJudgment
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>🔘 لا</span>
                </button>
              </div>
            </div>

            {!hasJudgment ? (
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-rose-950 text-base">🔴 لا يمكن متابعة هذه المسطرة</h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    تطليق الشقاق يصدر حصراً بموجب حكم قضائي (المواد 94-97 من مدونة الأسرة). يتعين التحقق من وجود الحكم القضائي قبل الانتقال إلى المرحلة التالية.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المحكمة الابتدائية بـ:
                    </label>
                    <input
                      type="text"
                      value={courtCity}
                      onChange={(e) => setCourtCity(e.target.value)}
                      placeholder="مثال: طنجة"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      قسم قضاء الأسرة بـ:
                    </label>
                    <input
                      type="text"
                      value={familySectionCity}
                      onChange={(e) => setFamilySectionCity(e.target.value)}
                      placeholder="مثال: طنجة"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رقم الملف / القضية:
                    </label>
                    <input
                      type="text"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      placeholder="مثال: 2026/1602/412"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رقم الحكم القضائي:
                    </label>
                    <input
                      type="text"
                      value={judgmentNumber}
                      onChange={(e) => setJudgmentNumber(e.target.value)}
                      placeholder="مثال: 1428"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تاريخ صدور الحكم:
                    </label>
                    <input
                      type="date"
                      value={judgmentDate}
                      onChange={(e) => setJudgmentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تاريخ التبليغ/التنفيذ (إن وجد):
                    </label>
                    <input
                      type="date"
                      value={notificationDate}
                      onChange={(e) => setNotificationDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ملاحظات العدل:
                  </label>
                  <textarea
                    rows={2}
                    value={adoulNotes}
                    onChange={(e) => setAdoulNotes(e.target.value)}
                    placeholder="ملاحظات حول منطوق الحكم أو الصيغة التنفيذية..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">🟢 تم تسجيل بيانات الحكم القضائي بنجاح.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 02: تحديد رافع الدعوى والحاضر أمام العدل */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 02 — تحديد رافع الدعوى والحاضر أمام العدل
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>👥 من طلب المسطرة ومن يحضر للإشهاد؟</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى تحديد الطرف الذي رفع دعوى الشقاق والحاضر أمامكم لإتمام الإشهاد بناءً على الحكم.
              </p>
            </div>

            {/* Applicant in Judgment */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                طالب التطليق في الحكم القضائي:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setApplicantInJudgment('husband')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    applicantInJudgment === 'husband'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👨 الزوج (المدعي)</span>
                    {applicantInJudgment === 'husband' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">الزوج هو من بادر برفع مقال دعوى الشقاق</p>
                </button>

                <button
                  type="button"
                  onClick={() => setApplicantInJudgment('wife')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    applicantInJudgment === 'wife'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👩 الزوجة (المدعية)</span>
                    {applicantInJudgment === 'wife' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">الزوجة هي من بادرت بطلب التطليق للشقاق</p>
                </button>

                <button
                  type="button"
                  onClick={() => setApplicantInJudgment('both')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    applicantInJudgment === 'both'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👥 الطرفان معاً</span>
                    {applicantInJudgment === 'both' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">دعوى أو طلب مشترك من كلا الزوجين</p>
                </button>
              </div>
            </div>

            {/* Attendee for Certification */}
            <div className="space-y-3 pt-3">
              <label className="block text-sm font-bold text-slate-900">
                الحاضر أمام العدل للإشهاد:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAttendeeForCertification('husband')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    attendeeForCertification === 'husband'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👨 الزوج (أو وكيله)</span>
                    {attendeeForCertification === 'husband' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حضور الزوج أو وكيله الرسمي لتلقي الإشهاد</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeForCertification('wife')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    attendeeForCertification === 'wife'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👩 الزوجة (أو وكيلتها)</span>
                    {attendeeForCertification === 'wife' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حضور الزوجة أو وكيلتها الرسمية لتلقي الإشهاد</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeForCertification('both')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    attendeeForCertification === 'both'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 👥 الزوج والزوجة معاً</span>
                    {attendeeForCertification === 'both' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حضور كلا الطرفين بمجلس العقد معاً</p>
                </button>
              </div>
            </div>

            {/* Judicial Rule Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span>⚙️ قواعد النظام الخاصة ببيت تطليق الشقاق:</span>
              </div>
              <p className="leading-relaxed">
                <strong>القاعدة:</strong> يُقبل حضور أي من الطرفين (أو وكيله بوكالة رسمية) لإشهاد العدلين بالحكم الصادر، وتكتمل المسطرة بموجب منطوق الحكم القضائي دون اشتراط حضور الطرف الآخر.
              </p>
              <div className="pt-1 text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>🟢 يمكن متابعة المسطرة بناءً على منطوق الحكم القضائي.</span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 03: بيانات الزوج */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 03 — بيانات الزوج
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>👨 بيانات الزوج</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى التحقق من صحة واكتمال الهوية الشخصية والمهنية للزوج وفق وثيقة هويته الرسمية.
              </p>
            </div>

            {/* Identity Card Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>🪪 الهوية الشخصية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية:</label>
                  <input
                    type="text"
                    value={husbandFirstNameAr}
                    onChange={(e) => setHusbandFirstNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي بالعربية:</label>
                  <input
                    type="text"
                    value={husbandLastNameAr}
                    onChange={(e) => setHusbandLastNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={husbandNationality}
                    onChange={(e) => setHusbandNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية (اختياري):</label>
                  <input
                    type="text"
                    value={husbandFirstNameFr}
                    onChange={(e) => setHusbandFirstNameFr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية (اختياري):</label>
                  <input
                    type="text"
                    value={husbandLastNameFr}
                    onChange={(e) => setHusbandLastNameFr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={husbandBirthDate}
                    onChange={(e) => setHusbandBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={husbandBirthPlace}
                    onChange={(e) => setHusbandBirthPlace(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب:</label>
                  <input
                    type="text"
                    value={husbandFatherName}
                    onChange={(e) => setHusbandFatherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم:</label>
                  <input
                    type="text"
                    value={husbandMotherName}
                    onChange={(e) => setHusbandMotherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Document Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📜 وثيقة الهوية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الوثيقة:</label>
                  <select
                    value={husbandIdType}
                    onChange={(e) => setHusbandIdType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="cin">البطاقة الوطنية للتعريف الإلكترونية</option>
                    <option value="passport">جواز السفر</option>
                    <option value="other">وثيقة أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الوثيقة:</label>
                  <input
                    type="text"
                    value={husbandIdNumber}
                    onChange={(e) => setHusbandIdNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصلاحية:</label>
                  <input
                    type="date"
                    value={husbandIdExpiryDate}
                    onChange={(e) => setHusbandIdExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address & Profession */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>🏠 البيانات الشخصية والسكنى</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={husbandProfession}
                    onChange={(e) => setHusbandProfession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
                  <input
                    type="text"
                    value={husbandCity}
                    onChange={(e) => setHusbandCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
                  <input
                    type="text"
                    value={husbandCountry}
                    onChange={(e) => setHusbandCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان السكنى الكامل:</label>
                  <input
                    type="text"
                    value={husbandAddress}
                    onChange={(e) => setHusbandAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 04: بيانات الزوجة */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  المرحلة 04 — بيانات الزوجة
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                  <span>👩 بيانات الزوجة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يرجى إدخال أو مراجعة الهوية الرسمية للزوجة بدقة لضمان مطابقتها مع السجلات والحكم.
                </p>
              </div>

              {/* 🔄 استدعاء بيانات الزوجة من سجل الزواج */}
              <button
                type="button"
                onClick={handleFetchWifeData}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-300 text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                <span>🔄 استدعاء بيانات الزوجة من سجل الزواج</span>
              </button>
            </div>

            {/* Identity Card Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>🪪 الهوية الشخصية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية:</label>
                  <input
                    type="text"
                    value={wifeFirstNameAr}
                    onChange={(e) => setWifeFirstNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي بالعربية:</label>
                  <input
                    type="text"
                    value={wifeLastNameAr}
                    onChange={(e) => setWifeLastNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={wifeNationality}
                    onChange={(e) => setWifeNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية (اختياري):</label>
                  <input
                    type="text"
                    value={wifeFirstNameFr}
                    onChange={(e) => setWifeFirstNameFr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية (اختياري):</label>
                  <input
                    type="text"
                    value={wifeLastNameFr}
                    onChange={(e) => setWifeLastNameFr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={wifeBirthDate}
                    onChange={(e) => setWifeBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={wifeBirthPlace}
                    onChange={(e) => setWifeBirthPlace(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب:</label>
                  <input
                    type="text"
                    value={wifeFatherName}
                    onChange={(e) => setWifeFatherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم:</label>
                  <input
                    type="text"
                    value={wifeMotherName}
                    onChange={(e) => setWifeMotherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Document Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>📜 وثيقة الهوية</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الوثيقة:</label>
                  <select
                    value={wifeIdType}
                    onChange={(e) => setWifeIdType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="cin">البطاقة الوطنية للتعريف الإلكترونية</option>
                    <option value="passport">جواز السفر</option>
                    <option value="other">وثيقة أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الوثيقة:</label>
                  <input
                    type="text"
                    value={wifeIdNumber}
                    onChange={(e) => setWifeIdNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الصلاحية:</label>
                  <input
                    type="date"
                    value={wifeIdExpiryDate}
                    onChange={(e) => setWifeIdExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address & Profession */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>🏠 البيانات الشخصية والسكنى</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={wifeProfession}
                    onChange={(e) => setWifeProfession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
                  <input
                    type="text"
                    value={wifeCity}
                    onChange={(e) => setWifeCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
                  <input
                    type="text"
                    value={wifeCountry}
                    onChange={(e) => setWifeCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان السكنى الكامل:</label>
                  <input
                    type="text"
                    value={wifeAddress}
                    onChange={(e) => setWifeAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 05: مرجع رسم الزواج المراد إنهاؤه */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 05 — مرجع رسم الزواج المراد إنهاؤه
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>💍 بيانات الزواج</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى إدخال أو مراجعة البيانات المرجعية لرسم الزواج الذي صدر الحكم بتطليقه.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الرسم:</label>
                <input
                  type="text"
                  value={marriageDeedType}
                  onChange={(e) => setMarriageDeedType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مضمن بدفتر:</label>
                <input
                  type="text"
                  value={marriageRegistryBook}
                  onChange={(e) => setMarriageRegistryBook(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الدفتر:</label>
                <input
                  type="text"
                  value={marriageBookNumber}
                  onChange={(e) => setMarriageBookNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">صفحة:</label>
                <input
                  type="text"
                  value={marriagePageNumber}
                  onChange={(e) => setMarriagePageNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد:</label>
                <input
                  type="text"
                  value={marriageDeedNumber}
                  onChange={(e) => setMarriageDeedNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">بتاريخ:</label>
                <input
                  type="date"
                  value={marriageDeedDate}
                  onChange={(e) => setMarriageDeedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الجهة التي صدر عنها الرسم:</label>
                <input
                  type="text"
                  value={marriageIssuingAuthority}
                  onChange={(e) => setMarriageIssuingAuthority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Summary Preview Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <h4 className="font-bold text-xs text-indigo-950 mb-2 flex items-center gap-1.5">
                <span>💍 بطاقة ملخص مرجع الزواج</span>
              </h4>
              <div className="text-xs text-indigo-900 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>النوع: <strong className="text-indigo-950">{marriageDeedType || '---'}</strong></div>
                <div>الدفتر: <strong className="text-indigo-950">{marriageRegistryBook} (رقم {marriageBookNumber})</strong></div>
                <div>الصفحة والعدد: <strong className="text-indigo-950">ص {marriagePageNumber} — ع {marriageDeedNumber}</strong></div>
                <div>تاريخ الرسم: <strong className="text-indigo-950">{marriageDeedDate}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 06: بيانات تطليق الشقاق وطبيعته القانونية */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 06 — بيانات تطليق الشقاق وطبيعته القانونية
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>⚖️ عدد الطلاق وطبيعته</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى تحديد رتبة التطليق المحددة في الحكم أو المحسوبة قانوناً.
              </p>
            </div>

            {/* Divorce Count Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                عدد الطلاق:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDivorceCount('first')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    divorceCount === 'first'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔵 الطلقة الأولى</span>
                    {divorceCount === 'first' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">التطليق الأول الذي يقع بين الزوجين</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDivorceCount('second')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    divorceCount === 'second'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🟠 الطلقة الثانية</span>
                    {divorceCount === 'second' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">تطليق ثانٍ سبقه طلاق أو تطليق سابق</p>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                ℹ️ حُذفت الطلقة الثالثة لأن التطليق القضائي لا يُوقع مكملاً للثلاث اتفاقاً أو ابتداءً.
              </p>
            </div>

            {/* Legal Effect Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>طبيعة الطلاق وحكمه:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <span className="font-bold">نوع المسطرة:</span> 🟢 تطليق قضائي للشقاق
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900">
                  <span className="font-bold">الأثر القانوني:</span> 📌 طلاق بائن بينونة صغرى (المادة 123 من مدونة الأسرة).
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ⚖️ معلومة توضيحية للعدل للتأكيد على أن هذا التطليق بائن ولا تحق فيه الرجعة المنفردة، وإنما يجوز لهما التراجع بعقد وصداق جديدين بعد انقضاء العدة أو خلالها وفق ضوابط البينونة الصغرى.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 07: التحقق من واقعة البناء */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 07 — التحقق من واقعة البناء
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>💍 هل حصل البناء بالزوجة؟</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد حصول الدخول أو عدمه لضبط الآثار الشرعية المتعلقة بالعدة ومستحقات الصداق.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setConsummationHappened(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    consummationHappened
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🔘 نعم (حصل البناء)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConsummationHappened(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    !consummationHappened
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>🔘 لا (قبل البناء)</span>
                </button>
              </div>
            </div>

            {!consummationHappened && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">ℹ️ إشعار قانوني: التطليق قبل البناء</h4>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    التطليق للشقاق قبل البناء يقع بائناً، ولا تجب فيه العدة على الزوجة وفق الأحكام الشرعية والقانونية المنصوص عليها في مدونة الأسرة.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 08: محاولات الصلح ومسؤولية الشقاق */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 08 — محاولات الصلح ومسؤولية الشقاق
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>⚖️ ثبوت محاولة الصلح والمسؤولية عن الفراق</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                استناداً إلى الحيثيات الواردة في منطوق الحكم القضائي الصادر.
              </p>
            </div>

            {/* Reconciliation Sessions Exhausted */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                هل استنفدت المحكمة جلسات ومحاولات الصلح بنجاح سلبي؟
              </label>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-indigo-950">
                  🔘 نعم (تم الفشل وإثبات تعذر الاستمرار وإصلاح ذات البين بمقتضى الإجراءات القضائية)
                </span>
              </div>
            </div>

            {/* Responsible Party according to judgment */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                تحديد الطرف المسؤول عن الشقاق وفق الحكم:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setResponsibleParty('husband')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    responsibleParty === 'husband'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 الزوج</span>
                    {responsibleParty === 'husband' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حمل الحكم المسؤولية كاملة أو رئيسية للزوج</p>
                </button>

                <button
                  type="button"
                  onClick={() => setResponsibleParty('wife')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    responsibleParty === 'wife'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 الزوجة</span>
                    {responsibleParty === 'wife' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">حمل الحكم المسؤولية كاملة أو رئيسية للزوجة</p>
                </button>

                <button
                  type="button"
                  onClick={() => setResponsibleParty('shared_or_unspecified')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    responsibleParty === 'shared_or_unspecified'
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🔘 الإساءة مشتركة / غير محددة</span>
                    {responsibleParty === 'shared_or_unspecified' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">المسؤولية متقاسمة أو تعذر تحديد المتسبب</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 09: المستحقات المالية والتعويض عن الضرر */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 09 — المستحقات المالية والتعويض عن الضرر
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>💰 المحكوم به في قضية الشقاق</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى إدخال المبالغ والمستحقات والتعويضات المحددة في منطوق الحكم.
              </p>
            </div>

            {/* 🔔 Before-consummation adaptive dues */}
            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3">
                <p className="text-xs font-extrabold text-amber-900">⚠️ تكييف آلي — الطلاق قبل الدخول (المادة 71 من مدونة الأسرة)</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">موقف الصداق / المهر:</label>
                    <div className="flex flex-col gap-2">
                      {(['تم قبضه كاملاً', 'تجب نصف الفريضة (نصف الصداق)', 'لم يحدد صداق (مهر المثل/المتعة)'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                          <input type="radio" name="mahrStatusDiscord" className="w-4 h-4 accent-amber-600" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 bg-amber-100 rounded-lg text-xs text-amber-900 font-semibold">
                    🔒 نفقة العدة: <strong>غير مستحقة</strong> — لا عدة على المطلقة قبل الدخول (المادة 135).
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">المتعة أو التعويض القضائي (درهم):</label>
                    <input type="number" min={0} className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-sm focus:outline-none" placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مستحقات الزوجة (متعة، سكنى العدة، مؤخر الصداق):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={wifeDues || ''}
                    onChange={(e) => setWifeDues(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  التعويض عن الضرر المترتب عن الشقاق (إن حكم به):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={damageCompensation || ''}
                    onChange={(e) => setDamageCompensation(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مستحقات ونفقة الأبناء:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={childSupport || ''}
                    onChange={(e) => setChildSupport(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">درهم</span>
                </div>
              </div>
            </div>

            {/* Total Box with Automatic Tafqit */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-xs text-slate-400 font-bold">الإجمالي المالي المحكوم به بالأرقام:</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  {duesTotal.toLocaleString('ar-MA')} درهم
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-r border-slate-800 pt-3 sm:pt-0 sm:pr-6">
                <span className="text-xs text-slate-400 font-bold">الإجمالي بالحروف (يولد تلقائياً):</span>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {duesTotalInWords}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 10: إيداع المستحقات أو التنفيذ القضائي */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 10 — إيداع المستحقات أو التنفيذ القضائي
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>🏦 إيداع المستحقات بكتابة الضبط</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                التحقق من إيداع المبالغ المحكوم بها بصندوق المحكمة الابتدائية أو التنفيذ.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
              <label className="block text-sm font-bold text-indigo-950 mb-3">
                هل تم إيداع المستحقات والتعويضات المحكوم بها بصندوق المحكمة؟
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDuesExecutionStatus(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    duesExecutionStatus
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🔘 نعم (تم الإيداع)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDuesExecutionStatus(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    !duesExecutionStatus
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>🔘 لا (مؤجل أو مسار تنفيذي آخر)</span>
                </button>
              </div>
            </div>

            {duesExecutionStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المبلغ المودع بالأرقام:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount || ''}
                        onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">درهم</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المبلغ بالحروف:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={depositAmountInWords}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رقم وصل الإيداع / التنفيذ:
                    </label>
                    <input
                      type="text"
                      value={depositReceiptNumber}
                      onChange={(e) => setDepositReceiptNumber(e.target.value)}
                      placeholder="مثال: DEP-2026/894"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تاريخ الإيداع:
                    </label>
                    <input
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المحكمة:
                    </label>
                    <input
                      type="text"
                      value={depositCourt}
                      onChange={(e) => setDepositCourt(e.target.value)}
                      placeholder="مثال: المحكمة الابتدائية بطنجة"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">⏱️ تم التأكد من تسجيل بيانات الإيداع والتنفيذ بنجاح.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 11: الأبناء */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 11 — الأبناء
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>👨‍👩‍👧‍👦 أبناء الزوجين</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد وجود الأبناء المشتركين بين الطرفين وأعدادهم لضبط المقتضيات المحكوم بها.
              </p>
            </div>

            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
                <span className="text-blue-600 text-lg flex-shrink-0">ℹ️</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  <strong>تنبيه النظام:</strong> تم إلغاء مرحلة بيانات الأبناء والحضانة تلقائياً لعدم وجود دخلة شرعية.
                </p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
              <label className="block text-sm font-bold text-indigo-950 mb-3">
                هل للزوجين أبناء؟
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setHasChildren(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    hasChildren
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasChildren(false);
                    setChildrenList([]);
                    setTotalChildrenCount(0);
                    setBoysCount(0);
                    setGirlsCount(0);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    !hasChildren
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>🔘 لا</span>
                </button>
              </div>
            </div>

            {hasChildren && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      إجمالي عدد الأبناء:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={totalChildrenCount || ''}
                      onChange={(e) => setTotalChildrenCount(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ذكور 👦:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={boysCount}
                      onChange={(e) => setBoysCount(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      إناث 👧:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={girlsCount}
                      onChange={(e) => setGirlsCount(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {boysCount + girlsCount !== totalChildrenCount && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      ⚠️ تنبيه: مجموع الذكور ({boysCount}) والإناث ({girlsCount}) يساوي ({boysCount + girlsCount}) وهو يختلف عن العدد الإجمالي ({totalChildrenCount}). يرجى المطابقة.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 12: بطاقة كل ابن والمحكوم به بشأن الحضانة والنفقة */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  المرحلة 12 — بطاقة كل ابن والمحكوم به بشأن الحضانة والنفقة
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                  <span>👦👧 بطاقات الأبناء المحكوم بشأنهم</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ينشئ النظام تلقائياً بطاقة لكل ابن وفق الحكم القضائي لضبط الحضانة والنفقة وحق الزيارة.
                </p>
              </div>

              {hasChildren && (
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ابن</span>
                </button>
              )}
            </div>

            {!hasChildren ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                تم تسجيل عدم وجود أبناء مشتركين بين الطرفين.
              </div>
            ) : (
              <div className="space-y-4">
                {childrenList.map((child, idx) => {
                  const age = calculateAge(child.birthDate);
                  return (
                    <div
                      key={child.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 relative"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                          {child.gender === 'أنثى' ? '👧 الابنة' : '👦 الابن'} رقم {String(idx + 1).padStart(2, '0')}
                        </span>
                        {childrenList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(child.id)}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي:</label>
                          <input
                            type="text"
                            value={child.firstName}
                            onChange={(e) => handleUpdateChild(child.id, { firstName: e.target.value })}
                            placeholder="مثال: يوسف"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العائلي:</label>
                          <input
                            type="text"
                            value={child.lastName}
                            onChange={(e) => handleUpdateChild(child.id, { lastName: e.target.value })}
                            placeholder="مثال: العلوي"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الجنس:</label>
                          <select
                            value={child.gender}
                            onChange={(e) => handleUpdateChild(child.id, { gender: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                          <input
                            type="date"
                            value={child.birthDate}
                            onChange={(e) => handleUpdateChild(child.id, { birthDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="text-[11px] text-slate-500 block mt-1">العمر: {age} سنة</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الحضانة المحكوم بها:</label>
                          <select
                            value={child.custodyAssignment}
                            onChange={(e) => handleUpdateChild(child.id, { custodyAssignment: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="mother">للأم</option>
                            <option value="father">للأب</option>
                            <option value="other">أخرى / بحسب الحكم</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">النفقة الشهرية المحكوم بها:</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={child.monthlySupport || ''}
                              onChange={(e) => handleUpdateChild(child.id, { monthlySupport: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                            <span className="absolute left-2.5 top-2 text-xs text-slate-400">درهم</span>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">حق صلة الرحم والزيارة المحكوم به:</label>
                          <input
                            type="text"
                            value={child.visitationRights}
                            onChange={(e) => handleUpdateChild(child.id, { visitationRights: e.target.value })}
                            placeholder="مثال: عطل نهاية الأسبوع والعطل المدرسية"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 13: حالة الحمل */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                المرحلة 13 — حالة الحمل
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>🤰 هل الزوجة حامل وقت الإشهاد؟</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد ثبوت الحمل من عدمه لبيان أثره على مدة العدة والواجبات المترتبة.
              </p>
            </div>

            {isBeforeConsummation && (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
                <span className="text-blue-600 text-lg flex-shrink-0">ℹ️</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  <strong>تنبيه النظام:</strong> تم تجاوز مرحلة التحقق من الحمل تلقائياً — لا عدة على المطلقة قبل الدخول (المادة 135 من مدونة الأسرة).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPregnancyStatus('yes')}
                className={`p-4 rounded-xl border text-right transition-all ${
                  pregnancyStatus === 'yes'
                    ? 'border-amber-600 bg-amber-50 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">🔘 نعم (حامل)</span>
                  {pregnancyStatus === 'yes' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">ثبوت الحمل وقت توثيق الحكم</p>
              </button>

              <button
                type="button"
                onClick={() => setPregnancyStatus('no')}
                className={`p-4 rounded-xl border text-right transition-all ${
                  pregnancyStatus === 'no'
                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">🔘 لا (غير حامل)</span>
                  {pregnancyStatus === 'no' && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">براءة الرحم من الحمل</p>
              </button>

              <button
                type="button"
                onClick={() => setPregnancyStatus('unknown')}
                className={`p-4 rounded-xl border text-right transition-all ${
                  pregnancyStatus === 'unknown'
                    ? 'border-slate-600 bg-slate-100 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">🔘 غير معلوم</span>
                  {pregnancyStatus === 'unknown' && <Check className="w-4 h-4 text-slate-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">لم يتم الإدلاء بما يثبت أو ينفي</p>
              </button>
            </div>

            {pregnancyStatus === 'yes' && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>🟠 تنبيه: أثر الحمل على العدة والنفقة</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  تم تسجيل حالة الحمل. تمتد فترة العدة إلى حين الوضع وفق المادة 134 من مدونة الأسرة، وتستمر واجبات نفقة الحمل على الزوج إلى حين الوضع.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 14: المراجعة الشاملة والتأكيد */}
        {/* ------------------------------------------------------------- */}
        {currentStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                المرحلة 14 — المراجعة الشاملة والتأكيد
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>🔎 مراجعة بيانات تطليق الشقاق</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تأكيد جاهزية كافة المعطيات القضائية والشخصية قبل تحرير وتضمين الرسم العدلي.
              </p>
            </div>

            {/* Checklist summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>📜 الحكم القضائي:</span>
                <span className="font-bold text-emerald-700">🟢 حكم نهائي ومسجل (عدد {judgmentNumber})</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👥 رافع الدعوى والحضور:</span>
                <span className="font-bold text-emerald-700">🟢 تم التحقق منه</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👨 بيانات الزوج:</span>
                <span className="font-bold text-emerald-700">🟢 {husbandFirstNameAr} {husbandLastNameAr} (مكتملة)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👩 بيانات الزوجة:</span>
                <span className="font-bold text-emerald-700">🟢 {wifeFirstNameAr} {wifeLastNameAr} (مكتملة)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>💍 مرجع عقد الزواج:</span>
                <span className="font-bold text-emerald-700">🟢 عقد عدد {marriageDeedNumber} (مكتمل)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>⚖️ طبيعة الطلاق:</span>
                <span className="font-bold text-emerald-700">🟢 تطليق قضائي بائن ({divorceCount === 'second' ? 'الطلقة الثانية' : 'الطلقة الأولى'})</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>💰 المستحقات والتعويض عن الشقاق:</span>
                <span className="font-bold text-emerald-700">🟢 {duesTotal.toLocaleString('ar-MA')} درهم (تم تسجيل المحكوم به)</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>🏦 الإيداع والتنفيذ:</span>
                <span className="font-bold text-emerald-700">🟢 {duesExecutionStatus ? `وصل رقم ${depositReceiptNumber}` : 'مسار تنفيذي مستقل'}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>👶 الأبناء والحضانة والنفقة:</span>
                <span className="font-bold text-emerald-700">🟢 {hasChildren ? `${totalChildrenCount} أبناء (مكتملة)` : 'لا يوجد أبناء'}</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <span>🤰 حالة الحمل:</span>
                <span className="font-bold text-emerald-700">🟢 {pregnancyStatus === 'yes' ? 'حامل (تم التدوين)' : 'لا يوجد'}</span>
              </div>
            </div>

            {/* Final Action Box */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-300 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div>
                <h4 className="font-bold text-indigo-950 text-base">✅ اكتملت مرحلة جمع والتحقق الأولي من معطيات تطليق الشقاق</h4>
                <p className="text-xs text-indigo-900 mt-1 max-w-xl leading-relaxed">
                  يمكنكم الآن الانتقال المباشر لإنشاء وتحرير رسم تطليق الشقاق في المرحلة 07 بالصياغة الذكية والنماذج القضائية الرسمية المعتمدة.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalProceedToDraft}
                className="px-6 py-3 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-center justify-center hover:scale-105 active:scale-95"
              >
                <span>✍️ الانتقال إلى تحرير رسم تطليق الشقاق</span>
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
                  ? 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-md hover:scale-105 active:scale-95'
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
