import { z } from 'zod';
import { copyRequestSchema } from '../../../shared/schemas';
import { supabase } from '../services/supabase';
import { db, ensureId } from '../data/store';
import { protectedProcedure, router } from './trpc';
import { sanitizePlainText, sanitizeIlikePattern } from '../utils/inputSanitizer';

const idInput = z.object({ id: z.string().min(1) });

export const copyRequestsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          cin: z.string().optional(),
          record_type: z.string().optional(),
          name: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      let remoteData: any[] = [];
      try {
        let query = supabase.from('copy_requests').select('*');

        if (input?.cin) query = query.eq('requester_cin', sanitizePlainText(input.cin));
        if (input?.record_type) query = query.eq('record_type', sanitizePlainText(input.record_type));
        if (input?.name) {
          const term = sanitizeIlikePattern(input.name);
          query = query.ilike('requester_name', `%${term}%`);
        }
        if (input?.from) {
          query = query.gte('request_date', sanitizePlainText(input.from));
        }
        if (input?.to) {
          query = query.lte('request_date', sanitizePlainText(input.to));
        }

        const { data, error } = await query.order('request_date', { ascending: false });
        if (!error && Array.isArray(data)) {
          remoteData = data;
        }
      } catch (e) {
        console.warn('Supabase fetch copy_requests note:', e);
      }

      // Merge memory store requests with remote Supabase data (deduplicating by ID and requestNumber)
      const remoteIds = new Set(remoteData.map((d: any) => String(d.id)));
      const remoteReqNums = new Set(
        remoteData
          .map((d: any) => String(d?.record_details?.requestNumber || d?.notes || ''))
          .filter(Boolean)
      );

      const localMatches = db.copyRequests.filter((d: any) => {
        if (!d?.id || remoteIds.has(String(d.id))) return false;
        const reqNum = String(d?.record_details?.requestNumber || d?.notes || '');
        if (reqNum && remoteReqNums.has(reqNum)) return false;
        if (input?.cin && d.requester_cin !== input.cin) return false;
        if (input?.record_type && d.record_type !== input.record_type) return false;
        if (input?.name && !String(d.requester_name || '').toLowerCase().includes(input.name.trim().toLowerCase())) return false;
        return true;
      });

      const combined = [...localMatches, ...remoteData];
      combined.sort((a, b) => {
        const timeA = new Date(a.created_at || a.request_date || 0).getTime();
        const timeB = new Date(b.created_at || b.request_date || 0).getTime();
        return timeB - timeA;
      });

      return combined;
    }),

  create: protectedProcedure.input(copyRequestSchema).mutation(async ({ input }) => {
    const item = ensureId(input);
    db.copyRequests.unshift(item as any);

    try {
      const { data, error } = await supabase
        .from('copy_requests')
        .insert(item)
        .select('*')
        .single();
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase copy_requests insert note:', e);
    }
    return item;
  }),

  update: protectedProcedure.input(copyRequestSchema.extend({ id: z.string().min(1) })).mutation(async ({ input }) => {
    const idx = db.copyRequests.findIndex((r) => r.id === input.id);
    if (idx >= 0) {
      db.copyRequests[idx] = { ...db.copyRequests[idx], ...input } as any;
    }

    try {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from('copy_requests')
        .update(rest)
        .eq('id', id)
        .select('*')
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase copy_requests update note:', e);
    }

    return input;
  }),

  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    db.copyRequests = db.copyRequests.filter((r) => r.id !== input.id);
    try {
      await supabase.from('copy_requests').delete().eq('id', input.id);
    } catch {}
    return { success: true };
  }),
});

