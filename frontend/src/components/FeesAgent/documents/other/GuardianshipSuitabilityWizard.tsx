import React, { useState, useMemo, useEffect } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  GuardianshipSuitabilityDeed,
  GuardianshipNeedReason,
  JudicialStatusType,
  ProposedCandidate,
  WitnessKnowledgeScope,
  Party,
} from '../../../../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  createEmptyParty,
} from '../../../../utils/feesAgentUtils';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import {
  Scale,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Heart,
  Check,
  Copy,
  Printer,
  Ban,
  Link2,
  FileCheck,
  Search,
  Sparkles,
  Building2,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Gavel,
  Send,
} from 'lucide-react';

export const GuardianshipSuitabilityWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack,
}) => {
  // المراحل السبعة للمسار: 1 (المعني بالأمر) إلى 7 (المراجعة والتحرير)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // تاريخ اليوم ومراجع التوثيق
  const todayGregorian = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // --------------------------------------------------------------------------
  // 1. هوية المعني بالأمر وسبب الحاجة والوضعية القضائية (المرحلة 1)
  // --------------------------------------------------------------------------
  const [subject, setSubject] = useState({
    fullName: state.guardianshipSuitabilityDeed?.subject?.fullName || state.sellers?.[0]?.name || '',
    fatherName: state.guardianshipSuitabilityDeed?.subject?.fatherName || state.sellers?.[0]?.fatherName || '',
    motherName: state.guardianshipSuitabilityDeed?.subject?.motherName || state.sellers?.[0]?.motherName || '',
    birthDate: state.guardianshipSuitabilityDeed?.subject?.birthDate || state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.guardianshipSuitabilityDeed?.subject?.birthPlace || state.sellers?.[0]?.placeOfBirth || '',
    cin: state.guardianshipSuitabilityDeed?.subject?.cin || state.sellers?.[0]?.idNumber || '',
    profession: state.guardianshipSuitabilityDeed?.subject?.profession || state.sellers?.[0]?.profession || '',
    address: state.guardianshipSuitabilityDeed?.subject?.address || state.sellers?.[0]?.address || '',
    maritalStatus: (state.guardianshipSuitabilityDeed?.subject?.maritalStatus || 'عازب') as 'عازب' | 'متزوج' | 'مطلق' | 'أرمل' | '',
    isKnownDirectlyByLafif: state.guardianshipSuitabilityDeed?.subject?.isKnownDirectlyByLafif ?? true,
  });

  const [needReason, setNeedReason] = useState<GuardianshipNeedReason>(
    state.guardianshipSuitabilityDeed?.needReason || 'فقدان_العقل_الجنون'
  );

  const [customNeedReasonText, setCustomNeedReasonText] = useState<string>(
    state.guardianshipSuitabilityDeed?.customNeedReasonText || ''
  );

  const [judicialStatus, setJudicialStatus] = useState<JudicialStatusType>(
    state.guardianshipSuitabilityDeed?.judicialStatus || 'لم_يصدر_حكم_بالحجر_بعد'
  );

  const [interdictionRuling, setInterdictionRuling] = useState({
    hasRuling: state.guardianshipSuitabilityDeed?.interdictionRuling?.hasRuling ?? false,
    courtName: state.guardianshipSuitabilityDeed?.interdictionRuling?.courtName || 'المحكمة الابتدائية (قسم قضاء الأسرة)',
    fileNumber: state.guardianshipSuitabilityDeed?.interdictionRuling?.fileNumber || '',
    rulingNumber: state.guardianshipSuitabilityDeed?.interdictionRuling?.rulingNumber || '',
    rulingDate: state.guardianshipSuitabilityDeed?.interdictionRuling?.rulingDate || '',
    operativeVerdict: state.guardianshipSuitabilityDeed?.interdictionRuling?.operativeVerdict || '',
    rulingReason: state.guardianshipSuitabilityDeed?.interdictionRuling?.rulingReason || '',
    effectiveDate: state.guardianshipSuitabilityDeed?.interdictionRuling?.effectiveDate || '',
    isFinalOrAppealed: state.guardianshipSuitabilityDeed?.interdictionRuling?.isFinalOrAppealed || ('نهائي' as any),
  });

  // مزامنة حالة الحكم بالحجر مع الوضعية القضائية
  useEffect(() => {
    if (judicialStatus === 'صدر_حكم_بالحجر') {
      setInterdictionRuling(prev => ({ ...prev, hasRuling: true }));
    } else {
      setInterdictionRuling(prev => ({ ...prev, hasRuling: false }));
    }
  }, [judicialStatus]);

  // --------------------------------------------------------------------------
  // 2. الوقائع المعاينة وأساس علم اللفيف (المرحلة 2)
  // --------------------------------------------------------------------------
  const [observedNeedFacts, setObservedNeedFacts] = useState<string[]>(
    state.guardianshipSuitabilityDeed?.observedNeedFacts || [
      'لا يحسن تدبير أمواله',
      'لا يستطيع مباشرة التصرفات المالية على وجه سليم',
      'يحتاج إلى من يقوم على مصالحه المالية',
      'يحتاج إلى من يحافظ على أمواله وحقوقه',
      'توجد أموال تحتاج إلى من يديرها ويحافظ عليها',
    ]
  );

  const [customNeedFactsNotes, setCustomNeedFactsNotes] = useState<string>(
    state.guardianshipSuitabilityDeed?.customNeedFactsNotes || ''
  );

  // قاعدة فحص الاكتفاء بالنتيجة المجردة ("غير صالح")
  const [concreteFactsWitnessed, setConcreteFactsWitnessed] = useState<string[]>([
    'تصرفات مالية ضارة وغير محسوبة',
    'عدم القدرة على إدارة الدخل أو المصروف',
    'عدم إدراك آثار التصرفات والمعاملات',
    'الحاجة المستمرة إلى شخص يتولى الشؤون المالية',
    'اعتماد المعني بالأمر على الغير في تدبير مصالحه',
  ]);

  const [knowledgeDurationYears, setKnowledgeDurationYears] = useState<number>(
    state.guardianshipSuitabilityDeed?.lafifScienceBasis?.durationYears || 10
  );

  const [cohabitationTypes, setCohabitationTypes] = useState<string[]>(
    state.guardianshipSuitabilityDeed?.lafifScienceBasis?.cohabitationTypes || [
      'مخالطة مستمرة',
      'جوار',
      'معاشرة',
      'معرفة بأحوال الأسرة',
      'معرفة بأحواله المالية',
    ]
  );

  const [scopeOfInsight, setScopeOfInsight] = useState<
    'جل_أحواله' | 'الأحوال_المتعلقة_بأهليته_وأمواله' | 'معاينة_وقائع_محددة' | ''
  >(state.guardianshipSuitabilityDeed?.lafifScienceBasis?.scopeOfInsight || 'الأحوال_المتعلقة_بأهليته_وأمواله');

  // --------------------------------------------------------------------------
  // 3. الأموال والحقوق التي تحتاج إلى رعاية (المرحلة 3)
  // --------------------------------------------------------------------------
  const [needsCare, setNeedsCare] = useState<boolean>(
    state.guardianshipSuitabilityDeed?.assetsNeedCare?.needsCare ?? true
  );

  const [assetCategories, setAssetCategories] = useState<string[]>(
    state.guardianshipSuitabilityDeed?.assetsNeedCare?.categories || ['عقارات', 'حسابات_بنكية', 'معاش', 'إرث']
  );

  const [realEstateInfo, setRealEstateInfo] = useState({
    propertyType: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.propertyType || 'دار سكنية ومحل تجاري',
    location: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.location || '',
    titleNumber: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.titleNumber || '',
    acquisitionMethod: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.acquisitionMethod || 'إرث من والده',
    isInherited: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.isInherited ?? true,
    hasRights: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.hasRights ?? true,
    needsManagementOrRent: state.guardianshipSuitabilityDeed?.assetsNeedCare?.realEstateInfo?.needsManagementOrRent ?? true,
  });

  const [assetsNotes, setAssetsNotes] = useState<string>(
    state.guardianshipSuitabilityDeed?.assetsNeedCare?.assetsNotes || ''
  );

  // --------------------------------------------------------------------------
  // 4. الأشخاص المقترحون للتقديم ومحرك الصلاحية وتعارض المصالح (المرحلة 4)
  // --------------------------------------------------------------------------
  const [candidatesCountMode, setCandidatesCountMode] = useState<'شخص_واحد' | 'شخصان' | 'عدة_أشخاص'>(
    state.guardianshipSuitabilityDeed?.candidatesCountMode || 'شخص_واحد'
  );

  const [candidates, setCandidates] = useState<ProposedCandidate[]>(
    state.guardianshipSuitabilityDeed?.candidates || [
      {
        id: 'candidate-1',
        fullName: state.buyers?.[0]?.name || '',
        relationship: 'الابن',
        relationshipCustom: '',
        cin: state.buyers?.[0]?.idNumber || '',
        birthDate: state.buyers?.[0]?.dateOfBirth || '',
        profession: state.buyers?.[0]?.profession || '',
        address: state.buyers?.[0]?.address || '',
        maritalStatus: 'متزوج',
        suitabilityBases: [
          'حسن السيرة والمعاملة',
          'معرفته الجيدة بالمشهود في حقه',
          'صلته القريبة به',
          'قيامه فعلياً برعايته',
          'أمانته في التعامل مع أمواله',
          'قدرته على تدبير شؤونه وحفظ مصالحه',
          'عدم وجود نزاع معروف بينهما',
        ],
        customSuitabilityNotes: '',
        isCurrentlyManaging: true,
        currentManagementTypes: ['رعاية شخصية', 'تدبير المصاريف', 'إدارة المال', 'متابعة العلاج', 'الشؤون الإدارية'],
        conflictOfInterestStatus: 'لا_يعلم_اللفيف_بذلك',
        conflictOfInterestNotes: '',
      },
    ]
  );

  // إضافة مرشح جديد
  const handleAddCandidate = () => {
    const newCand: ProposedCandidate = {
      id: `candidate-${Date.now()}`,
      fullName: '',
      relationship: 'الأخ',
      relationshipCustom: '',
      cin: '',
      birthDate: '',
      profession: '',
      address: '',
      maritalStatus: '',
      suitabilityBases: [
        'حسن السيرة والمعاملة',
        'معرفته الجيدة بالمشهود في حقه',
        'أمانته في التعامل مع أمواله',
        'قدرته على حفظ مصالحه',
      ],
      customSuitabilityNotes: '',
      isCurrentlyManaging: false,
      currentManagementTypes: [],
      conflictOfInterestStatus: 'لا_يعلم_اللفيف_بذلك',
      conflictOfInterestNotes: '',
    };
    setCandidates(prev => [...prev, newCand]);
  };

  const handleRemoveCandidate = (index: number) => {
    if (candidates.length <= 1) return;
    setCandidates(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateCandidate = (index: number, field: keyof ProposedCandidate, val: any) => {
    setCandidates(prev =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: val } : c))
    );
  };

  // --------------------------------------------------------------------------
  // 5. نطاق علم الشهود لكل شاهد (المرحلة 5)
  // --------------------------------------------------------------------------
  const [witnessKnowledgeScopes, setWitnessKnowledgeScopes] = useState<WitnessKnowledgeScope[]>(
    state.guardianshipSuitabilityDeed?.witnessKnowledgeScopes ||
      Array.from({ length: 12 }, (_, i) => ({
        witnessIndex: i + 1,
        knowsSubjectState: true,
        knowsNeedForGuardianship: true,
        knowsFinancialState: true,
        knowsProposedCandidate: true,
        knowsCandidateSuitability: true,
        knowsActualCareByCandidate: true,
        durationOfKnowledgeYears: 10,
        cohabitationTypes: ['مخالطة مستمرة', 'جوار'],
      }))
  );

  // مزامنة عدد نطاقات العلم مع الشهود
  useEffect(() => {
    const wCount = (state.witnesses || []).length || 12;
    if (witnessKnowledgeScopes.length < wCount) {
      const extra = Array.from({ length: wCount - witnessKnowledgeScopes.length }, (_, idx) => ({
        witnessIndex: witnessKnowledgeScopes.length + idx + 1,
        knowsSubjectState: true,
        knowsNeedForGuardianship: true,
        knowsFinancialState: true,
        knowsProposedCandidate: true,
        knowsCandidateSuitability: true,
        knowsActualCareByCandidate: true,
        durationOfKnowledgeYears: 10,
        cohabitationTypes: ['مخالطة مستمرة'],
      }));
      setWitnessKnowledgeScopes(prev => [...prev, ...extra]);
    }
  }, [state.witnesses, witnessKnowledgeScopes.length]);

  // --------------------------------------------------------------------------
  // 6. الوثائق والمستندات المرفقة (المرحلة 6)
  // --------------------------------------------------------------------------
  const [docsChecklist, setDocsChecklist] = useState({
    subjectCinAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.subjectCinAttached ?? true,
    candidateCinAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.candidateCinAttached ?? true,
    kinshipProofAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.kinshipProofAttached ?? true,
    interdictionRulingAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.interdictionRulingAttached ?? (judicialStatus === 'صدر_حكم_بالحجر'),
    medicalCertificateAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.medicalCertificateAttached ?? true,
    assetsProofAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.assetsProofAttached ?? true,
    bankOrPensionDocAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.bankOrPensionDocAttached ?? true,
    otherDocsAttached: state.guardianshipSuitabilityDeed?.documentsChecklist?.otherDocsAttached || '',
  });

  const [futureLinkages, setFutureLinkages] = useState({
    familyCourtName: state.guardianshipSuitabilityDeed?.futureLinkages?.familyCourtName || 'المحكمة الابتدائية بالرباط - قسم قضاء الأسرة',
    guardianshipFileNumber: state.guardianshipSuitabilityDeed?.futureLinkages?.guardianshipFileNumber || '',
    judgeNotes: state.guardianshipSuitabilityDeed?.futureLinkages?.judgeNotes || 'موجب مُعَد للإدلاء به أمام السيد القاضي المكلف بشؤون القاصرين طبقاً للمادتين 261 و262 من قانون المسطرة المدنية رقم 58.25.',
  });

  // --------------------------------------------------------------------------
  // فحص التناقضات والتناسق الداخلي (Inconsistency Detector)
  // --------------------------------------------------------------------------
  const inconsistencyIssues = useMemo(() => {
    const issues: Array<{ level: 'warning' | 'error' | 'info'; message: string; tip: string }> = [];

    // التحقق من المعرفة المباشرة بالمعني
    if (!subject.isKnownDirectlyByLafif) {
      issues.push({
        level: 'warning',
        message: 'تم التصريح بعدم معرفة اللفيف المباشرة بالمعني بالأمر.',
        tip: 'شهادة اللفيف في إثبات الحاجة إلى التقديم تستلزم المعاينة والمخالطة الحقيقية.',
      });
    }

    // التحقق من الوقائع المعاينة
    if (observedNeedFacts.length === 0 && !customNeedFactsNotes.trim()) {
      issues.push({
        level: 'error',
        message: 'لم يتم تحديد الوقائع التي بنى عليها اللفيف علمه بالحاجة إلى التقديم.',
        tip: 'لا يكفي الادعاء المجرد؛ يلزم تحديد مظاهر عدم القدرة على تدبير الأموال أو الحاجة للرعاية.',
      });
    }

    // تعارض في نطاق علم الشهود
    const conflictingWitnessDuration = witnessKnowledgeScopes.some(
      w => (w.durationOfKnowledgeYears || 0) < 2 && w.knowsFinancialState
    );
    if (conflictingWitnessDuration) {
      issues.push({
        level: 'warning',
        message: 'تناقض في نطاق العلم: بعض الشهود صرحوا بمعرفتهم المالية مع مدة معرفة وجيزة تقل عن سنتين.',
        tip: 'يستحسن التثبت من أساس علم الشاهد بالوضعية المالية قبل اعتماد شهادته في هذا الشق.',
      });
    }

    // وجود تعارض مصالح مصرح به
    const hasConflict = candidates.some(c => c.conflictOfInterestStatus === 'نعم');
    if (hasConflict) {
      issues.push({
        level: 'warning',
        message: 'تم تسجيل وجود مصلحة مالية محتملة لأحد المرشحين قد تتعارض مع مصلحة المعني بالأمر.',
        tip: 'هذا البيان يدرج صراحة في وثيقة الموجب لعرضه على قاضي شؤون القاصرين للبت فيه طبقاً للقانون 58.25.',
      });
    }

    // نصاب الشهود
    const witnessesCount = (state.witnesses || []).length;
    if (witnessesCount < 12) {
      issues.push({
        level: 'warning',
        message: `نصاب اللفيف غير مكتمل (${witnessesCount} من 12 شاهداً).`,
        tip: 'شهادة اللفيف الشرعية لموجب التقديم والصلاحية تتطلب 12 شاهداً على الأقل وفقاً للمقتضيات القانونية والفقهية.',
      });
    }

    return issues;
  }, [
    subject.isKnownDirectlyByLafif,
    observedNeedFacts,
    customNeedFactsNotes,
    witnessKnowledgeScopes,
    candidates,
    state.witnesses,
  ]);

  // --------------------------------------------------------------------------
  // الصياغة العدلية رباعية الطبقات (Four-Layer Legal Drafting)
  // --------------------------------------------------------------------------
  const generatedRasmText = useMemo(() => {
    const sName = subject.fullName || 'المعني بالأمر';
    const sFather = subject.fatherName || '...';
    const sMother = subject.motherName || '...';
    const sCin = subject.cin ? `(رقم ب.ت.و: ${subject.cin})` : '';
    const sAddress = subject.address ? `الساكن بـ ${subject.address}` : 'المقيم بمحل سكناه المعروف';
    const sBirth = subject.birthDate ? `المولود بتاريخ ${subject.birthDate}${subject.birthPlace ? ` بـ ${subject.birthPlace}` : ''}` : '';

    // سبب الحاجة
    const reasonLabel =
      needReason === 'فقدان_العقل_الجنون'
        ? 'فقدان العقل والتمييز'
        : needReason === 'إعاقة_ذهنية'
        ? 'إعاقة ذهنية مؤثرة في الإدراك'
        : needReason === 'سفه'
        ? 'السفه والتبذير والتفريط في المال'
        : needReason === 'عته'
        ? 'العته ونقصان الإدراك'
        : needReason === 'حجر_قضائي_قائم'
        ? 'حجر قضائي صادر بشأنه'
        : customNeedReasonText || 'حالة تستدعي رعاية شؤونه وأمواله';

    // الوقائع المعاينة
    const factsList = [
      ...observedNeedFacts,
      ...(customNeedFactsNotes.trim() ? [customNeedFactsNotes.trim()] : [])
    ].join('، و');

    // المخالطة وأساس العلم
    const cohabClause = cohabitationTypes.join(' و');
    const scopeClause =
      scopeOfInsight === 'جل_أحواله'
        ? 'مما مكنهم من الاطلاع على جل أحواله العامة والخاصة'
        : scopeOfInsight === 'الأحوال_المتعلقة_بأهليته_وأمواله'
        ? 'مما مكنهم من الاطلاع الكامل على أحواله المتعلقة بأهليته وتصرفاته وأمواله'
        : 'معاينة وقائع حالته المالية والشخصية';

    // الأموال
    const assetsClause = needsCare
      ? `وأن للمعني بالأمر حقوقاً وأموالاً تحتاج إلى حفظ وتدبير وحماية؛ من ${assetCategories.join('، و')}${
          assetCategories.includes('عقارات') && realEstateInfo.propertyType ? `، منها: (${realEstateInfo.propertyType}${realEstateInfo.location ? ` بـ ${realEstateInfo.location}` : ''}${realEstateInfo.titleNumber ? ` ذي الرسم العقاري ${realEstateInfo.titleNumber}` : ''})` : ''
        }`
      : 'وأن الغاية هي رعاية شؤونه ومصالحه الشخصية والمالية بحسب ما يقتضيه الحال';

    // المرشحون والصلاحية
    const candidatesClause = candidates
      .map((c, idx) => {
        const cName = c.fullName || `المرشح ${idx + 1}`;
        const cCin = c.cin ? `(حامل ب.ت.و: ${c.cin})` : '';
        const cRel = c.relationshipCustom || c.relationship;
        const cBases = c.suitabilityBases.join('، و');
        const cManaging = c.isCurrentlyManaging
          ? `وهو القائم فعلياً برعايته وشؤونه من: (${c.currentManagementTypes.join('، و')})`
          : 'ويرى اللفيف أهليته وصلاحيته التامة للقيام بتلك المهمة';
        const cConflict =
          c.conflictOfInterestStatus === 'نعم' && c.conflictOfInterestNotes?.trim()
            ? `(مع الإشارة إلى ما صُرح به من وجود المصلحة الآتية: ${c.conflictOfInterestNotes})`
            : c.conflictOfInterestStatus === 'توجد_مصلحة_معلومة_ومصرح_بها'
            ? '(مع التصريح بمعلومية وضعه المالي دون تعارض مانع)'
            : 'دون علم بوجود أي نزاع أو تعارض في المصالح بينهما';

        return `${idx + 1}) ${cName} ${cCin}، وهو ${cRel} للمعني بالأمر، المشهود له بـ: ${cBases}؛ ${cManaging}، ${cConflict}.`;
      })
      .join('\n');

    // الحكم بالحجر إن وجد
    const rulingClause = interdictionRuling.hasRuling && interdictionRuling.rulingNumber
      ? `\nوقد أدلى طالبو الإشهاد بنسخة من الحكم القضائي الصادر عن ${interdictionRuling.courtName} بتاريخ ${interdictionRuling.rulingDate || '...'} في الملف رقم ${interdictionRuling.fileNumber || '...'} تحت رقم ${interdictionRuling.rulingNumber}، القاضي بـ: (${interdictionRuling.operativeVerdict || 'توقيع الحجر على المعني بالأمر'})، وهو المرجع المعتمد في بيان الوضعية القضائية المقررة.`
      : '\nمع الإشارة إلى أن هذا الموجب لا يقوم مقام حكم الحجر القضائي، وإنما حُرر كشهادة بالوقائع والصلاحية لتقديمه إلى المحكمة المختصة (قسم قضاء الأسرة) لاتخاذ ما تراه قانوناً طبقاً لمقتضيات المادتين 261 و262 من قانون المسطرة المدنية رقم 58.25 والمادتين 228 و244 من مدونة الأسرة.';

    const witnessesList = state.witnesses || [];
    const witnessesText = witnessesList.length > 0
      ? witnessesList.map((w, idx) => `${idx + 1}. ${w.name || 'شاهد'} (ب.ت.و: ${w.idNumber || '...'}) - المهنة: ${w.profession || '...'} - السكن: ${w.address || '...'}`).join('\n')
      : '... (يقيد هنا أفراد اللفيف الاثنا عشر بكامل هوياتهم وصفاتهم) ...';

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.

موجب التقديم والصلاحية (شهادة لفيفية)
مرجع الإشهاد: قسم قضاء الأسرة - ملف النيابة الشرعية
بتاريخ: ${todayHijri} هـ موافق ${todayGregorian} م.

أمام العدلين الموقعين أسفله بمكتبهما التوثيقي:
حضر شهود اللفيف الاثنا عشر الآتية أسماؤهم وهوية كل واحد منهم:
${witnessesText}

الذين بعد استفسارهم والتأكد من أهليتهم الشرعية والقانونية وخلوهم من موانع الشهادة، شهد كل واحد منهم بما يعلمه علماً يقيناً ومباشراً:
الطبقة الأولى: معرفة اللفيف بالمشهود في حقه
بأنهم يعرفون معرفة تامة ومخالطة متصلة السيد: ${sName}، ابن ${sFather} والمرحومة/السيدة ${sMother}، ${sBirth}، ${sCin}، ${sAddress}، ${sCin}، معرفة قديمة مستمرة امتدت لقرابة ${knowledgeDurationYears} سنة خلت، قوامها: ${cohabClause}، ${scopeClause}.

الطبقة الثانية: الوقائع المعاينة والحاجة إلى التقديم
ويشهد اللفيف بأن المعني بالأمر المذكور أعلاه قد طرأت عليه حالة (${reasonLabel}) جعلته في وضعية:
${factsList}.
${assetsClause}.

الطبقة الثالثة: ضرورة إقامة من يتولى شؤونه
وبناءً على هذه المعاينة الصريحة لتصرفاته وأحواله، فإن المعني بالأمر محتاج حاجة أكيدة وماسة إلى من يتولى شؤونه، ويقوم على مصالحه المالية والشخصية، ويحافظ على حقوقه من الضياع أو التفريط.

الطبقة الرابعة: شهادة اللفيف بصلاحية الشخص المقترح للتقديم
كما يشهد اللفيف المذكور، عن معرفة أكيدة واطلاع بين، بأن الشخص المقترح للقيام بشؤون المعني بالأمر:
${candidatesClause}
وأنهم يرون فيه الأمانة والصلاحية والكفاءة والغيرة لرعاية مصالحه وصيانة أمواله وحقوقه، ولم يعلموا فيه خيانة ولا تفريطاً ولا مطمعاً يضر بالمعني بالأمر.
${rulingClause}

خاتمة وتلقي الشهادة:
وعلى ما ذكر، شهد اللفيف المذكور وأشهدوا على أنفسهم بالصلاحية والحاجة الموصوفة أعلاه، قصد الإدلاء بهذا الرسم للمحكمة الابتدائية المختصة (قسم قضاء الأسرة - السيد القاضي المكلف بشؤون القاصرين) لتقرر بشأنه ما تراه مناسباً طبقاً لقواعد النيابة الشرعية ومقتضيات القانون الجاري به العمل.
وتُليت عليهم فصول الشهادة فصادقوا عليها، وأذنوا بتحريرها طبقاً للقانون.
(توقيع الشهود)                                   (توقيع العدلين)`;
  }, [
    subject,
    needReason,
    customNeedReasonText,
    observedNeedFacts,
    customNeedFactsNotes,
    cohabitationTypes,
    scopeOfInsight,
    knowledgeDurationYears,
    needsCare,
    assetCategories,
    realEstateInfo,
    candidates,
    interdictionRuling,
    state.witnesses,
    todayGregorian,
    todayHijri,
  ]);

  // --------------------------------------------------------------------------
  // حفظ ومزامنة الحالة مع FeesAgentState
  // --------------------------------------------------------------------------
  useEffect(() => {
    const deedData: GuardianshipSuitabilityDeed = {
      subject,
      needReason,
      customNeedReasonText,
      judicialStatus,
      interdictionRuling,
      observedNeedFacts,
      customNeedFactsNotes,
      lafifScienceBasis: {
        durationYears: knowledgeDurationYears,
        cohabitationTypes,
        scopeOfInsight,
      },
      candidatesCountMode,
      candidates,
      assetsNeedCare: {
        needsCare,
        categories: assetCategories,
        realEstateInfo,
        assetsNotes,
      },
      documentsChecklist: docsChecklist,
      witnessKnowledgeScopes,
      futureLinkages,
      deedText: generatedRasmText,
    };

    const subjectParty: Party = {
      ...createEmptyParty(),
      id: 'party-subject-guardianship',
      name: subject.fullName,
      idNumber: subject.cin,
      nationality: 'مغربي',
      address: subject.address,
      partyRole: 'مشهود في حقه',
    };

    const candidateParties: Party[] = candidates.map((c, idx) => ({
      ...createEmptyParty(),
      id: c.id || `party-candidate-${idx + 1}`,
      name: c.fullName,
      idNumber: c.cin,
      nationality: 'مغربي',
      address: c.address || '',
      profession: c.profession || '',
      partyRole: 'شخص مقترح للتقديم',
    }));

    setState(prev => ({
      ...prev,
      guardianshipSuitabilityDeed: deedData,
      sellers: [subjectParty],
      buyers: candidateParties,
    }));
  }, [
    subject,
    needReason,
    customNeedReasonText,
    judicialStatus,
    interdictionRuling,
    observedNeedFacts,
    customNeedFactsNotes,
    knowledgeDurationYears,
    cohabitationTypes,
    scopeOfInsight,
    candidatesCountMode,
    candidates,
    needsCare,
    assetCategories,
    realEstateInfo,
    assetsNotes,
    docsChecklist,
    witnessKnowledgeScopes,
    futureLinkages,
    generatedRasmText,
    setState,
  ]);

  // قائمة مراحل المعالج
  const stagesList = [
    { id: 1, title: 'المعني بالأمر', desc: 'الهوية والوضعية القضائية', icon: Users },
    { id: 2, title: 'وقائع الحاجة', desc: 'أسباب التقديم وأساس العلم', icon: Scale },
    { id: 3, title: 'الأموال والحقوق', desc: 'الأموال التي تحتاج رعاية', icon: DollarSign },
    { id: 4, title: 'المقترح والصلاحية', desc: 'أركان الصلاحية وتعارض المصالح', icon: Heart },
    { id: 5, title: 'شهود اللفيف (12)', desc: 'نصاب الـ 12 ونطاق العلم', icon: Users },
    { id: 6, title: 'الوثائق وقضاء الأسرة', desc: 'مرفقات الملف والقانون 58.25', icon: FileText },
    { id: 7, title: 'المراجعة والتحرير', desc: 'الصياغة رباعية الطبقات والتوثيق', icon: FileCheck },
  ];

  // قائمة الفحص الذكي (Smart Checklist) للمرحلة 7
  const checklist = useMemo(() => {
    const witnessesCount = (state.witnesses || []).length;
    return {
      hasSubjectName: Boolean(subject.fullName.trim()),
      hasSubjectCin: Boolean(subject.cin.trim()),
      hasNeedReason: Boolean(needReason),
      hasFacts: observedNeedFacts.length > 0 || Boolean(customNeedFactsNotes.trim()),
      hasCandidateName: candidates.every(c => Boolean(c.fullName.trim())),
      hasCandidateCin: candidates.every(c => Boolean(c.cin.trim())),
      hasSuitabilityBases: candidates.every(c => c.suitabilityBases.length > 0),
      hasTwelveWitnesses: witnessesCount >= 12,
      allPassed:
        Boolean(subject.fullName.trim()) &&
        Boolean(subject.cin.trim()) &&
        Boolean(needReason) &&
        (observedNeedFacts.length > 0 || Boolean(customNeedFactsNotes.trim())) &&
        candidates.every(c => Boolean(c.fullName.trim()) && Boolean(c.cin.trim()) && c.suitabilityBases.length > 0) &&
        witnessesCount >= 12,
    };
  }, [subject, needReason, observedNeedFacts, customNeedFactsNotes, candidates, state.witnesses]);

  const handleCopyDeed = () => {
    navigator.clipboard.writeText(generatedRasmText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // الانتقال المباشر للمرحلة 7 (المراجعة النهائية والإرسال للقاضي المكلف بالتوثيق)
  const handleProceedToStep7 = () => {
    const subjectParty: Party = {
      ...createEmptyParty(),
      id: 'party-subject-guardianship',
      name: subject.fullName,
      idNumber: subject.cin,
      nationality: 'مغربي',
      address: subject.address,
      partyRole: 'مشهود في حقه',
    };

    const candidateParties: Party[] = candidates.map((c, idx) => ({
      ...createEmptyParty(),
      id: c.id || `party-candidate-${idx + 1}`,
      name: c.fullName,
      idNumber: c.cin,
      nationality: 'مغربي',
      address: c.address || '',
      profession: c.profession || '',
      partyRole: 'شخص مقترح للتقديم',
    }));

    setState(prev => ({
      ...prev,
      step: 7,
      documentType: 'موجب_التقديم_والصلاحية',
      draft: generatedRasmText,
      draftText: generatedRasmText,
      sellers: [subjectParty],
      buyers: candidateParties,
      witnesses: prev.witnesses || [],
    }));
    if (_onNext) {
      _onNext();
    }
  };

  return (
    <div className="space-y-6 pb-20 text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* ① بطاقة العملية الثابتة أعلى الشاشة (Fixed Process Banner) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ⚖️ موجب التقديم والصلاحية
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  👥 شهادة لفيفية (12 شاهداً)
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  checklist.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  {checklist.allPassed ? '🟢 مكتمل وجاهز للصياغة' : '🟠 في طور إعداد الشهادة'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-amiri">
                شهادة اللفيف لإثبات الحاجة إلى التقديم وبيان صلاحية الشخص المقترح
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: 0.25 }))}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50/60 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="مراجعة شروط التلقي والاختصاص المكاني (المرحلة 0.25)"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>فحص شروط التلقي (0.25)</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToStep7}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-md shadow-red-900/30 border border-red-400/40 flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
              title="الانتقال المباشر للمراجعة النهائية وتقديم الوثيقة للقاضي المكلف بالتوثيق (المرحلة 7)"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>المتابعة إلى مرحلة المراجعة والإرسال للقاضي (المرحلة 7)</span>
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
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">⚠️ سبب الحاجة للتقديم</span>
            <span className="font-bold text-amber-900 truncate block">
              {needReason.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👤 المقترح للتقديم</span>
            <span className="font-bold text-emerald-900 truncate block">
              {candidates[0]?.fullName ? `${candidates[0].fullName} (${candidates[0].relationship})` : 'قيد التحديد'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👥 نصاب الشهود</span>
            <span className="font-black text-emerald-700">
              {(state.witnesses || []).length} من 12 شاهداً
            </span>
          </div>
        </div>

        {/* ⑭ خط سير المنظومة والحدود التوثيقية الصارمة */}
        <div className="p-3.5 bg-gradient-to-r from-amber-50/70 via-slate-50 to-indigo-50/70 rounded-2xl border border-amber-200/60 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px]">1</span>
              👤 المعني بالأمر
            </span>
            <span className="text-slate-400 font-bold">➔</span>
            <span className="text-amber-800 font-bold">الحاجة إلى من يتولى شؤونه</span>
            <span className="text-slate-400 font-bold">➔</span>
            <span className="text-indigo-800 font-black px-2 py-0.5 bg-white rounded-lg border border-indigo-200">
              ⚖️ موجب التقديم
            </span>
            <span className="text-slate-400 font-bold">➔</span>
            <span className="text-emerald-800 font-bold">👤 الشخص المقترح وصلاحيته</span>
            <span className="text-slate-400 font-bold">➔</span>
            <span className="text-indigo-900 font-black flex items-center gap-1">
              <Gavel className="w-3.5 h-3.5 text-indigo-700" />
              ⚖️ المحكمة تقرر التعيين
            </span>
          </div>
        </div>

        {/* شريط خطوات المسار التفاعلي */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
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
                    ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isCurrent ? 'bg-amber-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {st.id}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-amber-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                </div>
                <div className="font-black text-xs text-slate-900 truncate">{st.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ② و ③ المرحلة 1: هوية المشهود في حقه وسبب الحاجة والوضعية القضائية */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ② و ③ هوية الشخص الذي يحتاج إلى التقديم (المعني بالأمر) والوضعية القضائية
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تحديد المعني الذي ستتعلق به النيابة الشرعية، ووصف سبب الحاجة بدقة دون تحويله تلقائياً إلى حكم بالحجر
              </p>
            </div>
          </div>

          {/* ② سبب الحاجة إلى التقديم */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ② سبب الحاجة إلى التقديم (وصف السبب المصرح به من طالب الرسم):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {[
                { key: 'فقدان_العقل_الجنون', label: '🧠 فقدان العقل / الجنون', desc: 'انعدام أهلية الأداء' },
                { key: 'إعاقة_ذهنية', label: '🧩 إعاقة ذهنية', desc: 'نقص أو انعدام الإدراك وحسن التصرف' },
                { key: 'سفه', label: '🟠 سفه', desc: 'تبذير المال والتفريط فيه على غير مقتضى العقل' },
                { key: 'عته', label: '🟡 عته', desc: 'نقصان التمييز والأهلية' },
                { key: 'حجر_قضائي_قائم', label: '⚖️ حجر قضائي قائم', desc: 'ثابت بحكم صادر عن قضاء الأسرة' },
                { key: 'حالة_أخرى_تحد_من_حسن_تدبير_الأموال', label: '👤 حالة أخرى تمنع من حسن تدبير الأموال', desc: 'عجز أو عاهة مانعة من التدبير' },
                { key: 'سبب_ثابت_بحكم_قضائي', label: '📜 سبب ثابت بحكم قضائي', desc: 'مستند إلى مقرر قضائي سابق' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setNeedReason(item.key as any)}
                  className={`p-3 rounded-2xl border text-right transition cursor-pointer space-y-1 ${
                    needReason === item.key
                      ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>

            {needReason === 'حالة_أخرى_تحد_من_حسن_تدبير_الأموال' && (
              <input
                type="text"
                value={customNeedReasonText}
                onChange={(e) => setCustomNeedReasonText(e.target.value)}
                placeholder="وضح وصف الحالة المانعة من حسن التدبير بدقة..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-amber-600"
              />
            )}
          </div>

          {/* ③ بطاقة المشهود في حقه */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>👤 البيانات الأساسية للمشهود في حقه:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={subject.fullName}
                  onChange={(e) => setSubject(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="الاسم العائلي والشخصي"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={subject.fatherName}
                  onChange={(e) => setSubject(prev => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="اسم الأب كاملاً"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={subject.motherName}
                  onChange={(e) => setSubject(prev => ({ ...prev, motherName: e.target.value }))}
                  placeholder="اسم الأم كاملاً"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                <input
                  type="date"
                  value={subject.birthDate}
                  onChange={(e) => setSubject(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
                <input
                  type="text"
                  value={subject.birthPlace}
                  onChange={(e) => setSubject(prev => ({ ...prev, birthPlace: e.target.value }))}
                  placeholder="مدينة أو جماعة الازدياد"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={subject.cin}
                  onChange={(e) => setSubject(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                  placeholder="مثال: AB123456"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl uppercase font-mono font-bold focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة</label>
                <input
                  type="text"
                  value={subject.profession}
                  onChange={(e) => setSubject(prev => ({ ...prev, profession: e.target.value }))}
                  placeholder="المهنة أو دون عمل"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الحالة العائلية</label>
                <select
                  value={subject.maritalStatus}
                  onChange={(e) => setSubject(prev => ({ ...prev, maritalStatus: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                >
                  <option value="عازب">عازب(ة)</option>
                  <option value="متزوج">متزوج(ة)</option>
                  <option value="مطلق">مطلق(ة)</option>
                  <option value="أرمل">أرمل(ة)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">محل السكنى والإقامة</label>
                <input
                  type="text"
                  value={subject.address}
                  onChange={(e) => setSubject(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="العنوان الكامل للمحل المعتاد للمعني بالأمر"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-600"
                />
              </div>
            </div>

            {/* سؤال المعرفة المباشرة */}
            <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-800">
                هل يعرف أفراد اللفيف المشهود في حقه معرفة مباشرة ومخالطة تامة؟
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="isDirectKnown"
                    checked={subject.isKnownDirectlyByLafif === true}
                    onChange={() => setSubject(prev => ({ ...prev, isKnownDirectlyByLafif: true }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span>نعم، معرفة مباشرة</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="isDirectKnown"
                    checked={subject.isKnownDirectlyByLafif === false}
                    onChange={() => setSubject(prev => ({ ...prev, isKnownDirectlyByLafif: false }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>

            {!subject.isKnownDirectlyByLafif && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>ينبغي أن يكون مضمون شهادة اللفيف مبنياً على المعاينة والمخالطة الحقيقية لا مجرد السماع والنقل.</span>
              </div>
            )}
          </div>

          {/* ⚖️ الوضعية القضائية الحالية */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <label className="block text-xs font-black text-slate-900">
              ⚖️ الوضعية القضائية الحالية للمشهود في حقه:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              {[
                { key: 'لم_يصدر_حكم_بالحجر_بعد', label: 'لم يصدر حكم بالحجر بعد', tip: 'شهادة بالوقائع لعرضها على القضاء' },
                { key: 'صدر_حكم_بالحجر', label: 'صدر حكم بالحجر قضائياً', tip: 'التركيز على الصلاحية والتقديم' },
                { key: 'الملف_معروض_على_المحكمة', label: 'الملف معروض على المحكمة', tip: 'مسطرة جارية بقسم قضاء الأسرة' },
                { key: 'توجد_نيابة_شرعية_قائمة', label: 'توجد نيابة شرعية قائمة', tip: 'استبدال مقدم أو إضافة' },
                { key: 'أخرى', label: 'توجد حالة قضائية أخرى', tip: 'حالة مسطرية خاصة' },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setJudicialStatus(st.key as any)}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer space-y-1 ${
                    judicialStatus === st.key
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500 font-black'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs text-slate-900">{st.label}</div>
                  <div className="text-[10px] text-slate-500">{st.tip}</div>
                </button>
              ))}
            </div>

            {/* تنبيه إذا لم يصدر حكم بالحجر بعد */}
            {judicialStatus === 'لم_يصدر_حكم_بالحجر_بعد' && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-bold space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>تنبيه مهني وقانوني (المادة 220 من مدونة الأسرة):</span>
                </div>
                <p className="leading-relaxed">
                  الموجب لا يقوم مقام الحكم القضائي بالحجر؛ فالحجر يثبت بحكم قضائي وتعتمد المحكمة في إقراره على الخبرة الطبية وسائر وسائل الإثبات الشرعية. وموضوع الشهادة هنا هو إثبات الوقائع التي تبرر عرض أمره على المحكمة وبيان الشخص الصالح لرعايته عند الاقتضاء.
                </p>
              </div>
            )}

            {/* ⑮ بيانات الحكم بالحجر إذا كان صادراً بالفعل */}
            {judicialStatus === 'صدر_حكم_بالحجر' && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-indigo-700" />
                    <span>📜 بيانات الحكم القضائي القاضي بالحجر (المادة 262 من قانون المسطرة المدنية 58.25):</span>
                  </span>
                  <span className="text-[11px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    موضوع الموجب الآن: بيان الشخص الصالح للتقديم
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة المصدرة للحكم</label>
                    <input
                      type="text"
                      value={interdictionRuling.courtName}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, courtName: e.target.value }))}
                      placeholder="المحكمة الابتدائية (قسم قضاء الأسرة)"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الملف</label>
                    <input
                      type="text"
                      value={interdictionRuling.fileNumber}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, fileNumber: e.target.value }))}
                      placeholder="مثال: 2026/1602/..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الحكم</label>
                    <input
                      type="text"
                      value={interdictionRuling.rulingNumber}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, rulingNumber: e.target.value }))}
                      placeholder="رقم الحكم القضائي"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ صدور الحكم</label>
                    <input
                      type="date"
                      value={interdictionRuling.rulingDate}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, rulingDate: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ سريان الحجر</label>
                    <input
                      type="date"
                      value={interdictionRuling.effectiveDate}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الوضع الإجرائي للحكم</label>
                    <select
                      value={interdictionRuling.isFinalOrAppealed}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, isFinalOrAppealed: e.target.value as any }))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 font-bold"
                    >
                      <option value="نهائي">نهائي حائز لقوة الشيء المقضي به</option>
                      <option value="مشمول_بالنفاذ_المعجل">مشمول بالنفاذ المعجل بقوة القانون</option>
                      <option value="قابل_للطعن">في طور الطعن أو التبليغ</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">منطوق وسبب الحكم بالحجر</label>
                    <input
                      type="text"
                      value={interdictionRuling.operativeVerdict}
                      onChange={(e) => setInterdictionRuling(prev => ({ ...prev, operativeVerdict: e.target.value }))}
                      placeholder="الحكم بالحجر على فلان لعلة... وتعيين من يتولى شؤونه"
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                    />
                  </div>
                </div>
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
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى وقائع الشهادة وأساس علم اللفيف</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ④ و ⑤ و ⑥ المرحلة 2: وقائع الشهادة وأساس علم اللفيف بالمشهود في حقه */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ④ و ⑤ و ⑥ ما يشهد به اللفيف وأساس العلم (الوقائع العينية لا النتائج المجردة)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                بناء أركان شهادة اللفيف على المشاهدة والمعاينة الواقعية وتفادي مجرد العبارات الإنشائية
              </p>
            </div>
          </div>

          {/* ④ ما الذي يريد اللفيف أن يشهد به؟ */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ④ حدد الوقائع التي يعلمها اللفيف عن المشهود في حقه والتي تبرر حاجته لمن يتولى شؤونه أو أمواله:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {[
                'لا يحسن تدبير أمواله',
                'لا يستطيع مباشرة التصرفات المالية على وجه سليم',
                'يحتاج إلى من يقوم على مصالحه المالية',
                'يحتاج إلى من يحافظ على أمواله وحقوقه',
                'يحتاج إلى من يتولى إدارة أملاكه',
                'لا يستطيع متابعة شؤونه المالية بنفسه',
                'يحتاج إلى رعاية مصالحه بسبب حالته',
                'توجد أموال تحتاج إلى من يديرها ويحافظ عليها',
                'توجد حقوق مالية تحتاج إلى من يتولى حفظها',
              ].map((f) => {
                const active = observedNeedFacts.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setObservedNeedFacts(prev =>
                        active ? prev.filter(x => x !== f) : [...prev, f]
                      );
                    }}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>☑️ {f}</span>
                    {active && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={customNeedFactsNotes}
              onChange={(e) => setCustomNeedFactsNotes(e.target.value)}
              placeholder="وقائع خاصة إضافية عاينها اللفيف تشهد بحاجته إلى التقديم..."
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-amber-600"
            />
          </div>

          {/* ⑤ قاعدة محرك الوقائع: لا يكفي أن يقول الشاهد «هو غير صالح» */}
          <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>⑤ ضابط توثيقي حاسم: «لا يكفي أن يقول الشاهد: هو غير صالح للتصرف»</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              يرجى بيان الوقائع التي بنى عليها اللفيف علمه بالحاجة إلى التقديم، بدل الاكتفاء بالنتيجة المجردة، لكي تبقى شهادة اللفيف شهادة بالوقائع المشهودة وليست حكماً قضائياً:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'تصرفات مالية ضارة وغير محسوبة',
                'عدم القدرة على إدارة الدخل أو المصروف',
                'عدم إدراك آثار التصرفات والمعاملات',
                'الحاجة المستمرة إلى شخص يتولى الشؤون المالية',
                'اعتماد المعني بالأمر على الغير في تدبير مصالحه',
              ].map((cf) => {
                const checked = concreteFactsWitnessed.includes(cf);
                return (
                  <button
                    key={cf}
                    type="button"
                    onClick={() => {
                      setConcreteFactsWitnessed(prev =>
                        checked ? prev.filter(x => x !== cf) : [...prev, cf]
                      );
                    }}
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                      checked
                        ? 'border-amber-600 bg-white text-amber-950 font-black shadow-2xs'
                        : 'border-amber-200/80 bg-amber-50/50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span>• {cf}</span>
                    {checked && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ⑥ أساس علم اللفيف ومدى المخالطة والاطلاع */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>⑥ أساس علم اللفيف بالمشهود في حقه:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مدة معرفة اللفيف بالمشهود في حقه (تقريباً بالسنوات)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={70}
                    value={knowledgeDurationYears}
                    onChange={(e) => setKnowledgeDurationYears(Number(e.target.value))}
                    className="w-24 p-2 bg-white border border-slate-200 rounded-xl font-bold font-mono focus:border-amber-600 text-center"
                  />
                  <span className="text-slate-600 font-bold">سنوات من المعرفة والمخالطة</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  نطاق الاطلاع الذي مكنته هذه المخالطة للشاهد:
                </label>
                <select
                  value={scopeOfInsight}
                  onChange={(e) => setScopeOfInsight(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-amber-600"
                >
                  <option value="الأحوال_المتعلقة_بأهليته_وأمواله">الأحوال المتعلقة بأهليته وتصرفاته وأمواله</option>
                  <option value="جل_أحواله">جل أحواله العامة والخاصة</option>
                  <option value="معاينة_وقائع_محددة">معاينة وقائع وتصرفات محددة بالذات</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2">
                كيفية معرفته به ومستند المخالطة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  'مخالطة مستمرة',
                  'قرابة',
                  'جوار',
                  'معاشرة',
                  'معاملات',
                  'معرفة بأحوال الأسرة',
                  'معرفة بأحواله المالية',
                  'متابعة أحواله عن قرب',
                ].map((item) => {
                  const active = cohabitationTypes.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setCohabitationTypes(prev =>
                          active ? prev.filter(x => x !== item) : [...prev, item]
                        );
                      }}
                      className={`p-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-black'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item}</span>
                      {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: المعني بالأمر
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الأموال والحقوق التي تحتاج رعاية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑫ و ⑬ المرحلة 3: الأموال والحقوق التي تحتاج إلى رعاية (Assets & Rights) */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑫ و ⑬ الأموال والحقوق التي سيحتاج المقدم إلى رعايتها وصيانتها
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                بيان بالسبب المالي الذي يجعل التقديم ضرورياً (وليس جرداً نهائياً للأموال)
              </p>
            </div>
          </div>

          {/* هل توجد أموال تحتاج إلى إدارة وحماية؟ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="font-black text-slate-900">
              هل توجد أموال أو حقوق مالية للمعني بالأمر تحتاج فعلياً إلى إدارة أو حماية أو حفظ؟
            </span>
            <div className="flex items-center gap-4 font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="needsCareRadio"
                  checked={needsCare === true}
                  onChange={() => setNeedsCare(true)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>نعم، توجد أموال</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="needsCareRadio"
                  checked={needsCare === false}
                  onChange={() => setNeedsCare(false)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>لا (رعاية شخصية فقط)</span>
              </label>
            </div>
          </div>

          {/* ⑫ أصناف الأموال */}
          {needsCare && (
            <div className="space-y-4 animate-in fade-in">
              <label className="block text-xs font-black text-slate-900">
                حدد أصناف الأموال والحقوق التي يشهد اللفيف بوجودها وحاجتها إلى من يتولاها:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {[
                  { key: 'عقارات', label: '🏠 عقارات ومبانٍ' },
                  { key: 'أموال_نقدية', label: '💵 أموال نقدية' },
                  { key: 'حسابات_بنكية', label: '🏦 حسابات بنكية' },
                  { key: 'معاش', label: '💳 معاش تقاعدي أو تعويض' },
                  { key: 'إرث', label: '📜 حصة إرثية أو تركة' },
                  { key: 'حصص_أو_أسهم', label: '📈 حصص أو أسهم شركات' },
                  { key: 'نشاط_تجاري', label: '🏪 أصل تجاري أو متجر' },
                  { key: 'منقولات', label: '🚗 منقولات أو آليات' },
                  { key: 'حقوق_مالية', label: '📑 حقوق ومستحقات مالية' },
                  { key: 'ديون_للمعني_بالأمر', label: '🤝 ديون ثابتة له في ذمة الغير' },
                  { key: 'أموال_أخرى', label: '📦 أموال أخرى' },
                ].map((item) => {
                  const active = assetCategories.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setAssetCategories(prev =>
                          active ? prev.filter(x => x !== item.key) : [...prev, item.key]
                        );
                      }}
                      className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* ⑬ إذا كانت هناك عقارات */}
              {assetCategories.includes('عقارات') && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span>⑬ بيانات العقار الذي يحتاج إلى تدبير أو كراء أو صيانة:</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                      ضابط: لا يحول هذا البيت إلى بيت بيع عقار المحجور
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع العقار</label>
                      <input
                        type="text"
                        value={realEstateInfo.propertyType}
                        onChange={(e) => setRealEstateInfo(prev => ({ ...prev, propertyType: e.target.value }))}
                        placeholder="دار سكنية، محل تجاري، أرض فلاحية..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">موقعه / عنوانه</label>
                      <input
                        type="text"
                        value={realEstateInfo.location}
                        onChange={(e) => setRealEstateInfo(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="المدينة والحي والزنقة"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الرسم العقاري إن وجد</label>
                      <input
                        type="text"
                        value={realEstateInfo.titleNumber}
                        onChange={(e) => setRealEstateInfo(prev => ({ ...prev, titleNumber: e.target.value }))}
                        placeholder="مثال: 12345/01 أو غير محفظ"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة التملك</label>
                      <input
                        type="text"
                        value={realEstateInfo.acquisitionMethod}
                        onChange={(e) => setRealEstateInfo(prev => ({ ...prev, acquisitionMethod: e.target.value }))}
                        placeholder="إرث، شراء، هبة..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-4 pt-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={realEstateInfo.isInherited}
                          onChange={(e) => setRealEstateInfo(prev => ({ ...prev, isInherited: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>عقار موروث ضمن تركة</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={realEstateInfo.needsManagementOrRent}
                          onChange={(e) => setRealEstateInfo(prev => ({ ...prev, needsManagementOrRent: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>يحتاج إلى إدارة وكراء وتحصيل غلاله</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <input
                type="text"
                value={assetsNotes}
                onChange={(e) => setAssetsNotes(e.target.value)}
                placeholder="ملاحظات توثيقية إضافية حول أموال وحقوق المعني بالأمر..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-600"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: وقائع الحاجة
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الشخص المقترح ومحرك الصلاحية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑦ إلى ⑪ المرحلة 4: الشخص المقترح للتقديم وأسس الصلاحية وتعارض المصالح */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑦ إلى ⑪ الشخص المقترح للتقديم ومحرك الصلاحية وتعارض المصالح
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تأكيد أن «الصلاحية» ليست عبارة عامة، بل تبنى على مبررات واقعية وأمانة وعدم وجود نزاع
              </p>
            </div>
          </div>

          {/* ⑪ تعدد الأشخاص المقترحين */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-black text-slate-900 block mb-0.5">
                ⑪ عدد الأشخاص الذين يرى اللفيف صلاحيتهم للتقديم:
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                (النظام لا يفضل أحداً، بل يعرض بيانات كل مرشح على المحكمة المختصة لاتخاذ ما تراه)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { mode: 'شخص_واحد', label: 'شخص واحد' },
                { mode: 'شخصان', label: 'شخصان' },
                { mode: 'عدة_أشخاص', label: 'عدة أشخاص' },
              ].map(m => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setCandidatesCountMode(m.mode as any)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    candidatesCountMode === m.mode
                      ? 'border-rose-600 bg-rose-50 text-rose-900 font-black'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* بطاقات الأشخاص المقترحين */}
          <div className="space-y-4">
            {candidates.map((cand, idx) => (
              <div
                key={cand.id || idx}
                className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <span className="font-black text-sm text-slate-900">
                      بيانات المرشح {idx + 1}: {cand.fullName || 'قيد الإدخال'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                      {cand.relationship}
                    </span>
                  </div>

                  {candidates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidate(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="حذف هذا المرشح"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* ⑦ هوية المرشح والصلة */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">صلة القرابة بالمعني *</label>
                    <select
                      value={cand.relationship}
                      onChange={(e) => handleUpdateCandidate(idx, 'relationship', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:border-rose-600"
                    >
                      <option value="الابن">الابن</option>
                      <option value="البنت">البنت</option>
                      <option value="الأب">الأب</option>
                      <option value="الأم">الأم</option>
                      <option value="الأخ">الأخ</option>
                      <option value="الأخت">الأخت</option>
                      <option value="الزوج">الزوج</option>
                      <option value="الزوجة">الزوجة</option>
                      <option value="أحد_الأقارب">أحد الأقارب</option>
                      <option value="شخص_آخر">شخص آخر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={cand.fullName}
                      onChange={(e) => handleUpdateCandidate(idx, 'fullName', e.target.value)}
                      placeholder="الاسم الشخصي والعائلي"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                    <input
                      type="text"
                      value={cand.cin}
                      onChange={(e) => handleUpdateCandidate(idx, 'cin', e.target.value.toUpperCase())}
                      placeholder="مثال: CD654321"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold focus:bg-white focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد / السن</label>
                    <input
                      type="date"
                      value={cand.birthDate}
                      onChange={(e) => handleUpdateCandidate(idx, 'birthDate', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة</label>
                    <input
                      type="text"
                      value={cand.profession}
                      onChange={(e) => handleUpdateCandidate(idx, 'profession', e.target.value)}
                      placeholder="المهنة أو الوظيفة"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الحالة العائلية</label>
                    <input
                      type="text"
                      value={cand.maritalStatus}
                      onChange={(e) => handleUpdateCandidate(idx, 'maritalStatus', e.target.value)}
                      placeholder="متزوج، عازب..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">محل السكنى</label>
                    <input
                      type="text"
                      value={cand.address}
                      onChange={(e) => handleUpdateCandidate(idx, 'address', e.target.value)}
                      placeholder="العنوان الكامل للمرشح للتقديم"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600"
                    />
                  </div>
                </div>

                {/* ⑧ محرك الصلاحية: على ماذا بنى اللفيف شهادته بصلاحيته؟ */}
                <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-3">
                  <label className="block text-xs font-black text-slate-900">
                    ⑧ على ماذا بنى اللفيف شهادته بصلاحية {cand.fullName || 'المرشح'}؟ (أركان الصلاحية):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {[
                      'حسن السيرة والمعاملة',
                      'معرفته الجيدة بالمشهود في حقه',
                      'صلته القريبة به',
                      'قيامه فعلياً برعايته',
                      'معرفته بأمواله',
                      'قدرته على تدبير شؤونه',
                      'أمانته في التعامل مع أمواله',
                      'قدرته على حفظ مصالحه',
                      'عدم وجود نزاع معروف بينهما',
                      'سبق قيامه برعايته أو إدارة بعض شؤونه',
                    ].map((base) => {
                      const sel = cand.suitabilityBases.includes(base);
                      return (
                        <button
                          key={base}
                          type="button"
                          onClick={() => {
                            const next = sel
                              ? cand.suitabilityBases.filter(b => b !== base)
                              : [...cand.suitabilityBases, base];
                            handleUpdateCandidate(idx, 'suitabilityBases', next);
                          }}
                          className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                            sel
                              ? 'border-rose-600 bg-white text-rose-950 font-black shadow-2xs'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <span>{base}</span>
                          {sel && <Check className="w-3.5 h-3.5 text-rose-600" />}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={cand.customSuitabilityNotes || ''}
                    onChange={(e) => handleUpdateCandidate(idx, 'customSuitabilityNotes', e.target.value)}
                    placeholder="بيان خاص إضافي عن صلاحية المرشح وحسن سيرته..."
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-rose-600"
                  />
                </div>

                {/* ⑨ هل يتولى شؤونه حالياً؟ */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      ⑨ هل الشخص المقترح يتولى شؤون المعني بالأمر حالياً؟
                    </span>
                    <div className="flex items-center gap-3 font-bold">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`isManaging-${idx}`}
                          checked={cand.isCurrentlyManaging === true}
                          onChange={() => handleUpdateCandidate(idx, 'isCurrentlyManaging', true)}
                          className="w-4 h-4 text-rose-600"
                        />
                        <span>نعم، فعلياً</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`isManaging-${idx}`}
                          checked={cand.isCurrentlyManaging === false}
                          onChange={() => handleUpdateCandidate(idx, 'isCurrentlyManaging', false)}
                          className="w-4 h-4 text-rose-600"
                        />
                        <span>لا، وإنما يرى اللفيف صلاحيته</span>
                      </label>
                    </div>
                  </div>

                  {cand.isCurrentlyManaging && (
                    <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        طبيعة قيامه الحالي بشؤونه:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          'رعاية شخصية',
                          'تدبير المصاريف',
                          'إدارة المال',
                          'متابعة العلاج',
                          'حفظ الوثائق',
                          'تدبير العقارات',
                          'الشؤون الإدارية',
                          'أخرى',
                        ].map((mType) => {
                          const active = cand.currentManagementTypes.includes(mType);
                          return (
                            <button
                              key={mType}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? cand.currentManagementTypes.filter(t => t !== mType)
                                  : [...cand.currentManagementTypes, mType];
                                handleUpdateCandidate(idx, 'currentManagementTypes', next);
                              }}
                              className={`p-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                                active
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{mType}</span>
                              {active && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ⑩ هل توجد مصلحة متعارضة؟ */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-950 font-black">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>⑩ فحص المصلحة المتعارضة:</span>
                  </div>
                  <span className="text-[11px] text-amber-900 block font-medium">
                    هل للشخص المقترح مصلحة مالية خاصة يمكن أن تتعارض مع مصلحة المعني بالأمر؟
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'لا_يعلم_اللفيف_بذلك', label: 'لا يعلم اللفيف بذلك' },
                      { key: 'توجد_مصلحة_معلومة_ومصرح_بها', label: 'مصلحة معلومة ومصرح بها (كشريك أو وارث)' },
                      { key: 'نعم', label: 'نعم، توجد مصلحة محتملة' },
                    ].map(st => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => handleUpdateCandidate(idx, 'conflictOfInterestStatus', st.key)}
                        className={`p-2.5 rounded-xl border text-right transition cursor-pointer text-xs font-bold ${
                          cand.conflictOfInterestStatus === st.key
                            ? 'border-amber-600 bg-white text-amber-950 font-black shadow-2xs'
                            : 'border-amber-200 bg-amber-50/50 text-slate-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {cand.conflictOfInterestStatus !== 'لا_يعلم_اللفيف_بذلك' && (
                    <div className="pt-2 animate-in fade-in space-y-1">
                      <input
                        type="text"
                        value={cand.conflictOfInterestNotes || ''}
                        onChange={(e) => handleUpdateCandidate(idx, 'conflictOfInterestNotes', e.target.value)}
                        placeholder="بيان طبيعة المصلحة لعرضها على المحكمة وحماية لسلامة الملف..."
                        className="w-full p-2 text-xs bg-white border border-amber-300 rounded-xl"
                      />
                      <span className="text-[10px] text-amber-800 block">
                        ⚠️ إدراج هذا البيان يضمن الشفافية أمام قاضي شؤون القاصرين ولا يعد مانعاً تلقائياً بل يترك تقديره للقضاء.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {candidatesCountMode !== 'شخص_واحد' && (
              <button
                type="button"
                onClick={handleAddCandidate}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مرشح آخر يرى اللفيف صلاحيته للتقديم</span>
              </button>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الأموال والحقوق
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى شهود اللفيف (12 شاهداً)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑰ و ⑱ المرحلة 5: شهود اللفيف (12 شاهداً) ومحرك نطاق العلم والتناقض */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑰ و ⑱ بيت اللفيف الشرعي (12 شاهداً) ومحرك نطاق العلم وفحص التناقض
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                استدعاء محرك الشهود الموحد، وتحديد ما يعلمه كل شاهد بدقة صوناً لمصداقية الشهادة أمام القضاء
              </p>
            </div>
          </div>

          {/* محرك كشف التناقضات ⑱ */}
          {inconsistencyIssues.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>⑱ كاشف التناقضات والتناسق التوثيقي:</span>
              </span>
              <div className="space-y-2">
                {inconsistencyIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                      issue.level === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                        : issue.level === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                        : 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {issue.level === 'error' ? (
                        <Ban className="w-4 h-4 text-rose-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>{issue.message}</span>
                    </div>
                    <div className="text-[11px] opacity-80 pr-5">{issue.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* إدماج محرك الشهود الموحد Step5_Witnesses */}
          <div className="p-4 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>محرك الشهود اللفيفي (نصاب الـ 12 شاهداً والتحري في الأهلية والقرابة)</span>
              </span>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-emerald-800">
                الشهود المسجلون: {(state.witnesses || []).length} / 12
              </span>
            </div>

            {/* تضمين Step5_Witnesses الموحد بنفس خصائص رسم استمرار الزواج وموجب خلل عقلي */}
            <Step5_Witnesses
              state={{
                ...state,
                documentType: 'موجب_التقديم_والصلاحية',
              }}
              setState={setState}
              onNext={() => setActiveStage(6)}
              onBack={() => setActiveStage(4)}
            />
          </div>

          {/* 🎯 بطاقات نطاق العلم لكل شاهد (Knowledge Scope) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>🎯 تفصيل «نطاق علم» كل شاهد (النظام لا يجبر الشاهد على ما لا يعلمه):</span>
              </label>
              <span className="text-[10px] text-slate-500 font-bold">
                (قد يعلم الشاهد الحالة والصلاحية، أو الصلاحية فقط، أو التدبير الفعلي)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {((state.witnesses || []).length > 0 ? state.witnesses : Array.from({ length: 12 }, (_, i) => ({ id: `${i+1}`, name: `الشاهد ${i+1}` }))).map((w, idx) => {
                const scope = witnessKnowledgeScopes[idx] || {
                  witnessIndex: idx + 1,
                  knowsSubjectState: true,
                  knowsNeedForGuardianship: true,
                  knowsFinancialState: true,
                  knowsProposedCandidate: true,
                  knowsCandidateSuitability: true,
                  knowsActualCareByCandidate: true,
                };

                return (
                  <div
                    key={w.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{w.name || `الشاهد ${idx + 1}`}</span>
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        نطاق العلم محدد
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { key: 'knowsSubjectState', label: 'يعلم حالة المعني بالأمر' },
                        { key: 'knowsNeedForGuardianship', label: 'يعلم حاجته للتقديم' },
                        { key: 'knowsFinancialState', label: 'يعلم أحوال أمواله' },
                        { key: 'knowsProposedCandidate', label: 'يعلم الشخص المقترح' },
                        { key: 'knowsCandidateSuitability', label: 'يشهد بصلاحية المقترح' },
                        { key: 'knowsActualCareByCandidate', label: 'يعلم قيامه برعايته فعلياً' },
                      ].map((item) => {
                        const checked = (scope as any)[item.key] ?? true;
                        return (
                          <label key={item.key} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const nextVal = e.target.checked;
                                setWitnessKnowledgeScopes(prev => {
                                  const updated = [...prev];
                                  if (!updated[idx]) {
                                    updated[idx] = {
                                      witnessIndex: idx + 1,
                                      knowsSubjectState: true,
                                      knowsNeedForGuardianship: true,
                                      knowsFinancialState: true,
                                      knowsProposedCandidate: true,
                                      knowsCandidateSuitability: true,
                                      knowsActualCareByCandidate: true,
                                      cohabitationTypes: ['مخالطة مستمرة'],
                                    };
                                  }
                                  updated[idx] = { ...updated[idx], [item.key]: nextVal };
                                  return updated;
                                });
                              }}
                              className="w-3.5 h-3.5 text-indigo-600 rounded"
                            />
                            <span className="text-slate-700 font-medium">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الشخص المقترح
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الوثائق وقضاء الأسرة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑲ و ㉒ المرحلة 6: الوثائق والمستندات وقسم قضاء الأسرة (قانون 58.25) */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑲ و ㉒ الوثائق المرفقة والعلاقة بالنيابة الشرعية وقسم قضاء الأسرة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تطبيق مقتضيات المادتين 261 و262 من قانون المسطرة المدنية رقم 58.25 وربط الملف بالقضاء المختص
              </p>
            </div>
          </div>

          {/* ⑲ قائمة الوثائق الأساسية والمفيدة */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ⑲ الوثائق والمستندات الأساسية المعززة لموجب التقديم:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'subjectCinAttached', label: '☑️ بطاقة التعريف الوطنية للمشهود في حقه' },
                { key: 'candidateCinAttached', label: '☑️ بطاقة التعريف الوطنية للشخص المقترح للتقديم' },
                { key: 'kinshipProofAttached', label: '☑️ وثيقة إثبات القرابة (عقد ازدياد، كناش الحالة المدنية)' },
                { key: 'interdictionRulingAttached', label: '☑️ نسخة من الحكم بالحجر القضائي (إن وجد)' },
                { key: 'medicalCertificateAttached', label: '☑️ الشهادة الطبية أو تقرير الخبرة المرتبط بالحالة' },
                { key: 'assetsProofAttached', label: '☑️ الوثائق وسندات الملكية المتعلقة بالأموال' },
                { key: 'bankOrPensionDocAttached', label: '☑️ شهادة الحساب البنكي أو بيان المعاش التقاعدي' },
              ].map((doc) => {
                const isChecked = (docsChecklist as any)[doc.key];
                return (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => {
                      setDocsChecklist(prev => ({
                        ...prev,
                        [doc.key]: !isChecked,
                      }));
                    }}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{doc.label}</span>
                    {isChecked && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ㉒ الربط القضائي بقسم قضاء الأسرة (قانون 58.25) */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-4">
            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
              <Link2 className="w-4 h-4 text-indigo-700" />
              <span>㉒ مراجع قسم قضاء الأسرة وملف النيابة القانونية (قانون 58.25 المادتان 261 و262):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة المختصة (قسم قضاء الأسرة)</label>
                <input
                  type="text"
                  value={futureLinkages.familyCourtName}
                  onChange={(e) => setFutureLinkages(prev => ({ ...prev, familyCourtName: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم ملف النيابة الشرعية إن فُتح</label>
                <input
                  type="text"
                  value={futureLinkages.guardianshipFileNumber}
                  onChange={(e) => setFutureLinkages(prev => ({ ...prev, guardianshipFileNumber: e.target.value }))}
                  placeholder="مثال: 2026/1601/..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">البيان الموجه إلى السيد القاضي المكلف بشؤون القاصرين</label>
                <textarea
                  rows={2}
                  value={futureLinkages.judgeNotes}
                  onChange={(e) => setFutureLinkages(prev => ({ ...prev, judgeNotes: e.target.value }))}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed font-bold">
              ⚖️ <strong>ضابط المسطرة:</strong> مدونة الأسرة تجعل المقدم هو الذي يعينه القضاء؛ لذلك يربط النظام هذا الموجب بملف النيابة القضائية دون إنشاء «تقديم تلقائي» بمجرد توقيع الموجب.
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: شهود اللفيف
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الصياغة العدلية والمراجعة النهائية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑳ و ㉑ المرحلة 7: الصياغة العدلية رباعية الطبقات والمراجعة النهائية */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑳ و ㉑ الصياغة العدلية الذكية رباعية الطبقات ولوحة المراجعة القانونية
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                بناء محرر شرعي وقانوني متناسق للإدلاء به أمام القضاء المختص دون خلط بين المقترح والمقدم المعين
              </p>
            </div>
          </div>

          {/* ㉑ لوحة المراجعة القانونية (Smart Checklist) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>㉑ لوحة التحقق التوثيقي قبل اعتماد وتصدير الرسم:</span>
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                checklist.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {checklist.allPassed ? '🟢 مستوفٍ لكافة الشروط' : '🟠 تنقص بعض المتطلبات'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasSubjectName && checklist.hasSubjectCin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية المعني بالأمر</span>
                {checklist.hasSubjectName && checklist.hasSubjectCin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasNeedReason ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>سبب الحاجة للتقديم</span>
                {checklist.hasNeedReason ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasFacts ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>وقائع الشهادة العينية</span>
                {checklist.hasFacts ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasCandidateName && checklist.hasCandidateCin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية المقترح والصلاحية</span>
                {checklist.hasCandidateName && checklist.hasCandidateCin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between sm:col-span-2 lg:col-span-4 ${
                checklist.hasTwelveWitnesses ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}>
                <span>نصاب شهادة اللفيف الشرعية: {(state.witnesses || []).length} من 12 شاهداً</span>
                {checklist.hasTwelveWitnesses ? (
                  <span className="text-[11px] font-black text-emerald-700">🟢 نصاب الـ 12 شاهداً مكتمل</span>
                ) : (
                  <span className="text-[11px] font-black text-amber-700">🟠 يتطلب استكمال 12 شاهداً في المرحلة 5</span>
                )}
              </div>
            </div>
          </div>

          {/* محرك الصياغة العدلية رباعي الطبقات */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>نص الرسم المولد آلياً (الصياغة العدلية المتقنة رباعية الطبقات):</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDeed}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedSuccess ? 'تم النسخ بنجاح!' : 'نسخ نص الرسم'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>طباعة الرسم</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={18}
                value={generatedRasmText}
                className="w-full p-4 rounded-2xl bg-amber-50/20 border border-amber-200 text-slate-800 font-amiri text-base leading-relaxed resize-y focus:outline-hidden"
              />
            </div>

            {/* الحدود القطعية */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <span className="font-black text-slate-900 block">
                🛡️ الضمانات القانونية المسجلة في صياغة هذا البيت:
              </span>
              <ul className="list-disc pr-5 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>لا يستعمل الرسم أي عبارة تفيد أن الشخص المقترح قد أصبح مقدماً شرعياً بالفعل.</li>
                <li>يؤكد الرسم اختصاص المحكمة الابتدائية (قسم قضاء الأسرة) في البت في النيابة الشرعية طبقاً للقانون 58.25 ومدونة الأسرة.</li>
                <li>يفرز الرسم شهادة اللفيف في طبقات أربع متمايزة: المعرفة، الوقائع العينية، حاجة التقديم، وأسس الصلاحية.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الوثائق والنيابة
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDeed}
                className="px-5 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 text-xs font-bold transition cursor-pointer"
              >
                {copiedSuccess ? 'تم النسخ بنجاح' : 'نسخ نص المحرر'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>طباعة المعاينة</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToStep7}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-red-900/40 border border-red-400/40 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <Send className="w-4 h-4 text-white" />
                <span>المتابعة إلى مرحلة المراجعة والإرسال للقاضي (المرحلة 7)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
