import React, { useMemo, useState } from 'react';
import {
  Breadcrumbs,
  EmptyState,
  Faq,
  FeaturedRail,
  FilterChips,
  EditorialHero,
  LoadMore,
  PageContainer,
  Reveal,
  SectionTitle,
  aiImageUrl,
} from '../../components/knowledge/knowledgeUi';
import { useCmsJson } from '../content/useCmsJson';
import { useContentEditorOptional } from '../content/editorContext';
import { InlineEditableText } from '../../components/knowledge/inlineEdit';
import { ReturnToLandingButton } from '../../components/common/ReturnToLandingButton';

type NewsCategory = 'مستجدات' | 'تحليل' | 'توجيهات' | 'تنبيه';
type Source = 'نشرة رسمية' | 'بلاغ' | 'دورية' | 'مقال';

type LegalNewsItem = {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  date: string;
  source: Source;
  tags: string[];
  featured?: boolean;
  imageUrl?: string;
  linkUrl?: string;
};

type LegalNewsPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: LegalNewsItem[];
};

const SEED: LegalNewsItem[] = [
  {
    id: 'ln-1',
    category: 'مستجدات',
    title: 'مستجدات تنظيمية: تحسين إجراءات التحقق من الملفات',
    summary: 'موجز يوضح ما تغيّر وما الذي يجب الانتباه إليه عند إدخال البيانات والمرفقات.',
    date: '2026-01-10',
    source: 'بلاغ',
    tags: ['تحقق', 'إجراءات', 'مرفقات'],
    featured: true,
  },
  {
    id: 'ln-2',
    category: 'تحليل',
    title: 'قراءة مبسطة: لماذا تُرفض بعض الطلبات رغم اكتمالها؟',
    summary: 'أسباب شائعة (صياغة/تطابق/تسميات) مع حلول عملية تُقلّل الملاحظات.',
    date: '2026-01-16',
    source: 'مقال',
    tags: ['تحليل', 'جودة', 'أخطاء شائعة'],
    featured: true,
  },
  {
    id: 'ln-3',
    category: 'توجيهات',
    title: 'توجيهات: توحيد تسمية المرفقات لتسريع المعالجة',
    summary: 'اقتراحات عملية لتسمية الملفات والصفحات المرجعية بما يساعد على المراجعة السريعة.',
    date: '2026-01-21',
    source: 'دورية',
    tags: ['تنظيم', 'أرشفة', 'سرعة'],
    featured: true,
  },
  {
    id: 'ln-4',
    category: 'تنبيه',
    title: 'تنبيه: مراجعة الروابط قبل مشاركة مستندات خارجية',
    summary: 'إرشادات أمان مختصرة لضمان عدم تسريب بيانات حساسة أو روابط غير موثوقة.',
    date: '2026-01-28',
    source: 'بلاغ',
    tags: ['أمن', 'روابط', 'خصوصية'],
  },
  {
    id: 'ln-5',
    category: 'مستجدات',
    title: 'خبر: تحديث واجهة البحث وتحسين نتائج التصفية',
    summary: 'تحسينات في تجربة البحث تشمل المرشحات والسياق وتقديم اقتراحات ذكية.',
    date: '2026-02-02',
    source: 'بلاغ',
    tags: ['واجهة', 'بحث', 'تجربة المستخدم'],
  },
  {
    id: 'ln-6',
    category: 'تحليل',
    title: 'تفسير سريع: الفرق بين المتطلبات الإجرائية والبيانات التعريفية',
    summary: 'تلخيص بلغة مباشرة يساعد على إدخال صحيح للبيانات وتقليل الأخطاء.',
    date: '2026-02-06',
    source: 'مقال',
    tags: ['شرح', 'بيانات', 'امتثال'],
  },
  {
    id: 'ln-7',
    category: 'توجيهات',
    title: 'دليل عملي: تصنيف الوثائق حسب السنة والموضوع',
    summary: 'نموذج بسيط للأرشفة يُسهّل الوصول للوثائق بعد شهور من إنشائها.',
    date: '2026-02-10',
    source: 'دورية',
    tags: ['أرشفة', 'تصنيف'],
  },
  {
    id: 'ln-8',
    category: 'تنبيه',
    title: 'تنبيه: جودة الصور المُرفقة (قص/تباين/وضوح)',
    summary: 'أثر جودة الصورة على قبول المعالجة وكيفية تحسينها بسرعة.',
    date: '2026-02-14',
    source: 'بلاغ',
    tags: ['جودة', 'صور', 'مرفقات'],
  },
  {
    id: 'ln-9',
    category: 'مستجدات',
    title: 'مستجدات: تحديثات في بنية الصفحات العامة',
    summary: 'تحسينات في القراءة على الهاتف، وتدرج بصري أفضل للمحتوى العربي.',
    date: '2026-02-18',
    source: 'بلاغ',
    tags: ['واجهة', 'RTL', 'استجابة'],
  },
  {
    id: 'ln-10',
    category: 'تحليل',
    title: 'ملخص أسبوعي: أهم ما نُشر وما ينبغي تطبيقه',
    summary: 'ملخص يربط الأخبار بالتطبيق العملي، مع نقاط تنفيذ قصيرة.',
    date: '2026-02-23',
    source: 'مقال',
    tags: ['ملخص', 'أسبوعي'],
  },
  {
    id: 'ln-11',
    category: 'توجيهات',
    title: 'خطوات: إعداد ملف PDF مطابق وواضح',
    summary: 'إعدادات مقترحة للمسح الضوئي والضغط والتسمية.',
    date: '2026-02-27',
    source: 'دورية',
    tags: ['PDF', 'إعداد', 'جودة'],
  },
  {
    id: 'ln-12',
    category: 'تنبيه',
    title: 'تنبيه: التحقق من البيانات قبل الإرسال النهائي',
    summary: 'قائمة تحقق قصيرة قبل الضغط على زر الإرسال.',
    date: '2026-03-01',
    source: 'بلاغ',
    tags: ['تحقق', 'قائمة تحقق'],
  },
];

const chip = (value: any, label: string) => ({ value, label });

const catBadge: Record<NewsCategory, string> = {
  مستجدات: 'bg-sky-600/10 text-sky-700',
  تحليل: 'bg-violet-600/10 text-violet-700',
  توجيهات: 'bg-emerald-600/10 text-emerald-700',
  تنبيه: 'bg-rose-600/10 text-rose-700',
};

export function LegalNewsPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<NewsCategory | 'all'>('all');
  const [src, setSrc] = useState<Source | 'all'>('all');
  const [visible, setVisible] = useState(9);

  const { value: cms } = useCmsJson<LegalNewsPageContent>('content_legal_news', {});
  const editorContent = (editor?.content ?? {}) as LegalNewsPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<LegalNewsPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as LegalNewsPageContent['items'];

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('modern newsroom, arabic headline, premium editorial layout, photoreal, soft light', { seed: 'legal-news-hero', width: 1400, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('law books and gavel on desk, premium, photoreal, soft shadows', { seed: 'legal-news-side', width: 900, height: 520 });
  const cardImg = (id: string, prompt: string, imageUrl?: string) => imageUrl ?? aiImageUrl(prompt, { seed: id, width: 900, height: 600 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED;
    return base.filter((n) => {
      if (cat !== 'all' && n.category !== cat) return false;
      if (src !== 'all' && n.source !== src) return false;
      if (!s) return true;
      return `${n.title} ${n.summary} ${n.tags.join(' ')}`.toLowerCase().includes(s);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [cmsItems, cat, q, src]);

  const featured = useMemo(() => filtered.filter((x) => x.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const heroTitle = cmsHero.title ?? 'أحدث الأخبار القانونية';
  const heroTagline = cmsHero.tagline ?? 'موجزات دقيقة، سياق واضح، وروابط للمصدر—لتبقى على اطلاع.';
  const heroAccent = cmsHero.accent ?? 'from-slate-950 to-sky-950';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'الإعلام والمستجدات' }, { label: 'أحدث الأخبار القانونية' }]} />

        <EditorialHero
          title={heroTitle}
          tagline={heroTagline}
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
          onEditMainImage={isEditing ? () => editor?.requestUpload({ scope: 'heroMain' }) : undefined}
          onEditSideImage={isEditing ? () => editor?.requestUpload({ scope: 'heroSide' }) : undefined}
          primaryCta={
            <a
              href="#news"
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              ابدأ القراءة
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => setCat('تنبيه')}
            >
              تنبيهات عاجلة
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
                placeholder="ابحث في الأخبار…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips
                label="التصنيف"
                value={cat}
                onChange={setCat}
                options={[chip('مستجدات', 'مستجدات'), chip('تحليل', 'تحليل'), chip('توجيهات', 'توجيهات'), chip('تنبيه', 'تنبيه')]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips
                label="المصدر"
                value={src}
                onChange={setSrc}
                options={[chip('نشرة رسمية', 'نشرة رسمية'), chip('بلاغ', 'بلاغ'), chip('دورية', 'دورية'), chip('مقال', 'مقال')]}
              />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="مختارات الأسبوع" subtitle="أهم ما يهمك: موجز + معنى + أثر عملي.">
            {featured.map((x) => {
              const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as LegalNewsItem[];
              const idx = sourceItems.findIndex((it) => it.id === x.id);
              const index = idx >= 0 ? idx : 0;
              const titleSelected =
                editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
              const summarySelected =
                editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

              return (
                <div key={x.id} className="snap-start min-w-[340px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={cardImg(x.id, `arabic newspaper cover, ${x.category}, premium editorial, photoreal`, x.imageUrl)}
                    alt=""
                    className="h-36 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
                  {isEditing ? (
                    <div className="absolute left-2 top-2 flex gap-2">
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
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${catBadge[x.category]}`}>{x.category}</span>
                  <span className="text-xs font-bold text-slate-500">{x.date}</span>
                </div>
                <InlineEditableText
                  tag="h3"
                  className="mt-3 text-base font-extrabold text-slate-900"
                  value={x.title}
                  disabled={!isEditing}
                  selected={Boolean(titleSelected)}
                  onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'title' })}
                  onChange={(next) => editor?.patchItem(index, { title: next })}
                />
                <InlineEditableText
                  tag="p"
                  className="mt-1 text-sm text-slate-600"
                  value={x.summary}
                  disabled={!isEditing}
                  selected={Boolean(summarySelected)}
                  onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                  onChange={(next) => editor?.patchItem(index, { summary: next })}
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{x.source}</span>
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    onClick={() => {
                      if (x.linkUrl) window.open(x.linkUrl, '_blank', 'noopener,noreferrer');
                      else alert('قريباً: صفحة تفاصيل الخبر');
                    }}
                  >
                    اقرأ
                  </button>
                </div>
                </div>
              );
            })}
          </FeaturedRail>
        </Reveal>

        <Reveal>
          <div id="news" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="الأخبار"
              subtitle="كل عنصر مصمم ليكون قابلاً للمسح السريع، مع تفاصيل كافية لاتخاذ قرار."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <button
                      type="button"
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={() => editor?.addItem()}
                    >
                      إضافة خبر
                    </button>
                  ) : null}
                  <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
                </div>
              }
            />

            {items.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x) => {
                  const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as LegalNewsItem[];
                  const idx = sourceItems.findIndex((it) => it.id === x.id);
                  const index = idx >= 0 ? idx : 0;
                  const titleSelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                  const summarySelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                  return (
                    <article key={x.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={cardImg(x.id, `legal briefing photo, modern, ${x.source}, premium, photoreal`, x.imageUrl)}
                        alt=""
                        className="h-32 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                       />
                       <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
                       {isEditing ? (
                         <div className="absolute left-2 top-2 flex gap-2">
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
                     </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${catBadge[x.category]}`}>{x.category}</span>
                      <div className="text-xs font-bold text-slate-500">{x.date}</div>
                    </div>
                    <InlineEditableText
                      tag="h3"
                      className="mt-3 text-base font-extrabold text-slate-900"
                      value={x.title}
                      disabled={!isEditing}
                      selected={Boolean(titleSelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'title' })}
                      onChange={(next) => editor?.patchItem(index, { title: next })}
                    />
                    <InlineEditableText
                      tag="p"
                      className="mt-1 text-sm leading-relaxed text-slate-600"
                      value={x.summary}
                      disabled={!isEditing}
                      selected={Boolean(summarySelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                      onChange={(next) => editor?.patchItem(index, { summary: next })}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{x.source}</span>
                      {x.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-sky-600/10 px-3 py-1 text-xs font-bold text-sky-700">
                          {t}
                        </span>
                      ))}
                    </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8">
                <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض أخبار أخرى." />
              </div>
            )}

            <div className="mt-6">
              <LoadMore hidden={visible >= filtered.length} onClick={() => setVisible((v) => v + 6)} />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionTitle title="سياق" subtitle="هدفنا أن تكون الأخبار قابلة للتطبيق: ماذا يعني الخبر؟ وكيف ينعكس على العمل؟" />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'موجز سريع', body: 'اقرأ أهم النقاط في ثوانٍ.', icon: '⚡' },
                  { title: 'أثر عملي', body: 'اعرف ما الذي يجب تغييره أو مراجعته.', icon: '🧭' },
                  { title: 'تنبيه ذكي', body: 'لا تفوّت ما يؤثر على سير العمل.', icon: '🔔' },
                ].map((x) => (
                  <div key={x.title} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <div className="text-2xl">{x.icon}</div>
                    <div className="mt-2 text-sm font-extrabold text-slate-900">{x.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{x.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-sky-950 to-slate-950 p-6 text-white shadow-sm">
              <div className="text-sm font-extrabold">اقتراح</div>
              <div className="mt-2 text-sm text-white/80 leading-relaxed">
                هل لديك خبر أو تحديث تريد مشاركته؟ يمكن إضافة نموذج لإرسال مواد للمراجعة والنشر.
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                onClick={() => alert('قريباً: إرسال خبر')}
              >
                أرسل مادة
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Faq
            title="أسئلة شائعة"
            items={[
              { q: 'هل الأخبار رسمية؟', a: 'المحتوى هنا تجريبي. يمكن لاحقاً ربطه بمصادر رسمية وتوثيق الروابط.' },
              { q: 'هل يمكن حفظ الأخبار للمراجعة لاحقاً؟', a: 'يمكن إضافة ميزة “حفظ” أو “قائمة متابعة” لكل مستخدم.' },
              { q: 'هل يوجد إشعار عند خبر مهم؟', a: 'يمكن تفعيل تنبيهات مرتبطة بالأولوية أو الموضوع.' },
            ]}
          />
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-sky-950 to-slate-950 p-7 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-extrabold">ابقَ على اطلاع دون ضجيج</div>
                <div className="mt-1 text-sm text-white/80">سجّل لتصلك أحدث التنبيهات حسب اهتماماتك.</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/register"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  إنشاء حساب
                </a>
                <a
                  href="/login"
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  تسجيل الدخول
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </PageContainer>
  );
}
