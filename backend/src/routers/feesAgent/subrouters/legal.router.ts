import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { FeesAgentDocumentSchema } from '../types';

export const legalRouter = router({
  generateTaxClause: publicProcedure
    .input(z.object({ registeredWithTax: z.enum(['نعم', 'لا']) }))
    .output(z.string())
    .query(async ({ input }) => {
      return input.registeredWithTax === 'نعم'
        ? 'تم التسجيل بكل أصولية...'
        : 'يلتزم الطرفان بالتسجيل في 15 يوم...';
    }),
  generateThirdPartyClause: publicProcedure
    .input(z.object({
      hasThirdPartyRights: z.enum(['نعم', 'لا']),
      details: z.string().optional(),
    }))
    .output(z.string())
    .query(async ({ input }) => {
      return input.hasThirdPartyRights === 'لا'
        ? 'العقار خالٍ من حقوق الغير...'
        : `العقار مثقل بـ: ${input.details}...`;
    }),
  generateDraft: publicProcedure
    .input(FeesAgentDocumentSchema.omit({ draft: true, status: true }))
    .output(z.string())
    .mutation(async ({ input }) => {
      return `
رسم عدلي: ${input.documentType}
الرقم: ${input.meta.fileNumber}
التاريخ: ${input.meta.dateGregorian}

الأطراف:
- ${input.seller.name}
- ${input.buyer.name}

الموضوع: عقار من نوع ${input.property.type}
السعر: ${input.finance.price} درهم

توقيع العدل...
      `;
    }),
});

