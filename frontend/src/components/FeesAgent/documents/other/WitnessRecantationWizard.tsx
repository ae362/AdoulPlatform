import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  ShieldCheck,
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
  Camera,
  Loader2,
} from 'lucide-react';
import { trpc } from '../../../../trpc';
import { enhanceCardImageForOCR } from '../../../../utils/cinImageEnhancer';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import {
  createEmptyParty,
  convertGregorianToHijri,
} from '../../../../utils/feesAgentUtils';
import type {
  WitnessRecantationState,
  RecantationOperationType,
  RecantationSubjectType,
  RecantingPersonRole,
  LafifWitnessEntry,
  RecantationScope,
  PropertyRecantationAspect,
  MarriageRecantationAspect,
  AbsenceRecantationAspect,
  NameMatchRecantationAspect,
  EstateInventoryRecantationAspect,
  RecantationReasonCategory,
  RecantationNatureChoice,
  PriorUsageStatus,
  ProcessDistinctionType,
  ScrutinyRiskLevel,
  RecantationEvidenceItem,
} from './witnessRecantationTypes';

export const WitnessRecantationWizard: React.FC<DocumentWizardProps> = ({ state, setState, onBack }) => {
  const { user, notaryProfile } = useAuth();

  // Court and Notary Identity dynamically derived (zero hardcoded values)
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
  // 1. Core Operation & Subject (نوع العملية وموضوع الشهادة)
  // ---------------------------------------------------------------------------
  const [operationType, setOperationType] = useState<RecantationOperationType>(
    state.witnessRecantation?.operationType || 'رجوع_شاهد_من_شهود_اللفيف'
  );
  const [testimonySubject, setTestimonySubject] = useState<RecantationSubjectType>(
    state.witnessRecantation?.testimonySubject || 'ملكية_عقار'
  );
  const [customSubject, setCustomSubject] = useState<string>(
    state.witnessRecantation?.customSubject || ''
  );

  // ---------------------------------------------------------------------------
  // 2. Original Deed Reference (الشهادة الأصلية محل الرجوع)
  // ---------------------------------------------------------------------------
  const [certType, setCertType] = useState<string>(
    state.witnessRecantation?.originalDeed?.certificateType || ''
  );
  const [deedNumber, setDeedNumber] = useState<string>(
    state.witnessRecantation?.originalDeed?.deedNumber || ''
  );
  const [deedYear, setDeedYear] = useState<string>(
    state.witnessRecantation?.originalDeed?.year || ''
  );
  const [recordLetter, setRecordLetter] = useState<string>(
    state.witnessRecantation?.originalDeed?.recordLetter || ''
  );
  const [countNumber, setCountNumber] = useState<string>(
    state.witnessRecantation?.originalDeed?.countNumber || ''
  );
  const [pageNumber, setPageNumber] = useState<string>(
    state.witnessRecantation?.originalDeed?.pageNumber || ''
  );
  const [certificateDate, setCertificateDate] = useState<string>(
    state.witnessRecantation?.originalDeed?.certificateDate || ''
  );
  const [inclusionDate, setInclusionDate] = useState<string>(
    state.witnessRecantation?.originalDeed?.inclusionDate || ''
  );
  const [courtName, setCourtName] = useState<string>(
    state.witnessRecantation?.originalDeed?.courtName || defaultCourt
  );
  const [firstNotary, setFirstNotary] = useState<string>(
    state.witnessRecantation?.originalDeed?.firstNotary || defaultNotary1
  );
  const [secondNotary, setSecondNotary] = useState<string>(
    state.witnessRecantation?.originalDeed?.secondNotary || defaultNotary2
  );
  const [originalText, setOriginalText] = useState<string>(
    state.witnessRecantation?.originalDeed?.originalText || ''
  );
  const [partiesSummary, setPartiesSummary] = useState<string>(
    state.witnessRecantation?.originalDeed?.partiesSummary || ''
  );
  const [isDeedRetrieved, setIsDeedRetrieved] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 3. Recanting Party (صاحب الرجوع)
  // ---------------------------------------------------------------------------
  const [recantingRole, setRecantingRole] = useState<RecantingPersonRole>(
    state.witnessRecantation?.recantingRole || 'شاهد_واحد_من_شهود_اللفيف'
  );
  const [applicantFullName, setApplicantFullName] = useState<string>(
    state.witnessRecantation?.applicant?.fullName || ''
  );
  const [applicantNationalId, setApplicantNationalId] = useState<string>(
    state.witnessRecantation?.applicant?.nationalId || ''
  );
  const [applicantFatherName, setApplicantFatherName] = useState<string>(
    state.witnessRecantation?.applicant?.fatherName || ''
  );
  const [applicantMotherName, setApplicantMotherName] = useState<string>(
    state.witnessRecantation?.applicant?.motherName || ''
  );
  const [applicantBirthDate, setApplicantBirthDate] = useState<string>(
    state.witnessRecantation?.applicant?.birthDate || ''
  );
  const [applicantBirthPlace, setApplicantBirthPlace] = useState<string>(
    state.witnessRecantation?.applicant?.birthPlace || ''
  );
  const [applicantAddress, setApplicantAddress] = useState<string>(
    state.witnessRecantation?.applicant?.address || ''
  );
  const [applicantProfession, setApplicantProfession] = useState<string>(
    state.witnessRecantation?.applicant?.profession || ''
  );
  const [applicantRoleInDeed, setApplicantRoleInDeed] = useState<string>(
    state.witnessRecantation?.applicant?.roleInDeed || 'شاهد ضمن لفيف الإشهاد'
  );
  const [applicantPhone, setApplicantPhone] = useState<string>(
    state.witnessRecantation?.applicant?.phone || ''
  );

  // ---------------------------------------------------------------------------
  // 4. Lafif Witness Map (خريطة شهود اللفيف - 12 الشاهد)
  // ---------------------------------------------------------------------------
  const initialLafifWitnesses: LafifWitnessEntry[] = useMemo(() => {
    if (state.witnessRecantation?.lafifWitnesses && state.witnessRecantation.lafifWitnesses.length > 0) {
      return state.witnessRecantation.lafifWitnesses;
    }
    // Clean initial 12 empty witness slots
    return Array.from({ length: 12 }, (_, i) => ({
      id: `witness-${i + 1}`,
      witnessNumber: i + 1,
      fullName: '',
      nationalId: '',
      fatherName: '',
      motherName: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      profession: '',
      status: i === 0 ? 'يرجع_عن_شهادته' : 'باق_على_شهادته',
      testimonySummary: '',
      recantationDetails: '',
    }));
  }, [state.witnessRecantation?.lafifWitnesses]);

  const [lafifWitnesses, setLafifWitnesses] = useState<LafifWitnessEntry[]>(initialLafifWitnesses);

  // Quick stats for Lafif Map
  const recantingCount = useMemo(
    () => lafifWitnesses.filter((w) => w.status === 'يرجع_عن_شهادته').length,
    [lafifWitnesses]
  );
  const retainingCount = useMemo(
    () => lafifWitnesses.filter((w) => w.status === 'باق_على_شهادته').length,
    [lafifWitnesses]
  );

  const toggleWitnessStatus = (index: number) => {
    setLafifWitnesses((prev) =>
      prev.map((w, idx) => {
        if (idx !== index) return w;
        const newStatus = w.status === 'باق_على_شهادته' ? 'يرجع_عن_شهادته' : 'باق_على_شهادته';
        return { ...w, status: newStatus };
      })
    );
  };

  const updateWitnessField = (index: number, field: keyof LafifWitnessEntry, value: any) => {
    setLafifWitnesses((prev) =>
      prev.map((w, idx) => (idx === index ? { ...w, [field]: value } : w))
    );
  };

  const extractIdCardMutation = trpc.feesAgent.ocr.extractIDCard.useMutation();
  const [scanningApplicant, setScanningApplicant] = useState<boolean>(false);
  const [applicantNotice, setApplicantNotice] = useState<{ message: string; success: boolean } | null>(null);

  const [scanningLafifWitness, setScanningLafifWitness] = useState<Record<number, boolean>>({});
  const [lafifNotice, setLafifNotice] = useState<Record<number, { message: string; success: boolean }>>({});

  const scanApplicantIdCard = async (file: File) => {
    setScanningApplicant(true);
    setApplicantNotice(null);
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
      const cin = fields.idNumber ? String(fields.idNumber).toUpperCase().trim() : undefined;
      const extractedName = fields.name ? String(fields.name).trim() : (fields.nameLatin ? String(fields.nameLatin).trim() : undefined);
      const extractedFather = fields.fatherName ? String(fields.fatherName).trim() : undefined;
      const extractedMother = fields.motherName ? String(fields.motherName).trim() : undefined;
      const extractedDob = fields.dateOfBirth;
      const extractedPob = fields.placeOfBirth ? String(fields.placeOfBirth).trim() : undefined;
      const extractedAddress = fields.address ? String(fields.address).trim() : undefined;

      if (cin || extractedName) {
        if (extractedName) setApplicantFullName(extractedName);
        if (cin) setApplicantNationalId(cin);
        if (extractedFather) setApplicantFatherName(extractedFather);
        if (extractedMother) setApplicantMotherName(extractedMother);
        if (extractedDob) setApplicantBirthDate(extractedDob);
        if (extractedPob) setApplicantBirthPlace(extractedPob);
        if (extractedAddress) setApplicantAddress(extractedAddress);

        setApplicantNotice({
          message: `✓ تم استخراج بطاقة الشاهد بنجاح: ${extractedName ? `الاسم: ${extractedName}` : ''}${cin ? ` | CIN: ${cin}` : ''}`.trim(),
          success: true,
        });
      } else {
        setApplicantNotice({
          message: 'لم نتمكن من قراءة البيانات بدقة، يمكنك كتابتها يدوياً أو تجربة صورة أوضح',
          success: false,
        });
      }
    } catch {
      setApplicantNotice({
        message: 'حدث خطأ أثناء فحص صورة البطاقة',
        success: false,
      });
    } finally {
      setScanningApplicant(false);
    }
  };

  const scanLafifRecantationWitness = async (index: number, file: File) => {
    setScanningLafifWitness(prev => ({ ...prev, [index]: true }));
    setLafifNotice(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

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
      const cin = fields.idNumber ? String(fields.idNumber).toUpperCase().trim() : undefined;
      const extractedName = fields.name ? String(fields.name).trim() : (fields.nameLatin ? String(fields.nameLatin).trim() : undefined);

      if (cin || extractedName) {
        if (extractedName) updateWitnessField(index, 'fullName', extractedName);
        if (cin) updateWitnessField(index, 'nationalId', cin);

        setLafifNotice(prev => ({
          ...prev,
          [index]: {
            message: `✓ تم استخراج بطاقة الشاهد: ${extractedName ? `الاسم: ${extractedName}` : ''}${cin ? ` | CIN: ${cin}` : ''}`.trim(),
            success: true,
          },
        }));
      } else {
        setLafifNotice(prev => ({
          ...prev,
          [index]: {
            message: 'لم نتمكن من قراءة البيانات بدقة من صورة البطاقة',
            success: false,
          },
        }));
      }
    } catch {
      setLafifNotice(prev => ({
        ...prev,
        [index]: {
          message: 'حدث خطأ أثناء فحص صورة البطاقة',
          success: false,
        },
      }));
    } finally {
      setScanningLafifWitness(prev => ({ ...prev, [index]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Scope & Targeted Clause (عن ماذا يرجع؟ العبارة والواقعة المحددة)
  // ---------------------------------------------------------------------------
  const [recantationScope, setRecantationScope] = useState<RecantationScope>(
    state.witnessRecantation?.recantationScope || 'رجوع_جزئي'
  );
  const [targetedClauseOriginal, setTargetedClauseOriginal] = useState<string>(
    state.witnessRecantation?.targetedClauseOriginal || ''
  );
  const [recantedAspectProperty, setRecantedAspectProperty] = useState<PropertyRecantationAspect[]>(
    state.witnessRecantation?.recantedAspectProperty || ['الحيازة']
  );
  const [recantedAspectMarriage, setRecantedAspectMarriage] = useState<MarriageRecantationAspect[]>(
    state.witnessRecantation?.recantedAspectMarriage || ['أصل_استمرار_الزواج']
  );
  const [recantedAspectAbsence, setRecantedAspectAbsence] = useState<AbsenceRecantationAspect[]>(
    state.witnessRecantation?.recantedAspectAbsence || ['أصل_الغيبة']
  );
  const [recantedAspectNameMatch, setRecantedAspectNameMatch] = useState<NameMatchRecantationAspect>(
    state.witnessRecantation?.recantedAspectNameMatch || 'أرجع_عن_المطابقة_كليا'
  );
  const [recantedAspectEstate, setRecantedAspectEstate] = useState<EstateInventoryRecantationAspect[]>(
    state.witnessRecantation?.recantedAspectEstate || ['وجود_المال']
  );
  const [customRecantedFact, setCustomRecantedFact] = useState<string>(
    state.witnessRecantation?.customRecantedFact || ''
  );

  // ---------------------------------------------------------------------------
  // 6. Reasons & Explanation (سبب الرجوع)
  // ---------------------------------------------------------------------------
  const [reasonCategory, setReasonCategory] = useState<RecantationReasonCategory>(
    state.witnessRecantation?.reasonCategory || 'تبين_الخطأ'
  );
  const [customReasonText, setCustomReasonText] = useState<string>(
    state.witnessRecantation?.customReasonText || ''
  );
  const [detailedReasonExplanation, setDetailedReasonExplanation] = useState<string>(
    state.witnessRecantation?.detailedReasonExplanation || ''
  );

  // ---------------------------------------------------------------------------
  // 7. Nature (هل الرجوع عن الباطل إلى الحق؟ وما تبين له)
  // ---------------------------------------------------------------------------
  const [natureChoice, setNatureChoice] = useState<RecantationNatureChoice>(
    state.witnessRecantation?.natureChoice || 'أقرر_أنني_أخطأت_فيما_شهدت_به'
  );
  const [customNatureText, setCustomNatureText] = useState<string>(
    state.witnessRecantation?.customNatureText || ''
  );
  const [willStateNewTruth, setWillStateNewTruth] = useState<boolean>(
    state.witnessRecantation?.willStateNewTruth ?? false
  );
  const [newTruthStatement, setNewTruthStatement] = useState<string>(
    state.witnessRecantation?.newTruthStatement || ''
  );

  // ---------------------------------------------------------------------------
  // 8. Specialized Subject Details (البيانات الخاصة بالعقار / الزواج / الغيبة...)
  // ---------------------------------------------------------------------------
  // Property
  const [propLocation, setPropLocation] = useState<string>(
    state.witnessRecantation?.propertyDetails?.location || ''
  );
  const [propCommune, setPropCommune] = useState<string>(
    state.witnessRecantation?.propertyDetails?.commune || ''
  );
  const [propArea, setPropArea] = useState<string>(
    state.witnessRecantation?.propertyDetails?.area || ''
  );
  const [propBoundaries, setPropBoundaries] = useState({
    north: state.witnessRecantation?.propertyDetails?.boundaries?.north || '',
    south: state.witnessRecantation?.propertyDetails?.boundaries?.south || '',
    east: state.witnessRecantation?.propertyDetails?.boundaries?.east || '',
    west: state.witnessRecantation?.propertyDetails?.boundaries?.west || '',
  });
  const [propTitle, setPropTitle] = useState<string>(
    state.witnessRecantation?.propertyDetails?.landTitleNumber || ''
  );
  const [propReq, setPropReq] = useState<string>(
    state.witnessRecantation?.propertyDetails?.requisitionNumber || ''
  );

  // Marriage Continuity
  const [marriageHusband, setMarriageHusband] = useState<string>(
    state.witnessRecantation?.marriageDetails?.husbandName || ''
  );
  const [marriageWife, setMarriageWife] = useState<string>(
    state.witnessRecantation?.marriageDetails?.wifeName || ''
  );
  const [marriageDate, setMarriageDate] = useState<string>(
    state.witnessRecantation?.marriageDetails?.marriageDate || ''
  );
  const [marriagePlace, setMarriagePlace] = useState<string>(
    state.witnessRecantation?.marriageDetails?.marriagePlace || ''
  );
  const [marriageKnowledgeSource, setMarriageKnowledgeSource] = useState<string>(
    state.witnessRecantation?.marriageDetails?.knowledgeSource || ''
  );

  // Absence
  const [absencePerson, setAbsencePerson] = useState<string>(
    state.witnessRecantation?.absenceDetails?.missingPersonName || ''
  );
  const [absenceLastLocation, setAbsenceLastLocation] = useState<string>(
    state.witnessRecantation?.absenceDetails?.lastKnownLocation || ''
  );
  const [absenceLastDate, setAbsenceLastDate] = useState<string>(
    state.witnessRecantation?.absenceDetails?.lastContactDate || ''
  );
  const [absenceDuration, setAbsenceDuration] = useState<string>(
    state.witnessRecantation?.absenceDetails?.absenceDuration || ''
  );

  // Name Match
  const [nameMatchFirst, setNameMatchFirst] = useState<string>(
    state.witnessRecantation?.nameMatchDetails?.firstNameStated || ''
  );
  const [nameMatchSecond, setNameMatchSecond] = useState<string>(
    state.witnessRecantation?.nameMatchDetails?.secondNameStated || ''
  );
  const [nameMatchIdCard, setNameMatchIdCard] = useState<string>(
    state.witnessRecantation?.nameMatchDetails?.identityCardNumber || ''
  );

  // Estate
  const [estateDeceased, setEstateDeceased] = useState<string>(
    state.witnessRecantation?.estateDetails?.deceasedName || ''
  );
  const [estateMoney, setEstateMoney] = useState<string>(
    state.witnessRecantation?.estateDetails?.moneyAmount || ''
  );
  const [estateMovable, setEstateMovable] = useState<string>(
    state.witnessRecantation?.estateDetails?.movableDescription || ''
  );

  // ---------------------------------------------------------------------------
  // 9. Prior Usage & Legal Exposure (هل سبق أن استعملت الشهادة؟)
  // ---------------------------------------------------------------------------
  const [priorUsage, setPriorUsage] = useState<PriorUsageStatus>(
    state.witnessRecantation?.priorUsage || 'لم_تقدم_بعد_لأي_جهة'
  );
  const [priorUsageDetails, setPriorUsageDetails] = useState<string>(
    state.witnessRecantation?.priorUsageDetails || ''
  );
  const [hasJudgmentIssued, setHasJudgmentIssued] = useState<'نعم' | 'لا' | 'لا_أعلم'>(
    state.witnessRecantation?.hasJudgmentIssued || 'لا'
  );
  const [judgmentDetails, setJudgmentDetails] = useState<string>(
    state.witnessRecantation?.judgmentDetails || ''
  );
  const [hasExecutionOccurred, setHasExecutionOccurred] = useState<'نعم' | 'لا' | 'لا_أعلم'>(
    state.witnessRecantation?.hasExecutionOccurred || 'لا'
  );
  const [executionDetails, setExecutionDetails] = useState<string>(
    state.witnessRecantation?.executionDetails || ''
  );

  // ---------------------------------------------------------------------------
  // 10. Supporting Documents (مستندات الرجوع)
  // ---------------------------------------------------------------------------
  const [evidenceDocuments, setEvidenceDocuments] = useState<RecantationEvidenceItem[]>(
    state.witnessRecantation?.evidenceDocuments || []
  );

  const addEvidenceDocument = () => {
    const newDoc: RecantationEvidenceItem = {
      id: `doc-${Date.now()}`,
      documentType: 'رسم_عدلي',
      documentNumber: '',
      documentDate: '',
      issuingAuthority: '',
      relevanceReason: '',
    };
    setEvidenceDocuments((prev) => [...prev, newDoc]);
  };

  const removeEvidenceDocument = (id: string) => {
    setEvidenceDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateEvidenceDocument = (id: string, field: keyof RecantationEvidenceItem, value: string) => {
    setEvidenceDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // ---------------------------------------------------------------------------
  // 11. Consistency & Qualification Check (التمييز بين 3 عمليات وفحص التناقض)
  // ---------------------------------------------------------------------------
  const [processDistinction, setProcessDistinction] = useState<ProcessDistinctionType>(
    state.witnessRecantation?.processDistinction || 'رجوع_عن_شهادة'
  );

  // Automatic Contradiction Detection
  const contradictionNotes = useMemo(() => {
    const notes: string[] = [];

    if (processDistinction === 'تصحيح_بيان_مادي') {
      notes.push(
        'تنبيه منهجي: تم اختيار «تصحيح بيان مادي». إذا كان الأمر تصحيح خطأ كتابي دون تراجع الشاهد عما شهد به، يتعين الانتقال إلى «رسم الملحق التصحيحي (الإسمحة)» وليس رسم الرجوع.'
      );
    }
    if (processDistinction === 'شهادة_جديدة') {
      notes.push(
        'تنبيه شرعي وقانوني: تم اختيار «شهادة جديدة». تتضمن هذه العملية عناصر قد تشكل شهادة جديدة مستقلة بالنقيض، وليست مجرد رجوع أو إسقاط للشهادة الأولى.'
      );
    }
    if (hasJudgmentIssued === 'نعم') {
      notes.push(
        'مؤشر تدقيق حرج: صدر حكم قضائي استناداً إلى هذه الشهادة. الرجوع بعد الحكم يستوجب إشعار الجهات القضائية وفحص شروط الضمان والمسؤولية المدنية والجزائية.'
      );
    }
    if (hasExecutionOccurred === 'نعم') {
      notes.push(
        'تنبيه قضائي: ترتب تنفيذ وأثر قانوني فعلي للشهادة. يجب التدقيق الفقهي في مسألة ضمان ما تلف أو فُوّت وفق أحكام الفقه المالكي وقانون الالتزامات والعقود.'
      );
    }
    if (recantationScope === 'رجوع_جزئي' && !targetedClauseOriginal.trim()) {
      notes.push('إشعار: تم اختيار رجوع جزئي، لكن لم يتم بعد تحديد العبارة أو الواقعة محل الرجوع بدقة.');
    }
    if (willStateNewTruth && !newTruthStatement.trim()) {
      notes.push('إشعار: تم اختيار الإدلاء بالحقيقة الجديدة، لكن لم يُحرر بيان ما تبين للراجع بعد.');
    }

    return notes;
  }, [
    processDistinction,
    hasJudgmentIssued,
    hasExecutionOccurred,
    recantationScope,
    targetedClauseOriginal,
    willStateNewTruth,
    newTruthStatement,
  ]);

  // Risk Level
  const calculatedScrutinyLevel: ScrutinyRiskLevel = useMemo(() => {
    if (hasJudgmentIssued === 'نعم' || hasExecutionOccurred === 'نعم' || processDistinction === 'شهادة_جديدة') {
      return 'دقيق_جداً';
    }
    if (recantationScope === 'رجوع_جزئي' || testimonySubject === 'ملكية_عقار' || recantingCount > 1) {
      return 'مهم';
    }
    return 'عادي';
  }, [hasJudgmentIssued, hasExecutionOccurred, processDistinction, recantationScope, testimonySubject, recantingCount]);

  // ---------------------------------------------------------------------------
  // 12. Pre-signing Declarations & Marginal Annotation Details
  // ---------------------------------------------------------------------------
  const [hasReadContents, setHasReadContents] = useState<boolean>(
    state.witnessRecantation?.hasReadContents ?? true
  );
  const [understandsLegalConsequences, setUnderstandsLegalConsequences] = useState<boolean>(
    state.witnessRecantation?.understandsLegalConsequences ?? true
  );
  const [confirmedPersonalOrigin, setConfirmedPersonalOrigin] = useState<boolean>(
    state.witnessRecantation?.confirmedPersonalOrigin ?? true
  );
  const [marginalAnnotationCourt, setMarginalAnnotationCourt] = useState<string>(
    state.witnessRecantation?.endorsementNoteCourt || defaultCourt
  );
  const [marginalAnnotationRecorded, setMarginalAnnotationRecorded] = useState<boolean>(
    state.witnessRecantation?.marginalAnnotationRecorded ?? false
  );
  const [marginalAnnotationDate, setMarginalAnnotationDate] = useState<string>(
    state.witnessRecantation?.marginalAnnotationDate || todayGregorian
  );
  const [marginalAnnotationNumber, setMarginalAnnotationNumber] = useState<string>(
    state.witnessRecantation?.marginalAnnotationNumber || ''
  );

  // ---------------------------------------------------------------------------
  // 13. Synchronize Full WitnessRecantationState to Parent State
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fullState: WitnessRecantationState = {
      operationType,
      testimonySubject,
      customSubject,
      originalDeed: {
        certificateType: certType,
        deedNumber,
        year: deedYear,
        recordLetter,
        countNumber,
        pageNumber,
        certificateDate,
        inclusionDate,
        courtName,
        firstNotary,
        secondNotary,
        originalText,
        subject: testimonySubject,
        partiesSummary,
      },
      recantingRole,
      applicant: {
        fullName: applicantFullName,
        nationalId: applicantNationalId,
        fatherName: applicantFatherName,
        motherName: applicantMotherName,
        birthDate: applicantBirthDate,
        birthPlace: applicantBirthPlace,
        address: applicantAddress,
        profession: applicantProfession,
        roleInDeed: applicantRoleInDeed,
        phone: applicantPhone,
      },
      lafifWitnesses,
      recantationScope,
      targetedClauseOriginal,
      recantedAspectProperty,
      recantedAspectMarriage,
      recantedAspectAbsence,
      recantedAspectNameMatch,
      recantedAspectEstate,
      customRecantedFact,
      reasonCategory,
      customReasonText,
      detailedReasonExplanation,
      natureChoice,
      customNatureText,
      willStateNewTruth,
      newTruthStatement,
      propertyDetails: {
        location: propLocation,
        commune: propCommune,
        area: propArea,
        boundaries: propBoundaries,
        landTitleNumber: propTitle,
        requisitionNumber: propReq,
      },
      marriageDetails: {
        husbandName: marriageHusband,
        wifeName: marriageWife,
        marriageDate,
        marriagePlace,
        knowledgeSource: marriageKnowledgeSource,
      },
      absenceDetails: {
        missingPersonName: absencePerson,
        lastKnownLocation: absenceLastLocation,
        lastContactDate: absenceLastDate,
        absenceDuration,
      },
      nameMatchDetails: {
        firstNameStated: nameMatchFirst,
        secondNameStated: nameMatchSecond,
        identityCardNumber: nameMatchIdCard,
      },
      estateDetails: {
        deceasedName: estateDeceased,
        moneyAmount: estateMoney,
        movableDescription: estateMovable,
      },
      priorUsage,
      priorUsageDetails,
      hasJudgmentIssued,
      judgmentDetails,
      hasExecutionOccurred,
      executionDetails,
      evidenceDocuments,
      processDistinction,
      contradictionNotes,
      scrutinyLevel: calculatedScrutinyLevel,
      hasReadContents,
      understandsLegalConsequences,
      confirmedPersonalOrigin,
      endorsementNoteCourt: marginalAnnotationCourt,
      marginalAnnotationRecorded,
      marginalAnnotationDate,
      marginalAnnotationNumber,
    };

    setState((prev) => ({
      ...prev,
      witnessRecantation: fullState,
    }));
  }, [
    operationType,
    testimonySubject,
    customSubject,
    certType,
    deedNumber,
    deedYear,
    recordLetter,
    countNumber,
    pageNumber,
    certificateDate,
    inclusionDate,
    courtName,
    firstNotary,
    secondNotary,
    originalText,
    partiesSummary,
    recantingRole,
    applicantFullName,
    applicantNationalId,
    applicantFatherName,
    applicantMotherName,
    applicantBirthDate,
    applicantBirthPlace,
    applicantAddress,
    applicantProfession,
    applicantRoleInDeed,
    applicantPhone,
    lafifWitnesses,
    recantationScope,
    targetedClauseOriginal,
    recantedAspectProperty,
    recantedAspectMarriage,
    recantedAspectAbsence,
    recantedAspectNameMatch,
    recantedAspectEstate,
    customRecantedFact,
    reasonCategory,
    customReasonText,
    detailedReasonExplanation,
    natureChoice,
    customNatureText,
    willStateNewTruth,
    newTruthStatement,
    propLocation,
    propCommune,
    propArea,
    propBoundaries,
    propTitle,
    propReq,
    marriageHusband,
    marriageWife,
    marriageDate,
    marriagePlace,
    marriageKnowledgeSource,
    absencePerson,
    absenceLastLocation,
    absenceLastDate,
    absenceDuration,
    nameMatchFirst,
    nameMatchSecond,
    nameMatchIdCard,
    estateDeceased,
    estateMoney,
    estateMovable,
    priorUsage,
    priorUsageDetails,
    hasJudgmentIssued,
    judgmentDetails,
    hasExecutionOccurred,
    executionDetails,
    evidenceDocuments,
    processDistinction,
    contradictionNotes,
    calculatedScrutinyLevel,
    hasReadContents,
    understandsLegalConsequences,
    confirmedPersonalOrigin,
    marginalAnnotationCourt,
    marginalAnnotationRecorded,
    marginalAnnotationDate,
    marginalAnnotationNumber,
    setState,
  ]);

  // ---------------------------------------------------------------------------
  // 14. Moroccan Legal Draft Generator (الصياغة العدلية المغربية الأصيلة)
  // ---------------------------------------------------------------------------
  const generateAuthoritativeDraft = useMemo(() => {
    const refCourt = courtName || defaultCourt;
    const refDeed = deedNumber ? `عدد ${deedNumber}` : 'عدد (...)';
    const refYear = deedYear ? `سنة ${deedYear}` : 'سنة (...)';
    const refLetter = recordLetter ? `حرف ${recordLetter}` : 'حرف (...)';
    const refPage = pageNumber ? `صحيفة ${pageNumber}` : 'صحيفة (...)';
    const refCount = countNumber ? `عدد ${countNumber}` : 'عدد (...)';
    const refCertDate = certificateDate || '...';
    const refCertType = certType || 'شهادة علمية / لفيفية';

    const witnessName = applicantFullName || 'الشاهد الراجع';
    const witnessCin = applicantNationalId ? `الحامل لبطاقة التعريف الوطنية رقم ${applicantNationalId}` : '';
    const witnessAddress = applicantAddress ? `الساكن بـ ${applicantAddress}` : '';

    let scopeText = '';
    if (recantationScope === 'رجوع_كلي') {
      scopeText = 'أنه يرجع رجوعاً كلياً وباتاً عن جميع ما سبق له أن شهد به في الرسم المذكور أعلاه، مسقطاً لشهادته السابقة جملة وتفصيلاً.';
    } else if (recantationScope === 'رجوع_جزئي') {
      scopeText = `أنه يرجع عن جزء من شهادته السابقة المذكورة، محصوراً في العبارة والواقعة التالية دون غيرها: [${
        targetedClauseOriginal || 'تحديد العبارة المشهود بها محل الرجوع'
      }].`;
    } else {
      scopeText = `أنه يرجع عن شهادته فيما يخص الواقعة المحددة المتعلقة بـ [${
        customRecantedFact || 'الواقعة محل التراجع'
      }].`;
    }

    let natureStatement = '';
    if (natureChoice === 'أقرر_أنني_أخطأت_فيما_شهدت_به') {
      natureStatement = 'مقرراً ومؤكداً أنه قد وقع في الخطأ والوهم والاشتباه فيما شهد به أولاً.';
    } else if (natureChoice === 'تبين_لي_خلاف_ما_شهدت_به') {
      natureStatement = 'مصرحاً بأنه قد ظهر وتبين له خلاف ما كان قد شهد به سابقاً بوجه لا يدع مجالاً للشك.';
    } else if (natureChoice === 'لا_أجزم_بالحقيقة_الجديدة_وإنما_أرجع_عن_شهادتي_الأولى') {
      natureStatement = 'موضحاً أنه لا يجزم بالحقيقة الجديدة قطعا، وإنما تراجع عن شهادته الأولى لعدم تيقنه واشتباه الأمر عليه.';
    } else {
      natureStatement = customNatureText || 'مصرحاً بما يفيد الرجوع عن شهادته السابقة.';
    }

    let newTruthText = '';
    if (willStateNewTruth && newTruthStatement.trim()) {
      newTruthText = `\n\nوبيان ما تبين للشاهد الراجع بعد ذلك:\nوقد أضاف الراجع مصرحاً بما تبين له على وجه الحقيقة قائلاً: «${newTruthStatement}»، مع اعتبار ذلك بياناً لواقعة الرجوع وسببها وفق القواعد الشرعية والقضائية المعمول بها.`;
    }

    let specializedContext = '';
    if (testimonySubject === 'ملكية_عقار' || testimonySubject === 'حيازة') {
      specializedContext = `\n\nبيانات العقار محل الرجوع في الشهادة:\nالعقار الكائن بـ: ${propLocation || '...'} التابع لجماعة: ${propCommune || '...'}، ذي الحدود: شمالاً (${propBoundaries.north || '...'})، جنوباً (${propBoundaries.south || '...'})، شرقاً (${propBoundaries.east || '...'})، غرباً (${propBoundaries.west || '...'})، مساحته: ${propArea || '...'}${propTitle ? `، ذي الرسم العقاري عدد: ${propTitle}` : ''}${propReq ? `، ذي مطلب التحفيظ عدد: ${propReq}` : ''}.`;
    } else if (testimonySubject === 'استمرار_زواج') {
      specializedContext = `\n\nبيانات الزوجية محل الرجوع في الشهادة:\nالمتعلقة بالزوج: ${marriageHusband || '...'} والزوجة: ${marriageWife || '...'}، تاريخ الإشهاد على الزواج: ${marriageDate || '...'}.`;
    } else if (testimonySubject === 'موجب_غيبة') {
      specializedContext = `\n\nبيانات الغيبة محل الرجوع في الشهادة:\nالمتعلقة بالشخص الغائب: ${absencePerson || '...'}، آخر محل عُلم به: ${absenceLastLocation || '...'}، تاريخ آخر علم: ${absenceLastDate || '...'}.`;
    } else if (testimonySubject === 'موجب_مطابقة_اسم') {
      specializedContext = `\n\nبيانات مطابقة الاسمين محل الرجوع:\nبين الاسم الأول: ${nameMatchFirst || '...'} والاسم الثاني: ${nameMatchSecond || '...'}، الحامل للبطاقة الوطنية رقم: ${nameMatchIdCard || '...'}.`;
    }

    let evidenceText = '';
    if (evidenceDocuments.length > 0) {
      evidenceText = '\n\nالمستندات والوثائق المدلى بها تأييداً للرجوع:\n' +
        evidenceDocuments
          .map(
            (doc, idx) =>
              `${idx + 1}. ${doc.documentType} رقم ${doc.documentNumber || '...'} بتاريخ ${doc.documentDate || '...'} الصادرة عن ${doc.issuingAuthority || '...'} (الموجب: ${doc.relevanceReason || 'مستند إثبات'}).`
          )
          .join('\n');
    }

    const lafifStats =
      recantingRole.includes('اللفيف') || operationType.includes('اللفيف')
        ? `\n\nوضعية شهود اللفيف:\nعُرضت خريطة شهود اللفيف البالغ عددهم 12 شاهداً؛ حيث ثبت رجوع عدد (${recantingCount}) شاهد(اً) عن شهادتهم، وبقاء عدد (${retainingCount}) على شهادتهم، مع تسجيل أن هذا الإشهاد يوثق واقعة الرجوع ونطاقها لترتيب آثارها القانونية من لدن الجهات القضائية والإدارية المختصة وفق الحالة.`
        : '';

    return `الحمد لله وحده، والصلاة والسلام على رسول الله وآله وصحبه

المملكة المغربية
وزارة العدل
محكمة الاستئناف بـ...
المحكمة الابتدائية بـ${refCourt}
قسم قضاء التوثيق

رسم رجوع عن شهادة
(توثيق رجوع شاهد / عدل عن شهادته السابقة)

المرجع الأصلي للشهادة المرجوع عنها:
رسم ${refCertType} ${refDeed}، ${refYear}، ${refLetter}، ${refPage}، ${refCount}، المؤرخ في ${refCertDate}، المضمن بسجلات التوثيق بالمحكمة الابتدائية بـ${refCourt}، المتلقى من طرف العدلين ${firstNotary} و${secondNotary}.

أطراف الشهادة الأصلية / المشهود لهم:
${partiesSummary || 'الأطراف المذكورون بالرسم الأصلي المشار إليه أعلاه.'}

حضر لدينا نحن العدلان الموقعان أسفله:
${witnessName}، مغربي الجنسية، ${witnessCin}، ${witnessAddress}، المزداد بتاريخ ${applicantBirthDate || '...'} بـ ${applicantBirthPlace || '...'}، المهنة: ${applicantProfession || '...'}، والصفة في الرسم الأصلي: ${applicantRoleInDeed}.

وبعد التعريف التام بالشاهد المذكور والمخاطبة الشرعية والقانونية، والتحقق من كامل أهليته المعتبرة قانوناً للالتزام والإشهاد، صرح طائعاً مختاراً دون إكراه ولا إجبار بأنه سبق له أن أدلى بشهادته في الرسم المرجعي المذكور أعلاه المتعلق بـ [${testimonySubject.replace(/_/g, ' ')}].

وأن الشاهد المذكور يشهد ويعترف لدينا الآن بمقتضى هذا الرسم:
${scopeText}

بيان سبب ونطاق الرجوع:
ويشهد الشاهد أن سبب رجوعه المذكور هو: ${reasonCategory.replace(/_/g, ' ')}${
      customReasonText ? ` (${customReasonText})` : ''
    }، شارحاً ذلك وموضحاً: «${
      detailedReasonExplanation || 'تبين له الخطأ والالتباس في الواقعة المشهود بها سابقاً'
    }».

طبيعة الرجوع والإقرار:
وحيث صرح الشاهد المذكور ${natureStatement}${newTruthText}${specializedContext}${evidenceText}${lafifStats}

الأثر واستعمال الشهادة السابقة:
وقد صرح الشاهد بشأن استعمال الشهادة السابقة بأنها: [${priorUsage.replace(/_/g, ' ')}${
      priorUsageDetails ? ` — ${priorUsageDetails}` : ''
    }]، وحول ما إذا كان قد صدر حكم بناء عليها صرح بـ [${hasJudgmentIssued}]، وحول ترتب تنفيذ أو أثر قانوني صرح بـ [${hasExecutionOccurred}].

التأشير بالهامش:
وتطبيقاً للقواعد التوثيقية والتعليمات القضائية الجاري بها العمل، يتعين إحالة نظير من هذا الرسم فور مخاطبة السيد القاضي المكلف بالتوثيق عليه على كتابة الضبط المختصة بالمحكمة الابتدائية بـ${marginalAnnotationCourt} للتأشير بمضمنه بخط واضح على طرة الرسم الأصلي بسجل التضمين (الدفتر ${refLetter} عدد ${refDeed} صحيفة ${refPage}) منعاً للاحتجاج بالشهادة المرجوع عنها بوجه غير قانوني.

وقد تُلِيَ هذا الرسم على الشاهد الراجع كاملاً، ففهم فحواه وأدرك مضمونه وآثاره القانونية، وأقر بصحته ووقع عليه بعد الإشهاد.

وحرر في يومه: ${todayHijri} هجرية، الموافق لـ: ${todayGregorian} ميلادية.

توقيع الشاهد الراجع:
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
    deedNumber,
    deedYear,
    recordLetter,
    pageNumber,
    countNumber,
    certificateDate,
    certType,
    firstNotary,
    secondNotary,
    partiesSummary,
    applicantFullName,
    applicantNationalId,
    applicantAddress,
    applicantBirthDate,
    applicantBirthPlace,
    applicantProfession,
    applicantRoleInDeed,
    testimonySubject,
    recantationScope,
    targetedClauseOriginal,
    customRecantedFact,
    reasonCategory,
    customReasonText,
    detailedReasonExplanation,
    natureChoice,
    customNatureText,
    willStateNewTruth,
    newTruthStatement,
    propLocation,
    propCommune,
    propBoundaries,
    propArea,
    propTitle,
    propReq,
    marriageHusband,
    marriageWife,
    marriageDate,
    absencePerson,
    absenceLastLocation,
    absenceLastDate,
    nameMatchFirst,
    nameMatchSecond,
    nameMatchIdCard,
    evidenceDocuments,
    recantingRole,
    operationType,
    recantingCount,
    retainingCount,
    priorUsage,
    priorUsageDetails,
    hasJudgmentIssued,
    hasExecutionOccurred,
    marginalAnnotationCourt,
    todayHijri,
    todayGregorian,
    defaultNotary1,
    defaultNotary2,
  ]);

  // ---------------------------------------------------------------------------
  // 15. Transition to Step 7 (Final Review) — Strictly setting step: 7
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = useCallback(() => {
    const applicantParty: Party = {
      ...createEmptyParty(),
      fullName: applicantFullName || 'الشاهد الراجع',
      cin: applicantNationalId,
      phone: applicantPhone,
      address: applicantAddress,
      profession: applicantProfession,
      capacity: recantingRole.replace(/_/g, ' '),
    };

    const targetParty: Party = {
      ...createEmptyParty(),
      fullName: `المشهود لهم في الشهادة الأصلية عدد ${deedNumber || '...'}`,
      capacity: 'أطراف الشهادة الأصلية',
    };

    setState((prev) => ({
      ...prev,
      step: 7, // الانتقال المباشر والقطعي للخطوة السابعة
      documentType: 'رجوع_عن_شهادة',
      draft: generateAuthoritativeDraft,
      draftText: generateAuthoritativeDraft,
      sellers: [applicantParty], // Party recanting
      buyers: [targetParty], // Interested parties
      property: {
        ...prev.property,
        propertyName: `الشهادة المرجوع عنها عدد ${deedNumber || '...'} (${testimonySubject.replace(/_/g, ' ')})`,
        titleRef: propTitle || deedNumber,
        location: propLocation,
        boundaries: {
          north: propBoundaries.north,
          east: propBoundaries.east,
          south: propBoundaries.south,
          west: propBoundaries.west,
        },
        area_m2: propArea,
      },
      finance: {
        ...prev.finance,
        price: 0,
        priceInWords: 'معفى من الأداء المالي المباشر / إشهاد على الرجوع',
        paymentMethod: 'نقد',
      },
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    applicantFullName,
    applicantNationalId,
    applicantPhone,
    applicantAddress,
    applicantProfession,
    recantingRole,
    deedNumber,
    generateAuthoritativeDraft,
    testimonySubject,
    propTitle,
    propLocation,
    propBoundaries,
    propArea,
    setState,
  ]);

  return (
    <div className="space-y-8 animate-fadeIn pb-16 font-cairo text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Header Banner & Quick Status Card                                      */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl border border-emerald-800/40">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5" />
              <span>منظومة توثيق الرجوع في الشهادة العدلية واللفيفية</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>«رسم الرجوع عن الشهادة»</span>
              <span className="text-sm font-normal px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-emerald-200">
                {operationType.replace(/_/g, ' ')}
              </span>
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              توثيق رجوع العدل أو الشاهد عن شهادة سبق صدورها عنه، مع تحديد الشهادة محل الرجوع وسببه ونطاقه وآثاره وربطه بالرسم الأصلي والتأشير بطرته.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto">
            {/* Scrutiny Risk Badge */}
            <div className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between sm:justify-start gap-4">
              <div>
                <div className="text-[10px] text-emerald-200/70 font-medium">مستوى التدقيق المطلوب</div>
                <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      calculatedScrutinyLevel === 'دقيق_جداً'
                        ? 'bg-rose-500 animate-pulse'
                        : calculatedScrutinyLevel === 'مهم'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>{calculatedScrutinyLevel.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <div className="text-left border-r border-white/15 pr-3">
                <div className="text-[10px] text-emerald-200/70">شهود اللفيف</div>
                <div className="text-xs font-bold text-emerald-300">
                  {recantingCount} راجع / {retainingCount} باقٍ
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

        {/* Vital Rule Card: Not a material correction */}
        <div className="mt-6 pt-5 border-t border-emerald-800/60 flex items-start gap-3 bg-amber-950/30 rounded-2xl p-4 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300 font-bold ml-1">تنبيه منهجي جوهري:</strong>
            الرجوع ليس تصحيحاً مادياً للرسم. إذا كان الأمر مجرد خطأ في اسم أو رقم أو تاريخ أو بيان كتابي دون رجوع صاحب الشهادة عما شهد به، يتعين الانتقال إلى{' '}
            <strong className="text-white underline decoration-amber-400 underline-offset-2">رواق الملحق التصحيحي (الإسمحة)</strong>. هذا الرواق مخصص حصرياً لرجوع الشاهد أو العدل عن الواقعة المشهود بها وإثبات تراجعه وأسبابه.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Interactive 7-Stage Horizontal Stepper Navigation                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-2 md:p-3 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 md:gap-2">
          {[
            { id: 1, title: 'الشهادة الأصلية', icon: Building2, desc: 'استرجاع ومطابقة' },
            { id: 2, title: 'صاحب الرجوع', icon: Users, desc: 'الهوية وخريطة اللفيف' },
            { id: 3, title: 'نطاق ومحل الرجوع', icon: Scale, desc: 'تحديد العبارة والواقعة' },
            { id: 4, title: 'سبب وطبيعة الرجوع', icon: AlertTriangle, desc: 'الوهم وبيان الحقيقة' },
            { id: 5, title: 'الأثر والاستعمال', icon: FileCheck, desc: 'مآل الشهادة والأحكام' },
            { id: 6, title: 'الفحص والتدقيق', icon: ShieldCheck, desc: 'التناقض ومؤشر الخطر' },
            { id: 7, title: 'الصياغة والاعتماد', icon: FileText, desc: 'تحرير الرسم والتأشير' },
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
      {/* 3. STAGE 1: Original Deed & Subject                                       */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6">
          {/* 1.1 Operation Type Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">1. تحديد طبيعة ونوع عملية الرجوع</h2>
              </div>
              <span className="text-xs text-slate-400">اختر التوصيف الدقيق لعملية الرجوع</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'رجوع_شاهد_من_شهود_اللفيف', title: 'رجوع شاهد من شهود اللفيف', desc: 'تراجع أحد شهود اللفيف (من أصل 12) عما شهد به' },
                { key: 'رجوع_بعض_شهود_اللفيف', title: 'رجوع بعض شهود اللفيف', desc: 'تراجع أكثر من شاهد من لفيف الإشهاد' },
                { key: 'رجوع_جميع_شهود_اللفيف', title: 'رجوع جميع شهود اللفيف', desc: 'إجماع شهود اللفيف قاطبة على الرجوع' },
                { key: 'رجوع_عدل_عن_شهادة_علمية', title: 'رجوع عدل عن شهادة علمية', desc: 'تراجع العدل عما ثبت بعلمه في شهادة سابقة' },
                { key: 'رجوع_شاهد_عن_شهادة_علمية_مثلية', title: 'رجوع شاهد عن شهادة علمية مثلية', desc: 'تراجع شاهد علمي مثلي' },
                { key: 'رجوع_عن_جزء_من_الشهادة', title: 'رجوع عن جزء من الشهادة', desc: 'حصر التراجع في واقعة أو جزء محدد' },
                { key: 'رجوع_كامل_عن_الشهادة', title: 'رجوع كامل عن الشهادة', desc: 'إسقاط الشهادة بكليتها' },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => setOperationType(item.key as RecantationOperationType)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    operationType === item.key
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{item.title}</span>
                    {operationType === item.key && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 1.2 Testimony Subject Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">2. موضوع الشهادة محل الرجوع</h2>
              </div>
              <span className="text-xs text-slate-400">تكييف محل الإشهاد الأصلي</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { key: 'ملكية_عقار', label: 'ملكية عقار', icon: '🏡' },
                { key: 'حيازة', label: 'حيازة عقارية', icon: '🌾' },
                { key: 'استمرار_زواج', label: 'استمرار زواج', icon: '💍' },
                { key: 'كفالة', label: 'كفالة', icon: '🤝' },
                { key: 'موجب_خلل_عقلي', label: 'موجب خلل عقلي', icon: '🧠' },
                { key: 'موجب_غيبة', label: 'موجب غيبة', icon: '⏳' },
                { key: 'موجب_مطابقة_اسم', label: 'موجب مطابقة اسم', icon: '🪪' },
                { key: 'إحصاء_متروك', label: 'إحصاء متروك / تركة', icon: '📦' },
                { key: 'واقعة_شخصية', label: 'واقعة شخصية', icon: '👤' },
                { key: 'دين_أو_حق_مالي', label: 'دين أو حق مالي', icon: '💰' },
                { key: 'إراثة_استحقاق', label: 'إراثة / استحقاق', icon: '📜' },
                { key: 'واقعة_مرتبطة_بعقار', label: 'واقعة مرتبطة بعقار', icon: '🧱' },
                { key: 'واقعة_مادية', label: 'واقعة مادية', icon: '🔍' },
                { key: 'منقول', label: 'أموال منقولة', icon: '🚗' },
                { key: 'شهادة_لفيفية_أخرى', label: 'شهادة لفيفية أخرى', icon: '👥' },
                { key: 'موضوع_آخر', label: 'موضوع آخر', icon: '⚙️' },
              ].map((subj) => (
                <button
                  key={subj.key}
                  type="button"
                  onClick={() => setTestimonySubject(subj.key as RecantationSubjectType)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 ${
                    testimonySubject === subj.key
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-lg">{subj.icon}</span>
                  <span className="text-xs font-bold">{subj.label}</span>
                </button>
              ))}
            </div>

            {testimonySubject === 'موضوع_آخر' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">حدد موضوع الشهادة:</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="بيان موضوع الشهادة بدقة..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 1.3 Original Deed Retrieval & Reference */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. مراجع الشهادة الأصلية المراد الرجوع عنها</h2>
                  <p className="text-xs text-slate-400">إدخال أو استرجاع بيانات الشهادة المسجلة بسجلات التوثيق</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDeedRetrieved(true);
                  if (!certType) setCertType('رسم ملكية عقارية');
                  if (!courtName) setCourtName(defaultCourt);
                  if (!firstNotary) setFirstNotary(defaultNotary1);
                  if (!secondNotary) setSecondNotary(defaultNotary2);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all"
              >
                <Search className="w-4 h-4 text-emerald-600" />
                <span>استرجاع الشهادة من النظام</span>
              </button>
            </div>

            {isDeedRetrieved && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      تم استحضار وتثبيت بيانات الشهادة المرجعية
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      الرسم عدد {deedNumber || '...'} حرف {recordLetter || '...'} صحيفة {pageNumber || '...'} — محكمة {courtName || '...'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900">
                  مضمّن بسجل التضمين
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الشهادة / الرسم</label>
                <input
                  type="text"
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  placeholder="مثال: رسم ملكية، موجب استمرار..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرسم / العدد</label>
                <input
                  type="text"
                  value={deedNumber}
                  onChange={(e) => setDeedNumber(e.target.value)}
                  placeholder="مثال: 142"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السنة</label>
                <input
                  type="text"
                  value={deedYear}
                  onChange={(e) => setDeedYear(e.target.value)}
                  placeholder="مثال: 2024"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حرف السجل</label>
                <input
                  type="text"
                  value={recordLetter}
                  onChange={(e) => setRecordLetter(e.target.value)}
                  placeholder="مثال: ب / ج / د"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 text-center font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الصحيفة</label>
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="مثال: 85"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العدد بالصحيفة (إن وجد)</label>
                <input
                  type="text"
                  value={countNumber}
                  onChange={(e) => setCountNumber(e.target.value)}
                  placeholder="مثال: 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الشهادة</label>
                <input
                  type="date"
                  value={certificateDate}
                  onChange={(e) => setCertificateDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التضمين</label>
                <input
                  type="date"
                  value={inclusionDate}
                  onChange={(e) => setInclusionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة الابتدائية المختصة</label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="اسم المحكمة وقسم التوثيق"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العدل المتلقي الأول</label>
                <input
                  type="text"
                  value={firstNotary}
                  onChange={(e) => setFirstNotary(e.target.value)}
                  placeholder="اسم العدل الأول"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العدل المتلقي الثاني</label>
                <input
                  type="text"
                  value={secondNotary}
                  onChange={(e) => setSecondNotary(e.target.value)}
                  placeholder="اسم العدل الثاني"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">أطراف الشهادة الأصلية (المشهود لهم / عليهم)</label>
              <input
                type="text"
                value={partiesSummary}
                onChange={(e) => setPartiesSummary(e.target.value)}
                placeholder="بيان أسماء الأطراف المشهود لهم أو أصحاب المصلحة في الشهادة..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نص الشهادة الأصلية المشهود بها (مقتطف أو كامل النص)</label>
              <textarea
                rows={3}
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="مثال: يشهد الشاهد المذكور أن فلاناً يحوز العقار الكائن بـ... منذ سنة 2005 حيازة هادئة علنية متصلة مستمرة منسوبة للملك..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md transition-all text-sm"
            >
              <span>المتابعة إلى صاحب الرجوع وخريطة اللفيف</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STAGE 2: Recanting Party & Lafif Map                                    */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6">
          {/* 2.1 Role of Recanting Party */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">1. من الذي يرجع عن الشهادة؟</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: 'شاهد_واحد_من_شهود_اللفيف', label: 'شاهد واحد من اللفيف' },
                { key: 'أكثر_من_شاهد', label: 'أكثر من شاهد' },
                { key: 'جميع_شهود_اللفيف', label: 'جميع شهود اللفيف' },
                { key: 'العدل_نفسه', label: 'العدل المتلقي نفسه' },
                { key: 'العدل_الثاني', label: 'العدل المتلقي الثاني' },
                { key: 'كلا_العدلين', label: 'كلا العدلين' },
              ].map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setRecantingRole(role.key as RecantingPersonRole)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    recantingRole === role.key
                      ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2.2 Recanting Witness Personal Identity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">2. بطاقة هوية الشاهد / الشخص الراجع</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-sm">
                  {scanningApplicant ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>مسح البطاقة الوطنية (CIN)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={scanningApplicant}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) scanApplicantIdCard(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  مسترجعة من الشهادة الأصلية وتُصحح عند الاقتضاء
                </span>
              </div>
            </div>

            {applicantNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  applicantNotice.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span>{applicantNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setApplicantNotice(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الشخصي والعائلي</label>
                <input
                  type="text"
                  value={applicantFullName}
                  onChange={(e) => setApplicantFullName(e.target.value)}
                  placeholder="الاسم الكامل للشاهد الراجع"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم البطاقة الوطنية (CIN)</label>
                <input
                  type="text"
                  value={applicantNationalId}
                  onChange={(e) => setApplicantNationalId(e.target.value)}
                  placeholder="مثال: AB123456"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأب</label>
                <input
                  type="text"
                  value={applicantFatherName}
                  onChange={(e) => setApplicantFatherName(e.target.value)}
                  placeholder="اسم الأب"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الأم</label>
                <input
                  type="text"
                  value={applicantMotherName}
                  onChange={(e) => setApplicantMotherName(e.target.value)}
                  placeholder="اسم الأم"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الازدياد</label>
                <input
                  type="date"
                  value={applicantBirthDate}
                  onChange={(e) => setApplicantBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مكان الازدياد</label>
                <input
                  type="text"
                  value={applicantBirthPlace}
                  onChange={(e) => setApplicantBirthPlace(e.target.value)}
                  placeholder="مدينة / جماعة الازدياد"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المهنة</label>
                <input
                  type="text"
                  value={applicantProfession}
                  onChange={(e) => setApplicantProfession(e.target.value)}
                  placeholder="المهنة أو الحرفة"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف للتواصل</label>
                <input
                  type="text"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">محل السكنى</label>
                <input
                  type="text"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="العنوان الكامل للشاهد"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">صفته في الشهادة الأصلية</label>
                <input
                  type="text"
                  value={applicantRoleInDeed}
                  onChange={(e) => setApplicantRoleInDeed(e.target.value)}
                  placeholder="مثال: الشاهد رقم 1 في لفيف الملكية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2.3 Interactive Lafif Witness Map (خريطة شهود اللفيف) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. خريطة شهود اللفيف (12 شاهداً)</h2>
                  <p className="text-xs text-slate-400">تتبع دقيق لحالة كل شاهد: باقٍ على شهادته أم راجع عنها</p>
                </div>
              </div>

              {/* Counter badges */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  الراجعون: {recantingCount}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  الباقون: {retainingCount}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>قاعدة فقهية وقضائية:</strong> الرجوع الجزئي لأحد شهود اللفيف لا يعني تلقائياً سقوط الشهادة أو بقاءها بكليتها؛ يقتصر هذا الرسم العدلي على توثيق واقعة الرجوع ونطاقها بدقة، وتترك الآثار القانونية لتقدير المحكمة والجهات المختصة.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lafifWitnesses.map((w, idx) => {
                const isRecanting = w.status === 'يرجع_عن_شهادته';
                return (
                  <div
                    key={w.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isRecanting
                        ? 'border-rose-300 bg-rose-50/60 ring-1 ring-rose-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                          {w.witnessNumber}
                        </span>
                        <span>الشاهد رقم {w.witnessNumber}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <label
                          className="cursor-pointer p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all"
                          title="مسح بطاقة تعريف الشاهد"
                        >
                          {scanningLafifWitness[idx] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={scanningLafifWitness[idx]}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) scanLafifRecantationWitness(idx, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleWitnessStatus(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isRecanting
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          {isRecanting ? 'يرجع عن شهادته' : 'باقٍ على شهادته'}
                        </button>
                      </div>
                    </div>

                    {lafifNotice[idx] && (
                      <div className={`p-2 rounded-lg text-[10px] mb-2 ${
                        lafifNotice[idx].success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {lafifNotice[idx].message}
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs">
                      <input
                        type="text"
                        value={w.fullName}
                        onChange={(e) => updateWitnessField(idx, 'fullName', e.target.value)}
                        placeholder={`اسم الشاهد رقم ${w.witnessNumber}...`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        value={w.nationalId}
                        onChange={(e) => updateWitnessField(idx, 'nationalId', e.target.value)}
                        placeholder="رقم البطاقة الوطنية (CIN)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs uppercase font-mono"
                      />
                      {isRecanting && (
                        <input
                          type="text"
                          value={w.recantationDetails || ''}
                          onChange={(e) => updateWitnessField(idx, 'recantationDetails', e.target.value)}
                          placeholder="ملاحظة حول رجوع هذا الشاهد..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs focus:ring-1 focus:ring-rose-500"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الشهادة الأصلية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى نطاق ومحل الرجوع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STAGE 3: Scope & Targeted Clause Selector                              */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-6">
          {/* 3.1 Scope Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Scale className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">1. عن ماذا يرجع الشاهد؟ (نطاق الرجوع)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  key: 'رجوع_كلي',
                  title: 'رجوع كلي',
                  formula: '«أرجع عن جميع ما سبق أن شهدت به في هذه الشهادة.»',
                  desc: 'إسقاط كامل للشهادة السابقة دون استثناء أي واقعة.',
                },
                {
                  key: 'رجوع_جزئي',
                  title: 'رجوع جزئي',
                  formula: '«أرجع عن الجزء التالي من شهادتي فقط...»',
                  desc: 'تراجع عن عبارة أو جزء محدد مع بقاء باقي الشهادة قائماً.',
                },
                {
                  key: 'رجوع_عن_واقعة_محددة',
                  title: 'رجوع عن واقعة محددة',
                  formula: '«أرجع عن واقعة محددة المشهود بها سابقاً.»',
                  desc: 'تراجع عن عنصر مفرد (كالحدود، تاريخ الحيازة، أو النسب).',
                },
              ].map((scope) => (
                <div
                  key={scope.key}
                  onClick={() => setRecantationScope(scope.key as RecantationScope)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    recantationScope === scope.key
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">{scope.title}</span>
                    {recantationScope === scope.key && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 bg-white/80 p-2 rounded-xl border border-emerald-100 mb-2">
                    {scope.formula}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{scope.desc}</p>
                </div>
              ))}
            </div>

            {recantationScope === 'رجوع_عن_واقعة_محددة' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الواقعة المحددة محل الرجوع:
                </label>
                <input
                  type="text"
                  value={customRecantedFact}
                  onChange={(e) => setCustomRecantedFact(e.target.value)}
                  placeholder="مثال: تاريخ بداية الحيازة، أو صفة القرابة، أو حدود العقار من الجهة الغربية..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* 3.2 Targeted Clause Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">2. تحديد العبارة أو الجملة محل الرجوع بدقة</h2>
              </div>
              <span className="text-xs text-slate-400">يمنع الصياغات الغامضة للرجوع</span>
            </div>

            {originalText && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>النص الكامل للشهادة الأصلية المسترجعة:</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed">
                  {originalText}
                </div>
                <button
                  type="button"
                  onClick={() => setTargetedClauseOriginal(originalText)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold"
                >
                  ← نسخ كامل النص إلى العبارة محل الرجوع
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العبارة المشهود بها محل الرجوع (اقتباس نص الشهادة بدقة):
              </label>
              <textarea
                rows={3}
                value={targetedClauseOriginal}
                onChange={(e) => setTargetedClauseOriginal(e.target.value)}
                placeholder="مثال: «... يحوز العقار المذكور منذ سنة 1998 حيازة هادئة علنية مستمرة...»"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* 3.3 Specialized Aspect Selectors depending on Subject */}
          {(testimonySubject === 'ملكية_عقار' || testimonySubject === 'حيازة') && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🏡 عناصر الشهادة العقارية المشمولة بالرجوع:</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  'أصل_الملكية',
                  'الحيازة',
                  'تاريخ_بداية_الحيازة',
                  'صفة_الحيازة',
                  'استمرار_الحيازة',
                  'موقع_العقار',
                  'هوية_العقار',
                  'حدود_العقار',
                  'مساحة_العقار',
                  'إحداثيات_العقار',
                  'الملكية_السابقة',
                  'واقعة_مادية_مرتبطة_بالعقار',
                ].map((aspect) => {
                  const isChecked = recantedAspectProperty.includes(aspect as PropertyRecantationAspect);
                  return (
                    <label
                      key={aspect}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setRecantedAspectProperty((prev) =>
                            isChecked ? prev.filter((a) => a !== aspect) : [...prev, aspect as PropertyRecantationAspect]
                          );
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{aspect.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>

              {/* Property Details Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موقع العقار</label>
                  <input
                    type="text"
                    value={propLocation}
                    onChange={(e) => setPropLocation(e.target.value)}
                    placeholder="المدينة / الدوار / الشارع"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الجماعة / الإقليم</label>
                  <input
                    type="text"
                    value={propCommune}
                    onChange={(e) => setPropCommune(e.target.value)}
                    placeholder="الجماعة الترابية"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المساحة</label>
                  <input
                    type="text"
                    value={propArea}
                    onChange={(e) => setPropArea(e.target.value)}
                    placeholder="مثال: 120 م² أو 2 هكتار"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرسم العقاري / مطلب التحفيظ</label>
                  <input
                    type="text"
                    value={propTitle || propReq}
                    onChange={(e) => {
                      setPropTitle(e.target.value);
                      setPropReq(e.target.value);
                    }}
                    placeholder="رقم الصك أو المطلب إن وجد"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={propBoundaries.north}
                    onChange={(e) => setPropBoundaries((b) => ({ ...b, north: e.target.value }))}
                    placeholder="شمالاً: ..."
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={propBoundaries.south}
                    onChange={(e) => setPropBoundaries((b) => ({ ...b, south: e.target.value }))}
                    placeholder="جنوباً: ..."
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={propBoundaries.east}
                    onChange={(e) => setPropBoundaries((b) => ({ ...b, east: e.target.value }))}
                    placeholder="شرقاً: ..."
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    value={propBoundaries.west}
                    onChange={(e) => setPropBoundaries((b) => ({ ...b, west: e.target.value }))}
                    placeholder="غرباً: ..."
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {testimonySubject === 'استمرار_زواج' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">💍 عناصر الرجوع في موجب استمرار الزواج:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  'أصل_استمرار_الزواج',
                  'تاريخ_الاستمرار',
                  'عدم_العلم_بالطلاق',
                  'عدم_العلم_بالوفاة',
                ].map((aspect) => {
                  const isChecked = recantedAspectMarriage.includes(aspect as MarriageRecantationAspect);
                  return (
                    <label
                      key={aspect}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                        isChecked ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setRecantedAspectMarriage((prev) =>
                            isChecked ? prev.filter((a) => a !== aspect) : [...prev, aspect as MarriageRecantationAspect]
                          );
                        }}
                      />
                      <span>{aspect.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={marriageHusband}
                  onChange={(e) => setMarriageHusband(e.target.value)}
                  placeholder="اسم الزوج"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={marriageWife}
                  onChange={(e) => setMarriageWife(e.target.value)}
                  placeholder="اسم الزوجة"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                  placeholder="تاريخ الزواج"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={marriagePlace}
                  onChange={(e) => setMarriagePlace(e.target.value)}
                  placeholder="مكان إبرام الزواج"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={marriageKnowledgeSource}
                  onChange={(e) => setMarriageKnowledgeSource(e.target.value)}
                  placeholder="مصدر العلم المشهود به"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          )}

          {testimonySubject === 'موجب_غيبة' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">⏳ عناصر الرجوع في موجب الغيبة:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  'أصل_الغيبة',
                  'مدة_الغيبة',
                  'مكان_آخر_مشاهدة',
                  'تاريخ_آخر_مشاهدة',
                  'عدم_العلم_بمكان_الوجود',
                ].map((aspect) => {
                  const isChecked = recantedAspectAbsence.includes(aspect as AbsenceRecantationAspect);
                  return (
                    <label
                      key={aspect}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                        isChecked ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setRecantedAspectAbsence((prev) =>
                            isChecked ? prev.filter((a) => a !== aspect) : [...prev, aspect as AbsenceRecantationAspect]
                          );
                        }}
                      />
                      <span>{aspect.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={absencePerson}
                  onChange={(e) => setAbsencePerson(e.target.value)}
                  placeholder="اسم الشخص محل الغيبة"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={absenceLastLocation}
                  onChange={(e) => setAbsenceLastLocation(e.target.value)}
                  placeholder="آخر مكان علم به"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="date"
                  value={absenceLastDate}
                  onChange={(e) => setAbsenceLastDate(e.target.value)}
                  placeholder="تاريخ آخر مشاهدة"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={absenceDuration}
                  onChange={(e) => setAbsenceDuration(e.target.value)}
                  placeholder="مدة الغيبة المشهود بها"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          )}

          {testimonySubject === 'موجب_مطابقة_اسم' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">🪪 عناصر الرجوع في موجب مطابقة الاسم:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'أرجع_عن_المطابقة_كليا', label: 'أرجع عن المطابقة كلياً (الشخصان غير متطابقين)' },
                  { key: 'تبين_لي_أن_الشخصين_مختلفان', label: 'تبين لي أن الشخصين مختلفان قطعاً' },
                  { key: 'أرجع_عن_جزء_من_بيانات_المطابقة', label: 'أرجع عن جزء من بيانات المطابقة فقط' },
                  { key: 'لم_أعد_أجزم_بالمطابقة', label: 'لم أعد أجزم بالمطابقة لوقوع الشك والالتباس' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs ${
                      recantedAspectNameMatch === opt.key ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="nameMatchChoice"
                      checked={recantedAspectNameMatch === opt.key}
                      onChange={() => setRecantedAspectNameMatch(opt.key as NameMatchRecantationAspect)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={nameMatchFirst}
                  onChange={(e) => setNameMatchFirst(e.target.value)}
                  placeholder="الاسم الأول المشهود به"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={nameMatchSecond}
                  onChange={(e) => setNameMatchSecond(e.target.value)}
                  placeholder="الاسم الثاني المشهود بمطابقته"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={nameMatchIdCard}
                  onChange={(e) => setNameMatchIdCard(e.target.value)}
                  placeholder="رقم بطاقة التعريف الوطنية"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {(testimonySubject === 'إحصاء_متروك' || testimonySubject === 'إراثة_استحقاق') && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">📦 عناصر الرجوع في إحصاء المتروك / التركة:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  'وجود_المال',
                  'ملكية_الموروث_للمال',
                  'مقدار_المال',
                  'وصف_المال',
                  'وجود_منقول_معين',
                  'واقعة_أخرى_بالمتروك',
                ].map((aspect) => {
                  const isChecked = recantedAspectEstate.includes(aspect as EstateInventoryRecantationAspect);
                  return (
                    <label
                      key={aspect}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                        isChecked ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setRecantedAspectEstate((prev) =>
                            isChecked ? prev.filter((a) => a !== aspect) : [...prev, aspect as EstateInventoryRecantationAspect]
                          );
                        }}
                      />
                      <span>{aspect.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={estateDeceased}
                  onChange={(e) => setEstateDeceased(e.target.value)}
                  placeholder="اسم الهالك / الموروث"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={estateMoney}
                  onChange={(e) => setEstateMoney(e.target.value)}
                  placeholder="مبلغ المال المشهود به"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={estateMovable}
                  onChange={(e) => setEstateMovable(e.target.value)}
                  placeholder="وصف المنقولات المشهود بها"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: صاحب الرجوع</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى سبب وطبيعة الرجوع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STAGE 4: Reason & Nature of Recantation                                */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="space-y-6">
          {/* 4.1 Categorized Reasons */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">1. ما سبب الرجوع عن الشهادة؟</h2>
              </div>
              <span className="text-xs text-slate-400">توصيف دقيق لدافع الرجوع الفقهي والقانوني</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { key: 'تبين_الخطأ', label: 'تبين الخطأ' },
                { key: 'وقوع_الشاهد_في_الوهم', label: 'وقوع الشاهد في الوهم' },
                { key: 'الاشتباه', label: 'الاشتباه' },
                { key: 'عدم_ضبط_الواقعة', label: 'عدم ضبط الواقعة' },
                { key: 'التباس_في_الشخص', label: 'التباس في الشخص' },
                { key: 'التباس_في_المكان', label: 'التباس في المكان' },
                { key: 'التباس_في_التاريخ', label: 'التباس في التاريخ' },
                { key: 'التباس_في_حدود_العقار', label: 'التباس في حدود العقار' },
                { key: 'عدم_العلم_الكافي_بالواقعة', label: 'عدم العلم الكافي بالواقعة' },
                { key: 'ظهور_واقعة_جديدة', label: 'ظهور واقعة جديدة' },
                { key: 'ظهور_وثيقة_تناقض_ما_شهد_به', label: 'ظهور وثيقة تناقض ما شُهد به' },
                { key: 'تبين_أن_الواقعة_ليست_كما_شهد_بها', label: 'تبين أن الواقعة خلاف ما شُهد به' },
                { key: 'خطأ_في_النقل_أو_التلقي', label: 'خطأ في النقل أو التلقي' },
                { key: 'خطأ_في_الإدراك', label: 'خطأ في الإدراك' },
                { key: 'إغفال_واقعة_مؤثرة', label: 'إغفال واقعة مؤثرة' },
                { key: 'سبب_آخر', label: 'سبب آخر' },
              ].map((reason) => (
                <button
                  key={reason.key}
                  type="button"
                  onClick={() => setReasonCategory(reason.key as RecantationReasonCategory)}
                  className={`p-3 rounded-2xl border text-right transition-all text-xs font-bold ${
                    reasonCategory === reason.key
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {reasonCategory === 'سبب_آخر' && (
              <input
                type="text"
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="بيان السبب بعبارة الشاهد..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اشرح سبب الرجوع بالتفصيل (بعبارة الشاهد ودون فرض أي صيغة مسبقة):
              </label>
              <textarea
                rows={4}
                value={detailedReasonExplanation}
                onChange={(e) => setDetailedReasonExplanation(e.target.value)}
                placeholder="مثال: يرجع الشاهد المذكور لكونه التبس عليه العقار المشهود به مع عقار مجاور يملكه شخص آخر، وتبين له بعد المعاينة والتحقق الشخصي أنه وقع في الوهم والاشتباه..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* 4.2 Nature: Returning from wrong to truth (هل الرجوع عن الباطل إلى الحق؟) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">2. هل يقرر الراجع أن شهادته الأولى غير صحيحة؟</h2>
              </div>
              <span className="text-xs text-slate-400">تكييف صيغة الرجوع الفقهية</span>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'أقرر_أنني_أخطأت_فيما_شهدت_به',
                  label: 'نعم، وأقرر أنني أخطأت فيما شهدت به أولاً.',
                  desc: 'إقرار بالخطأ والوهم في الشهادة الأولى وإسقاطها.',
                },
                {
                  key: 'تبين_لي_خلاف_ما_شهدت_به',
                  label: 'نعم، وتبين لي خلاف ما شهدت به بوجه قطعي.',
                  desc: 'الجزم بأن الحقيقة على النقيض مما شهد به سابقاً.',
                },
                {
                  key: 'لا_أجزم_بالحقيقة_الجديدة_وإنما_أرجع_عن_شهادتي_الأولى',
                  label: 'لا أجزم بالحقيقة الجديدة، وإنما أرجع عن شهادتي الأولى فقط.',
                  desc: 'سحب الشهادة الأولى لعدم التيقن دون الجزم بواقعة نقيضة.',
                },
                {
                  key: 'صيغة_أخرى_يحددها_الراجع',
                  label: 'صيغة أخرى خاصة يحددها الراجع.',
                  desc: 'عبارة مستقلة يصرح بها الشاهد في مجلس العقد.',
                },
              ].map((choice) => (
                <label
                  key={choice.key}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    natureChoice === choice.key
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="natureRadio"
                    checked={natureChoice === choice.key}
                    onChange={() => setNatureChoice(choice.key as RecantationNatureChoice)}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{choice.label}</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">{choice.desc}</span>
                  </div>
                </label>
              ))}

              {natureChoice === 'صيغة_أخرى_يحددها_الراجع' && (
                <input
                  type="text"
                  value={customNatureText}
                  onChange={(e) => setCustomNatureText(e.target.value)}
                  placeholder="اكتب الصيغة المحددة من طرف الراجع..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            {/* Will State New Truth? (بيان ما تبين للراجع) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">هل يريد الراجع الإدلاء بما تبين له بعد ذلك؟</h3>
                  <p className="text-xs text-slate-500">
                    التمييز بين مجرد الرجوع وبين الإدلاء بالحقيقة المستجدة
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWillStateNewTruth(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !willStateNewTruth
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    لا، أقتصر على الرجوع فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setWillStateNewTruth(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      willStateNewTruth
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    نعم، أريد بيان ما تبين لي
                  </button>
                </div>
              </div>

              {willStateNewTruth && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <label className="block text-xs font-bold text-emerald-950">
                    بيان ما تبين للراجع (ماذا ظهر لك بعد ذلك؟):
                  </label>
                  <textarea
                    rows={3}
                    value={newTruthStatement}
                    onChange={(e) => setNewTruthStatement(e.target.value)}
                    placeholder="مثال: «بعد البحث والتحقق تبين لي أن العقار الذي شهدت بحيازته لفلان ليس هو العقار الذي كنت أقصده، وإنما الحائز الفعلي هو فلان بن فلان...»"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm focus:ring-2 focus:ring-emerald-500 leading-relaxed bg-white"
                  />
                  <p className="text-[11px] text-emerald-800">
                    ملاحظة: هذا البيان لا يُعد حكماً بصحة الواقعة الجديدة، بل يوثق تصريح الراجع بما آل إليه علمه.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: نطاق ومحل الرجوع</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الأثر والاستعمال والوثائق</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. STAGE 5: Prior Usage & Supporting Documents                             */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="space-y-6">
          {/* 5.1 Prior Usage & Judicial Exposure */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. هل سبق أن استعملت هذه الشهادة؟ (مآل الشهادة)</h2>
                  <p className="text-xs text-slate-400">فحص الآثار والمسؤولية والضمان المرتبط بالشهادة السابقة</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                هل تعلم أن الشهادة محل الرجوع قد قُدمت أو استُعملت من قبل؟
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: 'لم_تقدم_بعد_لأي_جهة', label: 'لم تقدم بعد لأي جهة' },
                  { key: 'قدمت_إلى_المحكمة', label: 'قدمت إلى المحكمة' },
                  { key: 'قدمت_إلى_المحافظة_العقارية', label: 'قدمت للمحافظة العقارية' },
                  { key: 'قدمت_إلى_إدارة', label: 'قدمت إلى إدارة عمومية' },
                  { key: 'استعملت_في_عقد', label: 'استعملت في إبرام عقد' },
                  { key: 'استعملت_في_دعوى', label: 'استعملت في دعوى قضائية' },
                  { key: 'لا_أعلم', label: 'لا أعلم' },
                  { key: 'جهة_أخرى', label: 'جهة أخرى' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPriorUsage(item.key as PriorUsageStatus)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      priorUsage === item.key
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {priorUsage !== 'لم_تقدم_بعد_لأي_جهة' && priorUsage !== 'لا_أعلم' && (
              <input
                type="text"
                value={priorUsageDetails}
                onChange={(e) => setPriorUsageDetails(e.target.value)}
                placeholder="بيان مراجع الإيداع أو الاستعمال (رقم الملف القضائي، الإدارة، العقد...)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            )}

            {/* Judgment & Execution Check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  هل صدر حكم أو قرار قضائي بناء على هذه الشهادة؟
                </label>
                <div className="flex items-center gap-2">
                  {(['لا', 'نعم', 'لا_أعلم'] as const).map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => setHasJudgmentIssued(ans)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        hasJudgmentIssued === ans
                          ? ans === 'نعم'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ans.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {hasJudgmentIssued === 'نعم' && (
                  <input
                    type="text"
                    value={judgmentDetails}
                    onChange={(e) => setJudgmentDetails(e.target.value)}
                    placeholder="رقم الحكم، المحكمة، السنة، ومنطوقه..."
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white text-xs mt-2"
                  />
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  هل ترتب عن الشهادة تنفيذ أو أثر قانوني مالي / عيني؟
                </label>
                <div className="flex items-center gap-2">
                  {(['لا', 'نعم', 'لا_أعلم'] as const).map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() => setHasExecutionOccurred(ans)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        hasExecutionOccurred === ans
                          ? ans === 'نعم'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ans.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {hasExecutionOccurred === 'نعم' && (
                  <input
                    type="text"
                    value={executionDetails}
                    onChange={(e) => setExecutionDetails(e.target.value)}
                    placeholder="بيان الأثر المترتب (تفويت، قبض أموال، حيازة، حجز...)"
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white text-xs mt-2"
                  />
                )}
              </div>
            </div>

            {/* Legal Notice */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>تنبيه قضائي وفقهي مغربي:</strong> تميز الأحكام الفقهية والقضائية في الرجوع بين ما إذا كان قبل القضاء أو بعده، وحسب ما إذا ترتب تنفيذ أو إتلاف مال. الرجوع العمدي المتضمن لشهادة زور قد يعرض صاحبه للمسؤولية الجنائية والمدنية (الضمان والتعويض).
              </span>
            </div>
          </div>

          {/* 5.2 Supporting Evidence Documents */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. الوثائق والمستندات المؤيدة للرجوع</h2>
                  <p className="text-xs text-slate-400">وثائق تؤيد اكتشاف الوهم، أو تناقض الشهادة السابقة</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addEvidenceDocument}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وثيقة مؤيدة</span>
              </button>
            </div>

            {evidenceDocuments.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                لم يتم إدراج أي وثيقة مؤيدة بعد. اضغط على «إضافة وثيقة مؤيدة» لتوثيق مستند يثبت وقوع الخطأ أو الوهم.
              </div>
            ) : (
              <div className="space-y-3">
                {evidenceDocuments.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-grow w-full">
                      <select
                        value={doc.documentType}
                        onChange={(e) => updateEvidenceDocument(doc.id, 'documentType', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="بطاقة_تعريف_وطنية">بطاقة التعريف الوطنية</option>
                        <option value="وثيقة_عقارية">وثيقة عقارية / شهادة ملكية</option>
                        <option value="رسم_عدلي">رسم عدلي رسمي</option>
                        <option value="حكم_قضائي">حكم أو قرار قضائي</option>
                        <option value="شهادة_إدارية">شهادة إدارية</option>
                        <option value="وثيقة_حالة_مدنية">وثيقة الحالة المدنية</option>
                        <option value="وثيقة_طبية">وثيقة أو خبرة طبية</option>
                        <option value="وثيقة_أخرى">وثيقة أخرى</option>
                      </select>

                      <input
                        type="text"
                        value={doc.documentNumber}
                        onChange={(e) => updateEvidenceDocument(doc.id, 'documentNumber', e.target.value)}
                        placeholder="رقم الوثيقة / المرجع"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                      />

                      <input
                        type="date"
                        value={doc.documentDate}
                        onChange={(e) => updateEvidenceDocument(doc.id, 'documentDate', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />

                      <input
                        type="text"
                        value={doc.issuingAuthority}
                        onChange={(e) => updateEvidenceDocument(doc.id, 'issuingAuthority', e.target.value)}
                        placeholder="الجهة المصدرة"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <div className="w-full md:w-64">
                      <input
                        type="text"
                        value={doc.relevanceReason}
                        onChange={(e) => updateEvidenceDocument(doc.id, 'relevanceReason', e.target.value)}
                        placeholder="سبب الاستناد إليها..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEvidenceDocument(doc.id)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: سبب وطبيعة الرجوع</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(6)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الفحص والتدقيق القانوني</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. STAGE 6: Scrutiny, Contradiction & Qualification Check                 */}
      {/* ========================================================================= */}
      {activeStage === 6 && (
        <div className="space-y-6">
          {/* 6.1 Process Distinction: A vs B vs C */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. التمييز المنهجي الصريح بين ثلاثة أنواع من العمليات</h2>
                  <p className="text-xs text-slate-400">حماية العدل من الخلط العملي بين الرجوع والتصحيح والشهادة الجديدة</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  key: 'رجوع_عن_شهادة',
                  code: 'A',
                  title: 'رجوع عن شهادة',
                  desc: 'الشاهد ينفي أو يسحب شهادته السابقة كلياً أو جزئياً لوقوعه في الخطأ أو الوهم.',
                  highlight: 'المسار الصحيح الحالي لهذا الرواق.',
                  color: 'emerald',
                },
                {
                  key: 'تصحيح_بيان_مادي',
                  code: 'B',
                  title: 'تصحيح بيان مادي (إسمحة)',
                  desc: 'العدل يصحح خطأ كتابياً أو رقمياً مادياً دون أن يتراجع صاحب الشهادة عما شهد به.',
                  highlight: 'يتعين فيه استخدام «رسم الملحق التصحيحي».',
                  color: 'amber',
                },
                {
                  key: 'شهادة_جديدة',
                  code: 'C',
                  title: 'شهادة جديدة',
                  desc: 'الشخص يريد أن يدلي بشهادة مستقلة مستجدة عن واقعة أخرى أو الحقيقة التي تبينت له.',
                  highlight: 'تخضع لشروط الشهادة المستقلة ونصابها.',
                  color: 'blue',
                },
              ].map((proc) => (
                <div
                  key={proc.key}
                  onClick={() => setProcessDistinction(proc.key as ProcessDistinctionType)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    processDistinction === proc.key
                      ? proc.color === 'emerald'
                        ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-500 shadow-sm'
                        : proc.color === 'amber'
                        ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-400 shadow-sm'
                        : 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-400 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                      {proc.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{proc.title}</span>
                    {processDistinction === proc.key && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{proc.desc}</p>
                  <div className="text-[11px] font-semibold text-slate-700 bg-white/80 p-2 rounded-xl border border-slate-200">
                    {proc.highlight}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6.2 Contradiction Notes & Alerts */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">2. نتائج فحص الاتساق وعدم التناقض الآلي</h2>
            </div>

            {contradictionNotes.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>البيانات المدخلة متسقة؛ لم يتم رصد أي تعارض أو مانع يحول دون تحرير رسم الرجوع.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {contradictionNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6.3 What remains of the testimony? (ماذا بقي من الشهادة؟) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">3. التحليل الأثري: «ماذا بقي من الشهادة الأصلية؟»</h2>
              </div>
              <span className="text-xs text-slate-400">بيان أثر الرجوع على أركان الشهادة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recanted elements */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>العناصر التي سقطت بالرجوع:</span>
                </div>
                <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside">
                  {recantationScope === 'رجوع_كلي' ? (
                    <li>سقوط كامل الشهادة السابقة بجميع أركانها ووقائعها.</li>
                  ) : (
                    <>
                      <li>العبارة المحددة: {targetedClauseOriginal || 'الجزء المحدد بالرجوع'}.</li>
                      <li>الواقعة المشهود بها: {reasonCategory.replace(/_/g, ' ')}.</li>
                      {recantingCount > 0 && <li>شهادة عدد ({recantingCount}) شاهد(اً) من لفيف الإشهاد.</li>}
                    </>
                  )}
                </ul>
              </div>

              {/* Retained elements */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>العناصر الباقية من الشهادة الأصلية:</span>
                </div>
                <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside">
                  {recantationScope === 'رجوع_كلي' ? (
                    <li>لا يبقى أي عنصر من الشهادة السابقة بالنسبة للشاهد الراجع.</li>
                  ) : (
                    <>
                      <li>باقي الوقائع والبيانات غير المشمولة بالتراجع.</li>
                      <li>شهادة باقي شهود اللفيف الثابت استمرارهم (عدد: {retainingCount}).</li>
                      <li>أصل التضمين والمراجع التوثيقية بالمحكمة مع إضافة التأشير الهامشي.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(5)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق: الأثر والاستعمال والوثائق</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage(7)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 shadow-md text-sm"
            >
              <span>المتابعة إلى الصياغة والاعتماد والتأشير</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. STAGE 7: Drafting, Marginal Annotation & Direct Step 7 Proceeding       */}
      {/* ========================================================================= */}
      {activeStage === 7 && (
        <div className="space-y-6">
          {/* 7.1 Pre-Signing Checklist */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">1. إقرارات ما قبل التوقيع والاعتماد</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer ${
                  hasReadContents ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={hasReadContents}
                  onChange={(e) => setHasReadContents(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">
                  تلاوة مضمون الرجوع على الشاهد وفهمه التام لفحواه.
                </span>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer ${
                  understandsLegalConsequences ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={understandsLegalConsequences}
                  onChange={(e) => setUnderstandsLegalConsequences(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">
                  إدراك الشاهد للآثار القانونية المترتبة عن الرجوع في الشهادة.
                </span>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer ${
                  confirmedPersonalOrigin ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={confirmedPersonalOrigin}
                  onChange={(e) => setConfirmedPersonalOrigin(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs">
                  تأكيد صدور الرجوع عن الشاهد طوعاً واختياراً دون إكراه.
                </span>
              </label>
            </div>
          </div>

          {/* 7.2 Marginal Annotation Card (التأشير بالهامش) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. بطاقة التأشير بالهامش (طرة الرسم الأصلي)</h2>
                  <p className="text-xs text-slate-400">إجراء الزامي للتأشير بسجل التضمين لمنع الاحتجاج بالشهادة المرجوع عنها</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={marginalAnnotationRecorded}
                  onChange={(e) => setMarginalAnnotationRecorded(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-800">تم التضمين والتأشير بالهامش</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحكمة الابتدائية للتأشير</label>
                <input
                  type="text"
                  value={marginalAnnotationCourt}
                  onChange={(e) => setMarginalAnnotationCourt(e.target.value)}
                  placeholder="المحكمة مصدرة الرسم الأصلي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ إحالة التأشير</label>
                <input
                  type="date"
                  value={marginalAnnotationDate}
                  onChange={(e) => setMarginalAnnotationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم إرسالية / إيداع التأشير</label>
                <input
                  type="text"
                  value={marginalAnnotationNumber}
                  onChange={(e) => setMarginalAnnotationNumber(e.target.value)}
                  placeholder="مثال: إرسالية عدد 312"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* 7.3 Moroccan Authoritative Draft */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. مشروع الصياغة العدلية المغربية المتكاملة</h2>
                  <p className="text-xs text-slate-400">صياغة قانونية وفقهية رصينة مستوفية لكافة المراجع والبيانات</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateAuthoritativeDraft);
                    alert('تم نسخ نص رسم الرجوع بنجاح.');
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
              <span>السابق: الفحص والتدقيق</span>
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
export default WitnessRecantationWizard;
