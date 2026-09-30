import React, { useState } from 'react';
import { ClientFollowUp } from '../types';
import { UserPlus, X, CheckCircle2 } from 'lucide-react';

export interface NewClientModalProps {
  onClose: () => void;
  onAddClient: (newClient: ClientFollowUp) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  onClose,
  onAddClient,
}) => {
  const [fullName, setFullName] = useState('');
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [deedType, setDeedType] = useState('شراء عقار');
  const [ledgerNumber, setLedgerNumber] = useState('24');
  const [deedNumber, setDeedNumber] = useState(() =>
    Math.floor(100 + Math.random() * 900).toString(),
  );

  // Financials
  const [regAndStamp, setRegAndStamp] = useState(3000);
  const [notaryFee, setNotaryFee] = useState(2500);
  const [adminCost, setAdminCost] = useState(300);
  const [initialPaid, setInitialPaid] = useState(1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !cin.trim() || !phone.trim()) return;

    const totalAmount = regAndStamp + notaryFee + adminCost;
    const totalRemaining = Math.max(0, totalAmount - initialPaid);

    const newClient: ClientFollowUp = {
      id: `cli-${Date.now()}`,
      fullName,
      cin: cin.toUpperCase(),
      phone,
      email: email || `${cin.toLowerCase()}@client.ma`,
      address: address || 'المملكة المغربية',
      avatarColor: 'bg-blue-900',
      clientSinceYear: new Date().getFullYear(),
      currentDeed: {
        deedType,
        ledgerNumber,
        deedNumber,
        receiptDate: new Date().toISOString().split('T')[0],
        workflowStatus: 'مسودة_للمعاينة',
        statusNotes: 'تم فتح الملف والبدء في إعداد مسودة الإشهاد',
      },
      financials: {
        status:
          totalRemaining === 0
            ? 'settled'
            : initialPaid > 0
            ? 'partial'
            : 'due',
        totalAmount,
        totalPaid: initialPaid,
        totalRemaining,
        items: [
          {
            key: 'registration_and_stamp',
            title: 'واجب التسجيل والتمبر',
            total: regAndStamp,
            paid: Math.min(regAndStamp, initialPaid),
            remaining: Math.max(0, regAndStamp - initialPaid),
          },
          {
            key: 'notary_fee',
            title: 'أجرة العدل',
            total: notaryFee,
            paid: Math.max(0, initialPaid - regAndStamp),
            remaining: Math.max(
              0,
              notaryFee - Math.max(0, initialPaid - regAndStamp),
            ),
          },
          {
            key: 'admin_certificates',
            title: 'المصاريف الإدارية والملف',
            total: adminCost,
            paid: 0,
            remaining: adminCost,
          },
        ],
        payments:
          initialPaid > 0
            ? [
                {
                  id: `pay-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  amount: initialPaid,
                  method: 'نقد',
                  notes: 'دفعة أولية عند فتح الملف والتلقي',
                  remainingAfter: totalRemaining,
                },
              ]
            : [],
      },
      communications: [
        {
          id: `comm-${Date.now()}`,
          timestamp: `${new Date().toLocaleDateString('ar-MA')} – ${new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('ar-MA', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          channel: 'system',
          iconType: 'update',
          title: 'تسجيل طالب إشهاد جديد',
          description: `تم إدراج الملف برسم (${deedType}) عدد ${deedNumber} بسجل البيانات ${ledgerNumber}.`,
          author: 'كتابة العدل',
        },
      ],
      deedHistory: [
        {
          id: `h-${Date.now()}`,
          year: new Date().getFullYear(),
          deedType,
          reference: `سجل ${ledgerNumber} / عدد ${deedNumber}`,
          fees: notaryFee,
          status: totalRemaining === 0 ? 'settled' : 'remaining',
          remainingAmount: totalRemaining,
          notes: 'الملف المفتوح حالياً',
        },
      ],
      alerts:
        totalRemaining > 0
          ? [
              {
                id: `alt-${Date.now()}`,
                type: 'financial',
                title: 'مستحق بالذمة',
                description: `متبقي بالذمة ${totalRemaining.toLocaleString('ar-MA')} درهم`,
                date: new Date().toISOString().split('T')[0],
              },
            ]
          : [],
    };

    onAddClient(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-amiri">
                تسجيل طالب إشهاد وملف توثيقي جديد
              </h3>
              <p className="text-xs text-slate-500">
                إدراج زبون جديد مع فتح بطاقة المتابعة والذمة المالية التوثيقية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* قسم البيانات الشخصية */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 font-amiri">
              ① بيانات الهوية والتواصل
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد بن عبد الله..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم البطاقة الوطنية (CIN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: AB123456"
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0661234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-900 bg-white dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  placeholder="client@mail.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-900 bg-white dir-ltr text-right"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  عنوان السكن / الإقامة
                </label>
                <input
                  type="text"
                  placeholder="المدينة، الحي، رقم المنزل..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-blue-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* قسم الرسم الحالي */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 font-amiri">
              ② بيانات الرسم والتوثيق
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  نوع الرسم
                </label>
                <select
                  value={deedType}
                  onChange={(e) => setDeedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-none focus:border-blue-900 bg-white"
                >
                  <option value="شراء عقار">شراء عقار</option>
                  <option value="رسم هبة">رسم هبة</option>
                  <option value="اعتصار هبة">اعتصار هبة</option>
                  <option value="صدقة عقارية">صدقة عقارية</option>
                  <option value="إحصاء تركة ومتروك">إحصاء تركة ومتروك</option>
                  <option value="موجب إثبات غيبة">موجب إثبات غيبة</option>
                  <option value="موجب خلل عقلي">موجب خلل عقلي</option>
                  <option value="موجب تقديم وصلاحية">موجب تقديم وصلاحية</option>
                  <option value="وكالة مفوضة">وكالة مفوضة</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم سجل البيانات
                </label>
                <input
                  type="text"
                  value={ledgerNumber}
                  onChange={(e) => setLedgerNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  عدد الشهادة / التضمين
                </label>
                <input
                  type="text"
                  value={deedNumber}
                  onChange={(e) => setDeedNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-blue-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* قسم التقدير المالي والأداء */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 font-amiri">
              ③ التقدير المالي والأداء الأولي (درهم)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  واجب التسجيل والتمبر
                </label>
                <input
                  type="number"
                  min="0"
                  value={regAndStamp}
                  onChange={(e) => setRegAndStamp(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  أجرة العدل
                </label>
                <input
                  type="number"
                  min="0"
                  value={notaryFee}
                  onChange={(e) => setNotaryFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  المصاريف الإدارية
                </label>
                <input
                  type="number"
                  min="0"
                  value={adminCost}
                  onChange={(e) => setAdminCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none focus:border-blue-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                  المبلغ المؤدى فوراً
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialPaid}
                  onChange={(e) => setInitialPaid(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-mono font-black outline-none focus:border-emerald-600 bg-emerald-50/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200">
              <span>
                المجموع:{' '}
                <strong className="font-mono text-slate-900">
                  {(regAndStamp + notaryFee + adminCost).toLocaleString('ar-MA')} د.م
                </strong>
              </span>
              <span>
                المتبقي بالذمة:{' '}
                <strong className="font-mono text-rose-600 font-black">
                  {Math.max(
                    0,
                    regAndStamp + notaryFee + adminCost - initialPaid,
                  ).toLocaleString('ar-MA')}{' '}
                  د.م
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black shadow-md shadow-blue-900/10 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إدراج طالب الإشهاد وحفظ الملف</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClientModal;
