import { z } from 'zod';
import { supabase } from '../services/supabase';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { sanitizePlainText, deepSanitizeObject } from '../utils/inputSanitizer';

const ALLOWED_EXTRACTION_DATA_KEYS = [
  'requestNumber', 'firstName', 'lastName', 'identityNumber', 'cin',
  'phone', 'email', 'address', 'capacity', 'court', 'deedType', 'deedCategory',
  'year', 'notes', 'communicationChannel', 'deliveryPreference', 'city'
];

const createPublicInputSchema = z.object({
  requestNumber: z.string().optional(),
  assignedNotaryIds: z.array(z.string()).optional(),
  data: z.record(z.any()),
});

export const extractionRequestsRouter = router({
  createPublic: publicProcedure
    .input(createPublicInputSchema)
    .mutation(async ({ input }) => {
      const { requestNumber, assignedNotaryIds = [], data: rawData } = input;

      // Deep sanitize all input fields to strip malicious HTML/JavaScript payloads
      const cleanData = deepSanitizeObject(rawData, ALLOWED_EXTRACTION_DATA_KEYS);

      const recordYear = parseInt(String(cleanData?.year || ''), 10);
      const requesterName = sanitizePlainText(`${cleanData?.firstName || ''} ${cleanData?.lastName || ''}`).trim() || 'مواطن';
      const requesterCin = sanitizePlainText(cleanData?.identityNumber || cleanData?.cin || 'N/A');
      const recordType = sanitizePlainText(cleanData?.deedType || cleanData?.deedCategory || 'استخراج رسم عدلي');
      const primaryCourt = cleanData?.court ? sanitizePlainText(cleanData.court) : null;
      const safeNotes = requestNumber ? `رقم الطلب: ${sanitizePlainText(requestNumber)}` : null;

      // Only columns that exist in the copy_requests Supabase table schema
      const payload = {
        requester_name: requesterName,
        requester_cin: requesterCin,
        record_type: recordType,
        request_date: new Date().toISOString().split('T')[0],
        status: 'pending' as const,
        notes: safeNotes,
        primary_court: primaryCourt,
        record_year: isNaN(recordYear) ? null : recordYear,
        record_details: {
          requestNumber: sanitizePlainText(requestNumber || ''),
          phone: cleanData?.phone ? sanitizePlainText(cleanData.phone) : null,
          email: cleanData?.email ? sanitizePlainText(cleanData.email) : null,
          address: cleanData?.address ? sanitizePlainText(cleanData.address) : null,
          capacity: cleanData?.capacity ? sanitizePlainText(cleanData.capacity) : null,
          communicationChannel: cleanData?.communicationChannel || 'inbox',
          ...cleanData,
        },
        assigned_notary_ids: assignedNotaryIds.map((id) => sanitizePlainText(id)),
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

  list: protectedProcedure
    .input(
      z
        .object({
          notaryId: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        let query = supabase.from('copy_requests').select('*');
        const isCitizen = ctx.user.role === 'citizen';
        const isOversight = ctx.user.role === 'regional_adoul_council' || ctx.user.role === 'national_notary_authority' || ctx.user.role === 'admin';

        if (isCitizen) {
          const userCin = (ctx.user as any).national_id || (ctx.user as any).cin;
          if (!userCin) return [];
          query = query.eq('requester_cin', userCin);
        } else if (!isOversight) {
          // For notaries, strictly scope to their own assigned records
          const targetNotaryId = ctx.notaryProfile?.id || ctx.user.id;
          query = query.contains('assigned_notary_ids', [sanitizePlainText(targetNotaryId)]);
        } else if (input?.notaryId) {
          query = query.contains('assigned_notary_ids', [sanitizePlainText(input.notaryId)]);
        }

        if (input?.status) {
          query = query.eq('status', sanitizePlainText(input.status));
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

