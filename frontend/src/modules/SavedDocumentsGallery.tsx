import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Eye, FileText, FolderOpen, RefreshCw, Search, ChevronRight } from 'lucide-react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type FilterKey = 'all' | 'marriage' | 'divorce' | 'property' | 'inheritance' | 'misc';

type SavedRow = {
  id: string;
  fileNumber: string | null;
  documentType: string | null;
  createdAt: string;
  attachmentsCount: number;
  latestDraftUpdatedAt: string | null;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'marriage', label: 'الزواج' },
  { key: 'divorce', label: 'الطلاق' },
  { key: 'property', label: 'الأملاك' },
  { key: 'inheritance', label: 'التركات' },
  { key: 'misc', label: 'أخرى' },
];

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

  const rows = useMemo(() => {
    const source = mergedRows;
    const q = search.trim().toLowerCase();

    return source
      .filter((row) => activeFilter === 'all' || categorizeDocumentType(row.documentType) === activeFilter)
      .filter((row) => {
        if (!q) return true;
        return [row.fileNumber || '', row.documentType || '', row.id]
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
                  افتح أي رسم محفوظ مباشرة داخل AuditHub للمعاينة.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                  <div className="text-xs font-bold text-slate-300">إجمالي الوثائق</div>
                  <div className="mt-1 text-3xl font-black">{totalCount}</div>
                </div>
                <button
                  type="button"
                  onClick={() => savedRasmsQuery.refetch()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
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
                  placeholder="ابحث برقم الملف أو نوع الوثيقة"
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
                          ? 'bg-[#102043] text-white shadow-sm'
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
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[1.1fr_1fr_140px_130px_140px] gap-4 bg-slate-50 px-6 py-4 text-xs font-black text-slate-500">
                  <div>نوع الوثيقة</div>
                  <div>رقم الملف</div>
                  <div>المرفقات</div>
                  <div>التاريخ</div>
                  <div className="text-left">الإجراءات</div>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.1fr_1fr_140px_130px_140px] items-center gap-4 px-6 py-5 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-black text-slate-900">{row.documentType || 'غير محدد'}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{row.id}</div>
                      </div>
                      <div className="text-sm font-black text-slate-700">{row.fileNumber || '---'}</div>
                      <div className="text-sm font-black text-slate-600">{row.attachmentsCount || 0}</div>
                      <div className="inline-flex items-center gap-2 text-sm font-black text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(row.latestDraftUpdatedAt || row.createdAt)}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard?module=auditHub&id=${row.id}`)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
