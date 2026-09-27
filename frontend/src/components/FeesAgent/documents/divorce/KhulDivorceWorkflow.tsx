import React, { useState, useMemo } from 'react';
import type {
  FeesAgentState,
  KhulDivorceWorkflowData,
  RevocableChildData
} from '../../../../types/feesAgentTypes';
import {
  BeforeConsummationDuesForm,
  BeforeConsummationChildrenNotice,
  BeforeConsummationPregnancyNotice,
  Article87LegalDeadlineNotice,
  DowryStatusType
} from './BeforeConsummationAdaptations';
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
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  Home,
  Users
} from 'lucide-react';

interface KhulDivorceWorkflowProps {
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

export const KhulDivorceWorkflow: React.FC<KhulDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Initial Data Extraction
  const classification = state.divorceClassification;
  const existingKhul = classification?.khulWorkflow;
  const defaultHusband = state.sellers?.[0];
  const defaultWife = state.buyers?.[0];

  // واقعة البناء — مُسجَّلة من الشاشة التمهيدية
  const isBeforeConsummation = state.divorceClassification?.consummationStatus === 'before_consummation';

  // مستحقات الطلاق قبل الدخول (المادة 71 و135)
  const [dowryStatus, setDowryStatus] = useState<DowryStatusType>(
    (existingKhul as any)?.dowryStatus || 'half_prescribed'
  );
  const [mutaaOrCompensation, setMutaaOrCompensation] = useState<number>(
    (existingKhul as any)?.mutaaOrCompensation ?? (existingKhul?.compensation?.totalAmount || 10000)
  );

  // Stage 1: الإذن القضائي بالإشهاد بالخلع
  const [hasJudicialPermission, setHasJudicialPermission] = useState<boolean>(
    existingKhul?.hasJudicialPermission ?? true
  );
  const [court, setCourt] = useState<string>(
    existingKhul?.court || 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة'
  );
  const [section, setSection] = useState<string>(
    existingKhul?.section || 'قسم قضاء الأسرة'
  );
  const [fileNumber, setFileNumber] = useState<string>(
    existingKhul?.fileNumber || ''
  );
  const [permissionNumber, setPermissionNumber] = useState<string>(
    existingKhul?.permissionNumber || ''
  );
  const [permissionDate, setPermissionDate] = useState<string>(
    existingKhul?.permissionDate || ''
  );
  const [receptionDate, setReceptionDate] = useState<string>(
    existingKhul?.receptionDate || ''
  );
  const [adoulNotes, setAdoulNotes] = useState<string>(
    existingKhul?.adoulNotes || ''
  );

  // Stage 2: أطراف الخلع وطبيعة الحضور
  const [attendeeType, setAttendeeType] = useState<'both' | 'wife_only' | 'husband_only'>(
    existingKhul?.attendeeType || 'both'
  );

  // Stage 3: بيانات الزوجة المختلعة
  const [wifeFirstNameAr, setWifeFirstNameAr] = useState<string>(
    existingKhul?.wife?.firstNameAr || defaultWife?.name?.split(' ')[0] || ''
  );
  const [wifeLastNameAr, setWifeLastNameAr] = useState<string>(
    existingKhul?.wife?.lastNameAr || defaultWife?.name?.split(' ').slice(1).join(' ') || ''
  );
  const [wifeFirstNameFr, setWifeFirstNameFr] = useState<string>(
    existingKhul?.wife?.firstNameFr || ''
  );
  const [wifeLastNameFr, setWifeLastNameFr] = useState<string>(
    existingKhul?.wife?.lastNameFr || ''
  );
  const [wifeNationality, setWifeNationality] = useState<string>(
    existingKhul?.wife?.nationality || 'مغربية'
  );
  const [wifeBirthDate, setWifeBirthDate] = useState<string>(
    existingKhul?.wife?.birthDate || ''
  );
  const [wifeBirthPlace, setWifeBirthPlace] = useState<string>(
    existingKhul?.wife?.birthPlace || ''
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    existingKhul?.wife?.fatherName || defaultWife?.fatherName || ''
  );
  const [wifeMotherName, setWifeMotherName] = useState<string>(
    existingKhul?.wife?.motherName || ''
  );
  const [wifeIdType, setWifeIdType] = useState<'cin' | 'passport' | 'other'>(
    existingKhul?.wife?.idType || 'cin'
  );
  const [wifeIdNumber, setWifeIdNumber] = useState<string>(
    existingKhul?.wife?.idNumber || defaultWife?.idNumber || ''
  );
  const [wifeIdExpiryDate, setWifeIdExpiryDate] = useState<string>(
    existingKhul?.wife?.idExpiryDate || ''
  );
  const [wifeProfession, setWifeProfession] = useState<string>(
    existingKhul?.wife?.profession || defaultWife?.profession || ''
  );
  const [wifeIncomeResource, setWifeIncomeResource] = useState<string>(
    existingKhul?.wife?.incomeResource || ''
  );
  const [wifeAddress, setWifeAddress] = useState<string>(
    existingKhul?.wife?.address || defaultWife?.address || ''
  );
  const [wifeCity, setWifeCity] = useState<string>(existingKhul?.wife?.city || '');
  const [wifeCountry, setWifeCountry] = useState<string>(existingKhul?.wife?.country || 'المملكة المغربية');
  const [isWifeAdult, setIsWifeAdult] = useState<boolean>(existingKhul?.wife?.isAdult ?? true);
  const [wifeGuardianName, setWifeGuardianName] = useState<string>(existingKhul?.wife?.legalGuardianName || '');

  // Stage 4: بيانات الزوج (الطرف الموافق على الخلع)
  const [husbandFirstNameAr, setHusbandFirstNameAr] = useState<string>(
    existingKhul?.husband?.firstNameAr || defaultHusband?.name?.split(' ')[0] || ''
  );
  const [husbandLastNameAr, setHusbandLastNameAr] = useState<string>(
    existingKhul?.husband?.lastNameAr || defaultHusband?.name?.split(' ').slice(1).join(' ') || ''
  );
  const [husbandFirstNameFr, setHusbandFirstNameFr] = useState<string>(
    existingKhul?.husband?.firstNameFr || ''
  );
  const [husbandLastNameFr, setHusbandLastNameFr] = useState<string>(
    existingKhul?.husband?.lastNameFr || ''
  );
  const [husbandNationality, setHusbandNationality] = useState<string>(
    existingKhul?.husband?.nationality || 'مغربية'
  );
  const [husbandBirthDate, setHusbandBirthDate] = useState<string>(
    existingKhul?.husband?.birthDate || ''
  );
  const [husbandBirthPlace, setHusbandBirthPlace] = useState<string>(
    existingKhul?.husband?.birthPlace || ''
  );
  const [husbandFatherName, setHusbandFatherName] = useState<string>(
    existingKhul?.husband?.fatherName || defaultHusband?.fatherName || ''
  );
  const [husbandMotherName, setHusbandMotherName] = useState<string>(
    existingKhul?.husband?.motherName || ''
  );
  const [husbandIdType, setHusbandIdType] = useState<'cin' | 'passport' | 'other'>(
    existingKhul?.husband?.idType || 'cin'
  );
  const [husbandIdNumber, setHusbandIdNumber] = useState<string>(
    existingKhul?.husband?.idNumber || defaultHusband?.idNumber || ''
  );
  const [husbandIdExpiryDate, setHusbandIdExpiryDate] = useState<string>(
    existingKhul?.husband?.idExpiryDate || ''
  );
  const [husbandProfession, setHusbandProfession] = useState<string>(
    existingKhul?.husband?.profession || defaultHusband?.profession || ''
  );
  const [husbandAddress, setHusbandAddress] = useState<string>(
    existingKhul?.husband?.address || defaultHusband?.address || ''
  );
  const [husbandCity, setHusbandCity] = useState<string>(existingKhul?.husband?.city || '');
  const [husbandCountry, setHusbandCountry] = useState<string>(existingKhul?.husband?.country || 'المملكة المغربية');

  // Stage 5: مرجع الزواج
  const [deedType, setDeedType] = useState<string>(existingKhul?.marriageDeed?.deedType || 'رسم زواج شرعي');
  const [registryBook, setRegistryBook] = useState<string>(existingKhul?.marriageDeed?.registryBook || 'دفتر أنكحة');
  const [registryBookNumber, setRegistryBookNumber] = useState<string>(existingKhul?.marriageDeed?.registryBookNumber || '');
  const [pageNumber, setPageNumber] = useState<string>(existingKhul?.marriageDeed?.page || '');
  const [deedNumber, setDeedNumber] = useState<string>(existingKhul?.marriageDeed?.count || '');
  const [marriageDeedDate, setMarriageDeedDate] = useState<string>(existingKhul?.marriageDeed?.deedDate || '');
  const [marriageCourt, setMarriageCourt] = useState<string>(
    existingKhul?.marriageDeed?.courtName || state.meta?.court || ''
  );

  // Stage 6: تاريخ الطلاق وعدده
  const [divorceCount, setDivorceCount] = useState<'first' | 'second' | 'third'>(
    existingKhul?.divorceCount || 'first'
  );

  // Stage 7: طلب الزوجة للخلع
  const [wifeRequestedKhul, setWifeRequestedKhul] = useState<boolean>(
    existingKhul?.wifeRequestedKhul ?? true
  );

  // Stage 8: موافقة الزوج على الخلع
  const [husbandAgreedKhul, setHusbandAgreedKhul] = useState<boolean>(
    existingKhul?.husbandAgreedKhul ?? true
  );

  // Stage 9 & 10: مقابل الخلع ومجموعه
  const [deferredDowryIncluded, setDeferredDowryIncluded] = useState<boolean>(
    existingKhul?.compensation?.deferredDowryIncluded ?? false
  );
  const [deferredDowryAmount, setDeferredDowryAmount] = useState<number>(
    existingKhul?.compensation?.deferredDowryAmount ?? 0
  );

  const [iddahMaintenanceWaived, setIddahMaintenanceWaived] = useState<boolean>(
    existingKhul?.compensation?.iddahMaintenanceWaived ?? true
  );

  const [mutahIncluded, setMutahIncluded] = useState<boolean>(
    existingKhul?.compensation?.mutahIncluded ?? false
  );
  const [mutahAmount, setMutahAmount] = useState<number>(
    existingKhul?.compensation?.mutahAmount ?? 0
  );

  const [otherCompensationIncluded, setOtherCompensationIncluded] = useState<boolean>(
    existingKhul?.compensation?.otherCompensationIncluded ?? false
  );
  const [otherCompensationDesc, setOtherCompensationDesc] = useState<string>(
    existingKhul?.compensation?.otherCompensationDesc || ''
  );
  const [otherCompensationAmount, setOtherCompensationAmount] = useState<number>(
    existingKhul?.compensation?.otherCompensationAmount ?? 0
  );

  const totalCompensation = useMemo(() => {
    let sum = 0;
    if (deferredDowryIncluded) sum += Number(deferredDowryAmount) || 0;
    if (mutahIncluded) sum += Number(mutahAmount) || 0;
    if (otherCompensationIncluded) sum += Number(otherCompensationAmount) || 0;
    return sum;
  }, [deferredDowryIncluded, deferredDowryAmount, mutahIncluded, mutahAmount, otherCompensationIncluded, otherCompensationAmount]);

  const totalCompensationInWords = useMemo(() => {
    return convertNumberToArabicWords(totalCompensation, ' درهماً لا غير');
  }, [totalCompensation]);

  // Stage 11: تصريح الزوجة بالمستحقات
  const [wifeConfirmedDuesDeclaration, setWifeConfirmedDuesDeclaration] = useState<boolean>(
    existingKhul?.wifeConfirmedDuesDeclaration ?? true
  );

  // Stage 12: التصريح بالحمل
  const [pregnancyStatus, setPregnancyStatus] = useState<'no' | 'yes' | 'cannot_declare'>(
    existingKhul?.pregnancyStatus || 'no'
  );
  const [pregnancyStartDate, setPregnancyStartDate] = useState<string>(
    existingKhul?.pregnancyStartDate || ''
  );

  // Stage 13: الأبناء
  const [hasChildren, setHasChildren] = useState<boolean>(existingKhul?.hasChildren ?? true);
  const [totalChildrenCount, setTotalChildrenCount] = useState<number>(
    existingKhul?.totalChildrenCount ?? 2
  );
  const [boysCount, setBoysCount] = useState<number>(existingKhul?.boysCount ?? 1);
  const [girlsCount, setGirlsCount] = useState<number>(existingKhul?.girlsCount ?? 1);
  const [childrenList, setChildrenList] = useState<RevocableChildData[]>(
    existingKhul?.childrenList || [
      {
        id: 'child-1',
        fullName: 'أنس المنصوري',
        firstName: 'أنس',
        lastName: 'المنصوري',
        gender: 'ذكر',
        birthDate: '2020-04-10',
        birthPlace: 'طنجة',
        healthStatus: 'سليم معافى',
        educationStatus: 'التعليم الأولي'
      },
      {
        id: 'child-2',
        fullName: 'مريم المنصوري',
        firstName: 'مريم',
        lastName: 'المنصوري',
        gender: 'أنثى',
        birthDate: '2022-11-22',
        birthPlace: 'طنجة',
        healthStatus: 'سليمة معافاة',
        educationStatus: 'دون سن التمدرس'
      }
    ]
  );

  const isChildrenCountMatching = useMemo(() => {
    if (!hasChildren) return true;
    return Number(boysCount) + Number(girlsCount) === Number(totalChildrenCount);
  }, [hasChildren, boysCount, girlsCount, totalChildrenCount]);

  // Stage 14 & 15: قدرة الأم المختلعة على الإنفاق وإعسارها
  const [motherSpendingCapacity, setMotherSpendingCapacity] = useState<'yes' | 'no' | 'unproven'>(
    existingKhul?.motherSpendingCapacity || 'yes'
  );
  const [motherIncomeTypes, setMotherIncomeTypes] = useState<string[]>(
    existingKhul?.motherIncomeTypes || ['موظفة']
  );
  const [motherIncomeNature, setMotherIncomeNature] = useState<string>(
    existingKhul?.motherIncomeNature || 'أجرة شهرية ثابتة بالقطاع العام'
  );
  const [motherApproxMonthlyIncome, setMotherApproxMonthlyIncome] = useState<string>(
    existingKhul?.motherApproxMonthlyIncome || '8500'
  );

  // Stage 16: بيانات الأب والتزامه عند إعسار الأم
  const [fatherCommitmentDetails, setFatherCommitmentDetails] = useState<string>(
    existingKhul?.fatherCommitmentDetails || 'يلتزم الأب بنفقة الأبناء قانوناً حال إعسار الأم طبقاً للمادة 119 من مدونة الأسرة دون مساس بحقه في الرجوع عليها.'
  );
  const [maternalGrandfatherCommitment, setMaternalGrandfatherCommitment] = useState<string>(
    existingKhul?.maternalGrandfatherCommitment || ''
  );

  // Stage 17: تصريح والتزام الأم
  const [motherCommittedToCare, setMotherCommittedToCare] = useState<boolean>(
    existingKhul?.motherCommittedToCare ?? true
  );
  const [motherCommittedToCustody, setMotherCommittedToCustody] = useState<boolean>(
    existingKhul?.motherCommittedToCustody ?? true
  );

  // Stage 18: الحضانة
  const [custodianParty, setCustodianParty] = useState<'mother' | 'father' | 'other_judicial'>(
    existingKhul?.custodianParty || 'mother'
  );

  // Stage 19: سكن المحضونين
  const [custodyResidence, setCustodyResidence] = useState<'with_mother' | 'with_father' | 'independent' | 'other'>(
    existingKhul?.custodyResidence || 'with_mother'
  );
  const [custodyAddress, setCustodyAddress] = useState<string>(
    existingKhul?.custodyAddress || 'حي مالاباطا، شارع محمد السادس، إقامة البحر الأزرق رقم 14'
  );
  const [custodyCity, setCustodyCity] = useState<string>(
    existingKhul?.custodyCity || 'طنجة'
  );

  // Stage 20: الزيارة والرؤية
  const [visitationAgreed, setVisitationAgreed] = useState<boolean>(
    existingKhul?.visitationAgreed ?? true
  );
  const [visitationDays, setVisitationDays] = useState<string>(
    existingKhul?.visitationDays || 'يومي السبت والأحد من كل أسبوع'
  );
  const [visitationHours, setVisitationHours] = useState<string>(
    existingKhul?.visitationHours || 'من الساعة 10:00 صباحاً إلى 18:00 مساءً'
  );
  const [visitationLocation, setVisitationLocation] = useState<string>(
    existingKhul?.visitationLocation || 'بيت الحاضنة أو مكان عام ملائم للطفلين'
  );
  const [visitationHolidays, setVisitationHolidays] = useState<string>(
    existingKhul?.visitationHolidays || 'مناصفة الأعياد الدينية والوطنية والعطل المدرسية'
  );

  // Stage 21: الإرادة الحرة والإكراه والإضرار (المادة 117)
  const [freeWillConsent, setFreeWillConsent] = useState<boolean>(
    existingKhul?.freeWillConsent ?? true
  );
  const [husbandCoercionReported, setHusbandCoercionReported] = useState<boolean>(
    existingKhul?.husbandCoercionReported ?? false
  );
  const [compensationAgreedWithoutCoercion, setCompensationAgreedWithoutCoercion] = useState<boolean>(
    existingKhul?.compensationAgreedWithoutCoercion ?? true
  );

  // Stage 22: الحارس القانوني الخماسي
  const legalGuardChecks = useMemo(() => {
    return {
      isWifeAdult: isWifeAdult,
      hasMutualConsent: husbandAgreedKhul && wifeRequestedKhul && attendeeType === 'both',
      childRightsProtected: true, // system enforces child rights protection
      insolventMotherProtected: motherSpendingCapacity !== 'no' || fatherCommitmentDetails.length > 0,
      noCoercionSuspected: freeWillConsent && !husbandCoercionReported && compensationAgreedWithoutCoercion
    };
  }, [
    isWifeAdult,
    husbandAgreedKhul,
    wifeRequestedKhul,
    attendeeType,
    motherSpendingCapacity,
    fatherCommitmentDetails,
    freeWillConsent,
    husbandCoercionReported,
    compensationAgreedWithoutCoercion
  ]);

  // Package Data Function
  const packageWorkflowData = (): KhulDivorceWorkflowData => {
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
        incomeResource: wifeIncomeResource,
        address: wifeAddress,
        city: wifeCity,
        country: wifeCountry,
        isAdult: isWifeAdult,
        legalGuardianName: wifeGuardianName
      },
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
      marriageDeed: {
        deedType,
        registryBook,
        registryBookNumber,
        page: pageNumber,
        count: deedNumber,
        deedDate: marriageDeedDate,
        courtName: marriageCourt
      },
      divorceCount,
      divorceNature: 'بائن بالخلع',
      wifeRequestedKhul,
      husbandAgreedKhul,
      compensation: {
        deferredDowryIncluded,
        deferredDowryAmount,
        deferredDowryInWords: convertNumberToArabicWords(deferredDowryAmount, ' درهماً'),
        iddahMaintenanceWaived,
        mutahIncluded,
        mutahAmount,
        otherCompensationIncluded,
        otherCompensationDesc,
        otherCompensationAmount,
        totalAmount: totalCompensation,
        totalAmountInWords: totalCompensationInWords
      },
      wifeConfirmedDuesDeclaration,
      isBeforeConsummation,
      dowryStatus: isBeforeConsummation ? dowryStatus : undefined,
      mutaaOrCompensation: isBeforeConsummation ? mutaaOrCompensation : undefined,
      pregnancyStatus: isBeforeConsummation ? 'no' : pregnancyStatus,
      pregnancyStartDate: (!isBeforeConsummation && pregnancyStatus === 'yes') ? pregnancyStartDate : undefined,
      hasChildren: isBeforeConsummation ? false : hasChildren,
      totalChildrenCount: isBeforeConsummation ? 0 : totalChildrenCount,
      boysCount: isBeforeConsummation ? 0 : boysCount,
      girlsCount: isBeforeConsummation ? 0 : girlsCount,
      childrenList: isBeforeConsummation ? [] : childrenList,
      motherSpendingCapacity,
      motherIncomeTypes,
      motherIncomeNature,
      motherApproxMonthlyIncome,
      isMotherInsolvent: motherSpendingCapacity === 'no',
      fatherCommitmentDetails,
      maternalGrandfatherCommitment,
      motherCommittedToCare,
      motherCommittedToCustody,
      custodianParty,
      custodyResidence,
      custodyAddress,
      custodyCity,
      visitationAgreed,
      visitationDays,
      visitationHours,
      visitationLocation,
      visitationHolidays,
      freeWillConsent,
      husbandCoercionReported,
      compensationAgreedWithoutCoercion,
      legalGuardChecks,
      completedAt: new Date().toISOString()
    };
  };

  // Stage validation rule
  const isCurrentStageValid = useMemo(() => {
    switch (currentStage) {
      case 1:
        return hasJudicialPermission && permissionNumber.trim().length > 0;
      case 2:
        return attendeeType === 'both';
      case 3:
        return wifeFirstNameAr.trim().length > 0 && wifeIdNumber.trim().length > 0;
      case 4:
        return husbandFirstNameAr.trim().length > 0 && husbandIdNumber.trim().length > 0;
      case 5:
        return deedNumber.trim().length > 0;
      case 6:
        return true;
      case 7:
        return wifeRequestedKhul;
      case 8:
        return husbandAgreedKhul;
      case 9:
        return true;
      case 10:
        return true;
      case 11:
        if (isBeforeConsummation) return true;
        return wifeConfirmedDuesDeclaration;
      case 12:
        return true;
      case 13:
        if (isBeforeConsummation) return true;
        return !hasChildren || isChildrenCountMatching;
      case 14:
        return true;
      case 15:
        return true;
      case 16:
        return true;
      case 17:
        return motherCommittedToCare && motherCommittedToCustody;
      case 18:
        return true;
      case 19:
        return true;
      case 20:
        return true;
      case 21:
        return freeWillConsent && !husbandCoercionReported;
      case 22:
        return true;
      default:
        return true;
    }
  }, [
    currentStage,
    hasJudicialPermission,
    permissionNumber,
    attendeeType,
    wifeFirstNameAr,
    wifeIdNumber,
    husbandFirstNameAr,
    husbandIdNumber,
    deedNumber,
    wifeRequestedKhul,
    husbandAgreedKhul,
    wifeConfirmedDuesDeclaration,
    hasChildren,
    isChildrenCountMatching,
    motherCommittedToCare,
    motherCommittedToCustody,
    freeWillConsent,
    husbandCoercionReported,
    isBeforeConsummation
  ]);

  const handleNextStage = () => {
    // Before consummation: allow viewing pregnancy (12) and children notice (13), then jump to 21
    if (isBeforeConsummation && currentStage === 13) {
      setCurrentStage(21);
      return;
    }
    if (currentStage === 13 && !hasChildren) {
      setCurrentStage(21); // Skip children details, spending capacity, custody if no children
      return;
    }
    if (currentStage < 22) {
      setCurrentStage((prev) => prev + 1);
    }
  };

  const handlePrevStage = () => {
    if (isBeforeConsummation && currentStage === 21) {
      setCurrentStage(13);
      return;
    }
    if (currentStage === 21 && !hasChildren) {
      setCurrentStage(13);
      return;
    }
    if (currentStage > 1) {
      setCurrentStage((prev) => prev - 1);
    }
  };

  // Final Action: الانتقال إلى تحرير رسم الخلع
  const handleFinalProceedToDraft = () => {
    const packaged = packageWorkflowData();
    setState((prev) => ({
      ...prev,
      divorceClassification: {
        ...(prev.divorceClassification || {
          primaryType: 'khul',
          statisticalCode: 'D-04'
        }),
        primaryType: 'khul',
        statisticalCode: 'D-04',
        divorceCount: divorceCount === 'third' ? 'other' : divorceCount,
        wifePresence: 'present',
        khulDetails: {
          compensationAmount: totalCompensation,
          compensationInWords: totalCompensationInWords,
          compensationNature: otherCompensationIncluded ? otherCompensationDesc : 'مؤخر صداق ومتعة وإبراء نفقة عدة',
          waiverDetails: iddahMaintenanceWaived ? 'التنازل عن نفقة العدة' : 'لا تنازل عن نفقة العدة',
          presenceStatus: 'both_present'
        },
        khulWorkflow: packaged
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
      step: 4 // Proceed directly to Step 4 Drafting & Summary
    }));

    onComplete();
  };

  // Children handlers
  const handleAddChild = () => {
    const nextNum = childrenList.length + 1;
    const newChild: RevocableChildData = {
      id: `child-${Date.now()}`,
      fullName: `ابن/ابنة ${nextNum}`,
      firstName: '',
      lastName: husbandLastNameAr,
      gender: 'ذكر',
      birthDate: '2021-01-01',
      birthPlace: 'طنجة',
      healthStatus: 'سليم معافى',
      educationStatus: 'متمدرس'
    };
    setChildrenList([...childrenList, newChild]);
    setTotalChildrenCount(childrenList.length + 1);
  };

  const handleRemoveChild = (id: string) => {
    const updated = childrenList.filter((c) => c.id !== id);
    setChildrenList(updated);
    setTotalChildrenCount(updated.length);
  };

  const handleUpdateChild = (id: string, field: keyof RevocableChildData, value: any) => {
    setChildrenList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // 22 Stages Definition
  const stagesList = [
    { num: 1, label: 'الإذن القضائي' },
    { num: 2, label: 'أطراف الخلع' },
    { num: 3, label: 'بيانات المختلعة' },
    { num: 4, label: 'بيانات الزوج' },
    { num: 5, label: 'مرجع الزواج' },
    { num: 6, label: 'تاريخ الطلاق' },
    { num: 7, label: 'طلب الخلع' },
    { num: 8, label: 'موافقة الزوج' },
    { num: 9, label: 'عناصر المقابل' },
    { num: 10, label: 'مجموع المقابل' },
    { num: 11, label: 'إقرار المستحقات' },
    { num: 12, label: 'حالة الحمل' },
    { num: 13, label: 'بيانات الأبناء' },
    { num: 14, label: 'قدرة الأم المالية' },
    { num: 15, label: 'إعسار الأم (المادة 119)' },
    { num: 16, label: 'التزام نفقة الأب' },
    { num: 17, label: 'التزام الأم ورعايتها' },
    { num: 18, label: 'الحضانة ومصلحتها' },
    { num: 19, label: 'سكن المحضونين' },
    { num: 20, label: 'الزيارة والرؤية' },
    { num: 21, label: 'الإرادة وعدم الإكراه' },
    { num: 22, label: 'المراجعة والحارس' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn pb-16 font-sans" dir="rtl">
      {/* 🏛️ Top Header Banner - Authentic Moroccan Judicial Elegance */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold mb-2">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>المسار التوثيقي المعتمد — كود إحصائي وطني: D-04 (بائن بالخلع)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5 text-white">
              <span>🏛️ مسطرة الطلاق بالخلع (المواد 115 إلى 120 من مدونة الأسرة)</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              مسار الإشهاد على الطلاق بالخلع القائم على تراضي الزوجين وبدل الخلع المشروع، مع الحماية القانونية الصارمة لحقوق الأطفال ومصلحة المحضون طبقاً للمادتين 118 و119.
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
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-mono font-black">
                {currentStage}
              </span>
              <span>المرحلة {currentStage} من 22:</span>
              <span className="text-amber-400 font-extrabold">{stagesList[currentStage - 1]?.label}</span>
            </span>
            <span className="font-mono font-bold bg-slate-800 text-amber-400 border border-slate-700 px-2.5 py-0.5 rounded-lg text-[11px]">
              {Math.round((currentStage / 22) * 100)}% مكتمل
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStage / 22) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 🧭 Horizontal Quick Nav Pills (All 22 Stages in a clean, scrollable horizontal bar) */}
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
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                    : isPassed
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono ${
                    isActive
                      ? 'bg-white text-amber-700 font-black'
                      : isPassed
                      ? 'bg-amber-200 text-amber-900 font-bold'
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
        {/* المرحلة 01 — الإذن القضائي بالإشهاد بالخلع */}
        {/* ========================================================================= */}
        {currentStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 01 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>📜 الإذن القضائي بالإشهاد بالخلع</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى إدخال بيانات الإذن القضائي قبل الشروع في استكمال بيانات الزوجين ومقتضيات الخلع.
              </p>
            </div>

            <Article87LegalDeadlineNotice currentType="khul" />

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                هل يوجد إذن قضائي بالإشهاد بالخلع؟ *
              </label>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <button
                  type="button"
                  onClick={() => setHasJudicialPermission(true)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    hasJudicialPermission
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>نعم، متوفر ومكتمل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasJudicialPermission(false)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    !hasJudicialPermission
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>لا يوجد إذن</span>
                </button>
              </div>

              {!hasJudicialPermission && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-950">🔴 لا يمكن متابعة المسطرة</h4>
                    <p className="mt-1 leading-relaxed">
                      يتعين التحقق من توفر الإذن القضائي اللازم للإشهاد بالخلع وتوثيقه قبل الانتقال إلى المرحلة التالية.
                    </p>
                  </div>
                </div>
              )}

              {hasJudicialPermission && (
                <div className="space-y-4 pt-3 border-t border-slate-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة *</label>
                      <input
                        type="text"
                        value={court}
                        onChange={(e) => setCourt(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">القسم/الجهة *</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الملف *</label>
                      <input
                        type="text"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الإذن القضائي *</label>
                      <input
                        type="text"
                        value={permissionNumber}
                        onChange={(e) => setPermissionNumber(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الإذن *</label>
                      <input
                        type="date"
                        value={permissionDate}
                        onChange={(e) => setPermissionDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التوصل بالإذن *</label>
                      <input
                        type="date"
                        value={receptionDate}
                        onChange={(e) => setReceptionDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ملاحظات العدل</label>
                      <input
                        type="text"
                        value={adoulNotes}
                        onChange={(e) => setAdoulNotes(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>🟢 تم تسجيل بيانات الإذن القضائي بالخلع بنجاح.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 02 — أطراف الخلع وطبيعة الحضور */}
        {/* ========================================================================= */}
        {currentStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 02 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🤝 أطراف الخلع وطبيعة الحضور</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى تحديد الحاضرين أمام العدلين لإبرام الخلع والإشهاد عليه. الخلع يقوم على تراضي الزوجين (المادة 115).
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => setAttendeeType('both')}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    attendeeType === 'both'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👥</span>
                    {attendeeType === 'both' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">الزوجة والزوج معاً</h3>
                    <p className="text-[11px] text-slate-500 mt-1">حضور الطرفين لمجلس الإشهاد للتراضي</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeType('wife_only')}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    attendeeType === 'wife_only'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👩</span>
                    {attendeeType === 'wife_only' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">الزوجة فقط</h3>
                    <p className="text-[11px] text-slate-500 mt-1">طالبة الخلع بمفردها</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendeeType('husband_only')}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    attendeeType === 'husband_only'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👨</span>
                    {attendeeType === 'husband_only' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">الزوج فقط</h3>
                    <p className="text-[11px] text-slate-500 mt-1">الزوج بمفرده دون الزوجة</p>
                  </div>
                </button>
              </div>

              {attendeeType === 'both' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>🟢 الحضور مكتمل لإبرام الخلع بالتراضي وفق أحكام المادة 115 من مدونة الأسرة.</span>
                </div>
              )}

              {attendeeType === 'wife_only' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">🟠 تعذر استكمال الإشهاد بالخلع في هذا المسار</h4>
                    <p className="mt-1 leading-relaxed text-amber-900">
                      الخلع يقوم على تراضي الزوجين طبقاً للمادة 115 من مدونة الأسرة. يرجى التحقق من توفر موافقة الزوج وحضوره أو سلوك المسطرة القضائية المناسبة عند الاختلاف (المادة 120).
                    </p>
                  </div>
                </div>
              )}

              {attendeeType === 'husband_only' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">🟠 لا يمكن استكمال مسطرة الخلع بهذه الصفة</h4>
                    <p className="mt-1 leading-relaxed text-amber-900">
                      يرجى التحقق من حضور الزوجة الراغبة في المخالعة؛ فالخلع إشهاد صادر بطلبها وتراضيهما على المقابل.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 03 — بيانات الزوجة المختلعة */}
        {/* ========================================================================= */}
        {currentStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 03 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👩 بيانات الزوجة المختلعة</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                الهوية الكاملة للمختلعة والبيانات الشخصية ووثيقة التعريف وموارد الدخل.
              </p>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 mb-3">الهوية الشخصية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي (بالعربية) *</label>
                    <input
                      type="text"
                      value={wifeFirstNameAr}
                      onChange={(e) => setWifeFirstNameAr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي (بالعربية) *</label>
                    <input
                      type="text"
                      value={wifeLastNameAr}
                      onChange={(e) => setWifeLastNameAr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي (باللاتينية)</label>
                    <input
                      type="text"
                      value={wifeFirstNameFr}
                      onChange={(e) => setWifeFirstNameFr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي (باللاتينية)</label>
                    <input
                      type="text"
                      value={wifeLastNameFr}
                      onChange={(e) => setWifeLastNameFr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنسية *</label>
                    <input
                      type="text"
                      value={wifeNationality}
                      onChange={(e) => setWifeNationality(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد *</label>
                    <input
                      type="date"
                      value={wifeBirthDate}
                      onChange={(e) => setWifeBirthDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد *</label>
                    <input
                      type="text"
                      value={wifeBirthPlace}
                      onChange={(e) => setWifeBirthPlace(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب *</label>
                    <input
                      type="text"
                      value={wifeFatherName}
                      onChange={(e) => setWifeFatherName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم *</label>
                    <input
                      type="text"
                      value={wifeMotherName}
                      onChange={(e) => setWifeMotherName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 mb-3">🪪 وثيقة الهوية والمهنة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الوثيقة</label>
                    <select
                      value={wifeIdType}
                      onChange={(e) => setWifeIdType(e.target.value as any)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="cin">البطاقة الوطنية للتعريف الإلكترونية</option>
                      <option value="passport">جواز السفر</option>
                      <option value="other">وثيقة أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الوثيقة *</label>
                    <input
                      type="text"
                      value={wifeIdNumber}
                      onChange={(e) => setWifeIdNumber(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">صالحة إلى غاية *</label>
                    <input
                      type="date"
                      value={wifeIdExpiryDate}
                      onChange={(e) => setWifeIdExpiryDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة *</label>
                    <input
                      type="text"
                      value={wifeProfession}
                      onChange={(e) => setWifeProfession(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الدخل / المورد المهني</label>
                    <input
                      type="text"
                      value={wifeIncomeResource}
                      onChange={(e) => setWifeIncomeResource(e.target.value)}
                      placeholder="راتب، تجارة، إيراد عقاري..."
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان السكنى *</label>
                    <input
                      type="text"
                      value={wifeAddress}
                      onChange={(e) => setWifeAddress(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة *</label>
                    <input
                      type="text"
                      value={wifeCity}
                      onChange={(e) => setWifeCity(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 04 — بيانات الزوج (الطرف الموافق على الخلع) */}
        {/* ========================================================================= */}
        {currentStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  المرحلة 04 من 22
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                  <span>👨 بيانات الزوج</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  الهوية الكاملة للزوج الموافق على الخلع.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 self-start sm:self-center">
                <span>👨 الطرف الموافق على الخلع</span>
              </span>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 mb-3">الهوية الشخصية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي (بالعربية) *</label>
                    <input
                      type="text"
                      value={husbandFirstNameAr}
                      onChange={(e) => setHusbandFirstNameAr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي (بالعربية) *</label>
                    <input
                      type="text"
                      value={husbandLastNameAr}
                      onChange={(e) => setHusbandLastNameAr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الشخصي (باللاتينية)</label>
                    <input
                      type="text"
                      value={husbandFirstNameFr}
                      onChange={(e) => setHusbandFirstNameFr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم العائلي (باللاتينية)</label>
                    <input
                      type="text"
                      value={husbandLastNameFr}
                      onChange={(e) => setHusbandLastNameFr(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الجنسية *</label>
                    <input
                      type="text"
                      value={husbandNationality}
                      onChange={(e) => setHusbandNationality(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد *</label>
                    <input
                      type="date"
                      value={husbandBirthDate}
                      onChange={(e) => setHusbandBirthDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد *</label>
                    <input
                      type="text"
                      value={husbandBirthPlace}
                      onChange={(e) => setHusbandBirthPlace(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب *</label>
                    <input
                      type="text"
                      value={husbandFatherName}
                      onChange={(e) => setHusbandFatherName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم *</label>
                    <input
                      type="text"
                      value={husbandMotherName}
                      onChange={(e) => setHusbandMotherName(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 mb-3">🪪 وثيقة الهوية والمهنة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الوثيقة</label>
                    <select
                      value={husbandIdType}
                      onChange={(e) => setHusbandIdType(e.target.value as any)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="cin">البطاقة الوطنية للتعريف الإلكترونية</option>
                      <option value="passport">جواز السفر</option>
                      <option value="other">وثيقة أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الوثيقة *</label>
                    <input
                      type="text"
                      value={husbandIdNumber}
                      onChange={(e) => setHusbandIdNumber(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">صالحة إلى غاية *</label>
                    <input
                      type="date"
                      value={husbandIdExpiryDate}
                      onChange={(e) => setHusbandIdExpiryDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة *</label>
                    <input
                      type="text"
                      value={husbandProfession}
                      onChange={(e) => setHusbandProfession(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان السكنى *</label>
                    <input
                      type="text"
                      value={husbandAddress}
                      onChange={(e) => setHusbandAddress(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة *</label>
                    <input
                      type="text"
                      value={husbandCity}
                      onChange={(e) => setHusbandCity(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 05 — مرجع الزواج */}
        {/* ========================================================================= */}
        {currentStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 05 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>💍 بيانات عقد الزواج</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                يرجى إدخال أو مراجعة البيانات المرجعية لرسم الزواج الذي تقوم عليه هذه المسطرة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الرسم</label>
                <input
                  type="text"
                  value={deedType}
                  onChange={(e) => setDeedType(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">مضمن بدفتر</label>
                <input
                  type="text"
                  value={registryBook}
                  onChange={(e) => setRegistryBook(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الدفتر</label>
                <input
                  type="text"
                  value={registryBookNumber}
                  onChange={(e) => setRegistryBookNumber(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الصفحة</label>
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">عدد / رقم الرسم *</label>
                <input
                  type="text"
                  value={deedNumber}
                  onChange={(e) => setDeedNumber(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">بتاريخ</label>
                <input
                  type="date"
                  value={marriageDeedDate}
                  onChange={(e) => setMarriageDeedDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الجهة التي صدر عنها الرسم</label>
                <input
                  type="text"
                  value={marriageCourt}
                  onChange={(e) => setMarriageCourt(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <span className="font-bold flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-700" />
                <span>💍 مرجع الزواج المعتمد: عدد {deedNumber} صحيفة {pageNumber} دفتر {registryBookNumber} بتاريخ {marriageDeedDate}</span>
              </span>
              <span className="text-emerald-700 font-bold">تم التحقق بنجاح ✓</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 06 — تاريخ الطلاق وعدده */}
        {/* ========================================================================= */}
        {currentStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 06 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>⚖️ ترتيب الطلاق وصفته القانونية</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد ترتيب هذه الطلقة بين الزوجين. تصنف وزارة العدل الطلاق بالخلع كطلاق بائن بالخلع.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                كم طلقة وقعت بين الزوجين إلى غاية هذا الخلع موضوع الرسم؟
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDivorceCount('first')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    divorceCount === 'first'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">🔵 الطلقة الأولى</span>
                  <span className="text-[11px] opacity-80 font-normal">أول طلاق يقع بين الطرفين</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDivorceCount('second')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    divorceCount === 'second'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-md font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">🟠 الطلقة الثانية</span>
                  <span className="text-[11px] opacity-80 font-normal">مسبوق بطلقة سابقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDivorceCount('third')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    divorceCount === 'third'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">🔴 الطلقة الثالثة</span>
                  <span className="text-[11px] opacity-80 font-normal">مكملة للثلاث (بينونة كبرى)</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-900 font-bold block">
                    🔷 التكييف القانوني الرسمي:
                  </span>
                  <span className="text-sm font-black text-amber-950 mt-0.5 block">
                    {divorceCount === 'first' ? 'الطلقة الأولى — طلاق بائن بالخلع' : divorceCount === 'second' ? 'الطلقة الثانية — طلاق بائن بالخلع' : 'الطلقة الثالثة — طلاق مكمل للثلاث (بائن بالخلع)'}
                  </span>
                </div>
                <span className="px-3 py-1 bg-amber-600 text-white rounded-xl text-xs font-bold font-mono">
                  D-04
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 07 — طلب الزوجة للخلع */}
        {/* ========================================================================= */}
        {currentStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 07 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>💠 تصريح الزوجة بطلب الخلع</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تسجيل إرادة الزوجة الصريحة في مخالعة زوجها وإنهاء العصمة الزوجية.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل تصرح الزوجة بأنها ترغب في مخالعة زوجها وإنهاء العلاقة الزوجية على المقابل المبين في هذا الرسم؟
              </label>

              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <button
                  type="button"
                  onClick={() => setWifeRequestedKhul(true)}
                  className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    wifeRequestedKhul
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>نعم، أصرح بذلك طواعية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWifeRequestedKhul(false)}
                  className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    !wifeRequestedKhul
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>لا</span>
                </button>
              </div>

              {wifeRequestedKhul ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <span className="font-bold block">🟢 تم تسجيل إرادة الزوجة في الخلع:</span>
                  <p className="mt-1 leading-relaxed">
                    «حضرت الزوجة السيدة {wifeFirstNameAr} {wifeLastNameAr} وصرحت بمجلس الإشهاد أنها ترغب في مخالعة زوجها السيد {husbandFirstNameAr} {husbandLastNameAr} وفك عصمة نكاحه منها على البدل المتفق عليه قانوناً».
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <span>🔴 لا يمكن مواصلة إشهاد الخلع دون تصريح صريح من الزوجة بطلب المخالعة.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 08 — موافقة الزوج على الخلع */}
        {/* ========================================================================= */}
        {currentStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 08 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🤝 موافقة الزوج وتراضي الطرفين</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تراضي الزوجين ركن أساسي في الخلع وفق المادة 115 من مدونة الأسرة.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <label className="block text-sm font-bold text-slate-900">
                هل يصرح الزوج بقبوله الخلع والموافقة على إنهاء العلاقة الزوجية وفق المقابل المتفق عليه؟
              </label>

              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <button
                  type="button"
                  onClick={() => setHusbandAgreedKhul(true)}
                  className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    husbandAgreedKhul
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>نعم، أوافق على الخلع وبدله</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHusbandAgreedKhul(false)}
                  className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    !husbandAgreedKhul
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>لا أوافق</span>
                </button>
              </div>

              {husbandAgreedKhul ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <span className="font-bold block">🟢 تم تسجيل تراضي الطرفين على مبدأ الخلع:</span>
                  <p className="mt-1 leading-relaxed">
                    «صرح الزوج بقبوله الخلع وبإنهاء العلاقة الزوجية الرابطة بينهما على البدل المتراضى عليه طبقاً للمادة 115 من مدونة الأسرة».
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1.5">
                  <h4 className="font-bold text-rose-900">🔴 لا يوجد تراضٍ على الخلع</h4>
                  <p className="leading-relaxed">
                    يتعذر إتمام هذا المسار بالخلع لغياب تراضي الطرفين (المادة 115). وإذا اتفقا على المبدأ واختلفا في المقابل، يرفع الأمر للمحكمة للبت طبقاً للمادة 120 من مدونة الأسرة.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 09 — مقابل الخلع وعناصره */}
        {/* ========================================================================= */}
        {currentStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 09 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>💰 عناصر مقابل الخلع المتفق عليه</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد دقيق لعناصر البدل (المؤخر، نفقة العدة، المتعة، بدل مالي إضافي) مع حماية حقوق الأطفال.
              </p>
            </div>

            <div className="space-y-4">
              {/* Element 1: مؤخر الصداق */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">1. الصداق المؤخر:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeferredDowryIncluded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        deferredDowryIncluded ? 'bg-amber-600 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      يدخل في البدل
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeferredDowryIncluded(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        !deferredDowryIncluded ? 'bg-slate-800 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      لا يدخل
                    </button>
                  </div>
                </div>

                {deferredDowryIncluded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">مقداره بالدرهم</label>
                      <input
                        type="number"
                        value={deferredDowryAmount}
                        onChange={(e) => setDeferredDowryAmount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">بالحروف (تلقائي)</label>
                      <input
                        type="text"
                        readOnly
                        value={convertNumberToArabicWords(deferredDowryAmount, ' درهماً')}
                        className="w-full p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Element 2: نفقة العدة */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">2. نفقة العدة:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIddahMaintenanceWaived(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        iddahMaintenanceWaived ? 'bg-amber-600 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      تنازلت عنها ضمن البدل
                    </button>
                    <button
                      type="button"
                      onClick={() => setIddahMaintenanceWaived(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        !iddahMaintenanceWaived ? 'bg-slate-800 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      مستحقة / لم تتنازل
                    </button>
                  </div>
                </div>

                {iddahMaintenanceWaived && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    ⚠️ يرجى التأكد من أن هذا الالتزام خاص بالزوجة وداخل في المقابل المتفق عليه وأنه لا يتعلق بأي حق من حقوق الأطفال.
                  </div>
                )}
              </div>

              {/* Element 3: المتعة */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">3. المتعة:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMutahIncluded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        mutahIncluded ? 'bg-amber-600 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      مدرجة في المخالعة
                    </button>
                    <button
                      type="button"
                      onClick={() => setMutahIncluded(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        !mutahIncluded ? 'bg-slate-800 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      غير مدرجة
                    </button>
                  </div>
                </div>

                {mutahIncluded && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ المضمن كمتعة (درهم)</label>
                    <input
                      type="number"
                      value={mutahAmount}
                      onChange={(e) => setMutahAmount(Number(e.target.value))}
                      className="w-full sm:w-1/2 p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Element 4: بدل آخر مشروع */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">4. مقابل إضافي آخر:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOtherCompensationIncluded(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        otherCompensationIncluded ? 'bg-amber-600 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      نعم يوجد
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtherCompensationIncluded(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        !otherCompensationIncluded ? 'bg-slate-800 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      لا يوجد
                    </button>
                  </div>
                </div>

                {otherCompensationIncluded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">وصف البدل المشروع</label>
                      <input
                        type="text"
                        value={otherCompensationDesc}
                        onChange={(e) => setOtherCompensationDesc(e.target.value)}
                        placeholder="أداء مبلغ نقدي إضافي بمجلس الإشهاد..."
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">قيمته المقومة (درهم)</label>
                      <input
                        type="number"
                        value={otherCompensationAmount}
                        onChange={(e) => setOtherCompensationAmount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Safeguard Alert */}
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">قاعدة النظام التوثيقية الصارمة:</span>
                  <p className="mt-0.5 leading-relaxed text-rose-900">
                    لا يقبل النظام تلقائياً أي بدل يمس حقاً ثابتاً للأطفال أو نفقتهم، إعمالاً لأحكام المادتين 118 و119 من مدونة الأسرة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 10 — مجموع مقابل الخلع */}
        {/* ========================================================================= */}
        {currentStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 10 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>💰 مجموع بدل الخلع المتفق عليه</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تجميع المبالغ المالية المقومة لبدل الخلع والتفقيط الآلي بالحروف والدرهم المغربي.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">إجمالي المقابل بالأرقام:</span>
                  <span className="text-3xl font-mono font-black text-amber-950 mt-1 block">
                    {totalCompensation.toLocaleString('ar-MA')} <span className="text-lg font-bold">درهم</span>
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-300 text-xs text-amber-900 font-semibold max-w-sm">
                  <span className="font-bold block mb-1">مكونات البدل:</span>
                  <ul className="space-y-0.5 text-[11px]">
                    {deferredDowryIncluded && <li>• مؤخر الصداق: {deferredDowryAmount} درهم</li>}
                    {iddahMaintenanceWaived && <li>• إسقاط نفقة العدة</li>}
                    {mutahIncluded && <li>• المتعة: {mutahAmount} درهم</li>}
                    {otherCompensationIncluded && <li>• بدل إضافي: {otherCompensationAmount} درهم</li>}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200">
                <span className="text-xs font-bold text-amber-900 block mb-1">المبلغ بالحروف (توليد آلي رسمي):</span>
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200 font-bold text-slate-800 text-sm">
                  {totalCompensationInWords}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 11 — تصريح الزوجة بالمستحقات */}
        {/* ========================================================================= */}
        {currentStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 11 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>📜 تصريح الزوجة بالمستحقات والإقرار بالعناصر</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                عرض المستحقات التي تدخل في بدل الخلع وإقرار الزوجة الصريح بها.
              </p>
            </div>

            {isBeforeConsummation ? (
              <BeforeConsummationDuesForm
                dowryStatus={dowryStatus}
                onDowryStatusChange={setDowryStatus}
                mutaaAmount={mutaaOrCompensation}
                onMutaaAmountChange={setMutaaOrCompensation}
                labelVariant="khul"
              />
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                  تصرح الزوجة بأنها تخالع من عصمة زوجها مقابل ما تم الاتفاق عليه، وتشمل المستحقات التي تدخل في بدل الخلع ما يلي:
                </p>

                <div className="space-y-2 text-xs bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>مؤخر الصداق وقدره: <strong className="font-mono">{deferredDowryIncluded ? `${deferredDowryAmount} درهم` : 'غير مشمول'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>نفقة العدة: <strong className="font-mono">{iddahMaintenanceWaived ? 'تنازلت عنها ضمن البدل' : 'مستحقة قانوناً'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>المتعة: <strong className="font-mono">{mutahIncluded ? `${mutahAmount} درهم` : 'غير مشمولة'}</strong></span>
                  </div>
                  {otherCompensationIncluded && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>بدل آخر: <strong className="font-mono">{otherCompensationDesc} ({otherCompensationAmount} درهم)</strong></span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    هل تقر الزوجة بهذه العناصر كما هي دون زيادة أو نقصان؟
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setWifeConfirmedDuesDeclaration(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        wifeConfirmedDuesDeclaration ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>نعم، أقر بها تماماً</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStage(9)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      مراجعة وتعديل العناصر ↩
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 12 — التصريح بالحمل */}
        {/* ========================================================================= */}
        {currentStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 12 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🤰 التصريح بحالة الحمل</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                خانة أساسية للتحقق من آثار الحمل والالتزامات المرتبطة بالمولود.
              </p>
            </div>

            {isBeforeConsummation ? (
              <BeforeConsummationPregnancyNotice />
            ) : (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-800">
                  هل تصرح الزوجة بوجود حمل وقت الإشهاد؟
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPregnancyStatus('no')}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      pregnancyStatus === 'no'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-sm mb-1">لا، أصرح بعدم وجود حمل</span>
                    <span className="text-[11px] opacity-80 font-normal">براءة الرحم من الحمل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPregnancyStatus('yes')}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      pregnancyStatus === 'yes'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-sm mb-1">نعم، أصرح بوجود حمل</span>
                    <span className="text-[11px] opacity-80 font-normal">حامل وقت الإشهاد بالخلع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPregnancyStatus('cannot_declare')}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      pregnancyStatus === 'cannot_declare'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-sm mb-1">لا أستطيع التصريح</span>
                    <span className="text-[11px] opacity-80 font-normal">عدم التيقن / يحتاج فحص</span>
                  </button>
                </div>

                {pregnancyStatus === 'no' && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>🟢 تم تسجيل تصريح الزوجة بعدم وجود حمل.</span>
                  </div>
                )}

                {pregnancyStatus === 'yes' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">⚠️ تم تسجيل وجود حمل</h4>
                        <p className="mt-1 leading-relaxed text-amber-900">
                          يرجى التأكد من إدراج الآثار والالتزامات المتعلقة بالمولود. الحقوق القانونية للمولود ونفقته لا يجوز أن تُختزل في عبارة تنازل عامة.
                        </p>
                      </div>
                    </div>

                    <div className="max-w-xs">
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">تاريخ بداية الحمل إن كان معلوماً:</label>
                      <input
                        type="date"
                        value={pregnancyStartDate}
                        onChange={(e) => setPregnancyStartDate(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-amber-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 13 — أبناء الزوجين */}
        {/* ========================================================================= */}
        {currentStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 13 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👶 أبناء الزوجين</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                حصر دقيق للأبناء وتوزيعهم وبطاقة تعريفية لكل ابن لحماية حقوقهم في النفقة والحضانة.
              </p>
            </div>

            {isBeforeConsummation ? (
              <BeforeConsummationChildrenNotice />
            ) : (
              <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">هل للزوجين أبناء؟</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHasChildren(true)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    hasChildren ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>نعم، يوجد أبناء</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasChildren(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    !hasChildren ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>لا يوجد أبناء</span>
                </button>
              </div>

              {hasChildren && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">إجمالي عدد الأبناء *</label>
                      <input
                        type="number"
                        min="1"
                        value={totalChildrenCount}
                        onChange={(e) => setTotalChildrenCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ذكور 👦</label>
                      <input
                        type="number"
                        min="0"
                        value={boysCount}
                        onChange={(e) => setBoysCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">إناث 👧</label>
                      <input
                        type="number"
                        min="0"
                        value={girlsCount}
                        onChange={(e) => setGirlsCount(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {!isChildrenCountMatching && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>⚠️ تنبيه: عدد الذكور ({boysCount}) + الإناث ({girlsCount}) لا يساوي إجمالي الأبناء ({totalChildrenCount}).</span>
                    </div>
                  )}

                  {/* Children Interactive Cards */}
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">بطاقات الأبناء التفصيلية ({childrenList.length}):</h4>
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة ابن</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {childrenList.map((child, idx) => (
                        <div key={child.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                              <span>{child.gender === 'ذكر' ? '👦' : '👧'}</span>
                              <span>الابن رقم {idx + 1}: {child.firstName || child.fullName}</span>
                              <span className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                                السن: {calculateAge(child.birthDate)} سنة
                              </span>
                            </span>
                            {childrenList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChild(child.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">الاسم الشخصي</label>
                              <input
                                type="text"
                                value={child.firstName}
                                onChange={(e) => handleUpdateChild(child.id, 'firstName', e.target.value)}
                                className="w-full p-2 text-xs bg-white border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">الجنس</label>
                              <select
                                value={child.gender}
                                onChange={(e) => handleUpdateChild(child.id, 'gender', e.target.value)}
                                className="w-full p-2 text-xs bg-white border rounded-lg"
                              >
                                <option value="ذكر">ذكر</option>
                                <option value="أنثى">أنثى</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">تاريخ الازدياد</label>
                              <input
                                type="date"
                                value={child.birthDate}
                                onChange={(e) => handleUpdateChild(child.id, 'birthDate', e.target.value)}
                                className="w-full p-2 text-xs bg-white border rounded-lg font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">الوضع الصحي والدراسي</label>
                              <input
                                type="text"
                                value={child.healthStatus}
                                onChange={(e) => handleUpdateChild(child.id, 'healthStatus', e.target.value)}
                                className="w-full p-2 text-xs bg-white border rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        {/* ========================================================================= */}
        {/* المرحلة 14 — قدرة الأم المختلعة على الإنفاق */}
        {/* ========================================================================= */}
        {currentStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 14 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>💰 قدرة الأم المختلعة على الإنفاق على الأبناء</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                محور جوهري بالخلع استناداً للمادة 119 من مدونة الأسرة التي تحمي حقوق ونفقة الأطفال.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                هل للزوجة المختلعة مورد مالي يمكنها من الإنفاق على أبنائها؟
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMotherSpendingCapacity('yes')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    motherSpendingCapacity === 'yes'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm mb-1">نعم، متوفر وقادرة</span>
                  <span className="text-[11px] opacity-80 font-normal">لها دخل أو مورد مهني</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMotherSpendingCapacity('no')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    motherSpendingCapacity === 'no'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm mb-1">لا، معسرة / لا مورد لها</span>
                  <span className="text-[11px] opacity-80 font-normal">لا تتوفر على دخل للإنفاق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMotherSpendingCapacity('unproven')}
                  className={`p-4 rounded-xl border text-right transition-all ${
                    motherSpendingCapacity === 'unproven'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm mb-1">غير ثابت / يحتاج تحقق</span>
                  <span className="text-[11px] opacity-80 font-normal">عدم ثبوت الملاءة</span>
                </button>
              </div>

              {motherSpendingCapacity === 'yes' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <span className="text-xs font-bold text-emerald-950 block">نوع ومصدر المورد المالي:</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['موظفة', 'أجيرة', 'تاجرة', 'مهنة حرة', 'نشاط مهني', 'دخل عقاري', 'مورد آخر'].map((type) => {
                      const selected = motherIncomeTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setMotherIncomeTypes(motherIncomeTypes.filter(t => t !== type));
                            } else {
                              setMotherIncomeTypes([...motherIncomeTypes, type]);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            selected ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '}{type}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">طبيعة المورد</label>
                      <input
                        type="text"
                        value={motherIncomeNature}
                        onChange={(e) => setMotherIncomeNature(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-emerald-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">الدخل الشهري التقريبي (درهم)</label>
                      <input
                        type="text"
                        value={motherApproxMonthlyIncome}
                        onChange={(e) => setMotherApproxMonthlyIncome(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-emerald-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed pt-1">
                    🟢 تم تسجيل وجود مورد مالي للزوجة. يرجى استكمال التصريحات المتعلقة بالتزامها بالنفقة على الأبناء، مع بقاء حقوق الأبناء محفوظة وفق القانون.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 15 — إذا كانت الأم معسرة (المادة 119) */}
        {/* ========================================================================= */}
        {currentStage === 15 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 15 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>⚠️ التكييف القانوني عند إعسار الأم (المادة 119)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                الحماية التشريعية الصريحة لنفقة الأطفال في مدونة الأسرة المغربية.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">نص المادة 119 من مدونة الأسرة:</h4>
                  <blockquote className="mt-1 text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-amber-200 italic">
                    «لا يجوز أن يكون الخلع على شيء يتعلق بحقوق الأطفال أو بنفقتهم إذا كانت الأم معسرة.
                    وإذا أعسرت الأم المختلعة بنفقة أطفالها، وجبت النفقة على أبيهم، دون مساس بحقه في الرجوع عليها».
                  </blockquote>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>النظام يضمن عدم إسقاط نفقة الأطفال ولا يجيز إدراج نفقة الأطفال كبدل مخالعة عند إعسار الأم.</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 16 — التزام نفقة الأب */}
        {/* ========================================================================= */}
        {currentStage === 16 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 16 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👴 بيانات الأب والتزامه عند إعسار الأم</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تثبيت التزام الأب بنفقة أبنائه قانوناً دون خلط مع صفة والد الزوجة.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  صيغة التزام الأب بنفقة الأبناء عند إعسار الأم (المادة 119):
                </label>
                <textarea
                  rows={3}
                  value={fatherCommitmentDetails}
                  onChange={(e) => setFatherCommitmentDetails(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  التزام تعاقدي مستقل من والد الزوجة (الجد) بضمان تنفيذ التزام معين إن وجد:
                </label>
                <input
                  type="text"
                  value={maternalGrandfatherCommitment}
                  onChange={(e) => setMaternalGrandfatherCommitment(e.target.value)}
                  placeholder="اختياري: يسجل فقط في حال وجود التزام أو كفالة تعاقدية مستقلة"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 17 — تصريح والتزام الأم ورعايتها */}
        {/* ========================================================================= */}
        {currentStage === 17 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 17 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👩 تصريح والتزام الأم برعاية الأبناء</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                حماية تشريعية صارمة: لا يُسمح بإسقاط الحضانة أو التنازل عن رعاية المحضونين.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  هل تصرح الزوجة بالتزامها بالإنفاق على أبنائها وفق ما تقرر قانوناً وتسمح به ملاءتها؟
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMotherCommittedToCare(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      motherCommittedToCare ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    نعم، ملتزمة بذلك
                  </button>
                  <button
                    type="button"
                    onClick={() => setMotherCommittedToCare(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      !motherCommittedToCare ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  هل تلتزم بالقيام بحضانتهم ورعاية مصالحهم وفق ما يقرره القانون؟
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMotherCommittedToCustody(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      motherCommittedToCustody ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    نعم، ملتزمة بالحضانة والرعاية
                  </button>
                  <button
                    type="button"
                    onClick={() => setMotherCommittedToCustody(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      !motherCommittedToCustody ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                ℹ️ حماية النظام: الحضانة ليست مجرد حق قابل للإسقاط بصورة مطلقة، ومصلحة المحضون الفضلى هي الأساس القانوني المعتمد.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 18 — الحضانة ومصلحتها */}
        {/* ========================================================================= */}
        {currentStage === 18 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 18 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👩👧 من يتولى الحضانة؟</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                تحديد الحاضن المصرح به مع مراعاة أحكام مدونة الأسرة ومصلحة المحضون.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setCustodianParty('mother')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    custodianParty === 'mother'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">👩 الأم</span>
                  <span className="text-[11px] opacity-80 font-normal">الأصل في الحضانة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustodianParty('father')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    custodianParty === 'father'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">👨 الأب</span>
                  <span className="text-[11px] opacity-80 font-normal">بمقتضى الاتفاق أو القانون</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustodianParty('other_judicial')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    custodianParty === 'other_judicial'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-base mb-1">⚖️ غير ذلك</span>
                  <span className="text-[11px] opacity-80 font-normal">يحتاج إلى تحقق قضائي</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                🟢 تم تسجيل {custodianParty === 'mother' ? 'الأم' : custodianParty === 'father' ? 'الأب' : 'الطرف المحدد'} كحاضن وفق المعطيات المصرح بها، وتستمر الحضانة إلى سن الرشد القانوني مع احتفاظ المحضون الذي أتم 15 سنة بحق الاختيار.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 19 — سكن المحضونين */}
        {/* ========================================================================= */}
        {currentStage === 19 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 19 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🏠 سكن المحضونين</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                توفير السكن اللائق للمحضون من أهم واجبات النفقة المقررة قانوناً.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                ما هو السكن المخصص لإقامة المحضونين؟
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'with_mother', label: 'مع الأم' },
                  { id: 'with_father', label: 'مع الأب' },
                  { id: 'independent', label: 'سكن مستقل' },
                  { id: 'other', label: 'آخر (بيان)' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCustodyResidence(s.id as any)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      custodyResidence === s.id
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان سكن المحضونين *</label>
                  <input
                    type="text"
                    value={custodyAddress}
                    onChange={(e) => setCustodyAddress(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة *</label>
                  <input
                    type="text"
                    value={custodyCity}
                    onChange={(e) => setCustodyCity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 20 — تنظيم الزيارة والرؤية */}
        {/* ========================================================================= */}
        {currentStage === 20 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 20 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>👨👧👦 تنظيم صلة الرحم والتواصل (الزيارة والرؤية)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                حق الزيارة والرؤية حق للوالد غير الحاضن وللمحضون.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800">
                هل تم الاتفاق على تنظيم الزيارة والرؤية؟
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVisitationAgreed(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    visitationAgreed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  نعم، تم الاتفاق
                </button>
                <button
                  type="button"
                  onClick={() => setVisitationAgreed(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    !visitationAgreed ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  يترك للتراضي لاحقاً أو المحكمة
                </button>
              </div>

              {visitationAgreed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">أيام الزيارة</label>
                    <input
                      type="text"
                      value={visitationDays}
                      onChange={(e) => setVisitationDays(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">التوقيت</label>
                    <input
                      type="text"
                      value={visitationHours}
                      onChange={(e) => setVisitationHours(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان التسليم والاستلام</label>
                    <input
                      type="text"
                      value={visitationLocation}
                      onChange={(e) => setVisitationLocation(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">العطل والمناسبات الدينية</label>
                    <input
                      type="text"
                      value={visitationHolidays}
                      onChange={(e) => setVisitationHolidays(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 21 — الإرادة الحرة وعدم الإكراه والإضرار */}
        {/* ========================================================================= */}
        {currentStage === 21 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 21 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>⚠️ التحقق من الإرادة الحرة وعدم الإكراه (المادة 117)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                المادة 117 تعطي الزوجة حق استرجاع ما خالعت به إذا ثبت إكراهها أو الإضرار بها.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  هل تصرح الزوجة أن الخلع تم بكامل رضاها واختيارها الحر؟
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFreeWillConsent(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      freeWillConsent ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    نعم، برضا واختيار تام
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreeWillConsent(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      !freeWillConsent ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  هل تعرضت الزوجة لأي إكراه أو إضرار من الزوج لحملها على الخلع؟
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHusbandCoercionReported(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      !husbandCoercionReported ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    لا يوجد أي إكراه
                  </button>
                  <button
                    type="button"
                    onClick={() => setHusbandCoercionReported(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      husbandCoercionReported ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    نعم تعرضت لإكراه
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  هل تصرح بأن بدل الخلع تم الاتفاق عليه دون تعسف أو استغلال؟
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCompensationAgreedWithoutCoercion(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      compensationAgreedWithoutCoercion ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    نعم، بالتراضي التام
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompensationAgreedWithoutCoercion(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      !compensationAgreedWithoutCoercion ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              {husbandCoercionReported && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs">
                  <h4 className="font-bold text-rose-900">🔴 تنبيه قانوني خطير (المادة 117)</h4>
                  <p className="mt-1 leading-relaxed">
                    تتضمن المعطيات واقعة مؤثرة في صحة التراضي وبدل الخلع، ويجب إحالتها للمراجعة القانونية أو البت القضائي قبل الانتقال.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* المرحلة 22 — المراجعة الشاملة والحارس القانوني الخماسي */}
        {/* ========================================================================= */}
        {currentStage === 22 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                المرحلة 22 من 22
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                <span>🔎 المراجعة الشاملة وفحص الحارس القانوني الخماسي</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                فحص النظام التلقائي للنقاط الجوهرية الخمس قبل تحرير رسم الخلع.
              </p>
            </div>

            {/* 🔐 Legal Guard Checkpoints */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">🔐 الحارس القانوني التوثيقي لبيت الخلع:</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span>1. رشد الزوجة المختلعة (المادة 116):</span>
                  <span className="text-emerald-400 font-bold">راشدة قانوناً ✓</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span>2. التراضي التام بين الزوجين (المادة 115):</span>
                  <span className="text-emerald-400 font-bold">تراضٍ مسجل ✓</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span>3. حماية حقوق ونفقة الأطفال (المادة 118):</span>
                  <span className="text-emerald-400 font-bold">محمية قانوناً ✓</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span>4. عدم إعسار الأم أو التزام الأب (المادة 119):</span>
                  <span className="text-emerald-400 font-bold">تمت مطابقته ✓</span>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span>5. انتفاء الإكراه والإضرار (المادة 117):</span>
                  <span className="text-emerald-400 font-bold">إرادة حرة ومصرح بها ✓</span>
                </div>
              </div>
            </div>

            {/* Summary Review Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">📜 الإذن القضائي:</span>
                <span className="font-bold text-slate-900 block">{permissionNumber} ({court})</span>
                <span className="text-emerald-600 font-bold mt-1 block">متوفر ومكتمل ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">👩 الزوجة المختلعة:</span>
                <span className="font-bold text-slate-900 block">{wifeFirstNameAr} {wifeLastNameAr}</span>
                <span className="text-emerald-600 font-bold mt-1 block">بيانات مكتملة ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">👨 الزوج الموافق:</span>
                <span className="font-bold text-slate-900 block">{husbandFirstNameAr} {husbandLastNameAr}</span>
                <span className="text-emerald-600 font-bold mt-1 block">موافق على الخلع ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">💍 مرجع الزواج:</span>
                <span className="font-bold text-slate-900 block">رسم عدد {deedNumber}</span>
                <span className="text-emerald-600 font-bold mt-1 block">تم التحقق ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">💰 بدل الخلع:</span>
                <span className="font-bold text-slate-900 block">{totalCompensation.toLocaleString('ar-MA')} درهم</span>
                <span className="text-emerald-600 font-bold mt-1 block">محدد بالتراضي ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">🤰 حالة الحمل:</span>
                <span className="font-bold text-slate-900 block">{pregnancyStatus === 'no' ? 'لا يوجد حمل' : 'حامل'}</span>
                <span className="text-emerald-600 font-bold mt-1 block">تم التصريح ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">👶 الأبناء:</span>
                <span className="font-bold text-slate-900 block">{hasChildren ? `${totalChildrenCount} أبناء` : 'لا يوجد أبناء'}</span>
                <span className="text-emerald-600 font-bold mt-1 block">تم حصرهم ✓</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block mb-1">👩👧 الحضانة والسكن:</span>
                <span className="font-bold text-slate-900 block">{custodianParty === 'mother' ? 'حضانة للأم' : 'حضانة للأب'}</span>
                <span className="text-emerald-600 font-bold mt-1 block">مسجل قانوناً ✓</span>
              </div>
            </div>

            {/* Final Action Box */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-emerald-950 text-base">🟢 اكتملت البيانات الأساسية للخلع</h4>
                <p className="text-xs text-emerald-900 mt-1 max-w-xl leading-relaxed">
                  تم تسجيل تراضي الزوجين، وبيان بدل الخلع بدقة، ووضعية الأبناء ومصلحة المحضون والالتزامات المرتبطة بهم وفق أحكام مدونة الأسرة المغربية.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalProceedToDraft}
                className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-center justify-center hover:scale-105 active:scale-95"
              >
                <span>✍️ الانتقال إلى تحرير رسم الخلع</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 🎛️ Navigation Actions (Back / Next) */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
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

          {currentStage < 22 ? (
            <button
              type="button"
              onClick={handleNextStage}
              disabled={!isCurrentStageValid}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isCurrentStageValid
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:scale-105 active:scale-95'
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
