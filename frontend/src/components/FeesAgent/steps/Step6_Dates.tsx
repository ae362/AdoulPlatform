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
import { Calendar } from 'lucide-react';

export const Step6_Dates: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const { user } = useAuth();
    const currentNotary = user?.full_name || 'عدول متلقي';
    const secondaryNotaryName = '';
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType);
    const isSale = ['بيع_وشراء', 'بيع_وشراء_معنوي', 'بيع_وشراء_ملكية_مشتركة', 'بيع_وشراء_طور_انجاز_ابتدائي', 'بيع_وشراء_طور_انجاز_نهائي'].includes(state.documentType) || (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء');
    const isMarriage = state.documentType === 'زواج' || state.documentType === 'زواج_مختلط';

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
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800 border border-blue-200">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>{isSale ? 'المرحلة 6 من 8' : isMarriage ? 'تاريخ ومجلس الإشهاد' : 'التواريخ ومجلس العقد'}</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              {state.documentType || 'توثيق التاريخ والمراجع'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>📅</span>
            <span>{isSale ? 'الخطوة السادسة: تواريخ التلقي والمراجع ومجلس الإشهاد' : 'الخطوة السادسة: التواريخ والمراجع ومجلس العقد'}</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            تحديد التواريخ الميلادية والهجرية وتفقيطها بالحروف، وتوثيق مجلس الإشهاد ومراجع الاستناد قبل الانتقال إلى التحرير والصياغة.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 space-y-6">
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
              onChange={(e) => {
                const fileList = e.target.files;
                if (!fileList || fileList.length === 0) return;
                const files = Array.from(fileList);
                Promise.all(
                  files.map(
                    (file) =>
                      new Promise<any>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const b64 = String(reader.result || '').split(',').pop() || '';
                          resolve({
                            name: file.name,
                            size: file.size,
                            type: file.type || 'application/octet-stream',
                            base64: b64,
                            file,
                          });
                        };
                        reader.readAsDataURL(file);
                      })
                  )
                ).then((newDocs) => {
                  setState((prev) => ({
                    ...prev,
                    meta: {
                      ...prev.meta,
                      additionalDocuments: [...((prev.meta?.additionalDocuments as any[]) || []), ...newDocs],
                    },
                  }));
                });
                e.target.value = '';
              }}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
            {Array.isArray(state.meta?.additionalDocuments) && state.meta.additionalDocuments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {(state.meta.additionalDocuments as any[]).map((doc, docIdx) => (
                  <div key={docIdx} className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                    <span className="truncate font-medium">📎 {doc.name || `وثيقة إضافية ${docIdx + 1}`}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          meta: {
                            ...prev.meta,
                            additionalDocuments: ((prev.meta?.additionalDocuments as any[]) || []).filter((_, idx) => idx !== docIdx),
                          },
                        }))
                      }
                      className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                      title="حذف المرفق"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => {
              // Marriage Types: Return to Step 2 (Marriage Details)
              if (state.documentType === 'زواج' || state.documentType === 'زواج_مختلط') {
                return { ...prev, step: 2 };
              }
              // Marital Assets Agreement and Tawkil: Return to Step 3
              if (state.documentType === 'اتفاق_تدبير_اموال_زوجية' || state.documentType === 'توكيل_رسمي') {
                return { ...prev, step: 3 };
              }
              // Divorce: Return to Step 4 (Divorce Summary)
              if (state.documentType === 'الاشهاد_على_الطلاق_الاتفاقي') {
                return { ...prev, step: 4 };
              }
              // Default for all other deeds with witnesses: Return to Step 5
              return { ...prev, step: 5 };
            })}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق</span>
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
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>متابعة إلى التحرير والمراجعة النهائية</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };
