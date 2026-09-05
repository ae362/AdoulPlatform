import React, { useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';

function badge(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-700';
    case 'waiting_identity':
      return 'bg-amber-100 text-amber-700';
    case 'in_progress':
      return 'bg-green-100 text-green-700';
    case 'paused':
      return 'bg-slate-100 text-slate-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function JudgeRemoteHearings() {
  const { sessionToken } = useAuth();
  const token = sessionToken || '';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.remoteNotarialHearing.listSessions.useQuery(
    { sessionToken: token, limit: 200, offset: 0 },
    { enabled: !!sessionToken },
  );

  const { data: bundle, isLoading: bundleLoading } = trpc.remoteNotarialHearing.getSession.useQuery(
    { sessionToken: token, sessionId: selectedId || '00000000-0000-0000-0000-000000000000' },
    { enabled: !!sessionToken && !!selectedId },
  );

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black text-slate-800 font-maghribi">التلقي عن بُعد</h2>
          <p className="text-sm text-slate-500 mt-1">متابعة جلسات التلقي المعيّنة لقاضي التوثيق</p>
        </div>
        <button onClick={() => refetch()} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold">
          تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-600">رقم الجلسة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-600">الموعد</th>
              <th className="px-6 py-4 text-xs font-black text-slate-600">الحالة</th>
              <th className="px-6 py-4 text-xs font-black text-slate-600">المرجع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  جاري التحميل...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  لا توجد جلسات معيّنة لك حالياً.
                </td>
              </tr>
            ) : (
              sessions.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedId(s.id)}>
                  <td className="px-6 py-4 font-mono font-black text-[#1A5276]">{s.session_number}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.scheduled_at ? <span className="font-mono text-xs">{new Date(s.scheduled_at).toLocaleString('fr-FR')}</span> : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${badge(String(s.status || 'scheduled'))}`}>{String(s.status || 'scheduled')}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-[420px]">{s.legal_reference || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-black">تفاصيل الجلسة</div>
                <div className="font-mono font-black text-slate-800">{bundle?.session?.session_number || '...'}</div>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-slate-600 hover:text-slate-900 font-black">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {bundleLoading ? (
                <div className="text-slate-500">جاري التحميل...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-black text-slate-500">الحالة</div>
                      <div className="font-black text-slate-800 mt-1">{bundle?.session?.status || '—'}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-black text-slate-500">التحقق من الهوية</div>
                      <div className="font-black text-slate-800 mt-1">
                        {bundle?.identityChecks?.filter((c: any) => c.result_status === 'passed')?.length ?? 0} معتمد
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-black text-slate-500">التسجيل</div>
                      <div className="font-black text-slate-800 mt-1">
                        {bundle?.recordings?.some((r: any) => r.status === 'completed') ? 'موجود' : 'غير موجود'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b font-black text-slate-700">الأطراف</div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(bundle?.participants || [])
                        .filter((p: any) => String(p.participant_role) === 'party')
                        .map((p: any) => (
                          <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="font-black text-slate-800">{p.full_name}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">{p.national_id || '—'}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

