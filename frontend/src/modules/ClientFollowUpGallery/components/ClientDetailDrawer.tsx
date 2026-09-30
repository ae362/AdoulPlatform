import React, { useState } from 'react';
import {
  ClientFollowUp,
  ActiveDetailTab,
  InvoiceMode,
  FinancialItem,
  DeedWorkflowStatus,
  TimelineEvent,
  PaymentMethod,
} from '../types';
import { FinancialTab } from './FinancialTab';
import { DocumentsTab } from './DocumentsTab';
import { CommunicationsTab } from './CommunicationsTab';
import { HistoryTab } from './HistoryTab';
import {
  Receipt,
  Printer,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Send,
  ChevronLeft,
} from 'lucide-react';

export interface ClientDetailDrawerProps {
  client: ClientFollowUp;
  onClose: () => void;
  onUpdateClient: (updated: ClientFollowUp) => void;
  onOpenInvoiceModal: (mode: InvoiceMode, itemKey?: string) => void;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  client,
  onClose,
  onUpdateClient,
  onOpenInvoiceModal,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveDetailTab>('financials');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit form state
  const [editedFullName, setEditedFullName] = useState(client.fullName);
  const [editedCin, setEditedCin] = useState(client.cin);
  const [editedPhone, setEditedPhone] = useState(client.phone);
  const [editedEmail, setEditedEmail] = useState(client.email);
  const [editedAddress, setEditedAddress] = useState(client.address);

  const hasDebt = client.financials.totalRemaining > 0;

  // Handle Quick Actions
  const handleQuickWhatsApp = () => {
    let text = `السلام عليكم ورحمة الله،\nطالب الإشهاد المحترم السيد(ة): ${client.fullName}\n`;
    if (hasDebt) {
      text += `يشرف مكتب التوثيق العدلي تذكيركم بخصوص رسمكم (${client.currentDeed.deedType}) عدد ${client.currentDeed.deedNumber} بأن المتبقي بالذمة هو: ${client.financials.totalRemaining} درهم.`;
    } else {
      text += `يشرف مكتب التوثيق العدلي إشعاركم بأن رسمكم (${client.currentDeed.deedType}) مسوى ومكتمل وجاهز للمتابعة.`;
    }
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/212${client.phone.replace(/^0/, '')}?text=${encoded}`, '_blank');
  };

  const handleQuickEmail = () => {
    const subject = encodeURIComponent(
      `مكتب التوثيق العدلي - بيان وضعية المعاملة: ${client.currentDeed.deedType}`,
    );
    const body = encodeURIComponent(
      `السلام عليكم ورحمة الله،\nطالب الإشهاد المحترم: ${client.fullName}\nبيان المعاملة التوثيقية الجارية عدد ${client.currentDeed.deedNumber}:\nالمتبقي بالذمة: ${client.financials.totalRemaining} درهم.\nمع تحيات كتابة العدل.`,
    );
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleQuickSMS = () => {
    const msg = `مكتب التوثيق العدلي: نذكركم برسمكم (${client.currentDeed.deedType}) عدد ${client.currentDeed.deedNumber}. الرصيد المتبقي: ${client.financials.totalRemaining} درهم.`;
    window.open(`sms:${client.phone}?body=${encodeURIComponent(msg)}`, '_blank');
  };

  // Add Payment Handler
  const handleAddPayment = (
    amount: number,
    date: string,
    method: PaymentMethod,
    notes?: string,
  ) => {
    const currentRem = client.financials.totalRemaining;
    const newTotalPaid = client.financials.totalPaid + amount;
    const newTotalRemaining = Math.max(0, currentRem - amount);

    let remainingDeduction = amount;
    const updatedItems = client.financials.items.map((it: FinancialItem) => {
      if (remainingDeduction <= 0) return it;
      const deductFromThis = Math.min(it.remaining, remainingDeduction);
      remainingDeduction -= deductFromThis;
      return {
        ...it,
        paid: it.paid + deductFromThis,
        remaining: it.remaining - deductFromThis,
      };
    });

    const newPay = {
      id: `pay-${Date.now()}`,
      date,
      amount,
      method,
      notes,
      remainingAfter: newTotalRemaining,
    };

    const newPayments = [newPay, ...client.financials.payments];

    // Also auto-append a timeline communication
    const newTimelineEvent: TimelineEvent = {
      id: `comm-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString('ar-MA')} – ${new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' }),
      channel: 'system',
      iconType: 'money',
      title: 'تسجيل دفعة أداء مالية',
      description: `تم استلام دفعة مالية قدرها ${newPay.amount.toLocaleString('ar-MA')} د.م (${newPay.method})، الرصيد المتبقي: ${newTotalRemaining.toLocaleString('ar-MA')} د.م.`,
      author: 'مكتب التوثيق',
    };

    const updatedClient: ClientFollowUp = {
      ...client,
      financials: {
        ...client.financials,
        items: updatedItems,
        totalPaid: newTotalPaid,
        totalRemaining: newTotalRemaining,
        status: newTotalRemaining === 0 ? 'settled' : 'partial',
        payments: newPayments,
      },
      communications: [newTimelineEvent, ...client.communications],
    };

    onUpdateClient(updatedClient);
  };

  // Deed Status Handler
  const handleUpdateDeedStatus = (newStatus: DeedWorkflowStatus, note?: string) => {
    const statusLabels: Record<DeedWorkflowStatus, string> = {
      مسودة_للمعاينة: 'مسودة جاهزة للمعاينة',
      أرسلت_المسودة: 'أُرسلت المسودة للمعاينة',
      تمت_المعاينة: 'تمت معاينة المسودة',
      توجد_ملاحظات: 'توجد ملاحظات من طالب الإشهاد',
      تم_تحديث_المسودة: 'تم تحديث المسودة',
      تم_إنجاز_الرسم: 'تم إنجاز الرسم وتضمينه',
    };

    const newTimelineEvent: TimelineEvent = {
      id: `comm-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString('ar-MA')} – ${new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' }),
      channel: 'system',
      iconType: newStatus === 'تم_إنجاز_الرسم' ? 'check' : newStatus === 'توجد_ملاحظات' ? 'note' : 'update',
      title: statusLabels[newStatus],
      description: note || `تم تحديث مسار الرسم التوثيقي إلى: ${statusLabels[newStatus]}.`,
      author: 'العدل الممارس',
    };

    const updatedClient: ClientFollowUp = {
      ...client,
      currentDeed: {
        ...client.currentDeed,
        workflowStatus: newStatus,
        statusNotes: note || client.currentDeed.statusNotes,
      },
      communications: [newTimelineEvent, ...client.communications],
    };

    onUpdateClient(updatedClient);
  };

  // Send Draft Action
  const handleSendDraft = () => {
    handleUpdateDeedStatus(
      'أرسلت_المسودة',
      'تم إرسال رابط المسودة الرقمية عبر القناة المعتمدة لطالب الإشهاد للمعاينة.',
    );
    handleQuickWhatsApp();
  };

  // Add Communication Note
  const handleAddCommunication = (newEvent: TimelineEvent) => {
    onUpdateClient({
      ...client,
      communications: [newEvent, ...client.communications],
    });
  };

  // Save profile edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateClient({
      ...client,
      fullName: editedFullName,
      cin: editedCin,
      phone: editedPhone,
      email: editedEmail,
      address: editedAddress,
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 4. رأس البطاقة التفصيلية */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Client Identity & Status */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="الرجوع لجدول المتابعة الرئيسي"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>

            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md ${
                client.avatarColor || 'bg-blue-900'
              }`}
            >
              {client.fullName.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-amiri">
                  {client.fullName}
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {client.cin}
                </span>
              </div>

              {/* Status Badge Banner */}
              {hasDebt ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>
                    🔴 توجد مبالغ مستحقة:{' '}
                    <strong className="font-mono font-black underline decoration-rose-300">
                      {client.financials.totalRemaining.toLocaleString('ar-MA')} درهم
                    </strong>
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 الوضعية المالية مسواة بالكامل (خالص الذمة)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenInvoiceModal('comprehensive')}
              className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-900/20"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>🧾 فاتورة</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenInvoiceModal('statement')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>🖨️ طباعة</span>
            </button>

            <button
              type="button"
              onClick={handleQuickEmail}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span>📧 إرسال</span>
            </button>

            <button
              type="button"
              onClick={handleQuickWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-700/20"
            >
              <span>📱 WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleQuickSMS}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-700/20"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>💬 SMS</span>
            </button>
          </div>
        </div>

        {/* التنبيهات الذكية */}
        {client.alerts && client.alerts.length > 0 && (
          <div className="space-y-2">
            {client.alerts.map((alt) => (
              <div
                key={alt.id}
                className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">
                    {alt.type === 'financial' && '🔴'}
                    {alt.type === 'followup' && '🟠'}
                    {alt.type === 'correction' && '🟡'}
                    {alt.type === 'procedure' && '🔵'}
                  </span>
                  <div>
                    <strong className="font-bold text-amber-900 block">{alt.title}:</strong>
                    <span className="text-amber-800">{alt.description}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-amber-600 shrink-0">
                  {alt.date}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* قسمان أساسيان: بيانات طالب الإشهاد + بيانات الرسم الحالي */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* القسم الأول: بيانات طالب الإشهاد */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-amiri">
                <span>القسم الأول: بيانات طالب الإشهاد</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-blue-900 text-xs font-bold border border-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingProfile ? 'إلغاء' : '✏️ تعديل البيانات'}</span>
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">الاسم الكامل:</label>
                  <input
                    type="text"
                    value={editedFullName}
                    onChange={(e) => setEditedFullName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">رقم البطاقة:</label>
                    <input
                      type="text"
                      value={editedCin}
                      onChange={(e) => setEditedCin(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">الهاتف:</label>
                    <input
                      type="text"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono dir-ltr text-right"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono dir-ltr text-right"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">العنوان:</label>
                  <input
                    type="text"
                    value={editedAddress}
                    onChange={(e) => setEditedAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-lg bg-blue-900 text-white font-bold"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">الاسم الكامل:</span>
                  <span className="font-bold text-slate-900">{client.fullName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">رقم البطاقة الوطنية:</span>
                  <span className="font-mono font-bold text-slate-800">{client.cin}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                  <span className="font-mono text-slate-800 dir-ltr">{client.phone}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">البريد الإلكتروني:</span>
                  <span className="font-mono text-slate-800 dir-ltr">{client.email || '—'}</span>
                </div>
                <div className="flex items-start justify-between py-1">
                  <span className="text-slate-500 font-bold">العنوان:</span>
                  <span className="text-slate-800 text-left max-w-xs">{client.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* القسم الثاني: الرسم الحالي المرتبط */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-amiri">
                  <span>القسم الثاني: الرسم الحالي</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-900 text-white">
                  الملف الجاري
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">نوع الرسم:</span>
                  <strong className="font-black text-blue-950 text-sm">
                    {client.currentDeed.deedType}
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">سجل البيانات / عدد الشهادة:</span>
                  <span className="font-mono font-bold text-slate-800">
                    سجل {client.currentDeed.ledgerNumber} / عدد {client.currentDeed.deedNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">تاريخ التلقي:</span>
                  <span className="font-mono text-slate-800">
                    {client.currentDeed.receiptDate}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-bold">حالة المسودة:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[11px]">
                    {client.currentDeed.workflowStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendDraft}
                className="w-full py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-950/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>📤 إرسال المسودة لطالب الإشهاد</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* القسم الثالث: الألسنة الأربعة */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Horizontal Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'financials'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>💰 اللسان 1: المالية</span>
            {hasDebt && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                {client.financials.totalRemaining} د.م
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>📄 اللسان 2: الوثائق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('communications')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'communications'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>📨 اللسان 3: التواصل</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-300 text-slate-800 text-[10px] font-mono">
              {client.communications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>📚 اللسان 4: سجل المعاملات (التاريخ)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-300 text-slate-800 text-[10px] font-mono">
              {client.deedHistory.length}
            </span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div>
          {activeTab === 'financials' && (
            <FinancialTab
              client={client}
              onAddPayment={handleAddPayment}
              onOpenInvoiceModal={onOpenInvoiceModal}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              client={client}
              onUpdateDeedStatus={handleUpdateDeedStatus}
              onSendDraft={handleSendDraft}
            />
          )}

          {activeTab === 'communications' && (
            <CommunicationsTab
              client={client}
              onAddCommunication={handleAddCommunication}
            />
          )}

          {activeTab === 'history' && <HistoryTab client={client} />}
        </div>
      </div>
    </div>
  );
};
