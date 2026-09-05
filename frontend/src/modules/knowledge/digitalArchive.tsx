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

type FileType = 'PDF' | 'DOC' | 'XLS' | 'ZIP';
type DocType = 'تقارير' | 'دلائل' | 'سياسات' | 'نماذج' | 'بيانات';

type ArchiveDoc = {
  id: string;
  title: string;
  docType: DocType;
  fileType: FileType;
  publishedAt: string;
  issuer: string;
  ref: string;
  keywords: string[];
  featured?: boolean;
  imageUrl?: string;
  fileUrl?: string;
};

type ArchivePageContent = {
  hero?: {
    title?: string;
    tagline?: string;
    kicker?: string;
    accent?: string;
    imageMain?: string;
    imageSide?: string;
  };
  items?: ArchiveDoc[];
};

const SEED: ArchiveDoc[] = [
  {
    id: 'da-1',
    title: 'تقرير سنوي: جودة التحقق ومعالجة الملفات',
    docType: 'تقارير',
    fileType: 'PDF',
    publishedAt: '2025-12-18',
    issuer: 'قسم الجودة',
    ref: 'AR-2025-DR-01',
    keywords: ['جودة', 'تحقق', 'ملفات'],
    featured: true,
  },
  {
    id: 'da-2',
    title: 'دليل: الإيداع الإلكتروني خطوة بخطوة',
    docType: 'دلائل',
    fileType: 'PDF',
    publishedAt: '2026-01-10',
    issuer: 'فريق الدعم',
    ref: 'AR-2026-GD-02',
    keywords: ['إيداع', 'إجراءات', 'دليل'],
    featured: true,
  },
  {
    id: 'da-3',
    title: 'سياسة: توحيد التسمية والأرشفة',
    docType: 'سياسات',
    fileType: 'PDF',
    publishedAt: '2025-11-02',
    issuer: 'إدارة التنظيم',
    ref: 'AR-2025-PL-07',
    keywords: ['أرشفة', 'تسمية', 'تصنيف'],
    featured: true,
  },
  {
    id: 'da-4',
    title: 'نموذج: قائمة تحقق قبل الإرسال',
    docType: 'نماذج',
    fileType: 'DOC',
    publishedAt: '2025-09-22',
    issuer: 'قسم الجودة',
    ref: 'AR-2025-FM-03',
    keywords: ['قائمة تحقق', 'إرسال', 'جودة'],
  },
  {
    id: 'da-5',
    title: 'بيانات: مؤشرات أداء أسبوعية (2025)',
    docType: 'بيانات',
    fileType: 'XLS',
    publishedAt: '2026-01-02',
    issuer: 'قسم الإحصاء',
    ref: 'AR-2026-DS-11',
    keywords: ['مؤشرات', 'أداء', 'إحصاء'],
  },
  {
    id: 'da-6',
    title: 'دليل: تحسين جودة PDF للمرفقات',
    docType: 'دلائل',
    fileType: 'PDF',
    publishedAt: '2025-10-14',
    issuer: 'فريق الدعم',
    ref: 'AR-2025-GD-05',
    keywords: ['PDF', 'مرفقات', 'جودة'],
    featured: true,
  },
  {
    id: 'da-7',
    title: 'سياسة: أمن الروابط والصلاحيات',
    docType: 'سياسات',
    fileType: 'PDF',
    publishedAt: '2026-01-20',
    issuer: 'فريق الأمن',
    ref: 'AR-2026-PL-01',
    keywords: ['أمن', 'روابط', 'صلاحيات'],
  },
  {
    id: 'da-8',
    title: 'نموذج: طلب متابعة',
    docType: 'نماذج',
    fileType: 'PDF',
    publishedAt: '2025-08-09',
    issuer: 'مركز الخدمات',
    ref: 'AR-2025-FM-09',
    keywords: ['متابعة', 'طلب'],
  },
  {
    id: 'da-9',
    title: 'تقرير: أسباب الرفض الأكثر شيوعاً',
    docType: 'تقارير',
    fileType: 'PDF',
    publishedAt: '2025-12-05',
    issuer: 'قسم الجودة',
    ref: 'AR-2025-DR-09',
    keywords: ['رفض', 'جودة', 'تحقق'],
  },
  {
    id: 'da-10',
    title: 'حزمة: نماذج جاهزة (ZIP)',
    docType: 'نماذج',
    fileType: 'ZIP',
    publishedAt: '2026-02-01',
    issuer: 'مركز الخدمات',
    ref: 'AR-2026-FM-20',
    keywords: ['نماذج', 'حزمة', 'جاهز'],
  },
  {
    id: 'da-11',
    title: 'دليل: تصنيف الوثائق حسب السنة',
    docType: 'دلائل',
    fileType: 'PDF',
    publishedAt: '2025-07-17',
    issuer: 'مركز الأرشفة',
    ref: 'AR-2025-GD-12',
    keywords: ['تصنيف', 'سنة', 'أرشفة'],
  },
  {
    id: 'da-12',
    title: 'سياسة: التحقق النهائي قبل الإرسال',
    docType: 'سياسات',
    fileType: 'PDF',
    publishedAt: '2025-11-28',
    issuer: 'قسم الجودة',
    ref: 'AR-2025-PL-12',
    keywords: ['تحقق', 'إرسال', 'قواعد'],
  },
  {
    id: 'da-13',
    title: 'تقرير: تحسين تجربة المستخدم على الهاتف',
    docType: 'تقارير',
    fileType: 'PDF',
    publishedAt: '2026-01-06',
    issuer: 'فريق الواجهة',
    ref: 'AR-2026-DR-03',
    keywords: ['واجهة', 'RTL', 'استجابة'],
  },
  {
    id: 'da-14',
    title: 'بيانات: مصفوفة كلمات مفتاحية',
    docType: 'بيانات',
    fileType: 'XLS',
    publishedAt: '2025-09-01',
    issuer: 'قسم الإحصاء',
    ref: 'AR-2025-DS-02',
    keywords: ['كلمات مفتاحية', 'بحث'],
  },
  {
    id: 'da-15',
    title: 'نموذج: سجل مراجعة داخلي',
    docType: 'نماذج',
    fileType: 'DOC',
    publishedAt: '2026-02-08',
    issuer: 'قسم الجودة',
    ref: 'AR-2026-FM-04',
    keywords: ['مراجعة', 'سجل'],
  },
  {
    id: 'da-16',
    title: 'دليل: القراءة السريعة للأرشيف',
    docType: 'دلائل',
    fileType: 'PDF',
    publishedAt: '2025-06-30',
    issuer: 'مركز الأرشفة',
    ref: 'AR-2025-GD-01',
    keywords: ['أرشيف', 'بحث', 'دليل'],
  },
];

const chip = (value: any, label: string) => ({ value, label });

const fileBadge: Record<FileType, string> = {
  PDF: 'bg-rose-600/10 text-rose-700',
  DOC: 'bg-sky-600/10 text-sky-700',
  XLS: 'bg-emerald-600/10 text-emerald-700',
  ZIP: 'bg-amber-600/10 text-amber-700',
};

export function DigitalArchivePage() {
  const editor = useContentEditorOptional();
  const isEditing = Boolean(editor?.enabled);
  const [q, setQ] = useState('');
  const [fileType, setFileType] = useState<FileType | 'all'>('all');
  const [docType, setDocType] = useState<DocType | 'all'>('all');
  const [year, setYear] = useState<string | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [visible, setVisible] = useState(10);

  const years = useMemo(() => {
    const ys = new Set<string>();
    for (const d of SEED) ys.add(d.publishedAt.slice(0, 4));
    return Array.from(ys).sort((a, b) => b.localeCompare(a));
  }, []);

  const { value: cms } = useCmsJson<ArchivePageContent>('content_digital_archive', {});
  const cmsHero = cms.hero ?? {};
  const cmsItems = cms.items;
  const editorHero = (editor?.content?.hero ?? {}) as any;
  const editorItems = (editor?.content?.items ?? []) as any[];

  const heroMain =
    cmsHero.imageMain ??
    aiImageUrl('clean archive library, paper texture, premium light, photoreal', { seed: 'da-hero-main', width: 1500, height: 900 });
  const heroSide =
    cmsHero.imageSide ??
    aiImageUrl('document stack with tabs, minimal, premium, photoreal', { seed: 'da-hero-side', width: 900, height: 520 });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = cmsItems?.length ? cmsItems : SEED;
    const base2 = isEditing ? (editorItems.length ? editorItems : base) : base;
    return base2.filter((d) => {
      if (fileType !== 'all' && d.fileType !== fileType) return false;
      if (docType !== 'all' && d.docType !== docType) return false;
      if (year !== 'all' && d.publishedAt.slice(0, 4) !== year) return false;
      if (!s) return true;
      const hay = `${d.title} ${d.issuer} ${d.ref} ${d.keywords.join(' ')}`.toLowerCase();
      return hay.includes(s);
    }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [docType, fileType, isEditing, q, year, editorItems, cmsItems]);

  const featured = useMemo(() => filtered.filter((d) => d.featured).slice(0, 8), [filtered]);
  const items = filtered.slice(0, visible);

  const docImage = (d: ArchiveDoc, w: number, h: number) =>
    d.imageUrl ?? aiImageUrl(`archive document cover, ${d.docType}, premium, photoreal`, { seed: d.id, width: w, height: h });

  return (
    <PageContainer>
      <div className="space-y-8">
        <ReturnToLandingButton />
        <Breadcrumbs items={[{ label: 'الرئيسية', to: '/' }, { label: 'المعرفة والتكوين' }, { label: 'الأرشيف الرقمي' }]} />

        <EditorialHero
          title={(isEditing ? editorHero.title : cmsHero.title) ?? 'الأرشيف الرقمي'}
          tagline={(isEditing ? editorHero.tagline : cmsHero.tagline) ?? 'مصدر موثوق، مصنّف بعناية، وسهل الوصول—ابحث بالمرجع والكلمات المفتاحية والسنة.'}
          kicker={(isEditing ? editorHero.kicker : cmsHero.kicker) ?? 'Archive / Repository'}
          imageMain={heroMain}
          imageSide={heroSide}
          accent={(isEditing ? editorHero.accent : cmsHero.accent) ?? 'from-white to-slate-100'}
          renderTitle={
            isEditing
              ? (className) => (
                  <InlineEditableText
                    tag="h1"
                    className={`${className} ${editor?.selected?.scope === 'hero' && editor?.selected?.field === 'title' ? 'ring-2 ring-amber-400/60 rounded-xl px-2 -mx-2' : ''}`}
                    value={String((editorHero.title ?? 'الأرشيف الرقمي') as any)}
                    selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'title'}
                    onSelect={() => editor?.setSelected({ scope: 'hero', field: 'title' })}
                    onChange={(v) => editor?.patchHero({ title: v })}
                  />
                )
              : undefined
          }
          renderTagline={
            isEditing
              ? (className) => (
                  <InlineEditableText
                    tag="p"
                    className={`${className} ${editor?.selected?.scope === 'hero' && editor?.selected?.field === 'tagline' ? 'ring-2 ring-amber-400/60 rounded-xl px-2 -mx-2' : ''}`}
                    value={String((editorHero.tagline ?? '') as any)}
                    placeholder="اكتب وصفاً قصيراً…"
                    selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'tagline'}
                    onSelect={() => editor?.setSelected({ scope: 'hero', field: 'tagline' })}
                    onChange={(v) => editor?.patchHero({ tagline: v })}
                  />
                )
              : undefined
          }
          renderKicker={
            isEditing
              ? () => (
                  <InlineEditableText
                    tag="span"
                    className={`${editor?.selected?.scope === 'hero' && editor?.selected?.field === 'kicker' ? 'ring-2 ring-amber-400/60 rounded-lg px-2' : ''}`}
                    value={String((editorHero.kicker ?? '') as any)}
                    placeholder="Kicker"
                    selected={editor?.selected?.scope === 'hero' && editor?.selected?.field === 'kicker'}
                    onSelect={() => editor?.setSelected({ scope: 'hero', field: 'kicker' })}
                    onChange={(v) => editor?.patchHero({ kicker: v })}
                  />
                )
              : undefined
          }
          onEditMainImage={isEditing ? () => editor?.requestUpload({ scope: 'heroMain' }) : undefined}
          onEditSideImage={isEditing ? () => editor?.requestUpload({ scope: 'heroSide' }) : undefined}
          primaryCta={
            <a
              href="#archive"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              ابحث في الأرشيف
            </a>
          }
          secondaryCta={
            <button
              type="button"
              className="rounded-2xl bg-white/70 px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={() => setYear(years[0] ?? 'all')}
            >
              تصفّح حسب السنة
            </button>
          }
        />

        <Reveal>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2 lg:col-span-1">
              <div className="text-xs font-bold text-slate-600">بحث متقدم</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="كلمات مفتاحية… رقم مرجعي… جهة…"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <div className="flex flex-col gap-3">
              <FilterChips label="نوع الملف" value={fileType} onChange={setFileType} options={[chip('PDF', 'PDF'), chip('DOC', 'DOC'), chip('XLS', 'XLS'), chip('ZIP', 'ZIP')]} />
              <FilterChips
                label="نوع الوثيقة"
                value={docType}
                onChange={setDocType}
                options={[chip('تقارير', 'تقارير'), chip('دلائل', 'دلائل'), chip('سياسات', 'سياسات'), chip('نماذج', 'نماذج'), chip('بيانات', 'بيانات')]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <FilterChips label="السنة" value={year} onChange={setYear} options={years.map((y) => chip(y, y))} />
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-bold text-slate-600">العرض</div>
                <div className="flex gap-2">
                  {(
                    [
                      { k: 'grid', label: 'شبكة' },
                      { k: 'list', label: 'قائمة' },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.k}
                      type="button"
                      onClick={() => setView(b.k)}
                      className={`rounded-xl px-3 py-2 text-xs font-extrabold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        view === b.k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <FeaturedRail title="وثائق محورية" subtitle="مختارات تساعدك على البدء بسرعة: دلائل، سياسات، وتقارير أساسية.">
            {featured.map((d) => (
              <div key={d.id} className="snap-start min-w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative">
                  <img src={docImage(d, 900, 540)} alt="" className="h-40 w-full object-cover" loading="lazy" decoding="async" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                  <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-extrabold ${fileBadge[d.fileType]}`}>{d.fileType}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-extrabold text-slate-800">{d.docType}</span>
                    <span className="text-xs font-bold text-slate-500">{d.publishedAt}</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-slate-900">{d.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{d.issuer}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.keywords.slice(0, 3).map((k) => (
                      <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </FeaturedRail>
        </Reveal>

        <Reveal className="space-y-4">
          <SectionTitle title="الوثائق" subtitle="تصفح وفق طريقتك: شبكة صور أو قائمة شبيهة بالجدول." action={<div className="text-sm font-bold text-slate-600">النتائج: {filtered.length}</div>} />

          {items.length ? (
            view === 'grid' ? (
              <div id="archive" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d, idx) => (
                  <article key={d.id ?? idx} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative">
                      <img src={docImage(d, 900, 560)} alt="" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                      <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-extrabold ${fileBadge[d.fileType]}`}>{d.fileType}</span>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            editor?.requestUpload({ scope: 'item', index: idx, key: 'imageUrl' });
                          }}
                          className="absolute left-3 top-3 rounded-xl bg-black/60 px-3 py-2 text-xs font-extrabold text-white shadow hover:bg-black/70"
                        >
                          تغيير الصورة
                        </button>
                      ) : null}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-extrabold text-slate-800">{d.docType}</span>
                        <div className="text-left text-xs text-slate-500">
                          <div className="font-bold">{d.publishedAt}</div>
                          <div className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700">{d.ref}</div>
                        </div>
                      </div>
                      {isEditing ? (
                        <InlineEditableText
                          tag="h3"
                          className={`mt-3 text-lg font-extrabold text-slate-900 ${
                            editor?.selected?.scope === 'item' && editor?.selected?.index === idx && editor?.selected?.field === 'title'
                              ? 'ring-2 ring-indigo-500/30 rounded-xl px-2 -mx-2'
                              : ''
                          }`}
                          value={String(d.title ?? '')}
                          selected={editor?.selected?.scope === 'item' && editor?.selected?.index === idx && editor?.selected?.field === 'title'}
                          onSelect={() => editor?.setSelected({ scope: 'item', index: idx, field: 'title' })}
                          onChange={(v) => editor?.patchItem(idx, { title: v })}
                        />
                      ) : (
                        <h3 className="mt-3 text-lg font-extrabold text-slate-900">{d.title}</h3>
                      )}
                      {isEditing ? (
                        <InlineEditableText
                          tag="p"
                          className={`mt-1 text-sm text-slate-600 ${
                            editor?.selected?.scope === 'item' && editor?.selected?.index === idx && editor?.selected?.field === 'issuer'
                              ? 'ring-2 ring-indigo-500/30 rounded-xl px-2 -mx-2'
                              : ''
                          }`}
                          value={String(d.issuer ?? '')}
                          placeholder="الجهة…"
                          selected={editor?.selected?.scope === 'item' && editor?.selected?.index === idx && editor?.selected?.field === 'issuer'}
                          onSelect={() => editor?.setSelected({ scope: 'item', index: idx, field: 'issuer' })}
                          onChange={(v) => editor?.patchItem(idx, { issuer: v })}
                        />
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">{d.issuer}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.keywords.slice(0, 3).map((k) => (
                          <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {k}
                          </span>
                        ))}
                      </div>
                      {isEditing ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              editor?.duplicateItem(idx);
                            }}
                          >
                            تكرار
                          </button>
                          <button
                            type="button"
                            className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              editor?.deleteItem(idx);
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={() => {
                            if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
                            else alert('قريباً: عرض الوثيقة');
                          }}
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl bg-white px-4 py-2 text-xs font-extrabold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          onClick={() => {
                            if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
                            else alert('قريباً: تحميل');
                          }}
                        >
                          تحميل
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div id="archive" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-extrabold text-slate-600">
                  <div className="col-span-6">الوثيقة</div>
                  <div className="col-span-2">النوع</div>
                  <div className="col-span-2">التاريخ</div>
                  <div className="col-span-2">الإجراءات</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {items.map((d) => (
                    <div key={d.id} className="grid grid-cols-12 items-center gap-3 px-5 py-4">
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <img src={docImage(d, 200, 200)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">{d.title}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{d.issuer} • {d.ref}</div>
                        </div>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold ${fileBadge[d.fileType]}`}>{d.fileType}</span>
                        <span className="text-xs font-bold text-slate-600">{d.docType}</span>
                      </div>
                      <div className="col-span-2 text-xs font-bold text-slate-600">{d.publishedAt}</div>
                      <div className="col-span-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={() => {
                            if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
                            else alert('قريباً: عرض');
                          }}
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          onClick={() => {
                            if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener,noreferrer');
                            else alert('قريباً: تحميل');
                          }}
                        >
                          تحميل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <EmptyState title="لا توجد نتائج" body="جرّب تعديل البحث أو المرشحات لعرض وثائق أخرى." />
          )}

          <LoadMore hidden={visible >= filtered.length} onClick={() => setVisible((v) => v + 6)} />
        </Reveal>

        <Reveal>
          <Faq
            items={[
              { q: 'هل يمكن إضافة بحث بالرقم المرجعي فقط؟', a: 'نعم—واجهة البحث تدعم ذلك ويمكن تحسينها بإدخال حقول منفصلة لاحقاً.' },
              { q: 'هل يمكن ربط “تحميل” بملف فعلي؟', a: 'يمكن ربطها بتخزين داخلي/سحابي حسب المتطلبات.' },
              { q: 'هل يوجد تتبع للوثائق الأكثر استخداماً؟', a: 'يمكن إضافة عدّادات وتحليلات واختيار “وثائق محورية” تلقائياً.' },
            ]}
          />
        </Reveal>
      </div>
    </PageContainer>
  );
}
