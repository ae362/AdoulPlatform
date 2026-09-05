import React, { useMemo, useState } from 'react';
import { trpc } from '../../trpc';

export default function ArchivingAndReports(props: { sessionToken: string }) {
  const [q, setQ] = useState('');
  const { data, isLoading } = trpc.remoteNotarialHearing.listSessions.useQuery(
    { sessionToken: props.sessionToken, status: 'completed', limit: 200, offset: 0 },
    { enabled: !!props.sessionToken },
  );

  const sessions = data?.sessions ?? [];
  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return sessions;
    return sessions.filter((s: any) => String(s.session_number || '').includes(term) || String(s.scheduled_at || '').includes(term));
  }, [q, sessions]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const avgMinutes = (() => {
      const completed = sessions
        .map((s: any) => {
          const a = s.started_at ? new Date(s.started_at).getTime() : null;
          const b = s.ended_at ? new Date(s.ended_at).getTime() : null;
          if (!a || !b || b <= a) return null;
          return Math.round((b - a) / 60000);
        })
        .filter((x: any) => typeof x === 'number') as number[];
      if (!completed.length) return null;
      return Math.round(completed.reduce((acc, n) => acc + n, 0) / completed.length);
    })();
    return { total, avgMinutes };
  }, [sessions]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">🎥</span>
            <span className="text-xs font-bold text-blue-600 bg-slate-50 px-2 py-1 rounded-lg">أرشيف</span>
          </div>
          <p className="text-slate-500 text-xs font-bold">جلسات مكتملة</p>
          <p className="text-3xl font-black mt-1 text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">⏱️</span>
            <span className="text-xs font-bold text-purple-600 bg-slate-50 px-2 py-1 rounded-lg">تقريبي</span>
          </div>
          <p className="text-slate-500 text-xs font-bold">متوسط المدة</p>
          <p className="text-3xl font-black mt-1 text-slate-800">{stats.avgMinutes ? `${stats.avgMinutes} min` : '—'}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm opacity-60">
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">📈</span>
            <span className="text-xs font-bold text-green-600 bg-slate-50 px-2 py-1 rounded-lg">قريباً</span>
          </div>
          <p className="text-slate-500 text-xs font-bold">نسبة النجاح</p>
          <p className="text-3xl font-black mt-1 text-slate-800">—</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm opacity-60">
          <div className="flex justify-between items-start mb-4">
            <span className="text-2xl">⚠️</span>
            <span className="text-xs font-bold text-amber-600 bg-slate-50 px-2 py-1 rounded-lg">قريباً</span>
          </div>
          <p className="text-slate-500 text-xs font-bold">تأخيرات تقنية</p>
          <p className="text-3xl font-black mt-1 text-slate-800">—</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center flex-wrap gap-3">
            <h3 className="font-bold text-slate-800">أرشيف الجلسات الرقمية</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="بحث بالرقم أو التاريخ..."
              className="text-xs px-4 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-[#1E5F2C]"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">رقم الجلسة</th>
                  <th className="px-6 py-4">الموعد</th>
                  <th className="px-6 py-4">الخطة</th>
                  <th className="px-6 py-4">المرجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      لا توجد جلسات مكتملة.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{s.session_number}</td>
                      <td className="px-6 py-4">{s.scheduled_at ? <span className="font-mono text-xs">{new Date(s.scheduled_at).toLocaleString('fr-FR')}</span> : '—'}</td>
                      <td className="px-6 py-4">{s.scenario_plan ? `الخطة ${s.scenario_plan}` : '—'}</td>
                      <td className="px-6 py-4 truncate max-w-[280px] text-slate-600">{s.legal_reference || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1A5276] rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xl mb-6">تحليل الأداء الرقمي</h3>
            <div className="space-y-6 opacity-80">
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-sm">
                سيتم إضافة تقارير دورية: عدد الجلسات، متوسط المدة، نسب النجاح، والتأخيرات المتكررة بعد تفعيل مؤشرات الجودة من سجل الأثر.
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <button disabled className="w-full py-4 bg-white/70 text-[#1A5276] rounded-2xl font-bold cursor-not-allowed shadow-lg">
              إصدار التقرير الإحصائي (قريباً)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

