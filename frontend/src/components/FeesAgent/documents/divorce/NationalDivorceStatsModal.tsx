import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Building2,
  Calendar,
  MapPin,
  Filter,
  Download,
  Printer,
  X,
  HeartCrack,
  Coins,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import type { DivorceStatisticalCode } from '../../../../types/feesAgentTypes';

interface NationalDivorceStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NationalDivorceStatsModal: React.FC<NationalDivorceStatsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2027');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('السنة');
  const [selectedScope, setSelectedScope] = useState<string>('وطني');
  const [selectedRegion, setSelectedRegion] = useState<string>('طنجة - تطوان - الحسيمة');
  const [activeTab, setActiveTab] = useState<'overview' | 'deep_dive' | 'revocation' | 'report'>('overview');

  // Realistic official statistics simulation for Morocco Ministry of Justice
  const stats = useMemo(() => {
    return {
      totalDivorces: 14820,
      totalReconciliations: 1020,
      categories: [
        {
          id: 'consensual',
          code: 'D-01' as DivorceStatisticalCode,
          title: 'الطلاق الاتفاقي',
          count: 6520,
          percentage: '44.0%',
          color: 'blue',
          icon: Users,
          tag: 'مسار اتفاقي',
          tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          id: 'discord',
          code: 'D-02' as DivorceStatisticalCode,
          title: 'الطلاق للشقاق',
          count: 3980,
          percentage: '26.9%',
          color: 'indigo',
          icon: Scale,
          tag: 'مسطرة قضائية',
          tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        },
        {
          id: 'revocable',
          code: 'D-03' as DivorceStatisticalCode,
          title: 'الطلاق الرجعي',
          count: 2140,
          percentage: '14.4%',
          color: 'purple',
          icon: RotateCcw,
          tag: 'رجعي (أولى/ثانية)',
          tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
        },
        {
          id: 'khul',
          code: 'D-04' as DivorceStatisticalCode,
          title: 'الطلاق الخلعي',
          count: 1650,
          percentage: '11.1%',
          color: 'amber',
          icon: Coins,
          tag: 'على بدل مالي',
          tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
        },
        {
          id: 'tamlik',
          code: 'D-05' as DivorceStatisticalCode,
          title: 'الطلاق المملك',
          count: 530,
          percentage: '3.6%',
          color: 'rose',
          icon: HeartCrack,
          tag: 'إشهاد بتطليق نفسها',
          tagColor: 'bg-rose-50 text-rose-800 border-rose-200',
        },
        {
          id: 'revocation_return',
          code: 'D-06' as DivorceStatisticalCode,
          title: 'رسم الرجعة أو المراجعة',
          count: 1020,
          percentage: 'سجل مستقل',
          color: 'emerald',
          icon: GitBranch,
          tag: 'إشهاد رجوع / مراجعة',
          tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        }
      ],
      tamlikBreakdown: {
        total: 530,
        firstTalaq: 442,
        firstTalaqPct: '83.4%',
        secondTalaq: 88,
        secondTalaqPct: '16.6%',
        basisInMarriageDeed: 472,
        basisInOtherDeed: 58
      },
      khulBreakdown: {
        total: 1650,
        avgCompensation: '16,500 درهم',
        financialLumpSum: 1120,
        dowryWaiver: 380,
        deferredWaiver: 150
      },
      revocableBreakdown: {
        total: 2140,
        firstTalaq: 1810,
        secondTalaq: 330,
        returnRatePct: '47.6%' // Rate of successful reconciliations
      },
      regions: [
        { name: 'الدار البيضاء - سطات', total: 4210, consensual: 1890, discord: 1140, revocable: 580, khul: 420, tamlik: 180, returns: 290 },
        { name: 'الرباط - سلا - القنيطرة', total: 3180, consensual: 1420, discord: 870, revocable: 450, khul: 330, tamlik: 110, returns: 220 },
        { name: 'فاس - مكناس', total: 2250, consensual: 960, discord: 610, revocable: 340, khul: 260, tamlik: 80, returns: 160 },
        { name: 'طنجة - تطوان - الحسيمة', total: 2010, consensual: 890, discord: 520, revocable: 310, khul: 220, tamlik: 70, returns: 150 },
        { name: 'مراكش - آسفي', total: 1820, consensual: 780, discord: 490, revocable: 270, khul: 210, tamlik: 70, returns: 120 },
        { name: 'سوس - ماسة', total: 1350, consensual: 580, discord: 350, revocable: 190, khul: 210, tamlik: 20, returns: 80 }
      ]
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn font-sans" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-1/4 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold mb-2">
                <Scale className="w-3.5 h-3.5 text-blue-300" />
                <span>وزارة العدل — المرصد الوطني للإحصائيات التوثيقية وقضاء الأسرة</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>💔 لوحة الإحصائيات الوطنية لرسوم الطلاق والرجعة بالمغرب</span>
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
                بيانات رسمية مصنفة آلياً وفق الأكواد المعيارية الوطنية (D-01 إلى D-06) وسجلات أقسام قضاء الأسرة
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => window.print()}
                type="button"
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20"
                title="طباعة التقرير"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>

              <button
                onClick={onClose}
                type="button"
                className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl transition-all"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-blue-200 font-bold mb-1">السنة القضائية</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs focus:bg-slate-900"
              >
                <option value="2027" className="text-gray-900">2027 (السنة الحالية)</option>
                <option value="2026" className="text-gray-900">2026</option>
                <option value="2025" className="text-gray-900">2025</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-blue-200 font-bold mb-1">الفترة الزمنية</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs focus:bg-slate-900"
              >
                <option value="السنة" className="text-gray-900">السنة كاملة</option>
                <option value="الربع الأول" className="text-gray-900">الربع الأول</option>
                <option value="النصف الأول" className="text-gray-900">النصف الأول</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-blue-200 font-bold mb-1">النطاق الجغرافي</label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs focus:bg-slate-900"
              >
                <option value="وطني" className="text-gray-900">المملكة المغربية (شامل)</option>
                <option value="جهوي" className="text-gray-900">حسب الدوائر الاستئنافية</option>
                <option value="محكمة" className="text-gray-900">حسب المحاكم الابتدائية</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-blue-200 font-bold mb-1">الدائرة القضائية / الجهة</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2.5 py-1.5 text-xs focus:bg-slate-900"
              >
                <option value="طنجة - تطوان - الحسيمة" className="text-gray-900">طنجة - تطوان - الحسيمة</option>
                <option value="الدار البيضاء - سطات" className="text-gray-900">الدار البيضاء - سطات</option>
                <option value="الرباط - سلا - القنيطرة" className="text-gray-900">الرباط - سلا - القنيطرة</option>
                <option value="فاس - مكناس" className="text-gray-900">فاس - مكناس</option>
                <option value="مراكش - آسفي" className="text-gray-900">مراكش - آسفي</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex items-center gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>نظرة عامة والتوزيع الوطني (D-01 إلى D-06)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deep_dive')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'deep_dive'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HeartCrack className="w-4 h-4" />
            <span>تحليل الطلاق المملك والخلعي والرجعي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revocation')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'revocation'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>سجل الرجعة والمراجعة ومؤشر الصلح</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">إجمالي رسوم الطلاق المسجلة</span>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.totalDivorces.toLocaleString('ar-MA')}</span>
                    <span className="text-[11px] text-blue-600 font-semibold block mt-1">المسارات D-01 إلى D-05</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
                    💔
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">إجمالي رسوم الرجعة والمراجعة</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.totalReconciliations.toLocaleString('ar-MA')}</span>
                    <span className="text-[11px] text-emerald-600 font-semibold block mt-1">كود D-06 (سجل مستقل)</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl">
                    🔁
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">مؤشر الإرجاع والصلح (الرجعي)</span>
                    <span className="text-2xl sm:text-3xl font-black text-purple-700">47.6%</span>
                    <span className="text-[11px] text-purple-600 font-semibold block mt-1">نسبة الحالات المرتجعة أثناء العدة</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xl">
                    📈
                  </div>
                </div>
              </div>

              {/* 6 Statistical Cards with Standard Codes */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>التوزيع الوطني لرسوم الطلاق حسب الكود المعياري الوطني (D-01 إلى D-06)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{cat.title}</h4>
                              <span className="text-[11px] font-mono text-gray-500 font-bold">كود: {cat.code}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.tagColor}`}>
                            {cat.tag}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                          <div>
                            <span className="text-xl font-extrabold text-gray-900">
                              {cat.count.toLocaleString('ar-MA')}
                            </span>
                            <span className="text-xs text-gray-500 mr-1">رسم</span>
                          </div>
                          <span className="text-sm font-black text-blue-600">
                            {cat.percentage}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Breakdown Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>توزيع رسوم الطلاق والمراجعة حسب الدوائر الاستئنافية والجهات</span>
                  </h3>
                  <span className="text-xs text-gray-500">محدث وفق سجلات محاكم قضاء الأسرة</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                        <th className="p-3 font-bold">الجهة / الدائرة</th>
                        <th className="p-3 font-bold">إجمالي الطلاق</th>
                        <th className="p-3 font-bold">الاتفاقي (D-01)</th>
                        <th className="p-3 font-bold">الشقاق (D-02)</th>
                        <th className="p-3 font-bold">الرجعي (D-03)</th>
                        <th className="p-3 font-bold">الخلعي (D-04)</th>
                        <th className="p-3 font-bold">المملك (D-05)</th>
                        <th className="p-3 font-bold text-emerald-700">الرجعة/المراجعة (D-06)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.regions.map((reg, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 font-bold text-gray-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{reg.name}</span>
                          </td>
                          <td className="p-3 font-extrabold text-blue-700">{reg.total.toLocaleString('ar-MA')}</td>
                          <td className="p-3 text-gray-700">{reg.consensual.toLocaleString('ar-MA')}</td>
                          <td className="p-3 text-gray-700">{reg.discord.toLocaleString('ar-MA')}</td>
                          <td className="p-3 text-gray-700">{reg.revocable.toLocaleString('ar-MA')}</td>
                          <td className="p-3 text-gray-700">{reg.khul.toLocaleString('ar-MA')}</td>
                          <td className="p-3 font-bold text-rose-700">{reg.tamlik}</td>
                          <td className="p-3 font-bold text-emerald-700 bg-emerald-50/50">{reg.returns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEEP DIVE (Tamlik, Khul, Revocable) */}
          {activeTab === 'deep_dive' && (
            <div className="space-y-6">
              {/* 1. الطلاق المملك (D-05) */}
              <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                      <HeartCrack className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                        إحصائيات الطلاق المملَّك (الكود: D-05)
                      </h3>
                      <span className="text-xs text-gray-500">إشهاد الزوجة على طلاق نفسها استناداً لشرط التمليك</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                    الإجمالي: {stats.tamlikBreakdown.total} رسم ({((stats.tamlikBreakdown.total / stats.totalDivorces) * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200">
                    <span className="text-xs text-rose-900 font-bold block mb-1">الطلقة الأولى</span>
                    <span className="text-2xl font-black text-rose-700">{stats.tamlikBreakdown.firstTalaq}</span>
                    <span className="text-[11px] text-rose-600 block mt-1">{stats.tamlikBreakdown.firstTalaqPct} من إجمالي المملك</span>
                  </div>

                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200">
                    <span className="text-xs text-rose-900 font-bold block mb-1">الطلقة الثانية</span>
                    <span className="text-2xl font-black text-rose-700">{stats.tamlikBreakdown.secondTalaq}</span>
                    <span className="text-[11px] text-rose-600 block mt-1">{stats.tamlikBreakdown.secondTalaqPct} من إجمالي المملك</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-700 font-bold block mb-1">سند التمليك: رسم الزواج</span>
                    <span className="text-2xl font-black text-gray-900">{stats.tamlikBreakdown.basisInMarriageDeed}</span>
                    <span className="text-[11px] text-gray-500 block mt-1">89.1% شرط مدرج بعقد الزواج الأصلي</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-700 font-bold block mb-1">سند التمليك: وثيقة تطوع/أخرى</span>
                    <span className="text-2xl font-black text-gray-900">{stats.tamlikBreakdown.basisInOtherDeed}</span>
                    <span className="text-[11px] text-gray-500 block mt-1">10.9% وثيقة لاحقة أو تطوع</span>
                  </div>
                </div>
              </div>

              {/* 2. الطلاق الخلعي (D-04) */}
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                        إحصائيات الطلاق الخلعي (الكود: D-04)
                      </h3>
                      <span className="text-xs text-gray-500">طلاق قائم على الخلع وبدل مالي أو إبراء</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                    الإجمالي: {stats.khulBreakdown.total} رسم (11.1%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200">
                    <span className="text-xs text-amber-900 font-bold block mb-1">متوسط بدل الخلع الوطني</span>
                    <span className="text-2xl font-black text-amber-800">{stats.khulBreakdown.avgCompensation}</span>
                    <span className="text-[11px] text-amber-700 block mt-1">متوسط المبالغ المالية المؤداة</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-700 font-bold block mb-1">بدل مالي نقدي مقبوض</span>
                    <span className="text-2xl font-black text-gray-900">{stats.khulBreakdown.financialLumpSum}</span>
                    <span className="text-[11px] text-gray-500 block mt-1">67.9% أداء مالي عياناً أو اعترافاً</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-700 font-bold block mb-1">إبراء من الصداق أو المؤخر</span>
                    <span className="text-2xl font-black text-gray-900">{stats.khulBreakdown.dowryWaiver + stats.khulBreakdown.deferredWaiver}</span>
                    <span className="text-[11px] text-gray-500 block mt-1">32.1% إبراء وتنازل عن حقوق مالية</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVOCATION & RECONCILIATION */}
          {activeTab === 'revocation' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                      <GitBranch className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        السجل الوطني المستقل لرسوم الرجعة والمراجعة (الكود: D-06)
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        فصل إحصائي مستقل لا يعتبر الرجعة مجرد طلاق، بل يوثق الصلح والربط بالرسم السابق
                      </p>
                    </div>
                  </div>

                  <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm border border-emerald-300">
                    1,020 إشهاد صلح ومراجعة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 block">
                      1. رجعة الزوج إلى مطلقته طلاقاً رجعياً (المادة 124)
                    </span>
                    <span className="text-3xl font-black text-emerald-700">760</span>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      إشهاد رسمي بارتجاع الزوجة أثناء فترة العدة الشرعية مع اشتراط التحقق من قيام العدة.
                    </p>
                  </div>

                  <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-200 space-y-2">
                    <span className="text-xs font-bold text-blue-900 block">
                      2. مراجعة المتفارقين بعد الطلاق الخلعي (عقد ومهر جديدان)
                    </span>
                    <span className="text-3xl font-black text-blue-700">260</span>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      إشهاد مراجعة بعقد جديد مرتبط بالرسم الخلعي السابق وموثق وفق مسطرة الربط الرقمي.
                    </p>
                  </div>
                </div>

                {/* Return Index Callout */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">مؤشر الفاعلية: نجاح 47.6% من حالات الطلاق الرجعي في استئناف الحياة الزوجية</h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      من أصل 2,140 طلاق رجعي مسجل بالمملكة، سجلت المنصة 1,020 رسم رجعة ومراجعة موثقة رسمياً. يتم تسجيل
                      كل رجعة برقم تضميني يحيل إلى رسم الطلاق الأصلي لمنع التكرار وحفظ الحقوق الأسرية.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 px-6 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام الإحصائيات الوطنية متصل ومحدث آلياً وفق الأكواد D-01 حتى D-06</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all"
            >
              إغلاق اللوحة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

