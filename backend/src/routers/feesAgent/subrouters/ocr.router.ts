import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { OCRResultSchema } from '../types';
import { OCRService } from '../../../services/ocr';

const ocrService = new OCRService();

export const ocrRouter = router({
  extractIDCard: publicProcedure
    .input(
      z.object({
        file: z.any().optional(),
        fileBase64: z.string().optional(),
        imageBase64: z.string().optional(),
        fileName: z.string().optional(),
      })
    )
    .output(OCRResultSchema)
    .mutation(async ({ input }) => {
      try {
        let buffer: Buffer | null = null;
        const candidateName = input.fileName || input.file?.name;

        const b64Input = input.fileBase64 || input.imageBase64;
        if (b64Input) {
          const clean = b64Input.replace(/^data:.*?;base64,/, '');
          buffer = Buffer.from(clean, 'base64');
        } else if (typeof input.file === 'string' && input.file.length > 50) {
          const clean = input.file.replace(/^data:.*?;base64,/, '');
          buffer = Buffer.from(clean, 'base64');
        } else if (input.file && typeof input.file === 'object' && input.file.base64) {
          const clean = String(input.file.base64).replace(/^data:.*?;base64,/, '');
          buffer = Buffer.from(clean, 'base64');
        } else if (Buffer.isBuffer(input.file)) {
          buffer = input.file;
        }

        if (buffer && buffer.length > 0) {
          const result = await ocrService.extractMoroccanCINFromImage(buffer, candidateName);
          return {
            rawText: result.rawText || '',
            extractedFields: {
              idNumber: result.extractedFields.idNumber,
              idIssueDate: result.extractedFields.idIssueDate,
              idExpiryDate: result.extractedFields.idExpiryDate,
              name: result.extractedFields.name,
              nationality: result.extractedFields.nationality || 'مغربية',
            },
            confidence: result.confidence,
            errors: result.errors,
          };
        }

        return {
          rawText: '',
          extractedFields: {
            nationality: 'مغربية',
          },
          confidence: 0,
          errors: ['لم يتم تزويد صورة صالحة للمعالجة'],
        };
      } catch (err) {
        console.error('OCR extractIDCard router error:', err);
        return {
          rawText: '',
          extractedFields: {
            nationality: 'مغربية',
          },
          confidence: 0,
          errors: [err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة صورة البطاقة'],
        };
      }
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
