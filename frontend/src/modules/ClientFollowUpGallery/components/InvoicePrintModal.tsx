import React from 'react';
import { ClientFollowUp, InvoiceMode, FinancialItem } from '../types';
import { Printer, Mail, X } from 'lucide-react';

export interface InvoicePrintModalProps {
  client: ClientFollowUp;
  mode: InvoiceMode;
  targetItemKey?: string;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  client,
  mode,
  targetItemKey,
  onClose,
}) => {
  const { financials } = client;
  const todayFormatted = new Date().toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const targetItem = targetItemKey
    ? financials.items.find((it) => it.key === targetItemKey)
    : undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = `السلام عليكم ورحمة الله،\nطالب الإشهاد المحترم: ${client.fullName}\nمرفق بيان كشف الحساب / الفاتورة الرسمية لمكتب التوثيق العدلي برسم (${client.currentDeed.deedType}) عدد ${client.currentDeed.deedNumber}، المتبقي بالذمة: ${financials.totalRemaining} درهم.`;
    const url = `https://wa.me/212${client.phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(
      `مكتب التوثيق العدلي - فاتورة وبيان حساب رسمي: ${client.currentDeed.deedType}`,
    );
    const body = encodeURIComponent(
      `طالب الإشهاد المحترم: ${client.fullName}\nتجدون رفقته بيان الفاتورة الرسمية الصادرة عن مكتب التوثيق العدلي بخصوص الرسم عدد ${client.currentDeed.deedNumber}.\nالمجموع المستحق: ${financials.totalAmount} درهم\nالمؤدى: ${financials.totalPaid} درهم\nالباقي: ${financials.totalRemaining} درهم.`,
    );
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
        {/* Header Controls */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="text-sm font-black text-slate-800 font-amiri">
                {mode === 'comprehensive' && 'معاينة الفاتورة الكلية الشاملة'}
                {mode === 'itemized' && `فاتورة بند خاص: ${targetItem?.title || 'أتعاب'}`}
                {mode === 'statement' && 'كشف الحساب الإجمالي المالي'}
              </h3>
              <p className="text-[11px] text-slate-500">
                وثيقة رسمية قابلة للطباعة والتصدير الفوري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ طباعة</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <span>📱 WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>📧 بريد</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 font-amiri text-slate-900 print:p-0">
          {/* Official Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex items-center justify-between">
            <div className="text-right">
              <h2 className="text-lg font-black tracking-tight text-slate-900">المملكة المغربية</h2>
              <p className="text-xs font-bold text-slate-600">وزارة العدل</p>
              <p className="text-sm font-black text-blue-950 mt-1">مكتب التوثيق العدلي المعتمد</p>
              <p className="text-xs text-slate-500">دائرة محكمة الاستئناف والمحكمة الابتدائية</p>
            </div>

            <div className="text-center px-4 py-2 border-2 border-slate-900 rounded-2xl">
              <p className="text-xs font-black uppercase text-slate-700">رقم الفاتورة المرجعي</p>
              <p className="text-base font-black font-mono text-slate-900">
                INV-{client.currentDeed.ledgerNumber}-{client.currentDeed.deedNumber}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{todayFormatted}</p>
            </div>
          </div>

          {/* Client & Deed Meta */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <p className="text-slate-500 font-bold">بيانات طالب الإشهاد:</p>
              <p className="text-sm font-black text-slate-900">{client.fullName}</p>
              <p className="font-mono text-slate-600">رقم البطاقة الوطنية: {client.cin}</p>
              <p className="text-slate-600">الهاتف: {client.phone}</p>
              <p className="text-slate-600">العنوان: {client.address}</p>
            </div>

            <div className="space-y-1">
              <p className="text-slate-500 font-bold">بيانات الرسم والتوثيق:</p>
              <p className="text-sm font-black text-blue-950">{client.currentDeed.deedType}</p>
              <p className="font-mono text-slate-700">
                سجل البيانات رقم: {client.currentDeed.ledgerNumber} • عدد: {client.currentDeed.deedNumber}
              </p>
              <p className="text-slate-600">تاريخ التلقي: {client.currentDeed.receiptDate}</p>
              <p className="text-slate-600">
                حالة الرسم: <span className="font-bold">{client.currentDeed.workflowStatus}</span>
              </p>
            </div>
          </div>

          {/* Table Content */}
          <div>
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <th className="py-2.5 px-4 border border-slate-800">البند والبيان القانوني</th>
                  <th className="py-2.5 px-3 border border-slate-800 text-center">المبلغ المستحق</th>
                  <th className="py-2.5 px-3 border border-slate-800 text-center">المبلغ المؤدى</th>
                  <th className="py-2.5 px-3 border border-slate-800 text-center">المتبقي بالذمة</th>
                </tr>
              </thead>
              <tbody>
                {mode === 'itemized' && targetItem ? (
                  <tr>
                    <td className="py-3 px-4 border border-slate-200 font-bold">
                      {targetItem.title}
                    </td>
                    <td className="py-3 px-3 border border-slate-200 text-center font-mono font-bold">
                      {targetItem.total.toLocaleString('ar-MA')} د.م
                    </td>
                    <td className="py-3 px-3 border border-slate-200 text-center font-mono font-bold text-emerald-700">
                      {targetItem.paid.toLocaleString('ar-MA')} د.م
                    </td>
                    <td className="py-3 px-3 border border-slate-200 text-center font-mono font-bold text-rose-700">
                      {targetItem.remaining.toLocaleString('ar-MA')} د.م
                    </td>
                  </tr>
                ) : (
                  financials.items.map((it: FinancialItem) => (
                    <tr key={it.key}>
                      <td className="py-2.5 px-4 border border-slate-200 font-bold">
                        {it.title}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-mono">
                        {it.total.toLocaleString('ar-MA')} د.م
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-emerald-700">
                        {it.paid.toLocaleString('ar-MA')} د.م
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-slate-800">
                        {it.remaining.toLocaleString('ar-MA')} د.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-800">
                  <td className="py-3 px-4 border border-slate-300">
                    {mode === 'itemized' ? 'مجموع البند المحدد' : 'المجموع الإجمالي العام'}
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-center font-mono text-base">
                    {(mode === 'itemized' && targetItem
                      ? targetItem.total
                      : financials.totalAmount
                    ).toLocaleString('ar-MA')}{' '}
                    د.م
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-center font-mono text-base text-emerald-700">
                    {(mode === 'itemized' && targetItem
                      ? targetItem.paid
                      : financials.totalPaid
                    ).toLocaleString('ar-MA')}{' '}
                    د.م
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-center font-mono text-base text-rose-700">
                    {(mode === 'itemized' && targetItem
                      ? targetItem.remaining
                      : financials.totalRemaining
                    ).toLocaleString('ar-MA')}{' '}
                    د.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures & Footnotes */}
          <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="text-center space-y-2">
              <p className="font-bold text-slate-700">طالب الإشهاد أو من ينوب عنه</p>
              <div className="w-36 h-14 border border-dashed border-slate-300 rounded-xl mx-auto flex items-center justify-center text-slate-400">
                التوقيع / المصادقة
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="font-bold text-slate-900">خاتم وتوقيع العدل الممارس</p>
              <div className="w-36 h-14 border-2 border-blue-900/30 rounded-xl mx-auto flex items-center justify-center text-blue-950 font-bold bg-blue-50/30">
                طابع المكتب الرسمي
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintModal;
