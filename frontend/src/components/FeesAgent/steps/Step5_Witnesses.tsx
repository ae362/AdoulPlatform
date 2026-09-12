import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { Witness } from '../../../types/feesAgentTypes';
import { createEmptyWitness } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, Users
} from 'lucide-react';

export const Step5_Witnesses: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const witnesses = state.witnesses || [];
    const isAra = (state.documentType as string) === 'ara' || state.documentType === 'اراثة';
    const isSale = ['بيع_وشراء', 'بيع_وشراء_معنوي', 'بيع_وشراء_ملكية_مشتركة', 'بيع_وشراء_طور_انجاز_ابتدائي', 'بيع_وشراء_طور_انجاز_نهائي'].includes(state.documentType) || (state.documentType || '').includes('بيع') || (state.documentType || '').includes('شراء');
    const isMarriage = state.documentType === 'زواج' || state.documentType === 'زواج_مختلط';

    const handleWitnessChange = (index: number, field: keyof Witness, value: any) => {
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
          const updatedWitnesses = [...witnesses];
          updatedWitnesses[index] = { ...updatedWitnesses[index], [field]: fileObj };
          setState((prev) => ({ ...prev, witnesses: updatedWitnesses }));
        };
        reader.readAsDataURL(value);
        return;
      }
      const updatedWitnesses = [...witnesses];
      updatedWitnesses[index] = { ...updatedWitnesses[index], [field]: value };
      setState((prev) => ({ ...prev, witnesses: updatedWitnesses }));
    };

    const addWitness = () => {
      if (witnesses.length >= 12) {
        alert('لا يمكن إضافة أكثر من 12 شاهد');
        return;
      }
      setState((prev) => ({
        ...prev,
        witnesses: [...(prev.witnesses || []), createEmptyWitness()],
      }));
    };

    const removeWitness = (index: number) => {
      const updatedWitnesses = witnesses.filter((_, i) => i !== index);
      setState((prev) => ({ ...prev, witnesses: updatedWitnesses }));
    };

    return (
      <div className="space-y-8" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50/90 via-blue-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 border border-cyan-200">
              <Users className="h-3.5 w-3.5 text-cyan-600" />
              <span>{isSale ? 'المرحلة 6 من 8' : isMarriage ? 'شهود عقد الزواج' : 'مجلس الإشهاد والشهود'}</span>
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
              {state.documentType || 'مجلس الإشهاد'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2">
            <span>👥</span>
            <span>{isSale ? 'الخطوة السادسة: بيانات الشهود ومجلس التلقي' : 'الخطوة الخامسة: بيانات الشهود ومجلس العقد'}</span>
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {isMarriage
              ? 'إدخال بيانات الشاهدين العدلين أو شهود العقد مع التحقق من الهويات والأهلية الشرعية.'
              : 'أدخل بيانات الشهود المستمعين أو شهود العقد (الحد الأدنى حسب مقتضيات رسم المعاملة).'}
          </p>
        </div>

        <div className="space-y-6">
          {witnesses.map((witness, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all relative space-y-4">
              {witnesses.length > 1 && (
                <button
                  onClick={() => removeWitness(index)}
                  className="absolute top-4 left-4 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
                >
                  ✕ حذف
                </button>
              )}
              
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 text-xs font-black">
                  {index + 1}
                </span>
                <h4 className="text-base font-black text-slate-800">بيانات الشاهد رقم {index + 1}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    value={witness.name}
                    onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="الاسم الكامل"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={witness.fatherName}
                    onChange={(e) => handleWitnessChange(index, 'fatherName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={witness.motherName}
                    onChange={(e) => handleWitnessChange(index, 'motherName', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={witness.dateOfBirth}
                    onChange={(e) => handleWitnessChange(index, 'dateOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">مكان الازدياد</label>
                  <input
                    type="text"
                    value={witness.placeOfBirth || ''}
                    onChange={(e) => handleWitnessChange(index, 'placeOfBirth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم البطاقة الوطنية</label>
                  <input
                    type="text"
                    value={witness.idNumber}
                    onChange={(e) => handleWitnessChange(index, 'idNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="AB123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ إصدار البطاقة</label>
                  <input
                    type="date"
                    value={witness.idIssueDate}
                    onChange={(e) => handleWitnessChange(index, 'idIssueDate', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الجنسية</label>
                  <select
                    value={witness.nationality || ''}
                    onChange={(e) => handleWitnessChange(index, 'nationality', e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">—</option>
                    <option value="مغربي">مغربي</option>
                    <option value="اجنبي">أجنبي</option>
                  </select>
                </div>

                {witness.nationality === 'اجنبي' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      الاسم الكامل (بالأحرف اللاتينية)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={witness.nameLatin || ''}
                      onChange={(e) => handleWitnessChange(index, 'nameLatin', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Full name in Latin alphabet"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">صورة البطاقة الوطنية</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleWitnessChange(index, 'idImage', file);
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                  />
                  {witness.idImage && (
                    <div className="mt-1.5 flex items-center justify-between text-xs bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md">
                      <span className="truncate font-medium">📎 تم إرفاق: {(witness.idImage as any)?.name || 'صورة البطاقة'}</span>
                      <button
                        type="button"
                        onClick={() => handleWitnessChange(index, 'idImage', null)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm"
                        title="حذف المرفق"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    value={witness.address}
                    onChange={(e) => handleWitnessChange(index, 'address', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="العنوان الكامل"
                  />
                </div>
              </div>

              {/* Lineage Proof Specific Questions */}
              {state.documentType === 'ثبوت_نسب_ببينة_السماع' && (
                <div className="mt-6 space-y-4 bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
                  <h5 className="text-lg font-bold text-yellow-900 mb-4">أسئلة السماع الفاشي المستفيض</h5>
                  
                  {/* Q1: Do you know the applicant well? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س1: هل تعرف طالبة الشهادة معرفة تامة؟</label>
                    <div className="flex gap-4">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.knowsApplicantWell === option}
                            onChange={() => handleWitnessChange(index, 'knowsApplicantWell', option)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q2: How long have you known the family? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س2: منذ متى تعرف الأسرة؟</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'أقل من 5 سنوات', label: 'أقل من 5 سنوات' },
                        { value: '5-10 سنوات', label: '5–10 سنوات' },
                        { value: 'أكثر من 10 سنوات', label: 'أكثر من 10 سنوات (مفضل فقهياً وقضائياً)' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.yearsOfKnowledge === option.value}
                            onChange={() => handleWitnessChange(index, 'yearsOfKnowledge', option.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className={option.value === 'أكثر من 10 سنوات' ? 'font-bold text-green-700' : 'font-semibold'}>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q3: Source of your knowledge of lineage? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س3: مصدر معرفتك بالنسب؟</label>
                    <div className="flex flex-col gap-2">
                      {['معاشرة', 'جوار', 'قرابة', 'مصاهرة', 'مخالطة اجتماعية'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.sourceOfKnowledge === option}
                            onChange={() => handleWitnessChange(index, 'sourceOfKnowledge', option)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q4: Have you heard the widespread public rumor? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س4: هل سمعت بالسماع الفاشي المستفيض؟</label>
                    <div className="flex gap-4">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.heardPublicRumor === option}
                            onChange={() => handleWitnessChange(index, 'heardPublicRumor', option)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q5: Did the father recognize her practically? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س5: هل كان الأب يعترف بها عملياً؟</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'يضنّها', label: 'يضنّها' },
                        { value: 'يجالسها', label: 'يجالسها' },
                        { value: 'يعولها', label: 'يعولها' },
                        { value: 'يذكرها كبنته', label: 'يذكرها كبنته' },
                        { value: 'لا يعرف', label: 'لا يعرف' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={witness.fatherPracticalRecognition?.includes(option.value) || false}
                            onChange={(e) => {
                              const current = witness.fatherPracticalRecognition || '';
                              const values = current ? current.split(',').map(v => v.trim()) : [];
                              let newValues: string[];
                              
                              if (e.target.checked) {
                                newValues = [...values.filter(v => v), option.value];
                              } else {
                                newValues = values.filter(v => v !== option.value);
                              }
                              
                              handleWitnessChange(index, 'fatherPracticalRecognition', newValues.join(', '));
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q6: Is there public fame of the lineage? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س6: هل وجود شهرة بين الناس بالنسب؟</label>
                    <div className="flex gap-4">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.publicFameOfLineage === option}
                            onChange={() => handleWitnessChange(index, 'publicFameOfLineage', option)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q7: Did anyone oppose the lineage? */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">س7: هل عارض أحد النسب؟</label>
                    <div className="flex gap-4">
                      {['نعم', 'لا'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={witness.anyoneOpposedLineage === option}
                            onChange={() => handleWitnessChange(index, 'anyoneOpposedLineage', option)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="font-semibold">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {witnesses.length < 12 && (
            <button
              onClick={addWitness}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
            >
              + إضافة شاهد آخر
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            onClick={() => setState((prev) => ({
              ...prev,
              step: prev.documentType === 'ثبوت_نسب_ببينة_السماع' ? 3 : 4
            }))}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>← السابق</span>
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 6 }))}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>التالي: التواريخ والمراجع ومجلس الإشهاد</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 6: التواريخ والمراجع
  // ============================================================================

