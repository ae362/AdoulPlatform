import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../trpc';
import { buildJitsiUrl, isPublicMeetJitSi } from '../modules/RemoteNotarialHearing/jitsi/jitsiUrl';
import JitsiMeeting from '../modules/RemoteNotarialHearing/jitsi/JitsiMeeting';

export default function RemoteHearingJoin() {
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId') || '';
  const joinToken = params.get('token') || '';
  const meetingToken = params.get('meetingToken') || '';

  const [displayName, setDisplayName] = React.useState('');
  const [opened, setOpened] = React.useState(false);

  const info = trpc.remoteNotarialHearing.meetingJoinInfo.useQuery(
    { sessionId, meetingToken: meetingToken || null, joinToken: joinToken || null },
    { enabled: !!sessionId && (!!meetingToken || !!joinToken) },
  );

  React.useEffect(() => {
    if (!joinToken) return;
    if (!info.data?.ok) return;
    if (info.data.suggestedDisplayName && !displayName.trim()) setDisplayName(info.data.suggestedDisplayName);
    // For participant links, open immediately (still needs user gesture in some browsers, so keep button too).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinToken, info.data?.ok, info.data?.suggestedDisplayName]);

  const jitsiDomain = (import.meta as any).env?.VITE_JITSI_DOMAIN || 'meet.jit.si';
  const roomName = sessionId ? `rnh-${sessionId}` : '';
  const jitsiUrl = buildJitsiUrl(jitsiDomain, roomName);

  if (!sessionId || (!joinToken && !meetingToken)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
          <h1 className="text-xl font-black text-slate-800">رابط انضمام غير صالح</h1>
          <p className="text-slate-500 text-sm mt-2">تأكد من استخدام الرابط الذي أرسله لك العدل.</p>
        </div>
      </div>
    );
  }

  const ok = info.data?.ok ?? false;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="bg-white/10 border border-white/10 rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">جلسة التلقي عن بُعد</h1>
            <p className="text-white/70 text-sm mt-1">
              {info.isLoading ? 'جارٍ التحقق من الرابط...' : ok ? 'الرابط صالح' : 'الرابط غير صالح أو منتهي'}
            </p>
          </div>
          <button onClick={() => window.history.back()} className="px-5 py-2 rounded-2xl bg-red-600 hover:bg-red-700 font-black">
            رجوع
          </button>
        </div>

        {!ok && !info.isLoading ? (
          <div className="bg-red-500/15 border border-red-400/30 rounded-2xl p-4 text-red-100 text-sm font-bold">
            رابط الانضمام غير صالح أو منتهي الصلاحية.
          </div>
        ) : null}

        {meetingToken && !joinToken ? (
          <div className="bg-white/10 border border-white/10 rounded-3xl p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-black text-white/70 mb-2">اسمك للانضمام</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 outline-none text-white"
                placeholder="مثال: محمد أحمد"
              />
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="text-slate-900">
              <div className="font-black">فتح المكالمة</div>
              <div className="text-xs text-slate-500 mt-1 font-bold">
                ستظهر المكالمة داخل الصفحة. إذا لم تعمل بسبب قيود المتصفح/الخادم، استخدم زر “فتح Jitsi” في تبويب جديد.
              </div>
            </div>
            <button
              disabled={!ok || (meetingToken && !displayName.trim())}
              onClick={() => {
                setOpened(true);
                window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
              }}
              className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-50"
            >
              فتح Jitsi
            </button>
          </div>
          <div className="p-6 space-y-4">
            {isPublicMeetJitSi(jitsiDomain) ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-sm font-bold">
                تنبيه: <span className="font-mono">meet.jit.si</span> قد لا يعمل داخل الإطار (داخل الصفحة). إذا واجهت خطأ، افتح في تبويب جديد.
              </div>
            ) : null}
            {meetingToken && !displayName.trim() ? (
              <div className="text-slate-700 text-sm font-bold">أدخل اسمك أولاً للانضمام.</div>
            ) : ok ? (
              <div className="rounded-3xl overflow-hidden border border-slate-200 bg-black/10 aspect-video">
                <JitsiMeeting domain={jitsiDomain} roomName={roomName} displayName={displayName.trim() || 'ضيف'} />
              </div>
            ) : null}

            <div className="text-xs text-slate-500 font-mono break-all">{jitsiUrl}</div>
            {opened ? <div className="text-emerald-700 font-black">تم فتح المكالمة في تبويب جديد.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
