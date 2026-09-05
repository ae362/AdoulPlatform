import React from 'react';
import type { FeesAgentState } from '../../../types/feesAgentTypes';

export interface ExpandedTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FeesAgentState;
}

export const ExpandedTableModal: React.FC<ExpandedTableModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">سجل البيانات الموسع</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-auto flex-1 text-right" dir="rtl">
          <table className="w-full text-sm text-right border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0">
              <tr>
                <th className="p-3 border border-gray-200">الرقم التسلسلي</th>
                <th className="p-3 border border-gray-200">نوع الرسم</th>
                <th className="p-3 border border-gray-200">تاريخ التضمين</th>
                <th className="p-3 border border-gray-200">الأطراف (البائع/الزوج)</th>
                <th className="p-3 border border-gray-200">الأطراف (المشتري/الزوجة)</th>
                <th className="p-3 border border-gray-200">البطاقة الوطنية (طرف 1)</th>
                <th className="p-3 border border-gray-200">البطاقة الوطنية (طرف 2)</th>
                {state.documentType !== 'زواج' &&
                  state.documentType !== 'زواج_مختلط' &&
                  state.documentType !== 'الاشهاد_على_الطلاق_الاتفاقي' && (
                    <th className="p-3 border border-gray-200">العقار</th>
                  )}
                <th className="p-3 border border-gray-200">مراجع السند</th>
                <th className="p-3 border border-gray-200">إذن/اشعار</th>
                <th className="p-3 border border-gray-200">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-blue-50">
                <td className="p-3 border border-gray-200 font-mono text-blue-600 font-bold">
                  {state.meta.fileNumber}
                </td>
                <td className="p-3 border border-gray-200">{state.documentType}</td>
                <td className="p-3 border border-gray-200">
                  {new Date().toLocaleDateString('ar-MA')}
                </td>
                <td className="p-3 border border-gray-200">
                  {state.sellers.map((s) => s.name).join('، ')}
                </td>
                <td className="p-3 border border-gray-200">
                  {state.buyers.map((b) => b.name).join('، ')}
                </td>
                <td className="p-3 border border-gray-200">
                  {state.sellers.map((s) => s.idNumber).join('، ')}
                </td>
                <td className="p-3 border border-gray-200">
                  {state.buyers.map((b) => b.idNumber).join('، ')}
                </td>
                {state.documentType !== 'زواج' &&
                  state.documentType !== 'زواج_مختلط' &&
                  state.documentType !== 'الاشهاد_على_الطلاق_الاتفاقي' && (
                    <td className="p-3 border border-gray-200">
                      {state.properties?.[0]?.propertyName || '---'}
                    </td>
                  )}
                <td className="p-3 border border-gray-200">
                  {state.documentType === 'زواج' || state.documentType === 'زواج_مختلط' ? (
                    state.sellers[0]?.maritalStatus === 'مطلق' ? (
                      <span className="text-xs text-orange-600 block">
                        طلاق: {state.sellers[0]?.divorceDeedNumber || '---'}
                      </span>
                    ) : (
                      '---'
                    )
                  ) : state.properties?.[0]?.titleDocuments?.[0]?.number ? (
                    `رسم ${state.properties[0].titleDocuments[0].number}`
                  ) : (
                    '---'
                  )}
                </td>
                <td className="p-3 border border-gray-200">
                  {state.documentType === 'زواج' &&
                  state.tawkilScope?.legalActions?.marriageDetails?.underagePermissionNumber ? (
                    <span className="text-purple-600 text-xs">
                      إذن قاصر: {state.tawkilScope?.legalActions?.marriageDetails?.underagePermissionNumber}
                    </span>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="p-3 border border-gray-200">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                    مضمن
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

