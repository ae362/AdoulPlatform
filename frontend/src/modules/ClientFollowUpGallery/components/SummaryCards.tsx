import React from 'react';
import { FinancialStatus, ClientFollowUp } from '../types';
import { AlertCircle, Clock, CheckCircle2, FileSearch } from 'lucide-react';

interface SummaryCardsProps {
  clients: ClientFollowUp[];
  activeFilter: FinancialStatus | 'all';
  onSelectFilter: (status: FinancialStatus | 'all') => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  clients,
  activeFilter,
  onSelectFilter,
}) => {
  const dueClients = clients.filter((c) => c.financials.status === 'due');
  const dueTotal = dueClients.reduce((acc, c) => acc + c.financials.totalRemaining, 0);

  const partialClients = clients.filter((c) => c.financials.status === 'partial');
  const partialTotal = partialClients.reduce((acc, c) => acc + c.financials.totalRemaining, 0);

  const settledClients = clients.filter((c) => c.financials.status === 'settled');

  const followupClients = clients.filter((c) => c.financials.status === 'followup');

  const cards = [
    {
      id: 'due' as FinancialStatus,
      title: 'المبالغ المستحقة',
      count: dueClients.length,
      countLabel: `${dueClients.length} ملفات`,
      subText: `${dueTotal.toLocaleString('ar-MA')} درهم مستحق`,
      icon: AlertCircle,
      accentBorder: 'border-rose-400',
      activeRing: 'ring-4 ring-rose-300/60 shadow-lg shadow-rose-900/10 scale-[1.02]',
      bgGradient: 'from-rose-50/90 to-white hover:border-rose-300',
      tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-600 text-white',
      badge: '🔴',
    },
    {
      id: 'partial' as FinancialStatus,
      title: 'أداءات جزئية',
      count: partialClients.length,
      countLabel: `${partialClients.length} ملفات`,
      subText: `متبقي: ${partialTotal.toLocaleString('ar-MA')} درهم`,
      icon: Clock,
      accentBorder: 'border-amber-400',
      activeRing: 'ring-4 ring-amber-300/60 shadow-lg shadow-amber-900/10 scale-[1.02]',
      bgGradient: 'from-amber-50/90 to-white hover:border-amber-300',
      tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-500 text-white',
      badge: '🟠',
    },
    {
      id: 'settled' as FinancialStatus,
      title: 'مسواة بالكامل',
      count: settledClients.length,
      countLabel: `${settledClients.length} ملفاً`,
      subText: 'خالصو الذمة بالكامل',
      icon: CheckCircle2,
      accentBorder: 'border-emerald-400',
      activeRing: 'ring-4 ring-emerald-300/60 shadow-lg shadow-emerald-900/10 scale-[1.02]',
      bgGradient: 'from-emerald-50/90 to-white hover:border-emerald-300',
      tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      badge: '🟢',
    },
    {
      id: 'followup' as FinancialStatus,
      title: 'رسوم قيد المتابعة',
      count: followupClients.length,
      countLabel: `${followupClients.length} رسماً`,
      subText: 'متابعة مساطر وإجراءات',
      icon: FileSearch,
      accentBorder: 'border-sky-400',
      activeRing: 'ring-4 ring-sky-300/60 shadow-lg shadow-sky-900/10 scale-[1.02]',
      bgGradient: 'from-sky-50/90 to-white hover:border-sky-300',
      tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
      iconBg: 'bg-sky-600 text-white',
      badge: '🔵',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const isSelected = activeFilter === c.id;
        const IconComponent = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(isSelected ? 'all' : c.id)}
            className={`relative text-right transition-all duration-200 rounded-3xl p-5 border bg-gradient-to-br shadow-sm cursor-pointer select-none ${
              c.bgGradient
            } ${isSelected ? `${c.accentBorder} ${c.activeRing}` : 'border-slate-200'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-2xl leading-none select-none">{c.badge}</span>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${c.iconBg}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">{c.title}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {c.count}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {c.countLabel}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 pt-1 border-t border-slate-200/60">
                {c.subText}
              </p>
            </div>

            {isSelected && (
              <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-900 text-white shadow-xs">
                تصفية مفعلة ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
