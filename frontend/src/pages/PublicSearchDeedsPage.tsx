import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnToLandingButton } from '../components/common/ReturnToLandingButton';
import { PublicOfficialHeader } from '../components/common/PublicOfficialHeader';
import { GoogleMapSelector } from '../components/GoogleMapSelector';
import { COURT_MAPPINGS } from '../../../shared/courts';
import { trpc } from '../trpc';

const steps = [
  { id: 'identity', label: 'الهوية', icon: '🪪' },
  { id: 'capacity', label: 'الصفة القانونية', icon: '⚖️' },
  { id: 'evidence', label: 'المبررات والإثباتات', icon: '📎' },
  { id: 'deed', label: 'معلومات الرسم والأطراف', icon: '📜' },
  { id: 'scope', label: 'نطاق البحث والمحكمة', icon: '📅' },
  { id: 'review', label: 'المراجعة وبوابة الأمان', icon: '🔎' },
  { id: 'result', label: 'النتيجة والتوجيه', icon: '🏛️' },
];

const capacitiesList = [
  { id: 'party', title: 'أحد الأطراف', desc: 'أنا أحد الأشخاص الواردة أسماؤهم في الرسم أو العقد.', icon: '👤' },
  { id: 'heir', title: 'وارث / ذو حق', desc: 'أطلب البحث بصفتي وارثًا شرعيًا أو من أصحاب الحقوق.', icon: '👨‍👩‍👧' },
  { id: 'agent', title: 'وكيل رسمي', desc: 'أبحث نيابة عن أحد أصحاب العلاقة بموجب وكالة رسمية.', icon: '📑' },
  { id: 'guardian', title: 'ولي / وصي', desc: 'أبحث بصفتي وليًا أو وصيًا شرعيًا أو قانونيًا.', icon: '👨‍👦' },
  { id: 'witness', title: 'شاهد', desc: 'أنا أحد الشهود الواردين والمثبتين في صلب الرسم.', icon: '👁️' },
  { id: 'third_party', title: 'الغير (مصلحة قانونية)', desc: 'لي مصلحة أو مبرر قانوني مشروع للبحث، رغم أنني لست طرفًا مباشرًا.', icon: '👥' },
  { id: 'authority', title: 'جهة إدارية / قضائية', desc: 'أبحث لغاية مرتبطة بإجراء إداري أو ملف قضائي جارٍ.', icon: '🏢' },
];

const interestProofs = [
  'مقال دعوى قضائية',
  'شكاية مسجلة',
  'حكم أو قرار قضائي',
  'أمر قضائي صادر',
  'إجراء إداري رسمي',
  'حق عيني أو مالي يحتاج إلى إثبات',
  'وثيقة أو مبرر آخر',
];

const deedTypeCards = [
  { id: 'marriage', label: 'رسوم الزواج', icon: '💍', sub: 'عقود الزواج، ثبوت الزوجية، استمرار الزواج' },
  { id: 'divorce', label: 'رسوم الطلاق', icon: '💔', sub: 'الإشهاد على الطلاق الاتفاقي أو الرجعة' },
  { id: 'property', label: 'رسوم الأملاك والعقارات', icon: '🏠', sub: 'ملكية، حيازة، شراء، هبة، صدقة، رهن، مقاسمة' },
  { id: 'estate', label: 'رسوم التركات والإراثة', icon: '👨‍👩‍👧', sub: 'رسم إراثة، بيان فريضة، إحصاء متروك' },
  { id: 'financial', label: 'تصرفات ومعاملات مالية', icon: '💰', sub: 'إقرار بدين، إبراء، كراء، تفويت' },
  { id: 'other', label: 'مختلفة / باقي الوثائق', icon: '📑', sub: 'توكيلات، إقرارات، شهادات واستفسارات أخرى' },
  { id: 'unknown', label: 'لا أعرف نوع الرسم بالضبط', icon: '❓', sub: 'سنساعدكم في تحديده من خلال المعطيات المتوفرة' },
];

const periodPresets = [
  { label: 'قبل 1950', start: 1900, end: 1950 },
  { label: '1950 – 1970', start: 1950, end: 1970 },
  { label: '1971 – 1990', start: 1971, end: 1990 },
  { label: '1991 – 2000', start: 1991, end: 2000 },
  { label: '2001 – 2010', start: 2001, end: 2010 },
  { label: '2011 – 2020', start: 2011, end: 2020 },
  { label: '2021 – 2026', start: 2021, end: 2026 },
];

// Unique sorted list of primary courts from shared source of truth
const primaryCourtsList = Array.from(
  new Set(COURT_MAPPINGS.flatMap(({ primaryCourts }) => primaryCourts))
).sort((a, b) => a.localeCompare(b, 'ar'));

export function PublicSearchDeedsPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Selected notary from list or map if none was known at start
  const [selectedNotary, setSelectedNotary] = useState<any>(null);

  // Reference number generated for this search request
  const [requestId, setRequestId] = useState(() => `RECH-2026-${String(Math.floor(100000 + Math.random() * 900000))}`);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Requester Identity
    firstName: '',
    lastName: '',
    idType: 'بطاقة التعريف الوطنية',
    idNumber: '',
    phone: '',
    email: '',

    // Step 2: Legal Capacity
    capacity: 'party',

    // Step 3: Proofs & Evidence
    agentDocFile: '',
    agentBookType: 'المختلفة / باقي الوثائق',
    agentBookNumber: '',
    agentBookLetter: '',
    agentBookPage: '',
    agentBookCount: '',
    agentBookDate: '',
    agentBookCourt: '',

    heirDocFile: '',
    heirBookNumber: '',
    heirBookLetter: '',
    heirBookPage: '',
    heirBookCount: '',
    heirBookDate: '',
    heirBookCourt: '',

    interestType: 'مقال دعوى قضائية',
    caseNumber: '',
    fileReference: '',
    submissionDate: '',
    caseCourt: '',
    complaintRef: '',
    complaintDate: '',
    complaintAuthority: '',
    rulingType: '',
    rulingNumber: '',
    rulingDate: '',
    rulingCourt: '',
    proofDocFile: '',

    // Step 4: Deed Information & Parties
    deedType: 'رسوم الزواج',
    parties: [{ role: 'الطرف الأول', firstName: '', lastName: '' }],
    knowsNotary: 'no' as 'yes' | 'no',
    firstNotaryName: '',
    secondNotaryName: '',

    // Step 5: Court & Years Scope
    court: '',
    courtSearchTerm: '',
    yearKnowledge: 'exact' as 'exact' | 'period' | 'unknown',
    startYear: 2010,
    endYear: 2020,
    exactYear: 2015,
    selectedPeriodLabel: '',
    
    // Additional Details
    propertyLocation: '',
    parentNames: '',
    spouseName: '',
    oldDeedPhoto: '',
    additionalNotes: '',

    // Smart Narrowing Engine States
    smartNarrowing: {
      // Marriage
      marriageYearAccuracy: 'exact',
      marriageYear1: 2015,
      marriageYear2: 2018,
      marriageEvent: '',
      marriageEventDetail: '',
      hasCivilStatusDoc2004: '',
      civilStatusDocFile: '',
      civilStatusDocNumber: '',
      civilStatusDocYear: '',
      civilStatusCommune: '',
      firstChildBirthPeriod: '',
      firstChildBirthYear: '',
      
      // Divorce
      divorceAuthorityType: '' as '' | 'court_ruling' | 'adoul_witnessing',
      divorceCourtName: '',
      divorceRulingYear: '',
      divorceCaseNumber: '',
      divorceRulingNumber: '',
      divorcePartiesNames: '',
      divorceAdoulYear: '',
      divorceAdoulName: '',
      divorceAdoulCourt: '',
      divorceAdoulRef: '',

      // Property
      propertyPeriod: '',
      propertyTransactionType: 'بيع وشراء',
      propertyHistoryEvent: '',
      propertyHistoryEventDetail: '',
      propertyNeighborhood: '',
      propertyMunicipality: '',
      hasPriorDeedDoc: '',
      priorDeedDocFile: '',
      priorDeedDocRef: '',
    },
  });

  // Dynamic Timeline of Added Notes & Events
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string;
    timestamp: string;
    text: string;
    category?: string;
  }>>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleDateString('ar-MA') + ' — ' + new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' }),
      text: 'بدء تسجيل طلب البحث وتحديد نوع الرسم والنطاق المبدئي.',
      category: 'نظام'
    }
  ]);

  // Modal / Flyout for "💡 تذكرت معلومة أخرى"
  const [rememberModalOpen, setRememberModalOpen] = useState(false);
  const [newRememberedNote, setNewRememberedNote] = useState('');
  const [rememberCategory, setRememberCategory] = useState('حدث / تاريخ');
  const [rememberSuccessMsg, setRememberSuccessMsg] = useState(false);

  // Smart Stop flag
  const [isSmartStopReached, setIsSmartStopReached] = useState(false);

  // Multiple proofs state for Agent (وكيل)
  const [agentProofs, setAgentProofs] = useState<Array<{
    id: string;
    docFile: string;
    bookType: string;
    bookNumber: string;
    bookLetter: string;
    bookPage: string;
    bookCount: string;
    bookDate: string;
    bookCourt: string;
  }>>([
    {
      id: '1',
      docFile: '',
      bookType: 'المختلفة / باقي الوثائق',
      bookNumber: '',
      bookLetter: '',
      bookPage: '',
      bookCount: '',
      bookDate: '',
      bookCourt: '',
    },
  ]);

  const addAgentProof = () => {
    setAgentProofs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        docFile: '',
        bookType: 'المختلفة / باقي الوثائق',
        bookNumber: '',
        bookLetter: '',
        bookPage: '',
        bookCount: '',
        bookDate: '',
        bookCourt: '',
      },
    ]);
  };
  const updateAgentProof = (index: number, field: string, value: string) => {
    setAgentProofs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const removeAgentProof = (index: number) => {
    if (agentProofs.length <= 1) return;
    setAgentProofs((prev) => prev.filter((_, i) => i !== index));
  };

  // Multiple proofs state for Heir (وارث / ذو حق)
  const [heirProofs, setHeirProofs] = useState<Array<{
    id: string;
    docFile: string;
    bookNumber: string;
    bookLetter: string;
    bookPage: string;
    bookCount: string;
    bookDate: string;
    bookCourt: string;
  }>>([
    {
      id: '1',
      docFile: '',
      bookNumber: '',
      bookLetter: '',
      bookPage: '',
      bookCount: '',
      bookDate: '',
      bookCourt: '',
    },
  ]);

  const addHeirProof = () => {
    setHeirProofs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        docFile: '',
        bookNumber: '',
        bookLetter: '',
        bookPage: '',
        bookCount: '',
        bookDate: '',
        bookCourt: '',
      },
    ]);
  };
  const updateHeirProof = (index: number, field: string, value: string) => {
    setHeirProofs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const removeHeirProof = (index: number) => {
    if (heirProofs.length <= 1) return;
    setHeirProofs((prev) => prev.filter((_, i) => i !== index));
  };

  // Multiple proofs state for Third Party / Authority (الغير / جهة إدارية أو قضائية)
  const [thirdPartyProofs, setThirdPartyProofs] = useState<Array<{
    id: string;
    interestType: string;
    caseNumber: string;
    fileReference: string;
    submissionDate: string;
    caseCourt: string;
    proofDocFile: string;
  }>>([
    {
      id: '1',
      interestType: 'مقال دعوى قضائية',
      caseNumber: '',
      fileReference: '',
      submissionDate: '',
      caseCourt: '',
      proofDocFile: '',
    },
  ]);

  const addThirdPartyProof = () => {
    setThirdPartyProofs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        interestType: 'مقال دعوى قضائية',
        caseNumber: '',
        fileReference: '',
        submissionDate: '',
        caseCourt: '',
        proofDocFile: '',
      },
    ]);
  };
  const updateThirdPartyProof = (index: number, field: string, value: string) => {
    setThirdPartyProofs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const removeThirdPartyProof = (index: number) => {
    if (thirdPartyProofs.length <= 1) return;
    setThirdPartyProofs((prev) => prev.filter((_, i) => i !== index));
  };

  // Multiple proofs state for Direct Party / Guardian / Witness (أحد الأطراف / ولي / شاهد)
  const [partyProofs, setPartyProofs] = useState<Array<{
    id: string;
    docType: string;
    docFile: string;
    refNumber: string;
    notes: string;
  }>>([
    {
      id: '1',
      docType: 'بطاقة التعريف الوطنية',
      docFile: '',
      refNumber: '',
      notes: '',
    },
  ]);

  const addPartyProof = () => {
    setPartyProofs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        docType: 'بطاقة التعريف الوطنية',
        docFile: '',
        refNumber: '',
        notes: '',
      },
    ]);
  };
  const updatePartyProof = (index: number, field: string, value: string) => {
    setPartyProofs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const removePartyProof = (index: number) => {
    if (partyProofs.length <= 1) return;
    setPartyProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const update = (key: keyof typeof form, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const addParty = () => {
    setForm((prev) => ({
      ...prev,
      parties: [...prev.parties, { role: 'طرف إضافي', firstName: '', lastName: '' }],
    }));
  };

  const updateParty = (index: number, field: 'role' | 'firstName' | 'lastName', val: string) => {
    setForm((prev) => {
      const updated = [...prev.parties];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, parties: updated };
    });
  };

  const removeParty = (index: number) => {
    if (form.parties.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  };

  const filteredCourts = useMemo(() => {
    if (!form.courtSearchTerm.trim()) return primaryCourtsList;
    return primaryCourtsList.filter((c) => c.includes(form.courtSearchTerm.trim()));
  }, [form.courtSearchTerm]);

  const searchSpanYears = useMemo(() => {
    if (form.yearKnowledge === 'exact') return 1;
    if (form.yearKnowledge === 'unknown') return 80;
    const span = Math.max(1, form.endYear - form.startYear + 1);
    return span;
  }, [form.yearKnowledge, form.startYear, form.endYear]);

  const searchSpeedLevel = useMemo(() => {
    if (searchSpanYears <= 4) {
      return {
        level: 'narrow',
        color: 'emerald',
        badge: '🟢 نطاق ضيق ودقيق',
        msg: 'ممتاز! هذا النطاق المحدد يساعد على الوصول إلى النتيجة بسرعة ودقة فائقة.',
      };
    }
    if (searchSpanYears <= 20) {
      return {
        level: 'medium',
        color: 'amber',
        badge: '🟠 نطاق متوسط',
        msg: 'نطاق جيد، ويمكن تضييقه أكثر إذا تذكرتم تفاصيل إضافية لتسريع البحث.',
      };
    }
    return {
      level: 'broad',
      color: 'rose',
      badge: '🔴 نطاق واسع جداً',
      msg: 'قد يستغرق البحث وقتاً أطول. إذا تذكرتم فترة تقريبية سيساعد ذلك كثيراً في حصر النتائج.',
    };
  }, [searchSpanYears]);

  // Fetch notaries in the selected court
  const { data: courtNotaries = [], isFetching: isFetchingNotaries } = trpc.notaries.list.useQuery(
    { court: form.court, name: '' },
    { enabled: Boolean(form.court) }
  );

  // Search specific notary typed (works nationally or scoped to court)
  const { data: specificNotaryMatches = [], isFetching: isSearchingFirstNotary } = trpc.notaries.list.useQuery(
    { court: form.court || undefined, name: form.firstNotaryName },
    { enabled: Boolean(form.firstNotaryName.trim().length >= 2) }
  );

  const { data: specificSecondNotaryMatches = [], isFetching: isSearchingSecondNotary } = trpc.notaries.list.useQuery(
    { court: form.court || undefined, name: form.secondNotaryName },
    { enabled: Boolean(form.secondNotaryName.trim().length >= 2) }
  );

  // Determine if a specific notary has been identified or chosen
  const activeNotary = useMemo(() => {
    if (form.knowsNotary === 'no') return selectedNotary;
    if (selectedNotary) return selectedNotary;
    if (form.knowsNotary === 'yes' && form.firstNotaryName.trim()) {
      const match = specificNotaryMatches.find((n) => n.full_name.includes(form.firstNotaryName.trim())) 
        || courtNotaries.find((n) => n.full_name.includes(form.firstNotaryName.trim()));
      if (match) return match;
      return {
        full_name: form.firstNotaryName.trim(),
        phone: '',
        office_address: form.court ? `دائرة ${form.court}` : '',
        primary_court: form.court || '',
      };
    }
    return null;
  }, [selectedNotary, form.knowsNotary, form.firstNotaryName, specificNotaryMatches, courtNotaries, form.court]);


  // Helper to add a remembered note dynamically
  const handleAddRememberedInfo = (noteText?: string, categoryText?: string) => {
    const textToAdd = noteText || newRememberedNote;
    const cat = categoryText || rememberCategory;
    if (!textToAdd.trim()) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-MA') + ' ' + now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
    const newEntry = {
      id: String(Date.now()),
      timestamp: dateStr,
      text: `أضاف الطالب معلومة جديدة تساعد في البحث: "${textToAdd.trim()}"`,
      category: cat
    };

    setTimelineEvents((prev) => [newEntry, ...prev]);
    setNewRememberedNote('');
    setRememberSuccessMsg(true);
    setTimeout(() => {
      setRememberSuccessMsg(false);
      setRememberModalOpen(false);
    }, 1400);
  };

  const canContinue = () => {
    if (step === 0) {
      return Boolean(form.firstName.trim() && form.lastName.trim() && form.idNumber.trim() && form.phone.trim());
    }
    if (step === 1) {
      return Boolean(form.capacity);
    }
    if (step === 2) {
      if (form.capacity === 'agent') {
        return agentProofs.length >= 1;
      }
      if (form.capacity === 'heir') {
        return heirProofs.length >= 1;
      }
      if (form.capacity === 'third_party' || form.capacity === 'authority') {
        return thirdPartyProofs.length >= 1;
      }
      return partyProofs.length >= 1;
    }
    if (step === 3) {
      return Boolean(form.deedType && form.parties[0]?.firstName.trim());
    }
    if (step === 4) {
      return Boolean(form.court);
    }
    if (step === 5) {
      return acceptedTerms;
    }
    return true;
  };

  const createRequestMutation = trpc.extractionRequests.createPublic.useMutation();

  const handleStartSearch = () => {
    setIsSearching(true);
    setStep(6);

    let activeProofs: Array<{ id: string; title: string; details: string; docFile?: string }> = [];
    let activeAttachments: string[] = [];

    if (form.capacity === 'agent') {
      activeProofs = agentProofs.map((p, i) => ({
        id: p.id,
        title: `وكالة رسمية (${i + 1})`,
        details: `دفتر: ${p.bookType || '-'} / رقم: ${p.bookNumber || '-'} / حرف: ${p.bookLetter || '-'} / ص: ${p.bookPage || '-'} / عدد: ${p.bookCount || '-'} / تاريخ: ${p.bookDate || '-'}`,
        docFile: p.docFile,
      }));
      activeAttachments = agentProofs.map((p) => p.docFile).filter(Boolean);
    } else if (form.capacity === 'heir') {
      activeProofs = heirProofs.map((p, i) => ({
        id: p.id,
        title: `رسم إراثة (${i + 1})`,
        details: `دفتر: ${p.bookNumber || '-'} / حرف: ${p.bookLetter || '-'} / ص: ${p.bookPage || '-'} / عدد: ${p.bookCount || '-'} / تاريخ: ${p.bookDate || '-'} / محكمة: ${p.bookCourt || '-'}`,
        docFile: p.docFile,
      }));
      activeAttachments = heirProofs.map((p) => p.docFile).filter(Boolean);
    } else if (form.capacity === 'third_party' || form.capacity === 'authority') {
      activeProofs = thirdPartyProofs.map((p, i) => ({
        id: p.id,
        title: `سند مصلحة: ${p.interestType} (${i + 1})`,
        details: `مرجع: ${p.caseNumber || '-'} / جهة: ${p.caseCourt || '-'}`,
        docFile: p.proofDocFile,
      }));
      activeAttachments = thirdPartyProofs.map((p) => p.proofDocFile).filter(Boolean);
    } else {
      activeProofs = partyProofs.map((p, i) => ({
        id: p.id,
        title: `${p.docType || 'وثيقة إثبات'} (${i + 1})`,
        details: p.refNumber || 'صفة مباشرة',
        docFile: p.docFile,
      }));
      activeAttachments = partyProofs.map((p) => p.docFile).filter(Boolean);
    }

    const assignedNotaryIds = activeNotary?.id ? [activeNotary.id] : [];

    createRequestMutation.mutate({
      requestNumber: requestId,
      assignedNotaryIds,
      data: {
        ...form,
        identityNumber: form.idNumber,
        year: String(form.yearKnowledge === 'exact' ? form.exactYear : form.startYear),
        proofs: activeProofs,
        attachments: activeAttachments,
        source: 'search_deeds',
        parties: form.parties,
        status: '🔍 طلب بحث وتحديد رسم — وارد من المنصة العامة',
        timeline: [
          {
            id: `t-${Date.now()}`,
            timestamp: new Date().toLocaleDateString('ar-MA'),
            action: 'إيداع طلب البحث في الرسوم',
            actor: `${form.firstName} ${form.lastName}`.trim() || 'المواطن',
            notes: `نوع الرسم: ${form.deedType} - المحكمة: ${form.court || 'غير محددة'}`,
          },
        ],
      },
    });

    setTimeout(() => {
      setIsSearching(false);
    }, 1500);
  };

  const handleSendToCopyExtraction = (overrideNotary?: any) => {
    const not = overrideNotary || activeNotary;
    const prefillData = {
      year: form.yearKnowledge === 'exact'
        ? String(form.exactYear)
        : form.smartNarrowing?.marriageYear1
        ? String(form.smartNarrowing.marriageYear1)
        : String(form.startYear),
      court: form.court,
      firstNotary: not?.full_name || form.firstNotaryName || '',
      secondNotary: form.secondNotaryName || '',
      capacity: capacitiesList.find((c) => c.id === form.capacity)?.title || form.capacity || 'أحد أطراف الرسم',
      firstName: form.firstName,
      lastName: form.lastName,
      identityType: form.idType || 'البطاقة الوطنية',
      identityNumber: form.idNumber,
      phone: form.phone,
      email: form.email,
      address: form.address,
      deedCategory: form.deedCategory,
      deedType: form.deedType,
      smartNarrowing: form.smartNarrowing,
      timelineEvents: timelineEvents,
      parentNames: form.parentNames,
      spouseName: form.spouseName,
      propertyLocation: form.propertyLocation,
      oldDeedPhoto: form.oldDeedPhoto,
      parties: form.parties,
      exactYear: form.exactYear,
      startYear: form.startYear,
      endYear: form.endYear,
      requestId: requestId,
    };
    try {
      sessionStorage.setItem('adoul_copy_extraction_prefill', JSON.stringify(prefillData));
      sessionStorage.setItem('adoul_search_smart_narrowing', JSON.stringify(form.smartNarrowing));
      sessionStorage.setItem('adoul_search_timeline', JSON.stringify(timelineEvents));
    } catch (e) {
      console.warn('Could not set sessionStorage:', e);
    }
    navigate('/public/copy-extraction');
  };

  const handleResetNewSearch = () => {
    setStep(0);
    setSelectedNotary(null);
    setAcceptedTerms(false);
    setIsSearching(false);
    setRequestId(`RECH-2026-${String(Math.floor(100000 + Math.random() * 900000))}`);
    setForm({
      firstName: '',
      lastName: '',
      idType: 'بطاقة التعريف الوطنية',
      idNumber: '',
      phone: '',
      email: '',
      capacity: 'party',
      agentDocFile: '',
      agentBookType: 'المختلفة / باقي الوثائق',
      agentBookNumber: '',
      agentBookLetter: '',
      agentBookPage: '',
      agentBookCount: '',
      agentBookDate: '',
      agentBookCourt: '',
      heirDocFile: '',
      heirBookNumber: '',
      heirBookLetter: '',
      heirBookPage: '',
      heirBookCount: '',
      heirBookDate: '',
      heirBookCourt: '',
      interestType: 'مقال دعوى قضائية',
      caseNumber: '',
      fileReference: '',
      submissionDate: '',
      caseCourt: '',
      complaintRef: '',
      complaintDate: '',
      complaintAuthority: '',
      rulingType: '',
      rulingNumber: '',
      rulingDate: '',
      rulingCourt: '',
      proofDocFile: '',
      deedType: 'رسوم الزواج',
      parties: [{ role: 'الطرف الأول', firstName: '', lastName: '' }],
      knowsNotary: 'no' as 'yes' | 'no',
      firstNotaryName: '',
      secondNotaryName: '',
      court: '',
      courtSearchTerm: '',
      yearKnowledge: 'exact' as 'exact' | 'period' | 'unknown',
      startYear: 2010,
      endYear: 2020,
      exactYear: 2015,
      selectedPeriodLabel: '',
      propertyLocation: '',
      parentNames: '',
      spouseName: '',
      oldDeedPhoto: '',
      additionalNotes: '',
    });
    setAgentProofs([
      {
        id: '1',
        docFile: '',
        bookType: 'المختلفة / باقي الوثائق',
        bookNumber: '',
        bookLetter: '',
        bookPage: '',
        bookCount: '',
        bookDate: '',
        bookCourt: '',
      },
    ]);
    setHeirProofs([
      {
        id: '1',
        docFile: '',
        bookNumber: '',
        bookLetter: '',
        bookPage: '',
        bookCount: '',
        bookDate: '',
        bookCourt: '',
      },
    ]);
    setThirdPartyProofs([
      {
        id: '1',
        interestType: 'مقال دعوى قضائية',
        caseNumber: '',
        fileReference: '',
        submissionDate: '',
        caseCourt: '',
        proofDocFile: '',
      },
    ]);
    setPartyProofs([
      {
        id: '1',
        docType: 'بطاقة التعريف الوطنية',
        docFile: '',
        refNumber: '',
        notes: '',
      },
    ]);
  };

  // Pre-filled WhatsApp message for notary / follow up
  const targetNotaryPhone = (activeNotary?.phone || '').replace(/^0/, '212').replace(/\D/g, '') || '';
  const whatsappSearchMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله،\n` +
    `أنا ${form.firstName} ${form.lastName}، أطلب متابعة البحث واستخراج نسخة الرسم برقم مرجع: ${requestId}.\n\n` +
    `📋 معطيات الرسم محل البحث:\n` +
    `• نوع الرسم: ${form.deedType}\n` +
    `• المحكمة: ${form.court}\n` +
    `• الأطراف المصرح بهم: ${form.parties.map((p) => `${p.role}: ${p.firstName} ${p.lastName}`).join(' / ')}\n` +
    `• الفترة: ${form.yearKnowledge === 'exact' ? form.exactYear : `${form.startYear} – ${form.endYear}`}\n\n` +
    `📞 بياناتي للتواصل:\n` +
    `• الاسم: ${form.firstName} ${form.lastName}\n` +
    `• الهاتف: ${form.phone}\n` +
    `• الصفة: ${capacitiesList.find((c) => c.id === form.capacity)?.title}\n\n` +
    `يرجى التفضل بمتابعة إرشادي لاستكمال الإجراءات. شكراً جزيلاً.`
  );

  const whatsappDirectUrl = targetNotaryPhone 
    ? `https://wa.me/${targetNotaryPhone}?text=${whatsappSearchMessage}`
    : `https://wa.me/?text=${whatsappSearchMessage}`;

  return (
    <main className="min-h-screen bg-slate-50 text-right font-sans" dir="rtl">
      {/* 🏛️ Official National Header */}
      <PublicOfficialHeader />

      {/* 🏛️ Maroon Service Banner */}
      <header className="border-b-4 border-[#E6BE8A] bg-[#7A0D1A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-7 sm:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E6BE8A]">
              <span>المملكة المغربية</span>
              <span>•</span>
              <span>منظومة التوثيق العدلي الإلكترونية</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-[800] flex items-center gap-3 font-maghribi">
              <span>🔎</span>
              <span>البحث عن عقود / شهادات عدلية</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/90 font-medium font-kufi">
              خدمة تساعدكم على تحديد الرسم أو الشهادة العدلية محل البحث، بناءً على المعلومات والوثائق المتوفرة لديكم، مع مراعاة الصفة القانونية وحماية المعطيات الشخصية.
            </p>
          </div>
          <ReturnToLandingButton className="shrink-0" />
        </div>
      </header>

      {/* 🧭 Main Body with Steps and Sidebar */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr] sm:px-8 font-kufi">
        {/* 📋 Sidebar Steps */}
        <aside className="border border-slate-200 bg-white p-4 rounded-2xl shadow-sm lg:h-fit font-kufi">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">مسار البحث الذكي</span>
            <span className="text-xs font-bold text-[#7A0D1A]">
              المرحلة {step + 1} من {steps.length}
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 mb-5 overflow-hidden">
            <div
              className="bg-[#7A0D1A] h-2 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>

          <ol className="space-y-1">
            {steps.map((s, index) => {
              const isCurrent = index === step;
              const isPassed = index < step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={index > step}
                    onClick={() => setStep(index)}
                    className={`flex w-full items-center gap-3 px-3 py-3 rounded-xl text-right text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#7A0D1A] text-white shadow-md'
                        : isPassed
                        ? 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base">{isPassed ? '✓' : s.icon}</span>
                    <span className="flex-1 truncate">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed space-y-1">
            <div className="font-black flex items-center gap-1">
              <span>⚖️</span>
              <span>تنبيه قانوني ومسطري</span>
            </div>
            <p>
              سجلات التضمين ومذكرات الحفظ تودع بالمحكمة وتعد من وثائقها. يخضع الاطلاع واستخراج النسخ لمقتضيات القانون 51.26 وموافقة القاضي المكلف بالتوثيق.
            </p>
          </div>
        </aside>

        {/* 📄 Main Form Content */}
        <section className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#7A0D1A]">المرحلة {step + 1} من {steps.length}</span>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                {requestId}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>{steps[step].icon}</span>
              <span>{steps[step].label}</span>
            </h2>
          </div>

          {/* STAGE 1: IDENTIFICATION */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-5 space-y-2 text-blue-950">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span>👋</span>
                  <span>لنبدأ بتحديد صاحب الطلب</span>
                </h3>
                <p className="text-xs leading-relaxed text-blue-900">
                  قبل البحث عن أي رسم أو شهادة عدلية، نحتاج إلى بعض المعلومات الأساسية للتأكد من صفة مقدم الطلب وحماية المعطيات التي قد يتضمنها الرسم.
                  لا تقلق إذا كانت بعض المعلومات غير متوفرة لديك؛ سنساعدك في تحديد البديل المناسب.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">الاسم الشخصي *</label>
                  <input
                    type="text"
                    placeholder="مثال: يوسف"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">الاسم العائلي *</label>
                  <input
                    type="text"
                    placeholder="مثال: الإدريسي"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">نوع وثيقة الهوية</label>
                  <select
                    value={form.idType}
                    onChange={(e) => update('idType', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  >
                    <option value="بطاقة التعريف الوطنية">بطاقة التعريف الوطنية (CIN)</option>
                    <option value="جواز السفر">جواز السفر</option>
                    <option value="بطاقة الإقامة / وثيقة تعريف أخرى">بطاقة الإقامة / وثيقة تعريف أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">رقم الوثيقة *</label>
                  <input
                    type="text"
                    placeholder="مثال: AB123456"
                    value={form.idNumber}
                    onChange={(e) => update('idNumber', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-mono focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">رقم الهاتف (للتواصل والواتساب) *</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="06XXXXXXXX"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-mono text-right focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-mono text-right focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span>🔐</span>
                  <span>خصوصيتكم تهمنا:</span>
                </div>
                <p className="leading-relaxed">
                  تُستخدم هذه المعلومات حصرياً لغرض التحقق من هوية مقدم الطلب ومعالجة مسار البحث وتوجيهه، ولا تعني وحدها السماح بالاطلاع التلقائي على مضمون أي رسم إلا بعد إثبات الصفة القانونية وفق المساطر المعتمدة.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 2: LEGAL CAPACITY */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  ما هي صفتكم بالنسبة إلى الرسم أو الشهادة محل البحث؟
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  اختر الصفة التي تخول لكم طلب البحث لاستخراج النسخة أو معرفة مراجع الرسم:
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {capacitiesList.map((cap) => {
                  const isSelected = form.capacity === cap.id;
                  return (
                    <div
                      key={cap.id}
                      onClick={() => update('capacity', cap.id)}
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-[#7A0D1A] bg-red-50/50 shadow-md ring-2 ring-[#7A0D1A]/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="text-3xl p-2 rounded-xl bg-white border border-slate-100 shadow-sm shrink-0">
                        {cap.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-sm text-slate-900 flex items-center justify-between">
                          <span>{cap.title}</span>
                          {isSelected && <span className="text-[#7A0D1A] text-xs font-black">● مختار</span>}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 3: PROOFS & EVIDENCE */}
          {step === 2 && (
            <div className="space-y-6">
              {form.capacity === 'agent' && (
                <div className="space-y-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-200/80 pb-3">
                    <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
                      <span>📑</span>
                      <span>لأنكم تقدمون الطلب نيابة عن شخص آخر، يرجى إدخال ما يثبت صفتكم التمثيلية:</span>
                    </div>
                    <button
                      type="button"
                      onClick={addAgentProof}
                      className="inline-flex items-center justify-center gap-1 text-xs font-black text-blue-950 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-xl border border-blue-300 transition shadow-sm self-start sm:self-auto"
                    >
                      <span>➕</span>
                      <span>إضافة وكالة / سند تمثيلي إضافي</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {agentProofs.map((proof, idx) => (
                      <div key={proof.id} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-blue-950">📌 الوكالة / السند التمثيلي رقم {idx + 1}</span>
                          {agentProofs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAgentProof(idx)}
                              className="text-xs text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                            >
                              🗑️ حذف
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">📎 تحميل صورة الوكالة (PDF أو صورة)</label>
                          <input
                            type="file"
                            onChange={(e) => updateAgentProof(idx, 'docFile', e.target.files?.[0]?.name || '')}
                            className="w-full text-xs text-slate-600 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                          />
                          {proof.docFile && (
                            <p className="text-xs text-emerald-700 font-bold mt-1">✓ تم اختيار الملف: {proof.docFile}</p>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-xs font-black text-slate-900 mb-3">مراجع التوكيل (إن كانت متوفرة):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">تضمين دفتر</label>
                              <input
                                type="text"
                                value={proof.bookType}
                                onChange={(e) => updateAgentProof(idx, 'bookType', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الدفتر</label>
                              <input
                                type="text"
                                placeholder="مثال: 12"
                                value={proof.bookNumber}
                                onChange={(e) => updateAgentProof(idx, 'bookNumber', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">حرف</label>
                              <input
                                type="text"
                                placeholder="مثال: أ"
                                value={proof.bookLetter}
                                onChange={(e) => updateAgentProof(idx, 'bookLetter', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">صحيفة</label>
                              <input
                                type="text"
                                placeholder="مثال: 45"
                                value={proof.bookPage}
                                onChange={(e) => updateAgentProof(idx, 'bookPage', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">عدد</label>
                              <input
                                type="text"
                                placeholder="مثال: 180"
                                value={proof.bookCount}
                                onChange={(e) => updateAgentProof(idx, 'bookCount', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">بتاريخ</label>
                              <input
                                type="date"
                                value={proof.bookDate}
                                onChange={(e) => updateAgentProof(idx, 'bookDate', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.capacity === 'heir' && (
                <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/80 pb-3">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <span>👨‍👩‍👧</span>
                      <span>لإثبات الصفة الإرثية، يرجى إدخال مراجع أو وثيقة رسم الإراثة:</span>
                    </div>
                    <button
                      type="button"
                      onClick={addHeirProof}
                      className="inline-flex items-center justify-center gap-1 text-xs font-black text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3 py-2 rounded-xl border border-emerald-300 transition shadow-sm self-start sm:self-auto"
                    >
                      <span>➕</span>
                      <span>إضافة رسم إراثة / سند إضافي</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {heirProofs.map((proof, idx) => (
                      <div key={proof.id} className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-emerald-950">📌 رسم الإراثة رقم {idx + 1}</span>
                          {heirProofs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeHeirProof(idx)}
                              className="text-xs text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                            >
                              🗑️ حذف
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">📎 تحميل رسم الإراثة (PDF أو صورة)</label>
                          <input
                            type="file"
                            onChange={(e) => updateHeirProof(idx, 'docFile', e.target.files?.[0]?.name || '')}
                            className="w-full text-xs text-slate-600 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800"
                          />
                          {proof.docFile && (
                            <p className="text-xs text-emerald-700 font-bold mt-1">✓ تم اختيار الملف: {proof.docFile}</p>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-xs font-black text-slate-900 mb-3">مراجع رسم الإراثة بسجل التركات (إن توفرت):</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الدفتر</label>
                              <input
                                type="text"
                                placeholder="مثال: 5"
                                value={proof.bookNumber}
                                onChange={(e) => updateHeirProof(idx, 'bookNumber', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">حرف</label>
                              <input
                                type="text"
                                placeholder="مثال: ب"
                                value={proof.bookLetter}
                                onChange={(e) => updateHeirProof(idx, 'bookLetter', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">صحيفة</label>
                              <input
                                type="text"
                                placeholder="مثال: 98"
                                value={proof.bookPage}
                                onChange={(e) => updateHeirProof(idx, 'bookPage', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">عدد</label>
                              <input
                                type="text"
                                placeholder="مثال: 312"
                                value={proof.bookCount}
                                onChange={(e) => updateHeirProof(idx, 'bookCount', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ التضمين</label>
                              <input
                                type="date"
                                value={proof.bookDate}
                                onChange={(e) => updateHeirProof(idx, 'bookDate', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">محكمة التوثيق</label>
                              <input
                                type="text"
                                placeholder="مثال: ابتدائية فاس"
                                value={proof.bookCourt}
                                onChange={(e) => updateHeirProof(idx, 'bookCourt', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(form.capacity === 'third_party' || form.capacity === 'authority') && (
                <div className="space-y-5 rounded-2xl border border-purple-200 bg-purple-50/60 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-200/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                        <span>🛡️</span>
                        <span>حمايةً لحقوق أصحاب الرسوم ومعطياتهم الشخصية:</span>
                      </div>
                      <p className="text-xs text-purple-900 leading-relaxed">
                        بما أنكم لا تقدمون الطلب بصفتكم طرفاً مباشراً في الرسم، نحتاج إلى معرفة المبرر القانوني أو القضائي الذي تستندون إليه.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addThirdPartyProof}
                      className="inline-flex items-center justify-center gap-1 text-xs font-black text-purple-950 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-xl border border-purple-300 transition shadow-sm self-start sm:self-auto"
                    >
                      <span>➕</span>
                      <span>إضافة مبرر / سند إضافي</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {thirdPartyProofs.map((proof, idx) => (
                      <div key={proof.id} className="bg-white p-5 rounded-xl border border-purple-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-purple-950">📌 السند / المبرر القانوني رقم {idx + 1}</span>
                          {thirdPartyProofs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeThirdPartyProof(idx)}
                              className="text-xs text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                            >
                              🗑️ حذف
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-2">ما الذي يثبت مصلحتكم في البحث؟</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {interestProofs.map((item) => (
                              <label
                                key={item}
                                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                                  proof.interestType === item
                                    ? 'border-purple-600 bg-purple-50 text-purple-950'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`interestType-${proof.id}`}
                                  checked={proof.interestType === item}
                                  onChange={() => updateThirdPartyProof(idx, 'interestType', item)}
                                />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم المقال / المرجع</label>
                            <input
                              type="text"
                              placeholder="مثال: ملف رقم 2024/1402/33"
                              value={proof.caseNumber}
                              onChange={(e) => updateThirdPartyProof(idx, 'caseNumber', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">المحكمة أو الجهة الصادر عنها</label>
                            <input
                              type="text"
                              placeholder="مثال: المحكمة الابتدائية بالرباط"
                              value={proof.caseCourt}
                              onChange={(e) => updateThirdPartyProof(idx, 'caseCourt', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">📎 تحميل الوثيقة المثبتة للمصلحة (PDF أو صورة)</label>
                          <input
                            type="file"
                            onChange={(e) => updateThirdPartyProof(idx, 'proofDocFile', e.target.files?.[0]?.name || '')}
                            className="w-full text-xs text-slate-600 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-700 file:text-white hover:file:bg-purple-800"
                          />
                          {proof.proofDocFile && (
                            <p className="text-xs text-emerald-700 font-bold mt-1">✓ تم اختيار الملف: {proof.proofDocFile}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {['party', 'witness', 'guardian'].includes(form.capacity) && (
                <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-black text-sm">
                        <span>✓</span>
                        <span>تأكيد الصفة المباشرة والمرفقات:</span>
                      </div>
                      <p className="text-xs leading-relaxed text-emerald-900">
                        بصفتكم {form.capacity === 'party' ? 'أحد أطراف الرسم' : form.capacity === 'witness' ? 'شاهداً بالرسم' : 'ولياً شرعياً'}، يرجى إرفاق الوثيقة المثبتة لهويتكم أو صفتكم:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addPartyProof}
                      className="inline-flex items-center justify-center gap-1 text-xs font-black text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3 py-2 rounded-xl border border-emerald-300 transition shadow-sm self-start sm:self-auto"
                    >
                      <span>➕</span>
                      <span>إضافة وثيقة / إثبات إضافي</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {partyProofs.map((proof, idx) => (
                      <div key={proof.id} className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-emerald-950">📌 الوثيقة / الإثبات رقم {idx + 1}</span>
                          {partyProofs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePartyProof(idx)}
                              className="text-xs text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                            >
                              🗑️ حذف
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الوثيقة المثبتة</label>
                            <input
                              type="text"
                              value={proof.docType}
                              onChange={(e) => updatePartyProof(idx, 'docType', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم المرجع / ملاحظات</label>
                            <input
                              type="text"
                              placeholder="رقم البطاقة أو المرجع..."
                              value={proof.refNumber}
                              onChange={(e) => updatePartyProof(idx, 'refNumber', e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">📎 تحميل الوثيقة (PDF أو صورة)</label>
                          <input
                            type="file"
                            onChange={(e) => updatePartyProof(idx, 'docFile', e.target.files?.[0]?.name || '')}
                            className="w-full text-xs text-slate-600 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800"
                          />
                          {proof.docFile && (
                            <p className="text-xs text-emerald-700 font-bold mt-1">✓ تم اختيار الملف: {proof.docFile}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span>🔐</span>
                  <span>مبدأ الحد الأدنى من المعلومات:</span>
                </div>
                <p>
                  نطلب فقط المعلومات الضرورية لتحديد الرسم والتحقق من الصفة وحماية المعطيات الشخصية للأطراف الآخرين.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 4: DEED INFORMATION & PARTIES */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  ماذا تعرفون عن الرسم أو الشهادة التي تبحثون عنها؟
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  اختر نوع الرسم وأدخل أسماء الأشخاص المذكورين لتسريع عملية الفرز والمطابقة:
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {deedTypeCards.map((dt) => {
                  const isSelected = form.deedType === dt.label;
                  return (
                    <div
                      key={dt.id}
                      onClick={() => update('deedType', dt.label)}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#7A0D1A] bg-red-50/50 shadow-md ring-2 ring-[#7A0D1A]/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{dt.icon}</span>
                        <span className="font-black text-xs text-slate-900">{dt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{dt.sub}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900">👤 أسماء الأشخاص الواردة في الرسم</h4>
                    <p className="text-[11px] text-slate-500">
                      💡 إضافة اسم ثانٍ أو أكثر تساعد في تضييق نطاق البحث وتسريع الوصول إلى النتيجة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addParty}
                    className="inline-flex items-center gap-1 text-xs font-black text-[#7A0D1A] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition"
                  >
                    <span>➕</span>
                    <span>إضافة طرف آخر</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {form.parties.map((party, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">صفته في العقد</label>
                        <select
                          value={party.role}
                          onChange={(e) => updateParty(idx, 'role', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                        >
                          <option value="الطرف الأول">الطرف الأول</option>
                          <option value="الزوج">الزوج</option>
                          <option value="الزوجة">الزوجة</option>
                          <option value="المورث">المورث (الهالك)</option>
                          <option value="الوارث">الوارث</option>
                          <option value="البائع">البائع</option>
                          <option value="المشتري">المشتري</option>
                          <option value="الموهوب له">الموهوب له</option>
                          <option value="صاحب الملك">صاحب الملك</option>
                          <option value="طرف آخر">طرف آخر</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الشخصي</label>
                        <input
                          type="text"
                          placeholder="الاسم الشخصي"
                          value={party.firstName}
                          onChange={(e) => updateParty(idx, 'firstName', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم العائلي</label>
                          <input
                            type="text"
                            placeholder="الاسم العائلي"
                            value={party.lastName}
                            onChange={(e) => updateParty(idx, 'lastName', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                          />
                        </div>
                        {form.parties.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParty(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold pt-5 px-1"
                            title="حذف الطرف"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span>👨‍⚖️</span>
                  <span>هل تعرف اسم العدل أو أحد العدلين المتلقيين للرسم؟</span>
                </h4>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="knowsNotary"
                      checked={form.knowsNotary === 'yes'}
                      onChange={() => update('knowsNotary', 'yes')}
                    />
                    <span>نعم، أعرف اسم أحدهما أو كليهما</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="knowsNotary"
                      checked={form.knowsNotary === 'no'}
                      onChange={() => {
                        update('knowsNotary', 'no');
                        update('firstNotaryName', '');
                        update('secondNotaryName', '');
                        setSelectedNotary(null);
                      }}
                    />
                    <span>لا أعرف</span>
                  </label>
                </div>

                {form.knowsNotary === 'yes' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم العدل الأول *</label>
                      <input
                        type="text"
                        placeholder="اكتب اسم العدل (مثال: سعيد، أحمد، محمد...)"
                        value={form.firstNotaryName}
                        onChange={(e) => update('firstNotaryName', e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                      />
                      {isSearchingFirstNotary && (
                        <div className="absolute left-3 top-8 text-[11px] text-slate-400 font-bold">
                          جاري البحث...
                        </div>
                      )}
                      {form.firstNotaryName.trim().length >= 2 && specificNotaryMatches.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl p-1.5 text-xs space-y-1 shadow-lg max-h-48 overflow-y-auto">
                          <div className="text-[10px] font-black text-slate-400 px-2 py-1">
                            اختر من العدول المسجلين بالمنظومة:
                          </div>
                          {specificNotaryMatches.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                update('firstNotaryName', n.full_name);
                                if (n.primary_court) {
                                  update('court', n.primary_court);
                                }
                                setSelectedNotary(n);
                              }}
                              className="cursor-pointer p-2 hover:bg-red-50/60 rounded-lg text-slate-900 font-bold flex items-center justify-between transition"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>👨‍⚖️</span>
                                <span>{n.full_name}</span>
                              </span>
                              {n.primary_court && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                                  {n.primary_court}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {form.firstNotaryName.trim().length >= 2 && !isSearchingFirstNotary && specificNotaryMatches.length === 0 && (
                        <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          لم يتم العثور على عدل مسجل بهذا الاسم. يمكنك المتابعة وسيقوم النظام بالبحث بالاسم المدخل.
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم العدل الثاني (إن وجد)</label>
                      <input
                        type="text"
                        placeholder="الأستاذ..."
                        value={form.secondNotaryName}
                        onChange={(e) => update('secondNotaryName', e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                      />
                      {isSearchingSecondNotary && (
                        <div className="absolute left-3 top-8 text-[11px] text-slate-400 font-bold">
                          جاري البحث...
                        </div>
                      )}
                      {form.secondNotaryName.trim().length >= 2 && specificSecondNotaryMatches.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl p-1.5 text-xs space-y-1 shadow-lg max-h-48 overflow-y-auto">
                          <div className="text-[10px] font-black text-slate-400 px-2 py-1">
                            اختر من العدول المسجلين بالمنظومة:
                          </div>
                          {specificSecondNotaryMatches.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                update('secondNotaryName', n.full_name);
                              }}
                              className="cursor-pointer p-2 hover:bg-red-50/60 rounded-lg text-slate-900 font-bold flex items-center justify-between transition"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>👨‍⚖️</span>
                                <span>{n.full_name}</span>
                              </span>
                              {n.primary_court && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                                  {n.primary_court}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    لا بأس إطلاقاً، يمكنك متابعة البحث وسيقوم النظام بعرض خريطة ودليل عدول المدينة عند الوصول للنتيجة.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STAGE 5: COURT & YEARS SCOPE */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-900">
                    🏛️ المحكمة الابتدائية التي يُحتمل أن يكون الرسم قد سُجل بها *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    (مستوردة من الدليل الرسمي للمحاكم المغربية)
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="🔎 اكتب اسم المدينة أو المحكمة للبحث السريع..."
                  value={form.courtSearchTerm}
                  onChange={(e) => update('courtSearchTerm', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#7A0D1A]/20"
                />

                <select
                  value={form.court}
                  onChange={(e) => update('court', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                >
                  <option value="">-- اختر المحكمة الابتدائية المختصة --</option>
                  {filteredCourts.map((court) => (
                    <option key={court} value={court}>
                      {court}
                    </option>
                  ))}
                </select>
              </div>

              

              
              {/* ========================================================================= */}
              {/* 🌿 PROGRESSIVE SMART NARROWING ENGINE (محرك تضييق نطاق البحث الذكي) */}
              {/* ========================================================================= */}
              <div className="space-y-5 pt-2">
                {/* 🌿 Main Banner */}
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 shadow-sm space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0 mt-0.5">🌿</span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-emerald-950">
                        سنساعدكم على تضييق نطاق البحث تدريجيًا
                      </h4>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                        لا يلزم أن تتذكروا جميع التفاصيل؛ أدخلوا فقط ما تعرفونه، وسيتولى النظام تحديد أفضل مسار للبحث.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FLOW SELECTOR / TABS BASED ON DEED TYPE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧭</span>
                      <h4 className="text-xs font-black text-slate-900">
                        مسار التضييق الذكي المخصص لـ: <span className="text-[#7A0D1A] font-bold">{form.deedType}</span>
                      </h4>
                    </div>
                    
                    {/* Persistent Remember Button */}
                    <button
                      type="button"
                      onClick={() => setRememberModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-black hover:bg-amber-100 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>💡</span>
                      <span>تذكرت معلومة أخرى؟</span>
                    </button>
                  </div>

                  {/* =================================================================== */}
                  {/* 💍 FLOW 1: MARRIAGE DEEDS (رسم الزواج) */}
                  {/* =================================================================== */}
                  {(form.deedType === 'رسوم الزواج' || form.deedType.includes('زواج')) && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-xs font-black text-[#7A0D1A]">
                        <span>💍</span>
                        <span>أولًا: مسار رسم الزواج</span>
                      </div>

                      {/* Stage 1: Approximate Period */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span>📅</span>
                            <span>المرحلة الأولى — الفترة التقريبية: هل تتذكرون متى تم الزواج؟</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'exact', label: '🎯 سنة محددة' },
                            { id: 'between_two', label: '⏳ بين سنتين' },
                            { id: 'approx', label: '📅 فترة تقريبية' },
                            { id: 'unknown', label: '❓ لا أتذكر' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  marriageYearAccuracy: opt.id,
                                });
                              }}
                              className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition ${
                                form.smartNarrowing?.marriageYearAccuracy === opt.id
                                  ? 'bg-[#7A0D1A] text-white border-[#7A0D1A] shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {form.smartNarrowing?.marriageYearAccuracy === 'exact' && (
                          <div className="pt-2 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-600">سنة الزواج المحددة:</label>
                            <input
                              type="number"
                              min={1950}
                              max={2026}
                              value={form.smartNarrowing?.marriageYear1 || 2015}
                              onChange={(e) => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  marriageYear1: Number(e.target.value),
                                });
                                update('exactYear', Number(e.target.value));
                              }}
                              className="w-36 border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono font-bold"
                            />
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                              <span>🟢</span>
                              <span>ممتاز، أصبحت لدينا فترة بحث أضيق ومحددة بسنة {form.smartNarrowing?.marriageYear1 || 2015}.</span>
                            </div>
                          </div>
                        )}

                        {form.smartNarrowing?.marriageYearAccuracy === 'between_two' && (
                          <div className="pt-2 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-600">بين سنتين (نطاق ضيق):</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1950}
                                max={2026}
                                value={form.smartNarrowing?.marriageYear1 || 2012}
                                onChange={(e) => {
                                  update('smartNarrowing', {
                                    ...form.smartNarrowing,
                                    marriageYear1: Number(e.target.value),
                                  });
                                  update('startYear', Number(e.target.value));
                                }}
                                className="w-28 border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono font-bold"
                              />
                              <span className="text-xs text-slate-500 font-bold">إلى</span>
                              <input
                                type="number"
                                min={1950}
                                max={2026}
                                value={form.smartNarrowing?.marriageYear2 || 2016}
                                onChange={(e) => {
                                  update('smartNarrowing', {
                                    ...form.smartNarrowing,
                                    marriageYear2: Number(e.target.value),
                                  });
                                  update('endYear', Number(e.target.value));
                                }}
                                className="w-28 border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono font-bold"
                              />
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                              <span>🟢</span>
                              <span>ممتاز، أصبحت لدينا فترة بحث أضيق بين سنتي {form.smartNarrowing?.marriageYear1} و {form.smartNarrowing?.marriageYear2}.</span>
                            </div>
                          </div>
                        )}

                        {form.smartNarrowing?.marriageYearAccuracy === 'approx' && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                            <span>⏳</span>
                            <span>لا بأس، سنساعدكم من خلال الأحداث والوثائق التالية لتضييق النطاق.</span>
                          </div>
                        )}
                      </div>

                      {/* Stage 2: Memory Event */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>🧠</span>
                          <span>المرحلة الثانية — حدث يساعد على التذكر: هل تتذكرون حدثًا وقع قريبًا من تاريخ الزواج؟</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            '💍 زواج قريب أو صديق',
                            '👶 ولادة طفل',
                            '🏠 انتقال لمنزل أو مدينة أخرى',
                            '💼 بداية عمل جديد أو تقاعد',
                            '🎉 مناسبة عائلية مميزة (حج، عمرة)',
                            '🌧️ حدث طبيعي أو عام (فيضان، بناء مسجد)',
                            '😷 جائحة كورونا (قبل/أثناء/بعد)',
                            '📝 حدث آخر...',
                          ].map((evt) => (
                            <button
                              key={evt}
                              type="button"
                              onClick={() => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  marriageEvent: evt,
                                });
                              }}
                              className={`p-2 rounded-lg text-xs font-bold border text-right transition ${
                                form.smartNarrowing?.marriageEvent === evt
                                  ? 'bg-[#7A0D1A] text-white border-[#7A0D1A] shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {evt}
                            </button>
                          ))}
                        </div>

                        {form.smartNarrowing?.marriageEvent && (
                          <div className="pt-2 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-600">
                              تفاصيل هذا الحدث ({form.smartNarrowing?.marriageEvent}):
                            </label>
                            <input
                              type="text"
                              placeholder="مثال: كان الزواج في نفس الصيف الذي تزوج فيه أخي الأكبر / قبل كورونا بسنة..."
                              value={form.smartNarrowing?.marriageEventDetail || ''}
                              onChange={(e) => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  marriageEventDetail: e.target.value,
                                });
                              }}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                            {form.smartNarrowing?.marriageEventDetail && (
                              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                                <span>🟢</span>
                                <span>تم تسجيل المعلومة بنجاح؛ يساعدنا هذا الحدث على تضييق سنوات البحث.</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stage 3: Civil Status Documents (خاصة بعد 2004) */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>🪪</span>
                          <span>المرحلة الثالثة — وثائق الحالة المدنية: هل لديكم كناش التعريف والحالة المدنية، أو عقد ولادة لأحد الأبناء بعد 2004؟</span>
                        </label>
                        
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              update('smartNarrowing', {
                                ...form.smartNarrowing,
                                hasCivilStatusDoc2004: 'yes',
                              });
                            }}
                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition ${
                              form.smartNarrowing?.hasCivilStatusDoc2004 === 'yes'
                                ? 'bg-[#7A0D1A] text-white border-[#7A0D1A]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ✓ نعم، تتوفر لدي وثيقة / كناش
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              update('smartNarrowing', {
                                ...form.smartNarrowing,
                                hasCivilStatusDoc2004: 'no',
                              });
                            }}
                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition ${
                              form.smartNarrowing?.hasCivilStatusDoc2004 === 'no'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ✕ لا تتوفر لدي حالياً
                          </button>
                        </div>

                        {form.smartNarrowing?.hasCivilStatusDoc2004 === 'yes' && (
                          <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-3">
                            <p className="text-[11px] font-bold text-emerald-900">
                              📑 يرجى إدخال المعطيات المسجلة في كناش الحالة المدنية أو رسم الولادة:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">رقم العقد / الكناش</label>
                                <input
                                  type="text"
                                  placeholder="مثال: 1422"
                                  value={form.smartNarrowing?.civilStatusDocNumber || ''}
                                  onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, civilStatusDocNumber: e.target.value })}
                                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">السنة المسجلة</label>
                                <input
                                  type="text"
                                  placeholder="مثال: 2008"
                                  value={form.smartNarrowing?.civilStatusDocYear || ''}
                                  onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, civilStatusDocYear: e.target.value })}
                                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">مصلحة الحالة المدنية / الجماعة</label>
                                <input
                                  type="text"
                                  placeholder="مثال: جماعة أكدال، فاس"
                                  value={form.smartNarrowing?.civilStatusCommune || ''}
                                  onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, civilStatusCommune: e.target.value })}
                                  className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                                />
                              </div>
                            </div>
                            
                            {form.smartNarrowing?.civilStatusDocNumber && (
                              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-950 space-y-2">
                                <div className="text-xs font-black flex items-center gap-1.5">
                                  <span>🎯</span>
                                  <span>تم الوصول إلى معلومات تساعد على تحديد الرسم وتوجيه البحث بدقة!</span>
                                </div>
                                <p className="text-[11px] text-emerald-900">
                                  مراجع الحالة المدنية تتيح للعدل الوصول المباشر إلى سجلات التضمين.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {form.smartNarrowing?.hasCivilStatusDoc2004 === 'no' && (
                          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 space-y-2">
                            <p className="text-xs leading-relaxed">
                              💡 <strong>توجيه مفيد:</strong> يمكن مراجعة مصلحة الحالة المدنية التي سُجل فيها زواجكم أو ازدياد أبنائكم، فغالبًا ما يُشار في سجلاتها إلى مراجع رسم الزواج.
                            </p>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-900 mb-1">ما هي مصلحة الحالة المدنية الأقرب لتسجيل الزواج؟</label>
                              <input
                                type="text"
                                placeholder="مثال: جماعة يعقوب المنصور، الرباط"
                                value={form.smartNarrowing?.civilStatusCommune || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, civilStatusCommune: e.target.value })}
                                className="w-full border border-blue-200 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stage 4: First Child Birth */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>👶</span>
                          <span>المرحلة الرابعة — ازدياد الطفل الأول: متى وُلد الطفل الأول بعد الزواج تقريبًا؟</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="مثال: سنة 2016 / أو بعد الزواج بسنتين..."
                            value={form.smartNarrowing?.firstChildBirthYear || ''}
                            onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, firstChildBirthYear: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                          />
                        </div>
                        {form.smartNarrowing?.firstChildBirthYear && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                            <span>🟢</span>
                            <span>تم حصر تاريخ الزواج في الفترة السابقة لولادة الطفل الأول.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* =================================================================== */}
                  {/* 💔 FLOW 2: DIVORCE DEEDS (رسوم الطلاق) */}
                  {/* =================================================================== */}
                  {(form.deedType === 'رسوم الطلاق' || form.deedType.includes('طلاق')) && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-xs font-black text-[#7A0D1A]">
                        <span>💔</span>
                        <span>ثانيًا: مسار رسم الطلاق</span>
                      </div>

                      {/* Decisive Question */}
                      <div className="bg-amber-50/80 rounded-xl p-5 border-2 border-amber-300 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                          <span>⚖️</span>
                          <span>السؤال الحاسم أولًا:</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed font-bold">
                          هل صدر الطلاق بموجب حكم قضائي (طلاق للشقاق أو غيره)، أم تم الإشهاد عليه مباشرة لدى عدلين (طلاق اتفاقي مثلاً)؟
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              update('smartNarrowing', {
                                ...form.smartNarrowing,
                                divorceAuthorityType: 'court_ruling',
                              });
                            }}
                            className={`p-4 rounded-xl text-xs font-black border-2 transition text-right flex items-start gap-3 ${
                              form.smartNarrowing?.divorceAuthorityType === 'court_ruling'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <span className="text-2xl">🏛️</span>
                            <div>
                              <div className="font-bold text-sm">حكم قضائي (طلاق للشقاق)</div>
                              <div className="text-[11px] opacity-80 font-normal mt-0.5">صدر عن المحكمة الابتدائية / قسم قضاء الأسرة</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              update('smartNarrowing', {
                                ...form.smartNarrowing,
                                divorceAuthorityType: 'adoul_witnessing',
                              });
                            }}
                            className={`p-4 rounded-xl text-xs font-black border-2 transition text-right flex items-start gap-3 ${
                              form.smartNarrowing?.divorceAuthorityType === 'adoul_witnessing'
                                ? 'bg-[#7A0D1A] text-white border-[#7A0D1A] shadow-md'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <span className="text-2xl">👨‍⚖️</span>
                            <div>
                              <div className="font-bold text-sm">الإشهاد لدى عدلين (طلاق اتفاقي)</div>
                              <div className="text-[11px] opacity-80 font-normal mt-0.5">تلقاه عدلان وحُرّر في رسم طلاق رسمي</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* PATH A: COURT RULING (يتوقف مسار العدول فورا!) */}
                      {form.smartNarrowing?.divorceAuthorityType === 'court_ruling' && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 border-2 border-slate-700 shadow-lg space-y-4">
                          <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-900 text-xl font-bold">
                              🏛️
                            </span>
                            <div>
                              <h4 className="text-sm font-black text-amber-300">توجيه قضائي رسمي — التوجه إلى المحكمة</h4>
                              <p className="text-xs text-slate-300">بما أن الطلاق صدر بموجب حكم قضائي، فإن الجهة الأنسب للبحث عن الحكم هي المحكمة التي أصدرته.</p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            يتوقف مسار البحث لدى العدول هنا، ونرجو منكم ملء المعطيات التالية لتوليد بطاقة الإحالة والتوجه إلى المحكمة:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-900">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">المحكمة المصدرة للحكم</label>
                              <input
                                type="text"
                                placeholder="مثال: قسم قضاء الأسرة بالرباط"
                                value={form.smartNarrowing?.divorceCourtName || form.court}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceCourtName: e.target.value })}
                                className="w-full border border-slate-600 rounded-lg p-2 text-xs bg-slate-100 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">السنة التقريبية للحكم</label>
                              <input
                                type="text"
                                placeholder="مثال: 2019"
                                value={form.smartNarrowing?.divorceRulingYear || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceRulingYear: e.target.value })}
                                className="w-full border border-slate-600 rounded-lg p-2 text-xs bg-slate-100 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الملف أو رقم الحكم (إن تيسر)</label>
                              <input
                                type="text"
                                placeholder="مثال: ملف شقاق رقم 1234/2019"
                                value={form.smartNarrowing?.divorceCaseNumber || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceCaseNumber: e.target.value })}
                                className="w-full border border-slate-600 rounded-lg p-2 text-xs bg-slate-100 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">أسماء الطرفين (الزوج والزوجة)</label>
                              <input
                                type="text"
                                placeholder="مثال: فلان بن فلان وفلانة بنت فلان"
                                value={form.smartNarrowing?.divorcePartiesNames || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorcePartiesNames: e.target.value })}
                                className="w-full border border-slate-600 rounded-lg p-2 text-xs bg-slate-100 text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddRememberedInfo(`توجيه قضائي: طلب حكم طلاق قضائي من محكمة ${form.smartNarrowing?.divorceCourtName || form.court}`, 'محكمة');
                                setStep(5);
                              }}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-black text-xs shadow-md transition flex items-center gap-2"
                            >
                              <span>🏛️</span>
                              <span>التوجه إلى المحكمة ومتابعة استخراج نسخة الحكم</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PATH B: ADOUL WITNESSING */}
                      {form.smartNarrowing?.divorceAuthorityType === 'adoul_witnessing' && (
                        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-4">
                          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span>👨‍⚖️</span>
                            <span>معلومات رسم الطلاق الاتفاقي المبرم لدى العدلين:</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">سنة أو فترة الطلاق</label>
                              <input
                                type="text"
                                placeholder="مثال: 2017"
                                value={form.smartNarrowing?.divorceAdoulYear || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceAdoulYear: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">اسم أحد العدلين (إن عُرف)</label>
                              <input
                                type="text"
                                placeholder="مثال: ذ. اليعقوبي"
                                value={form.smartNarrowing?.divorceAdoulName || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceAdoulName: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">أي مراجع مسجلة في كناش الحالة المدنية أو وثائق سابقة</label>
                              <input
                                type="text"
                                placeholder="مثال: إشارة الطلاق في كناش الحالة المدنية بتاريخ..."
                                value={form.smartNarrowing?.divorceAdoulRef || ''}
                                onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, divorceAdoulRef: e.target.value })}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                              />
                            </div>
                          </div>
                          {form.smartNarrowing?.divorceAdoulYear && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                              <span>🎯</span>
                              <span>تم تضييق نطاق البحث بنجاح، ويمكن التوجه لاختيار العدل.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* =================================================================== */}
                  {/* 🏠 FLOW 3: PROPERTY DEEDS (رسوم الأملاك والعقارات) */}
                  {/* =================================================================== */}
                  {(form.deedType.includes('الأملاك') || form.deedType.includes('البيع') || form.deedType.includes('عقار') || form.deedType === 'رسوم أخرى') && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-xs font-black text-[#7A0D1A]">
                        <span>🏠</span>
                        <span>ثالثًا: مسار رسوم الأملاك والعقارات</span>
                      </div>

                      {/* 1. Transaction Type */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>📑</span>
                          <span>نوع التصرف العقاري محل الرسم:</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            'بيع وشراء',
                            'هبة وصدقة',
                            'قسمة وتخارج',
                            'رسم ملكية واستمرار',
                            'إراثة ومخلفة',
                            'رهن وحيازة',
                            'عقد كراء / مغارسة',
                            'تصرف آخر...',
                          ].map((tType) => (
                            <button
                              key={tType}
                              type="button"
                              onClick={() => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  propertyTransactionType: tType,
                                });
                              }}
                              className={`p-2 rounded-lg text-xs font-bold border text-right transition ${
                                form.smartNarrowing?.propertyTransactionType === tType
                                  ? 'bg-[#7A0D1A] text-white border-[#7A0D1A] shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {tType}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. History & Memory Event */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>🧠</span>
                          <span>حدث تاريخي أو شخصي ارتبط بالعقار أو المعاملة:</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            '⚖️ نزاع أو دعوى قضائية',
                            '🌧️ فيضان أو جفاف أو سنة مميزة',
                            '😷 فترة جائحة كورونا',
                            '🏗️ بناء العقار أو تقسيمه',
                            '🛣️ مشروع عمومي أو طريق مجاور',
                            '💍 وفاة شخص أو زواج ارتبط بالملكية',
                            '💰 ظرف مالي أو تجاري خاص',
                            '📝 حدث آخر...',
                          ].map((pEvt) => (
                            <button
                              key={pEvt}
                              type="button"
                              onClick={() => {
                                update('smartNarrowing', {
                                  ...form.smartNarrowing,
                                  propertyHistoryEvent: pEvt,
                                });
                              }}
                              className={`p-2 rounded-lg text-xs font-bold border text-right transition ${
                                form.smartNarrowing?.propertyHistoryEvent === pEvt
                                  ? 'bg-[#7A0D1A] text-white border-[#7A0D1A] shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {pEvt}
                            </button>
                          ))}
                        </div>

                        {form.smartNarrowing?.propertyHistoryEvent && (
                          <div className="pt-2 space-y-2">
                            <label className="block text-[11px] font-bold text-slate-600">
                              تفاصيل الحدث المرتبط ({form.smartNarrowing?.propertyHistoryEvent}):
                            </label>
                            <input
                              type="text"
                              placeholder="مثال: تم البيع بعد نزاع الورثة بمدة وجيزة / بعد فتح الطريق الرئيسي سنة 2011..."
                              value={form.smartNarrowing?.propertyHistoryEventDetail || ''}
                              onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, propertyHistoryEventDetail: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. Location & Landmarks */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>📍</span>
                          <span>موقع العقار والحدود والمعالم المجاورة:</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">الحي أو الدوار أو الشارع</label>
                            <input
                              type="text"
                              placeholder="مثال: دوار أولاد ميمون / زنقة فاس"
                              value={form.smartNarrowing?.propertyNeighborhood || form.propertyLocation}
                              onChange={(e) => {
                                update('smartNarrowing', { ...form.smartNarrowing, propertyNeighborhood: e.target.value });
                                update('propertyLocation', e.target.value);
                              }}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">البلدية / القيادة / المحافظة العقارية</label>
                            <input
                              type="text"
                              placeholder="مثال: جماعة عين الشقف / محافظة فاس"
                              value={form.smartNarrowing?.propertyMunicipality || ''}
                              onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, propertyMunicipality: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Prior Document Reference */}
                      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>📎</span>
                          <span>هل توجد وثيقة سابقة تشير إلى الرسم؟ (رسم شراء سابق، شهادة إدارية، مطلب تحفيظ...)</span>
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => update('smartNarrowing', { ...form.smartNarrowing, hasPriorDeedDoc: 'yes' })}
                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition ${
                              form.smartNarrowing?.hasPriorDeedDoc === 'yes'
                                ? 'bg-[#7A0D1A] text-white border-[#7A0D1A]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ✓ نعم تتوفر مراجع أو صورة
                          </button>
                          <button
                            type="button"
                            onClick={() => update('smartNarrowing', { ...form.smartNarrowing, hasPriorDeedDoc: 'no' })}
                            className={`py-2 px-4 rounded-lg text-xs font-bold border transition ${
                              form.smartNarrowing?.hasPriorDeedDoc === 'no'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ✕ لا تتوفر
                          </button>
                        </div>

                        {form.smartNarrowing?.hasPriorDeedDoc === 'yes' && (
                          <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-600">مراجع الوثيقة السابقة (عدد، كناش، تاريخ...)</label>
                            <input
                              type="text"
                              placeholder="مثال: عدد 84 صحيفة 112 كناش الأملاك..."
                              value={form.smartNarrowing?.priorDeedDocRef || ''}
                              onChange={(e) => update('smartNarrowing', { ...form.smartNarrowing, priorDeedDocRef: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-900 font-mono"
                            />
                            <div className="pt-2">
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">📎 إرفاق صورة الوثيقة (اختياري):</label>
                              <input
                                type="file"
                                onChange={(e) => {
                                  const fname = e.target.files?.[0]?.name || '';
                                  update('smartNarrowing', { ...form.smartNarrowing, priorDeedDocFile: fname });
                                  update('oldDeedPhoto', fname);
                                }}
                                className="w-full text-xs text-slate-600 file:ml-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: REVIEW & PRIVACY GATEWAY */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-black text-slate-900 text-sm">📋 ملخص طلب البحث عن الرسم</h3>
                  <span className="font-mono text-xs font-black bg-[#7A0D1A] text-white px-3 py-1 rounded-full">
                    {requestId}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                    <p className="font-black text-slate-700">🪪 صاحب الطلب:</p>
                    <p className="text-slate-900 font-bold">{form.firstName} {form.lastName} ({form.idNumber})</p>
                    <p className="text-slate-600">الهاتف: {form.phone}</p>
                    <p className="text-slate-600">الصفة: {capacitiesList.find((c) => c.id === form.capacity)?.title}</p>
                  </div>

                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                    <p className="font-black text-slate-700">📜 الرسم محل البحث:</p>
                    <p className="text-slate-900 font-bold">نوع الرسم: {form.deedType}</p>
                    <p className="text-slate-600">المحكمة: {form.court || 'غير محددة'}</p>
                    <p className="text-slate-600">
                      الفترة: {form.yearKnowledge === 'exact' ? form.exactYear : `${form.startYear} – ${form.endYear}`}
                    </p>
                  </div>

                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200 sm:col-span-2">
                    <p className="font-black text-slate-700">👥 الأطراف المصرح بهم:</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {form.parties.map((p, idx) => (
                        <span key={idx} className="bg-slate-100 px-3 py-1 rounded-lg text-slate-800 font-bold">
                          {p.role}: {p.firstName} {p.lastName || ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-5 space-y-3">
                <div className="flex items-center gap-2 text-red-950 font-black text-sm">
                  <span>🔐</span>
                  <span>بوابة حماية المعطيات وسجلات التضمين الرسمية:</span>
                </div>
                <p className="text-xs leading-relaxed text-red-900">
                  البحث عن الرسم لا يعني إتاحة مضمونه أو بيانات أطرافه لمقدم الطلب. سيتم استخدام المعلومات المقدمة لتحديد الرسم المحتمل والتحقق من المسار المناسب، ويظل الاطلاع على الوثائق واستخراج نسخها خاضعاً للصفة القانونية والمقتضيات الجاري بها العمل.
                </p>
                <label className="flex items-center gap-3 pt-2 text-xs font-black text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#7A0D1A] focus:ring-[#7A0D1A]"
                  />
                  <span>أؤكد صحة المعلومات التي قدمتها ومسؤوليتي القانونية عنها.</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 7: SEARCH RESULT & GUIDANCE (النتيجة والتوجيه الذكي) */}
          {/* ========================================================================= */}
          {step === 6 && (
            <div className="space-y-6">
              {isSearching ? (
                <div className="py-16 text-center space-y-4">
                  <div className="inline-block animate-spin text-4xl">⏳</div>
                  <h3 className="text-lg font-black text-slate-800">جارٍ تحليل المعطيات ومطابقة السجلات...</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    نقوم بالتحقق من قواعد بيانات المحكمة المختصة ({form.court}) وتحديد مسار المتابعة المناسب.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xl">
                          ✓
                        </span>
                        <div>
                          <span className="text-xs font-black text-emerald-900">🟢 نتيجة البحث والمسار المتاح</span>
                          <h3 className="text-base font-black text-emerald-950">
                            {activeNotary ? 'تم تحديد العدل المختص لتوجيه طلب النسخة مباشرة' : 'خريطة ودليل عدول المدينة لتوجيه الطلب'}
                          </h3>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white text-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200">
                        {requestId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      بناءً على المعلومات المصرح بها لمطابقة السجل بمحكمة <strong>{form.court}</strong>، إليكم المسار المباشر للتواصل واستخراج النسخة.
                    </p>
                  </div>

                  {/* =================================================================== */}
                  {/* CASE 1: SPECIFIC NOTARY IS SELECTED / WRITTEN */}
                  {/* =================================================================== */}
                  {activeNotary ? (
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-6 space-y-5">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A0D1A] text-white text-xl font-bold">
                            👨‍⚖️
                          </span>
                          <div>
                            <span className="text-[11px] font-black text-blue-900">العدل الموجه إليه الطلب:</span>
                            <h4 className="text-base font-black text-slate-900">{activeNotary.full_name}</h4>
                          </div>
                        </div>
                        {activeNotary.phone && (
                          <span className="font-mono text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-xl border border-blue-200" dir="ltr">
                            {activeNotary.phone}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        يمكنكم الآن توجيه طلبكم مباشرة إلى الصندوق المهني للأستاذ <strong>{activeNotary.full_name}</strong> داخل التطبيق، أو التواصل الفوري معه عبر WhatsApp لمتابعة استخراج النسخة مستدلين برقم مرجع البحث (<span className="font-mono font-bold text-slate-900">{requestId}</span>).
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Option A: Direct Copy Extraction in App */}
                        <button
                          type="button"
                          onClick={() => handleSendToCopyExtraction()}
                          className="bg-[#7A0D1A] hover:bg-[#600a14] text-white font-black py-3.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                        >
                          <span>🏛️</span>
                          <span>إرسال الطلب إلى الصندوق المهني للعدل</span>
                        </button>

                        {/* Option B: Direct WhatsApp */}
                        <a
                          href={whatsappDirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                        >
                          <span>💬</span>
                          <span>التواصل المباشر عبر WhatsApp</span>
                        </a>
                      </div>

                      {/* Option to change notary / view all notaries */}
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNotary(null);
                            update('knowsNotary', 'no');
                            update('firstNotaryName', '');
                          }}
                          className="text-xs text-blue-900 font-bold hover:underline"
                        >
                          🗺️ عرض خريطة ودليل كافة عدول {form.court} لاختيار عدل آخر
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* =================================================================== */
                    /* CASE 2: NO NOTARY SPECIFIED -> SHOW MAP OF NOTARIES IN CITY/COURT */
                    /* =================================================================== */
                    <div className="space-y-5">
                      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <span>🗺️</span>
                              <span>خريطة ودليل عدول دائرة: {form.court}</span>
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              حددوا العدل المناسب من الخريطة أو القائمة لتوجيه طلب استخراج النسخة والتواصل معه مباشرة:
                            </p>
                          </div>
                          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                            {courtNotaries.length} عدل مسجل
                          </span>
                        </div>

                        {/* Interactive GoogleMapSelector focused on the court */}
                        <GoogleMapSelector
                          onLocationSelect={() => undefined}
                          cityCounts={[]}
                          focusLocation={form.court}
                        />

                        {/* Notaries Selection Grid */}
                        <div className="grid gap-3 sm:grid-cols-2 max-h-72 overflow-y-auto pt-2">
                          {courtNotaries.map((notary) => {
                            return (
                              <div
                                key={notary.id}
                                className="group flex items-center justify-between border border-slate-200 hover:border-[#7A0D1A] p-3.5 rounded-xl bg-white hover:bg-red-50/30 transition shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7A0D1A] text-white text-xs font-bold">
                                    {notary.photo_url ? (
                                      <img src={notary.photo_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      notary.full_name.trim().charAt(0)
                                    )}
                                  </span>
                                  <div>
                                    <div className="font-black text-xs text-slate-900">{notary.full_name}</div>
                                    <div className="text-[11px] text-slate-500" dir="ltr">
                                      {notary.phone || 'الهاتف متاح بالدليل'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSendToCopyExtraction(notary)}
                                    className="bg-[#7A0D1A] text-white text-[11px] font-black px-3 py-1.5 rounded-lg hover:bg-[#600a14] transition shadow-sm"
                                  >
                                    اختيار ومتابعة
                                  </button>
                                  {notary.phone && (
                                    <a
                                      href={`https://wa.me/${notary.phone.replace(/^0/, '212').replace(/\D/g, '')}?text=${whatsappSearchMessage}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-500 transition"
                                      title="مراسلة عبر واتساب"
                                    >
                                      💬
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!isFetchingNotaries && !courtNotaries.length && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                            لا يوجد عدول مسجلون تلقائياً في النظام لهذه المحكمة حالياً. يرجى التوجه إلى قسم قضاء التوثيق بالمحكمة المحددة أدناه.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Secondary Path: Court Documentation Registry Guidance */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="text-2xl">🏛️</span>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">المسار الإداري: قسم قضاء التوثيق بالمحكمة</h4>
                        <p className="text-[11px] text-slate-500">الاستفسار والبحث في سجلات التضمين بالمحكمة</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-2 text-slate-800">
                      <p className="font-bold text-slate-900">📍 {form.court}</p>
                      <p className="text-[11px] text-slate-600">
                        <strong>ماذا تطلب من المحكمة؟</strong> التوجه إلى كتابة الضبط بقسم قضاء التوثيق للاستفسار عن سجل التضمين مستدلين برقم طلب البحث: <span className="font-mono font-bold text-slate-900">{requestId}</span>.
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1 bg-white">
                      <p className="font-black text-slate-900">📋 الوثائق المستحسن اصطحابها:</p>
                      <p>✓ بطاقة التعريف الوطنية</p>
                      <p>✓ رقم طلب البحث ({requestId})</p>
                      <p>✓ الوثائق المثبتة للصفة أو المصلحة القانونية المصرح بها</p>
                    </div>
                  </div>

                  {/* Print / Restart Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span>🖨️</span>
                      <span>طباعة بطاقة البحث والتوجيه</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetNewSearch}
                      className="text-xs font-bold text-[#7A0D1A] hover:underline"
                    >
                      بدء بحث جديد ↺
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 6 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => setStep((curr) => Math.max(0, curr - 1))}
                disabled={step === 0}
                className="px-5 py-3 text-xs font-black text-slate-600 disabled:opacity-30 rounded-xl hover:bg-slate-100 transition"
              >
                السابق
              </button>

              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => {
                  if (step === 5) {
                    handleStartSearch();
                  } else {
                    setStep((curr) => curr + 1);
                  }
                }}
                className="bg-[#7A0D1A] px-6 py-3 text-xs font-black text-white rounded-xl shadow-md disabled:cursor-not-allowed disabled:opacity-40 transition hover:bg-[#600a14]"
              >
                {step === 5 ? '🔵 بدء البحث والتحقق من الرسم' : 'التالي ➔'}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 💡 MODAL: PERSISTENT REMEMBERED INFO ("تذكرت معلومة أخرى") */}
      {/* ========================================================================= */}
      {rememberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border-2 border-amber-300 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 text-lg font-bold">
                  💡
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">إضافة معلومة جديدة تذكرتها</h3>
                  <p className="text-[11px] text-slate-500">تُضاف مباشرة إلى سجل الطلب رقم: {requestId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRememberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع المعلومة المتذكرة:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['حدث / مناسبة', 'تاريخ / سنة تقريبية', 'اسم شخص أو عدل', 'وثيقة / كناش', 'موقع أو عقار', 'معلومة أخرى'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRememberCategory(cat)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition text-center ${
                        rememberCategory === cat
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اكتب المعلومة بالتفصيل:</label>
                <textarea
                  rows={3}
                  value={newRememberedNote}
                  onChange={(e) => setNewRememberedNote(e.target.value)}
                  placeholder="مثال: تذكرت أن الزواج كان في نفس صيف بناء مسجد الحي، أو أن أحد الشهود كان فلان بن فلان..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
              </div>

              {rememberSuccessMsg && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <span>🟢</span>
                  <span>تم حفظ المعلومة بنجاح وإضافتها إلى سجل الطلب!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRememberModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!newRememberedNote.trim()}
                onClick={() => handleAddRememberedInfo()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>إضافة إلى سجل الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
