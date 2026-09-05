import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import PortalNotificationsCenter, { PortalNotificationItem } from '../../components/notifications/PortalNotificationsCenter';

function accentForStatus(status: string): PortalNotificationItem['accent'] {
  if (status === 'محفوظ_دون_أثر' || status === 'مسجل') return 'slate';
  if (status === 'قيد_الدراسة') return 'indigo';
  if (status === 'مرفوض') return 'rose';
  if (status === 'موافق_عليه') return 'emerald';
  return 'amber';
}

const RegionalNotificationsCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { councilHubTotal } = useMessagingNotifications();
  const [seenIds, setSeenIds] = useState<string[]>([]);

  const seenKey = useMemo(() => (user?.id ? `regional_notifications_seen_ids:${user.id}` : null), [user?.id]);

  useEffect(() => {
    if (!seenKey) return;
    try {
      const raw = localStorage.getItem(seenKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSeenIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
    } catch {
      setSeenIds([]);
    }
  }, [seenKey]);

  useEffect(() => {
    if (!seenKey) return;
    try {
      localStorage.setItem(seenKey, JSON.stringify(seenIds));
    } catch {
      // ignore
    }
  }, [seenIds, seenKey]);

  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);
  const markSeen = (id: string) => setSeenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const query = trpc.notifications.getRequestsList.useQuery(
    { status: 'all', limit: 200, offset: 0, recipientType: 'regional_council' },
    { staleTime: 30_000, refetchInterval: 45_000, retry: false }
  );

  const deleteMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.getRequestsList.invalidate(),
        utils.notifications.getDashboardStats.invalidate(),
      ]);
    },
  });

  const items = useMemo(() => {
    return ((query.data ?? []) as any[])
      .filter((item) => item?.id)
      .slice()
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      .map((item) => ({
        id: String(item.id),
        title: item?.request_number ? `ملف جهوي: ${item.request_number}` : 'ملف جهوي وارد',
        subtitle: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
        statusLabel: String(item?.status || 'قيد_المعالجة'),
        categoryLabel: 'طلبات المجلس الجهوي',
        timestamp: String(item?.created_at ?? ''),
        body: `المحكمة: ${item?.jurisdiction || 'غير محدد'} • النوع: ${item?.certificate_type || 'غير محدد'}`,
        detailBody: String(item?.reason_for_movement || item?.notes || 'لا توجد ملاحظات إضافية محفوظة لهذا الملف.'),
        meta: [
          { label: 'الحالة', value: String(item?.status || 'غير محدد') },
          { label: 'المحكمة', value: String(item?.jurisdiction || 'غير محدد') },
          { label: 'نوع الطلب', value: String(item?.certificate_type || 'غير محدد') },
        ],
        isSeen: seenSet.has(String(item.id)),
        accent: accentForStatus(String(item?.status || '')),
        onOpen: () => {
          markSeen(String(item.id));
          const searchParam = item?.request_number || item?.notary_name || '';
          navigate(`/regional-council/notifications-dashboard?search=${encodeURIComponent(searchParam)}`);
        },
        onDelete: () => {
          if (!window.confirm('هل تريد حذف هذا الإشعار الجهوي من المركز؟')) return;
          deleteMutation.mutate({ notificationId: String(item.id) });
        },
      } satisfies PortalNotificationItem));
  }, [deleteMutation, navigate, query.data, seenSet]);

  const unreadCount = items.filter((item) => !item.isSeen).length;
  const seenCount = items.filter((item) => item.isSeen).length;

  return (
    <PortalNotificationsCenter
      title="مركز الإشعارات الجهوية"
      description="واجهة موحدة للمجلس الجهوي تجمع الملفات الجديدة، الملفات قيد الدراسة، والملفات المحفوظة مع تمييز بصري واضح بين ما تمت مراجعته وما يزال ينتظر المعالجة."
      badgeLabel="Regional Council Notifications"
      totalCount={items.length}
      unreadCount={unreadCount}
      seenCount={seenCount}
      bellCount={councilHubTotal}
      items={items}
      loading={query.isLoading}
      searchPlaceholder="ابحث باسم العدل أو رقم الملف أو المحكمة"
      emptyTitle="لا توجد إشعارات جهوية حالياً"
      emptyDescription="عند ورود طلبات جديدة للمجلس الجهوي ستظهر هنا بشكل مركزي ومنظم."
      openLabel="فتح رواق التدبير الجهوي"
      deleteLabel="حذف من المركز"
      deleting={deleteMutation.isPending}
    />
  );
};

export default RegionalNotificationsCenterPage;
