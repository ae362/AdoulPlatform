import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trpc } from '../trpc';
import { useAuth } from '../contexts/AuthContext';
import type { FeesAgentState } from './FeesAgent';

const DOC_CATEGORIES = [
  { id: 'marriage', label: 'رسوم الزواج', types: ['زواج', 'زواج_مختلط', 'رسم_استمرار_زواج'] },
  { id: 'divorce', label: 'رسوم الطلاق', types: ['الاشهاد_على_الطلاق_الاتفاقي'] },
  { id: 'property', label: 'رسوم الأملاك', types: ['ملكية', 'حيازة', 'بيع_وشراء', 'بيع_وشراء_معنوي', 'بيع_وشراء_ملكية_مشتركة', 'عقد_ايجار_المفضي_الى_تملك', 'كراء_طويل_الامد', 'عقد_تحبيس', 'عقد_بيع_حق_الهواء_والتعلية', 'عقد_تفويت_حق_السطحية', 'ثبوت_زينة_عقار', 'ثبوت_بناء', 'عقد_العمري', 'بيع_وشراء_طور_انجاز_ابتدائي', 'بيع_وشراء_طور_انجاز_نهائي', 'هبة', 'صدقة', 'رهن', 'مقاسمة', 'رسم_تسليم_بعوض', 'رسم_اقرار_واعتراف'] },
  { id: 'inheritance', label: 'رسوم التركات', types: ['اراثة', 'بيان_فريضة', 'احصاء_متروك'] },
  { id: 'other', label: 'رسوم باقي الوثائق', types: ['توكيل_رسمي', 'رسم_الاقرار_ببنوة', 'ثبوت_نسب_ببينة_السماع', 'اتفاق_تدبير_اموال_زوجية', 'رهن_حيازي', 'رسم_إبراء_من_دين', 'رسم_اقرار_بدين', 'أخرى'] },
];

type IndexMode = 'final' | 'ongoing';

function pillClass(variant: 'green' | 'orange' | 'blue' | 'slate' | 'red') {
  switch (variant) {
    case 'green':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'orange':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'blue':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'red':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function StatusPill({ label, variant }: { label: string; variant: 'green' | 'orange' | 'blue' | 'slate' | 'red' }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${pillClass(variant)}`}>{label}</span>;
}

function mapSubmissionToFeesAgentState(sub: {
  fileNumber: string | null;
  documentType: string | null;
}): FeesAgentState {
  const now = new Date();
  const iso = now.toISOString().split('T')[0];
  const base: Partial<FeesAgentState> = {
    step: 7,
    documentType: sub.documentType || '',
    sellers: [],
    buyers: [],
    witnesses: [],
    partitionDivisions: [],
    commonFacilities: { hasCommonFacilities: '', items: [] },
    properties: [],
    finance: { price: 0, priceInWords: '', paymentMethod: '', registeredWithTax: '' },
    meta: {
      fileNumber: sub.fileNumber || `SUB_${Date.now()}`,
      notaryPrimary: '',
      notarySecondary: '',
      dateGregorian: iso,
      dateHijri: '',
      additionalDocuments: [],
    },
    postRegistration: {
      registeredAtFinance: '',
      registrationDate: iso,
      depositNumber: '',
      templatePdf: null,
    },
    draft: '',
    validationAlerts: [],
    auditTrail: [],
    isDraftSaved: false,
  };

  return base as FeesAgentState;
}

export function FinalIndexing() {
  const { sessionToken } = useAuth();
  const [searchMode, setSearchMode] = useState<'registry' | 'identity'>('registry');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');

  const [registry, setRegistry] = useState({
    serial: '',
    registerNumber: '',
    page: '',
    from: '',
    to: '',
  });

  const [identity, setIdentity] = useState({
    fullName: '',
    cin: '',
    from: '',
    to: '',
  });

  const [enabled, setEnabled] = useState(false);

  const selectedCategory = DOC_CATEGORIES.find(c => c.id === docTypeFilter);
  const types = selectedCategory ? selectedCategory.types : undefined;

  const searchQuery = trpc.feesAgent.documents.searchFinalizedSubmissions.useQuery(
    {
      sessionToken: sessionToken || '',
      mode: searchMode,
      fileNumber: searchMode === 'registry' ? registry.registerNumber : undefined,
      name: searchMode === 'identity' ? identity.fullName : undefined,
      cin: searchMode === 'identity' ? identity.cin : undefined,
      types: types,
      dateFrom: searchMode === 'registry' ? registry.from : identity.from,
      dateTo: searchMode === 'registry' ? registry.to : identity.to,
    },
    { enabled: enabled && !!sessionToken, keepPreviousData: true }
  );

  const generatePdfMutation = trpc.feesAgent.documents.generateRasmPdf.useMutation();

  const handleExportPdf = async (record: any) => {
    try {
      const payload = {
        ...record.payload,
        documentType: record.documentType,
      };

      const res = await generatePdfMutation.mutateAsync({
        sessionToken: sessionToken || '',
        payload: payload,
      });

      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${res.pdf}`;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('فشل في استخراج النسخة PDF');
    }
  };

  const results = useMemo(() => {
    if (!searchQuery.data) return [];
    return searchQuery.data.map((r: any) => {
        const payload = r.payload || {};
        const parties = [
            ...(payload.sellers || []),
            ...(payload.buyers || []),
            ...(payload.applicants || []),
            ...(payload.witnesses || []),
        ];
        const names = parties.map((p: any) => p.name).filter(Boolean).join(' / ');
        const cins = parties.map((p: any) => p.idNumber).filter(Boolean).join(' / ');

        return {
            key: r.id,
            id: r.id,
            type: r.documentType,
            parties: names || '—',
            cin: cins || '—',
            date: r.notaryCompletedAt ? r.notaryCompletedAt.split('T')[0] : '—',
            registry: r.fileNumber || '—',
            raw: r,
            payload: r.payload,
            documentType: r.documentType
        };
    });
  }, [searchQuery.data]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnabled(true);
    searchQuery.refetch();
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <div className="text-xl font-extrabold text-slate-900">🔍 استخراج نسخ الشهادات/ العقود</div>
          <div className="mt-1 text-sm text-slate-600">خدمة المرتفق: البحث واستخراج النسخ.</div>
        </div>
        <StatusPill label="منجز · مرسل · قابل لاستخراج نسخة" variant="green" />
      </div>

      <div className="mt-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              searchMode === 'registry' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => setSearchMode('registry')}
          >
            بحث مرجعي
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              searchMode === 'identity' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => setSearchMode('identity')}
          >
            بحث بالهوية
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-sm font-bold text-slate-600 px-2">البحث عن:</span>
          <select
            className="rounded-xl border-0 bg-slate-50 py-2 pl-8 pr-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
          >
            <option value="all">جميع أنواع الرسوم</option>
            {DOC_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-6">
        {searchMode === 'registry' ? (
          <>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              placeholder="الرقم التسلسلي (اختياري)"
              value={registry.serial}
              onChange={(e) => setRegistry((p) => ({ ...p, serial: e.target.value }))}
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              placeholder="رقم السجل"
              value={registry.registerNumber}
              onChange={(e) => setRegistry((p) => ({ ...p, registerNumber: e.target.value }))}
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              placeholder="الصحيفة"
              value={registry.page}
              onChange={(e) => setRegistry((p) => ({ ...p, page: e.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              value={registry.from}
              onChange={(e) => setRegistry((p) => ({ ...p, from: e.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              value={registry.to}
              onChange={(e) => setRegistry((p) => ({ ...p, to: e.target.value }))}
            />
          </>
        ) : (
          <>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm md:col-span-2"
              placeholder="الاسم الكامل"
              value={identity.fullName}
              onChange={(e) => setIdentity((p) => ({ ...p, fullName: e.target.value }))}
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              placeholder="رقم البطاقة الوطنية (CIN)"
              value={identity.cin}
              onChange={(e) => setIdentity((p) => ({ ...p, cin: e.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              value={identity.from}
              onChange={(e) => setIdentity((p) => ({ ...p, from: e.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              value={identity.to}
              onChange={(e) => setIdentity((p) => ({ ...p, to: e.target.value }))}
            />
          </>
        )}

        <div className="md:col-span-1 flex justify-end">
          <button type="submit" className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
            بحث
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">الأسماء</th>
              <th className="p-3 text-right">CIN</th>
              <th className="p-3 text-right">رقم السجل</th>
              <th className="p-3 text-right">التاريخ</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="p-3 text-right">{r.type}</td>
                <td className="p-3 text-right">{r.parties}</td>
                <td className="p-3 text-right">{r.cin}</td>
                <td className="p-3 text-right">{r.registry}</td>
                <td className="p-3 text-right">{r.date}</td>
                <td className="p-3 text-right">
                  <StatusPill label="قابل للاستخراج" variant="green" />
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleExportPdf(r)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {enabled && results.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-600" colSpan={7}>
                  لا توجد نتائج مطابقة.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OngoingIndexing() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const submissionsQuery = trpc.feesAgent.documents.listMyJudgeSubmissions.useQuery(
    { sessionToken: sessionToken || '' },
    { enabled: !!sessionToken, retry: false }
  );

  const updateStageMutation = trpc.feesAgent.documents.updateSubmissionStage.useMutation();
  const [filter, setFilter] = useState<'all' | 'sending' | 'inclusion' | 'done'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let data = submissionsQuery.data ?? [];
    
    // 1. Filter by Stage
    if (filter !== 'all') {
      data = data.filter((s) => s.notaryStage === filter);
    }

    // 2. Filter by Document Type
    if (docTypeFilter !== 'all') {
      const category = DOC_CATEGORIES.find(c => c.id === docTypeFilter);
      if (category) {
        data = data.filter((s) => category.types.includes(s.documentType || ''));
      }
    }

    // 3. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      data = data.filter((s) => {
        const payload = s.payload as any;
        const fileNumber = s.fileNumber || '';
        const docType = s.documentType || '';
        
        // Parties
        const sellers = (payload?.sellers || []).map((p: any) => p.name).join(' ');
        const buyers = (payload?.buyers || []).map((p: any) => p.name).join(' ');
        const cins = [
            ...(payload?.sellers || []).map((p: any) => p.idNumber),
            ...(payload?.buyers || []).map((p: any) => p.idNumber)
        ].filter(Boolean).join(' ');

        // Notaries
        const notary1 = payload?.notaries?.primary || payload?.meta?.notaryPrimary || '';
        const notary2 = payload?.notaries?.secondary || payload?.meta?.notarySecondary || '';
        const systemNotary = (s as any).notaryName || '';

        const searchableText = `${fileNumber} ${docType} ${sellers} ${buyers} ${cins} ${notary1} ${notary2} ${systemNotary}`.toLowerCase();
        
        return searchableText.includes(q);
      });
    }

    return data;
  }, [submissionsQuery.data, filter, searchQuery]);

  const toLabel = (s: any): { label: string; variant: 'orange' | 'blue' | 'green' | 'red' } => {
    if (s.notaryStage === 'done') return { label: '🟢 منجز نهائيًا', variant: 'green' };
    if (s.status === 'substantive_notes') return { label: '🔴 يتطلب استكمال', variant: 'red' };
    if (s.status === 'accepted' || s.status === 'accepted_with_notes') return { label: '🟠 في طور التضمين', variant: 'orange' };
    return { label: '🔵 في طور الإرسال', variant: 'blue' };
  };

  const openInFeesAgent = (s: any) => {
    let draft: FeesAgentState;
    if (s.payload && typeof s.payload === 'object' && Object.keys(s.payload).length > 0) {
      draft = { ...(s.payload as any) };
    } else {
      draft = mapSubmissionToFeesAgentState({ fileNumber: s.fileNumber, documentType: s.documentType });
    }

    // Only for rasms that went through the workflow up to judge submission checkpoint
    if (s.id) {
      const fiscalNature =
        (s.payload as any)?.step7FiscalNature ||
        (s.payload as any)?.fiscalNature ||
        (draft.finance?.registeredWithTax === 'yes' ? 'subject' : 'exempt');

      draft = {
        ...draft,
        step: 7,
        step7Step: 'judicial_review',
        workflowStep: 'judicial_review',
        step7JudgeSubmissionId: s.id,
        judgeSubmissionId: s.id,
        step7FiscalNature: fiscalNature,
        fiscalNature,
      } as FeesAgentState;
    }

    navigate('/fees', { state: { loadFeesAgentDraft: draft, judgeSubmissionId: s.id } });
  };

  const markDone = async (s: any) => {
    if (!sessionToken) return;
    await updateStageMutation.mutateAsync({ sessionToken, submissionId: s.id, notaryStage: 'done' });
    await submissionsQuery.refetch();
  };

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 font-maghribi">🔄 تضمين الشهادات/العقود</div>
          <div className="mt-1 text-sm text-slate-600">إدارة عمل العدل: التتبع، الاستكمال، الإرسال.</div>
        </div>
        <StatusPill label="تتبع حسب المرحلة" variant="orange" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-2">
          {[
            { k: 'all', label: 'الكل' },
            { k: 'sending', label: 'في طور الإرسال' },
            { k: 'inclusion', label: 'في طور التضمين' },
            { k: 'done', label: 'منجز نهائيًا' },
          ].map((b) => (
            <button
              key={b.k}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-bold ${
                filter === (b.k as any) ? 'border-orange-700 bg-orange-700 text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setFilter(b.k as any)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="بحث سريع: اسم الطرف، اسم العدل، رقم البطاقة، أو رقم الملف..."
            className="block w-full text-right rounded-2xl border-2 border-orange-200 bg-orange-50/30 pr-12 pl-4 py-4 text-lg font-medium text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-sm font-bold text-slate-600 px-2">البحث عن:</span>
          <select
            className="rounded-xl border-0 bg-slate-50 py-2 pl-8 pr-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-500"
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
          >
            <option value="all">جميع أنواع الرسوم</option>
            {DOC_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {submissionsQuery.isLoading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">جاري التحميل…</div>
        ) : null}

        {submissionsQuery.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-right text-sm text-red-700">
            تعذر جلب الرسوم الجارية: {submissionsQuery.error.message}
          </div>
        ) : null}

        {!submissionsQuery.isLoading && !submissionsQuery.error && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            لا توجد رسوم في هذه الفئة.
          </div>
        ) : null}

        {filtered.map((s) => {
          const st = toLabel(s);
          const canMarkDone = (s.status === 'accepted' || s.status === 'accepted_with_notes') && s.notaryStage !== 'done';
          
          const payload = s.payload as any; // Relax type to handle partial payload
          const parties = [
            ...(payload?.sellers || []).map((p: any) => p.name),
            ...(payload?.buyers || []).map((p: any) => p.name),
          ]
            .filter(Boolean)
            .join('، ');

          // Try to get notaries from new structure (notaries object) or old structure (meta)
          const notary1 = payload?.notaries?.primary || payload?.meta?.notaryPrimary;
          const notary2 = payload?.notaries?.secondary || payload?.meta?.notarySecondary;
          // Fallback to the system user who created the submission if no notary names are in the payload
          const systemNotary = (s as any).notaryName;
          
          const notaries = [notary1, notary2].filter(Boolean).join(' و ') || systemNotary;

          // Try to get attachments from new structure (attachmentsInfo) or old structure (meta.additionalDocuments)
          const attachments = payload?.attachmentsInfo || payload?.meta?.additionalDocuments || [];
          const docCount = attachments.length;
          const docNames = attachments.map((a: any) => a.name).join('، ');

          return (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-right flex-1">
                  <div className="mb-4 flex flex-wrap items-start gap-4 border-b border-slate-100 pb-4">
                    <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-200 min-w-[140px]">
                      <div className="text-xs font-bold text-slate-500 mb-1">الرقم التسلسلي</div>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">{s.fileNumber || s.id}</div>
                    </div>
                    
                    <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-200 min-w-[200px]">
                      <div className="text-xs font-bold text-slate-500 mb-1">تاريخ الإرسال</div>
                      <div className="text-lg font-bold text-slate-800" dir="ltr">
                        {new Date(s.createdAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '')}
                      </div>
                    </div>

                    {s.decidedAt && (
                      <div className="rounded-xl bg-slate-50 px-4 py-2 border border-slate-200 min-w-[200px]">
                        <div className="text-xs font-bold text-slate-500 mb-1">تاريخ تلقي الشهادة/العقد</div>
                        <div className="text-lg font-bold text-slate-800" dir="ltr">
                          {new Date(s.decidedAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-2 text-xl font-bold text-slate-800">{s.documentType || '—'}</div>

                  <div className="mt-4 flex flex-col gap-2">
                    {parties && (
                      <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-900">
                        <span className="text-xl">👥</span>
                        <div>
                          <div className="font-bold text-blue-800">الأطراف المعنية</div>
                          <div className="mt-1 font-medium">{parties}</div>
                        </div>
                      </div>
                    )}
                    
                    {notaries && (
                      <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-3 text-purple-900">
                        <span className="text-xl">⚖️</span>
                        <div>
                          <div className="font-bold text-purple-800">العدول المكلفون</div>
                          <div className="mt-1 font-medium">{notaries}</div>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-start gap-3 rounded-lg border p-3 ${
                      docCount > 0 
                        ? 'border-amber-100 bg-amber-50 text-amber-900' 
                        : 'border-slate-100 bg-slate-50 text-slate-500'
                    }`}>
                      <span className="text-xl">📎</span>
                      <div>
                        <div className={`font-bold ${docCount > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                          المرفقات ({docCount})
                        </div>
                        <div className="mt-1 font-medium">
                          {docCount > 0 ? docNames : 'لا توجد وثائق مرفقة'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {s.judgeNotes ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                      <div className="text-xs font-bold text-slate-600">ملاحظات القاضي</div>
                      <div className="mt-1 whitespace-pre-wrap leading-relaxed">{s.judgeNotes}</div>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <StatusPill label={st.label} variant={st.variant} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openInFeesAgent(s)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  متابعة
                </button>

                <button
                  type="button"
                  onClick={() => openInFeesAgent(s)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
                    s.status === 'substantive_notes' ? 'bg-red-700 hover:bg-red-800' : 'bg-[#0b1b3a] hover:bg-[#091633]'
                  }`}
                >
                  {s.status === 'substantive_notes' ? 'استكمال' : 'فتح في FeesAgent'}
                </button>

                <button
                  type="button"
                  disabled={!canMarkDone || updateStageMutation.isLoading}
                  onClick={() => markDone(s)}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  إرسال
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IndexingModule() {
  const location = useLocation();
  const [mode, setMode] = useState<IndexMode>('final');

  useEffect(() => {
    const modeParam = new URLSearchParams(location.search).get('mode');
    if (modeParam === 'final' || modeParam === 'ongoing') {
      setMode(modeParam);
    }
  }, [location.search]);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('final')}
          className={`rounded-2xl border bg-white p-6 text-right shadow-sm transition ${
            mode === 'final' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-black text-slate-900 font-maghribi">استخراج نسخ الشهادات/ العقود</div>
              <div className="mt-1 text-sm text-slate-600">خدمة المرتفق (البحث واستخراج النسخ)</div>
            </div>
            <div className="text-lg">🔎</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['الرقم التسلسلي', 'رقم السجل', 'الصحيفة', 'التاريخ', 'الاسم الكامل', 'رقم البطاقة الوطنية'].map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {t}
              </span>
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('ongoing')}
          className={`rounded-2xl border bg-white p-6 text-right shadow-sm transition ${
            mode === 'ongoing' ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-black text-slate-900 font-maghribi">تضمين الشهادات/العقود</div>
              <div className="mt-1 text-sm text-slate-600">إدارة عمل العدل (التتبع)</div>
            </div>
            <div className="text-lg">🔄</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusPill label="🟠 في طور التضمين" variant="orange" />
            <StatusPill label="🔵 في طور الإرسال" variant="blue" />
            <StatusPill label="🟢 منجز نهائيًا" variant="green" />
          </div>
        </button>
      </div>

      {mode === 'final' ? <FinalIndexing /> : <OngoingIndexing />}
    </div>
  );
}
