/**
 * ملف خدمات الذكاء الاصطناعي والتدقيق التلقائي
 * AI Services & Automated Validation
 * 
 * يتضمن:
 * 1. استخراج البيانات من الوثائق (OCR + NER)
 * 2. التدقيق القانوني الذكي
 * 3. توليد النصوص القانونية
 * 4. التحقق من الصيغ والبيانات
 */

// ============================================================================
// 1. OCR & DOCUMENT EXTRACTION
// ============================================================================

export interface OCRResult {
  rawText: string;
  extractedFields: {
    name?: string;
    idNumber?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    nationality?: string;
  };
  confidence: number; // 0-100
  errors: string[];
}

/**
 * استخراج البيانات من صورة بطاقة وطنية
 */
export async function extractFromIDCard(file: File): Promise<OCRResult> {
  try {
    // هنا سيتم استدعاء API OCR (مثل Google Vision أو Tesseract)
    // للتطبيق الحالي، نستخدم محاكاة
    const formData = new FormData();
    formData.append('file', file);

    // استدعاء خدمة OCR من الـ Backend
    const response = await fetch('/api/ocr/extract-id-card', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('فشل استخراج البيانات من بطاقة الهوية');

    const result = await response.json();
    return result as OCRResult;
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      rawText: '',
      extractedFields: {},
      confidence: 0,
      errors: [(error as Error).message],
    };
  }
}

/**
 * استخراج البيانات من سند ملكية / مرجع تسجيل
 */
export async function extractFromTitleDocument(file: File): Promise<OCRResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ocr/extract-title-doc', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('فشل استخراج البيانات من سند الملكية');

    const result = await response.json();
    return result as OCRResult;
  } catch (error) {
    console.error('Title Document OCR Error:', error);
    return {
      rawText: '',
      extractedFields: {},
      confidence: 0,
      errors: [(error as Error).message],
    };
  }
}

// ============================================================================
// 2. DATA VALIDATION & VERIFICATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'تحذير' | 'خطأ' | 'خطر';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

/**
 * التحقق من صيغة رقم البطاقة الوطنية المغربية
 */
export function validateMoroccanIDNumber(idNumber: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // يجب أن يكون 10 أرقام
  if (!/^\d{10}$/.test(idNumber)) {
    errors.push({
      field: 'idNumber',
      message: 'رقم البطاقة يجب أن يتكون من 10 أرقام',
      severity: 'خطأ',
    });
  }

  // فحص رقم التحقق (Checksum) — صيغة مغربية بسيطة
  const sum = idNumber.split('').reduce((acc, digit, idx) => {
    const weight = (idx % 2) + 1;
    return acc + parseInt(digit) * weight;
  }, 0);

  if (sum % 10 !== 0) {
    warnings.push({
      field: 'idNumber',
      message: 'قد يكون رقم البطاقة غير صحيح',
      suggestion: 'تحقق من الرقم وأعد إدخاله',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * التحقق من صلاحية تاريخ البطاقة
 */
export function validateIDExpiryDate(issueDate: string, expiryDate: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const issueTime = new Date(issueDate).getTime();
  const expiryTime = new Date(expiryDate).getTime();
  const now = new Date().getTime();

  if (issueTime > expiryTime) {
    errors.push({
      field: 'idDates',
      message: 'تاريخ الإصدار لا يمكن أن يكون بعد تاريخ الانتهاء',
      severity: 'خطأ',
    });
  }

  if (expiryTime < now) {
    errors.push({
      field: 'idExpiryDate',
      message: 'البطاقة منتهية الصلاحية',
      severity: 'خطر',
    });
  }

  if (expiryTime - now < 90 * 24 * 60 * 60 * 1000) {
    warnings.push({
      field: 'idExpiryDate',
      message: 'البطاقة ستنتهي صلاحيتها خلال 3 أشهر',
      suggestion: 'قد تحتاج إلى تجديد البطاقة',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * التحقق من بيانات العقار والحدود
 */
export function validatePropertyData(
  propertyType: string,
  boundaries: Record<string, string>,
  titleRef: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (propertyType !== 'منقول') {
    // فحص اكتمال الحدود
    const missingBoundaries = Object.entries(boundaries)
      .filter(([, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingBoundaries.length > 0) {
      errors.push({
        field: 'boundaries',
        message: `الحدود التالية مفقودة: ${missingBoundaries.join('، ')}`,
        severity: 'خطأ',
      });
    }

    // تحذير إذا كان العقار غير محفظ وبدون مرجع تسجيل واضح
    if (propertyType === 'غير_محفظ' && !titleRef) {
      warnings.push({
        field: 'titleRef',
        message: 'عقار غير محفظ بدون مرجع تسجيل',
        suggestion: 'يجب إرفاق إقرار الشهود وإجراءات الحيازة',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * التحقق من السعر والقيمة المعقولة
 */
export function validatePrice(price: number, propertyType: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (price <= 0) {
    errors.push({
      field: 'price',
      message: 'السعر يجب أن يكون موجباً',
      severity: 'خطأ',
    });
  }

  // تحذير من الأسعار المريبة (قد تكون تهرباً ضريبياً)
  if (price < 50000 && propertyType !== 'منقول') {
    warnings.push({
      field: 'price',
      message: 'السعر قد يثير شبهات التهرب الضريبي',
      suggestion: 'تحقق من معقولية السعر بالنسبة للعقار والموقع',
    });
  }

  // تحذير من الأسعار المرتفعة جداً
  if (price > 10000000) {
    warnings.push({
      field: 'price',
      message: 'السعر مرتفع جداً — تأكد من دقة الإدخال',
      suggestion: 'هل هذا هو السعر الصحيح؟',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 3. LEGAL TEXT GENERATION
// ============================================================================

/**
 * توليد بند إلزامي بشأن التسجيل الضريبي
 */
export function generateTaxRegistrationClause(registeredWithTax: 'نعم' | 'لا'): string {
  if (registeredWithTax === 'نعم') {
    return `
تم التسجيل بمصلحة التسجيل والرسوم الضريبية:
يقر الطرفان بأن هذا العقد قد تم تسجيله بمصلحة التسجيل والضرائب بكل أصولية،
وبالتالي يكون الآثار الضريبية محفوظة بموجب القانون.
    `;
  }

  return `
الالتزام بالتسجيل الضريبي:
يلتزم الطرفان بتسجيل هذا العقد في مصلحة التسجيل والرسوم الضريبية في أجل أقصاه 
خمسة عشر (15) يوماً من تاريخ هذا التوثيق. وفي حالة عدم الامتثال، تترتب عليهما 
الآثار القانونية والضريبية، بما في ذلك الغرامات والعقوبات كما ينص عليها القانون.
    `;
}

/**
 * توليد بند بشأن حقوق الغير والرهون
 */
export function generateThirdPartyRightsClause(
  hasThirdPartyRights: 'نعم' | 'لا',
  details?: string
): string {
  if (hasThirdPartyRights === 'لا') {
    return `
الملكية الحرة:
يقر البائع أن العقار المبيع خالٍ من أي حقوق للغير أو رهون أو إيقافات أو أي تكليفات قانونية.
    `;
  }

  return `
حقوق الغير والتكليفات:
يقر البائع بوجود الحقوق والتكليفات التالية على العقار:
${details || '(يتم تفصيل الحقوق حسب الحالة)'}

ويقبل المشتري هذه الحقوق والتكليفات مع كامل علمه بها.
  `;
}

/**
 * توليد بند بشأن حالة العقار (محفظ/غير محفظ)
 */
export function generatePropertyStatusClause(
  propertyType: string,
  titleRef?: string
): string {
  if (propertyType === 'محفظ') {
    return `
العقار المحفظ:
المبيع عقار محفظ برسم ملكية رقم ${titleRef || '————'}، 
مسجل بدائرة التحفيظ العقاري ب ————.
    `;
  }

  if (propertyType === 'غير_محفظ') {
    return `
العقار غير المحفظ:
المبيع عقار غير محفظ، يقر الطرفان بكامل علمهما بهذه الحالة.
يلتزم البائع بإثبات ملكيته من خلال:
• إقرار من الشهود بعدد لا يقل عن شاهدين
• الحيازة الفعلية والسلمية لمدة لا تقل عن سنة واحدة
• إثبات الاستغلال والتطوير

ويقبل المشتري هذه الشروط ويلتزم باتباعها عند تسجيل العقار لاحقاً.
    `;
  }

  return `
العقار المنقول:
المبيع عبارة عن منقول موصوف بـ: ————.
    `;
}

// ============================================================================
// 4. COMPARISON & MATCHING
// ============================================================================

/**
 * مقارنة البيانات المدخلة مع البيانات المستخرجة من OCR
 */
export function compareWithOCR(
  manualEntry: string,
  ocrExtracted: string
): {
  match: boolean;
  similarity: number;
  issues: string[];
} {
  // حساب التشابه باستخدام Levenshtein Distance
  const similarity = calculateSimilarity(manualEntry, ocrExtracted);
  const match = similarity > 0.85; // 85% تشابه يعتبر مطابقة

  const issues: string[] = [];
  if (!match) {
    issues.push(`عدم تطابق: المدخل="${manualEntry}" vs OCR="${ocrExtracted}"`);
  }

  return { match, similarity, issues };
}

/**
 * حساب نسبة التشابه بين نصين (Levenshtein Distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let j = 0; j <= s1.length; j++) {
    let lastValue = j;
    for (let i = 1; i <= s2.length; i++) {
      const newValue = costs[i - 1];
      costs[i - 1] = lastValue;
      lastValue =
        s1.charAt(j - 1) === s2.charAt(i - 1)
          ? costs[i]
          : Math.min(costs[i], lastValue) + 1;
    }
    costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// ============================================================================
// 5. AUDIT & COMPLIANCE
// ============================================================================

export interface ComplianceReport {
  timestamp: string;
  documentType: string;
  checksPerformed: ComplianceCheck[];
  overallStatus: 'نجح' | 'تحذير' | 'فشل';
  recommendations: string[];
}

export interface ComplianceCheck {
  name: string;
  status: 'نجح' | 'تحذير' | 'فشل';
  details: string;
}

/**
 * إنشاء تقرير امتثال قانوني شامل
 */
export function generateComplianceReport(
  documentType: string,
  allValidationResults: ValidationResult[]
): ComplianceReport {
  const checks: ComplianceCheck[] = [];
  let failureCount = 0;
  let warningCount = 0;

  // فحص شامل
  checks.push({
    name: 'التحقق من بيانات الأطراف',
    status: allValidationResults[0]?.isValid ? 'نجح' : 'فشل',
    details: allValidationResults[0]?.errors[0]?.message || 'جميع البيانات صحيحة',
  });

  checks.push({
    name: 'التحقق من بيانات العقار',
    status: allValidationResults[1]?.isValid ? 'نجح' : 'فشل',
    details: allValidationResults[1]?.errors[0]?.message || 'جميع البيانات صحيحة',
  });

  // عد الأخطاء والتحذيرات
  allValidationResults.forEach((result) => {
    failureCount += result.errors.length;
    warningCount += result.warnings.length;
  });

  const overallStatus = failureCount > 0 ? 'فشل' : warningCount > 0 ? 'تحذير' : 'نجح';

  const recommendations: string[] = [];
  if (documentType === 'غير_محفظ') {
    recommendations.push('تأكد من توافر إقرار الشهود وإجراءات الحيازة');
  }
  if (failureCount > 0) {
    recommendations.push('اصلح الأخطاء المذكورة قبل الإصدار');
  }

  return {
    timestamp: new Date().toLocaleString('ar-SA'),
    documentType,
    checksPerformed: checks,
    overallStatus,
    recommendations,
  };
}

// ============================================================================
// 6. PDF GENERATION
// ============================================================================

/**
 * توليد PDF موقع للرسم العدلي
 */
export async function generateSignedPDF(
  documentContent: string,
  notarySignature: string,
  fileNumber: string
): Promise<Blob> {
  try {
    const response = await fetch('/api/pdf/generate-signed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: documentContent,
        signature: notarySignature,
        fileNumber,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('فشل توليد PDF');

    return await response.blob();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const FeesAgentAI = {
  ocr: {
    extractFromIDCard,
    extractFromTitleDocument,
  },
  validation: {
    validateMoroccanIDNumber,
    validateIDExpiryDate,
    validatePropertyData,
    validatePrice,
  },
  legal: {
    generateTaxRegistrationClause,
    generateThirdPartyRightsClause,
    generatePropertyStatusClause,
  },
  compliance: {
    generateComplianceReport,
  },
  pdf: {
    generateSignedPDF,
  },
};
