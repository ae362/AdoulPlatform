import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  convertGregorianToHijri,
  convertGregorianDateToWords,
  convertHijriDateToWords,
  convertTimeToWords,
  performValidationChecks,
} from '../../../utils/feesAgentUtils';
import { generateDocumentDraft, generateRasmHtml } from '../../../templates/feesAgentTemplates';

export const Step6_Dates: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const { user } = useAuth();
    const currentNotary = user?.full_name || 'عدول متلقي';
    const secondaryNotaryName = '';
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType);

    useEffect(() => {
        // Run specific effects for date/time conversion when component mounts or dependencies change
        if (state.meta.dateGregorian && !state.meta.dateGregorianInWords) {
            setState((prev) => ({
                ...prev,
                meta: {
                    ...prev.meta,
                    dateGregorianInWords: convertGregorianDateToWords(state.meta.dateGregorian),
                    dateHijri: convertGregorianToHijri(state.meta.dateGregorian), // also ensure hijri is set
                    dateHijriInWords: convertHijriDateToWords(state.meta.dateGregorian),
                }
            }));
        }

        if (state.meta.time && !state.meta.hourInWords) {
             const [hours, minutes] = state.meta.time.split(':').map(Number);
             const date = new Date();
             date.setHours(hours);
             date.setMinutes(minutes);
             const hourInWords = convertTimeToWords(date);
             setState((prev) => ({
                 ...prev,
                 meta: {
                     ...prev.meta,
                     hourInWords: hourInWords
                 }
             }));
        }
    }, [state.meta.dateGregorian, state.meta.time]); // Dependencies

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة {isInheritanceType ? 'السابعة' : 'السادسة'}: التواريخ والمراجع</h2>
          <p className="text-gray-700">أدخل التواريخ والمراجع النهائية للرسم.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">التاريخ الميلادي *</label>
              <input
                type="date"
                value={state.meta.dateGregorian}
                onChange={(e) => {
                  const dateVal = e.target.value;
                  const hijriDate = convertGregorianToHijri(dateVal);
                  setState((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      dateGregorian: dateVal,
                      dateHijri: hijriDate,
                      dateGregorianInWords: convertGregorianDateToWords(dateVal),
                      dateHijriInWords: convertHijriDateToWords(dateVal),
                    },
                  }));
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">التاريخ الهجري (تلقائي)</label>
              <input
                type="text"
                value={state.meta.dateHijri}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">التاريخ الميلادي بالحروف</label>
              <input
                type="text"
                value={state.meta.dateGregorianInWords || ''}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      dateGregorianInWords: e.target.value,
                    },
                  }))
                }
                placeholder="مثال: في اليوم الخامس من شهر..."
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">التاريخ الهجري بالحروف</label>
              <input
                type="text"
                value={state.meta.dateHijriInWords || ''}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      dateHijriInWords: e.target.value,
                    },
                  }))
                }
                placeholder="مثال: في اليوم الخامس من شهر..."
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الساعة *</label>
              <input
                type="time"
                value={state.meta.time || ''}
                onChange={(e) => {
                    const timeVal = e.target.value;
                    let hourInWords = '';
                    if (timeVal) {
                        const [hours, minutes] = timeVal.split(':').map(Number);
                        const date = new Date();
                        date.setHours(hours);
                        date.setMinutes(minutes);
                        hourInWords = convertTimeToWords(date);
                    }
                    
                    setState((prev) => ({
                        ...prev,
                        meta: {
                            ...prev.meta,
                            time: timeVal,
                            hourInWords: hourInWords
                        }
                    }));
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الساعة بالحروف</label>
              <input
                type="text"
                value={state.meta.hourInWords || ''}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      hourInWords: e.target.value,
                    },
                  }))
                }
                placeholder="مثال: على الساعة العاشرة صباحاً"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الرسم التسلسلي</label>
            <input
              type="text"
              value={state.meta.fileNumber}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-800 mb-2">العدول:</p>
            <p className="text-gray-700">المتلقي: {currentNotary}</p>
            <p className="text-gray-700">الرفيق: {secondaryNotaryName || 'لا يوجد شريك مفعل حالياً'}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">وثائق إضافية</label>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  meta: {
                    ...prev.meta,
                    additionalDocuments: Array.from(e.target.files || []),
                  },
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => {
              // Fix for Marriage Types: Return to Step 2 (Marriage Details)
              // Marriage Types: Return to Step 2 (Marriage Details)
              if (state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') {
                return { ...prev, step: 2 };
              }
              // Marital Assets Agreement: Return to Step 3 (skips 2, 4, 5)
              if (state.documentType === 'اتفاق_تدبير_اموال_زوجية') {
              // Marital Assets Agreement and Tawkil: Return to Step 3
              if (state.documentType === 'اتفاق_تدبير_اموال_زوجية' || state.documentType === 'توكيل_رسمي') {
                return { ...prev, step: 3 };
              }
              // وكالة follows the complete 3 -> 4 -> 5 -> 6 sequence.
              if (state.documentType === 'توكيل_رسمي') {
                return { ...prev, step: 3 };
              // Divorce: Return to Step 4 (Divorce Summary)
              if (state.documentType === 'الاشهاد_على_الطلاق_الاتفاقي') {
                return { ...prev, step: 4 };
              }
              // Inheritance Types (except Partition/Moukassama): Return to Step 5 (Witnesses)
              if (isInheritanceType && state.documentType !== 'مقاسمة') {
                return { ...prev, step: 5 };
              }
              // Documents that skip Step 4 (Finance): Return to Step 5 (Witnesses)
              if (state.documentType === 'ثبوت_نسب_ببينة_السماع') {
                return { ...prev, step: 5 };
              }
              // Default: Return to Step 4
              return { ...prev, step: 4 };
              // Default for all other deeds with witnesses: Return to Step 5
              return { ...prev, step: 5 };
            })}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => {
              const draft = generateDocumentDraft(state);
              const alerts = performValidationChecks(state);
              const rasmHtml = generateRasmHtml(state);
              setState((prev) => ({
                ...prev,
                draft,
                rasmHtml,
                validationAlerts: alerts,
                step: 7,
              }));
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            المراجعة النهائية →
          </button>
        </div>
      </div>
    );
  };
