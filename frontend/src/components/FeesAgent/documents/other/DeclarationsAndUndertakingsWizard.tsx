import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Scale,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ArrowRight,
  Sparkles,
  Users,
  Search,
  DollarSign,
  Briefcase,
  GraduationCap,
  Plane,
  CheckSquare,
  Plus,
  Trash2,
  Camera,
  Loader2,
} from 'lucide-react';
import { trpc } from '../../../../trpc';
import { enhanceCardImageForOCR } from '../../../../utils/cinImageEnhancer';
import type { DocumentWizardProps } from '../../types';
import type { Party } from '../../../../types/feesAgentTypes';
import { createEmptyParty, convertGregorianToHijri } from '../../../../utils/feesAgentUtils';
import type {
  DeclarationsAndUndertakingsState,
  DeclarationSuggestedType,
  SubjectMatterCategory,
  LegalEffectType,
  DeclarerCapacity,
  BeneficiaryType,
  ClarityIndexType,
  InstallmentItem,
  DeclarerIdentity,
} from './declarationsAndUndertakingsTypes';

export const DeclarationsAndUndertakingsWizard: React.FC<DocumentWizardProps> = ({
  state,
  setState,
}) => {
  // OCR Mutation
  const parseTextMutation = trpc.ocr.parseText.useMutation();
  const declarerFileInputRef = useRef<HTMLInputElement>(null);
  const beneficiaryFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // 1. Initial State Restoration or Defaults
  // ---------------------------------------------------------------------------
  const savedState = state.declarationsAndUndertakings;

  // Free statement input
  const [statementText, setStatementText] = useState<string>(
    savedState?.statementText || savedState?.rawStatement || ''
  );

  // Suggested / Selected types
  const [suggestedType, setSuggestedType] = useState<DeclarationSuggestedType>(
    savedState?.suggestedType || savedState?.suggestedClassification || 'إقرار'
  );
  const [subjectMatterCategory, setSubjectMatterCategory] = useState<SubjectMatterCategory>(
    savedState?.subjectMatterCategory || savedState?.subjectCategory || 'موضوع_حر'
  );
  const [legalEffect, setLegalEffect] = useState<LegalEffectType>(
    savedState?.legalEffect || 'تصريح_بواقعة'
  );

  // Declarer
  const [declarerName, setDeclarerName] = useState(savedState?.declarer?.name || state.sellers?.[0]?.name || '');
  const [declarerCin, setDeclarerCin] = useState(savedState?.declarer?.cin || state.sellers?.[0]?.idNumber || '');
  const [declarerDob, setDeclarerDob] = useState(savedState?.declarer?.dob || state.sellers?.[0]?.dateOfBirth || '');
  const [declarerProfession, setDeclarerProfession] = useState(savedState?.declarer?.profession || state.sellers?.[0]?.profession || '');
  const [declarerAddress, setDeclarerAddress] = useState(savedState?.declarer?.address || state.sellers?.[0]?.address || '');
  const [declarerPhone, setDeclarerPhone] = useState(savedState?.declarer?.phone || '');
  const [declarerCapacity, setDeclarerCapacity] = useState<DeclarerCapacity>(
    savedState?.declarer?.capacity || 'شاهد_على_نفسه'
  );

  // POA
  const [hasPoa, setHasPoa] = useState(savedState?.poa?.hasPoa || false);
  const [poaNumber, setPoaNumber] = useState(savedState?.poa?.poaNumber || '');
  const [poaDate, setPoaDate] = useState(savedState?.poa?.poaDate || '');
  const [poaCourt, setPoaCourt] = useState(savedState?.poa?.poaCourt || savedState?.poa?.court || '');
  const [poaPrincipalName, setPoaPrincipalName] = useState(savedState?.poa?.principalName || '');
  const [poaScope, setPoaScope] = useState(savedState?.poa?.scope || '');

  // Beneficiary
  const [beneficiaryType, setBeneficiaryType] = useState<BeneficiaryType>(
    savedState?.beneficiaryType || savedState?.beneficiary?.entityType || 'شخص_ذاتي'
  );
  const [beneficiaryName, setBeneficiaryName] = useState(
    savedState?.beneficiary?.name || savedState?.beneficiaries?.[0]?.name || state.buyers?.[0]?.name || ''
  );
  const [beneficiaryCin, setBeneficiaryCin] = useState(
    savedState?.beneficiary?.cin || savedState?.beneficiaries?.[0]?.cin || state.buyers?.[0]?.idNumber || ''
  );
  const [beneficiaryAddress, setBeneficiaryAddress] = useState(
    savedState?.beneficiary?.address || savedState?.beneficiaries?.[0]?.address || state.buyers?.[0]?.address || ''
  );
  const [beneficiaryPhone, setBeneficiaryPhone] = useState(
    savedState?.beneficiary?.phone || savedState?.beneficiaries?.[0]?.phone || ''
  );

  // Moral entity details
  const [beneficiaryIce, setBeneficiaryIce] = useState(
    savedState?.beneficiary?.entityDetails?.ice || savedState?.corporateBeneficiary?.ice || ''
  );
  const [beneficiaryRc, setBeneficiaryRc] = useState(
    savedState?.beneficiary?.entityDetails?.rcNumber || savedState?.corporateBeneficiary?.rc || ''
  );
  const [beneficiaryRepName, setBeneficiaryRepName] = useState(
    savedState?.beneficiary?.entityDetails?.representativeName || savedState?.corporateBeneficiary?.legalRepName || ''
  );
  const [beneficiaryRepTitle, setBeneficiaryRepTitle] = useState(
    savedState?.beneficiary?.entityDetails?.representativeTitle || savedState?.corporateBeneficiary?.legalRepCapacity || 'الممثل القانوني'
  );

  // Minor beneficiary details
  const [isMinorBeneficiary, setIsMinorBeneficiary] = useState(
    savedState?.beneficiary?.individualDetails?.isMinor || savedState?.beneficiaries?.[0]?.isMinor || false
  );
  const [guardianName, setGuardianName] = useState(
    savedState?.beneficiary?.individualDetails?.guardianName || savedState?.beneficiaries?.[0]?.guardianName || ''
  );
  const [guardianCin, setGuardianCin] = useState(
    savedState?.beneficiary?.individualDetails?.guardianCin || savedState?.beneficiaries?.[0]?.guardianCin || ''
  );
  const [guardianRelation, setGuardianRelation] = useState(
    savedState?.beneficiary?.individualDetails?.guardianRelation || savedState?.beneficiaries?.[0]?.guardianRelation || 'ولي شرعي'
  );

  // Financial Sub-Engine
  const [isFinancial, setIsFinancial] = useState(
    savedState?.financial?.isFinancial || false
  );
  const [financeAmount, setFinanceAmount] = useState<number>(
    savedState?.financial?.amount || 0
  );
  const [financeAmountInWords, setFinanceAmountInWords] = useState<string>(
    savedState?.financial?.amountInWords || ''
  );
  const [financeSource, setFinanceSource] = useState(
    savedState?.financial?.moneySource || 'دين'
  );
  const [financeMaturity, setFinanceMaturity] = useState<'حال' | 'مؤجل' | 'أقساط'>(
    savedState?.financial?.maturity || 'حال'
  );
  const [financeDueDate, setFinanceDueDate] = useState<string>(
    savedState?.financial?.dueDate || ''
  );
  const [installments, setInstallments] = useState<InstallmentItem[]>(
    savedState?.financial?.installments || []
  );

  // Schooling Support Sub-Engine
  const [studentName, setStudentName] = useState(
    savedState?.schoolingSupport?.studentName || savedState?.schoolingSupport?.childName || ''
  );
  const [institutionName, setInstitutionName] = useState(
    savedState?.schoolingSupport?.institutionName || savedState?.schoolingSupport?.schoolName || ''
  );
  const [academicLevel, setAcademicLevel] = useState(
    savedState?.schoolingSupport?.academicLevel || savedState?.schoolingSupport?.gradeLevel || ''
  );
  const [schoolingCity, setSchoolingCity] = useState(
    savedState?.schoolingSupport?.city || ''
  );
  const [schoolingAmount, setSchoolingAmount] = useState<number>(
    savedState?.schoolingSupport?.monthlyOrAnnualAmount || 0
  );
  const [schoolingFrequency, setSchoolingFrequency] = useState<'شهري' | 'سنوي' | 'مفتوح'>(
    savedState?.schoolingSupport?.frequency || 'شهري'
  );

  // Custody Travel Consent Sub-Engine (المادة 179)
  const [childName, setChildName] = useState(
    savedState?.custodyTravelConsent?.childName || ''
  );
  const [childDob, setChildDob] = useState(
    savedState?.custodyTravelConsent?.childDob || ''
  );
  const [childPassport, setChildPassport] = useState(
    savedState?.custodyTravelConsent?.childPassportNumber || ''
  );
  const [custodianName, setCustodianName] = useState(
    savedState?.custodyTravelConsent?.custodianName || ''
  );
  const [custodianCin, setCustodianCin] = useState(
    savedState?.custodyTravelConsent?.custodianCin || ''
  );
  const [destinationCountry, setDestinationCountry] = useState(
    savedState?.custodyTravelConsent?.destinationCountry || ''
  );
  const [travelPurpose, setTravelPurpose] = useState(
    savedState?.custodyTravelConsent?.travelPurpose || 'سياحة وزيارة عائلية'
  );
  const [travelDuration, setTravelDuration] = useState(
    savedState?.custodyTravelConsent?.travelDuration || 'شهر واحد'
  );
  const [travelBanChecked, setTravelBanChecked] = useState(
    savedState?.custodyTravelConsent?.travelBanChecked ?? true
  );

  // Fact / Receipt Sub-Engine
  const [factSubject, setFactSubject] = useState(
    savedState?.factAcknowledgment?.factSubject || savedState?.factAcknowledgment?.description || ''
  );
  const [factDate, setFactDate] = useState(
    savedState?.factAcknowledgment?.factDate || ''
  );
  const [factLocation, setFactLocation] = useState(
    savedState?.factAcknowledgment?.factLocation || savedState?.factAcknowledgment?.factPlace || ''
  );
  const [receiptItemDesc, setReceiptItemDesc] = useState(
    savedState?.receiptAcknowledgment?.itemDescription || savedState?.receiptAcknowledgment?.descriptionOrAmount || ''
  );
  const [receiptFullDischarge, setReceiptFullDischarge] = useState(
    savedState?.receiptAcknowledgment?.fullDischarge ?? true
  );

  // OCR state
  const [scanningDeclarer, setScanningDeclarer] = useState(false);
  const [scanningBeneficiary, setScanningBeneficiary] = useState(false);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);

  // Active Wizard Tab / Section
  const [activeSection, setActiveSection] = useState<
    'statement' | 'declarer' | 'beneficiary' | 'specialized' | 'preview'
  >('statement');

  // Copy notice
  const [copiedDraft, setCopiedDraft] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. OCR Scanners
  // ---------------------------------------------------------------------------
  const handleScanDeclarerCard = async (file: File) => {
    setScanningDeclarer(true);
    setOcrSuccessNotice(null);
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
      const res: any = await parseTextMutation.mutateAsync({
        base64: b64,
      });
      const fields = res?.detectedFields || {};
      const cin = fields.cin || (res?.text ? res.text.match(/[A-Z]{1,2}\d{5,7}/)?.[0] : undefined);
      if (cin) setDeclarerCin(String(cin).toUpperCase().trim());
      if (fields.name) setDeclarerName(String(fields.name).trim());
      if (fields.dob) setDeclarerDob(String(fields.dob));
      if (fields.address) setDeclarerAddress(String(fields.address).trim());
      setOcrSuccessNotice('✓ تم استخراج بيانات المصرح/الملتزم من البطاقة الوطنية بنجاح');
    } catch (e: any) {
      console.error('OCR Error:', e);
      setOcrSuccessNotice('⚠️ تعذر استخراج البيانات آلياً، يرجى ملء الحقول يدوياً');
    } finally {
      setScanningDeclarer(false);
    }
  };

  const handleScanBeneficiaryCard = async (file: File) => {
    setScanningBeneficiary(true);
    setOcrSuccessNotice(null);
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
      const res: any = await parseTextMutation.mutateAsync({
        base64: b64,
      });
      const fields = res?.detectedFields || {};
      const cin = fields.cin || (res?.text ? res.text.match(/[A-Z]{1,2}\d{5,7}/)?.[0] : undefined);
      if (cin) setBeneficiaryCin(String(cin).toUpperCase().trim());
      if (fields.name) setBeneficiaryName(String(fields.name).trim());
      if (fields.address) setBeneficiaryAddress(String(fields.address).trim());
      setOcrSuccessNotice('✓ تم استخراج بيانات المستفيد من البطاقة الوطنية بنجاح');
    } catch (e: any) {
      console.error('OCR Error:', e);
      setOcrSuccessNotice('⚠️ تعذر استخراج البيانات آلياً، يرجى ملء الحقول يدوياً');
    } finally {
      setScanningBeneficiary(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Smart Statement Analyzer & Qualification Engine
  // ---------------------------------------------------------------------------
  const analyzeStatement = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;

    const lower = t.toLowerCase();

    // Check for travel consent
    if (lower.includes('سفر') || lower.includes('محضون') || lower.includes('ابني') || lower.includes('جواز') || lower.includes('ابنتي')) {
      setSuggestedType('موافقة_أو_إذن');
      setSubjectMatterCategory('طفل_محضون');
      setLegalEffect('موافقة_أو_إذن');
      setDeclarerCapacity('موافق');
      return;
    }

    // Check for schooling support
    if (lower.includes('تمدرس') || lower.includes('دراسة') || lower.includes('جامعة') || lower.includes('مدرسة') || lower.includes('تكفل بمصاريف')) {
      setSuggestedType('تكفل');
      setSubjectMatterCategory('دراسة_تمدرس');
      setLegalEffect('إنشاء_التزام_جديد');
      setDeclarerCapacity('كافل');
      return;
    }

    // Check for financial debt / payment undertaking
    if (lower.includes('دين') || lower.includes('ذمتي') || lower.includes('مبلغ') || lower.includes('درهم') || lower.includes('أقساط') || lower.includes('أؤدي')) {
      setSuggestedType('إقرار_بدين');
      setSubjectMatterCategory('دين');
      setLegalEffect('إقرار_بحق_موجود');
      setDeclarerCapacity('مقر');
      setIsFinancial(true);
      return;
    }

    // Check for discharge / receipt
    if (lower.includes('تسلمت') || lower.includes('قبضت') || lower.includes('إبراء') || lower.includes('مخالصة') || lower.includes('توصلت')) {
      setSuggestedType('إبراء_أو_مخالصة');
      setSubjectMatterCategory('تسليم_استلام');
      setLegalEffect('إبراء_إسقاط_حق');
      setDeclarerCapacity('مقر');
      return;
    }

    // Check for work undertaking
    if (lower.includes('ألتزم') || lower.includes('أتعهد') || lower.includes('إنجاز') || lower.includes('بناء') || lower.includes('تسليم في أجل')) {
      setSuggestedType('تعهد');
      setSubjectMatterCategory('عمل_إنجاز');
      setLegalEffect('إنشاء_التزام_جديد');
      setDeclarerCapacity('متعهد');
      return;
    }

    // Default: general declaration
    if (lower.includes('أشهد') || lower.includes('أصرح')) {
      setSuggestedType('تصريح');
      setSubjectMatterCategory('واقعة_شخصية');
      setLegalEffect('تصريح_بواقعة');
      setDeclarerCapacity('شاهد_على_نفسه');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 4. Diverter Warnings (فحص التحايل على المساطر الشكلية العقارية والأسرية)
  // ---------------------------------------------------------------------------
  const diverterAlert = useMemo(() => {
    const t = statementText.toLowerCase();
    if (t.includes('أبيع عقاري') || t.includes('بيع دار') || t.includes('بيع شقة') || t.includes('بيع بقعة') || t.includes('اشتريت عقار')) {
      return {
        isDiverted: true,
        targetDoc: 'بيع_وشراء',
        title: 'تنبيه نظامي: تفويت عقاري يخضع للرسم الشكلي الإلزامي',
        message: 'بيع العقارات أو شرائها يخضع وجوباً لمقتضيات المادة 4 من مدونة الحقوق العينية (قانون 39.08) التي توجب تحرير عقد رسمي من طرف عدل أو موثق، ولا يعتد به كإشهاد أو تصريح بسيط.',
      };
    }
    if (t.includes('أهب داري') || t.includes('هبة عقار') || t.includes('وهبت')) {
      return {
        isDiverted: true,
        targetDoc: 'هبة',
        title: 'تنبيه نظامي: عقد الهبة يستوجب رسماً مستقلاً',
        message: 'الهبة تبرع ناقل للملكية يستلزم شكليات خاصة وفق المادة 274 وما بعدها من مدونة الحقوق العينية بما فيها الحيازة والإخلاء أو التقييد، ولا تفرغ في إشهاد عام.',
      };
    }
    if (t.includes('أطلق زوجتي') || t.includes('أوقع الطلاق')) {
      return {
        isDiverted: true,
        targetDoc: 'طلاق_اتفاقي',
        title: 'تنبيه نظامي: مسطرة الطلاق مقيدة بإذن قضائي',
        message: 'الطلاق يخضع لأحكام مدونة الأسرة (المواد 78 إلى 137) وتستلزم إذناً مسبقاً بالإشهاد على الطلاق من المحكمة المختصة، ولا يوثق كإشهاد تلقائي.',
      };
    }
    return null;
  }, [statementText]);

  // ---------------------------------------------------------------------------
  // 5. Contradiction Engine & Clarity Index (مؤشر الوضوح وفحص التنافي)
  // ---------------------------------------------------------------------------
  const { contradictionAlerts, clarityIndex } = useMemo<{
    contradictionAlerts: string[];
    clarityIndex: ClarityIndexType;
  }>(() => {
    const alerts: string[] = [];

    // Check statement text
    if (!statementText.trim()) {
      alerts.push('لم يتم إدخال موضوع الإشهاد بعبارة واضحة.');
    }

    // Check declarer identity
    if (!declarerName.trim()) {
      alerts.push('اسم المصرح أو الملتزم إلزامي.');
    }
    if (!declarerCin.trim()) {
      alerts.push('رقم البطاقة الوطنية للتعريف للمصرح إلزامي.');
    }

    // Financial consistency
    if (isFinancial) {
      if (!financeAmount || financeAmount <= 0) {
        alerts.push('تم تحديد التزام مالي دون تبيان المبلغ بالأرقام.');
      }
      if (financeMaturity === 'أقساط' && installments.length === 0) {
        alerts.push('تم اختيار الأداء على أقساط دون تحديد جدول الأقساط.');
      }
      if (financeMaturity === 'أقساط' && installments.length > 0) {
        const sumInstallments = installments.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
        if (Math.abs(sumInstallments - financeAmount) > 0.01) {
          alerts.push(`مجموع مبالغ الأقساط (${sumInstallments} د.م) لا يطابق المبلغ الإجمالي للدين (${financeAmount} د.م).`);
        }
      }
    }

    // Custody travel consent
    if (suggestedType === 'موافقة_أو_إذن' && subjectMatterCategory === 'طفل_محضون') {
      if (!childName.trim()) {
        alerts.push('اسم المحضون المرخص له بالسفر إلزامي وفق المادة 179 من مدونة الأسرة.');
      }
      if (!destinationCountry.trim()) {
        alerts.push('وجهة السفر خارج أرض الوطن إلزامية.');
      }
      if (!travelBanChecked) {
        alerts.push('يجب التحقق من عدم وجود مقرر قضائي يمنع المحضون من مغادرة التراب الوطني.');
      }
    }

    // Minor beneficiary check
    if (beneficiaryType === 'شخص_ذاتي' && isMinorBeneficiary && !guardianName.trim()) {
      alerts.push('المستفيد قاصر؛ يجب تدوين اسم الولي أو النائب الشرعي.');
    }

    // Moral entity check
    if (beneficiaryType === 'شركة' || beneficiaryType === 'مؤسسة') {
      if (!beneficiaryName.trim()) {
        alerts.push('الاسم الاجتماعي للمؤسسة/الشركة المستفيدة إلزامي.');
      }
    }

    let clarity: ClarityIndexType = 'واضح';
    if (alerts.length > 0) {
      if (alerts.some((a) => a.includes('لا يطابق') || a.includes('تحايل') || a.includes('مقرر قضائي'))) {
        clarity = 'يتضمن_تعارض';
      } else {
        clarity = 'يحتاج_استكمال';
      }
    }

    return { contradictionAlerts: alerts, clarityIndex: clarity };
  }, [
    statementText,
    declarerName,
    declarerCin,
    isFinancial,
    financeAmount,
    financeMaturity,
    installments,
    suggestedType,
    subjectMatterCategory,
    childName,
    destinationCountry,
    travelBanChecked,
    beneficiaryType,
    isMinorBeneficiary,
    guardianName,
    beneficiaryName,
  ]);

  // ---------------------------------------------------------------------------
  // 6. Authentic Adoul Legal Draft Generation
  // ---------------------------------------------------------------------------
  const generatedDraft = useMemo(() => {
    const todayGregorian = new Date().toISOString().split('T')[0];
    const todayHijri = convertGregorianToHijri(todayGregorian);
    const courtName = state.meta?.court || 'تطوان';
    const notary1 = state.meta?.notaryPrimary || state.preReceptionVerification?.notary1Name || 'العدل الأول';
    const notary2 = state.meta?.notarySecondary || state.preReceptionVerification?.notary2Name || 'العدل الثاني';

    let draft = `الحمد لله وحده، وصلى الله وسلم على سيدنا محمد وآله وصحبه.\n\n`;
    draft += `بتاريخ: ${todayHijri} هجرية موافق ${todayGregorian} ميلادية.\n`;
    draft += `بمكتب التوثيق العدلي الكائن بدائرة محكمة الاستئناف بـ${courtName}، المحكمة الابتدائية بـ${courtName}.\n`;
    draft += `لدى العدلين المنتصبين للإشهاد الموقعين أسفله:\n`;
    draft += `الأستاذ: ${notary1} والأستاذ: ${notary2}.\n\n`;

    draft += `حضر في مجلس العقد وطوعه واختياره بكامل قواه العقلية وأهليته المعتبرة قانوناً:\n`;
    draft += `السيد(ة): ${declarerName || '...........................................'}\n`;
    draft += `الحامل(ة) للبطاقة الوطنية للتعريف رقم: ${declarerCin || '.....................'}\n`;
    if (declarerProfession) draft += `المهنة: ${declarerProfession} · `;
    if (declarerAddress) draft += `الساكن(ة) بـ: ${declarerAddress}\n`;
    if (declarerDob) draft += `تاريخ الازدياد: ${declarerDob}\n`;

    if (hasPoa) {
      draft += `والمتصرف(ة) بموجب وكالة خاصة عدد ${poaNumber || '.....'} مؤرخة في ${poaDate || '.....'} عن الموكل(ة): ${poaPrincipalName || '.....'}.\n`;
    }

    draft += `\nوبصفته(ا): ${declarerCapacity.replace(/_/g, ' ')} الشاهد(ة) على نفسه(ا).\n`;
    draft += `أشهد(ت) على نفسه(ا) وصرح(ت) وأقر(ت) والتزم(ت) بما يلي:\n\n`;

    // Core content
    if (statementText.trim()) {
      draft += `« ${statementText.trim()} »\n\n`;
    }

    // Specialized details
    if (isFinancial && financeAmount > 0) {
      draft += `المقتضى المالي والأداء:\n`;
      draft += `يقر الملتزم بأن بذمته مبلغاً قدره: ${Number(financeAmount).toLocaleString('ar-MA')} درهم مغربي (${financeAmountInWords || 'فقط لا غير'}).\n`;
      draft += `منشأ المبلغ: ${financeSource.replace(/_/g, ' ')}.\n`;
      if (financeMaturity === 'حال') {
        draft += `حالة الأداء: حالّ في الذمة ومستحق الأداء فوراً.\n`;
      } else if (financeMaturity === 'مؤجل') {
        draft += `حالة الأداء: مؤجل إلى غاية تاريخ: ${financeDueDate || 'المتفق عليه'}.\n`;
      } else if (financeMaturity === 'أقساط' && installments.length > 0) {
        draft += `وقد اتفق الطرفان على تأدية هذا المبلغ على أقساط مجدولة كالتالي:\n`;
        installments.forEach((it, idx) => {
          draft += `- القسط ${idx + 1}: مبلغ ${Number(it.amount).toLocaleString('ar-MA')} د.م يستحق بتاريخ ${it.dueDate || '.....'}.\n`;
        });
      }
      draft += `\n`;
    }

    if (suggestedType === 'تكفل' && subjectMatterCategory === 'دراسة_تمدرس') {
      draft += `مقتضيات التكفل بالدراسة والتمدرس:\n`;
      draft += `يلتزم المصرح شخصياً ومباشرة بالتكفل الكامل بمصاريف تمدرس الطالب(ة): ${studentName || '.................'}\n`;
      if (institutionName) draft += `المسجل(ة) بمؤسسة: ${institutionName} (${schoolingCity || 'المغرب'})\n`;
      if (academicLevel) draft += `المستوى الدراسي: ${academicLevel}\n`;
      if (schoolingAmount > 0) {
        draft += `بمبلغ شهري/سنوي قدره: ${Number(schoolingAmount).toLocaleString('ar-MA')} درهم مغربي، التزاماً مباشراً لا رجوع فيه طيلة المدة المقررة.\n`;
      }
      draft += `\n`;
    }

    if (suggestedType === 'موافقة_أو_إذن' && subjectMatterCategory === 'طفل_محضون') {
      draft += `مقتضيات الإذن بالسفر بالمحضون (المادة 179 من مدونة الأسرة):\n`;
      draft += `يوافق المصرح بصفته ولياً/أباً/أماً موافقة تامة وصريحة لا رجوع فيها على سفر ابنه(ا) المحضون(ة):\n`;
      draft += `الطفل(ة): ${childName || '.................'} (تاريخ الازدياد: ${childDob || '.....'}، جواز سفر رقم: ${childPassport || '.....'})\n`;
      draft += `برفقة الحاضن(ة): ${custodianName || '.................'} (ب.ت.و: ${custodianCin || '.....'})\n`;
      draft += `قاصداً دولة: ${destinationCountry || '.................'} لغاية: ${travelPurpose || 'السياحة والزيارة'} لمدة: ${travelDuration || 'المحددة'}.\n`;
      draft += `ويشهد العدلان أنه لم يثبت لديهما وجود أي مانع قضائي يحول دون سفر المحضون طبقاً للمادة 179 من مدونة الأسرة.\n\n`;
    }

    if (beneficiaryName.trim()) {
      draft += `المستفيد / المشهود لفائدته:\n`;
      if (beneficiaryType === 'شركة' || beneficiaryType === 'مؤسسة') {
        draft += `لفائدة: شركة/مؤسسة ${beneficiaryName} (المعرف الموحد ICE: ${beneficiaryIce || '.....'}، السجل التجاري: ${beneficiaryRc || '.....'}).\n`;
        if (beneficiaryRepName) draft += `في شخص ممثلها القانوني: ${beneficiaryRepName} بصفته: ${beneficiaryRepTitle}.\n`;
      } else {
        draft += `لفائدة السيد(ة): ${beneficiaryName} (ب.ت.و: ${beneficiaryCin || '.....'}).\n`;
        if (isMinorBeneficiary) {
          draft += `القاصر تحت ولاية/نيابة: ${guardianName || '.....'} (ب.ت.و: ${guardianCin || '.....'}، الصفة: ${guardianRelation}).\n`;
        }
      }
      draft += `\n`;
    }

    draft += `وبما ذكر كله تلي على المصرح فصادق عليه والتزم بآثاره الشرعية والقانونية، وأشهد على نفسه بذلك وهو في كامل أهليته المعتبرة.\n`;
    draft += `وقد قيد هذا الرسم بدفتر الإشهادات والتصريحات طبقاً لمقتضيات القانون رقم 16.03 المتعلق بخطة العدالة.\n`;
    draft += `توقيع المصرح: .......................................\n`;
    draft += `توقيع العدلين: الأستاذ ${notary1}  ·  الأستاذ ${notary2}\n`;

    return draft;
  }, [
    state.meta,
    state.preReceptionVerification,
    declarerName,
    declarerCin,
    declarerProfession,
    declarerAddress,
    declarerDob,
    hasPoa,
    poaNumber,
    poaDate,
    poaPrincipalName,
    declarerCapacity,
    statementText,
    isFinancial,
    financeAmount,
    financeAmountInWords,
    financeSource,
    financeMaturity,
    financeDueDate,
    installments,
    suggestedType,
    subjectMatterCategory,
    studentName,
    institutionName,
    schoolingCity,
    academicLevel,
    schoolingAmount,
    childName,
    childDob,
    childPassport,
    custodianName,
    custodianCin,
    destinationCountry,
    travelPurpose,
    travelDuration,
    beneficiaryName,
    beneficiaryCin,
    beneficiaryType,
    beneficiaryIce,
    beneficiaryRc,
    beneficiaryRepName,
    beneficiaryRepTitle,
    isMinorBeneficiary,
    guardianName,
    guardianCin,
    guardianRelation,
  ]);

  // ---------------------------------------------------------------------------
  // 7. Step 7 Linker (الانتقال المباشر والقطعي إلى الخطوة 7 للإحالة للقاضي)
  // ---------------------------------------------------------------------------
  const handleProceedToStep7 = useCallback(() => {
    const declarerData: DeclarerIdentity = {
      name: declarerName,
      cin: declarerCin,
      dob: declarerDob,
      profession: declarerProfession,
      address: declarerAddress,
      phone: declarerPhone,
      capacity: declarerCapacity,
      nationality: 'مغربي',
      legalCompetence: 'كامل_الأهلية',
    };

    // 1. Pack full state
    const declarationState: DeclarationsAndUndertakingsState = {
      rawStatement: statementText,
      statementText,
      suggestedClassification: suggestedType,
      suggestedType,
      officialClassification: suggestedType,
      subjectCategory: subjectMatterCategory,
      subjectMatterCategory,
      customSubjectTitle: subjectMatterCategory.replace(/_/g, ' '),
      legalEffect,
      declarer: declarerData,
      poa: {
        hasPoa,
        poaNumber,
        poaDate,
        court: poaCourt,
        poaCourt,
        principalName: poaPrincipalName,
        scope: poaScope,
      },
      beneficiaryType,
      beneficiary: {
        entityType: beneficiaryType,
        name: beneficiaryName,
        cin: beneficiaryCin,
        phone: beneficiaryPhone,
        address: beneficiaryAddress,
        entityDetails: {
          ice: beneficiaryIce,
          rcNumber: beneficiaryRc,
          representativeName: beneficiaryRepName,
          representativeTitle: beneficiaryRepTitle,
        },
        individualDetails: {
          isMinor: isMinorBeneficiary,
          guardianName,
          guardianCin,
          guardianRelation,
        },
      },
      beneficiaries: [
        {
          name: beneficiaryName,
          cin: beneficiaryCin,
          address: beneficiaryAddress,
          phone: beneficiaryPhone,
          isMinor: isMinorBeneficiary,
          guardianName,
          guardianCin,
          guardianRelation,
          nationality: 'مغربي',
        },
      ],
      financial: {
        isFinancial,
        amount: financeAmount,
        amountInWords: financeAmountInWords,
        currency: 'درهم مغربي',
        moneySource: financeSource as any,
        natureOfDebt: 'التزام_بالأداء',
        dueDate: financeDueDate,
        hasGracePeriod: false,
        maturity: financeMaturity,
        paymentMethod: 'نقدا',
        installments,
      },
      schoolingSupport: {
        studentName,
        childName: studentName,
        institutionName,
        schoolName: institutionName,
        academicLevel,
        gradeLevel: academicLevel,
        city: schoolingCity,
        monthlyOrAnnualAmount: schoolingAmount,
        frequency: schoolingFrequency,
      },
      custodyTravelConsent: {
        childName,
        childDob,
        childPassportNumber: childPassport,
        custodianName,
        custodianCin,
        destinationCountry,
        travelPurpose,
        travelDuration,
        travelBanChecked,
      },
      factAcknowledgment: {
        factSubject,
        description: factSubject,
        factDate,
        factLocation,
      },
      receiptAcknowledgment: {
        itemDescription: receiptItemDesc,
        descriptionOrAmount: receiptItemDesc,
        fullDischarge: receiptFullDischarge,
        isDischargeGranted: receiptFullDischarge,
      },
      priorDeed: { hasPriorDeed: false },
      detectedContradictions: contradictionAlerts,
      contradictionAlerts,
      checklist: {},
      clarityIndex,
      draftText: generatedDraft,
    };

    // 2. Map parties to state.sellers and state.buyers
    const declarerParty: Party = {
      ...createEmptyParty(),
      name: declarerName || 'المصرح/الملتزم',
      idNumber: declarerCin,
      profession: declarerProfession,
      address: declarerAddress,
      dateOfBirth: declarerDob,
      nationality: 'مغربي',
      share: declarerCapacity.replace(/_/g, ' '),
      idImage: null,
    };

    const beneficiaryParty: Party = {
      ...createEmptyParty(),
      name: beneficiaryName || 'المستفيد/المشهود له',
      idNumber: beneficiaryCin || beneficiaryIce || '',
      address: beneficiaryAddress,
      nationality: 'مغربي',
      share: beneficiaryType.replace(/_/g, ' '),
      idImage: null,
    };

    // 3. Atomically update parent FeesAgentState
    setState((prev) => ({
      ...prev,
      step: 7, // الانتقال المباشر والقطعي للخطوة 7
      documentType: 'اشهادات_والتزامات',
      draft: generatedDraft,
      draftText: generatedDraft,
      sellers: [declarerParty],
      buyers: [beneficiaryParty],
      declarationsAndUndertakings: declarationState,
    }));

    // 4. Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    statementText,
    suggestedType,
    subjectMatterCategory,
    legalEffect,
    declarerName,
    declarerCin,
    declarerDob,
    declarerProfession,
    declarerAddress,
    declarerPhone,
    declarerCapacity,
    hasPoa,
    poaNumber,
    poaDate,
    poaCourt,
    poaPrincipalName,
    poaScope,
    beneficiaryType,
    beneficiaryName,
    beneficiaryCin,
    beneficiaryPhone,
    beneficiaryAddress,
    beneficiaryIce,
    beneficiaryRc,
    beneficiaryRepName,
    beneficiaryRepTitle,
    isMinorBeneficiary,
    guardianName,
    guardianCin,
    guardianRelation,
    isFinancial,
    financeAmount,
    financeAmountInWords,
    financeSource,
    financeDueDate,
    financeMaturity,
    installments,
    studentName,
    institutionName,
    academicLevel,
    schoolingCity,
    schoolingAmount,
    schoolingFrequency,
    childName,
    childDob,
    childPassport,
    custodianName,
    custodianCin,
    destinationCountry,
    travelPurpose,
    travelDuration,
    travelBanChecked,
    factSubject,
    factDate,
    factLocation,
    receiptItemDesc,
    receiptFullDischarge,
    generatedDraft,
    clarityIndex,
    contradictionAlerts,
    setState,
  ]);

  // Keep state.declarationsAndUndertakings synchronized in background
  useEffect(() => {
    const declarerData: DeclarerIdentity = {
      name: declarerName,
      cin: declarerCin,
      dob: declarerDob,
      profession: declarerProfession,
      address: declarerAddress,
      phone: declarerPhone,
      capacity: declarerCapacity,
      nationality: 'مغربي',
      legalCompetence: 'كامل_الأهلية',
    };

    setState((prev) => ({
      ...prev,
      declarationsAndUndertakings: {
        rawStatement: statementText,
        statementText,
        suggestedClassification: suggestedType,
        suggestedType,
        officialClassification: suggestedType,
        subjectCategory: subjectMatterCategory,
        subjectMatterCategory,
        customSubjectTitle: subjectMatterCategory.replace(/_/g, ' '),
        legalEffect,
        declarer: declarerData,
        poa: {
          hasPoa,
          poaNumber,
          poaDate,
          court: poaCourt,
          poaCourt,
          principalName: poaPrincipalName,
          scope: poaScope,
        },
        beneficiaryType,
        beneficiary: {
          entityType: beneficiaryType,
          name: beneficiaryName,
          cin: beneficiaryCin,
          phone: beneficiaryPhone,
          address: beneficiaryAddress,
          entityDetails: {
            ice: beneficiaryIce,
            rcNumber: beneficiaryRc,
            representativeName: beneficiaryRepName,
            representativeTitle: beneficiaryRepTitle,
          },
          individualDetails: {
            isMinor: isMinorBeneficiary,
            guardianName,
            guardianCin,
            guardianRelation,
          },
        },
        beneficiaries: [
          {
            name: beneficiaryName,
            cin: beneficiaryCin,
            address: beneficiaryAddress,
            phone: beneficiaryPhone,
            isMinor: isMinorBeneficiary,
            guardianName,
            guardianCin,
            guardianRelation,
            nationality: 'مغربي',
          },
        ],
        financial: {
          isFinancial,
          amount: financeAmount,
          amountInWords: financeAmountInWords,
          currency: 'درهم مغربي',
          moneySource: financeSource as any,
          natureOfDebt: 'التزام_بالأداء',
          dueDate: financeDueDate,
          hasGracePeriod: false,
          maturity: financeMaturity,
          paymentMethod: 'نقدا',
          installments,
        },
        schoolingSupport: {
          studentName,
          childName: studentName,
          institutionName,
          schoolName: institutionName,
          academicLevel,
          gradeLevel: academicLevel,
          city: schoolingCity,
          monthlyOrAnnualAmount: schoolingAmount,
          frequency: schoolingFrequency,
        },
        custodyTravelConsent: {
          childName,
          childDob,
          childPassportNumber: childPassport,
          custodianName,
          custodianCin,
          destinationCountry,
          travelPurpose,
          travelDuration,
          travelBanChecked,
        },
        factAcknowledgment: {
          factSubject,
          description: factSubject,
          factDate,
          factLocation,
        },
        receiptAcknowledgment: {
          itemDescription: receiptItemDesc,
          descriptionOrAmount: receiptItemDesc,
          fullDischarge: receiptFullDischarge,
          isDischargeGranted: receiptFullDischarge,
        },
        priorDeed: { hasPriorDeed: false },
        detectedContradictions: contradictionAlerts,
        contradictionAlerts,
        checklist: {},
        clarityIndex,
        draftText: generatedDraft,
      },
    }));
  }, [
    statementText,
    suggestedType,
    subjectMatterCategory,
    legalEffect,
    declarerName,
    declarerCin,
    declarerDob,
    declarerProfession,
    declarerAddress,
    declarerPhone,
    declarerCapacity,
    hasPoa,
    poaNumber,
    poaDate,
    poaCourt,
    poaPrincipalName,
    poaScope,
    beneficiaryType,
    beneficiaryName,
    beneficiaryCin,
    beneficiaryPhone,
    beneficiaryAddress,
    beneficiaryIce,
    beneficiaryRc,
    beneficiaryRepName,
    beneficiaryRepTitle,
    isMinorBeneficiary,
    guardianName,
    guardianCin,
    guardianRelation,
    isFinancial,
    financeAmount,
    financeAmountInWords,
    financeSource,
    financeDueDate,
    financeMaturity,
    installments,
    studentName,
    institutionName,
    academicLevel,
    schoolingCity,
    schoolingAmount,
    schoolingFrequency,
    childName,
    childDob,
    childPassport,
    custodianName,
    custodianCin,
    destinationCountry,
    travelPurpose,
    travelDuration,
    travelBanChecked,
    factSubject,
    factDate,
    factLocation,
    receiptItemDesc,
    receiptFullDischarge,
    generatedDraft,
    clarityIndex,
    contradictionAlerts,
    setState,
  ]);

  // ---------------------------------------------------------------------------
  // 8. Installment Helpers
  // ---------------------------------------------------------------------------
  const addInstallment = () => {
    setInstallments((prev) => [
      ...prev,
      {
        installmentNumber: prev.length + 1,
        amount: 0,
        dueDate: '',
        status: 'معلق',
      },
    ]);
  };

  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateInstallment = (index: number, field: keyof InstallmentItem, value: any) => {
    setInstallments((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  // ---------------------------------------------------------------------------
  // 9. Quick Templates
  // ---------------------------------------------------------------------------
  const applyQuickTemplate = (type: 'school' | 'debt' | 'travel' | 'receipt' | 'work') => {
    if (type === 'school') {
      setStatementText('أشهد على نفسي وألتزم التزاماً تاماً ومباشراً بأن أتحمل وأؤدي جميع مصاريف تمدرس ودراسة الطالب(ة) بمؤسسة التعليم المذكورة أسفله طيلة مدة دراسته.');
      setSuggestedType('تكفل');
      setSubjectMatterCategory('دراسة_تمدرس');
      setLegalEffect('إنشاء_التزام_جديد');
      setDeclarerCapacity('كافل');
      setActiveSection('specialized');
    } else if (type === 'debt') {
      setStatementText('أقر وأعترف بصحة الدين المترتب بذمتي لفائدة المشهود له، وألتزم بأدائه كاملاً دون أي منازعة وفق الأجل والجدولة المتفق عليها.');
      setSuggestedType('إقرار_بدين');
      setSubjectMatterCategory('دين');
      setLegalEffect('إقرار_بحق_موجود');
      setDeclarerCapacity('مقر');
      setIsFinancial(true);
      setActiveSection('specialized');
    } else if (type === 'travel') {
      setStatementText('أوافق وأشهد على نفسي بموافقتي الصريحة والتامة على سفر ابني المحضون إلى الخارج برفقة والدته/حاضنته، طبقاً للمادة 179 من مدونة الأسرة.');
      setSuggestedType('موافقة_أو_إذن');
      setSubjectMatterCategory('طفل_محضون');
      setLegalEffect('موافقة_أو_إذن');
      setDeclarerCapacity('موافق');
      setActiveSection('specialized');
    } else if (type === 'receipt') {
      setStatementText('أصرح وأشهد بأنني توصلت وتسلمت كافة مستحقاتي ومبالغي، وأبرئ ذمة المشهود له إبراءً تاماً وشاملاً ومسقطاً لأي دعوى أو مطالبة.');
      setSuggestedType('إبراء_أو_مخالصة');
      setSubjectMatterCategory('تسليم_استلام');
      setLegalEffect('إبراء_إسقاط_حق');
      setDeclarerCapacity('مقر');
      setActiveSection('specialized');
    } else if (type === 'work') {
      setStatementText('أتعهد وألتزم على نفسي بإنجاز الأشغال والأعمال المحددة وفق الشروط المتفق عليها وتسليمها داخل الأجل المحدد قانوناً وعقداً.');
      setSuggestedType('تعهد');
      setSubjectMatterCategory('عمل_إنجاز');
      setLegalEffect('إنشاء_التزام_جديد');
      setDeclarerCapacity('متعهد');
      setActiveSection('specialized');
    }
  };

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* --------------------------------------------------------------------- */}
      {/* 🪪 Header Card (البطاقة الثابتة للرواق) */}
      {/* --------------------------------------------------------------------- */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-lg border border-emerald-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✍️</span>
              <h2 className="text-xl font-black font-amiri tracking-wide text-emerald-100">
                الإشهادات والتصريحات والإقرارات والالتزامات
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-bold">
                رسم إشهادي عدلي
              </span>
            </div>
            <p className="text-xs text-slate-300 font-amiri italic">
              «أشهد على نفسي بما أصرح به، وأقر بما أعترف به، وألتزم بما أتعهد به، وفق طبيعة الواقعة وأثرها القانوني»
            </p>
          </div>

          <div className="flex items-center gap-3">
            {clarityIndex === 'واضح' && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                مؤشر الوضوح: صريح ومكتمل
              </span>
            )}
            {clarityIndex === 'يحتاج_استكمال' && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                مؤشر الوضوح: يحتاج استكمال بيانات
              </span>
            )}
            {clarityIndex === 'يتضمن_تعارض' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-200 border border-red-400/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                مؤشر الوضوح: يتضمن تعارضاً
              </span>
            )}
            <button
              type="button"
              onClick={handleProceedToStep7}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 transform active:scale-95"
            >
              <span>الإحالة للقاضي (الخطوة 7)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Ribbon Stats */}
        <div className="mt-4 pt-3 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-200 font-medium">
          <div>
            <span className="text-slate-400 block text-[10px]">المصرح/الملتزم:</span>
            <span className="font-bold text-white truncate block">
              {declarerName || 'لم يحدد بعد'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">المستفيد:</span>
            <span className="font-bold text-white truncate block">
              {beneficiaryName || 'لم يحدد بعد'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">التكييف المقترح:</span>
            <span className="font-bold text-emerald-300">
              {suggestedType.replace(/_/g, ' ')} ({subjectMatterCategory.replace(/_/g, ' ')})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">الأثر القانوني:</span>
            <span className="font-bold text-teal-300">
              {legalEffect.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Diverter Alert Warning */}
      {diverterAlert && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 space-y-2">
          <div className="flex items-center gap-2 text-sm font-black text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>{diverterAlert.title}</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-950">{diverterAlert.message}</p>
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setState((prev) => ({
                  ...prev,
                  documentType: diverterAlert.targetDoc as any,
                }));
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>التحويل الذكي إلى مسار: {diverterAlert.targetDoc.replace(/_/g, ' ')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-amber-700">
              (يوصى بعدم تحرير هذا التصرف كإشهاد بسيط لتفادي بطلانه قانوناً)
            </span>
          </div>
        </div>
      )}

      {/* OCR File inputs (hidden) */}
      <input
        type="file"
        ref={declarerFileInputRef}
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScanDeclarerCard(file);
        }}
      />
      <input
        type="file"
        ref={beneficiaryFileInputRef}
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScanBeneficiaryCard(file);
        }}
      />

      {/* OCR Notice */}
      {ocrSuccessNotice && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs flex items-center justify-between">
          <span>{ocrSuccessNotice}</span>
          <button
            type="button"
            onClick={() => setOcrSuccessNotice(null)}
            className="text-teal-700 font-bold hover:underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('statement')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'statement'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. ما الذي تريد أن تشهد به؟ (التحليل الذكي)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('declarer')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'declarer'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. المصرح / الملتزم (الأهلية والصفة)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('beneficiary')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'beneficiary'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>3. المستفيد / المشهود لفائدته</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('specialized')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'specialized'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>4. المسار المتخصص (المالية / السفر / التمدرس)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('preview')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeSection === 'preview'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>5. التحرير النهائي والمصادقة القضائية</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: Free Statement & Smart Qualification Engine */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'statement' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 font-amiri flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>ما الذي تريد أن تشهد به؟ (صياغة حرة يحللها النظام تلقائياً)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              لا نطلب من المواطن معرفة التكييف القانوني مسبقاً. صف بكلماتك ما تريد الإشهاد أو الالتزام به، وسيقوم النظام بتكييفه واقتراح المسار المناسب.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              نماذج جاهزة سريعة للاختيار المباشر:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyQuickTemplate('school')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>تكفل بمصاريف تمدرس</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('travel')}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Plane className="w-3.5 h-3.5 text-purple-600" />
                <span>إذن وموافقة بسفر محضون (م 179)</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('debt')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>إقرار بدين وتعهد بالأداء</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('receipt')}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>إبراء ذمة ومخالصة</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('work')}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                <span>تعهد بإنجاز عمل في أجل</span>
              </button>
            </div>
          </div>

          {/* Statement Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>✍️ اكتب أو صف للعدل، بكلماتك، الشيء الذي تريد أن تشهد به:</span>
              <button
                type="button"
                onClick={() => analyzeStatement(statementText)}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[11px]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>إعادة تحليل النص</span>
              </button>
            </label>
            <textarea
              rows={5}
              value={statementText}
              onChange={(e) => {
                setStatementText(e.target.value);
                analyzeStatement(e.target.value);
              }}
              placeholder="مثال: أريد أن أتكفل بجميع مصاريف دراسة ابني فلان بالجامعة... أو: أقر بأن بذمتي مبلغ 50.000 درهم لفائدة السيد فلان وأتعهد بأدائه على أقساط... أو: أوافق لزوجتي على السفر بالمحضون إلى إسبانيا خلال العطلة الصيفية..."
              className="w-full p-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition leading-relaxed font-amiri"
            />
          </div>

          {/* Qualification Results (التكييف القانوني المقترح) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>التكييف والنوع المقترح من النظام (يمكن للعدل تعديله):</span>
              </span>
              <span className="text-[11px] text-slate-500">يقترح التطبيق ولا يفرض</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-semibold">نوع الإشهاد:</label>
                <select
                  value={suggestedType}
                  onChange={(e) => setSuggestedType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-emerald-900"
                >
                  <option value="إقرار">إقرار</option>
                  <option value="تصريح">تصريح</option>
                  <option value="التزام">التزام</option>
                  <option value="تعهد">تعهد</option>
                  <option value="تكفل">تكفل</option>
                  <option value="موافقة_أو_إذن">موافقة أو إذن</option>
                  <option value="اعتراف_بواقعة">اعتراف بواقعة</option>
                  <option value="إثبات_واقعة_شخصية">إثبات واقعة شخصية</option>
                  <option value="إبراء_أو_مخالصة">إبراء أو مخالصة</option>
                  <option value="إقرار_بدين">إقرار بدين</option>
                  <option value="موضوع_خاص">موضوع خاص</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">المجال / الموضوع:</label>
                <select
                  value={subjectMatterCategory}
                  onChange={(e) => setSubjectMatterCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                >
                  <option value="دين">دين ومال</option>
                  <option value="دراسة_تمدرس">دراسة وتمدرس</option>
                  <option value="طفل_محضون">طفل ومحضون</option>
                  <option value="تسليم_استلام">تسليم واستلام / إبراء</option>
                  <option value="عمل_إنجاز">عمل وإنجاز</option>
                  <option value="عقار">عقار (منفعة / إشغال)</option>
                  <option value="سيارة_منقول">منقول وسيارة</option>
                  <option value="أسرة">أسرة وعائلة</option>
                  <option value="شركة">شركة</option>
                  <option value="جمعية">جمعية</option>
                  <option value="واقعة_شخصية">واقعة شخصية</option>
                  <option value="موضوع_حر">موضوع حر</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">الأثر القانوني المقصود:</label>
                <select
                  value={legalEffect}
                  onChange={(e) => setLegalEffect(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white text-teal-900"
                >
                  <option value="تصريح_بواقعة">تصريح بواقعة</option>
                  <option value="إقرار_بحق_موجود">إقرار بحق موجود</option>
                  <option value="إنشاء_التزام_جديد">إنشاء التزام جديد</option>
                  <option value="تعديل_التزام_سابق">تعديل التزام سابق</option>
                  <option value="إنهاء_التزام">إنهاء التزام</option>
                  <option value="إبراء_إسقاط_حق">إبراء أو إسقاط حق</option>
                  <option value="موافقة_أو_إذن">موافقة أو إذن</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('declarer')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <span>متابعة لبيانات المصرح/الملتزم</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: Declarer Details (المصرح / المقر / الملتزم) */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'declarer' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-amiri flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>بيانات المصرح / المقر / الملتزم (الشاهد على نفسه)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يشترط التحقق من الهوية والأهلية المدنية الكاملة (18 سنة شمسية كاملة) وخلو الإرادة من عيوب الرضا.
              </p>
            </div>

            <button
              type="button"
              onClick={() => declarerFileInputRef.current?.click()}
              disabled={scanningDeclarer}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {scanningDeclarer ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ المسح الضوئي الذكي...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>مسح البطاقة الوطنية (OCR)</span>
                </>
              )}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-700 block mb-1 font-bold">الاسم الكامل للمصرح:</label>
              <input
                type="text"
                value={declarerName}
                onChange={(e) => setDeclarerName(e.target.value)}
                placeholder="الاسم الكامل بالعربية"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold">رقم البطاقة الوطنية (CIN):</label>
              <input
                type="text"
                value={declarerCin}
                onChange={(e) => setDeclarerCin(e.target.value.toUpperCase())}
                placeholder="مثال: AB123456"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold">الصفة في هذا الإشهاد:</label>
              <select
                value={declarerCapacity}
                onChange={(e) => setDeclarerCapacity(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
              >
                <option value="شاهد_على_نفسه">شاهد على نفسه</option>
                <option value="مقر">مقر</option>
                <option value="مصرح">مصرح</option>
                <option value="ملتزم">ملتزم</option>
                <option value="متعهد">متعهد</option>
                <option value="كافل">كافل</option>
                <option value="موافق">موافق</option>
                <option value="أخرى">صفة أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">تاريخ الازدياد:</label>
              <input
                type="date"
                value={declarerDob}
                onChange={(e) => setDeclarerDob(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">المهنة:</label>
              <input
                type="text"
                value={declarerProfession}
                onChange={(e) => setDeclarerProfession(e.target.value)}
                placeholder="المهنة أو الحرفة"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">رقم الهاتف:</label>
              <input
                type="tel"
                value={declarerPhone}
                onChange={(e) => setDeclarerPhone(e.target.value)}
                placeholder="06xxxxxxxx"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-slate-700 block mb-1 font-semibold">عنوان السكنى:</label>
              <input
                type="text"
                value={declarerAddress}
                onChange={(e) => setDeclarerAddress(e.target.value)}
                placeholder="العنوان الكامل كما هو وارد بالبطاقة الوطنية"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Special POA Block (الوكالة الخاصة) */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasPoaCheck"
                checked={hasPoa}
                onChange={(e) => setHasPoa(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
              />
              <label htmlFor="hasPoaCheck" className="text-xs font-bold text-purple-900 cursor-pointer">
                هل يتصرف المصرح بموجب وكالة خاصة نيابة عن الغير؟
              </label>
            </div>

            {hasPoa && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <label className="text-purple-900 block mb-1 font-semibold">اسم الموكل الأصلي:</label>
                  <input
                    type="text"
                    value={poaPrincipalName}
                    onChange={(e) => setPoaPrincipalName(e.target.value)}
                    placeholder="اسم الموكل الكامل"
                    className="w-full p-2 border border-purple-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-purple-900 block mb-1 font-semibold">رقم مرجع الوكالة:</label>
                  <input
                    type="text"
                    value={poaNumber}
                    onChange={(e) => setPoaNumber(e.target.value)}
                    placeholder="رقم الرسم أو التضمين"
                    className="w-full p-2 border border-purple-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-purple-900 block mb-1 font-semibold">تاريخ الوكالة:</label>
                  <input
                    type="date"
                    value={poaDate}
                    onChange={(e) => setPoaDate(e.target.value)}
                    className="w-full p-2 border border-purple-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-purple-900 block mb-1 font-semibold">المحكمة / الجهة الموثقة:</label>
                  <input
                    type="text"
                    value={poaCourt}
                    onChange={(e) => setPoaCourt(e.target.value)}
                    placeholder="المحكمة أو القنصلية"
                    className="w-full p-2 border border-purple-300 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-purple-900 block mb-1 font-semibold">نطاق الوكالة الخاصة:</label>
                  <input
                    type="text"
                    value={poaScope}
                    onChange={(e) => setPoaScope(e.target.value)}
                    placeholder="التأكد من أن الوكالة تتضمن صراحة صلاحية الإقرار أو الالتزام بموضوع الإشهاد"
                    className="w-full p-2 border border-purple-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('statement')}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition hover:bg-slate-50"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('beneficiary')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <span>متابعة لبيانات المستفيد</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: Beneficiary Details (المستفيد / المشهود لفائدته) */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'beneficiary' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-amiri flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <span>بيانات المستفيد / المشهود لفائدته (شخص ذاتي أو معنوي)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                الجهة المستفيدة من الإشهاد أو الالتزام: شخص ذاتي (بالغ أو قاصر)، شركة، مؤسسة، جمعية، إلخ.
              </p>
            </div>

            {beneficiaryType === 'شخص_ذاتي' && (
              <button
                type="button"
                onClick={() => beneficiaryFileInputRef.current?.click()}
                disabled={scanningBeneficiary}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {scanningBeneficiary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ المسح...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>مسح بطاقة المستفيد (OCR)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Beneficiary Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">طبيعة المستفيد:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { label: 'شخص ذاتي', value: 'شخص_ذاتي' },
                { label: 'شركة تجارية', value: 'شركة' },
                { label: 'مؤسسة تعليمية', value: 'مؤسسة_تعليمية' },
                { label: 'جمعية / تعاونية', value: 'جمعية' },
                { label: 'مؤسسة صحية', value: 'مؤسسة_صحية' },
                { label: 'مؤسسة مالية / بنك', value: 'مؤسسة_مالية' },
                { label: 'جهة قضائية / إدارية', value: 'جهة_قضائية_إدارية' },
                { label: 'جهة أخرى', value: 'جهة_أخرى' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setBeneficiaryType(item.value as any)}
                  className={`p-2.5 rounded-lg border text-right font-bold transition ${
                    beneficiaryType === item.value
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields based on Beneficiary Type */}
          {beneficiaryType === 'شخص_ذاتي' ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">اسم المستفيد الكامل:</label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold">رقم البطاقة الوطنية (CIN):</label>
                  <input
                    type="text"
                    value={beneficiaryCin}
                    onChange={(e) => setBeneficiaryCin(e.target.value.toUpperCase())}
                    placeholder="مثال: CD654321"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">رقم الهاتف:</label>
                  <input
                    type="tel"
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    placeholder="06xxxxxxxx"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-slate-700 block mb-1 font-semibold">العنوان:</label>
                  <input
                    type="text"
                    value={beneficiaryAddress}
                    onChange={(e) => setBeneficiaryAddress(e.target.value)}
                    placeholder="العنوان الكامل للمستفيد"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Minor Check */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMinorCheck"
                    checked={isMinorBeneficiary}
                    onChange={(e) => setIsMinorBeneficiary(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <label htmlFor="isMinorCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                    هل المستفيد قاصر خاضع للنيابة الشرعية؟
                  </label>
                </div>

                {isMinorBeneficiary && (
                  <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div>
                      <label className="text-amber-900 block mb-1 font-semibold">اسم الولي / النائب الشرعي:</label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="اسم الولي الكامل"
                        className="w-full p-2 border border-amber-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-amber-900 block mb-1 font-semibold">ب.ت.و للنائب الشرعي:</label>
                      <input
                        type="text"
                        value={guardianCin}
                        onChange={(e) => setGuardianCin(e.target.value.toUpperCase())}
                        placeholder="رقم البطاقة"
                        className="w-full p-2 border border-amber-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-amber-900 block mb-1 font-semibold">صفة النيابة:</label>
                      <input
                        type="text"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                        placeholder="أب / أم / وصي / مقدم"
                        className="w-full p-2 border border-amber-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Corporate / Moral Entity Fields */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold">الاسم الاجتماعي للمؤسسة/الشركة:</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="مثال: شركة التنمية والتجهيز ش.م"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">المعرف الموحد للمقاولة (ICE):</label>
                <input
                  type="text"
                  value={beneficiaryIce}
                  onChange={(e) => setBeneficiaryIce(e.target.value)}
                  placeholder="15 رقماً"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">السجل التجاري (RC):</label>
                <input
                  type="text"
                  value={beneficiaryRc}
                  onChange={(e) => setBeneficiaryRc(e.target.value)}
                  placeholder="رقم السجل والمحكمة"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">اسم الممثل القانوني:</label>
                <input
                  type="text"
                  value={beneficiaryRepName}
                  onChange={(e) => setBeneficiaryRepName(e.target.value)}
                  placeholder="اسم المسير أو المدير"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">صفة الممثل القانوني:</label>
                <input
                  type="text"
                  value={beneficiaryRepTitle}
                  onChange={(e) => setBeneficiaryRepTitle(e.target.value)}
                  placeholder="المسير الوحيد / رئيس مجلس الإدارة"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">المقر الاجتماعي / العنوان:</label>
                <input
                  type="text"
                  value={beneficiaryAddress}
                  onChange={(e) => setBeneficiaryAddress(e.target.value)}
                  placeholder="العنوان الكامل للمقر"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('declarer')}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition hover:bg-slate-50"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('specialized')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <span>متابعة للمسار المتخصص</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 4: Specialized Content Engine */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'specialized' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 font-amiri flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span>المقتضيات والمسارات المتخصصة بحسب نوع الإشهاد</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              يخصص هذا القسم الحقول الدقيقة المتطابقة مع القوانين ذات الصلة (قانون الالتزامات والعقود، المادة 179 مدونة الأسرة، الضمانات والأداء).
            </p>
          </div>

          {/* Sub-Engine 1: Financial & Debt */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFinancialToggle"
                  checked={isFinancial}
                  onChange={(e) => setIsFinancial(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="isFinancialToggle" className="text-xs font-black text-slate-900 cursor-pointer flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>هل يتضمن الإشهاد التزاماً مالياً أو إقراراً بدين؟</span>
                </label>
              </div>
              <span className="text-[11px] text-slate-500">ف 405 وما بعده من ق.ل.ع</span>
            </div>

            {isFinancial && (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold">المبلغ بالأرقام (د.م):</label>
                    <input
                      type="number"
                      value={financeAmount || ''}
                      onChange={(e) => setFinanceAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-bold">المبلغ بالحروف:</label>
                    <input
                      type="text"
                      value={financeAmountInWords}
                      onChange={(e) => setFinanceAmountInWords(e.target.value)}
                      placeholder="مثال: خمسون ألف درهم مغربي"
                      className="w-full p-2 border border-slate-300 rounded-lg font-amiri font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">منشأ ومصدر الدين:</label>
                    <select
                      value={financeSource}
                      onChange={(e) => setFinanceSource(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="دين">دين عادي</option>
                      <option value="قرض">قرض</option>
                      <option value="ثمن">ثمن مبيع</option>
                      <option value="باقي_ثمن">باقي ثمن</option>
                      <option value="أمانة">أمانة / وديعة</option>
                      <option value="تعويض">تعويض</option>
                      <option value="نفقة">نفقة</option>
                      <option value="مصاريف">مصاريف</option>
                      <option value="آخر">منشأ آخر</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">طبيعة الأجل / الاستحقاق:</label>
                    <select
                      value={financeMaturity}
                      onChange={(e) => setFinanceMaturity(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      <option value="حال">حالّ في الذمة فوراً</option>
                      <option value="مؤجل">مؤجل إلى تاريخ محدد</option>
                      <option value="أقساط">مقسم على أقساط مجدولة</option>
                    </select>
                  </div>

                  {financeMaturity === 'مؤجل' && (
                    <div className="sm:col-span-2">
                      <label className="text-slate-700 block mb-1 font-bold">تاريخ حلول الأجل:</label>
                      <input
                        type="date"
                        value={financeDueDate}
                        onChange={(e) => setFinanceDueDate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Installments Table */}
                {financeMaturity === 'أقساط' && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">جدول الأقساط المحددة:</span>
                      <button
                        type="button"
                        onClick={addInstallment}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-300 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة قسط</span>
                      </button>
                    </div>

                    {installments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        انقر على «إضافة قسط» لجدولة الدفعات وتواريخ استحقاقها.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {installments.map((inst, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-200">
                            <span className="font-bold text-slate-600 w-16">القسط {idx + 1}:</span>
                            <input
                              type="number"
                              value={inst.amount || ''}
                              onChange={(e) => updateInstallment(idx, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="المبلغ د.م"
                              className="w-32 p-1.5 border border-slate-300 rounded font-mono"
                            />
                            <input
                              type="date"
                              value={inst.dueDate}
                              onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
                              className="p-1.5 border border-slate-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeInstallment(idx)}
                              className="text-red-500 hover:text-red-700 p-1 mr-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sub-Engine 2: Custody Travel Consent (إذن بالسفر بالمحضون - المادة 179) */}
          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-purple-700" />
                <span>إذن وموافقة بالسفر بالمحضون إلى الخارج (المادة 179 من مدونة الأسرة)</span>
              </span>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                قضاء الأسرة
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-purple-950 block mb-1 font-semibold">اسم المحضون:</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="اسم الطفل المحضون"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">تاريخ ازدياد المحضون:</label>
                <input
                  type="date"
                  value={childDob}
                  onChange={(e) => setChildDob(e.target.value)}
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">رقم جواز سفر المحضون:</label>
                <input
                  type="text"
                  value={childPassport}
                  onChange={(e) => setChildPassport(e.target.value.toUpperCase())}
                  placeholder="رقم الجواز"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">المرافق / الحاضن المصاحب:</label>
                <input
                  type="text"
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                  placeholder="اسم الأم أو الحاضنة"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">ب.ت.و للمرافق:</label>
                <input
                  type="text"
                  value={custodianCin}
                  onChange={(e) => setCustodianCin(e.target.value.toUpperCase())}
                  placeholder="رقم البطاقة"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">دولة الوجهة المقصودة:</label>
                <input
                  type="text"
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  placeholder="مثال: إسبانيا / فرنسا"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-purple-950 block mb-1 font-semibold">مدة السفر وتاريخ العودة:</label>
                <input
                  type="text"
                  value={travelDuration}
                  onChange={(e) => setTravelDuration(e.target.value)}
                  placeholder="مثال: من 01/07 إلى 31/07"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-purple-950 block mb-1 font-semibold">الغرض من السفر:</label>
                <input
                  type="text"
                  value={travelPurpose}
                  onChange={(e) => setTravelPurpose(e.target.value)}
                  placeholder="عطلة صيفية، علاج، دراسة، صلة رحم"
                  className="w-full p-2 border border-purple-200 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-purple-200 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="travelBanCheck"
                checked={travelBanChecked}
                onChange={(e) => setTravelBanChecked(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-purple-300"
              />
              <label htmlFor="travelBanCheck" className="text-purple-900 font-bold cursor-pointer">
                ✓ التحقق العدلي: لا يوجد أمر قضائي نهائي يقضي بمنع المحضون من السفر طبقاً للمادة 179 من مدونة الأسرة
              </label>
            </div>
          </div>

          {/* Sub-Engine 3: Schooling Support (تكفل بتمدرس) */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-700" />
                <span>تكفل بمصاريف تمدرس ودراسة (التزام مباشر)</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                حماية أسرية
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-blue-950 block mb-1 font-semibold">اسم الطالب / المتمدرس:</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="اسم التلميذ أو الطالب"
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-blue-950 block mb-1 font-semibold">المؤسسة التعليمية / الجامعة:</label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="اسم المدرسة أو المعهد"
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-blue-950 block mb-1 font-semibold">المستوى الدراسي / التخصص:</label>
                <input
                  type="text"
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  placeholder="السنة الدراسية أو السلك"
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-blue-950 block mb-1 font-semibold">المدينة / الدولة:</label>
                <input
                  type="text"
                  value={schoolingCity}
                  onChange={(e) => setSchoolingCity(e.target.value)}
                  placeholder="المدينة"
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-blue-950 block mb-1 font-semibold">المبلغ الملتزم به (د.م):</label>
                <input
                  type="number"
                  value={schoolingAmount || ''}
                  onChange={(e) => setSchoolingAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-blue-950 block mb-1 font-semibold">دورية الأداء:</label>
                <select
                  value={schoolingFrequency}
                  onChange={(e) => setSchoolingFrequency(e.target.value as any)}
                  className="w-full p-2 border border-blue-200 rounded-lg bg-white font-bold"
                >
                  <option value="شهري">شهري</option>
                  <option value="سنوي">سنوي</option>
                  <option value="مفتوح">مفتوح بحسب فواتير المؤسسة</option>
                </select>
              </div>
            </div>

            <div className="p-2 bg-blue-100/50 rounded text-[11px] text-blue-900">
              💡 <strong>قاعدة أمان:</strong> الالتزام صادر بصفة شخصية ومباشرة وليس كفالة لدين الغير، مما يجنب العدل خلطه بعقود الكفالة المنظمة بظهير الالتزامات والعقود.
            </div>
          </div>

          {/* Sub-Engine 4: Fact Acknowledgment & Receipt (إقرار بواقعة / تسليم / مخالصة) */}
          <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-teal-700" />
                <span>إقرار بواقعة أو تسليم أمانة / منقول ومخالصة (إبراء ذمة)</span>
              </span>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                إبراء ومخالصة
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-teal-950 block mb-1 font-semibold">موضوع الواقعة أو الشيء المستلم:</label>
                <input
                  type="text"
                  value={factSubject}
                  onChange={(e) => setFactSubject(e.target.value)}
                  placeholder="وصف الواقعة أو الأمانة"
                  className="w-full p-2 border border-teal-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-teal-950 block mb-1 font-semibold">تاريخ حدوث الواقعة / الاستلام:</label>
                <input
                  type="date"
                  value={factDate}
                  onChange={(e) => setFactDate(e.target.value)}
                  className="w-full p-2 border border-teal-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="text-teal-950 block mb-1 font-semibold">مكان الواقعة / التسليم:</label>
                <input
                  type="text"
                  value={factLocation}
                  onChange={(e) => setFactLocation(e.target.value)}
                  placeholder="المدينة أو العنوان"
                  className="w-full p-2 border border-teal-200 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-teal-950 block mb-1 font-semibold">بيان الأشياء والمستندات المسلمة بدقة:</label>
                <input
                  type="text"
                  value={receiptItemDesc}
                  onChange={(e) => setReceiptItemDesc(e.target.value)}
                  placeholder="وصف تفصيلي لما تم تسلمه والتنازل عنه"
                  className="w-full p-2 border border-teal-200 rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="fullDischargeCheck"
                  checked={receiptFullDischarge}
                  onChange={(e) => setReceiptFullDischarge(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-teal-300"
                />
                <label htmlFor="fullDischargeCheck" className="text-xs font-bold text-teal-900 cursor-pointer">
                  إبراء ذمة تام ونهائي ومسقط لأي دعوى
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection('beneficiary')}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition hover:bg-slate-50"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('preview')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <span>معاينة الرسم والمصادقة النهائية</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 5: Draft Preview & Direct Step 7 Finalization */}
      {/* --------------------------------------------------------------------- */}
      {activeSection === 'preview' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-amiri flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>المعاينة التوثيقية لصيغة الرسم العدلي</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                صيغة الرسم الرسمي المحررة وفق التقاليد العدلية المغربية وقانون خطة العدالة رقم 16.03.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedDraft);
                  setCopiedDraft(true);
                  setTimeout(() => setCopiedDraft(false), 2500);
                }}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedDraft ? 'تم النسخ!' : 'نسخ النص'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Validation & Contradiction Alerts Bar */}
          {contradictionAlerts.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>ملاحظات التدقيق وتنبيهات التنافي:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                {contradictionAlerts.map((alt, idx) => (
                  <li key={idx}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Official Document Draft Preview Box */}
          <div className="p-6 bg-amber-50/20 border-2 border-slate-200 rounded-2xl shadow-inner font-amiri text-base leading-loose text-slate-900 whitespace-pre-wrap text-justify selection:bg-emerald-100">
            {generatedDraft}
          </div>

          {/* Direct CTA Action to Step 7 (المصادقة والإحالة للقاضي) */}
          <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 rounded-2xl border-2 border-emerald-300 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-black text-emerald-950 font-amiri">
                  جاهزية الإحالة على قاضي التوثيق (المرحلة السابعة)
                </h4>
              </div>
              <p className="text-xs text-emerald-800 max-w-xl">
                عند النقر على الزر، سيتم حفظ هذا الرسم بجميع تفاصيله ونقله فوراً للخطوة 7 ليتم إرساله في الإرسالية القضائية الرسمية إلى قاضي التوثيق للمخاطبة.
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedToStep7}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform active:scale-95"
            >
              <span>🚀 المصادقة والانتقال للخطوة 7 للإحالة للقاضي</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
