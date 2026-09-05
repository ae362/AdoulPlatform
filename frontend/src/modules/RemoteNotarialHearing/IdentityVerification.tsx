import React, { useMemo, useState } from 'react';
import { trpc } from '../../trpc';

type Participant = any;
type IdentityCheck = any;

interface Props {
  sessionToken: string;
  session: any | null;
  participants: Participant[];
  identityChecks: IdentityCheck[];
  isLoading: boolean;
  onNext?: () => void;
  onChanged?: () => void;
}

type UploadFile = { name: string; type: string; size: number; base64: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToUpload(file: File): Promise<UploadFile> {
  return { name: file.name, type: file.type || 'application/octet-stream', size: file.size, base64: await fileToBase64(file) };
}

export default function IdentityVerification(props: Props) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [livePhotoFile, setLivePhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const upsert = trpc.remoteNotarialHearing.upsertIdentityCheck.useMutation();
  const verify = trpc.remoteNotarialHearing.verifyIdentityResult.useMutation();

  const parties = useMemo(
    () => props.participants.filter((p) => String(p.participant_role) === 'party'),
    [props.participants],
  );

  React.useEffect(() => {
    if (!selectedParticipantId && parties.length) setSelectedParticipantId(parties[0].id);
  }, [selectedParticipantId, parties]);

  const selectedParticipant = parties.find((p) => p.id === selectedParticipantId) || null;
  const existingCheck = props.identityChecks.find((c) => c.participant_id === selectedParticipantId) || null;

  const steps = {
    idCard: Boolean(existingCheck?.id_card_verified),
    faceMatch: Boolean(existingCheck?.face_match_verified),
    voiceMatch: Boolean(existingCheck?.voice_match_verified),
    docUpload: Boolean(existingCheck?.doc_upload_url),
    livePhoto: Boolean(existingCheck?.live_photo_url),
  };

  const checklist = [
    { key: 'idCard', label: 'التحقق من بطاقة التعريف الوطنية', icon: '🪪' },
    { key: 'faceMatch', label: 'مطابقة الوجه (اختياري قانونياً)', icon: '🎭' },
    { key: 'voiceMatch', label: 'مطابقة الصوت (اختياري قانونياً)', icon: '🎙️' },
    { key: 'docUpload', label: 'تحميل وثيقة إثبات الهوية (PDF/Image)', icon: '📄' },
    { key: 'livePhoto', label: 'التقاط صورة حية', icon: '📸' },
  ] as const;

  if (!props.session) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
        <p className="font-bold text-slate-800">اختر جلسة أولاً من "إدارة الجلسات".</p>
      </div>
    );
  }

  if (props.isLoading) {
    return <div className="text-center text-slate-500 p-6">جاري تحميل بيانات التحقق...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">التحقق القانوني من الهوية</h2>
            <p className="text-slate-500 border-r-4 border-amber-400 pr-3 text-sm">
              هذه الخطوة إلزامية قانونياً؛ التسجيل الصوتي–المرئي يعتبر جزءاً لا يتجزأ من الوثيقة العدلية.
            </p>
          </div>
          <div className="text-left">
            <div className="text-xs text-slate-500 font-bold">رقم الجلسة</div>
            <div className="font-mono font-black text-slate-800">{props.session.session_number}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Participants */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="font-black text-slate-700 mb-3">الأطراف</h3>
            <div className="space-y-2">
              {parties.length === 0 ? (
                <div className="text-slate-500 text-sm">لا توجد أطراف بعد. أضف الأطراف في تبويب "بيانات الأطراف".</div>
              ) : (
                parties.map((p) => {
                  const check = props.identityChecks.find((c) => c.participant_id === p.id);
                  const status = check?.result_status || 'pending';
                  const statusCls =
                    status === 'passed'
                      ? 'bg-green-100 text-green-700'
                      : status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700';
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelectedParticipantId(p.id)}
                      className={`w-full text-right p-3 rounded-xl border transition ${
                        selectedParticipantId === p.id ? 'border-[#1E5F2C] bg-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-slate-800 truncate">{p.full_name}</div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${statusCls}`}>{status === 'pending' ? 'قيد التحقق' : status}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono truncate">{p.national_id || '—'}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedParticipant ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold">
                اختر طرفاً لبدء التحقق.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.map((item) => {
                    const isDone =
                      item.key === 'docUpload'
                        ? steps.docUpload
                        : item.key === 'livePhoto'
                          ? steps.livePhoto
                          : item.key === 'voiceMatch'
                            ? steps.voiceMatch
                            : item.key === 'faceMatch'
                              ? steps.faceMatch
                              : steps.idCard;

                    const toggleKeyMap: Record<string, any> = {
                      idCardVerified: 'idCard',
                      faceMatchVerified: 'faceMatch',
                      voiceMatchVerified: 'voiceMatch',
                    };

                    const toggleable = item.key === 'idCard' || item.key === 'faceMatch' || item.key === 'voiceMatch';

                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={async () => {
                          if (!toggleable) return;
                          const patch: any = { sessionToken: props.sessionToken, sessionId: props.session.id, participantId: selectedParticipant.id };
                          if (item.key === 'idCard') patch.idCardVerified = !steps.idCard;
                          if (item.key === 'faceMatch') patch.faceMatchVerified = !steps.faceMatch;
                          if (item.key === 'voiceMatch') patch.voiceMatchVerified = !steps.voiceMatch;
                          await upsert.mutateAsync(patch);
                          props.onChanged?.();
                        }}
                        className={`p-5 rounded-2xl border-2 flex items-center gap-4 cursor-pointer transition-all text-right ${
                          isDone ? 'border-[#1E5F2C] bg-green-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="text-3xl">{item.icon}</div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-700">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-1">{isDone ? 'تم' : toggleable ? 'اضغط للتبديل' : 'يتم عبر الرفع'}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-[#1E5F2C] border-[#1E5F2C] text-white' : 'border-slate-200'}`}>
                          {isDone ? '✓' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h4 className="font-black text-slate-700 mb-3">وثيقة الهوية</h4>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    {existingCheck?.doc_upload_url ? (
                      <div className="mt-3 text-xs text-slate-600">
                        تم رفع ملف سابقاً.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!docFile || upsert.isPending}
                      onClick={async () => {
                        if (!docFile || !selectedParticipant) return;
                        const file = await fileToUpload(docFile);
                        await upsert.mutateAsync({
                          sessionToken: props.sessionToken,
                          sessionId: props.session.id,
                          participantId: selectedParticipant.id,
                          docUpload: file as any,
                          notes: notes || undefined,
                        });
                        setDocFile(null);
                        props.onChanged?.();
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50"
                    >
                      رفع الوثيقة
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h4 className="font-black text-slate-700 mb-3">صورة حية</h4>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLivePhotoFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    {existingCheck?.live_photo_url ? <div className="mt-3 text-xs text-slate-600">تم رفع صورة حية سابقاً.</div> : null}
                    <button
                      type="button"
                      disabled={!livePhotoFile || upsert.isPending}
                      onClick={async () => {
                        if (!livePhotoFile || !selectedParticipant) return;
                        const file = await fileToUpload(livePhotoFile);
                        await upsert.mutateAsync({
                          sessionToken: props.sessionToken,
                          sessionId: props.session.id,
                          participantId: selectedParticipant.id,
                          livePhoto: file as any,
                          notes: notes || undefined,
                        });
                        setLivePhotoFile(null);
                        props.onChanged?.();
                      }}
                      className="mt-3 w-full py-2 rounded-xl bg-[#1A5276] text-white font-bold disabled:opacity-50"
                    >
                      رفع الصورة
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <label className="block text-xs font-black text-slate-600 mb-2">ملاحظات</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[90px] px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-[#1E5F2C]"
                    placeholder="مثال: نوع الوثيقة، ملاحظات حول المطابقة..."
                  />
                </div>

                <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
                  <div className="text-xs text-slate-500 font-bold">
                    حالة التحقق: {existingCheck?.result_status ? <span className="font-mono">{existingCheck.result_status}</span> : 'pending'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!existingCheck || verify.isPending}
                      onClick={async () => {
                        if (!selectedParticipant) return;
                        await verify.mutateAsync({
                          sessionToken: props.sessionToken,
                          sessionId: props.session.id,
                          participantId: selectedParticipant.id,
                          resultStatus: 'failed',
                          notes: notes || undefined,
                        });
                        props.onChanged?.();
                      }}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black disabled:opacity-50"
                    >
                      فشل التحقق
                    </button>
                    <button
                      type="button"
                      disabled={!selectedParticipant || verify.isPending}
                      onClick={async () => {
                        if (!selectedParticipant) return;
                        // ensure a record exists
                        if (!existingCheck) {
                          await upsert.mutateAsync({
                            sessionToken: props.sessionToken,
                            sessionId: props.session.id,
                            participantId: selectedParticipant.id,
                            notes: notes || undefined,
                          });
                        }
                        await verify.mutateAsync({
                          sessionToken: props.sessionToken,
                          sessionId: props.session.id,
                          participantId: selectedParticipant.id,
                          resultStatus: 'passed',
                          notes: notes || undefined,
                        });
                        props.onChanged?.();
                      }}
                      className="px-8 py-3 bg-[#1E5F2C] hover:bg-[#154620] text-white rounded-2xl font-black disabled:opacity-50"
                    >
                      اعتماد التحقق
                    </button>
                    <button
                      type="button"
                      onClick={props.onNext}
                      className="px-8 py-3 bg-[#1A5276] hover:bg-[#154261] text-white rounded-2xl font-black"
                    >
                      بدء الجلسة
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

