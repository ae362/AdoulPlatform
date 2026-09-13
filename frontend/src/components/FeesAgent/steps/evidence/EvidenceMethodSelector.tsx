import React, { useState } from 'react';
import {
  FileText, Users, Scale, UserCheck, Sparkles, Check,
  AlertCircle, HelpCircle, ArrowLeft, CheckCircle2
} from 'lucide-react';
import {
  type EvidenceMethod,
  EVIDENCE_METHODS_CONFIG,
  type DocumentEvidenceRule,
} from '../../services/evidenceRulesEngine';

interface EvidenceMethodSelectorProps {
  selectedMethod: EvidenceMethod;
  onSelectMethod: (method: EvidenceMethod) => void;
  rule: DocumentEvidenceRule;
  onOpenWhyModal: () => void;
}

export const EvidenceMethodSelector: React.FC<EvidenceMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  rule,
  onOpenWhyModal,
}) => {
  // هل تم إغلاق أو رفض الاقتراح التلقائي؟
  const [hasDismissedSuggestion, setHasDismissedSuggestion] = useState(false);
  const isRecommendedActive = selectedMethod === rule.defaultMethod;

  const getIconForMethod = (method: EvidenceMethod) => {
    switch (method) {
      case 'none':
        return <FileText className="w-5 h-5" />;
      case 'lafif':
        return <Users className="w-5 h-5" />;
      case 'scientific':
        return <Scale className="w-5 h-5" />;
      case 'mithliya':
        return <UserCheck className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Smart Suggestion Banner */}
      {!hasDismissedSuggestion && rule.defaultMethod !== 'none' && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                    اقتراح النظام الذكي
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    نوع الرسم: <strong className="text-slate-800">{rule.arabicName}</strong>
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {rule.recommendationReason}
                </p>
                <p className="text-xs text-slate-600">
                  يبدو أن طريقة الإثبات المناسبة لهذا الرسم هي: <strong className="text-indigo-950 underline decoration-indigo-300 decoration-2">{EVIDENCE_METHODS_CONFIG[rule.defaultMethod].title}</strong>. هل تريد اعتماد هذا المسار؟
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  onSelectMethod(rule.defaultMethod);
                  setHasDismissedSuggestion(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm ${
                  isRecommendedActive
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isRecommendedActive ? 'المسار معتمد حالياً' : 'اعتماد الاقتراح'}</span>
              </button>

              <button
                type="button"
                onClick={() => setHasDismissedSuggestion(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition"
              >
                اختيار طريقة أخرى
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Section Instructions & Legal Explainer trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>أولاً: اختيار طريقة الإثبات المعتمدة لهذا الرسم</span>
            <span className="text-xs font-normal text-slate-500">
              (سيعرض النظام فقط البيانات المرتبطة بالطريقة المختارة)
            </span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            حدد كيف سيتم إثبات الواقعة أو الحق قانونياً قبل تحديد الأشخاص ومراجع الإشهاد.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenWhyModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs self-start sm:self-center"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>الأساس القانوني والإجرائي (القانون 51.26)</span>
        </button>
      </div>

      {/* 3. The Four Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['none', 'lafif', 'scientific', 'mithliya'] as EvidenceMethod[]).map((methodKey) => {
          const config = EVIDENCE_METHODS_CONFIG[methodKey];
          const isSelected = selectedMethod === methodKey;
          const isDefault = rule.defaultMethod === methodKey;

          return (
            <div
              key={methodKey}
              onClick={() => onSelectMethod(methodKey)}
              className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-right flex flex-col justify-between select-none ${
                isSelected
                  ? `${config.themeColor.bg} ${config.themeColor.selectedRing} border-transparent shadow-md`
                  : `bg-white border-slate-200 ${config.themeColor.hoverBg} hover:border-slate-300 hover:shadow-xs`
              }`}
            >
              {/* Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isSelected
                      ? 'bg-white shadow-xs text-slate-900'
                      : `${config.themeColor.bg} ${config.themeColor.accent}`
                  }`}
                >
                  {getIconForMethod(methodKey)}
                </span>

                <div className="flex items-center gap-1.5">
                  {isDefault && (
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-md">
                      موصى به
                    </span>
                  )}
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Title & Short Description */}
              <div className="space-y-1.5 mb-3 flex-1">
                <h4 className={`text-sm font-black ${isSelected ? config.themeColor.text : 'text-slate-900'}`}>
                  {config.title}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {config.shortDesc}
                </p>
              </div>

              {/* Badge Footer */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold">
                <span className={isSelected ? config.themeColor.accent : 'text-slate-500'}>
                  {config.badge}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-black text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                    المسار النشط
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

