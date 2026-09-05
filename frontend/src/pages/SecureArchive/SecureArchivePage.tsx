import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  ShieldCheck,
  QrCode,
  Eye,
  Printer,
  RefreshCw,
  FileText,
  Loader,
  AlertCircle,
  Lock,
  BadgeCheck,
  ScrollText,
  LayoutGrid,
  Book,
  FolderArchive,
  HeartPulse,
  BarChart3,
  Settings,
  X,
  Gavel,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

type SignedDeedCategory = 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other';

type UiCategory = 'marriage' | 'divorce' | 'property' | 'inheritance' | 'misc';

const UI_CATEGORIES: Array<{
  id: UiCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}> = [
  { id: 'marriage', label: 'الزواج', icon: HeartPulse, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { id: 'divorce', label: 'الطلاق', icon: ScrollText, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  { id: 'property', label: 'الأملاك', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'inheritance', label: 'التركات', icon: Book, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  { id: 'misc', label: 'باقي الوثائق', icon: FolderArchive, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
];

function toUiCategory(category: SignedDeedCategory): UiCategory {
  switch (category) {
    case 'Marriage':
      return 'marriage';
    case 'Divorce':
      return 'divorce';
    case 'Property':
      return 'property';
    case 'Inheritance':
      return 'inheritance';
    case 'Other':
    default:
      return 'misc';
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('ar-MA');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleString('ar-MA');
}

function translateArchiveActionType(actionType: string | null | undefined) {
  switch (String(actionType || '')) {
    case 'FINAL_SECURE_ARCHIVE_PRE_JUDGE':
      return 'الأرشفة المؤمنة قبل الخطاب';
    case 'FINAL_SECURE_ARCHIVE_POST_JUDGE':
      return 'الأرشفة المؤمنة بعد الخطاب';
    case 'SEND_TO_JUDGE':
      return 'إحالة الرسم إلى قاضي التوثيق';
    default:
      return actionType || 'عملية غير معروفة';
  }
}

function shortHash(value: string) {
  if (!value) return '---';
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

type SecureArchiveCardRow = {
  signedDeedId: string;
  category: SignedDeedCategory;
  signatureTimestamp: string | null;
  createdAt: string;
  fileNumber: string | null;
  documentType: string | null;
  inclusionRegistryType?: string | null;
  intakeDate?: string | null;
  referenceNumber?: string | null;
  registryNumber: string | null;
  registryLetter?: string | null;
  registryCount: string | null;
  registryPage: string | null;
  titleBookType?: string | null;
  titleBookNumber?: string | null;
  titleDeedType?: string | null;
  titleDeedNumber?: string | null;
  titleDeedCount?: string | null;
  titleDeedPage?: string | null;
  titleDeedOffice?: string | null;
  titleDeedDate?: string | null;
  financialBook?: string | null;
  financialNumber?: string | null;
  financialCount?: string | null;
  financialDate?: string | null;
  financialCounterpartNumber?: string | null;
  propertyIncomeReference?: string | null;
  notes?: string | null;
  court: string | null;
  notaryName?: string | null;
  partyNames?: string[];
  partyIdNumbers?: string[];
  preJudge: { sha256: string; fileUrl: string; sealedAt: string } | null;
  postJudge: { sha256: string; fileUrl: string; sealedAt: string } | null;
  verification: { token: string; expiresAt: string | null; url: string; qrDataUrl: string | null } | null;
};

export const SecureArchivePage: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const searchSectionRef = useRef<HTMLDivElement | null>(null);
  const statsSectionRef = useRef<HTMLDivElement | null>(null);
  const cardsSectionRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [originalDeed, setOriginalDeed] = useState('');
  const [transferBook, setTransferBook] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [transferCount, setTransferCount] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [transferAuthority, setTransferAuthority] = useState('');
  const [deedRelation, setDeedRelation] = useState('');
  const [saleProcess, setSaleProcess] = useState('');
  const [inclusionRegistryType, setInclusionRegistryType] = useState('');
  const [intakeDate, setIntakeDate] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [registryLetter, setRegistryLetter] = useState('');
  const [registryPage, setRegistryPage] = useState('');
  const [registryCount, setRegistryCount] = useState('');
  const [party1Name, setParty1Name] = useState('');
  const [party1Id, setParty1Id] = useState('');
  const [party2Name, setParty2Name] = useState('');
  const [party2Id, setParty2Id] = useState('');
  const [titleDeedType, setTitleDeedType] = useState('');
  const [titleDeedNumber, setTitleDeedNumber] = useState('');
  const [titleDeedCount, setTitleDeedCount] = useState('');
  const [titleDeedPage, setTitleDeedPage] = useState('');
  const [titleDeedOffice, setTitleDeedOffice] = useState('');
  const [titleDeedDate, setTitleDeedDate] = useState('');
  const [financialNumber, setFinancialNumber] = useState('');
  const [financialCount, setFinancialCount] = useState('');
  const [financialDate, setFinancialDate] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [financeReference, setFinanceReference] = useState('');
  const [registrationStatement, setRegistrationStatement] = useState('');
  const [activeSearchPanel, setActiveSearchPanel] = useState<null | 'inclusion' | 'transfer' | 'registration' | 'title' | 'financial'>(null);
  const [activeHeaderTool, setActiveHeaderTool] = useState<'search' | 'statistics' | 'security' | 'settings' | 'immutable' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmutableOpen, setIsImmutableOpen] = useState(false);
  const [filters, setFilters] = useState<Record<UiCategory, boolean>>({
    marriage: true,
    divorce: true,
    property: true,
    inheritance: true,
    misc: true,
  });

  const selectedCategories = useMemo(() => {
    const cats: SignedDeedCategory[] = [];
    if (filters.marriage) cats.push('Marriage');
    if (filters.divorce) cats.push('Divorce');
    if (filters.property) cats.push('Property');
    if (filters.inheritance) cats.push('Inheritance');
    if (filters.misc) cats.push('Other');
    return cats;
  }, [filters]);

  const origin = useMemo(() => {
    try {
      return window.location.origin;
    } catch {
      return '';
    }
  }, []);

  const [appliedSearch, setAppliedSearch] = useState({
    query: '',
    originalDeed: '',
    transferBook: '',
    transferNumber: '',
    transferCount: '',
    transferDate: '',
    transferAuthority: '',
    deedRelation: '',
    saleProcess: '',
    inclusionRegistryType: '',
    intakeDate: '',
    registryNumber: '',
    registryLetter: '',
    registryPage: '',
    registryCount: '',
    party1Name: '',
    party1Id: '',
    party2Name: '',
    party2Id: '',
    titleDeedType: '',
    titleDeedNumber: '',
    titleDeedCount: '',
    titleDeedPage: '',
    titleDeedOffice: '',
    titleDeedDate: '',
    financialNumber: '',
    financialCount: '',
    financialDate: '',
    transactionDate: '',
    registrationNumber: '',
    registrationDate: '',
    paymentNumber: '',
    financeReference: '',
    registrationStatement: '',
  });

  const cardsQuery = trpc.feesAgent.documents.listSecureArchiveCards.useQuery(
    {
      sessionToken: sessionToken || '',
      origin,
      query: appliedSearch.query.trim() ? appliedSearch.query : undefined,
      originalDeed: appliedSearch.originalDeed.trim() ? appliedSearch.originalDeed : undefined,
      transferBook: appliedSearch.transferBook.trim() ? appliedSearch.transferBook : undefined,
      transferNumber: appliedSearch.transferNumber.trim() ? appliedSearch.transferNumber : undefined,
      transferCount: appliedSearch.transferCount.trim() ? appliedSearch.transferCount : undefined,
      transferDate: appliedSearch.transferDate.trim() ? appliedSearch.transferDate : undefined,
      transferAuthority: appliedSearch.transferAuthority.trim() ? appliedSearch.transferAuthority : undefined,
      deedRelation: appliedSearch.deedRelation.trim() ? appliedSearch.deedRelation : undefined,
      saleProcess: appliedSearch.saleProcess.trim() ? appliedSearch.saleProcess : undefined,
      inclusionRegistryType: appliedSearch.inclusionRegistryType.trim() ? appliedSearch.inclusionRegistryType : undefined,
      intakeDate: appliedSearch.intakeDate.trim() ? appliedSearch.intakeDate : undefined,
      registryNumber: appliedSearch.registryNumber.trim() ? appliedSearch.registryNumber : undefined,
      registryLetter: appliedSearch.registryLetter.trim() ? appliedSearch.registryLetter : undefined,
      registryPage: appliedSearch.registryPage.trim() ? appliedSearch.registryPage : undefined,
      registryCount: appliedSearch.registryCount.trim() ? appliedSearch.registryCount : undefined,
      party1Name: appliedSearch.party1Name.trim() ? appliedSearch.party1Name : undefined,
      party1Id: appliedSearch.party1Id.trim() ? appliedSearch.party1Id : undefined,
      party2Name: appliedSearch.party2Name.trim() ? appliedSearch.party2Name : undefined,
      party2Id: appliedSearch.party2Id.trim() ? appliedSearch.party2Id : undefined,
      titleDeedType: appliedSearch.titleDeedType.trim() ? appliedSearch.titleDeedType : undefined,
      titleDeedNumber: appliedSearch.titleDeedNumber.trim() ? appliedSearch.titleDeedNumber : undefined,
      titleDeedCount: appliedSearch.titleDeedCount.trim() ? appliedSearch.titleDeedCount : undefined,
      titleDeedPage: appliedSearch.titleDeedPage.trim() ? appliedSearch.titleDeedPage : undefined,
      titleDeedOffice: appliedSearch.titleDeedOffice.trim() ? appliedSearch.titleDeedOffice : undefined,
      titleDeedDate: appliedSearch.titleDeedDate.trim() ? appliedSearch.titleDeedDate : undefined,
      financialNumber: appliedSearch.financialNumber.trim() ? appliedSearch.financialNumber : undefined,
      financialCount: appliedSearch.financialCount.trim() ? appliedSearch.financialCount : undefined,
      financialDate: appliedSearch.financialDate.trim() ? appliedSearch.financialDate : undefined,
      transactionDate: appliedSearch.transactionDate.trim() ? appliedSearch.transactionDate : undefined,
      registrationNumber: appliedSearch.registrationNumber.trim() ? appliedSearch.registrationNumber : undefined,
      registrationDate: appliedSearch.registrationDate.trim() ? appliedSearch.registrationDate : undefined,
      paymentNumber: appliedSearch.paymentNumber.trim() ? appliedSearch.paymentNumber : undefined,
      financeReference: appliedSearch.financeReference.trim() ? appliedSearch.financeReference : undefined,
      registrationStatement: appliedSearch.registrationStatement.trim() ? appliedSearch.registrationStatement : undefined,
      categories: selectedCategories.length === 5 ? undefined : selectedCategories,
      limit: 120,
    },
    {
      enabled: !!sessionToken && !!origin,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  const utils = trpc.useUtils();
  const judgeEndorsedQuery = trpc.feesAgent.documents.listJudgeEndorsedDeeds.useQuery(
    {
      sessionToken: sessionToken || '',
      origin,
      limit: 80,
    },
    {
      enabled: !!sessionToken && !!origin,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );
  const regenMutation = trpc.feesAgent.documents.regenerateVerificationLink.useMutation({
    onSuccess: () => {
      utils.feesAgent.documents.listSecureArchiveCards.invalidate();
    },
  });

  const [openLogFor, setOpenLogFor] = useState<string | null>(null);

  const toggleFilter = (id: UiCategory) => {
    setFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const rows = (cardsQuery.data || []) as Array<{
    // keep runtime casting here; UI uses SecureArchiveCardRow type
  }> as unknown as SecureArchiveCardRow[];

  const countsByUiCategory = useMemo(() => {
    const base: Record<UiCategory, number> = { marriage: 0, divorce: 0, property: 0, inheritance: 0, misc: 0 };
    rows.forEach((r) => {
      base[toUiCategory(r.category)] += 1;
    });
    return base;
  }, [rows]);

  const totalArchived = rows.length;
  const totalPostJudge = rows.filter((r) => !!r.postJudge).length;
  const totalVerified = rows.filter((r) => !!r.verification?.url).length;
  const totalProtected = rows.filter((r) => !!r.preJudge?.sha256).length;
  const judgeEndorsedRows = (judgeEndorsedQuery.data || []) as Array<{ workflowStatus: string }>;
  const judgeEndorsedCount = judgeEndorsedRows.filter((row) => row.workflowStatus === 'JudgeEndorsed' || row.workflowStatus === 'FinalArchived').length;
  const judgePendingCount = judgeEndorsedRows.filter((row) => row.workflowStatus === 'PendingJudgeEndorsement').length;
  const judgeAlertCount = judgeEndorsedCount || judgePendingCount;

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearPanelFields = (panel: 'inclusion' | 'transfer' | 'registration' | 'title' | 'financial') => {
    if (panel !== 'inclusion') {
      setInclusionRegistryType('');
      setIntakeDate('');
      setRegistryNumber('');
      setRegistryLetter('');
      setRegistryPage('');
      setRegistryCount('');
    }
    if (panel !== 'transfer') {
      setTransferBook('');
      setTransferNumber('');
      setTransferCount('');
      setTransferDate('');
      setTransferAuthority('');
    }
    if (panel !== 'registration') {
      setFinanceReference('');
      setRegistrationDate('');
      setPaymentNumber('');
      setRegistrationNumber('');
      setRegistrationStatement('');
    }
    if (panel !== 'title') {
      setTitleDeedType('');
      setTitleDeedNumber('');
      setTitleDeedCount('');
      setTitleDeedPage('');
      setTitleDeedOffice('');
      setTitleDeedDate('');
    }
    if (panel !== 'financial') {
      setFinancialNumber('');
      setFinancialCount('');
      setFinancialDate('');
    }
  };

  const runPanelSearch = (panel: 'inclusion' | 'transfer' | 'registration' | 'title' | 'financial') => {
    const nextApplied = {
      query,
      originalDeed: panel === 'transfer' ? originalDeed : '',
      transferBook: panel === 'transfer' ? transferBook : '',
      transferNumber: panel === 'transfer' ? transferNumber : '',
      transferCount: panel === 'transfer' ? transferCount : '',
      transferDate: panel === 'transfer' ? transferDate : '',
      transferAuthority: panel === 'transfer' ? transferAuthority : '',
      deedRelation: panel === 'transfer' ? deedRelation : '',
      saleProcess: panel === 'transfer' ? saleProcess : '',
      inclusionRegistryType: panel === 'inclusion' ? inclusionRegistryType : '',
      intakeDate: panel === 'inclusion' ? intakeDate : '',
      registryNumber: panel === 'inclusion' ? registryNumber : '',
      registryLetter: panel === 'inclusion' ? registryLetter : '',
      registryPage: panel === 'inclusion' ? registryPage : '',
      registryCount: panel === 'inclusion' ? registryCount : '',
      party1Name: '',
      party1Id: '',
      party2Name: '',
      party2Id: '',
      titleDeedType: panel === 'title' ? titleDeedType : '',
      titleDeedNumber: panel === 'title' ? titleDeedNumber : '',
      titleDeedCount: panel === 'title' ? titleDeedCount : '',
      titleDeedPage: panel === 'title' ? titleDeedPage : '',
      titleDeedOffice: panel === 'title' ? titleDeedOffice : '',
      titleDeedDate: panel === 'title' ? titleDeedDate : '',
      financialNumber: panel === 'financial' ? financialNumber : '',
      financialCount: panel === 'financial' ? financialCount : '',
      financialDate: panel === 'financial' ? financialDate : '',
      transactionDate: '',
      registrationNumber: panel === 'registration' ? registrationNumber : '',
      registrationDate: panel === 'registration' ? registrationDate : '',
      paymentNumber: panel === 'registration' ? paymentNumber : '',
      financeReference: panel === 'registration' ? financeReference : '',
      registrationStatement: panel === 'registration' ? registrationStatement : '',
    };
    setAppliedSearch(nextApplied);
    clearPanelFields(panel);
    scrollToSection(cardsSectionRef);
  };

  const runGlobalSearch = () => {
    setAppliedSearch((prev) => ({
      ...prev,
      query,
    }));
    scrollToSection(cardsSectionRef);
  };

  const handleSearchHeaderAction = () => {
    setActiveHeaderTool('search');
    scrollToSection(searchSectionRef);
    window.setTimeout(() => searchInputRef.current?.focus(), 150);
  };

  const handleStatisticsHeaderAction = () => {
    setActiveHeaderTool('statistics');
    scrollToSection(statsSectionRef);
  };

  const handleSecurityHeaderAction = () => {
    setActiveHeaderTool('security');
    if (rows[0]?.signedDeedId) {
      setOpenLogFor(rows[0].signedDeedId);
    }
    scrollToSection(cardsSectionRef);
  };

  const handleSettingsHeaderAction = () => {
    setActiveHeaderTool('settings');
    setIsSettingsOpen(true);
  };

  const handleImmutableHeaderAction = () => {
    setActiveHeaderTool('immutable');
    setIsImmutableOpen(true);
  };

  const headerToolButtonClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-black transition-all ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
    }`;

  const searchPanelClass = (isActive: boolean, tone: string) =>
    `self-start rounded-[1.5rem] border p-5 shadow-sm transition-all ${tone} ${isActive ? 'ring-2 ring-offset-2 ring-offset-[#f3f0e8]' : ''}`;

  const panelHeaderClass = 'flex w-full items-center justify-between gap-3 text-right';

  return (
    <div className="min-h-screen bg-[#f3f0e8] text-slate-900">
      <div className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(194,120,63,0.28),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(8,59,76,0.18),_transparent_26%),linear-gradient(135deg,_#f6f0e0_0%,_#efe8d8_38%,_#ede4d2_100%)]">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="relative w-full px-4 md:px-8 pt-6 pb-10">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/signed-rasms')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
              العودة
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              بيئة مؤمنة
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
            <div className="rounded-[2.25rem] border border-black/10 bg-[#102631] text-white shadow-[0_30px_80px_rgba(16,38,49,0.24)] overflow-hidden">
              <div className="px-6 md:px-8 py-8">
                <div className="flex items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-slate-200">
                      <FolderArchive className="w-4 h-4 text-amber-300" />
                      SECURE ARCHIVE GRID
                    </div>
                    <h1 className="mt-5 text-4xl md:text-5xl font-black leading-tight text-[#f7f2e7] font-maghribi">
                      الأرشيف العدلي المؤمَّن
                    </h1>
                    <p className="mt-4 max-w-2xl text-[15px] leading-8 font-bold text-slate-300">
                      واجهة أرشفة عدلية أعيد تصميمها بالكامل لتجعل البحث، التحقق، والبصمات الأمنية في شاشة واحدة واضحة وحادة وسريعة.
                    </p>
                  </div>
                  <div className="hidden md:flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/10 shadow-inner">
                    <ShieldCheck className="w-9 h-9 text-amber-300" />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4" ref={statsSectionRef}>
                  {[
                    { label: 'المؤرشف', value: totalArchived, icon: FolderArchive, tone: 'text-amber-300' },
                    { label: 'المخاطب عليها', value: totalPostJudge, icon: ScrollText, tone: 'text-violet-300' },
                    { label: 'روابط التحقق', value: totalVerified, icon: QrCode, tone: 'text-emerald-300' },
                    { label: 'البصمات المؤمنة', value: totalProtected, icon: Lock, tone: 'text-sky-300' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <item.icon className={`w-5 h-5 ${item.tone}`} />
                        <span className="text-[11px] font-black text-slate-400">{item.label}</span>
                      </div>
                      <div className={`mt-4 text-3xl font-black ${item.tone}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-black/10 bg-white/78 backdrop-blur px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.18em] text-slate-500">ARCHIVE TOOLS</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 font-maghribi">لوحة التحكم السريعة</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#102631] text-white flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={handleSearchHeaderAction} className={headerToolButtonClass(activeHeaderTool === 'search')}>
                  <Search className={`w-4 h-4 ${activeHeaderTool === 'search' ? 'text-white' : 'text-blue-600'}`} />
                  <span>البحث</span>
                </button>
                <button type="button" onClick={handleStatisticsHeaderAction} className={headerToolButtonClass(activeHeaderTool === 'statistics')}>
                  <BarChart3 className={`w-4 h-4 ${activeHeaderTool === 'statistics' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>الإحصائيات</span>
                </button>
                <button type="button" onClick={handleSecurityHeaderAction} className={headerToolButtonClass(activeHeaderTool === 'security')}>
                  <ShieldCheck className={`w-4 h-4 ${activeHeaderTool === 'security' ? 'text-white' : 'text-purple-600'}`} />
                  <span>سجل الأمان</span>
                </button>
                <button type="button" onClick={handleSettingsHeaderAction} className={headerToolButtonClass(activeHeaderTool === 'settings')}>
                  <Settings className={`w-4 h-4 ${activeHeaderTool === 'settings' ? 'text-white' : 'text-amber-600'}`} />
                  <span>الإعدادات</span>
                </button>
                <button type="button" onClick={handleImmutableHeaderAction} className={headerToolButtonClass(activeHeaderTool === 'immutable')}>
                  <Lock className={`w-4 h-4 ${activeHeaderTool === 'immutable' ? 'text-white' : 'text-slate-600'}`} />
                  <span>الوضع المحصَّن</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/judge-endorsed-deeds')}
                  className="inline-flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    الرسوم المخاطب عليها من طرف قاضي التوثيق
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs">({judgeEndorsedCount})</span>
                </button>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                  النتائج تتحدث فورياً مع كل تعديل في البحث أو الفلاتر.
                </div>
              </div>
            </div>
          </div>

          {judgeAlertCount > 0 && (
            <div className="mt-6 rounded-[1.6rem] border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 text-sm font-black text-violet-800">
                    <Bell className="w-4 h-4" />
                    إشعار جديد
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-700">
                    {judgeEndorsedCount > 0
                      ? `تم الخطاب على ${judgeEndorsedCount} رسم عدلي، ويمكن الآن معاينته وطباعته وإيداعه في الأرشيف العدلي المؤمَّن.`
                      : `هناك ${judgePendingCount} رسم قيد الخطاب لدى قاضي التوثيق.`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/judge-endorsed-deeds')}
                  className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700"
                >
                  فتح الرسم
                </button>
              </div>
            </div>
          )}

          <div ref={searchSectionRef} className="mt-8 grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            <aside className="rounded-[2rem] border border-black/10 bg-[#163542] text-white shadow-[0_22px_60px_rgba(22,53,66,0.18)] overflow-hidden">
              <div className="px-5 py-5 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-slate-300">CATEGORIES</p>
                    <p className="mt-2 text-2xl font-black">مرشحات الأرشيف</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-amber-300" />
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {UI_CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between gap-4 cursor-pointer rounded-[1.35rem] border px-4 py-3 transition-all ${
                      filters[c.id]
                        ? 'border-white/15 bg-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.12)]'
                        : 'border-white/10 bg-black/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.bg} ${c.border} border`}>
                        <c.icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <div>
                        <div className="font-black text-white">{c.label}</div>
                        <div className="text-[11px] font-bold text-slate-300">عدد الرسوم: {countsByUiCategory[c.id]}</div>
                      </div>
                    </div>
                    <input type="checkbox" checked={filters[c.id]} onChange={() => toggleFilter(c.id)} className="h-4 w-4 rounded border-white/30 bg-transparent" />
                  </label>
                ))}
              </div>
            </aside>

            <section className="rounded-[2.25rem] border border-black/10 bg-white/82 backdrop-blur shadow-[0_25px_60px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-l border-slate-200/80">
                  <p className="text-xs font-black tracking-[0.18em] text-slate-500">UNIFIED SEARCH ENGINE</p>
                  <h2 className="mt-3 text-3xl font-black text-slate-900">ابحث عبر المعرّفات العدلية</h2>
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                    الرقم التسلسلي، رقم السجل، عدد الشهادة، المحكمة، الاسم، أو رقم الهوية. التصميم الجديد يجعل البحث هو المحور الأول بدل أن يكون مجرد مربع عادي في منتصف الصفحة.
                  </p>

                  <div className="mt-6 relative">
                    <button
                      type="button"
                      onClick={runGlobalSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full bg-[#9d5c27] p-3 text-white shadow-lg shadow-[#9d5c27]/20 transition hover:bg-[#874b1a]"
                      title="تنفيذ البحث"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          runGlobalSearch();
                        }
                      }}
                      placeholder="ابحث بالرقم التسلسلي / السجل / الشهادة / المحكمة / CIN / النوع"
                      className="w-full rounded-[1.7rem] border border-[#d8c4a7] bg-[#fbf7ef] pr-16 pl-5 py-5 text-base font-black text-slate-800 placeholder:text-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d9a15b]"
                      dir="rtl"
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                    <div className={searchPanelClass(activeSearchPanel === 'inclusion', 'border-sky-200 bg-[linear-gradient(180deg,_rgba(14,165,233,0.06),_rgba(255,255,255,0.92))]')}>
                      <button type="button" className={panelHeaderClass} onClick={() => setActiveSearchPanel((prev) => prev === 'inclusion' ? null : 'inclusion')}>
                        <div>
                          <p className="text-lg font-black text-slate-900">🧾 البحث بسجلات التضمين</p>
                          <p className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500">افتح القسم للبحث في سجلات التضمين</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-sky-700 transition-transform ${activeSearchPanel === 'inclusion' ? 'rotate-90' : ''}`} />
                      </button>
                      {activeSearchPanel === 'inclusion' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                            <input value="ضمن بالسجلات المحفوظة بقسم التوثيق" readOnly className="rounded-xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-500 outline-none sm:col-span-2 cursor-not-allowed" dir="rtl" />
                            <select value={inclusionRegistryType} onChange={(e) => setInclusionRegistryType(e.target.value)} className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" dir="rtl">
                              <option value="">نوع السجل</option>
                              <option value="أملاك">الأملاك</option>
                              <option value="زواج">الزواج</option>
                              <option value="طلاق">الطلاق</option>
                              <option value="تركات">التركات</option>
                              <option value="وصايا">الوصايا</option>
                              <option value="كفالات">الكفالات</option>
                              <option value="هبات">الهبات</option>
                              <option value="أوقاف">الأوقاف</option>
                              <option value="مختلفة">سجلات مختلفة</option>
                              <option value="بيع_وشراء">بيع وشراء</option>
                              <option value="هبة">هبة</option>
                              <option value="مقاسمة">مقاسمة</option>
                              <option value="احصاء_متروك">إحصاء متروك</option>
                            </select>
                            <input value={registryNumber} onChange={(e) => setRegistryNumber(e.target.value)} placeholder="رقم السجل" className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" dir="rtl" />
                            <input value={registryLetter} onChange={(e) => setRegistryLetter(e.target.value)} placeholder="حرف" className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" dir="rtl" />
                            <input value={registryCount} onChange={(e) => setRegistryCount(e.target.value)} placeholder="عدد" className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" dir="rtl" />
                            <input value={registryPage} onChange={(e) => setRegistryPage(e.target.value)} placeholder="صحيفة" className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" dir="rtl" />
                            <input type="date" value={intakeDate} onChange={(e) => setIntakeDate(e.target.value)} className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200 sm:col-span-2" dir="rtl" />
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void runPanelSearch('inclusion')}
                              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
                            >
                              <Search className="w-4 h-4" />
                              بحث
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={searchPanelClass(activeSearchPanel === 'transfer', 'border-[#d8c4a7] bg-[#fbf7ef]')}>
                      <button type="button" className={panelHeaderClass} onClick={() => setActiveSearchPanel((prev) => prev === 'transfer' ? null : 'transfer')}>
                        <div>
                          <p className="text-lg font-black text-slate-900">🏠 تتبع انتقال الملكية</p>
                          <p className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500">افتح القسم للبحث في تتبع السندات العقارية</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-[#9d5c27] transition-transform ${activeSearchPanel === 'transfer' ? 'rotate-90' : ''}`} />
                      </button>
                      {activeSearchPanel === 'transfer' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                            <input value={transferBook} onChange={(e) => setTransferBook(e.target.value)} placeholder="ضمن بدفتر" className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d9a15b]" dir="rtl" />
                            <input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} placeholder="رقم" className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d9a15b]" dir="rtl" />
                            <input value={transferCount} onChange={(e) => setTransferCount(e.target.value)} placeholder="عدد" className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d9a15b]" dir="rtl" />
                            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d9a15b]" dir="rtl" />
                            <input value={transferAuthority} onChange={(e) => setTransferAuthority(e.target.value)} placeholder="توثيق" className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d9a15b]" dir="rtl" />
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void runPanelSearch('transfer')}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#9d5c27] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#9d5c27]/20 transition hover:bg-[#874b1a]"
                            >
                              <Search className="w-4 h-4" />
                              بحث
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={searchPanelClass(activeSearchPanel === 'registration', 'border-emerald-200 bg-[linear-gradient(180deg,_rgba(16,185,129,0.08),_rgba(255,255,255,0.92))]')}>
                      <button type="button" className={panelHeaderClass} onClick={() => setActiveSearchPanel((prev) => prev === 'registration' ? null : 'registration')}>
                        <div>
                          <p className="text-lg font-black text-slate-900">💰 البحث بمراجع التسجيل والتنبر</p>
                          <p className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500">افتح القسم للبحث بمراجع التسجيل</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-emerald-700 transition-transform ${activeSearchPanel === 'registration' ? 'rotate-90' : ''}`} />
                      </button>
                      {activeSearchPanel === 'registration' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                            <input value={financeReference} onChange={(e) => setFinanceReference(e.target.value)} placeholder="سجل ماليا إلكترونيا مالية / المرجع" className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" dir="rtl" />
                            <input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" dir="rtl" />
                            <input value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} placeholder="رقم الإيداع" className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" dir="rtl" />
                            <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="رقم التسجيل" className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200" dir="rtl" />
                            <textarea value={registrationStatement} onChange={(e) => setRegistrationStatement(e.target.value)} placeholder={'\"بعد تسجيل هذا الرسم بمصلحة التسجيل تحت عدد ... بتاريخ ...\"'} className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200 sm:col-span-2 min-h-[88px]" dir="rtl" />
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void runPanelSearch('registration')}
                              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                            >
                              <Search className="w-4 h-4" />
                              بحث
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={searchPanelClass(activeSearchPanel === 'title', 'border-amber-200 bg-[linear-gradient(180deg,_rgba(245,158,11,0.06),_rgba(255,255,255,0.92))]')}>
                      <button type="button" className={panelHeaderClass} onClick={() => setActiveSearchPanel((prev) => prev === 'title' ? null : 'title')}>
                        <div>
                          <p className="text-lg font-black text-slate-900">📜 سند الملك / العقد</p>
                          <p className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500">افتح القسم للبحث في السند المرجعي</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-amber-700 transition-transform ${activeSearchPanel === 'title' ? 'rotate-90' : ''}`} />
                      </button>
                      {activeSearchPanel === 'title' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                            <input value={titleDeedType} onChange={(e) => setTitleDeedType(e.target.value)} placeholder="نوع العقد (Deed Type)" className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                            <input value={titleDeedNumber} onChange={(e) => setTitleDeedNumber(e.target.value)} placeholder="رقم النظير" className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                            <input value={titleDeedCount} onChange={(e) => setTitleDeedCount(e.target.value)} placeholder="العدد" className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                            <input value={titleDeedPage} onChange={(e) => setTitleDeedPage(e.target.value)} placeholder="الصحيفة" className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                            <input value={titleDeedOffice} onChange={(e) => setTitleDeedOffice(e.target.value)} placeholder="جهة العقد" className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                            <input type="date" value={titleDeedDate} onChange={(e) => setTitleDeedDate(e.target.value)} className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-200" dir="rtl" />
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void runPanelSearch('title')}
                              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700"
                            >
                              <Search className="w-4 h-4" />
                              بحث
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={searchPanelClass(activeSearchPanel === 'financial', 'border-rose-200 bg-[linear-gradient(180deg,_rgba(244,63,94,0.05),_rgba(255,255,255,0.92))]')}>
                      <button type="button" className={panelHeaderClass} onClick={() => setActiveSearchPanel((prev) => prev === 'financial' ? null : 'financial')}>
                        <div>
                          <p className="text-lg font-black text-slate-900">💼 البحث بسجل بيانات العدل</p>
                          <p className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500">افتح القسم للبحث في سجل بيانات العدل</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-rose-700 transition-transform ${activeSearchPanel === 'financial' ? 'rotate-90' : ''}`} />
                      </button>
                      {activeSearchPanel === 'financial' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                            <input value="ضمن بسجل البيانات" readOnly className="rounded-xl border border-rose-100 bg-slate-50 px-4 py-3 text-slate-500 outline-none sm:col-span-2 cursor-not-allowed" dir="rtl" />
                            <input value={financialNumber} onChange={(e) => setFinancialNumber(e.target.value)} placeholder="رقم" className="rounded-xl border border-rose-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-rose-200" dir="rtl" />
                            <input value={financialCount} onChange={(e) => setFinancialCount(e.target.value)} placeholder="عدد" className="rounded-xl border border-rose-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-rose-200" dir="rtl" />
                            <input type="date" value={financialDate} onChange={(e) => setFinancialDate(e.target.value)} className="rounded-xl border border-rose-100 bg-white/90 px-4 py-3 outline-none focus:ring-2 focus:ring-rose-200" dir="rtl" />
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void runPanelSearch('financial')}
                              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
                            >
                              <Search className="w-4 h-4" />
                              بحث
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-[linear-gradient(180deg,_rgba(194,120,63,0.08),_rgba(16,38,49,0.03))]">
                  <p className="text-xs font-black tracking-[0.18em] text-slate-500">REFERENCE MAP</p>
                  <div className="mt-4 space-y-3 text-sm font-bold text-slate-700">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-white/70 p-4">
                      <p className="text-[11px] font-black text-slate-500">حقول البحث الأساسية</p>
                      <p className="mt-2 leading-7">الرقم التسلسلي، السجل، عدد الشهادة، الاسم، CIN.</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-white/70 p-4">
                      <p className="text-[11px] font-black text-slate-500">مفاتيح الفهرسة</p>
                      <p className="mt-2 leading-7">نوع الرسم، تاريخ التوقيع، المحكمة، مسار الأرشفة.</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
                      <p className="text-[11px] font-black">نتائج فورية</p>
                      <p className="mt-2 leading-7">كل تغيير في النص أو الفئات يعيد تشكيل الشبكة فوراً دون تعقيد بصري.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div ref={cardsSectionRef} className="w-full px-4 md:px-8 py-10">
        {cardsQuery.isLoading ? (
          <div className="flex items-center justify-center py-24 rounded-[2rem] border border-black/10 bg-white/70 shadow-sm">
            <Loader className="w-10 h-10 text-[#9d5c27] animate-spin" />
            <span className="mr-3 text-slate-700 font-black">جاري تحميل الأرشيف...</span>
          </div>
        ) : cardsQuery.error ? (
          <div className="bg-white rounded-[2.25rem] shadow-xl p-8 max-w-lg mx-auto text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-[1.4rem] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">خطأ في تحميل الأرشيف</h2>
            <p className="text-slate-600 font-bold mb-6">{(cardsQuery.error as any)?.message || 'تعذر تحميل البيانات'}</p>
            <button
              onClick={() => cardsQuery.refetch()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-[2.25rem] shadow-xl p-8 max-w-xl mx-auto text-center border border-black/10">
            <div className="w-16 h-16 bg-slate-100 rounded-[1.4rem] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">لا توجد نتائج</h2>
            <p className="text-slate-600 font-bold">جرّب تعديل كلمات البحث أو الفلاتر.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rows.map((r) => (
              <SecureArchiveCard
                key={r.signedDeedId}
                row={r}
                sessionToken={sessionToken || ''}
                isLogOpen={openLogFor === r.signedDeedId}
                onToggleLog={() => setOpenLogFor((prev) => (prev === r.signedDeedId ? null : r.signedDeedId))}
                onRegenerate={() => {
                  if (regenMutation.isPending) return;
                  regenMutation.mutate({
                    sessionToken: sessionToken || '',
                    signedDeedId: r.signedDeedId,
                    origin,
                  });
                }}
                regenPending={regenMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setIsSettingsOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-400 text-white flex items-center justify-between">
                <h3 className="text-sm font-black">إعدادات الأرشيف العدلي</h3>
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-xl bg-white/15 hover:bg-white/25">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold text-slate-700">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-900 font-black mb-2">إعدادات الشريط السفلي</p>
                  <p>ShowFooterBar = TRUE</p>
                  <p>QR = TRUE</p>
                  <p>DeedReferences = TRUE</p>
                  <p>NotaryInfo = TRUE</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-900 font-black mb-2">إعدادات الأمان</p>
                  <p>LockAfterJudgeEndorsement = TRUE</p>
                  <p>DeleteProtection = TRUE</p>
                  <p>EnableAuditLog = TRUE</p>
                  <p>EnableTwoFactorAuth = TRUE</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isImmutableOpen && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setIsImmutableOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-600 text-white flex items-center justify-between">
                <h3 className="text-sm font-black">الوضع المحصَّن غير القابل للتعديل</h3>
                <button type="button" onClick={() => setIsImmutableOpen(false)} className="p-2 rounded-xl bg-white/15 hover:bg-white/25">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-sm font-bold text-slate-700">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-900">
                  <p>ImmutableMode = TRUE</p>
                  <p>ReadOnly = TRUE</p>
                  <p>AllowEdit = FALSE</p>
                  <p>AllowDelete = FALSE</p>
                  <p>AllowHashRegeneration = FALSE</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-900 font-black mb-2">معيار التحقق</p>
                  <p>Algorithm: SHA-256</p>
                  <p>Standard: FIPS 180-4</p>
                  <a
                    href="https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex mt-3 text-violet-700 hover:underline"
                  >
                    المرجع الرسمي
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SecureArchiveCard: React.FC<{
  row: SecureArchiveCardRow;
  sessionToken: string;
  isLogOpen: boolean;
  onToggleLog: () => void;
  onRegenerate: () => void;
  regenPending: boolean;
}> = ({ row: r, sessionToken, isLogOpen, onToggleLog, onRegenerate, regenPending }) => {
  const navigate = useNavigate();

  const uiCat = UI_CATEGORIES.find((x) => x.id === toUiCategory(r.category));
  const isArchived = !!r.preJudge;
  const isAddressed = !!r.postJudge;
  const hasFingerprint = !!r.preJudge?.sha256;
  const detailChips = [
    r.registryNumber ? { label: 'رقم', value: r.registryNumber } : null,
    r.registryLetter ? { label: 'حرف', value: r.registryLetter } : null,
    r.registryCount ? { label: 'عدد', value: r.registryCount } : null,
    r.registryPage ? { label: 'صحيفة', value: r.registryPage } : null,
    !r.registryNumber && r.titleDeedNumber ? { label: 'رقم النظير', value: r.titleDeedNumber } : null,
    !r.registryCount && r.titleDeedCount ? { label: 'عدد النظير', value: r.titleDeedCount } : null,
    !r.registryPage && r.titleDeedPage ? { label: 'صحيفة النظير', value: r.titleDeedPage } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const infoLabels = [
    { label: 'المحكمة', value: r.court || '---' },
    r.inclusionRegistryType ? { label: 'نوع السجل', value: r.inclusionRegistryType } : null,
    r.referenceNumber ? { label: 'المرجع / المسلسل', value: r.referenceNumber } : null,
    r.intakeDate ? { label: 'تاريخ التضمين', value: formatDate(r.intakeDate) } : null,
    r.titleBookType ? { label: 'ضمن بدفتر', value: r.titleBookType } : null,
    r.titleBookNumber ? { label: 'رقم الدفتر', value: r.titleBookNumber } : null,
    r.titleDeedType ? { label: 'نوع السند / العقد', value: r.titleDeedType } : null,
    r.titleDeedOffice ? { label: 'جهة التوثيق', value: r.titleDeedOffice } : null,
    r.titleDeedDate ? { label: 'تاريخ المرجع', value: formatDate(r.titleDeedDate) } : null,
    r.financialBook ? { label: 'ضمن بسجل البيانات', value: r.financialBook } : null,
    r.financialNumber ? { label: 'رقم السجل المالي', value: r.financialNumber } : null,
    r.financialCounterpartNumber ? { label: 'مرجع المالية', value: r.financialCounterpartNumber } : null,
    r.financialCount ? { label: 'عدد السجل المالي', value: r.financialCount } : null,
    r.financialDate ? { label: 'تاريخ السجل المالي', value: formatDate(r.financialDate) } : null,
    r.propertyIncomeReference ? { label: 'المداخيل العقارية', value: r.propertyIncomeReference } : null,
    r.notaryName ? { label: 'العدل', value: r.notaryName } : null,
    r.partyNames?.length ? { label: 'الأطراف', value: r.partyNames.slice(0, 2).join(' / ') } : null,
    r.partyIdNumbers?.length ? { label: 'هويات الأطراف', value: r.partyIdNumbers.slice(0, 2).join(' / ') } : null,
    r.notes ? { label: 'ملاحظات', value: r.notes } : null,
    r.preJudge?.sha256 ? { label: 'بصمة ما قبل الخطاب', value: shortHash(r.preJudge.sha256) } : null,
    r.postJudge?.sha256 ? { label: 'بصمة ما بعد الخطاب', value: shortHash(r.postJudge.sha256) } : null,
    r.verification?.expiresAt ? { label: 'صلاحية رابط التحقق', value: formatDate(r.verification.expiresAt) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const logQuery = trpc.feesAgent.documents.getArchiveSecurityLog.useQuery(
    { sessionToken: sessionToken || '', signedDeedId: r.signedDeedId },
    { enabled: !!sessionToken && isLogOpen, staleTime: 0 }
  );

  return (
    <div className="group overflow-hidden rounded-[2rem] border border-black/10 bg-white/88 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.14)]">
      <div className="h-2 bg-gradient-to-r from-[#c37a3f] via-[#9d5c27] to-[#143542]" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              <BadgeCheck className="w-3.5 h-3.5" />
              نسخة مؤرشفة
            </div>
            <p className={`mt-4 text-3xl font-black ${uiCat?.color || 'text-slate-900'}`}>#{r.fileNumber || 'قيد الانتظار'}</p>
            <p className="mt-2 text-sm font-black text-slate-800">{r.documentType || uiCat?.label || 'وثيقة'}</p>
              {detailChips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black text-slate-600">
                  {detailChips.map((chip) => (
                    <span key={`${chip.label}:${chip.value}`} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                      {chip.label}: <span className="mr-1 text-slate-900">{chip.value}</span>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs font-bold text-slate-500">تاريخ التوقيع: {formatDate(r.signatureTimestamp || r.createdAt)}</p>
          </div>
          <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center ${uiCat?.bg || 'bg-slate-100'} border ${uiCat?.border || 'border-slate-200'} shadow-sm`}>
            {uiCat ? <uiCat.icon className={`w-6 h-6 ${uiCat.color}`} /> : <ShieldCheck className="w-6 h-6 text-blue-600" />}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[100px_minmax(0,1fr)] gap-4 items-start">
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-[#fbf7ef] p-3 text-center">
            <div className="aspect-square rounded-[1.2rem] border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-inner">
              {r.verification?.qrDataUrl ? (
                <img src={r.verification.qrDataUrl} alt="QR" className="w-full h-full object-cover" />
              ) : (
                <QrCode className="w-9 h-9 text-slate-400" />
              )}
            </div>
            <p className="mt-3 text-[11px] font-black text-slate-700">رمز التحقق</p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${isArchived ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                <BadgeCheck className="w-4 h-4" />
                مؤرشف
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${hasFingerprint ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                <ShieldCheck className="w-4 h-4" />
                مؤمن ببصمة
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${isAddressed ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                <ScrollText className="w-4 h-4" />
                {isAddressed ? 'مخاطب عليه' : 'قبل الخطاب'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {infoLabels.map((item) => (
                <div key={`${item.label}:${item.value}`} className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-right">
                  <div className="text-[10px] font-black tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 text-xs font-black text-slate-800 break-words">{item.value}</div>
                </div>
              ))}
            </div>
            {(r.financialBook || r.financialNumber || r.financialCounterpartNumber || r.financialCount || r.financialDate || r.propertyIncomeReference) && (
              <div className="mt-4 rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="mb-3 text-[11px] font-black tracking-wide text-emerald-700">البيانات المالية المحفوظة</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {r.financialBook && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">ضمن بسجل البيانات</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{r.financialBook}</div>
                    </div>
                  )}
                  {r.financialCounterpartNumber && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">المرجع المالي</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{r.financialCounterpartNumber}</div>
                    </div>
                  )}
                  {r.financialNumber && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">رقم الإيداع / السجل</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{r.financialNumber}</div>
                    </div>
                  )}
                  {r.financialCount && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">عدد السجل المالي</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{r.financialCount}</div>
                    </div>
                  )}
                  {r.financialDate && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">تاريخ التسجيل</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{formatDate(r.financialDate)}</div>
                    </div>
                  )}
                  {r.propertyIncomeReference && (
                    <div className="rounded-xl bg-white/90 px-3 py-2 text-right">
                      <div className="text-[10px] font-black text-slate-500">المداخيل العقارية</div>
                      <div className="mt-1 text-xs font-black text-slate-800 break-words">{r.propertyIncomeReference}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/signed-rasms/${r.signedDeedId}`)}
            className="px-4 py-3 rounded-[1.2rem] bg-[#143542] text-white font-black hover:bg-[#102631] transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            معاينة
          </button>

          <button
            onClick={() => {
              if (!r.verification?.url) return;
              window.open(r.verification.url, '_blank', 'noopener,noreferrer');
            }}
            disabled={!r.verification?.url}
            className="px-4 py-3 rounded-[1.2rem] bg-[#9d5c27] text-white font-black hover:bg-[#874c1d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            طباعة نسخة التحقق
          </button>

          <button
            onClick={onRegenerate}
            disabled={!sessionToken || regenPending}
            className="px-4 py-3 rounded-[1.2rem] bg-amber-50 text-amber-800 border border-amber-200 font-black hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="إعادة توليد QR (نسخة تحقق فقط)"
          >
            <RefreshCw className={`w-4 h-4 ${regenPending ? 'animate-spin' : ''}`} />
            إعادة توليد رمز التحقق
          </button>

          <button
            onClick={onToggleLog}
            className="px-4 py-3 rounded-[1.2rem] bg-slate-50 text-slate-700 border border-slate-200 font-black hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            سجل الأمان
          </button>
        </div>

        {/* Security log */}
        {isLogOpen && (
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-4">
            <p className="font-black text-slate-900 mb-3">سجل الأمان</p>
            {logQuery.isLoading ? (
              <div className="flex items-center gap-2 text-slate-600 font-bold">
                <Loader className="w-4 h-4 animate-spin" />
                جاري التحميل...
              </div>
            ) : logQuery.error ? (
              <p className="text-red-600 font-bold text-sm">تعذر تحميل السجل</p>
            ) : (logQuery.data || []).length === 0 ? (
              <p className="text-slate-600 font-bold text-sm">لا توجد عمليات مسجلة بعد</p>
            ) : (
              <div className="space-y-2">
                {(logQuery.data || []).slice(0, 8).map((x: any) => (
                  <div key={x.id} className="bg-white border border-slate-200 rounded-[1.2rem] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-slate-900">{translateArchiveActionType(x.actionType)}</p>
                      <p className="text-[10px] font-bold text-slate-500">{formatDateTime(x.timestamp)}</p>
                    </div>
                    {x.newHash && (
                      <p className="text-[11px] font-bold text-slate-600 mt-2">
                        البصمة الجديدة: <span className="font-black text-slate-800">{shortHash(String(x.newHash))}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
