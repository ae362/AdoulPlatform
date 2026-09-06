import React from 'react';
import type { DocumentWizardProps } from '../types';
import type { PostRegistrationDetails } from '../../../types/feesAgentTypes';

export const Step8_PostRegistration: React.FC<DocumentWizardProps> = ({ state, setState }) => {
  const handlePostRegChange = (field: keyof PostRegistrationDetails, value: any) => {
    if (value instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = String(reader.result || '').split(',').pop() || '';
        const fileObj = {
          name: value.name,
          size: value.size,
          type: value.type || 'application/pdf',
          base64: b64,
          file: value,
        };
        setState((prev) => ({
          ...prev,
          postRegistration: {
            ...prev.postRegistration,
            [field]: fileObj,
          },
        }));
      };
      reader.readAsDataURL(value);
      return;
    }
    setState((prev) => ({
      ...prev,
      postRegistration: {
        ...prev.postRegistration,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          الخطوة {['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType) ? 'التاسعة' : 'الثامنة'}: التسجيل بالمالية
        </h2>
        <p className="text-gray-700">
          أدخل بيانات التسجيل الإلكتروني بالمالية وإرفاق نسخة من الوثيقة المسجلة.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">سجل الكترونيا بمالية</label>
            <input
              type="text"
              value={state.postRegistration?.registeredAtFinance || ''}
              onChange={(e) => handlePostRegChange('registeredAtFinance', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="أدخل اسم المالية أو المرجع"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التسجيل</label>
            <input
              type="date"
              value={state.postRegistration?.registrationDate || ''}
              onChange={(e) => handlePostRegChange('registrationDate', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الايداع</label>
            <input
              type="text"
              value={state.postRegistration?.depositNumber || ''}
              onChange={(e) => handlePostRegChange('depositNumber', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="أدخل رقم الايداع"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نسخة الوثيقة (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handlePostRegChange('templatePdf', e.target.files?.[0] || null)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            {state.postRegistration?.templatePdf && (
              <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                <span className="truncate font-medium">📎 تم إرفاق: {(state.postRegistration.templatePdf as any)?.name || 'نسخة الوثيقة المسجلة'}</span>
                <button
                  type="button"
                  onClick={() => handlePostRegChange('templatePdf', null)}
                  className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                  title="حذف المرفق"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-between">
        <button
          onClick={() => setState((prev) => ({ ...prev, step: 7 }))}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
        >
          ← السابق
        </button>
        
        <button
          onClick={() => {
            alert('تم حفظ بيانات التسجيل بنجاح');
          }}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
        >
          ✓ حفظ وإنهاء
        </button>
      </div>
    </div>
  );
};
