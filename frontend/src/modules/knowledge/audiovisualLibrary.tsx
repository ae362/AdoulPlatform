import React, { useMemo, useState } from 'react';
import {
  Breadcrumbs,
  EditorialHero,
  EmptyState,
  FeaturedRail,
  FilterChips,
  LoadMore,
  PageContainer,
  Reveal,
  SectionTitle,
  aiImageUrl,
  Faq,
} from '../../components/knowledge/knowledgeUi';
import { useCmsJson } from '../content/useCmsJson';
import { useContentEditorOptional } from '../content/editorContext';
import { InlineEditableText } from '../../components/knowledge/inlineEdit';
import { ReturnToLandingButton } from '../../components/common/ReturnToLandingButton';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';
import { getViewerKey } from '../../utils/viewerKey';

type MediaType = 'فيديو' | 'بودكاست' | 'صور';
type Topic = 'العدول' | 'الرقمنة' | 'المسطرة' | 'الممارسة' | 'حوارات';
type DurationBucket = 'قصير' | 'متوسط' | 'طويل';

type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  summary: string;
  topic: Topic;
  year: number;
  duration: string;
  durationBucket: DurationBucket;
  featured?: boolean;
  views?: string;
  imageUrl?: string;
  mediaUrl?: string;
};

type MediaPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: MediaItem[];
};

function formatCompactCount(count: number) {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(count < 10_000_000 ? 1 : 0)}M`;
}

function viewLabelForType(type: MediaType) {
  return type === 'بودكاست' ? 'استماع' : 'مشاهدة';
}

const SEED: MediaItem[] = [
  { id: 'av-1', type: 'فيديو', title: 'شرح سريع: التحقق قبل الإرسال', summary: 'خمس دقائق ترفع جودة الإدخال وتقلّل الرفض.', topic: 'الممارسة', year: 2026, duration: '05:12', durationBucket: 'قصير', featured: true, views: '12.4k مشاهدة' },
  { id: 'av-2', type: 'بودكاست', title: 'حوار: الرقمنة وجودة المراجعة', summary: 'نقاش عملي حول أفضل الممارسات، مع أمثلة واقعية.', topic: 'الرقمنة', year: 2026, duration: '33:40', durationBucket: 'طويل', featured: true, views: '3.1k استماع' },
  { id: 'av-3', type: 'فيديو', title: 'دقيقة واحدة: قواعد تسمية المرفقات', summary: 'تسمية صحيحة = مراجعة أسرع. دليل مختصر.', topic: 'الرقمنة', year: 2025, duration: '01:05', durationBucket: 'قصير', featured: true, views: '9.8k مشاهدة' },
  { id: 'av-4', type: 'صور', title: 'ألبوم: محطات من التكوين', summary: 'لقطات من ورشات تدريبية ومبادرات ميدانية.', topic: 'الممارسة', year: 2025, duration: '24 صورة', durationBucket: 'متوسط', views: '1.2k' },
  { id: 'av-5', type: 'بودكاست', title: 'ملخصات قصيرة: أسئلة متكررة', summary: 'إجابات سريعة بصوت واضح حول الإجرائية والآجال.', topic: 'المسطرة', year: 2025, duration: '21:10', durationBucket: 'متوسط', views: '2.5k' },
  { id: 'av-6', type: 'فيديو', title: 'دليل عملي: تحسين جودة PDF', summary: 'إعدادات مقترحة للمسح والضغط والوضوح.', topic: 'الرقمنة', year: 2026, duration: '18:55', durationBucket: 'متوسط', views: '5.6k مشاهدة' },
  { id: 'av-7', type: 'صور', title: 'مختارات الأسبوع: لقطات ملهمة', summary: 'مشاهد من عمل الفرق وتجارب ناجحة.', topic: 'حوارات', year: 2026, duration: '16 صورة', durationBucket: 'قصير', featured: true },
  { id: 'av-8', type: 'فيديو', title: 'شرح: تنظيم الأرشفة حسب السنة', summary: 'طريقة بسيطة لتصنيف الملفات لسهولة الوصول.', topic: 'العدول', year: 2025, duration: '10:20', durationBucket: 'متوسط' },
  { id: 'av-9', type: 'بودكاست', title: 'حوار: تبسيط المسطرة', summary: 'كيف نختصر الوقت دون الإخلال بالدقة؟', topic: 'المسطرة', year: 2026, duration: '29:05', durationBucket: 'طويل' },
  { id: 'av-10', type: 'فيديو', title: 'تجربة مستخدم: تحسين الواجهة العربية', summary: 'تفاصيل صغيرة تصنع فرقاً في القراءة والتنقل.', topic: 'الرقمنة', year: 2025, duration: '14:12', durationBucket: 'متوسط' },
  { id: 'av-11', type: 'صور', title: 'صور: أدوات عمل ومراجعة', summary: 'أمثلة على ملفات منظمة وواجهات فعّالة.', topic: 'الممارسة', year: 2025, duration: '30 صورة', durationBucket: 'طويل' },
  { id: 'av-12', type: 'فيديو', title: 'دقيقة واحدة: قائمة تحقق نهائية', summary: 'قبل الضغط على “إرسال”… هذه أهم 5 نقاط.', topic: 'المسطرة', year: 2026, duration: '01:00', durationBucket: 'قصير', featured: true },
];

const chip = (value: any, label: string) => ({ value, label });

const typeBadge: Record<MediaType, string> = {
  فيديو: 'bg-indigo-600/10 text-indigo-700',
  بودكاست: 'bg-amber-600/10 text-amber-800',
  صور: 'bg-emerald-600/10 text-emerald-700',
};

const playIcon: Record<MediaType, string> = {
  فيديو: '▶',
  بودكاست: '🎧',
  صور: '🖼️',
};

export function AudiovisualLibraryPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [type, setType] = useState<MediaType | 'all'>('all');
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [year, setYear] = useState<number | 'all'>('all');
  const [dur, setDur] = useState<DurationBucket | 'all'>('all');
  const [visible, setVisible] = useState(9);
  const { user } = useAuth();
  const viewerKey = useMemo(() => getViewerKey(user?.id), [user?.id]);
  const [localViewCounts, setLocalViewCounts] = useState<Record<string, number>>({});

  const years = useMemo(() => Array.from(new Set(SEED.map((i) => i.year))).sort((a, b) => b - a), []);

  const { value: cms } = useCmsJson<MediaPageContent>('content_audiovisual_library', {});
  const editorContent = (editor?.content ?? {}) as MediaPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<MediaPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as MediaPageContent['items'];
  const sourceItems = useMemo(() => (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED), [cmsItems]);

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('premium media studio, cinematic lighting, modern, arabic, photoreal', { seed: 'av-hero-main', width: 1500, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('headphones and microphone on desk, premium, photoreal, soft shadows', { seed: 'av-hero-side', width: 900, height: 520 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sourceItems.filter((m) => {
      if (type !== 'all' && m.type !== type) return false;
      if (topic !== 'all' && m.topic !== topic) return false;
      if (year !== 'all' && m.year !== year) return false;
      if (dur !== 'all' && m.durationBucket !== dur) return false;
      if (!s) return true;
      return `${m.title} ${m.summary}`.toLowerCase().includes(s);
    });
  }, [dur, q, sourceItems, topic, type, year]);

  const featured = useMemo(() => filtered.filter((m) => m.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const viewCountsQuery = trpc.analytics.getContentViewCounts.useQuery(
    { contentKeys: sourceItems.map((x) => x.id) },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const recordViewMutation = trpc.analytics.recordContentView.useMutation();

  const viewCounts = useMemo(() => {
    const merged: Record<string, number> = { ...(viewCountsQuery.data?.counts ?? {}) };
    for (const [k, v] of Object.entries(localViewCounts)) merged[k] = v;
    return merged;
  }, [localViewCounts, viewCountsQuery.data?.counts]);

  const viewTextFor = (m: MediaItem) => {
    const count = viewCounts[m.id];
    if (typeof count === 'number') return `${formatCompactCount(count)} ${viewLabelForType(m.type)}`;
    return m.views ?? `${m.year}`;
  };

  const mediaImage = (m: MediaItem, w: number, h: number) =>
    m.imageUrl ?? aiImageUrl(`media thumbnail, ${m.type}, ${m.topic}, premium, photoreal`, { seed: m.id, width: w, height: h });

  const heroTitle = cmsHero.title ?? 'الخزانة السمعية البصرية';
  const heroTagline = cmsHero.tagline ?? 'شاهد. استمع. واكتشف المعرفة بصوت وصورة.';
  const heroKicker = cmsHero.kicker ?? 'Media / Streaming';
  const heroAccent = cmsHero.accent ?? 'from-slate-950 to-indigo-950';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'المعرفة والتكوين' }, { label: 'الخزانة السمعية البصرية' }]} />

        <EditorialHero
          title={heroTitle}
          tagline={heroTagline}
          kicker={heroKicker}
          imageMain={heroMain}
          imageSide={heroSide}
          accent={heroAccent}
          renderTitle={(className) => (
            <InlineEditableText
              tag="h1"
              className={className}
              value={heroTitle}
              disabled={!isEditing}
              selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'title'}
              onSelect={() => editor?.setSelected({ scope: 'hero', field: 'title' })}
              onChange={(next) => editor?.patchHero({ title: next })}
            />
          )}
          renderTagline={(className) => (
            <InlineEditableText
              tag="p"
              className={className}
              value={heroTagline}
              disabled={!isEditing}
              selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'tagline'}
              onSelect={() => editor?.setSelected({ scope: 'hero', field: 'tagline' })}
              onChange={(next) => editor?.patchHero({ tagline: next })}
            />
          )}
          renderKicker={() => (
            <InlineEditableText
              tag="span"
              value={heroKicker}
              disabled={!isEditing}
              selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'kicker'}
              onSelect={() => editor?.setSelected({ scope: 'hero', field: 'kicker' })}
              onChange={(next) => editor?.patchHero({ kicker: next })}
            />
          )}
          onEditMainImage={isEditing ? () => editor?.requestUpload({ scope: 'heroMain' }) : undefined}
          onEditSideImage={isEditing ? () => editor?.requestUpload({ scope: 'heroSide' }) : undefined}
          primaryCta={
            <a
              href="#library"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              ابدأ المشاهدة
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => setType('بودكاست')}
            >
              استمع للبودكاست
            </button>
          }
        />

        <Reveal>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2 lg:col-span-1">
              <div className="text-xs font-bold text-slate-600">بحث</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في الفيديوهات أو البودكاست أو الصور…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips label="النوع" value={type} onChange={setType} options={[chip('فيديو', 'فيديو'), chip('بودكاست', 'بودكاست'), chip('صور', 'صور')]} />
              <FilterChips label="المدة" value={dur} onChange={setDur} options={[chip('قصير', 'قصير'), chip('متوسط', 'متوسط'), chip('طويل', 'طويل')]} />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips label="الموضوع" value={topic} onChange={setTopic} options={[chip('العدول', 'العدول'), chip('الرقمنة', 'الرقمنة'), chip('المسطرة', 'المسطرة'), chip('الممارسة', 'الممارسة'), chip('حوارات', 'حوارات')]} />
              <FilterChips
                label="السنة"
                value={year === 'all' ? 'all' : (String(year) as any)}
                onChange={(v) => setYear(v === 'all' ? 'all' : Number(v))}
                options={years.map((y) => chip(String(y), String(y)))}
              />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="مختارات الأسبوع" subtitle="محتوى يساعدك على البدء بسرعة: واضح، مختصر، وذو أثر عملي.">
            {featured.map((m) => (
              <div key={m.id} className="snap-start min-w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative">
                  <img src={mediaImage(m, 900, 540)} alt="" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900">
                    {m.duration}
                  </div>
                  <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl text-white backdrop-blur">
                    {playIcon[m.type]}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeBadge[m.type]}`}>{m.type}</span>
                    <span className="text-xs font-bold text-slate-500">{viewTextFor(m)}</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-slate-900">{m.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{m.summary}</div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold">{m.topic}</span>
                    <span className="font-bold">{m.year}</span>
                  </div>
                </div>
              </div>
            ))}
          </FeaturedRail>
        </Reveal>

        <Reveal className="space-y-4">
          <SectionTitle
            title="المكتبة"
            subtitle="شبكة محتوى سريعة القراءة—مع صور جذابة وتفاصيل كافية للاختيار."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => editor?.addItem()}
                  >
                    إضافة عنصر
                  </button>
                ) : null}
                <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
              </div>
            }
          />

          {items.length ? (
            <div id="library" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => {
                const idx = sourceItems.findIndex((x) => x.id === m.id);
                const index = idx >= 0 ? idx : 0;
                const titleSelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                const summarySelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                return (
                  <article key={m.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative">
                    <img src={mediaImage(m, 900, 560)} alt="" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                    {isEditing ? (
                      <div className="absolute left-3 top-3 flex gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-black/60 px-3 py-2 text-xs font-extrabold text-white shadow transition hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            editor?.requestUpload({ scope: 'item', index, key: 'imageUrl' });
                          }}
                        >
                          تغيير الصورة
                        </button>
                        <button
                          type="button"
                          className="rounded-xl bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-900 shadow transition hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            editor?.duplicateItem(index);
                          }}
                        >
                          نسخ
                        </button>
                        <button
                          type="button"
                          className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white shadow transition hover:bg-rose-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            editor?.deleteItem(index);
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    ) : null}
                    <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900">
                      {m.duration}
                    </div>
                    <div className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl text-white backdrop-blur">
                      {playIcon[m.type]}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeBadge[m.type]}`}>{m.type}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{m.topic}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{m.year}</span>
                    </div>
                    <InlineEditableText
                      tag="h3"
                      className="mt-3 text-lg font-extrabold text-slate-900"
                      value={m.title}
                      disabled={!isEditing}
                      selected={Boolean(titleSelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'title' })}
                      onChange={(next) => editor?.patchItem(index, { title: next })}
                    />
                    <InlineEditableText
                      tag="p"
                      className="mt-2 text-sm leading-7 text-slate-600"
                      value={m.summary}
                      disabled={!isEditing}
                      selected={Boolean(summarySelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                      onChange={(next) => editor?.patchItem(index, { summary: next })}
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs font-bold text-slate-500">{viewTextFor(m)}</div>
                      <button
                        type="button"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => {
                          recordViewMutation.mutate(
                            { contentKey: m.id, viewerKey },
                            {
                              onSuccess: (res) =>
                                setLocalViewCounts((prev) => ({ ...prev, [res.contentKey]: res.viewCount })),
                            }
                          );
                          if (m.mediaUrl) window.open(m.mediaUrl, '_blank', 'noopener,noreferrer');
                          else alert('قريباً: صفحة تشغيل/تفاصيل');
                        }}
                      >
                        فتح
                      </button>
                    </div>
                  </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض محتوى آخر." />
          )}

          <LoadMore hidden={visible >= filtered.length} onClick={() => setVisible((v) => v + 6)} />
        </Reveal>

        <Reveal>
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionTitle title="قوائم تشغيل" subtitle="باقات مقترحة تساعدك على الوصول للمحتوى حسب الوقت والهدف." />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'بدايات سريعة', body: 'محتوى قصير يشرح أهم المفاهيم في دقائق.', icon: '⚡' },
                  { title: 'حوارات معمّقة', body: 'بودكاست وحوارات أطول لفهم أوسع.', icon: '🎧' },
                  { title: 'ملخصات مركزة', body: 'نقاط عملية جاهزة للتطبيق مباشرة.', icon: '🧾' },
                ].map((x) => (
                  <div key={x.title} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <div className="text-2xl">{x.icon}</div>
                    <div className="mt-2 text-sm font-extrabold text-slate-900">{x.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{x.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-indigo-950 to-slate-950 p-6 text-white shadow-sm">
              <div className="text-sm font-extrabold">ملاحظة</div>
              <div className="mt-2 text-sm text-white/80 leading-relaxed">
                الصور هنا تُولَّد ديناميكياً عبر خدمة صور AI لأغراض العرض. يمكن استبدالها لاحقاً بصور محلية/مكتبة وسائط داخلية.
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                onClick={() => alert('قريباً: حفظ قائمة تشغيل')}
              >
                حفظ قائمة
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Faq
            items={[
              { q: 'هل يمكن ربط المحتوى بتسجيل/مشاهدة فعلية؟', a: 'نعم—يمكن لاحقاً إضافة صفحات تشغيل وربطها بقاعدة بيانات أو CMS.' },
              { q: 'هل يمكن رفع وسائط؟', a: 'يمكن إضافة زر رفع وربط التخزين حسب المتطلبات (محلي/سحابي).' },
              { q: 'هل هناك تحميل أو مشاركة؟', a: 'يمكن إضافة مشاركة روابط أو تحميل ملفات حسب نوع المحتوى.' },
            ]}
          />
        </Reveal>
      </div>
    </PageContainer>
  );
}
