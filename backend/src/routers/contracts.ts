import { z } from 'zod';
import { contractSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { AIService, type ContractDraftInput, type ContractReviewInput } from '../services/ai';
import { LegalCheckerService } from '../services/legalChecker';
import { protectedProcedure, router } from './trpc';
import { sanitizePlainText } from '../utils/inputSanitizer';

const aiService = new AIService();
const legalChecker = new LegalCheckerService();
const idInput = z.object({ id: z.string().min(1) });

export const contractsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional(), offset: z.number().min(0).optional() }).optional())
    .query(async ({ input, ctx }) => {
      // IDOR Defense: Scope contract listing to the authenticated user/notary
      let q = supabase
        .from('contracts')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false });

      if (input?.limit) {
        const from = input.offset || 0;
        const to = from + input.limit - 1;
        q = q.range(from, to);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: protectedProcedure.input(contractSchema).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    // IDOR Defense: Bind contract to authenticated user
    const insertPayload = {
      ...rest,
      user_id: ctx.user.id,
      title: sanitizePlainText(rest.title || ''),
      ai_notes: rest.ai_notes ? sanitizePlainText(rest.ai_notes) : null,
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert(insertPayload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: protectedProcedure.input(contractSchema.extend({ id: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    // IDOR Defense: Only allow update if contract belongs to authenticated user
    const updatePayload = {
      ...rest,
      title: rest.title ? sanitizePlainText(rest.title) : undefined,
      ai_notes: rest.ai_notes ? sanitizePlainText(rest.ai_notes) : undefined,
    };

    const { data, error } = await supabase
      .from('contracts')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', ctx.user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    // IDOR Defense: Only allow delete if contract belongs to authenticated user
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),

  generateDraft: protectedProcedure
    .input(z.object({
      contractType: z.string(),
      parties: z.string(),
      details: z.string().optional()
    }))
    .mutation(({ input }) => {
      const cleanInput: ContractDraftInput = {
        contractType: sanitizePlainText(input.contractType),
        parties: sanitizePlainText(input.parties),
        details: input.details ? sanitizePlainText(input.details) : undefined,
      };
      return aiService.generateContractDraft(cleanInput);
    }),

  legalReview: protectedProcedure
    .input(z.object({ recordType: z.string(), payload: z.any() }))
    .mutation(({ input }) =>
      legalChecker.validateLegalRecord((input as ContractReviewInput).recordType, (input as ContractReviewInput).payload),
    ),
});
