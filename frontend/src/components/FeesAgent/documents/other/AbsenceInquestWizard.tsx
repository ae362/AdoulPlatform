import React, { useState, useMemo, useEffect } from 'react';
import type { DocumentWizardProps } from '../../types';
import type {
  AbsenceInquestDeed,
  AbsenceType,
  ApplicantAbsenceRelationship,
  AbsencePurpose,
  AbsenceDepartureReason,
  AbsenteeNewsStatus,
  AbsenteeLifeKnowledge,
  AbsenceWitnessDetail,
  Party,
} from '../../../../types/feesAgentTypes';
import {
  convertGregorianToHijri,
  createEmptyParty,
} from '../../../../utils/feesAgentUtils';
import { Step5_Witnesses } from '../../steps/Step5_Witnesses';
import {
  Compass,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Check,
  Copy,
  Printer,
  Ban,
  Link2,
  FileCheck,
  Search,
  Sparkles,
  FileText,
  HelpCircle,
  Calendar,
  HeartHandshake,
  Send,
} from 'lucide-react';

export const AbsenceInquestWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
  onNext: _onNext,
  onBack,
}) => {
  // المراحل السبعة للمسار: 1 (النوع والطرفان) إلى 7 (المراجعة والتحرير)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // تاريخ اليوم ومراجع التوثيق
  const todayGregorian = state.meta?.dateGregorian || new Date().toISOString().split('T')[0];
  const todayHijri = state.meta?.dateHijri || convertGregorianToHijri(todayGregorian);

  // --------------------------------------------------------------------------
  // 1. نوع الغيبة (المرحلة 1)
  // --------------------------------------------------------------------------
  const [absenceType, setAbsenceType] = useState<AbsenceType>(
    state.absenceInquestDeed?.absenceType || 'غيبة_الزوج'
  );

  // --------------------------------------------------------------------------
  // 2. هوية الشخص الغائب (المرحلة 1)
  // --------------------------------------------------------------------------
  const [absentee, setAbsentee] = useState({
    fullName: state.absenceInquestDeed?.absentee?.fullName || state.sellers?.[0]?.name || '',
    fatherName: state.absenceInquestDeed?.absentee?.fatherName || state.sellers?.[0]?.fatherName || '',
    motherName: state.absenceInquestDeed?.absentee?.motherName || state.sellers?.[0]?.motherName || '',
    birthDate: state.absenceInquestDeed?.absentee?.birthDate || state.sellers?.[0]?.dateOfBirth || '',
    birthPlace: state.absenceInquestDeed?.absentee?.birthPlace || state.sellers?.[0]?.placeOfBirth || '',
    cin: state.absenceInquestDeed?.absentee?.cin || state.sellers?.[0]?.idNumber || '',
    nationality: state.absenceInquestDeed?.absentee?.nationality || 'مغربي',
    profession: state.absenceInquestDeed?.absentee?.profession || state.sellers?.[0]?.profession || '',
    lastKnownAddress: state.absenceInquestDeed?.absentee?.lastKnownAddress || state.sellers?.[0]?.address || '',
    maritalStatus: state.absenceInquestDeed?.absentee?.maritalStatus || (absenceType === 'غيبة_الزوج' || absenceType === 'غيبة_الزوجة' ? 'متزوج' : 'عازب'),
    role: state.absenceInquestDeed?.absentee?.role || (absenceType === 'غيبة_الزوج' ? 'زوج' : absenceType === 'غيبة_الزوجة' ? 'زوجة' : 'شخص غائب'),
  });

  // --------------------------------------------------------------------------
  // 3. علاقة الطالب بالشخص الغائب والغرض (المرحلة 1)
  // --------------------------------------------------------------------------
  const [applicant, setApplicant] = useState({
    fullName: state.absenceInquestDeed?.applicant?.fullName || state.buyers?.[0]?.name || '',
    cin: state.absenceInquestDeed?.applicant?.cin || state.buyers?.[0]?.idNumber || '',
    relationshipToAbsentee: (state.absenceInquestDeed?.applicant?.relationshipToAbsentee ||
      (absenceType === 'غيبة_الزوج' ? 'زوجة' : absenceType === 'غيبة_الزوجة' ? 'زوج' : 'وارث')) as ApplicantAbsenceRelationship,
    customRelationshipText: state.absenceInquestDeed?.applicant?.customRelationshipText || '',
    declaredPurpose: (state.absenceInquestDeed?.applicant?.declaredPurpose ||
      (absenceType === 'غيبة_الزوج' ? 'طلب_التطليق_للغيبة' : 'قصد_الإدلاء_بالرسم_أمام_القضاء')) as AbsencePurpose,
    customPurposeText: state.absenceInquestDeed?.applicant?.customPurposeText || '',
  });

  // مزامنة صلة الطالب بنوع الغيبة
  useEffect(() => {
    if (absenceType === 'غيبة_الزوج') {
      setApplicant(prev => ({
        ...prev,
        relationshipToAbsentee: 'زوجة',
        declaredPurpose: prev.declaredPurpose === 'قصد_الإدلاء_بالرسم_أمام_القضاء' ? 'طلب_التطليق_للغيبة' : prev.declaredPurpose,
      }));
      setAbsentee(prev => ({ ...prev, role: 'زوج' }));
    } else if (absenceType === 'غيبة_الزوجة') {
      setApplicant(prev => ({ ...prev, relationshipToAbsentee: 'زوج' }));
      setAbsentee(prev => ({ ...prev, role: 'زوجة' }));
    }
  }, [absenceType]);

  // --------------------------------------------------------------------------
  // 4. تاريخ بداية الغيبة والمغادرة (المرحلة 2)
  // --------------------------------------------------------------------------
  const [departureDate, setDepartureDate] = useState<string>(
    state.absenceInquestDeed?.departureDetails?.departureDate || ''
  );
  const [departurePlace, setDeparturePlace] = useState<string>(
    state.absenceInquestDeed?.departureDetails?.departurePlace || ''
  );
  const [destinationKnown, setDestinationKnown] = useState<string>(
    state.absenceInquestDeed?.departureDetails?.destinationKnown || ''
  );
  const [departureReason, setDepartureReason] = useState<AbsenceDepartureReason>(
    state.absenceInquestDeed?.departureDetails?.departureReason || 'سفر_للعمل'
  );
  const [customReasonText, setCustomReasonText] = useState<string>(
    state.absenceInquestDeed?.departureDetails?.customReasonText || ''
  );

  // حساب مدة الغيبة تلقائياً
  const calculatedDuration = useMemo(() => {
    if (!departureDate) return { years: 0, months: 0, days: 0, text: 'لم يحدد التاريخ بعد' };
    const dep = new Date(departureDate);
    const now = new Date(todayGregorian);
    if (isNaN(dep.getTime()) || dep > now) return { years: 0, months: 0, days: 0, text: 'تاريخ غير صالح' };

    let years = now.getFullYear() - dep.getFullYear();
    let months = now.getMonth() - dep.getMonth();
    let days = now.getDate() - dep.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'سنة' : years === 2 ? 'سنتان' : 'سنوات'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'شهر' : months === 2 ? 'شهران' : 'أشهر'}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام'}`);

    return {
      years,
      months,
      days,
      text: parts.join(' و '),
    };
  }, [departureDate, todayGregorian]);

  // --------------------------------------------------------------------------
  // 5. آخر مشاهدة وآخر اتصال (المرحلة 2)
  // --------------------------------------------------------------------------
  const [sightingDate, setSightingDate] = useState<string>(
    state.absenceInquestDeed?.lastSighting?.sightingDate || ''
  );
  const [sightingPlace, setSightingPlace] = useState<string>(
    state.absenceInquestDeed?.lastSighting?.sightingPlace || ''
  );
  const [seenBy, setSeenBy] = useState<string>(
    state.absenceInquestDeed?.lastSighting?.seenBy || 'أفراد اللفيف والجيران'
  );
  const [lastContactDate, setLastContactDate] = useState<string>(
    state.absenceInquestDeed?.lastSighting?.lastContactDate || ''
  );
  const [lastContactType, setLastContactType] = useState<
    'اتصال_هاتفي' | 'رسالة' | 'زيارة' | 'تواصل_عبر_شخص_آخر' | 'لا_يوجد_أي_اتصال' | 'غير_معلوم'
  >(state.absenceInquestDeed?.lastSighting?.lastContactType || 'لا_يوجد_أي_اتصال');

  // --------------------------------------------------------------------------
  // 6. مكان الغائب وإجراءات البحث (المرحلة 2)
  // --------------------------------------------------------------------------
  const [isLocationKnown, setIsLocationKnown] = useState<'نعم' | 'لا' | 'كان_معلوما_ثم_انقطعت_الأخبار'>(
    state.absenceInquestDeed?.locationStatus?.isLocationKnown || 'لا'
  );
  const [lastKnownCountry, setLastKnownCountry] = useState<string>(
    state.absenceInquestDeed?.locationStatus?.lastKnownCountry || 'المغرب'
  );
  const [lastKnownCity, setLastKnownCity] = useState<string>(
    state.absenceInquestDeed?.locationStatus?.lastKnownCity || ''
  );
  const [lastKnownAddress, setLastKnownAddress] = useState<string>(
    state.absenceInquestDeed?.locationStatus?.lastKnownAddress || ''
  );
  const [isContactPossible, setIsContactPossible] = useState<boolean>(
    state.absenceInquestDeed?.locationStatus?.isContactPossible ?? false
  );
  const [searchEffortsConducted, setSearchEffortsConducted] = useState<boolean>(
    state.absenceInquestDeed?.locationStatus?.searchEffortsConducted ?? true
  );
  const [searchMethods, setSearchMethods] = useState<string[]>(
    state.absenceInquestDeed?.locationStatus?.searchMethods || [
      'سؤال الأقارب',
      'سؤال الجيران والمعارف',
      'الاتصال الهاتفي ومحاولة التواصل',
      'البحث في آخر محل إقامة معلوم',
    ]
  );
  const [searchResultText, setSearchResultText] = useState<string>(
    state.absenceInquestDeed?.locationStatus?.searchResultText || 'لم تسفر جهود البحث والتحري عن معرفة مكانه أو مستقره الحالي.'
  );

  // --------------------------------------------------------------------------
  // 7. وضع الأخبار ومعرفة الحياة (المرحلة 3)
  // --------------------------------------------------------------------------
  const [newsStatus, setNewsStatus] = useState<AbsenteeNewsStatus>(
    state.absenceInquestDeed?.newsAndLifeStatus?.newsStatus || 'انقطعت_أخباره_تماما'
  );
  const [lifeKnowledge, setLifeKnowledge] = useState<AbsenteeLifeKnowledge>(
    state.absenceInquestDeed?.newsAndLifeStatus?.lifeKnowledge || 'لا_يعلمون_هل_هو_حي_أم_ميت'
  );
  const [potentialMissingPersonAlertAcknowledged, setPotentialMissingPersonAlertAcknowledged] = useState<boolean>(
    state.absenceInquestDeed?.newsAndLifeStatus?.potentialMissingPersonAlertAcknowledged ?? false
  );

  // --------------------------------------------------------------------------
  // 8. خصوصيات الزوجية والحالة الأسرية (إذا كان الغائب زوجاً أو زوجة)
  // --------------------------------------------------------------------------
  const [maritalSpecifics, setMaritalSpecifics] = useState({
    spouseName: state.absenceInquestDeed?.maritalSpecifics?.spouseName || applicant.fullName,
    marriageContractRef: state.absenceInquestDeed?.maritalSpecifics?.marriageContractRef || '',
    marriageContractDate: state.absenceInquestDeed?.maritalSpecifics?.marriageContractDate || '',
    hasChildren: state.absenceInquestDeed?.maritalSpecifics?.hasChildren ?? true,
    childrenCount: state.absenceInquestDeed?.maritalSpecifics?.childrenCount || 2,
    hasMaintenanceSupport: state.absenceInquestDeed?.maritalSpecifics?.hasMaintenanceSupport ?? false,
    lastMaritalHome: state.absenceInquestDeed?.maritalSpecifics?.lastMaritalHome || absentee.lastKnownAddress,
  });

  // --------------------------------------------------------------------------
  // 9. القضايا والملفات القضائية السابقة (المرحلة 3)
  // --------------------------------------------------------------------------
  const [priorCases, setPriorCases] = useState({
    hasPriorCase: state.absenceInquestDeed?.priorLegalCases?.hasPriorCase || ('لا' as any),
    courtName: state.absenceInquestDeed?.priorLegalCases?.courtName || 'المحكمة الابتدائية (قسم قضاء الأسرة)',
    fileNumber: state.absenceInquestDeed?.priorLegalCases?.fileNumber || '',
    caseYear: state.absenceInquestDeed?.priorLegalCases?.caseYear || '',
    caseType: state.absenceInquestDeed?.priorLegalCases?.caseType || '',
    rulingDate: state.absenceInquestDeed?.priorLegalCases?.rulingDate || '',
    rulingVerdict: state.absenceInquestDeed?.priorLegalCases?.rulingVerdict || '',
  });

  // --------------------------------------------------------------------------
  // 10. تفاصيل شهود اللفيف ونطاق علم كل شاهد (المرحلة 4)
  // --------------------------------------------------------------------------
  const [witnessDetails, setWitnessDetails] = useState<AbsenceWitnessDetail[]>(
    state.absenceInquestDeed?.witnessDetails ||
      Array.from({ length: 12 }, (_, i) => ({
        witnessIndex: i + 1,
        durationOfKnowledgeYears: 10,
        cohabitationMethod: 'جيرة ومخالطة مستمرة',
        knewUsualResidence: true,
        witnessedDeparture: true,
        knowsLastLocation: false,
        lastLocationKnown: 'مجهول',
        knowsDateOfCutoff: true,
        cutoffDate: departureDate || 'منذ تاريخ المغادرة',
        knowsNewsStatus: true,
        specificObservationText: 'يشهد بأنه يعرفه معرفة تامة، وبأنه غادر محل سكناه المعتاد ولم يعد إليه منذ ذلك التاريخ وانقطعت أخباره.',
      }))
  );

  // مزامنة عدد الشهود
  useEffect(() => {
    const wCount = (state.witnesses || []).length || 12;
    if (witnessDetails.length < wCount) {
      const extra = Array.from({ length: wCount - witnessDetails.length }, (_, idx) => ({
        witnessIndex: witnessDetails.length + idx + 1,
        durationOfKnowledgeYears: 10,
        cohabitationMethod: 'مخالطة مستمرة',
        knewUsualResidence: true,
        witnessedDeparture: true,
        knowsLastLocation: false,
        lastLocationKnown: 'مجهول',
        knowsDateOfCutoff: true,
        cutoffDate: departureDate || 'منذ تاريخ المغادرة',
        knowsNewsStatus: true,
        specificObservationText: 'يشهد بمغادرته وغيبته وانقطاع أخباره عن محل إقامته.',
      }));
      setWitnessDetails(prev => [...prev, ...extra]);
    }
  }, [state.witnesses, witnessDetails.length, departureDate]);

  // --------------------------------------------------------------------------
  // فحص التناقض بين الشهود (Cross-Witness Contradiction Detector)
  // --------------------------------------------------------------------------
  const crossWitnessIssues = useMemo(() => {
    const issues: Array<{ level: 'warning' | 'error' | 'info'; message: string; tip: string }> = [];

    // فحص تناقض مكان الغائب المعلوم
    const knownLocations = witnessDetails
      .filter(w => w.knowsLastLocation && w.lastLocationKnown && w.lastLocationKnown !== 'مجهول')
      .map(w => w.lastLocationKnown?.trim());
    const uniqueLocations = Array.from(new Set(knownLocations));
    if (uniqueLocations.length > 1) {
      issues.push({
        level: 'warning',
        message: `تعارض في أقوال الشهود حول آخر مكان معلوم: صُرح بـ (${uniqueLocations.join(' مقابل ')}).`,
        tip: 'يرجى مراجعة وتوحيد أقوال اللفيف بشأن آخر مكان معلوم لتجنب رد الشهادة أمام المحكمة.',
      });
    }

    // فحص مدة الغيبة بالنسبة للزوج (المادة 104)
    if (absenceType === 'غيبة_الزوج' && calculatedDuration.years < 1) {
      issues.push({
        level: 'info',
        message: `مدة الغيبة المصرح بها (${calculatedDuration.text}) تقل عن سنة كاملة.`,
        tip: 'مدونة الأسرة (المادة 104) تشترط مرور أكثر من سنة كأجل لطلب التطليق للغيبة، والمحكمة تتحقق من ذلك بكافة الوسائل.',
      });
    }

    // فحص احتمال الفقدان
    if (lifeKnowledge === 'لا_يعلمون_هل_هو_حي_أم_ميت' && newsStatus === 'انقطعت_أخباره_تماما') {
      issues.push({
        level: 'warning',
        message: 'الحالة تقترب من وضعية «المفقود» (انقطاع الأخبار مع الجهل بالحياة أو الوفاة).',
        tip: 'مدونة الأسرة (المواد 325-327) تخص المفقود بمسطرة مستقلة؛ لا يجوز أن يشتمل موجب الغيبة على إثبات الوفاة أو الحكم بها.',
      });
    }

    // نصاب الشهود
    const wCount = (state.witnesses || []).length;
    if (wCount < 12) {
      issues.push({
        level: 'warning',
        message: `نصاب اللفيف غير مكتمل (${wCount} من 12 شاهداً).`,
        tip: 'موجب إثبات الغيبة كشهادة لفيفية يشترط فيه نصاب 12 شاهداً مستوفين لشروط الأهلية والتحري.',
      });
    }

    return issues;
  }, [witnessDetails, absenceType, calculatedDuration, lifeKnowledge, newsStatus, state.witnesses]);

  // --------------------------------------------------------------------------
  // الصياغة العدلية الذكية رباعية الطبقات (Four-Layer Legal Drafting)
  // --------------------------------------------------------------------------
  const generatedRasmText = useMemo(() => {
    const aName = absentee.fullName || 'المشهود في غيبته';
    const aFather = absentee.fatherName || '...';
    const aMother = absentee.motherName || '...';
    const aCin = absentee.cin ? `(رقم ب.ت.و: ${absentee.cin})` : '';
    const aBirth = absentee.birthDate ? `المولود بتاريخ ${absentee.birthDate}${absentee.birthPlace ? ` بـ ${absentee.birthPlace}` : ''}` : '';
    const aAddress = absentee.lastKnownAddress ? `والذي كان يقيم سابقاً بـ: ${absentee.lastKnownAddress}` : '';

    const reqName = applicant.fullName || 'طالب(ة) الإشهاد';
    const reqCin = applicant.cin ? `(رقم ب.ت.و: ${applicant.cin})` : '';
    const reqRel = applicant.customRelationshipText || applicant.relationshipToAbsentee;
    const reqPurpose = applicant.customPurposeText || applicant.declaredPurpose.replace(/_/g, ' ');

    const depReasonLabel =
      departureReason === 'سفر_للعمل'
        ? 'قصد العمل والتكسب'
        : departureReason === 'سفر_للدراسة'
        ? 'قصد الدراسة'
        : departureReason === 'سفر_للعلاج'
        ? 'قصد العلاج والاستشفاء'
        : departureReason === 'هجرة'
        ? 'قصد الهجرة خارج الوطن'
        : customReasonText || 'لسفر ومقصد خاص';

    const depClause = departureDate
      ? `أنه غادر محل إقامته وسكناه المذكور بتاريخ ${departureDate}${departurePlace ? ` انطلاقاً من ${departurePlace}` : ''}، ${depReasonLabel}${destinationKnown ? ` متوجهاً إلى ${destinationKnown}` : ''}`
      : 'أنه غادر محل إقامته المعتاد منذ مدة طويلة';

    const durationClause = `ولم يعد إلى محل إقامته منذ ذلك الحين إلى تاريخه، بحيث استمرت غيبته مدة ${calculatedDuration.text}`;

    const sightingClause = sightingDate
      ? `وأن آخر عهدهم بمشاهدته كان بتاريخ ${sightingDate}${sightingPlace ? ` بـ ${sightingPlace}` : ''}`
      : 'ولم يُعاين في محل إقامته المعتاد طوال المدة المذكورة';

    const contactClause =
      lastContactType === 'لا_يوجد_أي_اتصال'
        ? 'ولم يثبت لديهم أي اتصال أو تواصل معه طوال مدة غيبته'
        : lastContactDate
        ? `وأن آخر اتصال به كان بتاريخ ${lastContactDate} عبر ${lastContactType.replace(/_/g, ' ')} ثم انقطع خبره`
        : 'ولم يعلموا له وسيلة تواصل جارية';

    const locationClause =
      isLocationKnown === 'نعم' && lastKnownCity
        ? `وأن مكانه الأخير المعلوم حسب الإفادة هو بـ: ${lastKnownCountry} (${lastKnownCity})`
        : isLocationKnown === 'كان_معلوما_ثم_انقطعت_الأخبار'
        ? 'وأن مكانه كان معلوماً في البداية ثم انقطعت أخباره وجهل مستقره ومحله'
        : 'وأن مكانه الحالي ومستقره مجهول تماماً بعد البحث والسؤال عنه';

    const newsClause =
      newsStatus === 'انقطعت_أخباره_تماما'
        ? 'وقد انقطعت أخباره بالكلية عن أسرته وأقاربه ومحل إقامته'
        : newsStatus === 'تصل_أخباره_بانتظام'
        ? 'وتصل أخباره بانتظام دون حضوره أو عودته إلى المحل'
        : 'وتصل عنه أخبار غير مؤكدة بين الفينة والأخرى';

    const lifeClause =
      lifeKnowledge === 'يعلمون_أنه_حي'
        ? 'وهم يعلمون بحياته دون معرفة عودته'
        : lifeKnowledge === 'لا_يعلمون_هل_هو_حي_أم_ميت'
        ? 'ولا يعلم أفراد اللفيف حقيقة حاله هل هو حي أم ميت، مع بقاء أصل استصحاب الحياة دون تصريح بالوفاة أو الموت الحكمي'
        : 'ولا تتوفر لديهم معلومات قطعية بشأن حياته';

    const maritalClause =
      absenceType === 'غيبة_الزوج'
        ? `\nوقد أدلت الزوجة برسم زواجها به ${maritalSpecifics.marriageContractRef ? `(عدد ${maritalSpecifics.marriageContractRef})` : ''}، مؤكدة أنه تركها دون نفقة ولا كفيل، قصد الإدلاء بهذا الموجب أمام قسم قضاء الأسرة طبقاً لمقتضيات المواد 99 و100 و104 و105 من مدونة الأسرة.`
        : absenceType === 'غيبة_الزوجة'
        ? '\nوأن الغائبة تركت بيت الزوجية وغادرت إلى وجهة غير معلومة قصد الإدلاء بالموجب أمام المحكمة المختصة.'
        : '';

    const witnessesList = state.witnesses || [];
    const witnessesText = witnessesList.length > 0
      ? witnessesList.map((w, idx) => `${idx + 1}. ${w.name || 'شاهد'} (ب.ت.و: ${w.idNumber || '...'}) - المهنة: ${w.profession || '...'} - السكن: ${w.address || '...'}`).join('\n')
      : '... (يقيد هنا أفراد اللفيف الاثنا عشر بكامل هوياتهم وصفاتهم) ...';

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه.

موجب إثبات غيبة (شهادة لفيفية)
مرجع الإشهاد: قسم قضاء الأسرة
بتاريخ: ${todayHijri} هـ موافق ${todayGregorian} م.

أمام العدلين الموقعين أسفله بمكتبهما التوثيقي:
الطبقة الأولى: تعريف طالب الإشهاد وصفته وغرضه
حضرت: ${reqName}، ${reqCin}، بصفتها: (${reqRel}) للشخص المشهود في غيبته، وطلبت تحرير شهادة لفيفية لإثبات واقعة غيبته قصد: (${reqPurpose}) أمام الجهات القضائية المختصة.

الطبقة الثانية: تعريف الشخص الغائب
وحضر معها شهود اللفيف الاثنا عشر الآتية أسماؤهم وهوية كل واحد منهم:
${witnessesText}

الذين بعد استفسارهم والتأكد من أهليتهم الشرعية والقانونية وخلوهم من موانع الشهادة، شهد كل واحد منهم بما يعلمه علماً يقيناً ومباشراً:
بأنهم يعرفون معرفة تامة ومخالطة متصلة السيد: ${aName}، ابن ${aFather} والمرحومة/السيدة ${aMother}، ${aBirth}، ${aCin}، ${aAddress}.

الطبقة الثالثة: وقائع الغيبة المشهودة
ويشهد اللفيف المذكور عن عيان ومشاهدة واطلاع مستمر على أحواله:
1) ${depClause}.
2) ${durationClause}.
3) ${sightingClause}.
4) ${contactClause}.
5) ${locationClause}.
6) ${newsClause}، ${lifeClause}.${maritalClause}

الطبقة الرابعة: مستند علم اللفيف وتلقي الشهادة
ويشهد أفراد اللفيف بأن شهادتهم هذه مبنية على المشاهدة والمعاشرة والمخالطة والجوار واطلاعهم المستمر على محل إقامة المعني بالأمر ومتابعتهم لأحواله وأحوال أسرته، وأن ما شهدوا به هو ما استقر في علمهم دون زيادة ولا نقصان.
مع الإشارة الصريحة إلى أن هذا المحرر شهادة بعدم الحضور والغياب والانقطاع، ولا يتضمن قضاءً بالموت الحكمي ولا وصفاً بالفقدان القانوني المستوجب لمسطرة المواد 325 وما يليها من مدونة الأسرة.

وعلى ما ذكر، شهد اللفيف المذكور وأشهدوا على أنفسهم بما فُصّل أعلاه للإدلاء به أمام المحكمة الابتدائية المختصة لاتخاذ ما تراه قانوناً.
وتُليت عليهم فصول الشهادة فصادقوا عليها، وأذنوا بتحريرها طبقاً للقانون.
(توقيع الشهود)                                   (توقيع العدلين)`;
  }, [
    absentee,
    applicant,
    departureReason,
    customReasonText,
    departureDate,
    departurePlace,
    destinationKnown,
    calculatedDuration,
    sightingDate,
    sightingPlace,
    lastContactType,
    lastContactDate,
    isLocationKnown,
    lastKnownCountry,
    lastKnownCity,
    newsStatus,
    lifeKnowledge,
    absenceType,
    maritalSpecifics,
    state.witnesses,
    todayGregorian,
    todayHijri,
  ]);

  // --------------------------------------------------------------------------
  // حفظ ومزامنة الحالة مع FeesAgentState
  // --------------------------------------------------------------------------
  useEffect(() => {
    const deedData: AbsenceInquestDeed = {
      absenceType,
      absentee,
      applicant,
      departureDetails: {
        departureDate,
        departurePlace,
        destinationKnown,
        departureReason,
        customReasonText,
        calculatedDurationText: calculatedDuration.text,
      },
      lastSighting: {
        sightingDate,
        sightingPlace,
        seenBy,
        lastContactDate,
        lastContactType,
      },
      locationStatus: {
        isLocationKnown,
        lastKnownCountry,
        lastKnownCity,
        lastKnownAddress,
        isContactPossible,
        searchEffortsConducted,
        searchMethods,
        searchResultText,
      },
      newsAndLifeStatus: {
        newsStatus,
        lifeKnowledge,
        potentialMissingPersonAlertAcknowledged,
      },
      maritalSpecifics: (absenceType === 'غيبة_الزوج' || absenceType === 'غيبة_الزوجة') ? maritalSpecifics : undefined,
      priorLegalCases: priorCases,
      witnessDetails,
      deedText: generatedRasmText,
    };

    const absenteeParty: Party = {
      ...createEmptyParty(),
      id: 'party-absentee',
      name: absentee.fullName,
      idNumber: absentee.cin,
      nationality: (absentee.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as "" | "مغربي" | "اجنبي",
      address: absentee.lastKnownAddress,
      partyRole: 'شخص غائب',
    };

    const applicantParty: Party = {
      ...createEmptyParty(),
      id: 'party-applicant-absence',
      name: applicant.fullName,
      idNumber: applicant.cin,
      nationality: 'مغربي',
      partyRole: applicant.relationshipToAbsentee,
    };

    setState(prev => ({
      ...prev,
      absenceInquestDeed: deedData,
      sellers: [absenteeParty],
      buyers: [applicantParty],
    }));
  }, [
    absenceType,
    absentee,
    applicant,
    departureDate,
    departurePlace,
    destinationKnown,
    departureReason,
    customReasonText,
    calculatedDuration,
    sightingDate,
    sightingPlace,
    seenBy,
    lastContactDate,
    lastContactType,
    isLocationKnown,
    lastKnownCountry,
    lastKnownCity,
    lastKnownAddress,
    isContactPossible,
    searchEffortsConducted,
    searchMethods,
    searchResultText,
    newsStatus,
    lifeKnowledge,
    potentialMissingPersonAlertAcknowledged,
    maritalSpecifics,
    priorCases,
    witnessDetails,
    generatedRasmText,
    setState,
  ]);

  // قائمة مراحل المعالج
  const stagesList = [
    { id: 1, title: 'النوع والطرفان', desc: 'نوع الغيبة وهوية الغائب والطالب', icon: Users },
    { id: 2, title: 'المغادرة والمشاهدة', desc: 'تاريخ البداية والمكان والبحث', icon: Calendar },
    { id: 3, title: 'الأخبار والفقدان', desc: 'حالة الأخبار والضابط القانوني', icon: HelpCircle },
    { id: 4, title: 'خصوصيات الزوجية', desc: 'آثار الزوجية والتطليق للغيبة', icon: HeartHandshake },
    { id: 5, title: 'شهود اللفيف (12)', desc: 'نصاب الـ 12 وفحص التناقض', icon: Users },
    { id: 6, title: 'الوثائق والقضاء', desc: 'مرفقات الملف وقضاء الأسرة', icon: FileText },
    { id: 7, title: 'المراجعة والتحرير', desc: 'الصياغة رباعية الطبقات والتوثيق', icon: FileCheck },
  ];

  // قائمة الفحص الذكي (Checklist) للمرحلة 7
  const checklist = useMemo(() => {
    const witnessesCount = (state.witnesses || []).length;
    return {
      hasAbsenteeName: Boolean(absentee.fullName.trim()),
      hasAbsenteeCin: Boolean(absentee.cin.trim()),
      hasApplicantName: Boolean(applicant.fullName.trim()),
      hasApplicantCin: Boolean(applicant.cin.trim()),
      hasDepartureDate: Boolean(departureDate),
      hasPurpose: Boolean(applicant.declaredPurpose),
      hasTwelveWitnesses: witnessesCount >= 12,
      allPassed:
        Boolean(absentee.fullName.trim()) &&
        Boolean(absentee.cin.trim()) &&
        Boolean(applicant.fullName.trim()) &&
        Boolean(applicant.cin.trim()) &&
        Boolean(departureDate) &&
        Boolean(applicant.declaredPurpose) &&
        witnessesCount >= 12,
    };
  }, [absentee, applicant, departureDate, state.witnesses]);

  const handleCopyDeed = () => {
    navigator.clipboard.writeText(generatedRasmText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // الانتقال المباشر للمرحلة 7 (المراجعة النهائية والإرسال للقاضي المكلف بالتوثيق)
  const handleProceedToStep7 = () => {
    const absenteeParty: Party = {
      ...createEmptyParty(),
      id: 'party-absentee',
      name: absentee.fullName,
      idNumber: absentee.cin,
      nationality: (absentee.nationality === 'اجنبي' ? 'اجنبي' : 'مغربي') as "" | "مغربي" | "اجنبي",
      address: absentee.lastKnownAddress,
      partyRole: 'شخص غائب',
    };

    const applicantParty: Party = {
      ...createEmptyParty(),
      id: 'party-applicant-absence',
      name: applicant.fullName,
      idNumber: applicant.cin,
      nationality: 'مغربي',
      partyRole: applicant.relationshipToAbsentee,
    };

    setState(prev => ({
      ...prev,
      step: 7,
      documentType: 'موجب_إثبات_غيبة',
      draft: generatedRasmText,
      draftText: generatedRasmText,
      sellers: [absenteeParty],
      buyers: [applicantParty],
      witnesses: prev.witnesses || [],
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-20 text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* بطاقة العملية الثابتة أعلى الشاشة (Fixed Process Banner) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shadow-xs shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200">
                  📜 موجب إثبات غيبة
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  👥 شهادة لفيفية (12 شاهداً)
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  checklist.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  {checklist.allPassed ? '🟢 مكتمل وجاهز للصياغة' : '🟠 في طور إعداد الشهادة'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-amiri">
                شهادة اللفيف لإثبات واقعة الغيبة وتاريخ المغادرة وانقطاع الأخبار
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, step: 0.25 }))}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50/60 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="مراجعة شروط التلقي والاختصاص المكاني (المرحلة 0.25)"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>فحص شروط التلقي (0.25)</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToStep7}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-md shadow-red-900/30 border border-red-400/40 flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
              title="الانتقال المباشر للمراجعة النهائية وتقديم الوثيقة للقاضي المكلف بالتوثيق (المرحلة 7)"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>المتابعة إلى مرحلة المراجعة والإرسال للقاضي (المرحلة 7)</span>
            </button>
          </div>
        </div>

        {/* بطاقة معلومات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👤 الشخص الغائب</span>
            <span className="font-black text-slate-900 truncate block">
              {absentee.fullName || 'قيد التحديد'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👤 طالب الإشهاد وصلته</span>
            <span className="font-bold text-cyan-900 truncate block">
              {applicant.fullName ? `${applicant.fullName} (${applicant.relationshipToAbsentee})` : 'قيد التحديد'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">⏳ مدة الغيبة المحسوبة</span>
            <span className="font-black text-amber-700 truncate block">
              {calculatedDuration.text}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] font-bold mb-0.5">👥 نصاب الشهود</span>
            <span className="font-black text-emerald-700">
              {(state.witnesses || []).length} من 12 شاهداً
            </span>
          </div>
        </div>

        {/* ⑮ التمييز الصارم بين الغيبة والفقدان */}
        <div className="p-3.5 bg-gradient-to-r from-cyan-50/70 via-slate-50 to-amber-50/70 rounded-2xl border border-cyan-200/60 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-slate-700">
            <span className="text-cyan-900 font-bold">🔹 الغيبة: غياب عن المحل، مع إمكانية معلومية الحياة.</span>
            <span className="text-slate-400 font-bold">|</span>
            <span className="text-amber-900 font-bold">🔸 غيبة مع جهالة المكان: غياب مع جهالة المقر دون جزم بالوفاة.</span>
            <span className="text-slate-400 font-bold">|</span>
            <span className="text-rose-900 font-bold">⚠️ الفقدان: انقطاع الخبر مع الشك في الحياة، ويخضع للمادتين 325 و327 قضائياً.</span>
          </div>
        </div>

        {/* شريط خطوات المسار التفاعلي */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {stagesList.map((st) => {
            const Icon = st.icon;
            const isCurrent = activeStage === st.id;
            const isDone = activeStage > st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`p-2.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-cyan-600 bg-cyan-50/70 shadow-xs'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isCurrent ? 'bg-cyan-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {st.id}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${
                    isCurrent ? 'text-cyan-600' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                </div>
                <div className="font-black text-xs text-slate-900 truncate">{st.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ① و ② المرحلة 1: نوع موجب الغيبة وهوية الغائب وطالب الإشهاد */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ① نوع موجب الغيبة وعلاقة الطالب بالشخص الغائب والغرض المصرح به
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تحديد الوصف القانوني للغيبة وبيانات الأطراف دون الخلط بين الغيبة والفقدان
              </p>
            </div>
          </div>

          {/* ① نوع موجب الغيبة */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ① حدد نوع موجب الغيبة المطلوب تحريره:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'غيبة_الزوج', label: '① غيبة الزوج', desc: 'لإثبات غياب الزوج عن زوجته (م 99-105)' },
                { key: 'غيبة_الزوجة', label: '② غيبة الزوجة', desc: 'لإثبات غياب الزوجة عن زوجها' },
                { key: 'غيبة_شخص_آخر', label: '③ غيبة شخص آخر', desc: 'أب، أم، ابن، بنت، أخ، وارث، صاحب حق' },
                { key: 'غيبة_مع_انقطاع_الأخبار_وعدم_معرفة_المكان', label: '④ غيبة مع انقطاع الأخبار', desc: 'تتطلب تنبيهاً بشأن المفقود' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAbsenceType(item.key as any)}
                  className={`p-3.5 rounded-2xl border text-right transition cursor-pointer space-y-1 ${
                    absenceType === item.key
                      ? 'border-cyan-600 bg-cyan-50/70 shadow-xs ring-1 ring-cyan-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>

            {/* تنبيه الحالة الرابعة (المفقود) */}
            {absenceType === 'غيبة_مع_انقطاع_الأخبار_وعدم_معرفة_المكان' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-bold space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>تنبيه قانوني حاسم (مدونة الأسرة - المواد 325 إلى 327):</span>
                </div>
                <p className="leading-relaxed">
                  إذا كان الأمر يتعلق بانقطاع أخبار الشخص وعدم معرفة حياته أو مماته، فقد تقترب الحالة من وصف «المفقود»، وهو وضع قانوني مستقل عن مجرد الغيبة. ولا ينبغي للتطبيق أن يخلط بين إثبات الغيبة وإثبات الوفاة الحكمية؛ لأن مدونة الأسرة لا تعتبر الشخص ميتاً حكماً بمجرد موجب غيبة، بل يلزم صدور حكم قضائي بذلك بعد التحري والبحث.
                </p>
              </div>
            )}
          </div>

          {/* بطاقة الشخص موضوع الغيبة */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>👤 هوية الشخص موضوع الغيبة (الغائب):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={absentee.fullName}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="الاسم العائلي والشخصي"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={absentee.fatherName}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="اسم الأب"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={absentee.motherName}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, motherName: e.target.value }))}
                  placeholder="اسم الأم"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                <input
                  type="date"
                  value={absentee.birthDate}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, birthDate: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">مكان الازدياد</label>
                <input
                  type="text"
                  value={absentee.birthPlace}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, birthPlace: e.target.value }))}
                  placeholder="مكان الازدياد"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN) *</label>
                <input
                  type="text"
                  value={absentee.cin}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                  placeholder="مثال: A123456"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl uppercase font-mono font-bold focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المهنة المعروفة</label>
                <input
                  type="text"
                  value={absentee.profession}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, profession: e.target.value }))}
                  placeholder="المهنة أو الوظيفة"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان الأخير المعروف للمحل المعتاد</label>
                <input
                  type="text"
                  value={absentee.lastKnownAddress}
                  onChange={(e) => setAbsentee(prev => ({ ...prev, lastKnownAddress: e.target.value }))}
                  placeholder="آخر محل سكنى معروف للغائب قبل مغادرته"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>
            </div>
          </div>

          {/* ② علاقة الطالب بالشخص الغائب والغرض */}
          <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-200 space-y-4">
            <h4 className="text-xs font-black text-cyan-950 flex items-center gap-1.5">
              <span>👤 طالب الإشهاد، صلته بالغائب، والغرض المصرح به:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم طالب الإشهاد *</label>
                <input
                  type="text"
                  value={applicant.fullName}
                  onChange={(e) => setApplicant(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="اسم طالب تحرير الرسم"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم ب.ت.و لطالب الإشهاد *</label>
                <input
                  type="text"
                  value={applicant.cin}
                  onChange={(e) => setApplicant(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                  placeholder="مثال: BE98765"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">صلة الطالب بالشخص الغائب *</label>
                <select
                  value={applicant.relationshipToAbsentee}
                  onChange={(e) => setApplicant(prev => ({ ...prev, relationshipToAbsentee: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                >
                  <option value="زوجة">زوجة</option>
                  <option value="زوج">زوج</option>
                  <option value="أب">أب</option>
                  <option value="أم">أم</option>
                  <option value="ابن">ابن</option>
                  <option value="ابنة">ابنة</option>
                  <option value="أخ">أخ</option>
                  <option value="أخت">أخت</option>
                  <option value="وارث">وارث</option>
                  <option value="قريب">قريب</option>
                  <option value="دائن">دائن</option>
                  <option value="صاحب_مصلحة">صاحب مصلحة</option>
                  <option value="أخرى">صفة أخرى</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ما الغرض من طلب إثبات الغيبة؟ * (يسجل النظام الغرض المصرح به دون فرض أثر قضائي تلقائي)
                </label>
                <select
                  value={applicant.declaredPurpose}
                  onChange={(e) => setApplicant(prev => ({ ...prev, declaredPurpose: e.target.value as any }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                >
                  <option value="طلب_التطليق_للغيبة">طلب التطليق للغيبة (المواد 99-105 من مدونة الأسرة)</option>
                  <option value="إجراء_قضائي_متعلق_بالنفقة">إجراء قضائي متعلق بإسقاط أو ثبوت النفقة</option>
                  <option value="إجراء_متعلق_بالحضانة">إجراء قضائي متعلق بالحضانة والولاية</option>
                  <option value="إجراء_متعلق_بمال_أو_حق">إجراء متعلق بحفظ مال أو حق للغائب</option>
                  <option value="إجراء_متعلق_بالتركة">إجراء متعلق بقسمة تركة أو حصر متروك</option>
                  <option value="إجراء_متعلق_بالنيابة_أو_التمثيل">إجراء متعلق بتعيين نائب أو قيم قضائي</option>
                  <option value="قصد_الإدلاء_بالرسم_أمام_القضاء">قصد الإدلاء بالرسم أمام القضاء عموماً</option>
                  <option value="سبب_قضائي_آخر">سبب أو غرض آخر يذكره الطالب</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                العودة لاختيار الوثيقة
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى تاريخ المغادرة وآخر مشاهدة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ③ و ④ و ⑤ المرحلة 2: تاريخ بداية الغيبة وآخر مشاهدة ومكان الغائب */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ③ و ④ و ⑤ بداية الغيبة، آخر مشاهدة، ومكان الغائب وجهود البحث
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                ضبط التواريخ والوقائع المعاينة من قِبل اللفيف مع الحساب التلقائي للمدة
              </p>
            </div>
          </div>

          {/* ③ تاريخ بداية الغيبة */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ③ متى غادر الشخص الغائب محل سكناه؟ (تاريخ بداية الغيبة):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ المغادرة *</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المكان الذي غادر منه</label>
                <input
                  type="text"
                  value={departurePlace}
                  onChange={(e) => setDeparturePlace(e.target.value)}
                  placeholder="المدينة أو محل السكن"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">إلى أين كان متوجهاً (إن عُلم)</label>
                <input
                  type="text"
                  value={destinationKnown}
                  onChange={(e) => setDestinationKnown(e.target.value)}
                  placeholder="المدينة أو الدولة المقصودة أو مجهول"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-cyan-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">سبب السفر أو المغادرة</label>
                <select
                  value={departureReason}
                  onChange={(e) => setDepartureReason(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:border-cyan-600"
                >
                  <option value="سفر_للعمل">سفر للعمل والتكسب</option>
                  <option value="سفر_للدراسة">سفر للدراسة</option>
                  <option value="سفر_للعلاج">سفر للعلاج والاستشفاء</option>
                  <option value="سفر_عائلي">سفر عائلي</option>
                  <option value="هجرة">هجرة خارج الوطن</option>
                  <option value="سفر_عادي">سفر عادي</option>
                  <option value="سبب_آخر">سبب آخر</option>
                </select>
                {departureReason === 'سبب_آخر' && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">بيان السبب الآخر بالتفصيل</label>
                    <input
                      type="text"
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      placeholder="اكتب سبب المغادرة بالتحديد..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-cyan-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* بطاقة المدة المحسوبة تلقائياً */}
            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 flex items-center justify-between text-xs">
              <span className="font-black text-cyan-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-700" />
                <span>المدة المستغرقة منذ تاريخ المغادرة إلى اليوم:</span>
              </span>
              <span className="font-black text-cyan-900 bg-white px-3 py-1 rounded-lg border border-cyan-200 font-mono">
                {calculatedDuration.text}
              </span>
            </div>
          </div>

          {/* ④ آخر مشاهدة وآخر اتصال */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>④ آخر مشاهدة للشخص الغائب وآخر تواصل معه:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ آخر مشاهدة عاينها الشهود</label>
                <input
                  type="date"
                  value={sightingDate}
                  onChange={(e) => setSightingDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المكان الذي شوهد فيه</label>
                <input
                  type="text"
                  value={sightingPlace}
                  onChange={(e) => setSightingPlace(e.target.value)}
                  placeholder="المدينة أو المحل"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">من شاهده؟</label>
                <input
                  type="text"
                  value={seenBy}
                  onChange={(e) => setSeenBy(e.target.value)}
                  placeholder="أفراد اللفيف، الجيران، أسرته..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع آخر اتصال به</label>
                <select
                  value={lastContactType}
                  onChange={(e) => setLastContactType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:border-cyan-600"
                >
                  <option value="لا_يوجد_أي_اتصال">لا يوجد أي اتصال إطلاقاً</option>
                  <option value="اتصال_هاتفي">اتصال هاتفي</option>
                  <option value="رسالة">رسالة أو بريد إلكتروني</option>
                  <option value="زيارة">زيارة عابرة</option>
                  <option value="تواصل_عبر_شخص_آخر">تواصل عبر شخص وسيط</option>
                  <option value="غير_معلوم">غير معلوم</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ آخر اتصال</label>
                <input
                  type="date"
                  value={lastContactDate}
                  onChange={(e) => setLastContactDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                />
              </div>
            </div>
          </div>

          {/* ⑤ و ⑥ مكان الغائب وإجراءات البحث */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-900">
                ⑤ هل مكان الغائب الحالي معلوم؟
              </span>
              <div className="flex items-center gap-3 text-xs font-bold">
                {[
                  { key: 'لا', label: 'مجهول المكان' },
                  { key: 'نعم', label: 'معلوم المكان' },
                  { key: 'كان_معلوما_ثم_انقطعت_الأخبار', label: 'كان معلوماً ثم انقطعت أخباره' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="isLocRadio"
                      checked={isLocationKnown === item.key}
                      onChange={() => setIsLocationKnown(item.key as any)}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* إذا كان معلوماً */}
            {isLocationKnown === 'نعم' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة</label>
                  <input
                    type="text"
                    value={lastKnownCountry}
                    onChange={(e) => setLastKnownCountry(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={lastKnownCity}
                    onChange={(e) => setLastKnownCity(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان أو مقر العمل</label>
                  <input
                    type="text"
                    value={lastKnownAddress}
                    onChange={(e) => setLastKnownAddress(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* ⑥ إذا كان مجهول المكان - إجراءات البحث */}
            {isLocationKnown !== 'نعم' && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 animate-in fade-in text-xs">
                <span className="font-bold text-slate-900 block">
                  ⑥ إجراءات ومحاولات البحث عن الغائب:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    'سؤال الأقارب',
                    'سؤال الجيران والمعارف',
                    'التواصل مع مكان العمل',
                    'البحث في آخر محل إقامة',
                    'الاتصال الهاتفي ومحاولة التواصل',
                    'مراسلة ومكاتبة',
                    'البحث بواسطة الجهات المختصة',
                    'وسيلة أخرى',
                  ].map(m => {
                    const active = searchMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSearchMethods(prev =>
                            active ? prev.filter(x => x !== m) : [...prev, m]
                          );
                        }}
                        className={`p-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                          active
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-950 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <span>{m}</span>
                        {active && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                      </button>
                    );
                  })}
                </div>

                 <input
                  type="text"
                  value={searchResultText}
                  onChange={(e) => setSearchResultText(e.target.value)}
                  placeholder="نتيجة البحث والتحري المصرح بها..."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                />

                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={searchEffortsConducted}
                      onChange={(e) => setSearchEffortsConducted(e.target.checked)}
                      className="rounded text-cyan-700 focus:ring-cyan-600 w-4 h-4"
                    />
                    <span>تم إجراء جهود وتحريات كافية ومستفيضة للبحث عنه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={isContactPossible}
                      onChange={(e) => setIsContactPossible(e.target.checked)}
                      className="rounded text-cyan-700 focus:ring-cyan-600 w-4 h-4"
                    />
                    <span>إمكانية التواصل معه متاحة حالياً</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: النوع والطرفان
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى وضع الأخبار وفحص الفقدان</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑦ و ⑧ المرحلة 3: وضع الأخبار وفحص احتمال الفقدان والقضايا السابقة */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑦ و ⑧ وضع الأخبار، علم اللفيف بالحياة، وفحص احتمال الفقدان
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تطبيق القاعدة المركزية: عدم الخلط بين الغيبة وانقطاع الأخبار وجهالة المكان والفقدان
              </p>
            </div>
          </div>

          {/* ⑦ هل تصل أخبار الغائب؟ */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ⑦ هل تصل أخبار الغائب إلى أسرته أو معارفه؟
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              {[
                { key: 'انقطعت_أخباره_تماما', label: 'انقطعت أخباره تماماً', desc: 'لا خبر عنه إطلاقاً' },
                { key: 'تصل_أخبار_غير_مؤكدة', label: 'تصل أخبار غير مؤكدة', desc: 'شائعات أو أقاويل' },
                { key: 'تصل_أحيانا', label: 'تصل أحياناً', desc: 'تواصل متقطع' },
                { key: 'تصل_أخباره_بانتظام', label: 'تصل أخباره بانتظام', desc: 'معلوم الأخبار دون عودة' },
                { key: 'لا_يعلم_الطالب_شيئا_عن_حاله', label: 'لا يعلم الطالب شيئاً عن حاله', desc: 'جهالة تامة' },
              ].map(st => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setNewsStatus(st.key as any)}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer space-y-1 ${
                    newsStatus === st.key
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-black ring-1 ring-purple-500'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{st.label}</div>
                  <div className="text-[10px] text-slate-500">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ⑧ هل يعلم اللفيف بحياة الغائب؟ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-black text-slate-900">
              ⑧ حسب علم أفراد اللفيف: هل يعلمون بحياة الغائب؟
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'يعلمون_أنه_حي', label: 'يعلمون أنه حي', tip: 'استصحاب الحياة مع الغيبة' },
                { key: 'لا_يعلمون_هل_هو_حي_أم_ميت', label: 'لا يعلمون هل هو حي أم ميت', tip: 'احتمال وصف الفقدان' },
                { key: 'بلغتهم_أخبار_عن_حياته', label: 'بلغتهم أخبار عن حياته', tip: 'سماع متواتر بالحياة' },
                { key: 'لا_توجد_لديهم_أخبار_عنه', label: 'لا توجد لديهم أخبار عنه', tip: 'انقطاع تام' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLifeKnowledge(item.key as any)}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer space-y-1 ${
                    lifeKnowledge === item.key
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-black ring-1 ring-amber-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.tip}</div>
                </button>
              ))}
            </div>

            {/* تنبيه حالة الجهل بالحياة والموت */}
            {lifeKnowledge === 'لا_يعلمون_هل_هو_حي_أم_ميت' && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>تنبيه احترازي بشأن الفقدان والوفاة الحكمية:</span>
                </div>
                <p className="text-amber-900 leading-relaxed font-bold">
                  هذه المعطيات تقترب من حالة «المفقود». ولا ينبغي أن يتضمن موجب الغيبة تصريحاً بوفاة الشخص أو باعتباره ميتاً ما لم يوجد حكم قضائي بموته طبقاً للمادتين 325 و327 من مدونة الأسرة.
                </p>
                <label className="flex items-center gap-2 cursor-pointer pt-1 font-black text-amber-950">
                  <input
                    type="checkbox"
                    checked={potentialMissingPersonAlertAcknowledged}
                    onChange={(e) => setPotentialMissingPersonAlertAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>أقر بهذا التنبيه وأؤكد أن الرسم محصور في إثبات واقعة الغيبة دون تصريح بالوفاة</span>
                </label>
              </div>
            )}
          </div>

          {/* ⑯ هل توجد قضية قضائية سابقة؟ */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs">
            <span className="font-black text-slate-900 block">
              ⑯ هل سبق أن صدر حكم أو يوجد ملف قضائي متعلق بالغائب؟
            </span>
            <div className="flex items-center gap-4 font-bold">
              {[
                { key: 'لا', label: 'لا' },
                { key: 'نعم_حكم', label: 'نعم، صدر حكم' },
                { key: 'نعم_ملف_جار', label: 'نعم، ملف جارٍ' },
                { key: 'لا_أعلم', label: 'لا يعلم' },
              ].map(c => (
                <label key={c.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priorCaseRadio"
                    checked={priorCases.hasPriorCase === c.key}
                    onChange={() => setPriorCases(prev => ({ ...prev, hasPriorCase: c.key as any }))}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            {(priorCases.hasPriorCase === 'نعم_حكم' || priorCases.hasPriorCase === 'نعم_ملف_جار') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المحكمة</label>
                  <input
                    type="text"
                    value={priorCases.courtName}
                    onChange={(e) => setPriorCases(prev => ({ ...prev, courtName: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الملف / السنة</label>
                  <input
                    type="text"
                    value={priorCases.fileNumber}
                    onChange={(e) => setPriorCases(prev => ({ ...prev, fileNumber: e.target.value }))}
                    placeholder="2026/..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">منطوق أو موضوع القضية</label>
                  <input
                    type="text"
                    value={priorCases.rulingVerdict}
                    onChange={(e) => setPriorCases(prev => ({ ...prev, rulingVerdict: e.target.value }))}
                    placeholder="نفقة، طلاق، حجر..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: المغادرة والمكان
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى خصوصيات الزوجية أو الشهود</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑨ و ⑩ المرحلة 4: خصوصيات الزوجية (إذا كان الغائب زوجاً أو زوجة) */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑨ و ⑩ مقتضيات العلاقة الزوجية وأثر الغيبة (المواد 99-105 من مدونة الأسرة)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                ضبط بيانات عقد الزواج والأبناء والإنفاق ومسكن الزوجية لتعزيز الملف القضائي
              </p>
            </div>
          </div>

          {absenceType === 'غيبة_الزوج' ? (
            <div className="space-y-4">
              {/* تنبيه خاص بالمادة 104 و105 */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-950 font-black">
                  <ShieldCheck className="w-4 h-4 text-rose-700" />
                  <span>⑨ التطليق للغيبة (المواد 99 و100 و104 و105 من مدونة الأسرة):</span>
                </div>
                <p className="text-rose-900 leading-relaxed font-bold">
                  إذا غاب الزوج عن زوجته مدة تزيد عن سنة، أمكن للزوجة طلب التطليق. وتتأكد المحكمة من الغيبة ومدتها ومكانها بكل الوسائل؛ وإذا كان مجهول العنوان تتخذ المحكمة بمساعدة النيابة العامة إجراءات التبليغ بما في ذلك تعيين قيم عنه. وموجب الغيبة هذا وثيقة لإثبات الوقائع المشهودة للمحكمة دون أن يحل العدل محل القاضي في الحكم بالتطليق.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الزوجة الحاضرة</label>
                  <input
                    type="text"
                    value={maritalSpecifics.spouseName}
                    onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, spouseName: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">مرجع عقد الزواج (الرسم/العقد)</label>
                  <input
                    type="text"
                    value={maritalSpecifics.marriageContractRef}
                    onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, marriageContractRef: e.target.value }))}
                    placeholder="عدد... صحيفة... كناش..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ إبرام عقد الزواج</label>
                  <input
                    type="date"
                    value={maritalSpecifics.marriageContractDate}
                    onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, marriageContractDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">آخر مسكن للزوجية</label>
                  <input
                    type="text"
                    value={maritalSpecifics.lastMaritalHome}
                    onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, lastMaritalHome: e.target.value }))}
                    placeholder="العنوان الذي كان يجمعهما قبل الغيبة"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={maritalSpecifics.hasChildren}
                      onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, hasChildren: e.target.checked }))}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span>يوجد أبناء من الزواج</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={maritalSpecifics.hasMaintenanceSupport}
                      onChange={(e) => setMaritalSpecifics(prev => ({ ...prev, hasMaintenanceSupport: e.target.checked }))}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span>ترك نفقة للزوجة أو الأبناء</span>
                  </label>
                </div>
              </div>
            </div>
          ) : absenceType === 'غيبة_الزوجة' ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-900 block">
                ⑩ خصوصيات غيبة الزوجة عن بيت الزوجية:
              </span>
              <p className="text-slate-600 leading-relaxed">
                يقتصر الموجب على إثبات مغادرة الزوجة لمسكن الزوجية وتاريخ ذلك وانقطاع أخبارها كما عاينه اللفيف، دون إبداء رأي قضائي في مسألة النشوز أو حقوق الطلاق، تاركاً الأثر للقاضي المختص.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الزوج الحاضر</label>
                  <input
                    type="text"
                    value={applicant.fullName}
                    readOnly
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">هل تركت الزوج والأبناء؟</label>
                  <input
                    type="text"
                    defaultValue="غادرت مسكن الزوجية وتركت الزوج والأبناء"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-900 block">
                ⑪ غيبة شخص غير الزوجين:
              </span>
              <p className="text-slate-600 leading-relaxed">
                بما أن الغائب ليس زوجاً، فإن مسطرة المادتين 104 و105 لا تنطبق، ويسجل النظام الصفة والغرض المصرح به من قِبل الطالب (كإثبات غيبة وارث، أو غيبة أب/أم، أو صاحب حق مالي) مع ربط الرسم بالجهة المعنية.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الأخبار والفقدان
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى شهود اللفيف (12 شاهداً)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑫ و ⑬ و ⑭ المرحلة 5: شهود اللفيف (12 شاهداً) ومحرك فحص التناقض */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑫ و ⑬ و ⑭ بيت اللفيف الشرعي (12 شاهداً) ومحرك مقارنة الأقوال وفحص التناقض
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                استدعاء محرك الشهود الموحد، وتحديد ما عاينه كل شاهد عن غيبة المعني بالأمر ومحل إقامته
              </p>
            </div>
          </div>

          {/* محرك فحص التناقض ⑭ */}
          {crossWitnessIssues.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>⑭ كاشف التناقض وفحص التناسق بين شهود اللفيف:</span>
              </span>
              <div className="space-y-2">
                {crossWitnessIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                      issue.level === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                        : issue.level === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                        : 'bg-cyan-50 border-cyan-300 text-cyan-950 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {issue.level === 'error' ? (
                        <Ban className="w-4 h-4 text-rose-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>{issue.message}</span>
                    </div>
                    <div className="text-[11px] opacity-80 pr-5">{issue.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* تضمين محرك الشهود الموحد Step5_Witnesses */}
          <div className="p-4 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>محرك الشهود اللفيفي (نصاب الـ 12 شاهداً والتحري في الأهلية والمخالطة)</span>
              </span>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-emerald-800">
                الشهود المسجلون: {(state.witnesses || []).length} / 12
              </span>
            </div>

            <Step5_Witnesses
              state={{
                ...state,
                documentType: 'موجب_اثبات_غيبة',
              }}
              setState={setState}
              onNext={() => setActiveStage(6)}
              onBack={() => setActiveStage(4)}
            />
          </div>

          {/* ⑬ أسئلة الوقائع العينية لكل شاهد */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>⑬ السؤال الذكي للشهود: «ما الوقائع التي عاينتها بنفسك وتفيد في إثبات الغيبة؟»</span>
              </label>
              <span className="text-[10px] text-slate-500 font-bold">
                (تأسيس الشهادة على الوقائع المشهودة لا تلقين النتيجة)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {((state.witnesses || []).length > 0 ? state.witnesses : Array.from({ length: 12 }, (_, i) => ({ id: `${i+1}`, name: `الشاهد ${i+1}` }))).map((w, idx) => {
                const det = witnessDetails[idx] || {
                  witnessIndex: idx + 1,
                  durationOfKnowledgeYears: 10,
                  cohabitationMethod: 'جيرة ومخالطة',
                  lastLocationKnown: 'مجهول',
                  specificObservationText: '',
                };

                return (
                  <div
                    key={w.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{w.name || `الشاهد ${idx + 1}`}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        مصدر العلم: مخالطة ومعاينة
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-bold">آخر مكان يعلمه:</span>
                        <input
                          type="text"
                          value={det.lastLocationKnown || 'مجهول'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWitnessDetails(prev => {
                              const updated = [...prev];
                              if (!updated[idx]) {
                                updated[idx] = { witnessIndex: idx + 1 };
                              }
                              updated[idx] = { ...updated[idx], lastLocationKnown: val, knowsLastLocation: val !== 'مجهول' };
                              return updated;
                            });
                          }}
                          className="w-32 p-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>

                      <textarea
                        rows={2}
                        value={det.specificObservationText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWitnessDetails(prev => {
                            const updated = [...prev];
                            if (!updated[idx]) {
                              updated[idx] = { witnessIndex: idx + 1 };
                            }
                            updated[idx] = { ...updated[idx], specificObservationText: val };
                            return updated;
                          });
                        }}
                        placeholder="ما عاينه الشاهد بنفسه عن مغادرة الغائب ومحل سكناه وانقطاع خبره..."
                        className="w-full p-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: خصوصيات الزوجية
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الوثائق وقضاء الأسرة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑰ و ㉑ المرحلة 6: الوثائق والربط مع القضاء (قضاء الأسرة وقانون 58.25) */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑰ و ㉑ الوثائق المعززة والربط بقسم قضاء الأسرة
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تأكيد أن الوثائق ليست شرطاً مطلقاً لتحرير شهادة اللفيف، وتحديد الغرض القضائي
              </p>
            </div>
          </div>

          {/* ⑰ الوثائق */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">
                ⑰ الوثائق والمستندات الداعمة لموجب الغيبة:
              </span>
              <span className="text-[10px] text-cyan-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-cyan-200">
                قاعدة: الوثائق ليست شرطاً مطلقاً لأن الغاية تحرير شهادة بناءً على علم اللفيف
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'بطاقة هوية طالب الإشهاد',
                'بطاقة هوية الشخص الغائب (إن توفرت)',
                'رسم الزواج إذا كان الغائب زوجاً أو زوجة',
                'ما يثبت القرابة أو الإرث عند الاقتضاء',
                'شهادة إدارية أو وثيقة تتعلق بآخر محل إقامة',
                'مراسلات أو كشوفات تثبت انقطاع التواصل',
                'نسخة من المقررات أو الأحكام القضائية السابقة',
              ].map((doc) => (
                <div key={doc} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">☑️ {doc}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    مستند إرشادي
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ㉑ الربط مع القضاء */}
          <div className="p-5 rounded-2xl bg-cyan-50/50 border border-cyan-200 space-y-3">
            <div className="flex items-center gap-2 text-cyan-950 font-black text-xs">
              <Link2 className="w-4 h-4 text-cyan-700" />
              <span>㉑ الغرض القضائي المعتمد والمحكمة المختصة (قانون المسطرة المدنية 58.25):</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-cyan-100 text-xs text-cyan-900 space-y-1 font-bold">
              <div>المحكمة المختصة: المحكمة الابتدائية (قسم قضاء الأسرة) بمقر الاختصاص التوثيقي.</div>
              <div>الغرض القضائي المقيد: {applicant.customPurposeText || applicant.declaredPurpose.replace(/_/g, ' ')}.</div>
              <div className="text-[11px] text-slate-600 font-normal pt-1">
                ⚖️ يحرر الرسم كشهادة وقائع وتُترك سلطة تقدير الآثار القانونية والبت في الدعاوى (كالتطليق أو النفقة) للمحكمة المختصة.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: شهود اللفيف
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>المتابعة إلى الصياغة العدلية والاعتماد النهائي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⑱ و ⑲ و ㉒ المرحلة 7: الصياغة العدلية رباعية الطبقات والمراجعة النهائية */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ⑱ و ⑲ و ㉒ الصياغة العدلية الذكية رباعية الطبقات والمراجعة النهائية
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                بناء محرر شرعي وقانوني متناسق مع التقيد الصارم بممنوعات الصياغة الآلية
              </p>
            </div>
          </div>

          {/* ㉒ لوحة المراجعة قبل التوثيق (Smart Checklist) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>㉒ فحص موجب الغيبة قبل الاعتماد:</span>
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                checklist.allPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {checklist.allPassed ? '🟢 مستوفٍ لكافة الشروط' : '🟠 تنقص بعض المتطلبات'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasAbsenteeName && checklist.hasAbsenteeCin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية الشخص الغائب</span>
                {checklist.hasAbsenteeName && checklist.hasAbsenteeCin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasApplicantName && checklist.hasApplicantCin ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>هوية وصلة الطالب</span>
                {checklist.hasApplicantName && checklist.hasApplicantCin ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasDepartureDate ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>تاريخ بداية الغيبة والمدة</span>
                {checklist.hasDepartureDate ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                checklist.hasPurpose ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                <span>الغرض المصرح به</span>
                {checklist.hasPurpose ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-rose-600" />}
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between sm:col-span-2 lg:col-span-4 ${
                checklist.hasTwelveWitnesses ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}>
                <span>نصاب شهادة اللفيف الشرعية: {(state.witnesses || []).length} من 12 شاهداً</span>
                {checklist.hasTwelveWitnesses ? (
                  <span className="text-[11px] font-black text-emerald-700">🟢 نصاب الـ 12 شاهداً مكتمل</span>
                ) : (
                  <span className="text-[11px] font-black text-amber-700">🟠 يتطلب استكمال 12 شاهداً في المرحلة 5</span>
                )}
              </div>
            </div>
          </div>

          {/* نص الرسم المولد آلياً ⑱ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>نص الرسم المولد آلياً (الصياغة العدلية رباعية الطبقات):</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDeed}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedSuccess ? 'تم النسخ بنجاح!' : 'نسخ نص الرسم'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>طباعة الرسم</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={18}
                value={generatedRasmText}
                className="w-full p-4 rounded-2xl bg-cyan-50/20 border border-cyan-200 text-slate-800 font-amiri text-base leading-relaxed resize-y focus:outline-hidden"
              />
            </div>

            {/* ⑲ ممنوعات الصياغة الآلية */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <span className="font-black text-slate-900 block">
                🛡️ ⑲ ممنوعات الصياغة الآلية الصارمة المطبقة في هذا المحرر:
              </span>
              <ul className="list-disc pr-5 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>لا يستعمل النظام عبارة «فلان ميت» لعدم وجود سند وفاة أو حكم بتمويته.</li>
                <li>لا يستعمل النظام عبارة «فلان مفقود قانوناً» لأن الفقدان وضع قضائي مستقل (المواد 325-327).</li>
                <li>لا يستعمل النظام عبارة «ثبت للمحكمة...» لأن العدل ليس قاضياً بل يتلقى الشهادة.</li>
                <li>لا يستعمل النظام عبارة «تستحق التطليق» بل يشهد بوقائع الغيبة ويترك الأثر لقسم قضاء الأسرة.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              السابق: الوثائق والقضاء
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDeed}
                className="px-5 py-2.5 rounded-xl border border-cyan-200 text-cyan-700 bg-cyan-50/50 hover:bg-cyan-50 text-xs font-bold transition cursor-pointer"
              >
                {copiedSuccess ? 'تم النسخ بنجاح' : 'نسخ نص المحرر'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>طباعة المعاينة</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToStep7}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-lg shadow-red-900/40 border border-red-400/40 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <Send className="w-4 h-4 text-white" />
                <span>المتابعة إلى مرحلة المراجعة والإرسال للقاضي (المرحلة 7)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
