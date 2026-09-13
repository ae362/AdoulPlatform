import React, { useMemo } from 'react';
import { Calendar, Clock, MapPin, Scale, Sparkles, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { FeesAgentState, EvidenceSubjectMatter, SubjectMatterCategory } from '../../../../types/feesAgentTypes';
import { calculatePeriodStartDate } from '../../services/evidenceRulesEngine';

interface EvidenceSubjectMatterCardProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
}

const CATEGORY_OPTIONS: Array<{
  id: SubjectMatterCategory;
  title: string;
  defaultYears: number;
  description: string;
  badge: string;
}> = [
  {
    id: 'possession_hearing',
    title: 'حيازة وتصرف عقاري (شهادة سماع في الملك)',
    defaultYears: 20,
    description: 'تستلزم حيازة مدة 20 سنة فأكثر مع شروط السماع والشهرة وعدم المنازع.',
    badge: '20 سنة (سماع)',
  },
  {
    id: 'possession_acquisition',
    title: 'حيازة هادئة علنية مكسبة للملك (حيازة عادية)',
    defaultYears: 10,
    description: '10 سنوات بين غير الشركاء الأجانب، و40 سنة بين الأقارب والشركاء.',
    badge: '10 أو 40 سنة',
  },
  {
    id: 'continuous_enjoyment',
    title: 'استمرار التصرف ووضع اليد بدون منازع',
    defaultYears: 15,
    description: 'إثبات استمرار وضع اليد والتصرف الفعلي في العقار أو المنقول.',
    badge: 'مدة مستمرة',
  },
  {
    id: 'material_fact',
    title: 'واقعة مادية أو تصرف محدد التاريخ',
    defaultYears: 5,
    description: 'إثبات واقعة مادية معينة (بناء، تسليم، واقعة ولادة أو قرابة...).',
    badge: 'تاريخ محدد',
  },
  {
    id: 'custom_period',
    title: 'فترة مخصصة يحددها طالب الشهادة',
    defaultYears: 10,
    description: 'تحديد مدة زمنية خاصة متفق عليها أو مصرح بها من الطالب.',
    badge: 'مخصص',
  },
];

export const EvidenceSubjectMatterCard: React.FC<EvidenceSubjectMatterCardProps> = ({
  state,
  setState,
}) => {
  const depositionDateDefault = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];

  // المزامنة الافتراضية
  const subject: EvidenceSubjectMatter = useMemo(() => {
    if (state.evidenceSubjectMatter) {
      return state.evidenceSubjectMatter;
    }
    const defaultCat: SubjectMatterCategory =
      state.documentType === 'ملكية' || state.documentType === 'حيازة'
        ? 'possession_hearing'
        : 'possession_acquisition';

    const defaultYears = defaultCat === 'possession_hearing' ? 20 : 10;
    const calcStart = calculatePeriodStartDate(depositionDateDefault, 'duration_years', {
      claimedDurationYears: defaultYears,
    });

    return {
      category: defaultCat,
      title: CATEGORY_OPTIONS.find((c) => c.id === defaultCat)?.title,
      depositionDate: depositionDateDefault,
      periodType: 'duration_years',
      claimedDurationYears: defaultYears,
      calculatedStartDate: calcStart,
    };
  }, [state.evidenceSubjectMatter, state.documentType, depositionDateDefault]);

  const updateSubject = (patch: Partial<EvidenceSubjectMatter>) => {
    const updated: EvidenceSubjectMatter = {
      ...subject,
      ...patch,
    };

    // إعادة حساب تاريخ البداية
    const calculatedStartDate = calculatePeriodStartDate(
      updated.depositionDate || depositionDateDefault,
      updated.periodType,
      {
        claimedDurationYears: updated.claimedDurationYears,
        exactStartDate: updated.exactStartDate,
        approxStartYear: updated.approxStartYear,
      }
    );

    updated.calculatedStartDate = calculatedStartDate;

    setState((prev) => ({
      ...prev,
      evidenceSubjectMatter: updated,
    }));
  };

  const currentCategory = CATEGORY_OPTIONS.find((c) => c.id === subject.category) || CATEGORY_OPTIONS[0];
  const startYear = new Date(subject.calculatedStartDate).getFullYear();
  const endYear = new Date(subject.depositionDate).getFullYear();
  const spanYears = Math.max(1, endYear - startYear);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 shadow-xs space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900">
                موضوع الواقعة والمدى الزمني المطلوب إثباته
              </h4>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                المرجع الزمني لأهلية الشهود
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              يحدد النظام تاريخ بداية الواقعة آلياً لمقارنتها مع تاريخ علم وسن كل شاهد على حدة
            </p>
          </div>
        </div>

        {/* Live calculated badge */}
        <div className="flex items-center gap-2 bg-indigo-950 text-white px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-xs shrink-0 self-start sm:self-center">
          <Clock className="w-3.5 h-3.5 text-indigo-300" />
          <span>الفترة المحسوبة: {startYear} ⬅️ {endYear} ({spanYears} سنة)</span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Category */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            نوع الواقعة / القاعدة القانونية <span className="text-red-500">*</span>
          </label>
          <select
            value={subject.category}
            onChange={(e) => {
              const catId = e.target.value as SubjectMatterCategory;
              const cat = CATEGORY_OPTIONS.find((c) => c.id === catId);
              updateSubject({
                category: catId,
                title: cat?.title,
                claimedDurationYears: cat?.defaultYears ?? 20,
              });
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title} — ({opt.badge})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 block mt-1 leading-normal">
            {currentCategory.description}
          </span>
        </div>

        {/* 2. Deposition Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            تاريخ أداء الشهادة (التلقي العدلي) <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={subject.depositionDate || depositionDateDefault}
            onChange={(e) => updateSubject({ depositionDate: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-hidden"
          />
          <span className="text-[10px] text-slate-500 block mt-1">
            تاريخ التلقي الرسمي (يحسب على أساسه سن الرشد ≥ 18 سنة)
          </span>
        </div>

        {/* 3. Period Specification Mode */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            طريقة تحديد الفترة المصرح بها <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => updateSubject({ periodType: 'duration_years' })}
              className={`py-1.5 rounded-lg transition text-center ${
                subject.periodType === 'duration_years' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              عدد السنوات
            </button>
            <button
              type="button"
              onClick={() => updateSubject({ periodType: 'approx_year' })}
              className={`py-1.5 rounded-lg transition text-center ${
                subject.periodType === 'approx_year' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              سنة البداية
            </button>
            <button
              type="button"
              onClick={() => updateSubject({ periodType: 'exact_start_date' })}
              className={`py-1.5 rounded-lg transition text-center ${
                subject.periodType === 'exact_start_date' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              تاريخ مضبوط
            </button>
          </div>

          {/* Conditional field for periodType */}
          <div className="mt-2">
            {subject.periodType === 'duration_years' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={subject.claimedDurationYears ?? 20}
                  onChange={(e) => updateSubject({ claimedDurationYears: parseInt(e.target.value, 10) || 1 })}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-indigo-900 text-center bg-white"
                />
                <span className="text-xs font-bold text-slate-700">سنة شمسية كاملة مدعى بها</span>
              </div>
            )}

            {subject.periodType === 'approx_year' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1920}
                  max={endYear}
                  value={subject.approxStartYear ?? startYear}
                  onChange={(e) => updateSubject({ approxStartYear: parseInt(e.target.value, 10) || startYear })}
                  placeholder="مثال: 2006"
                  className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-indigo-900 text-center bg-white"
                />
                <span className="text-xs font-bold text-slate-700">سنة بداية الحيازة / الواقعة</span>
              </div>
            )}

            {subject.periodType === 'exact_start_date' && (
              <input
                type="date"
                value={subject.exactStartDate || subject.calculatedStartDate}
                onChange={(e) => updateSubject({ exactStartDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              />
            )}
          </div>
        </div>
      </div>

      {/* Calculated Temporal Timeline Visualizer */}
      <div className="rounded-xl bg-indigo-900/5 border border-indigo-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-800">
            المرجع الزمني الآلي المعتمد:
          </span>
          <span className="text-slate-700">
            بداية الواقعة المفترضة: <strong className="font-mono text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">{subject.calculatedStartDate}</strong>
            {' '}وحتى تاريخ الأداء:{' '}
            <strong className="font-mono text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">{subject.depositionDate}</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          💡 لا يُشترط معاصرة الشاهد لبداية المدة؛ ويحتسب النظام سن التمييز (≥ 12 سنة) بناءً على تاريخ علمه المصرّح به.
        </div>
      </div>
    </div>
  );
};

