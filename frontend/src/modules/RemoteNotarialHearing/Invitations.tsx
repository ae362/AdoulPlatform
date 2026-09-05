import React, { useMemo, useState } from 'react';
import { trpc } from '../../trpc';

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR');
}

function statusLabel(status: string) {
  if (status === 'pending') return { text: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (status === 'accepted') return { text: 'مقبولة', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'declined') return { text: 'مرفوضة', cls: 'bg-red-50 text-red-700 border-red-200' };
  return { text: status, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export default function Invitations(props: {
  sessionToken: string;
  onAccepted: (sessionId: string) => void;
}) {
  const incoming = trpc.remoteNotarialHearing.listMyInvitations.useQuery({ sessionToken: props.sessionToken, status: 'pending' });
  const outgoing = trpc.remoteNotarialHearing.listOutgoingInvitations.useQuery({ sessionToken: props.sessionToken, limit: 100 });
  const accept = trpc.remoteNotarialHearing.acceptInvitation.useMutation();
  const decline = trpc.remoteNotarialHearing.declineInvitation.useMutation();
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});

  const incomingItems = useMemo(() => incoming.data?.invitations ?? [], [incoming.data?.invitations]);
  const outgoingItems = useMemo(() => outgoing.data?.invitations ?? [], [outgoing.data?.invitations]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">الدعوات</h2>
          <p className="text-slate-500 mt-1">دعوات العدول للجلسات وقبولها للانضمام مباشرة إلى المكالمة</p>
        </div>
        <button
          onClick={async () => {
            await incoming.refetch();
            await outgoing.refetch();
          }}
          className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black"
        >
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50">
            <h3 className="font-black text-slate-800">الدعوات الواردة</h3>
            <p className="text-xs text-slate-500 mt-1">عند القبول سيتم فتح الجلسة ونقلك إلى “جلسة التلقي”.</p>
          </div>
          <div className="p-6 space-y-4">
            {incoming.isLoading ? (
              <div className="text-sm text-slate-400">تحميل...</div>
            ) : incomingItems.length === 0 ? (
              <div className="text-sm text-slate-500">لا توجد دعوات واردة حالياً.</div>
            ) : (
              incomingItems.map((inv: any) => (
                <div key={inv.id} className="p-5 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">
                        جلسة: {inv.session?.sessionNumber || inv.sessionId}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        الموعد: <span className="font-mono">{formatDateTime(inv.session?.scheduledAt)}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        من: {inv.invitedBy?.fullName || inv.invitedBy?.email || '—'}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusLabel(inv.status).cls}`}>
                      {statusLabel(inv.status).text}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex gap-2">
                      <button
                        disabled={accept.isPending}
                        onClick={async () => {
                          const res = await accept.mutateAsync({ sessionToken: props.sessionToken, invitationId: inv.id });
                          await incoming.refetch();
                          await outgoing.refetch();
                          props.onAccepted(res.sessionId);
                        }}
                        className="flex-1 px-4 py-2 rounded-xl bg-[#1E5F2C] text-white font-black disabled:opacity-50"
                      >
                        قبول والانضمام
                      </button>
                      <button
                        disabled={decline.isPending}
                        onClick={async () => {
                          await decline.mutateAsync({
                            sessionToken: props.sessionToken,
                            invitationId: inv.id,
                            reason: (declineReason[inv.id] || '').trim() || null,
                          });
                          await incoming.refetch();
                          await outgoing.refetch();
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white font-black disabled:opacity-50"
                      >
                        رفض
                      </button>
                    </div>
                    <input
                      value={declineReason[inv.id] || ''}
                      onChange={(e) => setDeclineReason((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                      placeholder="سبب الرفض (اختياري)"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50">
            <h3 className="font-black text-slate-800">الدعوات الصادرة</h3>
            <p className="text-xs text-slate-500 mt-1">متابعة حالة الدعوات التي أرسلتها لعدول آخرين.</p>
          </div>
          <div className="p-6 space-y-4">
            {outgoing.isLoading ? (
              <div className="text-sm text-slate-400">تحميل...</div>
            ) : outgoingItems.length === 0 ? (
              <div className="text-sm text-slate-500">لا توجد دعوات صادرة بعد.</div>
            ) : (
              outgoingItems.map((inv: any) => (
                <div key={inv.id} className="p-5 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">
                        جلسة: {inv.session?.sessionNumber || inv.sessionId}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        المدعو: {inv.invitedUser?.fullName || inv.invitedUser?.email || inv.invitedUser?.userId || '—'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        الموعد: <span className="font-mono">{formatDateTime(inv.session?.scheduledAt)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusLabel(inv.status).cls}`}>
                      {statusLabel(inv.status).text}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

