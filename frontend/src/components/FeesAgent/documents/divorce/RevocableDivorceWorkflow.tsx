import React, { useState, useMemo } from 'react';
import type { FeesAgentState, RevocableDivorceWorkflowData, RevocableChildData } from '../../../../types/feesAgentTypes';
import { generateRevocableDivorceDraft } from '../../../../utils/divorceTemplateEngine';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  FileCheck2,
  Check,
  UserCheck
} from 'lucide-react';

interface RevocableDivorceWorkflowProps {
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

  let result = '';
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (millions > 0) {
    if (millions === 1) result += 'مليون';
    else if (millions === 2) result += 'مليونان';
    else if (millions >= 3 && millions <= 10) {
      result += ones[millions] + ' ملايين';
    } else result += convertGroup(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (result) result += ' و';
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) {
      result += ones[thousands] + ' آلاف';
    } else result += convertGroup(thousands) + ' ألف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    result += convertGroup(remainder);
  }

  return (result.trim() || 'صفر') + suffix;
}

// Age calculator
function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}

export const RevocableDivorceWorkflow: React.FC<RevocableDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Initial Data Extraction
  const classification = state.divorceClassification;
  const existingWorkflow = classification?.revocableWorkflow;
  const defaultHusband = state.sellers?.[0];
  const defaultWife = state.buyers?.[0];

  // Stage 1: الإذن القضائي
  const [hasJudicialPermission, setHasJudicialPermission] = useState<boolean>(
    existingWorkflow?.hasJudicialPermission ?? true
  );
  const [court, setCourt] = useState<string>(
    existingWorkflow?.court || 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة'
  );
  const [section, setSection] = useState<string>(
    existingWorkflow?.section || 'قسم قضاء الأسرة'
  );
  const [fileNumber, setFileNumber] = useState<string>(
    existingWorkflow?.fileNumber || '2026/1602/412'
  );
  const [permissionNumber, setPermissionNumber] = useState<string>(
    existingWorkflow?.permissionNumber || '785/2026'
  );
  const [permissionDate, setPermissionDate] = useState<string>(
    existingWorkflow?.permissionDate || '2026-05-18'
  );
  const [receptionDate, setReceptionDate] = useState<string>(
    existingWorkflow?.receptionDate || '2026-05-22'
  );
  const [adoulNotes, setAdoulNotes] = useState<string>(
    existingWorkflow?.adoulNotes || 'توصل العدلان بالإذن القضائي مستوفياً لكافة الشكليات القانونية.'
  );

  // Stage 2: من يحضر أمام العدل؟
  const [attendeeType, setAttendeeType] = useState<'husband' | 'wife' | 'both'>(
    existingWorkflow?.attendeeType || 'husband'
  );

  // Stage 3: بيانات الزوج
  const [husbandFirstNameAr, setHusbandFirstNameAr] = useState<string>(
    existingWorkflow?.husband?.firstNameAr || defaultHusband?.name?.split(' ')[0] || 'محمد'
  );
  const [husbandLastNameAr, setHusbandLastNameAr] = useState<string>(
    existingWorkflow?.husband?.lastNameAr || defaultHusband?.name?.split(' ').slice(1).join(' ') || 'العلمي'
  );
  const [husbandFirstNameFr, setHusbandFirstNameFr] = useState<string>(
    existingWorkflow?.husband?.firstNameFr || 'MOHAMMED'
  );
  const [husbandLastNameFr, setHusbandLastNameFr] = useState<string>(
    existingWorkflow?.husband?.lastNameFr || 'EL ALAMI'
  );
  const [husbandNationality, setHusbandNationality] = useState<string>(
    existingWorkflow?.husband?.nationality || 'مغربية'
  );
  const [husbandBirthDate, setHusbandBirthDate] = useState<string>(
    existingWorkflow?.husband?.birthDate || '1988-04-14'
  );
  const [husbandBirthPlace, setHusbandBirthPlace] = useState<string>(
    existingWorkflow?.husband?.birthPlace || 'طنجة'
  );
  const [husbandFatherName, setHusbandFatherName] = useState<string>(
    existingWorkflow?.husband?.fatherName || 'عبد السلام'
  );
  const [husbandMotherName, setHusbandMotherName] = useState<string>(
    existingWorkflow?.husband?.motherName || 'فاطمة الزهراء'
  );
  const [husbandIdType, setHusbandIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWorkflow?.husband?.idType || 'cin'
  );
  const [husbandIdNumber, setHusbandIdNumber] = useState<string>(
    existingWorkflow?.husband?.idNumber || defaultHusband?.idNumber || 'K458921'
  );
  const [husbandIdExpiryDate, setHusbandIdExpiryDate] = useState<string>(
    existingWorkflow?.husband?.idExpiryDate || '2030-08-10'
  );
  const [husbandProfession, setHusbandProfession] = useState<string>(
    existingWorkflow?.husband?.profession || 'تاجر'
  );
  const [husbandAddress, setHusbandAddress] = useState<string>(
    existingWorkflow?.husband?.address || defaultHusband?.address || 'حي مالاباطا، شارع مولاي يوسف، عمارة الأمل، رقم 12'
  );
  const [husbandCity, setHusbandCity] = useState<string>(
    existingWorkflow?.husband?.city || 'طنجة'
  );
  const [husbandCountry, setHusbandCountry] = useState<string>(
    existingWorkflow?.husband?.country || 'المملكة المغربية'
  );

  // Stage 4: بيانات الزوجة
  const [wifeFirstNameAr, setWifeFirstNameAr] = useState<string>(
    existingWorkflow?.wife?.firstNameAr || defaultWife?.name?.split(' ')[0] || 'أمينة'
  );
  const [wifeLastNameAr, setWifeLastNameAr] = useState<string>(
    existingWorkflow?.wife?.lastNameAr || defaultWife?.name?.split(' ').slice(1).join(' ') || 'الوزاني'
  );
  const [wifeFirstNameFr, setWifeFirstNameFr] = useState<string>(
    existingWorkflow?.wife?.firstNameFr || 'AMINA'
  );
  const [wifeLastNameFr, setWifeLastNameFr] = useState<string>(
    existingWorkflow?.wife?.lastNameFr || 'OUAZZANI'
  );
  const [wifeNationality, setWifeNationality] = useState<string>(
    existingWorkflow?.wife?.nationality || 'مغربية'
  );
  const [wifeBirthDate, setWifeBirthDate] = useState<string>(
    existingWorkflow?.wife?.birthDate || '1992-09-20'
  );
  const [wifeBirthPlace, setWifeBirthPlace] = useState<string>(
    existingWorkflow?.wife?.birthPlace || 'تطوان'
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    existingWorkflow?.wife?.fatherName || defaultWife?.fatherName || 'محمد العربي'
  );
  const [wifeMotherName, setWifeMotherName] = useState<string>(
    existingWorkflow?.wife?.motherName || 'خديجة'
  );
  const [wifeIdType, setWifeIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWorkflow?.wife?.idType || 'cin'
  );
  const [wifeIdNumber, setWifeIdNumber] = useState<string>(
    existingWorkflow?.wife?.idNumber || defaultWife?.idNumber || 'L582914'
  );
  const [wifeIdExpiryDate, setWifeIdExpiryDate] = useState<string>(
    existingWorkflow?.wife?.idExpiryDate || '2031-02-15'
  );
  const [wifeProfession, setWifeProfession] = useState<string>(
    existingWorkflow?.wife?.profession || 'أستاذة'
  );
  const [wifeAddress, setWifeAddress] = useState<string>(
    existingWorkflow?.wife?.address || defaultWife?.address || 'شارع محمد الخامس، إقامة النخيل، رقم 4'
  );
  const [wifeCity, setWifeCity] = useState<string>(
    existingWorkflow?.wife?.city || 'طنجة'
  );
  const [wifeCountry, setWifeCountry] = useState<string>(
    existingWorkflow?.wife?.country || 'المملكة المغربية'
  );

  // Import Wife Data Helper
  const handleImportWifeFromMarriage = () => {
    if (state.buyers?.[0]?.name) {
      const parts = state.buyers[0].name.split(' ');
      setWifeFirstNameAr(parts[0] || 'أمينة');
      setWifeLastNameAr(parts.slice(1).join(' ') || 'الوزاني');
    }
    if (state.buyers?.[0]?.idNumber) {
      setWifeIdNumber(state.buyers[0].idNumber);
    }
    if (state.buyers?.[0]?.address) {
      setWifeAddress(state.buyers[0].address);
    }
    if (state.buyers?.[0]?.fatherName) {
      setWifeFatherName(state.buyers[0].fatherName);
    }
  };

  // Stage 5: مرجع رسم الزواج
  const [marriageDeedType, setMarriageDeedType] = useState<string>(
    existingWorkflow?.marriageRef?.marriageDeedType || 'رسم زواج شرعي'
  );
  const [bookType, setBookType] = useState<string>(
    existingWorkflow?.marriageRef?.bookType || 'سجل أنكحة'
  );
  const [bookNumber, setBookNumber] = useState<string>(
    existingWorkflow?.marriageRef?.bookNumber || '14'
  );
  const [pageNumber, setPageNumber] = useState<string>(
    existingWorkflow?.marriageRef?.pageNumber || '85'
  );
  const [deedNumber, setDeedNumber] = useState<string>(
    existingWorkflow?.marriageRef?.deedNumber || '230'
  );
  const [deedDate, setDeedDate] = useState<string>(
    existingWorkflow?.marriageRef?.deedDate || '2019-11-10'
  );
  const [issuingCourt, setIssuingCourt] = useState<string>(
    existingWorkflow?.marriageRef?.issuingCourt || 'المحكمة الابتدائية بطنجة قسم قضاء الأسرة'
  );

  // Stage 6: عدد الطلاق
  const [divorceCount, setDivorceCount] = useState<'first' | 'second' | 'third'>(
    existingWorkflow?.divorceCount || (classification?.divorceCount === 'second' ? 'second' : 'first')
  );

  // Stage 7: التحقق من واقعة البناء
  const [consummationHappened, setConsummationHappened] = useState<boolean>(
    existingWorkflow?.consummationHappened ?? true
  );

  // Stage 8: أهلية الإيقاع
  const [freeWill, setFreeWill] = useState<boolean>(
    existingWorkflow?.husbandCapacity?.freeWill ?? true
  );
  const [coerced, setCoerced] = useState<boolean>(
    existingWorkflow?.husbandCapacity?.coerced ?? false
  );
  const [intoxicated, setIntoxicated] = useState<boolean>(
    existingWorkflow?.husbandCapacity?.intoxicated ?? false
  );
  const [extremeAnger, setExtremeAnger] = useState<boolean>(
    existingWorkflow?.husbandCapacity?.extremeAnger ?? false
  );

  // Stage 9: المستحقات
  const [duesSpecifiedByCourt, setDuesSpecifiedByCourt] = useState<boolean>(
    existingWorkflow?.duesSpecifiedByCourt ?? true
  );
  const [deferredDowry, setDeferredDowry] = useState<number>(
    existingWorkflow?.dues?.deferredDowry ?? 0
  );
  const [iddahMaintenance, setIddahMaintenance] = useState<number>(
    existingWorkflow?.dues?.iddahMaintenance ?? 6000
  );
  const [mutah, setMutah] = useState<number>(
    existingWorkflow?.dues?.mutah ?? 15000
  );
  const [housingDuringIddah, setHousingDuringIddah] = useState<number>(
    existingWorkflow?.dues?.housingDuringIddah ?? 4500
  );
  const [childrenDues, setChildrenDues] = useState<number>(
    existingWorkflow?.dues?.childrenDues ?? 5000
  );

  const duesTotal = useMemo(() => {
    if (!duesSpecifiedByCourt) return 0;
    return (
      (deferredDowry || 0) +
      (iddahMaintenance || 0) +
      (mutah || 0) +
      (housingDuringIddah || 0) +
      (childrenDues || 0)
    );
  }, [duesSpecifiedByCourt, deferredDowry, iddahMaintenance, mutah, housingDuringIddah, childrenDues]);

  const duesTotalInWords = useMemo(() => {
    return convertNumberToArabicWords(duesTotal, ' درهماً مغربياً');
  }, [duesTotal]);

  // Stage 10: إيداع المستحقات
  const [duesDeposited, setDuesDeposited] = useState<boolean>(
    existingWorkflow?.duesDeposited ?? true
  );
  const [depositAmount, setDepositAmount] = useState<number>(
    existingWorkflow?.depositDetails?.depositAmount ?? (duesTotal || 30500)
  );
  const [receiptNumber, setReceiptNumber] = useState<string>(
    existingWorkflow?.depositDetails?.receiptNumber || 'REC-89412/2026'
  );
  const [depositDate, setDepositDate] = useState<string>(
    existingWorkflow?.depositDetails?.depositDate || '2026-05-25'
  );
  const [depositCourt, setDepositCourt] = useState<string>(
    existingWorkflow?.depositDetails?.depositCourt || 'صندوق المحكمة الابتدائية بطنجة'
  );
  const [deadlineDays] = useState<number>(30);

  // Check deposit deadline logic
  const isDepositWithinDeadline = useMemo(() => {
    if (!permissionDate || !depositDate) return true;
    const permTime = new Date(permissionDate).getTime();
    const depTime = new Date(depositDate).getTime();
    if (isNaN(permTime) || isNaN(depTime)) return true;
    const diffDays = Math.round((depTime - permTime) / (1000 * 60 * 60 * 24));
    return diffDays <= deadlineDays && diffDays >= 0;
  }, [permissionDate, depositDate, deadlineDays]);

  // Stage 11: الأبناء
  const [hasChildren, setHasChildren] = useState<boolean>(
    existingWorkflow?.hasChildren ?? true
  );
  const [totalChildrenCount, setTotalChildrenCount] = useState<number>(
    existingWorkflow?.totalChildrenCount ?? 2
  );
  const [boysCount, setBoysCount] = useState<number>(
    existingWorkflow?.boysCount ?? 1
  );
  const [girlsCount, setGirlsCount] = useState<number>(
    existingWorkflow?.girlsCount ?? 1
  );

  const isChildrenCountMatching = useMemo(() => {
    if (!hasChildren) return true;
    return boysCount + girlsCount === totalChildrenCount;
  }, [hasChildren, boysCount, girlsCount, totalChildrenCount]);

  // Stage 12: بطاقات الأبناء
  const [childrenList, setChildrenList] = useState<RevocableChildData[]>(
    existingWorkflow?.childrenList || [
      {
        id: 'child-1',
        firstName: 'يوسف',
        lastName: 'العلمي',
        gender: 'ذكر',
        birthDate: '2021-03-10',
        birthPlace: 'طنجة',
        healthStatus: 'سليم معافى بحالة جيدة',
        educationStatus: 'التعليم الأولي - روض الأطفال'
      },
      {
        id: 'child-2',
        firstName: 'مريم',
        lastName: 'العلمي',
        gender: 'أنثى',
        birthDate: '2023-07-22',
        birthPlace: 'طنجة',
        healthStatus: 'سليمة معافاة بحالة جيدة',
        educationStatus: 'دون سن التمدرس'
      }
    ]
  );

  const handleAddChild = () => {
    const nextIdx = childrenList.length + 1;
    const newChild: RevocableChildData = {
      id: `child-${Date.now()}`,
      firstName: '',
      lastName: husbandLastNameAr || 'العلمي',
      gender: 'ذكر',
      birthDate: '2022-01-01',
      birthPlace: husbandCity || 'طنجة',
      healthStatus: 'سليم معافى',
      educationStatus: 'متمدرس'
    };
    setChildrenList((prev) => [...prev, newChild]);
    setTotalChildrenCount((prev) => prev + 1);
    setBoysCount((prev) => prev + 1);
  };

  const handleRemoveChild = (id: string) => {
    setChildrenList((prev) => prev.filter((c) => c.id !== id));
    setTotalChildrenCount((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateChild = (id: string, field: keyof RevocableChildData, value: any) => {
    setChildrenList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Stage 13: حالة الحمل
  const [pregnancyStatus, setPregnancyStatus] = useState<'yes' | 'no' | 'unknown'>(
    existingWorkflow?.pregnancyStatus || 'no'
  );

  // Sync to parent state package
  const packageWorkflowData = (): RevocableDivorceWorkflowData => {
    return {
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
        marriageDeedType,
        bookType,
        bookNumber,
        pageNumber,
        deedNumber,
        deedDate,
        issuingCourt
      },
      divorceCount,
      divorceNature: 'طلاق رجعي',
      consummationHappened,
      husbandCapacity: {
        freeWill,
        coerced,
        intoxicated,
        extremeAnger
      },
      duesSpecifiedByCourt,
      dues: {
        deferredDowry,
        iddahMaintenance,
        mutah,
        housingDuringIddah,
        childrenDues,
        totalAmount: duesTotal,
        totalAmountInWords: duesTotalInWords
      },
      duesDeposited,
      depositDetails: {
        depositAmount,
        depositAmountInWords: convertNumberToArabicWords(depositAmount, ' درهماً'),
        receiptNumber,
        depositDate,
        depositCourt,
        deadlineDays,
        isWithinDeadline: isDepositWithinDeadline
      },
      hasChildren,
      totalChildrenCount,
      boysCount,
      girlsCount,
      childrenList,
      pregnancyStatus,
      completedAt: new Date().toISOString()
    };
  };

  // Stage validation rule
  const isCurrentStageValid = useMemo(() => {
    switch (currentStage) {
      case 1:
        return hasJudicialPermission && permissionNumber.trim().length > 0;
      case 2:
        return attendeeType === 'husband' || attendeeType === 'both';
      case 3:
        return husbandFirstNameAr.trim().length > 0 && husbandIdNumber.trim().length > 0;
      case 4:
        return wifeFirstNameAr.trim().length > 0 && wifeIdNumber.trim().length > 0;
      case 5:
        return deedNumber.trim().length > 0;
      case 6:
        return true;
      case 7:
        return true;
      case 8:
        return true;
      case 9:
        return true;
      case 10:
        return true;
      case 11:
        return !hasChildren || isChildrenCountMatching;
      case 12:
        return true;
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
    permissionNumber,
    attendeeType,
    husbandFirstNameAr,
    husbandIdNumber,
    wifeFirstNameAr,
    wifeIdNumber,
    deedNumber,
    hasChildren,
    isChildrenCountMatching
  ]);

  const handleNextStage = () => {
    if (currentStage === 11 && !hasChildren) {
      setCurrentStage(13); // skip stage 12 if no children
      return;
    }
    if (currentStage < 14) {
      setCurrentStage((prev) => prev + 1);
    }
  };

  const handlePrevStage = () => {
    if (currentStage === 13 && !hasChildren) {
      setCurrentStage(11);
      return;
    }
    if (currentStage > 1) {
      setCurrentStage((prev) => prev - 1);
    }
  };

  // Final Action: الانتقال إلى تحرير الرسم
  const handleFinalProceedToDraft = () => {
    const packaged = packageWorkflowData();
    setState((prev) => ({
      ...prev,
      divorceClassification: {
        ...(prev.divorceClassification || {
          primaryType: 'revocable',
          statisticalCode: 'D-03'
        }),
        primaryType: 'revocable',
        statisticalCode: 'D-03',
        divorceCount: divorceCount === 'third' ? 'other' : divorceCount,
        wifePresence: attendeeType === 'both' ? 'present' : 'absent',
        revocableWorkflow: packaged
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
      draft: generateRevocableDivorceDraft({
        ...prev,
        divorceClassification: {
          ...(prev.divorceClassification || {
            primaryType: 'revocable',
            statisticalCode: 'D-03'
          }),
          primaryType: 'revocable',
          statisticalCode: 'D-03',
          divorceCount: divorceCount === 'third' ? 'other' : divorceCount,
          wifePresence: attendeeType === 'both' ? 'present' : 'absent',
          revocableWorkflow: packaged
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
      } as any),
      step: 7 // Proceed directly to Step 7 (Final Review & Smart Drafting)
    }));

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
    { num: 8, label: 'أهلية الإيقاع' },
    { num: 9, label: 'المستحقات' },
    { num: 10, label: 'إيداع المستحقات' },
    { num: 11, label: 'الأبناء' },
    { num: 12, label: 'بطاقة الأبناء' },
    { num: 13, label: 'حالة الحمل' },
    { num: 14, label: 'المراجعة الشاملة' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn pb-16 font-sans" dir="rtl">
      {/* 🏛️ Top Header Banner - Authentic Moroccan Judicial Elegance */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-2">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>المسار التوثيقي المعتمد — كود إحصائي وطني: D-03</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5 text-white">
              <span>🏛️ مسطرة الطلاق الرجعي</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              مسار التدقيق الشرعي والقانوني وفق أحكام مدونة الأسرة المغربية (المواد 121 إلى 125).
              استكمال المراحل الـ 14 بدقة للتحقق من الأهلية والمستحقات وحقوق الأبناء قبل التحرير.
            </p>
          </div>

          {onBackToClassification && (
            <button
              type="button"
              onClick={onBackToClassification}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all self-start sm:self-center flex items-center gap-1.5 shadow-sm"
            >
              <span>↩ العودة لبوابة التصنيف</span>
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-bold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono font-black">
                {currentStage}
              </span>
              <span>المرحلة {currentStage} من 14:</span>
              <span className="text-emerald-400 font-extrabold">{stagesList[currentStage - 1]?.label}</span>
            </span>
            <span className="font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-2.5 py-0.5 rounded-lg text-[11px]">
              {Math.round((currentStage / 14) * 100)}% مكتمل
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStage / 14) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 🛑 LEGAL WARNING: Divorce before consummation is not revocable */}
      {classification?.consummationStatus === 'before_consummation' && (
        <div className="flex items-start gap-4 p-5 bg-red-50 border-2 border-red-400 rounded-2xl shadow-sm" dir="rtl">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-700" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-extrabold text-red-900 flex items-center gap-2">
              🛑 تحذير تكييف قانوني
            </h4>
            <p className="text-xs text-red-800 leading-relaxed">
              اخترتم طلاقاً <strong>قبل الدخول والبناء</strong>. ينبّه النظام إلى أن الطلاق قبل البناء هو بائن بينونة صغرى بقوة القانون طبقاً للمادة 123 من مدونة الأسرة، <strong>ولا تنطبق عليه أحكام الرجعة</strong>، إذ لا رجعة إلا لمن طلّق بعد الدخول.
            </p>
            <p className="text-xs text-red-700 font-bold">
              يرجى العودة إلى تصنيف المسطرة واختيار بيت الطلاق الاتفاقي أو البائن المناسب.
            </p>
            {onBackToClassification && (
              <button
                type="button"
                onClick={onBackToClassification}
                className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm"
              >
                <span>⚙️ العودة لتغيير مسار الطلاق</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🧭 Horizontal Quick Nav Pills (All 14 Stages in a clean, scrollable horizontal bar) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {stagesList.map((s) => {
            const isActive = currentStage === s.num;
            const isPassed = currentStage > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStage(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                    : isPassed
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono ${
                    isActive
                      ? 'bg-white text-emerald-700 font-black'
                      : isPassed
                      ? 'bg-emerald-200 text-emerald-900 font-bold'
                      : 'bg-slate-200 text-slate-700 font-bold'
                  }`}
                >
                  {isPassed ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📋 Main Card Stage Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">

        {/* ========================================================================= */}
        {/* المرحلة 01 — الإذن القضائي بالإشهاد بالطلاق */}
        {/* ========================================================================= */}
        {currentStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 01 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>📜 الإذن بالإشهاد بالطلاق</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى إدخال بيانات الإذن القضائي الصادر بالإشهاد بالطلاق، قبل الانتقال إلى استكمال باقي بيانات الرسم.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل يوجد إذن قضائي بالإشهاد بالطلاق؟
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setHasJudicialPermission(true)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    hasJudicialPermission
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasJudicialPermission(false)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    !hasJudicialPermission
                      ? 'border-red-600 bg-red-50 text-red-950 shadow-sm ring-2 ring-red-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>🔘 لا</span>
                </button>
              </div>

              {!hasJudicialPermission && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 mt-4">
                  <span className="text-xl">🔴</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-red-900">لا يمكن متابعة هذه المسطرة</h4>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      يتعين التحقق من توفر الإذن القضائي اللازم للإشهاد بالطلاق قبل الانتقال إلى المرحلة التالية.
                    </p>
                  </div>
                </div>
              )}

              {hasJudicialPermission && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة *</label>
                      <input
                        type="text"
                        value={court}
                        onChange={(e) => setCourt(e.target.value)}
                        placeholder="المحكمة الابتدائية قسم قضاء الأسرة"
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">القسم / الجهة *</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="قسم قضاء الأسرة"
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-medium focus:bg-white focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الملف *</label>
                      <input
                        type="text"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                        placeholder="2026/1602/412"
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الإذن *</label>
                      <input
                        type="text"
                        value={permissionNumber}
                        onChange={(e) => setPermissionNumber(e.target.value)}
                        placeholder="785/2026"
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold text-emerald-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإذن *</label>
                      <input
                        type="date"
                        value={permissionDate}
                        onChange={(e) => setPermissionDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التوصل بالإذن *</label>
                      <input
                        type="date"
                        value={receptionDate}
                        onChange={(e) => setReceptionDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات العدل</label>
                      <input
                        type="text"
                        value={adoulNotes}
                        onChange={(e) => setAdoulNotes(e.target.value)}
                        placeholder="أي ملاحظات حول الإذن أو التوصل..."
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>🟢 تم تسجيل بيانات الإذن القضائي بنجاح.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 02 — تحديد الحاضر وطالب الإشهاد */}
        {/* ========================================================================= */}
        {currentStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 02 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>👥 من يحضر أمام العدل؟</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى تحديد صفة الشخص أو الأشخاص الحاضرين أمامكم لاستكمال إجراءات الإشهاد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'husband', title: '👨 الزوج', desc: 'حضور الزوج منفرداً طالباً الإشهاد على طلاقه الرجعي' },
                { id: 'wife', title: '👩 الزوجة', desc: 'حضور الزوجة وحدها بمجلس العقد' },
                { id: 'both', title: '👥 الزوج والزوجة معًا', desc: 'حضور كلا الزوجين معاً بمجلس العقد' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAttendeeType(opt.id as any)}
                  className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between ${
                    attendeeType === opt.id
                      ? opt.id === 'wife'
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-200'
                        : 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 mb-1">{opt.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                    <span className="text-xs font-bold text-emerald-700">
                      {attendeeType === opt.id ? 'تم الاختيار ✓' : 'اختيار'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* System Rule Feedback */}
            {attendeeType === 'wife' ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm text-amber-900">⚠️ تعذر متابعة المسطرة بهذه الصفة</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    لم يتم تسجيل حضور الزوج، وإنما تم اختيار الزوجة وحدها. يرجى التحقق من صفة طالب الإشهاد والحضور اللازم لاستكمال هذه المسطرة (الطلاق الرجعي يصدر بإرادة الزوج وإشهاده).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>🟢 يمكن متابعة المسطرة لاستيفاء شرط حضور طالب الإشهاد.</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 03 — بيانات الزوج */}
        {/* ========================================================================= */}
        {currentStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 03 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>👨 بيانات الزوج</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                الهوية والوثائق التعريفية والبيانات الشخصية الخاصة بالزوج طالب الإشهاد.
              </p>
            </div>

            {/* الهوية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">الهوية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية *</label>
                  <input
                    type="text"
                    value={husbandFirstNameAr}
                    onChange={(e) => setHusbandFirstNameAr(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي بالعربية *</label>
                  <input
                    type="text"
                    value={husbandLastNameAr}
                    onChange={(e) => setHusbandLastNameAr(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية (اختياري)</label>
                  <input
                    type="text"
                    value={husbandFirstNameFr}
                    onChange={(e) => setHusbandFirstNameFr(e.target.value)}
                    placeholder="Prénom"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية (اختياري)</label>
                  <input
                    type="text"
                    value={husbandLastNameFr}
                    onChange={(e) => setHusbandLastNameFr(e.target.value)}
                    placeholder="Nom"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={husbandNationality}
                    onChange={(e) => setHusbandNationality(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={husbandBirthDate}
                    onChange={(e) => setHusbandBirthDate(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
                  <input
                    type="text"
                    value={husbandBirthPlace}
                    onChange={(e) => setHusbandBirthPlace(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={husbandFatherName}
                    onChange={(e) => setHusbandFatherName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={husbandMotherName}
                    onChange={(e) => setHusbandMotherName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 🪪 وثيقة الهوية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">🪪 وثيقة الهوية</h4>
              <div className="flex flex-wrap gap-3 mb-2">
                {[
                  { id: 'cin', label: '🔘 البطاقة الوطنية للتعريف' },
                  { id: 'passport', label: '🔘 جواز السفر' },
                  { id: 'other', label: '🔘 وثيقة أخرى' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHusbandIdType(opt.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      husbandIdType === opt.id
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الوثيقة *</label>
                  <input
                    type="text"
                    value={husbandIdNumber}
                    onChange={(e) => setHusbandIdNumber(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">صالحة إلى غاية</label>
                  <input
                    type="date"
                    value={husbandIdExpiryDate}
                    onChange={(e) => setHusbandIdExpiryDate(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 🏠 البيانات الشخصية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">🏠 البيانات الشخصية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة</label>
                  <input
                    type="text"
                    value={husbandProfession}
                    onChange={(e) => setHusbandProfession(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={husbandCity}
                    onChange={(e) => setHusbandCity(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة</label>
                  <input
                    type="text"
                    value={husbandCountry}
                    onChange={(e) => setHusbandCountry(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">السكنى</label>
                  <input
                    type="text"
                    value={husbandAddress}
                    onChange={(e) => setHusbandAddress(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 04 — بيانات الزوجة */}
        {/* ========================================================================= */}
        {currentStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  المرحلة 04 من 14
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                  <span>👩 بيانات الزوجة</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  الهوية والوثائق التعريفية والبيانات الشخصية للمطلقة.
                </p>
              </div>

              <button
                type="button"
                onClick={handleImportWifeFromMarriage}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-2 self-start sm:self-center"
              >
                <span>🔄 استدعاء بيانات الزوجة من سجل الزواج</span>
              </button>
            </div>

            {/* الهوية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">الهوية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي بالعربية *</label>
                  <input
                    type="text"
                    value={wifeFirstNameAr}
                    onChange={(e) => setWifeFirstNameAr(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي بالعربية *</label>
                  <input
                    type="text"
                    value={wifeLastNameAr}
                    onChange={(e) => setWifeLastNameAr(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي باللاتينية عند الاقتضاء</label>
                  <input
                    type="text"
                    value={wifeFirstNameFr}
                    onChange={(e) => setWifeFirstNameFr(e.target.value)}
                    placeholder="Prénom"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي باللاتينية</label>
                  <input
                    type="text"
                    value={wifeLastNameFr}
                    onChange={(e) => setWifeLastNameFr(e.target.value)}
                    placeholder="Nom"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={wifeNationality}
                    onChange={(e) => setWifeNationality(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={wifeBirthDate}
                    onChange={(e) => setWifeBirthDate(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
                  <input
                    type="text"
                    value={wifeBirthPlace}
                    onChange={(e) => setWifeBirthPlace(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={wifeFatherName}
                    onChange={(e) => setWifeFatherName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={wifeMotherName}
                    onChange={(e) => setWifeMotherName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 🪪 وثيقة الهوية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">وثيقة الهوية</h4>
              <div className="flex flex-wrap gap-3 mb-2">
                {[
                  { id: 'cin', label: '🔘 البطاقة الوطنية للتعريف' },
                  { id: 'passport', label: '🔘 جواز السفر' },
                  { id: 'other', label: '🔘 وثيقة أخرى' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWifeIdType(opt.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      wifeIdType === opt.id
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الوثيقة *</label>
                  <input
                    type="text"
                    value={wifeIdNumber}
                    onChange={(e) => setWifeIdNumber(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الصلاحية</label>
                  <input
                    type="date"
                    value={wifeIdExpiryDate}
                    onChange={(e) => setWifeIdExpiryDate(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 🏠 البيانات الشخصية */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800">البيانات الشخصية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة</label>
                  <input
                    type="text"
                    value={wifeProfession}
                    onChange={(e) => setWifeProfession(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={wifeCity}
                    onChange={(e) => setWifeCity(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة</label>
                  <input
                    type="text"
                    value={wifeCountry}
                    onChange={(e) => setWifeCountry(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2 md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">السكنى</label>
                  <input
                    type="text"
                    value={wifeAddress}
                    onChange={(e) => setWifeAddress(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 05 — مرجع رسم الزواج */}
        {/* ========================================================================= */}
        {currentStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 05 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>💍 بيانات الزواج</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى إدخال أو مراجعة البيانات المرجعية لرسم الزواج الذي تقوم عليه هذه المسطرة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الرسم</label>
                <input
                  type="text"
                  value={marriageDeedType}
                  onChange={(e) => setMarriageDeedType(e.target.value)}
                  placeholder="رسم زواج شرعي"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مضمن بدفتر</label>
                <input
                  type="text"
                  value={bookType}
                  onChange={(e) => setBookType(e.target.value)}
                  placeholder="سجل أنكحة"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الدفتر</label>
                <input
                  type="text"
                  value={bookNumber}
                  onChange={(e) => setBookNumber(e.target.value)}
                  placeholder="14"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صفحة</label>
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="85"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد *</label>
                <input
                  type="text"
                  value={deedNumber}
                  onChange={(e) => setDeedNumber(e.target.value)}
                  placeholder="230"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بتاريخ</label>
                <input
                  type="date"
                  value={deedDate}
                  onChange={(e) => setDeedDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">الجهة التي صدر عنها الرسم</label>
                <input
                  type="text"
                  value={issuingCourt}
                  onChange={(e) => setIssuingCourt(e.target.value)}
                  placeholder="المحكمة الابتدائية بطنجة قسم قضاء الأسرة"
                  className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* بطاقة مختصرة تلقائية */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-3">
                <span>💍 مرجع الزواج (بطاقة الملخص التلقائي)</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">النوع:</span>
                  <span className="font-bold text-slate-900">{marriageDeedType || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">الدفتر:</span>
                  <span className="font-bold text-slate-900">{bookType || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">الرقم:</span>
                  <span className="font-bold text-slate-900 font-mono">{bookNumber || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">الصفحة:</span>
                  <span className="font-bold text-slate-900 font-mono">{pageNumber || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">العدد:</span>
                  <span className="font-bold text-emerald-800 font-mono">{deedNumber || '—'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">التاريخ:</span>
                  <span className="font-bold text-slate-900">{deedDate || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 06 — بيانات الطلاق الرجعي */}
        {/* ========================================================================= */}
        {currentStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 06 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>⚖️ بيانات الطلاق الرجعي</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد رتبة الطلقة وطبيعة المسطرة المعتمدة بدقة شرعية وقانونية.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  كم طلقة وقعت بين الزوجين إلى غاية الطلاق موضوع هذا الرسم؟
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setDivorceCount('first')}
                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col justify-between ${
                      divorceCount === 'first'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-base">🔵 الطلقة الأولى</span>
                      {divorceCount === 'first' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </div>
                    <span className="text-xs text-slate-600 font-normal">
                      أول طلاق يوقعه الزوج على زوجته
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDivorceCount('second')}
                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col justify-between ${
                      divorceCount === 'second'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-base">🟠 الطلقة الثانية</span>
                      {divorceCount === 'second' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                    </div>
                    <span className="text-xs text-slate-600 font-normal">
                      طلاق ثانٍ مسبوق برجعة أو مراجعة سابقة
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDivorceCount('third')}
                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex flex-col justify-between ${
                      divorceCount === 'third'
                        ? 'border-red-600 bg-red-50 text-red-900 shadow-sm ring-2 ring-red-200'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-base">🔴 الطلقة الثالثة</span>
                      {divorceCount === 'third' && <CheckCircle2 className="w-5 h-5 text-red-600" />}
                    </div>
                    <span className="text-xs text-slate-600 font-normal">
                      مكملة للثلاث (بينونة كبرى)
                    </span>
                  </button>
                </div>

                {divorceCount === 'third' && (
                  <div className="mt-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">تنبيه شرعي وقانوني (المادة 123 من مدونة الأسرة):</span>
                      <p className="mt-0.5 leading-relaxed">
                        الطلقة الثالثة تكمّل الثلاث وتُصير الطلاق بائناً بينونة كبرى، بحيث لا تحل له حتى تنكح زوجاً غيره نكاحاً شرعياً صحيحاً، ولا تبقى فيه رجعة.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* طبيعة الطلاق الثابتة */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl">
                <span className="text-xs font-semibold text-emerald-800 block mb-1">طبيعة الطلاق:</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-slate-800">نوع المسطرة:</span>
                    <span className="text-base font-extrabold text-emerald-900 bg-emerald-200/80 px-3 py-1 rounded-xl">
                      🟢 طلاق رجعي
                    </span>
                  </div>
                  <span className="text-xs text-emerald-800 font-mono font-bold">
                    كود الإحصائيات: D-03
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 07 — التحقق من واقعة البناء */}
        {/* ========================================================================= */}
        {currentStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 07 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>💍 هل حصل البناء بالزوجة؟</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                التحقق من الدخول الشرعي بالزوجة لكون الطلاق قبل البناء يقع بائناً لا رجعياً.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setConsummationHappened(true)}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    consummationHappened
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🔘 نعم (حصل البناء)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConsummationHappened(false)}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    !consummationHappened
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>🔘 لا (لم يحصل البناء)</span>
                </button>
              </div>

              {!consummationHappened ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 mt-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-900">⚠️ تنبيه للمراجعة</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      أفادت البيانات المدخلة بعدم حصول البناء. يرجى التحقق من تكييف المسطرة قبل متابعة إجراءات الإشهاد؛ إذ ينص القانون والشرع على أن الطلاق قبل البناء يقع بائناً بينونة صغرى لا رجعية فيه.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 تم إثبات البناء الشرعي بالزوجة والتحقق من صحة التكييف الرجعي.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 08 — التحقق من أهلية الإيقاع وحالة الزوج */}
        {/* ========================================================================= */}
        {currentStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 08 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>🧠 التحقق من أهلية الإيقاع</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                التحقق الفقهي والقانوني من سلامة إرادة واختيار الزوج وقت إيقاع الطلاق الرجعي.
              </p>
            </div>

            <div className="space-y-4">
              {/* Question 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">1. هل صدر الطلاق عن إرادة الزوج واختياره؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFreeWill(true)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      freeWill ? 'bg-emerald-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 نعم
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreeWill(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      !freeWill ? 'bg-red-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 لا
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">2. هل كان الزوج مكرهًا على إيقاع الطلاق؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCoerced(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      !coerced ? 'bg-emerald-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 لا
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoerced(true)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      coerced ? 'bg-red-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 نعم
                  </button>
                </div>
              </div>

              {/* Question 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">3. هل كان الزوج في حالة سكر طافح؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIntoxicated(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      !intoxicated ? 'bg-emerald-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 لا
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntoxicated(true)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      intoxicated ? 'bg-red-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 نعم
                  </button>
                </div>
              </div>

              {/* Question 4 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">4. هل كان الزوج في حالة غضب مطبق؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExtremeAnger(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      !extremeAnger ? 'bg-emerald-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 لا
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtremeAnger(true)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      extremeAnger ? 'bg-red-600 text-white shadow' : 'bg-white border text-slate-700'
                    }`}
                  >
                    🔘 نعم
                  </button>
                </div>
              </div>

              {/* Legal Warning Notice if an affecting answer exists */}
              {(!freeWill || coerced || intoxicated || extremeAnger) ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 mt-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-900">⚠️ مراجعة قانونية مطلوبة</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      تتضمن البيانات المدخلة واقعة تستوجب التحقق قبل مواصلة إجراءات الإشهاد؛ حيث يشترط لصحة الطلاق كمال الأهلية والاختيار وسلامة الإدراك.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 ثبت سلامة إرادة واختيار الزوج وخلو الإيقاع من عوارض الأهلية المانعة.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 09 — المستحقات */}
        {/* ========================================================================= */}
        {currentStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 09 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>💰 مستحقات الزوجة والأطفال</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد المبالغ المالية المستحقة للمطلقة والأطفال المحكوم بها من طرف قضاء الأسرة.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل تم تحديد المستحقات من طرف المحكمة؟
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setDuesSpecifiedByCourt(true)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    duesSpecifiedByCourt
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDuesSpecifiedByCourt(false)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    !duesSpecifiedByCourt
                      ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 لا</span>
                </button>
              </div>

              {duesSpecifiedByCourt && (
                <div className="space-y-4 pt-2">
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                    <span className="text-xs font-extrabold text-slate-900 block">مستحقات الزوجة:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الصداق المؤخر إن وجد (بالدرهم)</label>
                        <input
                          type="number"
                          value={deferredDowry}
                          onChange={(e) => setDeferredDowry(Number(e.target.value))}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">نفقة العدة (بالدرهم) *</label>
                        <input
                          type="number"
                          value={iddahMaintenance}
                          onChange={(e) => setIddahMaintenance(Number(e.target.value))}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">المتعة (بالدرهم) *</label>
                        <input
                          type="number"
                          value={mutah}
                          onChange={(e) => setMutah(Number(e.target.value))}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">السكنى خلال العدة عند الاقتضاء (بالدرهم)</label>
                        <input
                          type="number"
                          value={housingDuringIddah}
                          onChange={(e) => setHousingDuringIddah(Number(e.target.value))}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-xs font-extrabold text-slate-900 block mb-2">مستحقات الأطفال:</span>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">مستحقات ونفقة الأطفال (بالدرهم)</label>
                        <input
                          type="number"
                          value={childrenDues}
                          onChange={(e) => setChildrenDues(Number(e.target.value))}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automatic Sum Summary Card */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 block">الإجمالي بالأرقام:</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                        {duesTotal.toLocaleString('ar-MA')} درهم
                      </span>
                    </div>
                    <div className="sm:text-left sm:max-w-md">
                      <span className="text-[11px] text-slate-500 block">الإجمالي بالحروف (يولد تلقائياً):</span>
                      <span className="text-xs font-extrabold text-emerald-900 leading-snug">
                        {duesTotalInWords}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 10 — إيداع المستحقات بكتابة الضبط */}
        {/* ========================================================================= */}
        {currentStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 10 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>🏦 وضع المستحقات رهن إشارة المستفيدين</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                التحقق من إيداع الزوج للمستحقات المحددة بصندوق المحكمة داخل الأجل القانوني.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل أودع الزوج المستحقات المحددة بكتابة ضبط المحكمة؟
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setDuesDeposited(true)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    duesDeposited
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDuesDeposited(false)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    !duesDeposited
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 لا</span>
                </button>
              </div>

              {duesDeposited && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المودع بالأرقام (بالدرهم) *</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ بالحروف (يولد تلقائياً)</label>
                      <input
                        type="text"
                        readOnly
                        value={convertNumberToArabicWords(depositAmount, ' درهماً')}
                        className="w-full p-2.5 text-xs bg-slate-100 border border-slate-300 rounded-xl font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم وصل الإيداع *</label>
                      <input
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="REC-89412/2026"
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold text-emerald-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإيداع *</label>
                      <input
                        type="date"
                        value={depositDate}
                        onChange={(e) => setDepositDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة المودع بصندوقها *</label>
                      <input
                        type="text"
                        value={depositCourt}
                        onChange={(e) => setDepositCourt(e.target.value)}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Deadline Comparison Alert */}
                  {isDepositWithinDeadline ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span>🟢 تم الإيداع داخل الأجل المحدد قانوناً وقضائياً.</span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span>🟠 يرجى مراجعة تاريخ الإيداع والأجل المحدد من المحكمة (المحدد في {deadlineDays} يوماً).</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 11 — الأبناء */}
        {/* ========================================================================= */}
        {currentStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 11 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>👨‍👩‍👧‍👦 أبناء الزوجين</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد وجود الأبناء وإجمالي عددهم وتوزيعهم بحسب الجنس.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل للزوجين أبناء؟
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setHasChildren(true)}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    hasChildren
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🔘 نعم</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasChildren(false);
                    setTotalChildrenCount(0);
                    setBoysCount(0);
                    setGirlsCount(0);
                  }}
                  className={`p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    !hasChildren
                      ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 لا (لا يوجد أبناء)</span>
                </button>
              </div>

              {hasChildren && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي عدد الأبناء *</label>
                      <input
                        type="number"
                        min="1"
                        value={totalChildrenCount}
                        onChange={(e) => setTotalChildrenCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-extrabold text-center text-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ذكور 👦 *</label>
                      <input
                        type="number"
                        min="0"
                        value={boysCount}
                        onChange={(e) => setBoysCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold text-center text-lg text-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">إناث 👧 *</label>
                      <input
                        type="number"
                        min="0"
                        value={girlsCount}
                        onChange={(e) => setGirlsCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl font-mono font-bold text-center text-lg text-rose-900"
                      />
                    </div>
                  </div>

                  {/* Equality Validation: عدد الذكور + عدد الإناث = إجمالي الأبناء */}
                  {!isChildrenCountMatching ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-sm text-amber-900">⚠️ البيانات غير متطابقة</h4>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          يرجى مراجعة عدد الأبناء وتصنيفهم حسب الجنس (مجموع الذكور {boysCount} + الإناث {girlsCount} لا يساوي العدد الإجمالي {totalChildrenCount}).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>🟢 عدد الأبناء متطابق تماماً ({boysCount} ذكور + {girlsCount} إناث = {totalChildrenCount}).</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 12 — بطاقة كل ابن */}
        {/* ========================================================================= */}
        {currentStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  المرحلة 12 من 14
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                  <span>👶 بطاقة بيانات كل ابن</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  تسجيل التفاصيل الشخصية والصحية والدراسية لكل ابن، وحساب العمر تلقائياً.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddChild}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>＋ إضافة ابن</span>
              </button>
            </div>

            <div className="space-y-4">
              {childrenList.map((child, idx) => {
                const age = calculateAge(child.birthDate);
                return (
                  <div
                    key={child.id}
                    className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-sm">
                          {child.gender === 'ذكر' ? '👦' : '👧'} الابن رقم {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs font-bold text-slate-700 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          العمر: {age} {age === 1 ? 'سنة' : age === 2 ? 'سنتان' : age >= 3 && age <= 10 ? 'سنوات' : 'سنة'} (محسوب تلقائياً)
                        </span>
                      </div>

                      {childrenList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChild(child.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                          title="حذف هذا الابن"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي *</label>
                        <input
                          type="text"
                          value={child.firstName}
                          onChange={(e) => handleUpdateChild(child.id, 'firstName', e.target.value)}
                          placeholder="الاسم الشخصي"
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي *</label>
                        <input
                          type="text"
                          value={child.lastName}
                          onChange={(e) => handleUpdateChild(child.id, 'lastName', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنس *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateChild(child.id, 'gender', 'ذكر')}
                            className={`p-1.5 rounded-lg text-xs font-bold text-center border ${
                              child.gender === 'ذكر'
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            👦 ذكر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateChild(child.id, 'gender', 'أنثى')}
                            className={`p-1.5 rounded-lg text-xs font-bold text-center border ${
                              child.gender === 'أنثى'
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            👧 أنثى
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد *</label>
                        <input
                          type="date"
                          value={child.birthDate}
                          onChange={(e) => handleUpdateChild(child.id, 'birthDate', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
                        <input
                          type="text"
                          value={child.birthPlace}
                          onChange={(e) => handleUpdateChild(child.id, 'birthPlace', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الوضع الصحي</label>
                        <input
                          type="text"
                          value={child.healthStatus}
                          onChange={(e) => handleUpdateChild(child.id, 'healthStatus', e.target.value)}
                          placeholder="سليم معافى"
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الوضع الدراسي</label>
                        <input
                          type="text"
                          value={child.educationStatus}
                          onChange={(e) => handleUpdateChild(child.id, 'educationStatus', e.target.value)}
                          placeholder="متمدرس بالمستوى الابتدائي"
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 13 — حالة الحمل */}
        {/* ========================================================================= */}
        {currentStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 13 من 14
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                <span>🤰 هل الزوجة حامل وقت الإشهاد؟</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد وضع الحمل بالنظر لآثاره المباشرة في تحديد مدة العدة ونفقة الحمل.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                <button
                  type="button"
                  onClick={() => setPregnancyStatus('yes')}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    pregnancyStatus === 'yes'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 نعم (حامل)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPregnancyStatus('no')}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    pregnancyStatus === 'no'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 لا (غير حامل)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPregnancyStatus('unknown')}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    pregnancyStatus === 'unknown'
                      ? 'border-slate-700 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>🔘 غير معلوم</span>
                </button>
              </div>

              {pregnancyStatus === 'yes' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 mt-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-900">🟠 تنبيه شرعي وقانوني:</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      تم تسجيل الحمل. يرجى التأكد من إدراج هذه المعطيات ضمن البيانات التي يتطلبها مسار الطلاق وآثاره؛ حيث تنتهي عدة الحامل بوضع حملها طبقاً لأحكام مدونة الأسرة.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 14 — المراجعة الشاملة */}
        {/* ========================================================================= */}
        {currentStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                المرحلة 14 من 14 — شاشة المراجعة الشاملة
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🔎 مراجعة بيانات الطلاق الرجعي</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                لوحة الفحص والتدقيق النهائي لكافة محاور ومراحل رسم الطلاق الرجعي قبل بدء التحرير الرسمي.
              </p>
            </div>

            {/* بطاقات المراجعة الـ 9 بتصميم راقٍ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. الإذن القضائي */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>📜 الإذن القضائي</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 متوفر</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">رقم الإذن:</span> <span className="font-mono font-bold text-slate-900">{permissionNumber}</span></p>
                  <p><span className="font-semibold text-slate-800">تاريخه:</span> {permissionDate}</p>
                  <p><span className="font-semibold text-slate-800">المحكمة:</span> {court}</p>
                </div>
              </div>

              {/* 2. الزوج */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>👨 الزوج</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 البيانات مكتملة</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p className="font-bold text-slate-900">{husbandFirstNameAr} {husbandLastNameAr}</p>
                  <p><span className="font-semibold text-slate-800">ب.ت.و:</span> <span className="font-mono font-bold text-slate-900">{husbandIdNumber}</span></p>
                  <p><span className="font-semibold text-slate-800">المهنة والسكن:</span> {husbandProfession} - {husbandCity}</p>
                </div>
              </div>

              {/* 3. الزوجة */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>👩 الزوجة</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 البيانات مكتملة</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p className="font-bold text-slate-900">{wifeFirstNameAr} {wifeLastNameAr}</p>
                  <p><span className="font-semibold text-slate-800">ب.ت.و:</span> <span className="font-mono font-bold text-slate-900">{wifeIdNumber}</span></p>
                  <p><span className="font-semibold text-slate-800">المهنة والسكن:</span> {wifeProfession} - {wifeCity}</p>
                </div>
              </div>

              {/* 4. الزواج */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>💍 الزواج</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 المرجع مكتمل</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">الرسم:</span> {marriageDeedType} عدد <span className="font-mono font-bold text-slate-900">{deedNumber}</span></p>
                  <p><span className="font-semibold text-slate-800">التاريخ:</span> {deedDate}</p>
                  <p><span className="font-semibold text-slate-800">الدفتر/الصفحة:</span> دفتر {bookNumber} ص {pageNumber}</p>
                </div>
              </div>

              {/* 5. الطلاق */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>⚖️ الطلاق</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 {divorceCount === 'first' ? 'الطلقة الأولى' : divorceCount === 'second' ? 'الطلقة الثانية' : 'الطلقة الثالثة'}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">النوع:</span> طلاق رجعي (المواد 121-123)</p>
                  <p><span className="font-semibold text-slate-800">البناء:</span> {consummationHappened ? 'حاصل بالزوجة ✓' : 'غير حاصل'}</p>
                  <p><span className="font-semibold text-slate-800">أهلية الإيقاع:</span> إرادة حرة واختيار صحيح ✓</p>
                </div>
              </div>

              {/* 6. المستحقات */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>💰 المستحقات</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 تم التحقق من البيانات</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">المجموع:</span> <span className="font-mono font-bold text-emerald-800 text-sm">{duesTotal.toLocaleString('ar-MA')} درهم</span></p>
                  <p className="text-[10px] text-slate-500 leading-snug">{duesTotalInWords}</p>
                </div>
              </div>

              {/* 7. الإيداع */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>🏦 الإيداع</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 تم تسجيل الإيداع</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">رقم الوصل:</span> <span className="font-mono font-bold text-slate-900">{receiptNumber}</span></p>
                  <p><span className="font-semibold text-slate-800">تاريخ الإيداع:</span> {depositDate}</p>
                  <p><span className="font-semibold text-slate-800">المحكمة:</span> {depositCourt}</p>
                </div>
              </div>

              {/* 8. الأبناء */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>👶 الأبناء</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 البيانات مكتملة</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">الإجمالي:</span> {hasChildren ? `${totalChildrenCount} (${boysCount} ذكور + ${girlsCount} إناث)` : 'لا يوجد أبناء'}</p>
                  <p><span className="font-semibold text-slate-800">البطاقات المسجلة:</span> {hasChildren ? `${childrenList.length} بطاقة` : '—'}</p>
                </div>
              </div>

              {/* 9. الحمل */}
              <div className="border border-slate-200 bg-slate-50/60 p-4 rounded-2xl space-y-2 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>🤰 الحمل</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>🟢 {pregnancyStatus === 'no' ? 'لا يوجد' : pregnancyStatus === 'yes' ? 'حامل' : 'غير معلوم'}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <p><span className="font-semibold text-slate-800">حالة المطلقة:</span> {pregnancyStatus === 'yes' ? 'حامل (العدة وضع الحمل)' : 'غير حامل'}</p>
                </div>
              </div>
            </div>

            {/* Bottom Final Readiness Card & Big Proceed Button */}
            <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 mt-6 border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-2xl font-black">
                  ✓
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-emerald-300">
                    ✅ اكتملت مرحلة جمع والتحقق الأولي من المعطيات
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    يمكن الانتقال إلى مرحلة تحرير رسم الطلاق الرجعي واعتماده في السجلات الرسمية.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinalProceedToDraft}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-base font-extrabold shadow-lg shadow-emerald-950/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
              >
                <span className="text-xl">✍️</span>
                <span>الانتقال إلى تحرير الرسم</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons (السابق / التالي) for stages 1 to 13 */}
        {currentStage < 14 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={handlePrevStage}
              disabled={currentStage === 1}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                currentStage === 1
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={handleNextStage}
              disabled={!isCurrentStageValid}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow flex items-center gap-2 transition-all ${
                isCurrentStageValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>
                {currentStage === 1
                  ? 'التالي ← بيانات الحاضرين'
                  : currentStage === 13
                  ? 'التالي ← المراجعة الشاملة'
                  : 'التالي'}
              </span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
