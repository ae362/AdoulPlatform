import React from 'react';
import { ClientFollowUp } from '../types';
import { ChevronLeft, Phone, Mail, FileText } from 'lucide-react';

interface ClientsTableProps {
  clients: ClientFollowUp[];
  onSelectClient: (client: ClientFollowUp) => void;
  selectedClientId?: string;
}

export const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onSelectClient,
  selectedClientId,
}) => {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center text-3xl shadow-xs">
          🏛️
        </div>
        <h4 className="text-base font-black text-slate-800 mb-1 font-amiri">
          لا يوجد طالبي إشهاد مسجلين حالياً في الرواق
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          سجل الرواق فارغ تماماً وخالٍ من أي بيانات وهمية. يمكنك النقر على زر <strong className="text-blue-900 font-bold">«＋ طالب إشهاد جديد»</strong> في الأعلى للبدء فوراً في تسجيل أول ملف توثيقي حقيقي ومتابعته.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (client: ClientFollowUp) => {
    const { status, totalRemaining } = client.financials;

    if (status === 'due') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          <span>🔴 {totalRemaining.toLocaleString('ar-MA')} درهم</span>
        </div>
      );
    }

    if (status === 'partial') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>🟠 {totalRemaining.toLocaleString('ar-MA')} درهم</span>
        </div>
      );
    }

    if (status === 'settled') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>🟢 مسوى بالكامل</span>
        </div>
      );
    }

    // followup
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
        <span>🔵 متابعة إدارية</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-black select-none">
              <th className="py-4 px-5">طالب الإشهاد</th>
              <th className="py-4 px-4">الهاتف</th>
              <th className="py-4 px-4">نوع الرسم</th>
              <th className="py-4 px-4">مرجع الرسم</th>
              <th className="py-4 px-4 hidden md:table-cell">البريد الإلكتروني</th>
              <th className="py-4 px-4 text-center">الوضعية المالية والمتابعة</th>
              <th className="py-4 px-3 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => {
              const isSelected = selectedClientId === client.id;
              const hasAlerts = client.alerts && client.alerts.length > 0;

              return (
                <tr
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className={`group transition duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-r-4 border-r-blue-900 font-medium'
                      : 'hover:bg-slate-50/90'
                  }`}
                >
                  {/* طالب الإشهاد */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-2xs ${
                          client.avatarColor || 'bg-slate-700'
                        }`}
                      >
                        {client.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 group-hover:text-blue-950 font-amiri text-base">
                            {client.fullName}
                          </span>
                          {hasAlerts && (
                            <span
                              title={`يوجد ${client.alerts.length} تنبيه نشط`}
                              className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 animate-bounce"
                            >
                              !
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {client.cin}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* الهاتف */}
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dir-ltr text-right">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      <span>{client.phone}</span>
                    </span>
                  </td>

                  {/* نوع الرسم */}
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-800 text-xs">
                      <FileText className="w-3.5 h-3.5 text-blue-800" />
                      <span>{client.currentDeed.deedType}</span>
                    </span>
                  </td>

                  {/* مرجع الرسم */}
                  <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-600">
                    <span>
                      سجل {client.currentDeed.ledgerNumber} / عدد {client.currentDeed.deedNumber}
                    </span>
                  </td>

                  {/* البريد الإلكتروني */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 font-mono hidden md:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{client.email || '—'}</span>
                    </span>
                  </td>

                  {/* الوضعية */}
                  <td className="py-3.5 px-4 text-center">
                    {renderStatusBadge(client)}
                  </td>

                  {/* زر الفتح */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClient(client);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-600 transition shadow-2xs group-hover:bg-blue-900 group-hover:text-white"
                      title="فتح البطاقة التفصيلية"
                    >
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
