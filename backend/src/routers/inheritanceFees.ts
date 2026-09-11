import { z } from 'zod';
import { inheritanceFeeSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';
import { sanitizePlainText } from '../utils/inputSanitizer';

const idInput = z.object({ id: z.string() });
const inheritanceCreateSchema = inheritanceFeeSchema.extend({
  uploaded_file: fileUploadSchema.optional(),
});
const inheritanceUpdateSchema = inheritanceFeeSchema.extend({
  id: z.string(),
  uploaded_file: fileUploadSchema.optional(),
});

export const inheritanceFeesRouter = router({
  list: publicProcedure.query(async () => {
    const { data, error } = await supabase.from('inheritance_fees').select('*').order('inclusion_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  create: protectedProcedure.input(inheritanceCreateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload: any = { ...rest };
    if (payload.deceased_name) payload.deceased_name = sanitizePlainText(payload.deceased_name);
    if (payload.heirs_names) payload.heirs_names = sanitizePlainText(payload.heirs_names);
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('inheritance_fees')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: protectedProcedure.input(inheritanceUpdateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload: any = { ...rest };
    if (payload.deceased_name) payload.deceased_name = sanitizePlainText(payload.deceased_name);
    if (payload.heirs_names) payload.heirs_names = sanitizePlainText(payload.heirs_names);
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('inheritance_fees')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const { error } = await supabase.from('inheritance_fees').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
