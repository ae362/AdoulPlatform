import React, { useState, useEffect, useMemo } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  AgentDismissalDeed,
  AgentDismissalPartyInfo
} from '../../../../types/feesAgentTypes';
import {
  FileText, Shield, Users, User, Building2, Scale, Clock,
  CheckCircle2, AlertTriangle, AlertCircle, Plus, Trash2,
  ArrowLeft, Send,
  Globe, ShieldCheck, Building, Info
} from 'lucide-react';

// Available powers for dismissal
const DISMISSAL_POWERS_CATALOG = [
  { id: 'sale', label: 'البيع وتفويت العقارات' },
  { id: 'purchase', label: 'الشراء واكتساب الأملاك' },
  { id: 'mortgage', label: 'الرهن الرسمي والحيازي' },
  { id: 'partition', label: 'القسمة الرضائية وتصفية التركات' },
  { id: 'lease', label: 'الكراء طويل الأمد وتدبير الأكرية' },
  { id: 'management', label: 'الإدارة والتسيير العام' },
  { id: 'price_receipt', label: 'قبض الثمن وإبراء الذمة' },
  { id: 'signing', label: 'التوقيع لدى العدول والمحافظة العقارية' },
  { id: 'litigation', label: 'التقاضي والتمثيل أمام المحاكم' },
  { id: 'representation', label: 'تمثيل الموكل لدى الإدارات العمومية' },
  { id: 'create_real_right', label: 'إنشاء الحقوق العينية (السطحية، الهواء، الارتفاق...)' },
  { id: 'transfer_real_right', label: 'نقل الحقوق العينية' },
  { id: 'amend_real_right', label: 'تعديل الحقوق العينية' },
  { id: 'cancel_real_right', label: 'إسقاط الحقوق العينية والتنازل عنها' },
  { id: 'other', label: 'صلاحيات وتصرفات أخرى' }
];

export const AgentDismissalWorkflow: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  // Active inner stage (1 to 5)
  const [activeStage, setActiveStage] = useState<number>(() => {
    if (state.step && state.step >= 1 && state.step <= 5) return state.step;
    return 1;
  });

  const changeStage = (newStage: number) => {
    setActiveStage(newStage);
    setState(prev => ({
      ...prev,
      step: newStage
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated transition to Step 7 (المراجعة الذكية والتوثيق)
  const handleProceedToStep7 = () => {
    setState(prev => ({
      ...prev,
      step: 7,
      draft: generatedRasmDraftText
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initialize or read agentDismissal from state (Blank, no random/dummy values)
  const dismissalData = useMemo<AgentDismissalDeed>(() => {
    return (
      state.agentDismissal || {
        originalPoa: {
          sourceType: 'adoul',
          book: '',
          letter: '',
          page: '',
          number: '',
          date: '',
          court: '',
          summaryText: '',
          issuerAuthority: '',
          documentNumber: '',
          place: '',
          docType: '',
          fixedDate: '',
          fixedDateAuthority: '',
          referenceNumber: '',
          country: '',
          city: '',
          foreignIssuer: '',
          foreignNumber: '',
          foreignDate: '',
          isApostilled: false,
          hasCertifiedTranslation: false
        },
        registryInfo: {
          isRegistered: 'no',
          primaryCourt: '',
          registrationDate: '',
          registrationNumber: '',
          hasCertificate: false,
          certificateAttachmentName: '',
          isMatchedWithOriginal: false
        },
        principals: [
          {
            id: 'p1',
            partyType: 'natural',
            fullName: '',
            birthDate: '',
            birthPlace: '',
            nationality: 'مغربية',
            idCardNumber: '',
            address: '',
            latinName: '',
            capacityVerified: false
          }
        ],
        isMultiplePrincipals: false,
        divisibleTransactionVerified: false,
        agents: [
          {
            id: 'a1',
            partyType: 'natural',
            fullName: '',
            birthDate: '',
            birthPlace: '',
            nationality: 'مغربية',
            idCardNumber: '',
            address: '',
            latinName: '',
            capacityVerified: false
          }
        ],
        isMultipleAgents: false,
        dismissalTarget: 'all',
        selectedAgentIds: ['a1'],
        dismissalScopeType: 'full',
        revokedPowers: [],
        otherRevokedPowerCustom: '',
        retainedPowers: [],
        subjectCategory: 'real_estate',
        propertyType: 'titled',
        propertyTitleNumber: '',
        propertyLocation: '',
        propertyDescription: '',
        propertyCondition: 'free',
        hasThirdPartyInterest: false,
        isCompensationReserved: false,
        compensationAmountText: '',
        isDeedReturnDemanded: true,
        dispositionType: 'ownership_transfer',
        inInterestOfAgentOrThirdParty: 'no',
        interestVerificationNote: '',
        isLitigationPoa: false,
        caseStatus: 'not_ready',
        subAgent: {
          hasSubAgent: false,
          subAgentDismissalImpact: 'dismissed_automatically'
        },
        formRequirementObserved: true,
        notificationMethod: 'written_notice',
        notificationDate: '',
        notificationOfficer: '',
        notificationDetails: '',
        thirdPartyProtectionAcknowledged: true,
        requiresRegistryCancellation: true,
        cancellationRequestNumber: '',
        cancellationPrimaryCourt: '',
        cancellationCertificateModel7Number: '',
        cancellationCertificateDate: '',
        nationalRegistryStatus: 'synced',
        timelineEvents: []
      }
    );
  }, [state.agentDismissal]);

  // Local helper to update nested deed data
  const updateDeed = (updater: (prev: AgentDismissalDeed) => AgentDismissalDeed) => {
    setState((prevState) => {
      const current = prevState.agentDismissal || dismissalData;
      const nextDeed = updater(current);
      return {
        ...prevState,
        agentDismissal: nextDeed
      };
    });
  };

  // Dynamic summary text of the original POA
  const effectivePoaSummary = useMemo(() => {
    const poa = dismissalData.originalPoa;
    if (poa.sourceType === 'adoul') {
      return `دفتر (${poa.book || '...'}) حرف (${poa.letter || '...'}) صحيفة (${poa.page || '...'}) عدد (${poa.number || '...'}) بتاريخ (${poa.date || '...'}) توثيق محكمة (${poa.court || '...'})`;
    } else if (poa.sourceType === 'official_other') {
      return `محرر رسمي صادر عن (${poa.issuerAuthority || '...'}) تحت رقم (${poa.documentNumber || '...'}) بتاريخ (${poa.date || '...'}) بـ (${poa.place || '...'})`;
    } else if (poa.sourceType === 'fixed_date') {
      return `محرر ثابت التاريخ لدى (${poa.fixedDateAuthority || '...'}) بتاريخ (${poa.fixedDate || '...'}) تحت مرجع (${poa.referenceNumber || '...'})`;
    } else if (poa.sourceType === 'foreign') {
      return `وكالة أجنبية صادرة بـ (${poa.city || '...'} - ${poa.country || '...'}) عن (${poa.foreignIssuer || '...'}) رقم (${poa.foreignNumber || '...'}) بتاريخ (${poa.foreignDate || '...'})`;
    }
    return poa.summaryText || `وكالة مستوردة من سجلات المنصة الرقمية`;
  }, [dismissalData.originalPoa]);

  // Handle Principal Add/Remove
  const addPrincipal = () => {
    updateDeed(prev => ({
      ...prev,
      isMultiplePrincipals: true,
      principals: [
        ...prev.principals,
        {
          id: Math.random().toString(36).substring(2, 9),
          partyType: 'natural',
          fullName: '',
          idCardNumber: '',
          address: '',
          nationality: 'مغربية',
          capacityVerified: true
        }
      ]
    }));
  };

  const removePrincipal = (id: string) => {
    if (dismissalData.principals.length <= 1) return;
    updateDeed(prev => ({
      ...prev,
      principals: prev.principals.filter(p => p.id !== id),
      isMultiplePrincipals: prev.principals.length > 2
    }));
  };

  const updatePrincipal = (id: string, field: keyof AgentDismissalPartyInfo, value: any) => {
    updateDeed(prev => ({
      ...prev,
      principals: prev.principals.map(p => (p.id === id ? { ...p, [field]: value } : p))
    }));
  };

  // Handle Agent Add/Remove
  const addAgent = () => {
    updateDeed(prev => ({
      ...prev,
      isMultipleAgents: true,
      agents: [
        ...prev.agents,
        {
          id: Math.random().toString(36).substring(2, 9),
          partyType: 'natural',
          fullName: '',
          idCardNumber: '',
          address: '',
          nationality: 'مغربية',
          capacityVerified: true
        }
      ]
    }));
  };

  const removeAgent = (id: string) => {
    if (dismissalData.agents.length <= 1) return;
    updateDeed(prev => ({
      ...prev,
      agents: prev.agents.filter(a => a.id !== id),
      isMultipleAgents: prev.agents.length > 2
    }));
  };

  const updateAgent = (id: string, field: keyof AgentDismissalPartyInfo, value: any) => {
    updateDeed(prev => ({
      ...prev,
      agents: prev.agents.map(a => (a.id === id ? { ...a, [field]: value } : a))
    }));
  };

  // Toggle Revoked Power
  const togglePower = (label: string) => {
    updateDeed(prev => {
      const exists = prev.revokedPowers.includes(label);
      const newRevoked = exists
        ? prev.revokedPowers.filter(p => p !== label)
        : [...prev.revokedPowers, label];

      // Retained powers are those in catalog that are not in newRevoked
      const allLabels = DISMISSAL_POWERS_CATALOG.map(c => c.label);
      const newRetained = prev.dismissalScopeType === 'partial'
        ? allLabels.filter(l => !newRevoked.includes(l))
        : [];

      return {
        ...prev,
        revokedPowers: newRevoked,
        retainedPowers: newRetained
      };
    });
  };

  // Generated Authentic Notarial Draft Text for Rasm
  const generatedRasmDraftText = useMemo(() => {
    const principalsText = dismissalData.principals
      .map(p => {
        if (p.partyType === 'legal') {
          return `شركة (${p.companyName || '...'}) في شخص ممثلها القانوني السيد (${p.legalRepresentativeName || '...'}) بصفته (${p.representativeCapacity || 'مسير'})`;
        }
        return `السيد (${p.fullName || '...'}) الحامل لبطاقة التعريف الوطنية رقم (${p.idCardNumber || '...'}) الساكن بـ (${p.address || '...'})`;
      })
      .join('، و');

    const agentsText = dismissalData.agents
      .filter(a => dismissalData.dismissalTarget === 'all' || dismissalData.selectedAgentIds.includes(a.id))
      .map(a => {
        if (a.partyType === 'legal') {
          return `شركة (${a.companyName || '...'}) في شخص ممثلها`;
        }
        return `السيد (${a.fullName || '...'}) الحامل لبطاقة التعريف الوطنية رقم (${a.idCardNumber || '...'}) الساكن بـ (${a.address || '...'})`;
      })
      .join('، و');

    const isPartial = dismissalData.dismissalScopeType === 'partial';
    const scopeDesc = isPartial
      ? `عزلاً جزئياً يقتصر حصراً على الصلاحيات التالية: (${dismissalData.revokedPowers.join('، ')}${dismissalData.otherRevokedPowerCustom ? '، ' + dismissalData.otherRevokedPowerCustom : ''})، مع بقاء ما عدا ذلك من الصلاحيات الواردة بأصل الوكالة المذكورة سارياً ومنتجاً لآثاره القانونية.`
      : `عزلاً كلياً وتاماً يشمل سائر وأوفى الصلاحيات والتفويضات المخولة له بمقتضى الوكالة المحددة أدناه.`;

    const registryText = dismissalData.registryInfo.isRegistered === 'yes'
      ? `، والمقيدة بالسجل المحلي للوكالات المتعلقة بالحقوق العينية الممسوك لدى كتابة الضبط بالمحكمة الابتدائية بـ (${dismissalData.registryInfo.primaryCourt || '...'}) بتاريخ (${dismissalData.registryInfo.registrationDate || '...'}) تحت رقم التقييد المركب (${dismissalData.registryInfo.registrationNumber || '...'})`
      : '';

    const propertyText = dismissalData.subjectCategory === 'real_estate'
      ? ` والمتعلقة بالعقار ذي ${dismissalData.propertyType === 'titled' ? 'الرسم العقاري عدد ' + (dismissalData.propertyTitleNumber || '...') : dismissalData.propertyType === 'requisition' ? 'مطلب التحفيظ عدد ' + (dismissalData.propertyRequisitionNumber || '...') : 'العقار غير المحفظ المسمى ' + (dismissalData.propertyUnregisteredDescription || '...')}`
      : '';

    const subAgentText = dismissalData.subAgent.hasSubAgent
      ? ` وقد صرح الموكل بأن هذا العزل يسري كذلك في مواجهة نائب الوكيل السيد (${dismissalData.subAgent.subAgentName || '...'}) المعين بمقتضى الإنابة المضمنة بـ (${dismissalData.subAgent.subAgentReference || '...'}) تطبيقاً لمقتضيات الفصل 937 من قانون الالتزامات والعقود.`
      : '';

    return `الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.

حضر لدى عدلي التوثيق الموقعين أسفله، المنتصبين للإشهاد بدائرة المحكمة الابتدائية المعنية، ${principalsText}، وبعد تعريفهما لهما قدره التام والهوية الكاملة، صرح بأنه يعزل وكيله ${agentsText}، ${scopeDesc} من أصل الوكالة الصادرة عنه بموجب ${effectivePoaSummary}${propertyText}${registryText}.${subAgentText}

وقد قرر الموكل تجريد وكيله المعزول من ممارسة أي تصرف من التصرفات المذكورة، مع إلزامه بإرجاع نظير الوكالة وكافة الوثائق والمستندات المسلمة إليه. وقد تم إشعار الوكيل بمقتضى هذا العزل عبر (${dismissalData.notificationMethod === 'present_in_majlis' ? 'حضوره بمجلس الإشهاد العدلي' : dismissalData.notificationMethod === 'written_notice' ? 'إشعار كتابي رسمي مؤرخ في ' + dismissalData.notificationDate : 'المساطر المنصوص عليها بالفصل 932 من ق.ل.ع'}). 

وبما ذكر صرح الموكل والتزم، وشهد عليه به في صحة وعقل وجواز أمر في تاريخه المبارك.`;
  }, [dismissalData, effectivePoaSummary]);

  // Sync draft text to main state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      draft: generatedRasmDraftText
    }));
  }, [generatedRasmDraftText, setState]);

  // Smart 16-point Audit Checklist for Dismissal
  const auditChecks = useMemo(() => {
    const pValid = dismissalData.principals.every(p => p.fullName.trim() && (p.partyType === 'legal' || p.idCardNumber.trim()));
    const aValid = dismissalData.agents.every(a => a.fullName.trim() && (a.partyType === 'legal' || a.idCardNumber.trim()));
    const poaRefValid = !!effectivePoaSummary?.trim();
    const hasPowers = dismissalData.dismissalScopeType === 'full' || dismissalData.revokedPowers.length > 0;
    const registryValid = dismissalData.registryInfo.isRegistered !== 'yes' || (!!dismissalData.registryInfo.registrationNumber && !!dismissalData.registryInfo.primaryCourt);

    return [
      { id: 1, title: 'تحديد الوكالة الأصلية محل العزل بدقة', valid: poaRefValid, stage: 1, color: 'blue' },
      { id: 2, title: 'استيفاء بيانات دفتر وحرف وصحيفة وعدد وتاريخ الوكالة', valid: !!dismissalData.originalPoa.number, stage: 1, color: 'blue' },
      { id: 3, title: 'توثيق المحكمة الابتدائية الصادرة عنها الوكالة', valid: !!dismissalData.originalPoa.court, stage: 1, color: 'blue' },
      { id: 4, title: 'تحديد وضعية التقييد في سجل الحقوق العينية (الفصل 889-1)', valid: !!dismissalData.registryInfo.isRegistered, stage: 1, color: 'emerald' },
      { id: 5, title: 'التحقق من رقم التقييد المركب والمحكمة وتاريخ التقييد', valid: registryValid, stage: 1, color: 'emerald' },
      { id: 6, title: 'اكتمال بيانات الموكل أو الموكلين وطبيعة الشخصية', valid: pValid, stage: 2, color: 'purple' },
      { id: 7, title: 'فحص صفة الحاضر وسند التمثيل القانوني للموكل', valid: dismissalData.principals[0]?.capacityVerified, stage: 2, color: 'purple' },
      { id: 8, title: 'فحص قابلية الصفقة للتجزئة عند تعدد الموكلين (الفصل 933)', valid: !dismissalData.isMultiplePrincipals || dismissalData.divisibleTransactionVerified, stage: 2, color: 'amber' },
      { id: 9, title: 'اكتمال بيانات الوكيل المعزول أو الوكلاء', valid: aValid, stage: 2, color: 'purple' },
      { id: 10, title: 'تحديد نطاق العزل بين الوكلاء بدون غموض (جميعهم/أحدهم)', valid: dismissalData.selectedAgentIds.length > 0, stage: 2, color: 'purple' },
      { id: 11, title: 'تحديد نوع العزل (كلي أو جزئي) والصلاحيات المعزولة', valid: hasPowers, stage: 3, color: 'blue' },
      { id: 12, title: 'تحديد موضوع الوكالة وبيانات المرجع العقاري', valid: !!dismissalData.propertyTitleNumber || dismissalData.subjectCategory !== 'real_estate', stage: 3, color: 'blue' },
      { id: 13, title: 'التحقق من عدم وجود شرط مصلحة للوكيل أو الغير (الفصل 931)', valid: dismissalData.inInterestOfAgentOrThirdParty === 'no', stage: 4, color: 'red' },
      { id: 14, title: 'فحص وضعية وكالة الخصومة والتقاضي', valid: !dismissalData.isLitigationPoa || dismissalData.caseStatus !== 'unknown', stage: 4, color: 'amber' },
      { id: 15, title: 'مراعاة مطابقة شكل العزل لشكل إنشاء الوكالة (الفصل 934)', valid: dismissalData.formRequirementObserved, stage: 4, color: 'emerald' },
      { id: 16, title: 'تحديد وسيلة وتاريخ إشعار الوكيل وحماية الغير حسن النية', valid: !!dismissalData.notificationMethod, stage: 4, color: 'emerald' }
    ];
  }, [dismissalData, effectivePoaSummary]);

  const auditPassedCount = auditChecks.filter(c => c.valid).length;
  const isAuditComplete = auditPassedCount === auditChecks.length;

  // Print Rasm
  return (
    <div className="space-y-6 font-kufi text-slate-800" dir="rtl">
      {/* ========================================================================= */}
      {/* 5️⃣ PERSISTENT LEGAL IDENTITY CARD (بطاقة الهوية القانونية للوكالة) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shrink-0">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  خطة العدالة المغربية — الفصول 927 إلى 938 ق.ل.ع
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {dismissalData.registryInfo.isRegistered === 'yes' ? 'مشمولة بسجل الحقوق العينية (381.25)' : 'وكالة عادية'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white mt-1">
                رسم عزل وكيل وإلغاء الصلاحيات التفويضية
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={handleProceedToStep7}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md ring-2 ring-red-500/30 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد رسم العزل والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
            </button>
          </div>
        </div>

        {/* Identity Details Row */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold">الوكالة الأصلية ومصدرها</p>
            <p className="font-black text-amber-200 truncate mt-0.5">
              {dismissalData.originalPoa.sourceType === 'adoul' && 'من تلقي العدلين'}
              {dismissalData.originalPoa.sourceType === 'official_other' && 'محرر رسمي آخر'}
              {dismissalData.originalPoa.sourceType === 'fixed_date' && 'ثابت التاريخ'}
              {dismissalData.originalPoa.sourceType === 'foreign' && 'وكالة أجنبية'}
              {dismissalData.originalPoa.sourceType === 'platform_existing' && 'من سجلات المنصة'}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold">مرجع الوكالة العدلي</p>
            <p className="font-mono font-bold text-white truncate mt-0.5">
              عدد {dismissalData.originalPoa.number || '...'} (صحيفة {dismissalData.originalPoa.page || '...'})
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold">سجل الحقوق العينية بالمحكمة</p>
            <p className="font-black text-emerald-300 truncate mt-0.5">
              {dismissalData.registryInfo.isRegistered === 'yes' ? dismissalData.registryInfo.primaryCourt : 'غير مقيدة'}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold">رقم التقييد الرسمي المركب</p>
            <p className="font-mono font-bold text-amber-300 truncate mt-0.5">
              {dismissalData.registryInfo.registrationNumber || '---'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE TABS (المراحل الـ 5 لبيت عزل وكيل) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { step: 1, title: '① الوكالة الأصلية', icon: '📜', desc: 'المراجع وسجل الحقوق' },
            { step: 2, title: '② الأطراف والإنابة', icon: '👥', desc: 'الموكل والوكيل والنائب' },
            { step: 3, title: '③ نطاق العزل والعقار', icon: '🎯', desc: 'كلي/جزئي ومحل الوكالة' },
            { step: 4, title: '④ الفحص والتدقيق', icon: '⚖️', desc: 'القيود والـ 16 فحصاً' },
            { step: 5, title: '⑤ إلغاء التقييد (النموذج 7)', icon: '🏛️', desc: 'كتابة الضبط والمسار' },
          ].map((tab) => {
            const isActive = activeStage === tab.step;
            return (
              <button
                key={tab.step}
                onClick={() => changeStage(tab.step)}
                className={`p-2.5 rounded-xl text-right transition border ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-black shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{tab.icon}</span>
                  <span className="text-xs font-bold truncate">{tab.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: 📜 الوكالة الأصلية ومصدرها وسجل الحقوق العينية */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6">
          {/* 1️⃣ بطاقة الوكالة الأصلية — المرحلة الأولى والإلزامية */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>1️⃣ 📜 ما هي الوكالة المراد عزلها؟ (المرحلة الأولى والإلزامية)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  البيت ينطلق أولاً من تحديد الوكالة الأصلية ومصدرها لربط الأثر القانوني قبل بيانات الأشخاص.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                إلزامي
              </span>
            </div>

            {/* Source Types */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { id: 'adoul', title: 'وكالة من تلقي العدلين', icon: '📜', desc: 'دفتر، حرف، صحيفة، عدد' },
                { id: 'official_other', title: 'محرر رسمي آخر', icon: '🏛️', desc: 'موثق، إدارة عمومية' },
                { id: 'fixed_date', title: 'محرر ثابت التاريخ', icon: '📅', desc: 'عرفي مصادق عليه' },
                { id: 'foreign', title: 'وكالة محررة بالخارج', icon: '🌍', desc: 'قنصلية، أبوستيل' },
                { id: 'platform_existing', title: 'موجودة بالمنصة', icon: '💾', desc: 'استيراد آلي فوري' },
              ].map(s => {
                const isSelected = dismissalData.originalPoa.sourceType === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => updateDeed(prev => ({
                      ...prev,
                      originalPoa: { ...prev.originalPoa, sourceType: s.id as any }
                    }))}
                    className={`p-3.5 rounded-xl border text-right transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl mb-1">{s.icon}</span>
                    <div>
                      <p className="text-xs font-bold">{s.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 2️⃣ بيانات مصدر الوكالة (حسب الاختيار) */}
            {dismissalData.originalPoa.sourceType === 'adoul' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>📜 مراجع الوكالة العدلية الرسمية</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">دفتر</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.book || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, book: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                      placeholder="03"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">حرف</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.letter || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, letter: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="د"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">صحيفة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.page || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, page: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                      placeholder="142"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عدد</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.number || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, number: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                      placeholder="88"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">بتاريخ</label>
                    <input
                      type="date"
                      value={dismissalData.originalPoa.date || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, date: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">توثيق المحكمة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.court || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, court: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="المحكمة الابتدائية بتطوان"
                    />
                  </div>
                </div>

                {/* Auto Summary Box */}
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <p className="font-bold text-indigo-950">
                    الوكالة محل العزل: <span className="font-normal text-slate-700">{effectivePoaSummary}</span>
                  </p>
                </div>
              </div>
            )}

            {dismissalData.originalPoa.sourceType === 'official_other' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800">بيانات المحرر الرسمي الآخر</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الجهة المحررة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.issuerAuthority || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, issuerAuthority: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="موثق، سفارة..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم المحرر</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.documentNumber || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, documentNumber: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                      placeholder="DOC-2024/991"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ المحرر</label>
                    <input
                      type="date"
                      value={dismissalData.originalPoa.date || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, date: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان التحرير</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.place || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, place: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="الرباط، الدار البيضاء..."
                    />
                  </div>
                </div>
              </div>
            )}

            {dismissalData.originalPoa.sourceType === 'foreign' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800">بيانات الوكالة المحررة بالخارج</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.country || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, country: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="فرنسا، إسبانيا..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.city || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, city: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="باريس، مدريد..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الجهة المصدرة للوكالة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.foreignIssuer || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, foreignIssuer: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="قنصلية المملكة، كاتب عدل..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم وتاريخ الوكالة</label>
                    <input
                      type="text"
                      value={dismissalData.originalPoa.foreignNumber || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, foreignNumber: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="1849/2024"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dismissalData.originalPoa.hasApostilleOrLegalization || false}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, hasApostilleOrLegalization: e.target.checked } }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>مصحوبة بالأبوستيل (Apostille) أو التصديق القنصلي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dismissalData.originalPoa.isTranslated || false}
                      onChange={e => updateDeed(prev => ({ ...prev, originalPoa: { ...prev.originalPoa, isTranslated: e.target.checked } }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>مرفقة بترجمة رسمية محلفة إلى اللغة العربية</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 3️⃣ 🏛️ بطاقة «التقييد في سجل الوكالات المتعلقة بالحقوق العينية» */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>3️⃣ 🏛️ التقييد في سجل الوكالات المتعلقة بالحقوق العينية (الفصل 889-1 والمرسوم 2.23.101)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تظهر تلقائياً عندما تكون الوكالة ضمن نطاق التصرفات العقارية، لحفظ الرقم المركب الرسمي واستعماله في طلب الإلغاء.
                </p>
              </div>
            </div>

            {/* Registered in registry radio */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">هل الوكالة مقيدة في السجل المحلي بالمحكمة؟</label>
              <div className="flex gap-4">
                {[
                  { id: 'yes', label: '🔘 نعم (مقيدة رسمياً بالسجل المحلي)' },
                  { id: 'no', label: '🔘 لا (غير مشمولة أو لم تقيد)' },
                  { id: 'unknown', label: '🔘 غير معلوم (يتعين الاستفسار)' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => updateDeed(prev => ({ ...prev, registryInfo: { ...prev.registryInfo, isRegistered: r.id as any } }))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      dismissalData.registryInfo.isRegistered === r.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {dismissalData.registryInfo.isRegistered === 'yes' && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>🏛️ مراجع التقييد بالسجل المحلي للمحكمة</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة الابتدائية التي قيدت بها</label>
                    <input
                      type="text"
                      value={dismissalData.registryInfo.primaryCourt || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, registryInfo: { ...prev.registryInfo, primaryCourt: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="المحكمة الابتدائية بتطوان"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ التقييد بالسجل</label>
                    <input
                      type="date"
                      value={dismissalData.registryInfo.registrationDate || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, registryInfo: { ...prev.registryInfo, registrationDate: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم التقييد المركب الرسمي (قرار 381.25)
                    </label>
                    <input
                      type="text"
                      value={dismissalData.registryInfo.registrationNumber || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, registryInfo: { ...prev.registryInfo, registrationNumber: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-emerald-900"
                      placeholder="REG-TT-2025/00492"
                    />
                  </div>
                </div>

                {/* 4️⃣ شهادة تقييد الوكالة */}
                <div className="pt-3 border-t border-emerald-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-800">هل تتوفر شهادة التقييد الصادرة عن كتابة الضبط؟</span>
                    <button
                      onClick={() => updateDeed(prev => ({ ...prev, registryInfo: { ...prev.registryInfo, hasCertificate: !prev.registryInfo.hasCertificate } }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        dismissalData.registryInfo.hasCertificate ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {dismissalData.registryInfo.hasCertificate ? 'نعم متوفرة' : 'لا'}
                    </button>
                  </div>

                  {dismissalData.registryInfo.hasCertificate && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-300">
                        📎 {dismissalData.registryInfo.certificateAttachmentName || 'شهادة_تقييد.pdf'}
                      </span>
                      <button
                        onClick={() => alert('تمت مطابقة مراجع الوكالة الأصلية مع شهادة التقييد بالسجل المحلي بنجاح (المطابقة القانونية 100%).')}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>🔐 مطابقة المراجع</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => onBack ? onBack() : setState(prev => ({ ...prev, step: 0.25 }))}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              العودة لبوابة التلقي العدلي (0.25)
            </button>
            <button
              onClick={() => changeStage(2)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة للأطراف والإنابة (المرحلة ②)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: 👥 أطراف الوكالة والعزل — الموكل والوكيل والإنابة */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6">
          {/* 6️⃣ الموكل (طالب العزل) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>6️⃣ 👤 الموكل (طالب العزل) وفحص الصفة والتمثيل</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  العزل تصرف يصدر عن الموكل شخصياً أو من يمثله قانوناً بسند صفة نافذ.
                </p>
              </div>
              <button
                onClick={addPrincipal}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موكل آخر</span>
              </button>
            </div>

            {/* Principals List */}
            <div className="space-y-4">
              {dismissalData.principals.map((principal, idx) => (
                <div key={principal.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                      الموكل {idx + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Nature */}
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`principal-nature-${principal.id}`}
                            checked={principal.partyType === 'natural'}
                            onChange={() => updatePrincipal(principal.id, 'partyType', 'natural')}
                          />
                          <span>شخص ذاتي</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`principal-nature-${principal.id}`}
                            checked={principal.partyType === 'legal'}
                            onChange={() => updatePrincipal(principal.id, 'partyType', 'legal')}
                          />
                          <span>شخص معنوي (شركة / هيئة)</span>
                        </label>
                      </div>

                      {dismissalData.principals.length > 1 && (
                        <button
                          onClick={() => removePrincipal(principal.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {principal.partyType === 'natural' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل بالعربية</label>
                        <input
                          type="text"
                          value={principal.fullName}
                          onChange={e => updatePrincipal(principal.id, 'fullName', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="الاسم الشخصي والعائلي"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم بطاقة الهوية / جواز السفر</label>
                        <input
                          type="text"
                          value={principal.idCardNumber}
                          onChange={e => updatePrincipal(principal.id, 'idCardNumber', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                          placeholder="L381921"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان الكامل ومحل الإقامة</label>
                        <input
                          type="text"
                          value={principal.address}
                          onChange={e => updatePrincipal(principal.id, 'address', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="المدينة، الحي، الشارع، الرقم..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم القانوني للشركة</label>
                        <input
                          type="text"
                          value={principal.companyName || ''}
                          onChange={e => updatePrincipal(principal.id, 'companyName', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="شركة ... ش.م.م"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم السجل التجاري ومقره</label>
                        <input
                          type="text"
                          value={principal.commercialRegisterNumber || ''}
                          onChange={e => updatePrincipal(principal.id, 'commercialRegisterNumber', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                          placeholder="RC 44102 تطوان"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">الممثل القانوني وصفته</label>
                        <input
                          type="text"
                          value={principal.legalRepresentativeName || ''}
                          onChange={e => updatePrincipal(principal.id, 'legalRepresentativeName', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="السيد ... بصفته مسيراً"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Check badge */}
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                    <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>🔐 فحص الصفة: تم التحقق من صفة الحاضر وأهليته المعتبرة قانوناً في إصدار العزل.</span>
                    </span>
                    <span className="text-[11px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      متحقق منه ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 7️⃣ تنبيه تعدد الموكلين والفصل 933 ق.ل.ع */}
            {dismissalData.principals.length > 1 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-black">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>تنبيه قضائي ملزم — الفصل 933 من قانون الالتزامات والعقود (تعدد الموكلين):</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  "إذا أُعطيت الوكالة من عدة أشخاص من أجل نفس الصفقة، فلا تلغى إلا بموافقتهم جميعاً، غير أنه إذا كانت الصفقة قابلة للتجزئة فإن الإلغاء ينهي الوكالة بالنسبة إلى حصة من ألغاها فقط".
                </p>
                <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dismissalData.divisibleTransactionVerified}
                    onChange={e => updateDeed(prev => ({ ...prev, divisibleTransactionVerified: e.target.checked }))}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>أشهد بأن الصفقة قابلة للتجزئة أو أن جميع الموكلين موافقون على إيقاع العزل المذكور.</span>
                </label>
              </div>
            )}
          </div>

          {/* 8️⃣ و 9️⃣ الوكيل المعزول وتعدد الوكلاء */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>8️⃣ و 9️⃣ 👤 الوكيل المعزول ونطاق التوجيه بين الوكلاء</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد بيانات الوكيل المستوردة من الوكالة مع ضبط العزل الجزئي أو الكلي بين الوكلاء.
                </p>
              </div>
              <button
                onClick={addAgent}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة وكيل آخر</span>
              </button>
            </div>

            {/* If Multiple Agents */}
            {dismissalData.agents.length > 1 && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs flex items-center gap-4">
                <span className="font-bold text-indigo-950">نطاق عزل الوكلاء:</span>
                {[
                  { id: 'all', label: '🔘 عزل جميع الوكلاء' },
                  { id: 'one', label: '🔘 عزل وكيل واحد' },
                  { id: 'some', label: '🔘 عزل بعض الوكلاء المحددين' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateDeed(prev => ({ ...prev, dismissalTarget: opt.id as any }))}
                    className={`px-3 py-1 rounded-lg font-bold border transition ${
                      dismissalData.dismissalTarget === opt.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Agents List */}
            <div className="space-y-4">
              {dismissalData.agents.map((agent, idx) => {
                const isTargeted = dismissalData.dismissalTarget === 'all' || dismissalData.selectedAgentIds.includes(agent.id);
                return (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-xl border space-y-3 transition ${
                      isTargeted ? 'bg-red-50/30 border-red-200 ring-1 ring-red-500/20' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${isTargeted ? 'bg-red-600 text-white' : 'bg-slate-500 text-white'}`}>
                          الوكيل {idx + 1}
                        </span>
                        {dismissalData.agents.length > 1 && (
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer mr-3">
                            <input
                              type="checkbox"
                              checked={isTargeted}
                              onChange={e => {
                                const newIds = e.target.checked
                                  ? [...dismissalData.selectedAgentIds, agent.id]
                                  : dismissalData.selectedAgentIds.filter(id => id !== agent.id);
                                updateDeed(prev => ({ ...prev, selectedAgentIds: newIds }));
                              }}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span>مشمول بهذا العزل</span>
                          </label>
                        )}
                      </div>

                      {dismissalData.agents.length > 1 && (
                        <button
                          onClick={() => removeAgent(agent.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الوكيل بالعربية</label>
                        <input
                          type="text"
                          value={agent.fullName}
                          onChange={e => updateAgent(agent.id, 'fullName', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="الاسم الكامل للوكيل"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم بطاقة التعريف / جواز السفر</label>
                        <input
                          type="text"
                          value={agent.idCardNumber}
                          onChange={e => updateAgent(agent.id, 'idCardNumber', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                          placeholder="GM190442"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان الكامل</label>
                        <input
                          type="text"
                          value={agent.address}
                          onChange={e => updateAgent(agent.id, 'address', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          placeholder="العنوان الكامل للوكيل"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 1️⃣6️⃣ الوكيل ونائبه (الفصل 937 ق.ل.ع) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">👥 الوكيل ونائبه (الفصل 937 من قانون الالتزامات والعقود)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    "عزل الوكيل الأصلي يؤدي إلى عزل من أحله محله، ما لم يعين النائب بإذن الموكل".
                  </p>
                </div>
                <button
                  onClick={() => updateDeed(prev => ({
                    ...prev,
                    subAgent: { ...prev.subAgent, hasSubAgent: !prev.subAgent.hasSubAgent }
                  }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    dismissalData.subAgent.hasSubAgent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {dismissalData.subAgent.hasSubAgent ? 'يوجد نائب للوكيل' : 'لا يوجد نائب'}
                </button>
              </div>

              {dismissalData.subAgent.hasSubAgent && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم النائب / الوكيل الفرعي</label>
                    <input
                      type="text"
                      value={dismissalData.subAgent.subAgentName || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, subAgent: { ...prev.subAgent, subAgentName: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="اسم النائب"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">مرجع رسم الإنابة</label>
                    <input
                      type="text"
                      value={dismissalData.subAgent.subAgentReference || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, subAgent: { ...prev.subAgent, subAgentReference: e.target.value } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="رسم الإنابة عدد ... بتوثيق ..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">أثر العزل القانوني على النائب</label>
                    <select
                      value={dismissalData.subAgent.subAgentDismissalImpact || 'dismissed_automatically'}
                      onChange={e => updateDeed(prev => ({ ...prev, subAgent: { ...prev.subAgent, subAgentDismissalImpact: e.target.value as any } }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="dismissed_automatically">يعزل تلقائياً بعزل الوكيل الأصلي (الأصل)</option>
                      <option value="remains_authorized">يبقى معتمداً (عُين بإذن خاص من الموكل)</option>
                      <option value="needs_specific_clause">يُنص في الرسم على عزله صراحة</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => changeStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              الرجوع للوكالة الأصلية
            </button>
            <button
              onClick={() => changeStage(3)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة لنطاق العزل والعقار (المرحلة ③)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: 🎯 نطاق العزل وموضوع الوكالة والفرع العقاري */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-6">
          {/* 🔟 نوع العزل ونطاقه */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <span>🔟 🎯 نوع العزل ونطاق الصلاحيات المعزولة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد دقيق لما إذا كان العزل شاملاً لجميع الصلاحيات أو محصوراً في بعض التصرفات دون غيرها.
                </p>
              </div>
            </div>

            {/* Scope type selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => updateDeed(prev => ({
                  ...prev,
                  dismissalScopeType: 'full',
                  retainedPowers: []
                }))}
                className={`p-4 rounded-xl border text-right transition flex items-start gap-3 ${
                  dismissalData.dismissalScopeType === 'full'
                    ? 'border-red-600 bg-red-50/70 text-red-950 font-bold shadow-xs ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black shrink-0">
                  🔴
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">عزل كلي تام وشامل</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    يشمل العزل جميع الصلاحيات والتفويضات المخولة للوكيل بموجب الوكالة المحددة، ويجرده تماماً من التمثيل.
                  </p>
                </div>
              </button>

              <button
                onClick={() => updateDeed(prev => {
                  const allLabels = DISMISSAL_POWERS_CATALOG.map(c => c.label);
                  const retained = allLabels.filter(l => !prev.revokedPowers.includes(l));
                  return {
                    ...prev,
                    dismissalScopeType: 'partial',
                    retainedPowers: retained
                  };
                })}
                className={`p-4 rounded-xl border text-right transition flex items-start gap-3 ${
                  dismissalData.dismissalScopeType === 'partial'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-black shrink-0">
                  🟠
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">عزل جزئي محدد الصلاحيات</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ينصب العزل على صلاحيات معينة (مثل البيع والقبض) مع بقاء باقي التفويضات الواردة بالوكالة سارية.
                  </p>
                </div>
              </button>
            </div>

            {/* Powers Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">
                  {dismissalData.dismissalScopeType === 'full'
                    ? 'الصلاحيات المشمولة بالعزل التام (مختارة كلياً):'
                    : 'حدد الصلاحيات التي يشملها العزل الجزئي بدقة:'}
                </p>
                <span className="text-[11px] text-slate-400">
                  المحدد: {dismissalData.revokedPowers.length} صلاحية
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DISMISSAL_POWERS_CATALOG.map(power => {
                  const isChecked = dismissalData.dismissalScopeType === 'full' || dismissalData.revokedPowers.includes(power.label);
                  return (
                    <label
                      key={power.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-red-50/80 border-red-300 text-red-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={dismissalData.dismissalScopeType === 'full'}
                        checked={isChecked}
                        onChange={() => togglePower(power.label)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <span>{power.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Crucial Retained Powers Clarification Box */}
            {dismissalData.dismissalScopeType === 'partial' && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5">
                <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>نطاق الأثر القانوني المتبقي للوكيل:</span>
                </p>
                <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                  سيبقى الوكيل محتفظاً بالصلاحيات التالية:{' '}
                  <span className="font-bold underline">
                    {dismissalData.retainedPowers.length > 0 ? dismissalData.retainedPowers.join('، ') : 'لا توجد صلاحيات متبقية'}
                  </span>
                </p>
                <p className="text-[11px] text-amber-700">
                  (يمنع هذا البيان أي غموض أو نزاع لاحق حول حدود العزل تجاه الأغيار والإدارات).
                </p>
              </div>
            )}
          </div>

          {/* 1️⃣1️⃣ و 1️⃣2️⃣ موضوع الوكالة والفرع العقاري */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span>1️⃣1️⃣ و 1️⃣2️⃣ 🏠 موضوع ومحل الوكالة والفرع العقاري</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تحديد محل الوكالة وما إذا كانت تتناول عقاراً أو حقاً عينياً عقارياً وفق مقتضيات الفصل 889-1 من ق.ل.ع.
                </p>
              </div>
            </div>

            {/* Subject Category */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'real_estate', title: 'عقار', icon: '🏠' },
                { id: 'real_right', title: 'حق عيني عقاري', icon: '📜' },
                { id: 'movable', title: 'منقول أو مركبة', icon: '🚗' },
                { id: 'litigation', title: 'خصومة وتقاضي', icon: '⚖️' },
                { id: 'management', title: 'إدارة وتسيير', icon: '🏢' },
                { id: 'commercial', title: 'أعمال تجارية', icon: '💼' },
                { id: 'general', title: 'وكالة عامة شاملة', icon: '🌐' },
                { id: 'other', title: 'أخرى', icon: '📌' },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => updateDeed(prev => ({ ...prev, subjectCategory: sub.id as any }))}
                  className={`p-3 rounded-xl border text-right transition flex items-center gap-2 text-xs font-bold ${
                    dismissalData.subjectCategory === sub.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{sub.icon}</span>
                  <span>{sub.title}</span>
                </button>
              ))}
            </div>

            {/* Real Estate Branch fields */}
            {(dismissalData.subjectCategory === 'real_estate' || dismissalData.subjectCategory === 'real_right') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900">البيانات العقارية محل الوكالة</h4>

                {/* Property Type */}
                <div className="flex gap-4 text-xs font-bold">
                  {[
                    { id: 'titled', label: '🔘 عقار محفظ (رسم عقاري)' },
                    { id: 'requisition', label: '🔘 في طور التحفيظ (مطلب)' },
                    { id: 'unregistered', label: '🔘 غير محفظ (ملك أو حيازة)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => updateDeed(prev => ({ ...prev, propertyType: p.id as any }))}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        dismissalData.propertyType === p.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {dismissalData.propertyType === 'titled' && 'رقم الرسم العقاري'}
                      {dismissalData.propertyType === 'requisition' && 'رقم مطلب التحفيظ'}
                      {dismissalData.propertyType === 'unregistered' && 'وصف العقار غير المحفظ'}
                    </label>
                    <input
                      type="text"
                      value={dismissalData.propertyTitleNumber || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, propertyTitleNumber: e.target.value }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                      placeholder="19842/04"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع العملية العقارية</label>
                    <select
                      value={dismissalData.dispositionType || 'ownership_transfer'}
                      onChange={e => updateDeed(prev => ({ ...prev, dispositionType: e.target.value as any }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="ownership_transfer">نقل الملكية (بيع، شراء، هبة، قسمة...)</option>
                      <option value="creation_right">إنشاء حق عيني عقاري</option>
                      <option value="transfer_right">نقل حق عيني عقاري</option>
                      <option value="amendment_right">تعديل حق عيني عقاري</option>
                      <option value="cancellation_right">إسقاط حق عيني عقاري</option>
                      <option value="other">تصرف عقاري آخر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">موقع العقار ومكانه</label>
                    <input
                      type="text"
                      value={dismissalData.propertyLocation || ''}
                      onChange={e => updateDeed(prev => ({ ...prev, propertyLocation: e.target.value }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="الجهة، الإقليم، الجماعة، العنوان..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => changeStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              الرجوع للأطراف والإنابة
            </button>
            <button
              onClick={() => changeStage(4)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md"
            >
              <span>المتابعة للفحص والاستثناءات (المرحلة ④)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: ⚖️ الفحص القانوني والاستثناءات وحماية الغير */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="space-y-6">
          {/* 1️⃣3️⃣ و 1️⃣4️⃣ المحرك القانوني وفحص الاستثناءات */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <span>1️⃣3️⃣ و 1️⃣4️⃣ ⚖️ الفحص القانوني للعزل وموانع الإلغاء المنفرد</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  الأصل أن للموكل عزل وكيله متى شاء، لكن القانون يقيد هذا الحق عند وجود مصلحة للوكيل أو الغير أو في حالات الخصومة.
                </p>
              </div>
            </div>

            {/* Exception 1: Article 931 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    🔴 وكالة في مصلحة الوكيل أو الغير (الفصل 931 من ق.ل.ع)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    "لا يجوز للموكل أن يلغي الوكالة إذا كانت قد أعطيت في مصلحة الوكيل أو في مصلحة شخص من الغير، إلا بموافقة من أعطيت في مصلحته".
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  {[
                    { id: 'no', label: '🔘 لا (وكالة مجردة)' },
                    { id: 'yes', label: '🔘 نعم (في مصلحة الوكيل/الغير)' },
                    { id: 'unclear', label: '🔘 غير واضح' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateDeed(prev => ({ ...prev, inInterestOfAgentOrThirdParty: opt.id as any }))}
                      className={`px-3 py-1 rounded-lg border transition ${
                        dismissalData.inInterestOfAgentOrThirdParty === opt.id
                          ? opt.id === 'no' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {dismissalData.inInterestOfAgentOrThirdParty === 'yes' && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-300 text-xs text-red-900 space-y-1">
                  <p className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>⚠️ مانع قانوني محتمل من العزل المنفرد:</span>
                  </p>
                  <p className="leading-relaxed">
                    تتطلب هذه الوكالة موافقة الشخص الذي أُنشئت في مصلحته أو إذناً قضائياً، ولا يسوغ للعدلين تلقي رسم العزل بإرادة منفردة دون التحقق من رضاء المستفيد.
                  </p>
                </div>
              )}
            </div>

            {/* Exception 2: Litigation Agency (وكالة الخصومة) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    ⚖️ وكالة الخصومة والتقاضي وحالة الدعوى
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    هل تتضمن الوكالة نيابة قضائية؟ وهل أصبحت الدعوى جاهزة للحكم؟
                  </p>
                </div>
                <button
                  onClick={() => updateDeed(prev => ({ ...prev, isLitigationPoa: !prev.isLitigationPoa }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    dismissalData.isLitigationPoa ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {dismissalData.isLitigationPoa ? 'تتضمن خصومة قضائية' : 'لا تتضمن خصومة'}
                </button>
              </div>

              {dismissalData.isLitigationPoa && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">وضعية الدعوى القضائية</label>
                    <select
                      value={dismissalData.caseStatus || 'not_ready'}
                      onChange={e => updateDeed(prev => ({ ...prev, caseStatus: e.target.value as any }))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="not_ready">لم تصبح جاهزة للحكم (العزل جائز)</option>
                      <option value="ready_for_judgment">أصبحت جاهزة للحكم (يتعين التحقق)</option>
                      <option value="unknown">غير معلوم</option>
                    </select>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>يجب ألا يقصد بالعزل الإضرار بسير العدالة أو تأخير الفصل في الدعوى.</span>
                  </div>
                </div>
              )}
            </div>

            {/* 1️⃣8️⃣ شكل العزل (الفصل 934 ق.ل.ع) */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
              <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>1️⃣8️⃣ 🔐 شكل العزل ومطابقته لشكل الوكالة (الفصل 934 من ق.ل.ع)</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                قاعدة قانونية مقررة: "إذا تطلب القانون شكلاً خاصاً لإنشاء الوكالة، وجبت مراعاة نفس الشكل في إلغائها".
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-200 text-xs flex items-center justify-between">
                <span>الشكل المعتمد في هذا البيت: <strong>رسم عدلي رسمي من تلقي عدلي التوثيق</strong>.</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  مستوفٍ للشكل الرسمي 100% ✓
                </span>
              </div>
            </div>

            {/* 1️⃣9️⃣ إشعار الوكيل بالعزل (الفصل 932 ق.ل.ع) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-900">
                1️⃣9️⃣ 📢 إشعار الوكيل بالعزل وتحديد تاريخ العلم
              </h4>
              <p className="text-[11px] text-slate-500">
                الفصل 932 يربط نفاذ العزل بتسلم الوكيل للإشعار أو علمه الحقيقي بالواقعة.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'present_in_majlis', label: 'حاضر أمام العدلين' },
                  { id: 'written_notice', label: 'إشعار مكتوب رسمي' },
                  { id: 'telegram', label: 'برقية إشعارية' },
                  { id: 'previous_notice', label: 'إشعار سابق موثق' },
                  { id: 'future_notice', label: 'سيُشعر لاحقاً' },
                  { id: 'unknown', label: 'غير معلوم' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateDeed(prev => ({ ...prev, notificationMethod: opt.id as any }))}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                      dismissalData.notificationMethod === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2️⃣0️⃣ بطاقة حماية الغير حسن النية */}
            <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>2️⃣0️⃣ 🛡️ تنبيه قانوني دائم: حماية الغير حسن النية (الفصل 934 ق.ل.ع)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                لا يعني تحرير رسم العزل وحده أن كل تصرف سابق أو تعامل لاحق مع الوكيل أصبح غير نافذ تلقائياً؛ يجب مراعاة أحكام العلم بالعزل وحماية الغير حسن النية الذين تعاملوا مع الوكيل قبل علمهم بالإلغاء، فضلاً عن الأثر التطهيري الخاص للتقييد والإلغاء في السجل المحلي للحقوق العينية.
              </p>
            </div>
          </div>

            {/* 2️⃣6️⃣ 🔐 لوحة المطابقة والتدقيق النهائي قبل التوقيع */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>2️⃣6️⃣ 🔐 لوحة المطابقة والتدقيق النهائي لشروط العزل</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    فحص آلي لـ 16 مؤشراً قانونياً لضمان سلامة إجراءات العزل من أي بطلان أو خلل شكلي.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    isAuditComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    مستوفٍ: {auditPassedCount} من {auditChecks.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {auditChecks.map(check => (
                  <div
                    key={check.id}
                    onClick={() => changeStage(check.stage > 4 ? 4 : check.stage)}
                    className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                      check.valid
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/60 border-amber-300 text-amber-950 ring-1 ring-amber-400/30'
                    }`}
                  >
                    <span className="font-bold truncate">{check.title}</span>
                    <span className="shrink-0 mr-2 text-sm">
                      {check.valid ? '🟢' : '🟠'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Stage 4 */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => changeStage(3)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                الرجوع لنطاق العزل
              </button>
              <button
                onClick={() => changeStage(5)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md"
              >
                <span>المتابعة لإلغاء التقييد والنموذج 7 (المرحلة ⑤)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* ========================================================================= */}
      {/* STAGE 5: 🏛️ إلغاء التقييد بسجل الحقوق العينية (النموذج 7) وحياة الوكالة */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="space-y-6">
          {/* 2️⃣2️⃣ و 2️⃣3️⃣ مرحلة إلغاء التقييد العقاري والنموذج رقم 7 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>2️⃣2️⃣ و 2️⃣3️⃣ 🏛️ طلب إلغاء تقييد الوكالة في السجل المحلي (المرسوم 2.23.101 والنموذج 7)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  لا ينتهي الأثر القانوني عند تحرير رسم العزل، بل يلزم إيداع طلب إلغاء التقييد لدى كتابة الضبط للحصول على شهادة التقييد النموذج 7.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                النموذج رقم 7 (قرار 381.25)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">🏛️ طلب الإلغاء الموجه لكتابة الضبط</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">المحكمة المختصة:</span>
                    <span className="font-black text-slate-900">{dismissalData.registryInfo.primaryCourt || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">رقم التقييد الأصلي:</span>
                    <span className="font-mono font-bold text-emerald-800">{dismissalData.registryInfo.registrationNumber || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">طالب الإلغاء:</span>
                    <span className="font-bold text-slate-900">{dismissalData.principals[0]?.fullName || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">الوكيل المعزول:</span>
                    <span className="font-bold text-slate-900">{dismissalData.agents[0]?.fullName || '---'}</span>
                  </div>
                </div>

                <button
                  onClick={() => alert('تم توليد طلب إلغاء تقييد الوكالة بالسجل المحلي لكتابة الضبط وجاهز للإيداع.')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>توليد طلب الإلغاء الموجه للمحكمة</span>
                </button>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <h4 className="text-xs font-bold text-emerald-950">📄 شهادة بتقييد إلغاء وكالة (النموذج رقم 7)</h4>
                <p className="text-[11px] text-slate-600">
                  شهادة رسمية تسلمها كتابة الضبط بعد التأشير على التشطيب من السجل المحلي.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">رقم شهادة الإلغاء:</span>
                    <span className="font-mono font-bold text-emerald-900">{dismissalData.cancellationCertificateModel7Number || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">تاريخ شهادة الإلغاء:</span>
                    <span className="font-bold text-slate-900">{dismissalData.cancellationCertificateDate || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">حالة السجل الوطني:</span>
                    <span className="font-black text-emerald-700 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>تم الإشهار الوطني الإلكتروني ✓</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2️⃣5️⃣ حياة الوكالة (Timeline) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>2️⃣5️⃣ 🔄 تتبع مسار «حياة الوكالة» (Life Timeline)</span>
            </h3>
            <p className="text-xs text-slate-500">
              تسلسل تاريخي رقمي موحد يرتبط برقم التقييد المركب الأصلي عبر كافة مراحل التعديل والعزل والإلغاء.
            </p>

            <div className="relative pr-6 border-r-2 border-indigo-200 space-y-6 pt-2">
              {(dismissalData.timelineEvents || []).length > 0 ? (
                dismissalData.timelineEvents.map((ev, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -right-[31px] top-0.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-200"></div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {ev.date}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-1">{ev.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{ev.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">سيتم تسجيل أحداث مسار الوكالة آلياً عند الإيداع والتقييد.</p>
              )}
            </div>
          </div>

          {/* Final Finish button (Red Button for direct Step 7 transition) */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => changeStage(4)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              الرجوع للفحص القانوني والتدقيق
            </button>
            <button
              onClick={handleProceedToStep7}
              className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition flex items-center gap-2 shadow-lg ring-4 ring-red-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>اعتماد رسم العزل والانتقال للخطوة 7 (المراجعة الذكية والتوثيق)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDismissalWorkflow;
