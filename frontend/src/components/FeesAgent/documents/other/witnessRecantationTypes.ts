// ============================================================================
// Types for «رسم الرجوع عن الشهادة» (Witness / Notarial Recantation Deed)
// In accordance with Moroccan Notarial Law (Law 16.03 & Draft 51.26), Law of Obligations and Contracts (DOC),
// Moroccan Judicial Jurisprudence, Maliki Fiqh, and Lafif Testimony Regulations.
// Zero Mock Data — 100% Deterministic & Strongly Typed.
// ============================================================================

export type RecantationOperationType =
  | 'رجوع_عدل_عن_شهادة_علمية'
  | 'رجوع_شاهد_عن_شهادة_علمية_مثلية'
  | 'رجوع_شاهد_من_شهود_اللفيف'
  | 'رجوع_بعض_شهود_اللفيف'
  | 'رجوع_جميع_شهود_اللفيف'
  | 'رجوع_عن_جزء_من_الشهادة'
  | 'رجوع_كامل_عن_الشهادة';

export type RecantationSubjectType =
  | 'ملكية_عقار'
  | 'حيازة'
  | 'استمرار_زواج'
  | 'كفالة'
  | 'موجب_خلل_عقلي'
  | 'موجب_غيبة'
  | 'موجب_مطابقة_اسم'
  | 'إحصاء_متروك'
  | 'واقعة_شخصية'
  | 'دين_أو_حق_مالي'
  | 'إراثة_استحقاق'
  | 'واقعة_مادية'
  | 'منقول'
  | 'واقعة_مرتبطة_بعقار'
  | 'شهادة_لفيفية_أخرى'
  | 'موضوع_آخر';

export type RecantingPersonRole =
  | 'العدل_نفسه'
  | 'العدل_الثاني'
  | 'كلا_العدلين'
  | 'شاهد_واحد_من_شهود_اللفيف'
  | 'أكثر_من_شاهد'
  | 'جميع_شهود_اللفيف';

export interface OriginalTestimonyReference {
  certificateType: string;
  deedNumber: string;
  year: string;
  recordLetter: string;
  countNumber: string;
  pageNumber: string;
  certificateDate: string;
  inclusionDate: string;
  courtName: string;
  firstNotary: string;
  secondNotary: string;
  originalText?: string;
  subject: RecantationSubjectType;
  partiesSummary?: string;
}

export interface LafifWitnessEntry {
  id: string;
  witnessNumber: number;
  fullName: string;
  nationalId: string;
  fatherName?: string;
  motherName?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  profession?: string;
  status: 'باق_على_شهادته' | 'يرجع_عن_شهادته';
  testimonySummary?: string;
  recantationDetails?: string;
}

export type RecantationScope = 'رجوع_كلي' | 'رجوع_جزئي' | 'رجوع_عن_واقعة_محددة';

export type PropertyRecantationAspect =
  | 'أصل_الملكية'
  | 'الحيازة'
  | 'تاريخ_بداية_الحيازة'
  | 'صفة_الحيازة'
  | 'استمرار_الحيازة'
  | 'موقع_العقار'
  | 'هوية_العقار'
  | 'حدود_العقار'
  | 'مساحة_العقار'
  | 'إحداثيات_العقار'
  | 'الملكية_السابقة'
  | 'واقعة_مادية_مرتبطة_بالعقار'
  | 'جزء_محدد_فقط';

export type MarriageRecantationAspect =
  | 'أصل_استمرار_الزواج'
  | 'تاريخ_الاستمرار'
  | 'عدم_العلم_بالطلاق'
  | 'عدم_العلم_بالوفاة'
  | 'واقعة_أخرى_بالزوجية';

export type AbsenceRecantationAspect =
  | 'أصل_الغيبة'
  | 'مدة_الغيبة'
  | 'مكان_آخر_مشاهدة'
  | 'تاريخ_آخر_مشاهدة'
  | 'عدم_العلم_بمكان_الوجود'
  | 'واقعة_أخرى_بالغيبة';

export type NameMatchRecantationAspect =
  | 'أرجع_عن_المطابقة_كليا'
  | 'أرجع_عن_جزء_من_بيانات_المطابقة'
  | 'تبين_لي_أن_الشخصين_مختلفان'
  | 'لم_أعد_أجزم_بالمطابقة';

export type EstateInventoryRecantationAspect =
  | 'وجود_المال'
  | 'ملكية_الموروث_للمال'
  | 'مقدار_المال'
  | 'وصف_المال'
  | 'وجود_منقول_معين'
  | 'واقعة_أخرى_بالمتروك';

export type RecantationReasonCategory =
  | 'تبين_الخطأ'
  | 'وقوع_الشاهد_في_الوهم'
  | 'الاشتباه'
  | 'عدم_ضبط_الواقعة'
  | 'التباس_في_الشخص'
  | 'التباس_في_المكان'
  | 'التباس_في_التاريخ'
  | 'التباس_في_حدود_العقار'
  | 'عدم_العلم_الكافي_بالواقعة'
  | 'ظهور_واقعة_جديدة'
  | 'ظهور_وثيقة_تناقض_ما_شهد_به'
  | 'تبين_أن_الواقعة_ليست_كما_شهد_بها'
  | 'خطأ_في_النقل_أو_التلقي'
  | 'خطأ_في_الإدراك'
  | 'إغفال_واقعة_مؤثرة'
  | 'سبب_آخر';

export type RecantationNatureChoice =
  | 'أقرر_أنني_أخطأت_فيما_شهدت_به'
  | 'تبين_لي_خلاف_ما_شهدت_به'
  | 'لا_أجزم_بالحقيقة_الجديدة_وإنما_أرجع_عن_شهادتي_الأولى'
  | 'صيغة_أخرى_يحددها_الراجع';

export type PriorUsageStatus =
  | 'لم_تقدم_بعد_لأي_جهة'
  | 'قدمت_إلى_المحكمة'
  | 'قدمت_إلى_المحافظة_العقارية'
  | 'قدمت_إلى_إدارة'
  | 'استعملت_في_عقد'
  | 'استعملت_في_دعوى'
  | 'لا_أعلم'
  | 'جهة_أخرى';

export type ProcessDistinctionType =
  | 'رجوع_عن_شهادة' // A: Witness recants/withdraws
  | 'تصحيح_بيان_مادي' // B: Material mistake correction (redirects to addendum)
  | 'شهادة_جديدة'; // C: New substantive testimony

export type ScrutinyRiskLevel = 'عادي' | 'مهم' | 'دقيق_جداً';

export interface RecantationEvidenceItem {
  id: string;
  documentType:
    | 'بطاقة_تعريف_وطنية'
    | 'وثيقة_عقارية'
    | 'رسم_عدلي'
    | 'حكم_قضائي'
    | 'شهادة_إدارية'
    | 'وثيقة_حالة_مدنية'
    | 'وثيقة_طبية'
    | 'وثيقة_أخرى';
  documentNumber: string;
  documentDate: string;
  issuingAuthority: string;
  relevanceReason: string;
  attachmentName?: string;
}

export interface WitnessRecantationState {
  // 1. Core Operation
  operationType: RecantationOperationType;
  testimonySubject: RecantationSubjectType;
  customSubject?: string;

  // 2. Original Deed Reference
  originalDeed: OriginalTestimonyReference;

  // 3. Recanting Party Identity
  recantingRole: RecantingPersonRole;
  applicant: {
    fullName: string;
    nationalId: string;
    fatherName: string;
    motherName: string;
    birthDate: string;
    birthPlace: string;
    address: string;
    profession: string;
    roleInDeed: string;
    phone?: string;
  };

  // 4. Lafif Witness Map (12 Witnesses)
  lafifWitnesses: LafifWitnessEntry[];

  // 5. Scope & Targeted Clause
  recantationScope: RecantationScope;
  targetedClauseOriginal: string; // The exact text snippet
  recantedAspectProperty?: PropertyRecantationAspect[];
  recantedAspectMarriage?: MarriageRecantationAspect[];
  recantedAspectAbsence?: AbsenceRecantationAspect[];
  recantedAspectNameMatch?: NameMatchRecantationAspect;
  recantedAspectEstate?: EstateInventoryRecantationAspect[];
  customRecantedFact?: string;

  // 6. Reasons & Explanation
  reasonCategory: RecantationReasonCategory;
  customReasonText?: string;
  detailedReasonExplanation: string;

  // 7. Nature (الرجوع عن الباطل إلى الحق)
  natureChoice: RecantationNatureChoice;
  customNatureText?: string;
  willStateNewTruth: boolean;
  newTruthStatement?: string; // بيان ما تبين للراجع

  // 8. Specialized Subject Details
  propertyDetails?: {
    location?: string;
    commune?: string;
    area?: string;
    boundaries?: {
      north?: string;
      south?: string;
      east?: string;
      west?: string;
    };
    landTitleNumber?: string;
    requisitionNumber?: string;
    coordinates?: string;
  };
  marriageDetails?: {
    husbandName?: string;
    wifeName?: string;
    marriageDate?: string;
    marriagePlace?: string;
    knowledgeSource?: string;
    knowledgeDuration?: string;
  };
  absenceDetails?: {
    missingPersonName?: string;
    lastKnownLocation?: string;
    lastContactDate?: string;
    absenceDuration?: string;
    witnessBasis?: string;
  };
  nameMatchDetails?: {
    firstNameStated?: string;
    secondNameStated?: string;
    identityCardNumber?: string;
    basisOfMatch?: string;
  };
  estateDetails?: {
    deceasedName?: string;
    estateSummary?: string;
    moneyAmount?: string;
    movableDescription?: string;
  };

  // 9. Prior Usage & Legal Exposure
  priorUsage: PriorUsageStatus;
  priorUsageDetails?: string;
  hasJudgmentIssued: 'نعم' | 'لا' | 'لا_أعلم';
  judgmentDetails?: string;
  hasExecutionOccurred: 'نعم' | 'لا' | 'لا_أعلم';
  executionDetails?: string;

  // 10. Supporting Documents
  evidenceDocuments: RecantationEvidenceItem[];

  // 11. Consistency & Process Qualification
  processDistinction: ProcessDistinctionType;
  contradictionNotes?: string[];

  // 12. Verification & Scrutiny
  scrutinyLevel: ScrutinyRiskLevel;
  hasReadContents: boolean;
  understandsLegalConsequences: boolean;
  confirmedPersonalOrigin: boolean;

  // 13. Registration & Marginal Note Details
  endorsementNoteCourt: string;
  marginalAnnotationRecorded: boolean;
  marginalAnnotationDate?: string;
  marginalAnnotationNumber?: string;

  // 14. Generated Legal Draft
  legalDraftArabic?: string;
}
