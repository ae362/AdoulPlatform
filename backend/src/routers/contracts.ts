import { z } from 'zod';
import { contractSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { AIService, type ContractDraftInput, type ContractReviewInput } from '../services/ai';
import { LegalCheckerService } from '../services/legalChecker';
import { publicProcedure, router } from './trpc';

const aiService = new AIService();
const legalChecker = new LegalCheckerService();
const idInput = z.object({ id: z.string() });

export const contractsRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional(), offset: z.number().min(0).optional() }).optional())
    .query(async ({ input }) => {
      let q = supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (input?.limit) {
        const from = input.offset || 0;
        const to = from + input.limit - 1;
        q = q.range(from, to);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: publicProcedure.input(contractSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('contracts')
      .insert(rest)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: publicProcedure.input(contractSchema.extend({ id: z.string() })).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('contracts')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('contracts').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),

  generateDraft: publicProcedure
    .input(z.object({ contractType: z.string(), parties: z.string(), details: z.string().optional() }))
    .mutation(({ input }) => aiService.generateContractDraft(input as ContractDraftInput)),

  legalReview: publicProcedure
    .input(z.object({ recordType: z.string(), payload: z.any() }))
    .mutation(({ input }) =>
      legalChecker.validateLegalRecord((input as ContractReviewInput).recordType, (input as ContractReviewInput).payload),
    ),
});
