import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

export type NationalExpendituresDashboardTab = 'overview' | 'operations' | 'budgets' | 'analytics' | 'reports' | 'compliance';

type NationalExpendituresDashboardProps = {
  embedded?: boolean;
  forcedTab?: NationalExpendituresDashboardTab;
};

const NATURE_LABEL: Record<string, string> = {
  operating: 'التسيير الإداري (Operating)',
  capex: 'الاستثمار (CAPEX)',
  training: 'التكوين والتدريب',
  professional_activities: 'الأنشطة المهنية',
  meetings_conferences: 'الاجتماعات والمؤتمرات',
  travel_accommodation: 'التنقل والإقامة',
  it_digital: 'الأنظمة المعلوماتية والتطوير الرقمي',
  legal_studies: 'الدراسات القانونية',
  professional_services: 'الخدمات المهنية (محاسبة/تدقيق/استشارة)',
  maintenance: 'الصيانة',
  reserves_compensation: 'الاحتياط والتعويضات',
  professional_solidarity: 'التضامن المهني',
};

const BODY_LABEL: Record<string, string> = {
  executive_office: 'المكتب التنفيذي',
  regional_council: 'المجالس الجهوية',
  standing_committee: 'اللجان الدائمة',
  presidency: 'الرئاسة',
  general_administration: 'الإدارة العامة',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  under_review: 'قيد المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  deferred: 'مؤجل',
};

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

function percent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: any[]) {
  const headers = [
    'operation_number',
    'payment_date',
    'payer_entity',
    'beneficiary_entity',
    'spending_nature',
    'time_granularity',
    'influencing_body',
    'document_type',
    'document_reference',
    'payment_method',
    'status',
    'amount',
    'currency',
    'controlling_entity',
    'review_notes',
    'payment_order_ref',
  ];

  const escape = (v: any) => {
    const s = String(v ?? '');
    const needs = /[\n\r,\"]/g.test(s);
    const out = s.replace(/\"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(','));
  }
  return lines.join('\n');
}

function Badge({ tone, label }: { tone: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; label: string }) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'yellow'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : tone === 'red'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : tone === 'blue'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-slate-50 text-slate-700 border-slate-200';
  return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cls}`}>{label}</span>;
}

const KPIBlock = ({ label, value, sub, icon, tone = 'indigo' }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {sub ? <p className="text-xs mt-1 text-slate-500">{sub}</p> : null}
    </div>
    <div className={`w-12 h-12 rounded-full ${tone === 'red' ? 'bg-rose-50 text-rose-600' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center text-xl`}>
      {icon}
    </div>
  </div>
);

function MiniMonthlyBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">التطور الشهري للمصاريف</h3>
        <div className="text-xs text-slate-500">آخر تحديث: مباشر من قاعدة البيانات</div>
      </div>
      <div className="h-44 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const v = values[i] ?? 0;
          const h = Math.max(2, Math.round((v / max) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full h-36 flex items-end">
                <div className="w-full bg-rose-500/80 rounded" style={{ height: `${h}%` }} title={`${i + 1}: ${formatMad(v)}`}></div>
              </div>
              <div className="text-[11px] text-slate-500">{i + 1}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const NationalExpendituresDashboard: React.FC<NationalExpendituresDashboardProps> = ({ embedded = false, forcedTab }) => {
  const { sessionToken, user } = useAuth();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tab, setTab] = useState<NationalExpendituresDashboardTab>('overview');
  const activeTab = forcedTab ?? tab;

  const isNational = user?.role === 'national_notary_authority';
  const enabled = !!sessionToken && !!user;

  const dashboard = trpc.expenditures.getDashboard.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled: enabled && isNational, staleTime: 15_000 }
  );

  const [filters, setFilters] = useState({
    q: '' as string,
    status: '' as string,
    spendingNature: '' as string,
    influencingBody: '' as string,
    fromDate: '' as string,
    toDate: '' as string,
  });

  const list = trpc.expenditures.listExpenses.useQuery(
    {
      sessionToken: sessionToken || '',
      reportYear: year,
      q: filters.q || null,
      status: (filters.status as any) || null,
      spendingNature: (filters.spendingNature as any) || null,
      influencingBody: (filters.influencingBody as any) || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      limit: 200,
    },
    { enabled, staleTime: 10_000 }
  );

  const budgets = trpc.expenditures.listBudgetLines.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled: enabled && isNational && activeTab === 'budgets', staleTime: 15_000 }
  );

  const utils = trpc.useUtils();

  const approve = trpc.expenditures.nationalApproveExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
    },
  });
  const reject = trpc.expenditures.nationalRejectExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
    },
  });
  const sendToReview = trpc.expenditures.nationalSendToReview.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
    },
  });
  const defer = trpc.expenditures.nationalDeferExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
    },
  });

  const submit = trpc.expenditures.submitExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
    },
  });

  const upsertBudget = trpc.expenditures.upsertBudgetLine.useMutation({
    onSuccess: () => {
      utils.expenditures.listBudgetLines.invalidate();
      utils.expenditures.getDashboard.invalidate();
    },
  });

  const createExpense = trpc.expenditures.createExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
      setCreateOpen(false);
    },
  });

  const updateExpense = trpc.expenditures.updateExpense.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
      utils.expenditures.getDashboard.invalidate();
      setEditOpen(false);
    },
  });

  const uploadDoc = trpc.expenditures.uploadSupportingDocument.useMutation({
    onSuccess: () => {
      utils.expenditures.listExpenses.invalidate();
    },
  });

  const ocrParse = trpc.ocr.parseText.useMutation();

  const totals = dashboard.data?.totals;

  const rows = list.data?.rows ?? [];

  const conflictsStats = useMemo(() => {
    const totalOps = rows.length;
    const withConflicts = rows.filter((r: any) => (r.conflicts ?? []).some((c: any) => !c.resolved)).length;
    const high = rows
      .flatMap((r: any) => r.conflicts ?? [])
      .filter((c: any) => !c.resolved && c.severity === 'high').length;
    return { totalOps, withConflicts, high };
  }, [rows]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const [form, setForm] = useState({
    operationNumber: `EXP-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
    paymentDate: new Date().toISOString().slice(0, 10),
    payerEntity: 'الهيئة الوطنية',
    beneficiaryEntity: '',
    spendingNature: 'operating',
    spendingSubtype: '',
    timeGranularity: 'monthly',
    influencingBody: 'general_administration',
    documentType: 'invoice',
    documentReference: '',
    paymentMethod: 'transfer',
    amount: 0,
    currency: 'MAD',
    controllingEntity: '',
    legalNotes: '',
    performanceReportRef: '',
    budgetLineId: '',
  });

  const [docFile, setDocFile] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string>('');

  const tabs: Array<{ id: NationalExpendituresDashboardTab; label: string; icon: string }> = [
    { id: 'overview', label: 'لوحة المؤشرات', icon: '📊' },
    { id: 'operations', label: 'العمليات', icon: '🧾' },
    { id: 'budgets', label: 'الميزانيات', icon: '📌' },
    { id: 'analytics', label: 'التحليلات', icon: '📈' },
    { id: 'reports', label: 'التقارير', icon: '📤' },
    { id: 'compliance', label: 'الرقابة والمطابقة', icon: '🛡️' },
  ];

  if (!sessionToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المصاريف الوطنية</h2>
        <p className="text-slate-600 mt-2">يلزم تسجيل الدخول لعرض قسم المصاريف.</p>
      </div>
    );
  }

  if (!isNational && user?.role !== 'regional_adoul_council') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المصاريف الوطنية</h2>
        <p className="text-slate-600 mt-2">هذه الصفحة متاحة للهيئة الوطنية والمجالس الجهوية فقط.</p>
      </div>
    );
  }

  const canShowTabs = !forcedTab;

  return (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-7xl mx-auto pb-8'}`}>
      {!embedded ? (
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-kufi">المصاريف الوطنية</h1>
            <p className="text-slate-500 mt-1">تصنيف حديث + رقابة + تقارير قابلة للتصدير</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-rose-700 text-sm"
            >
              + إضافة مصروف
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">تفاصيل النفقات الوطنية</h2>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-rose-700 text-sm"
          >
            + إضافة
          </button>
        </div>
      )}

      {canShowTabs ? (
        <div className="flex bg-slate-100/60 p-1.5 rounded-2xl gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === t.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIBlock label="إجمالي المصاريف" value={formatMad(totals?.total ?? 0)} sub={`مقبول: ${formatMad(totals?.accepted ?? 0)}`} icon="💸" tone="red" />
            <KPIBlock label="نسبة الاستهلاك" value={percent(totals?.executionRatePct)} sub={`الميزانية: ${formatMad(totals?.budgetTotal ?? 0)}`} icon="🎯" />
            <KPIBlock label="Burn-rate شهري" value={formatMad(totals?.burnRateMonthly ?? 0)} sub={`توقع نهاية السنة: ${formatMad(totals?.projectionYearEnd ?? 0)}`} icon="🔥" />
            <KPIBlock
              label="مقارنة بالمداخيل المحصلة"
              value={formatMad(totals?.incomeVsExpenseGap ?? 0)}
              sub={`المداخيل المحصلة: ${formatMad(totals?.incomeCollected ?? 0)}`}
              icon="⚖️"
              tone={(totals?.incomeVsExpenseGap ?? 0) >= 0 ? 'emerald' : 'red'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MiniMonthlyBars values={dashboard.data?.byMonth ?? Array.from({ length: 12 }).map(() => 0)} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">توزيع المصاريف حسب طبيعة الإنفاق</h3>
              <div className="space-y-3">
                {(dashboard.data?.byNature ?? []).slice(0, 8).map((n) => {
                  const pct = totals?.total ? (n.value / totals.total) * 100 : 0;
                  return (
                    <div key={n.key} className="p-3 rounded-xl border border-slate-100 hover:border-rose-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-800">{NATURE_LABEL[n.key] ?? n.key}</div>
                        <div className="text-sm font-bold text-rose-700">-{formatMad(n.value)}</div>
                      </div>
                      <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%` }}></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{pct.toFixed(1)}% من إجمالي المصاريف</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-900">تنبيهات رقابية (Compliance)</h3>
                <p className="text-sm text-amber-800 mt-1">شذوذ/تعارض/تجاوز ميزانية يتم رصده تلقائياً.</p>
              </div>
              <div className="flex gap-2">
                <Badge tone={conflictsStats.high > 0 ? 'red' : 'green'} label={`High: ${conflictsStats.high}`} />
                <Badge tone={conflictsStats.withConflicts > 0 ? 'yellow' : 'green'} label={`عمليات بها تعارض: ${conflictsStats.withConflicts}`} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                value={filters.q}
                onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
                placeholder="بحث (رقم العملية/المستفيد/المرجع...)"
                className="md:col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">الحالة</option>
                <option value="draft">مسودة</option>
                <option value="under_review">قيد المراجعة</option>
                <option value="accepted">مقبول</option>
                <option value="rejected">مرفوض</option>
                <option value="deferred">مؤجل</option>
              </select>
              <select
                value={filters.spendingNature}
                onChange={(e) => setFilters((s) => ({ ...s, spendingNature: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">طبيعة المصروف</option>
                {Object.entries(NATURE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={filters.influencingBody}
                onChange={(e) => setFilters((s) => ({ ...s, influencingBody: e.target.value }))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">الجهة المؤثرة</option>
                {Object.entries(BODY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 md:col-span-2">
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters((s) => ({ ...s, fromDate: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                />
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters((s) => ({ ...s, toDate: e.target.value }))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-slate-900">العمليات</div>
              <div className="text-xs text-slate-500">{rows.length} عملية</div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-right">رقم العملية</th>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">المستفيد</th>
                    <th className="p-3 text-right">التصنيف</th>
                    <th className="p-3 text-right">المبلغ</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">الرقابة</th>
                    <th className="p-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => {
                    const unresolved = (r.conflicts ?? []).filter((c: any) => !c.resolved);
                    const hasHigh = unresolved.some((c: any) => c.severity === 'high');
                    return (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-xs">{r.operation_number}</td>
                        <td className="p-3 text-slate-700">{r.payment_date}</td>
                        <td className="p-3 text-slate-700">{r.beneficiary_entity}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{NATURE_LABEL[r.spending_nature] ?? r.spending_nature}</div>
                          <div className="text-xs text-slate-500">{BODY_LABEL[r.influencing_body] ?? r.influencing_body}</div>
                        </td>
                        <td className="p-3 font-bold text-rose-700">-{formatMad(Number(r.amount ?? 0))}</td>
                        <td className="p-3">
                          <Badge
                            tone={r.status === 'accepted' ? 'green' : r.status === 'rejected' ? 'red' : r.status === 'under_review' ? 'yellow' : r.status === 'deferred' ? 'blue' : 'gray'}
                            label={STATUS_LABEL[r.status] ?? r.status}
                          />
                        </td>
                        <td className="p-3">
                          {unresolved.length === 0 ? (
                            <Badge tone="green" label="سليم" />
                          ) : (
                            <Badge tone={hasHigh ? 'red' : 'yellow'} label={`${unresolved.length} تعارض`} />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50"
                              onClick={() => {
                                setEditRow(r);
                                setEditOpen(true);
                              }}
                            >
                              تعديل
                            </button>

                            {user?.role === 'regional_adoul_council' ? (
                              <button
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                                disabled={submit.isPending || r.status === 'under_review' || r.status === 'accepted'}
                                onClick={() => submit.mutate({ sessionToken: sessionToken || '', expenditureId: r.id })}
                              >
                                إرسال للمراجعة
                              </button>
                            ) : null}

                            {isNational ? (
                              <>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                                  disabled={approve.isPending}
                                  onClick={() => approve.mutate({ sessionToken: sessionToken || '', expenditureId: r.id })}
                                >
                                  موافقة
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700"
                                  disabled={sendToReview.isPending}
                                  onClick={() => sendToReview.mutate({ sessionToken: sessionToken || '', expenditureId: r.id })}
                                >
                                  للمراجعة
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-700"
                                  disabled={defer.isPending}
                                  onClick={() => defer.mutate({ sessionToken: sessionToken || '', expenditureId: r.id })}
                                >
                                  تأجيل
                                </button>
                                <button
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                                  disabled={reject.isPending}
                                  onClick={() => {
                                    const reason = window.prompt('سبب الرفض (اختياري)') ?? '';
                                    reject.mutate({ sessionToken: sessionToken || '', expenditureId: r.id, note: reason || null });
                                  }}
                                >
                                  رفض
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        لا توجد عمليات مطابقة للفلاتر.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'budgets' ? (
        <div className="space-y-4">
          {!isNational ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-slate-600">الميزانيات متاحة للهيئة الوطنية فقط.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="font-bold text-slate-900">الميزانية حسب طبيعة الإنفاق</div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      const nature = window.prompt('spending_nature (مثال: operating)') ?? '';
                      if (!nature) return;
                      const amount = Number(window.prompt('allocated_amount') ?? '0');
                      const ceiling = window.prompt('ceiling_amount (اختياري)') ?? '';
                      upsertBudget.mutate({
                        sessionToken: sessionToken || '',
                        reportYear: year,
                        spendingNature: nature as any,
                        allocatedAmount: Number.isFinite(amount) ? amount : 0,
                        ceilingAmount: ceiling ? Number(ceiling) : null,
                      });
                    }}
                  >
                    + إضافة/تحديث
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-right">التصنيف</th>
                      <th className="p-3 text-right">الاعتماد</th>
                      <th className="p-3 text-right">السقف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(budgets.data?.rows ?? []).map((b: any) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="p-3 font-bold text-slate-800">{NATURE_LABEL[b.spending_nature] ?? b.spending_nature}</td>
                        <td className="p-3 font-bold text-slate-900">{formatMad(Number(b.allocated_amount ?? 0))}</td>
                        <td className="p-3 text-slate-700">{b.ceiling_amount != null ? formatMad(Number(b.ceiling_amount)) : '-'}</td>
                      </tr>
                    ))}
                    {(budgets.data?.rows ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">
                          لا توجد خطوط ميزانية لهذه السنة.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'analytics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-2">Cost Patterns</h3>
            <p className="text-sm text-slate-600">أعلى بنود الإنفاق لهذه السنة.</p>
            <div className="mt-4 space-y-3">
              {(dashboard.data?.byNature ?? []).slice(0, 6).map((n) => (
                <div key={n.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-800">{NATURE_LABEL[n.key] ?? n.key}</div>
                  <div className="font-bold text-rose-700">-{formatMad(n.value)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-2">Variance (الميزانية vs الفعلي)</h3>
            <p className="text-sm text-slate-600">الفارق بين الميزانية وإجمالي المصاريف المسجلة.</p>
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-600">الميزانية</span>
                <span className="font-bold">{formatMad(totals?.budgetTotal ?? 0)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-600">المصاريف</span>
                <span className="font-bold text-rose-700">-{formatMad(totals?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold">الفارق</span>
                <span className={`font-bold ${(totals?.variance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMad(totals?.variance ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'reports' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900">التقارير (Export)</h3>
            <p className="text-sm text-slate-600 mt-1">تصدير بصيغ: CSV / JSON / XML (ويمكن استخدام CSV كـ Excel).</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => downloadTextFile(`expenditures-${year}.json`, JSON.stringify(rows, null, 2), 'application/json')}
              >
                JSON
              </button>
              <button
                className="px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => downloadTextFile(`expenditures-${year}.csv`, toCsv(rows), 'text/csv;charset=utf-8')}
              >
                CSV
              </button>
              <button
                className="px-4 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<expenditures year="${year}">\n${rows
                    .map((r: any) => `  <expenditure>\n    <operation_number>${String(r.operation_number ?? '')}</operation_number>\n    <payment_date>${String(r.payment_date ?? '')}</payment_date>\n    <beneficiary_entity>${String(r.beneficiary_entity ?? '')}</beneficiary_entity>\n    <spending_nature>${String(r.spending_nature ?? '')}</spending_nature>\n    <status>${String(r.status ?? '')}</status>\n    <amount>${String(r.amount ?? '')}</amount>\n    <currency>${String(r.currency ?? '')}</currency>\n  </expenditure>`)
                    .join('\n')}\n</expenditures>`;
                  downloadTextFile(`expenditures-${year}.xml`, xml, 'application/xml;charset=utf-8');
                }}
              >
                XML
              </button>
            </div>
            <div className="mt-4 text-xs text-slate-500">PDF/Excel (XLSX) يمكن إضافته لاحقاً عند اعتماد مكتبة تصدير (مثل SheetJS + pdfmake).</div>
          </div>
        </div>
      ) : null}

      {activeTab === 'compliance' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPIBlock label="عمليات بها تعارض" value={`${conflictsStats.withConflicts}`} sub="غير محلولة" icon="⚠️" tone={conflictsStats.withConflicts ? 'red' : 'emerald'} />
            <KPIBlock label="High Severity" value={`${conflictsStats.high}`} sub="تجاوز/تكرار قوي" icon="🚨" tone={conflictsStats.high ? 'red' : 'emerald'} />
            <KPIBlock label="المداخيل vs المصاريف" value={formatMad(totals?.incomeVsExpenseGap ?? 0)} sub="Gap (المحصّل - المصروف)" icon="⚖️" tone={(totals?.incomeVsExpenseGap ?? 0) >= 0 ? 'emerald' : 'red'} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900">سجل الشذوذ/التعارض (Conflict Check)</h3>
            <p className="text-sm text-slate-600 mt-1">حاليًا: تكرار المرجع، تكرار نفس اليوم/المبلغ/المستفيد، وتجاوز سقف الميزانية.</p>
            <div className="mt-4 space-y-3">
              {rows
                .filter((r: any) => (r.conflicts ?? []).some((c: any) => !c.resolved))
                .slice(0, 20)
                .map((r: any) => {
                  const unresolved = (r.conflicts ?? []).filter((c: any) => !c.resolved);
                  return (
                    <div key={r.id} className="p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-slate-600">{r.operation_number}</div>
                        <Badge tone={unresolved.some((c: any) => c.severity === 'high') ? 'red' : 'yellow'} label={`${unresolved.length} تعارض`} />
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{r.beneficiary_entity}</div>
                      <div className="text-sm text-rose-700 font-bold">-{formatMad(Number(r.amount ?? 0))}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {unresolved.map((c: any) => `${c.conflict_type} (${c.severity})`).join(' • ')}
                      </div>
                    </div>
                  );
                })}
              {rows.filter((r: any) => (r.conflicts ?? []).some((c: any) => !c.resolved)).length === 0 ? (
                <div className="text-sm text-slate-500">لا توجد تعارضات غير محلولة.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Create/Edit modal */}
      {(createOpen || editOpen) ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-slate-900">{editOpen ? 'تعديل مصروف' : 'إضافة مصروف'}</div>
              <button
                className="text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setCreateOpen(false);
                  setEditOpen(false);
                  setEditRow(null);
                  setOcrPreview('');
                  setDocFile(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">رقم العملية</div>
                  <input
                    value={editOpen ? (editRow?.operation_number ?? '') : form.operationNumber}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, operation_number: e.target.value })) : setForm((s) => ({ ...s, operationNumber: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full font-mono"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الأداء</div>
                  <input
                    type="date"
                    value={editOpen ? (editRow?.payment_date ?? '') : form.paymentDate}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, payment_date: e.target.value })) : setForm((s) => ({ ...s, paymentDate: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">الجهة المؤدية</div>
                  <input
                    value={editOpen ? (editRow?.payer_entity ?? '') : form.payerEntity}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, payer_entity: e.target.value })) : setForm((s) => ({ ...s, payerEntity: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">الجهة المستفيدة</div>
                  <input
                    value={editOpen ? (editRow?.beneficiary_entity ?? '') : form.beneficiaryEntity}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, beneficiary_entity: e.target.value })) : setForm((s) => ({ ...s, beneficiaryEntity: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">طبيعة المصروف</div>
                  <select
                    value={editOpen ? (editRow?.spending_nature ?? 'operating') : form.spendingNature}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, spending_nature: e.target.value })) : setForm((s) => ({ ...s, spendingNature: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  >
                    {Object.entries(NATURE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">الجهة المؤثرة</div>
                  <select
                    value={editOpen ? (editRow?.influencing_body ?? 'general_administration') : form.influencingBody}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, influencing_body: e.target.value })) : setForm((s) => ({ ...s, influencingBody: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  >
                    {Object.entries(BODY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">نوع الوثيقة</div>
                  <select
                    value={editOpen ? (editRow?.document_type ?? 'invoice') : form.documentType}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, document_type: e.target.value })) : setForm((s) => ({ ...s, documentType: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  >
                    <option value="invoice">فاتورة</option>
                    <option value="contract">عقد</option>
                    <option value="receipt">وصل</option>
                    <option value="payment_order">أمر أداء</option>
                    <option value="other">غيره</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">مرجعية الوثيقة</div>
                  <input
                    value={editOpen ? (editRow?.document_reference ?? '') : form.documentReference}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, document_reference: e.target.value })) : setForm((s) => ({ ...s, documentReference: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">وسيلة الأداء</div>
                  <select
                    value={editOpen ? (editRow?.payment_method ?? 'transfer') : form.paymentMethod}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, payment_method: e.target.value })) : setForm((s) => ({ ...s, paymentMethod: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  >
                    <option value="transfer">تحويل</option>
                    <option value="check">شيك</option>
                    <option value="cash">نقد</option>
                    <option value="professional_account">حساب مهني</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">مبلغ العملية</div>
                  <input
                    type="number"
                    value={editOpen ? Number(editRow?.amount ?? 0) : form.amount}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, amount: Number(e.target.value) })) : setForm((s) => ({ ...s, amount: Number(e.target.value) })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">الجهة المراقبة (اختياري)</div>
                  <input
                    value={editOpen ? (editRow?.controlling_entity ?? '') : form.controllingEntity}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, controlling_entity: e.target.value })) : setForm((s) => ({ ...s, controllingEntity: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                    placeholder="مكتب تدقيق/محاسب/لجنة المراقبة"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">ملاحظات قانونية (اختياري)</div>
                  <input
                    value={editOpen ? (editRow?.legal_notes ?? '') : form.legalNotes}
                    onChange={(e) => (editOpen ? setEditRow((s: any) => ({ ...s, legal_notes: e.target.value })) : setForm((s) => ({ ...s, legalNotes: e.target.value })))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">الوثائق (Upload)</div>
                    <div className="text-xs text-slate-500">رفع فاتورة/عقد/وصل وربطها بالعملية</div>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:bg-white"
                    disabled={!docFile || ocrParse.isPending}
                    onClick={async () => {
                      if (!docFile) return;
                      const base64 = await toBase64(docFile);
                      const res: any = await ocrParse.mutateAsync({ base64 });
                      const text = (res?.text ?? res?.data ?? res?.result ?? JSON.stringify(res)).slice(0, 2000);
                      setOcrPreview(text);

                      // Lightweight heuristics: extract first large number as amount
                      const amountMatch = text.match(/(\d{1,3}(?:[\s,.]\d{3})*(?:[\s,.]\d{2})?)/);
                      if (amountMatch && !editOpen) {
                        const cleaned = amountMatch[1].replace(/\s/g, '').replace(/,/g, '.');
                        const n = Number(cleaned);
                        if (Number.isFinite(n)) setForm((s) => ({ ...s, amount: n }));
                      }
                    }}
                  >
                    OCR قراءة الفاتورة
                  </button>
                </div>

                <div className="mt-3 flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <input
                    type="file"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    className="text-sm"
                    accept="application/pdf,image/*"
                  />
                </div>

                {ocrPreview ? (
                  <pre className="mt-3 text-xs whitespace-pre-wrap bg-white border border-slate-200 rounded-xl p-3 max-h-40 overflow-auto">{ocrPreview}</pre>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-50"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditOpen(false);
                    setEditRow(null);
                    setOcrPreview('');
                    setDocFile(null);
                  }}
                >
                  إلغاء
                </button>

                <button
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700"
                  disabled={createExpense.isPending || updateExpense.isPending}
                  onClick={async () => {
                    if (editOpen && editRow) {
                      await updateExpense.mutateAsync({
                        sessionToken: sessionToken || '',
                        expenditureId: editRow.id,
                        operationNumber: String(editRow.operation_number ?? ''),
                        paymentDate: String(editRow.payment_date ?? ''),
                        payerEntity: String(editRow.payer_entity ?? ''),
                        beneficiaryEntity: String(editRow.beneficiary_entity ?? ''),
                        spendingNature: editRow.spending_nature,
                        spendingSubtype: editRow.spending_subtype ?? null,
                        timeGranularity: editRow.time_granularity,
                        influencingBody: editRow.influencing_body,
                        documentType: editRow.document_type,
                        documentReference: editRow.document_reference ?? null,
                        paymentMethod: editRow.payment_method,
                        amount: Number(editRow.amount ?? 0),
                        currency: editRow.currency ?? 'MAD',
                        controllingEntity: editRow.controlling_entity ?? null,
                        legalNotes: editRow.legal_notes ?? null,
                        performanceReportRef: editRow.performance_report_ref ?? null,
                        budgetLineId: editRow.budget_line_id ?? null,
                      });

                      if (docFile) {
                        const base64 = await toBase64(docFile);
                        await uploadDoc.mutateAsync({
                          sessionToken: sessionToken || '',
                          expenditureId: editRow.id,
                          kind: (editRow.document_type ?? 'invoice') as any,
                          file: {
                            name: docFile.name,
                            type: docFile.type,
                            size: docFile.size,
                            base64,
                          },
                        });
                      }
                      return;
                    }

                    const result = await createExpense.mutateAsync({
                      sessionToken: sessionToken || '',
                      operationNumber: form.operationNumber,
                      paymentDate: form.paymentDate,
                      payerEntity: form.payerEntity,
                      beneficiaryEntity: form.beneficiaryEntity,
                      spendingNature: form.spendingNature as any,
                      spendingSubtype: form.spendingSubtype || null,
                      timeGranularity: form.timeGranularity as any,
                      influencingBody: form.influencingBody as any,
                      documentType: form.documentType as any,
                      documentReference: form.documentReference || null,
                      paymentMethod: form.paymentMethod as any,
                      amount: Number(form.amount ?? 0),
                      currency: form.currency || 'MAD',
                      controllingEntity: form.controllingEntity || null,
                      legalNotes: form.legalNotes || null,
                      performanceReportRef: form.performanceReportRef || null,
                      budgetLineId: form.budgetLineId || null,
                    });

                    if (docFile) {
                      const base64 = await toBase64(docFile);
                      await uploadDoc.mutateAsync({
                        sessionToken: sessionToken || '',
                        expenditureId: (result as any).expenditure.id,
                        kind: form.documentType as any,
                        file: {
                          name: docFile.name,
                          type: docFile.type,
                          size: docFile.size,
                          base64,
                        },
                      });
                    }
                  }}
                >
                  {editOpen ? 'حفظ' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
