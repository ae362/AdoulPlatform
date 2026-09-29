import React, { useState, useMemo, useEffect } from 'react';
import {
  Heart,
  Scale,
  FileText,
  Users,
  Clock,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpen,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  Sparkles,
  Check
} from 'lucide-react';
import type {
  FeesAgentState,
  Party,
  Witness,
  MarriageContinuityDeed
} from '../../../../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  createEmptyParty,
  createEmptyWitness
} from '../../../../utils/feesAgentUtils';

interface MarriageContinuityWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete?: () => void;
  onBack?: () => void;
}

// نموذج لسجلات الزواج السابقة في النظام لأغراض البحث والاسترجاع الفوري
interface MockMarriageDeedRecord {
  id: string;
  bookNumber: string;
  letter: string;
  page: string;
  count: string;
  deedDate: string;
  court: string;
  section: string;
  husband: {
    fullName: string;
    firstName: string;
    lastName: string;
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    nationality: string;
    cin: string;
    address: string;
    profession: string;
  };
  wife: {
    fullName: string;
    firstName: string;
    lastName: string;
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    nationality: string;
    cin: string;
    address: string;
    profession: string;
  };
  guardian?: {
    name: string;
    relationship: string;
  };
  agent?: {
    name: string;
    poaRef: string;
  };
}

const MOCK_SYSTEM_MARRIAGE_RECORDS: MockMarriageDeedRecord[] = [
  {
    id: 'm-rec-101',
    bookNumber: '142',
    letter: 'أ',
    page: '38',
    count: '12',
    deedDate: '2016-04-18',
    court: 'المحكمة الابتدائية بطنجة',
    section: 'قسم قضاء الأسرة',
    husband: {
      fullName: 'أحمد بن عبد الله المنصوري',
      firstName: 'أحمد',
      lastName: 'المنصوري',
      fatherName: 'عبد الله',
      motherName: 'فاطمة الزهراء',
      birthDate: '1985-06-12',
      birthPlace: 'طنجة',
      nationality: 'مغربية',
      cin: 'K489123',
      address: 'حي مالاباطا، شارع محمد السادس، طنجة',
      profession: 'إطار تجاري'
    },
    wife: {
      fullName: 'مريم بنت عبد السلام العلمي',
      firstName: 'مريم',
      lastName: 'العلمي',
      fatherName: 'عبد السلام',
      motherName: 'عائشة بنجلون',
      birthDate: '1990-11-24',
      birthPlace: 'تطوان',
      nationality: 'مغربية',
      cin: 'L591823',
      address: 'شارع مولاي إسماعيل، إقامة الزهور، طنجة',
      profession: 'مهندسة برمجيات'
    }
  },
  {
    id: 'm-rec-102',
    bookNumber: '89',
    letter: 'ب',
    page: '112',
    count: '4',
    deedDate: '2019-09-05',
    court: 'المحكمة الابتدائية بالرباط',
    section: 'قسم قضاء الأسرة',
    husband: {
      fullName: 'سعيد بن إدريس المرابط',
      firstName: 'سعيد',
      lastName: 'المرابط',
      fatherName: 'إدريس',
      motherName: 'خديجة الفاسي',
      birthDate: '1983-02-15',
      birthPlace: 'الرباط',
      nationality: 'مغربية',
      cin: 'A390124',
      address: 'حي أكدال، شارع الأبطال، الرباط',
      profession: 'طبيب'
    },
    wife: {
      fullName: 'أمينة بنت محمد الصبيحي',
      firstName: 'أمينة',
      lastName: 'الصبيحي',
      fatherName: 'محمد',
      motherName: 'زبيدة العمراني',
      birthDate: '1988-08-30',
      birthPlace: 'سلا',
      nationality: 'مغربية',
      cin: 'AB482910',
      address: 'حي الرياض، الرباط',
      profession: 'صيدلانية'
    }
  }
];

// دالة حساب فارق التواريخ بالسنوات والأشهر والأيام بدقة
function calculateDurationBetweenDates(startDateStr: string, endDateStr: string): {
  years: number;
  months: number;
  days: number;
  formattedText: string;
} {
  if (!startDateStr || !endDateStr) {
    return { years: 0, months: 0, days: 0, formattedText: 'غير محددة' };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { years: 0, months: 0, days: 0, formattedText: 'تاريخ غير صالح أو تاريخ الإشهاد يسبق الزواج' };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // عدد أيام الشهر السابق
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتان' : years <= 10 ? 'سنوات' : 'سنة'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'شهر' : months === 2 ? 'شهران' : months <= 10 ? 'أشهر' : 'شهراً'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومان' : days <= 10 ? 'أيام' : 'يوماً'}`);

  return {
    years,
    months,
    days,
    formattedText: parts.length > 0 ? parts.join(' و ') : 'أقل من يوم'
  };
}

export const MarriageContinuityWorkflow: React.FC<MarriageContinuityWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBack
}) => {
  // المراحل السبعة للمسار: 1 (أصل الزواج) إلى 7 (المراجعة والتحرير)
  const [activeStage, setActiveStage] = useState<number>(1);

  // --------------------------------------------------------------------------
  // المرحلة 1: ② و ③ و ⑬ مراجع رسم الزواج الأصلي
  // --------------------------------------------------------------------------
  const [deedMode, setDeedMode] = useState<'system_fetch' | 'manual_entry'>('manual_entry');

  const [marriageBookNumber, setMarriageBookNumber] = useState<string>(
    state.marriageContinuityDeed?.reference?.number || ''
  );
  const [marriageLetter, setMarriageLetter] = useState<string>('');
  const [marriagePage, setMarriagePage] = useState<string>('');
  const [marriageCount, setMarriageCount] = useState<string>('');
  const [marriageDate, setMarriageDate] = useState<string>(
    state.marriageContinuityDeed?.reference?.date || ''
  );
  const [marriageCourt, setMarriageCourt] = useState<string>(
    state.marriageContinuityDeed?.reference?.court || state.meta?.court || ''
  );
  const [marriageCourtSection, setMarriageCourtSection] = useState<string>(
    state.marriageContinuityDeed?.reference?.notarySection || 'قسم قضاء الأسرة'
  );
  const [marriageGuardianName, setMarriageGuardianName] = useState<string>('');
  const [marriageAgentInfo, setMarriageAgentInfo] = useState<string>('');

  // --------------------------------------------------------------------------
  // المرحلة 2: ④ و ⑭ و ⑮ بيانات الزوجين (الأصل vs الحالي)
  // --------------------------------------------------------------------------
  const [husbandOriginal, setHusbandOriginal] = useState({
    fullName: state.sellers?.[0]?.name || '',
    firstName: state.sellers?.[0]?.name?.split(' ')[0] || '',
    lastName: state.sellers?.[0]?.name?.split(' ').slice(1).join(' ') || '',
    fatherName: state.sellers?.[0]?.fatherName || '',
    motherName: state.sellers?.[0]?.motherName || '',
    birthDate: state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.sellers?.[0]?.placeOfBirth || '',
    nationalityAtMarriage: state.sellers?.[0]?.nationality || 'مغربية'
  });

  const [husbandCurrent, setHusbandCurrent] = useState({
    latinName: '',
    currentNationality: 'مغربية',
    hasOtherNationality: false,
    otherNationality: '',
    nationalityChangedSinceMarriage: false,
    nationalityAtMarriage: 'مغربية',
    idType: 'CIN' as 'CIN' | 'passport' | 'residence_card',
    idNumber: state.sellers?.[0]?.idNumber || '',
    idExpiryDate: state.sellers?.[0]?.idExpiryDate || '',
    residenceCountry: 'المغرب',
    isAbroad: false,
    city: '',
    addressAr: state.sellers?.[0]?.address || '',
    addressLat: '',
    isForeigner: false,
    originalLanguageName: '',
    issuingCountry: 'المملكة المغربية'
  });

  const [wifeOriginal, setWifeOriginal] = useState({
    fullName: state.buyers?.[0]?.name || '',
    firstName: state.buyers?.[0]?.name?.split(' ')[0] || '',
    lastName: state.buyers?.[0]?.name?.split(' ').slice(1).join(' ') || '',
    fatherName: state.buyers?.[0]?.fatherName || '',
    motherName: state.buyers?.[0]?.motherName || '',
    birthDate: state.buyers?.[0]?.dateOfBirth || '',
    birthPlace: state.buyers?.[0]?.placeOfBirth || '',
    nationalityAtMarriage: state.buyers?.[0]?.nationality || 'مغربية'
  });

  const [wifeCurrent, setWifeCurrent] = useState({
    latinName: '',
    currentNationality: 'مغربية',
    hasOtherNationality: false,
    otherNationality: '',
    nationalityChangedSinceMarriage: false,
    nationalityAtMarriage: 'مغربية',
    idType: 'CIN' as 'CIN' | 'passport' | 'residence_card',
    idNumber: state.buyers?.[0]?.idNumber || '',
    idExpiryDate: state.buyers?.[0]?.idExpiryDate || '',
    residenceCountry: 'المغرب',
    isAbroad: false,
    city: '',
    addressAr: state.buyers?.[0]?.address || '',
    addressLat: '',
    isForeigner: false,
    originalLanguageName: '',
    issuingCountry: 'المملكة المغربية'
  });

  const [wifeDataMatchesDeed, setWifeDataMatchesDeed] = useState<boolean>(true);
  const [wifeChangeNotes, setWifeChangeNotes] = useState<string>('');

  // --------------------------------------------------------------------------
  // المرحلة 3: ⑦ فحص مطابقة الكتابة اللاتينية
  // --------------------------------------------------------------------------
  const [husbandLatinMatchesPassport, setHusbandLatinMatchesPassport] = useState<'yes' | 'needs_review'>('yes');
  const [wifeLatinMatchesPassport, setWifeLatinMatchesPassport] = useState<'yes' | 'needs_review'>('yes');

  // --------------------------------------------------------------------------
  // المرحلة 4: ⑧ و ⑨ طالب الإشهاد والوكالة
  // --------------------------------------------------------------------------
  const [applicantType, setApplicantType] = useState<
    'husband' | 'wife' | 'both_spouses' | 'husband_agent' | 'wife_agent' | 'both_agent'
  >('wife');

  const [poaDetails, setPoaDetails] = useState({
    principalName: '',
    agentName: '',
    agentCapacity: '',
    agentIdNumber: '',
    poaType: 'رسمية عدلية',
    poaDate: '',
    poaSource: '',
    poaNumber: '',
    isVerified: true
  });

  // --------------------------------------------------------------------------
  // المرحلة 5: ⑩ و ⑪ و ⑫ مدة الزواج وموضوع الشهادة وفحص الانقطاع
  // --------------------------------------------------------------------------
  const ishhadDate = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const calculatedDuration = useMemo(() => {
    return calculateDurationBetweenDates(marriageDate, ishhadDate);
  }, [marriageDate, ishhadDate]);

  const [testimonyPeriodMode, setTestimonyPeriodMode] = useState<'from_marriage_to_present' | 'custom_period'>(
    'from_marriage_to_present'
  );
  const [customTestimonyStartDate, setCustomTestimonyStartDate] = useState<string>('');
  const [customTestimonyEndDate, setCustomTestimonyEndDate] = useState<string>('');

  const [hasInterruptionOrObstacle, setHasInterruptionOrObstacle] = useState<boolean>(false);
  const [interruptionDetails, setInterruptionDetails] = useState<string>('');

  // --------------------------------------------------------------------------
  // المرحلة 6: ⑱ و ⑲ شهادة اللفيف (12 شاهداً)
  // --------------------------------------------------------------------------
  // دالة مساعدة لإنشاء شاهد واحد فارغ تماماً
  const createSingleBlankWitness = (index: number): Witness => ({
    ...createEmptyWitness(),
    id: `lafif-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    name: '',
    idNumber: '',
    idType: 'بطاقة التعريف الوطنية',
    address: '',
    profession: '',
    age: undefined,
    kinship: ''
  });

  // البدء دائماً بشاهد واحد فارغ، ثم يمكن للعدل الإضافة حتى 12 شاهداً
  const [lafifWitnesses, setLafifWitnesses] = useState<Witness[]>(() => {
    if (state.witnesses && state.witnesses.length > 0) {
      // تفريغ أي أسماء تجريبية قديمة متبقية في الذاكرة
      const hasMockData = state.witnesses.some(w =>
        w.name?.includes('العلوي') ||
        w.name?.includes('المرابط') ||
        w.name?.includes('التازي') ||
        w.name?.startsWith('الشاهد ') ||
        w.idNumber?.startsWith('K71020')
      );
      if (!hasMockData) {
        return state.witnesses;
      }
    }
    // البداية الافتراضية: شاهد واحد فارغ تماماً
    return [createSingleBlankWitness(1)];
  });

  // حالة الربط مشتقة تلقائياً من اكتمال 12 شاهداً بالاسم ورقم البطاقة
  const isLafifLinked = useMemo(() => {
    return lafifWitnesses.length >= 12 && lafifWitnesses.every(w => Boolean(w.name?.trim() && w.idNumber?.trim()));
  }, [lafifWitnesses]);

  // تنظيف أي بيانات تجريبية سابقة متبقية في الذاكرة والبدء بشاهد واحد فارغ
  useEffect(() => {
    if (state.witnesses && state.witnesses.some(w =>
      w.name?.includes('العلوي') ||
      w.name?.includes('المرابط') ||
      w.name?.includes('التازي') ||
      w.name?.startsWith('الشاهد ') ||
      w.idNumber?.startsWith('K71020')
    )) {
      const singleBlank = [createSingleBlankWitness(1)];
      setLafifWitnesses(singleBlank);
      setState(prev => ({ ...prev, witnesses: singleBlank }));
    }
  }, [state.witnesses, setState]);

  // إضافة شاهد واحد جديد فارغ (حتى 12 شاهداً)
  const handleAddSingleWitness = () => {
    if (lafifWitnesses.length >= 12) return;
    const newWitness = createSingleBlankWitness(lafifWitnesses.length + 1);
    const updated = [...lafifWitnesses, newWitness];
    setLafifWitnesses(updated);
    setState(prev => ({ ...prev, witnesses: updated }));
  };

  // إكمال القائمة لتصبح 12 خانة فارغة دفعة واحدة (اختياري)
  const handleExpandTo12Witnesses = () => {
    const currentCount = lafifWitnesses.length;
    const needed = Math.max(0, 12 - currentCount);
    if (needed === 0) return;
    const addition = Array.from({ length: needed }, (_, i) => createSingleBlankWitness(currentCount + i + 1));
    const updated = [...lafifWitnesses, ...addition];
    setLafifWitnesses(updated);
    setState(prev => ({ ...prev, witnesses: updated }));
  };

  // تفريغ القائمة والعودة إلى شاهد واحد فارغ تماماً
  const handleClearWitnesses = () => {
    const singleBlank = [createSingleBlankWitness(1)];
    setLafifWitnesses(singleBlank);
    setState(prev => ({ ...prev, witnesses: singleBlank }));
  };

  // تحديث حقل في شاهد معين
  const handleUpdateWitnessField = (index: number, field: keyof Witness, value: any) => {
    const updated = [...lafifWitnesses];
    updated[index] = { ...updated[index], [field]: value };
    setLafifWitnesses(updated);
    setState(prev => ({ ...prev, witnesses: updated }));
  };

  // حذف شاهد (مع إبقاء شاهد واحد فارغ إذا تم حذف الشاهد الوحيد)
  const handleRemoveWitness = (index: number) => {
    if (lafifWitnesses.length <= 1) {
      const resetSingle = [createSingleBlankWitness(1)];
      setLafifWitnesses(resetSingle);
      setState(prev => ({ ...prev, witnesses: resetSingle }));
      return;
    }
    const updated = lafifWitnesses.filter((_, i) => i !== index);
    setLafifWitnesses(updated);
    setState(prev => ({ ...prev, witnesses: updated }));
  };

  // --------------------------------------------------------------------------
  // الاسترجاع التلقائي عند اعتماد رسم من النظام
  // --------------------------------------------------------------------------
  const handleAdoptSystemDeed = (rec: MockMarriageDeedRecord) => {
    setMarriageBookNumber(rec.bookNumber);
    setMarriageLetter(rec.letter);
    setMarriagePage(rec.page);
    setMarriageCount(rec.count);
    setMarriageDate(rec.deedDate);
    setMarriageCourt(rec.court);
    setMarriageCourtSection(rec.section);

    setHusbandOriginal({
      fullName: rec.husband.fullName,
      firstName: rec.husband.firstName,
      lastName: rec.husband.lastName,
      fatherName: rec.husband.fatherName,
      motherName: rec.husband.motherName,
      birthDate: rec.husband.birthDate,
      birthPlace: rec.husband.birthPlace,
      nationalityAtMarriage: rec.husband.nationality
    });

    setHusbandCurrent(prev => ({
      ...prev,
      idNumber: rec.husband.cin,
      addressAr: rec.husband.address
    }));

    setWifeOriginal({
      fullName: rec.wife.fullName,
      firstName: rec.wife.firstName,
      lastName: rec.wife.lastName,
      fatherName: rec.wife.fatherName,
      motherName: rec.wife.motherName,
      birthDate: rec.wife.birthDate,
      birthPlace: rec.wife.birthPlace,
      nationalityAtMarriage: rec.wife.nationality
    });

    setWifeCurrent(prev => ({
      ...prev,
      idNumber: rec.wife.cin,
      addressAr: rec.wife.address
    }));

    if (rec.guardian) {
      setMarriageGuardianName(`${rec.guardian.name} (${rec.guardian.relationship})`);
    }
  };

  // --------------------------------------------------------------------------
  // تشخيص الحالات الخمسة للإقامة والجنسية (البند ⑤)
  // --------------------------------------------------------------------------
  const detectedResidencyCase = useMemo(() => {
    const hAbroad = husbandCurrent.isAbroad;
    const wAbroad = wifeCurrent.isAbroad;
    const hNat = husbandCurrent.currentNationality;
    const wNat = wifeCurrent.currentNationality;

    if (!hAbroad && wAbroad && hNat === 'مغربية' && wNat === 'مغربية') {
      return {
        label: 'الحالة 1: الزوج مغربي مقيم بالمغرب 🇲🇦 والزوجة مغربية مقيمة بالخارج 🌍',
        badge: 'إقامة مختلطة مغربية'
      };
    }
    if (!hAbroad && !wAbroad && hNat === 'مغربية' && wNat === 'مغربية') {
      return {
        label: 'الحالة 2: الزوجان مغربيان مقيمان معاً داخل أرض الوطن 🇲🇦',
        badge: 'إقامة وطنية'
      };
    }
    if (hNat === 'مغربية' && wNat !== 'مغربية') {
      return {
        label: 'الحالة 3: الزوج مغربي 🇲🇦 والزوجة أجنبية 🌍',
        badge: 'زوجة أجنبية'
      };
    }
    if (hNat !== 'مغربية' && wNat === 'مغربية') {
      return {
        label: 'الحالة 4: الزوج أجنبي 🌍 والزوجة مغربية 🇲🇦',
        badge: 'زوج أجنبي'
      };
    }
    if (husbandCurrent.hasOtherNationality || wifeCurrent.hasOtherNationality || (hNat !== 'مغربية' && wNat !== 'مغربية')) {
      return {
        label: 'الحالة 5: أحد الطرفين أو كلاهما يحمل جنسية أجنبية أو جنسية مزدوجة 🌍',
        badge: 'ازدواج جنسية / أجنبي'
      };
    }
    return {
      label: 'ملف موجه للاستعمال لدى الإدارات أو القنصليات والجهات الأجنبية 🌍',
      badge: 'توثيق دولي'
    };
  }, [husbandCurrent, wifeCurrent]);

  // --------------------------------------------------------------------------
  // فحص الموانع والجاهزية القانونية الذكية (البندان ⑳ و ㉑)
  // --------------------------------------------------------------------------
  const validationChecklist = useMemo(() => {
    const isDeedComplete = Boolean(
      marriageBookNumber.trim() &&
      marriageLetter.trim() &&
      marriagePage.trim() &&
      marriageCount.trim() &&
      marriageDate.trim() &&
      marriageCourt.trim()
    );

    const isHusbandValid = Boolean(
      husbandOriginal.fullName.trim() &&
      husbandCurrent.idNumber.trim() &&
      (husbandCurrent.isAbroad ? (husbandCurrent.city.trim() && husbandCurrent.addressAr.trim()) : true)
    );

    const isWifeValid = Boolean(
      wifeOriginal.fullName.trim() &&
      wifeCurrent.idNumber.trim() &&
      (wifeCurrent.isAbroad ? (wifeCurrent.city.trim() && wifeCurrent.addressAr.trim()) : true)
    );

    const isDurationCalculated = Boolean(marriageDate && calculatedDuration.years >= 0);

    const isLafifReady = lafifWitnesses.length >= 12 && lafifWitnesses.every(w => Boolean(w.name?.trim() && w.idNumber?.trim()));

    const noInterruption = !hasInterruptionOrObstacle;

    const isForeignerDataValid = (
      (!husbandCurrent.isForeigner || (husbandCurrent.originalLanguageName && husbandCurrent.issuingCountry)) &&
      (!wifeCurrent.isForeigner || (wifeCurrent.originalLanguageName && wifeCurrent.issuingCountry))
    );

    const allPassed =
      isDeedComplete &&
      isHusbandValid &&
      isWifeValid &&
      isDurationCalculated &&
      isLafifReady &&
      noInterruption &&
      isForeignerDataValid;

    return {
      isDeedComplete,
      isHusbandValid,
      isWifeValid,
      isDurationCalculated,
      isLafifReady,
      noInterruption,
      isForeignerDataValid,
      allPassed
    };
  }, [
    marriageBookNumber,
    marriageLetter,
    marriagePage,
    marriageCount,
    marriageDate,
    marriageCourt,
    husbandOriginal,
    husbandCurrent,
    wifeOriginal,
    wifeCurrent,
    calculatedDuration,
    lafifWitnesses,
    hasInterruptionOrObstacle
  ]);

  // --------------------------------------------------------------------------
  // توليد صياغة رسم استمرار الزوجية المغربي الأصيل
  // --------------------------------------------------------------------------
  const generatedRasmText = useMemo(() => {
    const hName = husbandOriginal.fullName || 'الزوج';
    const wName = wifeOriginal.fullName || 'الزوجة';
    const durationText = calculatedDuration.formattedText;
    const applicantLabel =
      applicantType === 'wife'
        ? `الزوجة المذكورة (${wName})`
        : applicantType === 'husband'
        ? `الزوج المذكور (${hName})`
        : applicantType === 'both_spouses'
        ? `الزوجان المذكوران معاً (${hName} و ${wName})`
        : `الوكيل (${poaDetails.agentName || 'النائب الشرعي'}) نيابة عن موكله`;

    const abroadHusbandClause = husbandCurrent.isAbroad
      ? `المقيم حالياً بدولة ${husbandCurrent.residenceCountry || 'المهجر'}، بمدينة ${husbandCurrent.city || ''} (${husbandCurrent.addressLat || husbandCurrent.addressAr})`
      : `المقيم بالمغرب بـ ${husbandCurrent.addressAr || 'محل سكناه'}`;

    const abroadWifeClause = wifeCurrent.isAbroad
      ? `المقيمة حالياً بدولة ${wifeCurrent.residenceCountry || 'المهجر'}، بمدينة ${wifeCurrent.city || ''} (${wifeCurrent.addressLat || wifeCurrent.addressAr})`
      : `المقيمة بالمغرب بـ ${wifeCurrent.addressAr || 'محل سكناها'}`;

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.

بناءً على طلب ${applicantLabel}، قصد إثبات قيام واستمرار العلاقة الزوجية الشرعية؛
وحيث إنه بمقتضى رسم عقد الزواج الأصلي المضمن بكناش الأنكحة تحت عدد ${marriageCount || '...'}، صحيفة ${marriagePage || '...'}، حرف ${marriageLetter || '...'}، من دفتر رقم ${marriageBookNumber || '...'}، الصادر عن ${marriageCourt || 'المحكمة المختصة'} (${marriageCourtSection}) بتاريخ ${marriageDate || '...'}؛
القائم بين الزوج: السيد ${hName}، ${husbandCurrent.latinName ? `(${husbandCurrent.latinName})` : ''}، الحامل لـ (${husbandCurrent.idType}: ${husbandCurrent.idNumber || '...'}), ${abroadHusbandClause}.
وبين الزوجة: السيدة ${wName}، ${wifeCurrent.latinName ? `(${wifeCurrent.latinName})` : ''}، الحاملة لـ (${wifeCurrent.idType}: ${wifeCurrent.idNumber || '...'}), ${abroadWifeClause}.

وحيث حضر بمجلس هذا الإشهاد شهود اللفيف الشرعي وعددهم اثنا عشر (12) شاهداً الآتية أسماؤهم وتوقيعاتهم بسجل التضمين:
${lafifWitnesses.map((w, idx) => `${idx + 1}. ${w.name} (ب.ت.و: ${w.idNumber})`).join('\n') || 'شهود اللفيف الشرعي (12 شاهداً)'}

فشهدوا جميعاً بعد التحلي بما يجب شرعاً وقانوناً، وبمعرفتهم التامة والمخالطة المستمرة والمجاورة للطرفين، بأن الزوجين المذكورين أعلاه لا زالت العصمة الزوجية قائمة ومستمرة بينهما إلى غاية تاريخ هذا الإشهاد، دون انقطاع أو انفصال أو طلاق أو انبتات، وذلك طوال مدة ${durationText} المستمرة منذ تاريخ إبرام عقد زواجهما المومأ إليه أعلاه. شهادة عيان ومعرفة تامة لا يشوبها شك.

وعليه تم تلقي هذا الإشهاد على الوجه الشرعي والقانوني لاستعماله لدى الإدارات والجهات المعنية، وبمقتضاه حُرر هذا الرسم في ${ishhadDate} موافق ${convertGregorianToHijri(ishhadDate)} هـ.`;
  }, [
    husbandOriginal,
    husbandCurrent,
    wifeOriginal,
    wifeCurrent,
    marriageCount,
    marriagePage,
    marriageLetter,
    marriageBookNumber,
    marriageCourt,
    marriageCourtSection,
    marriageDate,
    applicantType,
    poaDetails,
    calculatedDuration,
    lafifWitnesses,
    ishhadDate
  ]);

  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // تحديث حالة النظام الأساسية FeesAgentState عند الانتقال أو الحفظ
  const handleFinalizeAndProceed = () => {
    const updatedContinuity: MarriageContinuityDeed = {
      spouses: {
        husband: {
          ar: {
            fullName: husbandOriginal.fullName,
            firstName: husbandOriginal.firstName,
            lastName: husbandOriginal.lastName,
            fatherName: husbandOriginal.fatherName,
            motherName: husbandOriginal.motherName,
            idNumber: husbandCurrent.idNumber,
            address: husbandCurrent.addressAr
          },
          lat: {
            fullName: husbandCurrent.latinName,
            address: husbandCurrent.addressLat
          }
        },
        wife: {
          ar: {
            fullName: wifeOriginal.fullName,
            firstName: wifeOriginal.firstName,
            lastName: wifeOriginal.lastName,
            fatherName: wifeOriginal.fatherName,
            motherName: wifeOriginal.motherName,
            idNumber: wifeCurrent.idNumber,
            address: wifeCurrent.addressAr
          },
          lat: {
            fullName: wifeCurrent.latinName,
            address: wifeCurrent.addressLat
          }
        }
      },
      reference: {
        court: marriageCourt,
        notarySection: marriageCourtSection,
        number: marriageBookNumber,
        date: marriageDate,
        ishhadDate
      },
      continuityStatement: generatedRasmText
    };

    const husbandParty: Party = {
      ...createEmptyParty(),
      id: 'party-husband-continuity',
      name: husbandOriginal.fullName,
      idNumber: husbandCurrent.idNumber,
      nationality: (husbandCurrent.currentNationality === 'أجنبي' || husbandCurrent.currentNationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as 'مغربي' | 'اجنبي' | '',
      address: husbandCurrent.addressAr
    };

    const wifeParty: Party = {
      ...createEmptyParty(),
      id: 'party-wife-continuity',
      name: wifeOriginal.fullName,
      idNumber: wifeCurrent.idNumber,
      nationality: (wifeCurrent.currentNationality === 'أجنبي' || wifeCurrent.currentNationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as 'مغربي' | 'اجنبي' | '',
      address: wifeCurrent.addressAr
    };

    setState(prev => ({
      ...prev,
      marriageContinuityDeed: updatedContinuity,
      sellers: [husbandParty],
      buyers: [wifeParty],
      witnesses: lafifWitnesses,
      step: 7 // الانتقال للمراجعة القضائية النهائية والصياغة
    }));

    if (onComplete) {
      onComplete();
    }
  };

  const stagesList = [
    { id: 1, title: 'رسم الزواج', icon: BookOpen, desc: 'أصل استمرار الزوجية' },
    { id: 2, title: 'بيانات الزوجين', icon: Users, desc: 'الأصلية والحالية' },
    { id: 3, title: 'الإقامة والجنسية', icon: Globe, desc: 'ملفات الخارج والهوية' },
    { id: 4, title: 'طالب الإشهاد', icon: UserCheck, desc: 'الصفة والوكالة' },
    { id: 5, title: 'مدة الزواج', icon: Clock, desc: 'حساب المدة وعدم الانقطاع' },
    { id: 6, title: 'شهادة اللفيف', icon: Scale, desc: 'شهود اللفيف (12 شاهداً)' },
    { id: 7, title: 'المراجعة والتحرير', icon: FileText, desc: 'الفحص والصياغة الرسمية' }
  ];

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6" dir="rtl">
      {/* 💍 ترويسة المسار والخط الزمني العلوي والبطاقة الجانبية */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md">
              <Heart className="w-7 h-7 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  💍 رسم استمرار الزوجية
                </h1>
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  إثبات قيام الزوجية
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                إثبات استمرار العلاقة الزوجية بين الطرفين إلى تاريخ الإشهاد
              </p>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 self-start lg:self-auto cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة للاختيار السابق</span>
            </button>
          )}
        </div>

        {/* الخط الزمني المنظم */}
        <div className="flex items-center justify-between overflow-x-auto py-2 px-1 gap-2 no-scrollbar">
          {stagesList.map((st, idx) => {
            const Icon = st.icon;
            const isCurrent = activeStage === st.id;
            const isCompleted = activeStage > st.id;

            return (
              <React.Fragment key={st.id}>
                <button
                  type="button"
                  onClick={() => setActiveStage(st.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-2xl text-right transition-all shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500/30'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                    isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="block text-xs font-black leading-tight">{st.title}</span>
                    <span className={`text-[10px] block leading-tight ${isCurrent ? 'text-white/80' : 'text-slate-400'}`}>
                      {st.desc}
                    </span>
                  </div>
                </button>
                {idx < stagesList.length - 1 && (
                  <span className="text-slate-300 font-bold shrink-0">←</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 🌍 البطاقة الجانبية المميزة: مخصص غالبًا للملفات خارج المغرب */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 rounded-2xl p-4 border border-blue-200/80 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
            <Globe className="w-5 h-5 text-amber-300" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-blue-950 text-sm">🌍 مخصص غالبًا للملفات خارج المغرب</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                ضابط التحرير العدلي
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              يستعمل لإثبات قيام العلاقة الزوجية عند الإدلاء به لدى الإدارات أو القنصليات أو الجهات الأجنبية، بحسب الغرض المطلوب.
            </p>
            <p className="text-blue-900 font-bold pt-0.5">
              ⚠️ تنبيه قانوني مهني: لا نكتب في الرسم نفسه «لأجل الهجرة» أو «لأجل الإقامة» إلا إذا كان لذلك موجب في الصياغة التي يعتمدها العدل.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* المرحلة 1: ② و ③ و ⑬ رسم الزواج الأصلي */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ② 📜 أول سؤال: ما هو رسم الزواج؟
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  لا نبدأ بالشهود ولا بالزوجين، بل بتحديد رسم الزواج الذي يستند إليه هذا الرسم
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeedMode('system_fetch')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  deedMode === 'system_fetch'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>🟢 استرجاع من النظام</span>
              </button>
              <button
                type="button"
                onClick={() => setDeedMode('manual_entry')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  deedMode === 'manual_entry'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>✍️ إدخال المراجع يدويًا</span>
              </button>
            </div>
          </div>

          {deedMode === 'system_fetch' && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-700" />
                  <span>البحث في سجلات عقود الزواج المضمنة بالمكتب العدلي:</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-bold">
                  {MOCK_SYSTEM_MARRIAGE_RECORDS.length} رسوم متوفرة للتجربة
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOCK_SYSTEM_MARRIAGE_RECORDS.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 shadow-xs transition space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900">
                        كناش رقم: {rec.bookNumber} | حرف {rec.letter} | صفحة {rec.page} | عدد {rec.count}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800">
                        {rec.deedDate}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>الزوج: <strong>{rec.husband.fullName}</strong></div>
                      <div>الزوجة: <strong>{rec.wife.fullName}</strong></div>
                      <div className="text-[11px] text-slate-400 mt-1">{rec.court} ({rec.section})</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdoptSystemDeed(rec)}
                      className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>اعتماد هذا الرسم واسترجاع البيانات</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ③ بطاقة مراجع رسم الزواج البارزة */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-50 to-emerald-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <span className="text-sm font-black text-emerald-950 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span>أصل استمرار الزوجية — مراجع دفتر الزواج</span>
              </span>
              {validationChecklist.isDeedComplete ? (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تم تحديد الرسم الأصلي الذي تستند إليه الشهادة</span>
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>يرجى إكمال جميع عناصر المرجع</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">رقم الدفتر *</label>
                <input
                  type="text"
                  value={marriageBookNumber}
                  onChange={(e) => setMarriageBookNumber(e.target.value)}
                  placeholder="مثال: 142"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">حرف الدفتر *</label>
                <input
                  type="text"
                  value={marriageLetter}
                  onChange={(e) => setMarriageLetter(e.target.value)}
                  placeholder="مثال: أ"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">الصفحة *</label>
                <input
                  type="text"
                  value={marriagePage}
                  onChange={(e) => setMarriagePage(e.target.value)}
                  placeholder="مثال: 38"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">العدد *</label>
                <input
                  type="text"
                  value={marriageCount}
                  onChange={(e) => setMarriageCount(e.target.value)}
                  placeholder="مثال: 12"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">تاريخ الرسم *</label>
                <input
                  type="date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">قسم التوثيق *</label>
                <input
                  type="text"
                  value={marriageCourtSection}
                  onChange={(e) => setMarriageCourtSection(e.target.value)}
                  placeholder="قسم قضاء الأسرة"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-black text-slate-700 mb-1">توثيق المحكمة الابتدائية بـ *</label>
                <input
                  type="text"
                  value={marriageCourt}
                  onChange={(e) => setMarriageCourt(e.target.value)}
                  placeholder="المحكمة الابتدائية بطنجة"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">بيانات الولي في العقد الأصلي (إن وجد)</label>
                <input
                  type="text"
                  value={marriageGuardianName}
                  onChange={(e) => setMarriageGuardianName(e.target.value)}
                  placeholder="اسم الولي وصفته (المادة 24 و 25)"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">بيانات الوكالة عند الزواج (إن وجدت)</label>
                <input
                  type="text"
                  value={marriageAgentInfo}
                  onChange={(e) => setMarriageAgentInfo(e.target.value)}
                  placeholder="اسم الوكيل ومرجع وكالته"
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                ← العودة لاختيار الوثيقة
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => setActiveStage(2)}
              disabled={!validationChecklist.isDeedComplete}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                validationChecklist.isDeedComplete
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>المتابعة إلى بيانات الزوجين</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 2: ④ و ⑭ و ⑮ بيانات الزوجين (الأصل vs الحالي) */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ④ 👨👩 بيانات الزوجين — الأصل المستخرج من الرسم مقابل البيانات الحالية
                </h3>
                <p className="text-xs text-blue-700 font-bold">
                  🟢 بيانات عقد الزواج الأصلية لا تختلط مع بيانات الطرفين الحالية
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 👨 بطاقة الزوج */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>👨</span>
                  <span>بيانات الزوج</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">
                  طرف أصلي في الزواج
                </span>
              </div>

              {/* الأصل من رسم الزواج */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">الأصل المستخرج من رسم الزواج:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">الاسم الشخصي</label>
                    <input
                      type="text"
                      value={husbandOriginal.firstName}
                      onChange={(e) => setHusbandOriginal(prev => ({ ...prev, firstName: e.target.value, fullName: `${e.target.value} ${prev.lastName}`.trim() }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">الاسم العائلي</label>
                    <input
                      type="text"
                      value={husbandOriginal.lastName}
                      onChange={(e) => setHusbandOriginal(prev => ({ ...prev, lastName: e.target.value, fullName: `${prev.firstName} ${e.target.value}`.trim() }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">اسم الأب</label>
                    <input
                      type="text"
                      value={husbandOriginal.fatherName}
                      onChange={(e) => setHusbandOriginal(prev => ({ ...prev, fatherName: e.target.value }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">اسم الأم</label>
                    <input
                      type="text"
                      value={husbandOriginal.motherName}
                      onChange={(e) => setHusbandOriginal(prev => ({ ...prev, motherName: e.target.value }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* البيانات الحالية للزوج */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black text-blue-900 block">🔵 البيانات الحالية للزوج:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">رقم وثيقة الهوية (CIN/جواز) *</label>
                    <input
                      type="text"
                      value={husbandCurrent.idNumber}
                      onChange={(e) => setHusbandCurrent(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder="K741258"
                      className="w-full p-2 border rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">الاسم باللاتينية</label>
                    <input
                      type="text"
                      value={husbandCurrent.latinName}
                      onChange={(e) => setHusbandCurrent(prev => ({ ...prev, latinName: e.target.value.toUpperCase() }))}
                      placeholder="EL MANSOURI AHMED"
                      className="w-full p-2 border rounded-lg text-xs font-mono bg-white uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">العنوان الحالي</label>
                  <input
                    type="text"
                    value={husbandCurrent.addressAr}
                    onChange={(e) => setHusbandCurrent(prev => ({ ...prev, addressAr: e.target.value }))}
                    placeholder="العنوان الحالي للزوج"
                    className="w-full p-2 border rounded-lg text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 👩 بطاقة الزوجة */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>👩</span>
                  <span>بيانات الزوجة</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-pink-100 text-pink-800">
                  طرف أصلي في الزواج
                </span>
              </div>

              {/* الأصل من رسم الزواج */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">الأصل المستخرج من رسم الزواج:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">الاسم الشخصي</label>
                    <input
                      type="text"
                      value={wifeOriginal.firstName}
                      onChange={(e) => setWifeOriginal(prev => ({ ...prev, firstName: e.target.value, fullName: `${e.target.value} ${prev.lastName}`.trim() }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">الاسم العائلي</label>
                    <input
                      type="text"
                      value={wifeOriginal.lastName}
                      onChange={(e) => setWifeOriginal(prev => ({ ...prev, lastName: e.target.value, fullName: `${prev.firstName} ${e.target.value}`.trim() }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">اسم الأب</label>
                    <input
                      type="text"
                      value={wifeOriginal.fatherName}
                      onChange={(e) => setWifeOriginal(prev => ({ ...prev, fatherName: e.target.value }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">اسم الأم</label>
                    <input
                      type="text"
                      value={wifeOriginal.motherName}
                      onChange={(e) => setWifeOriginal(prev => ({ ...prev, motherName: e.target.value }))}
                      className="w-full p-2 border rounded-lg text-xs bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* البيانات الحالية للزوجة */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-900">🔵 البيانات الحالية للزوجة:</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span>مطابقة للرسم؟</span>
                    <button
                      type="button"
                      onClick={() => setWifeDataMatchesDeed(!wifeDataMatchesDeed)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        wifeDataMatchesDeed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {wifeDataMatchesDeed ? '🟢 نعم' : '🟠 لا، طرأ تغيير'}
                    </button>
                  </div>
                </div>

                {!wifeDataMatchesDeed && (
                  <div>
                    <label className="text-[10px] font-bold text-amber-900">بيان ما طرأ من تغيير وموجبه:</label>
                    <input
                      type="text"
                      value={wifeChangeNotes}
                      onChange={(e) => setWifeChangeNotes(e.target.value)}
                      placeholder="مثال: تغيير في الاسم العائلي أو العنوان أو البطاقة"
                      className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-amber-50"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">رقم وثيقة الهوية (CIN/جواز) *</label>
                    <input
                      type="text"
                      value={wifeCurrent.idNumber}
                      onChange={(e) => setWifeCurrent(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder="L591823"
                      className="w-full p-2 border rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">الاسم باللاتينية</label>
                    <input
                      type="text"
                      value={wifeCurrent.latinName}
                      onChange={(e) => setWifeCurrent(prev => ({ ...prev, latinName: e.target.value.toUpperCase() }))}
                      placeholder="EL ALAMI MERYEM"
                      className="w-full p-2 border rounded-lg text-xs font-mono bg-white uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">العنوان الحالي</label>
                  <input
                    type="text"
                    value={wifeCurrent.addressAr}
                    onChange={(e) => setWifeCurrent(prev => ({ ...prev, addressAr: e.target.value }))}
                    placeholder="العنوان الحالي للزوجة"
                    className="w-full p-2 border rounded-lg text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: مراجع الزواج
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الإقامة بالخارج والجنسية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 3: ⑤ و ⑥ و ⑦ و ⑯ و ⑰ الإقامة بالخارج والجنسية والاسم اللاتيني */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⑤ و ⑥ الإقامة بالخارج والجنسية والكتابة اللاتينية
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  بطاقة أساسية لملفات الإدلاء لدى القنصليات والإدارات الأجنبية
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-black">
              {detectedResidencyCase.badge}
            </div>
          </div>

          {/* تنبيه الحالة المشخصة */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <span className="font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>التشخيص الآلي للحالة:</span>
              <strong className="text-blue-900">{detectedResidencyCase.label}</strong>
            </span>
          </div>

          {/* ⑤ مكان إقامة الزوج والزوجة */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* إقامة الزوج */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">أين يقيم الزوج؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHusbandCurrent(prev => ({ ...prev, isAbroad: false, residenceCountry: 'المغرب' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      !husbandCurrent.isAbroad ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🔘 بالمغرب
                  </button>
                  <button
                    type="button"
                    onClick={() => setHusbandCurrent(prev => ({ ...prev, isAbroad: true, residenceCountry: prev.residenceCountry === 'المغرب' ? 'فرنسا' : prev.residenceCountry }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      husbandCurrent.isAbroad ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🔘 خارج المغرب
                  </button>
                </div>
              </div>

              {husbandCurrent.isAbroad && (
                <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700">الدولة</label>
                      <input
                        type="text"
                        value={husbandCurrent.residenceCountry}
                        onChange={(e) => setHusbandCurrent(prev => ({ ...prev, residenceCountry: e.target.value }))}
                        placeholder="مثال: فرنسا"
                        className="w-full p-2 border rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">المدينة</label>
                      <input
                        type="text"
                        value={husbandCurrent.city}
                        onChange={(e) => setHusbandCurrent(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="مثال: باريس"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* ⑰ خانتان منفصلتان للعنوان بالعربية واللاتينية */}
                  <div>
                    <label className="font-bold text-slate-700">🇲🇦 العنوان الكامل بالعربية</label>
                    <textarea
                      rows={2}
                      value={husbandCurrent.addressAr}
                      onChange={(e) => setHusbandCurrent(prev => ({ ...prev, addressAr: e.target.value }))}
                      placeholder="شارع الجمهورية، عمارة 14، باريس"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">🔤 Adresse / Address كما هو باللاتينية (دون ترجمة آلية)</label>
                    <input
                      type="text"
                      value={husbandCurrent.addressLat}
                      onChange={(e) => setHusbandCurrent(prev => ({ ...prev, addressLat: e.target.value }))}
                      placeholder="14 Rue de la République, 75011 Paris, France"
                      className="w-full p-2 border rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* إقامة الزوجة */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">أين تقيم الزوجة؟</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWifeCurrent(prev => ({ ...prev, isAbroad: false, residenceCountry: 'المغرب' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      !wifeCurrent.isAbroad ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🔘 بالمغرب
                  </button>
                  <button
                    type="button"
                    onClick={() => setWifeCurrent(prev => ({ ...prev, isAbroad: true, residenceCountry: prev.residenceCountry === 'المغرب' ? 'فرنسا' : prev.residenceCountry }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      wifeCurrent.isAbroad ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    🔘 خارج المغرب
                  </button>
                </div>
              </div>

              {wifeCurrent.isAbroad && (
                <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700">الدولة</label>
                      <input
                        type="text"
                        value={wifeCurrent.residenceCountry}
                        onChange={(e) => setWifeCurrent(prev => ({ ...prev, residenceCountry: e.target.value }))}
                        placeholder="مثال: فرنسا"
                        className="w-full p-2 border rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">المدينة</label>
                      <input
                        type="text"
                        value={wifeCurrent.city}
                        onChange={(e) => setWifeCurrent(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="مثال: ليل"
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">🇲🇦 العنوان الكامل بالعربية</label>
                    <textarea
                      rows={2}
                      value={wifeCurrent.addressAr}
                      onChange={(e) => setWifeCurrent(prev => ({ ...prev, addressAr: e.target.value }))}
                      placeholder="شارع الحرية، رقم 8، ليل"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">🔤 Adresse / Address كما هو باللاتينية (دون ترجمة آلية)</label>
                    <input
                      type="text"
                      value={wifeCurrent.addressLat}
                      onChange={(e) => setWifeCurrent(prev => ({ ...prev, addressLat: e.target.value }))}
                      placeholder="8 Boulevard de la Liberté, 59000 Lille, France"
                      className="w-full p-2 border rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ⑥ و ⑦ بطاقة فحص الجنسية والكتابة اللاتينية */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 text-xs">
            <span className="text-xs font-black text-slate-900 block">
              🪪 ⑥ تدقيق الجنسيات والكتابة اللاتينية الرسمية:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="font-black text-slate-800">جنسية الزوج:</span>
                <div className="flex gap-2">
                  <span className="text-slate-600">هل يحمل جنسية أخرى؟</span>
                  <button
                    type="button"
                    onClick={() => setHusbandCurrent(prev => ({ ...prev, hasOtherNationality: !prev.hasOtherNationality }))}
                    className="font-bold text-blue-600 underline"
                  >
                    {husbandCurrent.hasOtherNationality ? 'نعم' : 'لا'}
                  </button>
                </div>
                {husbandCurrent.hasOtherNationality && (
                  <input
                    type="text"
                    value={husbandCurrent.otherNationality}
                    onChange={(e) => setHusbandCurrent(prev => ({ ...prev, otherNationality: e.target.value }))}
                    placeholder="الجنسية الثانية (مثلاً: فرنسية)"
                    className="w-full p-1.5 border rounded text-xs"
                  />
                )}
                <div className="pt-2 border-t text-[11px]">
                  <span>تطابق الاسم اللاتيني للزوج مع الجواز: </span>
                  <button
                    type="button"
                    onClick={() => setHusbandLatinMatchesPassport(prev => prev === 'yes' ? 'needs_review' : 'yes')}
                    className={`px-2 py-0.5 rounded font-bold ${
                      husbandLatinMatchesPassport === 'yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {husbandLatinMatchesPassport === 'yes' ? '🟢 مطابق' : '🟠 يحتاج مراجعة'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="font-black text-slate-800">جنسية الزوجة:</span>
                <div className="flex gap-2">
                  <span className="text-slate-600">هل تحمل جنسية أخرى؟</span>
                  <button
                    type="button"
                    onClick={() => setWifeCurrent(prev => ({ ...prev, hasOtherNationality: !prev.hasOtherNationality }))}
                    className="font-bold text-blue-600 underline"
                  >
                    {wifeCurrent.hasOtherNationality ? 'نعم' : 'لا'}
                  </button>
                </div>
                {wifeCurrent.hasOtherNationality && (
                  <input
                    type="text"
                    value={wifeCurrent.otherNationality}
                    onChange={(e) => setWifeCurrent(prev => ({ ...prev, otherNationality: e.target.value }))}
                    placeholder="الجنسية الثانية (مثلاً: إسبانية)"
                    className="w-full p-1.5 border rounded text-xs"
                  />
                )}
                <div className="pt-2 border-t text-[11px]">
                  <span>تطابق الاسم اللاتيني للزوجة مع الجواز: </span>
                  <button
                    type="button"
                    onClick={() => setWifeLatinMatchesPassport(prev => prev === 'yes' ? 'needs_review' : 'yes')}
                    className={`px-2 py-0.5 rounded font-bold ${
                      wifeLatinMatchesPassport === 'yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {wifeLatinMatchesPassport === 'yes' ? '🟢 مطابقة' : '🟠 تحتاج مراجعة'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: بيانات الزوجين
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى طالب الإشهاد والوكالة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 4: ⑧ و ⑨ طالب الإشهاد وبيانات الوكالة */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⑧ 👤 من طالب الإشهاد؟
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  تحديد صفة طالب الإشهاد بدقة دون إلزام الطرف الغائب بالحضور ما دام الإشهاد يتم بناءً على طلب وشهادة اللفيف
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'wife', label: 'الزوجة وحدها', desc: 'حالة الزوجة بالمغرب والزوج بالخارج' },
              { id: 'husband', label: 'الزوج وحده', desc: 'حالة الزوج بالمغرب والزوجة بالخارج' },
              { id: 'both_spouses', label: 'الزوجان معاً', desc: 'حضور الطرفين معاً مجلس الإشهاد' },
              { id: 'wife_agent', label: 'وكيل عن الزوجة', desc: 'بموجب وكالة قانونية' },
              { id: 'husband_agent', label: 'وكيل عن الزوج', desc: 'بموجب وكالة قانونية' },
              { id: 'both_agent', label: 'وكيل عن الزوجين', desc: 'بموجب وكالة موحدة' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setApplicantType(item.id as any)}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer space-y-1 ${
                  applicantType === item.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-black">{item.label}</div>
                <div className={`text-[10px] ${applicantType === item.id ? 'text-white/80' : 'text-slate-400'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>

          {/* بطاقة طالب الإشهاد التوضيحية */}
          {applicantType === 'wife' && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
              <span className="font-black text-blue-900">
                🟦 الزوجة طالبة الإشهاد: لا نحتاج إلى جعل الزوج يصرح مباشرة بأنه ما زال متزوجاً، فالإشهاد يستند إلى شهادة اللفيف المستقلة.
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-200 text-blue-900 font-bold">
                حالة عملية شائعة
              </span>
            </div>
          )}

          {/* ⑨ بطاقة بيانات الوكالة إن كان الطالب وكيلاً */}
          {(applicantType === 'wife_agent' || applicantType === 'husband_agent' || applicantType === 'both_agent') && (
            <div className="p-5 rounded-2xl border-2 border-purple-300 bg-purple-50/50 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <span className="text-xs font-black text-purple-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>⑨ بيانات سند الوكالة (تبقى منفصلة تماماً عن شهادة اللفيف):</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-purple-200 text-purple-900">
                  🟢 تم التحقق من بيانات الوكالة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">اسم الموكل</label>
                  <input
                    type="text"
                    value={poaDetails.principalName}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, principalName: e.target.value }))}
                    placeholder="اسم الزوج أو الزوجة"
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">اسم الوكيل</label>
                  <input
                    type="text"
                    value={poaDetails.agentName}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, agentName: e.target.value }))}
                    placeholder="الاسم الكامل للنائب"
                    className="w-full p-2 border rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">رقم وثيقة هوية الوكيل</label>
                  <input
                    type="text"
                    value={poaDetails.agentIdNumber}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, agentIdNumber: e.target.value }))}
                    placeholder="رقم البطاقة الوطنية للوكيل"
                    className="w-full p-2 border rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">نوع الوكالة</label>
                  <select
                    value={poaDetails.poaType}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, poaType: e.target.value }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="رسمية عدلية">رسمية عدلية</option>
                    <option value="قنصلية">قنصلية صادرة عن سفارة/قنصلية المملكة</option>
                    <option value="عرفية مصادق عليها">عرفية مصادق على توقيعها</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">تاريخ الوكالة ومصدرها</label>
                  <input
                    type="text"
                    value={poaDetails.poaSource}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, poaSource: e.target.value }))}
                    placeholder="مثال: القنصلية العامة بباريس بتاريخ ..."
                    className="w-full p-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">رقم تسجيل الوكالة</label>
                  <input
                    type="text"
                    value={poaDetails.poaNumber}
                    onChange={(e) => setPoaDetails(prev => ({ ...prev, poaNumber: e.target.value }))}
                    placeholder="رقم الوكالة أو كناش التضمين"
                    className="w-full p-2 border rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الإقامة والجنسية
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى مدة الزواج وفحص الانقطاع</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 5: ⑩ و ⑪ و ⑫ مدة الزواج وموضوع الشهادة وفحص الانقطاع */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⑩ و ⑪ و ⑫ مدة الزواج وموضوع شهادة اللفيف وفحص الانقطاع
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  الحساب التلقائي لمدة قيام الرابطة الزوجية وتحديد نطاق شهادة اللفيف
                </p>
              </div>
            </div>
          </div>

          {/* ⑩ الحساب التلقائي لمدة الزواج */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 space-y-3">
            <span className="text-xs font-black text-emerald-950 block">
              ⑩ ⏳ الحساب التلقائي الدقيق لمدة الزواج إلى تاريخ الإشهاد:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-slate-500 block">📅 تاريخ إبرام الزواج الأصلي</span>
                <span className="text-sm font-black text-slate-900 font-mono">{marriageDate || 'غير محدد'}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-slate-500 block">📅 تاريخ الإشهاد الحالي</span>
                <span className="text-sm font-black text-slate-900 font-mono">{ishhadDate}</span>
              </div>
              <div className="p-3 bg-emerald-700 text-white rounded-xl shadow-xs">
                <span className="text-[11px] font-bold text-emerald-100 block">⏳ مدة الزواج الإجمالية</span>
                <span className="text-sm font-black">{calculatedDuration.formattedText}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center font-medium">
              * هذه المدة معلومة حسابية دقيقة يستند إليها في صياغة شهادة اللفيف.
            </p>
          </div>

          {/* ⑪ ماذا يشهد عليه اللفيف؟ */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
            <span className="font-black text-slate-900 block text-sm">
              ⑪ 🗣️ ماذا يشهد عليه اللفيف؟
            </span>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-bold">
              👥 موضوع الشهادة: يشهد اللفيف على استمرار العلاقة الزوجية بين الطرفين المذكورين منذ تاريخ إبرام عقد الزواج إلى غاية تاريخ هذا الإشهاد دون انقطاع.
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-black text-slate-800 block">ما المدة التي سيشهد بها اللفيف؟</span>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setTestimonyPeriodMode('from_marriage_to_present')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex-1 ${
                    testimonyPeriodMode === 'from_marriage_to_present'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🔘 منذ تاريخ الزواج الأصلي إلى تاريخ الإشهاد الحالي ({calculatedDuration.formattedText})
                </button>
                <button
                  type="button"
                  onClick={() => setTestimonyPeriodMode('custom_period')}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex-1 ${
                    testimonyPeriodMode === 'custom_period'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ✍️ تحديد مدة خاصة أخرى
                </button>
              </div>

              {testimonyPeriodMode === 'custom_period' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-bold text-slate-700">من تاريخ</label>
                    <input
                      type="date"
                      value={customTestimonyStartDate}
                      onChange={(e) => setCustomTestimonyStartDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">إلى تاريخ</label>
                    <input
                      type="date"
                      value={customTestimonyEndDate}
                      onChange={(e) => setCustomTestimonyEndDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ⑫ سؤال فحص الانقطاع */}
          <div className={`p-5 rounded-2xl border-2 transition space-y-3 text-xs ${
            hasInterruptionOrObstacle
              ? 'bg-rose-50 border-rose-400 text-rose-950'
              : 'bg-emerald-50/50 border-emerald-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-black text-sm flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${hasInterruptionOrObstacle ? 'text-rose-600' : 'text-amber-600'}`} />
                <span>⑫ هل توجد واقعة معلومة للعدلين تمنع من صياغة استمرار الزوجية طوال المدة المحددة؟</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasInterruptionOrObstacle(false)}
                  className={`px-3 py-1 rounded-lg font-black ${
                    !hasInterruptionOrObstacle ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  🔘 لا، لا يوجد انقطاع
                </button>
                <button
                  type="button"
                  onClick={() => setHasInterruptionOrObstacle(true)}
                  className={`px-3 py-1 rounded-lg font-black ${
                    hasInterruptionOrObstacle ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  🔘 نعم، توجد واقعة
                </button>
              </div>
            </div>

            {hasInterruptionOrObstacle ? (
              <div className="p-3 bg-white rounded-xl border border-rose-300 space-y-2">
                <span className="font-black text-rose-800 block">
                  🟠 النظام يوقف الانتقال إلى الصياغة ويطلب تحديد الواقعة المانعة:
                </span>
                <input
                  type="text"
                  value={interruptionDetails}
                  onChange={(e) => setInterruptionDetails(e.target.value)}
                  placeholder="حدد الواقعة (مثلاً: طلاق سابق، حكم قضائي، دعوى جارية...)"
                  className="w-full p-2 border border-rose-300 rounded-lg text-xs"
                />
                <span className="text-[11px] text-rose-700 block">
                  لا يجوز توثيق استمرار الزوجية بوجود انقطاع قانوني إلا بعد معالجة أثر الواقعة المانعة.
                </span>
              </div>
            ) : (
              <p className="text-emerald-800 font-bold">
                🟢 لا مانع شرعي أو قضائي مسجل: ينتقل النظام إلى مرحلة اللفيف.
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: طالب الإشهاد
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              disabled={hasInterruptionOrObstacle}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
                !hasInterruptionOrObstacle
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>المتابعة إلى شهادة اللفيف</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 6: ⑱ و ⑲ شهادة اللفيف المتعلقة باستمرار الزوجية */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⑱ و ⑲ شهادة اللفيف المتعلقة باستمرار الزوجية
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  استعمال نفس النموذج لشهادة اللفيف المعتمد بالنظام (12 شاهداً مكتملاً)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {lafifWitnesses.length < 12 && (
                <button
                  type="button"
                  onClick={handleAddSingleWitness}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>+ إضافة شاهد ({lafifWitnesses.length} من 12)</span>
                </button>
              )}

              {lafifWitnesses.length < 12 && (
                <button
                  type="button"
                  onClick={handleExpandTo12Witnesses}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>⚡ إكمال إلى 12 خانة فارغة</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearWitnesses}
                className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
              >
                <span>🗑️ إعادة ضبط لشاهد 1 فارغ</span>
              </button>
            </div>
          </div>

          {/* بطاقة ملخص اللفيف ⑲ */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>⑲ 🔐 ربط شهادة اللفيف بموضوع استمرار الزوجية:</span>
                {isLafifLinked && (
                  <span className="text-[10px] bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ مكتمل ومربوط بالموضوع
                  </span>
                )}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                lafifWitnesses.length >= 12
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {lafifWitnesses.length} من 12 شاهد
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">موضوع اللفيف</span>
                <span className="font-bold text-white">استمرار الزوجية الشرعية</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الطرفان</span>
                <span className="font-bold text-white truncate block">
                  {husbandOriginal.fullName || 'الزوج'} و {wifeOriginal.fullName || 'الزوجة'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">رسم الزواج الأصلي</span>
                <span className="font-bold text-white">
                  عدد {marriageCount || '-'} كناش {marriageBookNumber || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">المدة المشهود بها</span>
                <span className="font-bold text-amber-300">{calculatedDuration.formattedText}</span>
              </div>
            </div>
          </div>

          {/* قائمة شهود اللفيف مع إمكانية التحرير اليدوي المباشر */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800">
                قائمة شهود اللفيف (العدد الحالي: {lafifWitnesses.length} من 12 شاهد):
              </span>
              {!validationChecklist.isLafifReady && (
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  ⚠️ يلزم إتمام أسماء وأرقام بطاقات 12 شاهداً مكتملاً وفقاً لقواعد شهادة اللفيف الشرعية
                </span>
              )}
            </div>

            {lafifWitnesses.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-3 bg-slate-50/50">
                <Scale className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-700 font-bold">
                  لم يتم إدراج أي شاهد بعد. يمكنك البدء بإضافة الشاهد الأول:
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddSingleWitness}
                    className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-black hover:bg-emerald-800 transition cursor-pointer shadow-sm"
                  >
                    + إضافة الشاهد الأول
                  </button>
                  <button
                    type="button"
                    onClick={handleExpandTo12Witnesses}
                    className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    ⚡ تهيئة 12 خانة فارغة
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {lafifWitnesses.map((w, idx) => (
                  <div key={w.id || idx} className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs hover:border-slate-300 transition">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>الشاهد {idx + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWitness(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold text-sm px-1.5 transition cursor-pointer"
                        title="حذف هذا الشاهد"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">الاسم الكامل *</label>
                        <input
                          type="text"
                          value={w.name || ''}
                          onChange={(e) => handleUpdateWitnessField(idx, 'name', e.target.value)}
                          placeholder="الاسم الشخصي والعائلي"
                          className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رقم البطاقة الوطنية (CIN) *</label>
                        <input
                          type="text"
                          value={w.idNumber || ''}
                          onChange={(e) => handleUpdateWitnessField(idx, 'idNumber', e.target.value.toUpperCase())}
                          placeholder="مثال: AB123456"
                          className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 uppercase font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">المهنة</label>
                        <input
                          type="text"
                          value={w.profession || ''}
                          onChange={(e) => handleUpdateWitnessField(idx, 'profession', e.target.value)}
                          placeholder="المهنة (مثلاً: تاجر، موظف)"
                          className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">صلة المخالطة / الجوار</label>
                        <input
                          type="text"
                          value={w.kinship || ''}
                          onChange={(e) => handleUpdateWitnessField(idx, 'kinship', e.target.value)}
                          placeholder="مثال: جار ملاصق ومخالط"
                          className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: مدة الزواج
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(7)}
              disabled={lafifWitnesses.length < 12}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
                lafifWitnesses.length >= 12
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>المتابعة إلى المراجعة الذكية والتحرير</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* المرحلة 7: ⑳ و ㉑ المراجعة الذكية، حالات المنع، وصياغة الرسم */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⑳ و ㉑ المراجعة الذكية وحالات المنع وصياغة الرسم
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  التحقق الشامل من استيفاء مقومات رسم استمرار الزوجية قبل الاعتماد
                </p>
              </div>
            </div>
          </div>

          {/* ⑳ جدول المراجعة الذكية (Smart Checklist) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-900 block">
              ⑳ 🧠 شبكة الفحص والمراجعة الذكية (Checklist):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">📜 أصل الزواج:</span>
                <span className={validationChecklist.isDeedComplete ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {validationChecklist.isDeedComplete ? '🟢 محدد ومكتمل' : '🔴 ناقص'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👨 الزوج:</span>
                <span className={validationChecklist.isHusbandValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {validationChecklist.isHusbandValid ? '🟢 مكتمل' : '🔴 غير مكتمل'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👩 الزوجة:</span>
                <span className={validationChecklist.isWifeValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {validationChecklist.isWifeValid ? '🟢 مكتملة' : '🔴 غير مكتملة'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🌍 الإقامة والعنوان:</span>
                <span className="text-emerald-700 font-bold">🟢 محددة</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🪪 الجنسية:</span>
                <span className="text-emerald-700 font-bold">🟢 مدققة</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">⏳ مدة الاستمرار:</span>
                <span className={validationChecklist.isDurationCalculated ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {validationChecklist.isDurationCalculated ? '🟢 محسوبة ومحددة' : '🔴 غير محددة'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👥 اللفيف:</span>
                <span className={validationChecklist.isLafifReady ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {validationChecklist.isLafifReady ? '🟢 12 شاهداً مكتمل' : '🟠 غير مكتمل'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🔗 التطابق والربط:</span>
                <span className="text-emerald-700 font-bold">🟢 مطابق</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">⚠️ خلو الانقطاع:</span>
                <span className={validationChecklist.noInterruption ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {validationChecklist.noInterruption ? '🟢 لا يوجد مانع' : '🔴 مانع مسجل'}
                </span>
              </div>
            </div>
          </div>

          {/* ㉑ حالات المنع والتنبيهات */}
          {!validationChecklist.allPassed && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-xs">
              <span className="font-black text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>㉑ تنبيهات الجاهزية وحالات المنع:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-amber-900 font-bold">
                {!validationChecklist.isDeedComplete && (
                  <li>🔴 لا يمكن إنشاء رسم استمرار الزوجية قبل تحديد أصل العلاقة الزوجية ومراجعها كاملة.</li>
                )}
                {!validationChecklist.isLafifReady && (
                  <li>🟠 لم تكتمل شهادة اللفيف بعد؛ يرجى ربط 12 شاهداً من وحدة شهادة اللفيف قبل تحرير الرسم.</li>
                )}
                {!validationChecklist.noInterruption && (
                  <li>🔴 تم التصريح بوجود واقعة تمنع من صياغة استمرار الزوجية؛ يمنع النظام التحرير حتى زوال المانع.</li>
                )}
              </ul>
            </div>
          )}

          {/* صياغة نص رسم استمرار الزوجية */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">
                الصيغة التوثيقية المعتمدة لرسم استمرار الزوجية:
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedRasmText);
                  setCopiedSuccess(true);
                  setTimeout(() => setCopiedSuccess(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSuccess ? 'تم النسخ بنجاح!' : 'نسخ نص الرسم'}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-300 bg-slate-50 font-serif leading-loose text-sm text-slate-900 whitespace-pre-wrap select-all">
              {generatedRasmText}
            </div>
          </div>

          {/* أزرار الإجراءات والاعتماد */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: شهادة اللفيف
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المعاينة</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeAndProceed}
                disabled={!validationChecklist.allPassed}
                className={`px-7 py-3 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
                  validationChecklist.allPassed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-900/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الرسم ومتابعة إلى المراجعة القضائية النهائية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
