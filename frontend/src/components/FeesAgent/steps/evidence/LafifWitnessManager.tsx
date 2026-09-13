import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle,
  HelpCircle, Calendar, ShieldCheck, UserCheck, AlertCircle,
  ChevronDown, ChevronUp, FileText, Search, Eye, Sparkles, Clock, MapPin
} from 'lucide-react';
import type { Witness, FeesAgentState, WitnessKinshipRelation, WitnessInquestResult } from '../../../../types/feesAgentTypes';
import { createEmptyWitness } from '../../../../utils/feesAgentUtils';
import {
  type DocumentEvidenceRule,
  evaluateWitnessDualAge,
  evaluateWitnessKinship,
  evaluateWitnessCompleteness,
  calculatePeriodStartDate,
  evaluateWitnessCoverage,
  resolveEffectiveBearingDate,
} from '../../services/evidenceRulesEngine';
import { EvidenceSubjectMatterCard } from './EvidenceSubjectMatterCard';

interface LafifWitnessManagerProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  rule: DocumentEvidenceRule;
  onOpenWhyModal: () => void;
}

export const LafifWitnessManager: React.FC<LafifWitnessManagerProps> = ({
  state,
  setState,
  rule,
  onOpenWhyModal,
}) => {
  const witnesses = state.witnesses || [];
  const minRequired = rule.minimumWitnesses || 12;
  const isMinimumReached = witnesses.length >= minRequired;

  // البطاقة المفتوحة للتعديل المفصل (accordion)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<'cards' | 'summary'>('cards');

  // تواريخ افتراضية للتحمل والأداء
  const defaultDepositionDate = state.evidenceSubjectMatter?.depositionDate || state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const defaultClaimedStartDate = state.evidenceSubjectMatter?.calculatedStartDate || calculatePeriodStartDate(defaultDepositionDate, 'duration_years', { claimedDurationYears: 20 });
  const defaultHearingDate = defaultDepositionDate;
  const defaultTestimonyDate = defaultDepositionDate;
  const defaultInquestNotary = state.meta?.notaryPrimary || 'العدل المتلقي';

  const handleWitnessChange = (index: number, patch: Partial<Witness>) => {
    const updated = [...witnesses];
    const target = { ...updated[index], ...patch };

    // إذا تغير تاريخ الازدياد أو نمط التحمل أو التواريخ، أعد تقييم السن والتغطية
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

    // تقييم تغطية المدة المدعى بها
    const coverage = evaluateWitnessCoverage(
      evalAge.effectiveBearingDate,
      state.evidenceSubjectMatter?.calculatedStartDate || defaultClaimedStartDate,
      tDate
    );
    target.coverageYears = coverage.coverageYears;
    target.coversClaimedStart = coverage.coversClaimedStart;
    target.coverageNote = coverage.note;

    // إذا تغيرت القرابة، أعد فحص موانع القرابة
    if (patch.kinshipRelation !== undefined || patch.kinshipDegree !== undefined) {
      const rel = patch.kinshipRelation ?? target.kinshipRelation;
      const deg = patch.kinshipDegree ?? target.kinshipDegree;
      const evalKin = evaluateWitnessKinship(rel, deg, rule);
      target.kinshipStatus = evalKin.status === 'invalid' ? 'invalid' : evalKin.status === 'warning' ? 'warning' : 'valid';
      if (evalKin.isForbidden) {
        target.inquestResult = 'invalid';
        target.inquestBlockReason = evalKin.reason;
      }
    }

    updated[index] = target;
    setState((prev) => ({ ...prev, witnesses: updated }));
  };

  const addWitness = () => {
    const newWitness: Witness = {
      ...createEmptyWitness(),
      hearingDate: defaultHearingDate,
      testimonyDate: defaultTestimonyDate,
      inquestDate: defaultTestimonyDate,
      inquestNotary: defaultInquestNotary,
      inquestMethod: 'تصريح الشاهد وتدقيق الوثيقة',
      inquestResult: 'valid',
      kinshipRelation: 'none',
    };
    setState((prev) => ({
      ...prev,
      witnesses: [...(prev.witnesses || []), newWitness],
    }));
    setExpandedIndex(witnesses.length);
  };

  const removeWitness = (index: number) => {
    setState((prev) => ({
      ...prev,
      witnesses: (prev.witnesses || []).filter((_, i) => i !== index),
    }));
    if (expandedIndex === index) {
      setExpandedIndex(Math.max(0, index - 1));
    }
  };

  // إحصائيات سريعة للائحة الشهود
  const stats = useMemo(() => {
    let completeCount = 0;
    let ageBlockedCount = 0;
    let kinshipBlockedCount = 0;
    let incompleteInquestCount = 0;

    witnesses.forEach((w) => {
      const evaluation = evaluateWitnessCompleteness(w, rule);
      if (evaluation.isFullyApproved) completeCount++;
      if (evaluation.ageCheck.overallStatus === 'invalid') ageBlockedCount++;
      if (evaluation.kinshipCheck.isForbidden) kinshipBlockedCount++;
      if (evaluation.inquestResult === 'incomplete' || evaluation.inquestResult === 'warning') incompleteInquestCount++;
    });

    return {
      total: witnesses.length,
      completeCount,
      ageBlockedCount,
      kinshipBlockedCount,
      incompleteInquestCount,
      isAllClean: completeCount >= minRequired && ageBlockedCount === 0 && kinshipBlockedCount === 0,
    };
  }, [witnesses, minRequired, rule]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* 1. Legal Requirements Header Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                  المتطلبات الأساسية لشهادة اللفيف
                </span>
                <span className="text-xs text-slate-500 font-bold">المادة 67 - القانون 51.26</span>
              </div>
              <h4 className="text-base font-black text-slate-900">
                منظومة اللفيف الذكية: نصاب الـ 12 شاهداً والتحقق المزدوج للسن والتحري
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenWhyModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold transition shadow-2xs shrink-0 self-start md:self-center"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>لماذا يتحقق النظام من السن مرتين؟</span>
          </button>
        </div>

        {/* 4 bullet legal criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-200/60 text-xs">
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-slate-700 font-bold">
              لا يقل عدد أفراد اللفيف عن <strong>12 شاهداً</strong> (الحد الأدنى القانوني).
            </span>
          </div>

          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-slate-700 font-bold">
              بلوغ <strong>سن التمييز ({rule.bearingAgeMin} سنة)</strong> وقت تحمّل الشهادة.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-slate-700 font-bold">
              بلوغ <strong>سن الرشد ({rule.performanceAgeMin} سنة)</strong> وقت أداء الشهادة.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-slate-700 font-bold">
              إلزامية <strong>التحري في القرابة</strong> وانتفاء موانع الشهادة والتجريح.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Inquest Reminder Box (تذكير بالتحري) */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-950 block text-xs mb-0.5">⚠️ تذكير بالتحري المهني</strong>
            <p className="text-amber-900 leading-relaxed">
              قبل اعتماد أي شاهد، يجب التحقق من توفر شروط قبول شهادته، بما في ذلك السن عند التحمل والأداء، والعلاقة بطالب الشهادة لدرء أي شبهة قرابة محظورة، وفق القواعد القانونية الجاري بها العمل.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWhyModal}
          className="text-[11px] font-black text-amber-800 hover:text-amber-950 underline underline-offset-4 shrink-0"
        >
          لماذا يطلب مني النظام ذلك؟
        </button>
      </div>

      {/* 3. Subject Matter & Claimed Period Card (محرك وقواعد المرجع الزمني) */}
      <EvidenceSubjectMatterCard
        state={state}
        setState={setState}
      />

      {/* 4. Interactive Progress & Status Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Counter Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">نصاب أفراد اللفيف:</span>
            <span className={`text-base font-black px-3 py-1 rounded-xl border ${
              isMinimumReached
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}>
              {witnesses.length} / {minRequired}
            </span>
          </div>

          {isMinimumReached ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>اكتمل الحد الأدنى القانوني للعدد ({witnesses.length} شاهداً)</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>متبقي {minRequired - witnesses.length} شهود لبلوغ النصاب</span>
            </span>
          )}
        </div>

        {/* View mode toggle & Add Witness button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              بطاقات التحقق
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewMode === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جدول التحري الموجز
            </button>
          </div>

          <button
            type="button"
            onClick={addWitness}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شاهد لفيف (رقم {witnesses.length + 1})</span>
          </button>
        </div>
      </div>

      {/* 4. Empty State */}
      {witnesses.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-black text-slate-900">لم يتم تسجيل أي شاهد لفيف بعد</h5>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            تتطلب شهادة اللفيف إدراج ما لا يقل عن 12 شاهداً مع التحقق المزدوج من سن الشاهد وإجراء التحري في علاقته بطالب الشهادة.
          </p>
          <button
            type="button"
            onClick={addWitness}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition shadow-sm"
          >
            + البدء بإضافة الشاهد الأول (01)
          </button>
        </div>
      )}

      {/* 5. Summary Table View */}
      {viewMode === 'summary' && witnesses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">اسم الشاهد</th>
                  <th className="p-3">رقم التعريف (CNIE)</th>
                  <th className="p-3">السن عند التحمل</th>
                  <th className="p-3">السن عند الأداء</th>
                  <th className="p-3">القرابة / المصاهرة</th>
                  <th className="p-3">نتيجة التحري</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {witnesses.map((w, idx) => {
                  const evalRes = evaluateWitnessCompleteness(w, rule);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-black text-slate-900">{w.name || '—'}</td>
                      <td className="p-3 text-slate-700 font-mono">{w.idNumber || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          evalRes.ageCheck.bearingStatus === 'valid'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {evalRes.ageCheck.bearingAge !== null ? `${evalRes.ageCheck.bearingAge} سنة` : '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          evalRes.ageCheck.performanceStatus === 'valid'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {evalRes.ageCheck.performanceAge !== null ? `${evalRes.ageCheck.performanceAge} سنة` : '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${evalRes.kinshipCheck.isForbidden ? 'text-red-700' : 'text-slate-700'}`}>
                          {w.kinshipRelation === 'none' || !w.kinshipRelation
                            ? 'لا توجد صلة'
                            : `${w.kinshipType || 'قرابة'} (د.${w.kinshipDegree || '—'})`}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-700">
                          {w.inquestResult === 'valid' ? 'لا مانع ظاهر' : w.inquestResult === 'invalid' ? 'يوجد مانع' : 'غير مكتمل'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {evalRes.isFullyApproved ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            🟢 مستوفٍ
                          </span>
                        ) : evalRes.hasBlocker ? (
                          <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            🔴 مانع
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            🟠 تدقيق
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedIndex(idx);
                            setViewMode('cards');
                          }}
                          className="px-2.5 py-1 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 font-bold transition ml-1"
                        >
                          تفاصيل
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWitness(idx)}
                          className="p-1 text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Sequential Verification Cards View */}
      {viewMode === 'cards' && witnesses.length > 0 && (
        <div className="space-y-4">
          {witnesses.map((witness, index) => {
            const isExpanded = expandedIndex === index;
            const evalResult = evaluateWitnessCompleteness(witness, rule);
            const witnessNumber = String(index + 1).padStart(2, '0');

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  evalResult.hasBlocker
                    ? 'border-red-300 bg-red-50/20 shadow-xs'
                    : evalResult.isFullyApproved
                    ? 'border-emerald-200 bg-white shadow-xs'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                {/* Header Collapsible Bar */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center transition shadow-xs ${
                      evalResult.hasBlocker
                        ? 'bg-red-600 text-white'
                        : evalResult.isFullyApproved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {witnessNumber}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {witness.name ? witness.name : `الشاهد رقم ${witnessNumber}`}
                        </h4>
                        {witness.idNumber && (
                          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {witness.idNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        {/* Age summary tag */}
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          evalResult.ageCheck.overallStatus === 'valid'
                            ? 'text-emerald-800 bg-emerald-50'
                            : evalResult.ageCheck.overallStatus === 'invalid'
                            ? 'text-red-800 bg-red-50'
                            : 'text-amber-800 bg-amber-50'
                        }`}>
                          السن: {evalResult.ageCheck.bearingText} / {evalResult.ageCheck.performanceText}
                        </span>

                        {/* Kinship summary tag */}
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          evalResult.kinshipCheck.isForbidden
                            ? 'text-red-800 bg-red-50'
                            : 'text-slate-700 bg-slate-100'
                        }`}>
                          {witness.kinshipRelation === 'none' || !witness.kinshipRelation
                            ? 'لا توجد قرابة'
                            : `قرابة: ${witness.kinshipType || ''} (${evalResult.kinshipCheck.isForbidden ? 'محظورة' : 'مجازة'})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {evalResult.isFullyApproved ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مستوفٍ للتحقق</span>
                      </span>
                    ) : evalResult.hasBlocker ? (
                      <span className="text-xs font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>مانع قانوني</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>يحتاج استكمال</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWitness(index);
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-700 rounded-lg hover:bg-red-100/60 transition"
                      title="حذف الشاهد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Card Body */}
                {isExpanded && (
                  <div className="p-5 space-y-5 bg-white">
                    {/* Blocker Alert Banner if any */}
                    {evalResult.hasBlocker && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <strong className="block text-red-950 font-black">
                            🔴 لا يمكن اعتماد هذا الشاهد حالياً وفق القاعدة المطبقة:
                          </strong>
                          <p className="leading-relaxed text-red-800">
                            {evalResult.blockReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Section 1: Personal Data & Dual Dates */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800">أ. البيانات الشخصية ومواقيت الشهادة</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            الاسم الكامل للشاهد <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={witness.name || ''}
                            onChange={(e) => handleWitnessChange(index, { name: e.target.value })}
                            placeholder="الاسم الكامل"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            رقم البطاقة الوطنية (CNIE) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={witness.idNumber || ''}
                            onChange={(e) => handleWitnessChange(index, { idNumber: e.target.value })}
                            placeholder="مثال: A123456"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            تاريخ الازدياد (إجباري لحساب السن) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={witness.dateOfBirth || ''}
                            onChange={(e) => handleWitnessChange(index, { dateOfBirth: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد</label>
                          <input
                            type="text"
                            value={witness.placeOfBirth || ''}
                            onChange={(e) => handleWitnessChange(index, { placeOfBirth: e.target.value })}
                            placeholder="المدينة / الجماعة"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                          />
                        </div>

                        {/* Flexible Bearing Mode (طريقة تحديد متى علم الشاهد بالواقعة) */}
                        <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-black text-indigo-950">
                              متى تحمّل الشاهد هذه الشهادة؟ (تاريخ علمه أو معاينته للواقعة لأول مرة)
                            </label>
                            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                              شرط سن التمييز (≥ 12 سنة)
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
                                onClick={() => handleWitnessChange(index, { bearingMode: m.id as any })}
                                className={`py-1.5 px-2 rounded-lg transition text-center border ${
                                  (witness.bearingMode || 'year_only') === m.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {/* Mode specific input */}
                          <div className="pt-1">
                            {(witness.bearingMode || 'year_only') === 'year_only' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-700 font-bold">يعلم أو عاين الواقعة منذ سنة:</span>
                                <input
                                  type="number"
                                  min={1940}
                                  max={new Date().getFullYear()}
                                  value={witness.bearingYear || (witness.effectiveBearingDate ? new Date(witness.effectiveBearingDate).getFullYear() : 2010)}
                                  onChange={(e) => handleWitnessChange(index, { bearingYear: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                                  placeholder="مثال: 2010"
                                  className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-indigo-900 bg-white text-center"
                                />
                                <span className="text-[11px] text-slate-500 font-medium">(يُحسب سن التمييز على أساس هذه السنة)</span>
                              </div>
                            )}

                            {witness.bearingMode === 'relative_years' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-700 font-bold">يعلم بهذه الواقعة منذ حوالي:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={witness.bearingRelativeYears || 15}
                                  onChange={(e) => handleWitnessChange(index, { bearingRelativeYears: parseInt(e.target.value, 10) || 1 })}
                                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-indigo-900 bg-white text-center"
                                />
                                <span className="text-xs text-slate-700 font-bold">سنة مضت تقريباً</span>
                              </div>
                            )}

                            {witness.bearingMode === 'exact_date' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-700 font-bold">تاريخ المعاينة الدقيق:</span>
                                <input
                                  type="date"
                                  value={witness.hearingDate || witness.effectiveBearingDate || defaultHearingDate}
                                  onChange={(e) => handleWitnessChange(index, { hearingDate: e.target.value })}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {/* Knowledge Source */}
                          <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">مصدر علم الشاهد بالواقعة:</span>
                            <div className="flex items-center gap-2">
                              {[
                                { id: 'inspection', label: 'معاينة شخصية ومجاورة' },
                                { id: 'hearing', label: 'سماع فاشٍ ومستفيض' },
                                { id: 'fame', label: 'شهرة عامة مستمرة' },
                              ].map((s) => (
                                <label key={s.id} className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`bearingSource_${index}`}
                                    value={s.id}
                                    checked={(witness.bearingSource || 'inspection') === s.id}
                                    onChange={() => handleWitnessChange(index, { bearingSource: s.id as any })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{s.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            تاريخ أداء الشهادة (التلقي العدلي)
                          </label>
                          <input
                            type="date"
                            value={witness.testimonyDate || defaultTestimonyDate}
                            onChange={(e) => handleWitnessChange(index, { testimonyDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                          />
                          <span className="text-[10px] text-slate-500 block mt-1">تاريخ مجلس أداء الشهادة أمام العدلين</span>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-slate-700 mb-1">عنوان سكن الشاهد</label>
                          <input
                            type="text"
                            value={witness.address || ''}
                            onChange={(e) => handleWitnessChange(index, { address: e.target.value })}
                            placeholder="العنوان الكامل للشاهد"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Dual Age & Coverage Live Feedback Badges */}
                      <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* 1. سن التمييز وقت التحمل */}
                          <div className={`p-3.5 rounded-xl border text-xs transition-all ${
                            evalResult.ageCheck.bearingStatus === 'valid'
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                              : 'bg-red-50/90 border-red-300 text-red-950 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between font-black mb-1">
                              <span className="flex items-center gap-1.5">
                                {evalResult.ageCheck.bearingStatus === 'valid' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>سن الشاهد عند تحمّل الشهادة (وقت الواقعة):</span>
                              </span>
                              <span className="font-mono text-sm font-black">
                                {evalResult.ageCheck.bearingAge !== null ? `${evalResult.ageCheck.bearingAge} سنة` : 'غير محدد'}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed mt-1">
                              {evalResult.ageCheck.bearingStatus === 'valid'
                                ? `🟢 مستوفٍ لشرط سن التمييز (بلغ ${evalResult.ageCheck.bearingAge} سنة في تاريخ تحمله المصرح به: ${evalResult.ageCheck.effectiveBearingDate}؛ والحد الأدنى هو 12 سنة كاملة عملاً بالمادة 206 من مدونة الأسرة).`
                                : `🔴 مانع أهليّة: الشاهد كان عمره (${evalResult.ageCheck.bearingAge} سنة) فقط في تاريخ تحمله المصرح به (${evalResult.ageCheck.effectiveBearingDate})، أي دون سن التمييز القانوني (12 سنة شمسية كاملة).`}
                            </p>
                          </div>

                          {/* 2. سن الرشد وقت الأداء */}
                          <div className={`p-3.5 rounded-xl border text-xs transition-all ${
                            evalResult.ageCheck.performanceStatus === 'valid'
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                              : 'bg-red-50/90 border-red-300 text-red-950 shadow-xs'
                          }`}>
                            <div className="flex items-center justify-between font-black mb-1">
                              <span className="flex items-center gap-1.5">
                                {evalResult.ageCheck.performanceStatus === 'valid' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>سن الشاهد عند أداء الشهادة (مجلس العقد):</span>
                              </span>
                              <span className="font-mono text-sm font-black">
                                {evalResult.ageCheck.performanceAge !== null ? `${evalResult.ageCheck.performanceAge} سنة` : 'غير محدد'}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed mt-1">
                              {evalResult.ageCheck.performanceStatus === 'valid'
                                ? `🟢 مستوفٍ لسن الرشد القانوني (${evalResult.ageCheck.performanceAge} سنة عند الأداء؛ والمطلوب 18 سنة شمسية كاملة عملاً بالمادة 209 من مدونة الأسرة والفصل 418 ق.ل.ع).`
                                : `🔴 مانع أهليّة: الشاهد قاصر لم يبلغ سن الرشد القانوني (18 سنة كاملة) وقت أداء الشهادة.`}
                            </p>
                          </div>
                        </div>

                        {/* 3. Coverage Analysis Note */}
                        {evalResult.ageCheck.bearingStatus === 'valid' && (
                          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            witness.coversClaimedStart
                              ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                              : 'bg-amber-50/80 border-amber-200 text-amber-950'
                          }`}>
                            <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${witness.coversClaimedStart ? 'text-blue-600' : 'text-amber-600'}`} />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <strong className="font-black">
                                  {witness.coversClaimedStart ? 'تغطية كاملة للمدة المدعى بها:' : 'تغطية جزئية معتبرة في حدود المعاينة:'}
                                </strong>
                                <span className="font-bold text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                                  يشهد على {witness.coverageYears ?? 0} سنة
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 leading-relaxed">
                                {witness.coverageNote || 'يغطي الشاهد المدة التي صرح بعلمه بها.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Inquest & Kinship (التحري والقرابة) */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>🔎 ب. التحري في علاقة الشاهد بطالب الشهادة والموانع</span>
                        </span>
                        <span className="text-[10px] text-slate-500">القانون 51.26 - التحري الإلزامي</span>
                      </div>

                      {/* Question: Kinship or Affinity */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                          هل تربط الشاهد بطالب الشهادة صلة قرابة أو مصاهرة؟
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { value: 'none', label: 'لا توجد صلة قرابة' },
                            { value: 'kinship', label: 'توجد صلة قرابة' },
                            { value: 'affinity', label: 'توجد صلة مصاهرة' },
                            { value: 'unsure', label: 'غير متأكد (يستلزم بحث)' },
                          ].map((opt) => (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => handleWitnessChange(index, { kinshipRelation: opt.value as WitnessKinshipRelation })}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                                (witness.kinshipRelation || 'none') === opt.value
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* If kinship or affinity declared, open detailed degrees */}
                      {(witness.kinshipRelation === 'kinship' || witness.kinshipRelation === 'affinity') && (
                        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3 animate-in fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                نوع الصلة أو القرابة
                              </label>
                              <input
                                type="text"
                                value={witness.kinshipType || ''}
                                onChange={(e) => handleWitnessChange(index, { kinshipType: e.target.value })}
                                placeholder="مثال: عم، ابن عم، صهر..."
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                درجة القرابة المصرح بها
                              </label>
                              <select
                                value={witness.kinshipDegree || ''}
                                onChange={(e) => handleWitnessChange(index, { kinshipDegree: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                              >
                                <option value="">— حدد الدرجة —</option>
                                <option value="1">الدرجة الأولى (أب، أم، ابن، بنت) — مانعة</option>
                                <option value="2">الدرجة الثانية (أخ، أخت، جد، حفيد) — مانعة</option>
                                <option value="3">الدرجة الثالثة (عم، عمة، خال، خالة، ابن أخ)</option>
                                <option value="4">الدرجة الرابعة (ابن عم، ابن خال...)</option>
                                <option value="5">أبعد من الدرجة الرابعة</option>
                              </select>
                            </div>
                          </div>

                          {/* Kinship Outcome */}
                          <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                            evalResult.kinshipCheck.isForbidden
                              ? 'bg-red-100 text-red-900 border border-red-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {evalResult.kinshipCheck.isForbidden ? (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span>{evalResult.kinshipCheck.reason}</span>
                          </div>
                        </div>
                      )}

                      {/* Digital Audit Trail for Inquest (توثيق التحري) */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between text-xs font-black text-slate-700">
                          <span>توثيق أثر التحري العدلي (Digital Audit Trail)</span>
                          <span className="text-[10px] text-slate-500">سجل إلكتروني رسمي</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              نتيجة التحري المقررة
                            </label>
                            <select
                              value={witness.inquestResult || 'valid'}
                              onChange={(e) => handleWitnessChange(index, { inquestResult: e.target.value as WitnessInquestResult })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                            >
                              <option value="valid">🟢 لا يوجد مانع ظاهر</option>
                              <option value="warning">🟠 توجد ملاحظة تحتاج مراجعة</option>
                              <option value="invalid">🔴 يوجد مانع قانوني</option>
                              <option value="incomplete">⚪ لم يكتمل التحري بعد</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              طريقة التحقق والتحري
                            </label>
                            <select
                              value={witness.inquestMethod || 'تصريح الشاهد وتدقيق الوثيقة'}
                              onChange={(e) => handleWitnessChange(index, { inquestMethod: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                            >
                              <option value="تصريح الشاهد وتدقيق الوثيقة">تصريح الشاهد وتدقيق الوثيقة</option>
                              <option value="تصريح طالب الشهادة">تصريح طالب الشهادة</option>
                              <option value="وثيقة رسمية أو سجلات">وثيقة رسمية أو سجلات</option>
                              <option value="تحقق واستفسار إضافي">تحقق واستفسار إضافي</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              العدل القائم بالتحري
                            </label>
                            <input
                              type="text"
                              value={witness.inquestNotary || defaultInquestNotary}
                              onChange={(e) => handleWitnessChange(index, { inquestNotary: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            ملاحظات التحري (اختياري)
                          </label>
                          <input
                            type="text"
                            value={witness.inquestNotes || ''}
                            onChange={(e) => handleWitnessChange(index, { inquestNotes: e.target.value })}
                            placeholder="أي تدقيق أو ملاحظة يرتئي العدل تدوينها حول هذا الشاهد..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
