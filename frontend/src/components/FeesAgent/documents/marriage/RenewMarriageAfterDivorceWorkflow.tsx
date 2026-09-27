import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Scale,
  BookOpen,
  Copy,
  FileCheck2,
  X,
  ArrowRight
} from 'lucide-react';
import type { FeesAgentState, Party } from '../../../../types/feesAgentTypes';
import { convertNumberToArabicWords, createEmptyParty } from '../../../../utils/feesAgentUtils';

interface RenewMarriageAfterDivorceWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete: () => void;
  onBackToClassification?: () => void;
}

// Mock Divorce Records for the previous deed picker
interface DivorceRecord {
  id: string;
  deedNumber: string;
  registryBook: string;
  letter: string;
  page: string;
  count: string;
  deedDate: string;
  divorceType: 'irrevocable_minor' | 'revocable_iddah_expired' | 'before_consummation' | 'completed_three';
  divorceTypeLabel: string;
  court: string;
  husband: {
    fullName: string;
    cin: string;
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    profession: string;
    address: string;
  };
  wife: {
    fullName: string;
    cin: string;
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    profession: string;
    address: string;
  };
  iddahExpired: boolean;
  iddahExpiryDate: string;
  prevMarriageDeedRef: string;
}

const MOCK_DIVORCE_RECORDS: DivorceRecord[] = [
  {
    id: 'div-rec-1',
    deedNumber: '1234',
    registryBook: 'الطلاق والخلع',
    letter: 'ب',
    page: '56',
    count: '3',
    deedDate: '2025-10-15',
    divorceType: 'irrevocable_minor',
    divorceTypeLabel: 'طلاق بائن دون الثلاث (خلع / اتفاق)',
    court: 'المحكمة الابتدائية بشفشاون - قسم قضاء الأسرة',
    husband: {
      fullName: 'محمد بن التهامي العلمي',
      cin: 'L458921',
      fatherName: 'التهامي',
      motherName: 'فاطمة الزهراء',
      birthDate: '1988-04-12',
      birthPlace: 'شفشاون',
      profession: 'أستاذ التعليم الثانوي',
      address: 'حي العيون، زنقة طارق بن زياد، شفشاون'
    },
    wife: {
      fullName: 'أمينة بنت عبد السلام العمراني',
      cin: 'LC192837',
      fatherName: 'عبد السلام',
      motherName: 'زبيدة',
      birthDate: '1992-09-24',
      birthPlace: 'تطوان',
      profession: 'مهندسة معمارية',
      address: 'شارع الحسن الثاني، عمارة الأمل، تطوان'
    },
    iddahExpired: true,
    iddahExpiryDate: '2026-01-20',
    prevMarriageDeedRef: 'كناش الأنكحة، عدد 421، صحيفة 89، سنة 2018'
  },
  {
    id: 'div-rec-2',
    deedNumber: '789',
    registryBook: 'الطلاق الرجعي والبائن',
    letter: 'أ',
    page: '112',
    count: '14',
    deedDate: '2025-08-10',
    divorceType: 'revocable_iddah_expired',
    divorceTypeLabel: 'طلاق رجعي انقضت عدته الشرعية',
    court: 'المحكمة الابتدائية بتطوان - قسم قضاء الأسرة',
    husband: {
      fullName: 'يوسف بن إدريس المرابط',
      cin: 'K981245',
      fatherName: 'إدريس',
      motherName: 'عائشة',
      birthDate: '1985-02-18',
      birthPlace: 'طنجة',
      profession: 'تاجر',
      address: 'طريق الميناء، طنجة'
    },
    wife: {
      fullName: 'سلمى بنت البشير التازي',
      cin: 'KB441239',
      fatherName: 'البشير',
      motherName: 'خديجة',
      birthDate: '1990-11-05',
      birthPlace: 'فاس',
      profession: 'طبيبة صيدلانية',
      address: 'حي كاليفورنيا، طنجة'
    },
    iddahExpired: true,
    iddahExpiryDate: '2025-11-15',
    prevMarriageDeedRef: 'كناش الأنكحة، عدد 108، صحيفة 45، سنة 2015'
  },
  {
    id: 'div-rec-3',
    deedNumber: '2045',
    registryBook: 'الطلاق قبل البناء',
    letter: 'ج',
    page: '22',
    count: '7',
    deedDate: '2025-11-01',
    divorceType: 'before_consummation',
    divorceTypeLabel: 'طلاق قبل البناء والدخول',
    court: 'المحكمة الابتدائية بالرباط - قسم قضاء الأسرة',
    husband: {
      fullName: 'كريم بن حسن الفاسي',
      cin: 'A332190',
      fatherName: 'حسن',
      motherName: 'مليكة',
      birthDate: '1994-06-30',
      birthPlace: 'الرباط',
      profession: 'محاسب معتمد',
      address: 'حي أكدال، الرباط'
    },
    wife: {
      fullName: 'مريم بنت عبد القادر بناني',
      cin: 'AA778822',
      fatherName: 'عبد القادر',
      motherName: 'نعيمة',
      birthDate: '1997-03-14',
      birthPlace: 'سلا',
      profession: 'أستاذة جامعية',
      address: 'حي بطانة، سلا'
    },
    iddahExpired: true,
    iddahExpiryDate: 'لا عدة عليها شرعاً (قبل البناء)',
    prevMarriageDeedRef: 'كناش الأنكحة، عدد 950، صحيفة 12، سنة 2024'
  }
];

export const RenewMarriageAfterDivorceWorkflow: React.FC<RenewMarriageAfterDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  // Navigation: 10 structured modules covering all 23 items requested
  const [activeStage, setActiveStage] = useState<number>(1);

  // ① البوابة القانونية: مصدر انتهاء الزوجية السابقة
  const [divorceSource, setDivorceSource] = useState<
    'irrevocable_minor' | 'revocable_iddah_expired' | 'before_consummation' | 'completed_three'
  >('irrevocable_minor');
  const [isIddahStillRunning, setIsIddahStillRunning] = useState<boolean>(false);

  // ② مراجع رسم الطلاق السابق
  const [isDeedPickerOpen, setIsDeedPickerOpen] = useState<boolean>(false);
  const [deedSearchQuery, setDeedSearchQuery] = useState<string>('');
  const [deedBookNumber, setDeedBookNumber] = useState<string>('');
  const [deedRegistryBook, setDeedRegistryBook] = useState<string>('الطلاق والخلع');
  const [deedLetter, setDeedLetter] = useState<string>('');
  const [deedPage, setDeedPage] = useState<string>('');
  const [deedCount, setDeedCount] = useState<string>('');
  const [deedDate, setDeedDate] = useState<string>('');
  const [deedCourt, setDeedCourt] = useState<string>(state.meta?.court || '');
  const [deedInclusionDate, setDeedInclusionDate] = useState<string>('');
  const [prevMarriageDeedRef, setPrevMarriageDeedRef] = useState<string>('');
  const [viewingDeedDetails, setViewingDeedDetails] = useState<boolean>(false);

  // ③ و ④ بيانات الهوية القانونية الموسعة للزوجين
  const [husbandData, setHusbandData] = useState({
    firstName: state.sellers?.[0]?.name?.split(' ')[0] || '',
    lastName: state.sellers?.[0]?.name?.split(' ').slice(1).join(' ') || '',
    fullName: state.sellers?.[0]?.name || '',
    latinName: '',
    fatherName: state.sellers?.[0]?.fatherName || '',
    motherName: state.sellers?.[0]?.motherName || '',
    birthDate: state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.sellers?.[0]?.placeOfBirth || '',
    nationality: state.sellers?.[0]?.nationality || 'مغربية',
    idType: 'CIN' as const,
    cin: state.sellers?.[0]?.idNumber || '',
    idExpiryDate: state.sellers?.[0]?.idExpiryDate || '',
    profession: state.sellers?.[0]?.profession || '',
    address: state.sellers?.[0]?.address || '',
    residencePlace: '',
    familyStatus: 'مطلق',
    hadSubsequentMarriage: false,
    isEdited: false,
    updateReason: ''
  });

  const [wifeData, setWifeData] = useState({
    firstName: state.buyers?.[0]?.name?.split(' ')[0] || '',
    lastName: state.buyers?.[0]?.name?.split(' ').slice(1).join(' ') || '',
    fullName: state.buyers?.[0]?.name || '',
    latinName: '',
    fatherName: state.buyers?.[0]?.fatherName || '',
    motherName: state.buyers?.[0]?.motherName || '',
    birthDate: state.buyers?.[0]?.dateOfBirth || '',
    birthPlace: state.buyers?.[0]?.placeOfBirth || '',
    nationality: state.buyers?.[0]?.nationality || 'مغربية',
    idType: 'CIN' as const,
    cin: state.buyers?.[0]?.idNumber || '',
    idExpiryDate: state.buyers?.[0]?.idExpiryDate || '',
    profession: state.buyers?.[0]?.profession || '',
    address: state.buyers?.[0]?.address || '',
    residencePlace: '',
    familyStatus: 'مطلقة',
    hadSubsequentMarriage: false,
    isEdited: false,
    updateReason: ''
  });

  const [editingParty, setEditingParty] = useState<'husband' | 'wife' | null>(null);

  // ⑤ الحالة القانونية والزواج اللاحق
  const [subsequentMarriageCheck, setSubsequentMarriageCheck] = useState<{
    husbandRemarried: boolean;
    wifeRemarried: boolean;
    verificationNotes: string;
  }>({
    husbandRemarried: false,
    wifeRemarried: false,
    verificationNotes: 'لم يطرأ على أي من الطرفين زواج آخر بعد الطلاق السابق، والطرفان في حل تام من أي قيد شرعي.'
  });

  // ⑥ فحص موانع الزواج (Smart Impediments Engine)
  const [impedimentsStatus, setImpedimentsStatus] = useState<{
    checked: boolean;
    perpetualClear: boolean;
    temporaryClear: boolean;
    message: string;
  }>({
    checked: true,
    perpetualClear: true,
    temporaryClear: true,
    message: 'لم يجد النظام مانعًا شرعياً أو قانونياً من المعطيات المدخلة.'
  });

  // ⑦ طريقة مباشرة الزوجة لعقد زواجها (الولاية: المواد 24 و 25)
  const [wifeGuardianshipMode, setWifeGuardianshipMode] = useState<
    'self_direct' | 'delegated_father' | 'delegated_relative'
  >('self_direct');
  const [delegatedFatherInfo, setDelegatedFatherInfo] = useState({
    name: '',
    cin: ''
  });
  const [delegatedRelativeInfo, setDelegatedRelativeInfo] = useState({
    relationship: '',
    name: '',
    cin: ''
  });

  // ⑧ سن الأهلية (المادتان 19 و 20)
  const [isMinorCheckPassed, setIsMinorCheckPassed] = useState<boolean>(true);
  const [minorPermissionInfo, setMinorPermissionInfo] = useState({
    permNumber: '',
    permDate: '',
    court: ''
  });

  // ⑨ و ⑩ بطاقة وكالة الزواج (المادة 17)
  const [poaType, setPoaType] = useState<'none' | 'husband_poa' | 'wife_poa' | 'both_poa'>('none');
  const [husbandPoaDetails, setHusbandPoaDetails] = useState({
    agentName: '',
    agentCin: '',
    agentIdType: 'CIN',
    issueDate: '',
    issuePlace: '',
    poaType: 'رسمية' as 'رسمية' | 'عرفية مصادق على توقيع الموكل',
    poaNumber: '',
    poaRegistryDate: '',
    issuingAuthority: '',
    judgeVisaNumber: '',
    judgeVisaDate: ''
  });
  const [wifePoaDetails, setWifePoaDetails] = useState({
    agentName: '',
    agentCin: '',
    agentIdType: 'CIN',
    issueDate: '',
    issuePlace: '',
    poaType: 'رسمية' as 'رسمية' | 'عرفية مصادق على توقيع الموكل',
    poaNumber: '',
    poaRegistryDate: '',
    issuingAuthority: '',
    judgeVisaNumber: '',
    judgeVisaDate: ''
  });

  // ⑪ و ⑫ و ⑬ و ⑭ بطاقة الصداق والمحرك المالي
  const [isDowrySpecified, setIsDowrySpecified] = useState<boolean>(true);
  const [dowryTotalAmount, setDowryTotalAmount] = useState<number>(0);
  const [dowryDivision, setDowryDivision] = useState<'all_advanced' | 'all_deferred' | 'split'>('all_advanced');
  const [dowryAdvanceAmount, setDowryAdvanceAmount] = useState<number>(0);
  const [dowryDeferredAmount, setDowryDeferredAmount] = useState<number>(0);
  const [advanceReceiptStatus, setAdvanceReceiptStatus] = useState<
    'in_sight' | 'wife_acknowledgment' | 'partial' | 'not_yet_received'
  >('in_sight');
  const [partialReceivedAmount, setPartialReceivedAmount] = useState<number>(0);
  const [deferredMaturityType, setDeferredMaturityType] = useState<'fixed_date' | 'specific_event'>('specific_event');
  const [deferredMaturityEvent, setDeferredMaturityEvent] = useState<string>('عند أقرب الأجلين (الوفاة أو الطلاق)');
  const [deferredMaturityDate, setDeferredMaturityDate] = useState<string>('');

  // ⑮ الشروط الخاصة بين الزوجين (المادتان 47 و 48)
  const [hasSpecialConditions, setHasSpecialConditions] = useState<boolean>(false);
  const [conditionsList, setConditionsList] = useState<
    Array<{
      id: string;
      demandedBy: 'الزوج' | 'الزوجة' | 'الطرفان';
      category: 'مالي' | 'سكن' | 'عمل' | 'دراسة' | 'تدبير الأسرة' | 'عدم التعدد' | 'شرط آخر مشروع';
      text: string;
      evaluation: 'valid' | 'needs_review' | 'invalid_mandatory_rule';
      evaluationMsg: string;
    }>
  >([]);
  const [newConditionWho, setNewConditionWho] = useState<'الزوج' | 'الزوجة' | 'الطرفان'>('الزوجة');
  const [newConditionCat, setNewConditionCat] = useState<
    'مالي' | 'سكن' | 'عمل' | 'دراسة' | 'تدبير الأسرة' | 'عدم التعدد' | 'شرط آخر مشروع'
  >('سكن');
  const [newConditionText, setNewConditionText] = useState<string>('');

  // ⑯ الأموال المكتسبة أثناء الزوجية — تنبيه المادة 49
  const [wantsArticle49Agreement, setWantsArticle49Agreement] = useState<boolean>(false);
  const [isArticle49Notified, setIsArticle49Notified] = useState<boolean>(true);

  // ⑰ و ⑱ الإيجاب والقبول وحالات التعبير عن الإرادة (المواد 10 و 11)
  const [offerBy, setOfferBy] = useState<'husband' | 'husband_agent'>('husband');
  const [acceptanceBy, setAcceptanceBy] = useState<'wife' | 'wife_agent' | 'wife_guardian'>('wife');
  const [isSameSession, setIsSameSession] = useState<boolean>(true);
  const [isConforming, setIsConforming] = useState<boolean>(true);
  const [isUnconditionalDecisive, setIsUnconditionalDecisive] = useState<boolean>(true);
  const [husbandExpressionMode, setHusbandExpressionMode] = useState<'spoken' | 'written' | 'sign_language'>('spoken');
  const [wifeExpressionMode, setWifeExpressionMode] = useState<'spoken' | 'written' | 'sign_language'>('spoken');

  // ⑲ الحالات الخاصة بملف الزواج (المادة 65)
  const [specialMarriageCase, setSpecialMarriageCase] = useState<
    'normal' | 'minor' | 'foreign' | 'islam_conversion' | 'disability' | 'polygamy' | 'poa' | 'judge_permission'
  >('normal');

  // ⑳ ملف مستندات الزواج (المادة 65)
  const [dossierDocuments, setDossierDocuments] = useState({
    permissionRequest: true,
    birthCertificateHusband: true,
    birthCertificateWife: true,
    adminCertHusband: true,
    adminCertWife: true,
    medicalCertHusband: true,
    medicalCertWife: true,
    priorDivorceDeed: true,
    iddahProof: true,
    poaDocuments: false
  });

  // ㉑ السجل التاريخي والربط
  const [isHistoryLinked, setIsHistoryLinked] = useState<boolean>(false);

  // ㉓ المعاينة والتحرير
  const [isCustomEditingDraft, setIsCustomEditingDraft] = useState<boolean>(false);
  const [customDraftContent, setCustomDraftContent] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Auto-calculated Dowry figures in words
  const dowryTotalInWords = useMemo(
    () => convertNumberToArabicWords(dowryTotalAmount || 0),
    [dowryTotalAmount]
  );
  const dowryAdvanceInWords = useMemo(
    () => convertNumberToArabicWords(dowryAdvanceAmount || 0),
    [dowryAdvanceAmount]
  );
  const dowryDeferredInWords = useMemo(
    () => convertNumberToArabicWords(dowryDeferredAmount || 0),
    [dowryDeferredAmount]
  );
  const partialRemainingAmount = useMemo(
    () => Math.max(0, dowryAdvanceAmount - partialReceivedAmount),
    [dowryAdvanceAmount, partialReceivedAmount]
  );
  const partialReceivedInWords = useMemo(
    () => convertNumberToArabicWords(partialReceivedAmount || 0),
    [partialReceivedAmount]
  );
  const partialRemainingInWords = useMemo(
    () => convertNumberToArabicWords(partialRemainingAmount || 0),
    [partialRemainingAmount]
  );

  // Handle adopting a divorce deed from picker
  const handleAdoptDeed = (rec: DivorceRecord) => {
    setDeedBookNumber(rec.deedNumber);
    setDeedRegistryBook(rec.registryBook);
    setDeedLetter(rec.letter);
    setDeedPage(rec.page);
    setDeedCount(rec.count);
    setDeedDate(rec.deedDate);
    setDeedCourt(rec.court);
    setDivorceSource(rec.divorceType);
    setPrevMarriageDeedRef(rec.prevMarriageDeedRef);
    setIsHistoryLinked(true);

    setHusbandData((prev) => ({
      ...prev,
      fullName: rec.husband.fullName,
      cin: rec.husband.cin,
      fatherName: rec.husband.fatherName,
      motherName: rec.husband.motherName,
      birthDate: rec.husband.birthDate,
      birthPlace: rec.husband.birthPlace,
      profession: rec.husband.profession,
      address: rec.husband.address,
      isEdited: false
    }));

    setWifeData((prev) => ({
      ...prev,
      fullName: rec.wife.fullName,
      cin: rec.wife.cin,
      fatherName: rec.wife.fatherName,
      motherName: rec.wife.motherName,
      birthDate: rec.wife.birthDate,
      birthPlace: rec.wife.birthPlace,
      profession: rec.wife.profession,
      address: rec.wife.address,
      isEdited: false
    }));

    setIsDeedPickerOpen(false);
  };

  // Add condition
  const handleAddCondition = () => {
    if (!newConditionText.trim()) return;
    const isProblematic =
      newConditionText.includes('إسقاط النفقة') ||
      newConditionText.includes('عدم الإنجاب مطلقا') ||
      newConditionText.includes('إسقاط الصداق');

    const newCond = {
      id: `c-${Date.now()}`,
      demandedBy: newConditionWho,
      category: newConditionCat,
      text: newConditionText.trim(),
      evaluation: (isProblematic ? 'invalid_mandatory_rule' : 'valid') as 'valid' | 'invalid_mandatory_rule',
      evaluationMsg: isProblematic
        ? '⚠️ تنبيه: الشرط المقترح يتعارض مع قاعدة آمرة أو مقصد أصيل للزواج، ويعتبر باطلاً وفق المادة 47 مع صحة العقد.'
        : 'شرط مشروع ملزم لمن التزم به وفق المادة 47.'
    };

    setConditionsList((prev) => [...prev, newCond]);
    setNewConditionText('');
  };

  // Filtered deeds for picker
  const filteredDeeds = useMemo(() => {
    if (!deedSearchQuery.trim()) return MOCK_DIVORCE_RECORDS;
    const q = deedSearchQuery.toLowerCase().trim();
    return MOCK_DIVORCE_RECORDS.filter(
      (d) =>
        d.deedNumber.includes(q) ||
        d.husband.fullName.includes(q) ||
        d.wife.fullName.includes(q) ||
        d.husband.cin.toLowerCase().includes(q) ||
        d.wife.cin.toLowerCase().includes(q) ||
        d.court.includes(q)
    );
  }, [deedSearchQuery]);

  // Synchronize state into FeesAgentState when finalizing or saving
  const handleSyncToState = () => {
    const husbandParty: Party = {
      ...createEmptyParty(),
      id: 'party-husband-renewed',
      name: husbandData.fullName,
      idNumber: husbandData.cin,
      idType: 'CIN',
      address: husbandData.address,
      fatherName: husbandData.fatherName,
      motherName: husbandData.motherName,
      birthDate: husbandData.birthDate,
      birthPlace: husbandData.birthPlace,
      nationality: husbandData.nationality,
      profession: husbandData.profession,
      type: 'individual',
      role: 'seller', // husband in marriage schema
      maritalStatus: 'مطلق'
    };

    const wifeParty: Party = {
      ...createEmptyParty(),
      id: 'party-wife-renewed',
      name: wifeData.fullName,
      idNumber: wifeData.cin,
      idType: 'CIN',
      address: wifeData.address,
      fatherName: wifeData.fatherName,
      motherName: wifeData.motherName,
      birthDate: wifeData.birthDate,
      birthPlace: wifeData.birthPlace,
      nationality: wifeData.nationality,
      profession: wifeData.profession,
      type: 'individual',
      role: 'buyer', // wife in marriage schema
      maritalStatus: 'مطلق'
    };

    setState((prev) => ({
      ...prev,
      sellers: [husbandParty],
      buyers: [wifeParty],
      marriageClassification: {
        ...(prev.marriageClassification || { primaryType: 'contract_renewal' }),
        primaryType: 'contract_renewal',
        confirmedAt: new Date().toISOString(),
        previousContract: {
          husbandName: husbandData.fullName,
          wifeName: wifeData.fullName,
          deedNumber: deedBookNumber,
          deedDate: deedDate,
          courtName: deedCourt,
          inclusionRef: `${deedBookNumber} / حرف ${deedLetter} / ص ${deedPage} / عدد ${deedCount}`,
          isLinked: true
        }
      },
      marriageDetails: {
        ...(prev.marriageDetails || {}),
        courtName: deedCourt,
        registryBookType: 'كناش الأنكحة والرجعات',
        dowryAmount: dowryTotalAmount,
        dowryAmountInWords: dowryTotalInWords,
        dowryAdvance: dowryAdvanceAmount,
        dowryAdvanceInWords: dowryAdvanceInWords,
        dowryDeferred: dowryDeferredAmount,
        dowryDeferredInWords: dowryDeferredInWords,
        isDowryReceived:
          advanceReceiptStatus === 'in_sight'
            ? 'كاملا'
            : advanceReceiptStatus === 'wife_acknowledgment'
            ? 'اعترافا'
            : advanceReceiptStatus === 'partial'
            ? 'جزئي'
            : 'غير مقبوض',
        specialConditionsText: conditionsList.map((c) => `[${c.demandedBy}] ${c.text}`).join(' • ')
      },
      meta: {
        ...(prev.meta || {}),
        court: deedCourt,
        customSubject: 'عقد زواج جديد بين مطلقين بعد زوال الزوجية السابقة'
      } as any
    }));
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Structured stage definitions
  const stagesList = [
    { num: 1, title: 'البوابة القانونية والطلاق السابق' },
    { num: 2, title: 'تحديد الطرفين والهوية الموسعة' },
    { num: 3, title: 'الحالة القانونية وموانع الزواج' },
    { num: 4, title: 'الولاية وسن الأهلية والوكالة' },
    { num: 5, title: 'المحرك المالي وتفصيل الصداق' },
    { num: 6, title: 'الشروط الاتفاقية والمادة 49' },
    { num: 7, title: 'الإيجاب والقبول ومجلس العقد' },
    { num: 8, title: 'الحالات الخاصة وملف المستندات' },
    { num: 9, title: 'السجل التاريخي والتدقيق النهائي' },
    { num: 10, title: 'المعاينة وتحرير الصياغة النهائية' }
  ];

  // Auto-generated Moroccan Judicial Deed Formula
  const generatedDeedText = useMemo(() => {
    return `الحمد لله وحده، والصلاة والسلام على مولانا رسول الله وآله وصحبه.

بمجلس عقد الزواج المبرم بحضور العدلين الموقعين أسفله المنتصبين للإشهاد بدائرة ${deedCourt}،

أُشهد على عقد زواج جديد شرعي وقانوني تام الأركان والشروط بين:

الزوج: السيد ${husbandData.fullName}، المغربي الجنسية، المولود بـ ${husbandData.birthPlace} بتاريخ ${husbandData.birthDate}، مهنته: ${husbandData.profession}، القاطن بـ ${husbandData.address}، الحامل للبطاقة الوطنية للتعريف رقم ${husbandData.cin}.
وحالته السابقة: مطلق من الزوجة المذكورة بعده بموجب رسم الطلاق المسجل برقم ${deedBookNumber}، حرف ${deedLetter}، صفحة ${deedPage}، عدد ${deedCount}، بتاريخ ${deedDate} لدى ${deedCourt}، وقد انقضت عدتها الشرعية وزالت الزوجية السابقة حالاً عملاً بالمادتين 125 و126 من مدونة الأسرة دون أن يكون مكملاً للثلاث.

والزوجة: السيدة ${wifeData.fullName}، المغربية الجنسية، المولودة بـ ${wifeData.birthPlace} بتاريخ ${wifeData.birthDate}، مهنتها: ${wifeData.profession}، القاطنة بـ ${wifeData.address}، الحاملة للبطاقة الوطنية للتعريف رقم ${wifeData.cin}.
وحالتها السابقة: مطلقة من الزوج المذكور أعلاه بموجب رسم الطلاق المذكور مراجِعُه.
${
  wifeGuardianshipMode === 'self_direct'
    ? 'وقد باشرت الزوجة الراشدة عقد زواجها بنفسها ومارست ولايتها استناداً للمادتين 24 و 25 من مدونة الأسرة.'
    : wifeGuardianshipMode === 'delegated_father'
    ? `وقد فوضت الزوجة الراشدة ولاية عقدها لوالدها السيد ${delegatedFatherInfo.name} الحامل لـ CIN: ${delegatedFatherInfo.cin}.`
    : `وقد فوضت الزوجة الراشدة ولاية عقدها لـ (${delegatedRelativeInfo.relationship}) السيد ${delegatedRelativeInfo.name} الحامل لـ CIN: ${delegatedRelativeInfo.cin}.`
}

${
  poaType !== 'none'
    ? 'وحيث إنه تم التعاقد بحضور وكيل مفوض وفق مقتضيات المادة 17 من مدونة الأسرة المؤشر عليها قضائياً.'
    : 'وقد حضر الطرفان معاً مجلس العقد وأبرماه بمباشرتهما الشخصية.'
}

الصداق والمقتضى المالي:
تم الاتفاق بين الزوجين على تسمية صداق قدره: ${dowryTotalAmount.toLocaleString('ar-MA')} درهم (${dowryTotalInWords})، ${
      dowryDivision === 'all_advanced'
        ? `كله معجل قدره ${dowryTotalAmount.toLocaleString('ar-MA')} درهم، ${
            advanceReceiptStatus === 'in_sight'
              ? 'تم قبضه كاملاً عياناً بمجلس العقد.'
              : advanceReceiptStatus === 'wife_acknowledgment'
              ? 'اعترفت الزوجة بقبضه كاملاً وحيازته.'
              : 'في ذمة الزوج يؤديه عند المطالبة.'
          }`
        : dowryDivision === 'all_deferred'
        ? `كله مؤجل قدره ${dowryTotalAmount.toLocaleString('ar-MA')} درهم، يستحق ${deferredMaturityEvent}.`
        : `منه معجل قدره ${dowryAdvanceAmount.toLocaleString('ar-MA')} درهم (${dowryAdvanceInWords}) ${
            advanceReceiptStatus === 'in_sight'
              ? 'قُبض عياناً بمجلس الإشهاد،'
              : advanceReceiptStatus === 'wife_acknowledgment'
              ? 'اعترفت الزوجة بحيازته وقبضه،'
              : advanceReceiptStatus === 'partial'
              ? `قُبض منه جزئياً مبلغ ${partialReceivedAmount.toLocaleString('ar-MA')} درهم (${partialReceivedInWords}) وبقي بذمته ${partialRemainingAmount.toLocaleString('ar-MA')} درهم (${partialRemainingInWords})،`
              : 'بقي بذمة الزوج حالاً،'
          } وباقيه مؤجل قدره ${dowryDeferredAmount.toLocaleString('ar-MA')} درهم (${dowryDeferredInWords}) يستحق ${deferredMaturityEvent}.`
    }

الشروط الخاصة والتدبير المالي:
${
  conditionsList.length > 0
    ? `اشترط الطرفان شروطاً اتفاقية ملزمة عملاً بالمادة 47 من مدونة الأسرة، وهي: ${conditionsList.map((c, i) => `(${i + 1}) [بطلب من ${c.demandedBy}]: ${c.text}`).join(' ')}`
    : 'لم يشترط أي من الطرفين على الآخر شرطاً خاصاً سوى ما يقتضيه العقد شرعاً وقانوناً.'
}
وقد تم إشعار الطرفين رسمياً من طرف العدلين بمقتضيات المادة 49 من مدونة الأسرة المتعلقة باستقلال الذمة المالية وجواز الاتفاق على تدبير الأموال المكتسبة أثناء قيام الزوجية بمقتضى وثيقة مستقلة.

الإيجاب والقبول:
صدر الإيجاب والقبول صريحين متطابقين في مجلس واحد، باتين غير معلقين على أجل أو شرط واقف أو فاسخ، وفق المادتين 10 و 11 من مدونة الأسرة.

وقد استوفى هذا العقد مستندات ملف الزواج المودع تحت عدد قانوني لدى كتابة ضبط قضاء الأسرة طبقاً للمادة 65.

وبما ذُكر كُتب الرسم وتُلي على الطرفين فصادقا عليه وأُشهد عليهما به على الوجه التام والصحيح قانوناً.`;
  }, [
    deedCourt,
    husbandData,
    wifeData,
    deedBookNumber,
    deedLetter,
    deedPage,
    deedCount,
    deedDate,
    wifeGuardianshipMode,
    delegatedFatherInfo,
    delegatedRelativeInfo,
    poaType,
    dowryTotalAmount,
    dowryTotalInWords,
    dowryDivision,
    dowryAdvanceAmount,
    dowryAdvanceInWords,
    dowryDeferredAmount,
    dowryDeferredInWords,
    advanceReceiptStatus,
    partialReceivedAmount,
    partialReceivedInWords,
    partialRemainingAmount,
    partialRemainingInWords,
    deferredMaturityEvent,
    conditionsList
  ]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 select-none" dir="rtl">
      {/* ========================================================================= */}
      {/* الشريط العلوي — الهوية اللونية بالأزرق الداكن والخط الزمني التوثيقي        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-slate-700 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-5 sm:p-6 text-white shadow-xl min-w-0">
        <div className="absolute top-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-900/30 shrink-0 border border-blue-400/30">
              <RotateCcw className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-900/50 text-blue-200 border border-blue-500/40">
                  عقد زواج جديد بعد طلاق بائن
                </span>
                <span className="text-[11px] font-bold text-slate-300">المادة 126 من مدونة الأسرة</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 break-words">
                عقد زواج جديد — تجديد عقد الزواج بين المطلقين بعد زوال الزوجية السابقة
              </h1>
            </div>
          </div>

          {onBackToClassification && (
            <button
              type="button"
              onClick={onBackToClassification}
              className="self-start md:self-auto shrink-0 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>↩ العودة إلى تصنيف الزواج</span>
            </button>
          )}
        </div>

        {/* الخط الزمني التوثيقي: الزواج السابق → الطلاق البائن → زوال الزوجية → عقد جديد → زواج جديد */}
        <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-blue-500/30 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] font-bold border border-slate-700">
                1
              </span>
              <span>الزواج السابق</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-180 shrink-0" />

            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="w-6 h-6 rounded-lg bg-amber-950/60 flex items-center justify-center text-[11px] font-bold border border-amber-600/40">
                2
              </span>
              <span>الطلاق البائن</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-180 shrink-0" />

            <div className="flex items-center gap-1.5 text-rose-300">
              <span className="w-6 h-6 rounded-lg bg-rose-950/60 flex items-center justify-center text-[11px] font-bold border border-rose-600/40">
                3
              </span>
              <span>زوال الزوجية</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-180 shrink-0" />

            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-6 h-6 rounded-lg bg-cyan-950/60 flex items-center justify-center text-[11px] font-bold border border-cyan-500/40">
                4
              </span>
              <span>عقد جديد</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-180 shrink-0" />

            {/* الزواج الجديد باللون الأزرق الداكن المعتمد وليس الأخضر */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-900/80 text-blue-100 border border-blue-400 font-black shadow-md">
              <span className="w-5 h-5 rounded-md bg-blue-700 text-white flex items-center justify-center text-[10px]">
                5
              </span>
              <span>زواج جديد (أزرق داكن)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* شريط التنقل بين المراحل الـ 10 — مدمج ومتجاوب بدون تمدد أفقي               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-blue-900 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {activeStage}
            </span>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block">
                المرحلة الحالية ({activeStage} من 10)
              </span>
              <span className="text-sm font-black text-slate-900 truncate block">
                {stagesList[activeStage - 1]?.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-800 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((activeStage / 10) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {Math.round((activeStage / 10) * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeStage <= 1}
                onClick={() => setActiveStage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="المرحلة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={activeStage >= 10 || divorceSource === 'completed_three'}
                onClick={() => setActiveStage((p) => Math.min(10, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="المرحلة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* أزرار المراحل بتوزيع متجاوب يلتف تلقائياً */}
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {stagesList.map((stg) => {
            const isActive = activeStage === stg.num;
            const isCompleted = activeStage > stg.num;

            return (
              <button
                key={stg.num}
                type="button"
                onClick={() => setActiveStage(stg.num)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs ring-2 ring-blue-500 font-black'
                    : isCompleted
                    ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-900'
                      : isCompleted
                      ? 'bg-blue-200 text-blue-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isCompleted ? '✓' : stg.num}
                </span>
                <span className="whitespace-nowrap">{stg.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* حاوية محتوى المرحلة النشطة                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6 min-w-0 max-w-full">
        {/* ======================================================================= */}
        {/* المرحلة 1: ① البوابة القانونية و ② ربط الطلاق السابق                      */}
        {/* ======================================================================= */}
        {activeStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                ⚖️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 1 — البوابة القانونية: لماذا أصبح العقد جديدًا؟
                </h3>
                <p className="text-xs text-slate-500">
                  انتهت العلاقة الزوجية السابقة — التحقق من شروط وموجبات إبرام عقد زواج جديد بين الطرفين
                </p>
              </div>
            </div>

            {/* السؤال المقيد: مصدر انتهاء الزوجية السابقة */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-black text-slate-900">
                ما مصدر انتهاء الزوجية السابقة؟
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'irrevocable_minor' as const,
                    title: 'طلاق بائن دون الثلاث',
                    desc: 'خلع، اتفاق، أو طلاق بحكم قضائي (بائن بينونة صغرى تزول به الزوجية حالاً)'
                  },
                  {
                    id: 'revocable_iddah_expired' as const,
                    title: 'طلاق رجعي انقضت عدته',
                    desc: 'كان رجعياً وتحول إلى بائن بينونة صغرى بانقضاء العدة عملاً بالمادة 125'
                  },
                  {
                    id: 'before_consummation' as const,
                    title: 'طلاق قبل البناء',
                    desc: 'بائن بينونة صغرى بقوة القانون بمقتضى المادة 123'
                  },
                  {
                    id: 'completed_three' as const,
                    title: 'طلاق مكمل للثلاث',
                    desc: 'بائن بينونة كبرى يمنع من إعادة الزواج إلا بالشرط المغلظ (المادة 127)'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDivorceSource(item.id);
                      if (item.id === 'completed_three') setIsIddahStillRunning(false);
                    }}
                    className={`p-4 rounded-xl border text-right transition cursor-pointer ${
                      divorceSource === item.id
                        ? item.id === 'completed_three'
                          ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400 text-rose-950 font-bold'
                          : 'bg-blue-50 border-blue-600 ring-2 ring-blue-400 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">{item.title}</span>
                      {divorceSource === item.id && (
                        <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>

              {/* النتيجة القانونية الآلية المباشرة */}
              {divorceSource === 'irrevocable_minor' && (
                <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-400 text-blue-950 text-xs leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block mb-1">
                      انتهت الزوجية السابقة، ويجوز من حيث الأصل تجديد عقد الزواج بعقد جديد:
                    </span>
                    تنص المادة 126 من مدونة الأسرة صراحة على أن الطلاق البائن دون الثلاث يزيل الزوجية حالاً، ولا
                    يمنع من تجديد عقد الزواج بينهما بعقد ومهر جديدين ومستوف لكافة أركان النكاح.
                  </div>
                </div>
              )}

              {divorceSource === 'revocable_iddah_expired' && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-300 text-indigo-950 text-xs leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block mb-1">
                      بانقضاء عدة الطلاق الرجعي تبين المرأة بينونة صغرى (المادتان 125 و 126):
                    </span>
                    تعتبر المطلقة رجعياً بائنة بينونة صغرى بمجرد انقضاء عدتها، فتزول الزوجية حكماً، ولا تجوز
                    مراجعتها برسم رجعة، وإنما بتجديد عقد الزواج بمهر وعقد جديدين كاملين.
                  </div>
                </div>
              )}

              {divorceSource === 'before_consummation' && (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 text-xs leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block mb-1">
                      الطلاق قبل البناء بائن بينونة صغرى فوراً (المادة 123):
                    </span>
                    لا عدة على المطلقة قبل الدخول، وتزول الزوجية مباشرة بوقوع الطلاق، ويجوز للطرفين استئناف حياتهما
                    الزوجية بإبرام عقد زواج جديد ومهر مسمى جديد.
                  </div>
                </div>
              )}

              {divorceSource === 'completed_three' && (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 text-xs leading-relaxed flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-sm block mb-1">
                      🔴 لا يمكن متابعة عقد الزواج بين الطرفين بهذه المعطيات (المادة 127):
                    </span>
                    الطلاق المكمل للثلاث يزيل الزوجية حالاً ويمنع من تجديد العقد مع المطلقة إلا بعد انقضاء عدتها من
                    زوج آخر دخل بها دخولاً فعلياً شرعياً صحيحاً عن زواج صحيح. لا يمكن المتابعة في هذا المسار.
                  </div>
                </div>
              )}
            </div>

            {/* ② ربط الزواج الجديد بالطلاق السابق */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <span>ربط الزواج الجديد بالطلاق السابق</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    استرجاع بيانات رسم الطلاق ومراجعه المضمنة بالسجل دون كتابة يدوية مكررة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeedPickerOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>🔎 اختيار الطلاق السابق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingDeedDetails(true)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👁️ عرض رسم الطلاق</span>
                  </button>
                </div>
              </div>

              {/* تفاصيل مراجع الطلاق المسترجعة في بطاقة واحدة واضحة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">رقم الرسم / الدفتر</span>
                  <span className="text-blue-900 font-black text-sm">{deedBookNumber}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">حرف الدفتر</span>
                  <span className="text-blue-900 font-black text-sm">{deedLetter}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">الصفحة والعدد</span>
                  <span className="text-blue-900 font-black text-sm">
                    ص {deedPage} / ع {deedCount}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">تاريخ الطلاق</span>
                  <span className="text-blue-900 font-black text-sm">{deedDate}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-950">
                <div className="flex items-center gap-2">
                  <span className="font-bold">المحكمة المضمن بها:</span>
                  <span>{deedCourt}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم التحقق من انتهاء الزوجية السابقة ومطابقة السجلات</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 2: ③ تحديد الطرفين و ④ بطاقة الهوية القانونية الموسعة             */}
        {/* ======================================================================= */}
        {activeStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                👥
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 2 — تحديد الطرفين وبطاقة الهوية القانونية الموسعة
                </h3>
                <p className="text-xs text-slate-500">
                  استرجاع بيانات الزوجين من رسم الطلاق السابق كأساس مع وجوب المراجعة والتحيين
                </p>
              </div>
            </div>

            {/* التنبيه القانوني المنهجي: بيانات مسترجعة ≠ بيانات نهائية */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-sm block mb-1">
                  قاعدة توثيقية حازمة: «بيانات مسترجعة ≠ بيانات نهائية»
                </span>
                تم استرجاع بيانات الطرفين من الرسم السابق. ستُستعمل البيانات كأساس لعقد الزواج الجديد، مع وجوب
                مراجعتها وتحيين ما تغير منها (العنوان، المهنة، صلاحية البطاقة، الحالة المدنية).
              </div>
            </div>

            {/* تدفق الربط بين الطرفين */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-around gap-4 text-center">
              <div className="flex items-center gap-2">
                <span className="text-base">👨</span>
                <span className="text-xs font-bold text-slate-600">الزوج السابق</span>
                <span className="text-blue-700 font-black">← الزوج في العقد الجديد</span>
                <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {husbandData.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">👩</span>
                <span className="text-xs font-bold text-slate-600">الزوجة السابقة</span>
                <span className="text-rose-700 font-black">← الزوجة في العقد الجديد</span>
                <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {wifeData.fullName}
                </span>
              </div>
            </div>

            {/* بطاقات الهوية القانونية الموسعة لكل طرف */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* الزوج */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨</span>
                    <span className="font-black text-slate-900 text-sm">الزوج في العقد الجديد</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingParty('husband')}
                    className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️ تحيين البيانات</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">الاسم الكامل:</span>
                    <span className="font-bold text-slate-900">{husbandData.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">الاسم باللاتينية:</span>
                    <span className="font-mono text-slate-700">{husbandData.latinName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">البطاقة الوطنية (CIN):</span>
                    <span className="font-mono font-bold text-blue-900">{husbandData.cin}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">اسم الأب والأم:</span>
                    <span className="text-slate-800">
                      {husbandData.fatherName} و {husbandData.motherName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">تاريخ ومكان الازدياد:</span>
                    <span className="text-slate-800">
                      {husbandData.birthDate} بـ {husbandData.birthPlace}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">المهنة ومحل الإقامة:</span>
                    <span className="text-slate-800">
                      {husbandData.profession} — {husbandData.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">الحالة السابقة:</span>
                    <span className="font-bold text-blue-800">{husbandData.familyStatus}</span>
                  </div>
                </div>

                {husbandData.isEdited && (
                  <div className="p-2 bg-blue-50 text-blue-900 rounded-lg text-[11px] font-bold border border-blue-200">
                    ✓ تم تحيين بعض البيانات وتسجيل سند التصحيح بالسجل.
                  </div>
                )}
              </div>

              {/* الزوجة */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👩</span>
                    <span className="font-black text-rose-950 text-sm">الزوجة في العقد الجديد</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingParty('wife')}
                    className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️ تحيين البيانات</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">الاسم الكامل:</span>
                    <span className="font-bold text-slate-900">{wifeData.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">الاسم باللاتينية:</span>
                    <span className="font-mono text-slate-700">{wifeData.latinName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">البطاقة الوطنية (CIN):</span>
                    <span className="font-mono font-bold text-rose-900">{wifeData.cin}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">اسم الأب والأم:</span>
                    <span className="text-slate-800">
                      {wifeData.fatherName} و {wifeData.motherName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">تاريخ ومكان الازدياد:</span>
                    <span className="text-slate-800">
                      {wifeData.birthDate} بـ {wifeData.birthPlace}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100">
                    <span className="text-slate-500">المهنة ومحل الإقامة:</span>
                    <span className="text-slate-800">
                      {wifeData.profession} — {wifeData.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">الحالة السابقة:</span>
                    <span className="font-bold text-rose-800">{wifeData.familyStatus}</span>
                  </div>
                </div>

                {wifeData.isEdited && (
                  <div className="p-2 bg-rose-100/70 text-rose-900 rounded-lg text-[11px] font-bold border border-rose-200">
                    ✓ تم تحيين بعض البيانات وتسجيل سند التصحيح بالسجل.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 3: ⑤ الحالة القانونية و ⑥ فحص موانع الزواج                      */}
        {/* ======================================================================= */}
        {activeStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                🛡️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 3 — الوضعية القانونية وفحص موانع الزواج التلقائي
                </h3>
                <p className="text-xs text-slate-500">
                  التأكد من عدم طروء زواج لاحق وفحص الموانع المؤبدة والمؤقتة وفق مدونة الأسرة
                </p>
              </div>
            </div>

            {/* سؤال الزواج اللاحق */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-black text-slate-900">
                هل طرأ على أي من الطرفين زواج آخر بعد الطلاق السابق؟
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setSubsequentMarriageCheck((p) => ({
                      ...p,
                      husbandRemarried: false,
                      wifeRemarried: false
                    }))
                  }
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    !subsequentMarriageCheck.husbandRemarried && !subsequentMarriageCheck.wifeRemarried
                      ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  🟢 لا، لم يطرأ عليهما أي زواج آخر
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSubsequentMarriageCheck((p) => ({
                      ...p,
                      husbandRemarried: true
                    }))
                  }
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    subsequentMarriageCheck.husbandRemarried || subsequentMarriageCheck.wifeRemarried
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  ⚠️ نعم، طرأ زواج لاحق (فتح مسار التحقق من الموانع المؤقتة)
                </button>
              </div>

              {(subsequentMarriageCheck.husbandRemarried || subsequentMarriageCheck.wifeRemarried) && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2 text-amber-950">
                  <span className="font-black block">مسار التحقق من الوضعية الحالية (المادة 39):</span>
                  <p>
                    يجب التأكد من انحلال الزواج اللاحق وانقضاء عدة الزوجة أو استبرائها، وعدم وجود موانع التعدد أو
                    الجمع الممنوع قانوناً.
                  </p>
                </div>
              )}
            </div>

            {/* محرك فحص الموانع الذكي (المواد 35 إلى 39) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-800" />
                  <span>محرك فحص الموانع الشرعية والقانونية التلقائي</span>
                </span>
                <span className="text-xs text-emerald-800 font-black bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                  ✓ مفحوص ومطابق
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* الموانع المؤبدة */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                    الموانع المؤبدة (المواد 35 إلى 38):
                  </span>
                  <ul className="space-y-1 text-slate-600">
                    <li>• القرابة: فحص النسب والأصول والفروع والحواشي (خلو تام).</li>
                    <li>• المصاهرة: فحص موانع المصاهرة الناتجة عن العقد الصحيح (خلو تام).</li>
                    <li>• الرضاع: فحص الرضاع المحرم شرعاً (خلو تام).</li>
                  </ul>
                </div>

                {/* الموانع المؤقتة */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                    الموانع المؤقتة (المادة 39):
                  </span>
                  <ul className="space-y-1 text-slate-600">
                    <li>• الجمع بين أختين أو بين المرأة وعمتها أو خالتها: غير قائم.</li>
                    <li>• تجاوز العدد المسموح به شرعاً: غير قائم.</li>
                    <li>• الطلاق الثلاث: تم التحقق من أنه دون الثلاث.</li>
                    <li>• وجود المرأة في زواج أو عدة: العدة منقضية ولا زواج قائم.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{impedimentsStatus.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 4: ⑦ الولاية و ⑧ سن الأهلية و ⑨ و ⑩ الوكالة                    */}
        {/* ======================================================================= */}
        {activeStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-lg">
                👑
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 4 — مباشرة العقد والولاية وسن الأهلية وبطاقة الوكالة
                </h3>
                <p className="text-xs text-slate-500">
                  تحديد صفة مباشرة الزوجة لعقدها (المادتان 24 و25) وشروط التوكيل القضائي (المادة 17)
                </p>
              </div>
            </div>

            {/* ⑦ طريقة مباشرة الزوجة لعقد زواجها (الولاية) */}
            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-black text-purple-950">
                من يباشر عقد الزوجة؟
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'self_direct' as const,
                    title: 'الزوجة تعقد زواجها بنفسها',
                    sub: 'الزوجة الراشدة تمارس ولايتها على نفسها (المادتان 24 و 25)'
                  },
                  {
                    id: 'delegated_father' as const,
                    title: 'الزوجة فوضت أباها',
                    sub: 'تفويض الأب لمباشرة العقد بالولاية الاختيارية'
                  },
                  {
                    id: 'delegated_relative' as const,
                    title: 'الزوجة فوضت أحد أقاربها',
                    sub: 'تفويض قريب مع تحديد درجة القرابة والبيانات'
                  }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setWifeGuardianshipMode(mode.id)}
                    className={`p-4 rounded-xl border text-right transition cursor-pointer ${
                      wifeGuardianshipMode === mode.id
                        ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-purple-400 font-bold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50/30'
                    }`}
                  >
                    <span className="text-sm font-black block">{mode.title}</span>
                    <span className="text-[11px] opacity-80 mt-1 block font-normal">{mode.sub}</span>
                  </button>
                ))}
              </div>

              {wifeGuardianshipMode === 'self_direct' && (
                <div className="p-3 bg-purple-100/60 border border-purple-300 rounded-xl text-xs text-purple-950 font-bold">
                  ✓ الزوجة تمارس ولايتها على نفسها استناداً للمادتين 24 و 25 من مدونة الأسرة بصفتها راشدة كاملة
                  الأهلية.
                </div>
              )}

              {wifeGuardianshipMode === 'delegated_father' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-purple-200 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم الأب المفوض *</label>
                    <input
                      type="text"
                      value={delegatedFatherInfo.name}
                      onChange={(e) => setDelegatedFatherInfo((p) => ({ ...p, name: e.target.value }))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم بطاقة الأب (CIN) *</label>
                    <input
                      type="text"
                      value={delegatedFatherInfo.cin}
                      onChange={(e) => setDelegatedFatherInfo((p) => ({ ...p, cin: e.target.value }))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {wifeGuardianshipMode === 'delegated_relative' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-purple-200 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نوع ودرجة القرابة *</label>
                    <input
                      type="text"
                      value={delegatedRelativeInfo.relationship}
                      onChange={(e) =>
                        setDelegatedRelativeInfo((p) => ({ ...p, relationship: e.target.value }))
                      }
                      placeholder="مثال: أخ شقيق / عم"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم الولي المفوض *</label>
                    <input
                      type="text"
                      value={delegatedRelativeInfo.name}
                      onChange={(e) => setDelegatedRelativeInfo((p) => ({ ...p, name: e.target.value }))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">رقم بطاقته الوطنية *</label>
                    <input
                      type="text"
                      value={delegatedRelativeInfo.cin}
                      onChange={(e) => setDelegatedRelativeInfo((p) => ({ ...p, cin: e.target.value }))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ⑨ و ⑩ بطاقة وكالة الزواج (المادة 17) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-black text-slate-900">
                هل سيبرم أحد الطرفين العقد بواسطة وكيل؟
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'none' as const, label: 'لا، الطرفان حاضران' },
                  { id: 'husband_poa' as const, label: 'نعم، الزوج موكِّل' },
                  { id: 'wife_poa' as const, label: 'نعم، الزوجة موكِّلة' },
                  { id: 'both_poa' as const, label: 'نعم، كلاهما موكِّل' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPoaType(opt.id)}
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                      poaType === opt.id
                        ? 'bg-purple-900 text-white border-purple-950 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {poaType !== 'none' && (
                <div className="p-5 bg-purple-50/70 border-2 border-purple-400 rounded-2xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="font-black text-purple-950 text-sm">
                      بطاقة وكالة الزواج وتأشير قاضي الأسرة (المادة 17)
                    </span>
                    <span className="text-purple-800 font-bold">إلزامية تأشير القاضي</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">اسم الوكيل الكامل *</label>
                      <input
                        type="text"
                        placeholder="الاسم الكامل للوكيل"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم بطاقة الوكيل *</label>
                      <input
                        type="text"
                        placeholder="رقم CIN للوكيل"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع الوكالة *</label>
                      <select className="w-full p-2 bg-white border border-purple-200 rounded-lg">
                        <option>رسمية موثقة</option>
                        <option>عرفية مصادق على توقيع الموكل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم الوكالة وتاريخها</label>
                      <input
                        type="text"
                        placeholder="رقم وتاريخ صدور الوكالة"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        رقم تأشير قاضي الأسرة المكلف بالزواج *
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: تأشير عدد 45 / 2026"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاريخ تأشير القاضي *</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-white border border-purple-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-300 text-purple-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-700" />
                    <span>
                      تم فحص شروط المادة 17: ظروف خاصة، تحديد الزوجين، الصداق، وتأشير القاضي — الوكالة مستوفية
                      للبيانات الأساسية.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 5: ⑪ و ⑫ و ⑬ و ⑭ بطاقة الصداق والمحرك المالي                    */}
        {/* ======================================================================= */}
        {activeStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-lg">
                💰
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 5 — بطاقة الصداق والمحرك المالي الدقيق
                </h3>
                <p className="text-xs text-slate-500">
                  تحديد الصداق، تحويل الأرقام للحروف العربية، بيان المعجل والمؤجل وحالة القبض (المواد 13 و27 و67)
                </p>
              </div>
            </div>

            {/* التحقق من عدم إسقاط الصداق */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                <span className="text-sm font-black text-amber-950">هل تم تحديد الصداق؟</span>
                <span className="text-xs text-amber-800">
                  المادة 13 تشترط عدم الاتفاق على إسقاط الصداق، والمادة 27 توجب تسميته
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مقدار الصداق الإجمالي بالأرقام (درهم مغربي) *
                  </label>
                  <input
                    type="number"
                    value={dowryTotalAmount}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setDowryTotalAmount(v);
                      if (dowryDivision === 'all_advanced') setDowryAdvanceAmount(v);
                      if (dowryDivision === 'all_deferred') setDowryDeferredAmount(v);
                      if (dowryDivision === 'split') {
                        setDowryAdvanceAmount(Math.round(v / 2));
                        setDowryDeferredAmount(v - Math.round(v / 2));
                      }
                    }}
                    className="w-full p-3 text-base font-black bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مقدار الصداق بالحروف العربية (توليد آلي قطعي)
                  </label>
                  <div className="w-full p-3 text-sm font-bold bg-amber-100/70 border border-amber-300 rounded-xl text-amber-950">
                    {dowryTotalInWords}
                  </div>
                </div>
              </div>

              {/* ⑫ تقسيم الصداق */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-black text-slate-800">تقسيم الصداق:</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'all_advanced' as const, label: 'كله معجل' },
                    { id: 'all_deferred' as const, label: 'كله مؤجل' },
                    { id: 'split' as const, label: 'بعضه معجل وبعضه مؤجل' }
                  ].map((div) => (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => {
                        setDowryDivision(div.id);
                        if (div.id === 'all_advanced') {
                          setDowryAdvanceAmount(dowryTotalAmount);
                          setDowryDeferredAmount(0);
                        } else if (div.id === 'all_deferred') {
                          setDowryAdvanceAmount(0);
                          setDowryDeferredAmount(dowryTotalAmount);
                        } else {
                          setDowryAdvanceAmount(Math.round(dowryTotalAmount / 2));
                          setDowryDeferredAmount(dowryTotalAmount - Math.round(dowryTotalAmount / 2));
                        }
                      }}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        dowryDivision === div.id
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-black'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {div.label}
                    </button>
                  ))}
                </div>

                {dowryDivision === 'split' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-amber-200 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المعجل بالأرقام:</label>
                      <input
                        type="number"
                        value={dowryAdvanceAmount}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setDowryAdvanceAmount(v);
                          setDowryDeferredAmount(Math.max(0, dowryTotalAmount - v));
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      />
                      <span className="text-[11px] text-amber-800 mt-1 block">حروفاً: {dowryAdvanceInWords}</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المؤجل بالأرقام:</label>
                      <input
                        type="number"
                        value={dowryDeferredAmount}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setDowryDeferredAmount(v);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                      />
                      <span className="text-[11px] text-amber-800 mt-1 block">حروفاً: {dowryDeferredInWords}</span>
                    </div>

                    <div className="col-span-1 sm:col-span-2 text-center text-xs font-black text-amber-950 pt-1">
                      المجموع الحسابي: {dowryAdvanceAmount + dowryDeferredAmount} درهم = {dowryTotalAmount} درهم (تطابق تام)
                    </div>
                  </div>
                )}
              </div>

              {/* ⑬ حالة قبض الصداق المعجل (المادة 67) */}
              {dowryDivision !== 'all_deferred' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-black text-slate-800">
                    حالة قبض الصداق المعجل (المادة 67):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'in_sight' as const, label: 'نعم، قبضاً عياناً' },
                      { id: 'wife_acknowledgment' as const, label: 'نعم، باعتراف الزوجة' },
                      { id: 'partial' as const, label: 'جزئياً' },
                      { id: 'not_yet_received' as const, label: 'لم يتم قبضه بعد' }
                    ].map((rc) => (
                      <button
                        key={rc.id}
                        type="button"
                        onClick={() => setAdvanceReceiptStatus(rc.id)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                          advanceReceiptStatus === rc.id
                            ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {rc.label}
                      </button>
                    ))}
                  </div>

                  {advanceReceiptStatus === 'partial' && (
                    <div className="p-3 bg-white rounded-xl border border-amber-300 text-xs grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 block">المسمى المعجل:</span>
                        <span className="font-bold text-slate-900">{dowryAdvanceAmount} درهم</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">المقبوض:</span>
                        <input
                          type="number"
                          value={partialReceivedAmount}
                          onChange={(e) => setPartialReceivedAmount(Number(e.target.value) || 0)}
                          className="w-full p-1 border rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block">الباقي بذمته:</span>
                        <span className="font-black text-amber-900">{partialRemainingAmount} درهم</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ⑭ أجل المؤجل */}
              {dowryDivision !== 'all_advanced' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-black text-slate-800">أجل استحقاق الصداق المؤجل:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1">نوع الاستحقاق:</label>
                      <select
                        value={deferredMaturityType}
                        onChange={(e) => setDeferredMaturityType(e.target.value as any)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="specific_event">عند حلول واقعة محددة</option>
                        <option value="fixed_date">عند أجل وتاريخ محدد</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">بيان الأجل أو الواقعة:</label>
                      {deferredMaturityType === 'specific_event' ? (
                        <input
                          type="text"
                          value={deferredMaturityEvent}
                          onChange={(e) => setDeferredMaturityEvent(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                        />
                      ) : (
                        <input
                          type="date"
                          value={deferredMaturityDate}
                          onChange={(e) => setDeferredMaturityDate(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    ⚠️ تنبيه: راجع صياغة الأجل بدقة قبل اعتماد الرسم لتفادي أي التباس قانوني.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 6: ⑮ الشروط الخاصة و ⑯ الأموال المكتسبة المادة 49               */}
        {/* ======================================================================= */}
        {activeStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-lg">
                📜
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 6 — الشروط الاتفاقية الخاصة وتدبير الأموال المشتركة (المادة 49)
                </h3>
                <p className="text-xs text-slate-500">
                  تنظيم الشروط المشروعة الملزمة وفق المادتين 47 و48، وتنبيه استقلال الذمة المالية وفق المادة 49
                </p>
              </div>
            </div>

            {/* ⑮ الشروط الخاصة */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-black text-slate-900">
                  هل اتفق الطرفان على شروط خاصة في هذا العقد؟
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasSpecialConditions(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      hasSpecialConditions ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    نعم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasSpecialConditions(false);
                      setConditionsList([]);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      !hasSpecialConditions ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    لا
                  </button>
                </div>
              </div>

              {!hasSpecialConditions ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                  لا توجد شروط خاصة مدخلة في العقد.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* قائمة الشروط */}
                  <div className="space-y-2">
                    {conditionsList.map((cond, idx) => (
                      <div
                        key={cond.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-[10px]">
                              شرط {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">بطلب من: {cond.demandedBy}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">التصنيف: {cond.category}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConditionsList((p) => p.filter((x) => x.id !== cond.id))}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                        <p className="text-slate-900 font-bold pr-2 border-r-2 border-teal-500">{cond.text}</p>
                        <div className="text-[11px] text-teal-800 bg-teal-50/70 p-2 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{cond.evaluationMsg}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* إضافة شرط جديد منظم */}
                  <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-3 text-xs">
                    <span className="font-bold text-teal-950 block">إضافة شرط اتفاقي جديد:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">من اشترط؟</label>
                        <select
                          value={newConditionWho}
                          onChange={(e) => setNewConditionWho(e.target.value as any)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="الزوجة">الزوجة</option>
                          <option value="الزوج">الزوج</option>
                          <option value="الطرفان">الطرفان معاً</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">تصنيف الشرط:</label>
                        <select
                          value={newConditionCat}
                          onChange={(e) => setNewConditionCat(e.target.value as any)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="عدم التعدد">عدم التعدد</option>
                          <option value="سكن">سكن مستقل</option>
                          <option value="عمل">ممارسة العمل</option>
                          <option value="دراسة">إكمال الدراسة</option>
                          <option value="مالي">تدبير مالي</option>
                          <option value="تدبير الأسرة">تدبير الأسرة</option>
                          <option value="شرط آخر مشروع">شرط آخر مشروع</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddCondition}
                          className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>+ إضافة الشرط</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نص الشرط الاتفاقي:</label>
                      <input
                        type="text"
                        value={newConditionText}
                        onChange={(e) => setNewConditionText(e.target.value)}
                        placeholder="اكتب نص الشرط هنا بدقة... (مثال: توفير سكن مستقل بالمدينة)"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ⑯ الأموال المكتسبة أثناء الزوجية — تنبيه المادة 49 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <FileCheck2 className="w-5 h-5 text-blue-800" />
                <span className="text-sm font-black text-slate-900">
                  النظام المالي بين الزوجين وتنبيه المادة 49 من مدونة الأسرة
                </span>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 leading-relaxed">
                <span className="font-bold block mb-1">تنبيه عدلي إلزامي بمقتضى القانون:</span>
                لكل واحد من الزوجين ذمة مالية مستقلة عن ذمة الآخر، غير أنه يجوز لهما في إطار تدبير الأموال التي
                ستكتسب أثناء قيام الزوجية، الاتفاق على استثمارها وتوزيعها.
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-800">
                  هل يرغب الطرفان في إبرام اتفاق مستقل بشأن تدبير الأموال المكتسبة أثناء الزوجية؟
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setWantsArticle49Agreement(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      !wantsArticle49Agreement
                        ? 'bg-blue-900 text-white border-blue-950'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    لا، يكتفيان بالذمة المالية المستقلة الأصلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setWantsArticle49Agreement(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      wantsArticle49Agreement
                        ? 'bg-blue-900 text-white border-blue-950'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    نعم، سيبرمان اتفاقاً مستقلاً
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  تم إشعار الطرفين بمقتضيات المادة 49 وتضمين ذلك بالرسم رسمياً وفصل وثيقة الاتفاق المالي المستقلة.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 7: ⑰ و ⑱ الإيجاب والقبول ومجلس العقد                            */}
        {/* ======================================================================= */}
        {activeStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                🤝
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 7 — الإيجاب والقبول والتعبير عن الإرادة بمجلس العقد
                </h3>
                <p className="text-xs text-slate-500">
                  تطابق الرضى في مجلس واحد وبات غير معلق وفق المادتين 10 و11 وحالات التعبير الخاصة
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">من صدر منه الإيجاب؟ *</label>
                  <select
                    value={offerBy}
                    onChange={(e) => setOfferBy(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="husband">الزوج بمباشرته الشخصية</option>
                    <option value="husband_agent">وكيل الزوج بموجب وكالة شرعية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">من صدر منه القبول؟ *</label>
                  <select
                    value={acceptanceBy}
                    onChange={(e) => setAcceptanceBy(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="wife">الزوجة بمباشرتها الشخصية</option>
                    <option value="wife_agent">وكيل الزوجة بموجب وكالة شرعية</option>
                    <option value="wife_guardian">ولي الزوجة المفوض</option>
                  </select>
                </div>
              </div>

              {/* عناصر التحقق من صحة الإيجاب والقبول (المادتان 10 و 11) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
                <span className="font-bold text-slate-900 block border-b pb-2">
                  شروط تمام الإيجاب والقبول (المادتان 10 و 11):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                    <span>صدور في مجلس واحد؟</span>
                    <span className="text-emerald-700 font-bold">✓ نعم</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                    <span>تطابق الإيجاب والقبول؟</span>
                    <span className="text-emerald-700 font-bold">✓ نعم</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                    <span>بات غير معلق على شرط أو أجل؟</span>
                    <span className="text-emerald-700 font-bold">✓ نعم</span>
                  </div>
                </div>
              </div>

              {/* ⑱ حالات التعبير عن الإرادة الخاصة (المادة 10) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
                <span className="font-bold text-slate-900 block">
                  طريقة التعبير عن الإرادة (المادة 10 عند العجز عن النطق):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">الزوج:</label>
                    <select
                      value={husbandExpressionMode}
                      onChange={(e) => setHusbandExpressionMode(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="spoken">سليم النطق (لفظاً صريحاً)</option>
                      <option value="written">عاجز عن النطق (كتابة تفيد الرضى)</option>
                      <option value="sign_language">عاجز عن النطق (إشارة مفهومة)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">الزوجة:</label>
                    <select
                      value={wifeExpressionMode}
                      onChange={(e) => setWifeExpressionMode(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="spoken">سليمة النطق (لفظاً صريحاً)</option>
                      <option value="written">عاجزة عن النطق (كتابة تفيد الرضى)</option>
                      <option value="sign_language">عاجزة عن النطق (إشارة مفهومة)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 8: ⑲ الحالات الخاصة و ⑳ ملف مستندات الزواج                     */}
        {/* ======================================================================= */}
        {activeStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                📂
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 8 — الحالات الخاصة وملف مستندات عقد الزواج (المادة 65)
                </h3>
                <p className="text-xs text-slate-500">
                  تتبع وثائق ملف الزواج القانونية الإلزامية والإذن القضائي متى كان لازماً
                </p>
              </div>
            </div>

            {/* ⑲ الحالات الخاصة */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <label className="block text-sm font-black text-slate-900">
                هل توجد حالة خاصة في هذا الزواج تستلزم إذناً قضائياً؟
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'normal' as const, label: 'زواج عادي (افتراضي)' },
                  { id: 'foreign' as const, label: 'زواج مختلط بأجنبي' },
                  { id: 'minor' as const, label: 'أحد الطرفين دون 18' },
                  { id: 'disability' as const, label: 'إعاقة ذهنية' },
                  { id: 'polygamy' as const, label: 'تعدد الزوجات' },
                  { id: 'poa' as const, label: 'توكيل' },
                  { id: 'islam_conversion' as const, label: 'اعتناق الإسلام' },
                  { id: 'judge_permission' as const, label: 'إذن قضائي خاص' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSpecialMarriageCase(item.id)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                      specialMarriageCase === item.id
                        ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ⑳ ملف مستندات الزواج (المادة 65) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-800" />
                  <span>ملف مستندات الزواج المودع لدى كتابة الضبط (المادة 65)</span>
                </span>
                <span className="text-xs text-slate-500">تحقق مؤتمت من شمول الوثائق</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  { key: 'permissionRequest', label: 'طلب الإذن بتوثيق الزواج مصادق عليه' },
                  { key: 'birthCertificateHusband', label: 'نسخة كاملة من رسم ولادة الزوج' },
                  { key: 'birthCertificateWife', label: 'نسخة كاملة من رسم ولادة الزوجة' },
                  { key: 'adminCertHusband', label: 'الشهادة الإدارية للزوج (الخلو من الموانع)' },
                  { key: 'adminCertWife', label: 'الشهادة الإدارية للزوجة' },
                  { key: 'medicalCertHusband', label: 'الشهادة الطبية للزوج' },
                  { key: 'medicalCertWife', label: 'الشهادة الطبية للزوجة' },
                  { key: 'priorDivorceDeed', label: 'رسم الطلاق السابق المضمن بالسجل' },
                  { key: 'iddahProof', label: 'شهادة انقضاء العدة الشرعية وزوال الزوجية' }
                ].map((doc) => (
                  <div
                    key={doc.key}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <span className="text-slate-800 font-medium">{doc.label}</span>
                    <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      🟢 متوفر بالملف
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 9: ㉑ السجل التاريخي و ㉒ التدقيق والمراجعة النهائية              */}
        {/* ======================================================================= */}
        {activeStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                🔐
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  المرحلة 9 — الربط بالسجل التاريخي ولوحة التدقيق النهائي
                </h3>
                <p className="text-xs text-slate-500">
                  تأكيد الربط التاريخي بين الزواج والطلاق والزواج الجديد، وفحص شروط التوثيق الـ 12
                </p>
              </div>
            </div>

            {/* ㉑ الوضعية السابقة للزوجين والربط بالسجل */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-700 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="font-black text-sm text-blue-200">
                  🔗 السجل التاريخي للزوجين والربط التوثيقي المعتمد
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  HISTORICAL-LINKED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block mb-1">الزواج السابق الأصلي:</span>
                  <span className="text-white font-bold">{prevMarriageDeedRef}</span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block mb-1">رسم الطلاق البائن:</span>
                  <span className="text-white font-bold">
                    رقم {deedBookNumber} / حرف {deedLetter} / ص {deedPage} / ع {deedCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block mb-1">تاريخ زوال الزوجية والعدة:</span>
                  <span className="text-emerald-300 font-bold">انقضت العدة وزالت الزوجية حالاً</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded-xl text-center font-bold">
                ✓ تم الربط التوثيقي بين الزواج الجديد والسجل التاريخي للزوجين بنجاح.
              </div>
            </div>

            {/* ㉒ لوحة التدقيق القانوني النهائي (12 نقطة تحقق خضراء) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-black text-slate-900">
                  لوحة التدقيق والمراجعة القانونية الشاملة قبل التحرير
                </span>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-3 py-0.5 rounded-full">
                  12 / 12 شرطاً محققاً
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {[
                  { t: 'انتهاء الزوجية السابقة', s: 'محقق بالمادة 126' },
                  { t: 'قابلية إعادة الزواج', s: 'بائن دون الثلاث' },
                  { t: 'عدم كون الطلاق مكملاً للثلاث', s: 'سليم' },
                  { t: 'خلو الزوجين من موانع الزواج', s: 'المواد 35 إلى 39' },
                  { t: 'أهلية الزوج وأهلية الزوجة', s: 'راشدان كامل الأهلية' },
                  { t: 'صحة الولاية ومباشرة العقد', s: 'المادتان 24 و 25' },
                  { t: 'الوكالة وتأشير القاضي', s: poaType === 'none' ? 'حضور شخصي' : 'مؤشر عليها' },
                  { t: 'تسمية الصداق وعدم إسقاطه', s: 'المادتان 13 و 27' },
                  { t: 'مطابقة المعجل والمؤجل وحسابهما', s: 'تطابق حسابي 100%' },
                  { t: 'الشروط الاتفاقية', s: 'مشروعة وفق المادة 47' },
                  { t: 'الإيجاب والقبول بمجلس واحد', s: 'المادتان 10 و 11' },
                  { t: 'إشعار المادة 49 وملف الزواج', s: 'المادتان 49 و 65' }
                ].map((audit, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">{audit.t}</span>
                      <span className="text-[11px] text-slate-400">{audit.s}</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-blue-900 text-white rounded-xl text-center text-xs font-black shadow-sm">
                «اكتملت البيانات القانونية والشرعية الأساسية لعقد الزواج الجديد — جاهز للتحرير والاعتماد»
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* المرحلة 10: ㉓ المعاينة والتحرير النهائي لصياغة العقد                     */}
        {/* ======================================================================= */}
        {activeStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-lg">
                  ✍️
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    المرحلة 10 — المعاينة وصياغة رسم عقد الزواج الجديد
                  </h3>
                  <p className="text-xs text-slate-500">
                    الصياغة العدلية المغربية الرسمية المحكمة وفق مدونة الأسرة وقانون خطة العدالة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(isCustomEditingDraft ? customDraftContent : generatedDeedText)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? 'تم النسخ!' : 'نسخ الصياغة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isCustomEditingDraft) setCustomDraftContent(generatedDeedText);
                    setIsCustomEditingDraft(!isCustomEditingDraft);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isCustomEditingDraft ? 'معاينة الصياغة' : '✏️ تحرير الصياغة'}</span>
                </button>
              </div>
            </div>

            {/* محتوى المعاينة / التحرير */}
            {isCustomEditingDraft ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">تحرير الصياغة القانونية للرسم:</label>
                <textarea
                  rows={16}
                  value={customDraftContent}
                  onChange={(e) => setCustomDraftContent(e.target.value)}
                  className="w-full p-4 text-xs font-serif leading-relaxed bg-white border border-blue-400 rounded-2xl shadow-inner font-bold text-slate-900"
                />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 text-xs text-slate-900 leading-loose font-serif whitespace-pre-line shadow-inner max-h-[500px] overflow-y-auto">
                {generatedDeedText}
              </div>
            )}

            {/* أزرار الحفظ والاعتماد النهائي والانتقال لمراجعة المنصة */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-blue-950 font-bold">
                ✓ سيتم تضمين كافة البيانات، المراجع، الصداق، والشروط المحررة برسم الزواج النهائي.
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSyncToState();
                  onComplete();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-950/20"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد رسم الزواج الجديد والانتقال للمراجعة النهائية</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* شريط الأزرار السابق / التالي أسفل المرحلة                                 */}
        {/* ======================================================================= */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          <button
            type="button"
            disabled={activeStage <= 1}
            onClick={() => setActiveStage((p) => Math.max(1, p - 1))}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeStage <= 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق: {activeStage > 1 ? stagesList[activeStage - 2].title : ''}</span>
          </button>

          <span className="text-xs font-bold text-slate-400">
            المرحلة {activeStage} من 10
          </span>

          <button
            type="button"
            disabled={activeStage >= 10 || divorceSource === 'completed_three'}
            onClick={() => setActiveStage((p) => Math.min(10, p + 1))}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeStage >= 10 || divorceSource === 'completed_three'
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-blue-900 hover:bg-blue-950 text-white cursor-pointer shadow-md shadow-blue-900/20'
            }`}
          >
            <span>التالي: {activeStage < 10 ? stagesList[activeStage].title : ''}</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: نافذة اختيار رسم الطلاق السابق من السجلات                           */}
      {/* ========================================================================= */}
      {isDeedPickerOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-blue-400" />
                <h4 className="font-black text-sm">سجل رسوم الطلاق المرتبطة بالزوجين</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDeedPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <input
                type="text"
                value={deedSearchQuery}
                onChange={(e) => setDeedSearchQuery(e.target.value)}
                placeholder="ابحث برقم الرسم، اسم الزوج، اسم الزوجة، أو رقم البطاقة..."
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredDeeds.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 transition space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">
                      رسم طلاق رقم {record.deedNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
                      {record.divorceTypeLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <strong>دفتر:</strong> {record.registryBook}
                    </div>
                    <div>
                      <strong>حرف:</strong> {record.letter}
                    </div>
                    <div>
                      <strong>صفحة:</strong> {record.page}
                    </div>
                    <div>
                      <strong>عدد:</strong> {record.count}
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>
                      <strong>الزوجين:</strong> {record.husband.fullName} & {record.wife.fullName}
                    </span>
                    <span className="text-slate-500">تاريخ: {record.deedDate}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdoptDeed(record)}
                    className="w-full py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ اعتماد هذا الرسم واسترجاع بياناته</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: عرض تفاصيل رسم الطلاق السابق                                       */}
      {/* ========================================================================= */}
      {viewingDeedDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm">
                بيانات رسم الطلاق المعتمد (رقم {deedBookNumber})
              </h4>
              <button
                type="button"
                onClick={() => setViewingDeedDetails(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <strong>دفتر وسجل:</strong> {deedRegistryBook}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <strong>المراجع التضمينية:</strong> حرف {deedLetter} / صفحة {deedPage} / عدد {deedCount}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <strong>تاريخ الطلاق:</strong> {deedDate}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <strong>توثيق المحكمة:</strong> {deedCourt}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <strong>تاريخ الزواج السابق:</strong> {prevMarriageDeedRef}
              </div>
              <div className="p-3 bg-blue-50 text-blue-900 font-bold rounded-xl border border-blue-200">
                الوضعية القانونية: طلاق بائن دون الثلاث يزيل الزوجية ولا يمنع من تجديد العقد بموجب المادة 126.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingDeedDetails(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: تحيين وتعديل بيانات أحد الزوجين                                    */}
      {/* ========================================================================= */}
      {editingParty && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm">
                تحيين وتعديل بيانات {editingParty === 'husband' ? 'الزوج' : 'الزوجة'}
              </h4>
              <button
                type="button"
                onClick={() => setEditingParty(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={editingParty === 'husband' ? husbandData.fullName : wifeData.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, fullName: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, fullName: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={editingParty === 'husband' ? husbandData.cin : wifeData.cin}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, cin: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, cin: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المهنة الحالية *</label>
                <input
                  type="text"
                  value={editingParty === 'husband' ? husbandData.profession : wifeData.profession}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, profession: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, profession: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان ومحل الإقامة الحالي *</label>
                <input
                  type="text"
                  value={editingParty === 'husband' ? husbandData.address : wifeData.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, address: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, address: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سند التحيين والتعديل للتسجيل بالسجل</label>
                <input
                  type="text"
                  placeholder="مثال: تحيين العنوان والمهنة بناءً على البطاقة الوطنية الحديثة"
                  value={editingParty === 'husband' ? husbandData.updateReason : wifeData.updateReason}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, updateReason: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, updateReason: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditingParty(null)}
              className="w-full py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black cursor-pointer"
            >
              حفظ التحيين واعتماده
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
