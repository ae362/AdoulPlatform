import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COURT_MAPPINGS } from '../../../shared/courts';
import { trpc } from '../trpc';

// --- Types ---
interface RegionalCouncil {
  id: number;
  name: string;
  region: string; // The appellate court name
  president: string;
  membersCount: number; // Real count from DB
  financialStatus: 'compliant' | 'warning' | 'critical';
  reportStatus: 'submitted' | 'pending' | 'overdue';
  location: { lat: number; lng: number };
}

// --- Coordinates and Helpers ---

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    "الرباط": { lat: 34.020882, lng: -6.841650 },
    "القنيطرة": { lat: 34.261012, lng: -6.580206 },
    "الدار البيضاء": { lat: 33.573110, lng: -7.589843 },
    "الجديدة": { lat: 33.231633, lng: -8.500712 },
    "سطات": { lat: 33.001031, lng: -7.616621 },
    "فاس": { lat: 34.018125, lng: -5.007845 },
    "تازة": { lat: 34.211756, lng: -4.013233 },
    "مكناس": { lat: 33.893522, lng: -5.547278 },
    "بني ملال": { lat: 32.339443, lng: -6.360802 },
    "خريبكة": { lat: 32.88108, lng: -6.9063 },
    "مراكش": { lat: 31.629472, lng: -7.981084 },
    "ورزازات": { lat: 30.9132, lng: -6.8937 },
    "أكادير": { lat: 30.427755, lng: -9.598107 },
    "كلميم": { lat: 28.986963, lng: -10.057375 },
    "آسفي": { lat: 32.2994, lng: -9.2372 },
    "طنجة": { lat: 35.759465, lng: -5.833954 },
    "تطوان": { lat: 35.57845, lng: -5.36837 },
    "الناظور": { lat: 35.166667, lng: -2.933333 },
    "الحسيمة": { lat: 35.244, lng: -3.93 },
    "الرشيدية": { lat: 31.9312, lng: -4.4237 },
    "وجدة": { lat: 34.6800, lng: -1.9000 },
    "العيون": { lat: 27.125286, lng: -13.1625 },
};

const MOCK_PRESIDENTS = [
    "ذ. محمد العلوي", "ذ. حسن العمراني", "ذ. عبد الله السوسي", 
    "ذ. كريم الفاسي", "ذ. عمر الطنجي", "ذ. إبراهيم الماسي", 
    "ذ. خالد بوعبيد", "ذ. مصطفى الشافعي", "ذ. يوسف المنصوري",
    "ذ. سعيد الناصري", "ذ. جمال الدين", "ذ. هشام الادريسي",
    "ذ. أحمد بناني", "ذ. فاطمة الزهراء", "ذ. يوسف التازي"
];

const OFFICE_MEMBERS = [
    { name: 'ذ. الرئيس المنتخب', role: 'الرئيس', id: 'N-1001', phone: '0661123456', email: 'pres@council.ma' },
    { name: 'ذ. النائب الأول', role: 'نائب الرئيس', id: 'N-1023', phone: '0661123457', email: 'vp@council.ma' },
    { name: 'ذ. أمين المال', role: 'أمين المال', id: 'N-1045', phone: '0661123458', email: 'tres@council.ma' },
    { name: 'ذ. الكاتب العام', role: 'الكاتب العام', id: 'N-1056', phone: '0661123459', email: 'sec@council.ma' },
];

const GENERAL_MEMBERS_SAMPLE = [
    { name: 'عدل 1', id: 'N-2001', status: 'compliant', joinDate: '2015-01-01', phone: '060000001' },
    { name: 'عدل 2', id: 'N-2002', status: 'warning', joinDate: '2018-05-12', phone: '060000002' },
    { name: 'عدل 3', id: 'N-2003', status: 'compliant', joinDate: '2020-11-20', phone: '060000003' },
    { name: 'عدل 4', id: 'N-2004', status: 'critical', joinDate: '2012-03-30', phone: '060000004' },
    { name: 'عدل 5', id: 'N-2005', status: 'compliant', joinDate: '2022-09-05', phone: '060000005' },
];

const extractCityName = (courtName: string) => {
    return courtName.replace('محكمة الاستئناف ب', '').replace('محكمة الاستئناف ', '').trim();
};

const getCoordinate = (courtName: string) => {
    const city = extractCityName(courtName);
    if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
    const key = Object.keys(CITY_COORDINATES).find(k => city.includes(k));
    return key ? CITY_COORDINATES[key] : { lat: 34.0, lng: -6.0 }; 
};


// --- Simple Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const config = {
        compliant: { bg: 'bg-green-100', text: 'text-green-700', label: 'امتثال ممتاز' },
        warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'تنبيه مالي' },
        critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'وضع حرج' },
        submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'تم الإرسال' },
        pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'قيد الإعداد' },
        overdue: { bg: 'bg-red-50', text: 'text-red-600', label: 'متأخر' },
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status };

    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
};

// --- Council Detail View ---

const RegionalCouncilDetail = ({ council, onBack }: { council: RegionalCouncil; onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState('definition');

    // Mocks for charts
    const chartHeight = (val: number) => `${Math.min(val, 100)}%`;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600">
                    ➜
                </button>
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-3xl shadow-inner">
                    🏛️
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">{council.name}</h1>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">📍 {council.region}</span>
                        <span className="flex items-center gap-1">👤 الرئيس: {council.president}</span>
                    </div>
                </div>
                <div className="text-left">
                    <StatusBadge status={council.financialStatus} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 overflow-x-auto">
                {[
                    { id: 'definition', label: 'التعريف', icon: 'ℹ️' },
                    { id: 'members', label: 'الأعضاء والهيكلة', icon: '👥' },
                    { id: 'financial', label: 'الوضع المالي', icon: '💰' },
                    { id: 'stats', label: 'الإحصائيات', icon: '📊' },
                    { id: 'docs', label: 'الوثائق والمداولات', icon: '📁' },
                    { id: 'legal', label: 'قانوني وتنظيمي', icon: '⚖️' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px] p-6">
                {activeTab === 'definition' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">بطاقة معلومات المجلس</h3>
                            <ul className="space-y-4">
                                <li className="flex justify-between">
                                    <span className="text-gray-500">اسم المجلس</span>
                                    <span className="font-bold text-gray-800">{council.name}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-500">عدد العدول</span>
                                    <span className="font-bold text-gray-800">{council.membersCount}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-500">تاريخ التأسيس</span>
                                    <span className="font-bold text-gray-800">2006</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-500">مدة الولاية الحالية</span>
                                    <span className="font-bold text-gray-800">2024 - 2027</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">معلومات الاتصال والمقر</h3>
                            <ul className="space-y-4">
                                <li className="flex justify-between">
                                    <span className="text-gray-500">العنوان الإداري</span>
                                    <span className="font-bold text-gray-800 text-left">ش. الحسن الثاني، عمارة 4، الرباط</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-500">الهاتف</span>
                                    <span className="font-bold text-gray-800" dir="ltr">+212 537 00 00 00</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-500">البريد الإلكتروني</span>
                                    <span className="font-bold text-blue-600">contact@rabat-council.ma</span>
                                </li>
                            </ul>
                             <div className="bg-blue-50 h-48 rounded-lg flex items-center justify-center border border-blue-100 text-blue-400">
                                 [خريطة: {extractCityName(council.region)}]
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="space-y-8">
                         {/* Office Members */}
                         <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="bg-slate-100 p-1 rounded">👔</span> مكتب المجلس الجهوي
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {OFFICE_MEMBERS.map((member, i) => (
                                    <div key={i} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-xs text-gray-500 mb-1">{member.role}</p>
                                        <p className="font-bold text-gray-800">{member.name}</p>
                                        <div className="mt-2 text-xs text-gray-400 space-y-1">
                                            <p>📞 {member.phone}</p>
                                            <p>✉️ {member.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>

                         {/* General Members Table */}
                         <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="bg-slate-100 p-1 rounded">👥</span> لائحة العدول المنخرطين
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 border-y border-gray-200">
                                        <tr>
                                            <th className="p-3">الاسم الكامل</th>
                                            <th className="p-3">رقم القيد</th>
                                            <th className="p-3">تاريخ الانخراط</th>
                                            <th className="p-3">رقم الهاتف</th>
                                            <th className="p-3">الوضعية المالية</th>
                                            <th className="p-3">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {GENERAL_MEMBERS_SAMPLE.map((m, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium">{m.name}</td>
                                                <td className="p-3 font-mono text-gray-500">{m.id}</td>
                                                <td className="p-3 text-gray-500">{m.joinDate}</td>
                                                <td className="p-3 text-gray-500">{m.phone}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        m.status === 'compliant' ? 'bg-green-100 text-green-700' : 
                                                        m.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {m.status === 'compliant' ? 'مؤدٍ' : m.status === 'warning' ? 'عليه متأخرات' : 'غير مؤدٍ'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-400">نشط</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                             <h3 className="font-bold text-gray-800 mb-4">الوضعية المالية للمجلس تجاه الوطني</h3>
                             <div className="bg-indigo-50 p-6 rounded-xl space-y-4">
                                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                                     <span className="text-gray-600">المستحق السنوي (2026)</span>
                                     <span className="font-bold text-indigo-700 text-lg">2,500,000 د.م</span>
                                 </div>
                                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                                     <span className="text-gray-600">ما تم أداؤه (Paid)</span>
                                     <span className="font-bold text-green-700 text-lg">1,800,000 د.م</span>
                                 </div>
                                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
                                     <span className="text-gray-600">المتأخرات (Arrears)</span>
                                     <span className="font-bold text-red-700 text-lg">700,000 د.م</span>
                                 </div>
                             </div>
                             
                             <div className="mt-6">
                                 <h4 className="font-bold text-sm text-gray-700 mb-2">وثائق ومرفقات مالية</h4>
                                 <div className="space-y-2">
                                     <div className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                         <span>📄</span>
                                         <span className="flex-1 text-sm">إشعار تحويل بنكي (يناير)</span>
                                         <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">تم التحقق</span>
                                     </div>
                                     <div className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                         <span>📊</span>
                                         <span className="flex-1 text-sm">التقرير المالي للربع الأول</span>
                                         <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">PDF</span>
                                     </div>
                                 </div>
                             </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4">الأداء الشهري (2025-2026)</h3>
                            <div className="h-64 flex items-end gap-2 border-b border-gray-200 pb-2 px-2">
                                {[40, 60, 45, 80, 70, 90, 85, 50, 60, 75, 90, 95].map((h, i) => (
                                    <div key={i} className="flex-1 bg-indigo-100 hover:bg-indigo-600 transition-colors rounded-t group relative" style={{ height: `${h}%` }}>
                                         <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                                            {h}%
                                         </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                                <span>يناير</span>
                                <span>يونيو</span>
                                <span>دجنبر</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="p-4 border rounded-xl">
                             <h4 className="font-bold text-gray-700 mb-4">هرم الأعمار</h4>
                             <div className="space-y-2">
                                 {[{l:'أقل من 30', v:10}, {l:'30-45', v:45}, {l:'45-60', v:30}, {l:'فوق 60', v:15}].map((d,i) => (
                                     <div key={i}>
                                         <div className="flex justify-between text-xs mb-1">
                                             <span>{d.l}</span>
                                             <span>{d.v}%</span>
                                         </div>
                                         <div className="h-2 bg-gray-100 rounded-full">
                                             <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${d.v}%`}}></div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <div className="p-4 border rounded-xl">
                             <h4 className="font-bold text-gray-700 mb-4">مؤشرات الأداء</h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                                     <p className="text-2xl font-bold text-gray-900">88%</p>
                                     <p className="text-xs text-gray-500">نسبة الامتثال</p>
                                 </div>
                                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                                     <p className="text-2xl font-bold text-green-600">+5%</p>
                                     <p className="text-xs text-gray-500">نمو الانخراط</p>
                                 </div>
                                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                                     <p className="text-2xl font-bold text-blue-600">12</p>
                                     <p className="text-xs text-gray-500">نشاط/ندوة</p>
                                 </div>
                                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                                     <p className="text-2xl font-bold text-orange-600">3</p>
                                     <p className="text-xs text-gray-500">شكايات</p>
                                 </div>
                             </div>
                         </div>
                     </div>
                )}
                
                {(activeTab === 'docs' || activeTab === 'legal') && (
                     <div className="text-center py-12">
                         <div className="text-5xl mb-4 text-gray-200">📁</div>
                         <h3 className="text-lg font-bold text-gray-600">الأرشيف الرقمي</h3>
                         <p className="text-gray-400">هذه الخاصية تتيح الوصول لجميع محاضر ومقررات المجلس الجهوي المؤرشفة رقمياً.</p>
                         <button className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium">
                             تصفح الأرشيف
                         </button>
                     </div>
                )}
            </div>
        </div>
    );
}

// --- Main View ---

export const NationalRegionalCouncils = () => {
    const [selectedCouncil, setSelectedCouncil] = useState<RegionalCouncil | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch real notaries to count members
    const { data: notaries } = trpc.notaries.list.useQuery({});

    // Compute Regional Councils Data based on real courts and real counts
    const councilsData = useMemo(() => {
        return COURT_MAPPINGS.map((court, index) => {
            const cityName = extractCityName(court.appellateCourt);
            
            // Count real notaries in this region
            const count = notaries 
                ? notaries.filter((n: any) => n.appellate_court === court.appellateCourt || n.region === court.appellateCourt || (n.court_name && n.court_name.includes(cityName))).length 
                : 0;

            // Deterministic mock status based on index
            const status: 'compliant' | 'warning' | 'critical' = 
                 index % 5 === 0 ? 'critical' : index % 3 === 0 ? 'warning' : 'compliant';
            
            const reportStatus: 'submitted' | 'pending' | 'overdue' = 
                 status === 'compliant' ? 'submitted' : status === 'warning' ? 'pending' : 'overdue';

            return {
                id: index + 1,
                name: `المجلس الجهوي ${cityName}`,
                region: court.appellateCourt,
                president: MOCK_PRESIDENTS[index % MOCK_PRESIDENTS.length] || "رئيس المجلس",
                membersCount: count > 0 ? count : Math.floor(Math.random() * 300) + 50, // Fallback if no real data yet
                financialStatus: status,
                reportStatus: reportStatus,
                location: getCoordinate(court.appellateCourt)
            };
        });
    }, [notaries]);

    const filteredCouncils = useMemo(() => {
        if (!searchQuery) return councilsData;
        return councilsData.filter(c => 
            c.name.includes(searchQuery) || 
            c.region.includes(searchQuery) ||
            c.president.includes(searchQuery)
        );
    }, [councilsData, searchQuery]);

    if (selectedCouncil) {
        return <RegionalCouncilDetail council={selectedCouncil} onBack={() => setSelectedCouncil(null)} />;
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
             {/* Header */}
             <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-300">Governance</span>
                            <span className="text-slate-400 text-sm">التدبير اللامركزي</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">المجالس الجهوية</h1>
                        <p className="text-slate-300 max-w-xl">
                            منصة القيادة والتنسيق بين الهيئة الوطنية و <strong>{councilsData.length}</strong> مجلس جهوي.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-center">
                            <p className="text-3xl font-bold">{councilsData.length}</p>
                            <p className="text-xs text-slate-400">مجلس جهوي</p>
                        </div>
                    </div>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
             </div>

             {/* Map Placeholder */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden">
                 <div className="flex justify-between items-start mb-4">
                     <h3 className="font-bold text-slate-800">الخريطة التفاعلية للمملكة</h3>
                     <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded">تكبير الخريطة ⛶</button>
                 </div>
                 <div className="h-[400px] bg-blue-50 rounded-xl border border-dashed border-blue-200 relative overflow-hidden">
                     {/* Simplified Map Visualization */}
                     <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                         <span className="text-9xl">🗺️</span>
                     </div>

                     {/* Plots */}
                     {councilsData.map(c => {
                         // Simple projection map for demo (bounds approx Lat 21-36, Lng -17 to -1)
                         // Lat (Y): 36(top) -> 21(bottom). 
                         // Lng (X): -17(left) -> -1(right). 
                         // Canvas 100% x 100%
                         const top = ((36 - c.location.lat) / (36 - 21)) * 100;
                         const left = ((c.location.lng - (-17)) / (-1 - (-17))) * 100;

                         return (
                            <div 
                                key={c.id}
                                className="absolute group/pin cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125 hover:z-50"
                                style={{ top: `${top}%`, left: `${left}%` }}
                                onClick={() => setSelectedCouncil(c)}
                            >
                                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${
                                    c.financialStatus === 'compliant' ? 'bg-green-500' : 
                                    c.financialStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                }`}></div>
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/pin:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                    {c.name}
                                </div>
                            </div>
                         );
                     })}
                     
                     <p className="absolute bottom-4 right-4 text-blue-400 text-xs bg-white/80 p-2 rounded">
                         النقاط تمثل التوزيع الجغرافي للمجالس الجهوية
                     </p>
                 </div>
             </div>

             {/* Cards Grid */}
             <div>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">قائمة المجالس ({filteredCouncils.length})</h2>
                        {searchQuery && <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">نتائج البحث</span>}
                    </div>
                    
                    <div className="flex w-full md:w-auto gap-3">
                         <div className="relative flex-1 md:w-64">
                             <input 
                                 type="text" 
                                 placeholder="بحث باسم المجلس، المدينة..." 
                                 className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 text-right shadow-sm"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                             />
                             <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
                         </div>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                            <button className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-slate-700">▦</button>
                            <button className="w-8 h-8 rounded hover:bg-white flex items-center justify-center text-slate-400">≣</button>
                        </div>
                    </div>
                </div>

                {filteredCouncils.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <span className="text-4xl mb-3">🔍</span>
                        <p className="text-gray-500 font-medium">لا توجد نتائج مطابقة لبحثك</p>
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-3 text-sm text-blue-600 hover:underline"
                        >
                            إزالة مرشحات البحث
                        </button>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCouncils.map(council => (
                        <div key={council.id} className="relative bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
                            {/* Decorative Color Bar based on status */}
                            <div className={`h-1.5 w-full ${
                                council.financialStatus === 'compliant' ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                                council.financialStatus === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                'bg-gradient-to-r from-red-500 to-rose-600'
                            }`}></div>

                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                     <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl text-slate-600 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-lg transition-all duration-300">
                                         🏛️
                                     </div>
                                     <StatusBadge status={council.financialStatus} />
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{council.name}</h3>
                                <p className="text-xs text-gray-500 mb-5 font-medium">{council.region}</p>

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover:border-slate-200 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border border-white shadow-sm">
                                            {council.president.split(' ')[1]?.[0] || 'م'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">الرئيس</p>
                                            <p className="text-xs font-bold text-slate-700 truncate">{council.president}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                                            <p className="text-[10px] text-gray-400">العدول</p>
                                            <p className="text-sm font-bold text-slate-700">{council.membersCount}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                                            <p className="text-[10px] text-gray-400">التقارير</p>
                                            <p className={`text-sm font-bold ${
                                                council.reportStatus === 'submitted' ? 'text-green-600' : 'text-amber-600'
                                            }`}>
                                                {council.reportStatus === 'submitted' ? '100%' : '50%'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 pt-0">
                                <button 
                                    onClick={() => setSelectedCouncil(council)}
                                    className="w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 border bg-white border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 shadow-sm group-hover:shadow"
                                >
                                    <span>الدخول للوحة القيادة</span>
                                    <span className="text-xs transform group-hover:-translate-x-1 transition-transform">←</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                )}
             </div>
        </div>
    );
};
