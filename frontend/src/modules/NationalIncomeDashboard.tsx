import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';

export type NationalIncomeDashboardTab = 'overview' | 'regions' | 'reconciliation' | 'analytics';

type NationalIncomeDashboardProps = {
  /** When true, hides the big page header to fit inside another screen. */
  embedded?: boolean;
  /** When provided, forces rendering a single tab (and hides internal tab-switcher). */
  forcedTab?: NationalIncomeDashboardTab;
};

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

function Badge({ status, label }: { status: 'green' | 'yellow' | 'red' | 'gray'; label: string }) {
  const cls =
    status === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'yellow'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : status === 'red'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-50 text-slate-700 border-slate-200';
  return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cls}`}>{label}</span>;
}

function MiniBarChart({ due, transferred }: { due: number[]; transferred: number[] }) {
  const max = Math.max(1, ...due, ...transferred);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">الرسم البياني الشهري (المستحق / المحول)</h3>
        <div className="flex gap-3 text-xs">
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-900"></span> المستحق</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-indigo-600"></span> المحول</span>
        </div>
      </div>

      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const d = due[i] ?? 0;
          const t = transferred[i] ?? 0;
          const dh = Math.max(2, Math.round((d / max) * 100));
          const th = Math.max(2, Math.round((t / max) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end gap-1 h-40">
                <div className="flex-1 bg-slate-900/15 rounded" style={{ height: `${dh}%` }} title={`المستحق: ${formatMad(d)}`}></div>
                <div className="flex-1 bg-indigo-600 rounded" style={{ height: `${th}%` }} title={`المحول: ${formatMad(t)}`}></div>
              </div>
              <div className="text-[11px] text-slate-500">{i + 1}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const NationalIncomeDashboard: React.FC<NationalIncomeDashboardProps> = ({ embedded = false, forcedTab }) => {
  const { sessionToken, user } = useAuth();
  const { isNationalTransferSeen, markNationalTransferSeen } = useMessagingNotifications();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tab, setTab] = useState<NationalIncomeDashboardTab>('overview');

  const activeTab: NationalIncomeDashboardTab = forcedTab ?? tab;

  const enabled = !!sessionToken && user?.role === 'national_notary_authority';

  const overview = trpc.income.getNationalOverview.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled, staleTime: 15_000 }
  );
  const regional = trpc.income.listRegionalContributions.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled, staleTime: 15_000 }
  );
  const reconciliation = trpc.income.listReconciliation.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled: enabled && activeTab === 'reconciliation', staleTime: 10_000 }
  );

  // Backward/forward compatible accessors:
  // older backend returned monthly.* directly; newer backend returns temporal.monthly.*
  const monthlyDue = overview.data?.temporal?.monthly?.due ?? (overview.data as any)?.monthly?.due ?? Array(12).fill(0);
  const monthlyTransferred =
    overview.data?.temporal?.monthly?.transferred ?? (overview.data as any)?.monthly?.transferred ?? Array(12).fill(0);

  const utils = trpc.useUtils();
  const approve = trpc.income.nationalApproveTransfer.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
      utils.income.getNationalOverview.invalidate();
      utils.income.listRegionalContributions.invalidate();
    },
  });
  const reject = trpc.income.nationalRejectTransfer.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
      utils.income.getNationalOverview.invalidate();
      utils.income.listRegionalContributions.invalidate();
    },
  });

  const regionRows = regional.data?.rows ?? [];

  const analyticsData = useMemo(() => {
    const rankedByCompliance = [...regionRows].sort((a, b) => (b.compliancePct ?? 0) - (a.compliancePct ?? 0));
    const rankedByFair = [...regionRows].sort((a, b) => (b.weightedFairScore ?? b.fairScore ?? 0) - (a.weightedFairScore ?? a.fairScore ?? 0));
    const avgTimeToTransferDays = (() => {
      // We only have lastTransferAt on summary; show placeholder until transfer history is expanded.
      return null as number | null;
    })();
    return { rankedByCompliance, rankedByFair, avgTimeToTransferDays };
  }, [regionRows]);

  if (!sessionToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المداخيل (Income)</h2>
        <p className="text-slate-600 mt-2">يلزم تسجيل الدخول لعرض لوحة المداخيل.</p>
      </div>
    );
  }

  if (user?.role !== 'national_notary_authority') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المداخيل (Income)</h2>
        <p className="text-slate-600 mt-2">هذه الصفحة متاحة فقط لبوابة الرئيس/الهيئة الوطنية.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      {!embedded ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">المداخيل الوطنية</h1>
              <p className="text-slate-600 mt-1">
                قاعدة الاحتساب: <span className="font-bold">$\sum$ مداخيل الجهات × {(overview.data?.contributionRate ?? 0.1) * 100}%</span>
                <span className="text-slate-400"> — تدقيق/مطابقة + وثائق + اعتماد</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-600">السنة</div>
              <select
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[year + 1, year, year - 1, year - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3">
          <div className="text-xs font-bold text-slate-600">السنة</div>
          <select
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year + 1, year, year - 1, year - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      {!forcedTab ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'overview', label: 'نظرة وطنية' },
              { id: 'regions', label: 'المساهمات الجهوية' },
              { id: 'reconciliation', label: 'المطابقة والوثائق' },
              { id: 'analytics', label: 'الإحصاءات التحليلية' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                activeTab === t.id
                  ? 'px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm border border-slate-900'
                  : 'px-4 py-2 rounded-xl bg-white text-slate-800 font-bold text-sm border border-slate-200 hover:border-slate-300'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="text-xs font-bold text-slate-500">إجمالي مداخيل الجهات</div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatMad(overview.data?.totals.totalIncome ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-2">أساس الاحتساب (Income Basis)</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="text-xs font-bold text-slate-500">المستحق للوطني ({Math.round((overview.data?.contributionRate ?? 0.1) * 100)}%)</div>
              <div className="text-2xl font-black text-slate-900 mt-2">{formatMad(overview.data?.totals.totalDue ?? 0)}</div>
              <div className="text-xs text-slate-500 mt-2">محسوب تلقائيًا</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="text-xs font-bold text-slate-500">المحول فعليًا (معتمد)</div>
              <div className="text-2xl font-black text-indigo-700 mt-2">{formatMad(overview.data?.totals.totalTransferred ?? 0)}</div>
              <div className="text-xs text-slate-500 mt-2">
                مؤشر العجز/الفائض: <span className={(overview.data?.surplusDeficit ?? 0) >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  {formatMad(overview.data?.surplusDeficit ?? 0)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="text-xs font-bold text-slate-500">Compliance Rate</div>
              <div className="text-2xl font-black text-slate-900 mt-2">{overview.data?.complianceRate ?? 0}%</div>
              <div className="text-xs text-slate-500 mt-2">جهات متأخرة: {overview.data?.arrearsCount ?? 0}</div>
            </div>
          </div>

          {/* Chart + Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MiniBarChart due={monthlyDue} transferred={monthlyTransferred} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">طبقة التوقع (Forecast)</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-600">المتوقع بنهاية السنة</div>
                  <div className="text-xl font-black text-slate-900 mt-2">
                    {formatMad(overview.data?.forecast?.expectedTransferredEndOfYear ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">تقدير مبني على وتيرة التحويل الحالية</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="text-xs font-bold text-slate-600">تنبيه</div>
                  <div className="text-sm text-slate-700 mt-2">
                    الجهات المتأخرة تظهر تلقائيًا في تبويب <span className="font-bold">المساهمات الجهوية</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading / error */}
          {overview.isLoading ? <div className="text-sm text-slate-500">جارٍ تحميل المعطيات...</div> : null}
          {overview.error ? <div className="text-sm text-rose-700">تعذر تحميل نظرة وطنية: {overview.error.message}</div> : null}
        </div>
      ) : null}

      {activeTab === 'regions' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">المساهمات الجهوية (10%)</h3>
            <p className="text-sm text-slate-600 mt-1">عرض شفاف للمستحق، المحول، والفارق لكل مجلس جهوي مع مؤشر عادل.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold">
                <tr>
                  <th className="p-4">المجلس</th>
                  <th className="p-4">مداخيل السنة</th>
                  <th className="p-4">المستحق (10%)</th>
                  <th className="p-4">المحول (معتمد)</th>
                  <th className="p-4">Gap</th>
                  <th className="p-4">آخر تحويل</th>
                  <th className="p-4">الامتثال</th>
                  <th className="p-4">Fair Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionRows.length ? (
                  regionRows.map((r) => (
                    <tr key={r.councilUserId} className="hover:bg-slate-50/60">
                      <td className="p-4 font-bold text-slate-900">{r.councilName}</td>
                      <td className="p-4 text-slate-700">{formatMad(r.totalIncome)}</td>
                      <td className="p-4 font-bold text-slate-900">{formatMad(r.due)}</td>
                      <td className="p-4 font-bold text-indigo-700">{formatMad(r.transferred)}</td>
                      <td className={`p-4 font-bold ${r.gap > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatMad(r.gap)}</td>
                      <td className="p-4 text-slate-600">{r.lastTransferAt ?? '-'}</td>
                      <td className="p-4">
                        <Badge
                          status={r.complianceStatus === 'green' ? 'green' : r.complianceStatus === 'yellow' ? 'yellow' : 'red'}
                          label={r.compliancePct >= 100 ? 'مكتمل' : r.compliancePct >= 50 ? 'جزئي' : 'متأخر'}
                        />
                        <div className="text-[11px] text-slate-500 mt-1">{r.compliancePct}%</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-black text-slate-900">{r.fairScore.toFixed(2)}%</div>
                        {r.weightedFairScore !== null ? (
                          <div className="text-[11px] text-slate-500">Weighted: {r.weightedFairScore.toFixed(2)}%</div>
                        ) : (
                          <div className="text-[11px] text-slate-400">(بدون وزن)</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-6 text-slate-600" colSpan={8}>
                      لا توجد معطيات مدخلة للسنة {year}. (تحتاج الجهات لإدخال/رفع تقارير المداخيل والتحويلات.)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-slate-200 text-xs text-slate-500">
            حالة الامتثال مبنية على: المحول المعتمد ÷ المستحق. مؤشر Fair Index: (المحول ÷ المداخيل) × 100.
          </div>
        </div>
      ) : null}

      {activeTab === 'reconciliation' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900">طبقة المطابقة المحاسبية (Reconciliation)</h3>
            <p className="text-sm text-slate-600 mt-1">تعرض دخل الجهة، 10% المحسوبة، التحويل الفعلي، الوثائق، والاعتمادات.</p>
          </div>

          {reconciliation.isLoading ? <div className="text-sm text-slate-500">جارٍ تحميل المطابقة...</div> : null}
          {reconciliation.error ? <div className="text-sm text-rose-700">تعذر تحميل المطابقة: {reconciliation.error.message}</div> : null}

          {(reconciliation.data?.reports ?? []).map((r) => {
            const transfers = (r as any).transfers as any[];
            const transferredApproved = transfers
              .filter((t) => t.approval_status === 'approved' || t.national_approved_at)
              .reduce((acc, t) => acc + Number(t.transferred_amount ?? 0), 0);
            const status: 'green' | 'yellow' | 'red' = transferredApproved >= Number(r.due_amount ?? 0) ? 'green' : transferredApproved > 0 ? 'yellow' : 'red';
            return (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900">تقرير دخل</h4>
                      <Badge status={status} label={status === 'green' ? 'مطابق' : status === 'yellow' ? 'جزئي' : 'غير مطابق'} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {r.granularity} — سنة {r.report_year}
                      {r.report_month ? ` — شهر ${r.report_month}` : ''}
                      {r.report_quarter ? ` — ربع ${r.report_quarter}` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="text-[11px] text-slate-500 font-bold">الدخل الأصلي</div>
                      <div className="font-black text-slate-900">{formatMad(Number(r.total_income ?? 0))}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="text-[11px] text-slate-500 font-bold">10% المحسوبة</div>
                      <div className="font-black text-slate-900">{formatMad(Number(r.due_amount ?? 0))}</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <div className="text-[11px] text-indigo-700 font-bold">المحول المعتمد</div>
                      <div className="font-black text-indigo-800">{formatMad(transferredApproved)}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {transfers.length ? (
                    <div className="space-y-4">
                      {transfers.map((t) => (
                        <div
                          key={t.id}
                          className="border border-slate-200 rounded-2xl p-4"
                          onClick={() => {
                            if (t.approval_status === 'submitted') {
                              markNationalTransferSeen(String(t.id));
                            }
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900">تحويل: {formatMad(Number(t.transferred_amount ?? 0))}</div>
                              <div className="text-xs text-slate-500">تاريخ التحويل: {t.transferred_at} {t.bank_ref ? `— مرجع: ${t.bank_ref}` : ''}</div>
                              <div className="text-xs text-slate-500">
                                الحالة: <span className="font-bold">{t.approval_status}</span>
                                {t.rejection_reason ? ` — سبب الرفض: ${t.rejection_reason}` : ''}
                              </div>
                              {t.approval_status === 'submitted' && !isNationalTransferSeen(String(t.id)) ? (
                                <div className="inline-flex mt-2">
                                  <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-md animate-pulse">
                                    جديد
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {t.approval_status === 'submitted' ? (
                                <>
                                  <button
                                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                                    onClick={() => {
                                      markNationalTransferSeen(String(t.id));
                                      approve.mutate({ sessionToken: sessionToken!, transferId: t.id });
                                    }}
                                    disabled={approve.isPending}
                                  >
                                    اعتماد
                                  </button>
                                  <button
                                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
                                    onClick={() => {
                                      markNationalTransferSeen(String(t.id));
                                      const reason = prompt('سبب الرفض (إجباري):');
                                      if (!reason) return;
                                      reject.mutate({ sessionToken: sessionToken!, transferId: t.id, rejectionReason: reason });
                                    }}
                                    disabled={reject.isPending}
                                  >
                                    رفض
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="text-xs font-bold text-slate-600 mb-2">الوثائق الداعمة</div>
                            {t.documents?.length ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {t.documents.map((d: any) => (
                                  <a
                                    key={d.id}
                                    href={d.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white"
                                  >
                                    <div>
                                      <div className="text-sm font-bold text-slate-900 truncate">{d.file_name}</div>
                                      <div className="text-[11px] text-slate-500">{d.kind} — {new Date(d.uploaded_at).toLocaleString('ar-MA')}</div>
                                    </div>
                                    <span className="text-slate-400">↗</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">لا توجد وثائق مرفوعة لهذا التحويل.</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">لا توجد تحويلات مسجلة لهذا التقرير.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {activeTab === 'analytics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Ranking حسب الامتثال</h3>
            <div className="space-y-2">
              {analyticsData.rankedByCompliance.slice(0, 10).map((r, idx) => (
                <div key={r.councilUserId} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">{idx + 1}</div>
                    <div>
                      <div className="font-bold text-slate-900">{r.councilName}</div>
                      <div className="text-[11px] text-slate-500">آخر تحويل: {r.lastTransferAt ?? '-'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{r.compliancePct}%</div>
                    <div className="text-[11px] text-slate-500">Gap: {formatMad(r.gap)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Fair Contribution Index</h3>
            <p className="text-sm text-slate-600 mb-4">
              مؤشر عادل لمقارنة الجهات: Fair Score = (التحويلات ÷ المداخيل) × 100.
              عند توفر تعداد العدول: Weighted Fair Score.
            </p>
            <div className="space-y-2">
              {analyticsData.rankedByFair.slice(0, 10).map((r, idx) => (
                <div key={r.councilUserId} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">{idx + 1}</div>
                    <div>
                      <div className="font-bold text-slate-900">{r.councilName}</div>
                      <div className="text-[11px] text-slate-500">الدخل: {formatMad(r.totalIncome)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900">{(r.weightedFairScore ?? r.fairScore).toFixed(2)}%</div>
                    <div className="text-[11px] text-slate-500">Raw: {r.fairScore.toFixed(2)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
