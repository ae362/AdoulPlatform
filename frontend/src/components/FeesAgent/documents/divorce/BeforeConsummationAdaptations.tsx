import React from 'react';
import { Lock, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export type DowryStatusType = 'fully_received' | 'half_prescribed' | 'not_specified';

interface BeforeConsummationDuesFormProps {
  dowryStatus: DowryStatusType;
  onDowryStatusChange: (status: DowryStatusType) => void;
  mutaaAmount: number;
  onMutaaAmountChange: (amount: number) => void;
  labelVariant?: 'consensual' | 'discord' | 'khul' | 'tamlik';
}

/**
 * شاشة المستحقات المالية المعدلة تلقائياً عند اختيار الطلاق قبل الدخول والبناء
 * تطبيقاً للمادة 71 و135 من مدونة الأسرة
 */
export const BeforeConsummationDuesForm: React.FC<BeforeConsummationDuesFormProps> = ({
  dowryStatus,
  onDowryStatusChange,
  mutaaAmount,
  onMutaaAmountChange,
  labelVariant = 'consensual'
}) => {
  const getMutaaLabel = () => {
    switch (labelVariant) {
      case 'discord':
        return 'المتعة أو التعويض القضائي المحكوم به:';
      case 'khul':
        return 'المتعة أو بدل الخلع / التعويض الاتفاقي:';
      case 'tamlik':
      case 'consensual':
      default:
        return 'المتعة أو التعويض الاتفاقي/القضائي:';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* تنبيه التكييف القانوني */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800 font-bold text-lg">
          ⚖️
        </div>
        <div>
          <h4 className="font-extrabold text-sm text-amber-950">
            تكييف آلي لشاشة المستحقات المالية — طلاق قبل الدخول (المادة 71 و135 من مدونة الأسرة)
          </h4>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            تمت مواءمة الحقول المالية آلياً لعدم ثبوت الدخول الشرعي، حيث يقتصر الأثر المالي على مصير الصداق والمتعة/التعويض، وتسقط نفقة العدة والسكنى بقوة القانون.
          </p>
        </div>
      </div>

      {/* 1. موقف الصداق / المهر */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-black text-slate-800">
          موقف الصداق / المهر:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'fully_received' as const,
              label: 'تم قبضه كاملاً',
              desc: 'صرحت الزوجة أو ثبت قبض الصداق المسمى كاملاً قبل الطلاق'
            },
            {
              id: 'half_prescribed' as const,
              label: 'تجب نصف الفريضة (نصف الصداق)',
              desc: 'تستحق المطلقة نصف الصداق المسمى قانوناً لعدم البناء (المادة 71)'
            },
            {
              id: 'not_specified' as const,
              label: 'لم يحدد صداق (مهر المثل/المتعة)',
              desc: 'لم يُسمّ صداق في العقد وتستحق الزوجة المتعة المقررة'
            }
          ].map((opt) => {
            const isSelected = dowryStatus === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1.5">
                  <input
                    type="radio"
                    name="beforeConsummationDowryStatus"
                    checked={isSelected}
                    onChange={() => onDowryStatusChange(opt.id)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600"
                  />
                  <span>🔘 {opt.label}</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-normal">{opt.desc}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. نفقة العدة: (مغلقة / غير مستحقة) */}
      <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-300 space-y-1.5">
        <label className="block text-xs font-black text-slate-600">
          نفقة العدة:
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/80 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" />
            <span className="font-extrabold text-sm text-rose-700">(مغلقة / غير مستحقة)</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            🔒 لا عدة على المطلقة قبل الدخول (المادة 135 من مدونة الأسرة) — معفاة من العدة وتوابعها
          </span>
        </div>
      </div>

      {/* 3. المتعة أو التعويض الاتفاقي/القضائي */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-black text-slate-800">
          {getMutaaLabel()}
        </label>
        <div className="relative max-w-md">
          <input
            type="number"
            min={0}
            value={mutaaAmount === 0 ? '' : mutaaAmount}
            onChange={(e) => onMutaaAmountChange(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
            className="w-full pl-14 pr-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
          />
          <span className="absolute left-4 top-3.5 text-xs font-bold text-slate-500">درهم</span>
        </div>
        <p className="text-xs text-slate-500">
          المبلغ المحدد الواجب أداؤه للزوجة كمتعة أو تعويض وفق المنصوص عليه شرعاً وقانوناً.
        </p>
      </div>
    </div>
  );
};

/**
 * تنبيه إلغاء وتعطيل مرحلة الأبناء والحضانة قبل الدخول
 */
export const BeforeConsummationChildrenNotice: React.FC = () => {
  return (
    <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 text-center space-y-4 animate-fadeIn shadow-sm" dir="rtl">
      <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner border border-blue-200">
        ℹ️
      </div>
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-black text-blue-950">
          تنبيه النظام القضائي
        </h4>
        <p className="text-sm sm:text-base font-extrabold text-blue-900 leading-relaxed max-w-xl mx-auto">
          ℹ️ تنبيه النظام: تم إلغاء مرحلة بيانات الأبناء والحضانة تلقائياً لعدم وجود دخلة شرعية.
        </p>
      </div>
      <p className="text-xs text-blue-700/90 max-w-lg mx-auto leading-relaxed">
        بما أن الطلاق وقع قبل الدخول والبناء، فإنه لا تترتب عليه آثار نسب أو حضانة أو نفقة أطفال. تم قفل وإلغاء هذه المرحلة في إجراءات تحرير الرسم.
      </p>
      <div className="pt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 border border-blue-200 rounded-full text-xs font-bold text-blue-800 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          المرحلة معطلة تلقائياً — يرجى الضغط على زر «التالي» للمتابعة
        </span>
      </div>
    </div>
  );
};

/**
 * تنبيه تجاوز مرحلة التحقق من الحمل قبل الدخول
 */
export const BeforeConsummationPregnancyNotice: React.FC = () => {
  return (
    <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 text-center space-y-4 animate-fadeIn shadow-sm" dir="rtl">
      <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-200">
        ℹ️
      </div>
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-black text-amber-950">
          تنبيه النظام القضائي
        </h4>
        <p className="text-sm sm:text-base font-extrabold text-amber-950 leading-relaxed max-w-xl mx-auto">
          ℹ️ تنبيه النظام: تم تجاوز مرحلة التحقق من الحمل تلقائياً (لا عدة على المطلقة قبل الدخول - المادة 135 من مدونة الأسرة).
        </p>
      </div>
      <p className="text-xs text-amber-800/90 max-w-lg mx-auto leading-relaxed">
        المطلقة قبل البناء لا تلزمها عدة شرعية ولا يُعتدّ بفرضية الحمل في مسطرة الطلاق قبل الدخول، وتم استبعاد الفحوصات والأسئلة المتعلقة بالحمل آلياً.
      </p>
      <div className="pt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 border border-amber-200 rounded-full text-xs font-bold text-amber-900 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          المرحلة متجاوزة تلقائياً — يرجى الضغط على زر «التالي» للمتابعة
        </span>
      </div>
    </div>
  );
};
