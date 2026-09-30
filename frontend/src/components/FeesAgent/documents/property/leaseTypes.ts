// ============================================================================
// Types for «رسم الكراء» (منظومة تحرير وتدبير العقد الكرائي)
// In accordance with Moroccan Law 67.12 (Residential & Professional Leases),
// Law 49.16 (Commercial, Industrial & Artisanal Leases),
// DOC Articles 627+ (General Rental Obligations), and Law 07.03 (Rent Review).
// Zero Mock Data — 100% Deterministic & Strongly Typed.
// ============================================================================

export type LeaseOperationType =
  | 'إنشاء'
  | 'تجديد'
  | 'تعديل'
  | 'إنهاء'
  | 'إثبات_علاقة'
  | 'إنشاء_عقد_كراء_جديد'
  | 'تجديد_عقد_كراء_سابق'
  | 'تعديل_شروط_أو_سومة_كرائية'
  | 'إنهاء_أو_فسخ_علاقة_كرائية'
  | 'إثبات_علاقة_كرائية_قائمة';

export type LeaseUsageNature =
  | 'سكنى'
  | 'سكن_شخصي'
  | 'سكن_عائلي'
  | 'استعمال_مهني'
  | 'تجاري'
  | 'كراء_تجاري'
  | 'صناعي'
  | 'كراء_صناعي'
  | 'حرفي'
  | 'كراء_حرفي'
  | 'أرض_فلاحية'
  | 'إداري_أو_مهني_خاص'
  | 'مؤسسة_تعليم_خصوصي'
  | 'مصحة_أو_مؤسسة_مماثلة'
  | 'مصحة_مؤسسة_مماثلة'
  | 'صيدلية_أو_مختبر_أو_عيادة'
  | 'صيدلية_مختبر_عيادة'
  | 'ملك_خاص_للدولة_أو_جماعة_ترابية'
  | 'ملك_دولة_أو_جماعة'
  | 'مستودع_أو_تخزين'
  | 'استعمال_مختلط'
  | 'حالة_أخرى';

export type ApplicableLegalRegime =
  | 'قانون_49_16'
  | 'قانون_67_12'
  | 'قانون_كراء_الأراضي_الفلاحية'
  | 'نظام_أملاك_الدولة_والجماعات'
  | 'قانون_الالتزامات_والعقود'
  | 'قانون_67.12_سكنى_ومهني'
  | 'قانون_49.16_تجاري_وصناعي_وحرفي'
  | 'قانون_الالتزامات_والعقود_ف_627'
  | 'ظهير_التحفيظ_العقاري_والحقوق_العينية'
  | 'نظام_خاص_أملاك_الدولة_والجماعات';

export type LessorPropertyRole =
  | 'مالك_كامل'
  | 'مالك_على_الشياع'
  | 'مالك_تام'
  | 'شريك_على_الشياع'
  | 'صاحب_حق_انتفاع'
  | 'وكيل'
  | 'وكيل_اتفاقي'
  | 'نائب_قانوني'
  | 'نائب_شرعي_أو_قانوني'
  | 'وارث'
  | 'صاحب_حق_آخر'
  | 'ممثل_قانوني_لشركة';

export type PropertyStatusType = 'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ';

export type RentPaymentFrequency = 'شهري' | 'دوري_3_أشهر' | 'دوري_6_أشهر' | 'سنوي';

export type RentPaymentMethod =
  | 'تحويل_بنكي'
  | 'شيك_بنكي'
  | 'وفاء_نقدي_مع_توصيل'
  | 'اقتطاع_آلي'
  | 'نقداً'
  | 'شيك';

export type RenewalOptionType =
  | 'تجديد_ضمني_تلقائي'
  | 'تجديد_تلقائي_ضمني'
  | 'تجديد_صريح_باتفاق_مسبق'
  | 'تجديد_باتفاق_مكتوب_جديد'
  | 'محدد_المدة_غير_قابل_للتجديد_التلقائي';

export type GuaranteeType = 'شهر_واحد' | 'شهران_سقف_القانون_67.12' | 'كفالة_بنكية' | 'بدون_ضمانة';

export interface CoLessorItem {
  id: string;
  fullName: string;
  cin: string;
  shareRatio?: string;
  shareFraction?: string;
  participationType?: string;
  isActingForOthers?: boolean;
}

export interface CoLesseeItem {
  id: string;
  fullName: string;
  cin: string;
  phone: string;
  address?: string;
  roleType?: string;
  isJointlyAndSeverallyLiable?: boolean;
}

export interface MeterReading {
  meterType: 'كهرباء' | 'ماء' | 'غاز';
  meterNumber: string;
  currentReading: string;
}

export interface LeaseEventItem {
  id: string;
  date?: string;
  eventDate?: string;
  eventType: 'أداء_الوجيبة' | 'توجيه_إنذار' | 'مراجعة_السومة' | 'تجديد' | 'إشعار_بالإفراغ';
  description: string;
  amount?: number;
  receiptNumber?: string;
}

export interface LeaseNoticeItem {
  id: string;
  noticeType: 'إنذار_بالأداء' | 'إنذار_بالإفراغ_للهدم' | 'إنذار_بالإفراغ_للاستعمال_الشخصي' | 'إشعار_بمراجعة_السومة';
  legalBasis: string;
  gracePeriodDays: number;
  deliveryDate: string;
  expiryDate: string;
  isSatisfied: boolean;
}

export interface LeaseCaseLawItem {
  decisionNumber: string;
  court: string;
  year: string;
  principle: string;
}

export interface LeaseDeedState {
  operationType: LeaseOperationType;
  usageNature: LeaseUsageNature;
  actualActivityDescription: string;
  contractDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  isIndefiniteDuration?: boolean;
  calculatedDurationText?: string;
  isNewContract: boolean;
  previousContractDate?: string;
  applicableLaw: ApplicableLegalRegime;
  applicableLawJustification?: string;
  lessor: any;
  coLessors: CoLessorItem[];
  lessee: any;
  coLessees: CoLesseeItem[];
  isJointLiability?: boolean;
  property: any;
  purpose: any;
  finance: any;
  handover: any;
  poa: any;
  covenants?: any;
  eventsLedger: LeaseEventItem[];
  notices: LeaseNoticeItem[];
  registration: any;
  [key: string]: any;
}
