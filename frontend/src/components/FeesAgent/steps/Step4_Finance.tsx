import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PaymentMethod } from '../../../types/feesAgentTypes';
import { convertNumberToArabicWords } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, Scale
} from 'lucide-react';

export const Step4_Finance: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType);
    const isMunakala = state.documentType === 'مناقلة';
    const isSale = ['بيع_وشراء', 'بيع_وشراء_معنوي', 'بيع_وشراء_ملكية_مشتركة', 'بيع_وشراء_طور_انجاز_ابتدائي', 'بيع_وشراء_طور_انجاز_نهائي'].includes(state.documentType) || (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء');
    const [tempFinance, setTempFinance] = useState(state.finance);

    return (
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-r from-teal-50/90 via-emerald-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 border border-teal-200">
              <Scale className="h-3.5 w-3.5 text-teal-600" />
              <span>{isSale ? 'المرحلة 5 من 8' : 'الجانب المالي'}</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              {state.documentType || 'المعاملة المالية'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>💰</span>
            <span>{isSale ? 'الخطوة الخامسة: الثمن والوفاء والالتزامات' : 'الجانب المالي: الثمن والالتزامات'}</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            أدخل تفاصيل الثمن المتفق عليه بالأرقام والحروف، طريقة الوفاء، وشروط التسجيل الضريبي والتحفيظ العقاري.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 space-y-6">
          {isInheritanceType && (
             <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-gray-800 font-semibold">
                قوم المخلف/العقارات المذكورة اعلاه من اجل التسجيل و التمبربمصلحة الضرائب في مبلغ
             </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isInheritanceType
                ? 'المبلغ المقدر (درهم)'
                : isMunakala
                  ? 'القيمة المعتمدة للمناقلة * (درهم)'
                  : 'الثمن المتفق عليه * (درهم)'}
            </label>
            <input
              type="number"
              value={tempFinance.price || ''}
              onChange={(e) => {
                const price = parseFloat(e.target.value) || 0;
                setTempFinance({
                  ...tempFinance,
                  price,
                  priceInWords: convertNumberToArabicWords(price),
                });
              }}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isInheritanceType ? 'المبلغ بالحروف' : isMunakala ? 'قيمة المناقلة بالحروف' : 'الثمن بالحروف'}
            </label>
            <input
              type="text"
              value={tempFinance.priceInWords}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          {!isInheritanceType && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">طريقة الأداء *</label>
              <select
                value={tempFinance.paymentMethod}
                onChange={(e) => setTempFinance({ ...tempFinance, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">-- اختر --</option>
                <option value="نقد">نقد</option>
                <option value="شيك">شيك</option>
                <option value="تحويل">تحويل بنكي</option>
                <option value="قسط">أقساط</option>
                <option value="اعترافا">اعترافا</option>
              </select>
            </div>
          )}

          {!isInheritanceType && tempFinance.paymentMethod === 'تحويل' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل التحويل</label>
              <textarea
                value={tempFinance.transferDetails || ''}
                onChange={(e) =>
                  setTempFinance({
                    ...tempFinance,
                    transferDetails: e.target.value,
                  })
                }
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="رقم الحساب، اسم البنك، إلخ..."
                rows={3}
              />
            </div>
          )}

          {!isInheritanceType && state.buyers.length > 0 && tempFinance.price > 0 && (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">توزيع الحصة بين المشترين</h4>
              <div className="space-y-1">
                {state.buyers.map((buyer, index) => {
                  const sharePercent = parseFloat(buyer.share?.replace('%', '') || '0') || (100 / state.buyers.length);
                  const shareValue = (tempFinance.price * sharePercent / 100).toFixed(2);
                  return (
                    <div key={index} className="flex items-center justify-between text-sm text-slate-700">
                      <span>{buyer.name || `مشتري ${index + 1}`}</span>
                      <span>{shareValue} درهم ({buyer.share || `${sharePercent.toFixed(2)}%`})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isInheritanceType && (
            <div className="bg-yellow-50 p-4 rounded-lg border-r-4 border-yellow-400">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                هل تم / سيتم تسجيل العقد بمصلحة التسجيل والرسوم الضريبية؟ *
              </label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={option}
                      checked={tempFinance.registeredWithTax === option}
                      onChange={(e) =>
                        setTempFinance({
                          ...tempFinance,
                          registeredWithTax: e.target.value as 'نعم' | 'لا',
                        })
                      }
                    />
                    <span className="font-semibold">{option}</span>
                  </label>
                ))}
              </div>

              {tempFinance.registeredWithTax === 'لا' && (
                <div className="mt-3 p-3 bg-red-100 border-l-4 border-red-500 rounded">
                  <p className="text-red-800 text-sm font-semibold">
                    ⚠️ تحذير إلزامي: إذا لم يتم التسجيل، ستُضاف بند إلزامي في الرسم يلزم الأطراف بالتسجيل 
                    في أجل 15 يوم وتنبيه بالعقوبات الضريبية.
                  </p>
                </div>
              )}
            </div>
          )}

          {(state.documentType === 'بيع_وشراء' || state.documentType === 'بيع_وشراء_معنوي' || state.documentType === 'هبة' || state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة' || state.documentType === 'مناقلة') && state.properties.some(p => p.type === 'محفظ') && (
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500 space-y-4 mt-6">
              <h3 className="text-lg font-bold text-gray-800">ملتمس الى السيد المحافظ</h3>
              <p className="text-gray-700 font-medium leading-relaxed">
                {state.documentType === 'هبة' 
                  ? 'بتقييد هذا الحق العيني للمالك الجديد على العقار موضوع عقد الهبة لدى مصلحة المحافظة العقارية وفق الاصول القانونية المعمول بها'
                  : state.documentType === 'مناقلة'
                    ? 'بتقييد الحقوق العينية المتبادلة الناتجة عن عقد المناقلة على العقار أو العقارات موضوع هذا الرسم لدى مصلحة المحافظة العقارية وفق الأصول القانونية المعمول بها'
                    : 'بتقييد هذا الحق العيني للمالك الجديد على العقار موضوع عقد الشراء لدى مصلحة المحافظة العقارية وفق الاصول القانونية المعمول بها'
                }
                <br />
                وكذلك:
              </p>
              <textarea
                value={tempFinance.conservatorRequest || ''}
                onChange={(e) => setTempFinance({ ...tempFinance, conservatorRequest: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={4}
                placeholder="أدخل نص الملتمس هنا..."
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: state.documentType === 'مقاسمة' ? 3.5 : 3 }))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق</span>
          </button>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                finance: tempFinance,
                step: 5,
              }));
            }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>التالي: بيانات الشهود ومجلس العقد</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 5: الشهود (خاص بالتركات)
  // ============================================================================

