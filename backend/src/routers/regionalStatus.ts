import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { publicProcedure, router, resolveSessionUser } from './trpc';

type AuthUser = { id: string; role: string; is_active: boolean };

async function requireUser(sessionToken: string): Promise<AuthUser> {
  const user = await resolveSessionUser(sessionToken);
  return { id: user.id, role: user.role, is_active: user.is_active };
}

function requireNational(user: AuthUser) {
  if (user.role !== 'national_notary_authority') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'National authority required' });
  }
}

function isRegional(user: AuthUser) {
  return user.role === 'regional_adoul_council';
}

function ymdYear(ymd: string) {
  const y = Number(String(ymd ?? '').slice(0, 4));
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

function safeNumber(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function computeTrafficLight(input: { compliancePct: number | null; incomeVsExpenseGap: number | null }) {
  const c = input.compliancePct ?? null;
  const g = input.incomeVsExpenseGap ?? null;

  if (c == null && g == null) return 'gray' as const;
  if ((c != null && c < 60) || (g != null && g < 0)) return 'red' as const;
  if ((c != null && c < 85) || (g != null && g < 0.15 * Math.abs(g))) return 'yellow' as const;
  return 'green' as const;
}

const listRegionsInput = z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100) });

const regionDetailsInput = z.object({
  sessionToken: z.string(),
  reportYear: z.number().int().min(2000).max(2100),
  councilUserId: z.string().uuid(),
});

const listDocumentsInput = z.object({
  sessionToken: z.string(),
  councilUserId: z.string().uuid(),
  reportYear: z.number().int().min(2000).max(2100).optional().nullable(),
  kind: z
    .enum(['financial_report', 'meeting_minutes', 'training', 'governance_report', 'communication', 'solidarity', 'legal_activity', 'other'])
    .optional()
    .nullable(),
});

const uploadDocumentInput = z.object({
  sessionToken: z.string(),
  councilUserId: z.string().uuid(),
  kind: z.enum(['financial_report', 'meeting_minutes', 'training', 'governance_report', 'communication', 'solidarity', 'legal_activity', 'other']),
  title: z.string().min(2).max(200),
  tags: z.array(z.string().max(50)).optional().nullable(),
  reportYear: z.number().int().min(2000).max(2100).optional().nullable(),
  ocrText: z.string().max(50_000).optional().nullable(),
  file: fileUploadSchema,
});

export const regionalStatusRouter = router({
  listRegions: publicProcedure.input(listRegionsInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    requireNational(user);

    const { data: profiles, error: pErr } = await supabase
      .from('regional_council_profiles')
      .select('user_id, council_name, region_code, notaries_count')
      .order('council_name', { ascending: true });
    if (pErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pErr.message });

    const councilIds = (profiles ?? []).map((p: any) => p.user_id);

    const { data: reports, error: rErr } = await supabase
      .from('regional_income_reports')
      .select('id, council_user_id, total_income, due_amount')
      .eq('report_year', input.reportYear);
    if (rErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: rErr.message });

    const { data: transfers, error: tErr } = await supabase
      .from('regional_income_transfers')
      .select('id, income_report_id, transferred_amount, approval_status, transferred_at, regional_income_reports!inner(id, report_year, council_user_id)')
      .eq('regional_income_reports.report_year', input.reportYear);
    if (tErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tErr.message });

    const from = `${input.reportYear}-01-01`;
    const to = `${input.reportYear}-12-31`;

    const expensesQ = supabase
      .from('national_expenditures')
      .select('council_user_id, amount, status, payment_date')
      .gte('payment_date', from)
      .lte('payment_date', to)
      .in('status', ['under_review', 'accepted', 'deferred']);

    if (councilIds.length > 0) {
      (expensesQ as any).in('council_user_id', councilIds);
    }

    const { data: expenses, error: eErr } = await expensesQ;
    if (eErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eErr.message });

    const regionsKeys = (profiles ?? []).map((p: any) => (p.region_code as string | null) ?? (p.council_name as string));
    const uniqueRegionKeys = [...new Set(regionsKeys)].filter(Boolean);

    // Notaries stats (best-effort): match notaries.region with region_code when available, else council_name.
    const notariesByRegion = new Map<string, { notaries: number; offices: Set<string> }>();
    if (uniqueRegionKeys.length > 0) {
      const { data: notaries, error: nErr } = await supabase
        .from('notaries')
        .select('region, office_location')
        .in('region', uniqueRegionKeys as any);

      if (!nErr) {
        for (const n of notaries ?? []) {
          const key = String((n as any).region ?? '');
          if (!key) continue;
          const existing = notariesByRegion.get(key) ?? { notaries: 0, offices: new Set<string>() };
          existing.notaries += 1;
          const office = String((n as any).office_location ?? '').trim();
          if (office) existing.offices.add(office);
          notariesByRegion.set(key, existing);
        }
      }
    }

    const reportAgg = new Map<string, { income: number; due: number }>();
    for (const rep of reports ?? []) {
      const id = String((rep as any).council_user_id);
      const ex = reportAgg.get(id) ?? { income: 0, due: 0 };
      ex.income += safeNumber((rep as any).total_income);
      ex.due += safeNumber((rep as any).due_amount);
      reportAgg.set(id, ex);
    }

    const transferAgg = new Map<string, { approved: number; all: number; lastAt: string | null }>();
    for (const tr of transfers ?? []) {
      const rep = (tr as any).regional_income_reports as any;
      const councilId = String(rep?.council_user_id ?? '');
      if (!councilId) continue;
      const ex = transferAgg.get(councilId) ?? { approved: 0, all: 0, lastAt: null as string | null };
      const amt = safeNumber((tr as any).transferred_amount);
      ex.all += amt;
      if ((tr as any).approval_status === 'approved') ex.approved += amt;
      const d = (tr as any).transferred_at ? String((tr as any).transferred_at) : null;
      if (d && (!ex.lastAt || d > ex.lastAt)) ex.lastAt = d;
      transferAgg.set(councilId, ex);
    }

    const expenseAgg = new Map<string, { total: number; accepted: number; underReview: number; deferred: number }>();
    for (const exp of expenses ?? []) {
      const councilId = String((exp as any).council_user_id ?? '');
      if (!councilId) continue;
      const ex = expenseAgg.get(councilId) ?? { total: 0, accepted: 0, underReview: 0, deferred: 0 };
      const amt = safeNumber((exp as any).amount);
      ex.total += amt;
      const st = String((exp as any).status ?? '');
      if (st === 'accepted') ex.accepted += amt;
      else if (st === 'under_review') ex.underReview += amt;
      else if (st === 'deferred') ex.deferred += amt;
      expenseAgg.set(councilId, ex);
    }

    const rows = (profiles ?? []).map((p: any) => {
      const councilUserId = String(p.user_id);
      const regionKey = (p.region_code as string | null) ?? (p.council_name as string);
      const r = reportAgg.get(councilUserId) ?? { income: 0, due: 0 };
      const t = transferAgg.get(councilUserId) ?? { approved: 0, all: 0, lastAt: null };
      const e = expenseAgg.get(councilUserId) ?? { total: 0, accepted: 0, underReview: 0, deferred: 0 };

      const compliancePct = r.due > 0 ? Math.round((t.approved / r.due) * 10_000) / 100 : null;
      const gap = r.due - t.approved;
      const incomeVsExpenseGap = t.approved - e.total;

      const notaryStat = notariesByRegion.get(regionKey);

      const traffic = computeTrafficLight({ compliancePct, incomeVsExpenseGap });

      return {
        councilUserId,
        councilName: p.council_name,
        regionCode: p.region_code,
        regionKey,

        professional: {
          notariesCountProfile: p.notaries_count ?? null,
          notariesCountComputed: notaryStat ? notaryStat.notaries : null,
          officesCountComputed: notaryStat ? notaryStat.offices.size : null,
        },

        financial: {
          regionalIncome: r.income,
          due10Pct: r.due,
          transferredApproved: t.approved,
          transferredAll: t.all,
          compliancePct,
          gap,
          lastTransferAt: t.lastAt,

          expensesTotal: e.total,
          expensesAccepted: e.accepted,
          expensesUnderReview: e.underReview,
          expensesDeferred: e.deferred,

          incomeVsExpenseGap,
        },

        traffic,
      };
    });

    // National aggregates
    const national = rows.reduce(
      (acc, r) => {
        acc.totalDue += safeNumber(r.financial.due10Pct);
        acc.totalTransferred += safeNumber(r.financial.transferredApproved);
        acc.totalExpenses += safeNumber(r.financial.expensesTotal);
        acc.totalNotaries += safeNumber(r.professional.notariesCountComputed ?? r.professional.notariesCountProfile ?? 0);
        return acc;
      },
      { totalDue: 0, totalTransferred: 0, totalExpenses: 0, totalNotaries: 0 },
    );

    const nationalCompliancePct = national.totalDue > 0 ? Math.round((national.totalTransferred / national.totalDue) * 10_000) / 100 : null;

    return {
      national: {
        totalDue10Pct: national.totalDue,
        totalTransferredApproved: national.totalTransferred,
        totalExpenses: national.totalExpenses,
        nationalCompliancePct,
        totalNotaries: national.totalNotaries,
      },
      rows,
    };
  }),

  getRegionDetails: publicProcedure.input(regionDetailsInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);
    if (!national && !(regional && user.id === input.councilUserId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const { data: profile, error: pErr } = await supabase
      .from('regional_council_profiles')
      .select('user_id, council_name, region_code, notaries_count')
      .eq('user_id', input.councilUserId)
      .single();
    if (pErr || !profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found' });

    const regionKey = (profile as any).region_code ?? (profile as any).council_name;

    const { data: notaries, error: nErr } = await supabase
      .from('notaries')
      .select('start_date, office_location')
      .eq('region', regionKey);

    const notariesByYear = new Map<number, number>();
    const offices = new Set<string>();
    if (!nErr) {
      for (const n of notaries ?? []) {
        const y = (n as any).start_date ? ymdYear(String((n as any).start_date)) : null;
        if (y) notariesByYear.set(y, (notariesByYear.get(y) ?? 0) + 1);
        const office = String((n as any).office_location ?? '').trim();
        if (office) offices.add(office);
      }
    }

    const from = `${input.reportYear}-01-01`;
    const to = `${input.reportYear}-12-31`;

    const { data: reports, error: rErr } = await supabase
      .from('regional_income_reports')
      .select('id, total_income, due_amount, granularity, report_month, report_quarter')
      .eq('report_year', input.reportYear)
      .eq('council_user_id', input.councilUserId);
    if (rErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: rErr.message });

    const { data: transfers, error: tErr } = await supabase
      .from('regional_income_transfers')
      .select('transferred_amount, approval_status, transferred_at, regional_income_reports!inner(report_year, council_user_id)')
      .eq('regional_income_reports.report_year', input.reportYear)
      .eq('regional_income_reports.council_user_id', input.councilUserId);
    if (tErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tErr.message });

    const { data: expenses, error: eErr } = await supabase
      .from('national_expenditures')
      .select('amount, status, payment_date')
      .gte('payment_date', from)
      .lte('payment_date', to)
      .eq('council_user_id', input.councilUserId)
      .in('status', ['under_review', 'accepted', 'deferred']);
    if (eErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eErr.message });

    const monthlyDue = Array.from({ length: 12 }).map(() => 0);
    const monthlyTransferred = Array.from({ length: 12 }).map(() => 0);
    const monthlyExpenses = Array.from({ length: 12 }).map(() => 0);

    // Due: allocate monthly reports to month, quarterly evenly across quarter, annual evenly across year (pragmatic)
    for (const rep of reports ?? []) {
      const due = safeNumber((rep as any).due_amount);
      const gran = String((rep as any).granularity);
      if (gran === 'monthly') {
        const m = safeNumber((rep as any).report_month);
        if (m >= 1 && m <= 12) monthlyDue[m - 1] += due;
      } else if (gran === 'quarterly') {
        const q = safeNumber((rep as any).report_quarter);
        const start = (q - 1) * 3;
        for (let i = 0; i < 3; i++) monthlyDue[start + i] += due / 3;
      } else {
        for (let i = 0; i < 12; i++) monthlyDue[i] += due / 12;
      }
    }

    for (const tr of transfers ?? []) {
      if ((tr as any).approval_status !== 'approved') continue;
      const d = String((tr as any).transferred_at ?? '');
      const m = Number(d.slice(5, 7));
      if (m >= 1 && m <= 12) monthlyTransferred[m - 1] += safeNumber((tr as any).transferred_amount);
    }

    for (const exp of expenses ?? []) {
      const d = String((exp as any).payment_date ?? '');
      const m = Number(d.slice(5, 7));
      if (m >= 1 && m <= 12) monthlyExpenses[m - 1] += safeNumber((exp as any).amount);
    }

    const totalDue = monthlyDue.reduce((a, b) => a + b, 0);
    const totalTransferred = monthlyTransferred.reduce((a, b) => a + b, 0);
    const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0);

    const compliancePct = totalDue > 0 ? Math.round((totalTransferred / totalDue) * 10_000) / 100 : null;

    return {
      profile: {
        councilUserId: profile.user_id,
        councilName: profile.council_name,
        regionCode: profile.region_code,
        regionKey,
      },
      professional: {
        notariesCountProfile: profile.notaries_count ?? null,
        notariesCountComputed: notaries ? notaries.length : null,
        officesCountComputed: offices.size,
        notariesByYear: [...notariesByYear.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year),
      },
      financial: {
        monthlyDue,
        monthlyTransferred,
        monthlyExpenses,
        totalDue,
        totalTransferred,
        totalExpenses,
        compliancePct,
      },
    };
  }),

  listDocuments: publicProcedure.input(listDocumentsInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);

    if (!national && !(regional && user.id === input.councilUserId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    let q = supabase
      .from('regional_council_documents')
      .select('*')
      .eq('council_user_id', input.councilUserId)
      .order('uploaded_at', { ascending: false })
      .limit(200);

    if (input.reportYear) q = q.eq('report_year', input.reportYear);
    if (input.kind) q = q.eq('kind', input.kind);

    const { data, error } = await q;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    return { rows: data ?? [] };
  }),

  uploadDocument: publicProcedure.input(uploadDocumentInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const national = user.role === 'national_notary_authority';
    const regional = isRegional(user);

    if (!national && !(regional && user.id === input.councilUserId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const uploaded = await uploadDocument(input.file);

    // best-effort region code from profile
    const { data: prof } = await supabase
      .from('regional_council_profiles')
      .select('region_code')
      .eq('user_id', input.councilUserId)
      .maybeSingle();

    const payload = {
      council_user_id: input.councilUserId,
      region_code: (prof as any)?.region_code ?? null,
      kind: input.kind,
      title: input.title,
      tags: input.tags ?? null,
      report_year: input.reportYear ?? null,
      file_name: input.file.name,
      file_url: uploaded.url,
      file_path: uploaded.path,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      ocr_text: input.ocrText ?? null,
      meta: null,
      uploaded_by: user.id,
    };

    const { data, error } = await supabase.from('regional_council_documents').insert(payload).select('*').single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    return { document: data };
  }),
});
