import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';
import { trpc } from '../trpc';
import { resolvePageTitle, formatDocumentTitle, updateFaviconBadge } from '../utils/pageTitle';

type Toast = {
  id: string;
  title: string;
  message?: string;
  onClick?: () => void;
};

type MessagingNotificationsValue = {
  unreadTotal: number;
  decisionsTotal: number;
  markDecisionSeen: (notificationId: string) => void;
  isDecisionSeen: (notificationId: string) => boolean;
  judgeRequestsTotal: number;
  markJudgeRequestSeen: (notificationId: string) => void;
  isJudgeRequestSeen: (notificationId: string) => boolean;
  judgePermissionsTotal: number;
  markJudgePermissionSeen: (notificationId: string) => void;
  isJudgePermissionSeen: (notificationId: string) => boolean;
  judgeAdlCopyPermissionsTotal: number;
  markJudgeAdlCopyPermissionSeen: (notificationId: string) => void;
  isJudgeAdlCopyPermissionSeen: (notificationId: string) => boolean;
  nationalPendingTransfersTotal: number;
  markNationalTransferSeen: (transferId: string) => void;
  isNationalTransferSeen: (transferId: string) => boolean;
  councilRequestsTotal: number;
  councilUnderReviewTotal: number;
  councilArchivedTotal: number;
  councilHubTotal: number;
  unseenCopyRequestsTotal: number;
  markCopyRequestSeen: (requestId: string) => void;
  isCopyRequestSeen: (requestId: string) => boolean;
  notaryNotificationsTotal: number;
  totalNotifications: number;
  // Sub-category counts for Sidebar
  permissionsCounts: {
    scientific: number;
    marriage: number;
    judicialFees: number;
    individualReception: number;
    officeMovement: number;
  };
  adminCounts: {
    workCertificate: number;
  };
  setCustomPageTitle: (title: string | null) => void;
};

const MessagingNotificationsContext = createContext<MessagingNotificationsValue>({ 
  unreadTotal: 0, 
  decisionsTotal: 0, 
  markDecisionSeen: () => {},
  isDecisionSeen: () => false,
  judgeRequestsTotal: 0,
  markJudgeRequestSeen: () => {},
  isJudgeRequestSeen: () => false,
  judgePermissionsTotal: 0,
  markJudgePermissionSeen: () => {},
  isJudgePermissionSeen: () => false,
  judgeAdlCopyPermissionsTotal: 0,
  markJudgeAdlCopyPermissionSeen: () => {},
  isJudgeAdlCopyPermissionSeen: () => false,
  nationalPendingTransfersTotal: 0,
  markNationalTransferSeen: () => {},
  isNationalTransferSeen: () => false,
  councilRequestsTotal: 0,
  councilUnderReviewTotal: 0,
  councilArchivedTotal: 0,
  councilHubTotal: 0,
  unseenCopyRequestsTotal: 0,
  markCopyRequestSeen: () => {},
  isCopyRequestSeen: () => false,
  notaryNotificationsTotal: 0,
  totalNotifications: 0,
  permissionsCounts: {
    scientific: 0,
    marriage: 0,
    judicialFees: 0,
    individualReception: 0,
    officeMovement: 0,
  },
  adminCounts: {
    workCertificate: 0,
  },
  setCustomPageTitle: () => {},
});

function stripHtml(input?: string | null) {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function shouldSuppressToast(pathname: string, search: string) {
  if (pathname.includes('/messages') || pathname.includes('/judge/messages') || pathname.includes('/regional-council/messaging')) {
    return true;
  }
  return new URLSearchParams(search).get('module') === 'messages';
}

function isJudgeSubmissionDecision(item: any) {
  const status = String(item?.status || '').toLowerCase();
  const decision = String(item?.decision || '').trim();
  const decidedAt = String(item?.decidedAt || item?.decided_at || '').trim();
  return !!decision || !!decidedAt || ['accepted', 'accepted_with_notes', 'substantive_notes', 'rejected', 'declined'].includes(status);
}

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div 
      className="fixed top-4 right-4 z-[1000] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            t.onClick?.();
            dismiss(t.id);
          }}
          className="cursor-pointer pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black/5 flex flex-col"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900">{t.title}</div>
              {t.message ? <div className="mt-1 line-clamp-2 text-xs text-slate-600">{t.message}</div> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagingNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, sessionToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [customPageTitle, setCustomPageTitle] = useState<string | null>(null);

  const isAnyJudge = user?.role === 'authentication_judge' || (user?.role as string) === 'regional_judge' || (user?.role as string) === 'supreme_judge';
  const isMessagingRole = user?.role === 'notary' || isAnyJudge || user?.role === 'regional_adoul_council';
  
  const threadsQuery = trpc.messaging.listThreads.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken && !!user && isMessagingRole,
      staleTime: 20_000,
      refetchInterval: 30000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const threads = threadsQuery.data ?? [];
  const unreadTotal = useMemo(() => threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0), [threads]);

  const isNotary = user?.role === 'notary';
  const isJudge = isAnyJudge;
  const isCouncil = user?.role === 'regional_adoul_council';
  const isNational = user?.role === 'national_notary_authority';

  // Judicial Decisions Tracking (for Notaries)
  const decisionsQuery = trpc.notifications.getRequestsList.useQuery(
    { notaryId: user?.id },
    {
      enabled: !!user && isNotary,
      staleTime: 30_000,
      refetchInterval: 35000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );

  const judgeSubmissionDecisionsQuery = trpc.feesAgent.documents.listMyJudgeSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken && !!user && isNotary,
      staleTime: 30_000,
      refetchInterval: 35000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );

  // Citizen Copy/Extraction Requests Tracking (for Notaries)
  const notaryCopyRequestsQuery = trpc.copyRequests.list.useQuery(undefined, {
    enabled: !!user && isNotary,
    staleTime: 30_000,
    refetchInterval: 35000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // New Requests Tracking (for Judges)
  const judgeRequestsQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', excludeSpecialized: true },
    {
      enabled: !!user && isJudge,
      staleTime: 30_000,
      refetchInterval: 45000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  // Marriage permission requests tracking (for Judges - /judge/permissions)
  const judgePermissionsQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'MARRIAGE_ALL' },
    {
      enabled: !!user && isJudge,
      staleTime: 30_000,
      refetchInterval: 45000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  // New Requests Tracking (for Regional Council)
  const councilAllNotificationsQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'all', limit: 30, offset: 0 },
    {
      enabled: !!user && isCouncil,
      staleTime: 30_000,
      refetchInterval: 45000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const nationalReconciliationQuery = trpc.income.listReconciliation.useQuery(
    { sessionToken: sessionToken || '', reportYear: new Date().getFullYear() },
    {
      enabled: !!sessionToken && !!user && isNational,
      staleTime: 30_000,
      refetchInterval: 60000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const decisions = decisionsQuery.data ?? [];
  const decisionsSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `decisions_seen_ids:${user.id}`;
  }, [user?.id]);
  const legacyDecisionsSeenAtKey = useMemo(() => {
    if (!user?.id) return null;
    return `decisions_seen_at_ms:${user.id}`;
  }, [user?.id]);

  const [decisionsSeenIds, setDecisionsSeenIds] = useState<string[]>([]);
  const [legacyDecisionsSeenAtMs, setLegacyDecisionsSeenAtMs] = useState<number>(0);

  useEffect(() => {
    if (!decisionsSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(decisionsSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setDecisionsSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setDecisionsSeenIds([]);
    }
  }, [decisionsSeenIdsKey]);

  useEffect(() => {
    if (!legacyDecisionsSeenAtKey) return;
    try {
      const raw = localStorage.getItem(legacyDecisionsSeenAtKey);
      const parsed = raw ? Number(raw) : 0;
      setLegacyDecisionsSeenAtMs(Number.isFinite(parsed) ? parsed : 0);
    } catch {
      setLegacyDecisionsSeenAtMs(0);
    }
  }, [legacyDecisionsSeenAtKey]);

  const decisionsSeenSet = useMemo(() => new Set(decisionsSeenIds), [decisionsSeenIds]);

  const copyRequestsSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `copy_requests_seen_ids:${user.id}`;
  }, [user?.id]);

  const [copyRequestsSeenIds, setCopyRequestsSeenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!copyRequestsSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(copyRequestsSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setCopyRequestsSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setCopyRequestsSeenIds([]);
    }
  }, [copyRequestsSeenIdsKey]);

  const copyRequestsSeenSet = useMemo(() => new Set(copyRequestsSeenIds), [copyRequestsSeenIds]);

  const markCopyRequestSeen = React.useCallback(
    (requestId: string) => {
      if (!requestId || !user?.id) return;
      setCopyRequestsSeenIds((prev) => {
        if (prev.includes(requestId)) return prev;
        const updated = [...prev, requestId];
        try {
          localStorage.setItem(`copy_requests_seen_ids:${user.id}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [user?.id]
  );

  const isCopyRequestSeen = React.useCallback(
    (requestId: string) => {
      return copyRequestsSeenSet.has(requestId);
    },
    [copyRequestsSeenSet]
  );

  const copyRequestsQuery = trpc.copyRequests.list.useQuery(undefined, {
    enabled: !!user?.id && isNotary,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const copyRequestsItems = useMemo(() => {
    if (!isNotary) return [];
    return (copyRequestsQuery.data ?? []) as any[];
  }, [copyRequestsQuery.data, isNotary]);

  const decisionItems = useMemo(() => {
    if (!isNotary) return [];
    return (decisions as any[]).filter((d) => d?.id && (d?.decision_type ?? d?.decisionType));
  }, [decisions, isNotary]);

  const judgeSubmissionDecisionItems = useMemo(() => {
    if (!isNotary) return [];
    return ((judgeSubmissionDecisionsQuery.data ?? []) as any[])
      .filter((item) => item?.id && isJudgeSubmissionDecision(item))
      .map((item: any) => ({
        ...item,
        syntheticId: `judge_submission:${String(item.id)}`,
      }));
  }, [isNotary, judgeSubmissionDecisionsQuery.data]);

  useEffect(() => {
    if (!isNotary) return;
    if (!decisionsSeenIdsKey) return;
    if (!legacyDecisionsSeenAtMs) return;
    if (decisionsSeenIds.length > 0) return;
    if (!decisionsQuery.isSuccess) return;

    const legacySeenIds = decisionItems
      .filter((d: any) => {
        const decidedAt = d?.decided_at ?? d?.decidedAt;
        const ms = decidedAt ? new Date(decidedAt).getTime() : 0;
        return Number.isFinite(ms) && ms > 0 && ms <= legacyDecisionsSeenAtMs;
      })
      .map((d: any) => String(d.id));

    if (legacySeenIds.length > 0) {
      setDecisionsSeenIds(legacySeenIds);
    }
  }, [decisionItems, decisionsQuery.isSuccess, decisionsSeenIds.length, decisionsSeenIdsKey, isNotary, legacyDecisionsSeenAtMs]);

  useEffect(() => {
    if (!decisionsSeenIdsKey) return;
    try {
      localStorage.setItem(decisionsSeenIdsKey, JSON.stringify(decisionsSeenIds));
    } catch {
      // ignore
    }
  }, [decisionsSeenIds, decisionsSeenIdsKey]);

  const isDecisionSeen = React.useCallback(
    (notificationId: string) => {
      return decisionsSeenSet.has(notificationId) || copyRequestsSeenSet.has(notificationId);
    },
    [decisionsSeenSet, copyRequestsSeenSet]
  );

  const permissionsCounts = useMemo(() => {
    const counts = { scientific: 0, marriage: 0, judicialFees: 0, individualReception: 0, officeMovement: 0 };
    if (!isNotary || !decisionItems.length) return counts;
    
    decisionItems.forEach((d: any) => {
      if (decisionsSeenSet.has(String(d.id))) return;
      const type = (d.certificate_type || d.certificateType || '').toLowerCase();
      const notes = (d.notes || '').toLowerCase();
      
      if (type.includes('علمية') || type.includes('scientific')) counts.scientific++;
      else if (type.includes('بوابة') || type.includes('زواج') || type.includes('marriage')) counts.marriage++;
      else if (type.includes('نسخ') || type.includes('نظائر') || type.includes('judicial_fees')) counts.judicialFees++;
      else if (type.includes('تلقي فردي') || type.includes('individual_reception') || notes.includes('ind-')) counts.individualReception++;
      else if (type.includes('توجه') || type.includes('office_movement')) counts.officeMovement++;
    });
    return counts;
  }, [decisionItems, decisionsSeenSet, isNotary]);

  const adminCounts = useMemo(() => {
    const counts = { workCertificate: 0 };
    if (!isNotary || !decisionItems.length) return counts;
    
    decisionItems.forEach((d: any) => {
      if (decisionsSeenSet.has(String(d.id))) return;
      const type = (d.certificate_type || d.certificateType || '').toLowerCase();
      if (type.includes('عمل') || type.includes('work_certificate')) counts.workCertificate++;
    });
    return counts;
  }, [decisionItems, decisionsSeenSet, isNotary]);

  const markDecisionSeen = React.useCallback(
    (notificationId: string) => {
      if (!notificationId) return;
      setDecisionsSeenIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
      setCopyRequestsSeenIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
    },
    []
  );

  const decisionsTotal = useMemo(() => {
    if (!isNotary) return 0;
    const requestDecisions = decisionItems.filter((d: any) => !decisionsSeenSet.has(String(d.id))).length;
    const judgeSubmissionDecisions = judgeSubmissionDecisionItems.filter((d: any) => !decisionsSeenSet.has(String(d.syntheticId))).length;
    const unseenCopyRequests = copyRequestsItems.filter((r: any) => !copyRequestsSeenSet.has(String(r.id)) && !decisionsSeenSet.has(String(r.id))).length;
    return requestDecisions + judgeSubmissionDecisions + unseenCopyRequests;
  }, [decisionItems, decisionsSeenSet, isNotary, judgeSubmissionDecisionItems, copyRequestsItems, copyRequestsSeenSet]);

  const judgeRequestsSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `judge_requests_seen_ids:${user.id}`;
  }, [user?.id]);

  // Adl Copy permission requests tracking (for Judges - /judge/adl-copy-permissions)
  const judgeAdlCopyPermissionsQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'طلب استخراج نسخ/نظائر الرسوم العدلية' },
    {
      enabled: !!user && isJudge,
      refetchInterval: 15000,
      retry: false,
    }
  );

  const [judgeRequestsSeenIds, setJudgeRequestsSeenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!judgeRequestsSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(judgeRequestsSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setJudgeRequestsSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setJudgeRequestsSeenIds([]);
    }
  }, [judgeRequestsSeenIdsKey]);

  useEffect(() => {
    if (!judgeRequestsSeenIdsKey) return;
    try {
      localStorage.setItem(judgeRequestsSeenIdsKey, JSON.stringify(judgeRequestsSeenIds));
    } catch {
      // ignore
    }
  }, [judgeRequestsSeenIds, judgeRequestsSeenIdsKey]);

  const judgeRequestsSeenSet = useMemo(() => new Set(judgeRequestsSeenIds), [judgeRequestsSeenIds]);

  const judgeRequestsTotal = useMemo(() => {
    if (!isJudge) return 0;
    const items = (judgeRequestsQuery.data ?? []) as any[];
    return items.filter((n) => n?.id && !judgeRequestsSeenSet.has(String(n.id))).length;
  }, [isJudge, judgeRequestsQuery.data, judgeRequestsSeenSet]);

  const isJudgeRequestSeen = React.useCallback(
    (notificationId: string) => {
      return judgeRequestsSeenSet.has(notificationId);
    },
    [judgeRequestsSeenSet]
  );

  const markJudgeRequestSeen = React.useCallback((notificationId: string) => {
    if (!notificationId) return;
    setJudgeRequestsSeenIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
  }, []);

  const judgePermissionsSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `judge_permissions_seen_ids:${user.id}`;
  }, [user?.id]);

  const [judgePermissionsSeenIds, setJudgePermissionsSeenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!judgePermissionsSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(judgePermissionsSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setJudgePermissionsSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setJudgePermissionsSeenIds([]);
    }
  }, [judgePermissionsSeenIdsKey]);

  useEffect(() => {
    if (!judgePermissionsSeenIdsKey) return;
    try {
      localStorage.setItem(judgePermissionsSeenIdsKey, JSON.stringify(judgePermissionsSeenIds));
    } catch {
      // ignore
    }
  }, [judgePermissionsSeenIds, judgePermissionsSeenIdsKey]);

  const judgePermissionsSeenSet = useMemo(() => new Set(judgePermissionsSeenIds), [judgePermissionsSeenIds]);

  const judgePermissionsTotal = useMemo(() => {
    if (!isJudge) return 0;
    const items = (judgePermissionsQuery.data ?? []) as any[];
    return items.filter((n) => n?.id && !judgePermissionsSeenSet.has(String(n.id))).length;
  }, [isJudge, judgePermissionsQuery.data, judgePermissionsSeenSet]);

  const isJudgePermissionSeen = React.useCallback(
    (notificationId: string) => {
      return judgePermissionsSeenSet.has(notificationId);
    },
    [judgePermissionsSeenSet]
  );

  const markJudgePermissionSeen = React.useCallback((notificationId: string) => {
    if (!notificationId) return;
    setJudgePermissionsSeenIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
  }, []);

  const judgeAdlCopyPermissionsSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `judge_adl_copy_permissions_seen_ids:${user.id}`;
  }, [user?.id]);

  const [judgeAdlCopyPermissionsSeenIds, setJudgeAdlCopyPermissionsSeenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!judgeAdlCopyPermissionsSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(judgeAdlCopyPermissionsSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setJudgeAdlCopyPermissionsSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setJudgeAdlCopyPermissionsSeenIds([]);
    }
  }, [judgeAdlCopyPermissionsSeenIdsKey]);

  useEffect(() => {
    if (!judgeAdlCopyPermissionsSeenIdsKey) return;
    try {
      localStorage.setItem(judgeAdlCopyPermissionsSeenIdsKey, JSON.stringify(judgeAdlCopyPermissionsSeenIds));
    } catch {
      // ignore
    }
  }, [judgeAdlCopyPermissionsSeenIds, judgeAdlCopyPermissionsSeenIdsKey]);

  const judgeAdlCopyPermissionsSeenSet = useMemo(() => new Set(judgeAdlCopyPermissionsSeenIds), [judgeAdlCopyPermissionsSeenIds]);

  const judgeAdlCopyPermissionsTotal = useMemo(() => {
    if (!isJudge) return 0;
    const items = (judgeAdlCopyPermissionsQuery.data ?? []) as any[];
    return items.filter((n) => n?.id && !judgeAdlCopyPermissionsSeenSet.has(String(n.id))).length;
  }, [isJudge, judgeAdlCopyPermissionsQuery.data, judgeAdlCopyPermissionsSeenSet]);

  const isJudgeAdlCopyPermissionSeen = React.useCallback(
    (notificationId: string) => {
      return judgeAdlCopyPermissionsSeenSet.has(notificationId);
    },
    [judgeAdlCopyPermissionsSeenSet]
  );

  const markJudgeAdlCopyPermissionSeen = React.useCallback((notificationId: string) => {
    if (!notificationId) return;
    setJudgeAdlCopyPermissionsSeenIds((prev) => (prev.includes(notificationId) ? prev : [...prev, notificationId]));
  }, []);

  const nationalTransfersSeenIdsKey = useMemo(() => {
    if (!user?.id) return null;
    return `national_transfers_seen_ids:${user.id}`;
  }, [user?.id]);

  const [nationalTransfersSeenIds, setNationalTransfersSeenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!nationalTransfersSeenIdsKey) return;
    try {
      const raw = localStorage.getItem(nationalTransfersSeenIdsKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setNationalTransfersSeenIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      setNationalTransfersSeenIds([]);
    }
  }, [nationalTransfersSeenIdsKey]);

  useEffect(() => {
    if (!nationalTransfersSeenIdsKey) return;
    try {
      localStorage.setItem(nationalTransfersSeenIdsKey, JSON.stringify(nationalTransfersSeenIds));
    } catch {
      // ignore
    }
  }, [nationalTransfersSeenIds, nationalTransfersSeenIdsKey]);

  const nationalTransfersSeenSet = useMemo(() => new Set(nationalTransfersSeenIds), [nationalTransfersSeenIds]);

  const nationalPendingTransfers = useMemo(() => {
    if (!isNational) return [] as any[];
    const reports = (nationalReconciliationQuery.data?.reports ?? []) as any[];
    const transfers = reports.flatMap((r: any) => (r?.transfers ?? []) as any[]);
    return transfers.filter((t: any) => t?.approval_status === 'submitted' && t?.id);
  }, [isNational, nationalReconciliationQuery.data?.reports]);

  const nationalPendingTransfersTotal = useMemo(() => {
    if (!isNational) return 0;
    return nationalPendingTransfers.filter((t: any) => !nationalTransfersSeenSet.has(String(t.id))).length;
  }, [isNational, nationalPendingTransfers, nationalTransfersSeenSet]);

  const isNationalTransferSeen = React.useCallback(
    (transferId: string) => {
      return nationalTransfersSeenSet.has(transferId);
    },
    [nationalTransfersSeenSet]
  );

  const markNationalTransferSeen = React.useCallback((transferId: string) => {
    if (!transferId) return;
    setNationalTransfersSeenIds((prev) => (prev.includes(transferId) ? prev : [...prev, transferId]));
  }, []);

  const unseenCopyRequestsTotal = useMemo(() => {
    if (!isNotary) return 0;
    const items = (notaryCopyRequestsQuery.data ?? []) as any[];
    return items.filter((r) => r?.id && !copyRequestsSeenSet.has(String(r.id))).length;
  }, [isNotary, notaryCopyRequestsQuery.data, copyRequestsSeenSet]);

  const notaryNotificationsTotal = useMemo(() => {
    if (!isNotary) return 0;
    return decisionsTotal + unseenCopyRequestsTotal;
  }, [isNotary, decisionsTotal, unseenCopyRequestsTotal]);

  const councilRequestsTotal = useMemo(() => {
    if (!isCouncil) return 0;
    const items = (councilAllNotificationsQuery.data ?? []) as any[];
    return items.filter((n) => n?.status === 'قيد_المعالجة').length;
  }, [councilAllNotificationsQuery.data, isCouncil]);

  const councilUnderReviewTotal = useMemo(() => {
    if (!isCouncil) return 0;
    const items = (councilAllNotificationsQuery.data ?? []) as any[];
    return items.filter((n) => n?.status === 'قيد_الدراسة').length;
  }, [councilAllNotificationsQuery.data, isCouncil]);

  const councilArchivedTotal = useMemo(() => {
    if (!isCouncil) return 0;
    const items = (councilAllNotificationsQuery.data ?? []) as any[];
    return items.filter((n) => n?.status === 'مسجل' || n?.status === 'محفوظ_دون_أثر').length;
  }, [councilAllNotificationsQuery.data, isCouncil]);

  const councilHubTotal = useMemo(() => {
    if (!isCouncil) return 0;
    return Number(councilRequestsTotal || 0) + Number(councilUnderReviewTotal || 0);
  }, [councilRequestsTotal, councilUnderReviewTotal, isCouncil]);

  const totalNotifications =
    Number(unreadTotal || 0) +
    Number(notaryNotificationsTotal || 0) +
    Number(judgeRequestsTotal || 0) +
    Number(judgePermissionsTotal || 0) +
    Number(judgeAdlCopyPermissionsTotal || 0) +
    Number(nationalPendingTransfersTotal || 0) +
    Number(councilHubTotal || 0);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevByThread = useRef(new Map<string, { unreadCount: number; lastAt: string | null }>());
  const prevByDecisionId = useRef(new Set<string>());
  const prevByJudgeRequestId = useRef(new Set<string>());
  const prevByJudgePermissionId = useRef(new Set<string>());
  const prevByJudgeAdlCopyPermissionId = useRef(new Set<string>());
  const prevByJudgeSubmissionDecisionId = useRef(new Set<string>());
  const initialized = useRef(false);
  const initializedDecisions = useRef(false);
  const initializedJudgeRequests = useRef(false);
  const initializedJudgePermissions = useRef(false);
  const initializedJudgeAdlCopyPermissions = useRef(false);
  const initializedJudgeSubmissionDecisions = useRef(false);
  const pushToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prevToasts) => [{ id, ...toast }, ...prevToasts].slice(0, 3));
  }, []);
  const showDesktopNotification = React.useCallback((title: string, message: string) => {
    if (!(document.hidden && 'Notification' in window && Notification.permission === 'granted')) return;
    try {
      new Notification(title, { body: message.slice(0, 140) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const { pageTitle, portalBrand } = resolvePageTitle(
      location.pathname,
      location.search,
      user?.role,
      customPageTitle
    );
    document.title = formatDocumentTitle(pageTitle, portalBrand, totalNotifications);
    updateFaviconBadge(totalNotifications);
  }, [totalNotifications, user, location.pathname, location.search, customPageTitle]);

  useEffect(() => {
    if (!user || !isNotary) return;
    if (!decisionsQuery.isSuccess) return;

    // Avoid toasts on messaging screens (already handled separately).
    if (shouldSuppressToast(location.pathname, location.search)) return;

    const items = (decisionItems as any[])
      .filter((d) => d?.id)
      .slice()
      .sort((a, b) => String(b.decided_at ?? b.decidedAt ?? '').localeCompare(String(a.decided_at ?? a.decidedAt ?? '')));

    const currentIds = new Set(items.map((d) => String(d.id)));
    const buildDecisionToast = (item: any) => {
      const decisionType = item?.decision_type ?? item?.decisionType ?? '';
      const requestNumber = item?.request_number ?? item?.requestNumber ?? '';
      const targetCourt = item?.target_court ?? item?.targetCourt ?? '';
      const certificateType = item?.certificate_type ?? item?.certificateType ?? '';
      const reasonForMovement = item?.reason_for_movement ?? item?.reasonForMovement ?? '';
      const notes = item?.notes ?? '';
      const isPermissionDecision =
        String(certificateType || '').includes('بوابة') ||
        String(certificateType || '').includes('زواج') ||
        String(reasonForMovement || '').includes('زواج') ||
        String(notes || '').includes('--- DATA JSON START ---');

      return {
        title: `قرار قضائي جديد${requestNumber ? `: ${requestNumber}` : ''}`,
        message: `${decisionType || 'تم تحديث الطلب'}${targetCourt ? ` • ${targetCourt}` : ''}`,
        onClick: () => navigate(`/notary-portal?tab=${isPermissionDecision ? 'permissions_responses' : 'notifications_responses'}`),
      };
    };

    if (!initializedDecisions.current) {
      initializedDecisions.current = true;
      prevByDecisionId.current = currentIds;
      const newestUnseenInitial = items.find((d) => d?.id && !decisionsSeenSet.has(String(d.id)));
      if (newestUnseenInitial) {
        const toast = buildDecisionToast(newestUnseenInitial);
        pushToast(toast);
        showDesktopNotification(toast.title, toast.message || '');
      }
      return;
    }

    const newDecisions = items.filter((d) => !prevByDecisionId.current.has(String(d.id)));
    prevByDecisionId.current = currentIds;

    const newestUnseen = newDecisions.find((d) => d?.id && !decisionsSeenSet.has(String(d.id)));
    if (!newestUnseen) return;

    const toast = buildDecisionToast(newestUnseen);
    pushToast(toast);
    showDesktopNotification(toast.title, toast.message || '');
  }, [decisionItems, decisionsQuery.isSuccess, decisionsSeenSet, isNotary, location.pathname, location.search, navigate, pushToast, showDesktopNotification, user]);

  useEffect(() => {
    if (!user || !isNotary) return;
    if (!judgeSubmissionDecisionsQuery.isSuccess) return;

    if (shouldSuppressToast(location.pathname, location.search)) return;

    const items = (judgeSubmissionDecisionItems as any[])
      .filter((d) => d?.syntheticId)
      .slice()
      .sort((a, b) => String(b.decidedAt ?? b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.decidedAt ?? a.updatedAt ?? a.createdAt ?? '')));

    const currentIds = new Set(items.map((d) => String(d.syntheticId)));
    const buildJudgeSubmissionToast = (item: any) => {
      const fileNumber = item?.fileNumber ?? '';
      const decision = item?.decision ?? item?.status ?? 'تم تحديث الرسم';
      const documentType = item?.documentType ?? 'رسم عدلي';
      return {
        title: `قرار جديد على الرسم${fileNumber ? `: ${fileNumber}` : ''}`,
        message: `${decision}${documentType ? ` • ${documentType}` : ''}`,
        onClick: () => navigate('/notary-notifications'),
      };
    };

    if (!initializedJudgeSubmissionDecisions.current) {
      initializedJudgeSubmissionDecisions.current = true;
      prevByJudgeSubmissionDecisionId.current = currentIds;
      const newestUnseenInitial = items.find((d) => d?.syntheticId && !decisionsSeenSet.has(String(d.syntheticId)));
      if (newestUnseenInitial) {
        const toast = buildJudgeSubmissionToast(newestUnseenInitial);
        pushToast(toast);
        showDesktopNotification(toast.title, toast.message || '');
      }
      return;
    }

    const newItems = items.filter((d) => !prevByJudgeSubmissionDecisionId.current.has(String(d.syntheticId)));
    prevByJudgeSubmissionDecisionId.current = currentIds;

    const newestUnseen = newItems.find((d) => d?.syntheticId && !decisionsSeenSet.has(String(d.syntheticId)));
    if (!newestUnseen) return;

    const toast = buildJudgeSubmissionToast(newestUnseen);
    pushToast(toast);
    showDesktopNotification(toast.title, toast.message || '');
  }, [decisionsSeenSet, isNotary, judgeSubmissionDecisionItems, judgeSubmissionDecisionsQuery.isSuccess, location.pathname, location.search, navigate, pushToast, showDesktopNotification, user]);

  useEffect(() => {
    if (!user || !isJudge) return;
    if (!judgeRequestsQuery.isSuccess) return;

    if (location.pathname.startsWith('/judge')) return;
    if (shouldSuppressToast(location.pathname, location.search)) return;

    const items = ((judgeRequestsQuery.data ?? []) as any[])
      .filter((n) => n?.id)
      .slice()
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

    const currentIds = new Set(items.map((n) => String(n.id)));
    const buildJudgeRequestToast = (item: any) => {
      const requestNumber = item?.request_number ?? '';
      const notaryName = item?.notary_name ?? '';
      const involvedNames = item?.involved_names ?? '';
      return {
        title: `طلب قضائي جديد${requestNumber ? `: ${requestNumber}` : ''}`,
        message: `${notaryName || 'عدل'}${involvedNames ? ` • ${involvedNames}` : ''}`,
        onClick: () => navigate('/judge'),
      };
    };

    if (!initializedJudgeRequests.current) {
      initializedJudgeRequests.current = true;
      prevByJudgeRequestId.current = currentIds;
      const newestUnseenInitial = items.find((n) => n?.id && !judgeRequestsSeenSet.has(String(n.id)));
      if (newestUnseenInitial) {
        const toast = buildJudgeRequestToast(newestUnseenInitial);
        pushToast(toast);
        showDesktopNotification(toast.title, toast.message || '');
      }
      return;
    }

    const newItems = items.filter((n) => !prevByJudgeRequestId.current.has(String(n.id)));
    prevByJudgeRequestId.current = currentIds;

    const newestUnseen = newItems.find((n) => n?.id && !judgeRequestsSeenSet.has(String(n.id)));
    if (!newestUnseen) return;

    const toast = buildJudgeRequestToast(newestUnseen);
    pushToast(toast);
    showDesktopNotification(toast.title, toast.message || '');
  }, [isJudge, judgeRequestsQuery.data, judgeRequestsQuery.isSuccess, judgeRequestsSeenSet, location.pathname, location.search, navigate, pushToast, showDesktopNotification, user]);

  useEffect(() => {
    if (!user || !isJudge) return;
    if (!judgePermissionsQuery.isSuccess) return;

    if (location.pathname.startsWith('/judge/permissions')) return;
    if (shouldSuppressToast(location.pathname, location.search)) return;

    const items = ((judgePermissionsQuery.data ?? []) as any[])
      .filter((n) => n?.id)
      .slice()
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

    const currentIds = new Set(items.map((n) => String(n.id)));
    const buildJudgePermissionToast = (item: any) => {
      const requestNumber = item?.request_number ?? '';
      const notaryName = item?.notary_name ?? '';
      const involvedNames = item?.involved_names ?? '';
      return {
        title: `طلب إذن بالزواج جديد${requestNumber ? `: ${requestNumber}` : ''}`,
        message: `${notaryName || 'عدل'}${involvedNames ? ` • ${involvedNames}` : ''}`,
        onClick: () => navigate('/judge/permissions'),
      };
    };

    if (!initializedJudgePermissions.current) {
      initializedJudgePermissions.current = true;
      prevByJudgePermissionId.current = currentIds;
      const newestUnseenInitial = items.find((n) => n?.id && !judgePermissionsSeenSet.has(String(n.id)));
      if (newestUnseenInitial) {
        const toast = buildJudgePermissionToast(newestUnseenInitial);
        pushToast(toast);
        showDesktopNotification(toast.title, toast.message || '');
      }
      return;
    }

    const newItems = items.filter((n) => !prevByJudgePermissionId.current.has(String(n.id)));
    prevByJudgePermissionId.current = currentIds;

    const newestUnseen = newItems.find((n) => n?.id && !judgePermissionsSeenSet.has(String(n.id)));
    if (!newestUnseen) return;

    const toast = buildJudgePermissionToast(newestUnseen);
    pushToast(toast);
    showDesktopNotification(toast.title, toast.message || '');
  }, [isJudge, judgePermissionsQuery.data, judgePermissionsQuery.isSuccess, judgePermissionsSeenSet, location.pathname, location.search, navigate, pushToast, showDesktopNotification, user]);

  useEffect(() => {
    if (!user || !isJudge) return;
    if (!judgeAdlCopyPermissionsQuery.isSuccess) return;

    if (location.pathname.startsWith('/judge/adl-copy-permissions')) return;
    if (shouldSuppressToast(location.pathname, location.search)) return;

    const items = ((judgeAdlCopyPermissionsQuery.data ?? []) as any[])
      .filter((n) => n?.id)
      .slice()
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

    const currentIds = new Set(items.map((n) => String(n.id)));
    const buildJudgeAdlCopyToast = (item: any) => {
      const requestNumber = item?.request_number ?? '';
      const involvedNames = item?.involved_names ?? '';
      return {
        title: `طلب استخراج رسوم جديد${requestNumber ? `: ${requestNumber}` : ''}`,
        message: `طلب جديد لاستخراج نسخ/نظائر عدلية • ${involvedNames || 'المعني بالأمر'}`,
        onClick: () => navigate('/judge/adl-copy-permissions'),
      };
    };

    if (!initializedJudgeAdlCopyPermissions.current) {
      initializedJudgeAdlCopyPermissions.current = true;
      prevByJudgeAdlCopyPermissionId.current = currentIds;
      const newestUnseenInitial = items.find((n) => n?.id && !judgeAdlCopyPermissionsSeenSet.has(String(n.id)));
      if (newestUnseenInitial) {
        const toast = buildJudgeAdlCopyToast(newestUnseenInitial);
        pushToast(toast);
        showDesktopNotification(toast.title, toast.message || '');
      }
      return;
    }

    const newItems = items.filter((n) => !prevByJudgeAdlCopyPermissionId.current.has(String(n.id)));
    prevByJudgeAdlCopyPermissionId.current = currentIds;

    const newestUnseen = newItems.find((n) => n?.id && !judgeAdlCopyPermissionsSeenSet.has(String(n.id)));
    if (!newestUnseen) return;

    const toast = buildJudgeAdlCopyToast(newestUnseen);
    pushToast(toast);
    showDesktopNotification(toast.title, toast.message || '');
  }, [isJudge, judgeAdlCopyPermissionsQuery.data, judgeAdlCopyPermissionsQuery.isSuccess, judgeAdlCopyPermissionsSeenSet, location.pathname, location.search, navigate, pushToast, showDesktopNotification, user]);

  useEffect(() => {
    if (!user || !isMessagingRole) return;
    if (!threadsQuery.isSuccess) return;

    const suppress = shouldSuppressToast(location.pathname, location.search);

    if (!initialized.current) {
      initialized.current = true;
      const next = new Map<string, { unreadCount: number; lastAt: string | null }>();
      for (const t of threads) {
        next.set(t.id, { unreadCount: t.unreadCount ?? 0, lastAt: t.lastMessage?.at ?? null });
      }
      prevByThread.current = next;
      return;
    }

    const next = new Map<string, { unreadCount: number; lastAt: string | null }>();
    for (const t of threads) {
      const prev = prevByThread.current.get(t.id);
      const prevUnread = prev?.unreadCount ?? 0;
      const currentUnread = t.unreadCount ?? 0;
      const isIncoming = t.lastMessage?.senderUserId && t.lastMessage.senderUserId !== user.id;

      if (!suppress && currentUnread > prevUnread && isIncoming) {
        const title = `رسالة جديدة من ${t.otherUser?.fullName || t.otherUser?.email || 'مستخدم'}`;
        const message = stripHtml(t.lastMessage?.body ?? '');

        pushToast({ title, message, onClick: () => navigate(user.role === 'authentication_judge' ? '/judge/messages' : '/messages') });
        showDesktopNotification(title, message);
      }

      next.set(t.id, { unreadCount: currentUnread, lastAt: t.lastMessage?.at ?? null });
    }

    prevByThread.current = next;
  }, [threads, threadsQuery.isSuccess, user, isMessagingRole, location.pathname, location.search, navigate, pushToast, showDesktopNotification]);

  useEffect(() => {
    if (toasts.length === 0) return;
    
    // Auto-dismiss the oldest toast after 8 seconds
    const oldestId = toasts[toasts.length - 1].id;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== oldestId));
    }, 8000);

    return () => clearTimeout(timer);
  }, [toasts]);

  const value = useMemo(() => ({ 
    unreadTotal, 
    decisionsTotal, 
    markDecisionSeen,
    isDecisionSeen,
    judgeRequestsTotal,
    markJudgeRequestSeen,
    isJudgeRequestSeen,
    judgePermissionsTotal,
    markJudgePermissionSeen,
    isJudgePermissionSeen,
    judgeAdlCopyPermissionsTotal,
    markJudgeAdlCopyPermissionSeen,
    isJudgeAdlCopyPermissionSeen,
    nationalPendingTransfersTotal,
    markNationalTransferSeen,
    isNationalTransferSeen,
    councilRequestsTotal,
    councilUnderReviewTotal,
    councilArchivedTotal,
    councilHubTotal,
    unseenCopyRequestsTotal,
    markCopyRequestSeen,
    isCopyRequestSeen,
    notaryNotificationsTotal,
    totalNotifications,
    permissionsCounts,
    adminCounts,
    setCustomPageTitle,
  }), [
    unreadTotal,
    decisionsTotal,
    markDecisionSeen,
    isDecisionSeen,
    judgeRequestsTotal,
    markJudgeRequestSeen,
    isJudgeRequestSeen,
    judgePermissionsTotal,
    markJudgePermissionSeen,
    isJudgePermissionSeen,
    judgeAdlCopyPermissionsTotal,
    markJudgeAdlCopyPermissionSeen,
    isJudgeAdlCopyPermissionSeen,
    nationalPendingTransfersTotal,
    markNationalTransferSeen,
    isNationalTransferSeen,
    councilRequestsTotal,
    councilUnderReviewTotal,
    councilArchivedTotal,
    councilHubTotal,
    unseenCopyRequestsTotal,
    markCopyRequestSeen,
    isCopyRequestSeen,
    notaryNotificationsTotal,
    totalNotifications,
    permissionsCounts,
    adminCounts,
    setCustomPageTitle,
  ]);

  return (
    <MessagingNotificationsContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} dismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </MessagingNotificationsContext.Provider>
  );
}

export function useMessagingNotifications() {
  return useContext(MessagingNotificationsContext);
}
