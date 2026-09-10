import { z } from 'zod';

export const JUDGE_APPROVED_STATUSES = ['accepted', 'accepted_with_notes', 'substantive_notes'] as const;

export const JUDGE_CITY_CODE_MAP: Record<string, string> = {
  chefchaouen: 'CHE',
  شفشاون: 'CHE',
  rabat: 'RAB',
  الرباط: 'RAB',
  casablanca: 'CAS',
  'الدار البيضاء': 'CAS',
  sale: 'SAL',
  سلا: 'SAL',
  fes: 'FES',
  فاس: 'FES',
  marrakech: 'MAR',
  مراكش: 'MAR',
  tanger: 'TAN',
  طنجة: 'TAN',
  tetouan: 'TET',
  تطوان: 'TET',
  agadir: 'AGA',
  أكادير: 'AGA',
  oujda: 'OUJ',
  وجدة: 'OUJ',
  kenitra: 'KEN',
  القنيطرة: 'KEN',
  meknes: 'MEK',
  مكناس: 'MEK',
};

export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export const SignedDeedCategorySchema = z.enum(['Marriage', 'Property', 'Inheritance', 'Divorce', 'Other']);
export type SignedDeedCategory = z.infer<typeof SignedDeedCategorySchema>;

export const SignedDeedWorkflowStatusSchema = z.enum([
  'NotSent',
  'PendingJudgeEndorsement',
  'JudgeEndorsed',
  'FinalArchived',
]);
export type SignedDeedWorkflowStatus = z.infer<typeof SignedDeedWorkflowStatusSchema>;

export type JudgeSubmissionWorkflowStatus =
  | 'pending'
  | 'in_review'
  | 'accepted'
  | 'accepted_with_notes'
  | 'substantive_notes';

export const OCRResultSchema = z.object({
  rawText: z.string(),
  extractedFields: z.object({
    name: z.string().optional(),
    idNumber: z.string().optional(),
    idIssueDate: z.string().optional(),
    idExpiryDate: z.string().optional(),
    nationality: z.string().optional(),
  }),
  confidence: z.number().min(0).max(100),
  errors: z.array(z.string()),
});
export type OCRResult = z.infer<typeof OCRResultSchema>;

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    severity: z.enum(['تحذير', 'خطأ', 'خطر']),
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const FeesAgentDocumentSchema = z.object({
  id: z.string().optional(),
  documentType: z.enum([
    'بيع_وشراء',
    'بيع_وشراء_معنوي',
    'بيع_وشراء_طور_انجاز_ابتدائي',
    'بيع_وشراء_طور_انجاز_نهائي',
    'بيع_وشراء_ملكية_مشتركة',
    'عقد_ايجار_المفضي_الى_تملك',
    'كراء_طويل_الامد',
    'عقد_تحبيس',
    'عقد_بيع_حق_الهواء_والتعلية',
    'عقد_تفويت_حق_السطحية',
    'ثبوت_زينة_عقار',
    'ثبوت_بناء',
    'عقد_العمري',
    'هبة',
    'مقاسمة',
    'صدقة',
    'رهن',
    'رهن_حيازي',
    'توكيل_رسمي',
    'رسم_الاقرار_ببنوة',
    'ثبوت_نسب_ببينة_السماع',
    'اتفاق_تدبير_اموال_زوجية',
    'أخرى',
    'اراثة',
    'بيان_فريضة',
    'احصاء_متروك',
    'زواج',
    'زواج_مختلط',
    'ملكية',
    'حيازة',
    'الاشهاد_على_الطلاق_الاتفاقي',
    'رسم_زواج',
    'رسم_طلاق',
    'رسم_أملاك',
    'رسم_تركات',
    'باقي_الوثائق',
  ]),
  seller: z.object({
    name: z.string(),
    idNumber: z.string(),
    idIssueDate: z.string(),
    idExpiryDate: z.string().optional(),
  }),
  buyer: z.object({
    name: z.string(),
    idNumber: z.string(),
    idIssueDate: z.string(),
    idExpiryDate: z.string().optional(),
  }),
  property: z.object({
    type: z.enum(['محفظ', 'غير_محفظ', 'منقول']),
    area_m2: z.number().optional(),
    boundaries: z.object({
      north: z.string(),
      south: z.string(),
      east: z.string(),
      west: z.string(),
    }),
    titleRef: z.string().optional(),
    titleRefDate: z.string().optional(),
    hasThirdPartyRights: z.enum(['نعم', 'لا']),
  }),
  finance: z.object({
    price: z.number().min(0),
    priceInWords: z.string(),
    paymentMethod: z.enum(['نقد', 'شيك', 'تحويل', 'قسط']),
    transferDetails: z.string().optional(),
    registeredWithTax: z.enum(['نعم', 'لا']),
  }),
  meta: z.object({
    fileNumber: z.string(),
    notaryPrimary: z.string(),
    notarySecondary: z.string().optional(),
    dateGregorian: z.string(),
    dateHijri: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  draft: z.string().optional(),
  status: z.enum(['draft', 'under_review', 'approved', 'signed']).optional(),
});
export type FeesAgentDocument = z.infer<typeof FeesAgentDocumentSchema>;

export const RasmPdfPayloadSchema = z.object({
  documentType: z.enum(['بيع_وشراء', 'هبة', 'مقاسمة', 'احصاء_متروك']),
  meta: z
    .object({
      fileNumber: z.string().optional(),
      dateGregorian: z.string().optional(),
      dateHijri: z.string().optional(),
      notaryPrimary: z.string().optional(),
      notarySecondary: z.string().optional(),
    })
    .optional(),
  sellers: z
    .array(z.object({
      name: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      idIssueDate: z.string().optional(),
      profession: z.string().optional(),
      share: z.string().optional(),
      nationality: z.string().optional(),
    }))
    .optional(),
  buyers: z
    .array(z.object({
      name: z.string().optional(),
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      idIssueDate: z.string().optional(),
      profession: z.string().optional(),
      share: z.string().optional(),
      nationality: z.string().optional(),
    }))
    .optional(),
  applicants: z
    .array(z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      idNumber: z.string().optional(),
      capacity: z.string().optional(),
    }))
    .optional(),
  inheritanceDeeds: z
    .array(z.object({
      book: z.string().optional(),
      page: z.string().optional(),
      number: z.string().optional(),
      date: z.string().optional(),
      notary: z.string().optional(),
    }))
    .optional(),
  inheritanceDescription: z.string().optional(),
  partitionDivisions: z
    .array(z.object({
      propertyDescription: z.string().optional(),
      area: z.string().optional(),
      length: z.string().optional(),
      width: z.string().optional(),
      boundaries: z
        .object({
          north: z.string().optional(),
          south: z.string().optional(),
          east: z.string().optional(),
          west: z.string().optional(),
        })
        .optional(),
      divisionValue: z.number().optional(),
      divisionValueInWords: z.string().optional(),
      beneficiaries: z
        .array(z.object({ name: z.string().optional(), share: z.string().optional() }))
        .optional(),
    }))
    .optional(),
  properties: z
    .array(z.object({
      type: z.string().optional(),
      propertyName: z.string().optional(),
      location: z.string().optional(),
      province: z.string().optional(),
      area_m2: z.number().optional(),
      length_m: z.number().optional(),
      width_m: z.number().optional(),
      boundaries: z
        .object({
          north: z.string().optional(),
          south: z.string().optional(),
          east: z.string().optional(),
          west: z.string().optional(),
        })
        .optional(),
      titleDocuments: z
        .array(z.object({
          feeType: z.string().optional(),
          bookReference: z.string().optional(),
          number: z.string().optional(),
          letter: z.string().optional(),
          page: z.string().optional(),
          count: z.string().optional(),
          date: z.string().optional(),
          correspondingDate: z.string().optional(),
        }))
        .optional(),
    }))
    .optional(),
  finance: z
    .object({
      price: z.number().optional(),
      priceInWords: z.string().optional(),
      paymentMethod: z.string().optional(),
      transferDetails: z.string().optional(),
    })
    .optional(),
});
export type RasmPdfPayload = z.infer<typeof RasmPdfPayloadSchema>;

