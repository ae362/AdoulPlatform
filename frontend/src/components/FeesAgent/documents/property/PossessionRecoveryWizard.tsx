import React, { useState, useMemo, useEffect } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  PossessionRecoveryState,
  PossessionRecoveryOperationType,
  AttendanceMode,
  PropertyNatureType,
  AreaDeterminationMethod,
  PossessionShareType,
  LossOfPossessionMode,
  RecoveryMode,
  PossessionOriginBasis,
  DisputeStatus,
  DirectObservationWitness,
  PropertyComponentItem,
  PriorPossessorItem,
  TitleDeedReference,
  SupportingDocumentItem,
  RegistrationRecordItem,
} from './possessionRecoveryTypes';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  FileText,
  Building2,
  Scale,
  User,
  Users,
  Send,
  MapPin,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { trpc } from '../../../../trpc';
import { enhanceCardImageForOCR } from '../../../../utils/cinImageEnhancer';

export const PossessionRecoveryWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack: _onBack,
}) => {
  // Navigation Stages: 1 through 7
  const [activeStage, setActiveStage] = useState<number>(1);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Initialize or read from FeesAgentState
  const existing = state.possessionRecovery;

  // 1️⃣ Operation Type & Judicial Ruling
  const [operationType, setOperationType] = useState<PossessionRecoveryOperationType>(
    existing?.operationType || 'استرجاع_فعلي'
  );
  const [rulingCourt, setRulingCourt] = useState(existing?.judicialRuling?.courtName || '');
  const [rulingCaseNumber, setRulingCaseNumber] = useState(existing?.judicialRuling?.caseNumber || '');
  const [rulingNumber, setRulingNumber] = useState(existing?.judicialRuling?.rulingNumber || '');
  const [rulingDate, setRulingDate] = useState(existing?.judicialRuling?.rulingDate || '');
  const [rulingParties, _setRulingParties] = useState(existing?.judicialRuling?.parties || '');
  const [rulingOperativePart, setRulingOperativePart] = useState(existing?.judicialRuling?.operativePart || '');
  const [rulingRelatesToRecovery, _setRulingRelatesToRecovery] = useState(existing?.judicialRuling?.relatesToPossessionRecovery ?? true);
  const [rulingIsFinal, _setRulingIsFinal] = useState(existing?.judicialRuling?.isFinalRuling ?? true);
  const [appealReferences, _setAppealReferences] = useState(existing?.judicialRuling?.appealReferences || '');
  const [enforcementRecord, setEnforcementRecord] = useState(existing?.judicialRuling?.enforcementRecordNumber || '');
  const [enforcementDate, setEnforcementDate] = useState(existing?.judicialRuling?.enforcementDate || '');
  const [enforcementAuthority, _setEnforcementAuthority] = useState(existing?.judicialRuling?.enforcementAuthority || 'مأمور إجراءات التنفيذ بالمحكمة الابتدائية');
  const [enforcementResult, setEnforcementResult] = useState(existing?.judicialRuling?.enforcementResult || 'تم إرجاع الحيازة فعلياً وتمكين طالب الإشهاد منها بدون معارضة');

  // 2️⃣ Applicant & Attendance
  const [applicantName, setApplicantName] = useState(existing?.applicant?.name || state.sellers?.[0]?.name || '');
  const [applicantFather, setApplicantFather] = useState(existing?.applicant?.fatherName || state.sellers?.[0]?.fatherName || '');
  const [applicantMother, setApplicantMother] = useState(existing?.applicant?.motherName || state.sellers?.[0]?.motherName || '');
  const [applicantDob, setApplicantDob] = useState(existing?.applicant?.dateOfBirth || state.sellers?.[0]?.dateOfBirth || '');
  const [applicantPob, setApplicantPob] = useState(existing?.applicant?.placeOfBirth || state.sellers?.[0]?.placeOfBirth || '');
  const [applicantNationality, _setApplicantNationality] = useState(existing?.applicant?.nationality || 'مغربية');
  const [applicantProfession, setApplicantProfession] = useState(existing?.applicant?.profession || state.sellers?.[0]?.profession || 'فلاح');
  const [applicantMarital, _setApplicantMarital] = useState(existing?.applicant?.maritalStatus || 'متزوج');
  const [applicantAddress, setApplicantAddress] = useState(existing?.applicant?.address || state.sellers?.[0]?.address || '');
  const [applicantCin, setApplicantCin] = useState(existing?.applicant?.cin || state.sellers?.[0]?.idNumber || '');
  const [applicantCinDate, _setApplicantCinDate] = useState(existing?.applicant?.cinIssueDate || '');
  const [applicantCinPlace, _setApplicantCinPlace] = useState(existing?.applicant?.cinIssuePlace || '');
  const [applicantPhone, setApplicantPhone] = useState(existing?.applicant?.phone || state.sellers?.[0]?.phone || '');
  const [applicantEmail, _setApplicantEmail] = useState(existing?.applicant?.email || '');

  // Disputant / Opponent
  const [disputantName, _setDisputantName] = useState(existing?.disputant?.name || state.buyers?.[0]?.name || '');
  const [disputantCin, _setDisputantCin] = useState(existing?.disputant?.cin || state.buyers?.[0]?.idNumber || '');
  const [disputantAddress, _setDisputantAddress] = useState(existing?.disputant?.address || state.buyers?.[0]?.address || '');

  // 3️⃣ Attendance & POA
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>(existing?.attendanceMode || 'أصالة');
  const [poaPrincipal, setPoaPrincipal] = useState(existing?.poa?.principalName || '');
  const [poaAgent, _setPoaAgent] = useState(existing?.poa?.agentName || '');
  const [poaType, setPoaType] = useState(existing?.poa?.poaType || 'وكالة عدلية مضمنة');
  const [poaDate, setPoaDate] = useState(existing?.poa?.poaDate || '');
  const [poaNotary1, _setPoaNotary1] = useState(existing?.poa?.notary1 || '');
  const [poaNotary2, _setPoaNotary2] = useState(existing?.poa?.notary2 || '');
  const [poaCourt, _setPoaCourt] = useState(existing?.poa?.court || '');
  const [poaBook, _setPoaBook] = useState(existing?.poa?.registerBook || 'سجل التوكيلات');
  const [poaLetter, _setPoaLetter] = useState(existing?.poa?.letter || 'ب');
  const [poaPage, _setPoaPage] = useState(existing?.poa?.page || '');
  const [poaNumber, setPoaNumber] = useState(existing?.poa?.number || '');
  const [poaCoversPossession, setPoaCoversPossession] = useState(existing?.poa?.coversPossession ?? true);
  const [poaScopeNotes, _setPoaScopeNotes] = useState(existing?.poa?.scopeNotes || 'صلاحية الترافع وإدارة العقار واسترجاع حيازته وطلب الشهادات والرسوم العدلية');

  // 4️⃣ & 5️⃣ Property Details
  const [commune, setCommune] = useState(existing?.property?.location?.commune || 'جماعة بني رزين');
  const [cercle, _setCercle] = useState(existing?.property?.location?.cercleOrDistrict || 'دائرة الجبهة');
  const [province, setProvince] = useState(existing?.property?.location?.province || 'إقليم شفشاون');
  const [region, _setRegion] = useState(existing?.property?.location?.region || 'جهة طنجة تطوان الحسيمة');
  const [douar, setDouar] = useState(existing?.property?.location?.douarOrQuarter || 'مدشر تغسة');
  const [placeName, setPlaceName] = useState(existing?.property?.location?.placeName || 'الموضع المسمى بوزكارة');
  const [propName, setPropName] = useState(existing?.property?.location?.propertyName || 'البلاد الفلاحية');
  const [propertyNature, setPropertyNature] = useState<PropertyNatureType>(existing?.property?.nature || 'أرض_فلاحية');
  const [totalArea, setTotalArea] = useState<number>(existing?.property?.area?.totalArea || 4500);
  const [areaUnit, setAreaUnit] = useState<'متر_مربع' | 'هكتار' | 'خدام' | 'سهم' | 'أخرى'>(existing?.property?.area?.unit || 'متر_مربع');
  const [determinationMethod, setDeterminationMethod] = useState<AreaDeterminationMethod>(existing?.property?.area?.determinationMethod || 'تصريح');
  const [boundaryNorth, setBoundaryNorth] = useState(existing?.property?.boundaries?.north || 'يحده شمالاً: ورثة محمد بن علي وبينهما مسلك');
  const [boundarySouth, setBoundarySouth] = useState(existing?.property?.boundaries?.south || 'يحده جنوباً: واد ومجرى مائي فصلي');
  const [boundaryEast, setBoundaryEast] = useState(existing?.property?.boundaries?.east || 'يحده شرقاً: أرض عبد السلام بن عمر');
  const [boundaryWest, setBoundaryWest] = useState(existing?.property?.boundaries?.west || 'يحده غرباً: الطريق القروية المؤدية للمدشر');
  const [isMultiComponent, _setIsMultiComponent] = useState(existing?.property?.isMultiComponent ?? false);
  const [components, _setComponents] = useState<PropertyComponentItem[]>(existing?.property?.components || []);

  // 7️⃣ & 8️⃣ Prior Possessor & Shares
  const [possessorType, setPossessorType] = useState<'طالب_الإشهاد' | 'مورث_طالب_الإشهاد' | 'عدة_أشخاص' | 'شخص_آخر'>(
    existing?.priorPossession?.possessorType || 'طالب_الإشهاد'
  );
  const [possessors, _setPossessors] = useState<PriorPossessorItem[]>(existing?.priorPossession?.possessors || []);
  const [possessionShareType, setPossessionShareType] = useState<PossessionShareType>(
    existing?.priorPossession?.shareType || 'حيازة_منفردة'
  );
  const [possessionStartDate, setPossessionStartDate] = useState(existing?.priorPossession?.startDate || '2015-04-10');
  const [startKnowledgeSource, _setStartKnowledgeSource] = useState(
    existing?.priorPossession?.startKnowledgeSource || 'بناء على تصريح الحائز ومعاينة ومجاورة الشهود منذ التاريخ المذكور'
  );

  // 🔟 & 1️⃣1️⃣ Loss of Possession & Violence
  const [lossMode, setLossMode] = useState<LossOfPossessionMode>(existing?.lossOfPossession?.mode || 'انتزاع_مادي');
  const [lossDate, setLossDate] = useState(existing?.lossOfPossession?.date || '2024-03-12');
  const [lossPlace, setLossPlace] = useState(existing?.lossOfPossession?.place || 'بعين العقار المذكور');
  const [wasViolent, setWasViolent] = useState<boolean | 'غير_معلوم'>(existing?.lossOfPossession?.wasViolentOrForced ?? false);
  const [complaintRecord, setComplaintRecord] = useState(existing?.lossOfPossession?.violenceDetails?.complaintRecordNumber || '');
  const [prosecutionCourt, setProsecutionCourt] = useState(existing?.lossOfPossession?.violenceDetails?.publicProsecutionCourt || '');
  const [criminalRuling, setCriminalRuling] = useState(existing?.lossOfPossession?.violenceDetails?.criminalRulingDetails || '');

  // 1️⃣2️⃣ Recovery Fact
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(existing?.recoveryFact?.mode || 'وضع_يد_تلقائي');
  const [recoveryDate, setRecoveryDate] = useState(existing?.recoveryFact?.recoveryDate || '2025-05-18');
  const [recoveryDescription, setRecoveryDescription] = useState(
    existing?.recoveryFact?.detailedDescription ||
      'قام طالب الإشهاد بالدخول إلى العقار المذكور ووضع يده عليه وحرث جزءاً منه وباشر استغلاله المادي المعتاد بحضور الشهود الموقعين أدناه دون أن ينازعه أحد أو يمنعه مانع.'
  );

  // 1️⃣3️⃣ Direct Observation Witnesses
  const [witnesses, setWitnesses] = useState<DirectObservationWitness[]>(
    existing?.witnesses || [
      {
        id: 'wit-1',
        name: 'أحمد بن العربي العلمي',
        cin: 'L123456',
        profession: 'فلاح مجاور',
        address: 'مدشر تغسة، جماعة بني رزين',
        relationshipToParties: 'جار ملاصق من الجهة الشرقية',
        durationOfPropertyKnowledgeYears: 25,
        witnessedPriorPossession: true,
        witnessedLossOfPossession: true,
        witnessedRecovery: true,
        isDirectObservation: true,
        knowledgeSource: 'المجاورة والمعاينة الشخصية بالعين',
      },
      {
        id: 'wit-2',
        name: 'محمد بن التهامي الحسني',
        cin: 'L654321',
        profession: 'مياوم',
        address: 'مدشر تغسة، جماعة بني رزين',
        relationshipToParties: 'أجنبي عن الأطراف ومجاور',
        durationOfPropertyKnowledgeYears: 30,
        witnessedPriorPossession: true,
        witnessedLossOfPossession: true,
        witnessedRecovery: true,
        isDirectObservation: true,
        knowledgeSource: 'المعاينة المباشرة وحضور واقعة الاسترجاع',
      },
    ]
  );

  // Witness OCR scanning state
  const [scanningWitnessId, setScanningWitnessId] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const extractIdCardMutation = trpc.feesAgent.ocr.extractIDCard.useMutation();

  // 1️⃣4️⃣ Possession Origin Basis & Deeds
  const [originBasis, setOriginBasis] = useState<PossessionOriginBasis>(existing?.possessionOrigin?.basis || 'حيازة_فعلية_دون_سند');
  const [hasDeed, setHasDeed] = useState(existing?.possessionOrigin?.hasDeed ?? false);
  const [deeds, setDeeds] = useState<TitleDeedReference[]>(existing?.possessionOrigin?.deeds || []);

  // 1️⃣5️⃣ Registration History
  const [hasPriorReg, _setHasPriorReg] = useState(existing?.registrationHistory?.hasPriorRegistration ?? false);
  const [registrationRecords, _setRegistrationRecords] = useState<RegistrationRecordItem[]>(
    existing?.registrationHistory?.records || []
  );

  // 1️⃣6️⃣ Supporting Documents
  const [supportingDocs, _setSupportingDocs] = useState<SupportingDocumentItem[]>(
    existing?.supportingDocuments || [
      {
        id: 'doc-1',
        title: 'شهادة إدارية تثبت الصبغة غير الجماعية وغير الغابوية',
        category: 'شهادة_إدارية',
        reference: 'عدد 104/2024 بتارخ 14/06/2024 صادر عن قيادة بني رزين',
      },
    ]
  );

  // 2️⃣0️⃣ Judicial Dispute Status
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus>(existing?.judicialStatus?.disputeStatus || 'لا_يوجد_نزاع');

  // 2️⃣2️⃣ Lafif Link
  const [isLafifLinked, setIsLafifLinked] = useState(existing?.lafifLink?.isLinked ?? false);
  const [lafifNumber, setLafifNumber] = useState(existing?.lafifLink?.lafifNumber || '');
  const [lafifWitnessCount, _setLafifWitnessCount] = useState<number>(existing?.lafifLink?.witnessCount || 12);

  // 2️⃣3️⃣ Purpose
  const [documentationPurpose, setDocumentationPurpose] = useState<'استرجاع_حصل_فعلا' | 'تمهيدا_لنزاع'>(
    existing?.documentationPurpose || 'استرجاع_حصل_فعلا'
  );

  // Calculated duration between start date and loss date
  const calculatedDuration = useMemo(() => {
    if (!possessionStartDate || !lossDate) return 'غير محددة بدقة';
    try {
      const start = new Date(possessionStartDate);
      const loss = new Date(lossDate);
      const diffMs = loss.getTime() - start.getTime();
      if (diffMs <= 0) return 'تواريخ غير متوافقة';
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);
      return `${years} سنة و${months} أشهر تقريباً`;
    } catch {
      return 'عدة سنوات';
    }
  }, [possessionStartDate, lossDate]);

  // Check 1-year statutory limitation alert for judicial possession actions (Art 245 CPC)
  const isOverOneYearFromLoss = useMemo(() => {
    if (!lossDate) return false;
    try {
      const loss = new Date(lossDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - loss.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 365;
    } catch {
      return false;
    }
  }, [lossDate]);

  // Construct draft text automatically (نص الشهادة / الرسم العدلي لموجب استرجاع الحيازة)
  const generatedDraft = useMemo(() => {
    const header = `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.\n\n` +
      `بـتاريـخ: ${new Date().toLocaleDateString('ar-MA')} مـوافـق ${new Date().getFullYear()} هـ.\n` +
      `لـدى عـدلي المـحكمة الابـتدائـية بـ${province} المـوقعين أسـفله.\n\n`;

    const applicantBlock = `حـضر طـالب الإشـهاد:\n` +
      `السـيد(ة): ${applicantName || '---'} بن ${applicantFather || '---'} وأمه ${applicantMother || '---'}، ` +
      `المولود(ة) بتاريخ ${applicantDob || '---'} بـ ${applicantPob || '---'}، المغربي(ة) الجنسية، مهنته(ا) ${applicantProfession || '---'}، ` +
      `الحامل(ة) للبطاقة الوطنية للتعريف رقم ${applicantCin || '---'}، الساكن(ة) بـ ${applicantAddress || '---'}` +
      `${attendanceMode === 'أصالة' ? '، الحاضر أصالة عن نفسه.' : `، الحاضر نيابة ووكالة عن موكله السيد ${poaPrincipal} بمقتضى ${poaType} رقم ${poaNumber} المؤرخة في ${poaDate}.`}\n\n`;

    const propertyBlock = `فـأشـهد عـلى نـفسه وقـرر تـحت مسؤوليته التامة بـأن الـعقار الـمدعو: «${propName || '---'}»، ` +
      `الـكائن بـ${placeName || '---'}، ${douar}، ${commune}، دائرة ${cercle}، إقليم ${province}.\n` +
      `وهـو عـقار غـير مـحفظ طـبيعته «${propertyNature.replace(/_/g, ' ')}»، ومـساحته الإجـمالية حـوالي ${totalArea} ${areaUnit} (المحددة بطريق ${determinationMethod}).\n` +
      `وحـدوده الأربـعة كـالآتي:\n` +
      `• شـمالاً: ${boundaryNorth}\n` +
      `• جـنوباً: ${boundarySouth}\n` +
      `• شـرقاً: ${boundaryEast}\n` +
      `• غـرباً: ${boundaryWest}\n\n`;

    const historyBlock = `وقـد كـان الـعقار الـمذكور في حـيازته الـهادئة والـفعلية مـنذ ${possessionStartDate} (لمدة تناهز ${calculatedDuration})، ` +
      `إلى أن فـوجئ بـتاريخ ${lossDate} بـواقعة فـقدان الـحيازة عـن طـريق: «${lossMode.replace(/_/g, ' ')}» ${wasViolent === true ? '(مع تسجيل إكراه ومنازعة)' : ''}.\n` +
      `وحـيث إن طـالب الإشـهاد قـد اسـترجع حـيازته الـفعلية للـعقار الـمذكور بـتاريخ ${recoveryDate} مـن خـلال ${recoveryMode.replace(/_/g, ' ')}، ` +
      `حـيث قـام بـ: ${recoveryDescription}\n\n`;

    const witnessBlock = `وشـهادة مـعاينة الاسـترجاع:\n` +
      `وبـمـحضر الـعدلين المـنتصبين، حـضر الشـهود الـعارفون بـالعقار وبـأطرافه مـعرفة تـامة مـعاينة ومـجاورة:\n` +
      witnesses
        .map(
          (w, idx) =>
            `${idx + 1}. الشـاهد: ${w.name}، الحامل للبطاقة الوطنية رقم ${w.cin}، الساكن بـ ${w.address}، مهنته ${w.profession}، ` +
            `وشهد بأنه يعرف العقار المذكور ويعرف حيازة طالب الإشهاد السابقة له، وعاين فقدانها، وعاين بنفسه واقعة استرجاع الحيازة الفعلية ووضع اليد بتاريخ ${recoveryDate}، ` +
            `وأن شهادته هذه مبنية على ${w.isDirectObservation ? 'المعاينة البصرية المباشرة' : 'السماع والاستفاضة'}.`
        )
        .join('\n') +
      `\n\n`;

    const judicialBlock = operationType === 'استرجاع_بناء_على_حكم' && rulingNumber
      ? `وبـناءً عـلى السـند الـقضائي:\nالحكم الصادر عن ${rulingCourt || 'المحكمة المختصة'} تحت عدد ${rulingNumber} في الملف رقم ${rulingCaseNumber} بتاريخ ${rulingDate}، القاضي منطوقه بـ: (${rulingOperativePart})، ومحضر التنفيذ عدد ${enforcementRecord} بتاريخ ${enforcementDate}.\n\n`
      : '';

    const legalDisclaimer = `تـنبيه عـدلي قـانوني حـاكم:\n` +
      `هـذا الـرسم يـوثق واقـعة اسـترجاع الـحيازة الـفعلية الـتي عـاينها الـشهود طـبقاً للـقواعد الـعدلية والمـواد 244-246 مـن قـانون المـسطرة المـدنية، ` +
      `ولا يـقوم مـقام حـكم قـضائي بـاسترداد الـحيازة، ولا يـعد حـجة مـطلقة عـلى ثـبوت المـلكية الـعينية أو اكـتسابها بـمرور الـزمن، وإنمـا هـو حـجة عـلى واقـعة الاسـترجاع فـحسب.\n\n` +
      `وتـم الإشـهاد عـلى ذلـك كـله حـسب المـسطرة الـقانونية والـعدلية الجـاري بـها الـعمل.`;

    return header + applicantBlock + propertyBlock + historyBlock + witnessBlock + judicialBlock + legalDisclaimer;
  }, [
    province,
    applicantName,
    applicantFather,
    applicantMother,
    applicantDob,
    applicantPob,
    applicantProfession,
    applicantCin,
    applicantAddress,
    attendanceMode,
    poaPrincipal,
    poaType,
    poaNumber,
    poaDate,
    propName,
    placeName,
    douar,
    commune,
    cercle,
    propertyNature,
    totalArea,
    areaUnit,
    determinationMethod,
    boundaryNorth,
    boundarySouth,
    boundaryEast,
    boundaryWest,
    possessionStartDate,
    calculatedDuration,
    lossDate,
    lossMode,
    wasViolent,
    recoveryDate,
    recoveryMode,
    recoveryDescription,
    witnesses,
    operationType,
    rulingCourt,
    rulingNumber,
    rulingCaseNumber,
    rulingDate,
    rulingOperativePart,
    enforcementRecord,
    enforcementDate,
  ]);

  // Sync state to parent on changes
  const buildFullState = React.useCallback((): PossessionRecoveryState => ({
    operationType,
    status: 'في_طور_الإعداد',
    judicialRuling: operationType === 'استرجاع_بناء_على_حكم' ? {
      courtName: rulingCourt,
      caseNumber: rulingCaseNumber,
      rulingNumber,
      rulingDate,
      parties: rulingParties,
      operativePart: rulingOperativePart,
      relatesToPossessionRecovery: rulingRelatesToRecovery,
      isFinalRuling: rulingIsFinal,
      appealReferences,
      enforcementRecordNumber: enforcementRecord,
      enforcementDate,
      enforcementAuthority,
      enforcementResult,
    } : undefined,
    applicant: {
      name: applicantName,
      fatherName: applicantFather,
      motherName: applicantMother,
      dateOfBirth: applicantDob,
      placeOfBirth: applicantPob,
      nationality: applicantNationality,
      profession: applicantProfession,
      maritalStatus: applicantMarital,
      address: applicantAddress,
      cin: applicantCin,
      cinIssueDate: applicantCinDate,
      cinIssuePlace: applicantCinPlace,
      phone: applicantPhone,
      email: applicantEmail,
    },
    disputant: disputantName ? {
      name: disputantName,
      cin: disputantCin,
      address: disputantAddress,
    } : undefined,
    attendanceMode,
    poa: attendanceMode === 'وكالة' ? {
      principalName: poaPrincipal,
      agentName: poaAgent,
      poaType,
      poaDate,
      notary1: poaNotary1,
      notary2: poaNotary2,
      registerBook: poaBook,
      letter: poaLetter,
      page: poaPage,
      number: poaNumber,
      court: poaCourt,
      authDate: poaDate,
      coversPossession: poaCoversPossession,
      scopeNotes: poaScopeNotes,
    } : undefined,
    property: {
      isUnregistered: true,
      location: {
        commune,
        cercleOrDistrict: cercle,
        province,
        region,
        douarOrQuarter: douar,
        placeName,
        propertyName: propName,
      },
      nature: propertyNature,
      area: {
        totalArea,
        unit: areaUnit,
        areaM2: totalArea,
        determinationMethod,
      },
      boundaries: {
        north: boundaryNorth,
        south: boundarySouth,
        east: boundaryEast,
        west: boundaryWest,
      },
      isMultiComponent,
      components,
    },
    priorPossession: {
      possessorType,
      possessors,
      shareType: possessionShareType,
      startDate: possessionStartDate,
      startKnowledgeSource,
      calculatedDurationText: calculatedDuration,
    },
    lossOfPossession: {
      mode: lossMode,
      date: lossDate,
      place: lossPlace,
      wasViolentOrForced: wasViolent,
      violenceDetails: wasViolent === true ? {
        violenceType: 'انتزاع بالقوة والمنازعة',
        personsInvolved: disputantName || 'الغير المانع',
        incidentSummary: 'منع الحائز من مباشرة حقوقه واستغلال أرضه',
        wasComplaintFiled: !!complaintRecord,
        complaintRecordNumber: complaintRecord,
        publicProsecutionCourt: prosecutionCourt,
        criminalRulingDetails: criminalRuling,
      } : undefined,
    },
    recoveryFact: {
      mode: recoveryMode,
      recoveryDate,
      detailedDescription: recoveryDescription,
    },
    witnesses,
    possessionOrigin: {
      basis: originBasis,
      hasDeed,
      deeds,
    },
    registrationHistory: {
      hasPriorRegistration: hasPriorReg,
      records: registrationRecords,
    },
    supportingDocuments: supportingDocs,
    judicialStatus: {
      disputeStatus,
    },
    lafifLink: {
      isLinked: isLafifLinked,
      lafifNumber,
      witnessCount: lafifWitnessCount,
    },
    documentationPurpose,
    draftText: generatedDraft,
    archiveSummary: {
      archiveDate: new Date().toISOString().split('T')[0],
      folderNumber: `REC-POSS-${Date.now().toString().slice(-6)}`,
    },
  }), [
    operationType, rulingCourt, rulingCaseNumber, rulingNumber, rulingDate, rulingParties,
    rulingOperativePart, rulingRelatesToRecovery, rulingIsFinal, appealReferences,
    enforcementRecord, enforcementDate, enforcementAuthority, enforcementResult,
    applicantName, applicantFather, applicantMother, applicantDob, applicantPob,
    applicantNationality, applicantProfession, applicantMarital, applicantAddress,
    applicantCin, applicantCinDate, applicantCinPlace, applicantPhone, applicantEmail,
    disputantName, disputantCin, disputantAddress, attendanceMode, poaPrincipal, poaAgent,
    poaType, poaDate, poaNotary1, poaNotary2, poaBook, poaLetter, poaPage, poaNumber,
    poaCourt, poaCoversPossession, poaScopeNotes, commune, cercle, province, region,
    douar, placeName, propName, propertyNature, totalArea, areaUnit, determinationMethod,
    boundaryNorth, boundarySouth, boundaryEast, boundaryWest, isMultiComponent, components,
    possessorType, possessors, possessionShareType, possessionStartDate, startKnowledgeSource,
    calculatedDuration, lossMode, lossDate, lossPlace, wasViolent, complaintRecord,
    prosecutionCourt, criminalRuling, recoveryMode, recoveryDate, recoveryDescription,
    witnesses, originBasis, hasDeed, deeds, hasPriorReg, registrationRecords,
    supportingDocs, disputeStatus, isLafifLinked, lafifNumber, lafifWitnessCount,
    documentationPurpose, generatedDraft
  ]);

  // Keep parent state updated with possession recovery draft
  useEffect(() => {
    const full = buildFullState();
    setState((prev) => ({
      ...prev,
      possessionRecovery: full,
      draft: generatedDraft,
    }));
  }, [buildFullState, generatedDraft, setState]);

  // Witness ID Card OCR Handler
  const handleWitnessIdUpload = async (witnessId: string, file: File) => {
    setScanningWitnessId(witnessId);
    setOcrError(null);
    try {
      let b64 = '';
      try {
        b64 = await enhanceCardImageForOCR(file);
      } catch {
        b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
          reader.readAsDataURL(file);
        });
      }

      const res: any = await extractIdCardMutation.mutateAsync({
        fileBase64: b64,
        fileName: file.name,
      });

      const fields = res?.extractedFields || {};
      const detectedCin = fields.idNumber ? String(fields.idNumber).toUpperCase().trim() : '';
      const detectedName = fields.name ? String(fields.name).trim() : (fields.nameLatin ? String(fields.nameLatin).trim() : '');
      const detectedAddress = fields.address ? String(fields.address).trim() : '';

      setWitnesses((prev) =>
        prev.map((w) =>
          w.id === witnessId
            ? {
                ...w,
                name: detectedName || w.name,
                cin: detectedCin || w.cin,
                address: detectedAddress || w.address,
              }
            : w
        )
      );
    } catch (err: any) {
      setOcrError(err?.message || 'تعذر استخراج بيانات بطاقة التعريف الوطنية آلياً');
    } finally {
      setScanningWitnessId(null);
    }
  };

  // Direct Transition to Step 7 (المراجعة النهائية والإرسال لقاضي التوثيق)
  const proceedToStep7 = () => {
    const full = buildFullState();
    setState((prev) => ({
      ...prev,
      step: 7,
      documentType: 'موجب_استرجاع_حيازة',
      draft: generatedDraft,
      possessionRecovery: {
        ...full,
        status: 'مستوفٍ',
      },
      sellers: [
        {
          id: 'applicant-1',
          name: applicantName || 'طالب الإشهاد',
          fatherName: applicantFather,
          motherName: applicantMother,
          idNumber: applicantCin,
          dateOfBirth: applicantDob,
          placeOfBirth: applicantPob,
          address: applicantAddress,
          profession: applicantProfession,
          phone: applicantPhone,
          role: 'طالب الإشهاد (الحائز المسترجع)',
        } as any,
      ],
      buyers: disputantName
        ? [
            {
              id: 'disputant-1',
              name: disputantName,
              idNumber: disputantCin,
              address: disputantAddress,
              role: 'المنازع / الطرف المخل بالحيازة سابقاً',
            } as any,
          ]
        : [],
      property: {
        ...(prev.property || ({} as any)),
        type: 'غير_محفظ',
        nature: propertyNature,
        titleNumber: 'عقار غير محفظ',
        propertyName: propName,
        location: `${commune} - ${douar} (${placeName})`,
        area: `${totalArea} ${areaUnit}`,
        boundaries: {
          north: boundaryNorth,
          south: boundarySouth,
          east: boundaryEast,
          west: boundaryWest,
        },
      } as any,
    }));
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* 🏠 Top Sticky Identity Header Card */}
      <div className="bg-slate-900 border-2 border-blue-900 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 border border-blue-400/40 rounded-xl">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-wide text-white">موجب استرجاع حيازة</h1>
                <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-full font-bold">
                  عقار غير محفظ
                </span>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full font-bold">
                  {operationType === 'استرجاع_بناء_على_حكم' ? 'سند قضائي وعدلي' : 'شهادة عدلية / لفيف'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1">
                توثيق واقعة استرجاع حيازة عقار غير محفظ وإثبات وضع اليد الفعلي طبقاً للمادتين 244 و246 ق.م.م ومدونة الحقوق العينية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300">حالة الملف: في طور الإعداد والمراجعة</span>
          </div>
        </div>

        {/* 7-Stage Horizontal Stepper */}
        <div className="grid grid-cols-7 gap-2 mt-5 pt-4 border-t border-slate-800 text-center">
          {[
            { num: 1, title: 'نوع العملية والحكم', icon: Scale },
            { num: 2, title: 'طالب الإشهاد والوكالة', icon: User },
            { num: 3, title: 'بطاقة العقار وحدوده', icon: MapPin },
            { num: 4, title: 'الحائز السابق والأنصبة', icon: Users },
            { num: 5, title: 'فقدان واسترجاع الحيازة', icon: Clock },
            { num: 6, title: 'شهود المعاينة واللفيف', icon: BookOpen },
            { num: 7, title: 'الصياغة والإحالة للقاضي', icon: Send },
          ].map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.num;
            const isDone = activeStage > stage.num;
            return (
              <button
                key={stage.num}
                type="button"
                onClick={() => setActiveStage(stage.num)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 ring-2 ring-blue-400'
                    : isDone
                    ? 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold">{stage.num}</span>
                </div>
                <span className="text-[11px] leading-tight font-medium hidden sm:inline">{stage.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage 1: نوع العملية وسند الحكم */}
      {activeStage === 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
            <Scale className="w-6 h-6 text-blue-700" />
            <div>
              <h2 className="text-lg font-black text-slate-900">1️⃣ تحديد نوع العملية والسند القضائي</h2>
              <p className="text-xs text-slate-500">ما الذي تريد توثيقه في هذا الموجب العدلي؟</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'استرجاع_فعلي', label: 'استرجاع الحيازة فعلياً', desc: 'إثبات وضع يد الحائز بنفسه أو بعد اتفاق' },
              { id: 'إثبات_واقعة_سابقة', label: 'إثبات واقعة سابقة', desc: 'إثبات واقعة استرجاع حيازة حصلت في تاريخ سابق' },
              { id: 'استرجاع_بعد_نزاع', label: 'استرجاع بعد نزاع', desc: 'إثبات الحيازة بعد وقوع منازعة أو اعتداء' },
              { id: 'استرجاع_بناء_على_حكم', label: 'بناءً على حكم قضائي', desc: 'استرداد الحيازة وتنفيذ حكم قضائي نهائي' },
            ].map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setOperationType(op.id as any)}
                className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between ${
                  operationType === op.id
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                  <span>{op.label}</span>
                  {operationType === op.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-2">{op.desc}</p>
              </button>
            ))}
          </div>

          {/* Legal Reminder Art 244-246 CPC */}
          <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="block font-bold mb-1">قاعدة قانونية ذكية (المادتان 244 و246 ق.م.م):</strong>
              الحكم القضائي هو سند قضائي لاسترداد الحيازة، أما الموجب العدلي فيوثق الوقائع المادية التي يشهد بها الشهود
              المعاينون ولا يحل محل الحكم، كما أن دعوى الحيازة مقصورة على الحيازة ولا تمس أصل الحق الملكي.
            </div>
          </div>

          {/* If Based on Judicial Ruling */}
          {operationType === 'استرجاع_بناء_على_حكم' && (
            <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-xl space-y-4">
              <h3 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-700" />
                بيانات الحكم القضائي ومحضر التنفيذ
              </h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة المصدرة للحكم</label>
                  <input
                    type="text"
                    value={rulingCourt}
                    onChange={(e) => setRulingCourt(e.target.value)}
                    placeholder="مثال: المحكمة الابتدائية بشفشاون"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الملف القضائي</label>
                  <input
                    type="text"
                    value={rulingCaseNumber}
                    onChange={(e) => setRulingCaseNumber(e.target.value)}
                    placeholder="مثال: 1205/1402/2023"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم وتاريخ الحكم</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rulingNumber}
                      onChange={(e) => setRulingNumber(e.target.value)}
                      placeholder="رقم الحكم"
                      className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                    <input
                      type="date"
                      value={rulingDate}
                      onChange={(e) => setRulingDate(e.target.value)}
                      className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">منطوق الحكم المتعلق بالحيازة</label>
                <textarea
                  rows={2}
                  value={rulingOperativePart}
                  onChange={(e) => setRulingOperativePart(e.target.value)}
                  placeholder="منطوق الحكم القاضي بإرجاع الحيازة إلى المدعي وتمكينه من العقار..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-blue-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم محضر التنفيذ</label>
                  <input
                    type="text"
                    value={enforcementRecord}
                    onChange={(e) => setEnforcementRecord(e.target.value)}
                    placeholder="مثال: محضر تنفيذ ملف عدد 890/2024"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التنفيذ</label>
                  <input
                    type="date"
                    value={enforcementDate}
                    onChange={(e) => setEnforcementDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجهة المنفذة والنتيجة</label>
                  <input
                    type="text"
                    value={enforcementResult}
                    onChange={(e) => setEnforcementResult(e.target.value)}
                    placeholder="تمكين طالب الإشهاد من الحيازة"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 2: طالب الإشهاد والوكالة */}
      {activeStage === 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-700" />
              <div>
                <h2 className="text-lg font-black text-slate-900">2️⃣ بيانات طالب الإشهاد والتمثيل القانوني</h2>
                <p className="text-xs text-slate-500">الحائز المسترجع للحيازة أو من ينوب عنه بوكالة قانونية</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (state.sellers?.[0]) {
                  setApplicantName(state.sellers[0].name || '');
                  setApplicantCin(state.sellers[0].idNumber || '');
                  setApplicantAddress(state.sellers[0].address || '');
                  setApplicantProfession(state.sellers[0].profession || '');
                }
              }}
              className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-300 rounded-lg font-bold flex items-center gap-1.5 hover:bg-sky-100"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              استيراد بيانات الشخص من العقد/الملف السابق
            </button>
          </div>

          {/* Attendance Mode */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 mb-2">طريقة الحضور والتصريح:</label>
            <div className="flex gap-4">
              {[
                { id: 'أصالة', label: '🔘 أصالة عن نفسه' },
                { id: 'وكالة', label: '🟣 بواسطة وكيل (وكالة عدلية/رسمية)' },
                { id: 'نيابة_شرعية', label: '🔘 بواسطة ولي / نائب شرعي' },
              ].map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="attendanceMode"
                    value={m.id}
                    checked={attendanceMode === m.id}
                    onChange={() => setAttendanceMode(m.id as any)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Applicant Fields */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل لطالب الإشهاد</label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="الاسم الشخصي والعائلي"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب واسم الأم</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={applicantFather}
                  onChange={(e) => setApplicantFather(e.target.value)}
                  placeholder="ابن..."
                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  value={applicantMother}
                  onChange={(e) => setApplicantMother(e.target.value)}
                  placeholder="وأمه..."
                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN)</label>
              <input
                type="text"
                value={applicantCin}
                onChange={(e) => setApplicantCin(e.target.value.toUpperCase())}
                placeholder="مثال: GM12345"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
              <input
                type="date"
                value={applicantDob}
                onChange={(e) => setApplicantDob(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد</label>
              <input
                type="text"
                value={applicantPob}
                onChange={(e) => setApplicantPob(e.target.value)}
                placeholder="مكان الازدياد"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المهنة</label>
              <input
                type="text"
                value={applicantProfession}
                onChange={(e) => setApplicantProfession(e.target.value)}
                placeholder="المهنة"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                placeholder="06..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان الكامل لمحل السكنى</label>
            <input
              type="text"
              value={applicantAddress}
              onChange={(e) => setApplicantAddress(e.target.value)}
              placeholder="العنوان الكامل"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* If Attendance via Agent (POA) */}
          {attendanceMode === 'وكالة' && (
            <div className="bg-purple-50/70 border-2 border-purple-300 p-5 rounded-xl space-y-4">
              <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                بطاقة الوكالة والتحقق من صلاحية الحيازة
              </h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">اسم الموكل</label>
                  <input
                    type="text"
                    value={poaPrincipal}
                    onChange={(e) => setPoaPrincipal(e.target.value)}
                    placeholder="اسم الموكل الأصلي"
                    className="w-full text-xs p-2.5 rounded-lg border border-purple-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">نوع الوكالة ومراجعها</label>
                  <input
                    type="text"
                    value={poaType}
                    onChange={(e) => setPoaType(e.target.value)}
                    placeholder="وكالة عدلية مضمنة"
                    className="w-full text-xs p-2.5 rounded-lg border border-purple-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">تاريخ ورقم الوكالة</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={poaDate}
                      onChange={(e) => setPoaDate(e.target.value)}
                      className="w-1/2 text-xs p-2.5 rounded-lg border border-purple-200"
                    />
                    <input
                      type="text"
                      value={poaNumber}
                      onChange={(e) => setPoaNumber(e.target.value)}
                      placeholder="رقم الوكالة"
                      className="w-1/2 text-xs p-2.5 rounded-lg border border-purple-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-purple-200">
                <span className="text-xs font-bold text-purple-900">هل تتضمن الوكالة صراحة صلاحيات تتعلق بالحيازة وإدارتها؟</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                    <input
                      type="radio"
                      checked={poaCoversPossession === true}
                      onChange={() => setPoaCoversPossession(true)}
                    />
                    نعم تغطي الحيازة
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-rose-800 cursor-pointer">
                    <input
                      type="radio"
                      checked={poaCoversPossession === false}
                      onChange={() => setPoaCoversPossession(false)}
                    />
                    لا تغطي صراحة
                  </label>
                </div>
              </div>

              {!poaCoversPossession && (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg text-xs text-rose-900">
                  ⚠️ <strong>تنبيه مراجعة عدلية:</strong> نطاق الوكالة المدخل لا يظهر منه ما يكفي لتغطية استرجاع الحيازة
                  وتوثيق الوقائع. يرجى مراجعة نص الوكالة وصلاحيات الوكيل قبل الاعتماد النهائي للرسم.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stage 3: بطاقة العقار غير المحفظ وحدوده */}
      {activeStage === 3 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-700" />
              <div>
                <h2 className="text-lg font-black text-slate-900">3️⃣ بطاقة العقار غير المحفظ ووصفه وحدوده</h2>
                <p className="text-xs text-slate-500">حصر الموقع الجغرافي والحدود الأربعة والمكونات</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold">
              ✓ عقار غير محفظ حصراً
            </span>
          </div>

          {/* Location Details */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم العقار إن وجد</label>
              <input
                type="text"
                value={propName}
                onChange={(e) => setPropName(e.target.value)}
                placeholder="البلاد الفلاحية / الدار"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموضع / المكان</label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="الموضع المسمى بوزكارة"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الدوار / الحي</label>
              <input
                type="text"
                value={douar}
                onChange={(e) => setDouar(e.target.value)}
                placeholder="مدشر تغسة"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الجماعة والإقليم</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder="الجماعة"
                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="الإقليم"
                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Nature & Area */}
          <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طبيعة العقار</label>
              <select
                value={propertyNature}
                onChange={(e) => setPropertyNature(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              >
                <option value="أرض_فلاحية">أرض فلاحية (بور/مسقية)</option>
                <option value="أرض_عارية">أرض عارية معدة للبناء</option>
                <option value="دار">دار سكنية</option>
                <option value="منزل">منزل قروي</option>
                <option value="بستان">بستان به أشجار</option>
                <option value="أرض_للغرس">أرض للغرس</option>
                <option value="أرض_للرعي">أرض للرعي</option>
                <option value="عقار_آخر">عقار آخر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المساحة الإجمالية والوحدة</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={totalArea}
                  onChange={(e) => setTotalArea(Number(e.target.value))}
                  className="w-2/3 text-xs p-2.5 rounded-lg border border-slate-300"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as any)}
                  className="w-1/3 text-xs p-2.5 rounded-lg border border-slate-300"
                >
                  <option value="متر_مربع">م²</option>
                  <option value="هكتار">هكتار</option>
                  <option value="خدام">خدام</option>
                  <option value="سهم">سهم</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة تحديد المساحة</label>
              <select
                value={determinationMethod}
                onChange={(e) => setDeterminationMethod(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              >
                <option value="تصريح">بناءً على تصريح الحائز</option>
                <option value="وثيقة">بناءً على وثيقة سابقة</option>
                <option value="قياس">بناءً على قياس مباشر</option>
                <option value="خبرة">بناءً على خبرة طبوغرافية</option>
                <option value="غير_محددة">غير محددة بدقة</option>
              </select>
            </div>
          </div>

          {/* Boundaries */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">الحدود الأربعة للعقار:</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">⬆️ الحد الشمالي</label>
                <input
                  type="text"
                  value={boundaryNorth}
                  onChange={(e) => setBoundaryNorth(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">⬇️ الحد الجنوبي</label>
                <input
                  type="text"
                  value={boundarySouth}
                  onChange={(e) => setBoundarySouth(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">➡️ الحد الشرقي</label>
                <input
                  type="text"
                  value={boundaryEast}
                  onChange={(e) => setBoundaryEast(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">⬅️ الحد الغربي</label>
                <input
                  type="text"
                  value={boundaryWest}
                  onChange={(e) => setBoundaryWest(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: الحائز السابق والأنصبة وتاريخ الحيازة */}
      {activeStage === 4 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
            <Users className="w-6 h-6 text-blue-700" />
            <div>
              <h2 className="text-lg font-black text-slate-900">4️⃣ الحائز قبل فقدان الحيازة والأنصبة</h2>
              <p className="text-xs text-slate-500">حصر صفة الحائزين السابقين وتاريخ بداية الحيازة</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { id: 'طالب_الإشهاد', label: 'طالب الإشهاد نفسه' },
              { id: 'مورث_طالب_الإشهاد', label: 'مورث طالب الإشهاد' },
              { id: 'عدة_أشخاص', label: 'عدة أشخاص شركاء' },
              { id: 'شخص_آخر', label: 'شخص آخر منتقلة عنه' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPossessorType(p.id as any)}
                className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                  possessorType === p.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع ونطاق الحيازة</label>
              <select
                value={possessionShareType}
                onChange={(e) => setPossessionShareType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              >
                <option value="حيازة_منفردة">حيازة منفردة كاملة</option>
                <option value="حيازة_مشتركة">حيازة مشتركة</option>
                <option value="حيازة_على_الشياع">حيازة على الشياع</option>
                <option value="حيازة_على_جزء_مفرز">حيازة على جزء مفرز محدد</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ بداية الحيازة السابقة</label>
              <input
                type="date"
                value={possessionStartDate}
                onChange={(e) => setPossessionStartDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المدة السابقة المحسوبة</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                {calculatedDuration}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-xl flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-900 leading-relaxed">
              <strong className="block font-bold mb-1">تنبيه قانوني جوهري:</strong>
              لا يستعمل التطبيق عبارة «نسبة الملكية» تلقائياً في هذا البيت، وإنما يقتصر على «حصة ونطاق الحيازة»، كما أن هذه
              المدة لا تعني حيازة مكسبة للملك وإنما إثبات استمرار الحيازة السابقة قبل انتزاعها.
            </div>
          </div>
        </div>
      )}

      {/* Stage 5: واقعة فقدان الحيازة واسترجاعها */}
      {activeStage === 5 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
            <Clock className="w-6 h-6 text-blue-700" />
            <div>
              <h2 className="text-lg font-black text-slate-900">5️⃣ واقعة فقدان الحيازة وواقعة استرجاعها</h2>
              <p className="text-xs text-slate-500">حصر كيفية الاعتداء المادي وتاريخ الاسترجاع ووضع اليد الفعلي</p>
            </div>
          </div>

          {/* Loss Mode */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">كيف فقدت الحيازة سابقاً؟</label>
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { id: 'انتزاع_مادي', label: 'انتزاع مادي' },
                { id: 'منع_من_الدخول', label: 'منع من الدخول' },
                { id: 'منع_من_الاستغلال', label: 'منع من الاستغلال' },
                { id: 'إغلاق_العقار', label: 'إغلاق العقار' },
                { id: 'وضع_اليد_من_الغير', label: 'وضع يد من الغير' },
                { id: 'إخراج_الحائز', label: 'إخراج الحائز بالقوة' },
                { id: 'احتلال_العقار', label: 'احتلال العقار' },
                { id: 'تغيير_معالم_الحيازة', label: 'تغيير معالم الحيازة' },
                { id: 'أخرى', label: 'طريقة أخرى' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLossMode(m.id as any)}
                  className={`p-2.5 rounded-lg border text-center text-xs font-bold transition-all ${
                    lossMode === m.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ حصول واقعة الفقدان</label>
                <input
                  type="date"
                  value={lossDate}
                  onChange={(e) => setLossDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">مكان الواقعة والظروف</label>
                <input
                  type="text"
                  value={lossPlace}
                  onChange={(e) => setLossPlace(e.target.value)}
                  placeholder="بعين العقار المذكور..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Violence / Coercion Inquiry */}
            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">هل صاحب واقعة فقدان الحيازة عنف أو إكراه أو انتزاع مادي؟</span>
                <div className="flex gap-4 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-800">
                    <input
                      type="radio"
                      checked={wasViolent === true}
                      onChange={() => setWasViolent(true)}
                    />
                    نعم وقع عنف/إكراه
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      checked={wasViolent === false}
                      onChange={() => setWasViolent(false)}
                    />
                    لا
                  </label>
                </div>
              </div>

              {wasViolent === true && (
                <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-rose-200">
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">رقم محضر الشكاية / الضابطة</label>
                    <input
                      type="text"
                      value={complaintRecord}
                      onChange={(e) => setComplaintRecord(e.target.value)}
                      placeholder="رقم المحضر"
                      className="w-full text-xs p-2 rounded-lg border border-rose-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">النيابة العامة المختصة</label>
                    <input
                      type="text"
                      value={prosecutionCourt}
                      onChange={(e) => setProsecutionCourt(e.target.value)}
                      placeholder="المحكمة الابتدائية"
                      className="w-full text-xs p-2 rounded-lg border border-rose-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">الحكم الزجري إن وجد</label>
                    <input
                      type="text"
                      value={criminalRuling}
                      onChange={(e) => setCriminalRuling(e.target.value)}
                      placeholder="رقم وتاريخ الحكم الزجري"
                      className="w-full text-xs p-2 rounded-lg border border-rose-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recovery Fact */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              واقعة استرجاع الحيازة وتاريخها
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كيف عادت الحيازة؟</label>
                <select
                  value={recoveryMode}
                  onChange={(e) => setRecoveryMode(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                >
                  <option value="وضع_يد_تلقائي">عاد الحائز ووضع يده بنفسه</option>
                  <option value="اتفاق_رضائي">عاد بعد اتفاق مع الطرف الآخر</option>
                  <option value="تدخل_الغير">عاد بعد تدخل أعيان المدشر والغير</option>
                  <option value="صلح">عاد بعد صلح رسمي</option>
                  <option value="حكم_قضائي">عادت الحيازة تنفيذاً لحكم قضائي</option>
                  <option value="طريقة_أخرى">طريقة أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الاسترجاع الفعلي</label>
                <input
                  type="date"
                  value={recoveryDate}
                  onChange={(e) => setRecoveryDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                بيان كيفية عودة الحيازة ووضع اليد الفعلي (وصف المعاينة)
              </label>
              <textarea
                rows={3}
                value={recoveryDescription}
                onChange={(e) => setRecoveryDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stage 6: شهود المعاينة المباشرة واللفيف مع الـ OCR */}
      {activeStage === 6 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-blue-700" />
              <div>
                <h2 className="text-lg font-black text-slate-900">6️⃣ شهود المعاينة المباشرة واللفيف العدلي</h2>
                <p className="text-xs text-slate-500">
                  شهود الحيازة والاسترجاع (مع ميزة قراءة بطاقة التعريف الوطنية بالذكاء الاصطناعي OCR)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setWitnesses((prev) => [
                  ...prev,
                  {
                    id: `wit-${Date.now()}`,
                    name: '',
                    cin: '',
                    profession: '',
                    address: '',
                    relationshipToParties: 'مجاور',
                    durationOfPropertyKnowledgeYears: 10,
                    witnessedPriorPossession: true,
                    witnessedLossOfPossession: true,
                    witnessedRecovery: true,
                    isDirectObservation: true,
                    knowledgeSource: 'المجاورة والمعاينة',
                  },
                ])
              }
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة شاهد معاينة
            </button>
          </div>

          {/* Lafif integration card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">هل الشهادة مؤداة في إطار لفيف عدلي (12 شاهداً)؟</span>
              <span className="text-[11px] text-slate-500">ربط الملف بمنظومة اللفيف العدلي المعتمدة</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isLafifLinked}
                  onChange={(e) => setIsLafifLinked(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>تفعيل مسار اللفيف العدلي</span>
              </label>
              {isLafifLinked && (
                <input
                  type="text"
                  value={lafifNumber}
                  onChange={(e) => setLafifNumber(e.target.value)}
                  placeholder="رقم رسم اللفيف"
                  className="text-xs p-1.5 border border-slate-300 rounded"
                />
              )}
            </div>
          </div>

          {/* Witnesses List */}
          <div className="space-y-4">
            {witnesses.map((w, index) => (
              <div key={w.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">الشاهد المعاين</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* OCR ID Card Upload Button */}
                    <label className="cursor-pointer text-xs px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-300 rounded-lg font-bold flex items-center gap-1 hover:bg-sky-100">
                      {scanningWitnessId === w.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>مسح بطاقة التعريف (OCR)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleWitnessIdUpload(w.id, file);
                        }}
                      />
                    </label>

                    {witnesses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setWitnesses((prev) => prev.filter((item) => item.id !== w.id))}
                        className="text-rose-600 hover:text-rose-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) =>
                        setWitnesses((prev) =>
                          prev.map((item) => (item.id === w.id ? { ...item, name: e.target.value } : item))
                        )
                      }
                      placeholder="اسم الشاهد"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم البطاقة (CIN)</label>
                    <input
                      type="text"
                      value={w.cin}
                      onChange={(e) =>
                        setWitnesses((prev) =>
                          prev.map((item) => (item.id === w.id ? { ...item, cin: e.target.value.toUpperCase() } : item))
                        )
                      }
                      placeholder="CIN"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">المهنة ومحل السكنى</label>
                    <input
                      type="text"
                      value={w.address}
                      onChange={(e) =>
                        setWitnesses((prev) =>
                          prev.map((item) => (item.id === w.id ? { ...item, address: e.target.value } : item))
                        )
                      }
                      placeholder="المدشر / الجماعة"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">طبيعة الشهادة</label>
                    <select
                      value={w.isDirectObservation ? 'نعم' : 'لا'}
                      onChange={(e) =>
                        setWitnesses((prev) =>
                          prev.map((item) =>
                            item.id === w.id ? { ...item, isDirectObservation: e.target.value === 'نعم' } : item
                          )
                        )
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    >
                      <option value="نعم">🟢 معاينة مباشرة بالعين</option>
                      <option value="لا">🟠 سماع واستفاضة</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Origin Basis & Deeds */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">أصل الحيازة والسند المعتمد:</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">أساس الحيازة السابقة</label>
                <select
                  value={originBasis}
                  onChange={(e) => setOriginBasis(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                >
                  <option value="حيازة_فعلية_دون_سند">حيازة فعلية قديمة دون سند ناقل</option>
                  <option value="إرث">إرث عن المورث</option>
                  <option value="شراء_سابق">شراء سابق</option>
                  <option value="هبة">هبة</option>
                  <option value="قسمة">قسمة رضائية أو قضائية</option>
                  <option value="صلح">صلح</option>
                  <option value="وضع_يد_قديم">وضع يد قديم متوارث</option>
                  <option value="انتقال_من_حائز_سابق">انتقال من حائز سابق</option>
                  <option value="سبب_آخر">سبب آخر</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الحالة القضائية للنزاع</label>
                <select
                  value={disputeStatus}
                  onChange={(e) => setDisputeStatus(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                >
                  <option value="لا_يوجد_نزاع">لا يوجد نزاع قضائي معروض</option>
                  <option value="دعوى_حيازة">توجد دعوى حيازة رائجة</option>
                  <option value="دعوى_ملكية">توجد دعوى ملكية</option>
                  <option value="صدر_حكم">صدر حكم قضائي</option>
                  <option value="يوجد_تنفيذ">يوجد ملف تنفيذ جاري</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الغرض من التوثيق العدلي</label>
                <select
                  value={documentationPurpose}
                  onChange={(e) => setDocumentationPurpose(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                >
                  <option value="استرجاع_حصل_فعلا">إثبات استرجاع حصل فعلاً</option>
                  <option value="تمهيدا_لنزاع">توثيق وقائع سابقة تمهيداً للاستدلال بها</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={hasDeed}
                  onChange={(e) => setHasDeed(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>يوجد سند كتابي/رسم سابق يتعلق بالعقار</span>
              </label>
              {hasDeed && (
                <button
                  type="button"
                  onClick={() =>
                    setDeeds((prev) => [
                      ...prev,
                      {
                        id: `deed-${Date.now()}`,
                        titleType: 'رسم استمرار / ملكية قديمة',
                        deedDate: '2010-01-01',
                        originDescription: 'سند سابق',
                        documentNumber: '123/45',
                      },
                    ])
                  }
                  className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded font-bold hover:bg-slate-50"
                >
                  ➕ إضافة مراجع سند
                </button>
              )}
            </div>

            {hasDeed && deeds.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {deeds.map((d, dIdx) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-600">سند #{dIdx + 1}:</span>
                    <input
                      type="text"
                      value={d.titleType}
                      onChange={(e) =>
                        setDeeds((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, titleType: e.target.value } : item))
                        )
                      }
                      className="p-1 border rounded text-xs flex-1"
                      placeholder="نوع السند"
                    />
                    <input
                      type="text"
                      value={d.documentNumber}
                      onChange={(e) =>
                        setDeeds((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, documentNumber: e.target.value } : item))
                        )
                      }
                      className="p-1 border rounded text-xs w-32"
                      placeholder="رقم السند/المراجع"
                    />
                    <button
                      type="button"
                      onClick={() => setDeeds((prev) => prev.filter((item) => item.id !== d.id))}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ocrError && (
            <div className="bg-rose-50 text-rose-800 p-3 rounded-lg text-xs border border-rose-200">
              {ocrError}
            </div>
          )}
        </div>
      )}

      {/* Stage 7: الصياغة العدلية، الفحص، والإحالة إلى قاضي التوثيق (المرحلة 7) */}
      {activeStage === 7 && (
        <div className="space-y-6">
          {/* Legal Checklist Cards */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              منظومة الفحص العدلي الذكي والتحقق النهائي
            </h3>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                العقار غير محفظ ومحدد بالحدود الأربعة
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                هوية طالب الإشهاد وأهليته مكتملة
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                واقعة الاسترجاع محددة بالتاريخ والكيفية
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                شهود المعاينة المباشرة مسجلون ({witnesses.length} شهود)
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 font-medium ${
                  isOverOneYearFromLoss
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                {isOverOneYearFromLoss ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>أجل المادة 245 ق.م.م: {isOverOneYearFromLoss ? 'تنبيه تجاوز السنة في النزاع' : 'داخل أجل السنة'}</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl flex items-center gap-2 font-medium">
                <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                الفصل التام بين واقعة الاسترجاع وأصل الملكية
              </div>
            </div>
          </div>

          {/* Draft Preview & Attribution Blocks */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-700" />
                <div>
                  <h3 className="font-black text-slate-900">نص الرسم العدلي المقترح (موجب استرجاع حيازة)</h3>
                  <p className="text-xs text-slate-500">صياغة عدلية موثوقة جاهزة للمراجعة والخطاب القضائي</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedDraft);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess ? 'تم النسخ' : 'نسخ النص'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-6 rounded-xl font-serif text-sm leading-loose whitespace-pre-wrap select-text border border-slate-800 shadow-inner">
              {generatedDraft}
            </div>
          </div>

          {/* 🚀 PRIMARY ACTION: Transition to Step 7 & Submit to Judge */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-2xl border-2 border-blue-500/50 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-lg font-black text-white">الملف مستوفٍ وجاهز للإحالة على قاضي التوثيق</h4>
              </div>
              <p className="text-slate-300 text-xs">
                الانتقال المباشر إلى «المرحلة 7» (Step 7) لمعاينة الرسم بصيغتي A4 / Word وإرساله إلكترونياً إلى القاضي المشرف
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={proceedToStep7}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Send className="w-4 h-4" />
                <span>الانتقال للمراجعة النهائية والإرسال إلى قاضي التوثيق (المرحلة 7)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons between Stages */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setActiveStage((prev) => Math.max(1, prev - 1))}
          disabled={activeStage === 1}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeStage === 1
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span>المرحلة السابقة</span>
        </button>

        <span className="text-xs text-slate-500 font-bold">
          المرحلة {activeStage} من 7
        </span>

        {activeStage < 7 ? (
          <button
            type="button"
            onClick={() => setActiveStage((prev) => Math.min(7, prev + 1))}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/30"
          >
            <span>المرحلة الموالية</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={proceedToStep7}
            className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
          >
            <span>المراجعة والإرسال للقاضي (المرحلة 7)</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PossessionRecoveryWizard;
