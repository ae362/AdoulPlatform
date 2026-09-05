import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../trpc';
import { useMessagingNotifications } from '../../contexts/MessagingNotificationsContext';
import PortalNotificationsCenter, { PortalNotificationItem } from '../../components/notifications/PortalNotificationsCenter';

function buildItemAccent(status: string): PortalNotificationItem['accent'] {
  if (status.includes('موافق')) return 'emerald';
  if (status.includes('مرفوض')) return 'rose';
  if (status.includes('مؤجل')) return 'amber';
  return 'cyan';
}

const JudgeNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const {
    judgeRequestsTotal,
    judgePermissionsTotal,
    judgeAdlCopyPermissionsTotal,
    markJudgeRequestSeen,
    isJudgeRequestSeen,
    markJudgePermissionSeen,
    isJudgePermissionSeen,
    markJudgeAdlCopyPermissionSeen,
    isJudgeAdlCopyPermissionSeen,
  } = useMessagingNotifications();

  const generalQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', excludeSpecialized: true, limit: 100, offset: 0 },
    { staleTime: 30_000, refetchInterval: 45_000, retry: false }
  );

  const marriageQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'MARRIAGE_ALL', limit: 100, offset: 0 },
    { staleTime: 30_000, refetchInterval: 45_000, retry: false }
  );

  const adlCopyQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'طلب استخراج نسخ/نظائر الرسوم العدلية', limit: 100, offset: 0 },
    { refetchInterval: 15_000, retry: false }
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
    const generalItems = ((generalQuery.data ?? []) as any[]).map((item) => ({
      id: `general-${item.id}`,
      sourceId: String(item.id),
      title: item?.request_number ? `طلب قضائي: ${item.request_number}` : 'طلب قضائي جديد',
      subtitle: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
      statusLabel: item?.status ?? 'قيد_المعالجة',
      categoryLabel: 'التنقل خارج الاختصاص',
      timestamp: String(item?.created_at ?? ''),
      body: `نوع الطلب: ${item?.certificate_type || 'غير محدد'} • المحكمة: ${item?.jurisdiction || 'غير محدد'}`,
      detailTitle: item?.request_number ? `ملف الطلب ${item.request_number}` : 'ملف الطلب',
      detailBody: String(item?.reason_for_movement || item?.notes || 'لا توجد ملاحظات إضافية.'),
      meta: [
        { label: 'المحكمة', value: String(item?.jurisdiction || 'غير محدد') },
        { label: 'نوع الشهادة', value: String(item?.certificate_type || 'غير محدد') },
      ],
      isSeen: isJudgeRequestSeen(String(item.id)),
      accent: buildItemAccent(String(item?.status ?? '')),
      onOpen: () => {
        markJudgeRequestSeen(String(item.id));
        navigate('/judge/notifications');
      },
      onDelete: () => {
        if (!window.confirm('هل تريد حذف هذا الطلب من مركز الإشعارات؟')) return;
        deleteMutation.mutate({ notificationId: String(item.id) });
      },
    } satisfies PortalNotificationItem));

    const marriageItems = ((marriageQuery.data ?? []) as any[]).map((item) => ({
      id: `marriage-${item.id}`,
      sourceId: String(item.id),
      title: item?.request_number ? `إذن بالزواج: ${item.request_number}` : 'طلب إذن بالزواج',
      subtitle: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
      statusLabel: item?.status ?? 'قيد_المعالجة',
      categoryLabel: 'أذونات الزواج',
      timestamp: String(item?.created_at ?? ''),
      body: `المحكمة: ${item?.jurisdiction || 'غير محدد'} • ${item?.certificate_type || 'طلب زواج'}`,
      detailBody: String(item?.reason_for_movement || item?.notes || 'لا توجد ملاحظات إضافية.'),
      meta: [
        { label: 'المحكمة', value: String(item?.jurisdiction || 'غير محدد') },
        { label: 'النوع', value: String(item?.certificate_type || 'طلب زواج') },
      ],
      isSeen: isJudgePermissionSeen(String(item.id)),
      accent: 'emerald',
      onOpen: () => {
        markJudgePermissionSeen(String(item.id));
        navigate('/judge/marriage-permissions');
      },
      onDelete: () => {
        if (!window.confirm('هل تريد حذف هذا الطلب من مركز الإشعارات؟')) return;
        deleteMutation.mutate({ notificationId: String(item.id) });
      },
    } satisfies PortalNotificationItem));

    const adlCopyItems = ((adlCopyQuery.data ?? []) as any[]).map((item) => ({
      id: `adl-${item.id}`,
      sourceId: String(item.id),
      title: item?.request_number ? `نسخ الرسوم: ${item.request_number}` : 'طلب نسخ الرسوم',
      subtitle: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
      statusLabel: item?.status ?? 'قيد_المعالجة',
      categoryLabel: 'نسخ ونظائر الرسوم',
      timestamp: String(item?.created_at ?? ''),
      body: `المحكمة: ${item?.jurisdiction || 'غير محدد'} • ${item?.certificate_type || 'نسخ الرسوم'}`,
      detailBody: String(item?.reason_for_movement || item?.notes || 'لا توجد ملاحظات إضافية.'),
      meta: [
        { label: 'المحكمة', value: String(item?.jurisdiction || 'غير محدد') },
        { label: 'النوع', value: String(item?.certificate_type || 'نسخ الرسوم') },
      ],
      isSeen: isJudgeAdlCopyPermissionSeen(String(item.id)),
      accent: 'indigo',
      onOpen: () => {
        markJudgeAdlCopyPermissionSeen(String(item.id));
        navigate('/judge/adl-copy-permissions');
      },
      onDelete: () => {
        if (!window.confirm('هل تريد حذف هذا الطلب من مركز الإشعارات؟')) return;
        deleteMutation.mutate({ notificationId: String(item.id) });
      },
    } satisfies PortalNotificationItem));

    return [...generalItems, ...marriageItems, ...adlCopyItems].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  }, [adlCopyQuery.data, deleteMutation, generalQuery.data, isJudgeAdlCopyPermissionSeen, isJudgePermissionSeen, isJudgeRequestSeen, markJudgeAdlCopyPermissionSeen, markJudgePermissionSeen, markJudgeRequestSeen, marriageQuery.data, navigate]);

  const unreadCount = items.filter((item) => !item.isSeen).length;
  const seenCount = items.filter((item) => item.isSeen).length;

  return (
    <PortalNotificationsCenter
      title="مركز الإشعارات القضائية للقاضي"
      description="واجهة موحدة تجمع طلبات التنقل خارج الاختصاص، أذونات الزواج، وطلبات نسخ الرسوم في مكان واحد مع تمييز بصري واضح بين الجديد والمقروء."
      badgeLabel="Judge Notification Center"
      totalCount={items.length}
      unreadCount={unreadCount}
      seenCount={seenCount}
      bellCount={judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal}
      items={items}
      loading={generalQuery.isLoading || marriageQuery.isLoading || adlCopyQuery.isLoading}
      searchPlaceholder="ابحث باسم العدل أو رقم الطلب أو نوع الملف"
      emptyTitle="لا توجد إشعارات قضائية حالياً"
      emptyDescription="ستظهر هنا جميع الطلبات الواردة إلى القاضي فور وصولها من مختلف المسارات القضائية."
      openLabel="فتح مسار المعالجة المناسب"
      deleteLabel="حذف من المركز"
      deleting={deleteMutation.isPending}
    />
  );
};

export default JudgeNotificationsPage;
