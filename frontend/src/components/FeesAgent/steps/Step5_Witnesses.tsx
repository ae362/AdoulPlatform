import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type { Witness } from '../../../types/feesAgentTypes';
import { createEmptyWitness } from '../../../utils/feesAgentUtils';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar
} from 'lucide-react';

export const Step5_Witnesses: React.FC<DocumentWizardProps> = ({ state, setState }) => {
    const witnesses = state.witnesses || [];
    const isAra = (state.documentType as string) === 'ara' || state.documentType === 'اراثة';

    const handleWitnessChange = (index: number, field: keyof Witness, value: any) => {
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

    // Initialize with one witness if empty
    React.useEffect(() => {
      if (witnesses.length === 0) {
        setState((prev) => ({ ...prev, witnesses: [createEmptyWitness()] }));
      }
    }, []);

    return (
      <div className="space-y-8">
        <div className="bg-blue-50 p-6 rounded-lg border-r-4 border-blue-400">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخطوة الخامسة: بيانات الشهود</h2>
          <p className="text-gray-700">أدخل بيانات الشهود (الحد الأقصى 12 شاهد).</p>
        </div>

        <div className="space-y-6">
          {witnesses.map((witness, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400 relative">
              {witnesses.length > 1 && (
                <button
                  onClick={() => removeWitness(index)}
                  className="absolute top-4 left-4 text-red-500 hover:text-red-700 font-semibold"
                >
                  ✕ حذف
                </button>
              )}
              
              <h4 className="text-lg font-bold text-gray-800 mb-4">الشاهد رقم {index + 1}</h4>
              
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

        <div className="flex gap-4 justify-between">
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 4 }))}
            onClick={() => setState((prev) => ({
              ...prev,
              step: prev.documentType === 'ثبوت_نسب_ببينة_السماع' ? 3 : 4
            }))}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
          >
            ← السابق
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, step: 6 }))}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            التالي: التواريخ والمراجع
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 6: التواريخ والمراجع
  // ============================================================================

