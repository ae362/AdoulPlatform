import { z } from 'zod';
import { divorceRecordSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';

const idInput = z.object({ id: z.string() });
const divorceCreateSchema = divorceRecordSchema.extend({
  uploaded_file: fileUploadSchema.optional(),
});
const divorceUpdateSchema = divorceRecordSchema.extend({
  id: z.string(),
  uploaded_file: fileUploadSchema.optional(),
});

export const divorceRecordsRouter = router({
  list: publicProcedure
    .input(z.object({ cin: z.string().optional(), divorce_type: z.string().optional() }).optional())
    .query(async ({ input }) => {
      let query = supabase.from('divorce_records').select('*');
      if (input?.cin) {
        query = query.or(`husband_cin.eq.${input.cin},wife_cin.eq.${input.cin}`);
      }
      if (input?.divorce_type) {
        query = query.eq('divorce_type', input.divorce_type);
      }
      const { data, error } = await query.order('inclusion_date', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: publicProcedure.input(divorceCreateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('divorce_records')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: publicProcedure.input(divorceUpdateSchema).mutation(async ({ input }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload = { ...rest };
    if (uploaded_file) {
      const uploaded = await uploadDocument(uploaded_file);
      payload.document_url = uploaded.url;
      payload.document_name = uploaded_file.name;
    }
    const { data, error } = await supabase
      .from('divorce_records')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('divorce_records').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
