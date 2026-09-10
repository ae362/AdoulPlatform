import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMapSelector } from '../components/GoogleMapSelector';
import { ReturnToLandingButton } from '../components/common/ReturnToLandingButton';
import { PublicOfficialHeader } from '../components/common/PublicOfficialHeader';
import { COURT_MAPPINGS } from '../../../shared/courts';
import { trpc } from '../trpc';

const steps = [
  { label: 'التعريف بالرسم', icon: '📜' },
  { label: 'صفة طالب النسخة', icon: '⚖️' },
  { label: 'بيانات مقدم الطلب', icon: '🪪' },
  { label: 'سبب الطلب', icon: '🎯' },
  { label: 'مراجع الرسم', icon: '📑' },
  { label: 'مراجعة الطلب', icon: '🔎' },
];

const capacitiesWithIcons = [
  { label: 'أحد أطراف الرسم', icon: '👤', desc: 'صاحب الرسم المباشر أو أحد أطرافه المقيدين.' },
  { label: 'ذوو الحقوق / أحد الورثة', icon: '👨‍👩‍👧', desc: 'وارث شرعي أو من أصحاب الحقوق المثبتة.' },
  { label: 'وكيل', icon: '📑', desc: 'نائب بموجب وكالة رسمية صحيحة وقائمة.' },
  { label: 'ولي', icon: '👨‍👦', desc: 'ولي شرعي أو وصي قانوني على القاصر.' },
  { label: 'شاهد', icon: '👁️', desc: 'أحد الشهود المثبتين بالرسم العدلي.' },
  { label: 'الغير', icon: '👥', desc: 'له مصلحة مشروعة مبررة قانونياً أو قضائياً.' },
  { label: 'غرض إداري', icon: '🏢', desc: 'لغاية مرتبطة بإجراء أو ملف إداري رسمي.' },
];

const purposesWithIcons = [
  { label: 'ضياع الأصل', icon: '📄' },
  { label: 'تلف الأصل', icon: '⚠️' },
  { label: 'الحاجة إلى نسخة إضافية', icon: '➕' },
  { label: 'إثبات حق', icon: '⚖️' },
  { label: 'إجراء قضائي', icon: '🏛️' },
  { label: 'إجراء إداري', icon: '🏢' },
  { label: 'إجراء عقاري', icon: '🏠' },
  { label: 'إجراء إراثي', icon: '👨‍👩‍👧' },
  { label: 'إجراء متعلق بالزواج أو الطلاق', icon: '💍' },
  { label: 'استعمال لدى إدارة عمومية', icon: '📑' },
  { label: 'استعمال لدى جهة قضائية', icon: '⚖️' },
  { label: 'سبب آخر', icon: '❓' },
];

const primaryCourts: string[] = Array.from(new Set<string>(COURT_MAPPINGS.flatMap(({ primaryCourts }) => primaryCourts))).sort((first: string, second: string) =>
  first.localeCompare(second, 'ar')
);

const deedCategories = [
  { label: 'رسوم الزواج', types: ['رسم زواج', 'رسم زواج مختلط', 'رسم استمرار زواج'] },
  { label: 'رسوم الطلاق', types: ['رسم الإشهاد على الطلاق الاتفاقي'] },
  {
    label: 'رسوم الأملاك',
    types: [
      'رسم ملكية',
      'رسم حيازة',
      'رسم شراء (شخص ذاتي)',
      'رسم شراء (شخص معنوي)',
      'رسم شراء في الملكية المشتركة',
      'عقد إيجار المفضي إلى تملك عقار',
      'كراء طويل الأمد',
      'عقد تحبيس',
      'عقد بيع حق الهواء والتعلية',
      'عقد تفويت حق السطحية',
      'ثبوت زينة عقار',
      'ثبوت بناء',
      'عقد العمرى',
      'بيع وشراء طور الإنجاز ابتدائي',
      'بيع وشراء طور الإنجاز نهائي',
      'رسم هبة',
      'رسم صدقة',
      'رسم رهن',
      'رسم مقاسمة',
      'رسم تسليم بعوض',
      'رسم إقرار واعتراف',
    ],
  },
  { label: 'رسوم التركات', types: ['رسم إراثة', 'بيان فريضة', 'إحصاء متروك'] },
  {
    label: 'رسوم باقي الوثائق',
    types: [
      'توكيل رسمي',
      'رسم الإقرار ببنوة',
      'ثبوت نسب ببينة السماع',
      'اتفاق تدبير أموال زوجية',
      'رهن حيازي',
      'رسم إبراء من دين',
      'رسم إقرار بدين',
      'أخرى',
    ],
  },
];

export function PublicCopyExtractionPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [selectedNotaryIds, setSelectedNotaryIds] = useState<string[]>([]);
  const [notariesInitialized, setNotariesInitialized] = useState(false);
  const [activeNotaryField, setActiveNotaryField] = useState<'firstNotary' | 'secondNotary' | null>(null);
  const [courtSearchTerm, setCourtSearchTerm] = useState('');
  const [smartNarrowing, setSmartNarrowing] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [parentNames, setParentNames] = useState<string>('');
  const [propertyLocation, setPropertyLocation] = useState<string>('');
  const [oldDeedPhoto, setOldDeedPhoto] = useState<string>('');

  useEffect(() => {
    try {
      const rawPrefill = sessionStorage.getItem('adoul_copy_extraction_prefill');
      if (rawPrefill) {
        const data = JSON.parse(rawPrefill);
        setForm((prev) => ({
          ...prev,
          year: data.year || prev.year,
          court: data.court || prev.court,
          firstNotary: data.firstNotary || prev.firstNotary,
          secondNotary: data.secondNotary || prev.secondNotary,
          capacity: data.capacity || prev.capacity,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          identityType: data.identityType || prev.identityType,
          identityNumber: data.identityNumber || prev.identityNumber,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          address: data.address || prev.address,
          deedCategory: data.deedCategory || prev.deedCategory,
          deedType: data.deedType || prev.deedType,
        }));
        if (data.smartNarrowing) setSmartNarrowing(data.smartNarrowing);
        if (Array.isArray(data.timelineEvents) && data.timelineEvents.length) setTimelineEvents(data.timelineEvents);
        if (Array.isArray(data.parties) && data.parties.length) setParties(data.parties);
        if (data.parentNames) setParentNames(data.parentNames);
        if (data.propertyLocation) setPropertyLocation(data.propertyLocation);
        if (data.oldDeedPhoto) setOldDeedPhoto(data.oldDeedPhoto);
      }
    } catch (e) {
      console.warn('Failed to parse copy extraction prefill:', e);
    }
  }, []);

  // Communication channel preference
  const [communicationChannel, setCommunicationChannel] = useState<'inbox' | 'whatsapp'>('inbox');

  const [form, setForm] = useState({
    year: '',
    court: '',
    firstNotary: '',
    secondNotary: '',
    capacity: '',
    firstName: '',
    lastName: '',
    identityType: 'البطاقة الوطنية',
    identityNumber: '',
    phone: '',
    email: '',
    address: '',
    purpose: '',
    otherPurpose: '',
    deedCategory: '',
    deedType: '',
    number: '',
    letter: '',
    page: '',
    count: '',
    date: '',
    evidenceName: '',
  });

  const [requestNumber] = useState(
    () => `EXT-PUB-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`
  );

  const selectedYear = Number(form.year);
  const isHistoricalRequest = form.year === 'ما قبل 2000' || (Boolean(selectedYear) && selectedYear < 2000);

const interestProofs = [
  'مقال دعوى قضائية جارية',
  'شكاية مسجلة بالنيابة العامة',
  'حكم أو قرار قضائي',
  'ملف تنفيذ جبري أو حجز',
  'إشعار أو طلب من إدارة عمومية',
  'مصلحة عقارية أو نزاع مدني',
];

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, index) => String(currentYear - index)
  );

  // Multiple proofs state for Agent (وكيل)
  const [agentProofs, setAgentProofs] = useState<Array<{
    id: string;
    docFile: string;
    docUrl: string;
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
      docUrl: '',
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
        docUrl: '',
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
    docUrl: string;
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
      docUrl: '',
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
        docUrl: '',
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
    proofDocUrl: string;
  }>>([
    {
      id: '1',
      interestType: 'مقال دعوى قضائية',
      caseNumber: '',
      fileReference: '',
      submissionDate: '',
      caseCourt: '',
      proofDocFile: '',
      proofDocUrl: '',
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
        proofDocUrl: '',
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
    docUrl: string;
    refNumber: string;
    notes: string;
  }>>([
    {
      id: '1',
      docType: 'بطاقة التعريف الوطنية',
      docFile: '',
      docUrl: '',
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
        docUrl: '',
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

  /** Reads a browser File object as a base64 data URL so it can be stored and later downloaded. */
  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createRequestMutation = trpc.extractionRequests.createPublic.useMutation();

  const handleDeedTypeChange = (value: string) => {
    const matchedCategory = deedCategories.find((item) => item.types.includes(value));
    setForm((current) => ({
      ...current,
      deedType: value,
      deedCategory: matchedCategory ? matchedCategory.label : '',
    }));
  };

  const normalizeArabic = (str?: string | null) =>
    (str || '')
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '');

  // 1. Fetch notaries in the selected court (static court query)
  const { data: courtNotaryMatches = [], isLoading: isLoadingCourtNotaries } = trpc.notaries.list.useQuery(
    { court: form.court },
    { enabled: Boolean(form.court) }
  );

  // 2. Fetch remote search results when typing >= 2 characters
  const activeNotaryQuery = activeNotaryField ? form[activeNotaryField] : '';
  const { data: searchedNotaries = [], isFetching: isSearchingRemote } = trpc.notaries.list.useQuery(
    { court: form.court || undefined, name: activeNotaryQuery.trim() },
    { enabled: Boolean(activeNotaryQuery.trim().length >= 2) }
  );

  // 3. Combined pool of notaries
  const combinedNotaryPool = useMemo(() => {
    const map = new Map<string, any>();
    courtNotaryMatches.forEach((n) => map.set(n.id, n));
    searchedNotaries.forEach((n) => map.set(n.id, n));
    return Array.from(map.values());
  }, [courtNotaryMatches, searchedNotaries]);

  // 4. Instant in-memory Arabic-normalized filtered matches for each field
  const firstNotaryMatches = useMemo(() => {
    const q = normalizeArabic(form.firstNotary);
    if (!q) return courtNotaryMatches;
    return combinedNotaryPool.filter((n) => normalizeArabic(n.full_name).includes(q));
  }, [combinedNotaryPool, courtNotaryMatches, form.firstNotary]);

  const secondNotaryMatches = useMemo(() => {
    const q = normalizeArabic(form.secondNotary);
    if (!q) return courtNotaryMatches;
    return combinedNotaryPool.filter((n) => normalizeArabic(n.full_name).includes(q));
  }, [combinedNotaryPool, courtNotaryMatches, form.secondNotary]);

  useEffect(() => {
    if (!form.court) {
      setSelectedNotaryIds([]);
      setNotariesInitialized(false);
      return;
    }
    if (courtNotaryMatches.length && !notariesInitialized) {
      setSelectedNotaryIds([courtNotaryMatches[0].id]);
      setNotariesInitialized(true);
    }
  }, [form.court, courtNotaryMatches, notariesInitialized]);

  const filteredCourts = useMemo<string[]>(() => {
    if (!courtSearchTerm.trim()) return primaryCourts;
    const term = courtSearchTerm.trim().toLowerCase();
    return primaryCourts.filter((c: string) => c.toLowerCase().includes(term));
  }, [courtSearchTerm]);

  const handleCourtChange = (court: string) => {
    update('court', court);
    setSelectedNotaryIds([]);
    setNotariesInitialized(false);
  };

  const toggleNotary = (id: string) => {
    setSelectedNotaryIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  const firstSelectedNotary = useMemo(() => {
    if (isHistoricalRequest) {
      return (
        combinedNotaryPool.find((n) => selectedNotaryIds.includes(n.id)) ||
        (form.firstNotary && combinedNotaryPool.find((n) => normalizeArabic(n.full_name).includes(normalizeArabic(form.firstNotary)))) ||
        courtNotaryMatches[0]
      );
    }
    return (
      (form.firstNotary && combinedNotaryPool.find((n) => normalizeArabic(n.full_name).includes(normalizeArabic(form.firstNotary)))) ||
      combinedNotaryPool.find((n) => selectedNotaryIds.includes(n.id)) ||
      courtNotaryMatches[0]
    );
  }, [combinedNotaryPool, courtNotaryMatches, form.firstNotary, isHistoricalRequest, selectedNotaryIds]);

  const targetPhone = (firstSelectedNotary?.phone || '').replace(/^0/, '212').replace(/\D/g, '') || '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accepted) return;

    setSubmissionError('');

    try {
      const assignedNotaryIds = isHistoricalRequest
        ? selectedNotaryIds
        : courtNotaryMatches
            .filter((n) => n.full_name === form.firstNotary || (form.secondNotary && n.full_name === form.secondNotary))
            .map((n) => n.id);

      const statusLabel =
        communicationChannel === 'whatsapp'
          ? '📤 تمت الإحالة عبر WhatsApp — بانتظار متابعة العدل'
          : '📬 تمت الإحالة إلى الصندوق المهني — بانتظار الاطلاع';

      let activeProofs: Array<{ id: string; title: string; details: string }> = [];
      let activeAttachments: Array<{ name: string; url: string }> = [];

      if (form.capacity === 'وكيل') {
        activeProofs = agentProofs.map((p, i) => ({
          id: p.id,
          title: `وكالة رسمية (${i + 1})`,
          details: `دفتر: ${p.bookType || '-'} / رقم: ${p.bookNumber || '-'} / حرف: ${p.bookLetter || '-'} / ص: ${p.bookPage || '-'} / عدد: ${p.bookCount || '-'} / تاريخ: ${p.bookDate || '-'}`,
          docFile: p.docFile,
          docUrl: p.docUrl,
        }));
        activeAttachments = agentProofs
          .filter((p) => p.docFile)
          .map((p) => ({ name: p.docFile, url: p.docUrl }));
      } else if (form.capacity === 'ذوو الحقوق / أحد الورثة') {
        activeProofs = heirProofs.map((p, i) => ({
          id: p.id,
          title: `رسم إراثة (${i + 1})`,
          details: `دفتر: ${p.bookNumber || '-'} / حرف: ${p.bookLetter || '-'} / ص: ${p.bookPage || '-'} / عدد: ${p.bookCount || '-'} / تاريخ: ${p.bookDate || '-'} / محكمة: ${p.bookCourt || '-'}`,
          docFile: p.docFile,
          docUrl: p.docUrl,
        }));
        activeAttachments = heirProofs
          .filter((p) => p.docFile)
          .map((p) => ({ name: p.docFile, url: p.docUrl }));
      } else if (form.capacity === 'الغير' || form.capacity === 'غرض إداري') {
        activeProofs = thirdPartyProofs.map((p, i) => ({
          id: p.id,
          title: `سند مصلحة: ${p.interestType} (${i + 1})`,
          details: `مرجع: ${p.caseNumber || '-'} / جهة: ${p.caseCourt || '-'}`,
          docFile: p.proofDocFile,
          docUrl: p.proofDocUrl,
        }));
        activeAttachments = thirdPartyProofs
          .filter((p) => p.proofDocFile)
          .map((p) => ({ name: p.proofDocFile, url: p.proofDocUrl }));
      } else {
        activeProofs = partyProofs.map((p, i) => ({
          id: p.id,
          title: `${p.docType || 'وثيقة إثبات'} (${i + 1})`,
          details: p.refNumber || 'صفة مباشرة',
          docFile: p.docFile,
          docUrl: p.docUrl,
        }));
        activeAttachments = partyProofs
          .filter((p) => p.docFile)
          .map((p) => ({ name: p.docFile, url: p.docUrl }));
      }

      await createRequestMutation.mutateAsync({
        requestNumber,
        assignedNotaryIds,
        data: {
          ...form,
          smartNarrowing: smartNarrowing || undefined,
          timelineEvents: timelineEvents.length ? timelineEvents : undefined,
          parties: parties.length ? parties : undefined,
          parentNames: parentNames || undefined,
          propertyLocation: propertyLocation || undefined,
          oldDeedPhoto: oldDeedPhoto || undefined,
          proofs: activeProofs,
          attachments: activeAttachments,
          communicationChannel,
          status: statusLabel,
          timeline: [
            {
              id: `t-${Date.now()}`,
              timestamp: `${new Date().toLocaleDateString('ar-MA')} ${new Date().toLocaleTimeString('ar-MA', {
                hour: '2-digit',
                minute: '2-digit',
              })}`,
              action: 'إنشاء الطلب وتحديد قناة التواصل',
              actor: `${form.firstName} ${form.lastName}`.trim(),
              notes: statusLabel,
            },
          ],
        },
      });
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'تعذر تسجيل الطلب. يرجى المحاولة مرة أخرى.');
    }
  };

  const evidenceRequired = true; // Required for all capacity selections as requested
  const canContinue = () => {
    if (step === 0) return Boolean(form.year && form.court && (isHistoricalRequest || form.firstNotary));
    if (step === 1) {
      if (!form.capacity) return false;
      if (form.capacity === 'وكيل') {
        return agentProofs.length >= 1;
      }
      if (form.capacity === 'ذوو الحقوق / أحد الورثة') {
        return heirProofs.length >= 1;
      }
      if (form.capacity === 'الغير' || form.capacity === 'غرض إداري') {
        return thirdPartyProofs.length >= 1;
      }
      return partyProofs.length >= 1;
    }
    if (step === 2) return Boolean(form.firstName && form.lastName && form.identityNumber && form.phone);
    if (step === 3) return Boolean(form.purpose && (form.purpose !== 'سبب آخر' || form.otherPurpose));
    if (step === 4) return Boolean(form.deedType);
    return true;
  };

  const whatsappPreFilledText = encodeURIComponent(
    `السلام عليكم ورحمة الله،\n` +
    `أنا ${form.firstName} ${form.lastName}، أود التواصل معكم بخصوص طلب استخراج نسخة رسم عدلي المسجل بالمنصة برقم: ${requestNumber}.\n\n` +
    `📋 تفاصيل الرسم:\n` +
    `• نوع الرسم: ${form.deedType}\n` +
    `• المحكمة الابتدائية: ${form.court}\n` +
    `• سنة التلقي: ${form.year}\n` +
    (form.number ? `• مراجع التضمين: دفتر ${form.number} ص ${form.page || '-'} عدد ${form.count || '-'}\n` : '') +
    `\n👤 بيانات مقدم الطلب:\n` +
    `• الاسم الكامل: ${form.firstName} ${form.lastName}\n` +
    `• الصفة: ${form.capacity}\n` +
    `• رقم الهاتف: ${form.phone}\n` +
    `• البريد الإلكتروني: ${form.email || 'غير محدد'}\n\n` +
    `يرجى التفضل بمتابعة دراسة الملف وتوجيهنا للإجراءات المطلوبة. شكراً جزيلاً.`
  );
  const whatsappUrl = `https://wa.me/${targetPhone}?text=${whatsappPreFilledText}`;

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50" dir="rtl">
        <PublicOfficialHeader />
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">
          <section className="border-t-4 border-[#7A0D1A] bg-white p-8 text-center shadow-lg rounded-2xl space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
              ✓
            </div>
            <div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                تم التسجيل بنجاح
              </span>
              <h1 className="mt-2 text-2xl font-black text-slate-900">تم تسجيل طلبكم بنجاح في المنصة</h1>
            </div>

            <div className="mx-auto max-w-sm rounded-xl bg-[#7A0D1A] px-5 py-4 font-mono text-xl font-bold tracking-widest text-white border-2 border-[#7A0D1A] shadow-lg">
              {requestNumber}
            </div>

            {communicationChannel === 'whatsapp' ? (
              /* WhatsApp Confirmation Card */
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-6 text-right space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                    💬
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">تم اختيار التواصل المباشر عبر WhatsApp</h3>
                    <p className="text-xs text-emerald-800">
                      تم تسجيل الطلب في النظام بحالة: (📤 تمت الإحالة عبر WhatsApp — بانتظار متابعة العدل).
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-700">
                  يرجى الاحتفاظ برقم طلبكم <strong className="font-mono text-slate-900">{requestNumber}</strong> والإشارة
                  إليه عند مراسلة العدل لضمان سهولة ربط المحادثة بملفكم الإلكتروني.
                </p>

                <div className="pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-xs font-black text-white hover:bg-emerald-500 shadow-md transition"
                  >
                    <span>💬 فتح WhatsApp والمراسلة الآن</span>
                  </a>
                </div>

                <div className="text-center pt-1 text-xs font-bold text-slate-500">
                  📬 يمكنك أيضًا متابعة وضعية الطلب واستخراج النسخة من حسابكم داخل التطبيق في أي وقت.
                </div>
              </div>
            ) : (
              /* Professional Inbox Confirmation Card */
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-6 text-right space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A0D1A] text-[#E6BE8A] font-bold text-lg">
                    🏛️
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">تمت الإحالة إلى الصندوق المهني للعدل</h3>
                    <p className="text-xs text-blue-900">
                      تم إنشاء ملف طلب رسمي متكامل ومحمي داخل صندوق العدل، وفي انتظار الاطلاع عليه.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-blue-200 p-4 text-xs space-y-1.5 text-slate-800">
                  <div className="font-black text-slate-900">ملخص بطاقة الطلب الموجهة للعدل:</div>
                  <div>👤 مقدم الطلب: {form.firstName} {form.lastName}</div>
                  <div>📜 نوع الرسم: {form.deedType} ({form.year})</div>
                  <div>⚖️ الصفة: {form.capacity}</div>
                  <div>📎 الوثائق: بطاقة التعريف والمرفقات مسجلة ومحفوظة بالملف</div>
                  <div className="pt-1 text-amber-800 font-bold">🟠 الحالة: في انتظار اطلاع العدل وبدء المعالجة</div>
                </div>
              </div>
            )}

            <p className="text-xs leading-6 text-slate-500">
              دراسة الطلب واستخراج النسخة يظلان خاضعين للشروط والمقتضيات القانونية والمسطرية المعمول بها في مهنة التوثيق
              العدلي.
            </p>

            <div className="pt-2">
              <ReturnToLandingButton className="justify-center" />
            </div>
          </section>
        </div>
      </main>
    );
  }

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
              <span>📄</span>
              <span>استخراج نسخ الرسوم والشهادات العدلية</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/90 font-medium font-kufi">
              نرافقكم خطوة بخطوة للوصول إلى الرسم المطلوب وتحديد المسار المناسب لطلب نسخته وفق المقتضيات القانونية.
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
            <span className="text-xs font-black text-slate-800">مسار طلب النسخة</span>
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
                <li key={s.label}>
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
              يخضع استخراج نسخ الرسوم العدلية للقانون 51.26 ولإثبات الصفة القانونية لطالب النسخة أو إذن القاضي المكلف بالتوثيق.
            </p>
          </div>
        </aside>

        {/* 📄 Main Form Content */}
        <section className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#7A0D1A]">المرحلة {step + 1} من {steps.length}</p>
              <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <span>{steps[step].icon}</span>
                <span>{steps[step].label}</span>
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {requestNumber}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* STEP 0: DEED DEFINITION */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-5 space-y-2 text-blue-950">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>🏛️</span>
                    <span>تحديد المحكمة وسنة تلقي الرسم والعدلين</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-blue-900">
                    حدد المحكمة الابتدائية المختصة وسنة إنجاز الرسم، مع كتابة اسم العدل الموثق لتسريع الوصول إلى السجل المعني.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="📅 سنة إنجاز وتلقي الرسم *">
                    <select
                      value={form.year}
                      onChange={(event) => update('year', event.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                    >
                      <option value="">اختر السنة</option>
                      {availableYears.map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="🏛️ المحكمة الابتدائية *">
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={courtSearchTerm}
                          onChange={(e) => setCourtSearchTerm(e.target.value)}
                          placeholder="🔍 ابحث عن اسم المدينة أو المحكمة..."
                          className="w-full border border-slate-300 bg-slate-50/80 rounded-xl pr-3 pl-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none transition font-medium"
                        />
                        {courtSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setCourtSearchTerm('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            title="مسح البحث"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <select
                        value={form.court}
                        onChange={(event) => handleCourtChange(event.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white text-slate-900 font-bold focus:ring-2 focus:ring-[#7A0D1A]/20 focus:border-[#7A0D1A] outline-none"
                      >
                        <option value="">
                          {filteredCourts.length === primaryCourts.length
                            ? 'اختر المحكمة الابتدائية'
                            : `نتائج البحث (${filteredCourts.length} محكمة)`}
                        </option>
                        {filteredCourts.map((court: string) => (
                          <option key={court} value={court}>
                            {court}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  <NotaryField
                    label="👨‍⚖️ الاسم الكامل للعدل الأول *"
                    field="firstNotary"
                    value={form.firstNotary}
                    courtSelected={Boolean(form.court)}
                    activeField={activeNotaryField}
                    matches={firstNotaryMatches}
                    isSearching={isSearchingRemote && firstNotaryMatches.length === 0}
                    onChange={(value) => update('firstNotary', value)}
                    onFocus={() => setActiveNotaryField('firstNotary')}
                    onSelect={(name) => {
                      update('firstNotary', name);
                      const matched = combinedNotaryPool.find((n) => n.full_name === name);
                      if (matched) {
                        setSelectedNotaryIds([matched.id]);
                      }
                      setActiveNotaryField(null);
                    }}
                  />

                  <NotaryField
                    label="👨‍⚖️ العدل الثاني (إن وجد)"
                    field="secondNotary"
                    value={form.secondNotary}
                    courtSelected={Boolean(form.court)}
                    activeField={activeNotaryField}
                    matches={secondNotaryMatches}
                    isSearching={isSearchingRemote && secondNotaryMatches.length === 0}
                    onChange={(value) => update('secondNotary', value)}
                    onFocus={() => setActiveNotaryField('secondNotary')}
                    onSelect={(name) => {
                      update('secondNotary', name);
                      const matched = combinedNotaryPool.find((n) => n.full_name === name);
                      if (matched) {
                        setSelectedNotaryIds((prev) => {
                          const firstId = prev[0];
                          return firstId && firstId !== matched.id ? [firstId, matched.id] : [matched.id];
                        });
                      }
                      setActiveNotaryField(null);
                    }}
                  />

                  <div className="md:col-span-2 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <strong>لا تتذكر السنة أو اسم العدلين؟</strong> يمكنكم متابعة الطلب بالمعلومات المتوفرة، وستساعد الجهة المختصة في تضييق نطاق البحث واستخراج النسخة.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: LEGAL CAPACITY */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ما هي صفتكم بالنسبة إلى الرسم المطلوب؟
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    اختر الصفة التي تخول لكم قانوناً الحصول على نسخة من الرسم:
                  </p>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {capacitiesWithIcons.map((cap) => {
                    const isSelected = form.capacity === cap.label;
                    return (
                      <div
                        key={cap.label}
                        onClick={() => update('capacity', cap.label)}
                        className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'border-[#7A0D1A] bg-red-50/50 shadow-md ring-2 ring-[#7A0D1A]/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="text-2xl p-2 rounded-xl bg-white border border-slate-100 shadow-sm shrink-0">
                          {cap.icon}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-black text-xs text-slate-900 flex items-center justify-between">
                            <span>{cap.label}</span>
                            {isSelected && <span className="text-[#7A0D1A] text-[10px] font-black">● مختار</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{cap.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {form.capacity && (
                  <div className="space-y-6 pt-2">
                    {form.capacity === 'وكيل' && (
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
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateAgentProof(idx, 'docFile', file.name);
                                      const url = await readFileAsDataURL(file);
                                      updateAgentProof(idx, 'docUrl', url);
                                    }
                                  }}
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

                    {form.capacity === 'ذوو الحقوق / أحد الورثة' && (
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
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateHeirProof(idx, 'docFile', file.name);
                                      const url = await readFileAsDataURL(file);
                                      updateHeirProof(idx, 'docUrl', url);
                                    }
                                  }}
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

                    {(form.capacity === 'الغير' || form.capacity === 'غرض إداري') && (
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
                                <label className="block text-xs font-black text-slate-700 mb-2">ما الذي يثبت مصلحتكم في الحصول على النسخة؟</label>
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
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateThirdPartyProof(idx, 'proofDocFile', file.name);
                                      const url = await readFileAsDataURL(file);
                                      updateThirdPartyProof(idx, 'proofDocUrl', url);
                                    }
                                  }}
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

                    {['أحد أطراف الرسم', 'ولي', 'شاهد'].includes(form.capacity) && (
                      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/80 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-black text-sm">
                              <span>✓</span>
                              <span>تأكيد الصفة المباشرة والمرفقات:</span>
                            </div>
                            <p className="text-xs leading-relaxed text-emerald-900">
                              بصفتكم {form.capacity}، يرجى إرفاق الوثيقة المثبتة لهويتكم أو صفتكم:
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
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updatePartyProof(idx, 'docFile', file.name);
                                      const url = await readFileAsDataURL(file);
                                      updatePartyProof(idx, 'docUrl', url);
                                    }
                                  }}
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

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                      <div className="font-black text-slate-900 flex items-center gap-1">
                        <span>⚖️</span>
                        <span>ملاحظة مسطرية:</span>
                      </div>
                      <p className="leading-relaxed">
                        تخضع صحة المبررات والمرفقات للفحص القانوني والتحقق من الصفة من قِبل العدل المكلف والقاضي المشرف على التوثيق وفق مقتضيات القانون رقم 51.26.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: REQUESTER IDENTITY */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-5 space-y-2 text-blue-950">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <span>🪪</span>
                    <span>بيانات هوية مقدم الطلب للتواصل والمتابعة</span>
                  </h3>
                  <p className="text-xs leading-relaxed text-blue-900">
                    أدخل معلوماتك الشخصية بدقة ليتمكن العدل من التحقق من صفتك والتواصل معك فور جاهزية النسخة.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="الاسم الشخصي *">
                    <input
                      placeholder="مثال: كريم"
                      value={form.firstName}
                      onChange={(event) => update('firstName', event.target.value)}
                    />
                  </Field>
                  <Field label="الاسم العائلي *">
                    <input
                      placeholder="مثال: العلمي"
                      value={form.lastName}
                      onChange={(event) => update('lastName', event.target.value)}
                    />
                  </Field>
                  <Field label="نوع وثيقة التعريف">
                    <select value={form.identityType} onChange={(event) => update('identityType', event.target.value)}>
                      <option>البطاقة الوطنية</option>
                      <option>جواز السفر</option>
                      <option>وثيقة تعريف أخرى</option>
                    </select>
                  </Field>
                  <Field label="رقم وثيقة التعريف *">
                    <input
                      placeholder="مثال: CD123456"
                      value={form.identityNumber}
                      onChange={(event) => update('identityNumber', event.target.value)}
                      className="font-mono"
                    />
                  </Field>
                  <Field label="رقم الهاتف (للتواصل والواتساب) *">
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="06XXXXXXXX"
                      value={form.phone}
                      onChange={(event) => update('phone', event.target.value)}
                      className="font-mono text-right"
                    />
                  </Field>
                  <Field label="البريد الإلكتروني">
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(event) => update('email', event.target.value)}
                      className="font-mono text-right"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="العنوان السكني">
                      <input
                        placeholder="المدينة، الحي، الشارع..."
                        value={form.address}
                        onChange={(event) => update('address', event.target.value)}
                      />
                    </Field>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span>🔐</span>
                    <span>حماية المعطيات الشخصية:</span>
                  </div>
                  <p className="leading-relaxed">
                    تُعالج هذه المعطيات وفق الضوابط القانونية لحماية المعطيات ذات الطابع الشخصي، وتُستعمل حصرياً لأغراض معالجة طلب النسخة العدلية.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: PURPOSE */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ما هو الغرض من طلب استخراج النسخة العدلية؟
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    يرجى تحديد السبب الرئيسي الذي تستندون إليه في طلب الحصول على النسخة:
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {purposesWithIcons.map((p) => {
                    const isSelected = form.purpose === p.label;
                    return (
                      <label
                        key={p.label}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#7A0D1A] bg-red-50/50 shadow-md ring-2 ring-[#7A0D1A]/10 text-[#7A0D1A]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <input
                          type="radio"
                          name="purpose"
                          checked={isSelected}
                          onChange={() => update('purpose', p.label)}
                          className="h-4 w-4 text-[#7A0D1A] hidden"
                        />
                        <span className="text-xs font-bold flex-1">{p.label}</span>
                        {isSelected && <span className="text-xs font-black text-[#7A0D1A]">✓</span>}
                      </label>
                    );
                  })}
                </div>

                {form.purpose === 'سبب آخر' && (
                  <Field label="يرجى توضيح سبب الطلب بالتفصيل">
                    <textarea
                      placeholder="اكتب هنا سبب طلب النسخة..."
                      rows={3}
                      value={form.otherPurpose}
                      onChange={(event) => update('otherPurpose', event.target.value)}
                    />
                  </Field>
                )}
              </div>
            )}

            {/* STEP 4: DEED REFERENCES */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    معلومات ومراجع رسم التضمين
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    اختر نوع الرسم وأدخل مراجع الدفتر والتضمين (إن توفرت لديك):
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Field label="نوع الرسم العدلي *">
                      <select
                        value={form.deedType}
                        onChange={(event) => handleDeedTypeChange(event.target.value)}
                        className="font-bold"
                      >
                        <option value="">-- اختر نوع الرسم --</option>
                        {deedCategories.map((category) => (
                          <optgroup key={category.label} label={category.label}>
                            {category.types.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="حامل تضمين سجل">
                      <input
                        value={form.deedCategory.replace(/^رسوم\s*/, '')}
                        disabled
                        placeholder="يحدد تلقائياً بعد الاختيار"
                        className="bg-slate-100 text-slate-600 font-bold"
                      />
                    </Field>
                  </div>

                  <Field label="رقم الدفتر">
                    <input
                      placeholder="مثال: 14"
                      value={form.number}
                      onChange={(event) => update('number', event.target.value)}
                      className="font-mono"
                    />
                  </Field>

                  <Field label="حرف السجل">
                    <input
                      placeholder="مثال: أ"
                      value={form.letter}
                      onChange={(event) => update('letter', event.target.value)}
                    />
                  </Field>

                  <Field label="رقم الصحيفة">
                    <input
                      placeholder="مثال: 85"
                      value={form.page}
                      onChange={(event) => update('page', event.target.value)}
                      className="font-mono"
                    />
                  </Field>

                  <Field label="عدد الرسم">
                    <input
                      placeholder="مثال: 240"
                      value={form.count}
                      onChange={(event) => update('count', event.target.value)}
                      className="font-mono"
                    />
                  </Field>

                  <Field label="تاريخ التضمين">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => update('date', event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & FINAL SUBMISSION */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Summary
                    title="معلومات الرسم"
                    icon="📜"
                    values={[form.year, form.court, form.deedType, form.number ? `دفتر ${form.number}` : '']}
                  />
                  <Summary
                    title="صفة وبيانات مقدم الطلب"
                    icon="🪪"
                    values={[form.capacity, `${form.firstName} ${form.lastName}`, form.identityNumber, form.phone]}
                  />
                  <Summary
                    title="سبب وغرض الطلب"
                    icon="🎯"
                    values={[form.purpose === 'سبب آخر' ? form.otherPurpose : form.purpose]}
                  />
                </div>

                {/* Notary Direction / Selection */}
                {isHistoricalRequest ? (
                  <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <span>🗺️</span>
                          <span>توجيه الطلب إلى عدول الدائرة المختصة</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          اختاروا عدلاً واحداً على الأقل، وعدلين على الأكثر، ضمن المحكمة الابتدائية المختارة ({form.court}):
                        </p>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                        تم اختيار {selectedNotaryIds.length} من 2
                      </span>
                    </div>

                    <GoogleMapSelector onLocationSelect={() => undefined} cityCounts={[]} focusLocation={form.court} />

                    <div className="grid gap-3 sm:grid-cols-2 pt-2">
                      {courtNotaryMatches.map((notary) => {
                        const isSelected = selectedNotaryIds.includes(notary.id);
                        return (
                          <button
                            key={notary.id}
                            type="button"
                            onClick={() => toggleNotary(notary.id)}
                            className={`flex items-center gap-3 border-2 p-3.5 text-right text-xs font-bold rounded-2xl transition shadow-sm ${
                              isSelected
                                ? 'border-[#7A0D1A] bg-red-50 text-[#7A0D1A] ring-2 ring-[#7A0D1A]/10'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#7A0D1A] text-white font-bold">
                              {notary.photo_url ? (
                                <img src={notary.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                notary.full_name.trim().charAt(0)
                              )}
                            </span>
                            <div className="flex-1">
                              <div className="font-black text-sm text-slate-900">{notary.full_name}</div>
                              {notary.phone && (
                                <div className="text-[11px] font-normal text-slate-500 font-mono" dir="ltr">
                                  {notary.phone}
                                </div>
                              )}
                            </div>
                            {isSelected && <span className="text-sm font-black text-[#7A0D1A]">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {!isLoadingCourtNotaries && !courtNotaryMatches.length && (
                      <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200">
                        لا يوجد عدول مسجلون لهذه المحكمة حالياً. يرجى التواصل مع قسم قضاء التوثيق بالمحكمة.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-bold text-emerald-950 flex items-center gap-3">
                    <span className="text-2xl">👨‍⚖️</span>
                    <span>
                      سيتم توجيه الطلب مباشرة إلى الصندوق المهني للأستاذ: <strong>{form.firstNotary}</strong>
                      {form.secondNotary ? ` والأستاذ ${form.secondNotary}` : ''}.
                    </span>
                  </div>
                )}

                {/* Communication Channel Preference */}
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <span>📬</span>
                      <span>كيف تفضلون التواصل مع العدل ومتابعة طلبكم؟</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      يمكنكم اختيار الطريقة الأنسب لكم لمتابعة دراسة وإنجاز طلب النسخة العدلية:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Professional Inbox */}
                    <div
                      onClick={() => setCommunicationChannel('inbox')}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition text-right relative ${
                        communicationChannel === 'inbox'
                          ? 'border-[#7A0D1A] bg-red-50/40 shadow-md ring-2 ring-[#7A0D1A]/20'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🏛️</span>
                        <span className="rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[10px] font-black">
                          🟢 موصى به
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900">1. الصندوق المهني للعدل</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        إرسال الطلب مباشرة إلى الصندوق المهني الموثق للعدل داخل التطبيق للاطلاع عليه ومراسلتكم رسمياً.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="radio"
                          name="comm_channel"
                          checked={communicationChannel === 'inbox'}
                          onChange={() => setCommunicationChannel('inbox')}
                          className="h-4 w-4 text-[#7A0D1A]"
                        />
                        <span className="text-xs font-bold text-[#7A0D1A]">
                          إرسال إلى الصندوق المهني (ملف رسمي)
                        </span>
                      </div>
                    </div>

                    {/* 2. Direct WhatsApp */}
                    <div
                      onClick={() => setCommunicationChannel('whatsapp')}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition text-right relative ${
                        communicationChannel === 'whatsapp'
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">💬</span>
                        <span className="rounded-full bg-emerald-200 text-emerald-950 px-2.5 py-0.5 text-[10px] font-black">
                          تواصل مباشر
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900">2. التواصل عبر WhatsApp</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        فتح محادثة WhatsApp مباشرة وفورية مع العدل مع إدراج رقم طلبكم ومعطيات الرسم آلياً.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="radio"
                          name="comm_channel"
                          checked={communicationChannel === 'whatsapp'}
                          onChange={() => setCommunicationChannel('whatsapp')}
                          className="h-4 w-4 text-emerald-600"
                        />
                        <span className="text-xs font-bold text-emerald-800">
                          التواصل المباشر عبر WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acknowledgement Checkbox */}
                <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[#7A0D1A] focus:ring-[#7A0D1A]"
                  />
                  <span>
                    أشهد بصحة البيانات المدلى بها في هذا الطلب ومسؤوليتي القانونية عنها، وأعلم أن استخراج النسخة يخضع للشروط القانونية المعمول بها.
                  </span>
                </label>

                {submissionError && (
                  <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                    {submissionError}
                  </p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="px-5 py-3 text-xs font-black text-slate-600 disabled:opacity-30 rounded-xl hover:bg-slate-100 transition"
              >
                السابق
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  disabled={!canContinue()}
                  onClick={() => setStep((current) => current + 1)}
                  className="bg-[#7A0D1A] px-6 py-3 text-xs font-black text-white rounded-xl shadow-md disabled:cursor-not-allowed disabled:opacity-40 transition hover:bg-[#600a14]"
                >
                  التالي ➔
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!accepted || createRequestMutation.isPending}
                  className="bg-[#7A0D1A] px-7 py-3.5 text-xs font-black text-white rounded-xl shadow-lg disabled:cursor-not-allowed disabled:opacity-40 transition hover:bg-[#600a14] flex items-center gap-2"
                >
                  <span>🚀</span>
                  <span>
                    {createRequestMutation.isPending ? 'جاري تسجيل الطلب...' : 'تأكيد وإرسال الطلب'}
                  </span>
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs font-black text-slate-800">{label}</span>
      <div className="[&>input]:w-full [&>input]:border [&>input]:border-slate-300 [&>input]:rounded-xl [&>input]:px-4 [&>input]:py-3 [&>input]:text-sm [&>input]:bg-white [&>input]:text-slate-900 [&>input]:outline-none [&>input]:focus:border-[#7A0D1A] [&>input]:focus:ring-2 [&>input]:focus:ring-[#7A0D1A]/20 [&>select]:w-full [&>select]:border [&>select]:border-slate-300 [&>select]:rounded-xl [&>select]:px-4 [&>select]:py-3 [&>select]:text-sm [&>select]:bg-white [&>select]:text-slate-900 [&>select]:outline-none [&>select]:focus:border-[#7A0D1A] [&>select]:focus:ring-2 [&>select]:focus:ring-[#7A0D1A]/20 [&>textarea]:w-full [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:rounded-xl [&>textarea]:p-3 [&>textarea]:text-sm [&>textarea]:bg-white [&>textarea]:text-slate-900 [&>textarea]:outline-none [&>textarea]:focus:border-[#7A0D1A] [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-[#7A0D1A]/20">
        {children}
      </div>
    </label>
  );
}

function Summary({ title, icon, values }: { title: string; icon?: string; values: (string | undefined)[] }) {
  const filtered = values.filter(Boolean);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-1.5 text-slate-800">
      <div className="font-black text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
        {icon && <span>{icon}</span>}
        <span>{title}</span>
      </div>
      {filtered.map((val, idx) => (
        <div key={idx} className="font-bold text-slate-700 truncate">{val}</div>
      ))}
    </div>
  );
}

function NotaryField({
  label,
  value,
  field,
  courtSelected,
  activeField,
  matches,
  isSearching,
  onChange,
  onFocus,
  onSelect,
}: {
  label: string;
  value: string;
  field: 'firstNotary' | 'secondNotary';
  courtSelected: boolean;
  activeField: 'firstNotary' | 'secondNotary' | null;
  matches: { id: string; full_name: string; phone?: string | null; address?: string | null; photo_url?: string | null; primary_court?: string | null }[];
  isSearching: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (name: string) => void;
}) {
  const isActive = activeField === field;

  return (
    <div className="relative">
      <Field label={label}>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder="ابحث بالاسم الشخصي أو العائلي للعدل"
        />
      </Field>

      {isActive && courtSelected && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {matches.length ? (
            matches.map((notary) => (
              <button
                key={notary.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(notary.full_name);
                }}
                className="w-full rounded-xl p-2.5 text-right text-xs hover:bg-slate-50 transition flex items-center justify-between border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#7A0D1A]/10 border border-slate-200 shrink-0 flex items-center justify-center text-sm font-black text-[#7A0D1A]">
                    {notary.photo_url ? (
                      <img src={notary.photo_url} alt={notary.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span>👨‍⚖️</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-xs">{notary.full_name}</div>
                    {notary.primary_court && (
                      <div className="text-[11px] text-slate-500 font-medium">{notary.primary_court}</div>
                    )}
                  </div>
                </div>

                {notary.phone && (
                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg" dir="ltr">
                    {notary.phone}
                  </span>
                )}
              </button>
            ))
          ) : isSearching ? (
            <div className="p-3 text-center text-xs text-slate-500 font-bold">جاري البحث عن العدول...</div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              {value.trim().length >= 2
                ? 'لم يتم العثور على عدل مطابق في هذه المحكمة. يمكنك متابعة كتابة الاسم يدوياً.'
                : 'ابدأ بكتابة اسم العدل للبحث...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}