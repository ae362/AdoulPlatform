import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMessagingNotifications } from '../contexts/MessagingNotificationsContext';
import { trpc } from '../trpc';

type BellItem = {
  id: string;
  kind: 'notary-decision' | 'notary-rasm-decision' | 'judge-request' | 'judge-permission' | 'judge-adl-copy';
  title: string;
  message: string;
  timestamp: string;
  isUnread: boolean;
  onClick: () => void;
};

function formatBellTimestamp(timestamp?: string) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('ar-MA')} ${date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`;
}

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, sessionToken } = useAuth();
  const {
    unreadTotal,
    decisionsTotal,
    notaryNotificationsTotal,
    judgeRequestsTotal,
    judgePermissionsTotal,
    judgeAdlCopyPermissionsTotal,
    markDecisionSeen,
    isDecisionSeen,
    markJudgeRequestSeen,
    isJudgeRequestSeen,
    markJudgePermissionSeen,
    isJudgePermissionSeen,
    markJudgeAdlCopyPermissionSeen,
    isJudgeAdlCopyPermissionSeen,
    totalNotifications,
  } = useMessagingNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellMenuRef = useRef<HTMLDivElement | null>(null);
  const isJudge = user?.role === 'authentication_judge';
  const isNotary = user?.role === 'notary';

  const notaryBellQuery = trpc.notifications.getRequestsList.useQuery(
    { notaryId: user?.id, limit: 50, offset: 0 },
    {
      enabled: !!user?.id && isNotary,
      staleTime: 30_000,
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: 3,
    }
  );

  const notaryJudgeSubmissionsBellQuery = trpc.feesAgent.listMyJudgeSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    {
      enabled: !!user && isNotary && !!sessionToken,
      staleTime: 30_000,
      refetchInterval: 10_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      retry: 2,
    }
  );

  const judgeRequestsBellQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', excludeSpecialized: true, limit: 50, offset: 0 },
    {
      enabled: !!user && isJudge,
      staleTime: 30_000,
      refetchInterval: 45_000,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const judgePermissionsBellQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'MARRIAGE_ALL', limit: 50, offset: 0 },
    {
      enabled: !!user && isJudge,
      staleTime: 30_000,
      refetchInterval: 45_000,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const judgeAdlCopyBellQuery = trpc.notifications.getRequestsList.useQuery(
    { status: 'قيد_المعالجة', recipientType: 'judge', certificateType: 'طلب استخراج نسخ/نظائر الرسوم العدلية', limit: 50, offset: 0 },
    {
      enabled: !!user && isJudge,
      refetchInterval: 15_000,
      retry: false,
    }
  );

  useEffect(() => {
    if (!isBellOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!bellMenuRef.current?.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isBellOpen]);

  const bellItems = useMemo(() => {
    if (isNotary) {
      const requestRows = ((notaryBellQuery.data ?? []) as any[])
        .filter((item) => item?.id && (item?.decision_type ?? item?.decisionType))
        .slice()
        .sort((a, b) => String(b.decided_at ?? b.decidedAt ?? b.created_at ?? '').localeCompare(String(a.decided_at ?? a.decidedAt ?? a.created_at ?? '')));

      const requestItems = requestRows.map((item) => {
        const requestNumber = item?.request_number ?? '';
        const decisionType = item?.decision_type ?? item?.decisionType ?? 'تم تحديث الطلب';
        const targetCourt = item?.target_court ?? item?.targetCourt ?? item?.jurisdiction ?? '';
        const certificateType = item?.certificate_type ?? item?.certificateType ?? '';
        const reasonForMovement = item?.reason_for_movement ?? item?.reasonForMovement ?? '';
        const notes = item?.notes ?? '';
        const isPermissionDecision =
          String(certificateType).includes('بوابة') ||
          String(certificateType).includes('زواج') ||
          String(reasonForMovement).includes('زواج') ||
          String(notes).includes('--- DATA JSON START ---');

        return {
          id: String(item.id),
          kind: 'notary-decision' as const,
          title: `قرار قضائي${requestNumber ? `: ${requestNumber}` : ''}`,
          message: `${decisionType}${targetCourt ? ` • ${targetCourt}` : ''}`,
          timestamp: String(item?.decided_at ?? item?.decidedAt ?? item?.created_at ?? ''),
          isUnread: !isDecisionSeen(String(item.id)),
          onClick: () => {
            markDecisionSeen(String(item.id));
            navigate(`/notary-portal?tab=${isPermissionDecision ? 'permissions_responses' : 'notifications_responses'}`);
          },
        } satisfies BellItem;
      });

      const judgeSubmissionItems = ((notaryJudgeSubmissionsBellQuery.data ?? []) as any[])
        .filter((item) => item?.id && (item?.decision || item?.decidedAt || ['accepted', 'accepted_with_notes', 'substantive_notes', 'rejected', 'declined'].includes(String(item?.status || '').toLowerCase())))
        .map((item) => {
          const syntheticId = `judge_submission:${String(item.id)}`;
          const fileNumber = item?.fileNumber ?? '';
          const documentType = item?.documentType ?? 'رسم عدلي';
          const decision = item?.decision ?? item?.status ?? 'تم تحديث الرسم';

          return {
            id: syntheticId,
            kind: 'notary-rasm-decision' as const,
            title: `قرار على الرسم${fileNumber ? `: ${fileNumber}` : ''}`,
            message: `${decision}${documentType ? ` • ${documentType}` : ''}`,
            timestamp: String(item?.decidedAt ?? item?.updatedAt ?? item?.createdAt ?? ''),
            isUnread: !isDecisionSeen(syntheticId),
            onClick: () => {
              markDecisionSeen(syntheticId);
              navigate('/notary-notifications');
            },
          } satisfies BellItem;
        });

      return [...requestItems, ...judgeSubmissionItems].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    if (isJudge) {
      const judgeRequestItems = ((judgeRequestsBellQuery.data ?? []) as any[])
        .filter((item) => item?.id)
        .map((item) => ({
          id: String(item.id),
          kind: 'judge-request' as const,
          title: `طلب قضائي${item?.request_number ? `: ${item.request_number}` : ''}`,
          message: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
          timestamp: String(item?.created_at ?? ''),
          isUnread: !isJudgeRequestSeen(String(item.id)),
          onClick: () => {
            markJudgeRequestSeen(String(item.id));
            navigate('/judge/notifications');
          },
        } satisfies BellItem));

      const judgePermissionItems = ((judgePermissionsBellQuery.data ?? []) as any[])
        .filter((item) => item?.id)
        .map((item) => ({
          id: String(item.id),
          kind: 'judge-permission' as const,
          title: `طلب إذن بالزواج${item?.request_number ? `: ${item.request_number}` : ''}`,
          message: `${item?.notary_name || 'عدل'}${item?.involved_names ? ` • ${item.involved_names}` : ''}`,
          timestamp: String(item?.created_at ?? ''),
          isUnread: !isJudgePermissionSeen(String(item.id)),
          onClick: () => {
            markJudgePermissionSeen(String(item.id));
            navigate('/judge/permissions');
          },
        } satisfies BellItem));

      const judgeAdlCopyItems = ((judgeAdlCopyBellQuery.data ?? []) as any[])
        .filter((item) => item?.id)
        .map((item) => ({
          id: String(item.id),
          kind: 'judge-adl-copy' as const,
          title: `طلب نسخ رسوم${item?.request_number ? `: ${item.request_number}` : ''}`,
          message: item?.involved_names ? `المعني بالأمر • ${item.involved_names}` : 'طلب جديد لاستخراج نسخ/نظائر عدلية',
          timestamp: String(item?.created_at ?? ''),
          isUnread: !isJudgeAdlCopyPermissionSeen(String(item.id)),
          onClick: () => {
            markJudgeAdlCopyPermissionSeen(String(item.id));
            navigate('/judge/adl-copy-permissions');
          },
        } satisfies BellItem));

      return [...judgeRequestItems, ...judgePermissionItems, ...judgeAdlCopyItems].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    return [] as BellItem[];
  }, [
    isNotary,
    isJudge,
    notaryBellQuery.data,
    notaryJudgeSubmissionsBellQuery.data,
    judgeRequestsBellQuery.data,
    judgePermissionsBellQuery.data,
    judgeAdlCopyBellQuery.data,
    isDecisionSeen,
    isJudgeRequestSeen,
    isJudgePermissionSeen,
    isJudgeAdlCopyPermissionSeen,
    markDecisionSeen,
    markJudgeRequestSeen,
    markJudgePermissionSeen,
    markJudgeAdlCopyPermissionSeen,
    navigate,
  ]);

  const handleBellClick = () => {
    setIsBellOpen((prev) => !prev);
  };

  const handleBellItemClick = (item: BellItem) => {
    setIsBellOpen(false);
    item.onClick();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'government_authority':
        return 'السلطة الحكومية';
      case 'national_notary_authority':
        return 'الهيئة الوطنية للعدول';
      case 'authentication_judge':
        return 'القاضي المكلف';
      case 'notary':
        return 'العدل';
      default:
        return 'مستخدم';
    }
  };

  const getDashboardItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'government_authority':
        return [
          { label: 'لوحة التحكم', path: '/dashboard', icon: '🏛️' },
          { label: 'اسماء العدول', path: '/directory', icon: '⚖️' },
          { label: 'التقارير', path: '/reports', icon: '📊' },
          { label: 'إدارة المستخدمين', path: '/users', icon: '👥' },
          { label: 'الإحصائيات', path: '/statistics', icon: '📈' },
          { label: 'الإعدادات', path: '/settings', icon: '⚙️' },
        ];
      case 'national_notary_authority':
        return [
          { label: 'لوحة التحكم', path: '/dashboard', icon: '📜' },
          { label: 'إدارة العدول', path: '/directory', icon: '✍️' },
          { label: 'التراخيص', path: '/licenses', icon: '📋' },
          { label: 'التقارير', path: '/reports', icon: '📊' },
          { label: 'الإعدادات', path: '/settings', icon: '⚙️' },
        ];
      case 'authentication_judge':
        return [
          { label: 'بوابة قاضي التوثيق', path: '/judge', icon: '🏛️' },
          { label: 'الفهرسة القضائية', path: '/judge/official', icon: '🔎' },
          { label: 'رواق الفحص القانوني و الشكلي للرسوم العدلية و القبول للتضمين', path: '/judge/deeds', icon: '📥' },
          { label: 'رواق الخطاب القضائي و الختم الالكتروني', path: '/judge/judicial-speech', icon: '⚖️' },
          { label: 'رواق سجلات تضمين الشهادات العدلية و الارشفة النهائية', path: '/judge/final-archiving', icon: '📜' },
          { label: 'طلبات الإذن بالزواج', path: '/judge/permissions', icon: '📄' },
          { label: 'طلبات نسخ الرسوم', path: '/judge/adl-copy-permissions', icon: '📝' },
          { label: 'المراسلات', path: '/judge/correspondence', icon: '📨' },
          { label: 'سجل العدل', path: '/judge/notaries', icon: '🪪' },
          { label: 'التقارير', path: '/judge/reports', icon: '📊' },
        ];
      case 'notary':
        return [
          { label: 'بوابة الإشعارات القضائية', path: '/notary-portal', icon: '📬' },
          { label: 'لوحة التحكم السابقة', path: '/dashboard', icon: '✍️' },
          { label: 'اسماء العدول', path: '/directory', icon: '⚖️' },
          { label: 'عقود الزواج', path: '/dashboard/marriages', icon: '💍' },
          { label: 'العقود', path: '/dashboard/contracts', icon: '📝' },
          { label: 'الرسوم', path: '/dashboard/fees', icon: '💰' },
          { label: 'التقارير', path: '/dashboard/statistics', icon: '📊' },
        ];
      default:
        return [];
    }
  };

  const baseMenuItems = getDashboardItems();
  const menuItems =
    user?.role === 'authentication_judge'
      ? [...baseMenuItems, { label: 'صندوق الرسائل', path: '/judge/messages', icon: '✉️' }]
      : user?.role === 'notary'
        ? [...baseMenuItems, { label: 'صندوق الرسائل', path: '/messages', icon: '✉️' }]
        : baseMenuItems;

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-[100] w-full bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-white shadow-2xl border-b border-[#E6BE8A]/30">
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#E6BE8A] to-transparent opacity-60"></div>
      
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          
          {/* Left side: User Profile & Quick Actions */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleLogout}
              className="group relative flex items-center justify-center p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-800 transition-all duration-300"
              title="تسجيل الخروج"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
              <div className="absolute top-full mt-2 left-0 bg-red-950 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-[#E6BE8A]/30 shadow-xl">
                تسجيل الخروج
              </div>
            </button>

            <div className="hidden md:flex flex-col items-start border-l border-white/10 pl-6 gap-0.5">
              <span className="text-sm font-black tracking-tight text-[#E6BE8A]">{user.full_name}</span>
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">{user.email}</span>
            </div>
            
            {/* Notification Indicators */}
            <div className="flex items-center gap-2">
              {isJudge || isNotary ? (
                <div className="relative">
                  <button 
                    onClick={() => navigate(isJudge ? '/judge/messages' : '/messages')}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    title="الرسائل"
                  >
                    <span className="text-xl group-hover:rotate-12 transition-transform">📬</span>
                    {unreadTotal > 0 ? (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border-2 border-red-950 text-[10px] font-black animate-pulse">
                        {unreadTotal}
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : null}

              {/* Decisions/Requests Notification (Bell) */}
              {isJudge ? (
                <div className="relative" ref={bellMenuRef}>
                  <button 
                    onClick={handleBellClick}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    title="طلبات جديدة"
                    aria-expanded={isBellOpen}
                    aria-haspopup="menu"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🔔</span>
                    {(judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal) > 0 ? (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-red-950 text-[10px] font-black animate-pulse">
                        {judgeRequestsTotal + judgePermissionsTotal + judgeAdlCopyPermissionsTotal}
                      </span>
                    ) : null}
                  </button>
                  {isBellOpen ? (
                    <div className="absolute left-0 mt-3 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#fffdf8] text-slate-900 shadow-2xl ring-1 ring-black/5">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">سجل الإشعارات</div>
                          <div className="text-[11px] font-bold text-slate-500">جميع الطلبات السابقة والأحدث</div>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
                          {bellItems.length}
                        </span>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto p-2">
                        {bellItems.length > 0 ? (
                          bellItems.map((item) => (
                            <button
                              key={`${item.kind}-${item.id}`}
                              onClick={() => handleBellItemClick(item)}
                              className="flex w-full flex-col items-start gap-1 rounded-2xl px-3 py-3 text-right transition hover:bg-slate-100"
                            >
                              <div className="flex w-full items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-900">{item.title}</div>
                                  <div className="mt-1 line-clamp-2 text-xs font-medium text-slate-600">{item.message}</div>
                                </div>
                                {item.isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500"></span> : null}
                              </div>
                              <div className="text-[11px] font-bold text-slate-400">{formatBellTimestamp(item.timestamp)}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-6 text-center text-sm font-bold text-slate-500">لا توجد إشعارات محفوظة حالياً</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : isNotary ? (
                <div className="relative">
                  <button 
                    onClick={() => navigate('/notary-notifications')}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    title="القرارات والإشعارات القضائية"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🔔</span>
                    {notaryNotificationsTotal > 0 ? (
                      <span className="absolute -top-1 -right-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 border-2 border-red-950 text-[10px] font-black animate-pulse">
                        {notaryNotificationsTotal}
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Center: Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const isActive = window.location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all duration-300 group overflow-hidden ${
                    isActive 
                    ? 'text-[#E6BE8A] bg-white/5' 
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`text-xl transition-transform duration-500 group-hover:scale-125 ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-bold tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                  {(item.path === '/messages' || item.path === '/judge/messages') && unreadTotal > 0 ? (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {unreadTotal}
                    </span>
                  ) : null}
                  {user.role === 'notary' && item.path === '/notary-portal' && decisionsTotal > 0 ? (
                    <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {decisionsTotal}
                    </span>
                  ) : null}
                  {user.role === 'authentication_judge' && item.path === '/judge/permissions' && judgePermissionsTotal > 0 ? (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {judgePermissionsTotal}
                    </span>
                  ) : null}
                  {user.role === 'authentication_judge' && item.path === '/judge/adl-copy-permissions' && judgeAdlCopyPermissionsTotal > 0 ? (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {judgeAdlCopyPermissionsTotal}
                    </span>
                  ) : null}
                  {user.role === 'authentication_judge' && item.path === '/judge/notifications' && judgeRequestsTotal > 0 ? (
                    <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                      {judgeRequestsTotal}
                    </span>
                  ) : null}
                  {isActive && (
                    <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-[#E6BE8A] to-transparent"></div>
                  )}
                  {/* Subtle hover background effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#E6BE8A]/0 to-[#E6BE8A]/0 group-hover:from-[#E6BE8A]/5 group-hover:to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              );
            })}
          </div>

          {/* Right side: Branding & Logo */}
          <div className="flex items-center gap-5 text-right flex-row-reverse">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-[#E6BE8A] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <img 
                src="/logos/morocco-coat.jpg" 
                alt="شعار المملكة" 
                className="relative h-16 w-16 object-contain contrast-125 brightness-110 rounded-full bg-white/10 p-1 border border-[#E6BE8A]/20"
              />
            </div>
            
            <div className="hidden sm:flex flex-col items-end">
              <h1 className="text-xl font-black font-amiri tracking-wider leading-none text-white drop-shadow-sm">
                الهيئة الوطنية للعدول
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-px w-6 bg-[#E6BE8A]/40"></span>
                <span className="text-[10px] font-black uppercase text-[#E6BE8A] tracking-[0.2em]">
                  {getRoleName(user.role)}
                </span>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-6 flex flex-col items-end gap-1.5">
                <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'w-6 translate-y-2 -rotate-45' : 'w-6'}`}></span>
                <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'w-4'}`}></span>
                <span className={`h-0.5 bg-[#E6BE8A] transition-all duration-300 ${isMenuOpen ? 'w-6 -translate-y-1 rotate-45' : 'w-5'}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${isMenuOpen ? 'max-h-[600px] border-t border-white/10 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="grid grid-cols-1 gap-2 pt-6">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#E6BE8A]/30 hover:bg-red-800/40 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </div>
                {unreadTotal > 0 && (item.path === '/messages' || item.path === '/judge/messages') && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black animate-pulse">
                    {unreadTotal}
                  </span>
                )}
                {user.role === 'notary' && item.path === '/notary-portal' && decisionsTotal > 0 ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                    {decisionsTotal}
                  </span>
                ) : null}
                {user.role === 'authentication_judge' && item.path === '/judge/permissions' && judgePermissionsTotal > 0 ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                    {judgePermissionsTotal}
                  </span>
                ) : null}
                {user.role === 'authentication_judge' && item.path === '/judge/adl-copy-permissions' && judgeAdlCopyPermissionsTotal > 0 ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                    {judgeAdlCopyPermissionsTotal}
                  </span>
                ) : null}
                {user.role === 'authentication_judge' && item.path === '/judge/notifications' && judgeRequestsTotal > 0 ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                    {judgeRequestsTotal}
                  </span>
                ) : null}
              </button>
            ))}
            
            {/* User Info for Mobile */}
            <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between">
              <div className="text-right">
                <p className="text-xs font-black text-[#E6BE8A]">{user.full_name}</p>
                <p className="text-[10px] text-white/40">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
