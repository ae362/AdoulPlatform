import React, { useState, useMemo } from 'react';
import {
  Search,
  Scale,
  CheckCircle2,
  X,
  UserCheck,
  Building2,
  FileCheck2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

export interface RegisteredNotaryItem {
  id: string;
  fullName: string;
  cin?: string | null;
  appointmentNumber?: string | null;
  primaryCourt?: string | null;
  region?: string | null;
  officeAddress?: string | null;
  phone?: string | null;
}

interface RegisteredNotaryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotary: (notary: RegisteredNotaryItem) => void;
  title?: string;
  subtitle?: string;
}

export const RegisteredNotaryPickerModal: React.FC<RegisteredNotaryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectNotary,
  title = 'اختيار العدل الزميل (المضمم)',
  subtitle = 'حدد العدل الثاني المصرح له رسمياً في النظام لإسناد مهمة التوقيع والمصادقة له',
}) => {
  const { sessionToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: notaries = [], isLoading, refetch } = trpc.feesAgent.documents.listRegisteredNotariesForCoSigning.useQuery(
    { sessionToken: sessionToken || '', search: searchTerm },
    { enabled: isOpen && !!sessionToken, staleTime: 30_000 }
  );

  const filteredNotaries = useMemo(() => {
    if (!searchTerm.trim()) return notaries;
    const term = searchTerm.toLowerCase().trim();
    return notaries.filter((n: any) =>
      (n.fullName && n.fullName.toLowerCase().includes(term)) ||
      (n.cin && n.cin.toLowerCase().includes(term)) ||
      (n.primaryCourt && n.primaryCourt.toLowerCase().includes(term)) ||
      (n.appointmentNumber && n.appointmentNumber.toLowerCase().includes(term))
    );
  }, [notaries, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-l from-[#07172e] via-[#0b2447] to-[#07172e] text-white border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{title}</h3>
                <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم الكامل للعدل، المحكمة، أو رقم بطاقة التعريف الوطنية CIN..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xs"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-[#fdfbf7]">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs font-bold">جاري تحميل لائحة السادة العدول المسجلين...</p>
            </div>
          ) : filteredNotaries.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200 p-8">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto opacity-75" />
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800">لم يتم العثور على عدل مطابق للبحث</p>
                <p className="text-xs text-slate-500">
                  {searchTerm
                    ? 'يرجى التأكد من كتابة الاسم أو المحكمة بشكل صحيح.'
                    : 'لا يوجد عدول مسجلون إضافيون متاحون في النظام حالياً.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredNotaries.map((notary: any) => (
                <div
                  key={notary.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-white shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {notary.fullName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>عدل ممارس مسجل</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                        {notary.primaryCourt && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{notary.primaryCourt}</span>
                          </span>
                        )}
                        {notary.cin && (
                          <span>ر.ب.ت: <strong className="text-slate-700 font-mono">{notary.cin}</strong></span>
                        )}
                        {notary.appointmentNumber && (
                          <span>قرار: <strong className="text-slate-700 font-mono">{notary.appointmentNumber}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectNotary(notary);
                      onClose();
                    }}
                    className="py-2.5 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>اختيار كعدل ثانٍ</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>العدد الإجمالي المتاح: {filteredNotaries.length} عدل</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

