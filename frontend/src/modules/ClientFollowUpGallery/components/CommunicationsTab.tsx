import React, { useState } from 'react';
import { ClientFollowUp, TimelineEvent } from '../types';
import {
  PlusCircle,
  Clock,
} from 'lucide-react';

interface CommunicationsTabProps {
  client: ClientFollowUp;
  onAddCommunication: (newEvent: TimelineEvent) => void;
}

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
  client,
  onAddCommunication,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email' | 'client_feedback'>('whatsapp');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const getEventBadge = (evt: TimelineEvent) => {
    switch (evt.iconType) {
      case 'money':
        return { icon: '💰', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'bell':
        return { icon: '🔔', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'update':
        return { icon: '✏️', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'note':
        return { icon: '💬', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'check':
        return { icon: '⚖️', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      default:
        return { icon: '📱', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newEvt: TimelineEvent = {
      id: `comm-${Date.now()}`,
      timestamp: `${formattedDate} – ${formattedTime}`,
      date: now.toISOString().split('T')[0],
      time: formattedTime,
      channel,
      iconType: channel === 'whatsapp' ? 'send' : channel === 'client_feedback' ? 'note' : 'send',
      title,
      description,
      author: channel === 'client_feedback' ? 'طالب الإشهاد' : 'مكتب التوثيق',
    };

    onAddCommunication(newEvt);
    setShowAddModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 font-amiri">
              سجل التواصل والمتابعة الزمني (Timeline)
            </h3>
            <p className="text-xs text-slate-500">
              تتبع زمني متسلسل لجميع الرسائل، الملاحظات، الدفعات، والتذكيرات المتبادلة
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>＋ إضافة قيد تواصل</span>
          </button>
        </div>

        {/* Timeline Items */}
        <div className="relative border-r-2 border-slate-200 mr-4 space-y-6 pr-6">
          {client.communications.map((evt) => {
            const badge = getEventBadge(evt);

            return (
              <div key={evt.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -right-[35px] top-1 w-8 h-8 rounded-full border flex items-center justify-center text-sm shadow-xs ${badge.bg}`}
                >
                  {badge.icon}
                </div>

                <div className="bg-slate-50/80 hover:bg-slate-100/80 transition p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 font-amiri">
                        {evt.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {evt.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dir-ltr">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {evt.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Communication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-slate-900 font-amiri mb-1">
              إضافة قيد تواصل جديد
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              تسجيل مكالمة، رسالة واتساب، ملاحظة، أو تنبيه بالملف
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  قناة التواصل
                </label>
                <select
                  value={channel}
                  onChange={(e: any) => setChannel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold outline-none focus:border-blue-900"
                >
                  <option value="whatsapp">📱 WhatsApp</option>
                  <option value="sms">💬 رسالة قصيرة SMS</option>
                  <option value="email">📧 بريد إلكتروني</option>
                  <option value="client_feedback">🗣️ ملاحظة مباشرة من الزبون</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان القيد
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إشعار بحضور الشهود..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص البيان أو الملاحظة
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب تفاصيل التواصل..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
