import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';

type FilterMode = 'all' | 'unseen' | 'seen';

type NotificationRow = {
  id: string;
  source: 'request' | 'judge_submission' | 'citizen_request' | 'message';
  requestNumber: string;
  decisionType: string;
  certificateType: string;
  targetCourt: string;
  reasonForMovement: string;
  notes: string;
  decisionReasoning: string;
  decidedAt: string;
  createdAt: string;
  isSeen: boolean;
  isPermission: boolean;
  savedRasmId?: string;
  citizenName?: string;
  citizenCin?: string;
  isSearch?: boolean;
  rawId?: string;
};

function formatArabicDateTime(value?: string) {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return `${date.toLocaleDateString('ar-MA')} • ${date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`;
}

function stripDecisionNotes(value?: string) {
  const text = String(value || '')
    .replace(/--- DATA JSON START ---[\s\S]*?--- DATA JSON END ---/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return 'لا توجد تفاصيل إضافية مرفقة مع هذا الإشعار.';
  return text;
}

function getDecisionTheme(decisionType: string, source?: string) {
  if (source === 'citizen_request') {
    if (decisionType.includes('بحث')) {
      return {
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        ribbon: 'from-blue-500 to-indigo-500',
        panel: 'from-blue-50 via-white to-indigo-50',
      };
    }
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      ribbon: 'from-emerald-500 to-teal-500',
      panel: 'from-emerald-50 via-white to-teal-50',
    };
  }

  if (source === 'message') {
    return {
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      ribbon: 'from-purple-500 to-pink-500',
      panel: 'from-purple-50 via-white to-pink-50',
    };
  }

  if (decisionType.includes('موافقة')) {
    return {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      ribbon: 'from-emerald-500 to-teal-500',
      panel: 'from-emerald-50 via-white to-teal-50',
    };
  }

  if (decisionType.includes('رفض')) {
    return {
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      ribbon: 'from-rose-500 to-red-500',
      panel: 'from-rose-50 via-white to-red-50',
    };
  }

  if (decisionType.includes('تأجيل') || decisionType.includes('مرسل') || decisionType.includes('قيد')) {
    return {
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      ribbon: 'from-amber-500 to-orange-500',
      panel: 'from-amber-50 via-white to-orange-50',
    };
  }

  return {
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    ribbon: 'from-sky-500 to-cyan-500',
    panel: 'from-sky-50 via-white to-cyan-50',
  };
}

function isPermissionDecision(item: any) {
  const certificateType = String(item?.certificate_type ?? '').trim();
  const reasonForMovement = String(item?.reason_for_movement ?? '').trim();
  const notes = String(item?.notes ?? '');

  return (
    certificateType.includes('بوابة') ||
    certificateType.includes('زواج') ||
    reasonForMovement.includes('زواج') ||
    notes.includes('--- DATA JSON START ---')
  );
}

const NotaryNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, sessionToken } = useAuth();
  const utils = trpc.useUtils();
  const { markDecisionSeen, isDecisionSeen } = useMessagingNotifications();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Judicial Requests Notifications
  const notificationsQuery = trpc.notifications.getRequestsList.useQuery(
    { notaryId: user?.id, limit: 200, offset: 0 },
    {
      enabled: !!user?.id,
      staleTime: 15_000,
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: 3,
    }
  );

  // 2. Judge Submissions Decisions
  const judgeSubmissionsQuery = trpc.feesAgent.listMyJudgeSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken && !!user?.id,
      staleTime: 15_000,
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: 2,
    }
  );

  // 3. Citizen Copy Extraction & Deed Search Requests
  const copyRequestsQuery = trpc.copyRequests.list.useQuery(undefined, {
    enabled: !!user?.id,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // 4. Messaging Threads
  const threadsQuery = trpc.messaging.listThreads.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!sessionToken,
      staleTime: 15_000,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const dismissedStorageKey = useMemo(() => {
    return user?.id ? `notary_dismissed_notification_ids:${user.id}` : 'notary_dismissed_notification_ids';
  }, [user?.id]);

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const key = user?.id ? `notary_dismissed_notification_ids:${user.id}` : 'notary_dismissed_notification_ids';
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);

  const saveDismissed = (newIds: string[]) => {
    setDismissedIds(newIds);
    try {
      localStorage.setItem(dismissedStorageKey, JSON.stringify(newIds));
    } catch {}
  };

  const notifications: NotificationRow[] = useMemo(() => {
    // 1. Citizen Requests
    const citizenRequests = ((copyRequestsQuery.data ?? []) as any[]).map((row) => {
      const details = (row.record_details as any) || {};
      const isSearch = details.source === 'search_deeds' || String(row.record_type || '').includes('بحث');
      const citizenName = String(row.requester_name || `${details.firstName || ''} ${details.lastName || ''}`.trim() || 'مواطن');
      const requestNumber = String(details.requestNumber || (isSearch ? `RECH-2026-${row.id}` : `REQ-2026-${row.id}`));

      return {
        id: String(row.id),
        source: 'citizen_request' as const,
        requestNumber,
        citizenName,
        citizenCin: String(row.requester_cin || details.identityNumber || details.cin || '—'),
        decisionType: isSearch ? 'طلب بحث وتحديد رسم' : 'طلب استخراج نسخة رسمية',
        certificateType: isSearch ? 'البحث في الرسوم والشهادات' : 'استخراج النسخ العدلية',
        targetCourt: String(row.primary_court || details.court || 'المحكمة الابتدائية'),
        reasonForMovement: isSearch
          ? `طلب بحث عن رسم (${details.deedType || row.record_type || 'رسم عدلي'})`
          : `طلب استخراج نسخة - الصفة: ${details.capacity || 'أحد أطراف الرسم'}`,
        notes: String(details.additionalNotes || details.purposeDescription || details.purpose || (isSearch ? 'إيداع طلب بحث جديد في سجلات الرسوم' : 'طلب استخراج نسخة رسمية من طرف المواطن')),
        decisionReasoning: String(details.additionalNotes || details.purposeDescription || details.purpose || 'طلب وارد عبر المنصة الإلكترونية'),
        decidedAt: String(row.request_date || row.created_at || new Date().toISOString()),
        createdAt: String(row.created_at || row.request_date || new Date().toISOString()),
        isSeen: isDecisionSeen(String(row.id)),
        isPermission: false,
        isSearch,
        rawId: String(row.id),
      } satisfies NotificationRow;
    });

    // 2. Messaging Threads with incoming unread
    const rawThreads = Array.isArray(threadsQuery.data) ? threadsQuery.data : (threadsQuery.data as any)?.threads ?? [];
    const messageNotifications = (rawThreads as any[])
      .filter((t) => (t?.unreadCount ?? 0) > 0 || t?.lastMessage?.body)
      .map((t) => {
        const syntheticId = `thread:${String(t.id)}`;
        const otherName = String(t.otherUser?.fullName || t.otherUser?.email || 'مستخدم');
        return {
          id: syntheticId,
          source: 'message' as const,
          requestNumber: `MSG-${String(t.id).slice(-6)}`,
          citizenName: otherName,
          decisionType: 'رسالة جديدة',
          certificateType: 'صندوق المحادثات المهنية',
          targetCourt: 'المراسلات',
          reasonForMovement: String(t.lastMessage?.body || 'رسالة جديدة واردة'),
          notes: String(t.lastMessage?.body || 'رسالة جديدة'),
          decisionReasoning: String(t.lastMessage?.body || ''),
          decidedAt: String(t.lastMessage?.at || t.updatedAt || new Date().toISOString()),
          createdAt: String(t.createdAt || new Date().toISOString()),
          isSeen: Boolean((t.unreadCount ?? 0) === 0 || isDecisionSeen(syntheticId)),
          isPermission: false,
          rawId: String(t.id),
        } satisfies NotificationRow;
      });

    // 3. Judicial Requests & Office Movements
    const requestNotifications = ((notificationsQuery.data ?? []) as any[])
      .filter((item) => item?.id)
      .map((item) => {
        const isDecision = Boolean(item?.decision_type ?? item?.decisionType);
        const authorityName = item.recipient_type === 'regional_council'
          ? 'المجلس الجهوي للعدول'
          : item.recipient_type === 'both'
            ? 'قاضي التوثيق والمجلس الجهوي'
            : 'قاضي التوثيق';

        const decisionType = isDecision
          ? String(item?.decision_type ?? item?.decisionType)
          : (item.status === 'قيد_المعالجة' ? 'إشعار مرسل (قيد المعالجة)' : String(item.status || 'إشعار قيد المعالجة'));

        return {
          id: String(item.id),
          source: 'request' as const,
          requestNumber: String(item?.request_number ?? ''),
          citizenName: authorityName,
          decisionType: decisionType,
          certificateType: String(item?.certificate_type ?? item?.certificateType ?? 'غير محدد'),
          targetCourt: String(item?.target_court ?? item?.targetCourt ?? item?.jurisdiction ?? 'غير محدد'),
          reasonForMovement: String(item?.reason_for_movement ?? item?.reasonForMovement ?? 'بدون تعليل إضافي'),
          notes: String(item?.notes ?? ''),
          decisionReasoning: String(item?.decision_reasoning ?? item?.decisionReasoning ?? ''),
          decidedAt: String(item?.decided_at ?? item?.decidedAt ?? item?.created_at ?? ''),
          createdAt: String(item?.created_at ?? ''),
          isSeen: isDecisionSeen(String(item.id)),
          isPermission: isPermissionDecision(item),
        };
      }) as NotificationRow[];

    // 4. Judge Submissions
    const judgeSubmissionNotifications = ((judgeSubmissionsQuery.data ?? []) as any[])
      .filter((item) => item?.id && (item?.decision || item?.decidedAt || ['accepted', 'accepted_with_notes', 'substantive_notes', 'rejected', 'declined'].includes(String(item?.status || '').toLowerCase())))
      .map((item) => {
        const syntheticId = `judge_submission:${String(item.id)}`;
        const payload = item?.payload && typeof item.payload === 'object' ? item.payload : {};
        return {
          id: syntheticId,
          source: 'judge_submission' as const,
          requestNumber: String(item?.fileNumber ?? ''),
          citizenName: 'قاضي التوثيق',
          decisionType: String(item?.decision ?? item?.status ?? 'قرار جديد على الرسم'),
          certificateType: String(item?.documentType ?? 'رسم عدلي'),
          targetCourt: 'الرسوم العدلية',
          reasonForMovement: String(item?.summary ?? 'تم اتخاذ قرار قضائي بخصوص الرسم المحال على القاضي.'),
          notes: String(item?.judgeNotes ?? ''),
          decisionReasoning: String(item?.judgeNotes ?? ''),
          decidedAt: String(item?.decidedAt ?? item?.updatedAt ?? item?.createdAt ?? ''),
          createdAt: String(item?.createdAt ?? ''),
          isSeen: isDecisionSeen(syntheticId),
          isPermission: false,
          savedRasmId: String((payload as any)?.savedRasmId ?? (payload as any)?.saved_rasm_id ?? ''),
          rawId: String(item.id),
        } satisfies NotificationRow;
      });

    return ([...citizenRequests, ...messageNotifications, ...requestNotifications, ...judgeSubmissionNotifications] as NotificationRow[])
      .filter((item) => !dismissedSet.has(item.id) && !dismissedSet.has(item.rawId || ''))
      .sort((a, b) => String(b.decidedAt ?? b.createdAt ?? '').localeCompare(String(a.decidedAt ?? a.createdAt ?? '')));
  }, [copyRequestsQuery.data, isDecisionSeen, judgeSubmissionsQuery.data, notificationsQuery.data, threadsQuery.data, dismissedSet]);

  const unseenCount = useMemo(() => notifications.filter((item) => !item.isSeen).length, [notifications]);
  const seenCount = useMemo(() => notifications.filter((item) => item.isSeen).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    const loweredSearch = searchTerm.trim().toLowerCase();

    return notifications.filter((item) => {
      if (filterMode === 'seen' && !item.isSeen) return false;
      if (filterMode === 'unseen' && item.isSeen) return false;
      if (!loweredSearch) return true;

      return [
        item.requestNumber,
        item.citizenName,
        item.citizenCin,
        item.decisionType,
        item.certificateType,
        item.targetCourt,
        item.reasonForMovement,
        stripDecisionNotes(item.notes),
      ]
        .join(' ')
        .toLowerCase()
        .includes(loweredSearch);
    });
  }, [filterMode, notifications, searchTerm]);

  useEffect(() => {
    if (!filteredNotifications.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredNotifications.some((item) => item.id === selectedId)) {
      setSelectedId(filteredNotifications[0].id);
    }
  }, [filteredNotifications, selectedId]);

  const selectedNotification = useMemo(
    () => filteredNotifications.find((item) => item.id === selectedId) ?? notifications.find((item) => item.id === selectedId) ?? null,
    [filteredNotifications, notifications, selectedId]
  );

  const handleSelect = (item: NotificationRow) => {
    setSelectedId(item.id);
  };

  const handleToggleSeen = (e: React.MouseEvent, item: NotificationRow) => {
    e.stopPropagation();
    markDecisionSeen(item.id);
  };

  const handleClearAll = () => {
    notifications.forEach((item) => {
      if (!item.isSeen) {
        markDecisionSeen(item.id);
        if (item.rawId) {
          markDecisionSeen(item.rawId);
        }
      }
    });
  };

  const handleDelete = (item: NotificationRow) => {
    // Dismiss purely from notifications view without deleting database requests and without warning popups
    const toDismiss = [item.id, item.rawId].filter(Boolean) as string[];
    const next = Array.from(new Set([...dismissedIds, ...toDismiss]));
    saveDismissed(next);
    markDecisionSeen(item.id);
    if (item.rawId) markDecisionSeen(item.rawId);
    if (selectedId === item.id) {
      setSelectedId(null);
    }
  };

  const handleDeleteAll = () => {
    // Clear all from notifications view immediately without deleting database requests and without warning popups
    const allIds = notifications.flatMap((item) => [item.id, item.rawId]).filter(Boolean) as string[];
    const next = Array.from(new Set([...dismissedIds, ...allIds]));
    saveDismissed(next);
    notifications.forEach((item) => {
      markDecisionSeen(item.id);
      if (item.rawId) markDecisionSeen(item.rawId);
    });
    setSelectedId(null);
  };

  const handleOpenInPortal = (item: NotificationRow) => {
    markDecisionSeen(item.id);

    if (item.source === 'citizen_request') {
      navigate('/messages');
      return;
    }

    if (item.source === 'message') {
      navigate('/messages');
      return;
    }

    if (item.source === 'judge_submission') {
      if (item.savedRasmId) {
        const fileNo = encodeURIComponent(item.requestNumber || '');
        const judgeSubParam = item.rawId ? `&judgeSubmissionId=${encodeURIComponent(item.rawId)}` : '';
        navigate(`/dashboard?module=auditHub&id=${item.savedRasmId}&fileNumber=${fileNo}${judgeSubParam}&refetch=true&cb=${Date.now()}`);
        return;
      }
      navigate('/dashboard?module=fees');
      return;
    }

    if (item.certificateType.includes('توجه') || item.reasonForMovement.includes('توجه')) {
      navigate('/notary-notifications?module=officeMovementPortal');
      return;
    }

    navigate(`/notary-portal?tab=${item.isPermission ? 'permissions_responses' : 'notifications_responses'}`);
  };

  const selectedTheme = getDecisionTheme(selectedNotification?.decisionType ?? '', selectedNotification?.source);

  return (
    <div className="min-h-full space-y-8 bg-[radial-gradient(circle_at_top_left,_rgba(127,29,29,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(8,145,178,0.10),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_45%,_#eef2ff_100%)] p-1 notranslate" dir="rtl" translate="no">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 px-8 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-sm">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(127,29,29,0.06),transparent_35%,rgba(8,145,178,0.06))]" />
        <div className="absolute -top-20 left-0 h-56 w-56 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-4 py-1.5 text-xs font-black tracking-[0.18em] text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>مركز الإشعارات والطلبات الواردة</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-5xl font-maghribi">
                إدارة جميع الإشعارات والطلبات الواردة
              </h1>
              <p className="max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
                واجهة مركزة لمتابعة طلبات المواطنين (البحث واستخراج النسخ)، رسائل المراسلات، وقرارات القضاء، مع إمكانية التعليم كمقروء والانتقال المباشر للمعالجة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:min-w-[560px]">
            <div className="rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">الإجمالي</div>
              <div className="mt-3 text-4xl font-black text-slate-900">{notifications.length}</div>
              <div className="mt-2 text-xs font-bold text-slate-500">كل الإشعارات والطلبات</div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">غير المقروء</div>
                {unseenCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] font-black text-amber-800 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded-full transition"
                    title="تحديد الكل كمقروء"
                  >
                    تفريغ الكل
                  </button>
                )}
              </div>
              <div className="mt-3 text-4xl font-black text-amber-900">{unseenCount}</div>
              <div className="mt-2 text-xs font-bold text-amber-700">جاهزة للمراجعة الآن</div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">المقروءة</div>
              <div className="mt-3 text-4xl font-black text-emerald-900">{seenCount}</div>
              <div className="mt-2 text-xs font-bold text-emerald-700">تمت مراجعتها</div>
            </div>
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">عداد الجرس</div>
              <div className="mt-3 text-4xl font-black text-cyan-900">{unseenCount}</div>
              <div className="mt-2 text-xs font-bold text-cyan-700">تحديث فوري</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content List & Detail Aside */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_440px]">
        <div className="space-y-5 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {([
                ['all', 'كل الإشعارات'],
                ['unseen', 'غير المقروءة'],
                ['seen', 'المقروءة'],
              ] as [FilterMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`rounded-full px-5 py-2.5 text-sm font-black transition ${filterMode === mode ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}

              {unseenCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-2 text-xs font-black text-amber-900 transition shadow-sm"
                  title="تحديد كافة الإشعارات كمقروءة"
                >
                  <span>👁️</span>
                  <span>تحديد كمقروء ({unseenCount})</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 px-4 py-2 text-xs font-black text-rose-800 transition shadow-sm"
                  title="مسح كافة الإشعارات من السجل"
                >
                </button>
              )}
            </div>
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث باسم المواطن، رقم الطلب، المحكمة أو النوع..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-3 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
            </div>
          </div>

          {/* Notifications List */}
          <div className="grid gap-4">
            {copyRequestsQuery.isLoading || notificationsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[26px] border border-slate-200 bg-slate-50" />
              ))
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((item) => {
                const theme = getDecisionTheme(item.decisionType, item.source);
                const summary = stripDecisionNotes(item.decisionReasoning || item.notes);
                const isCitizen = item.source === 'citizen_request';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`group relative cursor-pointer overflow-hidden rounded-[26px] border p-6 transition-all duration-300 ${selectedId === item.id ? 'border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-200' : item.isSeen ? 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md' : 'border-amber-200/90 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-md'}`}
                  >
                    <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-black shadow-xs ${theme.badge}`}>
                            {item.decisionType}
                          </span>
                          {!item.isSeen ? (
                            <span className="rounded-xl border border-amber-200 bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
                              جديد وغير مقروء
                            </span>
                          ) : (
                            <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                              تمت القراءة
                            </span>
                          )}
                          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600">
                            {item.source === 'citizen_request' ? 'طلب وارد من المواطن' : item.source === 'judge_submission' ? 'قرار قضائي' : item.source === 'message' ? 'مراسلة مهنية' : 'إشعار نظام'}
                          </span>
                        </div>

                        <div>
                          <div className="text-base font-black text-slate-900 leading-snug">
                            {isCitizen ? (
                              <span>
                                <span>👤</span>{' '}
                                <span>المواطن <strong className="text-[#7A0D1A] font-extrabold">{item.citizenName}</strong> أرسل {item.isSearch ? 'طلب بحث وتحديد رسم' : 'طلب استخراج نسخة'}</span>
                              </span>
                            ) : item.source === 'message' ? (
                              <span>
                                <span>📬</span>{' '}
                                <span>رسالة جديدة من <strong className="text-purple-900">{item.citizenName}</strong></span>
                              </span>
                            ) : (
                              <span>الطلب {item.requestNumber || 'إشعار قضائي'}</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 mt-2">
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">رقم الطلب: {item.requestNumber}</span>
                            {item.citizenCin && item.citizenCin !== '—' && (
                              <span className="font-mono">بطاقة التعريف: {item.citizenCin}</span>
                            )}
                            <span>المحكمة: {item.targetCourt}</span>
                            <span>التاريخ: {formatArabicDateTime(item.decidedAt)}</span>
                          </div>
                        </div>

                        <p className={`line-clamp-2 text-xs leading-6 ${item.isSeen ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                          {summary}
                        </p>
                      </div>

                      {/* Action buttons on card */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 pt-2 md:pt-0">
                        {/* Seen / Unseen Button */}
                        {!item.isSeen ? (
                          <button
                            key="btn-unseen"
                            type="button"
                            onClick={(e) => handleToggleSeen(e, item)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-100/80 hover:bg-amber-200 px-3 py-2 text-xs font-black text-amber-900 transition shadow-sm"
                            title="تعليم كمقروء وتحديث العداد"
                          >
                            <span>👁️</span>
                            <span>تحديد كمقروء</span>
                          </button>
                        ) : null}

                        {/* Open Direct in Portal Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInPortal(item);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-black text-white transition shadow-sm"
                        >
                          <span>🚀</span>
                          <span>الانتقال للمعالجة</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-black text-rose-700 transition shadow-sm"
                          title="حذف هذا الإشعار نهائياً من السجل"
                        >
                          <span>🗑️</span>
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-8 py-16 text-center">
                <div className="text-6xl">🔔</div>
                <div className="mt-5 text-2xl font-black text-slate-800">لا توجد إشعارات مطابقة</div>
                <div className="mt-3 text-sm font-bold leading-7 text-slate-500">
                  جرّب تغيير الفلتر أو عبارة البحث، أو انتظر حتى ترد طلبات جديدة من المواطنين أو القضاء.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel Aside */}
        <aside className={`overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-b ${selectedTheme.panel} shadow-[0_24px_70px_rgba(15,23,42,0.10)]`}>
          {selectedNotification ? (
            <div key={selectedNotification.id} className="flex h-full flex-col">
              <div className="border-b border-white/80 p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${selectedTheme.badge}`}>
                    {selectedNotification.decisionType}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${selectedNotification.isSeen ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
                    {selectedNotification.isSeen ? 'إشعار مقروء' : 'إشعار غير مقروء'}
                  </span>
                </div>
                
                <h2 className="mt-4 text-2xl font-black leading-tight text-slate-900">
                  {selectedNotification.source === 'citizen_request'
                    ? `طلب المواطن: ${selectedNotification.citizenName}`
                    : selectedNotification.source === 'message'
                    ? `محادثة مع ${selectedNotification.citizenName}`
                    : `ملف ${selectedNotification.requestNumber || 'الإشعار القضائي'}`}
                </h2>
                
                <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
                  {selectedNotification.source === 'citizen_request'
                    ? 'هذا الطلب وارد من المواطن عبر البوابة العامة، وموجه لمكتبكم لدراسته والبت فيه.'
                    : selectedNotification.source === 'message'
                    ? 'رسالة واردة عبر صندوق المراسلات والتواصل الإلكتروني.'
                    : selectedNotification.source === 'judge_submission'
                    ? 'قرار مرتبط برسم عدلي تمت مراجعته من طرف قاضي التوثيق.'
                    : 'قرار وإشعار مهني وارد من المحكمة.'}
                </p>
              </div>

              <div className="flex-1 space-y-5 p-7">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">رقم الطلب / المرجع</div>
                    <div className="mt-1 text-base font-black text-slate-900 font-mono">{selectedNotification.requestNumber}</div>
                  </div>

                  {selectedNotification.citizenCin && selectedNotification.citizenCin !== '—' && (
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">رقم بطاقة التعريف</div>
                      <div className="mt-1 text-base font-black text-slate-900 font-mono">{selectedNotification.citizenCin}</div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">المحكمة المعنية</div>
                    <div className="mt-1 text-base font-black text-slate-900">{selectedNotification.targetCourt}</div>
                  </div>

                  <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">تاريخ الإيداع / القرار</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatArabicDateTime(selectedNotification.decidedAt)}</div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {selectedNotification.source === 'citizen_request' ? 'بيان موضوع الطلب' : 'التفاصيل والتعليل'}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-7 text-slate-700">
                    {stripDecisionNotes(selectedNotification.decisionReasoning || selectedNotification.notes)}
                  </p>
                </div>

                {selectedNotification.reasonForMovement && (
                  <div className="rounded-[24px] border border-white/90 bg-white/85 p-5 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">الصفة أو السبب الأصلي</div>
                    <p className="mt-2 text-xs font-medium leading-7 text-slate-700">{selectedNotification.reasonForMovement}</p>
                  </div>
                )}
              </div>

              {/* Detail Action Buttons */}
              <div className="border-t border-white/80 p-6">
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenInPortal(selectedNotification)}
                    className="rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>
                      {selectedNotification.source === 'citizen_request'
                        ? 'الانتقال إلى معالجة الطلب في صندوق الرسائل'
                        : selectedNotification.source === 'message'
                        ? 'الانتقال إلى صندوق المحادثة'
                        : 'فتح الإشعار داخل البوابة الأصلية'}
                    </span>
                  </button>

                  {!selectedNotification.isSeen ? (
                    <button
                      key="aside-seen-btn"
                      type="button"
                      onClick={(e) => handleToggleSeen(e, selectedNotification)}
                      className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-xs font-black text-amber-900 transition hover:bg-amber-100 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>👁️</span>
                      <span>تحديد كمقروء وتحديث العداد</span>
                    </button>
                  ) : null}

                  {selectedNotification ? (
                    <button
                      key="aside-delete-btn"
                      type="button"
                      onClick={() => handleDelete(selectedNotification)}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>🗑️</span>
                      <span>حذف هذا الإشعار</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div key="empty-aside" className="flex h-full min-h-[420px] flex-col items-center justify-center p-10 text-center">
              <div className="rounded-full bg-white/90 p-6 text-6xl shadow-lg">📨</div>
              <div className="mt-6 text-2xl font-black text-slate-900">اختر إشعاراً من القائمة</div>
              <p className="mt-3 max-w-sm text-xs font-bold leading-7 text-slate-500">
                سيظهر هنا تفاصيل الطلب، هوية المواطن، رقم المرجع، وأزرار الانتقال المباشر للمعالجة أو التعليم كمقروء.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default NotaryNotificationsPage;

