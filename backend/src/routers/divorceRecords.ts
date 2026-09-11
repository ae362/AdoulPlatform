import { z } from 'zod';
import { divorceRecordSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { fileUploadSchema, uploadDocument } from '../utils/storage';
import { sanitizePostgrestValue, sanitizePlainText } from '../utils/inputSanitizer';

const idInput = z.object({ id: z.string() });
const divorceCreateSchema = divorceRecordSchema.extend({
  uploaded_file: fileUploadSchema.optional(),
});
const divorceUpdateSchema = divorceRecordSchema.extend({
  id: z.string(),
  uploaded_file: fileUploadSchema.optional(),
});

export const divorceRecordsRouter = router({
  list: protectedProcedure
    .input(z.object({ cin: z.string().optional(), divorce_type: z.string().optional() }).optional())
    .query(async ({ input }) => {
      let query = supabase.from('divorce_records').select('*');
      if (input?.cin) {
        const safeCin = sanitizePostgrestValue(input.cin);
        query = query.or(`husband_cin.eq.${safeCin},wife_cin.eq.${safeCin}`);
      }
      if (input?.divorce_type) {
        query = query.eq('divorce_type', sanitizePlainText(input.divorce_type));
      }
      const { data, error } = await query.order('inclusion_date', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: protectedProcedure.input(divorceCreateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload: any = {
      ...rest,
      husband_name: sanitizePlainText(rest.husband_name || ''),
      wife_name: sanitizePlainText(rest.wife_name || ''),
      husband_cin: sanitizePostgrestValue(rest.husband_cin || ''),
      wife_cin: sanitizePostgrestValue(rest.wife_cin || ''),
    };
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

  update: protectedProcedure.input(divorceUpdateSchema).mutation(async ({ input, ctx }) => {
    const { id, uploaded_file, ...rest } = input;
    const payload: any = { ...rest };
    if (payload.husband_name) payload.husband_name = sanitizePlainText(payload.husband_name);
    if (payload.wife_name) payload.wife_name = sanitizePlainText(payload.wife_name);
    if (payload.husband_cin) payload.husband_cin = sanitizePostgrestValue(payload.husband_cin);
    if (payload.wife_cin) payload.wife_cin = sanitizePostgrestValue(payload.wife_cin);

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

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const { error } = await supabase.from('divorce_records').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
