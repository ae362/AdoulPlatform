import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { OCRResultSchema } from '../types';

export const ocrRouter = router({
  extractIDCard: publicProcedure
    .input(z.object({ file: z.any() }))
    .output(OCRResultSchema)
    .mutation(async ({ input }) => {
      return {
        rawText: 'extracted text from image',
        extractedFields: {
          name: 'محمد أحمد علي',
          idNumber: '1234567890',
          idIssueDate: '2015-01-15',
          idExpiryDate: '2030-01-15',
          nationality: 'مغربية',
        },
        confidence: 92,
        errors: [],
      };
    }),
  extractTitleDocument: publicProcedure
    .input(z.object({ file: z.any() }))
    .output(z.object({
      titleRef: z.string().optional(),
      titleRefDate: z.string().optional(),
      propertyType: z.string().optional(),
      area_m2: z.number().optional(),
      confidence: z.number(),
      errors: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return {
        titleRef: 'أ/123/456',
        titleRefDate: '2020-06-15',
        propertyType: 'محفظ',
        area_m2: 250,
        confidence: 85,
        errors: [],
      };
    }),
  compareWithExtracted: publicProcedure
    .input(z.object({
      field: z.string(),
      manualEntry: z.string(),
      extractedValue: z.string(),
    }))
    .output(z.object({
      match: z.boolean(),
      similarity: z.number(),
      suggestion: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const similarity = input.manualEntry.toLowerCase() === input.extractedValue.toLowerCase() ? 1 : 0.75;
      return {
        match: similarity > 0.85,
        similarity,
        suggestion: similarity < 0.85
          ? `هل قصدت: "${input.extractedValue}"؟`
          : undefined,
      };
    }),
});
