/**
 * ثوابت وقواميس الترجمة والبحث لرسوم العدول
 * FeesAgent Locales, Labels Dictionaries & Static Lookup Tables
 * 
 * Target: Moroccan Notarial Platform (المنصة العدلية المغربية)
 * Encoding: UTF-8 strictly preserved
 */

// ============================================================================
// 1. DOCUMENT TYPES
// ============================================================================

export type DocumentType =
  | 'بيع_وشراء'
  | 'بيع_وشراء_معنوي'
  | 'بيع_وشراء_طور_انجاز_ابتدائي'
  | 'بيع_وشراء_طور_انجاز_نهائي'
  | 'بيع_وشراء_ملكية_مشتركة'
  | 'عقد_ايجار_المفضي_الى_تملك'
  | 'كراء_طويل_الامد'
  | 'عقد_تحبيس'
  | 'عقد_بيع_حق_الهواء_والتعلية'
  | 'عقد_تفويت_حق_السطحية'
  | 'ثبوت_زينة_عقار'
  | 'عقد_العمري'
  | 'هبة'
  | 'مقاسمة'
  | 'مناقلة'
  | 'صدقة'
  | 'رهن'
  | 'رهن_حيازي'
  | 'توكيل_رسمي'
  | 'رسم_الاقرار_ببنوة'
  | 'ثبوت_نسب_ببينة_السماع'
  | 'اتفاق_تدبير_اموال_زوجية'
  | 'أخرى'
  | 'اراثة'
  | 'بيان_فريضة'
  | 'احصاء_متروك'
  | 'ثبوت_مخلف'
  | 'وصية'
  | 'وعد_بالبيع'
  | 'زواج'
  | 'زواج_مختلط'
  | 'ملكية'
  | 'حيازة'
  | 'ثبوت_بناء'
  | 'ثبوت_مرفق'
  | 'الاشهاد_على_الطلاق_الاتفاقي'
  | 'رسم_تسليم_بعوض'
  | 'رسم_اقرار_واعتراف'
  | 'رسم_إبراء_من_دين'
  | 'رسم_اقرار_بدين'
  | 'رسم_استمرار_زواج';

// ============================================================================
// 2. DOCUMENT CLASSIFICATION GROUPS
// ============================================================================

export const SALE_DOCUMENT_TYPES = [
  'بيع_وشراء',
  'بيع_وشراء_معنوي',
  'بيع_وشراء_طور_انجاز_ابتدائي',
  'بيع_وشراء_طور_انجاز_نهائي',
  'بيع_وشراء_ملكية_مشتركة',
  'عقد_بيع_حق_الهواء_والتعلية',
  'عقد_تفويت_حق_السطحية',
  'عقد_ايجار_المفضي_الى_تملك',
] as const;

export const FAMILY_DEED_TYPES = [
  'زواج',
  'زواج_مختلط',
  'استمرار_الزوجية',
  'طلاق',
  'الاشهاد_على_الطلاق_الاتفاقي',
  'ثبوت_نسب_ببينة_السماع',
  'رسم_الاقرار_ببنوة',
  'وصية',
  'مخالعة',
] as const;

export const MARRIAGE_DOCUMENT_TYPES = [
  'زواج',
  'زواج_مختلط',
  'استمرار_الزوجية',
  'رسم_استمرار_زواج',
] as const;

export const INHERITANCE_DOCUMENT_TYPES = [
  'ara',
  'fari',
  'ihsa',
  'اراثة',
  'بيان_فريضة',
  'احصاء_متروك',
  'مقاسمة',
  'ملكية',
  'حيازة',
] as const;

// ============================================================================
// 3. PARTY LABELS DICTIONARY
// ============================================================================

export interface PartyLabels {
  sellerGroup: string;
  sellerSingle: string;
  buyerGroup: string;
  buyerSingle: string;
  sellerAdd: string;
  buyerAdd: string;
  sellerShareTitle: string;
  buyerShareTitle: string;
}

export const DEFAULT_PARTY_LABELS: PartyLabels = {
  sellerGroup: 'البائعون',
  sellerSingle: 'البائع',
  buyerGroup: 'المشترون',
  buyerSingle: 'المشتري',
  sellerAdd: 'إضافة بائع',
  buyerAdd: 'إضافة مشتري',
  sellerShareTitle: 'توزيع حصص البائعين',
  buyerShareTitle: 'توزيع حصص المشترين',
};

export const DOCUMENT_PARTY_LABELS: Record<string, PartyLabels> = {
  'رسم_تسليم_بعوض': {
    sellerGroup: 'المسلم (صاحب الأصل)',
    sellerSingle: 'المسلم',
    buyerGroup: 'المسلم له (عوض المشتري)',
    buyerSingle: 'المسلم له',
    sellerAdd: 'إضافة مسلم',
    buyerAdd: 'إضافة مسلم له',
    sellerShareTitle: 'حصص المسلمين',
    buyerShareTitle: 'حصص المسلم لهم',
  },
  'زواج': {
    sellerGroup: 'الزوج',
    sellerSingle: 'الزوج',
    buyerGroup: 'الزوجة',
    buyerSingle: 'الزوجة',
    sellerAdd: '',
    buyerAdd: '',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'زواج_مختلط': {
    sellerGroup: 'الزوج',
    sellerSingle: 'الزوج',
    buyerGroup: 'الزوجة',
    buyerSingle: 'الزوجة',
    sellerAdd: '',
    buyerAdd: '',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'رسم_استمرار_زواج': {
    sellerGroup: 'الزوج',
    sellerSingle: 'الزوج',
    buyerGroup: 'الزوجة',
    buyerSingle: 'الزوجة',
    sellerAdd: '',
    buyerAdd: '',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'عقد_بيع_حق_الهواء_والتعلية': {
    sellerGroup: 'مالك السفل',
    sellerSingle: 'مالك السفل',
    buyerGroup: 'صاحب التعلية (صاحب حق الهواء)',
    buyerSingle: 'صاحب التعلية',
    sellerAdd: 'إضافة مالك سفل',
    buyerAdd: 'إضافة صاحب تعلية',
    sellerShareTitle: 'توزيع حصص مالكي السفل',
    buyerShareTitle: 'توزيع حصص أصحاب التعلية',
  },
  'عقد_تفويت_حق_السطحية': {
    sellerGroup: 'مالك الأرض (مالك الرقبة)',
    sellerSingle: 'مالك الأرض',
    buyerGroup: 'صاحب حق السطحية',
    buyerSingle: 'صاحب حق السطحية',
    sellerAdd: 'إضافة مالك أرض',
    buyerAdd: 'إضافة صاحب حق سطحية',
    sellerShareTitle: 'توزيع حصص مالكي الأرض',
    buyerShareTitle: 'توزيع حصص أصحاب السطحية',
  },
  'ثبوت_زينة_عقار': {
    sellerGroup: 'مالك الأرض (مالك الرقبة)',
    sellerSingle: 'مالك الأرض',
    buyerGroup: 'صاحب حق الزينة',
    buyerSingle: 'صاحب حق الزينة',
    sellerAdd: 'إضافة مالك أرض',
    buyerAdd: 'إضافة صاحب حق زينة',
    sellerShareTitle: 'توزيع حصص مالكي الأرض',
    buyerShareTitle: 'توزيع حصص أصحاب الزينة',
  },
  'ثبوت_بناء': {
    sellerGroup: 'طالب الشهادة (الباني)',
    sellerSingle: 'الباني',
    buyerGroup: 'المجاورون / الحائزون',
    buyerSingle: 'مجاور/حائز',
    sellerAdd: 'إضافة باني',
    buyerAdd: 'إضافة مجاور/حائز',
    sellerShareTitle: 'بيانات الباني',
    buyerShareTitle: 'مراجع مسانِدة',
  },
  'عقد_العمري': {
    sellerGroup: 'المعطي (مالك العقار)',
    sellerSingle: 'المعطي',
    buyerGroup: 'المعطى له (صاحب المنفعة)',
    buyerSingle: 'المعطى له',
    sellerAdd: 'إضافة معطي',
    buyerAdd: 'إضافة معطى له',
    sellerShareTitle: 'توزيع حصص المعطين',
    buyerShareTitle: 'توزيع حصص المعطى لهم',
  },
  'رسم_الاقرار_ببنوة': {
    sellerGroup: 'المقر (الأب)',
    sellerSingle: 'المقر (الأب)',
    buyerGroup: 'المقر له (الابن/الابنة)',
    buyerSingle: 'المقر له',
    sellerAdd: 'إضافة مقر',
    buyerAdd: 'إضافة مقر له',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'ثبوت_نسب_ببينة_السماع': {
    sellerGroup: 'طالب الشهادة',
    sellerSingle: 'طالب الشهادة',
    buyerGroup: 'الشهود',
    buyerSingle: 'الشاهد',
    sellerAdd: '',
    buyerAdd: 'إضافة شاهد',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'اتفاق_تدبير_اموال_زوجية': {
    sellerGroup: 'الطرف الأول (الزوج)',
    sellerSingle: 'الزوج',
    buyerGroup: 'الطرف الثاني (الزوجة)',
    buyerSingle: 'الزوجة',
    sellerAdd: '',
    buyerAdd: '',
    sellerShareTitle: '',
    buyerShareTitle: '',
  },
  'رهن': {
    sellerGroup: 'الراهنون (المدينون أو الكفلاء العينيون)',
    sellerSingle: 'الراهن',
    buyerGroup: 'الدائنون المرتهنون',
    buyerSingle: 'الدائن المرتهن',
    sellerAdd: 'إضافة راهن',
    buyerAdd: 'إضافة دائن مرتهن',
    sellerShareTitle: 'توزيع حصص الراهنين',
    buyerShareTitle: 'توزيع حصص الدائنين',
  },
  'رهن_حيازي': {
    sellerGroup: 'الراهنون (المدينون أو الكفلاء)',
    sellerSingle: 'الراهن',
    buyerGroup: 'الدائنون المرتهنون',
    buyerSingle: 'الدائن المرتهن',
    sellerAdd: 'إضافة راهن',
    buyerAdd: 'إضافة دائن مرتهن',
    sellerShareTitle: 'توزيع حصص الراهنين',
    buyerShareTitle: 'توزيع حصص الدائنين',
  },
  'كراء_طويل_الامد': {
    sellerGroup: 'المكرون (المالكون)',
    sellerSingle: 'المكري',
    buyerGroup: 'المكترون (المستأجرون طويلي الأمد)',
    buyerSingle: 'المكتري',
    sellerAdd: 'إضافة مكري',
    buyerAdd: 'إضافة مكتري',
    sellerShareTitle: 'توزيع حصص المكرين',
    buyerShareTitle: 'توزيع حصص المكترين',
  },
  'عقد_تحبيس': {
    sellerGroup: 'الواقفون (أصحاب المال الموقوف)',
    sellerSingle: 'الواقف',
    buyerGroup: 'الموقوف عليهم (المستفيدون من الوقف)',
    buyerSingle: 'الموقوف عليه',
    sellerAdd: 'إضافة واقف',
    buyerAdd: 'إضافة موقوف عليه',
    sellerShareTitle: 'توزيع حصص الواقفين',
    buyerShareTitle: 'توزيع حصص الموقوف عليهم',
  },
  'اراثة': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'بيان_فريضة': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'احصاء_متروك': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'مقاسمة': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'ملكية': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'حيازة': {
    sellerGroup: 'الهالك / المورث',
    sellerSingle: 'الهالك',
    buyerGroup: 'الورثة / المستفيدون',
    buyerSingle: 'الوارث',
    sellerAdd: 'إضافة هالك',
    buyerAdd: 'إضافة وارث',
    sellerShareTitle: 'توزيع التركة',
    buyerShareTitle: 'توزيع الأنصبة',
  },
  'هبة': {
    sellerGroup: 'الواهبون',
    sellerSingle: 'الواهب',
    buyerGroup: 'الموهوب لهم',
    buyerSingle: 'الموهوب له',
    sellerAdd: 'إضافة واهب',
    buyerAdd: 'إضافة موهوب له',
    sellerShareTitle: 'توزيع حصص الواهبين',
    buyerShareTitle: 'توزيع حصص الموهوب لهم',
  },
  'عقد_ايجار_المفضي_الى_تملك': {
    sellerGroup: 'المؤجِّرون (المُلتزِمون بنقل الملكية عند حلول حق الخيار)',
    sellerSingle: 'المؤجِّر (المُلتزِم بنقل الملكية عند حلول حق الخيار)',
    buyerGroup: 'المؤجر له / المكتري المتملك',
    buyerSingle: 'المؤجر له / المكتري المتملك',
    sellerAdd: 'إضافة مؤجِّر',
    buyerAdd: 'إضافة مكتري متملك',
    sellerShareTitle: 'توزيع حصص المؤجِّرين',
    buyerShareTitle: 'توزيع حصص المكاتري المتملكين',
  },
};

export const getPartyLabels = (type: DocumentType | string): PartyLabels => {
  return DOCUMENT_PARTY_LABELS[type] || DEFAULT_PARTY_LABELS;
};

// ============================================================================
// 4. DOCUMENT SELECTION CATEGORIES
// ============================================================================

export interface DocumentCategoryItem {
  label: string;
  value: DocumentType;
}

export interface DocumentCategory {
  id: string;
  title: string;
  icon: string;
  desc: string;
  items: DocumentCategoryItem[];
  alert: string;
  ref: string;
  link: string;
  color: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'marriage',
    title: 'رسوم الزواج',
    icon: '💍',
    desc: 'تشمل الرسوم المرتبطة بعقد الزواج وآثاره واستمراره، وفق مدونة الأسرة.',
    items: [
      { label: 'رسم زواج', value: 'زواج' },
      { label: 'رسم زواج مختلط', value: 'زواج_مختلط' },
      { label: 'رسم استمرار زواج', value: 'رسم_استمرار_زواج' },
    ],
    alert: 'قد تستوجب بعض الرسوم إذنًا قضائيًا أو وثائق إدارية بحسب الحالة.',
    ref: 'مدونة الأسرة، المواد 10، 14، 16، 21، 124',
    link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
    color: 'pink',
  },
  {
    id: 'divorce',
    title: 'رسوم الطلاق',
    icon: '💔',
    desc: 'تشمل الرسوم المثبتة لانحلال العلاقة الزوجية أو توثيق آثاره، بناءً على اتفاق أو حكم قضائي.',
    items: [
      { label: 'رسم طلاق اتفاقي', value: 'الاشهاد_على_الطلاق_الاتفاقي' },
    ],
    alert: 'التلقي في بعض هذه الرسوم يكون بناءً على حكم قضائي نهائي.',
    ref: 'مدونة الأسرة، المواد 78 إلى 93',
    link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
    color: 'red',
  },
  {
    id: 'property',
    title: 'رسوم الأملاك',
    icon: '🏠',
    desc: 'تشمل الرسوم المثبتة للملكية، أو الحيازة، أو التصرفات الواردة على العقار.',
    items: [
      { label: 'رسم شراء (شخص ذاتي)', value: 'بيع_وشراء' },
      { label: 'رسم شراء (شخص معنوي)', value: 'بيع_وشراء_معنوي' },
      { label: 'رسم شراء في الملكية المشتركة', value: 'بيع_وشراء_ملكية_مشتركة' },
      { label: 'عقد إيجار المفضي إلى تملك عقار', value: 'عقد_ايجار_المفضي_الى_تملك' },
      { label: 'كراء طويل الأمد', value: 'كراء_طويل_الامد' },
      { label: 'عقد تحبيس', value: 'عقد_تحبيس' },
      { label: 'عقد بيع حق الهواء و التعلية', value: 'عقد_بيع_حق_الهواء_والتعلية' },
      { label: 'عقد تفويت حق السطحية', value: 'عقد_تفويت_حق_السطحية' },
      { label: 'ثبوت زينة عقار', value: 'ثبوت_زينة_عقار' },
      { label: 'رسم ثبوت بناء', value: 'ثبوت_بناء' },
      { label: 'عقد العمری', value: 'عقد_العمري' },
      { label: 'بيع عقار في طور الانجاز- عقد البيع الابتدائي', value: 'بيع_وشراء_طور_انجاز_ابتدائي' },
      { label: 'بيع عقار في طور الانجاز- عقد البيع النهائي', value: 'بيع_وشراء_طور_انجاز_نهائي' },
      { label: 'رسم ملك', value: 'ملكية' },
      { label: 'رسم حيازة', value: 'حيازة' },
      { label: 'رسم مقاسمة', value: 'مقاسمة' },
      { label: 'رسم مناقلة', value: 'مناقلة' },
      { label: 'رسم هبة', value: 'هبة' },
      { label: 'رسم صدقة', value: 'صدقة' },
      { label: 'رسم رهن', value: 'رهن' },
      { label: 'وعد بالبيع', value: 'وعد_بالبيع' },
      { label: 'رسم تسليم بعوض', value: 'رسم_تسليم_بعوض' },
      { label: 'رسم اقرار واعتراف', value: 'رسم_اقرار_واعتراف' },
    ],
    alert: 'تختلف المتطلبات بحسب ما إذا كان العقار محفظًا أو غير محفظ.',
    ref: 'مدونة الحقوق العينية / ظهير التحفيظ العقاري',
    link: 'https://www.sgg.gov.ma/Portals/0/lois/droits_ainiya_AR.pdf',
    color: 'blue',
  },
  {
    id: 'inheritance',
    title: 'رسوم التركات',
    icon: '⚰️',
    desc: 'تشمل الرسوم المثبتة للوفاة، والورثة، والمخلف، وتنزيل الحقوق.',
    items: [
      { label: 'رسم إراثة', value: 'اراثة' },
      { label: 'رسم إحصاء متروك', value: 'احصاء_متروك' },
      { label: 'ثبوت مخلف', value: 'ثبوت_مخلف' },
      { label: 'بيان فريضة', value: 'بيان_فريضة' },
      { label: 'رسم وصية', value: 'وصية' },
    ],
    alert: 'يُستحسن التحقق من الصفة وعدد الورثة دون البحث في صحة الأنصبة.',
    ref: 'مدونة الأسرة (الكتاب السادس) / قانون الالتزامات والعقود',
    link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
    color: 'purple',
  },
  {
    id: 'other',
    title: 'رسوم باقي الوثائق',
    icon: '📄',
    desc: 'تشمل الرسوم ذات الطابع التمثيلي أو الإجرائي.',
    items: [
      { label: 'رسم وكالة', value: 'توكيل_رسمي' },
      { label: 'رسم الاقرار ببنوة/عقد الاستلحاق', value: 'رسم_الاقرار_ببنوة' },
      { label: 'ثبوت نسب ببينة السماع', value: 'ثبوت_نسب_ببينة_السماع' },
      { label: 'اتفاق على تدبير اموال الزوجية/نظام المشاركة', value: 'اتفاق_تدبير_اموال_زوجية' },
      { label: 'ثبوت مرفق (حق ارتفاق)', value: 'ثبوت_مرفق' },
      { label: 'رهن رسمي على عقار', value: 'رهن' },
      { label: 'رهن حيازي', value: 'رهن_حيازي' },
      { label: 'رسم إبراء من دين', value: 'رسم_إبراء_من_دين' },
      { label: 'رسم اقرار بدين (الاعتراف)', value: 'رسم_اقرار_بدين' },
      { label: 'رسم آخر', value: 'أخرى' },
    ],
    alert: 'يُراعى التحقق من الأهلية وحدود الوكالة دون التوسع في التأويل.',
    ref: 'قانون الالتزامات والعقود، الفصول 879 وما يليها',
    link: 'https://www.sgg.gov.ma/Portals/0/lois/dahir_obligations_contrats_AR.pdf',
    color: 'gray',
  },
];

// ============================================================================
// 5. LEGAL ENTITY & REPRESENTATION OPTIONS
// ============================================================================

export const LEGAL_ENTITY_TYPE_OPTIONS = [
  { value: 'company', label: 'شركة' },
  { value: 'association', label: 'جمعية' },
  { value: 'cooperative', label: 'تعاونية' },
  { value: 'public_institution', label: 'مؤسسة / هيئة عمومية' },
] as const;

export const REPRESENTATION_DOC_TYPE_OPTIONS = [
  { value: 'articles', label: 'منصوص عليه في النظام الأساسي' },
  { value: 'minutes', label: 'محضر تعيين' },
  { value: 'power_of_attorney', label: 'وكالة' },
] as const;

// ============================================================================
// 6. PROFESSIONAL CONVICTION QUESTIONS & TRANSIT MESSAGES
// ============================================================================

export const PROFESSIONAL_CONVICTION_QUESTIONS = [
  'هل العقار محل نزاع معروف؟',
  'هل الحيازة مستمرة دون انقطاع ظاهر؟',
  'هل سبق الإدلاء بشهادة بشأن نفس العقار؟',
] as const;

export const JUDGE_SEND_TRANSIT_MESSAGES = [
  'جاري إرسال الرسم...',
  'يتم نقل الرسم إلى المراجعة القضائية...',
  'المرجو الانتظار...',
] as const;

// ============================================================================
// 7. ARABIC NUMBER & DATE VOCABULARY
// ============================================================================

export const ARABIC_ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
] as const;

export const ARABIC_TENS = [
  '',
  'عشرة',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
] as const;

export const ARABIC_TEENS = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
] as const;

export const ARABIC_HUNDREDS = [
  '',
  'مائة',
  'مائتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
] as const;

export const GREGORIAN_MONTHS_ARABIC = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

