import React, { useState } from 'react';
import {
  ClientFollowUp,
  FinancialItem,
  PaymentMethod,
  InvoiceMode,
} from '../types';
import {
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  Calendar,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

interface FinancialTabProps {
  client: ClientFollowUp;
  onAddPayment: (
    amount: number,
    date: string,
    method: PaymentMethod,
    notes?: string,
  ) => void;
  onOpenInvoiceModal: (mode: InvoiceMode, itemKey?: string) => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  client,
  onAddPayment,
  onOpenInvoiceModal,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(client.financials.totalRemaining || 1000);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('نقد');
  const [payNotes, setPayNotes] = useState<string>('');

  const { items, totalAmount, totalPaid, totalRemaining, payments } = client.financials;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    onAddPayment(payAmount, payDate, payMethod, payNotes);
    setShowPaymentModal(false);
    setPayNotes('');
  };

  return (
    <div className="space-y-6">
      {/* 1. جدول المستحقات المالية والذمة */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-black text-slate-800 font-amiri">
              تفصيل المستحقات التوثيقية والرسوم
            </h3>
            <p className="text-xs text-slate-500">
              بيان شامل لجميع بنود العقد والمصاريف الملحقة (تطبيق حاسم لدمج التسجيل والتمبر في بند موحد)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md shadow-emerald-900/10 flex items-center gap-2 cursor-pointer transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>＋ تسجيل دفعة جديدة</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 text-xs font-black">
                <th className="py-3 px-5">البيان</th>
                <th className="py-3 px-4">المبلغ المستحق</th>
                <th className="py-3 px-4">المؤدى</th>
                <th className="py-3 px-4">الباقي بذمته</th>
                <th className="py-3 px-4 text-center">فاتورة البند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it: FinancialItem) => (
                <tr key={it.key} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>{it.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {it.total.toLocaleString('ar-MA')} د.م
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                    {it.paid.toLocaleString('ar-MA')} د.م
                  </td>
                  <td className="py-3.5 px-4 font-mono font-black">
                    {it.remaining > 0 ? (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        {it.remaining.toLocaleString('ar-MA')} د.م
                      </span>
                    ) : (
                      <span className="text-slate-400">0 د.م</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenInvoiceModal('itemized', it.key)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-100 hover:text-blue-900 text-slate-600 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      title="استخراج فاتورة خاصة بهذا البند فقط"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>فاتورة البند</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-300">
                <td className="py-4 px-5 font-black text-sm">المجموع الإجمالي</td>
                <td className="py-4 px-4 font-mono font-black text-base text-amber-300">
                  {totalAmount.toLocaleString('ar-MA')} د.م
                </td>
                <td className="py-4 px-4 font-mono font-black text-base text-emerald-300">
                  {totalPaid.toLocaleString('ar-MA')} د.م
                </td>
                <td className="py-4 px-4 font-mono font-black text-base text-rose-300">
                  {totalRemaining.toLocaleString('ar-MA')} د.م
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-xs text-slate-300 font-mono">
                    {totalRemaining === 0 ? '✓ خالص بالكامل' : '⏳ جاري الاستخلاص'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. نظام الفواتير الذكي */}
      <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white rounded-3xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-black font-amiri text-white">
                نظام الفواتير والبيانات الرسمية للمكتب
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              توليد وطباعة وثائق مالية رسمية مطابقة للمواصفات القانونية للتوثيق العدلي المغربي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenInvoiceModal('comprehensive')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              <span>🧾 فاتورة كلية</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenInvoiceModal('itemized')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer border border-white/20"
            >
              <Receipt className="w-4 h-4" />
              <span>🧾 فاتورة حسب البند</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenInvoiceModal('statement')}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 كشف الحساب الإجمالي</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 border-t border-white/10 pt-4">
          <div className="flex items-start gap-2">
            <span className="text-base">🖨️</span>
            <div>
              <strong className="text-white block font-bold">طباعة فورية مؤمنة</strong>
              تنسيق A4 رسمي جاهز للطباعة المباشرة مع شارة المكتب وبيانات العدل.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">📧</span>
            <div>
              <strong className="text-white block font-bold">إرسال بالبريد الإلكتروني</strong>
              إرسال الفاتورة وكشف الحساب مباشرة لبريد طالب الإشهاد المعتمد.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">📱</span>
            <div>
              <strong className="text-white block font-bold">إرسال WhatsApp بنقرة واحدة</strong>
              مشاركة ملخص الأداءات ورابط الفاتورة بصيغة رسمية وأنيقة.
            </div>
          </div>
        </div>
      </div>

      {/* 3. سجل الدفعات والأداءات التاريخية للرسم */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <h4 className="text-sm font-black text-slate-800 mb-4 font-amiri flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-900" />
          <span>سجل الدفعات المؤداة (الأداءات المحصلة للرسم)</span>
        </h4>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            لم يتم تسجيل أي دفعة بعد لهذا الرسم.
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {p.amount.toLocaleString('ar-MA')} درهم
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px]">
                        طريقة الأداء: {p.method}
                      </span>
                    </div>
                    {p.notes && <p className="text-slate-600 mt-0.5">{p.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500 text-left dir-ltr">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.date}</span>
                  </div>
                  <div className="font-bold text-[11px] text-slate-700">
                    المتبقي بعد الدفعة: {p.remainingAfter.toLocaleString('ar-MA')} د.م
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: تسجيل دفعة جديدة */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-right">
            <h3 className="text-lg font-black text-slate-900 font-amiri mb-2">
              تسجيل دفعة أداء جديدة
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              إدخال مبلغ مؤدى من طرف طالب الإشهاد، وسيتم تحديث الباقي بذمته آلياً فور الحفظ.
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المبلغ المؤدى (بالدرهم)
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalRemaining > 0 ? totalRemaining : 1000000}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold focus:border-blue-900 outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  المتبقي الإجمالي الحالي بالذمة: {totalRemaining.toLocaleString('ar-MA')} درهم
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الأداء
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة الأداء
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['نقد', 'شيك', 'تحويل بنكي'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        payMethod === m
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو رقم الشيك/التحويل (اختياري)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="مثال: شيك رقم 189234 التجاري وفا بنك..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-md shadow-emerald-900/10"
                >
                  حفظ الدفعة وتحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
