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
      <div className="space-y-8">
        <div className="bg-indigo-50 p-6 rounded-lg border-r-4 border-indigo-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الرابعة: الشواهد الادارية</h2>
          <p className="text-gray-700">إدخال بيانات الشواهد الإدارية المطلوبة لإتمام المعاملة.</p>
        </div>

        {isInheritanceType ? (
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400">
             <h4 className="text-lg font-bold text-gray-800 mb-4">
                الشهادة/الشواهد الادارية بان العقارات ليست جماعية ولا حبوسية ولا من املاك الدولة و غيرها
             </h4>
             {certificates.filter(c => c.id === 'inheritance_admin_cert').map(cert => (
               <div key={cert.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">مسلمة من</label>
                    <input
                      type="text"
                      value={cert.issuedBy}
                      onChange={(e) => handleCertificateChange(cert.id, 'issuedBy', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">تحت عدد</label>
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
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Law 25/90 Question */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                هل العقار يدخل في اطار القانون 25/90؟
              </label>
              <div className="flex gap-4">
                {['نعم', 'لا'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={law2590 === (option === 'نعم')}
                      onChange={() => setLaw2590(option === 'نعم')}
                    />
                    <span className="font-semibold">{option}</span>
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

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: {state.documentType === 'مقاسمة' ? 'تفاصيل المقاسمة' : 'الثمن والالتزامات'}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3.5: تفاصيل المقاسمة
  // ============================================================================

