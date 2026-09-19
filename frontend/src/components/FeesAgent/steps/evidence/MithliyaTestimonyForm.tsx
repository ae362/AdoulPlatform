import React, { useState } from 'react';
import {
  UserCheck, Users, Plus, Trash2, CheckCircle2, AlertTriangle, User,
  Scale, FileText, Calendar, Building, Upload, X, ShieldCheck, MapPin,
  Clock, XCircle, Camera, Loader2
} from 'lucide-react';
import { trpc } from '../../../../trpc';
import { enhanceCardImageForOCR } from '../../../../utils/cinImageEnhancer';
import type { FeesAgentState, Witness } from '../../../../types/feesAgentTypes';
import { createEmptyWitness } from '../../../../utils/feesAgentUtils';
import {
  evaluateWitnessDualAge,
  evaluateWitnessCoverage,
  calculatePeriodStartDate,
  getEvidenceRuleForDocument,
} from '../../services/evidenceRulesEngine';
import { EvidenceSubjectMatterCard } from './EvidenceSubjectMatterCard';

interface MithliyaTestimonyFormProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
}

export const MithliyaTestimonyForm: React.FC<MithliyaTestimonyFormProps> = ({
  state,
  setState,
}) => {
  const data = state.mithliyaTestimony || {};
  const witnesses = state.witnesses || [];
  const requiredCount = 6;
  const isComplete = witnesses.length >= requiredCount;
  const rule = getEvidenceRuleForDocument(state.documentType || '');

  const defaultDepositionDate = state.evidenceSubjectMatter?.depositionDate || state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const defaultClaimedStartDate = state.evidenceSubjectMatter?.calculatedStartDate || calculatePeriodStartDate(defaultDepositionDate, 'duration_years', { claimedDurationYears: 20 });
  const defaultHearingDate = defaultDepositionDate;
  const defaultTestimonyDate = defaultDepositionDate;

  const updateDataField = (field: string, value: any) => {
    setState((prev) => ({
      ...prev,
      mithliyaTestimony: {
        ...(prev.mithliyaTestimony || {}),
        [field]: value,
      },
    }));
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) {
      updateDataField('electronicDoc', null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || '').split(',').pop() || '';
      updateDataField('electronicDoc', {
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        base64: b64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleWitnessChange = (index: number, patch: Partial<Witness>) => {
    const updated = [...witnesses];
    const target = { ...updated[index], ...patch };

    const hDate = patch.hearingDate ?? target.hearingDate ?? defaultHearingDate;
    const tDate = patch.testimonyDate ?? target.testimonyDate ?? defaultTestimonyDate;
    const bDate = patch.dateOfBirth ?? target.dateOfBirth;

    const evalAge = evaluateWitnessDualAge(bDate, hDate, tDate, rule, target);

    target.hearingDate = hDate;
    target.testimonyDate = tDate;
    target.effectiveBearingDate = evalAge.effectiveBearingDate;
    target.bearingAge = evalAge.bearingAge ?? undefined;
    target.performanceAge = evalAge.performanceAge ?? undefined;
    target.bearingStatus = evalAge.bearingStatus;
    target.performanceStatus = evalAge.performanceStatus;

    // تقييم التغطية
    const coverage = evaluateWitnessCoverage(
      evalAge.effectiveBearingDate,
      state.evidenceSubjectMatter?.calculatedStartDate || defaultClaimedStartDate,
      tDate
    );
    target.coverageYears = coverage.coverageYears;
    target.coversClaimedStart = coverage.coversClaimedStart;
    target.coverageNote = coverage.note;

    updated[index] = target;
    setState((prev) => ({ ...prev, witnesses: updated }));
  };

  const addWitness = () => {
    if (witnesses.length >= 6) return;
    setState((prev) => ({
      ...prev,
      witnesses: [...(prev.witnesses || []), createEmptyWitness()],
    }));
  };

  const removeWitness = (index: number) => {
    setState((prev) => ({
      ...prev,
      witnesses: (prev.witnesses || []).filter((_, i) => i !== index),
    }));
  };

  const extractIdCardMutation = trpc.feesAgent.ocr.extractIDCard.useMutation();
  const [scanningWitness, setScanningWitness] = useState<Record<number, boolean>>({});
  const [witnessNotice, setWitnessNotice] = useState<
    Record<number, { message: string; success: boolean }>
  >({});

  const scanWitnessCard = async (index: number, file: File) => {
    setScanningWitness((prev) => ({ ...prev, [index]: true }));
    setWitnessNotice((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      let b64 = '';
      try {
        b64 = await enhanceCardImageForOCR(file);
      } catch {
        b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
          reader.readAsDataURL(file);
        });
      }

      const res: any = await extractIdCardMutation.mutateAsync({
        fileBase64: b64,
        fileName: file.name,
      });

      if (res?.extractedFields?.idNumber) {
        const cin = res.extractedFields.idNumber.toUpperCase();
        const extractedName = res.extractedFields.name;
        const extractedDate = res.extractedFields.idIssueDate;

        const currentWitness: Partial<Witness> = witnesses[index] || {};
        const patch: Partial<Witness> = {
          idNumber: cin,
        };

        if (extractedName && (!currentWitness.name || currentWitness.name.trim() === '')) {
          patch.name = extractedName;
        }

        if (extractedDate && !currentWitness.dateOfBirth) {
          patch.dateOfBirth = extractedDate;
        }

        handleWitnessChange(index, patch);

        setWitnessNotice((prev) => ({
          ...prev,
          [index]: {
            message: `تم استخراج رقم البطاقة: ${cin}${extractedName ? ` | الاسم: ${extractedName}` : ''}`,
            success: true,
          },
        }));
      } else {
        setWitnessNotice((prev) => ({
          ...prev,
          [index]: {
            message: 'لم نتمكن من قراءة رقم البطاقة بدقة، يمكنك كتابته يدوياً',
            success: false,
          },
        }));
      }
    } catch {
      setWitnessNotice((prev) => ({
        ...prev,
        [index]: {
          message: 'حدث خطأ أثناء معالجة صورة البطاقة',
          success: false,
        },
      }));
    } finally {
      setScanningWitness((prev) => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Informative Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-600/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-amber-950">
              مسار الشهادة بالمثلية (إذن القاضي + العدل والشهود الستة)
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              شهادة يؤديها العدل الأساسي بناءً على إذن صادر من قاضي التوثيق المختص، مع تسجيل الشهود الستة المرتبطين بها والتحقق الصارم من استيفاء النصاب القانوني (6 شهود).
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-bold text-slate-500">نصاب الشهود بالمثلية</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-base font-black px-3 py-1 rounded-xl border ${
              isComplete
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {witnesses.length} / {requiredCount}
            </span>
          </div>
          {isComplete ? (
            <span className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              اكتمل النصاب المطلوب
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 mt-1">
              متبقي: {requiredCount - witnesses.length} شهود
            </span>
          )}
        </div>
      </div>

      {/* Subject Matter & Claimed Period Card (محرك وقواعد المرجع الزمني) */}
      <EvidenceSubjectMatterCard
        state={state}
        setState={setState}
      />

      {/* 1. Judge's Permission Data Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Scale className="w-4 h-4 text-amber-600" />
          <h5 className="text-sm font-black text-slate-800">
            بيانات ومراجع إذن قاضي التوثيق (للعدل الأساسي المؤدي للشهادة بالمثلية)
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم الإذن القضائي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.permissionNumber || ''}
              onChange={(e) => updateDataField('permissionNumber', e.target.value)}
              placeholder="مثال: 2026/124/إ.ق"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الإذن <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={data.permissionDate || ''}
              onChange={(e) => updateDataField('permissionDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المحكمة الابتدائية المختصة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.courtName || state.meta?.court || ''}
              onChange={(e) => updateDataField('courtName', e.target.value)}
              placeholder="مثال: المحكمة الابتدائية بشفشاون"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم قاضي التوثيق الصادر عنه الإذن
            </label>
            <input
              type="text"
              value={data.judgeName || ''}
              onChange={(e) => updateDataField('judgeName', e.target.value)}
              placeholder="الأستاذ(ة): القاضي المكلف بالتوثيق"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ صدور الإذن / التبليغ
            </label>
            <input
              type="date"
              value={data.issueDate || ''}
              onChange={(e) => updateDataField('issueDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الوثيقة الإلكترونية للإذن القضائي (مرفق)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-700 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
            />
            {data.electronicDoc && (
              <div className="mt-1 flex items-center justify-between text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="truncate">📎 {(data.electronicDoc as any)?.name || 'ملف الإذن'}</span>
                <button
                  type="button"
                  onClick={() => handleFileUpload(null)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <input
            type="checkbox"
            id="mithliyaElectronicVerification"
            checked={!!data.electronicVerification}
            onChange={(e) => updateDataField('electronicVerification', e.target.checked)}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
          />
          <label htmlFor="mithliyaElectronicVerification" className="text-xs font-bold text-slate-700 cursor-pointer">
            تم التحقق الإلكتروني من صحة الإذن القضائي وسريانه عبر المنظومة القضائية المندمجة
          </label>
        </div>
      </div>

      {/* 2. Adoul Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-amber-600" />
          <h5 className="text-sm font-black text-slate-800">بيانات العدل الأساسي المؤدي للشهادة بالمثلية</h5>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العدل المتلقي الأساسي</label>
            <input
              type="text"
              value={data.primaryNotary || data.notaryName || state.meta?.notaryPrimary || ''}
              onChange={(e) => {
                updateDataField('notaryName', e.target.value);
                updateDataField('primaryNotary', e.target.value);
              }}
              placeholder="اسم العدل المؤدي للشهادة"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
            <span className="text-[10px] text-slate-500 block mt-1">يسحب تلقائياً من حساب العدل الأساسي</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">دائرة المحكمة المختصة</label>
            <input
              type="text"
              value={data.courtName || state.meta?.court || ''}
              onChange={(e) => updateDataField('courtName', e.target.value)}
              placeholder="المحكمة الابتدائية المختصة"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 3. The Six Witnesses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span>لائحة الشهود الستة ({witnesses.length} / {requiredCount})</span>
          </h5>
          {witnesses.length < 6 && (
            <button
              type="button"
              onClick={addWitness}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة الشاهد رقم {witnesses.length + 1}</span>
            </button>
          )}
        </div>

        {witnesses.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              لم يتم تسجيل أي شاهد بعد لمسار الشهادة بالمثلية (المطلوب 6 شهود).
            </p>
            <button
              type="button"
              onClick={addWitness}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 transition"
            >
              + البدء بإضافة الشاهد الأول
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {witnesses.map((w, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-800">
                      الشاهد رقم {idx + 1} {w.name ? `— ${w.name}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-xs">
                      {scanningWitness[idx] ? (
                        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>مسح من صورة البطاقة (CIN)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={scanningWitness[idx]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            scanWitnessCard(idx, file);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeWitness(idx)}
                      className="text-xs text-red-600 hover:text-red-800 font-bold p-1 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {witnessNotice[idx] && (
                  <div className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-bold ${
                    witnessNotice[idx].success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {witnessNotice[idx].success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{witnessNotice[idx].message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={w.name || ''}
                      onChange={(e) => handleWitnessChange(idx, { name: e.target.value })}
                      placeholder="الاسم الكامل"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم البطاقة الوطنية (CNIE) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={w.idNumber || ''}
                      onChange={(e) => handleWitnessChange(idx, { idNumber: e.target.value })}
                      placeholder="رقم التعريف"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ الازدياد
                    </label>
                    <input
                      type="date"
                      value={w.dateOfBirth || ''}
                      onChange={(e) => handleWitnessChange(idx, { dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>مكان الازدياد</span>
                    </label>
                    <input
                      type="text"
                      value={w.placeOfBirth || ''}
                      onChange={(e) => handleWitnessChange(idx, { placeOfBirth: e.target.value })}
                      placeholder="مكان الازدياد (المدينة / الجماعة)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1">
                      <Building className="w-3 h-3 text-amber-600" />
                      <span>العنوان / السكنى</span>
                    </label>
                    <input
                      type="text"
                      value={w.address || ''}
                      onChange={(e) => handleWitnessChange(idx, { address: e.target.value })}
                      placeholder="محل السكنى والمهنة إن وجدت"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Flexible Bearing Mode for Mithliya Witness */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-amber-950">
                      متى تحمّل الشاهد هذه الشهادة؟ (تاريخ علمه أو أول معاينته للواقعة)
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300">
                      شرط سن التمييز (≥ 12 سنة كاملة)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                    {[
                      { id: 'year_only', label: 'سنة محددة' },
                      { id: 'relative_years', label: 'مدة تقريبية (منذ كذا سنة)' },
                      { id: 'exact_date', label: 'تاريخ مضبوط باليوم' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleWitnessChange(idx, { bearingMode: m.id as any })}
                        className={`py-1.5 px-2 rounded-lg transition text-center border ${
                          (w.bearingMode || 'year_only') === m.id
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    {(w.bearingMode || 'year_only') === 'year_only' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700 font-bold">يعلم أو عاين الواقعة منذ سنة:</span>
                        <input
                          type="number"
                          min={1940}
                          max={new Date().getFullYear()}
                          value={w.bearingYear || (w.effectiveBearingDate ? new Date(w.effectiveBearingDate).getFullYear() : 2010)}
                          onChange={(e) => handleWitnessChange(idx, { bearingYear: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                          placeholder="مثال: 2010"
                          className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-amber-900 bg-white text-center"
                        />
                        <span className="text-[11px] text-slate-500 font-medium">(يُحسب سن التمييز على أساس هذه السنة)</span>
                      </div>
                    )}

                    {w.bearingMode === 'relative_years' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700 font-bold">يعلم بهذه الواقعة منذ حوالي:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={w.bearingRelativeYears || 15}
                          onChange={(e) => handleWitnessChange(idx, { bearingRelativeYears: parseInt(e.target.value, 10) || 1 })}
                          className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-amber-900 bg-white text-center"
                        />
                        <span className="text-xs text-slate-700 font-bold">سنة مضت تقريباً</span>
                      </div>
                    )}

                    {w.bearingMode === 'exact_date' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700 font-bold">تاريخ المعاينة الدقيق:</span>
                        <input
                          type="date"
                          value={w.hearingDate || w.effectiveBearingDate || defaultHearingDate}
                          onChange={(e) => handleWitnessChange(idx, { hearingDate: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Evaluation Badges for Mithliya Witness */}
                {w.dateOfBirth && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl border text-xs ${
                        w.bearingStatus === 'valid'
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-red-50/90 border-red-300 text-red-950'
                      }`}>
                        <div className="flex items-center justify-between font-black mb-1">
                          <span className="flex items-center gap-1.5">
                            {w.bearingStatus === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>سن الشاهد عند تحمّل الشهادة:</span>
                          </span>
                          <span className="font-mono text-xs font-black">{w.bearingAge ?? '—'} سنة</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {w.bearingStatus === 'valid'
                            ? `🟢 مستوفٍ لسن التمييز (${w.bearingAge} سنة وقت علمه بالواقعة سنة ${w.bearingYear || 2010}؛ والمطلوب ≥ 12 سنة).`
                            : `🔴 مانع: الشاهد كان عمره (${w.bearingAge} سنة) فقط وقت الواقعة المصرح بها (دون سن التمييز 12 سنة).`}
                        </p>
                      </div>

                      <div className={`p-3 rounded-xl border text-xs ${
                        w.performanceStatus === 'valid'
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-red-50/90 border-red-300 text-red-950'
                      }`}>
                        <div className="flex items-center justify-between font-black mb-1">
                          <span className="flex items-center gap-1.5">
                            {w.performanceStatus === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>سن الشاهد عند أداء الشهادة:</span>
                          </span>
                          <span className="font-mono text-xs font-black">{w.performanceAge ?? '—'} سنة</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {w.performanceStatus === 'valid'
                            ? `🟢 مستوفٍ لسن الرشد القانوني (${w.performanceAge} سنة عند الأداء؛ والمطلوب ≥ 18 سنة).`
                            : `🔴 مانع: الشاهد قاصر لم يبلغ سن الرشد (18 سنة كاملة) وقت الأداء.`}
                        </p>
                      </div>
                    </div>

                    {w.bearingStatus === 'valid' && w.coverageNote && (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                        w.coversClaimedStart
                          ? 'bg-blue-50 border-blue-200 text-blue-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${w.coversClaimedStart ? 'text-blue-600' : 'text-amber-600'}`} />
                        <span className="text-[11px]">{w.coverageNote}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
