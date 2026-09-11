import { z } from 'zod';
import { contractTemplateSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { AIService } from '../services/ai';
import { CacheService } from '../services/cacheService';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { sanitizePlainText } from '../utils/inputSanitizer';

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

  create: protectedProcedure.input(contractTemplateSchema).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'creator') {
      throw new Error('غير مصرح - إنشاء نماذج العقود مقتصر على الهيئة والمجالس الجهوية');
    }
    const { id, ...rest } = input;
    const sanitizedPayload = {
      ...rest,
      name: sanitizePlainText(rest.name),
      template_type: sanitizePlainText(rest.template_type),
      content: sanitizePlainText(rest.content),
    };
    const { data, error } = await supabase
      .from('contract_templates')
      .insert(sanitizedPayload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return data;
  }),

  update: protectedProcedure.input(contractTemplateSchema.extend({ id: z.string() })).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'creator') {
      throw new Error('غير مصرح - تعديل نماذج العقود مقتصر على الهيئة والمجالس الجهوية');
    }
    const { id, ...rest } = input;
    const sanitizedPayload = {
      ...rest,
      name: sanitizePlainText(rest.name),
      template_type: sanitizePlainText(rest.template_type),
      content: sanitizePlainText(rest.content),
    };
    const { data, error } = await supabase
      .from('contract_templates')
      .update(sanitizedPayload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return data;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== 'national_notary_authority' && ctx.user.role !== 'regional_adoul_council' && ctx.user.role !== 'creator') {
      throw new Error('غير مصرح - حذف نماذج العقود مقتصر على الهيئة والمجالس الجهوية');
    }
    const { error } = await supabase.from('contract_templates').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    CacheService.del(CACHE_KEY_TEMPLATES).catch(() => {});
    return { success: true };
  }),

  aiSuggest: publicProcedure
    .input(z.object({ topic: z.string() }))
    .mutation(({ input }) => aiService.semanticSearch(`template:${input.topic}`)),
});
