import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// --- Mock Data ---

const NATIONAL_STATS = {
    totalTransfers: 15400000, // 15.4M
    collectedActual: 12100000, // 12.1M
    complianceRate: 82, // %
    forecast: 16000000, // 16M
    arrearsCount: 3, // Number of councils in arrears
};

const REGIONAL_COUNCILS_DATA = [
    { id: 1, name: 'الرباط - سلا - القنيطرة', totalDue: 2500000, paid: 2500000, pending: 0, compliance: 100, status: 'paid', lastPayment: '2026-01-15' },
    { id: 2, name: 'الدار البيضاء - سطات', totalDue: 4500000, paid: 3000000, pending: 1500000, compliance: 66, status: 'partial', lastPayment: '2026-01-10' },
    { id: 3, name: 'فاس - مكناس', totalDue: 1800000, paid: 1800000, pending: 0, compliance: 100, status: 'paid', lastPayment: '2026-01-12' },
    { id: 4, name: 'طنجة - تطوان - الحسيمة', totalDue: 2200000, paid: 2200000, pending: 0, compliance: 100, status: 'paid', lastPayment: '2026-01-18' },
    { id: 5, name: 'سوس - ماسة', totalDue: 1400000, paid: 1000000, pending: 400000, compliance: 71, status: 'partial', lastPayment: '2025-12-28' },
    { id: 6, name: 'مراكش - آسفي', totalDue: 1900000, paid: 1000000, pending: 900000, compliance: 52, status: 'partial', lastPayment: '2026-01-05' },
    { id: 7, name: 'الشرق', totalDue: 1100000, paid: 600000, pending: 500000, compliance: 54, status: 'arrears', lastPayment: '2025-11-30' },
];

const TRANSFER_SOURCES = [
    { label: 'نسبة من اشتراكات العدول', value: 8500000, percentage: 55, color: 'bg-blue-500' },
    { label: 'نسبة من رسوم الانخراط', value: 3100000, percentage: 20, color: 'bg-green-500' },
    { label: 'رسوم البطائق والشارات', value: 1540000, percentage: 10, color: 'bg-amber-500' },
    { label: 'واردات خاصة', value: 1260000, percentage: 9, color: 'bg-purple-500' },
    { label: 'أداءات استثنائية', value: 1000000, percentage: 6, color: 'bg-gray-500' },
];

const ALERTS = [
    { type: 'urgent', message: 'تأخر في تحويلات مجلس الشرق (شهرين).', date: '2026-01-20' },
    { type: 'info', message: 'تم استلام تحويل مجلس الرباط بالكامل.', date: '2026-01-15' },
    { type: 'warning', message: 'انخفاض نسبة التحصيل في الدار البيضاء مقارنة بالسنة الماضية.', date: '2026-01-10' },
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
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
);

// --- Tabs ---

const NationalDashboardTab = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="التحويلات المتوقعة (2026)" 
                    value={`${(NATIONAL_STATS.totalTransfers / 1000000).toFixed(2)} M د.م`} 
                    subtext="تقديرات الميزانية السنوية"
                    icon="📊"
                />
                <StatCard 
                    title="المتحصل فعلياً" 
                    value={`${(NATIONAL_STATS.collectedActual / 1000000).toFixed(2)} M د.م`} 
                    subtext={`${((NATIONAL_STATS.collectedActual / NATIONAL_STATS.totalTransfers) * 100).toFixed(1)}% نسبة الإنجاز`}
                    icon="💰"
                    trend="up"
                />
                <StatCard 
                    title="نسبة الامتثال الجهوي" 
                    value={`${NATIONAL_STATS.complianceRate}%`} 
                    subtext={`${NATIONAL_STATS.arrearsCount} مجالس متأخرة`}
                    icon="🤝"
                    trend={NATIONAL_STATS.complianceRate < 90 ? 'alert' : 'up'}
                />
                <StatCard 
                    title="توقعات نهاية السنة" 
                    value={`${(NATIONAL_STATS.forecast / 1000000).toFixed(2)} M د.م`} 
                    subtext="بناءً على وتيرة التحصيل الحالية"
                    icon="📈"
                    trend="up"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Regional Compliance Map/List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-6 border-b pb-2 flex justify-between items-center">
                        <span>حالة الامتثال المالي للمجالس الجهوية</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">2026</span>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                                <tr>
                                    <th className="p-3 rounded-r-lg">المجلس الجهوي</th>
                                    <th className="p-3">المستحق (د.م)</th>
                                    <th className="p-3">المؤدى (د.م)</th>
                                    <th className="p-3">المتبقي (د.م)</th>
                                    <th className="p-3">النسبة</th>
                                    <th className="p-3 rounded-l-lg">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {REGIONAL_COUNCILS_DATA.map(council => (
                                    <tr key={council.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-3 font-bold text-gray-800">{council.name}</td>
                                        <td className="p-3 text-gray-600">{council.totalDue.toLocaleString()}</td>
                                        <td className="p-3 font-bold text-emerald-600">{council.paid.toLocaleString()}</td>
                                        <td className="p-3 text-red-500">{council.pending > 0 ? council.pending.toLocaleString() : '-'}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${council.compliance >= 100 ? 'bg-green-500' : council.compliance > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${council.compliance}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold">{council.compliance}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                council.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                                council.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {council.status === 'paid' ? 'مكتمل' : council.status === 'partial' ? 'جزئي' : 'متأخر'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sources & Alerts */}
                <div className="space-y-6">
                    {/* Sources */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">مصادر التحويلات</h3>
                        {TRANSFER_SOURCES.map((source, idx) => (
                            <ProgressBar 
                                key={idx}
                                label={source.label}
                                percentage={source.percentage}
                                color={source.color}
                                valueDisplay={`${(source.value/1000).toFixed(0)}k`}
                            />
                        ))}
                    </div>

                    {/* Alerts */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                         <h3 className="font-bold text-gray-800 mb-4">إشعارات وتنبيهات</h3>
                         <div className="space-y-4">
                             {ALERTS.map((alert, idx) => (
                                 <div key={idx} className={`p-3 rounded-lg border-r-4 text-sm ${
                                     alert.type === 'urgent' ? 'bg-red-50 border-red-500' :
                                     alert.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                                     'bg-blue-50 border-blue-500'
                                 }`}>
                                     <div className="flex justify-between items-start mb-1">
                                         <span className={`font-bold ${
                                             alert.type === 'urgent' ? 'text-red-700' :
                                             alert.type === 'warning' ? 'text-amber-700' :
                                             'text-blue-700'
                                         }`}>
                                            {alert.type === 'urgent' ? 'عاجل' : alert.type === 'warning' ? 'تنبيه' : 'إشعار'}
                                         </span>
                                         <span className="text-xs text-gray-400">{alert.date}</span>
                                     </div>
                                     <p className="text-gray-600 leading-snug">{alert.message}</p>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AccountsAndRatiosTab = () => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-bold text-gray-800 mb-6">الحسابات المالية حسب النسب</h2>
                 
                 <div className="mb-8 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col md:flex-row gap-6 items-center">
                     <div className="flex-1">
                         <h3 className="font-bold text-indigo-900 mb-2">القاعدة المحاسبية الحالية</h3>
                         <p className="text-indigo-700 text-sm">يتم احتساب المستحقات الوطنية بناءً على قاعدة <strong>20%</strong> من مجموع المداخيل الجهوية الصافية للاشتراكات السنوية ورسوم الانخراط.</p>
                     </div>
                     <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                         <div>
                             <p className="text-xs text-gray-500">النسبة المطبقة</p>
                             <p className="text-2xl font-bold text-indigo-600">20.00%</p>
                         </div>
                         <button className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-indigo-700">تعديل النسبة</button>
                     </div>
                 </div>

                 <div className="overflow-x-auto">
                     <table className="w-full text-right border-collapse">
                         <thead>
                             <tr className="bg-gray-50 border-y border-gray-200">
                                 <th className="p-4 font-bold text-gray-700">المجلس الجهوي</th>
                                 <th className="p-4 font-bold text-gray-700">أساس الاحتساب (الدخل الجهوي)</th>
                                 <th className="p-4 font-bold text-gray-700">النسبة (20%)</th>
                                 <th className="p-4 font-bold text-gray-700">إضافات / خصومات</th>
                                 <th className="p-4 font-bold text-gray-700">صافي المستحق للوطني</th>
                                 <th className="p-4 font-bold text-gray-700">تسوية (Reconciliation)</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {REGIONAL_COUNCILS_DATA.map(council => {
                                 const base = (council.totalDue / 0.20);
                                 return (
                                     <tr key={council.id} className="hover:bg-gray-50">
                                         <td className="p-4 font-medium">{council.name}</td>
                                         <td className="p-4 font-mono text-gray-500">{base.toLocaleString()} د.م</td>
                                         <td className="p-4 font-mono font-bold">{council.totalDue.toLocaleString()} د.م</td>
                                         <td className="p-4 text-center text-gray-400">-</td>
                                         <td className="p-4 font-mono font-bold text-blue-700">{council.totalDue.toLocaleString()} د.م</td>
                                         <td className="p-4">
                                             <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded border border-gray-200 transition-colors">
                                                 مطابقة 🧾
                                             </button>
                                         </td>
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

const CommunicationTab = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Outgoing Messages (National -> Regional) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800">صادر: رسائل موجهة للمجالس الجهوية</h3>
                    <button className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg font-bold shadow hover:bg-blue-700">
                        + رسالة جديدة
                    </button>
                </div>
                <div className="space-y-4">
                     {[
                         { title: 'إشعار بمستحقات الربع الأول', target: 'الكل', date: '2026-01-01', status: 'sent' },
                         { title: 'تنبيه بتأخر الدفعات', target: 'مجلس الشرق', date: '2025-12-20', status: 'read' },
                         { title: 'شهادة امتثال مالي (2025)', target: 'مجلس طنجة', date: '2025-12-30', status: 'downloaded' },
                     ].map((msg, i) => (
                         <div key={i} className="flex gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                 📨
                             </div>
                             <div className="flex-1">
                                 <h4 className="font-bold text-sm text-gray-800">{msg.title}</h4>
                                 <p className="text-xs text-gray-500 mt-1">إلى: {msg.target} • {msg.date}</p>
                             </div>
                             <div className="flex items-center">
                                 <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{msg.status}</span>
                             </div>
                         </div>
                     ))}
                </div>
            </div>

            {/* Incoming Messages (Regional -> National) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6">وارد: إشعارات من المجالس الجهوية</h3>
                <div className="space-y-4">
                     {[
                         { title: 'إشعار أداء (تحويل بنكي)', from: 'مجلس الرباط', date: '2026-01-15', amount: '2.5M', status: 'verified' },
                         { title: 'طلب مهلة لاستكمال التحويل', from: 'مجلس الدار البيضاء', date: '2026-01-14', status: 'pending' },
                         { title: 'استفسار حول نسب الانخراط', from: 'مجلس مراكش', date: '2026-01-10', status: 'replied' },
                     ].map((msg, i) => (
                         <div key={i} className="flex gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer bg-amber-50/30">
                             <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                                 📥
                             </div>
                             <div className="flex-1">
                                 <div className="flex justify-between">
                                    <h4 className="font-bold text-sm text-gray-800">{msg.title}</h4>
                                    {msg.amount && <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">{msg.amount}</span>}
                                 </div>
                                 <p className="text-xs text-gray-500 mt-1">من: {msg.from} • {msg.date}</p>
                             </div>
                             <div className="flex items-center">
                                 {msg.status === 'verified' && <span className="text-green-500">✓</span>}
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

export const NationalFinancialManagement = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const TABS = [
        { id: 'dashboard', label: 'لوحة القيادة الوطنية', icon: '📊' },
        { id: 'accounts', label: 'الحسابات والنسب', icon: '🔢' },
        { id: 'stats', label: 'الإحصائيات', icon: '📈' },
        { id: 'communication', label: 'المراسلات المالية', icon: '📨' },
        { id: 'reports', label: 'التقارير', icon: '📑' },
    ];

    return (
        <div className="space-y-6">
             {/* Header */}
             <div className="bg-gradient-to-l from-white to-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 font-kufi flex items-center gap-2">
                        <span className="text-3xl">🏛️</span> 
                        الاشتراكات المالية الوطنية
                     </h1>
                     <p className="text-gray-500 mt-1 max-w-2xl">
                        نظام مركزي لتدبير التحويلات المالية من المجالس الجهوية، مراقبة الامتثال، وإصدار التقارير المالية الوطنية.
                     </p>
                 </div>
                 <div className="flex items-center gap-3">
                     <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 text-sm">
                        ⚙️ إعدادات النسب
                     </button>
                     <button className="bg-red-950 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-red-900 text-sm">
                        ⬇️ تقرير الوضعية
                     </button>
                 </div>
             </div>

             {/* Tab Navigation */}
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

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && <NationalDashboardTab />}
                {activeTab === 'accounts' && <AccountsAndRatiosTab />}
                {activeTab === 'communication' && <CommunicationTab />}
                {activeTab === 'stats' && (
                    <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
                        <span className="text-4xl block mb-4">📈</span>
                        <h3 className="font-bold text-gray-800 text-lg">تحليلات متقدمة والخرائط (قريباً)</h3>
                        <p className="text-gray-500">سيتم دمج الخريطة التفاعلية وتحليل الحساسية في التحديث القادم.</p>
                    </div>
                )}
                {activeTab === 'reports' && (
                    <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
                        <span className="text-4xl block mb-4">📑</span>
                        <h3 className="font-bold text-gray-800 text-lg">التقارير الرسمية</h3>
                        <p className="text-gray-500">نماذج PDF للتقارير السنوية والربعية.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
