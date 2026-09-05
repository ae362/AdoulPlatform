import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import PortalNotificationsCenter, { PortalNotificationItem } from '../../components/notifications/PortalNotificationsCenter';

function formatMad(amount: number) {
  if (!Number.isFinite(amount)) return '-';
  return `${Math.round(amount).toLocaleString('fr-MA')} د.م`;
}

function accentForTransfer(status: string): PortalNotificationItem['accent'] {
  if (status === 'approved') return 'emerald';
  if (status === 'rejected') return 'rose';
  if (status === 'submitted') return 'amber';
  return 'slate';
}

const NationalNotificationsCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuth();
  const { nationalPendingTransfersTotal, isNationalTransferSeen, markNationalTransferSeen } = useMessagingNotifications();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const hiddenKey = useMemo(() => (user?.id ? `national_notifications_hidden_ids:${user.id}` : null), [user?.id]);

  useEffect(() => {
    if (!hiddenKey) return;
    try {
      const raw = localStorage.getItem(hiddenKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setHiddenIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
    } catch {
      setHiddenIds([]);
    }
  }, [hiddenKey]);

  useEffect(() => {
    if (!hiddenKey) return;
    try {
      localStorage.setItem(hiddenKey, JSON.stringify(hiddenIds));
    } catch {
      // ignore
    }
  }, [hiddenIds, hiddenKey]);

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const year = new Date().getFullYear();
  const query = trpc.income.listReconciliation.useQuery(
    { sessionToken: sessionToken || '', reportYear: year },
    { enabled: !!sessionToken && user?.role === 'national_notary_authority', staleTime: 10_000 }
  );

  const items = useMemo(() => {
    const reports = (query.data?.reports ?? []) as any[];
    return reports
      .flatMap((report) =>
        ((report?.transfers ?? []) as any[]).map((transfer) => ({ report, transfer }))
      )
      .filter(({ transfer }) => transfer?.id && !hiddenSet.has(String(transfer.id)))
      .sort((a, b) => String(b.transfer?.transferred_at ?? b.transfer?.created_at ?? '').localeCompare(String(a.transfer?.transferred_at ?? a.transfer?.created_at ?? '')))
      .map(({ report, transfer }) => ({
        id: String(transfer.id),
        title: `تحويل مالي: ${formatMad(Number(transfer?.transferred_amount ?? 0))}`,
        subtitle: `${report?.region_name || report?.regionName || 'جهة غير محددة'}${transfer?.bank_ref ? ` • مرجع ${transfer.bank_ref}` : ''}`,
        statusLabel: String(transfer?.approval_status || 'submitted'),
        categoryLabel: 'تحويلات الهيئة الوطنية',
        timestamp: String(transfer?.transferred_at ?? transfer?.created_at ?? ''),
        body: `المبلغ المستحق للجهة: ${formatMad(Number(report?.due_amount ?? 0))} • الحالة الحالية: ${transfer?.approval_status || 'submitted'}`,
        detailBody: transfer?.rejection_reason
          ? `سبب الرفض: ${transfer.rejection_reason}`
          : 'تحويل معروض على القيادة الوطنية للاعتماد أو المتابعة ضمن مسار التسوية المالية.',
        meta: [
          { label: 'الجهة', value: String(report?.region_name || report?.regionName || 'غير محدد') },
          { label: 'المبلغ المحول', value: formatMad(Number(transfer?.transferred_amount ?? 0)) },
          { label: 'مرجع البنك', value: String(transfer?.bank_ref || 'بدون مرجع') },
        ],
        isSeen: isNationalTransferSeen(String(transfer.id)),
        accent: accentForTransfer(String(transfer?.approval_status || 'submitted')),
        onOpen: () => {
          markNationalTransferSeen(String(transfer.id));
          navigate('/national-council/authority-finances?tab=reconciliation');
        },
        onDelete: () => {
          if (!window.confirm('سيتم إخفاء هذا التنبيه من المركز الحالي. هل تريد المتابعة؟')) return;
          setHiddenIds((prev) => (prev.includes(String(transfer.id)) ? prev : [...prev, String(transfer.id)]));
        },
      } satisfies PortalNotificationItem));
  }, [hiddenSet, isNationalTransferSeen, markNationalTransferSeen, navigate, query.data]);

  const unreadCount = items.filter((item) => !item.isSeen).length;
  const seenCount = items.filter((item) => item.isSeen).length;

  return (
    <PortalNotificationsCenter
      title="مركز تنبيهات الهيئة الوطنية"
      description="مركز متخصص لمتابعة التحويلات المالية المرسلة من الجهات، مع إبراز العناصر الجديدة غير المقروءة وإتاحة إخفاء التنبيهات التي لم تعد تحتاج الظهور في هذه اللوحة."
      badgeLabel="National Authority Notifications"
      totalCount={items.length}
      unreadCount={unreadCount}
      seenCount={seenCount}
      bellCount={nationalPendingTransfersTotal}
      items={items}
      loading={query.isLoading}
      searchPlaceholder="ابحث باسم الجهة أو مرجع البنك أو حالة التحويل"
      emptyTitle="لا توجد تنبيهات مالية حالياً"
      emptyDescription="ستظهر هنا التحويلات والتسويات الجهوية التي تحتاج متابعة أو اعتماد من الهيئة الوطنية."
      openLabel="فتح ملف التسوية المالية"
      deleteLabel="إخفاء من المركز"
    />
  );
};

export default NationalNotificationsCenterPage;
