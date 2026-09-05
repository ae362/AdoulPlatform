import React, { useMemo, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { COURT_MAPPINGS } from '../../../shared/courts';
// import icons as needed
// import jsPDF or similar for PDF export (placeholder)
// import QRCode from 'qrcode.react';

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

function computePaymentStatus(dueAmount: number, transferredAmount: number): string {
  if (transferredAmount >= dueAmount) return 'paid';
  if (transferredAmount > 0) return 'delayed';
  return 'unpaid';
}

function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

function shortAppellateName(appellateCourt: string) {
  // "محكمة الاستئناف بالرباط" -> "الرباط"
  return appellateCourt
    .replace('محكمة الاستئناف', '')
    .replace('بال', '')
    .replace('ب', '')
    .trim();
}

function inferRegionFromCouncilName(councilName: string): string | null {
  const name = normalize(councilName);
  if (!name) return null;
  for (const m of COURT_MAPPINGS) {
    const full = normalize(m.appellateCourt);
    const short = normalize(shortAppellateName(m.appellateCourt));
    if (full && name.includes(full)) return m.appellateCourt;
    if (short && name.includes(short)) return m.appellateCourt;
  }
  return null;
}

export const NationalIncomeRegionsExplorer: React.FC = () => {
  const { sessionToken, user } = useAuth();
  const [year, setYear] = useState<number>(2026);
  const [region, setRegion] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<any>(null);
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>(() => `${new Date().getFullYear()}-12-31`);
  const [invoiceMarkAsPaid, setInvoiceMarkAsPaid] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [regionRates, setRegionRates] = useState<Record<string, number>>({});
  const [ratePct, setRatePct] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem('nationalIncomeRegions.ratePct');
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : 10;
    } catch {
      return 10;
    }
  });

  const enabled = Boolean(sessionToken) && user?.role === 'national_notary_authority';
  
  // Fetch regional contributions data
  const regional = trpc.income.listRegionalContributions.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled, staleTime: 15_000 },
  );
  
  // Fetch all regional councils
  const allCouncils = trpc.income.getAllRegionalCouncils.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled, staleTime: 15_000 },
  );
  
  const invoices = trpc.subscriptions.getPaymentsForCouncil.useQuery(
    { year, type: 'yearly' },
    { enabled, staleTime: 15_000 },
  );

  const createInvoice = trpc.subscriptions.createInvoiceForCouncil.useMutation({
    onSuccess: async (data, variables: any) => {
      console.log('[createInvoice] Success, refetching invoices...');
      alert('تم إنشاء الفاتورة بنجاح');
      
      // Refetch invoices to show the new one - wait for it to complete
      await invoices.refetch();
      
      setIsInvoiceModalOpen(false);
      
      // Expand the row to show the new invoice
      if (variables?.userId) {
        const targetRowKey = String(variables.userId);
        console.log('[createInvoice] Expanding row:', targetRowKey);
        setExpanded((prev) => ({ ...prev, [targetRowKey]: true }));
      }
      
      setInvoiceTarget(null);
      setInvoiceAmount('');
    },
    onError: (error: any) => {
      console.error('[createInvoice] Error:', error?.message || error);
      alert('خطأ في إنشاء الفاتورة: ' + (error?.message || 'حاول مجددا'));
    }
  });

  const toggleStatusMutation = trpc.subscriptions.togglePaymentStatus.useMutation({
    onSuccess: () => {
      invoices.refetch();
    }
  });

  const openInvoiceModal = (row: any) => {
    setInvoiceTarget(row);
    setIsInvoiceModalOpen(true);
  };

  // --- Derived Data ---
  const effectiveRate = ratePct / 100;
  const allRegionsRows = useMemo(() => {
    const reportedCouncils = (regional.data?.rows ?? []).map((row: any) => ({ ...row }));
    const reportedIds = new Set(reportedCouncils.map(r => r.councilUserId));
    
    // Get all councils from database
    const allCouncilsList = allCouncils.data?.councils ?? [];
    
    console.log('[allRegionsRows] Reported councils:', reportedCouncils.length);
    console.log('[allRegionsRows] All councils from DB:', allCouncilsList.length);
    
    // Create rows for councils with reports
    const reportedRows = reportedCouncils;
    
    // Create rows for councils without reports yet
    const unreportedRows = allCouncilsList
      .filter((council: any) => !reportedIds.has(council.userId))
      .map((council: any) => ({
        councilUserId: council.userId,
        councilName: council.councilName,
        regionCode: council.regionCode,
        totalIncome: 0,
        due: 0,
        transferred: 0,
        gap: 0,
        lastTransferAt: null,
        compliancePct: 0,
        complianceStatus: 'red',
        notariesCount: council.notariesCount,
        fairScore: 0,
        avgTimeToTransferDays: null,
        medianTimeToTransferDays: null,
      }));
    
    const result = [...reportedRows, ...unreportedRows];
    console.log('[allRegionsRows] Combined rows:', result.length);
    return result;
  }, [regional.data?.rows, allCouncils.data?.councils]);

  // Build payment map by council
  const paymentsByCouncil = useMemo(() => {
    const map = new Map<string, any[]>();
    const invoicesList = Array.isArray(invoices.data) ? invoices.data : [];
    invoicesList.forEach((inv: any) => {
      const uid = String(inv.user_id ?? '');
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(inv);
    });
    return map;
  }, [invoices.data]);

  // Calculate KPIs
  const kpi = useMemo(() => {
    const totalRegions = allRegionsRows.length;
    let totalTransferred = 0;
    let compliant = 0;
    let totalDelay = 0;
    let delayCount = 0;

    allRegionsRows.forEach((row: any) => {
      const netBalance = Number(row.totalIncome || 0);
      const due = Math.round(netBalance * effectiveRate);
      const transferred = Number(row.transferred ?? 0);
      totalTransferred += transferred;
      
      if (transferred >= due) {
        compliant += 1;
      }
      
      if (row.lastTransferAt) {
        const daysDelay = Math.max(0, Math.floor((new Date().getTime() - new Date(row.lastTransferAt).getTime()) / (1000 * 60 * 60 * 24)));
        totalDelay += daysDelay;
        delayCount += 1;
      }
    });

    const compliancePct = totalRegions > 0 ? Math.round((compliant / totalRegions) * 100) : 0;
    const avgDelay = delayCount > 0 ? Math.round(totalDelay / delayCount) : 0;

    return {
      compliancePct,
      totalTransferred,
      compliant,
      totalRegions,
      avgDelay,
    };
  }, [allRegionsRows, effectiveRate]);

  // --- Filtered Data ---
  const filteredRows = useMemo(() => {
    let rows = allRegionsRows;
    if (region) rows = rows.filter((r: any) => r.regionCode === region);
    if (status) {
      rows = rows.filter((r: any) => {
        const due = Math.round(Number(r.totalIncome ?? 0) * effectiveRate);
        const transferred = Number(r.transferred ?? 0);
        return computePaymentStatus(due, transferred) === status;
      });
    }
    if (search) {
      const q = normalize(search);
      rows = rows.filter((r: any) => {
        const hay = [r.councilName, r.regionCode, r.lastTransferAt].map((v) => normalize(String(v ?? ''))).join(' ');
        return hay.includes(q);
      });
    }
    return rows;
  }, [allRegionsRows, region, status, search, effectiveRate]);

  if (!sessionToken) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">مداخيل الجهات (حسب محاكم الاستئناف)</h2>
        <p className="text-slate-600 mt-2">يلزم تسجيل الدخول.</p>
      </div>
    );
  }
  if (user?.role !== 'national_notary_authority') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-900">مداخيل الجهات (حسب محاكم الاستئناف)</h2>
        <p className="text-slate-600 mt-2">هذه الصفحة متاحة فقط للهيئة الوطنية.</p>
      </div>
    );
  }

  // --- Main UI ---
  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">مداخيل الجهات — الرصيد الصافي والتحويل الوطني</h1>
          <p className="text-sm text-slate-600 mt-1">لوحة حوكمة مالية حديثة للهيئة الوطنية — كل جهة، كل سنة، كل حالة أداء.</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-bold text-slate-700">السنة</span>
          <select
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2026, 2025, 2024, 2023, 2022].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-extrabold">
          نسبة التحصيل: {kpi.compliancePct}%
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-bold text-slate-700">النسبة الوطنية</span>
          <div className="flex items-center gap-1">
            <input
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 w-24 text-center"
              value={ratePct}
              onChange={(e) => setRatePct(Number(e.target.value))}
              inputMode="numeric"
            />
            <span className="text-sm font-bold text-slate-700">%</span>
          </div>
          <button
            className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
            onClick={() => {
              try { window.localStorage.setItem('nationalIncomeRegions.ratePct', String(ratePct)); } catch { /* ignore */ }
            }}
          >
            حفظ
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-emerald-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
          <div className="text-3xl mb-2">📈</div>
          <div className="text-lg font-bold">{kpi.compliancePct}%</div>
          <div className="text-xs text-slate-600 mt-1">نسبة الامتثال السنوي للجهات</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
          <div className="text-3xl mb-2">💸</div>
          <div className="text-lg font-bold">{formatMad(kpi.totalTransferred)}</div>
          <div className="text-xs text-slate-600 mt-1">المجموع الوطني المحول</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
          <div className="text-3xl mb-2">🏛️</div>
          <div className="text-lg font-bold">{kpi.compliant} / {kpi.totalRegions}</div>
          <div className="text-xs text-slate-600 mt-1">عدد الجهات المؤدية</div>
        </div>
        <div className="bg-white border border-purple-200 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
          <div className="text-3xl mb-2">⏳</div>
          <div className="text-lg font-bold">{kpi.avgDelay} يوم</div>
          <div className="text-xs text-slate-600 mt-1">متوسط زمن تحويل الأداء</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-xl p-4">
        <div className="ml-auto">
          <button
            className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white px-4 py-2 rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-indigo-500 transition-all"
            onClick={() => openInvoiceModal(null)}
          >
            إضافة فاتورة
          </button>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">الجهة</label>
          <select className="input mt-1" value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">الكل</option>
            {Array.from(new Set(allRegionsRows.map((r: any) => r.regionCode).filter(Boolean))).map((rc: any) => (
              <option key={rc} value={rc}>{rc}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700">حالة الأداء</label>
          <select className="input mt-1" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">الكل</option>
            <option value="paid">مؤدى</option>
            <option value="unpaid">غير مؤدى</option>
            <option value="delayed">متأخر</option>
            <option value="exempted">معفى</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-700">بحث</label>
          <input className="input mt-1 w-full" placeholder="ابحث باسم المجلس/الجهة/التاريخ…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Modern Financial Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
        {allCouncils.isError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
            خطأ في تحميل المجالس: {String(allCouncils.error)}
          </div>
        )}
        
        {!allCouncils.isLoading && !allCouncils.isError && allRegionsRows.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-300 rounded-2xl">
            <p className="text-sm text-blue-900 font-extrabold mb-4">المجالس الجهوية المسجلة ({allRegionsRows.length}):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allRegionsRows.map((council: any, idx: number) => (
                <div 
                  key={idx} 
                  className="text-sm text-blue-700 bg-white p-3 rounded-lg border border-blue-200 text-center font-bold hover:bg-blue-50 transition-colors"
                >
                  <div>{council.councilName}</div>
                  {council.regionCode && <div className="text-xs text-blue-500 mt-1">({council.regionCode})</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <table className="min-w-[1200px] w-full text-right text-sm modern-financial-grid">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="py-3 px-2">المجلس الجهوي</th>
              <th className="py-3 px-2">السنة</th>
              <th className="py-3 px-2">الرصيد الصافي</th>
              <th className="py-3 px-2">النسبة الوطنية</th>
              <th className="py-3 px-2">المستحق للهيئة</th>
              <th className="py-3 px-2">حالة الأداء</th>
              <th className="py-3 px-2">تاريخ الأداء</th>
              <th className="py-3 px-2">الفاتورة</th>
              <th className="py-3 px-2">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {allCouncils.isLoading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">جاري تحميل البيانات...</td></tr>
            ) : allCouncils.isError ? (
              <tr><td colSpan={9} className="py-8 text-center text-red-400">خطأ في تحميل المجالس</td></tr>
            ) : allRegionsRows.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">لا توجد مجالس جهوية مسجلة</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">لا توجد نتائج</td></tr>
            ) : filteredRows.map((r: any, idx: number) => {
              // Compute values
              const netBalance = Number(r.totalIncome || 0);
              const dueToNational = Math.round(netBalance * effectiveRate);
              const transferred = Number(r.transferred ?? 0);
              const gap = Math.max(0, dueToNational - transferred);
              
              // Placeholder for invoice download
              const rowKey = String(r.councilUserId ?? idx);
              const councilId = r.councilUserId ? String(r.councilUserId) : '';
              const councilInvoices = councilId ? (paymentsByCouncil.get(councilId) ?? []) : [];
              
              // Calculate payment status based on invoices, not income reports
              let statusLabel = 'غير مؤدى', statusColor = 'bg-red-50 text-red-700';
              if (councilInvoices.length > 0) {
                const paidInvoices = councilInvoices.filter((inv: any) => Boolean(inv.paid_at));
                if (paidInvoices.length === councilInvoices.length) {
                  // All invoices are paid
                  statusLabel = 'مؤدى';
                  statusColor = 'bg-green-50 text-green-700';
                } else if (paidInvoices.length > 0) {
                  // Some invoices are paid
                  const unpaidCount = councilInvoices.length - paidInvoices.length;
                  statusLabel = `${unpaidCount} غير مدفوع`;
                  statusColor = 'bg-amber-50 text-amber-700';
                }
                // If paidInvoices.length === 0, it stays "غير مؤدى"
              }
              
              const isExpanded = Boolean(expanded[rowKey]);
              const regionRate = regionRates[rowKey] ?? ratePct;
              const regionEffectiveRate = regionRate / 100;
              const regionDue = Math.round(netBalance * regionEffectiveRate);
              return (
                <React.Fragment key={rowKey}>
                <tr 
                  className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setExpanded((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                >
                  <td className="py-2 px-2 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{isExpanded ? '▼' : '▶'}</span>
                      {r.councilName ?? 'مجلس جهوي'}
                    </div>
                  </td>
                  <td className="py-2 px-2">{year}</td>
                  <td className="py-2 px-2 font-bold text-blue-900">{formatMad(netBalance)}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        className="bg-white border border-slate-300 rounded px-2 py-1 w-16 text-sm font-bold text-slate-900 text-center"
                        min="0"
                        max="100"
                        step="0.1"
                        value={regionRate}
                        onChange={(e) => {
                          const newRate = Number(e.target.value);
                          if (Number.isFinite(newRate) && newRate >= 0) {
                            setRegionRates((prev) => ({ ...prev, [rowKey]: newRate }));
                          }
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700">%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 font-bold text-emerald-700">{formatMad(regionDue)}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                  </td>
                  <td className="py-2 px-2">{r.lastTransferAt ? String(r.lastTransferAt) : '-'}</td>
                  <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:from-blue-700 hover:to-blue-500 transition-all disabled:opacity-50"
                      onClick={() => openInvoiceModal(r)}
                      disabled={!r.councilUserId}
                      title={!r.councilUserId ? 'لا يوجد مجلس مسجل لهذه الجهة' : ''}
                    >
                      إنشاء فاتورة
                    </button>
                  </td>
                  <td className="py-2 px-2 text-slate-600">{gap > 0 ? `متبقي: ${formatMad(gap)}` : '-'}</td>
                </tr>

                {isExpanded && (
                  <tr className="bg-slate-50/60">
                    <td colSpan={9} className="p-4">
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-2 flex items-center justify-between">
                          <div className="font-extrabold text-sm">فواتير الجهة</div>
                          <div className="text-xs opacity-90">{councilInvoices.length} فاتورة</div>
                        </div>
                        <div className="bg-white p-3 overflow-x-auto">
                          <table className="min-w-[700px] w-full text-right text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                              <tr>
                                <th className="py-2 px-2">الحالة</th>
                                <th className="py-2 px-2">تاريخ الاستحقاق</th>
                                <th className="py-2 px-2">المبلغ</th>
                                <th className="py-2 px-2">الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {councilInvoices.map((inv: any) => {
                                const invPaid = Boolean(inv.paid_at);
                                const pill = invPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
                                const pillText = invPaid ? 'مدفوعة' : 'غير مدفوعة';
                                const isToggling = Boolean(toggleStatusMutation.isPending && (toggleStatusMutation.variables as any)?.id === inv.id);

                                return (
                                  <tr key={inv.id} className="border-t border-slate-100">
                                    <td className="py-2 px-2">
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${pill}`}>{pillText}</span>
                                    </td>
                                    <td className="py-2 px-2">{inv.due_date ?? '-'}</td>
                                    <td className="py-2 px-2 font-bold text-slate-900">{formatMad(Number(inv.amount ?? 0))}</td>
                                    <td className="py-2 px-2">
                                      <button
                                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${invPaid ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                        disabled={isToggling}
                                        onClick={() => {
                                          toggleStatusMutation.mutate({
                                            id: inv.id,
                                            userId: inv.user_id,
                                            type: inv.subscription_type,
                                            year: inv.period_year,
                                            status: invPaid ? 'unpaid' : 'paid',
                                            amount: Number(inv.amount ?? 0),
                                          });
                                        }}
                                      >
                                        {isToggling ? 'جاري...' : (invPaid ? 'إلغاء الأداء' : 'تأكيد الأداء')}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {isInvoiceModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsInvoiceModalOpen(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">إضافة فاتورة</h3>
              <button className="text-slate-500 hover:text-slate-900" onClick={() => setIsInvoiceModalOpen(false)}>✕</button>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-slate-700 font-bold">
                {invoiceTarget?.councilName ? `الجهة: ${invoiceTarget.councilName}` : 'اختر جهة من الجدول ثم اضغط "إضافة فاتورة"'}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">الجهة</label>
                <select
                  className="input mt-1 w-full"
                  value={invoiceTarget?.councilUserId ?? ''}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const row = allRegionsRows.find((x: any) => String(x.councilUserId ?? '') === uid) ?? null;
                    setInvoiceTarget(row);
                  }}
                >
                  <option value="">اختر الجهة...</option>
                  {allRegionsRows.filter((x: any) => Boolean(x.councilUserId)).map((x: any) => (
                    <option key={String(x.councilUserId)} value={String(x.councilUserId)}>
                      {x.councilName ?? 'مجلس جهوي'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">المبلغ (د.م)</label>
                <input
                  className="input mt-1 w-full"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="مثال: 2500"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">تاريخ الاستحقاق</label>
                <input
                  className="input mt-1 w-full"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  placeholder={`${year}-12-31`}
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={invoiceMarkAsPaid}
                  onChange={(e) => setInvoiceMarkAsPaid(e.target.checked)}
                />
                إنشاء الفاتورة كمدفوعة
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 bg-slate-100 text-slate-900 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  onClick={() => setIsInvoiceModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-2 rounded-xl font-bold hover:from-blue-700 hover:to-blue-500 transition-all disabled:opacity-50"
                  disabled={
                    createInvoice.isPending ||
                    !invoiceTarget?.councilUserId ||
                    !invoiceAmount ||
                    !Number.isFinite(Number(invoiceAmount)) ||
                    Number(invoiceAmount) <= 0 ||
                    !invoiceDueDate
                  }
                  onClick={() => {
                    createInvoice.mutate({
                      userId: invoiceTarget.councilUserId,
                      subscriptionType: 'yearly',
                      periodYear: year,
                      amount: Number(invoiceAmount),
                      currency: 'MAD',
                      dueDate: invoiceDueDate,
                      status: invoiceMarkAsPaid ? 'paid' : 'unpaid',
                    });
                  }}
                >
                  {createInvoice.isPending ? 'جاري...' : 'إنشاء'}
                </button>
              </div>

              {!invoiceTarget?.councilUserId && (
                <div className="text-xs text-slate-500">
                  أنشئ الفاتورة من زر "إضافة فاتورة" داخل صف الجهة المطلوبة.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
