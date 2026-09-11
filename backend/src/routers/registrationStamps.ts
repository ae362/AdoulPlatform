import { z } from 'zod';
import { registrationStampSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';

const idInput = z.object({ id: z.string() });

export const registrationStampsRouter = router({
  list: publicProcedure.query(async () => {
    const { data, error } = await supabase.from('registration_stamps').select('*').order('paid_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  create: protectedProcedure.input(registrationStampSchema).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('registration_stamps')
      .insert(rest)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: protectedProcedure.input(registrationStampSchema.extend({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('registration_stamps')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const { error } = await supabase.from('registration_stamps').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
