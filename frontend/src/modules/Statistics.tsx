import React, { useState } from 'react';
import { trpc } from '../trpc';

export function StatisticsModule() {
  const { data: summary } = trpc.statistics.summary.useQuery();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState<{ from?: string; to?: string } | undefined>(undefined);

  const { data: marriageDivorce } = trpc.statistics.marriageDivorce.useQuery(filter, {
    keepPreviousData: true,
  });
  const { data: fees } = trpc.statistics.fees.useQuery(filter, {
    keepPreviousData: true,
  });

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter({
      from: from || undefined,
      to: to || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="mb-3 text-base font-semibold">إحصائيات الرسوم العدلية</h3>
        <form onSubmit={applyFilter} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">من تاريخ</label>
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">إلى تاريخ</label>
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full md:w-auto" type="submit">
              بحث
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summary?.summary.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-3xl font-bold text-slate-900">{s.count}</div>
          </div>
        )) || <p>جاري تحميل ملخص الإحصائيات...</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow">
          <h4 className="mb-2 text-base font-semibold">إحصائيات الزواج</h4>
          <table className="min-w-full text-sm rtl:text-right">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-right">النوع</th>
                <th className="p-2 text-right">العدد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">زواج الراشد</td>
                <td className="p-2">{marriageDivorce?.marriageStats.adult ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">زواج القاصر</td>
                <td className="p-2">{marriageDivorce?.marriageStats.minor ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">زواج المختلط</td>
                <td className="p-2">{marriageDivorce?.marriageStats.mixed ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">زواج ذوي الإعاقة</td>
                <td className="p-2">{marriageDivorce?.marriageStats.disabled ?? 0}</td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="p-2">المجموع</td>
                <td className="p-2">{marriageDivorce?.marriageStats.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <h4 className="mb-2 text-base font-semibold">إحصائيات الطلاق</h4>
          <table className="min-w-full text-sm rtl:text-right">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-right">النوع</th>
                <th className="p-2 text-right">العدد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">الطلاق للشقاق</td>
                <td className="p-2">{marriageDivorce?.divorceStats.shiqaq ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">الطلاق الاتفاقي</td>
                <td className="p-2">{marriageDivorce?.divorceStats.agreement ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">الطلاق الخلعي</td>
                <td className="p-2">{marriageDivorce?.divorceStats.khul ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">الطلاق المملك</td>
                <td className="p-2">{marriageDivorce?.divorceStats.mamluk ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">الطلاق المكمل للثلاث</td>
                <td className="p-2">{marriageDivorce?.divorceStats.complete_three ?? 0}</td>
              </tr>
              <tr>
                <td className="p-2">الطلاق البائن</td>
                <td className="p-2">{marriageDivorce?.divorceStats.bain ?? 0}</td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="p-2">المجموع</td>
                <td className="p-2">{marriageDivorce?.divorceStats.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-2 text-base font-semibold">إحصائيات الرسوم الأخرى</h4>
        <table className="min-w-full text-sm rtl:text-right">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-right">النوع</th>
              <th className="p-2 text-right">العدد</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">رسوم الأملاك العقارية</td>
              <td className="p-2">{fees?.propertyCount ?? 0}</td>
            </tr>
            <tr>
              <td className="p-2">رسوم التركات والوصايا</td>
              <td className="p-2">{fees?.inheritanceCount ?? 0}</td>
            </tr>
            <tr>
              <td className="p-2">رسوم باقي الوثائق</td>
              <td className="p-2">{fees?.otherCount ?? 0}</td>
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td className="p-2">المجموع العام</td>
              <td className="p-2">{fees?.total ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

