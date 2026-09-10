import { z } from 'zod';
import { router, publicProcedure, resolveSessionUser } from './trpc';
import { supabase } from '../services/supabase';
import { TRPCError } from '@trpc/server';

async function validateSession(sessionToken: string) {
  const user = await resolveSessionUser(sessionToken);
  return user.id;
}

export const dailyLedgerRouter = router({
  addEntry: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      entry: z.object({
        family_name: z.string(),
        personal_name: z.string(),
        id_card: z.string().optional(),
        certificate_type: z.string(),
        operation_type: z.string(),
        amount_received: z.number(),
        receipt_number: z.string(),
        copy_type: z.string().optional(),
        judge_auth_number: z.string().optional(),
        judge_auth_date: z.string().optional(),
        adl1_number: z.string().optional(),
        adl1_volume: z.string().optional(),
        adl1_page: z.string().optional(),
        reception_date: z.string().optional(),
        image_url: z.string().optional(),
        questions_responses: z.any().optional(),
      })
    }))
    .mutation(async ({ input }) => {
      const userId = await validateSession(input.sessionToken);

      const now = new Date();
      const entry_time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      // Sanitize empty strings to null for database compatibility
      const sanitizedEntry = Object.fromEntries(
        Object.entries(input.entry).map(([key, value]) => [
          key, 
          value === "" ? null : value
        ])
      );

      const { data, error } = await supabase
        .from('daily_ledger')
        .insert([{
          ...sanitizedEntry,
          entry_time,
          user_id: userId,
          notary_id: userId
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('رقم التوصيل مكرر - هذا الرقم مسجل مسبقا');
        throw new Error(error.message);
      }
      return data;
    }),

  getRecentEntries: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      date: z.string().optional() // YYYY-MM-DD
    }))
    .query(async ({ input }) => {
      await validateSession(input.sessionToken);

      let query = supabase
        .from('daily_ledger')
        .select('*')
        .order('created_at', { ascending: false });

      if (input.date) {
        query = query.gte('created_at', `${input.date}T00:00:00`)
                     .lte('created_at', `${input.date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }),

  getStats: publicProcedure
    .input(z.object({
      sessionToken: z.string()
    }))
    .query(async ({ input }) => {
      await validateSession(input.sessionToken);

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_ledger')
        .select('amount_received, created_at, operation_type');

      if (error) throw new Error(error.message);

      const stats = {
        daily: { total: 0, count: 0 },
        monthly: { total: 0, count: 0 },
        yearly: { total: 0, count: 0 }
      };

      const now = new Date();
      const thisMonth = now.toISOString().substring(0, 7);
      const thisYear = now.toISOString().substring(0, 4);
      const todayStr = now.toISOString().substring(0, 10);

      data.forEach(e => {
        const amt = Number(e.amount_received);
        const dateStr = new Date(e.created_at).toISOString();
        
        if (dateStr.startsWith(todayStr)) {
            stats.daily.total += amt;
            stats.daily.count++;
        }
        if (dateStr.startsWith(thisMonth)) {
            stats.monthly.total += amt;
            stats.monthly.count++;
        }
        if (dateStr.startsWith(thisYear)) {
            stats.yearly.total += amt;
            stats.yearly.count++;
        }
      });

      return stats;
    }),

    addCorrection: publicProcedure
    .input(z.object({
        sessionToken: z.string(),
        originalId: z.string(),
        correction: z.any()
    }))
    .mutation(async ({ input }) => {
        const userId = await validateSession(input.sessionToken);
        const now = new Date();
        const entry_time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        const { data, error } = await supabase
            .from('daily_ledger')
            .insert([{
                ...input.correction,
                id: undefined,
                created_at: undefined,
                serial_number: undefined,
                entry_time,
                user_id: userId,
                is_correction: true,
                original_entry_id: input.originalId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    })
});