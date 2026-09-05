import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export type BreadcrumbItem = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="مسار التنقل" className="text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, idx) => (
          <li key={`${it.label}-${idx}`} className="flex items-center gap-2">
            {it.to ? (
              <Link
                to={it.to}
                className="rounded-md px-1 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {it.label}
              </Link>
            ) : (
              <span className="font-bold text-slate-900">{it.label}</span>
            )}
            {idx < items.length - 1 ? <span className="text-slate-400">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | 'all';
  onChange: (next: T | 'all') => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        {([{ value: 'all' as const, label: 'الكل' }, ...options] as const).map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  body,
  action,
}: {
  title: string;
  description?: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const text = body ?? description;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-slate-900/5" />
      <div className="text-lg font-extrabold text-slate-900">{title}</div>
      {text ? <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadMore({
  canLoadMore,
  onLoadMore,
  label = 'عرض المزيد',
  hidden,
  onClick,
}: {
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  label?: string;
  hidden?: boolean;
  onClick?: () => void;
}) {
  const resolvedCanLoadMore = hidden !== undefined ? !hidden : Boolean(canLoadMore);
  const resolvedOnClick = onClick ?? onLoadMore;
  if (hidden && !resolvedCanLoadMore) return null;
  return (
    <div className="flex justify-center">
      <button
        type="button"
        disabled={!resolvedCanLoadMore || !resolvedOnClick}
        onClick={resolvedOnClick}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {label}
      </button>
    </div>
  );
}

export function Faq({
  title = 'الأسئلة الشائعة',
  items,
}: {
  title?: string;
  items: Array<{ q: string; a: string }>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-extrabold text-slate-900">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((it, idx) => (
          <details
            key={`${it.q}-${idx}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:ring-2 open:ring-indigo-500/30"
          >
            <summary className="cursor-pointer list-none select-none">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-extrabold text-slate-900 sm:text-base">{it.q}</span>
                <span className="mt-0.5 text-slate-400 transition group-open:rotate-180">⌄</span>
              </div>
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FeaturedRail({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex snap-x snap-mandatory gap-4 pb-2">{children}</div>
      </div>
    </section>
  );
}

export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-500 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    >
      {children}
    </div>
  );
}

export function KnowledgeHero({
  title,
  tagline,
  primaryCta,
  secondaryCta,
  accent,
  icon,
  pattern = 'grid',
}: {
  title: string;
  tagline: string;
  primaryCta: React.ReactNode;
  secondaryCta: React.ReactNode;
  accent: { from: string; to: string; glow: string };
  icon: string;
  pattern?: 'grid' | 'dots' | 'waves' | 'tickets';
}) {
  const bg = useMemo(() => {
    switch (pattern) {
      case 'dots':
        return 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px]';
      case 'waves':
        return 'bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.25)_0,transparent_60%)]';
      case 'tickets':
        return 'bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_0),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:28px_28px]';
      case 'grid':
      default:
        return 'bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_0),linear-gradient(rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:34px_34px]';
    }
  }, [pattern]);

  return (
    <section className={`relative overflow-hidden rounded-3xl ${accent.glow} p-[1px] shadow-xl`}>
      <div className={`relative rounded-3xl bg-gradient-to-br ${accent.from} ${accent.to} px-5 py-10 text-white sm:px-10`}>
        <div className={`absolute inset-0 opacity-60 ${bg}`} />
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
            <span className="text-2xl">{icon}</span>
            <span>بوابة المعرفة والتكوين</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">{tagline}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {primaryCta}
            {secondaryCta}
          </div>
        </div>
      </div>
    </section>
  );
}

export function aiImageUrl(
  prompt: string,
  opts?: {
    width?: number;
    height?: number;
    seed?: string;
  },
) {
  const width = opts?.width ?? 1280;
  const height = opts?.height ?? 720;
  const seed = encodeURIComponent(opts?.seed ?? 'seed');
  const p = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${p}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

export function EditorialHero({
  title,
  tagline,
  primaryCta,
  secondaryCta,
  kicker = 'الإعلام والمستجدات',
  imageMain,
  imageSide,
  accent = 'from-slate-950 to-indigo-950',
  renderTitle,
  renderTagline,
  renderKicker,
  onEditMainImage,
  onEditSideImage,
}: {
  title: string;
  tagline: string;
  primaryCta: React.ReactNode;
  secondaryCta?: React.ReactNode;
  kicker?: string;
  imageMain: string;
  imageSide?: string;
  accent?: string;
  renderTitle?: (className: string) => React.ReactNode;
  renderTagline?: (className: string) => React.ReactNode;
  renderKicker?: (className: string) => React.ReactNode;
  onEditMainImage?: () => void;
  onEditSideImage?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-12">
        <div className="group relative lg:col-span-7">
          <img src={imageMain} alt="" className="h-72 w-full object-cover sm:h-96 lg:h-full" loading="eager" decoding="async" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/15 to-transparent" />
          {onEditMainImage ? (
            <button
              type="button"
              onClick={onEditMainImage}
              className="absolute left-4 top-4 rounded-xl bg-black/60 px-3 py-2 text-xs font-extrabold text-white opacity-0 shadow transition hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
            >
              تغيير الصورة
            </button>
          ) : null}
        </div>

        <div className={`relative flex flex-col justify-between gap-6 bg-gradient-to-br ${accent} p-7 text-white sm:p-9 lg:col-span-5`}>
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-extrabold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-white/70" />
              {renderKicker ? renderKicker('') : <span>{kicker}</span>}
            </div>
            {renderTitle ? renderTitle('mt-5 text-3xl font-extrabold leading-tight sm:text-4xl') : <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>}
            {renderTagline ? renderTagline('mt-4 text-sm leading-7 text-white/85 sm:text-base') : <p className="mt-4 text-sm leading-7 text-white/85 sm:text-base">{tagline}</p>}
          </div>

          <div className="relative flex flex-wrap items-center gap-3">
            {primaryCta}
            {secondaryCta ?? null}
          </div>
        </div>
      </div>

      {imageSide ? (
        <div className="grid gap-4 bg-slate-50 p-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900">لمحة سريعة</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">تصميم حديث بصور ديناميكية وعناصر قابلة للمسح السريع.</div>
          </div>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative">
              <img src={imageSide} alt="" className="h-40 w-full object-cover sm:h-[132px]" loading="lazy" decoding="async" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
            </div>
            {onEditSideImage ? (
              <button
                type="button"
                onClick={onEditSideImage}
                className="absolute left-3 top-3 rounded-xl bg-black/60 px-3 py-2 text-xs font-extrabold text-white opacity-0 shadow transition hover:bg-black/70 group-hover:opacity-100 focus:opacity-100"
              >
                تغيير الصورة
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
