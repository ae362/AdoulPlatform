import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Gavel,
  Loader,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

type SignedDeedCategory = 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other';
type WorkflowStatus =
  | 'Draft'
  | 'ReadyForJudge'
  | 'SentToJudge'
  | 'PendingJudgeEndorsement'
  | 'JudgeEndorsed'
  | 'FinalArchived';

type JudgeEndorsedRow = {
  signedDeedId: string;
  savedRasmId: string;
  judicialId: string | null;
  inclusionReference: {
    descriptor: string | null;
    registerNumber: string | null;
    registryLetter: string | null;
    inclusionNumber: string | null;
    registryPage: string | null;
    hijriDate: string | null;
    gregorianDate: string | null;
  } | null;
  category: SignedDeedCategory;
  fileNumber: string | null;
  documentType: string | null;
  createdAt: string;
  signatureTimestamp: string | null;
  court: string | null;
  notaryName: string | null;
  judgeName: string | null;
  partyNames: string[];
  partyIdNumbers: string[];
  workflowStatus: WorkflowStatus;
  workflowCurrentStep: number;
  hasQr: boolean;
  hasFingerprint: boolean;
  hasAttachments: boolean;
  isEditable: boolean;
  canArchiveFinal: boolean;
  previewUrl: string | null;
  preJudge: { sha256: string; fileUrl: string; sealedAt: string } | null;
  postJudge: { sha256: string; fileUrl: string; sealedAt: string } | null;
  verification: { token: string; expiresAt: string | null; url: string; qrDataUrl: string | null } | null;
};

const WORKFLOW_STEPS = [
  { icon: '📝', label: 'إنشاء الرسم' },
  { icon: '✍', label: 'توقيع العدلين' },
  { icon: '📤', label: 'إحالة إلى قاضي التوثيق' },
  { icon: '⏳', label: 'قيد الخطاب' },
  { icon: '🧾', label: 'مخاطب عليه' },
  { icon: '🔐', label: 'الأرشفة النهائية' },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('ar-MA');
}

function categoryLabel(category: SignedDeedCategory) {
  switch (category) {
    case 'Marriage':
      return 'الزواج';
    case 'Property':
      return 'الأملاك';
    case 'Inheritance':
      return 'التركات';
    case 'Divorce':
      return 'الطلاق';
    case 'Other':
    default:
      return 'باقي الوثائق';
  }
}

function statusMeta(status: WorkflowStatus) {
  switch (status) {
    case 'PendingJudgeEndorsement':
    case 'SentToJudge':
      return {
        label: 'قيد الخطاب لدى قاضي التوثيق',
        icon: '⏳',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
      };
    case 'JudgeEndorsed':
      return {
        label: 'مخاطب عليه من طرف قاضي التوثيق',
        icon: '🧾',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'FinalArchived':
      return {
        label: 'مؤرشف نهائياً',
        icon: '🔐',
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
      };
    case 'ReadyForJudge':
      return {
        label: 'جاهز للإحالة إلى القاضي',
        icon: '📤',
        badge: 'bg-violet-100 text-violet-700 border-violet-200',
      };
    default:
      return {
        label: 'مسودة',
        icon: '📝',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

function formatInclusionDescriptor(row: JudgeEndorsedRow) {
  const raw = String(row.inclusionReference?.descriptor || '').trim();
  if (!raw) return 'مرجع سجل التضمين غير متوفر';
  return raw
    .replace(/^سجل بسجل\s*/u, '')
    .replace(/\s*حرف\s+[^\s]+$/u, '')
    .trim();
}

function formatNotaryLabel(value: string | null | undefined) {
  return String(value || '')
    .replace(/^العدل محرر الرسم\s*/u, '')
    .replace(/^العدل\s*/u, '')
    .trim();
}

export const JudgeEndorsedDeeds: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [judgeNameInput, setJudgeNameInput] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewerRow, setViewerRow] = useState<JudgeEndorsedRow | null>(null);
  const [activeCategories, setActiveCategories] = useState<Record<SignedDeedCategory, boolean>>({
    Marriage: true,
    Divorce: true,
    Property: true,
    Inheritance: true,
    Other: true,
  });

  const selectedCategories = useMemo(
    () =>
      (Object.entries(activeCategories) as Array<[SignedDeedCategory, boolean]>)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id),
    [activeCategories]
  );

  const origin = useMemo(() => {
    try {
      return window.location.origin;
    } catch {
      return '';
    }
  }, []);

  const deedsQuery = trpc.feesAgent.documents.listJudgeEndorsedDeeds.useQuery(
    {
      sessionToken: sessionToken || '',
      origin,
      query: query.trim() || undefined,
      judgeName: judgeName.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      categories: selectedCategories.length === 5 ? undefined : selectedCategories,
      limit: 120,
    },
    {
      enabled: !!sessionToken,
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  const archiveMutation = trpc.feesAgent.documents.archiveSignedDeedPostJudge.useMutation({
    onSuccess: () => {
      void deedsQuery.refetch();
    },
  });

  const rows = (deedsQuery.data || []) as JudgeEndorsedRow[];
  const pendingCount = rows.filter((row) => row.workflowStatus === 'PendingJudgeEndorsement').length;
  const endorsedCount = rows.filter((row) => row.workflowStatus === 'JudgeEndorsed' || row.workflowStatus === 'FinalArchived').length;
  const finalArchivedCount = rows.filter((row) => row.workflowStatus === 'FinalArchived').length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = Number(window.localStorage.getItem('judge-endorsed-seen-count') || '0');
    const current = endorsedCount;
    if (current > seen) {
      window.localStorage.setItem('judge-endorsed-seen-count', String(current));
    }
  }, [endorsedCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setJudgeName(judgeNameInput);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [judgeNameInput]);

  return (
    <div className="min-h-screen bg-[#edf2f6] text-slate-900">
      <div className="border-b border-black/10 bg-[linear-gradient(135deg,_#f5f8fb_0%,_#edf3f7_45%,_#e8eef3_100%)]">
        <div className="w-full px-4 md:px-8 pt-6 pb-8">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/secure-archive')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
              العودة إلى الأرشيف
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20">
              <Gavel className="w-4 h-4" />
              ⚖ الرسوم المخاطب عليها ({endorsedCount})
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <div className="rounded-[2rem] bg-[#122c3a] px-6 py-7 text-white shadow-[0_24px_70px_rgba(18,44,58,0.18)]">
              <p className="text-xs font-black tracking-[0.24em] text-slate-300">JUDGE ENDORSEMENT FLOW</p>
              <h1 className="mt-4 text-4xl font-black leading-tight">⚖ الرسوم المخاطب عليها</h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-8 text-slate-300">
                تتبع مسار الرسم بعد إحالته إلى قاضي التوثيق، ومراقبة حالة الخطاب القضائي، وفتح الرسوم الجاهزة للإيداع داخل الأرشيف العدلي المؤمَّن.
              </p>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'قيد الخطاب', value: pendingCount, tone: 'text-orange-300' },
                  { label: 'مخاطب عليها', value: endorsedCount, tone: 'text-emerald-300' },
                  { label: 'مؤرشفة نهائياً', value: finalArchivedCount, tone: 'text-sky-300' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
                    <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">{item.label}</div>
                    <div className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black tracking-[0.22em] text-slate-500">CONTROL BAR</div>
                  <div className="mt-2 text-2xl font-black">الشريط العلوي</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Search className="w-4 h-4 text-blue-600" />
                    البحث
                  </div>
                  <input
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="ابحث بالمعرف القضائي، عدد الرسم، رقم السجل، الحرف، العدد، الصحيفة..."
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    dir="rtl"
                  />
                  <div className="mt-2 text-[11px] font-black leading-6 text-slate-500">
                    يشمل البحث: `ID القضائي`، `عدد الرسم`، `نوع الرسم`، `رقم السجل`، `الحرف`، `عدد التضمين`، `الصحيفة`، `التواريخ`، `الأطراف`، و`العدلين`.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    التصفية بالتاريخ
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-200" />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Gavel className="w-4 h-4 text-violet-600" />
                    التصفية باسم القاضي
                  </div>
                  <input
                    value={judgeNameInput}
                    onChange={(e) => setJudgeNameInput(e.target.value)}
                    placeholder="اسم القاضي"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200"
                    dir="rtl"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Filter className="w-4 h-4 text-amber-600" />
                    الإحصائيات
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-slate-600">
                    <div className="rounded-xl bg-white px-3 py-3">🧾 مخاطب عليه: {endorsedCount}</div>
                    <div className="rounded-xl bg-white px-3 py-3">🔐 نهائي: {finalArchivedCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {endorsedCount > 0 && (
            <div className="mt-6 rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-800">🔔 إشعار جديد</div>
                  <div className="mt-1 text-sm font-bold text-emerald-700">
                    وصل رسم جديد مخاطب عليه من طرف قاضي التوثيق، وأصبح جاهزًا للمعاينة والطباعة والإيداع النهائي.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 420, behavior: 'smooth' })}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                >
                  فتح الرسم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 md:px-8 py-8">
        {deedsQuery.isLoading ? (
          <div className="flex items-center justify-center py-24 rounded-[2rem] border border-black/10 bg-white shadow-sm">
            <Loader className="w-10 h-10 animate-spin text-blue-600" />
            <span className="mr-3 text-slate-700 font-black">جاري تحميل الرسوم المخاطب عليها...</span>
          </div>
        ) : deedsQuery.error ? (
          <div className="rounded-[2rem] border border-red-100 bg-white px-6 py-10 text-center shadow-sm">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
            <div className="mt-4 text-xl font-black text-slate-900">تعذر تحميل الصفحة</div>
            <div className="mt-2 text-sm font-bold text-slate-600">{(deedsQuery.error as any)?.message || 'حدث خطأ غير متوقع'}</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[2rem] border border-black/10 bg-white px-6 py-14 text-center shadow-sm">
            <FileText className="w-10 h-10 mx-auto text-slate-400" />
            <div className="mt-4 text-2xl font-black text-slate-900">لا توجد رسوم مخاطب عليها</div>
            <div className="mt-2 text-sm font-bold text-slate-600">لم تصل أي رسوم جديدة ضمن الخطاب القضائي وفق هذه الفلاتر.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {rows.map((row) => (
              <JudgeEndorsedDeedCard
                key={row.signedDeedId}
                row={row}
                archivePending={archiveMutation.isPending}
                onView={() => setViewerRow(row)}
                onArchive={() => {
                  if (!sessionToken) return;
                  archiveMutation.mutate({
                    sessionToken,
                    signedDeedId: row.signedDeedId,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {viewerRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewerRow(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
              >
                إغلاق
              </button>
              <div className="text-right">
                <div className="text-lg font-black text-slate-900">عرض الرسم</div>
                <div className="text-sm font-bold text-slate-500">
                  {viewerRow.fileNumber || viewerRow.documentType || 'الرسم النهائي'}
                </div>
              </div>
            </div>

            {(() => {
              const latestUrl = viewerRow.previewUrl || viewerRow.postJudge?.fileUrl || viewerRow.preJudge?.fileUrl || null;
              if (!latestUrl) {
                return (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-sm font-black text-slate-500">
                    لا توجد نسخة نهائية متاحة للعرض لهذا الرسم بعد.
                  </div>
                );
              }
              return (
                <iframe
                  src={latestUrl}
                  title={`عرض الرسم ${viewerRow.fileNumber || viewerRow.signedDeedId}`}
                  className="h-full w-full flex-1 border-0 bg-slate-100"
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

const JudgeEndorsedDeedCard: React.FC<{
  row: JudgeEndorsedRow;
  archivePending: boolean;
  onView: () => void;
  onArchive: () => void;
}> = ({ row, archivePending, onView, onArchive }) => {
  const status = statusMeta(row.workflowStatus);

  return (
    <div className="rounded-[1.8rem] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${status.badge}`}>
            <span>{status.icon}</span>
            {status.label}
          </div>
          <div className="mt-4 text-2xl font-black text-slate-900">📜 {row.fileNumber || '---'}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            <span>ID</span>
            <span className="font-mono text-slate-900">{row.judicialId || '---'}</span>
          </div>
          <div className="mt-2 text-sm font-black text-slate-700">📁 {row.documentType || categoryLabel(row.category)}</div>
          <div className="mt-2 text-xs font-bold text-slate-500">📅 تاريخ التحرير: {formatDate(row.signatureTimestamp || row.createdAt)}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">🏛 المحكمة: {row.court || '---'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <div className="text-[10px] font-black text-slate-500">Workflow</div>
          <div className="mt-2 text-sm font-black text-slate-800">{row.workflowCurrentStep + 1}/6</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
          🧾 {row.workflowStatus === 'JudgeEndorsed' || row.workflowStatus === 'FinalArchived' ? 'مخاطب عليه' : 'قيد المعالجة'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
          <ShieldCheck className="w-3.5 h-3.5" />
          {row.hasFingerprint ? 'مؤمن ببصمة رقمية' : 'بلا بصمة'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
          <QrCode className="w-3.5 h-3.5" />
          {row.hasQr ? 'يحتوي QR' : 'بلا QR'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
          <FolderOpen className="w-3.5 h-3.5" />
          {row.hasAttachments ? 'يحتوي مرفقات' : 'لا مرفقات'}
        </span>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-black tracking-[0.14em] text-slate-500">WorkflowTracker</div>
        <div className="mt-3 flex items-center justify-between gap-2 overflow-x-auto pb-1">
          {WORKFLOW_STEPS.map((step, index) => {
            const active = index <= row.workflowCurrentStep;
            return (
              <React.Fragment key={step.label}>
                <div className={`min-w-[50px] text-center ${active ? 'opacity-100' : 'opacity-35'}`}>
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                    {step.icon}
                  </div>
                  <div className="mt-2 text-[10px] font-black text-slate-600 leading-4">{step.label}</div>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={`h-1 min-w-[22px] rounded-full ${index < row.workflowCurrentStep ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 text-xs font-black text-slate-700 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">العدل: {formatNotaryLabel(row.notaryName) || '---'}</div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">القاضي: {row.judgeName || '---'}</div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
          الأطراف: {row.partyNames.length ? row.partyNames.slice(0, 2).join(' / ') : '---'}
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-black tracking-[0.14em] text-slate-500">مراجع سجل التضمين</div>
        <div className="mt-3 text-sm font-black text-slate-800">{formatInclusionDescriptor(row)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-800">
            رقم السجل: {row.inclusionReference?.registerNumber || '—'}
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800">
            الحرف: {row.inclusionReference?.registryLetter || '—'}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[13px] font-extrabold text-amber-800">
            عدد: {row.inclusionReference?.inclusionNumber || '—'}
          </span>
          {row.inclusionReference?.registryPage ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
              صحيفة: {row.inclusionReference.registryPage}
            </span>
          ) : null}
        </div>
      </div>

      {(row.workflowStatus === 'JudgeEndorsed' || row.workflowStatus === 'FinalArchived') && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-800">
          ⚠ هذا الرسم أصبح مخاطباً عليه وجاهزاً للإيداع في الأرشيف العدلي المؤمَّن.
        </div>
      )}

      {!row.isEditable && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-800">
          ⛔ هذا الرسم مشمول بالخطاب القضائي ولا يمكن تعديل مضمونه.
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#123746] px-4 py-3 text-sm font-black text-white hover:bg-[#0f2f3c]"
        >
          <Eye className="w-4 h-4" />
          عرض الرسم
        </button>
        <button
          type="button"
          onClick={() => {
            const url = row.previewUrl || row.postJudge?.fileUrl || row.preJudge?.fileUrl;
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#9d5c27] px-4 py-3 text-sm font-black text-white hover:bg-[#864d1e]"
        >
          <Printer className="w-4 h-4" />
          طباعة نسخة
        </button>
        <button
          type="button"
          onClick={() => {
            const url = row.previewUrl || row.postJudge?.fileUrl || row.preJudge?.fileUrl;
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <FolderOpen className="w-4 h-4" />
          فتح ملف الرسم
        </button>
        <button
          type="button"
          disabled={!row.canArchiveFinal || archivePending}
          onClick={onArchive}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          إيداع ضمن المحفوظات العدلية النهائية
        </button>
      </div>
    </div>
  );
};
