import {
  ARABIC_ONES,
  ARABIC_TENS,
  ARABIC_TEENS,
  ARABIC_HUNDREDS,
  GREGORIAN_MONTHS_ARABIC,
  FAMILY_DEED_TYPES,
} from '../constants/feesAgentLocales';
import type {
  Party,
  Witness,
  TitleDocumentDetails,
  PropertyDetails,
  PartitionDivision,
  ValidationAlert,
  ValidationSeverity,
  PossessionProof,
  FeesAgentState,
} from '../types/feesAgentTypes';

// ============================================================================
// FACTORY / INITIALIZER FUNCTIONS
// ============================================================================

export function createEmptyTitleDocument(): TitleDocumentDetails {
  return {
    feeType: '',
    bookReference: '',
    number: '',
    letter: '',
    page: '',
    count: '',
    date: '',
    correspondingDate: '',
    hasRegistrationReferences: '',
    registeredAt: '',
    depositNumber: '',
    depositDate: '',
    hasNotes: '',
    notes: '',
    file: null,
  };
}

export function createEmptyProperty(): PropertyDetails {
  return {
    type: 'محفظ',
    boundaries: { north: '', south: '', east: '', west: '' },
    coordinates: [],
    titleDocuments: [createEmptyTitleDocument()],
    ownershipCertificates: [],
    hasThirdPartyRights: '',
  };
}

export function createEmptyPartitionDivision(): PartitionDivision {
  return {
    beneficiaries: [{ name: '', share: '100%' }],
    propertyDescription: '',
    area: '',
    length: '',
    width: '',
    boundaries: { north: '', south: '', east: '', west: '' },
    coordinates: { lat: '', lng: '' },
    divisionValue: 0,
    divisionValueInWords: '',
  };
}

export const createEmptyParty = (): Party => ({
  name: '',
  fatherName: '',
  motherName: '',
  fatherProfession: '',
  motherProfession: '',
  placeOfBirth: '',
  address: '',
  idNumber: '',
  idIssueDate: '',
  dateOfBirth: '',
  idImage: null,
  share: '',
});

export const createEmptyWitness = (): Witness => ({
  ...createEmptyParty(),
  dateOfBirth: '',
});

// ============================================================================
// DATE, TIME & ARABIC NUMBER UTILITIES
// ============================================================================

export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function convertGregorianToHijri(gregorianDate: string): string {
  const date = new Date(gregorianDate);
  const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(date);
}

export function generateFileNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000);
  return `${year}/${random}`;
}

export function convertNumberToArabicWords(num: number, suffix: string = ' درهم'): string {
  if (!num) return '';
  
  const ones = ARABIC_ONES;
  const tens = ARABIC_TENS;
  const teens = ARABIC_TEENS;
  const hundreds = ARABIC_HUNDREDS;

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const rem = n % 10;
      return (rem ? ones[rem] + ' و' : '') + tens[Math.floor(n / 10)];
    }
    const rem = n % 100;
    return hundreds[Math.floor(n / 100)] + (rem ? ' و' + convertGroup(rem) : '');
  };

  let result = '';
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (millions > 0) {
    if (millions === 1) result += 'مليون';
    else if (millions === 2) result += 'مليونان';
    else if (millions >= 3 && millions <= 10) {
      if (millions === 10) result += 'عشرة ملايين';
      else result += ones[millions] + ' ملايين';
    }
    else result += convertGroup(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (result) result += ' و';
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) {
      if (thousands === 10) result += 'عشرة آلاف';
      else result += ones[thousands] + ' آلاف';
    }
    else result += convertGroup(thousands) + ' ألف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    result += convertGroup(remainder);
  }

  return result + suffix;
}

export function convertGregorianDateToWords(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const months = GREGORIAN_MONTHS_ARABIC;

  const dayWords = convertNumberToArabicWords(day, '').trim();
  const yearWords = convertNumberToArabicWords(year, '').trim();

  return `في اليوم ${dayWords} من شهر ${months[month]} سنة ${yearWords}`;
}

export function convertHijriDateToWords(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');

    const monthNameFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'long' });
    const monthName = monthNameFormatter.format(date);

    const dayWords = convertNumberToArabicWords(day, '').trim();
    const yearWords = convertNumberToArabicWords(year, '').trim();

    return `في اليوم ${dayWords} من شهر ${monthName} عام ${yearWords}`;
  } catch (e) {
    return '';
  }
}

export function convertTimeToWords(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  let period = 'صباحاً';
  let hour12 = hours;
  
  if (hours >= 12) {
    period = 'مساءً';
    if (hours > 12) hour12 = hours - 12;
  }
  if (hours === 0) hour12 = 12;

  const hourWords = convertNumberToArabicWords(hour12, '').trim();
  const minuteWords = convertNumberToArabicWords(minutes, '').trim();

  let result = `على الساعة ${hourWords}`;
  if (minutes > 0) {
    result += ` و ${minuteWords} دقيقة`;
  }
  result += ` ${period}`;
  
  return result;
}

export function getArabicWeekdayName(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('ar-MA', { weekday: 'long' }).format(date);
  } catch {
    return '';
  }
}

// ============================================================================
// VALIDATION & AUDIT UTILITIES
// ============================================================================

export function generateValidationId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateValidationAlert(
  field: string,
  message: string,
  severity: ValidationSeverity,
  suggestion?: string
): ValidationAlert {
  return {
    id: generateValidationId(),
    field,
    message,
    severity,
    suggestion,
  };
}

export function performValidationChecks(state: FeesAgentState): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];
  if (!state) return alerts;

  const sellers = state.sellers || [];
  const buyers = state.buyers || [];
  const properties = state.properties || [];
  const finance = state.finance || { price: 0, priceInWords: '', paymentMethod: '', transferDetails: '', registeredWithTax: '' };
  const isFamilyDeed = (FAMILY_DEED_TYPES as readonly string[]).includes(state.documentType);

  // التأكد من اختلاف أسماء الأطراف
  sellers.forEach((seller) => {
    buyers.forEach((buyer) => {
      if (seller?.name && buyer?.name && seller.name === buyer.name) {
        alerts.push(
          generateValidationAlert(
            'parties',
            isFamilyDeed ? 'اسم الزوجة مطابق لاسم الزوج' : 'اسم المشتري مطابق لاسم البائع',
            'هام',
            'يرجى التأكد من صحة أسماء الأطراف'
          )
        );
      }
    });
  });

  // التحقق من أرقام البطاقات
  sellers.forEach((seller, index) => {
    if (seller?.idNumber && !/^\d{10}$/.test(seller.idNumber) && !/^[A-Z]{1,2}\d{5,8}$/i.test(seller.idNumber)) {
      alerts.push(
        generateValidationAlert(
          `sellers[${index}].idNumber`,
          'صيغة رقم البطاقة غير صحيحة',
          'حرج',
          'يرجى التأكد من صحة رقم البطاقة الوطنية أو جواز السفر'
        )
      );
    }
  });

  buyers.forEach((buyer, index) => {
    if (buyer?.idNumber && !/^\d{10}$/.test(buyer.idNumber) && !/^[A-Z]{1,2}\d{5,8}$/i.test(buyer.idNumber)) {
      alerts.push(
        generateValidationAlert(
          `buyers[${index}].idNumber`,
          'رقم بطاقة الطرف الثاني غير صالح',
          'هام',
          'يرجى التأكد من صحة رقم البطاقة الوطنية أو جواز السفر'
        )
      );
    }
  });

  if (!isFamilyDeed) {
    // التحقق من حدود العقار
    properties.forEach((property, index) => {
      if (
        property?.type !== 'منقول' &&
        (!property?.boundaries?.north ||
          !property?.boundaries?.south ||
          !property?.boundaries?.east ||
          !property?.boundaries?.west)
      ) {
        alerts.push(
          generateValidationAlert(
            `properties[${index}].boundaries`,
            `حدود العقار رقم ${index + 1} ناقصة`,
            'هام',
            'يجب إدراج جميع الحدود الأربع (شمال، جنوب، شرق، غرب)'
          )
        );
      }

      // التحقق من العقار غير المحفظ
      if (property?.type === 'غير_محفظ') {
        alerts.push(
          generateValidationAlert(
            `properties[${index}].type`,
            `العقار رقم ${index + 1} غير محفظ — تأكد من إجراءات الحيازة`,
            'هام',
            'تأكد من توافر إقرار الشهود وإجراءات الحيازة والتسليم الفعلي'
          )
        );
      }
    });

    // التحقق من السعر
    if (finance.price === 0 || finance.price < 0) {
      alerts.push(
        generateValidationAlert(
          'finance.price',
          'السعر غير معقول',
          'هام',
          'تأكد من إدخال سعر صحيح وموجب'
        )
      );
    }

    // التحقق من الثمن المريب (تحذير ضريبي)
    if (finance.price > 0 && finance.price < 50000) {
      alerts.push(
        generateValidationAlert(
          'finance.price',
          'الثمن قد يثير شبهات التهرب الضريبي',
          'عادي',
          'تحقق من معقولية السعر بالنسبة لنوع العقار والموقع'
        )
      );
    }

    // التحقق من التسجيل الضريبي
    if (finance.registeredWithTax === 'لا') {
      alerts.push(
        generateValidationAlert(
          'finance.registeredWithTax',
          'العقد لم يُسجل بمصلحة الضرائب',
          'حرج',
          'يجب إضافة بند إلزامي بشأن التسجيل وتنبيه الأطراف بالآثار الضريبية'
        )
      );
    }
  }

  return alerts;
}

// ============================================================================
// POSSESSION PROOF VALIDATION FUNCTIONS (رسم الملك الذكي)
// ============================================================================

/**
 * Layer III: Legal Filters Engine - تصفية حالات عدم القبول
 * Checks if the property type is legally eligible for possession-based ownership
 */
export function executeLegalFiltersForPossession(proof: PossessionProof): {
  canProceed: boolean;
  rejectionReason?: string;
  filters: Record<string, { triggered: boolean; reason?: string }>;
} {
  const filters: Record<string, { triggered: boolean; reason?: string }> = {};
  
  // فلتر 1 — الملك المحفظ (م3 من م.ح.ع)
  filters.registeredProperty = {
    triggered: proof.propertyType === 'محفظ' || proof.isRegisteredProperty === true || proof.isRegisteredDomain === true,
    reason: 'لا تثبت الملكية على العقار المحفظ باللفيف، بل بالتحفيظ والرسوم العقارية (المادة 3 من مدونة الحقوق العينية)'
  };
  
  // فلتر 2 — الملك الجماعي (ظهير 1919)
  filters.collectiveProperty = {
    triggered: proof.ownershipStatus === 'جماعي' || proof.isCollectiveDomain === true,
    reason: 'الملك الجماعي يتطلب شهادة من الجماعة + لجنة العمالة (ظهير 1919 + تعديلات)'
  };
  
  // فلتر 3 — أملاك الدولة (م222 وما بعدها)
  filters.stateProperty = {
    triggered: proof.ownershipStatus === 'ملك_دولة' || proof.isStateProperty === true,
    reason: 'أملاك الدولة الخاص/العام لا تُكتسب بالحيازة (المواد 222 وما بعدها)'
  };
  
  // فلتر 4 — الأملاك الحبسية (قانون الوقف 2010)
  filters.waqfProperty = {
    triggered: proof.ownershipStatus === 'حبس' || proof.isWaqfProperty === true || proof.isWaqfDomain === true,
    reason: 'ممنوع الحيازة على الأملاك الحبسية (قانون الوقف — مدونة الأوقاف 2010)'
  };
  
  // فلتر 5 — أراضي المياه والغابات (ظهير 1917 + القانون 22-92)
  filters.forestWaterProperty = {
    triggered: proof.ownershipStatus === 'غابات',
    reason: 'أراضي المياه والغابات محمية بقانون خاص (ظهير 1917 + القانون 22-92)'
  };
  
  const anyFilterTriggered = Object.values(filters).some(f => f.triggered);
  const firstTriggered = Object.values(filters).find(f => f.triggered);
  
  return {
    canProceed: !anyFilterTriggered,
    rejectionReason: firstTriggered?.reason,
    filters
  };
}

/**
 * Layer IV: Ownership Eligibility - شروط صحة الحيازة
 * Validates the conditions required for valid possession
 */
export function validatePossessionConditions(proof: PossessionProof): {
  isValid: boolean;
  failedConditions: string[];
  warnings: string[];
} {
  const failed: string[] = [];
  const warnings: string[] = [];
  const cond = proof.possessionConditions || {};
  
  // 1. وضع اليد الفعلي
  if (cond.hasActualPossession !== 'نعم') {
    failed.push('يجب إثبات وضع اليد الفعلي على العقار');
  }
  
  // 2. تصرف المالك في ملكه
  const acts = cond.treatmentAsOwner?.acts || [];
  if (acts.length === 0) {
    warnings.push('يُستحسن توضيح أعمال التصرف كتصرف المالك (حرث، غرس، بناء، تأجير...)');
  }
  
  // 3. الشهرة (نسبة الناس الملك إليه)
  if (!cond.publicReputation?.peopleAttributeToHim && !proof.peopleAttributePropertyToHim) {
    warnings.push('يُستحسن إثبات أن الناس ينسبون الملك إليه (الشهرة العرفية)');
  }
  
  // 4. غياب المنازع
  if (cond.absenceOfDisputes === false || proof.hasDisputes === true || proof.hasPreviousLawsuits === true) {
    failed.push('وجود منازعة أو دعوى قضائية يمنع الحيازة');
  }
  
  // 5. المدة القانونية
  const period = cond.requiredPeriod || {};
  const category = period.category || proof.possessorCategory;
  const years = period.yearsActual ?? proof.yearsOfPossession ?? 0;
  
  let requiredYears = 10; // default for أجنبي
  if (category === 'قريب') requiredYears = 40;
  else if (category === 'قريب_مع_عداوة') requiredYears = 10;
  else if (category === 'شريك') {
    warnings.push('الحيازة بين الشركاء تتطلب شروطًا خاصة');
  }
  
  if (years < requiredYears) {
    failed.push(`المدة المطلوبة: ${requiredYears} سنة، المدة المصرح بها: ${years} سنة`);
  }
  
  return {
    isValid: failed.length === 0,
    failedConditions: failed,
    warnings
  };
}

/**
 * Layer VI: Witness Verification Engine - فحص الشهود
 * Validates witness requirements
 */
export function validateWitnessRequirements(proof: PossessionProof): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const witnesses = proof.witnesses || (proof.witnessVerification as any) || {};
  
  // العدد
  const count = witnesses.count ?? witnesses.totalWitnessCount ?? 0;
  const required = witnesses.countRequired ?? 12;
  
  if (count < required) {
    issues.push(`عدد الشهود المطلوب: ${required}، العدد الحالي: ${count}`);
  }
  
  // السن والمعرفة
  const witnessList = witnesses.list ?? witnesses.witnessDetails ?? [];
  const yearsOfPossession = proof.yearsOfPossession ?? proof.actualPossessor?.yearsOfPossession ?? 0;
  
  witnessList.forEach((w: any, idx: number) => {
    const age = w.age ?? 0;
    const knowledge = w.yearsOfKnowledge ?? w.knowledgeDuration ?? 0;
    
    // السن: يجب أن يكون ≥ سن الحيازة + 18
    const minAge = yearsOfPossession + 18;
    if (age < minAge) {
      issues.push(`الشاهد رقم ${idx + 1}: السن غير كافية (يجب ${minAge} سنة على الأقل)`);
    }
    
    // المعرفة: يجب أن تكون ≥ مدة الحيازة
    if (knowledge < yearsOfPossession) {
      issues.push(`الشاهد رقم ${idx + 1}: مدة المعرفة غير كافية`);
    }
    
    // المعاينة الفعلية
    if (!w.hasActualInspection && !w.hasInspectedProperty) {
      issues.push(`الشاهد رقم ${idx + 1}: لم يعاين العقار فعليًا`);
    }
    
    // علمه بغياب النزاع
    if (w.attestsNoDispute === false) {
      issues.push(`الشاهد رقم ${idx + 1}: لا يشهد على غياب النزاع`);
    }
    
    // علمه بعدم التفويت
    if (w.attestsNoTransfer === false) {
      issues.push(`الشاهد رقم ${idx + 1}: لا يشهد على عدم التفويت`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Layer XI: Outcome Routing - النتيجة والتوجيه
 * Determines the final outcome and next steps
 */
export function generateOutcomeRouting(
  proof: PossessionProof,
  filters: ReturnType<typeof executeLegalFiltersForPossession>,
  conditions: ReturnType<typeof validatePossessionConditions>,
  witnesses: ReturnType<typeof validateWitnessRequirements>
): {
  status: 'مقبول_للاستكمال' | 'مؤجل_لطلب_شواهد' | 'مرفوض_منع_قانوني' | 'تحويل_لمطلب_تحفيظ' | 'تحويل_لدعوى_قضائية';
  reason: string;
  nextSteps: string;
  autoRedirect?: boolean;
  redirectTarget?: string;
} {
  // مرفوض — منع قانوني
  if (!filters.canProceed) {
    return {
      status: 'مرفوض_منع_قانوني',
      reason: filters.rejectionReason || 'منع قانوني',
      nextSteps: 'يجب استخدام مسطرة قانونية أخرى (تحفيظ، دعوى قضائية...)',
      autoRedirect: false
    };
  }
  
  // تحويل لمطلب تحفيظ
  if (proof.propertyType === 'في_طور_التحفيظ') {
    return {
      status: 'تحويل_لمطلب_تحفيظ',
      reason: 'العقار في طور التحفيظ',
      nextSteps: 'يجب استكمال مسطرة التحفيظ العقاري',
      autoRedirect: true,
      redirectTarget: 'مطلب_تحفيظ'
    };
  }
  
  // مؤجل — طلب شواهد إضافية
  if (!conditions.isValid || !witnesses.isValid) {
    const missingItems: string[] = [];
    if (!conditions.isValid) missingItems.push(...conditions.failedConditions);
    if (!witnesses.isValid) missingItems.push(...witnesses.issues);
    
    return {
      status: 'مؤجل_لطلب_شواهد',
      reason: 'نقص في الشروط أو الشهود',
      nextSteps: `يجب استكمال:\n${missingItems.map(i => `• ${i}`).join('\n')}`,
      autoRedirect: false
    };
  }
  
  // مقبول للاستكمال
  return {
    status: 'مقبول_للاستكمال',
    reason: 'استوفى الشروط الأساسية',
    nextSteps: 'يمكن المتابعة في تلقي اللفيف' + (conditions.warnings.length > 0 ? `\n\nتنبيهات:\n${conditions.warnings.map(w => `• ${w}`).join('\n')}` : ''),
    autoRedirect: false
  };
}
