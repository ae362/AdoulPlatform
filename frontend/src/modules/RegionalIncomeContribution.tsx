import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type Granularity = 'monthly' | 'quarterly' | 'annual';

type DocKind = 'bank_receipt' | 'regional_financial_report' | 'meeting_minutes' | 'other';

const DOC_KIND_LABEL: Record<DocKind, string> = {
  bank_receipt: 'وصل/إشعار البنك',
  regional_financial_report: 'تقرير مالي جهوي',
  meeting_minutes: 'محضر اجتماع للمصادقة',
  other: 'أخرى',
};

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
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

export function RegionalIncomeContribution() {
  const { user, sessionToken } = useAuth();
  const utils = trpc.useUtils();

  const isRegional = user?.role === 'regional_adoul_council';
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const reconciliation = trpc.income.listReconciliation.useQuery(
    { sessionToken: sessionToken ?? '', reportYear: year },
    { enabled: Boolean(sessionToken && isRegional), staleTime: 10_000 },
  );

  const upsertProfile = trpc.income.upsertCouncilProfile.useMutation({
    onSuccess: () => {
      // no profile query yet; just refresh reconciliation to reflect any dependent analytics.
      utils.income.listReconciliation.invalidate();
    },
  });

  const upsertReport = trpc.income.upsertIncomeReport.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
      setReportForm((prev) => ({
        ...prev,
        totalIncome: 0,
        note: '',
      }));
    },
  });

  const createTransfer = trpc.income.createTransfer.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
    },
  });

  const uploadDoc = trpc.income.uploadSupportingDocument.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
      setDocFile(null);
    },
  });

  const submitTransfer = trpc.income.submitTransfer.useMutation({
    onSuccess: () => {
      utils.income.listReconciliation.invalidate();
    },
  });

  const [tab, setTab] = useState<'reports' | 'transfers' | 'profile'>('reports');

  const [profileForm, setProfileForm] = useState({
    councilName: user?.full_name ? `مجلس ${user.full_name}` : 'المجلس الجهوي',
    regionCode: '',
    notariesCount: 0,
  });

  const [reportForm, setReportForm] = useState({
    granularity: 'monthly' as Granularity,
    reportMonth: new Date().getMonth() + 1,
    reportQuarter: Math.floor(new Date().getMonth() / 3) + 1,
    totalIncome: 0,
    note: '',
  });

  const [transferDraft, setTransferDraft] = useState<{ reportId: string | null; amount: number; date: string; bankRef: string }>(
    {
      reportId: null,
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      bankRef: '',
    },
  );

  const [docDraft, setDocDraft] = useState<{ transferId: string | null; kind: DocKind }>(
    { transferId: null, kind: 'bank_receipt' },
  );
  const [docFile, setDocFile] = useState<File | null>(null);

  const reports = reconciliation.data?.reports ?? [];

  const reportTotals = useMemo(() => {
    const totalIncome = reports.reduce((acc: number, r: any) => acc + Number(r.total_income ?? 0), 0);
    const totalDue = reports.reduce((acc: number, r: any) => acc + Number(r.due_amount ?? 0), 0);
    const transferredApproved = reports
      .flatMap((r: any) => r.transfers ?? [])
      .filter((t: any) => t.approval_status === 'approved' || t.national_approved_at)
      .reduce((acc: number, t: any) => acc + Number(t.transferred_amount ?? 0), 0);
    return { totalIncome, totalDue, transferredApproved };
  }, [reports]);

  if (!sessionToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المساهمة الوطنية (10%)</h2>
        <p className="text-slate-600 mt-2">يلزم تسجيل الدخول.</p>
      </div>
    );
  }

  if (!isRegional) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">المساهمة الوطنية (10%)</h2>
        <p className="text-slate-600 mt-2">هذه الصفحة خاصة بالمجالس الجهوية فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">🏦 المساهمة الوطنية (10%)</h1>
            <p className="text-sm text-slate-600 mt-1">إدخال تقارير المداخيل، تسجيل التحويلات، ورفع الوثائق لإتمام المطابقة.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">السنة</span>
            <input
              type="number"
              className="input w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2000}
              max={2100}
            />
            <button
              type="button"
              onClick={() => reconciliation.refetch()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              تحديث
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-bold">إجمالي المداخيل (Basis)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{formatMad(reportTotals.totalIncome)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-bold">المستحق للوطني (10%)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{formatMad(reportTotals.totalDue)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 font-bold">المحول المعتمد</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{formatMad(reportTotals.transferredApproved)}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          {[
            { id: 'reports', label: 'إدخال تقارير المداخيل' },
            { id: 'transfers', label: 'التحويلات والوثائق' },
            { id: 'profile', label: 'بيانات المجلس' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={
                tab === (t.id as any)
                  ? 'px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold'
                  : 'px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold hover:bg-slate-200'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'profile' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-extrabold text-slate-900">بيانات المجلس الجهوي</h2>
          <p className="text-sm text-slate-600 mt-1">تُستخدم لتحسين التحليلات و"المؤشر العادل" (Weighted Fair Score).</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="text-xs font-bold text-slate-700">اسم المجلس</label>
              <input
                className="input mt-1"
                value={profileForm.councilName}
                onChange={(e) => setProfileForm((p) => ({ ...p, councilName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">رمز الجهة (اختياري)</label>
              <input
                className="input mt-1"
                value={profileForm.regionCode}
                onChange={(e) => setProfileForm((p) => ({ ...p, regionCode: e.target.value }))}
                placeholder="مثال: RABAT"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">عدد العدول (تقريبي)</label>
              <input
                type="number"
                className="input mt-1"
                value={profileForm.notariesCount}
                onChange={(e) => setProfileForm((p) => ({ ...p, notariesCount: Number(e.target.value) }))}
                min={0}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              upsertProfile.mutate({
                sessionToken,
                councilName: profileForm.councilName,
                regionCode: profileForm.regionCode || null,
                notariesCount: profileForm.notariesCount || null,
              })
            }
            disabled={upsertProfile.isPending}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            حفظ البيانات
          </button>
          {upsertProfile.error ? <div className="text-sm text-red-700 mt-2">{upsertProfile.error.message}</div> : null}
        </div>
      ) : null}

      {tab === 'reports' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-extrabold text-slate-900">إدخال تقارير المداخيل</h2>
          <p className="text-sm text-slate-600 mt-1">أدخل الدخل حسب: شهري/ربع سنوي/سنوي. يتم حساب 10% تلقائيًا.</p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
            <div>
              <label className="text-xs font-bold text-slate-700">الدورية</label>
              <select
                className="input mt-1"
                value={reportForm.granularity}
                onChange={(e) => setReportForm((p) => ({ ...p, granularity: e.target.value as Granularity }))}
              >
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="annual">سنوي</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">الشهر</label>
              <input
                type="number"
                className="input mt-1"
                value={reportForm.reportMonth}
                onChange={(e) => setReportForm((p) => ({ ...p, reportMonth: Number(e.target.value) }))}
                min={1}
                max={12}
                disabled={reportForm.granularity !== 'monthly'}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">الربع</label>
              <input
                type="number"
                className="input mt-1"
                value={reportForm.reportQuarter}
                onChange={(e) => setReportForm((p) => ({ ...p, reportQuarter: Number(e.target.value) }))}
                min={1}
                max={4}
                disabled={reportForm.granularity !== 'quarterly'}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700">مجموع المداخيل (د.م)</label>
              <input
                type="number"
                className="input mt-1"
                value={reportForm.totalIncome}
                onChange={(e) => setReportForm((p) => ({ ...p, totalIncome: Number(e.target.value) }))}
                min={0}
              />
            </div>

            <div className="md:col-span-5">
              <label className="text-xs font-bold text-slate-700">ملاحظة (اختياري)</label>
              <input
                className="input mt-1"
                value={reportForm.note}
                onChange={(e) => setReportForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              upsertReport.mutate({
                sessionToken,
                reportYear: year,
                granularity: reportForm.granularity,
                reportMonth: reportForm.granularity === 'monthly' ? reportForm.reportMonth : null,
                reportQuarter: reportForm.granularity === 'quarterly' ? reportForm.reportQuarter : null,
                totalIncome: reportForm.totalIncome,
                note: reportForm.note || null,
              })
            }
            disabled={upsertReport.isPending}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            حفظ التقرير
          </button>
          {upsertReport.error ? <div className="text-sm text-red-700 mt-2">{upsertReport.error.message}</div> : null}

          <div className="mt-6">
            <h3 className="font-extrabold text-slate-900">تقارير السنة</h3>
            {reconciliation.isLoading ? <div className="text-sm text-slate-500 mt-2">تحميل…</div> : null}
            {reconciliation.error ? <div className="text-sm text-red-700 mt-2">{reconciliation.error.message}</div> : null}

            {(reports.length ?? 0) === 0 ? (
              <div className="text-sm text-slate-600 mt-3">لا توجد تقارير بعد لهذه السنة.</div>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="min-w-[860px] w-full text-right text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">الدورية</th>
                      <th className="py-2">الدخل</th>
                      <th className="py-2">10%</th>
                      <th className="py-2">تاريخ الاستحقاق</th>
                      <th className="py-2">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r: any) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-2">
                          {r.granularity}
                          {r.report_month ? ` / ${r.report_month}` : ''}
                          {r.report_quarter ? ` / Q${r.report_quarter}` : ''}
                        </td>
                        <td className="py-2 font-bold text-slate-900">{formatMad(Number(r.total_income ?? 0))}</td>
                        <td className="py-2 font-bold text-slate-900">{formatMad(Number(r.due_amount ?? 0))}</td>
                        <td className="py-2 text-slate-600">{String(r.due_date ?? '-')}</td>
                        <td className="py-2 text-slate-600">{r.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'transfers' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-extrabold text-slate-900">التحويلات والوثائق</h2>
            <p className="text-sm text-slate-600 mt-1">سجل التحويلات، ارفع الوثائق، ثم أرسل للمراجعة الوطنية.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700">التقرير</label>
                <select
                  className="input mt-1"
                  value={transferDraft.reportId ?? ''}
                  onChange={(e) => setTransferDraft((p) => ({ ...p, reportId: e.target.value || null }))}
                >
                  <option value="">اختر تقريرًا…</option>
                  {reports.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.granularity}
                      {r.report_month ? ` / ${r.report_month}` : ''}
                      {r.report_quarter ? ` / Q${r.report_quarter}` : ''}
                      — due {formatMad(Number(r.due_amount ?? 0))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">المبلغ</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={transferDraft.amount}
                  onChange={(e) => setTransferDraft((p) => ({ ...p, amount: Number(e.target.value) }))}
                  min={0}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">تاريخ التحويل</label>
                <input
                  type="date"
                  className="input mt-1"
                  value={transferDraft.date}
                  onChange={(e) => setTransferDraft((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-xs font-bold text-slate-700">مرجع البنك (اختياري)</label>
                <input
                  className="input mt-1"
                  value={transferDraft.bankRef}
                  onChange={(e) => setTransferDraft((p) => ({ ...p, bankRef: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="button"
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
              disabled={!transferDraft.reportId || createTransfer.isPending}
              onClick={() =>
                createTransfer.mutate({
                  sessionToken,
                  incomeReportId: transferDraft.reportId!,
                  transferredAmount: transferDraft.amount,
                  transferredAt: transferDraft.date,
                  bankRef: transferDraft.bankRef || null,
                })
              }
            >
              تسجيل تحويل
            </button>
            {createTransfer.error ? <div className="text-sm text-red-700 mt-2">{createTransfer.error.message}</div> : null}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-extrabold text-slate-900">رفع وثائق تحويل</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700">اختر تحويلًا</label>
                <select
                  className="input mt-1"
                  value={docDraft.transferId ?? ''}
                  onChange={(e) => setDocDraft((p) => ({ ...p, transferId: e.target.value || null }))}
                >
                  <option value="">اختر…</option>
                  {reports.flatMap((r: any) => (r.transfers ?? []).map((t: any) => ({ t, r }))).map(({ t, r }: any) => (
                    <option key={t.id} value={t.id}>
                      {t.transferred_at} — {formatMad(Number(t.transferred_amount ?? 0))} ({t.approval_status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">نوع الوثيقة</label>
                <select className="input mt-1" value={docDraft.kind} onChange={(e) => setDocDraft((p) => ({ ...p, kind: e.target.value as DocKind }))}>
                  {Object.entries(DOC_KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-700">الملف</label>
                <input type="file" className="input mt-1" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <button
              type="button"
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
              disabled={!docDraft.transferId || !docFile || uploadDoc.isPending}
              onClick={async () => {
                if (!docDraft.transferId || !docFile) return;
                const b64 = await toBase64(docFile);
                await uploadDoc.mutateAsync({
                  sessionToken,
                  transferId: docDraft.transferId,
                  kind: docDraft.kind,
                  file: { name: docFile.name, type: docFile.type, size: docFile.size, base64: b64 },
                });
              }}
            >
              رفع الوثيقة
            </button>
            {uploadDoc.error ? <div className="text-sm text-red-700 mt-2">{uploadDoc.error.message}</div> : null}
          </div>

          <div className="space-y-4">
            {reports.flatMap((r: any) => (r.transfers ?? []).map((t: any) => ({ r, t }))).map(({ r, t }: any) => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-slate-900">{formatMad(Number(t.transferred_amount ?? 0))}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t.transferred_at} • {t.bank_ref ? `مرجع: ${t.bank_ref}` : 'بدون مرجع'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">الحالة: <span className="font-bold">{t.approval_status}</span></div>
                    {(t.documents?.length ?? 0) > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.documents.slice(0, 6).map((d: any) => (
                          <a
                            key={d.id}
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold rounded-full bg-slate-100 text-slate-700 px-3 py-1 hover:bg-slate-200"
                          >
                            {DOC_KIND_LABEL[d.kind as DocKind] ?? d.kind}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    {t.approval_status === 'draft' ? (
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                        disabled={submitTransfer.isPending}
                        onClick={() => submitTransfer.mutate({ sessionToken, transferId: t.id })}
                      >
                        إرسال للمراجعة الوطنية
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {(reports.flatMap((r: any) => r.transfers ?? []).length ?? 0) === 0 ? (
              <div className="text-sm text-slate-600">لا توجد تحويلات بعد لهذه السنة.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
