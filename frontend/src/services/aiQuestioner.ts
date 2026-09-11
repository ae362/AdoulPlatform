/**
 * AI Questioner Service
 * يطرح الأسئلة الذكية على المستخدم بناءً على القوانين المغربية
 * ويوجهه خطوة بخطوة لملء النموذج
 */

import type { FeesAgentState, PropertyType } from '../types/feesAgentTypes';
import type { DocumentType } from '../constants/feesAgentLocales';

// ============================================================================
// TYPES
// ============================================================================

export interface AIQuestion {
  id: string;
  text: string;
  hint?: string;
  examples?: string[];
  requiredFor?: string[];
  nextQuestion?: (answer: string | boolean | number) => AIQuestion | null;
}

export interface QuestionerContext {
  step: number;
  documentType: DocumentType | '';
  hasThirdPartyRights: boolean;
  propertyIsRegistered: boolean;
  priceInWords: string;
}

// ============================================================================
// STEP 0: DOCUMENT TYPE QUESTIONS
// ============================================================================

export const step0Questions = {
  documentType: {
    id: 'doc-type-1',
    text: 'ما نوع الرسم العدلي الذي تريد إنشاؤه؟',
    hint: 'اختر النوع الذي ينطبق على معاملتك',
    examples: [
      'بيع وشراء عقار',
      'هبة لأحد الأقارب',
      'مقاسمة عقار مشترك',
      'توكيل رسمي',
      'رهن عقاري',
    ],
  } as AIQuestion,
};

// ============================================================================
// STEP 1: PARTIES QUESTIONS (بناءً على القانون المغربي)
// ============================================================================

export const step1Questions = {
  sellerInfo: {
    id: 'party-1',
    text: 'ما هو الاسم الكامل للطرف الأول (البائع/المتصرف)؟',
    hint: 'يجب أن يطابق اسم البطاقة الوطنية تماماً (من الناحية القانونية)',
    examples: ['محمد علي بن عبدالسلام', 'فاطمة أحمد الفقيه'],
  } as AIQuestion,

  sellerID: {
    id: 'party-2',
    text: 'ما هو رقم البطاقة الوطنية للطرف الأول؟',
    hint: 'رقم 10 أرقام من البطاقة الوطنية المغربية',
    examples: ['1234567890', 'AB123456'],
  } as AIQuestion,

  sellerIDExpiry: {
    id: 'party-3',
    text: 'ما هو تاريخ انتهاء صلاحية البطاقة الوطنية؟',
    hint: 'تحذير: إذا كانت منتهية الصلاحية > 3 أشهر، فقد لا تكون صحيحة قانوناً',
    examples: ['2025-12-31', '2026-06-15'],
  } as AIQuestion,

  buyerInfo: {
    id: 'party-4',
    text: 'ما هو الاسم الكامل للطرف الثاني (المشتري/المستقبل)؟',
    hint: 'يجب أن يطابق اسم البطاقة الوطنية تماماً',
    examples: ['عائشة محمد الزهراء', 'علي حسن المرغني'],
  } as AIQuestion,

  buyerID: {
    id: 'party-5',
    text: 'ما هو رقم البطاقة الوطنية للطرف الثاني؟',
    hint: 'رقم 10 أرقام من البطاقة الوطنية المغربية',
    examples: ['9876543210'],
  } as AIQuestion,

  buyerIDExpiry: {
    id: 'party-6',
    text: 'ما هو تاريخ انتهاء صلاحية بطاقة الطرف الثاني؟',
    hint: 'تحذير: إذا كانت منتهية الصلاحية > 3 أشهر، فقد لا تكون صحيحة قانوناً',
    examples: ['2026-01-20'],
  } as AIQuestion,
};

// ============================================================================
// STEP 2: PROPERTY QUESTIONS (بناءً على القانون العقاري المغربي)
// ============================================================================

export const step2Questions = {
  propertyType: {
    id: 'prop-1',
    text: 'ما نوع العقار؟',
    hint: 'محفظ = لديه رسم ملكية رسمي | غير محفظ = لم يتم تسجيله رسمياً',
    examples: ['عقار محفظ (في محافظ العقار)', 'عقار غير محفظ (تقليدي)'],
  } as AIQuestion,

  titleRef: {
    id: 'prop-2',
    text: 'ما هو رقم الرسم في محافظ العقار؟',
    hint: 'مثال: 123/45 أو 456/78/1',
    examples: ['123/45', '456/78/1', '789/90'],
  } as AIQuestion,

  boundaries: {
    id: 'prop-3',
    text: 'ما هي الحدود الأربعة للعقار (الشمال، الجنوب، الشرق، الغرب)؟',
    hint: 'تحديد دقيق للحدود مطلوب قانوناً لتجنب النزاعات',
    examples: ['الشمال: شارع عام | الجنوب: عقار محمد علي'],
  } as AIQuestion,

  area: {
    id: 'prop-4',
    text: 'ما هي مساحة العقار بالمتر المربع؟',
    hint: 'أدخل الرقم فقط (بدون وحدة)',
    examples: ['120', '250.5', '1000'],
  } as AIQuestion,

  thirdPartyRights: {
    id: 'prop-5',
    text: 'هل للعقار حقوق تابعة لأطراف أخرى (رهن، تحفيظ، إلخ)؟',
    hint: 'هام جداً: يجب الإفصاح عن أي حقوق أخرى (القانون المغربي يتطلب ذلك)',
    examples: ['لا توجد حقوق أخرى', 'هناك رهن بنكي قيد التسجيل'],
  } as AIQuestion,

  thirdPartyDetails: {
    id: 'prop-6',
    text: 'ما هي تفاصيل حقوق الأطراف الأخرى؟',
    hint: 'أذكر نوع الحق والطرف المعني (البنك، الشخص، إلخ)',
    examples: ['رهن لبنك الاعتماد المغربي - مبلغ 100,000 درهم'],
  } as AIQuestion,
};

// ============================================================================
// STEP 3: FINANCE QUESTIONS (بناءً على القوانين الضريبية المغربية)
// ============================================================================

export const step3Questions = {
  price: {
    id: 'fin-1',
    text: 'ما هو السعر الإجمالي للعملية (بالدرهم المغربي)؟',
    hint: 'يجب أن يكون الثمن الحقيقي (القانون المغربي يحظر التلاعب بالأسعار)',
    examples: ['500,000', '1,250,000', '150,000'],
  } as AIQuestion,

  suspiciousPrice: {
    id: 'fin-2',
    text: '⚠️ تحذير: السعر يبدو منخفضاً جداً مقارنة بسعر السوق. هل هذا صحيح؟',
    hint: 'التلاعب بالأسعار قد يعرضك لعقوبات قانونية',
    examples: ['نعم، هذا هو السعر الفعلي', 'لا، دعني أصحح السعر'],
  } as AIQuestion,

  paymentMethod: {
    id: 'fin-3',
    text: 'ما هي طريقة الدفع؟',
    hint: 'نقد = دفع فوري | شيك = بشيك | تحويل = تحويل بنكي | قسط = دفعات',
    examples: ['دفع نقداً', 'شيك بنكي', 'تحويل بنكي', 'دفعات دورية'],
  } as AIQuestion,

  taxRegistration: {
    id: 'fin-4',
    text: '🔴 هل تم تسجيل العملية لدى مصلحة الضرائب؟',
    hint: 'مطلوب قانوناً: يجب التسجيل في غضون 15 يوماً من توثيق العقد (القانون المغربي)',
    examples: [
      'نعم، تم التسجيل',
      'لا، سيتم التسجيل لاحقاً (سيتم توليد إشعار إلزامي)',
    ],
  } as AIQuestion,

  transferDetails: {
    id: 'fin-5',
    text: 'إذا كان الدفع بتحويل بنكي، ما هي تفاصيل التحويل؟',
    hint: 'رقم التحويل، البنك، التاريخ، إلخ',
    examples: ['تحويل من بنك الاعتماد - رقم 12345 - 2025-12-06'],
  } as AIQuestion,
};

// ============================================================================
// STEP 4: DATE QUESTIONS
// ============================================================================

export const step4Questions = {
  gregorianDate: {
    id: 'date-1',
    text: 'ما هو التاريخ الميلادي للعملية؟',
    hint: 'تاريخ توثيق الوثيقة (YYYY-MM-DD)',
    examples: ['2025-12-06', '2025-12-15'],
  } as AIQuestion,

  fileNumber: {
    id: 'date-2',
    text: 'ما هو رقم الملف / رقم القيد؟',
    hint: 'رقم تسلسلي من محرر العقد',
    examples: ['2025/001', '2025-000123'],
  } as AIQuestion,

  notaries: {
    id: 'date-3',
    text: 'من هم العدول الموثقون للعملية؟',
    hint: 'أسماء العدول (الموثقين) الموقعين على الوثيقة',
    examples: ['محمد علي الشامي و أحمد حسن المرغني'],
  } as AIQuestion,
};

// ============================================================================
// MAIN QUESTIONER LOGIC
// ============================================================================

export class AIQuestioner {
  /**
   * الحصول على السؤال التالي بناءً على الخطوة الحالية والحالة
   */
  static getNextQuestion(
    context: QuestionerContext,
    answeredQuestions: string[] = []
  ): AIQuestion | null {
    const { step, documentType } = context;

    switch (step) {
      case 0:
        if (!answeredQuestions.includes('doc-type-1')) {
          return step0Questions.documentType;
        }
        return null;

      case 1:
        const step1Qs = [
          'party-1', // sellerInfo
          'party-2', // sellerID
          'party-3', // sellerIDExpiry
          'party-4', // buyerInfo
          'party-5', // buyerID
          'party-6', // buyerIDExpiry
        ];

        for (const qId of step1Qs) {
          if (!answeredQuestions.includes(qId)) {
            return step1Questions[qId as keyof typeof step1Questions];
          }
        }
        return null;

      case 2:
        const step2Qs = [
          'prop-1', // propertyType
          'prop-2', // titleRef (إذا كان محفظ)
          'prop-3', // boundaries
          'prop-4', // area
          'prop-5', // thirdPartyRights
          'prop-6', // thirdPartyDetails (إذا أجاب نعم)
        ];

        for (const qId of step2Qs) {
          if (!answeredQuestions.includes(qId)) {
            // تخطي titleRef إذا كان العقار غير محفظ
            if (qId === 'prop-2' && context.propertyIsRegistered === false) {
              continue;
            }
            // تخطي thirdPartyDetails إذا كان الجواب لا
            if (qId === 'prop-6' && context.hasThirdPartyRights === false) {
              continue;
            }
            return step2Questions[qId as keyof typeof step2Questions];
          }
        }
        return null;

      case 3:
        const step3Qs = [
          'fin-1', // price
          'fin-2', // suspiciousPrice (شرطي)
          'fin-3', // paymentMethod
          'fin-4', // taxRegistration
          'fin-5', // transferDetails (شرطي)
        ];

        for (const qId of step3Qs) {
          if (!answeredQuestions.includes(qId)) {
            // تخطي suspiciousPrice إذا كان السعر عادي
            if (qId === 'fin-2') {
              // ستحدد الخوارزمية ما إذا كان السعر مريب
              continue;
            }
            // تخطي transferDetails إذا لم تكن طريقة الدفع تحويل
            if (qId === 'fin-5') {
              continue;
            }
            return step3Questions[qId as keyof typeof step3Questions];
          }
        }
        return null;

      case 4:
        const step4Qs = ['date-1', 'date-2', 'date-3'];

        for (const qId of step4Qs) {
          if (!answeredQuestions.includes(qId)) {
            return step4Questions[qId as keyof typeof step4Questions];
          }
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * الحصول على اقتراحات بناءً على القوانين المغربية
   */
  static getSuggestions(context: QuestionerContext): string[] {
    const suggestions: string[] = [];

    // تحذيرات قانونية مشتركة
    if (context.step === 1) {
      suggestions.push('💡 تذكر: الاسم يجب أن يطابق البطاقة الوطنية تماماً');
      suggestions.push('⚠️ البطاقة الوطنية يجب أن تكون صالحة (لم تنتهِ صلاحيتها)');
    }

    if (context.step === 2) {
      suggestions.push('📋 تحديد الحدود بدقة يقلل من النزاعات المستقبلية');
      suggestions.push(
        '🔴 الإفصاح عن حقوق الأطراف الأخرى إلزامي قانوناً (تجنب عدم الامتثال)'
      );
    }

    if (context.step === 3) {
      suggestions.push('💰 تجنب التلاعب بالأسعار (قد يعرضك للمساءلة القانونية)');
      suggestions.push('🔴 التسجيل الضريبي مطلوب في غضون 15 يوماً من التوثيق');
    }

    return suggestions;
  }

  /**
   * التحقق من الامتثال للقوانين المغربية
   */
  static checkLegalCompliance(context: QuestionerContext, state: any): string[] {
    const issues: string[] = [];

    // Step 1: التحقق من البطاقات
    if (state.sellers && Array.isArray(state.sellers)) {
      state.sellers.forEach((seller: any) => {
        if (seller?.idNumber && seller.idNumber.length !== 10) {
          issues.push(`❌ رقم بطاقة (${seller.name || 'الطرف'}) يجب أن يكون 10 أرقام`);
        }
      });
    } else if (state.seller?.idNumber && state.seller.idNumber.length !== 10) {
      // Fallback for old state structure
      issues.push('❌ رقم بطاقة الطرف الأول يجب أن يكون 10 أرقام');
    }

    // Real estate specific checks
    const isRealEstate = !['زواج', 'زواج_مختلط', 'استمرار_الزوجية', 'طلاق', 'الاشهاد_على_الطلاق_الاتفاقي', 'ثبوت_نسب_ببينة_السماع', 'رسم_الاقرار_ببنوة', 'وصية', 'مخالعة'].includes(context.documentType);

    if (isRealEstate && context.step >= 2) {
      // Step 2: التحقق من الحدود
      const { north, south, east, west } = state.property?.boundaries || {};
      if (!north || !south || !east || !west) {
        issues.push('⚠️ يفضل تحديد جميع الحدود (شمال، جنوب، شرق، غرب)');
      }
    }

    if (isRealEstate && context.step >= 3) {
      // Step 3: التحقق من الضرائب
      if (state.finance?.registeredWithTax === 'لا') {
        issues.push('🔴 تحذير: يجب التسجيل الضريبي في غضون 15 يوماً من التوثيق');
      }
    }

    return issues;
  }

  /**
   * الحصول على رسالة الترحيب بناءً على نوع الرسم
   */
  static getWelcomeMessage(documentType: string): string {
    const messages: Record<string, string> = {
      بيع_وشراء:
        'أهلاً بك في وكيل الرسوم العدلية الذكي 🤖\nسنساعدك في توثيق عملية بيع وشراء عقار بناءً على القوانين المغربية\nدعنا نبدأ بجمع المعلومات المطلوبة...',
      بيع_وشراء_ملكية_مشتركة:
        'أهلاً بك 🤖\nسنوثق عملية بيع وشراء عقار في الملكية المشتركة\nهام: يجب تحديد نسب الملكية لكل مالك\nدعنا نجمع المعلومات المطلوبة...',
      عقد_ايجار_المفضي_الى_تملك:
        'أهلاً بك 🤖\nسنوثق عقد إيجار مفضي إلى تملك عقار\nهام: يجب تحديد مدة الإيجار والأقساط وشروط الملكية\nدعنا نجمع المعلومات المطلوبة...',
      بيع_وشراء_طور_انجاز_ابتدائي:
        'أهلاً بك 🤖\nسنوثق عقد بيع أولي لعقار في طور الإنجاز\nهام: يجب توفر شهادة الأساسات والتصاميم التقنية\nدعنا نجمع المعلومات المطلوبة...',
      بيع_وشراء_طور_انجاز_نهائي:
        'أهلاً بك 🤖\nسنوثق عقد بيع نهائي لعقار في طور الإنجاز\nهام: يجب أن يكون العقار في مرحلة متقدمة من الإنجاز\nدعنا نبدأ بجمع المعلومات...',
      بيع_وشراء_معنوي:
        'أهلاً بك 🤖\nسنوثق عملية بيع وشراء بمشاركة شخص معنوي\nتذكر: يجب توثيق صفة الشخص المعنوي والسلطات المخولة',
      هبة:
        'أهلاً بك 🤖\nسنوثق هبة عقار وفقاً للقوانين المغربية\nتذكر: الهبة يجب أن تكون طوعية وخالية من الشروط',
      مقاسمة:
        'أهلاً بك 🤖\nسنوثق مقاسمة عقار مشترك بناءً على الشريعة الإسلامية والقانون المغربي',
      صدقة:
        'أهلاً بك 🤖\nسنوثق صدقة عقار (عمل خيري) وفقاً للقوانين المغربية',
      رهن:
        'أهلاً بك 🤖\nسنوثق رهن عقاري بناءً على القانون المغربي\nهام: الرهن يجب أن يكون مسجلاً رسمياً',
      توكيل_رسمي:
        'أهلاً بك 🤖\nسنوثق توكيلاً رسمياً للتصرف في عقار\nتذكر: التوكيل يجب أن يكون محدداً وواضحاً',
      أخرى:
        'أهلاً بك 🤖\nسنساعدك في توثيق وثيقة عدلية\nأخبرنا بالمزيد من التفاصيل...',
      '': 'أهلاً بك في وكيل الرسوم العدلية الذكي 🤖\nدعنا نبدأ باختيار نوع الرسم العدلي الذي تريد إنشاؤه',
    };

    return messages[documentType] || messages[''];
  }
}
