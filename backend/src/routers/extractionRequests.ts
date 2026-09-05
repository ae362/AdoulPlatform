import { z } from 'zod';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';

const createPublicInputSchema = z.object({
  requestNumber: z.string().optional(),
  assignedNotaryIds: z.array(z.string()).optional(),
  data: z.record(z.any()),
});

export const extractionRequestsRouter = router({
  createPublic: publicProcedure
    .input(createPublicInputSchema)
    .mutation(async ({ input }) => {
      const { requestNumber, assignedNotaryIds = [], data } = input;

      const recordYear = parseInt(data?.year, 10);
      const requesterName = `${data?.firstName || ''} ${data?.lastName || ''}`.trim() || 'مواطن';

      // Only columns that exist in the copy_requests Supabase table schema
      const payload = {
        requester_name: requesterName,
        requester_cin: String(data?.identityNumber || data?.cin || 'N/A'),
        record_type: String(data?.deedType || data?.deedCategory || 'استخراج رسم عدلي'),
        request_date: new Date().toISOString().split('T')[0],
        status: 'pending' as const,
        notes: requestNumber ? `رقم الطلب: ${requestNumber}` : null,
        primary_court: data?.court || null,
        record_year: isNaN(recordYear) ? null : recordYear,
        record_details: {
          requestNumber,
          phone: data?.phone || null,
          email: data?.email || null,
          address: data?.address || null,
          capacity: data?.capacity || null,
          communicationChannel: data?.communicationChannel || 'inbox',
          ...data,
        },
        assigned_notary_ids: assignedNotaryIds,
        routing_mode: assignedNotaryIds.length > 1 ? 'historical_selection' : ('direct' as const),
      };

      const newId = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const savedRecord = {
        id: newId,
        ...payload,
        created_at: new Date().toISOString(),
      };

      // Always save to memory store so it is immediately visible
      try {
        const { db } = await import('../data/store');
        db.copyRequests.unshift(savedRecord as any);
      } catch (e) {
        console.warn('Memory store fallback save note:', e);
      }

      try {
        const { data: inserted, error } = await supabase
          .from('copy_requests')
          .insert(payload)
          .select('*')
          .single();

        if (error) {
          console.warn('Could not insert to copy_requests table in Supabase:', error.message);
        } else if (inserted) {
          // Replace temporary memory item with the real Supabase record to avoid duplicates
          try {
            const { db } = await import('../data/store');
            const idx = db.copyRequests.findIndex((r: any) => r.id === newId);
            if (idx >= 0) {
              db.copyRequests[idx] = inserted as any;
            }
          } catch {}
        }

        const finalId = inserted?.id || newId;
        return {
          success: true,
          requestNumber,
          id: finalId,
          data: { ...payload, id: finalId },
        };
      } catch (err) {
        console.error('Error saving copy extraction request to supabase:', err);
        return {
          success: true,
          requestNumber,
          id: newId,
          data: savedRecord,
        };
      }
    }),

  list: publicProcedure
    .input(
      z
        .object({
          notaryId: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      try {
        let query = supabase.from('copy_requests').select('*');
        if (input?.notaryId) {
          query = query.contains('assigned_notary_ids', [input.notaryId]);
        }
        if (input?.status) {
          query = query.eq('status', input.status);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.warn('Error fetching copy_requests:', error.message);
          return [];
        }
        return data ?? [];
      } catch {
        return [];
      }
    }),
});

