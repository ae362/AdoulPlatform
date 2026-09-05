import { z } from 'zod';
import { registrationStampSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';

const idInput = z.object({ id: z.string() });

export const registrationStampsRouter = router({
  list: publicProcedure.query(async () => {
    const { data, error } = await supabase.from('registration_stamps').select('*').order('paid_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  create: publicProcedure.input(registrationStampSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from('registration_stamps')
      .insert(rest)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }),

  update: publicProcedure.input(registrationStampSchema.extend({ id: z.string() })).mutation(async ({ input }) => {
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

  delete: publicProcedure.input(idInput).mutation(async ({ input }) => {
    const { error } = await supabase.from('registration_stamps').delete().eq('id', input.id);
    if (error) throw new Error(error.message);
    return { success: true };
  }),
});
