import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Eye,
  FileCheck,
  FileText,
  Filter,
  FolderOpen,
  Hash,
  Link2,
  Lock,
  Plus,
  Printer,
  Search,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  MessageSquare,
  Paperclip,
  User,
  X,
} from 'lucide-react';

type RegistryTypeKey = 'marriage' | 'divorce' | 'property' | 'inheritance' | 'other';
type RegistryStatus = 'OPEN' | 'NEAR_FULL' | 'CRITICAL' | 'CLOSED';
type EntryStatus = 'ARCHIVED' | 'FINAL_SECURED';

type RegistryTypeMeta = {
  key: RegistryTypeKey;
  label: string;
  icon: string;
  badge: string;
};

type LetterConfig = {
  letter: string;
  active: boolean;
  description: string;
};

type RegistryRecord = {
  id: string;
  type: RegistryTypeKey;
  registerNumber: number;
  letter: string;
  currentCount: number;
  maxEntries: number;
  startDate: string;
  closeDate?: string;
};

type RegistryEntry = {
  id: string;
  registryId: string;
  nationalId: string;
  fileNumber: string;
  deedType: string;
  registryType: RegistryTypeKey;
  letter: string;
  parties: string[];
  notaries: string[];
  judgeName?: string | null;
  judgeNotes?: string | null;
  judgeAttachments?: Array<{
    name: string;
    url: string;
    mimeType?: string | null;
    category?: string | null;
  }>;
  dateGregorian: string;
  dateHijri: string;
  status: EntryStatus;
  previewUrl?: string | null;
  previewName?: string | null;
  previewMimeType?: string | null;
  inclusionReference?: {
    heading: string;
    descriptor: string;
    registerNumber: number;
    registryLetter: string;
    inclusionNumber: number | null;
    registryPage: string | null;
    gregorianDate: string | null;
    hijriDate: string | null;
  };
  sentToNotary?: boolean;
  sentToNotaryAt?: string | null;
};

const REGISTRY_TYPES: RegistryTypeMeta[] = [
  { key: 'marriage', label: 'الزواج', icon: '💍', badge: 'زواج' },
  { key: 'divorce', label: 'الطلاق', icon: '📜', badge: 'طلاق' },
  { key: 'property', label: 'الأملاك', icon: '🏠', badge: 'أملاك' },
  { key: 'inheritance', label: 'التركات', icon: '⚖', badge: 'تركات' },
  { key: 'other', label: 'باقي الوثائق', icon: '📁', badge: 'وثائق' },
];

const INITIAL_LETTERS: LetterConfig[] = [
  { letter: 'أ', active: true, description: 'الحرف المعتمد الأول' },
  { letter: 'ب', active: true, description: 'الحرف المعتمد الثاني' },
  { letter: 'ث', active: true, description: 'الحرف المعتمد الثالث' },
  { letter: 'ج', active: true, description: 'الحرف المعتمد الرابع' },
  { letter: 'د', active: true, description: 'الحرف المعتمد الخامس' },
  { letter: 'هـ', active: true, description: 'الحرف المعتمد السادس' },
  { letter: 'و', active: false, description: 'احتياطي' },
];

const getRegistryMeta = (type: RegistryTypeKey) =>
  REGISTRY_TYPES.find((item) => item.key === type) || REGISTRY_TYPES[4];

const getRegistryStatus = (currentCount: number, maxEntries: number): RegistryStatus => {
  const ratio = currentCount / Math.max(1, maxEntries);
  if (currentCount >= maxEntries) return 'CLOSED';
  if (ratio >= 0.9) return 'CRITICAL';
  if (ratio >= 0.7) return 'NEAR_FULL';
  return 'OPEN';
};

const formatRegistryLabel = (registry: Pick<RegistryRecord, 'registerNumber' | 'letter' | 'type'>) => {
  const meta = getRegistryMeta(registry.type);
  return `${meta.icon} سجل ${registry.registerNumber} / ${registry.letter}`;
};

const statusConfig: Record<RegistryStatus, { label: string; tone: string; bar: string }> = {
  OPEN: { label: 'نشط', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  NEAR_FULL: { label: 'أكثر من 70%', tone: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
  CRITICAL: { label: 'أكثر من 90%', tone: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  CLOSED: { label: 'مغلق', tone: 'bg-slate-900 text-white border-slate-800', bar: 'bg-slate-900' },
};

const entryStatusConfig: Record<EntryStatus, { label: string; tone: string }> = {
  ARCHIVED: { label: 'مؤرشف', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  FINAL_SECURED: { label: 'مؤمن نهائياً', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const DATE_PRESETS = [
  { label: 'شهر', months: 1 },
  { label: '3 أشهر', months: 3 },
  { label: '6 أشهر', months: 6 },
  { label: 'سنة', months: 12 },
];

const parseSmartSearch = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return { type: null as RegistryTypeKey | null, letter: '', number: '', text: '' };
  const type = REGISTRY_TYPES.find((item) => normalized.includes(item.label))?.key || null;
  const letter = (normalized.match(/\b[أبثجدهـو]\b/u)?.[0] || '').trim();
  const number = (normalized.match(/\d+/)?.[0] || '').trim();
  return {
    type,
    letter,
    number,
    text: normalized,
  };
};

const formatDateRangeCutoff = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
};

const inferRegistryTypeFromCategory = (value: string): RegistryTypeKey => {
  if (value.includes('زواج')) return 'marriage';
  if (value.includes('طلاق')) return 'divorce';
  if (value.includes('ملك') || value.includes('أملاك')) return 'property';
  if (value.includes('تركة') || value.includes('تركات')) return 'inheritance';
  return 'other';
};

const formatInclusionDescriptor = (entry: RegistryEntry) => {
  const raw = String(entry.inclusionReference?.descriptor || '').trim();
  if (!raw) return 'غير متوفر';
  return raw
    .replace(/^سجل بسجل\s*/u, '')
    .replace(/\s*حرف\s+[^\s]+$/u, '')
    .trim();
};

const formatInclusionLetter = (entry: RegistryEntry) =>
  String(entry.inclusionReference?.registryLetter || entry.letter || '—').trim();

const formatNotaryLabel = (value: string) =>
  String(value || '')
    .replace(/^العدل محرر الرسم\s*/u, '')
    .replace(/^العدل\s*/u, '')
    .trim();

export const JudgeFinalArchiving: React.FC = () => {
  const { sessionToken } = useAuth();
  const [letters, setLetters] = useState<LetterConfig[]>(INITIAL_LETTERS);
  const [selectedType, setSelectedType] = useState<RegistryTypeKey>('marriage');
  const [selectedRegistryId, setSelectedRegistryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showLettersModal, setShowLettersModal] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [insertType, setInsertType] = useState<RegistryTypeKey>('marriage');
  const [insertLetter, setInsertLetter] = useState('أ');
  const [generatedInsert, setGeneratedInsert] = useState<{
    registryId: string;
    registerNumber: number;
    descriptor: string;
    count: number;
    hijriDate: string;
    gregorianDate: string;
  } | null>(null);
  const [insertNotice, setInsertNotice] = useState<string | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [statsRange, setStatsRange] = useState('all');
  const [statsFrom, setStatsFrom] = useState('');
  const [statsTo, setStatsTo] = useState('');
  const [statsType, setStatsType] = useState<'all' | RegistryTypeKey>('all');
  const [statsLetter, setStatsLetter] = useState<'all' | string>('all');
  const [statsNotary, setStatsNotary] = useState<'all' | string>('all');
  const [activeEntry, setActiveEntry] = useState<RegistryEntry | null>(null);
  const [activeEntryMode, setActiveEntryMode] = useState<'view' | 'original'>('view');
  const [activeSupportEntry, setActiveSupportEntry] = useState<RegistryEntry | null>(null);
  const [incomingJudicialDeed, setIncomingJudicialDeed] = useState<null | {
    deedId: string;
    serialNumber: string;
    category: string;
    city: string;
    inferredType: RegistryTypeKey;
  }>(null);
  const archiveQuery = trpc.judge.listFinalArchivingRecords.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, staleTime: 60_000, refetchOnWindowFocus: false, refetchOnMount: false }
  );
  const sendToNotaryPortalMutation = trpc.judge.sendFinalArchivedToNotaryPortal.useMutation({
    onSuccess: async () => {
      await archiveQuery.refetch();
    },
  });
  const generateInclusionMutation = trpc.judge.generateInclusionReference.useMutation();
  const saveInclusionMutation = trpc.judge.saveInclusionReference.useMutation();
  const registries = (archiveQuery.data?.registries ?? []) as RegistryRecord[];
  const entries = (archiveQuery.data?.entries ?? []) as RegistryEntry[];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'judicial-speech') return;
    const deedId = params.get('deedId') || '';
    if (!deedId) return;
    const category = params.get('category') || 'رسم غير مصنف';
    const inferredType = inferRegistryTypeFromCategory(category);
    setIncomingJudicialDeed({
      deedId,
      serialNumber: params.get('serialNumber') || '',
      category,
      city: params.get('city') || 'الرباط',
      inferredType,
    });
    setSelectedType(inferredType);
  }, []);

  const selectedRegistry = useMemo(
    () => registries.find((registry) => registry.id === selectedRegistryId) || null,
    [registries, selectedRegistryId]
  );

  const smartSearch = useMemo(() => parseSmartSearch(searchQuery), [searchQuery]);

  const filteredRegistries = useMemo(() => {
    return registries
      .filter((registry) => registry.type === selectedType)
      .filter((registry) => {
        if (!globalSearch.trim()) return true;
        const text = `${registry.registerNumber} ${registry.letter} ${getRegistryMeta(registry.type).label}`.toLowerCase();
        return text.includes(globalSearch.trim().toLowerCase());
      })
      .sort((a, b) => a.registerNumber - b.registerNumber || a.letter.localeCompare(b.letter, 'ar'));
  }, [registries, selectedType, globalSearch]);

  const detailEntries = useMemo(() => {
    if (!selectedRegistry) return [];
    return entries
      .filter((entry) => entry.registryId === selectedRegistry.id)
      .filter((entry) => {
        if (!searchQuery.trim()) return true;
        const haystack = [
          entry.nationalId,
          entry.fileNumber,
          entry.deedType,
          entry.letter,
          entry.inclusionReference?.heading,
          entry.inclusionReference?.descriptor,
          String(entry.inclusionReference?.registerNumber ?? ''),
          entry.inclusionReference?.registryLetter,
          String(entry.inclusionReference?.inclusionNumber ?? ''),
          entry.inclusionReference?.registryPage,
          entry.inclusionReference?.hijriDate,
          entry.inclusionReference?.gregorianDate,
          getRegistryMeta(entry.registryType).label,
          ...entry.parties,
          ...entry.notaries,
        ]
          .join(' ')
          .toLowerCase();

        const textMatch = haystack.includes(smartSearch.text.toLowerCase());
        const typeMatch = !smartSearch.type || entry.registryType === smartSearch.type;
        const letterMatch = !smartSearch.letter || entry.letter === smartSearch.letter;
        const numberMatch = !smartSearch.number || entry.fileNumber.includes(smartSearch.number) || entry.nationalId.includes(smartSearch.number);
        return textMatch || (typeMatch && letterMatch && numberMatch);
      });
  }, [entries, selectedRegistry, searchQuery, smartSearch]);

  const summaryStats = useMemo(() => {
    const typeCounts = REGISTRY_TYPES.reduce<Record<RegistryTypeKey, number>>((acc, type) => {
      acc[type.key] = entries.filter((entry) => entry.registryType === type.key).length;
      return acc;
    }, {} as Record<RegistryTypeKey, number>);
    return {
      openRegistries: registries.filter((item) => getRegistryStatus(item.currentCount, item.maxEntries) === 'OPEN').length,
      closedRegistries: registries.filter((item) => getRegistryStatus(item.currentCount, item.maxEntries) === 'CLOSED').length,
      totalArchived: entries.length,
      dailyAverage: Math.round(entries.length / 31),
      typeCounts,
    };
  }, [entries, registries]);

  const availableNotaries = useMemo(() => {
    return Array.from(new Set(entries.flatMap((entry) => entry.notaries))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [entries]);

  const statsEntries = useMemo(() => {
    const cutoff = statsRange === 'all'
      ? null
      : formatDateRangeCutoff(Number(statsRange));

    return entries.filter((entry) => {
      if (statsType !== 'all' && entry.registryType !== statsType) return false;
      if (statsLetter !== 'all' && entry.letter !== statsLetter) return false;
      if (statsNotary !== 'all' && !entry.notaries.includes(statsNotary)) return false;
      if (cutoff && entry.dateGregorian < cutoff) return false;
      if (statsFrom && entry.dateGregorian < statsFrom) return false;
      if (statsTo && entry.dateGregorian > statsTo) return false;
      return true;
    });
  }, [entries, statsType, statsLetter, statsNotary, statsRange, statsFrom, statsTo]);

  const statsByType = useMemo(() => {
    return REGISTRY_TYPES.map((type) => ({
      ...type,
      count: statsEntries.filter((entry) => entry.registryType === type.key).length,
    }));
  }, [statsEntries]);

  const statsByNotary = useMemo(() => {
    return availableNotaries.map((notary) => ({
      notary,
      count: statsEntries.filter((entry) => entry.notaries.includes(notary)).length,
    }));
  }, [availableNotaries, statsEntries]);

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue(null), 1400);
    } catch {
      setCopiedValue(null);
    }
  };

  const buildEntryReferenceText = (entry: RegistryEntry) => {
    return [
      `المرجع: ${entry.fileNumber}`,
      `المعرف القضائي / ID: ${entry.nationalId}`,
      `النوع: ${entry.deedType}`,
      `مرجع التضمين: ${formatInclusionDescriptor(entry)}`,
      `رقم السجل: ${entry.inclusionReference?.registerNumber ?? '---'}`,
      `الحرف: ${formatInclusionLetter(entry)}`,
      `عدد التضمين: ${entry.inclusionReference?.inclusionNumber ?? '---'}`,
      ...(entry.inclusionReference?.registryPage ? [`الصحيفة: ${entry.inclusionReference.registryPage}`] : []),
      `الأطراف: ${entry.parties.join(' + ')}`,
      `العدلان: ${entry.notaries.map(formatNotaryLabel).filter(Boolean).join(' - ')}`,
      `التاريخ الهجري: ${entry.inclusionReference?.hijriDate || entry.dateHijri}`,
      `التاريخ الميلادي: ${entry.inclusionReference?.gregorianDate || entry.dateGregorian}`,
    ].join('\n');
  };

  const handlePrintEntry = (entry: RegistryEntry) => {
    if (entry.previewUrl && typeof window !== 'undefined') {
      const printWindow = window.open(entry.previewUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) return;
    }
    if (typeof window === 'undefined') return;
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;
    const body = `
      <html dir="rtl" lang="ar">
        <head>
          <title>${entry.fileNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin-bottom: 16px; }
            .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 24px; }
            .row { margin: 10px 0; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>نسخة مرجعية للرسم المؤرشف</h1>
          <div class="card">
            ${buildEntryReferenceText(entry).split('\n').map((line) => `<div class="row">${line}</div>`).join('')}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    popup.document.open();
    popup.document.write(body);
    popup.document.close();
  };

  const handleShareEntry = async (entry: RegistryEntry, mode: 'share' | 'send') => {
    const text = buildEntryReferenceText(entry);
    if (mode === 'share' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `الرسم ${entry.fileNumber}`,
          text,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    if (mode === 'send') {
      if (!sessionToken) return;
      const result = await sendToNotaryPortalMutation.mutateAsync({
        sessionToken,
        signedDeedId: entry.id,
      });
      setCopiedValue(
        (result as any)?.alreadySent
          ? `تم التحقق: ${entry.fileNumber} مُرسل سابقاً إلى الرسوم المخاطب عليها`
          : `تم إرسال ${entry.fileNumber} إلى الرسوم المخاطب عليها`
      );
      window.setTimeout(() => setCopiedValue(null), 1800);
      return;
    }

    await copyValue(text);
  };

  const openEntryDocument = (entry: RegistryEntry, mode: 'view' | 'original') => {
    if (entry.previewUrl && typeof window !== 'undefined') {
      if (mode === 'original') {
        window.open(entry.previewUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setActiveEntry(entry);
      setActiveEntryMode(mode);
      return;
    }
    setActiveEntry(entry);
    setActiveEntryMode(mode);
  };

  const openRegistry = (registry: RegistryRecord) => {
    setSelectedRegistryId(registry.id);
  };

  const activeLetters = useMemo(() => letters.filter((letter) => letter.active), [letters]);

  const generateInsertionReference = async () => {
    if (!incomingJudicialDeed?.deedId || !sessionToken) {
      setInsertError('الإدراج الحقيقي متاح للرسم المحول من رواق الخطاب القضائي فقط.');
      return;
    }
    const activeTargetLetter = letters.find((item) => item.letter === insertLetter && item.active);
    if (!activeTargetLetter) {
      setInsertError('يرجى اختيار حرف نشط أولاً.');
      return;
    }

    try {
      const res = await generateInclusionMutation.mutateAsync({
        sessionToken,
        id: incomingJudicialDeed.deedId,
        registryType: insertType,
        registryLetter: insertLetter,
      });
      setGeneratedInsert({
        registryId: `${insertType}-${res.registerNumber}-${insertLetter}`,
        registerNumber: res.registerNumber,
        descriptor: `${getRegistryMeta(insertType).label} / الحرف ${insertLetter}`,
        count: res.inclusionNumber,
        hijriDate: res.hijriDate,
        gregorianDate: res.gregorianDate,
      });
      setInsertNotice(`💡 سيتم الإدراج في: سجل ${getRegistryMeta(insertType).label} / الحرف ${insertLetter}`);
      setInsertError(null);
    } catch (error: any) {
      setInsertError(error?.message || 'تعذر توليد رقم التضمين.');
    }
  };

  const insertDeedIntoRegistry = async () => {
    if (!generatedInsert) {
      setInsertError('يرجى توليد رقم التضمين أولاً.');
      return;
    }

    if (!incomingJudicialDeed?.deedId || !sessionToken) {
      setInsertError('لا يوجد رسم محول حاليًا لإدراجه داخل السجل.');
      return;
    }

    try {
      await saveInclusionMutation.mutateAsync({
        sessionToken,
        id: incomingJudicialDeed.deedId,
        registryType: insertType,
        registryLetter: insertLetter,
      });
      await archiveQuery.refetch();
      setSearchQuery('');
      setShowInsertModal(false);
      setGeneratedInsert(null);
      setInsertNotice(null);
      setInsertError(null);
      setIncomingJudicialDeed(null);
    } catch (error: any) {
      setInsertError(error?.message || 'تعذر حفظ الرسم داخل السجل.');
    }
  };

  const StatusBadge = ({ status }: { status: RegistryStatus }) => {
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black ${config.tone}`}>
        {status === 'CLOSED' ? <Lock className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
        {config.label}
      </span>
    );
  };

  return (
    <div
      className="min-h-screen space-y-8 bg-[radial-gradient(circle_at_top,#f3ead6_0%,#f8fbfd_34%,#e3ece7_100%)] p-6 lg:p-10"
      dir="rtl"
    >
      <section className="relative overflow-hidden rounded-[2.9rem] border border-[#d6c29b] bg-[linear-gradient(135deg,#10263f_0%,#15365b_48%,#1f5e63_100%)] p-8 text-white shadow-[0_35px_90px_rgba(16,38,63,0.24)]">
        <div className="absolute left-10 top-10 h-36 w-36 rounded-full bg-[#d9b36b]/18 blur-3xl" />
        <div className="absolute -bottom-10 right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1.6fr_0.95fr] xl:items-end">
          <div className="space-y-5 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9b36b]/35 bg-black/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#f3deb7] backdrop-blur-xl">
              <Archive className="h-4 w-4" /> Judicial Registry Chamber
            </div>
            <div className="space-y-3">
              <h1 className="font-amiri text-4xl font-black leading-tight lg:text-6xl">غرفة الأرشفة القضائية النهائية</h1>
              <p className="max-w-3xl text-sm font-bold leading-7 text-white/80 lg:text-base">
                إعادة تصميم كاملة لواجهة الأرشفة النهائية بهوية أقرب إلى بيئة السجلات القضائية، مع إبقاء جميع آليات الإدراج، التضمين، والإحالة إلى رواق التوقيع كما هي دون تعديل وظيفي.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowStats(true)}
                className="rounded-2xl bg-[#f3deb7] px-5 py-3 text-sm font-black text-[#10263f] shadow-lg transition hover:-translate-y-0.5"
              >
                <BarChart3 className="ml-2 inline h-4 w-4" /> لوحة المؤشرات
              </button>
              <button
                type="button"
                onClick={() => setShowLettersModal(true)}
                className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <Settings2 className="ml-2 inline h-4 w-4" /> هندسة الحروف
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f3deb7]">National Capacity</div>
              <div className="mt-3 text-4xl font-black">{summaryStats.totalArchived}</div>
              <div className="mt-2 text-sm font-bold text-white/75">رسم مؤرشف داخل السجلات النهائية</div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f3deb7]">Registry Letters</div>
              <div className="mt-3 text-4xl font-black">{letters.filter((item) => item.active).length}</div>
              <div className="mt-2 text-sm font-bold text-white/75">حروف مفعلة لإدارة السجلات</div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-black/15 p-5 backdrop-blur-xl sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div className="text-right">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f3deb7]">النوع النشط حالياً</div>
                  <div className="mt-2 text-2xl font-black">{getRegistryMeta(selectedType).icon} {getRegistryMeta(selectedType).label}</div>
                  <div className="mt-1 text-sm font-bold text-white/75">عدد السجلات المفتوحة والمغلقة لهذا الصنف يظهر أسفل الصفحة مع تفاصيل السعة.</div>
                </div>
                <div className="rounded-[1.6rem] border border-[#d9b36b]/30 bg-[#f3deb7]/10 px-4 py-3 text-center">
                  <div className="text-[11px] font-black text-[#f3deb7]">المعدل اليومي</div>
                  <div className="mt-1 text-2xl font-black">{summaryStats.dailyAverage}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'السجلات المفتوحة', value: summaryStats.openRegistries, icon: BookOpen, tone: 'border-[#12388A]' },
          { label: 'السجلات المغلقة', value: summaryStats.closedRegistries, icon: Lock, tone: 'border-[#8b1e3f]' },
          { label: 'الرسوم المؤرشفة', value: summaryStats.totalArchived, icon: Archive, tone: 'border-emerald-500' },
          { label: 'المعدل اليومي', value: summaryStats.dailyAverage, icon: Activity, tone: 'border-[#d49b38]' },
        ].map((card) => (
          <div key={card.label} className={`group relative overflow-hidden rounded-[2.2rem] border ${card.tone} bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm transition hover:-translate-y-1`}>
            <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 text-right">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</div>
                <div className="text-4xl font-black text-slate-900">{card.value}</div>
                <div className="text-sm font-bold text-slate-500">مؤشر لحظي من قاعدة الأرشفة الوطنية</div>
              </div>
              <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,#fffaf0_0%,#f8fafc_100%)] p-4 shadow-inner ring-1 ring-black/[0.03]">
                <card.icon className="h-7 w-7 text-slate-400 transition group-hover:scale-110" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {incomingJudicialDeed && (
        <section className="rounded-[2rem] border border-[#cfe0ff] bg-[linear-gradient(180deg,#eff5ff_0%,#f8fbff_100%)] px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-right">
              <div className="text-sm font-black text-blue-800">تم استقبال رسم نهائي من رواق الخطاب القضائي</div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {incomingJudicialDeed.category} · {incomingJudicialDeed.serialNumber || incomingJudicialDeed.deedId}
              </div>
              <div className="mt-1 text-sm font-bold text-slate-600">
                المدينة: {incomingJudicialDeed.city} · النوع المقترح للسجل: {getRegistryMeta(incomingJudicialDeed.inferredType).label}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setInsertType(incomingJudicialDeed.inferredType);
                  setInsertLetter('أ');
                  setGeneratedInsert(null);
                  setInsertNotice(`💡 تم تحويل الرسم من رواق الخطاب القضائي. سيتم الإدراج في سجل ${getRegistryMeta(incomingJudicialDeed.inferredType).label} / الحرف أ`);
                  setInsertError(null);
                  setShowInsertModal(true);
                }}
                className="rounded-2xl bg-[#12388A] px-5 py-3 text-sm font-black text-white"
              >
                <Plus className="ml-2 inline h-4 w-4" /> إدراج الرسم النهائي في السجل
              </button>
              <button
                type="button"
                onClick={() => setIncomingJudicialDeed(null)}
                className="rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700"
              >
                إخفاء التنبيه
              </button>
            </div>
          </div>
        </section>
      )}

      {archiveQuery.error && (
        <section className="rounded-[2rem] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2_0%,#fff8f8_100%)] px-6 py-5 text-right text-sm font-black text-rose-700 shadow-sm">
          تعذر تحميل سجلات الأرشفة النهائية: {archiveQuery.error.message}
        </section>
      )}

      {archiveQuery.isLoading && (
        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] px-6 py-10 text-center text-sm font-black text-slate-500 shadow-sm">
          جاري تحميل سجلات تضمين الشهادات العدلية والأرشفة النهائية...
        </section>
      )}

      <section className="overflow-hidden rounded-[2.4rem] border border-[#e7dcc4] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="text-right">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b08a42]">Registry Atlas</div>
            <h2 className="mt-2 text-3xl font-black text-slate-900">خرائط أنواع السجلات</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">اختيار الصنف صار أقرب إلى لوحة تصنيف مركزية، مع الحفاظ على البنية الحالية للسلاسل، الحروف، والسجلات المفتوحة.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="ابحث في السجلات..."
              className="w-full rounded-2xl border border-[#e6dcc7] bg-[#fcfaf4] px-12 py-3 text-right text-sm font-black text-slate-700 outline-none focus:border-[#0f3b2e]"
            />
          </div>
            <div className="rounded-[1.75rem] border border-[#e6dcc7] bg-[#f8f4ea] px-4 py-3 text-right shadow-inner">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">النوع النشط</div>
              <div className="mt-1 text-base font-black text-[#12388A]">{getRegistryMeta(selectedType).icon} {getRegistryMeta(selectedType).label}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {REGISTRY_TYPES.map((type) => {
            const count = registries.filter((registry) => registry.type === type.key).length;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => {
                  setSelectedType(type.key);
                  setSelectedRegistryId(null);
                }}
                className={`group rounded-[2rem] border p-5 text-right transition-all ${
                  selectedType === type.key
                    ? 'border-[#12388A] bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)] shadow-[0_18px_36px_rgba(18,56,138,0.12)]'
                    : 'border-slate-200 bg-white hover:border-[#d8c7a1] hover:bg-[#fffaf0]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-4xl transition group-hover:scale-110">{type.icon}</div>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-black text-slate-500">{count} سجلات</span>
                </div>
                <div className="mt-5 text-xl font-black text-slate-900">{type.label}</div>
                  <div className="mt-2 text-sm font-bold text-slate-500">{type.badge} • بنية مستقلة للحروف والسلاسل</div>
              </button>
            );
          })}
        </div>
      </section>

      {!selectedRegistry ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b08a42]">Registry Deck</div>
              <h3 className="mt-2 text-3xl font-black text-slate-900">سجلات {getRegistryMeta(selectedType).label}</h3>
              <p className="mt-2 text-sm font-bold text-slate-500">اختر السجل المناسب لعرض الرسوم المؤرشفة أو تفاصيل السعة الحالية ومراجع التضمين.</p>
            </div>
          </div>
          <div className="grid gap-5">
            {filteredRegistries.map((registry) => {
              const meta = getRegistryMeta(registry.type);
              const status = getRegistryStatus(registry.currentCount, registry.maxEntries);
              const pct = (registry.currentCount / registry.maxEntries) * 100;
              return (
                <div
                  key={registry.id}
                  className="group overflow-hidden rounded-[2.25rem] border border-[#e7dcc4] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-6 shadow-[0_24px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-1"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                      <div className="rounded-[1.7rem] bg-[linear-gradient(135deg,#12388A_0%,#1f5e63_100%)] p-5 text-white shadow-lg shadow-[#12388A]/20">
                        <span className="text-3xl">{meta.icon}</span>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="text-2xl font-black text-slate-900">{formatRegistryLabel(registry)}</div>
                        <div className="text-sm font-bold text-slate-500">{meta.label} • سلسلة الحرف {registry.letter}</div>
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b08a42]">National Archiving Register</div>
                      </div>
                    </div>

                    <div className="min-w-[300px] rounded-[1.75rem] border border-slate-200 bg-[#fcfaf4] p-4 shadow-inner space-y-3 text-right">
                      <div className="flex items-center justify-between text-xs font-black text-slate-500">
                        <span>{registry.currentCount} / {registry.maxEntries}</span>
                        <span>📊 السعة الحالية</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${statusConfig[status].bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="flex flex-wrap gap-3 opacity-100 transition lg:opacity-70 lg:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openRegistry(registry)}
                        className="rounded-2xl bg-[linear-gradient(135deg,#12388A_0%,#1f5e63_100%)] px-5 py-3 text-sm font-black text-white"
                      >
                        <FolderOpen className="ml-2 inline h-4 w-4" /> فتح
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          openRegistry(registry);
                          setSearchQuery('');
                        }}
                        className="rounded-2xl border border-[#d8c7a1] bg-[#fffaf0] px-5 py-3 text-sm font-black text-slate-700"
                      >
                        <FileText className="ml-2 inline h-4 w-4" /> تفاصيل
                      </button>
                      <button type="button" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
                        <Printer className="ml-2 inline h-4 w-4" /> تقرير
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[2.25rem] border border-[#e7dcc4] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSelectedRegistryId(null)}
                className="rounded-2xl bg-[#f8f4ea] p-3 text-slate-500 transition hover:bg-[#efe4c8] hover:text-[#12388A]"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="text-right">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b08a42]">السجلات &gt; {getRegistryMeta(selectedRegistry.type).label} &gt; حرف {selectedRegistry.letter} &gt; سجل {selectedRegistry.registerNumber}</div>
                <h3 className="mt-2 text-3xl font-black text-slate-900">
                  📘 سجل {selectedRegistry.registerNumber} / {selectedRegistry.letter} ({getRegistryMeta(selectedRegistry.type).label})
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[#e6dcc7] bg-[#fcfaf4] px-4 py-3 text-sm font-black text-slate-700">
                📊 {selectedRegistry.currentCount} / {selectedRegistry.maxEntries}
              </div>
              <button
                type="button"
                onClick={() => {
                  setInsertType(selectedRegistry.type);
                  setInsertLetter(selectedRegistry.letter);
                  setGeneratedInsert(null);
                  setInsertNotice(`💡 سيتم الإدراج في: سجل ${getRegistryMeta(selectedRegistry.type).label} / الحرف ${selectedRegistry.letter}`);
                  setInsertError(null);
                  setShowInsertModal(true);
                }}
                className="rounded-2xl bg-[linear-gradient(135deg,#12388A_0%,#1f5e63_100%)] px-5 py-3 text-sm font-black text-white"
              >
                <Plus className="ml-2 inline h-4 w-4" /> إدراج رسم داخل السجل
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ابحث... مثال: زواج أ 245"
                className="w-full rounded-2xl border border-[#e6dcc7] bg-[#fffdf7] px-12 py-3 text-right text-sm font-black text-slate-700 outline-none focus:border-[#0f3b2e]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="rounded-2xl border border-[#d8c7a1] bg-[#fffaf0] px-5 py-3 text-sm font-black text-slate-700"
            >
              <Filter className="ml-2 inline h-4 w-4" /> فلاتر وإحصائيات
            </button>
          </div>

          <div className="overflow-hidden rounded-[2.25rem] border border-[#e7dcc4] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead className="bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)]">
                  <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-4">#</th>
                    <th className="px-4 py-4">المعرف القضائي / ID</th>
                    <th className="px-4 py-4">عدد الرسم</th>
                    <th className="px-4 py-4">النوع</th>
                    <th className="px-4 py-4">الحرف</th>
                    <th className="px-4 py-4">مراجع سجل التضمين</th>
                    <th className="px-4 py-4">الأطراف</th>
                    <th className="px-4 py-4">العدلين</th>
                    <th className="px-4 py-4">قاضي الخطاب</th>
                    <th className="px-4 py-4">تاريخ التضمين</th>
                    <th className="px-4 py-4">الحالة</th>
                    <th className="px-4 py-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {detailEntries.map((entry, index) => {
                    const meta = getRegistryMeta(entry.registryType);
                    return (
                      <tr key={entry.id} className="border-t border-slate-100 text-sm font-bold text-slate-700 transition hover:bg-[#f8fbff]">
                        <td className="px-4 py-4 font-black text-slate-900">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyValue(entry.nationalId)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <span className="rounded-lg bg-[#f4efe1] px-2 py-1 font-mono text-xs text-slate-800">{entry.nationalId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-black text-[#0f3b2e]">{entry.fileNumber}</td>
                        <td className="px-4 py-4">{meta.icon} {entry.deedType}</td>
                        <td className="px-4 py-4">🔤 {entry.letter}</td>
                        <td className="px-4 py-4">
                          <div className="min-w-[250px] rounded-2xl border border-[#dce7fb] bg-gradient-to-br from-[#f8fbff] to-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm">
                            <div className="text-[10px] text-slate-400">{entry.inclusionReference?.heading || 'مراجع سجل التضمين'}</div>
                            <div className="mt-2 text-sm text-slate-900">{formatInclusionDescriptor(entry)}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                                رقم السجل: {entry.inclusionReference?.registerNumber ?? '---'}
                              </span>
                              <span className="rounded-full bg-[#f4efe1] px-2.5 py-1 text-[11px] text-[#8a6a2f]">
                                الحرف: {formatInclusionLetter(entry)}
                              </span>
                              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[13px] font-extrabold text-amber-800">
                                عدد: {entry.inclusionReference?.inclusionNumber ?? '---'}
                              </span>
                              {entry.inclusionReference?.registryPage ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">
                                  صحيفة: {entry.inclusionReference.registryPage}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <span>{entry.parties.join(' + ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-black text-[#12388A]">
                          {entry.notaries.map(formatNotaryLabel).filter(Boolean).join(' - ')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-black text-violet-800">
                            <User className="h-3.5 w-3.5" />
                            {entry.judgeName || 'غير متوفر'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>{entry.dateHijri}</div>
                          <div className="text-xs text-slate-400">{entry.dateGregorian}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black ${entryStatusConfig[entry.status].tone}`}>
                            {entry.status === 'FINAL_SECURED' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                            {entryStatusConfig[entry.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { icon: Eye, label: 'عرض', onClick: () => openEntryDocument(entry, 'view') },
                              { icon: FileText, label: 'نسخة أصلية', onClick: () => openEntryDocument(entry, 'original') },
                              { icon: Paperclip, label: 'مرفقات وملاحظات', onClick: () => setActiveSupportEntry(entry) },
                              { icon: Printer, label: 'طباعة', onClick: () => handlePrintEntry(entry) },
                              { icon: Share2, label: 'مشاركة', onClick: () => void handleShareEntry(entry, 'share') },
                              { icon: Send, label: 'إرسال', onClick: () => void handleShareEntry(entry, 'send') },
                              { icon: Link2, label: 'نسخ المرجع', onClick: () => void copyValue(buildEntryReferenceText(entry)) },
                            ].map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                onClick={action.onClick}
                                disabled={
                                  action.label === 'إرسال' &&
                                  (sendToNotaryPortalMutation.isPending || !!entry.sentToNotary)
                                }
                                className={`rounded-xl border px-3 py-2 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                                  action.label === 'إرسال'
                                    ? entry.sentToNotary
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                      : 'border-rose-300 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                <action.icon className="ml-1 inline h-3.5 w-3.5" /> {action.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {copiedValue && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-xl">
          تم النسخ: {copiedValue}
        </div>
      )}

      {activeEntry && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveEntry(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900">
                  {activeEntryMode === 'view' ? 'عرض الرسم المؤرشف' : 'النسخة الأصلية المرجعية'}
                </h3>
                <p className="text-sm font-bold text-slate-500">{activeEntry.fileNumber}</p>
              </div>
            </div>

            {activeEntry.previewUrl && activeEntryMode === 'view' ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                <iframe
                  src={activeEntry.previewUrl}
                  title={`معاينة ${activeEntry.fileNumber}`}
                  className="h-[72vh] w-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['المعرف القضائي / ID', activeEntry.nationalId],
                  ['عدد الرسم', activeEntry.fileNumber],
                  ['النوع', activeEntry.deedType],
                  ['الحرف', formatInclusionLetter(activeEntry)],
                  ['مرجع التضمين', formatInclusionDescriptor(activeEntry)],
                  ['رقم السجل', String(activeEntry.inclusionReference?.registerNumber ?? '---')],
                  ['عدد التضمين', String(activeEntry.inclusionReference?.inclusionNumber ?? '---')],
                  ...(activeEntry.inclusionReference?.registryPage ? [['الصحيفة', activeEntry.inclusionReference.registryPage] as const] : []),
                  ['الأطراف', activeEntry.parties.join(' + ')],
                  ['العدلان', activeEntry.notaries.map(formatNotaryLabel).filter(Boolean).join(' - ')],
                  ['التاريخ الهجري', activeEntry.inclusionReference?.hijriDate || activeEntry.dateHijri],
                  ['التاريخ الميلادي', activeEntry.inclusionReference?.gregorianDate || activeEntry.dateGregorian],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-right">
                    <div className="text-xs font-black text-slate-400">{label}</div>
                    <div className="mt-2 text-sm font-black text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handlePrintEntry(activeEntry)}
                className="rounded-2xl bg-[#12388A] px-5 py-3 text-sm font-black text-white"
              >
                <Printer className="ml-2 inline h-4 w-4" /> طباعة
              </button>
              <button
                type="button"
                onClick={() => void handleShareEntry(activeEntry, 'share')}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              >
                <Share2 className="ml-2 inline h-4 w-4" /> مشاركة
              </button>
              <button
                type="button"
                onClick={() => void copyValue(buildEntryReferenceText(activeEntry))}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              >
                <Link2 className="ml-2 inline h-4 w-4" /> نسخ المرجع
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSupportEntry && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveSupportEntry(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900">مرفقات الرسم وملاحظات القاضي</h3>
                <p className="text-sm font-bold text-slate-500">{activeSupportEntry.fileNumber}</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                  <MessageSquare className="h-4 w-4 text-violet-600" />
                  ملاحظات القاضي الأولى
                </div>
                <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
                  {activeSupportEntry.judgeNotes || 'لا توجد ملاحظات محفوظة لهذا الرسم.'}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  المرفقات الجانبية
                </div>
                <div className="space-y-3">
                  {(activeSupportEntry.judgeAttachments || []).length ? (
                    (activeSupportEntry.judgeAttachments || []).map((attachment, index) => (
                      <div
                        key={`${attachment.url}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="min-w-0 text-right">
                          <div className="truncate text-sm font-black text-slate-900">{attachment.name}</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-400">
                            {attachment.category || 'مرفق'}{attachment.mimeType ? ` • ${attachment.mimeType}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700"
                        >
                          <Eye className="ml-1 inline h-3.5 w-3.5" /> فتح
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-500 shadow-sm">
                      لا توجد مرفقات جانبية محفوظة لهذا الرسم.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInsertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-6 flex items-center justify-between">
              <button type="button" onClick={() => setShowInsertModal(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900">إدراج رسم داخل السجل</h3>
                <p className="text-sm font-bold text-slate-500">سيتم احترام قاعدة 500 شهادة لكل نوع + حرف.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">📂 نوع السجل</span>
                <select
                  value={insertType}
                  onChange={(e) => setInsertType(e.target.value as RegistryTypeKey)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none"
                >
                  {REGISTRY_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">🔤 حرف السجل</span>
                <select
                  value={insertLetter}
                  onChange={(e) => setInsertLetter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none"
                >
                  {activeLetters.map((letter) => (
                    <option key={letter.letter} value={letter.letter}>{letter.letter}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-black text-amber-700">
              ⚠️ سيتم إدراج الرسم ضمن: سجل {getRegistryMeta(insertType).label} / الحرف {insertLetter}
            </div>

            {insertNotice && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-right text-sm font-black text-blue-700">
                {insertNotice}
              </div>
            )}

            {insertError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-right text-sm font-black text-rose-700">
                {insertError}
              </div>
            )}

            {generatedInsert && (
              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-right">
                <div className="text-lg font-black text-slate-900">عدد: {generatedInsert.count}</div>
                <div className="mt-2 text-sm font-bold text-slate-600">بتاريخ: {generatedInsert.hijriDate} هـ</div>
                <div className="text-sm font-bold text-slate-600">الموافق: {generatedInsert.gregorianDate} م</div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateInsertionReference}
                className="rounded-2xl bg-[#12388A] px-5 py-3 text-sm font-black text-white"
              >
                🔢 توليد رقم التضمين
              </button>
              <button
                type="button"
                onClick={insertDeedIntoRegistry}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
              >
                <CheckCircle2 className="ml-2 inline h-4 w-4" /> حفظ داخل السجل
              </button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-6 flex items-center justify-between">
              <button type="button" onClick={() => setShowStats(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900">📊 الإحصائيات المتقدمة</h3>
                <p className="text-sm font-bold text-slate-500">فلترة حسب المدة، النوع، الحرف، والعدل.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">النوع</span>
                <select value={statsType} onChange={(e) => setStatsType(e.target.value as 'all' | RegistryTypeKey)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black">
                  <option value="all">الكل</option>
                  {REGISTRY_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">الحرف</span>
                <select value={statsLetter} onChange={(e) => setStatsLetter(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black">
                  <option value="all">الكل</option>
                  {letters.map((letter) => (
                    <option key={letter.letter} value={letter.letter}>{letter.letter}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">العدل</span>
                <select value={statsNotary} onChange={(e) => setStatsNotary(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black">
                  <option value="all">الكل</option>
                  {availableNotaries.map((notary) => (
                    <option key={notary} value={notary}>{notary}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">المدة</span>
                <select value={statsRange} onChange={(e) => setStatsRange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black">
                  <option value="all">الكل</option>
                  {DATE_PRESETS.map((preset) => (
                    <option key={preset.label} value={String(preset.months)}>{preset.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">من</span>
                <input type="date" value={statsFrom} onChange={(e) => setStatsFrom(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black" />
              </label>
              <label className="space-y-2 text-right">
                <span className="text-sm font-black text-slate-700">إلى</span>
                <input type="date" value={statsTo} onChange={(e) => setStatsTo(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black" />
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-5 text-right">
                <div className="text-sm font-black text-slate-500">عدد الرسوم</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{statsEntries.length}</div>
              </div>
              {statsByType.map((item) => (
                <div key={item.key} className="rounded-2xl bg-slate-50 p-5 text-right">
                  <div className="text-sm font-black text-slate-500">{item.icon} {item.label}</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{item.count}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="mb-4 text-right text-lg font-black text-slate-900">👨‍⚖️ حسب العدل</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {statsByNotary.map((row) => (
                  <div key={row.notary} className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <div className="font-black text-slate-800">{row.notary}</div>
                    <div className="text-sm font-bold text-slate-500">عدد الرسوم: {row.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-start">
              <button type="button" className="rounded-2xl bg-[#12388A] px-5 py-3 text-sm font-black text-white">
                <Printer className="ml-2 inline h-4 w-4" /> تصدير تقرير رسمي PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showLettersModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl" dir="rtl">
            <div className="mb-6 flex items-center justify-between">
              <button type="button" onClick={() => setShowLettersModal(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900">🔤 إدارة الحروف</h3>
                <p className="text-sm font-bold text-slate-500">إضافة أو تعطيل الحروف ومعرفة عدد السجلات المرتبطة بها.</p>
              </div>
            </div>
            <div className="space-y-3">
              {letters.map((letter) => {
                const relatedCount = registries.filter((registry) => registry.letter === letter.letter).length;
                return (
                  <div key={letter.letter} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setLetters((prev) =>
                            prev.map((item) => item.letter === letter.letter ? { ...item, active: !item.active } : item)
                          )
                        }
                        className={`rounded-xl px-4 py-2 text-xs font-black ${letter.active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {letter.active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <span className="text-sm font-bold text-slate-500">عدد السجلات المرتبطة: {relatedCount}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">{letter.letter}</div>
                      <div className="text-sm font-bold text-slate-500">{letter.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-slate-200 bg-white/90 px-8 py-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-6 text-[11px] font-black text-slate-500">
          <span className="flex items-center gap-2"><Hash className="h-4 w-4 text-[#12388A]" /> Registry Chain: SECURE-7F-8E</span>
          <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-500" /> Main Node: Active</span>
          <span className="text-slate-300">© National Notary Authority 2026</span>
        </div>
      </div>
    </div>
  );
};
