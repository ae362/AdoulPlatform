import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReturnToLandingButton } from '../components/common/ReturnToLandingButton';

type PageCard = { title: string; body: string; icon?: string };
type PageFaq = { q: string; a: string };

type PageDef = {
  slug: string;
  parentLabel: string;
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  heroIcon: string;
  quickCards: PageCard[];
  sections: Array<{
    id: string;
    title: string;
    body: string;
    bullets?: string[];
    cards?: PageCard[];
  }>;
  faqs: PageFaq[];
  ctas: Array<{ label: string; to: string; kind?: 'primary' | 'secondary' }>;
};

const PAGES: Record<string, PageDef> = {
  structure: {
    slug: 'structure',
    parentLabel: 'الإدارة و التنظيم',
    title: 'الهيكل الإداري للمهنة',
    subtitle: 'تعرف على الأدوار، اللجان، ومسارات اتخاذ القرار داخل منظومة مهنة العدول.',
    accentFrom: 'from-slate-900',
    accentTo: 'to-amber-700',
    heroIcon: '🏛️',
    quickCards: [
      { title: 'منظومة واضحة', body: 'أدوار محددة ومسؤوليات شفافة بين المستويات.', icon: '🧭' },
      { title: 'حوكمة رشيدة', body: 'مسارات قرار موثقة ومعايير متابعة قابلة للقياس.', icon: '📐' },
      { title: 'تعاون جهوي', body: 'تنسيق مستمر بين الوطني والجهوي لخدمة المهنة.', icon: '🤝' },
    ],
    sections: [
      {
        id: 'overview',
        title: 'نظرة عامة',
        body: 'يهدف الهيكل الإداري إلى ضمان التنظيم، التأطير، وتتبع جودة الخدمات العدلية، مع توزيع واضح للمسؤوليات بين المستويات المختلفة.',
        bullets: ['تحديد الصلاحيات والمسؤوليات', 'مسارات قرار موحدة', 'آليات متابعة وتقييم'],
      },
      {
        id: 'org',
        title: 'المكونات الأساسية',
        body: 'يتكون التنظيم من مستويات تكاملية: الإطار الوطني للتوجيه، والتنسيق الجهوي للتنفيذ والمتابعة، مع لجان تخصصية حسب مجالات العمل.',
        cards: [
          { title: 'مستوى وطني', body: 'توجيه استراتيجي، ضبط السياسات، واعتماد المعايير.', icon: '🗺️' },
          { title: 'مستوى جهوي', body: 'تنسيق محلي، تتبع الممارسة، وتقريب الخدمات.', icon: '📍' },
          { title: 'لجان تخصصية', body: 'ملفات التكوين، الجودة، الرقمنة، والتواصل.', icon: '🧩' },
        ],
      },
      {
        id: 'workflow',
        title: 'مسار اتخاذ القرار',
        body: 'يعتمد المسار على تجميع المعطيات، صياغة المقترحات، مراجعتها، ثم اعتمادها وفق آلية واضحة تضمن الشفافية والفعالية.',
        bullets: ['جمع المعطيات', 'اقتراح الحلول', 'مراجعة قانونية/إجرائية', 'اعتماد ومتابعة'],
      },
    ],
    faqs: [
      { q: 'هل يمكن تتبع القرارات والمراسلات؟', a: 'نعم، يتم اعتماد مسارات موثقة تتيح الرجوع للمرجعيات والقرارات السابقة.' },
      { q: 'كيف يتم التنسيق بين الوطني والجهوي؟', a: 'عبر قنوات تواصل رسمية وتقارير دورية واجتماعات تنسيقية.' },
      { q: 'هل توجد لجان حسب المواضيع؟', a: 'نعم، حسب الحاجة: رقمنة، جودة، تكوين، تواصل، وغيرها.' },
    ],
    ctas: [
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
      { label: 'إنشاء حساب', to: '/register', kind: 'primary' },
    ],
  },

  'contact-national': {
    slug: 'contact-national',
    parentLabel: 'الإدارة و التنظيم',
    title: 'التواصل مع الهيئة الوطنية',
    subtitle: 'قنوات تواصل واضحة، نماذج طلبات، ومسارات تفاعل سريع مع الملفات.',
    accentFrom: 'from-indigo-900',
    accentTo: 'to-emerald-700',
    heroIcon: '📨',
    quickCards: [
      { title: 'تذاكر منظمة', body: 'تحويل الاستفسارات إلى تذاكر قابلة للتتبع.', icon: '🎫' },
      { title: 'زمن استجابة أفضل', body: 'تحديد الأولويات حسب نوع الملف وأهميته.', icon: '⏱️' },
      { title: 'نماذج جاهزة', body: 'قوالب لتسريع تقديم الطلبات والمراسلات.', icon: '🧾' },
    ],
    sections: [
      {
        id: 'channels',
        title: 'قنوات التواصل',
        body: 'نوفر قنوات تواصل متعددة لتسهيل الوصول للمعلومة وتقديم الطلبات.',
        bullets: ['نموذج تواصل إلكتروني', 'مراسلات إدارية منظمة', 'متابعة الحالات والردود'],
      },
      {
        id: 'requests',
        title: 'أنواع الطلبات',
        body: 'من الاستفسارات العامة إلى تتبع ملفات محددة أو طلبات معلومات.',
        cards: [
          { title: 'استفسار', body: 'سؤال عام حول خدمة أو إجراء.', icon: '❓' },
          { title: 'طلب معلومات', body: 'وثائق/مراجع/توضيحات إدارية.', icon: '📚' },
          { title: 'تتبع ملف', body: 'متابعة حالة طلب تم تقديمه.', icon: '🔎' },
        ],
      },
    ],
    faqs: [
      { q: 'هل يمكنني تتبع طلبي؟', a: 'نعم، يتم عرض حالة الطلب وتحديثاته عند توفرها.' },
      { q: 'ما أفضل طريقة لرفع وثائق داعمة؟', a: 'استخدم روابط أو ملفات مرفقة (عند توفر الرفع) مع وصف مختصر للوثيقة.' },
      { q: 'هل توجد أوقات عمل محددة؟', a: 'قد تختلف حسب الخدمة، لكن النظام يتيح تقديم الطلبات على مدار الساعة.' },
    ],
    ctas: [
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
    ],
  },

  'regional-councils': {
    slug: 'regional-councils',
    parentLabel: 'الإدارة و التنظيم',
    title: 'المجالس الجهوية للعدول',
    subtitle: 'شبكة تنسيق جهوي لتقريب الخدمات، رفع التقارير، وتوحيد الممارسة.',
    accentFrom: 'from-rose-900',
    accentTo: 'to-slate-700',
    heroIcon: '📍',
    quickCards: [
      { title: 'قرب ميداني', body: 'تنسيق محلي يراعي خصوصيات الجهات.', icon: '🧭' },
      { title: 'تقارير دورية', body: 'متابعة مؤشرات الأداء والتحديات.', icon: '📈' },
      { title: 'حلول سريعة', body: 'رفع الإشكالات ومعالجتها على مستوى مناسب.', icon: '⚡' },
    ],
    sections: [
      {
        id: 'role',
        title: 'الدور الأساسي',
        body: 'تعمل المجالس الجهوية كحلقة وصل بين الميدان والإطار الوطني، لضمان تنفيذ السياسات وتحسين جودة الخدمة.',
        bullets: ['تنسيق الملفات الجهوية', 'تجميع الملاحظات والإشكالات', 'اقتراح مبادرات محلية'],
      },
      {
        id: 'collab',
        title: 'التنسيق والربط',
        body: 'آليات ربط تساعد على مشاركة المعلومة وتوحيد الممارسة عبر الجهات.',
        cards: [
          { title: 'اجتماعات تنسيقية', body: 'جلسات دورية لتوحيد الرؤية.', icon: '🗓️' },
          { title: 'مكتبة وثائق', body: 'مراجع وإجراءات موحدة.', icon: '📁' },
          { title: 'قنوات تواصل', body: 'تواصل مباشر لتسريع الحلول.', icon: '📞' },
        ],
      },
    ],
    faqs: [
      { q: 'كيف أعرف المجلس الجهوي المختص؟', a: 'يعتمد على جهة الممارسة/الإقامة المهنية ويمكن توفير دليل جهوي لاحقاً.' },
      { q: 'هل توجد مبادرات جهوية؟', a: 'نعم، ويمكن إطلاق مبادرات حسب احتياجات كل جهة.' },
      { q: 'هل التنسيق إلزامي؟', a: 'التنسيق ضروري لتوحيد الممارسة وتحسين الجودة.' },
    ],
    ctas: [
      { label: 'عرض أسماء العدول', to: '/directory', kind: 'primary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
    ],
  },

  certificates: {
    slug: 'certificates',
    parentLabel: 'تلقي الشهادات العدلية و تحريرها',
    title: 'منصة الشهادات العدلية',
    subtitle: 'إنشاء، مراجعة، وإيداع الشهادات ضمن مسار رقمي منظم ودقيق.',
    accentFrom: 'from-amber-900',
    accentTo: 'to-indigo-800',
    heroIcon: '⚖️',
    quickCards: [
      { title: 'مسار موحد', body: 'من الإنشاء إلى المراجعة والإيداع.', icon: '🧵' },
      { title: 'تحقق ذكي', body: 'تقليل الأخطاء عبر ضوابط مبكرة.', icon: '🧠' },
      { title: 'أثر قابل للتتبع', body: 'سجل واضح للتعديلات والحالات.', icon: '🧾' },
    ],
    sections: [
      {
        id: 'flow',
        title: 'كيف تعمل المنصة؟',
        body: 'يوفر النظام مساراً واضحاً لإنتاج شهادة عدلية: إنشاء البيانات، تدقيقها، ثم الإيداع وفق المتطلبات.',
        bullets: ['إنشاء بيانات الشهادة', 'مراجعة الصياغة والملحقات', 'إيداع وتتبع الحالة'],
      },
      {
        id: 'quality',
        title: 'الجودة والامتثال',
        body: 'تصميم المنصة يركز على الاتساق، توحيد النماذج، وإمكانية المراجعة لاحقاً.',
        cards: [
          { title: 'قوالب معتمدة', body: 'نماذج قابلة للتخصيص وفق الحاجة.', icon: '📄' },
          { title: 'تنبيه مبكر', body: 'ملاحظات على الحقول الناقصة أو المتعارضة.', icon: '🚦' },
          { title: 'أرشفة منظمة', body: 'ترتيب الملفات لتسهيل الاسترجاع.', icon: '🗃️' },
        ],
      },
    ],
    faqs: [
      { q: 'هل أحتاج حساباً لاستخدام المنصة؟', a: 'نعم، يلزم تسجيل الدخول حسب الصلاحيات.' },
      { q: 'هل يمكن الرجوع لنسخ سابقة؟', a: 'يمكن دعم ذلك عبر سجل تعديلات/نسخ عند تفعيلها ضمن النظام.' },
      { q: 'هل تتوفر قوالب جاهزة؟', a: 'نعم ويمكن توسيع القوالب حسب نوع الشهادة.' },
    ],
    ctas: [
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
      { label: 'إنشاء حساب', to: '/register', kind: 'secondary' },
    ],
  },

  'e-deposit': {
    slug: 'e-deposit',
    parentLabel: 'تلقي الشهادات العدلية و تحريرها',
    title: 'منصة الإيداع الإلكتروني',
    subtitle: 'إيداع الوثائق رقمياً مع تتبع الحالة، وتقليل التنقل والانتظار.',
    accentFrom: 'from-emerald-900',
    accentTo: 'to-sky-700',
    heroIcon: '📥',
    quickCards: [
      { title: 'رفع منظم', body: 'ترتيب المرفقات حسب نوع الملف.', icon: '📎' },
      { title: 'حالات واضحة', body: 'استلام → معالجة → ملاحظات → إغلاق.', icon: '✅' },
      { title: 'إشعارات', body: 'تنبيهات عند الحاجة لتصحيح أو استكمال.', icon: '🔔' },
    ],
    sections: [
      {
        id: 'deposit',
        title: 'الإيداع خطوة بخطوة',
        body: 'ابدأ بتحديد نوع الإيداع، ثم أرفق الوثائق المطلوبة وتحقق من اكتمال البيانات قبل الإرسال.',
        bullets: ['اختيار نوع الإيداع', 'إرفاق الوثائق', 'التحقق والإرسال', 'تتبع الحالة'],
      },
      {
        id: 'tips',
        title: 'نصائح لتجربة أفضل',
        body: 'الالتزام بتسمية الملفات، واستخدام صيغ واضحة يساعد على تسريع المعالجة.',
        bullets: ['تسمية الملفات بوضوح', 'استخدام PDF عند الإمكان', 'إرفاق صفحة تعريفية عند الحاجة'],
      },
    ],
    faqs: [
      { q: 'ما الصيغ المدعومة؟', a: 'عادةً PDF وصور، ويمكن تحديد ذلك حسب إعدادات النظام.' },
      { q: 'هل يمكن تعديل الإيداع بعد الإرسال؟', a: 'قد يتطلب ذلك فتح ملاحظة/إعادة رفع حسب الحالة.' },
      { q: 'هل يظهر رقم تتبع؟', a: 'يمكن توفير رقم تتبع لكل إيداع لتسهيل المتابعة.' },
    ],
    ctas: [
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
    ],
  },

  activities: {
    slug: 'activities',
    parentLabel: 'المعرفة و التكوين',
    title: 'الأنشطة والبرامج المهنية',
    subtitle: 'ورشات، ندوات، ومحتوى تدريبي لتعزيز الكفاءة وتبادل الخبرات.',
    accentFrom: 'from-slate-900',
    accentTo: 'to-indigo-700',
    heroIcon: '🎓',
    quickCards: [
      { title: 'برامج دورية', body: 'خطة تدريب سنوية وفق الأولويات.', icon: '🗓️' },
      { title: 'تطبيق عملي', body: 'أمثلة ونماذج من الواقع المهني.', icon: '🧪' },
      { title: 'مجتمع مهني', body: 'تبادل خبرات ومناقشة حالات.', icon: '💬' },
    ],
    sections: [
      {
        id: 'tracks',
        title: 'مسارات التكوين',
        body: 'تكوينات حسب الاحتياج: صيغ، إجراءات، رقمنة، وجودة.',
        cards: [
          { title: 'الصياغة', body: 'تحسين صياغة الوثائق ومطابقتها.', icon: '✍️' },
          { title: 'الإجراءات', body: 'فهم المساطر ومراحل التنفيذ.', icon: '🧾' },
          { title: 'الرقمنة', body: 'أفضل الممارسات في الأنظمة الرقمية.', icon: '💻' },
        ],
      },
    ],
    faqs: [
      { q: 'هل يوجد تقويم للورشات؟', a: 'يمكن إضافة تقويم وتحديثه حسب الأنشطة.' },
      { q: 'هل تتوفر مواد للتحميل؟', a: 'يمكن دعم ذلك عبر مكتبة وثائق مرتبطة بكل نشاط.' },
      { q: 'هل توجد شهادات مشاركة؟', a: 'يمكن إصدارها عند تفعيل خيار الشهادات.' },
    ],
    ctas: [
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
      { label: 'إنشاء حساب', to: '/register', kind: 'primary' },
    ],
  },

  'media-library': {
    slug: 'media-library',
    parentLabel: 'المعرفة و التكوين',
    title: 'الخزانة السمعية البصرية',
    subtitle: 'فيديوهات، تسجيلات، وعروض تقديمية منظمة حسب المواضيع.',
    accentFrom: 'from-indigo-900',
    accentTo: 'to-rose-700',
    heroIcon: '🎥',
    quickCards: [
      { title: 'تصنيف ذكي', body: 'حسب الموضوع والمستوى والتاريخ.', icon: '🏷️' },
      { title: 'بحث سريع', body: 'العثور على المحتوى خلال ثوانٍ.', icon: '🔎' },
      { title: 'مشاهدة سلسة', body: 'تجربة عرض مريحة ومتجاوبة.', icon: '📺' },
    ],
    sections: [
      {
        id: 'collections',
        title: 'مجموعات المحتوى',
        body: 'يمكن تنظيم المكتبة إلى سلاسل/مجموعات حسب المحاور.',
        cards: [
          { title: 'ندوات', body: 'جلسات علمية وحوارات مهنية.', icon: '🎙️' },
          { title: 'ورشات', body: 'تطبيق عملي وخطوات عملية.', icon: '🛠️' },
          { title: 'تحديثات', body: 'مستجدات تشريعية وإجرائية.', icon: '📰' },
        ],
      },
    ],
    faqs: [
      { q: 'هل يمكن تحميل المحتوى؟', a: 'يمكن تفعيل التحميل حسب سياسات النشر.' },
      { q: 'هل توجد قوائم تشغيل؟', a: 'نعم، يمكن دعم قوائم تشغيل حسب المسار.' },
      { q: 'هل يدعم الترجمة؟', a: 'يمكن إضافة نصوص/ترجمات عند توفرها.' },
    ],
    ctas: [
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
    ],
  },

  'digital-archive': {
    slug: 'digital-archive',
    parentLabel: 'المعرفة و التكوين',
    title: 'الأرشيف الرقمي',
    subtitle: 'حفظ منظم وآمن للوثائق والمراجع مع استرجاع سريع.',
    accentFrom: 'from-slate-900',
    accentTo: 'to-emerald-700',
    heroIcon: '🗃️',
    quickCards: [
      { title: 'هيكلة واضحة', body: 'تصنيف حسب النوع والتاريخ والجهة.', icon: '🧱' },
      { title: 'صلاحيات', body: 'وصول مضبوط حسب الدور.', icon: '🔐' },
      { title: 'بحث متقدم', body: 'ترشيح حسب المعايير والوسوم.', icon: '🔍' },
    ],
    sections: [
      {
        id: 'security',
        title: 'الأمان وإدارة الوصول',
        body: 'يتم ضبط الوصول وفق الصلاحيات وتسجيل الأحداث لتقوية الأثر الرقمي.',
        bullets: ['صلاحيات حسب الدور', 'سجل أحداث', 'سياسات احتفاظ'],
      },
    ],
    faqs: [
      { q: 'هل يمكن استرجاع وثيقة بسرعة؟', a: 'نعم عبر البحث والوسوم والتصنيف.' },
      { q: 'هل توجد نسخة احتياطية؟', a: 'يمكن اعتماد نسخ احتياطية وفق سياسة المؤسسة.' },
      { q: 'هل يدعم الأرشيف المرفقات الكبيرة؟', a: 'حسب إعدادات التخزين يمكن ضبط الحدود.' },
    ],
    ctas: [
      { label: 'عرض أسماء العدول', to: '/directory', kind: 'secondary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'primary' },
    ],
  },

  meetings: {
    slug: 'meetings',
    parentLabel: 'المعرفة و التكوين',
    title: 'الاجتماعات والحوارات',
    subtitle: 'محاضر، مخرجات، وملخصات منظمة لدعم التنسيق وتبادل الرؤى.',
    accentFrom: 'from-rose-900',
    accentTo: 'to-indigo-700',
    heroIcon: '🗣️',
    quickCards: [
      { title: 'محاضر منظمة', body: 'تلخيص واضح ونقاط قرار.', icon: '📝' },
      { title: 'محاور رئيسية', body: 'تصنيف حسب المواضيع.', icon: '🧠' },
      { title: 'مخرجات قابلة للتنفيذ', body: 'متابعة المهام والالتزامات.', icon: '✅' },
    ],
    sections: [
      {
        id: 'format',
        title: 'نموذج المحضر',
        body: 'اعتماد نموذج موحد يساعد على تتبع النقاط والقرارات بوضوح.',
        bullets: ['الحضور والجدول', 'النقاشات', 'القرارات', 'المهام والتواريخ'],
      },
    ],
    faqs: [
      { q: 'هل يمكن البحث داخل المحاضر؟', a: 'نعم عند توفر فهرسة نصية للوثائق.' },
      { q: 'هل توجد قائمة قرارات؟', a: 'يمكن استخراجها تلقائياً كنقاط قابلة للتتبع.' },
      { q: 'هل يتاح الوصول للجميع؟', a: 'حسب الصلاحيات ونوع الاجتماع.' },
    ],
    ctas: [
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
    ],
  },

  'smart-reminder': {
    slug: 'smart-reminder',
    parentLabel: 'الإعلام و المستجدات',
    title: 'نافذة تذكيرية ذكية',
    subtitle: 'تنبيهات سياقية تساعد على عدم تفويت المواعيد والمهام المهمة.',
    accentFrom: 'from-amber-900',
    accentTo: 'to-rose-700',
    heroIcon: '🔔',
    quickCards: [
      { title: 'تنبيه سياقي', body: 'حسب نوع الملف وخطوته.', icon: '🧠' },
      { title: 'تخصيص', body: 'ضبط الأولويات والتردد.', icon: '⚙️' },
      { title: 'وضوح', body: 'ماذا؟ متى؟ ولماذا؟', icon: '🧾' },
    ],
    sections: [
      {
        id: 'rules',
        title: 'قواعد التذكير',
        body: 'يمكن بناء قواعد بسيطة: تاريخ + شرط + إجراء.',
        bullets: ['موعد نهائي', 'شرط اكتمال', 'تنبيه/إشعار', 'سجل للتذكيرات'],
      },
    ],
    faqs: [
      { q: 'هل يمكن إيقاف تذكير محدد؟', a: 'نعم عبر إعدادات التذكير أو كتم التنبيه.' },
      { q: 'هل توجد تذكيرات افتراضية؟', a: 'يمكن توفير حزمة افتراضية حسب السيناريوهات الشائعة.' },
      { q: 'هل التذكير عبر البريد/الهاتف؟', a: 'حسب قنوات الإشعارات المفعلة.' },
    ],
    ctas: [
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
    ],
  },

  'legal-news': {
    slug: 'legal-news',
    parentLabel: 'الإعلام و المستجدات',
    title: 'أحدث الأخبار القانونية',
    subtitle: 'ملخصات قصيرة، روابط مرجعية، وتصنيف حسب المجالات.',
    accentFrom: 'from-indigo-900',
    accentTo: 'to-slate-700',
    heroIcon: '📰',
    quickCards: [
      { title: 'مختصرات', body: 'أهم النقاط في دقيقة.', icon: '⚡' },
      { title: 'تصنيف', body: 'حسب المجال والتاريخ.', icon: '🏷️' },
      { title: 'روابط مرجعية', body: 'مصادر موثوقة مرتبطة بكل خبر.', icon: '🔗' },
    ],
    sections: [
      {
        id: 'digest',
        title: 'نشرة سريعة',
        body: 'عرض الأخبار بصيغة بطاقات يسهّل الاستيعاب والمقارنة.',
        cards: [
          { title: 'خبر رئيسي', body: 'ملخص + أثر عملي + رابط مرجعي.', icon: '⭐' },
          { title: 'مستجدات', body: 'تحديثات صغيرة لكنها مؤثرة.', icon: '🧷' },
          { title: 'تنبيهات', body: 'ما الذي يجب الانتباه له؟', icon: '🚨' },
        ],
      },
    ],
    faqs: [
      { q: 'هل يتم التحديث يومياً؟', a: 'يمكن ضبط وتيرة التحديث حسب فريق المحتوى.' },
      { q: 'هل توجد مصادر لكل خبر؟', a: 'نعم يُفضّل إرفاق مصدر رسمي/موثوق.' },
      { q: 'هل يمكن تصفية الأخبار حسب المجال؟', a: 'نعم عبر وسوم/تصنيفات.' },
    ],
    ctas: [
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
      { label: 'إنشاء حساب', to: '/register', kind: 'primary' },
    ],
  },

  'legislative-changes': {
    slug: 'legislative-changes',
    parentLabel: 'الإعلام و المستجدات',
    title: 'التعديلات التشريعية',
    subtitle: 'تجميع التعديلات مع شرح الأثر، أمثلة تطبيقية، وخطوات امتثال.',
    accentFrom: 'from-slate-900',
    accentTo: 'to-indigo-700',
    heroIcon: '📜',
    quickCards: [
      { title: 'شرح الأثر', body: 'ما الذي تغير عملياً؟', icon: '🧭' },
      { title: 'أمثلة', body: 'سيناريوهات تطبيقية مختصرة.', icon: '🧪' },
      { title: 'خطوات امتثال', body: 'قائمة تحقق لتفادي الأخطاء.', icon: '✅' },
    ],
    sections: [
      {
        id: 'impact',
        title: 'الأثر العملي',
        body: 'نركز على ما يهم الممارسة: المتطلبات الجديدة، المدد، والإجراءات.',
        bullets: ['متطلبات جديدة', 'تغيير في المدد', 'تحديث إجراءات', 'وثائق داعمة'],
      },
      {
        id: 'checklist',
        title: 'قائمة تحقق',
        body: 'خطوات مبسطة لتطبيق التعديل دون ضياع التفاصيل.',
        bullets: ['اقرأ النص المرجعي', 'حدد المتطلبات', 'حدّث النماذج', 'وثق القرار', 'درّب الفريق'],
      },
    ],
    faqs: [
      { q: 'هل تعرضون النص الكامل؟', a: 'يمكن عرض ملخص مع رابط للنص الرسمي.' },
      { q: 'هل توجد أمثلة جاهزة؟', a: 'نعم يمكن إضافة أمثلة مرتبطة بكل تعديل.' },
      { q: 'هل يمكن الاشتراك للتنبيه؟', a: 'يمكن تفعيل تنبيه عند صدور تحديثات.' },
    ],
    ctas: [
      { label: 'تسجيل الدخول', to: '/login', kind: 'primary' },
      { label: 'العودة للرئيسية', to: '/', kind: 'secondary' },
    ],
  },
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
      {children}
    </span>
  );
}

function Card({ c }: { c: PageCard }) {
  return (
    <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <span className="text-xl">{c.icon ?? '✨'}</span>
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-900">{c.title}</div>
          <div className="mt-1 text-sm text-slate-600 leading-relaxed">{c.body}</div>
        </div>
      </div>
    </div>
  );
}

export function PublicSubCategoryPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    if (!slug) return;

    // Redirect legacy/alternate knowledge slugs to the dedicated routes.
    const redirects: Record<string, string> = {
      activities: '/knowledge/professional-programs',
      'professional-programs': '/knowledge/professional-programs',
      'media-library': '/knowledge/audiovisual-library',
      'audiovisual-library': '/knowledge/audiovisual-library',
      'digital-archive': '/knowledge/digital-archive',
      meetings: '/knowledge/meetings-dialogues',
      'meetings-dialogues': '/knowledge/meetings-dialogues',
      'meetings-and-dialogues': '/knowledge/meetings-dialogues',
      'smart-reminder': '/news/smart-reminder',
      'legal-news': '/news/legal-news',
      'legislative-changes': '/news/legislative-changes',
    };

    const to = redirects[slug];
    if (to) navigate(to, { replace: true });
  }, [navigate, slug]);

  if (
    slug &&
    (slug === 'activities' ||
      slug === 'professional-programs' ||
      slug === 'media-library' ||
      slug === 'audiovisual-library' ||
      slug === 'digital-archive' ||
      slug === 'meetings' ||
      slug === 'meetings-dialogues' ||
      slug === 'meetings-and-dialogues' ||
      slug === 'smart-reminder' ||
      slug === 'legal-news' ||
      slug === 'legislative-changes')
  ) {
    return null;
  }

  const page = useMemo(() => (slug ? PAGES[slug] : undefined), [slug]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  if (!page) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="text-2xl font-extrabold text-slate-900">الصفحة غير موجودة</div>
            <div className="mt-2 text-slate-600">الرابط غير صحيح أو لم يتم إنشاء هذه الصفحة بعد.</div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                العودة للرئيسية
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-200"
              >
                رجوع
              </button>
            </div>

            <div className="mt-8 text-sm font-bold text-slate-700">صفحات متاحة:</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(PAGES).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => navigate(`/pages/${k}`)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className={`bg-gradient-to-l ${page.accentFrom} ${page.accentTo} text-white`}
           style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.10), transparent 35%)' }}>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill>{page.parentLabel}</Pill>
                <Pill>صفحة معلومات</Pill>
              </div>
              <div className="mt-6 text-3xl md:text-4xl font-extrabold leading-tight">{page.title}</div>
              <div className="mt-3 max-w-2xl text-white/85 leading-relaxed">{page.subtitle}</div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ReturnToLandingButton />
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/15"
                >
                  رجوع
                </button>
              </div>
            </div>

            <div className="hidden md:flex h-28 w-28 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <div className="text-5xl">{page.heroIcon}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick cards */}
      <div className="mx-auto max-w-6xl px-6 -mt-8">
        <div className="grid gap-4 md:grid-cols-3">
          {page.quickCards.map((c) => (
            <Card key={c.title} c={c} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {page.sections.map((s) => (
              <section key={s.id} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
                <div className="text-xl font-extrabold text-slate-900">{s.title}</div>
                <div className="mt-2 text-slate-600 leading-relaxed">{s.body}</div>

                {s.bullets?.length ? (
                  <ul className="mt-5 grid gap-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                          ✓
                        </span>
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {s.cards?.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {s.cards.map((c) => (
                      <Card key={c.title} c={c} />
                    ))}
                  </div>
                ) : null}
              </section>
            ))}

            {/* FAQ */}
            <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
              <div className="text-xl font-extrabold text-slate-900">أسئلة شائعة</div>
              <div className="mt-4 space-y-2">
                {page.faqs.map((f) => {
                  const id = `${page.slug}:${f.q}`;
                  const isOpen = openFaq === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : id)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-right hover:bg-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-extrabold text-slate-900">{f.q}</div>
                        <div className="text-slate-500 font-black">{isOpen ? '−' : '+'}</div>
                      </div>
                      {isOpen ? <div className="mt-2 text-sm text-slate-700 leading-relaxed">{f.a}</div> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Side CTA */}
          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-6">
            <div className="text-sm font-extrabold text-slate-900">إجراءات سريعة</div>
            <div className="mt-4 space-y-3">
              {page.ctas.map((cta) => (
                <button
                  key={cta.to}
                  type="button"
                  onClick={() => navigate(cta.to)}
                  className={
                    cta.kind === 'primary'
                      ? 'w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800'
                      : 'w-full rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-200'
                  }
                >
                  {cta.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-l from-slate-50 to-white p-4 ring-1 ring-slate-200">
              <div className="text-xs font-bold text-slate-600">تلميح</div>
              <div className="mt-1 text-sm text-slate-700 leading-relaxed">
                يمكنك لاحقاً ربط هذه الصفحات بمحتوى CMS وإدارتها من منشئ الصفحات.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-bold text-slate-700">© {new Date().getFullYear()} منصة التوثيق العدلي الإلكتروني</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PAGES)
              .slice(0, 6)
              .map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => navigate(`/pages/${k}`)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  {PAGES[k].title}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
