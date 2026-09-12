import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  RotateCcw,
  Scale,
  Sparkles,
  HeartCrack,
  Coins,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Plus,
  Trash2,
  Calendar,
  Building2,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  BarChart3,
  Check,
  XCircle,
  Paperclip,
  Eye,
  Edit3,
  AlertCircle
} from 'lucide-react';
import type {
  FeesAgentState,
  DivorceClassificationType,
  DivorceStatisticalCode,
  DivorceCountType,
  SmartDivorceClassificationData,
  TamlikBasisDetails,
  KhulDetails,
  ReturnRevocationDetails
} from '../../../../types/feesAgentTypes';
import { NationalDivorceStatsModal } from './NationalDivorceStatsModal';

interface SmartDivorceClassificationGateProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const SmartDivorceClassificationGate: React.FC<SmartDivorceClassificationGateProps> = ({
  state,
  setState,
  onConfirm,
  onCancel
}) => {
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Existing classification data or defaults
  const initialData = state.divorceClassification;

  const [selectedType, setSelectedType] = useState<DivorceClassificationType>(
    initialData?.primaryType || 'consensual'
  );

  const [divorceCount, setDivorceCount] = useState<DivorceCountType>(
    initialData?.divorceCount || 'first'
  );

  const [wifePresence, setWifePresence] = useState<'present' | 'absent'>(
    initialData?.wifePresence || 'present'
  );

  // Spouses names
  const [husbandName, setHusbandName] = useState<string>(
    state.sellers?.[0]?.name || state.divorceCertification?.husband?.name || 'عبد الله بن محمد المنصوري'
  );
  const [wifeName, setWifeName] = useState<string>(
    state.buyers?.[0]?.name || state.divorceCertification?.wife?.name || 'فاطمة بنت الحسن المرابط'
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    state.buyers?.[0]?.fatherName || 'الحسن المرابط'
  );
  const [wifeCin, setWifeCin] = useState<string>(
    state.buyers?.[0]?.idNumber || state.divorceCertification?.wife?.idNumber || 'KB894512'
  );
  const [husbandCin, setHusbandCin] = useState<string>(
    state.sellers?.[0]?.idNumber || state.divorceCertification?.husband?.idNumber || 'K741258'
  );

  // 👩 Tamlik State
  const [tamlikSource, setTamlikSource] = useState<'marriage_deed' | 'voluntary_deed' | 'family_booklet' | 'other_document'>(
    initialData?.tamlikBasis?.sourceType || 'marriage_deed'
  );
  const [tamlikDeedNum, setTamlikDeedNum] = useState<string>(
    initialData?.tamlikBasis?.deedNumber || '4587'
  );
  const [tamlikLetter, setTamlikLetter] = useState<string>(
    initialData?.tamlikBasis?.letter || 'أ'
  );
  const [tamlikPage, setTamlikPage] = useState<string>(
    initialData?.tamlikBasis?.page || '12'
  );
  const [tamlikCount, setTamlikCount] = useState<string>(
    initialData?.tamlikBasis?.count || '89'
  );
  const [tamlikDate, setTamlikDate] = useState<string>(
    initialData?.tamlikBasis?.deedDate || '2021-04-15'
  );
  const [tamlikCourt, setTamlikCourt] = useState<string>(
    initialData?.tamlikBasis?.courtName || state.meta?.court || 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة'
  );
  const [tamlikSearchStatus, setTamlikSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [isTamlikLinked, setIsTamlikLinked] = useState<boolean>(
    initialData?.tamlikBasis?.isLinked ?? false
  );

  // 💰 Khul State
  const [khulAmount, setKhulAmount] = useState<number>(
    initialData?.khulDetails?.compensationAmount || 15000
  );
  const [khulAmountInWords, setKhulAmountInWords] = useState<string>(
    initialData?.khulDetails?.compensationInWords || 'خمسة عشر ألف درهم مغربي'
  );
  const [khulNature, setKhulNature] = useState<string>(
    initialData?.khulDetails?.compensationNature || 'مبلغ مالي مقبوض نقداً بمجلس العقد'
  );
  const [khulWaiver, setKhulWaiver] = useState<string>(
    initialData?.khulDetails?.waiverDetails || 'إبراء وإسقاط حقها في نفقة العدة ومؤخر الصداق'
  );

  // 🔁 Return & Revocation State
  const [returnScenario, setReturnScenario] = useState<'husband_return' | 'khul_reconciliation'>(
    initialData?.returnRevocation?.scenario || 'husband_return'
  );
  const [prevDeedNumber, setPrevDeedNumber] = useState<string>(
    initialData?.returnRevocation?.previousDeedNumber || '1420/2026'
  );
  const [prevDivorceTypeDetected, setPrevDivorceTypeDetected] = useState<DivorceClassificationType>(
    initialData?.returnRevocation?.previousDivorceType || 'revocable'
  );
  const [isPrevDeedLinked, setIsPrevDeedLinked] = useState<boolean>(
    initialData?.returnRevocation?.isLinked ?? false
  );
  const [prevSearchTriggered, setPrevSearchTriggered] = useState<boolean>(false);

  // 🤝 Consensual Agreement State
  const [agreementTerms, setAgreementTerms] = useState<string[]>(
    initialData?.consensualAgreement?.terms || [
      'التراضي التام على إيقاع الطلاق دون قيد أو شرط',
      'تحديد نفقة الأبناء في مبلغ 1,500 درهم شهرياً',
      'سكن الحضانة في الشقة الكائنة بمدينة طنجة'
    ]
  );
  const [courtPermissionNum, setCourtPermissionNum] = useState<string>(
    initialData?.consensualAgreement?.courtPermissionNumber || '342/2026'
  );
  const [courtPermissionDate, setCourtPermissionDate] = useState<string>(
    initialData?.consensualAgreement?.courtPermissionDate || '2026-05-10'
  );

  // ⚖️ Discord (Shiqaq) State
  const [judgmentNumber, setJudgmentNumber] = useState<string>(
    initialData?.discordDetails?.judgmentNumber || '892/2026'
  );
  const [judgmentDate, setJudgmentDate] = useState<string>(
    initialData?.discordDetails?.judgmentDate || '2026-06-12'
  );
  const [isLinkedToCourtFile, setIsLinkedToCourtFile] = useState<boolean>(
    initialData?.discordDetails?.isLinkedToCourtFile ?? true
  );

  // Custom text override mode
  const [isCustomFormula, setIsCustomFormula] = useState<boolean>(
    initialData?.isFormulaOverridden ?? false
  );
  const [customFormula, setCustomFormula] = useState<string>(
    initialData?.customFormulaText || ''
  );

  // Audit trail list
  const [auditLog, setAuditLog] = useState<{ time: string; action: string; details?: string }[]>(
    initialData?.auditTrail || [
      { time: '18:22', action: 'إنشاء مسار رسم طلاق', details: 'فتح بوابة التحقق والتصنيف' }
    ]
  );

  const addAuditEntry = (action: string, details?: string) => {
    const time = new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
    setAuditLog((prev) => [...prev, { time, action, details }]);
  };

  // Primary types cards (Divorces)
  const divorceCards = [
    {
      id: 'consensual' as DivorceClassificationType,
      code: 'D-01' as DivorceStatisticalCode,
      title: 'الطلاق الاتفاقي',
      badge: 'مسار خاص',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Users,
      iconColor: 'text-blue-600',
      activeBorder: 'border-blue-500 ring-4 ring-blue-100 bg-blue-50/40',
      desc: 'طلاق يتم وفق اتفاق الزوجين بإذن من المحكمة (المادة 114 من مدونة الأسرة).',
      legalBasis: 'المادة 114 من مدونة الأسرة'
    },
    {
      id: 'discord' as DivorceClassificationType,
      code: 'D-02' as DivorceStatisticalCode,
      title: 'الطلاق للشقاق',
      badge: 'مسار قضائي خاص',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: Scale,
      iconColor: 'text-indigo-600',
      activeBorder: 'border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50/40',
      desc: 'تطليق صادر في إطار مسطرة الشقاق بحكم قضائي (المواد 94 إلى 97).',
      legalBasis: 'المواد 94-97 من مدونة الأسرة'
    },
    {
      id: 'revocable' as DivorceClassificationType,
      code: 'D-03' as DivorceStatisticalCode,
      title: 'الطلاق الرجعي',
      badge: 'يتطلب تحديد الطلقة',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: RotateCcw,
      iconColor: 'text-purple-600',
      activeBorder: 'border-purple-500 ring-4 ring-purple-100 bg-purple-50/40',
      desc: 'طلاق يوقعه الزوج مع بقاء حقه في الإرجاع داخل العدة (المادة 123).',
      legalBasis: 'المواد 121-123 من مدونة الأسرة'
    },
    {
      id: 'khul' as DivorceClassificationType,
      code: 'D-04' as DivorceStatisticalCode,
      title: 'الطلاق الخلعي',
      badge: 'يتطلب بيانات الخلع',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: Coins,
      iconColor: 'text-amber-700',
      activeBorder: 'border-amber-500 ring-4 ring-amber-100 bg-amber-50/40',
      desc: 'طلاق باتفاق الزوجين على بدل تقدمه الزوجة (المواد 115 إلى 120).',
      legalBasis: 'المواد 115-120 من مدونة الأسرة'
    },
    {
      id: 'tamlik' as DivorceClassificationType,
      code: 'D-05' as DivorceStatisticalCode,
      title: 'الطلاق المملك',
      badge: 'سند التمليك ومراجع العقد',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: HeartCrack,
      iconColor: 'text-rose-600',
      activeBorder: 'border-rose-500 ring-4 ring-rose-100 bg-rose-50/40',
      desc: 'إشهاد الزوجة على طلاق نفسها بناءً على ما مُلّكت به من زوجها بسند معتمد.',
      legalBasis: 'المادة 89 من مدونة الأسرة'
    }
  ];

  // Distinct card for Return & Revocation (D-06)
  const returnCard = {
    id: 'revocation_return' as DivorceClassificationType,
    code: 'D-06' as DivorceStatisticalCode,
    title: 'رسم الرجعة أو المراجعة',
    badge: 'حدث لاحق مرتبط برسم سابق',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: GitBranch,
    iconColor: 'text-emerald-600',
    activeBorder: 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/40',
    desc: 'إشهاد يتعلق برجوع الزوج إلى زوجته أثناء العدة أو بمراجعة المتفارقين بعد طلاق خلعي.',
    legalBasis: 'المواد 124-126 من مدونة الأسرة'
  };

  const currentStatisticalCode = useMemo<DivorceStatisticalCode>(() => {
    if (selectedType === 'consensual') return 'D-01';
    if (selectedType === 'discord') return 'D-02';
    if (selectedType === 'revocable') return 'D-03';
    if (selectedType === 'khul') return 'D-04';
    if (selectedType === 'tamlik') return 'D-05';
    return 'D-06';
  }, [selectedType]);

  // Search Tamlik Deed Simulation
  const handleSearchTamlikDeed = () => {
    setTamlikSearchStatus('searching');
    setTimeout(() => {
      setTamlikSearchStatus('found');
      setIsTamlikLinked(true);
      addAuditEntry('التحقق من سند التمليك', `تم العثور على السند عدد ${tamlikDeedNum} وربطه تلقائياً`);
    }, 1000);
  };

  // Search Previous Divorce Deed for Return/Reconciliation
  const handleSearchPreviousDivorce = () => {
    setPrevSearchTriggered(true);
    if (returnScenario === 'khul_reconciliation') {
      // Simulate checking if the previous deed matches khul
      setPrevDivorceTypeDetected('khul');
      setIsPrevDeedLinked(true);
      addAuditEntry('ربط رسم الطلاق الخلعي السابق', `تم مطابقة وربط الرسم عدد ${prevDeedNumber}`);
    } else {
      setPrevDivorceTypeDetected('revocable');
      setIsPrevDeedLinked(true);
      addAuditEntry('ربط رسم الطلاق الرجعي السابق', `تم مطابقة وربط رسم الطلاق الرجعي`);
    }
  };

  // Conflict detection for Return/Reconciliation
  const conflictWarning = useMemo(() => {
    if (selectedType !== 'revocation_return') return null;

    if (!prevSearchTriggered && !isPrevDeedLinked) {
      return {
        severity: 'warning' as const,
        title: 'تنبيه: لم يتم ربط رسم الطلاق السابق بعد',
        message: 'يتطلب إشهاد الرجعة أو المراجعة إحالة صريحة إلى مراجع رسم الطلاق السابق المعتمد.'
      };
    }

    if (returnScenario === 'khul_reconciliation' && prevDivorceTypeDetected === 'discord') {
      return {
        severity: 'error' as const,
        title: 'تعارض في نوع الرسم السابق',
        message: 'نوع الرسم السابق المسجل هو (تطليق للشقاق) بينما تم تحديد الحالة كـ (مراجعة بعد طلاق خلعي). يرجى التحقق من التصنيف ومراجع الرسم السابق.'
      };
    }

    return null;
  }, [selectedType, returnScenario, prevSearchTriggered, isPrevDeedLinked, prevDivorceTypeDetected]);

  // Dynamic Formula Text Generation (مولد الشهادة الذكي)
  const generatedFormula = useMemo(() => {
    const presenceWord = wifePresence === 'present' ? 'حضور الزوجة' : 'غيبة الزوجة وبإشهاد موثق';
    const talaqWord = divorceCount === 'first' ? 'طلقة أولى' : divorceCount === 'second' ? 'طلقة ثانية' : 'طلقة معتمدة';

    if (selectedType === 'tamlik') {
      const sourceName =
        tamlikSource === 'marriage_deed'
          ? 'رسم الزواج'
          : tamlikSource === 'voluntary_deed'
          ? 'رسم التطوع'
          : tamlikSource === 'family_booklet'
          ? 'دفتر الزواج'
          : 'الوثيقة المعتمدة';

      return {
        fixedPrefix: 'الحمد لله وحده، بحضرة العدلين المنتصبين للإشهاد الموقعين أسفله بالمحكمة الابتدائية قسم قضاء الأسرة،',
        dynamicPart: `حضرت الزوجة السيدة ${wifeName} (حاملة ب.ت.و رقم: ${wifeCin}) زوجة السيد ${husbandName} (ب.ت.و رقم: ${husbandCin})، وطلبت الإشهاد عليها بطلاق نفسها أخذًا بشرطها المجعول لها من طرف زوجها المذكور حسب ما هو ثابت بـ ${sourceName} رقم ${tamlikDeedNum}، حرف ${tamlikLetter}، صحيفة ${tamlikPage}، عدد ${tamlikCount}، بتاريخ ${tamlikDate}، توثيق ${tamlikCourt}،`,
        conditionPart: `وذلك في ${wifePresence === 'present' ? 'مجلس العقد وحضورها شخصياً' : 'غيبة زوجها المذكور'}، وقد أشهدت على نفسها بـ ${talaqWord} رجعية، طلقة واحدة تمتلك بها عصمة نفسها طبقًا لأحكام المادة 89 من مدونة الأسرة.`,
        fixedSuffix: 'وبه تم الإشهاد التام طبقا للقانون، وألزمت نفسها بمقتضاه في التاريخ المذكور.'
      };
    }

    if (selectedType === 'khul') {
      return {
        fixedPrefix: 'الحمد لله وحده، حضر بمجلس العقد الزوجان المذكوران أعلاه بكامل أهليتهما القانونية،',
        dynamicPart: `وأشهدت الزوجة السيدة ${wifeName} أنها اختلعت من زوجها السيد ${husbandName} على بدل مالي قدره ${khulAmount.toLocaleString('ar-MA')} درهم (${khulAmountInWords})، مؤدى ${khulNature}،`,
        conditionPart: `وقبل الزوج المذكور هذا الخلع بالبدل المذكور وقبضه، وأوقع عليها بمقتضاه ${talaqWord} بائنة بينونة صغرى، مع ${khulWaiver}،`,
        fixedSuffix: 'وتم الإشهاد على التراضي والخلع طبقاً لمقتضيات المادة 115 وما بعدها من مدونة الأسرة.'
      };
    }

    if (selectedType === 'revocable') {
      return {
        fixedPrefix: 'الحمد لله وحده، حضر السيد الزوج وأشهد على نفسه طواعية واختياراً،',
        dynamicPart: `أنه طلق زوجته ومدخولته السيدة ${wifeName} طلقة رجعية (${talaqWord})،`,
        conditionPart: `وذلك في ${wifePresence === 'present' ? 'حضورها بمجلس العقد' : 'غيبة مطلقته المذكورة مع التزام إخبارها قانونياً'}، مؤكداً قيام الرابطة الزوجية بينهما بمقتضى رسم الزواج المضمن،`,
        fixedSuffix: 'وللزوج حق إرجاع مطلقته المذكورة ما دامت في عدتها الشرعية طبقاً للمادة 123 من مدونة الأسرة.'
      };
    }

    if (selectedType === 'revocation_return') {
      if (returnScenario === 'husband_return') {
        return {
          fixedPrefix: 'الحمد لله وحده، حضر المطلق السيد الزوج بكامل قواه المعتبرة قانوناً وشرعاً،',
          dynamicPart: `وأشهد العدلين الموقعين أسفله أنه ارتجع إلى عصمته وحوزته زوجته السيدة ${wifeName} من طلاقها الرجعي الواقع بمقتضى الرسم عدد ${prevDeedNumber}،`,
          conditionPart: 'وثبت للعدلين استمرار سريان العدة الشرعية وعدم انقضائها، وصرح برغبته في استئناف المعاشرة الزوجية بالمعروف،',
          fixedSuffix: 'وتم توثيق إشهاد الرجعة طبقاً للمادة 124 من مدونة الأسرة وإشعار الزوجة ومحكمة التوثيق.'
        };
      } else {
        return {
          fixedPrefix: 'الحمد لله وحده، حضر المتفارقان بعد انقضاء العصمة بالطلاق الخلعي السابق،',
          dynamicPart: `السيد ${husbandName} والسيدة ${wifeName}، واتفقا على تجديد عقد زواجهما ومراجعتهما بعقد جديد ومهر مستأنف، مستندين لرسم الطلاق الخلعي عدد ${prevDeedNumber}،`,
          conditionPart: 'ورضيت الزوجة بالرجوع إلى عصمة زوجها على سنة الله ورسوله وبصداق جديد متفق عليه بينهما،',
          fixedSuffix: 'وبه تم إشهاد المراجعة بعقد جديد مستوفٍ لكافة أركان الزواج وشروطه الشرعية.'
        };
      }
    }

    if (selectedType === 'consensual') {
      return {
        fixedPrefix: 'الحمد لله وحده، بمقتضى إذن المحكمة الابتدائية بالإشهاد على الطلاق الاتفاقي عدد ' + courtPermissionNum + '،',
        dynamicPart: `حضر الزوجان السيد ${husbandName} والسيدة ${wifeName} وأشهدا على أنفسهما باتفاقهما النهائي والرضائي على إيقاع الطلاق بينهما،`,
        conditionPart: `مع التزامهما التام بكافة بنود الاتفاق المبرم بينهما والمصادق عليه قضائياً (${agreementTerms.join(' • ')})،`,
        fixedSuffix: 'وبه تم توثيق رسم الطلاق الاتفاقي البائن طبقاً للمادة 114 من مدونة الأسرة.'
      };
    }

    // discord
    return {
      fixedPrefix: 'الحمد لله وحده، تنفيذاً لحكم المحكمة الابتدائية قسم قضاء الأسرة القاضي بالتطليق للشقاق،',
      dynamicPart: `في الملف عدد ${judgmentNumber} الصادر بتاريخ ${judgmentDate}، القاضي بتطليق السيدة ${wifeName} من زوجها السيد ${husbandName}،`,
      conditionPart: `تم إدراج منطوق الحكم المستوفي لكافة المستحقات المالية وحقوق الحضانة والنفقة،`,
      fixedSuffix: 'وبه تم توثيق الإشهاد على التطليق للشقاق طبقاً لأحكام المواد 94 إلى 97 من مدونة الأسرة.'
    };
  }, [
    selectedType,
    wifePresence,
    divorceCount,
    wifeName,
    wifeCin,
    husbandName,
    husbandCin,
    tamlikSource,
    tamlikDeedNum,
    tamlikLetter,
    tamlikPage,
    tamlikCount,
    tamlikDate,
    tamlikCourt,
    khulAmount,
    khulAmountInWords,
    khulNature,
    khulWaiver,
    returnScenario,
    prevDeedNumber,
    courtPermissionNum,
    agreementTerms,
    judgmentNumber,
    judgmentDate
  ]);

  // Overall readiness
  const isReady = useMemo(() => {
    if (selectedType === 'tamlik') {
      return tamlikDeedNum.trim().length > 0 && isTamlikLinked;
    }
    if (selectedType === 'khul') {
      return khulAmount > 0 && husbandName.trim().length > 0 && wifeName.trim().length > 0;
    }
    if (selectedType === 'revocation_return') {
      return prevDeedNumber.trim().length > 0 && isPrevDeedLinked && !conflictWarning?.title.includes('تعارض');
    }
    if (selectedType === 'consensual') {
      return courtPermissionNum.trim().length > 0;
    }
    if (selectedType === 'discord') {
      return judgmentNumber.trim().length > 0;
    }
    return true;
  }, [
    selectedType,
    tamlikDeedNum,
    isTamlikLinked,
    khulAmount,
    husbandName,
    wifeName,
    prevDeedNumber,
    isPrevDeedLinked,
    conflictWarning,
    courtPermissionNum,
    judgmentNumber
  ]);

  // Confirm and proceed
  const handleProceed = () => {
    const payload: SmartDivorceClassificationData = {
      primaryType: selectedType,
      statisticalCode: currentStatisticalCode,
      divorceCount,
      wifePresence,
      tamlikBasis:
        selectedType === 'tamlik'
          ? {
              sourceType: tamlikSource,
              deedNumber: tamlikDeedNum,
              letter: tamlikLetter,
              page: tamlikPage,
              count: tamlikCount,
              deedDate: tamlikDate,
              courtName: tamlikCourt,
              isLinked: isTamlikLinked
            }
          : undefined,
      khulDetails:
        selectedType === 'khul'
          ? {
              compensationAmount: khulAmount,
              compensationInWords: khulAmountInWords,
              compensationNature: khulNature,
              waiverDetails: khulWaiver,
              presenceStatus: 'both_present'
            }
          : undefined,
      returnRevocation:
        selectedType === 'revocation_return'
          ? {
              scenario: returnScenario,
              husbandName,
              wifeName,
              previousDeedNumber: prevDeedNumber,
              previousDivorceType: prevDivorceTypeDetected,
              isLinked: isPrevDeedLinked,
              iddahStatus: 'valid'
            }
          : undefined,
      consensualAgreement:
        selectedType === 'consensual'
          ? {
              terms: agreementTerms,
              courtPermissionNumber: courtPermissionNum,
              courtPermissionDate: courtPermissionDate
            }
          : undefined,
      discordDetails:
        selectedType === 'discord'
          ? {
              judgmentNumber,
              judgmentDate,
              isLinkedToCourtFile
            }
          : undefined,
      generatedFormulaText: `${generatedFormula.fixedPrefix} ${generatedFormula.dynamicPart} ${generatedFormula.conditionPart} ${generatedFormula.fixedSuffix}`,
      customFormulaText: isCustomFormula ? customFormula : undefined,
      isFormulaOverridden: isCustomFormula,
      readinessStatus: {
        isTypeSelected: true,
        isSpousesDefined: true,
        isSpecialPathComplete: true,
        isPreviousDeedVerified: isTamlikLinked || isPrevDeedLinked,
        isFormulaGenerated: true,
        isReadyToCertify: true
      },
      auditTrail: auditLog,
      confirmedAt: new Date().toISOString()
    };

    // Also sync spouses into FeesAgentState sellers/buyers for full platform compatibility
    setState((prev) => ({
      ...prev,
      divorceClassification: payload,
      sellers: [
        {
          ...(prev.sellers?.[0] || {}),
          name: husbandName,
          idNumber: husbandCin,
          address: prev.sellers?.[0]?.address || 'طنجة'
        } as any
      ],
      buyers: [
        {
          ...(prev.buyers?.[0] || {}),
          name: wifeName,
          fatherName: wifeFatherName,
          idNumber: wifeCin,
          address: prev.buyers?.[0]?.address || 'طنجة'
        } as any
      ],
      step: 1
    }));

    onConfirm();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
              <Scale className="w-3.5 h-3.5 text-blue-300" />
              <span>نظام التوثيق العدلي الذكي — قضاء الأسرة والفرقة الزوجية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>⚖️ تحديد نوع الطلاق والتحقق من المسار الإجرائي</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-3xl">
              يرجى تحديد طبيعة الطلاق قبل البدء في تحرير الرسم. سيحدد اختياركم مسار البيانات، وصيغة الشهادة،
              والوثائق والمراجع المطلوبة، كما سيتم اعتماد التصنيف آلياً في الإحصائيات الوطنية (D-01 إلى D-06).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => setShowStatsModal(true)}
              type="button"
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-900/20 flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-amber-100" />
              <span>📊 لوحة الإحصائيات الوطنية للطلاق</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: أنواع الطلاق المنشئة للفرقة (5 Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-sm font-black">
              1
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              أنواع الطلاق (رسوم الطلاق المنشئة للفرقة)
            </h2>
          </div>
          <span className="text-xs text-gray-500">اختر نوع الطلاق لتوليد مساره وصيغته التلقائية</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {divorceCards.map((card) => {
            const Icon = card.icon;
            const isSelected = selectedType === card.id;

            return (
              <div
                key={card.id}
                onClick={() => {
                  setSelectedType(card.id);
                  addAuditEntry(`تغيير نوع الطلاق`, `تم اختيار مسار: ${card.title} (${card.code})`);
                }}
                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all duration-200 relative flex flex-col justify-between hover:shadow-md ${
                  isSelected
                    ? `${card.activeBorder} shadow-sm`
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 left-2.5 bg-blue-600 text-white rounded-full p-1 shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {card.code}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm leading-snug">
                    {card.title}
                  </h3>
                  <span
                    className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>

                  <p className="text-[11px] text-gray-600 leading-relaxed mt-2 mb-2">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                  <span className="font-semibold text-slate-700">{card.legalBasis}</span>
                  <span className="text-blue-600 font-bold">{isSelected ? 'محدد ✓' : 'اختيار'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: قسم مستقل بصرياً لرسم الرجعة أو المراجعة (D-06) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white text-sm font-black">
              2
            </span>
            <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
              <span>قسم مستقل: رسم الرجعة أو المراجعة</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                كود: D-06 (سجل مستقل عن رسوم الطلاق)
              </span>
            </h2>
          </div>
          <span className="text-xs text-gray-500">حدث لاحق يتطلب الربط الإلزامي برسم الطلاق السابق</span>
        </div>

        <div
          onClick={() => {
            setSelectedType(returnCard.id);
            addAuditEntry(`تغيير المسار`, `تم اختيار قسم: ${returnCard.title} (${returnCard.code})`);
          }}
          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            selectedType === 'revocation_return'
              ? 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/50 shadow-md'
              : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <GitBranch className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">
                  {returnCard.title}
                </h3>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  {returnCard.code}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-white border-emerald-300 text-emerald-800">
                  {returnCard.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                {returnCard.desc} (يشمل رجعة الزوج في طلاقه الرجعي القائم، أو مراجعة المتفارقين بعد طلاق خلعي سابق بعقد ومهر جديدين).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-700">{returnCard.legalBasis}</span>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'revocation_return'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}>
              {selectedType === 'revocation_return' ? 'القسم مفعل نشط ✓' : 'اختيار قسم الرجعة/المراجعة'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: شجرة وسلسلة الأسرة الزمنية (Family Timeline Tree) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 px-5">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧬</span>
            <h4 className="font-bold text-xs sm:text-sm text-gray-900">
              سلسلة العلاقة الزوجية والفرقة الزمنية (Family Relationship Timeline)
            </h4>
          </div>
          <span className="text-[11px] text-gray-500">تسلسل الرسوم والارتباط بالملف الأسري الموحد</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="p-2 px-3 rounded-xl bg-slate-100 border border-slate-300 font-semibold text-slate-800 flex items-center gap-1.5">
            <span>💍 رسم الزواج الأصلي</span>
            <span className="text-[10px] text-gray-500">(الأساس التعاقدي)</span>
          </div>

          <span className="text-gray-400 font-bold">←</span>

          <div className={`p-2 px-3 rounded-xl border font-bold flex items-center gap-1.5 ${
            selectedType === 'revocation_return'
              ? 'bg-gray-100 text-gray-600 border-gray-300'
              : 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-100'
          }`}>
            <span>💔 إيقاع الطلاق ({currentStatisticalCode})</span>
            {selectedType !== 'revocation_return' && <span className="text-[10px] text-blue-700">(الرسم الحالي)</span>}
          </div>

          <span className="text-gray-400 font-bold">←</span>

          <div className={`p-2 px-3 rounded-xl border font-bold flex items-center gap-1.5 ${
            selectedType === 'revocation_return'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-100'
              : 'bg-gray-50 text-gray-500 border-dashed border-gray-300'
          }`}>
            <span>🔁 إشهاد الرجعة / المراجعة (D-06)</span>
            {selectedType === 'revocation_return' && <span className="text-[10px] text-emerald-700">(الرسم الحالي)</span>}
          </div>
        </div>
      </div>

      {/* SECTION 4: نموذج المسار التخصصي المحدد (Dedicated Interactive Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>بيانات مسار:</span>
                    <span className="text-blue-700">
                      {selectedType === 'revocation_return' ? returnCard.title : divorceCards.find(c => c.id === selectedType)?.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-gray-100 text-gray-700 border">
                      {currentStatisticalCode}
                    </span>
                  </h3>
                  <span className="text-xs text-gray-500">أدخل البيانات الأساسية لبناء صيغة الشهادة تلقائياً</span>
                </div>
              </div>
            </div>

            {/* General Spouses Section (Quick inputs for dynamic formula) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-800 block">بيانات طرفي العلاقة الزوجية:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">الاسم الكامل للزوج</label>
                  <input
                    type="text"
                    value={husbandName}
                    onChange={(e) => setHusbandName(e.target.value)}
                    placeholder="الزوج"
                    className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">رقم بطاقة تعريف الزوج</label>
                  <input
                    type="text"
                    value={husbandCin}
                    onChange={(e) => setHusbandCin(e.target.value)}
                    placeholder="ب.ت.و"
                    className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">الاسم الكامل للزوجة</label>
                  <input
                    type="text"
                    value={wifeName}
                    onChange={(e) => setWifeName(e.target.value)}
                    placeholder="الزوجة"
                    className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">رقم بطاقة تعريف الزوجة</label>
                  <input
                    type="text"
                    value={wifeCin}
                    onChange={(e) => setWifeCin(e.target.value)}
                    placeholder="ب.ت.و"
                    className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 👩 PATHWAY 1: TAMLIK (مسار الطلاق المملك - تفصيلي بـ 3 خطوات) */}
            {selectedType === 'tamlik' && (
              <div className="space-y-5 border-t pt-4">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <HeartCrack className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">مسار الطلاق المملَّك (المادة 89 من مدونة الأسرة):</span>
                    <p className="mt-0.5 text-rose-800">
                      «إذا ملّك الزوج زوجته حق إيقاع الطلاق، كان لها أن تستعمل هذا الحق طبقاً للشروط المتفق عليها...».
                    </p>
                  </div>
                </div>

                {/* Step 1: هوية الزوجة المملّكة وحضورها */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>صفة طالبة الإشهاد وحالة حضورها بمجلس العقد:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWifePresence('present')}
                      className={`p-3 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                        wifePresence === 'present'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>حضور الزوجة شخصياً بمجلس العقد</span>
                      {wifePresence === 'present' && <Check className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWifePresence('absent')}
                      className={`p-3 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                        wifePresence === 'absent'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span>في غيبة الزوج أو بتوكيل خاص</span>
                      {wifePresence === 'absent' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Step 2: أساس وسند التمليك ومراجعه */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>أساس وسند تمليك الزوجة (أين ورد شرط التمليك؟):</span>
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'marriage_deed', label: 'رسم الزواج الأصلي' },
                      { id: 'voluntary_deed', label: 'رسم تطوع مستقل' },
                      { id: 'family_booklet', label: 'دفتر الزواج' },
                      { id: 'other_document', label: 'وثيقة أخرى معتمدة' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTamlikSource(opt.id as any)}
                        className={`p-2 rounded-lg border text-[11px] font-bold transition-all text-center ${
                          tamlikSource === opt.id
                            ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Deed References Fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">الرقم *</label>
                      <input
                        type="text"
                        value={tamlikDeedNum}
                        onChange={(e) => setTamlikDeedNum(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">الحرف</label>
                      <input
                        type="text"
                        value={tamlikLetter}
                        onChange={(e) => setTamlikLetter(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">الصحيفة</label>
                      <input
                        type="text"
                        value={tamlikPage}
                        onChange={(e) => setTamlikPage(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">العدد</label>
                      <input
                        type="text"
                        value={tamlikCount}
                        onChange={(e) => setTamlikCount(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">التاريخ</label>
                      <input
                        type="date"
                        value={tamlikDate}
                        onChange={(e) => setTamlikDate(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">توثيق المحكمة</label>
                      <input
                        type="text"
                        value={tamlikCourt}
                        onChange={(e) => setTamlikCourt(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Search and Auto-link simulation */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                    <button
                      type="button"
                      onClick={handleSearchTamlikDeed}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isTamlikLinked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {tamlikSearchStatus === 'searching' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري البحث في قاعدة بيانات العدول...</span>
                        </>
                      ) : isTamlikLinked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم العثور على السند وربطه بالرسم بنجاح ✓</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>🔍 البحث عن سند التمليك في قاعدة البيانات وربطه</span>
                        </>
                      )}
                    </button>

                    {isTamlikLinked && (
                      <span className="text-xs text-emerald-800 font-semibold">
                        تم سحب بيانات شرط التمليك ودمجها في الشهادة آلياً
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 3: تحديد عدد الطلقة */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>عدد الطلقة في هذا الإشهاد:</span>
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'first', label: '🔘 طلقة أولى' },
                      { id: 'second', label: '🔘 طلقة ثانية' },
                      { id: 'other', label: '🔘 غير ذلك معلل' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDivorceCount(opt.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          divorceCount === opt.id
                            ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 💰 PATHWAY 2: KHUL (مسار الطلاق الخلعي) */}
            {selectedType === 'khul' && (
              <div className="space-y-4 border-t pt-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <Coins className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">أحكام الطلاق الخلعي (المادة 115 من مدونة الأسرة):</span>
                    <p className="mt-0.5 text-amber-800">
                      «الخلع هو طلاق باتفاق الزوجين على إسقاط حق أو أداء عوض مالي تقدمه الزوجة أو غيرها...».
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">مبلغ بدل الخلع (بالدرهم) *</label>
                    <input
                      type="number"
                      value={khulAmount}
                      onChange={(e) => setKhulAmount(Number(e.target.value))}
                      className="w-full p-2.5 text-xs border rounded-lg font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">مبلغ البدل بالحروف *</label>
                    <input
                      type="text"
                      value={khulAmountInWords}
                      onChange={(e) => setKhulAmountInWords(e.target.value)}
                      placeholder="خمسة عشر ألف درهم"
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">طبيعة وكيفية أداء البدل</label>
                    <input
                      type="text"
                      value={khulNature}
                      onChange={(e) => setKhulNature(e.target.value)}
                      placeholder="مقبوض نقداً بمجلس العقد"
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">شروط التنازل والإبراء المرفقة</label>
                    <input
                      type="text"
                      value={khulWaiver}
                      onChange={(e) => setKhulWaiver(e.target.value)}
                      placeholder="إبراء وإسقاط حقها في نفقة العدة والمؤخر"
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 🔄 PATHWAY 3: REVOCABLE (مسار الطلاق الرجعي) */}
            {selectedType === 'revocable' && (
              <div className="space-y-4 border-t pt-4">
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-purple-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">أحكام الطلاق الرجعي (المواد 121-123):</span>
                    <p className="mt-0.5 text-purple-800">
                      كل طلاق أوقعه الزوج فهو رجعي إلا المكمل للثلاث، أو الذي تم قبل البناء، أو بالاتفاق أو الخلع أو المملك.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">عدد الطلقة في هذا الطلاق:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDivorceCount('first')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          divorceCount === 'first'
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        طلقة أولى رجعية
                      </button>
                      <button
                        type="button"
                        onClick={() => setDivorceCount('second')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          divorceCount === 'second'
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        طلقة ثانية رجعية
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">حالة حضور الزوجة بمجلس العقد:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWifePresence('present')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          wifePresence === 'present'
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        حاضرة بالمجلس
                      </button>
                      <button
                        type="button"
                        onClick={() => setWifePresence('absent')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          wifePresence === 'absent'
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        في غيبة المطلقة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🔁 PATHWAY 4: REVOCATION & RECONCILIATION (مسار الرجعة والمراجعة - قسم مستقل) */}
            {selectedType === 'revocation_return' && (
              <div className="space-y-4 border-t pt-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <GitBranch className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">أحكام الرجعة والمراجعة (المادة 124 وما بعدها):</span>
                    <p className="mt-0.5 text-emerald-800">
                      الرجعة تقع أثناء العدة في الطلاق الرجعي بإشهاد الزوج، بينما المراجعة بعد طلاق بائن بينونة صغرى تستوجب عقداً وصداقاً جديدين.
                    </p>
                  </div>
                </div>

                {/* Scenario Choice */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-2">تحديد حالة الإشهاد:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReturnScenario('husband_return');
                        setPrevDivorceTypeDetected('revocable');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-right transition-all ${
                        returnScenario === 'husband_return'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>رجعة الزوج لزوجته (أثناء العدة الشرعية)</span>
                        {returnScenario === 'husband_return' && <Check className="w-4 h-4" />}
                      </div>
                      <span className="block text-[10px] opacity-80 mt-1 font-normal">
                        إشهاد رسمي بإرجاع الزوج لمطلقته رجعياً مع استمرار العدة
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReturnScenario('khul_reconciliation');
                        setPrevDivorceTypeDetected('khul');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-right transition-all ${
                        returnScenario === 'khul_reconciliation'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>مراجعة المتفارقين بعد طلاق خلعي</span>
                        {returnScenario === 'khul_reconciliation' && <Check className="w-4 h-4" />}
                      </div>
                      <span className="block text-[10px] opacity-80 mt-1 font-normal">
                        عقد زواج ومهر جديدان مستندان للرسم الخلعي السابق
                      </span>
                    </button>
                  </div>
                </div>

                {/* Previous Deed Search & Linker */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <span className="text-xs font-bold text-gray-800 block">
                    البحث عن رسم الطلاق السابق وربطه برسم الرجعة الحالي:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        رقم وتاريخ رسم الطلاق السابق *
                      </label>
                      <input
                        type="text"
                        value={prevDeedNumber}
                        onChange={(e) => setPrevDeedNumber(e.target.value)}
                        placeholder="1420 / 2026"
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleSearchPreviousDivorce}
                        className={`w-full p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isPrevDeedLinked
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-white hover:bg-slate-900'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isPrevDeedLinked ? 'تم التحقق من الرسم السابق وربطه ✓' : '🔍 مطابقة وربط الرسم السابق'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Conflict Alert Box */}
                  {conflictWarning && (
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      conflictWarning.severity === 'error'
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        conflictWarning.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                      }`} />
                      <div>
                        <span className="font-bold">{conflictWarning.title}</span>
                        <p className="mt-0.5 leading-relaxed">{conflictWarning.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🤝 PATHWAY 5: CONSENSUAL (مسار الطلاق الاتفاقي) */}
            {selectedType === 'consensual' && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم إذن المحكمة بالإشهاد *</label>
                    <input
                      type="text"
                      value={courtPermissionNum}
                      onChange={(e) => setCourtPermissionNum(e.target.value)}
                      placeholder="342/2026"
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ إذن المحكمة *</label>
                    <input
                      type="date"
                      value={courtPermissionDate}
                      onChange={(e) => setCourtPermissionDate(e.target.value)}
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ⚖️ PATHWAY 6: DISCORD (مسار الشقاق) */}
            {selectedType === 'discord' && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم حكم التطليق للشقاق *</label>
                    <input
                      type="text"
                      value={judgmentNumber}
                      onChange={(e) => setJudgmentNumber(e.target.value)}
                      placeholder="892/2026"
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ صدور الحكم *</label>
                    <input
                      type="date"
                      value={judgmentDate}
                      onChange={(e) => setJudgmentDate(e.target.value)}
                      className="w-full p-2.5 text-xs border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✨ COLUMN 2: مُنشئ الشهادة الذكي والمعاينة الحية (Smart Certificate Generator) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    ✨ مُنشئ الشهادة الذكي (معاينة حية فورية)
                  </h4>
                  <span className="text-[10px] text-gray-500">
                    البيانات ← القواعد ← النموذج القانوني المعياري
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomFormula(!isCustomFormula)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isCustomFormula ? 'العودة للتوليد الآلي' : 'تعديل يدوي للصيغة'}</span>
              </button>
            </div>

            {/* Color Coding Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1 text-emerald-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>نص آلي ثابت</span>
              </span>
              <span className="flex items-center gap-1 text-blue-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>بيانات مستخرجة</span>
              </span>
              <span className="flex items-center gap-1 text-amber-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>شروط وأحكام</span>
              </span>
              <span className="flex items-center gap-1 text-purple-800 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>ديباجة ختامية</span>
              </span>
            </div>

            {/* Formula Body Preview */}
            <div className="bg-amber-50/20 border border-amber-200/70 rounded-xl p-4 text-xs leading-relaxed text-gray-800 space-y-2 shadow-inner font-serif">
              {isCustomFormula ? (
                <textarea
                  value={customFormula || `${generatedFormula.fixedPrefix} ${generatedFormula.dynamicPart} ${generatedFormula.conditionPart} ${generatedFormula.fixedSuffix}`}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  rows={8}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs leading-relaxed font-sans"
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-emerald-900 font-semibold border-r-2 border-emerald-500 pr-2">
                    {generatedFormula.fixedPrefix}
                  </p>
                  <p className="text-blue-900 bg-blue-50/60 p-2 rounded-lg border-r-2 border-blue-500 pr-2 font-medium">
                    {generatedFormula.dynamicPart}
                  </p>
                  <p className="text-amber-950 bg-amber-50/60 p-2 rounded-lg border-r-2 border-amber-500 pr-2">
                    {generatedFormula.conditionPart}
                  </p>
                  <p className="text-purple-900 border-r-2 border-purple-500 pr-2 font-semibold">
                    {generatedFormula.fixedSuffix}
                  </p>
                </div>
              )}
            </div>

            {/* Audit Trail Timeline */}
            <div className="border-t pt-3 space-y-2">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>سجل أثر المعاملة والتحقق (Audit Trail):</span>
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {auditLog.map((log, idx) => (
                  <div key={idx} className="text-[10px] text-gray-600 flex items-center justify-between bg-gray-50 p-1.5 rounded">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-400 font-bold">{log.time}</span>
                      <span className="font-bold text-gray-800">{log.action}</span>
                      {log.details && <span className="text-gray-500 text-[9px]">- {log.details}</span>}
                    </div>
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Bottom Checklist & Confirmation Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400 font-black text-xl">
            {selectedType === 'revocation_return' ? '🔁' : '💔'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">المسار المعتمد:</span>
              <span className="text-sm font-bold text-white">
                {selectedType === 'revocation_return' ? returnCard.title : divorceCards.find(c => c.id === selectedType)?.title}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {currentStatisticalCode}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                {isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {isReady ? 'الجاهزية التوثيقية: مكتملة للتحرير والاعتماد' : 'الجاهزية: يرجى استكمال الربط ومراجع السند'}
                </span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">
                صيغة الشهادة: {isCustomFormula ? 'معدلة يدوياً' : 'متولدة آلياً ✓'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          )}

          <button
            type="button"
            onClick={handleProceed}
            disabled={!isReady}
            className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all ${
              isReady
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white hover:scale-105 active:scale-95 shadow-emerald-900/30'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
            }`}
          >
            <span>تأكيد المسار وبدء إدخال بيانات الرسم</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* National Divorce Stats Modal */}
      <NationalDivorceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};
