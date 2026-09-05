import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ChevronRight,
  FileText,
  Loader,
  AlertCircle,
  Calendar,
  FolderCheck,
  HeartPulse,
  ScrollText,
  LayoutGrid,
  Book,
  FolderArchive,
} from 'lucide-react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

type UiCategory = 'marriage' | 'divorce' | 'property' | 'inheritance' | 'misc';
type SignedDeedCategory = 'Marriage' | 'Property' | 'Inheritance' | 'Divorce' | 'Other';
type SignedDeedWorkflowStatus = 'NotSent' | 'PendingJudgeEndorsement' | 'JudgeEndorsed' | 'FinalArchived';

const UI_CATEGORIES: Array<{
  id: UiCategory;
  label: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  bgDark: string;
  description: string;
}> = [
  {
    id: 'marriage',
    label: 'الزواج',
    icon: HeartPulse,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    bgDark: 'bg-emerald-500/10',
    description: 'رسوم الزواج والعقود الشرعية',
  },
  {
    id: 'divorce',
    label: 'الطلاق',
    icon: ScrollText,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
    bgDark: 'bg-red-500/10',
    description: 'رسوم الطلاق والفسخ والخلع',
  },
  {
    id: 'property',
    label: 'الأملاك',
    icon: LayoutGrid,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    bgDark: 'bg-blue-500/10',
    description: 'رسوم البيع والشراء والعقارات',
  },
  {
    id: 'inheritance',
    label: 'التركات',
    icon: Book,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    bgDark: 'bg-slate-500/10',
    description: 'رسوم التركات والوصايا والإرث',
  },
  {
    id: 'misc',
    label: 'باقي الوثائق',
    icon: FolderArchive,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    bgDark: 'bg-amber-500/10',
    description: 'الوثائق الأخرى والشهادات',
  },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) return '---';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleString('ar-MA');
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

function judgeWorkflowBadge(status: SignedDeedWorkflowStatus, readyForJudge: boolean) {
  switch (status) {
    case 'FinalArchived':
      return {
        label: 'مؤرشف نهائياً',
        className: 'bg-slate-900 text-white',
      };
    case 'JudgeEndorsed':
      return {
        label: 'مخاطب عليه من طرف قاضي التوثيق',
        className: 'bg-emerald-100 text-emerald-700',
      };
    case 'PendingJudgeEndorsement':
      return {
        label: 'مخاطب عليه - قيد الخطاب',
        className: 'bg-orange-100 text-orange-700',
      };
    case 'NotSent':
    default:
      return readyForJudge
        ? {
            label: 'جاهز للإحالة',
            className: 'bg-blue-100 text-blue-700',
          }
        : {
            label: 'غير مُحال',
            className: 'bg-amber-100 text-amber-700',
          };
  }
}

export const SignedRasmsPage: React.FC = () => {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const isInternalModule = location.search.includes('module=signedRasms') || location.pathname.startsWith('/signed-rasms');

  const [selectedCategory, setSelectedCategory] = useState<UiCategory | null>(null);

  const signedQuery = trpc.feesAgent.documents.listSignedDeeds.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken,
      staleTime: 30_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  // IMPORTANT: keep hooks (useMemo) above any conditional returns to
  // preserve hook order across loading/error/success renders.
  const rows = (signedQuery.data || []) as Array<{
    id: string;
    savedRasmId: string;
    category: SignedDeedCategory;
    signatureTimestamp: string;
    createdAt: string;
    readyForJudge: boolean;
    judgeWorkflowStatus: SignedDeedWorkflowStatus;
    fileNumber: string | null;
    documentType: string | null;
    inclusion: { registerNumber: string | null; certificateNumber: string | null; court: string | null; inclusionDate: string | null } | null;
  }>;

  const rowsByCategory = useMemo(() => {
    const grouped: Record<UiCategory, typeof rows> = {
      marriage: [],
      divorce: [],
      property: [],
      inheritance: [],
      misc: [],
    };

    rows.forEach((r) => {
      grouped[toUiCategory(r.category)].push(r);
    });

    (Object.keys(grouped) as UiCategory[]).forEach((k) => {
      grouped[k].sort(
        (a, b) =>
          new Date(b.signatureTimestamp || b.createdAt).getTime() -
          new Date(a.signatureTimestamp || a.createdAt).getTime()
      );
    });

    return grouped;
  }, [rows]);

  const categoryCounts = useMemo(() => {
    return UI_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = rowsByCategory[cat.id].length;
      return acc;
    }, {} as Record<UiCategory, number>);
  }, [rowsByCategory]);

  const workflowCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.judgeWorkflowStatus === 'FinalArchived') acc.finalArchived += 1;
        else if (row.judgeWorkflowStatus === 'JudgeEndorsed') acc.endorsed += 1;
        else if (row.judgeWorkflowStatus === 'PendingJudgeEndorsement') acc.pending += 1;
        else if (row.readyForJudge) acc.ready += 1;
        else acc.notSent += 1;
        return acc;
      },
      { finalArchived: 0, endorsed: 0, pending: 0, ready: 0, notSent: 0 }
    );
  }, [rows]);

  const latestRows = useMemo(() => rows.slice(0, 4), [rows]);

  const totalCount = useMemo(() => rows.length, [rows.length]);

  if (signedQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-bold">جاري تحميل الرسوم الموقعة...</p>
        </div>
      </div>
    );
  }

  if (signedQuery.error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">خطأ في تحميل الرسوم الموقعة</h2>
          <p className="text-slate-600 font-bold mb-6">{(signedQuery.error as any)?.message || 'تعذر تحميل البيانات'}</p>
          <button
            onClick={() => {
              if (isInternalModule) {
                setSelectedCategory(null);
              } else {
                navigate('/dashboard?module=fees');
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    const categoryInfo = UI_CATEGORIES.find((c) => c.id === selectedCategory);
    const docs = rowsByCategory[selectedCategory];

    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="w-full px-4 md:px-8 py-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-bold transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
              العودة إلى الفئات
            </button>

            <div className="flex items-center justify-between gap-4">
              {categoryInfo ? (
                <>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 ${categoryInfo.bg} rounded-2xl flex items-center justify-center shadow-md`}
                    >
                      <categoryInfo.icon className={`w-8 h-8 ${categoryInfo.color}`} />
                    </div>
                    <div>
                      <h1 className={`text-3xl md:text-4xl font-black ${categoryInfo.color}`}
                      >
                        {categoryInfo.label}
                      </h1>
                      <p className="text-slate-600 font-bold text-sm mt-1">
                        {docs.length} رسم موقع
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <h1 className="text-3xl font-black text-slate-900">الرسوم الموقعة</h1>
                  <p className="text-slate-600 font-bold text-sm mt-1">{docs.length} رسم موقع</p>
                </div>
              )}

              <div className="hidden md:flex items-center gap-2 text-slate-600 font-bold">
                <FolderCheck className="w-5 h-5" />
                <span>مرحلة ما بعد التوقيع</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-4 md:px-8 py-8">
            {docs.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl mx-auto text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">لا توجد رسوم موقعة</h2>
                <p className="text-slate-600 font-bold">لا توجد أي رسوم في هذه الفئة حتى الآن.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {docs.map((r) => {
                  const badge = judgeWorkflowBadge(r.judgeWorkflowStatus, r.readyForJudge);
                  return (
                  <button
                    key={r.id}
                    onClick={() => isInternalModule ? navigate(`?module=signedRasms&id=${r.id}`) : navigate(`/signed-rasms/${r.id}`)}
                    className="text-right bg-white rounded-3xl shadow-lg border border-slate-200 hover:shadow-xl transition-all p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span>{categoryLabel(r.category)}</span>
                        </div>
                        <p className="text-slate-600 font-bold text-sm mt-1">
                          رقم الوثيقة: {r.fileNumber || 'قيد الانتظار'}
                        </p>
                        <p className="text-slate-600 font-bold text-sm">
                          سجل التضمين: {r.inclusion?.registerNumber || '---'}
                        </p>
                      </div>
                      <div className="text-left">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-slate-500 font-bold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>تاريخ التوقيع: {formatDateTime(r.signatureTimestamp || r.createdAt)}</span>
                    </div>

                    <div className="mt-3 text-slate-600 font-bold text-sm">
                      المحكمة: {r.inclusion?.court || '---'}
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[radial-gradient(circle_at_top,#f7efe2_0%,#f8fafc_30%,#edf3f8_100%)] flex flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white/90 shadow-md backdrop-blur-sm">
        <div className="w-full px-4 py-5 md:px-8">
          <button
            onClick={() => {
              if (location.search.includes('module=signedRasms')) {
                navigate('/dashboard?module=fees');
              } else if (location.pathname.startsWith('/signed-rasms')) {
                navigate('/fees');
              } else {
                navigate(-1);
              }
            }}
            className="mb-4 flex items-center gap-2 font-bold text-slate-600 transition-colors hover:text-slate-900"
          >
            <ChevronRight className="w-5 h-5" />
            العودة
          </button>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr] xl:items-stretch">
            <div className="rounded-[2rem] border border-[#e7dcc8] bg-[linear-gradient(135deg,#ffffff_0%,#f7f1e6_100%)] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="text-right">
                  <h1 className="mb-2 text-3xl font-black text-slate-900 md:text-4xl font-maghribi">الرسوم الموقعة</h1>
                  <p className="font-bold text-slate-600">لوحة عرض مضغوطة للرسوم الموقعة، مع توزيع أوضح للفئات وآخر الرسوم المعتمدة.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">الإجمالي</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{totalCount}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">مؤرشف</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{workflowCounts.finalArchived}</div>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">مخاطب</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{workflowCounts.endorsed}</div>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">قيد المعالجة</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{workflowCounts.pending + workflowCounts.ready + workflowCounts.notSent}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d7e7ec] bg-[linear-gradient(135deg,#f6fbfd_0%,#eef7fb_100%)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-right">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">Post Signature</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-maghribi">مرحلة ما بعد التوثيق</div>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">اختر فئة لعرض الرسوم الموقعة أو راجع أحدث الرسوم أسفل الصفحة للوصول السريع.</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <FolderCheck className="h-7 w-7 text-sky-700" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-right">
                <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
                  <div className="text-xs font-black text-slate-500">جاهز للإحالة</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{workflowCounts.ready}</div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
                  <div className="text-xs font-black text-slate-500">غير محال</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{workflowCounts.notSent}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 py-6 md:px-8">
          {rows.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl mx-auto text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">لا توجد رسوم موقعة بعد</h2>
              <p className="text-slate-600 font-bold">ستظهر هنا الرسوم التي تم حفظها وتسجيلها بعد اكتمال التوقيع.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
              <div className="rounded-[2rem] border border-[#e7dcc8] bg-white/90 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-900">الفئات</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">تم توزيع الفئات ضمن بطاقات أقصر وأكثر كثافة لملء المساحة المتاحة.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Categories</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{UI_CATEGORIES.length}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {UI_CATEGORIES.map((category) => {
                    const categoryRows = rowsByCategory[category.id];
                    const latestInCategory = categoryRows[0];
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`group relative overflow-hidden rounded-[1.8rem] border ${category.border} ${category.bg} p-5 text-right shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                      >
                        <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${category.bgDark}`}></div>

                        <div className="relative space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-right">
                              <h3 className={`text-2xl font-black ${category.color}`}>{category.label}</h3>
                              <p className="mt-1 text-xs font-bold text-slate-500">{category.description}</p>
                            </div>
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ${category.color}`}>
                              <category.icon className="h-7 w-7" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className={`${category.color} rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm`}>
                              {categoryCounts[category.id]} رسم
                            </span>
                            <span className="text-xs font-black text-slate-400">فتح الفئة</span>
                          </div>

                          <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-right shadow-sm">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">أحدث رسم</div>
                            <div className="mt-2 line-clamp-1 text-sm font-black text-slate-900">
                              {latestInCategory?.fileNumber || latestInCategory?.documentType || 'لا توجد رسوم بعد'}
                            </div>
                            <div className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                              {latestInCategory ? formatDateTime(latestInCategory.signatureTimestamp || latestInCategory.createdAt) : 'بانتظار أول رسم'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#e7dcc8] bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-900">أحدث الرسوم</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">اختصارات مباشرة لآخر الرسوم الموقعة.</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="h-6 w-6 text-slate-700" />
                  </div>
                </div>

                <div className="space-y-3">
                  {latestRows.map((row) => {
                    const badge = judgeWorkflowBadge(row.judgeWorkflowStatus, row.readyForJudge);
                    return (
                      <button
                        key={row.id}
                        onClick={() => isInternalModule ? navigate(`?module=signedRasms&id=${row.id}`) : navigate(`/signed-rasms/${row.id}`)}
                        className="w-full rounded-[1.4rem] border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-1 text-sm font-black text-slate-900">{row.fileNumber || row.documentType || categoryLabel(row.category)}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">{categoryLabel(row.category)} • {formatDateTime(row.signatureTimestamp || row.createdAt)}</div>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {latestRows.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500">
                      لا توجد رسوم حديثة حالياً.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
