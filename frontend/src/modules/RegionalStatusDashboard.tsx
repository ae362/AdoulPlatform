import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

type DocKind =
  | 'financial_report'
  | 'meeting_minutes'
  | 'training'
  | 'governance_report'
  | 'communication'
  | 'solidarity'
  | 'legal_activity'
  | 'other';

const KIND_LABEL: Record<DocKind, string> = {
  financial_report: 'تقارير مالية',
  meeting_minutes: 'محاضر الاجتماعات',
  training: 'التكوين والتأهيل',
  governance_report: 'الحكامة والانضباط',
  communication: 'التواصل والترافع',
  solidarity: 'التضامن المهني',
  legal_activity: 'العمل القانوني',
  other: 'أخرى',
};

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

function percent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function badgeColor(traffic: string) {
  if (traffic === 'green') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (traffic === 'yellow') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (traffic === 'red') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
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

export function RegionalStatusDashboard() {
  const { user, sessionToken } = useAuth();
  const utils = trpc.useUtils();

  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [selectedCouncilId, setSelectedCouncilId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<Record<string, boolean>>({});

  const [tab, setTab] = useState<'overview' | 'documents' | 'compare'>('overview');

  const [uploadKind, setUploadKind] = useState<DocKind>('financial_report');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');

  const isNational = user?.role === 'national_notary_authority';
  const isRegional = user?.role === 'regional_adoul_council';

  const list = trpc.regionalStatus.listRegions.useQuery(
    { sessionToken: sessionToken ?? '', reportYear },
    { enabled: Boolean(sessionToken && isNational) },
  );

  const effectiveSelectedId = useMemo(() => {
    if (isRegional && !isNational) return user?.id ?? null;
    return selectedCouncilId ?? list.data?.rows?.[0]?.councilUserId ?? null;
  }, [isNational, isRegional, list.data?.rows, selectedCouncilId, user?.id]);

  const details = trpc.regionalStatus.getRegionDetails.useQuery(
    { sessionToken: sessionToken ?? '', reportYear, councilUserId: effectiveSelectedId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled: Boolean(sessionToken && effectiveSelectedId && (isNational || isRegional)) },
  );

  const docs = trpc.regionalStatus.listDocuments.useQuery(
    { sessionToken: sessionToken ?? '', councilUserId: effectiveSelectedId ?? '00000000-0000-0000-0000-000000000000', reportYear, kind: null },
    { enabled: Boolean(sessionToken && effectiveSelectedId && (isNational || isRegional)) },
  );

  const upload = trpc.regionalStatus.uploadDocument.useMutation({
    onSuccess: () => {
      utils.regionalStatus.listDocuments.invalidate();
      setUploadFile(null);
      setUploadTitle('');
      setUploadTags('');
      setUploadKind('financial_report');
      setOcrText('');
    },
  });

  const ocrParse = trpc.ocr.parseText.useMutation();

  const rows = list.data?.rows ?? [];

  const compareRows = useMemo(() => {
    const chosen = Object.keys(compareIds).filter((id) => compareIds[id]);
    if (chosen.length === 0) return [];
    return rows.filter((r: any) => chosen.includes(r.councilUserId));
  }, [compareIds, rows]);

  if (!sessionToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">الوضع الجهوي</h2>
        <p className="text-slate-600 mt-2">يلزم تسجيل الدخول لعرض قسم الوضع الجهوي.</p>
      </div>
    );
  }

  if (!isNational && !isRegional) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">الوضع الجهوي</h2>
        <p className="text-slate-600 mt-2">هذه الصفحة متاحة للهيئة الوطنية والمجالس الجهوية فقط.</p>
      </div>
    );
  }

  // Regional users: lock to their own council id (user id)
  const canBrowseAll = isNational;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">🌍 الوضع الجهوي</h2>
          <p className="text-sm text-slate-600 mt-1">لوحة قرار وطنية تجمع المؤشرات المهنية والمالية والوثائق حسب الجهة.</p>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm font-bold text-slate-700">السنة:</label>
          <input
            type="number"
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            className="input w-28"
            min={2000}
            max={2100}
          />
          <button
            type="button"
            onClick={() => {
              list.refetch();
              details.refetch();
              docs.refetch();
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">الجهات</h3>
            {isNational && (
              <div className="text-xs text-slate-500">{rows.length} جهة</div>
            )}
          </div>

          {!canBrowseAll ? (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
              عرض جهة واحدة فقط (حساب مجلس جهوي).
            </div>
          ) : list.isLoading ? (
            <div className="mt-4 text-sm text-slate-500">تحميل…</div>
          ) : list.error ? (
            <div className="mt-4 text-sm text-red-700">تعذر تحميل الجهات: {list.error.message}</div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[560px] overflow-auto pr-1">
              {rows.map((r: any) => {
                const active = effectiveSelectedId === r.councilUserId;
                return (
                  <button
                    key={r.councilUserId}
                    type="button"
                    onClick={() => setSelectedCouncilId(r.councilUserId)}
                    className={`w-full text-right rounded-xl border px-3 py-2 transition ${
                      active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{r.councilName}</div>
                        <div className="text-xs text-slate-500 mt-1">امتثال: {percent(r.financial.compliancePct)}</div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badgeColor(r.traffic)}`}>
                        {r.traffic === 'green' ? 'جيد' : r.traffic === 'yellow' ? 'متوسط' : r.traffic === 'red' ? 'حرج' : 'غير متاح'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(compareIds[r.councilUserId])}
                          onChange={(e) => setCompareIds((prev) => ({ ...prev, [r.councilUserId]: e.target.checked }))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        مقارنة
                      </label>
                      <div className="text-xs text-slate-500">{formatMad(r.financial.transferredApproved)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {isNational && list.data?.national && (
            <div className="mt-4 rounded-xl bg-slate-900 text-white p-4">
              <div className="text-sm font-extrabold">ملخص وطني</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-300">مجموع الواجب 10%</div>
                  <div className="font-bold">{formatMad(list.data.national.totalDue10Pct)}</div>
                </div>
                <div>
                  <div className="text-slate-300">المحول المعتمد</div>
                  <div className="font-bold">{formatMad(list.data.national.totalTransferredApproved)}</div>
                </div>
                <div>
                  <div className="text-slate-300">الامتثال الوطني</div>
                  <div className="font-bold">{percent(list.data.national.nationalCompliancePct)}</div>
                </div>
                <div>
                  <div className="text-slate-300">المصاريف</div>
                  <div className="font-bold">{formatMad(list.data.national.totalExpenses)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">تفاصيل الجهة</div>
                <div className="text-xl font-extrabold text-slate-900">
                  {details.data?.profile?.councilName ?? (details.isLoading ? 'تحميل…' : '-')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('overview')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'overview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  مؤشرات
                </button>
                <button
                  type="button"
                  onClick={() => setTab('documents')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'documents' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  الوثائق
                </button>
                {isNational && (
                  <button
                    type="button"
                    onClick={() => setTab('compare')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'compare' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    مقارنة
                  </button>
                )}
              </div>
            </div>

            {details.error && <div className="mt-3 text-sm text-red-700">{details.error.message}</div>}

            {tab === 'overview' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">الامتثال (المحول/الواجب)</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {percent(details.data?.financial?.compliancePct)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">واجب 10%: {formatMad(details.data?.financial?.totalDue ?? 0)}</div>
                    <div className="text-xs text-slate-500">محول: {formatMad(details.data?.financial?.totalTransferred ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">المصاريف الوطنية المرتبطة</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatMad(details.data?.financial?.totalExpenses ?? 0)}</div>
                    <div className="mt-2 text-xs text-slate-500">(تجمع: المقبول + قيد المراجعة + المؤجل)</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">المؤشرات المهنية</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {details.data?.professional?.notariesCountComputed ?? details.data?.professional?.notariesCountProfile ?? '-'}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">عدد المكاتب: {details.data?.professional?.officesCountComputed ?? '-'}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900">اتجاه شهري (تقريبي)</div>
                      <div className="text-xs text-slate-500 mt-1">يوزع التقارير ربع/سنة على الشهور بشكل متوازن للتقريب.</div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto">
                    <table className="min-w-[720px] w-full text-sm">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-right py-2">الشهر</th>
                          <th className="text-right py-2">واجب 10%</th>
                          <th className="text-right py-2">محول معتمد</th>
                          <th className="text-right py-2">مصاريف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="py-2">{idx + 1}</td>
                            <td className="py-2">{formatMad(details.data?.financial?.monthlyDue?.[idx] ?? 0)}</td>
                            <td className="py-2">{formatMad(details.data?.financial?.monthlyTransferred?.[idx] ?? 0)}</td>
                            <td className="py-2">{formatMad(details.data?.financial?.monthlyExpenses?.[idx] ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-extrabold text-slate-900">خريطة (قريباً)</div>
                  <p className="text-sm text-slate-600 mt-2">يمكن إضافة خريطة تفاعلية للمغرب (Leaflet/Mapbox) لعرض الحالة بالألوان وربطها بالتفاصيل.</p>
                </div>
              </div>
            )}

            {tab === 'documents' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-extrabold text-slate-900">إضافة وثيقة</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">التصنيف</label>
                      <select className="input mt-1" value={uploadKind} onChange={(e) => setUploadKind(e.target.value as DocKind)}>
                        {Object.entries(KIND_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">العنوان</label>
                      <input className="input mt-1" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="مثال: تقرير مالي 2026" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700">الوسوم (مفصولة بفواصل)</label>
                      <input className="input mt-1" value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="حكامة,تقرير,اجتماع" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700">الملف</label>
                      <input type="file" className="input mt-1" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                      <div className="text-xs text-slate-500 mt-1">يدعم الرفع إلى Supabase Storage (حسب إعدادات البيئة).</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700">نص OCR (اختياري)</label>
                      <textarea className="input mt-1 h-28" value={ocrText} onChange={(e) => setOcrText(e.target.value)} placeholder="سيظهر النص المستخرج هنا…" />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!uploadFile) return;
                            const b64 = await toBase64(uploadFile);
                            const res: any = await ocrParse.mutateAsync({ base64: b64 });
                            setOcrText(String(res?.text ?? res?.rawText ?? res ?? ''));
                          }}
                          disabled={!uploadFile || ocrParse.isPending}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-40"
                        >
                          استخراج OCR
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!effectiveSelectedId || !uploadFile || !uploadTitle.trim()) return;
                            const b64 = await toBase64(uploadFile);
                            await upload.mutateAsync({
                              sessionToken,
                              councilUserId: effectiveSelectedId,
                              kind: uploadKind,
                              title: uploadTitle.trim(),
                              tags: uploadTags
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                              reportYear,
                              ocrText: ocrText || null,
                              file: { name: uploadFile.name, type: uploadFile.type, size: uploadFile.size, base64: b64 },
                            });
                          }}
                          disabled={!effectiveSelectedId || !uploadFile || !uploadTitle.trim() || upload.isPending}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                        >
                          رفع الوثيقة
                        </button>
                      </div>
                      {upload.error && <div className="text-sm text-red-700 mt-2">{upload.error.message}</div>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-extrabold text-slate-900">وثائق الجهة</div>
                  {docs.isLoading ? (
                    <div className="text-sm text-slate-500 mt-3">تحميل…</div>
                  ) : docs.error ? (
                    <div className="text-sm text-red-700 mt-3">{docs.error.message}</div>
                  ) : (docs.data?.rows?.length ?? 0) === 0 ? (
                    <div className="text-sm text-slate-500 mt-3">لا توجد وثائق بعد.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(docs.data?.rows ?? []).map((d: any) => (
                        <div key={d.id} className="rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-4">
                          <div>
                            <div className="font-bold text-slate-900">{d.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {KIND_LABEL[d.kind as DocKind] ?? d.kind} • {d.uploaded_at?.slice(0, 10) ?? ''}
                            </div>
                            {(d.tags?.length ?? 0) > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(d.tags ?? []).slice(0, 6).map((t: string, idx: number) => (
                                  <span key={idx} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {d.file_url && (
                              <a
                                href={d.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                              >
                                فتح
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'compare' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-extrabold text-slate-900">مقارنة جهات مختارة</div>
                  <div className="text-sm text-slate-600 mt-1">اختر جهات من القائمة (يسار) ثم اعرض المقارنة هنا.</div>
                  {(compareRows.length ?? 0) === 0 ? (
                    <div className="text-sm text-slate-500 mt-3">لم يتم اختيار أي جهة للمقارنة.</div>
                  ) : (
                    <div className="mt-4 overflow-auto">
                      <table className="min-w-[900px] w-full text-sm">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-right py-2">الجهة</th>
                            <th className="text-right py-2">امتثال</th>
                            <th className="text-right py-2">واجب 10%</th>
                            <th className="text-right py-2">محول معتمد</th>
                            <th className="text-right py-2">فجوة</th>
                            <th className="text-right py-2">مصاريف</th>
                            <th className="text-right py-2">عدول</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareRows.map((r: any) => (
                            <tr key={r.councilUserId} className="border-t border-slate-100">
                              <td className="py-2 font-bold text-slate-900">{r.councilName}</td>
                              <td className="py-2">{percent(r.financial.compliancePct)}</td>
                              <td className="py-2">{formatMad(r.financial.due10Pct)}</td>
                              <td className="py-2">{formatMad(r.financial.transferredApproved)}</td>
                              <td className="py-2">{formatMad(r.financial.gap)}</td>
                              <td className="py-2">{formatMad(r.financial.expensesTotal)}</td>
                              <td className="py-2">{r.professional.notariesCountComputed ?? r.professional.notariesCountProfile ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
