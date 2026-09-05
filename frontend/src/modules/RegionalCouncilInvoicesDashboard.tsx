import React, { useMemo } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

export const RegionalCouncilInvoicesDashboard: React.FC = () => {
  const { sessionToken, user } = useAuth();
  const year = new Date().getFullYear();

  const enabled = Boolean(sessionToken && user?.id);

  // Fetch invoices for current user - no type filter, get all invoices
  const invoices = trpc.subscriptions.getPaymentsForCouncil.useQuery(
    { year },
    { enabled, staleTime: 15_000 },
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const invoicesList = Array.isArray(invoices.data) ? invoices.data : [];
    console.log('[RegionalCouncilInvoicesDashboard] All invoices from DB:', invoicesList.length);
    console.log('[RegionalCouncilInvoicesDashboard] Current user ID:', user?.id);
    console.log('[RegionalCouncilInvoicesDashboard] Sample invoices:', invoicesList.slice(0, 3));
    
    const userInvoices = invoicesList.filter((inv: any) => inv.user_id === user?.id);
    console.log('[RegionalCouncilInvoicesDashboard] User invoices:', userInvoices.length);

    const totalAmount = userInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount ?? 0), 0);
    const paidAmount = userInvoices
      .filter((inv: any) => Boolean(inv.paid_at))
      .reduce((sum: number, inv: any) => sum + Number(inv.amount ?? 0), 0);
    const unpaidAmount = totalAmount - paidAmount;
    const paidCount = userInvoices.filter((inv: any) => Boolean(inv.paid_at)).length;
    const unpaidCount = userInvoices.length - paidCount;
    const compliancePct = userInvoices.length > 0 ? Math.round((paidCount / userInvoices.length) * 100) : 0;

    return {
      totalInvoices: userInvoices.length,
      paidInvoices: paidCount,
      unpaidInvoices: unpaidCount,
      totalAmount,
      paidAmount,
      unpaidAmount,
      compliancePct,
      invoices: userInvoices,
    };
  }, [invoices.data, user?.id]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">لوحة الفواتير والالتزامات المالية</h1>
        <p className="text-sm text-slate-600 mt-2">عرض شامل للفواتير المتعلقة بالجهة الخاصة بكم للسنة {year}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-emerald-700">{metrics.compliancePct}%</div>
            <div className="text-4xl">📈</div>
          </div>
          <div className="text-sm text-slate-600 font-bold">نسبة الامتثال</div>
          <div className="text-xs text-slate-500 mt-1">{metrics.paidInvoices} من {metrics.totalInvoices} فاتورة</div>
        </div>

        {/* Total Amount Due */}
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-amber-700">{formatMad(metrics.totalAmount)}</div>
            <div className="text-4xl">💰</div>
          </div>
          <div className="text-sm text-slate-600 font-bold">المجموع الكلي</div>
          <div className="text-xs text-slate-500 mt-1">{metrics.totalInvoices} فاتورة</div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-2xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-green-700">{formatMad(metrics.paidAmount)}</div>
            <div className="text-4xl">✅</div>
          </div>
          <div className="text-sm text-slate-600 font-bold">المبلغ المدفوع</div>
          <div className="text-xs text-slate-500 mt-1">{metrics.paidInvoices} فاتورة مدفوعة</div>
        </div>

        {/* Unpaid Amount */}
        <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-bold text-red-700">{formatMad(metrics.unpaidAmount)}</div>
            <div className="text-4xl">⏳</div>
          </div>
          <div className="text-sm text-slate-600 font-bold">المبلغ المتبقي</div>
          <div className="text-xs text-slate-500 mt-1">{metrics.unpaidInvoices} فاتورة غير مدفوعة</div>
        </div>
      </div>

      {/* Status Alert */}
      {metrics.unpaidInvoices > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">فواتير متعلقة بالدفع</h3>
              <p className="text-sm text-red-800">
                يوجد {metrics.unpaidInvoices} فاتورة بقيمة {formatMad(metrics.unpaidAmount)} بانتظار الدفع. يرجى تسديدها في أقرب وقت ممكن.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">قائمة الفواتير</h2>

        {metrics.invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-bold">لا توجد فواتير في الوقت الحالي</p>
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-700">الحالة</th>
                <th className="py-3 px-4 font-bold text-slate-700">تاريخ الاستحقاق</th>
                <th className="py-3 px-4 font-bold text-slate-700">المبلغ</th>
                <th className="py-3 px-4 font-bold text-slate-700">نوع الفاتورة</th>
              </tr>
            </thead>
            <tbody>
              {metrics.invoices.map((invoice: any) => {
                const isPaid = Boolean(invoice.paid_at);
                const statusColor = isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
                const statusText = isPaid ? '✅ مدفوعة' : '⏳ غير مدفوعة';

                return (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{invoice.due_date || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatMad(Number(invoice.amount || 0))}</td>
                    <td className="py-3 px-4 text-slate-700">{invoice.subscription_type === 'yearly' ? 'سنوية' : 'شهرية'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6">
          <h3 className="font-bold text-blue-900 mb-4 text-lg">ملخص الدفع</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-blue-800 font-bold">إجمالي الفواتير</span>
              <span className="text-2xl font-bold text-blue-900">{formatMad(metrics.totalAmount)}</span>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-bold">✅ المدفوع</span>
                <span className="text-xl font-bold text-green-700">{formatMad(metrics.paidAmount)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-700 font-bold">⏳ المتبقي</span>
              <span className="text-xl font-bold text-red-700">{formatMad(metrics.unpaidAmount)}</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6">
          <h3 className="font-bold text-purple-900 mb-4 text-lg">إحصائيات</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-purple-800 font-bold">عدد الفواتير</span>
              <span className="text-2xl font-bold text-purple-900">{metrics.totalInvoices}</span>
            </div>
            <div className="border-t border-purple-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-bold">✅ مدفوعة</span>
                <span className="text-xl font-bold text-green-700">{metrics.paidInvoices}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-700 font-bold">⏳ غير مدفوعة</span>
              <span className="text-xl font-bold text-red-700">{metrics.unpaidInvoices}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
