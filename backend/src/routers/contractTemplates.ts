import { z } from 'zod';
import { contractTemplateSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { AIService } from '../services/ai';
import { CacheService } from '../services/cacheService';
import { publicProcedure, router } from './trpc';

const aiService = new AIService();
const idInput = z.object({ id: z.string() });
const CACHE_KEY_TEMPLATES = 'ref:contract_templates:list';

export const contractTemplatesRouter = router({
  list: publicProcedure.query(async () => {
    return CacheService.remember(CACHE_KEY_TEMPLATES, 86400, async () => {
      const { data, error } = await supabase.from('contract_templates').select('*').order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    });
  }),

  create: publicProcedure.input(contractTemplateSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('contract_templates')
      .insert(rest)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return data;
  }),

  update: publicProcedure.input(contractTemplateSchema.extend({ id: z.string() })).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('contract_templates')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return data;
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('contract_templates').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return { success: true };
  }),

  aiSuggest: publicProcedure
    .input(z.object({ topic: z.string() }))
    .mutation(({ input }) => aiService.semanticSearch(`template:${input.topic}`)),
});
