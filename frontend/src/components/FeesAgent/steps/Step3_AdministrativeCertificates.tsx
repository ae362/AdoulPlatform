import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { AdministrativeCertificate } from '../../../types/feesAgentTypes';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';

export const Step3_AdministrativeCertificates: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType);
    const [law2590, setLaw2590] = useState(state.law2590 || false);
    const [certificates, setCertificates] = useState<AdministrativeCertificate[]>(() => {
      if (state.certificates && state.certificates.length > 0) {
        const hasInheritanceCert = state.certificates.some(c => c.id === 'inheritance_admin_cert');
        
        // If in inheritance mode but missing the specific cert, reset/initialize it
        if (isInheritanceType && !hasInheritanceCert) {
          return [{
            id: 'inheritance_admin_cert',
            type: 'الشهادة/الشواهد الادارية بان العقارات ليست جماعية ولا حبوسية ولا من املاك الدولة و غيرها',
            number: '',
            date: '',
            issuedBy: '',
            isCustom: false,
          }];
        }

        // If NOT in inheritance mode but HAVE the inheritance cert, reset to standard
        if (!isInheritanceType && hasInheritanceCert) {
           const initialCerts: AdministrativeCertificate[] = [
            {
              id: 'tax_cert',
              type: 'شهادة الاجراء الضريبي',
              number: '',
              date: '',
              issuedBy: '',
              isCustom: false,
            }
          ];
          if (state.buyers.length > 1) {
            initialCerts.push({
              id: 'undivided_share_cert',
              type: 'شهادة البيع على الشياع',
              number: '',
              date: '',
              issuedBy: '',
              isCustom: false,
            });
          }
          return initialCerts;
        }

        return state.certificates;
      }
      
      if (isInheritanceType) {
        return [{
          id: 'inheritance_admin_cert',
          type: 'الشهادة/الشواهد الادارية بان العقارات ليست جماعية ولا حبوسية ولا من املاك الدولة و غيرها',
          number: '',
          date: '',
          issuedBy: '',
          isCustom: false,
        }];
      }

      const initialCerts: AdministrativeCertificate[] = [
        {
          id: 'tax_cert',
          type: 'شهادة الاجراء الضريبي',
          number: '',
          date: '',
          issuedBy: '',
          isCustom: false,
        }
      ];

      if (state.buyers.length > 1) {
        initialCerts.push({
          id: 'undivided_share_cert',
          type: 'شهادة البيع على الشياع',
          number: '',
          date: '',
          issuedBy: '',
          isCustom: false,
        });
      }

      return initialCerts;
    });

    // Effect to handle Law 25/90 certificate addition/removal
    React.useEffect(() => {
      if (isInheritanceType) return;

      if (law2590) {
        setCertificates(prev => {
          if (prev.some(c => c.id === 'law_2590_cert')) return prev;
          return [
            ...prev,
            {
              id: 'law_2590_cert',
              type: 'شهادة القانون 25/90',
              number: '',
              date: '',
              issuedBy: '',
              isCustom: false,
            }
          ];
        });
      } else {
        setCertificates(prev => prev.filter(c => c.id !== 'law_2590_cert'));
      }
    }, [law2590, isInheritanceType]);

    const handleCertificateChange = (id: string, field: keyof AdministrativeCertificate, value: any) => {
      setCertificates(prev => prev.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      ));
    };

    const addCustomCertificate = () => {
      setCertificates(prev => [
        ...prev,
        {
          id: `custom_${Date.now()}`,
          type: '',
          number: '',
          date: '',
          issuedBy: '',
          isCustom: true,
        }
      ]);
    };

    const removeCertificate = (id: string) => {
      setCertificates(prev => prev.filter(c => c.id !== id));
    };

    return (
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800 border border-indigo-200">
              <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>المرحلة 4 من 8</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              مسار عقود البيع والمعاملات العقارية
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>📋</span>
            <span>الخطوة الرابعة: الشواهد الإدارية والتراخيص</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            إدخال وفحص بيانات الشواهد الإدارية، شواهد الإبراء الضريبي، وتراخيص التعمير المطلوبة لإتمام المعاملة.
          </p>
        </div>

        {isInheritanceType ? (
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
             <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span>📑</span>
                <span>الشهادة/الشواهد الادارية بان العقارات ليست جماعية ولا حبوسية ولا من املاك الدولة و غيرها</span>
             </h4>
             {certificates.filter(c => c.id === 'inheritance_admin_cert').map(cert => (
               <div key={cert.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من</label>
                    <input
                      type="text"
                      value={cert.issuedBy}
                      onChange={(e) => handleCertificateChange(cert.id, 'issuedBy', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">تحت عدد</label>
                    <input
                      type="text"
                      value={cert.number}
                      onChange={(e) => handleCertificateChange(cert.id, 'number', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                    <input
                      type="date"
                      value={cert.date}
                      onChange={(e) => handleCertificateChange(cert.id, 'date', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl"
                    />
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Law 25/90 Question */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Shield className="h-5 w-5 text-amber-600" />
                <label className="text-base font-black text-slate-800">
                  هل العقار يدخل في إطار القانون 25/90 (التجزئات العقارية والمجموعات السكنية)؟
                </label>
              </div>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-sm cursor-pointer transition ${
                    law2590 === (option === 'نعم')
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      checked={law2590 === (option === 'نعم')}
                      onChange={() => setLaw2590(option === 'نعم')}
                      className="text-indigo-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Undivided Share Option for Multiple Buyers */}
            {state.buyers.length > 1 && (
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  هل تتوفر على شهادة البيع على الشياع؟ (مطلوبة لتعدد المشترين)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={certificates.some(c => c.id === 'undivided_share_cert')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCertificates(prev => [
                            ...prev,
                            {
                              id: 'undivided_share_cert',
                              type: 'شهادة البيع على الشياع',
                              number: '',
                              date: '',
                              issuedBy: '',
                              isCustom: false,
                            }
                          ]);
                        } else {
                          setCertificates(prev => prev.filter(c => c.id !== 'undivided_share_cert'));
                        }
                      }}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="font-semibold">نعم، إضافة الشهادة</span>
                  </label>
                </div>
              </div>
            )}

            {/* Certificates List */}
            {certificates.map((cert, index) => (
              <div key={cert.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400 relative">
                {cert.isCustom && (
                  <button 
                    onClick={() => removeCertificate(cert.id)}
                    className="absolute top-4 left-4 text-red-500 hover:text-red-700 font-semibold"
                  >
                    ✕ حذف
                  </button>
                )}
                
                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  {cert.isCustom ? `شهادة إضافية ${index + 1}` : cert.type}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cert.isCustom && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الشهادة</label>
                      <input
                        type="text"
                        value={cert.type}
                        onChange={(e) => handleCertificateChange(cert.id, 'type', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="اسم الشهادة"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الرقم</label>
                    <input
                      type="text"
                      value={cert.number}
                      onChange={(e) => handleCertificateChange(cert.id, 'number', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">بتاريخ</label>
                    <input
                      type="date"
                      value={cert.date}
                      onChange={(e) => handleCertificateChange(cert.id, 'date', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الصادرة عن</label>
                    <input
                      type="text"
                      value={cert.issuedBy}
                      onChange={(e) => handleCertificateChange(cert.id, 'issuedBy', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="الجهة المصدرة"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addCustomCertificate}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
            >
              + إضافة شهادة أخرى
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق</span>
          </button>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                certificates,
                law2590,
                step: state.documentType === 'مقاسمة' ? 3.5 : 4,
              }));
            }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>التالي: {state.documentType === 'مقاسمة' ? 'تفاصيل المقاسمة' : 'الثمن والالتزامات'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3.5: تفاصيل المقاسمة
  // ============================================================================

