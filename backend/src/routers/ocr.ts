import { router, publicProcedure } from './trpc';
import { OCRService } from '../services/ocr';
import { VisionService } from '../services/vision';
import { z } from 'zod';

const ocr = new OCRService();
const vision = new VisionService();

const documentSchema = z.object({
  base64: z.string(),
  subject: z.enum(['husband', 'wife', 'other']),
  filename: z.string(),
});

export const ocrRouter = router({
  parseText: publicProcedure
    .input(z.object({ base64: z.string() }))
    .mutation(({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      return ocr.extractOcrFromDocument(buffer);
    }),

  // Process multiple documents using Ollama vision for marriage records
  processMarriageDocuments: publicProcedure
    .input(z.object({ documents: z.array(documentSchema) }))
    .mutation(async ({ input }) => {
      console.log('=== processMarriageDocuments CALLED ===');
      console.log('Number of documents:', input.documents.length);
      
      const docs = input.documents.map((doc) => ({
        buffer: Buffer.from(doc.base64, 'base64'),
        subject: doc.subject,
        filename: doc.filename,
      }));
      
      console.log('Documents prepared, calling vision service...');
      const result = await vision.extractMarriageDocuments(docs);
      console.log('Vision service completed. Extracted fields:', Object.keys(result.extractedData).length);
      
      return result;
    }),

  // Check if Ollama vision is available
  checkVisionAvailability: publicProcedure.query(() => {
    return vision.checkAvailability();
  }),

  // Fallback: use Tesseract OCR for single document
  parseTextFallback: publicProcedure
    .input(z.object({ base64: z.string() }))
    .mutation(({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      return ocr.extractOcrFromDocument(buffer);
    }),
});
