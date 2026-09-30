// ============================================================================
// Types for «رسم ملحق تصحيحي» (الملحق التصحيحي للرسم العدلي / رسم الإسمحة)
// In accordance with Moroccan Notarial Law (Law 16.03, Art 33), Law of Obligations and Contracts (DOC),
// Land Registry & Property Law (Law 39.08), and Supreme Court Jurisprudence.
// Zero Mock Data — 100% Deterministic & Strongly Typed.
// ============================================================================

export type OriginalDeedStatus = 'مضمن' | 'مخاطب_عليه' | 'نسخة_مسلمة' | 'في_طور_التضمين' | 'مسودة_أرشيف';

export interface OriginalDeedReference {
  deedNumber: string;
  year: string;
  recordLetter: string;
  pageNumber: string;
  countNumber: string;
  deedType: string;
  receiptDate: string;
  endorsementDate?: string;
  courtName: string;
  judicialDistrict: string;
  notaries: string;
  partiesSummary: string;
  propertySummary: string;
  financialSummary: string;
  status: OriginalDeedStatus;
  isRegisteredInTax: boolean;
  taxRegistrationNumber?: string;
  conservationNumber?: string;
}

export type ApplicantCategory =
  | 'أحد_أطراف_الرسم'
  | 'جميع_الأطراف'
  | 'صاحب_الحق_المتأثر_بالخطأ'
  | 'وارث_خلف'
  | 'وكيل'
  | 'ممثل_قانوني'
  | 'شخص_آخر_له_صفة';

export interface CorrectionApplicant {
  applicantCategory: ApplicantCategory;
  fullName: string;
  firstName: string;
  familyName: string;
  fatherName: string;
  motherName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  profession: string;
  address: string;
  cin: string;
  cinExpiryDate?: string;
  phone: string;
  roleInOriginalDeed: string; // صفته في الرسم الأصلي (بائع، مشتري، موهوب له، طالب إشهاد...)
  isActingInPerson: boolean; // أصالة عن نفسه
  representation?: {
    representativeCapacity: string; // وكيل اتفاقي، ولي شرعي، وصي، مقدم، ممثل قانوني للشركة
    poaType: 'عدلية_مضمنة' | 'رسمية_توثيقية' | 'عرفية_مصادق_عليها' | 'حكم_قضائي';
    poaNumber: string;
    poaDate: string;
    poaIssuer: string;
    poaReference: string;
    authorityScope: string;
    documentUrl?: string;
  };
}

export type CorrectionFieldCategory =
  | 'بيانات_شخص'
  | 'مرجع_الرسم_والسجل'
  | 'تاريخ_أو_مدة'
  | 'السكنى_والعنوان'
  | 'وثيقة_الهوية'
  | 'الأب_أو_الأم_أو_الحالة_العائلية'
  | 'العقار_ومشتملاته'
  | 'الموقع_والإحداثيات'
  | 'المساحة'
  | 'الحدود'
  | 'الثمن_أو_المقابل'
  | 'الحصة_أو_النسبة'
  | 'الشهود_واللفيف'
  | 'مرجع_سابق_أو_لاحق'
  | 'مرجع_المحكمة_والتضمين'
  | 'المراجع_المالية_أو_التسجيلية'
  | 'العدلان_المتلقيان'
  | 'عبارة_أو_فقرة_أغفلت'
  | 'إضافة_بيان_أغفل'
  | 'تصحيح_مركب';

export type VerificationSourceType =
  | 'البطاقة_الوطنية'
  | 'الحالة_المدنية'
  | 'عقد_الازدياد'
  | 'وثيقة_رسمية'
  | 'رسم_عدلي_سابق'
  | 'حكم_قضائي'
  | 'شهادة_إدارية'
  | 'وثيقة_عقارية'
  | 'وثيقة_جبائية'
  | 'وثيقة_صادرة_عن_المحافظة_العقارية'
  | 'تصريح_المعني'
  | 'مصدر_آخر';

export type MatchingDegree = 'مطابقة_تامة' | 'تحتاج_مراجعة' | 'لا_توجد_وثيقة_مؤيدة';

export interface CorrectionItem {
  id: string;
  category: CorrectionFieldCategory;
  targetRole: string; // لمن يعود البيان (المشتري، البائع، العقار، الثمن...)
  fieldLabel: string; // البيان محل التصحيح
  originalValue: string; // الوارد في الرسم الأصلي (غير قابل للتعديل عند الاسترجاع)
  correctedValue: string; // الصحيح المتفق عليه
  verificationSource: VerificationSourceType;
  matchingDegree: MatchingDegree;
  sourceDocNumber?: string;
  sourceDocDate?: string;
  sourceDocIssuer?: string;
  isOmission: boolean; // هل هو استكمال لبيان أغفل
  omissionReason?: string;
  assumedPosition?: string; // موضعه المفترض في الرسم
  affectedRelatedFields: string[]; // المواضع الأخرى المتأثرة داخل الرسم
  auditInfo: {
    verifiedBy: string;
    verificationDate: string;
    notes?: string;
  };
}

export type PropertyCorrectionType =
  | 'محفظ'
  | 'في_طور_التحفيظ'
  | 'غير_محفظ'
  | 'ملكية_مشتركة'
  | 'حق_مشاع'
  | 'عقار_مبني'
  | 'أرض_فلاحية'
  | 'أرض_عارية'
  | 'عقار_آخر';

export interface PropertyCorrectionState {
  propertyType: PropertyCorrectionType;
  propertyName: { original: string; corrected: string };
  titleNumber: { original: string; corrected: string }; // الرسم العقاري أو المطلب
  location: { original: string; corrected: string };
  boundaries: {
    north: { original: string; corrected: string };
    east: { original: string; corrected: string };
    south: { original: string; corrected: string };
    west: { original: string; corrected: string };
    additionalBoundaries: Array<{ id: string; name: string; original: string; corrected: string }>;
  };
  area: {
    originalM2: number;
    correctedM2: number;
    hectares: number;
    ares: number;
    centiares: number;
    correctionReason: 'خطأ_في_النقل' | 'خطأ_حسابي' | 'إغفال_وحدة_القياس' | 'خطأ_في_الوثيقة_المرجعية' | 'سبب_آخر';
    reasonDetails?: string;
  };
  coordinates: {
    xOriginal: string;
    xCorrected: string;
    yOriginal: string;
    yCorrected: string;
    spatialSystem: string; // مثلاً: Lambert Merchich Nord Maroc
    source: string;
  };
  shareRatio: { original: string; corrected: string }; // الحصة المشاعة
}

export interface FinancialCorrectionState {
  priceOriginal: number;
  priceCorrected: number;
  priceWordsOriginal: string;
  priceWordsCorrected: string;
  flawType:
    | 'رقم_خاطئ'
    | 'كتابة_بالحروف_خاطئة'
    | 'عدم_تطابق_الرقم_والحروف'
    | 'إغفال_الثمن'
    | 'خطأ_في_الحصة'
    | 'خطأ_في_المقابل'
    | 'عملة_غير_صحيحة'
    | 'غير_ذلك';
  currency: string;
  isAmountMatchingWords: boolean;
}

export interface WitnessCorrectionState {
  hasWitnessCorrection: boolean;
  witnessAction:
    | 'إضافة_شاهد_أغفل'
    | 'تصحيح_اسم_شاهد'
    | 'تصحيح_بيانات_شاهد'
    | 'تصحيح_عدد_الشهود'
    | 'خطأ_في_صفة_شاهد'
    | 'خطأ_في_بيانات_اللفيف'
    | 'مرجع_الشهادة';
  witnesses: Array<{
    id: string;
    originalName: string;
    correctedName: string;
    originalCin: string;
    correctedCin: string;
    capacity: string;
    notes?: string;
  }>;
}

export type CorrectionSubstantiveNature =
  | 'تصحيح_بيان_مادي_بياني'
  | 'استكمال_بيان_أغفل'
  | 'تصحيح_قد_يؤثر_في_مضمون_التصرف';

export interface PreSigningCheckRule {
  id: string;
  label: string;
  passed: boolean;
  severity: 'blocking' | 'warning' | 'info';
  explanation: string;
}

export interface CorrectionAddendumState {
  // 1. Original Deed Data
  originalDeed: OriginalDeedReference;
  isOriginalDeedSelected: boolean;

  // 2. Correction Applicant
  applicant: CorrectionApplicant;

  // 3. Multi-item Corrections
  selectedCategories: CorrectionFieldCategory[];
  items: CorrectionItem[];

  // 4. Specialized Sub-systems
  propertyCorrection?: PropertyCorrectionState;
  financialCorrection?: FinancialCorrectionState;
  witnessCorrection?: WitnessCorrectionState;

  // 5. Nature & Judicial Compliance (Art 33 Law 16.03)
  substantiveNature: CorrectionSubstantiveNature;
  legalJustificationNotes: string;

  // 6. Pre-signing 15 automated validation checks
  validationChecks: PreSigningCheckRule[];

  // 7. Court & Notarial Signature Context
  courtName: string;
  notary1: string;
  notary2: string;
  addendumDateHijri: string;
  addendumDateGregorian: string;
  closingFormula: string;
}
