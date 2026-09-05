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

type ChangeType = 'تعديل' | 'إضافة' | 'نسخ/إلغاء' | 'تفسير';
type Impact = 'مرتفع' | 'متوسط' | 'منخفض';

type LegislativeChange = {
  id: string;
  type: ChangeType;
  title: string;
  summary: string;
  date: string;
  impact: Impact;
  affected: string[];
  featured?: boolean;
  imageUrl?: string;
  linkUrl?: string;
};

type LegislativeChangesPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: LegislativeChange[];
};

const SEED: LegislativeChange[] = [
  {
    id: 'lc-1',
    type: 'تعديل',
    title: 'تعديل إجرائي يرفع جودة التحقق من البيانات',
    summary: 'تحديث يهدف لتقليل الأخطاء وتحسين التطابق بين البيانات والمرفقات.',
    date: '2026-01-12',
    impact: 'مرتفع',
    affected: ['التحقق', 'المرفقات', 'المراجعة'],
    featured: true,
  },
  {
    id: 'lc-2',
    type: 'تفسير',
    title: 'تفسير مبسط لمفهوم “المطابقة” في الإدخال',
    summary: 'شرح عملي لما يعنيه التطابق وكيف ينعكس على قبول الطلب.',
    date: '2026-01-19',
    impact: 'متوسط',
    affected: ['البيانات', 'الجودة'],
    featured: true,
  },
  {
    id: 'lc-3',
    type: 'إضافة',
    title: 'إضافة مرجعيات واضحة للتسمية والأرشفة',
    summary: 'معايير موحدة لتسمية الملفات وتصنيفها حسب السنة والموضوع.',
    date: '2026-01-26',
    impact: 'متوسط',
    affected: ['الأرشفة', 'الملفات'],
    featured: true,
  },
  {
    id: 'lc-4',
    type: 'نسخ/إلغاء',
    title: 'إلغاء صياغات قديمة واستبدالها بصياغة أدق',
    summary: 'تنقيح النصوص لتقليل الالتباس وتوحيد المصطلحات.',
    date: '2026-02-03',
    impact: 'منخفض',
    affected: ['الصياغة', 'المصطلحات'],
  },
  {
    id: 'lc-5',
    type: 'تعديل',
    title: 'تعديل مسار المراجعة لتسريع معالجة الطلبات',
    summary: 'تحسين توزيع الخطوات بين التحقق الأولي والمراجعة النهائية.',
    date: '2026-02-10',
    impact: 'مرتفع',
    affected: ['المراجعة', 'السرعة', 'التدفق'],
  },
  {
    id: 'lc-6',
    type: 'تفسير',
    title: 'تفسير: الفرق بين “المتطلب” و“الاختيار” في النماذج',
    summary: 'متى يكون الحقل إلزامياً، وكيف تتفادى الأخطاء عند تركه فارغاً.',
    date: '2026-02-15',
    impact: 'متوسط',
    affected: ['النماذج', 'الحقول'],
  },
  {
    id: 'lc-7',
    type: 'إضافة',
    title: 'إضافة مؤشرات أثر للتعديلات الجديدة',
    summary: 'تصنيف واضح للأثر يساعد على معرفة ما يجب تطبيقه فوراً.',
    date: '2026-02-20',
    impact: 'متوسط',
    affected: ['الأثر', 'التحديثات'],
  },
  {
    id: 'lc-8',
    type: 'نسخ/إلغاء',
    title: 'إلغاء تكرارات في إجراءات إدخال البيانات',
    summary: 'تقليل الحقول المتكررة وتحسين الوضوح لتجربة استخدام أسرع.',
    date: '2026-02-25',
    impact: 'منخفض',
    affected: ['الواجهة', 'النماذج'],
  },
  {
    id: 'lc-9',
    type: 'تعديل',
    title: 'تعديل تنسيقات العرض على الهاتف',
    summary: 'تحسينات على القراءة العربية، الهامش، والانتقالات.',
    date: '2026-03-02',
    impact: 'منخفض',
    affected: ['RTL', 'الاستجابة'],
  },
  {
    id: 'lc-10',
    type: 'تفسير',
    title: 'تفسير: “سبب الرفض” وكيفية معالجته بسرعة',
    summary: 'خطوات عملية للتعامل مع الملاحظات وتحديث الطلب دون إعادة العمل من البداية.',
    date: '2026-03-06',
    impact: 'مرتفع',
    affected: ['ملاحظات', 'سرعة', 'جودة'],
  },
  {
    id: 'lc-11',
    type: 'إضافة',
    title: 'إضافة قوالب جاهزة للصياغات الأكثر استخداماً',
    summary: 'قوالب قصيرة تُسرّع الكتابة وتقلل الأخطاء.',
    date: '2026-03-10',
    impact: 'متوسط',
    affected: ['قوالب', 'صياغة'],
  },
  {
    id: 'lc-12',
    type: 'تعديل',
    title: 'تعديل قواعد التحقق النهائي قبل الإرسال',
    summary: 'تحديثات على قائمة التحقق النهائية لتقليل الرفض.',
    date: '2026-03-14',
    impact: 'مرتفع',
    affected: ['تحقق', 'إرسال'],
  },
];

const chip = (value: any, label: string) => ({ value, label });

const typeBadge: Record<ChangeType, string> = {
  تعديل: 'bg-amber-600/10 text-amber-800',
  إضافة: 'bg-emerald-600/10 text-emerald-700',
  'نسخ/إلغاء': 'bg-rose-600/10 text-rose-700',
  تفسير: 'bg-indigo-600/10 text-indigo-700',
};

const impactDot: Record<Impact, string> = {
  مرتفع: 'bg-rose-500',
  متوسط: 'bg-amber-500',
  منخفض: 'bg-emerald-500',
};

export function LegislativeChangesPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [type, setType] = useState<ChangeType | 'all'>('all');
  const [impact, setImpact] = useState<Impact | 'all'>('all');
  const [visible, setVisible] = useState(9);

  const { value: cms } = useCmsJson<LegislativeChangesPageContent>('content_legislative_changes', {});
  const editorContent = (editor?.content ?? {}) as LegislativeChangesPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<LegislativeChangesPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as LegislativeChangesPageContent['items'];

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('modern law library interior, warm light, premium, photoreal', { seed: 'legislative-changes-hero', width: 1400, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('close-up legal document with highlights, premium, photoreal', { seed: 'legislative-changes-side', width: 900, height: 520 });
  const cardImg = (id: string, prompt: string, imageUrl?: string) => imageUrl ?? aiImageUrl(prompt, { seed: id, width: 900, height: 600 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED;
    return base.filter((x) => {
      if (type !== 'all' && x.type !== type) return false;
      if (impact !== 'all' && x.impact !== impact) return false;
      if (!s) return true;
      return `${x.title} ${x.summary} ${x.affected.join(' ')}`.toLowerCase().includes(s);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [cmsItems, impact, q, type]);

  const featured = useMemo(() => filtered.filter((x) => x.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const heroTitle = cmsHero.title ?? 'التعديلات التشريعية';
  const heroTagline = cmsHero.tagline ?? 'تعرف على التغييرات بأسلوب واضح: ماذا تغيّر؟ ما الأثر؟ وكيف تطبّقه بسرعة؟';
  const heroAccent = cmsHero.accent ?? 'from-slate-950 to-amber-950';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'الإعلام والمستجدات' }, { label: 'التعديلات التشريعية' }]} />

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
              href="#changes"
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              استعرض التعديلات
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => setImpact('مرتفع')}
            >
              أعلى أثر
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
                placeholder="ابحث في التعديلات…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips label="النوع" value={type} onChange={setType} options={[chip('تعديل', 'تعديل'), chip('إضافة', 'إضافة'), chip('نسخ/إلغاء', 'نسخ/إلغاء'), chip('تفسير', 'تفسير')]} />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips label="الأثر" value={impact} onChange={setImpact} options={[chip('مرتفع', 'مرتفع'), chip('متوسط', 'متوسط'), chip('منخفض', 'منخفض')]} />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="تغييرات محورية" subtitle="اختيارات ذات أثر مباشر على سير العمل.">
            {featured.map((x) => {
              const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as LegislativeChange[];
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
                    src={cardImg(x.id, `legal document close-up, ${x.type}, premium, photoreal`, x.imageUrl)}
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
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeBadge[x.type]}`}>{x.type}</span>
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${impactDot[x.impact]}`} />
                    {x.impact}
                  </span>
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
                  <div className="text-xs font-bold text-slate-500">{x.date}</div>
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onClick={() => {
                      if (x.linkUrl) window.open(x.linkUrl, '_blank', 'noopener,noreferrer');
                      else alert('قريباً: تفاصيل التعديل');
                    }}
                  >
                    التفاصيل
                  </button>
                </div>
                </div>
              );
            })}
          </FeaturedRail>
        </Reveal>

        <Reveal>
          <div id="changes" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="سجل التعديلات"
              subtitle="عرض منظم يساعد على فهم التغيير + أثره + المجالات المتأثرة."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <button
                      type="button"
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={() => editor?.addItem()}
                    >
                      إضافة تعديل
                    </button>
                  ) : null}
                  <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
                </div>
              }
            />

            {items.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x) => {
                  const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as LegislativeChange[];
                  const idx = sourceItems.findIndex((it) => it.id === x.id);
                  const index = idx >= 0 ? idx : 0;
                  const titleSelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                  const summarySelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                  return (
                    <div key={x.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={cardImg(x.id, `legislation change visual, ${x.impact} impact, premium, photoreal`, x.imageUrl)}
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
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeBadge[x.type]}`}>{x.type}</span>
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
                      className="mt-1 text-sm leading-relaxed text-slate-600"
                      value={x.summary}
                      disabled={!isEditing}
                      selected={Boolean(summarySelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                      onChange={(next) => editor?.patchItem(index, { summary: next })}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${impactDot[x.impact]}`} />
                        {x.impact}
                      </span>
                      {x.affected.slice(0, 3).map((a) => (
                        <span key={a} className="rounded-full bg-amber-600/10 px-3 py-1 text-xs font-bold text-amber-800">
                          {a}
                        </span>
                      ))}
                    </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8">
                <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض تعديلات أخرى." />
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
              <SectionTitle title="كيف نقرأ التعديل؟" subtitle="طريقة بسيطة لتطبيق التغيير دون ارتباك." />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'افهم', body: 'اقرأ الملخص لمعرفة ما تغيّر.', icon: '🧠' },
                  { title: 'قيّم الأثر', body: 'حدّد إن كان مرتفعاً أم متوسطاً أم منخفضاً.', icon: '📌' },
                  { title: 'طبّق', body: 'ركّز على المجالات المتأثرة أولاً.', icon: '🚀' },
                ].map((x) => (
                  <div key={x.title} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <div className="text-2xl">{x.icon}</div>
                    <div className="mt-2 text-sm font-extrabold text-slate-900">{x.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{x.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-amber-950 to-slate-950 p-6 text-white shadow-sm">
              <div className="text-sm font-extrabold">تنبيه</div>
              <div className="mt-2 text-sm text-white/80 leading-relaxed">
                هذه صفحة عرض بمحتوى تجريبي. لاحقاً يمكن ربطها بتحديثات رسمية وروابط للنصوص المرجعية.
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                onClick={() => alert('قريباً: الاشتراك في التنبيهات')}
              >
                الاشتراك في التنبيهات
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Faq
            title="أسئلة شائعة"
            items={[
              { q: 'هل توجد روابط رسمية للتعديلات؟', a: 'يمكن إضافتها لاحقاً وربطها بمصادر رسمية (نشرة/بوابة تشريعية).' },
              { q: 'كيف أحدد الأولويات؟', a: 'ابدأ بتصنيف “مرتفع” ثم “متوسط”. التصميم يبرز الأثر بشكل واضح.' },
              { q: 'هل يمكن تلقي إشعار عند تغيير جديد؟', a: 'نعم—يمكن ربطها بنافذة التنبيهات وتخصيص الاهتمامات.' },
            ]}
          />
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-amber-950 to-slate-950 p-7 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-extrabold">اجعل التغييرات سهلة التطبيق</div>
                <div className="mt-1 text-sm text-white/80">سجّل لتخصيص اهتماماتك وتلقي ما يهمك فقط.</div>
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
