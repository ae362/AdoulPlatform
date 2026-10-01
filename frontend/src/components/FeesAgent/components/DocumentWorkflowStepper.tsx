import {
  ShieldCheck, Users, Building2, FileCheck, Scale, Clock,
  FileText, Lock, Heart, AlertTriangle
} from 'lucide-react';

export type DocumentCategoryType = 'sale' | 'lease' | 'business_sale' | 'possession_recovery' | 'umra_revocation' | 'declaration_undertaking' | 'correction_addendum' | 'witness_recantation' | 'property_general' | 'marriage' | 'divorce' | 'inheritance' | 'agent_dismissal' | 'tawkil' | 'promise_to_sell' | 'promise_to_lease' | 'kafala' | 'mental_disability' | 'guardianship_suitability' | 'absence_inquest' | 'gift_revocation' | 'other';

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
  if (dt === 'زواج' || dt === 'زواج_مختلط' || dt === 'رسم_استمرار_زواج' || dt === 'توثيق_حكم_ثبوت_الزوجية' || dt.includes('زواج') || dt.includes('الزوجية')) {
    return 'marriage';
  }

  // 2. Divorce
  if (dt === 'الاشهاد_على_الطلاق_الاتفاقي' || dt === 'طلاق' || dt === 'طلاق_اتفاقي' || dt === 'رجعة' || dt.includes('طلاق')) {
    return 'divorce';
  }

  // 2.5. Dedicated Promise to Sell (رسم وعد بالبيع العقاري - المادة 4 ق.ح.ع)
  if (dt === 'وعد_بالبيع' || dt.includes('وعد_بالبيع') || dt.includes('وعد بالبيع')) {
    return 'promise_to_sell';
  }

  // 2.6. Dedicated Promise to Lease (رسم وعد بالكراء - قانون 67.12 / 49.16 / ف 14 ق.ل.ع)
  if (dt === 'وعد_بالكراء' || dt.includes('وعد_بالكراء') || dt.includes('وعد بالكراء')) {
    return 'promise_to_lease';
  }

  // 2.65. Dedicated Lease / Rental (رسم الكراء - قانون 67.12 / 49.16 / ف 627+ ق.ل.ع)
  if (dt === 'كراء' || dt === 'عقد_كراء' || dt === 'رسم_كراء' || dt === 'عقد كراء' || dt === 'رسم كراء' || (dt.includes('كراء') && !dt.includes('وعد') && !dt.includes('طويل') && !dt.includes('تملك'))) {
    return 'lease';
  }

  // 2.7. Dedicated Kafala & Sponsorship (رسم الكفالة والتكفل العائلي - قانون 15.01 / التكفل العائلي)
  if (dt === 'كفالة' || dt.includes('كفالة') || dt.includes('تكفل')) {
    return 'kafala';
  }

  // 2.8. Dedicated Mental Disability Inquest (موجب خلل عقلي - شهادة اللفيف)
  if (dt === 'موجب_خلل_عقلي' || dt.includes('خلل_عقلي') || dt.includes('خلل عقلي')) {
    return 'mental_disability';
  }

  // 2.9. Dedicated Guardianship & Suitability Inquest (موجب التقديم والصلاحية - شهادة اللفيف)
  if (dt === 'موجب_التقديم_والصلاحية' || dt.includes('تقديم_وصلاحية') || dt.includes('التقديم والصلاحية') || dt.includes('موجب_تقديم')) {
    return 'guardianship_suitability';
  }

  // 2.10. Dedicated Absence Inquest (موجب إثبات غيبة - شهادة اللفيف)
  if (dt === 'موجب_اثبات_غيبة' || dt.includes('اثبات_غيبة') || dt.includes('إثبات غيبة') || dt.includes('موجب_غيبة') || dt.includes('موجب غيبة')) {
    return 'absence_inquest';
  }

  // 2.11. Dedicated Gift Revocation (اعتصار هبة - المواد 283 إلى 289 ق.ح.ع)
  if (dt === 'اعتصار_هبة' || dt.includes('اعتصار_هبة') || dt.includes('اعتصار هبة') || dt.includes('اعتصار')) {
    return 'gift_revocation';
  }

  // 2.12. Dedicated Correction Addendum (الملحق التصحيحي للرسم العدلي / رسم الإسمحة - المادة 33 ق 16.03)
  if (dt === 'ملحق_تصحيحي' || dt === 'رسم_ملحق_تصحيحي' || dt.includes('تصحيحي') || dt.includes('إسمحة') || dt.includes('اسمحة')) {
    return 'correction_addendum';
  }

  // 2.13. Dedicated Witness Recantation (رسم الرجوع عن الشهادة - الفقه المالكي والتوثيق العدلي)
  if (dt === 'رجوع_عن_شهادة' || dt === 'رسم_الرجوع_عن_الشهادة' || dt.includes('رجوع') || dt.includes('الرجوع')) {
    return 'witness_recantation';
  }

  // 2.14. Dedicated Commercial Business Sale (بيع الأصل التجاري - المواد 79 إلى 98 من مدونة التجارة)
  if (dt === 'بيع_اصل_تجاري' || dt === 'بيع_الأصل_التجاري' || dt === 'تفويت_اصل_تجاري' || dt.includes('اصل_تجاري') || dt.includes('الأصل_التجاري') || dt.includes('أصل تجاري') || dt.includes('الأصل التجاري')) {
    return 'business_sale';
  }

  // 2.15. Dedicated Possession Recovery (موجب استرجاع حيازة - المواد 244 إلى 246 ق.م.م وقانون 39.08)
  if (dt === 'موجب_استرجاع_حيازة' || dt === 'استرجاع_حيازة' || dt.includes('استرجاع_حيازة') || dt.includes('استرجاع حيازة')) {
    return 'possession_recovery';
  }

  // 2.16. Dedicated Umra Revocation (اعتصار العمرى - المواد 105 إلى 108 م.ح.ع)
  if (dt === 'اعتصار_عمرى' || dt === 'اعتصار_العمرى' || dt === 'اعتصار عمرى' || dt.includes('اعتصار_عمرى') || dt.includes('اعتصار العمرى') || dt.includes('اعتصار عمرى')) {
    return 'umra_revocation';
  }

  // 2.17. Dedicated Declarations, Undertakings, Acknowledgments & Affidavits (الإشهادات والتصريحات والإقرارات والالتزامات)
  if (
    dt === 'اشهادات_والتزامات' ||
    dt === 'الاشهادات_والالتزامات' ||
    dt === 'اشهاد_والتزام' ||
    dt.includes('اشهادات') ||
    dt.includes('تصريحات') ||
    dt.includes('إقرارات') ||
    dt.includes('التزامات')
  ) {
    return 'declaration_undertaking';
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
    'عقد_ايجار_المفضي_الى_تملك'
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

  // 6. Agent Dismissal (عزل وكيل)
  if (dt === 'عزل_وكيل' || dt.includes('عزل')) {
    return 'agent_dismissal';
  }

  // 7. Tawkil / Agency (رسم وكالة / توكيل رسمي)
  if (dt === 'توكيل_رسمي' || dt === 'رسم_وكالة' || dt.includes('توكيل') || (dt.includes('وكالة') && !dt.includes('عزل'))) {
    return 'tawkil';
  }

  // 8. Other Documents (Paternity, Mortgages, Debts, etc.)
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

      case 'lease':
        return {
          title: 'خريطة المسار الإجرائي لعقد الكراء (منظومة تحرير وتدبير العقد الكرائي وفق القانون 67.12 و 49.16 وق.ل.ع)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-11',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 1;
            if (step === 2) return 2;
            if (step === 3) return 3;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 7;
            if (step >= 7) return 11;
            return 1;
          },
          stages: [
            { index: 1, targetStep: 1, num: '①', title: 'الأطراف', desc: 'المكري والمكتري والصفات', icon: Users },
            { index: 2, targetStep: 1, num: '②', title: 'العين', desc: 'المحل ومشتملاته والتحفيظ', icon: Building2 },
            { index: 3, targetStep: 1, num: '③', title: 'الاستعمال', desc: 'النشاط والأصل التجاري', icon: Scale },
            { index: 4, targetStep: 1, num: '④', title: 'السند', desc: 'الملكية والنظام القانوني', icon: FileCheck },
            { index: 5, targetStep: 1, num: '⑤', title: 'الوجيبة', desc: 'السومة والضمانة والتحملات', icon: FileText },
            { index: 6, targetStep: 1, num: '⑥', title: 'المدة', desc: 'الأجل والتجديد والفسخ', icon: Clock },
            { index: 7, targetStep: 1, num: '⑦', title: 'الشروط', desc: 'الالتزامات وحظر التولية', icon: ShieldCheck },
            { index: 8, targetStep: 1, num: '⑧', title: 'التسليم', desc: 'المعاينة ومحاضر العدادات', icon: FileCheck },
            { index: 9, targetStep: 1, num: '⑨', title: 'الوكالة', desc: 'النيابة وفصل 889-1', icon: Lock },
            { index: 10, targetStep: 1, num: '⑩', title: 'الإنذارات', desc: 'الخط الزمني وموجبات الإفراغ', icon: Clock },
            { index: 11, targetStep: 7, num: '⑪', title: 'التحرير', desc: 'الصياغة والاعتماد القضائي', icon: FileText },
          ]
        };

      case 'correction_addendum':
        return {
          title: 'خريطة المسار الإجرائي للملحق التصحيحي للرسم العدلي (رسم الإسمحة واستدراك الإغفال - المادة 33 قانون 16.03)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 6;
            if (step >= 7) return 7;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'الرسم الأصلي', desc: 'تحديد ومطابقة مراجع الرسم', icon: Building2 },
            { index: 2, targetStep: 1, num: '②', title: 'طالب التصحيح', desc: 'الصفة والصلة ومستند الإنابة', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'طبيعة الخلل', desc: 'تحديد مواضع الأخطاء والإغفال', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'مصدر التحقق', desc: 'الوثائق المؤيدة والمطابقة', icon: FileCheck },
            { index: 5, targetStep: 4, num: '⑤', title: 'شبكة الارتباط', desc: 'فحص الاتساق والأثر القانوني', icon: ShieldCheck },
            { index: 6, targetStep: 5, num: '⑥', title: 'المقارنة والفحص', desc: '15 فحصاً آلياً مانعاً للتناقض', icon: Clock },
            { index: 7, targetStep: 7, num: '⑦', title: 'التحرير والاعتماد', desc: 'الصياغة وتوجيه الرسم للقاضي', icon: FileText },
          ]
        };

      case 'witness_recantation':
        return {
          title: 'خريطة المسار الإجرائي لرسم الرجوع عن الشهادة (توثيق رجوع العدل أو الشاهد عن شهادته السابقة)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 6;
            if (step >= 7) return 7;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'الشهادة الأصلية', desc: 'استرجاع ومطابقة مراجع الشهادة', icon: Building2 },
            { index: 2, targetStep: 1, num: '②', title: 'صاحب الرجوع', desc: 'هوية الراجع وخريطة اللفيف', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'نطاق الرجوع', desc: 'تحديد الواقعة والعبارة محل التراجع', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'سبب وطبيعة الرجوع', desc: 'الوهم أو الخطأ وبيان الحقيقة', icon: AlertTriangle },
            { index: 5, targetStep: 4, num: '⑤', title: 'أثر الاستعمال', desc: 'فحص مآل الشهادة والمستندات', icon: FileCheck },
            { index: 6, targetStep: 5, num: '⑥', title: 'الفحص والتدقيق', desc: 'فحص التناقض ومؤشر الخطر', icon: ShieldCheck },
            { index: 7, targetStep: 7, num: '⑦', title: 'الصياغة والاعتماد', desc: 'تحرير رسم الرجوع والتأشير بالهامش', icon: FileText },
          ]
        };

      case 'business_sale':
        return {
          title: 'خريطة المسار الإجرائي لبيع الأصل التجاري (المواد 79 إلى 98 من مدونة التجارة والقانون 49.16)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 6;
            if (step >= 7) return 7;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'الأصل والسجل', desc: 'بطاقة الأصل والسجل التجاري والمطابقة', icon: Building2 },
            { index: 2, targetStep: 1, num: '②', title: 'الأطراف والتمثيل', desc: 'البائع والمشتري والشخص المعنوي', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'عناصر الأصل ونطاقه', desc: 'الزبناء، السمعة، البضائع والمعدات', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'الكراء والالتزامات', desc: 'حق الكراء وإشعار المكري والأجراء', icon: AlertTriangle },
            { index: 5, targetStep: 4, num: '⑤', title: 'الرهون والدائنون', desc: 'الرهون والامتيازات ومصدر الملكية', icon: ShieldCheck },
            { index: 6, targetStep: 5, num: '⑥', title: 'الثمن والوديعة', desc: 'توزيع الثمن والجهة المؤهلة للإيداع', icon: FileCheck },
            { index: 7, targetStep: 7, num: '⑦', title: 'التحرير والآثار', desc: 'تحرير العقد والنشر وأجل التعرضات', icon: FileText },
          ]
        };

      case 'possession_recovery':
        return {
          title: 'خريطة المسار الإجرائي لموجب استرجاع الحيازة (المواد 244-246 ق.م.م وقانون 39.08)',
          gridClass: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5 || step === 6) return 6;
            if (step >= 7) return 7;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'العملية والصفة', desc: 'طبيعة الاسترجاع وطالب الإشهاد والوكالة', icon: Users },
            { index: 2, targetStep: 1, num: '②', title: 'العقار غير المحفظ', desc: 'الموقع والمساحة والحدود الأربعة', icon: Building2 },
            { index: 3, targetStep: 2, num: '③', title: 'وقائع الحيازة', desc: 'الفقدان والعنف والاسترجاع الفعلي', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'شهود المعاينة', desc: 'معاينة الاسترجاع وبينة اللفيف', icon: Users },
            { index: 5, targetStep: 4, num: '⑤', title: 'الأسانيد والقضاء', desc: 'سند الحيازة والخط الزمني والحكم', icon: ShieldCheck },
            { index: 6, targetStep: 5, num: '⑥', title: 'الفحص والمطابقة', desc: 'التدقيق ومنع الخلط مع الملكية', icon: FileCheck },
            { index: 7, targetStep: 7, num: '⑦', title: 'التحرير والاعتماد', desc: 'صياغة الموجب العدلي وبطاقة الأرشيف', icon: FileText },
          ]
        };

      case 'promise_to_sell':
        return {
          title: 'خريطة المسار الإجرائي لرسم الوعد بالبيع العقاري (المادة 4 من مدونة الحقوق العينية - القانون 41.24)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4 || step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'أطراف الوعد', desc: 'الواعد والموعود له والتكييف', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'العقار وأصل الملك', desc: 'التحفيظ والحدود والمشخصات', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'الثمن والأداء والأجل', desc: 'العربون والباقي وأجل البيع', icon: Scale },
            { index: 5, targetStep: 4, num: '⑤', title: 'الشروط والتدقيق', desc: 'الشروط الواقفة والتحملات', icon: FileCheck },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة والتوثيق النهائي', icon: FileText },
          ]
        };

      case 'promise_to_lease':
        return {
          title: 'خريطة المسار الإجرائي لرسم الوعد بالكراء (قانون 67.12 / قانون 49.16 / الفصل 14 ق.ل.ع)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4 || step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'أطراف الوعد', desc: 'الواعد والموعود له والصفة', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'المحل المكترى', desc: 'البيانات والغرض والتحفيظ', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'الوجيبة والأجل', desc: 'السومة والمدة والتحملات', icon: Scale },
            { index: 5, targetStep: 4, num: '⑤', title: 'الشروط والضمانات', desc: 'العربون والشروط الواقفة', icon: FileCheck },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة والتوثيق النهائي', icon: FileText },
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
            { index: 6, targetStep: 7, num: '⑥', title: 'المراجعة والقاضي', desc: 'التدقيق النهائي والإرسال للقاضي', icon: FileText },
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
            { index: 4, targetStep: 6, num: '④', title: 'مجلس الإشهاد', desc: 'التلقي الثنائي وسجل البيانات', icon: Clock },
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

      case 'agent_dismissal':
        return {
          title: 'خريطة المسار الإجرائي لرسم عزل وكيل (6 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4 || step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'الوكالة الأصلية', desc: 'مراجع الوكالة وسجل الحقوق العينية', icon: FileText },
            { index: 3, targetStep: 2, num: '③', title: 'الأطراف والإنابة', desc: 'الموكل والوكيل والنائب', icon: Users },
            { index: 4, targetStep: 3, num: '④', title: 'نطاق العزل والعقار', desc: 'كلي أو جزئي ومحل الوكالة', icon: Building2 },
            { index: 5, targetStep: 4, num: '⑤', title: 'الفحص والإشعار', desc: 'الاستثناءات وحماية الغير', icon: Scale },
            { index: 6, targetStep: 7, num: '⑥', title: 'الرسم وإلغاء التقييد', desc: 'الصياغة والنموذج 7', icon: FileCheck },
          ]
        };

      case 'tawkil':
        return {
          title: 'خريطة المسار الإجرائي لرسم الوكالة وسجل الحقوق العينية (6 مراحل متسلسلة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step >= 4 && step < 7) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'الموكل والمصدر', desc: 'هوية الموكل ومراجع الإنشاء', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'الوكيل والنيابة', desc: 'الوكلاء وممارسة التوكيل والإنابة', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'الصلاحيات ومحدد السجل', desc: 'التصرفات وفحص الفصل 889-1', icon: Scale },
            { index: 5, targetStep: 4, num: '⑤', title: 'الفحص والتقييد', desc: 'السجل المحلي والسجل الوطني', icon: Clock },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'المراجعة الذكية للرسم وتوثيقه', icon: FileCheck },
          ]
        };

      case 'kafala':
        return {
          title: 'خريطة المسار الإجرائي لرسم الكفالة والتكفل (6 مراحل متسلسلة وفق الضوابط الشرعية والقانونية)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step >= 4 && step < 7) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي ومجلس العقد', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'نوع الكفالة والمسار', desc: 'تحديد المسار والضوابط القانونية', icon: Scale },
            { index: 3, targetStep: 2, num: '③', title: 'الأطراف والمستفيد', desc: 'المتكفل والمستفيد والقرابة', icon: Users },
            { index: 4, targetStep: 3, num: '④', title: 'نطاق التكفل والمصاريف', desc: 'المعيشة والتمدرس والرعاية الصحية', icon: Heart },
            { index: 5, targetStep: 4, num: '⑤', title: 'الشهود والالتزام', desc: 'شهود المعرفة ومدة الالتزام', icon: Clock },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'المراجعة الذكية للرسم وتوثيقه', icon: FileCheck },
          ]
        };

      case 'mental_disability':
        return {
          title: 'خريطة المسار الإجرائي لموجب خلل عقلي (شهادة اللفيف الشرعية - المادتان 217 و222 من مدونة الأسرة)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step >= 4 && step < 7) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والاختصاص', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'المشهود في حقه', desc: 'الهوية والمعرفة المباشرة', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'أساس علم اللفيف', desc: 'المخالطة والاطلاع المستمر', icon: Clock },
            { index: 4, targetStep: 3, num: '④', title: 'وقائع الخلل والأموال', desc: 'المعاينة وتدبير الأموال', icon: Scale },
            { index: 5, targetStep: 5, num: '⑤', title: 'شهود اللفيف', desc: 'نصاب الـ 12 شاهداً والتحري', icon: Users },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة ثلاثية الطبقات والتوثيق', icon: FileCheck },
          ]
        };

      case 'guardianship_suitability':
        return {
          title: 'خريطة المسار الإجرائي لموجب التقديم والصلاحية (شهادة اللفيف الشرعية - قضاء الأسرة وقانون 58.25)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step >= 4 && step < 7) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والاختصاص', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'المعني بالأمر', desc: 'الهوية والوضعية وسبب الحاجة', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'وقائع الحاجة والأموال', desc: 'مستند الحاجة والأموال المرعية', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'المقترح والصلاحية', desc: 'الشخص المقترح وأسس الصلاحية', icon: Heart },
            { index: 5, targetStep: 5, num: '⑤', title: 'شهود اللفيف', desc: 'نصاب 12 شاهداً ونطاق العلم', icon: Users },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة رباعية الطبقات والمراجعة', icon: FileCheck },
          ]
        };

      case 'absence_inquest':
        return {
          title: 'خريطة المسار الإجرائي لموجب إثبات غيبة (شهادة اللفيف الشرعية - مدونة الأسرة وقانون 58.25)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step >= 4 && step < 7) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والاختصاص', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'صفة الغيبة والغائب', desc: 'نوع الغيبة وهوية الغائب والطالب', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'وقائع الغيبة والمكان', desc: 'تاريخ المغادرة والمشاهدة والبحث', icon: Clock },
            { index: 4, targetStep: 3, num: '④', title: 'الأخبار والفقدان', desc: 'حالة الأخبار والضابط القانوني', icon: Scale },
            { index: 5, targetStep: 5, num: '⑤', title: 'شهود اللفيف', desc: 'نصاب 12 شاهداً وفحص التناقض', icon: Users },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة رباعية الطبقات والتوثيق', icon: FileCheck },
          ]
        };

      case 'gift_revocation':
        return {
          title: 'المسار الإجرائي والتوثيقي لرسم اعتصار الهبة (المواد 283 إلى 289 ق.ح.ع)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4 || step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والاختصاص', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'نوع الاعتصار والطرفان', desc: 'اتفاقي أو قضائي والهويات والأهلية', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'أصل الهبة والعقار', desc: 'دفتر الأملاك والوضعية والشروط', icon: Building2 },
            { index: 4, targetStep: 3, num: '④', title: 'فحص الموانع القطعية', desc: 'موانع المادة 285 والمادة 291', icon: Scale },
            { index: 5, targetStep: 4, num: '⑤', title: 'الوكالة والمحافظة', desc: 'السجلات العقارية والجبائية', icon: FileCheck },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والاعتماد', desc: 'الصياغة والتحقق وسلسلة الملك', icon: FileText },
          ]
        };

      case 'umra_revocation':
        return {
          title: 'خريطة المسار الإجرائي لرسم اعتصار العمرى (المواد 105-108 م.ح.ع)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3 || step === 4) return 4;
            if (step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'شروط التلقي', desc: 'التحقق القبلي والأهلية', icon: ShieldCheck },
            { index: 2, targetStep: 1, num: '②', title: 'سند العمرى الأصلي', desc: 'تاريخ الإنشاء وصيغة العقد', icon: FileText },
            { index: 3, targetStep: 2, num: '③', title: 'المعطي والمعمَّر له', desc: 'الصفة والحياة والوكالة', icon: Users },
            { index: 4, targetStep: 3, num: '④', title: 'العقار المعتمر والمالية', desc: 'الأوصاف والحصة والمنفعة', icon: Building2 },
            { index: 5, targetStep: 5, num: '⑤', title: 'شروط وسند الرجوع', desc: 'اختبار الاعتصار وقاعدة الشروط', icon: Scale },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والإحالة للقاضي', desc: 'صياغة الرسم والخطاب القضائي', icon: FileCheck },
          ]
        };

      case 'declaration_undertaking':
        return {
          title: 'خريطة المسار الإجرائي للإشهادات والتصريحات والالتزامات (6 محطات نوعية)',
          gridClass: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
          getStageIndex: (step: number) => {
            if (step <= 0.25) return 1;
            if (step === 1) return 2;
            if (step === 2) return 3;
            if (step === 3 || step === 4) return 4;
            if (step === 5 || step === 6) return 5;
            if (step >= 7) return 6;
            return 2;
          },
          stages: [
            { index: 1, targetStep: 0.25, num: '①', title: 'التوصيف والتكييف', desc: 'تحليل النص وتحديد المسار', icon: FileText },
            { index: 2, targetStep: 1, num: '②', title: 'المصرح والمستفيد', desc: 'الأهلية والصفة والتمثيل', icon: Users },
            { index: 3, targetStep: 2, num: '③', title: 'محل الإشهاد والمالية', desc: 'المبالغ والمواعيد والشروط', icon: Scale },
            { index: 4, targetStep: 3, num: '④', title: 'المقتضيات الخاصة', desc: 'السفر، التمدرس، الكفالة، الإبراء', icon: ShieldCheck },
            { index: 5, targetStep: 5, num: '⑤', title: 'التناقضات والوضوح', desc: 'فحص التنافي والتحقق القانوني', icon: AlertTriangle },
            { index: 6, targetStep: 7, num: '⑥', title: 'التحرير والإحالة للقاضي', desc: 'الصياغة والخطاب والحفظ', icon: FileCheck },
          ]
        };

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
            { index: 6, targetStep: 8, num: '⑥', title: 'التأشير والتضمين', desc: 'سجل البيانات وسجل التضمين', icon: Lock },
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

