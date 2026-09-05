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

type ProgramType = 'ورشة' | 'دورة' | 'برنامج' | 'شهادة';
type Level = 'مبتدئ' | 'متوسط' | 'متقدم';
type Mode = 'حضوري' | 'عن بُعد';
type Domain = 'العدول' | 'القانون' | 'الرقمنة' | 'المسطرة' | 'المهارات';

type Program = {
  id: string;
  type: ProgramType;
  title: string;
  summary: string;
  date: string;
  duration: string;
  provider: string;
  level: Level;
  mode: Mode;
  domain: Domain;
  featured?: boolean;
  imageUrl?: string;
};

type ProgramsPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: Program[];
};

const SEED: Program[] = [
  {
    id: 'pp-1',
    type: 'برنامج',
    title: 'برنامج التميز في الرقمنة القانونية',
    summary: 'مسار تدريبي مكثّف لتبسيط العمل اليومي: من إدخال البيانات إلى الأرشفة والمراجعة.',
    date: '2026-02-12',
    duration: '4 أسابيع',
    provider: 'بوابة المعرفة والتكوين',
    level: 'متوسط',
    mode: 'عن بُعد',
    domain: 'الرقمنة',
    featured: true,
  },
  {
    id: 'pp-2',
    type: 'ورشة',
    title: 'ورشة التحقق الذكي من البيانات والمرفقات',
    summary: 'تعلم قواعد التحقق السريع وتقنيات تقليل الأخطاء قبل الإرسال النهائي.',
    date: '2026-01-28',
    duration: '3 ساعات',
    provider: 'فريق الجودة',
    level: 'مبتدئ',
    mode: 'حضوري',
    domain: 'المهارات',
    featured: true,
  },
  {
    id: 'pp-3',
    type: 'دورة',
    title: 'دورة مبسطة في الصياغة القانونية الدقيقة',
    summary: 'أسلوب كتابة واضح، مع أمثلة جاهزة لتفادي الالتباس وتحسين جودة النص.',
    date: '2026-03-05',
    duration: '5 أيام',
    provider: 'أكاديمية الصياغة',
    level: 'متقدم',
    mode: 'عن بُعد',
    domain: 'القانون',
    featured: true,
  },
  {
    id: 'pp-4',
    type: 'شهادة',
    title: 'شهادة إدارة الأرشفة والتصنيف',
    summary: 'معايير تصنيف الملفات وبناء أرشيف سهل الوصول باستخدام منهجيات عملية.',
    date: '2026-04-10',
    duration: '6 أسابيع',
    provider: 'مركز الأرشفة',
    level: 'متوسط',
    mode: 'حضوري',
    domain: 'الرقمنة',
  },
  {
    id: 'pp-5',
    type: 'ورشة',
    title: 'ورشة فهم المسطرة: من الخطوة الأولى إلى الاعتماد',
    summary: 'توضيح المسار الإجرائي بأمثلة واقعية، مع نقاط تحقق لكل مرحلة.',
    date: '2026-02-20',
    duration: '4 ساعات',
    provider: 'لجنة التكوين',
    level: 'مبتدئ',
    mode: 'حضوري',
    domain: 'المسطرة',
  },
  {
    id: 'pp-6',
    type: 'دورة',
    title: 'دورة الأمن الرقمي وحماية الروابط والمستندات',
    summary: 'أفضل ممارسات حماية البيانات، صلاحيات الوصول، والتحقق من الروابط.',
    date: '2026-01-18',
    duration: '3 أيام',
    provider: 'فريق الأمن',
    level: 'متوسط',
    mode: 'عن بُعد',
    domain: 'الرقمنة',
  },
  {
    id: 'pp-7',
    type: 'برنامج',
    title: 'برنامج مسارك المهني: اكتشف → تعلّم → طبّق',
    summary: 'رحلة قصيرة تساعدك على الانتقال من المعرفة إلى التطبيق عبر تمارين وملفات عمل.',
    date: '2026-02-03',
    duration: '10 أيام',
    provider: 'بوابة المعرفة والتكوين',
    level: 'مبتدئ',
    mode: 'عن بُعد',
    domain: 'المهارات',
    featured: true,
  },
  {
    id: 'pp-8',
    type: 'ورشة',
    title: 'ورشة تحسين جودة ملفات PDF قبل الإرسال',
    summary: 'إعدادات مسح/ضغط مثالية، قص صحيح، وتسميات تسهّل المراجعة.',
    date: '2026-01-30',
    duration: '2 ساعات',
    provider: 'فريق الدعم',
    level: 'مبتدئ',
    mode: 'عن بُعد',
    domain: 'الرقمنة',
  },
  {
    id: 'pp-9',
    type: 'دورة',
    title: 'دورة إدارة الوقت للعمل اليومي (بدون ضغط)',
    summary: 'تقنيات بسيطة لتقسيم المهام، متابعة التنبيهات، والحفاظ على سير العمل.',
    date: '2026-03-20',
    duration: 'أسبوع',
    provider: 'مدرسة الإنتاجية',
    level: 'متوسط',
    mode: 'حضوري',
    domain: 'المهارات',
  },
  {
    id: 'pp-10',
    type: 'برنامج',
    title: 'برنامج الجودة: تقليل الرفض عبر قوائم تحقق',
    summary: 'حوّل الملاحظات المتكررة إلى قائمة تحقق قابلة للتطبيق قبل الإرسال.',
    date: '2026-03-12',
    duration: 'أسبوعين',
    provider: 'فريق الجودة',
    level: 'متوسط',
    mode: 'عن بُعد',
    domain: 'العدول',
  },
  {
    id: 'pp-11',
    type: 'شهادة',
    title: 'شهادة المراجعة والتنقيح: نقاط حساسة وبدائل جاهزة',
    summary: 'معايير مراجعة سريعة للنصوص والبيانات، مع أمثلة شائعة وبدائل أدق.',
    date: '2026-04-02',
    duration: '4 أسابيع',
    provider: 'أكاديمية الصياغة',
    level: 'متقدم',
    mode: 'عن بُعد',
    domain: 'القانون',
  },
  {
    id: 'pp-12',
    type: 'ورشة',
    title: 'ورشة التعامل مع الملاحظات وتصحيح الطلب بسرعة',
    summary: 'خطوات عملية لمعالجة سبب الرفض وإعادة الإرسال دون إعادة العمل من البداية.',
    date: '2026-02-26',
    duration: '3 ساعات',
    provider: 'فريق الدعم',
    level: 'متوسط',
    mode: 'حضوري',
    domain: 'المسطرة',
  },
];

const chip = (value: any, label: string) => ({ value, label });

export function ProfessionalProgramsPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [type, setType] = useState<ProgramType | 'all'>('all');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [mode, setMode] = useState<Mode | 'all'>('all');
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [visible, setVisible] = useState(9);

  const { value: cms } = useCmsJson<ProgramsPageContent>('content_professional_programs', {});
  const editorContent = (editor?.content ?? {}) as ProgramsPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<ProgramsPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as ProgramsPageContent['items'];

  const heroMain = cmsHero.imageMain ?? aiImageUrl('agenda board, training workshop, premium modern, arabic, photoreal, soft light', { seed: 'pp-hero-main', width: 1500, height: 900 });
  const heroSide = cmsHero.imageSide ?? aiImageUrl('conference schedule notebook, minimal desk, premium, photoreal', { seed: 'pp-hero-side', width: 900, height: 520 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED;
    return base.filter((p) => {
      if (type !== 'all' && p.type !== type) return false;
      if (level !== 'all' && p.level !== level) return false;
      if (mode !== 'all' && p.mode !== mode) return false;
      if (domain !== 'all' && p.domain !== domain) return false;
      if (!s) return true;
      return `${p.title} ${p.summary} ${p.provider}`.toLowerCase().includes(s);
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [cmsItems, domain, level, mode, q, type]);

  const featured = useMemo(() => filtered.filter((p) => p.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const programImage = (p: Program, w: number, h: number) =>
    p.imageUrl ?? aiImageUrl(`professional training, ${p.domain}, ${p.type}, premium, photoreal`, { seed: p.id, width: w, height: h });

  const heroTitle = cmsHero.title ?? 'الأنشطة والبرامج المهنية';
  const heroTagline =
    cmsHero.tagline ??
    'نحو خبرة أعمق ومهارات تُترجم إلى إنجاز—مسارات تدريبية مصممة لتسهيل العمل اليومي وتحسين الجودة.';
  const heroKicker = cmsHero.kicker ?? 'Agenda / Program';
  const heroAccent = cmsHero.accent ?? 'from-indigo-950 to-amber-900';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'المعرفة والتكوين' }, { label: 'الأنشطة والبرامج المهنية' }]} />

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
              href="#programs"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              استعرض البرامج
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => alert('قريباً: نموذج اقتراح برنامج')}
            >
              اقترح برنامجًا
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
                placeholder="ابحث بعنوان أو جهة أو كلمة مفتاحية…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips label="النوع" value={type} onChange={setType} options={[chip('ورشة', 'ورشة'), chip('دورة', 'دورة'), chip('برنامج', 'برنامج'), chip('شهادة', 'شهادة')]} />
              <FilterChips
                label="المجال"
                value={domain}
                onChange={setDomain}
                options={[chip('العدول', 'العدول'), chip('القانون', 'القانون'), chip('الرقمنة', 'الرقمنة'), chip('المسطرة', 'المسطرة'), chip('المهارات', 'المهارات')]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips label="المستوى" value={level} onChange={setLevel} options={[chip('مبتدئ', 'مبتدئ'), chip('متوسط', 'متوسط'), chip('متقدم', 'متقدم')]} />
              <FilterChips label="الحضور" value={mode} onChange={setMode} options={[chip('حضوري', 'حضوري'), chip('عن بُعد', 'عن بُعد')]} />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="البرامج القادمة" subtitle="مختارات تمثل أفضل بداية: تعلم سريع + أثر عملي + تطبيق مباشر.">
            {featured.map((p) => (
              <div key={p.id} className="snap-start min-w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative">
                  <img src={programImage(p, 900, 540)} alt="" className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900">
                    {p.type}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-bold text-slate-500">{p.date}</div>
                    <div className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-extrabold text-indigo-700">{p.domain}</div>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-slate-900">{p.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{p.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold">{p.duration}</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold">{p.level}</span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold">{p.mode}</span>
                  </div>
                </div>
              </div>
            ))}
          </FeaturedRail>
        </Reveal>

        <Reveal className="space-y-4">
          <SectionTitle
            title="البرامج"
            subtitle="تصفح وفق احتياجك: مجال، مستوى، ونمط حضور—مع تصميم واضح وسهل القراءة."
            action={
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => editor?.addItem()}
                  >
                    إضافة برنامج
                  </button>
                ) : null}
                <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
              </div>
            }
          />

          {items.length ? (
            <div id="programs" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => {
                const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as Program[];
                const idx = sourceItems.findIndex((x) => x.id === p.id);
                const index = idx >= 0 ? idx : 0;
                const titleSelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                const summarySelected =
                  editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                return (
                  <article key={p.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative">
                    <img src={programImage(p, 900, 560)} alt="" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
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
                    <div className="absolute bottom-3 right-3 rounded-2xl bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-900">
                      {p.date}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-extrabold text-indigo-700">{p.type}</span>
                      <span className="rounded-full bg-amber-600/10 px-3 py-1 text-xs font-extrabold text-amber-800">{p.domain}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{p.level}</span>
                    </div>
                    <InlineEditableText
                      tag="h3"
                      className="mt-3 text-lg font-extrabold text-slate-900"
                      value={p.title}
                      disabled={!isEditing}
                      selected={Boolean(titleSelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'title' })}
                      onChange={(next) => editor?.patchItem(index, { title: next })}
                    />
                    <InlineEditableText
                      tag="p"
                      className="mt-2 text-sm leading-7 text-slate-600"
                      value={p.summary}
                      disabled={!isEditing}
                      selected={Boolean(summarySelected)}
                      onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                      onChange={(next) => editor?.patchItem(index, { summary: next })}
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold text-slate-700">{p.duration}</span>
                        <span className="rounded-xl bg-slate-100 px-3 py-1 font-bold text-slate-700">{p.mode}</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={() => alert('قريباً: صفحة تفاصيل/تسجيل')}
                      >
                        اعرف أكثر
                      </button>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      الجهة/المدرب: <span className="font-bold text-slate-700">{p.provider}</span>
                    </div>
                  </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض برامج أخرى." />
          )}

          <LoadMore hidden={visible >= filtered.length} onClick={() => setVisible((v) => v + 6)} />
        </Reveal>

        <Reveal>
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionTitle title="مسارك المهني" subtitle="رحلة بسيطة بثلاث خطوات تساعدك على تحويل المعرفة إلى تطبيق." />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'اكتشف', body: 'اختر المسار المناسب بناءً على المجال والمستوى.', icon: '🔎' },
                  { title: 'تعلّم', body: 'تفاعل مع محتوى عملي مختصر يساعدك على الإنجاز.', icon: '📚' },
                  { title: 'طبّق', body: 'حوّل التعلم إلى نتائج عبر قوائم تحقق وأمثلة جاهزة.', icon: '✅' },
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
              <div className="text-sm font-extrabold">اقتراحات</div>
              <div className="mt-2 text-sm text-white/80 leading-relaxed">
                قريباً: تخصيص المسارات حسب الدور، وإضافة سجلّ تقدّم، وشهادات رقمية قابلة للتحقق.
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                onClick={() => alert('قريباً: تخصيص المسار')}
              >
                خصّص مسارك
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Faq
            title="أسئلة شائعة"
            items={[
              { q: 'هل يمكن التسجيل مباشرة؟', a: 'حالياً هذه صفحات عرض. يمكن ربطها لاحقاً بتسجيل فعلي حسب الحساب والصلاحيات.' },
              { q: 'هل توجد برامج حضورية وعن بُعد؟', a: 'نعم—يمكن التصفية حسب نمط الحضور، وتوفير روابط/تفاصيل حسب كل برنامج.' },
              { q: 'هل المحتوى معتمد؟', a: 'يمكن إضافة اعتماد رسمي وشهادات تحقق رقمية ضمن المرحلة القادمة.' },
            ]}
          />
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-indigo-950 to-slate-950 p-7 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-extrabold">ابدأ رحلتك اليوم</div>
                <div className="mt-1 text-sm text-white/80">سجّل لتلقي اقتراحات برامج تناسب اهتماماتك.</div>
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
