import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { trpc } from '../../trpc';

type Participant = any;

type PartyRow = {
  id?: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  capacity: string;
  isAdult: boolean;
  isRequired: boolean;
  absenceReason: string;
  attendanceMode: 'remote' | 'in_person';
};

function mapParticipantToRow(p: Participant): PartyRow {
  return {
    id: p.id,
    fullName: p.full_name || '',
    nationalId: p.national_id || '',
    phone: p.phone || '',
    email: p.email || '',
    capacity: p.capacity || 'طرف أصيل',
    isAdult: p.is_adult ?? true,
    isRequired: p.is_required ?? true,
    absenceReason: p.absence_reason || '',
    attendanceMode: (p.attendance_mode as any) === 'in_person' ? 'in_person' : 'remote',
  };
}

export default function PartyDataEntry(props: {
  sessionToken: string;
  session: any | null;
  participants: Participant[];
  isLoading: boolean;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const upsert = trpc.remoteNotarialHearing.upsertParticipants.useMutation();

  const existingParties = useMemo(
    () => props.participants.filter((p) => String(p.participant_role) === 'party'),
    [props.participants],
  );

  const [rows, setRows] = useState<PartyRow[]>([
    { fullName: '', nationalId: '', phone: '', email: '', capacity: 'طرف أصيل', isAdult: true, isRequired: true, absenceReason: '', attendanceMode: 'remote' },
  ]);

  useEffect(() => {
    if (!props.session) return;
    if (existingParties.length) setRows(existingParties.map(mapParticipantToRow));
  }, [props.session?.id, existingParties.length]);

  const addParty = () => {
    setRows((p) => [
      ...p,
      { fullName: '', nationalId: '', phone: '', email: '', capacity: 'طرف أصيل', isAdult: true, isRequired: true, absenceReason: '', attendanceMode: 'remote' },
    ]);
  };

  const removeParty = (index: number) => {
    setRows((p) => p.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>📝</span>
          إدخال بيانات الأطراف والعدول
        </h2>

        {!props.session ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold">
            اختر جلسة من "إدارة الجلسات" أولاً.
          </div>
        ) : props.isLoading ? (
          <div className="p-6 text-slate-500">جاري تحميل بيانات الجلسة...</div>
        ) : (
        <form
          className="space-y-8"
          onSubmit={async (e) => {
            e.preventDefault();
            const cleaned = rows.map((r) => ({
              id: r.id,
              participantRole: 'party',
              attendanceMode: r.attendanceMode,
              fullName: r.fullName.trim(),
              nationalId: r.nationalId.trim() || null,
              phone: r.phone.trim() || null,
              email: r.email.trim() || null,
              capacity: r.capacity || null,
              isAdult: r.isAdult,
              isRequired: r.isRequired,
              absenceReason: r.isRequired ? null : (r.absenceReason.trim() || null),
            }));

            const invalid = cleaned.find((r) => !r.fullName);
            if (invalid) {
              alert('يرجى إدخال الاسم الكامل لكل طرف.');
              return;
            }

            const missingReason = cleaned.find((r) => r.isAdult && r.isRequired === false && !r.absenceReason);
            if (missingReason) {
              alert('تنبيه: إذا كان طرف بالغ غير متوفر، يجب تسجيل سبب قانوني مقبول.');
              return;
            }

            await upsert.mutateAsync({
              sessionToken: props.sessionToken,
              sessionId: props.session.id,
              participants: cleaned as any,
            });

            props.onSaved();
          }}
        >
          {/* Notaries Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#1E5F2C] border-r-4 border-[#1E5F2C] pr-3">بيانات العدل الأول (الحاضر فعلياً)</h3>
              <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الكامل</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E5F2C] outline-none bg-white" value={user?.full_name || ''} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">رقم البطاقة الوطنية</label>
                    <input disabled type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E5F2C] outline-none bg-slate-100 text-slate-400" placeholder="يتم جلبه من الملف الشخصي لاحقاً" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">المكتب العدلي</label>
                    <input disabled type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1E5F2C] outline-none bg-slate-100 text-slate-400" placeholder="يتم جلبه من الملف الشخصي لاحقاً" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#1A5276] border-r-4 border-[#1A5276] pr-3">بيانات العدل الثاني (عن بعد - إن وجد)</h3>
              <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم العدل الثاني</label>
                  <input disabled type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1A5276] outline-none bg-slate-100 text-slate-400" placeholder="يرتبط بحساب العدل الثاني في نسخة لاحقة" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">معرف الاتصال الرقمي</label>
                  <input disabled type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1A5276] outline-none bg-slate-100 text-slate-400" placeholder="ID الاتصال (WebRTC) - لاحقاً" />
                </div>
              </div>
            </div>
          </div>

          {/* Parties Section */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700">بيانات الأطراف المتعاقدة</h3>
              <button 
                type="button"
                onClick={addParty}
                className="text-sm font-bold text-[#1E5F2C] hover:underline"
              >
                + إضافة طرف آخر
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((party, index) => (
                <div key={party.id || index} className="relative bg-white p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-4 shadow-sm group">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الاسم الكامل</label>
                    <input
                      value={party.fullName}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, fullName: e.target.value } : x)))}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="الاسم"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم البطاقة</label>
                    <input
                      value={party.nationalId}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, nationalId: e.target.value } : x)))}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="CIN"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">رقم الهاتف</label>
                    <input
                      value={party.phone}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, phone: e.target.value } : x)))}
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="الهاتف"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
                    <input
                      value={party.email}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, email: e.target.value } : x)))}
                      type="email"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">صفة الحضور</label>
                    <select
                      value={party.capacity}
                      onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, capacity: e.target.value } : x)))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option>طرف أصيل</option>
                      <option>وكيل</option>
                      <option>ولي/وصي</option>
                      <option>شاهد</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">حضور</label>
                    <select
                      value={party.attendanceMode}
                      onChange={(e) =>
                        setRows((p) =>
                          p.map((x, i) => (i === index ? { ...x, attendanceMode: e.target.value as any } : x)),
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="remote">عن بعد</option>
                      <option value="in_person">حضوري</option>
                    </select>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <input
                        type="checkbox"
                        checked={!party.isRequired}
                        onChange={(e) =>
                          setRows((p) =>
                            p.map((x, i) => (i === index ? { ...x, isRequired: !e.target.checked } : x)),
                          )
                        }
                      />
                      غير متوفر
                    </label>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeParty(index)}
                      className="absolute -left-3 -top-3 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      title="حذف الطرف"
                    >
                      ×
                    </button>
                  )}

                  {!party.isRequired && party.isAdult ? (
                    <div className="md:col-span-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <label className="block text-[10px] font-black text-amber-800 mb-2">سبب قانوني لغياب طرف بالغ</label>
                      <input
                        value={party.absenceReason}
                        onChange={(e) => setRows((p) => p.map((x, i) => (i === index ? { ...x, absenceReason: e.target.value } : x)))}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        placeholder="مثال: تعذر الحضور لسبب صحي/سفر/…"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Smart Alert Area */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
             <div className="bg-amber-100 p-2 rounded-lg text-amber-600 font-bold">🔔</div>
             <div>
               <p className="text-sm font-bold text-amber-800">تنبيه ذكي:</p>
               <p className="text-xs text-amber-700 leading-relaxed">إذا كان أحد الأطراف بالغاً وغير متوفر بشكل مباشر، يجب تسجيل السبب القانوني المقبول في "خارطة التحكم" لاحقاً.</p>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t font-bold">
            <button type="button" className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">إلغاء</button>
            <button
              disabled={upsert.isPending}
              type="submit"
              className="px-10 py-3 bg-[#1E5F2C] text-white rounded-xl shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {upsert.isPending ? 'جارٍ الحفظ...' : 'حفظ البيانات والمتابعة'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
