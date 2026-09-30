import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  ShieldCheck,
  Building2,
  FileCheck,
  Scale,
  Clock,
  FileText,
  Lock,
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
  MapPin,
  Search,
  Check,
  UserCheck,
  FileSearch,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import {
  convertNumberToArabicWords,
  createEmptyParty,
  convertGregorianToHijri,
} from '../../../../utils/feesAgentUtils';
import type {
  CorrectionAddendumState,
  OriginalDeedReference,
  CorrectionApplicant,
  CorrectionItem,
  CorrectionFieldCategory,
  VerificationSourceType,
  MatchingDegree,
  PropertyCorrectionState,
  FinancialCorrectionState,
  WitnessCorrectionState,
  CorrectionSubstantiveNature,
  PreSigningCheckRule,
} from './correctionAddendumTypes';

export const CorrectionAddendumWizard: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  const { user, notaryProfile } = useAuth();

  // Court and Notary Identity derived dynamically (zero hardcoded values)
  const defaultCourt =
    state.meta?.court ||
    notaryProfile?.primary_court ||
    notaryProfile?.court_name ||
    'المحكمة الابتدائية المختصة';
  const defaultNotary1 = state.meta?.notaryPrimary || user?.full_name || 'العدل المتلقي الأول';
  const defaultNotary2 = state.meta?.notarySecondary || 'العدل المتلقي الثاني';

  const todayGregorian = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayHijri = useMemo(() => convertGregorianToHijri(todayGregorian), [todayGregorian]);

  // Active Stage in the 7-stage Wizard
  const [activeStage, setActiveStage] = useState<number>(1);

  // ---------------------------------------------------------------------------
  // 1. Original Deed State (الرسم الأصلي محل التصحيح)
  // ---------------------------------------------------------------------------
  const [deedNumber, setDeedNumber] = useState<string>(state.correctionAddendum?.originalDeed?.deedNumber || '');
  const [deedYear, setDeedYear] = useState<string>(state.correctionAddendum?.originalDeed?.year || '');
  const [recordLetter, setRecordLetter] = useState<string>(state.correctionAddendum?.originalDeed?.recordLetter || '');
  const [pageNumber, setPageNumber] = useState<string>(state.correctionAddendum?.originalDeed?.pageNumber || '');
  const [countNumber, setCountNumber] = useState<string>(state.correctionAddendum?.originalDeed?.countNumber || '');
  const [deedType, setDeedType] = useState<string>(state.correctionAddendum?.originalDeed?.deedType || '');
  const [receiptDate, setReceiptDate] = useState<string>(state.correctionAddendum?.originalDeed?.receiptDate || '');
  const [endorsementDate, setEndorsementDate] = useState<string>(state.correctionAddendum?.originalDeed?.endorsementDate || '');
  const [courtName, setCourtName] = useState<string>(state.correctionAddendum?.originalDeed?.courtName || defaultCourt);
  const [judicialDistrict, setJudicialDistrict] = useState<string>(state.correctionAddendum?.originalDeed?.judicialDistrict || '');
  const [originalNotaries, setOriginalNotaries] = useState<string>(state.correctionAddendum?.originalDeed?.notaries || '');
  const [partiesSummary, setPartiesSummary] = useState<string>(state.correctionAddendum?.originalDeed?.partiesSummary || '');
  const [propertySummary, setPropertySummary] = useState<string>(state.correctionAddendum?.originalDeed?.propertySummary || '');
  const [financialSummary, setFinancialSummary] = useState<string>(state.correctionAddendum?.originalDeed?.financialSummary || '');
  const [isOriginalDeedSelected, setIsOriginalDeedSelected] = useState<boolean>(
    state.correctionAddendum?.isOriginalDeedSelected ?? false
  );

  // ---------------------------------------------------------------------------
  // 2. Correction Applicant (طالب الإسمحة / التصحيح)
  // ---------------------------------------------------------------------------
  const [applicantCategory, setApplicantCategory] = useState<CorrectionApplicant['applicantCategory']>(
    state.correctionAddendum?.applicant?.applicantCategory || 'أحد_أطراف_الرسم'
  );
  const [applicantFullName, setApplicantFullName] = useState<string>(
    state.correctionAddendum?.applicant?.fullName || ''
  );
  const [applicantFatherName, setApplicantFatherName] = useState<string>(
    state.correctionAddendum?.applicant?.fatherName || ''
  );
  const [applicantMotherName, setApplicantMotherName] = useState<string>(
    state.correctionAddendum?.applicant?.motherName || ''
  );
  const [applicantBirthDate, setApplicantBirthDate] = useState<string>(
    state.correctionAddendum?.applicant?.birthDate || ''
  );
  const [applicantBirthPlace, setApplicantBirthPlace] = useState<string>(
    state.correctionAddendum?.applicant?.birthPlace || ''
  );
  const [applicantNationality, setApplicantNationality] = useState<string>(
    state.correctionAddendum?.applicant?.nationality || 'مغربية'
  );
  const [applicantProfession, setApplicantProfession] = useState<string>(
    state.correctionAddendum?.applicant?.profession || ''
  );
  const [applicantAddress, setApplicantAddress] = useState<string>(
    state.correctionAddendum?.applicant?.address || ''
  );
  const [applicantCin, setApplicantCin] = useState<string>(
    state.correctionAddendum?.applicant?.cin || ''
  );
  const [applicantCinExpiry, setApplicantCinExpiry] = useState<string>(
    state.correctionAddendum?.applicant?.cinExpiryDate || ''
  );
  const [applicantPhone, setApplicantPhone] = useState<string>(
    state.correctionAddendum?.applicant?.phone || ''
  );
  const [applicantRoleInOriginalDeed, setApplicantRoleInOriginalDeed] = useState<string>(
    state.correctionAddendum?.applicant?.roleInOriginalDeed || 'مشتري'
  );
  const [isActingInPerson, setIsActingInPerson] = useState<boolean>(
    state.correctionAddendum?.applicant?.isActingInPerson ?? true
  );

  // Representation Details (إذا كان وكيلاً أو نائباً)
  const [repCapacity, setRepCapacity] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.representativeCapacity || 'وكيل اتفاقي بمقتضى وكالة'
  );
  const [poaType, setPoaType] = useState<any>(
    state.correctionAddendum?.applicant?.representation?.poaType || 'عدلية_مضمنة'
  );
  const [poaNumber, setPoaNumber] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.poaNumber || ''
  );
  const [poaDate, setPoaDate] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.poaDate || ''
  );
  const [poaIssuer, setPoaIssuer] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.poaIssuer || ''
  );
  const [poaReference, setPoaReference] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.poaReference || ''
  );
  const [authorityScope, setAuthorityScope] = useState<string>(
    state.correctionAddendum?.applicant?.representation?.authorityScope || 'صلاحية طلب تصحيح الأخطاء المادية واستدراك الإغفال'
  );

  // ---------------------------------------------------------------------------
  // 3. Multi-Item Corrections (تعدد مواضع التصحيح والإغفالات)
  // ---------------------------------------------------------------------------
  const [selectedCategories, setSelectedCategories] = useState<CorrectionFieldCategory[]>(
    state.correctionAddendum?.selectedCategories || ['بيانات_شخص']
  );
  const [correctionItems, setCorrectionItems] = useState<CorrectionItem[]>(
    state.correctionAddendum?.items || [
      {
        id: 'item-1',
        category: 'بيانات_شخص',
        targetRole: 'المشتري',
        fieldLabel: 'الاسم العائلي',
        originalValue: '',
        correctedValue: '',
        verificationSource: 'البطاقة_الوطنية',
        matchingDegree: 'مطابقة_تامة',
        isOmission: false,
        affectedRelatedFields: ['متن الرسم', 'تحديد الحصة', 'المراجع المالية'],
        auditInfo: {
          verifiedBy: defaultNotary1,
          verificationDate: todayGregorian,
        },
      },
    ]
  );

  // ---------------------------------------------------------------------------
  // 4. Specialized Real Estate Sub-system (العقار، الحدود، المساحة، الإحداثيات)
  // ---------------------------------------------------------------------------
  const [propType, setPropType] = useState<PropertyCorrectionState['propertyType']>(
    state.correctionAddendum?.propertyCorrection?.propertyType || 'محفظ'
  );
  const [propTitleOriginal, setPropTitleOriginal] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.titleNumber?.original || ''
  );
  const [propTitleCorrected, setPropTitleCorrected] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.titleNumber?.corrected || ''
  );
  const [propNameOriginal, setPropNameOriginal] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.propertyName?.original || ''
  );
  const [propNameCorrected, setPropNameCorrected] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.propertyName?.corrected || ''
  );
  const [propLocationOriginal, setPropLocationOriginal] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.location?.original || ''
  );
  const [propLocationCorrected, setPropLocationCorrected] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.location?.corrected || ''
  );

  // Boundaries (الحدود الأربعة والارتفاقات)
  const [northOrig, setNorthOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.north?.original || ''
  );
  const [northCorr, setNorthCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.north?.corrected || ''
  );
  const [eastOrig, setEastOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.east?.original || ''
  );
  const [eastCorr, setEastCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.east?.corrected || ''
  );
  const [southOrig, setSouthOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.south?.original || ''
  );
  const [southCorr, setSouthCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.south?.corrected || ''
  );
  const [westOrig, setWestOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.west?.original || ''
  );
  const [westCorr, setWestCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.boundaries?.west?.corrected || ''
  );

  // Area & Units converter (المساحة والوحدات)
  const [areaOrigM2, setAreaOrigM2] = useState<number>(
    state.correctionAddendum?.propertyCorrection?.area?.originalM2 || 0
  );
  const [areaCorrM2, setAreaCorrM2] = useState<number>(
    state.correctionAddendum?.propertyCorrection?.area?.correctedM2 || 0
  );
  const [areaReason, setAreaReason] = useState<PropertyCorrectionState['area']['correctionReason']>(
    state.correctionAddendum?.propertyCorrection?.area?.correctionReason || 'خطأ_في_النقل'
  );

  // Coordinates (الإحداثيات الجغرافية)
  const [coordXOrig, setCoordXOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.coordinates?.xOriginal || ''
  );
  const [coordXCorr, setCoordXCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.coordinates?.xCorrected || ''
  );
  const [coordYOrig, setCoordYOrig] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.coordinates?.yOriginal || ''
  );
  const [coordYCorr, setCoordYCorr] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.coordinates?.yCorrected || ''
  );
  const [coordSystem, setCoordSystem] = useState<string>(
    state.correctionAddendum?.propertyCorrection?.coordinates?.spatialSystem || 'Lambert Merchich (Maroc)'
  );

  // ---------------------------------------------------------------------------
  // 5. Specialized Financial Sub-system (الثمن والمقابل والمطابقة مع الحروف)
  // ---------------------------------------------------------------------------
  const [priceOriginal, setPriceOriginal] = useState<number>(
    state.correctionAddendum?.financialCorrection?.priceOriginal || 0
  );
  const [priceCorrected, setPriceCorrected] = useState<number>(
    state.correctionAddendum?.financialCorrection?.priceCorrected || 0
  );
  const [financialFlawType, setFinancialFlawType] = useState<FinancialCorrectionState['flawType']>(
    state.correctionAddendum?.financialCorrection?.flawType || 'رقم_خاطئ'
  );

  const priceWordsOrigAuto = useMemo(() => {
    return priceOriginal > 0 ? convertNumberToArabicWords(priceOriginal) + ' درهم مغربي' : '';
  }, [priceOriginal]);

  const priceWordsCorrAuto = useMemo(() => {
    return priceCorrected > 0 ? convertNumberToArabicWords(priceCorrected) + ' درهم مغربي' : '';
  }, [priceCorrected]);

  const [priceWordsCustom, setPriceWordsCustom] = useState<string>(
    state.correctionAddendum?.financialCorrection?.priceWordsCorrected || ''
  );

  // ---------------------------------------------------------------------------
  // 6. Specialized Witnesses / Lafif Sub-system (الشهود واللفيف)
  // ---------------------------------------------------------------------------
  const [hasWitnessCorrection, setHasWitnessCorrection] = useState<boolean>(
    state.correctionAddendum?.witnessCorrection?.hasWitnessCorrection ?? false
  );
  const [witnessAction, setWitnessAction] = useState<WitnessCorrectionState['witnessAction']>(
    state.correctionAddendum?.witnessCorrection?.witnessAction || 'تصحيح_اسم_شاهد'
  );
  const [witnessesList, setWitnessesList] = useState<WitnessCorrectionState['witnesses']>(
    state.correctionAddendum?.witnessCorrection?.witnesses || []
  );

  // ---------------------------------------------------------------------------
  // 7. Nature & Pre-signing Checks (التكييف والفحوصات الـ 15)
  // ---------------------------------------------------------------------------
  const [substantiveNature, setSubstantiveNature] = useState<CorrectionSubstantiveNature>(
    state.correctionAddendum?.substantiveNature || 'تصحيح_بيان_مادي_بياني'
  );
  const [legalNotes, setLegalNotes] = useState<string>(
    state.correctionAddendum?.legalJustificationNotes || ''
  );

  // Smart Assistant dynamic tip
  const smartAssistantTip = useMemo(() => {
    if (selectedCategories.includes('بيانات_شخص')) {
      return 'أنت بصدد تصحيح بيانات شخص. يُوصى بفحص رقم البطاقة الوطنية وتاريخ صلاحيتها واسمي الأبوين في باقي أجزاء الرسم منعاً لأي تناقض.';
    }
    if (selectedCategories.includes('المساحة') || selectedCategories.includes('الحدود')) {
      return 'تعديل المساحة أو أحد الحدود الأربعة يقتضي فحص شهادة الملكية العقارية أو التصميم الهندسي الطبوغرافي لتفادي المساس بهوية العقار.';
    }
    if (selectedCategories.includes('الثمن_أو_المقابل')) {
      return 'تأكد من مطابقة الثمن المصحح بالأرقام مع الصياغة الحرفية بالدرهم المغربي منعاً لأي إشكال مع إدارة الضرائب وإدارة التسجيل.';
    }
    return 'الملحق التصحيحي يحفظ الرسم الأصلي بجميع مراجعه ويثبت الاستدراك أو الإصلاح بصفة رسمية ترتبط بطرة الرسم الأصلي وسجل التضمين.';
  }, [selectedCategories]);

  // Sync to Parent state
  useEffect(() => {
    const fullState: CorrectionAddendumState = {
      originalDeed: {
        deedNumber,
        year: deedYear,
        recordLetter,
        pageNumber,
        countNumber,
        deedType,
        receiptDate,
        endorsementDate,
        courtName,
        judicialDistrict,
        notaries: originalNotaries,
        partiesSummary,
        propertySummary,
        financialSummary,
        status: 'مضمن',
        isRegisteredInTax: true,
      },
      isOriginalDeedSelected,
      applicant: {
        applicantCategory,
        fullName: applicantFullName,
        firstName: '',
        familyName: '',
        fatherName: applicantFatherName,
        motherName: applicantMotherName,
        birthDate: applicantBirthDate,
        birthPlace: applicantBirthPlace,
        nationality: applicantNationality,
        profession: applicantProfession,
        address: applicantAddress,
        cin: applicantCin,
        cinExpiryDate: applicantCinExpiry,
        phone: applicantPhone,
        roleInOriginalDeed: applicantRoleInOriginalDeed,
        isActingInPerson,
        representation: !isActingInPerson
          ? {
              representativeCapacity: repCapacity,
              poaType,
              poaNumber,
              poaDate,
              poaIssuer,
              poaReference,
              authorityScope,
            }
          : undefined,
      },
      selectedCategories,
      items: correctionItems,
      propertyCorrection: {
        propertyType: propType,
        propertyName: { original: propNameOriginal, corrected: propNameCorrected },
        titleNumber: { original: propTitleOriginal, corrected: propTitleCorrected },
        location: { original: propLocationOriginal, corrected: propLocationCorrected },
        boundaries: {
          north: { original: northOrig, corrected: northCorr },
          east: { original: eastOrig, corrected: eastCorr },
          south: { original: southOrig, corrected: southCorr },
          west: { original: westOrig, corrected: westCorr },
          additionalBoundaries: [],
        },
        area: {
          originalM2: areaOrigM2,
          correctedM2: areaCorrM2,
          hectares: Math.floor(areaCorrM2 / 10000),
          ares: Math.floor((areaCorrM2 % 10000) / 100),
          centiares: areaCorrM2 % 100,
          correctionReason: areaReason,
        },
        coordinates: {
          xOriginal: coordXOrig,
          xCorrected: coordXCorr,
          yOriginal: coordYOrig,
          yCorrected: coordYCorr,
          spatialSystem: coordSystem,
          source: 'تصميم طبوغرافي معتمد',
        },
        shareRatio: { original: '', corrected: '' },
      },
      financialCorrection: {
        priceOriginal,
        priceCorrected,
        priceWordsOriginal: priceWordsOrigAuto,
        priceWordsCorrected: priceWordsCustom || priceWordsCorrAuto,
        flawType: financialFlawType,
        currency: 'درهم مغربي',
        isAmountMatchingWords: true,
      },
      witnessCorrection: {
        hasWitnessCorrection,
        witnessAction,
        witnesses: witnessesList,
      },
      substantiveNature,
      legalJustificationNotes: legalNotes,
      validationChecks: [],
      courtName,
      notary1: defaultNotary1,
      notary2: defaultNotary2,
      addendumDateHijri: todayHijri,
      addendumDateGregorian: todayGregorian,
      closingFormula: 'وعلى ذلك وقع الإشهاد والتأشير بالملحق التصحيحي ليربط بطرة الرسم الأصلي طبقاً للقانون.',
    };

    setState((prev) => ({
      ...prev,
      correctionAddendum: fullState,
    }));
  }, [
    deedNumber,
    deedYear,
    recordLetter,
    pageNumber,
    countNumber,
    deedType,
    receiptDate,
    endorsementDate,
    courtName,
    judicialDistrict,
    originalNotaries,
    partiesSummary,
    propertySummary,
    financialSummary,
    isOriginalDeedSelected,
    applicantCategory,
    applicantFullName,
    applicantFatherName,
    applicantMotherName,
    applicantBirthDate,
    applicantBirthPlace,
    applicantNationality,
    applicantProfession,
    applicantAddress,
    applicantCin,
    applicantCinExpiry,
    applicantPhone,
    applicantRoleInOriginalDeed,
    isActingInPerson,
    repCapacity,
    poaType,
    poaNumber,
    poaDate,
    poaIssuer,
    poaReference,
    authorityScope,
    selectedCategories,
    correctionItems,
    propType,
    propTitleOriginal,
    propTitleCorrected,
    propNameOriginal,
    propNameCorrected,
    propLocationOriginal,
    propLocationCorrected,
    northOrig,
    northCorr,
    eastOrig,
    eastCorr,
    southOrig,
    southCorr,
    westOrig,
    westCorr,
    areaOrigM2,
    areaCorrM2,
    areaReason,
    coordXOrig,
    coordXCorr,
    coordYOrig,
    coordYCorr,
    coordSystem,
    priceOriginal,
    priceCorrected,
    priceWordsOrigAuto,
    priceWordsCorrAuto,
    priceWordsCustom,
    financialFlawType,
    hasWitnessCorrection,
    witnessAction,
    witnessesList,
    substantiveNature,
    legalNotes,
    defaultNotary1,
    defaultNotary2,
    todayHijri,
    todayGregorian,
    setState,
  ]);

  // ---------------------------------------------------------------------------
  // 15 Pre-signing Automated Validation Rules (اختبار ما قبل التوقيع)
  // ---------------------------------------------------------------------------
  const preSigningRules: PreSigningCheckRule[] = useMemo(() => {
    return [
      {
        id: 'chk-1',
        label: 'تحديد الرسم الأصلي محل التصحيح ومراجعه المضمنة',
        passed: Boolean(deedNumber && (countNumber || pageNumber)),
        severity: 'blocking',
        explanation: 'يجب بيان رقم الرسم الأصلي وعدد صحيفته أو تاريخه لربط الملحق به بدقة.',
      },
      {
        id: 'chk-2',
        label: 'تطابق وصحة مراجع التضمين بالمحكمة المختصة',
        passed: Boolean(courtName),
        severity: 'blocking',
        explanation: 'تحديد المحكمة الابتدائية وقسم التوثيق المضمن به الرسم الأصلي.',
      },
      {
        id: 'chk-3',
        label: 'تحديد هوية طالب التصحيح بالكامل',
        passed: Boolean(applicantFullName && applicantCin),
        severity: 'blocking',
        explanation: 'يلزم إدراج الاسم الكامل ورقم البطاقة الوطنية لطالب الإسمحة أو نائبه.',
      },
      {
        id: 'chk-4',
        label: 'مشروعية صفة طالب التصحيح وعلاقته بالرسم',
        passed: Boolean(applicantRoleInOriginalDeed),
        severity: 'blocking',
        explanation: 'التحقق من صفة الطالب وما إذا كان طرفاً أصلياً أو خلفاً أو ذا مصلحة.',
      },
      {
        id: 'chk-5',
        label: 'ثبوت سند النيابة أو الوكالة عند عدم الحضور أصالة',
        passed: isActingInPerson || Boolean(poaNumber && poaDate),
        severity: 'blocking',
        explanation: 'عند تقديم الطلب بواسطة وكيل يتعين إثبات مرجع وتاريخ سند التمثيل.',
      },
      {
        id: 'chk-6',
        label: 'تحديد موضع الخلل أو البيان المغفل بدقة',
        passed: correctionItems.length > 0 && correctionItems.every((item) => item.fieldLabel),
        severity: 'blocking',
        explanation: 'بيان موضع الغلط المادي أو النقص في الرسم.',
      },
      {
        id: 'chk-7',
        label: 'إثبات البيان الوارد بالرسم الأصلي والبيان المصحح',
        passed: correctionItems.every((item) => item.correctedValue.trim().length > 0),
        severity: 'blocking',
        explanation: 'توضيح البيان الصحيح المراد اعتماده بمقتضى هذا الملحق.',
      },
      {
        id: 'chk-8',
        label: 'تحديد مصدر التحقق والمستند المؤيد للتصحيح',
        passed: correctionItems.every((item) => item.verificationSource),
        severity: 'blocking',
        explanation: 'الاعتماد على وثيقة رسمية أو حجة معتبرة (بطاقة وطنية، حالة مدنية، شهادة ملكية...).',
      },
      {
        id: 'chk-9',
        label: 'سلامة درجة المطابقة والتوثيق',
        passed: correctionItems.every((item) => item.matchingDegree !== 'لا_توجد_وثيقة_مؤيدة'),
        severity: 'warning',
        explanation: 'يستحسن توفر مستند مؤيد تام المطابقة لتفادي المنازعات.',
      },
      {
        id: 'chk-10',
        label: 'عدم وجود تناقض داخلي بين العناصر المصححة',
        passed: true,
        severity: 'blocking',
        explanation: 'انسجام البيانات المصححة مع أصل العقد ومشتملاته.',
      },
      {
        id: 'chk-11',
        label: 'مطابقة الثمن رقماً وكتابة بالحروف',
        passed: priceOriginal === 0 || (priceCorrected > 0 && Boolean(priceWordsCorrAuto)),
        severity: 'blocking',
        explanation: 'تطابق التعبير العددي مع الصياغة بالحروف للثمن والمقابل المالي.',
      },
      {
        id: 'chk-12',
        label: 'اتساق المساحة ووحدات القياس العقارية',
        passed: areaOrigM2 === 0 || areaCorrM2 > 0,
        severity: 'warning',
        explanation: 'التحقق من صحة المساحة بالمتر المربع وأجزاء الهكتار.',
      },
      {
        id: 'chk-13',
        label: 'وضوح هوية العقار والحدود الأربعة عند التصحيح العقاري',
        passed: !selectedCategories.includes('الحدود') || Boolean(northCorr || eastCorr || southCorr || westCorr),
        severity: 'blocking',
        explanation: 'بيان الحدود المصححة وتفادي أي التباس في هوية العقار وموقعه.',
      },
      {
        id: 'chk-14',
        label: 'التكييف القانوني لطبيعة التصحيح (المادة 33 من قانون 16.03)',
        passed: Boolean(substantiveNature),
        severity: 'blocking',
        explanation: 'تحديد ما إذا كان التصحيح مادياً أو استدراكاً لإغفال، مع التثبت من عدم المساس بجوهر التصرف.',
      },
      {
        id: 'chk-15',
        label: 'جاهزية الصيغة العدلية للتذييل والتأشير بالهامش والإرسال للقاضي',
        passed: Boolean(defaultCourt && defaultNotary1),
        severity: 'blocking',
        explanation: 'اكتمال الديباجة والصيغة العدلية للإشهار القضائي وخطاب القاضي المكلف بالتوثيق.',
      },
    ];
  }, [
    deedNumber,
    countNumber,
    pageNumber,
    courtName,
    applicantFullName,
    applicantCin,
    applicantRoleInOriginalDeed,
    isActingInPerson,
    poaNumber,
    poaDate,
    correctionItems,
    priceOriginal,
    priceCorrected,
    priceWordsCorrAuto,
    areaOrigM2,
    areaCorrM2,
    selectedCategories,
    northCorr,
    eastCorr,
    southCorr,
    westCorr,
    substantiveNature,
    defaultCourt,
    defaultNotary1,
  ]);

  const allBlockingPassed = useMemo(() => {
    return preSigningRules.filter((r) => r.severity === 'blocking').every((r) => r.passed);
  }, [preSigningRules]);

  // ---------------------------------------------------------------------------
  // Authoritative Moroccan Legal Draft Generator for Correction Addendum
  // (صياغة رسم الإسمحة والملحق التصحيحي وفق الأسلوب العدلي المغربي الرصين)
  // ---------------------------------------------------------------------------
  const generateAuthoritativeDraft = useMemo(() => {
    const applicantText = isActingInPerson
      ? `طالب الإسمحة أصالة عن نفسه: ${applicantFullName || '................................'}، ابن ${applicantFatherName || '...'} وأمه ${applicantMotherName || '...'}، المزداد بتاريخ ${applicantBirthDate || '...'} بـ ${applicantBirthPlace || '...'}، من جنسية ${applicantNationality}، مهنته ${applicantProfession || '...'}، الساكن بـ ${applicantAddress || '...'}، الحامل للبطاقة الوطنية للتعريف رقم ${applicantCin || '..........'}، بصفته (${applicantRoleInOriginalDeed}) في الرسم الأصلي.`
      : `طالب الإسمحة نيابة ووكالة: ${applicantFullName || '................................'}، بصفته (${repCapacity}) عن الطرف الأصلي المعني (${applicantRoleInOriginalDeed})، بمقتضى سند النيابة ${poaType} رقم ${poaNumber || '...'} بتاريخ ${poaDate || '...'} الصادر عن ${poaIssuer || '...'}، الحامل للبطاقة الوطنية للتعريف رقم ${applicantCin || '..........'}.`;

    const itemsText = correctionItems
      .map((item, idx) => {
        return `   ${idx + 1}) في موضع (${item.fieldLabel} العائد لـ ${item.targetRole}):
       - الوارد في أصل الرسم: "${item.originalValue || 'خالٍ / مسكوت عنه'}"
       - والصحيح المعتمد: "${item.correctedValue || '................................'}"
       - مستند التحقق والإثبات: (${item.verificationSource.replace(/_/g, ' ')})، ودرجة المطابقة: [${item.matchingDegree.replace(/_/g, ' ')}].`;
      })
      .join('\n\n');

    const propertyDetailsSection =
      selectedCategories.includes('العقار_ومشتملاته') ||
      selectedCategories.includes('الحدود') ||
      selectedCategories.includes('المساحة')
        ? `\n\n[بيان الوضعية العقارية المصححة]:
العقار موضوع الرسم: نوعه (${propType.replace(/_/g, ' ')})، اسمه: "${propNameCorrected || propNameOriginal || '...'}"، الرسم العقاري/المطلب عدد: "${propTitleCorrected || propTitleOriginal || '...'}"، الكائن بـ: "${propLocationCorrected || propLocationOriginal || '...'}".
- الحدود المصححة: شمالاً: "${northCorr || northOrig || '...'}"، شرقاً: "${eastCorr || eastOrig || '...'}"، جنوباً: "${southCorr || southOrig || '...'}"، غرباً: "${westCorr || westOrig || '...'}".
${
  areaCorrM2 > 0
    ? `- المساحة المصححة: ${areaCorrM2} م² (أي: ${Math.floor(areaCorrM2 / 10000)} هكتار و ${Math.floor((areaCorrM2 % 10000) / 100)} آر و ${areaCorrM2 % 100} سنتيار)، سبب الاستدراك: (${areaReason.replace(/_/g, ' ')}).`
    : ''
}`
        : '';

    const financialSection =
      selectedCategories.includes('الثمن_أو_المقابل') && priceCorrected > 0
        ? `\n\n[بيان الثمن والمقابل المالي المصحح]:
الثمن الوارد سهواً في الرسم الأصلي: ${priceOriginal.toLocaleString('ar-MA')} درهم (${priceWordsOrigAuto || '...'}).
والثمن الصحيح المتفق عليه شرعاً وقانوناً: ${priceCorrected.toLocaleString('ar-MA')} درهم، صريح عبارته بالحروف: "${priceWordsCustom || priceWordsCorrAuto}".
نوع الخلل المستدرك: (${financialFlawType.replace(/_/g, ' ')}).`
        : '';

    return `الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.

المملكة المغربية
وزارة العدل
محكمة الاستئناف بـ ...
المحكمة الابتدائية بـ ${courtName}
قسم قضاء التوثيق

رسم ملحق تصحيحي (رسم الإسمحة واستدراك الإغفال)
ملحق بالرسم الأصلي عدد: ${deedNumber || '...'} — صحيفة: ${pageNumber || '...'} — سجل: ${recordLetter || '...'} — لسنة: ${deedYear || '...'}
نوع الرسم الأصلي: [${deedType || 'رسم عدلي'}] المضمن بتاريخ: ${receiptDate || '...'} هـ / الموافق: ${endorsementDate || '...'} م

لدى العدلين الموقعين أسفله المنتصبين للإشهاد بدائرة المحكمة الابتدائية بـ ${courtName}:

حضر:
${applicantText}

وعرض وأشهد على نفسه طائعاً مختاراً، عارفاً قدر ما يشهد به شرعاً وقانوناً:
أنه بمناسبة مراجعة وتدقيق معالم الرسم العدلي المشار إلى مراجعه وبياناته بأعلاه، تبين وقوع سهو وغلط مادي أو استكمال إغفال في بعض بياناته الواردة في متنه وسجل تضمينه، دون أن يمس ذلك جوهر التصرف أو أصل العقد والتراضي المنعقد بين أطرافه.

ولأجله، واستناداً إلى مقتضيات المادة 33 من القانون رقم 16.03 المتعلق بخطة العدالة، والفصلين 444 و 445 من قانون الالتزامات والعقود، فقد صرح وأشهد الطرف المذكور بتصحيح وتدارك المواضع الآتية واعتماد صيغتها الصحيحة والمطابقة للواقع والوثائق الرسمية المؤيدة:

${itemsText}${propertyDetailsSection}${financialSection}

[التكييف والآثار القانونية]:
يعد هذا الملحق التصحيحي جزءاً لا يتجزأ من الرسم الأصلي المذكور أعلاه، ويسري بأثره القانوني عليه مع الحفاظ على تاريخ نفاذه الأصلي وحقوق الأطراف، ويؤشر بموجبه وجوباً بطرة الرسم الأصلي بسجل التضمين تحت طائلة المتابعة.

وقد ثبتت لدى العدلين صحة هذه التصريحات ومطابقتها للمستندات المعروضة، وبناء عليه وقع التلقي والإشهاد في مجلس واحد وفق الضوابط الشرعية والقانونية الجاري بها العمل.

تحريراً في: ${todayHijri} هـ / الموافق لـ: ${todayGregorian} م.

عن إذن القاضي المكلف بالتوثيق.
العدل الأول: ${defaultNotary1}                     العدل الثاني: ${defaultNotary2}`;
  }, [
    isActingInPerson,
    applicantFullName,
    applicantFatherName,
    applicantMotherName,
    applicantBirthDate,
    applicantBirthPlace,
    applicantNationality,
    applicantProfession,
    applicantAddress,
    applicantCin,
    applicantRoleInOriginalDeed,
    repCapacity,
    poaType,
    poaNumber,
    poaDate,
    poaIssuer,
    correctionItems,
    selectedCategories,
    propType,
    propNameCorrected,
    propNameOriginal,
    propTitleCorrected,
    propTitleOriginal,
    propLocationCorrected,
    propLocationOriginal,
    northCorr,
    northOrig,
    eastCorr,
    eastOrig,
    southCorr,
    southOrig,
    westCorr,
    westOrig,
    areaCorrM2,
    areaReason,
    priceOriginal,
    priceCorrected,
    priceWordsOrigAuto,
    priceWordsCustom,
    priceWordsCorrAuto,
    financialFlawType,
    courtName,
    deedNumber,
    pageNumber,
    recordLetter,
    deedYear,
    deedType,
    receiptDate,
    endorsementDate,
    todayHijri,
    todayGregorian,
    defaultNotary1,
    defaultNotary2,
  ]);

  // Copy Draft to Clipboard
  const handleCopyDraft = useCallback(() => {
    navigator.clipboard.writeText(generateAuthoritativeDraft);
    alert('تم نسخ نص الملحق التصحيحي بنجاح.');
  }, [generateAuthoritativeDraft]);

  // Print Draft
  const handlePrintDraft = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>معاينة الملحق التصحيحي للرسم العدلي</title>
          <style>
            body { font-family: 'Amiri', 'Traditional Arabic', serif; padding: 40px; line-height: 2.1; font-size: 15pt; color: #111; }
            h1, h2 { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .header-box { border: 2px double #1e3a8a; padding: 15px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
            .footer-box { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h2>المملكة المغربية — وزارة العدل</h2>
            <h3>الملحق التصحيحي للرسم العدلي (رسم الإسمحة واستدراك الإغفال)</h3>
            <p>ملحق بالرسم عدد ${deedNumber || '...'} صحيفة ${pageNumber || '...'} لسنة ${deedYear || '...'}</p>
          </div>
          <pre style="white-space: pre-wrap; font-family: inherit;">${generateAuthoritativeDraft}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [generateAuthoritativeDraft, deedNumber, pageNumber, deedYear]);

  // Proceed to Step 7 (المراجعة القضائية وتوجيه الرسم للقاضي)
  // Strict rule: do not call _onNext() to prevent skipping Step 7!
  const handleProceedToStep7 = useCallback(() => {
    const applicantParty: Party = {
      ...createEmptyParty(),
      fullName: applicantFullName,
      first_name: applicantFullName.split(' ')[0] || '',
      last_name: applicantFullName.split(' ').slice(1).join(' ') || '',
      national_id: applicantCin,
      phone: applicantPhone,
      address: applicantAddress,
      profession: applicantProfession,
      nationality: 'مغربي',
      capacity: isActingInPerson ? applicantRoleInOriginalDeed : repCapacity,
    };

    const targetParty: Party = {
      ...createEmptyParty(),
      fullName: `الأطراف الأصليون بالرسم عدد ${deedNumber || '...'}`,
      capacity: 'الأطراف الأصليون المشهود عليهم',
    };

    setState((prev) => ({
      ...prev,
      step: 7, // الانتقال المباشر والقطعي للخطوة السابعة
      documentType: 'ملحق_تصحيحي',
      draft: generateAuthoritativeDraft,
      draftText: generateAuthoritativeDraft,
      sellers: [targetParty],
      buyers: [applicantParty],
      property: {
        ...prev.property,
        propertyName: propNameCorrected || propNameOriginal,
        titleRef: propTitleCorrected || propTitleOriginal,
        location: propLocationCorrected || propLocationOriginal,
        boundaries: {
          north: northCorr || northOrig,
          east: eastCorr || eastOrig,
          south: southCorr || southOrig,
          west: westCorr || westOrig,
        },
        area_m2: areaCorrM2 || areaOrigM2,
      },
      finance: {
        ...prev.finance,
        price: priceCorrected || priceOriginal,
        priceInWords: priceWordsCustom || priceWordsCorrAuto,
        paymentMethod: 'نقد',
      },
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    applicantFullName,
    applicantCin,
    applicantPhone,
    applicantAddress,
    applicantProfession,
    isActingInPerson,
    applicantRoleInOriginalDeed,
    repCapacity,
    deedNumber,
    generateAuthoritativeDraft,
    propNameCorrected,
    propNameOriginal,
    propTitleCorrected,
    propTitleOriginal,
    propLocationCorrected,
    propLocationOriginal,
    northCorr,
    northOrig,
    eastCorr,
    eastOrig,
    southCorr,
    southOrig,
    westCorr,
    westOrig,
    areaCorrM2,
    areaOrigM2,
    priceCorrected,
    priceOriginal,
    priceWordsCustom,
    priceWordsCorrAuto,
    setState,
  ]);

  // Stage steps header metadata
  const stagesList = [
    { num: 1, title: 'الرسم الأصلي', icon: Building2, desc: 'تحديد مراجع الرسم' },
    { num: 2, title: 'طالب التصحيح', icon: UserCheck, desc: 'الصفة والنيابة' },
    { num: 3, title: 'مواضع الخلل', icon: Scale, desc: 'تحديد الأخطاء والإغفال' },
    { num: 4, title: 'مصادر التحقق', icon: FileCheck, desc: 'المستندات والمطابقة' },
    { num: 5, title: 'شبكة الارتباط', icon: LinkIcon, desc: 'الأثر القانوني وفصل 33' },
    { num: 6, title: 'المقارنة والفحص', icon: ShieldCheck, desc: '15 فحصاً آلياً' },
    { num: 7, title: 'التحرير والاعتماد', icon: FileText, desc: 'الصياغة والخطوة 7' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16 text-slate-800" dir="rtl">
      {/* ===================================================================== */}
      {/* 1. Header Banner & Identity                                           */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-blue-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-xs font-bold">
              <span>✦ الملحق التصحيحي للرسم العدلي</span>
              <span>•</span>
              <span>رسم الإسمحة واستدراك الإغفال</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-amber-300 font-serif flex items-center gap-2.5">
              <span>🟦 رسم ملحق تصحيحي</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
              تصحيح خطأ أو استكمال إغفال في رسم عدلي مع الحفاظ على هوية الرسم ومراجعه ومحتواه الأصلي طبقاً للمادة 33 من قانون خطة العدالة وقانون الالتزامات والعقود.
            </p>
          </div>

          {/* Quick status pill for original deed */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 min-w-[260px] space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-200">
              <span>🔵 الرسم محل التصحيح:</span>
              <span className="font-mono text-white">{deedNumber ? `#${deedNumber}` : 'لم يحدد بعد'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>الحالة القضائية:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>مضمن ✓ مخاطب عليه ✓</span>
              </span>
            </div>
            <div className="text-[11px] text-blue-200 pt-1 border-t border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>ربط آلي مع طرة وسجل الرسم الأصلي</span>
            </div>
          </div>
        </div>

        {/* Smart Alert Banner */}
        <div className="mt-4 p-3 bg-blue-900/40 border border-blue-400/30 rounded-xl text-xs text-blue-100 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>
            <strong>تنبيه ذكي:</strong> سيتم ربط هذا الملحق آلياً بالرسم الأصلي وجميع مراجعه، لذلك لا تبدأ بإدخال البيانات من جديد إلا عند وجود تغيير أو تصحيح فعلي.
          </span>
        </div>

        {/* Stage Navigation Stepper */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stagesList.map((stg) => {
            const Icon = stg.icon;
            const isActive = activeStage === stg.num;
            const isCompleted = activeStage > stg.num;
            return (
              <button
                key={stg.num}
                type="button"
                onClick={() => setActiveStage(stg.num)}
                className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2 ${
                  isActive
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    isActive ? 'bg-amber-400 text-slate-900' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-bold truncate leading-tight">{stg.title}</div>
                  <div className="text-[9px] opacity-75 truncate">{stg.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STAGE 1: تحديد الرسم الأصلي (Screen 1)                                */}
      {/* ===================================================================== */}
      {activeStage === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-700" />
                <span>المرحلة 1: تحديد الرسم الأصلي محل التصحيح ومطابقة مراجعه</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ابحث عن الرسم بالرقم أو السنة أو السجل أو أدخل بياناته بدقة لربطه بالأرشيف التوثيقي
              </p>
            </div>
            {isOriginalDeedSelected && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>تم اعتماد الرسم محل التصحيح</span>
              </span>
            )}
          </div>

          {/* Search / Deed Info Inputs */}
          <div className="grid md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرسم الأصلي *</label>
              <input
                type="text"
                value={deedNumber}
                onChange={(e) => setDeedNumber(e.target.value)}
                placeholder="مثال: 125"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السنة التوثيقية</label>
              <input
                type="text"
                value={deedYear}
                onChange={(e) => setDeedYear(e.target.value)}
                placeholder="2026"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حرف السجل</label>
              <input
                type="text"
                value={recordLetter}
                onChange={(e) => setRecordLetter(e.target.value)}
                placeholder="مثال: ب"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الصحيفة</label>
              <input
                type="text"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="مثال: 74"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عدد الرسم / المضمن</label>
              <input
                type="text"
                value={countNumber}
                onChange={(e) => setCountNumber(e.target.value)}
                placeholder="عدد 125"
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الشهادة الأصلية</label>
              <input
                type="text"
                value={deedType}
                onChange={(e) => setDeedType(e.target.value)}
                placeholder="بيع عقار، قسمة، هبة، صدقة..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التلقي الأصلي</label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة الابتدائية</label>
              <input
                type="text"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          {/* Quick summaries of original deed */}
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملخص أطراف الرسم الأصلي</label>
              <textarea
                value={partiesSummary}
                onChange={(e) => setPartiesSummary(e.target.value)}
                placeholder="البائع: محمد العلوي / المشتري: عمر الفاسي..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملخص العقار بالرسم الأصلي</label>
              <textarea
                value={propertySummary}
                onChange={(e) => setPropertySummary(e.target.value)}
                placeholder="الدار الكائنة بزنقة... ذات الرسم العقاري..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الثمن / المقابل الوارد بالأصل</label>
              <textarea
                value={financialSummary}
                onChange={(e) => setFinancialSummary(e.target.value)}
                placeholder="250,000 درهم (مائتان وخمسون ألف درهم)..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          {/* Confirmation Button */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="text-xs text-blue-900">
              <span className="font-bold block">🧾 بطاقة اعتماد الرسم المسترجع:</span>
              <span>الرسم عدد {deedNumber || '...'} لسنة {deedYear || '...'} حرف {recordLetter || '...'} بصحيفة {pageNumber || '...'}.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOriginalDeedSelected(true);
                setActiveStage(2);
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد هذا الرسم محلّاً للتصحيح والمتابعة</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: من يطلب التصحيح؟ (Screen 2)                                  */}
      {/* ===================================================================== */}
      {activeStage === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <span>المرحلة 2: من يطلب التصحيح؟ (طالب الإسمحة وصفته التوثيقية)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فحص صفة طالب الإسمحة والتثبت من مشروعيته في طلب استدراك وتصحيح معالم الرسم
            </p>
          </div>

          {/* Applicant Category selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">صفة مقدم طلب التصحيح:</label>
            <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {[
                { val: 'أحد_أطراف_الرسم', label: '🔘 أحد أطراف الرسم' },
                { val: 'جميع_الأطراف', label: '🔘 جميع الأطراف باتفاقهم' },
                { val: 'صاحب_الحق_المتأثر_بالخطأ', label: '🔘 صاحب الحق المتأثر بالخطأ' },
                { val: 'وارث_خلف', label: '🔘 وارث أو خلف قانوني' },
                { val: 'وكيل', label: '🔘 وكيل بمقتضى وكالة' },
                { val: 'ممثل_قانوني', label: '🔘 ممثل قانوني لشخص معنوي' },
                { val: 'شخص_آخر_له_صفة', label: '🔘 شخص آخر يثبت صفته' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setApplicantCategory(opt.val as any)}
                  className={`p-2.5 rounded-xl border text-right font-bold transition ${
                    applicantCategory === opt.val
                      ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Personal Details */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <span className="block text-xs font-black text-slate-800">بيانات طالب الإسمحة الشخصية:</span>
            <div className="grid md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={applicantFullName}
                  onChange={(e) => setApplicantFullName(e.target.value)}
                  placeholder="محمد بن عمر..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={applicantFatherName}
                  onChange={(e) => setApplicantFatherName(e.target.value)}
                  placeholder="عمر..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={applicantMotherName}
                  onChange={(e) => setApplicantMotherName(e.target.value)}
                  placeholder="فاطمة..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={applicantCin}
                  onChange={(e) => setApplicantCin(e.target.value)}
                  placeholder="AB123456"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ الازدياد</label>
                <input
                  type="date"
                  value={applicantBirthDate}
                  onChange={(e) => setApplicantBirthDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">مكان الازدياد</label>
                <input
                  type="text"
                  value={applicantBirthPlace}
                  onChange={(e) => setApplicantBirthPlace(e.target.value)}
                  placeholder="الرباط، فاس..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المهنة</label>
                <input
                  type="text"
                  value={applicantProfession}
                  onChange={(e) => setApplicantProfession(e.target.value)}
                  placeholder="تاجر، موظف..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الصفة في أصل الرسم *</label>
                <input
                  type="text"
                  value={applicantRoleInOriginalDeed}
                  onChange={(e) => setApplicantRoleInOriginalDeed(e.target.value)}
                  placeholder="مشتري، بائع، موهوب له..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">محل السكنى والعنوان</label>
                <input
                  type="text"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="رقم، شارع، زنقة، المدينة..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="text"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">تاريخ انتهاء صلاحية البطاقة</label>
                <input
                  type="date"
                  value={applicantCinExpiry}
                  onChange={(e) => setApplicantCinExpiry(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>
          </div>

          {/* Representation toggle */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">هل يقدم الطلب أصالة عن نفسه؟</span>
              <div className="flex items-center gap-3 text-xs font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="actingMode"
                    checked={isActingInPerson}
                    onChange={() => setIsActingInPerson(true)}
                    className="text-blue-600"
                  />
                  <span>نعم (أصالة عن نفسه)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="actingMode"
                    checked={!isActingInPerson}
                    onChange={() => setIsActingInPerson(false)}
                    className="text-blue-600"
                  />
                  <span>لا (نيابة أو وكالة)</span>
                </label>
              </div>
            </div>

            {!isActingInPerson && (
              <div className="pt-2 border-t border-slate-200 grid md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">نوع الصفة النيابية</label>
                  <input
                    type="text"
                    value={repCapacity}
                    onChange={(e) => setRepCapacity(e.target.value)}
                    placeholder="وكيل اتفاقي، ولي شرعي..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طبيعة سند الوكالة</label>
                  <select
                    value={poaType}
                    onChange={(e) => setPoaType(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="عدلية_مضمنة">عدلية مضمنة بالمحكمة</option>
                    <option value="رسمية_توثيقية">عقد توثيقي رسمي</option>
                    <option value="عرفية_مصادق_عليها">عرفية مصادق على التوقيع</option>
                    <option value="حكم_قضائي">حكم قضائي نهائي بالتقديم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">رقم السند وتاريخه</label>
                  <input
                    type="text"
                    value={poaNumber}
                    onChange={(e) => setPoaNumber(e.target.value)}
                    placeholder="عدد... بتاريخ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الجهة المصدرة للسند</label>
                  <input
                    type="text"
                    value={poaIssuer}
                    onChange={(e) => setPoaIssuer(e.target.value)}
                    placeholder="المحكمة الابتدائية بـ..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-slate-600 font-bold mb-1">حدود السلطة المخولة للوكيل</label>
                  <input
                    type="text"
                    value={authorityScope}
                    onChange={(e) => setAuthorityScope(e.target.value)}
                    placeholder="صلاحية طلب تصحيح الأخطاء المادية وتوقيع الملحقات واستدراك الإغفال..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Legal Warning Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>تنبيه ذكي:</strong> صفة طالب التصحيح لا تعني بالضرورة أن له سلطة تعديل جميع عناصر الرسم؛ سيتم التحقق بدقة من علاقته المباشرة بالعنصر المطلوب تصحيحه أو استدراكه.
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: ما طبيعة الخلل؟ وتعدد الأخطاء (Screens 3 & 4)                */}
      {/* ===================================================================== */}
      {activeStage === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-700" />
                <span>المرحلة 3: تحديد طبيعة الخلل ومواضع التصحيح المتعددة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر مواضع الأخطاء المادية أو الإغفالات لإضافتها في ملحق تصحيحي مركب واحد
              </p>
            </div>
            <div className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-bold text-xs border border-blue-200">
              عدد مواضع التصحيح: {correctionItems.length}
            </div>
          </div>

          {/* Category Cards Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              اختر فئة العنصر محل التصحيح أو الاستدراك:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
              {[
                { val: 'بيانات_شخص', label: '👤 بيانات شخص' },
                { val: 'مرجع_الرسم_والسجل', label: '📖 مرجع الرسم والسجل' },
                { val: 'تاريخ_أو_مدة', label: '📅 تاريخ أو مدة' },
                { val: 'السكنى_والعنوان', label: '🏠 السكنى والعنوان' },
                { val: 'وثيقة_الهوية', label: '🪪 وثيقة الهوية' },
                { val: 'الأب_أو_الأم_أو_الحالة_العائلية', label: '👨‍👩‍👦 الحالة العائلية' },
                { val: 'العقار_ومشتملاته', label: '🏡 العقار ومشتملاته' },
                { val: 'الموقع_والإحداثيات', label: '📍 الإحداثيات والموقع' },
                { val: 'المساحة', label: '📐 المساحة' },
                { val: 'الحدود', label: '🧭 الحدود' },
                { val: 'الثمن_أو_المقابل', label: '💰 الثمن أو المقابل' },
                { val: 'الحصة_أو_النسبة', label: '📊 الحصة أو النسبة' },
                { val: 'الشهود_واللفيف', label: '👥 الشهود / اللفيف' },
                { val: 'المراجع_المالية_أو_التسجيلية', label: '💳 المراجع المالية' },
                { val: 'إضافة_بيان_أغفل', label: '➕ إضافة بيان أغفل' },
              ].map((cat) => {
                const isSelected = selectedCategories.includes(cat.val as any);
                return (
                  <button
                    key={cat.val}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter((c) => c !== cat.val));
                      } else {
                        setSelectedCategories([...selectedCategories, cat.val as any]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-right font-bold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Table of Correction Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">
                مواضع التصحيح المعتمدة بالملحق:
              </span>
              <button
                type="button"
                onClick={() => {
                  const newItem: CorrectionItem = {
                    id: `item-${Date.now()}`,
                    category: selectedCategories[0] || 'بيانات_شخص',
                    targetRole: 'أحد الأطراف',
                    fieldLabel: 'بيان مصحح',
                    originalValue: '',
                    correctedValue: '',
                    verificationSource: 'البطاقة_الوطنية',
                    matchingDegree: 'مطابقة_تامة',
                    isOmission: false,
                    affectedRelatedFields: [],
                    auditInfo: {
                      verifiedBy: defaultNotary1,
                      verificationDate: todayGregorian,
                    },
                  };
                  setCorrectionItems([...correctionItems, newItem]);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>➕ إضافة موضع تصحيح آخر</span>
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-3">
              {correctionItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200 pb-2">
                    <span className="flex items-center gap-2 text-blue-900">
                      <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>موضع التصحيح #{idx + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCorrectionItems(correctionItems.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف هذا الموضع</span>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">الطرف أو العنصر المعني</label>
                      <input
                        type="text"
                        value={item.targetRole}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].targetRole = e.target.value;
                          setCorrectionItems(updated);
                        }}
                        placeholder="المشتري، البائع، العقار..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">البيان محل التصحيح *</label>
                      <input
                        type="text"
                        value={item.fieldLabel}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].fieldLabel = e.target.value;
                          setCorrectionItems(updated);
                        }}
                        placeholder="الاسم العائلي، رقم البطاقة، المساحة..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-red-600">
                        الوارد في أصل الرسم (القديم)
                      </label>
                      <input
                        type="text"
                        value={item.originalValue}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].originalValue = e.target.value;
                          setCorrectionItems(updated);
                        }}
                        placeholder="البيان الخاطئ كما ورد..."
                        className="w-full p-2 bg-white border border-red-200 rounded-lg font-bold text-red-700 bg-red-50/20"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1 text-emerald-700">
                        الصحيح المعتمد (الجديد) *
                      </label>
                      <input
                        type="text"
                        value={item.correctedValue}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].correctedValue = e.target.value;
                          setCorrectionItems(updated);
                        }}
                        placeholder="البيان الصحيح..."
                        className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-800 bg-emerald-50/30"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">مصدر التحقق</label>
                      <select
                        value={item.verificationSource}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].verificationSource = e.target.value as any;
                          setCorrectionItems(updated);
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="البطاقة_الوطنية">البطاقة الوطنية للتعريف</option>
                        <option value="الحالة_المدنية">دفتر الحالة المدنية</option>
                        <option value="عقد_الازدياد">عقد الازدياد الرسمي</option>
                        <option value="وثيقة_عقارية">شهادة المحافظة العقارية</option>
                        <option value="حكم_قضائي">حكم قضائي نهائي</option>
                        <option value="وثيقة_جبائية">وثيقة إدارة الضرائب والتسجيل</option>
                        <option value="رسم_عدلي_سابق">رسم عدلي سابق ومضمن</option>
                        <option value="تصريح_المعني">تصريح المعني بالأمر وإقراره</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">درجة المطابقة</label>
                      <select
                        value={item.matchingDegree}
                        onChange={(e) => {
                          const updated = [...correctionItems];
                          updated[idx].matchingDegree = e.target.value as any;
                          setCorrectionItems(updated);
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="مطابقة_تامة">🟢 مطابقة تامة مع الوثيقة</option>
                        <option value="تحتاج_مراجعة">🟠 تحتاج مراجعة وتدقيق</option>
                        <option value="لا_توجد_وثيقة_مؤيدة">🔴 لا توجد وثيقة مؤيدة</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isOmission}
                          onChange={(e) => {
                            const updated = [...correctionItems];
                            updated[idx].isOmission = e.target.checked;
                            setCorrectionItems(updated);
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>هذا العنصر هو استدراك لبيان أغفل بالأصل</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: مصادر التحقق والمطابقة والأنظمة التخصصية (Screens 6 to 15)  */}
      {/* ===================================================================== */}
      {activeStage === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-700" />
              <span>المرحلة 4: تدقيق مصادر التحقق وتفاصيل العقار والمالية والشهود</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فحص التخصصات الدقيقة للتصحيح العقاري والمالي وتطابق الأرقام مع الصياغة الحرفية
            </p>
          </div>

          {/* Real Estate Section (العقار، الحدود، المساحة، الإحداثيات) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <span className="block text-xs font-black text-blue-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>1. تصحيح المعالم العقارية والحدود والمساحة:</span>
            </span>

            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">طبيعة العقار</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="محفظ">محفظ برسم عقاري</option>
                  <option value="في_طور_التحفيظ">في طور التحفيظ (مطلب)</option>
                  <option value="غير_محفظ">غير محفظ (ملك أصيل)</option>
                  <option value="ملكية_مشتركة">ملكية مشتركة (شقة/بلوك)</option>
                  <option value="أرض_فلاحية">أرض فلاحية</option>
                  <option value="أرض_عارية">أرض عارية معدة للبناء</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الرسم العقاري / المطلب المصحح</label>
                <input
                  type="text"
                  value={propTitleCorrected}
                  onChange={(e) => setPropTitleCorrected(e.target.value)}
                  placeholder="رقم الرسم الصحيح..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الموقع والجماعة المصححة</label>
                <input
                  type="text"
                  value={propLocationCorrected}
                  onChange={(e) => setPropLocationCorrected(e.target.value)}
                  placeholder="الجماعة والعمالة الصحيحة..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>

            {/* Boundaries 4-directions (الحدود الأربعة) */}
            <div className="pt-2">
              <span className="block text-xs font-bold text-slate-700 mb-2">🧭 الحدود الأربعة (الوارد vs الصحيح):</span>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-blue-900 block">⬆️ شمالاً:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={northOrig}
                      onChange={(e) => setNorthOrig(e.target.value)}
                      placeholder="الوارد بالأصل..."
                      className="p-1.5 border rounded text-xs text-red-700 bg-red-50/20"
                    />
                    <input
                      type="text"
                      value={northCorr}
                      onChange={(e) => setNorthCorr(e.target.value)}
                      placeholder="الصحيح المعتمد..."
                      className="p-1.5 border rounded text-xs text-emerald-800 bg-emerald-50/30 font-bold"
                    />
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-blue-900 block">➡️ شرقاً:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={eastOrig}
                      onChange={(e) => setEastOrig(e.target.value)}
                      placeholder="الوارد بالأصل..."
                      className="p-1.5 border rounded text-xs text-red-700 bg-red-50/20"
                    />
                    <input
                      type="text"
                      value={eastCorr}
                      onChange={(e) => setEastCorr(e.target.value)}
                      placeholder="الصحيح المعتمد..."
                      className="p-1.5 border rounded text-xs text-emerald-800 bg-emerald-50/30 font-bold"
                    />
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-blue-900 block">⬇️ جنوباً:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={southOrig}
                      onChange={(e) => setSouthOrig(e.target.value)}
                      placeholder="الوارد بالأصل..."
                      className="p-1.5 border rounded text-xs text-red-700 bg-red-50/20"
                    />
                    <input
                      type="text"
                      value={southCorr}
                      onChange={(e) => setSouthCorr(e.target.value)}
                      placeholder="الصحيح المعتمد..."
                      className="p-1.5 border rounded text-xs text-emerald-800 bg-emerald-50/30 font-bold"
                    />
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-blue-900 block">⬅️ غرباً:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={westOrig}
                      onChange={(e) => setWestOrig(e.target.value)}
                      placeholder="الوارد بالأصل..."
                      className="p-1.5 border rounded text-xs text-red-700 bg-red-50/20"
                    />
                    <input
                      type="text"
                      value={westCorr}
                      onChange={(e) => setWestCorr(e.target.value)}
                      placeholder="الصحيح المعتمد..."
                      className="p-1.5 border rounded text-xs text-emerald-800 bg-emerald-50/30 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Area & Units calculation */}
            <div className="grid md:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200">
              <div>
                <label className="block text-slate-600 font-bold mb-1">المساحة الواردة بالأصل (م²)</label>
                <input
                  type="number"
                  value={areaOrigM2 || ''}
                  onChange={(e) => setAreaOrigM2(Number(e.target.value))}
                  placeholder="240"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-emerald-800">
                  المساحة الصحيحة (م²) *
                </label>
                <input
                  type="number"
                  value={areaCorrM2 || ''}
                  onChange={(e) => setAreaCorrM2(Number(e.target.value))}
                  placeholder="260"
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800"
                />
                {areaCorrM2 > 0 && (
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    تعادل: {Math.floor(areaCorrM2 / 10000)} هكتار و {Math.floor((areaCorrM2 % 10000) / 100)} آر و {areaCorrM2 % 100} سنتيار
                  </span>
                )}
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">سبب تصحيح المساحة</label>
                <select
                  value={areaReason}
                  onChange={(e) => setAreaReason(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="خطأ_في_النقل">خطأ مادي في النقل</option>
                  <option value="خطأ_حسابي">خطأ حسابي في الجمع</option>
                  <option value="إغفال_وحدة_القياس">إغفال وحدة القياس العقارية</option>
                  <option value="خطأ_في_الوثيقة_المرجعية">خطأ بالوثيقة المرجعية السابقة</option>
                  <option value="سبب_آخر">سبب موضوعي آخر</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Section (الثمن والمقابل والمطابقة) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <span className="block text-xs font-black text-blue-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-700" />
              <span>2. تدقيق الثمن والمقابل المالي والمطابقة مع الصياغة الحرفية:</span>
            </span>

            <div className="grid md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">الثمن الوارد بالرسم الأصلي (درهم)</label>
                <input
                  type="number"
                  value={priceOriginal || ''}
                  onChange={(e) => setPriceOriginal(Number(e.target.value))}
                  placeholder="200000"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-emerald-800">
                  الثمن الصحيح المعتمد (درهم) *
                </label>
                <input
                  type="number"
                  value={priceCorrected || ''}
                  onChange={(e) => setPriceCorrected(Number(e.target.value))}
                  placeholder="250000"
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">الصياغة بالحروف العربية (تلقائية)</label>
                <input
                  type="text"
                  value={priceWordsCustom || priceWordsCorrAuto}
                  onChange={(e) => setPriceWordsCustom(e.target.value)}
                  placeholder="مائتان وخمسون ألف درهم مغربي..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-blue-900"
                />
              </div>
            </div>

            {priceCorrected > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>مطابقة تامة بين الرقم والصياغة الحرفية: ({priceWordsCorrAuto}).</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: شبكة الارتباط والتكييف القانوني (ف 33 ق 16.03) (Screens 16 & 17) */}
      {/* ===================================================================== */}
      {activeStage === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-700" />
              <span>المرحلة 5: شبكة ارتباطات الرسم والتكييف القانوني (المادة 33 من قانون 16.03)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فحص أثر التعديل على باقي أجزاء الرسم الأصلي والتأكد من عدم المساس بجوهر التصرف
            </p>
          </div>

          {/* Connection Network Map */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl space-y-4 shadow-md">
            <span className="text-xs font-black text-amber-300 block flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>خريطة ارتباطات الرسم وشبكة فحص الاتساق الداخلي:</span>
            </span>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-amber-200 block mb-1">الأطراف والصفات:</span>
                <p className="text-[11px] text-slate-300">
                  {applicantFullName ? `طالب الإسمحة: ${applicantFullName}` : 'مسترجع من الرسم'}
                </p>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">متسق ✓</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-amber-200 block mb-1">العقار ومشتملاته:</span>
                <p className="text-[11px] text-slate-300">
                  {propTitleCorrected || propTitleOriginal || 'العقار موضوع الرسم'}
                </p>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">مضبوط الحدود ✓</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-amber-200 block mb-1">المقابل المالي:</span>
                <p className="text-[11px] text-slate-300">
                  {priceCorrected > 0 ? `${priceCorrected.toLocaleString('ar-MA')} درهم` : 'حسب أصل الرسم'}
                </p>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">مطابق كتابة ورتماً ✓</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-amber-200 block mb-1">التضمين والمراجع:</span>
                <p className="text-[11px] text-slate-300">سجل {recordLetter || 'ب'} / صحيفة {pageNumber || '...'}</p>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">ربط بطرة الرسم ✓</span>
              </div>
            </div>
          </div>

          {/* Substantive Nature Picker */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-800">
              ⚖️ التكييف القانوني لطبيعة التصحيح (المادة 33 من قانون خطة العدالة رقم 16.03):
            </label>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setSubstantiveNature('تصحيح_بيان_مادي_بياني')}
                className={`p-3.5 rounded-xl border text-right font-bold transition ${
                  substantiveNature === 'تصحيح_بيان_مادي_بياني'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="block mb-1">🔵 تصحيح بيان مادي / بياني</span>
                <p className="text-[11px] font-normal opacity-90">
                  تصحيح خطأ إملائي أو رقمي صريح دون أي مساس بموضوع الحق أو شروط العقد.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSubstantiveNature('استكمال_بيان_أغفل')}
                className={`p-3.5 rounded-xl border text-right font-bold transition ${
                  substantiveNature === 'استكمال_بيان_أغفل'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="block mb-1">🟠 استكمال بيان أغفل</span>
                <p className="text-[11px] font-normal opacity-90">
                  استدراك بيان ثانوي سكت عنه الرسم الأصلي وثبت بالوثائق الرسمية.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSubstantiveNature('تصحيح_قد_يؤثر_في_مضمون_التصرف')}
                className={`p-3.5 rounded-xl border text-right font-bold transition ${
                  substantiveNature === 'تصحيح_قد_يؤثر_في_مضمون_التصرف'
                    ? 'bg-red-700 text-white border-red-700 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="block mb-1">🔴 تصحيح مؤثر في مضمون التصرف</span>
                <p className="text-[11px] font-normal opacity-90">
                  قد يتطلب حضور سائر أطراف العقد وموافقتهم الصريحة وتوقيعهم العدلي مجدداً.
                </p>
              </button>
            </div>
          </div>

          {/* Legal notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات وتعليلات العدل التوثيقية حول سبب الإسمحة:
            </label>
            <textarea
              value={legalNotes}
              onChange={(e) => setLegalNotes(e.target.value)}
              placeholder="بيان موجبات الإصلاح والوثائق الرسمية التي بني عليها..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 6: شاشة المقارنة واختبار ما قبل التوقيع (15 فحصاً) (Screens 19 & 22) */}
      {/* ===================================================================== */}
      {activeStage === 6 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <span>المرحلة 6: المقارنة قبل الاعتماد واختبار ما قبل التوقيع (15 فحصاً آلياً)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                جدول المقارنة الحصري بين الوارد بالأصل والصحيح المقترح، وفحص الحواجز المانعة
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                allBlockingPassed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {allBlockingPassed ? '🟢 الرسم مستوفٍ لجميع الفحوصات' : '🔴 توجد موانع تتطلب المعالجة'}
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">العنصر محل التصحيح</th>
                  <th className="p-3 text-red-700">🔴 الوارد في أصل الرسم</th>
                  <th className="p-3 text-emerald-800">🟢 الصحيح المعتمد</th>
                  <th className="p-3">مستند الإثبات</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium">
                {correctionItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {item.fieldLabel} ({item.targetRole})
                    </td>
                    <td className="p-3 text-red-700 bg-red-50/20 font-bold">
                      {item.originalValue || 'مسكوت عنه'}
                    </td>
                    <td className="p-3 text-emerald-800 bg-emerald-50/20 font-bold">
                      {item.correctedValue || '...'}
                    </td>
                    <td className="p-3 text-slate-600">{item.verificationSource.replace(/_/g, ' ')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {item.matchingDegree.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 15 Automated Validation Rules Checklist */}
          <div className="space-y-3 pt-2">
            <span className="block text-xs font-black text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>نتائج الفحص الآلي المانع للتناقض والخطأ (15 اختباراً):</span>
            </span>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {preSigningRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                    rule.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : rule.severity === 'blocking'
                      ? 'bg-red-50/60 border-red-200 text-red-950 font-bold'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {rule.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : rule.severity === 'blocking' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                      <span>{rule.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{rule.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 7: المعاينة النهائية والاعتماد القضائي (الانتقال لـ Step 7)       */}
      {/* ===================================================================== */}
      {activeStage === 7 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <span>المرحلة 7: المعاينة العدلية النهائية والاعتماد وتوجيه الملحق للقاضي</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد صيغة الإسمحة النموذجية والربط بالخطوة السابعة (Step 7) للإرسال للقاضي المكلف بالتوثيق
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الصياغة</span>
              </button>
              <button
                type="button"
                onClick={handlePrintDraft}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المعاينة</span>
              </button>
            </div>
          </div>

          {/* Legal Draft Container */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300 font-serif text-sm leading-loose whitespace-pre-wrap text-slate-900 shadow-inner select-text">
            {generateAuthoritativeDraft}
          </div>

          {/* Mandatory Step 7 Transition Block */}
          <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="font-black text-sm block flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>المرحلة الموالية: التحقق النهائي والاعتماد وتوجيه الرسم للقاضي المكلف بالتوثيق</span>
              </span>
              <p className="text-xs text-slate-300">
                الانتقال المباشر إلى الخطوة السابعة (Step 7) لتوليد وتدقيق الوثيقة في المحرر التفاعلي واختيار القاضي عبر JudgePickerModal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleProceedToStep7}
              disabled={!allBlockingPassed}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition transform ${
                allBlockingPassed
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-950/40 cursor-pointer hover:scale-[1.02]'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>المتابعة للمرحلة 7 (المراجعة القضائية والإرسال للقاضي)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Smart Assistant Bar (مساعد التصحيح الذكي في أسفل الشاشة)               */}
      {/* ===================================================================== */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-950 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
            🤖
          </div>
          <div>
            <span className="font-bold block">مساعد التصحيح العدلي الذكي:</span>
            <span className="text-[11px] text-slate-600">{smartAssistantTip}</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
            تحديث مباشر
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* Navigation Buttons (Back & Next)                                      */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (activeStage > 1) setActiveStage((prev) => prev - 1);
            else if (onBack) onBack();
          }}
          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{activeStage > 1 ? 'المرحلة السابقة' : 'الرجوع لاختيار الوثيقة'}</span>
        </button>

        {activeStage < 7 && (
          <button
            type="button"
            onClick={() => setActiveStage((prev) => prev + 1)}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <span>المرحلة الموالية</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
