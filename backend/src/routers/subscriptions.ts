import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { publicProcedure, router } from './trpc';

type AuthUser = { id: string; role: string; is_active: boolean };

async function requireUser(sessionToken: string): Promise<AuthUser> {
  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('session_token', sessionToken)
    .single();

  if (sessionError || !session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
  }

  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', session.user_id)
    .single();

  if (userError || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  }

  if (!user.is_active) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not active' });
  }

  return user;
}

const subscriptionTypeSchema = z.string();
const paymentStatusSchema = z.enum(['paid', 'unpaid', 'overdue']);

const subscriptionInputSchema = z.object({
  id: z.string().uuid().optional(),
  subscriptionType: subscriptionTypeSchema,
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12).optional().nullable(),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).default('MAD'),
  dueDate: z.string().min(1), // ISO date
});

const donationCategorySchema = z.enum(['قانوني', 'اجتماعي', 'ثقافي', 'تكويني']).optional();
const donationScopeSchema = z.enum(['جهوي', 'وطني']);

const donationInputSchema = z.object({
  id: z.string().uuid().optional(),
  scope: donationScopeSchema,
  category: donationCategorySchema,
  amount: z.number().nonnegative(),
  donatedAt: z.string().optional(), // ISO datetime
  note: z.string().max(500).optional().nullable(),
});

const stampPurchaseInputSchema = z.object({
  id: z.string().uuid().optional(),
  stampName: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPrice: z.number().nonnegative(),
  purchasedAt: z.string().optional(), // ISO datetime
  integrationRef: z.string().max(120).optional().nullable(),
});

const receiptKindSchema = z.enum(['subscription', 'donation', 'stamps', 'other']);
const receiptInputSchema = z.object({
  id: z.string().uuid().optional(),
  kind: receiptKindSchema,
  relatedId: z.string().uuid().optional().nullable(),
  receiptNumber: z.string().max(120).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

function computeStatus(dueDateIso: string, paidAt: string | null) {
  if (paidAt) return 'paid' as const;
  const due = new Date(dueDateIso).getTime();
  if (!Number.isFinite(due)) return 'unpaid' as const;
  return due < Date.now() ? ('overdue' as const) : ('unpaid' as const);
}

export const subscriptionsRouter = router({
  listSubscriptions: publicProcedure
    .input(z.object({ sessionToken: z.string(), year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);

      let query = supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false, nullsFirst: true });

      if (input.year) query = query.eq('period_year', input.year);

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const targetYear = input.year ?? new Date().getFullYear();

      // Only consider valid records with a positive amount
      const validRows = (data || []).filter((r: any) => Number(r.amount) > 0);

      const finalResult: any[] = [];
      const processedIds = new Set<string>();

      // 1. Process Annual / Yearly Subscriptions (Mandatory recurring due)
      const annualMatches = validRows.filter((r: any) => 
        r.subscription_type === 'annual' || r.subscription_type === 'yearly'
      );

      if (annualMatches.length > 0) {
        // Return ALL annual invoices for this notary/year (do not swallow extra invoices!)
        for (const match of annualMatches) {
          processedIds.add(match.id);
          finalResult.push({
            ...match,
            subscription_type: 'annual',
            status: computeStatus(match.due_date, match.paid_at)
          });
        }
      } else {
        // If no annual subscription invoice exists at all in the DB, provide the standard default virtual due
        finalResult.push({
          id: `virtual-annual-${targetYear}`,
          subscription_type: 'annual',
          period_year: targetYear,
          period_month: null,
          amount: 800,
          currency: 'MAD',
          due_date: `${targetYear}-12-31`,
          paid_at: null,
          status: 'unpaid',
          isVirtual: true
        });
      }

      // 2. Process all other actual records in DB (affiliation, equipment, suit, badge, notebook, register, donations, other, monthly)
      for (const row of validRows) {
        if (!processedIds.has(row.id)) {
          // Ignore invalid monthly records without a specific month
          if (row.subscription_type === 'monthly' && !row.period_month) {
            continue;
          }

          finalResult.push({
            ...row,
            status: computeStatus(row.due_date, row.paid_at)
          });
        }
      }

      return (
        finalResult.map((row: any) => ({
          id: row.id,
          subscriptionType: row.subscription_type as z.infer<typeof subscriptionTypeSchema>,
          periodYear: row.period_year,
          periodMonth: row.period_month ?? null,
          amount: Number(row.amount ?? 0),
          currency: row.currency ?? 'MAD',
          dueDate: row.due_date,
          paidAt: row.paid_at,
          status: row.status, // already computed
          isVirtual: row.isVirtual ?? false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      );
    }),

  upsertSubscription: publicProcedure
    .input(z.object({ sessionToken: z.string(), subscription: subscriptionInputSchema }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const s = input.subscription;

      const row = {
        ...(s.id ? { id: s.id } : {}),
        user_id: user.id,
        subscription_type: s.subscriptionType,
        period_year: s.periodYear,
        period_month: s.subscriptionType === 'monthly' ? s.periodMonth ?? null : null,
        amount: s.amount,
        currency: s.currency ?? 'MAD',
        due_date: s.dueDate,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('subscription_payments')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single();

      if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed' });

      return { id: data.id };
    }),

  markSubscriptionPaid: publicProcedure
    .input(z.object({ 
      sessionToken: z.string(), 
      id: z.string(),
      subscriptionType: z.string().optional(),
      periodYear: z.number().int().optional(),
      periodMonth: z.number().int().nullable().optional(),
      amount: z.number().optional(),
      paidAt: z.string().optional() 
    }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const paidAt = input.paidAt ?? new Date().toISOString();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id);

      if (isUuid) {
        const { data, error } = await supabase
          .from('subscription_payments')
          .update({ paid_at: paidAt, updated_at: new Date().toISOString() })
          .eq('id', input.id)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed' });
        return { success: true, id: data.id };
      }

      // If virtual or non-UUID, check if an existing unpaid record exists or insert a new one
      const rawType = input.subscriptionType || (input.id.startsWith('virtual-') ? input.id.split('-')[1] : 'annual');
      const normalizedType = rawType === 'yearly' ? 'annual' : rawType;
      const targetYear = input.periodYear ?? new Date().getFullYear();
      const targetMonth = input.periodMonth ?? null;
      const targetAmount = input.amount ?? 800;

      const { data: inserted, error: insertError } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          subscription_type: normalizedType,
          period_year: targetYear,
          period_month: targetMonth,
          amount: targetAmount,
          currency: 'MAD',
          due_date: `${targetYear}-12-31`,
          paid_at: paidAt,
          created_at: paidAt,
          updated_at: paidAt,
        })
        .select('*')
        .single();

      if (insertError || !inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError?.message ?? 'Failed to record payment' });
      return { success: true, id: inserted.id };
    }),

  payAllOutstandingDues: publicProcedure
    .input(z.object({ sessionToken: z.string(), year: z.number().int().optional() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const paidAt = new Date().toISOString();
      const targetYear = input.year ?? new Date().getFullYear();

      // 1. Mark existing unpaid records for this user as paid
      await supabase
        .from('subscription_payments')
        .update({ paid_at: paidAt, updated_at: paidAt })
        .eq('user_id', user.id)
        .is('paid_at', null);

      // 2. Also ensure annual subscription for targetYear exists and is paid
      const { data: annualRecords } = await supabase
        .from('subscription_payments')
        .select('id, paid_at')
        .eq('user_id', user.id)
        .in('subscription_type', ['annual', 'yearly'])
        .eq('period_year', targetYear);

      if (!annualRecords || annualRecords.length === 0) {
        await supabase
          .from('subscription_payments')
          .insert({
            user_id: user.id,
            subscription_type: 'annual',
            period_year: targetYear,
            amount: 800,
            currency: 'MAD',
            due_date: `${targetYear}-01-31`,
            paid_at: paidAt
          });
      } else {
        await supabase
          .from('subscription_payments')
          .update({ paid_at: paidAt, subscription_type: 'annual', updated_at: paidAt })
          .eq('user_id', user.id)
          .in('subscription_type', ['annual', 'yearly'])
          .eq('period_year', targetYear);
      }

      return { success: true };
    }),

  listDonations: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);

      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .order('donated_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (
        data?.map((row: any) => ({
          id: row.id,
          scope: row.scope,
          category: row.category,
          amount: Number(row.amount ?? 0),
          donatedAt: row.donated_at,
          note: row.note ?? null,
          createdAt: row.created_at,
        })) ?? []
      );
    }),

  createDonation: publicProcedure
    .input(z.object({ sessionToken: z.string(), donation: donationInputSchema }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const d = input.donation;

      const { data, error } = await supabase
        .from('donations')
        .insert({
          user_id: user.id,
          scope: d.scope,
          category: d.category ?? null,
          amount: d.amount,
          donated_at: d.donatedAt ?? new Date().toISOString(),
          note: d.note ?? null,
        })
        .select('id')
        .single();

      if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed' });
      return { id: data.id };
    }),

  listStampPurchases: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);

      const { data, error } = await supabase
        .from('stamp_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (
        data?.map((row: any) => ({
          id: row.id,
          stampName: row.stamp_name,
          quantity: row.quantity,
          unitPrice: Number(row.unit_price ?? 0),
          purchasedAt: row.purchased_at,
          integrationRef: row.integration_ref ?? null,
          createdAt: row.created_at,
        })) ?? []
      );
    }),

  createStampPurchase: publicProcedure
    .input(z.object({ sessionToken: z.string(), purchase: stampPurchaseInputSchema }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const p = input.purchase;

      const { data, error } = await supabase
        .from('stamp_purchases')
        .insert({
          user_id: user.id,
          stamp_name: p.stampName,
          quantity: p.quantity,
          unit_price: p.unitPrice,
          purchased_at: p.purchasedAt ?? new Date().toISOString(),
          integration_ref: p.integrationRef ?? null,
        })
        .select('id')
        .single();

      if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed' });
      return { id: data.id };
    }),

  listReceipts: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);

      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return (
        data?.map((row: any) => ({
          id: row.id,
          kind: row.kind,
          relatedId: row.related_id ?? null,
          receiptNumber: row.receipt_number ?? null,
          fileUrl: row.file_url ?? null,
          note: row.note ?? null,
          createdAt: row.created_at,
        })) ?? []
      );
    }),

  createReceipt: publicProcedure
    .input(z.object({ sessionToken: z.string(), receipt: receiptInputSchema }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const r = input.receipt;

      const { data, error } = await supabase
        .from('payment_receipts')
        .insert({
          user_id: user.id,
          kind: r.kind,
          related_id: r.relatedId ?? null,
          receipt_number: r.receiptNumber ?? null,
          file_url: r.fileUrl ?? null,
          note: r.note ?? null,
        })
        .select('id')
        .single();

      if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed' });
      return { id: data.id };
    }),

  getDashboard: publicProcedure
    .input(z.object({ sessionToken: z.string(), year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const year = input.year ?? new Date().getFullYear();

      const { data: subs, error: subsError } = await supabase
        .from('subscription_payments')
        .select('due_date, paid_at, amount')
        .eq('user_id', user.id)
        .eq('period_year', year);

      if (subsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: subsError.message });

      const statusCounts = { paid: 0, unpaid: 0, overdue: 0 };
      let subscriptionTotal = 0;
      for (const s of subs ?? []) {
        subscriptionTotal += Number(s.amount ?? 0);
        const status = computeStatus(s.due_date, s.paid_at);
        statusCounts[status] += 1;
      }

      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('amount, donated_at')
        .eq('user_id', user.id)
        .gte('donated_at', `${year}-01-01`)
        .lte('donated_at', `${year}-12-31T23:59:59.999Z`);

      if (donationsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: donationsError.message });

      let donationsTotal = 0;
      for (const d of donations ?? []) donationsTotal += Number(d.amount ?? 0);

      const { data: stamps, error: stampsError } = await supabase
        .from('stamp_purchases')
        .select('quantity, unit_price, purchased_at')
        .eq('user_id', user.id)
        .gte('purchased_at', `${year}-01-01`)
        .lte('purchased_at', `${year}-12-31T23:59:59.999Z`);

      if (stampsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: stampsError.message });

      let stampsTotal = 0;
      for (const p of stamps ?? []) stampsTotal += Number(p.quantity ?? 0) * Number(p.unit_price ?? 0);

      return {
        year,
        subscriptions: {
          statusCounts,
          totalAmount: subscriptionTotal,
        },
        donations: { totalAmount: donationsTotal },
        stamps: { totalAmount: stampsTotal },
      };
    }),

  // --- Admin / Council Methods ---

  getPaymentsForCouncil: publicProcedure
    .input(z.object({
      year: z.number().int().optional(),
      type: z.string().optional()
    }))
    .query(async ({ input }) => {
      // Must include 'id' and 'created_at' for the transactional toggle to work properly
      let query = supabase
        .from('subscription_payments')
        .select('id, user_id, subscription_type, period_year, period_month, amount, paid_at, due_date, created_at');
      
      if (input.year) {
        query = query.eq('period_year', input.year);
      }
      if (input.type) {
        if (input.type === 'annual') {
          query = query.in('subscription_type', ['annual', 'yearly']);
        } else {
          query = query.eq('subscription_type', input.type);
        }
      }

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      return (data || []).map((row: any) => ({
        ...row,
        subscription_type: row.subscription_type === 'yearly' ? 'annual' : row.subscription_type
      }));
    }),

  togglePaymentStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid().optional(), // Specific Record ID
      userId: z.string().uuid(),
      type: z.string(),
      year: z.number().int().optional(),
      status: z.enum(['paid', 'unpaid']),
      amount: z.number().optional(),
      periodMonth: z.number().optional()
    }))
    .mutation(async ({ input }) => {
       const now = new Date().toISOString();
       const normalizedType = input.type === 'yearly' ? 'annual' : input.type;
       
       // If ID is provided, update specific record directly (Transactional approach)
       if (input.id) {
           const updatePayload: any = input.status === 'paid' 
             ? { paid_at: now, updated_at: now, subscription_type: normalizedType }
             : { paid_at: null, updated_at: now, subscription_type: normalizedType };
           if (input.amount !== undefined) updatePayload.amount = input.amount;
            
           const { error } = await supabase
             .from('subscription_payments')
             .update(updatePayload)
             .eq('id', input.id);
             
           if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
           return { success: true };
       }

       // FALLBACK: Legacy/Virtual Logic (Find by generic keys)
       let query = supabase
         .from('subscription_payments')
         .select('id, paid_at')
         .eq('user_id', input.userId);

       if (normalizedType === 'annual') {
         query = query.in('subscription_type', ['annual', 'yearly']);
       } else {
         query = query.eq('subscription_type', normalizedType);
       }

       if (input.year) {
         query = query.eq('period_year', input.year);
       } else {
         query = query.is('period_year', null);
       }
       
       // Month filter for monthly subs
       if (normalizedType === 'monthly' && input.periodMonth) {
           query = query.eq('period_month', input.periodMonth);
       }

       const { data: existingRecords, error: fetchError } = await query;
       if (fetchError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fetchError.message });
       
       const existing = existingRecords?.[0];

       if (input.status === 'paid') {
           if (!existing) {
               // Create new
               await supabase.from('subscription_payments').insert({
                   user_id: input.userId,
                   subscription_type: normalizedType,
                   period_year: input.year || null,
                   period_month: normalizedType === 'monthly' ? (input.periodMonth || null) : null,
                   amount: input.amount || 0,
                   currency: 'MAD',
                   due_date: input.year ? `${input.year}-12-31` : now,
                   paid_at: now
               });
           } else {
               // Update all matching (including legacy yearly) to paid and normalize type to annual
               for (const rec of existingRecords || []) {
                 await supabase.from('subscription_payments').update({
                     paid_at: now,
                     subscription_type: normalizedType,
                     amount: input.amount || undefined,
                     updated_at: now
                 }).eq('id', rec.id);
               }
           }
       } else {
           // Unpaid
           if (existingRecords && existingRecords.length > 0) {
              for (const rec of existingRecords) {
                await supabase.from('subscription_payments').update({
                    paid_at: null,
                    updated_at: now
                }).eq('id', rec.id);
              }
           }
       }
       return { success: true };
    }),

    createInvoiceForCouncil: publicProcedure
    .input(z.object({
      userId: z.string().uuid(),
      subscriptionType: z.string(),
      periodYear: z.number().int(),
      periodMonth: z.number().int().optional(),
      amount: z.number(),
      currency: z.string().default('MAD'),
      dueDate: z.string(),
      status: z.enum(['paid', 'unpaid']).optional().default('unpaid'),
    }))
    .mutation(async ({ input }) => {
       const now = new Date().toISOString();
       const { data, error } = await supabase.from('subscription_payments').insert({
           user_id: input.userId,
           subscription_type: input.subscriptionType,
           period_year: input.periodYear,
           period_month: input.periodMonth || null,
           amount: input.amount,
           currency: input.currency,
           due_date: input.dueDate,
           paid_at: input.status === 'paid' ? now : null,
           updated_at: now,
           created_at: now,
       }).select('id').single();
       if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
       return { success: true, id: (data as any)?.id ?? null };
    }),

    createBulkPayments: publicProcedure
    .input(z.object({
      payments: z.array(z.object({
        userId: z.string().uuid(),
        subscriptionType: z.string(),
        periodYear: z.number().int(),
        periodMonth: z.number().int().optional(),
        amount: z.number(),
        status: z.enum(['paid', 'unpaid'])
      }))
    }))
    .mutation(async ({ input }) => {
       const now = new Date().toISOString();
       
       // Transactional types allow multiple subscriptions per notary
       const transactionalTypes = ['badge', 'stamps', 'notebook', 'register', 'equipment', 'suit', 'donations', 'other', 'affiliation', 'notaried', 'annual', 'monthly'];
       
       // Separate payments into transactional and non-transactional
       const transactionalPayments = input.payments.filter(p => transactionalTypes.includes(p.subscriptionType));
       const nonTransactionalPayments = input.payments.filter(p => !transactionalTypes.includes(p.subscriptionType));
       
       // For non-transactional payments, check for duplicates
       let newPayments = [...transactionalPayments]; // Transactional: always allow
       let updatedPayments: any[] = [];
       
       if (nonTransactionalPayments.length > 0) {
         const existingQuery = supabase
           .from('subscription_payments')
           .select('id, user_id, subscription_type, period_year, period_month');

         const userIds = nonTransactionalPayments.map(p => p.userId);
         const queryWithFilter = existingQuery.in('user_id', userIds);

         const { data: existingRecords } = await queryWithFilter;
         
         const existingMap = new Map(
           (existingRecords || []).map(r => [
             `${r.user_id}:${r.subscription_type}:${r.period_year}:${r.period_month || 'null'}`,
             r
           ])
         );

         const validNonTransactional: any[] = [];
         nonTransactionalPayments.forEach(payment => {
           const key = `${payment.userId}:${payment.subscriptionType}:${payment.periodYear}:${payment.periodMonth || 'null'}`;
           const existing = existingMap.get(key);
           
           if (existing) {
             // Record exists - mark for update instead of insert
             updatedPayments.push({
               id: existing.id,
               amount: payment.amount,
               status: payment.status
             });
           } else {
             // New record
             validNonTransactional.push(payment);
           }
         });
         
         newPayments = [...transactionalPayments, ...validNonTransactional];
       }

       if (newPayments.length === 0 && updatedPayments.length === 0) {
         return { 
           success: true, 
           count: 0, 
           message: 'جميع الفواتير موجودة مسبقاً',
           skipped: input.payments.length 
         };
       }

       let insertedCount = 0;
       let updatedCount = 0;

       // Insert new payments
       if (newPayments.length > 0) {
         const insertData = newPayments.map(payment => ({
           user_id: payment.userId,
           subscription_type: payment.subscriptionType,
           period_year: payment.periodYear,
           period_month: payment.periodMonth || null,
           amount: payment.amount,
           currency: 'MAD',
           due_date: payment.subscriptionType === 'monthly' && payment.periodMonth
             ? `${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}-28`
             : `${payment.periodYear}-12-31`,
           paid_at: payment.status === 'paid' ? now : null,
           created_at: now,
           updated_at: now
         }));

         const { data, error } = await supabase
           .from('subscription_payments')
           .insert(insertData)
           .select();

         if (error) {
           throw new TRPCError({ 
             code: 'INTERNAL_SERVER_ERROR', 
             message: `Failed to create bulk payments: ${error.message}` 
           });
         }

         insertedCount = data?.length || 0;
       }

       // Update existing payments
       if (updatedPayments.length > 0) {
         for (const payment of updatedPayments) {
           const { error } = await supabase
             .from('subscription_payments')
             .update({
               amount: payment.amount,
               paid_at: payment.status === 'paid' ? now : null,
               updated_at: now
             })
             .eq('id', payment.id);

           if (!error) {
             updatedCount++;
           }
         }
       }

       const totalCount = insertedCount + updatedCount;
       const skippedCount = input.payments.length - totalCount;
       return { 
         success: true, 
         count: totalCount,
         inserted: insertedCount,
         updated: updatedCount,
         skipped: skippedCount,
         message: updatedCount > 0 
           ? `تم إنشاء/تحديث ${totalCount} فاتورة بنجاح (${insertedCount} جديدة، ${updatedCount} محدثة)`
           : `تم إنشاء ${insertedCount} فاتورة بنجاح`
       };
    }),

    deletePayment: publicProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ input }) => {
       const { error } = await supabase
         .from('subscription_payments')
         .delete()
         .eq('id', input.id);

       if (error) {
         throw new TRPCError({ 
           code: 'INTERNAL_SERVER_ERROR', 
           message: `Failed to delete payment: ${error.message}` 
         });
       }

       return { success: true };
    }),
});
