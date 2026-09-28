import type { DocumentType } from '../constants/feesAgentLocales';

export type PaymentMethod = 'نقد' | 'شيك' | 'تحويل' | 'قسط' | 'اعترافا';
export type PropertyType = 'محفظ' | 'غير_محفظ' | 'منقول' | 'مزيج';
export type ValidationSeverity = 'عادي' | 'هام' | 'حرج';

export interface Party {
  nationality?: 'مغربي' | 'اجنبي' | '';
  name: string;
  fatherName: string;
  motherName: string;
  fatherProfession?: string;
  motherProfession?: string;
  placeOfBirth?: string;
  address: string;
  idNumber: string;
  idIssueDate: string;
  idExpiryDate?: string;
  profession?: string;
  dateOfBirth?: string;
  idImage: File | null;
  share?: string; // حصة الطرف (للبائع أو المشتري)
  ocrExtracted?: {
    name?: string;
    idNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    address?: string;
  };
  // New fields for Deceased (Inheritance)
  isRecentDeath?: 'نعم' | 'لا' | '';
  deathCertificateNumber?: string;
  deathCertificateDate?: string;
  deathCertificateIssuedBy?: string;

  // Marriage specific fields
  maritalStatus?: 'اعزب' | 'ارمل' | 'مطلق' | '';
  
  // Divorce details
  divorceDeedBook?: string;
  divorceDeedNumber?: string;
  divorceDeedLetter?: string;
  divorceDeedPage?: string;
  divorceDeedCount?: string;
  divorceDeedDate?: string;
  divorceDeedNotary?: string;

  // Birth Certificate for Marriage
  birthCertificateNumber?: string;
  birthCertificateYear?: string;
  birthCertificateDate?: string;
  birthCertificateCommune?: string;
  birthCertificateCity?: string;

  // Administrative Certificate for Engagement
  engagementCertificateNumber?: string;
  engagementCertificateDate?: string;
  engagementCertificateCommune?: string;
  engagementCertificateCity?: string;

  // Medical Certificate
  medicalCertificateNumber?: string;
  medicalCertificateDate?: string;
  medicalCertificateIssuedBy?: string;
  medicalCertificateCity?: string;

  // Special Proxy for Marriage
  hasSpecialProxy?: 'نعم' | 'لا' | '';
  proxyName?: string;
  proxyDOB?: string;
  proxyNationalID?: string;
  proxyAddress?: string;
  proxyFatherName?: string;
  proxyMotherName?: string;
  
  proxyDeedBook?: string;
  proxyDeedNumber?: string;
  proxyDeedCount?: string;
  proxyDeedPage?: string;
  proxyDeedDate?: string;
  proxyDeedNotary?: string;

  // Underage Marriage Permission
  underagePermissionIssuedBy?: string;
  underagePermissionNumber?: string;
  underagePermissionDate?: string;
  underagePermissionCourt?: string;

  // Mixed Marriage Specific Fields
  nameLatin?: string;
  birthCertificateIssuedBy?: string;
  birthCertificateCountry?: string;
  nationalityCertificateIssuedBy?: string;
  criminalRecordBirthplaceIssuedBy?: string;
  criminalRecordBirthplaceNumber?: string;
  criminalRecordBirthplaceDate?: string;
  criminalRecordBirthplaceCountry?: string;
  capacityCertificateIssuedBy?: string;
  capacityCertificateDate?: string;
  capacityCertificateEndorsementDate?: string;
  residenceCountry?: string;
  currentStatus?: string;
  passportIssuedBy?: string;
  passportNumber?: string;
  passportValidUntil?: string;
  passportImage?: File | null;
  entryStampImage?: File | null;
  centralCriminalRecordNumber?: string;
  centralCriminalRecordDate?: string;

  // Certificate Images
  nationalityCertificateImage?: File | null;
  medicalCertificateImage?: File | null;
  supplementaryMedicalCertificateImage?: File | null;
  capacityCertificateImage?: File | null;
  criminalRecordBirthplaceImage?: File | null;
  centralCriminalRecordImage?: File | null;
  deathCertificateImage?: File | null;
  engagementCertificateImage?: File | null;
  infectiousDiseaseCertificateImage?: File | null;
  islamCertificateImage?: File | null;

  // Divorce details (Foreign)
  divorceSource?: 'رسم' | 'حكم' | '';
  divorceCourt?: string;
  divorceJudgmentDate?: string;
  divorceExecutiveFormula?: string;
  divorceExecutiveDate?: string;
  divorceCountry?: string;

  // Guardian for Wife (Marriage)
  contractsWithoutGuardian?: 'نعم' | 'لا' | '';
  guardianRelationship?: 'أب' | 'أخ' | 'عم' | 'أخرى' | '';
  guardianRelationshipCustom?: string;
  guardianName?: string;
  guardianDOB?: string;
  guardianProfession?: string;
  guardianNationalID?: string;
  guardianAddress?: string;
  guardianFatherName?: string;
  guardianMotherName?: string;

  // ============================================================================
  // LEGAL ENTITY FIELDS (شخص معنوي)
  // ============================================================================
  partyType?: 'natural' | 'legal'; // شخص ذاتي | شخص معنوي
  actingCapacity?: 'personal' | 'legal_representative'; // Tawkil: Acting in personal name or as legal rep
  
  // Legal Entity Type
  legalEntityType?: 'company' | 'association' | 'cooperative' | 'public_institution';
  
  // Common Fields
  legalEntityName?: string;
  legalForm?: string;
  headquartersAddress?: string;
  companyPurpose?: string;
  legalRepresentativeName?: string;
  legalRepresentativeCapacity?: string;
  representationDocType?: 'articles' | 'minutes' | 'power_of_attorney';
  representationDocRef?: string; // Number/Date
  legalRepresentativeId?: string;
  
  // Smart Checks
  purposeAllowsPropertyAcquisition?: boolean;
  articlesRestrictRepresentative?: boolean;
  requiresAssemblyPermission?: boolean;
  
  // Specifics - Company
  commercialRegister?: string;
  court?: string;
  ice?: string;
  taxId?: string; // IF
  companyType?: string; // SARL, etc.
  specialAuthorization?: boolean;
  
  // Specifics - Association
  depositReceiptNumber?: string;
  depositReceiptDate?: string;
  depositAuthority?: string;
  hasEconomicActivity?: boolean;
  
  // Specifics - Cooperative
  coopRegistrationNumber?: string;
  coopRegistrationAuthority?: string;
  
  // Specifics - Public Institution
  creationLawText?: string;
  dahirNumber?: string;
  supervisoryAuthority?: string;
  adminPurchaseAuth?: string;
  
  hasArticlesOfAssociation?: boolean;
  [key: string]: any;
}

export interface Applicant extends Party {
  capacity: 'وارث' | 'نائب_شرعي' | 'بتوكيل' | '';
  proxyDetails?: {
    book: string;
    page: string;
    number: string;
    date: string;
    notary: string;
  };
}

export interface TitleDocumentDetails {
  feeType?: string; // نوع الرسم
  bookReference?: string; // ضمن بكناش
  number?: string; // رقم
  letter?: string; // حرف
  page?: string; // صحيفة
  count?: string; // عدد
  date?: string; // بتاريخ
  correspondingDate?: string; // توثيق
  
  // Registration & Stamp References
  hasRegistrationReferences: 'نعم' | 'لا' | '';
  registeredAt?: string; // المسجل بمالية
  depositNumber?: string; // رقم الايداع / الوصل
  depositDate?: string; // بتاريخ (الايداع)

  // Notes & Conditions
  hasNotes: 'نعم' | 'لا' | '';
  notes?: string;

  file: File | null; // صورة السند
}

export interface OwnershipCertificateDetails {
  number?: string;
  date?: string;
  issuedBy?: string;
  file: File | null;
}

export interface PropertyDetails {
  type: PropertyType;
  propertyName?: string;
  location?: string;
  province?: string;
  titleRef?: string;
  titleRefDate?: string;
  ownershipDurationYears?: number;
  ownershipDurationMonths?: number;
  area_m2?: number;
  length_m?: number;
  width_m?: number;
  boundaries: { north: string; south: string; east: string; west: string };
  coordinates: { lat: number; lng: number }[];
  geoLatitude?: number; // Deprecated, kept for backward compatibility
  geoLongitude?: number; // Deprecated, kept for backward compatibility
  
  titleDocuments: TitleDocumentDetails[];
  ownershipCertificates: OwnershipCertificateDetails[];

  hasThirdPartyRights: 'نعم' | 'لا' | '';
  thirdPartyDetails?: string;
  ocrExtracted?: {
    titleRef?: string;
    titleRefDate?: string;
  };
  [key: string]: any;
}

export interface FinanceDetails {
  price: number;
  priceInWords: string;
  paymentMethod: PaymentMethod | '';
  transferDetails?: string;
  registeredWithTax: 'نعم' | 'لا' | '';
  conservatorRequest?: string;
  registrationDate?: string;
  taxReceiptNumber?: string;
  region?: string;
  registrationType?: string;
  isFreeRegistration?: boolean | string;
  conservationPrice?: number;
  [key: string]: any;
}

export interface DocumentMeta {
  fileNumber: string;
  notaryPrimary: string;
  notarySecondary: string;
  dateGregorian: string;
  dateHijri: string;
  dateGregorianInWords?: string;
  dateHijriInWords?: string;
  time?: string;
  hourInWords?: string;
  notaryPartnerId?: string;
  additionalDocuments: File[];
  court?: string;
  appellateCourt?: string;
  courtSection?: string;
  authorizationNumber?: string;
  authorizationDate?: string;
  registryNumber?: string;
  registryCount?: string;
  registryPage?: string;
  receptionDate?: string;
}

export interface ValidationAlert {
  id: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
  suggestion?: string;
}

export interface AuditEntry {
  timestamp: string;
  notary: string;
  action: string;
  field: string;
  oldValue?: string;
  newValue: string;
}

export interface AdministrativeCertificate {
  id: string;
  type: string;
  number: string;
  date: string;
  issuedBy: string;
  isCustom: boolean;
}

export interface PostRegistrationDetails {
  registeredAtFinance: string;
  registrationDate: string;
  depositNumber: string;
  templatePdf: File | null;
}

export interface InheritanceDeed {
  book: string;
  page: string;
  number: string;
  date: string;
  notary: string;
}

export type WitnessAgeStatus = 'valid' | 'invalid' | 'pending';
export type WitnessKinshipRelation = 'none' | 'kinship' | 'affinity' | 'unsure';
export type WitnessInquestResult = 'valid' | 'warning' | 'invalid' | 'incomplete';

export interface Witness extends Party {
  dateOfBirth: string;
  // Dual dates and ages (المادة 67 من القانون 51.26 وقواعد اللفيف)
  hearingDate?: string; // تاريخ تحمّل الشهادة
  testimonyDate?: string; // تاريخ أداء الشهادة
  bearingAge?: number; // السن عند التحمل
  performanceAge?: number; // السن عند الأداء
  bearingStatus?: WitnessAgeStatus; // بلوغ سن التمييز (12 سنة)
  performanceStatus?: WitnessAgeStatus; // بلوغ سن الرشد (18 سنة)

  // محرك أهليّة الشاهد وقواعد الإثبات الزمني (التحمل المرن ومصادر العلم)
  bearingMode?: 'exact_date' | 'year_only' | 'relative_years'; // نمط تحديد زمن التحمل
  bearingYear?: number; // سنة المعاينة أو العلم (مثال: 2010)
  bearingRelativeYears?: number; // مدة تقريبية بالسنوات (مثال: منذ 15 سنة)
  effectiveBearingDate?: string; // التاريخ الفعلي المحسوب للتحمل
  bearingSource?: 'inspection' | 'hearing' | 'fame'; // معاينة شخصية ومجاورة / سماع فاشٍ ومستفيض / شهرة
  coverageYears?: number; // عدد سنوات التغطية التي يشهد بها
  coversClaimedStart?: boolean; // هل يغطي بداية الفترة المدعى بها
  coverageNote?: string; // تنبيه قانوني حول تغطية المدة
  
  // التحري في القرابة والمصاهرة
  kinshipRelation?: WitnessKinshipRelation; // صلة القرابة أو المصاهرة
  kinshipType?: string; // نوع القرابة (أب، ابن، أخ، عم...)
  kinshipDegree?: number | string; // درجة القرابة
  kinshipStatus?: 'valid' | 'invalid' | 'warning'; // نتيجة فحص القرابة

  // توثيق التحري والأثر الرقمي (Audit Trail)
  inquestResult?: WitnessInquestResult; // نتيجة التحري
  inquestDate?: string; // تاريخ التحري
  inquestNotary?: string; // العدل القائم بالتحري
  inquestMethod?: string; // طريقة التحقق (تصريح طالب الشهادة، تصريح الشاهد، وثيقة...)
  inquestNotes?: string; // ملاحظات التحري
  inquestBlockReason?: string; // سبب المنع إن وجد
}

// موضوع الواقعة والمدى الزمني للإثبات
export type SubjectMatterCategory = 
  | 'possession_acquisition' // حيازة مكسبة للملك (10 سنوات لغير الشريك / 40 سنة بين الأقارب)
  | 'possession_hearing'     // شهادة السماع في الملك (20 سنة مع الشروط التوثيقية)
  | 'continuous_enjoyment'   // استمرار الحيازة والتصرف
  | 'material_fact'          // واقعة مادية محددة (ولادة، بناء، اعتداء، وفاة)
  | 'custom_period';         // فترة مخصصة يحددها الأطراف

export interface EvidenceSubjectMatter {
  category: SubjectMatterCategory;
  title?: string;
  depositionDate: string; // تاريخ أداء الشهادة (YYYY-MM-DD)
  periodType: 'duration_years' | 'exact_start_date' | 'approx_year';
  claimedDurationYears?: number; // مثلاً 20 سنة
  exactStartDate?: string; // مثلاً 2006-09-13
  approxStartYear?: number; // مثلاً 2006
  calculatedStartDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface PartitionBeneficiary {
  name: string;
  share: string;
}

export interface PartitionDivision {
  beneficiaries: PartitionBeneficiary[];
  propertyDescription: string;
  area: string;
  length: string;
  width: string;
  boundaries: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  coordinates: {
    lat: string;
    lng: string;
  };
  divisionValue: number;
  divisionValueInWords: string;
}

export interface FacilityShare {
  name: string;
  percentage: number;
}

export interface FacilityItem {
  id: string;
  name: string;
  isCustom: boolean;
  shares: FacilityShare[];
}

export interface CommonFacilities {
  hasCommonFacilities: 'نعم' | 'لا' | '';
  items: FacilityItem[];
}

// BuildingProof Deed Type (ثبوت بناء)
export interface BuildingProof {
  // Section A: Property Status (حالة العقار)
  landStatus?: 'ملك_صريح' | 'حيازة' | 'حكم' | '';
  baseContainer?: string; // Base/container identifier
  location?: string;

  // Section B: Building Description (وصف البناء)
  buildingUse?: string; // الاستعمال: سكني، تجاري، إلخ
  numberOfFloors?: number;
  numberOfRooms?: number;
  roofType?: string; // نوع السقف
  wallMaterials?: string; // مواد الجدران
  buildingAge?: number; // عمر البناء
  estimatedValue?: number;
  constructionDuration?: string; // مدة الإنشاء

  // Section C: Possession & Witnesses (الحيازة والشهود)
  possessionClean?: boolean; // هل الحيازة نظيفة؟
  hasDispute?: boolean;
  disputeDetails?: string;
  evidenceSources?: ('معاينة' | 'مخالطة' | 'جوار' | 'شدة_الاطلاع')[];
  minimumWitnessesWarning?: boolean; // يستحسن إدراج 6 شهود على الأقل

  // Section D: Permits & Warnings (التراخيص والتحذيرات)
  hasPermit?: boolean;
  authoritiesNotified?: string[];
  permitDetails?: string;
  riskFlags?: {
    thirdPartyLand?: boolean; // أرض الغير
    collectiveLand?: boolean; // أرض جماعية
    forestLand?: boolean; // أرض غابوية
    urbanWithoutPermit?: boolean; // حضر بدون رخصة
    sensitiveZone?: boolean; // منطقة حساسة
  };

  // Section E: Workflow (سير العمل)
  workflowChecks?: {
    gpsCaptured?: boolean;
    containerIdentified?: boolean;
    disputeDeclared?: boolean;
    witnessesCaptured?: boolean;
    registrationPaid?: boolean;
    deedDrafted?: boolean;
    inclusionDone?: boolean;
  };

  // Section F: Smart Questions (الأسئلة الذكية)
  smartAnswers?: {
    isLandRegistered?: boolean;
    isPermitAvailable?: boolean;
    hasDisputeNow?: boolean;
    buildYearsPassed?: number;
    applicantLivesInBuilding?: boolean;
    buildingInherited?: boolean;
    buildingOnCommonLand?: boolean;
  };
  [key: string]: any;
}

// EasementProof Deed Type (ثبوت مرفق / حق الارتفاق)
export interface EasementProof {
  // 1. أطراف الحق
  dominantOwnerDescription?: string; // مالك العقار المرتفق
  servientOwnerDescription?: string; // مالك العقار المرتفق به
  registrarInvolved?: boolean; // المحافظ على الأملاك العقارية
  notariesInvolved?: string; // أسماء العدول أو مكتب التوثيق

  // 2. بيانات العقار المرتفق والعقار المرتفق به
  dominantProperty: {
    titleNumber?: string;
    propertyNature?: 'محفظ' | 'غير_محفظ' | 'جماعي' | 'حبسي' | '';
    location?: string;
    currentUse?: string;
    boundaries?: string;
  };
  servientProperty: {
    titleNumber?: string;
    propertyNature?: 'محفظ' | 'غير_محفظ' | 'جماعي' | 'حبسي' | '';
    location?: string;
    currentUse?: string;
    boundaries?: string;
  };
  nonRegisteredDescriptionWarningAcknowledged?: boolean; // تحذير عند عدم التحفيظ

  // 3. مصدر إنشاء الارتفاق
  creationMode?: 'طبيعي' | 'قانوني' | 'اتفاقي' | '';
  naturalCauseDescription?: string; // انحدار/ماء/تضاريس...
  legalReferenceNotes?: string; // حماية منفعة عامة/خاصة
  agreementReference?: string; // مرجع العقد المكتوب إن كان اتفاقيًا

  // 4. نوع الارتفاق
  easementCategories?: (
    | 'حق_الشرب'
    | 'حق_المجرى'
    | 'حق_المسيل'
    | 'حق_المرور'
    | 'حق_المطل'
  )[];
  easementDetailedUse?: string; // وصف دقيق لنطاق الاستعمال

  // 5. الحقوق والالتزامات
  dominantRights?: {
    useWithinScope?: boolean;
    performNecessaryWorks?: boolean; // م44
    requestMaintenance?: boolean; // م46-59-63
  };
  dominantObligations?: {
    noHarmToServient?: boolean; // م47
    noExpansionBeyondScope?: boolean;
    maintainInstallationsAtOwnCost?: boolean;
  };
  servientRights?: {
    requestCompensation?: boolean; // م57-63-64
    requestLocationChangeIfLessHarmful?: boolean; // م47
  };

  // 6. أسئلة ذكية
  smartAnswers?: {
    createdByLawOrAgreement?: 'قانون' | 'اتفاق' | 'طبيعي' | '';
    areBothPropertiesRegistered?: 'نعم' | 'لا' | 'مختلط' | '';
    involvesWaterOrFlow?: boolean; // شرب/مجرى/مسيل
    involvesPassageOrView?: boolean; // مرور/مطل
    potentialDamageOrDispute?: boolean;
    priorActualUseExists?: boolean; // استعمال فعلي سابق (الحيازة)
    compensationPaid?: boolean;
    isWaqfOrCollectiveLand?: boolean; // حبسي أو جماعي
  };

  // 7. التعويضات والتكاليف
  compensationRequiredFor?: {
    passage?: boolean; // م64
    waterCourse?: boolean; // م57
    drainage?: boolean; // م63
  };
  compensationCriteriaNotes?: string; // الضرر – المنفعة – المساحة – النطاق – طبيعة الأرض

  // 8. المستندات اللازمة
  documentsChecklist?: {
    idsProvided?: boolean; // بطائق التعريف
    ownershipProofProvided?: boolean; // سند ملكية / شهادة الملكية
    engineeringPlanProvided?: boolean; // تصميم هندسي
    satelliteImagesProvided?: boolean; // صور فضائية من المحافظ
    topographicSurveyProvided?: boolean; // تحديد طبوغرافي
    courtOrAdminDecisionProvided?: boolean; // حكم أو قرار إداري إن كان قانونياً
  };
  [key: string]: any;
}

// PossessionProof Deed Type (رسم الملك - ثبوت الملكية بالحيازة)
export interface PossessionProof {
  // I. أطراف الشهادة
  applicantRole?: 'حائز' | 'مالك_ادعاء' | 'وارث' | 'منتفع' | 'مدير_دار' | 'نائب_شرعي' | '';
  applicantCapacity?: 'لنفسه' | 'بصفته' | '';
  applicantName?: string;
  applicantIdNumber?: string;
  applicantAddress?: string;
  
  actualPossessor?: {
    name?: string;
    idNumber?: string;
    yearsOfPossession?: number;
    relationToApplicant?: 'نفسه' | 'موروث' | 'وكيل' | 'غير_ذلك' | '';
  };
  
  witnesses?: {
    count?: number;
    countRequired?: number;
    requirementsMet?: boolean;
    list?: Array<{
      name?: string;
      age?: number;
      knowledgeDuration?: number;
      knowledgeMethod?: 'معاشرة' | 'جوار' | 'قرابة' | 'مخالطة' | '';
      hasInspectedProperty?: boolean;
    }>;
  };
  
  relatedPersons?: {
    heirs?: string[];
    neighbors?: string[];
    partners?: string[];
    relatives?: string[];
    representatives?: string[];
  };
  
  potentialDispute?: {
    exists?: 'نعم' | 'لا' | '';
    claimantName?: string;
    disputeNature?: string;
  };
  
  possessionStartDate?: string;
  possessionYears?: number;
  propertyNature?: 'عقار' | 'أرض' | 'مبني' | 'فلاحي' | 'حضري' | 'تجاري' | '';
  currentStatus?: 'مستغل' | 'مهجور' | 'تحت_بناء' | 'غرس' | '';
  
  locationProfile?: {
    administrativeDivision?: 'عمالة' | 'إقليم' | 'جماعة' | 'قيادة' | '';
    province?: string;
    commune?: string;
    conservatory?: string;
    urbanOrRural?: 'حضري' | 'قروي' | '';
  };

  // II. توصيف العقار
  propertyType?: 'محفظ' | 'غير_محفظ' | 'في_طور_التحفيظ' | '';
  registrationNumber?: string;
  registrationApplicationNumber?: string;
  ownershipStatus?: 'ملكية_خاصة' | 'حبس' | 'جماعي' | 'ملك_دولة' | 'ملك_جماعة_ترابية' | 'غابات' | 'ملك_عمومي' | '';
  
  encumbrances?: {
    hasMortgage?: boolean;
    hasEasement?: boolean;
    hasUsufruct?: boolean;
    hasWaterRights?: boolean;
    hasConstruction?: boolean;
    hasExpansion?: boolean;
    hasPassage?: boolean;
    details?: string;
  };
  
  burdens?: {
    hasTaxes?: boolean;
    taxDetails?: string;
    hasCosts?: boolean;
    costDetails?: string;
    hasFees?: boolean;
    feeDetails?: string;
    hasEasements?: boolean;
    easementDetails?: string;
  };
  
  propertyDetails?: {
    customaryName?: string;
    fourBoundaries?: {
      north?: string;
      south?: string;
      east?: string;
      west?: string;
    };
    areaDescription?: string;
    area_m2?: number;
    coordinates?: string;
    supportingDocuments?: string;
  };

  // III. تصفية حالات عدم القبول
  legalFilters?: {
    isRegisteredProperty?: boolean;
    registeredPropertyRejection?: string;
    isCollectiveProperty?: boolean;
    collectivePropertyRequirements?: string;
    isStateProperty?: boolean;
    statePropertyRejection?: string;
    isWaqfProperty?: boolean;
    waqfPropertyRejection?: string;
    isForestOrWaterProperty?: boolean;
    forestWaterRejection?: string;
    canProceed?: boolean;
    rejectionReason?: string;
  };

  // IV. شروط صحة الحيازة
  possessionConditions?: {
    hasActualPossession?: 'نعم' | 'لا' | '';
    possessionEvidence?: string;
    treatmentAsOwner?: {
      acts?: ('حرث' | 'غرس' | 'سكنى' | 'بناء' | 'تأجير' | 'ترميم' | 'حصد' | 'تسليم' | 'تصرف_مالي')[];
      evidenceOfTreatment?: string;
    };
    publicReputation?: {
      peopleAttributeToHim?: boolean;
      reputation_years?: number;
      communityTestimony?: boolean;
    };
    absenceOfDisputes?: boolean;
    disputeHistory?: string;
    requiredPeriod?: {
      category?: 'أجنبي_غير_شريك' | 'قريب' | 'قريب_مع_عداوة' | 'شريك' | '';
      yearsRequired?: number;
      yearsActual?: number;
      meetsRequirement?: boolean;
    };
    deathRelated?: {
      isInherited?: boolean;
      noKnowledgeOfTransfer?: boolean;
      remainedInPossession?: boolean;
      noShariahTransfer?: boolean;
      inheritanceDocumentation?: string;
    };
  };

  // V. إثبات أصل التملك
  chainOfTitle?: {
    originalAcquisitionMode?: 'شراء' | 'هبة' | 'قسمة' | 'إراثة' | 'وصية' | 'عدل' | 'عقود_عرفية' | 'شهادات_سلطة' | '';
    previousPurchases?: Array<{
      date?: string;
      seller?: string;
      document?: string;
      notary?: string;
    }>;
    gifts?: Array<{
      date?: string;
      donor?: string;
      document?: string;
    }>;
    partitions?: Array<{
      date?: string;
      parties?: string[];
      document?: string;
    }>;
    inheritances?: Array<{
      deceasedName?: string;
      deathDate?: string;
      inheritanceDocument?: string;
    }>;
    customaryContracts?: string[];
    authorityCertificates?: string[];
    smartAlert?: string;
  };

  // VI. الشهود
  witnessVerification?: {
    maleWitnessCount?: number;
    femaleWitnessCount?: number;
    totalWitnessCount?: number;
    requiredCount?: number;
    countsufficient?: boolean;
    witnessDetails?: Array<{
      name?: string;
      age?: number;
      yearsOfKnowledge?: number;
      meetsAgeRequirement?: boolean;
      hasActualInspection?: boolean;
      inspectionDescription?: string;
      attestsNoDispute?: boolean;
      attestsNoTransfer?: boolean;
    }>;
  };

  // VII. أسئلة ذكية لطالب الشهادة
  applicantQuestionnaire?: {
    hasPreviousPurchaseRegistration?: 'نعم' | 'لا' | '';
    purchaseRegistrationDetails?: string;
    hasRegistrationApplication?: 'نعم' | 'لا' | '';
    registrationApplicationNumber?: string;
    isPrivateOrCollective?: 'خاص' | 'جماعي' | '';
    hasEncumbrances?: 'نعم' | 'لا' | '';
    encumbranceDetails?: string;
    hasPartialTransfer?: 'نعم' | 'لا' | '';
    partialTransferDetails?: string;
    hasLegalDispute?: 'نعم' | 'لا' | '';
    legalDisputeDetails?: string;
    hasCourtRuling?: 'نعم' | 'لا' | '';
    courtRulingDetails?: string;
    locationCategory?: 'حضري' | 'قروي' | '';
    additionalContext?: string;
  };

  // VIII. أسئلة ذكية للشهود
  witnessQuestionnaire?: {
    knowsApplicantWell?: 'نعم' | 'لا' | '';
    yearsOfKnowledge?: number;
    knowledgeSource?: 'معاشرة' | 'جوار' | 'قرابة' | 'مخالطة' | '';
    actualInspection?: 'نعم' | 'لا' | '';
    yearsOfActualObservation?: number;
    attestsNoPossessionDispute?: 'نعم' | 'لا' | '';
    attestsNoTransferDuringLife?: 'نعم' | 'لا' | '';
    physicalIndicators?: {
      hasGates?: boolean;
      hasFences?: boolean;
      hasPlanting?: boolean;
      hasBuilding?: boolean;
    };
  };

  // IX. التنبيهات والتحذيرات القانونية
  legalAlerts?: {
    alert_CannotCertifyRegisteredProperty?: boolean;
    alert_CannotCertifyStateProperty?: boolean;
    alert_CannotCertifyWaqfProperty?: boolean;
    alert_NotaryLiabilityForErrors?: boolean;
    alert_DocumentationDiffersFromTitle?: boolean;
    customAlerts?: string[];
  };

  // X. القوانين المنظمة للشهادة
  governingLaws?: {
    realRightsCode?: boolean;
    waqfCode?: boolean;
    landRegistrationLaw?: boolean;
    lafafLaw?: boolean;
    caseLaw?: boolean;
    malikiJurisprudence?: boolean;
    ministryCirculars?: boolean;
    officialReferences?: string;
    officialMinistryReferences?: string;
  };

  // XI. النتيجة والتوجيه
  outcome?: {
    status?: 'مقبول_للاستكمال' | 'مؤجل_لطلب_شواهد' | 'مرفوض_منع_قانوني' | 'تحويل_لمطلب_تحفيظ' | 'تحويل_لدعوى_قضائية' | '';
    reason?: string;
    nextSteps?: string;
    autoRedirect?: boolean;
    redirectTarget?: string;
  };

  // Legacy Fields
  possessorRole?: 'حائز' | 'مالك' | 'وارث' | 'منتفع' | 'مدير_دار' | 'غير_ذلك' | '';
  possessionForSelfOrCapacity?: 'لنفسه' | 'بصفته' | '';
  isHeir?: boolean;
  possessionOriginModes?: ('إرث' | 'وصية' | 'بيع' | 'مقاسمة' | 'حوز' | 'غير_ذلك')[];
  knowledgeMethod?: string;
  possessedPropertyKind?: 'أرض_فلاحية' | 'أرض_عارية' | 'دار' | 'محل' | 'عمارة' | 'مزرعة' | 'أرض_مشاعة' | 'أرض_في_مدشر' | 'ملك_محفظ' | 'ملك_غير_محفظ' | 'في_طور_التحفيظ' | '';
  customaryPropertyName?: string;
  hasCoordinates?: boolean;
  coordinatesDescription?: string;
  fourBoundariesDescription?: string;
  areaDescription?: string;
  supportingDocuments?: string;
  isRegisteredProperty?: boolean;
  hasOpposition?: boolean;
  hasRegistrationApplication?: boolean;
  isWaqfProperty?: boolean;
  possessionClassification?: ('حيازة_تصرفية' | 'حيازة_استحقاقية' | 'حيازة_وضع_يد' | 'حيازة_ناتجة_عن_إرث' | 'حيازة_ناتجة_عن_مقاسمة_عرفية' | 'حيازة_ناتجة_عن_بيع_شفوي' | 'حيازة_ناتجة_عن_وصية' | 'حيازة_مع_نزاع' | 'حيازة_بدون_نزاع')[];
  exploitationActs?: {
    ploughing?: boolean;
    planting?: boolean;
    habitation?: boolean;
    construction?: boolean;
    rentingOut?: boolean;
    harvesting?: boolean;
    repairs?: boolean;
  };
  administrationActs?: {
    sellingCrops?: boolean;
    collectingRent?: boolean;
    performingRepairs?: boolean;
  };
  evidentiaryIndicators?: {
    waterContracts?: boolean;
    electricityContracts?: boolean;
    buildingPermits?: boolean;
    neighborsCertificates?: boolean;
    communityCertificates?: boolean;
  };
  attributesPropertyToSelf?: boolean;
  peopleAttributePropertyToHim?: boolean;
  hasDisputes?: boolean;
  hasPreviousLawsuits?: boolean;
  possessorCategory?: 'أجنبي_غير_شريك' | 'قريب' | 'قريب_مع_عداوة' | 'شريك' | '';
  yearsOfPossession?: number;
  possessionOrigin?: 'أصلية' | 'موروثة' | 'مشتراة' | '';
  hasTackedPeriods?: boolean;
  isStateProperty?: boolean;
  isWaqfDomain?: boolean;
  isCollectiveDomain?: boolean;
  isMunicipalDomain?: boolean;
  isRegisteredDomain?: boolean;
  smartScenarios?: {
    isPropertyRegistered?: boolean;
    isPropertyWaqf?: boolean;
    isPropertyInherited?: boolean;
    inheritanceDateKnown?: boolean;
    hasCustomPartition?: boolean;
    hasExchangeContract?: boolean;
    wasLoan?: boolean;
    wasPartnership?: boolean;
  };
  caseLawNotes?: string;
  applyPossessionAsStrongEvidence?: boolean;
  applyTackingRule?: boolean;
  distinguishLoanFromPossession?: boolean;
  alerts?: {
    differenceBetweenPossessionAndUse?: boolean;
    interruptionOfPossession?: boolean;
    noPossessionBetweenSpousesAndAscendants?: boolean;
  };
  legalFrameworkNotes?: string;
  [key: string]: any;
}

// Extended Types for PromiseToSell (رسم وعد بالبيع العقاري)
export interface PromiseToSellPartyInfo {
  id?: string;
  isLegalEntity?: boolean;
  fullName?: string;
  nameLatin?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: 'مغربي' | 'أجنبي' | string;
  idNumber?: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  profession?: string;
  address?: string;
  maritalStatus?: string;
  matrimonialRegime?: string;
  relationToProperty?: 'مالك' | 'وصي' | 'ممثل_قانوني' | 'قريب' | 'محايد' | string;
  isCapable?: boolean;
  shareFraction?: string; // e.g. "1/1", "1/2", "3/8", "25%"
  shareNumeric?: number; // percentage e.g. 50
  ownershipDeedRef?: string;
  // Legal entity specifics
  companyName?: string;
  companyForm?: string; // SARL, SA, etc.
  rcNumber?: string;
  ice?: string;
  headquarters?: string;
  legalRepresentativeName?: string;
  legalRepresentativeCapacity?: string;
  legalRepresentativeDocRef?: string;
}

export interface PromiseToSellPropertyDetails {
  propertyStatus?: 'محفظ' | 'غير_محفظ' | 'طور_التحفيظ' | 'مطلب_تحفيظ' | '';
  // Registered Property (عقار محفظ)
  titleNumber?: string;
  titleSuffix?: string; // نظير / مكرر
  landRegistryOffice?: string; // المحافظة العقارية
  propertyName?: string; // اسم الملك
  landCertificateNumber?: string;
  landCertificateDate?: string;
  landCertificateIssuedDate?: string;
  hasLandCertificateAttached?: boolean;
  // Unregistered Property (عقار غير محفظ)
  originDeedType?: 'إرث' | 'شراء_سابق' | 'هبة' | 'صدقة' | 'قسمة' | 'حيازة' | 'ملكية_قديمة' | 'أخرى' | '';
  originDeedNumber?: string;
  originDeedDate?: string;
  originDeedAuthority?: string;
  originDeedBook?: string;
  originDeedLetter?: string;
  originDeedPage?: string;
  originDeedCount?: string;
  originCourtNotary?: string;
  originalOwnerName?: string;
  acquisitionMode?: string;
  acquisitionDate?: string;
  // Under Inscription / Requisition (طور التحفيظ)
  requisitionNumber?: string;
  requisitionDate?: string;
  requisitionApplicantName?: string;
  requisitionStatus?: string;
  hasRequisitionOppositions?: boolean;
  requisitionOppositionsDetails?: string;
  // Location & Spatial
  region?: string;
  province?: string;
  commune?: string;
  caidat?: string;
  circle?: string;
  neighborhoodOrDouar?: string;
  exactAddress?: string;
  // Area & Measurements
  areaTotal?: number;
  areaUnit?: 'متر_مربع' | 'هكتار' | 'آر' | 'سنتيار' | string;
  areaInWords?: string;
  // Boundaries
  boundaryNorth?: string;
  boundarySouth?: string;
  boundaryEast?: string;
  boundaryWest?: string;
  additionalBoundaries?: Array<{ id: string; direction: string; neighborDescription: string }>;
  // Components (مكونات العقار)
  components?: Array<{
    id: string;
    nature: string; // أرض، منزل، شقة، محل، مرآب...
    area?: string;
    description?: string;
    boundaries?: string;
    references?: string;
  }>;
  // Subject Share
  isFullProperty?: boolean;
  subjectShareFraction?: string; // e.g. "1/2" or "كامل الملك"
  subjectShareFractionInWords?: string;
  subjectSharePercentage?: number;
}

export interface PromiseToSellPaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  amountInWords?: string;
  paymentMethod: 'نقد' | 'تحويل_بنكي' | 'شيك_بنكي' | 'شيك_مضمون' | 'وديعة_لدى_العدل' | 'أخرى';
  dueDate: string;
  paidDate?: string;
  reference?: string; // رقم الشيك، رقم التحويل
  bankName?: string;
  recipientEntity?: string;
  status: 'مؤدى' | 'مستحق' | 'معلق';
  notes?: string;
}

export interface PromiseToSellSuspensiveCondition {
  id: string;
  type: 'قرض_بنكي' | 'رفع_رهن' | 'تسوية_وضعية' | 'وثيقة_إدارية' | 'ترخيص_تجزئة' | 'أداء_باقي_الثمن' | 'أخرى';
  conditionText: string;
  status: 'معلق' | 'متحقق' | 'غير_متحقق';
  fulfillmentDeadline?: string;
  consequenceOfBreach?: string;
}

export interface PromiseToSellEncumbranceItem {
  id: string;
  type: string; // رهن رسمي، حجز تحفظي، حق ارتفاق...
  beneficiary: string;
  date: string;
  amount?: number;
  reference: string;
  liftingStatus: 'مرفوع' | 'قيد_الرفع' | 'شرط_للبيع_النهائي' | 'متحمل_من_المشتري';
}

export interface PromiseToSellAuditEntry {
  timestamp: string;
  notaryOrUser: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
}

// PromiseToSell Type (رسم وعد بالبيع)
export interface PromiseToSell {
  // 1. Preliminary Qualification (التكييف القانوني الأولي)
  preliminaryQualification?: {
    promiseNature?: 'وعد_بالبيع_العقاري' | 'وعد_مشروط' | 'وعد_ملزم_لجانب_واحد' | 'وعد_متبادل' | 'وعد_معلق_على_شرط_واقف' | 'وعد_آخر' | '';
    isRealEstateSubject?: boolean;
    deedFormat?: 'محرر_رسمي' | 'محرر_ثابت_التاريخ' | 'محرر_سابق' | '';
    isLaw41_24Compliant?: boolean;
  };

  // 2. Multi-Parties Extensions
  promisors?: PromiseToSellPartyInfo[]; // الواعدون بالبيع
  promisees?: PromiseToSellPartyInfo[]; // الموعود لهم بالشراء
  multiplePromisorsStructure?: {
    isJointOwnership?: boolean;
    distributionType?: 'بالتساوي' | 'حسب_حصص_محددة' | 'على_الشياع' | '';
  };
  multiplePromiseesStructure?: {
    isMultipleBuyers?: boolean;
    devolutionUponFinalSale?: 'بالتساوي' | 'حسب_حصص_محددة' | 'على_الشياع' | 'حسب_بيان_خاص' | '';
  };

  // 3. Extended Property Details
  propertyDetails?: PromiseToSellPropertyDetails;

  // 4. Detailed Pricing & Payment
  financeDetails?: {
    totalPrice?: number;
    totalPriceInWords?: string;
    earnestAmount?: number; // العربون / المؤدى
    earnestAmountInWords?: string;
    earnestDate?: string;
    earnestPaymentMethod?: 'نقد' | 'تحويل_بنكي' | 'شيك_بنكي' | 'شيك_مضمون' | 'وديعة_لدى_العدل' | 'أخرى' | '';
    earnestReference?: string;
    earnestBankName?: string;
    remainingAmount?: number; // الباقي
    remainingAmountInWords?: string;
    remainingDueDate?: string;
    manualRemainingReason?: string;
    selectedPaymentMethods?: string[]; // Multiple selection checkboxes
    hasInstallments?: boolean;
    installments?: PromiseToSellPaymentInstallment[];
    earnestRule?: 'خصم_عند_البيع_أو_فقده_عند_النكول' | 'مسترد_في_حال_عدم_تحقق_الشرط' | 'مزدوج_المادة_586_ق_ل_ع' | '';
    penaltyClauseText?: string;
  };

  // 5. Final Sale Deadline & Conditions
  finalSaleDeadline?: {
    type?: 'تاريخ_محدد' | 'أجل_بالأيام_أو_الأشهر' | 'مرتبط_بشرط' | 'إجراء_إداري' | 'رفع_مانع_عقاري' | 'تمويل_بنكي' | 'غير_محدد' | '';
    specificDate?: string;
    periodNumber?: number;
    periodUnit?: 'أيام' | 'أشهر' | 'سنوات';
    startDate?: string;
    endDate?: string;
    conditionText?: string;
  };

  suspensiveConditions?: PromiseToSellSuspensiveCondition[];
  encumbrances?: {
    hasEncumbrances?: 'نعم' | 'لا' | 'غير_معلوم' | '';
    isLiftingConditionForSale?: boolean;
    items?: PromiseToSellEncumbranceItem[];
  };

  // 6. Chain of Title, Registration & Stamps
  chainOfDeeds?: Array<{
    id: string;
    type: string;
    number?: string;
    date?: string;
    authority?: string;
    book?: string;
    letter?: string;
    page?: string;
    count?: string;
    courtNotary?: string;
  }>;

  registrationInfo?: {
    status?: 'لم_يسجل_بعد' | 'سيتم_تسجيله' | 'تم_التسجيل' | 'يحتاج_تحققا' | '';
    taxOffice?: string;
    receiptNumber?: string;
    registrationDate?: string;
    paymentRef?: string;
    amount?: number;
    notes?: string;
  };

  stampDutyInfo?: {
    dutyType?: string;
    reference?: string;
    paymentNumber?: string;
    paymentDate?: string;
    amount?: number;
    proofDocument?: string;
    status?: 'مكتمل' | 'مستورد' | 'يحتاج_تحققا' | '';
  };

  documentsPortfolio?: Array<{
    id: string;
    type: string;
    number?: string;
    date?: string;
    issuer?: string;
    complianceStatus: 'مكتمل' | 'يحتاج_مراجعة' | 'غير_متوفر';
  }>;

  // 7. Legal Check & Intelligent Verification
  legalCheckData?: {
    isIdentityComplete?: boolean;
    isPropertyComplete?: boolean;
    isPriceMatchComplete?: boolean;
    isSharesValid?: boolean;
    isLaw41FormatValid?: boolean;
    hasPendingSuspensiveConditions?: boolean;
    hasEncumbrancesWarning?: boolean;
    hasUnregisteredWarning?: boolean;
    hasRequisitionWarning?: boolean;
    fatalErrors?: string[];
    reviewNotes?: string[];
  };

  intelligentQuestionAnswer?: 'نعم' | 'يحتاج_استكمال' | 'يحتاج_مراجعة_قانونية' | '';
  dataFrozenForDrafting?: boolean;
  auditTrail?: PromiseToSellAuditEntry[];

  // Legacy fields preserved for backward compatibility
  seller?: {
    fullName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    idNumber?: string;
    address?: string;
    relationToProperty?: 'مالك' | 'وصي' | 'ممثل_قانوني' | '';
    isCapable?: boolean;
  };
  buyer?: {
    fullName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    idNumber?: string;
    address?: string;
    relationToProperty?: 'قريب' | 'وصي' | 'محايد' | '';
    isCapable?: boolean;
  };
  property?: {
    propertyType?: 'حضري' | 'فلاحي' | 'تجاري' | '';
    address?: string;
    registryOrDeed?: string;
    boundaries?: string;
    area?: string;
    totalValue?: number;
    encumbrances?: string;
    status?: 'مؤجر' | 'محبس' | 'مرهون' | 'حر' | '';
    isShared?: boolean;
    hasWill?: boolean;
  };
  promiseTerms?: {
    earnestMoney?: number;
    totalPrice?: number;
    paymentMethod?: 'نقد' | 'تحويل_بنكي' | 'شيك' | '';
    finalDeadline?: string;
    terminationCondition?: string;
    sellerGuarantees?: string;
    agentAuthority?: string;
  };
  agent?: {
    name?: string;
    authorizationDate?: string;
    authorizationScope?: string;
    authorizingParty?: string;
    isTimeLimited?: boolean;
    expiryDate?: string;
  };
  witnesses?: {
    witnessNames?: string;
    witnessResidences?: string;
    signaturesUploaded?: boolean;
  };
  smartChecks?: {
    deadlineExceeded?: boolean;
    earnestNotPaid?: boolean;
    propertyEncumbered?: boolean;
    minorInvolved?: boolean;
    valuationMismatch?: boolean;
    agentAuthorityExpired?: boolean;
  };
  smartAnswers?: {
    sellerCapable?: boolean;
    buyerCapable?: boolean;
    requiresGuardian?: boolean;
    hasGuardian?: boolean;
    earnestRefundable?: boolean;
    buyerBreachLosesEarnest?: boolean;
  };
}

// ============================================================================
// PROMISE TO LEASE DEED (رسم وعد بالكراء) - Law 67.12, Law 49.16, DOC Art. 14
// ============================================================================

export interface PromiseToLeasePartyInfo {
  id: string;
  isLegalEntity: boolean;
  partyType?: 'طبيعي' | 'معنوي_مغربي' | 'معنوي_أجنبي';
  // Natural Person
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  idType?: 'بطاقة_تعريف_وطنية' | 'جواز_سفر' | 'بطاقة_إقامة' | 'أخرى';
  idNumber?: string;
  idIssueDate?: string;
  address?: string;
  profession?: string;
  maritalStatus?: string;
  capacity?: 'مالك' | 'صاحب_حق_انتفاع' | 'مالك_على_الشياع' | 'وكيل_خاص' | 'ممثل_قانوني' | 'طرف_مباشر';
  shareFraction?: string;
  shareNumeric?: number;
  // Legal Entity
  companyName?: string;
  companyForm?: string; // SARL, SA, SAS, SNC, إلخ
  rcNumber?: string;
  rcCity?: string;
  ice?: string;
  taxId?: string;
  headquarters?: string;
  capital?: number;
  legalRepresentativeName?: string;
  legalRepresentativeCapacity?: string;
  legalRepresentativeCin?: string;
  representationDocumentType?: string;
  representationDocumentRef?: string;
  representationDocumentDate?: string;
}

export interface PromiseToLeaseSuspensiveCondition {
  id: string;
  type: 'رخصة_إدارية' | 'أشغال_تهيئة' | 'إفراغ_مكتري_سابق' | 'موافقة_شريك_أو_بنك' | 'تمويل_بنكي' | 'أخرى';
  conditionText: string;
  status: 'معلق' | 'تحقق' | 'لم_يتحقق';
  fulfillmentDeadline?: string;
  consequenceOfBreach?: string;
}

export interface PromiseToLeaseDeed {
  // 1. Initial Qualification (نقطة البداية والتكييف)
  intendedOperation: 'وعد_بالكراء' | 'عقد_كراء' | 'تجديد_كراء' | 'وعد_متبادل' | 'أخرى';
  promiseNature: 'وعد_من_جانب_واحد' | 'وعد_متبادل' | 'اتفاق_تمهيدي_مشروط' | 'وعد_مع_خيار_الموعود_له';

  // 2. Parties
  promisors: PromiseToLeasePartyInfo[]; // الواعدون بالكراء
  promisees: PromiseToLeasePartyInfo[]; // الموعود لهم بالكراء
  promisorsJointOwnership?: {
    isJoint: boolean;
    distributionType?: 'بالتساوي' | 'حسب_الأنصبة' | 'على_الشياع';
  };
  promiseesJoint?: {
    isJoint: boolean;
    futureDistribution?: 'بالتساوي' | 'حسب_الأنصبة' | 'تضامني';
  };

  // 3. Subject Property / Premises (المحل الموعود بكرائه)
  propertyDetails: {
    premisesType: 'شقة' | 'فيلا' | 'محل_تجاري' | 'مكتب_مهني' | 'مستودع_هنجار' | 'أرض_عارية' | 'جزء_مفرز' | 'عقار_كامل' | 'أخرى';
    propertyStatus: 'محفظ' | 'طور_التحفيظ' | 'غير_محفظ' | 'ملكية_مشتركة';
    titleNumber?: string;
    titleIndex?: string;
    requisitionNumber?: string;
    propertyName?: string;
    exactAddress: string;
    city?: string;
    district?: string;
    areaSquareMeters?: number;
    componentsAndDesignation: string; // مشتملات المحل ومواصفاته
    isEntireProperty: boolean; // هل المحل هو كامل العقار أم جزء منه
    partSpecification?: {
      partNumber?: string;
      floorNumber?: string;
      boundariesDescription?: string;
      sharesInCommonParts?: string;
    };
  };

  // 4. Lease Purpose & Legal Regime (الغرض والنظام القانوني)
  leasePurpose: 'سكنى' | 'مهني' | 'تجاري' | 'صناعي' | 'حرفي' | 'تعليمي' | 'صحي' | 'فندقي' | 'آخر';
  leasePurposeDetails?: string;
  legalRegime: 'قانون_67.12' | 'قانون_49.16' | 'قواعد_عامة_ق_ل_ع' | 'نظام_خاص_أملاك_الدولة_أو_الأحباس';
  isCommercialGoodwillIncluded?: boolean; // هل الكراء يشمل أصلاً تجارياً أم الجدران فقط
  commercialActivityType?: string; // نوع النشاط التجاري / المهني

  // 5. Future Lease Terms (شروط عقد الكراء المزمع إبرامه)
  futureLeaseTerms: {
    rentAmount: number; // السومة الكرائية المتفق عليها
    rentAmountInWords: string;
    periodicity: 'شهري' | 'ربع_سنوي' | 'نصف_سنوي' | 'سنوي';
    paymentMethod: 'تحويل_بنكي' | 'شيك_بنكي' | 'نقد' | 'خصم_أوتوماتيكي' | 'أخرى';
    paymentDayInPeriod?: string; // يوم الأداء
    leaseDuration: string; // مدة الكراء المزمع
    isRenewable: boolean;
    renewalTerms?: string;
    potentialStartDate?: string; // تاريخ السريان المحتمل للكراء
    // Charges and Utilities
    chargesDistribution: {
      waterElectricity: 'المكتري' | 'المكري' | 'مناصفة' | 'حسب_العداد';
      syndicFees: 'المكتري' | 'المكري' | 'مناصفة' | 'غير_مشمول';
      cleaningAndGuarding: 'المكتري' | 'المكري' | 'مناصفة';
      communalServicesTax: 'المكتري' | 'المكري' | 'حسب_القانون'; // رسم الخدمات الجماعية
    };
    chargesNotes?: string;
    // Rent Review (مراجعة السومة الكرائية - قانون 07.03)
    rentReview: {
      hasReview: boolean;
      reviewBasis: 'قانون_07.03' | 'نسبة_اتفاقية' | 'بدون_مراجعة';
      reviewPercentage?: number; // 8% للسكنى، 10% للتجاري، أو اتفاقي
      reviewIntervalYears?: number; // كل 3 سنوات
    };
    // Subletting and Assignment
    sublettingAllowed: 'ممنوع_مطلقاً' | 'مشروط_بموافقة_كتابية' | 'مسموح_به';
  };

  // 6. Promise Deadlines & Execution Options (أجل الوعد وشروط التفعيل)
  promiseDeadlines: {
    deadlineType: 'تاريخ_محدد' | 'أجل_بالأيام_أو_الأشهر' | 'مرتبط_بشرط';
    specificDeadlineDate?: string;
    periodNumber?: number;
    periodUnit?: 'أيام' | 'أشهر' | 'سنوات';
    expiryConsequence: 'سقوط_الوعد_تلقائياً' | 'تجديد_باتفاق_كتابي' | 'إعمال_الشرط_الجزائي' | 'فقدان_العربون_أو_استرداده';
    optionExerciseMethod?: 'إشعار_كتابي' | 'إنذار_مفوض_قضائي' | 'حضور_مجلس_العقد_مباشرة' | 'مراسلة_مضمونة';
  };

  // 7. Financial Guarantees, Advance & Penalty Clause (الجانب المالي والضمانات)
  financialGuarantees: {
    hasFinancialDeposit: 'لا' | 'عربون' | 'تسبيق_من_الوجيبة' | 'وديعة_ضمان_مسبقة';
    amount?: number;
    amountInWords?: string;
    paymentDate?: string;
    paymentMethod?: string;
    paymentReference?: string;
    bankName?: string;
    breachRule: 'تطبيق_الفصل_288_290_قلع' | 'استرداد_كامل_دون_تعويض' | 'فقدان_المبلغ_لصالح_الواعد' | 'مضاعفة_المبلغ_إذا_نكل_الواعد';
    hasPenaltyClause: boolean;
    penaltyClauseAmount?: number;
    penaltyClauseText?: string;
  };

  // 8. Suspensive Conditions (الشروط الواقفة والالتزامات السابقة)
  suspensiveConditions?: PromiseToLeaseSuspensiveCondition[];

  // 9. Current Occupancy and Delivery (حالة المحل والتسليم)
  occupancyAndDelivery: {
    currentStatus: 'فارغ' | 'شاغل_من_المالك' | 'مكتري_حالي_يلتزم_بالإفراغ' | 'أشغال_جارية';
    expectedHandoverDate?: string;
    conditionAtHandover: 'جاهز_للاستعمال' | 'يحتاج_إصلاحات_على_عاتق_المكري' | 'تهيئة_على_عاتق_المكتري';
    handoverInventoryAgreed: boolean;
  };

  // 10. Legal Authority and Decree 2.23.101 (الصفة والتمثيل)
  authorityAndRepresentation: {
    promisorCapacityBasis: 'سند_الملكية' | 'وكالة_رسمية' | 'قرار_مجلس_إداري' | 'إذن_قضائي_للنائب_الشرعي' | 'أخرى';
    poaReference?: string;
    poaDate?: string;
    poaNotaryOrAuthority?: string;
    isVerifiedUnderDecree2_23_101: boolean;
  };

  // 11. Critical Existence Test (الاختبار الحاسم: هل هو وعد أم كراء قائم؟)
  criticalExecutionTest: {
    hasKeysBeenHandedOver: 'نعم' | 'لا';
    hasTenantOccupiedPremises: 'نعم' | 'لا';
    hasRentBeenPaidForActivePeriod: 'نعم' | 'لا';
  };

  // 12. Pre-Reception Verification Gate Linkage
  isPreReceptionVerified?: boolean;
  preReceptionNotes?: string;
}

// ============================================================================
// SALE PERSON DEED (رسم البيع والشراء – الشخص الطبيعي/العادي)
// ============================================================================

export interface SalePartyPOAInfo {
  court?: string;
  registryBook?: string;
  letter?: string;
  page?: string;
  count?: string;
  date?: string;
  notary?: string;
  poaNature?: 'خاصة' | 'عامة' | 'حقوق_عينية' | 'أخرى';
  isRealEstatePoa?: boolean;
  localRegistryInfo?: {
    court?: string;
    registrationDate?: string;
    localRegistryNumber?: string;
    chronologicalNumber?: string;
    analyticalNumber?: string;
    certificateDate?: string;
    status?: 'مقيدة' | 'معدلة' | 'ملغاة' | 'تحتاج_تحقق' | '';
  };
  agentFullName?: string;
  agentCin?: string;
  agentAddress?: string;
  agentPhone?: string;
}

export interface SalePersonPartyInfo {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: 'مغربي' | 'اجنبي' | '';
  profession?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  idIssueDate?: string;
  idIssuedBy?: string;
  maritalStatus?: string;
  share?: string;
  shareFraction?: string;
  sharePercentage?: number;
  capacity?: 'مالك' | 'شريك_على_الشياع' | 'وارث' | 'مشتري';
  representationMode: 'شخصي' | 'وكيل' | 'ممثل_قانوني';
  poaInfo?: SalePartyPOAInfo;
  isLegalEntityAttempt?: boolean;
}

export interface SaleEncumbranceItem {
  id: string;
  encumbranceType: 'رهن_رسمي' | 'حجز_تحفظي' | 'حجز_تنفيذي' | 'حق_ارتفاق' | 'حق_انتفاع' | 'حق_سكنى' | 'تقييد_احتياطي' | 'تعرض' | 'شرط_خاص' | 'منع_من_التصرف' | 'حق_عيني_آخر';
  beneficiary: string;
  date?: string;
  reference?: string;
  impactOnSale?: string;
  resolutionChoice: 'رفع_قبل_البيع' | 'رفع_بالتزامن' | 'بقاء_التحمل' | 'موافقة_صاحب_الحق' | 'تحقق_قانوني' | 'إيقاف_مؤقت';
  type?: string;
  description?: string;
  status?: string;
}

export interface SaleTitleChainItem {
  id: string;
  deedType: string;
  deedDate?: string;
  previousOwner?: string;
  reference?: string;
  court?: string;
  notary?: string;
  book?: string;
  letter?: string;
  page?: string;
  count?: string;
  transferNature?: string;
}

export interface SaleAdminCertificateItem {
  id: string;
  type: string;
  number?: string;
  date?: string;
  issuedBy?: string;
}

export interface SalePersonPropertyDetails {
  propertyStatus: 'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ' | 'حالة_خاصة' | '';
  propertyType?: 'أرض' | 'دار' | 'شقة' | 'محل_تجاري' | 'فيلا' | 'أرض_فلاحية' | 'عقار_مبني' | 'ملكية_مشتركة' | 'عقار_آخر' | '';
  titleNumber?: string;
  landRegistryOffice?: string;
  registeredOwners?: string;
  registeredShares?: string;
  lastOwnershipCertDate?: string;
  ownershipCertRef?: string;
  isCoOwnership?: boolean;
  coOwnershipUnitNumber?: string;
  coOwnershipFloor?: string;
  coOwnershipApartmentNumber?: string;
  coOwnershipUnitArea?: number;
  coOwnershipCommonPartsShare?: string;
  coOwnershipBylawRef?: string;
  requisitionNumber?: string;
  requisitionDate?: string;
  requisitionApplicant?: string;
  requisitionStatus?: string;
  hasOppositions?: 'نعم' | 'لا' | '';
  oppositionsDetails?: string;
  originDeedType?: string;
  originDeedDate?: string;
  originDeedSource?: string;
  originDeedCourt?: string;
  originDeedBook?: string;
  originDeedLetter?: string;
  originDeedPage?: string;
  originDeedCount?: string;
  originDeedNotary?: string;
  originDeedNature?: 'أصلي' | 'ناقل_للحق' | '';
  acquisitionMethod?: string;
  commune?: string;
  district?: string;
  neighborhood?: string;
  douar?: string;
  street?: string;
  buildingNumber?: string;
  exactAddress?: string;
  areaNumber?: number;
  areaUnit?: 'متر_مربع' | 'هكتار' | 'آر' | 'سنتيار' | 'ذراع' | 'قدم';
  areaInWords?: string;
  boundaries?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  components?: string;
  treesAndPlantations?: string;
  buildingsAndInstallations?: string;
  waterAndPassageRights?: string;
  easementsOrDisclosedRights?: string;
  titleName?: string;
  conservationOffice?: string;
  location?: string;
  titleOriginDeed?: string;
  titleOriginReferences?: string;
}

export interface SalePaymentInstallment {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  paymentMethod: string;
  reference?: string;
  recipient?: string;
  notes?: string;
}

export interface SaleFinanceDetails {
  totalPrice?: number;
  totalPriceInWords?: string;
  paymentMethods?: string[];
  hasEarnest?: boolean;
  earnestAmount?: number;
  earnestAmountInWords?: string;
  earnestDate?: string;
  earnestPaymentMethod?: string;
  earnestReference?: string;
  earnestBank?: string;
  remainingAmount?: number;
  remainingAmountInWords?: string;
  remainingDueDate?: string;
  hasInstallments?: boolean;
  installments?: SalePaymentInstallment[];
  hasInKindExchange?: boolean;
  inKindNature?: string;
  inKindValue?: number;
  inKindTitleOrigin?: string;
  inKindLegalStatus?: string;
  inKindNeedsIndependentDeed?: boolean;
  hasDeferredPayment?: boolean;
  deferredDueDate?: string;
  deferredConditions?: string;
}

export interface SaleDeadlinesAndSpecialTerms {
  hasAgreedDeadline?: boolean;
  dueDate?: string;
  deadlineNature?: string;
  failureConsequences?: string;
  specialConditions?: Array<{
    id: string;
    type: 'أداء' | 'تسليم' | 'رفع_تحمل' | 'وثيقة' | 'إجراء_إداري' | 'إجراء_عقاري' | 'آخر';
    description: string;
    isBindingLegal: boolean;
  }>;
}

export interface SaleTaxAndDutiesInfo {
  registrationStatus?: 'معفى' | 'خاضع' | 'مؤدى' | 'قيد_الأداء' | '';
  registrationOffice?: string;
  receiptNumber?: string;
  paymentDate?: string;
  amount?: number;
  stampDutyAmount?: number;
  stampDutyRef?: string;
  notes?: string;
}

export interface SalePersonAuditEntry {
  timestamp: string;
  user: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface SalePersonDeed {
  disposalType: 'بيع' | 'شراء';
  intakeDate?: string;
  intakePlace?: string;
  court?: string;
  section?: string;
  notaryPrimary?: string;
  notarySecondary?: string;
  internalFileNumber?: string;
  deedStatus: 'قيد_الإدخال' | 'يحتاج_مراجعة' | 'مستوف' | 'جاهز_للتحرير' | 'متوقف_قانونيا_أو_تقنيا';
  sellers: SalePersonPartyInfo[];
  buyers: SalePersonPartyInfo[];
  isJointSellers?: boolean;
  buyersDevolutionType?: 'سويا' | 'أنصبة_مفرزة' | 'على_الشياع' | '';
  property: SalePersonPropertyDetails;
  titleChain: SaleTitleChainItem[];
  hasEncumbrances?: 'نعم' | 'لا' | '';
  encumbrances: SaleEncumbranceItem[];
  finance: SaleFinanceDetails;
  terms: SaleDeadlinesAndSpecialTerms;
  certificates: SaleAdminCertificateItem[];
  taxAndDuty: SaleTaxAndDutiesInfo;
  legalCheckData?: {
    isPartiesValid?: boolean;
    isSharesBalanced?: boolean;
    isPropertyValid?: boolean;
    isEncumbrancesResolved?: boolean;
    isPriceWordsMatching?: boolean;
    isPaymentBalanced?: boolean;
    isPoaCompliant?: boolean;
    allChecksPassed?: boolean;
    fatalErrors?: string[];
    reviewNotes?: string[];
  };
  reviewDecision?: 'جاهز_للتحرير' | 'يحتاج_مراجعة' | 'متوقف' | '';
  auditTrail?: SalePersonAuditEntry[];
}

// ============================================================================
// Legal Entity Real Estate Purchase (رسم شراء عقار لفائدة شخص معنوي)
// ============================================================================

export type LegalEntityNature =
  | 'شركة_تجارية'
  | 'تعاونية'
  | 'جمعية'
  | 'مؤسسة_أو_هيئة_عامة'
  | 'شخص_معنوي_آخر'
  | 'شخص_معنوي_أجنبي';

export type CommercialCompanySubtype =
  | 'SARL'
  | 'SA'
  | 'SAS'
  | 'SNC'
  | 'شركة_توصية_بسيطة'
  | 'شركة_توصية_بالأسهم'
  | 'أخرى';

export type LegalEntityStatus =
  | 'نشط'
  | 'في_طور_التصفية'
  | 'تحت_مسطرة_قضائية'
  | 'مشطوب'
  | 'أخرى';

export interface LegalEntityRepresentationHistoryItem {
  id: string;
  period: string;
  representativeName: string;
  capacity: string;
  source: string;
}

export interface LegalEntityBuyerInfo {
  entityNature: LegalEntityNature;
  companySubtype?: CommercialCompanySubtype;
  legalName: string;
  commercialName?: string;
  legalForm: string;
  headquarters: string;
  city: string;
  country: string;
  rcNumber: string;
  rcCourt: string;
  ice: string;
  ifNumber?: string;
  creationDate?: string;
  corporatePurpose: string;
  purposeCompliance: 'نعم' | 'تحتاج_مراجعة' | 'يوجد_تعارض_ظاهر';
  legalStatus: LegalEntityStatus;
  statusNotes?: string;
  foreignDetails?: {
    countryOfOrigin?: string;
    originalLegalName?: string;
    foreignRegistrationNumber?: string;
    foreignHeadquarters?: string;
    hasApostilleOrLegalization?: boolean;
    hasSwornTranslation?: boolean;
    foreignDocumentsNotes?: string;
  };
  liquidationDetails?: {
    liquidatorAppointmentDoc?: string;
    appointmentDate?: string;
    authorityLimits?: string;
    liquidationStatus?: string;
    hasPurchaseAuthorization?: boolean;
  };
  judicialProceedingsDetails?: {
    proceedingType?: string;
    court?: string;
    caseNumber?: string;
    judgmentDate?: string;
    judicialReceiverName?: string;
    authorityLimits?: string;
    requiresSpecialCourtOrder?: boolean;
  };
  specialApproval?: {
    requiresSpecialApproval?: 'نعم' | 'لا' | 'يحتاج_مراجعة';
    authorityType?: string;
    meetingDate?: string;
    minutesNumber?: string;
    approvalSubject?: string;
    authorizedRepresentative?: string;
    authorizationLimits?: string;
    isMatchingOperation?: boolean;
  };
  documentsChecklist?: {
    hasRecentRCModel7?: boolean;
    hasUpdatedBylaws?: boolean;
    hasRepresentativeProof?: boolean;
    hasGAMinutes?: boolean;
    hasJudicialRecordCert?: boolean;
    hasNonBankruptcyCert?: boolean;
    hasCoopApproval?: boolean;
    hasAssociationReceipt?: boolean;
    hasForeignApostille?: boolean;
    [docKey: string]: boolean | undefined;
  };
  representationHistory?: LegalEntityRepresentationHistoryItem[];
}

export interface LegalEntityRepresentativeInfo {
  id: string;
  fullName: string;
  cin: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  capacity: 'مسير' | 'رئيس' | 'مدير_عام' | 'عضو_مجلس_إدارة' | 'مصف' | 'وكيل_بتوكيل_خاص' | 'وكيل_بتوكيل_عام' | 'مفوض_بالتوقيع' | 'آخر';
  capacityStartDate?: string;
  capacityDuration?: string;
  authoritySource: 'القانون' | 'النظام_الأساسي' | 'التعيين' | 'قرار_الهيئة_المختصة' | 'وكالة' | 'تفويض' | 'حكم_أو_قرار_قضائي' | 'مصدر_آخر';
  authorityDocNumber?: string;
  authorityDocDate?: string;
  isCapacityValid: 'نعم' | 'تحتاج_تحقق' | 'غير_ثابتة';
  representationMode: 'منفرد' | 'مجتمع' | 'توقيع_مشترك' | 'تفويض_خاص' | 'حسب_النظام_الأساسي' | 'حسب_قرار_الهيئة';
  secondRepresentative?: {
    fullName?: string;
    cin?: string;
    capacity?: string;
    dateOfBirth?: string;
    address?: string;
  };
  poaChain?: {
    hasSubAgent?: boolean;
    agentFullName?: string;
    agentCin?: string;
    agentAddress?: string;
    poaDeedBook?: string;
    poaDeedNumber?: string;
    poaDeedPage?: string;
    poaDeedDate?: string;
    poaCourt?: string;
    isRealEstatePoa?: boolean;
    localRegistryNumber?: string;
    localRegistryCourt?: string;
    localRegistryDate?: string;
    scopeCompliant?: boolean;
  };
}

export interface SaleEntityDeed {
  disposalType: 'شراء' | 'بيع';
  buyerNature: 'شخص_معنوي' | 'شخص_طبيعي';
  intakeDate?: string;
  intakePlace?: string;
  court?: string;
  section?: string;
  notaryPrimary?: string;
  notarySecondary?: string;
  internalFileNumber?: string;
  deedStatus: 'قيد_الإدخال' | 'يحتاج_مراجعة' | 'مستوف' | 'جاهز_للتحرير' | 'متوقف_قانونيا_أو_تقنيا';
  buyerEntity: LegalEntityBuyerInfo;
  buyerRepresentative: LegalEntityRepresentativeInfo;
  sellers: SalePersonPartyInfo[];
  property: SalePersonPropertyDetails;
  titleChain: SaleTitleChainItem[];
  hasEncumbrances?: 'نعم' | 'لا' | '';
  encumbrances: SaleEncumbranceItem[];
  finance: SaleFinanceDetails & {
    sourceOfFunds?: 'أموال_الشركة' | 'تمويل_بنكي' | 'قرض' | 'مساهمة_شركاء' | 'آخر';
    sourceOfFundsNotes?: string;
    isPriceInclusiveOfTaxes?: boolean;
  };
  terms: SaleDeadlinesAndSpecialTerms;
  certificates: SaleAdminCertificateItem[];
  taxAndDuty: SaleTaxAndDutiesInfo;
  adoptionQuestion?: {
    confirmVerifiedIdentity?: 'نعم' | 'تعديل' | 'إيقاف_للمراجعة';
    confirmRepresentativeAtSigning?: 'نعم' | 'يحتاج_مراجعة';
  };
  legalCheckData?: {
    isEntityActive?: boolean;
    isNameConsistent?: boolean;
    isRepresentativeValid?: boolean;
    isCapacityContinuous?: boolean;
    isSpecialApprovalCompliant?: boolean;
    isCorporatePurposeAligned?: boolean;
    isPropertyValid?: boolean;
    isPriceBalanced?: boolean;
    isPoaCompliant?: boolean;
    allChecksPassed?: boolean;
    fatalErrors?: string[];
    reviewNotes?: string[];
  };
  reviewDecision?: 'جاهز_للتحرير' | 'يحتاج_مراجعة' | 'متوقف' | '';
  auditTrail?: SalePersonAuditEntry[];
}


// ProofOfEstate Type (رسم ثبوت مخلف)
export interface ProofOfEstate {
  applicant?: {
    fullName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    maritalStatus?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    address?: string;
    idNumber?: string;
    relationToDeceased?: 'وريث' | 'وصي' | 'ممثل_قانوني' | 'طرف_ثالث' | '';
    isDirectHeir?: boolean;
    isGuardianOfMinor?: boolean;
    representsLegalEntity?: boolean;
  };
  deceased?: {
    fullName?: string;
    dateOfDeath?: string;
    placeOfDeath?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    maritalStatusAtDeath?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    idNumber?: string;
    deathRegistry?: string;
    relationToProperty?: 'مالك' | 'شريك' | 'متصرف' | '';
  };
  properties?: Array<{
    propertyType?: 'عقار_حضري' | 'عقار_فلاحي' | 'عقار_تجاري' | 'منقول' | 'نقدي' | '';
    addressOrLocation?: string;
    boundaries?: string;
    area?: string;
    originalOwnership?: 'شراء' | 'إرث' | 'محبس' | 'مشاع' | '';
    estimatedValue?: number;
    hasEncumbrances?: boolean;
    encumbrancesDetails?: string;
    isShared?: boolean;
    isWaqf?: boolean;
    hasEasement?: boolean;
  }>;
  heirs?: Array<{
    fullName?: string;
    dateOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    idNumber?: string;
    relationToDeceased?: 'ابن' | 'ابنة' | 'زوج' | 'زوجة' | 'شقيق' | 'شقيقة' | 'آخر' | '';
    isMinor?: boolean;
    guardianName?: string;
    guardianId?: string;
  }>;
  witnesses?: {
    witnessNames?: string;
    signaturesUploaded?: boolean;
    witnessResidences?: string;
    relationToDeceased?: string;
  };
  documentDetails?: {
    documentType?: 'كامل' | 'جزئي' | 'عقاري' | 'منقول' | 'نقدي' | '';
    inventoryDate?: string;
    listedProperties?: string;
    totalValue?: number;
    shareDistribution?: string;
    specialNotes?: string;
    hasSharedProperties?: boolean;
    hasWills?: boolean;
    hasCreditorRights?: boolean;
    hasWaqfProperties?: boolean;
  };
  smartChecks?: {
    sharedPropertiesNeedConsent?: boolean;
    waqfPropertiesNeedApproval?: boolean;
    minorsNeedGuardian?: boolean;
    hasCreditorRights?: boolean;
    hasWillOnEstate?: boolean;
    valuationMismatch?: boolean;
  };
  smartAnswers?: {
    allPartnersInvolvedInShared?: boolean;
    waqfNeedsCouncilPermission?: boolean;
    hasEasementOrMortgage?: boolean;
    minorExists?: boolean;
    multipleHeirs?: boolean;
  };
}

// EstateInventory Type (رسم إحصاء متروك)
export interface EstateInventory {
  applicant?: {
    fullName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    maritalStatus?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    address?: string;
    idNumber?: string;
    relationToDeceased?: 'وريث' | 'وصي' | 'قريب_آخر' | 'طرف_ثالث' | '';
    isDirectHeir?: boolean;
    isGuardianOfMinors?: boolean;
    representsLegalEntity?: boolean;
  };
  deceased?: {
    fullName?: string;
    dateOfDeath?: string;
    placeOfDeath?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    maritalStatusAtDeath?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    idNumber?: string;
    estateRegistry?: string;
    deathCertificate?: string;
  };
  properties?: Array<{
    propertyType?: 'عقار_حضري' | 'عقار_فلاحي' | 'عقار_تجاري' | 'منقول' | 'نقدي' | '';
    addressOrLocation?: string;
    boundaries?: string;
    area?: string;
    originalOwnership?: 'شراء' | 'إرث' | 'محبس' | 'مشاع' | '';
    estimatedValue?: number;
    hasEncumbrances?: boolean;
    encumbrancesDetails?: string;
    isShared?: boolean;
    isWaqf?: boolean;
    hasEasement?: boolean;
  }>;
  heirs?: Array<{
    fullName?: string;
    dateOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    idNumber?: string;
    relationToDeceased?: 'ابن' | 'ابنة' | 'زوج' | 'زوجة' | 'شقيق' | 'شقيقة' | 'آخر' | '';
    isMinor?: boolean;
    guardianName?: string;
    guardianId?: string;
    share?: string;
  }>;
  witnesses?: {
    witnessNames?: string;
    signaturesUploaded?: boolean;
    witnessResidences?: string;
    relationToDeceased?: string;
  };
  inventoryDetails?: {
    inventoryType?: 'كامل' | 'جزئي' | 'عقاري' | 'منقول' | 'نقدي' | '';
    inventoryDate?: string;
    totalValue?: number;
    shareDistribution?: string;
    specialNotes?: string;
    hasSharedProperties?: boolean;
    hasPriorWill?: boolean;
    hasSeizedProperties?: boolean;
    hasWaqfProperties?: boolean;
  };
  smartChecks?: {
    sharedPropertiesNeedConsent?: boolean;
    waqfPropertiesNeedApproval?: boolean;
    minorsNeedGuardian?: boolean;
    hasCreditorRights?: boolean;
    hasWillOnEstate?: boolean;
    valuationMismatch?: boolean;
  };
  smartAnswers?: {
    allPartnersInvolvedInShared?: boolean;
    waqfNeedsCouncilPermission?: boolean;
    hasEasementOrMortgage?: boolean;
    heirIsMinor?: boolean;
    multipleHeirs?: boolean;
  };
}

// WillDeed Type (رسم وصية)
export interface WillDeed {
  testator?: {
    fullName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    maritalStatus?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    address?: string;
    idNumber?: string;
    profession?: string;
    isActualManager?: boolean;
    isGuardian?: boolean;
    isLegallyCapable?: boolean;
    hasMarriageContract?: boolean;
    hasDivorceAffectingInheritance?: boolean;
  };
  heirs?: Array<{
    fullName?: string;
    dateOfBirth?: string;
    nationality?: 'مغربي' | 'أجنبي' | '';
    idNumber?: string;
    relationToTestator?: 'ابن' | 'ابنة' | 'شقيق' | 'شقيقة' | 'أخ' | 'أخت' | 'آخر' | '';
    isMinor?: boolean;
    guardianName?: string;
    guardianId?: string;
    share?: string;
  }>;
  property?: {
    propertyType?: 'حضري' | 'فلاحي' | 'سكني' | 'تجاري' | 'مشاع' | '';
    address?: string;
    boundaries?: string;
    area?: string;
    originalOwnership?: 'شراء' | 'إرث' | 'مشاع' | 'محبس' | 'محفظة' | '';
    propertyValue?: number;
    willType?: 'ثلث' | 'ربع' | 'خمس' | 'معين' | 'تنزيل' | '';
    fullPropertyOrPart?: 'كامل' | 'جزء' | '';
    malesOnly?: boolean;
    femalesOnly?: boolean;
    allHeirs?: boolean;
  };
  willDetails?: {
    willType?: 'ثلث' | 'ربع' | 'خمس' | 'معين' | 'تنزيل' | '';
    willDate?: string;
    isAccepted?: boolean;
    acceptanceDate?: string;
    willText?: string;
    hasGuardianForMinor?: boolean;
    guardianDetails?: string;
    isGeneralWill?: boolean;
    specificProperties?: string;
    hasSpecialConditions?: boolean;
    conditionMarriage?: boolean;
    conditionEducation?: boolean;
    conditionNoSale?: boolean;
    conditionMortgage?: boolean;
    conditionsText?: string;
  };
  witnessesData?: {
    witnessNames?: string;
    signaturesUploaded?: boolean;
    draftDate?: string;
    draftTime?: string;
    estateRegistry?: string;
    notaryRegister?: string;
  };
  smartChecks?: {
    ratiosCalculated?: boolean;
    hasDesignatedShares?: boolean;
    minorNeedsGuardian?: boolean;
    malesEqualFemales?: boolean;
    hasConditionalWill?: boolean;
    multipleWillsConflict?: boolean;
    exceedsLegalLimit?: boolean;
    exceedsThird?: boolean;
  };
  smartAnswers?: {
    heirsAreMaleOrFemale?: 'ذكور' | 'إناث' | 'كلاهما' | '';
    multipleHeirs?: boolean;
    hasDesignatedGuardian?: boolean;
    willCoversAllProperties?: boolean;
  };
}

// ExchangeDeed Type (رسم مناقلة)
export interface ExchangeDeed {
  hasThirdParty?: boolean;
  firstPartyCapacity?: 'مالك' | 'وارث' | 'شريك' | 'ذي_صفة' | '';
  secondPartyCapacity?: 'مالك' | 'وارث' | 'شريك' | 'ذي_صفة' | '';
  thirdPartyCapacity?: 'مالك' | 'وارث' | 'شريك' | 'ذي_صفة' | '';
  firstPartyIsHeir?: boolean;
  secondPartyIsHeir?: boolean;
  thirdPartyIsHeir?: boolean;
  firstPartyHasAgent?: boolean;
  secondPartyHasAgent?: boolean;
  thirdPartyHasAgent?: boolean;
  firstPartyAgencyScope?: string;
  secondPartyAgencyScope?: string;
  thirdPartyAgencyScope?: string;
  dispositionShareType?: 'كامل_الملك' | 'نصيب_مشاع' | 'جزء_مفرز' | 'غير_ذلك' | '';
  partiesNotes?: string;

  smartAnswers?: {
    anyPartyHeir?: boolean;
    includesInheritanceShare?: boolean;
    dispositionOnEntireOwnership?: boolean;
    dispositionOnUndividedShare?: boolean;
  };

  propertyContext?: {
    propertyKinds?: (
      | 'عقار_محفظ'
      | 'عقار_غير_محفظ'
      | 'مطلب_تحفيظ'
      | 'ملك_جماعي'
      | 'ملك_حبس'
      | 'ملك_غير_قابل_للتفويت'
      | 'ملك_فلاحي'
      | 'ملك_حضري'
    )[];
    customaryName?: string;
    fourBoundaries?: string;
    areaDescription?: string;
    agriculturalElements?: string;
    attachedRights?: string;
    landRegistryNumber?: string;
    preRegistrationNumber?: string;
  };

  ownershipSources?: ('شراء' | 'إرث' | 'قسم' | 'وصية' | 'حيازة' | 'وثيقة_أخرى')[];
  ownershipSourceOther?: string;

  exchangeDetails?: {
    firstPartyGives?: string;
    secondPartyGives?: string;
    thirdPartyGives?: string;
    hasCashCompensation?: boolean;
    cashCompensationAmount?: number;
    cashCompensationPayer?: 'الطرف_الأول' | 'الطرف_الثاني' | 'الطرف_الثالث' | 'أخرى' | '';
    cashCompensationNotes?: string;
  };

  valuation?: {
    methods?: ('تقويم_عرفي' | 'تقويم_خبير' | 'تقويم_عقاري_رسمي' | 'تقويم_لجنة_الجماعة')[];
    firstPartyPiecesValue?: number;
    secondPartyPiecesValue?: number;
    thirdPartyPiecesValue?: number;
    totalValue?: number;
    hasAdditionalCompensation?: boolean;
    additionalCompensationAmount?: number;
    costsBearer?: 'الطرف_الأول' | 'الطرف_الثاني' | 'الطرف_الثالث' | 'بالتساوي' | 'حسب_الاتفاق' | '';
  };

  obligations?: {
    noShare?: boolean;
    noOption?: boolean;
    noDoubleSale?: boolean;
    movableDelivery?: boolean;
    evacuationObligation?: boolean;
    ownershipTransferAcknowledged?: boolean;
  };

  warnings?: {
    noExchangeOnOthersProperty?: boolean;
    inheritanceCheckRequired?: boolean;
    shufaaRightImpacted?: boolean;
    agriculturalLawToConsider?: boolean;
    registrationRequiredForRegisteredProperty?: boolean;
    subjectToRegistrationTaxes?: boolean;
  };

  specialCases?: {
    betweenHeirsForTakharrouj?: boolean;
    withPriorPossession?: boolean;
    againstUsufructOrRent?: boolean;
    betweenWaqfAndBeneficiary?: boolean;
    propertyPlusCash?: boolean;
    inCommonPropertyWithAbsentPartners?: boolean;
    shufaaNoticeToPartners?: boolean;
    inCollectivePropertyNeedsAuthorization?: boolean;
    notes?: string;
  };
}

// DeliveryDeed (رسم تسليم بعوض)
export interface DeliveryDeed {
  location?: {
    description?: string;
    type?: 'محل_تجاري' | 'سكن' | 'فلاحي' | 'أرض' | '';
    boundaries?: string;
    area?: string;
    isRegistered?: boolean;
    titleNumber?: string;
    customaryDefinition?: string;
    taxDocuments?: File[];
  };
  deliveryClause?: string;
  possessionClause?: string;
  guarantees?: {
    entitlement?: boolean;
    defects?: boolean;
    liabilities?: boolean;
  };
  inspectionReference?: string;
  aiChecks?: {
    taxCheck?: boolean;
    conflictCheck?: boolean;
    inheritanceCheck?: boolean;
  };
  workflow?: {
    partyIdentified?: boolean;
    locationDefined?: boolean;
    considerationDefined?: boolean;
    possessionValidated?: boolean;
    aiTaxChecked?: boolean;
    aiConflictChecked?: boolean;
    documentGenerated?: boolean;
    registrationPaid?: boolean;
    signed?: boolean;
  };
  considerationAmount?: number;
  paymentMethod?: 'نقد' | 'تحويل' | 'شيك' | '';
}

// AcknowledgmentDeed (رسم اقرار واعتراف)
export interface AcknowledgmentDeed {
  acknowledgmentType?: 'إبراء_مالي' | 'إخلاء_طرف' | 'تنازل_عن_عقار' | 'رفع_يد_عن_شيوع' | 'إبراء_ميراثي' | 'اعتراف_بدين' | 'أخرى';
  rightsType?: ('مالية' | 'عقارية' | 'ميراث' | 'غرامات')[];
  relationshipType?: 'بدون' | 'أصول_فروع' | 'أزواج' | 'إخوة' | 'ورثة_مشتركون';
  finality?: 'نهائي' | 'مشروط' | 'مؤقت';
  propertyDetails?: {
    isRegistered?: boolean;
    isAgricultural?: boolean;
    titleNumber?: string;
    description?: string;
  };
  aiChecks?: {
    isValidForInheritance?: boolean;
    involvesFutureRights?: boolean;
    isRegistrationMandatory?: boolean;
    publicOrderRisk?: boolean;
  };
  subjectText?: string;
}

// DebtDischargeDeed (رسم إبراء من دين)
export interface DebtDischargeDeed {
  debtSource?: 'بيع_وشراء' | 'قرض' | 'نفقة' | 'أجرة' | 'شراكة' | 'تعويض' | 'ودائع' | 'تسبيقات' | 'دين_تجاري' | 'دين_مدني' | 'غير_محدد';
  debtAmount?: number;
  debtAmountInWords?: string;
  proofType?: 'حكم_قضائي' | 'عقد_عدلي' | 'ورقة_عرفية' | 'تحويل_بنكي' | 'اتفاق_شفهي';
  paymentStatus?: 'تم_الاداء_سابقا' | 'ابراء_دون_اداء';
  creditorQ?: {
    isDebtEstablished?: boolean;
    isPreExisting?: boolean;
    timing?: 'قبل_الاداء' | 'بعد_الاداء';
    scope?: 'شامل' | 'جزئي';
    nature?: 'نهائي' | 'معلق_شرط';
    consideration?: 'مجاني' | 'بمقابل';
    awareOfExtinction?: boolean;
    hasDisputes?: boolean;
    hasGuarantor?: boolean;
    guarantorIncluded?: boolean;
  };
  debtorQ?: {
    acknowledgesDebt?: boolean;
    receivedSubject?: boolean;
    addCondition?: boolean;
    conditionDetails?: string;
    isPartialExchange?: boolean;
  };
  filters?: {
    capacityCheck?: boolean;
    commercialCheck?: boolean;
    thirdPartyRights?: boolean;
    usuryCheck?: boolean;
  };
}

// DebtAcknowledgmentDeed (رسم اقرار بدين)
export interface DebtAcknowledgmentDeed {
  debtSource?: 'قرض' | 'معاملة' | 'بيع_وشراء' | 'نفقة' | 'أجرة' | 'عمل' | 'تعويض' | 'شراكة' | 'تسبيق' | 'وديعة' | 'غير_مبرر';
  debtNature?: 'نقدي' | 'غير_نقدي';
  debtAmount?: number;
  debtAmountInWords?: string;
  deadlineType?: 'مؤجل' | 'فوري';
  deadlineDateType?: 'ثابت' | 'احتمالي';
  installmentsPossible?: boolean;
  paymentMethod?: 'نقد' | 'تحويل_بنكي' | 'شيك' | 'خدمة_الكترونية' | 'غير_محدد';
  guaranteeType?: 'بدون_ضمان' | 'كفالة_شخصية' | 'رهن' | 'حجز_اتفاقي' | 'إبراء_معلق';
  debtorQ?: {
    receivedAmount?: boolean;
    timing?: 'سابق' | 'متزامن';
    hasWitnesses?: boolean;
    hasWrittenContract?: boolean;
    hasJudicialDispute?: boolean;
    acceptsPenaltyClause?: boolean;
  };
  creditorQ?: {
    deliveredAmount?: boolean;
    isCommercialUse?: boolean;
    hasPreviousLoans?: boolean;
  };
  filters?: {
    civilLimitationCheck?: boolean;
    usuryCheck?: boolean;
    hiddenSaleCheck?: boolean;
    capacityCheck?: boolean;
    guaranteeRiskCheck?: boolean;
    doubleObligationCheck?: boolean;
  };
}

export interface PersonIdentityFields {
  fullName?: string;
  familyName?: string;
  lastName?: string;
  firstName?: string;
  fatherName?: string;
  motherName?: string;
  birthplace?: string;
  birthdate?: string;
  cin?: string;
  idNumber?: string;
  nationality?: string;
  occupation?: string;
  address?: string;
}

export interface BilingualPersonIdentity {
  ar?: PersonIdentityFields;
  lat?: PersonIdentityFields;
}

export interface MarriageJudicialRulingDeed {
  rulingSource?: 'import' | 'manual';
  courtData?: {
    court?: string;
    section?: string;
    fileNumber?: string;
    rulingNumber?: string;
    rulingDate?: string;
    rulingType?: string;
    rulingStatus?: 'حكم نهائي' | 'حائز لقوة الشيء المقضي به' | 'مرفق بما يفيد صيرورته نهائيًا/قابلاً للتوثيق' | 'حالة أخرى حسب الوثيقة القضائية';
    rulingStatusOther?: string;
    attachedDocumentName?: string;
  };
  identityVerification?: {
    matchesIdentityDocs?: boolean;
    discrepancyReason?: string;
    hasSubstantialDiscrepancy?: boolean;
  };
  rulingOriginalNames?: {
    husbandFullName?: string;
    wifeFullName?: string;
  };
  husband?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    idNumber?: string;
    profession?: string;
    currentAddress?: string;
    isAbroad?: boolean;
    abroadCountry?: string;
    abroadCity?: string;
    abroadAddressAr?: string;
    abroadAddressLat?: string;
    latinName?: string;
  };
  wife?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    idNumber?: string;
    profession?: string;
    currentAddress?: string;
    isAbroad?: boolean;
    abroadCountry?: string;
    abroadCity?: string;
    abroadAddressAr?: string;
    abroadAddressLat?: string;
    latinName?: string;
  };
  marriageDuration?: {
    startDateType?: 'year' | 'exact_date' | 'custom_phrase';
    startYear?: string;
    startDate?: string;
    customPhrase?: string;
    rulingRecordedText?: string;
    deedDate?: string;
    calculatedSummary?: string;
  };
  dowry?: {
    amountNumber?: number | string;
    amountWords?: string;
    currency?: string;
    paymentStatus?: 'مقبوض' | 'مؤجل' | 'مقبوض_بعضه_ومؤجل_باقيه' | 'غير_محدد_بالحكم';
    detailsInRuling?: string;
    isWordCountMatching?: boolean;
  };
  rulingPronouncement?: {
    verdictOriginalText?: string; // منطوق الحكم
    verdictApproved?: boolean;
    rulingSubstance?: string; // فحوى الحكم
  };
  deedDraft?: {
    customDraftText?: string;
    notaryNotes?: string;
  };
  postHomologationCivilStatus?: {
    isCompleted?: boolean;
    isHomologated?: boolean;
    isCopyPrepared?: boolean;
    sendingStatus?: 'في انتظار الإرسال للحالة المدنية' | 'تم الإرسال';
    sentDate?: string;
    dispatchReference?: string;
  };
}

export interface MarriageContinuityDeed {
  spouses?: {
    husband?: BilingualPersonIdentity;
    wife?: BilingualPersonIdentity;
  };
  marriageType?: 'عدلي' | 'مدني' | 'قنصلي';
  reference?: {
    court?: string;
    notarySection?: string;
    number?: string;
    date?: string;
    ishhadDate?: string;
    dateHijri?: string;
    isGuardianPresent?: boolean;
    hasConditions?: boolean;
    conditions?: string;
    hasDowry?: boolean;
    dowryValue?: number;
    isMarriageOutsideMorocco?: boolean;
  };
  foreignReference?: {
    consulate?: string;
    country?: string;
    registrationNumber?: string;
    transcriptionDate?: string;
  };
  continuityStatement?: string;
  purpose?: 'إرث' | 'عقار' | 'هجرة' | 'ضمان_اجتماعي' | 'أخرى';
  needsTranslation?: boolean;
  translationLanguage?: string;
  witnesses?: {
    name: string;
    cin: string;
    age?: number;
    relation?: string;
    occupation?: string;
    address?: string;
    aiEligibilityCheck?: boolean;
  }[];
  hasChildren?: 'نعم' | 'لا';
  children?: {
    name: string;
    birthDate: string;
    sex: 'ذكر' | 'أنثى';
    cin?: string;
  }[];
  aiChecks?: {
    marriageValidity?: boolean;
    divorceCheck?: boolean;
    foreignUseMode?: boolean;
  };
}

export type MarriageClassificationType =
  | 'adult_marriage'          // 👤 زواج الراشد
  | 'minor_marriage'          // 👦 زواج القاصر
  | 'self_contracting_female' // 👩 زواج الراشدة التي زوجت نفسها
  | 'mental_disability'       // 🧠 زواج ذي إعاقة ذهنية
  | 'revocable_reconciliation'// 🔄 الزواج الرجعي
  | 'stipulated_conditions'   // 📜 زواج مقترن بشروط اتفاقية
  | 'contract_renewal';       // 🔁 مراجعة أو تجديد عقد زواج

export type MinorMarriageParty = 'husband' | 'wife' | 'both';

export interface PreviousMarriageContractDetails {
  husbandName?: string;
  wifeName?: string;
  deedNumber?: string;
  inclusionRef?: string;
  deedDate?: string;
  courtName?: string;
  isLinked?: boolean;
}

export interface SmartMarriageClassificationData {
  primaryType: MarriageClassificationType;
  minorParty?: MinorMarriageParty;
  judgePermission?: JudgePermissionDetails & {
    status?: 'verified' | 'pending' | 'unverified' | 'blocked';
    courtName?: string;
    judgeName?: string;
  };
  medicalReport?: {
    reportNumber?: string;
    doctorName?: string;
    clinicName?: string;
    reportDate?: string;
    isVerified?: boolean;
  };
  stipulatedConditions?: string[];
  previousContract?: PreviousMarriageContractDetails;
  isSelfContracting?: boolean;
  reconciliationDetails?: {
    divorceDeedNumber?: string;
    divorceDate?: string;
    revocationDate?: string;
    divorceCourt?: string;
    isIddahValid?: boolean;
  };
  readinessStatus?: {
    isTypeSelected: boolean;
    isSpecialPathResolved: boolean;
    isJudgePermissionValid: boolean;
    isConditionsRecorded: boolean;
    isPreviousContractLinked: boolean;
    isReadyToDraft: boolean;
  };
  confirmedAt?: string;
}

export type DivorceClassificationType =
  | 'consensual'          // 🤝 الطلاق الاتفاقي (D-01)
  | 'discord'             // ⚖️ التطليق للشقاق (D-02)
  | 'revocable'           // 🔄 الطلاق الرجعي (D-03)
  | 'khul'                // 💰 الطلاق الخلعي (D-04)
  | 'tamlik'              // 👩 الطلاق المملك (D-05)
  | 'completed_three'     // 🛑 الطلاق المكمل للثلاث (D-08)
  | 'rajah'               // 🔁 رسم الرجعة (D-06)
  | 'murajaah'            // 💍 رسم المراجعة (D-07)
  | 'revocation_return';  // 🔁 الرجعة أو المراجعة (D-06/D-07)

export type DivorceStatisticalCode = 'D-01' | 'D-02' | 'D-03' | 'D-04' | 'D-05' | 'D-06' | 'D-07' | 'D-08';

export type DivorceCountType = 'first' | 'second' | 'third' | 'other';

export interface RajahDetails {
  previousDeedNumber?: string;
  iddahConfirmed?: boolean;
  courtNotified?: boolean;
  isLinked?: boolean;
}

export interface MurajaahDetails {
  previousDeedNumber?: string;
  previousDivorceType?: 'khul' | 'consensual' | 'revocable_expired' | 'discord';
  dowryAmount?: number;
  dowryInWords?: string;
  dowryNature?: string;
  lessThanThreeTalaqsConfirmed?: boolean;
  isLinked?: boolean;
}

export interface TamlikBasisDetails {
  sourceType: 'marriage_deed' | 'voluntary_deed' | 'family_booklet' | 'other_document';
  deedNumber?: string;
  letter?: string;
  page?: string;
  count?: string;
  deedDate?: string;
  courtName?: string;
  attachmentName?: string;
  isLinked?: boolean;
}

export interface KhulDetails {
  compensationAmount?: number;
  compensationInWords?: string;
  compensationNature?: string;
  waiverDetails?: string;
  specialConditions?: string[];
  presenceStatus?: 'both_present' | 'wife_representative';
}

export interface ReturnRevocationDetails {
  scenario: 'husband_return' | 'khul_reconciliation';
  husbandName?: string;
  wifeName?: string;
  previousDeedNumber?: string;
  previousDeedLetter?: string;
  previousDeedPage?: string;
  previousDeedCount?: string;
  previousDeedDate?: string;
  previousDeedCourt?: string;
  previousDivorceType?: DivorceClassificationType;
  isLinked?: boolean;
  iddahStatus?: 'valid' | 'expired';
}

export interface RevocableChildData {
  id: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  birthPlace: string;
  age?: number;
  healthStatus: string;
  educationStatus: string;
}

export interface RevocableDivorceWorkflowData {
  // المرحلة 01: الإذن القضائي بالإشهاد بالطلاق
  hasJudicialPermission: boolean;
  court: string;
  section: string;
  fileNumber: string;
  permissionNumber: string;
  permissionDate: string;
  receptionDate: string;
  adoulNotes?: string;

  // المرحلة 02: تحديد الحاضر وطالب الإشهاد
  attendeeType: 'husband' | 'wife' | 'both';

  // المرحلة 03: بيانات الزوج
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 04: بيانات الزوجة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 05: مرجع رسم الزواج
  marriageRef: {
    marriageDeedType: string;
    bookType: string;
    bookNumber: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    issuingCourt: string;
  };

  // المرحلة 06: بيانات الطلاق الرجعي
  divorceCount: 'first' | 'second' | 'third';
  divorceNature: 'طلاق رجعي';

  // المرحلة 07: التحقق من واقعة البناء
  consummationHappened: boolean;

  // المرحلة 08: التحقق من حالة الزوج وقت إيقاع الطلاق
  husbandCapacity: {
    freeWill: boolean;
    coerced: boolean;
    intoxicated: boolean;
    extremeAnger: boolean;
  };

  // المرحلة 09: المستحقات
  duesSpecifiedByCourt: boolean;
  dues: {
    deferredDowry: number;
    iddahMaintenance: number;
    mutah: number;
    housingDuringIddah: number;
    childrenDues: number;
    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 10: إيداع المستحقات بكتابة الضبط
  duesDeposited: boolean;
  depositDetails: {
    depositAmount: number;
    depositAmountInWords: string;
    receiptNumber: string;
    depositDate: string;
    depositCourt: string;
    deadlineDays: number;
    isWithinDeadline: boolean;
  };

  // المرحلة 11 و 12: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;
  childrenList: RevocableChildData[];

  // المرحلة 13: حالة الحمل
  pregnancyStatus: 'yes' | 'no' | 'unknown';

  // المرحلة 14: المراجعة الشاملة
  completedAt?: string;
}

export interface KhulDivorceWorkflowData {
  // المرحلة 01: الإذن القضائي بالإشهاد بالخلع
  hasJudicialPermission: boolean;
  court: string;
  section: string;
  fileNumber: string;
  permissionNumber: string;
  permissionDate: string;
  receptionDate: string;
  adoulNotes?: string;

  // المرحلة 02: أطراف الخلع
  attendeeType: 'both' | 'wife_only' | 'husband_only';

  // المرحلة 03: بيانات الزوجة المختلعة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    incomeResource?: string;
    address: string;
    city: string;
    country: string;
    isAdult?: boolean;
    legalGuardianName?: string;
  };

  // المرحلة 04: بيانات الزوج (الطرف الموافق على الخلع)
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 05: مرجع الزواج
  marriageDeed: {
    deedType: string;
    registryBook: string;
    registryBookNumber: string;
    page: string;
    count: string;
    deedDate: string;
    courtName: string;
  };

  // المرحلة 06: تاريخ الطلاق وعدده
  divorceCount: 'first' | 'second' | 'third';
  divorceNature: 'بائن بالخلع';

  // المرحلة 07: طلب الزوجة للخلع
  wifeRequestedKhul: boolean;

  // المرحلة 08: موافقة الزوج على الخلع
  husbandAgreedKhul: boolean;

  // المرحلة 09 و 10: مقابل الخلع ومجموعه
  compensation: {
    deferredDowryIncluded: boolean;
    deferredDowryAmount: number;
    deferredDowryInWords?: string;

    iddahMaintenanceWaived: boolean;

    mutahIncluded: boolean;
    mutahAmount: number;

    otherCompensationIncluded: boolean;
    otherCompensationDesc: string;
    otherCompensationAmount: number;

    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 11: تصريح الزوجة بالمستحقات
  wifeConfirmedDuesDeclaration: boolean;

  // المرحلة 12: الحمل
  pregnancyStatus: 'no' | 'yes' | 'cannot_declare';
  pregnancyStartDate?: string;

  // المرحلة 13: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;
  childrenList: RevocableChildData[];

  // المرحلة 14 و 15: قدرة الأم المختلعة على الإنفاق وإعسارها
  motherSpendingCapacity: 'yes' | 'no' | 'unproven';
  motherIncomeTypes?: string[];
  motherIncomeNature?: string;
  motherApproxMonthlyIncome?: string;
  isMotherInsolvent?: boolean;

  // المرحلة 16: بيانات الأب والتزامه عند إعسار الأم
  fatherCommitmentDetails?: string;
  maternalGrandfatherCommitment?: string;

  // المرحلة 17: تصريح والتزام الأم
  motherCommittedToCare: boolean;
  motherCommittedToCustody: boolean;

  // المرحلة 18: الحضانة
  custodianParty: 'mother' | 'father' | 'other_judicial';

  // المرحلة 19: سكن المحضونين
  custodyResidence: 'with_mother' | 'with_father' | 'independent' | 'other';
  custodyAddress: string;
  custodyCity: string;

  // المرحلة 20: الزيارة والرؤية
  visitationAgreed: boolean;
  visitationDays?: string;
  visitationHours?: string;
  visitationLocation?: string;
  visitationHolidays?: string;

  // المرحلة 21: الإرادة الحرة والإكراه والإضرار
  freeWillConsent: boolean;
  husbandCoercionReported: boolean;
  compensationAgreedWithoutCoercion: boolean;

  // المرحلة 22: الحارس القانوني الخماسي والمراجعة
  legalGuardChecks: {
    isWifeAdult: boolean;
    hasMutualConsent: boolean;
    childRightsProtected: boolean;
    insolventMotherProtected: boolean;
    noCoercionSuspected: boolean;
  };
  isBeforeConsummation?: boolean;
  dowryStatus?: string;
  mutaaOrCompensation?: number;
  completedAt?: string;
}

export interface TamlikConditionCheck {
  id: string;
  conditionText: string;
  status: 'fulfilled' | 'unfulfilled' | 'needs_review';
}

export interface TamlikDivorceWorkflowData {
  // المرحلة 01: الإذن القضائي
  hasJudicialPermission: boolean;
  court: string;
  section: string;
  fileNumber: string;
  permissionNumber: string;
  permissionDate: string;
  receptionDate: string;

  // المرحلة 02: صاحبة حق التمليك
  initiator: 'wife';

  // المرحلة 03: بيانات الزوجة المملَّكة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr: string;
    lastNameFr: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 04: بيانات الزوج المالك لحق التمليك
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr: string;
    lastNameFr: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
    presenceStatus: 'present' | 'absent';
  };

  // المرحلة 05: رسم الزواج
  marriageRef: {
    deedType: string;
    bookType: string;
    bookNumber: string;
    bookLetter: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    issuingCourt: string;
  };

  // المرحلة 06: سند التمليك
  tamlikSource: 'marriage_deed' | 'independent_deed' | 'case_file_document';
  independentDeedRef?: {
    deedType: string;
    bookNumber: string;
    bookLetter: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    courtName: string;
  };

  // المرحلة 07: مضمون شرط التمليك
  explicitTamlikGranted: boolean;
  hasSpecialConditions: boolean;
  conditionsList: TamlikConditionCheck[];

  // المرحلة 08: نطاق حق التمليك
  tamlikScope: 'unconditional' | 'conditional';

  // المرحلة 09: التحقق من الأساس القانوني
  basisVerified: boolean;

  // المرحلة 10: ترتيب الطلاق
  divorceCount: 'first' | 'second' | 'third';

  // المرحلة 11: حالة البناء
  consummationHappened: boolean;

  // المرحلة 12: تصريح الزوجة بإعمال حق التمليك
  wifeExercisedTamlik: boolean;
  wifeStatementText: string;

  // المرحلة 13: حضور أو غياب الزوج
  husbandPresentDuringAct: boolean;

  // المرحلة 14: تصريح الحمل
  pregnancyStatus: 'no' | 'yes' | 'uncertain';

  // المرحلة 15: المستحقات
  dues: {
    deferredDowry: number;
    iddahMaintenance: number;
    mutah: number;
    housingDuringIddah: number;
    childrenDues: number;
    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 16: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;
  childrenList: RevocableChildData[];

  // المرحلة 17: الحضانة والسكن والنفقة
  custodyParty: string;
  custodyResidence: string;
  hasCourtOrderedChildDues: boolean;
  childDuesDetails?: {
    amount: number;
    period: string;
    paymentMethod: string;
  };

  // المرحلة 18: الحراس القانونيون التسعة
  legalGuardVerification: {
    tamlikRightProven: boolean;
    conditionsFulfilled: boolean;
    judicialPermissionIssued: boolean;
    wifeIsAuthorizedHolder: boolean;
    exerciseDeclared: boolean;
    divorceOrderRecorded: boolean;
    consummationRecorded: boolean;
    pregnancyRecorded: boolean;
    duesRecorded: boolean;
  };

  husbandRevocationAttempted: boolean;
  isRepresentationOrAgency: boolean;

  isBeforeConsummation?: boolean;
  dowryStatus?: string;
  mutaaOrCompensation?: number;

  completedAt?: string;
}

export interface ConsensualChildData {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  age?: number;
  custodyAssignment: 'mother' | 'father' | 'other_agreed';
  visitationRights: string;
}

export interface ConsensualDivorceWorkflowData {
  // المرحلة 01: الإذن القضائي بالإشهاد بالطلاق الاتفاقي
  hasJudicialPermission: boolean;
  court: string;
  section: string;
  fileNumber: string;
  permissionNumber: string;
  permissionDate: string;
  receptionDate: string;
  adoulNotes?: string;

  // المرحلة 02: تحديد الحاضرين وطالبي الإشهاد
  attendeeType: 'both_spouses' | 'proxies' | 'husband_only' | 'wife_only';

  // المرحلة 03: بيانات الزوج
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 04: بيانات الزوجة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 05: مرجع رسم الزواج
  marriageRef: {
    deedType: string;
    registryBook: string;
    bookNumber: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    issuingAuthority: string;
  };

  // المرحلة 06: بيانات الطلاق الاتفاقي وطبيعته القانونية
  divorceCount: 'first' | 'second';
  divorceNature: 'طلاق اتفاقي';
  legalEffect: 'طلاق بائن بينونة صغرى';

  // المرحلة 07: التحقق من واقعة البناء
  consummationHappened: boolean;

  // المرحلة 08: أهلية الطرفين وحرية الإرادة والتراضي
  consentChecks: {
    isFreeWillConsent: boolean;
    hasCoercionOrDefect: boolean;
    hasIncompetenceOrLackOfDiscernment: boolean;
  };

  // المرحلة 09: مستحقات وشروط اتفاق الطلاق
  hasAgreementAttached: boolean;
  dues: {
    wifeAgreedDues: number;
    housingOrCompDues: number;
    childrenMonthlySupport: number;
    otherConditions: string;
    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 10: إيداع المستحقات أو تنفيذ الشروط المالية
  duesExecutionStatus: boolean;
  executionDetails: {
    executedAmount: number;
    executedAmountInWords: string;
    receiptOrDeliveryRef: string;
    executionDate: string;
    authorityOrCourt: string;
  };

  // المرحلة 11 و 12: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;
  childrenList: ConsensualChildData[];

  // المرحلة 13: حالة الحمل
  pregnancyStatus: 'yes' | 'no' | 'unknown';

  // المرحلة 14: المراجعة الشاملة والتأكيد
  completedAt?: string;
}

export interface DiscordChildData {
  id: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  age?: number;
  custodyAssignment: 'mother' | 'father' | 'other';
  monthlySupport: number;
  visitationRights: string;
}

export interface DiscordDivorceWorkflowData {
  // المرحلة 01: الحكم القضائي النهائي بتطليق الشقاق
  hasJudgment: boolean;
  courtCity: string;
  familySectionCity: string;
  caseNumber: string;
  judgmentNumber: string;
  judgmentDate: string;
  notificationDate?: string;
  adoulNotes?: string;

  // المرحلة 02: تحديد رافع الدعوى والحاضر أمام العدل
  applicantInJudgment: 'husband' | 'wife' | 'both';
  attendeeForCertification: 'husband' | 'wife' | 'both';

  // المرحلة 03: بيانات الزوج
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 04: بيانات الزوجة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 05: مرجع رسم الزواج المراد إنهاؤه
  marriageRef: {
    deedType: string;
    registryBook: string;
    bookNumber: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    issuingAuthority: string;
  };

  // المرحلة 06: بيانات تطليق الشقاق وطبيعته القانونية
  divorceCount: 'first' | 'second';
  divorceNature: 'تطليق قضائي للشقاق';
  legalEffect: 'طلاق بائن بينونة صغرى';

  // المرحلة 07: التحقق من واقعة البناء
  consummationHappened: boolean;

  // المرحلة 08: محاولات الصلح ومسؤولية الشقاق
  reconciliationExhausted: boolean;
  responsibleParty: 'husband' | 'wife' | 'shared_or_unspecified';

  // المرحلة 09: المستحقات المالية والتعويض عن الضرر
  dues: {
    wifeDues: number;
    damageCompensation: number;
    childSupport: number;
    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 10: إيداع المستحقات أو التنفيذ القضائي
  duesExecutionStatus: boolean;
  executionDetails: {
    depositAmount: number;
    depositAmountInWords: string;
    receiptNumber: string;
    depositDate: string;
    courtName: string;
  };

  // المرحلة 11 و 12: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;
  childrenList: DiscordChildData[];

  // المرحلة 13: حالة الحمل
  pregnancyStatus: 'yes' | 'no' | 'unknown';

  isBeforeConsummation?: boolean;
  dowryStatus?: string;
  mutaaOrCompensation?: number;

  // المرحلة 14: المراجعة الشاملة والتأكيد
  completedAt?: string;
}

export interface CompletedThreeChildData {
  id: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  age?: number;
  healthStatus?: string;
  academicStatus?: string;
}

export interface CompletedThreeDivorceWorkflowData {
  // المرحلة 01: الإذن القضائي بالإشهاد بالطلاق المكمل للثلاث
  hasJudicialPermission: boolean;
  court: string;
  section: string;
  fileNumber: string;
  permissionNumber: string;
  permissionDate: string;
  receptionDate: string;
  adoulNotes?: string;

  // المرحلة 02: تحديد الحاضر وطالب الإشهاد
  attendeeType: 'husband_or_proxy' | 'both_spouses' | 'wife_only';

  // المرحلة 03: بيانات الزوج
  husband: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 04: بيانات الزوجة
  wife: {
    firstNameAr: string;
    lastNameAr: string;
    firstNameFr?: string;
    lastNameFr?: string;
    nationality: string;
    birthDate: string;
    birthPlace: string;
    fatherName: string;
    motherName: string;
    idType: 'cin' | 'passport' | 'other';
    idNumber: string;
    idExpiryDate: string;
    profession: string;
    address: string;
    city: string;
    country: string;
  };

  // المرحلة 05: مرجع رسم الزواج القائم
  marriageRef: {
    deedType: string;
    registryBook: string;
    bookNumber: string;
    pageNumber: string;
    deedNumber: string;
    deedDate: string;
    issuingAuthority: string;
  };

  // المرحلة 06: التثبت من الطلقات السابقة والتكييف القانوني
  firstDivorceRef: {
    deedNumber: string;
    deedDate: string;
    issuingAuthority: string;
  };
  secondDivorceRef: {
    deedNumber: string;
    deedDate: string;
    issuingAuthority: string;
  };
  divorceCount: 'third';
  divorceNature: 'طلاق مكمل للثلاث';
  legalEffect: 'طلاق بائن بينونة كبرى';

  // المرحلة 07: التحقق من واقعة البناء
  consummationHappened: boolean;

  // المرحلة 08: التحقق من حالة الزوج وقت إيقاع الطلاق
  husbandStateChecks: {
    isFreeWillChoice: boolean;
    isCoerced: boolean;
    isInebriated: boolean;
    isInExtremeAnger: boolean;
  };

  // المرحلة 09: المستحقات المحددة من المحكمة
  hasCourtDuesSpecified: boolean;
  dues: {
    deferredMahr: number;
    iddahSupport: number;
    mutah: number;
    housingDuringIddah: number;
    childrenDues: number;
    totalAmount: number;
    totalAmountInWords: string;
  };

  // المرحلة 10: إيداع المستحقات بكتابة الضبط
  isDepositedInCourt: boolean;
  depositDetails: {
    depositAmount: number;
    depositAmountInWords: string;
    receiptNumber: string;
    depositDate: string;
    courtName: string;
    isWithinLegalDeadline: boolean;
  };

  // المرحلة 11: الأبناء
  hasChildren: boolean;
  totalChildrenCount: number;
  boysCount: number;
  girlsCount: number;

  // المرحلة 12: بطاقة كل ابن
  childrenList: CompletedThreeChildData[];

  // المرحلة 13: حالة الحمل
  pregnancyStatus: 'yes' | 'no' | 'unknown';

  // المرحلة 14: المراجعة الشاملة والتأكيد النهائي
  completedAt?: string;
}

export interface SmartDivorceClassificationData {
  primaryType: DivorceClassificationType;
  statisticalCode: DivorceStatisticalCode;
  divorceCount?: DivorceCountType;
  wifePresence?: 'present' | 'absent';
  
  tamlikBasis?: TamlikBasisDetails;
  khulDetails?: KhulDetails;
  returnRevocation?: ReturnRevocationDetails;
  rajahDetails?: RajahDetails;
  murajaahDetails?: MurajaahDetails;
  revocableWorkflow?: RevocableDivorceWorkflowData;
  khulWorkflow?: KhulDivorceWorkflowData;
  tamlikWorkflow?: TamlikDivorceWorkflowData;
  consensualWorkflow?: ConsensualDivorceWorkflowData;
  discordWorkflow?: DiscordDivorceWorkflowData;
  completedThreeWorkflow?: CompletedThreeDivorceWorkflowData;
  consensualAgreement?: {
    terms?: string[];
    childrenCustodyAgreed?: boolean;
    housingAgreed?: boolean;
    courtPermissionNumber?: string;
    courtPermissionDate?: string;
    courtName?: string;
  };
  discordDetails?: {
    caseFileNumber?: string;
    judgmentNumber?: string;
    judgmentDate?: string;
    courtName?: string;
    isLinkedToCourtFile?: boolean;
  };

  generatedFormulaText?: string;
  customFormulaText?: string;
  isFormulaOverridden?: boolean;

  readinessStatus?: {
    isTypeSelected: boolean;
    isSpousesDefined: boolean;
    isSpecialPathComplete: boolean;
    isPreviousDeedVerified: boolean;
    isFormulaGenerated: boolean;
    isReadyToCertify: boolean;
  };
  auditTrail?: {
    time: string;
    action: string;
    details?: string;
  }[];
  confirmedAt?: string;
  // واقعة البناء والدخول — مُسجَّلة من شاشة التحقق التمهيدية
  consummationStatus?: 'after_consummation' | 'before_consummation';
}

export interface MarriageDetails {
  dowryAmount?: number;
  dowryAmountInWords?: string;
  isDowryReceived?: 'كاملا' | 'جزئي' | 'غير مقبوض' | string;
  dowryPaymentMethod?: 'عيانا' | 'اعترافا' | 'معاينة' | string;
  hasOtherDowryItems?: 'نعم' | 'لا' | string;
  otherDowryItems?: string[];
  dowryAdvance?: number;
  dowryAdvanceInWords?: string;
  dowryDeferred?: number;
  dowryDeferredInWords?: string;
  hasAssetManagementAgreement?: 'نعم' | 'لا' | string;
  hasSpecialConditions?: 'نعم' | 'لا' | string;
  specialConditionsOwner?: string;
  specialConditionsText?: string;
  courtName?: string;
  courtSection?: string;
  authorizationNumber?: string;
  authorizationDate?: string;
  authorizationCourt?: string;
  registryBookType?: string;
  registryNumber?: string;
  registryPage?: string;
  registryCount?: string;
  registryDate?: string;
  memorandumNumber?: string;
  memorandumRecordNumber?: string;
  memorandumPage?: string;
  sessionTimeWords?: string;
  sessionDateWords?: string;
  hijriDate?: string;
  mixedMarriageForeignParty?: 'husband' | 'wife' | '';
  husbandConvertedToIslam?: string;
  conversionCertificate?: {
    book?: string;
    number?: string;
    page?: string;
    count?: string;
    date?: string;
    notary?: string;
  };
  isMinorParty?: boolean;
  marriageClassification?: SmartMarriageClassificationData;
}

export interface DowryDetails {
  totalAmount?: number;
  totalAmountArabic?: string;
  advance?: number;
  advanceArabic?: string;
  deferred?: number;
  deferredArabic?: string;
  isReceived?: 'كاملا' | 'جزئي' | 'غير مقبوض' | string;
  paymentMethod?: 'عيانا' | 'اعترافا' | 'معاينة' | string;
}

export interface TawkilScope {
  professionalJudicial?: {
    courts?: boolean;
    lawyers?: boolean;
    notaries?: boolean;
    judicialCommissioners?: boolean;
    experts?: boolean;
  };
  publicAdministration?: {
    publicAdmins?: boolean;
    territorialCollectivities?: boolean;
    externalServices?: boolean;
    landConservation?: boolean;
    taxAdmin?: boolean;
    registrationAdmin?: boolean;
    customsAdmin?: boolean;
  };
  privateBodies?: {
    banks?: boolean;
    insurance?: boolean;
    privateInstitutions?: boolean;
    companies?: boolean;
  };
  legalActions?: {
    type?: 'general' | 'special' | 'marriage';
    specialDetails?: {
      propertyType?: string;
      propertyDefinition?: string;
      propertyStatus?: 'registered' | 'unregistered';
      titleNumber?: string;
      landRegistry?: string;
      ownershipDeed?: string;
      deedDate?: string;
      salePowers?: {
        setPrice?: boolean;
        receivePrice?: boolean;
        discharge?: boolean;
        sign?: boolean;
        [key: string]: any;
      };
      [key: string]: any;
    };
    marriageDetails?: {
      partnerType?: 'fiancee' | 'fiance' | string;
      partnerName?: string;
      partnerNationality?: string;
      partnerFatherName?: string;
      partnerMotherName?: string;
      partnerDOB?: string;
      partnerIdNumber?: string;
      partnerAddress?: string;
      partnerProfession?: string;
      dowryAmount?: number;
      dowryAmountArabic?: string;
      passportNumber?: string;
      passportValidUntil?: string;
      hasConditionOnPartner?: boolean;
      conditionOnPartnerText?: string;
      acceptsConditionFromPartner?: boolean;
      conditionFromPartnerText?: string;
      isFullyCompetent?: boolean;
      incompetenceReason?: 'minor' | 'other' | string;
      underagePermissionNumber?: string;
      absenceJustification?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  signing?: {
    signOnBehalf?: boolean;
    depositFiles?: boolean;
    withdrawDocs?: boolean;
    receiveCerts?: boolean;
    [key: string]: any;
  };
  generalReserve?: boolean;

  // Extended Real Rights & Registry Details (الفصل 889-1 ق.ل.ع ومرسوم 2.23.101)
  originalPoaSource?: OriginalPoaDetails;
  isSubjectToRealRightsRegistry?: boolean;
  realRightsPowers?: {
    transferOwnership?: boolean;
    saleProperty?: boolean;
    buyProperty?: boolean;
    giftProperty?: boolean;
    createRealRight?: boolean;
    transferRealRight?: boolean;
    amendRealRight?: boolean;
    cancelRealRight?: boolean;
    otherRealRightAct?: boolean;
    manageProperty?: boolean;
    leaseProperty?: boolean;
    collectRent?: boolean;
    adminRepresentation?: boolean;
    courtRepresentation?: boolean;
    generalManagement?: boolean;
    commercialDeals?: boolean;
    movableDeals?: boolean;
    otherAct?: boolean;
    [key: string]: any;
  };
  registryInfo?: RealEstateRegistryPoaInfo;
  subAgentInfo?: {
    hasSubAgent?: 'yes' | 'no' | 'unknown';
    subAgentName?: string;
    subAgentCin?: string;
    subAgentPhone?: string;
    subAgentScope?: string;
    isAuthorizedByPrincipal?: boolean;
    canDelegateFurther?: boolean;
  };
  multiplePrincipalsCheck?: {
    isJointOperation?: boolean;
    divisibleTransactionVerified?: boolean;
  };
  multipleAgentsCheck?: {
    scopeOption?: 'all' | 'specific' | 'partial';
    selectedAgentIds?: string[];
  };
  nationalRegistryStatus?: 'unverified' | 'registered' | 'not_registered' | 'update_requested' | 'status_updated';
  timelineEvents?: Array<{
    date: string;
    title: string;
    description: string;
    type?: string;
  }>;
  agencyStatus?: 'draft' | 'registered' | 'amended' | 'dismissed' | 'pending_cancellation' | 'cancelled_at_court';
}

// ============================================================================
// AGENT DISMISSAL DEED (رسم عزل وكيل)
// ============================================================================

export interface OriginalPoaDetails {
  sourceType: 'adoul' | 'official_other' | 'fixed_date' | 'foreign' | 'platform_existing';
  
  // 1. العدلان
  book?: string; // دفتر
  letter?: string; // حرف
  page?: string; // صحيفة
  number?: string; // عدد
  date?: string; // تاريخ
  court?: string; // توثيق المحكمة
  
  // 2. محرر رسمي آخر
  issuerAuthority?: string;
  documentNumber?: string;
  place?: string;
  docType?: string;
  
  // 3. ثابت التاريخ
  fixedDate?: string;
  fixedDateAuthority?: string;
  referenceNumber?: string;
  
  // 4. وكالة بالخارج
  country?: string;
  city?: string;
  foreignIssuer?: string;
  foreignNumber?: string;
  foreignDate?: string;
  hasApostilleOrLegalization?: boolean;
  isTranslated?: boolean;
  
  // Summary
  summaryText?: string;
}

export interface RealEstateRegistryPoaInfo {
  isRegistered: 'yes' | 'no' | 'unknown';
  primaryCourt?: string;
  registrationDate?: string;
  registrationNumber?: string; // e.g. REG-TT-2026/00142
  hasCertificate?: boolean;
  certificateAttachmentName?: string;
  isMatchedWithOriginal?: boolean;
}

export interface AgentDismissalPartyInfo {
  id: string;
  partyType: 'natural' | 'legal';
  fullName: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  idCardNumber: string;
  address: string;
  latinName?: string;
  
  // Legal entity
  companyName?: string;
  companyType?: string;
  commercialRegisterNumber?: string;
  headquarters?: string;
  legalRepresentativeName?: string;
  representativeCapacity?: string;
  powerDocumentRef?: string;
  
  // Status
  capacityVerified?: boolean;
}

export interface AgentDismissalSubAgentInfo {
  hasSubAgent: boolean;
  subAgentName?: string;
  subAgentReference?: string;
  appointedWithPrincipalConsent?: boolean;
  canAppointSubstitute?: boolean;
  subAgentDismissalImpact?: 'dismissed_automatically' | 'remains_authorized' | 'needs_specific_clause';
}

export interface AgentDismissalDeed {
  originalPoa: OriginalPoaDetails;
  registryInfo: RealEstateRegistryPoaInfo;
  
  // Principals
  principals: AgentDismissalPartyInfo[];
  isMultiplePrincipals: boolean;
  divisibleTransactionVerified: boolean; // الفصل 933 ق.ل.ع
  
  // Agents
  agents: AgentDismissalPartyInfo[];
  isMultipleAgents: boolean;
  dismissalTarget: 'all' | 'one' | 'some';
  selectedAgentIds: string[];
  
  // Scope
  dismissalScopeType: 'full' | 'partial';
  revokedPowers: string[]; // بيع، شراء، رهن، قسمة، كراء، تسيير، قبض الثمن، التوقيع، التقاضي، تمثيل، إنشاء/نقل/تعديل/إسقاط حق عيني، أخرى
  otherRevokedPowerCustom?: string;
  retainedPowers: string[];
  
  // Subject
  subjectCategory: 'real_estate' | 'real_right' | 'movable' | 'litigation' | 'management' | 'commercial' | 'general' | 'other';
  propertyType?: 'titled' | 'requisition' | 'unregistered';
  propertyTitleNumber?: string;
  propertyRequisitionNumber?: string;
  propertyUnregisteredDescription?: string;
  dispositionType?: 'ownership_transfer' | 'creation_right' | 'transfer_right' | 'amendment_right' | 'cancellation_right' | 'other';
  propertyLocation?: string;
  
  // Legal Checks & Exceptions
  inInterestOfAgentOrThirdParty: 'no' | 'yes' | 'unclear'; // الفصل 931 ق.ل.ع
  interestVerificationNote?: string;
  isLitigationPoa: boolean;
  caseStatus?: 'not_ready' | 'ready_for_judgment' | 'unknown';
  subAgent: AgentDismissalSubAgentInfo;
  legalEntityAuthoritySource?: string;
  formRequirementObserved: boolean; // الفصل 934 ق.ل.ع
  
  // Notification & Third Party Protection
  notificationMethod: 'present_in_majlis' | 'written_notice' | 'telegram' | 'previous_notice' | 'future_notice' | 'unknown';
  notificationDate?: string;
  notificationDetails?: string;
  thirdPartyProtectionAcknowledged: boolean;
  
  // Cancellation in Registry
  requiresRegistryCancellation: boolean;
  cancellationRequestNumber?: string;
  cancellationPrimaryCourt?: string;
  cancellationCertificateModel7Number?: string;
  cancellationCertificateDate?: string;
  nationalRegistryStatus: 'pending' | 'synced' | 'failed' | 'needs_processing';
  
  // Timeline
  timelineEvents?: Array<{
    date: string;
    title: string;
    description: string;
    type: 'original' | 'amendment' | 'dismissal' | 'publicity';
  }>;
}

export interface FeesAgentState {
  marriageDetails?: MarriageDetails;
  step: number;
  documentType: DocumentType | '';
  sellers: Party[];
  buyers: Party[];
  applicant?: Applicant;
  applicants?: Applicant[];
  inheritanceDeeds?: InheritanceDeed[];
  witnesses?: Witness[];
  // Evidence Method & Investigation (طريقة الإثبات والشهادة والتحري)
  evidenceMethod?: 'none' | 'lafif' | 'scientific' | 'mithliya' | '';
  evidenceSubjectMatter?: EvidenceSubjectMatter; // موضوع الواقعة والمدى الزمني المحسوب
  scientificTestimony?: {
    permissionNumber?: string;
    permissionDate?: string;
    courtName?: string;
    judgeName?: string;
    issueDate?: string;
    electronicDoc?: File | { name: string; size: number; base64?: string; type?: string } | null;
    electronicVerification?: boolean;
    primaryNotary?: string;
    secondaryNotary?: string;
  };
  mithliyaTestimony?: {
    primaryNotary?: string;
    notaryName?: string;
    witnessesCount?: number;
    completed?: boolean;
    permissionNumber?: string;
    permissionDate?: string;
    courtName?: string;
    judgeName?: string;
    issueDate?: string;
    electronicDoc?: File | { name: string; size: number; base64?: string; type?: string } | null;
    electronicVerification?: boolean;
  };
  partitionDivisions?: PartitionDivision[];
  commonFacilities?: CommonFacilities;
  inheritanceDescription?: string;
  properties: PropertyDetails[];
  agencyMode?: 'mixed' | 'individual' | 'joint' | 'individual_and_joint' | string;
  ownershipCriteria?: {
    areApplicantsOwners?: 'yes' | 'no' | string;
    areOwnersAlive?: 'yes' | 'no' | string;
    [key: string]: any;
  };
  
  // Persistence for judicial status
  judgeSubmissionId?: string | null;
  judgeStatus?: string | null;
  
  // BuildingProof Deed State
  buildingProof?: BuildingProof;

  // EasementProof Deed State (ثبوت مرفق / حق الارتفاق)
  easementProof?: EasementProof;

  // PossessionProof Deed State (رسم حيازة)
  possessionProof?: PossessionProof;

  // AcknowledgmentDeed State
  acknowledgmentDeed?: AcknowledgmentDeed;

  // DebtDischargeDeed State
  debtDischargeDeed?: DebtDischargeDeed;

  // DebtAcknowledgmentDeed State
  debtAcknowledgmentDeed?: DebtAcknowledgmentDeed;

  // MarriageContinuityDeed State
  marriageContinuityDeed?: MarriageContinuityDeed;

  // MarriageJudicialRulingDeed State (رسم توثيق حكم بثبوت الزوجية)
  marriageJudicialRulingDeed?: MarriageJudicialRulingDeed;

  // SalePersonDeed State (رسم البيع والشراء – الشخص الطبيعي/العادي)
  salePersonDeed?: SalePersonDeed;

  // SaleEntityDeed State (رسم شراء عقار لفائدة شخص معنوي)
  saleEntityDeed?: SaleEntityDeed;

  // PromiseToSell State (رسم وعد بالبيع)
  promiseToSell?: PromiseToSell;

  // PromiseToLease State (رسم وعد بالكراء)
  promiseToLease?: PromiseToLeaseDeed;

  // ProofOfEstate State (رسم ثبوت مخلف)
  proofOfEstate?: ProofOfEstate;

  // EstateInventory State (رسم إحصاء متروك)
  estateInventory?: EstateInventory;

  // WillDeed State (رسم وصية)
  willDeed?: WillDeed;

  // ExchangeDeed State (رسم مناقلة)
  exchangeDeed?: ExchangeDeed;

  // DeliveryDeed State (رسم تسليم بعوض)
  deliveryDeed?: DeliveryDeed;
  
  // Surface Rights (حق السطحية) Specifics
  surfaceRights?: {
    isLandRegistered?: 'نعم' | 'لا' | '';
    landRegistrationNumber?: string;
    courtRegistration?: {
      register?: string;
      number?: string;
      letter?: string;
      page?: string;
      count?: string;
      date?: string;
    };
    isSharedProperty?: 'نعم' | 'لا' | '';
    allCoOwnersConsent?: 'نعم' | 'لا' | '';
    coOwnersConsentDetails?: string;
    rightType?: 'بنايات' | 'منشآت' | 'أغراس' | '';
    propertyLocation?: string;
    facilityArea?: string;
    buildingAge?: string;
    plantingAge?: string;
    rightStartDate?: string;
    obligations?: {
      surfaceHolder?: {
        buildOrPlantPerContract?: boolean;
        maintainBuilding?: boolean;
        noRebuildAfterDestruction?: boolean;
        canTransferOrMortgage?: boolean;
        civilLiability?: boolean;
        details?: string;
      };
      landOwner?: {
        enableUsage?: boolean;
        monitorNoHarm?: boolean;
        monitorUrbanCompliance?: boolean;
        details?: string;
      };
    };
    terminationModes?: {
      explicitWaiver?: boolean;
      unificationWithLand?: boolean;
      totalDestruction?: boolean;
      other?: string;
    };
    creditorsRightsAcknowledged?: boolean;
    acknowledgeSharedPropertyRules?: boolean;
    acknowledgeRebuildRequiresConsent?: boolean;
    acknowledgeUrbanLaws?: boolean;
    acknowledgeTransferLimits?: boolean;
    acknowledgeCreditorsRights?: boolean;
  };

  // Ornamental Right (حق الزينة) Specifics
  ornamentalRight?: {
    isLandRegistered?: 'نعم' | 'لا' | '';
    landRegistrationNumber?: string;
    courtRegistration?: {
      register?: string;
      number?: string;
      letter?: string;
      page?: string;
      count?: string;
      date?: string;
    };
    isSharedProperty?: 'نعم' | 'لا' | '';
    allCoOwnersConsent?: 'نعم' | 'لا' | '';
    coOwnersConsentDetails?: string;
    buildingType?: 'منزل' | 'محل_تجاري' | 'منشأة' | '';
    buildingSpecs?: {
      area?: string;
      height?: string;
      dimensions?: string;
      floors?: string;
    };
    rightStartDate?: string;
    rightDuration?: string;
    holderObligations?: {
      buildAtOwnExpense?: boolean;
      maintainBuilding?: boolean;
      followUrbanLaws?: boolean;
      noRebuildWithoutPermission?: boolean;
      canTransferOrMortgage?: boolean;
      canEstablishEasements?: boolean;
      details?: string;
    };
    ownerRights?: {
      enableUsage?: boolean;
      monitorUrbanCompliance?: boolean;
      monitorNoHarm?: boolean;
      details?: string;
    };
    terminationModes?: {
      durationEnd?: boolean;
      explicitWaiver?: boolean;
      unificationWithLand?: boolean;
      totalDestruction?: boolean;
      agreementOnFate?: string;
    };
    acknowledgeSharedPropertyRules?: boolean;
    acknowledgeMaxDuration40Years?: boolean;
    acknowledgeRebuildRequiresPermission?: boolean;
    acknowledgeUrbanLaws?: boolean;
    acknowledgeCreditorsRights?: boolean;
    acknowledgeGoodFaithBuilder?: boolean;
  };

  // Omra (العمري - Usufruct for Life) Specifics
  omra?: {
    omraType?: 'بعمر_المعطى_له' | 'بعمر_المعطي' | 'لمدة_محددة' | 'غير_محددة' | '';
    specifiedDuration?: string;
    propertyNature?: 'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ' | '';
    propertyRegistrationNumber?: string;
    isGiverOwner?: 'نعم' | 'لا' | '';
    ownershipBasis?: string;
    ownershipDocuments?: string;
    usageType?: 'إقامة_فعلية' | 'أخذ_الغلة' | 'غير_ذلك' | '';
    usageDetails?: string;
    transferOnlyToGiver?: boolean;
    effects?: {
      beneficiaryRights?: {
        usufruct?: boolean;
        exploitation?: boolean;
        ordinaryExpenses?: boolean;
        maintainAsCarefulOwner?: boolean;
      };
      giverRights?: {
        retainsOwnership?: boolean;
        recoversRightAtEnd?: boolean;
      };
    };
    responsibilities?: {
      minorRepairs?: 'على_المعطى_له';
      majorRepairs?: 'على_المعطي';
      ordinaryTaxes?: 'على_المعطى_له';
    };
    terminationModes?: {
      deathOfBeneficiary?: boolean;
      deathOfGiver?: boolean;
      durationEnd?: boolean;
      mutualAgreement?: boolean;
      totalLossOfProperty?: boolean;
    };
    acknowledgeNoConsideration?: boolean;
    acknowledgeNoNeedForPossession?: boolean;
    acknowledgeFormalDocument?: boolean;
    acknowledgeInheritanceOnlyToGiver?: boolean;
    acknowledgeEndsAtDeath?: boolean;
    acknowledgeNoTransferToThirdParty?: boolean;
    acknowledgeNotGiftOrWill?: boolean;
    acknowledgeRegistrationRequired?: boolean;
  };

  // Paternity Acknowledgment (رسم الاقرار ببنوة/عقد الاستلحاق) Specifics
  paternityAcknowledgment?: {
    requestType?: 'استلحاق' | 'إقرار_ببنوة_فقط' | 'حمل_أثناء_الخطبة' | 'إنكار_ثم_إقرار' | 'مرض_المخلف' | 'قاصر_للمستلحقة' | '';
    acknowledgerMentalState?: 'نعم' | 'لا' | '';
    biologicalPossibility?: 'نعم' | 'لا' | '';
    relationshipType?: 'زواج_قائم' | 'خطبة_وحمل' | 'علاقة_غير_موثقة' | 'غير_معلوم' | '';
    isDenialThenAcknowledgment?: boolean;
    isPregnancyDuringEngagement?: boolean;
    isFearfulIllness?: boolean;
    acknowledgeFatherOnly?: boolean;
    acknowledgeAwarenessRequired?: boolean;
    acknowledgeNoContradiction?: boolean;
    acknowledgeUnknownLineage?: boolean;
  };

  // Lineage Proof by Hearsay (ثبوت نسب ببينة السماع) Specifics
  lineageProofByHearsay?: {
    applicantName?: string;
    applicantDateOfBirth?: string;
    applicantMaritalStatus?: 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل' | '';
    applicantAddress?: string;
    applicantProfession?: string;
    applicantIdNumber?: string;
    applicantNationality?: string;
    allegedFatherName?: string;
    motherName?: string;
    marriageRelationship?: 'زواج_قائم' | 'لا_يوجد_زواج' | 'زواج_منتهي' | '';
    childDateOfBirth?: string;
    hasWidespreadRumor?: 'نعم' | 'لا' | '';
    hasCredibleWitnesses?: 'نعم' | 'لا' | '';
    witnessesHaveFullKnowledge?: 'نعم' | 'لا' | '';
    witnessesContemporary?: 'نعم' | 'لا' | '';
    noContradictionInStatements?: 'نعم' | 'لا' | '';
    noOppositionToOfficialDocs?: 'نعم' | 'لا' | '';
    witnessQuestions?: {
      knowsApplicantWell?: 'نعم' | 'لا' | '';
      yearsKnowingFamily?: 'أقل_من_5' | '5_10' | 'أكثر_من_10' | '';
      sourceOfKnowledge?: 'معاشرة' | 'جوار' | 'قرابة' | 'مصاهرة' | 'مخالطة_اجتماعية' | '';
      heardWidespreadRumor?: 'نعم' | 'لا' | '';
      fatherPracticalAcknowledgment?: 'يضنها' | 'يجالسها' | 'يعولها' | 'يذكرها_كبنته' | 'لا_يعرف' | '';
      publicReputationOfLineage?: 'نعم' | 'لا' | '';
      anyoneOpposedLineage?: 'نعم' | 'لا' | '';
    }[];
    isMotherUnmarried?: boolean;
    isMotherMarriedToOther?: boolean;
    isFatherDeceased?: boolean;
    isFatherForeign?: boolean;
    needsCivilRegistration?: boolean;
    hasOpenLawsuit?: 'نعم' | 'لا' | '';
    hasPreviousJudgment?: 'نعم' | 'لا' | '';
    acknowledgeNoOpenDispute?: boolean;
    acknowledgeHearsayNotDirectAcknowledgment?: boolean;
    acknowledgeNoIllegitimateLineage?: boolean;
    acknowledgeCivilRegistrationSeparate?: boolean;
  };

  // Gift Deed (هبة) Specifics
  giftDeed?: {
    donorGender?: 'ذكر' | 'أنثى' | '';
    doneeGender?: 'ذكر' | 'أنثى' | '';
    donorDoneeRelation?: 'زوج/زوجة' | 'ولد/ابنة' | 'قريب' | 'أجنبي' | 'وصي/ولي/كافل' | 'آخر' | '';
    donorDoneeRelationOther?: string;
    donorCapacity?: 'كامل' | 'ناقص' | 'فاقد' | '';
    doneeCapacity?: 'كامل' | 'ناقص' | 'فاقد' | 'قاصر' | '';
    hasLegalRepresentativeForMinor?: boolean;
    legalRepresentativeRole?: 'ولي' | 'وصي' | 'كافل' | 'نائب_شرعي_آخر' | '';
    receivingNotaryName?: string;
    supervisingJudgeInvolved?: boolean;
    supervisingJudgeReason?: string;
    contractKeepingEntity?: string;
    giftedAssetType?: ('عقار' | 'حق_عيني' | 'منقول' | 'عقار_محفظ' | 'عقار_في_طور_التحفيظ' | 'عقار_غير_محفظ' | 'ملك_مشاع' | 'ملك_مفرز')[];
    giftedAssetDescription?: string;
    hasTitleDeed?: 'محفظ' | 'في_طور_التحفيظ' | 'غير_محفظ' | '';
    landRegistryNumber?: string;
    preRegistrationApplicationNumber?: string;
    encumbrances?: ('رهن' | 'ارتفاق' | 'حجز' | 'نزاع_قضائي' | 'لا_شيء')[];
    hasOfferAndAcceptance?: boolean;
    isFormalOfficialDeed?: boolean;
    donorCapacityMeetsRequirements?: boolean;
    donorOwnsAsset?: boolean;
    acceptanceBeforeDeath?: boolean;
    registrationReplacesPossessionForRegistered?: boolean;
    possessionMode?: 'فعلي' | 'قانوني_بالتحفيظ' | 'نيابي_لقاصر' | 'غير_متاح' | '';
    possessionNotes?: string;
    hasRevocationCondition?: boolean;
    revocationType?: 'مطلق' | 'مقيد' | 'لأسباب_محددة' | '';
    revocationReasonsDetails?: string;
    impedimentsToRevocation?: ('زوجية_قائمة' | 'وفاة_أحد_الطرفين' | 'مرض_مخوف' | 'زواج_بسبب_الهبة' | 'تفويت_كامل' | 'تغير_جوهري_في_القيمة' | 'تعامل_الغير_اعتماداً_على_الهبة' | 'هلاك_جزئي_أو_كلي')[];
    autoRevocationWarningTriggered?: boolean;
    isMinorDoneeBranch?: boolean;
    minorBranchLegalRepresentativeRequired?: boolean;
    minorBranchAcceptanceByRepresentative?: boolean;
    minorBranchPossessionByInspection?: boolean;
    minorBranchMayAppointStepParent?: boolean;
    minorBranchCourtAuthorizationNeeded?: boolean;
    isDeathIllnessGift?: boolean;
    donorHasHeirs?: boolean | null;
    taxDeclarationDone?: boolean;
    registrationTaxPaid?: boolean;
    registrationTaxNote?: string;
    conservationFilingDone?: boolean;
    collectionOrderExtracted?: boolean;
    giftRegisteredInLandRegistry?: boolean;
    encumbrancesClearedWhenNeeded?: boolean;
    warnDonorMustBeCapableOwner?: boolean;
    warnGiftVoidIfDonorDiesBeforeAcceptance?: boolean;
    warnNoRevocationBetweenSpouses?: boolean;
    warnDeathIllnessSubjectToWillRules?: boolean;
    warnCannotGiftOthersProperty?: boolean;
  };
  
  // Marital Assets Agreement (اتفاق تدبير اموال زوجية)
  maritalAssetsAgreement?: {
    marriageContractNumber?: string;
    marriageContractDate?: string;
    marriageContractNotary?: string;
    marriageContractBook?: string;
    marriageContractPage?: string;
    financialSystemType?: 'مشاركة_كاملة' | 'مشاركة_جزئية' | 'انفصال_مالي' | 'نظام_مخصص' | '';
    partialPartnershipType?: string[];
    partnershipPercentages?: 'مناصفة_50_50' | 'نسبة_70_30' | 'نسبة_30_70' | 'مشاركة_مشاعة' | 'أخرى' | '';
    customPercentageHusband?: number;
    customPercentageWife?: number;
    includedAssetSources?: string[];
    inheritanceExcluded?: boolean;
    giftExcluded?: boolean;
    exclusionNotes?: string;
    managementAuthority?: 'كلاهما' | 'الزوج' | 'الزوجة' | 'بالتفويض' | '';
    bankWithdrawalType?: 'منفرد' | 'مشترك' | 'رقابة_متبادلة' | '';
    financialObligationsBindOther?: 'نعم' | 'لا' | '';
    liquidationTriggers?: string[];
    liquidationMethod?: 'تقسيم_بالتساوي' | 'بنسبة' | 'بتقدير_القاضي' | 'تصفية_محاسباتية' | '';
    liquidationPercentageHusband?: number;
    liquidationPercentageWife?: number;
    hasMinorChildren?: 'نعم' | 'لا' | '';
    hasUnregisteredProperty?: 'نعم' | 'لا' | '';
    hasCommercialCompany?: 'نعم' | 'لا' | '';
    hasMixedAssets?: 'نعم' | 'لا' | '';
    acknowledgeNoInheritanceOverride?: boolean;
    acknowledgePostMarriageOnly?: boolean;
    acknowledgeNotCommercialPartnership?: boolean;
    acknowledgeEvidenceRequirements?: boolean;
  };
  
  // Official Real Estate Mortgage (الرهن الرسمي)
  officialMortgage?: {
    isPropertyRegistered?: 'نعم' | 'لا' | '';
    propertyRegistrationNumber?: string;
    propertyLocation?: string;
    propertyDescription?: string;
    mortgageType?: 'اتفاقي' | 'إجباري' | '';
    sourceInstrument?: string;
    isBankLoan?: 'نعم' | 'لا' | '';
    creditorType?: 'بنك' | 'مؤسسة_ائتمان' | 'شخص_ذاتي' | 'شخص_معنوي' | '';
    creditorName?: string;
    loanContractRef?: string;
    securedDebtAmount?: number;
    securedDebtAmountInWords?: string;
    interestType?: 'ثابت' | 'متغير' | 'بدون_فوائد' | '';
    interestRate?: number;
    maturityDate?: string;
    debtorType?: 'شخص_ذاتي' | 'شخص_معنوي' | '';
    mortgagorRole?: 'مدين' | 'كفيل_عيني' | '';
    hasThirdPartyOwner?: boolean;
    hasPriorMortgages?: boolean;
    priorMortgagesDescription?: string;
    hasReservationsOrSeizures?: boolean;
    reservationsDescription?: string;
    terminationByPayment?: boolean;
    terminationByWaiver?: boolean;
    terminationByForcedSale?: boolean;
    terminationByPurge?: boolean;
    terminationByCourtJudgment?: boolean;
    alertNoOwnershipOnDefault?: boolean;
    alertNeedsCPCProcedure?: boolean;
    alertCannotCoverFutureRevenuesOnly?: boolean;
    alertMustDefineDebtAndTerm?: boolean;
    alertRespectRanking?: boolean;
    workflowReviewedTitle?: boolean;
    workflowCheckedRCExtract?: boolean;
    workflowCheckedBankOffer?: boolean;
    workflowExplainedRankingToParties?: boolean;
    workflowPlanForRegistration?: boolean;
    smartIsBankLoan?: 'نعم' | 'لا' | '';
    smartDebtorType?: 'شخص_ذاتي' | 'شخص_معنوي' | '';
    smartRegistrationStatus?: 'مسجل' | 'غير_مسجل' | '';
    smartHasPriorMortgages?: 'نعم' | 'لا' | '';
    smartHasReservations?: 'نعم' | 'لا' | '';
    smartDebtFixedOrVariable?: 'ثابت' | 'متغير' | '';
    smartHasRealGuarantor?: 'نعم' | 'لا' | '';
    smartMaturityExceeded?: 'نعم' | 'لا' | '';
  };
  
  // Possessory Mortgage (رهن حيازي)
  possessoryMortgage?: {
    isPropertyRegistered?: 'نعم' | 'لا' | '';
    propertyRegistrationNumber?: string;
    possessionInspectionRequired?: boolean;
    mortgageType?: 'حيازي';
    propertyLocation?: string;
    propertyArea?: string;
    propertyComponents?: string;
    propertyRegistrationRef?: string;
    securedDebtAmount?: number;
    securedDebtAmountInWords?: string;
    debtDuration?: string;
    debtDurationInMonths?: number;
    mortgageTerms?: string;
    pledgorRole?: 'مدين' | 'كفيل_عيني' | '';
    acknowledgeOfficialContract?: boolean;
    acknowledgeDefinedDuration?: boolean;
    acknowledgePossessionInspection?: boolean;
    acknowledgeOwnership?: boolean;
    acknowledgeCapacity?: boolean;
    creditorRightPossession?: boolean;
    creditorRightAuctionSale?: boolean;
    creditorRightRecovery?: boolean;
    creditorRightFruits?: boolean;
    creditorRightRepairs?: boolean;
    debtorRightEarlyPayment?: boolean;
    debtorObligationExpenses?: boolean;
    terminationDebtExtinguished?: boolean;
    terminationCreditorWaiver?: boolean;
    terminationPropertyDestruction?: boolean;
    terminationMerger?: boolean;
    terminationForcedSale?: boolean;
    acknowledgeNoAutomaticOwnership?: boolean;
    acknowledgeIndivisibility?: boolean;
    acknowledgeMinorRestrictions?: boolean;
    acknowledgeCreditorLiability?: boolean;
    acknowledgeExpenseDeduction?: boolean;
  };
  
  // Long-term Lease (كراء طويل الأمد)
  longTermLease?: {
    isPropertyRegistered?: 'نعم' | 'لا' | '';
    propertyRegistrationNumber?: string;
    courtRegistrationInfo?: string;
    leaseNature?: 'عيني' | 'طويل_الأمد' | '';
    leaseDurationYears?: number;
    leaseScope?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
    tenantRightEnjoyment?: boolean;
    tenantObligationMaintenance?: boolean;
    tenantProhibitValueReduction?: boolean;
    tenantRightAttachments?: boolean;
    tenantRightEasement?: boolean;
    landlordRightDelivery?: boolean;
    landlordRightRent?: boolean;
    landlordRightJudicialAction?: boolean;
    landlordObligationHumanitarian?: boolean;
    terminationContractEnd?: boolean;
    terminationNonPayment?: boolean;
    terminationDamage?: boolean;
    acknowledgeDuration10to40?: boolean;
    acknowledgeOfficialDocument?: boolean;
    acknowledgeNoEscape?: boolean;
    acknowledgeImprovementsOwnership?: boolean;
    acknowledgeRepairObligation?: boolean;
  };
  
  // Waqf/Habous Contract (عقد تحبيس)
  waqfContract?: {
    documentType?: 'محضر_إشهاد' | 'وثيقة_موثقة' | '';
    documentNumber?: string;
    court?: string;
    documentDate?: string;
    documentTime?: string;
    propertyType?: 'عقار' | 'منقول' | '';
    propertyLocation?: string;
    propertyRegistrationNumber?: string;
    propertyArea?: string;
    propertyDescription?: string;
    propertyBoundaries?: string;
    waqfNature?: 'عام' | 'خاص_أهلي' | '';
    waqfDuration?: 'مؤبد' | 'مؤقت' | '';
    waqfEndDate?: string;
    beneficiaryEntity?: string;
    benefitDistribution?: string;
    priorities?: string;
    acknowledgePublicNotary?: boolean;
    possessionTransferred?: boolean;
    transferredDate?: string;
    impossiblePossessionReason?: string;
    hasMinorBeneficiary?: boolean;
    legalRepresentative?: string;
    allowsReturn?: boolean;
    returnCondition?: string;
    acknowledgeIrrevocable?: boolean;
    acknowledgePossessionImportant?: boolean;
    acknowledgeExistingRights?: boolean;
    acknowledgeForbiddenDisposal?: boolean;
    acknowledgeHistoricalDocuments?: boolean;
  };
  
  tawkilScope?: TawkilScope;
  agentDismissal?: AgentDismissalDeed;

  // Administrative Certificates
  certificates: AdministrativeCertificate[];
  law2590: boolean;

  finance: FinanceDetails;
  meta: DocumentMeta;
  postRegistration: PostRegistrationDetails;
  draft: string;
  validationAlerts: ValidationAlert[];
  auditTrail: AuditEntry[];
  isDraftSaved: boolean;


  // Legal Entity Workflow State
  legalEntitySetupStep?: number;
  legalEntityTransactionType?: 'buyer_legal' | 'seller_legal';
  legalEntitySellerStatus?: 'natural' | 'legal';
  isEnteringNaturalPartyFirst?: boolean;
  isEnteringNaturalPartySecond?: boolean;
  
  // Step 7 Persistent State (Phase 3 Workflow)
  step7Step?: 'fiscal_draft' | 'registration_input' | 'fiscal_nature_choice' | 'post_judge_registration' | 'fiscal_semi_final' | 'judicial_review' | 'inclusion' | 'final' | 'normal_draft' | 'normal_semi_final';
  step7FiscalNature?: 'subject' | 'exempt' | null;
  step7RegistrationOrder?: 'before_judge' | 'after_judge' | null;
  step7JudgeSubmissionId?: string | null;
  step7JudgeSendError?: string | null;
  step7ShowDeedPreviewModal?: boolean;
  step7DeedPreviewText?: string;
  step7JudgeAttachment?: { name: string; size: number; base64: string; type?: string } | null;
  step7VaultModal?: { isOpen: boolean; title: string; type: 'certificates' | 'ids' };
  rasmHtml?: string;
  selectedHeaderId?: string;
  manualRasmFile?: File | null;
  preReceptionVerification?: PreReceptionVerificationData;
  marriageClassification?: SmartMarriageClassificationData;
  divorceClassification?: SmartDivorceClassificationData;
  [key: string]: any;
}

export interface JudgePermissionDetails {
  permissionNumber?: string;
  permissionDate?: string;
  courtName?: string;
  judgeName?: string;
  issueDate?: string;
  reason?: string;
  attachment?: { name: string; size: number; base64?: string; url?: string; type?: string } | null;
  isVerified?: boolean;
  verificationSource?: 'manual' | 'qr' | 'digital' | 'database';
  statusText?: string;
}

export interface NoticeDetails {
  noticeNumber?: string;
  noticeDate?: string;
  receivedDate?: string;
  destination?: string;
  courtName?: string;
  regionalCouncil?: string;
  attachment?: { name: string; size: number; base64?: string; url?: string; type?: string } | null;
}

export interface PreReceptionVerificationData {
  isSimultaneousCouncil?: boolean;
  notary1Name: string;
  notary2Name: string;
  receptionDate: string;
  receptionTime: string;
  receptionCouncil: string;
  receptionLocation: string;
  operationNumber: string;
  hasJudgePermission?: boolean;
  judgePermissionDetails: JudgePermissionDetails;
  isWithinJurisdiction?: boolean;
  appealCourt: string;
  primaryCourt: string;
  officeLocation: string;
  judgeNotice: NoticeDetails;
  councilNotice: NoticeDetails;
  complianceStatus?: 'compliant' | 'blocked' | 'pending';
  complianceCompletedAt?: string;
  timeline?: Array<{
    id: string;
    timestamp: string;
    title: string;
    status: 'info' | 'success' | 'warning' | 'error';
  }>;
  registryRecord?: {
    number?: string;
    count?: string;
    page?: string;
    receptionDate?: string;
  };
}

export interface FeesAgentProps {
  initialState?: FeesAgentState | null;
  initialJudgeSubmissionId?: string | null;
  startMode?: 'intake' | 'drafting';
}

