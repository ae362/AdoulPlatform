/**
 * Enterprise Page Title & Favicon Manager
 * Provides dynamic, route-aware, role-aware browser tab titles and notification badges.
 */

interface TitleResolution {
  pageTitle: string;
  portalBrand: string;
}

const NOTARY_MODULE_TITLES: Record<string, string> = {
  notaryPortal: 'لوحة التحكم الرئيسية',
  dashboard: 'الطلبات المهنية الوطنية',
  workCertificatePortal: 'طلبات شهادة العمل',
  searchArchive: 'طلبات البحث في النظائر',
  finalIndexing: 'استخراج نسخ الشهادات والعقود',
  ongoingIndexing: 'تضمين الشهادات والعقود',
  indexing: 'تضمين الشهادات والعقود',
  fees: 'تحرير الرسوم العدلية',
  auditHub: 'منصة التضمين والتدقيق',
  signedRasms: 'الرسوم الموقعة',
  savedDocuments: 'مكتبة الوثائق المحفوظة',
  messages: 'صندوق الرسائل',
  notaryNotifications: 'مركز الإشعارات القضائية',
  scientificPermission: 'طلب إذن بتلقي شهادة علمية',
  marriagePermission: 'طلب الإذن بالزواج',
  judicialFeesPermission: 'طلبات الإذن لاستخراج نظائر الرسوم',
  individualReceptionPermission: 'طلب الإذن بالتلقي الفردي',
  officeMovementPortal: 'إشعار التوجه خارج مكتب التعيين',
  remoteNotarialHearing: 'خدمة التلقي العدلي عن بعد',
  personalAnalytics: 'الإحصائيات التحليلية',
  ledger: 'سجل البيانات الإلكتروني',
  notaries: 'دليل العدول',
  legalProcedures: 'المساطر القانونية',
  subscriptions: 'قسم الاشتراكات',
  statistics: 'الإحصائيات العامة',
  contractTemplates: 'نماذج العقود',
  nationalExecutiveRequests: 'الطلبات التنفيذية الوطنية',
  files: 'المستودع الرقمي للملفات',
  misc: 'خدمات متنوعة',
  registrationStamp: 'رسوم التسجيل والتمبر',
};

const JUDGE_ROUTE_TITLES: Record<string, string> = {
  '/judge': 'لوحة قيادة قاضي التوثيق',
  '/judge/official': 'التضمين الرسمي',
  '/judge/notifications': 'الإشعارات القضائية',
  '/judge/office-movement': 'مراقبة تنقلات العدول',
  '/judge/work-certificates': 'معالجة شهادات العمل',
  '/judge/scientific-permissions': 'أذونات الشهادات العلمية',
  '/judge/marriage-permissions': 'أذونات الزواج',
  '/judge/adl-copy-permissions': 'أذونات استخراج النظائر',
  '/judge/individual-reception': 'أذونات التلقي الفردي',
  '/judge/deeds': 'سجل الرسوم القضائية',
  '/judge/remote-hearings': 'جلسات التلقي القضائي عن بعد',
  '/judge/correspondence': 'المراسلات القضائية',
  '/judge/messages': 'صندوق الرسائل القضائية',
  '/judge/notaries': 'سجل عدول الدائرة',
  '/judge/reports': 'التقارير الرقابية',
  '/judge/oversight': 'المراقبة القضائية',
  '/judge/judicial-speech': 'رواق الخطاب القضائي',
  '/judge/final-archiving': 'الأرشيف القضائي النهائي',
  '/judge/archive': 'الأرشيف الرقمي',
  '/judge/alerts': 'التنبيهات القضائية',
  '/judge/audit': 'سجل العمليات والرقابة',
};

const PUBLIC_ROUTE_TITLES: Record<string, string> = {
  '/login': 'تسجيل الدخول',
  '/register': 'إنشاء حساب مهني جديد',
  '/unauthorized': 'غير مصرح بالدخول',
  '/public-copy': 'بوابة استخراج النسخ العدلية',
  '/public-search': 'البحث في السجلات العدلية',
  '/public/copy-extraction': 'بوابة استخراج النسخ العدلية',
  '/public/search-deeds': 'البحث في السجلات العدلية',
  '/verify': 'التحقق من صحة الوثائق',
};

export function resolvePageTitle(
  pathname: string,
  search: string,
  userRole?: string | null,
  customTitle?: string | null
): TitleResolution {
  if (customTitle && customTitle.trim()) {
    const brand = getBrandByRole(userRole, pathname);
    return { pageTitle: customTitle.trim(), portalBrand: brand };
  }

  if (PUBLIC_ROUTE_TITLES[pathname]) {
    return {
      pageTitle: PUBLIC_ROUTE_TITLES[pathname],
      portalBrand: 'المنظومة الرقمية للتوثيق العدلي',
    };
  }

  if (pathname.startsWith('/judge')) {
    if (pathname.startsWith('/judge/deeds/')) {
      return {
        pageTitle: 'منصة تدقيق الرسم القضائي',
        portalBrand: 'بوابة قاضي التوثيق',
      };
    }

    const matchedJudgeTitle = JUDGE_ROUTE_TITLES[pathname] || 'بوابة قاضي التوثيق';
    return {
      pageTitle: matchedJudgeTitle,
      portalBrand: 'بوابة قاضي التوثيق',
    };
  }

  const searchParams = new URLSearchParams(search);
  const moduleParam = searchParams.get('module');

  if (moduleParam && NOTARY_MODULE_TITLES[moduleParam]) {
    return {
      pageTitle: NOTARY_MODULE_TITLES[moduleParam],
      portalBrand: getBrandByRole(userRole, pathname),
    };
  }

  const cleanPath = pathname.replace(/\/$/, '');
  const pathModuleKey = cleanPath.replace(/^\//, '');

  if (NOTARY_MODULE_TITLES[pathModuleKey]) {
    return {
      pageTitle: NOTARY_MODULE_TITLES[pathModuleKey],
      portalBrand: getBrandByRole(userRole, pathname),
    };
  }

  if (cleanPath === '/messages') {
    return { pageTitle: 'صندوق الرسائل', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath === '/notary-notifications') {
    return { pageTitle: 'مركز الإشعارات القضائية', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath.startsWith('/signed-rasms')) {
    return { pageTitle: 'الرسوم الموقعة', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath.startsWith('/saved-documents')) {
    return { pageTitle: 'مكتبة الوثائق المحفوظة', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath === '/search') {
    return { pageTitle: 'تضمين الشهادات والعقود', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath === '/fees') {
    return { pageTitle: 'تحرير الرسوم العدلية', portalBrand: getBrandByRole(userRole, pathname) };
  }
  if (cleanPath === '/dashboard') {
    return { pageTitle: 'لوحة التحكم', portalBrand: getBrandByRole(userRole, pathname) };
  }

  return {
    pageTitle: 'لوحة التحكم',
    portalBrand: getBrandByRole(userRole, pathname),
  };
}

function getBrandByRole(userRole?: string | null, pathname: string = ''): string {
  if (pathname.startsWith('/judge') || userRole === 'authentication_judge' || userRole === 'regional_judge' || userRole === 'supreme_judge') {
    return 'بوابة قاضي التوثيق';
  }
  if (userRole === 'regional_adoul_council') {
    return 'المجلس الجهوي للعدول';
  }
  if (userRole === 'national_notary_authority') {
    return 'الهيئة الوطنية للعدول';
  }
  return 'بوابة العدل';
}

export function formatDocumentTitle(
  pageTitle: string,
  portalBrand: string,
  unreadCount: number = 0
): string {
  const brandSuffix = portalBrand ? ` | ${portalBrand}` : '';
  const base = `${pageTitle}${brandSuffix}`;
  return unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
}

export function updateFaviconBadge(unreadCount: number = 0): void {
  try {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? `${unreadCount}` : '';
    const badgeSvg = badgeText
      ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
           <circle cx='50' cy='50' r='48' fill='%235a0c0b' stroke='%230891b2' stroke-width='4'/>
           <text x='50' y='60' font-size='42' font-weight='900' text-anchor='middle' fill='%23ffffff' font-family='sans-serif'>⚖️</text>
           <circle cx='80' cy='20' r='18' fill='%23ef4444' stroke='%23ffffff' stroke-width='3'/>
           <text x='80' y='26' font-size='16' font-weight='900' text-anchor='middle' fill='%23ffffff' font-family='sans-serif'>${badgeText}</text>
         </svg>`
      : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
           <circle cx='50' cy='50' r='48' fill='%235a0c0b' stroke='%230891b2' stroke-width='4'/>
           <text x='50' y='65' font-size='52' font-weight='900' text-anchor='middle' fill='%23ffffff' font-family='sans-serif'>⚖️</text>
         </svg>`;

    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${encodeURIComponent(badgeSvg)}`;
  } catch {
    // Non-blocking
  }
}
