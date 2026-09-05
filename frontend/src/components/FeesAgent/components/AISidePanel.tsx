import React, { useMemo } from 'react';
import type { FeesAgentState } from '../../../types/feesAgentTypes';
import { AIQuestioner, type QuestionerContext } from '../../../services/aiQuestioner';

export interface AISidePanelProps {
  state: FeesAgentState;
}

export const AISidePanel: React.FC<AISidePanelProps> = ({ state }) => {
  // تحديد السياق الحالي
  const context: QuestionerContext = {
    step: state.step || 0,
    documentType: state.documentType || '',
    hasThirdPartyRights: (state.properties || []).some(p => p?.hasThirdPartyRights === 'نعم'),
    propertyIsRegistered: (state.properties || []).some(p => p?.type === 'محفظ'),
    priceInWords: state.finance?.priceInWords || '',
  };

  // الحصول على السؤال التالي
  const currentQuestion = useMemo(
    () => AIQuestioner.getNextQuestion(context, []),
    [context]
  );

  // الحصول على الاقتراحات
  const suggestions = useMemo(
    () => AIQuestioner.getSuggestions(context) || [],
    [context]
  );

  // الحصول على رسالة الترحيب
  const welcomeMessage = useMemo(
    () => AIQuestioner.getWelcomeMessage(state.documentType),
    [state.documentType]
  );

  // التحقق من الامتثال
  const complianceIssues = useMemo(
    () => (state ? AIQuestioner.checkLegalCompliance(context, state) : []) || [],
    [context, state]
  );

  const totalSteps = (state.documentType === 'توكيل_رسمي' && state.tawkilScope?.legalActions?.type === 'marriage') 
    ? 7 
    : (state.documentType === 'رسم_الاقرار_ببنوة' || state.documentType === 'الاشهاد_على_الطلاق_الاتفاقي')
    ? 7
    : (state.documentType === 'ثبوت_نسب_ببينة_السماع')
    ? 6
    : 8;

  const validationAlerts = state.validationAlerts || [];

  return (
    <div className="bg-yellow-50 p-6 rounded-lg shadow border-l-4 border-yellow-400 h-fit sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b-2 border-yellow-300">
        🤖 مساعد ذكي (AI Assistant)
      </h3>

      {/* رسالة الترحيب */}
      {state.step === 0 && (
        <div className="bg-blue-100 p-3 rounded-lg border-r-4 border-blue-400 mb-4 text-sm text-blue-900 whitespace-pre-wrap">
          {welcomeMessage}
        </div>
      )}

      {/* السؤال الحالي */}
      {currentQuestion && (
        <div className="bg-purple-100 p-4 rounded-lg border-r-4 border-purple-400 mb-4">
          <p className="font-bold text-purple-900 mb-2">❓ السؤال الحالي:</p>
          <p className="text-purple-800 font-semibold mb-2">{currentQuestion.text}</p>

          {/* التلميح */}
          {currentQuestion.hint && (
            <div className="bg-purple-50 p-2 rounded mb-2 border-r-2 border-purple-300">
              <p className="text-xs text-purple-700">
                <strong>💡 تلميح:</strong> {currentQuestion.hint}
              </p>
            </div>
          )}

          {/* الأمثلة */}
          {currentQuestion.examples && currentQuestion.examples.length > 0 && (
            <div className="bg-purple-50 p-2 rounded">
              <p className="text-xs text-purple-700 font-semibold mb-1">📝 أمثلة:</p>
              <ul className="text-xs text-purple-600 list-disc list-inside space-y-0.5">
                {currentQuestion.examples.map((example, idx) => (
                  <li key={idx}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* التنبيهات والتحقق */}
      {validationAlerts.length > 0 && (
        <div className="bg-red-100 p-3 rounded-lg border-r-4 border-red-400 mb-4">
          <p className="font-semibold text-red-900 mb-2">⚠️ {validationAlerts.length} تنبيهات</p>
          <ul className="text-red-800 text-xs space-y-1 list-disc list-inside">
            {validationAlerts.slice(0, 3).map((alert, idx) => (
              <li key={alert?.id || idx} className="font-semibold">
                {alert?.message}
                {alert?.suggestion && (
                  <p className="text-red-700 mt-0.5 font-normal">💡 الاقتراح: {alert.suggestion}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* مشاكل الامتثال القانوني */}
      {complianceIssues.length > 0 && (
        <div className="bg-orange-100 p-3 rounded-lg border-r-4 border-orange-400 mb-4">
          <p className="font-semibold text-orange-900 mb-2">🔴 مشاكل الامتثال القانوني:</p>
          <ul className="text-orange-800 text-xs space-y-1 list-disc list-inside">
            {complianceIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* الاقتراحات */}
      {suggestions.length > 0 && (
        <div className="bg-green-100 p-3 rounded-lg border-r-4 border-green-400 mb-4">
          <p className="font-semibold text-green-900 mb-2">💡 اقتراحات ذكية:</p>
          <ul className="text-green-800 text-xs space-y-1">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex gap-2">
                <span>→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* حالة التقدم */}
      <div className="bg-blue-100 p-3 rounded-lg border-r-4 border-blue-400">
        <p className="font-semibold text-blue-900 mb-1">📊 التقدم</p>
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((state.step || 0) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="text-blue-800 text-xs">الخطوة {state.step || 0} من {totalSteps}</p>
      </div>

      {/* رسالة الحفظ */}
      {state.isDraftSaved && (
        <div className="bg-green-100 p-3 rounded-lg border-r-4 border-green-400 mt-4">
          <p className="font-semibold text-green-900">✓ محفوظ تلقائياً</p>
          <p className="text-green-800 text-xs mt-1">تم حفظ المسودة</p>
        </div>
      )}
    </div>
  );
};
