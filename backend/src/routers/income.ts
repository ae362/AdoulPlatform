import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { uploadDocument, fileUploadSchema } from '../utils/storage';
import { publicProcedure, router } from './trpc';

type AuthUser = { id: string; role: string; is_active: boolean };

const GRANULARITY = ['monthly', 'quarterly', 'annual'] as const;
type Granularity = (typeof GRANULARITY)[number];

const CONTRIBUTION_RATE = 0.10;

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

async function ensureNotClosed(reportYear: number) {
  const { data, error } = await supabase
    .from('income_year_closings')
    .select('report_year')
    .eq('report_year', reportYear)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  if (data) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Year is closed' });
  }
}

function computeDue(totalIncome: number, rate: number = CONTRIBUTION_RATE) {
  const due = totalIncome * rate;
  return Math.round(due * 100) / 100;
}

function computeDueDate(input: { year: number; granularity: Granularity; month?: number | null; quarter?: number | null }) {
  // Pragmatic governance defaults:
  // - monthly: due on 15th of next month
  // - quarterly: due 15th of month after quarter end
  // - annual: due 31 March of next year
  const { year, granularity, month, quarter } = input;
  if (granularity === 'annual') return new Date(Date.UTC(year + 1, 2, 31)).toISOString().slice(0, 10);
  if (granularity === 'monthly') {
    const m = (month ?? 1) - 1;
    const due = new Date(Date.UTC(year, m + 1, 15));
    return due.toISOString().slice(0, 10);
  }
  // quarterly
  const q = quarter ?? 1;
  const quarterEndMonthIdx = q * 3 - 1; // 0-based
  const due = new Date(Date.UTC(year, quarterEndMonthIdx + 1, 15));
  return due.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ymdToDate(ymd: string | null | undefined) {
  if (!ymd) return null;
  const d = new Date(ymd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function audit(actorUserId: string | null, action: string, entityType: string, entityId: string | null, meta?: any) {
  await supabase.from('income_audit_log').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta: meta ?? null,
  });
}

const councilProfileInput = z.object({
  sessionToken: z.string(),
  councilName: z.string().min(2).max(200),
  regionCode: z.string().max(50).optional().nullable(),
  notariesCount: z.number().int().min(0).max(200_000).optional().nullable(),
  councilUserId: z.string().uuid().optional().nullable(),
});

const upsertIncomeReportInput = z
  .object({
    sessionToken: z.string(),
    reportYear: z.number().int().min(2000).max(2100),
    granularity: z.enum(GRANULARITY),
    reportMonth: z.number().int().min(1).max(12).optional().nullable(),
    reportQuarter: z.number().int().min(1).max(4).optional().nullable(),
    totalIncome: z.number().nonnegative(),
    note: z.string().max(2000).optional().nullable(),
    councilUserId: z.string().uuid().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.granularity === 'monthly' && !val.reportMonth) {
      ctx.addIssue({ code: 'custom', message: 'reportMonth required for monthly', path: ['reportMonth'] });
    }
    if (val.granularity === 'quarterly' && !val.reportQuarter) {
      ctx.addIssue({ code: 'custom', message: 'reportQuarter required for quarterly', path: ['reportQuarter'] });
    }
    if (val.granularity === 'annual' && (val.reportMonth || val.reportQuarter)) {
      ctx.addIssue({ code: 'custom', message: 'Do not set month/quarter for annual', path: ['granularity'] });
    }
  });

const listInput = z.object({
  sessionToken: z.string(),
  reportYear: z.number().int().min(2000).max(2100),
});

const createTransferInput = z.object({
  sessionToken: z.string(),
  incomeReportId: z.string().uuid(),
  transferredAmount: z.number().nonnegative(),
  transferredAt: z.string().min(10), // ISO date
  bankRef: z.string().max(200).optional().nullable(),
});

const submitTransferInput = z.object({
  sessionToken: z.string(),
  transferId: z.string().uuid(),
});

const approveTransferInput = z.object({
  sessionToken: z.string(),
  transferId: z.string().uuid(),
  rejectionReason: z.string().max(1000).optional().nullable(),
});

const uploadDocInput = z.object({
  sessionToken: z.string(),
  transferId: z.string().uuid(),
  kind: z.enum(['bank_receipt', 'regional_financial_report', 'meeting_minutes', 'other']),
  file: fileUploadSchema,
});

export const incomeRouter = router({
  upsertCouncilProfile: publicProcedure.input(councilProfileInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const targetUserId = input.councilUserId ?? user.id;

    const isNational = user.role === 'national_notary_authority';
    const isRegional = user.role === 'regional_adoul_council';
    if (!isNational && !isRegional) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }
    if (!isNational && targetUserId !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    const payload = {
      user_id: targetUserId,
      council_name: input.councilName,
      region_code: input.regionCode ?? null,
      notaries_count: input.notariesCount ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('regional_council_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id, council_name, region_code, notaries_count')
      .single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'upsertCouncilProfile', 'regional_council_profiles', targetUserId, payload);
    return { success: true, profile: data };
  }),

  upsertIncomeReport: publicProcedure.input(upsertIncomeReportInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const isNational = user.role === 'national_notary_authority';
    const isRegional = user.role === 'regional_adoul_council';
    if (!isNational && !isRegional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    const councilUserId = input.councilUserId ?? user.id;
    if (!isNational && councilUserId !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    await ensureNotClosed(input.reportYear);

    const dueAmount = computeDue(input.totalIncome, CONTRIBUTION_RATE);
    const dueDate = computeDueDate({
      year: input.reportYear,
      granularity: input.granularity,
      month: input.reportMonth ?? null,
      quarter: input.reportQuarter ?? null,
    });

    const payload: any = {
      council_user_id: councilUserId,
      report_year: input.reportYear,
      granularity: input.granularity,
      report_month: input.reportMonth ?? null,
      report_quarter: input.reportQuarter ?? null,
      total_income: input.totalIncome,
      contribution_rate: CONTRIBUTION_RATE,
      due_amount: dueAmount,
      due_date: dueDate,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('regional_income_reports')
      .upsert(payload, {
        onConflict: 'council_user_id,report_year,granularity,report_month,report_quarter',
      })
      .select('*')
      .single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    // Versioning (audit-ready): store immutable snapshots of each report.
    // This is best-effort to avoid breaking environments where migration 025 isn't applied yet.
    try {
      const { data: last } = await supabase
        .from('regional_income_report_versions')
        .select('version')
        .eq('income_report_id', data.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (last as any)?.version ? Number((last as any).version) + 1 : 1;

      await supabase.from('regional_income_report_versions').insert({
        income_report_id: data.id,
        version: nextVersion,
        payload: {
          council_user_id: data.council_user_id,
          report_year: data.report_year,
          granularity: data.granularity,
          report_month: data.report_month,
          report_quarter: data.report_quarter,
          total_income: data.total_income,
          contribution_rate: data.contribution_rate,
          due_amount: data.due_amount,
          due_date: data.due_date,
          note: data.note,
          updated_at: data.updated_at,
        },
        created_by: user.id,
      });
    } catch {
      // ignore
    }

    await audit(user.id, 'upsertIncomeReport', 'regional_income_reports', data.id, {
      reportYear: input.reportYear,
      granularity: input.granularity,
      reportMonth: input.reportMonth ?? null,
      reportQuarter: input.reportQuarter ?? null,
      totalIncome: input.totalIncome,
      dueAmount,
    });

    return { success: true, report: data };
  }),

  listRegionalContributions: publicProcedure.input(listInput).query(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const isNational = user.role === 'national_notary_authority';
    if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    const { data: reports, error: reportsError } = await supabase
      .from('regional_income_reports')
      .select('id, council_user_id, report_year, granularity, report_month, report_quarter, total_income, due_amount, due_date')
      .eq('report_year', input.reportYear);
    if (reportsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reportsError.message });

    const reportIds = (reports ?? []).map((r: any) => r.id);

    const { data: transfers, error: transfersError } = await supabase
      .from('regional_income_transfers')
      .select('id, income_report_id, transferred_amount, transferred_at, approval_status, national_approved_at')
      .in('income_report_id', reportIds.length ? reportIds : ['00000000-0000-0000-0000-000000000000']);
    if (transfersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: transfersError.message });

    const { data: profiles, error: profilesError } = await supabase
      .from('regional_council_profiles')
      .select('user_id, council_name, region_code, notaries_count');
    if (profilesError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profilesError.message });

    const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const approvedTransfersByReport = new Map<string, any[]>();
    for (const t of transfers ?? []) {
      if (t.approval_status !== 'approved' && !t.national_approved_at) continue;
      const arr = approvedTransfersByReport.get(t.income_report_id) ?? [];
      arr.push(t);
      approvedTransfersByReport.set(t.income_report_id, arr);
    }

    // Aggregate per council
    const byCouncil = new Map<
      string,
      {
        councilUserId: string;
        councilName: string;
        regionCode: string | null;
        notariesCount: number | null;
        totalIncome: number;
        totalDue: number;
        transferredApproved: number;
        lastTransferAt: string | null;
        timeToTransferDays: number[];
      }
    >();

    const reportById = new Map<string, any>();
    for (const r of reports ?? []) reportById.set(String((r as any).id), r);

    for (const r of reports ?? []) {
      const councilUserId = r.council_user_id as string;
      const profile = profileByUser.get(councilUserId);
      const councilName = profile?.council_name ?? 'مجلس جهوي';
      const regionCode = profile?.region_code ?? null;
      const notariesCount = profile?.notaries_count ?? null;

      const current =
        byCouncil.get(councilUserId) ??
        ({
          councilUserId,
          councilName,
          regionCode,
          notariesCount,
          totalIncome: 0,
          totalDue: 0,
          transferredApproved: 0,
          lastTransferAt: null,
          timeToTransferDays: [],
        } as any);

      current.totalIncome += Number(r.total_income ?? 0);
      current.totalDue += Number(r.due_amount ?? computeDue(Number(r.total_income ?? 0)));

      const tr = approvedTransfersByReport.get(r.id as string) ?? [];

      // time-to-transfer (report due_date -> first approved transfer date)
      const dueDate = ymdToDate(String((r as any).due_date ?? ''));
      if (dueDate && tr.length) {
        const firstTransferAt = [...tr]
          .map((t: any) => ymdToDate(String(t.transferred_at ?? '')))
          .filter(Boolean)
          .sort((a: any, b: any) => a.getTime() - b.getTime())[0] as Date | undefined;
        if (firstTransferAt) {
          // Negative means early transfer; keep it for analytics but clamp for average display later.
          current.timeToTransferDays.push(daysBetween(dueDate, firstTransferAt));
        }
      }

      for (const t of tr) {
        current.transferredApproved += Number(t.transferred_amount ?? 0);
        const d = String(t.transferred_at);
        if (!current.lastTransferAt || d > current.lastTransferAt) current.lastTransferAt = d;
      }

      byCouncil.set(councilUserId, current);
    }

    const rows = Array.from(byCouncil.values()).map((c) => {
      const gap = Math.max(0, c.totalDue - c.transferredApproved);
      const compliancePct = c.totalDue > 0 ? Math.round((c.transferredApproved / c.totalDue) * 100) : 0;
      const status = compliancePct >= 100 ? 'green' : compliancePct >= 50 ? 'yellow' : 'red';

      const fairScore = c.totalIncome > 0 ? (c.transferredApproved / c.totalIncome) * 100 : 0;

      const nonNegativeTtt = c.timeToTransferDays.map((d) => Math.max(0, d)).filter((d) => Number.isFinite(d));
      const avgTimeToTransferDays = nonNegativeTtt.length
        ? Number((nonNegativeTtt.reduce((a, b) => a + b, 0) / nonNegativeTtt.length).toFixed(2))
        : null;
      const medianTimeToTransferDays = nonNegativeTtt.length ? Number((median(nonNegativeTtt) ?? 0).toFixed(2)) : null;
      return {
        councilUserId: c.councilUserId,
        councilName: c.councilName,
        regionCode: c.regionCode,
        totalIncome: Number(c.totalIncome.toFixed(2)),
        due: Number(c.totalDue.toFixed(2)),
        transferred: Number(c.transferredApproved.toFixed(2)),
        gap: Number(gap.toFixed(2)),
        lastTransferAt: c.lastTransferAt,
        compliancePct,
        complianceStatus: status,
        notariesCount: c.notariesCount,
        fairScore: Number(fairScore.toFixed(2)),
        avgTimeToTransferDays,
        medianTimeToTransferDays,
      };
    });

    // weighted fair score
    const notariesCounts = rows.map((r) => r.notariesCount).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const avgNotaries = notariesCounts.length ? notariesCounts.reduce((a, b) => a + b, 0) / notariesCounts.length : null;
    const rowsWithWeight = rows.map((r) => {
      const weighted = avgNotaries && r.notariesCount ? r.fairScore * (r.notariesCount / avgNotaries) : null;
      return { ...r, weightedFairScore: weighted !== null ? Number(weighted.toFixed(2)) : null };
    });

    return { year: input.reportYear, contributionRate: CONTRIBUTION_RATE, rows: rowsWithWeight };
  }),

  getNationalOverview: publicProcedure
    .input(z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100) }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const isNational = user.role === 'national_notary_authority';
      if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

      const { data: reports, error: reportsError } = await supabase
        .from('regional_income_reports')
        .select('id, council_user_id, report_year, granularity, report_month, report_quarter, total_income, due_amount, due_date')
        .eq('report_year', input.reportYear);
      if (reportsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reportsError.message });

      const reportIds = (reports ?? []).map((r: any) => r.id);
      const { data: transfers, error: transfersError } = await supabase
        .from('regional_income_transfers')
        .select('income_report_id, transferred_amount, transferred_at, approval_status, national_approved_at')
        .in('income_report_id', reportIds.length ? reportIds : ['00000000-0000-0000-0000-000000000000']);
      if (transfersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: transfersError.message });

      const approvedByReport = new Map<string, number>();
      for (const t of transfers ?? []) {
        if (t.approval_status !== 'approved' && !t.national_approved_at) continue;
        approvedByReport.set(
          t.income_report_id,
          (approvedByReport.get(t.income_report_id) ?? 0) + Number(t.transferred_amount ?? 0)
        );
      }

      const totals = {
        totalIncome: 0,
        totalDue: 0,
        totalTransferred: 0,
      };

      const nowIso = new Date().toISOString().slice(0, 10);
      const councilsWithIncome = new Set<string>();
      const councilsCompliant = new Set<string>();
      const arrearsCouncils = new Set<string>();

      const monthlyDue = Array.from({ length: 12 }, () => 0);
      const monthlyTransferred = Array.from({ length: 12 }, () => 0);
      const quarterlyDue = Array.from({ length: 4 }, () => 0);
      const quarterlyTransferred = Array.from({ length: 4 }, () => 0);

      // Judicial season (Sep-Aug) split into 4 seasons of 3 months:
      // S1: Sep-Nov, S2: Dec-Feb, S3: Mar-May, S4: Jun-Aug
      const seasonalDueCalendar = Array.from({ length: 4 }, () => 0);
      const seasonalTransferredCalendar = Array.from({ length: 4 }, () => 0);
      const seasonalDueJudicial = Array.from({ length: 4 }, () => 0);
      const seasonalTransferredJudicial = Array.from({ length: 4 }, () => 0);

      const arrearsCouncilIds = new Set<string>();

      for (const r of reports ?? []) {
        const income = Number(r.total_income ?? 0);
        const due = Number(r.due_amount ?? computeDue(income));
        const transferred = approvedByReport.get(r.id) ?? 0;

        totals.totalIncome += income;
        totals.totalDue += due;
        totals.totalTransferred += transferred;

        councilsWithIncome.add(r.council_user_id);
        if (due > 0 && transferred >= due) councilsCompliant.add(r.council_user_id);

        const dueDate = String(r.due_date ?? '');
        if (dueDate && dueDate < nowIso && transferred < due) {
          arrearsCouncils.add(r.council_user_id);
          arrearsCouncilIds.add(String(r.council_user_id));
        }

        // Temporal allocation (monthly buckets + quarterly totals)
        if (r.granularity === 'monthly' && r.report_month) {
          const m = clamp(Number(r.report_month), 1, 12);
          const idx = m - 1;
          monthlyDue[idx] += due;
          monthlyTransferred[idx] += transferred;
          const qIdx = Math.floor(idx / 3);
          quarterlyDue[qIdx] += due;
          quarterlyTransferred[qIdx] += transferred;
        } else if (r.granularity === 'quarterly' && r.report_quarter) {
          const q = clamp(Number(r.report_quarter), 1, 4);
          const startMonthIdx = (q - 1) * 3;
          quarterlyDue[q - 1] += due;
          quarterlyTransferred[q - 1] += transferred;
          for (let i = 0; i < 3; i++) {
            monthlyDue[startMonthIdx + i] += due / 3;
            monthlyTransferred[startMonthIdx + i] += transferred / 3;
          }
        } else {
          // annual: distribute evenly (for analysis/forecasting)
          quarterlyDue[0] += due / 4;
          quarterlyDue[1] += due / 4;
          quarterlyDue[2] += due / 4;
          quarterlyDue[3] += due / 4;
          quarterlyTransferred[0] += transferred / 4;
          quarterlyTransferred[1] += transferred / 4;
          quarterlyTransferred[2] += transferred / 4;
          quarterlyTransferred[3] += transferred / 4;
          for (let i = 0; i < 12; i++) {
            monthlyDue[i] += due / 12;
            monthlyTransferred[i] += transferred / 12;
          }
        }
      }

      // seasonal aggregation from monthly allocated
      for (let m = 1; m <= 12; m++) {
        const idx = m - 1;
        const qIdx = Math.floor(idx / 3); // calendar seasons ~= quarters
        seasonalDueCalendar[qIdx] += monthlyDue[idx];
        seasonalTransferredCalendar[qIdx] += monthlyTransferred[idx];

        // judicial mapping
        // Map months to judicial index: Sep=1, Oct=2, Nov=3, Dec=4, Jan=5, Feb=6, Mar=7, Apr=8, May=9, Jun=10, Jul=11, Aug=12
        const judicialPos = m >= 9 ? m - 8 : m + 4;
        const sIdx = Math.floor((judicialPos - 1) / 3);
        seasonalDueJudicial[sIdx] += monthlyDue[idx];
        seasonalTransferredJudicial[sIdx] += monthlyTransferred[idx];
      }

      const complianceRate = councilsWithIncome.size
        ? Math.round((councilsCompliant.size / councilsWithIncome.size) * 100)
        : 0;

      // Simple forecast: project transfers by average monthly performance (if any monthly reports) otherwise assume due.
      const monthsWithData = monthlyTransferred.filter((v) => v > 0).length;
      const currentMonth = new Date().getUTCMonth() + 1;
      const avg = monthsWithData ? totals.totalTransferred / Math.max(1, monthsWithData) : totals.totalTransferred / Math.max(1, currentMonth);
      const forecastTransferred = Math.min(totals.totalDue, totals.totalTransferred + avg * Math.max(0, 12 - currentMonth));

      // Surplus/deficit is based on transferred vs due
      const surplusDeficit = totals.totalTransferred - totals.totalDue;

      // Comparison vs previous year (best-effort)
      const prevYear = input.reportYear - 1;
      const { data: prevReports } = await supabase
        .from('regional_income_reports')
        .select('id, total_income, due_amount')
        .eq('report_year', prevYear);
      const prevReportIds = (prevReports ?? []).map((r: any) => r.id);
      const { data: prevTransfers } = await supabase
        .from('regional_income_transfers')
        .select('income_report_id, transferred_amount, approval_status, national_approved_at')
        .in('income_report_id', prevReportIds.length ? prevReportIds : ['00000000-0000-0000-0000-000000000000']);

      const prevApprovedByReport = new Map<string, number>();
      for (const t of prevTransfers ?? []) {
        if ((t as any).approval_status !== 'approved' && !(t as any).national_approved_at) continue;
        prevApprovedByReport.set(
          String((t as any).income_report_id),
          (prevApprovedByReport.get(String((t as any).income_report_id)) ?? 0) + Number((t as any).transferred_amount ?? 0),
        );
      }

      const prevTotals = { totalIncome: 0, totalDue: 0, totalTransferred: 0 };
      for (const r of prevReports ?? []) {
        prevTotals.totalIncome += Number((r as any).total_income ?? 0);
        prevTotals.totalDue += Number((r as any).due_amount ?? computeDue(Number((r as any).total_income ?? 0)));
        prevTotals.totalTransferred += prevApprovedByReport.get(String((r as any).id)) ?? 0;
      }

      const deltaPct = (curr: number, prev: number) => {
        if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
        return Number((((curr - prev) / prev) * 100).toFixed(2));
      };

      // Arrears details (names)
      const arrearsIds = [...arrearsCouncilIds];
      const { data: arrearsProfiles } = await supabase
        .from('regional_council_profiles')
        .select('user_id, council_name, region_code')
        .in('user_id', arrearsIds.length ? arrearsIds : ['00000000-0000-0000-0000-000000000000']);

      const arrears = (arrearsProfiles ?? []).map((p: any) => ({
        councilUserId: p.user_id,
        councilName: p.council_name,
        regionCode: p.region_code ?? null,
      }));

      return {
        year: input.reportYear,
        contributionRate: CONTRIBUTION_RATE,
        totals: {
          totalIncome: Number(totals.totalIncome.toFixed(2)),
          totalDue: Number(totals.totalDue.toFixed(2)),
          totalTransferred: Number(totals.totalTransferred.toFixed(2)),
        },
        comparison: {
          year: prevYear,
          totals: {
            totalIncome: Number(prevTotals.totalIncome.toFixed(2)),
            totalDue: Number(prevTotals.totalDue.toFixed(2)),
            totalTransferred: Number(prevTotals.totalTransferred.toFixed(2)),
          },
          deltaPct: {
            totalIncome: deltaPct(totals.totalIncome, prevTotals.totalIncome),
            totalDue: deltaPct(totals.totalDue, prevTotals.totalDue),
            totalTransferred: deltaPct(totals.totalTransferred, prevTotals.totalTransferred),
          },
        },
        complianceRate,
        arrearsCount: arrearsCouncils.size,
        arrears,
        forecast: {
          expectedTransferredEndOfYear: Number(forecastTransferred.toFixed(2)),
        },
        surplusDeficit: Number(surplusDeficit.toFixed(2)),
        temporal: {
          monthly: {
            due: monthlyDue.map((v) => Number(v.toFixed(2))),
            transferred: monthlyTransferred.map((v) => Number(v.toFixed(2))),
          },
          quarterly: {
            due: quarterlyDue.map((v) => Number(v.toFixed(2))),
            transferred: quarterlyTransferred.map((v) => Number(v.toFixed(2))),
          },
          seasonal: {
            calendar: {
              due: seasonalDueCalendar.map((v) => Number(v.toFixed(2))),
              transferred: seasonalTransferredCalendar.map((v) => Number(v.toFixed(2))),
            },
            judicial: {
              due: seasonalDueJudicial.map((v) => Number(v.toFixed(2))),
              transferred: seasonalTransferredJudicial.map((v) => Number(v.toFixed(2))),
            },
          },
        },
      };
    }),

  listReconciliation: publicProcedure
    .input(z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100), councilUserId: z.string().uuid().optional().nullable() }))
    .query(async ({ input }) => {
      const user = await requireUser(input.sessionToken);

      const isNational = user.role === 'national_notary_authority';
      const isRegional = user.role === 'regional_adoul_council';
      if (!isNational && !isRegional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

      const councilUserId = isNational ? input.councilUserId ?? null : user.id;

      let reportQuery = supabase
        .from('regional_income_reports')
        .select('id, council_user_id, report_year, granularity, report_month, report_quarter, total_income, due_amount, due_date, note');
      reportQuery = reportQuery.eq('report_year', input.reportYear);
      if (councilUserId) reportQuery = reportQuery.eq('council_user_id', councilUserId);

      const { data: reports, error: reportsError } = await reportQuery;
      if (reportsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: reportsError.message });

      const reportIds = (reports ?? []).map((r: any) => r.id);
      const { data: transfers, error: transfersError } = await supabase
        .from('regional_income_transfers')
        .select('*')
        .in('income_report_id', reportIds.length ? reportIds : ['00000000-0000-0000-0000-000000000000'])
        .order('transferred_at', { ascending: false });
      if (transfersError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: transfersError.message });

      const transferIds = (transfers ?? []).map((t: any) => t.id);
      const { data: docs, error: docsError } = await supabase
        .from('income_supporting_documents')
        .select('*')
        .in('transfer_id', transferIds.length ? transferIds : ['00000000-0000-0000-0000-000000000000'])
        .order('uploaded_at', { ascending: false });
      if (docsError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: docsError.message });

      const docsByTransfer = new Map<string, any[]>();
      for (const d of docs ?? []) {
        const arr = docsByTransfer.get(d.transfer_id) ?? [];
        arr.push(d);
        docsByTransfer.set(d.transfer_id, arr);
      }

      const transfersByReport = new Map<string, any[]>();
      for (const t of transfers ?? []) {
        const arr = transfersByReport.get(t.income_report_id) ?? [];
        arr.push({ ...t, documents: docsByTransfer.get(t.id) ?? [] });
        transfersByReport.set(t.income_report_id, arr);
      }

      return {
        year: input.reportYear,
        reports: (reports ?? []).map((r: any) => ({
          ...r,
          transfers: transfersByReport.get(r.id) ?? [],
        })),
      };
    }),

  createTransfer: publicProcedure.input(createTransferInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const isNational = user.role === 'national_notary_authority';
    const isRegional = user.role === 'regional_adoul_council';
    if (!isNational && !isRegional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    // Fetch report to enforce ownership
    const { data: report, error: reportError } = await supabase
      .from('regional_income_reports')
      .select('id, council_user_id, report_year')
      .eq('id', input.incomeReportId)
      .single();
    if (reportError || !report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Income report not found' });
    if (!isNational && report.council_user_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    }

    await ensureNotClosed(report.report_year);

    const payload = {
      income_report_id: input.incomeReportId,
      transferred_amount: input.transferredAmount,
      transferred_at: input.transferredAt,
      bank_ref: input.bankRef ?? null,
      approval_status: 'draft',
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('regional_income_transfers').insert(payload).select('*').single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'createTransfer', 'regional_income_transfers', data.id, payload);
    return { success: true, transfer: data };
  }),

  submitTransfer: publicProcedure.input(submitTransferInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const isRegional = user.role === 'regional_adoul_council';
    if (!isRegional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    const { data: transfer, error: transferError } = await supabase
      .from('regional_income_transfers')
      .select('id, income_report_id, approval_status')
      .eq('id', input.transferId)
      .single();
    if (transferError || !transfer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

    const { data: report, error: reportError } = await supabase
      .from('regional_income_reports')
      .select('id, council_user_id, report_year')
      .eq('id', transfer.income_report_id)
      .single();
    if (reportError || !report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Income report not found' });
    if (report.council_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    await ensureNotClosed(report.report_year);

    const { data, error } = await supabase
      .from('regional_income_transfers')
      .update({
        approval_status: 'submitted',
        regional_approved_by: user.id,
        regional_approved_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.transferId)
      .select('*')
      .single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'submitTransfer', 'regional_income_transfers', input.transferId, null);
    return { success: true, transfer: data };
  }),

  nationalApproveTransfer: publicProcedure.input(approveTransferInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const isNational = user.role === 'national_notary_authority';
    if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    const { data: transfer, error: transferError } = await supabase
      .from('regional_income_transfers')
      .select('id, income_report_id')
      .eq('id', input.transferId)
      .single();
    if (transferError || !transfer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

    const { data: report, error: reportError } = await supabase
      .from('regional_income_reports')
      .select('id, report_year')
      .eq('id', transfer.income_report_id)
      .single();
    if (reportError || !report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Income report not found' });
    await ensureNotClosed(report.report_year);

    const { data, error } = await supabase
      .from('regional_income_transfers')
      .update({
        approval_status: 'approved',
        national_approved_by: user.id,
        national_approved_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.transferId)
      .select('*')
      .single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'nationalApproveTransfer', 'regional_income_transfers', input.transferId, null);
    return { success: true, transfer: data };
  }),

  nationalRejectTransfer: publicProcedure.input(approveTransferInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);
    const isNational = user.role === 'national_notary_authority';
    if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
    if (!input.rejectionReason) throw new TRPCError({ code: 'BAD_REQUEST', message: 'rejectionReason required' });

    const { data: transfer, error: transferError } = await supabase
      .from('regional_income_transfers')
      .select('id, income_report_id')
      .eq('id', input.transferId)
      .single();
    if (transferError || !transfer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

    const { data: report, error: reportError } = await supabase
      .from('regional_income_reports')
      .select('id, report_year')
      .eq('id', transfer.income_report_id)
      .single();
    if (reportError || !report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Income report not found' });
    await ensureNotClosed(report.report_year);

    const { data, error } = await supabase
      .from('regional_income_transfers')
      .update({
        approval_status: 'rejected',
        national_approved_by: user.id,
        national_approved_at: new Date().toISOString(),
        rejection_reason: input.rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.transferId)
      .select('*')
      .single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'nationalRejectTransfer', 'regional_income_transfers', input.transferId, { rejectionReason: input.rejectionReason });
    return { success: true, transfer: data };
  }),

  uploadSupportingDocument: publicProcedure.input(uploadDocInput).mutation(async ({ input }) => {
    const user = await requireUser(input.sessionToken);

    const isNational = user.role === 'national_notary_authority';
    const isRegional = user.role === 'regional_adoul_council';
    if (!isNational && !isRegional) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

    // Ownership check: regional can only upload to their council transfer
    if (isRegional) {
      const { data: transfer, error: transferError } = await supabase
        .from('regional_income_transfers')
        .select('id, income_report_id')
        .eq('id', input.transferId)
        .single();
      if (transferError || !transfer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });

      const { data: report, error: reportError } = await supabase
        .from('regional_income_reports')
        .select('id, council_user_id, report_year')
        .eq('id', transfer.income_report_id)
        .single();
      if (reportError || !report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Income report not found' });
      if (report.council_user_id !== user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
      await ensureNotClosed(report.report_year);
    }

    const uploaded = await uploadDocument(input.file);
    const payload = {
      transfer_id: input.transferId,
      kind: input.kind,
      file_name: input.file.name,
      file_url: uploaded.url,
      file_path: uploaded.path,
      mime_type: input.file.type || null,
      size_bytes: input.file.size || null,
      uploaded_by: user.id,
    };

    const { data, error } = await supabase.from('income_supporting_documents').insert(payload).select('*').single();
    if (error || !data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Failed' });

    await audit(user.id, 'uploadSupportingDocument', 'income_supporting_documents', data.id, { transferId: input.transferId, kind: input.kind });
    return { success: true, document: data };
  }),

  getAllRegionalCouncils: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await requireUser(input.sessionToken);
        const isNational = user.role === 'national_notary_authority';
        if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

        // First, try to get from profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('regional_council_profiles')
          .select('user_id, council_name, region_code, notaries_count, created_at')
          .order('council_name', { ascending: true });

        if (profilesError) {
          console.error('[getAllRegionalCouncils] Error fetching profiles:', profilesError.message);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: profilesError.message });
        }

        let councils = (profiles ?? []).map((p: any) => ({
          userId: p.user_id,
          councilName: p.council_name,
          regionCode: p.region_code,
          notariesCount: p.notaries_count,
          createdAt: p.created_at,
        }));

        console.log(`[getAllRegionalCouncils] Found ${councils.length} councils from profiles table`);

        // If no profiles found, try to fetch regional council users and create profiles for them
        if (councils.length === 0) {
          const { data: regionalUsers, error: usersError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('role', 'regional_adoul_council')
            .eq('is_active', true);

          if (usersError) {
            console.error('[getAllRegionalCouncils] Error fetching regional users:', usersError.message);
          } else {
            console.log(`[getAllRegionalCouncils] Found ${(regionalUsers ?? []).length} regional council users in users table`);
            
            // Create profiles for users that don't have them
            if (regionalUsers && regionalUsers.length > 0) {
              for (const ru of regionalUsers) {
                const { error: insertError } = await supabase
                  .from('regional_council_profiles')
                  .upsert({
                    user_id: ru.id,
                    council_name: ru.full_name || ru.email || 'مجلس جهوي',
                    region_code: null,
                    notaries_count: null,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'user_id' });

                if (insertError) {
                  console.error(`[getAllRegionalCouncils] Error creating profile for ${ru.id}:`, insertError.message);
                }
              }

              // Now fetch the profiles again
              const { data: newProfiles, error: refetchError } = await supabase
                .from('regional_council_profiles')
                .select('user_id, council_name, region_code, notaries_count, created_at')
                .order('council_name', { ascending: true });

              if (!refetchError && newProfiles) {
                councils = (newProfiles ?? []).map((p: any) => ({
                  userId: p.user_id,
                  councilName: p.council_name,
                  regionCode: p.region_code,
                  notariesCount: p.notaries_count,
                  createdAt: p.created_at,
                }));
                console.log(`[getAllRegionalCouncils] After creating profiles: ${councils.length} councils`);
              }
            }
          }
        }

        return {
          councils,
        };
      } catch (err: any) {
        console.error('[getAllRegionalCouncils] Error:', err?.message || err);
        throw err;
      }
    }),

  closeYear: publicProcedure
    .input(z.object({ sessionToken: z.string(), reportYear: z.number().int().min(2000).max(2100), note: z.string().max(2000).optional().nullable() }))
    .mutation(async ({ input }) => {
      const user = await requireUser(input.sessionToken);
      const isNational = user.role === 'national_notary_authority';
      if (!isNational) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });

      const { data: existing, error: exErr } = await supabase
        .from('income_year_closings')
        .select('report_year')
        .eq('report_year', input.reportYear)
        .maybeSingle();
      if (exErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: exErr.message });
      if (existing) return { success: true, alreadyClosed: true };

      const payload = {
        report_year: input.reportYear,
        closed_by: user.id,
        note: input.note ?? null,
      };
      const { error } = await supabase.from('income_year_closings').insert(payload);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      await audit(user.id, 'closeYear', 'income_year_closings', String(input.reportYear) as any, payload);
      return { success: true, alreadyClosed: false };
    }),
});
