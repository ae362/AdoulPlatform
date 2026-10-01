// ==============================================================================
// 🏠 موجـب استرجـاع حيازة — Possession Recovery Deed Types (المواد 244-246 ق.م.م وقانون 39.08)
// ==============================================================================

export type PossessionRecoveryOperationType =
  | 'استرجاع_فعلي' // استرجاع الحيازة فعلياً
  | 'إثبات_واقعة_سابقة' // إثبات واقعة استرجاع حيازة حصلت سابقاً
  | 'استرجاع_بعد_نزاع' // إثبات استرجاع الحيازة بعد نزاع
  | 'استرجاع_بناء_على_حكم'; // استرجاع الحيازة بناءً على حكم قضائي

export type AttendanceMode =
  | 'أصالة' // أصالة عن نفسه
  | 'وكالة' // بواسطة وكيل
  | 'نيابة_شرعية'; // بواسطة ولي/نائب شرعي

export type PropertyNatureType =
  | 'أرض_فلاحية'
  | 'أرض_عارية'
  | 'دار'
  | 'منزل'
  | 'بستان'
  | 'أرض_للرعي'
  | 'أرض_للغرس'
  | 'عقار_آخر';

export type AreaDeterminationMethod =
  | 'وثيقة'
  | 'قياس'
  | 'تصريح'
  | 'خبرة'
  | 'غير_محددة';

export type PossessionShareType =
  | 'حيازة_منفردة'
  | 'حيازة_مشتركة'
  | 'حيازة_على_الشياع'
  | 'حيازة_على_جزء_مفرز'
  | 'حيازة_على_حصة_شائعة'
  | 'غير_محددة';

export type LossOfPossessionMode =
  | 'انتزاع_مادي'
  | 'منع_من_الدخول'
  | 'منع_من_الاستغلال'
  | 'إغلاق_العقار'
  | 'وضع_اليد_من_الغير'
  | 'إخراج_الحائز'
  | 'احتلال_العقار'
  | 'تغيير_معالم_الحيازة'
  | 'منع_الحائز_من_الانتفاع'
  | 'أخرى';

export type RecoveryMode =
  | 'وضع_يد_تلقائي' // عاد الحائز ووضع يده بنفسه
  | 'اتفاق_رضائي' // عاد بعد اتفاق
  | 'تدخل_الغير' // عاد بعد تدخل الغير
  | 'صلح' // عاد بعد صلح
  | 'حكم_قضائي' // عادت الحيازة بعد حكم قضائي
  | 'طريقة_أخرى';

export type PossessionOriginBasis =
  | 'إرث'
  | 'شراء_سابق'
  | 'هبة'
  | 'قسمة'
  | 'صلح'
  | 'تخارج'
  | 'حيازة_فعلية_دون_سند'
  | 'وضع_يد_قديم'
  | 'انتقال_من_حائز_سابق'
  | 'سبب_آخر';

export type DisputeStatus =
  | 'لا_يوجد_نزاع'
  | 'دعوى_حيازة'
  | 'دعوى_ملكية'
  | 'صدر_حكم'
  | 'يوجد_تنفيذ';

export interface JudicialRulingDetails {
  courtName: string;
  caseNumber: string;
  rulingNumber: string;
  rulingDate: string;
  parties: string;
  operativePart: string; // منطوق الحكم
  relatesToPossessionRecovery: boolean;
  isFinalRuling: boolean;
  appealReferences?: string;
  enforcementRecordNumber?: string;
  enforcementDate?: string;
  enforcementAuthority?: string;
  enforcementResult?: string;
}

export interface ApplicantIdentity {
  name: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  profession: string;
  maritalStatus?: string;
  address: string;
  cin: string;
  cinIssueDate?: string;
  cinIssuePlace?: string;
  phone?: string;
  email?: string;
}

export interface PowerOfAttorneyDetails {
  principalName: string;
  agentName: string;
  poaType: string;
  poaDate: string;
  notary1: string;
  notary2: string;
  registerBook: string;
  letter: string;
  page: string;
  number: string;
  court: string;
  authDate: string;
  coversPossession: boolean;
  scopeNotes?: string;
}

export interface PropertyComponentItem {
  id: string;
  title: string;
  nature: string;
  description: string;
  areaM2?: number;
  locationDetails?: string;
  boundaries?: string;
  possessionDetails?: string;
}

export interface PriorPossessorItem {
  id: string;
  name: string;
  cin?: string;
  capacity: string; // طالب الإشهاد، مورثه، شريك، إلخ
  natureOfPossession: string;
  possessedPortion: string;
  shareFraction?: string;
  isExclusive: boolean;
  durationYears?: number;
  durationMonths?: number;
}

export interface DirectObservationWitness {
  id: string;
  name: string;
  cin: string;
  profession: string;
  address: string;
  relationshipToParties: string;
  durationOfPropertyKnowledgeYears: number;
  witnessedPriorPossession: boolean;
  witnessedLossOfPossession: boolean;
  witnessedRecovery: boolean;
  isDirectObservation: boolean; // نعم: معاينة مباشرة / لا: سماع
  knowledgeSource: string;
  notes?: string;
}

export interface TitleDeedReference {
  id: string;
  titleType: string;
  deedDate: string;
  originDescription: string;
  documentNumber: string;
  registerBook?: string;
  letter?: string;
  page?: string;
  number?: string;
  court?: string;
  parties?: string;
  summaryContent?: string;
}

export interface RegistrationRecordItem {
  id: string;
  authority: string;
  registrationType: string;
  registrationNumber: string;
  registrationDate: string;
  volumeOrRegistry: string;
  notes?: string;
}

export interface SupportingDocumentItem {
  id: string;
  title: string;
  category: 'شهادة_إدارية' | 'شهادة_عدم_التحفيظ' | 'وثيقة_ضريبية' | 'رسم_قديم' | 'مخطط_طبوغرافي' | 'وثيقة_إرث' | 'عقد_سابق' | 'أخرى';
  issueDate?: string;
  reference?: string;
  notes?: string;
}

export interface LafifDeedLink {
  isLinked: boolean;
  lafifNumber?: string;
  lafifDate?: string;
  notary1?: string;
  notary2?: string;
  witnessCount?: number;
  subjectSummary?: string;
  certificationStatus?: string;
}

export interface PossessionRecoveryState {
  // ① بطاقة العملية
  operationType: PossessionRecoveryOperationType;
  registrationDeedNumber?: string;
  status: 'مسودة' | 'في_طور_الإعداد' | 'مستوفٍ' | 'معتمد' | 'محال_للقاضي';

  // ⚖️ بيانات الحكم إن وجد
  judicialRuling?: JudicialRulingDetails;

  // 2️⃣ طالب الإشهاد
  applicant: ApplicantIdentity;
  disputant?: { name: string; cin?: string; address?: string };

  // 3️⃣ الحضور والوكالة
  attendanceMode: AttendanceMode;
  poa?: PowerOfAttorneyDetails;

  // 4️⃣ & 5️⃣ بطاقة العقار ووصفه
  property: {
    isUnregistered: true; // يمنع اختيار محفظ
    location: {
      commune: string;
      cercleOrDistrict: string;
      pashalikOrAnnex?: string;
      province: string;
      region: string;
      douarOrQuarter: string;
      placeName: string; // اسم المكان / الموضع
      propertyName?: string; // اسم العقار
    };
    nature: PropertyNatureType;
    customNatureDetails?: string;
    area: {
      totalArea: number;
      unit: 'متر_مربع' | 'هكتار' | 'خدام' | 'سهم' | 'أخرى';
      areaM2: number;
      determinationMethod: AreaDeterminationMethod;
    };
    boundaries: {
      north: string;
      south: string;
      east: string;
      west: string;
      additionalBoundaries?: string;
    };
    isMultiComponent: boolean;
    components: PropertyComponentItem[];
  };

  // 7️⃣ & 8️⃣ الحائز السابق والأنصبة
  priorPossession: {
    possessorType: 'طالب_الإشهاد' | 'مورث_طالب_الإشهاد' | 'عدة_أشخاص' | 'شخص_آخر';
    possessors: PriorPossessorItem[];
    shareType: PossessionShareType;
    scopeNotes?: string;
    startDate?: string;
    startYear?: number;
    startKnowledgeSource?: string;
    calculatedDurationText?: string;
  };

  // 🔟 & 1️⃣1️⃣ واقعة فقدان الحيازة والعنف
  lossOfPossession: {
    mode: LossOfPossessionMode;
    customDetails?: string;
    date: string;
    time?: string;
    place?: string;
    wasViolentOrForced: boolean | 'غير_معلوم';
    violenceDetails?: {
      violenceType: string;
      personsInvolved: string;
      incidentSummary: string;
      wasComplaintFiled: boolean;
      complaintRecordNumber?: string;
      publicProsecutionCourt?: string;
      criminalRulingDetails?: string;
    };
  };

  // 1️⃣2️⃣ واقعة استرجاع الحيازة
  recoveryFact: {
    mode: RecoveryMode;
    customRecoveryDetails?: string;
    recoveryDate: string;
    detailedDescription: string; // بيان كيفية عودة الحيازة ووضع اليد الفعلي
  };

  // 1️⃣3️⃣ شهود المعاينة المباشرة
  witnesses: DirectObservationWitness[];

  // 1️⃣4️⃣ أصل الحيازة والسندات
  possessionOrigin: {
    basis: PossessionOriginBasis;
    customBasisNotes?: string;
    hasDeed: boolean;
    deeds: TitleDeedReference[];
  };

  // 1️⃣5️⃣ التسجيل والمراجع
  registrationHistory: {
    hasPriorRegistration: boolean;
    records: RegistrationRecordItem[];
  };

  // 1️⃣6️⃣ الضرائب والوثائق الإدارية
  supportingDocuments: SupportingDocumentItem[];

  // 2️⃣0️⃣ & 2️⃣1️⃣ الحالة القضائية والربط الزمني
  judicialStatus: {
    disputeStatus: DisputeStatus;
    caseDetails?: {
      court: string;
      caseNumber: string;
      filingDate: string;
      plaintiff: string;
      defendant: string;
      subject: string;
      lastProceduralAction?: string;
    };
  };

  // 2️⃣2️⃣ اللفيف
  lafifLink: LafifDeedLink;

  // 2️⃣3️⃣ الغرض من التوثيق
  documentationPurpose: 'استرجاع_حصل_فعلا' | 'تمهيدا_لنزاع';

  // 2️⃣6️⃣ مسودة ونص الرسم
  draftText: string;

  // 2️⃣8️⃣ الأرشيف
  archiveSummary?: {
    archiveDate: string;
    folderNumber: string;
    notes?: string;
  };
}

