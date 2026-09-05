import { z } from 'zod';
import { otherDocumentFeeSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';

const idInput = z.object({ id: z.string() });
const otherCreateSchema = otherDocumentFeeSchema.extend({
  uploaded_file: fileUploadSchema.optional(),
});
const otherUpdateSchema = otherDocumentFeeSchema.extend({
  id: z.string(),
  uploaded_file: fileUploadSchema.optional(),
});

export const otherDocumentFeesRouter = router({
  list: publicProcedure.query(async () => {
    const { data, error } = await supabase.from('other_document_fees').select('*').order('inclusion_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  create: publicProcedure.input(otherCreateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('other_document_fees')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: publicProcedure.input(otherUpdateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('other_document_fees')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('other_document_fees').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
