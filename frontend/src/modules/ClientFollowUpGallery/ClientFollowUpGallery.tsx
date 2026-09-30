import React, { useState, useEffect, useMemo } from 'react';
import {
  ClientFollowUp,
  FinancialStatus,
  InvoiceMode,
} from './types';
import { SummaryCards } from './components/SummaryCards';
import { ClientsTable } from './components/ClientsTable';
import { ClientDetailDrawer } from './components/ClientDetailDrawer';
import { NewClientModal } from './components/NewClientModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import {
  Search,
  UserPlus,
  Trash2,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'adoul_client_follow_up_gallery_production';

export const ClientFollowUpGallery: React.FC = () => {
  // Persistence state - pure production data only, zero mock records
  const [clients, setClients] = useState<ClientFollowUp[]>(() => {
    try {
      // Purge any legacy mock cache keys
      localStorage.removeItem('adoul_client_follow_up_gallery_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Exclude any legacy mock items starting with cli-00
          return parsed.filter((c: any) => !c.id?.startsWith('cli-00'));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch {
      // ignore
    }
  }, [clients]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FinancialStatus | 'all'>('all');

  // Active Selected Client
  const [selectedClient, setSelectedClient] = useState<ClientFollowUp | null>(null);

  // Modals state
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<{
    open: boolean;
    client?: ClientFollowUp;
    mode: InvoiceMode;
    itemKey?: string;
  }>({
    open: false,
    mode: 'comprehensive',
  });

  // Filtered Clients computation
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Status filter
      if (activeFilter !== 'all' && c.financials.status !== activeFilter) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const matchName = c.fullName.toLowerCase().includes(q);
      const matchCin = c.cin.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchLedger = c.currentDeed.ledgerNumber.includes(q);
      const matchDeedNum = c.currentDeed.deedNumber.includes(q);
      const matchDeedType = c.currentDeed.deedType.toLowerCase().includes(q);

      return (
        matchName ||
        matchCin ||
        matchPhone ||
        matchLedger ||
        matchDeedNum ||
        matchDeedType
      );
    });
  }, [clients, activeFilter, searchQuery]);

  // Handlers
  const handleUpdateClient = (updated: ClientFollowUp) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
    if (selectedClient && selectedClient.id === updated.id) {
      setSelectedClient(updated);
    }
  };

  const handleAddNewClient = (newClient: ClientFollowUp) => {
    setClients((prev) => [newClient, ...prev]);
    setSelectedClient(newClient);
  };

  const handleClearAll = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة طالبي الإشهاد المحفوظين؟')) {
      setClients([]);
      setSelectedClient(null);
      setActiveFilter('all');
      setSearchQuery('');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const handleOpenInvoiceModal = (
    mode: InvoiceMode,
    clientTarget?: ClientFollowUp,
    itemKey?: string,
  ) => {
    const target = clientTarget || selectedClient;
    if (!target) return;
    setInvoiceModal({
      open: true,
      client: target,
      mode,
      itemKey,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-right font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* 1. ترويسة الرواق وشريط البحث والإجراء الرئيسي */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/10 text-blue-950 text-xs font-black mb-2">
                <span>🏛️ منظومة التوثيق العدلي المتكاملة</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>
                <span>الزبون • الرسوم • الذمة المالية • الوثائق • التواصل • الأرشيف</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-amiri tracking-tight">
                رواق طالبي الإشهاد والمتابعة
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                لوحة قيادة مركزية تجمع كل ما يتعلق بطالب الإشهاد، تتيح التعرف الفوري خلال ثانيتين على الذمة المالية، والمسودات، وسجل الأداءات والفواتير الرسمية.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-500 transition cursor-pointer"
                  title="مسح كافة السجلات"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsNewClientOpen(true)}
                className="px-5 py-3 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-950/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>＋ طالب إشهاد جديد</span>
              </button>
            </div>
          </div>

          {/* شريط البحث الكبير */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-blue-900" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔎 ابحث بالاسم، رقم البطاقة، الهاتف، رقم سجل البيانات أو عدد الشهادة..."
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-sm font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-900 focus:ring-4 focus:ring-blue-900/10 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 left-0 pl-4 flex items-center text-xs text-slate-400 hover:text-slate-700"
              >
                مسح البحث ✕
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* إذا كان هناك زبون محدد للعرض التفصيلي */}
        {/* ========================================================================= */}
        {selectedClient ? (
          <ClientDetailDrawer
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdateClient={handleUpdateClient}
            onOpenInvoiceModal={(mode, itemKey) =>
              handleOpenInvoiceModal(mode, selectedClient, itemKey)
            }
          />
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 2. بطاقات الملخص الأربع (KPI Summary Cards) */}
            {/* ========================================================================= */}
            <SummaryCards
              clients={clients}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
            />

            {/* Filter status bar if filter is applied */}
            {activeFilter !== 'all' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-950 font-bold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-900" />
                  <span>
                    تم تفعيل التصفية التلقائية للجدول حسب:{' '}
                    <strong>
                      {activeFilter === 'due' && 'المبالغ المستحقة'}
                      {activeFilter === 'partial' && 'أداءات جزئية'}
                      {activeFilter === 'settled' && 'مسواة بالكامل'}
                      {activeFilter === 'followup' && 'رسوم قيد المتابعة'}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="text-blue-900 hover:underline cursor-pointer"
                >
                  إلغاء التصفية وإظهار الكل ✕
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. جدول المتابعة الرئيسي (Main Follow-up Table) */}
            {/* ========================================================================= */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-black text-slate-800 font-amiri">
                  قائمة طالبي الإشهاد الجارية (إجمالي الملفات: {filteredClients.length})
                </h2>
                <span className="text-xs text-slate-400">
                  انقر على أي صف لفتح البطاقة التفصيلية الكاملة
                </span>
              </div>

              <ClientsTable
                clients={filteredClients}
                onSelectClient={(c) => setSelectedClient(c)}
                selectedClientId={selectedClient?.id}
              />
            </div>
          </>
        )}

        {/* Modal: New Client */}
        {isNewClientOpen && (
          <NewClientModal
            onClose={() => setIsNewClientOpen(false)}
            onAddClient={handleAddNewClient}
          />
        )}

        {/* Modal: Printable Invoice */}
        {invoiceModal.open && invoiceModal.client && (
          <InvoicePrintModal
            client={invoiceModal.client}
            mode={invoiceModal.mode}
            targetItemKey={invoiceModal.itemKey}
            onClose={() => setInvoiceModal({ open: false, mode: 'comprehensive' })}
          />
        )}
      </div>
    </div>
  );
};

export default ClientFollowUpGallery;
