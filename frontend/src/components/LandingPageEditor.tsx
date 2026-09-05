import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../trpc';
import { LandingPage, type CmsContentMap } from './LandingPage';

type FeatureCard = { title: string; description: string; icon: string };
type AboutBullet = { title: string; description: string };
type AiCard = { title: string; description: string; icon: string };
type RoleCard = { title: string; description: string; icon: string; badge?: string; theme?: 'light' | 'gold' };
type NavLink = { label: string; href?: string; hasAuth?: boolean };
type NavGroup = { id: string; label: string; highlighted?: boolean; path?: string; items: NavLink[] };
type ExtraBlock =
  | { id: string; type: 'text'; title: string; body: string }
  | { id: string; type: 'image'; title: string; url: string; caption?: string }
  | { id: string; type: 'video'; title: string; url: string };

const safeJsonParse = <T,>(raw: string | undefined | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const uuid = () =>
  typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now());

export function LandingPageEditor() {
  const navigate = useNavigate();
  const { user, sessionToken, logout } = useAuth();

  const { data: serverContent, refetch } = trpc.cms.getContent.useQuery({});
  const updateMutation = trpc.cms.updateContent.useMutation();

  const [draft, setDraft] = useState<CmsContentMap>({});
  const [tab, setTab] = useState<'hero' | 'nav' | 'features' | 'about' | 'ai' | 'roles' | 'extra'>('hero');

  useEffect(() => {
    if (!serverContent) return;
    setDraft(JSON.parse(JSON.stringify(serverContent)));
  }, [serverContent]);

  const setValue = (key: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const getValue = (key: string, fallback: string) => draft?.[key]?.value ?? serverContent?.[key]?.value ?? fallback;

  const dirtyKeys = useMemo(() => {
    if (!serverContent) return [];
    const keys = new Set([...Object.keys(serverContent), ...Object.keys(draft)]);
    const changed: string[] = [];
    for (const key of keys) {
      const serverVal = serverContent?.[key]?.value ?? '';
      const draftVal = draft?.[key]?.value ?? '';
      if (serverVal !== draftVal) changed.push(key);
    }
    return changed;
  }, [draft, serverContent]);

  const hasUnsaved = dirtyKeys.length > 0;

  const save = async () => {
    if (!sessionToken) return;
    if (!dirtyKeys.length) return;
    await updateMutation.mutateAsync({
      sessionToken,
      updates: dirtyKeys.map((key) => ({ key, value: draft?.[key]?.value ?? '' })),
    });
    await refetch();
  };

  const parseList = <T,>(key: string, fallback: T) => safeJsonParse<T>(draft?.[key]?.value, fallback);
  const setList = (key: string, next: unknown) => setValue(key, JSON.stringify(next));

  const featureCards = parseList<FeatureCard[]>('cards_data', [
    { title: 'خدمات العدول', description: 'تسهيل عملية التوثيق والتعاقد', icon: '⚖️' },
    { title: 'الفضاء الرقمي', description: 'خدمات إلكترونية متكاملة', icon: '💻' },
    { title: 'المساعدة القضائية', description: 'دعم وإرشاد قانوني', icon: '🤝' },
  ]);

  const aboutBullets = parseList<AboutBullet[]>('about_bullets', [
    { title: 'توفير 70% من الوقت', description: 'إنجاز المعاملات في دقائق بدلاً من ساعات' },
    { title: 'دقة 99.9%', description: 'لا أخطاء في الحسابات والوثائق' },
    { title: 'أمان متقدم', description: 'تشفير عالي المستوى لحماية بياناتك' },
  ]);

  const aiCards = parseList<AiCard[]>('ai_cards', [
    { title: 'مراجعة تلقائية', description: 'فحص فوري لجميع بنود العقد واكتشاف أي تناقضات أو نقاط ضعف', icon: '🧠' },
    { title: 'توصيات ذكية', description: 'اقتراحات تلقائية لتحسين صياغة العقود وفق أفضل الممارسات القانونية', icon: '🔒' },
    { title: 'إجابات فورية', description: 'احصل على إجابات قانونية دقيقة لأي استفسار في ثوانٍ معدودة', icon: '⚡' },
  ]);

  const roleCards = parseList<RoleCard[]>('role_cards', [
    { title: 'السلطة الحكومية', description: 'الإشراف والمراقبة الشاملة', icon: '🏛️', badge: 'نظام داخلي سري', theme: 'light' },
    { title: 'الهيئة الوطنية للعدول', description: 'إدارة شؤون العدول', icon: '📜', badge: 'نظام داخلي سري', theme: 'light' },
    { title: 'القاضي المكلف', description: 'إصدار الأذونات', icon: '⚖️', badge: 'نظام داخلي سري', theme: 'light' },
    { title: 'العدل', description: 'إدارة العقود والوثائق', icon: '✍️', badge: '✅ التسجيل متاح', theme: 'gold' },
  ]);

  const navItems = parseList<NavGroup[]>('nav_items', []);
  const extraBlocks = parseList<ExtraBlock[]>('extra_blocks', []);

  if (!user || user.role !== 'creator') return null;

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="fixed top-0 left-0 right-0 z-[20000] h-14 bg-slate-900 text-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
            >
              العودة للموقع
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-500"
            >
              تسجيل الخروج
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-white/70">{hasUnsaved ? 'تغييرات غير محفوظة' : 'محفوظ'}</div>
            <button
              type="button"
              onClick={save}
              disabled={!hasUnsaved || updateMutation.isPending}
              className={`rounded-lg px-4 py-2 text-sm font-extrabold ${
                !hasUnsaved || updateMutation.isPending
                  ? 'bg-emerald-900/40 text-white/40 cursor-not-allowed'
                  : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
              }`}
            >
              {updateMutation.isPending ? '...جار الحفظ' : 'حفظ'}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-14">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
          <div className="min-h-[calc(100vh-56px)]">
            <LandingPage contentOverride={draft} />
          </div>

          <aside className="lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] lg:overflow-y-auto border-t lg:border-t-0 lg:border-r border-slate-200 bg-white">
            <div className="p-4">
              <div className="mb-4 grid grid-cols-2 gap-2">
                {(
                  [
                    ['hero', 'الواجهة'],
                    ['nav', 'شريط التنقل'],
                    ['features', 'بطاقات'],
                    ['about', 'حول'],
                    ['ai', 'الذكاء'],
                    ['roles', 'الأدوار'],
                    ['extra', 'بلوكات إضافية'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      tab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
                    } ${key === 'extra' ? 'col-span-2' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'hero' ? (
                <div className="space-y-3">
                  <div className="text-sm font-extrabold text-slate-900">الواجهة الرئيسية</div>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">العنوان</div>
                    <input
                      value={getValue('hero_title', '')}
                      onChange={(e) => setValue('hero_title', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">الوصف</div>
                    <textarea
                      value={getValue('hero_subtitle', '')}
                      onChange={(e) => setValue('hero_subtitle', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">صورة الواجهة (URL)</div>
                    <input
                      dir="ltr"
                      value={getValue('hero_image', '')}
                      onChange={(e) => setValue('hero_image', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">فيديو ترحيبي (Embed URL)</div>
                    <input
                      dir="ltr"
                      value={getValue('welcome_video', '')}
                      onChange={(e) => setValue('welcome_video', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-mono"
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </label>
                </div>
              ) : null}

              {tab === 'features' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900">بطاقات المميزات</div>
                    <button
                      onClick={() =>
                        setList('cards_data', [...featureCards, { title: 'بطاقة جديدة', description: '...', icon: '✨' }])
                      }
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      + إضافة
                    </button>
                  </div>
                  {featureCards.map((c, idx) => (
                    <div key={`${c.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">#{idx + 1}</div>
                        <button
                          onClick={() => setList('cards_data', featureCards.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          value={c.icon}
                          onChange={(e) =>
                            setList(
                              'cards_data',
                              featureCards.map((x, i) => (i === idx ? { ...x, icon: e.target.value } : x))
                            )
                          }
                          className="col-span-3 rounded-xl border border-slate-300 bg-white p-2 text-center text-xl"
                        />
                        <input
                          value={c.title}
                          onChange={(e) =>
                            setList(
                              'cards_data',
                              featureCards.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                            )
                          }
                          className="col-span-9 rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        />
                        <textarea
                          value={c.description}
                          onChange={(e) =>
                            setList(
                              'cards_data',
                              featureCards.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                            )
                          }
                          className="col-span-12 rounded-xl border border-slate-300 bg-white p-2 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === 'about' ? (
                <div className="space-y-3">
                  <div className="text-sm font-extrabold text-slate-900">قسم: حول</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="mb-1 text-xs font-bold text-slate-600">الأيقونة</div>
                      <input
                        value={getValue('about_right_icon', '🚀')}
                        onChange={(e) => setValue('about_right_icon', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-center text-xl"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs font-bold text-slate-600">العنوان (يمين)</div>
                      <input
                        value={getValue('about_right_title', '')}
                        onChange={(e) => setValue('about_right_title', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">نص (يمين)</div>
                    <textarea
                      value={getValue('about_right_text', '')}
                      onChange={(e) => setValue('about_right_text', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="mb-1 text-xs font-bold text-slate-600">عنوان (سطر 1)</div>
                      <input
                        value={getValue('about_title_line1', '')}
                        onChange={(e) => setValue('about_title_line1', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs font-bold text-slate-600">عنوان (سطر 2)</div>
                      <input
                        value={getValue('about_title_line2', '')}
                        onChange={(e) => setValue('about_title_line2', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">الوصف</div>
                    <textarea
                      value={getValue('about_subtitle', '')}
                      onChange={(e) => setValue('about_subtitle', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-extrabold text-slate-900">النقاط</div>
                    <button
                      onClick={() => setList('about_bullets', [...aboutBullets, { title: 'نقطة جديدة', description: '...' }])}
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      + إضافة
                    </button>
                  </div>
                  {aboutBullets.map((b, idx) => (
                    <div key={`${b.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">#{idx + 1}</div>
                        <button
                          onClick={() => setList('about_bullets', aboutBullets.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                      <input
                        value={b.title}
                        onChange={(e) =>
                          setList(
                            'about_bullets',
                            aboutBullets.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                          )
                        }
                        className="mb-2 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                      />
                      <textarea
                        value={b.description}
                        onChange={(e) =>
                          setList(
                            'about_bullets',
                            aboutBullets.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === 'ai' ? (
                <div className="space-y-3">
                  <div className="text-sm font-extrabold text-slate-900">قسم: الذكاء الاصطناعي</div>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">الشارة</div>
                    <input
                      value={getValue('ai_badge', '')}
                      onChange={(e) => setValue('ai_badge', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">العنوان</div>
                    <input
                      value={getValue('ai_title', '')}
                      onChange={(e) => setValue('ai_title', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">الوصف</div>
                    <textarea
                      value={getValue('ai_subtitle', '')}
                      onChange={(e) => setValue('ai_subtitle', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-extrabold text-slate-900">البطاقات</div>
                    <button
                      onClick={() => setList('ai_cards', [...aiCards, { title: 'بطاقة جديدة', description: '...', icon: '✨' }])}
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      + إضافة
                    </button>
                  </div>
                  {aiCards.map((c, idx) => (
                    <div key={`${c.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">#{idx + 1}</div>
                        <button
                          onClick={() => setList('ai_cards', aiCards.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          value={c.icon}
                          onChange={(e) =>
                            setList('ai_cards', aiCards.map((x, i) => (i === idx ? { ...x, icon: e.target.value } : x)))
                          }
                          className="col-span-3 rounded-xl border border-slate-300 bg-white p-2 text-center text-xl"
                        />
                        <input
                          value={c.title}
                          onChange={(e) =>
                            setList('ai_cards', aiCards.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                          }
                          className="col-span-9 rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        />
                        <textarea
                          value={c.description}
                          onChange={(e) =>
                            setList(
                              'ai_cards',
                              aiCards.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                            )
                          }
                          className="col-span-12 rounded-xl border border-slate-300 bg-white p-2 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === 'roles' ? (
                <div className="space-y-3">
                  <div className="text-sm font-extrabold text-slate-900">قسم: الأدوار</div>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">العنوان</div>
                    <input
                      value={getValue('roles_title', '')}
                      onChange={(e) => setValue('roles_title', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">الوصف</div>
                    <textarea
                      value={getValue('roles_subtitle', '')}
                      onChange={(e) => setValue('roles_subtitle', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">عنوان الملاحظة</div>
                    <input
                      value={getValue('roles_note_title', '')}
                      onChange={(e) => setValue('roles_note_title', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-bold text-slate-600">نص الملاحظة</div>
                    <textarea
                      value={getValue('roles_note_text', '')}
                      onChange={(e) => setValue('roles_note_text', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-extrabold text-slate-900">بطاقات الأدوار</div>
                    <button
                      onClick={() =>
                        setList('role_cards', [
                          ...roleCards,
                          { title: 'دور جديد', description: '...', icon: '👤', badge: 'متاح', theme: 'light' },
                        ])
                      }
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      + إضافة
                    </button>
                  </div>
                  {roleCards.map((c, idx) => (
                    <div key={`${c.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">#{idx + 1}</div>
                        <button
                          onClick={() => setList('role_cards', roleCards.filter((_, i) => i !== idx))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          value={c.icon}
                          onChange={(e) =>
                            setList(
                              'role_cards',
                              roleCards.map((x, i) => (i === idx ? { ...x, icon: e.target.value } : x))
                            )
                          }
                          className="col-span-3 rounded-xl border border-slate-300 bg-white p-2 text-center text-xl"
                        />
                        <input
                          value={c.title}
                          onChange={(e) =>
                            setList(
                              'role_cards',
                              roleCards.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                            )
                          }
                          className="col-span-9 rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        />
                        <textarea
                          value={c.description}
                          onChange={(e) =>
                            setList(
                              'role_cards',
                              roleCards.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                            )
                          }
                          className="col-span-12 rounded-xl border border-slate-300 bg-white p-2 text-sm"
                        />
                        <input
                          value={c.badge ?? ''}
                          onChange={(e) =>
                            setList(
                              'role_cards',
                              roleCards.map((x, i) => (i === idx ? { ...x, badge: e.target.value } : x))
                            )
                          }
                          placeholder="شارة (اختياري)"
                          className="col-span-8 rounded-xl border border-slate-300 bg-white p-2 text-sm"
                        />
                        <select
                          value={c.theme ?? 'light'}
                          onChange={(e) =>
                            setList(
                              'role_cards',
                              roleCards.map((x, i) => (i === idx ? { ...x, theme: e.target.value as any } : x))
                            )
                          }
                          className="col-span-4 rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        >
                          <option value="light">عادي</option>
                          <option value="gold">مميز</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === 'nav' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900">شريط التنقل</div>
                    <button
                      onClick={() =>
                        setList('nav_items', [...navItems, { id: uuid(), label: 'قسم جديد', highlighted: false, path: '', items: [] }])
                      }
                      className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      + إضافة قسم
                    </button>
                  </div>

                  {navItems.map((g, gi) => (
                    <div key={`${g.id}-${gi}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">قسم #{gi + 1}</div>
                        <button
                          onClick={() => setList('nav_items', navItems.filter((_, i) => i !== gi))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <input
                          value={g.id}
                          onChange={(e) =>
                            setList('nav_items', navItems.map((x, i) => (i === gi ? { ...x, id: e.target.value } : x)))
                          }
                          className="col-span-4 rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono"
                          dir="ltr"
                        />
                        <input
                          value={g.label}
                          onChange={(e) =>
                            setList('nav_items', navItems.map((x, i) => (i === gi ? { ...x, label: e.target.value } : x)))
                          }
                          className="col-span-8 rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        />
                        <input
                          value={g.path ?? ''}
                          onChange={(e) =>
                            setList('nav_items', navItems.map((x, i) => (i === gi ? { ...x, path: e.target.value } : x)))
                          }
                          className="col-span-8 rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono"
                          dir="ltr"
                          placeholder="/route (اختياري)"
                        />
                        <label className="col-span-4 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(g.highlighted)}
                            onChange={(e) =>
                              setList('nav_items', navItems.map((x, i) => (i === gi ? { ...x, highlighted: e.target.checked } : x)))
                            }
                          />
                          مميز
                        </label>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-700">روابط القسم</div>
                        <button
                          onClick={() =>
                            setList(
                              'nav_items',
                              navItems.map((x, i) =>
                                i === gi ? { ...x, items: [...(x.items ?? []), { label: 'رابط جديد', href: '#', hasAuth: false }] } : x
                              )
                            )
                          }
                          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          + إضافة رابط
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {(g.items ?? []).map((it, ii) => (
                          <div key={`${g.id}-${ii}`} className="rounded-xl border border-slate-200 bg-white p-2">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-xs font-bold text-slate-500">#{ii + 1}</div>
                              <button
                                onClick={() =>
                                  setList(
                                    'nav_items',
                                    navItems.map((x, i) => (i === gi ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x))
                                  )
                                }
                                className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <input
                                value={it.label}
                                onChange={(e) =>
                                  setList(
                                    'nav_items',
                                    navItems.map((x, i) =>
                                      i === gi
                                        ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, label: e.target.value } : y)) }
                                        : x
                                    )
                                  )
                                }
                                className="col-span-5 rounded-xl border border-slate-300 bg-white p-2 text-sm"
                              />
                              <input
                                dir="ltr"
                                value={it.href ?? ''}
                                onChange={(e) =>
                                  setList(
                                    'nav_items',
                                    navItems.map((x, i) =>
                                      i === gi
                                        ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, href: e.target.value } : y)) }
                                        : x
                                    )
                                  )
                                }
                                className="col-span-7 rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono"
                              />
                              <label className="col-span-12 flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(it.hasAuth)}
                                  onChange={(e) =>
                                    setList(
                                      'nav_items',
                                      navItems.map((x, i) =>
                                        i === gi
                                          ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, hasAuth: e.target.checked } : y)) }
                                          : x
                                      )
                                    )
                                  }
                                />
                                إظهار أزرار الدخول/الحساب عند هذا الرابط
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {tab === 'extra' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900">بلوكات إضافية</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setList('extra_blocks', [...extraBlocks, { id: uuid(), type: 'text', title: 'عنوان', body: '...' }])}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        + نص
                      </button>
                      <button
                        onClick={() => setList('extra_blocks', [...extraBlocks, { id: uuid(), type: 'image', title: 'صورة', url: '', caption: '' }])}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        + صورة
                      </button>
                      <button
                        onClick={() => setList('extra_blocks', [...extraBlocks, { id: uuid(), type: 'video', title: 'فيديو', url: '' }])}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        + فيديو
                      </button>
                    </div>
                  </div>

                  {extraBlocks.map((b, idx) => (
                    <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-600">
                          {b.type.toUpperCase()} #{idx + 1}
                        </div>
                        <button
                          onClick={() => setList('extra_blocks', extraBlocks.filter((x) => x.id !== b.id))}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                      <input
                        value={b.title}
                        onChange={(e) => setList('extra_blocks', extraBlocks.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x)))}
                        className="mb-2 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
                        placeholder="عنوان"
                      />

                      {b.type === 'text' ? (
                        <textarea
                          value={b.body}
                          onChange={(e) =>
                            setList('extra_blocks', extraBlocks.map((x) => (x.id === b.id ? { ...x, body: e.target.value } : x)))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                          placeholder="النص"
                        />
                      ) : null}

                      {b.type === 'image' ? (
                        <div className="space-y-2">
                          <input
                            dir="ltr"
                            value={b.url}
                            onChange={(e) =>
                              setList('extra_blocks', extraBlocks.map((x) => (x.id === b.id ? { ...x, url: e.target.value } : x)))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono"
                            placeholder="https://..."
                          />
                          <input
                            value={b.caption ?? ''}
                            onChange={(e) =>
                              setList(
                                'extra_blocks',
                                extraBlocks.map((x) => (x.id === b.id ? { ...x, caption: e.target.value } : x))
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm"
                            placeholder="تعليق"
                          />
                        </div>
                      ) : null}

                      {b.type === 'video' ? (
                        <input
                          dir="ltr"
                          value={b.url}
                          onChange={(e) =>
                            setList('extra_blocks', extraBlocks.map((x) => (x.id === b.id ? { ...x, url: e.target.value } : x)))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono"
                          placeholder="https://www.youtube.com/embed/..."
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
