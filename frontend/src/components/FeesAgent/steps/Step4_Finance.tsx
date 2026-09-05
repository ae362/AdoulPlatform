import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PaymentMethod } from '../../../types/feesAgentTypes';
import { convertNumberToArabicWords } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';

export const Step4_Finance: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType);
    const isMunakala = state.documentType === 'مناقلة';
    const [tempFinance, setTempFinance] = useState(state.finance);

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الرابعة: الثمن والالتزامات</h2>
          <p className="text-gray-700">أدخل تفاصيل الثمن وطريقة الأداء والتزاماتكم الضريبية.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
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

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: state.documentType === 'مقاسمة' ? 3.5 : 3 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                finance: tempFinance,
                step: 5,
              }));
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي →
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 5: الشهود (خاص بالتركات)
  // ============================================================================

