import React, { useState } from 'react';
import { ClientFollowUp, PastDeedRecord } from '../types';
import { Calendar, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface HistoryTabProps {
  client: ClientFollowUp;
}

type YearFilter = 'current' | 'last5' | 'all';

export const HistoryTab: React.FC<HistoryTabProps> = ({ client }) => {
  const [filter, setFilter] = useState<YearFilter>('all');
  const currentYear = new Date().getFullYear();

  const filteredHistory = client.deedHistory.filter((item: PastDeedRecord) => {
    if (filter === 'current') return item.year === currentYear;
    if (filter === 'last5') return item.year >= currentYear - 5;
    return true;
  });

  const totalDeeds = client.deedHistory.length;
  const settledDeeds = client.deedHistory.filter((d) => d.status === 'settled').length;
  const reliabilityScore = totalDeeds > 0 ? Math.round((settledDeeds / totalDeeds) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 1. تقييم وفاء الزبون وأقدميته */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black font-amiri text-white">
                تاريخ المعاملات التوثيقية للمتعاقد
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                زبون المكتب منذ {client.clientSinceYear}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              مؤشر الوفاء والالتزام المالي: معاملات مسواة تاريخياً بنسبة {reliabilityScore}% ({settledDeeds} من أصل {totalDeeds} رسوم)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">
            {reliabilityScore >= 80 ? 'زبون موثوق ومنتظم الوفاء' : 'يتطلب متابعة استخلاص منتظمة'}
          </span>
        </div>
      </div>

      {/* 2. جدول سجل المعاملات التاريخي مع الفلاتر */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 font-amiri">
              جدول الأرشيف والرسوم السابقة
            </h3>
            <p className="text-xs text-slate-500">
              استعراض العقود والشهادات المنجزة للمتعاقد ومرجعيتها بسجلات التضمين
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
            <button
              type="button"
              onClick={() => setFilter('current')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'current'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذه السنة
            </button>
            <button
              type="button"
              onClick={() => setFilter('last5')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'last5'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              آخر 5 سنوات
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({client.deedHistory.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 text-xs font-black">
                <th className="py-3 px-5">السنة</th>
                <th className="py-3 px-4">نوع الرسم</th>
                <th className="py-3 px-4">المرجع بسجل البيانات</th>
                <th className="py-3 px-4">الأتعاب المقررة</th>
                <th className="py-3 px-4 text-center">الوضعية التاريخية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((item: PastDeedRecord) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-slate-700">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs inline-flex items-center gap-1">
                      <Calendar className="w-3 text-slate-500" />
                      <span>{item.year}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900 font-amiri text-base">
                    {item.deedType}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-600 text-xs">
                    {item.reference}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-xs">
                    {item.fees.toLocaleString('ar-MA')} د.م
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {item.status === 'settled' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🟢 مسوى وخالص الذمة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>
                          🔴 متبقي: {item.remainingAmount?.toLocaleString('ar-MA')} د.م
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
