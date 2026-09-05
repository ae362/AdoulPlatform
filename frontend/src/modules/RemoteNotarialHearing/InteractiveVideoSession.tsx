import React, { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import JitsiMeeting from './jitsi/JitsiMeeting';
import { buildJitsiUrl } from './jitsi/jitsiUrl';

function parseRoomId(input: string) {
  const raw = (input || '').trim();
  if (!raw) return '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      return u.pathname.replace(/^\/+/, '').split('/')[0] || '';
    }
  } catch {
    // ignore
  }
  return raw.replace(/^\/+/, '').split('/')[0] || '';
}

function shouldPreferNewTab(domain: string) {
  return String(domain || '').trim().toLowerCase() === 'meet.jit.si';
}

function NotaryPickerDialog(props: {
  open: boolean;
  onClose: () => void;
  onPick: (email: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const notariesQuery = trpc.notaries.list.useQuery({ search }, { enabled: props.open });

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={props.onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100">
              👥
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">اختيار عدل للمشاركة</div>
              <div className="text-xs text-slate-400 font-bold mt-1">ابحث بالاسم أو البريد الإلكتروني لإرسال دعوة رسمية.</div>
            </div>
          </div>
          <button 
            className="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-200 shadow-sm" 
            onClick={props.onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="relative group">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن اسم العدل أو بريده الإلكتروني..."
              className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#1E5F2C] focus:bg-white transition-all outline-none text-sm font-bold placeholder:text-slate-300"
            />
          </div>

          <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {notariesQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <div className="text-sm font-bold mt-4">جاري البحث في قاعدة البيانات...</div>
              </div>
            ) : (notariesQuery.data?.length ?? 0) === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <div className="text-3xl mb-4">🕵️‍♂️</div>
                <div className="text-sm font-black text-slate-400">لا توجد نتائج مطابقة لبحثك</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {notariesQuery.data?.slice(0, 50).map((n: any) => (
                  <div key={n.id} className="p-5 rounded-3xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all shrink-0">
                        {n.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-800 truncate">{n.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{n.email || '—'}</div>
                        <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1">{n.court_name || n.primary_court || 'محكمة عامة'}</div>
                      </div>
                    </div>
                    <button
                      disabled={!n.email}
                      onClick={async () => {
                        await props.onPick(n.email);
                        props.onClose();
                      }}
                      className="px-6 py-2.5 rounded-2xl bg-[#1E5F2C] text-white text-[11px] font-black shadow-lg shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-30 shrink-0"
                    >
                      دعوة للمشاركة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveVideoSession(props: {
  sessionToken: string;
  session: any | null;
  participants: any[];
  recordings: any[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const displayName = user?.full_name || 'عدل';
  const jitsiDomain = (import.meta as any).env?.VITE_JITSI_DOMAIN || 'meet.jit.si';
  const defaultRoomName = props.session?.id ? `rnh-${props.session.id}` : '';

  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'left' | 'error'>('idle');
  const [callError, setCallError] = useState<string | null>(null);
  const [connectingSince, setConnectingSince] = useState<number | null>(null);

  const meetingLinkQuery = trpc.remoteNotarialHearing.getMeetingLink.useQuery(
    { sessionToken: props.sessionToken, sessionId: props.session?.id || '00000000-0000-0000-0000-000000000000' },
    { enabled: !!props.session?.id },
  );
  const meetingLinkMutation = trpc.remoteNotarialHearing.enableMeetingLink.useMutation();

  const inviteCollaboratorMutation = trpc.remoteNotarialHearing.inviteNotaryCollaborator.useMutation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const [roomInput, setRoomInput] = useState(defaultRoomName);
  const [activeRoomName, setActiveRoomName] = useState(defaultRoomName);
  useEffect(() => {
    setRoomInput(defaultRoomName);
    setActiveRoomName(defaultRoomName);
  }, [defaultRoomName]);

  const jitsiUrl = useMemo(() => buildJitsiUrl(jitsiDomain, activeRoomName || defaultRoomName), [jitsiDomain, activeRoomName, defaultRoomName]);

  const meetingJoinPath = meetingLinkQuery.data?.enabled ? meetingLinkQuery.data?.joinPath : null;
  const meetingFullLink = useMemo(() => {
    if (!meetingJoinPath) return null;
    return `${window.location.origin}${meetingJoinPath}`;
  }, [meetingJoinPath]);

  if (!props.session) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 text-center animate-fadeIn mt-10">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          📂
        </div>
        <p className="font-black text-2xl text-slate-800">اختر جلسة أولاً</p>
        <p className="text-slate-500 mt-2 font-medium">الرجاء اختيار جلسة من "إدارة الجلسات" للبدء.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse gap-8 animate-fadeIn h-full min-h-[800px]" dir="rtl">
      <NotaryPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={async (email) => {
          const res = await inviteCollaboratorMutation.mutateAsync({ sessionToken: props.sessionToken, sessionId: props.session.id, email });
          props.onChanged();
          if (res?.emailSent === false && res?.emailError) {
            alert(`تمت إضافة الدعوة، لكن تعذر إرسال البريد: ${res.emailError}`);
          } else {
            alert('تم إرسال الدعوة بالبريد الإلكتروني.');
          }
        }}
      />
      
      {/* Tools Sidebar */}
      <aside className="w-[360px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto no-scrollbar pb-10">
        {/* Connection Control Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-black text-slate-800 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm">🎥</span>
              أدوات مكالمة Jitsi
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1.5 leading-relaxed">
              نسخ الروابط، دعوة عدول، وإدارة الوصول.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700">الغرفة الحالية</label>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-mono border border-slate-200">{jitsiDomain}</span>
              </div>
              
              <div className="relative group">
                <input
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="مثال: rnh-session-id"
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#1E5F2C] focus:bg-white transition-all outline-none text-xs font-mono text-slate-700 placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3.5 rounded-2xl bg-white text-slate-700 text-xs font-black border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40"
                  disabled={!parseRoomId(roomInput)}
                  onClick={() => {
                    const rid = parseRoomId(roomInput);
                    if (!rid) return;
                    setActiveRoomName(rid);
                  }}
                >
                  فتح داخل الصفحة
                </button>
                <button
                  className="py-3.5 rounded-2xl bg-[#1E5F2C] text-white text-xs font-black shadow-lg shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-40"
                  disabled={!parseRoomId(roomInput)}
                  onClick={() => {
                    const rid = parseRoomId(roomInput);
                    if (!rid) return;
                    // User gesture: open in a new tab to avoid iframe restrictions on meet.jit.si.
                    window.open(`https://${jitsiDomain}/${rid}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                  فتح في تبويب
                </button>
              </div>

              {shouldPreferNewTab(jitsiDomain) ? (
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-3 font-bold leading-relaxed">
                  ملاحظة: <span className="font-mono">meet.jit.si</span> قد يقيّد التشغيل داخل الصفحة (iframe). إذا ظهرت أخطاء اتصال، استخدم “فتح في تبويب”.
                </div>
              ) : null}

              <button
                className="w-full py-3 rounded-2xl bg-slate-50 text-slate-700 text-xs font-black border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                onClick={() => {
                  setRoomInput(defaultRoomName);
                  setActiveRoomName(defaultRoomName);
                }}
              >
                إعادة ضبط للغرفة الافتراضية
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                className="w-full h-12 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
                onClick={async () => {
                  const rid = activeRoomName || defaultRoomName;
                  await navigator.clipboard.writeText(rid);
                  alert('تم نسخ رقم الغرفة');
                }}
              >
                📋 نسخ رقم الغرفة
              </button>
            </div>
          </div>
        </div>

        {/* Public Sharing Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">دعوة الضيوف</div>
              <p className="text-[10px] text-slate-400 font-bold">رابط خاص للمنضمين من الخارج.</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${meetingLinkQuery.data?.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>
          </div>

          {!meetingLinkQuery.data?.enabled ? (
            <button
              disabled={meetingLinkMutation.isPending}
              onClick={async () => {
                await meetingLinkMutation.mutateAsync({
                  sessionToken: props.sessionToken,
                  sessionId: props.session.id,
                  enabled: true,
                  rotateToken: true,
                });
                meetingLinkQuery.refetch();
              }}
              className="w-full py-4 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              🚀 تفعيل الرابط العام
            </button>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 break-all select-all font-mono text-[10px] text-slate-500 leading-relaxed shadow-inner">
                {meetingFullLink}
              </div>
              <button
                onClick={async () => {
                  if (meetingFullLink) {
                    await navigator.clipboard.writeText(meetingFullLink);
                    alert('تم نسخ رابط الجلسة العام');
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-[#1E5F2C] text-white text-[11px] font-black shadow-lg shadow-emerald-900/10 active:scale-[0.98] transition-all"
              >
                نسخ رابط الجلسة
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={meetingLinkMutation.isPending}
                  onClick={async () => {
                    await meetingLinkMutation.mutateAsync({
                      sessionToken: props.sessionToken,
                      sessionId: props.session.id,
                      enabled: false,
                      rotateToken: false,
                    });
                    meetingLinkQuery.refetch();
                  }}
                  className="py-2.5 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-100 hover:bg-rose-100 disabled:opacity-50"
                >
                  🔴 تعطيل
                </button>
                <button
                  disabled={meetingLinkMutation.isPending}
                  onClick={async () => {
                    await meetingLinkMutation.mutateAsync({
                      sessionToken: props.sessionToken,
                      sessionId: props.session.id,
                      enabled: true,
                      rotateToken: true,
                    });
                    meetingLinkQuery.refetch();
                  }}
                  className="py-2.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-100 hover:bg-blue-100 disabled:opacity-50"
                >
                  🔄 تدوير
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notary Invitations */}
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -rotate-45 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">دعوات العدول</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
            </div>
            <p className="text-[10px] text-slate-400 mb-5 font-bold">دعوة عدول آخرين للمشاركة في الجلسة.</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 transition-all text-xs font-black flex items-center justify-center gap-2"
            >
              ➕ إضافة عدل للجلسة
            </button>
          </div>
        </div>
      </aside>

      {/* Main Video Section */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Session Info Bar */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex -space-x-3 overflow-hidden translate-x-3 rtl:translate-x-0 rtl:-translate-x-3">
              {props.participants.slice(0, 3).map((p, i) => (
                <div key={p.id} className="inline-block h-10 w-10 rounded-full ring-4 ring-white bg-[#F1F5F9] flex items-center justify-center text-[11px] font-black text-slate-600 border border-slate-200">
                  {p.full_name?.charAt(0) || '?'}
                </div>
              ))}
              {props.participants.length > 3 && (
                <div className="flex items-center justify-center h-10 w-10 rounded-full ring-4 ring-white bg-[#1E5F2C] text-white text-[10px] font-black">
                  +{props.participants.length - 3}
                </div>
              )}
            </div>
            <div className="mr-8 border-r h-10 pl-8 border-slate-100 flex flex-col justify-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">موضوع الجلسة</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{props.session.session_subject || 'جلسة توثيق عدلي'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-5 py-2.5 rounded-2xl text-xs font-black border flex items-center gap-2 transition-all ${
              callStatus === 'connected' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              <span className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              حالة الاتصال: {callStatus === 'connected' ? 'مُتصل' : callStatus === 'error' ? 'غير متصل' : 'جارٍ الاتصال'}
            </div>
            <div className="h-10 w-[1px] bg-slate-100 mx-2"></div>
            <button
              className="h-10 px-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-all text-xs font-black"
              onClick={() => window.open(jitsiUrl, '_blank', 'noopener,noreferrer')}
            >
              فتح في تبويب
            </button>
          </div>
        </div>

        {/* Video Embedding Area */}
        <div className="flex-1 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden relative border-[12px] border-white group">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"></div>
          <div className="relative z-10 w-full h-full min-h-[520px]">
            <JitsiMeeting
              domain={jitsiDomain}
              roomName={activeRoomName}
              displayName={displayName}
              onStatus={(s, details) => {
                setCallStatus(s);
                if (s === 'connecting') {
                  setCallError(null);
                  setConnectingSince(Date.now());
                }
                if (s === 'connected') {
                  setCallError(null);
                  setConnectingSince(null);
                }
                if (s === 'left') {
                  setConnectingSince(null);
                }
                if (s === 'error') {
                  setCallError(typeof details === 'string' ? details : details ? String(details) : 'Jitsi error');
                  setConnectingSince(null);
                }
              }}
            />
          </div>
          
          {/* Non-blocking status hint (do not cover Jitsi UI) */}
          {callStatus === 'connecting' ? (
            <div className="absolute top-6 left-6 z-20">
              <div className="bg-white/90 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3 shadow-lg max-w-sm">
                <div className="flex items-center gap-3">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900">جارٍ تحميل مكالمة Jitsi...</div>
                    <div className="text-[10px] text-slate-600">قد تحتاج للضغط على “Join meeting” داخل Jitsi للسماح بالصوت/الكاميرا.</div>
                  </div>
                </div>
                {connectingSince && Date.now() - connectingSince > 12000 ? (
                  <button
                    className="mt-3 w-full py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black"
                    onClick={() => window.open(`https://${jitsiDomain}/${activeRoomName}`, '_blank', 'noopener,noreferrer')}
                  >
                    فتح في تبويب جديد
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          
          {callStatus === 'error' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#020617]/95 backdrop-blur-xl text-white p-10 text-center animate-fadeIn">
              <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-5xl mb-8 border border-rose-500/20">
                ⚠️
              </div>
              <div className="text-3xl font-black">عذراً، حدث خطأ في الاتصال</div>
              <p className="text-slate-400 mt-4 max-w-md mx-auto font-bold leading-relaxed">
                {callError || 'تعذر الاتصال بخادم الفيديو. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.'}
              </p>
              {String(callError || '').includes('Members Only') || String(callError || '').includes('membersOnly') ? (
                <p className="text-slate-400 mt-2 max-w-md mx-auto text-sm font-bold leading-relaxed">
                  يبدو أن خادم <span className="font-mono">meet.jit.si</span> رفض الانضمام داخل التطبيق. جرّب فتح المكالمة في تبويب جديد.
                </p>
              ) : null}
              <button
                onClick={() => window.open(`https://${jitsiDomain}/${activeRoomName}`, '_blank', 'noopener,noreferrer')}
                className="mt-6 px-10 py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95"
              >
                فتح المكالمة في تبويب جديد
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="mt-10 px-10 py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95"
              >
                تحديث الصفحة والاتصال مجدداً
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
