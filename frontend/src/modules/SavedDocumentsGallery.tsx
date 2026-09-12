import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Eye, 
  FileText, 
  FolderOpen, 
  RefreshCw, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  FileSignature, 
  ShieldCheck, 
  Clock, 
  Users 
} from 'lucide-react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type FilterKey = 'all' | 'audited' | 'marriage' | 'divorce' | 'property' | 'inheritance' | 'misc';

type SavedRow = {
  id: string;
  fileNumber: string | null;
  documentType: string | null;
  status?: string | null;
  payload?: Record<string, any> | null;
  partyNames?: string[];
  createdAt: string;
  attachmentsCount: number;
  latestDraftUpdatedAt: string | null;
  latestDraftDocxUrl?: string | null;
  displayUrl?: string | null;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'audited', label: '🟢 مدققة وجاهزة للتوقيع' },
  { key: 'marriage', label: 'الزواج' },
  { key: 'divorce', label: 'الطلاق' },
  { key: 'property', label: 'الأملاك' },
  { key: 'inheritance', label: 'التركات' },
  { key: 'misc', label: 'أخرى' },
];

function isAuditedDocument(row: SavedRow): boolean {
  const payload = row.payload || {};
  return (
    payload.auditStatus === 'completed' ||
    payload.storedInLibrary === true ||
    payload.readyForSigning === true ||
    payload.isAudited === true ||
    !!payload.auditHubInclusion ||
    row.status === 'audited' ||
    row.status === 'ready_for_signing'
  );
}

function categorizeDocumentType(value: string | null | undefined): FilterKey {
  const docType = String(value || '');
  if (docType.includes('زواج') || docType.includes('نكاح')) return 'marriage';
  if (docType.includes('طلاق') || docType.includes('خلف')) return 'divorce';
  if (docType.includes('عقار') || docType.includes('بيع') || docType.includes('ملك') || docType.includes('أملاك') || docType.includes('املاك') || docType.includes('ايجار') || docType.includes('كراء') || docType.includes('تحبيس') || docType.includes('هواء')) {
    return 'property';
  }
  if (docType.includes('إرث') || docType.includes('تركات') || docType.includes('ترك') || docType.includes('ارث') || docType.includes('فريضة')) {
    return 'inheritance';
  }
  return 'misc';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '---';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '---';
  return date.toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export const SavedDocumentsGallery: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isInternalModule = location.search.includes('module=savedDocuments');
  const fromAuditHubId = location.state?.fromAuditHubId;
  const { sessionToken } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const savedRasmsQuery = trpc.feesAgent.documents.listSavedRasms.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    }
  );

  const mergedRows = useMemo(() => {
    return (savedRasmsQuery.data || []) as SavedRow[];
  }, [savedRasmsQuery.data]);

  const auditedCount = useMemo(() => {
    return mergedRows.filter(isAuditedDocument).length;
  }, [mergedRows]);

  const rows = useMemo(() => {
    const source = mergedRows;
    const q = search.trim().toLowerCase();

    return source
      .filter((row) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'audited') return isAuditedDocument(row);
        return categorizeDocumentType(row.documentType) === activeFilter;
      })
      .filter((row) => {
        if (!q) return true;
        const partiesStr = (row.partyNames || []).join(' ');
        return [row.fileNumber || '', row.documentType || '', row.id, partiesStr]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.latestDraftUpdatedAt || a.createdAt || '') || 0;
        const bTime = Date.parse(b.latestDraftUpdatedAt || b.createdAt || '') || 0;
        return bTime - aTime;
      });
  }, [activeFilter, mergedRows, search]);

  const totalCount = mergedRows.length;

  const handleBack = () => {
    if (fromAuditHubId) {
      navigate(`/dashboard?module=auditHub&id=${fromAuditHubId}`);
    } else if (isInternalModule) {
      navigate('/dashboard?module=fees');
    } else {
      navigate('/');
    }
  };

  return (
    <div className={`min-h-screen ${isInternalModule ? 'bg-transparent' : 'bg-[#f5f6f8] p-6'}`} dir="rtl">
      <div className={`mx-auto max-w-7xl ${isInternalModule ? '' : 'py-8'}`}>
        <div className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${isInternalModule ? 'border-none shadow-none' : ''}`}>
          <div className="border-b border-slate-100 px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
                >
                  <ChevronRight className="h-4 w-4" />
                  {fromAuditHubId ? 'الرجوع إلى محرر AuditHub' : 'رجوع إلى القائمة الرئيسية'}
                </button>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  <FolderOpen className="h-4 w-4" />
                  المستندات المحفوظة
                </div>
                <h1 className="text-4xl font-black text-slate-900 font-maghribi">مكتبة الوثائق المحفوظة</h1>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  المستودع الآمن للرسوم المحفوظة والمدققة عبر مسار AuditHub قبل التوقيع النهائي.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div 
                  onClick={() => setActiveFilter('all')}
                  className={`cursor-pointer rounded-2xl p-4 transition ${activeFilter === 'all' ? 'ring-2 ring-slate-900 shadow-md' : 'hover:opacity-90'} bg-slate-950 text-white`}
                >
                  <div className="text-xs font-bold text-slate-300">إجمالي الوثائق</div>
                  <div className="mt-1 text-3xl font-black">{totalCount}</div>
                </div>

                <div 
                  onClick={() => setActiveFilter('audited')}
                  className={`cursor-pointer rounded-2xl p-4 transition ${activeFilter === 'audited' ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:opacity-95'} bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 border border-emerald-500/30 text-white`}
                >
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    مدققة (جاهزة للتوقيع)
                  </div>
                  <div className="mt-1 text-3xl font-black text-emerald-300">{auditedCount}</div>
                </div>

                <button
                  type="button"
                  onClick={() => savedRasmsQuery.refetch()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  تحديث القائمة
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث برقم الملف، اسم الطرف، أو نوع الوثيقة..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-4 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => {
                  const active = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                        active
                          ? filter.key === 'audited' 
                            ? 'bg-emerald-700 text-white shadow-sm' 
                            : 'bg-[#102043] text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            {savedRasmsQuery.isLoading && (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
                  <p className="mt-4 text-sm font-black text-slate-600">جاري تحميل الوثائق...</p>
                </div>
              </div>
            )}

            {savedRasmsQuery.isError && (
              <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
                <p className="text-lg font-black text-rose-700">تعذر تحميل الوثائق المحفوظة</p>
                <p className="mt-2 text-sm font-bold text-rose-600">
                  {(savedRasmsQuery.error as any)?.message || 'حدث خطأ غير متوقع'}
                </p>
                <button
                  type="button"
                  onClick={() => savedRasmsQuery.refetch()}
                  className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!savedRasmsQuery.isLoading && !savedRasmsQuery.isError && rows.length === 0 && (
              <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <FileText className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-xl font-black text-slate-700">لا توجد وثائق مطابقة</p>
                  <p className="mt-2 text-sm font-bold text-slate-500">غيّر الفلتر أو عبارة البحث ثم أعد المحاولة.</p>
                </div>
              </div>
            )}

            {!savedRasmsQuery.isLoading && !savedRasmsQuery.isError && rows.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-[1.3fr_1.2fr_120px_100px_130px_220px] gap-4 bg-slate-50 px-6 py-4 text-xs font-black text-slate-500">
                  <div>نوع الوثيقة والحالة</div>
                  <div>الأطراف المعنية</div>
                  <div>رقم الملف</div>
                  <div>المرفقات</div>
                  <div>تاريخ الحفظ</div>
                  <div className="text-left">الإجراءات المتاحة</div>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => {
                    const audited = isAuditedDocument(row);
                    const parties = row.partyNames && row.partyNames.length > 0
                      ? row.partyNames.join(' • ')
                      : (row.payload?.sellers?.[0]?.name ? `${row.payload?.sellers?.[0]?.name}...` : '---');

                    return (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1.3fr_1.2fr_120px_100px_130px_220px] items-center gap-4 px-6 py-5 transition hover:bg-slate-50/80"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{row.documentType || 'غير محدد'}</span>
                            {audited && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 shadow-xs">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                مدققة (جاهزة للتوقيع)
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs font-mono font-bold text-slate-400">{row.id}</div>
                        </div>

                        <div className="text-xs font-bold text-slate-700 truncate" title={parties}>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{parties}</span>
                          </div>
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-700">{row.fileNumber || '---'}</div>

                        <div className="text-xs font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                            {row.attachmentsCount || 0}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(row.latestDraftUpdatedAt || row.createdAt)}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard?module=auditHub&id=${row.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="فتح الرسم في مسار المراقبة والتضمين لمعاينته وتعديله"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            مسار التضمين
                          </button>

                          {audited ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/notary-signing-portal/sign/${row.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-3 py-1.5 text-xs font-black text-white shadow-sm shadow-emerald-700/20 transition hover:brightness-110 active:scale-95 cursor-pointer"
                              title="الانتقال إلى رواق التوقيع لتوقيع الرسم"
                            >
                              <FileSignature className="h-3.5 w-3.5" />
                              توقيع الرسم
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed opacity-75 select-none"
                              title="الرسم غير جاهز للتوقيع. يجب استكمال تدقيقه وتضمينه أولاً عبر زر 'مسار التضمين'"
                            >
                              <FileSignature className="h-3.5 w-3.5 text-slate-400" />
                              غير جاهز للتوقيع
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedDocumentsGallery;
