import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// --- Mock Data for Demonstration ---
const FINANCIAL_SUMMARY = {
  totalRevenue: 2450000, // 2.45M MAD
  totalExpenses: 1200000,
  surplus: 1250000,
  complianceRate: 78, // %
  topCollectionPeriod: 'مارس - أبريل',
  forecast: 2600000,
};

const INCOME_STREAMS = [
  { id: '1', label: 'الاشتراك السنوي', amount: 1500000, percentage: 61, icon: '📅' },
  { id: '2', label: 'رسوم الانخراط', amount: 300000, percentage: 12, icon: '👋' },
  { id: '3', label: 'رسوم الشارات والبطائق', amount: 150000, percentage: 6, icon: '🆔' },
  { id: '4', label: 'المعاملات الإدارية', amount: 200000, percentage: 8, icon: '📄' },
  { id: '5', label: 'التبرعات', amount: 100000, percentage: 4, icon: '🤝' },
  { id: '6', label: 'عائدات الأنشطة والتكوين', amount: 200000, percentage: 8, icon: '🎓' },
];

const EXPENSE_CATEGORIES = [
  { id: '1', label: 'إدارة وتسيير (Administrative)', amount: 450000, percentage: 37.5, icon: '🏢' },
  { id: '2', label: 'تكوين وتأهيل (Training)', amount: 300000, percentage: 25, icon: '🎓' },
  { id: '3', label: 'تجهيزات (CapEx)', amount: 200000, percentage: 16.6, icon: '💻' },
  { id: '4', label: 'مناسبات مهنية', amount: 100000, percentage: 8.3, icon: '🎉' },
  { id: '5', label: 'مصاريف قانونية', amount: 50000, percentage: 4.1, icon: '⚖️' },
  { id: '6', label: 'دعم اجتماعي', amount: 100000, percentage: 8.3, icon: '❤️' },
];

const FORECAST_DATA = [
  { year: '2023', amount: 2100000 },
  { year: '2024', amount: 2350000 },
  { year: '2025', amount: 2450000 },
  { year: '2026 (توقع)', amount: 2600000, isForecast: true },
];

// --- Simple Components ---

const StatCard = ({ title, value, subtext, icon, trend }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      {subtext && <p className={`text-xs mt-2 ${trend === 'up' ? 'text-green-600' : 'text-gray-400'}`}>{subtext}</p>}
    </div>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${trend === 'alert' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
      {icon}
    </div>
  </div>
);

const ProgressBar = ({ label, percentage, color = 'bg-blue-600', valueDisplay }: any) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm font-bold text-gray-900">{valueDisplay}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

const SimpleBarChart = ({ data }: { data: { label: string; value: number; heightPer: number }[] }) => (
  <div className="flex items-end justify-around h-64 w-full pt-8 pb-2">
    {data.map((d, idx) => (
      <div key={idx} className="flex flex-col items-center group w-full">
        <div className="relative w-full px-2 flex flex-col justify-end h-full">
            <div 
                className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 group-hover:bg-blue-600 relative"
                style={{ height: `${d.heightPer}%` }}
            >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded shadow transition-opacity whitespace-nowrap z-10">
                    {d.value.toLocaleString()} د.م
                </div>
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-medium text-center rotate-45 origin-left translate-y-2 translate-x-1 w-full truncate">{d.label}</p>
      </div>
    ))}
  </div>
);

// --- Main Tab Components ---

const DashboardTab = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="إجمالي الإيرادات (2026)" 
                    value={`${(FINANCIAL_SUMMARY.totalRevenue / 1000000).toFixed(2)} M د.م`} 
                    subtext="+5% مقارنة بالسنة الماضية"
                    icon="💰"
                    trend="up"
                />
                <StatCard 
                    title="إجمالي المصاريف" 
                    value={`${(FINANCIAL_SUMMARY.totalExpenses / 1000000).toFixed(2)} M د.م`} 
                    subtext="ضمن الحدود المسموحة"
                    icon="📉"
                />
                <StatCard 
                    title="الفائض المالي" 
                    value={`${(FINANCIAL_SUMMARY.surplus / 1000000).toFixed(2)} M د.م`} 
                    subtext="وضع مالي سليم"
                    icon="🏦"
                    trend="up"
                />
                <StatCard 
                    title="معدل الامتثال" 
                    value={`${FINANCIAL_SUMMARY.complianceRate}%`} 
                    subtext="152 عدل لم يؤدوا بعد"
                    icon="⚠️"
                    trend="alert"
                />
            </div>

            {/* Charts & Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Breakdown */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">توزيع مصادر الدخل</h3>
                    {INCOME_STREAMS.slice(0, 4).map(stream => (
                        <ProgressBar 
                            key={stream.id}
                            label={stream.label}
                            valueDisplay={`${(stream.amount / 1000).toFixed(0)}k د.م`}
                            percentage={stream.percentage}
                            color="bg-emerald-500"
                        />
                    ))}
                </div>

                {/* Forecast Chart (Simulated) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 border-b pb-2">توقعات النمو المالي (Forecast)</h3>
                    <p className="text-sm text-gray-400 mb-4">بناءً على بيانات السنوات الثلاث الماضية</p>
                    <div className="h-64 flex items-end justify-between px-4 gap-4">
                        {FORECAST_DATA.map((d, i) => {
                            const max = 3000000;
                            const h = (d.amount / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group">
                                     <div 
                                        className={`w-full rounded-t-lg transition-all relative ${d.isForecast ? 'bg-indigo-300 border-t-4 border-indigo-400 opacity-80' : 'bg-indigo-600'}`} 
                                        style={{ height: `${h}%` }}
                                     >
                                         <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                                             {(d.amount/1000).toFixed(0)}k
                                         </div>
                                     </div>
                                     <span className="text-xs font-bold mt-3 text-gray-600">{d.year}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                 <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🔔</span> تنبيهات مالية
                 </h3>
                 <div className="flex gap-4 overflow-x-auto pb-2">
                     <div className="bg-white p-4 rounded-lg shadow-sm w-64 flex-shrink-0">
                         <p className="text-xs font-bold text-gray-400 mb-1">متأخرات</p>
                         <p className="font-bold text-gray-800">12 عدل تجاوزوا الموعد النهائي للأداء السنوي.</p>
                     </div>
                     <div className="bg-white p-4 rounded-lg shadow-sm w-64 flex-shrink-0">
                         <p className="text-xs font-bold text-gray-400 mb-1">موسم الانخراط</p>
                         <p className="font-bold text-gray-800">انطلاق موسم تحصيل الانخراطات بعد 15 يوم.</p>
                     </div>
                     <div className="bg-white p-4 rounded-lg shadow-sm w-64 flex-shrink-0">
                         <p className="text-xs font-bold text-gray-400 mb-1">التقرير الربعي</p>
                         <p className="font-bold text-gray-800">يجب إعداد التقرير المالي للربع الأول.</p>
                     </div>
                 </div>
            </div>
        </div>
    );
};

const IncomeTab = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-4">مصادر الدخل (Inflow)</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                        <tr>
                            <th className="p-4">المصدر</th>
                            <th className="p-4">القيمة (د.م)</th>
                            <th className="p-4 w-1/4">النسبة</th>
                            <th className="p-4">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {INCOME_STREAMS.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="p-4 flex items-center gap-3 font-bold text-gray-800">
                                    <span className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">{item.icon}</span>
                                    {item.label}
                                </td>
                                <td className="p-4 font-mono font-bold text-emerald-700">+{item.amount.toLocaleString()}</td>
                                <td className="p-4">
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                    <span className="text-xs text-gray-400 mt-1 block">{item.percentage}%</span>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">نشط</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ExpensesTab = () => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">المصاريف (Outflow)</h2>
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-red-700 transition-colors">
                    + تسجيل مصروف جديد
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart Section */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
                     <h3 className="font-bold text-gray-700 mb-6 text-center">توزيع النفقات</h3>
                     <div className="flex flex-col gap-4">
                        {EXPENSE_CATEGORIES.map(cat => (
                            <div key={cat.id} className="flex items-center gap-3 text-sm">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <span className="flex-1">{cat.label}</span>
                                <span className="font-bold">{cat.percentage}%</span>
                            </div>
                        ))}
                     </div>
                     {/* Placeholder for Pie Chart */}
                     <div className="mt-8 flex justify-center">
                        <div className="w-32 h-32 rounded-full border-8 border-red-100 border-t-red-600 animate-spin-slow" style={{ animationDuration: '3s' }}></div>
                     </div>
                 </div>

                 {/* Table Details */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
                     <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">باب المصاريف (Category)</th>
                                <th className="p-4">الميزانية المرصودة</th>
                                <th className="p-4">المصروف الفعلي</th>
                                <th className="p-4">المتبقي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {EXPENSE_CATEGORIES.map(exp => {
                                const budget = exp.amount * 1.2; // Mock budget
                                const remaining = budget - exp.amount;
                                return (
                                    <tr key={exp.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-700 flex items-center gap-2">
                                            <span>{exp.icon}</span> {exp.label}
                                        </td>
                                        <td className="p-4 text-gray-500">{budget.toLocaleString()}</td>
                                        <td className="p-4 font-mono font-bold text-red-600">-{exp.amount.toLocaleString()}</td>
                                        <td className="p-4 font-bold text-green-600">{remaining.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                     </table>
                 </div>
             </div>
        </div>
    );
};

const ReportsTab = () => {
    return (
        <div className="space-y-6 animate-fade-in bg-white p-8 rounded-xl shadow-sm border border-gray-100">
             <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">التقارير المالية والدورية</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[
                     { title: 'التقرير المالي السنوي 2025', date: '31/12/2025', type: 'سنوي - Fiscal Year', status: 'جاهز' },
                     { title: 'التقرير الربعي (Q1 2026)', date: '31/03/2026', type: 'ربعي - Quarterly', status: 'مسودة' },
                     { title: 'وضعية الاشتراكات الشهرية', date: '21/01/2026', type: 'شهري - Monthly', status: 'جاهز' },
                     { title: 'تقرير ميزانية المناسبات', date: '01/01/2026', type: 'ظرفي', status: 'مؤرشف' },
                 ].map((report, idx) => (
                     <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                         <div className="flex justify-between items-start mb-3">
                            <span className="text-4xl opacity-20">📄</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${report.status === 'جاهز' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {report.status}
                            </span>
                         </div>
                         <h3 className="font-bold text-gray-800 text-lg mb-1">{report.title}</h3>
                         <p className="text-sm text-gray-500 mb-4">{report.type}</p>
                         <p className="text-xs text-gray-400 font-mono mb-4">تاريخ الإغلاق: {report.date}</p>
                         
                         <div className="flex gap-2">
                            <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold border border-gray-200">
                                👁️ معاينة
                            </button>
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-bold shadow-sm">
                                ⬇️ تحميل PDF
                            </button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

const StatsTab = () => {
    // Preparing data for the chart from existing data
    const chartData = [
        { label: 'يناير', value: 120000, heightPer: 40 },
        { label: 'فبراير', value: 180000, heightPer: 60 },
        { label: 'مارس', value: 250000, heightPer: 85 },
        { label: 'أبريل', value: 300000, heightPer: 100 },
        { label: 'مايو', value: 150000, heightPer: 50 },
        { label: 'يونيو', value: 200000, heightPer: 70 },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-xl font-bold text-gray-800 mb-8">مؤشرات الأداء المالي (2026)</h2>
                 <SimpleBarChart data={chartData} />
                 <p className="text-center text-sm text-gray-400 mt-4">تطور التحصيلات الشهرية</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-700 mb-4">مؤشرات المجلس</h3>
                     <ul className="space-y-4">
                         <li className="flex justify-between items-center border-b border-gray-50 pb-2">
                             <span className="text-gray-600">نسبة الامتثال الجهوي</span>
                             <span className="font-bold text-green-600">78%</span>
                         </li>
                         <li className="flex justify-between items-center border-b border-gray-50 pb-2">
                             <span className="text-gray-600">متوسط التحصيل السنوي</span>
                             <span className="font-bold text-gray-900">2.4M د.م</span>
                         </li>
                         <li className="flex justify-between items-center border-b border-gray-50 pb-2">
                             <span className="text-gray-600">معدل النمو المالي</span>
                             <span className="font-bold text-blue-600">+5.2%</span>
                         </li>
                         <li className="flex justify-between items-center">
                             <span className="text-gray-600">معدل العجز/الفائض</span>
                             <span className="font-bold text-emerald-600">+1.25M (فائض)</span>
                         </li>
                     </ul>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-700 mb-4">توصيات IFAC للحكامة المالية</h3>
                     <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800 mb-2">
                        💡 يوصى بزيادة الاحتياطي المالي لتغطية 6 أشهر من مصاريف التسيير.
                     </div>
                     <div className="bg-emerald-50 p-4 rounded-lg text-sm text-emerald-800">
                        ✓ الوضعية الحالية سليمة وتتماشى مع معايير التدبير المالي للجمعيات المهنية.
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Main Layout Component ---

export const RegionalFinancialManagementDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const TABS = [
        { id: 'dashboard', label: 'لوحة القيادة', icon: '📊' },
        { id: 'income', label: 'مصادر الدخل', icon: '💰' },
        { id: 'expenses', label: 'المصاريف', icon: '🧾' },
        { id: 'reports', label: 'التقارير المالية', icon: '📑' },
        { id: 'stats', label: 'الإحصائيات', icon: '📈' },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 font-kufi mb-2">التدبير المالي للجهة</h1>
                <p className="text-gray-500">نظام متكامل لتدبير الموارد المالية، المصاريف، والتقارير الدورية.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-red-950 text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'income' && <IncomeTab />}
                {activeTab === 'expenses' && <ExpensesTab />}
                {activeTab === 'reports' && <ReportsTab />}
                {activeTab === 'stats' && <StatsTab />}
            </div>
        </div>
    );
};
