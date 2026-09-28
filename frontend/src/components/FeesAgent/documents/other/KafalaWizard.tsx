import React, { useState, useMemo, useCallback } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  KafalaDeed,
  KafalaPartyInfo,
  KafalaWitnessInfo,
  KafalaCategory,
  SponsorRole,
  BeneficiaryRole,
  KinshipRelation,
  FeesAgentState,
} from '../../../../types/feesAgentTypes';
import {
  convertNumberToArabicWords,
} from '../../../../utils/feesAgentUtils';
import {
  generateKafalaDraft,
} from '../../../../templates/feesAgentTemplates';
import {
  Heart,
  ShieldCheck,
  Users,
  Scale,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Briefcase,
  DollarSign,
  Info,
  Globe,
  Baby,
} from 'lucide-react';

export const KafalaWizard: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  // Navigation between sections (1 to 6)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Sync helper
  const syncState = useCallback((patch: Partial<FeesAgentState>) => {
    setState(prev => ({
      ...prev,
      ...patch,
    }));
  }, [setState]);

  // Read or initialize Kafala data (clean, zero mock data)
  const kafalaData = useMemo<Partial<KafalaDeed>>(() => {
    return state.kafalaDeed || {};
  }, [state.kafalaDeed]);

  // 1. Classification & Core Questions
  const [kafalaCategory, setKafalaCategory] = useState<KafalaCategory>(
    kafalaData.kafalaCategory || 'تكفل_بالوالدين'
  );
  const [legalRegime, setLegalRegime] = useState<KafalaDeed['legalRegime']>(
    kafalaData.legalRegime || 'تكفل_عائلي_تصريح_بشهود'
  );
  const [sponsorRole, setSponsorRole] = useState<SponsorRole>(
    kafalaData.sponsorRole || 'ابن'
  );
  const [beneficiaryRole, setBeneficiaryRole] = useState<BeneficiaryRole>(
    kafalaData.beneficiaryRole || 'كلا_الوالدين'
  );
  const [kinshipRelation, setKinshipRelation] = useState<KinshipRelation>(
    kafalaData.kinshipRelation || 'أب'
  );

  // Is Abandoned Child (Law 15.01)
  const isAbandonedChild = kafalaCategory === 'كفالة_طفل_مهمل' || legalRegime === 'قانون_15.01_طفل_مهمل';

  // Dynamic Terminology
  const sponsorTerm = useMemo(() => {
    if (isAbandonedChild) return 'الكافل';
    if (sponsorRole === 'أم') return 'المتكفلة (الأم)';
    if (sponsorRole === 'زوجان') return 'الكافلان / الزوجان';
    return 'المتكفل / الملتزم بالنفقة';
  }, [isAbandonedChild, sponsorRole]);

  const beneficiaryTerm = useMemo(() => {
    if (isAbandonedChild) return 'المكفول (الطفل المهمل)';
    if (beneficiaryRole === 'كلا_الوالدين') return 'الوالدان (المستفيدان)';
    if (beneficiaryRole === 'إخوة') return 'الإخوة المستفيدون';
    if (beneficiaryRole === 'طفل_أطفال') return 'الأطفال المكفولون';
    return 'المستفيد من التكفل';
  }, [isAbandonedChild, beneficiaryRole]);

  // 2. Sponsors List
  const [sponsors, setSponsors] = useState<KafalaPartyInfo[]>(() => {
    if (kafalaData.sponsors && kafalaData.sponsors.length > 0) return kafalaData.sponsors;
    if (state.sellers && state.sellers.length > 0) {
      return state.sellers.map((s, idx) => ({
        id: `sp-${idx + 1}`,
        isLegalEntity: false,
        role: s.partyRole || 'متكفل',
        fullName: s.name || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        dateOfBirth: s.dateOfBirth || '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: (s.nationality as any) || 'مغربي',
        idType: 'بطاقة_تعريف_وطنية',
        idNumber: s.idNumber || '',
        address: s.address || '',
        profession: s.profession || '',
        maritalStatus: s.maritalStatus || '',
      }));
    }
    return [{
      id: 'sp-1',
      isLegalEntity: false,
      role: 'متكفل',
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idType: 'بطاقة_تعريف_وطنية',
      idNumber: '',
      address: '',
      profession: '',
      maritalStatus: 'متزوج',
    }];
  });

  // 3. Beneficiaries List
  const [beneficiaries, setBeneficiaries] = useState<KafalaPartyInfo[]>(() => {
    if (kafalaData.beneficiaries && kafalaData.beneficiaries.length > 0) return kafalaData.beneficiaries;
    if (state.buyers && state.buyers.length > 0) {
      return state.buyers.map((b, idx) => ({
        id: `ben-${idx + 1}`,
        isLegalEntity: false,
        role: b.partyRole || 'مستفيد',
        fullName: b.name || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        dateOfBirth: b.dateOfBirth || '',
        placeOfBirth: b.placeOfBirth || '',
        nationality: (b.nationality as any) || 'مغربي',
        idType: b.idNumber ? 'بطاقة_تعريف_وطنية' : 'عقد_ازدياد',
        idNumber: b.idNumber || '',
        address: b.address || '',
        profession: b.profession || '',
        maritalStatus: b.maritalStatus || '',
      }));
    }
    return [{
      id: 'ben-1',
      isLegalEntity: false,
      role: 'مستفيد',
      fullName: '',
      fatherName: '',
      motherName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'مغربي',
      idType: 'بطاقة_تعريف_وطنية',
      idNumber: '',
      address: '',
      profession: '',
      maritalStatus: '',
    }];
  });

  // 4. Scope of Support / Expenses
  const [supportScope, setSupportScope] = useState<KafalaDeed['supportScope']>(() => ({
    allBasicExpenses: kafalaData.supportScope?.allBasicExpenses ?? true,
    foodAndDrink: kafalaData.supportScope?.foodAndDrink ?? true,
    clothing: kafalaData.supportScope?.clothing ?? true,
    housing: kafalaData.supportScope?.housing ?? true,
    medicalAndDrugs: kafalaData.supportScope?.medicalAndDrugs ?? true,
    schooling: kafalaData.supportScope?.schooling ?? (kafalaCategory === 'تكفل_بالتربية_والتمدرس'),
    studyExpenses: kafalaData.supportScope?.studyExpenses ?? false,
    vocationalTraining: kafalaData.supportScope?.vocationalTraining ?? false,
    dailyCare: kafalaData.supportScope?.dailyCare ?? true,
    transport: kafalaData.supportScope?.transport ?? false,
    otherExpenses: kafalaData.supportScope?.otherExpenses ?? false,
    otherExpensesText: kafalaData.supportScope?.otherExpensesText || '',
  }));

  // 5. Financial Commitment
  const [financialCommitment, setFinancialCommitment] = useState<KafalaDeed['financialCommitment']>(() => ({
    commitmentType: kafalaData.financialCommitment?.commitmentType || 'تحمل_المصاريف_الفعلية',
    amount: kafalaData.financialCommitment?.amount || undefined,
    amountInWords: kafalaData.financialCommitment?.amountInWords || '',
  }));

  // 6. Reasons & Special Context
  const [sponsorshipReason, setSponsorshipReason] = useState<KafalaDeed['sponsorshipReason']>(() => ({
    primaryReason: kafalaData.sponsorshipReason?.primaryReason || (
      kafalaCategory === 'تكفل_بالوالدين' ? 'صلة_الرحم_وبر_الوالدين' :
      kafalaCategory === 'تكفل_بالتربية_والتمدرس' ? 'متابعة_الدراسة' :
      kafalaCategory === 'تكفل_بشخص_عاجز_أو_ذي_إعاقة' ? 'المرض_أو_العجز' : 'صلة_الرحم_وبر_الوالدين'
    ),
    reasonDetails: kafalaData.sponsorshipReason?.reasonDetails || '',
    isBeneficiaryAdult: kafalaData.sponsorshipReason?.isBeneficiaryAdult ?? false,
    adultSupportReason: kafalaData.sponsorshipReason?.adultSupportReason || 'الدراسة',
    parentsCondition: kafalaData.sponsorshipReason?.parentsCondition || {
      hasIncome: false,
      hasPension: false,
      hasMedicalExpenses: true,
      isFullSupport: true,
    },
  }));

  // 7. Purpose / Destination of Deed
  const [purposeOfDeed, setPurposeOfDeed] = useState<KafalaDeed['purposeOfDeed']>(() => ({
    destination: kafalaData.purposeOfDeed?.destination || 'إثبات_التكفل_أمام_إدارة',
    destinationDetails: kafalaData.purposeOfDeed?.destinationDetails || '',
    foreignEntityInfo: kafalaData.purposeOfDeed?.foreignEntityInfo || {
      country: '',
      language: 'الفرنسية',
      needsApostille: false,
      entityName: '',
    },
  }));

  // 8. Duration & Commitment Nature
  const [commitmentNature, setCommitmentNature] = useState<KafalaDeed['commitmentNature']>(() => ({
    natureType: kafalaData.commitmentNature?.natureType || 'إقرار_بتكفل_قائم_ومستمر',
    startDate: kafalaData.commitmentNature?.startDate || '',
    endDate: kafalaData.commitmentNature?.endDate || '',
    terminationEvent: kafalaData.commitmentNature?.terminationEvent || 'بلوغ_سن_الرشد',
  }));

  // 9. Abandoned Child Specifics (Law 15.01)
  const [abandonedChildDetails, setAbandonedChildDetails] = useState<NonNullable<KafalaDeed['abandonedChildDetails']>>(() => ({
    isAbandonmentJudiciallyDeclared: kafalaData.abandonedChildDetails?.isAbandonmentJudiciallyDeclared ?? true,
    courtName: kafalaData.abandonedChildDetails?.courtName || (state.meta?.court || ''),
    rulingNumber: kafalaData.abandonedChildDetails?.rulingNumber || '',
    rulingDate: kafalaData.abandonedChildDetails?.rulingDate || '',
    juvenileJudgeName: kafalaData.abandonedChildDetails?.juvenileJudgeName || '',
    socialReportReference: kafalaData.abandonedChildDetails?.socialReportReference || '',
    childConsentObtainedIfOver12: kafalaData.abandonedChildDetails?.childConsentObtainedIfOver12 ?? false,
    assignmentOrderNumber: kafalaData.abandonedChildDetails?.assignmentOrderNumber || '',
    assignmentOrderDate: kafalaData.abandonedChildDetails?.assignmentOrderDate || '',
  }));

  // 10. Witnesses Engine
  const [witnesses, setWitnesses] = useState<KafalaWitnessInfo[]>(() => {
    if (kafalaData.witnesses && kafalaData.witnesses.length > 0) return kafalaData.witnesses;
    if (state.witnesses && state.witnesses.length > 0) {
      return state.witnesses.map((w, idx) => ({
        id: `wit-${idx + 1}`,
        fullName: w.name || '',
        fatherName: '',
        motherName: '',
        profession: w.profession || '',
        address: w.address || '',
        idNumber: w.idNumber || '',
        relationshipToParties: 'معرفة تامة ومجاورة',
        testimonyPoints: ['صلة_القرابة', 'واقعة_التكفل', 'نوع_المصاريف', 'استمرار_التكفل', 'قدرة_الكافل'],
      }));
    }
    return [
      {
        id: 'wit-1',
        fullName: '',
        fatherName: '',
        profession: '',
        address: '',
        idNumber: '',
        relationshipToParties: 'معرفة تامة ومجاورة',
        testimonyPoints: ['صلة_القرابة', 'واقعة_التكفل', 'نوع_المصاريف', 'استمرار_التكفل', 'قدرة_الكافل'],
      },
      {
        id: 'wit-2',
        fullName: '',
        fatherName: '',
        profession: '',
        address: '',
        idNumber: '',
        relationshipToParties: 'معرفة تامة ومجاورة',
        testimonyPoints: ['صلة_القرابة', 'واقعة_التكفل', 'نوع_المصاريف', 'استمرار_التكفل', 'قدرة_الكافل'],
      },
    ];
  });

  // Top Card Validation Status
  const validationStatus = useMemo(() => {
    if (isAbandonedChild && (!abandonedChildDetails.rulingNumber || !abandonedChildDetails.assignmentOrderNumber)) {
      return { text: 'يحتاج مراجع قضائية (قانون 15.01)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    const hasSponsor = sponsors.some(s => s.fullName);
    const hasBeneficiary = beneficiaries.some(b => b.fullName);
    const hasWitness = witnesses.some(w => w.fullName && w.idNumber);

    if (hasSponsor && hasBeneficiary && hasWitness) {
      return { text: 'مكتمل وجاهز للتوثيق', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { text: 'قيد التحديد والاستيفاء', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  }, [isAbandonedChild, abandonedChildDetails, sponsors, beneficiaries, witnesses]);

  // Full Object Construction
  const fullKafalaState = useMemo<KafalaDeed>(() => ({
    kafalaCategory,
    legalRegime: isAbandonedChild ? 'قانون_15.01_طفل_مهمل' : legalRegime,
    sponsorRole,
    beneficiaryRole,
    kinshipRelation,
    sponsors,
    beneficiaries,
    supportScope,
    financialCommitment,
    sponsorshipReason,
    purposeOfDeed,
    commitmentNature,
    abandonedChildDetails: isAbandonedChild ? abandonedChildDetails : undefined,
    witnesses,
    isPreReceptionVerified: state.isPreReceptionVerified ?? true,
    preReceptionNotes: state.preReceptionNotes,
  }), [
    kafalaCategory,
    legalRegime,
    isAbandonedChild,
    sponsorRole,
    beneficiaryRole,
    kinshipRelation,
    sponsors,
    beneficiaries,
    supportScope,
    financialCommitment,
    sponsorshipReason,
    purposeOfDeed,
    commitmentNature,
    abandonedChildDetails,
    witnesses,
    state.isPreReceptionVerified,
    state.preReceptionNotes,
  ]);

  // Direct transit to Step 7
  const handleProceedToStep7 = () => {
    const currentState: FeesAgentState = {
      ...state,
      documentType: 'كفالة',
      kafalaDeed: fullKafalaState,
      sellers: sponsors.map(s => ({
        id: s.id,
        name: s.fullName,
        idNumber: s.idNumber || '',
        idIssueDate: '',
        idImage: '',
        address: s.address || '',
        profession: s.profession || '',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        partyRole: s.role || 'متكفل',
      })) as any,
      buyers: beneficiaries.map(b => ({
        id: b.id,
        name: b.fullName,
        idNumber: b.idNumber || '',
        idIssueDate: '',
        idImage: '',
        address: b.address || '',
        profession: b.profession || '',
        fatherName: b.fatherName || '',
        motherName: b.motherName || '',
        partyRole: b.role || 'مستفيد',
      })) as any,
      witnesses: witnesses.map(w => ({
        id: w.id,
        name: w.fullName,
        idNumber: w.idNumber,
        address: w.address,
        profession: w.profession,
      })) as any,
    };

    const draftText = generateKafalaDraft(currentState);

    setState(prev => ({
      ...prev,
      ...currentState,
      step: 7,
      draft: draftText,
    }));
  };

  // Stage Switcher
  const stages = [
    { num: 1, title: 'المسار والتكييف' },
    { num: 2, title: 'الأطراف والمستفيد' },
    { num: 3, title: 'نطاق المصاريف والمالية' },
    { num: 4, title: 'السياق والغرض' },
    { num: 5, title: 'الشهود والإثبات' },
    { num: 6, title: 'المراجعة والاعتماد' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. TOP STICKY STATUS CARD (بطاقة العملية الرئيسية) */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-emerald-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Heart className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>رسم الكفالة والتكفل العائلي</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                    🟢 محرك التكفل الذكي
                  </span>
                </h2>
                <p className="text-xs text-slate-300">
                  تحديد المسار القانوني الدقيق والضوابط الشرعية والقضائية للتكفل والإنفاق
                </p>
              </div>
            </div>
          </div>

          {/* Quick status badges & Step 0.25 button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => syncState({ step: 0.25 })}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>🏛️ بوابة التلقي العدلي (0.25)</span>
            </button>

            <span className={`text-xs px-3 py-1.5 rounded-xl font-black border ${validationStatus.color}`}>
              {validationStatus.text}
            </span>
          </div>
        </div>

        {/* 4 Core Pillars Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">1️⃣ نوع الكفالة:</span>
            <span className="font-bold text-emerald-300 truncate block mt-0.5">
              {kafalaCategory.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">2️⃣ المتكفل:</span>
            <span className="font-bold text-cyan-300 truncate block mt-0.5">
              {sponsors[0]?.fullName || sponsorTerm}
            </span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">3️⃣ المستفيد:</span>
            <span className="font-bold text-amber-300 truncate block mt-0.5">
              {beneficiaries[0]?.fullName || beneficiaryTerm}
            </span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px]">4️⃣ المصاريف:</span>
            <span className="font-bold text-purple-300 truncate block mt-0.5">
              {financialCommitment.commitmentType === 'مبلغ_شهري_محدد' && financialCommitment.amount
                ? `${financialCommitment.amount.toLocaleString()} د.م شهرياً`
                : 'كافة النفقات الفعلية'}
            </span>
          </div>
        </div>
      </div>

      {/* STAGES NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {stages.map(st => (
          <button
            key={st.num}
            type="button"
            onClick={() => setCurrentStage(st.num)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentStage === st.num
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStage === st.num ? 'bg-white text-emerald-700' : 'bg-slate-300 text-slate-700'
            }`}>
              {st.num}
            </span>
            <span>{st.title}</span>
          </button>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* STAGE 1: TAYKEEF & CORE QUESTIONS (المسار والتكييف) */}
      {/* ==================================================================== */}
      {currentStage === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span>نقطة البداية الذكية: ما المقصود بالكفالة في هذا الطلب؟</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              يبدأ النظام بالسؤال عن غرض التكفل الحقيقي أولاً لفرز المسارات وتجنب الخلط مع مسطرة كفالة الأطفال المهملين
            </p>
          </div>

          {/* Q1: Nature of Kafala */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              حدد نوع ومسار الكفالة المطلوب توثيقها:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { key: 'تكفل_بالوالدين', title: '🧓 تكفل بالوالدين أو أحدهما', desc: 'إشهاد بالبر والصلة والنفقة المستمرة' },
                { key: 'تكفل_بين_الإخوة', title: '👦👦 تكفل بين الإخوة', desc: 'صغر السن أو الدراسة أو غياب المعيل' },
                { key: 'تكفل_بالنفقة_والمعيشة', title: '🍲 تكفل بالنفقة والمعيشة', desc: 'توفير المأكل والمشرب والمسكن' },
                { key: 'تكفل_بالتربية_والتمدرس', title: '🎓 تكفل بالتربية والتمدرس والرعاية', desc: 'مصاريف الدراسة والمؤسسات التعليمية' },
                { key: 'كفالة_طفل_مهمل', title: '⚖️ كفالة طفل مهمل (قانون 15.01)', desc: 'مسار قضائي خاص بحكم التصريح بالإهمال' },
                { key: 'كفالة_طفل_غير_مهمل', title: '👶 كفالة طفل غير مهمل', desc: 'وفق مناشير وزارة العدل والممارسة القضائية' },
                { key: 'تكفل_بالزوج_أو_الزوجة', title: '👥 تكفل بالزوج/الزوجة أو قريب', desc: 'إقرار بالإنفاق وتوفير الرعاية' },
                { key: 'تكفل_بشخص_عاجز_أو_ذي_إعاقة', title: '♿ تكفل بشخص ذي إعاقة/عاجز', desc: 'رعاية صحية وتكفل شامل بالمصاريف' },
                { key: 'تكفل_بأحد_الأقارب', title: '🤝 تكفل بأحد الأقارب', desc: 'جد، جدة، عم، خال، حفيد' },
                { key: 'أخرى', title: '✍️ مسار آخر يحدده العدل', desc: 'حالة خاصة تستدعي صياغة ملائمة' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    const cat = opt.key as KafalaCategory;
                    setKafalaCategory(cat);
                    if (cat === 'كفالة_طفل_مهمل') {
                      setLegalRegime('قانون_15.01_طفل_مهمل');
                      setBeneficiaryRole('طفل_أطفال');
                    } else {
                      setLegalRegime('تكفل_عائلي_تصريح_بشهود');
                      if (cat === 'تكفل_بالوالدين') setBeneficiaryRole('كلا_الوالدين');
                      if (cat === 'تكفل_بين_الإخوة') setBeneficiaryRole('إخوة');
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    kafalaCategory === opt.key
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm text-slate-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block">{opt.title}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Q2 & Q3: Sponsor and Beneficiary Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
            {/* Sponsor Role */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-800">
                من هو الطرف المتكفل (الكافل)؟
              </label>
              <select
                value={sponsorRole}
                onChange={e => setSponsorRole(e.target.value as SponsorRole)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ابن">👤 الابن</option>
                <option value="بنت">👤 البنت</option>
                <option value="أب">👨 الأب</option>
                <option value="أم">👩 الأم</option>
                <option value="أبوان">👨‍👩‍👧 الأبوان معاً</option>
                <option value="أخ">👤 الأخ</option>
                <option value="أخت">👤 الأخت</option>
                <option value="زوجان">👥 زوجان (كفالة أسرية)</option>
                <option value="أحد_الأقارب">🤝 أحد الأقارب</option>
                <option value="شخص_معنوي">🏢 شخص معنوي (جمعية / مؤسسة)</option>
                <option value="شخص_آخر">✍️ شخص آخر</option>
              </select>
            </div>

            {/* Beneficiary Role */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-800">
                من هو المستفيد من التكفل (المكفول)؟
              </label>
              <select
                value={beneficiaryRole}
                onChange={e => setBeneficiaryRole(e.target.value as BeneficiaryRole)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="كلا_الوالدين">👴🧓 كلا الوالدين</option>
                <option value="الأب">🧓 الأب</option>
                <option value="الأم">🧓 الأم</option>
                <option value="ابن">👦 الابن</option>
                <option value="ابنة">👧 الابنة</option>
                <option value="إخوة">👦👦 الإخوة</option>
                <option value="زوجة">👩 الزوجة</option>
                <option value="زوج">👨 الزوج</option>
                <option value="طفل_أطفال">👶 طفل / أطفال</option>
                <option value="شخص_عاجز">♿ شخص عاجز / ذو إعاقة</option>
                <option value="شخص_آخر">👤 شخص آخر</option>
              </select>
            </div>
          </div>

          {/* Kinship Selection */}
          <div className="space-y-2.5 pt-2">
            <label className="block text-xs font-black text-slate-800">
              صلة القرابة بين المتكفل والمستفيد:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { key: 'أب', label: 'والد(ة)' },
                { key: 'ابن', label: 'ابن / بنت' },
                { key: 'أخ', label: 'أخ / أخت' },
                { key: 'جد', label: 'جد / جدة' },
                { key: 'حفيد', label: 'حفيد' },
                { key: 'عم', label: 'عم / عمة' },
                { key: 'خال', label: 'خال / خالة' },
                { key: 'ابن_أخ', label: 'ابن أخ/أخت' },
                { key: 'قريب_آخر', label: 'قريب آخر' },
                { key: 'لا_توجد_قرابة', label: 'لا توجد قرابة' },
              ].map(k => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKinshipRelation(k.key as KinshipRelation)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    kinshipRelation === k.key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special Guidance / Scenario Pack Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-black text-amber-950">
              <Info className="w-4 h-4 text-amber-600" />
              <span>التوجيه والضابط القانوني المعتمد لهذا المسار:</span>
            </div>
            {isAbandonedChild ? (
              <p>
                ⚠️ <strong>تنبيه قانوني حاسم:</strong> كفالة الأطفال المهملين تخضع حصراً لأحكام القانون رقم 15.01، وتتطلب حكماً بالتصريح بالإهمال وأمراً بإسناد الكفالة من قاضي شؤون القاصرين. لا يُحرر رسم التكفل العادي بدلاً منها.
              </p>
            ) : kafalaCategory === 'تكفل_بالوالدين' ? (
              <p>
                🟢 <strong>التكفل بالوالدين:</strong> إشهاد بالبر والصلة وتحمل مصاريف المعيشة طبقاً للمادتين 197 و198 من مدونة الأسرة. يثبت استمرار الإنفاق والمعاينة بشهادة شاهدي معرفة ولا يطبق عليه قانون 15.01 إطلاقاً.
              </p>
            ) : kafalaCategory === 'تكفل_بالتربية_والتمدرس' ? (
              <p>
                🟢 <strong>التكفل بالتمدرس:</strong> يركز على تحمل مصاريف التعليم والكتب واللوازم والتسجيل الجامعي والمدرسي، ويصلح لتقديمه للجامعات والمؤسسات والمنح.
              </p>
            ) : (
              <p>
                🟢 <strong>التكفل العائلي:</strong> إقرار رضائي شرعي بالإنفاق يوثقه العدلان بحضور المتكفل والشهود لحفظ صلة الرحم والتضامن الأسري.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>التالي: بيانات الأطراف والمستفيدين</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STAGE 2: PARTIES & BENEFICIARY (الأطراف والمستفيد) */}
      {/* ==================================================================== */}
      {currentStage === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>بيانات {sponsorTerm} و {beneficiaryTerm}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تكييف الحقول والصفات بناءً على المسار المختار بدقة وتوثيق الهويات الوطنية
            </p>
          </div>

          {/* Section A: Sponsors (المتكفلون) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>الطرف الأول: {sponsorTerm}</span>
              </h4>
              <button
                type="button"
                onClick={() => setSponsors(prev => [
                  ...prev,
                  {
                    id: `sp-${prev.length + 1}`,
                    isLegalEntity: false,
                    role: 'متكفل',
                    fullName: '',
                    idType: 'بطاقة_تعريف_وطنية',
                    idNumber: '',
                    nationality: 'مغربي',
                    address: '',
                    profession: '',
                  },
                ])}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة متكفل ثانٍ (زوجان مثلاً)</span>
              </button>
            </div>

            {sponsors.map((sp, idx) => (
              <div key={sp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">بيانات المتكفل ({idx + 1}):</span>
                  {sponsors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSponsors(prev => prev.filter(p => p.id !== sp.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الكامل:</label>
                    <input
                      type="text"
                      value={sp.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, fullName: val } : p));
                      }}
                      placeholder="الاسم الكامل للمتكفل"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم البطاقة الوطنية:</label>
                    <input
                      type="text"
                      value={sp.idNumber || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, idNumber: val } : p));
                      }}
                      placeholder="مثال: AB123456"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">المهنة / العمل:</label>
                    <input
                      type="text"
                      value={sp.profession || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, profession: val } : p));
                      }}
                      placeholder="مهنة المتكفل لإثبات الملاءة"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم الأب:</label>
                    <input
                      type="text"
                      value={sp.fatherName || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, fatherName: val } : p));
                      }}
                      placeholder="اسم الأب"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم الأم:</label>
                    <input
                      type="text"
                      value={sp.motherName || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, motherName: val } : p));
                      }}
                      placeholder="اسم الأم"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الازدياد:</label>
                    <input
                      type="date"
                      value={sp.dateOfBirth || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, dateOfBirth: val } : p));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان السكنى والمقر:</label>
                  <input
                    type="text"
                    value={sp.address || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setSponsors(prev => prev.map(p => p.id === sp.id ? { ...p, address: val } : p));
                    }}
                    placeholder="العنوان الكامل للمتكفل"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Section B: Beneficiaries (المستفيدون) */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                <span>الطرف الثاني: {beneficiaryTerm}</span>
              </h4>
              <button
                type="button"
                onClick={() => setBeneficiaries(prev => [
                  ...prev,
                  {
                    id: `ben-${prev.length + 1}`,
                    isLegalEntity: false,
                    role: 'مستفيد',
                    fullName: '',
                    idType: 'بطاقة_تعريف_وطنية',
                    idNumber: '',
                    nationality: 'مغربي',
                    address: '',
                  },
                ])}
                className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مستفيد آخر</span>
              </button>
            </div>

            {beneficiaries.map((ben, idx) => (
              <div key={ben.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">بيانات المستفيد ({idx + 1}):</span>
                  {beneficiaries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBeneficiaries(prev => prev.filter(b => b.id !== ben.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الكامل:</label>
                    <input
                      type="text"
                      value={ben.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, fullName: val } : b));
                      }}
                      placeholder="اسم المستفيد الكامل"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الهوية ورقمها:</label>
                    <input
                      type="text"
                      value={ben.idNumber || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, idNumber: val } : b));
                      }}
                      placeholder="ب.ت.و أو رسم الولادة للقاصر"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الازدياد:</label>
                    <input
                      type="date"
                      value={ben.dateOfBirth || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, dateOfBirth: val } : b));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Educational or Special fields if Schooling / Adult */}
                {(kafalaCategory === 'تكفل_بالتربية_والتمدرس' || sponsorshipReason.isBeneficiaryAdult) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">المؤسسة التعليمية / الجامعة:</label>
                      <input
                        type="text"
                        value={ben.schoolOrUniName || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, schoolOrUniName: val } : b));
                        }}
                        placeholder="مثال: جامعة عبد المالك السعدي / ثانوية..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">المستوى الدراسي / التخصص:</label>
                      <input
                        type="text"
                        value={ben.gradeLevel || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, gradeLevel: val } : b));
                        }}
                        placeholder="مثال: السنة الأولى ماستر / الثالثة ثانوي"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان سكنى المستفيد:</label>
                  <input
                    type="text"
                    value={ben.address || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, address: val } : b));
                    }}
                    placeholder="عنوان الإقامة (أو يذكر: يسكن مع المتكفل)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Section C: Abandoned Child Panel (Law 15.01) */}
          {isAbandonedChild && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-purple-950 font-black text-xs">
                <Baby className="w-4 h-4 text-purple-600" />
                <span>المراجع القضائية الإلزامية لكفالة الطفل المهمل (القانون 15.01):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">المحكمة المصدرة للحكم:</label>
                  <input
                    type="text"
                    value={abandonedChildDetails.courtName || ''}
                    onChange={e => setAbandonedChildDetails(prev => ({ ...prev, courtName: e.target.value }))}
                    placeholder="المحكمة الابتدائية بـ..."
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم حكم الإهمال:</label>
                  <input
                    type="text"
                    value={abandonedChildDetails.rulingNumber || ''}
                    onChange={e => setAbandonedChildDetails(prev => ({ ...prev, rulingNumber: e.target.value }))}
                    placeholder="رقم الحكم"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ حكم الإهمال:</label>
                  <input
                    type="date"
                    value={abandonedChildDetails.rulingDate || ''}
                    onChange={e => setAbandonedChildDetails(prev => ({ ...prev, rulingDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">أمر إسناد الكفالة (قاضي شؤون القاصرين):</label>
                  <input
                    type="text"
                    value={abandonedChildDetails.assignmentOrderNumber || ''}
                    onChange={e => setAbandonedChildDetails(prev => ({ ...prev, assignmentOrderNumber: e.target.value }))}
                    placeholder="رقم وتاريخ أمر الإسناد"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">مرجع تقرير البحث الاجتماعي:</label>
                  <input
                    type="text"
                    value={abandonedChildDetails.socialReportReference || ''}
                    onChange={e => setAbandonedChildDetails(prev => ({ ...prev, socialReportReference: e.target.value }))}
                    placeholder="رقم وتاريخ التقرير الاجتماعي"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStage(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>التالي: نطاق التكفل والالتزام المالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STAGE 3: SCOPE OF EXPENSES & FINANCES (نطاق المصاريف والمالية) */}
      {/* ==================================================================== */}
      {currentStage === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>ما الذي يتكفل به الكافل؟ والالتزام المالي</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تحديد مشمول النفقة والمعيشة بدقة وتعيين الالتزام المالي الدوري أو الفعلي
            </p>
          </div>

          {/* Checkboxes for Support Scope */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              المصاريف المشمولة بالتكفل (يمكن اختيار أكثر من عنصر):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                { key: 'allBasicExpenses', label: '☑️ جميع المصاريف الأساسية' },
                { key: 'foodAndDrink', label: '🍞 المأكل والمشرب' },
                { key: 'clothing', label: '👕 الملبس والكسوة' },
                { key: 'housing', label: '🏠 توفير السكن اللائق' },
                { key: 'medicalAndDrugs', label: '💊 العلاج والأدوية والاستشفاء' },
                { key: 'schooling', label: '🎒 التمدرس والواجبات المدرسية' },
                { key: 'studyExpenses', label: '📚 مصاريف الدراسة والكتب' },
                { key: 'vocationalTraining', label: '🛠️ التكوين المهني' },
                { key: 'dailyCare', label: '🤝 الرعاية اليومية الشاملة' },
                { key: 'transport', label: '🚌 التنقل والمواصلات' },
                { key: 'otherExpenses', label: '✍️ مصاريف محددة أخرى' },
              ].map(item => {
                const k = item.key as keyof KafalaDeed['supportScope'];
                const checked = Boolean(supportScope[k]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSupportScope(prev => ({
                        ...prev,
                        [k]: !checked,
                      }));
                    }}
                    className={`p-3 rounded-xl border text-right text-xs font-bold transition-all ${
                      checked
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {supportScope.otherExpenses && (
              <div className="pt-2">
                <input
                  type="text"
                  value={supportScope.otherExpensesText || ''}
                  onChange={e => setSupportScope(prev => ({ ...prev, otherExpensesText: e.target.value }))}
                  placeholder="حدد المصاريف الأخرى بالتفصيل..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Financial Commitment Engine */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>طبيعة الالتزام المالي ومقداره:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'تحمل_المصاريف_الفعلية', title: 'تحمل كافة المصاريف الفعلية', desc: 'دون تحديد سقف مالي مسبق' },
                { key: 'مبلغ_شهري_محدد', title: 'مبلغ شهري محدد', desc: 'وجيبة شهرية منتظمة' },
                { key: 'مبلغ_سنوي', title: 'مخصص سنوي', desc: 'يؤدى سنوياً' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFinancialCommitment(prev => ({
                    ...prev,
                    commitmentType: opt.key as any,
                  }))}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    financialCommitment.commitmentType === opt.key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">{opt.title}</span>
                  <span className={`text-[10px] mt-0.5 block ${
                    financialCommitment.commitmentType === opt.key ? 'text-emerald-100' : 'text-slate-500'
                  }`}>{opt.desc}</span>
                </button>
              ))}
            </div>

            {financialCommitment.commitmentType !== 'تحمل_المصاريف_الفعلية' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">المبلغ بالأرقام (درهم مغربي):</label>
                  <input
                    type="number"
                    value={financialCommitment.amount || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setFinancialCommitment(prev => ({
                        ...prev,
                        amount: val,
                        amountInWords: val > 0 ? convertNumberToArabicWords(val) : '',
                      }));
                    }}
                    placeholder="مثال: 3000"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">المبلغ بالحروف:</label>
                  <input
                    type="text"
                    value={financialCommitment.amountInWords || ''}
                    onChange={e => setFinancialCommitment(prev => ({ ...prev, amountInWords: e.target.value }))}
                    placeholder="ثلاثة آلاف درهم مغربي"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStage(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>التالي: السياق والغرض والجهة الموجه إليها</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STAGE 4: CONTEXT, PURPOSE & DURATION (السياق والغرض) */}
      {/* ==================================================================== */}
      {currentStage === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <span>السياق الاجتماعي والجهة الموجه إليها الرسم والمدة</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تحديد الدافع الشرعي والاجتماعي ومآل الرسم (إدارة، جامعة، تغطية صحية، جهة أجنبية، فيزا)
            </p>
          </div>

          {/* Parents Condition Details if Case A */}
          {kafalaCategory === 'تكفل_بالوالدين' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-emerald-600" />
                <span>الوضعية المعيشية والصحية للوالدين:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {[
                  { key: 'hasIncome', label: 'لهما دخل قار / معاش', stateVal: sponsorshipReason.parentsCondition?.hasIncome },
                  { key: 'hasMedicalExpenses', label: 'يعانيان من أمراض مزمنة / علاج', stateVal: sponsorshipReason.parentsCondition?.hasMedicalExpenses },
                  { key: 'isFullSupport', label: 'تحت الرعاية الكاملة للابن المتكفل', stateVal: sponsorshipReason.parentsCondition?.isFullSupport },
                  { key: 'hasPension', label: 'يسكنان معه بنفس المحل', stateVal: sponsorshipReason.parentsCondition?.hasPension },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSponsorshipReason(prev => ({
                        ...prev,
                        parentsCondition: {
                          ...prev.parentsCondition!,
                          [item.key]: !item.stateVal,
                        },
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-right font-bold transition-all ${
                      item.stateVal
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-emerald-300 hover:bg-emerald-100/50'
                    }`}
                  >
                    {item.stateVal ? '✓ ' : '○ '} {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Purpose / Destination */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              الغرض المخصص له هذا الرسم (الجهة الموجه إليها):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { key: 'إثبات_التكفل_أمام_إدارة', title: '🏛️ مصالح إدارية عامة', desc: 'إثبات التكفل والإنفاق رسمياً' },
                { key: 'ملف_طبي_وتغطية_صحية', title: '🏥 التغطية الصحية AMO / CNSS', desc: 'تسجيل المستفيد بالضمان الصحي' },
                { key: 'ملف_مدرسي_أو_منحة', title: '🎒 ملف مدرسي / منحة تعليمية', desc: 'المؤسسات التعليمية والمنح' },
                { key: 'ملف_جامعي', title: '🎓 ملف جامعي وسكن طلابي', desc: 'التسجيل والأحياء الجامعية' },
                { key: 'ملف_تأشيرة_سفر', title: '✈️ تأشيرة سفر / ملف قنصلي', desc: 'السفارات والقنصليات بالخارج' },
                { key: 'ملف_إداري_أجنبي', title: '🌍 إدارة وهيئة أجنبية بالخارج', desc: 'تقديم بالخارج مع ترجمة وأبوستيل' },
                { key: 'ملف_اجتماعي', title: '🤝 صندوق التكافل / دعم اجتماعي', desc: 'برامج الحماية والدعم' },
                { key: 'ملف_إقامة_أو_تجمع_عائلي', title: '🏡 إقامة وتجمع عائلي', desc: 'ملفات الهجرة والإقامة' },
                { key: 'غرض_آخر', title: '✍️ غرض مخصص آخر', desc: 'تحديد الغرض حسب طلب العدل' },
              ].map(dest => (
                <button
                  key={dest.key}
                  type="button"
                  onClick={() => setPurposeOfDeed(prev => ({
                    ...prev,
                    destination: dest.key as any,
                  }))}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    purposeOfDeed.destination === dest.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">{dest.title}</span>
                  <span className={`text-[10px] mt-0.5 block ${
                    purposeOfDeed.destination === dest.key ? 'text-emerald-100' : 'text-slate-500'
                  }`}>{dest.desc}</span>
                </button>
              ))}
            </div>

            {/* Foreign Entity Details if Visa or Foreign */}
            {(purposeOfDeed.destination === 'ملف_تأشيرة_سفر' || purposeOfDeed.destination === 'ملف_إداري_أجنبي') && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-blue-950 font-black">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>بيانات الجهة الأجنبية ومتطلبات الترجمة والتأشير:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الدولة الأجنبية:</label>
                    <input
                      type="text"
                      value={purposeOfDeed.foreignEntityInfo?.country || ''}
                      onChange={e => setPurposeOfDeed(prev => ({
                        ...prev,
                        foreignEntityInfo: { ...prev.foreignEntityInfo!, country: e.target.value },
                      }))}
                      placeholder="مثال: فرنسا، إسبانيا، كندا"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم المؤسسة أو القنصلية:</label>
                    <input
                      type="text"
                      value={purposeOfDeed.foreignEntityInfo?.entityName || ''}
                      onChange={e => setPurposeOfDeed(prev => ({
                        ...prev,
                        foreignEntityInfo: { ...prev.foreignEntityInfo!, entityName: e.target.value },
                      }))}
                      placeholder="مثال: القنصلية العامة، مصلحة الهجرة"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">لائحة الأبوستيل (Apostille):</label>
                    <button
                      type="button"
                      onClick={() => setPurposeOfDeed(prev => ({
                        ...prev,
                        foreignEntityInfo: {
                          ...prev.foreignEntityInfo!,
                          needsApostille: !prev.foreignEntityInfo?.needsApostille,
                        },
                      }))}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        purposeOfDeed.foreignEntityInfo?.needsApostille
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {purposeOfDeed.foreignEntityInfo?.needsApostille ? '✓ مشمول بالأبوستيل' : '○ دون أبوستيل'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Duration & Nature */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-800">
              طبيعة الالتزام ومدته القانونية:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'إقرار_بتكفل_قائم_ومستمر', title: 'إقرار بتكفل قائم ومستمر', desc: 'إثبات واقعة سابقة ومستمرة' },
                { key: 'التزام_مستقبلي', title: 'التزام مستقبلي دائم', desc: 'سارٍ للمستقبل' },
                { key: 'مستمر_لحين_تحقق_سبب', title: 'مستمر لحين تحقق شرط/سبب', desc: 'بلوغ الرشد أو انتهاء الدراسة' },
              ].map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setCommitmentNature(prev => ({
                    ...prev,
                    natureType: d.key as any,
                  }))}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    commitmentNature.natureType === d.key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">{d.title}</span>
                  <span className={`text-[10px] mt-0.5 block ${
                    commitmentNature.natureType === d.key ? 'text-emerald-100' : 'text-slate-500'
                  }`}>{d.desc}</span>
                </button>
              ))}
            </div>

            {commitmentNature.natureType === 'مستمر_لحين_تحقق_سبب' && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">شرط أو واقعة انتهاء التكفل:</label>
                <select
                  value={commitmentNature.terminationEvent}
                  onChange={e => setCommitmentNature(prev => ({ ...prev, terminationEvent: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="بلوغ_سن_الرشد">بلوغ سن الرشد القانوني (18 سنة كاملة) واستقلاله بالمعيشة</option>
                  <option value="انتهاء_الدراسة">انتهاء الدراسة والتخرج والحصول على عمل قار</option>
                  <option value="الشفاء_وزوال_المرض">الشفاء وزوال المرض والعجز</option>
                  <option value="تحسن_الوضعية">تحسن الوضعية المالية والاستغناء عن الدعم</option>
                  <option value="اتفاق_الأطراف">اتفاق الأطراف كتابة على إنهاء التكفل</option>
                  <option value="أخرى">سبب آخر يحدده العدل</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStage(3)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>التالي: محرك الشهود والمعاينة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STAGE 5: WITNESSES & PROOF (الشهود والإثبات) */}
      {/* ==================================================================== */}
      {currentStage === 5 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>محرك شهود المعرفة والإثبات</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              إشهاد شاهدي معرفة على صحة التكفل والإنفاق الفعلي وملاءة المتكفل طبقاً للأصول العدلية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {witnesses.map((w, idx) => (
              <div key={w.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>الشاهد ({idx + 1}):</span>
                </span>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الكامل:</label>
                    <input
                      type="text"
                      value={w.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setWitnesses(prev => prev.map(item => item.id === w.id ? { ...item, fullName: val } : item));
                      }}
                      placeholder="اسم الشاهد الكامل"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم البطاقة الوطنية:</label>
                      <input
                        type="text"
                        value={w.idNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setWitnesses(prev => prev.map(item => item.id === w.id ? { ...item, idNumber: val } : item));
                        }}
                        placeholder="رقم ب.ت.و"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">المهنة:</label>
                      <input
                        type="text"
                        value={w.profession || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setWitnesses(prev => prev.map(item => item.id === w.id ? { ...item, profession: val } : item));
                        }}
                        placeholder="مهنة الشاهد"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان الشاهد:</label>
                    <input
                      type="text"
                      value={w.address || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setWitnesses(prev => prev.map(item => item.id === w.id ? { ...item, address: val } : item));
                      }}
                      placeholder="عنوان سكنى الشاهد"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Explicit Checkboxes of what is testified to */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="block text-[11px] font-black text-slate-700 mb-1.5">
                    الوقائع المشهود بها تحت المسؤولية:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { key: 'صلة_القرابة', label: 'معرفة القرابة' },
                      { key: 'واقعة_التكفل', label: 'معاينة الإنفاق الفعلي' },
                      { key: 'نوع_المصاريف', label: 'شمول المأكل والكسوة' },
                      { key: 'استمرار_التكفل', label: 'استمرار النفقة' },
                      { key: 'قدرة_الكافل', label: 'ملاءة المتكفل المالية' },
                    ].map(pt => {
                      const pKey = pt.key as any;
                      const hasPoint = w.testimonyPoints.includes(pKey);
                      return (
                        <button
                          key={pt.key}
                          type="button"
                          onClick={() => {
                            setWitnesses(prev => prev.map(item => {
                              if (item.id !== w.id) return item;
                              const next = hasPoint
                                ? item.testimonyPoints.filter(p => p !== pKey)
                                : [...item.testimonyPoints, pKey];
                              return { ...item, testimonyPoints: next };
                            }));
                          }}
                          className={`p-1.5 rounded-lg border text-right transition-all font-bold ${
                            hasPoint
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                        >
                          {hasPoint ? '✓ ' : '○ '} {pt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStage(4)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStage(6)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>التالي: المراجعة النهائية والاعتماد للخطوة 7</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STAGE 6: FINAL REVIEW & STEP 7 TRANSIT (المراجعة والاعتماد) */}
      {/* ==================================================================== */}
      {currentStage === 6 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>المراجعة القانونية الشاملة لرسم الكفالة والتكفل</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تدقيق أركان الرسم والشروط الشرعية قبل الانتقال المباشر للخطوة 7 (المراجعة الذكية والتوثيق)
            </p>
          </div>

          {/* Quick Recap Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-bold block text-[11px]">طبيعة الرسم والمسار:</span>
              <span className="font-black text-slate-900 block text-sm">{kafalaCategory.replace(/_/g, ' ')}</span>
              <span className="text-[11px] text-emerald-700 font-bold block">
                {isAbandonedChild ? 'قانون 15.01 (قضاء القاصرين)' : 'تكفل عائلي وفق مدونة الأسرة'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-bold block text-[11px]">المتكفل والمستفيد:</span>
              <span className="font-black text-slate-900 block truncate">
                المتكفل: {sponsors[0]?.fullName || '---'}
              </span>
              <span className="font-black text-slate-900 block truncate">
                المستفيد: {beneficiaries[0]?.fullName || '---'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-bold block text-[11px]">الالتزام والجهة:</span>
              <span className="font-black text-slate-900 block">
                {financialCommitment.commitmentType === 'مبلغ_شهري_محدد' && financialCommitment.amount
                  ? `${financialCommitment.amount.toLocaleString()} درهم شهرياً`
                  : 'تحمل المصاريف الفعلية'}
              </span>
              <span className="text-[11px] text-slate-600 font-bold block truncate">
                الوجهة: {purposeOfDeed.destination.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* PROMINENT RED STEP 7 DIRECT TRANSIT BUTTON */}
          <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-red-300/80 text-center space-y-4 shadow-sm">
            <div>
              <h4 className="font-black text-slate-900 text-base">جاهزية التحرير العدلي والاعتماد</h4>
              <p className="text-xs text-slate-600 mt-1">
                عند الضغط، سيتم توليد نص الرسم العدلي الكامل للتكفل العائلي / الكفالة بالصيغة القضائية المعتمدة ونقلك مباشرة إلى الخطوة 7 للمراجعة الذكية والتوثيق
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleProceedToStep7}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-red-500/40 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span>اعتماد رسم الكفالة والتكفل والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStage(5)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: محرك الشهود</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
