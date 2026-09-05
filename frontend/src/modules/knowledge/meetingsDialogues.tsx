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

type Kind = 'اجتماع' | 'جلسة حوار' | 'ندوة';
type Topic = 'العدول' | 'الرقمنة' | 'الجودة' | 'الممارسة' | 'التشريع';

type Dialogue = {
  id: string;
  kind: Kind;
  title: string;
  summary: string;
  date: string;
  topic: Topic;
  speakers: string[];
  highlights: string[];
  featured?: boolean;
  hasRecording?: boolean;
  imageUrl?: string;
  recordingUrl?: string;
};

type MeetingsPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: Dialogue[];
};

const SEED: Dialogue[] = [
  {
    id: 'md-1',
    kind: 'جلسة حوار',
    title: 'حوار: كيف نرفع الجودة دون تعقيد؟',
    summary: 'نقاش عملي حول قوائم التحقق، أسباب الرفض الشائعة، وكيف نحول الملاحظات إلى خطوات.',
    date: '2026-01-22',
    topic: 'الجودة',
    speakers: ['أ. سارة (الجودة)', 'م. ياسين (الواجهة)'],
    highlights: ['توحيد التسمية يقلل وقت المراجعة', 'قائمة تحقق قصيرة قبل الإرسال', 'الصور الواضحة تُسرّع الاعتماد'],
    featured: true,
    hasRecording: true,
  },
  {
    id: 'md-2',
    kind: 'اجتماع',
    title: 'اجتماع: خطة تحسين تجربة المستخدم (RTL)',
    summary: 'تحسين القراءة على الهاتف، تدرج بصري أفضل، وتقليل خطوات الوصول للمعلومة.',
    date: '2026-02-03',
    topic: 'الرقمنة',
    speakers: ['فريق المنتج', 'فريق الواجهة'],
    highlights: ['تجميع المرشحات بذكاء', 'تباين أعلى للنصوص', 'تقليل الازدحام البصري'],
    featured: true,
  },
  {
    id: 'md-3',
    kind: 'ندوة',
    title: 'ندوة: تبسيط المسطرة عبر نماذج موحدة',
    summary: 'كيف تساعد النماذج والقوالب في تقليل التباين، وتسريع المراجعة، وتحسين الدقة.',
    date: '2026-01-30',
    topic: 'الممارسة',
    speakers: ['أ. محمد (التكوين)', 'أ. ندى (الدعم)'],
    highlights: ['قوالب جاهزة للصياغات', 'نماذج موحدة للحقول', 'إرشادات مختصرة داخل الواجهة'],
    featured: true,
    hasRecording: true,
  },
  {
    id: 'md-4',
    kind: 'جلسة حوار',
    title: 'جلسة: الأثر التشريعي على سير العمل',
    summary: 'قراءة مبسطة للتغييرات وكيفية ترجمتها لإجراءات واضحة داخل النظام.',
    date: '2026-02-12',
    topic: 'التشريع',
    speakers: ['أ. ليلى (القانون)', 'فريق الجودة'],
    highlights: ['تصنيف الأثر (مرتفع/متوسط/منخفض)', 'تنبيه مبكر للتغييرات', 'مرجعيات وروابط رسمية'],
    hasRecording: false,
  },
  {
    id: 'md-5',
    kind: 'اجتماع',
    title: 'اجتماع: ضبط صلاحيات الوصول وأمن الروابط',
    summary: 'أفضل الممارسات لحماية البيانات، التحقق من الروابط، ومراجعة الصلاحيات دورياً.',
    date: '2026-01-18',
    topic: 'الرقمنة',
    speakers: ['فريق الأمن'],
    highlights: ['تحديث دوري للصلاحيات', 'تحقق من الروابط الخارجية', 'مراجعة السجلات'],
  },
  {
    id: 'md-6',
    kind: 'ندوة',
    title: 'ندوة: قياس الأداء بمؤشرات بسيطة',
    summary: 'مؤشرات تساعد على فهم التحسن: زمن المعالجة، نسبة الرفض، وأبرز الأسباب.',
    date: '2026-03-02',
    topic: 'الجودة',
    speakers: ['قسم الإحصاء', 'فريق الجودة'],
    highlights: ['لوحة مؤشرات أسبوعية', 'تحليل أسباب الرفض', 'أهداف قابلة للقياس'],
    hasRecording: true,
  },
  {
    id: 'md-7',
    kind: 'جلسة حوار',
    title: 'حوار: من المعرفة إلى التطبيق',
    summary: 'كيف نختصر التعلم عبر محتوى مختصر، ثم نترجمه لقوائم تحقق وأمثلة واقعية.',
    date: '2026-02-26',
    topic: 'الممارسة',
    speakers: ['فريق التكوين'],
    highlights: ['ملخصات مركزة', 'تمارين تطبيقية', 'مكتبة قوالب'],
  },
  {
    id: 'md-8',
    kind: 'اجتماع',
    title: 'اجتماع: تنظيم الأرشيف الرقمي',
    summary: 'تصنيف حسب السنة والموضوع، كلمات مفتاحية، وتسهيل الوصول للوثائق.',
    date: '2026-01-25',
    topic: 'العدول',
    speakers: ['مركز الأرشفة'],
    highlights: ['توحيد التصنيف', 'بحث بالمرجع', 'تجربة قائمة/شبكة'],
  },
  {
    id: 'md-9',
    kind: 'ندوة',
    title: 'ندوة: تحسين جودة المرفقات بالحد الأدنى',
    summary: 'كيف تحسن الصور وPDF بسرعة: قص، تباين، وضوح، وتسميات.',
    date: '2026-02-08',
    topic: 'الرقمنة',
    speakers: ['فريق الدعم'],
    highlights: ['إعدادات مسح مقترحة', 'ضغط بدون فقد كبير', 'تسميات تساعد المراجعة'],
    hasRecording: true,
  },
  {
    id: 'md-10',
    kind: 'جلسة حوار',
    title: 'جلسة: تجربة المستخدم للأدوار المختلفة',
    summary: 'فروق احتياج المستخدم بين الأدوار، وكيف نصمم واجهة واضحة للجميع.',
    date: '2026-03-06',
    topic: 'العدول',
    speakers: ['فريق المنتج', 'مستخدمون تجريبيون'],
    highlights: ['واجهة أبسط', 'اختصارات واضحة', 'محتوى مناسب للسياق'],
  },
  {
    id: 'md-11',
    kind: 'اجتماع',
    title: 'اجتماع: توثيق وإعادة استخدام المعرفة',
    summary: 'تحويل المخرجات إلى دلائل قصيرة، قوالب، وصفحات مرجعية.',
    date: '2026-03-12',
    topic: 'الجودة',
    speakers: ['بوابة المعرفة والتكوين'],
    highlights: ['دلائل قصيرة', 'قوالب قابلة للنسخ', 'تنبيهات ذكية'],
  },
  {
    id: 'md-12',
    kind: 'ندوة',
    title: 'ندوة: قراءة مبسطة للتغييرات',
    summary: 'كيف نقرأ التغيير التشريعي ونحوّله إلى خطوات واضحة داخل المنظومة.',
    date: '2026-03-14',
    topic: 'التشريع',
    speakers: ['فريق القانون'],
    highlights: ['ملخص + أثر', 'روابط مرجعية', 'تنبيه مبكر'],
  },
];

const chip = (value: any, label: string) => ({ value, label });

export function MeetingsDialoguesPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [hasRecording, setHasRecording] = useState<'all' | 'yes'>('all');
  const [visible, setVisible] = useState(9);

  const { value: cms } = useCmsJson<MeetingsPageContent>('content_meetings_dialogues', {});
  const editorContent = (editor?.content ?? {}) as MeetingsPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<MeetingsPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as MeetingsPageContent['items'];

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('modern roundtable meeting room, warm light, premium, photoreal', { seed: 'md-hero-main', width: 1500, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('speech bubble shapes abstract background, soft, premium, photoreal', { seed: 'md-hero-side', width: 900, height: 520 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED;
    return base.filter((x) => {
      if (kind !== 'all' && x.kind !== kind) return false;
      if (topic !== 'all' && x.topic !== topic) return false;
      if (hasRecording === 'yes' && !x.hasRecording) return false;
      if (!s) return true;
      return `${x.title} ${x.summary} ${x.speakers.join(' ')} ${x.highlights.join(' ')}`.toLowerCase().includes(s);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [cmsItems, hasRecording, kind, q, topic]);

  const featured = useMemo(() => filtered.filter((x) => x.featured).slice(0, 8), [filtered]);
  const quote = useMemo(() => {
    const item = SEED.find((x) => x.hasRecording) ?? SEED[0];
    return {
      quote: 'حوار يصنع وضوحًا… وقرارات تُترجم إلى أثر.',
      speaker: item.speakers[0] ?? '—',
      session: item.title,
    };
  }, []);

  const items = filtered.slice(0, visible);

  const sessionImage = (x: Dialogue, w: number, h: number) =>
    x.imageUrl ?? aiImageUrl(`conference discussion, ${x.topic}, premium, photoreal`, { seed: x.id, width: w, height: h });

  const heroTitle = cmsHero.title ?? 'الاجتماعات والحوارات';
  const heroTagline = cmsHero.tagline ?? 'حوار يصنع وضوحًا… وقرارات تُترجم إلى أثر.';
  const heroKicker = cmsHero.kicker ?? 'Conversation / Dialogue';
  const heroAccent = cmsHero.accent ?? 'from-emerald-950 to-slate-950';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'المعرفة والتكوين' }, { label: 'الاجتماعات والحوارات' }]} />

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
              href="#sessions"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              استعرض الحوارات
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => setHasRecording('yes')}
            >
              مشاهدة تسجيلات
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
                placeholder="ابحث بعنوان أو متحدث أو موضوع…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips label="النوع" value={kind} onChange={setKind} options={[chip('اجتماع', 'اجتماع'), chip('جلسة حوار', 'جلسة حوار'), chip('ندوة', 'ندوة')]} />
              <FilterChips label="التسجيل" value={hasRecording} onChange={setHasRecording} options={[chip('yes', 'يوجد تسجيل')]} />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips label="الموضوع" value={topic} onChange={setTopic} options={[chip('العدول', 'العدول'), chip('الرقمنة', 'الرقمنة'), chip('الجودة', 'الجودة'), chip('الممارسة', 'الممارسة'), chip('التشريع', 'التشريع')]} />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="أبرز المخرجات" subtitle="اختيارات تمنحك الصورة بسرعة: موضوع، ملخص، ونقاط تنفيذ.">
            {featured.map((x) => (
              <div key={x.id} className="snap-start min-w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative">
                  <img src={sessionImage(x, 900, 540)} alt="" className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900">{x.kind}</div>
                  {x.hasRecording ? (
                    <div className="absolute bottom-3 left-3 rounded-2xl bg-white/15 px-3 py-2 text-xs font-extrabold text-white backdrop-blur">
                      يوجد تسجيل
                    </div>
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-extrabold text-emerald-700">{x.topic}</span>
                    <span className="text-xs font-bold text-slate-500">{x.date}</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-slate-900">{x.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{x.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {x.highlights.slice(0, 2).map((h) => (
                      <span key={h} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </FeaturedRail>
        </Reveal>

        <Reveal>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle title="اقتباس الأسبوع" subtitle="جرعة إلهام صغيرة تساعد على التركيز على الأثر." />
            <div className="mt-4 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-900 p-6 text-white">
              <div className="text-2xl font-extrabold leading-relaxed">"{quote.quote}"</div>
              <div className="mt-3 text-sm text-white/80">
                — {quote.speaker} • <span className="font-bold">{quote.session}</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="space-y-4">
          <SectionTitle
            title="الجلسات"
            subtitle="ملخص + أبرز النقاط + إمكانية مشاهدة التسجيل عند توفره."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => editor?.addItem()}
                  >
                    إضافة جلسة
                  </button>
                ) : null}
                <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
              </div>
            }
          />

          {items.length ? (
            <div id="sessions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((x) => {
                const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as Dialogue[];
                const idx = sourceItems.findIndex((it) => it.id === x.id);
                const index = idx >= 0 ? idx : 0;
                const titleSelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                const summarySelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                return (
                  <article key={x.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative">
                    <img src={sessionImage(x, 900, 560)} alt="" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
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
                    <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900">{x.kind}</div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-extrabold text-emerald-700">{x.topic}</span>
                      <div className="text-xs font-bold text-slate-500">{x.date}</div>
                    </div>
                    <InlineEditableText
                      tag="h3"
                      className="mt-3 text-lg font-extrabold text-slate-900"
                      value={x.title}
                      disabled={!isEditing}
                      selected={Boolean(titleSelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'title' })}
                      onChange={(next) => editor?.patchItem(index, { title: next })}
                    />
                    <InlineEditableText
                      tag="p"
                      className="mt-2 text-sm leading-7 text-slate-600"
                      value={x.summary}
                      disabled={!isEditing}
                      selected={Boolean(summarySelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                      onChange={(next) => editor?.patchItem(index, { summary: next })}
                    />
                    <div className="mt-3 text-xs text-slate-600">
                      <div className="font-bold text-slate-700">المشاركون</div>
                      <div className="mt-1">{x.speakers.join('، ')}</div>
                    </div>
                    <div className="mt-4">
                      <div className="text-xs font-extrabold text-slate-700">أبرز النقاط</div>
                      <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        {x.highlights.slice(0, 3).map((h) => (
                          <li key={h} className="flex items-start gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span className="leading-7">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => alert('قريباً: قراءة الملخص')}
                      >
                        اقرأ الملخص
                      </button>
                      {x.hasRecording ? (
                        <button
                          type="button"
                          className="rounded-2xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          onClick={() => {
                            if (x.recordingUrl) window.open(x.recordingUrl, '_blank', 'noopener,noreferrer');
                            else alert('قريباً: مشاهدة التسجيل');
                          }}
                        >
                          شاهد التسجيل
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">لا يوجد تسجيل</span>
                      )}
                    </div>
                  </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض جلسات أخرى." />
          )}

          <LoadMore hidden={visible >= filtered.length} onClick={() => setVisible((v) => v + 6)} />
        </Reveal>

        <Reveal>
          <Faq
            items={[
              { q: 'هل يمكن إضافة المتحدثين كمرشح؟', a: 'نعم—يمكن إضافة قائمة متحدثين مع بحث تلقائي لاحقاً.' },
              { q: 'هل يمكن نشر محاضر كاملة؟', a: 'يمكن إضافة صفحات تفصيلية لكل جلسة وربطها بملفات/روابط.' },
              { q: 'هل يمكن الاشتراك لتلقي تنبيه عند نشر جلسة جديدة؟', a: 'يمكن ربطها بنافذة التنبيهات وتخصيص الاهتمامات.' },
            ]}
          />
        </Reveal>
      </div>
    </PageContainer>
  );
}
