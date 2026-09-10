import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

const cards = [
  {
    title: 'رسوم عدلية',
    description: 'نظرة عامة على رسوم الزواج والطلاق والأملاك والتركات وباقي الوثائق المدرجة في النظام.',
  },
  {
    title: 'الذكاء الاصطناعي و الأتمتة',
    description:
      'استخدام الذكاء الاصطناعي لتحرير العقود، الفحص القانوني، استخراج البيانات عبر OCR، والبحث الدلالي.',
  },
  {
    title: 'الوثائق و الأرشيف',
    description: 'تخزين العقود والوثائق الممسوحة في Supabase وربطها مباشرة بالرسوم والسجلات.',
  },
];

export function Dashboard() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { data: stats } = trpc.statistics.summary.useQuery();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; score: number; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setIsSearching(true);
      const res = await utils.ai.semanticSearch.fetch({ query });
      setResults(res as any);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="group banana-card flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{card.description}</p>
            <div className="mt-3 h-1 w-16 rounded-full bg-red-900 transition-all group-hover:w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="text-lg font-semibold">{t('dashboard')}</h4>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {stats?.summary.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-red-900 hover:bg-white"
            >
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="text-2xl font-bold text-slate-800">{item.count}</div>
            </div>
          )) || <p className="text-sm text-slate-500">جاري تحميل الإحصائيات...</p>}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h4 className="mb-3 text-base font-semibold">بحث دلالي في جميع السجلات</h4>
        <form onSubmit={onSearch} className="flex flex-col gap-3 md:flex-row">
          <input
            className="input flex-1"
            placeholder="اكتب نص البحث (مثلاً: زواج قاصر سنة 2020 بالدار البيضاء)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-primary md:w-40" type="submit" disabled={isSearching}>
            {t('search')}
          </button>
        </form>
        {results.length > 0 && (
          <div className="mt-4 space-y-2 text-sm">
            {results.map((r) => (
              <div
                key={r.id}
                className="rounded border border-slate-200 bg-slate-50 p-3 transition hover:border-red-900 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">ID: {r.id}</span>
                  <span className="text-xs text-slate-500">درجة التطابق: {r.score.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-slate-600">{r.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
