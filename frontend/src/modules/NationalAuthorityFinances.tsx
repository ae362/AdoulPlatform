import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NationalIncomeDashboard } from './NationalIncomeDashboard';
import { NationalExpendituresDashboard } from './NationalExpendituresDashboard';
import { RegionalStatusDashboard } from './RegionalStatusDashboard';

// --- Mock Data ---

const NATIONAL_FINANCE_STATS = {
    totalRevenue: 22000000, // 22M
    totalExpenses: 14500000, // 14.5M
    surplus: 7500000,
    complianceRate: 85,
    liquidityIndex: 2.4, // Ratio
    forecastYearEnd: 24000000,
};

const INCOME_STREAMS = [
    { id: 1, name: 'تحويلات المجالس الجهوية', amount: 15400000, percentage: 70, type: 'recurring' },
    { id: 2, name: 'رسوم تنظيمية ووثائق', amount: 2200000, percentage: 10, type: 'service' },
    { id: 3, name: 'دعم وشركاء (Partnerships)', amount: 3000000, percentage: 13.6, type: 'grant' },
    { id: 4, name: 'عائدات الأنشطة والتكوين', amount: 1400000, percentage: 6.4, type: 'activity' },
];

const EXPENSE_CATEGORIES = [
    { 
        id: 'A', 
        category: 'مصاريف تشغيلية (Operational)', 
        total: 5000000, 
        items: [
            { name: 'إدارة المركز والموظفون', value: 3500000 },
            { name: 'صيانة المنصات الرقمية', value: 1000000 },
            { name: 'دعم تقني ولوجستيك', value: 500000 },
        ]
    },
    { 
        id: 'B', 
        category: 'استثمارات استراتيجية (Strategic)', 
        total: 4000000, 
        items: [
            { name: 'تكوين وتأهيل مستمر', value: 2000000 },
            { name: 'تطوير نظم المعلومات', value: 1500000 },
            { name: 'دراسات وأبحاث', value: 500000 },
        ]
    },
    { 
        id: 'C', 
        category: 'مصاريف اجتماعية (Welfare)', 
        total: 2000000, 
        items: [
            { name: 'الصندوق المهني', value: 1500000 },
            { name: 'دعم اجتماعي مباشر', value: 500000 },
        ]
    },
    { 
        id: 'D', 
        category: 'مصاريف مؤسساتية', 
        total: 2500000, 
        items: [
            { name: 'الجمع العام واللجان', value: 1500000 },
            { name: 'استقبالات وتمثيلية', value: 1000000 },
        ]
    },
    { 
        id: 'E', 
        category: 'قانونية ومحاسبية', 
        total: 1000000, 
        items: [
            { name: 'تدقيق مالي (Audit)', value: 600000 },
            { name: 'استشارات قانونية', value: 400000 },
        ]
    },
];

const REGIONAL_RANKING = [
    { rank: 1, name: 'الرباط - سلا', compliance: 98, contribution: '3.5M', status: 'excellent' },
    { rank: 2, name: 'طنجة - تطوان', compliance: 95, contribution: '2.8M', status: 'excellent' },
    { rank: 3, name: 'فاس - مكناس', compliance: 90, contribution: '2.1M', status: 'good' },
    { rank: 11, name: 'الدار القبيضاء', compliance: 65, contribution: '4.5M', status: 'warning' },
    { rank: 12, name: 'الشرق', compliance: 55, contribution: '1.2M', status: 'critical' },
];

// --- Components ---

const KPIBlock = ({ label, value, sub, trend, icon, color = 'blue' }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            {sub && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                    {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '•'} {sub}
                </p>
            )}
        </div>
        <div className={`w-12 h-12 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center text-xl`}>
            {icon}
        </div>
    </div>
);

const ChartPlaceholder = ({ title, type }: { title: string, type: 'line' | 'bar' | 'pie' }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full min-h-[300px] flex flex-col">
        <h3 className="font-bold text-gray-700 mb-6">{title}</h3>
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 flex-col gap-2">
            <span className="text-4xl opacity-20">
                {type === 'line' ? '📈' : type === 'bar' ? '📊' : '🍩'}
            </span>
            <span className="text-xs">رسم بياني تفاعلي (Mock)</span>
        </div>
    </div>
);

// --- Tabs ---

const DashboardView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIBlock 
                label="إجمالي المداخيل (YTD)" 
                value="22.0 M د.م" 
                sub="+12% مقارنة بالسنة الماضية" 
                trend="up" 
                icon="💰" 
                color="emerald"
            />
            <KPIBlock 
                label="إجمالي المصاريف" 
                value="14.5 M د.م" 
                sub="ضمن الميزانية المحددة" 
                trend="neutral" 
                icon="📉" 
                color="red"
            />
            <KPIBlock 
                label="الفائض المالي" 
                value="+7.5 M د.م" 
                sub="سيولة ممتازة" 
                trend="up" 
                icon="🏦" 
                color="blue"
            />
             <KPIBlock 
                label="مؤشر السيولة" 
                value="2.4x" 
                sub="المعيار الدولي > 1.5" 
                trend="up" 
                icon="💧" 
                color="indigo"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <ChartPlaceholder title="مخطط الأداء الزمني (المداخيل vs المصاريف)" type="line" />
            </div>
            <div className="space-y-6">
                 <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">ترتيب المجالس (الامتثال)</h3>
                    <div className="space-y-3">
                        {REGIONAL_RANKING.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{r.rank}</span>
                                    <span className="text-sm font-medium">{r.name}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    r.status === 'excellent' ? 'bg-green-100 text-green-700' : 
                                    r.status === 'warning' ? 'bg-orange-100 text-orange-700' : 
                                    r.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {r.compliance}%
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700">عرض الترتيب الكامل ←</button>
                 </div>

                 <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                    <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">⚠️ تنبيهات مالية</h3>
                    <ul className="space-y-2 text-sm text-red-700">
                        <li>• تأخر في تحويلات مجلس الشرق (90 يوم).</li>
                        <li>• تجاوز ميزانية "الاستقبالات" بنسبة 5%.</li>
                        <li>• ضرورة إعداد تقرير الربع الثاني قبل 15 يوم.</li>
                    </ul>
                 </div>
            </div>
        </div>
    </div>
);

const ExpendituresView = () => (
    <div className="animate-fade-in">
        <NationalExpendituresDashboard embedded />
    </div>
);

const ReportsView = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Timeline */}
        <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">الجدول الزمني المالي (Financial Timeline) - 2026</h3>
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 transform -translate-y-1/2 z-0"></div>
                <div className="flex justify-between relative z-10">
                    {[
                        { label: 'Q1 إغلاق', date: '31 مارس', status: 'done', color: 'bg-green-500' },
                        { label: 'Q2 ومراجعة', date: '30 يونيو', status: 'active', color: 'bg-blue-500' },
                        { label: 'Q3', date: '30 شتنبر', status: 'pending', color: 'bg-gray-300' },
                        { label: 'إقفال السنة', date: '31 دجنبر', status: 'pending', color: 'bg-gray-300' },
                        { label: 'التدقيق', date: 'فبراير 27', status: 'pending', color: 'bg-gray-300' }
                    ].map((point, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full ${point.color} border-2 border-white shadow-sm`}></div>
                            <div className="mt-4 text-center">
                                <span className="block font-bold text-sm text-gray-800">{point.label}</span>
                                <span className="text-xs text-gray-500">{point.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
                { title: 'التقرير المالي السنوي 2025', type: 'Mandatory', size: '4.2 MB', date: '2026-02-15' },
                { title: 'تقرير التدقيق الخارجي (Audit)', type: 'Legal', size: '8.1 MB', date: '2026-02-28' },
                { title: 'الميزانية التوقعية 2026', type: 'Planning', size: '2.5 MB', date: '2025-12-20' },
                { title: 'تقرير الربع الأول 2026', type: 'Internal', size: '1.8 MB', date: '2026-04-10' },
                { title: 'مقارنة المداخيل 2024-2025', type: 'Analytics', size: '3.0 MB', date: '2026-01-30' },
            ].map((doc, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors group cursor-pointer flex gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-xl">
                        📄
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors">{doc.title}</h4>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{doc.type}</span>
                            <span className="text-[10px] text-gray-400">{doc.date}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- Main Layout ---

export const NationalAuthorityFinances = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const allowedTabs = ['dashboard', 'income', 'expenses', 'regions', 'reports'] as const;
    const urlTab = searchParams.get('tab');
    const initialTab = (allowedTabs as readonly string[]).includes(urlTab || '') ? (urlTab as any) : 'dashboard';
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    useEffect(() => {
        const next = searchParams.get('tab');
        if (!next) return;
        if (!(allowedTabs as readonly string[]).includes(next)) return;
        if (next !== activeTab) setActiveTab(next);
    }, [activeTab, searchParams]);

    const TABS = [
        { id: 'dashboard', label: 'لوحة القيادة', icon: '📊' },
        { id: 'income', label: 'المداخيل', icon: '💰' },
        { id: 'expenses', label: 'المصاريف', icon: '💸' },
        { id: 'regions', label: 'الوضع الجهوي', icon: '🌍' },
        { id: 'reports', label: 'التقارير والزمن', icon: '📑' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-100">
                            Central Financial System
                        </span>
                        <span className="text-sm text-gray-400">السنة المالية 2026</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 font-kufi">التدبير المالي للهيئة الوطنية</h1>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 text-sm flex items-center gap-2">
                        <span>📥</span> تصدير البيانات
                    </button>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 text-sm flex items-center gap-2">
                        <span>🔄</span> تسوية محاسبية (Reconcile)
                    </button>
                </div>
             </div>

             {/* Tab Nav */}
             <div className="flex bg-gray-100/50 p-1.5 rounded-xl gap-1 overflow-x-auto">
                 {TABS.map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchParams((prev) => {
                                const next = new URLSearchParams(prev);
                                next.set('tab', tab.id);
                                return next;
                            }, { replace: true });
                        }}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                     >
                         <span>{tab.icon}</span>
                         <span>{tab.label}</span>
                     </button>
                 ))}
             </div>

             {/* Content */}
             <div className="min-h-[500px]">
                 {activeTab === 'dashboard' && <DashboardView />}
                 {activeTab === 'expenses' && <ExpendituresView />}
                 {activeTab === 'reports' && <ReportsView />}
                 {activeTab === 'income' && <NationalIncomeDashboard embedded />}
                 {activeTab === 'regions' && <RegionalStatusDashboard />}
             </div>
        </div>
    );
};
