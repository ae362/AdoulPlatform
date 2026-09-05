import type { DocumentType, PartyLabels } from '../constants/feesAgentLocales';

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
  profession?: string;
  dateOfBirth?: string;
  idImage: File | null;
  share?: string; // حصة الطرف (للبائع أو المشتري)
  ocrExtracted?: {
    name?: string;
    idNumber?: string;
    issueDate?: string;
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
  correspondingDate?: string; // موافق
  
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

export interface Witness extends Party {
  dateOfBirth: string;
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

// PromiseToSell Type (رسم وعد بالبيع)
export interface PromiseToSell {
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
  familyName?: string;
  firstName?: string;
  fatherName?: string;
  motherName?: string;
  birthplace?: string;
  birthdate?: string;
  cin?: string;
  nationality?: string;
  occupation?: string;
  address?: string;
}

export interface BilingualPersonIdentity {
  ar?: PersonIdentityFields;
  lat?: PersonIdentityFields;
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
  [key: string]: any;
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

  // PromiseToSell State (رسم وعد بالبيع)
  promiseToSell?: PromiseToSell;

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
  
  dowry?: DowryDetails;
  tawkilScope?: TawkilScope;

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
  [key: string]: any;
}

export interface FeesAgentProps {
  initialState?: FeesAgentState | null;
  initialJudgeSubmissionId?: string | null;
  startMode?: 'intake' | 'drafting';
}
