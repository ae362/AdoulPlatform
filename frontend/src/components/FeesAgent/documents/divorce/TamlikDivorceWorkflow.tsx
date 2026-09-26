import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Heart,
  Scale,
  Sparkles,
  Users,
  Baby,
  Home,
  Coins,
  Lock,
  Eye,
  Info
} from 'lucide-react';
import type {
  FeesAgentState,
  TamlikDivorceWorkflowData,
  TamlikConditionCheck,
  RevocableChildData
} from '../../../../types/feesAgentTypes';
import { convertNumberToArabicWords } from '../../../../utils/feesAgentUtils';

interface TamlikDivorceWorkflowProps {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete: () => void;
  onBackToClassification: () => void;
}

export const TamlikDivorceWorkflow: React.FC<TamlikDivorceWorkflowProps> = ({
  state,
  setState,
  onComplete,
  onBackToClassification
}) => {
  const existingWorkflow = state.divorceClassification?.tamlikWorkflow;
  const classification = state.divorceClassification;
  const defaultHusband = state.sellers?.[0];
  const defaultWife = state.buyers?.[0];

  // Stage pointer (1 to 19)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // -------------------------------------------------------------
  // Stage 01: الإذن القضائي بالإشهاد على الطلاق المملك
  // -------------------------------------------------------------
  const [hasJudicialPermission, setHasJudicialPermission] = useState<boolean>(
    existingWorkflow?.hasJudicialPermission ?? true
  );
  const [court, setCourt] = useState<string>(
    existingWorkflow?.court || 'المحكمة الابتدائية بطنجة'
  );
  const [section, setSection] = useState<string>(
    existingWorkflow?.section || 'قسم قضاء الأسرة'
  );
  const [fileNumber, setFileNumber] = useState<string>(
    existingWorkflow?.fileNumber || '2026/1602/412'
  );
  const [permissionNumber, setPermissionNumber] = useState<string>(
    existingWorkflow?.permissionNumber || '789/2026'
  );
  const [permissionDate, setPermissionDate] = useState<string>(
    existingWorkflow?.permissionDate || '2026-05-18'
  );
  const [receptionDate, setReceptionDate] = useState<string>(
    existingWorkflow?.receptionDate || '2026-05-24'
  );
  const [adoulNotes, setAdoulNotes] = useState<string>('');

  // -------------------------------------------------------------
  // Stage 02: صاحبة حق التمليك
  // -------------------------------------------------------------
  // الزوجة هي صاحبة الحق حتماً في هذا البيت
  const initiator: 'wife' = 'wife';

  // -------------------------------------------------------------
  // Stage 03: بيانات الزوجة المملَّكة (صاحبة الحق)
  // -------------------------------------------------------------
  const [wifeFirstNameAr, setWifeFirstNameAr] = useState<string>(
    existingWorkflow?.wife?.firstNameAr || defaultWife?.name?.split(' ')[0] || 'فاطمة الزهراء'
  );
  const [wifeLastNameAr, setWifeLastNameAr] = useState<string>(
    existingWorkflow?.wife?.lastNameAr || defaultWife?.name?.split(' ').slice(1).join(' ') || 'المنصوري'
  );
  const [wifeFirstNameFr, setWifeFirstNameFr] = useState<string>(
    existingWorkflow?.wife?.firstNameFr || 'FATIMA ZAHRA'
  );
  const [wifeLastNameFr, setWifeLastNameFr] = useState<string>(
    existingWorkflow?.wife?.lastNameFr || 'MANSOURI'
  );
  const [wifeNationality, setWifeNationality] = useState<string>(
    existingWorkflow?.wife?.nationality || 'مغربية'
  );
  const [wifeBirthDate, setWifeBirthDate] = useState<string>(
    existingWorkflow?.wife?.birthDate || '1993-06-15'
  );
  const [wifeBirthPlace, setWifeBirthPlace] = useState<string>(
    existingWorkflow?.wife?.birthPlace || 'طنجة'
  );
  const [wifeFatherName, setWifeFatherName] = useState<string>(
    existingWorkflow?.wife?.fatherName || defaultWife?.fatherName || 'عبد السلام'
  );
  const [wifeMotherName, setWifeMotherName] = useState<string>(
    existingWorkflow?.wife?.motherName || 'زينب'
  );
  const [wifeIdType, setWifeIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWorkflow?.wife?.idType || 'cin'
  );
  const [wifeIdNumber, setWifeIdNumber] = useState<string>(
    existingWorkflow?.wife?.idNumber || defaultWife?.idNumber || 'K489123'
  );
  const [wifeIdExpiryDate, setWifeIdExpiryDate] = useState<string>(
    existingWorkflow?.wife?.idExpiryDate || '2032-08-20'
  );
  const [wifeProfession, setWifeProfession] = useState<string>(
    existingWorkflow?.wife?.profession || 'مهندسة معمارية'
  );
  const [wifeAddress, setWifeAddress] = useState<string>(
    existingWorkflow?.wife?.address || defaultWife?.address || 'شارع مولاي عبد العزيز، إقامة الياسمين، رقم 8'
  );
  const [wifeCity, setWifeCity] = useState<string>(
    existingWorkflow?.wife?.city || 'طنجة'
  );
  const [wifeCountry, setWifeCountry] = useState<string>(
    existingWorkflow?.wife?.country || 'المملكة المغربية'
  );

  const handleImportWifeFromState = () => {
    if (state.buyers?.[0]?.name) {
      const parts = state.buyers[0].name.split(' ');
      setWifeFirstNameAr(parts[0] || 'فاطمة الزهراء');
      setWifeLastNameAr(parts.slice(1).join(' ') || 'المنصوري');
    }
    if (state.buyers?.[0]?.idNumber) {
      setWifeIdNumber(state.buyers[0].idNumber);
    }
    if (state.buyers?.[0]?.address) {
      setWifeAddress(state.buyers[0].address);
    }
    if (state.buyers?.[0]?.fatherName) {
      setWifeFatherName(state.buyers[0].fatherName);
    }
  };

  // -------------------------------------------------------------
  // Stage 04: بيانات الزوج المالك لحق التمليك
  // -------------------------------------------------------------
  const [husbandFirstNameAr, setHusbandFirstNameAr] = useState<string>(
    existingWorkflow?.husband?.firstNameAr || defaultHusband?.name?.split(' ')[0] || 'كريم'
  );
  const [husbandLastNameAr, setHusbandLastNameAr] = useState<string>(
    existingWorkflow?.husband?.lastNameAr || defaultHusband?.name?.split(' ').slice(1).join(' ') || 'اليعقوبي'
  );
  const [husbandFirstNameFr, setHusbandFirstNameFr] = useState<string>(
    existingWorkflow?.husband?.firstNameFr || 'KARIM'
  );
  const [husbandLastNameFr, setHusbandLastNameFr] = useState<string>(
    existingWorkflow?.husband?.lastNameFr || 'YAÂCOUBI'
  );
  const [husbandNationality, setHusbandNationality] = useState<string>(
    existingWorkflow?.husband?.nationality || 'مغربي'
  );
  const [husbandBirthDate, setHusbandBirthDate] = useState<string>(
    existingWorkflow?.husband?.birthDate || '1989-11-20'
  );
  const [husbandBirthPlace, setHusbandBirthPlace] = useState<string>(
    existingWorkflow?.husband?.birthPlace || 'تطوان'
  );
  const [husbandFatherName, setHusbandFatherName] = useState<string>(
    existingWorkflow?.husband?.fatherName || defaultHusband?.fatherName || 'عمر'
  );
  const [husbandMotherName, setHusbandMotherName] = useState<string>(
    existingWorkflow?.husband?.motherName || 'راضية'
  );
  const [husbandIdType, setHusbandIdType] = useState<'cin' | 'passport' | 'other'>(
    existingWorkflow?.husband?.idType || 'cin'
  );
  const [husbandIdNumber, setHusbandIdNumber] = useState<string>(
    existingWorkflow?.husband?.idNumber || defaultHusband?.idNumber || 'L654321'
  );
  const [husbandIdExpiryDate, setHusbandIdExpiryDate] = useState<string>(
    existingWorkflow?.husband?.idExpiryDate || '2030-05-14'
  );
  const [husbandProfession, setHusbandProfession] = useState<string>(
    existingWorkflow?.husband?.profession || 'مدير تجاري'
  );
  const [husbandAddress, setHusbandAddress] = useState<string>(
    existingWorkflow?.husband?.address || defaultHusband?.address || 'شارع الجيش الملكي، عمارة الأندلس، رقم 15'
  );
  const [husbandCity, setHusbandCity] = useState<string>(
    existingWorkflow?.husband?.city || 'طنجة'
  );
  const [husbandCountry, setHusbandCountry] = useState<string>(
    existingWorkflow?.husband?.country || 'المملكة المغربية'
  );
  const [husbandPresenceStatus, setHusbandPresenceStatus] = useState<'present' | 'absent'>(
    existingWorkflow?.husband?.presenceStatus || 'absent'
  );

  // -------------------------------------------------------------
  // Stage 05: مرجع عقد الزواج
  // -------------------------------------------------------------
  const [marriageDeedType, setMarriageDeedType] = useState<string>(
    existingWorkflow?.marriageRef?.deedType || 'رسم زواج شرعي'
  );
  const [marriageBookType, setMarriageBookType] = useState<string>(
    existingWorkflow?.marriageRef?.bookType || 'سجل أنكحة'
  );
  const [marriageBookNumber, setMarriageBookNumber] = useState<string>(
    existingWorkflow?.marriageRef?.bookNumber || '16'
  );
  const [marriageBookLetter, setMarriageBookLetter] = useState<string>(
    existingWorkflow?.marriageRef?.bookLetter || 'ب'
  );
  const [marriagePageNumber, setMarriagePageNumber] = useState<string>(
    existingWorkflow?.marriageRef?.pageNumber || '104'
  );
  const [marriageDeedNumber, setMarriageDeedNumber] = useState<string>(
    existingWorkflow?.marriageRef?.deedNumber || '312'
  );
  const [marriageDeedDate, setMarriageDeedDate] = useState<string>(
    existingWorkflow?.marriageRef?.deedDate || '2020-03-12'
  );
  const [marriageIssuingCourt, setMarriageIssuingCourt] = useState<string>(
    existingWorkflow?.marriageRef?.issuingCourt || 'المحكمة الابتدائية بطنجة قسم قضاء الأسرة'
  );

  // -------------------------------------------------------------
  // Stage 06: رسم الشرط / سند التمليك
  // -------------------------------------------------------------
  const [tamlikSource, setTamlikSource] = useState<'marriage_deed' | 'independent_deed' | 'case_file_document'>(
    existingWorkflow?.tamlikSource || 'marriage_deed'
  );
  const [indDeedType, setIndDeedType] = useState<string>(
    existingWorkflow?.independentDeedRef?.deedType || 'رسم شرط تمليك طلاق'
  );
  const [indBookNumber, setIndBookNumber] = useState<string>(
    existingWorkflow?.independentDeedRef?.bookNumber || '04'
  );
  const [indBookLetter, setIndBookLetter] = useState<string>(
    existingWorkflow?.independentDeedRef?.bookLetter || 'ش'
  );
  const [indPageNumber, setIndPageNumber] = useState<string>(
    existingWorkflow?.independentDeedRef?.pageNumber || '58'
  );
  const [indDeedNumber, setIndDeedNumber] = useState<string>(
    existingWorkflow?.independentDeedRef?.deedNumber || '145'
  );
  const [indDeedDate, setIndDeedDate] = useState<string>(
    existingWorkflow?.independentDeedRef?.deedDate || '2020-05-10'
  );
  const [indCourtName, setIndCourtName] = useState<string>(
    existingWorkflow?.independentDeedRef?.courtName || 'المحكمة الابتدائية بطنجة'
  );

  // -------------------------------------------------------------
  // Stage 07: مضمون شرط التمليك
  // -------------------------------------------------------------
  const [explicitTamlikGranted, setExplicitTamlikGranted] = useState<boolean>(
    existingWorkflow?.explicitTamlikGranted ?? true
  );
  const [hasSpecialConditions, setHasSpecialConditions] = useState<boolean>(
    existingWorkflow?.hasSpecialConditions ?? true
  );
  const [conditionsList, setConditionsList] = useState<TamlikConditionCheck[]>(
    existingWorkflow?.conditionsList || [
      {
        id: 'cond-1',
        conditionText: 'شرط عدم التزوج عليها بزوجة ثانية إلا بإذنها ورضاها الصريح',
        status: 'fulfilled'
      },
      {
        id: 'cond-2',
        conditionText: 'شرط استمرار تمكينها من ممارسة عملها الوظيفي وحق السكنى المستقلة',
        status: 'fulfilled'
      }
    ]
  );
  const [newConditionInput, setNewConditionInput] = useState<string>('');

  const handleAddCondition = () => {
    if (!newConditionInput.trim()) return;
    const item: TamlikConditionCheck = {
      id: `cond-${Date.now()}`,
      conditionText: newConditionInput.trim(),
      status: 'fulfilled'
    };
    setConditionsList((prev) => [...prev, item]);
    setNewConditionInput('');
  };

  const handleRemoveCondition = (id: string) => {
    setConditionsList((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConditionStatusChange = (
    id: string,
    status: 'fulfilled' | 'unfulfilled' | 'needs_review'
  ) => {
    setConditionsList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  // -------------------------------------------------------------
  // Stage 08: نطاق حق التمليك (مطلق أم مقيد؟)
  // -------------------------------------------------------------
  const [tamlikScope, setTamlikScope] = useState<'unconditional' | 'conditional'>(
    existingWorkflow?.tamlikScope || 'conditional'
  );

  const hasUnfulfilledCondition = useMemo(() => {
    if (tamlikScope === 'unconditional') return false;
    return conditionsList.some((c) => c.status === 'unfulfilled');
  }, [tamlikScope, conditionsList]);

  // -------------------------------------------------------------
  // Stage 09: التحقق من الإذن + سند التمليك
  // -------------------------------------------------------------
  const basisCheckStatus = useMemo(() => {
    return {
      permission: hasJudicialPermission && permissionNumber.trim().length > 0,
      marriageDeed: marriageDeedNumber.trim().length > 0,
      tamlikDeed: explicitTamlikGranted,
      conditions: !hasUnfulfilledCondition,
      wifeIdentity: wifeFirstNameAr.trim().length > 0 && wifeIdNumber.trim().length > 0
    };
  }, [
    hasJudicialPermission,
    permissionNumber,
    marriageDeedNumber,
    explicitTamlikGranted,
    hasUnfulfilledCondition,
    wifeFirstNameAr,
    wifeIdNumber
  ]);

  // -------------------------------------------------------------
  // Stage 10: عدد الطلاق وترتيبه
  // -------------------------------------------------------------
  const [divorceCount, setDivorceCount] = useState<'first' | 'second' | 'third'>(
    existingWorkflow?.divorceCount || 'second'
  );

  // -------------------------------------------------------------
  // Stage 11: حالة البناء
  // -------------------------------------------------------------
  const [consummationHappened, setConsummationHappened] = useState<boolean>(
    existingWorkflow?.consummationHappened ?? true
  );

  // -------------------------------------------------------------
  // Stage 12: تصريح الزوجة بإعمال حق التمليك
  // -------------------------------------------------------------
  const [wifeExercisedTamlik, setWifeExercisedTamlik] = useState<boolean>(
    existingWorkflow?.wifeExercisedTamlik ?? true
  );
  const defaultWifeStatement =
    'أشهد أنني، بناءً على حق التمليك الثابت لي بمقتضى السند المشار إليه أعلاه، أوقع الطلاق على نفسي من زوجي، وأطلق نفسي منه الطلقة المملَّكة لي، وذلك وفق الشروط الثابتة في سند التمليك والإذن القضائي.';
  const [wifeStatementText, setWifeStatementText] = useState<string>(
    existingWorkflow?.wifeStatementText || defaultWifeStatement
  );

  // -------------------------------------------------------------
  // Stage 13: غياب الزوج أو حضوره أثناء الإشهاد
  // -------------------------------------------------------------
  const [husbandPresentDuringAct, setHusbandPresentDuringAct] = useState<boolean>(
    existingWorkflow?.husbandPresentDuringAct ?? false
  );

  // -------------------------------------------------------------
  // Stage 14: تصريح الزوجة بشأن الحمل
  // -------------------------------------------------------------
  const [pregnancyStatus, setPregnancyStatus] = useState<'no' | 'yes' | 'uncertain'>(
    existingWorkflow?.pregnancyStatus || 'no'
  );

  // -------------------------------------------------------------
  // Stage 15: المستحقات (المادة 89 والمادتان 84 و85)
  // -------------------------------------------------------------
  const [deferredDowry, setDeferredDowry] = useState<number>(
    existingWorkflow?.dues?.deferredDowry ?? 0
  );
  const [iddahMaintenance, setIddahMaintenance] = useState<number>(
    existingWorkflow?.dues?.iddahMaintenance ?? 8000
  );
  const [mutah, setMutah] = useState<number>(
    existingWorkflow?.dues?.mutah ?? 25000
  );
  const [housingDuringIddah, setHousingDuringIddah] = useState<number>(
    existingWorkflow?.dues?.housingDuringIddah ?? 6000
  );
  const [childrenDues, setChildrenDues] = useState<number>(
    existingWorkflow?.dues?.childrenDues ?? 7000
  );

  const duesTotal = useMemo(() => {
    return (
      (deferredDowry || 0) +
      (iddahMaintenance || 0) +
      (mutah || 0) +
      (housingDuringIddah || 0) +
      (childrenDues || 0)
    );
  }, [deferredDowry, iddahMaintenance, mutah, housingDuringIddah, childrenDues]);

  const duesTotalInWords = useMemo(() => {
    return convertNumberToArabicWords(duesTotal, ' درهماً مغربياً');
  }, [duesTotal]);

  // -------------------------------------------------------------
  // Stage 16: الأبناء
  // -------------------------------------------------------------
  const [hasChildren, setHasChildren] = useState<boolean>(
    existingWorkflow?.hasChildren ?? true
  );
  const [totalChildrenCount, setTotalChildrenCount] = useState<number>(
    existingWorkflow?.totalChildrenCount ?? 1
  );
  const [boysCount, setBoysCount] = useState<number>(
    existingWorkflow?.boysCount ?? 1
  );
  const [girlsCount, setGirlsCount] = useState<number>(
    existingWorkflow?.girlsCount ?? 0
  );
  const [childrenList, setChildrenList] = useState<RevocableChildData[]>(
    existingWorkflow?.childrenList || [
      {
        id: 'child-1',
        fullName: 'إلياس اليعقوبي',
        firstName: 'إلياس',
        lastName: 'اليعقوبي',
        gender: 'ذكر',
        birthDate: '2021-08-10',
        birthPlace: 'طنجة',
        healthStatus: 'سليم وبصحة جيدة',
        educationStatus: 'التعليم الأولي'
      }
    ]
  );

  const isChildrenCountMatching = useMemo(() => {
    if (!hasChildren) return true;
    return boysCount + girlsCount === totalChildrenCount;
  }, [hasChildren, boysCount, girlsCount, totalChildrenCount]);

  const handleAddChild = () => {
    const nextIdx = childrenList.length + 1;
    const newChild: RevocableChildData = {
      id: `child-${Date.now()}`,
      fullName: `ابن/ابنة ${nextIdx}`,
      firstName: '',
      lastName: husbandLastNameAr || 'اليعقوبي',
      gender: 'ذكر',
      birthDate: '2022-01-01',
      birthPlace: wifeCity || 'طنجة',
      healthStatus: 'سليم معافى',
      educationStatus: 'متمدرس'
    };
    setChildrenList((prev) => [...prev, newChild]);
    setTotalChildrenCount((prev) => prev + 1);
    setBoysCount((prev) => prev + 1);
  };

  const handleRemoveChild = (id: string) => {
    setChildrenList((prev) => prev.filter((c) => c.id !== id));
    setTotalChildrenCount((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateChild = (id: string, field: keyof RevocableChildData, value: any) => {
    setChildrenList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // -------------------------------------------------------------
  // Stage 17: الحضانة والسكن والنفقة
  // -------------------------------------------------------------
  const [custodyParty, setCustodyParty] = useState<string>(
    existingWorkflow?.custodyParty || 'الأم (الزوجة المملَّكة)'
  );
  const [custodyResidence, setCustodyResidence] = useState<string>(
    existingWorkflow?.custodyResidence || wifeAddress || 'شارع مولاي عبد العزيز، إقامة الياسمين، رقم 8، طنجة'
  );
  const [hasCourtOrderedChildDues, setHasCourtOrderedChildDues] = useState<boolean>(
    existingWorkflow?.hasCourtOrderedChildDues ?? true
  );
  const [childDuesAmount, setChildDuesAmount] = useState<number>(
    existingWorkflow?.childDuesDetails?.amount || 2500
  );
  const [childDuesPeriod, setChildDuesPeriod] = useState<string>(
    existingWorkflow?.childDuesDetails?.period || 'شهرياً'
  );
  const [childDuesPaymentMethod, setChildDuesPaymentMethod] = useState<string>(
    existingWorkflow?.childDuesDetails?.paymentMethod || 'تحويل بنكي في بداية كل شهر'
  );

  // -------------------------------------------------------------
  // Stage 18: الحراس القانونيون التسعة
  // -------------------------------------------------------------
  const [guardTamlikRightProven, setGuardTamlikRightProven] = useState<boolean>(true);
  const [guardConditionsFulfilled, setGuardConditionsFulfilled] = useState<boolean>(true);
  const [guardPermissionIssued, setGuardPermissionIssued] = useState<boolean>(true);
  const [guardWifeIsAuthorizedHolder, setGuardWifeIsAuthorizedHolder] = useState<boolean>(true);
  const [guardExerciseDeclared, setGuardExerciseDeclared] = useState<boolean>(true);
  const [guardDivorceOrderRecorded, setGuardDivorceOrderRecorded] = useState<boolean>(true);
  const [guardConsummationRecorded, setGuardConsummationRecorded] = useState<boolean>(true);
  const [guardPregnancyRecorded, setGuardPregnancyRecorded] = useState<boolean>(true);
  const [guardDuesRecorded, setGuardDuesRecorded] = useState<boolean>(true);

  // الحارس الخاص بالمادة 89: منع تراجع الزوج
  const [husbandRevocationAttempted, setHusbandRevocationAttempted] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Package Data Function
  // -------------------------------------------------------------
  const packageWorkflowData = (): TamlikDivorceWorkflowData => {
    return {
      hasJudicialPermission,
      court,
      section,
      fileNumber,
      permissionNumber,
      permissionDate,
      receptionDate,
      initiator: 'wife',
      wife: {
        firstNameAr: wifeFirstNameAr,
        lastNameAr: wifeLastNameAr,
        firstNameFr: wifeFirstNameFr,
        lastNameFr: wifeLastNameFr,
        nationality: wifeNationality,
        birthDate: wifeBirthDate,
        birthPlace: wifeBirthPlace,
        fatherName: wifeFatherName,
        motherName: wifeMotherName,
        idType: wifeIdType,
        idNumber: wifeIdNumber,
        idExpiryDate: wifeIdExpiryDate,
        profession: wifeProfession,
        address: wifeAddress,
        city: wifeCity,
        country: wifeCountry
      },
      husband: {
        firstNameAr: husbandFirstNameAr,
        lastNameAr: husbandLastNameAr,
        firstNameFr: husbandFirstNameFr,
        lastNameFr: husbandLastNameFr,
        nationality: husbandNationality,
        birthDate: husbandBirthDate,
        birthPlace: husbandBirthPlace,
        fatherName: husbandFatherName,
        motherName: husbandMotherName,
        idType: husbandIdType,
        idNumber: husbandIdNumber,
        idExpiryDate: husbandIdExpiryDate,
        profession: husbandProfession,
        address: husbandAddress,
        city: husbandCity,
        country: husbandCountry,
        presenceStatus: husbandPresenceStatus
      },
      marriageRef: {
        deedType: marriageDeedType,
        bookType: marriageBookType,
        bookNumber: marriageBookNumber,
        bookLetter: marriageBookLetter,
        pageNumber: marriagePageNumber,
        deedNumber: marriageDeedNumber,
        deedDate: marriageDeedDate,
        issuingCourt: marriageIssuingCourt
      },
      tamlikSource,
      independentDeedRef:
        tamlikSource === 'independent_deed'
          ? {
              deedType: indDeedType,
              bookNumber: indBookNumber,
              bookLetter: indBookLetter,
              pageNumber: indPageNumber,
              deedNumber: indDeedNumber,
              deedDate: indDeedDate,
              courtName: indCourtName
            }
          : undefined,
      explicitTamlikGranted,
      hasSpecialConditions,
      conditionsList,
      tamlikScope,
      basisVerified: true,
      divorceCount,
      consummationHappened,
      wifeExercisedTamlik,
      wifeStatementText,
      husbandPresentDuringAct,
      pregnancyStatus,
      dues: {
        deferredDowry,
        iddahMaintenance,
        mutah,
        housingDuringIddah,
        childrenDues,
        totalAmount: duesTotal,
        totalAmountInWords: duesTotalInWords
      },
      hasChildren,
      totalChildrenCount,
      boysCount,
      girlsCount,
      childrenList,
      custodyParty,
      custodyResidence,
      hasCourtOrderedChildDues,
      childDuesDetails: hasCourtOrderedChildDues
        ? {
            amount: childDuesAmount,
            period: childDuesPeriod,
            paymentMethod: childDuesPaymentMethod
          }
        : undefined,
      legalGuardVerification: {
        tamlikRightProven: guardTamlikRightProven,
        conditionsFulfilled: guardConditionsFulfilled,
        judicialPermissionIssued: guardPermissionIssued,
        wifeIsAuthorizedHolder: guardWifeIsAuthorizedHolder,
        exerciseDeclared: guardExerciseDeclared,
        divorceOrderRecorded: guardDivorceOrderRecorded,
        consummationRecorded: guardConsummationRecorded,
        pregnancyRecorded: guardPregnancyRecorded,
        duesRecorded: guardDuesRecorded
      },
      husbandRevocationAttempted,
      isRepresentationOrAgency: false,
      completedAt: new Date().toISOString()
    };
  };

  // -------------------------------------------------------------
  // Validation Rules
  // -------------------------------------------------------------
  const isCurrentStageValid = useMemo(() => {
    switch (currentStage) {
      case 1:
        return hasJudicialPermission && permissionNumber.trim().length > 0;
      case 2:
        return true;
      case 3:
        return wifeFirstNameAr.trim().length > 0 && wifeIdNumber.trim().length > 0;
      case 4:
        return husbandFirstNameAr.trim().length > 0 && husbandIdNumber.trim().length > 0;
      case 5:
        return marriageDeedNumber.trim().length > 0;
      case 6:
        return tamlikSource === 'marriage_deed' || (tamlikSource === 'independent_deed' && indDeedNumber.trim().length > 0) || true;
      case 7:
        return explicitTamlikGranted;
      case 8:
        return !hasUnfulfilledCondition;
      case 9:
        return basisCheckStatus.permission && basisCheckStatus.marriageDeed && basisCheckStatus.tamlikDeed;
      case 10:
        return true;
      case 11:
        return true;
      case 12:
        return wifeExercisedTamlik && wifeStatementText.trim().length > 0;
      case 13:
        return true;
      case 14:
        return true;
      case 15:
        return true;
      case 16:
        return !hasChildren || isChildrenCountMatching;
      case 17:
        return true;
      case 18:
        return (
          guardTamlikRightProven &&
          guardConditionsFulfilled &&
          guardPermissionIssued &&
          guardWifeIsAuthorizedHolder &&
          guardExerciseDeclared &&
          !husbandRevocationAttempted
        );
      case 19:
        return true;
      default:
        return true;
    }
  }, [
    currentStage,
    hasJudicialPermission,
    permissionNumber,
    wifeFirstNameAr,
    wifeIdNumber,
    husbandFirstNameAr,
    husbandIdNumber,
    marriageDeedNumber,
    tamlikSource,
    indDeedNumber,
    explicitTamlikGranted,
    hasUnfulfilledCondition,
    basisCheckStatus,
    wifeExercisedTamlik,
    wifeStatementText,
    hasChildren,
    isChildrenCountMatching,
    guardTamlikRightProven,
    guardConditionsFulfilled,
    guardPermissionIssued,
    guardWifeIsAuthorizedHolder,
    guardExerciseDeclared,
    husbandRevocationAttempted
  ]);

  const handleNextStage = () => {
    if (currentStage === 16 && !hasChildren) {
      setCurrentStage(18); // Skip custody and child maintenance if no children
      return;
    }
    if (currentStage < 19) {
      setCurrentStage((prev) => prev + 1);
    }
  };

  const handlePrevStage = () => {
    if (currentStage === 18 && !hasChildren) {
      setCurrentStage(16);
      return;
    }
    if (currentStage > 1) {
      setCurrentStage((prev) => prev - 1);
    }
  };

  // -------------------------------------------------------------
  // Final Transition to Step 7 (Smart Drafting & Judicial Review)
  // -------------------------------------------------------------
  const handleFinalProceedToDraft = () => {
    const packaged = packageWorkflowData();
    setState((prev) => ({
      ...prev,
      divorceClassification: {
        ...(prev.divorceClassification || {
          primaryType: 'tamlik',
          statisticalCode: 'D-05'
        }),
        primaryType: 'tamlik',
        statisticalCode: 'D-05',
        divorceCount: divorceCount === 'third' ? 'other' : divorceCount,
        wifePresence: 'present',
        tamlikBasis: {
          sourceType: tamlikSource === 'marriage_deed' ? 'marriage_deed' : 'voluntary_deed',
          deedNumber: tamlikSource === 'marriage_deed' ? marriageDeedNumber : indDeedNumber,
          letter: tamlikSource === 'marriage_deed' ? marriageBookLetter : indBookLetter,
          page: tamlikSource === 'marriage_deed' ? marriagePageNumber : indPageNumber,
          count: '1',
          deedDate: tamlikSource === 'marriage_deed' ? marriageDeedDate : indDeedDate,
          courtName: tamlikSource === 'marriage_deed' ? marriageIssuingCourt : indCourtName,
          isLinked: true
        },
        tamlikWorkflow: packaged
      },
      sellers: [
        {
          ...(prev.sellers?.[0] || {}),
          name: `${husbandFirstNameAr} ${husbandLastNameAr}`,
          idNumber: husbandIdNumber,
          address: husbandAddress,
          fatherName: husbandFatherName,
          motherName: husbandMotherName,
          profession: husbandProfession
        } as any
      ],
      buyers: [
        {
          ...(prev.buyers?.[0] || {}),
          name: `${wifeFirstNameAr} ${wifeLastNameAr}`,
          idNumber: wifeIdNumber,
          address: wifeAddress,
          fatherName: wifeFatherName,
          motherName: wifeMotherName,
          profession: wifeProfession
        } as any
      ],
      draft: `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.
بالمحكمة الابتدائية بـ ${court} - ${section}.
لدى العدلين الموقعين أسفله بدائرة هذه المحكمة.
بناءً على الإذن القضائي الصادر بالإشهاد على الطلاق المملك الصادر عن المحكمة الابتدائية بـ ${court} تحت عدد ${permissionNumber} في الملف رقم ${fileNumber} بتاريخ ${permissionDate}.
وتطبيقاً لأحكام المادة 89 والمادتين 84 و85 من مدونة الأسرة المغربية.
حضرت بمجلس العقد:
الزوجة المملَّكة: السيدة ${wifeFirstNameAr} ${wifeLastNameAr}، الحاملة لبطاقة التعريف الوطنية رقم ${wifeIdNumber}، مهنتها ${wifeProfession}، الساكنة بـ ${wifeAddress}، ${wifeCity}.
${husbandPresentDuringAct ? `وبحضور الزوج: السيد ${husbandFirstNameAr} ${husbandLastNameAr}، الحامل لبطاقة التعريف الوطنية رقم ${husbandIdNumber}.` : `في غيبة الزوج: السيد ${husbandFirstNameAr} ${husbandLastNameAr}، الحامل لبطاقة التعريف الوطنية رقم ${husbandIdNumber}، والمسجل غيابه رسمياً دون أن يمنع ذلك من ممارسة الزوجة لحقها المملك لها قانوناً.`}
واللذان تربطهما علاقة زوجية شرعية صحيحة بمقتضى رسم الزواج عدد ${marriageDeedNumber}، صحيفة ${marriagePageNumber}، دفتر ${marriageBookNumber} حرف ${marriageBookLetter}، توثيق ${marriageIssuingCourt}.
وبمقتضى شرط التمليك الثابت للزوجة بموجب ${tamlikSource === 'marriage_deed' ? 'رسم الزواج المشار إليه أعلاه' : `${indDeedType} عدد ${indDeedNumber} المؤرخ في ${indDeedDate} لدى محكمة ${indCourtName}`}.
صرحت الزوجة المذكورة طواعية واختياراً بأنها تباشر حقها في إيقاع الطلاق الذي ملكها إياه زوجها، وأوقعت على نفسها منه: ${divorceCount === 'first' ? 'طلقة أولى مملَّكة' : divorceCount === 'second' ? 'طلقة ثانية مملَّكة' : 'طلقة ثالثة بائنة بينونة كبرى مملَّكة'}، بعد ${consummationHappened ? 'حصول البناء الشرعي بها' : 'عدم حصول البناء الشرعي'}، طبقاً للمادة 89 من مدونة الأسرة.
${pregnancyStatus === 'yes' ? 'وحالة الحمل: صرحت الزوجة بأنها حامل وقت هذا الإشهاد.' : 'وحالة الحمل: صرحت الزوجة ببراءة رحمها من الحمل.'}
${duesTotal > 0 ? `وقد حددت المستحقات المترتبة عن هذا الطلاق في مبلغ إجمالي قدره ${duesTotal.toLocaleString('ar-MA')} درهم (${duesTotalInWords})، يشمل نفقة العدة والمتعة والسكنى ومستحقات الأطفال عند الاقتضاء طبقاً للمادتين 84 و85 من مدونة الأسرة.` : ''}
${hasChildren ? `وللزوجين من الأبناء المشتركين عددهم ${totalChildrenCount} (${boysCount} ذكور و ${girlsCount} إناث)، تسند حضانتهم للأم بمقر إقامتها، مع التزام الأب بأداء واجبات النفقة المقررة قضائياً.` : 'وليس بين الزوجين أي ولد مشترك.'}
وبه تم الإشهاد التام طبقاً للقانون.`,
      step: 7 // Proceed directly to Step 7 (Final Review & Smart Drafting)
    }));

    onComplete();
  };

  const stagesList = [
    { num: 1, label: 'الإذن القضائي' },
    { num: 2, label: 'صاحبة التمليك' },
    { num: 3, label: 'بيانات الزوجة' },
    { num: 4, label: 'بيانات الزوج' },
    { num: 5, label: 'رسم الزواج' },
    { num: 6, label: 'سند التمليك' },
    { num: 7, label: 'مضمون الشرط' },
    { num: 8, label: 'نطاق التمليك' },
    { num: 9, label: 'التحقق المزدوج' },
    { num: 10, label: 'ترتيب الطلاق' },
    { num: 11, label: 'حالة البناء' },
    { num: 12, label: 'تصريح الإعمال' },
    { num: 13, label: 'حالة الزوج' },
    { num: 14, label: 'حالة الحمل' },
    { num: 15, label: 'المستحقات' },
    { num: 16, label: 'الأبناء' },
    { num: 17, label: 'الحضانة والنفقة' },
    { num: 18, label: 'الحراس القانونيون' },
    { num: 19, label: 'المراجعة والتحرير' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn pb-16 font-sans" dir="rtl">
      {/* 🏛️ Top Header Banner - Moroccan Judicial Elegance */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مسار الطلاق المملَّك — المادة 89 من مدونة الأسرة المغربية (D-05)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>🟪 مسطرة الإشهاد على الطلاق المملَّك</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              إشهاد عدلي بمباشرة الزوجة لحق إيقاع الطلاق المملَّك لها بمقتضى شرط التمليك الثابت في السند المعتمد، بناءً على الإذن القضائي الصادر عن المحكمة الابتدائية المختصة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2">
              <span className="text-rose-400 font-mono">المرحلة {currentStage} من 19</span>
            </div>
            <button
              type="button"
              onClick={onBackToClassification}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <span>⚙️ تعديل المسار</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
            <span>تقدم إنجاز المسطرة العدلية</span>
            <span className="font-mono text-rose-400 font-bold">
              {Math.round((currentStage / 19) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${(currentStage / 19) * 100}%` }}
            />
          </div>

          {/* Quick Stage Horizontal Scrollbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-2 scrollbar-none">
            {stagesList.map((st) => {
              const isPassed = st.num < currentStage;
              const isCurrent = st.num === currentStage;
              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => setCurrentStage(st.num)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                      : isPassed
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/60'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{st.num}.</span>
                  <span>{st.label}</span>
                  {isPassed && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
        {/* ========================================================= */}
        {/* 🟦 المرحلة 01 — الإذن القضائي بالإشهاد على الطلاق المملك */}
        {/* ========================================================= */}
        {currentStage === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Scale className="w-4 h-4" />
                <span>المرحلة 01 — الإذن القضائي بالإشهاد</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                ⚖️ الإذن بالإشهاد على الطلاق المملك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يرجى إدخال بيانات الإذن القضائي الصادر للزوجة بالإشهاد على الطلاق، ثم الانتقال إلى التحقق من سند التمليك.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-extrabold text-slate-900">
                هل يوجد إذن قضائي بالإشهاد على الطلاق؟
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasJudicialPermission"
                    checked={hasJudicialPermission === true}
                    onChange={() => setHasJudicialPermission(true)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 نعم</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasJudicialPermission"
                    checked={hasJudicialPermission === false}
                    onChange={() => setHasJudicialPermission(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {!hasJudicialPermission && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 mt-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-rose-950">🔴 لا يمكن متابعة المسطرة</p>
                    <p className="text-rose-800 leading-relaxed">
                      لم يتم تسجيل الإذن القضائي بالإشهاد على الطلاق المملك. يرجى التحقق من المسطرة قبل المتابعة.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {hasJudicialPermission && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المحكمة الابتدائية:
                  </label>
                  <input
                    type="text"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="المحكمة الابتدائية..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    القسم / الجهة:
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="قسم قضاء الأسرة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الملف القضائي:
                  </label>
                  <input
                    type="text"
                    value={fileNumber}
                    onChange={(e) => setFileNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="مثال: 2026/1602/412"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الإذن القضائي: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={permissionNumber}
                    onChange={(e) => setPermissionNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="مثال: 789/2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ صدور الإذن:
                  </label>
                  <input
                    type="date"
                    value={permissionDate}
                    onChange={(e) => setPermissionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ التوصل بالإذن:
                  </label>
                  <input
                    type="date"
                    value={receptionDate}
                    onChange={(e) => setReceptionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات العدل حول الإذن:
                  </label>
                  <input
                    type="text"
                    value={adoulNotes}
                    onChange={(e) => setAdoulNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    placeholder="أي ملاحظات أو شروط قضائية واردة في الإذن..."
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 تم تسجيل الإذن القضائي بالإشهاد على الطلاق المملك بنجاح.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 02 — صاحبة حق التمليك */}
        {/* ========================================================= */}
        {currentStage === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <User className="w-4 h-4" />
                <span>المرحلة 02 — صاحبة حق التمليك</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                👩 من تباشر حق التمليك؟
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                التحقق من صفة من يباشر إيقاع الطلاق المملَّك وفق سند التمليك المعتمد.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 via-purple-50 to-amber-50 border border-rose-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                  👩
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    الزوجة (صاحبة حق التمليك المقررة)
                  </h4>
                  <p className="text-xs text-rose-800 font-bold mt-0.5">
                    الطرف المباشر للإيقاع بالأصالة عن نفسها بناءً على الشرط المكتسب
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-rose-200 text-slate-800 text-xs space-y-2 leading-relaxed shadow-sm">
                <div className="flex items-center gap-2 text-rose-700 font-extrabold">
                  <Sparkles className="w-4 h-4" />
                  <span>💠 الزوجة هي صاحبة الحق في إيقاع الطلاق المملك، بناءً على شرط التمليك الثابت في السند المعتمد.</span>
                </div>
                <p className="text-slate-600">
                  وفي هذا البيت <strong>لا يشترط حضور الزوج</strong>؛ بل يمكن أن يكون غائبًا، وهو فرق جوهري عن الخلع الذي يقوم على التراضي بين الزوجين.
                </p>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 font-medium">
                  <strong>⚖️ المادة 89 من مدونة الأسرة:</strong> تجعل استعمال الزوجة لحق التمليك حقًا لها متى تحقق الشرط، بل <strong>تمنع الزوج صراحة من عزلها عنه</strong> بعد ثبوته.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 03 — بيانات الزوجة المملَّكة */}
        {/* ========================================================= */}
        {currentStage === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                  <User className="w-4 h-4" />
                  <span>المرحلة 03 — بيانات الزوجة المملَّكة</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  👩 بيانات صاحبة حق التمليك
                </h3>
              </div>
              <button
                type="button"
                onClick={handleImportWifeFromState}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 transition-all flex items-center gap-1.5 self-start"
              >
                <span>🔄 استدعاء بيانات الزوجة من السجل</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الشخصي بالعربية: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wifeFirstNameAr}
                  onChange={(e) => setWifeFirstNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="الاسم الشخصي"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم العائلي بالعربية: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wifeLastNameAr}
                  onChange={(e) => setWifeLastNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="الاسم العائلي"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الشخصي باللاتينية:
                </label>
                <input
                  type="text"
                  value={wifeFirstNameFr}
                  onChange={(e) => setWifeFirstNameFr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم العائلي باللاتينية:
                </label>
                <input
                  type="text"
                  value={wifeLastNameFr}
                  onChange={(e) => setWifeLastNameFr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  placeholder="Nom"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الجنسية:
                </label>
                <input
                  type="text"
                  value={wifeNationality}
                  onChange={(e) => setWifeNationality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الازدياد:
                </label>
                <input
                  type="date"
                  value={wifeBirthDate}
                  onChange={(e) => setWifeBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مكان الازدياد:
                </label>
                <input
                  type="text"
                  value={wifeBirthPlace}
                  onChange={(e) => setWifeBirthPlace(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الأب:
                </label>
                <input
                  type="text"
                  value={wifeFatherName}
                  onChange={(e) => setWifeFatherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الأم:
                </label>
                <input
                  type="text"
                  value={wifeMotherName}
                  onChange={(e) => setWifeMotherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* وثيقة الهوية */}
              <div className="sm:col-span-2 md:col-span-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mt-2">
                <h4 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                  <span>🪪 وثيقة الهوية</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الوثيقة:</label>
                    <select
                      value={wifeIdType}
                      onChange={(e) => setWifeIdType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="cin">البطاقة الوطنية للتعريف (CNIE)</option>
                      <option value="passport">جواز السفر</option>
                      <option value="other">وثيقة أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الوثيقة: <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={wifeIdNumber}
                      onChange={(e) => setWifeIdNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">صالحة إلى غاية:</label>
                    <input
                      type="date"
                      value={wifeIdExpiryDate}
                      onChange={(e) => setWifeIdExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* البيانات الإضافية */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                <input
                  type="text"
                  value={wifeProfession}
                  onChange={(e) => setWifeProfession(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">السكنى:</label>
                <input
                  type="text"
                  value={wifeAddress}
                  onChange={(e) => setWifeAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المدينة:</label>
                <input
                  type="text"
                  value={wifeCity}
                  onChange={(e) => setWifeCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدولة:</label>
                <input
                  type="text"
                  value={wifeCountry}
                  onChange={(e) => setWifeCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 04 — بيانات الزوج المالك لحق التمليك */}
        {/* ========================================================= */}
        {currentStage === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <User className="w-4 h-4" />
                <span>المرحلة 04 — بيانات الزوج</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                👨 بيانات الزوج المالك لحق التمليك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تسجيل هوية الزوج كاملة مع تحديد وضعية حضوره أثناء الإشهاد (حاضر / غائب دون تأثير مانع).
              </p>
            </div>

            {/* حضور الزوج التفاعلي */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-extrabold text-slate-900">
                حضور الزوج أثناء الإشهاد:
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="husbandPresenceStatus"
                    checked={husbandPresenceStatus === 'present'}
                    onChange={() => setHusbandPresenceStatus('present')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 حاضر</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="husbandPresenceStatus"
                    checked={husbandPresenceStatus === 'absent'}
                    onChange={() => setHusbandPresenceStatus('absent')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 غائب</span>
                </label>
              </div>

              {husbandPresenceStatus === 'absent' ? (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <span>🔵 تم تسجيل غياب الزوج.</span>
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    لا يمنع غيابه بذاته من متابعة هذا المسار، ما دامت الزوجة تباشر حق التمليك الثابت لها وتتوفر باقي الشروط القانونية والإذن القضائي.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <p className="font-bold">🟢 تم تسجيل حضور الزوج — ولا يؤثر حضوره على مباشرة الزوجة لحقها الأصيل.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الشخصي بالعربية: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={husbandFirstNameAr}
                  onChange={(e) => setHusbandFirstNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم العائلي بالعربية: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={husbandLastNameAr}
                  onChange={(e) => setHusbandLastNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الشخصي باللاتينية:
                </label>
                <input
                  type="text"
                  value={husbandFirstNameFr}
                  onChange={(e) => setHusbandFirstNameFr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم العائلي باللاتينية:
                </label>
                <input
                  type="text"
                  value={husbandLastNameFr}
                  onChange={(e) => setHusbandLastNameFr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية:</label>
                <input
                  type="text"
                  value={husbandNationality}
                  onChange={(e) => setHusbandNationality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد:</label>
                <input
                  type="date"
                  value={husbandBirthDate}
                  onChange={(e) => setHusbandBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد:</label>
                <input
                  type="text"
                  value={husbandBirthPlace}
                  onChange={(e) => setHusbandBirthPlace(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب:</label>
                <input
                  type="text"
                  value={husbandFatherName}
                  onChange={(e) => setHusbandFatherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم:</label>
                <input
                  type="text"
                  value={husbandMotherName}
                  onChange={(e) => setHusbandMotherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* وثيقة الهوية */}
              <div className="sm:col-span-2 md:col-span-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mt-2">
                <h4 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                  <span>🪪 وثيقة هوية الزوج</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الوثيقة:</label>
                    <select
                      value={husbandIdType}
                      onChange={(e) => setHusbandIdType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="cin">بطاقة وطنية (CNIE)</option>
                      <option value="passport">جواز سفر</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم الوثيقة: <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={husbandIdNumber}
                      onChange={(e) => setHusbandIdNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">صالحة إلى غاية:</label>
                    <input
                      type="date"
                      value={husbandIdExpiryDate}
                      onChange={(e) => setHusbandIdExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المهنة:</label>
                <input
                  type="text"
                  value={husbandProfession}
                  onChange={(e) => setHusbandProfession(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">السكنى:</label>
                <input
                  type="text"
                  value={husbandAddress}
                  onChange={(e) => setHusbandAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 05 — رسم الزواج */}
        {/* ========================================================= */}
        {currentStage === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Heart className="w-4 h-4" />
                <span>المرحلة 05 — مرجع عقد الزواج</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                💍 مرجع عقد الزواج
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تسجيل بيانات عقد الزواج الشرعي الرابط بين الزوجين.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الرسم:</label>
                <input
                  type="text"
                  value={marriageDeedType}
                  onChange={(e) => setMarriageDeedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مضمن بدفتر:</label>
                <input
                  type="text"
                  value={marriageBookType}
                  onChange={(e) => setMarriageBookType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الدفتر:</label>
                <input
                  type="text"
                  value={marriageBookNumber}
                  onChange={(e) => setMarriageBookNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حرف الدفتر:</label>
                <input
                  type="text"
                  value={marriageBookLetter}
                  onChange={(e) => setMarriageBookLetter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصفحة:</label>
                <input
                  type="text"
                  value={marriagePageNumber}
                  onChange={(e) => setMarriagePageNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العدد (رقم الرسم): <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={marriageDeedNumber}
                  onChange={(e) => setMarriageDeedNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بتاريخ:</label>
                <input
                  type="date"
                  value={marriageDeedDate}
                  onChange={(e) => setMarriageDeedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة الابتدائية:</label>
                <input
                  type="text"
                  value={marriageIssuingCourt}
                  onChange={(e) => setMarriageIssuingCourt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>🟢 تم تسجيل مرجع عقد الزواج بنجاح.</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 06 — رسم الشرط / التمليك (سند التمليك) */}
        {/* ========================================================= */}
        {currentStage === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <FileText className="w-4 h-4" />
                <span>المرحلة 06 — سند التمليك</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                📜 سند التمليك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                أين ثبت شرط تمليك الزوجة حق إيقاع الطلاق؟ يرجى تحديد مصدر الحق المعتمد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'marriage_deed', label: 'ضمن عقد الزواج', desc: 'مدرج كشرط ضمن بنود رسم الزواج نفسه' },
                { id: 'independent_deed', label: 'في رسم مستقل', desc: 'رسم الشرط / رسم التمليك / رسم الطوع' },
                { id: 'case_file_document', label: 'في وثيقة أخرى ثابتة في الملف', desc: 'مقرر أو اتفاق رسمي مثبت بالملف القضائي' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTamlikSource(opt.id as any)}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                    tamlikSource === opt.id
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{opt.label}</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      tamlikSource === opt.id ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                    }`}>
                      {tamlikSource === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* إذا كان في رسم مستقل */}
            {tamlikSource === 'independent_deed' && (
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-300 space-y-4 animate-fadeIn">
                <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>📜 مرجع رسم الشرط / التمليك المستقل</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الرسم المستقل:</label>
                    <input
                      type="text"
                      value={indDeedType}
                      onChange={(e) => setIndDeedType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 bg-white"
                      placeholder="رسم شرط / رسم تمليك / رسم طوع"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الدفتر:</label>
                    <input
                      type="text"
                      value={indBookNumber}
                      onChange={(e) => setIndBookNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">حرف الدفتر:</label>
                    <input
                      type="text"
                      value={indBookLetter}
                      onChange={(e) => setIndBookLetter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الصفحة:</label>
                    <input
                      type="text"
                      value={indPageNumber}
                      onChange={(e) => setIndPageNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">العدد (رقم الرسم): <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={indDeedNumber}
                      onChange={(e) => setIndDeedNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">التاريخ:</label>
                    <input
                      type="date"
                      value={indDeedDate}
                      onChange={(e) => setIndDeedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة الابتدائية:</label>
                    <input
                      type="text"
                      value={indCourtName}
                      onChange={(e) => setIndCourtName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 07 — مضمون شرط التمليك */}
        {/* ========================================================= */}
        {currentStage === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                <span>المرحلة 07 — مضمون شرط التمليك</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                🔎 ماذا ملك الزوج لزوجته؟
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                التحقق من صراحة تمليك حق إيقاع الطلاق وشروط استعماله طبقاً للمادة 89 من مدونة الأسرة.
              </p>
            </div>

            {/* هل يتضمن السند صراحة تمليك الزوجة؟ */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-extrabold text-slate-900">
                هل يتضمن السند صراحة تمليك الزوجة حق إيقاع الطلاق؟
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="explicitTamlikGranted"
                    checked={explicitTamlikGranted === true}
                    onChange={() => setExplicitTamlikGranted(true)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 نعم</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="explicitTamlikGranted"
                    checked={explicitTamlikGranted === false}
                    onChange={() => setExplicitTamlikGranted(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {!explicitTamlikGranted ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold">🔴 تعذر التحقق من سند التمليك</p>
                    <p className="text-rose-800 mt-0.5">
                      لا يظهر من المعطيات المدخلة ثبوت حق الزوجة في إيقاع الطلاق. يرجى مراجعة سند الشرط قبل المتابعة.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>🟢 ثبت أصل حق التمليك من المعطيات المدخلة بالسند.</span>
                </div>
              )}
            </div>

            {/* شروط استعمال التمليك */}
            {explicitTamlikGranted && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <label className="block text-xs font-extrabold text-slate-900">
                  شروط استعمال التمليك: هل وضع الزوج شرطًا أو شروطًا لاستعمال حق التمليك؟
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="hasSpecialConditions"
                      checked={hasSpecialConditions === false}
                      onChange={() => setHasSpecialConditions(false)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>🔘 لا (تمليك مطلق غير مقيد بشرط)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="hasSpecialConditions"
                      checked={hasSpecialConditions === true}
                      onChange={() => setHasSpecialConditions(true)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>🔘 نعم (معلق على تحقق شروط محددة)</span>
                  </label>
                </div>

                {hasSpecialConditions && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newConditionInput}
                        onChange={(e) => setNewConditionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCondition();
                          }
                        }}
                        placeholder="أدخل نص/مضمون الشرط (مثال: عدم التزوج عليها، توفير سكن مستقل...)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddCondition}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                      >
                        + إضافة شرط
                      </button>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>⚠️ التحقق من شروط التمليك: توجب المادة 89 التأكد من توفر شروط التمليك المتفق عليها بين الزوجين.</span>
                    </div>

                    <div className="space-y-2 mt-2">
                      {conditionsList.map((cond, idx) => (
                        <div
                          key={cond.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 font-bold flex items-center justify-center text-[10px] text-slate-700">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">{cond.conditionText}</span>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {(['fulfilled', 'unfulfilled', 'needs_review'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleConditionStatusChange(cond.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  cond.status === st
                                    ? st === 'fulfilled'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : st === 'unfulfilled'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st === 'fulfilled' ? '🔘 متحقق' : st === 'unfulfilled' ? '🔘 غير متحقق' : '🔘 للمراجعة'}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleRemoveCondition(cond.id)}
                              className="text-slate-400 hover:text-rose-600 px-1.5 py-0.5 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 08 — هل التمليك مطلق أم مقيد؟ */}
        {/* ========================================================= */}
        {currentStage === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Lock className="w-4 h-4" />
                <span>المرحلة 08 — نطاق حق التمليك</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                💠 نطاق حق التمليك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد طبيعة التمليك بحسب ما ورد في السند المعتمد والتحقق من مانع عدم التحقق.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTamlikScope('unconditional')}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  tamlikScope === 'unconditional'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 غير مقيد بشرط خاص</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    tamlikScope === 'unconditional' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                  }`}>
                    {tamlikScope === 'unconditional' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تمليك مطلق كامل الصلاحية أعطاه الزوج لزوجته دون تعليقه على واقعة أو أجل أو شرط محدد.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTamlikScope('conditional')}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  tamlikScope === 'conditional'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 مقيد بشروط</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    tamlikScope === 'conditional' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                  }`}>
                    {tamlikScope === 'conditional' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تمليك معلق على واقعة محددة اشترطها الزوجان (مثل التزوج عليها أو الإخلال بالتزامات الزوجية).
                </p>
              </button>
            </div>

            {/* التحقق الصارم من حالة الشروط */}
            {tamlikScope === 'conditional' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">حالة الشروط المسجلة:</h4>
                <div className="space-y-2">
                  {conditionsList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800 font-medium">{c.conditionText}</span>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        c.status === 'fulfilled'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : c.status === 'unfulfilled'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {c.status === 'fulfilled' ? '🟢 متحقق' : c.status === 'unfulfilled' ? '🔴 غير متحقق' : '🟠 للمراجعة'}
                      </span>
                    </div>
                  ))}
                </div>

                {hasUnfulfilledCondition && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs flex items-start gap-3 mt-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-rose-900">🔴 لا يمكن اعتماد هذا المسار قبل مراجعة تحقق شرط التمليك.</p>
                      <p className="text-rose-800 mt-0.5 leading-relaxed">
                        يوجد شرط مسجل بحالة «غير متحقق». المادة 89 من مدونة الأسرة تشترط ثبوت تحقق الشروط المتفق عليها للإذن بإيقاع الطلاق المملك.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 09 — التحقق من الإذن + سند التمليك */}
        {/* ========================================================= */}
        {currentStage === 9 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>المرحلة 09 — التحقق من الأساس القانوني المزدوج</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                🔐 التحقق من أساس الطلاق المملك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                فحص تكامل أركان المسطرة بين الإذن القضائي وسند التمليك الثابت.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-extrabold">
                  <tr>
                    <th className="p-3.5">العنصر القانوني</th>
                    <th className="p-3.5">المرجع / البيانات المسجلة</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="p-3.5 font-bold text-slate-900">الإذن القضائي بالإشهاد</td>
                    <td className="p-3.5 text-slate-600">{court} — إذن رقم {permissionNumber} بتاريخ {permissionDate}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        🟢 متوفر
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-slate-900">عقد الزواج الرابط</td>
                    <td className="p-3.5 text-slate-600">{marriageDeedType} عدد {marriageDeedNumber} دفتر {marriageBookNumber}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        🟢 مثبت
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-slate-900">سند التمليك</td>
                    <td className="p-3.5 text-slate-600">
                      {tamlikSource === 'marriage_deed' ? 'مضمن بعقد الزواج' : `رسم مستقل عدد ${indDeedNumber}`}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        🟢 صريح
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-slate-900">شروط التمليك</td>
                    <td className="p-3.5 text-slate-600">
                      {tamlikScope === 'unconditional' ? 'غير مقيد بشرط خاص' : 'شروط متحققة ومطابقة'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        🟢 مستوفاة
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-slate-900">صفة الزوجة</td>
                    <td className="p-3.5 text-slate-600">{wifeFirstNameAr} {wifeLastNameAr} (ب.ت.و: {wifeIdNumber})</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        🟢 صاحبة الحق
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>🟢 تم التحقق مبدئيًا من أساس مباشرة الزوجة لحق التمليك، وتوفر الأركان المسطرية للإشهاد.</span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 10 — عدد الطلاق وترتيبه */}
        {/* ========================================================= */}
        {currentStage === 10 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Scale className="w-4 h-4" />
                <span>المرحلة 10 — ترتيب الطلاق</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                ⚖️ ترتيب الطلاق
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ما ترتيب الطلاق الذي تباشره الزوجة حاليًا ضمن الطلقات الواقعة بين الزوجين؟
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'first', label: 'الطلقة الأولى', desc: 'أول طلقة تقع بين الزوجين', color: 'blue' },
                { id: 'second', label: 'الطلقة الثانية', desc: 'مسبوقة بطلقة سابقة (رجعي أو خلع أو اتفاقي)', color: 'amber' },
                { id: 'third', label: 'الطلقة الثالثة', desc: 'مكملة للثلاث (بائنة بينونة كبرى)', color: 'rose' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDivorceCount(opt.id as any)}
                  className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                    divorceCount === opt.id
                      ? opt.color === 'blue'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                        : opt.color === 'amber'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                        : 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">{opt.label}</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      divorceCount === opt.id ? 'bg-slate-900 text-white' : 'border-slate-300'
                    }`}>
                      {divorceCount === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">التوصيف النظامي المعتمد:</p>
                <p className="text-sm font-extrabold text-rose-300 mt-0.5">
                  {divorceCount === 'first'
                    ? 'الطلقة الأولى — طلاق مملك'
                    : divorceCount === 'second'
                    ? 'الطلقة الثانية — طلاق مملك'
                    : 'الطلقة الثالثة — طلاق مملك مكمل للثلاث'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/30">
                D-05
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 11 — حالة البناء */}
        {/* ========================================================= */}
        {currentStage === 11 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Heart className="w-4 h-4" />
                <span>المرحلة 11 — حالة البناء</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                💍 حالة البناء
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                هل وقع البناء الشرعي بين الزوجين؟
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setConsummationHappened(true)}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  consummationHappened === true
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 نعم (بعد البناء)</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    consummationHappened === true ? 'bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {consummationHappened === true && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600">🟢 تم تسجيل وقوع البناء الشرعي بالزوجة.</p>
              </button>

              <button
                type="button"
                onClick={() => setConsummationHappened(false)}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  consummationHappened === false
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 لا (قبل البناء)</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    consummationHappened === false ? 'bg-amber-600 text-white' : 'border-slate-300'
                  }`}>
                    {consummationHappened === false && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600">🟠 تم تسجيل عدم وقوع البناء الشرعي بالزوجة.</p>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
              💡 <strong>تنبيه توثيقي:</strong> النظام لا يستنتج من ذلك وحده نوعاً آخر من الطلاق؛ لأنه مسار الطلاق المملك، وإنما يستعمل المعلومة ضمن تحرير نص الرسم وتحديد الآثار الفقهية المرتبطة بالحالة.
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 12 — تصريح الزوجة بإعمال حق التمليك */}
        {/* ========================================================= */}
        {currentStage === 12 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                <span>المرحلة 12 — لحظة الإشهاد العدلي</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                💠 إعمال حق التمليك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                بعد التحقق من سند التمليك وشروطه، تصرح الزوجة بأنها تباشر حقها في إيقاع الطلاق الذي ملكها إياه زوجها.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 border-2 border-amber-300 shadow-md space-y-4">
              <label className="block text-xs font-black text-slate-900">
                هل تصرح الزوجة بأنها تستعمل حق التمليك الثابت لها؟
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="radio"
                    name="wifeExercisedTamlik"
                    checked={wifeExercisedTamlik === true}
                    onChange={() => setWifeExercisedTamlik(true)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 نعم، أصرح بذلك</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="radio"
                    name="wifeExercisedTamlik"
                    checked={wifeExercisedTamlik === false}
                    onChange={() => setWifeExercisedTamlik(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {wifeExercisedTamlik && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>🟢 تم تسجيل إعمال الزوجة لحق التمليك رسمياً أمام العدلين.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      نص تصريح الزوجة بإيقاع الطلاق المملَّك:
                    </label>
                    <textarea
                      rows={3}
                      value={wifeStatementText}
                      onChange={(e) => setWifeStatementText(e.target.value)}
                      className="w-full p-3 rounded-xl border border-amber-300 text-xs font-semibold focus:ring-2 focus:ring-rose-500 bg-white leading-relaxed"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                    ⚖️ <strong>الضابط العدلي:</strong> النظام هنا لا يجعل الزوج طرفًا حاضرًا في الإيقاع؛ لأن الطلاق يقع بإرادة الزوجة المنفردة إعمالاً للتمليك الثابت لها.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 13 — غياب الزوج أو حضوره */}
        {/* ========================================================= */}
        {currentStage === 13 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <User className="w-4 h-4" />
                <span>المرحلة 13 — حالة الزوج</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                👨 حالة الزوج أثناء الإشهاد
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                هل الزوج حاضر أثناء الإشهاد؟
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setHusbandPresentDuringAct(true)}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  husbandPresentDuringAct === true
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 الزوج حاضر</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    husbandPresentDuringAct === true ? 'bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {husbandPresentDuringAct === true && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  🟢 الزوج حاضر — ولا يؤثر حضوره في طبيعة ممارسة الزوجة لحق التمليك.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setHusbandPresentDuringAct(false)}
                className={`p-5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                  husbandPresentDuringAct === false
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">🔘 الزوج غائب</span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    husbandPresentDuringAct === false ? 'bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {husbandPresentDuringAct === false && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  🔵 تم تسجيل غياب الزوج. ملاحظة: لا يتوقف هذا المسار على حضور الزوج متى كانت الزوجة تباشر حق التمليك الثابت لها.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 14 — الحمل */}
        {/* ========================================================= */}
        {currentStage === 14 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Baby className="w-4 h-4" />
                <span>المرحلة 14 — الحمل</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                🤰 تصريح الزوجة بشأن الحمل
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                هل تصرح الزوجة بوجود حمل؟
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'no', label: '🔘 لا (براءة الرحم)', desc: '🟢 صرحت الزوجة بعدم وجود حمل.' },
                { id: 'yes', label: '🔘 نعم (حامل)', desc: '🟠 تم تسجيل وجود حمل. يرجى مراعاة الآثار القانونية المترتبة عليه عند تحرير الرسم.' },
                { id: 'uncertain', label: '🔘 غير متأكدة', desc: 'تضمين التصريح بالرسم مع التوجيه لإجراء الفحص الطبي.' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPregnancyStatus(opt.id as any)}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                    pregnancyStatus === opt.id
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900">{opt.label}</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
              💡 لا يجعل التطبيق الحمل سببًا لإيقاف الرسم؛ بل يوجه العدل إلى استكمال البيانات وتحديد عدة الحامل بوضع حملها.
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 15 — المستحقات */}
        {/* ========================================================= */}
        {currentStage === 15 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Coins className="w-4 h-4" />
                <span>المرحلة 15 — المستحقات المالية</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                💰 مستحقات الزوجة والأطفال (المادة 89 والمادتان 84 و85)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تنص المادة 89 صراحة على أن المحكمة تأذن للزوجة بالإشهاد على الطلاق، وتبت في مستحقات الزوجة والأطفال عند الاقتضاء، تطبيقًا للمادتين 84 و85.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصداق المؤخر (إن وجد):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={deferredDowry}
                    onChange={(e) => setDeferredDowry(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-2 text-[11px] text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نفقة العدة:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={iddahMaintenance}
                    onChange={(e) => setIddahMaintenance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-2 text-[11px] text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المتعة:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={mutah}
                    onChange={(e) => setMutah(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-2 text-[11px] text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السكنى خلال العدة:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={housingDuringIddah}
                    onChange={(e) => setHousingDuringIddah(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-2 text-[11px] text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مستحقات الأطفال (إن وجدت):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={childrenDues}
                    onChange={(e) => setChildrenDues(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-2 text-[11px] text-slate-400 font-bold">درهم</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-center">
                <span className="text-[11px] text-slate-400 font-bold">الإجمالي المالي:</span>
                <span className="text-lg font-black text-rose-300 font-mono mt-0.5">
                  {duesTotal.toLocaleString('ar-MA')} درهم
                </span>
                <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                  {duesTotalInWords}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 16 — الأبناء */}
        {/* ========================================================= */}
        {currentStage === 16 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Users className="w-4 h-4" />
                <span>المرحلة 16 — الأبناء</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                👨‍👩‍👧‍👦 هل للزوجين أبناء؟
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasChildren"
                    checked={hasChildren === true}
                    onChange={() => setHasChildren(true)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 نعم</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasChildren"
                    checked={hasChildren === false}
                    onChange={() => setHasChildren(false)}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔘 لا</span>
                </label>
              </div>

              {hasChildren && (
                <div className="pt-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">إجمالي الأبناء:</label>
                      <input
                        type="number"
                        min="1"
                        value={totalChildrenCount}
                        onChange={(e) => setTotalChildrenCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ذكور: 👦</label>
                      <input
                        type="number"
                        min="0"
                        value={boysCount}
                        onChange={(e) => setBoysCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">إناث: 👧</label>
                      <input
                        type="number"
                        min="0"
                        value={girlsCount}
                        onChange={(e) => setGirlsCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {!isChildrenCountMatching && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold">
                      ⚠️ عدد الذكور ({boysCount}) + عدد الإناث ({girlsCount}) لا يطابق الإجمالي ({totalChildrenCount}).
                    </div>
                  )}

                  {/* بطاقات الأبناء التفاعلية */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">بطاقات الأبناء التفصيلية:</span>
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="px-3 py-1 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800"
                      >
                        + إضافة ابن/ابنة
                      </button>
                    </div>

                    {childrenList.map((child, idx) => (
                      <div
                        key={child.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs"
                      >
                        <div>
                          <label className="block text-[10px] text-slate-500">الاسم الشخصي:</label>
                          <input
                            type="text"
                            value={child.firstName}
                            onChange={(e) => handleUpdateChild(child.id, 'firstName', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500">الجنس:</label>
                          <select
                            value={child.gender}
                            onChange={(e) => handleUpdateChild(child.id, 'gender', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300"
                          >
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500">تاريخ الازدياد:</label>
                          <input
                            type="date"
                            value={child.birthDate}
                            onChange={(e) => handleUpdateChild(child.id, 'birthDate', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-500">الحالة الصحية:</label>
                            <input
                              type="text"
                              value={child.healthStatus}
                              onChange={(e) => handleUpdateChild(child.id, 'healthStatus', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-300"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(child.id)}
                            className="text-rose-500 hover:text-rose-700 font-bold p-1 mt-3"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 17 — وضعية الحضانة والسكن والنفقة */}
        {/* ========================================================= */}
        {currentStage === 17 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <Home className="w-4 h-4" />
                <span>المرحلة 17 — وضعية الحضانة والنفقة</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                👩‍👧 الحضانة وسكن المحضونين والنفقة
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تسجيل مستحقات الأطفال والترتيبات المتضمنة في الإذن القضائي.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحاضن الحالي:</label>
                <input
                  type="text"
                  value={custodyParty}
                  onChange={(e) => setCustodyParty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سكن المحضونين:</label>
                <input
                  type="text"
                  value={custodyResidence}
                  onChange={(e) => setCustodyResidence(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-extrabold text-slate-900">
                  هل توجد مستحقات للأطفال حددها القضاء؟
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="hasCourtOrderedChildDues"
                      checked={hasCourtOrderedChildDues === true}
                      onChange={() => setHasCourtOrderedChildDues(true)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>🔘 نعم</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="hasCourtOrderedChildDues"
                      checked={hasCourtOrderedChildDues === false}
                      onChange={() => setHasCourtOrderedChildDues(false)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>🔘 لا</span>
                  </label>
                </div>

                {hasCourtOrderedChildDues && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المبلغ:</label>
                      <input
                        type="number"
                        value={childDuesAmount}
                        onChange={(e) => setChildDuesAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المدة / الدورية:</label>
                      <input
                        type="text"
                        value={childDuesPeriod}
                        onChange={(e) => setChildDuesPeriod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">طريقة الأداء:</label>
                      <input
                        type="text"
                        value={childDuesPaymentMethod}
                        onChange={(e) => setChildDuesPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 18 — التحقق من عدم وجود مانع + الحراس الثلاثة */}
        {/* ========================================================= */}
        {currentStage === 18 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>المرحلة 18 — الحراس القانونيون التسعة</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                🔐 فحص نهائي وتحقق الحراس القانونيين
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                الفحص النهائي المنهجي للأركان القانونية الثلاثة الخاصة ببيت الطلاق المملك.
              </p>
            </div>

            {/* الحراس القانونيون الثلاثة البارزون */}
            <div className="space-y-3">
              {/* الحارس 1: المادة 89 - منع تراجع الزوج */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-rose-950 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>الزوج لا يستطيع إلغاء حق التمليك بعد منحه (المادة 89)</span>
                  </h4>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                    <span>هل ادعى الزوج التراجع؟</span>
                    <input
                      type="checkbox"
                      checked={husbandRevocationAttempted}
                      onChange={(e) => setHusbandRevocationAttempted(e.target.checked)}
                      className="w-4 h-4 text-rose-600"
                    />
                  </label>
                </div>
                {husbandRevocationAttempted ? (
                  <div className="p-3 bg-rose-600 text-white rounded-xl text-xs space-y-1">
                    <p className="font-black">🔴 تنبيه قانوني قاطع — المادة 89 من مدونة الأسرة</p>
                    <p className="leading-relaxed">
                      تنص المادة 89 على أنه: «لا يمكن للزوج أن يعزل زوجته من ممارسة حق التمليك الذي ملكها إياه».
                      تراجع الزوج بعد ثبوت التمليك باطل قانوناً ولا يمنع الزوجة من الإيقاع.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-800">
                    🟢 حق التمليك مستقر ولا تراجع عنه من طرف الزوج طبقاً للقانون.
                  </p>
                )}
              </div>

              {/* الحارس 2: لا نطلب موافقة الزوج على الإيقاع */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <h4 className="text-xs font-black text-emerald-950 flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>لا نطلب موافقة الزوج على الإيقاع (استقلال الإرادة)</span>
                </h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  🟢 الإشهاد قائم على ثبوت حق التمليك واستعمال الزوجة له بالإرادة المنفردة، دون اشتراط رضا الزوج أو حضوره.
                </p>
              </div>

              {/* الحارس 3: التمييز عن الوكالة */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                <h4 className="text-xs font-black text-purple-950 flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>التمييز الصريح بين التمليك والوكالة / النيابة</span>
                </h4>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  💠 الزوجة هنا لا توقع «نيابة عن الزوج»؛ وإنما تمارس حقاً مملكاً لها أصالة وفق شروطه والإذن القضائي.
                </p>
              </div>
            </div>

            {/* قائمة التحقق التساعية */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mt-3">
              <h4 className="text-xs font-black text-slate-900 mb-2">قائمة الفحص التساعية لمسطرة التمليك:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'هل ثبت حق التمليك بالسند؟', val: guardTamlikRightProven, set: setGuardTamlikRightProven },
                  { label: 'هل تحققت شروط التمليك؟', val: guardConditionsFulfilled, set: setGuardConditionsFulfilled },
                  { label: 'هل صدر الإذن القضائي بالطلاق؟', val: guardPermissionIssued, set: setGuardPermissionIssued },
                  { label: 'هل الزوجة هي صاحبة الحق؟', val: guardWifeIsAuthorizedHolder, set: setGuardWifeIsAuthorizedHolder },
                  { label: 'هل صرحت بإعمال حقها؟', val: guardExerciseDeclared, set: setGuardExerciseDeclared },
                  { label: 'هل تم تسجيل ترتيب الطلاق؟', val: guardDivorceOrderRecorded, set: setGuardDivorceOrderRecorded },
                  { label: 'هل تم تسجيل واقعة البناء؟', val: guardConsummationRecorded, set: setGuardConsummationRecorded },
                  { label: 'هل تم تسجيل تصريح الحمل؟', val: guardPregnancyRecorded, set: setGuardPregnancyRecorded },
                  { label: 'هل تم تسجيل المستحقات المالية؟', val: guardDuesRecorded, set: setGuardDuesRecorded }
                ].map((item, i) => (
                  <label key={i} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <span className="font-semibold text-slate-800 text-[11px]">{item.label}</span>
                    <span className="text-xs font-black text-emerald-600">🟢 نعم</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 🟦 المرحلة 19 — المراجعة النهائية والتحرير الرسمي */}
        {/* ========================================================= */}
        {currentStage === 19 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-1">
                <FileText className="w-4 h-4" />
                <span>المرحلة 19 — المراجعة والتحرير</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                🔎 مراجعة الطلاق المملك
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                الملخص الشامل للبيانات المحررة برسم الطلاق المملَّك قبل الانتقال إلى التحرير النهائي.
              </p>
            </div>

            {/* ملخص المراجعة الشامل في بطاقات أنيقة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">⚖️ الأساس القضائي:</span>
                <p className="font-black text-slate-900">إذن رقم {permissionNumber}</p>
                <p className="text-[11px] text-slate-600">{court}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">💍 عقد الزواج:</span>
                <p className="font-black text-slate-900">رسم عدد {marriageDeedNumber}</p>
                <p className="text-[11px] text-slate-600">دفتر {marriageBookNumber} ص {marriagePageNumber}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">📜 سند التمليك:</span>
                <p className="font-black text-slate-900">{tamlikSource === 'marriage_deed' ? 'ضمن عقد الزواج' : `رسم مستقل عدد ${indDeedNumber}`}</p>
                <p className="text-[11px] text-slate-600">🟢 تم التحقق منه</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">🔐 شروط التمليك:</span>
                <p className="font-black text-slate-900">{tamlikScope === 'unconditional' ? 'غير مقيد' : 'مقيد بشروط'}</p>
                <p className="text-[11px] text-emerald-700 font-bold">🟢 مستوفاة ومحققة</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">👩 الزوجة:</span>
                <p className="font-black text-slate-900">{wifeFirstNameAr} {wifeLastNameAr}</p>
                <p className="text-[11px] text-emerald-700 font-bold">🟢 صاحبة حق التمليك</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">👨 الزوج:</span>
                <p className="font-black text-slate-900">{husbandFirstNameAr} {husbandLastNameAr}</p>
                <p className="text-[11px] text-blue-700 font-bold">
                  {husbandPresentDuringAct ? '🟢 حاضر' : '🔵 غائب (لا يمنع المسطرة)'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">⚖️ ترتيب الطلاق:</span>
                <p className="font-black text-slate-900">
                  {divorceCount === 'first' ? 'الطلقة الأولى' : divorceCount === 'second' ? 'الطلقة الثانية' : 'الطلقة الثالثة'}
                </p>
                <p className="text-[11px] text-rose-700 font-bold">💠 طلاق مملك</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">💍 واقعة البناء:</span>
                <p className="font-black text-slate-900">{consummationHappened ? 'حاصل بالزوجة' : 'غير حاصل'}</p>
                <p className="text-[11px] text-slate-600">
                  {pregnancyStatus === 'yes' ? 'حامل' : 'لا يوجد حمل'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500">💰 المستحقات:</span>
                <p className="font-black text-slate-900">{duesTotal.toLocaleString('ar-MA')} درهم</p>
                <p className="text-[11px] text-slate-600">{hasChildren ? `${totalChildrenCount} أبناء` : 'بدون أبناء'}</p>
              </div>
            </div>

            {/* بطاقة الجاهزية الخضراء مع الزر النهائي الوحيد */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-emerald-950 text-base">🟢 اكتملت المعطيات الأساسية للطلاق المملك</h4>
                <p className="text-xs text-emerald-900 mt-1 max-w-xl leading-relaxed">
                  الزوجة تباشر حق التمليك الثابت لها، وفق سند التمليك والإذن القضائي المسجلين بالنظام وتطبيقاً للمادة 89 من مدونة الأسرة.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalProceedToDraft}
                className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-center justify-center hover:scale-105 active:scale-95"
              >
                <span>✍️ الانتقال إلى تحرير رسم الطلاق المملك</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 🎛️ Navigation Actions (Back / Next) - Only show Next when currentStage < 19 */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevStage}
            disabled={currentStage === 1}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentStage === 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق: {currentStage > 1 ? stagesList[currentStage - 2]?.label : ''}</span>
          </button>

          {currentStage < 19 && (
            <button
              type="button"
              onClick={handleNextStage}
              disabled={!isCurrentStageValid}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isCurrentStageValid
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-105 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>التالي: {stagesList[currentStage]?.label}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
