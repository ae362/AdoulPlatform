// ============================================================================
// Types for «بيع الأصل التجاري» (Sale of Commercial Business / Business Goodwill)
// Regulated primarily under Articles 79 to 98 of the Moroccan Commercial Code (Dahir 1-96-83 / Law 15.95),
// Law 49.16 (Commercial Leases, Art. 25), and Labour Code (Art. 19).
// Zero Mock Data — 100% Deterministic & Strongly Typed.
// ============================================================================

export type BusinessDisposalScope =
  | 'بيع_أصل_تجاري_كامل'
  | 'بيع_فرع_من_فروع_الأصل_التجاري'
  | 'تفويت_حق_الكراء_مع_الأصل_التجاري'
  | 'تفويت_بعض_عناصر_الأصل_التجاري'
  | 'تقديم_الأصل_التجاري_حصة_في_شركة'
  | 'بيع_الأصل_التجاري_بالمزاد_تنفيذ_قضائي';

export type CommercialRegisterStatus = 'مسجل' | 'غير_مسجل' | 'البيانات_غير_متطابقة';

export interface CommercialRegisterReference {
  courtName: string;
  rcNumber: string;
  chronologicalNumber?: string;
  commercialName: string;
  legalForm: string;
  mainActivity: string;
  headquartersAddress: string;
  branchesSummary?: string;
  registrationDate: string;
  currentStatus: string;
  iceNumber?: string;
  patentNumber?: string;
}

export type PartyLegalNature = 'شخص_طبيعي' | 'شخص_معنوي' | 'شركاء_على_الشياع' | 'ورثة' | 'مصف' | 'وكيل' | 'حالة_خاصة';

export interface BusinessSellerParty {
  legalNature: PartyLegalNature;
  fullName: string;
  nationalId: string;
  fatherName?: string;
  motherName?: string;
  birthDate?: string;
  birthPlace?: string;
  address: string;
  profession?: string;
  phone?: string;
  sharePercentage?: string; // For joint ownership
  // Legal Entity Details (if company)
  companyName?: string;
  companyRc?: string;
  companyIce?: string;
  companyHeadquarters?: string;
  representativeName?: string;
  representativeCapacity?: string;
  representativePowerSource?: string;
  isSingleSignatory?: boolean;
  corporateApprovalNumber?: string;
  corporateApprovalDate?: string;
}

export interface BusinessBuyerParty {
  legalNature: 'شخص_طبيعي' | 'شخص_معنوي';
  fullName: string;
  nationalId: string;
  fatherName?: string;
  motherName?: string;
  birthDate?: string;
  birthPlace?: string;
  address: string;
  profession?: string;
  phone?: string;
  isAlreadyMerchant: 'تاجر_مسجل' | 'شركة_مسجلة' | 'سيصبح_تاجرا_بسبب_العملية' | 'حالة_أخرى';
  existingRcNumber?: string;
  // Legal Entity Details (if company)
  companyName?: string;
  companyRc?: string;
  companyIce?: string;
  companyHeadquarters?: string;
  representativeName?: string;
  representativeCapacity?: string;
}

export interface LeaseholdRightDetails {
  isOperatingInRentedPremises: boolean;
  isLeaseIncludedInSale: 'نعم_مع_الأصل_التجاري' | 'لا' | 'الحق_في_الكراء_وحده' | 'يحتاج_إلى_مراجعة';
  lessorName: string;
  lessorAddress: string;
  tenantOriginalName: string;
  leaseContractDate: string;
  leaseDuration: string;
  monthlyRentAmount: string;
  paymentMethod: string;
  premisesDescription: string;
  rentalDebtsSummary: string;
  hasLitigation: boolean;
  litigationDetails?: string;
  // Lessor Notification (المادة 25 من القانون 49.16)
  notificationStatus: 'لم_يتم_بعد' | 'تم_التبليغ_رسميا' | 'تعذر_التبليغ' | 'يوجد_نزاع_حول_التبليغ';
  notificationDate?: string;
  notificationMethod?: string;
  notificationDocumentRef?: string;
  isPremisesOwnedBySeller: boolean;
  isRealEstateSoldConcurrently: boolean;
}

export interface TangibleGoodsItem {
  id: string;
  description: string;
  quantity: string;
  unitValue: string;
  totalValue: string;
  stateCondition: string;
}

export interface EquipmentToolItem {
  id: string;
  name: string;
  quantity: string;
  estimatedValue: string;
  conditionStatus: string;
  isIncludedInSale: boolean;
}

export interface EmployeeContractItem {
  id: string;
  fullName: string;
  nationalId: string;
  jobTitle: string;
  seniorityDate: string;
  monthlySalary: string;
  socialSecurityNumber?: string;
  contractStatus: string;
}

export interface BusinessBranchItem {
  id: string;
  branchName: string;
  address: string;
  activity: string;
  rcNumber?: string;
  isIncludedInSale: boolean;
}

export interface CreditorOppositionItem {
  id: string;
  creditorName: string;
  debtAmount: string;
  debtCause: string;
  chosenDomicile: string; // الموطن المختار بدائرة المحكمة (إلزامي وفق المادة 84)
  oppositionDate: string;
  courtName: string;
  documentRef?: string;
  status: 'قائم' | 'تم_رفع_اليد' | 'سدد';
}

export interface BusinessSaleFinancials {
  totalPrice: number;
  totalPriceInWords: string;
  // Mandatory 3-way distinction under Art. 81
  intangibleElementsPrice: number;
  goodsInventoryPrice: number;
  equipmentToolsPrice: number;
  paymentMethod: 'إيداع_لدى_جهة_مؤهلة' | 'دفع_كامل' | 'دفع_جزئي' | 'شيك_بنكي' | 'تحويل_بنكي';
  depositoryEntityName: string; // جهة الإيداع المؤهلة قانوناً (المادة 81)
  depositoryDepositDate?: string;
  depositoryReceiptNumber?: string;
  deferredAmount: number;
  deferredDueDate?: string;
  deferredGuarantee?: string;
}

export interface TimelinePublicationState {
  contractDate: string;
  registrationDate?: string;
  depositClerkDate?: string;
  rcRegistrationDate?: string;
  firstPublicationDate?: string;
  firstPublicationJournal?: string;
  secondPublicationDate?: string; // Between 8th and 15th day
  secondPublicationJournal?: string;
  oppositionDeadlineStart?: string;
  oppositionDeadlineEnd?: string; // 15 days after 2nd publication
  hasPendingOpposition: boolean;
  sellerLienRegistered: boolean; // امتياز البائع المادة 92
  sellerLienDate?: string;
}

export interface BusinessSaleState {
  // 1. Operation Type & Header
  disposalScope: BusinessDisposalScope;
  saleStatus: 'قيد_الفحص' | 'مستوف' | 'مانع_قانوني';

  // 2. Commercial Register & Triple Matching
  crStatus: CommercialRegisterStatus;
  crRef: CommercialRegisterReference;
  isTripleMatched: boolean;
  matchingDiscrepancyNotes?: string;

  // 3. Parties
  seller: BusinessSellerParty;
  coSellers: BusinessSellerParty[]; // For joint owners (الشياع)
  buyer: BusinessBuyerParty;
  hasProxy: boolean;
  proxyDetails?: string;

  // 4. Intangible Elements (العناصر المعنوية - المادة 80)
  hasCustomers: boolean; // الزبناء
  commercialReputationDescription: string; // السمعة التجارية
  commercialNameIncluded: boolean; // الاسم التجاري
  commercialNameStated?: string;
  emblemIncluded: boolean; // الشعار / اللافتة
  emblemDescription?: string;
  industrialPropertyRights?: {
    trademarks?: string;
    patents?: string;
    industrialDesigns?: string;
  };
  licensesAndAuthorizations?: {
    licenseName?: string;
    issuingAuthority?: string;
    licenseNumber?: string;
    isTransferable?: boolean;
  };
  associatedContracts?: {
    supplierContracts?: string;
    franchiseAgreements?: string;
    serviceAgreements?: string;
  };

  // 5. Commercial Lease & Landlord Notification (الحق في الكراء والمادة 25)
  leasehold: LeaseholdRightDetails;

  // 6. Tangible Elements (العناصر المادية)
  goodsIncluded: 'نعم' | 'لا' | 'بعضها';
  goodsList: TangibleGoodsItem[];
  equipmentIncluded: boolean;
  equipmentList: EquipmentToolItem[];

  // 7. Labour & Employees (الأجراء والمادة 19 من مدونة الشغل)
  hasEmployees: boolean;
  employeesList: EmployeeContractItem[];

  // 8. Branches (الفروع والمادة 83)
  hasBranches: boolean;
  branchesList: BusinessBranchItem[];

  // 9. Scope Summary & Exclusions (النطاق والعناصر المستثناة)
  includedElementsSummary: string[];
  excludedElementsExplicit: string;

  // 10. Financial Breakdown (الثمن وتوزيعه الثلاثي وإيداعه)
  financials: BusinessSaleFinancials;

  // 11. Mortgages, Liens & Previous Ownership (الرهون والامتيازات ومصدر الملكية)
  isPledgedOrEncumbered: boolean;
  pledgeDetails?: {
    pledgeType?: string;
    creditorName?: string;
    debtAmount?: string;
    registrationNumber?: string;
    courtName?: string;
    hasDischarge?: boolean;
  };
  ownershipOriginType: 'إنشاء_الأصل' | 'شراء_سابق' | 'تفويت' | 'إرث' | 'حصة_في_شركة' | 'قسمة' | 'مزاد' | 'حكم_قضائي';
  ownershipOriginDetails?: string;
  previousContractReference?: string;

  // 12. Oppositions & Creditor Rights (التعرضات وزيادة السدس)
  timeline: TimelinePublicationState;
  oppositionsList: CreditorOppositionItem[];
  hasSixthIncreaseProceeding: boolean; // زيادة السدس (المادة 94)

  // 13. Legal Litigation & Distraint (الحجوز والدعاوى وصعوبات المقاولة)
  hasLitigation: boolean;
  litigationNotes?: string;
  isSeizedOrDistrained: boolean;
  distraintDetails?: string;
  isUnderBankruptcyOrRestructuring: boolean;
  restructuringProcedure?: 'الوقاية' | 'التسوية_القضائية' | 'التصفية_القضائية';

  // 14. Moroccan Legal Draft & Metadata
  legalDraftArabic?: string;
}
