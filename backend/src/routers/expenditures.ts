import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { publicProcedure, router, resolveSessionUser } from './trpc';
import { sanitizeIlikePattern } from '../utils/inputSanitizer';

type AuthUser = { id: string; role: string; is_active: boolean };

const NATURE = [
  'operating',
  'capex',
  'training',
  'professional_activities',
  'meetings_conferences',
  'travel_accommodation',
  'it_digital',
  'legal_studies',
  'professional_services',
  'maintenance',
  'reserves_compensation',
  'professional_solidarity',
] as const;

type SpendingNature = (typeof NATURE)[number];

const GRANULARITY = ['annual', 'quarterly', 'monthly', 'weekly', 'on_demand'] as const;
const INFLUENCING_BODY = ['executive_office', 'regional_council', 'standing_committee', 'presidency', 'general_administration'] as const;
const DOC_TYPE = ['invoice', 'contract', 'receipt', 'payment_order', 'other'] as const;
const PAYMENT_METHOD = ['transfer', 'check', 'cash', 'professional_account'] as const;
const STATUS = ['draft', 'under_review', 'accepted', 'rejected', 'deferred'] as const;

type ExpenditureStatus = (typeof STATUS)[number];

async function requireUser(sessionToken: string): Promise<AuthUser> {
  const user = await resolveSessionUser(sessionToken);
  return { id: user.id, role: user.role, is_active: user.is_active };
}

async function ensureNotClosed(reportYear: number) {
  const { data, error } = await supabase
    .from('expenditures_year_closings')
    .select('report_year')
    .eq('report_year', reportYear)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  if (data) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Year is closed' });
  }
}

async function audit(actorUserId: string | null, action: string, entityType: string, entityId: string | null, meta?: any) {
  await supabase.from('expenditures_audit_log').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta: meta ?? null,
  });
}

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10);
}

function yearFromYmd(ymd: string) {
  const y = Number(ymd.slice(0, 4));
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

async function upsertConflicts(params: { expenditureId: string; conflicts: Array<{ type: string; severity: 'low' | 'medium' | 'high'; details?: any }>; actorUserId: string | null }) {
  // For simplicity: clear unresolved conflicts and reinsert current ones.
  await supabase.from('expenditures_conflicts').delete().eq('expenditure_id', params.expenditureId).eq('resolved', false);
  if (params.conflicts.length === 0) return;

  const rows = params.conflicts.map((c) => ({
    expenditure_id: params.expenditureId,
    conflict_type: c.type,
    severity: c.severity,
    details: c.details ?? null,
  }));

  await supabase.from('expenditures_conflicts').insert(rows);
  await audit(params.actorUserId, 'conflictCheck', 'national_expenditures', params.expenditureId, { conflicts: rows });
}

async function computeConflicts(input: {
  id?: string;
  paymentDate: string;
  beneficiary: string;
  amount: number;
  documentReference?: string | null;
  spendingNature: SpendingNature;
  reportYear: number;
}): Promise<Array<{ type: string; severity: 'low' | 'medium' | 'high'; details?: any }>> {
  const conflicts: Array<{ type: string; severity: 'low' | 'medium' | 'high'; details?: any }> = [];

  // Duplicate document reference
  if (input.documentReference) {
    let q = supabase
      .from('national_expenditures')
      .select('id, operation_number, payment_date, amount')
      .eq('document_reference', input.documentReference)
      .limit(5);
    if (input.id) q = q.neq('id', input.id);
    const { data, error } = await q;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    if ((data ?? []).length > 0) {
      conflicts.push({ type: 'duplicate_document_reference', severity: 'high', details: { matches: data } });
    }
  }

  // Near-duplicate same day + amount + beneficiary
  let q2 = supabase
    .from('national_expenditures')
    .select('id, operation_number, payment_date, amount, beneficiary_entity')
    .eq('payment_date', input.paymentDate)
    .eq('beneficiary_entity', input.beneficiary)
    .eq('amount', input.amount)
    .limit(5);
  if (input.id) q2 = q2.neq('id', input.id);
  const { data: dup2, error: dup2Err } = await q2;
  if (dup2Err) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: dup2Err.message });
  if ((dup2 ?? []).length > 0) {
    conflicts.push({ type: 'duplicate_same_day_amount_beneficiary', severity: 'medium', details: { matches: dup2 } });
  }

  // Budget overrun (if budget exists)
  const { data: budgetLine, error: budgetErr } = await supabase
    .from('national_budget_lines')
    .select('id, allocated_amount, ceiling_amount')
    .eq('report_year', input.reportYear)
    .eq('spending_nature', input.spendingNature)
    .maybeSingle();
  if (budgetErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: budgetErr.message });

  if (budgetLine?.id) {
    const { data: sumRows, error: sumErr } = await supabase
      .from('national_expenditures')
      .select('amount, status, payment_date, spending_nature')
      .gte('payment_date', `${input.reportYear}-01-01`)
      .lte('payment_date', `${input.reportYear}-12-31`)
      .eq('spending_nature', input.spendingNature)
      .in('status', ['under_review', 'accepted', 'deferred']);
    if (sumErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: sumErr.message });
    const spent = (sumRows ?? []).reduce((acc, r: any) => acc + Number(r.amount ?? 0), 0);
    const projected = spent + input.amount;
    const ceiling = Number(budgetLine.ceiling_amount ?? 0);
    const allocated = Number(budgetLine.allocated_amount ?? 0);

    const limit = ceiling > 0 ? ceiling : allocated;
    if (limit > 0 && projected > limit) {
      conflicts.push({
        type: 'budget_overrun',
        severity: 'high',
        details: { allocated, ceiling, spent, projected, limit },
      });
    }
  }

  return conflicts;
}

const budgetLineInput = z.object({
  sessionToken: z.string(),
  reportYear: z.number().int().min(2000).max(2100),
  spendingNature: z.enum(NATURE),
  allocatedAmount: z.number().nonnegative(),
  ceilingAmount: z.number().nonnegative().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

const listBudgetLinesInput = z.object({
  sessionToken: z.string(),
  reportYear: z.number().int().min(2000).max(2100),
});

const expenseCoreInput = z.object({
  sessionToken: z.string(),
  operationNumber: z.string().min(3).max(50),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payerEntity: z.string().min(2).max(200),
  beneficiaryEntity: z.string().min(2).max(200),
  spendingNature: z.enum(NATURE),
  spendingSubtype: z.string().max(200).optional().nullable(),
  timeGranularity: z.enum(GRANULARITY),
  influencingBody: z.enum(INFLUENCING_BODY),
  documentType: z.enum(DOC_TYPE),
  documentReference: z.string().max(200).optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHOD),
  status: z.enum(STATUS).optional().nullable(),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).max(10).optional().nullable(),
  controllingEntity: z.string().max(200).optional().nullable(),
  legalNotes: z.string().max(2000).optional().nullable(),
  performanceReportRef: z.string().max(200).optional().nullable(),
  budgetLineId: z.string().uuid().optional().nullable(),
});

const createExpenseInput = expenseCoreInput;
const updateExpenseInput = expenseCoreInput.extend({ expenditureId: z.string().uuid() });

const listExpensesInput = z.object({
  sessionToken: z.string(),
  reportYear: z.number().int().min(2000).max(2100),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  spendingNature: z.enum(NATURE).optional().nullable(),
  influencingBody: z.enum(INFLUENCING_BODY).optional().nullable(),
  status: z.enum(STATUS).optional().nullable(),
  minAmount: z.number().nonnegative().optional().nullable(),
  maxAmount: z.number().nonnegative().optional().nullable(),
  q: z.string().max(200).optional().nullable(),
  limit: z.number().int().min(1).max(500).optional().nullable(),
});

const transitionInput = z.object({ sessionToken: z.string(), expenditureId: z.string().uuid(), note: z.string().max(2000).optional().nullable() });

const uploadDocInput = z.object({
  sessionToken: z.string(),
  expenditureId: z.string().uuid(),
  kind: z.enum(DOC_TYPE),
  file: fileUploadSchema,
});

const dashboardInput = z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100) });

function requireNational(user: AuthUser) {
  if (user.role !== 'national_notary_authority') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'National authority required' });
  }
}

function isRegional(user: AuthUser) {
  return user.role === 'regional_adoul_council';
}

export const expendituresRouter = router({
  upsertBudgetLine: publicProcedure.input(budgetLineInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);
    await ensureNotClosed(input.reportYear);

    const payload = {
      report_year: input.reportYear,
      spending_nature: input.spendingNature,
      allocated_amount: input.allocatedAmount,
      ceiling_amount: input.ceilingAmount ?? null,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('national_budget_lines')
      .upsert(payload, { onConflict: 'report_year,spending_nature' })
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'upsertBudgetLine', 'national_budget_lines', data.id, payload);
    return { budgetLine: data };
  }),

  listBudgetLines: publicProcedure.input(listBudgetLinesInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data, error } = await supabase
      .from('national_budget_lines')
      .select('*')
      .eq('report_year', input.reportYear)
      .order('spending_nature', { ascending: true });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { rows: data ?? [] };
  }),

  createExpense: publicProcedure.input(createExpenseInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const reportYear = yearFromYmd(input.paymentDate);
    await ensureNotClosed(reportYear);

    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);
    if (!national && !regional) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const status: ExpenditureStatus = (input.status as ExpenditureStatus | null) ?? (regional ? 'under_review' : 'draft');

    const payload: any = {
      operation_number: input.operationNumber,
      payment_date: input.paymentDate,
      payer_entity: input.payerEntity,
      beneficiary_entity: input.beneficiaryEntity,
      spending_nature: input.spendingNature,
      spending_subtype: input.spendingSubtype ?? null,
      time_granularity: input.timeGranularity,
      influencing_body: input.influencingBody,
      document_type: input.documentType,
      document_reference: input.documentReference ?? null,
      payment_method: input.paymentMethod,
      status,
      amount: input.amount,
      currency: input.currency ?? 'MAD',
      controlling_entity: input.controllingEntity ?? null,
      legal_notes: input.legalNotes ?? null,
      performance_report_ref: input.performanceReportRef ?? null,
      budget_line_id: input.budgetLineId ?? null,
      created_by: user.id,
      council_user_id: regional ? user.id : null,
    };

    const { data, error } = await supabase.from('national_expenditures').insert(payload).select('*').single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    await audit(user.id, 'createExpense', 'national_expenditures', data.id, payload);

    const conflicts = await computeConflicts({
      id: data.id,
      paymentDate: input.paymentDate,
      beneficiary: input.beneficiaryEntity,
      amount: input.amount,
      documentReference: input.documentReference ?? null,
      spendingNature: input.spendingNature,
      reportYear,
    });
    await upsertConflicts({ expenditureId: data.id, conflicts, actorUserId: user.id });

    return { expenditure: data, conflicts };
  }),

  updateExpense: publicProcedure.input(updateExpenseInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const reportYear = yearFromYmd(input.paymentDate);
    await ensureNotClosed(reportYear);

    const { data: existing, error: exErr } = await supabase
      .from('national_expenditures')
      .select('*')
      .eq('id', input.expenditureId)
      .single();
    if (exErr || !existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });

    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);

    if (!national) {
      if (!regional || existing.council_user_id !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      if (existing.status === 'accepted') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot edit accepted expenditure' });
      }
    }

    const payload: any = {
      operation_number: input.operationNumber,
      payment_date: input.paymentDate,
      payer_entity: input.payerEntity,
      beneficiary_entity: input.beneficiaryEntity,
      spending_nature: input.spendingNature,
      spending_subtype: input.spendingSubtype ?? null,
      time_granularity: input.timeGranularity,
      influencing_body: input.influencingBody,
      document_type: input.documentType,
      document_reference: input.documentReference ?? null,
      payment_method: input.paymentMethod,
      amount: input.amount,
      currency: input.currency ?? 'MAD',
      controlling_entity: input.controllingEntity ?? null,
      legal_notes: input.legalNotes ?? null,
      performance_report_ref: input.performanceReportRef ?? null,
      budget_line_id: input.budgetLineId ?? null,
      updated_at: new Date().toISOString(),
    };

    // Regional users cannot set status directly.
    if (national && input.status) {
      payload.status = input.status;
    }

    const { data, error } = await supabase
      .from('national_expenditures')
      .update(payload)
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'updateExpense', 'national_expenditures', input.expenditureId, payload);

    const conflicts = await computeConflicts({
      id: input.expenditureId,
      paymentDate: input.paymentDate,
      beneficiary: input.beneficiaryEntity,
      amount: input.amount,
      documentReference: input.documentReference ?? null,
      spendingNature: input.spendingNature,
      reportYear,
    });
    await upsertConflicts({ expenditureId: input.expenditureId, conflicts, actorUserId: user.id });

    return { expenditure: data, conflicts };
  }),

  listExpenses: publicProcedure.input(listExpensesInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);
    if (!national && !regional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    const from = input.fromDate ?? `${input.reportYear}-01-01`;
    const to = input.toDate ?? `${input.reportYear}-12-31`;

    let q = supabase
      .from('national_expenditures')
      .select('*')
      .gte('payment_date', from)
      .lte('payment_date', to)
      .order('payment_date', { ascending: false })
      .limit(input.limit ?? 200);

    if (!national) {
      q = q.eq('council_user_id', user.id);
    }

    if (input.spendingNature) q = q.eq('spending_nature', input.spendingNature);
    if (input.influencingBody) q = q.eq('influencing_body', input.influencingBody);
    if (input.status) q = q.eq('status', input.status);
    if (input.minAmount != null) q = q.gte('amount', input.minAmount);
    if (input.maxAmount != null) q = q.lte('amount', input.maxAmount);

    if (input.q) {
      // Basic search (ilike) on key fields with PostgREST injection defense
      const term = `%${sanitizeIlikePattern(input.q)}%`;
      q = q.or(`operation_number.ilike.${term},beneficiary_entity.ilike.${term},payer_entity.ilike.${term},document_reference.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    const ids = (data ?? []).map((r: any) => r.id);
    const { data: conflicts, error: cErr } = await supabase
      .from('expenditures_conflicts')
      .select('*')
      .in('expenditure_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false });

    if (cErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: cErr.message });

    const conflictsByExp = new Map<string, any[]>();
    for (const c of conflicts ?? []) {
      const list = conflictsByExp.get((c as any).expenditure_id) ?? [];
      list.push(c);
      conflictsByExp.set((c as any).expenditure_id, list);
    }

    return {
      rows: (data ?? []).map((r: any) => ({ ...r, conflicts: conflictsByExp.get(r.id) ?? [] })),
    };
  }),

  submitExpense: publicProcedure.input(transitionInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('*').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });

    const reportYear = yearFromYmd(exp.payment_date);
    await ensureNotClosed(reportYear);

    if (user.role !== 'regional_adoul_council') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only regional can submit' });
    }
    if (exp.council_user_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const { data, error } = await supabase
      .from('national_expenditures')
      .update({ status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'submitExpense', 'national_expenditures', input.expenditureId, { note: input.note ?? null });
    return { expenditure: data };
  }),

  nationalApproveExpense: publicProcedure.input(transitionInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('*').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
    const reportYear = yearFromYmd(exp.payment_date);
    await ensureNotClosed(reportYear);

    const { data, error } = await supabase
      .from('national_expenditures')
      .update({ status: 'accepted', reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_notes: input.note ?? null, updated_at: new Date().toISOString() })
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'nationalApproveExpense', 'national_expenditures', input.expenditureId, { note: input.note ?? null });
    return { expenditure: data };
  }),

  nationalSendToReview: publicProcedure.input(transitionInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('*').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
    const reportYear = yearFromYmd(exp.payment_date);
    await ensureNotClosed(reportYear);

    const { data, error } = await supabase
      .from('national_expenditures')
      .update({ status: 'under_review', reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_notes: input.note ?? null, updated_at: new Date().toISOString() })
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'nationalSendToReview', 'national_expenditures', input.expenditureId, { note: input.note ?? null });
    return { expenditure: data };
  }),

  nationalRejectExpense: publicProcedure.input(transitionInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('*').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
    const reportYear = yearFromYmd(exp.payment_date);
    await ensureNotClosed(reportYear);

    const { data, error } = await supabase
      .from('national_expenditures')
      .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_notes: input.note ?? null, updated_at: new Date().toISOString() })
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'nationalRejectExpense', 'national_expenditures', input.expenditureId, { note: input.note ?? null });
    return { expenditure: data };
  }),

  nationalDeferExpense: publicProcedure.input(transitionInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('*').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });
    const reportYear = yearFromYmd(exp.payment_date);
    await ensureNotClosed(reportYear);

    const { data, error } = await supabase
      .from('national_expenditures')
      .update({ status: 'deferred', reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_notes: input.note ?? null, updated_at: new Date().toISOString() })
      .eq('id', input.expenditureId)
      .select('*')
      .single();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await audit(user.id, 'nationalDeferExpense', 'national_expenditures', input.expenditureId, { note: input.note ?? null });
    return { expenditure: data };
  }),

  uploadSupportingDocument: publicProcedure.input(uploadDocInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const { data: exp, error: exErr } = await supabase.from('national_expenditures').select('id, council_user_id').eq('id', input.expenditureId).single();
    if (exErr || !exp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not found' });

    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);
    if (!national && !(regional && exp.council_user_id === user.id)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const uploaded = await uploadDocument(input.file);

    const payload = {
      expenditure_id: input.expenditureId,
      kind: input.kind,
      file_name: input.file.name,
      file_url: uploaded.url,
      file_path: uploaded.path,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      uploaded_by: user.id,
    };

    const { data, error } = await supabase.from('expenditure_supporting_documents').insert(payload).select('*').single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    await audit(user.id, 'uploadSupportingDocument', 'expenditure_supporting_documents', data.id, payload);
    return { document: data };
  }),

  getDashboard: publicProcedure.input(dashboardInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const from = `${input.reportYear}-01-01`;
    const to = `${input.reportYear}-12-31`;

    const { data: expenses, error } = await supabase
      .from('national_expenditures')
      .select('id, payment_date, amount, status, spending_nature, influencing_body')
      .gte('payment_date', from)
      .lte('payment_date', to)
      .in('status', ['under_review', 'accepted', 'deferred']);

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    const total = (expenses ?? []).reduce((a, r: any) => a + Number(r.amount ?? 0), 0);
    const accepted = (expenses ?? []).filter((r: any) => r.status === 'accepted').reduce((a, r: any) => a + Number(r.amount ?? 0), 0);
    const underReview = (expenses ?? []).filter((r: any) => r.status === 'under_review').reduce((a, r: any) => a + Number(r.amount ?? 0), 0);
    const deferred = (expenses ?? []).filter((r: any) => r.status === 'deferred').reduce((a, r: any) => a + Number(r.amount ?? 0), 0);

    const byNatureMap = new Map<string, number>();
    const byBodyMap = new Map<string, number>();
    const byMonth = Array.from({ length: 12 }).map(() => 0);

    for (const r of expenses ?? []) {
      const nature = (r as any).spending_nature as string;
      byNatureMap.set(nature, (byNatureMap.get(nature) ?? 0) + Number((r as any).amount ?? 0));
      const body = (r as any).influencing_body as string;
      byBodyMap.set(body, (byBodyMap.get(body) ?? 0) + Number((r as any).amount ?? 0));

      const m = Number(String((r as any).payment_date).slice(5, 7));
      if (m >= 1 && m <= 12) byMonth[m - 1] += Number((r as any).amount ?? 0);
    }

    const byNature = [...byNatureMap.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
    const byInfluencingBody = [...byBodyMap.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

    const { data: budgets, error: bErr } = await supabase
      .from('national_budget_lines')
      .select('spending_nature, allocated_amount, ceiling_amount')
      .eq('report_year', input.reportYear);
    if (bErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: bErr.message });

    const budgetTotal = (budgets ?? []).reduce((a, r: any) => a + Number(r.allocated_amount ?? 0), 0);
    const executionRate = budgetTotal > 0 ? Math.round((total / budgetTotal) * 10_000) / 100 : null;
    const variance = budgetTotal - total;

    // Burn-rate and projection
    const now = new Date();
    const monthsElapsed = input.reportYear === now.getFullYear() ? Math.max(1, now.getMonth() + 1) : 12;
    const burnRate = Math.round((total / monthsElapsed) * 100) / 100;
    const projectionYearEnd = Math.round(burnRate * 12 * 100) / 100;

    // Income collected (approved transfers) as quick comparison
    const { data: transfers, error: tErr } = await supabase
      .from('regional_income_transfers')
      .select('transferred_amount, transferred_at, approval_status')
      .gte('transferred_at', from)
      .lte('transferred_at', to)
      .eq('approval_status', 'approved');
    if (tErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tErr.message });
    const incomeCollected = (transfers ?? []).reduce((a, r: any) => a + Number(r.transferred_amount ?? 0), 0);

    const incomeVsExpenseGap = incomeCollected - total;

    return {
      totals: {
        total,
        accepted,
        underReview,
        deferred,
        budgetTotal,
        executionRatePct: executionRate,
        variance,
        burnRateMonthly: burnRate,
        projectionYearEnd,
        incomeCollected,
        incomeVsExpenseGap,
      },
      byNature,
      byInfluencingBody,
      byMonth,
    };
  }),

  closeYear: publicProcedure
    .input(z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100), note: z.string().max(2000).optional().nullable() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireNational(user);

      const payload = {
        report_year: input.reportYear,
        closed_by: user.id,
        note: input.note ?? null,
      };

      const { error } = await supabase.from('expenditures_year_closings').insert(payload);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      await audit(user.id, 'closeYear', 'expenditures_year_closings', String(input.reportYear), payload);
      return { ok: true };
    }),

  exportExpenses: publicProcedure
    .input(listExpensesInput.pick({ sessionToken: true, reportYear: true, fromDate: true, toDate: true, spendingNature: true, influencingBody: true, status: true, minAmount: true, maxAmount: true, q: true }).extend({ limit: z.number().int().min(1).max(5000).optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      requireNational(user);

      const from = input.fromDate ?? `${input.reportYear}-01-01`;
      const to = input.toDate ?? `${input.reportYear}-12-31`;

      let q = supabase
        .from('national_expenditures')
        .select('*')
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date', { ascending: false })
        .limit(input.limit ?? 5000);

      if (input.spendingNature) q = q.eq('spending_nature', input.spendingNature);
      if (input.influencingBody) q = q.eq('influencing_body', input.influencingBody);
      if (input.status) q = q.eq('status', input.status);
      if (input.minAmount != null) q = q.gte('amount', input.minAmount);
      if (input.maxAmount != null) q = q.lte('amount', input.maxAmount);
      if (input.q) {
        const term = `%${sanitizeIlikePattern(input.q)}%`;
        q = q.or(`operation_number.ilike.${term},beneficiary_entity.ilike.${term},payer_entity.ilike.${term},document_reference.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { rows: data ?? [] };
    }),
});
