import { z } from 'zod';
import { propertyFeeSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';
import { sanitizeIlikePattern } from '../utils/inputSanitizer';

const idInput = z.object({ id: z.string() });
const propertyCreateSchema = propertyFeeSchema.extend({
  uploaded_file: fileUploadSchema.optional(),
});
const propertyUpdateSchema = propertyFeeSchema.extend({
  id: z.string(),
  uploaded_file: fileUploadSchema.optional(),
});

export const propertyFeesRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      let query = supabase.from('property_fees').select('*');
      if (input?.search) {
        const term = sanitizeIlikePattern(input.search);
        query = query.or(`parties_names.ilike.%${term}%,parties_cin.ilike.%${term}%`);
      }
      const { data, error } = await query.order('inclusion_date', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: publicProcedure.input(propertyCreateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('property_fees')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: publicProcedure.input(propertyUpdateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('property_fees')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('property_fees').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
