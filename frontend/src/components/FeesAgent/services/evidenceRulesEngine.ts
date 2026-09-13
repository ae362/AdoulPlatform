/**
 * محرك وقاموس القواعد القانونية والإجرائية لطرق الإثبات والشهادة والتحري
 * Legal Rules & Evidence Methods Engine (Laws 16.03 & 51.26)
 * 
 * Target: Moroccan Notarial System (خطة العدالة المغربية)
 * Encoding: UTF-8 strictly preserved
 */

import type { Witness, WitnessAgeStatus, WitnessKinshipRelation, WitnessInquestResult } from '../../../types/feesAgentTypes';

export type EvidenceMethod = 'none' | 'lafif' | 'scientific' | 'mithliya';

export interface EvidenceMethodOption {
  id: EvidenceMethod;
  title: string;
  shortDesc: string;
  longDesc: string;
  badge: string;
  themeColor: {
    border: string;
    bg: string;
    hoverBg: string;
    accent: string;
    text: string;
    selectedRing: string;
  };
}

export interface DocumentEvidenceRule {
  documentType: string;
  arabicName: string;
  defaultMethod: EvidenceMethod;
  allowedMethods: EvidenceMethod[];
  minimumWitnesses: number;
  maximumWitnesses: number | null;
  bearingAgeMin: number; // سن التمييز وقت التحمل
  performanceAgeMin: number; // سن الرشد وقت الأداء
  requiresInquest: boolean;
  forbiddenKinshipDegrees: number[]; // الدرجات المحظورة (الأولى والثانية...)
  legalReference: string;
  effectiveDate: string;
  ruleVersion: string;
  recommendationReason: string;
  whyExplainer: {
    dualAge: string;
    minimumWitnesses: string;
    inquestAndKinship: string;
    scientificPermission?: string;
  };
}

// ============================================================================
// بطاقات طرق الإثبات الأربعة
// ============================================================================
export const EVIDENCE_METHODS_CONFIG: Record<EvidenceMethod, EvidenceMethodOption> = {
  none: {
    id: 'none',
    title: 'لا تستلزم شهادة خاصة',
    shortDesc: 'رسم يتلقى من الأطراف أو بحكم طبيعته دون مسار خاص للشهود',
    longDesc: 'هذا الرسم يتم تلقيه من الأطراف أو وفق طبيعته القانونية دون مسار خاص لشهادة اللفيف أو الشهادة العلمية أو الشهادة بالمثلية.',
    badge: 'تلقٍ مباشر للأطراف',
    themeColor: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/70',
      hoverBg: 'hover:bg-emerald-50',
      accent: 'text-emerald-700',
      text: 'text-emerald-950',
      selectedRing: 'ring-2 ring-emerald-600 border-emerald-500 shadow-emerald-700/15',
    },
  },
  lafif: {
    id: 'lafif',
    title: 'شهادة اللفيف',
    shortDesc: 'شهادة جماعية يؤديها 12 شاهداً على الأقل وفق المادة 67',
    longDesc: 'شهادة جماعية تؤدى أمام العدلين وفق الشروط القانونية الخاصة بشهادة اللفيف (المادة 67 من القانون 51.26)، مع التحقق المزدوج للسن والتحري.',
    badge: '12 شاهداً فأكثر + تحرٍ',
    themeColor: {
      border: 'border-blue-200',
      bg: 'bg-blue-50/70',
      hoverBg: 'hover:bg-blue-50',
      accent: 'text-blue-700',
      text: 'text-blue-950',
      selectedRing: 'ring-2 ring-blue-600 border-blue-500 shadow-blue-700/15',
    },
  },
  scientific: {
    id: 'scientific',
    title: 'شهادة علمية',
    shortDesc: 'شهادة يتلقاها العدلان بناءً على إذن قضائي ومراجع مقررة',
    longDesc: 'شهادة علمية يتلقاها العدلان وفق الإذن القضائي والضوابط القانونية المقررة والمراجع القضائية المرتبطة بالإذن.',
    badge: 'إذن قاضي التوثيق + عدلان',
    themeColor: {
      border: 'border-purple-200',
      bg: 'bg-purple-50/70',
      hoverBg: 'hover:bg-purple-50',
      accent: 'text-purple-700',
      text: 'text-purple-950',
      selectedRing: 'ring-2 ring-purple-600 border-purple-500 shadow-purple-700/15',
    },
  },
  mithliya: {
    id: 'mithliya',
    title: 'شهادة بالمثلية',
    shortDesc: 'شهادة يؤديها عدل مع تسجيل 6 شهود مرتبطين بها',
    longDesc: 'شهادة يؤديها عدل وفق الشروط الخاصة بهذا المسار، مع تسجيل الشهود الستة المرتبطين بها والتحقق من نصابهم الشرعي.',
    badge: 'العدل + 6 شهود',
    themeColor: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/70',
      hoverBg: 'hover:bg-amber-50',
      accent: 'text-amber-700',
      text: 'text-amber-950',
      selectedRing: 'ring-2 ring-amber-600 border-amber-500 shadow-amber-700/15',
    },
  },
};

// ============================================================================
// القاموس القانوني لطرق الإثبات الافتراضية والبديلة
// ============================================================================
export const EVIDENCE_RULES_DICTIONARY: Record<string, DocumentEvidenceRule> = {
  // 1. ثبوت الملكية
  ملكية: {
    documentType: 'ملكية',
    arabicName: 'ثبوت الملكية (الملكية)',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'القانون رقم 51.26 - المادة 67 المنظمة لشهادة اللفيف ومدونة الحقوق العينية',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت الملكية، فإن الأصل المقرّر فقهاً وقانوناً لإثبات الملك العقاري غير المحفظ هو شهادة اللفيف المكتملة النصاب.',
    whyExplainer: {
      dualAge: 'تفرض المادة 67 من القانون 51.26 التمييز بين زمن تحمّل الشهادة (سن التمييز 12 سنة) وزمن أدائها أمام العدلين (سن الرشد 18 سنة).',
      minimumWitnesses: 'الحد الأدنى القانوني لشهادة اللفيف هو 12 شاهداً ولا حد أقصى للزيادة لتعزيز قوة الإثبات.',
      inquestAndKinship: 'يُلزم العدل بالتحري في أفراد اللفيف لضمان خلوهم من موانع الشهادة كالقرابة المباشرة (الدرجة الأولى والثانية) أو المصلحة الشخصية.',
    },
  },

  // 2. الحيازة
  حيازة: {
    documentType: 'حيازة',
    arabicName: 'رسم الحيازة والاستمرار',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'القانون رقم 51.26 ومدونة الحقوق العينية - شروط حيازة العقار',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: الحيازة، فإن إثبات وضع اليد والاستمرار المكسب للملكية يستلزم شهادة لفيف من أهل الخبرة والجوار.',
    whyExplainer: {
      dualAge: 'يجب أن يكون الشاهد مميزاً وقت معاينة الحيازة وبالغاً سن الرشد عند التلقي والأداء العدلي.',
      minimumWitnesses: 'لا يقل نصاب اللفيف في الحيازة والاستمرار عن 12 شاهداً من أهل المعرفة بالمحل.',
      inquestAndKinship: 'التحقق من عدم جر الشاهد نفعاً لنفسه وعدم وجود قرابة قريبة مانعة من الشهادة بطالب الحيازة.',
    },
  },

  // 3. ثبوت البناء
  ثبوت_بناء: {
    documentType: 'ثبوت_بناء',
    arabicName: 'ثبوت البناء والمنشآت',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'القانون رقم 51.26 - قواعد الإثبات العقاري والشهادة على البناء الذاتي',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت البناء، فإن إثبات إقامة البناء بمال طالب الشهادة في الوعاء العقاري يستوجب شهادة اللفيف.',
    whyExplainer: {
      dualAge: 'يشترط التمييز وقت تحمّل الشهادة ومعاينة إنجاز البناء، وبلوغ سن الرشد وقت التلقي العدلي.',
      minimumWitnesses: 'الحد الأدنى القانوني هو 12 شاهداً على الأقل لإثبات الواقعة المادية للبناء.',
      inquestAndKinship: 'التحري في معرفة الشهود بحقيقة تمويل البناء وخلوهم من صلات القرابة المانعة.',
    },
  },

  // 4. رسم استمرار زواج (مخصص)
  رسم_استمرار_زواج: {
    documentType: 'رسم_استمرار_زواج',
    arabicName: 'رسم استمرار الزواج',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya', 'none'],
    minimumWitnesses: 12, // يفضل اللفيف أو شهود الاستمرار المعتمدين (2-12)
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1], // الوالدان والأبناء
    legalReference: 'مدونة الأسرة والقانون 51.26 - المقتضيات التوثيقية لإثبات دوام الرابطة الزوجية',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: رسم استمرار زواج، يوصي النظام باعتماد شهادة اللفيف أو بينة الشهود لإثبات استمرار المعاشرة الزوجية دون انقطاع.',
    whyExplainer: {
      dualAge: 'الشهادة على استمرار الزواج تستوجب إدراك الشاهد للرابطة الزوجية وتوافر شروط الأداء عند الإشهاد.',
      minimumWitnesses: 'إذا اعتمد مسار اللفيف فلا يقل عن 12 شاهداً، ويمكن اعتماد بينة الشهود العدول وفق المقرر قانوناً.',
      inquestAndKinship: 'التحري في عدم وجود مصلحة أو خصومة والتأكد من علم الشاهد بالمساكنة الشرعية.',
    },
  },

  // 5. إحصاء متروك
  احصاء_متروك: {
    documentType: 'احصاء_متروك',
    arabicName: 'رسم إحصاء المتروك',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'none'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'مدونة الأسرة (كتاب المواريث) والقانون 51.26 المنظم للمهنة',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: إحصاء المتروك، فإن حصر عناصر التركة المنقولة والعقارية يتطلب شهادة اللفيف لإثبات عدم التفريط أو الإخفاء.',
    whyExplainer: {
      dualAge: 'يشترط التمييز وقت علم الشاهد بالمتروك، والرشد وقت أداء الشهادة وحصر التركة.',
      minimumWitnesses: 'النصاب الشرعي والقانوني المعتمد هو 12 شاهداً على الأقل من مخالطي المتوفى.',
      inquestAndKinship: 'التحقق المشدد من أن الشاهد ليس وارثاً ولا موصى له ولا دائناً للتركة.',
    },
  },

  // 6. ثبوت مخلف
  ثبوت_مخلف: {
    documentType: 'ثبوت_مخلف',
    arabicName: 'رسم ثبوت المخلف',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'القانون رقم 51.26 ومدونة الأسرة - إثبات الأموال المخلفة عن المتوفى',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت مخلف، تتطلب القواعد التوثيقية شهادة اللفيف لإثبات ترك الهالك للأموال المحددة.',
    whyExplainer: {
      dualAge: 'اشتراط التمييز عند المعاينة والرشد عند الإشهاد العدلي.',
      minimumWitnesses: '12 شاهداً على الأقل لثبوت المخلف العقاري أو المالي.',
      inquestAndKinship: 'استبعاد كل ذي مصلحة أو قرابة مانعة من الشهود.',
    },
  },

  // 7. إراثة
  اراثة: {
    documentType: 'اراثة',
    arabicName: 'رسم الإراثة الشرعية',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'مدونة الأسرة والقانون 51.26 - المادة 67',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: الإراثة، فإن إثبات الوفاة وانحصار الورثة يستلزم شهادة لفيف من اثني عشر شاهداً عارفين بالنسب.',
    whyExplainer: {
      dualAge: 'وجوب سن التمييز عند معرفة الهالك وسن الرشد الكامل عند أداء الشهادة في الإراثة.',
      minimumWitnesses: '12 شاهداً عارفين بالهالك وأسرته وانحصار الورثة فيه.',
      inquestAndKinship: 'التحري في عدم وجود نفع للشاهد واستبعاد الورثة من أداء شهادة اللفيف لصالح أنفسهم.',
    },
  },

  // 8. ثبوت نسب ببينة السماع
  ثبوت_نسب_ببينة_السماع: {
    documentType: 'ثبوت_نسب_ببينة_السماع',
    arabicName: 'ثبوت النسب ببينة السماع الفاشي',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1],
    legalReference: 'مدونة الأسرة - المادة 158 وما بعدها والقانون 51.26',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت النسب، يقرر الفقه والقانون المغربي إثبات النسب ببينة السماع الفاشي المستفيض عبر اللفيف.',
    whyExplainer: {
      dualAge: 'يشترط سماع الشاهد بالنسب وقت كونه مميزاً وسن الرشد عند الأداء أمام العدلين.',
      minimumWitnesses: '12 شاهداً على الأقل للسماع الفاشي والشهرة بالنسب.',
      inquestAndKinship: 'التحري في مخالطة الشاهد للأسرة ومدى علمه باعتراف الأب عملياً بالولد.',
    },
  },

  // 9. ثبوت زينة عقار
  ثبوت_زينة_عقار: {
    documentType: 'ثبوت_زينة_عقار',
    arabicName: 'ثبوت زينة عقار',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'مدونة الحقوق العينية والقانون 51.26',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت زينة عقار، يستوجب إثبات إحداث الزينة شهادة اللفيف.',
    whyExplainer: {
      dualAge: 'التمييز وقت إنشاء الزينة والرشد وقت التوثيق.',
      minimumWitnesses: '12 شاهداً على الأقل.',
      inquestAndKinship: 'التحري في طبيعة الإنشاء والعلاقة بمالك الرقبة.',
    },
  },

  // 10. ثبوت مرفق
  ثبوت_مرفق: {
    documentType: 'ثبوت_مرفق',
    arabicName: 'ثبوت حق الارتفاق والمرفق',
    defaultMethod: 'lafif',
    allowedMethods: ['lafif', 'scientific', 'mithliya'],
    minimumWitnesses: 12,
    maximumWitnesses: null,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'مدونة الحقوق العينية - حقوق الارتفاق والقانون 51.26',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'بناءً على نوع الرسم المحدد: ثبوت مرفق، يتم إثبات الارتفاق القديم الظاهر بشهادة اللفيف.',
    whyExplainer: {
      dualAge: 'التمييز وقت معاينة المرفق المستمر والرشد وقت الإشهاد.',
      minimumWitnesses: '12 شاهداً على الأقل من الجيران وأهل الموضع.',
      inquestAndKinship: 'التحقق من عدم وجود نزاع قضائي قائم والتحري في صلة الشاهد.',
    },
  },

  // 11. وصية
  وصية: {
    documentType: 'وصية',
    arabicName: 'رسم الوصية',
    defaultMethod: 'none',
    allowedMethods: ['none', 'lafif', 'scientific'],
    minimumWitnesses: 2,
    maximumWitnesses: 12,
    bearingAgeMin: 12,
    performanceAgeMin: 18,
    requiresInquest: true,
    forbiddenKinshipDegrees: [1, 2],
    legalReference: 'مدونة الأسرة (كتاب الوصية) والقانون 51.26',
    effectiveDate: '2026-11-09',
    ruleVersion: '1.0',
    recommendationReason: 'الوصية تتلقى أساساً بإشهاد الموصي أمام العدلين، وعند الحاجة لإثباتها بعد الوفاة تستلزم بينة الشهود أو اللفيف.',
    whyExplainer: {
      dualAge: 'التمييز وقت سماع إرادة الموصي والرشد وقت الأداء.',
      minimumWitnesses: 'شاهدان عدلان على الأقل أو شهادة اللفيف.',
      inquestAndKinship: 'منع المستفيد من الوصية أو أصوله وفروعه من الشهادة عليها.',
    },
  },
};

// القاعدة الافتراضية لأي رسم لا يستلزم شهوداً (مثل البيوع والرهون والكراء)
export const DEFAULT_CONTRACTUAL_EVIDENCE_RULE: DocumentEvidenceRule = {
  documentType: 'عقد_اتفاقي',
  arabicName: 'محرر اتفاقي أو تصرف عقاري',
  defaultMethod: 'none',
  allowedMethods: ['none', 'scientific', 'lafif'],
  minimumWitnesses: 0,
  maximumWitnesses: null,
  bearingAgeMin: 12,
  performanceAgeMin: 18,
  requiresInquest: false,
  forbiddenKinshipDegrees: [],
  legalReference: 'القانون رقم 51.26 المتعلق بخطة العدالة والالتزامات والعقود',
  effectiveDate: '2026-11-09',
  ruleVersion: '1.0',
  recommendationReason: 'هذا الرسم يتم تلقيه مباشرة من أطراف العقد أمام العدلين ولا يستلزم مسار شهادة خاصة.',
  whyExplainer: {
    dualAge: 'لا يتطلب الرسم شهوداً إضافيين، ويكتفى بأهلية أطراف العقد.',
    minimumWitnesses: 'التلقي الثنائي للعدلين يغني عن شهود إضافيين في التصرفات الاتفاقية.',
    inquestAndKinship: 'التحقق من أهلية الأطراف وصحة التعبير عن الإرادة.',
  },
};

/**
 * استرجاع قاعدة الإثبات الخاصة بنوع الرسم
 */
export function getEvidenceRuleForDocument(documentType: string): DocumentEvidenceRule {
  if (!documentType) return DEFAULT_CONTRACTUAL_EVIDENCE_RULE;
  const cleanKey = documentType.trim();
  if (EVIDENCE_RULES_DICTIONARY[cleanKey]) {
    return EVIDENCE_RULES_DICTIONARY[cleanKey];
  }
  // فحص مرن بالاحتواء
  for (const [key, rule] of Object.entries(EVIDENCE_RULES_DICTIONARY)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      return rule;
    }
  }
  return DEFAULT_CONTRACTUAL_EVIDENCE_RULE;
}

/**
 * هل هذا الرسم يستلزم شهوداً أو استمرار زواج؟
 */
export function isWitnessApplicableDeed(documentType: string): boolean {
  if (!documentType) return false;
  const rule = getEvidenceRuleForDocument(documentType);
  return rule.defaultMethod === 'lafif' || documentType === 'رسم_استمرار_زواج' || rule.allowedMethods.includes('lafif');
}

// ============================================================================
// دوال الحساب والتحقق الذكي (السن، القرابة، التحري)
// ============================================================================

/**
 * حساب السن عند تاريخ محدد بدقة السنوات والأشهر
 */
export function calculateAgeAtDate(birthDateStr?: string, targetDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;

  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  if (isNaN(targetDate.getTime())) return null;

  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * حساب البداية التقديرية للفترة المدعى بها (تاريخ التلقي/الأداء ناقص مدة الواقعة)
 */
export function calculatePeriodStartDate(
  depositionDateStr: string,
  periodType: 'duration_years' | 'exact_start_date' | 'approx_year',
  options?: {
    claimedDurationYears?: number;
    exactStartDate?: string;
    approxStartYear?: number;
  }
): string {
  if (periodType === 'exact_start_date' && options?.exactStartDate) {
    return options.exactStartDate;
  }
  if (periodType === 'approx_year' && options?.approxStartYear) {
    return `${options.approxStartYear}-01-01`;
  }
  const depDate = new Date(depositionDateStr || new Date().toISOString().split('T')[0]);
  const safeYears = options?.claimedDurationYears && options.claimedDurationYears > 0 ? options.claimedDurationYears : 20;
  const startYear = depDate.getFullYear() - safeYears;
  const startMonth = String(depDate.getMonth() + 1).padStart(2, '0');
  const startDay = String(depDate.getDate()).padStart(2, '0');
  return `${startYear}-${startMonth}-${startDay}`;
}

/**
 * استخراج تاريخ التحمل الفعلي للشاهد بناءً على النمط المصرح به:
 * 1) تاريخ مضبوط (exact_date)
 * 2) سنة محددة (year_only)
 * 3) مدة تقريبية (relative_years)
 */
export function resolveEffectiveBearingDate(
  witness: Partial<Witness>,
  depositionDateStr?: string
): string {
  const depDateStr = depositionDateStr || witness.testimonyDate || new Date().toISOString().split('T')[0];
  const depYear = new Date(depDateStr).getFullYear();

  if (witness.bearingMode === 'year_only' && witness.bearingYear) {
    return `${witness.bearingYear}-01-01`;
  }

  if (witness.bearingMode === 'relative_years' && witness.bearingRelativeYears) {
    const calculatedYear = Math.max(1900, depYear - witness.bearingRelativeYears);
    const depDate = new Date(depDateStr);
    const m = String(depDate.getMonth() + 1).padStart(2, '0');
    const d = String(depDate.getDate()).padStart(2, '0');
    return `${calculatedYear}-${m}-${d}`;
  }

  if (witness.hearingDate) {
    return witness.hearingDate;
  }

  return depDateStr;
}

/**
 * فحص السن المزدوج للشاهد (التمييز عند التحمل والرشد عند الأداء) مع دعم الأنماط الثلاثة للتحمل
 */
export function evaluateWitnessDualAge(
  birthDate?: string,
  hearingDate?: string,
  testimonyDate?: string,
  rule?: DocumentEvidenceRule,
  witnessExtra?: Partial<Witness>
): {
  bearingAge: number | null;
  performanceAge: number | null;
  bearingStatus: WitnessAgeStatus;
  performanceStatus: WitnessAgeStatus;
  overallStatus: 'valid' | 'invalid' | 'pending';
  bearingText: string;
  performanceText: string;
  reason?: string;
  effectiveBearingDate: string;
} {
  const bearingMin = rule?.bearingAgeMin ?? 12;
  const performanceMin = rule?.performanceAgeMin ?? 18;

  const todayStr = new Date().toISOString().split('T')[0];
  const resolvedTestimonyDate = testimonyDate || todayStr;

  // استخراج تاريخ التحمل الفعلي عبر النمط المرن أو الحقل المباشر
  const effectiveBearingDate = witnessExtra
    ? resolveEffectiveBearingDate({ ...witnessExtra, hearingDate, testimonyDate: resolvedTestimonyDate }, resolvedTestimonyDate)
    : (hearingDate || todayStr);

  if (!birthDate) {
    return {
      bearingAge: null,
      performanceAge: null,
      bearingStatus: 'pending',
      performanceStatus: 'pending',
      overallStatus: 'pending',
      bearingText: 'تاريخ الازدياد غير محدد',
      performanceText: 'تاريخ الازدياد غير محدد',
      reason: 'يرجى إدخال تاريخ ازدياد الشاهد لحساب السن آلياً.',
      effectiveBearingDate,
    };
  }

  const bearingAge = calculateAgeAtDate(birthDate, effectiveBearingDate);
  const performanceAge = calculateAgeAtDate(birthDate, resolvedTestimonyDate);

  const bearingValid = bearingAge !== null && bearingAge >= bearingMin;
  const performanceValid = performanceAge !== null && performanceAge >= performanceMin;

  const bearingStatus: WitnessAgeStatus = bearingAge === null ? 'pending' : bearingValid ? 'valid' : 'invalid';
  const performanceStatus: WitnessAgeStatus = performanceAge === null ? 'pending' : performanceValid ? 'valid' : 'invalid';

  let overallStatus: 'valid' | 'invalid' | 'pending' = 'valid';
  let reason = '';

  if (bearingStatus === 'invalid' && performanceStatus === 'invalid') {
    overallStatus = 'invalid';
    reason = `مانع قانوني: الشاهد لم يبلغ سن التمييز (${bearingMin} سنة) عند تحمّل الشهادة (عمره آنذاك: ${bearingAge} سنة)، ولم يبلغ سن الرشد (${performanceMin} سنة) عند أدائها (عمره: ${performanceAge} سنة).`;
  } else if (bearingStatus === 'invalid') {
    overallStatus = 'invalid';
    reason = `مانع قانوني: الشاهد لم يبلغ سن التمييز المقرر (${bearingMin} سنة) في التاريخ المحدد لتحمّل الشهادة (عمره في تاريخ الواقعة: ${bearingAge} سنة - المادة 206 مدونة الأسرة).`;
  } else if (performanceStatus === 'invalid') {
    overallStatus = 'invalid';
    reason = `مانع قانوني: الشاهد لم يبلغ سن الرشد القانوني (${performanceMin} سنة) في تاريخ أداء الشهادة (السن المحسوب: ${performanceAge} سنة - المادة 209 مدونة الأسرة).`;
  } else if (bearingStatus === 'pending' || performanceStatus === 'pending') {
    overallStatus = 'pending';
    reason = 'يتعذر حسم شرط السن آلياً بسبب نقص تاريخ التحمل أو الأداء.';
  } else {
    overallStatus = 'valid';
    reason = `بلغ الشاهد سن التمييز وقت تحمّل الشهادة (${bearingAge} سنة)، وبلغ سن الرشد وقت أدائها (${performanceAge} سنة).`;
  }

  return {
    bearingAge,
    performanceAge,
    bearingStatus,
    performanceStatus,
    overallStatus,
    bearingText: bearingAge !== null ? `${bearingAge} سنة (${bearingValid ? 'مستوفٍ لسن التمييز' : 'دون سن التمييز'})` : 'غير محدد',
    performanceText: performanceAge !== null ? `${performanceAge} سنة (${performanceValid ? 'مستوفٍ لسن الرشد' : 'دون سن الرشد'})` : 'غير محدد',
    reason,
    effectiveBearingDate,
  };
}

/**
 * تقييم مدى تغطية علم الشاهد للفترة المدعى بها (مثلاً الحيازة 20 سنة)
 */
export function evaluateWitnessCoverage(
  effectiveBearingDate: string,
  claimedStartDate: string,
  depositionDate: string
): {
  coversClaimedStart: boolean;
  coverageYears: number;
  totalClaimedYears: number;
  note: string;
} {
  const bearingYear = new Date(effectiveBearingDate).getFullYear();
  const claimedStartYear = new Date(claimedStartDate).getFullYear();
  const depYear = new Date(depositionDate || new Date().toISOString().split('T')[0]).getFullYear();

  const totalClaimedYears = Math.max(1, depYear - claimedStartYear);
  const coverageYears = Math.max(0, depYear - bearingYear);
  const coversClaimedStart = bearingYear <= claimedStartYear;

  let note = '';
  if (coversClaimedStart) {
    note = `✅ يغطي الشاهد كامل الفترة المدعى بها (علم بالواقعة منذ سنة ${bearingYear} أي ما يعادل ${coverageYears} سنة).`;
  } else {
    note = `⚠️ يغطي الشاهد مدة (${coverageYears} سنة) تبدأ من سنة ${bearingYear}، ولا يغطي كامل الفترة المدعى بها (${totalClaimedYears} سنة). تقبل شهادته في حدود ما عاينه شرعاً وقانوناً.`;
  }

  return {
    coversClaimedStart,
    coverageYears,
    totalClaimedYears,
    note,
  };
}

/**
 * التحقق من القرابة وموانع القانون 51.26
 */
export function evaluateWitnessKinship(
  relation?: WitnessKinshipRelation,
  degree?: number | string,
  rule?: DocumentEvidenceRule
): {
  status: 'valid' | 'invalid' | 'warning' | 'clean';
  reason?: string;
  isForbidden: boolean;
} {
  if (!relation || relation === 'none') {
    return {
      status: 'clean',
      reason: 'لا توجد صلة قرابة أو مصاهرة مصرح بها مع طالب الشهادة.',
      isForbidden: false,
    };
  }

  if (relation === 'unsure') {
    return {
      status: 'warning',
      reason: 'حالة غير مؤكدة تستوجب تحري العدل الإضافي في صلة القرابة قبل الاعتماد النهائي.',
      isForbidden: false,
    };
  }

  const forbiddenDegrees = rule?.forbiddenKinshipDegrees ?? [1, 2];
  const parsedDegree = typeof degree === 'string' ? parseInt(degree, 10) : degree;

  if (parsedDegree && forbiddenDegrees.includes(parsedDegree)) {
    return {
      status: 'invalid',
      reason: `تعارض مع شرط القرابة: صلة الشاهد بطالب الشهادة من الدرجة (${parsedDegree})، وهي درجة محظورة قانوناً تؤدي لرد الشهادة أو منع اعتمادها.`,
      isForbidden: true,
    };
  }

  return {
    status: 'valid',
    reason: `صلة القرابة مصرح بها (الدرجة: ${parsedDegree || 'غير محددة'})، ولا يظهر مانع آلي مباشر وفق قاعدة هذا الرسم.`,
    isForbidden: false,
  };
}

/**
 * تقييم شامل لحالة الشاهد الواحد (السن + التحري + القرابة)
 */
export function evaluateWitnessCompleteness(witness: Witness, rule?: DocumentEvidenceRule): {
  isFullyApproved: boolean;
  hasBlocker: boolean;
  blockReason?: string;
  ageCheck: ReturnType<typeof evaluateWitnessDualAge>;
  kinshipCheck: ReturnType<typeof evaluateWitnessKinship>;
  inquestResult: WitnessInquestResult;
} {
  const ageCheck = evaluateWitnessDualAge(
    witness.dateOfBirth,
    witness.hearingDate,
    witness.testimonyDate,
    rule,
    witness
  );

  const kinshipCheck = evaluateWitnessKinship(
    witness.kinshipRelation,
    witness.kinshipDegree,
    rule
  );

  const inquestResult: WitnessInquestResult =
    witness.inquestResult || (kinshipCheck.isForbidden || ageCheck.overallStatus === 'invalid' ? 'invalid' : 'incomplete');

  const hasAgeBlocker = ageCheck.overallStatus === 'invalid';
  const hasKinshipBlocker = kinshipCheck.isForbidden;
  const hasInquestBlocker = inquestResult === 'invalid';

  const hasBlocker = hasAgeBlocker || hasKinshipBlocker || hasInquestBlocker;

  let blockReason = '';
  if (hasAgeBlocker) blockReason = ageCheck.reason || 'عدم استيفاء السن القانوني';
  else if (hasKinshipBlocker) blockReason = kinshipCheck.reason || 'مانع قرابة محظورة';
  else if (hasInquestBlocker) blockReason = witness.inquestBlockReason || 'مانع مكتشف بالتحري';

  const isFullyApproved =
    !hasBlocker &&
    ageCheck.overallStatus === 'valid' &&
    !!witness.name?.trim() &&
    !!witness.idNumber?.trim() &&
    inquestResult === 'valid';

  return {
    isFullyApproved,
    hasBlocker,
    blockReason,
    ageCheck,
    kinshipCheck,
    inquestResult,
  };
}

