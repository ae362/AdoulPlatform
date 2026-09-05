import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { AIService, type ContractDraftInput, type ContractReviewInput } from '../services/ai';

const aiService = new AIService();

export const aiRouter = router({
  generateDraft: publicProcedure
    .input(z.object({ contractType: z.string(), parties: z.string(), details: z.string().optional() }))
    .mutation(({ input }) => aiService.generateContractDraft(input as ContractDraftInput)),
  reviewContract: publicProcedure
    .input(z.object({ recordType: z.string(), payload: z.any() }))
    .mutation(({ input }) => aiService.reviewContractLegality(input as ContractReviewInput)),
  semanticSearch: publicProcedure.input(z.object({ query: z.string() })).query(({ input }) => aiService.semanticSearch(input.query)),
  // Generic helper to get AI-based field suggestions for any record payload.
  suggestFields: publicProcedure
    .input(
      z.object({
        recordType: z.string(),
        payload: z.any(),
      }),
    )
    .mutation(({ input }) =>
      aiService.suggestFieldValues({
        recordType: input.recordType,
        payload: input.payload,
      }),
    ),
});
