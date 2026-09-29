import React, { useState, useMemo, useEffect } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  MentalDisabilityDeed,
  Party,
} from '../../../../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  createEmptyParty,
} from '../../../../utils/feesAgentUtils';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import {
  Brain,
  ShieldCheck,
  Users,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  DollarSign,
  Stethoscope,
  Check,
  Copy,
  Printer,
  Ban,
  Link2,
  FileCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export const MentalDisabilityInquestWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext,
  onBack,
}) => {
  // المراحل السبعة للمسار: 1 (المشهود في حقه) إلى 7 (المراجعة والتحرير)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // تاريخ اليوم ومراجع التوثيق
  const todayGregorian = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // --------------------------------------------------------------------------
  // 1. هوية المشهود في حقه (المرحلة 1)
  // --------------------------------------------------------------------------
  const [subject, setSubject] = useState({
    fullName: state.mentalDisabilityDeed?.subject?.fullName || state.sellers?.[0]?.name || '',
    fatherName: state.mentalDisabilityDeed?.subject?.fatherName || state.sellers?.[0]?.fatherName || '',
    motherName: state.mentalDisabilityDeed?.subject?.motherName || state.sellers?.[0]?.motherName || '',
    birthDate: state.mentalDisabilityDeed?.subject?.birthDate || state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.mentalDisabilityDeed?.subject?.birthPlace || state.sellers?.[0]?.placeOfBirth || '',
    cin: state.mentalDisabilityDeed?.subject?.cin || state.sellers?.[0]?.idNumber || '',
    profession: state.mentalDisabilityDeed?.subject?.profession || state.sellers?.[0]?.profession || '',
    address: state.mentalDisabilityDeed?.subject?.address || state.sellers?.[0]?.address || '',
    maritalStatus: (state.mentalDisabilityDeed?.subject?.maritalStatus || 'عازب') as 'عازب' | 'متزوج' | 'مطلق' | 'أرمل' | '',
    isKnownDirectlyByLafif: state.mentalDisabilityDeed?.subject?.isKnownDirectlyByLafif ?? true,
  });

  // --------------------------------------------------------------------------
  // 2. كيفية معرفة اللفيف به وأساس العلم (المرحلة 2)
  // --------------------------------------------------------------------------
  const [knowledgeDuration, setKnowledgeDuration] = useState<
    'منذ_الطفولة' | 'منذ_سنوات_طويلة' | 'منذ_مدة_متوسطة' | 'منذ_مدة_قريبة' | ''
  >(state.mentalDisabilityDeed?.knowledgeBasis?.durationOfKnowledge || 'منذ_سنوات_طويلة');

  const [cohabitationTypes, setCohabitationTypes] = useState<string[]>(
    state.mentalDisabilityDeed?.knowledgeBasis?.cohabitationTypes || [
      'جار له ومخالط',
      'مخالط له باستمرار ومتردد عليه',
      'يعرف أحواله الأسرية وتصرفاته',
    ]
  );

  const [isContinuousCohabitation, setIsContinuousCohabitation] = useState<boolean>(
    state.mentalDisabilityDeed?.knowledgeBasis?.isContinuousCohabitation ?? true
  );

  const [scienceBasis, setScienceBasis] = useState<string[]>(
    state.mentalDisabilityDeed?.lafifScienceBasis || [
      'المخالطة المستمرة والمعاشرة الطويلة',
      'مشاهدة تصرفاته وأفعاله بنفسهم',
      'الاطلاع على أحواله اليومية والأسرية',
      'معاينة عدم إدراكه لما يصدر عنه',
    ]
  );

  // --------------------------------------------------------------------------
  // 3. طبيعة الخلل والوقائع المعاينة ومحور الأموال (المرحلة 3)
  // --------------------------------------------------------------------------
  const [observedManifestations, setObservedManifestations] = useState<string[]>(
    state.mentalDisabilityDeed?.observedDisabilityManifestations || [
      'عدم إدراكه السليم للأمور وعواقب تصرفاته',
      'اضطراب تصرفاته اليومية وعدم اتزانها',
      'عدم سلامة تدبيره لشؤونه الشخصية',
      'حاجته المستمرة إلى من يرعاه ويتولى شؤونه',
    ]
  );

  const [customManifestations, setCustomManifestations] = useState<string>(
    state.mentalDisabilityDeed?.customManifestationsText || ''
  );

  const [hasFinancialImpact, setHasFinancialImpact] = useState<boolean>(
    state.mentalDisabilityDeed?.financialImpact?.hasFinancialImpact ?? true
  );

  const [financialManifestations, setFinancialManifestations] = useState<string[]>(
    state.mentalDisabilityDeed?.financialImpact?.manifestations || [
      'عدم القدرة على التصرف السليم في ممتلكاته وحقوقه المالية',
      'إبرام تصرفات مالية دون إدراك لآثارها أو قيمتها',
      'الحاجة الأكيدة إلى حماية ممتلكاته من الضياع والتفريط',
    ]
  );

  const [customFinancialNotes, setCustomFinancialNotes] = useState<string>(
    state.mentalDisabilityDeed?.financialImpact?.customFinancialNotes || ''
  );

  // --------------------------------------------------------------------------
  // 4. الاستمرارية والشهادة الطبية (المرحلة 4)
  // --------------------------------------------------------------------------
  const [continuityStatus, setContinuityStatus] = useState<
    'مستمرة' | 'متقطعة' | 'غير_محددة' | ''
  >(state.mentalDisabilityDeed?.continuityStatus || 'مستمرة');

  const [observedDurationYears, setObservedDurationYears] = useState<number>(
    state.mentalDisabilityDeed?.witnessDetails?.[0]?.durationObservedYears || 5
  );

  const [observedLucidIntervals, setObservedLucidIntervals] = useState<boolean>(
    state.mentalDisabilityDeed?.observedLucidIntervals ?? false
  );

  const [lucidIntervalsNotes, setLucidIntervalsNotes] = useState<string>(
    state.mentalDisabilityDeed?.lucidIntervalsNotes || ''
  );

  const [hasMedicalCertificate, setHasMedicalCertificate] = useState<boolean>(
    state.mentalDisabilityDeed?.medicalReport?.hasMedicalCertificate ?? false
  );

  const [medicalReport, setMedicalReport] = useState({
    doctorName: state.mentalDisabilityDeed?.medicalReport?.doctorName || '',
    doctorSpecialty: state.mentalDisabilityDeed?.medicalReport?.doctorSpecialty || 'أخصائي في الأمراض العقلية والنفسية',
    reportDate: state.mentalDisabilityDeed?.medicalReport?.reportDate || '',
    reportReference: state.mentalDisabilityDeed?.medicalReport?.reportReference || '',
    summary: state.mentalDisabilityDeed?.medicalReport?.summary || '',
  });

  // --------------------------------------------------------------------------
  // 5. الروابط المستقبلية وما لا يفعله هذا البيت (المرحلة 6)
  // --------------------------------------------------------------------------
  const [futureLinkages, setFutureLinkages] = useState({
    familyCourtCaseNumber: state.mentalDisabilityDeed?.futureLinkages?.familyCourtCaseNumber || '',
    linkedCourtName: state.mentalDisabilityDeed?.futureLinkages?.linkedCourtName || state.meta?.court || 'المحكمة الابتدائية (قسم قضاء الأسرة)',
    hasAttachedMedicalDoc: state.mentalDisabilityDeed?.futureLinkages?.hasAttachedMedicalDoc ?? false,
    futureInterdictionRulingNumber: state.mentalDisabilityDeed?.futureLinkages?.futureInterdictionRulingNumber || '',
  });

  // --------------------------------------------------------------------------
  // 6. المزامنة الآلية مع FeesAgentState (documentType & evidenceSubjectMatter)
  // --------------------------------------------------------------------------
  useEffect(() => {
    setState(prev => {
      const isDocTypeSet = prev.documentType === 'موجب_خلل_عقلي';
      const existing = prev.evidenceSubjectMatter;
      const isSubjectSynced =
        existing &&
        existing.category === 'continuous_enjoyment' &&
        existing.title === 'ثبوت واقعة الخلل العقلي' &&
        existing.depositionDate === todayGregorian;

      if (isDocTypeSet && isSubjectSynced && prev.evidenceMethod === 'lafif') {
        return prev;
      }

      return {
        ...prev,
        documentType: 'موجب_خلل_عقلي',
        evidenceMethod: 'lafif',
        evidenceSubjectMatter: {
          category: 'continuous_enjoyment',
          title: 'ثبوت واقعة الخلل العقلي',
          depositionDate: todayGregorian,
          periodType: 'duration_years',
          claimedDurationYears: observedDurationYears || 5,
          calculatedStartDate: todayGregorian,
          notes: `إثبات واقعة الخلل العقلي المؤثرة في حسن التصرف في حق السيد(ة): ${subject.fullName || 'المشهود في حقه'}`,
        },
      };
    });
  }, [todayGregorian, observedDurationYears, subject.fullName, setState]);

  // --------------------------------------------------------------------------
  // 7. محرك كشف التناقضات والفحص التناسقي (Cross-Witness Inconsistency Engine)
  // --------------------------------------------------------------------------
  const consistencyAnalysis = useMemo(() => {
    const issues: { level: 'error' | 'warning' | 'info'; message: string; tip: string }[] = [];

    // التحقق من المعرفة المباشرة
    if (!subject.isKnownDirectlyByLafif) {
      issues.push({
        level: 'warning',
        message: 'تم التصريح بعدم وجود معرفة مباشرة للمشهود في حقه من قِبل اللفيف.',
        tip: 'القاعدة الفقهية والتوثيقية توجب أن تبنى شهادة اللفيف على المشاهدة والمعاينة والمخالطة الحقيقية لا على مجرد السماع والنقل.',
      });
    }

    // التحقق من نوع المخالطة
    if (cohabitationTypes.length === 0) {
      issues.push({
        level: 'error',
        message: 'لم يتم تحديد طبيعة المخالطة بين أفراد اللفيف والمشهود في حقه.',
        tip: 'اختر وجهاً واحداً على الأقل من أوجه المخالطة (جوار، قرابة، معاشرة يومية).',
      });
    }

    // التحقق من أساس العلم
    if (scienceBasis.length === 0) {
      issues.push({
        level: 'error',
        message: 'أساس علم اللفيف غير محدد.',
        tip: 'يلزم بيان مستند العلم بالشهادة كالمعاينة والمخالطة المستمرة ومشاهدة التصرفات.',
      });
    }

    // التناقض في الاستمرارية مع ثوبان العقل
    if (continuityStatus === 'مستمرة' && observedLucidIntervals) {
      issues.push({
        level: 'warning',
        message: 'تناقض محتمل: تم وسم الحالة بأنها «مستمرة» مع التصريح بمعاينة فترات ثوبان العقل.',
        tip: 'إذا كان الشخص يثوب إليه عقله بين الحين والآخر، يُنصح باختيار حالة «متقطعة» صوناً لأهلية التصرف خلال فترات الإفاقة طبقاً لمدونة الأسرة.',
      });
    }

    // التنبيه الخاص بالحالة المتقطعة
    if (continuityStatus === 'متقطعة' && !lucidIntervalsNotes.trim()) {
      issues.push({
        level: 'info',
        message: 'الحالة متقطعة: يُفضل بيان فترات ثوبان العقل ومظاهرها لدى المعني بالأمر.',
        tip: 'مدونة الأسرة تنص على أن فاقد العقل متقطعاً كامل الأهلية في فترات إفاقته.',
      });
    }

    // نصاب الشهود
    const witnessesCount = (state.witnesses || []).length;
    if (witnessesCount < 12) {
      issues.push({
        level: 'warning',
        message: `نصاب اللفيف غير مكتمل (${witnessesCount} من 12 شاهداً).`,
        tip: 'القانون 51.26 وقواعد الفقه التوثيقي المغربي تتطلب ما لا يقل عن 12 شاهداً في شهادة اللفيف.',
      });
    }

    return issues;
  }, [
    subject.isKnownDirectlyByLafif,
    cohabitationTypes,
    scienceBasis,
    continuityStatus,
    observedLucidIntervals,
    lucidIntervalsNotes,
    state.witnesses,
  ]);

  // --------------------------------------------------------------------------
  // 8. الصياغة الذكية التوثيقية الثلاثية الطبقات (Triple-Layer Deed Drafting)
  // --------------------------------------------------------------------------
  const generatedRasmText = useMemo(() => {
    const sName = subject.fullName || 'المعني بالأمر';
    const sFather = subject.fatherName || '...';
    const sMother = subject.motherName || '...';
    const sCin = subject.cin ? `(الحامل لبطاقة التعريف الوطنية رقم: ${subject.cin})` : '';
    const sAddress = subject.address ? `الساكن بـ ${subject.address}` : 'المقيم بمحل سكناه المعروف';
    const sBirth = subject.birthDate ? `المولود بتاريخ ${subject.birthDate}${subject.birthPlace ? ` بـ ${subject.birthPlace}` : ''}` : '';

    const durationLabel =
      knowledgeDuration === 'منذ_الطفولة'
        ? 'منذ نعومة أظفاره ومرحلة صباه'
        : knowledgeDuration === 'منذ_سنوات_طويلة'
        ? 'منذ سنوات طوال ومخالطة متصلة'
        : knowledgeDuration === 'منذ_مدة_متوسطة'
        ? 'منذ مدة غير يسيرة'
        : 'منذ مدة من الزمن';

    const cohabClause = cohabitationTypes.join(' و');
    const basisClause = scienceBasis.join('، و');
    const manifestationsClause = [
      ...observedManifestations,
      ...(customManifestations.trim() ? [customManifestations.trim()] : [])
    ].join('، و');

    const financialClause = hasFinancialImpact
      ? `كما عاينوا أثر ذلك في شؤونه المالية؛ من ${financialManifestations.join('، و')}${customFinancialNotes.trim() ? `، و(${customFinancialNotes.trim()})` : ''}`
      : 'ولم يثبت لديهم تدبير لأموال تقتضي بياناً خاصاً سوى ما ذكر في حالته العامة';

    const continuityClause =
      continuityStatus === 'مستمرة'
        ? `بأن هذه الحالة مستمرة وملازمة له طوال مدة ${observedDurationYears} سنة خلت إلى تاريخه دون انقطاع`
        : continuityStatus === 'متقطعة'
        ? `بأن هذه الحالة تطرأ عليه وتزول بصورة متقطعة؛ ${lucidIntervalsNotes.trim() ? `بحيث ${lucidIntervalsNotes.trim()}` : 'تتخللها فترات يثوب إليه عقله فيها'}`
        : 'بأن الحالة الموصوفة مشهودة لديهم على الوجه المقيد دون جزم بدوامها أو زوالها';

    const medicalClause = hasMedicalCertificate && medicalReport.doctorName.trim()
      ? `\nوقد عُزز هذا الإشهاد بالشهادة الطبية الصادرة عن الدكتور ${medicalReport.doctorName} (${medicalReport.doctorSpecialty}) بتاريخ ${medicalReport.reportDate || '...'} تحت مرجع ${medicalReport.reportReference || '...'}، المؤكدة لمعاينته الطبية لوضعية المعني بالأمر، وهي وثيقة مستقلة ومرفقة بأصل الرسم للإدلاء بها للمحكمة المختصة.`
      : '';

    const witnessesList = state.witnesses || [];
    const witnessesText = witnessesList.length > 0
      ? witnessesList.map((w, idx) => `${idx + 1}. ${w.name || 'شاهد'} (ب.ت.و: ${w.idNumber || '...'}) - المهنة: ${w.profession || '...'} - السكن: ${w.address || '...'}`).join('\n')
      : 'شهود اللفيف الشرعي (اثنا عشر شاهداً كاملاً وفق الضوابط الشرعية والقانونية)';

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.

بمجلس الإشهاد التوثيقي بمكتب العدلين الموقعين أسفله،
حضـر شهود اللفيف الشرعي وعددهم اثنا عشر (12) شاهداً تامة أسماؤهم وأوصافهم وأرقام هوياتهم أسفله:
${witnessesText}

فأدوا شهادتهم لله تعالى بعد التحلي بما يجب شرعاً وقانوناً، والتأكيد الصريح على أن شهادتهم مبنية على علم يقيني ومعاينة مباشرة ومخالطة تامة لا على نقل أو مجرد سماع؛
فشهدوا جميعاً على معرفتهم التامة بالمشهود في حقه:
السيد: ${sName} بن ${sFather} وأمه ${sMother}، ${sBirth}، ${sCin}، ${sAddress}.

① [طبقة المعرفة والمخالطة والاطلاع]:
بأنهم يعرفونه حق المعرفة ${durationLabel}، ويخالطونه مخالطة ${cohabClause}، ومستند علمهم في ذلك مبني على ${basisClause}.

② [طبقة الوقائع المعاينة والمشهودة]:
وشهدوا بأنهم عاينوا منه وشاهدوا عليه تصرفات وأفعالاً ظاهرة دالة على خلل في إدراكه وعقله؛ تمثلت في ${manifestationsClause}؛
${financialClause}.

③ [طبقة الاستمرارية ونتيجة الشهادة]:
وشهدوا ${continuityClause}؛ وأن حالته على النحو المشهود به تحول دون قدرته على حسن تدبير شؤونه الشخصية والتصرف الرشيد في أمواله، مما يقتضي حمايته صوناً لمصالحه، دون أن يُعد هذا الموجب حكماً قضائياً بالحجر ولا إسناداً لوصاية أو تقديم، وإنما هو شهادة لفيفية محضة على واقعة مادية لإثبات الحالة كما عاينها الشهود، قصد الإدلاء بها لدى الجهات القضائية وقسم قضاء الأسرة المختص عند الاقتضاء.
${medicalClause}

وعليه أدى الشهود المذكورون شهادتهم، وبمقتضاه حُرر هذا الرسم في ${todayGregorian}م موافق ${todayHijri}هـ.`;
  }, [
    subject,
    knowledgeDuration,
    cohabitationTypes,
    scienceBasis,
    observedManifestations,
    customManifestations,
    hasFinancialImpact,
    financialManifestations,
    customFinancialNotes,
    continuityStatus,
    observedDurationYears,
    lucidIntervalsNotes,
    hasMedicalCertificate,
    medicalReport,
    state.witnesses,
    todayGregorian,
    todayHijri,
  ]);

  // --------------------------------------------------------------------------
  // 9. التحقق الشامل (Smart Checklist)
  // --------------------------------------------------------------------------
  const checklist = useMemo(() => {
    const isSubjectValid = Boolean(subject.fullName.trim() && subject.cin.trim());
    const isKnowledgeValid = Boolean(knowledgeDuration && cohabitationTypes.length > 0 && subject.isKnownDirectlyByLafif);
    const isManifestationsValid = Boolean(observedManifestations.length > 0);
    const isContinuityValid = Boolean(continuityStatus);
    const isLafifValid = Boolean((state.witnesses || []).length >= 12 && (state.witnesses || []).every(w => Boolean(w.name?.trim() && w.idNumber?.trim())));
    const isMedicalValid = !hasMedicalCertificate || Boolean(medicalReport.doctorName.trim() && medicalReport.reportDate.trim());
    const allPassed = isSubjectValid && isKnowledgeValid && isManifestationsValid && isContinuityValid && isLafifValid && isMedicalValid;

    return {
      isSubjectValid,
      isKnowledgeValid,
      isManifestationsValid,
      isContinuityValid,
      isLafifValid,
      isMedicalValid,
      allPassed,
    };
  }, [
    subject,
    knowledgeDuration,
    cohabitationTypes,
    observedManifestations,
    continuityStatus,
    state.witnesses,
    hasMedicalCertificate,
    medicalReport,
  ]);

  // --------------------------------------------------------------------------
  // 10. الاعتماد والحفظ والانتقال النهائي
  // --------------------------------------------------------------------------
  const handleFinalizeAndProceed = () => {
    const mentalDisabilityData: MentalDisabilityDeed = {
      subject,
      knowledgeBasis: {
        durationOfKnowledge: knowledgeDuration,
        cohabitationTypes,
        isContinuousCohabitation,
      },
      lafifScienceBasis: scienceBasis,
      observedDisabilityManifestations: observedManifestations,
      customManifestationsText: customManifestations,
      financialImpact: {
        hasFinancialImpact,
        manifestations: financialManifestations,
        customFinancialNotes,
      },
      continuityStatus,
      observedDurationDescription: `${observedDurationYears} سنوات`,
      observedLucidIntervals,
      lucidIntervalsNotes,
      medicalReport: {
        hasMedicalCertificate,
        doctorName: medicalReport.doctorName,
        doctorSpecialty: medicalReport.doctorSpecialty,
        reportDate: medicalReport.reportDate,
        reportReference: medicalReport.reportReference,
        summary: medicalReport.summary,
      },
      futureLinkages,
      witnessDetails: (state.witnesses || []).map((_, idx) => ({
        witnessIndex: idx + 1,
        durationOfKnowledge: knowledgeDuration,
        cohabitationTypes,
        hasContinuousCohabitation: isContinuousCohabitation,
        factsObserved: observedManifestations,
        durationObservedYears: observedDurationYears,
        observedIntermittentLucidIntervals: observedLucidIntervals,
        agreesTestimonyBasedOnDirectObservation: true,
      })),
      deedText: generatedRasmText,
    };

    const subjectParty: Party = {
      ...createEmptyParty(),
      id: 'party-subject-mental-disability',
      name: subject.fullName,
      idNumber: subject.cin,
      nationality: 'مغربي',
      address: subject.address,
      partyRole: 'مشهود في حقه',
    };

    setState(prev => ({
      ...prev,
      documentType: 'موجب_خلل_عقلي',
      mentalDisabilityDeed: mentalDisabilityData,
      sellers: [subjectParty],
      witnesses: prev.witnesses || [],
      draftText: generatedRasmText,
      step: 7, // الانتقال للمراجعة القضائية النهائية والصياغة
    }));

    if (onNext) {
      onNext();
    }
  };

  const stagesList = [
    { id: 1, title: 'المشهود في حقه', icon: Users, desc: 'الهوية والمعرفة المباشرة' },
    { id: 2, title: 'أساس علم اللفيف', icon: Clock, desc: 'المخالطة والاطلاع المستمر' },
    { id: 3, title: 'وقائع الخلل والأموال', icon: Brain, desc: 'المعاينة وأثرها على المال' },
    { id: 4, title: 'الاستمرارية والطبية', icon: Stethoscope, desc: 'التقطع والوثيقة الطبية' },
    { id: 5, title: 'شهود اللفيف (12)', icon: Scale, desc: 'منظومة اللفيف والتحري' },
    { id: 6, title: 'فحص التناسق والروابط', icon: Link2, desc: 'كشف التناقضات والحدود' },
    { id: 7, title: 'المراجعة والتحرير', icon: FileCheck, desc: 'الصياغة والاعتماد النهائي' },
  ];

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6" dir="rtl">
      {/* ========================================================================= */}
      {/* ① بطاقة العملية الثابتة أعلى الشاشة (Fixed Top Status Header) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-center shadow-md">
              <Brain className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  🏠 بيت: موجب خلل عقلي
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <span>طبيعة الشهادة: لفيفية 👥</span>
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  checklist.allPassed
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {checklist.allPassed ? '🟢 مكتمل وجاهز للصياغة' : '🟠 قيد جمع الشهادة'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-amiri">
                شهادة اللفيف لإثبات واقعة الخلل العقلي المؤثرة في حسن التصرف
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: 0.25 }))}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50/60 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="مراجعة شروط التلقي والاختصاص المكاني (المرحلة 0.25)"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>فحص شروط التلقي (0.25)</span>
            </button>
          </div>
        </div>

        {/* بطاقة معلومات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👤 المشهود في حقه</span>
            <span className="font-black text-slate-900 truncate block">
              {subject.fullName || 'قيد التحديد'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">📜 موضوع الشهادة</span>
            <span className="font-bold text-slate-800 truncate block">
              ثبوت حالة خلل عقلي مؤثرة في حسن التصرف
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">⚖️ الغاية القانونية</span>
            <span className="font-bold text-indigo-900 truncate block">
              الإدلاء بالموجب أمام قضاء الأسرة
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👥 نصاب الشهود</span>
            <span className="font-black text-emerald-700">
              {(state.witnesses || []).length} من 12 شاهداً
            </span>
          </div>
        </div>

        {/* شريط خطوات المسار التفاعلي */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {stagesList.map((st) => {
            const Icon = st.icon;
            const isCurrent = activeStage === st.id;
            const isDone = activeStage > st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {st.id}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                </div>
                <div className="font-black text-xs text-slate-900 truncate">{st.title}</div>
                <div className="text-[10px] text-slate-500 truncate">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ② المرحلة 1: هوية المشهود في حقه (Subject Identity) */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ② بطاقة هوية المشهود في حقه ومعرفة اللفيف المباشرة به
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                إدخال البيانات التعريفية الكاملة للشخص موضوع الشهادة اللفيفية
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                value={subject.fullName}
                onChange={(e) => setSubject(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="الاسم العائلي والشخصي"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب *</label>
              <input
                type="text"
                value={subject.fatherName}
                onChange={(e) => setSubject(prev => ({ ...prev, fatherName: e.target.value }))}
                placeholder="اسم الأب الكامل"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم *</label>
              <input
                type="text"
                value={subject.motherName}
                onChange={(e) => setSubject(prev => ({ ...prev, motherName: e.target.value }))}
                placeholder="اسم الأم الكامل"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
              <input
                type="text"
                value={subject.cin}
                onChange={(e) => setSubject(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                placeholder="مثال: AB123456"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
              <input
                type="date"
                value={subject.birthDate}
                onChange={(e) => setSubject(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
              <input
                type="text"
                value={subject.birthPlace}
                onChange={(e) => setSubject(prev => ({ ...prev, birthPlace: e.target.value }))}
                placeholder="مدينة / جماعة الازدياد"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة الحالية / السابقة</label>
              <input
                type="text"
                value={subject.profession}
                onChange={(e) => setSubject(prev => ({ ...prev, profession: e.target.value }))}
                placeholder="مثلاً: بدون عمل / حرفي / موظف سابق"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">الحالة العائلية</label>
              <select
                value={subject.maritalStatus}
                onChange={(e) => setSubject(prev => ({ ...prev, maritalStatus: e.target.value as any }))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 font-bold"
              >
                <option value="عازب">عازب(ة)</option>
                <option value="متزوج">متزوج(ة)</option>
                <option value="مطلق">مطلق(ة)</option>
                <option value="أرمل">أرمل(ة)</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الإقامة الحالي *</label>
              <input
                type="text"
                value={subject.address}
                onChange={(e) => setSubject(prev => ({ ...prev, address: e.target.value }))}
                placeholder="العنوان الكامل لمحل إقامته"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>

          {/* السؤال المحوري: هل يعرفه أفراد اللفيف معرفة مباشرة؟ */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-3">
            <span className="font-black text-indigo-950 block text-xs">
              🧠 سؤال منهجي محوري: هل يعرفه أفراد اللفيف معرفة مباشرة وشخصية؟
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="knownDirectly"
                  checked={subject.isKnownDirectlyByLafif === true}
                  onChange={() => setSubject(prev => ({ ...prev, isKnownDirectlyByLafif: true }))}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>🔘 نعم، يعرفونه معرفة مباشرة وشخصية</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="knownDirectly"
                  checked={subject.isKnownDirectlyByLafif === false}
                  onChange={() => setSubject(prev => ({ ...prev, isKnownDirectlyByLafif: false }))}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>🔘 لا، الشهادة مبنية على السماع والنقل فقط</span>
              </label>
            </div>

            {!subject.isKnownDirectlyByLafif && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-black">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>🟠 تنبيه توثيقي ملزم:</span>
                </div>
                <p className="leading-relaxed">
                  ينبغي أن يكون مضمون الشهادة مبنياً على علم الشاهد ومعرفته بالمعني بالأمر وما عاينه أو علمه على وجه معتبر، لا على مجرد نقل غير متحقق.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                العودة لاختيار الوثيقة
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى أساس علم اللفيف والمخالطة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ③ و ④ المرحلة 2: كيفية معرفة اللفيف به وأساس العلم (Knowledge Basis) */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ③ و ④ كيفية معرفة اللفيف به وأساس العلم والمخالطة والاطلاع
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                بناء أركان علم اللفيف بدقة بدلاً من الاكتفاء بالصيغ الإنشائية العامة
              </p>
            </div>
          </div>

          {/* مدة المعرفة */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ③ مدة معرفة اللفيف بالمعني بالأمر:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'منذ_الطفولة', label: '🔘 منذ الطفولة ومرحلة الصبا' },
                { key: 'منذ_سنوات_طويلة', label: '🔘 منذ سنوات طويلة' },
                { key: 'منذ_مدة_متوسطة', label: '🔘 منذ مدة متوسطة' },
                { key: 'منذ_مدة_قريبة', label: '🔘 منذ مدة قريبة' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setKnowledgeDuration(item.key as any)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition text-right cursor-pointer ${
                    knowledgeDuration === item.key
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-black ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* طبيعة المخالطة */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              طبيعة المخالطة ومجالات المعرفة (اختر كل ما ينطبق):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                'جار له ومجاور لمسكنه',
                'قريب له من ذوي أرحامه',
                'صديق ومن أهل معارفه',
                'زميل ومخالط في الوسط',
                'مخالط له باستمرار',
                'يتردد عليه بصورة منتظمة',
                'يعرف أحواله الأسرية',
                'يعرف أحواله المالية',
                'يعرف حالته الصحية والعقلية',
                'مطلع على تصرفاته اليومية',
              ].map((opt) => {
                const checked = cohabitationTypes.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setCohabitationTypes(prev =>
                        checked ? prev.filter(x => x !== opt) : [...prev, opt]
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-right flex items-center justify-between cursor-pointer ${
                      checked
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-black'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                      checked ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                    }`}>
                      {checked && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* استمرار المخالطة */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-black text-slate-900 block">
              هل كانت المخالطة والاطلاع مستمرين بما يسمح للشاهد بمعرفة حقيقة حاله؟
            </span>
            <div className="flex items-center gap-4 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isContinuousCohabitation === true}
                  onChange={() => setIsContinuousCohabitation(true)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>نعم، مخالطة واطلاع مستمران ومباشران</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isContinuousCohabitation === false}
                  onChange={() => setIsContinuousCohabitation(false)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span>لا، مخالطة متقطعة أو متباعدة</span>
              </label>
            </div>
          </div>

          {/* ④ أساس علم اللفيف */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ④ أساس علم اللفيف (المحددات التوثيقية لمعاينة الواقعة):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {[
                'المخالطة المستمرة والمعاشرة الطويلة',
                'مشاهدة تصرفاته وأفعاله بنفسهم',
                'الاطلاع على أحواله اليومية والأسرية',
                'الاطلاع على تصرفاته وتعاملاته مع الغير',
                'الاطلاع على أحواله المالية وتدبيره للأمور',
                'معاينة عدم إدراكه لما يصدر عنه',
              ].map((b) => {
                const active = scienceBasis.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setScienceBasis(prev =>
                        active ? prev.filter(x => x !== b) : [...prev, b]
                      );
                    }}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>☑️ {b}</span>
                    {active && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            {/* المعاينة الحية لعبارة الشهادة */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>صيغة اللفيف في المحضر:</strong> «اللفيف يصرح ويشهد بأنه يشهد عن معرفة تامة ومخالطة مستمرة واطلاع كامل على أحوال المشهود في حقه.»
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: هوية المشهود في حقه
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى وقائع الخلل ومحور الأموال</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑤ و ⑥ المرحلة 3: طبيعة الخلل المعاين ومحور الأموال (Disorder & Financial) */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑤ و ⑥ طبيعة الخلل المشهود به ومحور التصرف في الأموال
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تسجيل الوقائع العينية المشهودة دون انتحال صفة الطبيب أو تقرير حكم قضائي
              </p>
            </div>
          </div>

          {/* طبيعة الخلل المشهود به */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              💡 <strong>تنبيه منهجي:</strong> لا نسأل اللفيف عن التشخيص الطبي للمرض، وإنما نسأل: <em>«ما الذي عاينه أفراد اللفيف بأنفسهم من حال المشهود في حقه وتصرفاته؟»</em>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                'عدم إدراكه السليم للأمور وعواقب تصرفاته',
                'اضطراب تصرفاته اليومية وعدم اتزانها',
                'عدم سلامة تدبيره لشؤونه الشخصية والمعيشية',
                'عدم تقديره لعواقب ما يصدر عنه من أقوال وأفعال',
                'عدم قدرته على التصرف في ماله تصرفاً سليماً رشيداً',
                'صدور تصرفات مالية أو تعاقدية غير سوية منه',
                'حاجته الأكيدة والمستمرة إلى من يتولى شؤونه ويرعاه',
                'مظاهر ارتباك وفقدان للتمييز في المعاملات العادية',
              ].map((m) => {
                const isSelected = observedManifestations.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setObservedManifestations(prev =>
                        isSelected ? prev.filter(x => x !== m) : [...prev, m]
                      );
                    }}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-black shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>☑️ {m}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-purple-600 text-white' : 'border border-slate-300'
                    }`}>
                      {isSelected && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* خانة مفتوحة لوقائع أخرى عاينها اللفيف */}
            <div className="pt-2">
              <label className="block text-xs font-black text-slate-800 mb-1">
                ✍️ خانة مفتوحة: وقائع وأوصاف أخرى عاينها اللفيف من حاله:
              </label>
              <textarea
                rows={3}
                value={customManifestations}
                onChange={(e) => setCustomManifestations(e.target.value)}
                placeholder="أضف أي وقائع أخرى خاصة وصفها أفراد اللفيف..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-600 leading-relaxed"
              />
            </div>
          </div>

          {/* ⑥ محور الأموال */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>⑥ محور الأموال: هل عاين اللفيف أثر الحالة على أمواله وممتلكاته؟</span>
              </span>
              <div className="flex items-center gap-3 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={hasFinancialImpact === true}
                    onChange={() => setHasFinancialImpact(true)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={hasFinancialImpact === false}
                    onChange={() => setHasFinancialImpact(false)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>

            {hasFinancialImpact && (
              <div className="space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-slate-700 block">
                  حدد مظاهر الأثر المالي التي عاينها اللفيف:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    'عدم حسن تدبير المال والتفريط فيه',
                    'تبذير الأموال وإنفاقها في غير وجه معتبر',
                    'إبرام معاملات وتصرفات لا يدرك قيمتها أو آثارها',
                    'التفريط في حقوقه ومستحقاته المالية الثابتة',
                    'عدم القدرة على إدارة وصيانة ممتلكاته',
                    'الحاجة الماسة إلى من يحافظ على أمواله من الضياع',
                  ].map((fm) => {
                    const sel = financialManifestations.includes(fm);
                    return (
                      <button
                        key={fm}
                        type="button"
                        onClick={() => {
                          setFinancialManifestations(prev =>
                            sel ? prev.filter(x => x !== fm) : [...prev, fm]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                          sel
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{fm}</span>
                        {sel && <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={customFinancialNotes}
                  onChange={(e) => setCustomFinancialNotes(e.target.value)}
                  placeholder="ملاحظات أو وقائع مالية إضافية عاينها اللفيف..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
                />

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold">
                  ⚠️ <strong>ضابط فقهي وقانوني:</strong> النظام يسجل هذه الوقائع لإثبات أثر الحالة فقط، ولا يحولها إلى حكم بالسفه؛ لأن إثبات السفه مسار توثيقي وقضائي مستقل.
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: أساس العلم
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الاستمرارية والوثيقة الطبية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑦ و ⑧ المرحلة 4: الاستمرارية والشهادة الطبية (Continuity & Medical Doc) */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑦ و ⑧ فحص الاستمرارية والتقطع والشهادة الطبية المرفقة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تطبيق مقتضيات المادتين 217 و222 من مدونة الأسرة بشأن ثوبان العقل والخبرة الطبية
              </p>
            </div>
          </div>

          {/* ⑦ الاستمرارية */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <label className="block text-xs font-black text-slate-900">
              ⑦ هل الحالة التي يشهد بها اللفيف مستمرة أم متقطعة؟
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'مستمرة', title: '🟢 مستمرة وملازمة', desc: 'الحالة مستمرة طوال المدة دون فترات إفاقة ملحوظة' },
                { key: 'متقطعة', title: '🟠 متقطعة (تظهر وتزول)', desc: 'تتخللها فترات يثوب إليه عقله فيها' },
                { key: 'غير_محددة', title: '⚪ لا يستطيع اللفيف التحديد', desc: 'معاينة الوقائع دون جزم بمدى استمرارها' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setContinuityStatus(item.key as any)}
                  className={`p-3.5 rounded-2xl border text-right transition cursor-pointer space-y-1 ${
                    continuityStatus === item.key
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{item.title}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{item.desc}</div>
                </button>
              ))}
            </div>

            {/* تنبيه الحالة المتقطعة */}
            {continuityStatus === 'متقطعة' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-bold space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>⚠️ ضابط حاسم طبقا لمدونة الأسرة (المادة 217):</span>
                </div>
                <p className="leading-relaxed text-amber-900">
                  لا تُصاغ الشهادة على أن الحالة دائمة إذا كان اللفيف يعلم أنها تظهر وتزول؛ فمدونة الأسرة تقرر صراحة أن فاقد العقل بصورة متقطعة يكون كامل الأهلية خلال الفترات التي يثوب إليه عقله فيها.
                </p>
                <div className="pt-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={observedLucidIntervals}
                      onChange={(e) => setObservedLucidIntervals(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-[11px] font-bold text-amber-950">
                      عاين اللفيف فترات صريحة يثوب إليه عقله فيها
                    </span>
                  </label>
                  <label className="block text-[11px] font-black text-amber-950 mb-1">
                    بيان فترات ثوبان العقل كما عاينها الشهود:
                  </label>
                  <input
                    type="text"
                    value={lucidIntervalsNotes}
                    onChange={(e) => setLucidIntervalsNotes(e.target.value)}
                    placeholder="مثال: يثوب إليه عقله في فترات متفرقة ويدرك فيها محيطه..."
                    className="w-full p-2 text-xs bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">منذ متى عاين اللفيف هذه الحالة تقريباً؟</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={observedDurationYears}
                    onChange={(e) => setObservedDurationYears(Number(e.target.value))}
                    className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                  />
                  <span className="text-slate-600 font-bold">سنوات خلت إلى تاريخه</span>
                </div>
              </div>
            </div>
          </div>

          {/* ⑧ الشهادة الطبية (وثيقة مستقلة) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>⑧ الشهادة أو الخبرة الطبية (وثيقة مستقلة ومرفقة بالرسم)</span>
              </span>
              <div className="flex items-center gap-3 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={hasMedicalCertificate === true}
                    onChange={() => setHasMedicalCertificate(true)}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span>نعم، توجد شهادة طبية</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={hasMedicalCertificate === false}
                    onChange={() => setHasMedicalCertificate(false)}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span>لا توجد حالياً</span>
                </label>
              </div>
            </div>

            {hasMedicalCertificate ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الطبيب أو الخبير المعاين *</label>
                  <input
                    type="text"
                    value={medicalReport.doctorName}
                    onChange={(e) => setMedicalReport(prev => ({ ...prev, doctorName: e.target.value }))}
                    placeholder="الدكتور..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تخصص الطبيب</label>
                  <input
                    type="text"
                    value={medicalReport.doctorSpecialty}
                    onChange={(e) => setMedicalReport(prev => ({ ...prev, doctorSpecialty: e.target.value }))}
                    placeholder="مثلاً: الطب النفسي والعقلي"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ تحرير الشهادة الطبية *</label>
                  <input
                    type="date"
                    value={medicalReport.reportDate}
                    onChange={(e) => setMedicalReport(prev => ({ ...prev, reportDate: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مرجع أو رقم الشهادة</label>
                  <input
                    type="text"
                    value={medicalReport.reportReference}
                    onChange={(e) => setMedicalReport(prev => ({ ...prev, reportReference: e.target.value }))}
                    placeholder="رقم المرجع الطبي"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">خلاصة التشخيص الطبي (إن وجد)</label>
                  <input
                    type="text"
                    value={medicalReport.summary}
                    onChange={(e) => setMedicalReport(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="خلاصة الشهادة الطبية باقتضاب..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-teal-600"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 font-bold">
                لم يتم إرفاق شهادة طبية بمجلس هذا الإشهاد. يمكن للعدل تحرير شهادة اللفيف، وتبقى الخبرة الطبية من اختصاص المحكمة المختصة.
              </p>
            )}

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-bold">
              🟠 <strong>تنبيه قضائي (المادة 222 من مدونة الأسرة):</strong> الشهادة الطبية عنصر مستقل عن شهادة اللفيف، والمحكمة هي التي تقدرها مع سائر وسائل الإثبات الشرعية عند البت في طلب الحجر.
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الوقائع ومحور الأموال
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى بيت اللفيف والشهود (12)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑨ المرحلة 5: بيت اللفيف (12 شاهداً) - Rule: Same as Marriage Continuity */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑨ بيت اللفيف — منظومة الـ 12 شاهداً والتحقق المزدوج للسن والتحري
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تطبيق وحدة الإثبات والشهادة المعتمدة في النظام وفق القانون 51.26 والقواعد التوثيقية
              </p>
            </div>
          </div>

          {/* استدعاء نفس مكوّن الإثبات Step5_Witnesses كما في رسم استمرار الزواج تماماً */}
          <Step5_Witnesses
            state={{
              ...state,
              documentType: 'موجب_خلل_عقلي',
              evidenceMethod: state.evidenceMethod || 'lafif',
            }}
            setState={setState}
            onNext={() => setActiveStage(6)}
            onBack={() => setActiveStage(4)}
          />

          {/* تفاصيل المعاينة الفردية لكل شاهد والتصريح بالإقرار */}
          {(state.witnesses || []).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-black text-slate-900 block">
                👥 إقرار معاينة أفراد اللفيف المشهود في حقه:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {(state.witnesses || []).map((w, idx) => (
                  <div key={w.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-900 block">
                        {idx + 1}. {w.name || `الشاهد رقم ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ب.ت.و: {w.idNumber || 'غير مدخلة'} | {w.profession || 'المهنة غير محددة'}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>يشهد عن علم ومعاينة</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑩ و ⑪ و ⑫ المرحلة 6: كشف التناقضات، الحدود والضمانات، وروابط المستقبل */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑩ و ⑪ و ⑫ فحص التناسق، الحدود والضمانات القانونية، والروابط المستقبلية
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                محرك كشف التناقضات وضبط عدم الخلط بين موجب الخلل العقلي وأحكام الحجر أو التقديم
              </p>
            </div>
          </div>

          {/* ⑩ محرك كشف التناقضات والفحص التناسقي */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>⑩ محرك فحص اللفيف وكشف التناقضات:</span>
            </span>

            {consistencyAnalysis.length === 0 ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>✓ جميع معطيات شهادة اللفيف متناسقة ومستوفية للشروط المنهجية دون أي تناقض مسجل.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {consistencyAnalysis.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      issue.level === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                        : issue.level === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                    <div className="text-[11px] opacity-80 mr-5 font-normal">
                      💡 {issue.tip}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ⑪ ماذا لا يفعل هذا البيت؟ (حواجز وضمانات قانونية قطعية) */}
          <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-black text-xs border-b border-rose-200 pb-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>⑪ ماذا لا يفعل هذا البيت؟ (حدود وضوابط قانونية قطعية مثبتة في التصميم)</span>
            </div>
            <p className="text-xs text-rose-950 leading-relaxed font-bold">
              يُمنع منعاً باتاً فتح أو دمج أي من العمليات القضائية والولائية التالية ضمن هذا المسار؛ لأن لكل منها إطاراً قانونياً مستقلاً:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px] font-bold text-rose-800">
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ طلب الحجر القضائي</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ التقديم القضائي</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ صلاحية المقدم</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ جرد أموال المحجور</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ بيع مال المحجور</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ إدارة أمواله</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ رفع الحجر</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ إثبات السفه</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ إثبات العته</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-1.5">
                <span>❌ إثبات الغيبة</span>
              </div>
            </div>
          </div>

          {/* ⑫ الروابط المستقبلية */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <span className="text-xs font-black text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <span>⑫ الروابط المستقبلية (عمليات قضائية وإدارية لاحقة محتملة):</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  إحالة إلى ملف قضائي (رقم ملف قضاء الأسرة إن وجد):
                </label>
                <input
                  type="text"
                  value={futureLinkages.familyCourtCaseNumber}
                  onChange={(e) => setFutureLinkages(prev => ({ ...prev, familyCourtCaseNumber: e.target.value }))}
                  placeholder="مثلاً: 2026/1602/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  المحكمة المختصة المعنية:
                </label>
                <input
                  type="text"
                  value={futureLinkages.linkedCourtName}
                  onChange={(e) => setFutureLinkages(prev => ({ ...prev, linkedCourtName: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-600"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              💡 ملحوظة: لا يظهر «إنشاء موجب تقديم» إلا إذا اختار المستخدم بنفسه الانتقال إلى بيت التقديم والصلاحية المستقل.
            </p>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: بيت اللفيف
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى المراجعة الذكية والصياغة والتحرير</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑬ و ⑭ و ⑮ المرحلة 7: المراجعة الذكية، الصياغة والاعتماد النهائي */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑬ و ⑭ المراجعة القانونية الشاملة والصياغة التوثيقية المعتمدة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تدقيق العناصر العشرة واعتماد رسم موجب الخلل العقلي بالصيغة المغربية الأصيلة
              </p>
            </div>
          </div>

          {/* ⑭ شبكة الفحص والمراجعة الذكية (Checklist) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-900 block">
              ⑭ 🧠 شبكة التحقق النهائي من متطلبات الشهادة:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👤 المشهود في حقه:</span>
                <span className={checklist.isSubjectValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {checklist.isSubjectValid ? '🟢 مكتمل' : '🔴 ناقص'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">⏳ مدة المعرفة:</span>
                <span className="text-emerald-700 font-bold">🟢 محددة</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👥 المخالطة والاطلاع:</span>
                <span className={checklist.isKnowledgeValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {checklist.isKnowledgeValid ? '🟢 مستوفاة' : '🔴 غير مستوفاة'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🧠 الوقائع المشهودة:</span>
                <span className={checklist.isManifestationsValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {checklist.isManifestationsValid ? '🟢 معينة' : '🔴 غير معينة'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">💰 أثر الحالة على المال:</span>
                <span className="text-emerald-700 font-bold">
                  {hasFinancialImpact ? '🟢 معين ومقيد' : '⚪ غير مفصل'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">⏳ الاستمرار / التقطع:</span>
                <span className={checklist.isContinuityValid ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {checklist.isContinuityValid ? '🟢 محدد' : '🔴 غير محدد'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">👥 نصاب الـ 12 شاهداً:</span>
                <span className={checklist.isLafifValid ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {checklist.isLafifValid ? '🟢 12 شاهداً مكتمل' : '🟠 غير مكتمل'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🩺 الشهادة الطبية:</span>
                <span className={checklist.isMedicalValid ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {hasMedicalCertificate ? '🟢 مرفقة ومحددة' : '⚪ غير مرفقة (مستقلة)'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">🚫 عدم الخلط مع الحجر:</span>
                <span className="text-emerald-700 font-bold">🟢 مصان ومؤكد</span>
              </div>
            </div>
          </div>

          {/* تنبيهات النواقص إن وجدت */}
          {!checklist.allPassed && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-1.5 text-xs">
              <span className="font-black text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>تنبيهات قبل الاعتماد النهائي:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-amber-900 font-bold">
                {!checklist.isSubjectValid && <li>يرجى إتمام الاسم الكامل ورقم البطاقة الوطنية للمشهود في حقه.</li>}
                {!checklist.isKnowledgeValid && <li>يرجى تحديد مدة وطبيعة المخالطة بين اللفيف والمعني بالأمر.</li>}
                {!checklist.isLafifValid && <li>نصاب شهادة اللفيف يستوجب 12 شاهداً مكتملاً بالأسماء وأرقام بطاقات التعريف.</li>}
              </ul>
            </div>
          )}

          {/* ⑬ صياغة نص رسم موجب الخلل العقلي */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>⑬ الصيغة التوثيقية الثلاثية الطبقات لموجب الخلل العقلي:</span>
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

            <div className="p-6 rounded-2xl border border-slate-300 bg-slate-50 font-serif leading-loose text-sm text-slate-900 whitespace-pre-wrap select-all shadow-inner">
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
              السابق: فحص التناسق والروابط
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
                disabled={!checklist.allPassed}
                className={`px-7 py-3 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
                  checklist.allPassed
                    ? 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 hover:from-indigo-800 hover:to-slate-950 text-white shadow-indigo-900/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الموجب والمتابعة إلى التوثيق النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentalDisabilityInquestWizard;
