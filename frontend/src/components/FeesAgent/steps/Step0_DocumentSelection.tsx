import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { DocumentWizardProps } from '../types';
import type {
  PaymentMethod, PropertyType, ValidationSeverity, Party, Applicant,
  TitleDocumentDetails, OwnershipCertificateDetails, PropertyDetails,
  FinanceDetails, DocumentMeta, ValidationAlert, AuditEntry,
  AdministrativeCertificate, PostRegistrationDetails, InheritanceDeed,
  Witness, PartitionBeneficiary, PartitionDivision, FacilityShare,
  FacilityItem, CommonFacilities, BuildingProof, EasementProof,
  PossessionProof, PromiseToSell, ProofOfEstate, EstateInventory,
  WillDeed, ExchangeDeed, DeliveryDeed, AcknowledgmentDeed,
  DebtDischargeDeed, DebtAcknowledgmentDeed, PersonIdentityFields,
  BilingualPersonIdentity, MarriageContinuityDeed, MarriageDetails,
  DowryDetails, TawkilScope, FeesAgentState
} from '../../../types/feesAgentTypes';
import {
  createEmptyTitleDocument, createEmptyProperty, createEmptyPartitionDivision,
  createEmptyParty, createEmptyWitness, calculateAge, convertGregorianToHijri,
  generateFileNumber, convertNumberToArabicWords, convertGregorianDateToWords,
  convertHijriDateToWords, convertTimeToWords, getArabicWeekdayName,
  generateValidationId, generateValidationAlert, performValidationChecks,
  executeLegalFiltersForPossession, validatePossessionConditions,
  validateWitnessRequirements, generateOutcomeRouting
} from '../../../utils/feesAgentUtils';
import { formatCourtName, generateRasmHtml, generateDocumentDraft } from '../../../templates/feesAgentTemplates';
import {
  type DocumentType, type PartyLabels, DEFAULT_PARTY_LABELS,
  DOCUMENT_PARTY_LABELS, getPartyLabels, DOCUMENT_CATEGORIES,
  LEGAL_ENTITY_TYPE_OPTIONS, REPRESENTATION_DOC_TYPE_OPTIONS,
  PROFESSIONAL_CONVICTION_QUESTIONS, JUDGE_SEND_TRANSIT_MESSAGES,
  ARABIC_ONES, ARABIC_TENS, ARABIC_TEENS, ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC, SALE_DOCUMENT_TYPES, FAMILY_DEED_TYPES,
  MARRIAGE_DOCUMENT_TYPES, INHERITANCE_DOCUMENT_TYPES
} from '../../../constants/feesAgentLocales';
import {
  X, Plus, Minus, Download, Search, FileText, CheckCircle,
  AlertTriangle, Paperclip, Shield, Database, Activity,
  Clock, Clipboard, FileCheck, Book, UserCheck, MoreVertical,
  MapPin, XCircle, Printer, Upload, Calendar, ArrowRight, ArrowLeft,
  ChevronDown, ChevronUp, Info, HelpCircle
} from 'lucide-react';
import { ShareDistributionModal } from '../modals/ShareDistributionModal';
import { ExpandedTableModal } from '../modals/ExpandedTableModal';
import { VaultModal } from '../modals/VaultModal';
import { trpc } from '../../../trpc';
import { useAuth } from '../../../contexts/AuthContext';

interface PublicSearchResultRow {
  key: string;
  source: string;
  fullName?: string;
  documentNumber?: string;
  documentType?: string;
  documentDate?: string;
  partiesSummary?: string;
  [key: string]: any;
}

const normalizeIdentityRows = (data: any[]): PublicSearchResultRow[] => {
  return (data || []).map((item, index) => ({
    key: `identity-${item.id || index}`,
    source: 'identity',
    ...item,
  }));
};

const normalizeDocumentRows = (data: any): PublicSearchResultRow[] => {
  if (!data) return [];
  const items = Array.isArray(data) ? data : [data];
  return items.map((item, index) => ({
    key: `doc-${item.id || index}`,
    source: 'document',
    ...item,
  }));
};

export interface Step0Props extends DocumentWizardProps {
  startMode?: 'intake' | 'drafting';
}

const UniversalHeader: React.FC = () => (
  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 rounded-2xl shadow-xl border-b-4 border-purple-800 mb-8">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
        <span className="text-4xl">⚖️</span>
        تنبيه إرشادي لحضرة العدل المحترم
      </h2>
      <p className="text-lg leading-relaxed text-purple-50">
        حرصًا على دقة التوثيق وصحة التصرف، يُستحسن دعوة الأطراف إلى الإدلاء بالوثائق والمستندات المتطلبة والتصريحات الضرورية قبل تلقي الشهادة، لما لذلك من أثر في تحديد حقوق الانتفاع وحدود الاستعمال وإبراء الذمة المالية، خاصة عند انتقال الملكية أو تغيير الحالات القانونية للأطراف.
      </p>
    </div>
  </div>
);

export const Step0_DocumentSelection: React.FC<Step0Props> = ({ state, setState, onNext, onBack, startMode = 'intake' }) => {
  const { user } = useAuth();
  

  const addAuditEntry = (action: string, field: string, oldValue: string, newValue: string) => {
    setState((prev) => ({
      ...prev,
      auditTrail: [
        ...(prev.auditTrail || []),
        {
          timestamp: new Date().toLocaleString('ar-SA'),
          notary: currentNotary,
          action,
          field,
          oldValue,
          newValue,
        },
      ],
    }));
  };

  const currentNotary = user?.full_name || 'عدول متلقي';
  const pdfFontRegistered = useRef(false);
  const [publicSearchName, setPublicSearchName] = useState('');
  const [publicSearchReference, setPublicSearchReference] = useState('');
  const [publicSearchResults, setPublicSearchResults] = useState<PublicSearchResultRow[]>([]);
  const [publicSearchLoading, setPublicSearchLoading] = useState(false);
  const [publicSearchError, setPublicSearchError] = useState<string | null>(null);
  const [publicSearchTouched, setPublicSearchTouched] = useState(false);

  const identitySearchQuery = trpc.search.byIdentity.useQuery(
    { recordType: 'all', name: publicSearchName || undefined },
    { enabled: false },
  );

  const referenceSearchQuery = trpc.search.byDocumentRef.useQuery(
    { ref: publicSearchReference || '' },
    { enabled: false },
  );

  const formatPublicDate = useCallback((value?: string | null) => {
    if (!value) return '---';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('ar-MA');
  }, []);

  const handlePublicSearch = useCallback(async () => {
    const nameTerm = publicSearchName.trim();
    const referenceTerm = publicSearchReference.trim();

    if (!nameTerm && !referenceTerm) {
      setPublicSearchTouched(true);
      setPublicSearchError('يرجى إدخال اسم المعني بالأمر أو مرجع السجل قبل تنفيذ البحث.');
      setPublicSearchResults([]);
      return;
    }

    setPublicSearchTouched(true);
    setPublicSearchLoading(true);
    setPublicSearchError(null);

    try {
      const identityPromise = nameTerm ? identitySearchQuery.refetch() : Promise.resolve({ data: [] as any[] });
      const referencePromise = referenceTerm ? referenceSearchQuery.refetch() : Promise.resolve({ data: null as any });

      const [identityResult, referenceResult] = await Promise.all([identityPromise, referencePromise]);
      const mergedMap = new Map<string, PublicSearchResultRow>();

      normalizeIdentityRows(identityResult.data ?? []).forEach((row) => mergedMap.set(row.key, row));
      if (referenceTerm) {
        normalizeDocumentRows(referenceResult.data).forEach((row) => mergedMap.set(row.key, row));
      }

      const combined = Array.from(mergedMap.values());
      setPublicSearchResults(combined);
    } catch (error) {
      console.error(error);
      setPublicSearchResults([]);
      setPublicSearchError('تعذر تنفيذ البحث حالياً، يرجى المحاولة لاحقاً.');
    } finally {
      setPublicSearchLoading(false);
    }
  }, [identitySearchQuery, referenceSearchQuery, publicSearchName, publicSearchReference]);


    const isMinor = (dob?: string) => {
      if (!dob) return false;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age < 18;
    };

    const [tempSellers, setTempSellers] = useState<Party[]>(
      state.sellers.length ? state.sellers.map((seller) => ({ ...createEmptyParty(), ...seller })) : [createEmptyParty()],
    );
    const [tempBuyers, setTempBuyers] = useState<Party[]>(
      state.buyers.length ? state.buyers.map((buyer) => ({ ...createEmptyParty(), ...buyer })) : [createEmptyParty()],
    );
    
    const isInheritanceType = ['ara', 'fari', 'ihsa', 'اراثة', 'بيان_فريضة', 'احصاء_متروك', 'مقاسمة', 'ملكية', 'حيازة'].includes(state.documentType);
    const [tempApplicant, setTempApplicant] = useState<Applicant>(
      state.applicant ? { ...state.applicant } : { ...createEmptyParty(), capacity: '' }
    );
    const [tempApplicants, setTempApplicants] = useState<Applicant[]>(
      state.applicants && state.applicants.length > 0
        ? state.applicants
        : [{ ...createEmptyParty(), capacity: '' }]
    );
    const [tempInheritanceDeeds, setTempInheritanceDeeds] = useState<InheritanceDeed[]>(
      state.inheritanceDeeds && state.inheritanceDeeds.length > 0 
        ? state.inheritanceDeeds 
        : [{ book: '', page: '', number: '', date: '', notary: '' }]
    );

    const handleInheritanceDeedChange = (index: number, field: keyof InheritanceDeed, value: string) => {
      setTempInheritanceDeeds((prev) =>
        prev.map((deed, idx) => (idx === index ? { ...deed, [field]: value } : deed))
      );
    };

    const addInheritanceDeed = () => {
      setTempInheritanceDeeds((prev) => [...prev, { book: '', page: '', number: '', date: '', notary: '' }]);
    };

    const removeInheritanceDeed = (index: number) => {
      setTempInheritanceDeeds((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const [ownershipCriteria, setOwnershipCriteria] = useState(
      state.ownershipCriteria || { areApplicantsOwners: '', areOwnersAlive: '' }
    );

    let labels = getPartyLabels(state.documentType);
    if ((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes') {
      const isPossession = state.documentType === 'حيازة';
      if (ownershipCriteria.areApplicantsOwners === 'yes') {
        labels = {
          ...labels,
          buyerGroup: isPossession ? 'طالب الشهادة/الحائزون' : 'طالب الشهادة/الملاك',
          buyerSingle: isPossession ? 'الحائز' : 'المالك',
          buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
          buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
        };
      } else {
        labels = {
          ...labels,
          buyerGroup: isPossession ? 'الحائزون' : 'الملاك',
          buyerSingle: isPossession ? 'الحائز' : 'المالك',
          buyerAdd: isPossession ? 'إضافة حائز' : 'إضافة مالك',
          buyerShareTitle: isPossession ? 'توزيع حصص الحائزين' : 'توزيع حصص الملاك',
        };
      }
    }

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showBuyerShareModal, setShowBuyerShareModal] = useState(false);
    const [showSellerShareModal, setShowSellerShareModal] = useState(false);
    const [showDeceasedSelectionModal, setShowDeceasedSelectionModal] = useState(false);

    const handleSellerChange = (index: number, field: keyof Party, value: string | File | null) => {
      setTempSellers((prev) =>
        prev.map((seller, idx) =>
          idx === index
            ? ({
                ...seller,
                [field]: value,
              } as Party)
            : seller,
        ),
      );
    };

    const addSeller = () => {
      setTempSellers((prev) => [...prev, createEmptyParty()]);
    };

    const removeSeller = (index: number) => {
      setTempSellers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleBuyerChange = (index: number, field: keyof Party, value: string | File | null) => {
      setTempBuyers((prev) =>
        prev.map((buyer, idx) =>
          idx === index
            ? ({
                ...buyer,
                [field]: value,
              } as Party)
            : buyer,
        ),
      );
    };

    const addBuyer = () => {
      setTempBuyers((prev) => [...prev, createEmptyParty()]);
    };

    const removeBuyer = (index: number) => {
      setTempBuyers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleBuyerShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempBuyers(prev => prev.map((buyer, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...buyer, share: share.value } : buyer;
      }));
    };

    const handleSellerShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempSellers(prev => prev.map((seller, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...seller, share: share.value } : seller;
      }));
    };

    const handleApplicantChange = (field: keyof Applicant, value: any) => {
      setTempApplicant((prev) => ({ ...prev, [field]: value }));
    };

    const handleApplicantsChange = (index: number, field: keyof Applicant, value: any) => {
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index ? { ...app, [field]: value } : app
        )
      );
    };

    const addApplicant = () => {
      setTempApplicants((prev) => [...prev, { ...createEmptyParty(), capacity: '' }]);
    };

    const removeApplicant = (index: number) => {
      setTempApplicants((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
    };

    const handleApplicantsShareUpdate = (shares: { index: number; value: string }[]) => {
      setTempApplicants(prev => prev.map((app, idx) => {
        const share = shares.find(s => s.index === idx);
        return share ? { ...app, share: share.value } : app;
      }));
    };

    const handleApplicantProxyChange = (field: string, value: string) => {
      setTempApplicant((prev) => ({
        ...prev,
        proxyDetails: {
          book: '',
          page: '',
          number: '',
          date: '',
          notary: '',
          ...(prev.proxyDetails || {}),
          [field]: value,
        },
      }));
    };

    const handleApplicantsProxyChange = (index: number, field: string, value: string) => {
      setTempApplicants((prev) =>
        prev.map((app, idx) =>
          idx === index
            ? {
                ...app,
                proxyDetails: {
                  book: '',
                  page: '',
                  number: '',
                  date: '',
                  notary: '',
                  ...(app.proxyDetails || {}),
                  [field]: value,
                },
              }
            : app
        )
      );
    };



    const handleNext = () => {
      const newErrors: Record<string, string> = {};

      const shouldValidateSellers = !((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areOwnersAlive === 'yes');

      if (shouldValidateSellers && !tempSellers.length) {
        newErrors.sellers = 'يجب إضافة بائع واحد على الأقل';
      }

      if (shouldValidateSellers) {
        tempSellers.forEach((seller, index) => {
          if (!seller.name || seller.name.length < 3) newErrors[`seller_${index}_name`] = 'الاسم الكامل مطلوب';
          if (!seller.fatherName) newErrors[`seller_${index}_father`] = 'اسم الأب مطلوب';
          if (!seller.motherName) newErrors[`seller_${index}_mother`] = 'اسم الأم مطلوب';
          if (!seller.address) newErrors[`seller_${index}_address`] = 'عنوان السكنى مطلوب';
          
          // Skip ID validation for foreign husband in mixed marriage
          const isForeignHusband = state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'husband';
          if (!isForeignHusband && (!seller.idNumber || seller.idNumber.length < 4)) {
            newErrors[`seller_${index}_id`] = 'رقم البطاقة غير صحيح';
          }

          if (state.documentType !== 'زواج' && state.documentType !== 'زواج_مختلط' && !seller.share) newErrors[`seller_${index}_share`] = 'حصة البائع مطلوبة';
        });
      }

      if (!tempBuyers.length) {
        newErrors.buyers = 'يجب إضافة مشتري واحد على الأقل';
      }

      tempBuyers.forEach((buyer, index) => {
        if (!buyer.name || buyer.name.length < 3) newErrors[`buyer_${index}_name`] = 'الاسم الكامل مطلوب';
        if (!buyer.fatherName) newErrors[`buyer_${index}_father`] = 'اسم الأب مطلوب';
        if (!buyer.motherName) newErrors[`buyer_${index}_mother`] = 'اسم الأم مطلوب';
        if (!buyer.address) newErrors[`buyer_${index}_address`] = 'عنوان السكنى مطلوب';
        
        // Skip ID validation for foreign wife in mixed marriage
        const isForeignWife = state.documentType === 'زواج_مختلط' && state.marriageDetails?.mixedMarriageForeignParty === 'wife';
        if (!isForeignWife && (!buyer.idNumber || buyer.idNumber.length < 4)) {
          newErrors[`buyer_${index}_id`] = 'رقم البطاقة غير صحيح';
        }
      });

      if (isInheritanceType) {
        if ((state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no') {
          // Validate multiple applicants
          tempApplicants.forEach((app, index) => {
            if (!app.name || app.name.length < 3) newErrors[`applicant_${index}_name`] = 'الاسم الكامل مطلوب';
            if (!app.fatherName) newErrors[`applicant_${index}_father`] = 'اسم الأب مطلوب';
            if (!app.motherName) newErrors[`applicant_${index}_mother`] = 'اسم الأم مطلوب';
            if (!app.address) newErrors[`applicant_${index}_address`] = 'عنوان السكنى مطلوب';
            if (!app.idNumber || app.idNumber.length < 4) newErrors[`applicant_${index}_id`] = 'رقم البطاقة غير صحيح';
            if (!app.capacity) newErrors[`applicant_${index}_capacity`] = 'الصفة مطلوبة';
            
            if (app.capacity === 'بتوكيل') {
              if (!app.proxyDetails?.book) newErrors[`applicant_${index}_proxy_book`] = 'الدفتر مطلوب';
              if (!app.proxyDetails?.page) newErrors[`applicant_${index}_proxy_page`] = 'الصحيفة مطلوبة';
              if (!app.proxyDetails?.number) newErrors[`applicant_${index}_proxy_number`] = 'العدد مطلوب';
              if (!app.proxyDetails?.date) newErrors[`applicant_${index}_proxy_date`] = 'التاريخ مطلوب';
              if (!app.proxyDetails?.notary) newErrors[`applicant_${index}_proxy_notary`] = 'التوثيق مطلوب';
            }
          });
        } else {
          // Validate single applicant (existing logic)
          if (!tempApplicant.name || tempApplicant.name.length < 3) newErrors[`applicant_name`] = 'الاسم الكامل مطلوب';
          if (!tempApplicant.fatherName) newErrors[`applicant_father`] = 'اسم الأب مطلوب';
          if (!tempApplicant.motherName) newErrors[`applicant_mother`] = 'اسم الأم مطلوب';
          if (!tempApplicant.address) newErrors[`applicant_address`] = 'عنوان السكنى مطلوب';
          if (!tempApplicant.idNumber || tempApplicant.idNumber.length < 4) newErrors[`applicant_id`] = 'رقم البطاقة غير صحيح';
          if (!tempApplicant.capacity) newErrors[`applicant_capacity`] = 'الصفة مطلوبة';
          
          if (tempApplicant.capacity === 'بتوكيل') {
            if (!tempApplicant.proxyDetails?.book) newErrors[`applicant_proxy_book`] = 'الدفتر مطلوب';
            if (!tempApplicant.proxyDetails?.page) newErrors[`applicant_proxy_page`] = 'الصحيفة مطلوبة';
            if (!tempApplicant.proxyDetails?.number) newErrors[`applicant_proxy_number`] = 'العدد مطلوب';
            if (!tempApplicant.proxyDetails?.date) newErrors[`applicant_proxy_date`] = 'التاريخ مطلوب';
            if (!tempApplicant.proxyDetails?.notary) newErrors[`applicant_proxy_notary`] = 'التوثيق مطلوب';
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setState((prev) => ({
        ...prev,
        sellers: tempSellers,
        buyers: tempBuyers,
        applicant: isInheritanceType ? tempApplicant : undefined,
        applicants: (isInheritanceType && (state.documentType === 'ملكية' || state.documentType === 'حيازة') && ownershipCriteria.areApplicantsOwners === 'no') ? tempApplicants : undefined,
        inheritanceDeeds: isInheritanceType ? tempInheritanceDeeds : undefined,
        ownershipCriteria: (state.documentType === 'ملكية' || state.documentType === 'حيازة') ? ownershipCriteria : undefined,
        step: prev.step + 1,
        validationAlerts: performValidationChecks({
          ...prev,
          sellers: tempSellers,
          buyers: tempBuyers,
          applicant: isInheritanceType ? tempApplicant : undefined,
        }),
      }));
    };

  // Load state from props if provided
  useEffect(() => {
    if (state) {
      // initial state applied
    }
  }, [state]);

  // Save state to localStorage whenever it changes (debounced or on specific actions)
  // For now, we will rely on the manual save button to avoid overwriting with empty state on initial load race conditions
  
  const saveProgress = () => {
    try {
      localStorage.setItem('feesAgentState', JSON.stringify(state));
      alert('✓ تم حفظ التقدم بنجاح في المتصفح');
    } catch (e) {
      console.error('Failed to save state', e);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  // ============================================================================
  // خطوة 0: اختيار نوع الرسم
  // ============================================================================

  // ============================================================================
  // خطوات الاشهاد على الطلاق الاتفاقي
  // ============================================================================









  const Step0_DocumentTypeSelection = () => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [propertySearch, setPropertySearch] = useState<string>('');
    const [inheritanceSearch, setInheritanceSearch] = useState<string>('');
    const [marriageSearch, setMarriageSearch] = useState<string>('');
    const [otherSearch, setOtherSearch] = useState<string>('');

    const handleDocumentSelect = (type: DocumentType) => {
      const isMarriage = type === 'زواج' || type === 'زواج_مختلط';
      const isLegalEntity = type === 'بيع_وشراء_معنوي';
      const isDivorce = type === 'الاشهاد_على_الطلاق_الاتفاقي';

      setState((prev) => ({
        ...prev,
        documentType: type,
        step: startMode === 'drafting' ? 7 : 0.1, // Go to Decision Gateway or Drafting
        legalEntitySetupStep: isLegalEntity ? 1 : 0,
        marriageDetails: isMarriage ? {
          dowryAmount: 0,
          dowryAmountInWords: '',
          isDowryReceived: '',
          hijriDate: '',
          registryBookType: '',
          registryNumber: '',
          registryPage: '',
          registryCount: '',
          authorizationNumber: '',
          authorizationDate: '',
        } : undefined,
        divorceCertification: isDivorce ? {
          hasJudicialPermission: undefined,
          isExecutive: undefined,
          husband: { name: '', idNumber: '', address: '', presence: 'present' },
          wife: { name: '', idNumber: '', address: '', presence: 'present' },
          marriageContractType: 'moroccan',
          divorceCount: 'first',
          consummationStatus: 'after',
          hasChildren: 'no',
          judgmentSummary: ''
        } : undefined
      }));
      addAuditEntry('اختيار نوع الرسم', 'documentType', '', type);
    };

    const proceedToWizard = () => {
       setState(prev => ({
         ...prev,
         step: prev.documentType === 'زواج_مختلط' ? 0.5 : 1
       }));
    };

    // 0. Dashboard
    if (state.step === 0 || state.step === undefined || state.step === null) {
      const categories = [
        {
          id: 'marriage',
          title: 'رسوم الزواج',
          icon: '💍',
          desc: 'تشمل الرسوم المرتبطة بعقد الزواج وآثاره واستمراره، وفق مدونة الأسرة.',
          items: [
            { label: 'رسم زواج', value: 'زواج' },
            { label: 'رسم زواج مختلط', value: 'زواج_مختلط' },
            { label: 'رسم استمرار زواج', value: 'رسم_استمرار_زواج' },
          ],
          alert: 'قد تستوجب بعض الرسوم إذنًا قضائيًا أو وثائق إدارية بحسب الحالة.',
          ref: 'مدونة الأسرة، المواد 10، 14، 16، 21، 124',
          link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
          color: 'pink'
        },
        {
          id: 'divorce',
          title: 'رسوم الطلاق',
          icon: '💔',
          desc: 'تشمل الرسوم المثبتة لانحلال العلاقة الزوجية أو توثيق آثاره، بناءً على اتفاق أو حكم قضائي.',
          items: [
            { label: 'رسم طلاق اتفاقي', value: 'الاشهاد_على_الطلاق_الاتفاقي' },
          ],
          alert: 'التلقي في بعض هذه الرسوم يكون بناءً على حكم قضائي نهائي.',
          ref: 'مدونة الأسرة، المواد 78 إلى 93',
          link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
          color: 'red'
        },
        {
          id: 'property',
          title: 'رسوم الأملاك',
          icon: '🏠',
          desc: 'تشمل الرسوم المثبتة للملكية، أو الحيازة، أو التصرفات الواردة على العقار.',
          items: [
            { label: 'رسم شراء (شخص ذاتي)', value: 'بيع_وشراء' },
            { label: 'رسم شراء (شخص معنوي)', value: 'بيع_وشراء_معنوي' },
            { label: 'رسم شراء في الملكية المشتركة', value: 'بيع_وشراء_ملكية_مشتركة' },
            { label: 'عقد إيجار المفضي إلى تملك عقار', value: 'عقد_ايجار_المفضي_الى_تملك' },
            { label: 'كراء طويل الأمد', value: 'كراء_طويل_الامد' },
            { label: 'عقد تحبيس', value: 'عقد_تحبيس' },
            { label: 'عقد بيع حق الهواء و التعلية', value: 'عقد_بيع_حق_الهواء_والتعلية' },
            { label: 'عقد تفويت حق السطحية', value: 'عقد_تفويت_حق_السطحية' },
            { label: 'ثبوت زينة عقار', value: 'ثبوت_زينة_عقار' },
            { label: 'رسم ثبوت بناء', value: 'ثبوت_بناء' },
            { label: 'عقد العمری', value: 'عقد_العمري' },
            { label: 'بيع عقار في طور الانجاز- عقد البيع الابتدائي', value: 'بيع_وشراء_طور_انجاز_ابتدائي' },
            { label: 'بيع عقار في طور الانجاز- عقد البيع النهائي', value: 'بيع_وشراء_طور_انجاز_نهائي' },
            { label: 'رسم ملك', value: 'ملكية' },
            { label: 'رسم حيازة', value: 'حيازة' },
            { label: 'رسم مقاسمة', value: 'مقاسمة' },
            { label: 'رسم مناقلة', value: 'مناقلة' },
            { label: 'رسم هبة', value: 'هبة' },
            { label: 'رسم صدقة', value: 'صدقة' },
            { label: 'رسم رهن', value: 'رهن' },
            { label: 'وعد بالبيع', value: 'وعد_بالبيع' },
            { label: 'رسم تسليم بعوض', value: 'رسم_تسليم_بعوض' },
            { label: 'رسم اقرار واعتراف', value: 'رسم_اقرار_واعتراف' },
          ],
          alert: 'تختلف المتطلبات بحسب ما إذا كان العقار محفظًا أو غير محفظ.',
          ref: 'مدونة الحقوق العينية / ظهير التحفيظ العقاري',
          link: 'https://www.sgg.gov.ma/Portals/0/lois/droits_ainiya_AR.pdf',
          color: 'blue'
        },
        {
          id: 'inheritance',
          title: 'رسوم التركات',
          icon: '⚰️',
          desc: 'تشمل الرسوم المثبتة للوفاة، والورثة، والمخلف، وتنزيل الحقوق.',
          items: [
            { label: 'رسم إراثة', value: 'اراثة' },
            { label: 'رسم إحصاء متروك', value: 'احصاء_متروك' },
            { label: 'ثبوت مخلف', value: 'ثبوت_مخلف' },
            { label: 'بيان فريضة', value: 'بيان_فريضة' },
            { label: 'رسم وصية', value: 'وصية' },
          ],
          alert: 'يُستحسن التحقق من الصفة وعدد الورثة دون البحث في صحة الأنصبة.',
          ref: 'مدونة الأسرة (الكتاب السادس) / قانون الالتزامات والعقود',
          link: 'https://www.sgg.gov.ma/Portals/0/lois/MoudawanaAlOsra_AR.pdf',
          color: 'purple'
        },
        {
          id: 'other',
          title: 'رسوم باقي الوثائق',
          icon: '📄',
          desc: 'تشمل الرسوم ذات الطابع التمثيلي أو الإجرائي.',
          items: [
            { label: 'رسم وكالة', value: 'توكيل_رسمي' },
            { label: 'رسم الاقرار ببنوة/عقد الاستلحاق', value: 'رسم_الاقرار_ببنوة' },
            { label: 'ثبوت نسب ببينة السماع', value: 'ثبوت_نسب_ببينة_السماع' },
            { label: 'اتفاق على تدبير اموال الزوجية/نظام المشاركة', value: 'اتفاق_تدبير_اموال_زوجية' },
            { label: 'ثبوت مرفق (حق ارتفاق)', value: 'ثبوت_مرفق' },
            { label: 'رهن رسمي على عقار', value: 'رهن' },
            { label: 'رهن حيازي', value: 'رهن_حيازي' },
            { label: 'رسم إبراء من دين', value: 'رسم_إبراء_من_دين' },
            { label: 'رسم اقرار بدين (الاعتراف)', value: 'رسم_اقرار_بدين' },
            { label: 'رسم آخر', value: 'أخرى' },
          ],
          alert: 'يُراعى التحقق من الأهلية وحدود الوكالة دون التوسع في التأويل.',
          ref: 'قانون الالتزامات والعقود، الفصول 879 وما يليها',
          link: 'https://www.sgg.gov.ma/Portals/0/lois/dahir_obligations_contrats_AR.pdf',
          color: 'gray'
        }
      ];


      return (
        <div className="space-y-8 animate-fadeIn pb-12">
          {/* Header */}
          <div className="text-center space-y-4 py-8 bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-100 shadow-sm">
            <h1 className="text-4xl font-bold text-gray-900 font-amiri">
              {startMode === 'drafting' ? 'تحرير الرسوم (استيراد)' : 'منصة العدل الذكي'}
            </h1>
            <div className="max-w-3xl mx-auto text-lg text-gray-600 leading-relaxed px-4">
              <p className="font-semibold text-blue-800 mb-2">حضرة العدل المحترم،</p>
              {startMode === 'drafting' ? (
                <p>يرجى اختيار نوع الرسم لاستيراد ملفه (Word/PDF) وإرساله إلى القاضي المكلف بالتوثيق.</p>
              ) : (
                <p>لتيسير عملية التلقي، وتنظيم الرسوم العدلية بحسب طبيعتها القانونية، يرجى اختيار الفئة المناسبة، ثم تحديد الرسم المراد تلقيه، مع احتفاظكم بكامل الصلاحية التقديرية في التكييف والتسمية.</p>
              )}
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 gap-12">
            {categories.map((cat) => {
              const isOpen = expandedCategory === cat.id;
              
              // Map colors to banner classes
              let bannerColorClass = 'islamic-category-banner--red';
              if (cat.id === 'marriage') bannerColorClass = 'islamic-category-banner--red';
              if (cat.id === 'divorce') bannerColorClass = 'islamic-category-banner--blue';
              if (cat.id === 'property') bannerColorClass = 'islamic-category-banner--green';
              if (cat.id === 'inheritance') bannerColorClass = 'islamic-category-banner--silver';
              if (cat.id === 'other') bannerColorClass = 'islamic-category-banner--purple';

              return (
                <div
                  key={cat.id}
                  className="transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : cat.id)}
                    className={`islamic-category-banner ${bannerColorClass} ${isOpen ? 'islamic-category-banner--open' : ''}`}
                    aria-expanded={isOpen}
                  >
                    <div className="islamic-category-banner__icon" aria-hidden="true">
                      {cat.icon}
                    </div>
                    <div className="islamic-category-banner__text">
                      <div className="islamic-category-banner__title">{cat.title}</div>
                      <div className="islamic-category-banner__desc">{cat.desc}</div>
                    </div>
                    <div
                      className={`islamic-category-banner__chev ${isOpen ? 'islamic-category-banner__chev--open' : ''}`}
                      aria-hidden="true"
                    >
                      ▼
                    </div>
                  </button>

                  {/* Content - Collapsible */}
                  <div
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="pt-4 px-2 space-y-6">
                    {/* Search Bar for Property Category */}
                    {cat.id === 'property' && (
                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="🔍 ابحث عن الرسم المطلوب..."
                            value={propertySearch}
                            onChange={(e) => setPropertySearch(e.target.value)}
                            className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-right"
                          />
                          <span className="absolute left-3 top-3 text-gray-400">🔎</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          عدد النتائج: {cat.items.filter(item => 
                            item.label.includes(propertySearch) || 
                            item.value.includes(propertySearch)
                          ).length} من {cat.items.length}
                        </p>
                      </div>
                    )}

                    {/* Sub-fees List (Enhanced for Property) */}
                    {cat.id === 'property' ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {cat.items
                          .filter(item => 
                            propertySearch === '' || 
                            item.label.includes(propertySearch) || 
                            item.value.includes(propertySearch)
                          )
                          .map((item) => (
                            <button
                              key={item.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentSelect(item.value as DocumentType);
                              }}
                              className={`w-full text-right px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-medium rounded-lg transition-all shadow-sm hover:shadow-md hover:translate-x-1 flex items-center justify-between group`}
                            >
                              <span className="flex-1">{item.label}</span>
                              <span className="text-gray-400 group-hover:text-blue-500 transition-colors ml-2">←</span>
                            </button>
                          ))}
                        {cat.items.filter(item => 
                          propertySearch === '' || 
                          item.label.includes(propertySearch) || 
                          item.value.includes(propertySearch)
                        ).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p className="text-lg">لم يتم العثور على نتائج 😔</p>
                            <p className="text-sm">جرب كلمات مفتاحية أخرى</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {(() => {
                          let searchTerm = '';
                          let setSearch: (v: string) => void = () => {};
                          
                          if (cat.id === 'inheritance') {
                            searchTerm = inheritanceSearch;
                            setSearch = setInheritanceSearch;
                          } else if (cat.id === 'marriage') {
                            searchTerm = marriageSearch;
                            setSearch = setMarriageSearch;
                          } else if (cat.id === 'other') {
                            searchTerm = otherSearch;
                            setSearch = setOtherSearch;
                          }
                          
                          return (
                            <>
                              {/* Search Bar */}
                              <div className="mb-4">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="🔍 ابحث عن الرسم المطلوب..."
                                    value={searchTerm}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-right"
                                  />
                                  <span className="absolute left-3 top-3 text-gray-400">🔎</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  عدد النتائج: {cat.items.filter(item => 
                                    item.label.includes(searchTerm) || 
                                    item.value.includes(searchTerm)
                                  ).length} من {cat.items.length}
                                </p>
                              </div>

                              {/* Items List */}
                              <div className="space-y-2">
                                {cat.items
                                  .filter(item => 
                                    searchTerm === '' || 
                                    item.label.includes(searchTerm) || 
                                    item.value.includes(searchTerm)
                                  )
                                  .map((item) => (
                                      <button
                                        key={item.label}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDocumentSelect(item.value as DocumentType);
                                        }}
                                        className="w-full text-right px-4 py-3 bg-white border-2 border-gray-200 hover:border-red-800 hover:bg-rose-50 text-gray-700 font-medium rounded-lg transition-all shadow-sm hover:shadow-md hover:translate-x-1 flex items-center justify-between group"
                                      >
                                        <span className="flex-1">{item.label}</span>
                                        <span className="text-gray-400 group-hover:text-red-800 transition-colors ml-2">←</span>
                                      </button>
                                    ))}
                                {cat.items.filter(item => 
                                  searchTerm === '' || 
                                  item.label.includes(searchTerm) || 
                                  item.value.includes(searchTerm)
                                ).length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    <p className="text-lg">لم يتم العثور على نتائج 😔</p>
                                    <p className="text-sm">جرب كلمات مفتاحية أخرى</p>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Smart Alert & Reference */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-4">
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 flex items-start gap-2">
                        <span className="text-lg">💡</span>
                        <p>{cat.alert}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-600 flex items-start gap-2">
                        <span className="text-lg">⚖️</span>
                        <div>
                          <p className="font-semibold mb-1">المرجع القانوني:</p>
                          <a href={cat.link} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600 flex items-center gap-1">
                            {cat.ref}
                            <span className="text-xs">🔗</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 0.1 Decision Gateway
    if (state.step === 0.1) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-t-8 border-blue-600">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">بوابة القرار المهني</h2>
            
            <div className="bg-blue-50 p-6 rounded-xl mb-8 text-lg text-gray-700 leading-relaxed border border-blue-100">
              <p className="font-bold mb-2">حضرة العدل المحترم،</p>
              <p>قبل الشروع في تلقي هذا الرسم، يضع التطبيق بين أيديكم مسارين مهنيين متكاملين، مع احتفاظكم بكامل الصلاحية التقديرية.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1 */}
              <div className="border-2 border-green-100 rounded-xl p-6 hover:border-green-500 transition-all cursor-pointer group" onClick={proceedToWizard}>
                <div className="mb-4 bg-green-100 w-16 h-16 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  ✅
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">التلقي المباشر</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  يُستحسن اعتماد هذا الخيار إذا تبين لكم أن صفة الأطراف ثابتة، وأن المعطيات الجوهرية للعقار واضحة، ولا يعتري الملف ما يوجب التوقف أو التثبت الإضافي.
                </p>
                <button className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-md">
                  الشروع مباشرة في تلقي الشهادة
                </button>
              </div>

              {/* Option 2 */}
              <div className="border-2 border-blue-100 rounded-xl p-6 hover:border-blue-500 transition-all cursor-pointer group" onClick={() => setState(prev => ({ ...prev, step: 0.2 }))}>
                <div className="mb-4 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  🔍
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">التذكير الإرشادي بالمتطلبات</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  يتيح لكم هذا المسار الاطلاع على قائمة إرشادية بالوثائق والشروط القانونية المعتادة، دون أن يشكل ذلك مانعًا من التلقي، أو مساسًا بصلاحيتكم التقديرية.
                </p>
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
                  الاطلاع على المتطلبات
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setState(prev => ({ ...prev, step: 0 }))} className="text-gray-500 hover:text-gray-700 font-medium">
            ← العودة للقائمة الرئيسية
          </button>
        </div>
      );
    }

    // 0.2 Requirements
    if (state.step === 0.2) {
      // Universal header for all document types
      const UniversalHeader = () => (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8 rounded-2xl shadow-xl border-b-4 border-purple-800 mb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <span className="text-4xl">⚖️</span>
              تنبيه إرشادي لحضرة العدل المحترم
            </h2>
            <p className="text-lg leading-relaxed text-purple-50">
              حرصًا على دقة التوثيق وصحة التصرف، يُستحسن دعوة الأطراف إلى الإدلاء بالوثائق والمستندات المتطلبة والتصريحات الضرورية قبل تلقي الشهادة، لما لذلك من أثر في تحديد حقوق الانتفاع وحدود الاستعمال وإبراء الذمة المالية، خاصة عند انتقال الملكية أو تغيير الحالات القانونية للأطراف.
            </p>
          </div>
        </div>
      );

      // Special requirements for preliminary property sale
      if (state.documentType === 'بيع_وشراء_طور_انجاز_ابتدائي') {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <UniversalHeader />
            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚖️</span>
                <p className="text-yellow-800 font-medium pt-1">
                  قبل تلقي العقد الابتدائي، يلزم التأكد من توفر الوثائق الأساسية التي تمكّن من ضبط البناء من الناحية القانونية والتقنية وتوفير قدر من الحماية للمتعاقِدين، طبقًا للقانون رقم 44.00 المتعلق ببيع العقار في طور الإنجاز.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي ({state.documentType})</h2>
              
              <div className="space-y-8">
                {/* Section 1: من طرف البائع */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1️⃣</span>
                    من طرف البائع (المنعش العقاري / المالك)
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">الوثائق المطلوبة في هذه المرحلة تُبرز مشروعية المشروع وقابليته للتنفيذ:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">دفتر التحملات (يحدد التزامات وخصائص المشروع)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">رخصة البناء (إثبات وجود مشروع قابل للبناء قانونيًا)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">التصاميم الهندسية (معمارية وتقنية – تُمكّن المشتري من تصور الوحدة)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">شهادة الأساسات أو ما يثبت انطلاق الأشغال (حسب المرحلة)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">سند الملك أو ما يقوم مقامه (ملكية أو حق عيني يخول التصرف)</span>
                    </label>
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mt-3 border-r-4 border-blue-400">
                      <p className="font-semibold mb-2">📋 إشارة قانونية:</p>
                      <p>القانون 44.00 يربط مشروعية العقد الابتدائي باكتمال عناصر البناء القانونية والمالية بشكل يسمح بالتعاقد دون انتظار نهاية الأشغال.</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: من طرف المشتري */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2️⃣</span>
                    من طرف المشتري
                  </h3>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">بطاقة التعريف الوطنية</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">الحالة العائلية (لتحديد الأثر القانوني للعقد والأسرة)</span>
                    </label>
                    <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 mt-3 border-r-4 border-yellow-400">
                      <p className="font-semibold mb-2">⚠️ ملاحظة عدلية:</p>
                      <p>الحالة العائلية قد تؤثر على الملكية بين الزوجين وتستدعي التنبيه عند الاقتضاء.</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: ضمانات العقد الابتدائي */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">3️⃣</span>
                    ضمانات العقد الابتدائي
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">العقد الابتدائي يجب أن ينص على:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الثمن (شروط الدفع والأقساط)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الآجال (مدة الإنجاز والتسليم)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ المساحة التقريبية</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ وصف العقار وتقسيمه</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الرسوم والضرائب</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الجزاءات عند الإخلال</span>
                    </label>
                    <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 mt-3 border-r-4 border-green-400">
                      <p className="font-semibold mb-2">📌 إشارة:</p>
                      <p>في هذه المرحلة، لا يُطلب بعد شهادة المطابقة أو شهادة السكن لأنها تخص العقد النهائي عند التسليم.</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: التقييد الاحتياطي */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">4️⃣</span>
                    التقييد الاحتياطي (اختياري وقائي)
                  </h3>
                  <div className="space-y-3 pr-10">
                    <p className="text-gray-700 text-sm">يُستحسن تنبيه المشتري إلى إمكانية التقييد الاحتياطي لدى المحافظة العقارية لحماية حقه إلى حين العقد النهائي.</p>
                    <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800 border-r-4 border-purple-400">
                      <p className="font-semibold mb-2">📜 أساس قانوني:</p>
                      <p>مدونة الحقوق العينية — المادة المتعلقة بالتقييد الاحتياطي (قانون 39.08).</p>
                    </div>
                  </div>
                </div>

                {/* Section 5: الجزاءات */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">5️⃣</span>
                    الجزاءات في حالة الإخلال قبل العقد النهائي
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">في حالة إخلال أحد الأطراف، يمكن اللجوء إلى:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• فسخ العقد الابتدائي</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• استرجاع المبالغ المدفوعة</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• التعويض عند الاقتضاء</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• التنفيذ العيني إذا أمكن</span>
                    </label>
                    <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 mt-3 border-r-4 border-red-400">
                      <p className="font-semibold mb-2">📜 أساس عام:</p>
                      <p>ظهير الالتزامات والعقود في مبادئ الفسخ والتعويض.</p>
                    </div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border-r-4 border-blue-500 space-y-3">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🟩</span>
                    تنبيه لطيف داخل التطبيق للعدل
                  </h4>
                  <p className="text-gray-700 text-sm">
                    يُفضّل حثّ المتعاقدين على الإدلاء بهذه الوثائق قبل تلقي العقد الابتدائي لتيسير عملية الإعداد وضمان سلامة المضمون قانونيًا وتوثيقيًا، قبل المرور للعقد النهائي عند استكمال الأشغال.
                  </p>
                </div>

                {/* References */}
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span>
                    مراجع موثوقة (روابط رسمية)
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>📌 <strong>القانون 44.00</strong> — بيع العقار في طور الإنجاز<br/>وزارة العدل: https://adala.justice.gov.ma (ابحث: "قانون رقم 44.00 بيع العقار في طور الإنجاز")</p>
                    <p>📌 <strong>ظهير الالتزامات والعقود</strong><br/>https://adala.justice.gov.ma (ابحث: "ظهير الالتزامات والعقود")</p>
                    <p>📌 <strong>مدونة الحقوق العينية — قانون 39.08</strong><br/>https://adala.justice.gov.ma (ابحث: "قانون رقم 39.08")</p>
                    <p>📌 <strong>المحافظة العقارية ANCFCC</strong><br/>https://www.ancfcc.gov.ma</p>
                    <p>📌 <strong>دراسات أكاديمية</strong> — بيع العقار في طور الإنجاز<br/>https://revues.imist.ma</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  السابق
                </button>
                <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                  التالي: أسئلة اختيارية
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Default requirements for other document types
      if (state.documentType === 'بيع_وشراء_طور_انجاز_نهائي') {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <UniversalHeader />
            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚖️</span>
                <p className="text-yellow-800 font-medium pt-1">
                  قبل تلقي العقد النهائي، يوصى بالتأكد من سلامة العناصر القانونية والتقنية والمالية التي تخول الانتقال من مرحلة العقد الابتدائي إلى مرحلة البيع النهائي، على ضوء أحكام القانون رقم 44.00 المتعلق ببيع العقار في طور الإنجاز والقوانين المكملة له.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي ({state.documentType})</h2>
              
              <div className="space-y-8">
                {/* Section 1: التحقق من الوثائق التقنية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1️⃣</span>
                    التحقق من الوثائق التقنية
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">يُستحسن التحقق من توفر الوثائق التالية:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ شهادة السكن</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ شهادة المطابقة</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ دفتر التحملات</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ رخصة البناء</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ سند الملك أو ما يقوم مقامه</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ شهادة الإبراء البنكي (عند الاقتضاء)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ وثائق التجزيء العقاري (إذا كان العقار محفظًا)</span>
                    </label>
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mt-3 border-r-4 border-blue-400">
                      <p className="font-semibold mb-2">📋 إشارة:</p>
                      <p>هذه الوثائق تبرز اكتمال الأشغال واحترام الضوابط التعميرية وفقًا للترخيص الممنوح.</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: التحقق من الضمانات */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2️⃣</span>
                    التحقق من الضمانات
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">ينبغي التأكد من الضمانات المرتبطة بالبيع من حيث:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ آجال التسليم</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ جودة الإنجاز</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الأداءات البنكية</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الالتزامات المتبادلة</span>
                    </label>
                    <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 mt-3 border-r-4 border-green-400">
                      <p className="font-semibold mb-2">📌 أساس مرجعي:</p>
                      <p>مقتضيات القانون رقم 44.00 الخاصة بضمان المشتري والالتزامات الواقعة على البائع.</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: مطابقة العقد الابتدائي */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">3️⃣</span>
                    مطابقة العقد الابتدائي
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">يُراجع العقد الابتدائي للتأكد من مطابقته لما تم الاتفاق عليه سابقًا من حيث:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الثمن</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ المساحة</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الوصف</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ آجال الإنجاز</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ التزامات الأطراف</span>
                    </label>
                  </div>
                </div>

                {/* Section 4: مراجعة الأداءات البنكية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">4️⃣</span>
                    مراجعة الأداءات البنكية
                  </h3>
                  <p className="text-gray-600 text-sm pr-10">التأكد من صحة الأداءات البنكية المقدمة من المشتري وكونها مطابقة لدفعات العقد المتفق عليها.</p>
                  <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 border-r-4 border-yellow-400">
                    <p className="font-semibold mb-2">⚠️ ملاحظة عدلية:</p>
                    <p>يُفضل طلب ما يؤيد الأداء البنكي لتحقيق الشفافية وحماية حقوق الأطراف.</p>
                  </div>
                </div>

                {/* Section 5: مراجعة الوضعية العقارية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">5️⃣</span>
                    مراجعة الوضعية العقارية
                  </h3>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ التحقق من خلو العقار من التعارضات</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ الاطلاع على الرسوم العقارية أو مطلب التحفيظ</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">✔ مراجعة التقييدات الاحتياطية أو الرهون القائمة</span>
                    </label>
                    <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800 mt-3 border-r-4 border-purple-400">
                      <p className="font-semibold mb-2">📜 أساس قانوني:</p>
                      <p>قانون التحفيظ العقاري 14.07 والمدونة العقارية.</p>
                    </div>
                  </div>
                </div>

                {/* Section 6: مراجعة التجزيء العقاري */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">6️⃣</span>
                    مراجعة التجزيء العقاري (إذا كان العقار محفظًا)
                  </h3>
                  <p className="text-gray-700 text-sm pr-10">في المشاريع الكبرى يُعد التجزيء عنصرًا أساسيًا لضبط القطع ووحداتها ومساحاتها وحدودها.</p>
                </div>

                {/* Section 7: مرحلة التوثيق */}
                <div className="space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-r-4 border-green-500">
                  <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <span>🟩</span>
                    مرحلة التوثيق داخل التطبيق
                  </h3>
                  <p className="text-gray-700 text-sm">بعد التحقق يمكن المرور إلى تلقي العقد وفقًا للمراحل التالية:</p>
                  <div className="space-y-2 pr-4">
                    <p className="text-gray-700 text-sm">✔ إدراج الأطراف</p>
                    <p className="text-gray-700 text-sm">✔ إدراج العقار</p>
                    <p className="text-gray-700 text-sm">✔ إدراج الثمن</p>
                    <p className="text-gray-700 text-sm">✔ إدراج الشهادات التقنية</p>
                    <p className="text-gray-700 text-sm">✔ إدراج المرجعيات القانونية</p>
                    <p className="text-gray-700 text-sm">✔ التوقيع</p>
                    <p className="text-gray-700 text-sm">✔ التسجيل</p>
                  </div>
                </div>

                {/* Section 8: مرحلة ما بعد التوثيق */}
                <div className="space-y-4 bg-blue-50 p-6 rounded-xl border-r-4 border-blue-500">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span>🟨</span>
                    مرحلة ما بعد التوثيق
                  </h3>
                  <p className="text-gray-700 text-sm">بعد إتمام التوثيق يُشار عادةً إلى المراحل التالية:</p>
                  <div className="space-y-2 pr-4">
                    <p className="text-gray-700 text-sm">⬜ التقييد النهائي لدى المحافظة العقارية</p>
                    <p className="text-gray-700 text-sm">⬜ رفع التقييد الاحتياطي</p>
                    <p className="text-gray-700 text-sm">⬜ تحرير محضر التسليم</p>
                    <p className="text-gray-700 text-sm">⬜ إنهاء الضمانات عند اكتمال الالتزامات</p>
                  </div>
                </div>

                {/* Section 9: الوثائق المطلوبة */}
                <div className="space-y-4 bg-orange-50 p-6 rounded-xl border-r-4 border-orange-500">
                  <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                    <span>🟧</span>
                    الوثائق المطلوبة من المتعاقدين
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">من البائع:</p>
                      <ul className="space-y-1 pr-4 text-sm text-gray-700">
                        <li>• شهادة السكن</li>
                        <li>• شهادة المطابقة</li>
                        <li>• دفتر التحملات</li>
                        <li>• رخصة البناء</li>
                        <li>• سند الملك</li>
                        <li>• شهادة الإبراء البنكي عند الاقتضاء</li>
                        <li>• وثائق التجزيء (إذا محفظ)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">من المشتري:</p>
                      <ul className="space-y-1 pr-4 text-sm text-gray-700">
                        <li>• الوثائق التعريفية</li>
                        <li>• ما يثبت الأداءات البنكية</li>
                        <li>• طلب رفع التقييد الاحتياطي عند الاقتضاء</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 mt-3 border-r-4 border-red-400">
                    <p className="font-semibold mb-2">💡 تنبيه لطيف داخل التطبيق:</p>
                    <p>يُستحسن إحاطة الطرفين بضرورة توفير هذه الوثائق مسبقًا لتيسير إجراءات التلقي وتفادي التعطيل أو النواقص أثناء التوثيق.</p>
                  </div>
                </div>

                {/* References */}
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span>
                    مراجع قانونية وروابط موثوقة
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>📌 <strong>القانون 44.00</strong> — بيع العقار في طور الإنجاز<br/>(نص رسمي — بوابة الأمانة العامة للحكومة)<br/>https://adala.justice.gov.ma (ابحث: "قانون رقم 44.00 بيع العقار في طور الإنجاز")</p>
                    <p>📌 <strong>ظهير الالتزامات والعقود</strong><br/>https://adala.justice.gov.ma</p>
                    <p>📌 <strong>قانون التحفيظ العقاري 14.07 والمحافظة العقارية</strong><br/>https://www.ancfcc.gov.ma</p>
                    <p>📌 <strong>مقارنة VEFA الفرنسية</strong> (Legifrance)<br/>https://www.legifrance.gouv.fr</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  السابق
                </button>
                <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                  التالي: أسئلة اختيارية
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Special requirements for rental-to-own contracts
      if (state.documentType === 'عقد_ايجار_المفضي_الى_تملك') {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <UniversalHeader />
            <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🟦</span>
                <p className="text-blue-800 font-medium pt-1">
                  إرشاد عدلي قبل تلقي الشهادة — بيع العقار
                </p>
              </div>
              <p className="text-blue-700 text-sm mt-3">
                يُستحسن، قبل مباشرة تلقي الشهادة المتعلقة ببيع العقار، التأكد من توفر العناصر الأساسية والوثائق الجوهرية التي تُمكّن من صحة التوثيق ومطابقة العقد لمقتضيات الواقع والقانون، حرصًا على سلامة التصرف وحقوق الأطراف.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي ({state.documentType})</h2>
              
              <div className="space-y-8">
                {/* Section 1: التحقق من المدخلات الأساسية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1️⃣</span>
                    التحقق من المدخلات الأساسية
                  </h3>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ هوية الأطراف</strong> — (بيانات تعريفية – الوضعية العائلية إن اقتضى الحال)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ العقار</strong> — (الوصف / الموقع / المساحة / الطبيعة / مراجع الرخص / الرسومات الهندسية عند الاقتضاء)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ ثمن البيع</strong> — (وخصوماته إن وُجدت)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ الوجيبة + جدول الخصم</strong> — (بالنسبة للأقساط أو التسبيقات)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ التأمين الإجباري</strong> — (خاصة في طور الإنجاز أو العقار الاجتماعي)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900"><strong>✔ مراجع الرخص والإدارة المختصة</strong></span>
                    </label>
                  </div>
                </div>

                {/* Section 2: الوثائق الواجب الاستظهار بها */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2️⃣</span>
                    الوثائق الواجب الاستظهار بها
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">من أجل تلقي الشهادة، يُستحسن الاطلاع على:</p>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• شهادة الملكية (إن كان العقار محفظًا)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• شهادة عقارية من المحكمة الابتدائية (إن كان غير محفظ — طبقًا للمادة 6)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• رخصة السكن (إن كان العقار معدًا للسكن)</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <span className="text-gray-700 group-hover:text-gray-900">• التأمين الإجباري (إن وجد أو كان مطلوبًا قانونًا)</span>
                    </label>
                    <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 mt-3 border-r-4 border-green-400">
                      <p className="font-semibold mb-2">📋 إشارة عدلية:</p>
                      <p>خاصية العقار غير المحفظ تستدعي تسجيل نسخة من العقد بكتابة الضبط لدى المحكمة الابتدائية (وفق المادة 6).</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: أسئلة ذكية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">3️⃣</span>
                    أسئلة ذكية لفحص الحالة داخل التطبيق
                  </h3>
                  <div className="space-y-3 pr-10">
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل العقار محفظ أم غير محفظ؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ إن كان غير محفظ، يتم التسجيل بالمحكمة</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل تم أداء تسبيق؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ إن وُجد، يُدرج في خصم ثمن البيع</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل العقار جاهز للسكن أم في طور الإنجاز؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ إن كان في طور الإنجاز، تُطبّق مقتضيات القانون 44.00</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل الاستفادة اجتماعية؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ يُستحضر نظام الامتيازات في السكن الاجتماعي</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: تنبيهات مهنية */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                    <span className="bg-red-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">⚠️</span>
                    تنبيهات مهنية مهمة
                  </h3>
                  <div className="space-y-3 pr-10">
                    <div className="bg-red-50 p-3 rounded-lg border-r-4 border-red-400">
                      <p className="text-red-900 font-semibold text-sm">⚠ الأداءات قبل التوقيع</p>
                      <p className="text-red-800 text-sm mt-1">يُعتبر كل أداء قبل التوقيع محل إشكال قانوني ويُولد النزاع (المادة 14 من 44.00)</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border-r-4 border-red-400">
                      <p className="text-red-900 font-semibold text-sm">⚠ ثمن البيع</p>
                      <p className="text-red-800 text-sm mt-1">غير قابل للمراجعة قانونًا بعد الاتفاق</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border-r-4 border-red-400">
                      <p className="text-red-900 font-semibold text-sm">⚠ عقود الوعد والوساطة</p>
                      <p className="text-red-800 text-sm mt-1">التحايل عبر هذه العقود عديم الأثر عند المنازعة</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border-r-4 border-red-400">
                      <p className="text-red-900 font-semibold text-sm">⚠ غياب التأمين الإجباري</p>
                      <p className="text-red-800 text-sm mt-1">قد يؤدي إلى نسف العقد عند التحليل القضائي</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border-r-4 border-red-400">
                      <p className="text-red-900 font-semibold text-sm">⚠ حق الخيار في الكراء المفضي إلى التملك</p>
                      <p className="text-red-800 text-sm mt-1">عدم ممارسته لا يفيد تملّكًا تلقائيًا</p>
                    </div>
                  </div>
                </div>

                {/* Section 5: صياغة موجهة للعدل */}
                <div className="space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-r-4 border-green-500">
                  <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <span>🟩</span>
                    صياغة راقية موجّهة للعدل
                  </h3>
                  <p className="text-gray-700 text-sm">
                    حرصًا على حسن التوثيق وسلامة المعاملة، يُستحسن دعوة الأطراف إلى الإدلاء بالوثائق المتطلبة والتصريحات الضرورية قبل تلقي الشهادة، وذلك تمكينًا من دقة المعطيات ومطابقة التصرف للقانون، ولتفادي أي نواقص أو منازعات لاحقة، خاصة في حالة العقار غير المحفظ أو العقار في طور الإنجاز.
                  </p>
                </div>

                {/* References */}
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span>
                    مراجع قانونية + روابط موثوقة
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>✔ <strong>قانون 51.00</strong> — الجريدة الرسمية 5172<br/>(نص رسمي): https://www.sgg.gov.ma/Portals/1/BO/2004/BO_5172_Fr.pdf</p>
                    <p>✔ <strong>القانون 44.00</strong> — بيع العقار في طور الإنجاز<br/>(بوابة الأمانة العامة للحكومة)<br/>https://adala.justice.gov.ma</p>
                    <p>✔ <strong>ظهير الالتزامات والعقود</strong><br/>https://adala.justice.gov.ma</p>
                    <p>✔ <strong>قانون التحفيظ العقاري — 14.07</strong><br/>(المحافظة العقارية — ANCFCC)<br/>https://www.ancfcc.gov.ma</p>
                    <p>✔ <strong>دراسة عز الدين الماحي</strong> — العقار غير المحفظ<br/>(مركز الدراسات القانونية المدنية والعقارية)</p>
                    <p>✔ <strong>دراسة محمد شيلح</strong> — الكراء المفضي إلى التملك<br/>(ندوة توثيق التصرفات العقارية)</p>
                    <p>✔ <strong>وزارة السكنى والتعمير</strong> — السكن الاجتماعي وتمويله<br/>https://www.habitat.gov.ma</p>
                    <p>✔ <strong>مرجع المحكمة الابتدائية</strong> — لتسجيل العقود غير المحفظة</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  السابق
                </button>
                <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                  التالي: أسئلة اختيارية
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Special requirements for shared property ownership
      if (state.documentType === 'بيع_وشراء_ملكية_مشتركة') {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <UniversalHeader />
            <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🟦</span>
                <p className="text-blue-800 font-medium pt-1">
                  تنبيه عدلي قبل تلقي الشهادة — رسم الملكية المشتركة
                </p>
              </div>
              <p className="text-blue-700 text-sm mt-3">
                يُستحسن، قبل تلقي الشهادة المتعلقة بالعقار الخاضع للملكية المشتركة، التحقق من الوثائق والمستندات ذات الصلة التي تُبرز حدود الملكية وحقوق المشتركين والأجزاء المشتركة، وذلك حفاظًا على سلامة التصرف وتحقيق الشفافية بين الأطراف.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي ({state.documentType})</h2>
              
              <div className="space-y-8">
                {/* Section 1: مستندات يُستحسن الاستظهار بها */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1️⃣</span>
                    مستندات يُستحسن الاستظهار بها
                  </h3>
                  <div className="space-y-3 pr-10">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ رسم الملكية المشتركة</span>
                        <span className="text-gray-600 text-sm">(يتضمن الأجزاء الخاصة، الأجزاء المشتركة، نسب الاستفادة، نظام الاستخدام)</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ نظام الملكية المشتركة (Règlement de copropriété)</span>
                        <span className="text-gray-600 text-sm">(يُظهر حقوق وواجبات المالكين، قواعد الاستعمال، ومصاريف الأجزاء المشتركة)</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ محاضر الجمع العام إن وُجدت</span>
                        <span className="text-gray-600 text-sm">(خاصة إذا كانت هناك إصلاحات أو قرارات ملزمة للمشتركين)</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ بيان الرسوم والمصاريف المشتركة (Charges de copropriété)</span>
                        <span className="text-gray-600 text-sm">(للاطلاع على مدى التزامات البائع تجاه اتحاد الملاك)</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ شهادة الملكية أو الرسم العقاري</span>
                        <span className="text-gray-600 text-sm">(إن كان العقار محفظًا)</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                      <div>
                        <span className="text-gray-700 group-hover:text-gray-900 font-semibold block">✔ شهادة عقارية من المحكمة</span>
                        <span className="text-gray-600 text-sm">(إن لم يكن محفظًا — طبقًا للمادة 6)</span>
                      </div>
                    </label>
                    <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 mt-3 border-r-4 border-green-400">
                      <p className="font-semibold mb-2">📋 إشارة مهنية:</p>
                      <p>هذه الوثائق تُبرز حدود الانتفاع وتُجنّب المنازعة بشأن الأجزاء المشتركة والخصوصية (مثل الممرات، الأسطح، الموقف، المصعد…)</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: أسئلة ذكية داخل التطبيق */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2️⃣</span>
                    أسئلة ذكية داخل التطبيق
                  </h3>
                  <div className="space-y-3 pr-10">
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل العقار خاضع لنظام الملكية المشتركة؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ إن نعم: تُستدعى وثائقها</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل توجد إصلاحات مشتركة حديثة؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ قد تكون موضوع مصاريف عالقة</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل البائع في وضعية سليمة تجاه الرسوم المشتركة؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ يُستحسن الاطلاع على البيان</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل الأجزاء المستعملة خاصة أم مشتركة؟</p>
                      <p className="text-gray-700 text-sm mt-1">→ يهم ذلك في حالة المرابعات التجارية أو عقود الاستثمار</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: صياغة لطيفة توجيهية */}
                <div className="space-y-4 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border-r-4 border-blue-500">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                    <span>📋</span>
                    صياغة لطيفة توجيهية للعدل
                  </h3>
                  <p className="text-gray-700 text-sm">
                    حرصًا على دقة التوثيق وصحة التصرف، يُستحسن دعوة الأطراف إلى الإدلاء بما يثبت نظام الملكية المشتركة ورسومها ومصاريفها، لما لذلك من أثر في تحديد حقوق الانتفاع وحدود الاستعمال وإبراء الذمة المالية المرتبطة بالأجزاء المشتركة، خاصة عند انتقال الملكية بين المشتركين.
                  </p>
                </div>

                {/* References */}
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span>
                    مراجع قانونية وروابط موثوقة
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>📌 <strong>قانون الملكية المشتركة</strong> (قانون رقم 18.00 كما عدّل بالقانون 106.12)<br/>نص رسمي عبر بوابة الأمانة العامة للحكومة:<br/>https://adala.justice.gov.ma (ابحث: "قانون 18.00 الملكية المشتركة")</p>
                    <p>📌 <strong>ظهير الالتزامات والعقود</strong><br/>https://adala.justice.gov.ma</p>
                    <p>📌 <strong>قانون التحفيظ العقاري 14.07</strong><br/>(المحافظة العقارية — ANCFCC)<br/>https://www.ancfcc.gov.ma</p>
                    <p>📌 <strong>منشورات وزارة السكنى والتعمير</strong> — حول الملكية المشتركة<br/>https://www.habitat.gov.ma</p>
                    <p>📌 <strong>دراسات أكاديمية</strong> — حول Copropriété بالمغرب<br/>(مجلة الأبحاث القانونية — IMIST)<br/>https://revues.imist.ma</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  السابق
                </button>
                <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                  التالي: أسئلة اختيارية
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Special requirements for air rights and elevation
      if (state.documentType === 'عقد_بيع_حق_الهواء_والتعلية') {
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <UniversalHeader />
            <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏗️</span>
                <p className="text-purple-800 font-medium pt-1">
                  إرشاد عدلي قبل تلقي الشهادة — عقد بيع حق الهواء والتعلية (المادة 139-141 من مدونة الحقوق العينية)
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي — عقد بيع حق الهواء والتعلية</h2>
              
              <div className="space-y-8">
                {/* الوثائق المطلوبة */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                    <span className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📋</span>
                    الوثائق المطلوبة للتلقي العدلي
                  </h3>
                  
                  <div className="space-y-6 pr-10">
                    {/* من مالك السفل */}
                    <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-400">
                      <p className="font-bold text-blue-900 mb-3">من مالك السفل:</p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ رسم الملكية</span>
                        </label>
                      </div>
                    </div>

                    {/* من صاحب التعلية */}
                    <div className="bg-green-50 p-4 rounded-lg border-r-4 border-green-400">
                      <p className="font-bold text-green-900 mb-3">من صاحب التعلية:</p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                        </label>
                      </div>
                    </div>

                    {/* من العقار */}
                    <div className="bg-amber-50 p-4 rounded-lg border-r-4 border-amber-400">
                      <p className="font-bold text-amber-900 mb-3">من العقار:</p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ رخص التعمير</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ تقرير هندسي</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ تصميم المصادقة</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 mt-1" />
                          <span className="text-gray-700 group-hover:text-gray-900">✔ شهادة الملكية</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* أسئلة ذكية (AI Screening) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                    <span className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">🤖</span>
                    أسئلة ذكية (AI Screening)
                  </h3>
                  <p className="text-gray-600 text-sm italic pr-10">التطبيق يقترح الأسئلة التالية للتحقق:</p>
                  
                  <div className="space-y-3 pr-10">
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل البناء قائم فعلًا؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ حق الهواء والتعلية يشترط وجود بناء (السفل)</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل العقار محفظ؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ في العقار المحفظ يجب الإشهار في الرسم العقاري</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل يوجد شيوع؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ في حالة الشيوع يلزم اتفاق جميع الشركاء (المادة 139)</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل تسمح ضوابط التعمير بالتعلية؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ يجب التأكد من تصاميم التهيئة قبل المتابعة</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل هناك نزاع سابق؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ التحقق من خلو العقار من النزاعات القضائية</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                      <p className="text-gray-900 font-semibold text-sm">✔ هل التمويل من بنك؟</p>
                      <p className="text-gray-600 text-xs mt-1">→ في حالة القرض البنكي قد يكون هناك رهان محتمل</p>
                    </div>
                  </div>
                </div>

                {/* مقارنة مختصرة مع حقوق مشابهة */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                    <span className="bg-teal-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">⚖️</span>
                    مقارنة مختصرة مع حقوق مشابهة
                  </h3>
                  
                  <div className="space-y-3 pr-10">
                    <div className="bg-teal-50 p-4 rounded-lg border-r-4 border-teal-400">
                      <p className="font-semibold text-teal-900 mb-1">✔ حق الانتفاع</p>
                      <p className="text-sm text-gray-700">يشبهه في الاستغلال لكن لا يخلق طابقًا</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg border-r-4 border-teal-400">
                      <p className="font-semibold text-teal-900 mb-1">✔ حق السطحية</p>
                      <p className="text-sm text-gray-700">قريب جدًا منه في بعض التشريعات</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg border-r-4 border-teal-400">
                      <p className="font-semibold text-teal-900 mb-1">✔ العمري</p>
                      <p className="text-sm text-gray-700">حق منفعة لا بناء</p>
                    </div>
                  </div>
                </div>

                {/* التنبيهات القانونية */}
                <div className="space-y-4 bg-red-50 p-6 rounded-xl border-r-4 border-red-500">
                  <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                    <span>⚠️</span>
                    تنبيهات وتحذيرات قانونية
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg text-sm">
                      <p className="text-red-900 font-semibold">⚠️ عدم احترام ضوابط التعمير</p>
                      <p className="text-gray-700 mt-1">يبطل الأثر التنفيذي وليس الحق العقدي فقط</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-sm">
                      <p className="text-red-900 font-semibold">⚠️ في العقار المحفظ</p>
                      <p className="text-gray-700 mt-1">يجب الإشهار في الرسم العقاري</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-sm">
                      <p className="text-red-900 font-semibold">⚠️ مخالفة المواصفات التقنية</p>
                      <p className="text-gray-700 mt-1">تُحوّل النزاع هندسيًا وليس فقط قانونيًا</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-sm">
                      <p className="text-red-900 font-semibold">⚠️ البنايات المشتركة</p>
                      <p className="text-gray-700 mt-1">يجب احترام نظام الملكية المشتركة</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-sm">
                      <p className="text-red-900 font-semibold">⚠️ عدم التنصيص على عدد الطوابق</p>
                      <p className="text-gray-700 mt-1">يؤدي لتفسير قضائي غير مضمون (المادة 139 فقرة 2)</p>
                    </div>
                  </div>
                </div>

                {/* المرجعية القانونية */}
                <div className="space-y-3 bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>🔗</span>
                    المرجع القانوني
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>📌 <strong>مدونة الحقوق العينية — المادة 139-141</strong><br/>
                    حق الهواء والتعلية<br/>
                    https://www.sgg.gov.ma/Portals/0/lois/droits_ainiya_AR.pdf</p>
                    <p>📌 <strong>القانون رقم 25.90 المتعلق بالتجزئات والمجموعات السكنية</strong></p>
                    <p>📌 <strong>قانون التعمير رقم 12.90</strong></p>
                    <div className="bg-purple-50 p-4 rounded-lg border-r-4 border-purple-400 mt-4">
                      <p className="font-semibold text-purple-900 mb-2">📋 ملاحظة:</p>
                      <p className="text-purple-800 text-sm">حق الهواء والتعلية هو حق عيني (المادة 139)، وليس مجرد إذن إداري، وينتقل بالإرث والوصية والشفعة والبيع والرهن.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  السابق
                </button>
                <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow">
                  التالي: أسئلة اختيارية
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <UniversalHeader />
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚖️</span>
              <p className="text-yellow-800 font-medium pt-1">
                هذه القائمة ذات طابع إرشادي محض، ولا تُقيّد سلطة العدل في التقدير، ولا تحول دون التلقي متى ارتأى ذلك.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي ({state.documentType})</h2>
            
            <div className="space-y-8">
              {/* Section 1 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  متطلبات تتعلق بالأطراف
                </h3>
                <div className="space-y-3 pr-10">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">ما يثبت صفة طالب الشهادة</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">التحقق من الأهلية القانونية</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">وجود وكالة (إن وجدت)</span>
                  </label>
                  <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-800 mt-2">
                    🟠 تنبيه: في حال وجود نائب أو وارث، يُستحسن التحقق من الصفة دون اشتراط وثيقة بعينها.
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  متطلبات تتعلق بالعقار
                </h3>
                <div className="space-y-3 pr-10">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">تحديد طبيعة العقار (محفظ / غير محفظ)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">بيان الموقع والحدود</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">عدم وجود معارضة ظاهرة</span>
                  </label>
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mt-2">
                    🟡 ملاحظة: عدم الإدلاء بشهادة إدارية لا يمنع التلقي، متى بني على الحيازة الظاهرة والمعقولة.
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                  <span className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                  متطلبات زمنية (إن اقتضى الحال)
                </h3>
                <div className="space-y-3 pr-10">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">مدة الحيازة المصرح بها</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 group-hover:text-gray-900">استمراريتها وهدوؤها</span>
                  </label>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mt-2">
                    🔵 تنبيه قانوني: المدة عنصر تقديري يخضع لقناعة العدل ولا يستوجب إثباتًا حسابيًا دقيقًا. (المواد 239–247 من مدونة الحقوق العينية)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <button onClick={() => setState(prev => ({ ...prev, step: 0.1 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                السابق
              </button>
              <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                التالي: أسئلة اختيارية
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 0.3 Optional Questions
    if (state.step === 0.3) {
      return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">أسئلة دعم القناعة المهنية (اختيارية)</h2>
            <p className="text-gray-600 mb-6">تهدف الأسئلة التالية إلى دعم قناعتكم المهنية فقط، ويمكن تجاوزها كليًا أو جزئيًا متى ارتأيتم عدم تأثيرها.</p>

            <div className="space-y-6">
              {[
                'هل العقار محل نزاع معروف؟',
                'هل الحيازة مستمرة دون انقطاع ظاهر؟',
                'هل سبق الإدلاء بشهادة بشأن نفس العقار؟'
              ].map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-800">{q}</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`q_${idx}`} className="w-4 h-4 text-blue-600" />
                      <span>نعم</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`q_${idx}`} className="w-4 h-4 text-blue-600" />
                      <span>لا</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800 flex items-center gap-2">
              <span>⚠️</span>
              تنبيه: الأجوبة لا تُسجّل ضمن الرسم، ولا تُنشئ مسؤولية إضافية.
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <button onClick={() => setState(prev => ({ ...prev, step: 0.2 }))} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                السابق
              </button>
              <button onClick={() => setState(prev => ({ ...prev, step: 0.4 }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow">
                التالي
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 0.4 Final Referral
    if (state.step === 0.4) {
      return (
        <div className="max-w-2xl mx-auto mt-12 animate-fadeIn">
          <div className="bg-white p-10 rounded-2xl shadow-xl text-center space-y-8 border-t-8 border-green-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
              ⚖️
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">الإحالة الحتمية إلى تلقي الشهادة</h2>
              <div className="text-lg text-gray-700 leading-loose">
                <p>بعد استعراض المعطيات،</p>
                <p>وبصرف النظر عن درجة التحقق المعتمدة،</p>
                <p className="font-bold text-gray-900 mt-4">يحيلكم التطبيق، حضرة العدل المحترم، على مرحلة تلقي الشهادة،</p>
                <p>مع احتفاظكم بحق تضمين ما ترونه مناسبًا من تحفظات أو بيانات.</p>
              </div>
            </div>

            <button 
              onClick={proceedToWizard}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3"
            >
              <span>✍️</span>
              الانتقال إلى تلقي الشهادة
            </button>
            
            <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="text-gray-500 hover:text-gray-700 text-sm">
              ← العودة للمراجعة
            </button>
          </div>
        </div>
      );
    }

    // Special requirements for surface rights transfer
    if (state.documentType === 'عقد_تفويت_حق_السطحية') {
      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <UniversalHeader />
          <div className="bg-teal-50 border-r-4 border-teal-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌱</span>
              <p className="text-teal-800 font-medium pt-1">
                إرشاد عدلي قبل تلقي الشهادة — عقد تفويت حق السطحية (المادة 116-119 من مدونة الحقوق العينية)
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي — عقد تفويت حق السطحية</h2>
            
            <div className="space-y-8">
              {/* الوثائق المطلوبة */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                  <span className="bg-teal-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📋</span>
                  الوثائق المطلوبة للتلقي العدلي
                </h3>
                
                <div className="space-y-6 pr-10">
                  {/* من صاحب الأرض */}
                  <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-400">
                    <p className="font-bold text-blue-900 mb-3">من صاحب الأرض:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ سند الملكية أو رسم التحفيظ</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ رخصة البناء (إن وجدت)</span>
                      </label>
                    </div>
                  </div>

                  {/* من صاحب حق السطحية */}
                  <div className="bg-green-50 p-4 rounded-lg border-r-4 border-green-400">
                    <p className="font-bold text-green-900 mb-3">من صاحب حق السطحية:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ أي مستند إثباتي للحق (عقد سابق، تفويت، إرث)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* أسئلة ذكية (AI Screening) */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                  <span className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">🤖</span>
                  أسئلة ذكية للتطبيق
                </h3>
                <p className="text-gray-600 text-sm italic pr-10">التطبيق يقترح الأسئلة التالية للتحقق:</p>
                
                <div className="space-y-3 pr-10">
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">1️⃣ هل العقار محفظ؟</p>
                    <p className="text-gray-700 text-sm">→ إذا نعم: يجب التسجيل في الرسم العقاري. إذا لا: يسجل في المحكمة الابتدائية.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">2️⃣ هل العقار مشاع؟</p>
                    <p className="text-gray-700 text-sm">→ إذا نعم: يجب موافقة جميع الشركاء (شرط أساسي).</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">3️⃣ نوع المنشآت أو الأغراس؟</p>
                    <p className="text-gray-700 text-sm">→ بنايات / منشآت / أغراس — يحدد مدى الالتزامات والمراقبة.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">4️⃣ هل هناك اتفاق على إعادة البناء بعد الهلاك؟</p>
                    <p className="text-gray-700 text-sm">→ إعادة البناء بعد الهلاك يتطلب اتفاق صريح مع مالك الأرض.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">5️⃣ هل هناك دائنون محتملون؟</p>
                    <p className="text-gray-700 text-sm">→ يمكن للدائنين طلب إبطال التنازل إذا كان فيه إضرار بحقوقهم (المادة 119).</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">6️⃣ هل هناك رخصة بناء أو موافقة عمرانية؟</p>
                    <p className="text-gray-700 text-sm">→ ضروري للتأكد من الامتثال للقوانين العمرانية.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">7️⃣ هل هناك نزاع سابق حول الأرض أو المنشآت؟</p>
                    <p className="text-gray-700 text-sm">→ يجب التحقق من عدم وجود نزاعات قانونية قائمة.</p>
                  </div>
                </div>
              </div>

              {/* المقارنات القانونية */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <span className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">⚖️</span>
                  المقارنات القانونية
                </h3>

                <div className="bg-orange-50 p-4 rounded-lg border-r-4 border-orange-300">
                  <p className="font-bold text-orange-900 mb-2">🆚 الفرق بين حق السطحية وحق الهواء:</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <strong>حق السطحية (م. 116-119):</strong> حق على "المنشآت أو الأغراس" الموجودة على سطح الأرض</p>
                    <p>• <strong>حق الهواء (م. 139-141):</strong> حق على "الفضاء العلوي" للبناء فوق أرض مملوكة لشخص آخر</p>
                    <p className="mt-2">📌 <strong>الجوهر:</strong> السطحية تشمل ما هو موجود، والهواء هو القدرة على البناء.</p>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border-r-4 border-orange-300">
                  <p className="font-bold text-orange-900 mb-2">🆚 الفرق بين حق السطحية وحق الانتفاع:</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <strong>حق السطحية:</strong> حق عيني على المنشآت فقط</p>
                    <p>• <strong>حق الانتفاع:</strong> حق على كل شيء (العقار كله + منافعه)</p>
                  </div>
                </div>
              </div>

              {/* المراجع القانونية */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📚</span>
                  المراجع القانونية
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg border-r-4 border-gray-300">
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-900"><strong>المادة 116:</strong> تعريف حق السطحية</p>
                    <p className="text-gray-900"><strong>المادة 117:</strong> ملكية المنشآت والأغراس لصاحب الحق</p>
                    <p className="text-gray-900"><strong>المادة 118:</strong> كيفية انقضاء الحق</p>
                    <p className="text-gray-900"><strong>المادة 119:</strong> حماية حقوق الدائنين</p>
                  </div>
                </div>
              </div>

              {/* الخطوات التالية */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-r-4 border-green-400">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <span>✅</span>
                  الخطوات التالية:
                </h4>
                <ol className="list-decimal pr-6 space-y-2 text-sm text-gray-700">
                  <li>التحقق من كل الوثائق المذكورة أعلاه</li>
                  <li>طرح الأسئلة الذكية وتسجيل الأجوبة</li>
                  <li>التأكد من فهم الأطراف للالتزامات</li>
                  <li>المرور إلى تلقي الشهادة</li>
                </ol>
              </div>
            </div>
          </div>

          <button 
            onClick={proceedToWizard}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3"
          >
            <span>✍️</span>
            الانتقال إلى تلقي الشهادة
          </button>
          
          <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="text-gray-500 hover:text-gray-700 text-sm">
            ← العودة للمراجعة
          </button>
        </div>
      );
    }

    // Special requirements for ornamental rights
    if (state.documentType === 'ثبوت_زينة_عقار') {
      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <UniversalHeader />
          <div className="bg-amber-50 border-r-4 border-amber-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏛️</span>
              <p className="text-amber-800 font-medium pt-1">
                إرشاد عدلي قبل تلقي الشهادة — ثبوت زينة عقار (المادة 133-137 من مدونة الحقوق العينية)
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي — ثبوت زينة عقار</h2>
            
            <div className="space-y-8">
              {/* الوثائق المطلوبة */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                  <span className="bg-amber-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📋</span>
                  الوثائق المطلوبة للتلقي العدلي
                </h3>
                
                <div className="space-y-6 pr-10">
                  {/* من صاحب الأرض */}
                  <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-400">
                    <p className="font-bold text-blue-900 mb-3">من صاحب الأرض:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ سند الملكية أو رسم التحفيظ</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ رخصة البناء (إن وجدت)</span>
                      </label>
                    </div>
                  </div>

                  {/* من صاحب حق الزينة */}
                  <div className="bg-green-50 p-4 rounded-lg border-r-4 border-green-400">
                    <p className="font-bold text-green-900 mb-3">من صاحب حق الزينة:</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ أي مستند إثباتي للحق (عقد سابق، تفويت، إرث)</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ مواصفات البناء</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* أسئلة ذكية للتطبيق */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                  <span className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">🤖</span>
                  أسئلة ذكية للتطبيق
                </h3>
                <p className="text-gray-600 text-sm italic pr-10">التطبيق يقترح الأسئلة التالية للتحقق:</p>
                
                <div className="space-y-3 pr-10">
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">1️⃣ هل العقار محفظ؟</p>
                    <p className="text-gray-700 text-sm">→ إذا نعم: يجب التسجيل في الرسم العقاري. إذا لا: يسجل في المحكمة الابتدائية.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">2️⃣ هل العقار مشاع؟</p>
                    <p className="text-gray-700 text-sm">→ إذا نعم: يجب موافقة جميع الشركاء (شرط أساسي).</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">3️⃣ نوع البناء وأبعاده؟</p>
                    <p className="text-gray-700 text-sm">→ منزل / محل تجاري / منشأة — يحدد مدى الالتزامات والمراقبة.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">4️⃣ مدة الحق (≤ 40 سنة)؟</p>
                    <p className="text-gray-700 text-sm">→ المدة القصوى لحق الزينة هي 40 سنة.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">5️⃣ هل هناك اتفاق لإعادة البناء بعد الهلاك؟</p>
                    <p className="text-gray-700 text-sm">→ إعادة البناء بعد الهلاك يتطلب اتفاق صريح مع مالك الأرض.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">6️⃣ هل هناك دائنون محتملون؟</p>
                    <p className="text-gray-700 text-sm">→ حقوق الدائنين محفوظة ويجب مراعاتها.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">7️⃣ هل هناك نزاع سابق حول الأرض أو البناء؟</p>
                    <p className="text-gray-700 text-sm">→ يجب التحقق من عدم وجود نزاعات قانونية قائمة.</p>
                  </div>
                </div>
              </div>

              {/* المقارنات القانونية */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                  <span className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">⚖️</span>
                  المقارنات القانونية
                </h3>

                <div className="bg-orange-50 p-4 rounded-lg border-r-4 border-orange-300">
                  <p className="font-bold text-orange-900 mb-2">🆚 الفرق بين حق الزينة وحق السطحية:</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <strong>حق الزينة (م. 133-137):</strong> حق البناء على أرض الغير على نفقة صاحب الحق</p>
                    <p>• <strong>حق السطحية (م. 116-119):</strong> حق على المنشآت الموجودة على سطح الأرض</p>
                    <p className="mt-2">📌 <strong>الجوهر:</strong> الزينة هي البناء على نفقة خاصة، السطحية هي ملكية ما هو موجود.</p>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border-r-4 border-orange-300">
                  <p className="font-bold text-orange-900 mb-2">🆚 الفرق بين حق الزينة وحق الهواء:</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• <strong>حق الزينة:</strong> البناء على أرض الغير بإذن صريح</p>
                    <p>• <strong>حق الهواء:</strong> حق البناء في الفضاء العلوي</p>
                  </div>
                </div>
              </div>

              {/* المراجع القانونية */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📚</span>
                  المراجع القانونية
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg border-r-4 border-gray-300">
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-900"><strong>المادة 133:</strong> تعريف حق الزينة</p>
                    <p className="text-gray-900"><strong>المادة 134:</strong> ملكية البناء لصاحب الحق</p>
                    <p className="text-gray-900"><strong>المادة 135-137:</strong> انقضاء الحق وأحكام الباني بحسن نية</p>
                  </div>
                </div>
              </div>

              {/* التنبيهات */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-r-4 border-red-400">
                <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  تنبيهات قانونية مهمة:
                </h4>
                <ul className="list-disc pr-6 space-y-2 text-sm text-gray-700">
                  <li>لا يمكن ترتيب الحق على عقارات مشاعة إلا باتفاق جميع الشركاء</li>
                  <li>الالتزام بالمدة القصوى 40 سنة</li>
                  <li>إعادة البناء بعد الهلاك يتطلب اتفاق صريح مع مالك الأرض</li>
                  <li>الالتزام بالقوانين العمرانية والبيئية أساسي</li>
                  <li>حقوق الدائنين محفوظة ويجب مراعاتها</li>
                  <li>إذا انقضى الحق دون اتفاق → البناء ينتقل لحسن نية لصالح مالك الأرض (المادة 137)</li>
                </ul>
              </div>

              {/* الخطوات التالية */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-r-4 border-green-400">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <span>✅</span>
                  الخطوات التالية:
                </h4>
                <ol className="list-decimal pr-6 space-y-2 text-sm text-gray-700">
                  <li>التحقق من كل الوثائق المذكورة أعلاه</li>
                  <li>طرح الأسئلة الذكية وتسجيل الأجوبة</li>
                  <li>التأكد من فهم الأطراف للالتزامات</li>
                  <li>التأكد من المدة ≤ 40 سنة</li>
                  <li>المرور إلى تلقي الشهادة</li>
                </ol>
              </div>
            </div>
          </div>

          <button 
            onClick={proceedToWizard}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3"
          >
            <span>✍️</span>
            الانتقال إلى تلقي الشهادة
          </button>
          
          <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="text-gray-500 hover:text-gray-700 text-sm">
            ← العودة للمراجعة
          </button>
        </div>
      );
    }

    // Special requirements for Omra contract (Usufruct for Life)
    if (state.documentType === 'عقد_العمري') {
      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <UniversalHeader />
          <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚖️</span>
              <p className="text-purple-800 font-medium pt-1">
                إرشاد عدلي قبل تلقي الشهادة — عقد تمليك منفعة على وجه العمرى (المادة 4 من مدونة الحقوق العينية + المادة 489 من قانون الالتزامات والعقود)
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">قائمة إرشادية قبل التلقي — عقد تمليك منفعة على وجه العمرى</h2>
            
            <div className="space-y-8">
              {/* الوثائق المطلوبة */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                  <span className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📋</span>
                  الوثائق المطلوبة للتلقي العدلي
                </h3>
                
                <div className="space-y-6 pr-10">
                  {/* من المعطي */}
                  <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-400">
                    <p className="font-bold text-blue-900 mb-3">من المعطي (مانح المنفعة):</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ سند الملكية أو رسم التحفيظ (إثبات التملك)</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ شهادة عدم التحمل (للتأكد من عدم وجود رهون أو حجوزات)</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ رسم عقاري محين (إن كان محفظ)</span>
                      </label>
                    </div>
                  </div>

                  {/* من المعطى له */}
                  <div className="bg-green-50 p-4 rounded-lg border-r-4 border-green-400">
                    <p className="font-bold text-green-900 mb-3">من المعطى له (المستفيد):</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ بطاقة وطنية</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1" />
                        <span className="text-gray-700 group-hover:text-gray-900">✔ إقرار باستيفاء شروط الانتفاع</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* أسئلة ذكية للتطبيق */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                  <span className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">🤖</span>
                  أسئلة ذكية للتطبيق
                </h3>
                <p className="text-gray-600 text-sm italic pr-10">التطبيق يقترح الأسئلة التالية للتحقق:</p>
                
                <div className="space-y-3 pr-10">
                  <div className="bg-red-50 p-4 rounded-lg border-r-4 border-red-400">
                    <p className="font-bold text-red-900 mb-2">⚠️ هل العمري بعوض؟</p>
                    <p className="text-gray-700 text-sm">→ إذا نعم: <strong className="text-red-700">تنبيه!</strong> قد يكون بيع أو كراء مقنع — يجب التأكد من الطبيعة الحقيقية للعقد ومطابقته للقانون.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">1️⃣ هل يوجد إرادة للتحايل على الإرث؟</p>
                    <p className="text-gray-700 text-sm">→ يجب التأكد من عدم استخدام العمري كوسيلة للتحايل على أحكام الميراث الشرعي. العمري يجب أن يكون حقيقي وبنية صادقة.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">2️⃣ هل يراد من العمري سكن الزوجة؟</p>
                    <p className="text-gray-700 text-sm">→ حالة واقعية كثيرة — التحقق من الغرض الحقيقي (تأمين سكن للزوجة). يجب التأكد من صحة الإرادة وعدم وجود ضغط أو إكراه.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">3️⃣ هل العقار قابل للتعمير؟</p>
                    <p className="text-gray-700 text-sm">→ التحقق من إمكانية البناء والتعمير على العقار موضوع العمري، لما لذلك من أثر على حقوق المنتفع.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">4️⃣ ما نوع العمري المراد؟</p>
                    <p className="text-gray-700 text-sm">→ بعمر المعطى له / بعمر المعطي / لمدة محددة / غير محددة — كل نوع له أحكام خاصة.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">5️⃣ ما طبيعة العقار؟</p>
                    <p className="text-gray-700 text-sm">→ محفظ / في طور التحفيظ / غير محفظ — يحدد مكان التسجيل وإجراءات الشهر.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">6️⃣ هل المعطي مالك للعقار؟</p>
                    <p className="text-gray-700 text-sm">→ شرط أساسي — يجب أن يكون المعطي مالكًا حقيقيًا للعقار.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-r-4 border-indigo-300">
                    <p className="font-bold text-indigo-900 mb-2">7️⃣ ما نوع الاستعمال المراد؟</p>
                    <p className="text-gray-700 text-sm">→ إقامة فعلية / أخذ الغلة / غير ذلك — يحدد نطاق حقوق المنتفع.</p>
                  </div>
                </div>
              </div>

              {/* المراجع القانونية */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-sm">📚</span>
                  المراجع القانونية
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg border-r-4 border-gray-300">
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-900"><strong>المادة 4 من مدونة الحقوق العينية:</strong> تمليك المنفعة على وجه العمرى</p>
                    <p className="text-gray-900"><strong>المادة 489 من قانون الالتزامات والعقود:</strong> العمرى كتصرف قانوني</p>
                    <p className="text-gray-700 mt-3">
                      <a href="https://adala.justice.gov.ma" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                        🔗 رابط موقع وزارة العدل للاطلاع على النصوص الكاملة
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* التنبيهات */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-r-4 border-red-400">
                <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  تنبيهات قانونية مهمة:
                </h4>
                <ul className="list-disc pr-6 space-y-2 text-sm text-gray-700">
                  <li><strong>العمري يتطلب عقد رسمي</strong> — عقد العمري يجب أن يكون رسميًا تحت طائلة البطلان</li>
                  <li><strong>حظر العمري بعوض مقنع</strong> — إذا كان العمري بعوض حقيقي فقد يعتبر بيع أو كراء مقنع</li>
                  <li><strong>التحقق من نية المتعاقدين</strong> — يجب التأكد من صدق الإرادة وعدم التحايل على الإرث</li>
                  <li><strong>حق المستفيد منفعة وليس ملكية</strong> — المعطى له يملك المنفعة فقط، الرقبة تبقى للمعطي أو ورثته</li>
                  <li><strong>الانتفاع محدود بنطاق العقد</strong> — لا يجوز للمستفيد تجاوز نطاق الاستعمال المتفق عليه</li>
                  <li><strong>حظر بعض الاستعملات</strong> — إذا كان الاستعمال "غير ذلك" يجب التحقق من مشروعيته</li>
                  <li><strong>المعطي يجب أن يكون مالكًا</strong> — لا يصح العمري إلا من المالك الحقيقي</li>
                  <li><strong>التسجيل حسب طبيعة العقار</strong> — محفظ → الرسم العقاري / غير محفظ → المحكمة الابتدائية</li>
                </ul>
              </div>

              {/* الخطوات التالية */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-r-4 border-green-400">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <span>✅</span>
                  الخطوات التالية:
                </h4>
                <ol className="list-decimal pr-6 space-y-2 text-sm text-gray-700">
                  <li>التحقق من كل الوثائق المذكورة أعلاه</li>
                  <li>طرح الأسئلة الذكية وتسجيل الأجوبة</li>
                  <li>التأكد من فهم الأطراف لطبيعة العقد والتزاماتهم</li>
                  <li>التحقق من عدم وجود إرادة للتحايل على الإرث</li>
                  <li>التأكد من صحة ملكية المعطي للعقار</li>
                  <li>المرور إلى تلقي الشهادة</li>
                </ol>
              </div>
            </div>
          </div>

          <button 
            onClick={proceedToWizard}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3"
          >
            <span>✍️</span>
            الانتقال إلى تلقي الشهادة
          </button>
          
          <button onClick={() => setState(prev => ({ ...prev, step: 0.3 }))} className="text-gray-500 hover:text-gray-700 text-sm">
            ← العودة للمراجعة
          </button>
        </div>
      );
    }

    return null;
  };

  // ============================================================================
  // مكون توزيع الحصص (Modal)
  // ============================================================================
  const ShareDistributionModal = ({ 
    isOpen, 
    onClose, 
    parties, 
    onUpdateShares,
    title = "توزيع الحصص"
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    parties: Party[]; 
    onUpdateShares: (shares: { index: number; value: string }[]) => void;
    title?: string;
  }) => {
    if (!isOpen) return null;

    const [shares, setShares] = useState(
      parties.map(p => ({ 
        name: p.name || `طرف ${parties.indexOf(p) + 1}`, 
        value: parseFloat(p.share?.replace('%', '') || '0') || (100 / parties.length) 
      }))
    );

    const total = shares.reduce((sum, s) => sum + s.value, 0);
    
    // Calculate conic gradient for pie chart
    let currentAngle = 0;
    const gradientParts = shares.map((s, i) => {
      const start = currentAngle;
      const end = currentAngle + (s.value / 100) * 360;
      currentAngle = end;
      const color = `hsl(${(i * 360) / shares.length}, 70%, 60%)`;
      return `${color} ${start}deg ${end}deg`;
    });
    
    const gradient = `conic-gradient(${gradientParts.join(', ')})`;

    const handleShareChange = (index: number, newValue: number) => {
      // Clamp value between 0 and 100
      const clampedValue = Math.min(100, Math.max(0, newValue));
      
      const newShares = [...shares];
      
      // If there's only one party, it must be 100%
      if (newShares.length === 1) {
          newShares[index].value = 100;
          setShares(newShares);
          return;
      }

      // Update the changed share
      newShares[index].value = clampedValue;

      // Distribute the difference among others
      const remainingTotal = 100 - clampedValue;
      const otherIndices = newShares.map((_, i) => i).filter(i => i !== index);
      const currentSumOthers = otherIndices.reduce((sum, i) => sum + newShares[i].value, 0);

      if (currentSumOthers > 0) {
        // Distribute proportionally
        otherIndices.forEach(i => {
            const ratio = newShares[i].value / currentSumOthers;
            newShares[i].value = remainingTotal * ratio;
        });
      } else {
        // Distribute equally if others are 0
        const equalShare = remainingTotal / otherIndices.length;
        otherIndices.forEach(i => {
            newShares[i].value = equalShare;
        });
      }
      
      // Fix precision issues to ensure sum is exactly 100
      newShares.forEach(s => s.value = parseFloat(s.value.toFixed(2)));
      
      // Force sum to 100 by adjusting the largest of the others to absorb rounding errors
      const currentTotal = newShares.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(currentTotal - 100) > 0.001) {
          if (otherIndices.length > 0) {
             // Find the index with the largest value among others to absorb the diff
             let maxValIndex = otherIndices[0];
             let maxVal = newShares[maxValIndex].value;
             
             otherIndices.forEach(i => {
                 if (newShares[i].value > maxVal) {
                     maxVal = newShares[i].value;
                     maxValIndex = i;
                 }
             });

             const diff = 100 - currentTotal;
             newShares[maxValIndex].value += diff;
             newShares[maxValIndex].value = parseFloat(newShares[maxValIndex].value.toFixed(2));
          }
      }

      setShares(newShares);
    };

    const handleSave = () => {
      onUpdateShares(shares.map((s, i) => ({ index: i, value: `${s.value.toFixed(2)}%` })));
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
          <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">{title}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pie Chart Visualization */}
            <div className="flex flex-col items-center justify-center">
              <div 
                className="w-48 h-48 rounded-full shadow-inner border-4 border-white"
                style={{ background: gradient }}
              />
              <div className="mt-4 text-center">
                <p className={`font-bold ${Math.abs(total - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                  المجموع: {total.toFixed(1)}%
                </p>
                {Math.abs(total - 100) >= 0.1 && (
                  <p className="text-xs text-red-500">يجب أن يكون المجموع 100%</p>
                )}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {shares.map((share, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: `hsl(${(idx * 360) / shares.length}, 70%, 60%)` }}
                  />
                  <span className="text-sm font-medium flex-1 truncate">{share.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={share.value}
                    onChange={(e) => handleShareChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-20 p-2 border rounded text-center"
                  />
                  <span className="text-gray-500">%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave}
              disabled={Math.abs(total - 100) >= 0.1}
              className={`px-6 py-2 rounded-lg text-white font-semibold ${
                Math.abs(total - 100) < 0.1 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              حفظ التوزيع
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // خطوة 1: تعريف الأطراف

  return (
    <div className="space-y-6">
      <Step0_DocumentTypeSelection />
    </div>
  );
};