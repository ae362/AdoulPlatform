import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { ValidationResultSchema } from '../types';

export const validationRouter = router({
  validateIDNumber: publicProcedure
    .input(z.object({ idNumber: z.string() }))
    .output(ValidationResultSchema)
    .query(async ({ input }) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      if (!/^\d{10}$/.test(input.idNumber)) {
        errors.push({
          field: 'idNumber',
          message: 'رقم البطاقة يجب أن يكون 10 أرقام',
          severity: 'خطأ',
        });
      }
      return { isValid: errors.length === 0, errors, warnings };
    }),
  validateIDExpiry: publicProcedure
    .input(z.object({ issueDate: z.string(), expiryDate: z.string() }))
    .output(ValidationResultSchema)
    .query(async ({ input }) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      const expiryTime = new Date(input.expiryDate).getTime();
      const now = new Date().getTime();
      if (expiryTime < now) {
        errors.push({
          field: 'idExpiryDate',
          message: 'البطاقة منتهية الصلاحية',
          severity: 'خطر',
        });
      }
      return { isValid: errors.length === 0, errors, warnings };
    }),
  validateProperty: publicProcedure
    .input(z.object({
      type: z.enum(['محفظ', 'غير_محفظ', 'منقول']),
      boundaries: z.record(z.string()),
      titleRef: z.string().optional(),
    }))
    .output(ValidationResultSchema)
    .query(async ({ input }) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      if (input.type !== 'منقول') {
        const missingBoundaries = Object.values(input.boundaries).filter((v) => !v || v.trim() === '').length;
        if (missingBoundaries > 0) {
          errors.push({
            field: 'boundaries',
            message: `${missingBoundaries} حدود مفقودة`,
            severity: 'خطأ',
          });
        }
        if (input.type === 'غير_محفظ' && !input.titleRef) {
          warnings.push({
            field: 'titleRef',
            message: 'عقار غير محفظ بدون مرجع',
            suggestion: 'أرفق إقرار الشهود',
          });
        }
      }
      return { isValid: errors.length === 0, errors, warnings };
    }),
  validatePrice: publicProcedure
    .input(z.object({ price: z.number(), propertyType: z.string() }))
    .output(ValidationResultSchema)
    .query(async ({ input }) => {
      const errors: any[] = [];
      const warnings: any[] = [];
      if (input.price <= 0) {
        errors.push({
          field: 'price',
          message: 'السعر يجب أن يكون موجباً',
          severity: 'خطأ',
        });
      }
      if (input.price < 50000 && input.propertyType !== 'منقول') {
        warnings.push({
          field: 'price',
          message: 'السعر قد يثير شبهات التهرب الضريبي',
          suggestion: 'تحقق من معقولية السعر',
        });
      }
      return { isValid: errors.length === 0, errors, warnings };
    }),
});

