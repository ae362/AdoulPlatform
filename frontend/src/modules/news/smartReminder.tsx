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

type ReminderType = 'قانوني' | 'إجرائي' | 'مواعيد' | 'تحديثات';
type Priority = 'عالي' | 'متوسط' | 'منخفض';

type Reminder = {
  id: string;
  type: ReminderType;
  title: string;
  summary: string;
  due: string;
  priority: Priority;
  tags: string[];
  featured?: boolean;
  imageUrl?: string;
};

type RemindersPageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: Reminder[];
};

const SEED: Reminder[] = [
  {
    id: 'sr-1',
    type: 'مواعيد',
    title: 'تذكير: إيداع الوثائق قبل نهاية الأسبوع',
    summary: 'سلسلة تنبيهات تساعدك على ضبط المواعيد المرتبطة بالإيداع والمتابعة دون فقدان أي خطوة.',
    due: 'خلال 48 ساعة',
    priority: 'عالي',
    tags: ['إيداع', 'متابعة', 'تنظيم'],
    featured: true,
  },
  {
    id: 'sr-2',
    type: 'قانوني',
    title: 'تنبيه: مستجدات في متطلبات التحقق من البيانات',
    summary: 'ملخص قصير وواضح لما تغيّر، مع نقاط تطبيقية لتفادي الأخطاء الأكثر شيوعاً.',
    due: 'هذا الأسبوع',
    priority: 'متوسط',
    tags: ['تحقق', 'امتثال', 'جودة'],
    featured: true,
  },
  {
    id: 'sr-3',
    type: 'إجرائي',
    title: 'قائمة تحقق ذكية قبل إرسال الطلب',
    summary: 'تلميحات قبل الإرسال تُقلّل الرفض وتُسّرع المعالجة: أسماء، أرقام مرجعية، ومرفقات.',
    due: 'اليوم',
    priority: 'عالي',
    tags: ['قائمة تحقق', 'مرفقات', 'سرعة'],
    featured: true,
  },
  {
    id: 'sr-4',
    type: 'تحديثات',
    title: 'موجز النظام: تحسينات على مسار الإجراءات',
    summary: 'نُسخة موجزة من التحديثات التي تؤثر على سير العمل، مع ما الذي يجب عليك فعله الآن.',
    due: 'هذا الشهر',
    priority: 'منخفض',
    tags: ['تحديث', 'سير العمل'],
  },
  {
    id: 'sr-5',
    type: 'قانوني',
    title: 'تنبيه: صياغات شائعة تحتاج مراجعة',
    summary: 'أمثلة لِصياغات متكررة قد تسبب التباساً، مع بدائل مُقترحة بصياغة أدق.',
    due: 'خلال 7 أيام',
    priority: 'متوسط',
    tags: ['صياغة', 'دقة', 'مراجعة'],
  },
  {
    id: 'sr-6',
    type: 'مواعيد',
    title: 'تذكير: أرشفة الملفات القديمة بشكل منتظم',
    summary: 'حافظ على أرشيفك مرتباً: تصنيف، تسميات، ومجلدات بحسب السنة والموضوع.',
    due: 'خلال 14 يوم',
    priority: 'منخفض',
    tags: ['أرشفة', 'تنظيم'],
  },
  {
    id: 'sr-7',
    type: 'إجرائي',
    title: 'خطوة بخطوة: إنشاء طلب جديد في أقل من دقيقة',
    summary: 'مسار سريع: إدخال البيانات الأساسية، رفع المرفقات، ثم التحقق النهائي.',
    due: 'أي وقت',
    priority: 'منخفض',
    tags: ['تعليمات', 'سرعة', 'مبتدئ'],
  },
  {
    id: 'sr-8',
    type: 'تحديثات',
    title: 'مستوى جديد للإنذارات حسب الأثر',
    summary: 'يمكنك الآن ضبط الأولويات: عالي للأثر المباشر، متوسط للمراجعات، منخفض للتذكيرات العامة.',
    due: 'متاح الآن',
    priority: 'منخفض',
    tags: ['إعدادات', 'تخصيص'],
  },
  {
    id: 'sr-9',
    type: 'قانوني',
    title: 'مختصر: أسئلة متكررة حول الإجرائية والآجال',
    summary: 'ملخص سريع بصياغة واضحة، يساعد على اتخاذ قرار صحيح دون إطالة.',
    due: 'هذا الأسبوع',
    priority: 'متوسط',
    tags: ['FAQ', 'آجال', 'إجراءات'],
  },
  {
    id: 'sr-10',
    type: 'مواعيد',
    title: 'تذكير: مراجعة صلاحيات الوصول للحساب',
    summary: 'تأكد من تحديث الصلاحيات ومنح الوصول فقط للجهات المخولة.',
    due: 'كل شهر',
    priority: 'منخفض',
    tags: ['أمن', 'صلاحيات'],
  },
  {
    id: 'sr-11',
    type: 'إجرائي',
    title: 'تنبيه: تحقق من صور المرفقات قبل الإرسال',
    summary: 'وضوح الصورة والقص الصحيح يقلل الملاحظات ويُسرّع الاعتماد.',
    due: 'اليوم',
    priority: 'عالي',
    tags: ['مرفقات', 'جودة'],
  },
  {
    id: 'sr-12',
    type: 'تحديثات',
    title: 'موجز أسبوعي: أبرز ما تغيّر',
    summary: 'تحديثات خفيفة بلمسة مفيدة: تحسينات تجربة الاستخدام وتصحيحات دقيقة.',
    due: 'كل أسبوع',
    priority: 'منخفض',
    tags: ['موجز', 'تحديثات'],
  },
];

const chip = (value: any, label: string) => ({ value, label });

const typeStyle: Record<ReminderType, { badge: string; glow: string }> = {
  قانوني: { badge: 'bg-indigo-600/10 text-indigo-700', glow: 'from-indigo-400/15 to-slate-900/0' },
  إجرائي: { badge: 'bg-emerald-600/10 text-emerald-700', glow: 'from-emerald-400/15 to-slate-900/0' },
  مواعيد: { badge: 'bg-amber-500/15 text-amber-800', glow: 'from-amber-300/20 to-slate-900/0' },
  تحديثات: { badge: 'bg-slate-600/10 text-slate-700', glow: 'from-slate-400/15 to-slate-900/0' },
};

const priorityDot: Record<Priority, string> = {
  عالي: 'bg-rose-500',
  متوسط: 'bg-amber-500',
  منخفض: 'bg-emerald-500',
};

export function SmartReminderPage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [type, setType] = useState<ReminderType | 'all'>('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [visible, setVisible] = useState(9);

  const { value: cms } = useCmsJson<RemindersPageContent>('content_smart_reminder', {});
  const editorContent = (editor?.content ?? {}) as RemindersPageContent;
  const cmsHero = ((isEditing ? editorContent.hero : cms.hero) ?? cms.hero ?? {}) as NonNullable<RemindersPageContent['hero']>;
  const cmsItems = ((isEditing ? editorContent.items : cms.items) ?? cms.items) as RemindersPageContent['items'];

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('modern productivity dashboard, arabic ui, clean premium design, soft light, photoreal', { seed: 'smart-reminder-hero', width: 1400, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('focused office desk with notebook and calendar, minimal, premium, photoreal', { seed: 'smart-reminder-side', width: 900, height: 520 });
  const cardImg = (id: string, prompt: string, imageUrl?: string) => imageUrl ?? aiImageUrl(prompt, { seed: id, width: 900, height: 600 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED;
    return base.filter((r) => {
      if (type !== 'all' && r.type !== type) return false;
      if (priority !== 'all' && r.priority !== priority) return false;
      if (!s) return true;
      return `${r.title} ${r.summary} ${r.tags.join(' ')}`.toLowerCase().includes(s);
    });
  }, [cmsItems, q, priority, type]);

  const featured = useMemo(() => filtered.filter((x) => x.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const heroTitle = cmsHero.title ?? 'بانة تذكيرية ذكية';
  const heroTagline = cmsHero.tagline ?? 'إشعارات تحوّل المهم إلى واضح… وتبقيك دائمًا على المسار.';
  const heroAccent = cmsHero.accent ?? 'from-slate-950 to-indigo-950';

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'الإعلام والمستجدات' }, { label: 'نافذة تذكيرية ذكية' }]} />

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
              href="#reminders"
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              استعرض التنبيهات
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => {
                setType('مواعيد');
                setPriority('عالي');
              }}
            >
              أهم تذكيرات اليوم
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
                placeholder="ابحث بعنوان أو كلمة مفتاحية…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips
                label="النوع"
                value={type}
                onChange={setType}
                options={[chip('قانوني', 'قانوني'), chip('إجرائي', 'إجرائي'), chip('مواعيد', 'مواعيد'), chip('تحديثات', 'تحديثات')]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips
                label="الأولوية"
                value={priority}
                onChange={setPriority}
                options={[chip('عالي', 'عالي'), chip('متوسط', 'متوسط'), chip('منخفض', 'منخفض')]}
              />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="مختارات سريعة" subtitle="تنبيهات موجزة تساعدك على التقاط ما يهم في ثوانٍ.">
            {featured.map((x) => (
              <div key={x.id} className="snap-start min-w-[320px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={cardImg(x.id, `minimal notification card, ${x.type}, premium ui, photoreal`, x.imageUrl)}
                    alt=""
                    className="h-36 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeStyle[x.type].badge}`}>{x.type}</span>
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${priorityDot[x.priority]}`} />
                    {x.priority}
                  </span>
                </div>
                <div className="mt-3 text-base font-extrabold text-slate-900">{x.title}</div>
                <div className="mt-1 text-sm text-slate-600">{x.summary}</div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-500">{x.due}</div>
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => alert('قريباً: تفعيل التنبيه/الإضافة للقائمة')}
                  >
                    تفعيل
                  </button>
                </div>
              </div>
            ))}
          </FeaturedRail>
        </Reveal>

        <Reveal>
          <div id="reminders" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="التنبيهات"
              subtitle="قائمة قابلة للبحث والفرز، تساعد على تنظيم العمل اليومي دون تعقيد."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <button
                      type="button"
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={() => editor?.addItem()}
                    >
                      إضافة تذكير
                    </button>
                  ) : null}
                  <div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>
                </div>
              }
            />
            {items.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x) => {
                  const sourceItems = (Array.isArray(cmsItems) && cmsItems.length ? cmsItems : SEED) as Reminder[];
                  const idx = sourceItems.findIndex((it) => it.id === x.id);
                  const index = idx >= 0 ? idx : 0;
                  const titleSelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'title';
                  const summarySelected =
                    editor?.selected?.scope === 'item' && editor?.selected?.index === index && editor?.selected?.field === 'summary';

                  return (
                  <div
                    key={x.id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/30"
                    tabIndex={0}
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${typeStyle[x.type].glow}`} />
                    <div className="relative">
                      <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <img
                          src={cardImg(x.id, `clean modern reminder illustration, ${x.type}, soft lighting, photoreal`, x.imageUrl)}
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
                        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${typeStyle[x.type].badge}`}>{x.type}</span>
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${priorityDot[x.priority]}`} />
                          {x.priority}
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
                        className="mt-1 text-sm leading-relaxed text-slate-600"
                        value={x.summary}
                        disabled={!isEditing}
                        selected={Boolean(summarySelected)}
                        onSelect={() => editor?.setSelected({ scope: 'item', index, field: 'summary' })}
                        onChange={(next) => editor?.patchItem(index, { summary: next })}
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        {x.tags.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-500">{x.due}</div>
                        <button
                          type="button"
                          className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          onClick={() => alert('قريباً: تفاصيل التنبيه')}
                        >
                          التفاصيل
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8">
                <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض تنبيهات أخرى." />
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
              <SectionTitle title="كيف تستخدم النافذة؟" subtitle="تنظيم ذكي بدون ضجيج: اختر ما يهمك، واترك الباقي للنظام." />
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'اختر', body: 'حدّد نوع التنبيه والأولوية وفق سياق عملك.', icon: '🎯' },
                  { title: 'طبّق', body: 'اتبع قائمة التحقق السريعة لتقليل الأخطاء.', icon: '✅' },
                  { title: 'تابع', body: 'فعّل تنبيهاتك لتصل في الوقت المناسب.', icon: '🔔' },
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
                هذه صفحة عرض بتصميم حديث ومحتوى تجريبي. لاحقاً يمكن ربطها ببيانات حقيقية وإشعارات فعلية حسب الحساب.
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                onClick={() => alert('قريباً: تخصيص التنبيهات')}
              >
                تخصيص التنبيهات
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <Faq
            title="أسئلة شائعة"
            items={[
              { q: 'هل التنبيهات مرتبطة بحساب المستخدم؟', a: 'حالياً هذه نسخة عرض. يمكن ربطها مستقبلاً بتنبيهات حسب الدور والصلاحيات.' },
              { q: 'هل يمكن ضبط التكرار والأولوية؟', a: 'نعم—التصميم يدعم ذلك. إضافة لوحة إعدادات ستكون الخطوة التالية.' },
              { q: 'هل يمكن تصدير قائمة المهام؟', a: 'يمكن إضافة تصدير PDF/CSV لاحقاً حسب المتطلبات.' },
            ]}
          />
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-indigo-950 to-slate-950 p-7 text-white shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-extrabold">جاهز لتجربة تنبيهات أذكى؟</div>
                <div className="mt-1 text-sm text-white/80">ابدأ بتخصيص الأنواع والأولويات بما يناسب عملك.</div>
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
