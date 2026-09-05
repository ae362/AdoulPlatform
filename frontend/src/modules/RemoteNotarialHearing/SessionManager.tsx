import React, { useMemo, useState } from 'react';
import { trpc } from '../../trpc';

type RemoteSession = any;

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return { label: 'قادم', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'waiting_identity':
      return { label: 'تحقق الهوية', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'in_progress':
      return { label: 'قيد الجلسة', cls: 'bg-green-100 text-green-700 border-green-200' };
    case 'paused':
      return { label: 'متوقفة', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'completed':
      return { label: 'مكتملة', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'cancelled':
      return { label: 'ملغاة', cls: 'bg-red-100 text-red-700 border-red-200' };
    default:
      return { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

function toLocalDateTimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionManager(props: {
  sessionToken: string;
  sessions: RemoteSession[];
  isLoading: boolean;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreated: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    sessionNumber: '',
    legalReference: '',
    scheduledAt: toLocalDateTimeInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });

  const createSession = trpc.remoteNotarialHearing.createSession.useMutation();

  const sessions = props.sessions ?? [];
  const stats = useMemo(() => {
    const today = new Date();
    const ymd = today.toISOString().slice(0, 10);
    const todayCount = sessions.filter((s) => String(s.scheduled_at || '').slice(0, 10) === ymd).length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const live = sessions.filter((s) => s.status === 'in_progress').length;
    return { todayCount, completed, live };
  }, [sessions]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">إدارة الجلسات</h2>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#1E5F2C] hover:bg-[#154a20] text-white px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <span>➕</span>
          برمجة جلسة جديدة
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-bold text-slate-600">رقم الجلسة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الموعد</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الخطة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الأطراف</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">الحالة</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  جاري تحميل الجلسات...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  لا توجد جلسات بعد. قم ببرمجة جلسة جديدة.
                </td>
              </tr>
            ) : (
              sessions.map((session: any) => {
                const badge = statusBadge(String(session.status || 'scheduled'));
                const isActive = props.activeSessionId === session.id;
                const scheduledAt = session.scheduled_at ? new Date(session.scheduled_at) : null;
                const partiesCount = Number(session.metadata?.partiesCount || 0);
                return (
                  <tr
                    key={session.id}
                    onClick={() => props.onSelectSession(session.id)}
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isActive ? 'bg-green-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#1A5276]">{session.session_number}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {scheduledAt ? (
                        <span className="font-mono text-xs">{scheduledAt.toLocaleString('fr-FR')}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{session.scenario_plan ? `الخطة ${session.scenario_plan}` : '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{partiesCount ? `${partiesCount} طرف/أطراف` : '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="text-[#1A5276] hover:bg-blue-50 p-2 rounded-lg transition-all" title="فتح الجلسة">
                    ▶️
                  </button>
                  <button className="text-slate-400 hover:text-slate-600 p-2 rounded-lg transition-all" title="تعديل">
                    ✏️
                  </button>
                </td>
              </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-[#1A5276] rounded-xl flex items-center justify-center text-xl shadow-inner">📅</div>
          <div>
            <p className="text-slate-500 text-xs">جلسات اليوم</p>
            <p className="text-2xl font-black text-[#1A5276]">{stats.todayCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-[#1E5F2C] rounded-xl flex items-center justify-center text-xl shadow-inner">✅</div>
          <div>
            <p className="text-slate-500 text-xs">إتمام بنجاح</p>
            <p className="text-2xl font-black text-[#1E5F2C]">{stats.completed}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🎬</div>
          <div>
            <p className="text-slate-500 text-xs">قيد البث حالياً</p>
            <p className="text-2xl font-black text-amber-600">{stats.live}</p>
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {isOpen ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800">برمجة جلسة جديدة</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">رقم الجلسة (اختياري)</label>
                  <input
                    value={form.sessionNumber}
                    onChange={(e) => setForm((p) => ({ ...p, sessionNumber: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E5F2C] outline-none"
                    placeholder="مثال: 00125 أو RH-2026-000125"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">موعد الجلسة</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E5F2C] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">مرجع قانوني / ارتباط الجلسة (اختياري)</label>
                <textarea
                  value={form.legalReference}
                  onChange={(e) => setForm((p) => ({ ...p, legalReference: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E5F2C] outline-none min-h-[80px]"
                  placeholder="مثال: عقد #778 / إشعار قضائي رقم ... / ملف خارجي"
                />
              </div>

              {createSession.error ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
                  فشل إنشاء الجلسة: {String((createSession.error as any).message || createSession.error)}
                </div>
              ) : null}
            </div>
            <div className="p-6 border-t bg-white flex justify-end gap-3">
              <button onClick={() => setIsOpen(false)} className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold">إلغاء</button>
              <button
                disabled={createSession.isPending}
                onClick={async () => {
                  const scheduledAtIso = new Date(form.scheduledAt).toISOString();
                  const res: any = await createSession.mutateAsync({
                    sessionToken: props.sessionToken,
                    scheduledAt: scheduledAtIso,
                    sessionNumber: form.sessionNumber.trim() ? form.sessionNumber.trim() : undefined,
                    legalReference: form.legalReference.trim() ? form.legalReference.trim() : undefined,
                  });
                  setIsOpen(false);
                  if (res?.session?.id) props.onSelectSession(res.session.id);
                  props.onCreated();
                }}
                className="px-8 py-2 rounded-xl bg-[#1E5F2C] hover:bg-[#154a20] text-white font-black shadow-lg disabled:opacity-60"
              >
                {createSession.isPending ? 'جارٍ الإنشاء...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
