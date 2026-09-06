import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { PropertyDetails, TitleDocumentDetails, OwnershipCertificateDetails, PropertyType } from '../../../types/feesAgentTypes';
import { createEmptyProperty, createEmptyTitleDocument } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
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
          <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{(state.documentType as string) === 'حيازة' ? 'الخطوة الثالثة: تفاصيل الحيازة' : 'الخطوة الثالثة: تفاصيل الملكية'}</h2>
            <p className="text-gray-700">أدخل تفاصيل الفريضة أو الوصية.</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400 space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">بيان فريضة/وصية واجبة/تنزيل/مناسخة</label>
              <textarea
                value={inheritanceDescription}
                onChange={(e) => setInheritanceDescription(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg h-48"
                placeholder="أدخل تفاصيل الفريضة أو الوصية هنا..."
              />
            </div>
          </div>

          <div className="flex gap-4 justify-between">
            <button
              onClick={() => setState((prev) => ({ ...prev, step: 1 }))}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              التالي: بيانات الشهود
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{(state.documentType as string) === 'حيازة' ? 'الخطوة الثالثة: تفاصيل الحيازة' : 'الخطوة الثالثة: تفاصيل الملكية'}</h2>
          <p className="text-gray-700">أدخل تفاصيل العقار/الموضوع المراد التصرف فيه.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">
              {state.documentType === 'هبة' ? 'العقارات الموهوبة' : 'العقارات'} (عددها {tempProperties.length})
            </h3>
            <button className="btn-secondary text-sm" type="button" onClick={addProperty}>
              {state.documentType === 'هبة' ? '+ إضافة عقار موهوب' : '+ إضافة عقار'}
            </button>
          </div>

          {tempProperties.map((property, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400 space-y-6 relative">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">
                  {state.documentType === 'هبة' ? `العقار الموهوب رقم ${index + 1}` : `العقار رقم ${index + 1}`}
                </h4>
                {tempProperties.length > 1 && (
                  <button className="text-red-600 font-semibold" type="button" onClick={() => removeProperty(index)}>
                    {state.documentType === 'هبة' ? 'حذف العقار الموهوب' : 'حذف العقار'}
                  </button>
                )}
              </div>

              {(state.documentType === 'ملكية' || (state.documentType as string) === 'حيازة') ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">اسم العقار</label>
                      <input
                        type="text"
                        value={property.propertyName || ''}
                        onChange={(e) => handlePropertyChange(index, 'propertyName', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="اسم العقار"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">موقعه</label>
                      <input
                        type="text"
                        value={property.location || ''}
                        onChange={(e) => handlePropertyChange(index, 'location', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        placeholder="موقع العقار"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">التابع لعمالة / لاقليم</label>
                    <input
                      type="text"
                      value={property.province || ''}
                      onChange={(e) => handlePropertyChange(index, 'province', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="العمالة أو الإقليم"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {(state.documentType === 'بيع_وشراء' || state.documentType === 'بيع_وشراء_معنوي' || state.documentType === 'هبة' || state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' || state.documentType === 'بيع_وشراء_ملكية_مشتركة' || state.documentType === 'عقد_ايجار_المفضي_الى_تملك') ? 'ما حالة العقار/العقارات محل المعاملة؟' : 'نوع العقار *'}
                  </label>
                  <select
                    value={property.type}
                    onChange={(e) => handlePropertyChange(index, 'type', e.target.value as PropertyType)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
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
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المساحة والأبعاد (بالمتر)</label>
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
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">الطول (متر)</span>
                        <input
                          type="number"
                          value={property.length_m ?? ''}
                          onChange={(e) => handleDimensionChange(index, 'length_m', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">العرض (متر)</span>
                        <input
                          type="number"
                          value={property.width_m ?? ''}
                          onChange={(e) => handleDimensionChange(index, 'width_m', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                          placeholder="20"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">سيتم احتساب المساحة تلقائياً بعد إدخال الطول والعرض.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحدود *</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['north', 'south', 'east', 'west'].map((side) => (
                        <div key={side}>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                            {side === 'north' && 'الشمال'}
                            {side === 'south' && 'الجنوب'}
                            {side === 'east' && 'الشرق'}
                            {side === 'west' && 'الغرب'}
                          </label>
                          <input
                            type="text"
                            value={property.boundaries[side as keyof typeof property.boundaries]}
                            onChange={(e) => handleBoundaryChange(index, side as any, e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            placeholder={side === 'north' ? 'مثال: شارع النيل' : ''}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">الإحداثيات الجغرافية (اختياري)</label>
                      <button
                        type="button"
                        onClick={() => addCoordinate(index)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        + إضافة إحداثيات
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {property.coordinates.map((coord, coordIdx) => (
                        <div key={coordIdx} className="flex gap-4 items-center">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <input
                              type="number"
                              step="any"
                              value={coord.lat || ''}
                              onChange={(e) => handleCoordinateChange(index, coordIdx, 'lat', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              placeholder={`خط العرض ${coordIdx + 1}`}
                            />
                            <input
                              type="number"
                              step="any"
                              value={coord.lng || ''}
                              onChange={(e) => handleCoordinateChange(index, coordIdx, 'lng', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              placeholder={`خط الطول ${coordIdx + 1}`}
                            />
                          </div>
                          {property.coordinates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCoordinate(index, coordIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {((state.documentType !== 'بيع_وشراء' && state.documentType !== 'بيع_وشراء_معنوي' && state.documentType !== 'هبة') || property.type === 'غير_محفظ' || property.type === 'مزيج') && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h5 className="font-semibold text-gray-800">{(state.documentType as string) === 'حيازة' ? 'تفاصيل سند الحيازة' : 'تفاصيل سند الملكية'}</h5>
                      <button
                        type="button"
                        onClick={() => addTitleDocument(index)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        + إضافة سند
                      </button>
                    </div>
                    
                    {property.titleDocuments.map((doc, docIndex) => (
                      <div key={docIndex} className="p-4 bg-white rounded border border-gray-200 relative">
                        {property.titleDocuments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTitleDocument(index, docIndex)}
                            className="absolute top-2 left-2 text-red-500 hover:text-red-700 text-sm"
                          >
                            ✕ حذف
                          </button>
                        )}
                        
                        <h6 className="text-sm font-bold text-gray-700 mb-3">السند رقم {docIndex + 1}</h6>

                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">نوع الرسم</label>
                          <input
                            type="text"
                            value={doc.feeType || ''}
                            onChange={(e) => handleTitleDocumentChange(index, docIndex, 'feeType', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="مثال: رسم عقاري، مطلب تحفيظ..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">ضمن بدفتر/ سجل البيانات</label>
                            <input
                              type="text"
                              value={doc.bookReference || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'bookReference', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">رقم</label>
                            <input
                              type="text"
                              value={doc.number || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'number', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">حرف (اختياري)</label>
                            <input
                              type="text"
                              value={doc.letter || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'letter', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">صحيفة</label>
                            <input
                              type="text"
                              value={doc.page || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'page', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">عدد</label>
                            <input
                              type="text"
                              value={doc.count || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'count', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">بتاريخ</label>
                            <input
                              type="date"
                              value={doc.date || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'date', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">موافق</label>
                            <input
                              type="text"
                              value={doc.correspondingDate || ''}
                              onChange={(e) => handleTitleDocumentChange(index, docIndex, 'correspondingDate', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                              placeholder="التاريخ الموافق"
                            />
                          </div>
                        </div>

                        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            هل لسند الملك مراجع التسجيل و التمبر؟
                          </label>
                          <div className="flex gap-4 mb-3">
                            {['نعم', 'لا'].map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  value={option}
                                  checked={doc.hasRegistrationReferences === option}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'hasRegistrationReferences', e.target.value)}
                                />
                                <span className="font-semibold text-sm">{option}</span>
                              </label>
                            ))}
                          </div>

                          {doc.hasRegistrationReferences === 'نعم' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">المسجل بمالية</label>
                                <input
                                  type="text"
                                  value={doc.registeredAt || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'registeredAt', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">رقم الايداع / الوصل</label>
                                <input
                                  type="text"
                                  value={doc.depositNumber || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'depositNumber', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">بتاريخ</label>
                                <input
                                  type="date"
                                  value={doc.depositDate || ''}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'depositDate', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {!['ara' as any, 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية'].includes(state.documentType) && (
                        <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {(state.documentType as string) === 'حيازة' ? 'هل هناك شروط او ملاحظات في هذه الحيازة ؟' : 'هل هناك شروط او ملاحظات في هذا البيع ؟'}
                          </label>
                          <div className="flex gap-4 mb-3">
                            {['نعم', 'لا'].map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  value={option}
                                  checked={doc.hasNotes === option}
                                  onChange={(e) => handleTitleDocumentChange(index, docIndex, 'hasNotes', e.target.value)}
                                />
                                <span className="font-semibold text-sm">{option}</span>
                              </label>
                            ))}
                          </div>

                          {doc.hasNotes === 'نعم' && (
                            <div className="mt-3">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">الملاحظات / الشروط</label>
                              <textarea
                                value={doc.notes || ''}
                                onChange={(e) => handleTitleDocumentChange(index, docIndex, 'notes', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                rows={3}
                                placeholder="أدخل الشروط أو الملاحظات هنا..."
                              />
                            </div>
                          )}
                        </div>
                        )}

                        {(state.documentType === 'ملكية' || (state.documentType as string) === 'حيازة') && (
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{(state.documentType as string) === 'حيازة' ? 'مدة الحيازة' : 'مدة التملك'}</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">السنوات</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={property.ownershipDurationYears ?? ''}
                                  onChange={(e) => handlePropertyChange(index, 'ownershipDurationYears', parseInt(e.target.value) || 0)}
                                  className="w-full p-3 border border-gray-300 rounded-lg"
                                  placeholder="عدد السنوات"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">الأشهر</label>
                                <select
                                  value={property.ownershipDurationMonths ?? 0}
                                  onChange={(e) => handlePropertyChange(index, 'ownershipDurationMonths', parseInt(e.target.value) || 0)}
                                  className="w-full p-3 border border-gray-300 rounded-lg"
                                >
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>{i} شهر</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {((property.ownershipDurationYears || 0) < 10) && (
                              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-semibold">
                                تنبيه: عدم استيفاء المدة القانونية للحيازة
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            صورة السند (اختياري)
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleTitleDocumentChange(index, docIndex, 'file', e.target.files?.[0] || null)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                          />
                          {doc.file && (
                            <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                              <span className="truncate font-medium">📎 تم إرفاق: {(doc.file as any)?.name || 'صورة السند'}</span>
                              <button
                                type="button"
                                onClick={() => handleTitleDocumentChange(index, docIndex, 'file', null)}
                                className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
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
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 mt-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h5 className="font-semibold text-gray-800">شهادة الملكية</h5>
                        <button
                          type="button"
                          onClick={() => addOwnershipCertificate(index)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          + إضافة شهادة
                        </button>
                      </div>
                      
                      {(property.ownershipCertificates || []).map((cert, certIndex) => (
                        <div key={certIndex} className="p-4 bg-white rounded border border-gray-200 relative">
                          {(property.ownershipCertificates || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOwnershipCertificate(index, certIndex)}
                              className="absolute top-2 left-2 text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕ حذف
                            </button>
                          )}
                          
                          <h6 className="text-sm font-bold text-gray-700 mb-3">الشهادة رقم {certIndex + 1}</h6>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">رقم</label>
                              <input
                                type="text"
                                value={cert.number || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'number', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">تاريخ الاصدار</label>
                              <input
                                type="date"
                                value={cert.date || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'date', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">الصادرة عن للمحافظة العقارية ب</label>
                              <input
                                type="text"
                                value={cert.issuedBy || ''}
                                onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'issuedBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">رفع صورة الشهادة</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleOwnershipCertificateChange(index, certIndex, 'file', e.target.files?.[0] || null)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            {cert.file && (
                              <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                                <span className="truncate font-medium">📎 تم إرفاق: {(cert.file as any)?.name || 'صورة الشهادة'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOwnershipCertificateChange(index, certIndex, 'file', null)}
                                  className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
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
                         <div className="text-center py-4 text-gray-500 text-sm">
                           اضغط على "إضافة شهادة" لإدخال بيانات شهادة الملكية
                         </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      هل هناك حقوق للغير أو رهون أو إيقافات؟
                    </label>
                    <div className="flex gap-4">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={option}
                            checked={property.hasThirdPartyRights === option}
                            onChange={(e) => handlePropertyChange(index, 'hasThirdPartyRights', e.target.value)}
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                    {property.hasThirdPartyRights === 'نعم' && (
                      <textarea
                        value={property.thirdPartyDetails || ''}
                        onChange={(e) => handlePropertyChange(index, 'thirdPartyDetails', e.target.value)}
                        className="w-full mt-3 p-3 border border-gray-300 rounded-lg"
                        placeholder="وضّح نوع الحقوق والتفاصيل..."
                        rows={3}
                      />
                    )}
                  </div>

                  {/* ========== CONSTRUCTION PROPERTY SPECIFIC FIELDS ========== */}
                  {(state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي' || state.documentType === 'بيع_وشراء_طور_انجاز_نهائي') && (
                    <div className="space-y-6 bg-amber-50 p-6 rounded-lg border-2 border-amber-300">
                      <h4 className="text-lg font-bold text-amber-900">المرحلة الأولى: عقد البيع الابتدائي – المتطلبات الخاصة</h4>
                      
                      {/* Building Permit Section */}
                      <div className="bg-white p-4 rounded-lg border border-amber-200">
                        <h5 className="text-sm font-bold text-gray-800 mb-4">د – رخصة البناء</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الرخصة</label>
                            <input
                              type="text"
                              value={property.buildingPermitNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitNumber', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="رقم الرخصة"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ الإصدار</label>
                            <input
                              type="date"
                              value={property.buildingPermitIssueDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitIssueDate', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الجهة المصدرة</label>
                            <input
                              type="text"
                              value={property.buildingPermitIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'buildingPermitIssuedBy', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="البلدية / الجماعة"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Foundations Certificate Section */}
                      <div className="bg-white p-4 rounded-lg border border-red-300">
                        <h5 className="text-sm font-bold text-red-900 mb-2">⚠ ط – شهادة الأساسات (إلزامي)</h5>
                        <p className="text-xs text-gray-600 mb-4">شرط قانوني لإبرام العقد الابتدائي - يجب تسلمها من المهندس المختص</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الشهادة</label>
                            <input
                              type="text"
                              value={property.foundationsCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التاريخ</label>
                            <input
                              type="date"
                              value={property.foundationsCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateDate', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الصادرة عن (المهندس)</label>
                            <input
                              type="text"
                              value={property.foundationsCertificateIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'foundationsCertificateIssuedBy', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                              placeholder="اسم المهندس"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Property Details & Specifications Section */}
                      <div className="bg-white p-4 rounded-lg border border-gray-400">
                        <h5 className="text-sm font-bold text-gray-900 mb-4">ج – العقار محل البيع – التفاصيل والمواصفات</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">العنوان</label>
                            <input
                              type="text"
                              value={property.propertyName || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyName', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="اسم/رقم العقار"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">المساحة (م²)</label>
                            <input
                              type="number"
                              value={property.area_m2 || ''}
                              onChange={(e) => handlePropertyChange(index, 'area_m2', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الطابق</label>
                            <input
                              type="number"
                              value={property.floor || ''}
                              onChange={(e) => handlePropertyChange(index, 'floor', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التجزيء</label>
                            <input
                              type="text"
                              value={property.subdivision || ''}
                              onChange={(e) => handlePropertyChange(index, 'subdivision', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="رقم التجزيء"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">المحتويات</label>
                            <input
                              type="text"
                              value={property.propertyContents || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyContents', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              placeholder="مثال: garage + cave + balcony"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">المواصفات الهندسية</label>
                          <textarea
                            value={property.engineeringSpecifications || ''}
                            onChange={(e) => handlePropertyChange(index, 'engineeringSpecifications', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            placeholder="تفاصيل المواصفات الهندسية"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Payment Stages Management Section */}
                      <div className="bg-white p-4 rounded-lg border border-teal-400">
                        <h5 className="text-sm font-bold text-teal-900 mb-2">3️⃣ آلية الأداء والأقساط (المرتبطة بمراحل البناء)</h5>
                        <p className="text-xs text-gray-600 mb-4">ربط كل أداء بشهادة هندسية (certificat d'avancement) وبالتأمين/الضمان البنكي</p>
                        <div className="space-y-3">
                          {(property.paymentStages || []).map((stage, stageIndex) => (
                            <div key={stageIndex} className="p-3 bg-teal-50 rounded border border-teal-200 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const newStages = property.paymentStages?.filter((_, i) => i !== stageIndex) || [];
                                  handlePropertyChange(index, 'paymentStages', newStages);
                                }}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-bold"
                              >
                                ✕
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">رقم المرحلة</label>
                                  <input
                                    type="number"
                                    value={stage.stage || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, stage: parseInt(e.target.value) || 0 };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full p-1 border border-teal-300 rounded text-sm"
                                    placeholder="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">وصف المرحلة</label>
                                  <input
                                    type="text"
                                    value={stage.description || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, description: e.target.value };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full p-1 border border-teal-300 rounded text-sm"
                                    placeholder="الأساسات، الهيكل، إلخ"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">النسبة %</label>
                                  <input
                                    type="number"
                                    value={stage.percentage || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, percentage: parseFloat(e.target.value) || 0 };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full p-1 border border-teal-300 rounded text-sm"
                                    placeholder="35"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">تاريخ الاستحقاق</label>
                                  <input
                                    type="date"
                                    value={stage.dueDate || ''}
                                    onChange={(e) => {
                                      const newStages = property.paymentStages ? [...property.paymentStages] : [];
                                      newStages[stageIndex] = { ...stage, dueDate: e.target.value };
                                      handlePropertyChange(index, 'paymentStages', newStages);
                                    }}
                                    className="w-full p-1 border border-teal-300 rounded text-sm"
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
                            className="w-full p-2 bg-teal-100 text-teal-900 rounded text-sm font-semibold hover:bg-teal-200"
                          >
                            + إضافة مرحلة أداء
                          </button>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs text-yellow-900 font-semibold">
                            ⚠ تذكير: النظام المغربي (المادة 618/6) لا يحدد نسب إلزامية للأداء، خلافاً للنظام الفرنسي VEFA (35%+70%+95%)
                            → قد يفتح باب الاستغلال والغبن
                          </p>
                        </div>
                      </div>

                      {/* Technical Documents Section */}
                      <div className="bg-white p-4 rounded-lg border border-blue-300">
                        <h5 className="text-sm font-bold text-blue-900 mb-4">ح – التصاميم والوثائق التقنية</h5>
                        <p className="text-xs text-gray-600 mb-4">يجب إرفاق:</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التصاميم المعمارية</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'architecturalPlansFile', e.target.files?.[0] || null)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                            />
                            {property.architecturalPlansFile && (
                              <div className="mt-1 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-1 rounded">
                                <span className="truncate">📎 {(property.architecturalPlansFile as any)?.name || 'التصاميم المعمارية'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'architecturalPlansFile', null)} className="text-red-500 font-bold ml-1">✕</button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تصاميم الإسمنت المسلح</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'concreteDesignFile', e.target.files?.[0] || null)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                            />
                            {property.concreteDesignFile && (
                              <div className="mt-1 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-1 rounded">
                                <span className="truncate">📎 {(property.concreteDesignFile as any)?.name || 'تصاميم الإسمنت'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'concreteDesignFile', null)} className="text-red-500 font-bold ml-1">✕</button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">دفتر التحملات</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'specificationBookletFile', e.target.files?.[0] || null)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                            />
                            {property.specificationBookletFile && (
                              <div className="mt-1 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 py-1 rounded">
                                <span className="truncate">📎 {(property.specificationBookletFile as any)?.name || 'دفتر التحملات'}</span>
                                <button type="button" onClick={() => handlePropertyChange(index, 'specificationBookletFile', null)} className="text-red-500 font-bold ml-1">✕</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Property Specifications */}
                      <div className="bg-white p-4 rounded-lg border border-gray-300">
                        <h5 className="text-sm font-bold text-gray-800 mb-4">ج – مواصفات العقار</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الطابق</label>
                            <input
                              type="number"
                              value={property.floor || ''}
                              onChange={(e) => handlePropertyChange(index, 'floor', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التجزئة</label>
                            <input
                              type="text"
                              value={property.subdivision || ''}
                              onChange={(e) => handlePropertyChange(index, 'subdivision', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delivery Terms */}
                      <div className="bg-white p-4 rounded-lg border border-green-300">
                        <h5 className="text-sm font-bold text-green-900 mb-4">و – أجل التسليم والغرامات</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ التسليم المتفق عليه</label>
                            <input
                              type="date"
                              value={property.deliveryDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'deliveryDate', e.target.value)}
                              className="w-full p-2 border border-green-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">غرامات التأخير (بالدرهم أو النسبة)</label>
                            <input
                              type="text"
                              value={property.delayPenalties || ''}
                              onChange={(e) => handlePropertyChange(index, 'delayPenalties', e.target.value)}
                              className="w-full p-2 border border-green-300 rounded"
                              placeholder="مثال: 0.5 درهم لكل يوم"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seller Commitments */}
                      <div className="bg-white p-4 rounded-lg border border-purple-300">
                        <h5 className="text-sm font-bold text-purple-900 mb-4">ي – تعهد البائع بالالتزامات التالية:</h5>
                        <div className="space-y-2">
                          {[
                            { key: 'respectDesigns', label: '✔ احترام التصاميم' },
                            { key: 'respectSchedule', label: '✔ احترام الجدول الزمني' },
                            { key: 'respectSpecifications', label: '✔ احترام دفتر التحملات' },
                          ].map((item) => (
                            <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-purple-50 rounded">
                              <input
                                type="checkbox"
                                checked={property.sellerCommitments?.[item.key as keyof typeof property.sellerCommitments] || false}
                                onChange={(e) => handlePropertyChange(index, 'sellerCommitments', {
                                  ...property.sellerCommitments,
                                  [item.key]: e.target.checked,
                                })}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Guarantees/Insurance Section */}
                      <div className="bg-white p-4 rounded-lg border border-indigo-300">
                        <h5 className="text-sm font-bold text-indigo-900 mb-4">ز – الضمانات</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">نوع الضمان</label>
                            <select
                              value={property.guaranteeType || ''}
                              onChange={(e) => handlePropertyChange(index, 'guaranteeType', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded"
                            >
                              <option value="">اختر نوع الضمان</option>
                              <option value="بنكية">ضمانة بنكية</option>
                              <option value="تأمين">تأمين</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مرجع عقد التأمين/الضمان</label>
                            <input
                              type="text"
                              value={property.insuranceContractRef || ''}
                              onChange={(e) => handlePropertyChange(index, 'insuranceContractRef', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded"
                              placeholder="رقم العقد أو المرجع"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مدة تغطية الضمانة</label>
                            <input
                              type="text"
                              value={property.guaranteeCoveragePeriod || ''}
                              onChange={(e) => handlePropertyChange(index, 'guaranteeCoveragePeriod', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded"
                              placeholder="مثال: سنتان من تاريخ التوقيع"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رفع وثيقة الضمان (اختياري)</label>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handlePropertyChange(index, 'guaranteeFile', e.target.files?.[0] || null)}
                              className="w-full p-2 border border-indigo-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Boundaries Section (for unregistered properties) */}
                      {property.type === 'غير_محفظ' && (
                        <div className="bg-white p-4 rounded-lg border border-green-300">
                          <h5 className="text-sm font-bold text-green-900 mb-4">الحدود (عقار غير محفظ)</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {['north', 'south', 'east', 'west'].map((side) => (
                              <div key={side}>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                  {side === 'north' && 'الشمال'}
                                  {side === 'south' && 'الجنوب'}
                                  {side === 'east' && 'الشرق'}
                                  {side === 'west' && 'الغرب'}
                                </label>
                                <input
                                  type="text"
                                  value={property.boundaries[side as keyof typeof property.boundaries]}
                                  onChange={(e) => handleBoundaryChange(index, side as any, e.target.value)}
                                  className="w-full p-2 border border-green-300 rounded-lg text-sm"
                                  placeholder={side === 'north' ? 'مثال: شارع النيل' : ''}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Provisional Registration Warning (for registered properties) */}
                      {property.type === 'محفظ' && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded">
                          <h5 className="text-sm font-bold text-yellow-900 mb-2">📌 تنبيه قانوني - التقييد الاحتياطي</h5>
                          <p className="text-xs text-yellow-900 mb-3">
                            إذا كان العقار محفظًا → يجب تقييد احتياطي بناء على العقد الابتدائي (المادة 618-11)
                          </p>
                          <p className="text-xs text-yellow-800 font-semibold">
                            ⚠ يجب إدراج بند إلزامي في العقد يتضمن طلب التقييد الاحتياطي بالمحافظة العقارية لحماية حقوق المشتري
                          </p>
                        </div>
                      )}

                      {/* Important Warnings */}
                      <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                        <h5 className="text-sm font-bold text-red-900 mb-3">⚠ تنبيهات قانونية إلزامية:</h5>
                        <ul className="space-y-2 text-xs text-red-900 list-disc list-inside">
                          <li>لا يمكن إبرام العقد الابتدائي قبل إنجاز الأساسات (المادة 618-3)</li>
                          <li>البيع الابتدائي ≠ الوعد بالبيع - البيع الابتدائي عقد كامل الأركان</li>
                          <li>غياب دفتر التحملات = خطر قانوني على المشتري</li>
                          <li>تجاوز أجل التسليم يفتح باب المسؤولية المدنية</li>
                          <li>يجب تضمين الجزاءات والفسخ ورد الأداءات</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ========== FINAL CONTRACT SPECIFIC FIELDS ========== */}
                  {state.documentType === 'بيع_وشراء_طور_انجاز_نهائي' && (
                    <div className="space-y-6 bg-teal-50 p-6 rounded-lg border-2 border-teal-400">
                      <h4 className="text-lg font-bold text-teal-900">المرحلة الثانية: العقد النهائي – المتطلبات الخاصة</h4>

                      {/* Preliminary Contract References */}
                      <div className="bg-white p-4 rounded-lg border border-blue-400">
                        <h5 className="text-sm font-bold text-blue-900 mb-4">ب – مراجع العقد الابتدائي (إلزامي للتطابق)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ العقد الابتدائي</label>
                            <input
                              type="date"
                              value={property.preliminaryContractDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractDate', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم التسجيل</label>
                            <input
                              type="text"
                              value={property.preliminaryContractNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractNumber', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">اسم الموثق/العدل</label>
                            <input
                              type="text"
                              value={property.preliminaryContractNotary || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryContractNotary', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مراجع الأداءات السابقة</label>
                            <input
                              type="text"
                              value={property.preliminaryPaymentReferences || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryPaymentReferences', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded"
                              placeholder="مثال: 100,000 درهم بتاريخ 01/01/2025"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مراجع الضمانة البنكية</label>
                            <input
                              type="text"
                              value={property.preliminaryGuaranteeReferences || ''}
                              onChange={(e) => handlePropertyChange(index, 'preliminaryGuaranteeReferences', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded"
                              placeholder="رقم وثيقة الضمان ومرجعها"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Building Completion Certificate */}
                      <div className="bg-white p-4 rounded-lg border-2 border-red-500">
                        <h5 className="text-sm font-bold text-red-900 mb-2">⚠ و – شهادة السكن/المطابقة (شرط جوهري)</h5>
                        <p className="text-xs text-red-800 mb-4 font-semibold">بدون هذه الشهادة → العقار غير قابل لنقل الملكية نهائيًا</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الشهادة</label>
                            <input
                              type="text"
                              value={property.occupancyCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ الإصدار</label>
                            <input
                              type="date"
                              value={property.occupancyCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateDate', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الجهة المصدرة</label>
                            <input
                              type="text"
                              value={property.occupancyCertificateIssuedBy || ''}
                              onChange={(e) => handlePropertyChange(index, 'occupancyCertificateIssuedBy', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded"
                              placeholder="البلدية/الجماعة"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">هل المبني مطابق للتصاميم؟</label>
                          <div className="flex gap-4 mb-3">
                            {['نعم', 'لا'].map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  value={option}
                                  checked={property.isConstructionCompliant === option}
                                  onChange={(e) => handlePropertyChange(index, 'isConstructionCompliant', e.target.value)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm font-semibold">{option}</span>
                              </label>
                            ))}
                          </div>
                          {property.isConstructionCompliant === 'لا' && (
                            <textarea
                              value={property.complianceNotes || ''}
                              onChange={(e) => handlePropertyChange(index, 'complianceNotes', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded text-sm"
                              placeholder="وضّح الاختلافات..."
                              rows={2}
                            />
                          )}
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">رفع شهادة السكن</label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'occupancyCertificateFile', e.target.files?.[0] || null)}
                            className="w-full p-2 border border-red-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Final Title Deed Details */}
                      <div className="bg-white p-4 rounded-lg border border-cyan-300">
                        <h5 className="text-sm font-bold text-cyan-900 mb-4">ج – سند التملك النهائي</h5>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">نوع السند</label>
                          <select
                            value={property.finalTitleType || ''}
                            onChange={(e) => handlePropertyChange(index, 'finalTitleType', e.target.value)}
                            className="w-full p-2 border border-cyan-300 rounded"
                          >
                            <option value="">اختر نوع السند</option>
                            <option value="رسم_عقاري">رسم عقاري</option>
                            <option value="مطلب_تحفيظ">مطلب تحفيظ</option>
                            <option value="رسم_ملكية">رسم ملكية</option>
                            <option value="وثائق_تقنية">وثائق تقنية + مسح</option>
                          </select>
                        </div>

                        {(property.finalTitleType === 'رسم_عقاري' || property.finalTitleType === 'رسم_ملكية') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الرسم العقاري المفرز</label>
                              <input
                                type="text"
                                value={property.finalTitleNumber || ''}
                                onChange={(e) => handlePropertyChange(index, 'finalTitleNumber', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الرقم الأم</label>
                              <input
                                type="text"
                                value={property.parentTitleNumber || ''}
                                onChange={(e) => handlePropertyChange(index, 'parentTitleNumber', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded"
                              />
                            </div>
                          </div>
                        )}

                        {(property.type === 'محفظ' || property.type === 'مزيج') && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">بيانات التحملات</label>
                              <textarea
                                value={property.chargesDetails || ''}
                                onChange={(e) => handlePropertyChange(index, 'chargesDetails', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الارتفاقات</label>
                              <textarea
                                value={property.encumbrances || ''}
                                onChange={(e) => handlePropertyChange(index, 'encumbrances', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">التقييدات السابقة</label>
                              <textarea
                                value={property.previousRegistrations || ''}
                                onChange={(e) => handlePropertyChange(index, 'previousRegistrations', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                        )}

                        {property.type === 'غير_محفظ' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">المستندات الفنية</label>
                              <textarea
                                value={property.technicalDocuments || ''}
                                onChange={(e) => handlePropertyChange(index, 'technicalDocuments', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">تفاصيل المسح</label>
                              <textarea
                                value={property.surveyDetails || ''}
                                onChange={(e) => handlePropertyChange(index, 'surveyDetails', e.target.value)}
                                className="w-full p-2 border border-cyan-300 rounded text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Property Usage */}
                      <div className="bg-white p-4 rounded-lg border border-yellow-300">
                        <h5 className="text-sm font-bold text-yellow-900 mb-4">د – العقار محل التفويت</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التخصيص (الاستخدام)</label>
                            <select
                              value={property.propertyUsage || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyUsage', e.target.value)}
                              className="w-full p-2 border border-yellow-300 rounded"
                            >
                              <option value="">اختر التخصيص</option>
                              <option value="سكني">سكني</option>
                              <option value="مهني">مهني</option>
                              <option value="تجاري">تجاري</option>
                              <option value="مختلط">مختلط</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">محتويات العقار</label>
                            <input
                              type="text"
                              value={property.propertyContents || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyContents', e.target.value)}
                              className="w-full p-2 border border-yellow-300 rounded"
                              placeholder="مثال: garage + cave + balcony"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Final Payment Details */}
                      <div className="bg-white p-4 rounded-lg border border-green-400">
                        <h5 className="text-sm font-bold text-green-900 mb-4">ز – الثمن النهائي</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الثمن الإجمالي</label>
                            <input
                              type="number"
                              value={property.totalFinalPrice || ''}
                              onChange={(e) => handlePropertyChange(index, 'totalFinalPrice', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border border-green-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الأداءات السابقة</label>
                            <input
                              type="number"
                              value={property.previousPayments || ''}
                              onChange={(e) => handlePropertyChange(index, 'previousPayments', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border border-green-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">المبالغ المتبقية</label>
                            <input
                              type="number"
                              value={property.remainingAmount || ''}
                              onChange={(e) => handlePropertyChange(index, 'remainingAmount', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border border-green-300 rounded"
                              readOnly
                              title="يُحسب تلقائياً"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الإبراءات البنكية</label>
                            <textarea
                              value={property.bankReceiptsDetails || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankReceiptsDetails', e.target.value)}
                              className="w-full p-2 border border-green-300 rounded text-sm"
                              placeholder="مراجع الإيصالات البنكية"
                              rows={1}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bank Clearance Certificate */}
                      <div className="bg-white p-4 rounded-lg border-2 border-orange-500">
                        <h5 className="text-sm font-bold text-orange-900 mb-2">4️⃣ شهادة الإبراء من الضمانة البنكية</h5>
                        <p className="text-xs text-orange-800 mb-4 font-semibold">غياب شهادة الإبراء البنكي = خطر على نقل الملكية</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم شهادة الإبراء</label>
                            <input
                              type="text"
                              value={property.bankClearanceCertificateNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateNumber', e.target.value)}
                              className="w-full p-2 border border-orange-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ الإبراء</label>
                            <input
                              type="date"
                              value={property.bankClearanceCertificateDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateDate', e.target.value)}
                              className="w-full p-2 border border-orange-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">نوع الضمان السابق</label>
                            <select
                              value={property.bankClearanceGuaranteeType || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceGuaranteeType', e.target.value)}
                              className="w-full p-2 border border-orange-300 rounded"
                            >
                              <option value="">اختر النوع</option>
                              <option value="بنكية">ضمانة بنكية</option>
                              <option value="تأمين">تأمين</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مدة التغطية السابقة</label>
                            <input
                              type="text"
                              value={property.bankClearanceCoveragePeriod || ''}
                              onChange={(e) => handlePropertyChange(index, 'bankClearanceCoveragePeriod', e.target.value)}
                              className="w-full p-2 border border-orange-300 rounded"
                              placeholder="مثال: من 01/01/2024 إلى 31/12/2025"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">رفع شهادة الإبراء</label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'bankClearanceCertificateFile', e.target.files?.[0] || null)}
                            className="w-full p-2 border border-orange-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Delivery Details */}
                      <div className="bg-white p-4 rounded-lg border border-purple-400">
                        <h5 className="text-sm font-bold text-purple-900 mb-4">ح – التسليم</h5>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">حالة العقار عند التسليم</label>
                          <textarea
                            value={property.deliveryCondition || ''}
                            onChange={(e) => handlePropertyChange(index, 'deliveryCondition', e.target.value)}
                            className="w-full p-2 border border-purple-300 rounded text-sm"
                            placeholder="وصف حالة العقار عند تسليمه"
                            rows={2}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">ملاحظات تقنية أثناء التسليم</label>
                          <textarea
                            value={property.technicalObservations || ''}
                            onChange={(e) => handlePropertyChange(index, 'technicalObservations', e.target.value)}
                            className="w-full p-2 border border-purple-300 rounded text-sm"
                            placeholder="أي عيوب أو ملاحظات تقنية"
                            rows={2}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">ملاحظات امتثال دفتر التحملات</label>
                          <textarea
                            value={property.specificationComplianceNotes || ''}
                            onChange={(e) => handlePropertyChange(index, 'specificationComplianceNotes', e.target.value)}
                            className="w-full p-2 border border-purple-300 rounded text-sm"
                            placeholder="هل تم احترام دفتر التحملات بالكامل؟"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">رفع محضر التسليم (مهم)</label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handlePropertyChange(index, 'deliveryReportFile', e.target.files?.[0] || null)}
                            className="w-full p-2 border border-purple-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Final Contract Warnings */}
                      <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                        <h5 className="text-sm font-bold text-red-900 mb-3">⚠ تنبيهات قانونية للعقد النهائي:</h5>
                        <ul className="space-y-2 text-xs text-red-900 list-disc list-inside">
                          <li>لا يتم تحرير العقد النهائي قبل شهادة السكن + المطابقة</li>
                          <li>في حالة عدم التجزيء العقاري → المنعش لا يمكنه بيع حصص مفرزة</li>
                          <li>اختلاف بين التصاميم والمبني = مسؤولية مدنية + تقاضي</li>
                          <li>المنعش ملزم باحترام أجل الإنجاز → التأخير يخول للمشتري التعويض</li>
                          <li>غياب شهادة الإبراء البنكي = خطر على نقل الملكية</li>
                          <li>نظام الأداء المغربي (بدون نسب إلزامية) قد يفتح باب الاستغلال والغبن</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ========== SHARED PROPERTY PURCHASE (رسم شراء في الملكية المشتركة) ========== */}
                  {state.documentType === 'بيع_وشراء_ملكية_مشتركة' && (
                    <>
                      {/* Section B: Property Classification */}
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-400">
                        <h5 className="text-sm font-bold text-blue-900 mb-3">ب – موضوع البيع</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">نوع العقار</label>
                            <select
                              value={property.propertyClassification || ''}
                              onChange={(e) => handlePropertyChange(index, 'propertyClassification', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                            >
                              <option value="">-- اختر النوع --</option>
                              <option value="شقة">شقة سكنية</option>
                              <option value="محل_تجاري">محل تجاري</option>
                              <option value="loft">Loft</option>
                              <option value="مكتب">مكتب</option>
                              <option value="قبو">قبو</option>
                              <option value="موقف">موقف</option>
                              <option value="سطح">سطح</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Fractional Share Details */}
                      <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-400">
                        <h5 className="text-sm font-bold text-cyan-900 mb-3">ج – الجزء المفرز</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">المساحة (م²)</label>
                            <input
                              type="number"
                              value={property.area_m2 || ''}
                              onChange={(e) => handlePropertyChange(index, 'area_m2', parseFloat(e.target.value) || undefined)}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الطابق</label>
                            <input
                              type="text"
                              value={property.floor || ''}
                              onChange={(e) => handlePropertyChange(index, 'floor', isNaN(parseInt(e.target.value)) ? undefined : parseInt(e.target.value))}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                              placeholder="الطابق (مثال: 3)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الباب</label>
                            <input
                              type="text"
                              value={property.unitDoorNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'unitDoorNumber', e.target.value)}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                              placeholder="رقم الباب"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">رقم الرسم العقاري المفرز (إن وجد)</label>
                            <input
                              type="text"
                              value={property.registeredFractionalNumber || ''}
                              onChange={(e) => handlePropertyChange(index, 'registeredFractionalNumber', e.target.value)}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                              placeholder="مثال: 12345"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">التخصيص / الاستعمال</label>
                            <select
                              value={property.unitUsage || ''}
                              onChange={(e) => handlePropertyChange(index, 'unitUsage', e.target.value)}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                            >
                              <option value="">-- اختر --</option>
                              <option value="سكني">سكني</option>
                              <option value="مهني">مهني</option>
                              <option value="تجاري">تجاري</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">نسبة الملكية (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={property.fractionalOwnershipPercentage || ''}
                              onChange={(e) => handlePropertyChange(index, 'fractionalOwnershipPercentage', parseFloat(e.target.value) || undefined)}
                              className="w-full p-2 border border-cyan-300 rounded text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">المحتويات (تفاصيل الغرف والمرافق)</label>
                          <textarea
                            value={property.unitContents || ''}
                            onChange={(e) => handlePropertyChange(index, 'unitContents', e.target.value)}
                            className="w-full p-2 border border-cyan-300 rounded text-sm"
                            placeholder="غرفة معيشة، 2 غرفة نوم، مطبخ، حمامان..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Section D: Co-ownership System Compliance - CRITICAL */}
                      <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-red-900 mb-3">د – نظام الملكية المشتركة (مواد 10-11 من القانون)</h5>
                        <p className="text-xs text-red-800 mb-3 font-semibold">⚠️ إلزامي: يجب التنصيص صراحة على موافقة المشتري بعد الاطلاع على نظام الملكية</p>
                        
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.isAwareByCopyrightSystem === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'isAwareByCopyrightSystem', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">هل اطلع المشتري على نظام الملكية المشتركة؟</span>
                              <span className="block text-xs text-gray-600">يتضمن حقوق والتزامات الملاك المشتركين</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.isAwareByEngineeringDesign === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'isAwareByEngineeringDesign', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">هل اطلع على التصميم الهندسي ودفتر التحملات؟</span>
                              <span className="block text-xs text-gray-600">يتضمن المواصفات التقنية والعيوب المكتشفة</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.isAwareByInternalRegulation === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'isAwareByInternalRegulation', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">هل اطلع على النظام الداخلي للعمارة؟</span>
                              <span className="block text-xs text-gray-600">يتضمن القوانين الداخلية والعقوبات التأديبية</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.hasApprovedCommonCharges === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'hasApprovedCommonCharges', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">هل وافق المشتري على الأعباء المشتركة؟</span>
                              <span className="block text-xs text-gray-600">نسبته في الرسوم السنوية والصيانة والحراسة</span>
                            </div>
                          </label>
                        </div>

                        {property.isAwareByCopyrightSystem === 'لا' && (
                          <div className="mt-4 p-3 bg-red-200 border border-red-400 rounded">
                            <p className="text-xs font-bold text-red-900">⚠️ تحذير قانوني:</p>
                            <p className="text-xs text-red-900 mt-1">عدم موافقة المشتري على نظام الملكية المشتركة = يفتح الباب للطعن في العقد + قد يبطل حق الملكية</p>
                          </div>
                        )}
                      </div>

                      {/* Section E: Common Parts */}
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-400">
                        <h5 className="text-sm font-bold text-green-900 mb-3">هـ – الأجزاء المشتركة (مادة 3-4)</h5>
                        <p className="text-xs text-green-800 mb-3">حدد الأجزاء المشتركة التي سيستفيد منها المشتري:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { label: 'السلالم', value: 'سلالم' },
                            { label: 'الممرات والمدخل', value: 'ممرات' },
                            { label: 'الأسطح', value: 'أسطح' },
                            { label: 'الحدائق', value: 'حدائق' },
                            { label: 'مواقف السيارات', value: 'مواقف' },
                            { label: 'الواجهات', value: 'واجهات' },
                            { label: 'المصاعد', value: 'مصاعد' },
                            { label: 'محركات التهوية', value: 'محركات' },
                            { label: 'التجهيزات التقنية', value: 'تجهيزات' },
                          ].map((part) => (
                            <label key={part.value} className="flex items-center gap-2 p-2 bg-white rounded border border-green-300 cursor-pointer hover:bg-green-50">
                              <input
                                type="checkbox"
                                checked={(property.commonPartsDescription || '').includes(part.value)}
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
                                className="w-4 h-4"
                              />
                              <span className="text-xs font-semibold text-gray-800">{part.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Section F: Common Charges */}
                      <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-400">
                        <h5 className="text-sm font-bold text-amber-900 mb-3">و – الأعباء المشتركة (Charges de Copropriété)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">نسبة المساهمة (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={property.chargesContributionPercentage || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesContributionPercentage', parseFloat(e.target.value) || undefined)}
                              className="w-full p-2 border border-amber-300 rounded text-sm"
                              placeholder="5.25"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">أنواع الأعباء</label>
                            <select
                              value={property.chargesTypes || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesTypes', e.target.value)}
                              className="w-full p-2 border border-amber-300 rounded text-sm"
                            >
                              <option value="">-- اختر --</option>
                              <option value="حراسة">حراسة + أمان</option>
                              <option value="إنارة">إنارة عامة</option>
                              <option value="مصعد">صيانة المصاعد</option>
                              <option value="حدائق">صيانة الحدائق</option>
                              <option value="كل_أنواع">جميع الأنواع</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">آجال التسوية</label>
                            <select
                              value={property.chargesSettlementTerms || ''}
                              onChange={(e) => handlePropertyChange(index, 'chargesSettlementTerms', e.target.value)}
                              className="w-full p-2 border border-amber-300 rounded text-sm"
                            >
                              <option value="">-- اختر --</option>
                              <option value="شهري">شهري</option>
                              <option value="فصلي">فصلي</option>
                              <option value="سنوي">سنوي</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-amber-100 border border-amber-400 rounded">
                          <p className="text-xs font-semibold text-amber-900">⚠️ ملاحظة مهمة:</p>
                          <p className="text-xs text-amber-900 mt-1">عدم التنصيص الواضح على الأعباء والنسب = قد يؤدي لنزاعات قضائية بين الملاك + تأخير في التسوية</p>
                        </div>
                      </div>

                      {/* Section H: Property Ownership Status (For Registered Properties) */}
                      {property.type === 'محفظ' || property.type === 'مزيج' && (
                        <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-400">
                          <h5 className="text-sm font-bold text-indigo-900 mb-3">ح – وضعية الملكية (العقارات المحفظة)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الرسم العقاري الأم</label>
                              <input
                                type="text"
                                value={property.parentTitleRef || ''}
                                onChange={(e) => handlePropertyChange(index, 'parentTitleRef', e.target.value)}
                                className="w-full p-2 border border-indigo-300 rounded text-sm"
                                placeholder="مثال: 2023/45678"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الرسم المفرز (إن وجد)</label>
                              <input
                                type="text"
                                value={property.fractionalTitleRef || ''}
                                onChange={(e) => handlePropertyChange(index, 'fractionalTitleRef', e.target.value)}
                                className="w-full p-2 border border-indigo-300 rounded text-sm"
                                placeholder="مثال: 2024/12345"
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الأعباء والارتفاقات المشتركة</label>
                            <textarea
                              value={property.commonEncumbrances || ''}
                              onChange={(e) => handlePropertyChange(index, 'commonEncumbrances', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded text-sm"
                              placeholder="مثال: ارتفاق الممر، مجاري المياه العامة..."
                              rows={2}
                            />
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">الرهون والتقييدات</label>
                            <textarea
                              value={property.commonMortgages || ''}
                              onChange={(e) => handlePropertyChange(index, 'commonMortgages', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded text-sm"
                              placeholder="إن وجدت: رهون بنكية، ضمانات..."
                              rows={2}
                            />
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">ديون اتحاد الملاك</label>
                            <input
                              type="text"
                              value={property.associationDebts || ''}
                              onChange={(e) => handlePropertyChange(index, 'associationDebts', e.target.value)}
                              className="w-full p-2 border border-indigo-300 rounded text-sm"
                              placeholder="مثال: لا توجد ديون / ديون معلقة..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Smart Case Questions for Shared Property */}
                      <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-yellow-900 mb-3">🤖 أسئلة الحالات الذكية (للإرشاد):</h5>
                        
                        {/* Case 1: Co-ownership System Non-Compliance */}
                        {property.isAwareByCopyrightSystem === 'لا' && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mb-3">
                            <p className="text-xs font-bold text-red-900 mb-2">❌ حالة 1: عدم اطلاع المشتري على النظام</p>
                            <p className="text-xs text-red-800">السؤال المقترح: هل يوافق البائع على إتاحة جميع وثائق الملكية المشتركة للمشتري قبل توقيع العقد؟</p>
                          </div>
                        )}

                        {/* Case 2: Registered Property with Encumbrances */}
                        {property.type === 'محفظ' && property.commonEncumbrances && (
                          <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded mb-3">
                            <p className="text-xs font-bold text-orange-900 mb-2">⚠️ حالة 2: وجود ارتفاقات على العقار المشترك</p>
                            <p className="text-xs text-orange-800">السؤال المقترح: هل تم إبلاغ المشتري بالكامل عن الارتفاقات والقيود المسجلة؟</p>
                          </div>
                        )}

                        {/* Case 3: High Ownership Percentage */}
                        {property.fractionalOwnershipPercentage && property.fractionalOwnershipPercentage > 50 && (
                          <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded mb-3">
                            <p className="text-xs font-bold text-purple-900 mb-2">👥 حالة 3: ملكية كبيرة (أكثر من 50%)</p>
                            <p className="text-xs text-purple-800">السؤال المقترح: هل يتحمل المشتري مسؤوليات إدارية متزايدة كصاحب حصة كبرى؟</p>
                          </div>
                        )}

                        {/* Case 4: High Charges Contribution */}
                        {property.chargesContributionPercentage && property.chargesContributionPercentage > 20 && (
                          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded mb-3">
                            <p className="text-xs font-bold text-indigo-900 mb-2">💰 حالة 4: أعباء مشتركة مرتفعة</p>
                            <p className="text-xs text-indigo-800">السؤال المقترح: هل اطلع المشتري على سجل الأعباء الماضية وأسباب ارتفاعها؟</p>
                          </div>
                        )}

                        {/* Case 5: Association Debts */}
                        {property.associationDebts && property.associationDebts.toLowerCase().includes('ديون') && (
                          <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded">
                            <p className="text-xs font-bold text-red-900 mb-2">⛔ حالة 5: وجود ديون لاتحاد الملاك</p>
                            <p className="text-xs text-red-800">السؤال المقترح: هل وافق المشتري على تحمل نسبته من الديون المتراكمة؟</p>
                          </div>
                        )}
                      </div>

                      {/* Shared Property Warnings */}
                      <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                        <h5 className="text-sm font-bold text-red-900 mb-3">⚠ تنبيهات قانونية للملكية المشتركة:</h5>
                        <ul className="space-y-2 text-xs text-red-900 list-disc list-inside">
                          <li>عدم التنصيص على نسب الملكية بوضوح = بطلان جزئي للعقد</li>
                          <li>عدم تحديد الأعباء المشتركة بدقة = نزاعات مستقبلية بين الملاك</li>
                          <li>عدم موافقة المشتري على النظام = حق الطعن في العقد لمدة 10 سنوات</li>
                          <li>وجود ديون لاتحاد الملاك = قد تنتقل للمالك الجديد</li>
                          <li>التعديلات الهندسية بدون ترخيص = مسؤولية مدنية + عقوبات</li>
                          <li>غياب محضر الحالة الظاهرة = عدم الاعتراف بالعيوب الموجودة</li>
                        </ul>
                      </div>
                    </>
                  )}

                  {/* ========== RENTAL-TO-OWN CONTRACT (عقد ايجار المفضي الى تملك عقار) ========== */}
                  {state.documentType === 'عقد_ايجار_المفضي_الى_تملك' && (
                    <>
                      {/* Section 1: Legal Requirements (Article 4) */}
                      <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-red-900 mb-3">2️⃣ المتطلبات القانونية والشكليات الإلزامية (المادة 4)</h5>
                        <p className="text-xs text-red-800 mb-4 font-semibold">«يجب أن يحرر عقد الإيجار المفضي إلى تملك العقار بموجب محرر رسمي أو محرر ثابت التاريخ… تحت طائلة البطلان.»</p>
                        
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.isFormallyCertified === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'isFormallyCertified', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">✔ تحرير رسمي</span>
                              <span className="block text-xs text-gray-600">العقد موثق من قبل مهني قانوني رسمي</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-2 bg-white rounded border border-red-300">
                            <input
                              type="checkbox"
                              checked={property.hasDateProof === 'نعم'}
                              onChange={(e) => handlePropertyChange(index, 'hasDateProof', e.target.checked ? 'نعم' : 'لا')}
                              className="w-4 h-4 mt-1 flex-shrink-0"
                            />
                            <div>
                              <span className="block text-xs font-semibold text-gray-800">✔ ثبوت التاريخ</span>
                              <span className="block text-xs text-gray-600">تاريخ العقد محقق الثبوت رسميًا</span>
                            </div>
                          </label>

                          <div className="p-3 bg-white rounded border border-red-300">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">مسؤولية مهني قانوني (عدول/موثق)</label>
                            <div className="flex gap-4 mb-3">
                              {['عدل', 'موثق'].map((option) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value={option}
                                    checked={property.legalProfessionalType === option}
                                    onChange={(e) => handlePropertyChange(index, 'legalProfessionalType', e.target.value)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-xs font-semibold">{option}</span>
                                </label>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={property.legalProfessionalResponsible || ''}
                              onChange={(e) => handlePropertyChange(index, 'legalProfessionalResponsible', e.target.value)}
                              className="w-full p-2 border border-red-300 rounded text-sm"
                              placeholder="اسم المهني القانوني المسؤول (عدل/موثق)"
                            />
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-red-200 border border-red-400 rounded">
                          <p className="text-xs font-bold text-red-900">⚠️ المنع الإلزامي (المادة 14):</p>
                          <p className="text-xs text-red-900 mt-1">«لا يحق للبائع أن يطلب أو يقبل أي أداء قبل التوقيع…» = منع العربون + منع الوعد بالبيع + حماية المستهلك</p>
                        </div>
                      </div>

                      {/* Section 2: Mandatory Contract Elements (Article 7) */}
                      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-blue-900 mb-3">3️⃣ العناصر الإلزامية داخل العقد (المادة 7)</h5>
                        
                        {/* Property Description */}
                        <div className="bg-white p-4 rounded border-2 border-blue-300 mb-4">
                          <h6 className="text-xs font-bold text-blue-900 mb-3">وصف العقار</h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">المساحة (م²)</label>
                              <input
                                type="number"
                                value={property.rentalPropertyArea || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyArea', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الموقع</label>
                              <input
                                type="text"
                                value={property.rentalPropertyLocation || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyLocation', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="الحي/المنطقة"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">التخصيص</label>
                              <input
                                type="text"
                                value={property.rentalPropertyUsage || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalPropertyUsage', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="سكني/تجاري"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Terms */}
                        <div className="bg-white p-4 rounded border-2 border-blue-300 mb-4">
                          <h6 className="text-xs font-bold text-blue-900 mb-3">الشروط المالية</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">ثمن البيع النهائي (ثابت)</label>
                              <input
                                type="number"
                                value={property.finalSalePrice || ''}
                                onChange={(e) => handlePropertyChange(index, 'finalSalePrice', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">مبلغ التسبيق (إن وجد)</label>
                              <input
                                type="number"
                                value={property.downPaymentAmount || ''}
                                onChange={(e) => handlePropertyChange(index, 'downPaymentAmount', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          {property.downPaymentAmount && property.downPaymentAmount > 0 && (
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ أداء التسبيق</label>
                              <input
                                type="date"
                                value={property.downPaymentDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'downPaymentDate', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الوجيبة الكرائية الشهرية</label>
                              <input
                                type="number"
                                value={property.monthlyRentalFee || ''}
                                onChange={(e) => handlePropertyChange(index, 'monthlyRentalFee', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">الدورية</label>
                              <select
                                value={property.rentalFrequency || ''}
                                onChange={(e) => handlePropertyChange(index, 'rentalFrequency', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                              >
                                <option value="">-- اختر --</option>
                                <option value="شهري">شهري</option>
                                <option value="ربع سنوي">ربع سنوي</option>
                                <option value="نصف سنوي">نصف سنوي</option>
                                <option value="سنوي">سنوي</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">خصم من الثمن؟</label>
                              <div className="flex gap-2">
                                {['نعم', 'لا'].map((option) => (
                                  <label key={option} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      value={option}
                                      checked={property.rentalFeeDeduction === option}
                                      onChange={(e) => handlePropertyChange(index, 'rentalFeeDeduction', e.target.value)}
                                      className="w-3 h-3"
                                    />
                                    <span className="text-xs font-semibold">{option}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {property.rentalFeeDeduction === 'نعم' && (
                            <div className="mb-4">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">نسبة الخصم (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={property.deductionPercentage || ''}
                                onChange={(e) => handlePropertyChange(index, 'deductionPercentage', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>

                        {/* Insurance & Dates */}
                        <div className="bg-white p-4 rounded border-2 border-blue-300 mb-4">
                          <h6 className="text-xs font-bold text-blue-900 mb-3">التأمين والتواريخ</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">مرجع عقد التأمين</label>
                              <input
                                type="text"
                                value={property.insuranceReference || ''}
                                onChange={(e) => handlePropertyChange(index, 'insuranceReference', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="رقم العقد وشركة التأمين"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ الانتفاع</label>
                              <input
                                type="date"
                                value={property.enjoymentDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'enjoymentDate', e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">بداية احتساب الالتزامات</label>
                            <input
                              type="date"
                              value={property.obligationStartDate || ''}
                              onChange={(e) => handlePropertyChange(index, 'obligationStartDate', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        {/* Option Right */}
                        <div className="bg-white p-4 rounded border-2 border-blue-300">
                          <h6 className="text-xs font-bold text-blue-900 mb-3">حق الخيار</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">مدة حق الخيار (سنوات)</label>
                              <input
                                type="number"
                                value={property.optionRightDuration || ''}
                                onChange={(e) => handlePropertyChange(index, 'optionRightDuration', parseInt(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">السعر المحدد لممارسة الحق</label>
                              <input
                                type="number"
                                value={property.optionRightPrice || ''}
                                onChange={(e) => handlePropertyChange(index, 'optionRightPrice', parseFloat(e.target.value) || undefined)}
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">شروط حق الخيار</label>
                            <textarea
                              value={property.optionRightConditions || ''}
                              onChange={(e) => handlePropertyChange(index, 'optionRightConditions', e.target.value)}
                              className="w-full p-2 border border-blue-300 rounded text-sm"
                              placeholder="وصف شروط ممارسة حق الخيار"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Party Obligations */}
                      <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-green-900 mb-3">4️⃣ التزامات الأطراف ومخاطرها</h5>
                        
                        {/* Seller Obligations */}
                        <div className="bg-white p-4 rounded border-2 border-green-300 mb-4">
                          <h6 className="text-xs font-bold text-green-900 mb-3">التزامات البائع</h6>
                          <div className="space-y-2">
                            {[
                              { key: 'transferOwnership', label: '✔ نقل الملكية عند نهاية المدة' },
                              { key: 'insuranceObligation', label: '✔ إبرام عقد التأمين (ضمان العقار)' },
                              { key: 'noPaymentBeforeSigning', label: '✔ عدم مطالبة المكتري بأي أداء قبل التوقيع' },
                              { key: 'deliverHabitableProperty', label: '✔ تسليم العقار صالحًا للانتفاع' },
                            ].map((obligation) => (
                              <label key={obligation.key} className="flex items-start gap-2 p-2 bg-green-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={property.sellerObligations?.[obligation.key as keyof typeof property.sellerObligations] || false}
                                  onChange={(e) => handlePropertyChange(index, 'sellerObligations', {
                                    ...property.sellerObligations,
                                    [obligation.key]: e.target.checked
                                  })}
                                  className="w-4 h-4 mt-1 flex-shrink-0"
                                />
                                <span className="text-xs font-semibold text-green-900">{obligation.label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-3 p-2 bg-red-50 border border-red-300 rounded">
                            <p className="text-xs font-bold text-red-900">مخاطر الإخلال:</p>
                            <p className="text-xs text-red-900 mt-1">فسخ + تعويض + بطلان العقد + نزاعات التأخير</p>
                          </div>
                        </div>

                        {/* Tenant-Buyer Obligations */}
                        <div className="bg-white p-4 rounded border-2 border-green-300">
                          <h6 className="text-xs font-bold text-green-900 mb-3">التزامات المكتري المتملك</h6>
                          <div className="space-y-2">
                            {[
                              { key: 'payRentalFee', label: '✔ أداء الوجيبة الكرائية في أجلها' },
                              { key: 'respectOptionRight', label: '✔ احترام حق الخيار في الأجل المحدد' },
                              { key: 'maintainProperty', label: '✔ المحافظة على العقار وعدم إلحاق الضرر به' },
                            ].map((obligation) => (
                              <label key={obligation.key} className="flex items-start gap-2 p-2 bg-green-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={property.tenantBuyerObligations?.[obligation.key as keyof typeof property.tenantBuyerObligations] || false}
                                  onChange={(e) => handlePropertyChange(index, 'tenantBuyerObligations', {
                                    ...property.tenantBuyerObligations,
                                    [obligation.key]: e.target.checked
                                  })}
                                  className="w-4 h-4 mt-1 flex-shrink-0"
                                />
                                <span className="text-xs font-semibold text-green-900">{obligation.label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-3 p-2 bg-orange-50 border border-orange-300 rounded">
                            <p className="text-xs font-bold text-orange-900">مخاطر الإخلال:</p>
                            <p className="text-xs text-orange-900 mt-1">فقدان حق التملك + فسخ العقد + بقاء أداءات دون مقابل ملكي</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Termination & Extensions */}
                      <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-lg">
                        <h5 className="text-sm font-bold text-yellow-900 mb-3">5️⃣ حق الخيار وفسخ العقد</h5>
                        <p className="text-xs text-yellow-800 mb-4 font-semibold">المكتري يمكنه: شراء العقار بثمن البيع النهائي + التنازل وفسخ العقد + طلب تمديد الأجل (إن نص عليه العقد)</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white p-4 rounded border-2 border-yellow-300">
                            <label className="block text-xs font-semibold text-gray-700 mb-3">هل مارس المكتري حق الخيار؟</label>
                            <div className="space-y-2">
                              {['نعم', 'لا', 'قيد_الدراسة'].map((option) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    value={option}
                                    checked={property.exercisedOptionRight === option}
                                    onChange={(e) => handlePropertyChange(index, 'exercisedOptionRight', e.target.value)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-xs font-semibold text-gray-800">{option === 'نعم' ? 'نعم - تم الشراء' : option === 'لا' ? 'لا - فسخ العقد' : 'قيد الدراسة'}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {property.exercisedOptionRight === 'نعم' && (
                            <div className="bg-white p-4 rounded border-2 border-green-300">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">تاريخ ممارسة الحق</label>
                              <input
                                type="date"
                                value={property.optionRightExerciseDate || ''}
                                onChange={(e) => handlePropertyChange(index, 'optionRightExerciseDate', e.target.value)}
                                className="w-full p-2 border border-green-300 rounded text-sm"
                              />
                            </div>
                          )}

                          {property.exercisedOptionRight === 'لا' && (
                            <div className="bg-white p-4 rounded border-2 border-red-300">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">سبب الفسخ</label>
                              <input
                                type="text"
                                value={property.terminationReason || ''}
                                onChange={(e) => handlePropertyChange(index, 'terminationReason', e.target.value)}
                                className="w-full p-2 border border-red-300 rounded text-sm"
                                placeholder="تنازل المكتري عن حقه"
                              />
                            </div>
                          )}
                        </div>

                        {/* Extension Possibility */}
                        <div className="bg-white p-4 rounded border-2 border-yellow-300 mb-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-3">هل يمكن تمديد الأجل؟</label>
                          <div className="flex gap-4 mb-3">
                            {['نعم', 'لا'].map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  value={option}
                                  checked={property.extensionPossibility === option}
                                  onChange={(e) => handlePropertyChange(index, 'extensionPossibility', e.target.value)}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-semibold">{option}</span>
                              </label>
                            ))}
                          </div>
                          {property.extensionPossibility === 'نعم' && (
                            <>
                              <label className="block text-xs font-semibold text-gray-700 mb-2">هل تم طلب التمديد؟</label>
                              <div className="flex gap-4 mb-3">
                                {['نعم', 'لا'].map((option) => (
                                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      value={option}
                                      checked={property.extensionRequested === option}
                                      onChange={(e) => handlePropertyChange(index, 'extensionRequested', e.target.value)}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-xs font-semibold">{option}</span>
                                  </label>
                                ))}
                              </div>
                              <textarea
                                value={property.extensionTerms || ''}
                                onChange={(e) => handlePropertyChange(index, 'extensionTerms', e.target.value)}
                                className="w-full p-2 border border-yellow-300 rounded text-sm"
                                placeholder="شروط التمديد (مدته، الوجيبة الجديدة، إلخ)"
                                rows={2}
                              />
                            </>
                          )}
                        </div>

                        {/* Termination Conditions */}
                        <div className="bg-white p-4 rounded border-2 border-yellow-300">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">شروط الفسخ والتعويضات</label>
                          <textarea
                            value={property.terminationConditions || ''}
                            onChange={(e) => handlePropertyChange(index, 'terminationConditions', e.target.value)}
                            className="w-full p-2 border border-yellow-300 rounded text-sm mb-3"
                            placeholder="شروط فسخ العقد (الإخطار، الأجل، إلخ)"
                            rows={2}
                          />
                          <textarea
                            value={property.compensationDetails || ''}
                            onChange={(e) => handlePropertyChange(index, 'compensationDetails', e.target.value)}
                            className="w-full p-2 border border-yellow-300 rounded text-sm"
                            placeholder="التعويضات المحتملة عند الفسخ"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Critical Warnings */}
                      <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
                        <h5 className="text-sm font-bold text-red-900 mb-3">⚠ تنبيهات قانونية حرجة:</h5>
                        <ul className="space-y-2 text-xs text-red-900 list-disc list-inside">
                          <li>عدم احترام الشكل الرسمي = بطلان العقد الكامل</li>
                          <li>أي أداء قبل التوقيع = باطل ولا يُحتسب</li>
                          <li>عدم تحديد حق الخيار بوضوح = نزاعات حول التملك</li>
                          <li>عدم تحرير شروط الفسخ = تطبيق القانون (قد لا يحسب الأداءات)</li>
                          <li>فقدان عقد التأمين = مسؤولية البائع عن أي تلف</li>
                          <li>عدم توثيق تاريخ الانتفاع = نزاعات حول بداية الكراء</li>
                        </ul>
                      </div>
                    </>
                  )}
                </>
              )}
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
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                properties: tempProperties,
                step: 3,
              }));
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: الشواهد الادارية
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 3 (بديل): تفاصيل عقد بيع حق الهواء والتعلية
  // ============================================================================

