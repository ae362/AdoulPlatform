import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PropertyDetails, TitleDocumentDetails, OwnershipCertificateDetails, PropertyType } from '../../../types/feesAgentTypes';
import { createEmptyProperty, createEmptyTitleDocument } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar,
  Building2, Layers, Navigation, Map, Compass, FileCheck2, Landmark,
  ScrollText, Hash, BookOpen, AlertCircle, Info, ArrowRight, Trash2, CheckCircle2, Award,
  Percent, Home, Key, FileSignature, Check, Sparkles, CreditCard, Scale
} from 'lucide-react';

export const Step2_PropertyDetails: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const [tempProperties, setTempProperties] = useState<PropertyDetails[]>(() => {
      if (state.properties && state.properties.length > 0) {
        return state.properties;
      }
      return [createEmptyProperty()];
    });

    const handlePropertyChange = (index: number, field: keyof PropertyDetails, value: any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempProperties((prev) => {
            const newProperties = [...prev];
            if (newProperties[index]) {
              newProperties[index] = { ...newProperties[index], [field]: fileObj };
            }
            return newProperties;
          });
          setState((prev) => {
            const newProperties = [...(prev.properties || [])];
            if (newProperties[index]) {
              newProperties[index] = { ...newProperties[index], [field]: fileObj };
            }
            return { ...prev, properties: newProperties };
          });
        };
        reader.readAsDataURL(value);
        return;
      }
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[index] = { ...newProperties[index], [field]: value };
        if (newProperties[index]) {
          newProperties[index] = { ...newProperties[index], [field]: value };
        }
        return newProperties;
      });
      setState((prev) => {
        const newProperties = [...(prev.properties || [])];
        if (newProperties[index]) {
          newProperties[index] = { ...newProperties[index], [field]: value };
        }
        return { ...prev, properties: newProperties };
      });
    };

    const handleDimensionChange = (index: number, field: 'length_m' | 'width_m', value: string) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        const numeric = value === '' ? undefined : Number.parseFloat(value);
        const nextProp = {
          ...newProperties[index],
          [field]: Number.isNaN(numeric as number) ? undefined : numeric,
        };
        if (nextProp.length_m && nextProp.width_m) {
          nextProp.area_m2 = Number((nextProp.length_m * nextProp.width_m).toFixed(2));
        }
        newProperties[index] = nextProp;
        return newProperties;
      });
    };

    const handleBoundaryChange = (index: number, side: keyof PropertyDetails['boundaries'], value: string) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[index] = {
          ...newProperties[index],
          boundaries: {
            ...newProperties[index].boundaries,
            [side]: value,
          },
        };
        return newProperties;
      });
    };

    const handleCoordinateChange = (propIndex: number, coordIndex: number, field: 'lat' | 'lng', value: string) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        const numeric = value === '' ? 0 : Number.parseFloat(value);
        const newCoordinates = [...newProperties[propIndex].coordinates];
        newCoordinates[coordIndex] = {
          ...newCoordinates[coordIndex],
          [field]: Number.isNaN(numeric) ? 0 : numeric,
        };
        newProperties[propIndex] = { ...newProperties[propIndex], coordinates: newCoordinates };
        return newProperties;
      });
    };

    const addCoordinate = (propIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          coordinates: [...newProperties[propIndex].coordinates, { lat: 0, lng: 0 }],
        };
        return newProperties;
      });
    };

    const removeCoordinate = (propIndex: number, coordIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          coordinates: newProperties[propIndex].coordinates.filter((_, i) => i !== coordIndex),
        };
        return newProperties;
      });
    };

    const handleTitleDocumentChange = (propIndex: number, docIndex: number, field: keyof TitleDocumentDetails, value: any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempProperties((prev) => {
            const newProperties = [...prev];
            const newDocs = [...(newProperties[propIndex]?.titleDocuments || [])];
            newDocs[docIndex] = { ...newDocs[docIndex], [field]: fileObj };
            newProperties[propIndex] = { ...newProperties[propIndex], titleDocuments: newDocs };
            return newProperties;
          });
          setState((prev) => {
            const newProperties = [...(prev.properties || [])];
            if (newProperties[propIndex]) {
              const newDocs = [...(newProperties[propIndex]?.titleDocuments || [])];
              newDocs[docIndex] = { ...newDocs[docIndex], [field]: fileObj };
              newProperties[propIndex] = { ...newProperties[propIndex], titleDocuments: newDocs };
            }
            return { ...prev, properties: newProperties };
          });
        };
        reader.readAsDataURL(value);
        return;
      }
      setTempProperties((prev) => {
        const newProperties = [...prev];
        const newDocs = [...(newProperties[propIndex]?.titleDocuments || [])];
        newDocs[docIndex] = { ...newDocs[docIndex], [field]: value };
        newProperties[propIndex] = { ...newProperties[propIndex], titleDocuments: newDocs };
        return newProperties;
      });
      setState((prev) => {
        const newProperties = [...(prev.properties || [])];
        if (newProperties[propIndex]) {
          const newDocs = [...(newProperties[propIndex]?.titleDocuments || [])];
          newDocs[docIndex] = { ...newDocs[docIndex], [field]: value };
          newProperties[propIndex] = { ...newProperties[propIndex], titleDocuments: newDocs };
        }
        return { ...prev, properties: newProperties };
      });
    };

    const addTitleDocument = (propIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          titleDocuments: [...newProperties[propIndex].titleDocuments, createEmptyTitleDocument()],
        };
        return newProperties;
      });
    };

    const removeTitleDocument = (propIndex: number, docIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          titleDocuments: newProperties[propIndex].titleDocuments.filter((_, i) => i !== docIndex),
        };
        return newProperties;
      });
    };

    // Ownership Certificate Helpers
    const handleOwnershipCertificateChange = (propIndex: number, certIndex: number, field: keyof OwnershipCertificateDetails, value: any) => {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = String(reader.result || '').split(',').pop() || '';
          const fileObj = {
            name: value.name,
            size: value.size,
            type: value.type || 'application/octet-stream',
            base64: b64,
            file: value,
          };
          setTempProperties((prev) => {
            const newProperties = [...prev];
            const newCerts = [...(newProperties[propIndex]?.ownershipCertificates || [])];
            newCerts[certIndex] = { ...newCerts[certIndex], [field]: fileObj };
            newProperties[propIndex] = { ...newProperties[propIndex], ownershipCertificates: newCerts };
            return newProperties;
          });
          setState((prev) => {
            const newProperties = [...(prev.properties || [])];
            if (newProperties[propIndex]) {
              const newCerts = [...(newProperties[propIndex]?.ownershipCertificates || [])];
              newCerts[certIndex] = { ...newCerts[certIndex], [field]: fileObj };
              newProperties[propIndex] = { ...newProperties[propIndex], ownershipCertificates: newCerts };
            }
            return { ...prev, properties: newProperties };
          });
        };
        reader.readAsDataURL(value);
        return;
      }
      setTempProperties((prev) => {
        const newProperties = [...prev];
        const newCerts = [...(newProperties[propIndex]?.ownershipCertificates || [])];
        newCerts[certIndex] = { ...newCerts[certIndex], [field]: value };
        newProperties[propIndex] = { ...newProperties[propIndex], ownershipCertificates: newCerts };
        return newProperties;
      });
      setState((prev) => {
        const newProperties = [...(prev.properties || [])];
        if (newProperties[propIndex]) {
          const newCerts = [...(newProperties[propIndex]?.ownershipCertificates || [])];
          newCerts[certIndex] = { ...newCerts[certIndex], [field]: value };
          newProperties[propIndex] = { ...newProperties[propIndex], ownershipCertificates: newCerts };
        }
        return { ...prev, properties: newProperties };
      });
    };

    const addOwnershipCertificate = (propIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        const currentCerts = newProperties[propIndex].ownershipCertificates || [];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          ownershipCertificates: [...currentCerts, { number: '', date: '', issuedBy: '', file: null }],
        };
        return newProperties;
      });
    };

    const removeOwnershipCertificate = (propIndex: number, certIndex: number) => {
      setTempProperties((prev) => {
        const newProperties = [...prev];
        newProperties[propIndex] = {
          ...newProperties[propIndex],
          ownershipCertificates: (newProperties[propIndex].ownershipCertificates || []).filter((_, i) => i !== certIndex),
        };
        return newProperties;
      });
    };

    const addProperty = () => {
      setTempProperties((prev) => [...prev, createEmptyProperty()]);
    };

    const removeProperty = (index: number) => {
      setTempProperties((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const [inheritanceDescription, setInheritanceDescription] = useState(state.inheritanceDescription || '');

    if ((state.documentType as string) === 'ara' || state.documentType === 'اراثة') {
      return (
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white p-6 shadow-xs">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{(state.documentType as string) === 'حيازة' ? 'الخطوة الثالثة: تفاصيل الحيازة' : 'الخطوة الثالثة: تفاصيل الملكية'}</h2>
            <p className="text-gray-700">أدخل تفاصيل الفريضة أو الوصية.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><ScrollText className="w-3.5 h-3.5 text-violet-500" />بيان فريضة/وصية واجبة/تنزيل/مناسخة</label>
              <textarea
                value={inheritanceDescription}
                onChange={(e) => setInheritanceDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none h-48"
                placeholder="أدخل تفاصيل الفريضة أو الوصية هنا..."
              />
            </div>
          </div>

          <div className="flex gap-4 justify-between">
            <button
              onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-700 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-sm"
            >
              ← السابق
            </button>
            <button
              onClick={() => {
                setState((prev) => ({
                  ...prev,
                  inheritanceDescription,
                  step: 5,
                }));
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black text-sm hover:from-violet-700 hover:to-purple-700 transition-all shadow-md"
            >
              التالي: بيانات الشهود
            </button>
          </div>
        </div>
      );
    }


    return (
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 border border-amber-200">
              <span>🏢</span>
              <span>المرحلة 3 من 8</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              العقار ومحل المعاملة
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>🏛️</span>
            <span>
              {state.documentType?.includes('بيع') || state.documentType?.includes('شراء')
                ? 'الخطوة الثالثة: العقار المبيع والتحفيظ العقاري'
                : (state.documentType as string) === 'حيازة'
                ? 'الخطوة الثالثة: تفاصيل الحيازة'
                : 'الخطوة الثالثة: تفاصيل الملكية والعقار'}
            </span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            أدخل تفاصيل ومواصفات العقار المبيع، حالة التحفيظ (محفظ / غير محفظ / في طور التحفيظ)، والحدود الجغرافية.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{state.documentType === 'هبة' ? 'العقارات الموهوبة' : 'العقارات'}</h3>
                <p className="text-xs text-slate-500 font-medium">{tempProperties.length} عقار مسجل</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 hover:border-violet-400 transition-all shadow-sm" type="button" onClick={addProperty}>
              {state.documentType === 'هبة' ? '+ إضافة عقار موهوب' : '+ إضافة عقار'}
            </button>
          </div>


          {tempProperties.map((property, index) => (
            <div key={index} className="rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-black text-sm">{state.documentType === 'هبة' ? `العقار الموهوب رقم ${index + 1}` : `العقار رقم ${index + 1}`}</span>
                </div>
                {tempProperties.length > 1 && (
                  <button type="button" onClick={() => removeProperty(index)} className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-bold hover:bg-white/10 px-2 py-1 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" /> {state.documentType === 'هبة' ? 'حذف العقار الموهوب' : 'حذف العقار'}
                  </button>
                )}
              </div>
              <div className="p-6 space-y-6">

              {(state.documentType === 'ملكية' || (state.documentType as string) === 'حيازة') ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Building2 className="w-3.5 h-3.5 text-violet-500" />اسم العقار</label>
                      <input
                        type="text"
                        value={property.propertyName || ''}
                        onChange={(e) => handlePropertyChange(index, 'propertyName', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                        placeholder="اسم العقار"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><MapPin className="w-3.5 h-3.5 text-violet-500" />موقعه</label>
                      <input
                        type="text"
                        value={property.location || ''}
                        onChange={(e) => handlePropertyChange(index, 'location', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                        placeholder="موقع العقار"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Map className="w-3.5 h-3.5 text-slate-400" />التابع لعمالة / لاقليم</label>
                    <input
                      type="text"
                      value={property.province || ''}
                      onChange={(e) => handlePropertyChange(index, 'province', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                      placeholder="العمالة أو الإقليم"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                    <Layers className="w-3.5 h-3.5 text-violet-500" />
                    {(state.documentType === 'بيع_وشراء' || state.documentType === 'بيع_وشراء_معنوي' || state.documentType === 'هبة' || state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة' || state.documentType === 'عقد_ايجار_المفضي_الى_تملك') ? 'ما حالة العقار/العقارات محل المعاملة؟' : 'نوع العقار *'}
                  </label>
                  <select
                    value={property.type}
                    onChange={(e) => handlePropertyChange(index, 'type', e.target.value as PropertyType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium bg-white"
                  >
                    {(state.documentType === 'بيع_وشراء' || state.documentType === 'بيع_وشراء_معنوي' || state.documentType === 'هبة' || state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة') ? (
                      <>
                        <option value="غير_محفظ">عقارغير محفظ</option>
                        <option value="محفظ">عقار محفظ</option>
                        <option value="مزيج">مزيج(بعضه محفظ و بعظه غير محفظ)</option>
                      </>
                    ) : (
                      <>
                        <option value="محفظ">محفظ</option>
                        <option value="غير_محفظ">غير محفظ</option>
                        <option value="منقول">منقول</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {property.type !== 'منقول' && (
                <>
                  <div className="space-y-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><Navigation className="w-3.5 h-3.5 text-violet-500" />المساحة والأبعاد (بالمتر)</label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">المساحة (م²)</span>
                        <input
                          type="number"
                          value={property.area_m2 ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handlePropertyChange(index, 'area_m2', val);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">الطول (متر)</span>
                        <input
                          type="number"
                          value={property.length_m ?? ''}
                          onChange={(e) => handleDimensionChange(index, 'length_m', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">العرض (متر)</span>
                        <input
                          type="number"
                          value={property.width_m ?? ''}
                          onChange={(e) => handleDimensionChange(index, 'width_m', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          placeholder="20"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">سيتم احتساب المساحة تلقائياً بعد إدخال الطول والعرض.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-2xl border border-violet-100">
                      <Compass className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-black text-slate-800">الحدود الجغرافية *</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {['north', 'south', 'east', 'west'].map((side) => (
                        <div key={side} className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <span className={side === 'north' ? 'text-blue-500' : side === 'south' ? 'text-rose-500' : side === 'east' ? 'text-emerald-500' : 'text-amber-500'}>◆</span>
                            <span>{side === 'north' && 'الشمال'}{side === 'south' && 'الجنوب'}{side === 'east' && 'الشرق'}{side === 'west' && 'الغرب'}</span>
                          </label>
                          <input
                            type="text"
                            value={property.boundaries[side as keyof typeof property.boundaries]}
                            onChange={(e) => handleBoundaryChange(index, side as any, e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-xs font-medium"
                            placeholder={side === 'north' ? 'مثال: شارع النيل' : ''}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><Navigation className="w-3.5 h-3.5 text-violet-500" />الإحداثيات الجغرافية (اختياري)</label>
                      <button
                        type="button"
                        onClick={() => addCoordinate(index)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all shadow-xs"
                      >
                        <Plus className="w-3 h-3" /> إضافة إحداثيات
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {property.coordinates.map((coord, coordIdx) => (
                        <div key={coordIdx} className="flex gap-4 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-200">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <input
                              type="number"
                              step="any"
                              value={coord.lat || ''}
                              onChange={(e) => handleCoordinateChange(index, coordIdx, 'lat', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              placeholder={`خط العرض ${coordIdx + 1}`}
                            />
                            <input
                              type="number"
                              step="any"
                              value={coord.lng || ''}
                              onChange={(e) => handleCoordinateChange(index, coordIdx, 'lng', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-xs font-medium"
                              placeholder={`خط الطول ${coordIdx + 1}`}
                            />
                          </div>
                          {property.coordinates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCoordinate(index, coordIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {((state.documentType !== 'بيع_وشراء' && state.documentType !== 'بيع_وشراء_معنوي' && state.documentType !== 'هبة') || property.type === 'غير_محفظ' || property.type === 'مزيج') && (
                  <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-violet-600" />
                        <h5 className="font-black text-sm text-slate-800">{(state.documentType as string) === 'حيازة' ? 'تفاصيل سند الحيازة' : 'تفاصيل سند الملكية'}</h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => addTitleDocument(index)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white text-violet-700 border border-violet-200 hover:bg-violet-50 transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة سند
                      </button>
                    </div>
                    
                    {property.titleDocuments.map((doc, docIndex) => (
                      <div key={docIndex} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center">
                              <Hash className="w-3.5 h-3.5 text-violet-600" />
                            </div>
                            <span className="text-xs font-black text-slate-800">السند رقم {docIndex + 1}</span>
                          </div>
                          {property.titleDocuments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTitleDocument(index, docIndex)}
                              className="flex items-center gap-1 text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3 h-3" /> حذف
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-violet-500" />نوع الرسم</label>
                          <input
                            type="text"
                            value={doc.feeType || ''}
                            onChange={(e) => handleTitleDocumentChange(index, docIndex, 'feeType', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            placeholder="مثال: رسم عقاري، مطلب تحفيظ..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Book className="w-3.5 h-3.5 text-slate-400" />ضمن بدفتر/ سجل البيانات</label>
                            <input
                              type="text"
                              value={doc.bookReference || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'bookReference', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم</label>
                            <input
                              type="text"
                              value={doc.number || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'number', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />حرف (اختياري)</label>
                            <input
                              type="text"
                              value={doc.letter || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'letter', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />صحيفة</label>
                            <input
                              type="text"
                              value={doc.page || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'page', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileCheck className="w-3.5 h-3.5 text-slate-400" />عدد</label>
                            <input
                              type="text"
                              value={doc.count || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'count', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                            <input
                              type="date"
                              value={doc.date || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'date', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />موافق</label>
                            <input
                              type="text"
                              value={doc.correspondingDate || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'correspondingDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="التاريخ الموافق"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-violet-50/60 rounded-2xl border border-violet-100 space-y-3">
                          <label className="block text-xs font-bold text-slate-700">
                            هل لسند الملك مراجع التسجيل و التمبر؟
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {['نعم', 'لا'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleTitleDocumentChange(index, docIndex, 'hasRegistrationReferences', option)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                  doc.hasRegistrationReferences === option
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300 hover:text-violet-700'
                                }`}
                              >
                                {doc.hasRegistrationReferences === option ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {option}
                              </button>
                            ))}
                          </div>

                          {doc.hasRegistrationReferences === 'نعم' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-violet-100">
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Landmark className="w-3.5 h-3.5 text-slate-400" />المسجل بمالية</label>
                                <input
                                  type="text"
                                  value={doc.registeredAt || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'registeredAt', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم الايداع / الوصل</label>
                                <input
                                  type="text"
                                  value={doc.depositNumber || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'depositNumber', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />بتاريخ</label>
                                <input
                                  type="date"
                                  value={doc.depositDate || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'depositDate', e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {!['ara' as any, 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType) && (
                        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-3">
                          <label className="block text-xs font-bold text-slate-700">
                            {(state.documentType as string) === 'حيازة' ? 'هل هناك شروط او ملاحظات في هذه الحيازة ؟' : 'هل هناك شروط او ملاحظات في هذا البيع ؟'}
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {['نعم', 'لا'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleTitleDocumentChange(index, docIndex, 'hasNotes', option)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                  doc.hasNotes === option
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                                }`}
                              >
                                {doc.hasNotes === option ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {option}
                              </button>
                            ))}
                          </div>

                          {doc.hasNotes === 'نعم' && (
                            <div className="pt-3 border-t border-amber-100">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><FileText className="w-3.5 h-3.5 text-slate-400" />الملاحظات / الشروط</label>
                              <textarea
                                value={doc.notes || ''}
                                onChange={(e) => handleTitleDocumentChange(index, docIndex, 'notes', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                                rows={3}
                                placeholder="أدخل الشروط أو الملاحظات هنا..."
                              />
                            </div>
                          )}
                        </div>
                        )}

                        {(state.documentType === 'ملكية' || (state.documentType as string) === 'حيازة') && (
                          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><Clock className="w-3.5 h-3.5 text-violet-500" />{(state.documentType as string) === 'حيازة' ? 'مدة الحيازة' : 'مدة التملك'}</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">السنوات</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={property.ownershipDurationYears ?? ''}
                                  onChange={(e) => handlePropertyChange(index, 'ownershipDurationYears', parseInt(e.target.value) || 0)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                  placeholder="عدد السنوات"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">الأشهر</label>
                                <select
                                  value={property.ownershipDurationMonths ?? 0}
                                  onChange={(e) => handlePropertyChange(index, 'ownershipDurationMonths', parseInt(e.target.value) || 0)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                >
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>{i} شهر</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {((property.ownershipDurationYears || 0) < 10) && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <span>تنبيه: عدم استيفاء المدة القانونية للحيازة</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            صورة السند (اختياري)
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleTitleDocumentChange(index, docIndex, 'file', e.target.files?.[0] || null)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all"
                          />
                          {doc.file && (
                            <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                              <span className="truncate font-bold flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                <span>تم إرفاق: {(doc.file as any)?.name || 'صورة السند'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTitleDocumentChange(index, docIndex, 'file', null)}
                                className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                title="حذف المرفق"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  {(state.documentType === 'بيع_وشراء' || state.documentType === 'بيع_وشراء_معنوي' || state.documentType === 'هبة' || state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة') && (property.type === 'محفظ' || property.type === 'مزيج') && (
                    <div className="space-y-4 p-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-2xl border border-emerald-100 mt-4">
                      <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <h5 className="font-black text-sm text-slate-800">شهادة الملكية</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => addOwnershipCertificate(index)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> إضافة شهادة
                        </button>
                      </div>
                      
                      {(property.ownershipCertificates || []).map((cert, certIndex) => (
                        <div key={certIndex} className="p-5 bg-white rounded-2xl border border-emerald-100 shadow-xs relative space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <span className="text-xs font-black text-slate-800">الشهادة رقم {certIndex + 1}</span>
                            </div>
                            {(property.ownershipCertificates || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOwnershipCertificate(index, certIndex)}
                                className="flex items-center gap-1 text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-3 h-3" /> حذف
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Hash className="w-3.5 h-3.5 text-slate-400" />رقم الشهادة</label>
                              <input
                                type="text"
                                value={cert.number || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'number', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />تاريخ الاصدار</label>
                              <input
                                type="date"
                                value={cert.date || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'date', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><Landmark className="w-3.5 h-3.5 text-emerald-500" />الصادرة عن المحافظة العقارية ب</label>
                              <input
                                type="text"
                                value={cert.issuedBy || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'issuedBy', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                              <Upload className="w-3.5 h-3.5 text-slate-400" />
                              رفع صورة الشهادة
                            </label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'file', e.target.files?.[0] || null)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-medium focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all"
                            />
                            {cert.file && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl">
                                <span className="truncate font-bold flex items-center gap-1.5">
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>تم إرفاق: {(cert.file as any)?.name || 'صورة الشهادة'}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOwnershipCertificateChange(index, certIndex, 'file', null)}
                                  className="text-rose-500 hover:text-rose-700 font-black px-2 py-0.5 rounded-lg hover:bg-rose-50 transition"
                                  title="حذف المرفق"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {(!property.ownershipCertificates || property.ownershipCertificates.length === 0) && (
                         <div className="text-center py-4 text-slate-500 text-xs font-medium">
                           اضغط على "إضافة شهادة" لإدخال بيانات شهادة الملكية
                         </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Shield className="w-3.5 h-3.5 text-rose-500" />
                      هل هناك حقوق للغير أو رهون أو إيقافات؟
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['نعم', 'لا'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handlePropertyChange(index, 'hasThirdPartyRights', option)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            property.hasThirdPartyRights === option
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-700'
                          }`}
                        >
                          {property.hasThirdPartyRights === option ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {option}
                        </button>
                      ))}
                    </div>
                    {property.hasThirdPartyRights === 'نعم' && (
                      <textarea
                        value={property.thirdPartyDetails || ''}
                        onChange={(e) => handlePropertyChange(index, 'thirdPartyDetails', e.target.value)}
                        className="w-full mt-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                        placeholder="وضّح نوع الحقوق والتفاصيل..."
                        rows={3}
                      />
                    )}
                  </div>

                  {/* ========== CONSTRUCTION PROPERTY SPECIFIC FIELDS ========== */}
                  {(state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي') && (
                    <div className="space-y-6 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-6 rounded-2xl border border-amber-200/90 shadow-xs">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-amber-200/80">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700 shadow-2xs">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-amber-950">المرحلة الأولى: عقد البيع الابتدائي – المتطلبات الخاصة</h4>
                          <p className="text-xs font-medium text-amber-800/80 mt-0.5">المقتضيات القانونية والتقنية الخاصة ببيع العقارات في طور الإنجاز (VEFA - المادة 618)</p>
                        </div>
                      </div>
                      
                      {/* Building Permit Section */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <FileCheck2 className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-slate-800">د – رخصة البناء</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>رقم الرخصة</span>
                            </label>
                            <input
                              type="text"
                              value={property.buildingPermitNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم الرخصة"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>تاريخ الإصدار</span>
                            </label>
                            <input
                              type="date"
                              value={property.buildingPermitIssueDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitIssueDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Landmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>الجهة المصدرة</span>
                            </label>
                            <input
                              type="text"
                              value={property.buildingPermitIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="البلدية / الجماعة"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Foundations Certificate Section */}
                      <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-rose-100">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-rose-900">ط – شهادة الأساسات (إلزامي)</h5>
                          </div>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            مطلب قانوني إلزامي
                          </span>
                        </div>
                        <p className="text-xs font-medium text-rose-800/80 mb-3.5">
                          شرط قانوني لإبرام العقد الابتدائي - يجب تسلمها من المهندس المعماري أو مكتب الدراسات المختص
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-rose-400" />
                              <span>رقم الشهادة</span>
                            </label>
                            <input
                              type="text"
                              value={property.foundationsCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم شهادة الأساسات"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-400" />
                              <span>التاريخ</span>
                            </label>
                            <input
                              type="date"
                              value={property.foundationsCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                              <span>الصادرة عن (المهندس)</span>
                            </label>
                            <input
                              type="text"
                              value={property.foundationsCertificateIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="اسم المهندس / مكتب الدراسات"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Property Details & Specifications Section */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Layers className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-slate-800">ج – العقار محل البيع – التفاصيل والمواصفات</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>العنوان / التسمية</span>
                            </label>
                            <input
                              type="text"
                              value={property.propertyName || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyName', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="اسم/رقم العقار"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Compass className="w-3.5 h-3.5 text-slate-400" />
                              <span>المساحة (م²)</span>
                            </label>
                            <input
                              type="number"
                              value={property.area_m2 || ''}
                              onChange={(e) => handlePropertyChange(index, 'area_m2', parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="500"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>الطابق</span>
                            </label>
                            <input
                              type="number"
                              value={property.floor || ''}
                              onChange={(e) => handlePropertyChange(index, 'floor', parseInt(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>التجزيء</span>
                            </label>
                            <input
                              type="text"
                              value={property.subdivision || ''}
                              onChange={(e) => handlePropertyChange(index, 'subdivision', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم التجزيء"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Home className="w-3.5 h-3.5 text-slate-400" />
                              <span>المحتويات والملحقات</span>
                            </label>
                            <input
                              type="text"
                              value={property.propertyContents || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyContents', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: مرآب + قبو + شرفة"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>المواصفات الهندسية والمعمارية</span>
                          </label>
                          <textarea
                            value={property.engineeringSpecifications || ''}
                            onChange={(e) => handlePropertyChange(index, 'engineeringSpecifications', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                            placeholder="تفاصيل المواصفات الهندسية والمواد المستخدمة..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Payment Stages Management Section */}
                      <div className="rounded-xl border border-teal-200/90 bg-teal-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-teal-100">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <h5 className="text-xs font-black text-teal-950">3️⃣ آلية الأداء والأقساط (المرتبطة بمراحل البناء)</h5>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100/70 text-teal-800">
                            مراحل الإنجاز
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mb-3.5">
                          ربط كل أداء بشهادة تقدم الأشغال (certificat d'avancement) وضمان الإتمام البنكي أو التأميني
                        </p>
                        <div className="space-y-3">
                          {(property.paymentStages || []).map((stage, stageIndex) => (
                            <div key={stageIndex} className="p-3.5 bg-white rounded-xl border border-teal-200/80 shadow-2xs relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  const newStages = property.paymentStages?.filter((_, i) => i !== stageIndex) || [];
                                  handlePropertyChange(index, 'paymentStages', newStages);
                                }}
                                className="absolute top-2.5 left-2.5 w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                                title="حذف المرحلة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم المرحلة</label>
                                  <input
                                    type="number"
                                    value={stage.stage || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, stage: parseInt(e.target.value) || 0 };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none text-slate-800 text-xs font-medium"
                                    placeholder="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">وصف المرحلة</label>
                                  <input
                                    type="text"
                                    value={stage.description || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, description: e.target.value };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none text-slate-800 text-xs font-medium"
                                    placeholder="الأساسات، الهيكل الخارجي، إلخ"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">النسبة %</label>
                                  <input
                                    type="number"
                                    value={stage.percentage || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, percentage: parseFloat(e.target.value) || 0 };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none text-slate-800 text-xs font-medium"
                                    placeholder="35"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الاستحقاق</label>
                                  <input
                                    type="date"
                                    value={stage.dueDate || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, dueDate: e.target.value };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none text-slate-800 text-xs font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newStages = [...(property.paymentStages || []), { stage: (property.paymentStages?.length || 0) + 1, description: '', percentage: 0 }];
                              handlePropertyChange(index, 'paymentStages', newStages);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-400 bg-teal-50/40 hover:bg-teal-50 text-teal-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة مرحلة أداء جديدة</span>
                          </button>
                        </div>
                        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                            تذكير: القانون المغربي (المادة 618-6) يربط أداء الأقساط بمراحل الأشغال الفعلية المثبتة بشهادة من المهندس المشرف، لضمان توازن الالتزامات وحماية أموال المشتري.
                          </p>
                        </div>
                      </div>

                      {/* Technical Documents Section */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-2 pb-2.5 border-b border-slate-100">
                          <ScrollText className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-slate-800">ح – التصاميم والوثائق التقنية</h5>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mb-3.5">الملفات التقنية الواجب إرفاقها بالعقد الابتدائي:</p>
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                              <span>التصاميم المعمارية المصادق عليها</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'architecturalPlansFile', e.target.files?.[0] || null)}
                              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                            />
                            {property.architecturalPlansFile && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg">
                                <span className="truncate">📎 {(property.architecturalPlansFile as any)?.name || 'التصاميم المعمارية'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'architecturalPlansFile', null)} className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer">✕</button>
                              </div>
                            )}
                          </div>
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                              <span>تصاميم الإسمنت المسلح (Béton Armé)</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'concreteDesignFile', e.target.files?.[0] || null)}
                              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                            />
                            {property.concreteDesignFile && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg">
                                <span className="truncate">📎 {(property.concreteDesignFile as any)?.name || 'تصاميم الإسمنت'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'concreteDesignFile', null)} className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer">✕</button>
                              </div>
                            )}
                          </div>
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                              <span>دفتر التحملات (Cahier des charges)</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'specificationBookletFile', e.target.files?.[0] || null)}
                              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                            />
                            {property.specificationBookletFile && (
                              <div className="mt-2 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg">
                                <span className="truncate">📎 {(property.specificationBookletFile as any)?.name || 'دفتر التحملات'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'specificationBookletFile', null)} className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer">✕</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Terms */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-slate-800">و – أجل التسليم والغرامات</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>تاريخ التسليم المتفق عليه</span>
                            </label>
                            <input
                              type="date"
                              value={property.deliveryDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'deliveryDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>غرامات التأخير (بالدرهم أو النسبة)</span>
                            </label>
                            <input
                              type="text"
                              value={property.delayPenalties || ''}
                              onChange={(e) => handlePropertyChange(index, 'delayPenalties', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 1% شهرياً عن كل شهر تأخير"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seller Commitments */}
                      <div className="rounded-xl border border-purple-200/90 bg-purple-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-purple-100">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          <h5 className="text-xs font-black text-purple-950">ي – تعهد البائع بالالتزامات التالية:</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { key: 'respectDesigns', label: 'احترام التصاميم المصادق عليها' },
                            { key: 'respectSchedule', label: 'احترام الجدول الزمني للأشغال' },
                            { key: 'respectSpecifications', label: 'احترام بنود دفتر التحملات' },
                          ].map((item) => {
                            const isChecked = !!property.sellerCommitments?.[item.key as keyof typeof property.sellerCommitments];
                            return (
                              <label
                                key={item.key}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-purple-100/70 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handlePropertyChange(index, 'sellerCommitments', {
                                    ...property.sellerCommitments,
                                    [item.key]: e.target.checked,
                                  })}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/20"
                                />
                                <span className="text-xs">{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Guarantees/Insurance Section */}
                      <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-indigo-100">
                          <Shield className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-black text-indigo-950">ز – الضمانات البنكية والتأمينات</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Landmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>نوع الضمان</span>
                            </label>
                            <select
                              value={property.guaranteeType || ''}
                              onChange={(e) => handlePropertyChange(index, 'guaranteeType', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">اختر نوع الضمان</option>
                              <option value="بنكية">ضمانة بنكية (Caution bancaire)</option>
                              <option value="تأمين">عقد تأمين (Assurance)</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>مرجع عقد التأمين/الضمان</span>
                            </label>
                            <input
                              type="text"
                              value={property.insuranceContractRef || ''}
                              onChange={(e) => handlePropertyChange(index, 'insuranceContractRef', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم العقد أو المرجع"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>مدة تغطية الضمانة</span>
                            </label>
                            <input
                              type="text"
                              value={property.guaranteeCoveragePeriod || ''}
                              onChange={(e) => handlePropertyChange(index, 'guaranteeCoveragePeriod', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: سنتان من تاريخ التوقيع"
                            />
                          </div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-200 bg-white">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>رفع وثيقة الضمان البنكي / التأمين (اختياري)</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'guaranteeFile', e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Boundaries Section (for unregistered properties) */}
                      {property.type === 'غير_محفظ' && (
                        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-emerald-100">
                            <Compass className="w-4 h-4 text-emerald-600" />
                            <h5 className="text-xs font-black text-emerald-950">الحدود (عقار غير محفظ)</h5>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['north', 'south', 'east', 'west'].map((side) => (
                              <div key={side}>
                                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                                  {side === 'north' && 'الشمال'}
                                  {side === 'south' && 'الجنوب'}
                                  {side === 'east' && 'الشرق'}
                                  {side === 'west' && 'الغرب'}
                                </label>
                                <input
                                  type="text"
                                  value={property.boundaries[side as keyof typeof property.boundaries]}
                                  onChange={(e) => handleBoundaryChange(index, side as any, e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none text-slate-800 text-xs font-medium"
                                  placeholder={side === 'north' ? 'مثال: طريق معبد' : ''}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Provisional Registration Warning (for registered properties) */}
                      {property.type === 'محفظ' && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-2xs flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs font-black text-amber-950">تنبيه قانوني - التقييد الاحتياطي (المادة 618-11)</h5>
                            <p className="text-xs text-amber-900 leading-relaxed font-medium">
                              إذا كان العقار محفظاً أو في طور التحفيظ، يحق للمشتري إجراء تقييد احتياطي لحفظ رتبته وحماية حقوقه بمجرد إبرام عقد البيع الابتدائي، ويتعين تضمين العقد موافقة صريحة على هذا الإجراء.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Important Warnings */}
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1.5 text-xs text-rose-950 font-medium">
                          <h5 className="text-xs font-black text-rose-900">تنبيهات وضوابط قانونية إلزامية (المادة 618):</h5>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 list-none">
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>لا يمكن إبرام العقد الابتدائي قبل انتهاء الأساسات (المادة 618-3)</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>البيع الابتدائي عقد كامل الأركان وليس مجرد وعد بالبيع</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>إلزامية إرفاق دفتر التحملات والتصاميم الهندسية</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>التأخر في التسليم يخول للمشتري المطالبة بغرامات التأخير القانونية</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========== FINAL CONTRACT SPECIFIC FIELDS ========== */}
                  {state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' && (
                    <div className="space-y-6 bg-gradient-to-br from-teal-50/60 via-white to-teal-50/30 p-6 rounded-2xl border border-teal-200/90 shadow-xs">
                      {/* Header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-teal-200/80">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-700 shadow-2xs">
                          <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-teal-950">المرحلة الثانية: العقد النهائي – المتطلبات الخاصة</h4>
                          <p className="text-xs font-medium text-teal-800/80 mt-0.5">نقل الملكية النهائي بعد إتمام البناء وصدور رخصة السكن وشهادة المطابقة</p>
                        </div>
                      </div>

                      {/* Preliminary Contract References */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <FileText className="w-4 h-4 text-teal-600" />
                          <h5 className="text-xs font-black text-slate-800">ب – مراجع العقد الابتدائي (إلزامي للتطابق)</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>تاريخ العقد الابتدائي</span>
                            </label>
                            <input
                              type="date"
                              value={property.preliminaryContractDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>رقم التسجيل</span>
                            </label>
                            <input
                              type="text"
                              value={property.preliminaryContractNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم تسجيل العقد الابتدائي"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>اسم الموثق / العدل محرر العقد</span>
                            </label>
                            <input
                              type="text"
                              value={property.preliminaryContractNotary || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractNotary', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="اسم المهني محرر العقد الابتدائي"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>مراجع الأداءات السابقة</span>
                            </label>
                            <input
                              type="text"
                              value={property.preliminaryPaymentReferences || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryPaymentReferences', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 150,000 درهم بموجب شيك رقم..."
                            />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                              <span>مراجع الضمانة البنكية السابقة</span>
                            </label>
                            <input
                              type="text"
                              value={property.preliminaryGuaranteeReferences || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryGuaranteeReferences', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم وثيقة الضمان ومرجعها البنكي"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Building Completion Certificate */}
                      <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-rose-100">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-rose-900">و – رخصة السكن / شهادة المطابقة (شرط جوهري)</h5>
                          </div>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            مانع قانوني بدونها
                          </span>
                        </div>
                        <p className="text-xs font-medium text-rose-800/80 mb-3.5">
                          بدون هذه الشهادة لا يمكن إبرام العقد النهائي أو نقل الملكية العقارية نهائياً (المادة 618-19)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-rose-400" />
                              <span>رقم الشهادة</span>
                            </label>
                            <input
                              type="text"
                              value={property.occupancyCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم رخصة السكن"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-400" />
                              <span>تاريخ الإصدار</span>
                            </label>
                            <input
                              type="date"
                              value={property.occupancyCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Landmark className="w-3.5 h-3.5 text-rose-400" />
                              <span>الجهة المصدرة</span>
                            </label>
                            <input
                              type="text"
                              value={property.occupancyCertificateIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateIssuedBy', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="البلدية / الجماعة"
                            />
                          </div>
                        </div>
                        <div className="mb-3.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>هل المبنى مطابق للتصاميم المعمارية المرخصة؟</span>
                          </label>
                          <div className="flex gap-2.5 mb-2.5">
                            {['نعم', 'لا'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handlePropertyChange(index, 'isConstructionCompliant', option)}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  property.isConstructionCompliant === option
                                    ? option === 'نعم'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {option === 'نعم' ? 'نعم - مطابق تماماً للتصاميم' : 'لا - توجد اختلافات وملاحظات'}
                              </button>
                            ))}
                          </div>
                          {property.isConstructionCompliant === 'لا' && (
                            <textarea
                              value={property.complianceNotes || ''}
                              onChange={(e) => handlePropertyChange(index, 'complianceNotes', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                              placeholder="وضّح طبيعة التغييرات أو الاختلافات عن التصاميم..."
                              rows={2}
                            />
                          )}
                        </div>
                        <div className="p-3 rounded-xl border border-rose-200/80 bg-white">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>رفع نسخة من شهادة السكن / المطابقة</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'occupancyCertificateFile', e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-100 file:text-rose-800 hover:file:bg-rose-200 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Final Title Deed Details */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Landmark className="w-4 h-4 text-teal-600" />
                          <h5 className="text-xs font-black text-slate-800">ج – سند التملك النهائي</h5>
                        </div>
                        <div className="mb-3.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            <span>نوع السند</span>
                          </label>
                          <select
                            value={property.finalTitleType || ''}
                            onChange={(e) => handlePropertyChange(index, 'finalTitleType', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          >
                            <option value="">اختر نوع السند</option>
                            <option value="رسم_عقاري">رسم عقاري (Titre foncier)</option>
                            <option value="مطلب_تحفيظ">مطلب تحفيظ (Réquisition)</option>
                            <option value="رسم_ملكية">رسم ملكية عدلي</option>
                            <option value="وثائق_تقنية">وثائق تقنية + مسح طوبوغرافي</option>
                          </select>
                        </div>

                        {(property.finalTitleType === 'رسم_عقاري' || property.finalTitleType === 'رسم_ملكية') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                                <span>رقم الرسم العقاري المفرز</span>
                              </label>
                              <input
                                type="text"
                                value={property.finalTitleNumber || ''}
                                onChange={(e) => handlePropertyChange(index, 'finalTitleNumber', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 54321/01"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                                <span>الرقم العقاري الأم</span>
                              </label>
                              <input
                                type="text"
                                value={property.parentTitleNumber || ''}
                                onChange={(e) => handlePropertyChange(index, 'parentTitleNumber', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 12345/01"
                              />
                            </div>
                          </div>
                        )}

                        {(property.type === 'محفظ' || property.type === 'مزيج') && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">بيانات التحملات العقارية</label>
                              <textarea
                                value={property.chargesDetails || ''}
                                onChange={(e) => handlePropertyChange(index, 'chargesDetails', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                rows={2}
                                placeholder="التحملات العقارية المقيدة بالرسم..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">الارتفاقات والتحملات المشتركة</label>
                              <textarea
                                value={property.encumbrances || ''}
                                onChange={(e) => handlePropertyChange(index, 'encumbrances', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                rows={2}
                                placeholder="ارتفاقات المرور أو المجاري أو المشتركات..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">التقييدات والرهون السابقة</label>
                              <textarea
                                value={property.previousRegistrations || ''}
                                onChange={(e) => handlePropertyChange(index, 'previousRegistrations', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                rows={2}
                                placeholder="التقييدات والرهون السابقة وتاريخ رفعها..."
                              />
                            </div>
                          </div>
                        )}

                        {property.type === 'غير_محفظ' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">المستندات الفنية</label>
                              <textarea
                                value={property.technicalDocuments || ''}
                                onChange={(e) => handlePropertyChange(index, 'technicalDocuments', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                rows={2}
                                placeholder="المستندات الفنية المعتمدة..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل المسح الطوبوغرافي</label>
                              <textarea
                                value={property.surveyDetails || ''}
                                onChange={(e) => handlePropertyChange(index, 'surveyDetails', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                rows={2}
                                placeholder="تفاصيل ونتائج المسح الطوبوغرافي..."
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Property Usage */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Home className="w-4 h-4 text-teal-600" />
                          <h5 className="text-xs font-black text-slate-800">د – العقار محل التفويت والملحقات</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>التخصيص (الاستخدام)</span>
                            </label>
                            <select
                              value={property.propertyUsage || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyUsage', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">اختر التخصيص</option>
                              <option value="سكني">سكني</option>
                              <option value="مهني">مهني</option>
                              <option value="تجاري">تجاري</option>
                              <option value="مختلط">مختلط</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              <span>محتويات العقار وملحقاته</span>
                            </label>
                            <input
                              type="text"
                              value={property.propertyContents || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyContents', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: مرآب رقم 5 + قبو رقم 3"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Final Payment Details */}
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-emerald-100">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-xs font-black text-emerald-950">ز – الثمن النهائي وتصفية الحسابات</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>الثمن الإجمالي (درهم)</span>
                            </label>
                            <input
                              type="number"
                              value={property.totalFinalPrice || ''}
                              onChange={(e) => handlePropertyChange(index, 'totalFinalPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>الأداءات السابقة (درهم)</span>
                            </label>
                            <input
                              type="number"
                              value={property.previousPayments || ''}
                              onChange={(e) => handlePropertyChange(index, 'previousPayments', parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>المبالغ المتبقية (تلقائي)</span>
                            </label>
                            <input
                              type="number"
                              value={property.remainingAmount || ''}
                              onChange={(e) => handlePropertyChange(index, 'remainingAmount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 outline-none text-slate-800 text-sm font-bold cursor-not-allowed"
                              readOnly
                              title="يُحسب تلقائياً"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>بيانات الإبراءات والإيصالات البنكية</span>
                          </label>
                          <textarea
                            value={property.bankReceiptsDetails || ''}
                            onChange={(e) => handlePropertyChange(index, 'bankReceiptsDetails', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                            placeholder="مراجع الإيصالات والشيكات والتحويلات البنكية المتبادلة..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Bank Clearance Certificate */}
                      <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-200">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <h5 className="text-xs font-black text-amber-950">4️⃣ شهادة الإبراء من الضمانة البنكية (Mainlevée)</h5>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            حماية الملكية
                          </span>
                        </div>
                        <p className="text-xs font-medium text-amber-900/80 mb-3.5">
                          غياب شهادة الإبراء أو رفع اليد البنكية يشكل خطراً كبيراً على انتقال الملكية خالية من الرهون
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>رقم شهادة الإبراء</span>
                            </label>
                            <input
                              type="text"
                              value={property.bankClearanceCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="رقم شهادة الإبراء"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>تاريخ الإبراء</span>
                            </label>
                            <input
                              type="date"
                              value={property.bankClearanceCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateDate', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Landmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>نوع الضمان السابق</span>
                            </label>
                            <select
                              value={property.bankClearanceGuaranteeType || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceGuaranteeType', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">اختر النوع</option>
                              <option value="بنكية">ضمانة بنكية</option>
                              <option value="تأمين">تأمين</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>مدة التغطية السابقة</span>
                            </label>
                            <input
                              type="text"
                              value={property.bankClearanceCoveragePeriod || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCoveragePeriod', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: من 01/01/2024 إلى 31/12/2025"
                            />
                          </div>
                        </div>
                        <div className="p-3 rounded-xl border border-amber-200 bg-white">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>رفع وثيقة شهادة الإبراء / رفع اليد</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateFile', e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Delivery Details */}
                      <div className="rounded-xl border border-purple-200/90 bg-purple-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-purple-100">
                          <FileCheck className="w-4 h-4 text-purple-600" />
                          <h5 className="text-xs font-black text-purple-950">ح – محضر التسليم والامتثال</h5>
                        </div>
                        <div className="space-y-3 mb-3.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">حالة العقار عند التسليم</label>
                            <textarea
                              value={property.deliveryCondition || ''}
                              onChange={(e) => handlePropertyChange(index, 'deliveryCondition', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                              placeholder="وصف دقيق لحالة العقار عند تسليمه للمشتري..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات تقنية أثناء التسليم</label>
                            <textarea
                              value={property.technicalObservations || ''}
                              onChange={(e) => handlePropertyChange(index, 'technicalObservations', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                              placeholder="أي عيوب أو تحفظات أو ملاحظات تقنية تم رصدها..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات امتثال دفتر التحملات</label>
                            <textarea
                              value={property.specificationComplianceNotes || ''}
                              onChange={(e) => handlePropertyChange(index, 'specificationComplianceNotes', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                              placeholder="هل تم احترام بنود ومواصفات دفتر التحملات بالكامل؟"
                              rows={2}
                            />
                          </div>
                        </div>
                        <div className="p-3 rounded-xl border border-purple-200 bg-white">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>رفع محضر التسليم (Procès-verbal de livraison)</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'deliveryReportFile', e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Final Contract Warnings */}
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1.5 text-xs text-rose-950 font-medium">
                          <h5 className="text-xs font-black text-rose-900">تنبيهات وضوابط قانونية للعقد النهائي:</h5>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 list-none">
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>لا يتم تحرير العقد النهائي إلا بعد تسلم شهادة السكن والمطابقة</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>إلزامية إفراز الرسوم العقارية للحصص المبيعة</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>أي اختلاف بين التصاميم والمبني يفتح باب المسؤولية التعاقدية</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>إلزامية رفع اليد والشهادة البنكية لضمان سلامة نقل الملكية</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========== SHARED PROPERTY PURCHASE (رسم شراء في الملكية المشتركة) ========== */}
                  {state.documentType === 'بيع_وشراء_ملكية_مشتركة' && (
                    <div className="space-y-6 bg-gradient-to-br from-sky-50/60 via-white to-sky-50/30 p-6 rounded-2xl border border-sky-200/90 shadow-xs">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-sky-200/80">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-700 shadow-2xs">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-sky-950">رسم شراء في الملكية المشتركة (Loi 18-00)</h4>
                          <p className="text-xs font-medium text-sky-800/80 mt-0.5">المقتضيات القانونية الخاصة بالعقارات الخاضعة لنظام الملكية المشتركة للعقارات المبنية</p>
                        </div>
                      </div>

                      {/* Section B: Property Classification */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Building2 className="w-4 h-4 text-sky-600" />
                          <h5 className="text-xs font-black text-slate-800">ب – موضوع البيع والتصنيف</h5>
                        </div>
                        <div className="max-w-md">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Home className="w-3.5 h-3.5 text-slate-400" />
                            <span>نوع العقار المبيع</span>
                          </label>
                          <select
                            value={property.propertyClassification || ''}
                            onChange={(e) => handlePropertyChange(index, 'propertyClassification', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                          >
                            <option value="">-- اختر نوع العقار --</option>
                            <option value="شقة">شقة سكنية (Appartement)</option>
                            <option value="محل_تجاري">محل تجاري (Local commercial)</option>
                            <option value="loft">Loft</option>
                            <option value="مكتب">مكتب إداري / مهني (Bureau)</option>
                            <option value="قبو">قبو / مستودع (Cave / Box)</option>
                            <option value="موقف">موقف سيارة (Place de parking)</option>
                            <option value="سطح">سطح (Terrasse privative)</option>
                          </select>
                        </div>
                      </div>

                      {/* Section C: Fractional Share Details */}
                      <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                          <Layers className="w-4 h-4 text-sky-600" />
                          <h5 className="text-xs font-black text-slate-800">ج – الجزء المفرز ومشتملاته</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Compass className="w-3.5 h-3.5 text-slate-400" />
                              <span>المساحة الخاصة (م²)</span>
                            </label>
                            <input
                              type="number"
                              value={property.area_m2 || ''}
                              onChange={(e) => handlePropertyChange(index, 'area_m2', parseFloat(e.target.value) || undefined)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>الطابق</span>
                            </label>
                            <input
                              type="text"
                              value={property.floor || ''}
                              onChange={(e) => handlePropertyChange(index, 'floor', isNaN(parseInt(e.target.value)) ? undefined : parseInt(e.target.value))}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 3 أو الطابق الثالث"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>رقم الباب / الشقة</span>
                            </label>
                            <input
                              type="text"
                              value={property.unitDoorNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'unitDoorNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 12"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              <span>رقم الرسم العقاري المفرز (إن وجد)</span>
                            </label>
                            <input
                              type="text"
                              value={property.registeredFractionalNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'registeredFractionalNumber', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 12345/67"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Home className="w-3.5 h-3.5 text-slate-400" />
                              <span>التخصيص / الاستعمال</span>
                            </label>
                            <select
                              value={property.unitUsage || ''}
                              onChange={(e) => handlePropertyChange(index, 'unitUsage', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">-- اختر --</option>
                              <option value="سكني">سكني (Habitation)</option>
                              <option value="مهني">مهني (Professionnel)</option>
                              <option value="تجاري">تجاري (Commercial)</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Percent className="w-3.5 h-3.5 text-slate-400" />
                              <span>نسبة الملكية في الأجزاء المشتركة (%)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={property.fractionalOwnershipPercentage || ''}
                              onChange={(e) => handlePropertyChange(index, 'fractionalOwnershipPercentage', parseFloat(e.target.value) || undefined)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>المحتويات (تفاصيل الغرف والمرافق)</span>
                          </label>
                          <textarea
                            value={property.unitContents || ''}
                            onChange={(e) => handlePropertyChange(index, 'unitContents', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                            placeholder="صالون، 2 غرف نوم، مطبخ مجهز، حمام، شرفة..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Section D: Co-ownership System Compliance */}
                      <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-rose-100">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-rose-900">د – نظام الملكية المشتركة (المادتان 10 و 11 من القانون 18-00)</h5>
                          </div>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            بيان إلزامي بالعقد
                          </span>
                        </div>
                        <p className="text-xs font-medium text-rose-800/80 mb-3.5">
                          يجب التنصيص صراحة في العقد على اطلاع المشتري وقبوله بنظام الملكية المشتركة ومستنداته
                        </p>
                        
                        <div className="space-y-2.5">
                          {[
                            {
                              key: 'isAwareByCopyrightSystem',
                              title: 'اطلاع المشتري على نظام الملكية المشتركة',
                              desc: 'يتضمن حقوق والتزامات الملاك المشتركين وطريقة إدارة العقار',
                            },
                            {
                              key: 'isAwareByEngineeringDesign',
                              title: 'اطلاع المشتري على التصميم الهندسي ودفتر التحملات',
                              desc: 'يتضمن المواصفات التقنية وتفاصيل البناء المعتمدة',
                            },
                            {
                              key: 'isAwareByInternalRegulation',
                              title: 'اطلاع المشتري على النظام الداخلي للعمارة',
                              desc: 'يتضمن القواعد الداخلية المنظمة لحسن الجوار ومرافق العمارة',
                            },
                            {
                              key: 'hasApprovedCommonCharges',
                              title: 'موافقة المشتري على تحمل نصيبه في الأعباء المشتركة',
                              desc: 'أداء حصته في مصاريف الصيانة والحراسة والتسيير العام',
                            },
                          ].map((item) => {
                            const isChecked = property[item.key as keyof PropertyDetails] === 'نعم';
                            return (
                              <label
                                key={item.key}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-rose-50/80 border-rose-300 text-rose-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handlePropertyChange(index, item.key as keyof PropertyDetails, e.target.checked ? 'نعم' : 'لا')}
                                  className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500/20 flex-shrink-0"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-slate-800">{item.title}</span>
                                  <span className="block text-[11px] text-slate-500 mt-0.5">{item.desc}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {property.isAwareByCopyrightSystem === 'لا' && (
                          <div className="mt-3.5 p-3 rounded-xl bg-rose-100/80 border border-rose-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-black text-rose-950">تحذير قانوني جوهري:</p>
                              <p className="text-[11px] text-rose-900 mt-0.5">عدم إقرار المشتري بالاطلاع على نظام الملكية المشتركة يفتح الباب للطعن في العقد وقد يثير نزاعات حول حقوق الاستغلال.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section E: Common Parts */}
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-2 pb-2.5 border-b border-emerald-100">
                          <Compass className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-xs font-black text-emerald-950">هـ – الأجزاء المشتركة (المادتان 3 و 4)</h5>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mb-3.5">حدد الأجزاء والمرافق المشتركة الملحقة بالعقار المبيع:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {[
                            { label: 'السلالم والمصاعد', value: 'سلالم' },
                            { label: 'الممرات والمدخل الرئيسي', value: 'ممرات' },
                            { label: 'الأسطح المشتركة', value: 'أسطح' },
                            { label: 'الحدائق والمساحات الخضراء', value: 'حدائق' },
                            { label: 'مواقف السيارات المشتركة', value: 'مواقف' },
                            { label: 'الواجهات الخارجية', value: 'واجهات' },
                            { label: 'المصاعد الكهربائية', value: 'مصاعد' },
                            { label: 'تجهيزات التهوية والضخ', value: 'محركات' },
                            { label: 'التجهيزات والشبكات التقنية', value: 'تجهيزات' },
                          ].map((part) => {
                            const isIncluded = (property.commonPartsDescription || '').includes(part.value);
                            return (
                              <label
                                key={part.value}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isIncluded
                                    ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={(e) => {
                                    const current = (property.commonPartsDescription || '').split(',').filter(Boolean);
                                    if (e.target.checked) {
                                      current.push(part.value);
                                    } else {
                                      const idx = current.indexOf(part.value);
                                      if (idx > -1) current.splice(idx, 1);
                                    }
                                    handlePropertyChange(index, 'commonPartsDescription', current.join(','));
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500/20"
                                />
                                <span className="text-xs">{part.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section F: Common Charges */}
                      <div className="rounded-xl border border-amber-200/90 bg-amber-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-amber-100">
                          <Activity className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-amber-950">و – الأعباء المشتركة (Charges de Copropriété)</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Percent className="w-3.5 h-3.5 text-slate-400" />
                              <span>نسبة المساهمة (%)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={property.chargesContributionPercentage || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesContributionPercentage', parseFloat(e.target.value) || undefined)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              placeholder="مثال: 5.25"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                              <span>أنواع الأعباء</span>
                            </label>
                            <select
                              value={property.chargesTypes || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesTypes', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">-- اختر النوع --</option>
                              <option value="حراسة">حراسة ونظافة وأمان</option>
                              <option value="إنارة">إنارة ومياه مشتركة</option>
                              <option value="مصعد">صيانة المصاعد والمضخات</option>
                              <option value="حدائق">صيانة الحدائق والمساحات</option>
                              <option value="كل_أنواع">جميع أنواع التحملات المشتركة</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>آجال التسوية</span>
                            </label>
                            <select
                              value={property.chargesSettlementTerms || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesSettlementTerms', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            >
                              <option value="">-- اختر الدورية --</option>
                              <option value="شهري">شهري</option>
                              <option value="فصلي">فصلي (كل 3 أشهر)</option>
                              <option value="سنوي">سنوي</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section H: Property Ownership Status (For Registered Properties) */}
                      {(property.type === 'محفظ' || property.type === 'مزيج') && (
                        <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/20 p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-indigo-100">
                            <Landmark className="w-4 h-4 text-indigo-600" />
                            <h5 className="text-xs font-black text-indigo-950">ح – وضعية الملكية والتقييدات العقارية</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                                <span>الرسم العقاري الأم</span>
                              </label>
                              <input
                                type="text"
                                value={property.parentTitleRef || ''}
                                onChange={(e) => handlePropertyChange(index, 'parentTitleRef', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 45678/01"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                                <span>الرسم المفرز (إن وجد)</span>
                              </label>
                              <input
                                type="text"
                                value={property.fractionalTitleRef || ''}
                                onChange={(e) => handlePropertyChange(index, 'fractionalTitleRef', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 12345/01"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">الأعباء والارتفاقات المشتركة</label>
                              <textarea
                                value={property.commonEncumbrances || ''}
                                onChange={(e) => handlePropertyChange(index, 'commonEncumbrances', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                placeholder="مثال: ارتفاق الممر المشترك، مجاري الصرف المشتركة..."
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">الرهون والتقييدات المسجلة</label>
                              <textarea
                                value={property.commonMortgages || ''}
                                onChange={(e) => handlePropertyChange(index, 'commonMortgages', e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-xs font-medium resize-none"
                                placeholder="الرهون البنكية أو الضمانات إن وجدت..."
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>ديون ومستحقات اتحاد الملاك (Syndic)</span>
                              </label>
                              <input
                                type="text"
                                value={property.associationDebts || ''}
                                onChange={(e) => handlePropertyChange(index, 'associationDebts', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: لا توجد ديون / براءة ذمة مسلمة من السانديك"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Smart Case Guidance */}
                      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                          <Info className="w-4 h-4 text-amber-700" />
                          <h5 className="text-xs font-black text-amber-950">إرشادات الحالات الخاصة بالملكية المشتركة:</h5>
                        </div>
                        
                        {property.isAwareByCopyrightSystem === 'لا' && (
                          <div className="bg-white/80 p-3 rounded-lg border border-red-200 text-xs text-red-900">
                            <span className="font-bold">حالة عدم اطلاع المشتري: </span>
                            يجب تمكين المشتري من الاطلاع الكامل على نظام الملكية المشتركة ودفتر التحملات قبل توقيع العقد تجنباً للبطلان.
                          </div>
                        )}

                        {property.type === 'محفظ' && property.commonEncumbrances && (
                          <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
                            <span className="font-bold">وجود ارتفاقات مشتركة: </span>
                            يتعين بيان الارتفاقات المسجلة بالرسم العقاري والتأكد من علم المشتري التام بآثارها.
                          </div>
                        )}

                        {property.fractionalOwnershipPercentage && property.fractionalOwnershipPercentage > 50 && (
                          <div className="bg-white/80 p-3 rounded-lg border border-purple-200 text-xs text-purple-900">
                            <span className="font-bold">حصة ملكية كبرى (+50%): </span>
                            صاحب الأغلبية في الملكية المشتركة تترتب عليه مسؤوليات خاصة في إدارة اتحاد الملاك واتخاذ القرارات الكبرى.
                          </div>
                        )}
                      </div>

                      {/* Shared Property Warnings */}
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1.5 text-xs text-rose-950 font-medium">
                          <h5 className="text-xs font-black text-rose-900">تنبيهات قانونية للملكية المشتركة (القانون 18-00):</h5>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 list-none">
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>عدم التنصيص على نسب الملكية في الأجزاء المشتركة يعيب العقد</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>ضرورة الإدلاء بشهادة إبراء الذمة من ديون اتحاد الملاك</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>الاطلاع على نظام الملكية المشتركة شرط إلزامي لحماية حق المشتري</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>منع إجراء أي تعديلات تمس بالأجزاء المشتركة بدون ترخيص الجمع العام</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========== RENTAL-TO-OWN CONTRACT (عقد ايجار المفضي الى تملك عقار) ========== */}
                  {state.documentType === 'عقد_ايجار_المفضي_الى_تملك' && (
                    <div className="space-y-6 bg-gradient-to-br from-rose-50/60 via-white to-rose-50/30 p-6 rounded-2xl border border-rose-200/90 shadow-xs">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-rose-200/80">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-700 shadow-2xs">
                          <Key className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-rose-950">عقد الإيجار المفضي إلى تملك العقار (Loi 51-00)</h4>
                          <p className="text-xs font-medium text-rose-800/80 mt-0.5">الضوابط والشكليات الإلزامية لحماية المكتري المتملك وضمان انتقال الملكية</p>
                        </div>
                      </div>

                      {/* Section 1: Legal Requirements (Article 4) */}
                      <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/20 p-4.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-rose-100">
                          <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-rose-900">2️⃣ المتطلبات القانونية والشكليات الإلزامية (المادة 4)</h5>
                          </div>
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            تحت طائلة البطلان
                          </span>
                        </div>
                        <p className="text-xs font-medium text-rose-800/80 mb-3.5">
                          «يجب أن يحرر عقد الإيجار المفضي إلى تملك العقار بموجب محرر رسمي أو محرر ثابت التاريخ… تحت طائلة البطلان.»
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3.5">
                          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            property.isFormallyCertified === 'نعم'
                              ? 'bg-rose-100/70 border-rose-300 text-rose-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                          }`}>
                            <input
                              type="checkbox"
                              checked={property.isFormallyCertified === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'isFormallyCertified', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500/20 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-bold text-slate-800">تحرير رسمي للمحرر</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">العقد موثق من قبل مهني قانوني رسمي مؤهل</span>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            property.hasDateProof === 'نعم'
                              ? 'bg-rose-100/70 border-rose-300 text-rose-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                          }`}>
                            <input
                              type="checkbox"
                              checked={property.hasDateProof === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'hasDateProof', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500/20 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-bold text-slate-800">ثبوت التاريخ قانوناً</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">تاريخ العقد محقق الثبوت رسمياً ومسجل</span>
                            </div>
                          </label>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-rose-200/80">
                          <label className="block text-xs font-bold text-slate-700 mb-2">صفة المهني القانوني محرر العقد</label>
                          <div className="flex gap-2.5 mb-2.5">
                            {['عدل', 'موثق'].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handlePropertyChange(index, 'legalProfessionalType', option)}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  property.legalProfessionalType === option
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {option === 'عدل' ? 'عدل موثق (خطة العدالة)' : 'موثق عصري (Notaire)'}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={property.legalProfessionalResponsible || ''}
                            onChange={(e) => handlePropertyChange(index, 'legalProfessionalResponsible', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                            placeholder="اسم المهني القانوني المسؤول وعنوان مكتبه..."
                          />
                        </div>

                        <div className="mt-3.5 p-3 rounded-xl bg-rose-100/80 border border-rose-300 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-rose-950">المنع الإلزامي (المادة 14):</p>
                            <p className="text-[11px] text-rose-900 mt-0.5">«لا يحق للبائع أن يطلب أو يقبل أي أداء مالي كيفما كان قبل التوقيع النهائي على العقد» — حظر كامل للعربون والوعود بالبيع السابقة.</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Mandatory Contract Elements (Article 7) */}
                      <div className="space-y-4">
                        {/* Property Description */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                            <Home className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-slate-800">وصف العقار محل الكراء التمليكي</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Compass className="w-3.5 h-3.5 text-slate-400" />
                                <span>المساحة (م²)</span>
                              </label>
                              <input
                                type="number"
                                value={property.rentalPropertyArea || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyArea', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>الموقع / العنوان</span>
                              </label>
                              <input
                                type="text"
                                value={property.rentalPropertyLocation || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyLocation', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="المدينة، الحي، رقم الزنقة..."
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>التخصيص</span>
                              </label>
                              <input
                                type="text"
                                value={property.rentalPropertyUsage || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyUsage', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="سكني / مهني / تجاري"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Terms */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                            <CreditCard className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-slate-800">الشروط المالية والوجيبة الكرائية</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>ثمن البيع النهائي المحدد (ثابت)</span>
                              </label>
                              <input
                                type="number"
                                value={property.finalSalePrice || ''}
                                onChange={(e) => handlePropertyChange(index, 'finalSalePrice', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="0.00 درهم"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>مبلغ التسبيق (إن وجد)</span>
                              </label>
                              <input
                                type="number"
                                value={property.downPaymentAmount || ''}
                                onChange={(e) => handlePropertyChange(index, 'downPaymentAmount', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="0.00 درهم"
                              />
                            </div>
                          </div>
                          {property.downPaymentAmount && property.downPaymentAmount > 0 && (
                            <div className="mb-3.5 max-w-sm">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>تاريخ أداء التسبيق</span>
                              </label>
                              <input
                                type="date"
                                value={property.downPaymentDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'downPaymentDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>الوجيبة الكرائية الدورية</span>
                              </label>
                              <input
                                type="number"
                                value={property.monthlyRentalFee || ''}
                                onChange={(e) => handlePropertyChange(index, 'monthlyRentalFee', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="0.00 درهم"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>دورية الأداء</span>
                              </label>
                              <select
                                value={property.rentalFrequency || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalFrequency', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              >
                                <option value="">-- اختر --</option>
                                <option value="شهري">شهري</option>
                                <option value="ربع سنوي">ربع سنوي</option>
                                <option value="نصف سنوي">نصف سنوي</option>
                                <option value="سنوي">سنوي</option>
                              </select>
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Percent className="w-3.5 h-3.5 text-slate-400" />
                                <span>خصم جزء من الوجيبة من ثمن البيع؟</span>
                              </label>
                              <div className="flex gap-2">
                                {['نعم', 'لا'].map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => handlePropertyChange(index, 'rentalFeeDeduction', option)}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                      property.rentalFeeDeduction === option
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {property.rentalFeeDeduction === 'نعم' && (
                            <div className="max-w-xs">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Percent className="w-3.5 h-3.5 text-slate-400" />
                                <span>نسبة الخصم من الوجيبة (%)</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={property.deductionPercentage || ''}
                                onChange={(e) => handlePropertyChange(index, 'deductionPercentage', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 50%"
                              />
                            </div>
                          )}
                        </div>

                        {/* Insurance & Dates */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                            <Shield className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-slate-800">التأمين وسريان الالتزامات</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Hash className="w-3.5 h-3.5 text-slate-400" />
                                <span>مرجع عقد التأمين (ضمان العقار)</span>
                              </label>
                              <input
                                type="text"
                                value={property.insuranceReference || ''}
                                onChange={(e) => handlePropertyChange(index, 'insuranceReference', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="رقم العقد وشركة التأمين"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>تاريخ بدء الانتفاع بالعقار</span>
                              </label>
                              <input
                                type="date"
                                value={property.enjoymentDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'enjoymentDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>بداية احتساب الالتزامات</span>
                              </label>
                              <input
                                type="date"
                                value={property.obligationStartDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'obligationStartDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Option Right */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
                            <Key className="w-4 h-4 text-rose-600" />
                            <h5 className="text-xs font-black text-slate-800">حق الخيار في التملك (Droit d'option)</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>مدة حق الخيار (سنوات)</span>
                              </label>
                              <input
                                type="number"
                                value={property.optionRightDuration || ''}
                                onChange={(e) => handlePropertyChange(index, 'optionRightDuration', parseInt(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="مثال: 5"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>السعر المحدد لممارسة الحق</span>
                              </label>
                              <input
                                type="number"
                                value={property.optionRightPrice || ''}
                                onChange={(e) => handlePropertyChange(index, 'optionRightPrice', parseFloat(e.target.value) || undefined)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium"
                                placeholder="0.00 درهم"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>شروط وكيفيات ممارسة حق الخيار</span>
                            </label>
                            <textarea
                              value={property.optionRightConditions || ''}
                              onChange={(e) => handlePropertyChange(index, 'optionRightConditions', e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all text-slate-800 text-sm font-medium resize-none"
                              placeholder="طريقة إشعار البائع، الآجال، الإبراء، إلخ..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Party Obligations */}
                      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4.5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-2.5 border-b border-emerald-100">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-xs font-black text-emerald-950">4️⃣ التزامات الأطراف ومخاطرها القانونية</h5>
                        </div>
                        
                        {/* Seller Obligations */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/90">
                          <h6 className="text-xs font-black text-slate-800 mb-3">التزامات البائع الجوهرية:</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {[
                              { key: 'transferOwnership', label: 'نقل الملكية عند نهاية المدة وممارسة الخيار' },
                              { key: 'insuranceObligation', label: 'إبرام عقد التأمين وضمان سلامة العقار' },
                              { key: 'noPaymentBeforeSigning', label: 'عدم مطالبة المكتري بأي أداء مالي قبل التوقيع' },
                              { key: 'deliverHabitableProperty', label: 'تسليم العقار صالحاً وكاملاً للانتفاع' },
                            ].map((obligation) => {
                              const isChecked = !!property.sellerObligations?.[obligation.key as keyof typeof property.sellerObligations];
                              return (
                                <label
                                  key={obligation.key}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => handlePropertyChange(index, 'sellerObligations', {
                                      ...property.sellerObligations,
                                      [obligation.key]: e.target.checked
                                    })}
                                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500/20 flex-shrink-0"
                                  />
                                  <span className="text-xs">{obligation.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tenant-Buyer Obligations */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200/90">
                          <h6 className="text-xs font-black text-slate-800 mb-3">التزامات المكتري المتملك:</h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                            {[
                              { key: 'payRentalFee', label: 'أداء الوجيبة الكرائية في مواعيدها' },
                              { key: 'respectOptionRight', label: 'احترام شروط حق الخيار في الأجل' },
                              { key: 'maintainProperty', label: 'المحافظة على العقار وحسن صيانته' },
                            ].map((obligation) => {
                              const isChecked = !!property.tenantBuyerObligations?.[obligation.key as keyof typeof property.tenantBuyerObligations];
                              return (
                                <label
                                  key={obligation.key}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => handlePropertyChange(index, 'tenantBuyerObligations', {
                                      ...property.tenantBuyerObligations,
                                      [obligation.key]: e.target.checked
                                    })}
                                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500/20 flex-shrink-0"
                                  />
                                  <span className="text-xs">{obligation.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Termination & Extensions */}
                      <div className="rounded-xl border border-amber-200/90 bg-amber-50/20 p-4.5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-2.5 border-b border-amber-100">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <h5 className="text-xs font-black text-amber-950">5️⃣ ممارسة حق الخيار والفسخ والتمديد</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90">
                            <label className="block text-xs font-bold text-slate-700 mb-2">هل مارس المكتري حق الخيار بالتملك؟</label>
                            <div className="flex gap-2 mb-3">
                              {[
                                { key: 'نعم', label: 'نعم - شراء وتملك' },
                                { key: 'لا', label: 'لا - فسخ وتنازل' },
                                { key: 'قيد_الدراسة', label: 'قيد الدراسة' }
                              ].map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => handlePropertyChange(index, 'exercisedOptionRight', option.key)}
                                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    property.exercisedOptionRight === option.key
                                      ? option.key === 'نعم'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : option.key === 'لا'
                                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                          : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>

                            {property.exercisedOptionRight === 'نعم' && (
                              <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>تاريخ ممارسة حق التملك</span>
                                </label>
                                <input
                                  type="date"
                                  value={property.optionRightExerciseDate || ''}
                                  onChange={(e) => handlePropertyChange(index, 'optionRightExerciseDate', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none text-slate-800 text-xs font-medium"
                                />
                              </div>
                            )}

                            {property.exercisedOptionRight === 'لا' && (
                              <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  <span>سبب عدم الممارسة والفسخ</span>
                                </label>
                                <input
                                  type="text"
                                  value={property.terminationReason || ''}
                                  onChange={(e) => handlePropertyChange(index, 'terminationReason', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none text-slate-800 text-xs font-medium"
                                  placeholder="تنازل صريح من المكتري..."
                                />
                              </div>
                            )}
                          </div>

                          {/* Extension Possibility */}
                          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90">
                            <label className="block text-xs font-bold text-slate-700 mb-2">إمكانية تمديد أجل حق الخيار</label>
                            <div className="flex gap-2 mb-3">
                              {['نعم', 'لا'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handlePropertyChange(index, 'extensionPossibility', option)}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    property.extensionPossibility === option
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {option === 'نعم' ? 'نعم - منصوص على التمديد' : 'لا - أجل حاسم'}
                                </button>
                              ))}
                            </div>

                            {property.extensionPossibility === 'نعم' && (
                              <div className="space-y-2.5">
                                <label className="block text-[11px] font-bold text-slate-600">هل تم طلب التمديد رسمياً؟</label>
                                <div className="flex gap-2">
                                  {['نعم', 'لا'].map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => handlePropertyChange(index, 'extensionRequested', option)}
                                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                        property.extensionRequested === option
                                          ? 'bg-amber-500 text-white border-amber-500'
                                          : 'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={property.extensionTerms || ''}
                                  onChange={(e) => handlePropertyChange(index, 'extensionTerms', e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none text-slate-800 text-xs font-medium resize-none"
                                  placeholder="شروط التمديد، مدته الإضافية، الوجيبة المعدلة..."
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Termination Conditions */}
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-3">
                          <h6 className="text-xs font-black text-slate-800">شروط الفسخ والتعويضات التعاقدية:</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">شروط وكيفيات فسخ العقد</label>
                              <textarea
                                value={property.terminationConditions || ''}
                                onChange={(e) => handlePropertyChange(index, 'terminationConditions', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none text-slate-800 text-xs font-medium resize-none"
                                placeholder="شروط الفسخ، الإخطار المسبق، استرجاع العقار..."
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">التعويضات المستحقة عند الفسخ</label>
                              <textarea
                                value={property.compensationDetails || ''}
                                onChange={(e) => handlePropertyChange(index, 'compensationDetails', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none text-slate-800 text-xs font-medium resize-none"
                                placeholder="طريقة احتساب التعويضات واسترداد المبالغ الكرائية أو الخصومات..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Critical Warnings */}
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1.5 text-xs text-rose-950 font-medium">
                          <h5 className="text-xs font-black text-rose-900">تنبيهات قانونية حرجة (القانون 51-00):</h5>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 list-none">
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>عدم احترام الشكل الرسمي وثبوت التاريخ يوجب البطلان المطلق للعقد</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>أي أداء قبل التوقيع الرسمي باطل وممنوع قانوناً بمقتضى المادة 14</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>عدم تحديد أجل وشروط حق الخيار يمنع انتقال الملكية للمكتري</span>
                            </li>
                            <li className="flex items-center gap-1.5 text-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              <span>إلزامية إبرام عقد التأمين لضمان العقار ضد الأخطار طيلة مدة الكراء</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => {
              const newState = { ...prev, step: 1 };
              
              // Handle Legal Entity Navigation
              if (prev.legalEntityTransactionType) {
                const isSellerLegal = prev.sellers[0]?.partyType === 'legal';
                
                if (isSellerLegal) {
                  // If Seller is Legal, we came from the Legal Entity Wizard (Seller side)
                  // So we go back to the Review step of the wizard
                  newState.legalEntitySetupStep = 6;
                } else if (prev.legalEntityTransactionType === 'buyer_legal') {
                  // If Buyer is Legal but Seller is Natural, we came from the Natural Party form for Seller
                  newState.isEnteringNaturalPartySecond = true;
                }
              }
              
              return newState;
            })}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق (بيانات الأطراف)</span>
          </button>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                properties: tempProperties,
                step: 3,
              }));
            }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>التالي: الشواهد الإدارية والتراخيص</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3 (بديل): تفاصيل عقد بيع حق الهواء والتعلية
  // ============================================================================

