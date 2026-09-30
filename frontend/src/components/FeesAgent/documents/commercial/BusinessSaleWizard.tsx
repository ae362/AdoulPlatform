import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  Store,
  Building2,
  FileCheck,
  Scale,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ArrowRight,
  ArrowLeft,
  Send,
  Search,
  UserCheck,
  FileSearch,
  Sparkles,
  Link as LinkIcon,
  Users,
  Eye,
  Layers,
  HelpCircle,
  XCircle,
  DollarSign,
  Calendar,
  Briefcase,
  Package,
  Truck,
  ShieldCheck,
  Clock,
  Landmark,
  BadgeCheck,
  Newspaper
} from 'lucide-react';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import {
  createEmptyParty,
  convertGregorianToHijri,
  convertNumberToArabicWords,
} from '../../../../utils/feesAgentUtils';
import type {
  BusinessSaleState,
  BusinessDisposalScope,
  CommercialRegisterStatus,
  CommercialRegisterReference,
  PartyLegalNature,
  BusinessSellerParty,
  BusinessBuyerParty,
  LeaseholdRightDetails,
  TangibleGoodsItem,
  EquipmentToolItem,
  EmployeeContractItem,
  BusinessBranchItem,
  CreditorOppositionItem,
  BusinessSaleFinancials,
  TimelinePublicationState,
} from './businessSaleTypes';

export const BusinessSaleWizard: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  const { user, notaryProfile } = useAuth();

  // Court and Notary Identity dynamically derived (zero hardcoded values)
  const defaultCourt =
    state.meta?.court ||
    notaryProfile?.primary_court ||
    notaryProfile?.court_name ||
    'المحكمة الابتدائية التجارية المختصة';
  const defaultNotary1 = state.meta?.notaryPrimary || user?.full_name || 'العدل المتلقي الأول';
  const defaultNotary2 = state.meta?.notarySecondary || 'العدل المتلقي الثاني';

  const todayGregorian = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayHijri = useMemo(() => convertGregorianToHijri(todayGregorian), [todayGregorian]);

  // Active Stage in the 7-stage Wizard
  const [activeStage, setActiveStage] = useState<number>(1);

  // ---------------------------------------------------------------------------
  // 1. Operation Scope & Commercial Register
  // ---------------------------------------------------------------------------
  const [disposalScope, setDisposalScope] = useState<BusinessDisposalScope>(
    state.businessSale?.disposalScope || 'بيع_أصل_تجاري_كامل'
  );
  const [crStatus, setCrStatus] = useState<CommercialRegisterStatus>(
    state.businessSale?.crStatus || 'مسجل'
  );

  const [courtName, setCourtName] = useState<string>(
    state.businessSale?.crRef?.courtName || defaultCourt
  );
  const [rcNumber, setRcNumber] = useState<string>(
    state.businessSale?.crRef?.rcNumber || ''
  );
  const [chronologicalNumber, setChronologicalNumber] = useState<string>(
    state.businessSale?.crRef?.chronologicalNumber || ''
  );
  const [commercialName, setCommercialName] = useState<string>(
    state.businessSale?.crRef?.commercialName || ''
  );
  const [legalForm, setLegalForm] = useState<string>(
    state.businessSale?.crRef?.legalForm || 'شخص ذاتي (تاجر)'
  );
  const [mainActivity, setMainActivity] = useState<string>(
    state.businessSale?.crRef?.mainActivity || ''
  );
  const [headquartersAddress, setHeadquartersAddress] = useState<string>(
    state.businessSale?.crRef?.headquartersAddress || ''
  );
  const [registrationDate, setRegistrationDate] = useState<string>(
    state.businessSale?.crRef?.registrationDate || ''
  );
  const [iceNumber, setIceNumber] = useState<string>(
    state.businessSale?.crRef?.iceNumber || ''
  );
  const [patentNumber, setPatentNumber] = useState<string>(
    state.businessSale?.crRef?.patentNumber || ''
  );
  const [isDeedRetrieved, setIsDeedRetrieved] = useState<boolean>(false);

  // Triple Matching Status
  const [isTripleMatched, setIsTripleMatched] = useState<boolean>(
    state.businessSale?.isTripleMatched ?? true
  );
  const [matchingDiscrepancyNotes, setMatchingDiscrepancyNotes] = useState<string>(
    state.businessSale?.matchingDiscrepancyNotes || ''
  );

  // ---------------------------------------------------------------------------
  // 2. Seller Details (البائع - شخص ذاتي أو معنوي أو شياع)
  // ---------------------------------------------------------------------------
  const [sellerLegalNature, setSellerLegalNature] = useState<PartyLegalNature>(
    state.businessSale?.seller?.legalNature || 'شخص_طبيعي'
  );
  const [sellerFullName, setSellerFullName] = useState<string>(
    state.businessSale?.seller?.fullName || ''
  );
  const [sellerNationalId, setSellerNationalId] = useState<string>(
    state.businessSale?.seller?.nationalId || ''
  );
  const [sellerFatherName, setSellerFatherName] = useState<string>(
    state.businessSale?.seller?.fatherName || ''
  );
  const [sellerMotherName, setSellerMotherName] = useState<string>(
    state.businessSale?.seller?.motherName || ''
  );
  const [sellerBirthDate, setSellerBirthDate] = useState<string>(
    state.businessSale?.seller?.birthDate || ''
  );
  const [sellerBirthPlace, setSellerBirthPlace] = useState<string>(
    state.businessSale?.seller?.birthPlace || ''
  );
  const [sellerAddress, setSellerAddress] = useState<string>(
    state.businessSale?.seller?.address || ''
  );
  const [sellerPhone, setSellerPhone] = useState<string>(
    state.businessSale?.seller?.phone || ''
  );
  const [sellerSharePercentage, setSellerSharePercentage] = useState<string>(
    state.businessSale?.seller?.sharePercentage || '100%'
  );

  // Corporate Seller Details (إذا كانت شركة)
  const [companyName, setCompanyName] = useState<string>(
    state.businessSale?.seller?.companyName || ''
  );
  const [companyRc, setCompanyRc] = useState<string>(
    state.businessSale?.seller?.companyRc || ''
  );
  const [companyIce, setCompanyIce] = useState<string>(
    state.businessSale?.seller?.companyIce || ''
  );
  const [companyHeadquarters, setCompanyHeadquarters] = useState<string>(
    state.businessSale?.seller?.companyHeadquarters || ''
  );
  const [representativeName, setRepresentativeName] = useState<string>(
    state.businessSale?.seller?.representativeName || ''
  );
  const [representativeCapacity, setRepresentativeCapacity] = useState<string>(
    state.businessSale?.seller?.representativeCapacity || 'المسير القانوني'
  );
  const [representativePowerSource, setRepresentativePowerSource] = useState<string>(
    state.businessSale?.seller?.representativePowerSource || 'النظام الأساسي ومحضر الجمع العام'
  );
  const [isSingleSignatory, setIsSingleSignatory] = useState<boolean>(
    state.businessSale?.seller?.isSingleSignatory ?? true
  );
  const [corporateApprovalNumber, setCorporateApprovalNumber] = useState<string>(
    state.businessSale?.seller?.corporateApprovalNumber || ''
  );
  const [corporateApprovalDate, setCorporateApprovalDate] = useState<string>(
    state.businessSale?.seller?.corporateApprovalDate || ''
  );

  // Co-sellers on Joint Ownership (الشياع)
  const [coSellers, setCoSellers] = useState<BusinessSellerParty[]>(
    state.businessSale?.coSellers || []
  );

  const addCoSeller = () => {
    const newCoSeller: BusinessSellerParty = {
      legalNature: 'شخص_طبيعي',
      fullName: '',
      nationalId: '',
      address: '',
      sharePercentage: '',
    };
    setCoSellers((prev) => [...prev, newCoSeller]);
  };

  const removeCoSeller = (index: number) => {
    setCoSellers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateCoSeller = (index: number, field: keyof BusinessSellerParty, value: any) => {
    setCoSellers((prev) =>
      prev.map((cs, idx) => (idx === index ? { ...cs, [field]: value } : cs))
    );
  };

  // ---------------------------------------------------------------------------
  // 3. Buyer Details (المشتري)
  // ---------------------------------------------------------------------------
  const [buyerLegalNature, setBuyerLegalNature] = useState<'شخص_طبيعي' | 'شخص_معنوي'>(
    state.businessSale?.buyer?.legalNature || 'شخص_طبيعي'
  );
  const [buyerFullName, setBuyerFullName] = useState<string>(
    state.businessSale?.buyer?.fullName || ''
  );
  const [buyerNationalId, setBuyerNationalId] = useState<string>(
    state.businessSale?.buyer?.nationalId || ''
  );
  const [buyerFatherName, setBuyerFatherName] = useState<string>(
    state.businessSale?.buyer?.fatherName || ''
  );
  const [buyerMotherName, setBuyerMotherName] = useState<string>(
    state.businessSale?.buyer?.motherName || ''
  );
  const [buyerAddress, setBuyerAddress] = useState<string>(
    state.businessSale?.buyer?.address || ''
  );
  const [buyerPhone, setBuyerPhone] = useState<string>(
    state.businessSale?.buyer?.phone || ''
  );
  const [isAlreadyMerchant, setIsAlreadyMerchant] = useState<
    'تاجر_مسجل' | 'شركة_مسجلة' | 'سيصبح_تاجرا_بسبب_العملية' | 'حالة_أخرى'
  >(state.businessSale?.buyer?.isAlreadyMerchant || 'سيصبح_تاجرا_بسبب_العملية');
  const [buyerRcNumber, setBuyerRcNumber] = useState<string>(
    state.businessSale?.buyer?.existingRcNumber || ''
  );

  // Corporate Buyer Details
  const [buyerCompanyName, setBuyerCompanyName] = useState<string>(
    state.businessSale?.buyer?.companyName || ''
  );
  const [buyerCompanyRc, setBuyerCompanyRc] = useState<string>(
    state.businessSale?.buyer?.companyRc || ''
  );
  const [buyerCompanyIce, setBuyerCompanyIce] = useState<string>(
    state.businessSale?.buyer?.companyIce || ''
  );
  const [buyerRepresentativeName, setBuyerRepresentativeName] = useState<string>(
    state.businessSale?.buyer?.representativeName || ''
  );
  const [buyerRepresentativeCapacity, setBuyerRepresentativeCapacity] = useState<string>(
    state.businessSale?.buyer?.representativeCapacity || 'المسير القانوني'
  );

  // Proxy (الوكالة)
  const [hasProxy, setHasProxy] = useState<boolean>(state.businessSale?.hasProxy ?? false);
  const [proxyDetails, setProxyDetails] = useState<string>(state.businessSale?.proxyDetails || '');

  // ---------------------------------------------------------------------------
  // 4. Intangible Elements (العناصر المعنوية - المادة 80 من مدونة التجارة)
  // ---------------------------------------------------------------------------
  const [hasCustomers, setHasCustomers] = useState<boolean>(
    state.businessSale?.hasCustomers ?? true
  );
  const [commercialReputationDescription, setCommercialReputationDescription] = useState<string>(
    state.businessSale?.commercialReputationDescription ||
      'الأصل التجاري يتمتع برواج تجاري مستمر وسمعة طيبة في محيط استغلاله.'
  );
  const [commercialNameIncluded, setCommercialNameIncluded] = useState<boolean>(
    state.businessSale?.commercialNameIncluded ?? true
  );
  const [commercialNameStated, setCommercialNameStated] = useState<string>(
    state.businessSale?.commercialNameStated || ''
  );
  const [emblemIncluded, setEmblemIncluded] = useState<boolean>(
    state.businessSale?.emblemIncluded ?? true
  );
  const [emblemDescription, setEmblemDescription] = useState<string>(
    state.businessSale?.emblemDescription || ''
  );

  // Industrial Property Rights (الملكية الصناعية)
  const [hasIndustrialProperty, setHasIndustrialProperty] = useState<boolean>(false);
  const [trademarkNames, setTrademarkNames] = useState<string>(
    state.businessSale?.industrialPropertyRights?.trademarks || ''
  );
  const [patentNumbers, setPatentNumbers] = useState<string>(
    state.businessSale?.industrialPropertyRights?.patents || ''
  );

  // Licenses & Authorizations (الرخص الإدارية)
  const [hasLicenses, setHasLicenses] = useState<boolean>(false);
  const [licenseName, setLicenseName] = useState<string>(
    state.businessSale?.licensesAndAuthorizations?.licenseName || ''
  );
  const [licenseAuthority, setLicenseAuthority] = useState<string>(
    state.businessSale?.licensesAndAuthorizations?.issuingAuthority || ''
  );
  const [licenseNumber, setLicenseNumber] = useState<string>(
    state.businessSale?.licensesAndAuthorizations?.licenseNumber || ''
  );
  const [licenseIsTransferable, setLicenseIsTransferable] = useState<boolean>(
    state.businessSale?.licensesAndAuthorizations?.isTransferable ?? false
  );

  // ---------------------------------------------------------------------------
  // 5. Commercial Lease & Landlord Notice (الحق في الكراء والمادة 25)
  // ---------------------------------------------------------------------------
  const [isOperatingInRentedPremises, setIsOperatingInRentedPremises] = useState<boolean>(
    state.businessSale?.leasehold?.isOperatingInRentedPremises ?? true
  );
  const [isLeaseIncludedInSale, setIsLeaseIncludedInSale] = useState<
    'نعم_مع_الأصل_التجاري' | 'لا' | 'الحق_في_الكراء_وحده' | 'يحتاج_إلى_مراجعة'
  >(state.businessSale?.leasehold?.isLeaseIncludedInSale || 'نعم_مع_الأصل_التجاري');
  const [lessorName, setLessorName] = useState<string>(
    state.businessSale?.leasehold?.lessorName || ''
  );
  const [lessorAddress, setLessorAddress] = useState<string>(
    state.businessSale?.leasehold?.lessorAddress || ''
  );
  const [leaseContractDate, setLeaseContractDate] = useState<string>(
    state.businessSale?.leasehold?.leaseContractDate || ''
  );
  const [leaseDuration, setLeaseDuration] = useState<string>(
    state.businessSale?.leasehold?.leaseDuration || ''
  );
  const [monthlyRentAmount, setMonthlyRentAmount] = useState<string>(
    state.businessSale?.leasehold?.monthlyRentAmount || ''
  );
  const [premisesDescription, setPremisesDescription] = useState<string>(
    state.businessSale?.leasehold?.premisesDescription || ''
  );
  const [rentalDebtsSummary, setRentalDebtsSummary] = useState<string>(
    state.businessSale?.leasehold?.rentalDebtsSummary || 'لا توجد ديون كرائية متبقية'
  );
  const [hasRentalLitigation, setHasRentalLitigation] = useState<boolean>(
    state.businessSale?.leasehold?.hasLitigation ?? false
  );
  const [rentalLitigationDetails, setRentalLitigationDetails] = useState<string>(
    state.businessSale?.leasehold?.litigationDetails || ''
  );

  // Lessor Notification (إشعار المكري بالتفويت وفق المادة 25)
  const [notificationStatus, setNotificationStatus] = useState<
    'لم_يتم_بعد' | 'تم_التبليغ_رسميا' | 'تعذر_التبليغ' | 'يوجد_نزاع_حول_التبليغ'
  >(state.businessSale?.leasehold?.notificationStatus || 'لم_يتم_بعد');
  const [notificationDate, setNotificationDate] = useState<string>(
    state.businessSale?.leasehold?.notificationDate || ''
  );
  const [notificationMethod, setNotificationMethod] = useState<string>(
    state.businessSale?.leasehold?.notificationMethod || 'مفوض قضائي / إشعار بريدي مع الإشعار بالتوصل'
  );
  const [notificationDocumentRef, setNotificationDocumentRef] = useState<string>(
    state.businessSale?.leasehold?.notificationDocumentRef || ''
  );

  // Seller Owns Premise Distinction
  const [isPremisesOwnedBySeller, setIsPremisesOwnedBySeller] = useState<boolean>(
    state.businessSale?.leasehold?.isPremisesOwnedBySeller ?? false
  );
  const [isRealEstateSoldConcurrently, setIsRealEstateSoldConcurrently] = useState<boolean>(
    state.businessSale?.leasehold?.isRealEstateSoldConcurrently ?? false
  );

  // ---------------------------------------------------------------------------
  // 6. Tangible Elements (البضائع والمعدات والأدوات)
  // ---------------------------------------------------------------------------
  const [goodsIncluded, setGoodsIncluded] = useState<'نعم' | 'لا' | 'بعضها'>(
    state.businessSale?.goodsIncluded || 'نعم'
  );
  const [goodsList, setGoodsList] = useState<TangibleGoodsItem[]>(
    state.businessSale?.goodsList || []
  );

  const addGoodsItem = () => {
    const newItem: TangibleGoodsItem = {
      id: `goods-${Date.now()}`,
      description: '',
      quantity: '1',
      unitValue: '0',
      totalValue: '0',
      stateCondition: 'جيدة وصالحة للاستهلاك والتداول',
    };
    setGoodsList((prev) => [...prev, newItem]);
  };

  const removeGoodsItem = (id: string) => {
    setGoodsList((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGoodsItem = (id: string, field: keyof TangibleGoodsItem, value: string) => {
    setGoodsList((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, [field]: value };
        if (field === 'quantity' || field === 'unitValue') {
          const q = parseFloat(field === 'quantity' ? value : g.quantity) || 0;
          const u = parseFloat(field === 'unitValue' ? value : g.unitValue) || 0;
          updated.totalValue = (q * u).toString();
        }
        return updated;
      })
    );
  };

  // Equipment & Tools
  const [equipmentIncluded, setEquipmentIncluded] = useState<boolean>(
    state.businessSale?.equipmentIncluded ?? true
  );
  const [equipmentList, setEquipmentList] = useState<EquipmentToolItem[]>(
    state.businessSale?.equipmentList || []
  );

  const addEquipmentItem = () => {
    const newItem: EquipmentToolItem = {
      id: `equip-${Date.now()}`,
      name: '',
      quantity: '1',
      estimatedValue: '0',
      conditionStatus: 'جيدة ومستعملة في النشاط',
      isIncludedInSale: true,
    };
    setEquipmentList((prev) => [...prev, newItem]);
  };

  const removeEquipmentItem = (id: string) => {
    setEquipmentList((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEquipmentItem = (id: string, field: keyof EquipmentToolItem, value: any) => {
    setEquipmentList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // ---------------------------------------------------------------------------
  // 7. Employees (الأجراء والمادة 19 من مدونة الشغل)
  // ---------------------------------------------------------------------------
  const [hasEmployees, setHasEmployees] = useState<boolean>(
    state.businessSale?.hasEmployees ?? false
  );
  const [employeesList, setEmployeesList] = useState<EmployeeContractItem[]>(
    state.businessSale?.employeesList || []
  );

  const addEmployeeItem = () => {
    const newItem: EmployeeContractItem = {
      id: `emp-${Date.now()}`,
      fullName: '',
      nationalId: '',
      jobTitle: '',
      seniorityDate: '',
      monthlySalary: '',
      contractStatus: 'عقد غير محدد المدة (CDI)',
    };
    setEmployeesList((prev) => [...prev, newItem]);
  };

  const removeEmployeeItem = (id: string) => {
    setEmployeesList((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEmployeeItem = (id: string, field: keyof EmployeeContractItem, value: string) => {
    setEmployeesList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // ---------------------------------------------------------------------------
  // 8. Branches (فروع الأصل التجاري)
  // ---------------------------------------------------------------------------
  const [hasBranches, setHasBranches] = useState<boolean>(
    state.businessSale?.hasBranches ?? false
  );
  const [branchesList, setBranchesList] = useState<BusinessBranchItem[]>(
    state.businessSale?.branchesList || []
  );

  const addBranchItem = () => {
    const newItem: BusinessBranchItem = {
      id: `branch-${Date.now()}`,
      branchName: '',
      address: '',
      activity: '',
      isIncludedInSale: true,
    };
    setBranchesList((prev) => [...prev, newItem]);
  };

  const removeBranchItem = (id: string) => {
    setBranchesList((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBranchItem = (id: string, field: keyof BusinessBranchItem, value: any) => {
    setBranchesList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // Explicit Exclusions
  const [excludedElementsExplicit, setExcludedElementsExplicit] = useState<string>(
    state.businessSale?.excludedElementsExplicit ||
      'لا يشمل البيع العقار الذي يستغل فيه الأصل التجاري، ولا الديون الشخصية الخاصة بالبائع.'
  );

  // ---------------------------------------------------------------------------
  // 9. Financials & Mandatory 3-way Split (المادة 81 من مدونة التجارة)
  // ---------------------------------------------------------------------------
  const [totalPrice, setTotalPrice] = useState<number>(
    state.businessSale?.financials?.totalPrice || 0
  );
  const [totalPriceInWords, setTotalPriceInWords] = useState<string>(
    state.businessSale?.financials?.totalPriceInWords || ''
  );
  const [intangibleElementsPrice, setIntangibleElementsPrice] = useState<number>(
    state.businessSale?.financials?.intangibleElementsPrice || 0
  );
  const [goodsInventoryPrice, setGoodsInventoryPrice] = useState<number>(
    state.businessSale?.financials?.goodsInventoryPrice || 0
  );
  const [equipmentToolsPrice, setEquipmentToolsPrice] = useState<number>(
    state.businessSale?.financials?.equipmentToolsPrice || 0
  );

  const [paymentMethod, setPaymentMethod] = useState<
    'إيداع_لدى_جهة_مؤهلة' | 'دفع_كامل' | 'دفع_جزئي' | 'شيك_بنكي' | 'تحويل_بنكي'
  >(state.businessSale?.financials?.paymentMethod || 'إيداع_لدى_جهة_مؤهلة');
  const [depositoryEntityName, setDepositoryEntityName] = useState<string>(
    state.businessSale?.financials?.depositoryEntityName || 'صندوق الإيداع والتدبير / الحساب البنكي المعتمد'
  );
  const [depositoryDepositDate, setDepositoryDepositDate] = useState<string>(
    state.businessSale?.financials?.depositoryDepositDate || ''
  );
  const [depositoryReceiptNumber, setDepositoryReceiptNumber] = useState<string>(
    state.businessSale?.financials?.depositoryReceiptNumber || ''
  );
  const [deferredAmount, setDeferredAmount] = useState<number>(
    state.businessSale?.financials?.deferredAmount || 0
  );
  const [deferredDueDate, setDeferredDueDate] = useState<string>(
    state.businessSale?.financials?.deferredDueDate || ''
  );
  const [deferredGuarantee, setDeferredGuarantee] = useState<string>(
    state.businessSale?.financials?.deferredGuarantee || 'امتياز البائع المقيد بالسجل التجاري وفق المادة 91'
  );

  // Auto-calculated sum of parts
  const sumOfParts = useMemo(
    () => (intangibleElementsPrice || 0) + (goodsInventoryPrice || 0) + (equipmentToolsPrice || 0),
    [intangibleElementsPrice, goodsInventoryPrice, equipmentToolsPrice]
  );

  const isPriceDistributionBalanced = useMemo(() => {
    if (totalPrice === 0 && sumOfParts === 0) return true;
    return totalPrice === sumOfParts;
  }, [totalPrice, sumOfParts]);

  // Update Arabic words whenever total price changes
  useEffect(() => {
    if (totalPrice > 0 && !totalPriceInWords) {
      setTotalPriceInWords(convertNumberToArabicWords(totalPrice) + ' درهم مغربي');
    }
  }, [totalPrice, totalPriceInWords]);

  // ---------------------------------------------------------------------------
  // 10. Mortgages, Liens & Previous Ownership (الرهون والامتيازات ومصدر الملكية)
  // ---------------------------------------------------------------------------
  const [isPledgedOrEncumbered, setIsPledgedOrEncumbered] = useState<boolean>(
    state.businessSale?.isPledgedOrEncumbered ?? false
  );
  const [pledgeCreditorName, setPledgeCreditorName] = useState<string>(
    state.businessSale?.pledgeDetails?.creditorName || ''
  );
  const [pledgeDebtAmount, setPledgeDebtAmount] = useState<string>(
    state.businessSale?.pledgeDetails?.debtAmount || ''
  );
  const [pledgeRegistrationNumber, setPledgeRegistrationNumber] = useState<string>(
    state.businessSale?.pledgeDetails?.registrationNumber || ''
  );
  const [hasDischarge, setHasDischarge] = useState<boolean>(
    state.businessSale?.pledgeDetails?.hasDischarge ?? false
  );

  // Ownership Origin (مصدر الملكية - المادة 81)
  const [ownershipOriginType, setOwnershipOriginType] = useState<
    'إنشاء_الأصل' | 'شراء_سابق' | 'تفويت' | 'إرث' | 'حصة_في_شركة' | 'قسمة' | 'مزاد' | 'حكم_قضائي'
  >(state.businessSale?.ownershipOriginType || 'إنشاء_الأصل');
  const [ownershipOriginDetails, setOwnershipOriginDetails] = useState<string>(
    state.businessSale?.ownershipOriginDetails || ''
  );
  const [previousContractReference, setPreviousContractReference] = useState<string>(
    state.businessSale?.previousContractReference || ''
  );

  // ---------------------------------------------------------------------------
  // 11. Oppositions & Timeline (التعرضات ولوحة النشر - المواد 83 و 84)
  // ---------------------------------------------------------------------------
  const [firstPublicationDate, setFirstPublicationDate] = useState<string>(
    state.businessSale?.timeline?.firstPublicationDate || ''
  );
  const [firstPublicationJournal, setFirstPublicationJournal] = useState<string>(
    state.businessSale?.timeline?.firstPublicationJournal || 'الجريدة الرسمية وجريدة الإعلانات القانونية'
  );
  const [secondPublicationDate, setSecondPublicationDate] = useState<string>(
    state.businessSale?.timeline?.secondPublicationDate || ''
  );
  const [oppositionDeadlineEnd, setOppositionDeadlineEnd] = useState<string>(
    state.businessSale?.timeline?.oppositionDeadlineEnd || ''
  );
  const [sellerLienRegistered, setSellerLienRegistered] = useState<boolean>(
    state.businessSale?.timeline?.sellerLienRegistered ?? true
  );

  // Oppositions List
  const [oppositionsList, setOppositionsList] = useState<CreditorOppositionItem[]>(
    state.businessSale?.oppositionsList || []
  );

  const addOppositionItem = () => {
    const newItem: CreditorOppositionItem = {
      id: `opp-${Date.now()}`,
      creditorName: '',
      debtAmount: '',
      debtCause: '',
      chosenDomicile: courtName || defaultCourt,
      oppositionDate: todayGregorian,
      courtName: courtName || defaultCourt,
      status: 'قائم',
    };
    setOppositionsList((prev) => [...prev, newItem]);
  };

  const removeOppositionItem = (id: string) => {
    setOppositionsList((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOppositionItem = (id: string, field: keyof CreditorOppositionItem, value: any) => {
    setOppositionsList((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // Sixth Increase Proceeding (زيادة السدس - المادة 94)
  const [hasSixthIncreaseProceeding, setHasSixthIncreaseProceeding] = useState<boolean>(
    state.businessSale?.hasSixthIncreaseProceeding ?? false
  );

  // Litigation, Distraint & Bankruptcy
  const [hasLitigation, setHasLitigation] = useState<boolean>(
    state.businessSale?.hasLitigation ?? false
  );
  const [litigationNotes, setLitigationNotes] = useState<string>(
    state.businessSale?.litigationNotes || ''
  );
  const [isSeizedOrDistrained, setIsSeizedOrDistrained] = useState<boolean>(
    state.businessSale?.isSeizedOrDistrained ?? false
  );
  const [distraintDetails, setDistraintDetails] = useState<string>(
    state.businessSale?.distraintDetails || ''
  );
  const [isUnderBankruptcyOrRestructuring, setIsUnderBankruptcyOrRestructuring] = useState<boolean>(
    state.businessSale?.isUnderBankruptcyOrRestructuring ?? false
  );

  // ---------------------------------------------------------------------------
  // 12. Smart Consistency & Critical Alerts
  // ---------------------------------------------------------------------------
  const criticalWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!isPriceDistributionBalanced) {
      warnings.push(
        `تنبيه مالي (المادة 81): الثمن الإجمالي (${totalPrice} درهم) لا يطابق مجموع العناصر المعنوية والبضائع والمعدات (${sumOfParts} درهم). الفارق: ${Math.abs(totalPrice - sumOfParts)} درهم.`
      );
    }
    if (isOperatingInRentedPremises && notificationStatus === 'لم_يتم_بعد') {
      warnings.push(
        'تنبيه قانوني (المادة 25 من القانون 49.16): لم تكتمل بيانات إشعار المكري بالتفويت؛ التفويت لا يسري في مواجهته إلا بعد التبليغ الرسمي.'
      );
    }
    if (isPremisesOwnedBySeller && isRealEstateSoldConcurrently) {
      warnings.push(
        'تنبيه منهجي جوهري: بيع العقار يستوجب رسماً عقارياً مستقلاً وفق المادة 4 من مدونة الحقوق العينية (39.08)؛ الأصل التجاري مال منقول معنوي مستقل.'
      );
    }
    if (hasEmployees) {
      warnings.push(
        'تنبيه اجتماعي (المادة 19 من مدونة الشغل): عقود الشغل تستمر بقوة القانون مع المشتري الجديد؛ لا يُعد البيع مبرراً لإنهاء أي عقد عمل.'
      );
    }
    if (isPledgedOrEncumbered && !hasDischarge) {
      warnings.push(
        'تنبيه دائنين: الأصل التجاري مثقل برهن مقيد بالسجل التجاري ولم يتم الإدلاء برفع اليد أو تسوية الدين.'
      );
    }
    if (oppositionsList.some((o) => o.status === 'قائم')) {
      warnings.push(
        'مانع تحرير الثمن (المادة 89): يوجد تعرض قائم من دائني البائع؛ يمتنع أداء الثمن للبائع قبل تصفية التعرض ورفع اليد.'
      );
    }
    if (isUnderBankruptcyOrRestructuring) {
      warnings.push(
        'مانع مسطري: الشركة البائعة خاضعة لمسطرة صعوبات المقاولة؛ لا يصح البيع الرضائي العادي بل يخضع لإشراف القاضي المنتدب ومسطرة التصفية.'
      );
    }

    return warnings;
  }, [
    isPriceDistributionBalanced,
    totalPrice,
    sumOfParts,
    isOperatingInRentedPremises,
    notificationStatus,
    isPremisesOwnedBySeller,
    isRealEstateSoldConcurrently,
    hasEmployees,
    isPledgedOrEncumbered,
    hasDischarge,
    oppositionsList,
    isUnderBankruptcyOrRestructuring,
  ]);

  // Overall Sale Status
  const calculatedSaleStatus: 'قيد_الفحص' | 'مستوف' | 'مانع_قانوني' = useMemo(() => {
    if (isUnderBankruptcyOrRestructuring || isSeizedOrDistrained) {
      return 'مانع_قانوني';
    }
    if (criticalWarnings.length > 0) {
      return 'قيد_الفحص';
    }
    return 'مستوف';
  }, [isUnderBankruptcyOrRestructuring, isSeizedOrDistrained, criticalWarnings]);

  // ---------------------------------------------------------------------------
  // 13. Synchronize Full BusinessSaleState to Parent State
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fullState: BusinessSaleState = {
      disposalScope,
      saleStatus: calculatedSaleStatus,
      crStatus,
      crRef: {
        courtName,
        rcNumber,
        chronologicalNumber,
        commercialName,
        legalForm,
        mainActivity,
        headquartersAddress,
        registrationDate,
        currentStatus: crStatus,
        iceNumber,
        patentNumber,
      },
      isTripleMatched,
      matchingDiscrepancyNotes,
      seller: {
        legalNature: sellerLegalNature,
        fullName: sellerFullName,
        nationalId: sellerNationalId,
        fatherName: sellerFatherName,
        motherName: sellerMotherName,
        birthDate: sellerBirthDate,
        birthPlace: sellerBirthPlace,
        address: sellerAddress,
        phone: sellerPhone,
        sharePercentage: sellerSharePercentage,
        companyName,
        companyRc,
        companyIce,
        companyHeadquarters,
        representativeName,
        representativeCapacity,
        representativePowerSource,
        isSingleSignatory,
        corporateApprovalNumber,
        corporateApprovalDate,
      },
      coSellers,
      buyer: {
        legalNature: buyerLegalNature,
        fullName: buyerFullName,
        nationalId: buyerNationalId,
        fatherName: buyerFatherName,
        motherName: buyerMotherName,
        address: buyerAddress,
        phone: buyerPhone,
        isAlreadyMerchant,
        existingRcNumber: buyerRcNumber,
        companyName: buyerCompanyName,
        companyRc: buyerCompanyRc,
        companyIce: buyerCompanyIce,
        representativeName: buyerRepresentativeName,
        representativeCapacity: buyerRepresentativeCapacity,
      },
      hasProxy,
      proxyDetails,
      hasCustomers,
      commercialReputationDescription,
      commercialNameIncluded,
      commercialNameStated,
      emblemIncluded,
      emblemDescription,
      industrialPropertyRights: {
        trademarks: trademarkNames,
        patents: patentNumbers,
      },
      licensesAndAuthorizations: {
        licenseName,
        issuingAuthority: licenseAuthority,
        licenseNumber,
        isTransferable: licenseIsTransferable,
      },
      leasehold: {
        isOperatingInRentedPremises,
        isLeaseIncludedInSale,
        lessorName,
        lessorAddress,
        tenantOriginalName: sellerFullName,
        leaseContractDate,
        leaseDuration,
        monthlyRentAmount,
        paymentMethod: 'شهري',
        premisesDescription,
        rentalDebtsSummary,
        hasLitigation: hasRentalLitigation,
        litigationDetails: rentalLitigationDetails,
        notificationStatus,
        notificationDate,
        notificationMethod,
        notificationDocumentRef,
        isPremisesOwnedBySeller,
        isRealEstateSoldConcurrently,
      },
      goodsIncluded,
      goodsList,
      equipmentIncluded,
      equipmentList,
      hasEmployees,
      employeesList,
      hasBranches,
      branchesList,
      includedElementsSummary: [
        hasCustomers ? 'الزبناء' : '',
        'السمعة التجارية',
        commercialNameIncluded ? 'الاسم التجاري' : '',
        emblemIncluded ? 'الشعار واللافتة' : '',
        isLeaseIncludedInSale === 'نعم_مع_الأصل_التجاري' ? 'الحق في الكراء' : '',
        goodsIncluded !== 'لا' ? 'البضائع' : '',
        equipmentIncluded ? 'المعدات والأدوات' : '',
      ].filter(Boolean),
      excludedElementsExplicit,
      financials: {
        totalPrice,
        totalPriceInWords,
        intangibleElementsPrice,
        goodsInventoryPrice,
        equipmentToolsPrice,
        paymentMethod,
        depositoryEntityName,
        depositoryDepositDate,
        depositoryReceiptNumber,
        deferredAmount,
        deferredDueDate,
        deferredGuarantee,
      },
      isPledgedOrEncumbered,
      pledgeDetails: {
        creditorName: pledgeCreditorName,
        debtAmount: pledgeDebtAmount,
        registrationNumber: pledgeRegistrationNumber,
        hasDischarge,
      },
      ownershipOriginType,
      ownershipOriginDetails,
      previousContractReference,
      timeline: {
        contractDate: todayGregorian,
        firstPublicationDate,
        firstPublicationJournal,
        secondPublicationDate,
        oppositionDeadlineEnd,
        hasPendingOpposition: oppositionsList.some((o) => o.status === 'قائم'),
        sellerLienRegistered,
      },
      oppositionsList,
      hasSixthIncreaseProceeding,
      hasLitigation,
      litigationNotes,
      isSeizedOrDistrained,
      distraintDetails,
      isUnderBankruptcyOrRestructuring,
    };

    setState((prev) => ({
      ...prev,
      businessSale: fullState,
    }));
  }, [
    disposalScope,
    calculatedSaleStatus,
    crStatus,
    courtName,
    rcNumber,
    chronologicalNumber,
    commercialName,
    legalForm,
    mainActivity,
    headquartersAddress,
    registrationDate,
    iceNumber,
    patentNumber,
    isTripleMatched,
    matchingDiscrepancyNotes,
    sellerLegalNature,
    sellerFullName,
    sellerNationalId,
    sellerFatherName,
    sellerMotherName,
    sellerBirthDate,
    sellerBirthPlace,
    sellerAddress,
    sellerPhone,
    sellerSharePercentage,
    companyName,
    companyRc,
    companyIce,
    companyHeadquarters,
    representativeName,
    representativeCapacity,
    representativePowerSource,
    isSingleSignatory,
    corporateApprovalNumber,
    corporateApprovalDate,
    coSellers,
    buyerLegalNature,
    buyerFullName,
    buyerNationalId,
    buyerFatherName,
    buyerMotherName,
    buyerAddress,
    buyerPhone,
    isAlreadyMerchant,
    buyerRcNumber,
    buyerCompanyName,
    buyerCompanyRc,
    buyerCompanyIce,
    buyerRepresentativeName,
    buyerRepresentativeCapacity,
    hasProxy,
    proxyDetails,
    hasCustomers,
    commercialReputationDescription,
    commercialNameIncluded,
    commercialNameStated,
    emblemIncluded,
    emblemDescription,
    trademarkNames,
    patentNumbers,
    licenseName,
    licenseAuthority,
    licenseNumber,
    licenseIsTransferable,
    isOperatingInRentedPremises,
    isLeaseIncludedInSale,
    lessorName,
    lessorAddress,
    leaseContractDate,
    leaseDuration,
    monthlyRentAmount,
    premisesDescription,
    rentalDebtsSummary,
    hasRentalLitigation,
    rentalLitigationDetails,
    notificationStatus,
    notificationDate,
    notificationMethod,
    notificationDocumentRef,
    isPremisesOwnedBySeller,
    isRealEstateSoldConcurrently,
    goodsIncluded,
    goodsList,
    equipmentIncluded,
    equipmentList,
    hasEmployees,
    employeesList,
    hasBranches,
    branchesList,
    excludedElementsExplicit,
    totalPrice,
    totalPriceInWords,
    intangibleElementsPrice,
    goodsInventoryPrice,
    equipmentToolsPrice,
    paymentMethod,
    depositoryEntityName,
    depositoryDepositDate,
    depositoryReceiptNumber,
    deferredAmount,
    deferredDueDate,
    deferredGuarantee,
    isPledgedOrEncumbered,
    pledgeCreditorName,
    pledgeDebtAmount,
    pledgeRegistrationNumber,
    hasDischarge,
    ownershipOriginType,
    ownershipOriginDetails,
    previousContractReference,
    todayGregorian,
    firstPublicationDate,
    firstPublicationJournal,
    secondPublicationDate,
    oppositionDeadlineEnd,
    sellerLienRegistered,
    oppositionsList,
    hasSixthIncreaseProceeding,
    hasLitigation,
    litigationNotes,
    isSeizedOrDistrained,
    distraintDetails,
    isUnderBankruptcyOrRestructuring,
    setState,
  ]);

  // ---------------------------------------------------------------------------
  // 14. Moroccan Legal Draft Generator (الصياغة العدلية لبيع الأصل التجاري)
  // ---------------------------------------------------------------------------
  const generateAuthoritativeDraft = useMemo(() => {
    const refCourt = courtName || defaultCourt;
    const refRc = rcNumber ? `رقم السجل التجاري: ${rcNumber}` : 'رقم السجل التجاري: (...)';
    const sellerIdentity =
      sellerLegalNature === 'شخص_معنوي'
        ? `شركة «${companyName || '...'}»، شركة تجارية مقيدة بالسجل التجاري بـ${courtName} تحت رقم ${companyRc || '...'} ورقم التعريف الموحد للمقاولة (ICE): ${companyIce || '...'}، كائن مقرها الاجتماعي بـ: ${companyHeadquarters || '...'}`
        : `${sellerFullName || 'البائع'}، مغربي الجنسية، الحامل لبطاقة التعريف الوطنية رقم: ${sellerNationalId || '...'}، الساكن بـ: ${sellerAddress || '...'}`;

    const buyerIdentity =
      buyerLegalNature === 'شخص_معنوي'
        ? `شركة «${buyerCompanyName || '...'}»، شركة تجارية مقيدة بالسجل التجاري تحت رقم ${buyerCompanyRc || '...'} ورقم التعريف الموحد (ICE): ${buyerCompanyIce || '...'}، في شخص ممثلها القانوني ${buyerRepresentativeName || '...'} بصفته ${buyerRepresentativeCapacity || 'مسير'}`
        : `${buyerFullName || 'المشتري'}، مغربي الجنسية، الحامل لبطاقة التعريف الوطنية رقم: ${buyerNationalId || '...'}، الساكن بـ: ${buyerAddress || '...'}`;

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه

المملكة المغربية
وزارة العدل
المحكمة الابتدائية بـ${refCourt}
قسم قضاء التوثيق

عقد تفويت أصل تجاري
(وفق مقتضيات المواد 79 إلى 98 من مدونة التجارة والقانون 49.16)

الطرف الأول (البائع / المفوت):
${sellerIdentity}
${
  sellerLegalNature === 'شخص_معنوي'
    ? `ويمثلها في هذا العقد: السيد ${representativeName || '...'}، بصفته ${representativeCapacity || 'مسير'}، والمفوض بالتوقيع بمقتضى ${representativePowerSource || 'النظام الأساسي'}.`
    : ''
}

الطرف الثاني (المشتري / المفوت له):
${buyerIdentity}

محل التفويت والتعريف بالأصل التجاري:
بمقتضى هذا العقد، فوت الطرف الأول بكافة الضمانات الفعلية والقانونية الجاري بها العمل للطرف الثاني القابل لذلك، الأصل التجاري المخصص لممارسة نشاط: [${mainActivity || 'النشاط التجاري'}]، والمستغل بـ: [${headquartersAddress || 'عنوان المقر'}]، والمقيد بالسجل التجاري بالمحكمة التجارية بـ${refCourt} تحت ${refRc}، ورقم التعريف الموحد (ICE): ${iceNumber || '...'}.

عناصر الأصل التجاري المشمولة بالبيع (المادة 80 من مدونة التجارة):
يشمل البيع العناصر التالية دون غيرها:
1. العناصر المعنوية: الزبناء، السمعة التجارية، ${commercialNameIncluded ? `الاسم التجاري (${commercialNameStated || commercialName})` : ''}، ${emblemIncluded ? `الشعار (${emblemDescription || 'اللافتة'})` : ''}${isLeaseIncludedInSale === 'نعم_مع_الأصل_التجاري' ? '، والحق في الكراء للمحل المذكور' : ''}.
2. العناصر المادية: ${goodsIncluded !== 'لا' ? 'البضائع المخزونة المذكورة في قائمة الجرد الملحقة' : ''}، ${equipmentIncluded ? 'والمعدات والأدوات والآلات المستعملة في الاستغلال' : ''}.

العناصر المستثناة صراحة:
${excludedElementsExplicit}

بيان الحق في الكراء وإشعار المكري (المادة 25 من القانون 49.16):
${
  isOperatingInRentedPremises
    ? `يستغل الأصل التجاري بالمحل المكترى من السيد ${lessorName || '...'}، بمقتضى عقد كراء مؤرخ في ${leaseContractDate || '...'} بوجيبة كرائية شهرية قدرها ${monthlyRentAmount || '...'} درهم. وطبقاً للمادة 25 من القانون رقم 49.16، يلتزم الطرفان بإشعار المكري المذكور بهذا التفويت عبر الطرق الرسمية المقررة قانوناً لكي يسري التفويت في مواجهته، مع إبراء ذمة البائع من الالتزامات اللاحقة لتاريخ الإشعار.`
    : 'يصرح البائع بأن الأصل التجاري لا يستغل في محل مكترى / ملك خاص بالبائع لا يشمل البيع جدرانه.'
}

استمرارية عقود الشغل (المادة 19 من مدونة الشغل):
يصرح الطرفان باطلاعهما على المادة 19 من القانون رقم 65.99 المتعلق بمدونة الشغل، وبأن هذا البيع لا يترتب عنه إنهاء عقود الشغل الجارية، بل يحل المشتري بقوة القانون محل المشغل السابق في جميع الالتزامات والحقوق المترتبة لفائدة الأجراء المشتغلين بالأصل التجاري.

مصدر ملكية الأصل التجاري (المادة 81 من مدونة التجارة):
آل الأصل التجاري المذكور للبائع عن طريق: [${ownershipOriginType.replace(/_/g, ' ')}]${ownershipOriginDetails ? `، بيانها: ${ownershipOriginDetails}` : ''}${previousContractReference ? `، بمقتضى العقد المرجع: ${previousContractReference}` : ''}.

حالة الرهون والامتيازات المقامة على الأصل (المادة 81 من مدونة التجارة):
${
  isPledgedOrEncumbered
    ? `يصرح البائع بأن الأصل التجاري مثقل برهن مقيد بالسجل التجاري لفائدة الدائن: ${pledgeCreditorName || '...'} ضماناً لمبلغ ${pledgeDebtAmount || '...'} درهم، مقيد تحت رقم ${pledgeRegistrationNumber || '...'}${hasDischarge ? ' (وقد أدلي برفع اليد المؤرخ في ...)' : ''}.`
    : 'يشهد البائع ويصرح تحت مسؤوليته التامة بخلو الأصل التجاري من أي رهن أو حجز أو امتياز مقيد بالسجل التجاري أو تعرض قضائي حتى تاريخه.'
}

الثمن وتوزيعه الإلزامي (المادة 81 من مدونة التجارة):
اتفق الطرفان على تحديد ثمن البيع الإجمالي في مبلغ قدره:
[${totalPrice.toLocaleString('ar-MA')} درهم مغربي] (${totalPriceInWords || '...'})،
موزعاً ومفصلاً وجوباً بين العناصر المكونة للأصل التجاري كما يلي:
1. ثمن العناصر المعنوية: ${intangibleElementsPrice.toLocaleString('ar-MA')} درهم.
2. ثمن البضائع: ${goodsInventoryPrice.toLocaleString('ar-MA')} درهم.
3. ثمن المعدات والأدوات: ${equipmentToolsPrice.toLocaleString('ar-MA')} درهم.
المجموع الإجمالي: ${sumOfParts.toLocaleString('ar-MA')} درهم (مطابق للثمن الإجمالي).

طريقة الأداء وإيداع الثمن (المادة 81 من مدونة التجارة):
تم أداء وإيداع ثمن البيع بواسطة: [${paymentMethod.replace(/_/g, ' ')}]، حيث تم إيداعه لدى الجهة المؤهلة قانوناً للاحتفاظ بالودائع وهي: [${depositoryEntityName}]${depositoryReceiptNumber ? ` تحت وصل عدد ${depositoryReceiptNumber}` : ''}، ولا يبرأ المشتري من التزامه إلا بمراعاة إجراءات النشر القانوني واستيفاء أجل التعرضات المنصوص عليه في المادة 84 من مدونة التجارة.

إجراءات الإيداع والتقييد والنشر والتعرضات (المواد 83 و 84 من مدونة التجارة):
يلتزم المشتري بإيداع نسخة من هذا العقد لدى كتابة ضبط المحكمة المختصة داخل أجل خمسة عشر (15) يوماً من تاريخ تحريره، وتقييد مستخرجه بالسجل التجاري، ونشره مرتين في الجريدة الرسمية وفي جريدة مخول لها نشر الإعلانات القانونية مع فاصل زمني بين النشرين يقع بين اليوم الثامن والخامس عشر من تاريخ النشر الأول. وتفتح فترة خمسة عشر يوماً لتلقي تعرضات دائني البائع المحتملين ابتداءً من تاريخ النشر الثاني بالموطن المختار بكتابة الضبط.

وقد تُلِيَ هذا العقد على الطرفين ففهماه ووافقا على جميع بنوده دون قيد ولا تحفظ.

وحرر في يومه: ${todayHijri} هجرية، الموافق لـ: ${todayGregorian} ميلادية.

توقيع الطرف الأول (البائع):
...................................

توقيع الطرف الثاني (المشتري):
...................................

توقيع العدل المتلقي الأول:
${defaultNotary1}
...................................

توقيع العدل المتلقي الثاني:
${defaultNotary2}
...................................

تأشيرة ومخاطبة السيد القاضي المكلف بالتوثيق:
...................................`;
  }, [
    courtName,
    defaultCourt,
    rcNumber,
    sellerLegalNature,
    companyName,
    companyRc,
    companyIce,
    companyHeadquarters,
    sellerFullName,
    sellerNationalId,
    sellerAddress,
    representativeName,
    representativeCapacity,
    representativePowerSource,
    buyerLegalNature,
    buyerCompanyName,
    buyerCompanyRc,
    buyerCompanyIce,
    buyerRepresentativeName,
    buyerRepresentativeCapacity,
    buyerFullName,
    buyerNationalId,
    buyerAddress,
    mainActivity,
    headquartersAddress,
    iceNumber,
    commercialNameIncluded,
    commercialNameStated,
    commercialName,
    emblemIncluded,
    emblemDescription,
    isLeaseIncludedInSale,
    goodsIncluded,
    equipmentIncluded,
    excludedElementsExplicit,
    isOperatingInRentedPremises,
    lessorName,
    leaseContractDate,
    monthlyRentAmount,
    ownershipOriginType,
    ownershipOriginDetails,
    previousContractReference,
    isPledgedOrEncumbered,
    pledgeCreditorName,
    pledgeDebtAmount,
    pledgeRegistrationNumber,
    hasDischarge,
    totalPrice,
    totalPriceInWords,
    intangibleElementsPrice,
    goodsInventoryPrice,
    equipmentToolsPrice,
    sumOfParts,
    paymentMethod,
    depositoryEntityName,
    depositoryReceiptNumber,
    todayHijri,
    todayGregorian,
    defaultNotary1,
    defaultNotary2,
  ]);

  // ---------------------------------------------------------------------------
  // 15. Transition to Step 7 (Final Review) — Strictly setting step: 7
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = useCallback(() => {
    const sellerParty: Party = {
      ...createEmptyParty(),
      fullName: sellerLegalNature === 'شخص_معنوي' ? companyName || 'الشركة البائعة' : sellerFullName || 'البائع',
      cin: sellerLegalNature === 'شخص_معنوي' ? companyIce : sellerNationalId,
      phone: sellerPhone,
      address: sellerLegalNature === 'شخص_معنوي' ? companyHeadquarters : sellerAddress,
      capacity: sellerLegalNature === 'شخص_معنوي' ? `شركة تجارية - الممثل: ${representativeName}` : 'مالك الأصل التجاري',
    };

    const buyerParty: Party = {
      ...createEmptyParty(),
      fullName: buyerLegalNature === 'شخص_معنوي' ? buyerCompanyName || 'الشركة المشترية' : buyerFullName || 'المشتري',
      cin: buyerLegalNature === 'شخص_معنوي' ? buyerCompanyIce : buyerNationalId,
      phone: buyerPhone,
      address: buyerAddress,
      capacity: buyerLegalNature === 'شخص_معنوي' ? `شركة مقتنية - الممثل: ${buyerRepresentativeName}` : 'مقتني الأصل التجاري',
    };

    setState((prev) => ({
      ...prev,
      step: 7, // الانتقال المباشر والقطعي للخطوة السابعة
      documentType: 'بيع_اصل_تجاري',
      draft: generateAuthoritativeDraft,
      draftText: generateAuthoritativeDraft,
      sellers: [sellerParty, ...coSellers.map((cs) => ({
        ...createEmptyParty(),
        fullName: cs.fullName,
        cin: cs.nationalId,
        address: cs.address,
        capacity: `شريك في ملكية الأصل (${cs.sharePercentage || 'حصة'})`,
      }))],
      buyers: [buyerParty],
      property: {
        ...prev.property,
        propertyName: `الأصل التجاري: ${commercialName || mainActivity} (سجل تجاري: ${rcNumber || '...'})`,
        titleRef: rcNumber || 'سجل تجاري',
        location: headquartersAddress,
        boundaries: {
          north: 'المقر التجاري',
          east: '',
          south: '',
          west: '',
        },
        area_m2: premisesDescription || '',
      },
      finance: {
        ...prev.finance,
        price: totalPrice,
        priceInWords: totalPriceInWords || (totalPrice ? convertNumberToArabicWords(totalPrice) + ' درهم' : '0 درهم'),
        paymentMethod: 'تحويل',
      },
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    sellerLegalNature,
    companyName,
    sellerFullName,
    companyIce,
    sellerNationalId,
    sellerPhone,
    companyHeadquarters,
    sellerAddress,
    representativeName,
    buyerLegalNature,
    buyerCompanyName,
    buyerFullName,
    buyerCompanyIce,
    buyerNationalId,
    buyerPhone,
    buyerAddress,
    buyerRepresentativeName,
    generateAuthoritativeDraft,
    coSellers,
    commercialName,
    mainActivity,
    rcNumber,
    headquartersAddress,
    premisesDescription,
    totalPrice,
    totalPriceInWords,
    setState,
  ]);

  return (
    <div className="space-y-8 animate-fadeIn pb-16 font-cairo text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Fixed Header Banner & Real-time Status Card                            */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl border border-emerald-800/40">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Store className="w-3.5 h-3.5" />
              <span>منظومة توثيق وتفويت الأصل التجاري (المواد 79 إلى 98 من مدونة التجارة)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>«بيع الأصل التجاري»</span>
              <span className="text-sm font-normal px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-emerald-200">
                {disposalScope.replace(/_/g, ' ')}
              </span>
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              تفويت أصل تجاري مسجل بالسجل التجاري بجميع عناصره المعنوية والمادية، وحماية حقوق الدائنين والأجراء وإشعار المكري.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
            {/* Status Card */}
            <div className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between sm:justify-start gap-4">
              <div>
                <div className="text-[10px] text-emerald-200/70 font-medium">حالة العملية</div>
                <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      calculatedSaleStatus === 'مانع_قانوني'
                        ? 'bg-rose-500 animate-pulse'
                        : calculatedSaleStatus === 'قيد_الفحص'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>{calculatedSaleStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <div className="text-left border-r border-white/15 pr-3">
                <div className="text-[10px] text-emerald-200/70">الثمن الإجمالي</div>
                <div className="text-xs font-bold text-emerald-300">
                  {totalPrice.toLocaleString('ar-MA')} د.م
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium transition-all"
            >
              العودة للخيارات
            </button>
          </div>
        </div>

        {/* Foundation Rule Card */}
        <div className="mt-6 pt-5 border-t border-emerald-800/60 flex items-start gap-3 bg-amber-950/30 rounded-2xl p-4 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300 font-bold ml-1">ملاحظة تأسيسية مهمة:</strong>
            النظام لا يعامل «السجل التجاري» كشيء يباع؛ محل التصرف هو <strong className="text-white">الأصل التجاري</strong> (مال منقول معنوي)، والسجل التجاري هو وسيلة التسجيل والإشهار والتقييد. وإذا كان المحل مملوكاً للبائع، فإن بيع الأصل التجاري لا يشمل بيع العقار إلا بمقتضى رسم عقاري مستقل وفق القانون 39.08.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Horizontal 7-Stage Stepper Navigation                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-2 md:p-3 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 md:gap-2">
          {[
            { id: 1, title: 'الأصل والسجل', icon: Building2, desc: 'السجل والمطابقة' },
            { id: 2, title: 'الأطراف والتمثيل', icon: Users, desc: 'البائع والمشتري والشركة' },
            { id: 3, title: 'عناصر الأصل', icon: Scale, desc: 'الزبناء، البضائع، المعدات' },
            { id: 4, title: 'الكراء والأجراء', icon: AlertTriangle, desc: 'المادة 25 والمادة 19' },
            { id: 5, title: 'الرهون والدائنون', icon: ShieldCheck, desc: 'الرهون ومصدر الملكية' },
            { id: 6, title: 'الثمن والوديعة', icon: DollarSign, desc: 'توزيع الثمن والمودع لديه' },
            { id: 7, title: 'الصياغة والآثار', icon: FileText, desc: 'التحرير والنشر والتعرضات' },
          ].map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            const isCompleted = activeStage > stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-xl text-center transition-all ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">{stage.title}</span>
                </div>
                <span className={`text-[10px] hidden sm:block ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {stage.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STAGE 1: Scope, Commercial Register & Triple Matching                  */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6">
          {/* 1.1 Scope Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">1. ماذا تريد إنجازه؟ (طبيعة التفويت)</h2>
              </div>
              <span className="text-xs text-slate-400">تحديد المسار الإجرائي الدقيق للعملية</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'بيع_أصل_تجاري_كامل', title: 'بيع أصل تجاري كامل', desc: 'تفويت جميع عناصر الأصل التجاري الرئيسية المعنوية والمادية' },
                { key: 'بيع_فرع_من_فروع_الأصل_التجاري', title: 'بيع فرع من فروع الأصل', desc: 'تفويت مؤسسة ثانوية أو فرع مستقل مع استمرار الأصل الرئيسي' },
                { key: 'تفويت_حق_الكراء_مع_الأصل_التجاري', title: 'تفويت حق الكراء مع الأصل', desc: 'بيع الأصل التجاري مع تحويل عقد الكراء التجاري (المادة 25)' },
                { key: 'تفويت_بعض_عناصر_الأصل_التجاري', title: 'تفويت بعض عناصر الأصل', desc: 'حصر البيع في عناصر معينة (كالاسم أو المعدات أو البضائع)' },
                { key: 'تقديم_الأصل_التجاري_حصة_في_شركة', title: 'تقديم الأصل حصة في شركة', desc: 'تقديم الأصل كحصة عينية في رأسمال شركة تجارية (المادة 104)' },
                { key: 'بيع_الأصل_التجاري_بالمزاد_تنفيذ_قضائي', title: 'بيع الأصل بالمزاد القضائي', desc: 'بيع في إطار مسطرة حجز تنفيذي أو صعوبات المقاولة' },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => setDisposalScope(item.key as BusinessDisposalScope)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    disposalScope === item.key
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-slate-900">{item.title}</span>
                    {disposalScope === item.key && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 1.2 Commercial Register Verification & Retrieval */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. التحقق من وجود الأصل التجاري وبيانات السجل التجاري</h2>
                  <p className="text-xs text-slate-400">استرجاع ومطابقة بيانات التقييد بالسجل التجاري</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['مسجل', 'غير_مسجل', 'البيانات_غير_متطابقة'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCrStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      crStatus === st
                        ? st === 'مسجل'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : st === 'غير_مسجل'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-600">
                الربط مع السجل التجاري الإلكتروني واسترجاع نموذج (نموذج 7 / Modèle J):
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsDeedRetrieved(true);
                  if (!courtName) setCourtName(defaultCourt);
                  if (!commercialName) setCommercialName('مؤسسة الرواج التجاري');
                  if (!mainActivity) setMainActivity('تجارة المواد الغذائية العامة والتوزيع');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>استرجاع من السجل التجاري</span>
              </button>
            </div>

            {isDeedRetrieved && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      تم استحضار مستخرج السجل التجاري (Modèle J)
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      المحكمة: {courtName} — رقم RC: {rcNumber || '...'} — النشاط: {mainActivity || '...'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900">
                  سجل نشط
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة الابتدائية / التجارية</label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="المحكمة الكائن بدائرتها الأصل"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم السجل التجاري (RC)</label>
                <input
                  type="text"
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  placeholder="مثال: 54321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الترتيبي / الزمني</label>
                <input
                  type="text"
                  value={chronologicalNumber}
                  onChange={(e) => setChronologicalNumber(e.target.value)}
                  placeholder="رقم الإيداع الترتيبي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم التجاري المقيد</label>
                <input
                  type="text"
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value)}
                  placeholder="الاسم التجاري بالسجل"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الشكل القانوني</label>
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="شخص ذاتي (تاجر)">شخص ذاتي (تاجر)</option>
                  <option value="شركة ذات مسؤولية محدودة (SARL)">شركة ذات مسؤولية محدودة (SARL)</option>
                  <option value="شركة ذات مسؤولية محدودة بشريك وحيد (SARL AU)">SARL AU (شريك وحيد)</option>
                  <option value="شركة مساهمة (SA)">شركة مساهمة (SA)</option>
                  <option value="شركة التضامن (SNC)">شركة التضامن (SNC)</option>
                  <option value="شركة التوصية البسيطة">شركة التوصية البسيطة</option>
                  <option value="شكل قانوني آخر">شكل قانوني آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التعريف الموحد (ICE)</label>
                <input
                  type="text"
                  value={iceNumber}
                  onChange={(e) => setIceNumber(e.target.value)}
                  placeholder="00XXXXXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرسم المهني (البتنت)</label>
                <input
                  type="text"
                  value={patentNumber}
                  onChange={(e) => setPatentNumber(e.target.value)}
                  placeholder="رقم الضريبة المهنية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التسجيل بالسجل</label>
                <input
                  type="date"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">النشاط التجاري الممارس</label>
                <input
                  type="text"
                  value={mainActivity}
                  onChange={(e) => setMainActivity(e.target.value)}
                  placeholder="نوع النشاط أو الأنشطة الممارسة بدقة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان مقر الأصل التجاري</label>
                <input
                  type="text"
                  value={headquartersAddress}
                  onChange={(e) => setHeadquartersAddress(e.target.value)}
                  placeholder="العنوان الكامل للمحل أو المؤسسة الرئيسية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Triple Matching Module */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-900">
                    المطابقة الثلاثية: (السجل التجاري ↕ هوية البائع ↕ ملكية الأصل)
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTripleMatched}
                    onChange={(e) => setIsTripleMatched(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-950">بيانات مطابقة تماماً</span>
                </label>
              </div>

              {!isTripleMatched && (
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">
                    أوجه الاختلاف بين السجل التجاري وهوية المالك الحالي:
                  </label>
                  <input
                    type="text"
                    value={matchingDiscrepancyNotes}
                    onChange={(e) => setMatchingDiscrepancyNotes(e.target.value)}
                    placeholder="مثال: تغير عنوان المقر، وفاة المالك وتقييد الإراثة لم يتم بعد..."
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs bg-rose-50"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى أطراف التفويت والتمثيل</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STAGE 2: Parties & Legal Representation                                */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6">
          {/* 2.1 Seller Nature & Identity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. الطرف الأول: البائع (مالك الأصل التجاري)</h2>
                  <p className="text-xs text-slate-400">تحديد الصفة والأهلية القانونية للتفويت</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'شخص_طبيعي', label: 'شخص طبيعي' },
                  { key: 'شخص_معنوي', label: 'شركة / شخص معنوي' },
                  { key: 'شركاء_على_الشياع', label: 'شركاء على الشياع' },
                  { key: 'ورثة', label: 'ورثة المالك' },
                  { key: 'مصف', label: 'مصفٍّ قضائي' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSellerLegalNature(item.key as PartyLegalNature)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      sellerLegalNature === item.key
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Person Seller Fields */}
            {sellerLegalNature !== 'شخص_معنوي' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للبائع</label>
                  <input
                    type="text"
                    value={sellerFullName}
                    onChange={(e) => setSellerFullName(e.target.value)}
                    placeholder="الاسم الشخصي والعائلي"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN)</label>
                  <input
                    type="text"
                    value={sellerNationalId}
                    onChange={(e) => setSellerNationalId(e.target.value)}
                    placeholder="CIN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={sellerFatherName}
                    onChange={(e) => setSellerFatherName(e.target.value)}
                    placeholder="اسم الأب"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={sellerMotherName}
                    onChange={(e) => setSellerMotherName(e.target.value)}
                    placeholder="اسم الأم"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                  <input
                    type="date"
                    value={sellerBirthDate}
                    onChange={(e) => setSellerBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد</label>
                  <input
                    type="text"
                    value={sellerBirthPlace}
                    onChange={(e) => setSellerBirthPlace(e.target.value)}
                    placeholder="مدينة الازدياد"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="06XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحصة في الملكية</label>
                  <input
                    type="text"
                    value={sellerSharePercentage}
                    onChange={(e) => setSellerSharePercentage(e.target.value)}
                    placeholder="مثال: 100% أو النصف"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان سكنى البائع</label>
                  <input
                    type="text"
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    placeholder="العنوان الكامل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Corporate Seller Fields (إذا كانت شركة) */}
            {sellerLegalNature === 'شخص_معنوي' && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">اسم الشركة المالكة</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="اسم الشركة القانوني"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">رقم السجل التجاري (RC)</label>
                    <input
                      type="text"
                      value={companyRc}
                      onChange={(e) => setCompanyRc(e.target.value)}
                      placeholder="RC للشركة"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">الرقم الموحد (ICE)</label>
                    <input
                      type="text"
                      value={companyIce}
                      onChange={(e) => setCompanyIce(e.target.value)}
                      placeholder="ICE للشركة"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">المقر الاجتماعي للشركة</label>
                    <input
                      type="text"
                      value={companyHeadquarters}
                      onChange={(e) => setCompanyHeadquarters(e.target.value)}
                      placeholder="عنوان المقر الاجتماعي"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">اسم الممثل القانوني</label>
                    <input
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="الاسم الكامل للمسير / الرئيس"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">صفة الممثل</label>
                    <input
                      type="text"
                      value={representativeCapacity}
                      onChange={(e) => setRepresentativeCapacity(e.target.value)}
                      placeholder="المسير الوحيد / رئيس مجلس الإدارة"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">مصدر صلاحية التفويت</label>
                    <input
                      type="text"
                      value={representativePowerSource}
                      onChange={(e) => setRepresentativePowerSource(e.target.value)}
                      placeholder="النظام الأساسي ومحضر الجمع العام"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">تاريخ ومحضر قرار التفويت</label>
                    <input
                      type="text"
                      value={corporateApprovalDate || corporateApprovalNumber}
                      onChange={(e) => {
                        setCorporateApprovalDate(e.target.value);
                        setCorporateApprovalNumber(e.target.value);
                      }}
                      placeholder="تاريخ ومحضر الجمعية"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={isSingleSignatory}
                    onChange={(e) => setIsSingleSignatory(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-950">
                    الممثل القانوني يملك صلاحية التوقيع منفرداً دون اشتراط توقيع مشترك
                  </span>
                </label>
              </div>
            )}

            {/* Joint Ownership (الشياع) */}
            {sellerLegalNature === 'شركاء_على_الشياع' && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-950">
                    👥 الشركاء في ملكية الأصل التجاري على الشياع (يلزم موافقة الجميع أو بيع حصة فقط)
                  </div>
                  <button
                    type="button"
                    onClick={addCoSeller}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة شريك آخر</span>
                  </button>
                </div>

                {coSellers.map((cs, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200">
                    <input
                      type="text"
                      value={cs.fullName}
                      onChange={(e) => updateCoSeller(idx, 'fullName', e.target.value)}
                      placeholder="اسم الشريك..."
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={cs.nationalId}
                      onChange={(e) => updateCoSeller(idx, 'nationalId', e.target.value)}
                      placeholder="رقم CIN"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs uppercase font-mono"
                    />
                    <input
                      type="text"
                      value={cs.sharePercentage || ''}
                      onChange={(e) => updateCoSeller(idx, 'sharePercentage', e.target.value)}
                      placeholder="الحصة (مثلاً 25%)"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeCoSeller(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                    >
                      حذف الشريك
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2.2 Buyer Nature & Identity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. الطرف الثاني: المشتري (المفوت له)</h2>
                  <p className="text-xs text-slate-400">تحديد هوية المقتني ووضعيته التجارية</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuyerLegalNature('شخص_طبيعي')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    buyerLegalNature === 'شخص_طبيعي'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  شخص طبيعي
                </button>
                <button
                  type="button"
                  onClick={() => setBuyerLegalNature('شخص_معنوي')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    buyerLegalNature === 'شخص_معنوي'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  شركة / شخص معنوي
                </button>
              </div>
            </div>

            {buyerLegalNature === 'شخص_طبيعي' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للمشتري</label>
                  <input
                    type="text"
                    value={buyerFullName}
                    onChange={(e) => setBuyerFullName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN)</label>
                  <input
                    type="text"
                    value={buyerNationalId}
                    onChange={(e) => setBuyerNationalId(e.target.value)}
                    placeholder="CIN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب</label>
                  <input
                    type="text"
                    value={buyerFatherName}
                    onChange={(e) => setBuyerFatherName(e.target.value)}
                    placeholder="اسم الأب"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم</label>
                  <input
                    type="text"
                    value={buyerMotherName}
                    onChange={(e) => setBuyerMotherName(e.target.value)}
                    placeholder="اسم الأم"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان سكنى المشتري</label>
                  <input
                    type="text"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="العنوان الكامل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="06XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوضعية التجارية الحالية</label>
                  <select
                    value={isAlreadyMerchant}
                    onChange={(e) => setIsAlreadyMerchant(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="سيصبح_تاجرا_بسبب_العملية">سيصبح تاجراً بسبب هذه العملية</option>
                    <option value="تاجر_مسجل">تاجر مسجل بالسجل التجاري سابقاً</option>
                    <option value="حالة_أخرى">حالة أخرى</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة المشترية</label>
                    <input
                      type="text"
                      value={buyerCompanyName}
                      onChange={(e) => setBuyerCompanyName(e.target.value)}
                      placeholder="الاسم القانوني"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">السجل التجاري (RC)</label>
                    <input
                      type="text"
                      value={buyerCompanyRc}
                      onChange={(e) => setBuyerCompanyRc(e.target.value)}
                      placeholder="RC"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الموحد (ICE)</label>
                    <input
                      type="text"
                      value={buyerCompanyIce}
                      onChange={(e) => setBuyerCompanyIce(e.target.value)}
                      placeholder="ICE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الممثل القانوني للمشتري</label>
                    <input
                      type="text"
                      value={buyerRepresentativeName}
                      onChange={(e) => setBuyerRepresentativeName(e.target.value)}
                      placeholder="المسير أو الرئيس"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Proxy Module */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasProxy}
                  onChange={(e) => setHasProxy(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  أحد الأطراف حاضر بواسطة وكيل (بمقتضى وكالة خاصة بالتفويت)
                </span>
              </label>

              {hasProxy && (
                <input
                  type="text"
                  value={proxyDetails}
                  onChange={(e) => setProxyDetails(e.target.value)}
                  placeholder="بيان مراجع الوكالة الخاصة..."
                  className="w-64 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الأصل والسجل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى عناصر الأصل ونطاق البيع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STAGE 3: Goodwill Elements & Tangible Assets                            */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-6">
          {/* 3.1 Mandatory Intangible Elements (الزبناء والسمعة التجارية) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. العنصران الأساسيان الإلزاميان (المادة 80 من مدونة التجارة)</h2>
                  <p className="text-xs text-slate-400">الزبناء والسمعة التجارية عنصران لازمان لوجود الأصل التجاري قانوناً</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                إلزامي بالمادة 80
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>عنصر الزبناء (Clientèle)</span>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCustomers}
                      onChange={(e) => setHasCustomers(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-emerald-900">الأصل يتوفر على زبناء فعليين</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يؤكد البائع استمرار توافد الزبناء على المحل وعدم اندثار النشاط التجاري قبل تاريخ التفويت.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-emerald-700" />
                  <span>عنصر السمعة التجارية (Achalandage) والرواج</span>
                </span>
                <input
                  type="text"
                  value={commercialReputationDescription}
                  onChange={(e) => setCommercialReputationDescription(e.target.value)}
                  placeholder="وصف السمعة والرواج التجاري..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>
            </div>

            {/* Commercial Name & Emblem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commercialNameIncluded}
                    onChange={(e) => setCommercialNameIncluded(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-900">يشمل البيع الاسم التجاري (Nom commercial)</span>
                </label>
                {commercialNameIncluded && (
                  <input
                    type="text"
                    value={commercialNameStated}
                    onChange={(e) => setCommercialNameStated(e.target.value)}
                    placeholder="الاسم التجاري المنقول للمشتري..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emblemIncluded}
                    onChange={(e) => setEmblemIncluded(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-900">يشمل البيع الشعار / اللافتة التجارية (Enseigne)</span>
                </label>
                {emblemIncluded && (
                  <input
                    type="text"
                    value={emblemDescription}
                    onChange={(e) => setEmblemDescription(e.target.value)}
                    placeholder="وصف الشعار أو اللافتة..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3.2 Goods & Inventory (البضائع وجردها) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. البضائع وجرد المخزون (Marchandises)</h2>
                  <p className="text-xs text-slate-400">البضائع المعدة للبيع وقيمتها الإجمالية المستقلة</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['نعم', 'بعضها', 'لا'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGoodsIncluded(opt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      goodsIncluded === opt
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt === 'نعم' ? 'يشمل كامل البضائع' : opt === 'بعضها' ? 'يشمل بعض البضائع' : 'مستثناة'}
                  </button>
                ))}
              </div>
            </div>

            {goodsIncluded !== 'لا' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">قائمة تفصيلية بعناصر البضائع المشمولة:</span>
                  <button
                    type="button"
                    onClick={addGoodsItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف بضاعة</span>
                  </button>
                </div>

                {goodsList.map((g) => (
                  <div key={g.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <input
                      type="text"
                      value={g.description}
                      onChange={(e) => updateGoodsItem(g.id, 'description', e.target.value)}
                      placeholder="بيان ونوع البضاعة..."
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs sm:col-span-2 bg-white"
                    />
                    <input
                      type="number"
                      value={g.quantity}
                      onChange={(e) => updateGoodsItem(g.id, 'quantity', e.target.value)}
                      placeholder="الكمية"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <input
                      type="number"
                      value={g.totalValue}
                      onChange={(e) => updateGoodsItem(g.id, 'totalValue', e.target.value)}
                      placeholder="القيمة الإجمالية"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeGoodsItem(g.id)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold text-center"
                    >
                      حذف الصنف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3.3 Equipment & Tools (المعدات والآلات والأدوات) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. المعدات والآلات والأدوات (Matériel et outillage)</h2>
                  <p className="text-xs text-slate-400">التجهيزات والآلات والأثاث المخصص لاستغلال الأصل</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={equipmentIncluded}
                  onChange={(e) => setEquipmentIncluded(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">مشمولة بالتفويت</span>
              </label>
            </div>

            {equipmentIncluded && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">بيان الآلات والمعدات والتجهيزات:</span>
                  <button
                    type="button"
                    onClick={addEquipmentItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة آلة / معدة</span>
                  </button>
                </div>

                {equipmentList.map((eq) => (
                  <div key={eq.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <input
                      type="text"
                      value={eq.name}
                      onChange={(e) => updateEquipmentItem(eq.id, 'name', e.target.value)}
                      placeholder="اسم ووصف الآلة أو المعدة..."
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs sm:col-span-2 bg-white"
                    />
                    <input
                      type="number"
                      value={eq.quantity}
                      onChange={(e) => updateEquipmentItem(eq.id, 'quantity', e.target.value)}
                      placeholder="العدد"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <input
                      type="number"
                      value={eq.estimatedValue}
                      onChange={(e) => updateEquipmentItem(eq.id, 'estimatedValue', e.target.value)}
                      placeholder="القيمة المقدرة"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeEquipmentItem(eq.id)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold text-center"
                    >
                      حذف المعدة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3.4 Explicit Exclusions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">4. العناصر المستثناة صراحة من البيع</h2>
            </div>
            <textarea
              rows={2}
              value={excludedElementsExplicit}
              onChange={(e) => setExcludedElementsExplicit(e.target.value)}
              placeholder="مثال: لا يشمل البيع جدران المحل التجاري، ولا المركبة النفعية رقم ...، ولا الديون الشخصية للبائع."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: أطراف التفويت</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الكراء والأجراء والالتزامات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STAGE 4: Commercial Lease, Landlord Notice & Labour Law                */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="space-y-6">
          {/* 4.1 Commercial Leasehold & Landlord Notice (المادة 25 من القانون 49.16) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. الحق في الكراء وإشعار المكري (المادة 25 من القانون 49.16)</h2>
                  <p className="text-xs text-slate-400">يجوز تفويت حق الكراء دون موافقة المكري مع وجوب إشعاره رسمياً ليسري في مواجهته</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isOperatingInRentedPremises}
                    onChange={(e) => setIsOperatingInRentedPremises(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-800">الأصل مستغل في محل مكترى</span>
                </label>
              </div>
            </div>

            {isOperatingInRentedPremises ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المكري (مالك الجدران)</label>
                    <input
                      type="text"
                      value={lessorName}
                      onChange={(e) => setLessorName(e.target.value)}
                      placeholder="الاسم الكامل للمكري"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ عقد الكراء التجاري</label>
                    <input
                      type="date"
                      value={leaseContractDate}
                      onChange={(e) => setLeaseContractDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الوجيبة الكرائية الشهرية</label>
                    <input
                      type="text"
                      value={monthlyRentAmount}
                      onChange={(e) => setMonthlyRentAmount(e.target.value)}
                      placeholder="بالدرهم (مثال: 3500)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مدة الكراء</label>
                    <input
                      type="text"
                      value={leaseDuration}
                      onChange={(e) => setLeaseDuration(e.target.value)}
                      placeholder="مثال: سنة قابلة للتجديد"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المكري للتبليغ</label>
                    <input
                      type="text"
                      value={lessorAddress}
                      onChange={(e) => setLessorAddress(e.target.value)}
                      placeholder="موطن المكري لتبليغه بالإشعار القانوني"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">وصف المحل التجاري المكترى</label>
                    <input
                      type="text"
                      value={premisesDescription}
                      onChange={(e) => setPremisesDescription(e.target.value)}
                      placeholder="المحل التجاري، مساحته، مشتملاته..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Landlord Notification Status */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Newspaper className="w-4 h-4 text-amber-700" />
                      <span>حالة إشعار المكري بالتفويت (المادة 25):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'لم_يتم_بعد', label: 'لم يتم بعد' },
                        { key: 'تم_التبليغ_رسميا', label: 'تم التبليغ رسمياً' },
                        { key: 'تعذر_التبليغ', label: 'تعذر التبليغ' },
                        { key: 'يوجد_نزاع_حول_التبليغ', label: 'يوجد نزاع' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setNotificationStatus(item.key as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            notificationStatus === item.key
                              ? 'bg-amber-700 text-white shadow-sm'
                              : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {notificationStatus === 'تم_التبليغ_رسميا' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <input
                        type="date"
                        value={notificationDate}
                        onChange={(e) => setNotificationDate(e.target.value)}
                        placeholder="تاريخ التبليغ"
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={notificationMethod}
                        onChange={(e) => setNotificationMethod(e.target.value)}
                        placeholder="وسيلة التبليغ (مفوض قضائي)"
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={notificationDocumentRef}
                        onChange={(e) => setNotificationDocumentRef(e.target.value)}
                        placeholder="مرجع محضر التبليغ"
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs text-slate-700 block">
                  المحل التجاري مملوك للبائع (المفوت) أصالة:
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRealEstateSoldConcurrently}
                    onChange={(e) => setIsRealEstateSoldConcurrently(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-rose-900">
                    هل يرغب الأطراف في بيع العقار (الجدران) أيضاً؟
                  </span>
                </label>
                {isRealEstateSoldConcurrently && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed">
                    ⚠️ <strong>تنبيه منهجي قاطع:</strong> بيع العقار نفسه يستلزم رسماً عقارياً مستقلاً وفق المادة 4 من مدونة الحقوق العينية (39.08) ولا يجوز دمجه في هذا العقد باعتباره مالاً منقولاً معنوياً.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4.2 Labour & Employees (المادة 19 من مدونة الشغل) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. العمال والأجراء (المادة 19 من مدونة الشغل)</h2>
                  <p className="text-xs text-slate-400">استمرارية عقود الشغل الجارية وحلول المشتري محل المشغل السابق</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEmployees}
                  onChange={(e) => setHasEmployees(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">يوجد أجراء بالأصل التجاري</span>
              </label>
            </div>

            {hasEmployees && (
              <div className="space-y-3">
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>المادة 19 من مدونة الشغل:</strong> تستمر جميع عقود الشغل التي كانت سارية المفعول حتى تاريخ تغيير الوضعية القانونية للمشغل (بما فيها البيع). ويحل المشغل الجديد محل المشغل السابق في جميع الالتزامات المستحقة للأجراء. البيع لا يعتبر سبباً لإنهاء العقود!
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">بيانات الأجراء المستمرين مع المشتري:</span>
                  <button
                    type="button"
                    onClick={addEmployeeItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أجير</span>
                  </button>
                </div>

                {employeesList.map((emp) => (
                  <div key={emp.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <input
                      type="text"
                      value={emp.fullName}
                      onChange={(e) => updateEmployeeItem(emp.id, 'fullName', e.target.value)}
                      placeholder="اسم الأجير..."
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={emp.nationalId}
                      onChange={(e) => updateEmployeeItem(emp.id, 'nationalId', e.target.value)}
                      placeholder="رقم CIN"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white uppercase font-mono"
                    />
                    <input
                      type="text"
                      value={emp.jobTitle}
                      onChange={(e) => updateEmployeeItem(emp.id, 'jobTitle', e.target.value)}
                      placeholder="المهمة / المنصب"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={emp.monthlySalary}
                      onChange={(e) => updateEmployeeItem(emp.id, 'monthlySalary', e.target.value)}
                      placeholder="الأجر الشهري"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmployeeItem(emp.id)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold text-center"
                    >
                      حذف الأجير
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: عناصر الأصل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الرهون والدائنين</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. STAGE 5: Mortgages, Ownership Origin & Legal Restructuring             */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="space-y-6">
          {/* 5.1 Mortgages & Liens (المادة 81 من مدونة التجارة) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. حالة تقييد الامتيازات والرهون (بيان إلزامي بالمادة 81)</h2>
                  <p className="text-xs text-slate-400">حماية حقوق الدائنين المقيدين على الأصل التجاري بالسجل التجاري</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPledgedOrEncumbered}
                  onChange={(e) => setIsPledgedOrEncumbered(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-slate-900">الأصل التجاري مثقل برهن أو امتياز</span>
              </label>
            </div>

            {isPledgedOrEncumbered ? (
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الدائن المرتهن</label>
                    <input
                      type="text"
                      value={pledgeCreditorName}
                      onChange={(e) => setPledgeCreditorName(e.target.value)}
                      placeholder="البنك أو الدائن"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ الدين المضمون</label>
                    <input
                      type="text"
                      value={pledgeDebtAmount}
                      onChange={(e) => setPledgeDebtAmount(e.target.value)}
                      placeholder="المبلغ بالدرهم"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم التقييد بالسجل التجاري</label>
                    <input
                      type="text"
                      value={pledgeRegistrationNumber}
                      onChange={(e) => setPledgeRegistrationNumber(e.target.value)}
                      placeholder="رقم الرهن المقيد"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={hasDischarge}
                    onChange={(e) => setHasDischarge(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-950">
                    تم الإدلاء برفع اليد الصادر عن الدائن المرتهن / تسوية الدين
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>يصرح البائع بخلو الأصل التجاري من أي رهن أو امتياز مقيد بالسجل التجاري.</span>
              </div>
            )}
          </div>

          {/* 5.2 Ownership Origin (مصدر الملكية - المادة 81) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. مصدر ملكية الأصل التجاري (المادة 81)</h2>
                  <p className="text-xs text-slate-400">سند تملك البائع للأصل التجاري وسلسلة التداول</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'إنشاء_الأصل', label: 'إنشاء وتأسيس الأصل' },
                { key: 'شراء_سابق', label: 'شراء سابق' },
                { key: 'تفويت', label: 'عقد تفويت رسمي' },
                { key: 'إرث', label: 'إرث ومخلف' },
                { key: 'حصة_في_شركة', label: 'حصة في شركة' },
                { key: 'قسمة', label: 'قسمة رضائية أو قضائية' },
                { key: 'مزاد', label: 'مزاد قضائي' },
                { key: 'حكم_قضائي', label: 'حكم أو قرار قضائي' },
              ].map((origin) => (
                <button
                  key={origin.key}
                  type="button"
                  onClick={() => setOwnershipOriginType(origin.key as any)}
                  className={`p-3 rounded-2xl border text-center transition-all text-xs font-bold ${
                    ownershipOriginType === origin.key
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {origin.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <input
                type="text"
                value={ownershipOriginDetails}
                onChange={(e) => setOwnershipOriginDetails(e.target.value)}
                placeholder="بيان مصدر الملكية وتاريخ إنشائه أو تملكه..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                value={previousContractReference}
                onChange={(e) => setPreviousContractReference(e.target.value)}
                placeholder="مراجع العقد السابق، اسم البائع السابق، والثمن السابق إن وجد..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* 5.3 Bankruptcy & Restructuring Check (صعوبات المقاولة والحجوز) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>فحص مساطر صعوبات المقاولة والحجوز القضائية:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-2 p-3.5 rounded-2xl border border-slate-200 cursor-pointer bg-slate-50">
                <input
                  type="checkbox"
                  checked={isUnderBankruptcyOrRestructuring}
                  onChange={(e) => setIsUnderBankruptcyOrRestructuring(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    الشركة أو التاجر خاضع لمسطرة صعوبات المقاولة (الكتاب الخامس)
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    يستدعي مسطرة الإذن القضائي والبيع الرضائي تحت إشراف القاضي المنتدب.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-3.5 rounded-2xl border border-slate-200 cursor-pointer bg-slate-50">
                <input
                  type="checkbox"
                  checked={isSeizedOrDistrained}
                  onChange={(e) => setIsSeizedOrDistrained(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    الأصل التجاري موضوع حجز تحفظي أو تنفيذي
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    يمنع التفويت قبل رفع الحجز بحكم قضائي أو الإدلاء برفع اليد.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الكراء والأجراء</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الثمن والوديعة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. STAGE 6: Price, Mandatory Split, Depository & Oppositions              */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="space-y-6">
          {/* 6.1 Total Price & Mandatory 3-way Split */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. الثمن الإجمالي وتوزيعه الإلزامي (المادة 81 من مدونة التجارة)</h2>
                  <p className="text-xs text-slate-400">تمييز وجوبي بين العناصر المعنوية والبضائع والمعدات</p>
                </div>
              </div>

              {!isPriceDistributionBalanced ? (
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  غير متطابق مع الأجزاء
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  متطابق 100%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">الثمن الإجمالي للبيع (درهم مغربي)</label>
                <input
                  type="number"
                  value={totalPrice || ''}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  placeholder="مثال: 500000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-bold font-mono focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">الثمن الإجمالي بالحروف</label>
                <input
                  type="text"
                  value={totalPriceInWords}
                  onChange={(e) => setTotalPriceInWords(e.target.value)}
                  placeholder="خمسائة ألف درهم مغربي..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Mandatory 3-way Split */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <span className="text-xs font-bold text-emerald-950 block">
                توزيع الثمن وفق المادة 81 (مجموعها يجب أن يساوي الثمن الإجمالي):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. ثمن العناصر المعنوية (زبناء، سمعة، كراء...)
                  </label>
                  <input
                    type="number"
                    value={intangibleElementsPrice || ''}
                    onChange={(e) => setIntangibleElementsPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. ثمن البضائع (Marchandises)
                  </label>
                  <input
                    type="number"
                    value={goodsInventoryPrice || ''}
                    onChange={(e) => setGoodsInventoryPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. ثمن المعدات والأدوات والآلات
                  </label>
                  <input
                    type="number"
                    value={equipmentToolsPrice || ''}
                    onChange={(e) => setEquipmentToolsPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 text-xs font-bold">
                <span className="text-slate-600">
                  مجموع الأجزاء الثلاثة: {sumOfParts.toLocaleString('ar-MA')} درهم
                </span>
                {!isPriceDistributionBalanced && (
                  <span className="text-rose-600">
                    فارق عدم التطابق: {Math.abs(totalPrice - sumOfParts).toLocaleString('ar-MA')} درهم
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 6.2 Depository & Payment Method (إيداع الثمن لدى جهة مؤهلة) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. طريقة الأداء وسجل إيداع الثمن (المادة 81)</h2>
                  <p className="text-xs text-slate-400">إيداع الثمن لدى جهة مؤهلة قانوناً لحماية حقوق الأغيار</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الأداء</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="إيداع_لدى_جهة_مؤهلة">إيداع لدى جهة مؤهلة قانوناً (المادة 81)</option>
                  <option value="تحويل_بنكي">تحويل بنكي في حساب الودائع</option>
                  <option value="شيك_بنكي">شيك بنكي معتمد مودع</option>
                  <option value="دفع_جزئي">دفع جزئي مع باقٍ مؤجل</option>
                  <option value="دفع_كامل">دفع كامل</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الجهة المودع لديها</label>
                <input
                  type="text"
                  value={depositoryEntityName}
                  onChange={(e) => setDepositoryEntityName(e.target.value)}
                  placeholder="صندوق الإيداع والتدبير / البنك / العدل"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم وصل الإيداع / المرجع</label>
                <input
                  type="text"
                  value={depositoryReceiptNumber}
                  onChange={(e) => setDepositoryReceiptNumber(e.target.value)}
                  placeholder="رقم الوصل البنكي أو المحاسباتي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* 6.3 Oppositions by Creditors (تعرضات دائني البائع - المادة 84) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. تعرضات دائني البائع (المادة 84) وزيادة السدس (المادة 94)</h2>
                  <p className="text-xs text-slate-400">أجل التعرض: 15 يوماً بعد النشر الثاني، مع تحديد الموطن المختار</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addOppositionItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل تعرض دائن</span>
              </button>
            </div>

            {oppositionsList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>لم يسجل أي تعرض من دائني البائع حتى الآن.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {oppositionsList.map((opp) => (
                  <div key={opp.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl border border-rose-200 bg-rose-50/60">
                    <input
                      type="text"
                      value={opp.creditorName}
                      onChange={(e) => updateOppositionItem(opp.id, 'creditorName', e.target.value)}
                      placeholder="اسم الدائن المعترض..."
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={opp.debtAmount}
                      onChange={(e) => updateOppositionItem(opp.id, 'debtAmount', e.target.value)}
                      placeholder="مبلغ الدين المعترض عليه"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                    <input
                      type="text"
                      value={opp.chosenDomicile}
                      onChange={(e) => updateOppositionItem(opp.id, 'chosenDomicile', e.target.value)}
                      placeholder="الموطن المختار (إلزامي)"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <select
                      value={opp.status}
                      onChange={(e) => updateOppositionItem(opp.id, 'status', e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="قائم">تعرض قائم (يمنع تحرير الثمن)</option>
                      <option value="تم_رفع_اليد">تم رفع اليد</option>
                      <option value="سدد">تم تسديد الدين</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeOppositionItem(opp.id)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold text-center"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الرهون والدائنون</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الصياغة والاعتماد ودورة ما بعد البيع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. STAGE 7: Drafting, Timeline & Direct Step 7 Proceeding                 */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="space-y-6">
          {/* 7.1 Pre-Signing Checklist & Article 82 Compliance */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">1. الفحص القانوني الشامل وبيانات المادة 81 لحماية المشتري</h2>
              </div>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                المادة 82 تمنح المشتري حق الإبطال أو تخفيض الثمن عند إغفال هذه البيانات
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { title: 'اسم البائع وتاريخ التفويت', ok: !!sellerFullName || !!companyName },
                { title: 'نوع الأصل ومقره وسجله', ok: !!rcNumber && !!headquartersAddress },
                { title: 'الثمن وتوزيعه الثلاثي', ok: isPriceDistributionBalanced && totalPrice > 0 },
                { title: 'حالة الرهون والامتيازات', ok: true },
                { title: 'عقد الكراء وحق الكراء', ok: !isOperatingInRentedPremises || !!lessorName },
                { title: 'مصدر ملكية الأصل', ok: !!ownershipOriginType },
                { title: 'إشعار المكري بالتفويت', ok: !isOperatingInRentedPremises || notificationStatus === 'تم_التبليغ_رسميا' },
                { title: 'إيداع الثمن لدى جهة مؤهلة', ok: !!depositoryEntityName },
              ].map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    chk.ok
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950 font-bold'
                      : 'border-amber-200 bg-amber-50/60 text-amber-950'
                  }`}
                >
                  <span>{chk.title}</span>
                  <span>{chk.ok ? '✓' : '⚠️'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7.2 Post-Sale Legal Timeline (لوحة الزمن القانونية) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">2. لوحة الزمن ودورة حياة ما بعد البيع (Timeline)</h2>
                <p className="text-xs text-slate-400">المسار الإجرائي الإلزامي لتقييد ونشر وسريان بيع الأصل التجاري</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-center text-xs">
              {[
                { step: '1', title: 'تحرير وتوقيع العقد', time: todayGregorian, icon: FileText },
                { step: '2', title: 'التسجيل بإدارة الضرائب', time: 'داخل 30 يوماً', icon: FileCheck },
                { step: '3', title: 'الإيداع بكتابة الضبط', time: 'داخل 15 يوماً (م 83)', icon: Landmark },
                { step: '4', title: 'التقييد بالسجل التجاري', time: 'تقييد مستخرج العقد', icon: Store },
                { step: '5', title: 'النشران القانونيان', time: 'بين اليوم 8 و 15 (م 83)', icon: Newspaper },
                { step: '6', title: 'أجل التعرضات (15 يوماً)', time: 'تحرير الثمن للبائع', icon: ShieldCheck },
              ].map((tm, idx) => {
                const Icon = tm.icon;
                return (
                  <div key={idx} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] flex items-center justify-center font-bold">
                      {tm.step}
                    </span>
                    <Icon className="w-4 h-4 text-emerald-700 my-0.5" />
                    <span className="font-bold text-slate-900">{tm.title}</span>
                    <span className="text-[10px] text-slate-500">{tm.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7.3 Moroccan Authoritative Draft */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. مشروع الصياغة العدلية المغربية المتكاملة</h2>
                  <p className="text-xs text-slate-400">عقد تفويت أصل تجاري متوافق تماماً مع مدونة التجارة والقانون 49.16 ومدونة الشغل</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateAuthoritativeDraft);
                    alert('تم نسخ نص عقد تفويت الأصل التجاري بنجاح.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الصياغة</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-2xl">
              <pre className="font-amiri text-base leading-loose text-slate-900 whitespace-pre-wrap select-all text-justify">
                {generateAuthoritativeDraft}
              </pre>
            </div>
          </div>

          {/* 7.4 Action Buttons: Step 7 Transition */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الثمن والوديعة</span>
            </button>

            {/* Crucial Step 7 Integration Button: Does NOT call _onNext() */}
            <button
              type="button"
              onClick={handleProceedToStep7}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-900 text-white font-extrabold hover:from-emerald-800 hover:to-emerald-950 shadow-xl shadow-emerald-900/20 text-base transition-all transform hover:-translate-y-0.5"
            >
              <span>اعتماد المسودة والانتقال إلى المراجعة النهائية (الخطوة 7)</span>
              <Send className="w-5 h-5 text-emerald-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default BusinessSaleWizard;
