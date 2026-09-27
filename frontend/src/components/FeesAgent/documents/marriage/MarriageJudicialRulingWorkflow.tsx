import React, { useState, useMemo, useEffect } from 'react';
import type { FeesAgentState, MarriageJudicialRulingDeed } from '../../../../types/feesAgentTypes';
import { convertNumberToArabicWords } from '../../../../utils/feesAgentUtils';
import {
  Scale, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  RefreshCw, Upload, ShieldCheck,
  Building, User, Calendar, DollarSign, FileCheck,
  ChevronRight
} from 'lucide-react';

interface Props {
  state: FeesAgentState;
  setState: React.Dispatch<React.SetStateAction<FeesAgentState>>;
  onComplete?: () => void;
  onBack?: () => void;
}

export const MarriageJudicialRulingWorkflow: React.FC<Props> = ({
  state,
  setState,
  onComplete,
  onBack,
}) => {
  // Active tab / stage for smooth navigation
  const [activeTab, setActiveTab] = useState<string>('ruling_source');

  // Initialize or load ruling deed data from state
  const existingDeed = state.marriageJudicialRulingDeed;

  // 1 & 2. Snd & Court Data State
  const [rulingSource, setRulingSource] = useState<'import' | 'manual'>(
    existingDeed?.rulingSource || 'manual'
  );
  const [court, setCourt] = useState<string>(
    existingDeed?.courtData?.court || (state.meta?.court ? `المحكمة الابتدائية بـ${state.meta.court}` : '')
  );
  const [section, setSection] = useState<string>(
    existingDeed?.courtData?.section || 'قسم قضاء الأسرة'
  );
  const [fileNumber, setFileNumber] = useState<string>(
    existingDeed?.courtData?.fileNumber || ''
  );
  const [rulingNumber, setRulingNumber] = useState<string>(
    existingDeed?.courtData?.rulingNumber || ''
  );
  const [rulingDate, setRulingDate] = useState<string>(
    existingDeed?.courtData?.rulingDate || ''
  );
  const [rulingType] = useState<string>('حكم بثبوت الزوجية');
  const [rulingStatus, setRulingStatus] = useState<
    'حكم نهائي' | 'حائز لقوة الشيء المقضي به' | 'مرفق بما يفيد صيرورته نهائيًا/قابلاً للتوثيق' | 'حالة أخرى حسب الوثيقة القضائية' | ''
  >(existingDeed?.courtData?.rulingStatus || '');
  const [rulingStatusOther, setRulingStatusOther] = useState<string>(
    existingDeed?.courtData?.rulingStatusOther || ''
  );
  const [attachedDocumentName, setAttachedDocumentName] = useState<string>(
    existingDeed?.courtData?.attachedDocumentName || ''
  );

  // 3. Identity Verification & Original Names in Ruling
  const [rulingHusbandName, setRulingHusbandName] = useState<string>(
    existingDeed?.rulingOriginalNames?.husbandFullName || ''
  );
  const [rulingWifeName, setRulingWifeName] = useState<string>(
    existingDeed?.rulingOriginalNames?.wifeFullName || ''
  );
  const [matchesIdentityDocs, setMatchesIdentityDocs] = useState<boolean | null>(
    existingDeed?.identityVerification?.matchesIdentityDocs ?? null
  );
  const [discrepancyType, setDiscrepancyType] = useState<'بسيط' | 'جوهري' | ''>(
    existingDeed?.identityVerification?.hasSubstantialDiscrepancy ? 'جوهري' : ''
  );
  const [discrepancyReason, setDiscrepancyReason] = useState<string>(
    existingDeed?.identityVerification?.discrepancyReason || ''
  );

  // 4. Husband Data (Current)
  const [hFirstName, setHFirstName] = useState(existingDeed?.husband?.firstName || '');
  const [hLastName, setHLastName] = useState(existingDeed?.husband?.lastName || '');
  const [hBirthDate, setHBirthDate] = useState(existingDeed?.husband?.dateOfBirth || '');
  const [hBirthPlace, setHBirthPlace] = useState(existingDeed?.husband?.placeOfBirth || '');
  const [hNationality, setHNationality] = useState(existingDeed?.husband?.nationality || 'مغربية');
  const [hCin, setHCin] = useState(existingDeed?.husband?.idNumber || '');
  const [hProfession, setHProfession] = useState(existingDeed?.husband?.profession || '');
  const [hAddress, setHAddress] = useState(existingDeed?.husband?.currentAddress || '');
  const [hIsAbroad, setHIsAbroad] = useState(existingDeed?.husband?.isAbroad || false);
  const [hAbroadCountry, setHAbroadCountry] = useState(existingDeed?.husband?.abroadCountry || '');
  const [hAbroadCity, setHAbroadCity] = useState(existingDeed?.husband?.abroadCity || '');
  const [hAbroadAddressAr, setHAbroadAddressAr] = useState(existingDeed?.husband?.abroadAddressAr || '');
  const [hAbroadAddressLat, setHAbroadAddressLat] = useState(existingDeed?.husband?.abroadAddressLat || '');
  const [hLatinName, setHLatinName] = useState(existingDeed?.husband?.latinName || '');

  // 4. Wife Data (Current)
  const [wFirstName, setWFirstName] = useState(existingDeed?.wife?.firstName || '');
  const [wLastName, setWLastName] = useState(existingDeed?.wife?.lastName || '');
  const [wBirthDate, setWBirthDate] = useState(existingDeed?.wife?.dateOfBirth || '');
  const [wBirthPlace, setWBirthPlace] = useState(existingDeed?.wife?.placeOfBirth || '');
  const [wNationality, setWNationality] = useState(existingDeed?.wife?.nationality || 'مغربية');
  const [wCin, setWCin] = useState(existingDeed?.wife?.idNumber || '');
  const [wProfession, setWProfession] = useState(existingDeed?.wife?.profession || '');
  const [wAddress, setWAddress] = useState(existingDeed?.wife?.currentAddress || '');
  const [wIsAbroad, setWIsAbroad] = useState(existingDeed?.wife?.isAbroad || false);
  const [wAbroadCountry, setWAbroadCountry] = useState(existingDeed?.wife?.abroadCountry || '');
  const [wAbroadCity, setWAbroadCity] = useState(existingDeed?.wife?.abroadCity || '');
  const [wAbroadAddressAr, setWAbroadAddressAr] = useState(existingDeed?.wife?.abroadAddressAr || '');
  const [wAbroadAddressLat, setWAbroadAddressLat] = useState(existingDeed?.wife?.abroadAddressLat || '');
  const [wLatinName, setWLatinName] = useState(existingDeed?.wife?.latinName || '');

  // 5. Marriage Duration State
  const [startDateType, setStartDateType] = useState<'year' | 'exact_date' | 'custom_phrase'>(
    existingDeed?.marriageDuration?.startDateType || 'year'
  );
  const [startYear, setStartYear] = useState<string>(
    existingDeed?.marriageDuration?.startYear || ''
  );
  const [startDate, setStartDate] = useState<string>(
    existingDeed?.marriageDuration?.startDate || ''
  );
  const [customPhrase, setCustomPhrase] = useState<string>(
    existingDeed?.marriageDuration?.customPhrase || ''
  );
  const deedDate = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];

  // 6. Dowry State
  const [dowryAmountNumber, setDowryAmountNumber] = useState<string>(
    existingDeed?.dowry?.amountNumber !== undefined ? String(existingDeed.dowry.amountNumber) : ''
  );
  const [dowryAmountWords, setDowryAmountWords] = useState<string>(
    existingDeed?.dowry?.amountWords || ''
  );
  const [dowryCurrency, setDowryCurrency] = useState<string>(
    existingDeed?.dowry?.currency || 'درهم مغربي'
  );
  const [dowryPaymentStatus, setDowryPaymentStatus] = useState<
    'مقبوض' | 'مؤجل' | 'مقبوض_بعضه_ومؤجل_باقيه' | 'غير_محدد_بالحكم'
  >(existingDeed?.dowry?.paymentStatus || 'مقبوض');
  const [dowryRulingDetails, setDowryRulingDetails] = useState<string>(
    existingDeed?.dowry?.detailsInRuling || ''
  );

  // Auto-convert dowry numbers to Arabic words
  useEffect(() => {
    const num = parseFloat(dowryAmountNumber);
    if (!isNaN(num) && num > 0 && !dowryAmountWords) {
      setDowryAmountWords(convertNumberToArabicWords(num, ' درهم'));
    }
  }, [dowryAmountNumber, dowryAmountWords]);

  // 7. Ruling Pronouncement & Substance
  const [verdictOriginalText, setVerdictOriginalText] = useState<string>(
    existingDeed?.rulingPronouncement?.verdictOriginalText || ''
  );
  const [verdictApproved, setVerdictApproved] = useState<boolean>(
    existingDeed?.rulingPronouncement?.verdictApproved ?? true
  );

  // 8. Deed Draft
  const [notaryNotes] = useState<string>(
    existingDeed?.deedDraft?.notaryNotes || ''
  );

  // 9. Post-Homologation & Civil Status State
  const [isDeedCompleted, setIsDeedCompleted] = useState<boolean>(
    existingDeed?.postHomologationCivilStatus?.isCompleted ?? true
  );
  const [isHomologated, setIsHomologated] = useState<boolean>(
    existingDeed?.postHomologationCivilStatus?.isHomologated ?? false
  );
  const [isCopyPrepared, setIsCopyPrepared] = useState<boolean>(
    existingDeed?.postHomologationCivilStatus?.isCopyPrepared ?? false
  );
  const [sendingStatus, setSendingStatus] = useState<'في انتظار الإرسال للحالة المدنية' | 'تم الإرسال'>(
    existingDeed?.postHomologationCivilStatus?.sendingStatus || 'في انتظار الإرسال للحالة المدنية'
  );
  const [civilStatusSentDate, setCivilStatusSentDate] = useState<string>(
    existingDeed?.postHomologationCivilStatus?.sentDate || ''
  );
  const [civilStatusDispatchRef, setCivilStatusDispatchRef] = useState<string>(
    existingDeed?.postHomologationCivilStatus?.dispatchReference || ''
  );

  // Calculated Marriage Duration Summary
  const calculatedDuration = useMemo(() => {
    let startText = '';
    let yearsDiff = 0;
    const currentYear = new Date(deedDate).getFullYear();

    if (startDateType === 'year' && startYear) {
      startText = `منذ سنة ${startYear}`;
      const y = parseInt(startYear, 10);
      if (!isNaN(y) && y <= currentYear) {
        yearsDiff = currentYear - y;
      }
    } else if (startDateType === 'exact_date' && startDate) {
      startText = `من تاريخ ${startDate}`;
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        const diffMs = new Date(deedDate).getTime() - d.getTime();
        yearsDiff = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
      }
    } else if (startDateType === 'custom_phrase' && customPhrase) {
      startText = customPhrase;
    }

    if (!startText) return 'لم يتم تحديد تاريخ بداية الزوجية بعد';

    return `${startText} إلى تاريخ التوثيق (${deedDate})${
      yearsDiff > 0 ? ` (ما يقارب ${yearsDiff} سنة من المعاشرة الزوجية)` : ''
    }`;
  }, [startDateType, startYear, startDate, customPhrase, deedDate]);

  // Ruling Substance (فحوى الحكم) auto-generator
  const rulingSubstance = useMemo(() => {
    const husbandName = (hFirstName || hLastName) ? `${hFirstName} ${hLastName}`.trim() : (rulingHusbandName || '...........');
    const wifeName = (wFirstName || wLastName) ? `${wFirstName} ${wLastName}`.trim() : (rulingWifeName || '...........');
    const dowryText = dowryAmountWords || (dowryAmountNumber ? `${dowryAmountNumber} ${dowryCurrency}` : 'المحدد بالحكم');
    const durationText = startDateType === 'year' && startYear ? `منذ سنة ${startYear}` : startDateType === 'exact_date' && startDate ? `من تاريخ ${startDate}` : (customPhrase || 'الفترة المحددة بالحكم');

    return `ثبت للمحكمة الابتدائية بـ (${court || '...'})، قسم قضاء الأسرة، بمقتضى الحكم رقم (${rulingNumber || '...'}) في الملف رقم (${fileNumber || '...'})، الصادر بتاريخ (${rulingDate || '...'})\nقيام العلاقة الزوجية الشرعية المستمرة بين السيد: ${husbandName} والسيدة: ${wifeName} ${durationText}، على صداق قدره: ${dowryText} (${dowryPaymentStatus === 'مقبوض' ? 'مقبوض ومبرأ منه' : dowryPaymentStatus})، بحسب ما قضى به منطوق الحكم المذكور.`;
  }, [
    court, rulingNumber, fileNumber, rulingDate,
    hFirstName, hLastName, rulingHusbandName,
    wFirstName, wLastName, rulingWifeName,
    dowryAmountWords, dowryAmountNumber, dowryCurrency, dowryPaymentStatus,
    startDateType, startYear, startDate, customPhrase
  ]);

  // Legal Deed Formulation (صياغة الرسم العدلي)
  const defaultDraftText = useMemo(() => {
    const husbandFullName = `${hFirstName} ${hLastName}`.trim() || rulingHusbandName || '....................';
    const wifeFullName = `${wFirstName} ${wLastName}`.trim() || rulingWifeName || '....................';
    const courtStr = court || 'المحكمة الابتدائية المختصة';
    const fileStr = fileNumber || '.......';
    const rulingStr = rulingNumber || '.......';
    const dateStr = rulingDate || '.......';
    const dowryStr = dowryAmountWords || (dowryAmountNumber ? `${dowryAmountNumber} ${dowryCurrency}` : 'المعين بالحكم');
    const startStr = startDateType === 'year' && startYear ? `منذ سنة ${startYear}` : startDateType === 'exact_date' && startDate ? `من تاريخ ${startDate}` : (customPhrase || 'الفترة المقضي بها');

    return `الحمد لله وحده،\n\nحضر لدى عدلينا المنتصبين للإشهاد بدائرة محكمة الاستئناف بقسم قضاء الأسرة التابع للمحكمة الابتدائية بـ (${courtStr}) الموقعين أسفله:\n\n1. السيد: ${husbandFullName}${hBirthDate ? `، المزداد بتاريخ ${hBirthDate}` : ''}${hBirthPlace ? ` بـ ${hBirthPlace}` : ''}${hNationality ? `، الحامل للجنسية ${hNationality}` : ''}${hCin ? `، الحامل لبطاقة التعريف الوطنية رقم: ${hCin}` : ''}${hAddress ? `، والساكن بـ: ${hAddress}` : ''}${hIsAbroad && hAbroadCountry ? ` (والمقيم بالخارج بـ: ${hAbroadCountry}${hAbroadCity ? ` - ${hAbroadCity}` : ''})` : ''}.\n\n2. السيدة: ${wifeFullName}${wBirthDate ? `، المزدادة بتاريخ ${wBirthDate}` : ''}${wBirthPlace ? ` بـ ${wBirthPlace}` : ''}${wNationality ? `، الحاملة للجنسية ${wNationality}` : ''}${wCin ? `، الحاملة لبطاقة التعريف الوطنية رقم: ${wCin}` : ''}${wAddress ? `، والساكنة بـ: ${wAddress}` : ''}${wIsAbroad && wAbroadCountry ? ` (والمقيمة بالخارج بـ: ${wAbroadCountry}${wAbroadCity ? ` - ${wAbroadCity}` : ''})` : ''}.\n\nالمحكوم لهما قضائيًا بثبوت زوجيتهما بمقتضى الحكم الصادر عن المحكمة الابتدائية بـ (${courtStr})، قسم قضاء الأسرة، في الملف عدد (${fileStr})، الحكم عدد (${rulingStr}) بتاريخ (${dateStr})، القاضي علنياً وحضورياً بثبوت الزوجية بينهما ${startStr}، على صداق قدره (${dowryStr})، وحالته (${dowryPaymentStatus === 'مقبوض' ? 'مقبوض بتمامه' : dowryPaymentStatus}).\n\nوبعد الاطلاع التام على أصل الحكم القضائي المذكور، والتأكد من هويتي الطرفين ومطابقتهما للبيانات المقضي بها، وتضمين منطوق الحكم وفحواه بسجلنا العدلي سندًا مباشرًا لا غنى عنه دون إعادة فحص أو بحث في أسباب الثبوت التي استنفدتها المحكمة بموجب المادة 16 من مدونة الأسرة، صار بذلك تأكيدًا له وأخذًا به بجميع آثاره وحيثياته الشرعية والقانونية.\n\nوتحرر هذا الرسم إثباتًا لما ذُكر، للإدلاء به لدى من يجب طبقًا للمقتضيات التشريعية الجاري بها العمل، مع إرسال نظير منه إلى ضابط الحالة المدنية لمحل الولادة.`;
  }, [
    court, fileNumber, rulingNumber, rulingDate,
    hFirstName, hLastName, rulingHusbandName, hBirthDate, hBirthPlace, hNationality, hCin, hAddress, hIsAbroad, hAbroadCountry, hAbroadCity,
    wFirstName, wLastName, rulingWifeName, wBirthDate, wBirthPlace, wNationality, wCin, wAddress, wIsAbroad, wAbroadCountry, wAbroadCity,
    startDateType, startYear, startDate, customPhrase, dowryAmountWords, dowryAmountNumber, dowryCurrency, dowryPaymentStatus
  ]);

  // Draft text passed to final review
  const activeDraft = defaultDraftText;

  // 10-Item Final Verification Checklist (Point 16)
  const checklist = useMemo(() => {
    const isRulingPresent = Boolean(fileNumber && rulingNumber && rulingDate);
    const isCourtDefined = Boolean(court && section);
    const isFileNumValid = Boolean(fileNumber && fileNumber.trim().length > 1);
    const isRulingNumDateValid = Boolean(rulingNumber && rulingDate);
    const isHusbandValid = Boolean((hFirstName && hLastName) || rulingHusbandName);
    const isWifeValid = Boolean((wFirstName && wLastName) || rulingWifeName);
    const isDurationValid = Boolean((startDateType === 'year' && startYear) || (startDateType === 'exact_date' && startDate) || (startDateType === 'custom_phrase' && customPhrase));
    const isDowryValid = Boolean(dowryAmountNumber || dowryAmountWords || dowryRulingDetails);
    const isVerdictPreserved = Boolean(verdictOriginalText || rulingSubstance);
    const isDraftComplete = Boolean(activeDraft && activeDraft.length > 50);

    const items = [
      { id: 1, label: 'الحكم القضائي موجود ومحدد السند', status: isRulingPresent },
      { id: 2, label: 'المحكمة الابتدائية وقسم قضاء الأسرة محددة', status: isCourtDefined },
      { id: 3, label: 'رقم الملف القضائي مدون بدقة', status: isFileNumValid },
      { id: 4, label: 'رقم الحكم وتاريخ صدوره مسجلان', status: isRulingNumDateValid },
      { id: 5, label: 'بيانات المحكوم له (الزوج) مطابقة للوثائق والحكم', status: isHusbandValid },
      { id: 6, label: 'بيانات المحكوم لها (الزوجة) مطابقة للوثائق والحكم', status: isWifeValid },
      { id: 7, label: 'تاريخ بداية الزوجية مطابق لما قضى به الحكم', status: isDurationValid },
      { id: 8, label: 'الصداق وحالة أدائه مطابقة لمنطوق الحكم', status: isDowryValid },
      { id: 9, label: 'منطوق الحكم وفحواه محفوظان ومضمنان', status: isVerdictPreserved },
      { id: 10, label: 'صياغة الرسم العدلي النموذجية مكتملة وجاهزة للخطاب', status: isDraftComplete },
    ];

    const completedCount = items.filter(i => i.status).length;
    const allPassed = completedCount === items.length && discrepancyType !== 'جوهري';

    return { items, completedCount, allPassed };
  }, [
    fileNumber, rulingNumber, rulingDate, court, section,
    hFirstName, hLastName, rulingHusbandName,
    wFirstName, wLastName, rulingWifeName,
    startDateType, startYear, startDate, customPhrase,
    dowryAmountNumber, dowryAmountWords, dowryRulingDetails,
    verdictOriginalText, rulingSubstance, activeDraft, discrepancyType
  ]);

  // Sync back to parent state
  const handleSaveToState = () => {
    const updatedDeed: MarriageJudicialRulingDeed = {
      rulingSource,
      courtData: {
        court,
        section,
        fileNumber,
        rulingNumber,
        rulingDate,
        rulingType,
        rulingStatus: rulingStatus || undefined,
        rulingStatusOther: rulingStatusOther || undefined,
        attachedDocumentName: attachedDocumentName || undefined,
      },
      identityVerification: {
        matchesIdentityDocs: matchesIdentityDocs ?? true,
        discrepancyReason: discrepancyReason || undefined,
        hasSubstantialDiscrepancy: discrepancyType === 'جوهري',
      },
      rulingOriginalNames: {
        husbandFullName: rulingHusbandName,
        wifeFullName: rulingWifeName,
      },
      husband: {
        firstName: hFirstName,
        lastName: hLastName,
        dateOfBirth: hBirthDate,
        placeOfBirth: hBirthPlace,
        nationality: hNationality,
        idNumber: hCin,
        profession: hProfession,
        currentAddress: hAddress,
        isAbroad: hIsAbroad,
        abroadCountry: hAbroadCountry,
        abroadCity: hAbroadCity,
        abroadAddressAr: hAbroadAddressAr,
        abroadAddressLat: hAbroadAddressLat,
        latinName: hLatinName,
      },
      wife: {
        firstName: wFirstName,
        lastName: wLastName,
        dateOfBirth: wBirthDate,
        placeOfBirth: wBirthPlace,
        nationality: wNationality,
        idNumber: wCin,
        profession: wProfession,
        currentAddress: wAddress,
        isAbroad: wIsAbroad,
        abroadCountry: wAbroadCountry,
        abroadCity: wAbroadCity,
        abroadAddressAr: wAbroadAddressAr,
        abroadAddressLat: wAbroadAddressLat,
        latinName: wLatinName,
      },
      marriageDuration: {
        startDateType,
        startYear,
        startDate,
        customPhrase,
        rulingRecordedText: calculatedDuration,
        deedDate,
        calculatedSummary: calculatedDuration,
      },
      dowry: {
        amountNumber: dowryAmountNumber,
        amountWords: dowryAmountWords,
        currency: dowryCurrency,
        paymentStatus: dowryPaymentStatus,
        detailsInRuling: dowryRulingDetails,
      },
      rulingPronouncement: {
        verdictOriginalText,
        verdictApproved,
        rulingSubstance,
      },
      deedDraft: {
        customDraftText: activeDraft,
        notaryNotes,
      },
      postHomologationCivilStatus: {
        isCompleted: isDeedCompleted,
        isHomologated,
        isCopyPrepared,
        sendingStatus,
        sentDate: civilStatusSentDate,
        dispatchReference: civilStatusDispatchRef,
      },
    };

    setState(prev => ({
      ...prev,
      marriageJudicialRulingDeed: updatedDeed,
      sellers: [
        {
          ...(prev.sellers[0] || {}),
          name: `${hFirstName} ${hLastName}`.trim() || rulingHusbandName || '',
          idNumber: hCin,
          dateOfBirth: hBirthDate,
          placeOfBirth: hBirthPlace,
          address: hAddress,
          profession: hProfession,
          nationality: hNationality === 'مغربية' ? 'مغربي' : 'اجنبي',
        } as any,
      ],
      buyers: [
        {
          ...(prev.buyers[0] || {}),
          name: `${wFirstName} ${wLastName}`.trim() || rulingWifeName || '',
          idNumber: wCin,
          dateOfBirth: wBirthDate,
          placeOfBirth: wBirthPlace,
          address: wAddress,
          profession: wProfession,
          nationality: wNationality === 'مغربية' ? 'مغربي' : 'اجنبي',
        } as any,
      ],
    }));
  };

  // Auto-sync on changes
  useEffect(() => {
    handleSaveToState();
  }, [
    rulingSource, court, section, fileNumber, rulingNumber, rulingDate, rulingStatus, rulingStatusOther, attachedDocumentName,
    rulingHusbandName, rulingWifeName, matchesIdentityDocs, discrepancyType, discrepancyReason,
    hFirstName, hLastName, hBirthDate, hBirthPlace, hNationality, hCin, hProfession, hAddress, hIsAbroad, hAbroadCountry, hAbroadCity, hAbroadAddressAr, hAbroadAddressLat, hLatinName,
    wFirstName, wLastName, wBirthDate, wBirthPlace, wNationality, wCin, wProfession, wAddress, wIsAbroad, wAbroadCountry, wAbroadCity, wAbroadAddressAr, wAbroadAddressLat, wLatinName,
    startDateType, startYear, startDate, customPhrase, dowryAmountNumber, dowryAmountWords, dowryCurrency, dowryPaymentStatus, dowryRulingDetails,
    verdictOriginalText, verdictApproved, defaultDraftText, notaryNotes,
    isDeedCompleted, isHomologated, isCopyPrepared, sendingStatus, civilStatusSentDate, civilStatusDispatchRef
  ]);

  // Mock / System import demonstration
  const handleImportSampleRuling = () => {
    setRulingSource('import');
    setCourt('المحكمة الابتدائية بالرباط');
    setSection('قسم قضاء الأسرة');
    setFileNumber('2024/1602/412');
    setRulingNumber('874');
    setRulingDate('2024-05-14');
    setRulingStatus('حكم نهائي');
    setRulingHusbandName('إدريس بن محمد الفاسي');
    setRulingWifeName('فاطمة بنت عبد القادر التازي');
    setMatchesIdentityDocs(true);
    setHFirstName('إدريس');
    setHLastName('الفاسي');
    setHNationality('مغربية');
    setHCin('A654321');
    setHBirthDate('1982-04-10');
    setHBirthPlace('فاس');
    setHAddress('شارع محمد الخامس، الرباط');
    setWFirstName('فاطمة');
    setWLastName('التازي');
    setWNationality('مغربية');
    setWCin('AB123456');
    setWBirthDate('1986-09-18');
    setWBirthPlace('الرباط');
    setWAddress('شارع محمد الخامس، الرباط');
    setStartDateType('year');
    setStartYear('2009');
    setDowryAmountNumber('20000');
    setDowryAmountWords('عشرون ألف درهم');
    setDowryPaymentStatus('مقبوض');
    setVerdictOriginalText('حكمت المحكمة علنياً ابتدائياً وحضورياً بثبوت الزوجية القائمة بين الطرفين السيد إدريس الفاسي والسيدة فاطمة التازي منذ سنة 2009، على صداق قدره عشرون ألف درهم مقبوض بتمامه، وبأمر ضابط الحالة المدنية بتضمين منطوق الحكم بطرة رسم ولادة كل منهما.');
  };

  const handleFinalizeAndProceed = () => {
    handleSaveToState();
    if (onComplete) {
      onComplete();
    } else {
      setState(prev => ({ ...prev, step: 7 }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 font-sans" dir="rtl">
      {/* 1. Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 backdrop-blur-sm">
                <Scale className="w-8 h-8" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  ⚖️ رسم توثيق حكم بثبوت الزوجية
                </h1>
                <p className="text-indigo-200 text-sm md:text-base mt-1">
                  توثيق مضمون الحكم القضائي القاضي بثبوت الزوجية بين الطرفين، وترتيب الرسم العدلي على ما قضى به الحكم.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              سند قضائي قطعي (المادة 16)
            </span>
          </div>
        </div>

        {/* Golden Sub-notification */}
        <div className="mt-5 p-4 rounded-xl bg-blue-950/80 border border-blue-400/40 flex items-start gap-3 text-blue-100">
          <AlertCircle className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm leading-relaxed space-y-1">
            <strong className="text-white block font-semibold text-sm">🔵 تنبيه جوهري للعدلين:</strong>
            <p>
              هذا البيت مخصص لتوثيق حكم قضائي بثبوت الزوجية. لا يقوم العدلان هنا بإثبات الزوجية من جديد، وإنما يعتمدان الحكم القضائي السندَ المباشر للرسم.
              المحكمة هي المختصة بإثبات الزوجية في إطار المادة 16 من مدونة الأسرة، ودور العدلين ينحصر في توثيق ما قضى به الحكم ومطابقته بدقة وحرفية.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Stepper / Quick Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2 text-xs md:text-sm">
        {[
          { id: 'ruling_source', label: '1. السند وبيانات الحكم', icon: Building },
          { id: 'identity', label: '2. فحص الهوية والمحكوم لهما', icon: User },
          { id: 'duration_dowry', label: '3. المدة والصداق', icon: Calendar },
          { id: 'pronouncement', label: '4. منطوق وفحوى الحكم', icon: FileCheck },
          { id: 'verification', label: '5. المطابقة النهائية والخطاب', icon: ShieldCheck },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: RULING SOURCE & COURT DETAILS (Sections 2 & 3 & 15) */}
      {(activeTab === 'ruling_source' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">1</span>
              ⚖️ تحديد الحكم القضائي والسند التوثيقي
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportSampleRuling}
                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 font-medium transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                استيراد تجريبي من سجلات المحكمة
              </button>
            </div>
          </div>

          {/* Ruling Source Options */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              هل الحكم القضائي موجود داخل المنصة أو متصل بمنظومة قضاء الأسرة؟
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  rulingSource === 'import'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="rulingSource"
                  checked={rulingSource === 'import'}
                  onChange={() => setRulingSource('import')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <span>🔘 نعم، استيراد بيانات الحكم من النظام القضائي</span>
                  <span className="block text-xs text-slate-500 font-normal mt-0.5">
                    استرجاع رقم الملف، رقم الحكم، وتاريخه ومنطوقه آلياً
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  rulingSource === 'manual'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="rulingSource"
                  checked={rulingSource === 'manual'}
                  onChange={() => setRulingSource('manual')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <span>🔘 لا، إدخال بيانات الحكم يدوياً من النسخة الرسمية</span>
                  <span className="block text-xs text-slate-500 font-normal mt-0.5">
                    الاعتماد على النسخة التنفيذية/الرسمية المسلمة للطرفين
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Ruling Card (Dark Blue / Slate Card as per Section 3) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-5 border border-slate-700 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <Building className="w-4 h-4" />
                📜 بطاقة بيانات الحكم القضائي
              </span>
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded text-xs">
                نوع الحكم: حكم بثبوت الزوجية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">المحكمة الابتدائية:</label>
                <input
                  type="text"
                  value={court}
                  onChange={e => setCourt(e.target.value)}
                  placeholder="مثال: المحكمة الابتدائية بالرباط"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">القسم القضائي:</label>
                <input
                  type="text"
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  placeholder="قسم قضاء الأسرة"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رقم الملف القضائي:</label>
                <input
                  type="text"
                  value={fileNumber}
                  onChange={e => setFileNumber(e.target.value)}
                  placeholder="مثال: 2024/1602/450"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">رقم الحكم:</label>
                <input
                  type="text"
                  value={rulingNumber}
                  onChange={e => setRulingNumber(e.target.value)}
                  placeholder="مثال: 1289"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">تاريخ صدور الحكم:</label>
                <input
                  type="date"
                  value={rulingDate}
                  onChange={e => setRulingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-700 text-white text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">مرفق نسخة الحكم (اختياري):</label>
                <div className="relative">
                  <input
                    type="file"
                    id="ruling-file-upload"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedDocumentName(e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="ruling-file-upload"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-dashed border-slate-600 text-slate-300 text-xs flex items-center justify-between cursor-pointer hover:border-indigo-400 transition"
                  >
                    <span className="truncate">{attachedDocumentName || '📎 رفع نسخة الحكم (PDF/صورة)'}</span>
                    <Upload className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  </label>
                </div>
              </div>
            </div>

            {/* Ruling Status (Non-assumed, specified by notary as per Point 3) */}
            <div className="pt-3 border-t border-slate-700/80 space-y-2">
              <label className="block text-xs font-semibold text-indigo-200">
                حالة الحكم (يرجى التحديد وفق الشهادة أو الوثيقة المرفقة):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {[
                  'حكم نهائي',
                  'حائز لقوة الشيء المقضي به',
                  'مرفق بما يفيد صيرورته نهائيًا/قابلاً للتوثيق',
                  'حالة أخرى حسب الوثيقة القضائية',
                ].map(status => (
                  <label
                    key={status}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                      rulingStatus === status
                        ? 'bg-indigo-700/50 border-indigo-400 text-white font-medium'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rulingStatus"
                      value={status}
                      checked={rulingStatus === status}
                      onChange={() => setRulingStatus(status as any)}
                      className="text-indigo-500"
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>

              {rulingStatus === 'حالة أخرى حسب الوثيقة القضائية' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={rulingStatusOther}
                    onChange={e => setRulingStatusOther(e.target.value)}
                    placeholder="حدد حالة الحكم والشهادة المرفقة بدقة..."
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveTab('identity')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <span>التالي: فحص هوية المحكوم لهما</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTITY EXAMINATION & TWO-LEVEL PARTIES (Sections 4 & 5 & 12 & 13) */}
      {(activeTab === 'identity' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">2</span>
              🔐 فحص هوية المحكوم لهما وبيانات الطرفين
            </h2>
          </div>

          {/* Section 4: Ruling Names vs Identity Check */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="text-sm font-bold text-slate-800">
              ① الأسماء كما وردت بالحكم القضائي المستند إليه:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  👨 اسم الزوج الكامل بالحكم:
                </label>
                <input
                  type="text"
                  value={rulingHusbandName}
                  onChange={e => setRulingHusbandName(e.target.value)}
                  placeholder="كما هو مسجل في ديباجة أو منطوق الحكم..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  👩 اسم الزوجة الكامل بالحكم:
                </label>
                <input
                  type="text"
                  value={rulingWifeName}
                  onChange={e => setRulingWifeName(e.target.value)}
                  placeholder="كما هو مسجل في ديباجة أو منطوق الحكم..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Identity Match Question (Section 4) */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                هل تتطابق بيانات الطرفين في الحكم تماماً مع الوثائق التعريفية المقدمة (ب.ت.و / جواز السفر)؟
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="matchesIdentity"
                    checked={matchesIdentityDocs === true}
                    onChange={() => {
                      setMatchesIdentityDocs(true);
                      setDiscrepancyType('');
                    }}
                    className="text-emerald-600"
                  />
                  <span className="text-emerald-800 font-medium">🔘 نعم، متطابقة تماماً</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="matchesIdentity"
                    checked={matchesIdentityDocs === false}
                    onChange={() => setMatchesIdentityDocs(false)}
                    className="text-amber-600"
                  />
                  <span className="text-amber-800 font-medium">🔘 لا، يوجد اختلاف بين الوثائق والحكم</span>
                </label>
              </div>

              {/* If "No", Discrepancy Gate (Section 4 & 12) */}
              {matchesIdentityDocs === false && (
                <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-start gap-2 text-amber-900 text-sm font-semibold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>تنبيه للمراجعة والتدقيق:</span>
                      <p className="font-normal text-xs text-amber-800 mt-0.5">
                        توجد بيانات في وثيقة الهوية تختلف عن البيانات الواردة في الحكم القضائي. يرجى تحديد درجة الاختلاف وأسبابه قبل التوثيق.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-300 bg-white cursor-pointer">
                      <input
                        type="radio"
                        name="discType"
                        checked={discrepancyType === 'بسيط'}
                        onChange={() => setDiscrepancyType('بسيط')}
                      />
                      <span>اختلاف يسير/كتابي لا يمس جوهر الهوية (مبرر بوثيقة تكميلية)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-red-300 bg-white cursor-pointer">
                      <input
                        type="radio"
                        name="discType"
                        checked={discrepancyType === 'جوهري'}
                        onChange={() => setDiscrepancyType('جوهري')}
                      />
                      <span className="text-red-700 font-semibold">اختلاف جوهري (لا يطابق الشخص المحكوم لفائدته)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      بيان سبب الاختلاف والإجراء المعتمد:
                    </label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={e => setDiscrepancyReason(e.target.value)}
                      placeholder="مثال: تصحيح كتابي في حرف الاسم العائلي مثبت بشهادة مطابقة..."
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white"
                    />
                  </div>

                  {discrepancyType === 'جوهري' && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>⛔ تنبيه قاطع: لا يمكن متابعة أو اعتماد الرسم قبل معالجة المطابقة أو الإدلاء بحكم تصحيحي.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 5 & 13: Two-level Parties Data (Husband & Wife) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Husband Card */}
            <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  👨 المحكوم له الأول (الزوج) - البيانات الحالية المثبتة
                </span>
                <span className="text-[11px] text-slate-500">حسب بطاقة التعريف/جواز السفر</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">الاسم الشخصي:</label>
                  <input
                    type="text"
                    value={hFirstName}
                    onChange={e => setHFirstName(e.target.value)}
                    placeholder="الاسم الشخصي"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">الاسم العائلي:</label>
                  <input
                    type="text"
                    value={hLastName}
                    onChange={e => setHLastName(e.target.value)}
                    placeholder="الاسم العائلي"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">رقم بطاقة التعريف/الجواز:</label>
                  <input
                    type="text"
                    value={hCin}
                    onChange={e => setHCin(e.target.value)}
                    placeholder="رقم البطاقة"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={hNationality}
                    onChange={e => setHNationality(e.target.value)}
                    placeholder="مغربية"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={hBirthDate}
                    onChange={e => setHBirthDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={hBirthPlace}
                    onChange={e => setHBirthPlace(e.target.value)}
                    placeholder="مدينة الازدياد"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={hProfession}
                    onChange={e => setHProfession(e.target.value)}
                    placeholder="المهنة (اختياري)"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">العنوان الحالي بالمغرب:</label>
                  <input
                    type="text"
                    value={hAddress}
                    onChange={e => setHAddress(e.target.value)}
                    placeholder="العنوان الكامل"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Abroad details for Husband (Section 13) */}
              <div className="pt-2 border-t border-indigo-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hIsAbroad}
                    onChange={e => setHIsAbroad(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>🌍 الزوج يقيم خارج المغرب (مغاربة العالم / إقامة بالخارج)</span>
                </label>

                {hIsAbroad && (
                  <div className="mt-2 p-2.5 bg-white rounded border border-indigo-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500">الدولة:</label>
                      <input
                        type="text"
                        value={hAbroadCountry}
                        onChange={e => setHAbroadCountry(e.target.value)}
                        placeholder="فرنسا، إسبانيا..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">المدينة:</label>
                      <input
                        type="text"
                        value={hAbroadCity}
                        onChange={e => setHAbroadCity(e.target.value)}
                        placeholder="باريس، مدريد..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-500">العنوان بالخارج (بالعربية):</label>
                      <input
                        type="text"
                        value={hAbroadAddressAr}
                        onChange={e => setHAbroadAddressAr(e.target.value)}
                        placeholder="العنوان بالعربية..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">الاسم باللاتينية:</label>
                      <input
                        type="text"
                        value={hLatinName}
                        onChange={e => setHLatinName(e.target.value)}
                        placeholder="Nom en Latin..."
                        dir="ltr"
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-left"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">العنوان باللاتينية:</label>
                      <input
                        type="text"
                        value={hAbroadAddressLat}
                        onChange={e => setHAbroadAddressLat(e.target.value)}
                        placeholder="Adresse en Latin..."
                        dir="ltr"
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-left"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wife Card */}
            <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-pink-600" />
                  👩 المحكوم لها الثانية (الزوجة) - البيانات الحالية المثبتة
                </span>
                <span className="text-[11px] text-slate-500">حسب بطاقة التعريف/جواز السفر</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">الاسم الشخصي:</label>
                  <input
                    type="text"
                    value={wFirstName}
                    onChange={e => setWFirstName(e.target.value)}
                    placeholder="الاسم الشخصي"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">الاسم العائلي:</label>
                  <input
                    type="text"
                    value={wLastName}
                    onChange={e => setWLastName(e.target.value)}
                    placeholder="الاسم العائلي"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">رقم بطاقة التعريف/الجواز:</label>
                  <input
                    type="text"
                    value={wCin}
                    onChange={e => setWCin(e.target.value)}
                    placeholder="رقم البطاقة"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">الجنسية:</label>
                  <input
                    type="text"
                    value={wNationality}
                    onChange={e => setWNationality(e.target.value)}
                    placeholder="مغربية"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">تاريخ الازدياد:</label>
                  <input
                    type="date"
                    value={wBirthDate}
                    onChange={e => setWBirthDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">مكان الازدياد:</label>
                  <input
                    type="text"
                    value={wBirthPlace}
                    onChange={e => setWBirthPlace(e.target.value)}
                    placeholder="مدينة الازدياد"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">المهنة:</label>
                  <input
                    type="text"
                    value={wProfession}
                    onChange={e => setWProfession(e.target.value)}
                    placeholder="المهنة (اختياري)"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">العنوان الحالي بالمغرب:</label>
                  <input
                    type="text"
                    value={wAddress}
                    onChange={e => setWAddress(e.target.value)}
                    placeholder="العنوان الكامل"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Abroad details for Wife (Section 13) */}
              <div className="pt-2 border-t border-indigo-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wIsAbroad}
                    onChange={e => setWIsAbroad(e.target.checked)}
                    className="rounded text-pink-600"
                  />
                  <span>🌍 الزوجة تقيم خارج المغرب (مغاربة العالم / إقامة بالخارج)</span>
                </label>

                {wIsAbroad && (
                  <div className="mt-2 p-2.5 bg-white rounded border border-pink-200 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500">الدولة:</label>
                      <input
                        type="text"
                        value={wAbroadCountry}
                        onChange={e => setWAbroadCountry(e.target.value)}
                        placeholder="بلجيكا، إيطاليا..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">المدينة:</label>
                      <input
                        type="text"
                        value={wAbroadCity}
                        onChange={e => setWAbroadCity(e.target.value)}
                        placeholder="بروكسل، ميلانو..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-500">العنوان بالخارج (بالعربية):</label>
                      <input
                        type="text"
                        value={wAbroadAddressAr}
                        onChange={e => setWAbroadAddressAr(e.target.value)}
                        placeholder="العنوان بالعربية..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">الاسم باللاتينية:</label>
                      <input
                        type="text"
                        value={wLatinName}
                        onChange={e => setWLatinName(e.target.value)}
                        placeholder="Nom en Latin..."
                        dir="ltr"
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-left"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">العنوان باللاتينية:</label>
                      <input
                        type="text"
                        value={wAbroadAddressLat}
                        onChange={e => setWAbroadAddressLat(e.target.value)}
                        placeholder="Adresse en Latin..."
                        dir="ltr"
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-left"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('ruling_source')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: السند القضائي</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('duration_dowry')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <span>التالي: مدة الزوجية والصداق</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MARRIAGE DURATION & DOWRY (Sections 6 & 7) */}
      {(activeTab === 'duration_dowry' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">3</span>
              🗓️ مدة الزوجية و 💰 الصداق المحكوم به
            </h2>
          </div>

          {/* Section 6: Marriage Duration */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                تاريخ بداية الزوجية المحكوم بثبوتها:
              </span>
              <span className="text-xs text-slate-500">مستخرج من منطوق أو حيثيات الحكم</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  startDateType === 'year'
                    ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="startDateType"
                    checked={startDateType === 'year'}
                    onChange={() => setStartDateType('year')}
                  />
                  <span>منذ سنة معينة</span>
                </div>
                <input
                  type="number"
                  min="1950"
                  max="2030"
                  value={startYear}
                  onChange={e => setStartYear(e.target.value)}
                  placeholder="مثال: 2005"
                  disabled={startDateType !== 'year'}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                />
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  startDateType === 'exact_date'
                    ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="startDateType"
                    checked={startDateType === 'exact_date'}
                    onChange={() => setStartDateType('exact_date')}
                  />
                  <span>من تاريخ دقيق (يوم/شهر/سنة)</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={startDateType !== 'exact_date'}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                />
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  startDateType === 'custom_phrase'
                    ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="startDateType"
                    checked={startDateType === 'custom_phrase'}
                    onChange={() => setStartDateType('custom_phrase')}
                  />
                  <span>صيغة خاصة مذكورة بالحكم</span>
                </div>
                <input
                  type="text"
                  value={customPhrase}
                  onChange={e => setCustomPhrase(e.target.value)}
                  placeholder="مثال: منذ أكثر من عقدين من الزمن..."
                  disabled={startDateType !== 'custom_phrase'}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                />
              </label>
            </div>

            {/* Calculated Period Output Box */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
              <div>
                <span className="font-semibold block text-slate-700">
                  🗓️ الفترة التي قضى الحكم بثبوت الزوجية خلالها:
                </span>
                <span className="font-bold text-sm text-indigo-900">{calculatedDuration}</span>
              </div>
              <span className="px-2.5 py-1 bg-white border border-indigo-200 rounded text-indigo-700 font-medium">
                تاريخ التوثيق: {deedDate}
              </span>
            </div>
          </div>

          {/* Section 7: Dowry per Ruling */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                💰 الصداق حسب ما قضى به الحكم القضائي:
              </span>
              <span className="text-xs text-slate-500">لا ينشئه العدل بل ينقله كما حكمت به المحكمة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ بالأرقام:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dowryAmountNumber}
                    onChange={e => setDowryAmountNumber(e.target.value)}
                    placeholder="مثال: 15000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2 text-xs text-slate-400">درهم</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ بالحروف (مطابقة قانونية):
                </label>
                <input
                  type="text"
                  value={dowryAmountWords}
                  onChange={e => setDowryAmountWords(e.target.value)}
                  placeholder="مثال: خمسة عشر ألف درهم"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  العملة بالحكم:
                </label>
                <select
                  value={dowryCurrency}
                  onChange={e => setDowryCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="درهم مغربي">درهم مغربي</option>
                  <option value="أورو">أورو (€)</option>
                  <option value="دولار أمريكي">دولار أمريكي ($)</option>
                  <option value="ريال سعودي">ريال سعودي</option>
                  <option value="عملة أخرى">عملة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  حالة أداء الصداق بالحكم:
                </label>
                <select
                  value={dowryPaymentStatus}
                  onChange={e => setDowryPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="مقبوض">مقبوض بتمامه ومبرأ منه</option>
                  <option value="مؤجل">مؤجل في الذمة</option>
                  <option value="مقبوض_بعضه_ومؤجل_باقيه">مقبوض بعضه ومؤجل باقيه</option>
                  <option value="غير_محدد_بالحكم">غير محدد تفصيلاً بالحكم</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  أي تفصيل إضافي للصداق وارد بالحكم:
                </label>
                <input
                  type="text"
                  value={dowryRulingDetails}
                  onChange={e => setDowryRulingDetails(e.target.value)}
                  placeholder="مثل: عيناً، أثاثاً، أو تفصيل المقبوض والمؤجل..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Smart Matching Alert */}
            {dowryAmountNumber && dowryAmountWords && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>🔐 مطابقة تلقائية محققة: تم تدوين الصداق رقماً بالحكم ({dowryAmountNumber} {dowryCurrency}) وبالحروف ({dowryAmountWords}).</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('identity')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: فحص الهوية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pronouncement')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <span>التالي: منطوق وفحوى الحكم</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: VERDICT & SUBSTANCE (Sections 8 & 9 & 11) */}
      {(activeTab === 'pronouncement' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">4</span>
              ⚖️ منطوق الحكم القضائي وفحواه المستفاد
            </h2>
          </div>

          {/* Section 11 & 17: Golden Rule Card ("لا إعادة إثبات") */}
          <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <Scale className="w-5 h-5 text-amber-600" />
              <span>قاعدة التوثيق الذهبية: «لا إعادة إثبات» (المادة 16 من مدونة الأسرة)</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-900 font-medium">
              لا يجوز للنظام أو للعدلين استنتاج ثبوت الزوجية من بيانات الأطراف أو من أقوالهما أو سماع شهود أو لفيف داخل هذا البيت.
              مصدر الثبوت الوحيد المعتمد في هذا الرسم هو الحكم القضائي، ويقتصر دور النظام والعدلين على نقل مضمونه وتوثيقه والتحقق من المطابقة الشكلية والبيانية.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] text-amber-800">
              <span className="flex items-center gap-1">❌ لا وحدة شهود</span>
              <span className="flex items-center gap-1">❌ لا شهادة لفيف</span>
              <span className="flex items-center gap-1">❌ لا بحث في المعاشرة</span>
              <span className="flex items-center gap-1">❌ لا إعادة تقييم للصداق</span>
            </div>
          </div>

          {/* Section 9: Strict separation between Pronouncement & Substance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Verdict Original Pronouncement (منطوق الحكم) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  ① منطوق الحكم القضائي (النص الأصلي الحاسم)
                </span>
                <span className="text-[11px] text-slate-500">محفوظ كما هو دون تصرف</span>
              </div>

              <textarea
                rows={5}
                value={verdictOriginalText}
                onChange={e => setVerdictOriginalText(e.target.value)}
                placeholder="أدخل نص منطوق الحكم حرفيًا: «حكمت المحكمة علنياً ابتدائياً وحضورياً بثبوت الزوجية بين...»"
                className="w-full p-3 rounded-lg border border-slate-300 text-xs bg-white focus:border-indigo-500 focus:outline-none leading-relaxed font-mono"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={verdictApproved}
                    onChange={e => setVerdictApproved(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>اعتماد منطوق الحكم بعد المراجعة الحرفية</span>
                </label>
              </div>
            </div>

            {/* 2. Ruling Substance (فحوى الحكم المستفاد) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  ② فحوى الحكم (العناصر المستخلصة للرسم العدلي)
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                  توليد آلي مطابق
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 min-h-[120px] whitespace-pre-wrap">
                {rulingSubstance}
              </div>

              <p className="text-[11px] text-slate-500">
                يتم استخراج أطراف النزاع، تاريخ السريان، والصداق تلقائياً لإدراجهما بسجل العقود دون المساس بالنص القضائي.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('duration_dowry')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق: المدة والصداق</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition"
            >
              <span>التالي: المطابقة النهائية والخطاب</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: FINAL VERIFICATION & CIVIL STATUS (Sections 16 & 18) */}

      {(activeTab === 'verification' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">5</span>
                🔐 المطابقة النهائية ومسطرة الحالة المدنية
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                فحص المؤشرات القانونية قبل التوقيع والخطاب وتتبع النظير المرسل لضابط الحالة المدنية
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                checklist.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {checklist.completedCount} / {checklist.items.length} عناصر مكتملة
              </span>
            </div>
          </div>

          {/* 10-Item Checklist Table (Section 16) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">عنصر التحقق القانوني</th>
                  <th className="p-3 w-28 text-center">حالة المطابقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checklist.items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400 font-mono">{item.id}</td>
                    <td className="p-3 font-medium text-slate-800">{item.label}</td>
                    <td className="p-3 text-center">
                      {item.status ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مطابق 🟢
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ناقص 🔴
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Final Verification Status Banner */}
          {checklist.allPassed ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <strong className="block text-sm font-bold">🟢 اكتملت مطابقة بيانات الحكم مع بيانات الرسم بنجاح:</strong>
                <p className="text-xs text-emerald-800 mt-0.5">
                  يمكن الآن الانتقال إلى مرحلة التوقيع والخطاب والمراجعة النهائية في المنصة.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <strong className="block text-sm font-bold">🟡 توجد عناصر غير مكتملة أو غير مطابقة:</strong>
                <p className="text-xs text-amber-800 mt-0.5">
                  يرجى مراجعة بيانات المحكمة أو أطراف الحكم أو الصداق لاستيفاء كافة أركان الرسم قبل الانتقال النهائي.
                </p>
              </div>
            </div>
          )}

          {/* Section 18: Civil Status Tracking Card (ما بعد الخطاب) */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                🏛️ دورة حياة الوثيقة: ما بعد الخطاب وإرسال النظير للحالة المدنية
              </span>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                مرسوم الحالة المدنية ومقتضيات المادة 16
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDeedCompleted}
                  onChange={e => setIsDeedCompleted(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-800">🟢 أُنجز الرسم بسجل العقود</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHomologated}
                  onChange={e => setIsHomologated(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-800">
                  {isHomologated ? '🟢 خوطب عليه لدى قاضي التوثيق' : '⚪ في انتظار الخطاب'}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCopyPrepared}
                  onChange={e => setIsCopyPrepared(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-800">
                  {isCopyPrepared ? '🟢 أُعد النظير الموجه للحالة المدنية' : '⚪ إعداد النظير'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">حالة الإرسال لضابط الحالة المدنية:</label>
                <select
                  value={sendingStatus}
                  onChange={e => setSendingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="في انتظار الإرسال للحالة المدنية">🟡 في انتظار الإرسال</option>
                  <option value="تم الإرسال">🟢 تم الإرسال رسميًا</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">تاريخ الإرسال:</label>
                <input
                  type="date"
                  value={civilStatusSentDate}
                  onChange={e => setCivilStatusSentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">مرجع ورقم الإرسالية:</label>
                <input
                  type="text"
                  value={civilStatusDispatchRef}
                  onChange={e => setCivilStatusDispatchRef(e.target.value)}
                  placeholder="مثال: إرسالية رقم 42/2024"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Navigation / Finalize to Step 7 */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>العودة لاختيار الرسوم</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('pronouncement')}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق: منطوق وفحوى الحكم</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinalizeAndProceed}
              disabled={discrepancyType === 'جوهري'}
              className={`px-8 py-3.5 rounded-xl font-bold text-white text-base shadow-lg transition flex items-center gap-3 ${
                discrepancyType === 'جوهري'
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              <span>الانتقال إلى المراجعة النهائية والاعتماد (الخطوة 7)</span>
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
