import React from 'react';
import { trpc } from '../trpc';

type Mode = 'registry' | 'identity';
type ResultsView = 'table' | 'cards';
type ResultFilter = 'all' | 'needs_review' | 'reviewed' | 'with_notes' | 'in_daily';

type ResultRow = {
  id: string;
  source: string;
  parties: string;
  cin: string;
  registryNumber: string;
  page: string;
  date: string;
};

const STORAGE_KEY = 'judge_official_indexation_state_v5';

function loadSaved(): { reviewed: Record<string, boolean>; notes: Record<string, string>; daily: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reviewed: {}, notes: {}, daily: [] };
    const parsed = JSON.parse(raw);
    return {
      reviewed: parsed.reviewed ?? {},
      notes: parsed.notes ?? {},
      daily: parsed.daily ?? [],
    };
  } catch {
    return { reviewed: {}, notes: {}, daily: [] };
  }
}

function persist(next: Partial<{ reviewed: Record<string, boolean>; notes: Record<string, string>; daily: string[] }>) {
  const current = loadSaved();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      reviewed: next.reviewed ?? current.reviewed,
      notes: next.notes ?? current.notes,
      daily: next.daily ?? current.daily,
    })
  );
}

function sourceLabel(source: string) {
  switch (source) {
    case 'marriage':
      return 'زواج';
    case 'divorce':
      return 'طلاق';
    case 'property':
      return 'أملاك';
    case 'inheritance':
      return 'تركات';
    case 'other':
      return 'وثائق أخرى';
    default:
      return source;
  }
}

function badgeClass(variant: 'green' | 'orange' | 'blue' | 'slate') {
  switch (variant) {
    case 'green':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'orange':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'blue':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function Badge({ label, variant }: { label: string; variant: 'green' | 'orange' | 'blue' | 'slate' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold ${badgeClass(variant)}`}>
      {label}
    </span>
  );
}

export function JudgeOfficialIndexation() {
  const [mode, setMode] = React.useState<Mode>('registry');
  const [view, setView] = React.useState<ResultsView>('table');
  const [resultFilter, setResultFilter] = React.useState<ResultFilter>('all');
  const [resultSearch, setResultSearch] = React.useState('');
  const [enabled, setEnabled] = React.useState(false);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sideTab, setSideTab] = React.useState<'details' | 'daily'>('details');

  const [registryParams, setRegistryParams] = React.useState({
    serial: '',
    registerNumber: '',
    page: '',
    from: '',
    to: '',
  });

  const [identityParams, setIdentityParams] = React.useState({
    fullName: '',
    cin: '',
    from: '',
    to: '',
  });

  const identityQuery = trpc.search.byIdentity.useQuery(
    {
      recordType: 'all',
      name: identityParams.fullName || undefined,
      cin: identityParams.cin || undefined,
      from: identityParams.from || undefined,
      to: identityParams.to || undefined,
    },
    { enabled: enabled && mode === 'identity', keepPreviousData: true, retry: false }
  );

  const registryQuery = trpc.search.byRegistry.useQuery(
    {
      bookType: undefined,
      registryNumber: registryParams.registerNumber ? Number(registryParams.registerNumber) : undefined,
      registryCount: undefined,
      registryPage: registryParams.page ? Number(registryParams.page) : undefined,
    },
    { enabled: enabled && mode === 'registry', keepPreviousData: true, retry: false }
  );

  const isSearching = enabled && (mode === 'identity' ? identityQuery.isFetching : registryQuery.isFetching);

  const saved = React.useMemo(() => loadSaved(), []);
  const [reviewedMap, setReviewedMap] = React.useState<Record<string, boolean>>(saved.reviewed);
  const [notesMap, setNotesMap] = React.useState<Record<string, string>>(saved.notes);
  const [dailyDispatch, setDailyDispatch] = React.useState<string[]>(saved.daily);
  const [noteDraft, setNoteDraft] = React.useState('');

  const results: ResultRow[] = React.useMemo(() => {
    if (!enabled) return [];

    const buildRow = (r: any): ResultRow => ({
      id: String(r.id ?? ''),
      source: String(r.source ?? ''),
      date: String(r.inclusion_date ?? ''),
      registryNumber: String(r.registry_number ?? r.divorce_registry_number ?? ''),
      page: String(r.registry_page ?? r.divorce_registry_page ?? ''),
      parties:
        r.source === 'marriage' || r.source === 'divorce'
          ? [r.husband_name, r.wife_name].filter(Boolean).join(' / ')
          : r.parties_names || r.heirs_names || r.applicants_names || r.deceased_name || '—',
      cin:
        r.source === 'marriage' || r.source === 'divorce'
          ? [r.husband_cin, r.wife_cin].filter(Boolean).join(' / ')
          : r.parties_cin || r.applicants_cin || '—',
    });

    if (mode === 'identity') return (identityQuery.data ?? []).map(buildRow);

    const data = registryQuery.data;
    const flatten: any[] = [];
    if (data?.marriage?.length) flatten.push(...data.marriage.map((r: any) => ({ source: 'marriage', ...r })));
    if (data?.divorce?.length) flatten.push(...data.divorce.map((r: any) => ({ source: 'divorce', ...r })));
    if (data?.property?.length) flatten.push(...data.property.map((r: any) => ({ source: 'property', ...r })));
    if (data?.inheritance?.length) flatten.push(...data.inheritance.map((r: any) => ({ source: 'inheritance', ...r })));
    if (data?.other?.length) flatten.push(...data.other.map((r: any) => ({ source: 'other', ...r })));

    return flatten
      .filter((r) => {
        if (!registryParams.serial) return true;
        return String(r.id ?? '').includes(registryParams.serial);
      })
      .filter((r) => {
        if (!registryParams.from && !registryParams.to) return true;
        const date = String(r.inclusion_date ?? '');
        if (!date) return false;
        if (registryParams.from && date < registryParams.from) return false;
        if (registryParams.to && date > registryParams.to) return false;
        return true;
      })
      .map(buildRow);
  }, [
    enabled,
    mode,
    identityQuery.data,
    registryQuery.data,
    registryParams.serial,
    registryParams.from,
    registryParams.to,
  ]);

  const filteredResults = React.useMemo(() => {
    const q = resultSearch.trim().toLowerCase();
    return results
      .filter((r) => {
        if (resultFilter === 'all') return true;
        if (resultFilter === 'reviewed') return !!reviewedMap[r.id];
        if (resultFilter === 'needs_review') return !reviewedMap[r.id];
        if (resultFilter === 'with_notes') return !!notesMap[r.id];
        if (resultFilter === 'in_daily') return dailyDispatch.includes(r.id);
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.id} ${r.source} ${r.parties} ${r.cin} ${r.registryNumber} ${r.page} ${r.date}`.toLowerCase();
        return hay.includes(q);
      });
  }, [results, resultFilter, resultSearch, reviewedMap, notesMap, dailyDispatch]);

  const selectedRow = React.useMemo(
    () => (selectedId ? results.find((r) => r.id === selectedId) ?? null : null),
    [results, selectedId]
  );

  React.useEffect(() => {
    if (!selectedId) return;
    setNoteDraft(notesMap[selectedId] ?? '');
  }, [selectedId, notesMap]);

  const reviewedCount = React.useMemo(() => results.filter((r) => reviewedMap[r.id]).length, [results, reviewedMap]);
  const notesCount = React.useMemo(() => results.filter((r) => !!notesMap[r.id]).length, [results, notesMap]);

  const markReviewed = (id: string) => {
    setReviewedMap((prev) => {
      const next = { ...prev, [id]: true };
      persist({ reviewed: next });
      return next;
    });
  };

  const toggleDaily = (id: string) => {
    setDailyDispatch((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      persist({ daily: next });
      return next;
    });
  };

  const clearDaily = () => {
    setDailyDispatch(() => {
      persist({ daily: [] });
      return [];
    });
  };

  const saveNote = (id: string) => {
    setNotesMap((prev) => {
      const next = { ...prev, [id]: noteDraft.trim() };
      persist({ notes: next });
      return next;
    });
  };

  const exportDaily = () => {
    const payload = { generatedAt: new Date().toISOString(), items: dailyDispatch };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-dispatch-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSearch = () => {
    setEnabled(false);
    setResultFilter('all');
    setResultSearch('');
    setSelectedId(null);
    setSideTab('details');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnabled(true);
    if (mode === 'identity') identityQuery.refetch();
    if (mode === 'registry') registryQuery.refetch();
  };

  const selectRow = (id: string) => {
    setSelectedId(id);
    setSideTab('details');
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-extrabold text-slate-900">الفهرسة القضائية المركزية</h1>
            <p className="mt-1 text-sm text-slate-600">محرك بحث موحد للرسوم الرسمية المضمنة — للرقابة والتأشير دون تدخل في الجوهر.</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {isSearching ? <Badge label="جاري البحث..." variant="blue" /> : null}
              <Badge label={`النتائج: ${enabled ? results.length : 0}`} variant="slate" />
              <Badge label={`تم الاطلاع: ${reviewedCount}`} variant="green" />
              <Badge label={`ملاحظات: ${notesCount}`} variant="blue" />
              <Badge label={`ضمن الإرسال: ${dailyDispatch.length}`} variant="slate" />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setView('table')}
              className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                view === 'table' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              جدول
            </button>
            <button
              type="button"
              onClick={() => setView('cards')}
              className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                view === 'cards' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              بطاقات
            </button>
            <button
              type="button"
              onClick={resetSearch}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
            >
              إعادة ضبط
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,420px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap justify-end gap-2">
                {(
                  [
                    ['all', 'الكل'],
                    ['needs_review', 'يحتاج اطلاع'],
                    ['reviewed', 'تم الاطلاع'],
                    ['with_notes', 'به ملاحظات'],
                    ['in_daily', 'ضمن الإرسال'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setResultFilter(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                      resultFilter === key
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-slate-600">({filteredResults.length})</div>
                <input
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="ابحث داخل النتائج..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm md:w-80"
                />
              </div>
            </div>
          </div>

          <div className="p-4">
            {!enabled ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
                قم بإجراء بحث لعرض النتائج.
              </div>
            ) : null}

            {enabled && filteredResults.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {enabled && filteredResults.length > 0 && view === 'table' ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-right">المعرف</th>
                      <th className="p-3 text-right">النوع</th>
                      <th className="p-3 text-right">الأطراف</th>
                      <th className="p-3 text-right">CIN</th>
                      <th className="p-3 text-right">السجل/الصحيفة</th>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map((r) => {
                      const isReviewed = !!reviewedMap[r.id];
                      const hasNote = !!notesMap[r.id];
                      const inDaily = dailyDispatch.includes(r.id);
                      const isSelected = r.id === selectedId;

                      return (
                        <tr
                          key={`${r.source}-${r.id}`}
                          className={`cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}
                          onClick={() => selectRow(r.id)}
                        >
                          <td className="p-3 text-right font-mono text-xs text-slate-700">{r.id}</td>
                          <td className="p-3 text-right">{sourceLabel(r.source)}</td>
                          <td className="p-3 text-right">{r.parties}</td>
                          <td className="p-3 text-right">{r.cin}</td>
                          <td className="p-3 text-right">
                            <div className="text-sm font-bold text-slate-900">{r.registryNumber || '—'}</div>
                            <div className="text-xs text-slate-500">{r.page ? `الصحيفة ${r.page}` : '—'}</div>
                          </td>
                          <td className="p-3 text-right">{r.date || '—'}</td>
                          <td className="p-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {isReviewed ? <Badge label="تم الاطلاع" variant="green" /> : <Badge label="يحتاج اطلاع" variant="orange" />}
                              {hasNote ? <Badge label="ملاحظة" variant="blue" /> : null}
                              {inDaily ? <Badge label="ضمن الإرسال" variant="slate" /> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {enabled && filteredResults.length > 0 && view === 'cards' ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredResults.map((r) => {
                  const isReviewed = !!reviewedMap[r.id];
                  const hasNote = !!notesMap[r.id];
                  const inDaily = dailyDispatch.includes(r.id);
                  const isSelected = r.id === selectedId;

                  return (
                    <button
                      key={`${r.source}-${r.id}`}
                      type="button"
                      onClick={() => selectRow(r.id)}
                      className={`rounded-2xl border p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                        isSelected ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">{r.parties}</div>
                          <div className="mt-1 text-xs text-slate-600">{r.cin}</div>
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            {isReviewed ? <Badge label="تم الاطلاع" variant="green" /> : <Badge label="يحتاج اطلاع" variant="orange" />}
                            {hasNote ? <Badge label="ملاحظة" variant="blue" /> : null}
                            {inDaily ? <Badge label="ضمن الإرسال" variant="slate" /> : null}
                          </div>
                        </div>
                        <div className="text-left text-xs text-slate-600">
                          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-bold">{sourceLabel(r.source)}</div>
                          <div className="mt-2 font-mono text-[11px]">{r.id}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-[11px] text-slate-500">السجل</div>
                          <div className="mt-1 font-extrabold text-slate-800">{r.registryNumber || '—'}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-[11px] text-slate-500">التاريخ</div>
                          <div className="mt-1 font-extrabold text-slate-800">{r.date || '—'}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="text-right">
                <div className="text-sm font-extrabold text-slate-900">البحث</div>
                <div className="mt-1 text-xs text-slate-600">اختر نمط البحث وأدخل المعايير.</div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode('registry')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                    mode === 'registry'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  بحث بالسجل
                </button>
                <button
                  type="button"
                  onClick={() => setMode('identity')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                    mode === 'identity'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  بحث بالهوية
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3">
              {mode === 'registry' ? (
                <>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="الرقم التسلسلي الوطني (اختياري)"
                    value={registryParams.serial}
                    onChange={(e) => setRegistryParams((p) => ({ ...p, serial: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      placeholder="رقم السجل"
                      value={registryParams.registerNumber}
                      onChange={(e) => setRegistryParams((p) => ({ ...p, registerNumber: e.target.value }))}
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      placeholder="الصحيفة"
                      value={registryParams.page}
                      onChange={(e) => setRegistryParams((p) => ({ ...p, page: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      value={registryParams.from}
                      onChange={(e) => setRegistryParams((p) => ({ ...p, from: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      value={registryParams.to}
                      onChange={(e) => setRegistryParams((p) => ({ ...p, to: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="الاسم الكامل"
                    value={identityParams.fullName}
                    onChange={(e) => setIdentityParams((p) => ({ ...p, fullName: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                    placeholder="CIN"
                    value={identityParams.cin}
                    onChange={(e) => setIdentityParams((p) => ({ ...p, cin: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      value={identityParams.from}
                      onChange={(e) => setIdentityParams((p) => ({ ...p, from: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                      value={identityParams.to}
                      onChange={(e) => setIdentityParams((p) => ({ ...p, to: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetSearch}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  مسح
                </button>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  بحث
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSideTab('details')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                      sideTab === 'details'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    تفاصيل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideTab('daily')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                      sideTab === 'daily'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    الإرسال اليومي
                  </button>
                </div>
                <div className="text-xs text-slate-500">{sideTab === 'daily' ? `${dailyDispatch.length}` : selectedId ? `#${selectedId}` : ''}</div>
              </div>
            </div>

            <div className="p-4">
              {sideTab === 'daily' ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                    <div className="text-sm font-extrabold text-slate-900">عدد الرسوم ضمن الإرسال: {dailyDispatch.length}</div>
                    <div className="mt-1 text-xs text-slate-600">تصدير القائمة بصيغة JSON لأغراض التتبع.</div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={exportDaily}
                        disabled={dailyDispatch.length === 0}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        تصدير JSON
                      </button>
                      <button
                        type="button"
                        onClick={clearDaily}
                        disabled={dailyDispatch.length === 0}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        تفريغ القائمة
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[320px] space-y-2 overflow-y-auto">
                    {dailyDispatch.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                        لم تتم إضافة أي رسم بعد.
                      </div>
                    ) : null}

                    {dailyDispatch.map((id) => {
                      const row = results.find((r) => r.id === id) ?? null;
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="min-w-0 text-right">
                            <button
                              type="button"
                              onClick={() => selectRow(id)}
                              className="block w-full truncate text-sm font-extrabold text-slate-900 hover:underline"
                            >
                              {row ? row.parties : `#${id}`}
                            </button>
                            <div className="mt-0.5 text-xs text-slate-600">{row ? sourceLabel(row.source) : '—'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleDaily(id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
                          >
                            إزالة
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!selectedRow ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                      اختر رسماً من النتائج لعرض التفاصيل.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900">{selectedRow.parties}</div>
                            <div className="mt-1 text-xs text-slate-600">{selectedRow.cin}</div>
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              {reviewedMap[selectedRow.id] ? <Badge label="تم الاطلاع" variant="green" /> : <Badge label="يحتاج اطلاع" variant="orange" />}
                              {notesMap[selectedRow.id] ? <Badge label="ملاحظة" variant="blue" /> : null}
                              {dailyDispatch.includes(selectedRow.id) ? <Badge label="ضمن الإرسال" variant="slate" /> : null}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-800">
                              {sourceLabel(selectedRow.source)}
                            </div>
                            <div className="mt-2 font-mono text-xs text-slate-700">{selectedRow.id}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[11px] text-slate-500">السجل / الصحيفة</div>
                            <div className="mt-1 font-extrabold text-slate-900">
                              {selectedRow.registryNumber || '—'} {selectedRow.page ? `• ${selectedRow.page}` : ''}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[11px] text-slate-500">التاريخ</div>
                            <div className="mt-1 font-extrabold text-slate-900">{selectedRow.date || '—'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => markReviewed(selectedRow.id)}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-800"
                        >
                          تأشير بالاطلاع
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDaily(selectedRow.id)}
                          className={`rounded-xl px-4 py-2 text-sm font-extrabold text-white ${
                            dailyDispatch.includes(selectedRow.id) ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-700 hover:bg-indigo-800'
                          }`}
                        >
                          {dailyDispatch.includes(selectedRow.id) ? 'إزالة من الإرسال' : 'إضافة للإرسال'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSideTab('daily')}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50"
                        >
                          فتح الإرسال اليومي
                        </button>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-right text-sm font-extrabold text-slate-900">ملاحظة تنظيمية</div>
                        <div className="mt-1 text-xs text-slate-600">يُرجى صياغة الملاحظة بلغة مهنية واضحة.</div>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="mt-3 h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                          placeholder="اكتب ملاحظتك هنا..."
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setNoteDraft('')}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                          >
                            مسح
                          </button>
                          <button
                            type="button"
                            onClick={() => saveNote(selectedRow.id)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                          >
                            حفظ الملاحظة
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
