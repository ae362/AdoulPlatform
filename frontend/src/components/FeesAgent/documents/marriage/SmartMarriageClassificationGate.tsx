import React, { useState, useMemo } from 'react';
import {
  Users,
  Baby,
  UserCheck,
  Brain,
  RotateCcw,
  FileCheck2,
  History,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Scale,
  ShieldCheck,
  Sparkles,
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
  BookOpen
} from 'lucide-react';
import type {
  FeesAgentState,
  MarriageClassificationType,
  MinorMarriageParty,
  SmartMarriageClassificationData,
  JudgePermissionDetails,
  PreviousMarriageContractDetails
} from '../../../../types/feesAgentTypes';
import { NationalMarriageStatsModal } from './NationalMarriageStatsModal';

interface SmartMarriageClassificationGateProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const SmartMarriageClassificationGate: React.FC<SmartMarriageClassificationGateProps> = ({
  state,
  setState,
  onConfirm,
  onCancel
}) => {
  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Current classification from state or defaults
  const currentClassification = state.marriageClassification;

  const [selectedType, setSelectedType] = useState<MarriageClassificationType>(
    currentClassification?.primaryType || 'adult_marriage'
  );

  const [minorParty, setMinorParty] = useState<MinorMarriageParty>(
    currentClassification?.minorParty || 'wife'
  );

  // Judge Permission State
  const [judgePermNumber, setJudgePermNumber] = useState<string>(
    currentClassification?.judgePermission?.permissionNumber || ''
  );
  const [judgePermDate, setJudgePermDate] = useState<string>(
    currentClassification?.judgePermission?.permissionDate || ''
  );
  const [judgeCourt, setJudgeCourt] = useState<string>(
    currentClassification?.judgePermission?.courtName || state.meta?.court || 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة'
  );
  const [judgeName, setJudgeName] = useState<string>(
    currentClassification?.judgePermission?.judgeName || ''
  );
  const [permVerificationStatus, setPermVerificationStatus] = useState<
    'idle' | 'verifying' | 'verified' | 'failed'
  >(
    currentClassification?.judgePermission?.isVerified ? 'verified' : 'idle'
  );

  // Medical Report (for mental disability)
  const [medicalReportNumber, setMedicalReportNumber] = useState<string>(
    currentClassification?.medicalReport?.reportNumber || ''
  );
  const [doctorName, setDoctorName] = useState<string>(
    currentClassification?.medicalReport?.doctorName || ''
  );
  const [clinicName, setClinicName] = useState<string>(
    currentClassification?.medicalReport?.clinicName || ''
  );
  const [medicalReportDate, setMedicalReportDate] = useState<string>(
    currentClassification?.medicalReport?.reportDate || ''
  );
  const [otherPartyConsent, setOtherPartyConsent] = useState<boolean>(true);

  // Self Contracting Female
  const [selfContractingMode, setSelfContractingMode] = useState<'direct' | 'delegated'>(
    'direct'
  );

  // Revocable Reconciliation Details
  const [divorceDeedNumber, setDivorceDeedNumber] = useState<string>(
    currentClassification?.reconciliationDetails?.divorceDeedNumber || ''
  );
  const [divorceDate, setDivorceDate] = useState<string>(
    currentClassification?.reconciliationDetails?.divorceDate || ''
  );
  const [revocationDate, setRevocationDate] = useState<string>(
    currentClassification?.reconciliationDetails?.revocationDate || new Date().toISOString().split('T')[0]
  );
  const [divorceCourt, setDivorceCourt] = useState<string>(
    currentClassification?.reconciliationDetails?.divorceCourt || state.meta?.court || 'المحكمة الابتدائية بطنجة'
  );
  const [isIddahValid, setIsIddahValid] = useState<boolean>(
    currentClassification?.reconciliationDetails?.isIddahValid ?? true
  );

  // Stipulated conditions
  const [conditions, setConditions] = useState<string[]>(
    currentClassification?.stipulatedConditions && currentClassification.stipulatedConditions.length > 0
      ? currentClassification.stipulatedConditions
      : ['ألا يتزوج عليها', 'مواصلة عملها المهني بصفة اعتيادية']
  );
  const [newConditionText, setNewConditionText] = useState<string>('');

  // Previous Marriage Contract Linker
  const [prevHusbandName, setPrevHusbandName] = useState<string>(
    currentClassification?.previousContract?.husbandName || ''
  );
  const [prevWifeName, setPrevWifeName] = useState<string>(
    currentClassification?.previousContract?.wifeName || ''
  );
  const [prevDeedNumber, setPrevDeedNumber] = useState<string>(
    currentClassification?.previousContract?.deedNumber || ''
  );
  const [prevDeedDate, setPrevDeedDate] = useState<string>(
    currentClassification?.previousContract?.deedDate || ''
  );
  const [prevCourt, setPrevCourt] = useState<string>(
    currentClassification?.previousContract?.courtName || state.meta?.court || ''
  );
  const [prevInclusionRef, setPrevInclusionRef] = useState<string>(
    currentClassification?.previousContract?.inclusionRef || ''
  );
  const [renewalReason, setRenewalReason] = useState<string>(
    'تصحيح خطأ مادي في رسم الزواج'
  );
  const [isPrevDeedLinked, setIsPrevDeedLinked] = useState<boolean>(
    currentClassification?.previousContract?.isLinked || false
  );

  // Card definitions
  const classificationCards = [
    {
      id: 'adult_marriage' as MarriageClassificationType,
      title: 'زواج الراشد',
      badge: 'مسار عادي',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Users,
      iconColor: 'text-emerald-600',
      activeBorder: 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/40',
      desc: 'زواج راشدين أتما سن الأهلية القانونية (18 سنة شمسية كاملة).',
      legalBasis: 'المادة 19 من مدونة الأسرة',
      requiredDocs: [
        'بطاقة التعريف الوطنية للزوجين',
        'شهادة إدارية للخطوبة / العزوبة',
        'شهادة طبية قبل الزواج لكليهما',
        'نسخة كاملة من رسم الولادة'
      ]
    },
    {
      id: 'minor_marriage' as MarriageClassificationType,
      title: 'زواج القاصر',
      badge: 'يتطلب إذن قاضي التوثيق',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: Baby,
      iconColor: 'text-amber-600',
      activeBorder: 'border-amber-500 ring-4 ring-amber-100 bg-amber-50/40',
      desc: 'زواج أحد الطرفين أو كليهما قبل بلوغ سن 18 سنة شمسية.',
      legalBasis: 'المادتان 20 و 21 من مدونة الأسرة',
      requiredDocs: [
        'مقرر إذن بالزواج صادر عن قاضي التوثيق المختص',
        'شهادة الفحص الطبي أو تقرير البحث الاجتماعي للقاصر',
        'موافقة النائب الشرعي أو حضور مجلس العقد',
        'شهادة طبية ورسم الولادة'
      ]
    },
    {
      id: 'self_contracting_female' as MarriageClassificationType,
      title: 'زواج الراشدة التي زوجت نفسها',
      badge: 'مسار خاص (المادة 25)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: UserCheck,
      iconColor: 'text-purple-600',
      activeBorder: 'border-purple-500 ring-4 ring-purple-100 bg-purple-50/40',
      desc: 'ممارسة الرشيدة لحقها القانوني في عقد زواجها بنفسها أو تفويض ذلك.',
      legalBasis: 'المادة 25 من مدونة الأسرة',
      requiredDocs: [
        'بطاقة التعريف الوطنية تثبت بلوغ سن الرشد (18 سنة)',
        'شهادة الخطوبة / العزوبة أو الطلاق أو الوفاة',
        'شهادة طبية قبل الزواج',
        'وثيقة التفويض للولي (في حال اختارت التفويض)'
      ]
    },
    {
      id: 'mental_disability' as MarriageClassificationType,
      title: 'زواج ذي إعاقة ذهنية',
      badge: 'إذن قاضي التوثيق + تقرير طبي',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: Brain,
      iconColor: 'text-rose-600',
      activeBorder: 'border-rose-500 ring-4 ring-rose-100 bg-rose-50/40',
      desc: 'زواج الشخص المصاب بإعاقة ذهنية مع إحاطة الطرف الآخر وحماية حقوقه.',
      legalBasis: 'المادة 23 من مدونة الأسرة',
      requiredDocs: [
        'إذن صادر عن قاضي التوثيق بعد الاطلاع على تقرير طبي',
        'تقرير طبيب مختص في الأمراض العقلية أو النفسية',
        'إشهاد رسمي بإشعار الطرف الآخر ورضاه الصريح',
        'الوثائق الإدارية العادية'
      ]
    },
    {
      id: 'revocable_reconciliation' as MarriageClassificationType,
      title: 'الزواج الرجعي (إرجاع المطلقة)',
      badge: 'مسار التوثيق الرجعي',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: RotateCcw,
      iconColor: 'text-blue-600',
      activeBorder: 'border-blue-500 ring-4 ring-blue-100 bg-blue-50/40',
      desc: 'إرجاع الزوجة أثناء فترة العدة الشرعية من طلاق رجعي قائم.',
      legalBasis: 'المواد 123 إلى 126 من مدونة الأسرة',
      requiredDocs: [
        'نسخة رسم الطلاق الرجعي الصادر عن المحكمة',
        'إثبات استمرار فترة العدة الشرعية (دون انقضائها)',
        'شهادة إخبار الزوجة بالإرجاع أو حضورها للتوقيع',
        'بطاقات الهوية الوطنية للطرفين'
      ]
    },
    {
      id: 'stipulated_conditions' as MarriageClassificationType,
      title: 'زواج مقترن بشروط اتفاقية',
      badge: 'شروط اتفاقية ملزمة',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: FileCheck2,
      iconColor: 'text-amber-700',
      activeBorder: 'border-amber-600 ring-4 ring-amber-100 bg-amber-50/40',
      desc: 'تضمين شروط قانونية متفق عليها بين الزوجين أو اتفاق تدبير الأموال المشتركة.',
      legalBasis: 'المادتان 47 و 49 من مدونة الأسرة',
      requiredDocs: [
        'لائحة الشروط المتفق عليها كتابة وموقعة من الطرفين',
        'عقد تدبير الأموال المشتركة (إذا تم اختياره مستقلا)',
        'الوثائق العادية للزواج'
      ]
    },
    {
      id: 'contract_renewal' as MarriageClassificationType,
      title: 'تجديد أو تصحيح عقد زواج',
      badge: 'مسار الإلحاق والتعديل',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: History,
      iconColor: 'text-slate-600',
      activeBorder: 'border-slate-500 ring-4 ring-slate-100 bg-slate-50/40',
      desc: 'تصحيح خطأ مادي أو تجديد رسم تالف أو إضافة بيان لاحق على رسم أصلي.',
      legalBasis: 'مقتضيات خطة العدالة وقانون الحالة المدنية',
      requiredDocs: [
        'نسخة من رسم الزواج الأصلي أو رقم تضمينه',
        'شهادة ضياع أو تلف الرسم إن وجد',
        'إذن المحكمة بالتصحيح أو التجديد',
        'بطاقات التعريف الوطنية'
      ]
    }
  ];

  const currentCard = useMemo(() => {
    return classificationCards.find((c) => c.id === selectedType) || classificationCards[0];
  }, [selectedType]);

  // Simulated Judge Permission Auto-Verification
  const handleVerifyJudgePermission = () => {
    if (!judgePermNumber.trim()) {
      alert('يرجى إدخال رقم إذن قاضي التوثيق أولًا.');
      return;
    }
    setPermVerificationStatus('verifying');
    setTimeout(() => {
      // Mock realistic verification against digital docket records
      setPermVerificationStatus('verified');
    }, 1100);
  };

  // Conditions management
  const handleAddCondition = () => {
    if (newConditionText.trim()) {
      setConditions((prev) => [...prev, newConditionText.trim()]);
      setNewConditionText('');
    }
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  // Check overall readiness
  const isReady = useMemo(() => {
    if (selectedType === 'minor_marriage') {
      return (
        judgePermNumber.trim().length > 0 &&
        permVerificationStatus === 'verified'
      );
    }
    if (selectedType === 'mental_disability') {
      return (
        judgePermNumber.trim().length > 0 &&
        permVerificationStatus === 'verified' &&
        medicalReportNumber.trim().length > 0 &&
        otherPartyConsent
      );
    }
    if (selectedType === 'revocable_reconciliation') {
      return divorceDeedNumber.trim().length > 0 && isIddahValid;
    }
    if (selectedType === 'contract_renewal') {
      return prevDeedNumber.trim().length > 0;
    }
    return true;
  }, [
    selectedType,
    judgePermNumber,
    permVerificationStatus,
    medicalReportNumber,
    otherPartyConsent,
    divorceDeedNumber,
    isIddahValid,
    prevDeedNumber
  ]);

  // Confirm and proceed to Step1
  const handleProceed = () => {
    const classificationPayload: SmartMarriageClassificationData = {
      primaryType: selectedType,
      minorParty: selectedType === 'minor_marriage' ? minorParty : undefined,
      judgePermission:
        selectedType === 'minor_marriage' || selectedType === 'mental_disability'
          ? {
              permissionNumber: judgePermNumber,
              permissionDate: judgePermDate,
              courtName: judgeCourt,
              judgeName: judgeName,
              isVerified: permVerificationStatus === 'verified',
              status: permVerificationStatus === 'verified' ? 'verified' : 'pending'
            }
          : undefined,
      medicalReport:
        selectedType === 'mental_disability'
          ? {
              reportNumber: medicalReportNumber,
              doctorName: doctorName,
              clinicName: clinicName,
              reportDate: medicalReportDate,
              isVerified: true
            }
          : undefined,
      isSelfContracting: selectedType === 'self_contracting_female' ? selfContractingMode === 'direct' : undefined,
      reconciliationDetails:
        selectedType === 'revocable_reconciliation'
          ? {
              divorceDeedNumber,
              divorceDate,
              revocationDate,
              divorceCourt,
              isIddahValid
            }
          : undefined,
      stipulatedConditions:
        selectedType === 'stipulated_conditions' ? conditions : undefined,
      previousContract:
        selectedType === 'contract_renewal'
          ? {
              husbandName: prevHusbandName,
              wifeName: prevWifeName,
              deedNumber: prevDeedNumber,
              deedDate: prevDeedDate,
              courtName: prevCourt,
              inclusionRef: prevInclusionRef,
              isLinked: isPrevDeedLinked
            }
          : undefined,
      readinessStatus: {
        isTypeSelected: true,
        isSpecialPathResolved: selectedType !== 'adult_marriage',
        isJudgePermissionValid: permVerificationStatus === 'verified',
        isConditionsRecorded: conditions.length > 0,
        isPreviousContractLinked: isPrevDeedLinked,
        isReadyToDraft: true
      },
      confirmedAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      marriageClassification: classificationPayload,
      step: 1
    }));

    onConfirm();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-3">
              <Scale className="w-3.5 h-3.5 text-blue-300" />
              <span>نظام التوثيق العدلي الذكي — قسم قضاء الأسرة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>⚖️ تحديد نوع الزواج والتحقق من المسار الإجرائي</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-3xl">
              يرجى تحديد طبيعة الزواج قبل البدء في إدخال بيانات الرسم. سيحدد اختيارك المسار الإجرائي والبيانات
              والوثائق التي سيطلبها النظام، كما سيتم اعتماد التصنيف آلياً في الإحصائيات الوطنية للزواج.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => setShowStatsModal(true)}
              type="button"
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-900/20 flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-amber-100" />
              <span>📊 لوحة الإحصائيات الوطنية للزواج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 7 Classification Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-sm font-black">
              1
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              اختر نوع الزواج المعتمد للشهادة
            </h2>
          </div>
          <span className="text-xs text-gray-500">انقر على البطاقة لتفعيل المسار القانوني</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classificationCards.map((card) => {
            const Icon = card.icon;
            const isSelected = selectedType === card.id;

            return (
              <div
                key={card.id}
                onClick={() => {
                  setSelectedType(card.id);
                  if (card.id !== 'minor_marriage' && card.id !== 'mental_disability') {
                    setPermVerificationStatus('idle');
                  }
                }}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative flex flex-col justify-between hover:shadow-lg ${
                  isSelected
                    ? `${card.activeBorder} shadow-md`
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 left-3 bg-blue-600 text-white rounded-full p-1 shadow">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {card.title}
                      </h3>
                      <span
                        className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                      >
                        {card.badge}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed mb-3">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-medium text-slate-700">{card.legalBasis}</span>
                  <span className="text-blue-600 font-semibold">
                    {isSelected ? 'المسار محدد ✓' : 'اختيار'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail / Requirements Panel Based on Selected Type */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <currentCard.icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>مسار الإجراءات:</span>
                <span className="text-blue-700">{currentCard.title}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${currentCard.badgeColor}`}>
                  {currentCard.badge}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{currentCard.legalBasis}</p>
            </div>
          </div>
        </div>

        {/* 1. زواج الراشد (Normal path) */}
        {selectedType === 'adult_marriage' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-900 leading-relaxed">
                <span className="font-bold">المسار العادي مكتمل الشروط القانونية:</span>
                <p className="text-xs text-emerald-800 mt-1">
                  كلا الزوجين راشدان ومتمتعان بالأهلية المدنية الكاملة (18 سنة شمسية فما فوق). لا يحتاج هذا
                  المسار إلى تراخيص قضائية استثنائية، ويمكنك الشروع مباشرة في إدخال بيانات الطرفين والشروط العادية.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-700 block mb-2">📋 الوثائق الإدارية المطلوبة:</span>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  {currentCard.requiredDocs.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex flex-col justify-center">
                <span className="text-xs font-bold text-blue-900 mb-1">💡 فحص التوافق التلقائي مفعل</span>
                <p className="text-xs text-blue-800 leading-relaxed">
                  عند الانتقال لإدخال بيانات الطرفين، سيقوم النظام بالتحقق التلقائي من تاريخ ميلاد الزوجين
                  وحساب أعمارهما بدقة بالغة لضمان عدم وجود أطراف قاصرين تحت هذا المسار.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. زواج القاصر (Minor path with Judge Permission) */}
        {selectedType === 'minor_marriage' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900 leading-relaxed">
                <span className="font-bold">تنبيه قانوني ملزم (المادتان 20 و 21 من مدونة الأسرة):</span>
                <p className="text-xs text-amber-800 mt-1">
                  لا يجوز إبرام عقد زواج من لم يبلغ سن الأهلية (18 سنة) إلا بمقرر معلل صادر عن قاضي التوثيق
                  المكلف بالزواج، بعد الاستماع للأبوين وإجراء خبرة طبية أو بحث اجتماعي.
                </p>
              </div>
            </div>

            {/* Minor Party Choice */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                حدد الطرف القاصر في عقد الزواج:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'wife' as MinorMarriageParty, label: '👧 الزوجة قاصرة (دون 18 سنة)' },
                  { id: 'husband' as MinorMarriageParty, label: '👦 الزوج قاصر (دون 18 سنة)' },
                  { id: 'both' as MinorMarriageParty, label: '👥 كلا الطرفين قاصران' }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMinorParty(option.id)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all text-center ${
                      minorParty === option.id
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Judge Permission Card */}
            <div className="border border-amber-300 bg-amber-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-700" />
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                    بيانات إذن قاضي التوثيق الإلزامي
                  </h4>
                </div>
                {permVerificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    🟢 تم التحقق ومطابقة بياناته
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    🟠 يتطلب التحقق للمتابعة
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رقم إذن الزواج *
                  </label>
                  <input
                    type="text"
                    value={judgePermNumber}
                    onChange={(e) => {
                      setJudgePermNumber(e.target.value);
                      setPermVerificationStatus('idle');
                    }}
                    placeholder="مثال: 4587 / 2026"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    تاريخ صدور الإذن *
                  </label>
                  <input
                    type="date"
                    value={judgePermDate}
                    onChange={(e) => setJudgePermDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    المحكمة الابتدائية المصدرة (قضاء الأسرة)
                  </label>
                  <input
                    type="text"
                    value={judgeCourt}
                    onChange={(e) => setJudgeCourt(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم قاضي التوثيق
                  </label>
                  <input
                    type="text"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    placeholder="مثال: ذ. عبد الرحيم العلمي"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Verification Button & Status */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleVerifyJudgePermission}
                  disabled={permVerificationStatus === 'verifying'}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    permVerificationStatus === 'verified'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {permVerificationStatus === 'verifying' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري مطابقة الإذن مع قاعدة بيانات المحكمة...</span>
                    </>
                  ) : permVerificationStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>إعادة التحقق من الإذن</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>🔍 تحقق فوري من صحة إذن القاضي</span>
                    </>
                  )}
                </button>

                {permVerificationStatus === 'verified' && (
                  <div className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تم التحقق الإلكتروني ومطابقة رقم الإذن مع السجل الرقمي لقضاء الأسرة بنجاح</span>
                  </div>
                )}
                {permVerificationStatus === 'idle' && (
                  <span className="text-xs text-gray-500">
                    💡 يمكنك الضغط على زر التحقق بعد كتابة رقم الإذن
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. زواج الراشدة التي زوجت نفسها */}
        {selectedType === 'self_contracting_female' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-900 leading-relaxed">
                <span className="font-bold">نص المادة 25 من مدونة الأسرة:</span>
                <p className="text-xs text-purple-800 mt-1 italic">
                  «للرشيدة أن تعقد زواجها بنفسها، أو تفوض ذلك لأبيها أو لأحد أقاربها».
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  تتمتع المرأة الراشدة بكامل حرية الإرادة لمباشرة العقد بصفتها أصيلة دون إذن أو وصاية.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                كيفية ممارسة ولاية الزواج:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelfContractingMode('direct')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right ${
                    selfContractingMode === 'direct'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>مباشرة: عقدت زواجها بنفسها أصالة</span>
                    {selfContractingMode === 'direct' && <Check className="w-4 h-4" />}
                  </div>
                  <span className="block text-[10px] opacity-80 mt-1 font-normal">
                    تحضر بنفسها وتوقع مجلس العقد مع الزوج دون الحاجة لولي
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelfContractingMode('delegated')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right ${
                    selfContractingMode === 'delegated'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>بتفويض: فوضت ولاية العقد لأبيها أو لقريب</span>
                    {selfContractingMode === 'delegated' && <Check className="w-4 h-4" />}
                  </div>
                  <span className="block text-[10px] opacity-80 mt-1 font-normal">
                    بموجب وكالة خاصة أو تفويض شفاهي بمجلس العقد
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. زواج ذي إعاقة ذهنية */}
        {selectedType === 'mental_disability' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <Brain className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-rose-900 leading-relaxed">
                <span className="font-bold">المادة 23 من مدونة الأسرة:</span>
                <p className="text-xs text-rose-800 mt-1">
                  يأذن قاضي التوثيق بزواج الشخص المعاق ذهنياً بعد تقديم تقرير طبي حول حالة الإعاقة وإشعار
                  الطرف الآخر بها والتنصيص على ذلك صراحة في رسم الزواج لضمان الرضى التام.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Judge Permission */}
              <div className="border border-rose-200 bg-rose-50/30 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-rose-900 block border-b border-rose-200 pb-2">
                  1. إذن قاضي التوثيق بالزواج
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">رقم الإذن *</label>
                    <input
                      type="text"
                      value={judgePermNumber}
                      onChange={(e) => {
                        setJudgePermNumber(e.target.value);
                        setPermVerificationStatus('idle');
                      }}
                      placeholder="مثال: 120/2026"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">تاريخ الإذن *</label>
                    <input
                      type="date"
                      value={judgePermDate}
                      onChange={(e) => setJudgePermDate(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVerifyJudgePermission}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {permVerificationStatus === 'verified' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم التحقق من إذن القاضي ✓</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>تحقق من صحة الإذن القضائي</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Medical Report */}
              <div className="border border-rose-200 bg-rose-50/30 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-rose-900 block border-b border-rose-200 pb-2">
                  2. بيانات التقرير الطبي النفسي
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">رقم التقرير الطبي *</label>
                    <input
                      type="text"
                      value={medicalReportNumber}
                      onChange={(e) => setMedicalReportNumber(e.target.value)}
                      placeholder="مثال: MED-894"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">تاريخ التقرير</label>
                    <input
                      type="date"
                      value={medicalReportDate}
                      onChange={(e) => setMedicalReportDate(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">اسم الطبيب المعالج</label>
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="د. مصطفى التازي"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">المصحة أو المستشفى</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="مستشفى الرازي"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={otherPartyConsent}
                      onChange={(e) => setOtherPartyConsent(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span className="text-[11px] text-gray-800 font-bold">
                      أقر بأن الطرف الآخر تم إشعاره بحالة الإعاقة وصرح بموافقته التامة
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. الزواج الرجعي (إرجاع بعد طلاق رجعي) */}
        {selectedType === 'revocable_reconciliation' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 leading-relaxed">
                <span className="font-bold">أحكام الإرجاع (المادة 124 وما بعدها):</span>
                <p className="text-xs text-blue-800 mt-1">
                  للزوج أن يرجع زوجته المطلقة طلاقاً رجعياً ما دامت في العدة. ويشترط لتوثيق الإرجاع ثبوت
                  وقوع الطلاق الرجعي وتاريخه وسريان العدة شرعاً وقانوناً.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رقم رسم الطلاق المرجوع منه *
                  </label>
                  <input
                    type="text"
                    value={divorceDeedNumber}
                    onChange={(e) => setDivorceDeedNumber(e.target.value)}
                    placeholder="مثال: 584 / 2025"
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    تاريخ وقوع الطلاق
                  </label>
                  <input
                    type="date"
                    value={divorceDate}
                    onChange={(e) => setDivorceDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    تاريخ الإرجاع الفعلي
                  </label>
                  <input
                    type="date"
                    value={revocationDate}
                    onChange={(e) => setRevocationDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    المحكمة المصدرة لرسم الطلاق
                  </label>
                  <input
                    type="text"
                    value={divorceCourt}
                    onChange={(e) => setDivorceCourt(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-700">حالة العدة الشرعية:</span>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800">
                  <input
                    type="radio"
                    name="iddahStatus"
                    checked={isIddahValid === true}
                    onChange={() => setIsIddahValid(true)}
                    className="text-blue-600"
                  />
                  <span>العدة لا زالت سارية (الإرجاع صحيح شرعاً وقانوناً) 🟢</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-800">
                  <input
                    type="radio"
                    name="iddahStatus"
                    checked={isIddahValid === false}
                    onChange={() => setIsIddahValid(false)}
                    className="text-rose-600"
                  />
                  <span>انقضت العدة (بانت بينونة صغرى - يلزم عقد جديد بمهر جديد) ⚠️</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 6. زواج مقترن بشروط اتفاقية */}
        {selectedType === 'stipulated_conditions' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900 leading-relaxed">
                <span className="font-bold">المادة 47 من مدونة الأسرة:</span>
                <p className="text-xs text-amber-800 mt-1">
                  «لكل من الزوجين أن يشترط لنفسه شروطا، ما لم تكن منافية لمقاصد العقد... وتعتبر الشروط صحيحة
                  وملزمة لمن التزم بها». كما يجوز الاتفاق على تدبير الأموال المكتسبة أثناء قيام الزوجية (المادة 49).
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  الشروط المسجلة في هذا الرسم ({conditions.length} شروط):
                </label>
                <div className="space-y-2">
                  {conditions.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 text-xs text-gray-800 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{c}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="حذف الشرط"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add condition */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newConditionText}
                  onChange={(e) => setNewConditionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCondition();
                    }
                  }}
                  placeholder="اكتب نص الشرط الاتفاقي هنا... (مثال: ألا يتزوج عليها إلا برضاها)"
                  className="flex-1 p-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة شرط</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-500">نماذج شائعة سريعة:</span>
                {[
                  'ألا يتزوج عليها',
                  'إكمال دراستها الجامعية',
                  'الاستمرار في ممارسة مهنتها',
                  'سكن مستقل للزوجية',
                  'تدبير الأموال المشتركة وفق عقد ملحق'
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      if (!conditions.includes(preset)) {
                        setConditions((prev) => [...prev, preset]);
                      }
                    }}
                    className="text-[11px] bg-white border border-gray-300 hover:border-amber-500 px-2.5 py-1 rounded-full text-gray-700 hover:text-amber-800 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. تجديد أو مراجعة عقد زواج */}
        {selectedType === 'contract_renewal' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex items-start gap-3">
              <History className="w-5 h-5 text-slate-700 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-900 leading-relaxed">
                <span className="font-bold">مسار الإلحاق والتعديل:</span>
                <p className="text-xs text-slate-700 mt-1">
                  يستخدم هذا المسار لإبرام ملحق تعديلي أو تصحيحي لرسم زواج سابق، أو تجديد رسم تالف أو مفقود،
                  ويتم ربط الرسم الجديد بالرقم التضميني المعتمد للرسم السابق.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    سبب التجديد / التصحيح *
                  </label>
                  <select
                    value={renewalReason}
                    onChange={(e) => setRenewalReason(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  >
                    <option value="تصحيح خطأ مادي في رسم الزواج">تصحيح خطأ مادي في رسم الزواج</option>
                    <option value="تجديد رسم زواج تالف أو مفقود">تجديد رسم زواج تالف أو مفقود</option>
                    <option value="إضافة بيان ملحق برسم الزواج الأصلي">إضافة بيان ملحق برسم الزواج الأصلي</option>
                    <option value="تسجيل حكم قضائي بثبوت الزوجية">تسجيل حكم قضائي بثبوت الزوجية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رقم رسم الزواج السابق *
                  </label>
                  <input
                    type="text"
                    value={prevDeedNumber}
                    onChange={(e) => setPrevDeedNumber(e.target.value)}
                    placeholder="مثال: 324"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    سنة أو تاريخ الرسم السابق
                  </label>
                  <input
                    type="text"
                    value={prevDeedDate}
                    onChange={(e) => setPrevDeedDate(e.target.value)}
                    placeholder="مثال: 2018 / 1439 هـ"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم الزوج في الرسم الأصلي
                  </label>
                  <input
                    type="text"
                    value={prevHusbandName}
                    onChange={(e) => setPrevHusbandName(e.target.value)}
                    placeholder="الاسم الكامل للزوج"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم الزوجة في الرسم الأصلي
                  </label>
                  <input
                    type="text"
                    value={prevWifeName}
                    onChange={(e) => setPrevWifeName(e.target.value)}
                    placeholder="الاسم الكامل للزوجة"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    محكمة التوثيق المصدرة
                  </label>
                  <input
                    type="text"
                    value={prevCourt}
                    onChange={(e) => setPrevCourt(e.target.value)}
                    placeholder="قسم قضاء الأسرة"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPrevDeedLinked(!isPrevDeedLinked)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isPrevDeedLinked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-white hover:bg-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isPrevDeedLinked ? 'تم ربط السند الأصلي بنجاح ✓' : '🔗 ربط السند الأصلي بالرسم الحالي'}</span>
                </button>
                {isPrevDeedLinked && (
                  <span className="text-xs text-emerald-700 font-bold">
                    سيتم إدراج الإحالة على الرسم الأصلي ضمن ديباجة المحرر العدلي آلياً
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Checklist & Pathway Tracker Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
            <currentCard.icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">المسار المعتمد:</span>
              <span className="text-sm font-bold text-white">{currentCard.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${currentCard.badgeColor}`}>
                {currentCard.badge}
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
                  {isReady ? 'الجاهزية القانونية: مكتملة للتحرير' : 'الجاهزية القانونية: تتطلب استكمال التحقق'}
                </span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">
                الوثائق المطلوبة: {currentCard.requiredDocs.length} وثائق
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

      {/* National Marriage Stats Modal */}
      <NationalMarriageStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};
