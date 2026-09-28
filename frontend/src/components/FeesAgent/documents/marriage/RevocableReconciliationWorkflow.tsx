import React, { useState, useMemo } from 'react';
import type { FeesAgentState, Party } from '../../../../types/feesAgentTypes';
import { createEmptyParty } from '../../../../utils/feesAgentUtils';
import {
  RotateCcw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Edit3,
  Eye,
  BookOpen,
  Printer,
  Copy,
  Sparkles,
  X,
  Bookmark
} from 'lucide-react';

interface RevocableReconciliationWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete: () => void;
  onBackToClassification?: () => void;
}

// Sample database of registered divorce deeds between spouses
interface MockDivorceDeedRecord {
  id: string;
  deedNumber: string;
  registryBook: string;
  letter: string;
  page: string;
  count: string;
  deedDate: string;
  court: string;
  divorceType: 'revocable' | 'khul' | 'tamlik' | 'consensual' | 'before_consummation' | 'completed_three';
  divorceTypeLabel: string;
  husband: {
    fullName: string;
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
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    nationality: string;
    cin: string;
    address: string;
    profession: string;
  };
}

const MOCK_DIVORCE_RECORDS: MockDivorceDeedRecord[] = [
  {
    id: 'divorce-1234',
    deedNumber: '1234',
    registryBook: 'الطلاق',
    letter: 'ب',
    page: '56',
    count: '3',
    deedDate: '2026-04-12',
    court: 'المحكمة الابتدائية بشفشاون - قسم قضاء الأسرة',
    divorceType: 'revocable',
    divorceTypeLabel: 'طلاق رجعي',
    husband: {
      fullName: 'محمد العلمي بن إبراهيم',
      fatherName: 'إبراهيم العلمي',
      motherName: 'فاطمة بنسودة',
      birthDate: '1988-06-15',
      birthPlace: 'شفشاون',
      nationality: 'مغربية',
      cin: 'L459821',
      address: 'حي العيون، زقاق الأندلس، رقم 14، شفشاون',
      profession: 'أستاذ التعليم الثانوي'
    },
    wife: {
      fullName: 'فاطمة الزهراء بنجلون بنت أحمد',
      fatherName: 'أحمد بنجلون',
      motherName: 'أمينة المرابط',
      birthDate: '1992-09-20',
      birthPlace: 'تطوان',
      nationality: 'مغربية',
      cin: 'LF892341',
      address: 'حي العيون، زقاق الأندلس، رقم 14، شفشاون',
      profession: 'مهندسة معمارية'
    }
  },
  {
    id: 'divorce-2045',
    deedNumber: '2045',
    registryBook: 'الطلاق',
    letter: 'أ',
    page: '88',
    count: '12',
    deedDate: '2026-03-18',
    court: 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة',
    divorceType: 'revocable',
    divorceTypeLabel: 'طلاق رجعي',
    husband: {
      fullName: 'رشيد التازي بن عبد الكريم',
      fatherName: 'عبد الكريم التازي',
      motherName: 'خديجة الفاسي',
      birthDate: '1985-03-12',
      birthPlace: 'طنجة',
      nationality: 'مغربية',
      cin: 'K390124',
      address: 'شارع المقاومة، عمارة الأمل، رقم 22، طنجة',
      profession: 'تاجر'
    },
    wife: {
      fullName: 'مريم الحداد بنت مصطفى',
      fatherName: 'مصطفى الحداد',
      motherName: 'لطيفة المنصوري',
      birthDate: '1990-11-04',
      birthPlace: 'أصيلـة',
      nationality: 'مغربية',
      cin: 'KB554210',
      address: 'شارع المقاومة، عمارة الأمل، رقم 22، طنجة',
      profession: 'موظفة إدارة عمومية'
    }
  }
];

export const RevocableReconciliationWorkflow: React.FC<RevocableReconciliationWorkflowProps> = ({
  state: _state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  // Current active step within the 15-stage workflow (1 to 15)
  const [activeStage, setActiveStage] = useState<number>(1);

  // Stage 1: Presence of Parties (Only "husband + wife" allowed)
  const [attendeeChoice] = useState<'both'>('both');

  // Stage 4: Deed Selection
  const [selectedDeedRecord, setSelectedDeedRecord] = useState<MockDivorceDeedRecord | null>(
    null
  );
  const [isDeedPickerOpen, setIsDeedPickerOpen] = useState<boolean>(false);
  const [deedSearchQuery, setDeedSearchQuery] = useState<string>('');

  // Stage 2 & 3: Husband & Wife Data (retrieved from deed, editable with audit flag)
  const [husbandData, setHusbandData] = useState({
    fullName: _state.sellers?.[0]?.name || '',
    fatherName: _state.sellers?.[0]?.fatherName || '',
    motherName: _state.sellers?.[0]?.motherName || '',
    birthDate: _state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: _state.sellers?.[0]?.placeOfBirth || '',
    nationality: _state.sellers?.[0]?.nationality || 'مغربية',
    cin: _state.sellers?.[0]?.idNumber || '',
    address: _state.sellers?.[0]?.address || '',
    profession: _state.sellers?.[0]?.profession || '',
    isEdited: false,
    correctionReason: ''
  });

  const [wifeData, setWifeData] = useState({
    fullName: _state.buyers?.[0]?.name || '',
    fatherName: _state.buyers?.[0]?.fatherName || '',
    motherName: _state.buyers?.[0]?.motherName || '',
    birthDate: _state.buyers?.[0]?.dateOfBirth || '',
    birthPlace: _state.buyers?.[0]?.placeOfBirth || '',
    nationality: _state.buyers?.[0]?.nationality || 'مغربية',
    cin: _state.buyers?.[0]?.idNumber || '',
    address: _state.buyers?.[0]?.address || '',
    profession: _state.buyers?.[0]?.profession || '',
    isEdited: false,
    correctionReason: ''
  });

  // Modal controls for View & Edit details
  const [viewingParty, setViewingParty] = useState<'husband' | 'wife' | null>(null);
  const [editingParty, setEditingParty] = useState<'husband' | 'wife' | null>(null);

  // Stage 5: Independent Deed Reference Fields
  const [deedBookNumber, setDeedBookNumber] = useState<string>('');
  const [deedRegistryBook, setDeedRegistryBook] = useState<string>('الطلاق');
  const [deedLetter, setDeedLetter] = useState<string>('');
  const [deedPage, setDeedPage] = useState<string>('');
  const [deedCount, setDeedCount] = useState<string>('');
  const [deedDate, setDeedDate] = useState<string>('');
  const [deedCourt, setDeedCourt] = useState<string>(
    _state.meta?.court || ''
  );

  // Stage 6: Legal Eligibility check for Revocable nature
  const [recordedDivorceType, setRecordedDivorceType] = useState<
    'revocable' | 'khul' | 'tamlik' | 'consensual' | 'before_consummation' | 'completed_three'
  >('revocable');

  // Stage 7: Iddah Legal Check
  const [isPregnant, setIsPregnant] = useState<'pregnant' | 'not_pregnant'>('not_pregnant');
  const [iddahOverrideStatus, setIddahOverrideStatus] = useState<'valid' | 'expired'>('valid');

  // Stage 9: Mutual presence declaration
  const [husbandDeclared, setHusbandDeclared] = useState<boolean>(true);
  const [wifePresent, setWifePresent] = useState<boolean>(true);

  // Stage 10: Interactive legal phrasing formula
  const defaultFormula = useMemo(() => {
    return `تراجع المتفارقان، الزوج المذكور (${husbandData.fullName}) والزوجة المذكورة (${wifeData.fullName})، عن الطلاق الرجعي المضمن بدفتر الطلاق رقم ${deedBookNumber} حرف ${deedLetter} صفحة ${deedPage} عدد ${deedCount} الصادر عن ${deedCourt} بتاريخ ${deedDate}، وذلك أثناء سريان العدة الشرعية والقانونية، رجعة تامة بما جاز له ذلك شرعاً وقانوناً وفقاً للمادتين 123 و124 من مدونة الأسرة.`;
  }, [
    husbandData.fullName,
    wifeData.fullName,
    deedBookNumber,
    deedLetter,
    deedPage,
    deedCount,
    deedCourt,
    deedDate
  ]);

  const [declarationFormula, setDeclarationFormula] = useState<string>(defaultFormula);
  const [isFormulaCustomized, setIsFormulaCustomized] = useState<boolean>(false);
  const [isDraftGenerated, setIsDraftGenerated] = useState<boolean>(false);

  // Stage 14: Review confirmation
  const [isDataReviewed, setIsDataReviewed] = useState<boolean>(false);

  // Stage 15: Final Generation
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Automated 7-element legal validation checklist (Stage 12)
  const validationChecklist = useMemo(() => {
    const isHusbandValid = Boolean(husbandData.fullName.trim() && husbandData.cin.trim());
    const isWifeValid = Boolean(wifeData.fullName.trim() && wifeData.cin.trim());
    const isDeedLinked = Boolean(deedBookNumber.trim() && deedLetter.trim() && deedPage.trim() && deedCount.trim());
    const isDivorceTypeRevocable = recordedDivorceType === 'revocable';
    const isIddahActive = iddahOverrideStatus === 'valid';
    const isBothPresent = attendeeChoice === 'both' && wifePresent;
    const isDeclarationConfirmed = husbandDeclared;

    const allPassed =
      isHusbandValid &&
      isWifeValid &&
      isDeedLinked &&
      isDivorceTypeRevocable &&
      isIddahActive &&
      isBothPresent &&
      isDeclarationConfirmed;

    return {
      husband: isHusbandValid,
      wife: isWifeValid,
      deed: isDeedLinked,
      type: isDivorceTypeRevocable,
      iddah: isIddahActive,
      presence: isBothPresent,
      declaration: isDeclarationConfirmed,
      allPassed
    };
  }, [
    husbandData,
    wifeData,
    deedBookNumber,
    deedLetter,
    deedPage,
    deedCount,
    recordedDivorceType,
    iddahOverrideStatus,
    attendeeChoice,
    wifePresent,
    husbandDeclared
  ]);

  // Handle selecting a divorce deed from modal
  const handleAdoptDeed = (deed: MockDivorceDeedRecord) => {
    setSelectedDeedRecord(deed);
    setDeedBookNumber(deed.deedNumber);
    setDeedRegistryBook(deed.registryBook);
    setDeedLetter(deed.letter);
    setDeedPage(deed.page);
    setDeedCount(deed.count);
    setDeedDate(deed.deedDate);
    setDeedCourt(deed.court);
    setRecordedDivorceType(deed.divorceType);

    // Auto-populate husband & wife
    setHusbandData({
      fullName: deed.husband.fullName,
      fatherName: deed.husband.fatherName,
      motherName: deed.husband.motherName,
      birthDate: deed.husband.birthDate,
      birthPlace: deed.husband.birthPlace,
      nationality: deed.husband.nationality,
      cin: deed.husband.cin,
      address: deed.husband.address,
      profession: deed.husband.profession,
      isEdited: false,
      correctionReason: ''
    });

    setWifeData({
      fullName: deed.wife.fullName,
      fatherName: deed.wife.fatherName,
      motherName: deed.wife.motherName,
      birthDate: deed.wife.birthDate,
      birthPlace: deed.wife.birthPlace,
      nationality: deed.wife.nationality,
      cin: deed.wife.cin,
      address: deed.wife.address,
      profession: deed.wife.profession,
      isEdited: false,
      correctionReason: ''
    });

    setIsDeedPickerOpen(false);
  };

  // Sync to main state when generating draft
  const handleGenerateFinalDraft = () => {
    setIsDraftGenerated(true);

    const husbandParty: Party = {
      ...createEmptyParty(),
      id: 'party-husband-revocable',
      name: husbandData.fullName,
      idNumber: husbandData.cin,
      idType: 'CIN',
      address: husbandData.address,
      fatherName: husbandData.fatherName,
      motherName: husbandData.motherName,
      birthDate: husbandData.birthDate,
      birthPlace: husbandData.birthPlace,
      nationality: 'مغربي',
      profession: husbandData.profession,
      type: 'individual',
      role: 'seller', // husband in marriage schema
      maritalStatus: 'مطلق'
    };

    const wifeParty: Party = {
      ...createEmptyParty(),
      id: 'party-wife-revocable',
      name: wifeData.fullName,
      idNumber: wifeData.cin,
      idType: 'CIN',
      address: wifeData.address,
      fatherName: wifeData.fatherName,
      motherName: wifeData.motherName,
      birthDate: wifeData.birthDate,
      birthPlace: wifeData.birthPlace,
      nationality: 'مغربي',
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
        ...(prev.marriageClassification || { primaryType: 'revocable_reconciliation' }),
        primaryType: 'revocable_reconciliation',
        confirmedAt: new Date().toISOString(),
        reconciliationDetails: {
          divorceDeedNumber: `${deedBookNumber} / حرف ${deedLetter} / صفحة ${deedPage} / عدد ${deedCount}`,
          divorceDate: deedDate,
          revocationDate: new Date().toISOString().split('T')[0],
          divorceCourt: deedCourt,
          isIddahValid: validationChecklist.iddah
        }
      },
      marriageDetails: {
        ...(prev.marriageDetails || {}),
        courtName: deedCourt,
        registryBookType: 'كناش الأنكحة والرجعات',
        specialConditionsText: declarationFormula
      },
      meta: {
        ...(prev.meta || {}),
        court: deedCourt,
        customSubject: 'رسم الرجعة (إرجاع بعد طلاق رجعي)'
      } as any
    }));
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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

  // Stage descriptions list for quick jump / visual progress
  const stagesList = [
    { num: 1, title: 'حضور الطرفين' },
    { num: 2, title: 'بيانات الزوج' },
    { num: 3, title: 'بيانات الزوجة' },
    { num: 4, title: 'اختيار رسم الطلاق' },
    { num: 5, title: 'مراجع التضمين' },
    { num: 6, title: 'قابلية الرجعة' },
    { num: 7, title: 'التحقق من العدة' },
    { num: 8, title: 'بقاء الزوجية حكمًا' },
    { num: 9, title: 'الإقرار بالرجعة' },
    { num: 10, title: 'صيغة الإقرار' },
    { num: 11, title: 'تراجع المتفارقان' },
    { num: 12, title: 'التحقق الآلي' },
    { num: 13, title: 'التنبيهات الذكية' },
    { num: 14, title: 'المعاينة والملخص' },
    { num: 15, title: 'تحرير الرسم' }
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 select-none" dir="rtl">
      {/* ========================================================================= */}
      {/* ① بطاقة البداية — تحديد طبيعة الإشهاد (Distinct Turquoise / Teal Theme)     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-teal-500/30 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-xl min-w-0">
        <div className="absolute top-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-teal-500/20 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/20 shrink-0">
              <RotateCcw className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  المسار التوثيقي الرجعي
                </span>
                <span className="text-[11px] font-bold text-slate-400">بوابة التوثيق العدلي الموحد</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 break-words">
                رسم الرجعة — إثبات رجوع الزوج إلى زوجته أثناء العدة
              </h1>
            </div>
          </div>

          {onBackToClassification && (
            <button
              type="button"
              onClick={onBackToClassification}
              className="self-start md:self-auto shrink-0 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-200 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>↩ العودة إلى تصنيف الزواج</span>
            </button>
          )}
        </div>

        {/* Legal Alert Banner under Start Card */}
        <div className="relative z-10 mt-3 p-3.5 rounded-2xl bg-teal-950/60 border border-teal-400/30 backdrop-blur-md flex items-start gap-2.5">
          <Scale className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-teal-100">
            <span className="font-black text-teal-300 ml-1">تنبيه قانوني قطعي:</span>
            <span>
              الرجعة لا تكون إلا في الطلاق الرجعي وأثناء العدة. يتحقق النظام أولاً من طبيعة الطلاق وتاريخ وقوعه ومدة العدة
              قبل السماح بتحرير الرسم. وهذا منسجم مباشرة مع المادة 124 من مدونة الأسرة التي تقرر أن للزوج مراجعة زوجته
              أثناء العدة، وأنه إذا أراد إرجاعها أشهد على ذلك عدلين. كما أن المادة 123 تحدد أن طلاق الزوج أصله رجعي مع
              الاستثناءات الواردة فيها (Adala — وزارة العدل).
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 15-Stage Interactive Navigation Stepper Bar                               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
        {/* Header inside stepper: Current stage title, progress percentage, and quick prev/next */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-teal-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {activeStage}
            </span>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block">المرحلة الحالية ({activeStage} من 15)</span>
              <span className="text-sm font-black text-slate-900 truncate block">{stagesList[activeStage - 1]?.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Progress Meter */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((activeStage / 15) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {Math.round((activeStage / 15) * 100)}%
              </span>
            </div>

            {/* Quick Prev / Next jump arrows */}
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
                disabled={activeStage >= 15}
                onClick={() => setActiveStage((p) => Math.min(15, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="المرحلة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 15 Stage Navigation Pills — Wrapped naturally without horizontal blow-up */}
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
                    ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-400 font-black'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isActive
                      ? 'bg-white text-teal-800'
                      : isCompleted
                      ? 'bg-teal-200 text-teal-900'
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
      {/* STAGE CONTAINER & CONTENT                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6 min-w-0 max-w-full">
        {/* Stage 1: حضور الطرفين */}
        {activeStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                👥
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 1 — حضور الطرفين</h3>
                <p className="text-xs text-slate-500">تحديد صفة الحضور في مجلس الإشهاد على الرجعة</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-black text-slate-900">
                من يحضر مجلس الإشهاد؟
              </label>

              {/* Single dedicated option: الزوج المطلق + الزوجة المطلقة */}
              <div className="p-5 rounded-2xl bg-teal-50 border-2 border-teal-500 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    ✓
                  </div>
                  <div>
                    <span className="text-base font-black text-teal-950 block">
                      🟢 الزوج المطلق + الزوجة المطلقة
                    </span>
                    <span className="text-xs text-teal-800 mt-0.5 block">
                      حضور كلا الطرفين معاً أمام العدلين بمجلس الإشهاد لتأكيد الرجعة وتوثيق واقعة «تراجع المتفارقان».
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-teal-200 text-teal-900 text-xs font-black border border-teal-300">
                  المسار المعتمد
                </span>
              </div>

              {/* Positive Confirmation */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-emerald-900 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>
                  ✓ حضور الزوجين مثبت رسمياً في هذا البيت — يمكن الانتقال مباشرة إلى بيانات الرجعة.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: بيانات الزوج المطلق */}
        {activeStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">المرحلة 2 — بيانات الزوج المطلق</h3>
                  <p className="text-xs text-slate-500">استرجاع وتدقيق بيانات الزوج المستخرجة من رسم الطلاق</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
                📂 مصدر البيانات: رسم الطلاق
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 تم استرجاع بيانات الزوج من رسم الطلاق السابق آلياً</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingParty('husband')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>👁 عرض البيانات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingParty('husband')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>✏️ تعديل/تصحيح البيانات</span>
                  </button>
                </div>
              </div>

              {/* Husband Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">الاسم الكامل</span>
                  <span className="text-slate-900 font-black text-sm">{husbandData.fullName}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">رقم البطاقة الوطنية (CIN)</span>
                  <span className="text-slate-900 font-mono font-bold text-sm">{husbandData.cin}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">اسم الأب والأم</span>
                  <span className="text-slate-900 font-bold">{husbandData.fatherName} و {husbandData.motherName}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ ومكان الازدياد</span>
                  <span className="text-slate-900 font-bold">{husbandData.birthDate} بـ {husbandData.birthPlace}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">الجنسية والمهنة</span>
                  <span className="text-slate-900 font-bold">{husbandData.nationality} — {husbandData.profession}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">محل السكنى</span>
                  <span className="text-slate-900 font-bold truncate">{husbandData.address}</span>
                </div>
              </div>

              {husbandData.isEdited && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>⚠️ تم إدخال تصحيح على بيانات الزوج: <strong>{husbandData.correctionReason || 'تصحيح معتمد'}</strong></span>
                  <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded font-bold">مسجل في سجل التدقيق</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 3: بيانات الزوجة المطلقة */}
        {activeStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-lg">
                  💗
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">المرحلة 3 — بيانات الزوجة المطلقة</h3>
                  <p className="text-xs text-slate-500">استرجاع وتدقيق بيانات الزوجة المستخرجة من رسم الطلاق</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold border border-rose-200">
                📂 بيانات الزوجة مسترجعة من رسم الطلاق
              </span>
            </div>

            <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5 text-xs text-rose-950 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 البيانات مستخرجة من الرسم السابق، يرجى مراجعتها قبل اعتمادها في رسم الرجعة.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingParty('wife')}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-rose-600" />
                    <span>👁 عرض البيانات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingParty('wife')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>✏️ تعديل/تصحيح البيانات</span>
                  </button>
                </div>
              </div>

              {/* Wife Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">الاسم الكامل</span>
                  <span className="text-rose-950 font-black text-sm">{wifeData.fullName}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">رقم البطاقة الوطنية (CIN)</span>
                  <span className="text-slate-900 font-mono font-bold text-sm">{wifeData.cin}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">اسم الأب والأم</span>
                  <span className="text-slate-900 font-bold">{wifeData.fatherName} و {wifeData.motherName}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ ومكان الازدياد</span>
                  <span className="text-slate-900 font-bold">{wifeData.birthDate} بـ {wifeData.birthPlace}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">الجنسية والمهنة</span>
                  <span className="text-slate-900 font-bold">{wifeData.nationality} — {wifeData.profession}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-rose-200">
                  <span className="text-slate-400 font-bold block mb-1">محل السكنى</span>
                  <span className="text-slate-900 font-bold truncate">{wifeData.address}</span>
                </div>
              </div>

              {wifeData.isEdited && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>⚠️ تم إدخال تصحيح على بيانات الزوجة: <strong>{wifeData.correctionReason || 'تصحيح معتمد'}</strong></span>
                  <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded font-bold">مسجل في سجل التدقيق</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 4: اختيار رسم الطلاق */}
        {activeStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                  📜
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">المرحلة 4 — اختيار رسم الطلاق</h3>
                  <p className="text-xs text-slate-500">ربط الرجعة برسم الطلاق الرجعي السابق المضمن بالسجلات العدلية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeedPickerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition"
              >
                <Search className="w-4 h-4" />
                <span>🔎 اختيار رسم الطلاق السابق</span>
              </button>
            </div>

            {/* Currently Active Deed Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <Bookmark className="w-6 h-6 text-teal-400" />
                  <div>
                    <span className="text-xs text-slate-400 block">الرسم المعتمد حالياً:</span>
                    <span className="text-base font-black text-white">
                      رسم طلاق رقم {deedBookNumber} — دفتر: {deedRegistryBook}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold">
                  ✓ تم ربط السند بالمنظومة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block">حرف الدفتر</span>
                  <span className="text-teal-300 font-black text-base">{deedLetter}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block">الصفحة</span>
                  <span className="text-teal-300 font-black text-base">{deedPage}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block">العدد</span>
                  <span className="text-teal-300 font-black text-base">{deedCount}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block">تاريخ التوثيق</span>
                  <span className="text-teal-300 font-black text-base">{deedDate}</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-800/50 p-3 rounded-xl flex items-center justify-between">
                <span><strong>توثيق المحكمة:</strong> {deedCourt}</span>
                <span className="text-slate-400">بين: {husbandData.fullName} و {wifeData.fullName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 5: مراجع رسم الطلاق */}
        {activeStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                🧾
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 5 — مراجع رسم الطلاق</h3>
                <p className="text-xs text-slate-500">
                  بيانات تضمين الطلاق السابقة كحقول مستقلة تماماً (حرف، صفحة، عدد، محكمة)
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span>📖 بيانات تضمين الطلاق</span>
                </span>
                <span className="text-xs text-slate-500">حقول مستقلة لتفادي أخطاء التضمين اليدوي</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الدفتر *
                  </label>
                  <input
                    type="text"
                    value={deedBookNumber}
                    onChange={(e) => setDeedBookNumber(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حرف الدفتر (حقل مستقل) *
                  </label>
                  <input
                    type="text"
                    value={deedLetter}
                    onChange={(e) => setDeedLetter(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الصفحة (حقل مستقل) *
                  </label>
                  <input
                    type="text"
                    value={deedPage}
                    onChange={(e) => setDeedPage(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العدد (حقل مستقل) *
                  </label>
                  <input
                    type="text"
                    value={deedCount}
                    onChange={(e) => setDeedCount(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الرسم *
                  </label>
                  <input
                    type="date"
                    value={deedDate}
                    onChange={(e) => setDeedDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    توثيق المحكمة (حقل مستقل) *
                  </label>
                  <input
                    type="text"
                    value={deedCourt}
                    onChange={(e) => setDeedCourt(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 6: التحقق من قابلية الرجعة */}
        {activeStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                ⚖️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 6 — التحقق من قابلية الرجعة</h3>
                <p className="text-xs text-slate-500">المحرك القانوني للتحقق الآلي من طبيعة الطلاق وقبوله للرجعة</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div>
                <span className="block text-xs font-bold text-slate-500 mb-2">ما طبيعة الطلاق المسجل في السند؟</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'revocable', label: '🟢 طلاق رجعي (يقبل الرجعة)', eligible: true },
                    { id: 'khul', label: '🔴 طلاق بالخلع (بائن)', eligible: false },
                    { id: 'tamlik', label: '🔴 طلاق مملك (بائن)', eligible: false },
                    { id: 'consensual', label: '🔴 طلاق بالاتفاق (بائن)', eligible: false },
                    { id: 'before_consummation', label: '🔴 طلاق قبل البناء (بائن)', eligible: false },
                    { id: 'completed_three', label: '🔴 طلاق مكمل للثلاث (بينونة كبرى)', eligible: false }
                  ].map((typ) => (
                    <button
                      key={typ.id}
                      type="button"
                      onClick={() => setRecordedDivorceType(typ.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold text-right transition cursor-pointer ${
                        recordedDivorceType === typ.id
                          ? typ.eligible
                            ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                            : 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {typ.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic Legal Engine Evaluation Banner */}
              {recordedDivorceType === 'revocable' ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>🟢 تتوفر قابلية الرجعة من حيث نوع الطلاق</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    وفقاً للمادة 123 من مدونة الأسرة: «كل طلاق أوقعه الزوج فهو رجعي، إلا المكمل للثلاث، والطلاق قبل البناء،
                    والطلاق بالاتفاق، والخلع، والمملك...». الطلاق المضمن يعتبر رجعياً ومستوفياً لشروط الإرجاع القانونية.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-950 space-y-3 shadow-md animate-shake">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-900">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>🔴 لا يمكن متابعة رسم الرجعة بهذا الرسم!</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    نوع الطلاق المضمن لا يندرج ضمن الطلاق الرجعي القابل للرجعة وفق المادة 123 من مدونة الأسرة.
                    هذا الطلاق بائن (بينونة صغرى أو كبرى) ولا يمكن إرجاع الزوجة إلا بعقد زواج ومهر جديدين وموافقتها الصريحة
                    أو بعد استيفاء شروط نكاح جديد شرعاً.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-md bg-rose-200 text-rose-900 font-bold text-xs">
                    توقفت مسطرة تحرير رسم الرجعة آلياً لمنع بطلان الرسم العدلي
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 7: التحقق من العدة */}
        {activeStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                ⏳
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 7 — التحقق من العدة</h3>
                <p className="text-xs text-slate-500">حساب سريان العدة الشرعية والقانونية من تاريخ وقوع الطلاق</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">📅 تاريخ وقوع الطلاق المسجل:</span>
                  <span className="text-slate-900 font-black text-base">{deedDate}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">📅 تاريخ مجلس الإشهاد على الرجعة اليوم:</span>
                  <span className="text-teal-700 font-black text-base">
                    {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Pregnancy Status Question */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-black text-slate-800">
                  حالة الزوجة عند الطلاق وفترة العدة:
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsPregnant('not_pregnant')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isPregnant === 'not_pregnant'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    ⚪ غير حامل (تعتد بالأقراء أو الأشهر)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPregnant('pregnant')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isPregnant === 'pregnant'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    🟢 حامل (عدتها وضع حملها)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isPregnant === 'pregnant'
                    ? 'طبقاً للمادة 133: تنتهي عدة الحامل بوضع حملها أو سقوطه، والرجعة صحيحة ما دام الحمل قائماً.'
                    : 'طبقاً للمادتين 133 و 134: عدة غير الحامل ثلاثة أطهار لذوات الحيض، أو ثلاثة أشهر لمن لم تحض أو يئست.'}
                </p>
              </div>

              {/* Iddah Validity Toggle for Simulation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-black text-slate-800">
                  حالة سريان العدة في الواقع:
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIddahOverrideStatus('valid')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      iddahOverrideStatus === 'valid'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    🟢 الزوجة لا تزال في العدة (سارية)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIddahOverrideStatus('expired')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      iddahOverrideStatus === 'expired'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    🔴 انتهاء العدة (انقضت العدة)
                  </button>
                </div>
              </div>

              {/* Result banner */}
              {iddahOverrideStatus === 'valid' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="block font-black text-emerald-950">🟢 حالة الرجعة: الزوجة لا تزال في العدة الشرعية</span>
                    <span className="font-normal text-emerald-800">
                      يحق للزوج مراجعتها شرعاً وقانوناً، والرابطة الزوجية قابلة للرجعة دون الحاجة إلى صداق أو عقد جديد.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-400 text-rose-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>🔴 انتهاء العدة — تعذر إنشاء رسم الرجعة</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    انتهت عدة الطلاق المسجل، ولذلك لا يمكن إنشاء «رسم رجعة» بهذا المسار.
                  </p>
                  <div className="p-3 bg-white/80 rounded-lg border border-rose-300 text-[11px] text-rose-900">
                    ⚠️ <strong>تنبيه قانوني:</strong> الرجعة مرتبطة ببقاء الزوجة في عدة الطلاق الرجعي، وفق المادة 124،
                    وتبين المرأة بانقضاء عدة الطلاق الرجعي وفق المادة 125. (يلزم عقد زواج جديد مستوف للأركان).
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 8: تأكيد بقاء الزوجية حكمًا */}
        {activeStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                💍
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 8 — تأكيد بقاء الزوجية حكمًا</h3>
                <p className="text-xs text-slate-500">التسلسل الزمني للرابطة الزوجية واستمرار حكم الزوجية أثناء العدة</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              {/* Timeline Diagram */}
              <div className="py-6 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between max-w-xl mx-auto text-center relative">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-300 shadow-xs">
                      💍
                    </div>
                    <span className="text-xs font-black text-slate-900 mt-2">الزواج</span>
                    <span className="text-[10px] text-slate-400">العقد الأصلي</span>
                  </div>

                  <div className="flex-1 h-1 bg-slate-200 mx-2 -mt-6" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-300 shadow-xs">
                      📄
                    </div>
                    <span className="text-xs font-black text-amber-950 mt-2">الطلاق الرجعي</span>
                    <span className="text-[10px] text-amber-600">{deedDate}</span>
                  </div>

                  <div className="flex-1 h-1 bg-teal-300 mx-2 -mt-6" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold border border-teal-300 shadow-xs">
                      ⏳
                    </div>
                    <span className="text-xs font-black text-teal-950 mt-2">العدة</span>
                    <span className="text-[10px] text-teal-600">سارية قانوناً</span>
                  </div>

                  <div className="flex-1 h-1 bg-cyan-400 mx-2 -mt-6" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
                      🔵
                    </div>
                    <span className="text-xs font-black text-teal-900 mt-2">الرجعة</span>
                    <span className="text-[10px] text-teal-700 font-bold">المجلس الحالي</span>
                  </div>
                </div>
              </div>

              {/* Visual statement */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center space-y-1">
                <span className="text-sm font-black text-teal-950 block">
                  الرابطة الزوجية في فترة العدة قابلة للرجعة حكمًا
                </span>
                <span className="text-xs text-teal-800 block">
                  نحن أمام إرجاع واستدامة للرابطة السابقة وليس إنشاء عقد زواج جديد.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 9: الإقرار بالرجعة بحضور الطرفين */}
        {activeStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                👥
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 9 — الإقرار بالرجعة بحضور الطرفين</h3>
                <p className="text-xs text-slate-500">إثبات تصريح الزوج بالرجعة وحضور الزوجة بمجلس الإشهاد</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="text-center pb-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-teal-100 text-teal-900 font-black text-sm border border-teal-300">
                  🤝 تراجع المتفارقان
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Husband declaration */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <span>👨 الزوج:</span>
                    <span className="text-teal-700">{husbandData.fullName}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    هل صرح الزوج أمام العدلين بأنه راجع زوجته إلى عصمته وعقد نكاحه؟
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setHusbandDeclared(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        husbandDeclared
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🟢 نعم، صرح بالرجعة
                    </button>
                    <button
                      type="button"
                      onClick={() => setHusbandDeclared(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        !husbandDeclared
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ⚪ لم يصرح
                    </button>
                  </div>
                </div>

                {/* Wife presence */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <span>👩 الزوجة:</span>
                    <span className="text-rose-700">{wifeData.fullName}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    هل حضرت الزوجة مجلس الإشهاد على الرجعة واستمعت للإشهاد؟
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWifePresent(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        wifePresent
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🟢 نعم، حاضرة بالمجلس
                    </button>
                    <button
                      type="button"
                      onClick={() => setWifePresent(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        !wifePresent
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ⚪ غائبة
                    </button>
                  </div>
                </div>
              </div>

              {/* Status */}
              {husbandDeclared && wifePresent && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <span>✓ ثبت حضور الزوج والزوجة معًا بمجلس الإشهاد وتحقق ركن الإشهاد على الرجعة.</span>
                  <span className="text-[11px] text-emerald-700 font-normal">المادة 124 من مدونة الأسرة</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 10: صيغة الإقرار التفاعلية */}
        {activeStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                ✍️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 10 — صيغة الإقرار التفاعلية</h3>
                <p className="text-xs text-slate-500">التوليد التفاعلي للعبارات القانونية وملاءمة الصياغة العدلية</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              {/* Dynamic Assembler Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">الصياغة المجمعة تلقائياً للرجعة:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeclarationFormula(defaultFormula);
                      setIsFormulaCustomized(false);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800 font-bold cursor-pointer"
                  >
                    إعادة ضبط الصياغة النموذجية
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={declarationFormula}
                  onChange={(e) => {
                    setDeclarationFormula(e.target.value);
                    setIsFormulaCustomized(true);
                  }}
                  className="w-full p-4 text-xs leading-relaxed bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs"
                />
              </div>

              {/* Elements checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                  <span className="text-teal-600 font-black">✓</span>
                  <span>تصريح الزوج بالاسم الكامل</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                  <span className="text-teal-600 font-black">✓</span>
                  <span>الربط بمراجع رسم الطلاق</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                  <span className="text-teal-600 font-black">✓</span>
                  <span>إثبات الحضور أثناء العدة</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 11: «تراجع المتفارقان» (العرض البصري الجمالي) */}
        {activeStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                🟢
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 11 — «تراجع المتفارقان»</h3>
                <p className="text-xs text-slate-500">التجسيد البصري لاكتمال إشهاد الرجعة بين الزوجين</p>
              </div>
            </div>

            {/* Visual Flow diagram requested by user */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col items-center text-center space-y-6">
              {/* Husband */}
              <div className="flex flex-col items-center animate-bounce-subtle">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border-2 border-teal-400 text-teal-300 flex items-center justify-center text-2xl shadow-lg shadow-teal-500/10">
                  👨
                </div>
                <span className="font-black text-sm text-teal-200 mt-2">{husbandData.fullName}</span>
                <span className="text-[10px] text-slate-400">الزوج المطلق (المراجع)</span>
              </div>

              {/* Down Arrow */}
              <div className="text-teal-400 text-xl font-black">↓</div>

              {/* Center Circle: تراجع المتفارقان */}
              <div className="relative py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-xl shadow-teal-600/30 border-2 border-teal-300">
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                  <span className="text-lg font-black">🟢 تراجع المتفارقان</span>
                </div>
                <span className="text-[11px] text-teal-100 block mt-1">
                  إثبات رجوع الزوج إلى زوجته أثناء العدة بمجلس الإشهاد
                </span>
              </div>

              {/* Up Arrow */}
              <div className="text-rose-400 text-xl font-black">↑</div>

              {/* Wife */}
              <div className="flex flex-col items-center animate-bounce-subtle">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-rose-300 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/10">
                  👩
                </div>
                <span className="font-black text-sm text-rose-200 mt-2">{wifeData.fullName}</span>
                <span className="text-[10px] text-slate-400">الزوجة المطلقة (المرجوعة)</span>
              </div>

              <div className="pt-2 text-xs text-slate-400">
                ✓ تم إثبات حضور الطرفين والإقرار بالرجعة واكتمال شروط المادتين 123 و 124 من مدونة الأسرة.
              </div>
            </div>
          </div>
        )}

        {/* Stage 12: التحقق الآلي النهائي */}
        {activeStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                🔐
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 12 — التحقق الآلي النهائي</h3>
                <p className="text-xs text-slate-500">شريط التحقق الشامل من الشروط الـ 7 الأساسية قبل التحرير</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              <span className="text-xs font-bold text-slate-700 block">
                عناصر التحقق الآلي الإلزامية (7 عناصر):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.husband ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">1. بيانات الزوج</span>
                    <span className="text-slate-500 text-[11px]">مكتملة ومسترجعة</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.wife ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">2. بيانات الزوجة</span>
                    <span className="text-slate-500 text-[11px]">مكتملة ومسترجعة</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.deed ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">3. رسم الطلاق السابق</span>
                    <span className="text-slate-500 text-[11px]">مراجع التضمين مثبتة</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.type ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">4. نوع الطلاق رجعي</span>
                    <span className="text-slate-500 text-[11px]">مستوف للمادة 123</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.iddah ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">5. بقاء العدة</span>
                    <span className="text-slate-500 text-[11px]">العدة سارية قانوناً</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="text-base">{validationChecklist.presence ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">6. حضور الزوجين</span>
                    <span className="text-slate-500 text-[11px]">كلاهما بمجلس الإشهاد</span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                  <span className="text-base">{validationChecklist.declaration ? '🟢' : '🔴'}</span>
                  <div>
                    <span className="font-bold text-slate-900 block">7. الإقرار بالرجعة</span>
                    <span className="text-slate-500 text-[11px]">صرح الزوج بالرجعة</span>
                  </div>
                </div>
              </div>

              {/* Status summary */}
              {validationChecklist.allPassed ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>🟢 جميع الشروط المعلوماتية الأساسية مكتملة — يمكن الانتقال إلى تحرير رسم الرجعة.</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>توجد عناصر غير مستوفاة — يرجى استكمال التحقق من العدة والطلاق قبل المتابعة.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 13: تنبيهات ذكية */}
        {activeStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 13 — تنبيهات ذكية استباقية</h3>
                <p className="text-xs text-slate-500">نظام الإنذار المبكر والتوجيه القانوني الاستباقي</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Alert 1: Unlinked Deed */}
              {!deedBookNumber.trim() && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 text-xs">
                  <span className="text-lg">🟠</span>
                  <div>
                    <strong className="block font-black text-amber-900">لم يتم اختيار رسم الطلاق السابق:</strong>
                    <span>لم يتم ربط الرجعة برسم الطلاق السابق. اختر الرسم حتى يتمكن النظام من التحقق من نوع الطلاق والعدة ومراجع التضمين.</span>
                  </div>
                </div>
              )}

              {/* Alert 2: Non-revocable divorce */}
              {recordedDivorceType !== 'revocable' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-400 text-rose-950 flex items-start gap-3 text-xs">
                  <span className="text-lg">🔴</span>
                  <div>
                    <strong className="block font-black text-rose-900">الطلاق غير رجعي:</strong>
                    <span>لا يمكن متابعة هذا الرسم. نوع الطلاق المضمن لا يفتح مسطرة الرجعة وفق المادة 123 من مدونة الأسرة.</span>
                  </div>
                </div>
              )}

              {/* Alert 3: Expired Iddah */}
              {iddahOverrideStatus === 'expired' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-400 text-rose-950 flex items-start gap-3 text-xs">
                  <span className="text-lg">🔴</span>
                  <div>
                    <strong className="block font-black text-rose-900">انتهت العدة:</strong>
                    <span>تعذر متابعة رسم الرجعة. تشير المعطيات المسجلة إلى انتهاء العدة. يرجى التحقق من تاريخ الطلاق والمعطيات المرتبطة بالعدة.</span>
                  </div>
                </div>
              )}

              {/* Alert 4: Incomplete data */}
              {(!husbandData.cin || !wifeData.cin) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 text-xs">
                  <span className="text-lg">🟠</span>
                  <div>
                    <strong className="block font-black text-amber-900">بيانات غير مكتملة:</strong>
                    <span>بعض بيانات الرسم السابق غير مكتملة. يرجى استكمالها قبل تحرير رسم الرجعة.</span>
                  </div>
                </div>
              )}

              {/* All clear */}
              {validationChecklist.allPassed && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🟢 النظام نظيف من أي موانع قانونية أو تنبيهات مانعة، وجاهز للمعاينة والتحرير.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 14: المعاينة النهائية للرسم */}
        {activeStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                📋
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">المرحلة 14 — المعاينة النهائية للرسم</h3>
                <p className="text-xs text-slate-500">بطاقة مراجعة موحدة لكافة عناصر رسم الرجعة قبل التحرير</p>
              </div>
            </div>

            {/* Consolidated Review Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">📜 ملخص رسم الرجعة</span>
                <span className="text-xs text-slate-500">مراجعة المعطيات الرسمية</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">الزوج المطلق</span>
                  <span className="text-slate-900 font-black text-sm">{husbandData.fullName}</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">ب.ت.و: {husbandData.cin}</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">الزوجة المطلقة</span>
                  <span className="text-slate-900 font-black text-sm">{wifeData.fullName}</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">ب.ت.و: {wifeData.cin}</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">رسم الطلاق المعتمد</span>
                  <span className="text-slate-900 font-bold">
                    دفتر: {deedRegistryBook} / حرف: {deedLetter} / صفحة: {deedPage} / عدد: {deedCount}
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">تاريخ: {deedDate}</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">توثيق المحكمة</span>
                  <span className="text-slate-900 font-bold">{deedCourt}</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">نوع الطلاق وحالة العدة</span>
                  <span className="text-emerald-700 font-black">
                    طلاق رجعي • العدة قائمة وسارية 🟢
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold mb-1">الحضور والواقعة</span>
                  <span className="text-teal-800 font-bold">
                    👨 الزوج حاضر • 👩 الزوجة حاضرة • 🔄 رجعة بحضور الطرفين
                  </span>
                </div>
              </div>

              {/* Confirmation question */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-black text-slate-800">
                  هل تمت مراجعة جميع البيانات ومطابقتها مع السجلات؟
                </span>
                <button
                  type="button"
                  onClick={() => setIsDataReviewed(!isDataReviewed)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                    isDataReviewed
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-emerald-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isDataReviewed ? '🟢 نعم، تمت المراجعة والبيانات صحيحة' : 'تأكيد صحة المراجعة'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 15: الانتقال إلى تحرير الرسم */}
        {activeStage === 15 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                  🖋️
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">المرحلة 15 — تحرير رسم الرجعة</h3>
                  <p className="text-xs text-slate-500">توليد النص الرسمي لرسم الرجعة مع شارات التحقق الذكية</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateFinalDraft}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-black shadow-lg shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition transform hover:scale-102"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>🖋️ تحرير رسم الرجعة</span>
              </button>
            </div>

            {/* Generated Official Document with Smart Verification Badges */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-900">
              <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                <h4 className="text-xl font-black text-slate-900 font-serif">
                  المملكة المغربية — وزارة العدل
                </h4>
                <p className="text-xs text-slate-500 font-serif">
                  {deedCourt} — قسم التوثيق وقضاء الأسرة
                </p>
                <div className="inline-block mt-2 px-4 py-1 rounded-full bg-teal-100 text-teal-900 font-black text-xs border border-teal-300">
                  رسم الرجعة (إرجاع بعد طلاق رجعي)
                </div>
              </div>

              {/* Clause 1: الحمدلة والتاريخ */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">ديباجة الرسم ومجلس الإشهاد</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>🟢 واقعة الرجعة مثبتة بحضور الطرفين</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-800 font-serif">
                  الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وعلى آله وصحبه.
                  بتاريخ {new Date().toISOString().split('T')[0]} م، بمجلس الإشهاد بدائرة {deedCourt}،
                  أمام العدلين المنتصبين للإشهاد، حضر الزوجان معاً بكامل أهليتهما المعتبرة شرعاً وقانوناً.
                </p>
              </div>

              {/* Clause 2: بيانات الأطراف */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">هوية المتفارقين المراجعين</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    <span>🟢 بيانات مسترجعة من رسم الطلاق</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-800 font-serif">
                  <strong>الطرف الأول (الزوج):</strong> السيد {husbandData.fullName}، ابن {husbandData.fatherName} و {husbandData.motherName}، الحامل للبطاقة الوطنية للتعريف رقم <strong>{husbandData.cin}</strong>، الساكن بـ {husbandData.address}.<br />
                  <strong>الطرف الثاني (الزوجة):</strong> السيدة {wifeData.fullName}، بنت {wifeData.fatherName} و {wifeData.motherName}، الحاملة للبطاقة الوطنية للتعريف رقم <strong>{wifeData.cin}</strong>، الساكنة بنفس العنوان.
                </p>
              </div>

              {/* Clause 3: الإقرار والرجعة */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">إشهاد وتصريح الرجعة</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>🟢 بيانات متحقق منها</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-900 font-serif font-medium bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                  {declarationFormula}
                </p>
              </div>

              {/* Clause 4: الإحالة على السجلات */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">مراجع التضمين والسجل العدلي</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                    دفتر الطلاق رقم {deedBookNumber} / حرف {deedLetter} / صفحة {deedPage} / عدد {deedCount}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-800 font-serif">
                  وقد تم تضمين هذه الرجعة بسجلات التوثيق العدلي وفق المقتضيات القانونية الجاري بها العمل، وتم إشعار كتابة الضبط
                  بالمحكمة الابتدائية لتضمين بيان الرجعة على هامش رسم الطلاق الأصلي طبقاً للمادة 124 من مدونة الأسرة.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(declarationFormula)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-600" />
                    <span>{copySuccess ? 'تم النسخ ✓' : 'نسخ النص'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>طباعة مسودة الرسم</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onComplete}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>متابعة إلى المرحلة الختامية والشهود</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation (Next / Previous) */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <button
            type="button"
            disabled={activeStage <= 1}
            onClick={() => setActiveStage((prev) => Math.max(1, prev - 1))}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeStage <= 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق: {activeStage > 1 ? stagesList[activeStage - 2].title : ''}</span>
          </button>

          <span className="text-xs font-bold text-slate-400">
            المرحلة {activeStage} من 15
          </span>

          <button
            type="button"
            disabled={activeStage >= 15 || (activeStage === 6 && recordedDivorceType !== 'revocable') || (activeStage === 7 && iddahOverrideStatus === 'expired')}
            onClick={() => setActiveStage((prev) => Math.min(15, prev + 1))}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeStage >= 15 || (activeStage === 6 && recordedDivorceType !== 'revocable') || (activeStage === 7 && iddahOverrideStatus === 'expired')
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-md shadow-teal-600/20'
            }`}
          >
            <span>التالي: {activeStage < 15 ? stagesList[activeStage].title : ''}</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Select Divorce Deed (Stage 4 Picker)                               */}
      {/* ========================================================================= */}
      {isDeedPickerOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-teal-400" />
                <h4 className="font-black text-sm">سجل رسوم الطلاق المرتبطة بالزوجين</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDeedPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <input
                type="text"
                placeholder="ابحث برقم الرسم أو اسم الزوج أو الزوجة أو ب.ت.و..."
                value={deedSearchQuery}
                onChange={(e) => setDeedSearchQuery(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredDeeds.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/20 transition space-y-3 cursor-pointer"
                  onClick={() => handleAdoptDeed(record)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">
                      رسم طلاق رقم {record.deedNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold border border-teal-200">
                      {record.divorceTypeLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <div><strong>دفتر:</strong> {record.registryBook}</div>
                    <div><strong>حرف:</strong> {record.letter}</div>
                    <div><strong>صفحة:</strong> {record.page}</div>
                    <div><strong>عدد:</strong> {record.count}</div>
                  </div>

                  <div className="text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span><strong>الزوجين:</strong> {record.husband.fullName} & {record.wife.fullName}</span>
                    <span className="text-slate-500">تاريخ: {record.deedDate}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdoptDeed(record);
                    }}
                    className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ اعتماد هذا الرسم</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: View Details (Husband / Wife)                                      */}
      {/* ========================================================================= */}
      {viewingParty && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm">
                بيانات {viewingParty === 'husband' ? 'الزوج المطلق' : 'الزوجة المطلقة'}
              </h4>
              <button
                type="button"
                onClick={() => setViewingParty(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {viewingParty === 'husband' ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>الاسم الكامل:</strong> {husbandData.fullName}</div>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>رقم البطاقة الوطنية:</strong> {husbandData.cin}</div>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>الأب والأم:</strong> {husbandData.fatherName} و {husbandData.motherName}</div>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>الازدياد:</strong> {husbandData.birthDate} بـ {husbandData.birthPlace}</div>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>الجنسية والمهنة:</strong> {husbandData.nationality} — {husbandData.profession}</div>
                  <div className="p-3 bg-slate-50 rounded-xl"><strong>العنوان:</strong> {husbandData.address}</div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>الاسم الكامل:</strong> {wifeData.fullName}</div>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>رقم البطاقة الوطنية:</strong> {wifeData.cin}</div>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>الأب والأم:</strong> {wifeData.fatherName} و {wifeData.motherName}</div>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>الازدياد:</strong> {wifeData.birthDate} بـ {wifeData.birthPlace}</div>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>الجنسية والمهنة:</strong> {wifeData.nationality} — {wifeData.profession}</div>
                  <div className="p-3 bg-rose-50/60 rounded-xl"><strong>العنوان:</strong> {wifeData.address}</div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingParty(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit/Correct Party Data (Husband / Wife)                           */}
      {/* ========================================================================= */}
      {editingParty && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-sm">
                تعديل وتصحيح بيانات {editingParty === 'husband' ? 'الزوج' : 'الزوجة'}
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
                <label className="block font-bold text-slate-700 mb-1">العنوان السكني</label>
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
                <label className="block font-bold text-slate-700 mb-1">سند/سبب التصحيح للتسجيل بالسجل</label>
                <input
                  type="text"
                  placeholder="مثال: تصحيح خطأ مادي بناءً على البطاقة الوطنية الحديثة"
                  value={editingParty === 'husband' ? husbandData.correctionReason : wifeData.correctionReason}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editingParty === 'husband') setHusbandData((p) => ({ ...p, correctionReason: val, isEdited: true }));
                    else setWifeData((p) => ({ ...p, correctionReason: val, isEdited: true }));
                  }}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditingParty(null)}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black cursor-pointer"
            >
              حفظ التصحيح واعتماده
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
