import { z } from 'zod';
import { router, protectedProcedure } from './trpc';
import { AIService, type ContractDraftInput, type ContractReviewInput } from '../services/ai';
import { sanitizePlainText, deepSanitizeObject } from '../utils/inputSanitizer';

const aiService = new AIService();

export const aiRouter = router({
  generateDraft: protectedProcedure
    .input(z.object({ contractType: z.string(), parties: z.string(), details: z.string().optional() }))
    .mutation(({ input }) =>
      aiService.generateContractDraft({
        contractType: sanitizePlainText(input.contractType),
        parties: sanitizePlainText(input.parties),
        details: input.details ? sanitizePlainText(input.details) : undefined,
      } as ContractDraftInput)
    ),
  reviewContract: protectedProcedure
    .input(z.object({ recordType: z.string(), payload: z.any() }))
    .mutation(({ input }) =>
      aiService.reviewContractLegality({
        recordType: sanitizePlainText(input.recordType),
        payload: deepSanitizeObject(input.payload),
      } as ContractReviewInput)
    ),
  semanticSearch: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => aiService.semanticSearch(sanitizePlainText(input.query))),
  // Generic helper to get AI-based field suggestions for any record payload.
  suggestFields: protectedProcedure
    .input(
      z.object({
        recordType: z.string(),
        payload: z.any(),
      }),
    )
    .mutation(({ input }) =>
      aiService.suggestFieldValues({
        recordType: sanitizePlainText(input.recordType),
        payload: deepSanitizeObject(input.payload),
      }),
    ),
});
