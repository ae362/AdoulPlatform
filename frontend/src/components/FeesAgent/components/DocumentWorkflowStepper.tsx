import React from 'react';
import {
  ShieldCheck, Users, Building2, FileCheck, Scale, Clock,
  FileText, Lock, CheckCircle2, Heart, Award, KeyRound
} from 'lucide-react';

export type DocumentCategoryType = 'sale' | 'property_general' | 'marriage' | 'divorce' | 'inheritance' | 'other';

export interface DocumentWorkflowStepperProps {
  documentType: string;
  currentStep: number;
  onStepClick?: (step: number) => void;
}

interface WorkflowStage {
  index: number;
  targetStep: number;
  num: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function detectDocumentCategory(docType: string): DocumentCategoryType {
  const dt = String(docType || '');

  // 1. Marriage
  if (dt === 'زواج' || dt === 'زواج_مختلط' || dt === 'رسم_استمرار_زواج' || dt.includes('زواج')) {
    return 'marriage';
  }

  // 2. Divorce
  if (dt === 'الاشهاد_على_الطلاق_الاتفاقي' || dt === 'طلاق' || dt === 'طلاق_اتفاقي' || dt === 'رجعة' || dt.includes('طلاق')) {
    return 'divorce';
  }

  // 3. Specific Real Estate Sales & Disposal
  const saleTypes = [
    'بيع_وشراء',
    'بيع_وشراء_معنوي',
    'بيع_وشراء_ملكية_مشتركة',
    'بيع_وشراء_طور_انجاز_ابتدائي',
    'بيع_وشراء_طور_انجاز_نهائي',
    'عقد_بيع_حق_الهواء_والتعلية',
    'عقد_تفويت_حق_السطحية',
    'عقد_ايجار_المفضي_الى_تملك',
    'وعد_بالبيع'
  ];
  if (saleTypes.includes(dt) || (dt.includes('بيع') && !dt.includes('حيازة') && !dt.includes('ملكية')) || dt.includes('شراء')) {
    return 'sale';
  }

  // 4. Inheritance & Estates
  const inheritanceTypes = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'ثبوت_مخلف', 'وصية'];
  if (inheritanceTypes.includes(dt) || dt.includes('اراثة') || dt.includes('فريضة') || dt.includes('متروك')) {
    return 'inheritance';
  }

  // 5. Property General: Ownership, Possession, Partition, Gifts, Waqf, etc.
  const propertyGeneralTypes = [
    'ملكية',
    'حيازة',
    'مقاسمة',
    'مناقلة',
    'هبة',
    'صدقة',
    'كراء_طويل_الامد',
    'عقد_تحبيس',
    'ثبوت_زينة_عقار',
    'ثبوت_بناء',
    'عقد_العمري',
    'رسم_تسليم_بعوض',
    'رسم_اقرار_واعتراف'
  ];
  if (propertyGeneralTypes.includes(dt) || dt.includes('ملكية') || dt.includes('حيازة') || dt.includes('مقاسمة') || dt.includes('هبة') || dt.includes('صدقة')) {
    return 'property_general';
  }

  // 6. Other Documents (Tawkil, Paternity, Mortgages, Debts, etc.)
  return 'other';
}

export const DocumentWorkflowStepper: React.FC<DocumentWorkflowStepperProps> = ({
  documentType,
  currentStep,
  onStepClick,
}) => {
  const category = detectDocumentCategory(documentType);

  // Configure stages and active mapping based on category
  const getCategoryConfig = (): {
    title: string;
    stages: WorkflowStage[];
    getStageIndex: (step: number) => number;
    gridClass: string;
  } => {
    switch (category) {
      case 'sale':
        return {
          title: 'خريطة المسار الإجرائي لعقد البيع العقاري (8 مراحل قانونية متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 6;
            if (step === 7) return 7;
            if (step >= 8) return 8;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'أطراف العقد', desc: 'البائع والمشتري والصفات', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'العقار المبيع', desc: 'بيانات العقار والتحفيظ', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'الشواهد الإدارية', desc: 'الإبراء ورخص التعمير', icon: FileCheck },
            { index: 5, targetStep: 4, num: '⑤', title: 'الثمن والوفاء', desc: 'الجانب المالي والالتزامات', icon: Scale },
            { index: 6, targetStep: 5, num: '⑥', title: 'مجلس الإشهاد', desc: 'التلقي الثنائي والشهود', icon: Clock },
            { index: 7, targetStep: 7, num: '⑦', title: 'التحرير والتدقيق', desc: 'الصياغة العدلية النموذجية', icon: FileText },
            { index: 8, targetStep: 8, num: '⑧', title: 'التسجيل والإيداع', desc: 'الضرائب والتأشير القضائي', icon: Lock },
          ]
        };

      case 'property_general':
        return {
          title: 'خريطة المسار الإجرائي لرسوم الأملاك والحيازة (7 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3 || step === 4) return 4;
            if (step === 5 || step === 6) return 5;
            if (step === 7) return 6;
            if (step >= 8) return 7;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي ومجلس العقد', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'أطراف الرسم', desc: 'الهويات والصفات والمستفيدون', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'موضوع التصرف', desc: 'بيانات العقار والحدود والأنصبة', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'الشواهد والوثائق', desc: 'الرسوم السابقة والشواهد', icon: FileCheck },
            { index: 5, targetStep: 5, num: '⑤', title: 'البينة والشهود', desc: 'شهود اللفيف والتلقي الثنائي', icon: Clock },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والتدقيق', desc: 'الصياغة النموذجية والمراجعة', icon: FileText },
            { index: 7, targetStep: 8, num: '⑦', title: 'التسجيل والتضمين', desc: 'إيداع الضرائب والتأشير', icon: Lock },
          ]
        };

      case 'marriage':
        return {
          title: 'خريطة المسار الإجرائي لرسم الزواج (5 مراحل قانونية متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 6 || step === 7) return 4;
            if (step >= 8) return 5;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي والإذن', desc: 'التحقق القبلي وإذن الأسرة', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'بيانات الزوجين', desc: 'الزوج والزوجة والشهود والولي', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'الصداق والشروط', desc: 'المهر والشروط الاتفاقية', icon: Heart },
            { index: 4, targetStep: 6, num: '④', title: 'التوثيق والصياغة', desc: 'التاريخ ومجلس العقد والتحرير', icon: FileText },
            { index: 5, targetStep: 8, num: '⑤', title: 'التأشير القضائي', desc: 'خطاب القاضي والحفظ بالكناش', icon: Lock },
          ]
        };

      case 'divorce':
        return {
          title: 'خريطة المسار الإجرائي للإشهاد على الطلاق (6 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step >= 2 && step <= 4) return 3;
            if (step === 5 || step === 6) return 4;
            if (step === 7) return 5;
            if (step >= 8) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي والإذن', desc: 'إذن المحكمة ومحضر الصلح', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'طرفا الإشهاد', desc: 'بيانات الزوج والمطلقة', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'مستحقات الطلاق', desc: 'نوع الطلاق والعدة والمتعة', icon: Scale },
            { index: 4, targetStep: 6, num: '④', title: 'مجلس الإشهاد', desc: 'التلقي الثنائي ومذكرة الحفظ', icon: Clock },
            { index: 5, targetStep: 7, num: '⑤', title: 'التحرير والمراجعة', desc: 'صياغة رسم الطلاق النموذجي', icon: FileText },
            { index: 6, targetStep: 8, num: '⑥', title: 'التأشير والإيداع', desc: 'خطاب القاضي وسجل الطلاق', icon: Lock },
          ]
        };

      case 'inheritance':
        return {
          title: 'خريطة المسار الإجرائي لرسوم التركات والإراثة (6 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step >= 2 && step <= 4) return 3;
            if (step === 5 || step === 6) return 4;
            if (step === 7) return 5;
            if (step >= 8) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'الهالك وطالبو الرسم', desc: 'المتوفى وطالبو الإشهاد والصفات', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'الورثة والفريضة', desc: 'حصر الورثة والأنصبة الشرعية', icon: Scale },
            { index: 4, targetStep: 5, num: '④', title: 'بينة السماع والشهود', desc: 'شهود اللفيف والتلقي الثنائي', icon: Clock },
            { index: 5, targetStep: 7, num: '⑤', title: 'التحرير والتدقيق', desc: 'صياغة الإراثة وتدقيق الأنصبة', icon: FileText },
            { index: 6, targetStep: 8, num: '⑥', title: 'التأشير والتضمين', desc: 'خطاب القاضي وسجل التركات', icon: Lock },
          ]
        };

      case 'other':
      default:
        return {
          title: 'خريطة المسار الإجرائي للوثيقة العدلية (6 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step >= 2 && step <= 4) return 3;
            if (step === 5 || step === 6) return 4;
            if (step === 7) return 5;
            if (step >= 8) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'أطراف الوثيقة', desc: 'الهويات والصفات التمثيلية', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'موضوع الوثيقة', desc: 'الصلاحيات والالتزامات والبنود', icon: FileText },
            { index: 4, targetStep: 6, num: '④', title: 'مجلس الإشهاد والتواريخ', desc: 'التلقي الثنائي وتوثيق التاريخ', icon: Clock },
            { index: 5, targetStep: 7, num: '⑤', title: 'التحرير والتدقيق', desc: 'الصياغة النموذجية والمراجعة', icon: Scale },
            { index: 6, targetStep: 8, num: '⑥', title: 'التأشير والتضمين', desc: 'مذكرة الحفظ وسجل التضمين', icon: Lock },
          ]
        };
    }
  };

  const { title, stages, getStageIndex, gridClass } = getCategoryConfig();
  const activeStageIndex = getStageIndex(currentStep);
  const currentStage = stages.find((s) => s.index === activeStageIndex) || stages[0];

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5 mb-6" dir="rtl">
      {/* Header info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 font-black text-slate-800">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse shadow-sm shadow-emerald-500" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
            <span>المرحلة الحالية:</span>
            <strong className="text-emerald-950 font-black">{currentStage.num} {currentStage.title}</strong>
            <span className="text-emerald-600 font-semibold">({activeStageIndex} من {stages.length})</span>
          </span>
        </div>
      </div>

      {/* Grid of stages */}
      <div className={`grid ${gridClass} gap-2`}>
        {stages.map((st) => {
          const Icon = st.icon;
          const isCurrent = st.index === activeStageIndex;
          const isPassed = st.index < activeStageIndex;
          const isFuture = st.index > activeStageIndex;

          return (
            <div
              key={st.index}
              onClick={() => {
                if (isPassed && onStepClick) {
                  onStepClick(st.targetStep);
                }
              }}
              className={`group relative flex flex-col justify-between rounded-xl p-2.5 text-center transition-all duration-200 ${
                isCurrent
                  ? 'border-2 border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                  : isPassed
                  ? 'border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer'
                  : 'border border-slate-200/80 bg-slate-50/50 opacity-70'
              }`}
              title={isPassed ? 'انقر للعودة لهذه المرحلة السابقة' : st.title}
            >
              {/* Top number & status icon */}
              <div className="flex w-full items-center justify-between gap-1 mb-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isPassed
                      ? 'bg-emerald-200 text-emerald-900 font-bold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPassed ? '✓' : st.index}
                </span>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${
                    isCurrent
                      ? 'text-emerald-700'
                      : isPassed
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Title and Short Description */}
              <div className="space-y-0.5 text-right">
                <div
                  className={`text-[11px] font-black truncate leading-tight ${
                    isCurrent
                      ? 'text-emerald-900 font-black'
                      : isPassed
                      ? 'text-slate-800 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {st.title}
                </div>
                <div className="text-[9px] text-slate-400 truncate leading-none">
                  {st.desc}
                </div>
              </div>

              {/* Active Indicator Bar */}
              {isCurrent && (
                <div className="absolute -bottom-[2px] left-2 right-2 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

