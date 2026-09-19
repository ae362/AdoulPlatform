import React, { useState, useMemo } from 'react';
import { trpc } from '../../../../trpc';
import { useAuth } from '../../../../contexts/AuthContext';
import type { FeesAgentState } from '../../../../types/feesAgentTypes';
import { convertMarriagePermissionToFeesAgent } from '../../../../utils/marriagePermissionAdapter';
import { Search, CheckCircle, FileText, Calendar, Scale, Heart, Sparkles, X } from 'lucide-react';

interface MarriagePermissionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onImportSuccess?: (requestNumber: string) => void;
}

export const MarriagePermissionPickerModal: React.FC<MarriagePermissionPickerModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  onImportSuccess,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: permissions, isLoading } = (trpc as any).permissions.getMarriage.useQuery(
    { notaryId: user?.id },
    { enabled: isOpen }
  );

  const filteredPermissions = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return [];
    if (!searchQuery.trim()) return permissions;
    const q = searchQuery.toLowerCase().trim();
    return permissions.filter((p: any) => {
      const parsedData = typeof p.data === 'string' ? JSON.parse(p.data || '{}') : (p.data || {});
      const parties = `${parsedData.suitorFirstNameAr || ''} ${parsedData.suitorLastNameAr || ''} ${parsedData.fianceeFirstNameAr || ''} ${parsedData.fianceeLastNameAr || ''} ${p.involved_names || ''}`.toLowerCase();
      const cins = `${parsedData.suitorCIN || ''} ${parsedData.fianceeCIN || ''}`.toLowerCase();
      const serial = `${p.decision_serial_number || ''} ${p.request_number || ''}`.toLowerCase();
      return parties.includes(q) || cins.includes(q) || serial.includes(q);
    });
  }, [permissions, searchQuery]);

  if (!isOpen) return null;

  const handleApplyImport = (permission: any) => {
    const updatedState = convertMarriagePermissionToFeesAgent(permission, state);
    setState(prev => ({
      ...prev,
      ...updatedState,
    }));
    if (onImportSuccess) {
      onImportSuccess(permission.request_number);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E6BE8A]/20 text-[#E6BE8A] flex items-center justify-center text-2xl border border-[#E6BE8A]/30">
              💍
            </div>
            <div>
              <h3 className="text-xl font-black flex items-center gap-2">
                <span>استيراد بيانات الزوجين من إذن الزواج القضائي</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6BE8A] text-red-950 font-black">
                  بوابة قضاء الأسرة
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                اختر طلباً معتمداً ليتم ملء هويات الزوجين والأرقام الوطنية ومراجع الإذن آلياً دون إعادة إدخالها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث برقم الطلب، رقم إذن القاضي، اسم الزوج أو الزوجة، أو رقم بطاقة التعريف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-[#E6BE8A]/20 focus:border-[#E6BE8A] outline-none transition font-medium"
              autoFocus
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* List of Permissions */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading && (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin text-3xl mb-2">⏳</div>
              <p className="text-sm font-bold">جاري تحميل سجل أذونات الزواج المعتمدة...</p>
            </div>
          )}

          {!isLoading && filteredPermissions.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">لم يتم العثور على أذونات زواج مطابقة</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                تأكد من إرسال طلب الإذن بالزواج عبر بوابة قضاء الأسرة، أو قم بالبحث برقم الطلب أو الاسم
              </p>
            </div>
          )}

          {!isLoading && filteredPermissions.map((p: any) => {
            const isSelected = selectedItem?.id === p.id;
            const parsedData = typeof p.data === 'string' ? JSON.parse(p.data || '{}') : (p.data || {});
            const suitor = `${parsedData.suitorFirstNameAr || ''} ${parsedData.suitorLastNameAr || ''}`.trim() || 'الخاطب';
            const fiancee = `${parsedData.fianceeFirstNameAr || ''} ${parsedData.fianceeLastNameAr || ''}`.trim() || 'المخطوبة';
            const isApproved = p.decision_type === 'موافقة' || p.status === 'موافق_عليه' || p.status === 'مقبول';
            const authNumber = p.decision_serial_number || parsedData.judge_decision?.decision_serial_number || p.request_number;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedItem(p)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">{p.request_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isApproved ? '✓ إذن معتمد' : (p.status || 'قيد المعالجة')}
                    </span>
                    {authNumber && authNumber !== p.request_number && (
                      <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">
                        رقم الإذن: {authNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-800 font-bold text-sm">
                    <span className="text-blue-700">🤵 {suitor}</span>
                    <span className="text-slate-400">و</span>
                    <span className="text-rose-700">👰 {fiancee}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    {parsedData.suitorCIN && (
                      <span>ب.ت.و الزوج: <strong className="text-slate-700">{parsedData.suitorCIN}</strong></span>
                    )}
                    {parsedData.fianceeCIN && (
                      <span>ب.ت.و الزوجة: <strong className="text-slate-700">{parsedData.fianceeCIN}</strong></span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('ar-MA') : '---'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyImport(p);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تطبيق واستيراد</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>البيانات المستوردة تشمل: هويات الزوجين، أرقام بطاقات التعريف، الأبوين، المراجع القضائية.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

