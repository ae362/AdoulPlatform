import React, { useEffect, useMemo, useState } from 'react';

export type PortalNotificationItem = {
  id: string;
  sourceId?: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  categoryLabel?: string;
  timestamp?: string;
  body: string;
  detailTitle?: string;
  detailBody?: string;
  meta?: Array<{ label: string; value: string }>;
  isSeen: boolean;
  accent: 'amber' | 'emerald' | 'rose' | 'cyan' | 'indigo' | 'slate';
  onOpen?: () => void;
  onDelete?: () => void;
};

type PortalNotificationsCenterProps = {
  title: string;
  description: string;
  badgeLabel: string;
  totalCount: number;
  unreadCount: number;
  seenCount: number;
  bellCount?: number;
  items: PortalNotificationItem[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  openLabel?: string;
  deleteLabel?: string;
  deleting?: boolean;
};

type FilterMode = 'all' | 'unseen' | 'seen';

const accentMap: Record<PortalNotificationItem['accent'], { badge: string; ribbon: string; panel: string }> = {
  amber: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    ribbon: 'from-amber-500 to-orange-500',
    panel: 'from-amber-50 via-white to-orange-50',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ribbon: 'from-emerald-500 to-teal-500',
    panel: 'from-emerald-50 via-white to-teal-50',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    ribbon: 'from-rose-500 to-red-500',
    panel: 'from-rose-50 via-white to-red-50',
  },
  cyan: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    ribbon: 'from-cyan-500 to-sky-500',
    panel: 'from-cyan-50 via-white to-sky-50',
  },
  indigo: {
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    ribbon: 'from-indigo-500 to-violet-500',
    panel: 'from-indigo-50 via-white to-violet-50',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    ribbon: 'from-slate-500 to-slate-400',
    panel: 'from-slate-50 via-white to-slate-100',
  },
};

export function formatPortalDateTime(value?: string) {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return `${date.toLocaleDateString('ar-MA')} • ${date.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function PortalNotificationsCenter({
  title,
  description,
  badgeLabel,
  totalCount,
  unreadCount,
  seenCount,
  bellCount,
  items,
  loading = false,
  searchPlaceholder = 'ابحث داخل الإشعارات',
  emptyTitle = 'لا توجد إشعارات حالياً',
  emptyDescription = 'ستظهر هنا كل الإشعارات الواردة لهذا الرواق فور توفرها.',
  openLabel = 'فتح الإشعار',
  deleteLabel = 'حذف الإشعار',
  deleting = false,
}: PortalNotificationsCenterProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (filterMode === 'seen' && !item.isSeen) return false;
      if (filterMode === 'unseen' && item.isSeen) return false;
      if (!lowered) return true;
      return [item.title, item.subtitle || '', item.statusLabel, item.categoryLabel || '', item.body, item.detailTitle || '', item.detailBody || '']
        .join(' ')
        .toLowerCase()
        .includes(lowered);
    });
  }, [filterMode, items, searchTerm]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId) ?? null,
    [filteredItems, items, selectedId]
  );

  const selectedTheme = accentMap[selectedItem?.accent ?? 'slate'];

  return (
    <div className="min-h-full space-y-8 bg-[radial-gradient(circle_at_top_left,_rgba(127,29,29,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(8,145,178,0.10),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_45%,_#eef2ff_100%)] p-1" dir="rtl">
      <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/85 px-8 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-sm">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(127,29,29,0.06),transparent_35%,rgba(8,145,178,0.06))]" />
        <div className="absolute -top-20 left-0 h-56 w-56 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-4 py-1.5 text-xs font-black tracking-[0.18em] text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {badgeLabel}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black leading-tight text-slate-900 md:text-5xl">{title}</h1>
              <p className="max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">{description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:min-w-[560px]">
            <div className="rounded-3xl border border-rose-100 bg-white/80 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">الإجمالي</div>
              <div className="mt-3 text-4xl font-black text-slate-900">{totalCount}</div>
              <div className="mt-2 text-xs font-bold text-slate-500">عدد العناصر المحفوظة</div>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">غير المقروء</div>
              <div className="mt-3 text-4xl font-black text-amber-900">{unreadCount}</div>
              <div className="mt-2 text-xs font-bold text-amber-700">تحتاج المراجعة الآن</div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">مقروءة</div>
              <div className="mt-3 text-4xl font-black text-emerald-900">{seenCount}</div>
              <div className="mt-2 text-xs font-bold text-emerald-700">تم التعامل معها</div>
            </div>
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/90 p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">عداد الجرس</div>
              <div className="mt-3 text-4xl font-black text-cyan-900">{bellCount ?? unreadCount}</div>
              <div className="mt-2 text-xs font-bold text-cyan-700">المعروض في الشريط</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
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
            </div>

            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-3 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[26px] border border-slate-200 bg-slate-50" />
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const theme = accentMap[item.accent];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`group relative overflow-hidden rounded-[28px] border text-right transition-all ${selectedId === item.id ? 'border-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)]' : item.isSeen ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg' : 'border-amber-300 bg-gradient-to-r from-amber-50 via-white to-rose-50 shadow-[0_14px_38px_rgba(245,158,11,0.16)] hover:-translate-y-0.5'}`}
                  >
                    <div className={`absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b ${item.isSeen ? 'from-slate-300 to-slate-200' : theme.ribbon}`} />
                    <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${theme.badge}`}>{item.statusLabel}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${item.isSeen ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{item.isSeen ? 'تمت القراءة' : 'جديد وغير مقروء'}</span>
                          {item.categoryLabel ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">{item.categoryLabel}</span> : null}
                        </div>

                        <div className="space-y-2">
                          <div className="text-xl font-black text-slate-900">{item.title}</div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
                            {item.subtitle ? <span>{item.subtitle}</span> : null}
                            {item.timestamp ? <span>{formatPortalDateTime(item.timestamp)}</span> : null}
                          </div>
                        </div>

                        <p className={`line-clamp-2 text-sm leading-7 ${item.isSeen ? 'text-slate-500' : 'text-slate-700'}`}>{item.body}</p>
                      </div>

                      <div className="flex items-start gap-2 self-start">
                        {!item.isSeen ? <span className="mt-1 h-3.5 w-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100" /> : null}
                        {item.onDelete ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              item.onDelete?.();
                            }}
                            disabled={deleting}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            حذف
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 px-8 py-16 text-center">
                <div className="text-6xl">🔔</div>
                <div className="mt-5 text-2xl font-black text-slate-800">{emptyTitle}</div>
                <div className="mt-3 text-sm font-bold leading-7 text-slate-500">{emptyDescription}</div>
              </div>
            )}
          </div>
        </div>

        <aside className={`sticky top-6 self-start max-h-[calc(100vh-5rem)] flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b ${selectedTheme.panel} shadow-xl`}>
          {selectedItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="border-b border-white/80 p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${selectedTheme.badge}`}>{selectedItem.statusLabel}</span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${selectedItem.isSeen ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'}`}>{selectedItem.isSeen ? 'إشعار مقروء' : 'إشعار غير مقروء'}</span>
                </div>
                <h2 className="mt-5 text-3xl font-black leading-tight text-slate-900">{selectedItem.detailTitle || selectedItem.title}</h2>
                {selectedItem.subtitle ? <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{selectedItem.subtitle}</p> : null}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 p-5">
                {selectedItem.meta?.length ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    {selectedItem.meta.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                        <div className="mt-3 text-lg font-black text-slate-900">{item.value}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[28px] border border-white/90 bg-white/85 p-6 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">ملخص الإشعار</div>
                  <p className="mt-4 text-sm font-medium leading-8 text-slate-700">{selectedItem.body}</p>
                </div>

                {selectedItem.detailBody ? (
                  <div className="rounded-[28px] border border-white/90 bg-white/85 p-6 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">تفاصيل إضافية</div>
                    <p className="mt-4 text-sm font-medium leading-8 text-slate-700">{selectedItem.detailBody}</p>
                  </div>
                ) : null}
              </div>

              {(selectedItem.onOpen || selectedItem.onDelete) ? (
                <div className="border-t border-white/80 p-4 bg-white/60 backdrop-blur-md shrink-0">
                  <div className="flex flex-col gap-3">
                    {selectedItem.onOpen ? (
                      <button
                        type="button"
                        onClick={selectedItem.onOpen}
                        className="rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
                      >
                        {openLabel}
                      </button>
                    ) : null}
                    {selectedItem.onDelete ? (
                      <button
                        type="button"
                        onClick={selectedItem.onDelete}
                        disabled={deleting}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-10 text-center">
              <div className="rounded-full bg-white/90 p-6 text-6xl shadow-lg">📨</div>
              <div className="mt-6 text-2xl font-black text-slate-900">اختر إشعاراً من القائمة</div>
              <p className="mt-3 max-w-sm text-sm font-bold leading-7 text-slate-500">ستظهر هنا ملخصات الإشعار المحدد وتفاصيله وأوامر الفتح أو الحذف بحسب طبيعة هذا الرواق.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
