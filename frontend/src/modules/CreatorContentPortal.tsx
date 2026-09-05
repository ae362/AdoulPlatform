import React, { useMemo, useRef, useState } from 'react';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ContentEditorProvider, type ContentEditorApi } from './content/editorContext';
import { ProfessionalProgramsPage } from './knowledge/professionalPrograms';
import { AudiovisualLibraryPage } from './knowledge/audiovisualLibrary';
import { DigitalArchivePage } from './knowledge/digitalArchive';
import { MeetingsDialoguesPage } from './knowledge/meetingsDialogues';
import { SmartReminderPage } from './news/smartReminder';
import { LegalNewsPage } from './news/legalNews';
import { LegislativeChangesPage } from './news/legislativeChanges';

class PreviewErrorBoundary extends React.Component<
  { resetKey: string; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      // Reset the error when switching sub-categories so the preview can render again.
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="text-sm font-extrabold">تعطّل عرض المعاينة</div>
          <div className="mt-1 text-xs leading-relaxed text-rose-800">
            حدث خطأ أثناء التنقل بين الأقسام. جرّب تبديل القسم مرة أخرى أو إعادة تحميل الصفحة.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white"
              onClick={() => this.setState({ error: null })}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

type HeroContent = {
  title?: string;
  tagline?: string;
  kicker?: string;
  accent?: string;
  imageMain?: string;
  imageSide?: string;
};

type PageContent = {
  hero?: HeroContent;
  items?: Array<Record<string, any>>;
};

const safeJsonParse = <T,>(raw: string | undefined | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

type Field =
  | { key: string; label: string; type: 'text' | 'textarea' }
  | { key: string; label: string; type: 'number' }
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: string; label: string; type: 'boolean' }
  | { key: string; label: string; type: 'tags'; placeholder?: string }
  | { key: string; label: string; type: 'image' }
  | { key: string; label: string; type: 'url' };

type PageConfig = {
  id: string;
  label: string;
  cmsKey: string;
  route: string;
  section: 'knowledge' | 'news';
  heroAccentOptions: string[];
  itemLabel: string;
  itemIdKey: string;
  fields: Field[];
  defaultHero: Required<Pick<HeroContent, 'title' | 'tagline' | 'kicker' | 'accent'>>;
};

const PAGE_CONFIGS: PageConfig[] = [
  {
    id: 'professional-programs',
    label: 'الأنشطة والبرامج المهنية',
    cmsKey: 'content_professional_programs',
    route: '/knowledge/professional-programs',
    section: 'knowledge',
    heroAccentOptions: ['from-indigo-950 to-amber-900', 'from-slate-950 to-indigo-950', 'from-emerald-950 to-slate-950'],
    itemLabel: 'برنامج',
    itemIdKey: 'id',
    defaultHero: {
      title: 'الأنشطة والبرامج المهنية',
      tagline: 'نحو خبرة أعمق ومهارات تُترجم إلى إنجاز.',
      kicker: 'Agenda / Program',
      accent: 'from-indigo-950 to-amber-900',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'type', label: 'النوع', type: 'select', options: ['ورشة', 'دورة', 'برنامج', 'شهادة'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الوصف', type: 'textarea' },
      { key: 'date', label: 'التاريخ', type: 'text' },
      { key: 'duration', label: 'المدة', type: 'text' },
      { key: 'provider', label: 'الجهة/المدرب', type: 'text' },
      { key: 'level', label: 'المستوى', type: 'select', options: ['مبتدئ', 'متوسط', 'متقدم'] },
      { key: 'mode', label: 'الحضور', type: 'select', options: ['حضوري', 'عن بُعد'] },
      { key: 'domain', label: 'المجال', type: 'select', options: ['العدول', 'القانون', 'الرقمنة', 'المسطرة', 'المهارات'] },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'audiovisual-library',
    label: 'الخزانة السمعية البصرية',
    cmsKey: 'content_audiovisual_library',
    route: '/knowledge/audiovisual-library',
    section: 'knowledge',
    heroAccentOptions: ['from-slate-950 to-indigo-950', 'from-slate-950 to-sky-950', 'from-indigo-950 to-rose-950'],
    itemLabel: 'عنصر',
    itemIdKey: 'id',
    defaultHero: {
      title: 'الخزانة السمعية البصرية',
      tagline: 'شاهد. استمع. واكتشف المعرفة بصوت وصورة.',
      kicker: 'Media / Streaming',
      accent: 'from-slate-950 to-indigo-950',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'type', label: 'النوع', type: 'select', options: ['فيديو', 'بودكاست', 'صور'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الوصف', type: 'textarea' },
      { key: 'topic', label: 'الموضوع', type: 'select', options: ['العدول', 'الرقمنة', 'المسطرة', 'الممارسة', 'حوارات'] },
      { key: 'year', label: 'السنة', type: 'number' },
      { key: 'duration', label: 'المدة', type: 'text' },
      { key: 'durationBucket', label: 'فئة المدة', type: 'select', options: ['قصير', 'متوسط', 'طويل'] },
      { key: 'views', label: 'المشاهدات/الاستماع', type: 'text' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'mediaUrl', label: 'رابط التشغيل', type: 'url' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'digital-archive',
    label: 'الأرشيف الرقمي',
    cmsKey: 'content_digital_archive',
    route: '/knowledge/digital-archive',
    section: 'knowledge',
    heroAccentOptions: ['from-white to-slate-100', 'from-slate-950 to-indigo-950'],
    itemLabel: 'وثيقة',
    itemIdKey: 'id',
    defaultHero: {
      title: 'الأرشيف الرقمي',
      tagline: 'مصدر موثوق، مصنّف بعناية، وسهل الوصول.',
      kicker: 'Archive / Repository',
      accent: 'from-white to-slate-100',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'docType', label: 'نوع الوثيقة', type: 'select', options: ['تقارير', 'دلائل', 'سياسات', 'نماذج', 'بيانات'] },
      { key: 'fileType', label: 'نوع الملف', type: 'select', options: ['PDF', 'DOC', 'XLS', 'ZIP'] },
      { key: 'publishedAt', label: 'تاريخ النشر', type: 'text' },
      { key: 'issuer', label: 'الجهة', type: 'text' },
      { key: 'ref', label: 'المرجع', type: 'text' },
      { key: 'keywords', label: 'كلمات مفتاحية', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'fileUrl', label: 'رابط الملف', type: 'url' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'meetings-dialogues',
    label: 'الاجتماعات والحوارات',
    cmsKey: 'content_meetings_dialogues',
    route: '/knowledge/meetings-dialogues',
    section: 'knowledge',
    heroAccentOptions: ['from-emerald-950 to-slate-950', 'from-slate-950 to-indigo-950'],
    itemLabel: 'جلسة',
    itemIdKey: 'id',
    defaultHero: {
      title: 'الاجتماعات والحوارات',
      tagline: 'حوار يصنع وضوحًا… وقرارات تُترجم إلى أثر.',
      kicker: 'Dialogue / Conversation',
      accent: 'from-emerald-950 to-slate-950',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'kind', label: 'النوع', type: 'select', options: ['اجتماع', 'جلسة حوار', 'ندوة'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الملخص', type: 'textarea' },
      { key: 'date', label: 'التاريخ', type: 'text' },
      { key: 'topic', label: 'الموضوع', type: 'select', options: ['العدول', 'الرقمنة', 'الجودة', 'الممارسة', 'التشريع'] },
      { key: 'speakers', label: 'المشاركون', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'highlights', label: 'أبرز النقاط', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'hasRecording', label: 'يوجد تسجيل', type: 'boolean' },
      { key: 'recordingUrl', label: 'رابط التسجيل', type: 'url' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'smart-reminder',
    label: 'نافذة تذكيرية ذكية',
    cmsKey: 'content_smart_reminder',
    route: '/news/smart-reminder',
    section: 'news',
    heroAccentOptions: ['from-slate-950 to-indigo-950', 'from-slate-950 to-emerald-950'],
    itemLabel: 'تنبيه',
    itemIdKey: 'id',
    defaultHero: {
      title: 'نافذة تذكيرية ذكية',
      tagline: 'تنبيهات دقيقة تُصمَّم لخطواتك اليومية.',
      kicker: 'الإعلام والمستجدات',
      accent: 'from-slate-950 to-indigo-950',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'type', label: 'النوع', type: 'select', options: ['قانوني', 'إجرائي', 'مواعيد', 'تحديثات'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الوصف', type: 'textarea' },
      { key: 'due', label: 'الاستحقاق', type: 'text' },
      { key: 'priority', label: 'الأولوية', type: 'select', options: ['عالي', 'متوسط', 'منخفض'] },
      { key: 'tags', label: 'وسوم', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'legal-news',
    label: 'أحدث الأخبار القانونية',
    cmsKey: 'content_legal_news',
    route: '/news/legal-news',
    section: 'news',
    heroAccentOptions: ['from-slate-950 to-sky-950', 'from-slate-950 to-indigo-950'],
    itemLabel: 'خبر',
    itemIdKey: 'id',
    defaultHero: {
      title: 'أحدث الأخبار القانونية',
      tagline: 'أخبار موجزة + تحليل مبسط + تنبيهات عملية.',
      kicker: 'الإعلام والمستجدات',
      accent: 'from-slate-950 to-sky-950',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'category', label: 'التصنيف', type: 'select', options: ['مستجدات', 'تحليل', 'توجيهات', 'تنبيه'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الوصف', type: 'textarea' },
      { key: 'date', label: 'التاريخ', type: 'text' },
      { key: 'source', label: 'المصدر', type: 'select', options: ['نشرة رسمية', 'بلاغ', 'دورية', 'مقال'] },
      { key: 'tags', label: 'وسوم', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'linkUrl', label: 'رابط خارجي', type: 'url' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
  {
    id: 'legislative-changes',
    label: 'التعديلات التشريعية',
    cmsKey: 'content_legislative_changes',
    route: '/news/legislative-changes',
    section: 'news',
    heroAccentOptions: ['from-slate-950 to-amber-950', 'from-slate-950 to-indigo-950'],
    itemLabel: 'تعديل',
    itemIdKey: 'id',
    defaultHero: {
      title: 'التعديلات التشريعية',
      tagline: 'ماذا تغيّر؟ ما الأثر؟ وكيف نُطبّقه بسرعة؟',
      kicker: 'الإعلام والمستجدات',
      accent: 'from-slate-950 to-amber-950',
    },
    fields: [
      { key: 'id', label: 'المعرّف', type: 'text' },
      { key: 'type', label: 'النوع', type: 'select', options: ['تعديل', 'إضافة', 'نسخ/إلغاء', 'تفسير'] },
      { key: 'title', label: 'العنوان', type: 'text' },
      { key: 'summary', label: 'الوصف', type: 'textarea' },
      { key: 'date', label: 'التاريخ', type: 'text' },
      { key: 'impact', label: 'الأثر', type: 'select', options: ['مرتفع', 'متوسط', 'منخفض'] },
      { key: 'affected', label: 'المجالات المتأثرة', type: 'tags', placeholder: 'افصل بفاصلة' },
      { key: 'featured', label: 'مميز', type: 'boolean' },
      { key: 'linkUrl', label: 'رابط خارجي', type: 'url' },
      { key: 'imageUrl', label: 'صورة البطاقة', type: 'image' },
    ],
  },
];

function normalizeTags(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}-${Date.now().toString(16).slice(-4)}`;
}

export function CreatorContentPortal() {
  const { sessionToken, logout, user } = useAuth();
  const navigate = useNavigate();
  const { data: cms, isLoading } = trpc.cms.getContent.useQuery({});
  const updateMutation = trpc.cms.updateContent.useMutation();
  const utils = trpc.useUtils();

  const [activeId, setActiveId] = useState<string>(PAGE_CONFIGS[0]?.id ?? 'professional-programs');
  const page = useMemo(() => PAGE_CONFIGS.find((p) => p.id === activeId) ?? PAGE_CONFIGS[0], [activeId]);

  const raw = cms?.[page.cmsKey]?.value as string | undefined;
  const initial = useMemo<PageContent>(() => safeJsonParse<PageContent>(raw, {}), [raw]);
  const [draft, setDraft] = useState<PageContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageTarget, setImageTarget] = useState<{ scope: 'heroMain' | 'heroSide' | 'item'; index?: number; key?: string } | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'wysiwyg' | 'form'>('wysiwyg');

  React.useEffect(() => {
    setDraft(initial);
    setDirty(false);
    setShowJson(false);
    setJsonDraft('');
    setSelected(null);
    setImageTarget(null);
  }, [page.cmsKey, raw]);

  const items = Array.isArray(draft.items) ? draft.items : [];
  const hero: HeroContent = draft.hero ?? {};
  const heroDefaults = page.defaultHero;

  const setHero = (patch: Partial<HeroContent>) => {
    setDraft((d) => ({ ...d, hero: { ...(d.hero ?? {}), ...patch } }));
    setDirty(true);
  };

  const setItem = (index: number, patch: Record<string, any>) => {
    setDraft((d) => {
      const next = Array.isArray(d.items) ? [...d.items] : [];
      next[index] = { ...(next[index] ?? {}), ...patch };
      return { ...d, items: next };
    });
    setDirty(true);
  };

  const removeItem = (index: number) => {
    setDraft((d) => {
      const next = Array.isArray(d.items) ? [...d.items] : [];
      next.splice(index, 1);
      return { ...d, items: next };
    });
    setDirty(true);
  };

  const addItem = () => {
    const nextId = makeId(page.id);
    const today = new Date().toISOString().slice(0, 10);
    const base: Record<string, any> = { [page.itemIdKey]: nextId };
    for (const f of page.fields) {
      if (f.key in base) continue;
      if (f.type === 'boolean') base[f.key] = false;
      else if (f.type === 'number') base[f.key] = new Date().getFullYear();
      else if (f.type === 'tags') base[f.key] = [];
      else if (f.type === 'select') base[f.key] = f.options[0] ?? '';
      else if (f.type === 'text' || f.type === 'textarea' || f.type === 'url' || f.type === 'image') base[f.key] = '';
    }
    if (typeof base.date === 'string' && !base.date) base.date = today;
    if (typeof base.publishedAt === 'string' && !base.publishedAt) base.publishedAt = today;
    setDraft((d) => ({ ...d, items: [...(Array.isArray(d.items) ? d.items : []), base] }));
    setDirty(true);
  };

  const duplicateItem = (index: number) => {
    setDraft((d) => {
      const next = Array.isArray(d.items) ? [...d.items] : [];
      const it = next[index];
      if (!it) return d;
      const copy = { ...it, [page.itemIdKey]: makeId(page.id) };
      next.splice(index + 1, 0, copy);
      return { ...d, items: next };
    });
    setDirty(true);
  };

  const deleteItem = (index: number) => {
    removeItem(index);
    if (selected?.scope === 'item' && selected?.index === index) setSelected(null);
  };

  const moveItem = (from: number, to: number) => {
    setDraft((d) => {
      const next = Array.isArray(d.items) ? [...d.items] : [];
      const item = next[from];
      if (!item) return d;
      next.splice(from, 1);
      next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
      return { ...d, items: next };
    });
    setDirty(true);
  };

  const initializeFromDefaults = () => {
    setDraft({ hero: { ...heroDefaults }, items: [] });
    setDirty(true);
  };

  const openJsonEditor = () => {
    setJsonDraft(JSON.stringify(draft, null, 2));
    setShowJson(true);
  };

  const applyJson = () => {
    const parsed = safeJsonParse<PageContent>(jsonDraft, null as any);
    if (!parsed || typeof parsed !== 'object') {
      alert('JSON غير صالح');
      return;
    }
    setDraft(parsed);
    setDirty(true);
    setShowJson(false);
  };

  const handleLogout = async () => {
    if (dirty) {
      const ok = confirm('لديك تغييرات غير محفوظة. هل تريد تسجيل الخروج؟');
      if (!ok) return;
    }
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const save = async () => {
    if (!sessionToken) {
      alert('غير مسجّل الدخول');
      return;
    }

    const normalized: PageContent = {
      hero: draft.hero ?? {},
      items: (draft.items ?? []).map((it) => {
        const next = { ...(it ?? {}) };
        for (const f of page.fields) {
          if (f.type === 'tags') next[f.key] = normalizeTags(next[f.key]);
          if (f.type === 'number' && typeof next[f.key] === 'string' && next[f.key].trim() !== '') next[f.key] = Number(next[f.key]);
        }
        return next;
      }),
    };

    await updateMutation.mutateAsync({
      sessionToken,
      updates: [{ key: page.cmsKey, value: JSON.stringify(normalized), type: 'json', section: page.section }],
    });
    await utils.cms.getContent.invalidate();
    setDirty(false);
  };

  const uploadImage = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    if (!imageTarget) return;
    if (imageTarget.scope === 'heroMain') setHero({ imageMain: dataUrl });
    if (imageTarget.scope === 'heroSide') setHero({ imageSide: dataUrl });
    if (imageTarget.scope === 'item' && typeof imageTarget.index === 'number' && imageTarget.key) {
      setItem(imageTarget.index, { [imageTarget.key]: dataUrl });
    }
  };

  const beginUpload = (target: { scope: 'heroMain' | 'heroSide' | 'item'; index?: number; key?: string }) => {
    setImageTarget(target);
    fileRef.current?.click();
  };

  const editorApi = useMemo<ContentEditorApi>(
    () => ({
      enabled: viewMode === 'wysiwyg',
      content: draft,
      setContent: setDraft,
      selected,
      setSelected,
      patchHero: (patch) => setHero(patch),
      patchItem: (index, patch) => setItem(index, patch),
      addItem,
      duplicateItem,
      deleteItem,
      moveItem,
      requestUpload: beginUpload,
    }),
    [addItem, beginUpload, deleteItem, draft, duplicateItem, moveItem, selected, setHero, setItem, viewMode],
  );

  const Preview = useMemo(() => {
    switch (page.id) {
      case 'professional-programs':
        return ProfessionalProgramsPage;
      case 'audiovisual-library':
        return AudiovisualLibraryPage;
      case 'digital-archive':
        return DigitalArchivePage;
      case 'meetings-dialogues':
        return MeetingsDialoguesPage;
      case 'smart-reminder':
        return SmartReminderPage;
      case 'legal-news':
        return LegalNewsPage;
      case 'legislative-changes':
        return LegislativeChangesPage;
      default:
        return ProfessionalProgramsPage;
    }
  }, [page.id]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await uploadImage(file);
          e.currentTarget.value = '';
        }}
      />

      <div className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">بوابة إدارة المحتوى</div>
            <div className="text-sm text-slate-600">تحكم بمحتوى صفحات الأقسام (صور، بطاقات، فيديوهات) عبر CMS</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.email ? (
              <div className="hidden items-center rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 sm:flex">
                {user.email}
              </div>
            ) : null}
            <button
              type="button"
              className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
            <a
              href={page.route}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200"
            >
              معاينة الصفحة
            </a>
            <button
              type="button"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={openJsonEditor}
            >
              تحرير JSON
            </button>
            <button
              type="button"
              disabled={!dirty || updateMutation.isPending}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
              onClick={save}
            >
              حفظ التغييرات
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="px-2 pb-2 text-xs font-extrabold text-slate-600">الأقسام</div>
            <div className="space-y-1">
              {PAGE_CONFIGS.map((p) => {
                const active = p.id === page.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={`w-full rounded-xl px-3 py-2 text-right text-sm font-extrabold transition ${
                      active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="space-y-4 lg:col-span-9">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">تحميل المحتوى…</div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2">
              <div className="text-sm font-extrabold text-slate-900">المعاينة</div>
              <div className="flex gap-2">
                {(
                  [
                    { k: 'wysiwyg', label: 'WYSIWYG' },
                    { k: 'form', label: 'نموذج' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setViewMode(t.k)}
                    className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                      viewMode === t.k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <ContentEditorProvider value={editorApi}>
                <PreviewErrorBoundary resetKey={page.id}>
                  <Preview />
                </PreviewErrorBoundary>
              </ContentEditorProvider>
            </div>
            {viewMode === 'wysiwyg' ? (
              <div className="mt-2 px-2 text-xs text-slate-600">
                انقر على النص لتعديله مباشرة. استخدم “تغيير الصورة” لتحديث الصور. استخدم “إضافة” لإضافة بطاقات جديدة.
              </div>
            ) : null}
          </div>

          {showJson ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-extrabold text-slate-900">تحرير JSON</div>
              <textarea
                dir="ltr"
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                className="h-[360px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white"
                  onClick={applyJson}
                >
                  تطبيق
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200"
                  onClick={() => setShowJson(false)}
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-900">إعدادات الصفحة</div>
                <div className="text-xs text-slate-600">العنوان، الوصف، ألوان الـ Hero، وصوره</div>
              </div>
              <button
                type="button"
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-200"
                onClick={initializeFromDefaults}
              >
                تهيئة (بدء من قالب)
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="block">
                <div className="text-xs font-bold text-slate-600">العنوان</div>
                <input
                  value={hero.title ?? heroDefaults.title}
                  onChange={(e) => setHero({ title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">العنوان الفرعي</div>
                <input
                  value={hero.tagline ?? heroDefaults.tagline}
                  onChange={(e) => setHero({ tagline: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">Kicker</div>
                <input
                  value={hero.kicker ?? heroDefaults.kicker}
                  onChange={(e) => setHero({ kicker: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-slate-600">Accent (Tailwind)</div>
                <select
                  value={hero.accent ?? heroDefaults.accent}
                  onChange={(e) => setHero({ accent: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {page.heroAccentOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-900">صورة Hero الرئيسية</div>
                  <button
                    type="button"
                    className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold ring-1 ring-slate-200"
                    onClick={() => beginUpload({ scope: 'heroMain' })}
                  >
                    رفع صورة
                  </button>
                </div>
                <input
                  dir="ltr"
                  value={hero.imageMain ?? ''}
                  onChange={(e) => setHero({ imageMain: e.target.value })}
                  placeholder="https://... أو data:image/.."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-900">صورة Hero الجانبية</div>
                  <button
                    type="button"
                    className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold ring-1 ring-slate-200"
                    onClick={() => beginUpload({ scope: 'heroSide' })}
                  >
                    رفع صورة
                  </button>
                </div>
                <input
                  dir="ltr"
                  value={hero.imageSide ?? ''}
                  onChange={(e) => setHero({ imageSide: e.target.value })}
                  placeholder="https://... أو data:image/.."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-extrabold text-slate-900">العناصر</div>
                <div className="text-xs text-slate-600">إضافة/تعديل/حذف {page.itemLabel} + الصور + الروابط</div>
              </div>
              <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white" onClick={addItem}>
                إضافة {page.itemLabel}
              </button>
            </div>

            {items.length ? (
              <div className="mt-4 space-y-3">
                {items.map((it, idx) => (
                  <div key={`${String(it?.[page.itemIdKey] ?? idx)}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-extrabold text-slate-900">
                        {page.itemLabel} #{idx + 1}{' '}
                        <span className="text-xs font-bold text-slate-500">({String(it?.[page.itemIdKey] ?? 'no-id')})</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                        onClick={() => removeItem(idx)}
                      >
                        حذف
                      </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {page.fields.map((f) => {
                        const value = it?.[f.key];
                        if (f.type === 'textarea') {
                          return (
                            <label key={f.key} className="block lg:col-span-2">
                              <div className="text-xs font-bold text-slate-600">{f.label}</div>
                              <textarea
                                value={value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                className="mt-1 h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </label>
                          );
                        }
                        if (f.type === 'select') {
                          return (
                            <label key={f.key} className="block">
                              <div className="text-xs font-bold text-slate-600">{f.label}</div>
                              <select
                                value={value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              >
                                <option value="">—</option>
                                {f.options.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        }
                        if (f.type === 'boolean') {
                          return (
                            <label key={f.key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <input type="checkbox" checked={Boolean(value)} onChange={(e) => setItem(idx, { [f.key]: e.target.checked })} />
                              <span className="text-sm font-bold text-slate-900">{f.label}</span>
                            </label>
                          );
                        }
                        if (f.type === 'tags') {
                          return (
                            <label key={f.key} className="block">
                              <div className="text-xs font-bold text-slate-600">{f.label}</div>
                              <input
                                value={Array.isArray(value) ? value.join(', ') : value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                placeholder={f.placeholder ?? 'افصل بفاصلة'}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </label>
                          );
                        }
                        if (f.type === 'number') {
                          return (
                            <label key={f.key} className="block">
                              <div className="text-xs font-bold text-slate-600">{f.label}</div>
                              <input
                                type="number"
                                value={value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </label>
                          );
                        }
                        if (f.type === 'image') {
                          return (
                            <div key={f.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-extrabold text-slate-900">{f.label}</div>
                                <button
                                  type="button"
                                  className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold ring-1 ring-slate-200"
                                  onClick={() => beginUpload({ scope: 'item', index: idx, key: f.key })}
                                >
                                  رفع صورة
                                </button>
                              </div>
                              <input
                                dir="ltr"
                                value={value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                placeholder="https://... أو data:image/.."
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </div>
                          );
                        }
                        if (f.type === 'url') {
                          return (
                            <label key={f.key} className="block">
                              <div className="text-xs font-bold text-slate-600">{f.label}</div>
                              <input
                                dir="ltr"
                                value={value ?? ''}
                                onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                                placeholder="https://..."
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </label>
                          );
                        }
                        return (
                          <label key={f.key} className="block">
                            <div className="text-xs font-bold text-slate-600">{f.label}</div>
                            <input
                              value={value ?? ''}
                              onChange={(e) => setItem(idx, { [f.key]: e.target.value })}
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="text-lg font-extrabold text-slate-900">لا توجد عناصر بعد</div>
                <div className="mt-2 text-sm text-slate-600">اضغط إضافة لإنشاء عناصر جديدة، ثم حفظ التغييرات.</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {dirty ? (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="text-xs font-extrabold text-slate-700">غير محفوظ</div>
          <button
            type="button"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40"
            onClick={save}
          >
            حفظ التغييرات
          </button>
        </div>
      ) : null}
    </div>
  );
}
