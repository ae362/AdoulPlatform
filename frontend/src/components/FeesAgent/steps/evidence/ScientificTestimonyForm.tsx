import React from 'react';
import {
  Scale, FileText, Calendar, Building, User, CheckCircle2,
  AlertTriangle, Upload, X, ShieldCheck
} from 'lucide-react';
import type { FeesAgentState } from '../../../../types/feesAgentTypes';

interface ScientificTestimonyFormProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
}

export const ScientificTestimonyForm: React.FC<ScientificTestimonyFormProps> = ({
  state,
  setState,
}) => {
  const data = state.scientificTestimony || {};

  const updateField = (field: string, value: any) => {
    setState((prev) => ({
      ...prev,
      scientificTestimony: {
        ...(prev.scientificTestimony || {}),
        [field]: value,
      },
    }));
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) {
      updateField('electronicDoc', null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',').pop() || '';
      updateField('electronicDoc', {
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        base64: b64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Informative Banner */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5 shadow-xs flex items-start gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
          <Scale className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-black text-purple-950">
            مسار الشهادة العلمية (بإذن قضائي وتلقٍ ثنائي)
          </h4>
          <p className="text-xs text-purple-900 leading-relaxed">
            شهادة علمية يتلقاها العدلان بناءً على إذن صادر من قاضي التوثيق المختص. لا يعامل المتلقيان هنا كشهود، بل كعدلين متلقيين للشهادة الرسمية وفق الضوابط القانونية.
          </p>
        </div>
      </div>

      {/* 1. Judge's Permission Data Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <FileText className="w-4 h-4 text-purple-600" />
          <h5 className="text-sm font-black text-slate-800">بيانات ومراجع إذن قاضي التوثيق</h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم الإذن القضائي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.permissionNumber || ''}
              onChange={(e) => updateField('permissionNumber', e.target.value)}
              placeholder="مثال: 2026/124/إ.ق"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الإذن <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.permissionDate || ''}
              onChange={(e) => updateField('permissionDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المحكمة الابتدائية المختصة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.courtName || state.meta?.court || ''}
              onChange={(e) => updateField('courtName', e.target.value)}
              placeholder="مثال: المحكمة الابتدائية بالرباط"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم قاضي التوثيق الصادر عنه الإذن
            </label>
            <input
              type="text"
              value={data.judgeName || ''}
              onChange={(e) => updateField('judgeName', e.target.value)}
              placeholder="الأستاذ(ة): القاضي المكلف بالتوثيق"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ صدور الإذن / التبليغ
            </label>
            <input
              type="date"
              value={data.issueDate || ''}
              onChange={(e) => updateField('issueDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الوثيقة الإلكترونية للإذن القضائي (مرفق)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-700 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
            />
            {data.electronicDoc && (
              <div className="mt-1 flex items-center justify-between text-xs bg-purple-50 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200">
                <span className="truncate">📎 {(data.electronicDoc as any)?.name || 'ملف الإذن'}</span>
                <button
                  type="button"
                  onClick={() => handleFileUpload(null)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <input
            type="checkbox"
            id="electronicVerification"
            checked={!!data.electronicVerification}
            onChange={(e) => updateField('electronicVerification', e.target.checked)}
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
          />
          <label htmlFor="electronicVerification" className="text-xs font-bold text-slate-700 cursor-pointer">
            تم التحقق الإلكتروني من صحة الإذن القضائي وسريانه عبر المنظومة القضائية المندمجة
          </label>
        </div>
      </div>

      {/* 2. The Two Receiving Adouls (العدلان المتلقيان) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="w-4 h-4 text-purple-600" />
          <h5 className="text-sm font-black text-slate-800">
            العدلان المتلقيان للشهادة العلمية (بدون تسميتهم شهوداً)
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-black text-purple-700 uppercase">العدل الأول (المتلقي الأساسي)</span>
            <input
              type="text"
              value={data.primaryNotary || state.meta?.notaryPrimary || ''}
              onChange={(e) => updateField('primaryNotary', e.target.value)}
              placeholder="اسم العدل الأول"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-500 block">يسحب تلقائياً من حساب المستخدم الموثق</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-black text-purple-700 uppercase">العدل الثاني (المتلقي العاطف)</span>
            <input
              type="text"
              value={data.secondaryNotary || state.meta?.notarySecondary || ''}
              onChange={(e) => updateField('secondaryNotary', e.target.value)}
              placeholder="اسم العدل الثاني الشريك"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-500 block">يسحب من الملف الشخصي أو يدخل اسم العدل الشريك</span>
          </div>
        </div>
      </div>
    </div>
  );
};
