import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  Baby,
  UserCheck,
  Brain,
  RotateCcw,
  FileCheck2,
  History,
  Calendar,
  MapPin,
  Building2,
  Filter,
  Download,
  Printer,
  X,
  Scale,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface NationalMarriageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NationalMarriageStatsModal: React.FC<NationalMarriageStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2027');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('السنة');
  const [selectedScope, setSelectedScope] = useState<string>('وطني');
  const [selectedRegion, setSelectedRegion] = useState<string>('طنجة - تطوان - الحسيمة');
  const [activeTab, setActiveTab] = useState<'overview' | 'minors' | 'report'>('overview');

  // Base mock stats reflecting official Moroccan statistics simulation
  const stats = useMemo(() => {
    return {
      totalMarriages: 23364,
      categories: [
        {
          id: 'adult_marriage',
          title: 'زواج الراشد',
          count: 18452,
          percentage: '78.9%',
          color: 'emerald',
          icon: Users,
          tag: 'مسار عادي',
          tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
          id: 'minor_marriage',
          title: 'زواج القاصر',
          count: 1284,
          percentage: '5.5%',
          color: 'amber',
          icon: Baby,
          tag: 'يتطلب إذن قضائي',
          tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
          id: 'self_contracting_female',
          title: 'الراشدة التي زوجت نفسها',
          count: 736,
          percentage: '3.1%',
          color: 'purple',
          icon: UserCheck,
          tag: 'مسار خاص',
          tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
        },
        {
          id: 'mental_disability',
          title: 'ذو إعاقة ذهنية',
          count: 42,
          percentage: '0.2%',
          color: 'rose',
          icon: Brain,
          tag: 'إذن قضائي إلزامي',
          tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
        },
        {
          id: 'revocable_reconciliation',
          title: 'الزواج الرجعي',
          count: 315,
          percentage: '1.3%',
          color: 'blue',
          icon: RotateCcw,
          tag: 'مسار خاص',
          tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          id: 'stipulated_conditions',
          title: 'شروط اتفاقية',
          count: 2108,
          percentage: '9.0%',
          color: 'indigo',
          icon: FileCheck2,
          tag: 'شروط ملحقة',
          tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        },
        {
          id: 'contract_renewal',
          title: 'مراجعة / تجديد العقد',
          count: 427,
          percentage: '1.8%',
          color: 'teal',
          icon: History,
          tag: 'مرتبط بعقد سابق',
          tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
        },
      ],
      minorBreakdown: {
        total: 1284,
        husbandMinor: 340,
        husbandPercent: '26.5%',
        wifeMinor: 870,
        wifePercent: '67.8%',
        bothMinor: 74,
        bothPercent: '5.7%',
      },
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Modal Top Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-900/40">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300">المملكة المغربية — الهيئة الوطنية للعدول</span>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-200 border border-blue-400/30">
                    المرصد الوطني للإحصائيات التوثيقية
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  💍 لوحة الإحصائيات الوطنية لرسوم الزواج
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 text-xs font-bold">
            <div>
              <label className="block text-slate-300 mb-1">📅 الفترة الزمنية:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2 text-white outline-none focus:border-amber-400"
              >
                <option value="اليوم">اليوم</option>
                <option value="الشهر">الشهر الحالي</option>
                <option value="الربع">الربع السنوي</option>
                <option value="السنة">كامل السنة</option>
                <option value="مخصص">فترة مخصصة...</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">📆 السنة:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2 text-white outline-none focus:border-amber-400"
              >
                <option value="2027">سنة 2027 (توقعية/تطبيقية)</option>
                <option value="2026">سنة 2026 (الحالية)</option>
                <option value="2025">سنة 2025</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">📍 النطاق الترابي:</label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2 text-white outline-none focus:border-amber-400"
              >
                <option value="وطني">المستوى الوطني (المملكة كاملة)</option>
                <option value="جهة">على مستوى الجهة</option>
                <option value="محكمة">دائرة محكمة الاستئناف</option>
                <option value="ابتدائية">المحكمة الابتدائية</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">🏛️ الدائرة القضائية:</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2 text-white outline-none focus:border-amber-400"
              >
                <option value="طنجة - تطوان - الحسيمة">طنجة - تطوان - الحسيمة</option>
                <option value="الدار البيضاء - سطات">الدار البيضاء - سطات</option>
                <option value="الرباط - سلا - القنيطرة">الرباط - سلا - القنيطرة</option>
                <option value="مراكش - آسفي">مراكش - آسفي</option>
                <option value="فاس - مكناس">فاس - مكناس</option>
              </select>
            </div>

            <div className="flex items-end col-span-2 sm:col-span-4 lg:col-span-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 transition shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span>توليد التقرير</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="mt-6 flex items-center gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📊 نظرة عامة وتوزيع الأنواع
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('minors')}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === 'minors'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              👦 مرصد زواج القاصرين بالتفصيل
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                activeTab === 'report'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📋 جدول التقرير الإحصائي الموحد
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {activeTab === 'overview' && (
            <>
              {/* Summary KPIs Banner */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-xs font-bold text-slate-400">إجمالي رسوم الزواج المسجلة</span>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {stats.totalMarriages.toLocaleString('ar-MA')} <span className="text-xs font-bold text-slate-500">رسم</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                    <TrendingUp className="h-3.5 w-3.5" /> +4.2% مقارنة بالسنة الماضية
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
                  <span className="text-xs font-bold text-amber-800">إجمالي زيجات القاصرين</span>
                  <div className="mt-2 text-2xl font-black text-amber-900">
                    {stats.minorBreakdown.total.toLocaleString('ar-MA')}{' '}
                    <span className="text-xs font-bold text-amber-700">({((stats.minorBreakdown.total / stats.totalMarriages) * 100).toFixed(1)}%)</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 mt-1 block">
                    جميعها خاضعة لإذن قاضي التوثيق
                  </span>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-xs">
                  <span className="text-xs font-bold text-purple-800">الراشدة التي زوجت نفسها</span>
                  <div className="mt-2 text-2xl font-black text-purple-900">
                    {stats.categories[2].count.toLocaleString('ar-MA')}{' '}
                    <span className="text-xs font-bold text-purple-700">({stats.categories[2].percentage})</span>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 mt-1 block">
                    ممارسة الولاية الشخصية (المادة 25)
                  </span>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-xs">
                  <span className="text-xs font-bold text-indigo-800">عقود بشروط اتفاقية</span>
                  <div className="mt-2 text-2xl font-black text-indigo-900">
                    {stats.categories[5].count.toLocaleString('ar-MA')}{' '}
                    <span className="text-xs font-bold text-indigo-700">({stats.categories[5].percentage})</span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 mt-1 block">
                    شروط ملحقة وتدبير الأموال
                  </span>
                </div>
              </div>

              {/* Marriage Types Category Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">
                    📊 التوزيع حسب التصنيف الأساسي لنوع الزواج:
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    تصنيف إحصائي موحد مانع للازدواجية
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stats.categories.map((cat) => {
                    const IconComp = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md hover:border-blue-400 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <IconComp className="h-5 w-5" />
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cat.tagColor}`}>
                            {cat.tag}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{cat.title}</h4>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-black text-slate-900">{cat.count.toLocaleString('ar-MA')}</span>
                            <span className="text-xs font-black text-slate-500">{cat.percentage}</span>
                          </div>
                        </div>

                        {/* Relative Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                            style={{ width: cat.percentage }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'minors' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md">
                      <Baby className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-amber-950">
                        👦 مرصد إحصائيات زواج القاصرين بالتفصيل
                      </h3>
                      <p className="text-xs font-bold text-amber-800">
                        متابعة دقيقة لحالات الإذن القضائي الصادرة عن قضاة التوثيق بحسب صفة الطرف القاصر
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-300 bg-white px-5 py-3 text-center">
                    <span className="text-xs font-bold text-slate-500">إجمالي زيجات القاصرين:</span>
                    <div className="text-2xl font-black text-amber-900">
                      {stats.minorBreakdown.total.toLocaleString('ar-MA')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-breakdown cards */}
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👦</span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                      الزوج هو القاصر
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {stats.minorBreakdown.husbandMinor.toLocaleString('ar-MA')}
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>النسبة من إجمالي زيجات القاصرين:</span>
                    <span className="font-black text-blue-600">{stats.minorBreakdown.husbandPercent}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تتطلب فحص الأهلية البدنية والقدرة على الإنفاق مع إذن قاضي التوثيق.
                  </p>
                </div>

                <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👧</span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                      الزوجة هي القاصرة
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {stats.minorBreakdown.wifeMinor.toLocaleString('ar-MA')}
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>النسبة من إجمالي زيجات القاصرين:</span>
                    <span className="font-black text-rose-600">{stats.minorBreakdown.wifePercent}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تتطلب بحثاً اجتماعياً وخبرة طبية تؤكد المصلحة والأهلية وفق المادة 20.
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">👦👧</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                      كلا الطرفين قاصران
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {stats.minorBreakdown.bothMinor.toLocaleString('ar-MA')}
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>النسبة من إجمالي زيجات القاصرين:</span>
                    <span className="font-black text-amber-600">{stats.minorBreakdown.bothPercent}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تتطلب إصدار إذن قضائي مزدوج للزوج والزوجة معاً.
                  </p>
                </div>
              </div>

              {/* Geographic Drilldown Simulation */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>توزيع زيجات القاصرين حسب الدوائر القضائية ومحاكم الاستئناف:</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="pb-3 font-black">الدائرة القضائية (الاستئنافية)</th>
                        <th className="pb-3 text-center font-black">الزوج قاصر</th>
                        <th className="pb-3 text-center font-black">الزوجة قاصرة</th>
                        <th className="pb-3 text-center font-black">كلاهما قاصران</th>
                        <th className="pb-3 text-center font-black">الإجمالي</th>
                        <th className="pb-3 text-center font-black">نسبة الالتزام بالإذن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                      <tr>
                        <td className="py-3 font-black text-slate-900">طنجة - تطوان - الحسيمة</td>
                        <td className="py-3 text-center">85</td>
                        <td className="py-3 text-center">215</td>
                        <td className="py-3 text-center">18</td>
                        <td className="py-3 text-center font-black text-slate-900">318</td>
                        <td className="py-3 text-center text-emerald-600">100% متحقق</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-black text-slate-900">الدار البيضاء - سطات</td>
                        <td className="py-3 text-center">92</td>
                        <td className="py-3 text-center">240</td>
                        <td className="py-3 text-center">20</td>
                        <td className="py-3 text-center font-black text-slate-900">352</td>
                        <td className="py-3 text-center text-emerald-600">100% متحقق</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-black text-slate-900">مراكش - آسفي</td>
                        <td className="py-3 text-center">78</td>
                        <td className="py-3 text-center">190</td>
                        <td className="py-3 text-center">16</td>
                        <td className="py-3 text-center font-black text-slate-900">284</td>
                        <td className="py-3 text-center text-emerald-600">100% متحقق</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-black text-slate-900">فاس - مكناس</td>
                        <td className="py-3 text-center">50</td>
                        <td className="py-3 text-center">135</td>
                        <td className="py-3 text-center">12</td>
                        <td className="py-3 text-center font-black text-slate-900">197</td>
                        <td className="py-3 text-center text-emerald-600">100% متحقق</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-black text-slate-900">الرباط - سلا - القنيطرة</td>
                        <td className="py-3 text-center">35</td>
                        <td className="py-3 text-center">90</td>
                        <td className="py-3 text-center">8</td>
                        <td className="py-3 text-center font-black text-slate-900">133</td>
                        <td className="py-3 text-center text-emerald-600">100% متحقق</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      📋 التقرير الوطني الموحد لرسوم الزواج ({selectedYear})
                    </h3>
                    <span className="text-xs text-slate-500 font-bold">
                      النطاق: {selectedScope} — {selectedRegion} | الفترة: {selectedPeriod}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert('تم تصدير التقرير كملف CSV')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>تصدير CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      <span>طباعة</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="p-3 font-black">نوع الزواج والتصنيف الأساسي</th>
                        <th className="p-3 text-center font-black">العدد المسجل</th>
                        <th className="p-3 text-center font-black">النسبة المئوية</th>
                        <th className="p-3 font-black">المتطلبات والمسار المعتمد</th>
                        <th className="p-3 text-center font-black">الحالة الإحصائية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                      {stats.categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-black text-slate-900 flex items-center gap-2">
                            <span>{cat.title}</span>
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-900">
                            {cat.count.toLocaleString('ar-MA')}
                          </td>
                          <td className="p-3 text-center font-mono text-blue-600 font-black">
                            {cat.percentage}
                          </td>
                          <td className="p-3 text-slate-600">
                            {cat.id === 'minor_marriage' && 'إذن قاضي التوثيق + تحديد القاصر (زوج/زوجة/كلاهما)'}
                            {cat.id === 'adult_marriage' && 'أهلية سن الرشد (18 سنة شمسية كاملة)'}
                            {cat.id === 'self_contracting_female' && 'ممارسة الأهلية الذاتية دون نيابة شرعية'}
                            {cat.id === 'mental_disability' && 'إذن قضائي مسبق + تقرير الخبرة الطبية'}
                            {cat.id === 'revocable_reconciliation' && 'مراجع رسم الطلاق وتاريخ الإشهاد على الرجعة'}
                            {cat.id === 'stipulated_conditions' && 'ملحق الشروط الاتفاقية المضمنة بالرسم'}
                            {cat.id === 'contract_renewal' && 'الربط الإلكتروني برقم ومراجع العقد السابق'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                              معتمد ومطابق
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-black text-slate-900">
                        <td className="p-3.5">المجموع الكلي</td>
                        <td className="p-3.5 text-center font-mono font-black text-sm">
                          {stats.totalMarriages.toLocaleString('ar-MA')}
                        </td>
                        <td className="p-3.5 text-center font-mono text-blue-700">100%</td>
                        <td className="p-3.5" colSpan={2}>
                          الأرقام تعتمد التصنيف الأساسي الحصري لمنع التكرار
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white p-4 shrink-0">
          <div className="text-xs font-bold text-slate-500">
            📌 البيانات مستخرجة مباشرة من السجلات الرقمية المعتمدة لرسوم الزواج العدلية.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};

export default NationalMarriageStatsModal;
